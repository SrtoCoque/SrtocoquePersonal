-- =============================================================================
-- Videojuegos — steam_app_id + tienda de la partida
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS steam_app_id INTEGER;

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS play_storefront game_storefront;

CREATE INDEX IF NOT EXISTS user_games_steam_app_id_idx
  ON user_games (user_id, steam_app_id)
  WHERE steam_app_id IS NOT NULL;

ALTER TABLE user_game_playthroughs
  ADD COLUMN IF NOT EXISTS storefront game_storefront;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('user_games', 'user_game_playthroughs')
  AND column_name IN ('steam_app_id', 'play_storefront', 'storefront');
