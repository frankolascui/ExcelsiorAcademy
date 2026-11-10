-- Excelsior Academy · Paso 9: fechas de examen y plan día a día.
-- Ejecutar UNA vez en Supabase → SQL Editor, después de 01-resumenes.sql.
-- Solo AÑADE la tabla study_exam_dates; no toca nada del juego.
--
-- Un examen real: una asignatura, un día y los temas que entran (pueden ser varios).
-- Con esto la web reparte las tarjetas nuevas hasta ese día, prioriza esos temas
-- y en los últimos días adelanta las tarjetas que olvidarías antes del examen.

create table if not exists public.study_exam_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  date date not null,
  topic_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists study_exam_dates_user on public.study_exam_dates (user_id, date);

alter table public.study_exam_dates enable row level security;

create policy "mis fechas de examen" on public.study_exam_dates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Misma regla que los simulacros: solo en asignaturas tuyas.
create or replace function public.study_check_exam_date_owner() returns trigger
language plpgsql security invoker as $$
begin
  if not exists (
    select 1 from public.study_subjects s where s.id = new.subject_id and s.user_id = new.user_id
  ) then raise exception 'Esa asignatura no es tuya';
  end if;
  return new;
end $$;

drop trigger if exists study_exam_dates_owner on public.study_exam_dates;
create trigger study_exam_dates_owner before insert or update on public.study_exam_dates
  for each row execute function public.study_check_exam_date_owner();
