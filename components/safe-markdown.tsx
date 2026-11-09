"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export default function SafeMarkdown({children}:{children:string}){
  return <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{img:()=>null,a:({href,children})=>{
    if(!href)return <span>{children}</span>;
    if(/[\\\u0000-\u0020]/.test(href))return <span>{children}</span>;
    const internal=href.startsWith("/")&&!href.startsWith("//");
    if(!internal&&!/^https?:\/\//i.test(href))return <span>{children}</span>;
    if(internal)return <a href={href}>{children}</a>;
    let address:string;try{const url=new URL(href);if(url.username||url.password)return <span>{children}</span>;address=url.href;}catch{return <span>{children}</span>;}
    return <button type="button" title={address} style={{border:0,background:"none",padding:0,color:"#a99aff",textDecoration:"underline",cursor:"pointer",font:"inherit"}} onClick={()=>{if(window.confirm("Abrir este endereço externo? Revise os dados na URL antes de confirmar.\n"+address))window.open(address,"_blank","noopener,noreferrer");}}>{children}</button>;
  }}}>{children}</ReactMarkdown>;
}
