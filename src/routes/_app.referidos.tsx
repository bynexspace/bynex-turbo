import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Copy, CheckCircle2, Plus, X } from "lucide-react";

export const Route = createFileRoute("/_app/referidos")({ component: ReferidosPage });

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending_validation: { label: "Aguardando validação", cls: "bg-warning/15 text-warning" },
  validated: { label: "Validado", cls: "bg-info/15 text-info" },
  approached: { label: "Abordado", cls: "bg-brand/15 text-brand" },
  in_conversation: { label: "Em conversa", cls: "bg-organic/15 text-organic" },
  converted: { label: "Convertido", cls: "bg-success/15 text-success" },
  lost: { label: "Perdido", cls: "bg-destructive/10 text-destructive" },
};

function ReferidosPage() {
  const { workspace } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [convertedLeads, setConvertedLeads] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [askOpen, setAskOpen] = useState(false);
  const [chosenLead, setChosenLead] = useState<string>("");
  const [newRefs, setNewRefs] = useState<{ nome: string; phone: string }[]>([{ nome: "", phone: "" }]);

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from("referrals").select("*, leads:referrer_lead_id(nome)")
      .eq("workspace_id", workspace.id).order("created_at", { ascending: false });
    setReferrals(data ?? []);
    const { data: converted } = await supabase.from("leads").select("id,nome")
      .eq("workspace_id", workspace.id).eq("status", "convertido");
    setConvertedLeads(converted ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const ativos = referrals.filter(r => !["converted", "lost"].includes(r.status)).length;
  const convertidos = referrals.filter(r => r.status === "converted").length;
  const filtered = filter === "all" ? referrals : referrals.filter(r => r.status === filter);

  const submitRefs = async () => {
    if (!chosenLead) return toast.error("Escolha um cliente");
    const valid = newRefs.filter(r => r.nome.trim());
    if (!valid.length) return toast.error("Adicione pelo menos um nome");
    const rows = valid.map(r => ({
      workspace_id: workspace!.id,
      referrer_lead_id: chosenLead,
      referred_name: r.nome,
      referred_phone: r.phone || null,
      status: "pending_validation" as const,
    }));
    const { error } = await supabase.from("referrals").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} referido(s) adicionado(s)`);
    setAskOpen(false); setChosenLead(""); setNewRefs([{ nome: "", phone: "" }]);
    load();
  };

  const copyValidation = async (r: any) => {
    const text = `Mano, tô mandando seu contato pro vendedor. Ele vai te chamar. Aproveita, vai ser muito top, você precisa entrar.`;
    await navigator.clipboard.writeText(text);
    await supabase.from("referrals").update({ validation_message_sent_at: new Date().toISOString() }).eq("id", r.id);
    toast.success("Mensagem copiada");
    load();
  };

  const confirmValidated = async (r: any) => {
    await supabase.from("referrals").update({ status: "validated" }).eq("id", r.id);
    toast.success("Validado — pronto para abordagem");
    load();
  };

  const setStatus = async (r: any, status: "pending_validation"|"validated"|"approached"|"in_conversation"|"converted"|"lost") => {
    await supabase.from("referrals").update({ status }).eq("id", r.id);
    load();
  };

  return (
    <AppLayout
      title="Referidos"
      subtitle="Indicações são o caminho mais curto entre vendedor e venda"
      actions={
        <Button onClick={() => setAskOpen(true)} className="bg-organic hover:bg-organic/90 text-background font-semibold">
          <UserPlus className="h-4 w-4 mr-2" /> Pedir Referidos
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Ativos</div>
          <div className="text-2xl font-bold mt-1">{ativos}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Convertidos</div>
          <div className="text-2xl font-bold mt-1 text-success">{convertidos}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-bold mt-1">{referrals.length}</div>
        </Card>
        <Card className="p-4 bg-organic/5 border-organic/30">
          <div className="text-xs text-organic font-semibold">Conversão</div>
          <div className="text-2xl font-bold mt-1">
            {convertidos ? `1:${Math.max(1, Math.round(referrals.length / convertidos))}` : "—"}
          </div>
        </Card>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todos</Button>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{m.label}</Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Telefone</th>
              <th className="text-left p-3">Indicado por</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Validado?</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum referido ainda. Comece pedindo indicações pros seus clientes convertidos.</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{r.referred_name}</td>
                <td className="p-3 text-muted-foreground">{r.referred_phone || "—"}</td>
                <td className="p-3 text-muted-foreground">{r.leads?.nome || "—"}</td>
                <td className="p-3"><Badge className={STATUS_META[r.status]?.cls}>{STATUS_META[r.status]?.label}</Badge></td>
                <td className="p-3">{r.validation_message_sent_at ? <CheckCircle2 className="h-4 w-4 text-success" /> : "—"}</td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end flex-wrap">
                    {r.status === "pending_validation" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => copyValidation(r)}>
                          <Copy className="h-3 w-3 mr-1" /> Mensagem
                        </Button>
                        <Button size="sm" onClick={() => confirmValidated(r)}>Confirmar validação</Button>
                      </>
                    )}
                    {r.status === "validated" && (
                      <Button size="sm" onClick={() => setStatus(r, "approached")}>Marcar abordado</Button>
                    )}
                    {r.status === "approached" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setStatus(r, "in_conversation")}>Em conversa</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(r, "lost")}>Perdido</Button>
                      </>
                    )}
                    {r.status === "in_conversation" && (
                      <>
                        <Button size="sm" onClick={() => setStatus(r, "converted")}>Converter</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(r, "lost")}>Perdido</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pedir Referidos</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-organic/30 bg-organic/5 p-3 text-sm">
            <p className="font-medium mb-1">Lembrete:</p>
            <p className="text-muted-foreground">A melhor hora é logo após o pagamento, com o cliente empolgado. Use a frase: <em>"Quem você conhece que tá no mesmo momento que você tava?"</em></p>
          </div>

          <div className="space-y-2">
            <Label>Cliente que vai te indicar</Label>
            <Select value={chosenLead} onValueChange={setChosenLead}>
              <SelectTrigger><SelectValue placeholder="Escolha um cliente convertido…" /></SelectTrigger>
              <SelectContent>
                {convertedLeads.length === 0 && <div className="p-2 text-xs text-muted-foreground">Nenhum cliente convertido ainda</div>}
                {convertedLeads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Referidos</Label>
            {newRefs.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Nome" value={r.nome} onChange={(e) => {
                  const c = [...newRefs]; c[i].nome = e.target.value; setNewRefs(c);
                }} />
                <Input placeholder="Telefone" value={r.phone} onChange={(e) => {
                  const c = [...newRefs]; c[i].phone = e.target.value; setNewRefs(c);
                }} />
                {newRefs.length > 1 && (
                  <Button size="icon" variant="outline" onClick={() => setNewRefs(newRefs.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setNewRefs([...newRefs, { nome: "", phone: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar mais
            </Button>
          </div>

          <Button onClick={submitRefs} className="bg-organic hover:bg-organic/90 text-background font-semibold">
            Salvar e Solicitar Validação
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
