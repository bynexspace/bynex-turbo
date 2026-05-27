import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, MessageCircle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_app/listas")({ component: ListasPage });

type ListType = "list_1_social" | "list_2_referrer" | "list_3_past_client";

const LIST_META: Record<ListType, { titulo: string; sub: string }> = {
  list_1_social: { titulo: "Ciclo Social (Lista 1)", sub: "Quem pode publicizar seu serviço" },
  list_2_referrer: { titulo: "Possíveis Indicadores (Lista 2 — A Lista do Suco)", sub: "Quem pode te indicar. Meta: 20+ nomes." },
  list_3_past_client: { titulo: "Antigos Clientes (Lista 3)", sub: "Só inclua os que tiveram sucesso com você" },
};

function ListasPage() {
  const { workspace } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [adds, setAdds] = useState<Record<string, { nome: string; phone: string }>>({});

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from("leads").select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const ofList = (t: ListType) => {
    if (t === "list_3_past_client") return leads.filter(l => l.status === "convertido" || l.list_type === "list_3_past_client");
    return leads.filter(l => l.list_type === t);
  };

  const add = async (t: ListType) => {
    const a = adds[t] || { nome: "", phone: "" };
    if (!a.nome.trim()) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("leads").insert({
      workspace_id: workspace!.id,
      nome: a.nome,
      telefone: a.phone || null,
      origem: "manual",
      list_type: t,
    });
    if (error) return toast.error(error.message);
    setAdds({ ...adds, [t]: { nome: "", phone: "" } });
    toast.success("Adicionado");
    load();
  };

  const createApproachTask = async (lead: any) => {
    const { error } = await supabase.from("tasks").insert({
      workspace_id: workspace!.id,
      lead_id: lead.id,
      tipo: "ligacao",
      conteudo: `Abordar ${lead.nome}`,
      status: "pendente",
    });
    if (error) return toast.error(error.message);
    toast.success("Tarefa criada");
  };

  const renderList = (t: ListType) => {
    const items = ofList(t);
    const meta = LIST_META[t];
    const a = adds[t] || { nome: "", phone: "" };
    const isList2 = t === "list_2_referrer";
    const pct = Math.min(100, (items.length / 20) * 100);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold">{meta.titulo}</h3>
          <p className="text-sm text-muted-foreground">{meta.sub}</p>
        </div>

        {isList2 && (
          <Card className="p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Você tem {items.length} de 20 nomes</span>
              <span className="text-muted-foreground">{Math.round(pct)}%</span>
            </div>
            <Progress value={pct} />
            {items.length < 20 && (
              <div className="flex gap-2 mt-3 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Sua Lista 2 está abaixo da meta. Adicione mais <strong>{20 - items.length}</strong> nomes pra ter eficácia máxima.</span>
              </div>
            )}
          </Card>
        )}

        {t !== "list_3_past_client" && (
          <Card className="p-4 flex gap-2">
            <Input placeholder="Nome" value={a.nome} onChange={(e) => setAdds({ ...adds, [t]: { ...a, nome: e.target.value } })} />
            <Input placeholder="Telefone" value={a.phone} onChange={(e) => setAdds({ ...adds, [t]: { ...a, phone: e.target.value } })} />
            <Button onClick={() => add(t)} className="bg-organic hover:bg-organic/90 text-background font-semibold">Adicionar</Button>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="p-3 text-xs text-muted-foreground border-b border-border">{items.length} pessoa(s)</div>
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum nome ainda.</div>
          ) : items.map(l => (
            <div key={l.id} className="flex items-center justify-between p-3 border-t border-border first:border-t-0">
              <div>
                <div className="font-medium text-sm">{l.nome}</div>
                <div className="text-xs text-muted-foreground">{l.telefone || "—"}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => createApproachTask(l)}>
                {t === "list_3_past_client" ? <><RefreshCw className="h-3 w-3 mr-1" /> Reativar</> : <><MessageCircle className="h-3 w-3 mr-1" /> Abordar</>}
              </Button>
            </div>
          ))}
        </Card>
      </div>
    );
  };

  return (
    <AppLayout title="Minhas 3 Listas" subtitle="As listas-base da metodologia Organic">
      <Tabs defaultValue="list_2_referrer">
        <TabsList>
          <TabsTrigger value="list_1_social">Ciclo Social</TabsTrigger>
          <TabsTrigger value="list_2_referrer">Indicadores ⭐</TabsTrigger>
          <TabsTrigger value="list_3_past_client">Antigos Clientes</TabsTrigger>
        </TabsList>
        <TabsContent value="list_1_social" className="mt-6">{renderList("list_1_social")}</TabsContent>
        <TabsContent value="list_2_referrer" className="mt-6">{renderList("list_2_referrer")}</TabsContent>
        <TabsContent value="list_3_past_client" className="mt-6">{renderList("list_3_past_client")}</TabsContent>
      </Tabs>
    </AppLayout>
  );
}
