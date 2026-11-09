"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import styles from "./knowledge-app.module.css";
type Device={id:string;model:string;online:boolean;expires_at:string;remembered?:boolean};
async function json(body?:unknown){const response=await fetch("/api/local-model",{cache:"no-store",method:body?"POST":"GET",headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok)throw new Error(result.error||"Conexão indisponível.");return result;}
export default function ModelConnection({initialCode}:{initialCode:string}){
  const [code,setCode]=useState(initialCode),[confirmed,setConfirmed]=useState(false),[remember,setRemember]=useState(true),[devices,setDevices]=useState<Device[]>([]),[adding,setAdding]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=async()=>{const result=await json();setDevices(result.devices);};
  useEffect(()=>{void load().catch(e=>setError(e.message));const timer=setInterval(()=>{void load().catch(()=>{});},15000);return()=>clearInterval(timer);},[]);
  async function approve(event:FormEvent){event.preventDefault();if(busy||!confirmed)return;setBusy(true);setError("");try{await json({action:"approve",code:code.trim().toUpperCase(),confirmed:true,remember});await load();setNotice("Autorizado. O computador deve ficar online em alguns segundos.");setCode("");setConfirmed(false);setAdding(false);window.history.replaceState(null,"","/conectar");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function revoke(id:string){if(busy||!window.confirm("Revogar o acesso deste computador às suas solicitações?"))return;setBusy(true);try{await json({action:"revoke",id});await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const remembered=devices.some(device=>device.remembered);
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.top}><div><div className={styles.eyebrow}>A3X · MODELO ABERTO LOCAL</div><h1>Meu computador conectado</h1><p>Qwen3 4B no seu computador, sem API paga de IA. O Railway preserva login e histórico.</p></div><nav className={styles.nav}><Link href="/chat">Chat</Link><Link href="/programador">Programador</Link><Link href="/memoria">Minha memória</Link></nav></header>
    <div className={styles.layout}><section className={styles.panel}>
      {remembered&&!adding?<><h2>Reconexão automática configurada</h2><p>Seu computador já está vinculado. Não é necessário reutilizar o código antigo.</p><p className={styles.hint}>Se estiver offline, mantenha o computador ligado e a ponte em execução. Com o início automático instalado, ela inicia quando você entra no Windows.</p><button onClick={()=>setAdding(true)}>Adicionar outro computador</button></>:<><h2>Primeira vinculação</h2><p className={styles.hint}>Use uma vez o endereço atual exibido pela ponte neste computador. Códigos temporários são renovados automaticamente até a vinculação; o código antigo da imagem não deve ser reutilizado.</p>
        <form className={styles.form} onSubmit={approve}>
          <label>Código do seu computador <input required pattern="[A-Fa-f0-9]{12}" maxLength={12} value={code} disabled={busy} onChange={e=>setCode(e.target.value)}/></label>
          <label className={styles.consent}><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>Autorizo este computador a receber mensagens, contexto recente, memórias aprovadas e referências privadas da minha conta. Só autorize um processo iniciado por você.</label>
          <label className={styles.consent}><input type="checkbox" checked={remember} disabled={busy} onChange={e=>setRemember(e.target.checked)}/>Reconectar automaticamente até eu revogar. Na ponte atualizada para Windows, a credencial fica criptografada para meu usuário.</label>
          <div className={styles.actions}><button className={styles.primary} disabled={busy||!confirmed} type="submit">{busy?"Autorizando...":"Autorizar meu computador"}</button></div>
        </form></>}
      {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.success}>{notice}</p>}
    </section><section className={styles.panel}><h2>Computadores autorizados</h2>
      {devices.length===0?<p className={styles.hint}>Nenhum computador autorizado. A primeira vinculação identifica a conta que este computador poderá atender.</p>:devices.map(device=><article key={device.id} className={styles.entry}><h3>{device.model} · {device.online?"Online":"Offline"}</h3><p>{device.remembered?"Reconexão automática até revogar.":"Conexão temporária."} O computador precisa continuar ligado e conectado.</p><div className={styles.row}><button disabled={busy} onClick={()=>void revoke(device.id)}>Revogar conexão</button></div></article>)}
      <p className={styles.footer}>A porta do Ollama permanece privada. Revogar bloqueia o acesso e cancela trabalhos pendentes. A proteção do Windows não protege contra malware ou administradores com controle do seu usuário. O modelo pode errar e não executa comandos da conversa.</p>
    </section></div></div></main>;
}
