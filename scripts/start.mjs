// Railway fornece PORT e pode definir HOSTNAME com o nome interno do contêiner.
process.env.HOSTNAME = '0.0.0.0';
// O painel pode sobrepor o predeploy. Garanta o esquema também no início real.
await import('./migrate.mjs');
if (process.exitCode) process.exit(process.exitCode);
await import('../.next/standalone/server.js');
