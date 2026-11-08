import { checkSupabase } from "@/lib/supabase/health";

// Esta página se genera en el servidor en cada visita, para que el estado sea real.
export const dynamic = "force-dynamic";

const SECCIONES = [
  { nombre: "Resúmenes", paso: 3 },
  { nombre: "Flashcards", paso: 4 },
  { nombre: "Simulacros", paso: 6 },
];

export default async function Home() {
  const status = await checkSupabase();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold">Excelsior Academy</h1>
        <p className="mt-2 opacity-70">Resúmenes, flashcards y simulacros en un solo sitio.</p>
      </header>

      <section className="rounded-lg border border-current/20 p-4">
        <h2 className="font-semibold">Estado de la base de datos</h2>
        <p className="mt-1">
          {status.state === "conectado" && "✅ Conectada a Supabase."}
          {status.state === "sin-configurar" &&
            "⚠️ Falta configurar Supabase: añade las variables de .env.example."}
          {status.state === "error" && `❌ No llega a Supabase (${status.detail}).`}
        </p>
      </section>

      <section>
        <h2 className="font-semibold">Próximamente</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {SECCIONES.map((s) => (
            <li key={s.nombre} className="rounded-lg border border-current/20 p-4">
              <p className="font-medium">{s.nombre}</p>
              <p className="text-sm opacity-60">Paso {s.paso}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
