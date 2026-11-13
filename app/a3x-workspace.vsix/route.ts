import {readFile} from "node:fs/promises";
import path from "node:path";
import {getUser} from "@/lib/security";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 if(!await getUser())return new Response("Faça login para baixar a extensão.",{status:401});
 try{
  const data=await readFile(path.join(process.cwd(),".generated","a3x-workspace.vsix"));
  return new Response(new Uint8Array(data),{headers:{"Content-Type":"application/octet-stream","Content-Disposition":"attachment; filename=\"a3x-workspace.vsix\"","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return new Response("Instalador indisponível. Tente novamente após a conclusão do build.",{status:503});}
}
