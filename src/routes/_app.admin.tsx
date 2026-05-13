import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import {
  listAllWorkspaces, updateWorkspacePlan, updateWorkspaceStatus, createClient, sendPasswordReset,
} from "@/server/admin.functions";
import { toast } from "sonner";
import { Building2, DollarSign, Users, Database, Plus, Copy, Check, CheckCircle2, KeyRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

type Plano = "essencial" | "pro" | "premium";
type Status = "ativo" | "suspenso";

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof listAllWorkspaces>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; senha: string } | null>(null);

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

  const toggleStatus = async (workspaceId: string, current: Status) => {
    if (!user) return;
    const next: Status = current === "ativo" ? "suspenso" : "ativo";
    setBusy(workspaceId);
    try {
      await updateWorkspaceStatus({ data: { userId: user.id, workspaceId, status: next } });
      toast.success(next === "ativo" ? "Conta ativada" : "Conta suspensa");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao alterar status");
    } finally {
      setBusy(null);
    }
  };

  const resetPwd = async (workspaceId: string) => {
    if (!user) return;
    setBusy(workspaceId);
    try {
      const r = await sendPasswordReset({
        data: { userId: user.id, workspaceId, redirectTo: `${window.location.origin}/reset-password` },
      });
      toast.success(`E-mail de recuperação enviado para ${r.email}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar e-mail");
    } finally {
      setBusy(null);
    }
  };

  const k = data?.kpis;

  return (
    <AppLayout title="Admin" subtitle="Gestão global da plataforma">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi icon={Building2} label="Workspaces" value={`${k?.ativos ?? 0} / ${k?.total ?? 0}`} hint="ativos / total" />
        <Kpi icon={DollarSign} label="MRR estimado" value={`R$ ${(k?.mrr ?? 0).toLocaleString("pt-BR")}`} />
        <Kpi icon={Users} label="Usuários" value={k?.users ?? 0} />
        <Kpi icon={Database} label="Leads totais" value={k?.leads ?? 0} />
      </div>

      <div className="flex justify-end mb-3">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo cliente
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Workspace</th>
                <th className="text-left p-3">Dono</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Plano</th>
                <th className="text-right p-3">Usuários</th>
                <th className="text-right p-3">Leads</th>
                <th className="text-right p-3">MRR</th>
                <th className="text-left p-3">Último acesso</th>
                <th className="text-left p-3">Criado</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(data?.workspaces ?? []).map((w: any) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="p-3 font-medium">{w.nome}</td>
                  <td className="p-3 text-muted-foreground">{w.owner?.email ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant={w.status === "ativo" ? "default" : "destructive"}>
                      {w.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Select value={w.plano} disabled={busy === w.id} onValueChange={(v) => changePlan(w.id, v as Plano)}>
                      <SelectTrigger className="w-28 inline-flex"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essencial">Essencial</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">{w.users}</td>
                  <td className="p-3 text-right">{w.leads}</td>
                  <td className="p-3 text-right">R$ {w.mrr.toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {w.last_sign_in_at
                      ? formatDistanceToNow(new Date(w.last_sign_in_at), { addSuffix: true, locale: ptBR })
                      : "nunca"}
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant={w.status === "ativo" ? "outline" : "default"}
                      disabled={busy === w.id}
                      onClick={() => toggleStatus(w.id, w.status)}
                    >
                      {w.status === "ativo" ? "Suspender" : "Ativar"}
                    </Button>
                  </td>
                </tr>
              ))}
              {data?.workspaces.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhum workspace ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateClientDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async (creds) => {
          setCreateOpen(false);
          setCredentials(creds);
          await load();
        }}
      />

      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </AppLayout>
  );
}

function Kpi({ icon: Icon, label, value, hint }: { icon: any; label: string; value: any; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-brand/15 flex items-center justify-center">
          <Icon className="h-4 w-4 text-brand" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}{hint ? ` (${hint})` : ""}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function CreateClientDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (c: { email: string; senha: string }) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({ email: "", fullName: "", workspaceName: "", plano: "essencial" as Plano });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!form.email || !form.fullName || !form.workspaceName) {
      toast.error("Preencha todos os campos");
      return;
    }
    setBusy(true);
    try {
      const r = await createClient({ data: { userId: user.id, ...form } });
      onCreated({ email: r.email, senha: r.senhaProvisoria });
      setForm({ email: "", fullName: "", workspaceName: "", plano: "essencial" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar cliente");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Cria a conta + workspace + plano. Você recebe a senha provisória pra mandar pro cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome do cliente</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="João da Silva" />
          </div>
          <div>
            <Label>E-mail (login)</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="cliente@empresa.com" />
          </div>
          <div>
            <Label>Nome do workspace</Label>
            <Input value={form.workspaceName} onChange={(e) => setForm({ ...form, workspaceName: e.target.value })} placeholder="Empresa do Cliente" />
          </div>
          <div>
            <Label>Plano</Label>
            <Select value={form.plano} onValueChange={(v) => setForm({ ...form, plano: v as Plano })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="essencial">Essencial</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Criando…" : "Criar cliente"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsDialog({
  credentials, onClose,
}: {
  credentials: { email: string; senha: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!credentials) return null;

  const text = `Acesso ao BYNEX Turbo:\nE-mail: ${credentials.email}\nSenha: ${credentials.senha}`;
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15">
            <CheckCircle2 className="h-6 w-6 text-brand" />
          </div>
          <DialogTitle className="text-center">Cliente criado!</DialogTitle>
          <DialogDescription className="text-center">
            Envie esses dados para o cliente. <strong>A senha não será mostrada novamente.</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs whitespace-pre-line">{text}</div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={copy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
