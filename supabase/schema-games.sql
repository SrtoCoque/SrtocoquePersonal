-- =============================================================================
-- Videojuegos — Schema + RLS (idempotente)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE game_status AS ENUM (
    'wishlist',
    'owned',
    'playing',
    'replaying',
    'completed',
    'dropped'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE game_status ADD VALUE 'replaying';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE game_status ADD VALUE 'dropped';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE game_playthrough_kind AS ENUM ('completed', 'replay');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE game_storefront AS ENUM (
    'steam',
    'playstation',
    'xbox',
    'nintendo',
    'gog',
    'epic',
    'downloaded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Valores añadidos después del enum inicial
DO $$ BEGIN
  ALTER TYPE game_storefront ADD VALUE 'downloaded';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE game_storefront ADD VALUE 'nintendo';
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
  storefronts game_storefront[] NOT NULL DEFAULT '{}',
  released DATE,
  metacritic INTEGER,
  status game_status NOT NULL DEFAULT 'wishlist',
  hours_played NUMERIC NOT NULL DEFAULT 0 CHECK (hours_played >= 0),
  prices JSONB NOT NULL DEFAULT '{}'::jsonb,
  playtime_estimate INTEGER,
  start_date DATE,
  finish_date DATE,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  steam_app_id INTEGER,
  play_storefront game_storefront,
  steam_hours_played NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_games_user_id_idx ON user_games (user_id);
CREATE INDEX IF NOT EXISTS user_games_status_idx ON user_games (user_id, status);
CREATE INDEX IF NOT EXISTS user_games_finish_date_idx ON user_games (user_id, finish_date);
CREATE INDEX IF NOT EXISTS user_games_start_date_idx ON user_games (user_id, start_date);

ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS storefronts game_storefront[] NOT NULL DEFAULT '{}';

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS prices JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS steam_app_id INTEGER;

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS play_storefront game_storefront;

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS steam_hours_played NUMERIC NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS user_games_steam_app_id_idx
  ON user_games (user_id, steam_app_id)
  WHERE steam_app_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_games_set_updated_at ON user_games;
CREATE TRIGGER user_games_set_updated_at
  BEFORE UPDATE ON user_games
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Compat: si quedó la columna singular de una migración anterior
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_games'
      AND column_name = 'storefront'
  ) THEN
    EXECUTE $sql$
      UPDATE user_games
      SET storefronts = ARRAY[storefront]
      WHERE storefront IS NOT NULL
        AND cardinality(storefronts) = 0
    $sql$;
    EXECUTE 'ALTER TABLE user_games DROP COLUMN IF EXISTS storefront';
  END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS user_game_playthroughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_game_id UUID NOT NULL REFERENCES user_games (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  kind game_playthrough_kind NOT NULL DEFAULT 'completed',
  storefront game_storefront,
  start_date DATE,
  finish_date DATE,
  hours_played NUMERIC NOT NULL DEFAULT 0 CHECK (hours_played >= 0),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_game_playthroughs
  ADD COLUMN IF NOT EXISTS storefront game_storefront;

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

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_games', 'user_game_playthroughs');
