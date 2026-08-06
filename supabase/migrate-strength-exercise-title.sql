-- Si ya ejecutaste schema-strength.sql antes, corre solo esto:
ALTER TABLE user_strength_sessions
  ADD COLUMN IF NOT EXISTS exercise_title TEXT;
