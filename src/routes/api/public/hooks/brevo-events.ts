import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Webhook do Brevo. Configurar em Brevo > Transactional > Settings > Webhooks
// URL: https://project--67e78f47-3fa2-489c-b74a-a08a373f17b0.lovable.app/api/public/hooks/brevo-events
// Eventos: delivered, opened, click, soft_bounce, hard_bounce, unsubscribed, spam, blocked
//
// Brevo não envia assinatura HMAC nativa; usamos um secret na query string
// (?secret=...) configurado no painel deles. Token armazenado em BREVO_WEBHOOK_SECRET.

const MAP: Record<string, string> = {
  delivered: "delivered",
  opened: "opened",
  click: "clicked",
  unique_opened: "opened",
  soft_bounce: "soft_bounce",
  hard_bounce: "bounced",
  unsubscribed: "unsubscribed",
  spam: "complained",
  blocked: "bounced",
  invalid_email: "bounced",
  error: "bounced",
};

async function handle(payload: any) {
  const events = Array.isArray(payload) ? payload : [payload];
  for (const ev of events) {
    const tipo = MAP[ev.event];
    if (!tipo) continue;

    // Tenta achar o send via message-id
    const messageId =
      ev["message-id"] || ev.messageId || ev["X-Bynex-Send-Id"] || null;
    let send: any = null;
    if (messageId) {
      const { data } = await supabaseAdmin
        .from("email_sends")
        .select("id, workspace_id, recipient_email")
        .eq("provider_message_id", messageId)
        .maybeSingle();
      send = data;
    }
    if (!send && ev.email) {
      const { data } = await supabaseAdmin
        .from("email_sends")
        .select("id, workspace_id, recipient_email")
        .eq("recipient_email", ev.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      send = data;
    }
    if (!send) continue;

    await supabaseAdmin.from("email_events").insert({
      send_id: send.id,
      workspace_id: send.workspace_id,
      tipo: tipo as any,
      metadata: ev,
      occurred_at: ev.ts ? new Date(ev.ts * 1000).toISOString() : new Date().toISOString(),
    });

    // Suprime em caso de bounce, complaint ou unsubscribe
    if (["bounced", "complained", "unsubscribed"].includes(tipo)) {
      const motivo =
        tipo === "bounced" ? "bounce" : tipo === "complained" ? "complaint" : "unsubscribe";
      await supabaseAdmin
        .from("email_suppressions")
        .upsert(
          {
            workspace_id: send.workspace_id,
            email: send.recipient_email,
            motivo: motivo as any,
            metadata: ev,
          },
          { onConflict: "workspace_id,email" },
        );
    }
  }
}

export const Route = createFileRoute("/api/public/hooks/brevo-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const provided = url.searchParams.get("secret") || request.headers.get("x-webhook-secret");
        const expected = process.env.BREVO_WEBHOOK_SECRET;
        if (!expected || !provided || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const body = await request.json();
          await handle(body);
          return Response.json({ ok: true });
        } catch (e: any) {
          console.error("brevo-events error:", e);
          return Response.json({ ok: false, error: e.message }, { status: 500 });
        }
      },
      GET: async () => Response.json({ ok: true }),
    },
  },
});
