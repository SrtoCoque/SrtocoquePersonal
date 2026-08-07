-- =============================================================================
-- Videojuegos — varias tiendas por juego (storefronts[])
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- (Si ya corriste migrate-game-storefront.sql, este migra los datos y quita
--  la columna singular storefront.)
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
  ADD COLUMN IF NOT EXISTS storefronts game_storefront[] NOT NULL DEFAULT '{}';

-- Copiar valor único → array (si existe la columna antigua)
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
  END IF;
END $$;

ALTER TABLE user_games
  DROP COLUMN IF EXISTS storefront;

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_games'
  AND column_name IN ('storefront', 'storefronts');
