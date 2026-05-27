import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useOrganic } from "@/lib/organic-context";
import { supabase } from "@/integrations/supabase/client";
import { Rocket } from "lucide-react";

const EMOJIS = ["😔", "😐", "🙂", "😎", "🔥"];

function todayISO() {
  const d = new Date();
  // America/Sao_Paulo (UTC-3) approximation
  const offset = -180;
  const local = new Date(d.getTime() + (offset - d.getTimezoneOffset()) * 60000);
  return local.toISOString().slice(0, 10);
}

export function DailyCheckinGate({ children }: { children: React.ReactNode }) {
  const { user, workspace } = useAuth();
  const { enabled } = useOrganic();
  const [needsCheckin, setNeedsCheckin] = useState(false);
  const [checked, setChecked] = useState(false);
  const [tank, setTank] = useState<number>(3);
  const [target, setTarget] = useState<number>(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !enabled) { setChecked(true); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", todayISO())
        .maybeSingle();
      if (cancelled) return;
      setNeedsCheckin(!data);
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user, enabled]);

  const submit = async () => {
    if (!user || !workspace) return;
    setSaving(true);
    await supabase.from("daily_checkins").insert({
      user_id: user.id,
      workspace_id: workspace.id,
      date: todayISO(),
      emotional_tank_level: tank,
      target_approaches: target,
      actual_approaches: 0,
      completed: false,
    });
    setSaving(false);
    setNeedsCheckin(false);
  };

  if (!checked) return null;

  return (
    <>
      {children}
      <Dialog open={needsCheckin && enabled} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <div className="space-y-5 py-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-organic font-semibold">Check-in Diário</div>
              <h2 className="text-xl font-bold mt-1">Bora pra cima hoje?</h2>
            </div>

            <div className="space-y-2">
              <Label>Como tá teu tanque emocional hoje?</Label>
              <div className="flex justify-between gap-2">
                {EMOJIS.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => setTank(i + 1)}
                    className={`flex-1 text-3xl py-2 rounded-lg border-2 transition-all ${
                      tank === i + 1 ? "border-organic bg-organic/10 scale-110" : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantas pessoas você vai abordar hoje?</Label>
              <Input type="number" min={1} value={target} onChange={(e) => setTarget(parseInt(e.target.value || "5"))} />
              <p className="text-xs text-muted-foreground">Mínimo da metodologia: 5</p>
            </div>

            <div className="space-y-2">
              <Label>Tá pronto pra trocar reclamação por prospecção?</Label>
              <Button
                onClick={submit}
                disabled={saving}
                className="w-full bg-organic hover:bg-organic/90 text-background font-bold text-lg py-6"
              >
                <Rocket className="h-5 w-5 mr-2" /> Bora 🚀
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
