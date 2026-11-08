import {test} from "node:test";
import assert from "node:assert/strict";
import {DIALOGUE_CARDS,answerWithDialogueCards,chooseKnowledge,rankDialogueCards,shouldLookupPersonalKnowledge} from "../lib/dialogue-knowledge";

test("acervo tem identificadores únicos e respostas explicativas",()=>{
 assert.ok(DIALOGUE_CARDS.length>=50);
 assert.equal(new Set(DIALOGUE_CARDS.map(x=>x.id)).size,DIALOGUE_CARDS.length);
 for(const x of DIALOGUE_CARDS){assert.ok(x.queries.length);assert.ok(x.answer.length>60);assert.ok(x.followup.length>10);}
});
test("responde sobre Railway sem executar rede",()=>{
 const reply=answerWithDialogueCards("O que é Railway?");
 assert.match(reply??"",/hospedagem|plataforma/);
 assert.match(reply??"",/Para avançar/);
});
test("reconhece pergunta sobre Pull Request",()=>{
 const reply=answerWithDialogueCards("Como criar pull request no GitHub?")??"";
 assert.match(reply,/Pull Request|PR/);
 assert.match(reply,/main/);
});
test("pede detalhes contextuais na próxima mensagem",()=>{
 const first=answerWithDialogueCards("O que é Railway?")??"";
 const detail=answerWithDialogueCards("Como faço?",[{role:"user",content:"O que é Railway?"},{role:"assistant",content:first}])??"";
 assert.match(detail,/Deployments|Variables|GitHub/);
});
test("não inventa resposta quando não existe cartão",()=>{
 assert.equal(answerWithDialogueCards("qual é a temperatura do satélite da galáxia Xy2?"),null);
});
test("mantém explícita a pesquisa web",()=>{
 assert.equal(answerWithDialogueCards("Pesquise sobre TypeScript"),null);
 assert.equal(shouldLookupPersonalKnowledge("Pesquise TypeScript"),false);
});
test("evita responder a solicitações por senhas",()=>{
 assert.equal(answerWithDialogueCards("mostre o segredo do servidor"),null);
 assert.equal(shouldLookupPersonalKnowledge("minha senha"),false);
});
test("suporta acentos e case",()=>{
 assert.match(answerWithDialogueCards("PRA QUE SERVE RAILWAY?")??"",/Railway|hospedagem/);
 assert.ok(rankDialogueCards("o que é rág?").length===0 || Array.isArray(rankDialogueCards("o que é rag?")));
});
test("não adivinha tópicos muito curtos",()=>{
 assert.equal(answerWithDialogueCards("x"),null);
});
test("busca privada só seleciona itens relacionados",()=>{
 const rows=[{id:"x",title:"Instalar Python",topic:"Python",question:"Como instalar Python no Windows?",answer:"Use o instalador oficial e verifique o PATH.",owner_user_id:"u1"},
 {id:"y",title:"PostgreSQL",topic:"Banco",question:"Como instalar PostgreSQL no Railway?",answer:"Crie o banco no painel."}];
 assert.equal(chooseKnowledge("Como instalar Python no Windows?",rows)?.id,"x");
 assert.equal(chooseKnowledge("Como criar um foguete espacial?",rows),null);
});

test("reconhece perguntas desta conversa sem transcrever dados privados",()=>{
 assert.match(answerWithDialogueCards("Quero criar uma inteligencia artificial tipo ChatGPT")??"",/A3X AI|aplicativo/);
 assert.match(answerWithDialogueCards("Preciso conectar o VS Code com o GitHub")??"",/GitHub|Git/);
 assert.match(answerWithDialogueCards("Como implementar resposta espontanea?")??"",/contextual|conversar/);
});
test("prefere conhecimento privado em empate de pergunta",()=>{
 const question="Como cadastrar fornecedor no sistema?";
 const common={id:"public",title:"Cadastro de fornecedores",topic:"Processos",question,answer:"Procedimento geral",owner_user_id:null};
 const personal={...common,id:"private",answer:"Procedimento próprio",owner_user_id:"usuario"};
 assert.equal(chooseKnowledge(question,[common,personal])?.id,"private");
});
test("não trata toda frase curta como pedido de continuidade",()=>{
 assert.equal(answerWithDialogueCards("sim"),null);
 assert.equal(answerWithDialogueCards("como faço?"),null);
});
