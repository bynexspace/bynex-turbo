import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/apify-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { workspaceId, query, qty, estado, cidade, bairro } = await request.json() as any;

          const { data: integ } = await supabaseAdmin
            .from("integrations").select("apify_key").eq("workspace_id", workspaceId).maybeSingle();
          const apifyKey = integ?.apify_key;
          if (!apifyKey) return Response.json({ error: "API key Apify não configurada" }, { status: 400 });

          const location = [bairro, cidade, estado, "Brasil"].filter(Boolean).join(", ");
          const input = {
            searchStringsArray: [query],
            locationQuery: location || "Brasil",
            maxCrawledPlacesPerSearch: qty,
            language: "pt-BR",
          };

          const res = await fetch(
            `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apifyKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }
          );
          if (!res.ok) {
            const t = await res.text();
            return Response.json({ error: `Apify: ${res.status} ${t.slice(0,200)}` }, { status: 500 });
          }
          const items = await res.json();
          const results = (items as any[]).map(i => ({
            title: i.title, phone: i.phone, website: i.website,
            rating: i.totalScore, reviewsCount: i.reviewsCount,
            address: i.address, city: i.city, state: i.state,
          }));
          return Response.json({ results });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "Erro" }, { status: 500 });
        }
      },
    },
  },
});
