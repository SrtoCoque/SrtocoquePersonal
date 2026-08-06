-- =============================================================================
-- Migración: score 0–100 + visionados (casa/cine)
-- Ejecutar si ya corriste el schema-movies anterior
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE movie_watch_location AS ENUM ('home', 'cinema');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE user_movies
  ADD COLUMN IF NOT EXISTS score INTEGER;

DO $$ BEGIN
  ALTER TABLE user_movies
    ADD CONSTRAINT user_movies_score_check
    CHECK (score IS NULL OR (score >= 0 AND score <= 100));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_movie_viewings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_movie_id UUID NOT NULL REFERENCES user_movies (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  viewed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  location movie_watch_location NOT NULL DEFAULT 'home',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_movie_viewings_user_id_idx ON user_movie_viewings (user_id);
CREATE INDEX IF NOT EXISTS user_movie_viewings_movie_idx ON user_movie_viewings (user_movie_id);
CREATE INDEX IF NOT EXISTS user_movie_viewings_date_idx ON user_movie_viewings (user_id, viewed_at);

ALTER TABLE user_movie_viewings ENABLE ROW LEVEL SECURITY;

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

-- Backfill: una vista por película ya marcada como watched
INSERT INTO user_movie_viewings (user_movie_id, user_id, viewed_at, location)
SELECT m.id, m.user_id, COALESCE(m.finish_date, CURRENT_DATE), 'home'
FROM user_movies m
WHERE m.status = 'watched'
  AND NOT EXISTS (
    SELECT 1 FROM user_movie_viewings v WHERE v.user_movie_id = m.id
  );
