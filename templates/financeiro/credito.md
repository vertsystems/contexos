# Crédito: quanto o dinheiro custa de verdade

Referência da skill `/emprestimo`. O que entra no custo de um empréstimo, como se lê uma
proposta de banco, como a antecipação da maquininha vira taxa ao ano, o que a lei obriga o
banco a mostrar, e as contas que o `scripts/credito.js` faz. Valores com fonte e data: o que
mudar depois da data de conferência é pra reconferir antes de usar.

> **A fronteira desta pasta.** `templates/financeiro/` é o dinheiro do próprio negócio. O
> `/caixa` diz o que sobrou, o `/projecao` diz o que sobra nos próximos meses em cenários,
> e este molde diz quanto custa trazer dinheiro de fora. Onde investir a sobra não entra
> aqui: é opinião, e opinião de crédito é conversa com gente que responde por ela.

---

## O que é o CET, e por que a taxa da propaganda não serve

A taxa de juros da proposta é uma parte do custo. O resto se chama IOF, tarifa de cadastro,
seguro prestamista, avaliação de garantia, e vem espalhado pelo contrato. O **Custo Efetivo
Total (CET)** junta tudo numa taxa só, e o banco é obrigado a mostrar antes de você assinar.

A regra é a Resolução CMN 4.881/2020 (https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=4881, conferida em 23/09/2026):

- Vale pra pessoa física, empresário individual, microempresa e empresa de pequeno porte (art. 1º)
- O cálculo inclui amortização, juros, tarifas, tributos, seguros e qualquer outra despesa ligada à operação, mesmo a que não entra no valor do crédito (art. 3º)
- A fórmula é a taxa anual que iguala o valor liberado ao valor presente de tudo que se paga, contando **dias corridos** entre a liberação e cada pagamento (art. 4º): `FC0 = Σ FCj / (1 + CET)^(dj/365)`
- Expresso ao ano, com duas casas decimais (art. 4º, parágrafo único)
- O banco informa o CET **antes** da contratação, com o demonstrativo de cada componente (art. 7º). Anúncio que mostra a taxa de juros tem de mostrar o CET junto (art. 8º)
- Taxa que flutua no meio do contrato (CDI, IPCA) fica fora do cálculo, mas entra no demonstrativo (art. 5º). Em cheque especial, desconto e adiantamento, o CET usa prazo de 30 dias e o limite contratado (art. 6º)

Isso muda a conversa com o gerente: pedir "o CET e o demonstrativo" é pedir o que a norma
já obriga. Proposta sem CET escrito não é proposta, é conversa.

Como o CET é uma taxa interna de retorno, não tem fórmula fechada: acha-se por tentativa.
O script usa bisseção (divide o intervalo ao meio até a diferença ficar abaixo de um
trilionésimo), que converge sempre que o fluxo tem uma troca de sinal, o que é o caso de
todo empréstimo. É o mesmo método do material de referência de finanças que serviu de base
(https://github.com/JoelLewis/finance_skills, skill `time-value-of-money`), adaptado ao
prazo em dias corridos que a norma brasileira exige.

**CET ao mês e ao ano.** O banco costuma mostrar os dois. A conversão é `(1 + CET ao
ano)^(1/12) − 1`, e vale a regra do material citado: 12% ao ano composto mensalmente não é
1% ao mês, e 2% ao mês não é 24% ao ano, é 26,82%. Comparar proposta é comparar CET ao ano.

---

## Price e SAC

| | Price (parcela fixa) | SAC (amortização constante) |
|---|---|---|
| Parcela | igual do começo ao fim | começa maior e cai todo mês |
| Amortização | começa pequena e cresce | igual todo mês (valor ÷ parcelas) |
| Juros pagos ao todo | mais | menos, na mesma taxa e prazo |
| Quando cabe | caixa apertado agora, receita estável | caixa aguenta parcela maior nos primeiros meses |
| Quitar cedo | saldo cai devagar no começo | saldo cai em linha reta |

Parcela do Price: `valor × i / (1 − (1 + i)^−n)`. Em cada mês, juros = saldo × i, e a
amortização é o que sobra da parcela. No SAC, amortização = valor ÷ n, e a parcela é
amortização + juros do saldo.

A tabela de amortização (parcela, juros, amortização, saldo depois de cada parcela) é o que
o script monta. Saldo devedor depois da parcela k é quanto custa quitar naquele ponto: os
juros das parcelas que não venceram não são devidos (CDC, art. 52, § 2º, abaixo).

**Carência** não é mês de graça. Nos meses sem parcela os juros correm e são somados ao
saldo. Três meses de carência a 2% ao mês em R$ 50.000 custam R$ 3.060 antes da primeira
parcela. O script capitaliza a carência e mostra esse número.

---

## IOF: a regra em vigor

Imposto federal sobre operação de crédito, cobrado pelo banco e repassado. Decreto
6.306/2007 na redação do Decreto 12.499/2025 (https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/D12499.htm),
cujos efeitos o STF restabeleceu em 16/07/2025 (ADC 96), exceto a parte sobre "risco
sacado". Conferido em 22/09/2026.

| Tomador | Alíquota diária | Adicional (uma vez) | Teto no ano (diária × 365 + adicional) |
|---|---|---|---|
| Pessoa física | 0,0082% ao dia | 0,38% | 3,37% |
| Empresa fora do Simples | 0,0082% ao dia | 0,38% | 3,37% |
| Simples Nacional ou MEI, operação até R$ 30.000 | 0,00274% ao dia | 0,38% | 1,38% |

Como se aplica em empréstimo parcelado (art. 7º, I, "b", e § 15): a diária incide sobre o
**principal de cada parcela** pelos dias entre a liberação e o vencimento dela, limitada a
365 dias (§ 1º); o adicional incide uma vez sobre o principal. O banco normalmente financia
o IOF junto com o valor, o que muda o principal e, portanto, o próprio IOF. O script
resolve isso por iteração até fechar o centavo.

Ser MEI ou Simples com operação até R$ 30.000 corta a alíquota diária a cerca de um terço, e
é o que mais muda a conta. Uma operação de R$ 30.001 perde o benefício inteiro. Se a proposta
é de R$ 32.000, vale perguntar ao banco quanto fica em R$ 30.000.

A alíquota do IOF mudou três vezes em 2025 (decreto, derrubada no Congresso, decisão do
STF). Se a proposta do banco traz o IOF em reais, esse valor manda sobre o calculado: entra
na spec como `"iof": "812,33"`. Se o valor calculado e o da proposta divergem mais de
alguns reais, ou a regra mudou de novo, ou o banco errou. Os dois casos merecem pergunta.

---

## Antecipação de recebíveis

O comércio vende no cartão e recebe em 30 dias (débito, em 1 dia; crédito à vista, em
30; parcelado, uma parcela a cada 30). Antecipar é receber hoje com desconto. A
credenciadora mostra "2,49% ao mês" e cobra pro rata por dia: R$ 10.000 que cairiam em
30 dias viram R$ 9.751 hoje. Parece pouco. Ao ano, é mais de 35%, porque o desconto se
repete a cada venda antecipada.

Duas taxas que não se misturam:

- **MDR** (taxa da maquininha, "taxa de desconto"): o preço de aceitar cartão. Você paga
  antecipando ou não. Não é custo de crédito, é custo de venda, e vai pro `/caixa` como
  variável
- **Taxa de antecipação**: o preço de receber antes. Só existe se você antecipa. É isso que
  o script converte em CET

O valor do recebível na spec é o líquido do MDR (o que cairia na conta). A conta do script:
desconto = valor × taxa × dias ÷ 30, e o CET sai do fluxo (recebe X hoje, deixa de receber
o valor cheio na data).

Três coisas que o dono da maquininha costuma não saber:

1. **Antecipação automática** ligada por padrão em muitas credenciadoras: o comércio paga a
   taxa toda semana sem ter pedido. O extrato da maquininha mostra; a fatura, não
2. **Registradora de recebíveis** (Resolução CMN 4.734/2019 e Circular BCB 3.952/2019, em vigor
   desde 07/06/2021, hoje somadas à Resolução BCB 264/2022, que regula o registro dos recebíveis
   de arranjo de pagamento; conferido em 23/09/2026 em
   https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o&numero=4734):
   a agenda de recebíveis de cartão é registrada, e o comércio pode antecipar ou dar em garantia
   em qualquer instituição, não só na credenciadora. Cotação em dois lugares é possível e
   costuma cair a taxa
3. **IOF**: antecipação pela credenciadora é compra de recebível, sem IOF. A mesma
   operação num banco, como desconto de duplicatas ou de recebíveis, tem IOF. A spec
   deixa o padrão em `false` e o usuário liga se a proposta cobrar

Antecipar toda semana pra pagar a conta da semana é o sinal de que o problema não é
prazo, é margem ou capital de giro. Aí o `/caixa` vem antes do crédito.

---

## Parcelado "sem juros" e a taxa embutida

Loja que oferece "12× sem juros" quase sempre tem preço à vista menor. Se o à vista é
R$ 2.700 e o parcelado é 12× de R$ 250 (R$ 3.000), há juros: 1,66% ao mês, 21,8% ao ano.
O script recebe o preço à vista, a parcela e o número de parcelas e devolve a taxa embutida
por bisseção. Se `parcela × n ≤ à vista`, é zero de verdade, e o custo, se existe, está no
desconto que a loja daria e não deu.

O CDC obriga a loja a informar, antes, o preço à vista, a taxa efetiva anual, o número de
parcelas e a soma total com e sem financiamento (Lei 8.078/1990, art. 52, incisos I a V,
https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm, conferido em 22/09/2026).

---

## Quitar antes e trocar de dívida

- **Quitação antecipada com desconto** (CDC, art. 52, § 2º, Lei 8.078/1990): total ou parcial,
  com redução proporcional dos juros. O valor é o saldo devedor da tabela, não a soma das parcelas
- **O banco tem de dar o número e o meio** (Resolução CMN 5.004/2022, art. 6º,
  https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=5004,
  conferida em 23/09/2026): informação e meios pra liquidar antes, total ou parcial, em tempo
- **Como se calcula** (art. 7º da mesma resolução): em operação prefixada com pessoa física,
  microempresa ou EPP, o saldo pra quitar é o valor presente das parcelas que faltam,
  descontadas **pela taxa de juros do próprio contrato**. Cobrar mais que isso é cobrar juros
  que não venceram
- **Atenção à norma antiga**: a Resolução CMN 3.516/2007, que vedava tarifa por liquidação
  antecipada, foi revogada pela Resolução CMN 5.004/2022 (art. 11), com efeito desde
  02/05/2022. Quem citar a 3.516 hoje está citando norma revogada. A proteção continua: a
  liquidação antecipada não está entre os serviços tarifáveis, e o cálculo virou o do art. 7º
- **Portabilidade**: dívida cara pode ser levada pra outro banco que ofereça CET menor. O
  banco de origem informa o saldo pra quitação. A conta é a mesma deste molde: o CET da
  nova operação contra o que resta da antiga

Antes de trocar, calcular a antiga como se fosse contratar hoje pelo saldo que falta: se
o CET novo é menor, troca. Só a parcela menor não decide: prazo maior baixa a parcela e
sobe o total pago.

---

## O que pedir ao banco (a lista curta)

1. O CET ao ano e o demonstrativo, por escrito, antes de assinar
2. Sistema de amortização (Price ou SAC) e a tabela de parcelas
3. IOF em reais
4. Cada tarifa: nome, valor e se é descontada na liberação, financiada ou cobrada na parcela
5. Se tem seguro, quanto custa e se é opcional (na maior parte dos casos é)
6. Carência e o que ela custa
7. Garantia exigida e o que acontece no atraso
8. O saldo pra quitação antecipada depois de 6 e de 12 meses, e por qual taxa ele é calculado (a do contrato, pela Resolução CMN 5.004/2022, art. 7º)

Sinais de proposta ruim: CET que só aparece no contrato; seguro "já incluso"; taxa
anunciada ao mês sem o ao ano; prazo alongado pra parcela caber; "pré-aprovado" com pressa.

---

## Referência de mercado

O Banco Central publica a taxa média das operações novas por modalidade. É a média do
país, sem garantia de que o banco dê aquilo pra esse negócio, mas proposta muito acima
pede segunda cotação. O script busca os últimos valores sem chave:

```bash
node scripts/credito.js referencia
```

Séries do SGS (% ao ano, recursos livres, taxa média): 20725 capital de giro PJ, 20724
capital de giro rotativo PJ, 20719 desconto de duplicatas e recebíveis PJ, 20721
antecipação de faturas de cartão PJ, 20727 cheque especial PJ, 22020 cartão parcelado PJ,
20748 crédito pessoal PF, 20741 cheque especial PF. Consulta em
https://api.bcb.gov.br/dados/serie/bcdata.sgs.<série>/dados/ultimos/1?formato=json;
tabela navegável em https://www.bcb.gov.br/estatisticas/txjuros. Conferido em 22/09/2026.

---

## Léxico

- **CET** — custo efetivo total: juros, IOF, tarifa e seguro numa taxa anual
- **IOF** — imposto sobre operações financeiras, diária mais adicional
- **Price** — parcela fixa, amortização crescente
- **SAC** — amortização constante, parcela decrescente
- **Amortização** — a parte da parcela que abate a dívida; o resto é juros
- **Saldo devedor** — o que falta pra quitar, sem os juros futuros
- **Carência** — meses sem parcela, com juros correndo
- **Prestamista** — seguro que quita a dívida se o tomador morre ou fica inválido
- **MDR** — taxa da maquininha sobre cada venda no cartão
- **Antecipação** — receber hoje, com desconto, o que cairia depois
- **Registradora** — quem guarda a agenda de recebíveis de cartão e permite antecipar em qualquer banco
- **Portabilidade** — levar a dívida pra outro banco com CET menor; o banco de origem tem de informar o saldo pra quitação
- **TIR** — taxa interna de retorno, a taxa que zera o fluxo; o CET é uma TIR
