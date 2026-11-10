-- Excelsior Academy · Paso 10: mejoras del repaso diario.
-- Ejecutar UNA vez en Supabase → SQL Editor, después de 02-flashcards.sql.
-- Solo AÑADE dos columnas a study_cards; no toca nada del juego.
--   suspended → tarjeta apartada: no sale en los repasos (p. ej. una «sanguijuela» que fallas una y otra vez).
--   note_key  → tarjetas hermanas (los huecos de una misma frase, o una nota de Anki con inversa):
--               solo sale una de ellas al día, para que una no te chive la respuesta de la otra.
alter table public.study_cards add column if not exists suspended boolean not null default false;
alter table public.study_cards add column if not exists note_key text check (char_length(note_key) <= 100);
create index if not exists study_cards_note on public.study_cards (user_id, note_key) where note_key is not null;
