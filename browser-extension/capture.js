// Função empacotada, sem código remoto. Não lê cookies, storage, HTML ou valores de campos.
export function captureVisiblePage(){
 if(location.origin!=="https://icqa-tool-production.up.railway.app"||location.pathname.includes("%")||/^\/(api|login|logout|auth)(\/|$)/i.test(location.pathname)||document.querySelector('input[type="password"],input[autocomplete="one-time-code"]'))throw Error("Entre no ICQA e abra uma tela sem campos de senha ou autenticação.");
 const ignored="script,style,noscript,input,textarea,select,option,[contenteditable],[hidden],[aria-hidden='true']";
 const nodes=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let text="",node;
 while((node=nodes.nextNode())&&text.length<6000){const parent=node.parentElement;if(!parent||parent.closest(ignored))continue;const style=getComputedStyle(parent);if(style.display==="none"||style.visibility==="hidden"||!parent.getClientRects().length)continue;const line=node.textContent.replace(/\s+/g," ").trim();if(line)text+=line+"\n";}
 // Redação básica, não substitui a revisão humana do texto antes do envio.
 text=text.slice(0,6000).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email removido]").replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,"[credencial removida]").replace(/\bsk-[A-Za-z0-9_-]{8,}/g,"[chave removida]");
 return {url:location.origin+location.pathname,title:document.title.slice(0,180),text};
}
