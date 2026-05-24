import { supabase } from "@/integrations/supabase/client";

/**
 * Wrapper de fetch que anexa o Bearer token do usuário autenticado.
 * Use para chamar rotas /api/* que exigem autenticação.
 */
export async function authedFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(input, { ...init, headers });
}
