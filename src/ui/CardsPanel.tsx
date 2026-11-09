import { useEffect, useRef, useState } from 'react';
import { createCards, deleteCard, listCards, updateCard } from '../study/api';
import { routeToHash } from '../study/logic';
import { dueLabel, parseCardLines } from '../study/srs';
import { plainPreview } from '../study/format';
import type { CardRow } from '../study/types';
import { sfx } from '../sfx';
import { Icon, IconButton } from './Icon';

/** Las flashcards de un tema: crear, editar, borrar, importar y lanzar el repaso. */
export function CardsPanel({ subjectId, topicId }: { subjectId: string; topicId: string }) {
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [bulk, setBulk] = useState('');
  const [error, setError] = useState<string | null>(null);
  const frontRef = useRef<HTMLTextAreaElement>(null);

  const reload = () => listCards(topicId).then(setCards).catch((e) => setError(friendly(e.message)));
  useEffect(() => { reload(); }, [topicId]);

  async function act(fn: () => Promise<unknown>, sound: () => void = sfx.drop) {
    try { setError(null); await fn(); sound(); await reload(); } catch (err) { setError(friendly((err as Error).message)); sfx.error(); }
  }

  function add(e?: React.FormEvent) {
    e?.preventDefault();
    if (!front.trim()) return;
    const card = { topic_id: topicId, front: front.trim(), back: back.trim() };
    setFront(''); setBack('');
    frontRef.current?.focus(); // así puedes escribir la siguiente sin tocar el ratón
    act(() => createCards([card]), sfx.place);
  }

  // Ctrl+Enter (o Cmd+Enter) añade la tarjeta desde cualquiera de los dos cuadros.
  const ctrlEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add(); };

  const parsed = parseCardLines(bulk);
  async function importText(text: string) {
    const list = parseCardLines(text).map((c) => ({ topic_id: topicId, ...c }));
    if (!list.length) { setError('No he encontrado líneas con el formato pregunta;respuesta.'); sfx.error(); return; }
    await act(() => createCards(list), sfx.confirm);
    setBulk('');
  }

  if (!cards) return <p className="muted">{error ?? 'Cargando tarjetas…'}</p>;
  const now = new Date();
  const dueNow = cards.filter((c) => c.state !== 0 && new Date(c.due) <= now).length;
  const fresh = cards.filter((c) => c.state === 0).length;

  return (
    <div className="stack">
      <div className="review-cta">
        <div>
          <strong>{cards.length}</strong> tarjetas · <span className="pill due">{dueNow} tocan</span> <span className="pill new">{fresh} nuevas</span>
        </div>
        <a
          className={dueNow + fresh ? 'button primary' : 'button'}
          href={routeToHash({ view: 'repasar', subjectId, topicIds: [topicId] })}
          onClick={() => sfx.open()}
        >
          <Icon name="play" /> Repasar este tema
        </a>
      </div>

      <form className="card-form" onSubmit={add}>
        <textarea ref={frontRef} placeholder="Pregunta (anverso)" value={front} onChange={(e) => setFront(e.target.value)} onKeyDown={ctrlEnter} rows={2} maxLength={4000} />
        <textarea placeholder="Respuesta (reverso)" value={back} onChange={(e) => setBack(e.target.value)} onKeyDown={ctrlEnter} rows={2} maxLength={8000} />
        <div className="row">
          <button className="primary" disabled={!front.trim()}><Icon name="plus" /> Añadir tarjeta</button>
          <span className="muted small">Ctrl+Enter para añadir rápido. Admite Markdown y fórmulas $x^2$.</span>
        </div>
      </form>

      <ul className="cards">
        {cards.length === 0 && <li className="empty-state">Sin tarjetas todavía. Escribe una arriba o pega varias abajo.</li>}
        {cards.map((c) =>
          editing === c.id ? (
            <CardEditor key={c.id} card={c} onCancel={() => setEditing(null)} onSave={(f, b) => {
              setEditing(null);
              act(() => updateCard(c.id, { front: f, back: b }), sfx.saved);
            }} />
          ) : (
            <li key={c.id} className="card-row">
              <div className="card-text">
                <span className="card-front">{plainPreview(c.front)}</span>
                <span className="card-back">{plainPreview(c.back)}</span>
              </div>
              <span className={`pill s${c.state}`}>{dueLabel(c, now)}</span>
              <div className="row-actions">
                <IconButton icon="edit" label="Editar tarjeta" onClick={() => { sfx.tick(); setEditing(c.id); }} />
                <IconButton icon="trash" label="Borrar tarjeta" danger onClick={() => { if (confirm('¿Borrar esta tarjeta y su historial?')) act(() => deleteCard(c.id), sfx.remove); }} />
              </div>
            </li>
          ),
        )}
      </ul>

      <details className="bulk">
        <summary>Pegar o importar muchas a la vez</summary>
        <p className="muted small">
          Una tarjeta por línea: <code>pregunta;respuesta</code> (el formato de las flashcards que te da la skill). También vale separar con tabulador, como al copiar de una hoja de cálculo.
        </p>
        <textarea rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'¿Qué es la mitosis?;División celular que da 2 células iguales\n¿Fórmula del área del círculo?;$\\pi r^2$'} />
        <div className="row">
          <button className="primary" disabled={!parsed.length} onClick={() => importText(bulk)}>Crear {parsed.length || ''} tarjetas</button>
          <label className="button" role="button">
            <Icon name="upload" /> Importar .csv / .txt
            <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) importText(await f.text());
            }} />
          </label>
        </div>
      </details>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function CardEditor({ card, onSave, onCancel }: { card: CardRow; onSave: (front: string, back: string) => void; onCancel: () => void }) {
  const [f, setF] = useState(card.front);
  const [b, setB] = useState(card.back);
  return (
    <li className="card-row editing">
      <form className="card-form" onSubmit={(e) => { e.preventDefault(); if (f.trim()) onSave(f.trim(), b.trim()); }}>
        <textarea value={f} onChange={(e) => setF(e.target.value)} rows={2} autoFocus />
        <textarea value={b} onChange={(e) => setB(e.target.value)} rows={2} />
        <div className="row">
          <button className="primary" disabled={!f.trim()}><Icon name="check" /> Guardar</button>
          <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </li>
  );
}

/** Si aún no se ha ejecutado 02-flashcards.sql, la base de datos no conoce la tabla. */
export function friendly(msg: string): string {
  return /study_cards|study_reviews/.test(msg) && /(does not exist|schema cache|not find)/i.test(msg)
    ? 'Falta crear las tablas de tarjetas: ejecuta supabase/02-flashcards.sql en el SQL Editor de Supabase.'
    : msg;
}
