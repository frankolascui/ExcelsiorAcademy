# Excelsior Academy

App de estudio ligada al Protocolo Excelsior: resúmenes, flashcards con repetición espaciada y simulacros.

Cómo está hecha, paso a paso: [docs/](docs/). Empieza por [docs/paso-1-montaje.md](docs/paso-1-montaje.md).

## Ponerla en marcha

1. **Supabase:** crea un proyecto nuevo. En *Project Settings → API* copia la *Project URL* y la clave pública (*anon* o *publishable*).
2. **Netlify:** *Add new site → Import an existing project → GitHub → ExcelsiorAcademy*. En *Site configuration → Environment variables* añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con esos valores y vuelve a desplegar.
3. Abre la web de Netlify: debe decir "✅ Conectada a Supabase".

## En tu ordenador (opcional)

```bash
npm install
cp .env.example .env.local   # y rellena los dos valores
npm run dev                  # abre http://localhost:3000
```
