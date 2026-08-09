-- =============================================================================
-- Cómics — precio por número + fecha de apunte del gasto
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

ALTER TABLE user_comic_issues
  ADD COLUMN IF NOT EXISTS price NUMERIC
    CHECK (price IS NULL OR price >= 0);

ALTER TABLE user_comic_issues
  ADD COLUMN IF NOT EXISTS purchased_at DATE;

COMMENT ON COLUMN user_comic_issues.price IS
  'Coste del número en euros (opcional).';
COMMENT ON COLUMN user_comic_issues.purchased_at IS
  'Fecha en que se apuntó el gasto (para estadísticas).';

CREATE INDEX IF NOT EXISTS user_comic_issues_purchased_idx
  ON user_comic_issues (user_id, purchased_at);
