import assert from "node:assert/strict";
import { test } from "node:test";
import { isJson, isUuid, parseJson } from "../lib/http";
import { hashPassword, verifyPassword, safeSecretMatch, validOrigin } from "../lib/security";

test("senhas usam salt e rejeitam senha/hash inválidos", async () => {
  const a = await hashPassword("senha-local-de-teste");
  const b = await hashPassword("senha-local-de-teste");
  assert.notEqual(a,b);
  assert.equal(await verifyPassword("senha-local-de-teste",a),true);
  assert.equal(await verifyPassword("incorreta",a),false);
  assert.equal(await verifyPassword("teste",`invalid:${"0".repeat(128)}`),false);
  assert.equal(safeSecretMatch("chave-a","chave-b"),false);
});

test("origem e content-type rejeitam solicitações forjadas", () => {
  const req = (origin:string,type="application/json") => new Request("https://app.example/api/chat", {
    headers:{origin,host:"app.example","content-type":type},
  });
  assert.equal(validOrigin(req("https://app.example")),true);
  assert.equal(validOrigin(req("https://evil.example")),false);
  assert.equal(validOrigin(req("ftp://app.example")),false);
  assert.equal(isJson(req("https://app.example","application/json; charset=utf-8")),true);
  assert.equal(isJson(req("https://app.example","application/json-falso")),false);
  assert.equal(isUuid("../../outro-usuario"),false);
});

test("JSON aceita 4000 caracteres multibyte e rejeita corpos grandes/inválidos", async () => {
  const req = (body:string) => new Request("http://localhost",{method:"POST",body});
  const message="界".repeat(4000);
  assert.equal((await parseJson(req(JSON.stringify({message}))))?.message,message);
  for (const body of ["[]","null","{",JSON.stringify({message:"x".repeat(40000)})]) {
    assert.equal(await parseJson(req(body)),null);
  }
});

test("leitura interrompe o upload no limite, sem consumir todo o corpo", async () => {
  let cancelled=false;
  const stream=new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(16384)); },
    cancel() {cancelled=true;},
  });
  const req=new Request("http://localhost",{method:"POST",body:stream,duplex:"half"} as RequestInit);
  assert.equal(await parseJson(req),null);
  assert.equal(cancelled,true);
});
