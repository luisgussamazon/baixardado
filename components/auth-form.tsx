"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export default function AuthForm({mode}:{mode:"login"|"setup"}) {
  const isSetup = mode === "setup";
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [setupKey,setSetupKey] = useState("");
  const [visible,setVisible] = useState(false);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);setError("");
    try {
      const response = await fetch(isSetup?"/api/setup":"/api/login",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password,...(isSetup?{setupKey}:{})}),
      });
      const result = await response.json().catch(()=>({error:"Serviço temporariamente indisponível. Tente novamente."}));
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      router.replace("/chat");router.refresh();
    } catch(error) {setError(error instanceof Error ? error.message:"Erro desconhecido.");}
    finally {setBusy(false);}
  }
  return <main className={`auth-shell auth-neon ${isSetup?"auth-setup":"auth-login"}`}>
    <div className="auth-decoration auth-decoration-1"/><div className="auth-decoration auth-decoration-2"/>
    <div className="auth-layout">
      <section className="auth-intro">
        <div className="auth-wordmark"><img src="/a3x-orbit.svg" alt="A3X IA" width={620} height={230}/><span>ASSISTENTE INTELIGENTE</span></div>
        <div className="hero-label"><span/> PESQUISE <b>•</b> ANALISE <b>•</b> CRIE <b>•</b> OTIMIZE</div>
        <h1>Um universo de<br/> <em>ideias</em> começa<br/>aqui.</h1>
        <p>Sua plataforma de Inteligência Artificial para pesquisas, relatórios e análises.</p>
      </section>
      <section className="auth-card">
        <div className="auth-card-top"><ShieldCheck size={34}/><span>{isSetup?"Primeiro acesso":"Acesso Seguro"}</span></div>
        <h2>{isSetup?"Crie sua conta":"Bem-vindo à A3X IA"}</h2>
        <p className="auth-subtitle">{isSetup?"Configure o primeiro acesso ao seu espaço.":"Entre com sua conta para continuar"}</p>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="email">E-mail</label>
          <div className="field"><Mail size={24}/><input id="email" type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254}/></div>
          <label htmlFor="password">Senha</label>
          <div className="field"><LockKeyhole size={24}/><input id="password" type={visible?"text":"password"} autoComplete={isSetup?"new-password":"current-password"} placeholder={isSetup?"Mínimo de 12 caracteres":"Senha"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={isSetup?12:1} maxLength={128}/><button className="password-show" type="button" aria-label={visible?"Ocultar senha":"Mostrar senha"} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={22}/>:<Eye size={22}/>}</button></div>
          {isSetup && <><label htmlFor="setup-key">Chave de configuração</label><div className="field"><ShieldCheck size={18}/><input id="setup-key" type="password" autoComplete="off" placeholder="BOOTSTRAP_SECRET" value={setupKey} onChange={e=>setSetupKey(e.target.value)} required/></div><p className="field-hint">É a chave configurada no arquivo de ambiente ou no Railway.</p></>}
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="primary-btn auth-submit" type="submit" disabled={busy}>{busy?"Processando...":isSetup?"Criar conta e começar":"Entrar na A3X IA"}<ArrowRight size={24}/></button>
        </form>
      </section>
    </div>
  </main>;
}
