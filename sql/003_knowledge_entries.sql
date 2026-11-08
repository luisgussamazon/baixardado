-- Aditiva: não modifica usuários, conversas, projetos ou mensagens existentes.
CREATE OR REPLACE FUNCTION knowledge_normalize(value TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT translate(lower(value), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
$$;

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY CHECK (char_length(id) BETWEEN 3 AND 100),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 80),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 4000),
  keywords TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(keywords) <= 30),
  source_url TEXT CHECK (source_url IS NULL OR char_length(source_url) <= 2000),
  content_origin TEXT NOT NULL DEFAULT 'original' CHECK (content_origin IN ('original','user_owned','licensed')),
  language TEXT NOT NULL DEFAULT 'pt-BR' CHECK (language='pt-BR'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  search_vector TSVECTOR NOT NULL DEFAULT ''::tsvector,
  focus_vector TSVECTOR NOT NULL DEFAULT ''::tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((owner_user_id IS NULL AND id LIKE 'a3x:%' AND content_origin='original') OR
         (owner_user_id IS NOT NULL AND id LIKE 'user:%'))
);

CREATE OR REPLACE FUNCTION knowledge_refresh_vectors() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.focus_vector :=
    setweight(to_tsvector('portuguese',knowledge_normalize(NEW.title || ' ' || NEW.question)), 'A') ||
    setweight(to_tsvector('simple',knowledge_normalize(array_to_string(NEW.keywords,' '))), 'A');
  NEW.search_vector := NEW.focus_vector ||
    setweight(to_tsvector('portuguese',knowledge_normalize(NEW.answer)), 'D');
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS knowledge_entries_vectors ON knowledge_entries;
CREATE TRIGGER knowledge_entries_vectors BEFORE INSERT OR UPDATE ON knowledge_entries
FOR EACH ROW EXECUTE FUNCTION knowledge_refresh_vectors();
CREATE INDEX IF NOT EXISTS knowledge_entries_fts_idx ON knowledge_entries USING GIN(search_vector) WHERE is_active;
CREATE INDEX IF NOT EXISTS knowledge_entries_owner_idx ON knowledge_entries(owner_user_id) WHERE is_active;
