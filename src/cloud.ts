// Conexión con Supabase. Un único cliente para toda la web.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
