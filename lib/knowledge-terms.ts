const stop = new Set("como faco fazer faz uso usar significa criar escrever armazeno armazenar posso consegue pode somente qual que uma para com sem por meu minha meus minhas voce sobre entre outros outro segura seguro proteger diferenca sao esta tem foi agora cidade".split(" "));
export function knowledgeTerms(query:string):string[]{
  const text=query.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/next\.js/g,"nextjs").replace(/postgresql/g,"postgres");
  const aliases:Record<string,string>={promises:"promise",funcoes:"funcao",indices:"indice",aprender:"treinar",aprende:"treinar",js:"javascript"};
  return [...new Set((text.match(/[a-z0-9_]{2,}/g)??[]).filter(term=>!stop.has(term)).map(term=>aliases[term]??term))].slice(0,24);
}
