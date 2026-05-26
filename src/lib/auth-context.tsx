import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin } from "@/server/admin.functions";

interface WorkspaceCtx {
  id: string;
  nome: string;
  plano: "essencial" | "pro" | "premium";
  status: "ativo" | "suspenso";
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
  // Evita recarregar workspace/admin a cada TOKEN_REFRESHED (a cada ~30s)
  const loadedForUserId = useRef<string | null>(null);

  const loadWorkspace = async (userId: string) => {
    const { data } = await supabase
      .from("workspace_members")
      .select("role, workspaces!inner(id, nome, plano, status)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (data) {
      // @ts-ignore - relação join
      const w = data.workspaces;
      setWorkspace({ id: w.id, nome: w.nome, plano: w.plano, status: w.status, role: data.role });
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

  const hydrateUser = async (uid: string) => {
    if (loadedForUserId.current === uid) return; // já carregado para este usuário
    loadedForUserId.current = uid;
    await Promise.all([loadWorkspace(uid), loadAdmin()]);
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;

    // 1) Hidrata a partir da sessão atual (uma vez)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await hydrateUser(session.user.id);
      setLoading(false);
    });

    // 2) Reage apenas a SIGNED_IN / SIGNED_OUT — ignora TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (event === "SIGNED_OUT") {
        loadedForUserId.current = null;
        setWorkspace(null);
        setIsAdmin(false);
        return;
      }
      if (event === "SIGNED_IN" && sess?.user) {
        // executa fora do callback do Supabase para evitar deadlock
        setTimeout(() => { hydrateUser(sess.user.id); }, 0);
      }
    });
    unsub = () => sub.subscription.unsubscribe();

    return () => unsub?.();
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
