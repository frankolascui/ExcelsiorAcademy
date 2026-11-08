# Paso 1 · Montaje: cómo está hecha la web

Excelsior Academy es una web **aparte** de Excelsior RPG, pero usa **el mismo Supabase**. Así puedes probarla sin tocar la app del juego, y tu cuenta será la misma en las dos. Está hecha con las mismas herramientas que Excelsior RPG para que fusionarlas en el futuro sea fácil.

## Las tres piezas

| Pieza | Qué es | Analogía |
| --- | --- | --- |
| **Vite + React** | El código de la web: las pantallas y la lógica. Vive en este repositorio. | La cocina y las recetas |
| **Supabase** | La base de datos y las cuentas. Es la misma que usa Excelsior RPG. | La despensa, compartida con el restaurante de al lado |
| **Netlify** | Publica la web en internet y la vuelve a publicar cada vez que cambia `main`. Tiene su propio sitio, distinto del de Excelsior RPG. | El local abierto al público |

## Cómo viaja un dato

1. Abres la web en el navegador (casa, escuela o móvil).
2. Netlify te envía el código: un HTML, un CSS y un JavaScript.
3. Ese JavaScript se ejecuta **en tu navegador** y le pide los datos a Supabase.
4. Supabase comprueba **quién eres** y solo devuelve **tus** datos.
5. React dibuja la pantalla con esos datos.

Como los datos viven en Supabase y no en tu ordenador, los ves iguales en cualquier dispositivo. Eso es la sincronización.

## La clave pública y la seguridad

`src/cloud-config.ts` tiene la dirección de Supabase y una **clave pública**, las mismas que Excelsior RPG. Cualquiera puede verlas, y no pasa nada: la seguridad está en las **reglas por fila** (RLS) de cada tabla, que dicen "cada alumno solo puede leer y cambiar sus propias filas". Excelsior RPG ya lo hace así con la tabla `saves`.

La **clave secreta** (service_role) nunca va en el código.

## Compartir Supabase sin romper el juego

Como la base de datos es la misma, en el paso 2 seguiremos tres reglas:

- Las tablas del estudio empiezan por `study_` para no chocar con las del juego.
- Solo **añadimos** tablas: no cambiamos ni borramos nada de Excelsior RPG.
- Cada tabla nueva tiene sus reglas por fila desde el primer momento.

## Qué hace la página ahora

`src/App.tsx` llama a `checkCloud()` (`src/cloud.ts`), que pregunta a Supabase "¿estás vivo?", y muestra ✅ o ❌. `src/cloud.test.ts` comprueba esa lógica sin salir a internet.

## Tu cambio pequeño

En `src/App.tsx` hay una lista `SECCIONES`. Añade una cuarta, "Panel de notas", con el paso que creas que le toca.

## Explícamelo sin mirar

1. ¿Qué hace cada una de las tres piezas?
2. ¿Por qué tu cuenta será la misma en Excelsior RPG y en Excelsior Academy?
3. ¿Por qué no pasa nada si alguien ve la clave pública, y qué protege de verdad tus datos?
