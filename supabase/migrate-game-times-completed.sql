-- Veces que se ha pasado el juego (completados).

alter table public.user_games
  add column if not exists times_completed integer not null default 0
  check (times_completed >= 0);

update public.user_games
set times_completed = 1
where status = 'completed'
  and times_completed = 0;

comment on column public.user_games.times_completed is
  'Número de veces que se ha pasado el juego.';
