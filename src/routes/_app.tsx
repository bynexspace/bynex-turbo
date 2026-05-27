import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AccountSuspended } from "@/components/AccountSuspended";
import { OrganicProvider } from "@/lib/organic-context";
import { DailyCheckinGate } from "@/components/DailyCheckinGate";

export const Route = createFileRoute("/_app")({
  component: AppGate,
});

function AppGate() {
  const { user, loading, workspace, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
  if (workspace?.status === "suspenso" && !isAdmin) {
    return <AccountSuspended />;
  }
  return (
    <OrganicProvider>
      <DailyCheckinGate>
        <Outlet />
      </DailyCheckinGate>
    </OrganicProvider>
  );
}
