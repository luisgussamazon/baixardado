import {readFileSync,statSync} from "node:fs";
import {applyLocalSourceProposal} from "./source-worktree";
try{
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=="--file")throw Error("Use npm run source:apply -- --file caminho/da/proposta.json");
 if(statSync(args[1]).size>64000)throw Error("Proposta excedeu o limite.");
 const proposal=JSON.parse(readFileSync(args[1],"utf8"));console.log(JSON.stringify(applyLocalSourceProposal(process.cwd(),proposal)));
}catch{console.error("Proposta não aplicada por completo. Confira arquivo JSON, checkout limpo, repositório correto, hashes e limites. Revise eventuais worktrees em .tools/source-agent/review. Nenhum código gerado foi executado ou publicado.");process.exitCode=1;}
