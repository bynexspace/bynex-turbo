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
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    supabase.from("integrations").select("apify_key").eq("workspace_id", workspace.id).maybeSingle()
      .then(({ data }) => {
        if (data?.apify_key) { setKey(data.apify_key); setSaved(true); }
      });
  }, [workspace]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("integrations").upsert({
      workspace_id: workspace!.id, apify_key: key,
    }, { onConflict: "workspace_id" });
    setBusy(false);
    if (error) toast.error("Erro ao salvar"); else { toast.success("Salvo!"); setSaved(true); }
  };

  const remove = async () => {
    setBusy(true);
    await supabase.from("integrations").update({ apify_key: null }).eq("workspace_id", workspace!.id);
    setBusy(false); setKey(""); setSaved(false); toast.success("Removido");
  };

  return (
    <AppLayout title="Integrações" subtitle="Conecte serviços externos ao seu workspace">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${saved ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Apify</div>
                <div className="text-xs text-muted-foreground">Google Maps Scraper</div>
              </div>
            </div>
            <Badge className={saved ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
              {saved ? <><Check className="h-3 w-3 mr-1" />Conectado</> : "Desconectado"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Custo aproximado: $0.004 por lead retornado.
          </p>
          <Label>API Token</Label>
          <Input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="apify_api_..." />
          <div className="flex gap-2 mt-3">
            <Button onClick={save} disabled={busy || !key}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
            {saved && <Button variant="destructive" onClick={remove}><X className="h-4 w-4 mr-1" />Remover</Button>}
          </div>
          <ol className="text-xs text-muted-foreground mt-4 space-y-1 list-decimal pl-4">
            <li>Crie conta em apify.com</li>
            <li>Acesse Settings → Integrations</li>
            <li>Copie sua API Token</li>
            <li>Cole aqui e salve</li>
          </ol>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold">Busca CNAE</div>
              <div className="text-xs text-muted-foreground">Receita Federal · BrasilAPI</div>
            </div>
            <Badge className="bg-brand/15 text-brand">Incluída no Plano</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Já vem inclusa com 1.000 créditos mensais. Sem configuração necessária.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
