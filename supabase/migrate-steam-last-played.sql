-- Fecha de última partida en Steam (para atribuir horas a esa sesión).

alter table public.user_games
  add column if not exists steam_last_played_at date;

comment on column public.user_games.steam_last_played_at is
  'Día de la última sesión en Steam (rtime_last_played). Se usa para adjudicar horas al historial.';
