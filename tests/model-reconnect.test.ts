import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,readdirSync,rmSync} from "node:fs";
import {join,resolve,relative,isAbsolute} from "node:path";
import {randomBytes} from "node:crypto";
import {credentialStore,validSavedConnection,type SavedConnection} from "../scripts/credential-store";
import {connectComputer,ConnectionUnauthorized} from "../scripts/model-link";
const server=new URL("https://app.example/");
const fake=():SavedConnection=>({version:1,server:server.href,token:randomBytes(32).toString("hex"),code:"123456ABCDEF"});
test("DPAPI Windows guarda somente ciphertext e recupera a credencial no mesmo usuário",{skip:process.platform!=="win32"},()=>{
  const parent=resolve(".tools"),root=mkdtempSync(join(parent,"credential-test-"));
  try{
    const store=credentialStore(server.href,root),value=fake();assert.equal(store.load(),null);store.save(value);
    assert.deepEqual(store.load(),value);
    const files=readdirSync(join(root,".tools"));assert.equal(files.length,1);
    const raw=readFileSync(join(root,".tools",files[0]),"utf8");assert.ok(!raw.includes(value.token));assert.ok(!raw.includes(server.href));
    assert.equal(credentialStore("https://other.example/",root).load(),null);
    store.clear();assert.equal(store.load(),null);
  }finally{const rel=relative(parent,root);assert.ok(rel&&!rel.startsWith("..")&&!isAbsolute(rel));rmSync(root,{recursive:true,force:true});}
});
test("credencial não pode ser encaminhada a outro servidor ou conter campos extras",()=>{
  const value=fake();assert.ok(validSavedConnection(value,server.href));assert.equal(validSavedConnection(value,"https://evil.example/"),false);assert.equal(validSavedConnection({...value,extra:true},server.href),false);
});
test("reinício reconecta com credencial lembrada sem gerar código nem imprimir segredo",async()=>{
  const value=fake(),messages:string[]=[],calls:string[]=[];
  const store={load:()=>value,save(){assert.fail("não precisa salvar novamente");},clear(){assert.fail("credencial ainda válida");}};
  const result=await connectComputer(server,async(path,_body,token)=>{calls.push(path);assert.equal(token,value.token);return {ok:true,remembered:true};},store,new AbortController().signal,async()=>{},message=>messages.push(message));
  assert.deepEqual(result,value);assert.deepEqual(calls,["/api/local-model/session"]);assert.ok(!messages.join().includes(value.token));assert.ok(!messages.join().includes(value.code));
});
test("falha transitória preserva credencial e tenta reconectar sem novo pareamento",async()=>{
  const value=fake();let tries=0,waits=0;
  const result=await connectComputer(server,async(path)=>{assert.equal(path,"/api/local-model/session");if(++tries===1)throw new Error("offline");return {ok:true,remembered:true};},{load:()=>value,save(){assert.fail();},clear(){assert.fail();}},new AbortController().signal,async()=>{waits++;},()=>{});
  assert.deepEqual(result,value);assert.equal(waits,1);
});
test("código inicial expirado é substituído e exige nova autorização da conta",async()=>{
  const old=fake(),fresh=fake();let cleared=0,saved:SavedConnection|null=null,granted=false;
  const result=await connectComputer(server,async(path,body,token)=>{
    if(token===old.token)throw new ConnectionUnauthorized();
    if(path.endsWith("/pair")&&body)return fresh;
    if(path.endsWith("/pair")){granted=true;return {status:"approved"};}
    assert.ok(granted);return {ok:true,remembered:true};
  },{load:()=>old,save(value){saved=value;},clear(){cleared++;}},new AbortController().signal,async()=>{},()=>{});
  assert.deepEqual(result,fresh);assert.deepEqual(saved,fresh);assert.equal(cleared,1);
});
test("revogação não concede nova autorização silenciosamente",async()=>{
  const old=fake(),fresh=fake(),controller=new AbortController();let cleared=0;
  const result=await connectComputer(server,async(path,body,token)=>{if(token===old.token)throw new ConnectionUnauthorized();if(path.endsWith("/pair")&&body)return fresh;return {status:"pending"};},{load:()=>old,save(){},clear(){cleared++;}},controller.signal,async()=>controller.abort(),()=>{});
  assert.equal(result,null);assert.equal(cleared,1);
});
test("não lembrar elimina a cópia persistida após autorização",async()=>{
  const value=fake();let cleared=0;
  assert.deepEqual(await connectComputer(server,async()=>({ok:true,remembered:false}),{load:()=>value,save(){},clear(){cleared++;}},new AbortController().signal,async()=>{},()=>{}),value);assert.equal(cleared,1);
});
