import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plug, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/integracoes")({ component: IntegracoesPage });

function IntegracoesPage() {
  const { workspace } = useAuth();
  const [apify, setApify] = useState("");
  const [apifySaved, setApifySaved] = useState(false);
  const [cnpja, setCnpja] = useState("");
  const [cnpjaSaved, setCnpjaSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    supabase.from("integrations").select("apify_key, cnpja_key").eq("workspace_id", workspace.id).maybeSingle()
      .then(({ data }) => {
        if (data?.apify_key) { setApify(data.apify_key); setApifySaved(true); }
        if ((data as any)?.cnpja_key) { setCnpja((data as any).cnpja_key); setCnpjaSaved(true); }
      });
  }, [workspace]);

  const saveField = async (field: "apify_key" | "cnpja_key", value: string, kind: string) => {
    setBusy(kind);
    const { error } = await supabase.from("integrations").upsert({
      workspace_id: workspace!.id, [field]: value,
    } as any, { onConflict: "workspace_id" });
    setBusy(null);
    if (error) toast.error("Erro ao salvar");
    else { toast.success("Salvo!"); if (field === "apify_key") setApifySaved(true); else setCnpjaSaved(true); }
  };

  const removeField = async (field: "apify_key" | "cnpja_key", kind: string) => {
    setBusy(kind);
    await supabase.from("integrations").update({ [field]: null } as any).eq("workspace_id", workspace!.id);
    setBusy(null);
    if (field === "apify_key") { setApify(""); setApifySaved(false); } else { setCnpja(""); setCnpjaSaved(false); }
    toast.success("Removido");
  };

  return (
    <AppLayout title="Integrações" subtitle="Conecte serviços externos ao seu workspace">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${apifySaved ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Apify</div>
                <div className="text-xs text-muted-foreground">Google Maps Scraper</div>
              </div>
            </div>
            <Badge className={apifySaved ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
              {apifySaved ? <><Check className="h-3 w-3 mr-1" />Conectado</> : "Desconectado"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Custo aproximado: $0.004 por lead retornado.</p>
          <Label>API Token</Label>
          <Input type="password" value={apify} onChange={e => setApify(e.target.value)} placeholder="apify_api_..." />
          <div className="flex gap-2 mt-3">
            <Button onClick={() => saveField("apify_key", apify, "apify")} disabled={busy==="apify" || !apify}>
              {busy==="apify" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
            {apifySaved && <Button variant="destructive" onClick={() => removeField("apify_key", "apify")}><X className="h-4 w-4 mr-1" />Remover</Button>}
          </div>
          <ol className="text-xs text-muted-foreground mt-4 space-y-1 list-decimal pl-4">
            <li>Crie conta em apify.com</li>
            <li>Settings → Integrations → API Token</li>
            <li>Cole aqui e salve</li>
          </ol>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cnpjaSaved ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">CNPJá</div>
                <div className="text-xs text-muted-foreground">Busca CNAE · Receita Federal</div>
              </div>
            </div>
            <Badge className={cnpjaSaved ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
              {cnpjaSaved ? <><Check className="h-3 w-3 mr-1" />Conectado</> : "Desconectado"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Plano gratuito: 1.000 consultas/mês. Plano pago a partir de R$ 29/mês.</p>
          <Label>API Token</Label>
          <Input type="password" value={cnpja} onChange={e => setCnpja(e.target.value)} placeholder="cnpja_..." />
          <div className="flex gap-2 mt-3">
            <Button onClick={() => saveField("cnpja_key", cnpja, "cnpja")} disabled={busy==="cnpja" || !cnpja}>
              {busy==="cnpja" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
            {cnpjaSaved && <Button variant="destructive" onClick={() => removeField("cnpja_key", "cnpja")}><X className="h-4 w-4 mr-1" />Remover</Button>}
          </div>
          <ol className="text-xs text-muted-foreground mt-4 space-y-1 list-decimal pl-4">
            <li>Crie conta em cnpja.com</li>
            <li>Dashboard → API → Gerar Token</li>
            <li>Cole aqui e salve</li>
          </ol>
        </Card>
      </div>
    </AppLayout>
  );
}
