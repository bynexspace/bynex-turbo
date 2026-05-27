import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, MapPin, Search, Linkedin, Kanban, CheckSquare, Users,
  Bot, Brain, GraduationCap, Plug, CreditCard, Shield, LogOut, Lock,
  Sprout, UserPlus, ListChecks, Settings,
} from "lucide-react";
import bynexMark from "@/assets/bynex-mark.png";
import { useAuth } from "@/lib/auth-context";
import { usePlanGate, type Plan } from "@/lib/plan-gate";
import { useOrganic } from "@/lib/organic-context";
import { UpgradeModal } from "@/components/UpgradeModal";
import { OrganicWelcomeModal } from "@/components/OrganicWelcomeModal";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const items: { to: string; icon: any; label: string; feature: string }[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", feature: "dashboard" },
  { to: "/google-maps", icon: MapPin, label: "Google Maps", feature: "google-maps" },
  { to: "/cnae", icon: Search, label: "Busca CNAE", feature: "cnae" },
  { to: "/linkedin", icon: Linkedin, label: "LinkedIn", feature: "linkedin" },
  { to: "/crm", icon: Kanban, label: "CRM", feature: "crm" },
  { to: "/tarefas", icon: CheckSquare, label: "Tarefas", feature: "tarefas" },
  { to: "/leads", icon: Users, label: "Todos os Leads", feature: "leads" },
  { to: "/ia", icon: Bot, label: "Assistente IA", feature: "ia" },
  { to: "/inteligencia", icon: Brain, label: "Inteligência Comercial", feature: "inteligencia" },
  { to: "/educacao", icon: GraduationCap, label: "Educação", feature: "educacao" },
  { to: "/integracoes", icon: Plug, label: "Integrações", feature: "integracoes" },
  { to: "/plano", icon: CreditCard, label: "Plano", feature: "plano" },
];

const organicItems = [
  { to: "/referidos", icon: UserPlus, label: "Referidos" },
  { to: "/listas", icon: ListChecks, label: "Minhas 3 Listas" },
];

export function AppSidebar() {
  const { workspace, user, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { allows, requiredFor } = usePlanGate();
  const { enabled: organic, setEnabled: setOrganic, firstSeen, markFirstSeen } = useOrganic();
  const [gate, setGate] = useState<{ feature: string; plan: Plan } | null>(null);
  const [welcome, setWelcome] = useState(false);

  const onToggleOrganic = async (v: boolean) => {
    await setOrganic(v);
    if (v && !firstSeen) setWelcome(true);
  };

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground sticky top-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/5">
        <img src={bynexMark} alt="BYNEX" className="h-10 w-10 rounded-lg object-contain shadow-glow" />
        <div>
          <div className="text-lg font-bold font-display text-grad-brand leading-tight">BYNEX</div>
          <div className="text-[11px] text-sidebar-foreground/60 -mt-0.5 tracking-widest uppercase">turbo</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {items.map((it) => {
          const active = path === it.to;
          const ok = allows(it.feature);
          const cls = cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full",
            active ? "bg-sidebar-active text-sidebar-active-foreground font-medium"
                   : "hover:bg-sidebar-hover text-sidebar-foreground/85",
            !ok && "opacity-60",
          );
          if (!ok) {
            return (
              <button key={it.to} className={cls}
                onClick={() => setGate({ feature: it.label, plan: requiredFor(it.feature) ?? "pro" })}>
                <it.icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1 text-left">{it.label}</span>
                <Lock className="h-3 w-3 shrink-0 opacity-70" />
              </button>
            );
          }
          return (
            <Link key={it.to} to={it.to} className={cls}>
              <it.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}

        {organic && (
          <div className="mt-3 pt-3 border-t border-organic/20 space-y-0.5">
            <div className="px-3 pb-1 text-[10px] uppercase tracking-widest text-organic font-bold">Organic</div>
            {organicItems.map((it) => {
              const active = path === it.to;
              return (
                <Link key={it.to} to={it.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-organic/15 text-organic font-medium"
                           : "hover:bg-sidebar-hover text-sidebar-foreground/85"
                  )}>
                  <it.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{it.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {isAdmin && (
          <Link to="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors mt-2 border-t border-white/5 pt-3",
              path === "/admin" ? "bg-sidebar-active text-sidebar-active-foreground font-medium"
                                : "hover:bg-sidebar-hover text-sidebar-foreground/85"
            )}>
            <Shield className="h-4 w-4 shrink-0" /> Admin
          </Link>
        )}
      </nav>

      <div className="border-t border-white/5 p-3 space-y-2">
        <div className={cn(
          "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm border",
          organic ? "border-organic/40 bg-organic/10" : "border-white/5 bg-white/[0.02]"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <Sprout className={cn("h-4 w-4 shrink-0", organic ? "text-organic" : "text-sidebar-foreground/60")} />
            <span className={cn("truncate text-xs font-medium", organic && "text-organic")}>
              {organic ? "Modo Organic Ativo" : "Modo Organic"}
            </span>
          </div>
          <Switch checked={organic} onCheckedChange={onToggleOrganic} />
        </div>

        <Link to="/configuracoes" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-hover">
          <Settings className="h-3.5 w-3.5" /> Configurações
        </Link>

        <div className="flex justify-center"><ThemeSwitcher /></div>
        <div className="px-2 pt-1 text-xs text-sidebar-foreground/60 truncate">{workspace?.nome ?? "—"}</div>
        <div className="px-2 text-xs text-sidebar-foreground/50 truncate">{user?.email}</div>
        <button onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-hover transition-colors">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      {gate && (
        <UpgradeModal open={!!gate} onOpenChange={(v) => !v && setGate(null)}
          feature={gate.feature} requiredPlan={gate.plan} />
      )}
      <OrganicWelcomeModal open={welcome} onClose={async () => { setWelcome(false); await markFirstSeen(); }} />
    </aside>
  );
}
