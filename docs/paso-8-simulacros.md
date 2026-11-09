# Paso 8 · Simulacros

Los simulacros van **aparte de las flashcards**: cada asignatura tiene, debajo de sus temas, una pestaña **Simulacros**.

## Quién hace qué

| Pieza | Qué hace |
|---|---|
| La skill (proyecto de Claude) | Crea el simulacro calcado al estilo de tu profe y lo corrige. |
| La web | Lo guarda, te lo pone con reloj, guarda tus respuestas y la corrección, y te enseña la evolución de notas. |

La web no genera ni corrige simulacros: eso ya lo hace bien la skill, y repetirlo aquí sería hacerlo peor. Más adelante (fase 2, conector con Claude) el paso de copiar y pegar desaparecerá.

## El ciclo de un simulacro

```
Sin hacer ──Empezar──► A medias ──Entregar──► Sin corregir ──pegar corrección──► Corregido
   └──────────── «Ya lo he hecho en papel» ─────────►┘
```

1. **Importar**: sueltas el .md de la skill o pegas el texto. El título y la duración se rellenan solos si el enunciado los dice («Duración: 50 min»). Marcas qué temas entran.
2. **Empezar**: el enunciado no se ve hasta este momento. Corre el reloj (cuenta atrás si hay límite) y escribes a la derecha. Las respuestas se guardan solas 1,5 s después de dejar de escribir.
3. **Entregar**: «Copiar para corregir» copia una petición para la skill + el enunciado + tus respuestas. Lo pegas en el proyecto.
4. **Corrección**: pegas lo que te devuelve Claude. Si dice «Nota: 8,3 / 10», la nota se rellena sola (`gradeFromCorrection`).

## La tabla (`supabase/04-simulacros.sql`)

`study_exams`: una fila por simulacro, colgando de una asignatura (`subject_id`). Guarda `statement` (enunciado), `topic_ids` (temas que entran), `time_limit_min`, `answers`, `started_at`, `finished_at`, `duration_sec`, `correction` y `grade` (0 a 10, con un `check` que impide notas fuera de rango).

El estado no se guarda: se **deduce** de esas columnas (`examStatus` en `src/study/exams.ts`). Por ejemplo, si `grade` no es nulo, está corregido. Así nunca puede haber un estado que contradiga los datos.

El reloj cuenta desde `started_at`, que está en la base de datos: si recargas la página o se cierra el navegador, el tiempo no se pierde.

## Tu cambio pequeño

En `src/ui/Exams.tsx`, la función `gradeClass` pinta la nota de rojo por debajo de 5, ámbar hasta 7 y verde desde 7. Como vas a por lo mínimo, quizá prefieras verde desde el 5. Cámbialo y mira la lista de simulacros.

## Explícamelo sin mirar

1. ¿Qué hace la web y qué hace la skill con un simulacro?
2. ¿Por qué el estado (sin hacer, a medias…) no es una columna de la tabla?
3. Si recargas la página a mitad de simulacro, ¿por qué el reloj sigue bien?
4. ¿Cómo sabe la web la nota sin que la escribas?
