"use client";
import {useState} from "react";
import Link from "next/link";
export default function BrowserContextSelect({disabled,value,onChange}:{disabled:boolean;value:string;onChange:(id:string)=>void}){
 const [devices,setDevices]=useState<{id:string;observation:{title:string}|null}[]>([]),[error,setError]=useState("");
 async function refresh(){setError("");try{const r=await fetch("/api/browser",{cache:"no-store"});if(!r.ok)throw Error();const data=await r.json();setDevices(data.devices.filter((d:{observation:unknown})=>d.observation));onChange("");}catch{setError("Não foi possível carregar as telas.");}}
 return <div className="browser-context"><Link href="/navegador">Navegador assistido</Link><button type="button" disabled={disabled} onClick={()=>void refresh()}>Carregar telas</button><select aria-label="Contexto da página" disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}><option value="">Sem tela compartilhada</option>{devices.map(d=><option key={d.id} value={d.id}>{d.observation?.title||"Tela ICQA"}</option>)}</select>{error&&<span role="alert">{error}</span>}</div>;
}
