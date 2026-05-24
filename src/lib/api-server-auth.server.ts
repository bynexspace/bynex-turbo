// Helpers de autenticação para rotas /api/* (server routes).
// Não importar em código client.
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuthedUser = { userId: string };

/**
 * Valida o Bearer token da requisição. Retorna Response 401 em caso de falha.
 */
export async function authenticateRequest(request: Request): Promise<AuthedUser | Response> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const token = authHeader.slice(7);

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  return { userId: data.claims.sub };
}

/**
 * Confere se o usuário é membro do workspace. Retorna Response 403 caso não seja.
 */
export async function assertWorkspaceMember(userId: string, workspaceId: string): Promise<Response | null> {
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error || !data) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  return null;
}
