## Sprint de Lançamento — Bynex Turbo

Objetivo: permitir que você venda pessoalmente, **crie clientes em 1 clique no /admin**, e tenha controle de **ativar / suspender** acesso. Sem Stripe, sem landing (já existe).

---

### 1. Kill switch de acesso (`workspaces.status`)

**DB (migration):**
- Adicionar enum `workspace_status` com `ativo`, `suspenso`.
- Adicionar coluna `workspaces.status workspace_status NOT NULL DEFAULT 'ativo'`.
- Workspaces existentes ficam `ativo` automaticamente.

**App:**
- `auth-context.tsx`: incluir `status` no tipo `WorkspaceCtx` e no select de `loadWorkspace`.
- `_app.tsx` (layout autenticado): se `workspace.status === 'suspenso'`, renderizar tela **AccountSuspended** em vez do `<Outlet />`.
- Nova página `AccountSuspended`: mensagem "Sua conta está aguardando ativação" + botão WhatsApp + botão Sair. Sem sidebar.

---

### 2. Criar cliente em 1 clique no /admin

**Server function nova** em `src/server/admin.functions.ts`:
- `createClient({ userId, email, fullName, workspaceName, plano })`
  - Valida admin via `assertAdmin`.
  - Usa `supabaseAdmin.auth.admin.createUser` com senha aleatória (12 chars) e `email_confirm: true`.
  - Insere `workspaces` (nome, plano, status=ativo).
  - Insere `workspace_members` (user_id, workspace_id, role=owner).
  - Insere `profiles` (id, email, full_name) — caso o trigger de profile não exista, garante manualmente.
  - Retorna `{ email, senhaProvisoria, workspaceId }` pra você copiar e mandar pro cliente.

**UI no `/admin`:**
- Botão "**+ Novo cliente**" no topo da tabela, abre Dialog com: Nome do cliente, E-mail, Nome do workspace, Plano.
- Após criar, exibe modal com **e-mail + senha provisória + botão copiar** ("Envie esses dados pro cliente").

---

### 3. Toggle ativar/suspender no /admin

- Coluna nova "Status" na tabela com Badge (`ativo` verde / `suspenso` vermelho).
- Server function `updateWorkspaceStatus({ userId, workspaceId, status })`.
- Switch ou botão "Suspender" / "Ativar" ao lado do select de plano.
- Toast de confirmação.

---

### 4. Coluna "Último acesso" no /admin

- Em `listAllWorkspaces`, buscar `last_sign_in_at` via `supabaseAdmin.auth.admin.listUsers()` e mapear pelo owner.
- Mostrar coluna "Último login" formatada (`há X dias` via `date-fns`).
- Útil pra você saber quem está usando antes de renovar.

---

### 5. Branding mínimo

- Trocar `<title>` e meta tags em `__root.tsx` (já feito — confirmar).
- Atualizar favicon (`public/favicon.ico`) — usar placeholder com "B" se não tiver SVG ainda.
- Logo da sidebar: manter o ícone Zap por enquanto (você pode trocar depois enviando SVG).

---

## Detalhes técnicos

**Migration SQL (resumo):**
```sql
create type workspace_status as enum ('ativo', 'suspenso');
alter table workspaces add column status workspace_status not null default 'ativo';
```

**Tipo atualizado em `WorkspaceCtx`:**
```ts
status: 'ativo' | 'suspenso';
```

**Guard em `_app.tsx`:**
```tsx
if (workspace?.status === 'suspenso') return <AccountSuspended />;
```

**Senha provisória:** gerada via `crypto.randomUUID().slice(0, 12)` — exibida UMA vez no modal e nunca persistida em texto.

**Profile auto-create:** se ainda não existir trigger `on_auth_user_created` que popula `profiles`, o `createClient` insere manualmente após `auth.admin.createUser`.

---

## Fora de escopo (fica pra depois)
- Stripe / cobrança automática
- Landing page (já existe)
- Convite de membros pelo cliente
- Quotas por plano
- E-mails transacionais com marca
- LGPD (exportar/excluir conta)

---

## Resultado
Após essa sprint você consegue:
1. Fechar venda no WhatsApp/pessoalmente.
2. Ir no `/admin` → "+ Novo cliente" → preencher 4 campos → copiar login + senha → mandar pro cliente.
3. Quando o cliente parar de pagar → toggle "Suspender" → ele cai na tela de "aguardando ativação".
4. Acompanhar quem está logando e quanto MRR você tem.

Pronto pra vender.