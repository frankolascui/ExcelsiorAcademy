# Paso 3 · El archivador de resúmenes

La web funciona como un archivador de verdad:

```
Estantería
└── Asignatura (una carpeta con su color)        → tabla study_subjects
    └── Tema (un separador numerado)             → tabla study_topics
        └── Hoja (un resumen en Markdown)        → tabla study_pages
```

## 1. Las tablas (`supabase/01-resumenes.sql`)

Cada nivel es una tabla, y cada fila apunta a su "padre":

- un **tema** guarda `subject_id`, la asignatura a la que pertenece;
- una **hoja** guarda `topic_id`, el tema al que pertenece.

`on delete cascade` significa que si borras una asignatura se borran sus temas, y con ellos sus hojas. Por eso la web pide confirmación antes de borrar.

Cada fila guarda también `user_id`, de quién es. No lo envía la web: la base de datos lo rellena sola con `default auth.uid()`, es decir, con el usuario que ha iniciado sesión.

## 2. La seguridad: reglas por fila (RLS)

La clave de la web es pública, así que cualquiera podría intentar pedir "todas las hojas". Las **reglas por fila** lo impiden. Esta regla dice: solo puedes leer, crear, cambiar o borrar una fila si su `user_id` es el tuyo.

```sql
using (auth.uid() = user_id) with check (auth.uid() = user_id)
```

Hay un hueco que las reglas solas no tapan: crear un tema tuyo dentro de la asignatura de otra persona. Para eso está el trigger `study_check_owner`, que antes de guardar comprueba que el padre también es tuyo.

## 3. El orden: `position`

Cada asignatura, tema y hoja tiene un número `position`. La web lo ordena de menor a mayor.

- **Añadir:** lo nuevo va al final, con la posición más alta + 1 (`nextPosition`).
- **Mover:** las flechas intercambian la posición con el vecino (`swapWithNeighbour`).

Toda esta lógica está en `src/study/logic.ts`, que no habla ni con Supabase ni con la pantalla. Por eso se puede probar sola en `src/study/logic.test.ts`.

## 4. Cómo se mueve un dato (ejemplo: guardar una hoja)

1. Escribes en el editor. React guarda el texto en memoria (`useState`).
2. Pulsas Guardar o Ctrl+S, y se llama a `updatePage` (`src/study/api.ts`).
3. Supabase comprueba la regla por fila, guarda el texto y pone la hora en `updated_at` (trigger `study_touch`).
4. Como está en Supabase, la ves igual en el móvil y en el ordenador de la escuela.

## 5. Las direcciones (`#/a/…/t/…/h/…`)

Lo que va después de `#` en la dirección dice qué estás viendo: `a` es la asignatura, `t` el tema, `h` la hoja y `/editar` el modo edición. Así funciona el botón "atrás" del navegador y puedes guardar una hoja en favoritos. Las funciones son `parseRoute` y `routeToHash`.

## 6. Escribir resúmenes en Markdown

| Escribes | Sale |
| --- | --- |
| `# Título` / `## Apartado` | encabezados |
| `**negrita**` | **negrita** |
| `- punto` | lista |
| `\| a \| b \|` + `\|---\|---\|` | tabla |
| `$x^2$` | fórmula dentro del texto |
| `$$\sin(a+b)=...$$` | fórmula grande y centrada |

Con "Importar .md" subes de golpe los resúmenes que ya te ha hecho Claude: cada archivo se convierte en una hoja, con el primer `#` como título.

## Tu cambio pequeño

En `src/study/logic.ts` está `SUBJECT_COLORS`, los colores de las carpetas. Añade uno nuevo que te guste (formato `#rrggbb`) y comprueba que sale en la estantería.

## Explícamelo sin mirar

1. ¿Qué pasa con las hojas si borras una asignatura, y qué línea del SQL lo hace?
2. ¿Por qué la web no envía `user_id`, y quién lo rellena?
3. Si alguien con la clave pública pide todas las hojas, ¿qué recibe y por qué?
4. ¿Qué dos números cambian al pulsar ↑ en una hoja?
