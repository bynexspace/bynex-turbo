import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cnpja-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { apiKey, cnaes, uf, municipio, capitalMin, capitalMax, somenteMatriz, comEmail, comTelefone, limit } = await request.json();
          if (!apiKey) return new Response(JSON.stringify({ error: "API key não configurada. Configure em Integrações." }), { status: 400 });

          const params = new URLSearchParams();
          if (cnaes?.length) params.set("activity.main.id", cnaes.join(","));
          if (uf) params.set("address.state", uf);
          if (municipio) params.set("address.city", municipio);
          if (capitalMin) params.set("company.equity.gte", String(capitalMin));
          if (capitalMax) params.set("company.equity.lte", String(capitalMax));
          if (somenteMatriz) params.set("head", "true");
          if (comEmail) params.set("emails.gte", "1");
          if (comTelefone) params.set("phones.gte", "1");
          params.set("limit", String(limit || 20));

          const res = await fetch(`https://api.cnpja.com/office?${params.toString()}`, {
            headers: { Authorization: apiKey },
          });
          const data = await res.json();
          if (!res.ok) return new Response(JSON.stringify({ error: data?.message || "Erro CNPJá", status: res.status }), { status: res.status });

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
