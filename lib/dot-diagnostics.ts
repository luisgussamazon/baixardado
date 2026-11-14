/** Technical classification, not an inferred root cause. No provider or private logs. */
export const INVESTIGABLE_FAILURES=["PLAN_FORMAT","PLAN_CONTEXT","PLAN_TOOLS","PLAN_TOOL_SCOPE","PLAN_TOOL_FINAL","PLAN_TOOL_LIMIT"] as const;
export function failureDiagnostic(value:unknown){
 const code=typeof value==="string"&&/^[A-Z_]{1,80}$/.test(value)?value:"UNKNOWN";
 const messages:Record<string,[string,string]>={
  AI_AUTH:["A API recusou a chave de acesso.","Confira a chave no cofre do Railway. Não a envie pelo Chat."],
  AI_ACCESS:["A API recusou a permissão de acesso.","Confira as permissões do projeto e do modelo no provedor."],
  AI_MODEL:["O modelo configurado não está disponível para esta conta.","Confira o acesso ao modelo no provedor."],
  AI_CONSENT:["A autorização da Luna não está disponível.","Revise o seletor de modelo e o consentimento da sua conta."],
  LOCAL_BUDGET:["O orçamento mensal interno foi atingido.","Aguarde a renovação do período ou use o modo local."],
  LOCAL_CONCURRENCY:["Já existem chamadas em andamento nesta conta.","Aguarde a conclusão antes de iniciar outra operação."],
  AI_LIMIT:["O provedor informou um limite de uso ou saldo.","Confira os limites e créditos no provedor."],
  AI_REQUEST:["O provedor recusou o formato da requisição.","A integração precisa de revisão humana antes de outra chamada."],
  AI_UNAVAILABLE:["A API não concluiu a operação com disponibilidade confirmada.","Confira os eventos. Uma chamada incerta não será repetida automaticamente."],
  AI_TIMEOUT:["A operação excedeu o prazo ou foi cancelada.","Confira os eventos antes de autorizar outra tentativa."],
  PLAN_FORMAT:["O planejamento retornou um formato inválido.","Podemos investigar o contrato e o escopo permitido, sem repetir a operação anterior."],
  PLAN_CONTEXT:["O contexto do planejamento excedeu o limite.","Podemos investigar como reduzir o contexto dentro dos arquivos autorizados."],
  PLAN_TOOLS:["O planejamento não concluiu dentro dos limites de ferramentas.","Podemos analisar uma abordagem menor dentro do escopo permitido."],
  PLAN_TOOL_SCOPE:["O planejamento pediu uma ferramenta fora do escopo.","Podemos investigar uma alternativa usando somente as ferramentas autorizadas."],
  PLAN_TOOL_FINAL:["O planejamento pediu uma ferramenta quando deveria concluir.","Podemos investigar uma conclusão mais restrita, sem ampliar permissões."],
  PLAN_TOOL_LIMIT:["O planejamento excedeu o limite de ferramentas ou enviou argumentos inválidos.","Podemos analisar uma investigação menor dentro dos limites atuais."],
  PLAN_INCOMPLETE:["A resposta do planejamento ficou incompleta.","Confira os eventos antes de autorizar outra operação."],
  TASK_LEASE:["A tarefa perdeu a autorização de execução ou foi pausada.","Confira o estado na Central antes de retomar."],
  DOT_PAUSED:["As investigações autônomas estão pausadas.","Revise as preferências dos agentes se quiser reativá-las."],
  DOT_CALL_LIMIT:["A tarefa atingiu seu limite de chamadas ou reserva.","Confira o resultado registrado; não haverá continuação paga automática."],
  DOT_EXPIRED:["A tarefa ultrapassou seu prazo de execução.","Confira os eventos antes de preparar outra tarefa."],
 };
 const [summary,next]=messages[code]??["A tarefa foi interrompida sem um diagnóstico específico confirmado.","Consulte os eventos da tarefa antes de escolher o próximo passo."];
 return {code,summary,next,investigable:(INVESTIGABLE_FAILURES as readonly string[]).includes(code)};
}
