# Paso 11 · Estadísticas, puntos débiles y aviso de carga

Botón **Estadísticas** en la estantería. Arriba puedes filtrar por asignatura. No hace falta ejecutar SQL: todo sale de `study_reviews` (el historial) y `study_cards`.
La lógica está en `src/study/stats.ts` (con tests) y la pantalla en `src/ui/Stats.tsx`.

## Qué ves y de dónde sale

| Bloque | Cálculo |
|---|---|
| **Retención real** | De las respuestas a tarjetas que ya estaban en repaso (`state = 2` antes de responder), el % que no fue «Otra vez». Es lo que FSRS intenta que coincida con el objetivo de tu nivel (80, 90 o 95 %). |
| **Respuestas hoy** y **racha** | Cuántas respuestas llevas hoy y cuántos días seguidos has repasado. Si hoy aún no has repasado, la racha cuenta hasta ayer. |
| **Carga prevista** | Tarjetas que tocan los próximos 7 días × lo que tardas de media por tarjeta (`duration_ms` del historial; 10 s si aún no hay datos). |
| **Respuestas al día** | Las de los últimos 30 días. |
| **Lo que te espera** | Las tarjetas en repaso que tocan cada uno de los próximos 14 días. Las atrasadas cuentan para hoy. Las nuevas no entran, porque las eliges tú. |
| **Dominio por tema** | Nuevas, aprendiendo y dominadas. Una tarjeta está dominada cuando su estabilidad llega a 21 días o más (FSRS calcula que tardarías 3 semanas en olvidarla). |
| **Puntos débiles** | Los temas con más % de «Otra vez», solo si tienen al menos 10 respuestas (con 1 fallo de 2 no se puede sacar nada). |

## Los avisos

- **Vas cargado**: aparece cuando la media de los próximos 7 días pasa de 30 minutos (`LOAD_WARN_MIN`). Cómo bajarla: pasar la asignatura a «Mínimo» o no añadir tarjetas nuevas durante unos días. Cada tarjeta nueva genera repasos durante semanas.
- **Recuerdas menos de lo que pide tu nivel**: aparece cuando tu retención real queda más de 5 puntos por debajo del objetivo, con al menos 50 repasos. Casi siempre es por pulsar «Bien» sin saberla o por tarjetas demasiado largas.

## Tu cambio pequeño

En `src/study/stats.ts`, `MASTERED_DAYS = 21`. Cámbialo a 60 y mira cómo cambia el «Dominio por tema». ¿Qué número tiene más sentido para alguien que va a por el mínimo y quiere aprobar en 3 semanas?

## Explícamelo sin mirar

1. ¿Por qué la retención real solo usa tarjetas que ya estaban en repaso y no las nuevas?
2. Si tienes 150 tarjetas al día y tardas 12 s por tarjeta, ¿cuántos minutos son? ¿Sale el aviso?
3. ¿Por qué un tema con 2 fallos de 3 respuestas no aparece en «Puntos débiles»?
