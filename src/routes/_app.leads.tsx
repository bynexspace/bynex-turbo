import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/leads")({ component: LeadsPage });

const STATUS_BADGE: Record<string, string> = {
  novo: "bg-brand/15 text-brand",
  contactado: "bg-slate-200 text-slate-700",
  negociando: "bg-warning/15 text-warning",
  convertido: "bg-success/15 text-success",
  perdido: "bg-destructive/15 text-destructive",
};

function LeadsPage() {
  const { workspace } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [origem, setOrigem] = useState("all");

  useEffect(() => {
    if (!workspace) return;
    supabase.from("leads").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false })
      .then(({ data }) => setLeads(data ?? []));
  }, [workspace]);

  const filtered = leads.filter(l =>
    (status === "all" || l.status === status) &&
    (origem === "all" || l.origem === origem) &&
    (q === "" || l.nome.toLowerCase().includes(q.toLowerCase()))
  );

  const exportCsv = () => {
    const rows = [["Nome","Telefone","Email","Status","Origem","Cidade","Data"],
      ...filtered.map(l => [l.nome, l.telefone||"", l.email||"", l.status, l.origem, l.cidade||"", format(new Date(l.created_at),"dd/MM/yyyy")])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
  };

  return (
    <AppLayout title="Todos os Leads" subtitle={`${filtered.length} leads`}
      actions={<Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>}>
      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Buscar por nome…" value={q} onChange={e => setQ(e.target.value)} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {["novo","contactado","negociando","convertido","perdido"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {["google_maps","cnae","linkedin","manual"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Nome</th><th className="text-left p-3">Telefone</th>
              <th className="text-left p-3">Status</th><th className="text-left p-3">Origem</th>
              <th className="text-left p-3">Cidade</th><th className="text-left p-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{l.nome}</td>
                <td className="p-3">{l.telefone || "—"}</td>
                <td className="p-3"><Badge className={STATUS_BADGE[l.status]}>{l.status}</Badge></td>
                <td className="p-3"><Badge variant="outline">{l.origem}</Badge></td>
                <td className="p-3">{l.cidade || "—"}</td>
                <td className="p-3 text-muted-foreground">{format(new Date(l.created_at), "dd/MM/yyyy")}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lead encontrado</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </AppLayout>
  );
}
