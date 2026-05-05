import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Lock, MessageCircle, LogOut } from "lucide-react";
import bynexLogo from "@/assets/bynex-logo.png";

const WHATSAPP_URL = "https://wa.me/5500000000000?text=Ol%C3%A1%2C%20preciso%20ativar%20minha%20conta%20no%20Bynex%20Turbo";

export function AccountSuspended() {
  const { signOut, user, workspace } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
            <Zap className="h-5 w-5 text-white" fill="white" />
          </div>
          <div className="text-left">
            <div className="text-lg font-bold leading-tight">Bynex</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">turbo</div>
          </div>
        </div>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand/15">
          <Lock className="h-8 w-8 text-brand" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Conta aguardando ativação</h1>
        <p className="text-muted-foreground mb-1">
          Olá{user?.email ? `, ${user.email}` : ""}.
        </p>
        <p className="text-muted-foreground mb-8">
          Sua conta {workspace?.nome ? <strong>({workspace.nome})</strong> : null} está suspensa.
          Entre em contato com seu consultor para reativar o acesso.
        </p>

        <div className="flex flex-col gap-2">
          <Button asChild size="lg">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar no WhatsApp
            </a>
          </Button>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
