import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("esquema PostgreSQL: isolamento, cota atômica, bloqueio e cascata", async () => {
  const db=new PGlite();
  try {
    // PGlite já fornece gen_random_uuid; pgcrypto não é necessário neste banco descartável.
    const schema=(await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;","");
    await db.exec(schema);
    await db.exec(schema);
    const a="00000000-0000-4000-8000-000000000001", b="00000000-0000-4000-8000-000000000002";
    await db.query("INSERT INTO users(id,email,password_hash) VALUES($1,'a@example.test','local'),($2,'b@example.test','local')",[a,b]);
    const chat=await db.query<{id:string}>("INSERT INTO conversations(user_id) VALUES($1) RETURNING id",[a]);
    const id=chat.rows[0].id;
    await db.query("INSERT INTO messages(conversation_id,role,content) VALUES($1,'user','teste local')",[id]);
    const hidden=await db.query("SELECT m.id FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.id=$1 AND c.user_id=$2",[id,b]);
    assert.equal(hidden.rows.length,0);
    const denied=await db.query("DELETE FROM conversations WHERE id=$1 AND user_id=$2 RETURNING id",[id,b]);
    assert.equal(denied.rows.length,0);
    await db.exec("BEGIN");
    await db.query("INSERT INTO daily_usage(user_id,requests) VALUES($1,1)",[a]);
    await db.exec("ROLLBACK");
    assert.equal((await db.query("SELECT * FROM daily_usage")).rows.length,0);
    const quota=`INSERT INTO daily_usage(user_id,day,requests) VALUES($1,CURRENT_DATE,1)
      ON CONFLICT(user_id,day) DO UPDATE SET requests=daily_usage.requests+1
      WHERE daily_usage.requests < $2 RETURNING requests`;
    assert.equal((await db.query(quota,[a,1])).rows.length,1);
    assert.equal((await db.query(quota,[a,1])).rows.length,0);
    const lock=`UPDATE conversations SET busy_until=NOW()+INTERVAL '5 minutes'
      WHERE id=$1 AND user_id=$2 AND (busy_until IS NULL OR busy_until<NOW()) RETURNING busy_until::text`;
    const lease=await db.query<{busy_until:string}>(lock,[id,a]);
    assert.equal(lease.rows.length,1);
    assert.equal((await db.query(lock,[id,a])).rows.length,0);
    assert.equal((await db.query("DELETE FROM conversations WHERE id=$1 AND user_id=$2 AND (busy_until IS NULL OR busy_until<NOW()) RETURNING id",[id,a])).rows.length,0);
    assert.equal((await db.query("UPDATE conversations SET busy_until=NULL WHERE id=$1 AND user_id=$2 AND busy_until=$3 RETURNING id",[id,a,lease.rows[0].busy_until])).rows.length,1);
    await db.query("DELETE FROM conversations WHERE id=$1 AND user_id=$2",[id,a]);
    assert.equal((await db.query("SELECT * FROM messages")).rows.length,0);
  } finally {await db.close();}
});
