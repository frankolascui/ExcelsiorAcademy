// Cliente de Supabase para el NAVEGADOR (componentes con "use client").
// Lo usaremos para cosas que pasan en tu pantalla, como pulsar "Bien" en una flashcard.
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Faltan las variables de Supabase (mira .env.example)");
  return createBrowserClient(config.url, config.anonKey);
}
