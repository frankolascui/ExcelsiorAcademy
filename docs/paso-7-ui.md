# Paso 7 · Revisión de la interfaz

Objetivo: menos botones a la vista y la misma estética en toda la web.

## Qué cambia

- **Importar**: un solo botón abre una ventana. Sueltas el archivo (.apkg, .colpkg, .csv, .txt) o pegas el texto. Si es un .apkg ves los mazos y dos interruptores: «Un tema nuevo por cada mazo» y «Conservar el progreso de Anki». Las tarjetas suspendidas y las repetidas se saltan siempre.
- **Menús ⋯**: renombrar, mover y borrar están dentro de un menú en cada asignatura, tema, hoja y tarjeta. Para editar una tarjeta basta con pulsarla.
- **Nueva asignatura**: es una carpeta más con borde discontinuo; abre una ventana con nombre y color.
- **Nivel**: un selector compacto junto al título de la asignatura.

## Piezas nuevas (`src/ui/Kit.tsx`)

| Pieza | Qué hace |
|---|---|
| `Modal` | Ventana con título, contenido y pie de botones. Se cierra con Esc o pulsando fuera. |
| `Menu` | El botón ⋯ con su lista de acciones. Se cierra al pulsar fuera o con Esc. |
| `DropZone` | Zona para soltar archivos o pulsar y elegirlos. |
| `Toggle` | Interruptor de sí/no. |

La idea: cada pieza se escribe una vez y se reutiliza. Si mañana cambias el estilo de `Modal`, cambian todas las ventanas.

## Tu cambio pequeño

En `src/ui/Shelf.tsx`, quita la opción «Mover después» del menú de cada asignatura. ¿Sigues pudiendo ordenar las carpetas? ¿Por qué?

## Explícamelo sin mirar

1. ¿Por qué conviene tener `Modal` y `Menu` en un archivo aparte en lugar de escribirlos en cada pantalla?
2. Al importar un .apkg, ¿qué pasa con las tarjetas suspendidas y con las repetidas?
3. ¿Qué tienes que hacer ahora para editar una tarjeta?
