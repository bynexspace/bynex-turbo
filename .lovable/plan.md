## Integrar logo oficial da Bynex

Você enviou o logo (hexágono com "B" + wordmark BYNEX, branco em fundo preto). Vou substituir o ícone genérico de raio (Zap) por esse logo em todos os pontos da marca.

---

### O que vai ser feito

1. **Salvar o asset**
   - Copiar `user-uploads://image.png` para `src/assets/bynex-logo.png` (logo completo: símbolo + wordmark).
   - Gerar/cropar uma versão **só do símbolo** (hexágono+B) para usar como ícone compacto na sidebar e favicon: `src/assets/bynex-mark.png`.

2. **Sidebar** (`src/components/AppSidebar.tsx`)
   - Substituir o bloco `<div bg-brand><Zap/></div> + texto "Bynex/turbo"` por `<img src={bynexMark}/>` + label "turbo" pequeno embaixo (mantendo o ar de produto da família Bynex).

3. **Login** (`src/routes/login.tsx`)
   - Mesmo tratamento: trocar o quadrado com Zap pelo logo. Como o fundo do login é escuro (`bg-sidebar`), o logo branco fica perfeito. Pode usar o logo completo (símbolo + wordmark) já que tem mais espaço.

4. **Tela de conta suspensa** (`src/components/AccountSuspended.tsx`)
   - Trocar o bloco do topo pelo logo.

5. **Favicon** (`public/favicon.ico` + meta no `__root.tsx`)
   - Substituir favicon pelo símbolo (versão PNG 32x32 e 192x192). Atualizar `links` no `__root.tsx` para apontar pros ícones.
   - Adicionar `apple-touch-icon` (180x180) usando o símbolo sobre fundo preto.

6. **Open Graph / share image** (`__root.tsx`)
   - Adicionar `og:image` com o logo completo (1200x630, símbolo centralizado em fundo preto) — `public/og-image.png`. Bom pra quando você compartilhar o link no WhatsApp pros leads.

---

### Detalhes técnicos

- Geração das variantes (mark recortado, favicon, apple-touch, og-image) via ImageMagick em `code--exec`, usando o PNG enviado como fonte. Tudo gerado em build/scripts e commitado em `public/` e `src/assets/`.
- Imports do logo em componentes React via `import logo from "@/assets/bynex-logo.png"` (regra do projeto pra src/assets).
- Remover import de `Zap` dos arquivos onde ele só era usado pra logo (manter onde ainda fizer sentido). 
- Manter cor de fundo da marca (`bg-brand`) intacta no resto da UI — só os "selos" de logo trocam.

### Fora de escopo
- Não vou mexer na paleta nem no `bg-brand` (azul atual). Se quiser depois alinhar a paleta ao preto/branco do logo, é outra sprint.
- Não vou criar uma versão SVG vetorial do logo (vou usar o PNG enviado). Se você tiver o SVG, pode mandar depois e eu troco.

### Resultado
Todas as superfícies de marca (sidebar, login, conta suspensa, aba do navegador, preview de link) passam a exibir o logo oficial da Bynex em vez do ícone genérico.
