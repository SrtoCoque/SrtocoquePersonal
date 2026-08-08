-- =============================================================================
-- Videojuegos — horas atribuidas a Steam (sesión Steam aparte)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS steam_hours_played NUMERIC NOT NULL DEFAULT 0;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_games'
  AND column_name = 'steam_hours_played';
