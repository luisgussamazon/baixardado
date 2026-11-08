-- Estudos públicos solicitados pelo operador. Nenhum histórico ou dado pessoal é usado nas consultas.
CREATE TABLE IF NOT EXISTS autonomous_study_state (
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),
 next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 busy_until TIMESTAMPTZ,
 last_run_at TIMESTAMPTZ
);
INSERT INTO autonomous_study_state(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS autonomous_study_notes (
 topic TEXT PRIMARY KEY CHECK(topic IN ('programacao','logistica','estoque')),
 title TEXT NOT NULL,
 sources JSONB NOT NULL CHECK(jsonb_typeof(sources)='array' AND octet_length(sources::text)<=12000),
 collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS autonomous_study_runs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 finished_at TIMESTAMPTZ,
 topics INTEGER NOT NULL DEFAULT 0,
 sources INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','partial','failed'))
);
