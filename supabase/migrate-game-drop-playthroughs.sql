-- =============================================================================
-- Videojuegos — quitar historial de partidas y estado replaying
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- 1) Rejugando → Jugando
UPDATE user_games
SET status = 'playing'
WHERE status = 'replaying';

-- 2) Volcar la última playthrough a la ficha si faltan datos
WITH latest AS (
  SELECT DISTINCT ON (user_game_id)
    user_game_id,
    start_date,
    finish_date,
    hours_played,
    rating,
    storefront
  FROM user_game_playthroughs
  ORDER BY user_game_id, created_at DESC
)
UPDATE user_games g
SET
  start_date = COALESCE(g.start_date, l.start_date),
  finish_date = COALESCE(g.finish_date, l.finish_date),
  hours_played = CASE
    WHEN COALESCE(g.hours_played, 0) > 0 THEN g.hours_played
    ELSE COALESCE(l.hours_played, g.hours_played)
  END,
  rating = COALESCE(g.rating, l.rating),
  play_storefront = COALESCE(g.play_storefront, l.storefront)
FROM latest l
WHERE g.id = l.user_game_id
  AND (
    g.finish_date IS NULL
    OR g.start_date IS NULL
    OR COALESCE(g.hours_played, 0) = 0
    OR g.rating IS NULL
  );

-- 3) Eliminar historial
DROP TABLE IF EXISTS user_game_playthroughs CASCADE;

-- El enum game_status puede seguir teniendo 'replaying'; la app ya no lo usa.

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_games'
ORDER BY ordinal_position;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_game_playthroughs';
