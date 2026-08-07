-- =============================================================================
-- Videojuegos — tienda / plataforma donde lo tienes (columna singular)
-- OBSOLETO: usa supabase/migrate-game-storefronts-multi.sql
-- (permite una o varias tiendas: Steam, PlayStation, Xbox…)
-- =============================================================================

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

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS storefront game_storefront;

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_games'
  AND column_name = 'storefront';
