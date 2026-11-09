import {SERVER,SITE,navigationUrl} from "./policy.js";
let polling=false;
async function poll(){
 if(polling)return;polling=true;
 try{
  const {token,tabId}=await chrome.storage.session.get(["token","tabId"]);if(!token||!Number.isInteger(tabId))return;
  const headers={"Content-Type":"application/json",Authorization:"Bearer "+token};
  const response=await fetch(SERVER+"/api/browser/device",{method:"POST",credentials:"omit",redirect:"error",headers,body:JSON.stringify({action:"poll"}),signal:AbortSignal.timeout(10000)});
  // Pode estar aguardando aprovação. Não destruir o token de pareamento por um 401.
  if(!response.ok)return;
  const {command}=await response.json();if(!command)return;
  let ok=false;
  try{const tab=await chrome.tabs.get(tabId),url=navigationUrl(command.url);if(url&&new URL(tab.url).origin===SITE){await chrome.tabs.update(tabId,{url});ok=true;}}
  catch{/* Não repetir navegação em caso de falha. */}
  await fetch(SERVER+"/api/browser/device",{method:"POST",credentials:"omit",redirect:"error",headers,body:JSON.stringify({action:"complete",id:command.id,ok}),signal:AbortSignal.timeout(10000)});
 }catch{/* Token e conteúdo nunca são registrados. */}finally{polling=false;}
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==="a3x-browser")void poll();});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(sender.id===chrome.runtime.id&&message?.action==="poll"){void poll().then(()=>reply({ok:true}));return true;}});
chrome.runtime.onInstalled.addListener(()=>{void chrome.alarms.create("a3x-browser",{periodInMinutes:.5});});
chrome.runtime.onStartup.addListener(()=>{void chrome.alarms.create("a3x-browser",{periodInMinutes:.5});});
