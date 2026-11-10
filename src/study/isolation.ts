// Preparar el navegador para el optimizador: registrar public/coi-sw.js y recargar.
const KEY = 'coi-intentado';

export type IsolationState = 'listo' | 'preparar' | 'no-compatible';

export function isolationState(): IsolationState {
  if (globalThis.crossOriginIsolated) return 'listo';
  if (!('serviceWorker' in navigator)) return 'no-compatible';
  let tried = false;
  try { tried = sessionStorage.getItem(KEY) === '1'; } catch { /* sin almacenamiento */ }
  // Si ya lo intentamos en esta pestaña y sigue sin aislarse (p. ej. Safari), no hay nada que hacer.
  return tried && navigator.serviceWorker.controller ? 'no-compatible' : 'preparar';
}

export async function prepareIsolation(): Promise<void> {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ }
  await navigator.serviceWorker.register('./coi-sw.js', { scope: './' });
  await navigator.serviceWorker.ready;
  location.reload();
}
