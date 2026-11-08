import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

// No VS Code / Node 22, carrega .env.local automaticamente.
if (!process.env.DATABASE_URL) {
  try { process.loadEnvFile('.env.local'); } catch {}
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL ausente. Configure a variável antes de rodar as migrações.');
  process.exit(1);
}
const client = new pg.Client({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8_000});
try {
  await client.connect();
  await client.query('SELECT pg_advisory_lock(90428100)');
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY, installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  for (const name of (await fs.readdir(path.resolve('sql'))).filter(x => x.endsWith('.sql')).sort()) {
    const done = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [name]);
    if (done.rowCount) continue;
    const sql = await fs.readFile(path.resolve('sql', name), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [name]);
      await client.query('COMMIT');
      console.log('Migração aplicada:', name);
    } catch (error) {await client.query('ROLLBACK'); throw error;}
  }
  console.log('Banco atualizado.');
} catch (error) {
  console.error('Falha na migração:');
  process.exitCode = 1;
} finally {
  try {await client.query('SELECT pg_advisory_unlock(90428100)');} catch {}
  await client.end();
}
