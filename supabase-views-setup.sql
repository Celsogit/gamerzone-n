-- GAMERZONE · configuración de "Más vistos" para la versión estática en GitHub Pages
--
-- La página funciona en GitHub Pages sin servidor, así que el navegador
-- escribe directamente en Supabase. Pega este script en
-- Supabase → SQL Editor → New query → Run.
--
-- Sin esto, la app sigue funcionando: cae al upsert y guarda la vista con
-- count = 1 (se ve raro en consola un 404 de `increment_view`, pero no rompe).

-- 1) Función atómica para sumar una vista (evita perder incrementos cuando
--    varios usuarios abren el mismo juego a la vez).
create or replace function public.increment_view(p_game_id text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.views (game_id, count, updated_at)
  values (p_game_id, 1, now())
  on conflict (game_id)
  do update set count = public.views.count + 1, updated_at = now();
$$;

grant execute on function public.increment_view(text) to anon, authenticated;

-- 2) Permisos de tabla: la página usa la clave publicable (anon), así que el
--    rol anon necesita leer y escribir la tabla de vistas.
alter table public.views enable row level security;

drop policy if exists "views_lectura_publica" on public.views;
create policy "views_lectura_publica"
  on public.views for select
  to anon, authenticated
  using (true);

drop policy if exists "views_escritura_publica" on public.views;
create policy "views_escritura_publica"
  on public.views for insert
  to anon, authenticated
  with check (true);

drop policy if exists "views_actualizacion_publica" on public.views;
create policy "views_actualizacion_publica"
  on public.views for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.views to anon, authenticated;

-- 3) La tabla `views` debe tener `game_id` como clave única para que el
--    "on conflict" funcione. Si al ejecutar da error porque ya existe, ignóralo.
alter table public.views
  add constraint views_game_id_key unique (game_id);