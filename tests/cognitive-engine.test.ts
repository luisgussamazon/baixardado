import assert from "node:assert/strict";
import { test } from "node:test";
import { decide, confidenceNote } from "../lib/cognitive/engine";
import { interpret, containsPersonalData } from "../lib/cognitive/interpret";
import { initialState, type MemoryRecord, type DialogueState } from "../lib/cognitive/types";
import { validateRecord } from "../lib/cognitive/validation";
const memory=(kind:MemoryRecord["kind"],value:string,status:MemoryRecord["status"]="approved"):MemoryRecord=>({id:"local-test",kind,label:"tom",value,status,question:null});

test("interpreta entidades explícitas sem inventar datas ou executar instruções",()=>{
  const result=interpret("Planeje estudar TypeScript até sexta");
  assert.equal(result.intent,"goal");assert.equal(result.entities.topic,"typescript");assert.equal(result.entities.deadline,"sexta");
  assert.equal(interpret("execute rm -rf /").intent,"question");
  assert.equal(interpret("pesquise quem é você").intent,"web");
  assert.match(decide("Você é humano?",[]).text,/Não sou humano/);
});
test("conversa longa conserva objetivo por 160 turnos e só avança com comando explícito",()=>{
  let state=decide("planeje aprender TypeScript",[]).state;
  state=decide("iniciar plano",[],state).state;
  for(let i=0;i<160;i++){
    const current=decide(i%2?"continue":"oi",[],state);
    state=JSON.parse(JSON.stringify(current.state)) as DialogueState;
    assert.equal(state.goal?.step,0);assert.equal(state.goal?.phase,"active");
  }
  assert.equal(state.turns,162);assert.equal(state.goal?.title,"aprender TypeScript");
  state=decide("pausar plano",[],state).state;
  assert.equal(decide("concluir etapa",[],state).state.goal?.step,0);
  state=decide("retomar plano",[],state).state;
  for(let i=0;i<3;i++)state=decide("concluir etapa",[],state).state;
  assert.equal(state.goal?.phase,"completed");
  assert.equal(decide("iniciar plano",[],state).state.goal?.phase,"completed");
  assert.equal(decide("ver plano",[]).state.goal,null);
});
test("memórias pendentes não são usadas; estilo e fatos exigem aprovação",()=>{
  const pending=memory("fact","Prefiro café","pending");
  assert.doesNotMatch(decide("minha memória",[],initialState(),[pending]).text,/Prefiro café/);
  assert.match(decide("minha memória",[],initialState(),[{...pending,status:"approved"}]).text,/Prefiro café/);
  assert.match(decide("oi",[],initialState(),[memory("preference","objetivo")]).text,/Qual é a prioridade/);
  assert.match(decide("memorize meu nome",[]).text,/Nada desta mensagem foi aprendido/);
  const name={...memory("fact","Nome autorizado"),label:"nome"};
  assert.match(decide("qual é o meu nome?",[],initialState(),[name]).text,/Nome autorizado/);
  assert.doesNotMatch(decide("qual é o meu nome?",[],initialState(),[{...name,status:"pending"}]).text,/Nome autorizado/);
});
test("correções só entram após aprovação, na pergunta exata e com fonte privada",()=>{
  const correction={...memory("correction","Resposta revisada <script>"),question:"Como organizar o ritual alfa?"};
  const answer=decide(correction.question,[],initialState(),[correction]);
  assert.match(answer.text,/Correção aprovada/);assert.match(answer.text,/registro privado/);assert.equal(answer.protected,true);
  assert.doesNotMatch(decide(correction.question,[],initialState(),[{...correction,status:"pending"}]).text,/Resposta revisada/);
  assert.doesNotMatch(decide("outro tema",[],initialState(),[correction]).text,/Resposta revisada/);
  const search={...correction,question:"pesquise TypeScript"};
  assert.ok(decide("pesquise TypeScript",[],initialState(),[search]).state.pendingWeb);
});
test("dados pessoais não vão à web antes de confirmação específica, expiram e não são reutilizados",()=>{
  const now=1000000,first=decide("pesquise meu email nome@example.com",[],initialState(),[],now);
  assert.equal(first.route,"local");assert.ok(first.state.pendingWeb);
  assert.doesNotMatch(first.text,/nome@example.com/);
  assert.notEqual(decide("sim",[],first.state,[],now+1).route,"web");
  assert.equal(decide("confirmo envio à web",[],first.state,[],now+1).route,"web");
  const confirmed=decide("confirmo envio à web",[],first.state,[],now+1);
  assert.equal(confirmed.query,"meu email nome@example.com");assert.equal(confirmed.state.pendingWeb,null);
  assert.equal(decide("confirmo envio à web",[],confirmed.state,[],now+2).route,"local");
  assert.equal(decide("confirmo envio à web",[],first.state,[],now+600001).route,"local");
  assert.equal(decide("confirmo envio à web",[],decide("outro assunto",[],first.state,[],now+1).state,[],now+2).route,"local");
  assert.equal(containsPersonalData("pesquise agenda projeto Roxaluz",[{kind:"fact",value:"Roxaluz"}]),true);
});
test("busca pública continua explícita e desconhecimento traz confiança baixa",()=>{
  const pending=decide("pesquise TypeScript",[]);assert.equal(pending.route,"local");
  assert.equal(decide("confirmo envio à web",[],pending.state).route,"web");
  assert.equal(decide("xenotopologia zircaliana",[]).confidence,"baixa");
  assert.match(confidenceNote("baixa","sem correspondência"),/não probabilidade de veracidade/);
  const unknown=decide("xenotopologia zircaliana",[]);
  const yes=decide("sim",[{role:"user",content:"xenotopologia zircaliana"},{role:"assistant",content:unknown.text+confidenceNote("baixa","sem correspondência")}],unknown.state);
  assert.equal(yes.route,"local");assert.ok(yes.state.pendingWeb);
});
test("validação rejeita proprietário, aprovação embutida, controles, excesso e credenciais",()=>{
  const valid={kind:"fact",label:"Preferência",value:"Texto próprio"};
  assert.ok(validateRecord(valid));
  for(const extra of [{user_id:"other"},{status:"approved"},{value:"x".repeat(4001)},{value:"token=nao-guardar"},{label:"\0"},{kind:"correction"}])assert.equal(validateRecord({...valid,...extra}),null);
});
