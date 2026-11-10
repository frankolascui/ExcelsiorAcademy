# Paso 9 · Fechas de examen y plan día a día

Idea copiada de Knowunity, pero con FSRS debajo: le dices **qué día es el examen y qué temas entran**, y la web reorganiza tus repasos para llegar a ese día.

En cada asignatura, en **Exámenes y simulacros**, pulsa «Añadir examen». Si no marcas temas, entran todos los de la asignatura.

## Qué cambia en tus repasos (`loadQueue` en `Review.tsx`, lógica en `src/study/plan.ts`)

1. **Prioridad.** Las tarjetas de los temas del examen más cercano salen primero (`byPriority`), luego las del siguiente examen y al final el resto. Dentro de cada grupo se siguen intercalando los temas.
2. **Nuevas a tiempo.** Si a tu ritmo (el de tu nivel) no te da tiempo a ver todas las tarjetas nuevas antes del examen, se reparten para terminarlas **la víspera**: `pacedNewPerDay = techo(nuevas que quedan ÷ días que faltan)`, con un tope de 80 al día. Ejemplo: 60 nuevas y faltan 6 días → 10 al día.
3. **Repaso final.** En los 3 últimos días, FSRS calcula para cada tarjeta de esos temas con qué probabilidad la recordarías **a las 9 de la mañana del día del examen** (`get_retrievability`). Si sale por debajo del 90 % (o de tu nivel, si es más alto), la adelanta a hoy. En la tarjeta verás la etiqueta «repaso final».

¿Por qué 90 % aunque tu nivel sea «Mínimo» (80 %)? El nivel decide cuánto repasas durante el curso; el día del examen es justo cuando quieres recordarlo.

## El plan sugerido (`buildPlan`)

- Cada día: las nuevas que tocan y los repasos.
- Simulacros sin apuntes a 6 y 3 días del examen (o uno solo si falta poco), para dejar días de repaso entre medias y que el simulacro mida lo que recuerdas, no lo que acabas de leer.
- La víspera: repasar los fallos del último simulacro y dormir.
- El día del examen: nada nuevo.

Es una sugerencia: la web no te obliga a nada, solo ordena las tarjetas.

En la estantería, el panel «Hoy» muestra los exámenes de las próximas 2 semanas con su cuenta atrás.

## Tu cambio pequeño

En `src/study/plan.ts`, cambia `FINAL_DAYS` de 3 a 2. ¿Qué cambia en el plan de un examen a 9 días? ¿Y en tus repasos?

## Explícamelo sin mirar

1. Tienes 45 tarjetas nuevas, tu nivel da 10 al día y el examen es dentro de 3 días. ¿Cuántas te saca la web hoy?
2. ¿Qué es el «repaso final» y qué número usa para decidir si una tarjeta entra?
3. ¿Por qué los simulacros del plan no son el día antes del examen?
4. Si tienes examen de Lengua en 4 días y de Mates en 10, ¿en qué orden salen las tarjetas?
