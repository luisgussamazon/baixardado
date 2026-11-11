const generatedFooter="_Gerado pelo modelo aberto Qwen3 4B no seu computador. Pode conter erros; confira informações importantes._";
const documentFooter="A documentação pode estar desatualizada ou contraditória. Nenhuma tela autenticada foi verificada e nenhuma ação de estoque foi executada.";
export function isPrivateLocalAnswer(text:string){return text.startsWith("**Consulta documental privada")||text.includes("**Origem:** seu conteúdo privado · Registro:")||text.includes("**Trechos privados fornecidos ao modelo:**")||text.includes("[P1: tela compartilhada pelo usuário]")||/\*\*Fontes:\*\*\s*\n- \[L\d+\]/.test(text);}
export function documentLine(value:string){
  return value.replace(/^\s*>\s?/g,"").replace(/\\([\\`*_{}\[\]<>#!|])/g,"$1")
    .replace(/^\s*[-*]\s+/,"").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1")
    .replace(/\*\*|__|`/g,"").replace(/<\/?[a-z][^>]*>/gi,"")
    .replace(/^\s*\||\|\s*$/g,"").replace(/\s*\|\s*/g," — ").trim();
}
export function assistantPresentation(content:string):{text:string;sources:string}{
  const fenced=/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
  const footer=new RegExp("(^|\\n\\n)"+generatedFooter.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?=\\n|$)","g");
  let text=content.split(fenced).map((part,index)=>index%2?part:part.replace(footer,"").replace(/\n\n_Confiança de correspondência:[^\n]*_\s*$/g,"")).join("").trim();
  const sources:string[]=[];
  const marker=/\n\n\*\*(?:Fontes:|Fontes recuperadas[^\n]*|Conhecimento fornecido ao modelo:[^\n]*|Estudos públicos automáticos[^\n]*)\*\*/;
  let start=-1,offset=0;
  for(const [index,part] of text.split(fenced).entries()){if(index%2===0){const at=part.search(marker);if(at>=0){start=offset+at;break;}}offset+=part.length;}
  if(start>0){sources.push(text.slice(start).trim().replace(/^\*\*Fontes:\*\*\s*/,""));text=text.slice(0,start).trim();}
  if(text.startsWith("**Consulta documental privada — trechos literais**")){
    text=text.replace(/^\*\*Consulta documental privada — trechos literais\*\*\s*O modelo auxilia a priorizar fontes; a resposta abaixo preserva o texto fornecido, sem acrescentar interpretações operacionais\.\s*/,"");
    if(text.endsWith(documentFooter))text=text.slice(0,-documentFooter.length).trim();
    text=text.replace(/^### (\[L\d+\] [^\n]+)$/gm,(_all,source:string)=>{sources.push("- "+source);return "";});
    text=text.split("\n").map(line=>line.startsWith(">")?documentLine(line):line).join("\n").replace(/\n{3,}/g,"\n\n").trim();
  }
  return {text,sources:sources.join("\n\n")};
}
