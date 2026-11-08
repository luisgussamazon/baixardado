"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Code2, Copy, Download, FolderCode, History, LogOut, Plus, Sparkles, Square, Trash2, X } from "lucide-react";
import ModeSwitch from "@/components/mode-switch";
import CodeViewer, { codeLanguage } from "@/components/code-viewer";
import ProjectTree from "@/components/project-tree";
import { PROJECT_LIMITS, type ProjectSummary, type SavedProject } from "@/lib/project-files";
import { readProjectEvents } from "@/lib/project-events";

async function json<T>(url:string,init?:RequestInit):Promise<T> {
  const res=await fetch(url,{cache:"no-store",...init});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){
    if(res.status===401)window.location.assign("/login");
    throw new Error(data.error||"Não foi possível completar a solicitação.");
  }
  return data as T;
}
const statusLabel={generating:"Em geração",ready:"Pronto",failed:"Não concluído"};

export default function ProgrammerApp({email,appName}:{email:string;appName:string}) {
  const router=useRouter();
  const [projects,setProjects]=useState<ProjectSummary[]>([]);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [project,setProject]=useState<SavedProject|null>(null);
  const [selected,setSelected]=useState("");
  const [description,setDescription]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [listing,setListing]=useState(true);
  const [downloading,setDownloading]=useState(false);
  const [progress,setProgress]=useState("");
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const inFlight=useRef(false);
  const request=useRef<AbortController|null>(null);
  const selection=useRef(0);

  const refresh=useCallback(async()=>{
    const data=await json<{projects:ProjectSummary[]}>("/api/projects");
    setProjects(data.projects);
  },[]);
  useEffect(()=>{
    void refresh().catch(()=>setError("Não foi possível carregar o histórico de projetos.")).finally(()=>setListing(false));
    return ()=>{selection.current++;request.current?.abort();};
  },[refresh]);

  async function load(id:string) {
    const version=++selection.current;
    setLoading(true);setProject(null);setActiveId(id);setCopied(false);setError("");setHistoryOpen(false);
    try {
      const data=await json<{project:SavedProject}>(`/api/projects/${encodeURIComponent(id)}`);
      if(version!==selection.current)return;
      setProject(data.project);setSelected(data.project.files[0]?.path??"");
    } catch(err){if(version===selection.current)setError(err instanceof Error?err.message:"Falha ao carregar projeto.");}
    finally {if(version===selection.current)setLoading(false);}
  }
  // Recupera o estado após recarregar a página ou cancelar a leitura. Não inicia nova geração.
  useEffect(()=>{
    if(!project||project.status!=="generating"||busy)return;
    const id=project.id;
    const version=selection.current;
    const timer=setTimeout(()=>{
      void json<{project:SavedProject}>(`/api/projects/${encodeURIComponent(id)}`).then(data=>{
        if(version!==selection.current)return;
        setProject(data.project);setSelected(data.project.files[0]?.path??"");
        if(data.project.status!=="generating")void refresh().catch(()=>{});
      }).catch(()=>setError("Não foi possível atualizar o projeto. Selecione-o novamente no histórico."));
    },2500);
    return ()=>clearTimeout(timer);
  },[project,busy,refresh]);

  function startNew() {
    if(inFlight.current)return;
    selection.current++;setActiveId(null);setProject(null);setSelected("");setDescription("");setError("");setLoading(false);setHistoryOpen(false);
  }
  async function generate(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt=description.trim();
    if(inFlight.current||loading||!prompt||description.length>PROJECT_LIMITS.description)return;
    if(!window.confirm("Autoriza enviar esta descrição ao buscador público para pesquisar referências? Remova dados pessoais ou confidenciais antes de confirmar."))return;
    inFlight.current=true;setBusy(true);setError("");setProject(null);setActiveId(null);setProgress("Iniciando geração...");
    selection.current++;
    const abort=new AbortController();request.current=abort;
    let createdId="";
    try {
      const res=await fetch("/api/projects",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({description:prompt,confirmWeb:true}),signal:abort.signal});
      if(!res.ok){
        const data=await res.json().catch(()=>({}));
        if(res.status===401)window.location.assign("/login");
        throw new Error(data.error||"Não foi possível iniciar a geração.");
      }
      if(!res.body)throw new Error("Servidor não enviou uma resposta.");
      const id=await readProjectEvents(res.body,(event,data)=>{
        if(event==="started"&&typeof data.id==="string"){
          createdId=data.id;setActiveId(data.id);void refresh().catch(()=>{});
        }
        if(event==="progress"&&typeof data.message==="string")setProgress(data.message);
      });
      await load(id);
      setDescription("");
    } catch(err){
      if(createdId){
        try {
          const data=await json<{project:SavedProject}>(`/api/projects/${encodeURIComponent(createdId)}`);
          setProject(data.project);setSelected(data.project.files[0]?.path??"");
        } catch { /* Histórico continua acessível; não repetir uma geração automaticamente. */ }
      }
      setError(abort.signal.aborted?"Leitura cancelada. Consulte o estado no histórico; a tentativa pode ter consumido a cota.":err instanceof Error?err.message:"Não foi possível gerar o projeto.");
    } finally {
      request.current=null;inFlight.current=false;setBusy(false);setProgress("");
      await refresh().catch(()=>setError(previous=>previous||"Não foi possível atualizar o histórico."));
    }
  }
  async function remove(id:string) {
    if(inFlight.current||!window.confirm("Excluir este projeto e todos os arquivos?"))return;
    try {
      await json(`/api/projects/${encodeURIComponent(id)}`,{method:"DELETE"});
      if(activeId===id)startNew();
      await refresh();
    } catch(err){setError(err instanceof Error?err.message:"Não foi possível excluir.");}
  }
  async function download() {
    if(!project||project.status!=="ready"||downloading)return;
    setDownloading(true);setError("");
    try {
      const res=await fetch(`/api/projects/${project.id}/download`,{cache:"no-store"});
      if(!res.ok){
        const data=await res.json().catch(()=>({}));
        throw new Error(data.error||"Não foi possível baixar o ZIP.");
      }
      const url=URL.createObjectURL(await res.blob());
      const anchor=document.createElement("a");anchor.href=url;anchor.download=`a3x-projeto-${project.id}.zip`;
      anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(err){setError(err instanceof Error?err.message:"Falha no download.");}
    finally {setDownloading(false);}
  }
  const file=project?.files.find(item=>item.path===selected);
  return <div className="programmer-shell">
    <header className="programmer-topbar">
      <Link href="/programador" className="brand" onClick={e=>{e.preventDefault();startNew();}}><span className="brand-icon"><Sparkles size={18}/></span><span>{appName}</span></Link>
      <ModeSwitch mode="programmer" disabled={busy}/>
    </header>
    <aside className="project-sidebar">
      <button className="new-chat" onClick={startNew} disabled={busy}><Plus size={18}/> Novo projeto</button>
      <button className="history-toggle" onClick={()=>setHistoryOpen(!historyOpen)} aria-expanded={historyOpen}><History size={16}/> Meus projetos ({projects.length})</button>
      <div className={`project-history ${historyOpen?"is-open":""}`}>
        <h2 className="section-heading">MEUS PROJETOS</h2>
        {listing?<p className="empty-side" role="status">Carregando projetos...</p>:projects.length===0?<p className="empty-side">Seus projetos ficam salvos aqui, separados das conversas.</p>:null}
        {projects.map(item=><div className={`project-history-item ${activeId===item.id?"selected":""}`} key={item.id}>
          <button disabled={busy} onClick={()=>void load(item.id)} aria-label={`Abrir projeto ${item.name}`} aria-current={activeId===item.id?"true":undefined} title={item.name}>
            <FolderCode size={16}/><span><strong>{item.name}</strong><small>{statusLabel[item.status]}</small></span>
          </button>
          <button className="project-delete" disabled={busy} onClick={()=>void remove(item.id)} aria-label={`Excluir projeto ${item.name}`}><Trash2 size={14}/></button>
        </div>)}
      </div>
      <footer className="project-account"><span title={email}>{email}</span><button className="icon-button" aria-label="Sair" disabled={busy} onClick={()=>{
        void json("/api/logout",{method:"POST"}).then(()=>{router.replace("/login");router.refresh();}).catch(()=>setError("Não foi possível sair. Tente novamente."));
      }}><LogOut size={17}/></button></footer>
    </aside>
    <main className="programmer-main">
      <div className="programmer-content">
        <div className="programmer-heading"><span className="eyebrow">PESQUISA TÉCNICA E BASE INICIAL</span><h1>Modo Programador</h1><p>Pesquise referências e baixe um template de arquivos. Sem modelo de IA: a lógica do sistema descrito precisa ser implementada por você.</p></div>
        {error&&<div className="chat-error" role="alert">{error}<button onClick={()=>setError("")} aria-label="Fechar erro"><X size={16}/></button></div>}
        <form className="project-prompt" onSubmit={event=>void generate(event)}>
          <label htmlFor="project-description">O que você quer construir?</label>
          <textarea id="project-description" value={description} onChange={e=>setDescription(e.target.value)} disabled={busy} maxLength={PROJECT_LIMITS.description}
            placeholder="Ex.: um sistema de tarefas em React e TypeScript, com filtros por status, dados locais e instruções para rodar." rows={4} required/>
          <div className="project-prompt-footer"><span>{description.length.toLocaleString("pt-BR")} / 4.000 · Cota de projetos separada do Chat</span>
            {busy?<button className="project-secondary" type="button" onClick={()=>{setProgress("Cancelando...");request.current?.abort();}}><Square size={14}/> Cancelar</button>:
            <button className="primary-btn" type="submit" disabled={!description.trim()||loading}><Code2 size={17}/> Pesquisar e criar base</button>}
          </div>
        </form>
        {busy?<div className="project-progress" role="status"><span className="spinner"/>{progress}</div>:loading?<div className="project-progress" role="status"><span className="spinner"/> Carregando projeto...</div>:null}
        {!busy&&!loading&&project?.status==="generating"&&<div className="project-progress" role="status"><span className="spinner"/> Projeto em geração. O estado será atualizado automaticamente.</div>}
        {!busy&&!loading&&project?.status==="failed"&&<div className="project-empty"><FolderCode size={32}/><h2>Geração não concluída</h2><p>A tentativa ficou registrada. Você pode descrever um sistema menor e gerar um novo projeto.</p><button className="project-secondary" onClick={()=>setDescription(project.description)}>Usar descrição anterior</button></div>}
        {!busy&&!loading&&project?.status==="ready"&&<section className="project-result" aria-label="Projeto gerado">
          <div className="project-result-header"><div><h2>{project.name}</h2><p>{project.summary}</p><span className="project-count">{project.files.length} arquivos · Somente leitura</span></div>
            <button className="project-secondary" onClick={()=>void download()} disabled={downloading}><Download size={16}/>{downloading?"Preparando...":"Baixar ZIP"}</button>
          </div>
          <div className="project-workspace"><div className="project-files"><h3>EXPLORADOR</h3><ProjectTree files={project.files} selected={selected} onSelect={path=>{setSelected(path);setCopied(false);}}/></div>
            <div className="project-editor">{file&&<><div className="project-file-toolbar"><span title={file.path}>{file.path}</span><small>{codeLanguage(file.path)}</small><button className="project-copy" aria-label="Copiar código do arquivo" onClick={()=>{
              void navigator.clipboard.writeText(file.content).then(()=>setCopied(true)).catch(()=>setError("Não foi possível copiar o código."));
            }}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Copiado":"Copiar"}</button></div><CodeViewer path={file.path} content={file.content}/></>}</div>
          </div>
        </section>}
        {!busy&&!loading&&!project&&<div className="project-empty"><FolderCode size={36}/><h2>Seu próximo projeto começa aqui</h2><p>Arquivos de texto, estrutura de pastas e código com destaque de sintaxe. Tudo reunido em um ZIP.</p><div className="project-limit-chips"><span>Até 20 arquivos</span><span>32 KiB por arquivo</span><span>128 KiB no total</span></div></div>}
        <p className="project-disclaimer">A base é um template estático, não um sistema completo gerado por IA. Nenhum código é executado no servidor. A descrição é enviada ao buscador; não inclua senhas ou dados privados.</p>
      </div>
    </main>
  </div>;
}
