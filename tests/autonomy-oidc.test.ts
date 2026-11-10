import assert from "node:assert/strict";
import {test,afterEach,mock} from "node:test";
import {generateKeyPairSync,sign} from "node:crypto";
import {verifyAutonomyToken,AUTONOMY_WORKFLOW} from "../lib/autonomy-oidc";
const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048}),jwk={...publicKey.export({format:"jwk"}),kid:"test-key"};
const now=Math.floor(Date.now()/1000),claims={iss:"https://token.actions.githubusercontent.com",aud:"a3x-autonomy",sub:"repo:luisgussamazon/baixardado:ref:refs/heads/main",repository:"luisgussamazon/baixardado",repository_id:"1319600283",repository_owner_id:"306209510",ref:"refs/heads/main",workflow_ref:AUTONOMY_WORKFLOW,runner_environment:"github-hosted",event_name:"workflow_dispatch",run_id:"12345",jti:"one-use",sha:"a".repeat(40),iat:now,nbf:now,exp:now+300};
function token(change:Record<string,unknown>={}){const head=Buffer.from(JSON.stringify({alg:"RS256",typ:"JWT",kid:"test-key"})).toString("base64url"),body=Buffer.from(JSON.stringify({...claims,...change})).toString("base64url");return head+"."+body+"."+sign("RSA-SHA256",Buffer.from(head+"."+body),privateKey).toString("base64url");}
afterEach(()=>mock.restoreAll());
test("OIDC exige assinatura, audiência, identidade do repositório e workflow em main",async()=>{
 let calls=0;mock.method(globalThis,"fetch",async(url:unknown)=>{calls++;assert.equal(url,"https://token.actions.githubusercontent.com/.well-known/jwks");return Response.json({keys:[jwk]});});
 assert.equal((await verifyAutonomyToken(token(),now)).runId,"12345");assert.equal((await verifyAutonomyToken(token({sub:"repo:luisgussamazon@306209510/baixardado@1319600283:ref:refs/heads/main"}),now)).runId,"12345");
 for(const change of [{aud:"other"},{repository_id:"1"},{repository:"attacker/repo"},{workflow_ref:"attacker/job@refs/heads/main"},{ref:"refs/heads/evil"},{event_name:"pull_request"},{runner_environment:"self-hosted"},{exp:now-1},{iat:now-1000},{nbf:now+90},{sub:"repo:luisgussamazon/baixardado:pull_request"}])await assert.rejects(verifyAutonomyToken(token(change),now));
 const good=token();await assert.rejects(verifyAutonomyToken(good.slice(0,-10)+"invalidxx",now));await assert.rejects(verifyAutonomyToken("bad"));assert.equal(calls,1);
});
