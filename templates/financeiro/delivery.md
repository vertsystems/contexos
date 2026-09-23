# Margem por canal no delivery

Referência do `/delivery`: o método de achar quanto sobra de um prato dentro do
aplicativo, a spec que o `scripts/delivery.js` lê, as taxas de cada plataforma com fonte
e data, e os erros que a marmitaria e a pizzaria cometem todo mês. O workflow está na
skill, não aqui.

> **A fronteira desta pasta.** `templates/financeiro/` é o dinheiro do próprio negócio.
> Este arquivo é a margem dentro do canal de venda; o custo do prato é
> `templates/financeiro/ficha-tecnica.md`, o mês fechado é `/caixa`, o preço de serviço
> é `/preco`.

---

## 1. O que esta conta responde

O extrato do marketplace mostra o repasse. Nunca a margem. O dono vê R$ 32,90 no cardápio
e R$ 24,28 na conta, sem saber qual dos dois pagou a marmita. Ficam sem resposta quanto
sobra de cada prato em cada canal, qual preço naquele canal deixa o lucro que ele quer, e
até onde o desconto pode ir antes de a venda tirar dinheiro do caixa.

A conta anda nesta ordem, e o script faz exatamente isso:

```
cupom bancado pela loja  = preço × cupom% + cupom em reais
base da comissão         = preço − cupom  (ou o preço cheio, conforme o contrato)
repasse                  = base − base × comissão% − base × taxa de pagamento%
entrega por item          = entrega paga pela loja ÷ itens por pedido
mensalidade por item      = mensalidade ÷ itens vendidos no mês
custo do item             = custo por porção (ficha técnica) + embalagem de entrega
lucro real                = repasse − entrega por item − custo do item
                            − mensalidade por item − despesas% × preço
preço da meta             = (fixo) ÷ (coef. do repasse − despesas% − lucro alvo%)
preço de empate           = (fixo) ÷ (coef. do repasse − despesas%)
```

O **coeficiente do repasse** é a fatia do preço que chega na loja antes de qualquer custo.
Num plano de 23% de comissão mais 3,2% de pagamento online, ele é 0,738: de cada real que
o cliente paga, 73,8 centavos entram. Quando cai abaixo do percentual de despesas do
negócio, não existe preço que salve o item ali, e o script diz isso em vez de reajuste.

---

## 2. Onde o dinheiro vaza

Sete subtrações, e a maioria dos donos conta duas.

| Vaza em | Quem paga | Quase sempre esquecido porque |
|---|---|---|
| Comissão do plano | a loja | é a única que aparece na conversa |
| Taxa de pagamento online | a loja | vem numa linha separada do extrato |
| Cupom e promoção | depende de quem bancou | a tela mostra o desconto, não quem pagou |
| Embalagem de entrega | a loja | sacola, lacre, saco térmico e talher não estão na ficha do prato |
| Entrega, no plano de logística própria | a loja | é por pedido, não por item |
| Mensalidade do plano | a loja | é do mês, e o peso por item depende do giro |
| Despesas fixas do negócio | a loja | o aluguel não desaparece porque o pedido veio do app |

A **taxa de serviço** do fim do carrinho não entra em nenhuma dessas linhas: é cobrada do
cliente e não muda o repasse da loja. No iFood fica entre R$ 0,99 e R$ 2,49
(blog-parceiros.ifood.com.br/taxas-ifood, conferido em 23/09/2026). Vale saber pra não somar duas vezes.

---

## 3. A spec, campo a campo

O script lê um JSON, e `--exemplo` escreve um pronto pra editar. Percentual aceita
`23`, `"23%"` ou `0,23`; valor em reais aceita `32.9` ou `"32,90"`.

Na raiz: `negocio`, `mes` no formato `AAAA-MM` (entra no nome do arquivo de saída),
`despesas_pct` (as despesas do negócio sobre o faturamento), `lucro_alvo_pct` (padrão
15%), `reajuste_max_pct` (teto de aumento aceito num mês, padrão 20%) e
`desconto_minimo_pct` (folga mínima pra um item entrar na lista de promoção, padrão 10%).

Em cada canal de `canais`:

| Campo | O que é |
|---|---|
| `nome` | obrigatório. O plano, não a plataforma: "iFood Entrega" e "iFood Básico" são dois canais |
| `comissao_pct` | comissão do plano, da linha de comissão do extrato |
| `taxa_pagamento_pct` | pagamento online, linha separada; no canal direto, a taxa da maquininha ou do Pix |
| `comissao_sobre` | `"com_desconto"` (padrão) ou `"cheio"`, conforme a seção 5 |
| `cupom_pct`, `cupom_valor` | só o pedaço do cupom que a loja bancou |
| `mensalidade` | o valor do mês, rateado pelos itens vendidos no canal |
| `entrega_loja` | o que a loja paga de entrega, por pedido |
| `embalagem_extra` | sacola, lacre e talher, por item, o que não vai no balcão |
| `pedidos_mes`, `itens_por_pedido` | dividem entrega e mensalidade até chegar ao item |
| `despesas_pct` | sobrepõe o da raiz quando um canal tem despesa própria |
| `direto` | `true` no canal de venda direta, um só por spec |
| `fonte`, `conferido_em` | de onde veio a taxa e quando foi lida, em `DD/MM/AAAA` |

Em cada item de `itens`, `nome` e `custo_porcao` são obrigatórios, e esse custo vem do
`/ficha-tecnica` sem a embalagem de entrega. `precos` e `vendas` são objetos de canal
para valor. Canal em que o item não é vendido fica fora de `precos`: preço zero é erro,
não canal.

---

## 4. As taxas, com fonte e data

**Nenhum número desta tabela entra no script.** Taxa é cláusula de contrato: muda por
plano, por categoria, por cidade e por negociação. Vale o extrato do próprio negócio, e é
ele que vira a spec. A tabela serve pra dizer se o número que o dono informou está fora de
qualquer faixa conhecida, e pra mostrar o que existe quando ele nunca comparou.

| Plataforma | Plano | Comissão | Pagamento online | Mensalidade | Fonte, conferida em 23/09/2026 |
|---|---|---|---|---|---|
| iFood | Básico (entrega da loja) | 12% | 3,2% | R$ 110 acima de R$ 1.800 de faturamento no mês | blog-parceiros.ifood.com.br/taxas-ifood |
| iFood | Entrega (logística do app) | 23% | 3,2% | R$ 150 na mesma regra | blog-parceiros.ifood.com.br/taxas-ifood |
| Rappi | Entrega própria | sem comissão sobre a venda | 3,5% de crédito | sem mensalidade, adesão de R$ 40 | merchants.rappi.com/pt-br/taxas-rappi-para-restaurantes |
| Rappi | Entrega da Rappi | 27% | incluída | sem mensalidade, adesão de R$ 150 em até 10x | merchants.rappi.com/pt-br/taxas-rappi-para-restaurantes |
| 99Food | os dois modelos de entrega | 12% | saque semanal grátis | grátis (R$ 150 riscado na própria página) | merchant.99app.com/pt-BR/store?tab=cost |

No plano Entrega do iFood, comissão e pagamento online somam 26,2% do pedido, e é esse
número, não só a comissão, que serve pra comparar planos. A 99Food pede atenção
redobrada: a página do parceiro mostra 12% de comissão e
mensalidade grátis, enquanto circulam campanhas de isenção com prazos diferentes
conforme a fonte, de doze meses (saipos.com/99-food/99-food-restaurante, agosto de 2025)
a vinte e quatro. O prazo que vale pra uma loja específica fica **[a confirmar]** no
painel dela, e é de lá que sai o número da spec.

- **Plano com entrega própria não é automaticamente melhor.** Trocar 23% por 12% parece óbvio até somar a moto. Num ticket de R$ 33 a diferença de comissão é R$ 3,60, e um entregador por R$ 7 o pedido come o dobro disso. O script resolve isso com os dois planos como canais separados na mesma spec
- **Isenção tem data de validade.** Canal isento parece o melhor de todos enquanto a isenção dura. Anotar no `/rotina` a data em que ela vence, e rodar a conta de novo nessa semana

---

## 5. Comissão sobre o preço cheio ou sobre o preço com desconto

É a diferença mais silenciosa da conta inteira. Quando a loja banca um cupom de 20% num
prato de R$ 50, existem dois contratos possíveis: comissão de 23% sobre os R$ 40 já com
desconto, que dá R$ 9,20, ou sobre os R$ 50 de tabela, que dá R$ 11,50. São R$ 2,30 por pedido, e em 300 pedidos no mês são R$ 690. Na spec isso é o campo
`comissao_sobre`. Pra descobrir qual é o seu caso, abrir o extrato de **um** pedido com
cupom e dividir a comissão cobrada pelo valor do pedido: se der a comissão do plano, a
base é o valor com desconto; se der menos, a base foi o preço cheio.

---

## 6. Cupom: quem banca o quê

Cupom da plataforma não custa nada pra loja. Cupom da loja custa o valor inteiro. E
existe o meio do caminho, em que a plataforma banca uma parte e a loja outra. Na spec
entra **só o pedaço que sai do bolso do dono**, em `cupom_pct` ou `cupom_valor`. O
desconto que o cliente vê na tela não é o número da conta.

Frete grátis é cupom com outro nome: se a loja assume o frete, entra em `entrega_loja`, e se assume só uma parte, entra o valor da parte.

---

## 7. Entrega e mensalidade são do pedido, não do item

Erro de conta que inverte a decisão: ratear a entrega por item e concluir que a bebida
dá prejuízo. A entrega é uma por pedido. Se o pedido médio leva 1,4 itens, a entrega
por item é a entrega dividida por 1,4, e é assim que o script faz, pelo campo
`itens_por_pedido`.

A mensalidade segue a mesma lógica, um andar acima: ela é do mês, e o peso por item sai
de `mensalidade ÷ itens vendidos no mês`. Duas consequências práticas:

- Canal com mensalidade e pouco giro é o mais caro de todos, por item, mesmo com comissão baixa. R$ 150 em 900 itens são R$ 0,17; em 90 itens são R$ 1,67
- Cair o volume num canal com mensalidade piora a margem sem que nenhuma taxa tenha mudado. É o único custo desta conta que anda ao contrário da venda

---

## 8. Preço diferente por canal: pode

Preço mais alto no aplicativo, pra absorver a comissão, é prática legítima, e o dono
costuma achar que não pode. Pode: o Termo de Compromisso de Cessação que o CADE celebrou
com o iFood em 08/02/2023, com 54 meses de vigência, "proíbe a adoção de cláusulas de
paridade de preço (conhecidas como cláusulas do tipo Most Favoured Nation - MFN) em
relação a outros marketplaces", e veda exigir que o parceiro pare de fazer promoção em
plataforma concorrente
(gov.br/cade/pt-br/assuntos/noticias/cade-celebra-acordo-com-ifood-em-investigacao-de-exclusividade-no-mercado-de-marketplaces-de-delivery-on-line-de-comida,
conferido em 23/09/2026).

Duas ressalvas honestas: o TCC trata da paridade **entre marketplaces**, e o preço do
próprio balcão é outra discussão; cláusula de contrato específico se lê no contrato
específico. Isso aqui não substitui advogado, e revisão de cláusula é
`/revisar-contrato`. O CDC exige, nos dois canais, preço claro e visível antes da compra.

---

## 9. O que o extrato do Portal do Parceiro traz e o que não traz

Traz: pedidos, valor bruto, comissão, taxa de pagamento, cupom por origem, cancelamento,
repasse por período. Não traz: custo do prato, embalagem de entrega, mensalidade rateada
por item, despesa fixa do negócio. Traz os dois termos que a plataforma controla e nenhum
dos quatro que o dono controla. O arquivo que se pede ao dono é o relatório de vendas por
item do período, exportado do portal ou do PDV; dele saem quantidade vendida por item e preço praticado.

---

## 10. "Muito visto, pouco vendido" não é preço

O relatório do app mostra itens com muita visita e pouca venda, e o reflexo do dono é
baixar o preço. Quase sempre o problema é outro: a foto, a descrição ou a posição no
cardápio. O material do iFood sobre ranqueamento cita capacidade de produzir e entregar,
avaliações, foto e descrição do prato e uso de cupom como fatores, sem publicar peso de
cada um (blog-parceiros.ifood.com.br/algoritmo-ifood, conferido em 23/09/2026).

Daí sai uma ordem: antes de mexer no preço de um item muito visto e pouco vendido, trocar
a foto, reescrever a descrição e esperar duas semanas. Sem número novo, desconto em item
bem visto é margem doada, e a reescrita costuma sair de graça no atendimento da plataforma.

---

## 11. Venda direta: a conta que dá e a que não dá

Tirar o pedido do app economiza a comissão inteira. Não economiza a entrega, o
atendimento, o cupom de primeira compra e o tempo de quem digita o pedido no WhatsApp. O
canal direto entra na spec com `direto: true` e honestidade em três campos:
`taxa_pagamento_pct` com a taxa real da maquininha ou do link (Pix é zero, crédito não),
`entrega_loja` com o que o entregador custa de verdade incluindo o pedido que volta, e
`embalagem_extra` igual à do app, porque a sacola é a mesma.

O script mostra o ganho por unidade, e não o custo de **trazer** o cliente pro canal
direto: o app entrega demanda, e é por isso que cobra. Venda direta cresce com base de
cliente e recompra, não com desconto de 5% num cartaz.

---

## 12. Erros comuns

- **Somar comissão e taxa de pagamento como se fossem uma.** São duas linhas do extrato, e bases diferentes quando há cupom
- **Esquecer a embalagem de entrega.** Sacola, lacre e talher não estão na ficha do prato, e no delivery existem em todo pedido
- **Decidir com taxa de matéria de blog.** Blog serve pra saber que a faixa existe; a conta usa o extrato
- **Tirar item do app olhando só a margem.** Item de margem baixa e giro alto sustenta o ranqueamento e paga a estrutura
- **Repassar a comissão inteira pro preço de uma vez.** O app tem o concorrente lado a lado na mesma tela; reajuste vai em passo, com a venda medida depois

---

## 13. Léxico

- **Comissão** — percentual do valor do pedido que fica com a plataforma
- **Taxa de pagamento online** — percentual cobrado quando o cliente paga dentro do app
- **Repasse** — o que a plataforma deposita, já descontadas as taxas dela
- **Coeficiente do repasse** — fatia do preço que chega na loja antes dos custos dela
- **Preço de empate** — preço em que o lucro do item zera naquele canal
- **Preço da meta** — preço que entrega o lucro alvo naquele canal

---

## 14. Fontes

Todas conferidas em 23/09/2026. Taxa muda: reconferir antes de decidir reajuste, e anotar a data na spec, canal por canal.

- blog-parceiros.ifood.com.br/taxas-ifood — planos, comissão, pagamento online, mensalidade e taxa de serviço ao cliente
- blog-parceiros.ifood.com.br/algoritmo-ifood — fatores de ranqueamento, sem peso publicado
- merchants.rappi.com/pt-br/taxas-rappi-para-restaurantes — planos, adesão e taxa operacional
- merchant.99app.com/pt-BR/store?tab=cost — comissão e mensalidade do parceiro 99Food
- saipos.com/99-food/99-food-restaurante — leitura de agosto de 2025 sobre a isenção de doze meses
- gov.br/cade/pt-br/assuntos/noticias/cade-celebra-acordo-com-ifood-em-investigacao-de-exclusividade-no-mercado-de-marketplaces-de-delivery-on-line-de-comida — TCC de 08/02/2023, 54 meses, vedação de cláusula MFN
