# Combos — o que sai junto, e quanto sobra

Referência do `/combos`. Não é o workflow: é o que a skill consulta pra explicar um número,
escolher o tipo de combo, calibrar o preço e saber onde a lei entra. O `scripts/combos.js`
calcula o que está descrito aqui.

---

## Os quatro números, em português

O cálculo se chama market basket, análise de cesta. Ele responde uma pergunta só: quais dois
itens aparecem no mesmo pedido mais vezes do que o acaso explicaria? A conta é de par, sempre.
Trio se monta encadeando dois pares que passaram o piso, e o terceiro item entra por julgamento
do dono, não por número: em base de negócio pequeno, trio quase nunca tem volume pra sustentar
lift próprio.

| Número | Conta | O que significa | Onde engana |
|---|---|---|---|
| **Coocorrência** | pedidos que têm A e B | Volume bruto do par | Item campeão aparece com tudo |
| **Suporte** | coocorrência ÷ total de pedidos | Em quantos por cento dos pedidos o par sai junto | Suporte alto com lift 1 é só popularidade |
| **Confiança A→B** | coocorrência ÷ pedidos com A | De quem leva A, quanto leva B também | Tem direção: A→B e B→A são números diferentes |
| **Lift** | suporte(A,B) ÷ (suporte(A) × suporte(B)) | Quantas vezes mais eles saem juntos do que se fossem indiferentes | Sobe muito quando um dos itens é raro |

Exemplo real de um delivery de almoço, 903 pedidos em agosto:

```
Marmita executiva     422 pedidos
Refrigerante lata     270 pedidos
Os dois juntos        261 pedidos

suporte(marmita)  = 422 / 903 = 46,7%
suporte(refri)    = 270 / 903 = 29,9%
suporte(os dois)  = 261 / 903 = 28,9%
confiança marmita → refri = 261 / 422 = 61,8%
confiança refri → marmita = 261 / 270 = 96,7%
lift = 0,2890 / (0,4673 × 0,2990) = 2,07
```

A leitura: quase todo refrigerante vai com marmita (96,7%), e boa parte das marmitas leva
refrigerante (61,8%). A oportunidade está nos 161 pedidos de marmita sem bebida, não no par
que já acontece.

### Lift: as três faixas

- **Abaixo de 1,0** — os dois se evitam. Costuma ser substituição: refrigerante lata e
  refrigerante 600ml, marmita tradicional e marmita fitness. Combo de substitutos não vende,
  divide
- **Entre 1,0 e 1,2** — indiferença. Saem juntos porque os dois vendem muito, não porque
  combinam. Água mineral entra aqui em quase todo negócio
- **Acima de 1,5** — atração de verdade. É aqui que o combo tem chance

---

## Por que existe piso de volume

Dois itens que apareceram juntos duas vezes em 900 pedidos podem dar lift 40. O número é
correto e não serve pra nada: não sustenta cartaz, cardápio nem meta. Com dois pedidos, um
cliente indeciso muda o resultado inteiro.

O piso padrão do `scripts/combos.js` é 5 pedidos com o par e 5 pedidos com cada item. Isso
elimina a miragem sem esconder nada: o par que não passou aparece numa lista separada, com o
motivo. Em base de menos de 200 pedidos, o piso de 5 já é frágil, e a saída honesta é juntar
mais um mês antes de decidir preço.

---

## O que não é par, mesmo com número bonito

| Caso | Sintoma na tabela | Por que descartar |
|---|---|---|
| **Substitutos** | Lift abaixo de 1 entre variações do mesmo produto | Combo canibaliza: o cliente levaria um dos dois de qualquer jeito |
| **Item que vai em tudo** | Suporte alto, lift perto de 1 (sacola, embalagem, taxa de entrega) | Não é escolha do cliente, é parte da operação |
| **Item obrigatório** | Confiança de 100% num sentido | Se não dá pra comprar separado, já está embutido no preço |
| **Par sazonal** | Volume concentrado em poucos dias do arquivo | Panetone com café em dezembro não é padrão do ano |
| **Nome duplicado** | Dois itens quase iguais no catálogo do PDV | Cadastro sujo divide o mesmo produto em dois e afunda o lift dos dois |

O último é o mais comum em comércio local. Antes de confiar na tabela, olhar a lista dos
itens mais vendidos e conferir se "Coca 350", "Coca lata" e "Coca-cola lata" são três linhas
do mesmo refrigerante.

---

## Os cinco tipos de combo que funcionam em negócio pequeno

| Tipo | Como se monta | Quando usar | Preço |
|---|---|---|---|
| **Âncora + anexo** | Item campeão mais um item barato de margem alta | Confiança alta num sentido só, baixa no outro | Desconto pequeno, ou nenhum |
| **Completa a ocasião** | O que a pessoa precisa pra resolver a situação inteira (prato, bebida, sobremesa) | Dois pares que se encadeiam: A com B e B com C, cada um acima do piso | Desconto de 5% a 10% sobre a soma |
| **Conveniência** | Mesmo preço da soma, com nome e pedido único | O par já sai junto em mais de 25% dos pedidos | Sem desconto: o ganho é rapidez de escolha |
| **Volume** | Leve 2, leve 3 do mesmo item | Item de recompra curta e validade longa | Desconto na segunda unidade, nunca na primeira |
| **Presente** | Dois itens embalados como kit, com apresentação | Datas comemorativas, ticket alto | Preço acima da soma, porque a embalagem é parte do produto |

**Conveniência é o mais subestimado.** Quando o par já sai junto em 28% dos pedidos, dar
desconto é pagar pra manter o que já acontecia. Nomear o par e deixar pedir com um toque
aumenta velocidade de atendimento sem custar margem.

---

## A conta do preço

```
preço cheio   = preço médio praticado de A + preço médio praticado de B
preço combo   = preço cheio × (1 − desconto)
custo         = custo unitário de A + custo unitário de B
margem        = (preço combo − custo) ÷ preço combo
preço mínimo  = custo ÷ (1 − margem mínima)
desconto máx. = 1 − custo ÷ (preço cheio × (1 − margem mínima))
```

Três regras que vêm dessa conta:

- **O desconto sai do item de maior margem**, não do de maior preço. Bebida costuma ter
  margem maior que prato: é de lá que o desconto dói menos
- **Margem do combo não é a média das margens.** Item de margem apertada puxa o conjunto pra
  baixo mais do que parece, porque a conta é sobre o preço final, não sobre a soma
- **Sem custo unitário, não existe margem.** Export de PDV, iFood e Shopify traz preço de
  venda, nunca custo. Quem informa é o dono, item por item

### O ponto de equilíbrio do combo

Todo combo com desconto tem um lado que ninguém calcula: quem já levava os dois passa a levar
mais barato. Essa é a perda, e ela é certa. O ganho é incerto, e vem de quem levava só a
âncora e passa a levar o combo.

```
perda no mês       = pedidos que já levavam os dois × (preço cheio − preço combo)
ganho por pedido   = (preço combo − custo do combo) − (preço da âncora − custo da âncora)
pedidos novos      = perda ÷ ganho por pedido
teto de conversão  = pedidos com a âncora − pedidos com os dois
```

O teto reprova mais combo do que a margem, e é o número mais esquecido. Quem já leva os dois
não converte: já está dentro do par. Sobra quem leva a âncora sem o anexo, e é só desse grupo
que os pedidos novos podem sair.

No delivery do exemplo, com marmita a R$ 24,90 (custo R$ 11,20) e refrigerante lata a R$ 8,00
(custo R$ 3,40), a 10% de desconto:

```
preço cheio      = 24,90 + 8,00                      = R$ 32,90
preço do combo   = 32,90 menos 10%                    = R$ 29,61
custo do combo   = 11,20 + 3,40                      = R$ 14,60
margem do combo  = (29,61 − 14,60) ÷ 29,61           = 50,7%
perda no mês     = 261 × (32,90 − 29,61)             = R$ 858,69
ganho por pedido = (29,61 − 14,60) − (24,90 − 11,20) = R$ 1,31
pedidos novos    = 858,69 ÷ 1,31                     = 656
teto de conversão = 422 − 261                        = 161
```

A margem passa com folga, em 50,7%, e o combo não se paga: precisaria de 656 conversões num
grupo de 161 pedidos. Margem aprovada não é combo aprovado, e a conta mostra isso antes de o
cartaz ser impresso.

A saída nesse caso é uma das três: tirar o desconto e vender conveniência, trocar o par por um
de coocorrência baixa e lift alto, ou mover o desconto pro item de margem maior.

---

## O que a lei exige

Combo é oferta conjunta, e o Código de Defesa do Consumidor (Lei 8.078/1990) tem três pontos
que se aplicam direto. Fonte: <https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm>,
conferido em 23/09/2026.

| Onde | O que diz | O que isso obriga no combo |
|---|---|---|
| **Art. 39, I** | É prática abusiva condicionar o fornecimento de produto ou serviço ao fornecimento de outro produto ou serviço, bem como, sem justa causa, a limites quantitativos | O item precisa continuar à venda separado, no preço de sempre. Combo é opção, nunca condição |
| **Art. 31** | A oferta deve assegurar informação correta, clara, precisa, ostensiva e em língua portuguesa sobre características, qualidade, quantidade, composição, preço, garantia e prazo de validade | O cartaz diz o que vem no combo, em que quantidade e tamanho, e quanto custa |
| **Art. 37, § 1º** | É enganosa a informação ou comunicação publicitária inteira ou parcialmente falsa, ou que por qualquer outro modo, mesmo por omissão, seja capaz de induzir o consumidor a erro sobre preço e outros dados do produto | Anunciar desconto exige desconto real sobre o preço praticado. Subir o preço na véspera e chamar de combo é publicidade enganosa, e o ônus de provar que o anúncio é verdadeiro é de quem anuncia (art. 38) |

Isso não substitui advogado. Setor regulado (farmácia, bebida alcoólica, produto infantil,
saúde) tem regra própria de oferta e de publicidade, e aí a conversa é com quem responde pelo
seu segmento.

---

## O que medir depois

Combo vira decisão quando o mês seguinte é medido. Três números bastam, e todos saem do mesmo
CSV rodado de novo:

1. **Itens diferentes por pedido** — o alvo do combo. Se não subiu, o combo não pegou
2. **Ticket médio** — pode ficar parado mesmo com o combo vendendo, quando o desconto comeu o
   ganho. Comparar com a perda calculada no ponto de equilíbrio
3. **Pedidos com o combo** — contra o número de pedidos novos que a conta exigia, e contra o
   teto de conversão, que é o grupo de onde eles podem sair

Um mês é pouco pra sazonalidade (semana de pagamento, feriado, chuva no delivery). Dois meses
seguidos na mesma direção já é sinal.

---

## Fontes

| Fonte | O que traz | O que não traz | Conferido em |
|---|---|---|---|
| CDC, Lei 8.078/1990 — <https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm> | Arts. 31, 37, 38 e 39 citados acima | Regra setorial de publicidade, e regra de imposto sobre a venda | 23/09/2026 |
| Coleção de skills de vendas — <https://github.com/louisblythe/Sales-Skills> | Upsell e cross-sell como detecção de oportunidade na conversa, com `cross-sell-upsell-detection` e `deal-upselling` | Nenhum cálculo de coocorrência: é conversa B2B, não cesta de compra | 22/09/2026 |
| Coleção de skills de marketing — <https://github.com/coreyhaines31/marketingskills> | Preço e empacotamento como raciocínio de oferta (`pricing`, `offers`, `paywalls`) | Nada dedicado a bundle medido em dado de pedido | 22/09/2026 |

As duas coleções tratam upsell como técnica de conversa e empacotamento como decisão de
posicionamento. Nenhuma das duas abre o arquivo de pedidos. É essa fresta que o `/combos`
ocupa: o par sai do dado, e a conversa de venda vem depois, no `/oferta` e no `/whatsapp`.
