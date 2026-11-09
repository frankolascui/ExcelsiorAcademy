import { describe, expect, it } from 'vitest';
import { Rating, State, type Grade } from 'ts-fsrs';
import { answer, buildQueue, countsFor, formatInterval, parseCardLines, previewIntervals, requeueIndex, dueLabel, sessionSummary } from './srs';
import type { CardRow } from './types';

const now = new Date('2026-11-09T10:00:00Z');
function card(over: Partial<CardRow> = {}): CardRow {
  return {
    id: Math.random().toString(36).slice(2), topic_id: 't', front: 'f', back: 'b',
    due: now.toISOString(), stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0,
    learning_steps: 0, reps: 0, lapses: 0, state: 0, last_review: null, created_at: now.toISOString(), ...over,
  };
}

describe('FSRS', () => {
  it('una tarjeta nueva con «Otra vez» vuelve en minutos; con «Fácil», en días', () => {
    const again = answer(card(), Rating.Again, now);
    const easy = answer(card(), Rating.Easy, now);
    expect(new Date(again.due).getTime() - now.getTime()).toBeLessThan(10 * 60_000);
    expect(new Date(easy.due).getTime() - now.getTime()).toBeGreaterThan(24 * 3600_000);
    expect(easy.state).toBe(State.Review);
    expect(again.reps).toBe(1);
  });
  it('los intervalos crecen de «Otra vez» a «Fácil»', () => {
    const p = previewIntervals(card(), now);
    expect(Object.keys(p)).toHaveLength(4);
    const c = card({ state: 2, stability: 10, difficulty: 5, reps: 5, last_review: '2026-10-30T10:00:00Z', scheduled_days: 10 });
    const ms = ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]).map((g) => new Date(answer(c, g, now).due).getTime());
    expect(ms[0]).toBeLessThan(ms[1]);
    expect(ms[1]).toBeLessThanOrEqual(ms[2]);
    expect(ms[2]).toBeLessThan(ms[3]);
  });
  it('fallar una tarjeta de repaso cuenta un olvido (lapse)', () => {
    const c = card({ state: 2, stability: 10, difficulty: 5, reps: 5, last_review: '2026-10-30T10:00:00Z', scheduled_days: 10 });
    const r = answer(c, Rating.Again, now);
    expect(r.lapses).toBe(1);
    expect(r.state).toBe(State.Relearning);
  });
});

describe('cola de hoy', () => {
  it('primero las atrasadas, luego las nuevas hasta el límite', () => {
    const viejaAtrasada = card({ id: 'a', state: 2, due: '2026-11-01T00:00:00Z' });
    const atrasada = card({ id: 'b', state: 2, due: '2026-11-08T00:00:00Z' });
    const futura = card({ id: 'c', state: 2, due: '2026-11-20T00:00:00Z' });
    const nuevas = [1, 2, 3].map((i) => card({ id: `n${i}`, created_at: `2026-11-0${i}T00:00:00Z` }));
    const q = buildQueue([futura, atrasada, ...nuevas, viejaAtrasada], now, 0, 2);
    expect(q.map((c) => c.id)).toEqual(['a', 'b', 'n1', 'n2']);
    expect(countsFor(q)).toEqual({ nuevas: 2, aprendiendo: 0, repaso: 2 });
  });
  it('si ya hiciste las nuevas de hoy, no salen más', () => {
    expect(buildQueue([card(), card()], now, 20, 20)).toHaveLength(0);
  });
  it('una tarjeta que vuelve en 10 min se repite en la sesión; una de días, no', () => {
    expect(requeueIndex(new Date(now.getTime() + 10 * 60_000), now, 8)).toBe(3);
    expect(requeueIndex(new Date(now.getTime() + 2 * 86_400_000), now, 8)).toBe(-1);
  });
});

describe('formatInterval', () => {
  it.each([
    [30_000, '<1 min'], [10 * 60_000, '10 min'], [3 * 3600_000, '3 h'], [4 * 86_400_000, '4 d'],
    [60 * 86_400_000, '2 mes'], [365 * 86_400_000, '1 años'], [548 * 86_400_000, '1,5 años'],
  ])('%i ms → %s', (ms, txt) => expect(formatInterval(ms)).toBe(txt));
});

describe('parseCardLines', () => {
  it('lee «pregunta;respuesta» y salta la cabecera', () => {
    expect(parseCardLines('pregunta;respuesta\n¿Qué es el canal?;El medio físico\n\nsin separador\n"¿Emisor?";"Quien envía"')).toEqual([
      { front: '¿Qué es el canal?', back: 'El medio físico' },
      { front: '¿Emisor?', back: 'Quien envía' },
    ]);
  });
});

describe('dueLabel y sessionSummary', () => {
  const now = new Date('2026-11-09T10:00:00Z');
  it('etiqueta según el estado y la fecha', () => {
    expect(dueLabel({ state: 0, due: now.toISOString() }, now)).toBe('nueva');
    expect(dueLabel({ state: 2, due: '2026-11-09T09:00:00Z' }, now)).toBe('toca ya');
    expect(dueLabel({ state: 2, due: '2026-11-12T10:00:00Z' }, now)).toBe('en 3 d');
  });
  it('resume una sesión', () => {
    expect(sessionSummary([1, 3, 3, 4])).toEqual({ total: 4, again: 1, retention: 75 });
    expect(sessionSummary([])).toEqual({ total: 0, again: 0, retention: 0 });
  });
});
