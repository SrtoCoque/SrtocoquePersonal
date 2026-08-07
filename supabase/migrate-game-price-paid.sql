-- =============================================================================
-- Videojuegos — precio pagado (columna singular) — OBSOLETO
-- Usa supabase/migrate-game-prices-by-storefront.sql (precio por tienda)
-- =============================================================================

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS price_paid NUMERIC
  CHECK (price_paid IS NULL OR price_paid >= 0);

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_games'
  AND column_name = 'price_paid';
