-- =============================================================================
-- Perfil — vínculo Steam
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS steam_id TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS steam_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_steam_id_uidx
  ON profiles (steam_id)
  WHERE steam_id IS NOT NULL;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('steam_id', 'steam_synced_at');
