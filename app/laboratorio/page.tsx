import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/security";
import report from "@/research/autonomia-v1/results/demonstration.json";
import styles from "./research.module.css";
export const dynamic="force-dynamic";
const percent=(n:number)=>(n*100).toLocaleString("pt-BR",{maximumFractionDigits:2})+"%";
const partitions={train:"Treino",validation:"Validação",holdout:"Holdout separado",guardrails:"Controles de segurança"} as const;
export default async function Laboratory(){
  if(!await getUser())redirect("/login");
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.top}><div><p className={styles.eyebrow}>A3X · PESQUISA SUPERVISIONADA</p><h1>Laboratório científico</h1><p>Experimento offline de roteamento. Dados sintéticos, resultados rastreáveis e propostas sujeitas à revisão humana.</p></div><nav><Link href="/chat">Chat</Link><Link href="/programador">Programador</Link><Link href="/memoria">Minha memória</Link></nav></header>
    <section className={styles.notice}><strong>O holdout não melhorou.</strong><p>A validação subiu, mas este estudo ainda não demonstra aprendizagem geral. A política candidata não está aplicada ao Chat nem aprovada para produção.</p></section>
    <section className={styles.panel}><h2>Resultado reproduzido · 125 casos autorais</h2><div className={styles.table}><table><thead><tr><th>Conjunto</th><th>Original</th><th>Candidato</th><th>IC 95% do candidato</th></tr></thead><tbody>{Object.entries(partitions).map(([key,label])=>{
      const before=report.original[key as keyof typeof partitions],after=report.candidate[key as keyof typeof partitions];
      return <tr key={key}><th>{label}</th><td>{before.correct}/{before.total} · {percent(before.accuracy)}</td><td>{after.correct}/{after.total} · {percent(after.accuracy)}</td><td>{after.wilson95.map(percent).join(" – ")}</td></tr>;
    })}</tbody></table></div><p className={styles.hint}>Intervalos Wilson individuais, amostra pequena. Holdout: teste pareado sem mudança, p = {report.paired.holdout.exactMcNemarP}. Não é uma medida da qualidade geral do Chat.</p></section>
    <div className={styles.grid}><section className={styles.panel}><h2>Proposta controlada</h2><p>{report.changes.length} palavras sugeridas exclusivamente a partir dos erros de treino. No máximo três por categoria. Validação seleciona o candidato; holdout apenas relata o resultado separado.</p><p>A proposta é uma configuração declarativa TypeScript. O supervisor local pode prepará-la em outra branch e worktree mediante confirmação. Não faz commit, push, merge ou deploy.</p><ul>{report.changes.map(change=><li key={change.intent+change.keyword}><code>{change.intent}</code>: {change.keyword}</li>)}</ul></section>
    <section className={styles.panel}><h2>O que já funciona no aplicativo</h2><p>O Cognitive Engine continua responsável pelo Chat, contexto, memória aprovada e planos. Nenhum segundo agente foi colocado no caminho de produção.</p><p>Experimente no Chat: <code>planeje investigar um erro no meu site</code>. O plano é textual e depende das evidências que você fornecer; não consulta seu servidor nem executa comandos.</p><h3>Fronteiras de segurança</h3><ul><li>Nenhuma execução de estudo nesta página.</li><li>Nenhum acesso ao seu histórico para formar dados de treino.</li><li>Sem modelo, ferramenta externa ou API paga de IA.</li><li>Sem alterações autônomas na produção.</li></ul><p className={styles.hint}>Este painel mostra um relatório versionado. Não monitora nem se aperfeiçoa continuamente. Modelos abertos exigem uma etapa separada de infraestrutura, licenciamento, privacidade e avaliação.</p></section></div>
  </div></main>;
}
