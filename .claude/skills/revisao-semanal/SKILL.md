---
name: revisao-semanal
description: >
  Ritual curto de fechamento de semana: o que saiu, o que performou, o que travou e o que entra na
  semana seguinte, atualizando `tarefas.md` e `_memoria/estrategia.md`. Use quando o usuário disser
  "revisão da semana", "fechar a semana", "balanço", "como foi a semana", "planejar a próxima
  semana", ou /revisao-semanal.
---

# /revisao-semanal — Fechamento de semana

O ciclo que fecha o loop: produzir sem revisar é o que a tese do Contex OS chama de open loop, decide, executa, não mede, repete cego. Dez minutos aqui alimentam as decisões da semana seguinte.

## Dependências

- **Pipeline:** `tarefas.md`
- **Quem ficou no vácuo:** `pessoas/indice.md`, se existir (`/pessoa`); rodar `node scripts/pessoas.js indice` antes de ler. Promessa vencida é a primeira lista da semana
- **Produção da semana:** `conteudo/indice.md`, `campanhas/relatorios/`, `propostas/`, `vendas/prospeccao/` (contatos e respostas da semana)
- **Decisões com revisão marcada:** `decisoes/*.md` (tabela "Revisão", do `/decidir`)
- **Estratégia:** `_memoria/estrategia.md`
- **Saída:** `revisoes/<YYYY-MM-DD>.md` + atualização de `tarefas.md` e `estrategia.md`

---

## Workflow

### Passo 1 — Levantar o que aconteceu (sem perguntar nada ainda)

Varrer o workspace pelos últimos 7 dias e montar o retrato:
- Conteúdo publicado / produzido (`indice.md`)
- Propostas enviadas e o status delas
- Relatório de ads da semana, se houver
- Itens fechados no `tarefas.md`
- Itens que continuam abertos há mais de duas semanas — sinal de travamento
- Decisão em `decisoes/` com marco de revisão vencendo nesta semana: cobrar o número prometido e mandar preencher a seção "Revisão feita"

Chegar com o levantamento pronto. Perguntar "o que você fez essa semana?" transfere pro usuário um trabalho que o sistema já pode fazer.

### Passo 2 — Perguntar só o que o sistema não sabe

Três perguntas, no máximo:

1. "Desses [N] itens, algum deu retorno concreto? (mensagem, orçamento pedido, venda)"
2. "O que travou de verdade — falta de tempo, de material, de decisão?"
3. "Alguma coisa mudou de prioridade?"

### Passo 3 — Cruzar produção com resultado

Onde houver dado, cruzar. Sem dado, dizer que não tem em vez de opinar:

- Conteúdo que gerou conversa vs. conteúdo que passou batido
- Investimento em ads vs. leads (puxar do relatório, não estimar)
- Proposta enviada vs. resposta recebida
- Padrão: o que funcionou tem algo em comum? (formato, tema, funil, horário)

Se ainda não há histórico suficiente, dizer isso claramente: "duas semanas de dados não formam padrão, anotando pra comparar daqui a um mês".

### Passo 4 — Escrever a revisão

`revisoes/<YYYY-MM-DD>.md`:

```markdown
# Semana <DD/MM> a <DD/MM>

## Saiu
- 2 carrosséis (03/06, 06/06) · 1 artigo · 1 proposta (Acme, R$ 8.400)

## Resultado
- Carrossel de 03/06: 4 mensagens no direct → 1 orçamento
- Carrossel de 06/06: sem retorno
- Ads: R$ 340 → 6 leads (CPA R$ 56, semana anterior R$ 71)
- Proposta Acme: enviada 05/06, sem resposta ainda

## Travou
- Artigo do tema "conservação" parado no draft há 9 dias — falta foto do produto

## Padrão que aparece
- As duas peças que geraram mensagem eram de erro/problema; as institucionais não geraram nada
  (3ª semana seguindo esse padrão)

## Semana que entra
1. Follow-up da Acme (12/06)
2. Tirar as fotos que travam o artigo
3. 2 carrosséis — priorizar pautas de "erro comum" do banco
```

### Passo 5 — Atualizar o que precisa mudar

- **`tarefas.md`** — mover os fechados, criar os itens da semana que entra
- **`_memoria/estrategia.md`** — só se houver mudança real de foco ou um padrão confirmado (3+ semanas). Não reescrever estratégia toda semana por causa de um post ruim
- Se um padrão se confirmou, propor a mudança explicitamente:

> "Terceira semana em que conteúdo de 'erro/problema' traz mensagem e institucional não traz.
> Quer que eu registre isso na estratégia e ajuste o mix do calendário?"

---

## Regras

- **Chegar com o levantamento feito.** A skill trabalha, o usuário confirma
- Dez minutos no máximo. Ritual longo é ritual abandonado
- **Nunca inventar resultado.** Sem dado, escrever "sem dado" — número inventado envenena a decisão do mês seguinte
- Um padrão exige 3 ocorrências. Duas é coincidência
- Não transformar em relatório de autoajuda. Sem "parabéns pelo esforço": o valor é o diagnóstico seco
- Item travado há mais de 2 semanas: perguntar se mata ou destrava. Lista com fantasma antigo desmotiva
- Não mudar `estrategia.md` por reação a uma semana ruim
