-- Productividad — etiquetas y sesiones de foco (bloques / horas)
-- Ejecutar en: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS user_productivity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0d9488',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS user_productivity_tags_user_idx
  ON user_productivity_tags (user_id);

ALTER TABLE user_productivity_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_productivity_tags_select_own" ON user_productivity_tags;
DROP POLICY IF EXISTS "user_productivity_tags_insert_own" ON user_productivity_tags;
DROP POLICY IF EXISTS "user_productivity_tags_update_own" ON user_productivity_tags;
DROP POLICY IF EXISTS "user_productivity_tags_delete_own" ON user_productivity_tags;

CREATE POLICY "user_productivity_tags_select_own"
  ON user_productivity_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_productivity_tags_insert_own"
  ON user_productivity_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_productivity_tags_update_own"
  ON user_productivity_tags FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_productivity_tags_delete_own"
  ON user_productivity_tags FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_productivity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES user_productivity_tags (id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  performed_on DATE NOT NULL DEFAULT (CURRENT_DATE),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('timer', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_productivity_sessions_user_idx
  ON user_productivity_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_productivity_sessions_day_idx
  ON user_productivity_sessions (user_id, performed_on);
CREATE INDEX IF NOT EXISTS user_productivity_sessions_tag_idx
  ON user_productivity_sessions (user_id, tag_id);

ALTER TABLE user_productivity_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_productivity_sessions_select_own" ON user_productivity_sessions;
DROP POLICY IF EXISTS "user_productivity_sessions_insert_own" ON user_productivity_sessions;
DROP POLICY IF EXISTS "user_productivity_sessions_update_own" ON user_productivity_sessions;
DROP POLICY IF EXISTS "user_productivity_sessions_delete_own" ON user_productivity_sessions;

CREATE POLICY "user_productivity_sessions_select_own"
  ON user_productivity_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_productivity_sessions_insert_own"
  ON user_productivity_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_productivity_sessions_update_own"
  ON user_productivity_sessions FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_productivity_sessions_delete_own"
  ON user_productivity_sessions FOR DELETE USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_productivity_tags', 'user_productivity_sessions');
