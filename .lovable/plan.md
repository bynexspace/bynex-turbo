## Renomear marca para "Bynex Turbo"

Trocar todas as ocorrências da marca atual ("Turbo" + "partners" / "Turbo Prospecção") por **Bynex Turbo**. Mantenho textos funcionais ("prospecção" como substantivo) intactos — só altero o nome da marca.

### Alterações

1. **`src/components/AppSidebar.tsx`** (logo do app)
   - "Turbo" → "Bynex"
   - "partners" → "turbo"

2. **`src/routes/login.tsx`** (logo da tela de login)
   - "Turbo" → "Bynex"
   - "partners" → "turbo"

3. **`src/routes/__root.tsx`** (meta tags / `<title>`)
   - "Turbo Prospecção — CRM e geração de leads" → "Bynex Turbo — CRM e geração de leads"

### Fora de escopo (não muda)
- Palavras "prospecção" em subtítulos de páginas (Tarefas, LinkedIn, Flows, Dashboard, Educação) — são descrições funcionais, não a marca.
- Prompt do assistente IA em `_app.ia.tsx`.
