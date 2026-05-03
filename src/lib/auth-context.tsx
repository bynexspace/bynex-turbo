import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin } from "@/server/admin.functions";

interface WorkspaceCtx {
  id: string;
  nome: string;
  plano: "essencial" | "pro" | "premium";
  role: "owner" | "member";
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  workspace: WorkspaceCtx | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceCtx | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadWorkspace = async (userId: string) => {
    const { data } = await supabase
      .from("workspace_members")
      .select("role, workspaces!inner(id, nome, plano)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (data) {
      // @ts-ignore - relação join
      const w = data.workspaces;
      setWorkspace({ id: w.id, nome: w.nome, plano: w.plano, role: data.role });
    } else {
      setWorkspace(null);
    }
  };

  const loadAdmin = async () => {
    try {
      const r = await checkAdmin();
      setIsAdmin(r.isAdmin);
    } catch {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          loadWorkspace(sess.user.id);
          loadAdmin();
        }, 0);
      } else {
        setWorkspace(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([loadWorkspace(session.user.id), loadAdmin()]).finally(() => setLoading(false));
      } else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshWorkspace = async () => { if (user) await loadWorkspace(user.id); };

  return (
    <Ctx.Provider value={{ user, session, workspace, isAdmin, loading, signOut, refreshWorkspace }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
