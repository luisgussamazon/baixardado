import { validateProject, type GeneratedProject } from "@/lib/project-files";
import { researchMarkdown, type WebResearch } from "@/lib/web-search";

export function researchProject(description:string,research:WebResearch,localKnowledge?:string):GeneratedProject{
  const sources=researchMarkdown(research);
  return validateProject({name:"Base inicial com pesquisa",summary:"Template estático com pesquisa técnica e fontes. As funcionalidades descritas ainda precisam ser implementadas; nenhum modelo de IA gerou ou testou este código.",files:[
    {path:"README.md",content:`# Base inicial com pesquisa\n\nEste é um template, não um sistema completo gerado por IA.\n\n## Pedido\n\n${description}\n\n## Como abrir\n\nAbra index.html no navegador. Nenhuma dependência precisa ser instalada.\n\n## Próximos passos\n\nImplemente as regras de negócio descritas no pedido e revise as fontes em docs/pesquisa.md. Não há autenticação, banco ou backend neste template.\n`},
    {path:"docs/pesquisa.md",content:sources},
    ...(localKnowledge?[{path:"docs/conhecimento-local.md",content:localKnowledge}]:[]),
    {path:"index.html",content:'<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Base inicial</title><link rel="stylesheet" href="style.css"></head><body><main><p>BASE INICIAL</p><h1>Seu projeto começa aqui</h1><p>Este template ainda não implementa o sistema solicitado. Consulte o README e a pesquisa técnica.</p><button id="start" type="button">Ver próximo passo</button><p id="status" role="status"></p></main><script src="app.js"></script></body></html>'},
    {path:"style.css",content:':root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#10121c;color:#eee9ff;font-family:Arial,sans-serif}main{max-width:760px;margin:12vh auto;padding:30px}h1{font-size:clamp(28px,6vw,46px)}p{line-height:1.8;color:#bbb5ce}button{padding:12px 18px;border:0;border-radius:10px;background:#a590ed;color:#141020;cursor:pointer}button:focus-visible{outline:3px solid white;outline-offset:4px}'},
    {path:"app.js",content:'document.querySelector("#start").addEventListener("click", () => {\n  document.querySelector("#status").textContent = "Leia docs/pesquisa.md e implemente as funcionalidades do seu sistema.";\n});\n'},
  ]});
}
