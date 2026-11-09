# Excelsior Academy

Web de estudio ligada al Protocolo Excelsior: resúmenes, flashcards con repetición espaciada y simulacros. Web aparte de [Excelsior RPG](https://github.com/frankolascui/Excelsior), con el mismo Supabase y las mismas herramientas (Vite + React + TypeScript), para fusionarlas en el futuro.

Cómo está hecha, paso a paso: [docs/](docs/). Empieza por [docs/paso-1-montaje.md](docs/paso-1-montaje.md).

## Base de datos

El SQL de cada paso está en [supabase/](supabase/). Se ejecuta una vez en *Supabase → SQL Editor*, en el mismo proyecto que Excelsior RPG. Solo añade tablas `study_*`; no toca nada del juego.

1. `01-resumenes.sql`: asignaturas, temas y hojas (paso 3).
2. `02-flashcards.sql`: tarjetas y su historial de repasos (paso 4).
3. `03-niveles.sql`: nivel de exigencia por asignatura (paso 6).
4. `04-simulacros.sql`: simulacros con tus respuestas, la corrección y la nota (paso 8).

## Probar en GitHub Pages (gratis)

Cada push a `main` o a una rama `paso-*` publica la web en la rama `gh-pages` (`.github/workflows/pages.yml`). Una sola vez: *Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / `(root)`*. Dirección: https://frankolascui.github.io/ExcelsiorAcademy/

## Publicar en Netlify

*Add new site → Import an existing project → GitHub → ExcelsiorAcademy*. Netlify lee `netlify.toml` (build `npm run build`, carpeta `dist`). No hace falta poner variables: usa el Supabase de Excelsior RPG por defecto.

## Comandos

```bash
npm install
npm run dev     # desarrollo
npm test        # tests (vitest)
npm run build   # build en dist/
```
