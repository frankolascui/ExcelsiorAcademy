import { useEffect, useState } from 'react';
import { signOut, useSession } from './cloud';
import { parseRoute, type Route } from './study/logic';
import { Binder } from './ui/Binder';
import { Login } from './ui/Login';
import { PageView } from './ui/PageView';
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
        <a href="#/" className="brand">Excelsior Academy</a>
        {session && (
          <span className="muted small">
            {session.user.email} · <button className="link" onClick={signOut}>Salir</button>
          </span>
        )}
      </header>

      {session === undefined && <p className="muted">Cargando…</p>}
      {session === null && <Login />}
      {session && route.view === 'estanteria' && <Shelf />}
      {session && route.view === 'asignatura' && <Binder subjectId={route.subjectId} topicId={route.topicId} />}
      {session && route.view === 'hoja' && (
        <PageView subjectId={route.subjectId} topicId={route.topicId} pageId={route.pageId} edit={route.edit} />
      )}
    </main>
  );
}
