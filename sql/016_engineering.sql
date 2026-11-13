-- Fila privada e aditiva. Nenhum dado existente e apagado.
CREATE TABLE IF NOT EXISTS engineering_tasks (
 id UUID PRIMARY KEY REFERENCES astro_tasks(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 repository TEXT NOT NULL DEFAULT 'luisgussamazon/baixardado' CHECK(repository='luisgussamazon/baixardado'),
 goal TEXT NOT NULL CHECK(length(goal) BETWEEN 1 AND 1000),
 mode TEXT NOT NULL CHECK(mode IN ('observe','develop','integration','validate')),
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','paused','cancelled','review','completed','failed')),
 stage TEXT NOT NULL DEFAULT 'evolution',
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),
 run_id TEXT, base_sha TEXT, proposal JSONB, result JSONB,
 pr_number INTEGER, experimental_sha TEXT,
 lease_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS engineering_tasks_owner ON engineering_tasks(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS engineering_tasks_queue ON engineering_tasks(status,created_at);
CREATE TABLE IF NOT EXISTS engineering_events (
 id BIGSERIAL PRIMARY KEY, task_id UUID NOT NULL REFERENCES engineering_tasks(id) ON DELETE CASCADE,
 agent TEXT NOT NULL CHECK(agent IN ('architect','coder','tester','security','optimizer','evolution')),
 state TEXT NOT NULL CHECK(state IN ('running','passed','failed','waiting','skipped')),
 message TEXT NOT NULL CHECK(length(message)<=1000), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS engineering_events_task ON engineering_events(task_id,id);
-- A nova especificacao exige aprovacao independente para producao.
UPDATE autonomy_policy SET enabled=FALSE,updated_at=NOW() WHERE id=1;
-- Astro permanece a identidade da tarefa; engineering armazena sua execucao detalhada.
CREATE OR REPLACE FUNCTION sync_engineering_astro() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE astro_tasks SET status=CASE NEW.status
  WHEN 'queued' THEN 'PENDING' WHEN 'paused' THEN 'PENDING' WHEN 'cancelled' THEN 'CANCELLED'
  WHEN 'review' THEN 'VALIDATING' WHEN 'completed' THEN 'COMPLETED' WHEN 'failed' THEN 'FAILED'
  ELSE CASE NEW.stage WHEN 'coder' THEN 'CODING' WHEN 'tester' THEN 'TESTING' WHEN 'security' THEN 'VALIDATING' ELSE 'PLANNING' END END,
  cancel_requested=astro_tasks.cancel_requested OR NEW.status='cancelled',updated_at=NOW() WHERE id=NEW.id AND user_id=NEW.user_id;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS engineering_astro_sync ON engineering_tasks;
CREATE TRIGGER engineering_astro_sync AFTER INSERT OR UPDATE ON engineering_tasks FOR EACH ROW EXECUTE FUNCTION sync_engineering_astro();
