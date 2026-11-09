import { lazy, Suspense, useEffect, useState } from 'react';
import { getPage, listSubjects, listTopics, updatePage } from '../study/api';
import { routeToHash } from '../study/logic';
import type { Page } from '../study/types';

// Las fórmulas (KaTeX) pesan mucho: se cargan solo al abrir una hoja.
const Markdown = lazy(() => import('./Markdown').then((m) => ({ default: m.Markdown })));

interface Props { subjectId: string; topicId: string; pageId: string; edit: boolean }

/** Una hoja: se lee como un resumen y se edita en Markdown con vista previa al lado. */
export function PageView({ subjectId, topicId, pageId, edit }: Props) {
  const [page, setPage] = useState<Page | null>(null);
  const [names, setNames] = useState({ subject: '…', topic: '…' });
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPage(pageId).then((p) => { setPage(p); setTitle(p.title); setContent(p.content); }).catch((e) => setError(e.message));
    Promise.all([listSubjects(), listTopics(subjectId)]).then(([ss, ts]) =>
      setNames({ subject: ss.find((s) => s.id === subjectId)?.name ?? '…', topic: ts.find((t) => t.id === topicId)?.title ?? '…' }),
    ).catch(() => {});
  }, [pageId, subjectId, topicId]);

  const dirty = page !== null && (title !== page.title || content !== page.content);

  // Avisa antes de cerrar la pestaña si hay cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    if (!page) return;
    setSaving(true);
    try {
      const clean = title.trim() || 'Hoja sin título';
      await updatePage(page.id, { title: clean, content });
      setPage({ ...page, title: clean, content });
      setTitle(clean);
      setError(null);
    } catch (err) { setError((err as Error).message); }
    setSaving(false);
  }

  const go = (editMode: boolean) => {
    if (!editMode && dirty && !confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
    if (!editMode && dirty && page) { setTitle(page.title); setContent(page.content); }
    location.hash = routeToHash({ view: 'hoja', subjectId, topicId, pageId, edit: editMode });
  };

  if (!page) return <p className="muted">{error ?? 'Abriendo hoja…'}</p>;

  return (
    <section className="stack">
      <nav className="crumbs">
        <a href="#/">Estantería</a> <span>›</span>
        <a href={routeToHash({ view: 'asignatura', subjectId })}>{names.subject}</a> <span>›</span>
        <a href={routeToHash({ view: 'asignatura', subjectId, topicId })}>{names.topic}</a>
      </nav>

      {edit ? (
        <div
          className="stack"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
          }}
        >
          <div className="row">
            <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            <button className="primary" onClick={save} disabled={saving || !dirty}>{saving ? 'Guardando…' : dirty ? 'Guardar' : 'Guardado'}</button>
            <button onClick={() => go(false)}>Ver</button>
          </div>
          <p className="muted small">Markdown: # Título, ## Apartado, **negrita**, - lista, | tabla |, fórmulas con $x^2$ o $$...$$. Ctrl+S guarda.</p>
          <div className="editor">
            <textarea value={content} onChange={(e) => setContent(e.target.value)} spellCheck placeholder="Escribe o pega aquí tu resumen…" />
            <div className="preview card"><Suspense fallback={null}><Markdown text={content} /></Suspense></div>
          </div>
        </div>
      ) : (
        <article className="card paper">
          <div className="row spread">
            <h1 className="page-title">{page.title}</h1>
            <button onClick={() => go(true)}>✎ Editar</button>
          </div>
          {page.content.trim() ? <Suspense fallback={<p className="muted">Cargando…</p>}><Markdown text={page.content} /></Suspense> : <p className="muted">Hoja en blanco. Pulsa Editar para escribir.</p>}
        </article>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
