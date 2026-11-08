import { isIP } from 'node:net';

export function safeKnowledgeUrl(value) {
  if (value == null) return null;
  if (typeof value !== 'string' || value.length > 2000) throw new Error('Fonte inválida.');
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/\.$/,'');
  if (url.protocol !== 'https:' || url.username || url.password || !host.includes('.') ||
      isIP(host.replace(/^\[|\]$/g,'')) || /\.(local|internal|localhost|invalid|test)$/.test(host)) throw new Error('Fonte inválida.');
  if (url.href.length>2000) throw new Error('Fonte excede limite após normalização.');
  return url.href.replace(/\(/g,'%28').replace(/\)/g,'%29');
}

export function parseKnowledgeJsonl(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 2_000_000) throw new Error('Base excede limite.');
  const lines = raw.split(/\r?\n/).filter(line=>line.trim());
  if (!lines.length || lines.length > 2000) throw new Error('Quantidade inválida de entradas.');
  const ids = new Set();
  const allowed = ['id','topic','title','question','answer','keywords','source_url','content_origin','language'];
  return lines.map((line,index)=>{
    try {
      const row = JSON.parse(line);
      if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key=>!allowed.includes(key))) throw new Error();
      for (const [key,max] of [['id',100],['topic',80],['title',180],['question',500],['answer',4000]]) {
        if (typeof row[key] !== 'string' || !row[key].trim() || row[key].length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(row[key])) throw new Error();
      }
      if (!/^a3x:[a-z0-9-]+$/.test(row.id) || ids.has(row.id) || row.content_origin !== 'original' || row.language !== 'pt-BR') throw new Error();
      if (!Array.isArray(row.keywords) || row.keywords.length>30 || !row.keywords.every(k=>typeof k==='string'&&k.trim()&&k.length<=80&&!/[\x00-\x1f]/.test(k))) throw new Error();
      row.source_url = safeKnowledgeUrl(row.source_url);
      ids.add(row.id);
      return row;
    } catch { throw new Error(`Entrada inválida na linha ${index+1}.`); }
  });
}

export async function importKnowledge(client,rows) {
  // Revalidação impede chamar este helper com proprietário vindo de arquivo externo.
  const valid = parseKnowledgeJsonl(rows.map(row=>JSON.stringify(row)).join('\n'));
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(7626341)');
    for (const row of valid) {
      const result = await client.query(`INSERT INTO knowledge_entries
        (id,owner_user_id,topic,title,question,answer,keywords,source_url,content_origin,language)
        VALUES($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT(id) DO UPDATE SET topic=EXCLUDED.topic,title=EXCLUDED.title,
          question=EXCLUDED.question,answer=EXCLUDED.answer,keywords=EXCLUDED.keywords,
          source_url=EXCLUDED.source_url,content_origin=EXCLUDED.content_origin,language=EXCLUDED.language
        WHERE knowledge_entries.owner_user_id IS NULL RETURNING id`,
      [row.id,row.topic,row.title,row.question,row.answer,row.keywords,row.source_url,row.content_origin,row.language]);
      if (!result.rows.length) throw new Error('Conflito com registro reservado.');
    }
    await client.query('COMMIT');
    return valid.length;
  } catch (error) {await client.query('ROLLBACK').catch(()=>{});throw error;}
}
