"use client";
import { useMemo, type ReactNode } from "react";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import markdown from "highlight.js/lib/languages/markdown";
import yaml from "highlight.js/lib/languages/yaml";
import type { RootContent } from "hast";

const lowlight=createLowlight({javascript,typescript,css,xml,json,python,sql,bash,markdown,yaml});
const languages:Record<string,string>={js:"javascript",jsx:"javascript",mjs:"javascript",cjs:"javascript",
  ts:"typescript",tsx:"typescript",css:"css",html:"xml",svg:"xml",xml:"xml",json:"json",
  py:"python",sql:"sql",sh:"bash",md:"markdown",yml:"yaml",yaml:"yaml"};
export function codeLanguage(path:string) {return languages[path.split(".").pop()?.toLowerCase() ?? ""] ?? "texto";}

// Renderiza a árvore de tokens com React: código nunca vira HTML, script ou iframe.
function token(node:RootContent,key:number):ReactNode {
  if(node.type==="text")return node.value;
  if(node.type!=="element")return null;
  const classes=Array.isArray(node.properties.className)?node.properties.className.filter(c=>typeof c==="string"&&/^hljs-[a-z0-9_-]+$/.test(c)).join(" "):"";
  return <span key={key} className={classes}>{node.children.map((child,i)=>token(child,i))}</span>;
}
export default function CodeViewer({path,content}:{path:string;content:string}) {
  const language=codeLanguage(path);
  const code=useMemo(()=>{
    if(language==="texto")return content;
    try {return lowlight.highlight(language,content).children.map((node,i)=>token(node,i));}
    catch {return content;}
  },[language,content]);
  return <pre className="project-code" tabIndex={0} aria-label={`Código de ${path}`}><code className={`language-${language}`}>{code}</code></pre>;
}
