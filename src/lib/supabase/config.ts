// Lee la dirección y la clave pública de Supabase desde las variables de entorno.
// Si faltan, devuelve null para que la app lo muestre en vez de romperse.
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
