CREATE TABLE IF NOT EXISTS autonomy_policy(id INTEGER PRIMARY KEY CHECK(id=1),enabled BOOLEAN NOT NULL DEFAULT FALSE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO autonomy_policy(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS autonomy_cycles(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),github_run_id TEXT UNIQUE NOT NULL,jti_hash TEXT UNIQUE NOT NULL,
 billing_user_id UUID NOT NULL REFERENCES users(id),base_sha TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'generating' CHECK(status IN ('generating','ready','no_change','published','deployed','failed')),
 summary TEXT,proposal JSONB,commit_sha TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS autonomy_cycles_created ON autonomy_cycles(created_at);
