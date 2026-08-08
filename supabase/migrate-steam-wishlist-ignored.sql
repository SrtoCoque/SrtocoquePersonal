-- Juegos de la wishlist de Steam que el usuario ha quitado aquí:
-- la sync no debe volver a crearlos.

create table if not exists public.user_steam_wishlist_ignored (
  user_id uuid not null references public.profiles (id) on delete cascade,
  steam_app_id integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, steam_app_id)
);

create index if not exists user_steam_wishlist_ignored_user_idx
  on public.user_steam_wishlist_ignored (user_id);

alter table public.user_steam_wishlist_ignored enable row level security;

drop policy if exists "user_steam_wishlist_ignored_select_own"
  on public.user_steam_wishlist_ignored;
drop policy if exists "user_steam_wishlist_ignored_insert_own"
  on public.user_steam_wishlist_ignored;
drop policy if exists "user_steam_wishlist_ignored_delete_own"
  on public.user_steam_wishlist_ignored;

create policy "user_steam_wishlist_ignored_select_own"
  on public.user_steam_wishlist_ignored for select
  using (auth.uid() = user_id);

create policy "user_steam_wishlist_ignored_insert_own"
  on public.user_steam_wishlist_ignored for insert
  with check (auth.uid() = user_id);

create policy "user_steam_wishlist_ignored_delete_own"
  on public.user_steam_wishlist_ignored for delete
  using (auth.uid() = user_id);

comment on table public.user_steam_wishlist_ignored is
  'AppIDs de Steam wishlist que el usuario eliminó; no se reimportan al sync.';
