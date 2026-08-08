-- Fecha en que se registró el precio pagado (para stats de gasto).

alter table public.user_games
  add column if not exists prices_set_at date;

-- Juegos que ya tienen precio: atribuir al día de alta en la biblioteca.
update public.user_games
set prices_set_at = (created_at at time zone 'Europe/Madrid')::date
where prices_set_at is null
  and prices is not null
  and prices <> '{}'::jsonb
  and exists (
    select 1
    from jsonb_each_text(prices) as p(key, value)
    where (p.value)::numeric > 0
  );

comment on column public.user_games.prices_set_at is
  'Día en que se registró el precio pagado; se usa en la gráfica de gasto.';
