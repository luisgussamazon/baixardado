"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AssistantAnswer from "@/components/assistant-answer";
import {assistantPresentation} from "@/lib/answer-presentation";
import ModeSwitch from "@/components/mode-switch";
import ModelProviderSwitch from "@/components/model-provider-switch";
import BrowserContextSelect from "@/components/browser-context-select";
import Link from "next/link";
import {
  Check, Copy, FileText, Menu,
  MessageSquare, PanelLeftClose, Plus, ShieldCheck,
  Sparkles, Trash2, X, LogOut, Home, BarChart3, Layers, Settings2, HelpCircle, ChevronDown, ArrowRight
} from "lucide-react";

type ChatSummary = {id:string;title:string;updated_at:string};
type Message = {id:string;role:"user"|"assistant";content:string};
const suggestions = [
  {icon:FileText, title:"Gerar relatório",description:"Crie um relatório completo e estruturado.",text:"Quero preparar um relatório. Ajude-me a definir o objetivo e os dados necessários."},
  {icon:BarChart3, title:"Analisar dados",description:"Explore, interprete e extraia informações.",text:"Quero analisar dados. Vou fornecer os dados e explicar o que preciso descobrir."},
  {icon:Layers, title:"Resumo operacional",description:"Obtenha um panorama claro da operação.",text:"Ajude-me a criar um resumo operacional com as informações que vou fornecer."},
];

async function requestJson(url:string, init?:RequestInit) {
  const res = await fetch(url,{cache:"no-store",...init});
  const payload = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(payload.error || "Falha na comunicação.");
  return payload;
}

export default function ChatApp({email,appName}:{email:string;appName:string}) {
  const router = useRouter();
  const [chats,setChats] = useState<ChatSummary[]>([]);
  const [activeId,setActiveId] = useState<string|null>(null);
  const [messages,setMessages] = useState<Message[]>([]);
  const [input,setInput] = useState("");
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [sidebar,setSidebar] = useState(false);
  const [collapsed,setCollapsed] = useState(false);
  const [copied,setCopied] = useState<string|null>(null);
  const [modelOnline,setModelOnline]=useState(false);
  const [provider,setProvider]=useState<"local"|"openai">("local");
  const [browserDeviceId,setBrowserDeviceId]=useState("");
  const [browserAction,setBrowserAction]=useState<{deviceId:string;url:string;label:string}|null>(null);
  const [browserStatus,setBrowserStatus]=useState("");
  const skipNextLoad = useRef<string|null>(null);
  const sending = useRef(false);
  const chatEnd = useRef<HTMLDivElement|null>(null);
  const textarea = useRef<HTMLTextAreaElement|null>(null);

  const refreshChats = useCallback(async()=>{
    try {const data=await requestJson("/api/conversations");setChats(data.conversations);}catch(err){setError(err instanceof Error?err.message:"Erro de conexão.");}
  },[]);
  useEffect(()=>{void refreshChats();},[refreshChats]);
  useEffect(()=>{
    let active=true;const refresh=()=>{void requestJson("/api/local-model").then(data=>{if(active)setModelOnline(data.enabled&&data.devices.some((device:{online:boolean})=>device.online));}).catch(()=>{if(active)setModelOnline(false);});};
    refresh();const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};
  },[]);
  useEffect(()=>{
    if (!activeId) {setMessages([]);setLoading(false);return;}
    if (skipNextLoad.current===activeId) {skipNextLoad.current=null;return;}
    let cancelled=false;
    setLoading(true);setMessages([]);setError("");
    requestJson(`/api/conversations/${activeId}/messages`)
      .then(data=>{if(!cancelled)setMessages(data.messages.map((m:{id:number;role:"user"|"assistant";content:string})=>({...m,id:String(m.id)})));})
      .catch(err=>{if(!cancelled)setError(err.message);})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[activeId]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages,busy]);

  function newChat() {
    if (busy) return;
    setBrowserAction(null);setBrowserStatus("");
    setActiveId(null);setMessages([]);setError("");setInput("");setSidebar(false);
    textarea.current?.focus();
  }
  function selectChat(id:string) {
    if (busy || activeId===id) return;
    setBrowserAction(null);setBrowserStatus("");
    setActiveId(id);setSidebar(false);setError("");
  }
  function prepareRequest(text:string){if(busy)return;newChat();setInput(text);textarea.current?.focus();}
  async function deleteChat(id:string) {
    if(busy || !window.confirm("Excluir esta conversa e todas as mensagens?"))return;
    try {
      await requestJson(`/api/conversations/${id}`,{method:"DELETE"});
      setChats(ch=>ch.filter(x=>x.id!==id));
      if(activeId===id){setActiveId(null);setMessages([]);}
    }catch(err){setError(err instanceof Error?err.message:"Não foi possível excluir.");}
  }
  async function signOut() {
    if (busy) return;
    try {await requestJson("/api/logout",{method:"POST"});router.replace("/login");router.refresh();}
    catch(err){setError(err instanceof Error?err.message:"Falha ao sair.");}
  }
  async function copyMessage(id:string,value:string) {
    try {await navigator.clipboard.writeText(value);setCopied(id);setTimeout(()=>setCopied(null),1500);} catch {setError("Não foi possível copiar.");}
  }
  async function send(override?:string) {
    const question=(override??input).trim();
    if (!question || busy || sending.current || loading || question.length>4000) return;
    if(browserDeviceId&&provider==="openai"&&!window.confirm("Enviar o trecho revisado da tela selecionada à OpenAI junto com esta pergunta? Remova dados pessoais e segredos antes de compartilhar."))return;
    sending.current=true;
    setBrowserAction(null);setBrowserStatus("");
    setBusy(true);setError("");setInput("");
    let id=activeId;
    try {
      if (!id) {
        const created = await requestJson("/api/conversations",{method:"POST"});
        id=created.id;
        skipNextLoad.current=id;
        setActiveId(id);
      }
      const humanId=`local-u-${Date.now()}`;
      const answerId=`local-a-${Date.now()}`;
      setMessages(prev=>[...prev,{id:humanId,role:"user",content:question},{id:answerId,role:"assistant",content:""}]);
      const res=await fetch("/api/chat",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({conversationId:id,message:question,...(browserDeviceId?{browserDeviceId,shareBrowserContext:true,shareBrowserContextWithCloud:provider==="openai"}:{})}),
      });
      if (!res.ok) {
        const data=await res.json().catch(()=>({}));
        throw new Error(data.error||"Não foi possível enviar a pergunta.");
      }
      if (!res.body) throw new Error("Servidor não enviou uma resposta.");
      const reader=res.body.getReader();
      try {
        const decoder=new TextDecoder();
        let buffer="", done=false, failure="";
        function consume(part:string) {
          const event=part.split("\n").find(line=>line.startsWith("event: "))?.slice(7);
          const line=part.split("\n").find(line=>line.startsWith("data: "));
          if(!event || !line) return;
          const data=JSON.parse(line.slice(6));
          if(event==="delta")setMessages(prev=>prev.map(m=>m.id===answerId?{...m,content:m.content+data.text}:m));
          if(event==="failure")failure=data.message;
          if(event==="done")done=true;
          if(event==="browser_action")setBrowserAction(data);
        }
        while (true) {
          const part=await reader.read();
          if (part.done) break;
          buffer+=decoder.decode(part.value,{stream:true});
          let idx;
          while((idx=buffer.indexOf("\n\n"))!==-1){const event=buffer.slice(0,idx);buffer=buffer.slice(idx+2);consume(event);}
        }
        if(buffer.trim())consume(buffer);
        if(failure || !done) {
          setMessages(prev=>prev.filter(m=>m.id!==answerId));
          throw new Error(failure||"Resposta interrompida, confira seu histórico.");
        }
      } finally { await reader.cancel().catch(()=>{});reader.releaseLock(); }
      await refreshChats();
    }catch(err){
      setError(err instanceof Error?err.message:"Ocorreu um erro.");
      setInput(question);
      // Consulte o banco sem reenviar a pergunta, pois ela pode ter sido salva.
      if (id) {
        try {
          const data = await requestJson(`/api/conversations/${id}/messages`);
          setMessages(data.messages.map((m:Message)=>({...m,id:String(m.id)})));
        } catch { setMessages(prev=>prev.filter(m=>!m.id.startsWith("local-"))); }
      }
      await refreshChats();
    }finally{sending.current=false;setBusy(false);}
  }
  const currentTitle=chats.find(c=>c.id===activeId)?.title || "Nova conversa";
  return <div className="app-shell">
    {sidebar && <button className="mobile-backdrop" aria-label="Fechar menu" onClick={()=>setSidebar(false)}/>}
    <aside className={`sidebar ${sidebar?"sidebar-open":""} ${collapsed?"sidebar-collapsed":""}`}>
      <div className="sidebar-header">
        <div className="brand workspace-brand" aria-label={appName}>A3X{!collapsed&&<span> IA</span>}</div>
        {!collapsed&&<button className="icon-button desktop-only" title="Recolher menu" onClick={()=>setCollapsed(true)}><PanelLeftClose size={18}/></button>}
        {collapsed&&<button className="icon-button expand-button" title="Expandir menu" onClick={()=>setCollapsed(false)}><Menu size={18}/></button>}
        <button className="icon-button mobile-only" aria-label="Fechar menu" onClick={()=>setSidebar(false)}><X size={20}/></button>
      </div>
      <div className="sidebar-body">
        <nav className="primary-navigation" aria-label="Navegação principal">
          <button className={!activeId&&messages.length===0?"active":""} onClick={newChat} disabled={busy} title="Início"><Home/>{!collapsed&&<span>Início</span>}</button>
          <button onClick={()=>textarea.current?.focus()} disabled={busy} title="Conversar"><MessageSquare/>{!collapsed&&<span>Conversar</span>}</button>
          <button onClick={()=>prepareRequest(suggestions[0].text)} disabled={busy} title="Relatórios"><FileText/>{!collapsed&&<span>Relatórios</span>}</button>
          <button onClick={()=>prepareRequest(suggestions[1].text)} disabled={busy} title="Análises"><BarChart3/>{!collapsed&&<span>Análises</span>}</button>
          <Link href="/programador" aria-disabled={busy} onClick={e=>{if(busy)e.preventDefault();}} title="Projetos"><Layers/>{!collapsed&&<span>Projetos</span>}</Link>
          <Link href="/memoria" aria-disabled={busy} onClick={e=>{if(busy)e.preventDefault();}} className="navigation-settings" title="Configurações"><Settings2/>{!collapsed&&<span>Configurações</span>}</Link>
        </nav>
        <button className="new-chat" onClick={newChat} disabled={busy}><Plus size={19}/>{!collapsed&&"Nova conversa"}</button>
        {!collapsed && <><div className="section-heading">RECENTES</div><div className="chat-list">
          {chats.length===0 && <p className="empty-side">Suas conversas aparecerão aqui.</p>}
          {chats.map(c=><div className={`chat-nav ${activeId===c.id?"selected":""}`} key={c.id}>
            <button className="chat-nav-main" title={c.title} onClick={()=>selectChat(c.id)}><MessageSquare size={16}/><span>{c.title}</span></button>
            <button className="chat-delete" onClick={()=>deleteChat(c.id)} aria-label={`Excluir: ${c.title}`} title="Excluir conversa"><Trash2 size={15}/></button>
          </div>)}
        </div></>}
      </div>
      <div className="sidebar-bottom">
        {!collapsed&&<Link href="/autonomia" className="privacy-note" onClick={event=>{if(busy)event.preventDefault();}}>Autonomia A3X · melhorias contínuas</Link>}
        {!collapsed&&<Link href="/conectar" className="privacy-note" onClick={event=>{if(busy)event.preventDefault();}}>Conectar modelo do meu computador</Link>}
        {!collapsed&&<Link href="/estudos" className="privacy-note">Estudos automáticos</Link>}
        {!collapsed&&<Link href="/laboratorio" className="privacy-note" onClick={event=>{if(busy)event.preventDefault();}}>Laboratório científico · experimental</Link>}
        {!collapsed&&<div className="privacy-note"><ShieldCheck size={16}/><span>Conversas privadas e salvas</span></div>}
        <div className="profile"><div className="avatar">{email.slice(0,1).toUpperCase()}</div>{!collapsed&&<div className="profile-meta"><strong>Minha conta</strong><span title={email}>{email}</span></div>}<button className="icon-button logout" title="Sair" aria-label="Sair" onClick={signOut}><LogOut size={17}/></button></div>
      </div>
    </aside>
    <main className="main-chat neon-workspace">
      <header className="chat-topbar">
        <div className="chat-header-left"><button className="icon-button mobile-only" aria-label="Abrir menu" onClick={()=>setSidebar(true)}><Menu size={21}/></button><div className="header-title"><strong>{currentTitle}</strong><span><span className="online-dot"/>{provider==="openai"?" GPT-6 Luna - OpenAI":modelOnline?" Qwen3 4B · no seu computador":" Modelo offline · respostas por regras"}</span></div></div>
        <div className="topbar-controls"><div className="cognitive-nav"><ModelProviderSwitch disabled={busy} onChange={setProvider}/><ModeSwitch mode="chat" disabled={busy}/></div><details className="help-menu"><summary aria-label="Ajuda"><HelpCircle size={23}/></summary><div className="header-popover"><strong>Como posso ajudar?</strong><p>Converse, prepare um relatório ou organize seus projetos. Os cartões preparam sua solicitação para você completar.</p><Link href="/navegador">Conectar uma página do ICQA</Link></div></details><details className="account-menu"><summary><span className="avatar">{email.charAt(0).toUpperCase()}</span><span className="account-name">Minha conta</span><ChevronDown size={16}/></summary><div className="header-popover"><span>{email}</span><Link href="/memoria">Minha memória</Link><Link href="/conectar">Modelo do computador</Link><button onClick={signOut} disabled={busy}>Sair da conta</button></div></details></div>
      </header>
      <div className="conversation-scroll">
        <details className="browser-tools"><summary>Navegador assistido{browserDeviceId?" · tela selecionada":""}</summary><BrowserContextSelect disabled={busy} value={browserDeviceId} onChange={setBrowserDeviceId}/></details>
        {(browserAction||browserStatus)&&<div className="browser-context">{browserAction&&<button disabled={busy} onClick={()=>{const action=browserAction;if(!window.confirm("Autorizar abertura de "+action.url+" na aba vinculada do ICQA?"))return;setBusy(true);void requestJson("/api/browser",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"navigate",id:action.deviceId,url:action.url,confirmed:true})}).then(()=>{setBrowserAction(null);setBrowserStatus("Navegação solicitada. Aguarde até 30 segundos e compartilhe a nova tela pela extensão.");}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Confirmar navegação: {browserAction.label}</button>}<span role="status">{browserStatus}</span></div>}
        <div className="conversation-content">
          {loading ? <div className="loading-chat"><span className="spinner"/> Carregando conversa...</div> : messages.length===0 ?
          <div className="welcome">
            <div className="workspace-eyebrow">ESPAÇO DE TRABALHO</div><h1>Como posso ajudar?</h1>
            <p className="hero-tagline">Crie relatórios, analise dados e acompanhe seus projetos.</p>
            <div className="suggestion-grid">{suggestions.map(item=><button className="suggestion" aria-label={item.title} key={item.title} onClick={()=>prepareRequest(item.text)} disabled={busy}><item.icon size={36} strokeWidth={1.6}/><div><strong>{item.title}</strong><span>{item.description}</span></div><ArrowRight className="card-arrow" size={21}/></button>)}<Link className="suggestion" aria-label="Apoio em projetos" href="/programador" aria-disabled={busy} onClick={e=>{if(busy)e.preventDefault();}}><Layers size={36} strokeWidth={1.6}/><div><strong>Apoio em projetos</strong><span>Planeje, acompanhe e organize entregas.</span></div><ArrowRight className="card-arrow" size={21}/></Link></div>
          </div> : <div className="messages">
            {messages.map(m=><div key={m.id} className={`message-row ${m.role}`}>
              <div className={`message-avatar ${m.role}`}>{m.role==="assistant"?<Sparkles size={18}/>:email.charAt(0).toUpperCase()}</div>
              <div className="message-main"><div className="message-author">{m.role==="user"?"Você":appName}</div>
                {m.content ? <div className="message-content">{m.role==="assistant"?<AssistantAnswer>{m.content}</AssistantAnswer>:<p>{m.content}</p>}</div> : <div className="thinking"><span/><span/><span/></div>}
                {m.role==="assistant"&&!!m.content&&<button className="copy-btn" onClick={()=>void copyMessage(m.id,assistantPresentation(m.content).text)} title="Copiar resposta">{copied===m.id?<Check size={14}/>:<Copy size={14}/>} {copied===m.id?"Copiado":"Copiar"}</button>}
              </div>
            </div>)}<div ref={chatEnd}/></div>}
        </div>
      </div>
      <div className="chat-composer-area">
        {error&&<div className="chat-error" role="alert">{error}<button onClick={()=>setError("")} aria-label="Fechar erro"><X size={15}/></button></div>}
        <div className="composer"><textarea ref={textarea} rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}} placeholder="Descreva o que você precisa..." disabled={busy||loading} aria-label="Mensagem" maxLength={4000}/>
          <div className="composer-actions"><button className="send-btn" disabled={!input.trim()||busy||loading} title="Enviar mensagem" aria-label="Enviar mensagem" onClick={()=>void send()}>{busy?<span className="mini-spinner"/>:<ArrowRight size={24}/>}</button></div>
        </div>
      </div>
    </main>
  </div>;
}
