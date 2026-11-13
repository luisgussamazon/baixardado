"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import type {SourceProposal} from "@/lib/source-policy";
import AutonomyStatus from "@/components/autonomy-status";
import AstroTasks from "@/components/astro-tasks";
import IntegrationConnections from "./integration-connections";

type Source={path:string;chars:number;writable:boolean};
type Record={id:string;goal:string;status:string};

export default function ChatX(){
  const [files,setFiles]=useState<Source[]|null>(null);
  const [records,setRecords]=useState<Record[]>([]);
  const [paths,setPaths]=useState<string[]>([]);
  const [goal,setGoal]=useState("");
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [proposal,setProposal]=useState<SourceProposal|null>(null);
  const pending=useRef(false);
  const selectedChars=files?.filter(file=>paths.includes(file.path)).reduce((sum,file)=>sum+file.chars,0)??0;

  async function load(){
    const response=await fetch("/api/source",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw Error(data.error);
    setFiles(data.files.filter((file:Source)=>file.writable));
    setRecords(data.proposals);
  }
  useEffect(()=>{void load().catch(()=>setError("Catálogo de código indisponível."));},[]);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(pending.current||!paths.length||!goal.trim()||!consent)return;
    pending.current=true;
    setBusy(true);
    setError("");
    setProposal(null);
    try{
      const response=await fetch("/api/source",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({goal,paths,consent})});
      const data=await response.json();
      if(!response.ok)throw Error(data.error);
      setProposal(data.proposal);
      setGoal("");
    }catch(error){
      setError(error instanceof Error?error.message:"Falha ao gerar proposta.");
    }finally{
      await load().catch(()=>{});
      pending.current=false;
      setBusy(false);
      setConsent(false);
    }
  }

  return <main className="source-studio chat-x">
    <nav><Link href="/chat">← Chat</Link><Link href="/autonomia">Ciclos automáticos</Link><Link href="/estudos">Estudos e referências</Link></nav>
    <h1>Chat X</h1>
    <IntegrationConnections/>
    <AstroTasks/>
    <p>Peça à Luna para revisar arquivos da A3X IA e propor uma melhoria. Os ciclos automáticos e suas verificações ficam em Autonomia A3X.</p>
    <form onSubmit={submit}>
      <label htmlFor="chat-x-goal">O que você quer melhorar?</label>
      <textarea id="chat-x-goal" value={goal} onChange={e=>setGoal(e.target.value)} maxLength={1000} required disabled={busy}/>
      <fieldset disabled={busy||!files}>
        <legend>Arquivos para análise</legend>
        <p>Selecione até três arquivos editáveis, com até 32.000 caracteres no total.</p>
        {!files&&!error&&<p role="status">Carregando catálogo…</p>}
        {files?.map(file=><label key={file.path}>
          <input type="checkbox" checked={paths.includes(file.path)} disabled={!paths.includes(file.path)&&(paths.length>=3||file.chars+selectedChars>32000)}
            onChange={e=>setPaths(e.target.checked?[...paths,file.path]:paths.filter(path=>path!==file.path))}/> {file.path}
        </label>)}
      </fieldset>
      <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/> Enviar o objetivo e os arquivos selecionados à OpenAI.</label>
      <button className="primary-btn" disabled={busy||!consent||!paths.length||!goal.trim()}>{busy?"Luna está analisando…":"Gerar proposta"}</button>
    </form>
    {error&&<p role="alert">{error}</p>}
    {proposal&&<section aria-live="polite">
      <h2>Proposta da Luna</h2>
      <p>{proposal.summary}</p>
      <p>Proposta gerada e aguardando revisão.</p>
      {proposal.edits.map((edit,index)=><details key={index}>
        <summary>{edit.path}</summary>
        <h3>Trecho atual</h3><pre>{edit.oldText}</pre>
        <h3>Trecho proposto</h3><pre>{edit.newText}</pre>
      </details>)}
    </section>}
    {records.length>0&&<section><h2>Solicitações recentes</h2>{records.map(record=><p key={record.id}>{record.goal} · {record.status==="ready"?<a href={`/api/source/${record.id}`}>Baixar proposta</a>:record.status==="failed"?"Falhou":record.status==="generating"?"Em análise":record.status}</p>)}</section>}
    <AutonomyStatus compact/>
  </main>;
}
