-- =============================================================================
-- Series — duración por episodio (minutos) para estadísticas de horas
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

ALTER TABLE user_series_episodes
  ADD COLUMN IF NOT EXISTS runtime INTEGER
  CHECK (runtime IS NULL OR runtime >= 0);

COMMENT ON COLUMN user_series_episodes.runtime IS
  'Duración del episodio en minutos (TMDB) al marcarlo como visto.';
