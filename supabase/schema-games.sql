-- =============================================================================
-- Videojuegos — Schema + RLS (idempotente)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE game_status AS ENUM ('wishlist', 'owned', 'playing', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  rawg_id INTEGER,
  title TEXT NOT NULL,
  developers TEXT[] NOT NULL DEFAULT '{}',
  cover_url TEXT,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  released DATE,
  metacritic INTEGER,
  status game_status NOT NULL DEFAULT 'wishlist',
  hours_played NUMERIC NOT NULL DEFAULT 0 CHECK (hours_played >= 0),
  playtime_estimate INTEGER,
  finish_date DATE,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_games_user_id_idx ON user_games (user_id);
CREATE INDEX IF NOT EXISTS user_games_status_idx ON user_games (user_id, status);
CREATE INDEX IF NOT EXISTS user_games_finish_date_idx ON user_games (user_id, finish_date);

ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_games_select_own" ON user_games;
DROP POLICY IF EXISTS "user_games_insert_own" ON user_games;
DROP POLICY IF EXISTS "user_games_update_own" ON user_games;
DROP POLICY IF EXISTS "user_games_delete_own" ON user_games;

CREATE POLICY "user_games_select_own"
  ON user_games FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_games_insert_own"
  ON user_games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_games_update_own"
  ON user_games FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_games_delete_own"
  ON user_games FOR DELETE
  USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_games';
