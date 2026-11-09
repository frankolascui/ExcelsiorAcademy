# Paso 5 · Importar mazos de Anki (.apkg) y ventanas propias

## 1. Qué hay dentro de un .apkg

Un `.apkg` es un **.zip**. Dentro va la colección de Anki, que es una base de datos **SQLite**:

| Archivo | Versión de Anki | Cómo se lee |
|---|---|---|
| `collection.anki21b` | 2.1.50 o posterior | Comprimida con **zstd** → se descomprime (`fzstd`) y se abre con SQLite |
| `collection.anki21` | 2.1 antigua | Se abre directamente |
| `collection.anki2` | Muy antigua | Se abre directamente. En los .apkg nuevos solo trae un aviso de «actualiza Anki» |

`openCollection` (en `src/study/apkg.ts`) elige la mejor que haya. SQLite funciona en el navegador gracias a **sql.js** (SQLite compilado a WebAssembly). Pesa unos 660 kB, así que solo se descarga cuando eliges un .apkg.

## 2. Las tablas de Anki que usamos

- **`notes`**: el contenido. Los campos de una nota van en `flds`, separados por el carácter invisible `\x1f`.
- **`cards`**: cada tarjeta apunta a su nota (`nid`) y a su mazo (`did`). `ord` dice qué tarjeta de la nota es.
- **`decks`** (o un JSON dentro de `col` en las versiones viejas): los nombres de los mazos.

## 3. De nota de Anki a tarjeta nuestra (`readApkg`)

- **Básica:** anverso = primer campo; reverso = el resto de campos.
- **Básica con inversa:** la tarjeta con `ord = 1` es la de al revés.
- **Huecos (cloze):** `{{c1::mitosis}}`. La tarjeta `ord = 0` tapa el hueco c1, la `ord = 1` tapa el c2, etc. Si hay pista (`{{c2::dos::número}}`) se ve `[número]`.

El HTML de Anki se pasa a Markdown con el mismo `turndown` que usamos al pegar apuntes.

**Limitación:** si tus tipos de nota tienen plantillas raras (por ejemplo, el reverso muestra el campo 3 y no el 2), la tarjeta puede salir distinta que en Anki, porque no leemos las plantillas.

## 4. Conservar el progreso (`ankiSchedule`)

- Si en Anki usabas **FSRS**, cada tarjeta guarda su estabilidad y dificultad en el campo `data`. Se copian tal cual, así que el progreso es exacto.
- Si usabas el algoritmo antiguo (SM-2), se hace una **aproximación**: estabilidad ≈ intervalo actual (días) y dificultad media (5). FSRS la irá ajustando con tus respuestas.
- Fechas: Anki guarda la fecha de repaso como «días desde que se creó la colección» (`crt`). Para las tarjetas en aprendizaje, la guarda como segundos desde 1970.

## 5. Ventanas propias (`src/ui/Dialog.tsx`)

`confirm()` y `prompt()` del navegador no se pueden decorar. Ahora hay dos funciones que devuelven una **promesa**:

```ts
if (await askConfirm({ title: '¿Borrar?', danger: true })) { … }
const nombre = await askText({ title: 'Renombrar', initial: 'Tema 1' });
```

`await` espera a que pulses un botón. El componente `DialogHost`, montado una sola vez en `App`, es el que dibuja la ventana.

## Tu cambio pequeño

En `ApkgImport.tsx`, haz que «Conservar el progreso de Anki» venga **desmarcado** por defecto. ¿Qué línea cambias? ¿Cuándo preferirías importar sin progreso?

## Explícamelo sin mirar

1. ¿Por qué no se puede abrir un .apkg nuevo sin descomprimir antes nada?
2. Una nota de huecos tiene c1, c2 y c3. ¿Cuántas tarjetas crea y qué se tapa en cada una?
3. Si no usabas FSRS en Anki, ¿por qué el progreso importado es solo aproximado?
4. ¿Qué hace `await` en `await askConfirm(...)`?
