import ts from "typescript";
export type CodeFile={path:string;content:string};
/** Static validation only; generated modules are never imported or executed. */
export function validateCodeCandidate(value:unknown):CodeFile[]{
  if(!value||typeof value!=="object"||!Array.isArray((value as {files?:unknown}).files))throw new Error("Formato inválido.");
  const files=(value as {files:unknown[]}).files;
  if(files.length<1||files.length>2)throw new Error("Use de um a dois arquivos.");
  const seen=new Set<string>();let size=0;
  return files.map(value=>{
    if(!value||typeof value!=="object")throw new Error("Arquivo inválido.");
    const {path,content}=value as CodeFile;
    if(typeof path!=="string"||!/^lib\/experiments\/[a-z][a-z0-9-]{0,60}\.ts$/.test(path)||/\/(?:con|prn|aux|nul|com[0-9]|lpt[0-9])\.ts$/i.test(path)||seen.has(path.toLowerCase()))throw new Error("Caminho fora do escopo experimental.");
    if(typeof content!=="string"||!content.trim()||(size+=Buffer.byteLength(content,"utf8"))>16000)throw new Error("Conteúdo acima do limite.");
    seen.add(path.toLowerCase());
    const source=ts.createSourceFile(path,content,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
    if(source.statements.some(node=>!ts.isFunctionDeclaration(node)&&!ts.isInterfaceDeclaration(node)&&!ts.isTypeAliasDeclaration(node)&&!ts.isEmptyStatement(node)))throw new Error("Use somente declarações de funções e tipos.");
    function visit(node:ts.Node){
      if(ts.isImportDeclaration(node)||ts.isImportEqualsDeclaration(node)||ts.isExportDeclaration(node)&&node.moduleSpecifier||ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)throw new Error("Dependências externas não permitidas.");
      if(ts.isIdentifier(node)&&/^(eval|Function|require|process|global|globalThis|fetch|WebSocket|XMLHttpRequest|console|setTimeout|setInterval|Buffer|Deno|Bun)$/.test(node.text))throw new Error("Efeito externo não permitido.");
      ts.forEachChild(node,visit);
    }
    visit(source);
    const result=ts.transpileModule(content,{fileName:path,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,strict:true}});
    if(result.diagnostics?.some(item=>item.category===ts.DiagnosticCategory.Error))throw new Error("Sintaxe TypeScript inválida.");
    return {path,content};
  });
}
