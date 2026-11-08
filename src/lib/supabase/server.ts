// Cliente de Supabase para el SERVIDOR (páginas y acciones que se ejecutan en Netlify).
// Lee la sesión del usuario desde las cookies, para saber quién eres en cada petición.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Faltan las variables de Supabase (mira .env.example)");
  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Desde una página (no una acción) no se pueden escribir cookies; no pasa nada.
        }
      },
    },
  });
}
