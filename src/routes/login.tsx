import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import bynexLogo from "@/assets/bynex-logo.png";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src={bynexLogo} alt="BYNEX Turbo" className="h-32 w-auto object-contain" />
        </div>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-center mb-1">
            {mode === "login" ? "Entrar na sua conta" : "Criar nova conta"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            CRM e geração de leads para serviços locais
          </p>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label>Nome completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>Não tem conta?{" "}
                <button onClick={() => setMode("signup")} className="text-brand font-medium hover:underline">Cadastre-se</button>
              </>
            ) : (
              <>Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-brand font-medium hover:underline">Entrar</button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
