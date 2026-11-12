import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test,mock} from "node:test";
import {PGlite} from "@electric-sql/pglite";
import type {PoolClient} from "pg";
import {db} from "../lib/db";
import {claimAstroTask,advanceAstroTask} from "../lib/astro-tasks";

test("fila serializa o workspace, respeita consentimento e libera a fila após lease expirado",async()=>{
  const pg=new PGlite();
  const query=async(sql:string,params?:unknown[])=>{
    const result=await pg.query(sql,params);
    return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};
  };
  const client={query,release(){}} as unknown as PoolClient;
  try{
    await pg.exec((await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;",""));
    for(const name of ["010_openai_luna.sql","013_autonomy_cycles.sql"])await pg.exec(await readFile("sql/"+name,"utf8"));
    const migration=await readFile("sql/014_astro_tasks.sql","utf8")+await readFile("sql/015_astro_cycle_link.sql","utf8");
    await pg.exec(migration);await pg.exec(migration);
    const user=(await pg.query<{id:string}>("INSERT INTO users(email,password_hash) VALUES('astro@example.test','fixture') RETURNING id")).rows[0].id;
    await pg.query("INSERT INTO astro_tasks(user_id,repository,goal,created_at) VALUES($1,'luisgussamazon/baixardado','Primeiro objetivo',NOW()-INTERVAL '1 minute'),($1,'luisgussamazon/baixardado','Segundo objetivo',NOW())",[user]);
    mock.method(db,"query",query);
    assert.equal(await claimAstroTask(client),null,"sem consentimento da Luna a tarefa não é assumida");
    await pg.query("INSERT INTO ai_preferences(user_id,provider,cloud_consent_version,cloud_consented_at) VALUES($1,'openai',1,NOW())",[user]);
    const first=await claimAstroTask(client);
    assert.ok(first);assert.equal(first.goal,"Primeiro objetivo");
    assert.equal(await claimAstroTask(client),null,"apenas uma tarefa por vez no repositório");
    assert.equal(await advanceAstroTask(first,"PLANNING","Planejando."),true);
    await pg.query("UPDATE astro_tasks SET lease_until=NOW()-INTERVAL '1 second' WHERE id=$1",[first.id]);
    assert.equal(await advanceAstroTask(first,"CODING","Codificando."),false,"lease expirado não avança");
    const second=await claimAstroTask(client);
    assert.ok(second);assert.equal(second.goal,"Segundo objetivo");
    const state=(await pg.query<{status:string;lease_token:string|null}>("SELECT status,lease_token FROM astro_tasks WHERE id=$1",[first.id])).rows[0];
    assert.equal(state.status,"FAILED");assert.equal(state.lease_token,null);
    await pg.query("UPDATE astro_tasks SET cancel_requested=TRUE WHERE id=$1",[second.id]);
    assert.equal(await advanceAstroTask(second,"PLANNING","Planejando."),false);
    const cancelled=(await pg.query<{status:string;lease_token:string|null}>("SELECT status,lease_token FROM astro_tasks WHERE id=$1",[second.id])).rows[0];
    assert.equal(cancelled.status,"CANCELLED");assert.equal(cancelled.lease_token,null);
  }finally{mock.restoreAll();await pg.close();}
});
