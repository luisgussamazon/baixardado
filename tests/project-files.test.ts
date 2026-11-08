import assert from "node:assert/strict";
import { test } from "node:test";
import { unzipSync, strFromU8 } from "fflate";
import { PROJECT_LIMITS, validateProject, validProjectPath, ProjectValidationError } from "../lib/project-files";
import { projectZip } from "../lib/project-zip";
import { readProjectEvents } from "../lib/project-events";

const sample=()=>({name:"Sistema de tarefas",summary:"Projeto local de teste",files:[
  {path:"README.md",content:"# Instalação\nConteúdo em português."},
  {path:"src/app.ts",content:'const message = "olá";\nconsole.log(message);'},
]});

test("caminhos portáveis rejeitam traversal, codificação, dispositivos e pastas sensíveis",()=>{
  for(const path of ["../secret","src/../../x","/etc/passwd","C:/x","C:\\x","src\\app.ts","//host/x",
    "%2e%2e/x","a//b","a/./b","a/../b","a/","a\0.ts","a\n.ts","a:b","con","NUL.txt","src/COM1.js",
    "x.","x ",".git/config",".env",".env.local","__proto__/x","constructor/x","a/界.ts","a".repeat(161),
    "a/".repeat(8)+"x.ts"]){assert.equal(validProjectPath(path),false,path);}
  for(const path of ["src/app.tsx","README.md",".env.example",".github/workflows/ci.yml","public/logo.svg"]){
    assert.equal(validProjectPath(path),true,path);
  }
});

test("validação limita arquivos, bytes UTF-8, nomes e conflitos entre diretórios",()=>{
  assert.equal(validateProject(sample()).files.length,2);
  const invalid:unknown[]=[null,[],{}, {...sample(),name:""},{...sample(),name:"x".repeat(81)},
    {...sample(),summary:"x".repeat(2001)}, {...sample(),files:[]}, {...sample(),files:[sample().files[0]]},
    {...sample(),files:[...sample().files,...sample().files]},
    {...sample(),files:[{path:"SRC/App.ts",content:"x"},{path:"src/app.ts",content:"y"}]},
    {...sample(),files:[{path:"src",content:"x"},{path:"src/app.ts",content:"y"}]},
    {...sample(),files:[{path:"src/app.ts",content:"x"},{path:"SRC",content:"y"}]},
    {...sample(),files:[{path:"a.ts",content:"\0"},sample().files[0]]},
    {...sample(),files:[{path:"a.ts",content:"界".repeat(11000)},sample().files[0]]},
    {...sample(),files:Array.from({length:21},(_,i)=>({path:`f${i}.ts`,content:"x"}))},
    {...sample(),files:Array.from({length:5},(_,i)=>({path:`f${i}.ts`,content:"x".repeat(PROJECT_LIMITS.fileBytes)}))},
  ];
  for(const value of invalid)assert.throws(()=>validateProject(value),ProjectValidationError);
});

test("ZIP preserva nomes e conteúdo multiarquivo; traversal não chega ao compressor",()=>{
  const project=sample();
  const zip=unzipSync(projectZip(project));
  assert.deepEqual(Object.keys(zip).sort(),project.files.map(f=>f.path).sort());
  for(const file of project.files)assert.equal(strFromU8(zip[file.path]),file.content);
  assert.throws(()=>projectZip({...project,files:[{path:"../escape",content:"x"},project.files[0]]}),ProjectValidationError);
});

test("SSE do Programador tolera fragmentação UTF-8 e só conclui com done",async()=>{
  const input=new TextEncoder().encode('event: started\ndata: {"id":"local"}\n\nevent: progress\ndata: {"message":"Geração"}\n\nevent: done\ndata: {"id":"local"}\n\n');
  const stream=new ReadableStream<Uint8Array>({start(controller){for(const byte of input)controller.enqueue(new Uint8Array([byte]));controller.close();}});
  const events:string[]=[];
  assert.equal(await readProjectEvents(stream,(event,data)=>{events.push(event);if(event==="progress")assert.equal(data.message,"Geração");}),"local");
  assert.deepEqual(events,["started","progress","done"]);
  for(const text of ['event: progress\ndata: {"message":"aguarde"}\n\n','event: failure\ndata: {"message":"Erro local"}\n\n']){
    await assert.rejects(()=>readProjectEvents(new Response(text).body!,()=>{}));
  }
});
