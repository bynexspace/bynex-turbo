import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest, assertWorkspaceMember } from "@/lib/api-server-auth.server";

export const Route = createFileRoute("/api/ai-intel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (auth instanceof Response) return auth;

        try {
          const body = await request.json() as any;
          const { workspaceId, modo, estado, cidade, segmento, cnae, porte, tempo, dores } = body;

          if (!workspaceId) return Response.json({ error: "workspaceId obrigatório" }, { status: 400 });
          const forbidden = await assertWorkspaceMember(auth.userId, workspaceId);
          if (forbidden) return forbidden;

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return Response.json({ error: "API key ausente" }, { status: 500 });

          const prompt = `Você é um analista de inteligência comercial especialista em vendas B2B no Brasil.
Modo: ${modo}
Segmento: ${segmento} · Região: ${cidade}, ${estado}
Porte: ${porte} · Tempo de mercado: ${tempo}
Principais dores: ${(dores||[]).join(", ")} · CNAE: ${cnae || "—"}

Retorne APENAS um JSON válido sem markdown:
{"nivel_risco":0-100,"score_oportunidade":0-100,"nivel_concorrencia":0-100,"visao_geral":"...","tamanho_mercado":"...","perguntas_qualificacao":["..."],"principais_objecoes":["..."],"script_abertura":"...","proximos_passos":["..."]}`;

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
            }),
          });
          if (!res.ok) return Response.json({ error: `IA: ${res.status}` }, { status: 500 });
          const data = await res.json();
          let content = data.choices?.[0]?.message?.content ?? "{}";
          content = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
          let resultado: any;
          try { resultado = JSON.parse(content); } catch { resultado = { visao_geral: content, nivel_risco: 50, score_oportunidade: 50, nivel_concorrencia: 50, tamanho_mercado: "—", script_abertura: "", perguntas_qualificacao: [], principais_objecoes: [], proximos_passos: [] }; }

          await supabaseAdmin.from("intel_reports").insert({
            workspace_id: workspaceId, modo, segmento, cidade, estado, porte,
            tempo_mercado: tempo, dores, cnae, resultado,
          });

          return Response.json({ resultado });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "Erro" }, { status: 500 });
        }
      },
    },
  },
});
