import type {SavedConnection} from "./credential-store";
export class ConnectionUnauthorized extends Error {}
type Store={load():SavedConnection|null;save(value:SavedConnection):void;clear():void};
export async function connectComputer(server:URL,json:(path:string,body?:unknown,token?:string)=>Promise<any>,store:Store|null,signal:AbortSignal,sleep:(ms:number)=>Promise<void>,notify:(message:string)=>void):Promise<SavedConnection|null>{
  let connection:SavedConnection|null=store?.load()??null,approved=false;
  while(!signal.aborted&&!approved){
    if(connection){
      try{const resumed=await json("/api/local-model/session",{action:"resume"},connection.token);approved=resumed.ok===true;if(approved){if(!resumed.remembered)store?.clear();notify("Computador reconectado automaticamente à conta autorizada.");break;}}
      catch(error){if(!(error instanceof ConnectionUnauthorized)){await sleep(5000);continue;}}
      try{await json("/api/local-model/pair",undefined,connection.token);}
      catch(error){if(error instanceof ConnectionUnauthorized){store?.clear();connection=null;}else{await sleep(5000);continue;}}
    }
    if(!connection){
      try{
        const link=await json("/api/local-model/pair",{model:"qwen3:4b-instruct"});
        const candidate:SavedConnection={version:1,server:server.href,token:link.token,code:link.code};
        if(!/^[a-f0-9]{64}$/.test(candidate.token)||!/^[A-F0-9]{12}$/.test(candidate.code))throw new Error("Conexão inválida.");
        store?.save(candidate);connection=candidate;
      }catch{if(!signal.aborted){notify("Não foi possível preparar a conexão protegida. Nova tentativa em 15 segundos.");await sleep(15000);}continue;}
    }
    notify("Primeira vinculação necessária: "+new URL("/conectar?code="+connection.code,server).href);
    notify(store?"Marque reconexão automática e autorize uma vez. A credencial fica criptografada para seu usuário Windows.":"Modo somente memória. Reiniciar exige nova vinculação.");
    for(;;){
      if(signal.aborted)return null;
      try{
        const state=await json("/api/local-model/pair",undefined,connection.token);
        if(state.status==="approved"){
          const resumed=await json("/api/local-model/session",{action:"resume"},connection.token);
          approved=resumed.ok===true;if(!resumed.remembered)store?.clear();break;
        }
      }catch(error){if(error instanceof ConnectionUnauthorized){store?.clear();connection=null;notify("Código temporário expirou. Gerando novo endereço de primeira vinculação.");break;}}
      await sleep(3000);
    }
  }

return approved&&!signal.aborted?connection:null;
}
