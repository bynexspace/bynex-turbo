## Fluxo de recuperação de senha

Implementar o fluxo padrão "Esqueci minha senha" para que o cliente receba um e-mail com link e defina a própria senha.

### 1. Login: link "Esqueci minha senha"
- Em `src/routes/login.tsx`, adicionar abaixo do campo de senha um link/botão "Esqueci minha senha" que abre um diálogo (ou alterna o formulário) pedindo apenas o e-mail.
- Ao enviar, chamar:
  ```ts
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  ```
- Mostrar toast de sucesso ("Se o e-mail existir, enviamos um link de recuperação") sem revelar se a conta existe.

### 2. Nova rota pública `/reset-password`
- Criar `src/routes/reset-password.tsx` (rota pública, fora do `_app`).
- A página detecta a sessão de recuperação (Supabase processa o token do hash automaticamente via `onAuthStateChange` com evento `PASSWORD_RECOVERY`).
- Formulário com: nova senha + confirmação. Validação mínima (8+ caracteres, iguais).
- Submit chama `supabase.auth.updateUser({ password })` e redireciona para `/dashboard` com toast de sucesso.
- Se acessada sem token válido, mostrar mensagem e botão para voltar ao login.
- Aplicar a mesma identidade visual BYNEX usada no login (logo, fundo escuro).

### 3. Admin: botão "Enviar link de recuperação"
- Em `src/routes/_app.admin.tsx`, na coluna de ações de cada workspace, adicionar um botão secundário "Resetar senha" ao lado de Suspender/Ativar.
- Cria uma nova server function `sendPasswordReset` em `src/server/admin.functions.ts` que:
  - Valida admin (`assertAdmin`).
  - Busca o e-mail do owner do workspace.
  - Usa `supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${origin}/reset-password` } })`.
  - Como alternativa mais simples (e que dispara o e-mail automaticamente), chamar `supabaseAdmin.auth.resetPasswordForEmail` — mas essa não passa pelo admin client; usaremos `generateLink` e deixaremos o Supabase enviar via SMTP padrão chamando `inviteUserByEmail` não cabe aqui. Solução final: usar o client público com a service key apenas para identificar o e-mail e disparar `resetPasswordForEmail` pelo client browser do admin não é seguro. Então: usar `generateLink({type:'recovery'})` que retorna o link e **dispara o e-mail automaticamente** quando configurado no Supabase.
- Toast "E-mail de recuperação enviado para {email}".

### 4. Entrega do e-mail
- O Supabase já envia e-mails de recuperação por padrão usando o SMTP interno (limite baixo, mas funcional para começar com poucos clientes).
- Não vamos configurar domínio próprio agora — fica como evolução futura quando o volume crescer.

### Detalhes técnicos
- Rota `/reset-password` precisa ser pública (não pode estar sob `_app` que exige auth).
- O listener `onAuthStateChange` na página de reset detecta `PASSWORD_RECOVERY` e habilita o formulário.
- Após `updateUser`, a sessão fica ativa e o usuário cai no dashboard normalmente.
- Server function `sendPasswordReset` recebe `{ userId (admin), workspaceId }` e busca o owner internamente.

### Arquivos afetados
- `src/routes/login.tsx` — adicionar UI de "Esqueci minha senha"
- `src/routes/reset-password.tsx` — **novo**
- `src/routes/_app.admin.tsx` — botão "Resetar senha" na tabela
- `src/server/admin.functions.ts` — nova função `sendPasswordReset`
