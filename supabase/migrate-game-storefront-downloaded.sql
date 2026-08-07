-- =============================================================================
-- Videojuegos — tienda «Descargado» (pirata)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- (Tras migrate-game-storefronts-multi.sql si aún no lo has corrido)
-- =============================================================================

DO $$ BEGIN
  ALTER TYPE game_storefront ADD VALUE 'downloaded';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'game_storefront'
ORDER BY enumsortorder;
