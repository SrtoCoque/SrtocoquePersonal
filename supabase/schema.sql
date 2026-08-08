-- =============================================================================
-- Estantería — Schema + RLS (idempotente: se puede re-ejecutar)
-- Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- 1. Enum de estado de lectura
DO $$ BEGIN
  CREATE TYPE book_status AS ENUM ('wishlist', 'owned', 'reading', 'read');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Si el enum ya existía sin 'owned', añádelo (seguro re-ejecutar)
DO $$ BEGIN
  ALTER TYPE book_status ADD VALUE IF NOT EXISTS 'owned';
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 2. Perfiles (vinculados a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT,
  steam_id TEXT,
  steam_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS steam_id TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS steam_synced_at TIMESTAMPTZ;

-- 3. Biblioteca personal
CREATE TABLE IF NOT EXISTS user_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  google_books_id TEXT,
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  cover_url TEXT,
  status book_status NOT NULL DEFAULT 'wishlist',
  total_pages INTEGER,
  pages_read INTEGER NOT NULL DEFAULT 0,
  read_finish_date DATE,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pages_read_valid CHECK (
    pages_read >= 0
    AND (total_pages IS NULL OR pages_read <= total_pages)
  )
);

CREATE INDEX IF NOT EXISTS user_books_user_id_idx ON user_books (user_id);
CREATE INDEX IF NOT EXISTS user_books_status_idx ON user_books (user_id, status);
CREATE INDEX IF NOT EXISTS user_books_finish_date_idx ON user_books (user_id, read_finish_date);

-- 4. Trigger: crear profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill: perfiles para usuarios que ya existían antes del trigger
INSERT INTO public.profiles (id, email)
SELECT id, email
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "user_books_select_own" ON user_books;
DROP POLICY IF EXISTS "user_books_insert_own" ON user_books;
DROP POLICY IF EXISTS "user_books_update_own" ON user_books;
DROP POLICY IF EXISTS "user_books_delete_own" ON user_books;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_books_select_own"
  ON user_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_books_insert_own"
  ON user_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_books_update_own"
  ON user_books FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_books_delete_own"
  ON user_books FOR DELETE
  USING (auth.uid() = user_id);

-- Verificación rápida (debe devolver profiles / user_books)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'user_books');
