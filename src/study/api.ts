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
export async function listSubjects(): Promise<Subject[]> {
  return check(await sb().from('study_subjects').select('id, name, color, position').order('position'));
}
export async function createSubject(s: Omit<Subject, 'id'>): Promise<Subject> {
  return check(await sb().from('study_subjects').insert(s).select('id, name, color, position').single());
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
export async function createCards(cards: { topic_id: string; front: string; back: string }[]): Promise<void> {
  if (cards.length) check(await sb().from('study_cards').insert(cards));
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

/** Cuántas tarjetas NUEVAS has estudiado hoy (para el límite diario). */
export async function newDoneToday(): Promise<number> {
  const res = await sb().from('study_reviews').select('id', { count: 'exact', head: true })
    .eq('state', 0).gte('reviewed_at', startOfToday().toISOString());
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

/**
 * Tarjetas candidatas para repasar ahora: las que ya tocan y las nuevas (hasta `newLimit`).
 * topicIds = null → de todas tus asignaturas.
 */
export async function loadCandidates(topicIds: string[] | null, newLimit: number, now = new Date()): Promise<CardRow[]> {
  let due = sb().from('study_cards').select(CARD_COLS).neq('state', 0).lte('due', now.toISOString()).order('due').limit(1000);
  let fresh = sb().from('study_cards').select(CARD_COLS).eq('state', 0).order('created_at').limit(Math.max(newLimit, 0));
  if (topicIds) { due = due.in('topic_id', topicIds); fresh = fresh.in('topic_id', topicIds); }
  const [a, b] = await Promise.all([due, newLimit > 0 ? fresh : Promise.resolve({ data: [], error: null })]);
  return [...check(a as { data: CardRow[] | null; error: null }), ...check(b as { data: CardRow[] | null; error: null })];
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
