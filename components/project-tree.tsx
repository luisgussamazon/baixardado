import { FileCode2, Folder } from "lucide-react";
import type { ProjectFile } from "@/lib/project-files";
type Node = {name:string;path:string;file?:ProjectFile;children:Map<string,Node>};

export default function ProjectTree({files,selected,onSelect}:{files:ProjectFile[];selected:string;onSelect:(path:string)=>void}) {
  const root:Node={name:"",path:"",children:new Map()};
  for(const file of files){
    let node=root;
    const parts=file.path.split("/");
    parts.forEach((name,i)=>{
      if(!node.children.has(name))node.children.set(name,{name,path:parts.slice(0,i+1).join("/"),children:new Map()});
      node=node.children.get(name)!;
    });
    node.file=file;
  }
  function branch(node:Node) {
    return <ul>{[...node.children.values()].sort((a,b)=>Number(!!a.file)-Number(!!b.file)||a.name.localeCompare(b.name)).map(child=>
      <li key={child.path}>{child.file?
        <button type="button" className={selected===child.path?"selected":""} aria-pressed={selected===child.path} title={child.path} onClick={()=>onSelect(child.path)}><FileCode2 size={14}/><span>{child.name}</span></button>:
        <details open><summary><Folder size={14}/><span>{child.name}</span></summary>{branch(child)}</details>}
      </li>)}</ul>;
  }
  return <nav className="project-tree" aria-label="Arquivos do projeto">{branch(root)}</nav>;
}
