import fs from 'node:fs/promises';
import {zipSync,strToU8} from 'fflate';
const files=['manifest.json','background.js','capture.js','policy.js','popup.html','popup.css','popup.js'];
const entries={};for(const name of files)entries[name]=strToU8(await fs.readFile('browser-extension/'+name,'utf8'));
await fs.mkdir('public',{recursive:true});await fs.writeFile('public/a3x-navegador.zip',zipSync(entries));
console.log('Extensão local A3X empacotada.');
