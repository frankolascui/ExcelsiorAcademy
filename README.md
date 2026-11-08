# Excelsior Academy

Web de estudio ligada al Protocolo Excelsior: resúmenes, flashcards con repetición espaciada y simulacros. Web aparte de [Excelsior RPG](https://github.com/frankolascui/Excelsior), con el mismo Supabase y las mismas herramientas (Vite + React + TypeScript), para fusionarlas en el futuro.

Cómo está hecha, paso a paso: [docs/](docs/). Empieza por [docs/paso-1-montaje.md](docs/paso-1-montaje.md).

## Publicar en Netlify

*Add new site → Import an existing project → GitHub → ExcelsiorAcademy*. Netlify lee `netlify.toml` (build `npm run build`, carpeta `dist`). No hace falta poner variables: usa el Supabase de Excelsior RPG por defecto.

## Comandos

```bash
npm install
npm run dev     # desarrollo
npm test        # tests (vitest)
npm run build   # build en dist/
```
