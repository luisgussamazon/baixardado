CREATE TABLE IF NOT EXISTS source_proposals (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 goal TEXT NOT NULL CHECK(length(goal) BETWEEN 1 AND 1000),
 status TEXT NOT NULL DEFAULT 'generating' CHECK(status IN ('generating','ready','failed')),
 proposal JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS source_proposals_owner ON source_proposals(user_id,created_at);
