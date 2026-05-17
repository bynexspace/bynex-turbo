
# Email Marketing no BYNEX — Plano

## ⚠️ Decisão importante de provedor

Você escolheu **Lovable Emails**, mas preciso te avisar antes de implementar: a infra de email da Lovable é **estritamente transacional** (confirmação de cadastro, recuperação de senha, recibo). Ela **bloqueia** explicitamente:
- Newsletters
- Campanhas em massa
- **Sequências drip/nurture** (exatamente o que você pediu)
- Promoções

Misturar marketing com transacional no mesmo provedor **destrói a reputação do domínio** — emails de recuperação de senha começam a cair em spam.

**Minha recomendação:** usar **Brevo** (ex-Sendinblue) como provedor de marketing. Motivos:
- Plano gratuito generoso (300 emails/dia) e planos pagos baratos
- Suporta verificação de **domínio próprio por remetente** (cada cliente seu valida o `empresa.com` dele uma vez)
- API simples + já existe conector Lovable pronto (`brevo`)
- Trata bounces, descadastros, complaints automaticamente
- Permite tracking de aberturas/cliques nativo

Alternativas se preferir: Resend (melhor DX, mais caro em volume), Mailgun (mais barato, UX pior).

**O resto deste plano assume Brevo.** Se você quiser outro, me avise e ajusto.

---

## Arquitetura

```text
┌──────────────────────────────────────────────────────────┐
│  UI (rota /campanhas — Premium only via plan-gate)       │
│  ├─ Listas de contatos (segmentos sobre tabela leads)    │
│  ├─ Templates (editor HTML simples + variáveis {{nome}}) │
│  ├─ Campanhas (única ou agendada)                        │
│  ├─ Sequências drip (passos com delay, gatilho por event)│
│  ├─ Domínio remetente (verificação SPF/DKIM via Brevo)   │
│  └─ Relatórios (envios, aberturas, cliques, descads.)    │
└──────────────────────────────────────────────────────────┘
              │
              ▼ (server functions)
┌──────────────────────────────────────────────────────────┐
│  src/server/email-marketing.functions.ts                 │
│  - createCampaign / scheduleCampaign / sendNow           │
│  - createSequence / enrollLead / advanceSequenceStep     │
│  - verifySenderDomain / listSenders                      │
│  - getCampaignStats                                      │
└──────────────────────────────────────────────────────────┘
              │
              ▼ (Brevo via gateway Lovable)
┌──────────────────────────────────────────────────────────┐
│  https://connector-gateway.lovable.dev/brevo/...         │
│  - /smtp/email (envio individual)                        │
│  - /senders (verificação domínio por workspace)          │
│  - /contacts (sync de leads → Brevo)                     │
└──────────────────────────────────────────────────────────┘
              │
              ▼ (cron pg_cron a cada 1min)
┌──────────────────────────────────────────────────────────┐
│  /api/public/hooks/process-email-campaigns               │
│  - Processa fila de envios agendados                     │
│  - Avança steps de sequências baseado em delay           │
│  - Dispara webhooks pendentes                            │
└──────────────────────────────────────────────────────────┘
              │
              ▼ (webhook do Brevo)
┌──────────────────────────────────────────────────────────┐
│  /api/public/hooks/brevo-events                          │
│  - Recebe: delivered, opened, clicked, bounced, unsub    │
│  - Verifica assinatura HMAC                              │
│  - Atualiza email_events + suppressed_emails             │
└──────────────────────────────────────────────────────────┘
```

---

## Banco de dados (migrations)

Novas tabelas (todas com RLS por workspace, padrão `is_workspace_member`):

- **`email_senders`** — domínios remetentes por workspace
  - `workspace_id`, `email` (ex: `contato@empresa.com`), `nome_exibicao`, `status` (`pendente`/`verificado`/`falhou`), `dkim_token`, `verified_at`
- **`email_templates`** — templates reutilizáveis
  - `workspace_id`, `nome`, `assunto`, `html`, `variaveis` (jsonb com lista de placeholders)
- **`email_lists`** — listas/segmentos de contatos
  - `workspace_id`, `nome`, `tipo` (`manual`/`smart`), `filtros` (jsonb, ex: `{status: 'qualificado', cidade: 'SP'}`)
- **`email_list_members`** — membros de listas manuais
  - `list_id`, `lead_id`
- **`email_campaigns`** — campanhas únicas (one-shot)
  - `workspace_id`, `nome`, `template_id`, `list_id`, `sender_id`, `status` (`rascunho`/`agendada`/`enviando`/`enviada`/`pausada`), `agendada_para`, `stats` (jsonb)
- **`email_sequences`** — sequências drip
  - `workspace_id`, `nome`, `sender_id`, `gatilho_tipo` (`manual`/`novo_lead`/`mudou_status`/`tag_aplicada`), `gatilho_config` (jsonb), `ativa`
- **`email_sequence_steps`** — passos de uma sequência
  - `sequence_id`, `ordem`, `template_id`, `delay_dias`, `delay_horas`, `condicao` (jsonb opcional, ex: "só se não respondeu")
- **`email_sequence_enrollments`** — leads inscritos em sequências
  - `sequence_id`, `lead_id`, `current_step`, `next_send_at`, `status` (`ativo`/`pausado`/`completo`/`unsubscribed`)
- **`email_sends`** — log de cada envio individual (1 linha por email)
  - `workspace_id`, `campaign_id` ou `enrollment_id`, `lead_id`, `recipient_email`, `brevo_message_id`, `status`, `sent_at`
- **`email_events`** — eventos vindos do webhook do Brevo
  - `send_id`, `tipo` (`delivered`/`opened`/`clicked`/`bounced`/`complained`/`unsubscribed`), `metadata`, `created_at`
- **`email_suppressions`** — addresses bloqueados (por workspace)
  - `workspace_id`, `email`, `motivo` (`bounce`/`complaint`/`unsubscribe`/`manual`), `created_at`

Índices em `(workspace_id, status)`, `(next_send_at) WHERE status='ativo'`, `(brevo_message_id)`.

---

## Server functions principais

`src/server/email-marketing.functions.ts`:

- **Domínio remetente**
  - `addSenderDomain({workspaceId, email})` → cria sender no Brevo, retorna registros DNS (SPF, DKIM) para o cliente publicar
  - `checkSenderStatus({senderId})` → consulta Brevo se já verificou
- **Templates**
  - `saveTemplate`, `listTemplates`, `deleteTemplate`, `previewTemplate({templateId, leadId})`
- **Listas**
  - `createList`, `addLeadsToList`, `removeLeadFromList`, `previewSmartList({filtros})`
- **Campanhas one-shot**
  - `createCampaign`, `scheduleCampaign({campaignId, sendAt})`, `sendCampaignNow({campaignId})`, `pauseCampaign`, `getCampaignStats`
- **Sequências drip**
  - `createSequence`, `addStep`, `enrollLead({sequenceId, leadId})`, `unenrollLead`, `getSequenceStats`
  - Auto-enrollment via trigger Postgres em `leads` (quando `status` muda ou novo lead é criado) → enfileira em `email_sequence_enrollments`

Todas validam plano `premium` antes de executar (`assertWorkspacePlan(workspaceId, 'premium')`).

## Server routes (públicas)

- **`/api/public/hooks/process-email-campaigns`** — cron a cada 1 min
  - Busca campanhas com `agendada_para <= now()` e status `agendada` → marca `enviando`
  - Busca enrollments com `next_send_at <= now()` e `status='ativo'` → avança step
  - Para cada envio: renderiza template com variáveis do lead, checa suppression, chama Brevo via gateway, grava em `email_sends`
  - Rate-limit interno (100 envios por execução) para respeitar limites do Brevo
- **`/api/public/hooks/brevo-events`** — webhook do Brevo
  - Verifica HMAC com `BREVO_WEBHOOK_SECRET`
  - Atualiza `email_events` e `email_suppressions`

## UI nova

Rotas sob `_app` (gated por `premium`):

- **`/campanhas`** — listagem + criação de campanhas one-shot
  - Editor: nome → selecionar template → selecionar lista → selecionar remetente → enviar agora ou agendar
  - Card de estatísticas (enviados, abertura %, clique %, bounce %, descadastros)
- **`/campanhas/sequencias`** — drip flows
  - Construtor visual estilo o `/flows` já existente: passos em sequência com delay configurável
  - Configurar gatilho (manual, novo lead, mudou status do CRM, tag)
  - Lista de leads inscritos com botão de remover
- **`/campanhas/templates`** — biblioteca de templates
  - Editor HTML simples (Monaco ou Textarea grande) + preview lado-a-lado
  - Suporta variáveis: `{{nome}}`, `{{empresa}}`, `{{email}}`, etc.
- **`/campanhas/listas`** — segmentos
  - Listas manuais (escolhe leads) ou smart (filtros sobre `leads`)
- **`/campanhas/dominio`** — configurar remetente próprio
  - Input do email, exibe registros DNS para copiar, botão "Verificar agora"
  - Estado pendente/verificado/falhou
- Adicionar item **"Email Marketing"** no `AppSidebar.tsx` apontando para `/campanhas` (com `Mail` icon), gated em `premium`
- Adicionar `"email-marketing": "premium"` em `FEATURE_REQUIREMENTS` (`src/lib/plan-gate.ts`)

## Integração Brevo

- Conectar via `standard_connectors--connect` com `connector_id: "brevo"` (uma vez por workspace dev)
- Todas as chamadas via gateway: `https://connector-gateway.lovable.dev/brevo/*`
- Headers: `Authorization: Bearer ${LOVABLE_API_KEY}`, `X-Connection-Api-Key: ${BREVO_API_KEY}`
- Webhook do Brevo configurado uma vez para `https://project--67e78f47-3fa2-489c-b74a-a08a373f17b0.lovable.app/api/public/hooks/brevo-events`
- Segredo do webhook armazenado em `BREVO_WEBHOOK_SECRET` (peço via `add_secret` durante implementação)

## Conformidade

- Footer de descadastro **automático** em todo email enviado (link único por destinatário, página `/unsubscribe` pública)
- Bloqueio automático de envio para addresses em `email_suppressions`
- Identidade física do remetente exigida no rodapé (CAN-SPAM/LGPD) — coletada no cadastro do sender domain

---

## O que vou implementar (ordem)

1. Migration completa com todas as tabelas + RLS + triggers de auto-enrollment
2. Server functions de email-marketing (templates, listas, campanhas, sequências, senders)
3. Server routes públicas (cron processor + webhook Brevo)
4. Conectar Brevo (peço aprovação do connector)
5. Cron job no `pg_cron` apontando para `/api/public/hooks/process-email-campaigns` a cada minuto
6. UI completa em `/campanhas/*` com design consistente ao resto do app
7. Item no sidebar + plan-gate `premium`
8. Página pública `/unsubscribe`
9. Solicitar `BREVO_WEBHOOK_SECRET` via `add_secret`

## O que NÃO vou fazer

- Não vou usar Lovable Emails (incompatível com marketing/drip)
- Não vou fazer editor visual drag-and-drop de emails nesta primeira versão (HTML + variáveis basta)
- Não vou implementar A/B test nesta primeira versão (fica para iteração futura — me avise se for crítico agora)
- Não vou fazer warm-up automático de domínio (cliente faz manualmente)

---

**Posso prosseguir com este plano usando Brevo?** Se preferir outro provedor (Resend / Mailgun / SendGrid) ou quiser que eu inclua A/B test desde já, me avise antes de aprovar.
