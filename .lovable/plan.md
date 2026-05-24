## Problema

A API CNPJá `/office` retornou **400 Bad Request** com os parâmetros enviados:
- `activity.main.id: 4711301,4711302`
- `limit: 20`

O nome do parâmetro está incorreto. O endpoint `/office` da CNPJá usa **`activity.id`** (não `activity.main.id`), e os demais filtros também seguem nomes diferentes do que está no código atual.

## Correções em `src/routes/api.cnpja-search.ts`

Ajustar o mapeamento de parâmetros para o formato aceito pela CNPJá:

| Atual (errado) | Correto |
|---|---|
| `activity.main.id` | `activity.id` |
| `address.state` | `address.state` ✓ |
| `address.city` | `address.city.name` |
| `company.equity.gte` | `company.equity.gte` ✓ |
| `company.equity.lte` | `company.equity.lte` ✓ |
| `head=true` | `company.nature.id` não aplica — usar `head=true` ✓ |
| `emails.gte=1` | `emails.gte=1` ✓ |
| `phones.gte=1` | `phones.gte=1` ✓ |

Mudança principal: trocar `activity.main.id` → `activity.id`.

Também ajustar paginação: a CNPJá usa `limit` e `token` (cursor), o que já está OK.

## Robustez

- Retornar a mensagem de erro completa da CNPJá no JSON de resposta (já feito), para facilitar debug futuro.
- Logar `console.error` no servidor com status + body quando a CNPJá retornar não-OK.

## Validação

Após o ajuste, testar pela UI em `/cnae` com os dois CNAEs (4711301, 4711302) e UF SP. Esperado: lista de empresas reais retornadas; toast de sucesso com a contagem.

Nenhuma mudança em schema, UI ou outras rotas.