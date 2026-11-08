/**
 * A3X Diálogo v2 — respostas editoriais e recuperação determinística.
 * Sem modelos, APIs pagas, chamadas de rede ou execução de código.
 */
import rawCards from "../dados/dialogue-cards.json";

export type DialogueTurn = { role: "user" | "assistant"; content: string };
export type DialogueCard = {
  id: string;
  title: string;
  topic: string;
  queries: string[];
  keywords: string[];
  answer: string;
  details: string;
  followup: string;
};
export const DIALOGUE_CARDS: readonly DialogueCard[] = rawCards;

const STOP = new Set(
  "a o e as os de da do das dos para por com sem um uma umas uns me meu minha seus suas seus eu voce vocês vcs quero gostaria preciso posso pode fazer faz como qual quais que quem quando onde porque porquê explica explique sobre tem ta esta são isso isto ao no na nos nas assim ela ele uma seu poderia favor ai ia a3x ajuda mostre fala fale mais passo passos assunto pergunta resposta".split(" ")
);
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, " ").replace(/\s+/g, " ").trim();
}
export function keywordTokens(value: string): string[] {
  return [...new Set(normalizeForSearch(value).split(/\s+/).filter(x => x.length >= 3 && !STOP.has(x)))].slice(0, 55);
}
function contained(full: string, phrase: string): boolean {
  return !!phrase && (full === phrase || full.startsWith(phrase + " ") ||
    full.endsWith(" " + phrase) || full.includes(" " + phrase + " "));
}
export type RankedCard = { card: DialogueCard; score: number };

export function rankDialogueCards(query: string, max = 3): RankedCard[] {
  if (query.length > 4000 || !query.trim()) return [];
  const text = normalizeForSearch(query);
  const queryTokens = keywordTokens(query);
  if (!queryTokens.length) return [];
  const scored: RankedCard[] = [];
  for (const card of DIALOGUE_CARDS) {
    let best = 0;
    for (const alias of card.queries) {
      const a = normalizeForSearch(alias);
      const aliasTokens = keywordTokens(alias);
      if (!aliasTokens.length) continue;
      if (text === a) {best = 150; break;}
      if (aliasTokens.length >= 2 && contained(text, a)) best = Math.max(best, 115);
      const common = aliasTokens.filter(x => queryTokens.includes(x));
      const distinct = common.length;
      if (distinct < Math.min(2, queryTokens.length) || distinct < Math.min(2, aliasTokens.length)) continue;
      // Mistura precisão (evita assuntos vizinhos) e recall (aceita frases não idênticas).
      const coverage = distinct / queryTokens.length;
      const overlap = distinct / aliasTokens.length;
      const candidate = 25 + 48 * coverage + 25 * overlap + 2 * Math.min(distinct, 5);
      best = Math.max(best, candidate);
    }
    if (best < 55) {
      const vocab = keywordTokens(card.title + " " + card.topic + " " + card.keywords.join(" "));
      const common = queryTokens.filter(x => vocab.includes(x)).length;
      if (common >= 2 && common >= Math.ceil(queryTokens.length * 0.65))
        best = Math.max(best, 48 + 22 * common / Math.max(queryTokens.length, 1));
    }
    if (best >= 55) scored.push({card, score: Number(best.toFixed(1))});
  }
  scored.sort((a,b) => b.score - a.score || a.card.id.localeCompare(b.card.id));
  return scored.slice(0, Math.max(1,Math.min(5,max)));
}

const MORE = /^(?:sim|pode|pode ser|ok|quero|continue|continuar|mais detalhes|detalhes|me explica melhor|explique melhor|como faco|e como faco|mostra um exemplo|me da um exemplo|quero um exemplo|mostre o passo a passo|passo a passo)[!?. ]*$/;
const RESET = /^(?:mudar de assunto|outro assunto|esqueca isso|nao quero continuar)[.!? ]*$/;
const EXPLICIT_SEARCH = /^(?:pesquise|pesquisa|busque|buscar|procure|consultar|busca na web)\s/i;
const DO_NOT_SEARCH = /^(?:nao|não) (?:pesquise|busque)/i;
const RESTRICTED = /\b(?:minha senha|meu token|meu segredo|mostre o segredo|openai_api_key completa|database_url completa)\b/i;

function findContextCard(history: DialogueTurn[]): DialogueCard | null {
  const lastAssistant = [...history].reverse().find(t => t.role === "assistant")?.content ?? "";
  const header = lastAssistant.match(/^\*\*A3X • (.+?)\*\*/);
  if (header) return DIALOGUE_CARDS.find(card => card.title === header[1]) ?? null;
  const lastUser = [...history].reverse().find(t => t.role === "user")?.content ?? "";
  const candidates = rankDialogueCards(lastUser, 2);
  return candidates.length === 1 || (candidates[0] && candidates[1] && candidates[0].score - candidates[1].score >= 8)
    ? candidates[0]?.card ?? null : null;
}
export function shouldLookupPersonalKnowledge(query: string): boolean {
  const text = normalizeForSearch(query);
  if (query.length > 4000 || !keywordTokens(query).length || EXPLICIT_SEARCH.test(text) || DO_NOT_SEARCH.test(text) || RESTRICTED.test(text)) return false;
  if (/^(?:oi|ola|bom dia|boa tarde|boa noite|tchau|sim|nao|obrigado|obrigada|valeu|continue|mais detalhes|como faco)$/.test(text)) return false;
  if (/^(?:meu nome|qual meu nome|me chamo|esqueca meu nome|quanto e|calcule|conta)\b/.test(text)) return false;
  return true;
}

/**
 * Não inventa conteúdo. Só responde a cartões verificados manualmente.
 * Responde após o usuário enviar uma mensagem; sem push autônomo ou timers.
 */
export function answerWithDialogueCards(message: string, history: DialogueTurn[] = []): string | null {
  const text = normalizeForSearch(message);
  if (RESET.test(text)) return "Claro, podemos mudar de assunto. Sobre o que você quer conversar agora?";
  if (EXPLICIT_SEARCH.test(text) || DO_NOT_SEARCH.test(text) || RESTRICTED.test(text)) return null;
  const previous = findContextCard(history.slice(-24));
  if (MORE.test(text) && previous) {
    return `**A3X • ${previous.title}**\n\n${previous.details}\n\n**Para avançar:** ${previous.followup}\n\n_Explicação da biblioteca local; não é geração por modelo de IA._`;
  }
  // Evita adivinhar respostas para frases muito abertas e dúvidas de uma única palavra.
  const results = rankDialogueCards(message, 3);
  const best = results[0];
  if (!best || (best.score < 115 && results[1] && best.score - results[1].score < 5)) return null;
  return `**A3X • ${best.card.title}**\n\n${best.card.answer}\n\n**Para avançar:** ${best.card.followup}\n\n_Fonte: cartão ${best.card.id} da biblioteca local; sem modelo generativo._`;
}

export type SearchableKnowledge = {id:string;title:string;question:string;answer:string;topic:string;keywords?:string[];source_url?:string|null;owner_user_id?:string|null};
/** Retorna null se a pergunta não tiver correspondência forte, sem preencher lacunas. */
export function chooseKnowledge(query:string, rows:readonly SearchableKnowledge[]): SearchableKnowledge|null {
  if(!shouldLookupPersonalKnowledge(query))return null;
  const q=keywordTokens(query),norm=normalizeForSearch(query);
  const scored=rows.map(row=>{
    const question=normalizeForSearch(row.question);
    const tokens=keywordTokens(row.title+" "+row.question+" "+row.topic+" "+(row.keywords??[]).join(" "));
    const matched=q.filter(x=>tokens.includes(x)).length;
    let score=matched>=2 ? 30+60*matched/Math.max(q.length,1) : 0;
    if(norm===question)score=160;
    else if(keywordTokens(row.question).length>=2 && contained(norm,question))score=Math.max(score,120);
    if(row.owner_user_id)score+=1; // desempate: preferência leve por dados do próprio usuário
    return {row,score,matched};
  }).filter(x=>x.score>=62 && x.matched>=Math.min(2,q.length) || x.score>=120).sort((a,b)=>b.score-a.score);
  if(!scored.length || (scored.length>1 && scored[0].score<120 && scored[0].score-scored[1].score<5))return null;
  return scored[0].row;
}
