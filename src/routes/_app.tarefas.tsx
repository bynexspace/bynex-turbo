import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Phone, MessageCircle, Mail, Check, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/tarefas")({ component: TarefasPage });

const ICONS: any = { whatsapp: MessageCircle, ligacao: Phone, email: Mail };
type TaskType = "whatsapp" | "ligacao" | "email";

function TarefasPage() {
  const { workspace } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tipo, setTipo] = useState<TaskType>("whatsapp");
  const [leadId, setLeadId] = useState<string>("none");
  const [conteudo, setConteudo] = useState("");
  const [data, setData] = useState<string>("");

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase
      .from("tasks")
      .select("*, leads(nome)")
      .eq("workspace_id", workspace.id)
      .eq("status", "pendente")
      .order("data_execucao", { ascending: true, nullsFirst: false });
    setTasks(data ?? []);
  };

  const loadLeads = async () => {
    if (!workspace) return;
    const { data } = await supabase
      .from("leads")
      .select("id, nome")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setLeads(data ?? []);
  };

  useEffect(() => { load(); loadLeads(); }, [workspace]);

  const reset = () => {
    setTipo("whatsapp"); setLeadId("none"); setConteudo(""); setData("");
  };

  const criar = async () => {
    if (!conteudo.trim()) return toast.error("Descreva a tarefa");
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      workspace_id: workspace!.id,
      tipo,
      conteudo: conteudo.trim(),
      lead_id: leadId === "none" ? null : leadId,
      data_execucao: data ? new Date(data).toISOString() : null,
      status: "pendente",
    });
    setSaving(false);
    if (error) return toast.error("Erro ao criar tarefa");
    toast.success("Tarefa criada");
    reset(); setOpen(false); load();
  };

  const updateStatus = async (id: string, status: "feita" | "adiada") => {
    await supabase.from("tasks").update({ status }).eq("id", id);
    toast.success(status === "feita" ? "Concluída" : "Adiada");
    load();
  };

  const remover = async (id: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    load();
  };

  return (
    <AppLayout
      title="Tarefas"
      subtitle="Sua agenda de prospecção do dia"
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova tarefa
        </Button>
      }
    >
      <div className="space-y-2">
        {tasks.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhuma tarefa pendente. Clique em <b>Nova tarefa</b> para começar.
          </Card>
        )}
        {tasks.map((t) => {
          const Icon = ICONS[t.tipo] ?? MessageCircle;
          return (
            <Card key={t.id} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {t.leads?.nome || "Sem lead vinculado"}
                </div>
                <div className="text-xs text-muted-foreground truncate">{t.conteudo}</div>
                {t.data_execucao && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(t.data_execucao), "dd/MM HH:mm")}
                  </div>
                )}
              </div>
              <Button size="sm" onClick={() => updateStatus(t.id, "feita")}>
                <Check className="h-4 w-4 mr-1" />Executar
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "adiada")}>
                <Clock className="h-4 w-4 mr-1" />Adiar
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remover(t.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TaskType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lead (opcional)</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem lead</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Ex: Enviar proposta no WhatsApp"
                rows={3}
              />
            </div>
            <div>
              <Label>Data e hora (opcional)</Label>
              <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={saving}>
              {saving ? "Criando..." : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
