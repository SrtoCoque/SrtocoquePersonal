-- =============================================================================
-- Videojuegos — historial de incrementos de horas por día
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_game_hour_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  user_game_id UUID NOT NULL REFERENCES user_games (id) ON DELETE CASCADE,
  played_on DATE NOT NULL DEFAULT (CURRENT_DATE),
  hours_delta NUMERIC NOT NULL CHECK (hours_delta > 0),
  source TEXT NOT NULL CHECK (source IN ('steam_sync', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_game_hour_logs_user_played_idx
  ON user_game_hour_logs (user_id, played_on);
CREATE INDEX IF NOT EXISTS user_game_hour_logs_game_played_idx
  ON user_game_hour_logs (user_game_id, played_on);

ALTER TABLE user_game_hour_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_game_hour_logs_select_own" ON user_game_hour_logs;
DROP POLICY IF EXISTS "user_game_hour_logs_insert_own" ON user_game_hour_logs;
DROP POLICY IF EXISTS "user_game_hour_logs_update_own" ON user_game_hour_logs;
DROP POLICY IF EXISTS "user_game_hour_logs_delete_own" ON user_game_hour_logs;

CREATE POLICY "user_game_hour_logs_select_own"
  ON user_game_hour_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_game_hour_logs_insert_own"
  ON user_game_hour_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_game_hour_logs_update_own"
  ON user_game_hour_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_game_hour_logs_delete_own"
  ON user_game_hour_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Backfill único: solo si la tabla está vacía (re-ejecutar no duplica)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM user_game_hour_logs LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO user_game_hour_logs (user_id, user_game_id, played_on, hours_delta, source)
  SELECT
    p.user_id,
    p.user_game_id,
    COALESCE(p.finish_date, p.start_date, p.created_at::date),
    p.hours_played,
    'manual'
  FROM user_game_playthroughs p
  WHERE p.hours_played > 0;

  INSERT INTO user_game_hour_logs (user_id, user_game_id, played_on, hours_delta, source)
  SELECT
    g.user_id,
    g.id,
    COALESCE(g.start_date, g.finish_date, g.created_at::date),
    CASE
      WHEN g.status = 'owned' THEN GREATEST(g.hours_played, COALESCE(g.steam_hours_played, 0))
      WHEN g.play_storefront = 'steam'
        OR (
          cardinality(g.storefronts) = 1
          AND g.storefronts[1] = 'steam'
        )
        THEN GREATEST(g.hours_played, COALESCE(g.steam_hours_played, 0))
      ELSE g.hours_played + COALESCE(g.steam_hours_played, 0)
    END,
    'manual'
  FROM user_games g
  WHERE g.status IN ('owned', 'playing', 'replaying', 'dropped')
    AND CASE
      WHEN g.status = 'owned' THEN GREATEST(g.hours_played, COALESCE(g.steam_hours_played, 0))
      WHEN g.play_storefront = 'steam'
        OR (
          cardinality(g.storefronts) = 1
          AND g.storefronts[1] = 'steam'
        )
        THEN GREATEST(g.hours_played, COALESCE(g.steam_hours_played, 0))
      ELSE g.hours_played + COALESCE(g.steam_hours_played, 0)
    END > 0;

  INSERT INTO user_game_hour_logs (user_id, user_game_id, played_on, hours_delta, source)
  SELECT
    g.user_id,
    g.id,
    COALESCE(g.finish_date, g.start_date, g.created_at::date),
    CASE
      WHEN g.play_storefront = 'steam'
        OR (
          cardinality(g.storefronts) = 1
          AND g.storefronts[1] = 'steam'
        )
        THEN GREATEST(g.hours_played, COALESCE(g.steam_hours_played, 0))
      ELSE g.hours_played + COALESCE(g.steam_hours_played, 0)
    END,
    'manual'
  FROM user_games g
  WHERE g.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM user_game_playthroughs p WHERE p.user_game_id = g.id
    )
    AND CASE
      WHEN g.play_storefront = 'steam'
        OR (
          cardinality(g.storefronts) = 1
          AND g.storefronts[1] = 'steam'
        )
        THEN GREATEST(g.hours_played, COALESCE(g.steam_hours_played, 0))
      ELSE g.hours_played + COALESCE(g.steam_hours_played, 0)
    END > 0;
END $$;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_game_hour_logs';
