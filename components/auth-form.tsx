"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";

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
  return <main className="auth-shell">
    <div className="auth-decoration auth-decoration-1"/><div className="auth-decoration auth-decoration-2"/>
    <div className="auth-layout">
      <section className="auth-intro">
        <div className="brand brand-large"><div className="brand-icon"><Sparkles size={21}/></div><span>A3X<span className="brand-accent"> AI</span></span></div>
        <div className="hero-label"><span className="status-dot"/> INTELIGÊNCIA QUE ACOMPANHA VOCÊ</div>
        <h1>Um universo de<br/><em>ideias começa</em><br/>aqui.</h1>
        <p>Crie, explore e encontre respostas com um assistente que acompanha o seu ritmo.</p>
        <div className="auth-points"><span><ShieldCheck size={16}/> Histórico privado</span><span><Sparkles size={16}/> Respostas inteligentes</span></div>
      </section>
      <section className="auth-card">
        <div className="auth-card-top"><div className="auth-lock"><LockKeyhole size={21}/></div><span>{isSetup?"PRIMEIRO ACESSO":"ACESSO SEGURO"}</span></div>
        <h2>{isSetup?"Crie sua conta":"Bem-vindo de volta"}</h2>
        <p className="auth-subtitle">{isSetup?"Configure o primeiro usuário da sua IA.":"Entre para continuar suas conversas."}</p>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="email">E-mail</label>
          <div className="field"><Mail size={18}/><input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254}/></div>
          <label htmlFor="password">Senha</label>
          <div className="field"><LockKeyhole size={18}/><input id="password" type={visible?"text":"password"} autoComplete={isSetup?"new-password":"current-password"} placeholder={isSetup?"Mínimo de 12 caracteres":"Sua senha"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={isSetup?12:1} maxLength={128}/><button className="password-show" type="button" aria-label="Mostrar senha" onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          {isSetup && <><label htmlFor="setup-key">Chave de configuração</label><div className="field"><ShieldCheck size={18}/><input id="setup-key" type="password" autoComplete="off" placeholder="BOOTSTRAP_SECRET" value={setupKey} onChange={e=>setSetupKey(e.target.value)} required/></div><p className="field-hint">É a chave configurada no arquivo de ambiente ou no Railway.</p></>}
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="primary-btn auth-submit" type="submit" disabled={busy}>{busy?"Processando...":isSetup?"Criar conta e começar":"Entrar na minha IA"}<ArrowRight size={18}/></button>
        </form>
        <div className="auth-footer">Sua conversa. Suas ideias. Seu espaço.</div>
      </section>
    </div>
    <div className="site-footer">A3X AI <span>·</span> Desenvolvido para transformar ideias em possibilidades</div>
  </main>;
}
