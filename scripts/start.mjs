// Railway fornece PORT e pode definir HOSTNAME com o nome interno do contêiner.
process.env.HOSTNAME = '0.0.0.0';
await import('../.next/standalone/server.js');
