"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, Check, Pencil, Plus, Save, Trash2 } from "lucide-react";
import styles from "./knowledge-app.module.css";

type Entry={id:string;topic:string;title:string;question:string;answer:string;keywords:string[];source_url:string|null;created_at:string;updated_at:string};
type FormValues={topic:string;title:string;question:string;answer:string;keywords:string;source_url:string};
const initial:FormValues={topic:"Programação",title:"",question:"",answer:"",keywords:"",source_url:""};
const text=(value:unknown)=>value instanceof Error?value.message:"Falha na comunicação.";
async function jsonRequest(url:string,init?:RequestInit){
  const res=await fetch(url,{cache:"no-store",...init});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error || `Erro HTTP ${res.status}`);
  return data;
}
export default function KnowledgeApp({email}:{email:string}){
  const [items,setItems]=useState<Entry[]>([]);
  const [form,setForm]=useState<FormValues>(initial);
  const [editId,setEditId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [filter,setFilter]=useState("");
  const load=useCallback(async()=>{
    try{const data=await jsonRequest("/api/knowledge");setItems(data.entries);}catch(e){setError(text(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  function change(name:keyof FormValues,value:string){setForm(x=>({...x,[name]:value}));setNotice("");}
  function reset(){setForm(initial);setEditId(null);setError("");}
  function edit(item:Entry){
    setEditId(item.id);setForm({topic:item.topic,title:item.title,question:item.question,answer:item.answer,
      keywords:item.keywords.join(", "),source_url:item.source_url??""});setError("");setNotice("");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  async function save(e:FormEvent){
    e.preventDefault();if(saving)return;
    setSaving(true);setError("");setNotice("");
    try{
      const body={...form,keywords:form.keywords.split(",").map(x=>x.trim()).filter(Boolean)};
      await jsonRequest(editId?`/api/knowledge/${encodeURIComponent(editId)}`:"/api/knowledge",{
        method:editId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
      });
      reset();await load();setNotice(editId?"Conhecimento atualizado.":"Conhecimento salvo. Experimente perguntar no Chat.");
    }catch(e){setError(text(e));}
    finally{setSaving(false);}
  }
  async function remove(item:Entry){
    if(saving||!window.confirm(`Excluir "${item.title}" do seu acervo?`))return;
    setSaving(true);setError("");setNotice("");
    try{await jsonRequest(`/api/knowledge/${encodeURIComponent(item.id)}`,{method:"DELETE"});
      if(editId===item.id)reset();await load();setNotice("Conhecimento excluído.");
    }catch(e){setError(text(e));}finally{setSaving(false);}
  }
  const visible=items.filter(x=>(x.title+" "+x.question+" "+x.topic+" "+x.keywords.join(" ")).toLowerCase().includes(filter.toLowerCase()));
  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.top}>
        <div><div className={styles.eyebrow}><BookOpen size={16}/> A3X AI • CONHECIMENTO</div><h1>Ensinar minha IA</h1>
          <p>Cadastre respostas que você revisou. O Chat poderá recuperá-las ao reconhecer perguntas semelhantes.</p></div>
        <div className={styles.nav}><Link href="/chat"><ChevronLeft size={16}/> Chat</Link><Link href="/programador">Programador</Link></div>
      </header>
      <div className={styles.layout}>
        <section className={styles.panel} aria-label="Cadastrar conhecimento">
          <div className={styles.panelTitle}><h2>{editId?"Editar conhecimento":"Novo conhecimento"}</h2><span>{items.length}/150</span></div>
          <form onSubmit={e=>void save(e)} className={styles.form}>
            <label>Tema <input required maxLength={80} value={form.topic} onChange={e=>change("topic",e.target.value)}/></label>
            <label>Título <input required maxLength={180} value={form.title} placeholder="Ex.: Como criar um Pull Request" onChange={e=>change("title",e.target.value)}/></label>
            <label>Pergunta de exemplo <textarea required rows={2} maxLength={500} value={form.question} placeholder="Como posso enviar minhas mudanças para o GitHub?" onChange={e=>change("question",e.target.value)}/></label>
            <label>Resposta ensinada <textarea required rows={7} maxLength={4000} value={form.answer} placeholder="Escreva a resposta correta e as etapas..." onChange={e=>change("answer",e.target.value)}/></label>
            <label>Palavras-chave separadas por vírgula <input value={form.keywords} placeholder="git, commit, push" onChange={e=>change("keywords",e.target.value)}/></label>
            <label>Fonte (opcional, HTTPS) <input type="url" value={form.source_url} placeholder="https://..." onChange={e=>change("source_url",e.target.value)}/></label>
            <p className={styles.hint}>Use apenas conteúdo próprio ou autorizado. Não cadastre senhas, tokens, dados confidenciais ou instruções que exijam execução de código perigoso.</p>
            <div className={styles.actions}><button className={styles.primary} disabled={saving} type="submit">{editId?<Pencil size={16}/>:<Save size={16}/>} {saving?"Salvando...":editId?"Atualizar":"Salvar conhecimento"}</button>
              {editId&&<button disabled={saving} type="button" onClick={reset}>Cancelar</button>}</div>
          </form>
          {error&&<p className={styles.error} role="alert">{error}</p>}
          {notice&&<p className={styles.success} role="status"><Check size={15}/> {notice}</p>}
        </section>
        <section className={styles.panel} aria-label="Meus conhecimentos">
          <div className={styles.panelTitle}><h2>Meu acervo privado</h2><span>{items.length} registros</span></div>
          <label className={styles.searchLabel}>Buscar neste acervo <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Pesquisar título, tema ou pergunta..." /></label>
          {loading?<p className={styles.hint}>Carregando registros...</p>:visible.length===0?<div className={styles.empty}><Plus size={25}/><p>{items.length?"Nenhum registro corresponde à busca.":"Ainda não há conhecimentos. Adicione sua primeira resposta."}</p></div>:
            <div className={styles.list}>{visible.map(x=><article className={styles.entry} key={x.id}>
              <span className={styles.topic}>{x.topic}</span><h3>{x.title}</h3><p className={styles.question}>{x.question}</p><p className={styles.answer}>{x.answer}</p>
              {!!x.keywords.length&&<p className={styles.tags}>{x.keywords.join(" · ")}</p>}
              <div className={styles.row}><button type="button" onClick={()=>edit(x)} disabled={saving}><Pencil size={14}/> Editar</button>
              <button type="button" onClick={()=>void remove(x)} disabled={saving} className={styles.danger}><Trash2 size={14}/> Excluir</button></div>
            </article>)}</div>}
          <p className={styles.footer}>Conta: {email}. Somente seus registros podem ser editados ou excluídos por esta interface. A biblioteca geral vem de arquivos versionados.</p>
        </section>
      </div>
    </div>
  </main>;
}
