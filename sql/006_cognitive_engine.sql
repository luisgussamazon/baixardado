-- Incremental e não destrutiva. Memórias não são extraídas automaticamente do histórico.
CREATE TABLE IF NOT EXISTS cognitive_records (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('fact','preference','correction','feedback')),
 label TEXT NOT NULL CHECK(char_length(label) BETWEEN 1 AND 100),
 value TEXT NOT NULL CHECK(char_length(value) BETWEEN 1 AND 4000),
 question TEXT CHECK(question IS NULL OR char_length(question) BETWEEN 1 AND 500),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved')),
 approved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK((status='approved')=(approved_at IS NOT NULL)),
 CHECK(kind <> 'correction' OR question IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS cognitive_records_owner_idx ON cognitive_records(user_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS cognitive_dialogue_states (
 conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 state JSONB NOT NULL CHECK(jsonb_typeof(state)='object' AND octet_length(state::text)<=16000),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cognitive_states_owner_idx ON cognitive_dialogue_states(user_id);
