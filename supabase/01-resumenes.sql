-- Excelsior Academy · Paso 3: archivador de resúmenes.
-- Ejecutar UNA vez en Supabase → SQL Editor (el mismo proyecto que Excelsior RPG).
-- Solo AÑADE tablas que empiezan por study_; no toca nada del juego.
--
-- Archivador:  asignatura (study_subjects) → tema (study_topics) → hoja (study_pages)
-- Cada fila guarda de quién es (user_id) y las reglas por fila (RLS) hacen que
-- cada alumno solo pueda ver y cambiar lo suyo.

create table if not exists public.study_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#a54dff',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.study_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  position int not null default 0,
  exam_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.study_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id uuid not null references public.study_topics (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  content text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_topics_subject on public.study_topics (subject_id, position);
create index if not exists study_pages_topic on public.study_pages (topic_id, position);

-- Reglas por fila: cada alumno solo ve, crea, cambia y borra sus propias filas.
alter table public.study_subjects enable row level security;
alter table public.study_topics enable row level security;
alter table public.study_pages enable row level security;

create policy "mis asignaturas" on public.study_subjects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mis temas" on public.study_topics for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mis hojas" on public.study_pages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Un tema solo puede colgar de una asignatura tuya, y una hoja de un tema tuyo.
create or replace function public.study_check_owner() returns trigger
language plpgsql security invoker as $$
begin
  if tg_table_name = 'study_topics' and not exists (
    select 1 from public.study_subjects s where s.id = new.subject_id and s.user_id = new.user_id
  ) then raise exception 'Esa asignatura no es tuya';
  end if;
  if tg_table_name = 'study_pages' and not exists (
    select 1 from public.study_topics t where t.id = new.topic_id and t.user_id = new.user_id
  ) then raise exception 'Ese tema no es tuyo';
  end if;
  return new;
end $$;

drop trigger if exists study_topics_owner on public.study_topics;
create trigger study_topics_owner before insert or update on public.study_topics
  for each row execute function public.study_check_owner();
drop trigger if exists study_pages_owner on public.study_pages;
create trigger study_pages_owner before insert or update on public.study_pages
  for each row execute function public.study_check_owner();

-- La fecha de la última edición de una hoja se pone sola.
create or replace function public.study_touch() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists study_pages_touch on public.study_pages;
create trigger study_pages_touch before update on public.study_pages
  for each row execute function public.study_touch();
