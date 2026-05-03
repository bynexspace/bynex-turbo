import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { listAllWorkspaces, updateWorkspacePlan } from "@/server/admin.functions";
import { toast } from "sonner";
import { Building2, DollarSign, Users, Database } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

type Plano = "essencial" | "pro" | "premium";

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof listAllWorkspaces>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      setData(await listAllWorkspaces({ data: { userId: user.id } }));
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar");
    }
  };

  useEffect(() => { if (isAdmin && user) load(); }, [isAdmin, user?.id]);

  if (loading) return <AppLayout title="Admin"><div className="p-8 text-muted-foreground">Carregando…</div></AppLayout>;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  const changePlan = async (workspaceId: string, plano: Plano) => {
    if (!user) return;
    setBusy(workspaceId);
    try {
      await updateWorkspacePlan({ data: { userId: user.id, workspaceId, plano } });
      toast.success("Plano atualizado");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar");
    } finally {
      setBusy(null);
    }
  };

  const k = data?.kpis;

  return (
    <AppLayout title="Admin" subtitle="Gestão global da plataforma">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Building2} label="Workspaces" value={k?.total ?? 0} />
        <Kpi icon={DollarSign} label="MRR estimado" value={`R$ ${(k?.mrr ?? 0).toLocaleString("pt-BR")}`} />
        <Kpi icon={Users} label="Usuários" value={k?.users ?? 0} />
        <Kpi icon={Database} label="Leads totais" value={k?.leads ?? 0} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Workspace</th>
                <th className="text-left p-3">Dono</th>
                <th className="text-left p-3">Plano</th>
                <th className="text-right p-3">Usuários</th>
                <th className="text-right p-3">Leads</th>
                <th className="text-right p-3">MRR</th>
                <th className="text-left p-3">Criado</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(data?.workspaces ?? []).map((w: any) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="p-3 font-medium">{w.nome}</td>
                  <td className="p-3 text-muted-foreground">{w.owner?.email ?? "—"}</td>
                  <td className="p-3"><Badge variant={w.plano === "essencial" ? "outline" : "default"}>{w.plano}</Badge></td>
                  <td className="p-3 text-right">{w.users}</td>
                  <td className="p-3 text-right">{w.leads}</td>
                  <td className="p-3 text-right">R$ {w.mrr.toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 text-right">
                    <Select value={w.plano} disabled={busy === w.id} onValueChange={(v) => changePlan(w.id, v as Plano)}>
                      <SelectTrigger className="w-32 inline-flex"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essencial">Essencial</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {data?.workspaces.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum workspace ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-brand/15 flex items-center justify-center">
          <Icon className="h-4 w-4 text-brand" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}
