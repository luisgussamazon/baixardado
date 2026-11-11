CREATE TABLE IF NOT EXISTS astro_tasks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 repository TEXT NOT NULL CHECK(repository='luisgussamazon/baixardado'),
 goal TEXT NOT NULL CHECK(length(goal) BETWEEN 1 AND 4000),
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN
 ('PENDING','ANALYZING','PLANNING','CODING','TESTING','VALIDATING','APPLYING','COMPLETED','FAILED','ROLLED_BACK','CANCELLED')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 lease_token UUID,
 lease_until TIMESTAMPTZ,
 cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK((lease_token IS NULL)=(lease_until IS NULL))
);
CREATE INDEX IF NOT EXISTS astro_tasks_owner ON astro_tasks(user_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS astro_tasks_workspace_lock ON astro_tasks(repository)
 WHERE lease_token IS NOT NULL;
CREATE TABLE IF NOT EXISTS astro_events (
 id BIGSERIAL PRIMARY KEY,
 task_id UUID NOT NULL REFERENCES astro_tasks(id) ON DELETE CASCADE,
 status TEXT NOT NULL,
 summary TEXT NOT NULL CHECK(length(summary) BETWEEN 1 AND 2000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS astro_events_task ON astro_events(task_id,id);
