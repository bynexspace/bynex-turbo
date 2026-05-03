import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, MapPin, Search, Linkedin, Kanban, CheckSquare, Users,
  GitBranch, Bot, Brain, GraduationCap, Plug, CreditCard, Shield, LogOut, Zap, Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePlanGate, type Plan } from "@/lib/plan-gate";
import { UpgradeModal } from "@/components/UpgradeModal";
import { cn } from "@/lib/utils";

const items: { to: string; icon: any; label: string; feature: string }[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", feature: "dashboard" },
  { to: "/google-maps", icon: MapPin, label: "Google Maps", feature: "google-maps" },
  { to: "/cnae", icon: Search, label: "Busca CNAE", feature: "cnae" },
  { to: "/linkedin", icon: Linkedin, label: "LinkedIn", feature: "linkedin" },
  { to: "/crm", icon: Kanban, label: "CRM", feature: "crm" },
  { to: "/tarefas", icon: CheckSquare, label: "Tarefas", feature: "tarefas" },
  { to: "/leads", icon: Users, label: "Todos os Leads", feature: "leads" },
  { to: "/flows", icon: GitBranch, label: "Flows", feature: "flows" },
  { to: "/ia", icon: Bot, label: "Assistente IA", feature: "ia" },
  { to: "/inteligencia", icon: Brain, label: "Inteligência Comercial", feature: "inteligencia" },
  { to: "/educacao", icon: GraduationCap, label: "Educação", feature: "educacao" },
  { to: "/integracoes", icon: Plug, label: "Integrações", feature: "integracoes" },
  { to: "/plano", icon: CreditCard, label: "Plano", feature: "plano" },
];

export function AppSidebar() {
  const { workspace, user, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { allows, requiredFor } = usePlanGate();
  const [gate, setGate] = useState<{ feature: string; plan: Plan } | null>(null);

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground sticky top-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
          <Zap className="h-5 w-5 text-white" fill="white" />
        </div>
        <div>
          <div className="text-lg font-bold text-white leading-tight">Turbo</div>
          <div className="text-[11px] text-sidebar-foreground/60 -mt-0.5">partners</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {items.map((it) => {
          const active = path === it.to;
          const ok = allows(it.feature);
          const cls = cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full",
            active
              ? "bg-sidebar-active text-sidebar-active-foreground font-medium"
              : "hover:bg-sidebar-hover text-sidebar-foreground/85",
            !ok && "opacity-60",
          );
          if (!ok) {
            return (
              <button
                key={it.to}
                className={cls}
                onClick={() => setGate({ feature: it.label, plan: requiredFor(it.feature) ?? "pro" })}
              >
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
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors mt-2 border-t border-white/5 pt-3",
              path === "/admin"
                ? "bg-sidebar-active text-sidebar-active-foreground font-medium"
                : "hover:bg-sidebar-hover text-sidebar-foreground/85"
            )}
          >
            <Shield className="h-4 w-4 shrink-0" /> Admin
          </Link>
        )}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="px-2 py-2 text-xs text-sidebar-foreground/60 truncate">
          {workspace?.nome ?? "—"}
        </div>
        <div className="px-2 text-xs text-sidebar-foreground/50 truncate mb-2">
          {user?.email}
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-hover transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      {gate && (
        <UpgradeModal
          open={!!gate}
          onOpenChange={(v) => !v && setGate(null)}
          feature={gate.feature}
          requiredPlan={gate.plan}
        />
      )}
    </aside>
  );
}
