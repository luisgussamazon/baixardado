import assert from "node:assert/strict";
import { test, mock, afterEach } from "node:test";
import { readFile } from "node:fs/promises";
import { parseSearchRss, publicSourceUrl, researchMarkdown, searchWeb, relevantResults } from "../lib/web-search";
import { researchProject } from "../lib/research-project";

afterEach(()=>mock.restoreAll());
test("resultados claramente fora do tema não são apresentados como resposta",()=>{
  assert.deepEqual(relevantResults([{title:"Comprar carros",snippet:"Veículos usados",url:"https://example.com/"}],"Documentação TypeScript"),[]);
  assert.equal(relevantResults([{title:"TypeScript handbook",snippet:"Documentação oficial",url:"https://example.com/"}],"Documentação TypeScript").length,1);
});
test("fontes bloqueiam URLs locais, credenciais e protocolos executáveis",()=>{
  for(const url of ["javascript:alert(1)","file:///etc/passwd","https://127.0.0.1/","https://[::1]/","https://a.internal/","https://user:pass@example.com","https://localhost","https://12345/"])
    assert.equal(publicSourceUrl(url),null,url);
  assert.equal(publicSourceUrl("https://example.com/a(b)"),"https://example.com/a%28b%29");
});
test("RSS limita, deduplica e rejeita entidades externas e XML excessivo",()=>{
  const item='<item><title>Fonte &amp; teste</title><link>https://example.com/doc</link><description>&lt;b&gt;Trecho&lt;/b&gt;</description></item>';
  const results=parseSearchRss(`<rss><channel>${item}${item}<item><title>Local</title><link>http://127.0.0.1/</link></item></channel></rss>`);
  assert.equal(results.length,1);assert.equal(results[0].title,"Fonte & teste");assert.equal(results[0].snippet,"Trecho");
  assert.throws(()=>parseSearchRss('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><rss/>'));
  assert.throws(()=>parseSearchRss("x".repeat(1000001)));
});
test("fallback identifica Wikipedia; nenhuma chamada vai a um provedor de IA",async()=>{
  const calls:string[]=[];
  mock.method(globalThis,"fetch",async(url:unknown)=>{
    calls.push(String(url));
    if(String(url).includes("bing.com"))return new Response("blocked",{status:503});
    return Response.json({query:{search:[{pageid:123,title:"Assunto",snippet:"Trecho <span>seguro</span>"}]}});
  });
  const result=await searchWeb("assunto",new AbortController().signal);
  assert.equal(result.source,"Wikipedia");assert.match(researchMarkdown(result),/Busca enciclopédica/);
  assert.deepEqual(calls.map(url=>new URL(url).hostname),["www.bing.com","pt.wikipedia.org"]);
});
test("respostas e arquivos são pesquisa/template explícitos, sem alegar geração por modelo",()=>{
  const research={source:"Bing" as const,results:[{title:"[malicioso](javascript:alert)",snippet:"<img src=x>",url:"https://example.com/"}]};
  const output=researchMarkdown(research);assert.match(output,/sem síntese por modelo/);assert.match(output,/\\\[/);
  const project=researchProject("Sistema solicitado",research);
  assert.equal(project.files.length,5);assert.match(project.summary,/template|Template/);
  assert(project.files.find(f=>f.path==="README.md")!.content.includes("não um sistema completo"));
});
test("inicialização com migração ausente não abre servidor e health não exige chave de IA",async()=>{
  const {spawnSync}=await import("node:child_process");
  const env={...process.env,DATABASE_URL:"postgresql://127.0.0.1:1/local-test"};
  const result=spawnSync(process.execPath,["scripts/start.mjs"],{env,encoding:"utf8",timeout:12000,windowsHide:true});
  assert.notEqual(result.status,0);assert.doesNotMatch(result.stdout,/Ready in/);
  assert.match(result.stderr,/Falha na migração/);
  const health=await readFile("app/api/health/route.ts","utf8");assert.doesNotMatch(health,/OPENAI_API_KEY/);
});
