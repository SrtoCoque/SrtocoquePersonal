-- =============================================================================
-- Deporte / Cardio — entrenamientos de correr y bicicleta
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE cardio_activity AS ENUM ('correr', 'bicicleta');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_cardio_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  activity cardio_activity NOT NULL,
  distance_km NUMERIC NOT NULL CHECK (distance_km > 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_cardio_workouts_user_id_idx
  ON user_cardio_workouts (user_id);
CREATE INDEX IF NOT EXISTS user_cardio_workouts_activity_idx
  ON user_cardio_workouts (user_id, activity);
CREATE INDEX IF NOT EXISTS user_cardio_workouts_date_idx
  ON user_cardio_workouts (user_id, performed_at DESC);

ALTER TABLE user_cardio_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_cardio_workouts_select_own" ON user_cardio_workouts;
DROP POLICY IF EXISTS "user_cardio_workouts_insert_own" ON user_cardio_workouts;
DROP POLICY IF EXISTS "user_cardio_workouts_update_own" ON user_cardio_workouts;
DROP POLICY IF EXISTS "user_cardio_workouts_delete_own" ON user_cardio_workouts;

CREATE POLICY "user_cardio_workouts_select_own"
  ON user_cardio_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_cardio_workouts_insert_own"
  ON user_cardio_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_cardio_workouts_update_own"
  ON user_cardio_workouts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_cardio_workouts_delete_own"
  ON user_cardio_workouts FOR DELETE
  USING (auth.uid() = user_id);

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_cardio_workouts';
