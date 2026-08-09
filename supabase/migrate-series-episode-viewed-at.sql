-- =============================================================================
-- Series — fecha de visionado por episodio (para estadísticas)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

ALTER TABLE user_series_episodes
  ADD COLUMN IF NOT EXISTS viewed_at DATE;

UPDATE user_series_episodes
SET viewed_at = (created_at AT TIME ZONE 'UTC')::date
WHERE viewed_at IS NULL;

ALTER TABLE user_series_episodes
  ALTER COLUMN viewed_at SET DEFAULT CURRENT_DATE;

ALTER TABLE user_series_episodes
  ALTER COLUMN viewed_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS user_series_episodes_viewed_idx
  ON user_series_episodes (user_id, viewed_at);

COMMENT ON COLUMN user_series_episodes.viewed_at IS
  'Fecha en que se marcó el episodio como visto (stats).';
