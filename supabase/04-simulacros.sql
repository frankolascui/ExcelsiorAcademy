-- Excelsior Academy · Paso 8: simulacros.
-- Ejecutar UNA vez en Supabase → SQL Editor, después de 01-resumenes.sql.
-- Solo AÑADE la tabla study_exams; no toca nada del juego.
--
-- Un simulacro cuelga de una asignatura (puede abarcar varios temas: topic_ids).
-- Ciclo: importado → empezado (started_at) → terminado (finished_at) → corregido (grade).
-- La corrección la hace la skill en el proyecto de Claude; aquí se guarda el resultado.

create table if not exists public.study_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  statement text not null check (char_length(statement) between 1 and 200000), -- enunciado en Markdown
  topic_ids uuid[] not null default '{}',                 -- temas que entran
  time_limit_min int check (time_limit_min between 1 and 600),
  answers text not null default '' check (char_length(answers) <= 200000),
  started_at timestamptz,
  finished_at timestamptz,
  duration_sec int,                                        -- lo que tardaste
  correction text not null default '' check (char_length(correction) <= 200000),
  grade numeric(4, 2) check (grade between 0 and 10),      -- nota sobre 10
  created_at timestamptz not null default now()
);

create index if not exists study_exams_subject on public.study_exams (subject_id, created_at);

alter table public.study_exams enable row level security;

create policy "mis simulacros" on public.study_exams for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Un simulacro solo puede colgar de una asignatura tuya.
create or replace function public.study_check_exam_owner() returns trigger
language plpgsql security invoker as $$
begin
  if not exists (
    select 1 from public.study_subjects s where s.id = new.subject_id and s.user_id = new.user_id
  ) then raise exception 'Esa asignatura no es tuya';
  end if;
  return new;
end $$;

drop trigger if exists study_exams_owner on public.study_exams;
create trigger study_exams_owner before insert or update on public.study_exams
  for each row execute function public.study_check_exam_owner();
