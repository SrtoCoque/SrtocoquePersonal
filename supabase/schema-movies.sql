-- =============================================================================
-- Películas — Schema completo + visionados (idempotente)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE movie_status AS ENUM ('wishlist', 'owned', 'watching', 'watched');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE movie_watch_location AS ENUM ('home', 'cinema');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  original_title TEXT,
  directors TEXT[] NOT NULL DEFAULT '{}',
  cover_url TEXT,
  genres TEXT[] NOT NULL DEFAULT '{}',
  providers TEXT[] NOT NULL DEFAULT '{}',
  released DATE,
  runtime INTEGER,
  vote_average NUMERIC,
  status movie_status NOT NULL DEFAULT 'wishlist',
  minutes_watched NUMERIC NOT NULL DEFAULT 0 CHECK (minutes_watched >= 0),
  finish_date DATE,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_movies ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE user_movies ADD COLUMN IF NOT EXISTS providers TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS user_movie_viewings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_movie_id UUID NOT NULL REFERENCES user_movies (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  viewed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  location movie_watch_location NOT NULL DEFAULT 'home',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_movies_user_id_idx ON user_movies (user_id);
CREATE INDEX IF NOT EXISTS user_movies_status_idx ON user_movies (user_id, status);
CREATE INDEX IF NOT EXISTS user_movies_finish_date_idx ON user_movies (user_id, finish_date);
CREATE INDEX IF NOT EXISTS user_movie_viewings_user_id_idx ON user_movie_viewings (user_id);
CREATE INDEX IF NOT EXISTS user_movie_viewings_movie_idx ON user_movie_viewings (user_movie_id);
CREATE INDEX IF NOT EXISTS user_movie_viewings_date_idx ON user_movie_viewings (user_id, viewed_at);

ALTER TABLE user_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_movie_viewings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_movies_select_own" ON user_movies;
DROP POLICY IF EXISTS "user_movies_insert_own" ON user_movies;
DROP POLICY IF EXISTS "user_movies_update_own" ON user_movies;
DROP POLICY IF EXISTS "user_movies_delete_own" ON user_movies;

CREATE POLICY "user_movies_select_own"
  ON user_movies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_movies_insert_own"
  ON user_movies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_movies_update_own"
  ON user_movies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_movies_delete_own"
  ON user_movies FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_movie_viewings_select_own" ON user_movie_viewings;
DROP POLICY IF EXISTS "user_movie_viewings_insert_own" ON user_movie_viewings;
DROP POLICY IF EXISTS "user_movie_viewings_update_own" ON user_movie_viewings;
DROP POLICY IF EXISTS "user_movie_viewings_delete_own" ON user_movie_viewings;

CREATE POLICY "user_movie_viewings_select_own"
  ON user_movie_viewings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_movie_viewings_insert_own"
  ON user_movie_viewings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_movie_viewings_update_own"
  ON user_movie_viewings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_movie_viewings_delete_own"
  ON user_movie_viewings FOR DELETE
  USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_movies', 'user_movie_viewings');
