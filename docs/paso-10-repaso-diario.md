# Paso 10 · Repaso diario: deshacer, sanguijuelas, hermanas y huecos

Cuatro cosas que Anki tiene y que hacen el repaso de cada día más cómodo y más honesto.
SQL: `supabase/06-repaso.sql` añade dos columnas a `study_cards`: `suspended` y `note_key`.
Si aún no lo has ejecutado, la web sigue funcionando sin estas funciones (`selectCards` en `api.ts` repite la consulta sin esas columnas).

## 1. Deshacer (botón «Deshacer» o tecla Z)

Antes de cada respuesta, la pantalla guarda cómo estaban la cola y la tarjeta (`history` en `Review.tsx`).
Al deshacer: la tarjeta vuelve a la pantalla, su fila en `study_cards` recupera los valores de antes y se **borra** la línea de `study_reviews` que había creado esa respuesta (`saveReview` devuelve su id; `undoReview` la borra). Así el historial no guarda respuestas que no querías dar.

## 2. Sanguijuelas (🪱)

Una tarjeta que has fallado **8 veces** (`LEECH_LAPSES`) casi nunca se arregla repasando más: suele estar mal hecha (demasiado larga, ambigua, dos ideas en una). Al fallarla por 8.ª vez se **aparta** (`suspended = true`) y te aparece un aviso.
En la lista del tema la verás con «🪱 8 fallos» y «apartada». Reescríbela y, en su menú ⋯, pulsa «Volver a repasar». Si la vuelves a fallar 4 veces más, se aparta otra vez (`becomesLeech`).
También puedes apartar a mano cualquier tarjeta que no quieras repasar.

## 3. Tarjetas hermanas

Hermanas = tarjetas de la misma nota: los huecos de una misma frase, o una nota de Anki con su inversa. Comparten `note_key`.
Si salieran el mismo día, una te chivaría la respuesta de la otra. `burySiblings` deja solo la primera de cada nota en la cola; las demás salen otro día.

## 4. Huecos (cloze) al escribir tarjetas

Escribe una frase con huecos en la pregunta:

```
La mitocondria produce {{c1::ATP}} en la {{c2::respiración celular}}
```

Se crean **2 tarjetas hermanas**: en una se tapa «ATP» y en la otra «respiración celular». Con pista: `{{c1::ATP::molécula}}` enseña «[molécula]» en el hueco. Lo de la casilla de respuesta se añade al reverso como nota. La lógica está en `src/study/cloze.ts` (la misma que usa el importador de .apkg).

## Tu cambio pequeño

En `src/study/srs.ts`, cambia `LEECH_LAPSES` de 8 a 6. ¿Qué tests fallan? Arréglalos tú y piensa: ¿tiene sentido un número más bajo en el nivel «Mínimo»?

## Explícamelo sin mirar

1. Al deshacer, ¿qué dos cosas cambian en la base de datos?
2. ¿Por qué apartar una sanguijuela en vez de seguir repasándola?
3. Escribes `{{c1::Madrid}} es la capital de {{c2::España}}`. ¿Cuántas tarjetas salen hoy y por qué?
4. ¿Qué pasa si aún no has ejecutado 06-repaso.sql?
