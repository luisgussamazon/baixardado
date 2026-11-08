import Link from "next/link";
import { Code2, MessageSquare } from "lucide-react";

export default function ModeSwitch({mode,disabled=false}:{mode:"chat"|"programmer";disabled?:boolean}) {
  return <nav className="mode-switch" aria-label="Modo de trabalho">
    <Link href="/chat" aria-current={mode==="chat"?"page":undefined} aria-disabled={disabled}
      onClick={event=>{if(disabled)event.preventDefault();}}><MessageSquare size={15}/> Chat</Link>
    <Link href="/programador" aria-current={mode==="programmer"?"page":undefined} aria-disabled={disabled}
      onClick={event=>{if(disabled)event.preventDefault();}}><Code2 size={15}/> Programador</Link>
  </nav>;
}
