---
name: ficha-tecnica
description: >
  Monta a ficha técnica de cada receita ou produto a partir dos insumos (quantidade, unidade,
  fator de correção) e do preço de compra: custo por porção com embalagem e perda, CMV, preço
  pela fórmula custo ÷ (1 − despesas − lucro) e o ranking do cardápio, do que dá lucro ao que
  dá prejuízo. Sai em planilha com fórmula viva e recalcula o cardápio inteiro quando um
  insumo sobe. Toda conta é feita por script, nunca de cabeça.
  Use quando o usuário disser "quanto custa meu bolo", "quanto cobrar pela marmita", "ficha
  técnica", "o ovo subiu, e agora", "qual produto dá mais lucro", "meu cardápio tá dando
  prejuízo", "quanto custa uma fatia", "quanto custa fazer o brigadeiro", "preciso reajustar o
  cardápio", "custo por porção", ou /ficha-tecnica.
---

# /ficha-tecnica — Quanto custa cada porção

> **Convenção de pastas:** a saída vai em `precos/` (a spec `ficha-tecnica.json`, a planilha `ficha-tecnica.xlsx` e o ranking `cardapio-margem.md`). Na convenção **por cliente**, `clientes/<Nome>/precos/` quando o cardápio é de um cliente; o da própria casa fica na raiz. A pasta nasce na primeira ficha.

Quem produz comida sabe o preço do quilo da farinha e não sabe o custo da fatia. A conta
tem cinco passos que ninguém faz de cabeça: converter a unidade, descontar a casca, dividir
pelo rendimento medido, somar a caixinha e separar despesa de lucro. Errar um deles é
vender abaixo do custo sem perceber, e é isso que a padaria, a confeitaria e a marmitaria
descobrem quando o ovo sobe 40% e o brigadeiro continua a R$ 2,50.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que produz, onde compra, se tem funcionário na produção, se vende por aplicativo
- **Oferta e preço praticado:** `_memoria/oferta.md`, se existir; o preço atual de cada item pode vir de lá
- **Despesas do mês:** o fechamento do `/caixa` em `financeiro/fechamento-<AAAA-MM>.md`, se existir — é de lá que sai o percentual de despesas rateadas
- **Custo da hora de produção:** `/custo-de-funcionario`, quando há gente contratada na cozinha
- **Molde:** `templates/financeiro/ficha-tecnica.md` — método, spec campo a campo, tabela de fator de correção com fonte, referências de CMV, erros comuns, léxico
- **Script:** `scripts/ficha-tecnica.js` — valida unidade e FC, calcula, gera a planilha (via `scripts/gerar-planilha.js`) e o ranking; `--simular` roda o cardápio com insumo no preço novo
- **Conferência:** `node scripts/verificar.js tabela` e `texto` no markdown de saída
- **Saída:** `precos/ficha-tecnica.json` (a spec, fonte da verdade), `precos/ficha-tecnica.xlsx`, `precos/cardapio-margem.md` e, nas simulações, `precos/simulacao-<AAAA-MM-DD>-<insumos>.md`

---

## Workflow

### Passo 1 — Descobrir o que vai ser custeado

Se `_memoria/empresa.md` já diz o que o negócio produz, não perguntar de novo. Se não diz,
uma pergunta por vez:

1. "Quais itens você quer custear agora?" Começar por até cinco: os que mais vendem ou o que
   está em dúvida. Cardápio de 40 itens entra depois, com a base pronta
2. "Você já tem as receitas anotadas com quantidade, ou vai me passar de cabeça?" Foto do
   caderno, PDF ou planilha em `dados/` servem: o assistente lê direto e transcreve
3. "Alguém é pago pra produzir, ou é você?" Decide se mão de obra entra na ficha ou já está
   nas despesas
4. "Vende por aplicativo de entrega?" Se sim, a comissão vira despesa própria do item, ou o
   preço do aplicativo fica com o `/delivery`

Se já existe `precos/ficha-tecnica.json`, o trabalho é editar a spec (insumo novo, receita
nova, preço que mudou), não começar do zero. Ler a spec antes de perguntar qualquer coisa.

### Passo 2 — Montar a lista de insumos

Cada insumo entra como se compra, não como se usa: "farinha, saco de 5 kg, R$ 22,90 no
atacado, dia 15/09". Pedir em uma mensagem só, uma linha por insumo, e transcrever pra
spec. Três conferências por linha:

- **Unidade da compra** em kg, g, L, ml, un, dz ou cento. "Um pacote" não é unidade: perguntar
  quanto pesa o pacote
- **Fator de correção** pra tudo que perde casca, osso, semente ou talo na cozinha. A tabela
  do molde dá o ponto de partida (cenoura 1,21 a 1,25; frango inteiro 2,05 a 2,38; ovo com
  casca 1,12 a 1,15). Se o usuário já pesou o dele, o dele vale mais. Insumo que chega limpo
  ou industrializado fica em 1
- **Embalagem** é insumo com `"tipo": "embalagem"`: caixa, forminha, marmita, saco, etiqueta.
  Perguntar explicitamente: "no que isso vai pro cliente?" É a linha que mais falta

Preço com `fonte` e `data` em cada linha (`15/09/2026` ou `2026-09-15`). O script avisa o
insumo sem data e o que passou de 60 dias, e o aviso vai pra conversa: preço de abril
decide reajuste errado em setembro.

### Passo 3 — Montar cada receita

Por receita, quatro coisas, na palavra do usuário:

1. **Ingredientes** com quantidade e unidade, em peso limpo (o que vai na tigela). Se a
   quantidade já é bruta, marcar `"bruto": true` na linha: "1 kg de frango com osso" e
   também "3 ovos", porque contar três ovos já é contar o que se compra. O FC do insumo
   fica pra quando a receita pede peso limpo ("150 g de ovo")
2. **Rendimento medido**: quantas fatias, marmitas ou unidades o lote dá **de verdade**. Se
   ele diz "umas 12", pedir pra contar no próximo lote e anotar `[a confirmar]` no
   nome da receita até lá
3. **Perda** do produto pronto, em % do lote: sobra de vitrine, massa que gruda, brigadeiro
   que quebra. Zero é aceitável; acima de 50% o script recusa
4. **Preço atual** de venda. Sem ele há preço sugerido, mas não há situação

Mão de obra só quando há gente paga na produção: `{ "minutos": 40, "custo_hora": 20 }` pro
lote. Se o dono produz sozinho, a hora dele já está nas despesas via retirada, e entrar aqui
de novo dobra o custo.

### Passo 4 — Definir despesas e lucro

São dois percentuais sobre o preço, e vêm de lugares diferentes:

- **Despesas rateadas** = (custos fixos + variáveis que não são insumo) ÷ faturamento do mês.
  Se existe fechamento do `/caixa`, calcular por comando a partir dele. Se não existe,
  perguntar os dois números e somar por comando, deixando registrado que é estimativa até
  o primeiro fechamento
- **Lucro alvo** é decisão do dono: "quanto você quer que sobre de cada venda?" Se ele não
  sabe, mostrar o que 15%, 20% e 30% fazem com o preço do item mais vendido e deixar ele
  escolher

A soma tem de ficar abaixo de 100%. Despesas de 60% com lucro de 40% não é ambição, é
divisão por zero: o script para e diz isso.

### Passo 5 — Rodar e ler

```bash
node scripts/ficha-tecnica.js precos/ficha-tecnica.json
```

O script valida antes de calcular: unidade que não existe, receita em grama com insumo
comprado em litro sem densidade, FC abaixo de 1 ou acima de 10, insumo que não está na
lista, insumo ou receita repetidos, perda acima de 50%, data de preço que não existe,
porcentagem escrita como `1` (é 1% ou 100%?) e despesas mais lucro em 100%. Cada erro para
o cálculo e diz o que corrigir na spec. Corrigir a spec e rodar de novo; nunca contornar
editando o resultado.

Quando roda, ele grava `precos/cardapio-margem.md` e `precos/ficha-tecnica.xlsx`, e confere
que o custo por porção da planilha bate com o do script em cada receita. O resumo no
terminal mostra, por item: custo por porção, preço sugerido, preço atual, CMV, lucro real e
situação. É esse resumo que vai pra conversa, na ordem do ranking.

Esqueleto do `cardapio-margem.md`:

```markdown
# Cardápio e margem — <negócio>

## O cardápio em uma frase
De N itens com preço, X batem a meta de lucro, Y ficam abaixo e Z dão prejuízo.

## Ranking
| Item | Custo/porção | Preço atual | CMV | Lucro real | Preço sugerido | Situação |
|---|---|---|---|---|---|---|

## O que não dá lucro
- **<item>** — custa R$ X a porção e vende a R$ Y. [prejuízo ou abaixo da meta, com o
  número]. Pra bater a meta: R$ Z, ou cortar R$ W de custo por porção

## Ficha de cada item
### <item>
Rende N porções. Perda de P% no lote.
| Insumo | Qtd na receita | Qtd comprada (com FC) | Custo |
Lote com perda: R$ … Por porção: R$ … + embalagem + mão de obra = R$ …

## Preço de compra usado
- **<insumo>** — <qtd> <unidade> por R$ X, ou R$ Y o quilo. Preço de <data>, <fonte>

## O que conferir
- [avisos do script: FC 1 em hortaliça, receita sem preço, receita sem embalagem]

## Como refazer
```

A planilha tem quatro abas: **Insumos** (compra, FC, fonte e data do preço, é onde o
usuário mexe), **Receitas** (uma linha por ingrediente, com a coluna "Qtd já é peso bruto"
e o custo por PROCV), **Cardápio** (a conta inteira por item, com situação por fórmula) e
**Como usar**. Quem troca o preço do ovo na aba Insumos vê o cardápio recalcular sem abrir
o terminal. O script confere célula por célula se a planilha chegou ao mesmo custo por
porção e à mesma situação que ele; divergência aparece no resumo e não se ignora.

### Passo 6 — Entregar a decisão, não só a tabela

O ranking sozinho não decide nada. A entrega tem três partes, curtas:

1. **O item que mais surpreende**, com o número: "o bolo de cenoura, que é o mais vendido,
   custa R$ 4,67 a fatia e vende a R$ 8,00: sobra R$ 0,93 depois das despesas, 12% em vez
   dos 20% que você quer"
2. **Pra cada item abaixo da meta, as duas saídas** que o script já calculou: o preço que
   bate a meta, ou o corte de custo por porção que faz o preço atual bater. Corte de custo
   quase sempre é embalagem mais barata, porção padronizada ou fornecedor; nunca é
   "usar menos ovo"
3. **O que a ficha não sabe**: volume. Um item com 8% de lucro que vende 200 por dia pode
   pagar mais conta que um de 40% que vende 5. Se o usuário tem a venda por item (`/caixa`
   ou o sistema do balcão), cruzar por comando antes de sugerir tirar algo do cardápio

Reajuste de preço é conversa do `/preco` (como subir sem perder cliente, faixa, pacote);
esta skill entrega o piso e a situação. Combo e promoção com margem cruzada é `/combos`.

### Passo 7 — Quando um insumo sobe

É o uso que se repete toda semana, e é rápido:

```bash
node scripts/ficha-tecnica.js precos/ficha-tecnica.json --simular "Ovo=+40%"
node scripts/ficha-tecnica.js precos/ficha-tecnica.json --simular "Farinha de trigo=27,90" --simular "Óleo=+12%"
```

A simulação não altera a spec nem a planilha. Ela grava
`precos/simulacao-<AAAA-MM-DD>-<insumos>.md` com o efeito em cada item (custo antes e depois, lucro real antes e depois, preço sugerido) e
diz quem muda de situação. A resposta ao usuário é uma frase por item afetado, começando
pelo que virou prejuízo.

Se a alta é definitiva, editar o preço e a data do insumo na spec e rodar sem `--simular`:
a planilha e o ranking são regenerados. A spec é a fonte da verdade; a planilha é derivada.

### Passo 8 — Conferir e fechar

Antes de mostrar o arquivo:

```bash
node scripts/verificar.js tabela precos/cardapio-margem.md
node scripts/verificar.js texto precos/cardapio-margem.md
```

A linha "Total dos ingredientes" de cada ficha é somada pelo `tabela` e comparada com os
itens. O script escreve as duas coisas a partir da mesma conta, então divergência aqui
quer dizer que alguém editou o markdown na mão. Nesse caso, gerar de novo a partir da
spec, nunca ajustar o total pra bater. Vale a mesma conferência no arquivo de simulação.

Fechar perguntando uma vez se o preço atual de algum item mudou depois disso, pra
atualizar `_memoria/oferta.md`, e se vale agendar no `/rotina` uma volta mensal aos preços
de compra. Ficha técnica com preço de seis meses atrás decide errado com confiança.

---

## Regras

- **Toda conta é do script.** Custo por porção, preço sugerido, CMV e lucro real saem de `scripts/ficha-tecnica.js` ou das funções que ele exporta. Número mostrado na conversa que não está no `cardapio-margem.md` ou no terminal não existe
- **Unidade nas duas pontas, sempre.** Compra em kg, receita em g: o script converte. Compra em "pacote" não passa: perguntar o peso. Família diferente (g com L, un com kg) só com `densidade` ou `peso_un` declarados
- **Quantidade da receita é peso limpo, e o FC faz o resto.** Se o usuário passa peso bruto, marcar `bruto: true`. Nunca aplicar FC duas vezes (na quantidade e no insumo)
- **FC vem da cozinha dele antes de vir do molde.** A tabela em `templates/financeiro/ficha-tecnica.md` é ponto de partida com fonte e data; se ele pesou, o número dele vale. FC abaixo de 1 é erro de conceito e o script recusa
- **Rendimento é medido, não estimado.** "Umas 12" vira `[a confirmar]` no nome da receita até ele contar um lote. Errar o rendimento em duas fatias erra o custo em 20%
- **Embalagem entra por porção.** Perguntar "no que vai pro cliente?" em toda receita. O script avisa quando a receita não tem embalagem, e o aviso vai pra conversa
- **Despesas e lucro são dois números, não um.** Separados, dá pra dizer se o item paga a conta e não dá lucro, ou se dá prejuízo antes da conta. Preço é sempre pelo divisor, custo ÷ (1 − despesas − lucro), nunca custo × (1 + margem)
- **Despesas rateadas vêm do `/caixa`.** Sem fechamento, o percentual entra como estimativa e a entrega diz isso. Não inventar "30% é o padrão do setor"
- **Não dobrar a mão de obra.** Dono que produz sozinho já está nas despesas via retirada. Mão de obra na ficha é só pra gente paga na produção, e o custo da hora vem do `/custo-de-funcionario`
- **Referência de CMV é contexto, não meta.** Os 28% a 35% do restaurante à la carte (fonte e data no molde) não servem pra brigadeiro nem pra marmita. A meta é o lucro alvo do dono; o CMV é leitura
- **Volume decide o que a ficha não decide.** Antes de sugerir tirar item do cardápio, cruzar com a venda por item. Item de margem baixa e giro alto sustenta a casa
- **Fronteira com as vizinhas:** o `/preco` é preço de serviço e a conversa de reajuste; o `/caixa` é o mês fechado, e é de lá que vêm as despesas rateadas; o `/delivery` é a margem dentro do aplicativo, com a comissão; o `/combos` é a margem cruzada de promoção; o `/estoque` é quanto comprar e quando; o `/planilha` é planilha genérica (esta usa o gerador dele, com a conta pronta); o `/produto` é a página do cardápio pro cliente ver, e o preço que vai nela sai daqui; o `/projecao` leva o custo novo pros próximos meses
- **A spec é a fonte da verdade.** Planilha e markdown são regenerados a cada rodada. Se o usuário editou a planilha na mão, ler com `node scripts/gerar-planilha.js --ler precos/ficha-tecnica.xlsx`, levar a mudança pra spec e gerar de novo; não sobrescrever sem avisar
- **Preço de compra tem fonte e data.** O script avisa a linha sem data e a que passou de 60 dias, e os dois avisos vão pra conversa. Preço velho não impede a conta; impede a decisão de reajuste sem uma volta ao fornecedor
- **Dado do negócio não sai do workspace.** Receita, fornecedor, preço de compra e margem ficam em `precos/`. Não vão pra WebSearch nem pra ferramenta externa. A busca, quando houver, pergunta "fator de correção da cenoura", nunca "receita do bolo da confeitaria tal"
- **LGPD:** a ficha não precisa de nome de pessoa. Mão de obra entra como minutos e custo da hora; quem produz, quanto ganha e o CPF do fornecedor ficam fora do arquivo. Se o usuário mandar uma nota fiscal pra ler o preço, transcrever o preço e o dia, não o CPF nem o endereço
- **Quando o resultado for ruim, dizer o resultado.** O item mais vendido dá prejuízo: escrever isso com o número e as duas saídas, sem suavizar. É a informação mais valiosa que a ficha entrega
- **Não é consultoria contábil nem nutricional.** Imposto sobre a venda entra em despesas como percentual que o contador informou; rotulagem, alergênico e informação nutricional são outra conversa, com nutricionista e a regulação da Anvisa
