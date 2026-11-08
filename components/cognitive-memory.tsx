"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { MemoryKind, MemoryRecord } from "@/lib/cognitive/types";
import styles from "./knowledge-app.module.css";
const names:Record<MemoryKind,string>={fact:"Fato",preference:"Preferência",correction:"Correção",feedback:"Feedback"};
async function request(url:string,init?:RequestInit){
  const res=await fetch(url,{cache:"no-store",...init});const body=await res.json();
  if(!res.ok)throw new Error(body.error||"Falha na comunicação.");return body;
}
export default function CognitiveMemory(){
  const [records,setRecords]=useState<MemoryRecord[]>([]),[kind,setKind]=useState<MemoryKind>("fact");
  const [label,setLabel]=useState(""),[value,setValue]=useState(""),[question,setQuestion]=useState("");
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=async()=>{const data=await request("/api/cognitive/records");setRecords(data.records);};
  useEffect(()=>{let active=true;request("/api/cognitive/records").then(data=>{if(active)setRecords(data.records);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");
    try{await request("/api/cognitive/records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,label,value,question:kind==="correction"?question:null})});setLabel("");setValue("");setQuestion("");await load();setNotice("Proposta salva. Revise e clique em Aprovar para permitir seu uso.");}
    catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.");}finally{setBusy(false);}
  }
  async function act(record:MemoryRecord,action:"approve"|"delete"){
    if(busy||!window.confirm(action==="approve"?`Autoriza usar este registro nas suas respostas?\n${record.label}: ${record.value}`:`Excluir este registro? Isso não apaga mensagens e projetos anteriores.`))return;
    setBusy(true);setError("");setNotice("");
    try{await request(`/api/cognitive/records/${record.id}`,action==="approve"?{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"approve"})}:{method:"DELETE"});await load();setNotice(action==="approve"?"Registro aprovado para uso privado.":"Registro excluído.");}
    catch(e){setError(e instanceof Error?e.message:"Falha na operação.");}finally{setBusy(false);}
  }
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.top}><div><div className={styles.eyebrow}>A3X COGNITIVE ENGINE</div><h1>Minha memória</h1><p>Você decide o que autoriza. Propostas não são usadas até sua aprovação.</p></div><nav className={styles.nav}><Link href="/chat">Chat</Link><Link href="/programador">Programador</Link><Link href="/ensinar">Ensinar</Link><Link href="/laboratorio">Laboratório</Link></nav></header>
    <div className={styles.layout}><section className={styles.panel}><h2>Propor registro</h2>
      <p className={styles.hint}>Não inclua senhas ou tokens. Fatos e preferências aprovados podem ser consultados no Chat. Para definir o estilo, use preferência com título “tom” e valor executivo, acolhedor ou objetivo. Correções só respondem à pergunta cadastrada. Feedback fica registrado para sua revisão; não altera regras automaticamente.</p>
      <form className={styles.form} onSubmit={submit}><label>Tipo <select className="cognitive-select" value={kind} disabled={busy} onChange={e=>setKind(e.target.value as MemoryKind)}>{Object.entries(names).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
        <label>Título <input required maxLength={100} value={label} onChange={e=>setLabel(e.target.value)} disabled={busy}/></label>
        {kind==="correction"&&<label>Pergunta exata <input required maxLength={500} value={question} onChange={e=>setQuestion(e.target.value)} disabled={busy}/></label>}
        <label>{kind==="correction"?"Resposta corrigida":"Conteúdo"} <textarea required maxLength={4000} rows={6} value={value} onChange={e=>setValue(e.target.value)} disabled={busy}/></label>
        <div className={styles.actions}><button className={styles.primary} disabled={busy||loading} type="submit">{busy?"Processando...":"Salvar proposta"}</button></div>
      </form>{error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.success}>{notice}</p>}
    </section><section className={styles.panel}><h2>Registros privados · {records.length}/200</h2>
      {loading?<p role="status">Carregando...</p>:records.length===0?<p className={styles.hint}>Nenhum registro. O histórico de conversas não é aprendido automaticamente.</p>:<div className={styles.list}>{records.map(r=><article key={r.id} className={styles.entry}><span className={styles.topic}>{names[r.kind]} · {r.status==="approved"?"Aprovado":"Aguardando aprovação"}</span><h3>{r.label}</h3>{r.question&&<p className={styles.question}>{r.question}</p>}<p className={styles.answer}>{r.value}</p><div className={styles.row}>{r.status==="pending"&&<button disabled={busy} onClick={()=>void act(r,"approve")}>Aprovar</button>}<button className={styles.danger} disabled={busy} onClick={()=>void act(r,"delete")}>Excluir</button></div></article>)}</div>}
      <p className={styles.footer}>Excluir revoga o uso futuro do registro. Respostas já salvas continuam no histórico. Nenhum registro é compartilhado com outras contas.</p>
    </section></div></div></main>;
}
