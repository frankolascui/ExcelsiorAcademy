# Paso 4 · Flashcards con repetición espaciada

Cada tema del archivador tiene ahora dos pestañas: **Hojas** (los resúmenes) y **Tarjetas** (las flashcards).

```
Tema (study_topics)
├── Hojas    → study_pages
└── Tarjetas → study_cards ──► cada respuesta deja una línea en study_reviews
```

## 1. Las tablas (`supabase/02-flashcards.sql`)

- **`study_cards`**: una fila por tarjeta. Guarda `front` (pregunta), `back` (respuesta) y su **estado de memoria**: `due` (cuándo toca), `stability`, `difficulty`, `reps`, `lapses`, `state`…
- **`study_reviews`**: el historial. Cada vez que respondes se añade una fila con la nota (1 a 4), el estado de la tarjeta *antes* de responder y cuántos días faltan para el siguiente repaso.

La seguridad es la misma que en el paso 3: reglas por fila (`auth.uid() = user_id`) y un trigger que impide meter una tarjeta en un tema que no es tuyo.

## 2. La idea de la repetición espaciada

Olvidamos siguiendo una curva: al principio rápido y luego cada vez más despacio. Si repasas justo **cuando estás a punto de olvidar**, el recuerdo se hace más fuerte y tarda más en caer. Por eso los intervalos crecen, por ejemplo: 10 min → 2 d → 8 d → 25 d → 2 meses (los números exactos dependen de cada tarjeta y de tus respuestas).

El algoritmo es **FSRS**, el mismo que usa Anki moderno (librería `ts-fsrs`). Lleva tres números por tarjeta:

| Número | Qué significa |
|---|---|
| **Stability** (estabilidad) | Días que pasan hasta que la probabilidad de recordarla baja al 90 %. Cuanto mayor, más espacio entre repasos. |
| **Difficulty** (dificultad) | De 1 a 10. Sube cuando fallas y hace que la estabilidad crezca más despacio. |
| **Retrievability** (recuperabilidad) | La probabilidad de que la recuerdes *hoy*. Se calcula con la estabilidad y los días que han pasado. |

`request_retention: 0.9` significa: "pregúntame cada tarjeta cuando crea que la recuerdo con un 90 % de probabilidad". Más alto = más repasos y menos olvidos.

## 3. Los cuatro botones

| Botón | Tecla | Qué le dices al algoritmo |
|---|---|---|
| Otra vez | 1 | No la sabía. Vuelve en 10 min y la estabilidad cae (cuenta como *lapse*). |
| Difícil | 2 | La sabía, pero me costó. Intervalo algo más corto. |
| Bien | 3 o espacio | La sabía. Es el botón normal. |
| Fácil | 4 | Demasiado fácil. Salta más lejos. |

Encima de cada botón ves cuándo volvería la tarjeta (`previewIntervals`). Sé honesto: si das "Bien" a algo que no sabías, el algoritmo la aleja y la olvidarás antes del examen.

## 4. Los estados de una tarjeta (`state`)

```
Nueva (0) ──► Aprendiendo (1) ──► Repaso (2) ──► (fallas) ──► Reaprendiendo (3) ──► Repaso (2)
```

- **Aprendiendo**: pasos cortos de 1 y 10 minutos (`learning_steps`) antes de pasar a días.
- **Reaprendiendo**: la sabías y la has fallado; un paso de 10 min y vuelve a Repaso.

## 5. La cola de hoy (`buildQueue` en `src/study/srs.ts`)

1. Primero las tarjetas que **ya tocan** (`due` ≤ ahora), las más atrasadas antes.
2. Después las **nuevas**, como mucho `NEW_PER_DAY = 20` al día. Para saber cuántas llevas, la web cuenta en `study_reviews` las respuestas de hoy con `state = 0`.

El límite de nuevas existe porque cada tarjeta nueva genera repasos durante semanas: una regla habitual entre usuarios de Anki es contar con unas 10 veces más repasos diarios que nuevas, así que 20 nuevas al día pueden acabar siendo unos 200 repasos diarios. Es una estimación, no un cálculo exacto.

Si respondes y la tarjeta vuelve dentro de 20 minutos o menos, se reinserta en esta misma sesión, tres tarjetas más adelante (`requeueIndex`).

## 6. Cómo se mueve un dato (ejemplo: pulsar "Bien")

1. `Review.tsx` llama a `answer(tarjeta, 3, ahora)`, que pide a FSRS el estado nuevo.
2. `saveReview` hace dos cosas a la vez: actualiza la fila de `study_cards` y añade una fila en `study_reviews`.
3. La pantalla no espera a la base de datos: pasa a la siguiente tarjeta enseguida. Si el guardado falla, aparece un error en rojo.

## 7. Crear muchas tarjetas de golpe

En "Pegar o importar muchas a la vez" pega una tarjeta por línea con el formato `pregunta;respuesta`, el mismo de los CSV de flashcards que te da la skill. También vale separar con tabulador (copiar dos columnas de una hoja de cálculo). La primera línea `pregunta;respuesta`, si está, se ignora. Lo hace `parseCardLines`.

La pregunta y la respuesta admiten Markdown: **negrita**, listas y fórmulas `$x^2$`.

## Tu cambio pequeño

En `src/study/srs.ts`, cambia `NEW_PER_DAY` de 20 a 15. Después mira el panel "Hoy" de la estantería: ¿cambia el número de nuevas? Pista: solo cambia si tienes más de 15 tarjetas nuevas. Antes de hacerlo, piensa qué efecto tendrá dentro de un mes.

## Explícamelo sin mirar

1. ¿Qué significa que una tarjeta tenga estabilidad 30?
2. Si pulsas "Otra vez" en una tarjeta de Repaso, ¿a qué estado pasa y cuándo vuelve?
3. ¿Por qué existe un límite de tarjetas nuevas al día, y de dónde saca la web cuántas llevas hoy?
4. ¿Qué dos tablas cambian cuando respondes una tarjeta, y qué se guarda en cada una?
5. ¿Por qué no conviene pulsar "Bien" en una tarjeta que no sabías?
