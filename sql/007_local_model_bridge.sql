-- Ponte iniciada pelo computador do usuário, sem expor a API do modelo à internet.
CREATE TABLE IF NOT EXISTS local_model_pairings (
 token_hash TEXT PRIMARY KEY,
 user_code TEXT UNIQUE NOT NULL,
 model TEXT NOT NULL CHECK(model='qwen3:4b-instruct'),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved')),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '10 minutes'
);
CREATE TABLE IF NOT EXISTS local_model_devices (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash TEXT UNIQUE NOT NULL,
 model TEXT NOT NULL CHECK(model='qwen3:4b-instruct'),
 last_seen TIMESTAMPTZ,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '30 days',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS local_model_devices_owner ON local_model_devices(user_id,last_seen DESC);
CREATE TABLE IF NOT EXISTS local_model_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 device_id UUID NOT NULL REFERENCES local_model_devices(id) ON DELETE CASCADE,
 payload JSONB NOT NULL CHECK(octet_length(payload::text)<=40000),
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')),
 result TEXT CHECK(result IS NULL OR char_length(result)<=12000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '2 minutes'
);
CREATE INDEX IF NOT EXISTS local_model_jobs_owner ON local_model_jobs(user_id,expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS local_model_one_running ON local_model_jobs(device_id) WHERE status='running';
