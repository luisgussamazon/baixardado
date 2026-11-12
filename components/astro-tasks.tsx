"use client";
import {useEffect,useRef,useState} from "react";

type Task={id:string;goal:string;status:string;cancel_requested:boolean;executor_active:boolean};
type Event={id:string;task_id:string;summary:string;created_at:string};
const labels:Record<string,string>={PENDING:"Aguardando o próximo ciclo",ANALYZING:"Analisando",PLANNING:"Planejando",CODING:"Desenvolvendo",TESTING:"Testando",VALIDATING:"Validando",APPLYING:"Aplicando",COMPLETED:"Concluída",FAILED:"Falhou",ROLLED_BACK:"Revertida",CANCELLED:"Cancelada"};
const terminal=new Set(["COMPLETED","FAILED","ROLLED_BACK","CANCELLED"]);

export default function AstroTasks(){
  const [tasks,setTasks]=useState<Task[]>([]);
  const [events,setEvents]=useState<Event[]>([]);
  const [goal,setGoal]=useState("");
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [loaded,setLoaded]=useState(false);
  const submitting=useRef(false);
  async function refresh(signal?:AbortSignal){
    const response=await fetch("/api/astro/tasks",{cache:"no-store",signal});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Fila indisponível.");
    setTasks(data.tasks);setEvents(data.events);setLoaded(true);
  }
  useEffect(()=>{
    const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>;
    async function poll(){
      try{await refresh(controller.signal);}
      catch{if(!controller.signal.aborted)setError("Não foi possível atualizar as tarefas.");}
      if(!controller.signal.aborted)timer=setTimeout(()=>void poll(),5000);
    }
    void poll();
    return ()=>{controller.abort();clearTimeout(timer);};
  },[]);
  async function mutate(method:"POST"|"PATCH",body:object){
    if(submitting.current)return;
    submitting.current=true;setBusy(true);setError("");
    try{
      const response=await fetch("/api/astro/tasks",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await response.json();
      if(!response.ok)throw Error(data.error);
      if(method==="POST"){setGoal("");setConsent(false);}
      await refresh();
    }catch(error){setError(error instanceof Error?error.message:"Falha na solicitação.");}
    finally{submitting.current=false;setBusy(false);}
  }
  return <section className="astro-tasks">
    <h2>Tarefas do A3X-6 Astro</h2>
    <p>Os objetivos ficam salvos na fila e são executados, um por vez, pelo próximo ciclo da Autonomia A3X (diário, por volta de 00h17 de Brasília, enquanto a autonomia estiver ativa). Cada tarefa vira no máximo uma pequena edição nos arquivos liberados para a autonomia, validada sem rede antes de ser publicada. Objetivos maiores são recusados com explicação. O consumo da Luna é registrado na sua conta.</p>
    <form onSubmit={event=>{event.preventDefault();void mutate("POST",{goal,consent});}}>
      <label htmlFor="astro-goal">Objetivo de engenharia</label>
      <textarea id="astro-goal" required maxLength={4000} value={goal} disabled={busy} onChange={event=>setGoal(event.target.value)}/>
      <label><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/> Autorizar a Luna a analisar este objetivo e o código público do A3X IA.</label>
      <button disabled={busy||!consent||!goal.trim()}>Adicionar à fila</button>
    </form>
    {error&&<p role="alert">{error}</p>}
    {!loaded&&<p role="status">Carregando tarefas…</p>}
    {loaded&&!tasks.length&&<p>Nenhuma tarefa registrada.</p>}
    {tasks.map(task=><article key={task.id}>
      <h3>{task.goal}</h3>
      <p>{labels[task.status]??task.status}{task.cancel_requested&&!terminal.has(task.status)?" · Interrupção solicitada":""}</p>
      {!terminal.has(task.status)&&task.status!=="APPLYING"&&<button disabled={busy||task.cancel_requested} onClick={()=>void mutate("PATCH",{id:task.id,action:"cancel"})}>Interromper tarefa</button>}
      <details><summary>Histórico da tarefa</summary>
        {events.filter(event=>event.task_id===task.id).map(event=><p key={event.id}><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString("pt-BR")}</time> · {event.summary}</p>)}
      </details>
    </article>)}
  </section>;
}
