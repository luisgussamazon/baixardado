"use client";
import {useState} from "react";
import Link from "next/link";
import {Code2,GitBranch,Download,ExternalLink,Copy,Check} from "lucide-react";
import WorkspaceConnection from "./workspace-connection";
import styles from "./integration-connections.module.css";

const repository="https://github.com/luisgussamazon/baixardado";
export default function IntegrationConnections(){
 const [copied,setCopied]=useState(false),[error,setError]=useState("");
 async function copy(){try{await navigator.clipboard.writeText("git clone "+repository+".git");setCopied(true);setError("");}catch{setError("Não foi possível copiar. Use o endereço do repositório abaixo.");}}
 return <section className={styles.connections} aria-label="Conexões de desenvolvimento">
  <header><p>WORKSPACE A3X</p><h2>Conecte seu ambiente de desenvolvimento</h2><span>Repositório, editor e execução de tarefas em um só lugar.</span></header>
  <div className={styles.grid}>
   <article><GitBranch size={26}/><h3>GitHub</h3><strong>Repositório configurado</strong><p>luisgussamazon/baixardado</p><p>Abra sua conta no GitHub para conferir o acesso e as permissões do Actions. O A3X não recebe sua senha ou token por esta tela.</p><div className={styles.actions}><a href={repository} target="_blank" rel="noreferrer">Abrir repositório <ExternalLink size={14}/></a><a href={repository+"/actions/workflows/a3x-engineering.yml"} target="_blank" rel="noreferrer">Abrir runner</a><a href={repository+"/settings/actions"} target="_blank" rel="noreferrer">Permissões do Actions</a></div><p>O runner usa identidade temporária do GitHub. A permissão para criar PRs deve estar habilitada pelo administrador do repositório.</p></article>
   <article><Code2 size={26}/><h3>VS Code</h3><strong>Instalação e pareamento</strong><ol><li><a href="/a3x-workspace.vsix" download>Baixar extensão A3X <Download size={14}/></a></li><li>No VS Code, abra Extensões → menu ⋯ → <b>Instalar do VSIX</b> e selecione o arquivo baixado.</li><li><a href={"vscode://vscode.git/clone?url="+encodeURIComponent(repository+".git")}>Clonar projeto no VS Code <ExternalLink size={14}/></a> ou abra uma cópia existente deste repositório.</li><li>Na paleta de comandos, execute <b>A3X: Conectar workspace</b>. Confira e autorize o código nesta conta.</li></ol><button type="button" onClick={()=>void copy()}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?"Comando copiado":"Copiar git clone"}</button><p>Abertura do editor depende do VS Code instalado e da confirmação do navegador. A extensão é local, sem publicação no Marketplace.</p></article>
  </div>
  {error&&<p role="alert">{error}</p>}
  <WorkspaceConnection/>
  <footer><Link href="/central/projetos">Criar tarefa no projeto</Link><Link href="/central/testes">Acompanhar testes</Link><Link href="/central/github">Revisar branches e PRs</Link><p>A extensão consulta suas propostas e permite aplicar um diff confirmado em branch isolada. O terminal web exibe eventos; testes rodam no runner. Não há terminal livre ou acesso irrestrito ao computador.</p></footer>
 </section>;
}
