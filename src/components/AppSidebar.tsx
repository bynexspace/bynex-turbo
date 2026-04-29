import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, MapPin, Search, Linkedin, Kanban, CheckSquare, Users,
  GitBranch, Bot, Brain, GraduationCap, Plug, CreditCard, Shield, LogOut, Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/google-maps", icon: MapPin, label: "Google Maps" },
  { to: "/cnae", icon: Search, label: "Busca CNAE" },
  { to: "/linkedin", icon: Linkedin, label: "LinkedIn" },
  { to: "/crm", icon: Kanban, label: "CRM" },
  { to: "/tarefas", icon: CheckSquare, label: "Tarefas" },
  { to: "/leads", icon: Users, label: "Todos os Leads" },
  { to: "/flows", icon: GitBranch, label: "Flows" },
  { to: "/ia", icon: Bot, label: "Assistente IA" },
  { to: "/inteligencia", icon: Brain, label: "Inteligência Comercial" },
  { to: "/educacao", icon: GraduationCap, label: "Educação" },
  { to: "/integracoes", icon: Plug, label: "Integrações" },
  { to: "/plano", icon: CreditCard, label: "Plano" },
];

export function AppSidebar() {
  const { workspace, user, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

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
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-active text-sidebar-active-foreground font-medium"
                  : "hover:bg-sidebar-hover text-sidebar-foreground/85"
              )}
            >
              <it.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
        {workspace?.role === "owner" && (
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
    </aside>
  );
}
