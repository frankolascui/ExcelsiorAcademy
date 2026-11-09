# Paso 6 · Nivel de exigencia por asignatura

No todos los alumnos buscan lo mismo. Cada asignatura tiene un **nivel** que se elige arriba, en su archivador:

| Nivel | Retención objetivo | Nuevas al día | Para quién |
|---|---|---|---|
| Mínimo | 80 % | 10 | Aprobar con el menor tiempo posible |
| Equilibrado | 90 % | 20 | Lo importante de cada tema (por defecto) |
| Al detalle | 95 % | 30 | Ir a por el 10 |

Los números están en `LEVELS` (`src/study/srs.ts`) y se pueden ajustar.

## 1. Qué cambia la retención

FSRS te pregunta una tarjeta cuando calcula que la probabilidad de recordarla ha bajado hasta la **retención objetivo**.

- Con un 80 %, deja que la memoria baje más antes de preguntarte. Los intervalos son más largos y haces menos repasos, a cambio de fallar más.
- Con un 95 %, te pregunta antes, cuando todavía la sabes casi seguro. Haces más repasos y fallas muy poco.

El coste no es lineal: subir del 90 % al 95 % añade bastantes más repasos que bajar del 90 % al 80 % te ahorra. Por eso «Al detalle» es caro.

Cambiar el nivel no mueve las fechas que ya están puestas. Afecta a partir de la siguiente vez que respondes cada tarjeta.

## 2. Nuevas al día por asignatura

Antes había un solo límite de 20 nuevas para todo. Ahora cada asignatura tiene el suyo. Para saber cuántas llevas hoy en cada una, la web pide a `study_reviews` los repasos de hoy de tarjetas nuevas y, en la misma consulta, el tema de cada tarjeta (`study_cards(topic_id)`). Con eso sabe de qué asignatura es cada una. Lo calcula `newRoom`.

## 3. La base de datos (`supabase/03-niveles.sql`)

Añade la columna `level` a `study_subjects`, con valor por defecto `equilibrado`. Si todavía no lo has ejecutado, la web sigue funcionando con el nivel Equilibrado, pero no te deja cambiarlo.

## Tu cambio pequeño

En `LEVELS`, cambia las nuevas al día de «Mínimo» de 10 a 8. ¿Qué pasa con los repasos diarios al cabo de un mes?

## Explícamelo sin mirar

1. ¿Por qué con retención del 80 % los intervalos son más largos?
2. Si cambias una asignatura de Equilibrado a Al detalle, ¿cambian ya las fechas de sus tarjetas?
3. ¿Cómo sabe la web cuántas tarjetas nuevas de Mates has empezado hoy?
