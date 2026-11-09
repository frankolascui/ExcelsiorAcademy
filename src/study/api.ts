// Todo lo que el archivador lee y escribe en Supabase.
// No hace falta enviar user_id: la base de datos lo pone sola (default auth.uid())
// y las reglas por fila impiden tocar filas de otro alumno.
import { sb } from '../cloud';
import type { CardRow, Page, Subject, Topic } from './types';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- Asignaturas ----------
const SUBJECT_COLS = 'id, name, color, position, level';
export async function listSubjects(): Promise<Subject[]> {
  const res = await sb().from('study_subjects').select(SUBJECT_COLS).order('position');
  // Si aún no se ha ejecutado 03-niveles.sql, la columna «level» no existe: seguimos con el nivel por defecto.
  if (res.error && /level/.test(res.error.message)) {
    const old = check(await sb().from('study_subjects').select('id, name, color, position').order('position')) as Omit<Subject, 'level'>[];
    return old.map((x) => ({ ...x, level: 'equilibrado' as const }));
  }
  return check(res);
}
export async function createSubject(s: Omit<Subject, 'id' | 'level'>): Promise<Subject> {
  return check(await sb().from('study_subjects').insert(s).select(SUBJECT_COLS).single());
}
export async function updateSubject(id: string, patch: Partial<Omit<Subject, 'id'>>) {
  check(await sb().from('study_subjects').update(patch).eq('id', id));
}
export async function deleteSubject(id: string) {
  check(await sb().from('study_subjects').delete().eq('id', id));
}

// ---------- Temas (separadores) ----------
const TOPIC_COLS = 'id, subject_id, title, position, exam_date';
export async function listTopics(subjectId: string): Promise<Topic[]> {
  return check(await sb().from('study_topics').select(TOPIC_COLS).eq('subject_id', subjectId).order('position'));
}
export async function createTopic(t: Omit<Topic, 'id'>): Promise<Topic> {
  return check(await sb().from('study_topics').insert(t).select(TOPIC_COLS).single());
}
export async function updateTopic(id: string, patch: Partial<Omit<Topic, 'id' | 'subject_id'>>) {
  check(await sb().from('study_topics').update(patch).eq('id', id));
}
export async function deleteTopic(id: string) {
  check(await sb().from('study_topics').delete().eq('id', id));
}

// ---------- Hojas ----------
// En la lista no se descarga el contenido (puede ser largo); solo al abrir la hoja.
export type PageSummary = Omit<Page, 'content'>;
export async function listPages(topicId: string): Promise<PageSummary[]> {
  return check(await sb().from('study_pages').select('id, topic_id, title, position, updated_at').eq('topic_id', topicId).order('position'));
}
export async function getPage(id: string): Promise<Page> {
  return check(await sb().from('study_pages').select('id, topic_id, title, content, position, updated_at').eq('id', id).single());
}
export async function createPage(p: Pick<Page, 'topic_id' | 'title' | 'content' | 'position'>): Promise<PageSummary> {
  return check(await sb().from('study_pages').insert(p).select('id, topic_id, title, position, updated_at').single());
}
export async function updatePage(id: string, patch: Partial<Pick<Page, 'title' | 'content' | 'position'>>) {
  check(await sb().from('study_pages').update(patch).eq('id', id));
}
export async function deletePage(id: string) {
  check(await sb().from('study_pages').delete().eq('id', id));
}

/** Guarda varias posiciones nuevas (al mover arriba o abajo). */
export async function savePositions(table: 'study_subjects' | 'study_topics' | 'study_pages', moves: { id: string; position: number }[]) {
  await Promise.all(moves.map((m) => sb().from(table).update({ position: m.position }).eq('id', m.id).then(check)));
}

// ---------- Flashcards ----------
const CARD_COLS = 'id, topic_id, front, back, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review, created_at';

export async function listAllTopics(): Promise<Topic[]> {
  return check(await sb().from('study_topics').select(TOPIC_COLS));
}
export async function listCards(topicId: string): Promise<CardRow[]> {
  return check(await sb().from('study_cards').select(CARD_COLS).eq('topic_id', topicId).order('created_at'));
}
export type NewCard = { topic_id: string; front: string; back: string } & Partial<Omit<CardRow, 'id' | 'topic_id' | 'front' | 'back' | 'created_at'>>;
/** Crea tarjetas en tandas de 500 (un mazo grande puede tener miles). `onProgress` recibe cuántas van. */
export async function createCards(cards: NewCard[], onProgress?: (done: number) => void): Promise<void> {
  for (let i = 0; i < cards.length; i += 500) {
    // defaultToNull: false → si a una tarjeta le falta una columna (p. ej. las nuevas no traen «due»), se usa el valor por defecto de la tabla.
    check(await sb().from('study_cards').insert(cards.slice(i, i + 500), { defaultToNull: false }));
    onProgress?.(Math.min(i + 500, cards.length));
  }
}
export async function updateCard(id: string, patch: Partial<Omit<CardRow, 'id' | 'created_at'>>) {
  check(await sb().from('study_cards').update(patch).eq('id', id));
}
export async function deleteCard(id: string) {
  check(await sb().from('study_cards').delete().eq('id', id));
}

/** Medianoche de hoy en tu hora local: el «día» de estudio empieza ahí. */
export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Tema de cada tarjeta NUEVA que has empezado hoy (para el límite diario de cada asignatura). */
export async function newTopicsToday(): Promise<string[]> {
  // study_cards(topic_id) trae el tema de la tarjeta de cada repaso, en la misma consulta.
  const rows = check(await sb().from('study_reviews').select('card_id, study_cards(topic_id)')
    .eq('state', 0).gte('reviewed_at', startOfToday().toISOString())) as unknown as { study_cards: { topic_id: string } | null }[];
  return rows.map((r) => r.study_cards?.topic_id).filter((t): t is string => !!t);
}

/** Tarjetas ya empezadas que tocan ahora. topicIds = null → de todas tus asignaturas. */
export async function loadDue(topicIds: string[] | null, now = new Date()): Promise<CardRow[]> {
  let q = sb().from('study_cards').select(CARD_COLS).neq('state', 0).lte('due', now.toISOString()).order('due').limit(1000);
  if (topicIds) q = q.in('topic_id', topicIds);
  return check(await q);
}

/** Las `limit` tarjetas nuevas más antiguas de esos temas. */
export async function loadNew(topicIds: string[], limit: number): Promise<CardRow[]> {
  if (limit <= 0 || topicIds.length === 0) return [];
  return check(await sb().from('study_cards').select(CARD_COLS).eq('state', 0).in('topic_id', topicIds).order('created_at').limit(limit));
}

/** Guarda una respuesta: el nuevo estado de la tarjeta y una línea en el historial. */
export async function saveReview(
  cardId: string,
  update: Partial<CardRow>,
  log: { rating: number; state: number; scheduled_days: number; duration_ms: number },
) {
  await Promise.all([
    sb().from('study_cards').update(update).eq('id', cardId).then(check),
    sb().from('study_reviews').insert({ card_id: cardId, ...log }).then(check),
  ]);
}
