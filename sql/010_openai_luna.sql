-- Aditiva. Nenhuma conta existente opta por nuvem automaticamente.
CREATE TABLE IF NOT EXISTS ai_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL DEFAULT 'local' CHECK(provider IN ('local','openai')),
 cloud_consent_version INTEGER NOT NULL DEFAULT 0,
 cloud_consented_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(provider='local' OR (cloud_consent_version=1 AND cloud_consented_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS ai_api_usage (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reserved_microusd INTEGER NOT NULL CHECK(reserved_microusd>0 AND reserved_microusd<=1000000),
 charged_microusd INTEGER CHECK(charged_microusd>=0),
 status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','succeeded','rejected','unknown')),
 input_tokens INTEGER,
 output_tokens INTEGER,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ai_api_usage_month ON ai_api_usage(created_at);
CREATE INDEX IF NOT EXISTS ai_api_usage_owner ON ai_api_usage(user_id,created_at);
