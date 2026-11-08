import { decide } from "../lib/cognitive/engine";
import { classify } from "../lib/research/classifier";
import { RESEARCH_POLICY } from "../config/research-policy";
const problem=process.argv.slice(2).join(" ").trim();
if(!problem||problem.length>500||/[\x00-\x1f]/.test(problem)||/\b(?:senha|password|token|api_key|database_url|credencial)\b|sk-[a-z0-9_-]{10,}|PRIVATE KEY|[^\s@]+@[^\s@]+\.[^\s@]+/i.test(problem)){
  console.error("Descreva um problema em até 500 caracteres, sem segredos.");process.exitCode=1;
}else{
  const decision=decide("planeje "+problem,[]);
  console.log(JSON.stringify({topic:classify(problem,RESEARCH_POLICY).intent,plan:decision.state.goal,execution:"none",evidence:"Somente a descrição fornecida; nenhuma hipótese factual foi testada.",nextStep:"Defina hipótese, métrica e resultado esperado; study testa apenas roteamento no benchmark sintético."},null,2));
}
