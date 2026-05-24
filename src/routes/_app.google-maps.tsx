import { authedFetch } from "@/lib/api-auth";
import { createFileRoute } from "@tanstack/react-router";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Plus, AlertTriangle, Loader2, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/google-maps")({ component: GMapsPage });

function GMapsPage() {
  const { workspace } = useAuth();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState("50");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    supabase.from("integrations").select("apify_key").eq("workspace_id", workspace.id).maybeSingle()
      .then(({ data }) => setHasKey(!!data?.apify_key));
  }, [workspace]);

  const buscar = async () => {
    if (!query.trim()) return toast.error("Informe o que procurar");
    setBusy(true);
    try {
      const res = await authedFetch("/api/apify-search", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace!.id,
          query, qty: Number(qty), estado, cidade, bairro,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      toast.success(`${data.results?.length ?? 0} resultados`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const adicionar = async (r: any) => {
    const { error } = await supabase.from("leads").insert({
      workspace_id: workspace!.id, nome: r.title, telefone: r.phone,
      site: r.website, rating: r.rating, reviews: r.reviewsCount,
      cidade: r.city, estado: r.state, endereco: r.address, origem: "google_maps",
    });
    if (error) toast.error("Erro"); else toast.success("Adicionado ao CRM");
  };

  const cost = (Number(qty) * 0.004).toFixed(3);

  return (
    <AppLayout title="Buscar Leads" subtitle="Encontre negócios no Google Maps e adicione ao seu CRM">
      {hasKey === false && (
        <Card className="p-4 mb-4 border-warning bg-warning/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div className="flex-1 text-sm">API key do Apify não configurada.</div>
          <Button asChild size="sm"><Link to="/integracoes">Configurar</Link></Button>
        </Card>
      )}
      <Card className="p-5 mb-4">
        <h3 className="font-semibold mb-3">Pesquisar Negócios</h3>
        <div className="flex gap-2 mb-3">
          <Input className="flex-1" placeholder="Ex: restaurantes, dentistas, advogados, academias…"
            value={query} onChange={e => setQuery(e.target.value)} />
          <Select value={qty} onValueChange={setQty}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 leads</SelectItem>
              <SelectItem value="100">100 leads</SelectItem>
              <SelectItem value="200">200 leads</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={buscar} disabled={busy || hasKey === false}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Buscar
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>{ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
          <Input placeholder="Bairro (opcional)" value={bairro} onChange={e => setBairro(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">Custo estimado: ${cost} ({qty} × $0.004)</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {results.map((r, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-semibold">{r.title}</h4>
                {r.rating && (
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span>{r.rating}</span>
                    <span className="text-muted-foreground">({r.reviewsCount} reviews)</span>
                  </div>
                )}
                {r.phone && <div className="text-sm mt-1">{r.phone}</div>}
                {!r.website ? (
                  <div className="text-xs text-destructive font-medium mt-1">⚠ Sem site — oportunidade</div>
                ) : (
                  <a href={r.website} target="_blank" className="text-xs text-brand hover:underline">{r.website}</a>
                )}
              </div>
              <Button size="sm" onClick={() => adicionar(r)}><Plus className="h-3 w-3 mr-1" />CRM</Button>
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
