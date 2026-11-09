import { useEffect, useState } from 'react';
import { createSubject, deleteSubject, listSubjects, savePositions, updateSubject } from '../study/api';
import { byPosition, nextPosition, routeToHash, swapWithNeighbour, SUBJECT_COLORS } from '../study/logic';
import type { Subject } from '../study/types';

/** La estantería: una carpeta por asignatura. */
export function Shelf() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const reload = () => listSubjects().then(setSubjects).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!subjects || !name.trim()) return;
    try {
      await createSubject({ name: name.trim(), color, position: nextPosition(subjects) });
      setName('');
      setColor(SUBJECT_COLORS[(subjects.length + 1) % SUBJECT_COLORS.length]);
      reload();
    } catch (err) { setError((err as Error).message); }
  }

  async function act(fn: () => Promise<unknown>) {
    try { await fn(); reload(); } catch (err) { setError((err as Error).message); }
  }

  if (!subjects) return <p className="muted">{error ?? 'Cargando estantería…'}</p>;

  return (
    <section className="stack">
      <h2>Mi estantería</h2>
      {subjects.length === 0 && <p className="muted">Todavía no tienes asignaturas. Crea la primera abajo.</p>}
      <ul className="shelf">
        {byPosition(subjects).map((s) => (
          <li key={s.id} className="binder" style={{ '--spine': s.color } as React.CSSProperties}>
            <a href={routeToHash({ view: 'asignatura', subjectId: s.id })} className="binder-cover">
              <span className="binder-name">{s.name}</span>
            </a>
            <div className="row-actions">
              <button title="Mover antes" onClick={() => act(() => savePositions('study_subjects', swapWithNeighbour(subjects, s.id, -1)))}>←</button>
              <button title="Mover después" onClick={() => act(() => savePositions('study_subjects', swapWithNeighbour(subjects, s.id, 1)))}>→</button>
              <button title="Renombrar" onClick={() => {
                const n = prompt('Nuevo nombre', s.name)?.trim();
                if (n) act(() => updateSubject(s.id, { name: n }));
              }}>✎</button>
              <button title="Borrar" onClick={() => {
                if (confirm(`¿Borrar "${s.name}" con todos sus temas y hojas? No se puede deshacer.`)) act(() => deleteSubject(s.id));
              }}>🗑</button>
            </div>
          </li>
        ))}
      </ul>

      <form className="card add" onSubmit={add}>
        <input placeholder="Nueva asignatura (p. ej. Física y Química)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <div className="colors" role="radiogroup" aria-label="Color">
          {SUBJECT_COLORS.map((c) => (
            <button type="button" key={c} role="radio" aria-checked={c === color} className="swatch" style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        <button className="primary">Añadir</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
