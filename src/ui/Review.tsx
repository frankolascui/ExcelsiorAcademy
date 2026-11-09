import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { listAllTopics, listSubjects, loadCandidates, newDoneToday, saveReview } from '../study/api';
import { routeToHash } from '../study/logic';
import { answer, buildQueue, countsFor, GRADES, NEW_PER_DAY, previewIntervals, requeueIndex, sessionSummary } from '../study/srs';
import type { CardRow, Subject, Topic } from '../study/types';
import type { Grade } from 'ts-fsrs';
import { sfx } from '../sfx';
import { friendly } from './CardsPanel';
import { Icon } from './Icon';

const Markdown = lazy(() => import('./Markdown').then((m) => ({ default: m.Markdown })));

/** Qué temas entran en el repaso: uno, los de una asignatura o todos (null). */
async function scopeTopics(subjectId?: string, topicIds?: string[]): Promise<{ ids: string[] | null; topics: Topic[] }> {
  const topics = await listAllTopics();
  if (topicIds?.length) return { ids: topicIds, topics };
  if (subjectId) return { ids: topics.filter((t) => t.subject_id === subjectId).map((t) => t.id), topics };
  return { ids: null, topics };
}

/** Cola de hoy para un ámbito, respetando el límite diario de nuevas. */
export async function loadQueue(subjectId?: string, topicIds?: string[]) {
  const [{ ids, topics }, doneNew] = await Promise.all([scopeTopics(subjectId, topicIds), newDoneToday()]);
  const candidates = ids && ids.length === 0 ? [] : await loadCandidates(ids, NEW_PER_DAY - doneNew);
  return { queue: buildQueue(candidates, new Date(), doneNew), topics };
}

const SOUND: Record<number, () => void> = { 1: sfx.uncheck, 2: sfx.tick, 3: sfx.check, 4: sfx.confirm };

/** La sesión de repaso: anverso → «Mostrar respuesta» → 4 botones con el intervalo de cada uno. */
export function Review({ subjectId, topicIds }: { subjectId?: string; topicIds?: string[] }) {
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());

  useEffect(() => {
    loadQueue(subjectId, topicIds)
      .then(({ queue, topics }) => { setQueue(queue); setTopics(new Map(topics.map((t) => [t.id, t]))); shownAt.current = Date.now(); })
      .catch((e) => setError(friendly(e.message)));
  }, [subjectId, topicIds?.join(',')]);

  const card = queue?.[0];

  const reveal = useCallback(() => { if (card && !revealed) { setRevealed(true); sfx.page(); } }, [card, revealed]);

  const rate = useCallback((grade: Grade) => {
    if (!card || !queue || !revealed) return;
    const now = new Date();
    const next = answer(card, grade, now);
    const rest = queue.slice(1);
    // Si vuelve en pocos minutos (pasos de aprendizaje), se queda en esta sesión.
    const at = requeueIndex(new Date(next.due), now, rest.length);
    if (at >= 0) rest.splice(at, 0, { ...card, ...next });
    saveReview(card.id, next, {
      rating: grade, state: card.state, scheduled_days: next.scheduled_days, duration_ms: Math.min(Date.now() - shownAt.current, 600_000),
    }).catch((e) => setError(`No se ha podido guardar una respuesta: ${friendly(e.message)}`));
    SOUND[grade]();
    if (rest.length === 0) setTimeout(() => sfx.reward(), 250);
    setRatings((r) => [...r, grade]);
    setQueue(rest);
    setRevealed(false);
    shownAt.current = Date.now();
  }, [card, queue, revealed]);

  // Teclado: espacio o Enter muestra la respuesta; 1-4 la puntúa.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) reveal(); else rate(3 as Grade);
      }
      const g = GRADES.find((x) => x.key === e.key);
      if (g && revealed) rate(g.grade);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [reveal, rate, revealed]);

  const back = subjectId
    ? routeToHash({ view: 'asignatura', subjectId, topicId: topicIds?.length === 1 ? topicIds[0] : undefined })
    : '#/';

  if (error && !queue) return <p className="error">{error}</p>;
  if (!queue) return <p className="muted">Barajando tarjetas…</p>;

  if (!card) {
    const s = sessionSummary(ratings);
    const mins = Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000));
    return (
      <section className="review-done panel">
        <p className="eyebrow">Repaso</p>
        {s.total === 0 ? (
          <>
            <h1 className="section-title">Nada pendiente 🎉</h1>
            <p className="muted">No hay tarjetas que toquen ahora aquí. Vuelve más tarde o añade tarjetas nuevas.</p>
          </>
        ) : (
          <>
            <h1 className="section-title">¡Sesión completada!</h1>
            <div className="stats">
              <div><strong>{s.total}</strong><span>respuestas</span></div>
              <div><strong>{s.retention}%</strong><span>recordadas</span></div>
              <div><strong>{mins} min</strong><span>de estudio</span></div>
            </div>
            {s.again > 0 && <p className="muted">Fallaste {s.again}: volverán pronto, es normal. Así se fija la memoria.</p>}
          </>
        )}
        <a className="button primary" href={back}><Icon name="left" /> Volver</a>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }

  const c = countsFor(queue);
  const topic = topics.get(card.topic_id);
  const intervals = revealed ? previewIntervals(card, new Date()) : null;

  return (
    <section className="review">
      <nav className="crumbs">
        <a className="back-btn" href={back}><Icon name="left" size={16} /> Salir</a>
        <span className="counts" title="Nuevas · Aprendiendo · Repaso">
          <span className="pill new">{c.nuevas}</span>
          <span className="pill learn">{c.aprendiendo}</span>
          <span className="pill due">{c.repaso}</span>
        </span>
      </nav>

      <article className="flashcard" onClick={reveal}>
        {topic && <p className="eyebrow">{topic.title}</p>}
        <Suspense fallback={<p>{card.front}</p>}>
          <div className="fc-front"><Markdown text={card.front} /></div>
          {revealed && <><hr /><div className="fc-back"><Markdown text={card.back || '_(sin respuesta)_'} /></div></>}
        </Suspense>
      </article>

      {!revealed ? (
        <button className="primary reveal" onClick={reveal}>Mostrar respuesta <kbd>espacio</kbd></button>
      ) : (
        <div className="grades">
          {GRADES.map((g) => (
            <button key={g.grade} className={`grade g${g.grade}`} onClick={() => rate(g.grade)}>
              <span className="when">{intervals?.[g.grade]}</span>
              <span>{g.label}</span>
              <kbd>{g.key}</kbd>
            </button>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

/** Panel «Hoy» de la estantería: cuántas tarjetas tocan, en total y por asignatura. */
export function TodayPanel() {
  const [data, setData] = useState<{ total: ReturnType<typeof countsFor>; bySubject: { s: Subject; n: number }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadQueue(), listSubjects()])
      .then(([{ queue, topics }, subjects]) => {
        const subjectOf = new Map(topics.map((t) => [t.id, t.subject_id]));
        const bySubject = subjects
          .map((s) => ({ s, n: queue.filter((c) => subjectOf.get(c.topic_id) === s.id).length }))
          .filter((x) => x.n > 0);
        setData({ total: countsFor(queue), bySubject });
      })
      .catch((e) => setError(friendly(e.message)));
  }, []);

  if (error) return <div className="today panel"><p className="eyebrow">Hoy</p><p className="muted small">{error}</p></div>;
  if (!data) return null;
  const sum = data.total.nuevas + data.total.aprendiendo + data.total.repaso;

  return (
    <div className="today panel">
      <div className="today-main">
        <div>
          <p className="eyebrow">Hoy</p>
          <p className="today-num">{sum === 0 ? 'Todo repasado ✓' : `${sum} tarjetas`}</p>
          {sum > 0 && (
            <p className="small">
              <span className="pill new">{data.total.nuevas} nuevas</span>{' '}
              <span className="pill learn">{data.total.aprendiendo} aprendiendo</span>{' '}
              <span className="pill due">{data.total.repaso} repaso</span>
            </p>
          )}
        </div>
        {sum > 0 && <a className="button primary" href={routeToHash({ view: 'repasar' })} onClick={() => sfx.open()}><Icon name="play" /> Repasar todo</a>}
      </div>
      {data.bySubject.length > 1 && (
        <ul className="today-list">
          {data.bySubject.map(({ s, n }) => (
            <li key={s.id} style={{ '--spine': s.color } as React.CSSProperties}>
              <a href={routeToHash({ view: 'repasar', subjectId: s.id })} onClick={() => sfx.open()}>
                <span className="dot" /> {s.name} <strong>{n}</strong>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
