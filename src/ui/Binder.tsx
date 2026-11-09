import { useEffect, useState } from 'react';
import {
  createPage, createTopic, deletePage, deleteTopic, listPages, listSubjects, listTopics,
  savePositions, updateTopic, type PageSummary,
} from '../study/api';
import { byPosition, daysUntil, nextPosition, routeToHash, swapWithNeighbour, titleFromMarkdown } from '../study/logic';
import type { Subject, Topic } from '../study/types';
import { tidyText } from '../study/format';
import { sfx } from '../sfx';
import { CardsPanel } from './CardsPanel';

/** El archivador de una asignatura: separadores (temas) a la izquierda y hojas a la derecha. */
export function Binder({ subjectId, topicId }: { subjectId: string; topicId?: string }) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [newTopic, setNewTopic] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reloadTopics = () => listTopics(subjectId).then(setTopics).catch((e) => setError(e.message));
  useEffect(() => {
    listSubjects().then((all) => setSubject(all.find((s) => s.id === subjectId) ?? null)).catch((e) => setError(e.message));
    reloadTopics();
  }, [subjectId]);

  const sorted = topics ? byPosition(topics) : [];
  // Si no has elegido tema, se abre el primero.
  const current = sorted.find((t) => t.id === topicId) ?? sorted[0];

  async function act(fn: () => Promise<unknown>, sound: () => void = sfx.drop) {
    try { await fn(); sound(); await reloadTopics(); } catch (err) { setError((err as Error).message); sfx.error(); }
  }

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topics || !newTopic.trim()) return;
    const title = newTopic.trim();
    setNewTopic('');
    await act(async () => {
      const t = await createTopic({ subject_id: subjectId, title, position: nextPosition(topics), exam_date: null });
      location.hash = routeToHash({ view: 'asignatura', subjectId, topicId: t.id });
    }, sfx.place);
  }

  if (!topics) return <p className="muted">{error ?? 'Abriendo archivador…'}</p>;

  return (
    <section className="stack" style={{ '--spine': subject?.color ?? '#a54dff' } as React.CSSProperties}>
      <nav className="crumbs">
        <a href="#/">Estantería</a> <span>›</span> <span>{subject?.name ?? '…'}</span>
      </nav>
      <h1 className="binder-title">{subject?.name ?? '…'}</h1>

      <div className="binder-open">
        <aside className="tabs">
          <ol>
            {sorted.map((t, i) => {
              const days = daysUntil(t.exam_date);
              return (
                <li key={t.id} className={t.id === current?.id ? 'tab active' : 'tab'}>
                  <a href={routeToHash({ view: 'asignatura', subjectId, topicId: t.id })} onClick={() => t.id !== current?.id && sfx.page()}>
                    <span className="tab-num">{i + 1}</span>
                    <span className="tab-title">{t.title}</span>
                    {days !== null && days >= 0 && <span className={days <= 3 ? 'badge hot' : 'badge'} title="Días hasta el examen">{days === 0 ? 'hoy' : `${days} d`}</span>}
                  </a>
                </li>
              );
            })}
          </ol>
          <form onSubmit={addTopic} className="add-tab">
            <input placeholder="Nuevo tema" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} maxLength={120} />
            <button className="primary">+</button>
          </form>
        </aside>

        <div className="sheet-area">
          {current ? (
            <TopicPanel
              key={current.id}
              subjectId={subjectId}
              topic={current}
              onMove={(dir) => act(() => savePositions('study_topics', swapWithNeighbour(topics, current.id, dir)))}
              onRename={() => {
                const n = prompt('Nuevo nombre del tema', current.title)?.trim();
                if (n) act(() => updateTopic(current.id, { title: n }), sfx.saved);
              }}
              onExamDate={(d) => act(() => updateTopic(current.id, { exam_date: d || null }), sfx.place)}
              onDelete={() => {
                if (confirm(`¿Borrar el tema "${current.title}" y todas sus hojas? No se puede deshacer.`)) {
                  act(async () => {
                    await deleteTopic(current.id);
                    location.hash = routeToHash({ view: 'asignatura', subjectId });
                  }, sfx.remove);
                }
              }}
            />
          ) : (
            <p className="empty-state">Este archivador está vacío. Crea el primer tema: será un separador.</p>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

interface PanelProps {
  subjectId: string;
  topic: Topic;
  onMove: (dir: -1 | 1) => void;
  onRename: () => void;
  onExamDate: (date: string) => void;
  onDelete: () => void;
}

/** Las hojas de un tema, con las acciones del tema arriba. */
function TopicPanel({ subjectId, topic, onMove, onRename, onExamDate, onDelete }: PanelProps) {
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  // Pestaña elegida (hojas o tarjetas); se recuerda en este navegador.
  const [mode, setMode] = useState<'hojas' | 'tarjetas'>(() => { try { return sessionStorage.getItem('modo') === 'tarjetas' ? 'tarjetas' : 'hojas'; } catch { return 'hojas'; } });
  const pick = (m: 'hojas' | 'tarjetas') => { setMode(m); sfx.page(); try { sessionStorage.setItem('modo', m); } catch { /* sin almacenamiento */ } };
  const [error, setError] = useState<string | null>(null);
  const reload = () => listPages(topic.id).then(setPages).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, [topic.id]);

  async function act(fn: () => Promise<unknown>, sound: () => void = sfx.drop) {
    try { await fn(); sound(); await reload(); } catch (err) { setError((err as Error).message); sfx.error(); }
  }

  const open = (pageId: string, edit = false) =>
    (location.hash = routeToHash({ view: 'hoja', subjectId, topicId: topic.id, pageId, edit }));

  async function newPage() {
    if (!pages) return;
    try {
      const p = await createPage({ topic_id: topic.id, title: 'Hoja nueva', content: '', position: nextPosition(pages) });
      sfx.place();
      open(p.id, true);
    } catch (err) { setError((err as Error).message); sfx.error(); }
  }

  /** Cada archivo .md elegido se convierte en una hoja al final del tema. */
  async function importFiles(files: FileList | null) {
    if (!files || !pages) return;
    await act(async () => {
      let pos = nextPosition(pages);
      for (const f of Array.from(files)) {
        const content = tidyText(await f.text());
        await createPage({ topic_id: topic.id, title: titleFromMarkdown(f.name, content), content, position: pos++ });
      }
    }, sfx.confirm);
  }

  return (
    <div className="stack">
      <header className="topic-head">
        <h2>{topic.title}</h2>
        <div className="row-actions">
          <button title="Subir tema" onClick={() => onMove(-1)}>↑</button>
          <button title="Bajar tema" onClick={() => onMove(1)}>↓</button>
          <button title="Renombrar tema" onClick={onRename}>✎</button>
          <button title="Borrar tema" onClick={onDelete}>🗑</button>
        </div>
      </header>
      <label className="muted exam">
        Examen:{' '}
        <input type="date" value={topic.exam_date ?? ''} onChange={(e) => onExamDate(e.target.value)} />
      </label>

      <div className="mode-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'hojas'} onClick={() => pick('hojas')}>📄 Hojas{pages ? ` (${pages.length})` : ''}</button>
        <button role="tab" aria-selected={mode === 'tarjetas'} onClick={() => pick('tarjetas')}>🃏 Tarjetas</button>
      </div>

      {mode === 'tarjetas' ? (
        <CardsPanel subjectId={subjectId} topicId={topic.id} />
      ) : !pages ? (
        <p className="muted">Cargando hojas…</p>
      ) : (
        <ul className="pages">
          {pages.length === 0 && <li className="empty-state">Sin hojas todavía. Crea una o importa tus resúmenes en .md.</li>}
          {byPosition(pages).map((p) => (
            <li key={p.id} className="page-row">
              <a href={routeToHash({ view: 'hoja', subjectId, topicId: topic.id, pageId: p.id, edit: false })} onClick={() => sfx.page()}>
                <span className="page-name">📄 {p.title}</span>
                <span className="page-meta">editada {new Date(p.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
              </a>
              <div className="row-actions">
                <button title="Subir" onClick={() => act(() => savePositions('study_pages', swapWithNeighbour(pages, p.id, -1)))}>↑</button>
                <button title="Bajar" onClick={() => act(() => savePositions('study_pages', swapWithNeighbour(pages, p.id, 1)))}>↓</button>
                <button title="Borrar" onClick={() => {
                  if (confirm(`¿Borrar la hoja "${p.title}"?`)) act(() => deletePage(p.id), sfx.remove);
                }}>🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mode === 'hojas' && <div className="row">
        <button className="primary" onClick={newPage}>+ Hoja nueva</button>
        <label className="button" role="button">
          Importar .md
          <input type="file" accept=".md,.markdown,.txt,text/markdown" multiple hidden onChange={(e) => { importFiles(e.target.files); e.target.value = ''; }} />
        </label>
      </div>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
