import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface OrganicCtx {
  enabled: boolean;
  firstSeen: boolean;
  loading: boolean;
  setEnabled: (v: boolean) => Promise<void>;
  markFirstSeen: () => Promise<void>;
}

const Ctx = createContext<OrganicCtx | undefined>(undefined);

export function OrganicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(false);
  const [firstSeen, setFirstSeen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("organic_mode_enabled, organic_first_seen")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setEnabledState(data.organic_mode_enabled);
        setFirstSeen(data.organic_first_seen);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const setEnabled = useCallback(async (v: boolean) => {
    if (!user) return;
    setEnabledState(v);
    await supabase.from("user_preferences").upsert(
      { user_id: user.id, organic_mode_enabled: v },
      { onConflict: "user_id" },
    );
  }, [user]);

  const markFirstSeen = useCallback(async () => {
    if (!user) return;
    setFirstSeen(true);
    await supabase.from("user_preferences").upsert(
      { user_id: user.id, organic_first_seen: true },
      { onConflict: "user_id" },
    );
  }, [user]);

  return (
    <Ctx.Provider value={{ enabled, firstSeen, loading, setEnabled, markFirstSeen }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOrganic() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOrganic must be used within OrganicProvider");
  return c;
}

// 8 frases que rotacionam por dia do ano
export const ORGANIC_QUOTES = [
  "Aprender a vender é fácil. Ser um vendedor é difícil.",
  "Vendedor ruim se convence muito rápido.",
  "Quem não vê como vira dinheiro acha caro.",
  "A maneira como você se sente não é sua culpa, mas é sua responsabilidade.",
  "Crianças precificam pela autoestima, adultos pelo resultado.",
  "Não duvidarás do senhor seu Vitor.",
  "Trocar reclamação por prospecção.",
  "Ser um adulto.",
];

export function quoteOfTheDay() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = (Date.now() - start.getTime()) / 86400000;
  return ORGANIC_QUOTES[Math.floor(diff) % ORGANIC_QUOTES.length];
}
