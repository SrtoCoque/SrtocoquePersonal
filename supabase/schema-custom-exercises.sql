-- =============================================================================
-- Ejercicios personalizados permanentes por grupo muscular
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_custom_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  exercise_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category, exercise_slug)
);

CREATE INDEX IF NOT EXISTS user_custom_exercises_user_cat_idx
  ON user_custom_exercises (user_id, category);

ALTER TABLE user_custom_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_custom_exercises_select_own" ON user_custom_exercises;
DROP POLICY IF EXISTS "user_custom_exercises_insert_own" ON user_custom_exercises;
DROP POLICY IF EXISTS "user_custom_exercises_update_own" ON user_custom_exercises;
DROP POLICY IF EXISTS "user_custom_exercises_delete_own" ON user_custom_exercises;

CREATE POLICY "user_custom_exercises_select_own"
  ON user_custom_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_custom_exercises_insert_own"
  ON user_custom_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_custom_exercises_update_own"
  ON user_custom_exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_custom_exercises_delete_own"
  ON user_custom_exercises FOR DELETE
  USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_custom_exercises';
