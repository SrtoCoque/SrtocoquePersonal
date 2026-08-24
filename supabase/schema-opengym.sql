-- =============================================================================
-- Deporte 2 (openGym embed) — estado JSON por usuario
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_opengym_state (
  user_id UUID PRIMARY KEY REFERENCES profiles (id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_opengym_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_opengym_state_select_own" ON user_opengym_state;
DROP POLICY IF EXISTS "user_opengym_state_insert_own" ON user_opengym_state;
DROP POLICY IF EXISTS "user_opengym_state_update_own" ON user_opengym_state;
DROP POLICY IF EXISTS "user_opengym_state_delete_own" ON user_opengym_state;

CREATE POLICY "user_opengym_state_select_own"
  ON user_opengym_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_opengym_state_insert_own"
  ON user_opengym_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_opengym_state_update_own"
  ON user_opengym_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_opengym_state_delete_own"
  ON user_opengym_state FOR DELETE
  USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_opengym_state';
