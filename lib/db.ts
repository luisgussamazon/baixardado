import pg from "pg";

const globalPg = globalThis as unknown as { pgPool?: pg.Pool };
export const db = globalPg.pgPool ?? new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
  query_timeout: 15_000,
  statement_timeout: 15_000,
  idle_in_transaction_session_timeout: 15_000,
});
// Um erro em conexão ociosa não deve encerrar o processo Node.
if (!globalPg.pgPool) db.on("error", () => console.error("Conexão PostgreSQL ociosa interrompida."));
if (process.env.NODE_ENV !== "production") globalPg.pgPool = db;
