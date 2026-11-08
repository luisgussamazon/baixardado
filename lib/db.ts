import pg from "pg";

const globalPg = globalThis as unknown as { pgPool?: pg.Pool };
export const db = globalPg.pgPool ?? new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
});
if (process.env.NODE_ENV !== "production") globalPg.pgPool = db;
