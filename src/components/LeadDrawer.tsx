import { authedFetch } from "@/lib/api-auth";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Phone, Mail, MapPin, Send, Bot, Loader2 } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

const STATUSES = ["novo","contactado","negociando","convertido","perdido"] as const;

interface Props {
  lead: any | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function LeadDrawer({ lead, onClose, onUpdated }: Props) {
  const { workspace, user } = useAuth();
  const [edit, setEdit] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [aiMsgs, setAiMsgs] = useState<{ role: "user"|"assistant"; content: string }[]>([
    { role: "assistant", content: "Olá! Sou seu assistente de vendas. Posso ajudar você a criar scripts de abordagem, analisar leads e sugerir estratégias de prospecção." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (lead) {
      setEdit({ ...lead });
      supabase.from("lead_activities").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false })
        .then(({ data }) => setActivities(data ?? []));
      supabase.from("tasks").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false })
        .then(({ data }) => setTasks(data ?? []));
    }
  }, [lead]);

  if (!lead || !edit) return null;

  const save = async () => {
    const { error } = await supabase.from("leads").update({
      nome: edit.nome, telefone: edit.telefone, email: edit.email,
      endereco: edit.endereco, valor_estimado: edit.valor_estimado || null,
      status: edit.status,
    }).eq("id", lead.id);
    if (error) return toast.error("Erro ao salvar");
    await supabase.from("lead_activities").insert({
      workspace_id: workspace!.id, lead_id: lead.id, user_id: user!.id,
      tipo: "edit", descricao: "Lead atualizado",
    });
    toast.success("Lead salvo");
    onUpdated(); onClose();
  };

  const sendAI = async (text?: string) => {
    const msg = text ?? aiInput;
    if (!msg.trim()) return;
    const newMsgs = [...aiMsgs, { role: "user" as const, content: msg }];
    setAiMsgs(newMsgs);
    setAiInput("");
    setAiBusy(true);
    try {
      const ctx = `Lead: ${edit.nome}; telefone: ${edit.telefone || "—"}; cidade: ${edit.cidade || "—"}/${edit.estado || "—"}; status: ${edit.status}; origem: ${edit.origem}.`;
      const res = await authedFetch("/api/ai-chat", {
        method: "POST",
        body: JSON.stringify({
          system: `Você é um SDR sênior de vendas B2B local no Brasil trabalhando este lead específico. Contexto do lead: ${ctx} Personalize abordagens usando o nome da empresa e a cidade quando relevante.`,
          messages: newMsgs,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiMsgs([...newMsgs, { role: "assistant", content: data.content }]);
    } catch (e: any) {
      toast.error(e.message ?? "Erro na IA");
    } finally { setAiBusy(false); }
  };

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">{edit.nome}</SheetTitle>
              <Badge variant="outline" className="mt-1">{edit.origem}</Badge>
            </div>
            <Button onClick={save}>Salvar</Button>
          </div>
        </SheetHeader>

        <div className="flex gap-1 mt-4 border-b border-border">
          {STATUSES.map(s => (
            <button key={s}
              onClick={() => setEdit({ ...edit, status: s })}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${edit.status === s ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            <div><Label>Nome da Empresa</Label>
              <Input value={edit.nome} onChange={e => setEdit({ ...edit, nome: e.target.value })} />
            </div>
            <div><Label>Valor Estimado (R$)</Label>
              <Input type="number" value={edit.valor_estimado || ""} onChange={e => setEdit({ ...edit, valor_estimado: e.target.value })} />
            </div>
            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Contato</h4>
              <div><Label className="text-xs">Telefone</Label>
                <div className="flex gap-2">
                  <Input value={edit.telefone || ""} onChange={e => setEdit({ ...edit, telefone: e.target.value })} />
                  {edit.telefone && <Button size="icon" variant="outline" asChild><a href={`tel:${edit.telefone}`}><Phone className="h-4 w-4" /></a></Button>}
                </div>
              </div>
              <div><Label className="text-xs">E-mail</Label>
                <div className="flex gap-2">
                  <Input value={edit.email || ""} onChange={e => setEdit({ ...edit, email: e.target.value })} />
                  {edit.email && <Button size="icon" variant="outline" asChild><a href={`mailto:${edit.email}`}><Mail className="h-4 w-4" /></a></Button>}
                </div>
              </div>
              <div><Label className="text-xs">Endereço</Label>
                <Input value={edit.endereco || ""} onChange={e => setEdit({ ...edit, endereco: e.target.value })} />
              </div>
              {edit.cidade && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{edit.cidade}, {edit.estado}</div>}
            </div>
          </div>

          <div>
            <Tabs defaultValue="ia">
              <TabsList className="w-full">
                <TabsTrigger value="atividade" className="flex-1">Atividade</TabsTrigger>
                <TabsTrigger value="ia" className="flex-1">Agente IA</TabsTrigger>
                <TabsTrigger value="tarefas" className="flex-1">Tarefas</TabsTrigger>
              </TabsList>
              <TabsContent value="atividade" className="space-y-2 mt-4">
                {activities.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma atividade.</p> :
                  activities.map(a => (
                    <div key={a.id} className="border-l-2 border-brand pl-3 py-1">
                      <div className="text-sm">{a.descricao}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd/MM HH:mm")}</div>
                    </div>
                  ))}
              </TabsContent>
              <TabsContent value="ia" className="mt-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Bot className="h-4 w-4 text-brand" />
                    <span className="font-medium">Assistente SDR</span>
                    <span className="text-muted-foreground">· powered by AI</span>
                  </div>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
                  {aiMsgs.map((m, i) => (
                    <div key={i} className={`p-2.5 rounded-lg text-sm ${m.role === "user" ? "bg-brand text-white ml-8" : "bg-muted mr-8 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-blockquote:my-1.5 prose-blockquote:border-l-brand prose-blockquote:bg-background/60 prose-blockquote:py-1 prose-blockquote:px-2 prose-blockquote:not-italic prose-blockquote:rounded prose-strong:text-foreground prose-code:text-brand"}`}>
                      {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                    </div>
                  ))}
                  {aiBusy && <div className="text-xs text-muted-foreground"><Loader2 className="h-3 w-3 inline animate-spin mr-1" />Pensando…</div>}
                </div>
                <div className="flex gap-1 mb-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => sendAI("Gere um script de WhatsApp em 3 mensagens curtas (abertura, gancho de valor, CTA), uma por linha em bloco de citação.")}>Script WhatsApp</Button>
                  <Button size="sm" variant="outline" onClick={() => sendAI("Gere um script de ligação de cold call: abertura em 1 frase, 2 perguntas de descoberta e 1 CTA, em bloco de citação.")}>Script Ligação</Button>
                </div>
                <div className="flex gap-2">
                  <Input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendAI()} placeholder="Pergunte algo…" />
                  <Button size="icon" onClick={() => sendAI()} disabled={aiBusy}><Send className="h-4 w-4" /></Button>
                </div>
              </TabsContent>
              <TabsContent value="tarefas" className="mt-4">
                {tasks.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p> :
                  tasks.map(t => (
                    <div key={t.id} className="p-2 border border-border rounded mb-2">
                      <div className="text-sm font-medium">{t.tipo}</div>
                      <div className="text-xs text-muted-foreground">{t.conteudo}</div>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
