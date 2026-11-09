-- Somente computadores explicitamente lembrados deixam de expirar por tempo.
-- Revogação continua excluindo o dispositivo e seus trabalhos.
ALTER TABLE local_model_devices ADD COLUMN IF NOT EXISTS remembered BOOLEAN NOT NULL DEFAULT false;
