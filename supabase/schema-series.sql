-- =============================================================================
-- Series — Schema + episodios vistos (idempotente)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE series_status AS ENUM ('wishlist', 'watching', 'watched');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  original_title TEXT,
  cover_url TEXT,
  genres TEXT[] NOT NULL DEFAULT '{}',
  providers TEXT[] NOT NULL DEFAULT '{}',
  first_air_date DATE,
  vote_average NUMERIC,
  episode_run_time INTEGER,
  number_of_seasons INTEGER,
  season_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  status series_status NOT NULL DEFAULT 'wishlist',
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_series_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_series_id UUID NOT NULL REFERENCES user_series (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL CHECK (season_number >= 0),
  episode_number INTEGER NOT NULL CHECK (episode_number >= 1),
  name TEXT,
  viewed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  runtime INTEGER CHECK (runtime IS NULL OR runtime >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_series_id, season_number, episode_number)
);

CREATE INDEX IF NOT EXISTS user_series_user_id_idx ON user_series (user_id);
CREATE INDEX IF NOT EXISTS user_series_status_idx ON user_series (user_id, status);
CREATE INDEX IF NOT EXISTS user_series_episodes_user_id_idx ON user_series_episodes (user_id);
CREATE INDEX IF NOT EXISTS user_series_episodes_series_idx ON user_series_episodes (user_series_id);
CREATE INDEX IF NOT EXISTS user_series_episodes_created_idx
  ON user_series_episodes (user_id, created_at);
CREATE INDEX IF NOT EXISTS user_series_episodes_viewed_idx
  ON user_series_episodes (user_id, viewed_at);

ALTER TABLE user_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_series_episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_series_select_own" ON user_series;
DROP POLICY IF EXISTS "user_series_insert_own" ON user_series;
DROP POLICY IF EXISTS "user_series_update_own" ON user_series;
DROP POLICY IF EXISTS "user_series_delete_own" ON user_series;

CREATE POLICY "user_series_select_own"
  ON user_series FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_series_insert_own"
  ON user_series FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_series_update_own"
  ON user_series FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_series_delete_own"
  ON user_series FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_series_episodes_select_own" ON user_series_episodes;
DROP POLICY IF EXISTS "user_series_episodes_insert_own" ON user_series_episodes;
DROP POLICY IF EXISTS "user_series_episodes_update_own" ON user_series_episodes;
DROP POLICY IF EXISTS "user_series_episodes_delete_own" ON user_series_episodes;

CREATE POLICY "user_series_episodes_select_own"
  ON user_series_episodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_series_episodes_insert_own"
  ON user_series_episodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_series_episodes_update_own"
  ON user_series_episodes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_series_episodes_delete_own"
  ON user_series_episodes FOR DELETE
  USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_series', 'user_series_episodes');
