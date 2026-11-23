// La web antigua de Academy se ha cerrado: este worker se da de baja solo y recarga las pestañas abiertas
// para que vean el aviso de cierre (antes añadía cabeceras para el optimizador de FSRS).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const tabs = await self.clients.matchAll({ type: 'window' });
    for (const tab of tabs) tab.navigate(tab.url);
  })());
});
