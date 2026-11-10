import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { countNew, listAllTopics, listExamDates, listSubjects, loadDue, loadNew, loadStarted, newTopicsToday, saveReview } from '../study/api';
import { examTopics, FINAL_DAYS, finalReview, HORIZON_DAYS, pacedNewPerDay, topicPriority, upcoming } from '../study/plan';
import { routeToHash } from '../study/logic';
import { answer, buildQueue, countsFor, GRADES, newRoom, previewIntervals, requeueIndex, sessionSummary } from '../study/srs';
import type { CardRow, ExamDate, Level, Subject, Topic } from '../study/types';
import type { Grade } from 'ts-fsrs';
import { sfx } from '../sfx';
import { friendly } from './CardsPanel';
import { Icon } from './Icon';

const Markdown = lazy(() => import('./Markdown').then((m) => ({ default: m.Markdown })));

/**
 * Cola de hoy para un ámbito (unos temas, una asignatura o todo):
 * 1. las tarjetas que ya tocan;
 * 2. si hay examen en los próximos 3 días, el «repaso final» de sus temas (plan.ts);
 * 3. las nuevas de cada asignatura: el límite de su nivel o, si hay examen cerca y no te da tiempo,
 *    las que hagan falta para verlas todas la víspera (pacedNewPerDay);
 * 4. todo ordenado por cercanía del examen e intercalado por temas.
 */
export async function loadQueue(subjectId?: string, topicIds?: string[]) {
  const [topics, subjects, startedToday, exams] = await Promise.all([
    listAllTopics(), listSubjects(), newTopicsToday(),
    listExamDates().catch(() => [] as ExamDate[]), // si aún no existe la tabla, sin plan
  ]);
  const now = new Date();
  const subjectOf = new Map(topics.map((t) => [t.id, t.subject_id]));
  const levelOf = new Map<string, Level>(subjects.map((s) => [s.id, s.level ?? 'equilibrado']));
  const topicsOfSubject = (sid: string) => topics.filter((t) => t.subject_id === sid).map((t) => t.id);

  const inScope = topicIds?.length ? topicIds : subjectId ? topicsOfSubject(subjectId) : null;
  const scopeTopics = inScope ?? topics.map((t) => t.id);
  const scope = new Set(scopeTopics);

  const done = new Map<string, number>();
  for (const tid of startedToday) { const s = subjectOf.get(tid); if (s) done.set(s, (done.get(s) ?? 0) + 1); }
  const room = newRoom(levelOf, done);

  // Exámenes cercanos: prioridad por tema y examen más próximo de cada asignatura.
  const priority = topicPriority(exams, topicsOfSubject, now);
  const nextExam = new Map<string, ReturnType<typeof upcoming<ExamDate>>[number]>();
  for (const e of upcoming(exams, now)) if (e.daysLeft <= HORIZON_DAYS && !nextExam.has(e.subject_id)) nextExam.set(e.subject_id, e);
  const examTopicIds = [...priority.keys()].filter((t) => scope.has(t));
  const newLeft = await countNew(examTopicIds).catch(() => new Map<string, number>());

  const freshLoads: Promise<CardRow[]>[] = [];
  for (const [sid, levelRoom] of room) {
    const mine = scopeTopics.filter((t) => subjectOf.get(t) === sid);
    if (!mine.length) continue;
    const e = nextExam.get(sid);
    if (!e) { freshLoads.push(loadNew(mine, levelRoom)); continue; }
    const eTopics = new Set(examTopics(e, topicsOfSubject));
    const left = mine.filter((t) => eTopics.has(t)).reduce((n, t) => n + (newLeft.get(t) ?? 0), 0);
    const need = Math.max(levelRoom, pacedNewPerDay(left, e.daysLeft) - (done.get(sid) ?? 0));
    freshLoads.push(loadNew(mine.filter((t) => eTopics.has(t)), need).then(async (examNew) => [
      ...examNew,
      ...(await loadNew(mine.filter((t) => !eTopics.has(t)), Math.max(0, levelRoom - examNew.length))),
    ]));
  }

  // Repaso final de los exámenes de los próximos días.
  const finals = [...nextExam.values()].filter((e) => e.daysLeft <= FINAL_DAYS);
  const finalLoads = finals.map(async (e) => {
    const ts = examTopics(e, topicsOfSubject).filter((t) => scope.has(t));
    return finalReview(await loadStarted(ts), e.date, now, levelOf.get(e.subject_id) ?? 'equilibrado');
  });

  const [due, fresh, final] = await Promise.all([
    scopeTopics.length ? loadDue(inScope) : Promise.resolve([]),
    Promise.all(freshLoads),
    Promise.all(finalLoads),
  ]);
  // Las del repaso final se tratan como si ya tocaran (due = ahora), sin repetir ninguna.
  const seen = new Set(due.map((c) => c.id));
  const early = final.flat().filter((c) => !seen.has(c.id) && seen.add(c.id)).map((c) => ({ ...c, due: now.toISOString() }));
  // El límite de nuevas ya se ha aplicado al pedirlas: aquí solo se ordena e intercala.
  const queue = buildQueue([...due, ...early, ...fresh.flat()], now, 0, Infinity, priority);
  return {
    queue, topics, subjects, exams: upcoming(exams, now),
    earlyIds: new Set(early.map((c) => c.id)),
    levelOfTopic: (tid: string): Level => levelOf.get(subjectOf.get(tid) ?? '') ?? 'equilibrado',
  };
}

const SOUND: Record<number, () => void> = { 1: sfx.uncheck, 2: sfx.tick, 3: sfx.check, 4: sfx.confirm };

/** La sesión de repaso: anverso → «Mostrar respuesta» → 4 botones con el intervalo de cada uno. */
export function Review({ subjectId, topicIds }: { subjectId?: string; topicIds?: string[] }) {
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());
  const levelOf = useRef<(topicId: string) => Level>(() => 'equilibrado');
  const early = useRef<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());

  useEffect(() => {
    loadQueue(subjectId, topicIds)
      .then(({ queue, topics, levelOfTopic, earlyIds }) => { levelOf.current = levelOfTopic; early.current = earlyIds; setQueue(queue); setTopics(new Map(topics.map((t) => [t.id, t]))); shownAt.current = Date.now(); })
      .catch((e) => setError(friendly(e.message)));
  }, [subjectId, topicIds?.join(',')]);

  const card = queue?.[0];

  const reveal = useCallback(() => { if (card && !revealed) { setRevealed(true); sfx.page(); } }, [card, revealed]);

  const rate = useCallback((grade: Grade) => {
    if (!card || !queue || !revealed) return;
    const now = new Date();
    const next = answer(card, grade, now, levelOf.current(card.topic_id));
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
  const intervals = revealed ? previewIntervals(card, new Date(), levelOf.current(card.topic_id)) : null;

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
        {topic && <p className="eyebrow">{topic.title}{early.current.has(card.id) && <span className="pill learn early-pill">repaso final</span>}</p>}
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
  const [data, setData] = useState<{ total: ReturnType<typeof countsFor>; bySubject: { s: Subject; n: number }[]; exams: { e: ExamDate; daysLeft: number; s?: Subject }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadQueue(), listSubjects()])
      .then(([{ queue, topics, exams }, subjects]) => {
        const subjectOf = new Map(topics.map((t) => [t.id, t.subject_id]));
        const bySubject = subjects
          .map((s) => ({ s, n: queue.filter((c) => subjectOf.get(c.topic_id) === s.id).length }))
          .filter((x) => x.n > 0);
        const soon = exams.filter((e) => e.daysLeft <= 14).map((e) => ({ e, daysLeft: e.daysLeft, s: subjects.find((s) => s.id === e.subject_id) }));
        setData({ total: countsFor(queue), bySubject, exams: soon });
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
      {data.exams.length > 0 && (
        <ul className="today-exams">
          {data.exams.map(({ e, daysLeft, s }) => (
            <li key={e.id} style={{ '--spine': s?.color ?? 'var(--c2)' } as React.CSSProperties}>
              <a href={routeToHash({ view: 'simulacros', subjectId: e.subject_id })} onClick={() => sfx.open()}>
                <span className={daysLeft <= 3 ? 'countdown small hot' : 'countdown small'}><strong>{daysLeft}</strong><span>{daysLeft === 1 ? 'día' : 'días'}</span></span>
                <span><strong>{s?.name ?? 'Examen'}</strong> · {e.title}</span>
                <span className="muted small">{daysLeft <= 3 ? 'repaso final activo' : 'ver plan'}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
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
