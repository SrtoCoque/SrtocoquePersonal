-- =============================================================================
-- Cómics — Schema + números leídos (idempotente)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE comic_status AS ENUM ('wishlist', 'reading', 'read');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_comics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  comicvine_id INTEGER,
  title TEXT NOT NULL,
  publisher TEXT,
  cover_url TEXT,
  start_year INTEGER,
  issue_count INTEGER,
  description TEXT,
  status comic_status NOT NULL DEFAULT 'wishlist',
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_comic_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_comic_id UUID NOT NULL REFERENCES user_comics (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  comicvine_issue_id INTEGER NOT NULL,
  issue_number TEXT,
  name TEXT,
  cover_url TEXT,
  read_at DATE NOT NULL DEFAULT CURRENT_DATE,
  price NUMERIC CHECK (price IS NULL OR price >= 0),
  purchased_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_comic_id, comicvine_issue_id)
);

CREATE INDEX IF NOT EXISTS user_comics_user_id_idx ON user_comics (user_id);
CREATE INDEX IF NOT EXISTS user_comics_status_idx ON user_comics (user_id, status);
CREATE INDEX IF NOT EXISTS user_comic_issues_user_id_idx
  ON user_comic_issues (user_id);
CREATE INDEX IF NOT EXISTS user_comic_issues_comic_idx
  ON user_comic_issues (user_comic_id);
CREATE INDEX IF NOT EXISTS user_comic_issues_read_idx
  ON user_comic_issues (user_id, read_at);
CREATE INDEX IF NOT EXISTS user_comic_issues_purchased_idx
  ON user_comic_issues (user_id, purchased_at);

ALTER TABLE user_comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_comic_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_comics_select_own" ON user_comics;
DROP POLICY IF EXISTS "user_comics_insert_own" ON user_comics;
DROP POLICY IF EXISTS "user_comics_update_own" ON user_comics;
DROP POLICY IF EXISTS "user_comics_delete_own" ON user_comics;

CREATE POLICY "user_comics_select_own"
  ON user_comics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_comics_insert_own"
  ON user_comics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_comics_update_own"
  ON user_comics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_comics_delete_own"
  ON user_comics FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_comic_issues_select_own" ON user_comic_issues;
DROP POLICY IF EXISTS "user_comic_issues_insert_own" ON user_comic_issues;
DROP POLICY IF EXISTS "user_comic_issues_update_own" ON user_comic_issues;
DROP POLICY IF EXISTS "user_comic_issues_delete_own" ON user_comic_issues;

CREATE POLICY "user_comic_issues_select_own"
  ON user_comic_issues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_comic_issues_insert_own"
  ON user_comic_issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_comic_issues_update_own"
  ON user_comic_issues FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_comic_issues_delete_own"
  ON user_comic_issues FOR DELETE
  USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_comics', 'user_comic_issues');
