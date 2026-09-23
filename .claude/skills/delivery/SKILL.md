---
name: delivery
description: >
  Descobre quanto sobra de cada prato em cada canal de delivery, descontando a comissão do
  plano, a taxa de pagamento online, o cupom que a loja bancou, a embalagem de entrega, a
  entrega e a mensalidade rateada. Devolve o preço que fecha a conta em cada canal, o desconto
  que cabe numa promoção sem prejuízo e a decisão por item: sair do canal, cobrar diferente,
  empurrar pra venda direta ou promover. Toda taxa vem do contrato do usuário, nunca de tabela
  fixa, e toda conta é feita por script.
  Use quando o usuário disser "o iFood tá comendo meu lucro", "quanto sobra de cada prato no
  aplicativo", "vale a pena vender no iFood", "qual plano do iFood compensa pra mim", "a taxa
  subiu e agora", "posso dar cupom sem prejuízo", "quero tirar esse item do app", "dá pra
  cobrar mais caro no aplicativo", "quero vender direto no WhatsApp", "quanto o app leva de
  cada pedido", ou /delivery.
---

# /delivery — Quanto sobra dentro do aplicativo

> **Convenção de pastas:** a saída vai em `cardapio/` (a spec `delivery.json`, o laudo `delivery-<AAAA-MM>.md`, a planilha `delivery-<AAAA-MM>.xlsx` e as simulações). Na convenção **por cliente**, `clientes/<Nome>/cardapio/` quando o cardápio é de um cliente; o da própria casa fica na raiz. A pasta nasce na primeira rodada.

O extrato do aplicativo mostra o repasse e nunca a margem. O dono vê R$ 32,90 no
cardápio, R$ 24,28 cair na conta, e continua sem saber se a marmita pagou a si mesma.
Entre os dois números há sete subtrações, e a maioria conta duas. É assim que a
marmitaria vende 400 pedidos no mês, aparece bem no ranking, e fecha com menos caixa do
que quando vendia 250 no balcão. A plataforma nunca vai fazer essa conta: ela cobra
percentual sobre a venda, e a venda cresceu.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, em quais aplicativos está, quem faz a entrega
- **Custo do prato:** `precos/ficha-tecnica.json` ou `precos/cardapio-margem.md`, do `/ficha-tecnica`. É de lá que sai o custo por porção de cada item. Sem ele, o custo entra na conversa e fica marcado como estimativa
- **Despesas rateadas:** o fechamento do `/caixa` em `financeiro/fechamento-<AAAA-MM>.md`, se existir. É de lá que sai o percentual de despesas fixas sobre o faturamento
- **Preço praticado:** `_memoria/oferta.md`, quando registra o preço de cada item
- **Molde:** `templates/financeiro/delivery.md` — a conta em sete linhas, a spec campo a campo, as taxas de cada plataforma com fonte e data, o TCC do CADE sobre paridade de preço, os erros comuns, o léxico
- **Script:** `scripts/delivery.js` — valida a spec, calcula margem por item e canal, gera o laudo e a planilha com fórmula viva; `--simular` roda a taxa nova sem tocar nos arquivos
- **Planilha:** `scripts/gerar-planilha.js` — usado pelo script pra gerar o `.xlsx` e pra ler o que o usuário mandou (`--ler`)
- **Conferência:** `node scripts/verificar.js tabela` e `texto` no markdown de saída
- **Saída:** `cardapio/delivery.json` (a spec, fonte da verdade), `cardapio/delivery-<AAAA-MM>.md`, `cardapio/delivery-<AAAA-MM>.xlsx` e, nas simulações, `cardapio/simulacao-delivery-<AAAA-MM-DD>-<canal>-<campo>.md`

---

## Workflow

### Passo 1 — Descobrir onde ele vende e como

Se `cardapio/delivery.json` já existe, ler antes de perguntar qualquer coisa: o trabalho
é atualizar taxa, preço e venda do mês, não começar de novo. Se não existe, uma pergunta
por vez:

1. "Em quais aplicativos você está hoje, e em qual plano de cada um?" Anotar o nome do
   plano, não só o da plataforma. iFood Básico e iFood Entrega são dois canais diferentes
   na mesma conta, e a diferença entre eles é o que decide a maior parte da margem
2. "Você também vende direto, por WhatsApp, telefone ou balcão?" Esse canal entra na
   conta como qualquer outro, com `direto: true`. Sem ele não há comparação de venda direta
3. "Quais itens você quer olhar agora?" Começar por até oito: os que mais vendem, mais os
   que ele suspeita. Cardápio de 40 itens entra depois, com a base pronta
4. "Quem paga a entrega em cada canal?" No plano de logística do aplicativo, o app. No
   plano de entrega própria, a loja, e aí entra o valor por pedido

Se ele não sabe em que plano está, o caminho é abrir o portal do parceiro e ler a linha
do plano. Chutar aqui erra a conta inteira.

### Passo 2 — Pegar a taxa do contrato dele, não de tabela

**Toda taxa desta skill é entrada do usuário.** O molde tem as faixas de cada plataforma
com fonte e data, e elas servem pra duas coisas: dizer se o número que ele informou está
fora de qualquer faixa conhecida, e mostrar o que existe quando ele nunca comparou.
Nenhuma delas entra no cálculo.

Por canal, quatro números e uma pergunta:

| O que perguntar | Onde ele acha |
|---|---|
| Comissão do plano, em % | extrato do portal, linha de comissão |
| Taxa de pagamento online, em % | extrato, linha separada da comissão |
| Mensalidade do plano, em reais | fatura mensal |
| Entrega paga pela loja, por pedido | o que ele paga ao entregador |

E a pergunta que quase ninguém sabe responder de cabeça: **a comissão incide sobre o
preço cheio ou sobre o preço já com o cupom abatido?** O jeito de descobrir é abrir um
pedido que teve cupom e dividir a comissão cobrada pelo valor do pedido. Se der a
comissão do plano, a base é o valor com desconto (`"com_desconto"` na spec); se der
menos, a base foi o preço de tabela (`"cheio"`). Num cupom de 20% sobre R$ 50, a
diferença é R$ 2,30 por pedido.

Se ele mandou o export do portal ou o relatório do app em `dados/`, ler direto. Planilha
`.xlsx` se abre com `node scripts/gerar-planilha.js --ler <arquivo>`. PDF e imagem o
assistente lê pela própria ferramenta de leitura. De lá saem duas colunas por canal:
quantidade vendida por item e preço praticado.

### Passo 3 — Trazer o custo por porção

O custo tem de vir do `/ficha-tecnica`, e não da cabeça do dono. Se
`precos/ficha-tecnica.json` existe, ler o custo por porção de cada item de lá. Se não
existe, oferecer o `/ficha-tecnica` **uma vez**, e seguir com o que ele tiver, marcando
o custo como estimativa no laudo.

Uma coisa que a ficha do prato não tem: a **embalagem de entrega**. Sacola, lacre, saco
térmico, talher e guardanapo existem no delivery e não no balcão. Perguntar explicitamente
"o que vai junto no pedido do aplicativo que não vai no balcão?" e somar isso em
`embalagem_extra`, por canal. É a linha que mais falta.

### Passo 4 — Definir despesas e lucro alvo

Dois percentuais, e vêm de lugares diferentes:

- **Despesas rateadas** = (custos fixos + variáveis que não são insumo) ÷ faturamento do
  mês. Se existe fechamento do `/caixa`, calcular por comando a partir dele. Se não
  existe, perguntar os dois números, somar por comando, e registrar que é estimativa
- **Lucro alvo** é decisão do dono: "quanto você quer que sobre de cada pedido?" Se ele
  não sabe, mostrar o que 10%, 15% e 20% fazem com o preço do item mais vendido no canal
  mais caro, e deixar ele escolher

O aluguel não desaparece porque o pedido veio do app: as despesas do negócio entram no
item vendido pelo aplicativo do mesmo jeito que no vendido no balcão.

### Passo 5 — Escrever a spec e rodar

A spec nasce de um exemplo e é editada:

```bash
node scripts/delivery.js --exemplo cardapio/delivery.json
node scripts/delivery.js cardapio/delivery.json
```

O script valida antes de calcular: canal sem nome, comissão mais taxa passando de 100%,
despesas mais lucro alvo passando de 100%, cupom que zera o preço, preço zero num canal,
item com preço em canal que não está na lista, canal com mensalidade e sem volume pra
ratear, campo escrito errado. Cada erro para o cálculo e diz o que corrigir. Corrigir a
spec e rodar de novo; nunca contornar editando o resultado.

Quando roda, ele grava o laudo e a planilha, confere que os dois chegam ao mesmo repasse,
lucro real, preço da meta e situação em cada linha, e imprime no terminal a tabela de
item por canal com lucro em reais, lucro em percentual e situação. É esse resumo que vai
pra conversa.

Esqueleto do `delivery-<AAAA-MM>.md`:

```markdown
# Delivery e margem por canal — <negócio>

## O cardápio nos aplicativos em uma frase
De N combinações de item e canal, X batem a meta de Y%, Z ficam abaixo dela e W dão prejuízo.

## Os canais
| Canal | Comissão | Taxa de pagamento | Taxa total | Mensalidade | Rateio por item | Embalagem extra |
|---|---|---|---|---|---|---|

- **<canal>** — <fonte>, conferido em <data>. Rateio sobre N itens no mês

## Margem por item e canal
| Item | Canal | Preço | Cupom | Comissão + taxa | Entrega | Custo + embalagem | Mensalidade | Despesas | Lucro real | Lucro % | Situação |
|---|---|---|---|---|---|---|---|---|---|---|---|

## O preço que bate a meta
| Item | Canal | Preço hoje | Preço da meta | Diferença | Preço de empate | Desconto que cabe |
|---|---|---|---|---|---|---|

## A decisão
### Sair do canal
### Precificar diferente por canal
### Empurrar pra venda direta
### Pode entrar em promoção

## O mês por canal
| Canal | Itens vendidos | Faturamento | Cupom bancado | Comissão + taxa | Custo do produto | Lucro do canal |
|---|---|---|---|---|---|---|

## O que conferir

## Como refazer
```

A planilha tem três abas: **Canais** (as taxas do contrato, é onde o usuário mexe),
**Margem** (a conta inteira por item e canal, com preço da meta e situação por fórmula) e
**Como usar**. Quem troca a comissão de 23% para 27% na aba Canais vê o cardápio inteiro
recalcular sem abrir o terminal.

### Passo 6 — Entregar a decisão, não a tabela

O ranking sozinho não decide nada. A entrega tem quatro partes, e cada uma é uma ação:

1. **O que sai do canal.** Item que perde dinheiro por unidade e cuja saída do prejuízo
   exigiria um reajuste acima do teto que o dono aceita. No aplicativo isso é despublicar
   o item; no canal direto é parar de entregar aquele item sozinho. A frase vem com o
   número: "o suco perde R$ 2,92 por unidade entregue, e pra empatar precisaria ir a
   R$ 11,61, 45% acima de hoje"
2. **O que muda de preço por canal.** O script dá o preço que bate a meta em cada canal.
   Quando esse preço passa do teto de reajuste, ele mostra o que o teto entrega de lucro,
   e a decisão vira outra: cortar custo por porção ou sair
3. **O que vai pra venda direta.** O ganho por unidade no canal direto contra cada
   aplicativo. Aqui cabe uma ressalva que o número não traz: o app entrega demanda, e é
   por isso que cobra. Venda direta cresce com base de cliente e recompra, não com um
   cartaz de 5% de desconto
4. **O que pode entrar em promoção.** O desconto máximo por item antes de o lucro zerar.
   É o único jeito honesto de aceitar campanha da plataforma: sabendo o teto antes

O que a margem não decide é **volume**. Item com 6% de lucro que vende 200 por semana
paga mais conta que um de 30% que vende 5, e costuma ser o que sustenta a posição no
ranking. Antes de sugerir tirar item do cardápio, cruzar com a venda por item, por
comando. O laudo já tem a coluna quando a spec traz `vendas`.

### Passo 7 — Item muito visto e pouco vendido

Passo curto, e vem antes de qualquer desconto. Se o relatório do app mostra item com
muita visita e pouca venda, o reflexo do dono é baixar o preço, e quase sempre o problema
é a foto ou a descrição. Três perguntas por item nessa situação:

1. "A foto é do prato como ele sai da sua cozinha, ou é foto de banco de imagem?"
2. "A descrição diz o que vem no prato, o tamanho e pra quantas pessoas serve?"
3. "Quanto tempo faz que esse item está com essa foto?"

O conserto é trocar a foto, reescrever a descrição em uma linha concreta (o que vem, o
peso ou o tamanho, e uma diferença), esperar duas semanas e olhar o número de novo. O
atendimento da própria plataforma costuma fazer essa reescrita de graça, e vale pedir
antes de gastar margem. Só depois disso, com número novo na mão, o desconto entra na
conversa, e aí com o teto do Passo 6 item 4.

### Passo 8 — Quando a taxa muda

É o uso que se repete, e é rápido:

```bash
node scripts/delivery.js cardapio/delivery.json --simular "iFood Entrega:comissao_pct=27"
node scripts/delivery.js cardapio/delivery.json --simular "iFood Entrega:cupom_pct=15" --simular "iFood Básico:mensalidade=0"
```

A simulação não altera a spec nem a planilha. Ela grava um arquivo por cenário,
`cardapio/simulacao-delivery-<data>-<canal>-<campo>.md`, com o efeito por item (lucro
antes, lucro depois, diferença, mudança de situação) e diz quem passa a dar prejuízo.
Dois cenários rodados no mesmo dia geram dois arquivos, então dá pra comparar plano A
com plano B lado a lado. A resposta ao usuário é uma frase por item afetado, começando
pelo que virou prejuízo.

Campos simuláveis: `comissao_pct`, `taxa_pagamento_pct`, `cupom_pct`, `cupom_valor`,
`mensalidade`, `entrega_loja`, `embalagem_extra`, `pedidos_mes`. O valor vem em três
formas: o número novo (`=27`), a soma ou subtração na unidade do campo (`=+4` sobe quatro
pontos percentuais numa comissão, ou quatro reais numa mensalidade) e, nos campos em
reais, a variação relativa (`=+10%` encarece a entrega em um décimo, `=-10%` baixa).

Se a taxa nova é definitiva, editar a spec com o valor e a data de conferência, e rodar
sem `--simular`: o laudo e a planilha são regerados. A spec é a fonte da verdade; os dois
arquivos são derivados.

### Passo 9 — Conferir e fechar

Antes de mostrar o arquivo:

```bash
node scripts/verificar.js tabela cardapio/delivery-<AAAA-MM>.md
node scripts/verificar.js texto cardapio/delivery-<AAAA-MM>.md
```

O `tabela` soma cada coluna e compara com o total declarado. Se divergir, o erro está na
spec (preço ou quantidade digitada errado), não no script: voltar ao dado bruto, nunca
ajustar o número pra bater.

Fechar com três coisas: perguntar uma vez se vale registrar o preço novo em
`_memoria/oferta.md`; oferecer o `/rotina` pra uma volta mensal aos números, porque taxa
de plataforma muda sem avisar e mensalidade rateada muda quando o giro cai; e, se algum
canal tem isenção por tempo, anotar a data em que ela vence.

---

## Regras

- **Nenhuma taxa é fixa nesta skill.** Comissão, taxa de pagamento, mensalidade e entrega são entrada do usuário, tiradas do contrato e do extrato dele. As faixas de cada plataforma em `templates/financeiro/delivery.md` têm fonte e data, e servem pra checar se o número informado é plausível, nunca pra substituí-lo. Plataforma muda preço; a conta não muda
- **Toda conta é do script.** Repasse, lucro real, preço da meta, preço de empate e desconto máximo saem de `scripts/delivery.js` ou das funções que ele exporta. Número mostrado na conversa que não está no laudo ou no terminal não existe
- **Custo por porção vem do `/ficha-tecnica`.** Sem ficha, o custo entra como estimativa e o laudo diz isso. Não inventar "o custo do prato é 30% do preço"
- **Embalagem de entrega entra por item, e é separada da embalagem do produto.** Perguntar "o que vai junto no pedido do app que não vai no balcão?" em toda rodada
- Entrega e mensalidade são do pedido e do mês, não do item. A entrega se rateia por `itens_por_pedido`; a mensalidade, pelos itens vendidos no mês. Ratear entrega por item faz a bebida parecer prejuízo e inverte a decisão
- **Cupom entra pelo pedaço que a loja bancou.** O desconto que o cliente vê na tela não é o número da conta. Quando a plataforma banca uma parte, só a outra entra
- **A base da comissão se confere num pedido real.** Comissão sobre o preço cheio e sobre o preço com desconto dão contas diferentes, e é o extrato de um pedido com cupom que diz qual é a sua. Não assumir
- **Despesas e lucro são dois números, não um.** Separados, dá pra dizer se o item paga a conta e não dá lucro, ou se dá prejuízo antes da conta. O preço da meta é sempre pelo divisor, custo ÷ (coeficiente do repasse − despesas − lucro), nunca custo × (1 + margem)
- **Quando não existe preço que salve, dizer isso.** Se a fatia do preço que chega na loja é menor que o percentual de despesas, nenhum reajuste resolve naquele canal, e a decisão é sair. O script devolve "impossível" em vez de um número bonito
- **Preço diferente por canal é permitido.** O TCC que o CADE celebrou com o iFood em 08/02/2023, vigente por 54 meses, veda cláusula de paridade de preço entre marketplaces (fonte no molde, conferida em 23/09/2026). Cláusula de contrato específico se lê no contrato específico, e revisão de cláusula é `/revisar-contrato`. **Isto não substitui advogado**
- Reajuste vai em passo, não de uma vez: o aplicativo põe o concorrente lado a lado na mesma tela. Subir o preço inteiro num mês e não medir a venda depois é trocar margem por pedido sem saber o câmbio
- **Antes de mexer em preço de item muito visto e pouco vendido, mexer na foto e na descrição.** O problema costuma ser apresentação, e o atendimento da própria plataforma faz essa reescrita de graça. Desconto em item bem visto é margem doada
- Volume decide o que a margem não decide, então cruzar com a venda por item antes de sugerir tirar algo do cardápio. Margem baixa com giro alto sustenta a casa e o ranking
- **Quando o resultado for ruim, dizer o resultado.** O prato mais vendido dá prejuízo no canal principal: escrever isso com o número e as saídas, sem suavizar. É a informação mais valiosa que o laudo entrega
- **Dado do negócio não sai do workspace.** Extrato, preço de compra, margem e relatório do portal ficam em `cardapio/`. Não vão pra busca na web nem pra ferramenta externa. Se o export do app traz nome, telefone ou endereço de cliente, isso não entra na spec: a conta é por item, e dado pessoal de terceiro guardado sem necessidade é exposição à toa (LGPD). Apagar as colunas antes de salvar
- **Fronteira com as vizinhas:** o `/ficha-tecnica` é o custo do prato, e é a entrada desta skill; o `/produto` é a página de cardápio no site próprio, pro cliente ver; o `/preco` é preço de serviço e a conversa de reajuste; o `/caixa` é o mês fechado do negócio, e é de lá que vêm as despesas rateadas; o `/combos` é margem cruzada de promoção e combo; o `/marketplace` é venda de produto físico em marketplace, com frete e devolução; o `/estoque` é quanto comprar e quando; o `/conciliar` é bater o repasse que caiu na conta com o que a plataforma disse que ia pagar; o `/posts-perfil-google` e o `/whatsapp` são os canais de trazer o cliente pra venda direta; o `/projecao` leva a margem nova pros próximos meses
- **Não é consultoria contábil.** Imposto sobre a venda entra em despesas como o percentual que o contador informou. Regime tributário, nota fiscal de pedido por aplicativo e retenção são conversa com ele, e o calendário de obrigação é `/obrigacoes`
