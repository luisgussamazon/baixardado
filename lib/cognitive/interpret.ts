import type { Interpretation } from "./types";
export const normalize=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
export function interpret(message:string):Interpretation {
  const text=normalize(message);
  const entities:Interpretation["entities"]={};
  const topic=text.match(/\b(railway|postgresql|postgres|typescript|javascript|python|github|git|programacao|negocio|prioridades)\b/);
  if(topic)entities.topic=topic[1];
  const deadline=message.match(/\b(?:até|ate|prazo)\s+([^.!?\n]{1,60})/i);if(deadline)entities.deadline=deadline[1];
  if(/^(?:lembre|memorize|guarde|esqueca|apague da memoria|minhas preferencias|minha memoria|o que (?:voce )?(?:sabe|lembra) sobre mim|corrigir resposta|feedback)\b/.test(text))return {intent:"memory",entities};
  if(/^(?:pesquise|pesquisa|busque|buscar|procure|busca na web|confirmo envio a web)\b/.test(text))return {intent:"web",entities};
  if(/\b(?:voce e humano|voce e uma pessoa|quem e voce|voce tem sentimentos|voce e consciente)\b/.test(text))return {intent:"identity",entities};
  const goal=message.trim().match(/^(?:planeje|planejar|crie um plano para|quero planejar|me ajude a planejar)\s+([\s\S]{1,500})$/i);
  if(goal){entities.goal=goal[1].trim();return {intent:"goal",entities};}
  const action=text.match(/^(iniciar plano|concluir etapa|pausar plano|retomar plano|cancelar plano|ver plano)[.!?]*$/);
  if(action){entities.action=action[1];return {intent:"goal-action",entities};}
  if(/^(sim|continue|como faco|e depois|proximo passo|mais detalhes)[.!?]*$/.test(text))return {intent:"followup",entities};
  return {intent:"question",entities};
}
export function containsPersonalData(query:string,records:readonly {kind:string;value:string}[]=[]):boolean {
  const text=normalize(query);
  return /\b(?:meu|minha|meus|minhas|cpf|rg|endereco|telefone|email|e-mail|paciente|cliente|senha|token|segredo)\b/.test(text)||
    /[^\s@]+@[^\s@]+\.[^\s@]+|\b\d[\d .()+-]{7,}\d\b/.test(query)||
    records.some(r=>r.kind==="fact"&&r.value.length>=3&&text.includes(normalize(r.value)));
}
