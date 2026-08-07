-- =============================================================================
-- Videojuegos — estado «Sin terminar» (jugado pero no completado)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

DO $$ BEGIN
  ALTER TYPE game_status ADD VALUE 'dropped';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'game_status'
ORDER BY e.enumsortorder;
