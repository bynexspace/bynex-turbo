import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import type { Plan } from "@/lib/plan-gate";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  feature: string;
  requiredPlan: Plan;
}

const PLAN_NAMES: Record<Plan, string> = { essencial: "Essencial", pro: "Pro", premium: "Premium" };

export function UpgradeModal({ open, onOpenChange, feature, requiredPlan }: Props) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15">
            <Sparkles className="h-6 w-6 text-brand" />
          </div>
          <DialogTitle className="text-center">Recurso disponível no plano {PLAN_NAMES[requiredPlan]}</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-medium">{feature}</span> faz parte do plano {PLAN_NAMES[requiredPlan]}. Faça upgrade para liberar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Agora não</Button>
          <Button onClick={() => { onOpenChange(false); navigate({ to: "/plano" }); }}>
            Ver planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
