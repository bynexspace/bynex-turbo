import { authedFetch } from "@/lib/api-auth";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { FeatureGate } from "@/components/FeatureGate";

export const Route = createFileRoute("/_app/ia")({
  component: () => (<FeatureGate feature="ia" label="Assistente IA"><IaPage /></FeatureGate>),
});

function IaPage() {
  const [msgs, setMsgs] = useState<{role:"user"|"assistant"; content:string}[]>([
    { role: "assistant", content: "Olá! Sou seu assistente de vendas. Posso criar scripts, analisar leads e sugerir abordagens. Como posso ajudar?" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = async (text?: string) => {
    const m = text ?? input;
    if (!m.trim()) return;
    const next = [...msgs, { role: "user" as const, content: m }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const res = await authedFetch("/api/ai-chat", {
        method: "POST",
        body: JSON.stringify({
          system: "Você é um SDR sênior especialista em vendas B2B para prestadores de serviço local no Brasil. Foco: scripts de abordagem, qualificação de leads, contorno de objeções e cadências de prospecção. Use linguagem brasileira natural, prática, com gatilhos comerciais.",
          messages: next,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMsgs([...next, { role: "assistant", content: data.content }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const shortcuts = [
    "Crie um script de WhatsApp para uma clínica",
    "Como superar objeção de preço",
    "Analise minhas oportunidades",
    "Cadência de 5 toques para clínica",
  ];

  return (
    <AppLayout title="Assistente IA" subtitle="Powered by AI · especialista em vendas B2B">
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-white" /></div>}
              <div className={`max-w-3xl px-4 py-2.5 rounded-2xl text-sm ${m.role === "user" ? "bg-brand text-white" : "bg-muted prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-blockquote:my-2 prose-blockquote:border-l-brand prose-blockquote:bg-background/50 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:not-italic prose-blockquote:rounded prose-strong:text-foreground prose-code:text-brand prose-code:bg-background/60 prose-code:px-1 prose-code:rounded"}`}>
                {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
              </div>
            </div>
          ))}
          {busy && <div className="text-xs text-muted-foreground"><Loader2 className="h-3 w-3 inline animate-spin mr-1" />Pensando…</div>}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {shortcuts.map(s => (
              <Button key={s} size="sm" variant="outline" onClick={() => send(s)}>{s}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && send()} placeholder="Digite sua pergunta…" />
            <Button onClick={() => send()} disabled={busy}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
