import { useEffect, useState } from 'react';
import { checkCloud, type CloudStatus } from './cloud';

const SECCIONES = [
  { nombre: 'Resúmenes', paso: 3 },
  { nombre: 'Flashcards', paso: 4 },
  { nombre: 'Simulacros', paso: 6 },
];

const TEXTO: Record<CloudStatus, string> = {
  comprobando: 'Comprobando conexión…',
  conectado: '✅ Conectada a Supabase (el mismo que Excelsior RPG).',
  error: '❌ No llega a Supabase. Revisa la conexión a internet.',
};

export default function App() {
  const [status, setStatus] = useState<CloudStatus>('comprobando');

  // Al abrir la web, comprueba una vez si llega a Supabase.
  useEffect(() => {
    checkCloud().then(setStatus);
  }, []);

  return (
    <main className="page">
      <header>
        <h1>Excelsior Academy</h1>
        <p className="muted">Resúmenes, flashcards y simulacros en un solo sitio.</p>
      </header>

      <section className="card">
        <h2>Estado de la base de datos</h2>
        <p>{TEXTO[status]}</p>
      </section>

      <section>
        <h2>Próximamente</h2>
        <ul className="grid">
          {SECCIONES.map((s) => (
            <li key={s.nombre} className="card">
              <strong>{s.nombre}</strong>
              <span className="muted">Paso {s.paso}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
