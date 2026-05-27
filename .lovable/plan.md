## Visão geral

Implementar o **Modo Organic** — um toggle master que desbloqueia um conjunto de features baseadas na metodologia de vendas Organic (Vitor/Nick Moretti), sem quebrar o fluxo B2B genérico atual do BYNEX. Tudo persistido em banco, ativável/desativável a qualquer momento.

Vou entregar em **5 fases incrementais**, cada uma testável de forma isolada. Sugiro aprovar a fase 1 (fundação) primeiro e depois seguir — mas posso fazer tudo de uma vez se preferir.

---

## Fase 1 — Fundação (Toggle Master)

**Banco:**
- Nova tabela `user_preferences` (`user_id PK`, `organic_mode_enabled bool`, timestamps) com RLS por `auth.uid()`.

**Frontend:**
- Hook `useOrganicMode()` que lê/grava a preferência e expõe `{ enabled, toggle, loading }`.
- Toggle em **Settings** (criar aba/seção em `/plano` ou nova rota `/configuracoes`).
- Atalho no **AppSidebar** próximo ao avatar: ícone 🌱 (Leaf) + badge "Modo Organic Ativo" com gradiente roxo→verde quando ligado.
- Modal de boas-vindas na primeira ativação (flag local + checagem se nunca ativou): lista as 4 features que serão desbloqueadas.
- Os itens de menu das fases 2-5 ficam ocultos quando o toggle está off.

---

## Fase 2 — Módulo de Referidos (Passos 6 e 7)

**Banco:**
- Tabela `referrals` com enum `referral_status` (`pending_validation`, `validated`, `approached`, `in_conversation`, `converted`, `lost`) e FK `referrer_lead_id → leads.id`. RLS via workspace.

**Frontend:**
- Nova rota `/_app.referidos.tsx` (visível só com Modo Organic).
- Header com métrica "X ativos | Y convertidos".
- Botão "+ Pedir Referidos" → modal lista leads `status=convertido` → seleciona um → coleta lista de (nome, telefone) → grava como `pending_validation`.
- Tabela de referidos com filtro por status.
- Ação "Gerar Mensagem de Validação" copia texto padrão pro clipboard.
- Ação "Confirmar validação" → `validated`.
- Card no Dashboard: "Conversão de Referidos 1:X" vs "Cold 1:Y" (calculado dos `leads` + `referrals`).

---

## Fase 3 — As 3 Listas de Prospecção

**Banco:**
- Migration: adiciona coluna `list_type` em `leads` (enum: `cold` default, `list_1_social`, `list_2_referrer`, `list_3_past_client`).

**Frontend:**
- Nova rota `/_app.listas.tsx` com 3 abas (Lista 1, Lista 2, Lista 3).
- Cada aba: campo de adição rápida (cria lead com `list_type` correto + `origem=manual`), lista com contagem.
- Lista 2: barra de progresso vs meta 20, alerta visual se < 20.
- Lista 3: query automática `status=convertido`.
- Botão "Abordar" cria task no CRM.
- Card no Dashboard "Saúde das Listas".

---

## Fase 4 — Tracker dos 7 Passos no CRM

**Sem mudança de schema** — reutiliza `leads.status` mapeando para colunas Organic:
- Passo 1 ← `novo`
- Passo 2 ← `contactado`
- Passo 3 (DI) ← novo status conceitual em `metadata.organic_step` (`di_travada`)
- Passo 4-5 ← `negociando`
- Convertido ← `convertido`
- Referidos Pendentes ← `convertido` + sem referidos
- Perdido ← `perdido`

**Frontend:**
- Em `_app.crm.tsx`, quando Modo Organic ON, renderizar 7 colunas com labels Organic; drag-and-drop atualiza `status` (+ `metadata.organic_step` quando aplicável).
- No `LeadDrawer`, nova aba "Checklist Organic" que mostra checklist contextual conforme o passo atual; estado salvo em `leads.metadata.organic_checklist`.
- Alertas inteligentes (componente na lista de leads):
  - Lead em Passo 2 há > 5 dias → "pode estar em volta-e-aviso".
  - Convertido há > 24h sem referido → "hora de pedir referidos".

---

## Fase 5 — Compromisso Diário + Tanque Emocional

**Banco:**
- Tabela `daily_checkins` (`user_id`, `date` UNIQUE, `emotional_tank_level` 1-5, `target_approaches`, `actual_approaches`, `completed`). RLS por `auth.uid()`.

**Frontend:**
- Componente `DailyCheckinGate` no `_app.tsx`: se Modo Organic ON e sem check-in hoje, mostra modal full-screen com 3 perguntas antes de qualquer tela.
- Widget "Meta do Dia" no Dashboard: progresso `actual/target` (actual incrementa quando lead muda para `contactado`).
- Card "Streak de Execução" — calcula dias consecutivos com `completed=true`.
- Banner rotativo de frase do dia (8 frases, rotaciona por `dayOfYear % 8`).

---

## Diretrizes técnicas

- Tudo respeitando o stack: TanStack Start, Supabase via `@/integrations/supabase/client`, RLS por workspace/user, sem edge functions novas.
- Cores: usar tokens de `src/styles.css` (sem hex hardcoded); para o "verde Organic" adiciono token novo `--organic` (oklch verde-fluor sutil).
- Lucide icons, componentes shadcn existentes, sem novas libs.
- Nenhuma rota/lógica atual é removida — só condicionalmente alternada.

---

## Pergunta antes de começar

Quer que eu **execute as 5 fases de uma vez** (entrega grande, ~10 arquivos novos + migrations) ou prefere **aprovar fase por fase** (mais seguro pra revisar)?
