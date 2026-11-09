import { useState } from 'react';
import { createCards, createTopic, listTopics, type NewCard } from '../study/api';
import type { ApkgResult } from '../study/apkg';
import { nextPosition } from '../study/logic';
import { sfx } from '../sfx';
import { Icon } from './Icon';
import { friendly } from './CardsPanel';

/**
 * Importar un mazo de Anki (.apkg) en 3 pasos: eliges el archivo → ves qué trae y decides cómo → se crean las tarjetas.
 * `existing` son las tarjetas que ya tiene este tema, para no duplicarlas.
 */
export function ApkgImport({ subjectId, topicId, existing, onDone }: {
  subjectId: string; topicId: string; existing: { front: string; back: string }[]; onDone: (topicsChanged: boolean) => void;
}) {
  const [data, setData] = useState<ApkgResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [perDeck, setPerDeck] = useState(false);
  const [keepProgress, setKeepProgress] = useState(true);
  const [skipSuspended, setSkipSuspended] = useState(true);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null); setData(null); setFileName(file.name); setBusy('Leyendo el mazo…');
    try {
      const { loadApkg } = await import('../study/apkgImport'); // se descarga solo ahora
      const res = await loadApkg(file);
      if (!res.cards.length) throw new Error('El mazo no tiene tarjetas.');
      setData(res); setPerDeck(res.decks.length > 1); sfx.open();
    } catch (e) {
      setError(friendly((e as Error).message)); sfx.error();
    } finally { setBusy(null); }
  }

  const chosen = data ? data.cards.filter((c) => !(skipSuspended && c.suspended)) : [];

  async function run() {
    if (!data) return;
    setError(null);
    try {
      // 1. ¿En qué tema va cada mazo?
      const topicOf = new Map<string, string>();
      if (perDeck) {
        setBusy('Creando temas…');
        let pos = nextPosition(await listTopics(subjectId));
        for (const d of data.decks) {
          const title = d.name.split('::').pop()!.slice(0, 120);
          const t = await createTopic({ subject_id: subjectId, title, position: pos++, exam_date: null });
          topicOf.set(d.id, t.id);
        }
      }
      // 2. Tarjetas, sin repetir las que ya están en este tema.
      const seen = new Set(existing.map((c) => `${c.front}\u0000${c.back}`));
      const rows: NewCard[] = [];
      for (const c of chosen) {
        const tid = perDeck ? topicOf.get(c.deckId)! : topicId;
        const key = `${c.front}\u0000${c.back}`;
        if (!perDeck && seen.has(key)) continue;
        seen.add(key);
        rows.push({ topic_id: tid, front: c.front.slice(0, 4000), back: c.back.slice(0, 8000), ...(keepProgress && c.sched ? c.sched : {}) });
      }
      setBusy(`Guardando 0 de ${rows.length}…`);
      await createCards(rows, (n) => setBusy(`Guardando ${n} de ${rows.length}…`));
      sfx.reward();
      setData(null); setBusy(null);
      onDone(perDeck);
    } catch (e) {
      setError(friendly((e as Error).message)); setBusy(null); sfx.error();
    }
  }

  return (
    <div className="apkg">
      {!data && (
        <label className="button" role="button">
          <Icon name="upload" /> Importar mazo de Anki (.apkg)
          <input type="file" accept=".apkg,.colpkg" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      )}
      {busy && <p className="muted small">{busy}</p>}
      {data && !busy && (
        <div className="apkg-preview">
          <p><strong>{fileName}</strong>: {data.cards.length} tarjetas en {data.decks.length} {data.decks.length === 1 ? 'mazo' : 'mazos'}</p>
          <ul className="apkg-decks">
            {data.decks.map((d) => <li key={d.id}><span>{d.name.split('::').join(' › ')}</span> <span className="pill">{d.count}</span></li>)}
          </ul>
          <fieldset>
            <label><input type="radio" checked={!perDeck} onChange={() => setPerDeck(false)} /> Todo en este tema</label>
            <label><input type="radio" checked={perDeck} onChange={() => setPerDeck(true)} /> Un tema nuevo por cada mazo <span className="muted small">(mejor para intercalar)</span></label>
          </fieldset>
          <label><input type="checkbox" checked={keepProgress} onChange={(e) => setKeepProgress(e.target.checked)} /> Conservar el progreso de Anki <span className="muted small">(si no, todas entran como nuevas)</span></label>
          <label><input type="checkbox" checked={skipSuspended} onChange={(e) => setSkipSuspended(e.target.checked)} /> No importar las suspendidas</label>
          <p className="muted small">Las imágenes y los sonidos todavía no se importan: en su lugar verás un aviso.</p>
          <div className="row">
            <button className="primary" onClick={run}><Icon name="check" /> Importar {chosen.length} tarjetas</button>
            <button className="ghost" onClick={() => { setData(null); sfx.tick(); }}>Cancelar</button>
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
