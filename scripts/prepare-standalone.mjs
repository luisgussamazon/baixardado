import fs from "node:fs/promises";
import path from "node:path";
// Next.js standalone não copia /public nem .next/static automaticamente.
const root = process.cwd();
const server = path.join(root, ".next", "standalone");
await fs.mkdir(path.join(server,".next"), {recursive:true});
await fs.cp(path.join(root,".next","static"), path.join(server,".next","static"), {recursive:true,force:true});
await fs.cp(path.join(root,"public"), path.join(server,"public"), {recursive:true,force:true});
console.log("Assets públicos e estáticos preparados para o servidor standalone.");
