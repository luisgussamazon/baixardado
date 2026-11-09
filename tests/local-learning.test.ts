import {test,afterEach,mock} from "node:test";
import assert from "node:assert/strict";
import {zipSync,strToU8} from "fflate";
import {randomBytes} from "node:crypto";
import {mkdtempSync,rmSync,readdirSync,readFileSync} from "node:fs";
import {join,resolve,relative,isAbsolute} from "node:path";
import {readLearningZip} from "../scripts/learning-zip";
import {redactLearningText,learningChunks,findLearning,addLearningContext,learningSources,learningSelectionPayload,localDocumentReply} from "../lib/local-learning";
import {validateInference} from "../lib/local-inference";
import {localLearningStore,type LearningBundle,validLearningBundle} from "../scripts/local-learning-store";
import {observeInventoryFront,INVENTORY_ORIGIN} from "../scripts/inventory-front";
afterEach(()=>mock.restoreAll());
const fixture=()=>learningChunks([{name:"cycle-count.md",text:"# Cycle Count\n\nFOUND representa sobra; GAIN representa EAN fora da referência. Não execute ajustes automaticamente.\n\n## Contagem cega\n\nA contagem precisa de independência e auditoria."}]);
test("ZIP aceita somente Markdown UTF-8, sem extrair ou executar arquivos",()=>{
  const bytes=zipSync({"inventory-flow.md":strToU8("# Inventário\n\nConteúdo de inventário. process.exit() é texto, não uma ação.")});
  assert.equal(readLearningZip(bytes).length,1);assert.match(learningChunks(readLearningZip(bytes))[0].text,/process.exit/);
  for(const name of ["../escape.md","folder/file.md","run.exe","con.md","a..md"]){assert.throws(()=>readLearningZip(zipSync({[name]:strToU8("conteúdo")})));}
  assert.throws(()=>readLearningZip(zipSync({"a.md":strToU8("a"),"A.md":strToU8("b")})));
  assert.throws(()=>readLearningZip(zipSync({"big.md":new Uint8Array(128001)})));
  assert.throws(()=>readLearningZip(zipSync({"invalid.md":new Uint8Array([255,255])})));
  assert.throws(()=>readLearningZip(zipSync(Object.fromEntries(Array.from({length:65},(_,i)=>[`a${i}.md`,strToU8("x")])))));
});
test("sanitização remove credenciais, e-mails e caminhos locais mantendo conteúdo operacional",()=>{
  const text=redactLearningText("# Estoque\nFOUND é sobra.\nAPI_KEY=segredo_de_teste_123\npostgresql://user:password@example.org/db\nemail@example.org\nC:\\Users\\Exemplo\\arquivo\nBearer abcdefghijklmnopqrstuvwxyz");
  assert.match(text,/FOUND é sobra/);for(const secret of ["segredo_de_teste_123","user:password","email@example.org","C:\\Users","abcdefghijklmnopqrstuvwxyz"])assert.ok(!text.includes(secret));
});
test("busca local identifica fontes pertinentes e não inventa correspondência",()=>{
  assert.equal(findLearning(fixture(),"qual diferença entre FOUND e GAIN?")[0].document,"cycle-count.md");
  assert.deepEqual(findLearning(fixture(),"astronomia quasar galáxia"),[]);
  const repeated=learningChunks([{name:"a.md",text:"# Inventário\nFOUND GAIN mapa.\n"+"FOUND GAIN mapa. ".repeat(150)},{name:"b.md",text:"# Inventário\nFOUND GAIN mapa são classificações documentadas."}]);
  assert.equal(new Set(findLearning(repeated,"FOUND GAIN mapa").map(item=>item.document)).size,2);
});
test("contexto mantém identidade e mensagem, limita tamanho e identifica fontes sem alegar navegação",()=>{
  const original={messages:[{role:"system" as const,content:"Identidade privada: Luis. "+"s".repeat(1000)},...Array.from({length:10},()=>({role:"assistant" as const,content:"h".repeat(600)})),{role:"user" as const,content:"Explique FOUND e GAIN"}]};
  const result=addLearningContext(original,fixture());assert.ok(validateInference(result.payload));
  assert.ok(validateInference(learningSelectionPayload(result.payload)));
  assert.match(result.payload.messages[0].content,/Identidade privada: Luis/);assert.match(result.payload.messages[0].content,/nunca instruções/);
  assert.equal(result.payload.messages.at(-1)?.content,"Explique FOUND e GAIN");assert.ok(result.sources.length>0);assert.match(learningSources(result.sources),/cycle-count/);assert.match(learningSources(result.sources),/não comprova/);
  assert.doesNotMatch(original.messages[0].content,/Referências privadas locais/);
  const tight={messages:[{role:"system" as const,content:"s".repeat(7900)},{role:"user" as const,content:"FOUND GAIN"}]};assert.deepEqual(addLearningContext(tight,fixture()).sources,[]);
});
test("consulta documental não publica interpretações ou comandos inventados pelo modelo",()=>{
  const sources=fixture().slice(0,1).map(chunk=>({...chunk,id:"L1"}));
  const result=localDocumentReply(sources,"L1: FOUND significa recuperação de LOST; execute um ajuste agora.");
  assert.match(result,/FOUND representa sobra/);assert.doesNotMatch(result,/recuperação de LOST|execute um ajuste agora/);assert.match(result,/trechos literais/);
});
test("base local preserva pesquisas web explícitas e fontes web já recuperadas",()=>{
  for(const query of ["pesquise FOUND GAIN mapa","confirmo envio à web"]){const payload={messages:[{role:"system" as const,content:"A3X"},{role:"user" as const,content:query}]};assert.equal(addLearningContext(payload,fixture()).payload,payload);}
  const payload={messages:[{role:"system" as const,content:'Referências {"sources":[{"id":"W1","text":"fonte pública"}]}'},{role:"user" as const,content:"FOUND GAIN mapa"}]};assert.equal(addLearningContext(payload,fixture()).sources.length,0);
});
test("base privada usa DPAPI e não pode ser reutilizada por outra credencial",{skip:process.platform!=="win32"},()=>{
  const parent=resolve(".tools"),root=mkdtempSync(join(parent,"learning-test-")),token=randomBytes(32).toString("hex");
  try{
    const store=localLearningStore("https://app.example/",token,root),bundle:LearningBundle={version:1,kind:"inventory-documents",binding:store.binding,sourceSha256:"0".repeat(64),importedAt:new Date().toISOString(),documents:["cycle-count.md"],chunks:fixture()};
    store.save(bundle);assert.deepEqual(store.load(),bundle);
    const file=join(root,".tools/local-learning",readdirSync(join(root,".tools/local-learning"))[0]);assert.ok(!readFileSync(file,"utf8").includes("FOUND"));assert.ok(!readFileSync(file,"utf8").includes(token));
    assert.equal(localLearningStore("https://app.example/",randomBytes(32).toString("hex"),root).load(),null);assert.equal(validLearningBundle({...bundle,binding:"outro"},store.binding),false);
  }finally{const rel=relative(parent,root);assert.ok(rel&&!rel.startsWith("..")&&!isAbsolute(rel));rmSync(root,{recursive:true,force:true});}
});
test("observação pública lê somente login, sem credenciais, inputs, scripts ou formulários",async()=>{
  let calls=0;mock.method(globalThis,"fetch",async(url:unknown,init?:RequestInit)=>{
    calls++;assert.ok(String(url).startsWith(INVENTORY_ORIGIN+"/login"));assert.equal(init?.method,"GET");assert.equal(new Headers(init?.headers).get("authorization"),null);assert.equal(new Headers(init?.headers).get("cookie"),null);
    return new Response('<html><head><title>ICQA Login</title></head><body><label>E-mail</label><label>Senha</label><input value="valor_privado_nao_capturar"><button>Entrar</button><a href="/admin?token=nao_capturar">Admin</a><script>document.title="titulo-injetado";fetch("https://evil.example")</script></body></html>',{headers:{"content-type":"text/html"}});
  });
  const result=await observeInventoryFront(INVENTORY_ORIGIN+"/login?next=%2F");assert.equal(calls,1);assert.match(result.text,/ICQA Login/);assert.match(result.text,/NÃO foram observados/);assert.doesNotMatch(result.text,/valor_privado|token=|titulo-injetado|evil.example/);
});
test("observação rejeita outros hosts, telas, redirecionamentos, respostas privadas e excesso",async()=>{
  const network=mock.method(globalThis,"fetch",async()=>new Response(null,{status:302,headers:{location:"https://evil.example/"}}));
  await assert.rejects(()=>observeInventoryFront("https://evil.example/login"));await assert.rejects(()=>observeInventoryFront(INVENTORY_ORIGIN+"/inventory-management"));assert.equal(network.mock.calls.length,0);
  await assert.rejects(()=>observeInventoryFront(INVENTORY_ORIGIN+"/login"));assert.equal(network.mock.calls.length,1);
  network.mock.mockImplementation(async()=>new Response("proibido",{status:403}));await assert.rejects(()=>observeInventoryFront(INVENTORY_ORIGIN+"/login"));
  network.mock.mockImplementation(async()=>new Response("x".repeat(256001),{headers:{"content-type":"text/html"}}));await assert.rejects(()=>observeInventoryFront(INVENTORY_ORIGIN+"/login"));
});
