# Ficha técnica e custo por porção

Referência do `/ficha-tecnica`. O método de custear uma receita a partir do insumo, a
spec que o `scripts/ficha-tecnica.js` lê, a tabela de fator de correção com fonte, as
referências de CMV e os erros que a padaria, a confeitaria e a marmitaria cometem toda
semana. Aqui não há workflow: ele está na skill.

> **A fronteira desta pasta.** `templates/financeiro/` é o dinheiro do próprio negócio.
> Este arquivo é o custo do que sai da cozinha ou da bancada; o mês fechado é
> `/caixa`, o preço de serviço é `/preco`, a taxa do aplicativo é `/delivery`.

---

## 1. O que a ficha técnica responde

Uma ficha técnica é a receita com preço em cada linha. Ela responde três perguntas que
ninguém consegue responder de cabeça: quanto custa **uma** porção (não o lote), quanto
sobra dela no preço de hoje, e o que acontece com o cardápio inteiro quando o ovo sobe.

A conta anda nesta ordem, e o script faz exatamente isso:

```
custo do insumo por unidade base  = preço da compra ÷ (qtd comprada × fator da unidade)
custo do ingrediente na receita   = qtd na receita × FC × custo por unidade base
custo do lote                     = soma dos ingredientes ÷ (1 − perda%)
custo por porção                  = custo do lote ÷ rendimento + embalagem + mão de obra
preço sugerido                    = custo por porção ÷ (1 − despesas% − lucro%)
CMV                               = custo por porção ÷ preço de venda
lucro real                        = preço − custo por porção − despesas% × preço
```

A fórmula do preço é a do divisor, a mesma que a Aliança Empreendedora ensina: "Preço de
Venda = Custo da Porção ÷ (1 − Percentual de Despesas e Lucro Desejado)". O exemplo de lá
é um sanduíche natural de frango com custo de R$ 7,85 por porção, 30% de despesas fixas
mais 20% de lucro, que dá R$ 7,85 ÷ 0,50 = R$ 15,70 de preço
(tamojunto.aliancaempreendedora.org.br/artigos/precificacao/ficha-tecnica-de-alimentos,
conferido em 23/09/2026). Separar despesas de lucro, em vez de somar os dois num número
só, é o que permite dizer "esse bolo paga a conta mas não dá lucro".

**Por que dividir e não multiplicar.** "Custo mais 50%" dá R$ 7,05 sobre R$ 4,70; custo ÷
(1 − 50%) dá R$ 9,40. A primeira conta deixa 25% de margem sobre o preço, não 50%. Quem
faz markup por multiplicação acha que tem o dobro da margem que tem.

---

## 2. Unidade base e fator de correção

**Unidade base.** Tudo é convertido pra grama, mililitro ou unidade antes de multiplicar:
kg = 1000 g, L = 1000 ml, dz = 12 un, cento = 100 un. O script recusa misturar família
(receita em g com insumo comprado em L) a não ser que o insumo declare a ponte:
`densidade` (g por ml, aproximada: óleo 0,92, leite 1,03, mel 1,42) ou `peso_un`
(g por unidade, pra ovo 50, pão francês 50, limão 100). Sem a ponte, o erro para o
cálculo em vez de sair mil vezes errado.

**Fator de correção (FC).** Peso bruto ÷ peso limpo. Cenoura descascada perde cerca de
20%: FC 1,25, você paga 125 g pra usar 100 g. A quantidade da receita é sempre o peso
**limpo** (o que vai na tigela); o script multiplica pelo FC pra achar o que foi comprado.
Se a receita já está em peso bruto, marcar `"bruto": true` no ingrediente e o FC não entra.
São dois casos, e o segundo é o que mais escapa: "1 kg de frango com osso", que é peso
bruto declarado, e "3 ovos", porque contar unidades já é contar o que se compra. Ovo com
FC 1,13 numa linha de três unidades faz a receita pagar 3,39 ovos, e o custo da fatia sai
alto sem motivo. O FC do ovo existe pra quando a receita pede peso limpo, "150 g de ovo".

Valores de referência abaixo. A fonte é a relação compilada pela Profª. Mônica de Caldas
Rosa dos Anjos (Nutrição, UFPR), em docs.ufpr.br/~monica.anjos/Fatores.pdf, conferida em
23/09/2026. Ela traz até três FC por alimento, um por referência consultada, e a tabela
daqui mostra a primeira delas: a faixa é a variação dentro dessa referência.

A divergência entre referências pode ser grande, e é o melhor argumento pra pesar em casa.
Cebola aparece em 1,10 a 1,14 na primeira e em 1,03 a 2,44 na segunda; couve manteiga vai
de 1,39 a 2,22 quando se olham as três. **O número certo é o da própria cozinha**: pesar
antes e depois de limpar três vezes e dividir. A tabela serve pra começar, não pra ficar.

| Insumo | FC | Insumo | FC |
|---|---|---|---|
| Farinha, açúcar, leite, óleo, ovo pasteurizado, enlatado | 1,00 | Ovo de galinha (com casca) | 1,12 a 1,15 |
| Cenoura | 1,21 a 1,25 | Batata inglesa | 1,21 a 1,22 |
| Cebola | 1,10 a 1,14 | Alho | 1,30 |
| Tomate | 1,25 | Pimentão | 1,26 |
| Abóbora | 1,15 a 1,64 | Repolho | 1,35 a 1,72 |
| Couve manteiga | 1,39 a 1,42 | Alface lisa | 1,09 a 1,33 |
| Banana prata | 1,61 a 1,84 | Banana nanica | 1,72 a 1,93 |
| Laranja | 1,39 a 2,13 | Limão taiti | 1,19 a 1,23 |
| Abacaxi | 1,41 a 1,50 | Manga haden | 1,26 a 1,37 |
| Morango | 1,02 a 1,20 | Melancia | 1,60 a 1,71 |
| Frango (inteiro, na fonte) | 2,05 a 2,38 | Peito de frango (com osso e pele) | 2,17 |
| Coxa de frango | 1,50 | Sobrecoxa de frango | 1,31 |
| Alcatra | 1,12 a 1,20 | Coxão mole | 1,10 a 1,13 |
| Patinho | 1,10 a 1,13 | Filé mignon | 1,01 a 1,20 |
| Salmão | 2,17 | Camarão com casca | 4,10 |

Peito de frango já limpo, sem osso e sem pele, comprado assim, é FC 1,00: o fator só
existe quando a limpeza acontece na sua cozinha. Se o açougue já limpou, o preço do quilo
já embute a perda.

**Índice de cocção** é outra coisa: quanto o alimento pesa depois de cozido em relação ao
cru (arroz polido 2,33; arroz integral 2,46; feijão carioca 1,89; feijão branco 2,16; carne
bovina 0,65 a 0,90; carne de ave 0,61, mesma fonte). O script não usa esse índice: o rendimento da receita é medido
pesando ou contando o lote pronto, o que já embute a cocção. Ele entra na tabela só pra
explicar por que 1 kg de arroz cru vira 2,3 kg de arroz cozido.

---

## 3. A spec campo a campo

```json
{
  "negocio": "Confeitaria da Lu",
  "despesas_pct": 30,
  "lucro_pct": 20,
  "insumos": [
    { "nome": "Farinha de trigo", "compra": { "qtd": 5, "unidade": "kg", "preco": 22.90 }, "fc": 1,
      "fonte": "nota do atacado", "data": "15/09/2026" },
    { "nome": "Ovo", "compra": { "qtd": 30, "unidade": "un", "preco": 24.00 }, "fc": 1.13, "peso_un": 50,
      "fonte": "nota do atacado", "data": "15/09/2026" },
    { "nome": "Óleo", "compra": { "qtd": 900, "unidade": "ml", "preco": 7.49 }, "densidade": 0.92,
      "fonte": "mercado", "data": "15/09/2026" },
    { "nome": "Caixa de bolo", "tipo": "embalagem", "compra": { "qtd": 50, "unidade": "un", "preco": 95.00 },
      "fonte": "loja de embalagem", "data": "10/09/2026" }
  ],
  "receitas": [
    {
      "nome": "Bolo de cenoura com cobertura",
      "rendimento": { "qtd": 12, "unidade": "fatia" },
      "perda_pct": 5,
      "preco_atual": 8.00,
      "mao_de_obra": { "minutos": 40, "custo_hora": 20 },
      "ingredientes": [
        { "insumo": "Farinha de trigo", "qtd": 300, "unidade": "g" },
        { "insumo": "Ovo", "qtd": 3, "unidade": "un", "bruto": true }
      ],
      "embalagem": [ { "insumo": "Caixa de bolo", "qtd": 1, "unidade": "un" } ]
    }
  ]
}
```

| Campo | O que é | Regra |
|---|---|---|
| `despesas_pct` | custos fixos e variáveis rateados sobre o faturamento (aluguel, gás, luz, taxa de cartão, imposto) | sai do `/caixa`: (custos fixos + variáveis que não são insumo) ÷ faturamento do mês. Aceita `30`, `"30%"` ou `0.30`; `1` sozinho é recusado, porque não se sabe se é 1% ou 100% |
| `lucro_pct` | o que o dono quer que sobre de cada venda, em % do preço | com `despesas_pct`, a soma tem de ficar abaixo de 100% |
| `insumos[].compra` | como se compra: quantidade, unidade e preço pago | preço maior que zero; unidade em kg, g, mg, L, ml, un, dz ou cento |
| `insumos[].fc` | fator de correção | de 1 a 10; ausente é 1 |
| `insumos[].tipo` | `ingrediente` (padrão) ou `embalagem` | embalagem só entra na lista `embalagem` da receita, por porção |
| `insumos[].densidade`, `peso_un` | ponte entre famílias de unidade | só quando a receita usa unidade de outra família |
| `insumos[].fonte`, `data` | de onde veio o preço e o dia em que foi pago ou consultado | `DD/MM/AAAA` ou `AAAA-MM-DD`. Linha sem data vira aviso; passando de 60 dias, vira aviso de conferir no fornecedor |
| `receitas[].rendimento` | quantas porções o lote dá | número, ou `{ "qtd", "unidade" }` pra dar nome à porção (fatia, marmita, un) |
| `receitas[].perda_pct` | o que estraga, sobra ou quebra, em % do lote | de 0 a 50; acima disso é dado errado |
| `receitas[].preco_atual` | o preço que está na vitrine hoje | opcional; sem ele há preço sugerido, mas não há situação |
| `receitas[].mao_de_obra` | R$ por porção, ou `{ "minutos", "custo_hora" }` pro lote | opcional; o custo da hora vem do `/caixa` ou do `/custo-de-funcionario` |
| `receitas[].ingredientes[].bruto` | `true` quando a quantidade já é o que se compra | o FC não é aplicado nessa linha. Vale pra peso bruto ("1 kg de frango com osso") e pra unidade contada ("3 ovos") |
| `despesas_pct`, `lucro_pct` na receita | sobrescrevem o global | pra item de vitrine com taxa de cartão diferente, por exemplo |

---

## 4. CMV: o que é e as referências

CMV é custo da mercadoria vendida: o custo dos insumos dividido pela receita, em
porcentagem. Por item, é custo da porção ÷ preço. Por mês, é o que saiu do estoque ÷ o que
entrou no caixa, e é essa segunda versão que o `/caixa` mede. Quando as duas divergem
muito, o problema está entre a ficha e o balcão: porção maior que a ficha, desperdício
não contado, roubo ou preço de compra que subiu sem ninguém atualizar a spec.

Referências públicas, cada uma com o contexto em que vale:

| Referência | Valor | Fonte e data |
|---|---|---|
| CMV alvo, restaurante à la carte | 28% a 35% do preço, com margem bruta de 60% a 65% | custoporprato.com.br/precificacao/restaurante, conferido em 23/09/2026 |
| Exemplo de precificação do mesmo guia | prato com CMV R$ 26 + mão de obra R$ 14 + embalagem = custo R$ 42; margem 62%: R$ 42 ÷ 0,38 = R$ 110,52 | mesma página |
| CMV "ideal" atribuído ao Sebrae | 30% a 40% | citado em blogs do setor (harald.com.br/blog/como-calcular-o-cmv-2/), sem a página original do Sebrae localizada: [a confirmar] |

O número que importa é o do negócio: um item com CMV de 45% pode ser o que mais paga
conta se vende dez vezes mais que o de 20%. Por isso o ranking do script mostra lucro real
em reais e em porcentagem, e a decisão considera o volume, que a ficha não sabe.

---

## 5. Perda, embalagem e mão de obra

**Perda** é o que se compra e não se vende: o pão que sobra na vitrine, a massa que gruda
na forma, o brigadeiro que quebra ao enrolar. Entra como % do lote e o script divide o
custo dos ingredientes por (1 − perda). Não confundir com o FC: o FC é perda no
pré-preparo de um insumo (casca, osso); a perda é do produto pronto. Uma padaria com 8%
de sobra de vitrine tem `perda_pct: 8` no pão, não FC na farinha.

**Embalagem** entra por porção, nunca por lote: a caixinha do bolo, a forminha do
brigadeiro, a marmita, o saco, a etiqueta, o guardanapo, o palito. Quando a embalagem vem
em cento ou milheiro, a compra é `{ "qtd": 1, "unidade": "cento", "preco": 68 }` e a receita
usa `1 un`. É a linha que mais some das planilhas caseiras: R$ 0,68 de marmita em 300
marmitas por mês são R$ 204 que ninguém viu sair.

**Mão de obra** é opcional e só entra quando o dono paga alguém pra produzir. Se ele
mesmo produz, o custo da hora dele já está em `despesas_pct` via retirada (`/caixa`), e
contar de novo aqui dobra o número. Quando entra, `{ "minutos": 40, "custo_hora": 20 }`
descreve o lote; o script divide pelo rendimento.

---

## 6. Os erros que mais aparecem

1. **Preço do quilo na quantidade em grama.** 300 g de farinha custam R$ 1,37, não
   R$ 22,90. O script converte, mas a spec precisa dizer a unidade nas duas pontas
2. **FC ignorado em hortaliça, fruta e carne com osso.** Cenoura, banana, frango: sem
   FC, o custo sai 20% a 50% abaixo do real. O script avisa quando vê esses nomes com FC 1
3. **Rendimento chutado.** "Dá umas 12 fatias" vira 10 no balcão, e o custo da fatia sobe
   20%. Rendimento se mede pesando ou contando o lote pronto três vezes
4. **Embalagem fora da conta.** Ver a seção 5
5. **Despesas somadas ao lucro num número só.** Sem separar, não dá pra saber se o item
   "paga a conta mas não dá lucro" ou "dá prejuízo antes da conta"
6. **Markup multiplicado em vez de dividido.** Ver a seção 1
7. **Preço de compra de seis meses atrás.** Toda linha de insumo aceita `fonte` e `data`;
   spec com preço mais velho que 60 dias merece uma volta ao atacado antes de decidir
8. **Ficha do lote, decisão da porção.** No exemplo acima o lote custa R$ 19,90 e a fatia
   custa R$ 1,66 de ingrediente mais R$ 1,90 de caixa. Quem olha o lote acha o bolo barato
   e o vende abaixo do custo real
9. **Taxa do aplicativo esquecida.** Item vendido por aplicativo de entrega carrega a
   comissão da plataforma (o percentual do plano contratado, conferido no contrato do
   usuário), e ou entra em `despesas_pct` da receita, ou vira preço próprio no `/delivery`

---

## 7. Léxico da cozinha e do balcão

- **Ficha técnica** — a receita com quantidade, unidade, custo por linha e custo por porção
- **Peso bruto e peso limpo** — o que se compra e o que vai na receita; a razão é o FC
- **Fator de correção (FC)** — peso bruto ÷ peso limpo; sempre 1 ou maior
- **Índice de cocção** — peso cozido ÷ peso cru; explica o rendimento, não entra na conta
- **Rendimento** — quantas porções o lote dá, medido, não estimado
- **Perda** — o que se produz e não se vende, em % do lote
- **CMV** — custo da mercadoria vendida; por item, custo da porção ÷ preço
- **Despesas rateadas** — fixos e variáveis que não são insumo, em % do faturamento
- **Lucro real** — o que sobra da porção depois do custo e da fatia de despesas
- **Preço pelo divisor** — custo ÷ (1 − despesas − lucro); é o que o script chama de preço sugerido
