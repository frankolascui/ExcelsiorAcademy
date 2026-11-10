-- Excelsior Academy · Paso 12: ajustar FSRS a tu memoria.
-- Ejecutar UNA vez en Supabase → SQL Editor. Solo AÑADE la tabla study_settings; no toca nada del juego.
--
-- Una fila por alumno con sus ajustes de estudio. De momento, los 21 parámetros de FSRS
-- que calcula el optimizador a partir de su historial (null = los de por defecto).
create table if not exists public.study_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  fsrs_params double precision[] check (fsrs_params is null or array_length(fsrs_params, 1) = 21),
  params_reviews int,          -- con cuántos repasos se calcularon
  optimized_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.study_settings enable row level security;

create policy "mis ajustes" on public.study_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
