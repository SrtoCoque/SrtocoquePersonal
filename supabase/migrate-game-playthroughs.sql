-- =============================================================================
-- Videojuegos — rejugando + historial de partidas
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

DO $$ BEGIN
  ALTER TYPE game_status ADD VALUE 'replaying';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE game_playthrough_kind AS ENUM ('completed', 'replay');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_game_playthroughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_game_id UUID NOT NULL REFERENCES user_games (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  kind game_playthrough_kind NOT NULL DEFAULT 'completed',
  start_date DATE,
  finish_date DATE,
  hours_played NUMERIC NOT NULL DEFAULT 0 CHECK (hours_played >= 0),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_game_playthroughs_user_id_idx
  ON user_game_playthroughs (user_id);
CREATE INDEX IF NOT EXISTS user_game_playthroughs_game_idx
  ON user_game_playthroughs (user_game_id);
CREATE INDEX IF NOT EXISTS user_game_playthroughs_date_idx
  ON user_game_playthroughs (user_id, finish_date);

ALTER TABLE user_game_playthroughs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_game_playthroughs_select_own" ON user_game_playthroughs;
DROP POLICY IF EXISTS "user_game_playthroughs_insert_own" ON user_game_playthroughs;
DROP POLICY IF EXISTS "user_game_playthroughs_update_own" ON user_game_playthroughs;
DROP POLICY IF EXISTS "user_game_playthroughs_delete_own" ON user_game_playthroughs;

CREATE POLICY "user_game_playthroughs_select_own"
  ON user_game_playthroughs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_game_playthroughs_insert_own"
  ON user_game_playthroughs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_game_playthroughs_update_own"
  ON user_game_playthroughs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_game_playthroughs_delete_own"
  ON user_game_playthroughs FOR DELETE
  USING (auth.uid() = user_id);

SELECT typname FROM pg_type WHERE typname IN ('game_status', 'game_playthrough_kind');
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_game_playthroughs';
