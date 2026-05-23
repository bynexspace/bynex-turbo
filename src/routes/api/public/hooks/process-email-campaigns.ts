import { createFileRoute } from "@tanstack/react-router";
import { processScheduledCampaigns } from "@/server/email-marketing.functions";

// Chamado periodicamente por pg_cron. Não é exposto na UI.
// Autenticação: apikey header (anon key) — bloqueado se ausente.
export const Route = createFileRoute("/api/public/hooks/process-email-campaigns")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await processScheduledCampaigns();
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          console.error("process-email-campaigns error:", e);
          return Response.json({ ok: false, error: e.message }, { status: 500 });
        }
      },
    },
  },
});
