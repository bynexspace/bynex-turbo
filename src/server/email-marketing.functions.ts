import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  brevoCreateSender,
  brevoListSenders,
  brevoSendEmail,
} from "@/lib/brevo.server";

// ============================================================
// Helpers internos
// ============================================================

async function assertWorkspacePremium(userId: string, workspaceId: string) {
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id, workspaces!inner(plano, status)")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!member) throw new Error("Workspace não encontrado ou sem acesso");
  // @ts-ignore relacionamento
  const ws = member.workspaces;
  if (ws.status !== "ativo") throw new Error("Workspace suspenso");
  if (ws.plano !== "premium") {
    throw new Error("Funcionalidade exclusiva do plano Premium");
  }
}

function renderTemplate(html: string, vars: Record<string, any>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = key.split(".").reduce((acc: any, k: string) => acc?.[k], vars);
    return value == null ? "" : String(value);
  });
}

function appendUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const footer = `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px" />
    <p style="font-family:Arial,sans-serif;font-size:11px;color:#9ca3af;text-align:center;line-height:1.5">
      Você está recebendo este email porque está em nossa lista de contatos.<br/>
      <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline">Descadastrar</a>
    </p>
  `;
  if (html.includes("</body>")) return html.replace("</body>", `${footer}</body>`);
  return html + footer;
}

// ============================================================
// SENDERS
// ============================================================

export const listSenders = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), workspaceId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    const { data: rows } = await supabaseAdmin
      .from("email_senders")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    return { senders: rows ?? [] };
  });

export const addSender = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        email: z.string().email().max(255),
        nomeExibicao: z.string().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    // Cria sender no Brevo (envia email de confirmação para o endereço)
    let providerSenderId: string | null = null;
    try {
      const created = await brevoCreateSender(data.email, data.nomeExibicao);
      providerSenderId = String(created.id);
    } catch (e: any) {
      // Brevo retorna erro se já existe — tenta listar
      const list = await brevoListSenders();
      const existing = list.senders?.find((s) => s.email === data.email);
      if (existing) providerSenderId = String(existing.id);
      else throw new Error(`Falha ao criar remetente no Brevo: ${e.message}`);
    }
    const { data: row, error } = await supabaseAdmin
      .from("email_senders")
      .insert({
        workspace_id: data.workspaceId,
        email: data.email,
        nome_exibicao: data.nomeExibicao,
        provider_sender_id: providerSenderId,
        status: "pendente",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { sender: row };
  });

export const checkSenderStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        senderId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    const { data: sender } = await supabaseAdmin
      .from("email_senders")
      .select("*")
      .eq("id", data.senderId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (!sender) throw new Error("Remetente não encontrado");
    const list = await brevoListSenders();
    const remote = list.senders?.find((s) => s.email === sender.email);
    const newStatus = remote?.active ? "verificado" : "pendente";
    if (newStatus !== sender.status) {
      await supabaseAdmin
        .from("email_senders")
        .update({
          status: newStatus,
          verified_at: newStatus === "verificado" ? new Date().toISOString() : null,
        })
        .eq("id", sender.id);
    }
    return { status: newStatus };
  });

export const deleteSender = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        senderId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    await supabaseAdmin
      .from("email_senders")
      .delete()
      .eq("id", data.senderId)
      .eq("workspace_id", data.workspaceId);
    return { ok: true };
  });

// ============================================================
// TEMPLATES
// ============================================================

export const listTemplates = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), workspaceId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    const { data: rows } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("updated_at", { ascending: false });
    return { templates: rows ?? [] };
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        id: z.string().uuid().optional(),
        nome: z.string().min(1).max(120),
        assunto: z.string().min(1).max(255),
        html: z.string().min(1).max(200000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    // Extrai variáveis {{nome}} do HTML+assunto
    const re = /\{\{\s*([\w.]+)\s*\}\}/g;
    const vars = new Set<string>();
    for (const m of (data.html + " " + data.assunto).matchAll(re)) vars.add(m[1]);
    const variaveis = Array.from(vars);

    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("email_templates")
        .update({ nome: data.nome, assunto: data.assunto, html: data.html, variaveis })
        .eq("id", data.id)
        .eq("workspace_id", data.workspaceId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { template: row };
    }
    const { data: row, error } = await supabaseAdmin
      .from("email_templates")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        assunto: data.assunto,
        html: data.html,
        variaveis,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { template: row };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    await supabaseAdmin
      .from("email_templates")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId);
    return { ok: true };
  });

// ============================================================
// LISTAS
// ============================================================

export const listLists = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), workspaceId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    const { data: lists } = await supabaseAdmin
      .from("email_lists")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });

    // Count members
    const enriched = await Promise.all(
      (lists ?? []).map(async (l) => {
        if (l.tipo === "manual") {
          const { count } = await supabaseAdmin
            .from("email_list_members")
            .select("*", { count: "exact", head: true })
            .eq("list_id", l.id);
          return { ...l, contagem: count ?? 0 };
        }
        const count = await countSmartList(data.workspaceId, l.filtros as any);
        return { ...l, contagem: count };
      }),
    );
    return { lists: enriched };
  });

async function countSmartList(workspaceId: string, filtros: any) {
  let q = supabaseAdmin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .not("email", "is", null);
  if (filtros?.status) q = q.eq("status", filtros.status);
  if (filtros?.origem) q = q.eq("origem", filtros.origem);
  if (filtros?.cidade) q = q.ilike("cidade", `%${filtros.cidade}%`);
  if (filtros?.estado) q = q.eq("estado", filtros.estado);
  const { count } = await q;
  return count ?? 0;
}

async function resolveListRecipients(workspaceId: string, listId: string) {
  const { data: list } = await supabaseAdmin
    .from("email_lists")
    .select("*")
    .eq("id", listId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!list) throw new Error("Lista não encontrada");

  let leadIds: string[] = [];
  if (list.tipo === "manual") {
    const { data: members } = await supabaseAdmin
      .from("email_list_members")
      .select("lead_id")
      .eq("list_id", list.id);
    leadIds = (members ?? []).map((m) => m.lead_id);
  } else {
    let q = supabaseAdmin
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .not("email", "is", null);
    const f = (list.filtros as any) ?? {};
    if (f.status) q = q.eq("status", f.status);
    if (f.origem) q = q.eq("origem", f.origem);
    if (f.cidade) q = q.ilike("cidade", `%${f.cidade}%`);
    if (f.estado) q = q.eq("estado", f.estado);
    const { data } = await q;
    leadIds = (data ?? []).map((l) => l.id);
  }
  if (leadIds.length === 0) return [];
  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, nome, email, telefone, cidade, estado, metadata")
    .in("id", leadIds)
    .not("email", "is", null);
  return leads ?? [];
}

export const createList = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        nome: z.string().min(1).max(120),
        tipo: z.enum(["manual", "smart"]),
        filtros: z.record(z.any()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    const { data: row, error } = await supabaseAdmin
      .from("email_lists")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        tipo: data.tipo,
        filtros: data.filtros ?? {},
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { list: row };
  });

export const addLeadsToList = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        listId: z.string().uuid(),
        leadIds: z.array(z.string().uuid()).min(1).max(5000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    const rows = data.leadIds.map((lead_id) => ({ list_id: data.listId, lead_id }));
    await supabaseAdmin.from("email_list_members").upsert(rows, { onConflict: "list_id,lead_id" });
    return { ok: true, count: rows.length };
  });

export const deleteList = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    await supabaseAdmin
      .from("email_lists")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId);
    return { ok: true };
  });

// ============================================================
// CAMPANHAS
// ============================================================

export const listCampaigns = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), workspaceId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    const { data: rows } = await supabaseAdmin
      .from("email_campaigns")
      .select(
        "id, nome, status, agendada_para, iniciada_em, finalizada_em, stats, created_at, " +
          "template_id, list_id, sender_id, " +
          "email_templates(nome), email_lists(nome), email_senders(email, nome_exibicao)",
      )
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    return { campaigns: rows ?? [] };
  });

export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        nome: z.string().min(1).max(120),
        templateId: z.string().uuid(),
        listId: z.string().uuid(),
        senderId: z.string().uuid(),
        agendadaPara: z.string().datetime().optional(),
        enviarAgora: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    // Valida sender verificado
    const { data: sender } = await supabaseAdmin
      .from("email_senders")
      .select("status")
      .eq("id", data.senderId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (!sender) throw new Error("Remetente não encontrado");
    if (sender.status !== "verificado")
      throw new Error("Remetente ainda não verificado — confirme o email primeiro");

    const status: "rascunho" | "agendada" = data.enviarAgora || !data.agendadaPara
      ? "agendada"
      : "agendada";
    const agendada_para = data.enviarAgora
      ? new Date().toISOString()
      : data.agendadaPara ?? new Date().toISOString();

    const { data: row, error } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        template_id: data.templateId,
        list_id: data.listId,
        sender_id: data.senderId,
        status,
        agendada_para,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { campaign: row };
  });

export const pauseCampaign = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    await supabaseAdmin
      .from("email_campaigns")
      .update({ status: "pausada" })
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId)
      .in("status", ["agendada", "enviando"]);
    return { ok: true };
  });

export const cancelCampaign = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    await supabaseAdmin
      .from("email_campaigns")
      .update({ status: "cancelada" })
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId)
      .in("status", ["rascunho", "agendada", "pausada"]);
    return { ok: true };
  });

export const getCampaignStats = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await assertWorkspacePremium(data.userId, data.workspaceId);
    const { data: sends } = await supabaseAdmin
      .from("email_sends")
      .select("id, status")
      .eq("campaign_id", data.id);
    const sendIds = (sends ?? []).map((s) => s.id);
    let events: any[] = [];
    if (sendIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("email_events")
        .select("tipo, send_id")
        .in("send_id", sendIds);
      events = data ?? [];
    }
    const stats = {
      enviados: (sends ?? []).filter((s) => s.status === "enviado").length,
      falhas: (sends ?? []).filter((s) => s.status === "falhou").length,
      suprimidos: (sends ?? []).filter((s) => s.status === "suprimido").length,
      entregues: events.filter((e) => e.tipo === "delivered").length,
      aberturas: new Set(events.filter((e) => e.tipo === "opened").map((e) => e.send_id)).size,
      cliques: new Set(events.filter((e) => e.tipo === "clicked").map((e) => e.send_id)).size,
      bounces: events.filter((e) => e.tipo === "bounced").length,
      descadastros: events.filter((e) => e.tipo === "unsubscribed").length,
    };
    return { stats };
  });

// ============================================================
// CORE: processar campanhas (chamado pela rota /api/public/hooks/process-email-campaigns)
// ============================================================

const MAX_SENDS_PER_CYCLE = 100;
const APP_ORIGIN =
  process.env.APP_ORIGIN ||
  "https://project--67e78f47-3fa2-489c-b74a-a08a373f17b0.lovable.app";

export async function processScheduledCampaigns() {
  const { data: campaigns } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .lte("agendada_para", new Date().toISOString())
    .eq("status", "agendada")
    .limit(10);

  let totalSent = 0;
  for (const c of campaigns ?? []) {
    if (totalSent >= MAX_SENDS_PER_CYCLE) break;
    await supabaseAdmin
      .from("email_campaigns")
      .update({ status: "enviando", iniciada_em: new Date().toISOString() })
      .eq("id", c.id)
      .eq("status", "agendada");

    const remainingBudget = MAX_SENDS_PER_CYCLE - totalSent;
    const sent = await dispatchCampaign(c, remainingBudget);
    totalSent += sent;

    // marca enviada se não há mais leads pendentes
    const { count: pendentes } = await supabaseAdmin
      .from("email_sends")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", c.id)
      .eq("status", "pendente");
    if ((pendentes ?? 0) === 0) {
      await supabaseAdmin
        .from("email_campaigns")
        .update({ status: "enviada", finalizada_em: new Date().toISOString() })
        .eq("id", c.id);
    }
  }
  return { totalSent };
}

async function dispatchCampaign(campaign: any, budget: number): Promise<number> {
  const [{ data: template }, { data: sender }] = await Promise.all([
    supabaseAdmin.from("email_templates").select("*").eq("id", campaign.template_id).maybeSingle(),
    supabaseAdmin.from("email_senders").select("*").eq("id", campaign.sender_id).maybeSingle(),
  ]);
  if (!template || !sender || sender.status !== "verificado") {
    await supabaseAdmin
      .from("email_campaigns")
      .update({ status: "cancelada" })
      .eq("id", campaign.id);
    return 0;
  }
  const leads = await resolveListRecipients(campaign.workspace_id, campaign.list_id);

  // Cria sends pendentes (se ainda não criados nesta campanha)
  const { data: existingSends } = await supabaseAdmin
    .from("email_sends")
    .select("recipient_email")
    .eq("campaign_id", campaign.id);
  const alreadyQueued = new Set((existingSends ?? []).map((s) => s.recipient_email.toLowerCase()));

  const { data: suppressed } = await supabaseAdmin
    .from("email_suppressions")
    .select("email")
    .eq("workspace_id", campaign.workspace_id);
  const suppressedSet = new Set((suppressed ?? []).map((s) => s.email.toLowerCase()));

  const newSendsRows = leads
    .filter((l) => l.email && !alreadyQueued.has(l.email!.toLowerCase()))
    .map((l) => ({
      workspace_id: campaign.workspace_id,
      campaign_id: campaign.id,
      lead_id: l.id,
      recipient_email: l.email!,
      status: (suppressedSet.has(l.email!.toLowerCase()) ? "suprimido" : "pendente") as
        | "suprimido"
        | "pendente",
    }));
  if (newSendsRows.length > 0) {
    await supabaseAdmin.from("email_sends").insert(newSendsRows);
  }

  // Pega sends pendentes e dispara
  const { data: pending } = await supabaseAdmin
    .from("email_sends")
    .select("id, recipient_email, lead_id")
    .eq("campaign_id", campaign.id)
    .eq("status", "pendente")
    .limit(budget);

  let sentCount = 0;
  for (const s of pending ?? []) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("nome, email, telefone, cidade, estado, metadata")
      .eq("id", s.lead_id)
      .maybeSingle();
    const vars = {
      nome: lead?.nome ?? "",
      email: lead?.email ?? "",
      telefone: lead?.telefone ?? "",
      cidade: lead?.cidade ?? "",
      estado: lead?.estado ?? "",
      ...(lead?.metadata as any ?? {}),
    };
    const subject = renderTemplate(template.assunto, vars);
    let html = renderTemplate(template.html, vars);

    // gera/recupera token de descadastro
    const { data: tokenRow } = await supabaseAdmin.rpc("ensure_unsubscribe_token", {
      _workspace_id: campaign.workspace_id,
      _email: s.recipient_email,
    });
    const unsubUrl = `${APP_ORIGIN}/unsubscribe?token=${tokenRow}`;
    html = appendUnsubscribeFooter(html, unsubUrl);

    try {
      const result = await brevoSendEmail({
        fromEmail: sender.email,
        fromName: sender.nome_exibicao,
        to: [{ email: s.recipient_email, name: lead?.nome ?? undefined }],
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Bynex-Send-Id": s.id,
          "X-Bynex-Workspace": campaign.workspace_id,
        },
        tags: [`campaign:${campaign.id}`, `workspace:${campaign.workspace_id}`],
      });
      await supabaseAdmin
        .from("email_sends")
        .update({
          status: "enviado",
          provider_message_id: result.messageId,
          assunto: subject,
          sent_at: new Date().toISOString(),
        })
        .eq("id", s.id);
      sentCount++;
    } catch (err: any) {
      await supabaseAdmin
        .from("email_sends")
        .update({ status: "falhou", error_message: err.message?.slice(0, 500) ?? "erro" })
        .eq("id", s.id);
    }
    // pequeno delay para suavizar rate
    await new Promise((r) => setTimeout(r, 50));
  }
  return sentCount;
}
