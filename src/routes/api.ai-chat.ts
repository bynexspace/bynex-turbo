import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { system, messages } = await request.json() as {
            system: string; messages: { role: "user"|"assistant"; content: string }[];
          };
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return Response.json({ error: "LOVABLE_API_KEY ausente" }, { status: 500 });

          const styleRules = `\n\nRegras de formato (OBRIGATÓRIAS):
- Responda SEMPRE em português, em no máximo ~150 palavras.
- Use Markdown: comece com **título curto** em negrito (1 linha).
- Use bullets (- ) ou passos numerados quando listar.
- Scripts de mensagem (WhatsApp, e-mail, ligação) SEMPRE dentro de bloco de citação com "> " em cada linha, prontos para copiar.
- Proibido: introduções ("Claro!", "Com certeza"), repetir a pergunta, encerramentos genéricos, disclaimers, mais de 2 emojis.
- Tom: direto, consultivo, acionável. Sem encher linguiça.`;

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{ role: "system", content: system + styleRules }, ...messages],
            }),
          });
          if (!res.ok) {
            if (res.status === 429) return Response.json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, { status: 429 });
            if (res.status === 402) return Response.json({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }, { status: 402 });
            return Response.json({ error: `Erro IA (${res.status})` }, { status: 500 });
          }
          const data = await res.json();
          return Response.json({ content: data.choices?.[0]?.message?.content ?? "" });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "Erro" }, { status: 500 });
        }
      },
    },
  },
});
