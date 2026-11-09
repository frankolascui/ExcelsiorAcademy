-- Arreglo del 9 nov 2026 para quien ya ejecutó la primera versión de 01-resumenes.sql.
-- Error que corrige: record "new" has no field "topic_id" al crear un tema.
-- Si ejecutas 01-resumenes.sql desde cero, no hace falta.
create or replace function public.study_check_topic_owner() returns trigger
language plpgsql security invoker as $$
begin
  if not exists (
    select 1 from public.study_subjects s where s.id = new.subject_id and s.user_id = new.user_id
  ) then raise exception 'Esa asignatura no es tuya';
  end if;
  return new;
end $$;

create or replace function public.study_check_page_owner() returns trigger
language plpgsql security invoker as $$
begin
  if not exists (
    select 1 from public.study_topics t where t.id = new.topic_id and t.user_id = new.user_id
  ) then raise exception 'Ese tema no es tuyo';
  end if;
  return new;
end $$;

drop trigger if exists study_topics_owner on public.study_topics;
create trigger study_topics_owner before insert or update on public.study_topics
  for each row execute function public.study_check_topic_owner();
drop trigger if exists study_pages_owner on public.study_pages;
create trigger study_pages_owner before insert or update on public.study_pages
  for each row execute function public.study_check_page_owner();
drop function if exists public.study_check_owner();
