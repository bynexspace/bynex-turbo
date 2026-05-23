import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  listCampaigns, createCampaign, pauseCampaign, cancelCampaign, getCampaignStats,
  listTemplates, saveTemplate, deleteTemplate,
  listLists, createList, addLeadsToList, deleteList,
  listSenders, addSender, checkSenderStatus, deleteSender,
} from "@/server/email-marketing.functions";
import { Mail, Plus, Trash2, Pause, X, RefreshCw, Send, FileText, ListChecks, AtSign, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/campanhas")({ component: CampanhasPage });

type Tab = "campanhas" | "templates" | "listas" | "remetentes";

function CampanhasPage() {
  const [tab, setTab] = useState<Tab>("campanhas");

  return (
    <AppLayout
      title="Email Marketing"
      subtitle="Campanhas, templates e sequências para nutrir e converter leads"
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campanhas"><Mail className="h-4 w-4 mr-1" />Campanhas</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-1" />Templates</TabsTrigger>
          <TabsTrigger value="listas"><ListChecks className="h-4 w-4 mr-1" />Listas</TabsTrigger>
          <TabsTrigger value="remetentes"><AtSign className="h-4 w-4 mr-1" />Remetentes</TabsTrigger>
        </TabsList>

        <TabsContent value="campanhas"><CampanhasTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="listas"><ListasTab /></TabsContent>
        <TabsContent value="remetentes"><RemetentesTab /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

// ============================================================
// REMETENTES
// ============================================================
function RemetentesTab() {
  const { user, workspace } = useAuth();
  const [senders, setSenders] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");

  const load = async () => {
    if (!workspace || !user) return;
    try {
      const r = await listSenders({ data: { userId: user.id, workspaceId: workspace.id } });
      setSenders(r.senders);
    } catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspace?.id]);

  const adicionar = async () => {
    if (!user || !workspace) return;
    try {
      await addSender({ data: { userId: user.id, workspaceId: workspace.id, email, nomeExibicao: nome } });
      toast.success("Remetente criado. Confirme o email enviado pelo Brevo para verificar.");
      setOpen(false); setEmail(""); setNome(""); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const verificar = async (id: string) => {
    if (!user || !workspace) return;
    try {
      const r = await checkSenderStatus({ data: { userId: user.id, workspaceId: workspace.id, senderId: id } });
      toast.success(`Status: ${r.status}`);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remover = async (id: string) => {
    if (!user || !workspace) return;
    if (!confirm("Remover este remetente?")) return;
    await deleteSender({ data: { userId: user.id, workspaceId: workspace.id, senderId: id } });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Cadastre o email profissional que aparecerá no campo "De:" das suas campanhas.
          O Brevo enviará um link de confirmação para verificar a propriedade.
        </p>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Novo</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {senders.map((s) => (
          <Card key={s.id} className="p-4 flex justify-between items-start">
            <div>
              <div className="font-semibold">{s.nome_exibicao}</div>
              <div className="text-sm text-muted-foreground">{s.email}</div>
              <Badge
                variant={s.status === "verificado" ? "default" : "secondary"}
                className="mt-2"
              >
                {s.status}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => verificar(s.id)} title="Re-verificar">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remover(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {senders.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground col-span-full">
            Nenhum remetente cadastrado.
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar remetente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome de exibição</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Equipe Vendas" />
            </div>
            <div>
              <Label>Email profissional</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@suaempresa.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              Você receberá um email de confirmação no endereço informado. Clique no link e depois
              volte aqui e clique em "Re-verificar".
            </p>
          </div>
          <DialogFooter>
            <Button onClick={adicionar} disabled={!email || !nome}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// TEMPLATES
// ============================================================
function TemplatesTab() {
  const { user, workspace } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    if (!workspace || !user) return;
    try {
      const r = await listTemplates({ data: { userId: user.id, workspaceId: workspace.id } });
      setTemplates(r.templates);
    } catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspace?.id]);

  const novo = () => setEditing({ id: undefined, nome: "", assunto: "", html: defaultTemplateHtml });
  const salvar = async () => {
    if (!user || !workspace || !editing) return;
    try {
      await saveTemplate({
        data: {
          userId: user.id, workspaceId: workspace.id, id: editing.id,
          nome: editing.nome, assunto: editing.assunto, html: editing.html,
        },
      });
      toast.success("Template salvo");
      setEditing(null); load();
    } catch (e: any) { toast.error(e.message); }
  };
  const remover = async (id: string) => {
    if (!user || !workspace) return;
    if (!confirm("Excluir este template?")) return;
    await deleteTemplate({ data: { userId: user.id, workspaceId: workspace.id, id } });
    load();
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => setEditing(null)}>← Voltar</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!editing.nome || !editing.assunto}>Salvar</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 space-y-3">
            <div>
              <Label>Nome interno</Label>
              <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div>
              <Label>Assunto do email</Label>
              <Input value={editing.assunto} onChange={(e) => setEditing({ ...editing, assunto: e.target.value })} placeholder="Olá {{nome}}, temos uma oportunidade..." />
            </div>
            <div>
              <Label>HTML do corpo</Label>
              <Textarea
                value={editing.html}
                onChange={(e) => setEditing({ ...editing, html: e.target.value })}
                className="font-mono text-xs min-h-[400px]"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: <code>{"{{nome}}"}</code>, <code>{"{{email}}"}</code>,{" "}
              <code>{"{{telefone}}"}</code>, <code>{"{{cidade}}"}</code>, <code>{"{{estado}}"}</code>.
              O rodapé de descadastro é adicionado automaticamente.
            </p>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-2">Preview</div>
            <iframe
              srcDoc={editing.html}
              className="w-full min-h-[450px] border rounded bg-white"
              sandbox=""
              title="preview"
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={novo}><Plus className="h-4 w-4 mr-1" />Novo template</Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((t) => (
          <Card key={t.id} className="p-4 cursor-pointer hover:bg-accent/30" onClick={() => setEditing(t)}>
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.nome}</div>
                <div className="text-xs text-muted-foreground truncate mt-1">{t.assunto}</div>
                {t.variaveis?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.variaveis.slice(0, 4).map((v: string) => (
                      <Badge key={v} variant="outline" className="text-[10px]">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remover(t.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {templates.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground col-span-full">
            Nenhum template ainda.
          </Card>
        )}
      </div>
    </div>
  );
}

const defaultTemplateHtml = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:24px;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05)">
    <h1 style="font-size:22px;margin:0 0 12px">Olá {{nome}},</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px">
      Escreva aqui o conteúdo do seu email.
    </p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 24px">
      Você pode usar variáveis como {{cidade}}, {{telefone}}, etc.
    </p>
    <a href="https://exemplo.com" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">
      Chamada à ação
    </a>
  </div>
</body></html>`;

// ============================================================
// LISTAS
// ============================================================
function ListasTab() {
  const { user, workspace } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"manual" | "smart">("smart");
  const [filtros, setFiltros] = useState<{ status?: string; cidade?: string; estado?: string }>({});
  const [manageList, setManageList] = useState<any | null>(null);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!workspace || !user) return;
    try {
      const r = await listLists({ data: { userId: user.id, workspaceId: workspace.id } });
      setLists(r.lists);
    } catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspace?.id]);

  const criar = async () => {
    if (!user || !workspace || !nome) return;
    try {
      await createList({
        data: { userId: user.id, workspaceId: workspace.id, nome, tipo, filtros: tipo === "smart" ? filtros : {} },
      });
      toast.success("Lista criada");
      setOpen(false); setNome(""); setFiltros({}); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remover = async (id: string) => {
    if (!user || !workspace) return;
    if (!confirm("Excluir lista?")) return;
    await deleteList({ data: { userId: user.id, workspaceId: workspace.id, id } });
    load();
  };

  const abrirGerenciar = async (l: any) => {
    setManageList(l);
    setSelectedLeads(new Set());
    if (!workspace) return;
    const { data } = await supabase.from("leads")
      .select("id, nome, email, cidade, status")
      .eq("workspace_id", workspace.id)
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    setAllLeads(data ?? []);
  };

  const adicionarSelecionados = async () => {
    if (!user || !workspace || !manageList || selectedLeads.size === 0) return;
    await addLeadsToList({
      data: { userId: user.id, workspaceId: workspace.id, listId: manageList.id, leadIds: Array.from(selectedLeads) },
    });
    toast.success(`${selectedLeads.size} leads adicionados`);
    setManageList(null); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Listas inteligentes filtram leads automaticamente. Listas manuais são fixas.
        </p>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Nova lista</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {lists.map((l) => (
          <Card key={l.id} className="p-4 flex justify-between items-start">
            <div>
              <div className="font-semibold">{l.nome}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {l.tipo === "smart" ? "Inteligente" : "Manual"} · {l.contagem ?? 0} contatos
              </div>
              {l.tipo === "smart" && Object.keys(l.filtros || {}).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(l.filtros).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-[10px]">{k}: {String(v)}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {l.tipo === "manual" && (
                <Button size="sm" variant="outline" onClick={() => abrirGerenciar(l)}>Gerenciar</Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => remover(l.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {lists.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground col-span-full">
            Nenhuma lista criada.
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova lista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">Inteligente (filtros)</SelectItem>
                  <SelectItem value="manual">Manual (escolher leads)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tipo === "smart" && (
              <>
                <div>
                  <Label>Status do lead</Label>
                  <Select value={filtros.status ?? "any"} onValueChange={(v) => setFiltros({ ...filtros, status: v === "any" ? undefined : v })}>
                    <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Qualquer</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="contatado">Contatado</SelectItem>
                      <SelectItem value="qualificado">Qualificado</SelectItem>
                      <SelectItem value="proposta">Proposta</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Cidade contém</Label><Input value={filtros.cidade ?? ""} onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value || undefined })} /></div>
                  <div><Label>Estado</Label><Input value={filtros.estado ?? ""} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value || undefined })} placeholder="SP" /></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter><Button onClick={criar} disabled={!nome}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manageList} onOpenChange={(v) => !v && setManageList(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Adicionar leads a "{manageList?.nome}"</DialogTitle></DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {allLeads.map((l) => (
              <label key={l.id} className="flex items-center gap-2 p-2 hover:bg-accent/30 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLeads.has(l.id)}
                  onChange={(e) => {
                    const s = new Set(selectedLeads);
                    if (e.target.checked) s.add(l.id); else s.delete(l.id);
                    setSelectedLeads(s);
                  }}
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">{l.nome}</div>
                  <div className="text-xs text-muted-foreground">{l.email} · {l.cidade ?? "—"} · {l.status}</div>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={adicionarSelecionados} disabled={selectedLeads.size === 0}>
              Adicionar {selectedLeads.size > 0 ? `(${selectedLeads.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// CAMPANHAS
// ============================================================
function CampanhasTab() {
  const { user, workspace } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [senders, setSenders] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ nome: "", templateId: "", listId: "", senderId: "", quando: "agora", agendadaPara: "" });
  const [statsCampaign, setStatsCampaign] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);

  const load = async () => {
    if (!user || !workspace) return;
    try {
      const [c, t, l, s] = await Promise.all([
        listCampaigns({ data: { userId: user.id, workspaceId: workspace.id } }),
        listTemplates({ data: { userId: user.id, workspaceId: workspace.id } }),
        listLists({ data: { userId: user.id, workspaceId: workspace.id } }),
        listSenders({ data: { userId: user.id, workspaceId: workspace.id } }),
      ]);
      setCampaigns(c.campaigns);
      setTemplates(t.templates);
      setLists(l.lists);
      setSenders(s.senders);
    } catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspace?.id]);

  const criar = async () => {
    if (!user || !workspace) return;
    try {
      await createCampaign({
        data: {
          userId: user.id, workspaceId: workspace.id,
          nome: form.nome, templateId: form.templateId, listId: form.listId, senderId: form.senderId,
          enviarAgora: form.quando === "agora",
          agendadaPara: form.quando === "agendar" ? new Date(form.agendadaPara).toISOString() : undefined,
        },
      });
      toast.success("Campanha criada — envio iniciará em até 1 min");
      setOpen(false);
      setForm({ nome: "", templateId: "", listId: "", senderId: "", quando: "agora", agendadaPara: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const pausar = async (id: string) => {
    if (!user || !workspace) return;
    await pauseCampaign({ data: { userId: user.id, workspaceId: workspace.id, id } });
    load();
  };
  const cancelar = async (id: string) => {
    if (!user || !workspace) return;
    if (!confirm("Cancelar campanha?")) return;
    await cancelCampaign({ data: { userId: user.id, workspaceId: workspace.id, id } });
    load();
  };

  const verStats = async (c: any) => {
    setStatsCampaign(c); setStats(null);
    if (!user || !workspace) return;
    const r = await getCampaignStats({ data: { userId: user.id, workspaceId: workspace.id, id: c.id } });
    setStats(r.stats);
  };

  const sendersVerificados = senders.filter((s) => s.status === "verificado");

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Crie campanhas únicas para sua lista de leads. Use templates e remetente verificado.
        </p>
        <Button onClick={() => setOpen(true)} disabled={sendersVerificados.length === 0 || templates.length === 0 || lists.length === 0}>
          <Plus className="h-4 w-4 mr-1" />Nova campanha
        </Button>
      </div>

      {(sendersVerificados.length === 0 || templates.length === 0 || lists.length === 0) && (
        <Card className="p-4 bg-muted/30 text-sm">
          Para criar uma campanha, você precisa de pelo menos:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>1 remetente <strong>verificado</strong> (aba Remetentes)</li>
            <li>1 template (aba Templates)</li>
            <li>1 lista de contatos (aba Listas)</li>
          </ul>
        </Card>
      )}

      <div className="grid gap-3">
        {campaigns.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{c.nome}</div>
                  <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-x-3">
                  <span>Template: {c.email_templates?.nome ?? "—"}</span>
                  <span>Lista: {c.email_lists?.nome ?? "—"}</span>
                  <span>De: {c.email_senders?.email ?? "—"}</span>
                </div>
                {c.agendada_para && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Envio: {new Date(c.agendada_para).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => verStats(c)}>
                  <BarChart3 className="h-4 w-4 mr-1" />Stats
                </Button>
                {(c.status === "agendada" || c.status === "enviando") && (
                  <Button size="icon" variant="ghost" onClick={() => pausar(c.id)} title="Pausar">
                    <Pause className="h-4 w-4" />
                  </Button>
                )}
                {["rascunho", "agendada", "pausada"].includes(c.status) && (
                  <Button size="icon" variant="ghost" onClick={() => cancelar(c.id)} title="Cancelar">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">Nenhuma campanha ainda.</Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div>
              <Label>Template</Label>
              <Select value={form.templateId} onValueChange={(v) => setForm({ ...form, templateId: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lista</Label>
              <Select value={form.listId} onValueChange={(v) => setForm({ ...form, listId: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                <SelectContent>{lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome} ({l.contagem ?? 0})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remetente</Label>
              <Select value={form.senderId} onValueChange={(v) => setForm({ ...form, senderId: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                <SelectContent>{sendersVerificados.map((s) => <SelectItem key={s.id} value={s.id}>{s.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quando enviar</Label>
              <Select value={form.quando} onValueChange={(v) => setForm({ ...form, quando: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agora">Agora</SelectItem>
                  <SelectItem value="agendar">Agendar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.quando === "agendar" && (
              <div>
                <Label>Data/hora</Label>
                <Input type="datetime-local" value={form.agendadaPara} onChange={(e) => setForm({ ...form, agendadaPara: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={criar} disabled={!form.nome || !form.templateId || !form.listId || !form.senderId || (form.quando === "agendar" && !form.agendadaPara)}>
              <Send className="h-4 w-4 mr-1" />Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statsCampaign} onOpenChange={(v) => !v && setStatsCampaign(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Estatísticas: {statsCampaign?.nome}</DialogTitle></DialogHeader>
          {!stats ? <p className="text-muted-foreground">Carregando…</p> : (
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Enviados" value={stats.enviados} />
              <StatBox label="Entregues" value={stats.entregues} />
              <StatBox label="Aberturas únicas" value={stats.aberturas} />
              <StatBox label="Cliques únicos" value={stats.cliques} />
              <StatBox label="Bounces" value={stats.bounces} />
              <StatBox label="Descadastros" value={stats.descadastros} />
              <StatBox label="Falhas" value={stats.falhas} />
              <StatBox label="Suprimidos" value={stats.suprimidos} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value ?? 0}</div>
    </div>
  );
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "enviada") return "default";
  if (s === "enviando" || s === "agendada") return "secondary";
  if (s === "cancelada" || s === "pausada") return "outline";
  return "outline";
}
