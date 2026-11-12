-- Vincula tarefas Astro ao ciclo da Autonomia A3X que as executa. Incremental e compatível com dados existentes.
ALTER TABLE astro_tasks ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES autonomy_cycles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS astro_tasks_cycle ON astro_tasks(cycle_id) WHERE cycle_id IS NOT NULL;
