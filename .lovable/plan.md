## Objetivo
Deixar as respostas do agente de IA (Assistente IA e Agente SDR no drawer do lead) mais **objetivas, curtas e bem formatadas** em vez de textão cru.

## Mudanças

### 1. `src/routes/api.ai-chat.ts` — prompt-base no servidor
Acoplar um "estilo de resposta" obrigatório que é prefixado em **todo** `system` enviado pelo cliente:

- Sempre responder em português, em **no máximo ~150 palavras**.
- Estrutura padrão em **Markdown**:
  - Título curto em negrito (1 linha).
  - Bullets ou passos numerados quando fizer sentido.
  - Scripts de mensagem dentro de bloco de citação (`>`), prontos para copiar.
- Proibido: introduções ("Claro!", "Com certeza..."), repetir a pergunta, encerramentos genéricos, emojis em excesso (máx. 1–2 quando agregar).
- Tom: direto, consultivo, acionável. Nunca explicar o óbvio.
- Trocar o modelo padrão de `google/gemini-2.5-flash` para `google/gemini-3-flash-preview` (mais recente e melhor seguimento de instruções).

### 2. `src/routes/_app.ia.tsx` — Assistente IA principal
- Encurtar e endurecer o `system` enviado: foco em vendas B2B local + regra "responda sempre em estrutura: título + bullets + script em bloco quando houver".
- Melhorar a renderização Markdown: tipografia `prose` com espaçamento reduzido, `whitespace-pre-wrap` para preservar quebras, estilos para `ul`, `ol`, `blockquote`, `strong`, `code`.
- Aumentar a largura máxima do balão do assistente (`max-w-3xl`) para caber listas sem quebrar feio.

### 3. `src/components/LeadDrawer.tsx` — Agente SDR do lead
- Trocar o render cru (`{m.content}`) por `ReactMarkdown` no balão do assistente, com a mesma classe `prose prose-sm`.
- Atualizar o `system` com o contexto do lead + a mesma regra de formatação (título + bullets + bloco de citação para scripts).
- Ajustar os atalhos "Script WhatsApp" / "Script Ligação" para já pedirem o formato pronto (ex.: "Gere um script de WhatsApp em 4 mensagens curtas, uma por linha, em bloco de citação").

### 4. `api.ai-intel.ts`
Sem mudança: já retorna JSON estruturado para a tela de Inteligência Comercial, não é texto livre.

## Resultado esperado
Respostas curtas, escaneáveis, com títulos, bullets e scripts já formatados em bloco — mesmo padrão visual nos dois lugares onde o agente aparece (página IA e drawer do lead).
