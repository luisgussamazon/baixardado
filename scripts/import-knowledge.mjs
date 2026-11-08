import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { parseKnowledgeJsonl,importKnowledge } from '../lib/knowledge-data.mjs';

const {values} = parseArgs({options:{apply:{type:'boolean',default:false},file:{type:'string',default:'knowledge/a3x-v1/entries.jsonl'},'confirm-database':{type:'string'}}});
let client;
try {
  const rows = parseKnowledgeJsonl(await readFile(values.file,'utf8'));
  console.log(`Base validada: ${rows.length} registros públicos. ${values.apply?'Aplicação solicitada.':'Simulação: nenhum banco acessado.'}`);
  if (values.apply) {
    if (!values['confirm-database']) throw new Error('Informe --confirm-database com o nome do banco autorizado.');
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente.');
    const {default:pg} = await import('pg');
    client = new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,statement_timeout:15000});
    await client.connect();
    const target = await client.query('SELECT current_database() AS name');
    if (target.rows[0].name !== values['confirm-database']) throw new Error('Destino diferente do confirmado; importação interrompida.');
    console.log(`Importação concluída: ${await importKnowledge(client,rows)} registros. Privados preservados.`);
  }
} catch {console.error('Importação não aplicada. Verifique formato, migração 003, destino confirmado e conexão.');process.exitCode=1;}
finally {await client?.end().catch(()=>{});}
