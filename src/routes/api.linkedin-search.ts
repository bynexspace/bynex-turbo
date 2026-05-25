import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest, assertWorkspaceMember } from "@/lib/api-server-auth.server";

// Actors padrão da Apify Store para LinkedIn.
// Usuário pode trocar no campo input.actorId se quiser outro actor.
const DEFAULT_ACTORS = {
  profile: "bebity~linkedin-premium-actor",
  company: "bebity~linkedin-companies-scraper",
  partnership: "bebity~linkedin-premium-actor",
} as const;

type Mode = keyof typeof DEFAULT_ACTORS;

export const Route = createFileRoute("/api/linkedin-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (auth instanceof Response) return auth;

        try {
          const body = (await request.json()) as {
            workspaceId?: string;
            mode?: Mode;
            query?: string;
            searchUrl?: string;
            qty?: number;
            location?: string;
            actorId?: string;
          };
          const { workspaceId, mode = "profile", query, searchUrl, qty = 25, location, actorId } = body;

          if (!workspaceId) return Response.json({ error: "workspaceId obrigatório" }, { status: 400 });
          if (!query && !searchUrl) return Response.json({ error: "Informe uma busca ou URL" }, { status: 400 });
          if (qty < 1 || qty > 200) return Response.json({ error: "qty deve estar entre 1 e 200" }, { status: 400 });

          const forbidden = await assertWorkspaceMember(auth.userId, workspaceId);
          if (forbidden) return forbidden;

          const { data: integ } = await supabaseAdmin
            .from("integrations").select("apify_key").eq("workspace_id", workspaceId).maybeSingle();
          const apifyKey = integ?.apify_key;
          if (!apifyKey) return Response.json({ error: "API key Apify não configurada" }, { status: 400 });

          const actor = actorId || DEFAULT_ACTORS[mode];

          // Input genérico aceito pela maioria dos actors LinkedIn
          const input: Record<string, unknown> = {
            searchQueries: query ? [query] : undefined,
            startUrls: searchUrl ? [{ url: searchUrl }] : undefined,
            maxResults: qty,
            maxItems: qty,
            location: location || undefined,
            mode,
          };
          Object.keys(input).forEach(k => input[k] === undefined && delete input[k]);

          const res = await fetch(
            `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${apifyKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }
          );
          if (!res.ok) {
            const t = await res.text();
            console.error("[linkedin-search] apify error", res.status, t.slice(0, 500));
            let friendly = `Apify (${res.status})`;
            try {
              const parsed = JSON.parse(t);
              const msg = parsed?.error?.message || parsed?.message;
              const type = parsed?.error?.type;
              if (type === "actor-is-not-rented") {
                friendly = `Actor "${actor}" é pago e precisa ser alugado na sua conta Apify. ${msg || ""}`.trim();
              } else if (msg) {
                friendly = `Apify: ${msg}`;
              }
            } catch { friendly = `${friendly}: ${t.slice(0, 200)}`; }
            return Response.json({ error: friendly, actor }, { status: 502 });
          }
          const items = (await res.json()) as any[];

          const results = items.map((i) => ({
            name: i.fullName || i.name || i.title || i.companyName || "—",
            headline: i.headline || i.position || i.tagline || i.description || null,
            company: i.companyName || i.currentCompany || i.company || null,
            location: i.location || i.locationName || i.addressCountry || null,
            url: i.url || i.profileUrl || i.linkedinUrl || i.link || null,
            email: i.email || i.emailAddress || null,
            phone: i.phone || i.phoneNumber || null,
            website: i.website || i.companyWebsite || null,
            avatar: i.profilePicture || i.profileImage || i.logo || null,
            raw: i,
          }));
          return Response.json({ results, actor });
        } catch (e: any) {
          console.error("[linkedin-search] error", e);
          return Response.json({ error: e?.message ?? "Erro" }, { status: 500 });
        }
      },
    },
  },
});
