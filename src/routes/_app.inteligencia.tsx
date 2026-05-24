import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { FeatureGate } from "@/components/FeatureGate";

export const Route = createFileRoute("/_app/inteligencia")({
  component: () => (<FeatureGate feature="inteligencia" label="Inteligência Comercial"><IntelPage /></FeatureGate>),
});

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const DORES = ["Falta de clientes","Gestão financeira","Concorrência","Retenção","Outros"];

function IntelPage() {
  const { workspace } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [modo, setModo] = useState<"sdr"|"closer">("sdr");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [segmento, setSegmento] = useState("");
  const [cnae, setCnae] = useState("");
  const [porte, setPorte] = useState("Pequeno");
  const [tempo, setTempo] = useState("1-5 anos");
  const [dores, setDores] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const load = () => {
    if (!workspace) return;
    supabase.from("intel_reports").select("*").eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setHistory(data ?? []));
  };
  useEffect(load, [workspace]);

  const gerar = async () => {
    if (!estado || !segmento) return toast.error("Preencha estado e segmento");
    setBusy(true);
    try {
      const res = await authedFetch("/api/ai-intel", {
        method: "POST",
        body: JSON.stringify({ workspaceId: workspace!.id, modo, estado, cidade, segmento, cnae, porte, tempo, dores }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.resultado);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const Bar = ({ label, value, color }: any) => (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="font-semibold">{value}/100</span></div>
      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={color} style={{ width: `${value}%`, height: "100%" }} /></div>
    </div>
  );

  return (
    <AppLayout title="Inteligência Comercial" subtitle="Análises estratégicas para pré-venda e negociação">
      <div className="grid lg:grid-cols-12 gap-4">
        <Card className="p-4 lg:col-span-3">
          <h3 className="font-semibold mb-3 text-sm">Histórico</h3>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {history.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma análise ainda</p>}
            {history.map(h => (
              <button key={h.id} onClick={() => setResult(h.resultado)} className="w-full text-left p-2 hover:bg-muted rounded text-xs">
                <div className="font-medium">{h.segmento} · {h.cidade}/{h.estado}</div>
                <div className="text-muted-foreground">{h.modo.toUpperCase()} · {h.porte} · {format(new Date(h.created_at),"dd/MM HH:mm")}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-5">
          <div className="flex gap-2 mb-4">
            {(["sdr","closer"] as const).map(m => (
              <button key={m} onClick={() => setModo(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${modo===m ? "bg-brand text-white" : "bg-muted"}`}>
                {m === "sdr" ? "SDR/BDR" : "Vendedor/Closer"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{ESTADOS.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Cidade</Label><Input value={cidade} onChange={e=>setCidade(e.target.value)} /></div>
            <div><Label>Segmento</Label><Input value={segmento} onChange={e=>setSegmento(e.target.value)} placeholder="Ex: clínica odonto" /></div>
            <div><Label>CNAE (opcional)</Label><Input value={cnae} onChange={e=>setCnae(e.target.value)} /></div>
            <div><Label>Porte</Label>
              <Select value={porte} onValueChange={setPorte}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Pequeno","Médio","Grande"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tempo</Label>
              <Select value={tempo} onValueChange={setTempo}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Startup","1-5 anos","5-10 anos","+10 anos"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3">
            <Label className="mb-2 block">Principais Dores</Label>
            <div className="flex flex-wrap gap-1">
              {DORES.map(d => (
                <button key={d} onClick={() => setDores(s => s.includes(d) ? s.filter(x=>x!==d) : [...s,d])}
                  className={`px-3 py-1 rounded-full text-xs border ${dores.includes(d) ? "bg-brand text-white border-brand" : "bg-card border-border"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full mt-4" onClick={gerar} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Análise
          </Button>
        </Card>

        <Card className="p-5 lg:col-span-4">
          <h3 className="font-semibold mb-3 text-sm">Resultado</h3>
          {!result ? (
            <p className="text-sm text-muted-foreground">Preencha o formulário e gere uma análise.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <Bar label="Nível de Risco" value={result.nivel_risco} color="bg-destructive" />
              <Bar label="Score de Oportunidade" value={result.score_oportunidade} color="bg-success" />
              <Bar label="Nível de Concorrência" value={result.nivel_concorrencia} color="bg-warning" />
              <div className="pt-2 border-t border-border">
                <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Visão Geral</div>
                <p className="text-sm">{result.visao_geral}</p>
              </div>
              <div>
                <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Tamanho do Mercado</div>
                <p className="text-sm">{result.tamanho_mercado}</p>
              </div>
              <div>
                <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Script de Abertura</div>
                <p className="text-sm italic">{result.script_abertura}</p>
              </div>
              {result.perguntas_qualificacao && (
                <div>
                  <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Perguntas de Qualificação</div>
                  <ul className="text-sm list-disc pl-4 space-y-0.5">{result.perguntas_qualificacao.map((p:string,i:number)=><li key={i}>{p}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
