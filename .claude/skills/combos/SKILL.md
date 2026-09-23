---
name: combos
description: >
  Abre o CSV de pedidos com itens (PDV, iFood, Shopify), calcula o que sai junto no mesmo
  pedido (coocorrência, suporte, confiança, lift), o ticket médio e os itens por pedido, e
  propõe cinco combos com preço, margem conferida e o volume que cada um precisa vender pra
  se pagar. Custo unitário é informado pelo dono: sem ele, a skill diz cedo o que falta em
  vez de estimar margem.
  Use quando o usuário disser "quais produtos saem juntos", "que combo eu faço com o que já
  vendo", "o que vender junto com o quê", "meu ticket médio tá baixo", "como faço o cliente
  levar mais coisa", "esse combo vale a pena", "tenho o relatório de vendas do mês, dá pra
  tirar algo", "quero subir o valor do pedido sem aumentar preço", "que promoção eu faço com
  o que já tenho", ou /combos.
---

# /combos — O que sai junto, e quanto sobra

> **Convenção de pastas:** a saída vai em `vendas/combos-<AAAA-MM>.md`. Na convenção **por cliente**, `clientes/<Nome>/vendas/combos-<AAAA-MM>.md`. O CSV de pedidos e o de custo ficam em `dados/`. A pasta nasce na primeira rodada.

Subir o valor do pedido é mais barato que arrumar cliente novo: a pessoa já está no balcão, já
escolheu, já confia. Falta o segundo item. Ele não é adivinhado: está no arquivo de pedidos que
o PDV, o aplicativo ou a loja virtual já exporta, escondido em cinco mil linhas que ninguém
abre. Essa skill abre.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, por quais canais, quem atende
- **Oferta ativa:** `_memoria/oferta.md`, quando existir — o que já está empacotado, pra não propor combo que já existe
- **Cliente real:** `_memoria/publico.md`, quando existir — o momento de consumo (almoço de obra, café da tarde, presente) que explica o par
- **Entrada obrigatória:** CSV de pedidos com itens em `dados/`, uma linha por item do pedido, com as colunas pedido, item, qtd e valor
- **Entrada do dono:** custo unitário dos itens que entraram nos pares. O script lê direto `precos/ficha-tecnica.json` (`/ficha-tecnica`) e `estoque/parametros.csv` (`/estoque`) quando existirem, e o que faltar é perguntado
- **Molde:** `templates/crescimento/combos.md` — os quatro números sem jargão, os cinco tipos de combo, a conta do preço, o ponto de equilíbrio com o teto de conversão, e o que o CDC exige
- **Script:** `scripts/combos.js` — coocorrência, suporte, confiança, lift, preço, margem, ponto de equilíbrio e teto de conversão. Lê CSV, e o custo também de `.json` da ficha técnica
- **Conferência:** `scripts/verificar.js` (`tabela` e `texto`)
- **Saída:** `vendas/combos-<AAAA-MM>.md`

---

## Workflow

### Passo 1 — Conseguir o arquivo certo

Uma pergunta só, porque o resto depende dela:

> "Você consegue exportar os pedidos do mês com os itens de cada pedido? Preciso de um CSV
> onde cada linha é um item, com o número do pedido repetido."

Onde isso fica, nos canais mais comuns do comércio local:

| Canal | Onde exportar | Nome do arquivo lá |
|---|---|---|
| PDV de loja | Relatórios, vendas por item ou "itens vendidos" com número do cupom | varia por sistema |
| iFood | Portal do parceiro, faturamento, exportar pedidos detalhados | planilha de pedidos |
| Shopify | Orders, Export, "Orders + line items" | `orders_export.csv` |
| Planilha própria | A aba onde cada linha é um item de um pedido | exportar como CSV |

**Relatório que só tem o total do pedido não serve.** Sem a linha de cada item, não existe par
pra contar, e é melhor dizer isso agora do que depois de meia hora de conversa. Se o export
vier em `.xlsx`, o caminho é salvar como CSV; a skill lê CSV, e o motivo é que o cálculo é o
mesmo e a conversão é de um clique.

Chegou o arquivo? Conferir primeiro o que o script entendeu:

```bash
node scripts/combos.js dados/pedidos.csv --ler
```

Isso mostra quantas linhas viraram item, quantos pedidos, quantos itens diferentes, e como a
coluna de valor foi lida (total da linha ou preço de uma unidade). Se a leitura estiver errada,
resolver aqui: `--valor linha` ou `--valor unitario` força a interpretação. Número de pedidos
que não bate com o que o dono sabe do mês é sinal de arquivo incompleto, e vale perguntar.

Se faltar o molde pra ele preencher na mão, `node scripts/combos.js modelo dados/` grava
`dados/pedidos.csv` e `dados/custos.csv` com exemplo dentro.

### Passo 2 — Calcular os pares antes de pedir custo

Rodar sem custo nenhum, só pra saber quais itens importam:

```bash
node scripts/combos.js dados/pedidos.csv
```

A saída já traz o tamanho do pedido hoje (ticket médio, itens por pedido, quanto vale o pedido
de um item contra o de dois ou mais) e a tabela de pares acima do piso de volume. Ler o
resultado com o molde `templates/crescimento/combos.md` ao lado, que tem a tabela do que não é
par mesmo com número bonito. Par ruim custa mais que combo nenhum, e dois defeitos aparecem em
quase todo catálogo de comércio local. Os dois se consertam por comando, e a limpeza entra em
todas as rodadas seguintes:

```bash
node scripts/combos.js dados/pedidos.csv \
  --excluir "Sacola, Taxa de entrega, Embalagem" \
  --juntar "Coca lata=Coca 350, Coca-cola lata, Coca 350ml"
```

- `--excluir` tira o item que vai em todo pedido. Sacola e taxa de entrega não são escolha do cliente, e enquanto estão dentro aparecem no topo da tabela com suporte alto e lift perto de um
- `--juntar` costura o cadastro duplicado. "Coca 350" e "Coca lata" são o mesmo refrigerante em duas linhas do PDV, e enquanto estão separados afundam o lift dos dois. Antes de confiar na tabela, correr os itens mais vendidos com o dono e perguntar quais são o mesmo produto
- Nome que não bate com nada volta como aviso na saída, em vez de sumir em silêncio

Substituto se reconhece pelo lift abaixo de 1 entre variações do mesmo produto, e esse o script
já corta sozinho pelo `--min-lift`.

Essa ordem existe por um motivo prático: o dono não precisa levantar o custo de 80 itens. Só
dos 8 a 12 que apareceram nos pares.

### Passo 3 — Pedir o custo que falta, em uma mensagem só

Antes de perguntar, procurar o que já existe no workspace. O `--custos` aceita os três:

```bash
node scripts/combos.js dados/pedidos.csv --custos precos/ficha-tecnica.json
node scripts/combos.js dados/pedidos.csv --custos estoque/parametros.csv
node scripts/combos.js dados/pedidos.csv --custos dados/custos.csv
```

- `precos/ficha-tecnica.json` do `/ficha-tecnica` — o script calcula a ficha e usa o custo por porção de cada receita, casando pelo nome da receita
- `estoque/parametros.csv` do `/estoque` — casa pela coluna `nome` ou pelo `sku`, o que aparecer igual no CSV de pedidos
- `dados/custos.csv` — o arquivo do próprio `/combos`, com as colunas `item;custo`

A seção "O que falta pra fechar a conta" da saída lista quem ficou sem custo, com a coluna
"Entra em par aprovado" na frente: só os que têm "sim" travam a margem. O que sobrar vai numa
mensagem única, com o preço praticado ao lado, pra ele conferir de cabeça:

> "Pra calcular a margem do combo preciso do custo de cada um desses. É o que você paga, sem
> contar aluguel nem sua hora:
> 1. Marmita executiva (vende por R$ 24,90) — custo R$ ?
> 2. Refrigerante lata (vende por R$ 8,00) — custo R$ ?
> ..."

Guardar as respostas em `dados/custos.csv` (`item;custo`): no mês que vem a conta roda de novo
e o custo muda pouco. Custo de um ou dois itens também entra direto na linha de
comando, com `--custo "Marmita executiva=11,20"`. Nome que não casa aparece na saída como linha
de custo órfã, e o conserto é copiar o nome do jeito que está no CSV de pedidos.

**Pedido que veio de aplicativo tem comissão.** iFood, Rappi e marketplace cobram percentual
sobre o pedido, e isso sai da margem do combo. Duas saídas honestas: informar o custo já com a
comissão embutida, ou rodar um arquivo por canal, porque o mesmo par tem margem diferente no
balcão e no aplicativo. A conta detalhada da taxa é do `/delivery` e do `/marketplace`.

### Passo 4 — Rodar a conta fechada e escolher os cinco

```bash
node scripts/combos.js dados/pedidos.csv --custos dados/custos.csv --mes 2026-08 \
  --desconto 10 --margem-minima 30
```

O script devolve, por combo: preço cheio (soma do preço médio praticado), preço do combo,
desconto real, custo, margem, o ponto de equilíbrio e o veredito. Os dois números que decidem
vêm juntos: **quantos pedidos novos por mês o combo precisa pra empatar** o desconto dado a
quem já levava os dois, e o **teto de conversão**, que é quanta gente leva a âncora sem o anexo
hoje. Quem já leva os dois não converte, então o teto é o tamanho real do grupo de onde os
pedidos novos podem sair.

O veredito tem quatro valores, e cada um pede uma ação diferente:

| Veredito | O que aconteceu | O que fazer |
|---|---|---|
| `passa` | Margem em cima do mínimo e ponto de equilíbrio dentro do teto | Levar pro `/oferta` e pôr no balcão |
| `reprovado na margem` | O desconto pedido derruba a margem abaixo do mínimo | Usar o desconto máximo ou o preço mínimo que a saída calcula |
| `não se paga no volume do mês` | Margem boa, mas precisa de mais conversões do que o teto tem | Tirar o desconto, trocar o par ou mover o desconto pro item de margem maior |
| `custo não informado` | Falta o custo de um dos dois | Voltar ao passo 3; não estimar |

As opções que mudam a escolha, e quando usar cada uma:

| Opção | O que faz | Quando |
|---|---|---|
| `--ordem lift` (padrão) | Escolhe pela força da atração | Quando a meta é criar hábito novo |
| `--ordem volume` | Escolhe pelo par que mais acontece | Quando a meta é cartaz de balcão e velocidade de pedido |
| `--reuso 1` | Não repete item entre combos | Pra ter cinco combos variados no cardápio |
| `--desconto 0` | Combo de conveniência, sem desconto | Quando o par já sai junto em mais de 25% dos pedidos |
| `--min-pedidos <n>` | Muda o piso de volume | Base pequena, com o número declarado como frágil |

**A leitura que mais muda decisão:** par que já sai junto em quase todo pedido não precisa de
desconto, precisa de nome. Dar 10% num par que acontece em 261 dos 903 pedidos é pagar pra
manter o que já acontecia. O desconto não cria hábito ali: ele paga um hábito velho, e o script
mostra quanto, em reais. É o caso do exemplo do molde, em que a margem passa em 50,7% e o combo
ainda assim precisaria de 656 conversões num grupo de 161 pedidos.

Para cada combo, decidir com o dono duas coisas que o número não decide: o **tipo** (pela
tabela dos cinco tipos do molde) e **onde ele aparece** (balcão, cardápio, tela do aplicativo,
resposta de WhatsApp). São os dois campos que o passo 5 deixa abertos no arquivo.

### Passo 5 — Escrever a página

O script grava o arquivo inteiro. No comando que grava vai tudo o que foi decidido nos passos
anteriores, limpeza de catálogo inclusive: rodar sem os `--excluir` e `--juntar` do passo 2
devolve a tabela suja de novo. Depois disso, o assistente preenche dois campos por combo e nada
mais:

```bash
node scripts/combos.js dados/pedidos.csv --custos dados/custos.csv --mes 2026-08 \
  --excluir "Sacola, Taxa de entrega" --desconto 10 --margem-minima 30 \
  --saida vendas/combos-2026-08.md
```

O arquivo gravado tem esta estrutura, e ela vem pronta com os números:

```markdown
# Combos — <mês>

Base: `dados/pedidos.csv` — <N> pedidos, <M> itens diferentes, <U> unidades vendidas.
O comando completo que gerou a página, pra repetir igual no mês que vem.

## O tamanho do pedido hoje
| Linha | Valor |            → pedidos, receita, ticket médio, itens por pedido,
|---|---|                     itens diferentes por pedido, pedidos de um item só,
                              ticket de um item contra o de dois ou mais, período

## O que sai junto
| Par | Pedidos com os dois | Suporte | Quem leva A leva B | Quem leva B leva A | Lift |

### Ficou de fora, e por quê
| Par | Pedidos com os dois | Motivo |

## Os combos
| # | Combo | Pedidos juntos | Lift | Cheio | Preço | Desconto real | Custo | Margem | Se paga com | Veredito |

### 1. <A> + <B>
Veredito: <passa | reprovado na margem | não se paga no volume do mês | custo não informado>.

- **Itens:** <A> + <B> — a âncora é <X>, o anexo é <Y>
- **Preço:** R$ ... (cheio R$ ..., desconto real ...%)
- **Margem:** ...% (custo R$ ...) — em cima do mínimo de ...%
- **Por que esse par:** sai junto em <n> pedidos, lift ...; confiança nos dois sentidos
- **Se paga com:** <n> pedidos novos no mês, contra os <n> que já levavam os dois
- **Teto de conversão:** <n> pedidos levam <X> sem <Y> hoje
- **Conserto:** <só aparece quando o veredito não é "passa">
- **Tipo:** <a preencher pela tabela dos cinco tipos do molde>
- **Onde aparece:** <a preencher: balcão, cardápio, aplicativo, WhatsApp>

## O que falta pra fechar a conta
| Item | Entra em par aprovado | Pedidos | Preço médio praticado | Custo |
mais as linhas de custo órfãs, as linhas descartadas do arquivo e os pedidos grandes

## O que medir no mês que vem
| Número | Hoje | Alvo | Onde confere |
```

Só dois campos ficam abertos por combo, `Tipo` e `Onde aparece`, e a coluna `Alvo` da última
tabela. Editar esses e mais nada: número reescrito na mão é número que ninguém consegue
conferir depois. Nome do combo sai aqui em rascunho, com os dois itens separados por mais; a
versão que vende é do `/oferta`.

A tabela de medição fecha a página com a linha de base. Meta do mês, cobrança e comparação
semana a semana são do `/revisao-semanal`, que lê esse arquivo.

### Passo 6 — Conferir por comando

```bash
node scripts/verificar.js tabela vendas/combos-2026-08.md
node scripts/verificar.js texto vendas/combos-2026-08.md
```

O `tabela` soma cada coluna e compara com o que o texto ao redor afirma. Se divergir, refazer
a conta a partir do CSV, nunca ajustar o número pra bater. Todo número da página sai de um
comando. Se o dono pedir o cálculo de um combo que não está na lista, rodar de novo com
`--desconto` ou `--min-lift` diferente, em vez de calcular na conversa.

### Passo 7 — Passar a bola

A skill acaba na conta. Depois dela, cada pedaço tem dono:

- **Frase de balcão, nome final e o que dizer quando o cliente hesita:** `/oferta`
- **Mensagem pra lista de clientes e resposta pronta no atendimento:** `/whatsapp`
- **Meta do mês e cobrança do resultado:** `/revisao-semanal`
- **Combo pra girar item encalhado:** `/estoque` aponta o encalhe, e ele entra como prioridade na próxima rodada
- **Cardápio ou página de planos no site:** `/produto`
- **Cartaz, cardápio impresso e adesivo de vitrine:** `/impressao`

Se o resultado mudou o que está sendo vendido, vale atualizar `_memoria/oferta.md` com o combo
que entrou em teste, e a data em que ele será revisto.

---

## Regras

- **Uma conta, um comando.** Coocorrência, lift, preço, margem e ponto de equilíbrio saem de `scripts/combos.js`. Nada de número calculado na conversa, nem tabela montada de cabeça a partir do que o arquivo "parece mostrar"
- **Sem custo não existe margem.** Item sem custo informado entra na análise e sai da margem, marcado `[a confirmar]`. Nunca estimar percentual de custo por tipo de negócio, nem aplicar "margem de mercado": erro de dois pontos aqui vira prejuízo no cartaz impresso
- **Margem aprovada não é combo aprovado.** O teto de conversão reprova mais combo do que a margem. Par que já sai junto em quase todo pedido da âncora não tem de onde tirar pedido novo, e aí o desconto só paga hábito velho. O veredito do script junta os dois testes, e a página precisa dizer qual dos dois barrou
- **A limpeza do catálogo vale pra sempre.** O `--excluir` e o `--juntar` de uma rodada valem na seguinte. A página gravada traz o comando completo no topo justamente pra isso: sem ele, o mês que vem volta com "Sacola" no topo da tabela e a comparação entre os dois meses deixa de valer
- **Piso de volume é regra, não preferência.** Par abaixo do piso não vira combo. Quando o dono insistir num par de pouco volume, baixar o piso por comando e dizer na página que aquele número é frágil, com o número de pedidos ao lado
- **Lift alto de item raro é miragem.** Dois pedidos não sustentam decisão de preço. O molde explica por quê, e a lista "ficou de fora" existe pra que nada desapareça sem motivo
- **Sempre confirmar o que a coluna de valor significa** antes de somar. Preço unitário lido como total da linha estraga ticket médio, preço cheio e margem de uma vez
- **Combo é opção, nunca condição.** O item precisa continuar à venda separado, no preço de sempre: o art. 39, I, do CDC trata venda casada como prática abusiva. E desconto anunciado precisa ser desconto real sobre o preço praticado, pelo art. 37, § 1º. As três citações e a fonte oficial estão no molde
- **Não substitui advogado nem contador.** Setor regulado (farmácia, bebida alcoólica, produto infantil) tem regra própria de oferta e de publicidade, e imposto sobre a venda não entra na margem calculada aqui
- **Dado de pedido é dado do negócio, e às vezes do cliente.** Export com nome, telefone ou endereço não vai pra ferramenta externa sem autorização explícita. A skill não precisa dessas colunas: pedido, item, quantidade e valor bastam (LGPD)
- **Um mês é uma amostra.** Semana de pagamento, feriado, chuva no delivery e sazonalidade mexem no resultado. Dois meses na mesma direção é sinal; um mês é hipótese, e a página diz qual dos dois está sendo entregue
- **Fronteira com as vizinhas:** o `/oferta` empacota por raciocínio e escreve a frase que vende, sem abrir arquivo; o `/analisar-dados` resume qualquer planilha e não calcula par; o `/preco` é o preço do serviço e a conversa de reajuste; o `/ficha-tecnica` é o custo de cada unidade produzida, e é entrada desta skill; o `/delivery` e o `/marketplace` cuidam da comissão da plataforma; o `/estoque` é quanto comprar e quando; o `/caixa` é o mês fechado do negócio; o `/whatsapp` é a mensagem; o `/revisao-semanal` cobra o resultado. Esta skill é uma conta só: o que sai junto, a que preço, com que margem
