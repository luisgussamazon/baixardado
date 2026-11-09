import Link from "next/link";
import {redirect} from "next/navigation";
import {getUser} from "@/lib/security";
import {db} from "@/lib/db";
import type {StudyNote} from "@/lib/autonomous-study";
import SafeMarkdown from "@/components/safe-markdown";
import styles from "../laboratorio/research.module.css";
export const dynamic="force-dynamic";
export default async function Studies(){
  if(!await getUser())redirect("/login");
  const notes=await db.query<StudyNote>("SELECT topic,title,sources,collected_at::text FROM autonomous_study_notes ORDER BY topic");
  return <main className={styles.page}><div className={styles.shell}><header className={styles.top}><div><p className={styles.eyebrow}>A3X · REFERÊNCIAS PÚBLICAS</p><h1>Estudos automáticos</h1><p>Programação, logística, planejamento e inventário.</p></div><nav><Link href="/chat">Chat</Link><Link href="/memoria">Minha memória</Link></nav></header>
  <section className={styles.notice}><strong>{process.env.A3X_AUTO_STUDY==="0"?"Coleta desativada pelo operador.":"Um ciclo por dia, enquanto houver computador conectado."}</strong><p>São três consultas públicas fixas, sem seu histórico ou dados pessoais. Trechos não revisados podem conter erros. Isso não treina o modelo nem modifica o código.</p></section>
  {!notes.rows.length&&<section className={styles.panel}>Nenhuma coleta concluída. A disponibilidade depende das fontes públicas e do computador conectado.</section>}
  {notes.rows.map(note=><section className={styles.panel} key={note.topic}><h2>{note.title}</h2><p>Coletado em {new Date(note.collected_at).toLocaleString("pt-BR")}. Fontes não revisadas.</p><SafeMarkdown>{note.sources.map(source=>`[${source.title.replace(/[\[\]<>]/g,"")}](${source.url})\n\n${source.snippet}`).join("\n\n")}</SafeMarkdown></section>)}
  </div></main>;
}
