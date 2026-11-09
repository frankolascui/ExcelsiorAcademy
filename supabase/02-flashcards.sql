-- Excelsior Academy · Paso 4: flashcards con repetición espaciada (FSRS).
-- Ejecutar UNA vez en Supabase → SQL Editor, después de 01-resumenes.sql.
-- Solo AÑADE tablas study_*; no toca nada del juego.
--
-- Cada tarjeta cuelga de un tema (study_topics). Las columnas de memoria
-- (due, stability, difficulty…) son las mismas que usa el algoritmo FSRS (librería ts-fsrs).

create table if not exists public.study_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id uuid not null references public.study_topics (id) on delete cascade,
  front text not null check (char_length(front) between 1 and 4000),
  back text not null default '' check (char_length(back) <= 8000),
  -- Estado FSRS. state: 0 nueva, 1 aprendiendo, 2 repaso, 3 reaprendiendo.
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  learning_steps int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state smallint not null default 0 check (state between 0 and 3),
  last_review timestamptz,
  created_at timestamptz not null default now()
);

-- Historial: una fila por cada vez que respondes una tarjeta.
-- Sirve para el límite de tarjetas nuevas al día, las estadísticas y, en el futuro, el XP.
create table if not exists public.study_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id uuid not null references public.study_cards (id) on delete cascade,
  rating smallint not null check (rating between 1 and 4), -- 1 otra vez, 2 difícil, 3 bien, 4 fácil
  state smallint not null,                                 -- estado ANTES de responder
  reviewed_at timestamptz not null default now(),
  scheduled_days int not null default 0,                   -- días hasta el siguiente repaso
  duration_ms int
);

create index if not exists study_cards_due on public.study_cards (user_id, due);
create index if not exists study_cards_topic on public.study_cards (topic_id, created_at);
create index if not exists study_reviews_user_day on public.study_reviews (user_id, reviewed_at);

alter table public.study_cards enable row level security;
alter table public.study_reviews enable row level security;

create policy "mis tarjetas" on public.study_cards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mis repasos" on public.study_reviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Una tarjeta solo puede colgar de un tema tuyo; un repaso, de una tarjeta tuya.
create or replace function public.study_check_card_owner() returns trigger
language plpgsql security invoker as $$
begin
  if not exists (
    select 1 from public.study_topics t where t.id = new.topic_id and t.user_id = new.user_id
  ) then raise exception 'Ese tema no es tuyo';
  end if;
  return new;
end $$;

create or replace function public.study_check_review_owner() returns trigger
language plpgsql security invoker as $$
begin
  if not exists (
    select 1 from public.study_cards c where c.id = new.card_id and c.user_id = new.user_id
  ) then raise exception 'Esa tarjeta no es tuya';
  end if;
  return new;
end $$;

drop trigger if exists study_cards_owner on public.study_cards;
create trigger study_cards_owner before insert or update on public.study_cards
  for each row execute function public.study_check_card_owner();
drop trigger if exists study_reviews_owner on public.study_reviews;
create trigger study_reviews_owner before insert or update on public.study_reviews
  for each row execute function public.study_check_review_owner();
