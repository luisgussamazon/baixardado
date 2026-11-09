-- Navegador assistido: credenciais de pareamento só como hash; observações privadas e temporárias.
CREATE TABLE IF NOT EXISTS browser_pairings (
 token_hash TEXT PRIMARY KEY, user_code TEXT UNIQUE NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '10 minutes'
);
CREATE TABLE IF NOT EXISTS browser_devices (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '12 hours', last_seen TIMESTAMPTZ,
 observation JSONB, observed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS browser_devices_owner ON browser_devices(user_id);
CREATE TABLE IF NOT EXISTS browser_commands (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),device_id UUID NOT NULL REFERENCES browser_devices(id) ON DELETE CASCADE,
 url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','claimed','done','failed')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '2 minutes'
);
CREATE INDEX IF NOT EXISTS browser_commands_device ON browser_commands(device_id,created_at);
