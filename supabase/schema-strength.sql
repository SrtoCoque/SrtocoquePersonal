-- =============================================================================
-- Deporte — sesiones de fuerza (pecho, espalda, …)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_strength_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  exercise_slug TEXT NOT NULL,
  -- Nombre visible; útil sobre todo para ejercicios libres (slug empieza por libre-)
  exercise_title TEXT,
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  -- [{ "weight_kg": 20, "reps": 10 }, ...] — weight_kg y reps opcionales
  sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_strength_sessions_user_id_idx
  ON user_strength_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_strength_sessions_exercise_idx
  ON user_strength_sessions (user_id, category, exercise_slug);
CREATE INDEX IF NOT EXISTS user_strength_sessions_date_idx
  ON user_strength_sessions (user_id, performed_at DESC);

ALTER TABLE user_strength_sessions
  ADD COLUMN IF NOT EXISTS exercise_title TEXT;

ALTER TABLE user_strength_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_strength_sessions_select_own" ON user_strength_sessions;
DROP POLICY IF EXISTS "user_strength_sessions_insert_own" ON user_strength_sessions;
DROP POLICY IF EXISTS "user_strength_sessions_update_own" ON user_strength_sessions;
DROP POLICY IF EXISTS "user_strength_sessions_delete_own" ON user_strength_sessions;

CREATE POLICY "user_strength_sessions_select_own"
  ON user_strength_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_strength_sessions_insert_own"
  ON user_strength_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_strength_sessions_update_own"
  ON user_strength_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_strength_sessions_delete_own"
  ON user_strength_sessions FOR DELETE
  USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_strength_sessions';
