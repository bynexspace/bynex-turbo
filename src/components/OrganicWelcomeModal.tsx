import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sprout, Users, ListChecks, Kanban, Flame } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OrganicWelcomeModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-organic/15 p-2.5">
              <Sprout className="h-6 w-6 text-organic" />
            </div>
            <div>
              <DialogTitle className="text-xl">Bem-vindo ao Modo Organic</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                A metodologia Organic agora integrada à sua operação
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {[
            { icon: Users, title: "Módulo de Referidos", desc: "Pedidos e validação de indicações (Passos 6 e 7)." },
            { icon: ListChecks, title: "As 3 Listas", desc: "Ciclo Social, Possíveis Indicadores e Antigos Clientes." },
            { icon: Kanban, title: "Tracker dos 7 Passos", desc: "CRM com pipeline da metodologia e checklists contextuais." },
            { icon: Flame, title: "Check-in Diário", desc: "Tanque emocional, meta de abordagens e streak de execução." },
          ].map((f) => (
            <div key={f.title} className="flex gap-3 rounded-lg border border-border p-3 bg-card/50">
              <f.icon className="h-5 w-5 text-organic shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={onClose} className="w-full mt-2 bg-organic hover:bg-organic/90 text-background font-semibold">
          Vamos começar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
