import {createPublicKey,verify,type JsonWebKey} from "node:crypto";
const ISSUER="https://token.actions.githubusercontent.com";
export const AUTONOMY_WORKFLOW="luisgussamazon/baixardado/.github/workflows/a3x-autonomy.yml@refs/heads/main";
type Key=JsonWebKey&{kid?:string;alg?:string;use?:string};
let cached:{expires:number;keys:Key[]}|undefined;
async function keys(){if(cached&&cached.expires>Date.now())return cached.keys;const r=await fetch(ISSUER+"/.well-known/jwks",{redirect:"error",signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error("OIDC indisponível.");const raw=await r.text();if(raw.length>64000)throw Error("JWKS inválido.");const data=JSON.parse(raw);if(!Array.isArray(data.keys)||data.keys.length>30)throw Error("JWKS inválido.");cached={expires:Date.now()+300000,keys:data.keys};return cached.keys;}
export type AutonomyIdentity={runId:string;jti:string;sha:string;event:string};
export async function verifyAutonomyToken(token:string,now=Math.floor(Date.now()/1000)):Promise<AutonomyIdentity>{
 if(token.length>16000||! /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))throw Error("Token inválido.");
 const [head,body,signature]=token.split("."),header=JSON.parse(Buffer.from(head,"base64url").toString("utf8"));
 if(header.alg!=="RS256"||header.typ!=="JWT"||typeof header.kid!=="string"||header.kid.length>200)throw Error("Cabeçalho inválido.");
 const key=(await keys()).find(k=>k.kid===header.kid&&k.kty==="RSA");if(!key||!verify("RSA-SHA256",Buffer.from(head+"."+body),createPublicKey({key,format:"jwk"}),Buffer.from(signature,"base64url")))throw Error("Assinatura inválida.");
 const c=JSON.parse(Buffer.from(body,"base64url").toString("utf8"));
 const subjects=["repo:luisgussamazon/baixardado:ref:refs/heads/main","repo:luisgussamazon@306209510/baixardado@1319600283:ref:refs/heads/main"];
 if(c.iss!==ISSUER||c.aud!=="a3x-autonomy"||!subjects.includes(c.sub)||c.repository!=="luisgussamazon/baixardado"||c.repository_id!=="1319600283"||c.repository_owner_id!=="306209510"||c.ref!=="refs/heads/main"||c.workflow_ref!==AUTONOMY_WORKFLOW||c.runner_environment!=="github-hosted"||!["push","schedule","workflow_dispatch"].includes(c.event_name))throw Error("Origem não autorizada.");
 if(![c.exp,c.iat,c.nbf].every(Number.isSafeInteger)||c.exp<=now||c.nbf>now+30||c.iat>now+30||c.iat<now-900||c.exp-c.iat>900||typeof c.jti!=="string"||c.jti.length>200||!c.jti||! /^\d{1,20}$/.test(c.run_id)||! /^[a-f0-9]{40}$/.test(c.sha))throw Error("Token expirado ou inválido.");
 return {runId:c.run_id,jti:c.jti,sha:c.sha,event:c.event_name};
}
