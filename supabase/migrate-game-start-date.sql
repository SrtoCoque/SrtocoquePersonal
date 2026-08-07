-- =============================================================================
-- Videojuegos — fecha de inicio (jugando / completado)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS start_date DATE;

CREATE INDEX IF NOT EXISTS user_games_start_date_idx
  ON user_games (user_id, start_date);

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_games'
  AND column_name = 'start_date';
