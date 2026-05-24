import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest, assertWorkspaceMember } from "@/lib/api-server-auth.server";

export const Route = createFileRoute("/api/cnpja-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (auth instanceof Response) return auth;

        try {
          const { workspaceId, cnaes, uf, municipio, capitalMin, capitalMax, somenteMatriz, comEmail, comTelefone, limit } = await request.json();

          if (!workspaceId) return new Response(JSON.stringify({ error: "workspaceId obrigatório" }), { status: 400 });
          const forbidden = await assertWorkspaceMember(auth.userId, workspaceId);
          if (forbidden) return forbidden;

          const { data: integ } = await supabaseAdmin
            .from("integrations").select("cnpja_key").eq("workspace_id", workspaceId).maybeSingle();
          const apiKey = (integ as any)?.cnpja_key;
          if (!apiKey) return new Response(JSON.stringify({ error: "API key CNPJá não configurada. Configure em Integrações." }), { status: 400 });

          const params = new URLSearchParams();
          if (cnaes?.length) params.set("activities.id.in", cnaes.join(","));
          if (uf) params.set("address.state.in", uf);
          if (municipio) params.set("address.municipality.in", municipio);
          if (capitalMin) params.set("company.equity.gte", String(capitalMin));
          if (capitalMax) params.set("company.equity.lte", String(capitalMax));
          if (somenteMatriz) params.set("head.eq", "true");
          if (comEmail) params.set("emails.ex", "true");
          if (comTelefone) params.set("phones.ex", "true");
          params.set("limit", String(limit || 20));

          const res = await fetch(`https://api.cnpja.com/office?${params.toString()}`, {
            headers: { Authorization: apiKey },
          });
          const data = await res.json();
          if (!res.ok) {
            console.error("CNPJá error", res.status, data);
            return new Response(JSON.stringify({ error: data?.message || `Erro CNPJá (${res.status})`, status: res.status }), { status: res.status });
          }

          const records = (Array.isArray(data) ? data : data?.records || []).map((o: any) => ({
            razao: o.company?.name || o.alias || "—",
            cnpj: o.taxId || o.cnpj,
            capital: o.company?.equity,
            abertura: o.founded,
            telefone: o.phones?.[0] ? `(${o.phones[0].area}) ${o.phones[0].number}` : null,
            email: o.emails?.[0]?.address || null,
            cidade: o.address?.city,
            uf: o.address?.state,
            endereco: [o.address?.street, o.address?.number, o.address?.district].filter(Boolean).join(", "),
          }));
          return new Response(JSON.stringify({ records }), { headers: { "Content-Type": "application/json" } });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message || "Erro" }), { status: 500 });
        }
      },
    },
  },
});
