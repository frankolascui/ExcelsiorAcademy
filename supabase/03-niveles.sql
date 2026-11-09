-- Excelsior Academy · Paso 6: nivel de exigencia por asignatura.
-- Ejecutar UNA vez en Supabase → SQL Editor, después de 02-flashcards.sql.
-- Solo añade una columna a study_subjects; no toca nada del juego.
--   minimo      → aprobar con el mínimo de tiempo
--   equilibrado → lo importante de cada tema (por defecto)
--   detalle     → ir a por el 10, hasta el último detalle
alter table public.study_subjects
  add column if not exists level text not null default 'equilibrado'
  check (level in ('minimo', 'equilibrado', 'detalle'));
