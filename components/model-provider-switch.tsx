"use client";
import {useEffect,useState} from "react";
type Provider="local"|"openai";
export default function ModelProviderSwitch({disabled,onChange}:{disabled:boolean;onChange:(provider:Provider)=>void}){
  const [provider,setProvider]=useState<Provider>("local"),[available,setAvailable]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{let active=true;void fetch("/api/ai/provider",{cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível carregar o modelo.");if(active){const selected=data.provider==="openai"?"openai":"local";setProvider(selected);setAvailable(data.available===true);onChange(selected);}}).catch(()=>{if(active)setError("Não foi possível carregar o modelo.");});return()=>{active=false;};},[onChange]);
  async function change(next:Provider){
    if(disabled||busy||next===provider)return;
    if(next==="openai"&&!window.confirm("Usar GPT-6 Luna? Suas mensagens, histórico recente e informações necessárias da memória/base da sua conta serão enviados à OpenAI. Há cobrança de API e teto interno inicial de US$5/mês. Os arquivos privados do computador não serão enviados automaticamente; trechos que você digitar ou colar em mensagens fazem parte da conversa enviada."))return;
    setBusy(true);setError("");
    try{const response=await fetch("/api/ai/provider",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:next,consent:next==="openai"})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível alterar o modelo.");setProvider(next);onChange(next);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="provider-switch"><label><span className="sr-only">Modelo de IA</span><select aria-label="Modelo de IA" disabled={disabled||busy} value={provider} onChange={event=>{const next=event.target.value as Provider;event.target.value=provider;void change(next);}}><option value="local">Meu computador</option><option value="openai" disabled={!available}>GPT-6 Luna{!available?" · indisponível":""}</option></select></label>{error&&<span role="alert" className="provider-error">{error}</span>}</div>;
}
