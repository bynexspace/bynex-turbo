import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

function AdminPage() {
  const { workspace } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState("");

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from("workspace_members").select("id, role, user_id, profiles!inner(email, full_name)").eq("workspace_id", workspace.id);
    setMembers(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  if (workspace && workspace.role !== "owner") return <Navigate to="/dashboard" />;

  const convidar = async () => {
    if (!email) return;
    toast.info("Convites por e-mail serão enviados via servidor (em breve)");
    setEmail("");
  };

  const remover = async (id: string) => {
    if (!confirm("Remover membro?")) return;
    await supabase.from("workspace_members").delete().eq("id", id); load();
  };

  return (
    <AppLayout title="Admin" subtitle="Gerencie membros do workspace">
      <Card className="p-4 mb-4">
        <div className="flex gap-2">
          <Input placeholder="email@empresa.com" value={email} onChange={e=>setEmail(e.target.value)} />
          <Button onClick={convidar}><UserPlus className="h-4 w-4 mr-1" />Convidar</Button>
        </div>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">E-mail</th><th className="text-left p-3">Papel</th><th></th></tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t border-border">
                <td className="p-3">{m.profiles?.full_name}</td>
                <td className="p-3">{m.profiles?.email}</td>
                <td className="p-3"><Badge variant={m.role === "owner" ? "default" : "outline"}>{m.role}</Badge></td>
                <td className="p-3 text-right">
                  {m.role !== "owner" && <Button size="icon" variant="ghost" onClick={() => remover(m.id)}><Trash2 className="h-4 w-4" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppLayout>
  );
}
