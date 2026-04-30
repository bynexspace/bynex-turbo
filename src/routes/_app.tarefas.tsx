import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Phone, MessageCircle, Mail, Check, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tarefas")({ component: TarefasPage });

const ICONS: any = { whatsapp: MessageCircle, ligacao: Phone, email: Mail };

function TarefasPage() {
  const { workspace } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from("tasks").select("*, leads(nome)").eq("workspace_id", workspace.id).eq("status","pendente").order("data_execucao");
    setTasks(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const updateStatus = async (id: string, status: "feita" | "adiada") => {
    await supabase.from("tasks").update({ status }).eq("id", id);
    toast.success(status === "feita" ? "Concluída" : "Adiada");
    load();
  };

  return (
    <AppLayout title="Tarefas" subtitle="Sua agenda de prospecção do dia">
      <div className="space-y-2">
        {tasks.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma tarefa pendente.</Card>}
        {tasks.map(t => {
          const Icon = ICONS[t.tipo] ?? MessageCircle;
          return (
            <Card key={t.id} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center"><Icon className="h-4 w-4" /></div>
              <div className="flex-1">
                <div className="font-medium text-sm">{t.leads?.nome || "Lead"}</div>
                <div className="text-xs text-muted-foreground">{t.conteudo}</div>
              </div>
              <Button size="sm" onClick={() => updateStatus(t.id, "feita")}><Check className="h-4 w-4 mr-1" />Executar</Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "adiada")}><Clock className="h-4 w-4 mr-1" />Adiar</Button>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
