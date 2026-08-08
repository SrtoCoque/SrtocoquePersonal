-- Metadatos Steam / filtros: géneros, wishlist added, reviews, logros
-- Ejecutar en: Supabase Dashboard → SQL Editor

ALTER TABLE public.user_games
  ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_games
  ADD COLUMN IF NOT EXISTS steam_wishlist_added_at DATE;

ALTER TABLE public.user_games
  ADD COLUMN IF NOT EXISTS steam_review_percent INTEGER
  CHECK (
    steam_review_percent IS NULL
    OR (steam_review_percent >= 0 AND steam_review_percent <= 100)
  );

ALTER TABLE public.user_games
  ADD COLUMN IF NOT EXISTS steam_achievements_unlocked INTEGER
  CHECK (
    steam_achievements_unlocked IS NULL
    OR steam_achievements_unlocked >= 0
  );

ALTER TABLE public.user_games
  ADD COLUMN IF NOT EXISTS steam_achievements_total INTEGER
  CHECK (
    steam_achievements_total IS NULL
    OR steam_achievements_total >= 0
  );

ALTER TABLE public.user_games
  ADD COLUMN IF NOT EXISTS steam_achievements_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_games.genres IS
  'Géneros del juego (IGDB / Steam Store).';
COMMENT ON COLUMN public.user_games.steam_wishlist_added_at IS
  'Fecha en que se añadió a la wishlist de Steam (YYYY-MM-DD).';
COMMENT ON COLUMN public.user_games.steam_review_percent IS
  'Porcentaje de reviews positivas en Steam (0-100).';
COMMENT ON COLUMN public.user_games.steam_achievements_unlocked IS
  'Logros desbloqueados del usuario en Steam.';
COMMENT ON COLUMN public.user_games.steam_achievements_total IS
  'Total de logros del juego en Steam.';
COMMENT ON COLUMN public.user_games.steam_achievements_synced_at IS
  'Última sync de logros Steam.';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_games'
  AND column_name IN (
    'genres',
    'steam_wishlist_added_at',
    'steam_review_percent',
    'steam_achievements_unlocked',
    'steam_achievements_total',
    'steam_achievements_synced_at'
  )
ORDER BY column_name;
