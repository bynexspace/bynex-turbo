import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Download, TrendingUp, Users, DollarSign, TrendingDown, Phone, MessageCircle, CheckCircle2, Sparkles } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardPage });

const STATUS_COLORS: Record<string, string> = {
  novo: "#185FA5",
  contactado: "#94a3b8",
  negociando: "#f59e0b",
  convertido: "#10b981",
  perdido: "#ef4444",
};

function DashboardPage() {
  const { workspace } = useAuth();
  const [period, setPeriod] = useState<7 | 30 | 90>(7);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    supabase.from("leads").select("*").eq("workspace_id", workspace.id)
      .then(({ data }) => { setLeads(data ?? []); setLoading(false); });
  }, [workspace, period]);

  const total = leads.length;
  const byStatus = (s: string) => leads.filter(l => l.status === s).length;
  const convertidos = byStatus("convertido");
  const perdidos = byStatus("perdido");
  const taxaConv = total ? Math.round((convertidos / total) * 100) : 0;
  const taxaPerda = total ? Math.round((perdidos / total) * 100) : 0;
  const valorConv = leads.filter(l => l.status === "convertido").reduce((a, l) => a + Number(l.valor_estimado || 0), 0);
  const valorTotal = leads.reduce((a, l) => a + Number(l.valor_estimado || 0), 0);
  const enriquecidos = leads.filter(l => l.telefone || l.email).length;
  const taxaEnrich = total ? Math.round((enriquecidos / total) * 100) : 0;

  // Daily series
  const days = Array.from({ length: period }, (_, i) => startOfDay(subDays(new Date(), period - 1 - i)));
  const series = days.map(d => {
    const label = format(d, period > 30 ? "dd/MM" : "dd/MM", { locale: ptBR });
    const next = new Date(d.getTime() + 86400000);
    const count = leads.filter(l => {
      const t = new Date(l.created_at);
      return t >= d && t < next;
    }).length;
    return { dia: label, leads: count };
  });

  const donutData = ["novo","contactado","negociando","convertido","perdido"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: byStatus(s),
    color: STATUS_COLORS[s],
  })).filter(d => d.value > 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Visão geral do seu funil de prospecção"
      actions={
        <>
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {[7,30,90].map(p => (
              <button key={p} onClick={() => setPeriod(p as any)}
                className={`px-3 py-1.5 text-xs rounded-md ${period===p ? "bg-brand text-white" : "text-muted-foreground hover:bg-accent"}`}>
                {p} dias
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : (
        <div className="space-y-6">
          {/* Linha 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI icon={Users} label="Total de Leads" value={total.toString()} hint=" " color="text-brand" />
            <KPI icon={TrendingUp} label="Taxa de Conversão" value={`${taxaConv}%`} hint={`${convertidos} convertidos`} color="text-success" />
            <KPI icon={DollarSign} label="Valor Convertido" value={fmt(valorConv)} hint={`de ${fmt(valorTotal)} total`} color="text-success" />
            <KPI icon={TrendingDown} label="Taxa de Perda" value={`${taxaPerda}%`} hint={`${perdidos} perdidos`} color="text-destructive" />
          </div>

          {/* Linha 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI icon={Sparkles} label="Novos" value={byStatus("novo").toString()} hint=" " color="text-brand" />
            <KPI icon={Phone} label="Contactados" value={byStatus("contactado").toString()} hint=" " color="text-muted-foreground" />
            <KPI icon={MessageCircle} label="Negociando" value={byStatus("negociando").toString()} hint=" " color="text-warning" />
            <KPI icon={CheckCircle2} label="Enriquecidos" value={`${taxaEnrich}%`} hint={`${enriquecidos} leads`} color="text-info" />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-4">Leads por dia</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dia" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="leads" stroke="#185FA5" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Funil por status</h3>
              <div className="h-64">
                {donutData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados ainda</div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function KPI({ icon: Icon, label, value, hint, color }: any) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{hint}</div>
        </div>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </Card>
  );
}
