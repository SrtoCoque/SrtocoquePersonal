-- Plataformas de streaming (TMDB watch providers)
ALTER TABLE user_movies
  ADD COLUMN IF NOT EXISTS providers TEXT[] NOT NULL DEFAULT '{}';
