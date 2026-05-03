import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/plano")({ component: PlanoPage });

const PLANS = [
  { id: "essencial", nome: "Essencial", preco: 1500, features: ["CRM", "Geração de leads", "Cadências"] },
  { id: "pro", nome: "Pro", preco: 2500, features: ["Tudo do Essencial", "Assistente IA", "Inteligência Comercial"] },
  { id: "premium", nome: "Premium", preco: 4500, features: ["Tudo do Pro", "Consultor dedicado", "Relatórios avançados"] },
];

function PlanoPage() {
  const { workspace } = useAuth();
  return (
    <AppLayout title="Plano" subtitle={`Plano atual: ${workspace?.plano || "—"}`}>
      <Card className="p-4 mb-4 bg-brand/5 border-brand/30">
        <p className="text-sm">
          💬 Para ativar ou trocar de plano, entre em contato com nosso time comercial.
          A ativação é feita manualmente pelo administrador da plataforma.
        </p>
      </Card>
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map(p => {
          const active = workspace?.plano === p.id;
          return (
            <Card key={p.id} className={`p-6 relative ${active ? "ring-2 ring-brand" : ""}`}>
              {active && <Badge className="absolute top-3 right-3 bg-brand">Atual</Badge>}
              <h3 className="text-xl font-bold">{p.nome}</h3>
              <div className="mt-2"><span className="text-3xl font-bold">R$ {p.preco.toLocaleString("pt-BR")}</span><span className="text-muted-foreground">/mês</span></div>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map(f => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>)}
              </ul>
              <Button className="w-full mt-6" disabled={active} variant={active ? "outline" : "default"} onClick={() => toast.info("Entre em contato com o suporte para ativar este plano")}>
                {active ? "Plano atual" : "Solicitar"}
              </Button>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
