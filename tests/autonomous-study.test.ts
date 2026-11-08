import {test,before,after,afterEach,mock} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {db} from "../lib/db";
import {runDueStudy,studyReferences,studyContext,STUDY_TOPICS} from "../lib/autonomous-study";
let pg:PGlite;
before(async()=>{pg=new PGlite();const sql=await readFile("sql/008_autonomous_study.sql","utf8");await pg.exec(sql);await pg.exec(sql);});
after(()=>pg.close());afterEach(()=>mock.restoreAll());
test("migração descartável, coleta pública limitada e uma execução por dia",async()=>{
  mock.method(db,"query",async(sql:string,params?:unknown[])=>{const result=await pg.query(sql,params);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};});
  const queries:string[]=[];
  mock.method(globalThis,"fetch",async(input:string|URL|Request)=>{
    const url=String(input);queries.push(url);
    return new Response('<rss><channel><item><title>Programacao sistemas logistica planejamento inventario estoque</title><link>https://example.org/reference</link><description>desenvolvimento arquitetura testes operacional transporte contagem reposicao</description></item></channel></rss>',{status:200});
  });
  assert.equal(await runDueStudy(),true);
  assert.equal(await runDueStudy(),false);
  assert.equal(queries.length,3);
  for(const topic of STUDY_TOPICS)assert.ok(queries.some(url=>decodeURIComponent(url.replace(/\+/g," ")).includes(topic.query)));
  const rows=await studyReferences("planejamento de estoque e inventário");
  assert.ok(rows.length>0);assert.equal(studyContext(rows)[0].verified,false);
  const result=await pg.query<{sources:number;topics:number;status:string}>("SELECT sources,topics,status FROM autonomous_study_runs");
  assert.equal(result.rows[0].status,"completed");assert.equal(result.rows[0].topics,3);assert.equal(result.rows[0].sources,3);
  await assert.rejects(pg.query("INSERT INTO autonomous_study_notes(topic,title,sources) VALUES('privado','x','[]')"));
});
test("falha das fontes não produz fatos nem repetição sem limite",async()=>{
  await pg.exec("UPDATE autonomous_study_state SET next_run_at=NOW()-INTERVAL '1 day'; DELETE FROM autonomous_study_notes;");
  mock.method(db,"query",async(sql:string,params?:unknown[])=>{const result=await pg.query(sql,params);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};});
  mock.method(globalThis,"fetch",async()=>{throw new Error("offline");});
  await runDueStudy();assert.equal(await runDueStudy(),false);
  assert.equal((await studyReferences("estoque")).length,0);
});
