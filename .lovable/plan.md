# Bloco de Monetização — Turbo Prospecção

Implementação em uma leva: pagamentos reais via Stripe nativo do Lovable, painel admin com ativação manual, e bloqueio de features por plano com modal de upgrade.

## 1. Pagamentos (Stripe nativo)

- Habilitar Stripe nativo do Lovable (cria ambiente de teste automaticamente, sem você precisar de conta Stripe).
- Criar 3 produtos recorrentes mensais: **Essencial R$ 1.500**, **Pro R$ 2.500**, **Premium R$ 4.500**.
- Server function `createCheckout` que gera sessão Stripe Checkout e retorna URL pra redirect.
- Server route `/api/public/stripe-webhook` (verifica assinatura) que escuta `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` e atualiza `workspaces.plano` + `workspaces.stripe_customer_id`.
- Server function `createPortalSession` pro cliente cancelar/trocar plano (Stripe Billing Portal).
- Atualizar tela `/plano`: botão "Assinar" chama `createCheckout`; se já assinante, mostra "Gerenciar assinatura" que chama `createPortalSession`.

## 2. Admin (ativação manual)

- Migration: nova tabela `app_admins (user_id uuid PK, created_at)` + função `is_app_admin(_user_id)` (SECURITY DEFINER) + RLS.
- Após você criar sua conta no `/login`, rodo seed que insere seu `user_id` em `app_admins` (o e-mail da sua conta Lovable que você confirmou).
- Reescrever `/admin`:
  - Lista todos os workspaces (server function com `supabaseAdmin`, gated por `is_app_admin`).
  - Mostra: nome, plano atual, dono, leads count, MRR estimado, data de criação.
  - Ações por workspace: **mudar plano manualmente** (essencial/pro/premium), **resetar plano**.
  - KPIs globais no topo: total workspaces, MRR, total leads, total usuários.
- Sidebar: item "Admin" só aparece se `is_app_admin = true`.

## 3. Bloqueio por plano + modal de upgrade

- Helper `usePlanGate()` em `src/lib/plan-gate.ts` com matriz:
  - **essencial**: CRM, Leads, Google Maps, CNAE, Tarefas, Flows, Integrações, Plano
  - **pro**: + Assistente IA, Inteligência Comercial
  - **premium**: + LinkedIn, Educação avançada
- Componente `<UpgradeModal feature plan />` (shadcn Dialog) com CTA "Ver planos" → `/plano`.
- Aplicar gate em:
  - Sidebar: itens fora do plano ficam com cadeado e abrem modal ao clicar (não navegam).
  - Rotas das telas pro/premium: `beforeLoad` redireciona pra `/plano?upgrade=pro` se sem permissão.
  - Botão "Agente SDR" no LeadDrawer (é IA, requer pro).

## 4. Polimentos do bloco

- Toast pós-checkout: query param `?success=true` em `/plano` mostra "Plano ativado!".
- Toast `?canceled=true` mostra "Checkout cancelado".
- Loading spinner no botão de checkout.
- Atualizar `auth-context` pra recarregar workspace após retorno do Stripe.

## Detalhes técnicos

```text
Arquivos novos
├── src/server/stripe.functions.ts          # createCheckout, createPortalSession
├── src/server/admin.functions.ts           # listWorkspaces, updateWorkspacePlan, getGlobalKpis
├── src/routes/api/public/stripe-webhook.ts # webhook handler
├── src/lib/plan-gate.ts                    # usePlanGate hook + matriz
├── src/components/UpgradeModal.tsx
└── supabase/migrations/xxx_admin_table.sql # app_admins + is_app_admin()

Arquivos editados
├── src/routes/_app.plano.tsx               # botões reais de checkout + portal
├── src/routes/_app.admin.tsx               # painel completo
├── src/components/AppSidebar.tsx           # gate visual + flag admin
├── src/routes/_app.ia.tsx                  # gate pro
├── src/routes/_app.inteligencia.tsx        # gate pro
├── src/routes/_app.linkedin.tsx            # gate premium
└── src/lib/auth-context.tsx                # expor isAdmin + refresh pós-checkout
```

**Fluxo Stripe**:
1. User clica "Assinar" → `createCheckout({ plan })` → retorna URL → `window.location = url`.
2. Stripe processa → redireciona pra `/plano?success=true&session_id=...`.
3. Em paralelo, webhook recebe `checkout.session.completed` → atualiza `workspaces.plano` e `stripe_customer_id`.
4. Frontend chama `refreshWorkspace()` ao detectar `?success=true`.

**Segurança**:
- Webhook valida assinatura `stripe-signature` antes de qualquer escrita.
- `admin.functions.ts` checa `is_app_admin(userId)` dentro de cada handler antes de usar `supabaseAdmin`.
- RLS de `app_admins`: só admins podem ler a tabela.

## Pré-requisitos

1. **Você precisa criar sua conta em `/login` antes** (com o e-mail da sua conta Lovable) pra eu poder fazer o seed do admin.
2. Vou habilitar Stripe nativo (popup pedindo seu e-mail/nome aparece automaticamente).

## Fora do escopo deste bloco (próximas levas)

- Convite de membros (Resend) · Reset de senha · CNAE real · Cadências executáveis (pg_cron) · LinkedIn · Educação · Skeletons.

---

**Aprovar pra eu começar?** Confirme que já criou a conta em `/login` (ou crie agora antes de aprovar).