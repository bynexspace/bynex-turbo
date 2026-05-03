import { ReactNode, useState, useEffect } from "react";
import { usePlanGate, type Plan } from "@/lib/plan-gate";
import { UpgradeModal } from "@/components/UpgradeModal";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

const NAMES: Record<Plan, string> = { essencial: "Essencial", pro: "Pro", premium: "Premium" };

export function FeatureGate({
  feature,
  label,
  children,
}: {
  feature: string;
  label: string;
  children: ReactNode;
}) {
  const { allows, requiredFor } = usePlanGate();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ok = allows(feature);
  const required = requiredFor(feature) ?? "pro";

  useEffect(() => { if (!ok) setOpen(true); }, [ok]);

  if (ok) return <>{children}</>;

  return (
    <>
      <AppLayout title={label} subtitle={`Disponível no plano ${NAMES[required]}`}>
        <Card className="p-12 text-center max-w-md mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/15">
            <Lock className="h-7 w-7 text-brand" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Recurso bloqueado</h3>
          <p className="text-sm text-muted-foreground mb-5">
            <strong>{label}</strong> faz parte do plano {NAMES[required]}.
          </p>
          <Button onClick={() => navigate({ to: "/plano" })}>Ver planos</Button>
        </Card>
      </AppLayout>
      <UpgradeModal open={open} onOpenChange={setOpen} feature={label} requiredPlan={required} />
    </>
  );
}
