import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
 * Recebe userId explicitamente do client (auth-context já validou a sessão).
 * Auto-seed: se não há admins ainda, o primeiro user vira admin.
 * Sempre retorna estrutura previsível — nunca lança.
 */
export const checkAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { count } = await supabaseAdmin
        .from("app_admins")
        .select("*", { count: "exact", head: true });

      if ((count ?? 0) === 0) {
        await supabaseAdmin.from("app_admins").insert({ user_id: data.userId });
        return { isAdmin: true, bootstrapped: true };
      }

      const { data: row } = await supabaseAdmin
        .from("app_admins")
        .select("user_id")
        .eq("user_id", data.userId)
        .maybeSingle();
      return { isAdmin: !!row, bootstrapped: false };
    } catch (e) {
      console.error("checkAdmin failed:", e);
      return { isAdmin: false, bootstrapped: false };
    }
  });

export const listAllWorkspaces = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin(data.userId);
    const { data: workspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id, nome, plano, status, stripe_customer_id, created_at")
      .order("created_at", { ascending: false });

    if (!workspaces) return { workspaces: [], kpis: { total: 0, mrr: 0, leads: 0, users: 0, ativos: 0 } };

    const ids = workspaces.map((w) => w.id);
    const [leadsRes, membersRes, authUsersRes] = await Promise.all([
      supabaseAdmin.from("leads").select("workspace_id", { count: "exact" }),
      supabaseAdmin
        .from("workspace_members")
        .select("workspace_id, user_id, role, profiles!inner(email, full_name)")
        .in("workspace_id", ids),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const leadsByWs: Record<string, number> = {};
    (leadsRes.data ?? []).forEach((l: any) => {
      leadsByWs[l.workspace_id] = (leadsByWs[l.workspace_id] ?? 0) + 1;
    });
    const ownersByWs: Record<string, { user_id: string; email: string; full_name: string | null }> = {};
    const usersByWs: Record<string, number> = {};
    (membersRes.data ?? []).forEach((m: any) => {
      usersByWs[m.workspace_id] = (usersByWs[m.workspace_id] ?? 0) + 1;
      if (m.role === "owner") {
        ownersByWs[m.workspace_id] = { user_id: m.user_id, ...m.profiles };
      }
    });

    const lastSignInByUser: Record<string, string | null> = {};
    (authUsersRes.data?.users ?? []).forEach((u: any) => {
      lastSignInByUser[u.id] = u.last_sign_in_at ?? null;
    });

    const PRICES = { essencial: 1500, pro: 2500, premium: 4500 } as const;
    const enriched = workspaces.map((w) => {
      const owner = ownersByWs[w.id] ?? null;
      return {
        ...w,
        leads: leadsByWs[w.id] ?? 0,
        users: usersByWs[w.id] ?? 0,
        owner,
        last_sign_in_at: owner ? lastSignInByUser[owner.user_id] ?? null : null,
        mrr: w.status === "ativo" ? (PRICES[w.plano as keyof typeof PRICES] ?? 0) : 0,
      };
    });

    const totalUsers = (membersRes.data ?? []).length;
    const totalLeads = (leadsRes.data ?? []).length;
    const mrr = enriched.reduce((s, w) => s + w.mrr, 0);
    const ativos = enriched.filter((w) => w.status === "ativo").length;

    return {
      workspaces: enriched,
      kpis: { total: workspaces.length, mrr, leads: totalLeads, users: totalUsers, ativos },
    };
  });

export const updateWorkspacePlan = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        plano: z.enum(["essencial", "pro", "premium"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertAdmin(data.userId);
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ plano: data.plano })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateWorkspaceStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        status: z.enum(["ativo", "suspenso"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertAdmin(data.userId);
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ status: data.status })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        redirectTo: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertAdmin(data.userId);

    // Buscar o owner do workspace
    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id, profiles!inner(email)")
      .eq("workspace_id", data.workspaceId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    const email = (member as any)?.profiles?.email;
    if (!email) throw new Error("Owner do workspace não encontrado");

    // resetPasswordForEmail dispara o e-mail via SMTP do Supabase
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);

    return { ok: true, email };
  });

function genPassword(len = 12) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

/**
 * Cria um cliente novo: user no auth + workspace + membership owner.
 * O trigger handle_new_user já cria workspace + membership + integrations,
 * então renomeamos o workspace pré-criado e ajustamos o plano.
 */
export const createClient = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        email: z.string().email(),
        fullName: z.string().min(1),
        workspaceName: z.string().min(1),
        plano: z.enum(["essencial", "pro", "premium"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertAdmin(data.userId);

    const senhaProvisoria = genPassword(12);

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: senhaProvisoria,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Falha ao criar usuário");
    }

    const newUserId = created.data.user.id;

    // O trigger handle_new_user já criou: profile + workspace + membership(owner) + integrations.
    // Buscamos o workspace recém-criado (owner = newUserId) e ajustamos nome/plano.
    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", newUserId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    let workspaceId = member?.workspace_id;

    if (workspaceId) {
      await supabaseAdmin
        .from("workspaces")
        .update({ nome: data.workspaceName, plano: data.plano, status: "ativo" })
        .eq("id", workspaceId);
    } else {
      // Fallback caso o trigger não tenha rodado
      const { data: ws, error: wsErr } = await supabaseAdmin
        .from("workspaces")
        .insert({ nome: data.workspaceName, plano: data.plano, status: "ativo" })
        .select("id")
        .single();
      if (wsErr || !ws) throw new Error(wsErr?.message ?? "Falha ao criar workspace");
      workspaceId = ws.id;
      await supabaseAdmin
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: newUserId, role: "owner" });
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: newUserId, email: data.email, full_name: data.fullName });
    }

    return {
      ok: true,
      email: data.email,
      senhaProvisoria,
      workspaceId,
    };
  });
