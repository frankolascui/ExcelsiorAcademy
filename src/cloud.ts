// Conexión con Supabase. Un único cliente para toda la web.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './cloud-config';

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export type CloudStatus = 'comprobando' | 'conectado' | 'error';

/**
 * Pregunta a Supabase "¿estás vivo?" sin leer ni escribir datos de nadie.
 * `doFetch` se puede cambiar en los tests para no salir a internet.
 */
export async function checkCloud(doFetch: typeof fetch = fetch): Promise<Exclude<CloudStatus, 'comprobando'>> {
  try {
    const res = await doFetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_ANON_KEY } });
    return res.ok ? 'conectado' : 'error';
  } catch {
    return 'error';
  }
}

// ---------- Cuenta (la misma que en Excelsior RPG) ----------
// Login con un código que llega al email. La sesión se guarda en este navegador.


/** Sesión actual: undefined mientras se comprueba, null si no has entrado. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    sb().auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/** Traduce el error de Supabase y deja el original entre paréntesis para poder diagnosticarlo. */
export function friendlyAuthError(err: { message: string; code?: string }, step: 'send' | 'verify'): string {
  const m = `${err.code ?? ''} ${err.message}`;
  let text: string;
  if (/rate|too many|seconds/i.test(m)) text = 'Has pedido demasiados códigos. Espera un poco y vuelve a intentarlo.';
  else if (step === 'verify' && /expired|invalid|token|otp/i.test(m)) text = 'Código incorrecto o caducado. Pide uno nuevo.';
  else if (step === 'send' && /invalid.*email|email.*invalid|validate email/i.test(m)) text = 'Ese email no parece válido.';
  else if (/fetch|network|load failed/i.test(m)) text = 'No se pudo conectar con el servidor. Revisa tu conexión.';
  else text = 'Algo falló al conectar con el servidor.';
  return `${text} (${err.message})`;
}

export async function sendCode(email: string): Promise<string | null> {
  const { error } = await sb().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  return error ? friendlyAuthError(error, 'send') : null;
}

export async function verifyCode(email: string, code: string): Promise<string | null> {
  const { error } = await sb().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  return error ? friendlyAuthError(error, 'verify') : null;
}

export async function signOut() {
  await sb().auth.signOut();
}
