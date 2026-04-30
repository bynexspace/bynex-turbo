import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/flows")({ component: FlowsPage });

function FlowsPage() {
  const { workspace } = useAuth();
  const [flows, setFlows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(""); const [desc, setDesc] = useState("");

  const load = () => workspace && supabase.from("flows").select("*").eq("workspace_id", workspace.id)
    .then(({ data }) => setFlows(data ?? []));
  useEffect(load, [workspace]);

  const criar = async () => {
    if (!nome) return;
    await supabase.from("flows").insert({ workspace_id: workspace!.id, nome, descricao: desc, passos: [] });
    setNome(""); setDesc(""); setOpen(false); toast.success("Cadência criada"); load();
  };

  const remover = async (id: string) => {
    if (!confirm("Excluir esta cadência?")) return;
    await supabase.from("flows").delete().eq("id", id); load();
  };

  return (
    <AppLayout title="Flows" subtitle="Cadências de prospecção"
      actions={<Button onClick={() => setOpen(!open)}><Plus className="h-4 w-4 mr-1" />Nova</Button>}>
      {open && (
        <Card className="p-4 mb-4 space-y-3">
          <div><Label>Nome</Label><Input value={nome} onChange={e=>setNome(e.target.value)} /></div>
          <div><Label>Descrição</Label><Input value={desc} onChange={e=>setDesc(e.target.value)} /></div>
          <Button onClick={criar}>Criar</Button>
        </Card>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {flows.map(f => (
          <Card key={f.id} className="p-4 flex justify-between items-start">
            <div><div className="font-semibold">{f.nome}</div><div className="text-xs text-muted-foreground">{(f.passos?.length || 0)} passos</div></div>
            <Button size="icon" variant="ghost" onClick={() => remover(f.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
