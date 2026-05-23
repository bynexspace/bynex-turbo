import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lookupUnsubscribeToken, confirmUnsubscribe } from "@/server/unsubscribe.functions";
import bynexMark from "@/assets/bynex-mark.png";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s) => z.object({ token: z.string().optional() }).parse(s),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "invalid" }
    | { kind: "ready"; email: string; alreadyUsed: boolean }
    | { kind: "done"; email: string }
    | { kind: "submitting"; email: string }
  >({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    lookupUnsubscribeToken({ data: { token } })
      .then((r) => {
        if (!r.valid) setState({ kind: "invalid" });
        else setState({ kind: "ready", email: r.email, alreadyUsed: r.alreadyUsed });
      })
      .catch(() => setState({ kind: "invalid" }));
  }, [token]);

  const confirmar = async () => {
    if (state.kind !== "ready" || !token) return;
    setState({ kind: "submitting", email: state.email });
    try {
      const r = await confirmUnsubscribe({ data: { token } });
      setState({ kind: "done", email: r.email });
    } catch {
      setState({ kind: "invalid" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={bynexMark} alt="BYNEX" className="h-12 w-12 rounded-lg" />
          <h1 className="text-2xl font-bold">Descadastrar</h1>
        </div>

        {state.kind === "loading" && (
          <p className="text-center text-muted-foreground">Verificando…</p>
        )}

        {state.kind === "invalid" && (
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">Link inválido ou expirado</p>
            <p className="text-sm text-muted-foreground">
              Se você quer parar de receber emails, responda diretamente ao remetente.
            </p>
          </div>
        )}

        {state.kind === "ready" && !state.alreadyUsed && (
          <>
            <p className="text-center text-sm">
              Confirme o descadastro de <strong>{state.email}</strong>. Você não receberá mais
              emails desta lista.
            </p>
            <Button className="w-full" onClick={confirmar}>
              Confirmar descadastro
            </Button>
          </>
        )}

        {state.kind === "ready" && state.alreadyUsed && (
          <p className="text-center text-muted-foreground">
            <strong>{state.email}</strong> já foi descadastrado anteriormente.
          </p>
        )}

        {state.kind === "submitting" && (
          <p className="text-center text-muted-foreground">Processando…</p>
        )}

        {state.kind === "done" && (
          <div className="text-center space-y-2">
            <p className="text-green-600 font-medium">Pronto!</p>
            <p className="text-sm text-muted-foreground">
              <strong>{state.email}</strong> não receberá mais emails desta lista.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
