import { useEffect, useRef, useState } from 'react';
import { createCards, deleteCard, listCards, updateCard } from '../study/api';
import { routeToHash } from '../study/logic';
import { dueLabel } from '../study/srs';
import { plainPreview } from '../study/format';
import type { CardRow } from '../study/types';
import { sfx } from '../sfx';
import { askConfirm } from './Dialog';
import { Icon } from './Icon';
import { ImportCards } from './ImportCards';
import { Menu } from './Kit';

/** Las flashcards de un tema: crear, editar, borrar, importar y lanzar el repaso. */
export function CardsPanel({ subjectId, topicId, onTopicsChanged }: { subjectId: string; topicId: string; onTopicsChanged?: () => void }) {
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
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
        <div className="row">
          <button className="ghost" onClick={() => { setImporting(true); sfx.open(); }}><Icon name="download" /> Importar</button>
          <a
            className={dueNow + fresh ? 'button primary' : 'button'}
            href={routeToHash({ view: 'repasar', subjectId, topicIds: [topicId] })}
            onClick={() => sfx.open()}
          >
            <Icon name="play" /> Repasar
          </a>
        </div>
      </div>
      {importing && (
        <ImportCards subjectId={subjectId} topicId={topicId} existing={cards}
          onClose={() => setImporting(false)}
          onDone={(changed) => { setImporting(false); reload(); if (changed) onTopicsChanged?.(); }} />
      )}

      <form className="card-form composer" onSubmit={add}>
        <textarea ref={frontRef} placeholder="Escribe la pregunta…" value={front} onChange={(e) => setFront(e.target.value)} onKeyDown={ctrlEnter} rows={2} maxLength={4000} />
        <textarea placeholder="…y la respuesta" value={back} onChange={(e) => setBack(e.target.value)} onKeyDown={ctrlEnter} rows={2} maxLength={8000} />
        <div className="row card-form-foot">
          <span className="muted small">Ctrl+Enter para añadir · admite Markdown y fórmulas</span>
          <button className="primary" disabled={!front.trim()}><Icon name="plus" /> Añadir</button>
        </div>
      </form>

      <ul className="cards">
        {cards.length === 0 && <li className="empty-state">Sin tarjetas todavía. Escribe una arriba o pulsa Importar.</li>}
        {cards.map((c) =>
          editing === c.id ? (
            <CardEditor key={c.id} card={c} onCancel={() => setEditing(null)} onSave={(f, b) => {
              setEditing(null);
              act(() => updateCard(c.id, { front: f, back: b }), sfx.saved);
            }} />
          ) : (
            <li key={c.id} className="card-row" onClick={() => { sfx.tick(); setEditing(c.id); }} title="Pulsa para editar">
              <div className="card-text">
                <span className="card-front">{plainPreview(c.front)}</span>
                <span className="card-back">{plainPreview(c.back)}</span>
              </div>
              <span className={`pill s${c.state}`}>{dueLabel(c, now)}</span>
              <Menu items={[
                { icon: 'edit', label: 'Editar', onSelect: () => setEditing(c.id) },
                { icon: 'trash', label: 'Borrar', danger: true, onSelect: async () => { if (await askConfirm({ title: '¿Borrar esta tarjeta?', message: 'Se borra también su historial de repasos.', confirmLabel: 'Borrar tarjeta', danger: true })) act(() => deleteCard(c.id), sfx.remove); } },
              ]} />
            </li>
          ),
        )}
      </ul>

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
