-- Aditiva: preferencias explicitas e evidencias privadas dos agentes DOT.
CREATE TABLE IF NOT EXISTS dot_settings (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 luna_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 consent_at TIMESTAMPTZ,
 quiet BOOLEAN NOT NULL DEFAULT FALSE,
 animations BOOLEAN NOT NULL DEFAULT TRUE,
 main_agent TEXT NOT NULL DEFAULT 'pipo' CHECK(main_agent IN ('pipo','nino','bubu','mimo')),
 theme TEXT NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark','light')),
 suggestion_minutes INTEGER NOT NULL DEFAULT 60 CHECK(suggestion_minutes BETWEEN 15 AND 1440),
 last_scan_at TIMESTAMPTZ,
 last_paid_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(NOT luna_enabled OR consent_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS dot_findings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 task_id UUID REFERENCES engineering_tasks(id) ON DELETE CASCADE,
 fingerprint TEXT NOT NULL CHECK(length(fingerprint)<=200),
 kind TEXT NOT NULL CHECK(kind IN ('failure','queued','review','completed','memory')),
 code TEXT NOT NULL CHECK(length(code)<=80),
 message TEXT NOT NULL CHECK(length(message)<=500),
 dismissed BOOLEAN NOT NULL DEFAULT FALSE,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(user_id,fingerprint)
);
CREATE INDEX IF NOT EXISTS dot_findings_owner ON dot_findings(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS dot_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 source_task_id UUID NOT NULL UNIQUE REFERENCES engineering_tasks(id) ON DELETE CASCADE,
 engineering_task_id UUID UNIQUE REFERENCES engineering_tasks(id) ON DELETE SET NULL,
 calls INTEGER NOT NULL DEFAULT 0 CHECK(calls BETWEEN 0 AND 5),
 allocated_micros INTEGER NOT NULL DEFAULT 0 CHECK(allocated_micros BETWEEN 0 AND 30000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dot_jobs_owner ON dot_jobs(user_id,created_at DESC);
