---
name: evoluir
description: >
  Decide o que fazer com um sistema que já está no ar e tem gente usando: mede no banco quais
  funcionalidades viraram uso de verdade, confere se a métrica prometida em cada entrega se
  cumpriu, monta a próxima leva com no máximo duas ou três frentes, e diz o que desligar. Soma
  também o custo humano do mês, que é o que mata sistema de negócio pequeno antes do mercado.
  Use quando o usuário disser "o sistema já está no ar, e agora", "ninguém usa o que eu fiz",
  "fiz a funcionalidade e não mudou nada", "meu sistema tá cheio de coisa que ninguém usa",
  "vale a pena continuar investindo nesse sistema", "posso desligar essa parte", "meus
  usuários somem e não reclamam", "passo o dia respondendo dúvida do sistema", "o sistema
  parou de crescer", "o que eu construo agora", ou /evoluir.
  Fronteira com as vizinhas: definir o que construir antes de existir é /escopo; qualidade do
  código que já existe é /revisar-codigo; rede de teste é /testar; o dinheiro do negócio como
  um todo é /caixa; o que fazer quando o sistema caiu é o incidente, dentro do /backend.
---

# /evoluir — O sistema está no ar, e agora?

> **Convenção de pastas:** a saída vai em `sistemas/<nome>/EVOLUCAO.md`, ao lado do `ESCOPO.md` se ele existir. Na convenção **por cliente**, `clientes/<Nome>/sistemas/<nome>/EVOLUCAO.md`. O diário de mudanças fica em `sistemas/<nome>/MUDANCAS.md` e é o único arquivo que continua sendo escrito toda semana.

Sistema entregue é onde a maioria dos projetos para de ser decidido e passa a ser empurrado.
A lista do que fazer vira a lista de quem pediu por último, ninguém volta para conferir se a
funcionalidade do mês passado mudou alguma coisa, e o custo de manter cresce em silêncio, em
forma de mensagem no sábado. Esta skill faz o contrário: começa pelo dado que já está gravado
no banco, e só depois pergunta o que construir.

Nenhuma linha de código sai daqui. O que sai é um arquivo com o veredito de cada
funcionalidade, a próxima leva ordenada, e a lista do que vai ser desligado.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` — quem usa o sistema, quantas pessoas, e o que o negócio precisa que ele resolva agora
- **Prioridades:** `_memoria/estrategia.md` — o foco do trimestre decide qual frente fica aberta e qual fecha
- **Referências** (ler a que o passo pedir, não todas):
  - `templates/software/evolucao.md` — fechar o ciclo da métrica, o diário de mudanças, os dez minutos antes e depois, quando o crescimento para, e como desligar
  - `templates/software/escopo.md` — a lista única ordenada, motivação e métrica, e o "como dizer não" (não repetir aqui: apontar)
  - `templates/software/custo.md` — a conta mensal e as quatro caixas em que cai todo pedido depois da entrega
  - `templates/software/validacao.md` — a conta do retorno e o checklist do dia de abrir as portas, quando a leva nova inclui um lançamento
  - `templates/backend/consultas.md` — antes de acreditar em qualquer número que sair de consulta sua
  - `templates/backend/incidente.md` — "Chamado que se repete é defeito de produto"
- **Saída:** `sistemas/<nome>/EVOLUCAO.md` e `sistemas/<nome>/MUDANCAS.md`

---

## Workflow

### Passo 1 — Recuperar o que foi prometido

Abra o `ESCOPO.md`, se existir, e liste o que foi entregue desde a última conferência. Cada
item deveria ter duas linhas coladas nele: a motivação e a métrica.

| O que você encontrou | Por onde seguir |
|---|---|
| Itens com motivação e métrica escritas | Passo 2, medindo exatamente o que foi prometido |
| Escopo sem métrica, ou sem escopo nenhum | Passo 2 mesmo assim, medindo uso bruto por tela e por tipo de registro. A métrica ausente vira o primeiro item da próxima leva |
| Sistema de terceiro, sem documento nenhum | Faça o inventário primeiro: quais telas existem, o que cada uma grava. O `/revisar-codigo` faz esse levantamento melhor |

Não peça esses números ao dono de cabeça. Ele vai responder pela lembrança do que foi pedido,
e é essa lembrança que a skill existe para corrigir.

### Passo 2 — Medir o uso no banco, não na memória

O dado já está gravado. Escreva as consultas para o banco que o sistema usa e rode, ou
entregue prontas para quem tem acesso rodar:

```sql
-- 1. distribuição de uso por tipo de registro, últimos 30 dias
SELECT tipo, COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
  FROM lancamentos
 WHERE criado_em >= CURRENT_DATE - INTERVAL '30 days'
 GROUP BY tipo ORDER BY n DESC;

-- 2. quem de fato voltou: contas com uso em pelo menos duas semanas distintas
SELECT COUNT(*) FROM (
  SELECT usuario_id FROM lancamentos
   WHERE criado_em >= CURRENT_DATE - INTERVAL '60 days'
   GROUP BY usuario_id HAVING COUNT(DISTINCT DATE_TRUNC('week', criado_em)) >= 2
) t;

-- 3. a funcionalidade nova, isolada, desde que entrou no ar
SELECT COUNT(*) AS usos, COUNT(DISTINCT usuario_id) AS pessoas
  FROM lancamentos WHERE tipo = 'atividade' AND criado_em >= DATE '<entrada no ar>';
```

Antes de acreditar no resultado, passe os olhos em `templates/backend/consultas.md`: junção
que multiplica linha, `LEFT JOIN` com filtro no `WHERE`, `COUNT` de coluna com nulo e média de
média entregam número errado sem gerar erro nenhum.

**Regra:** todo número que entrar no arquivo vem com a consulta ao lado e a data em que ela
rodou. Número sem consulta ao lado não entra.

### Passo 3 — Dar veredito, funcionalidade por funcionalidade

Uma tabela, uma linha por funcionalidade entregue:

| Funcionalidade | No ar desde | Uso medido | Motivação se cumpriu? | Veredito |
|---|---|---|---|---|
| Registro de pedido | 02/01 | 98,2% dos registros | sim, fechamento caiu de 4h para 40min | investir na segunda camada |
| Relatório por vendedor | 15/02 | 4,6% das visitas | não medido, dado não existe | gravar a métrica antes de mexer |
| Anexo de foto | 03/03 | 1,8%, 2 pessoas | não | desligar |

Os três vereditos possíveis e o que cada um obriga estão em `templates/software/evolucao.md`,
seção "Fechar o ciclo da métrica que foi prometida". Não invente um quarto.

Funcionalidade com uso residual **não fica neutra na tela**. Ela custa manutenção, aparece na
frente de quem quer fazer outra coisa, e vira exceção em toda mudança futura.

### Passo 4 — Ouvir o que o banco não sabe

Três fontes, todas baratas, todas fora do banco:

1. **Chamado repetido.** Levante as dúvidas que chegaram mais de duas vezes no mês. Cada uma é um defeito de interface, não um atendimento
2. **Os dez minutos antes e os dez depois.** A técnica está na referência. O que a pessoa faz em volta do sistema é a próxima funcionalidade, e ela nunca aparece na lista de sugestões
3. **Quem saiu.** Se o sistema tem cancelamento ou conta que some, pergunte o motivo na saída. É a fonte de informação que quase ninguém coleta

Some aqui o **custo humano do mês**: horas de atendimento, correção de dado na mão, relatório
montado fora do sistema. Multiplique pelo valor da hora de quem faz. Esse número costuma ser
maior que a hospedagem, e ele entra no arquivo.

### Passo 5 — Montar a próxima leva

Duas frentes abertas, três no limite. A regra e o motivo estão na referência.

Cada item entra com motivação e métrica, pelas mesmas regras do `escopo.md`. E o que sobrar
recebe não agora, mostrando a lista, e não "vou colocar no backlog".

Se o dono pedir uma funcionalidade que o uso medido contradiz, a resposta não é recusar: é
mostrar a linha da tabela do Passo 3 e deixar ele decidir com o número na frente.

### Passo 6 — Escrever o que vai ser desligado

A ordem do desligamento (confirmar quem usa, avisar com prazo, esconder da interface, remover
código, remover dado por último) está na referência, seção "Desligar o que morreu". Escreva as
duas datas: fim de uso e remoção.

Se ninguém for desligar nada nesta leva, escreva isso também, com o motivo. Lista de
desligamento vazia sem justificativa costuma significar que ninguém olhou.

### Passo 7 — Abrir ou atualizar o diário

`MUDANCAS.md`, três colunas: data, o que mudou, o que se esperava. Entram mudanças de código
e também as que não são código: texto do site, anúncio, preço, horário de atendimento.

Linha do diário que o cliente percebe de fora não para aí: o `/novidades` lê o mesmo intervalo
no histórico do repositório e escreve o aviso na língua dele, com a mensagem de WhatsApp e o
bloco pro e-mail.

É o arquivo que explica, no mês seguinte, por que o número se mexeu. Ele é curto de propósito.

### Passo 8 — Marcar a data da próxima conferência

Sem data marcada, o ciclo não fecha de novo. Três a seis semanas depois da próxima entrega,
escrito no fim do arquivo, com o nome de quem vai rodar a consulta.

---

## Medir, não achar (obrigatório)

Uso, custo e retorno não se estimam:

```bash
node scripts/verificar.js tabela sistemas/<nome>/EVOLUCAO.md   # somas e "12× R$ 97 = R$ 1.164"
node scripts/verificar.js datas sistemas/<nome>/EVOLUCAO.md    # dia da semana vs data real
node scripts/verificar.js texto sistemas/<nome>/EVOLUCAO.md    # se o arquivo vai para o cliente
```

A tabela de vereditos tem porcentagem, e porcentagem que não soma cem entrega a conversa
inteira para quem quiser desqualificá-la. Rode antes de mandar.

**Regra:** se o resultado divergir, refaça a conta a partir da consulta, nunca ajuste o número
para bater com o texto.

---

## Formato da entrega

```
✓ sistemas/<nome>/EVOLUCAO.md
   · Uso medido em [data], com as consultas ao lado de cada número
   · [N] funcionalidades com veredito: [N] investir, [N] medir, [N] desligar
   · Custo humano do mês: [N]h × R$ [valor] = R$ [total]
   · Próxima leva: [N] itens, [N] frentes abertas
   · Desligar: [lista, ou "nada nesta leva, porque ..."]
   · Próxima conferência: [data], por [nome]
✓ sistemas/<nome>/MUDANCAS.md — [N] linhas novas
```

---

## Regras

- **Começar pelo dado, sempre.** A conversa sobre o que construir só começa depois que o uso das entregas anteriores está medido. Inverter essa ordem devolve a decisão para quem gritou mais alto
- **Todo número vem com a consulta e a data.** Uso lembrado não entra no arquivo, nem quando quem lembra é o dono
- **Pedido não é uso.** A funcionalidade mais pedida e a mais usada raramente são a mesma, e é o banco que separa as duas
- **Nunca alterar o sistema aqui.** Esta skill lê, mede e escreve arquivo. Mexer no código é `/backend`, e desligar funcionalidade em produção é decisão do dono, com data combinada
- **Consulta só de leitura contra a base de produção.** Nada que escreva, nada que trave tabela em horário de expediente
- **Duas frentes, três no limite.** Se a próxima leva tem quatro frentes, ela não é uma leva: é uma lista de desejos
- **Não implementar sugestão nas primeiras semanas** depois de um lançamento. Responder rápido, agradecer, e esperar a sugestão se repetir sozinha
- **O custo humano entra na conta.** Sistema de negócio pequeno morre de hora de atendimento antes de morrer de mercado
- **"Vou colocar no backlog" é proibido.** Ou o item entra na leva, ou ouve não agora com a lista à vista
- Explicar tudo em português, sem termo de gestão de produto. O dono decide, e ele decide melhor lendo "quase ninguém usou isso" do que lendo "baixa adoção"
