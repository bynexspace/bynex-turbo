import { useAuth } from "@/lib/auth-context";

export type Plan = "essencial" | "pro" | "premium";

// Plano mínimo necessário para cada feature
export const FEATURE_REQUIREMENTS: Record<string, Plan> = {
  dashboard: "essencial",
  "google-maps": "essencial",
  cnae: "essencial",
  crm: "essencial",
  tarefas: "essencial",
  leads: "essencial",
  flows: "essencial",
  integracoes: "essencial",
  plano: "essencial",
  educacao: "essencial",
  ia: "pro",
  inteligencia: "pro",
  "agente-sdr": "pro",
  linkedin: "premium",
  "email-marketing": "premium",
};

const RANK: Record<Plan, number> = { essencial: 0, pro: 1, premium: 2 };

export function planAllows(current: Plan | undefined, required: Plan): boolean {
  if (!current) return false;
  return RANK[current] >= RANK[required];
}

export function usePlanGate() {
  const { workspace } = useAuth();
  const plano = workspace?.plano;

  return {
    plano,
    allows: (feature: string) => {
      const req = FEATURE_REQUIREMENTS[feature];
      if (!req) return true;
      return planAllows(plano, req);
    },
    requiredFor: (feature: string) => FEATURE_REQUIREMENTS[feature],
  };
}
