# Paso 1 · Montaje: cómo está hecha la app

Este paso no tiene funciones de estudio todavía. Monta las tres piezas y comprueba que se hablan entre ellas.

## Las tres piezas

| Pieza | Qué es | Analogía |
| --- | --- | --- |
| **Next.js** | El código de la app: las pantallas y la lógica. Vive en este repositorio. | La cocina y las recetas |
| **Supabase** | La base de datos y el inicio de sesión. Guarda tus resúmenes, tarjetas y repasos. | La despensa |
| **Netlify** | El servidor que publica la app en internet y la vuelve a publicar cada vez que cambia el código. | El restaurante abierto al público |

## Cómo viaja un dato

1. Abres la app en el navegador (casa, escuela o móvil).
2. Netlify ejecuta el código de Next.js y prepara la página.
3. Si la página necesita datos (por ejemplo, las tarjetas de hoy), Next.js se los pide a Supabase.
4. Supabase comprueba **quién eres** y solo devuelve **tus** datos.
5. La página llega a tu pantalla ya con los datos.

Como los datos viven en Supabase y no en tu ordenador, los ves iguales en cualquier dispositivo. Eso es la sincronización.

## Dos tipos de código

- **Servidor** (`src/lib/supabase/server.ts`): se ejecuta en Netlify antes de que la página llegue a ti. Sirve para leer datos y preparar la pantalla.
- **Navegador** (`src/lib/supabase/client.ts`): se ejecuta en tu pantalla. Sirve para lo que haces con clics, como pulsar "Bien" en una flashcard.

## La clave pública y la seguridad

La app usa una **clave pública** de Supabase que cualquiera puede ver en el navegador. No es un fallo: la seguridad no está en esa clave, sino en las **reglas de la base de datos** (en Supabase se llaman RLS). Esas reglas dicen "cada alumno solo puede leer y cambiar sus propias filas". Las montaremos en el paso 2.

La **clave secreta** (service_role) nunca va en el código ni en el navegador.

## Qué hace la página de inicio ahora

`src/app/page.tsx` pregunta a Supabase "¿estás vivo?" (`src/lib/supabase/health.ts`) y muestra uno de tres estados:

- ✅ conectada,
- ⚠️ faltan las variables,
- ❌ no llega.

Es la prueba de que las tres piezas funcionan juntas.

## Tu cambio pequeño

En `src/app/page.tsx` hay una lista `SECCIONES`. Añade una cuarta sección, "Panel de notas", con el paso que creas que le toca. Pista: mira el plan de la fase 1.

## Explícamelo sin mirar

Cuando lo tengas, respóndeme sin mirar este archivo:

1. ¿Qué hace cada una de las tres piezas?
2. ¿Por qué ves los mismos datos en el ordenador de la escuela y en el móvil?
3. ¿Por qué no pasa nada si alguien ve la clave pública, y qué es lo que de verdad protege tus datos?
