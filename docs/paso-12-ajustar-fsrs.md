# Paso 12 · Ajustar FSRS a tu memoria

En **Estadísticas → Ajustar FSRS a tu memoria**. SQL: `supabase/07-ajuste-fsrs.sql` (tabla `study_settings`).

## Qué son los «parámetros»

FSRS tiene **21 números** (`w`) que describen cómo funciona la memoria: cuánto dura una tarjeta nueva según el primer botón (w0 a w3), cuánto crece la estabilidad al acertar, cuánto cae al fallar… Los de por defecto son una media calculada con historiales de muchos usuarios de Anki. Tu memoria y tus asignaturas no son la media: con tu historial se pueden calcular los tuyos.

## Cómo se calculan (`src/study/optimize.ts` y `optimizer.worker.ts`)

1. Se descarga todo tu historial de `study_reviews`, de 1000 en 1000 (Supabase no da más de 1000 filas por consulta).
2. `toAnkiRevlog` lo pasa al formato de Anki: un número por tarjeta, la hora de cada respuesta, la nota y el tipo (aprendiendo / repaso / reaprendiendo).
3. El **optimizador oficial de FSRS** (fsrs-rs, el mismo de Anki, en WebAssembly con la librería `fsrs-browser`) busca los 21 números que mejor predicen tus aciertos y fallos. Se ejecuta en un *Worker* para no congelar la pantalla. Tus datos no salen del navegador.
4. Te enseña la diferencia en algo fácil de entender: cuánto tardaría en volver una tarjeta nueva según el primer botón. Si te convence, «Usar mis parámetros» los guarda en `study_settings` y `setUserParams` rehace los planificadores de `srs.ts`.

Los parámetros nuevos se aplican **desde tu próxima respuesta**. No recalculan lo que ya has repasado.

## Por qué hace falta «Preparar el navegador»

El optimizador usa varios hilos de cálculo, y los navegadores solo lo permiten en páginas «aisladas» (dos cabeceras: COOP y COEP). GitHub Pages no deja poner cabeceras, así que `public/coi-sw.js` (un *service worker*) se las añade a las respuestas de nuestra web. La página se recarga una vez y ya está. En Safari y en el iPhone no funciona: hazlo en Chrome, Edge o Firefox en el ordenador.

## Cuándo hacerlo

A partir de **1000 respuestas** (`MIN_REVIEWS`). Es un límite prudente: con pocos datos los números salen muy inestables. Después, repítelo cada uno o dos meses.

## Arreglo de paso

Las estadísticas y el reparto de nuevas del paso 9 pedían hasta 20 000 o 50 000 filas de golpe, pero Supabase corta en 1000. Ahora todas las listas largas se piden por páginas (`paged` en `api.ts`).

## Tu cambio pequeño

En `src/study/optimize.ts`, baja `MIN_REVIEWS` a 10 solo en tu ordenador y prueba el botón con tus pocos repasos. Mira qué valores salen. ¿Te fiarías de ellos? Vuelve a dejarlo en 1000.

## Explícamelo sin mirar

1. ¿Qué miden w0 a w3?
2. ¿Por qué el cálculo va en un Worker y no en la pantalla principal?
3. ¿Para qué sirve `coi-sw.js`?
4. ¿Por qué no se puede ajustar con 50 repasos?
