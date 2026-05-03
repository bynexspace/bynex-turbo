import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: somente administradores");
}

/**
 * Auto-seed: se NÃO existe nenhum admin ainda, o primeiro user a chamar isAdmin
 * vira admin automaticamente. Útil pro bootstrap inicial.
 */
export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { count } = await supabaseAdmin
      .from("app_admins")
      .select("*", { count: "exact", head: true });

    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("app_admins").insert({ user_id: userId });
      return { isAdmin: true, bootstrapped: true };
    }

    const { data } = await supabaseAdmin
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return { isAdmin: !!data, bootstrapped: false };
  });

export const listAllWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: workspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id, nome, plano, stripe_customer_id, created_at")
      .order("created_at", { ascending: false });

    if (!workspaces) return { workspaces: [], kpis: { total: 0, mrr: 0, leads: 0, users: 0 } };

    const ids = workspaces.map((w) => w.id);
    const [leadsRes, membersRes] = await Promise.all([
      supabaseAdmin.from("leads").select("workspace_id", { count: "exact" }),
      supabaseAdmin.from("workspace_members").select("workspace_id, user_id, role, profiles!inner(email, full_name)").in("workspace_id", ids),
    ]);

    const leadsByWs: Record<string, number> = {};
    (leadsRes.data ?? []).forEach((l: any) => {
      leadsByWs[l.workspace_id] = (leadsByWs[l.workspace_id] ?? 0) + 1;
    });
    const ownersByWs: Record<string, { email: string; full_name: string | null }> = {};
    const usersByWs: Record<string, number> = {};
    (membersRes.data ?? []).forEach((m: any) => {
      usersByWs[m.workspace_id] = (usersByWs[m.workspace_id] ?? 0) + 1;
      if (m.role === "owner") ownersByWs[m.workspace_id] = m.profiles;
    });

    const PRICES = { essencial: 1500, pro: 2500, premium: 4500 } as const;
    const enriched = workspaces.map((w) => ({
      ...w,
      leads: leadsByWs[w.id] ?? 0,
      users: usersByWs[w.id] ?? 0,
      owner: ownersByWs[w.id] ?? null,
      mrr: PRICES[w.plano as keyof typeof PRICES] ?? 0,
    }));

    const totalUsers = (membersRes.data ?? []).length;
    const totalLeads = (leadsRes.data ?? []).length;
    const mrr = enriched.reduce((s, w) => s + w.mrr, 0);

    return {
      workspaces: enriched,
      kpis: { total: workspaces.length, mrr, leads: totalLeads, users: totalUsers },
    };
  });

export const updateWorkspacePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        plano: z.enum(["essencial", "pro", "premium"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ plano: data.plano })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
