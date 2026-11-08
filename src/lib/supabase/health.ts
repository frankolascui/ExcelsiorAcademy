// Comprueba si la app llega a Supabase. Solo pregunta "¿estás vivo?" al servicio
// de inicio de sesión; no lee ni escribe datos tuyos.
import { getSupabaseConfig } from "./config";

export type SupabaseStatus =
  | { state: "sin-configurar" }
  | { state: "conectado" }
  | { state: "error"; detail: string };

export async function checkSupabase(): Promise<SupabaseStatus> {
  const config = getSupabaseConfig();
  if (!config) return { state: "sin-configurar" };

  try {
    const res = await fetch(`${config.url}/auth/v1/health`, {
      headers: { apikey: config.anonKey },
      cache: "no-store",
    });
    if (res.ok) return { state: "conectado" };
    return { state: "error", detail: `Supabase respondió ${res.status}` };
  } catch (e) {
    return { state: "error", detail: e instanceof Error ? e.message : "sin respuesta" };
  }
}
