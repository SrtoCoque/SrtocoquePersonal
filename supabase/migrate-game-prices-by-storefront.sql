-- =============================================================================
-- Videojuegos — precio por tienda (prices jsonb)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS prices JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Migrar price_paid singular → primera tienda del array (si había precio)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_games'
      AND column_name = 'price_paid'
  ) THEN
    EXECUTE $sql$
      UPDATE user_games
      SET prices = jsonb_build_object(storefronts[1]::text, price_paid)
      WHERE price_paid IS NOT NULL
        AND cardinality(storefronts) >= 1
        AND (prices = '{}'::jsonb OR prices IS NULL)
    $sql$;

    EXECUTE 'ALTER TABLE user_games DROP COLUMN IF EXISTS price_paid';
  END IF;
END $$;

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_games'
  AND column_name IN ('prices', 'price_paid');
