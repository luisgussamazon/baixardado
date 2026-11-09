// Credencial real nunca passa pela linha de comando, ambiente, logs ou arquivo em claro.
import {execFileSync} from "node:child_process";
import {existsSync,lstatSync,readFileSync,writeFileSync,renameSync,unlinkSync,mkdirSync,realpathSync} from "node:fs";
import {resolve,relative,isAbsolute,join} from "node:path";
import {randomUUID,createHash} from "node:crypto";
export type SavedConnection={version:1;server:string;token:string;code:string};
export function validSavedConnection(value:unknown,server:string):value is SavedConnection{
  if(!value||typeof value!=="object")return false;const item=value as SavedConnection;
  return item.version===1&&item.server===server&&typeof item.token==="string"&&/^[a-f0-9]{64}$/.test(item.token)&&typeof item.code==="string"&&/^[A-F0-9]{12}$/.test(item.code)&&Object.keys(item).length===4;
}
const protector=String.raw`$ErrorActionPreference='Stop'
try {
 Add-Type -AssemblyName System.Security
 $item=[Console]::In.ReadToEnd() | ConvertFrom-Json
 $entropy=[Text.Encoding]::UTF8.GetBytes('A3X-local-computer-v1')
 if($item.action -eq 'protect') {
  $bytes=[Text.Encoding]::UTF8.GetBytes([string]$item.data)
  $result=[Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Convert]::ToBase64String($result))
 } elseif($item.action -eq 'unprotect') {
  $bytes=[Convert]::FromBase64String([string]$item.data)
  $result=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Text.Encoding]::UTF8.GetString($result))
 } else {exit 1}
} catch {exit 1}`;
export function windowsProtect(action:"protect"|"unprotect",data:string):string{
  if(process.platform!=="win32")throw new Error("Proteção disponível somente no Windows.");
  try{return execFileSync("powershell.exe",["-NoProfile","-NonInteractive","-Command",protector],{input:JSON.stringify({action,data}),encoding:"utf8",windowsHide:true,timeout:15000,maxBuffer:32000,stdio:["pipe","pipe","ignore"]}).trim();}
  catch{throw new Error("Não foi possível acessar a credencial protegida pelo Windows.");}
}
export function credentialStore(server:string,root=process.cwd(),protect=windowsProtect){
  const parent=resolve(root,".tools");mkdirSync(parent,{recursive:true});
  const inside=relative(realpathSync(root),realpathSync(parent));if(inside.startsWith("..")||isAbsolute(inside))throw new Error("Diretório de credencial inválido.");
  const file=join(parent,"local-model-"+createHash("sha256").update(server).digest("hex").slice(0,16)+".dpapi");
  const check=()=>{if(existsSync(file)){const stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16000)throw new Error("Arquivo de credencial inválido.");}};
  return {
    load():SavedConnection|null{check();if(!existsSync(file))return null;try{const item:unknown=JSON.parse(protect("unprotect",readFileSync(file,"utf8")));if(!validSavedConnection(item,server))throw new Error();return item;}catch{throw new Error("Credencial protegida indisponível; não será sobrescrita automaticamente.");}},
    save(value:SavedConnection){if(!validSavedConnection(value,server))throw new Error("Credencial inválida.");check();const encrypted=protect("protect",JSON.stringify(value));if(!/^[A-Za-z0-9+/=]{20,16000}$/.test(encrypted))throw new Error("Proteção inválida.");const temporary=file+"."+randomUUID()+".tmp";try{writeFileSync(temporary,encrypted,{mode:0o600,flag:"wx"});renameSync(temporary,file);}finally{if(existsSync(temporary))unlinkSync(temporary);}},
    clear(){check();if(existsSync(file))unlinkSync(file);},
  };
}
