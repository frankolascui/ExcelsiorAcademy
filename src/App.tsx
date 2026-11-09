import { useEffect, useState } from 'react';
import { signOut, useSession } from './cloud';
import { isMuted, setMuted, sfx } from './sfx';
import { parseRoute, type Route } from './study/logic';
import { Binder } from './ui/Binder';
import { Login } from './ui/Login';
import { PageView } from './ui/PageView';
import { Review } from './ui/Review';
import { DialogHost } from './ui/Dialog';
import { ExamView } from './ui/ExamView';
import { Shelf } from './ui/Shelf';

/** La ruta actual sale de la parte de la dirección después de #. */
function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash));
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export default function App() {
  const session = useSession();
  const route = useRoute();

  return (
    <main className="page">
      <header className="top">
        <a href="#/" className="brand">Excelsior <span>Academy</span></a>
        <div className="top-right">
          {session && (
            <span className="muted small who">
              {session.user.email} · <button className="link" onClick={() => { sfx.tick(); signOut(); }}>Salir</button>
            </span>
          )}
          <SoundToggle />
        </div>
      </header>

      {session === undefined && <p className="muted">Cargando…</p>}
      {session === null && <Login />}
      {session && route.view === 'estanteria' && <Shelf />}
      {session && route.view === 'asignatura' && <Binder subjectId={route.subjectId} topicId={route.topicId} />}
      {session && route.view === 'simulacros' && <Binder subjectId={route.subjectId} section="simulacros" />}
      {session && route.view === 'simulacro' && <ExamView subjectId={route.subjectId} examId={route.examId} />}
      {session && route.view === 'repasar' && <Review key={location.hash} subjectId={route.subjectId} topicIds={route.topicIds} />}
      {session && route.view === 'hoja' && (
        <PageView subjectId={route.subjectId} topicId={route.topicId} pageId={route.pageId} edit={route.edit} />
      )}
      <DialogHost />
    </main>
  );
}

/** Botón de silencio, como en Excelsior RPG. La preferencia se guarda en este navegador. */
function SoundToggle() {
  const [muted, setM] = useState(isMuted());
  return (
    <button
      className="icon-round"
      aria-pressed={muted}
      title={muted ? 'Activar sonido' : 'Silenciar'}
      onClick={() => {
        setMuted(!muted);
        setM(!muted);
        if (muted) sfx.tick();
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
