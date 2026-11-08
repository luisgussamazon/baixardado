-- Incremental: preserva usuários, sessões, conversas, mensagens e cotas existentes.
CREATE TABLE IF NOT EXISTS programmer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 4000),
  name TEXT NOT NULL DEFAULT 'Novo projeto' CHECK (char_length(name) BETWEEN 1 AND 80),
  summary TEXT NOT NULL DEFAULT '' CHECK (char_length(summary) <= 2000),
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating','ready','failed')),
  files JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(files) = 'array' AND jsonb_array_length(files) <= 20),
  generation_expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS programmer_projects_owner_idx ON programmer_projects(user_id, created_at DESC);
