import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useOrganic } from "@/lib/organic-context";
import { Sprout } from "lucide-react";
import { useState } from "react";
import { OrganicWelcomeModal } from "@/components/OrganicWelcomeModal";

export const Route = createFileRoute("/_app/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  const { enabled, setEnabled, firstSeen, markFirstSeen } = useOrganic();
  const [welcome, setWelcome] = useState(false);

  const onToggle = async (v: boolean) => {
    await setEnabled(v);
    if (v && !firstSeen) setWelcome(true);
  };

  const closeWelcome = async () => {
    setWelcome(false);
    await markFirstSeen();
  };

  return (
    <AppLayout title="Configurações" subtitle="Preferências da sua conta">
      <div className="max-w-2xl space-y-4">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="rounded-xl bg-organic/15 p-2.5 h-fit">
                <Sprout className="h-5 w-5 text-organic" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Modo Organick</h3>
                  {enabled && <Badge className="bg-organic/15 text-organic border-organic/30">Ativo</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Ativa a metodologia Organick: Referidos, As 3 Listas, Tracker dos 7 Passos e Check-in Diário.
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>
        </Card>
      </div>
      <OrganicWelcomeModal open={welcome} onClose={closeWelcome} />
    </AppLayout>
  );
}
