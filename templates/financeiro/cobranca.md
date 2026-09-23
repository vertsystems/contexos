# Cobrança de atrasado — a régua, o juro e o que a lei deixa fazer

Referência do `/cobranca`. O `/contrato` consulta a seção de encargos quando escreve a
cláusula de atraso, e o `/caixa` olha a tabela de prescrição antes de dar uma parcela
por perdida.

Por que existe: quem cobra sem método erra de dois jeitos opostos. Ou não cobra, com
vergonha, e a parcela envelhece até virar dívida esquecida; ou cobra bravo, com juro
inventado, e entrega ao cliente o motivo pra não pagar. O meio termo tem regra: valor
certo, mensagem certa, dia certo. Este arquivo guarda as três.

> **Não é aconselhamento jurídico.** Cláusula acima do usual, cliente que contesta o
> serviço, valor alto ou qualquer coisa que vá parar em protesto ou juizado passa por
> advogado antes de virar ação. Cada linha leva a fonte e a data: o conjunto foi
> conferido em 22/09/2026, e a tabela de encargos, a prescrição e o limite do juizado
> foram reconferidos no Planalto em 23/09/2026. Lei muda, e a taxa legal muda todo mês.

---

## A régua de cinco toques

| Toque | Quando | Canal | Tom | O que a mensagem precisa ter |
|---|---|---|---|---|
| **D-3** lembrete | 3 dias antes, em dia útil (antecipa se cair em fim de semana) | WhatsApp | serviço, não cobrança | valor, data, forma de pagar (Pix, boleto, link). Nada de "não esqueça" |
| **D+1** aviso | dia útil seguinte ao vencimento efetivo | WhatsApp | pergunta, não acusação | "não constou aqui; aconteceu alguma coisa?" e o jeito de pagar de novo |
| **D+7** cobrança | uma semana depois | WhatsApp + e-mail | direto, cordial | valor original, valor corrigido com a conta, pedido de uma data |
| **D+15** parcelamento | duas semanas depois | WhatsApp + e-mail | proposta | duas saídas: à vista sem encargo, ou entrada mais parcelas; prazo pra responder |
| **D+30** formal | um mês depois | e-mail (ou carta) | formal, seco | identificação completa do credor, débito discriminado, prazo final, o que acontece depois (protesto, negativação, juizado) |

O vencimento que cai em sábado, domingo ou feriado vale no dia útil seguinte, sem
encargo, e a régua conta a partir dele. O `scripts/regua.js` faz essa conta e escreve
o dia da semana em cada data. Toque nenhum sai em fim de semana.

Três limites que a régua respeita:

- **Uma mensagem por toque.** Insistir todo dia é o que Procon e juizado tratam como
  cobrança abusiva, e a versão pesada dela (ameaça, coação, constrangimento, interferir
  no trabalho ou no descanso) é crime no art. 71 do CDC. Um segundo lembrete cordial
  não é crime; a série diária é o que vira reclamação
- **Horário comercial**, das 8h às 18h em dia útil. Não é lei federal; é o que Procon
  e juizado tratam como razoável (ver fontes)
- **Só com o devedor.** Sócio, cônjuge, colega, recepção do trabalho: ninguém além
  dele fica sabendo da dívida. Grupo de WhatsApp, nunca

Depois do D+30 a régua acabou. O que vem é decisão, não mensagem: acordo por escrito,
protesto em cartório, negativação com aviso prévio ou juizado. Cada um com custo e
prazo próprios, e o `/decidir` ajuda a escolher quando o valor justifica.

---

## Encargos: quanto pode somar à parcela

| Encargo | Consumidor (pessoa que compra pra uso próprio) | Empresa contratando empresa | Fonte |
|---|---|---|---|
| **Multa por atraso** | até 2% da parcela, e só se o contrato ou recibo previr | o que foi assinado; o juiz pode reduzir se for desproporcional | [CDC art. 52 §1º](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm), redação da Lei 9.298/1996; [CC arts. 412 e 413](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm). Conferido em 23/09/2026 |
| **Juros de mora** | a taxa do contrato, na praxe 1% ao mês, pro rata por dia. Acima disso, a Lei da Usura limita ao dobro da taxa legal | o que foi assinado; a Lei da Usura não se aplica entre pessoas jurídicas desde 30/08/2024 | [Decreto 22.626/1933 art. 1º](https://www.planalto.gov.br/ccivil_03/decreto/d22626.htm); [Lei 14.905/2024 art. 3º, I](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14905.htm), em vigor desde 30/08/2024. Conferido em 23/09/2026 |
| **Juros sem cláusula** | taxa legal: Selic menos IPCA, divulgada todo mês pelo Banco Central; zero se der negativa | igual | [CC art. 406 §§ 1º a 3º](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) e [Resolução CMN 5.171/2024](https://www.bcb.gov.br/content/estabilidadefinanceira/especialnor/Resolu%C3%A7%C3%A3o5171.pdf); simulador na Calculadora do Cidadão do BCB. Conferido em 22/09/2026 |
| **Correção monetária** | o índice do contrato; sem índice, IPCA | igual | [CC art. 389, parágrafo único](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm), Lei 14.905/2024. Conferido em 22/09/2026 |
| **Multa sem cláusula** | nenhuma. Multa é pena convencional: precisa estar escrita | nenhuma | CC art. 408 e seguintes |

A conta de juro é por dia, não por mês cheio. Parcela de R$ 1.200 com 1% ao mês e 7
dias de atraso: 1.200 × 0,01 ÷ 30 × 7 = R$ 2,80, não R$ 12,00. Quem cobra R$ 12 no
sétimo dia de um consumidor está cobrando indevido. Se o cliente pagar esse excesso, o
art. 42, parágrafo único, do CDC dá a ele o direito de receber o dobro do que pagou a
mais, com correção e juros; e multa acima de 2% ainda é infração administrativa punível
pelo Procon ([Decreto 2.181/1997 art. 13, XIX](https://www.planalto.gov.br/ccivil_03/decreto/d2181.htm), conferido em 23/09/2026).

O art. 52 está no capítulo do crédito ao consumidor, e é assim que ele aparece citado:
Procon e tribunais aplicam o teto de 2% à prestação de consumo em geral, e é essa leitura
que o `scripts/regua.js` segue. Cláusula de 10% num contrato com pessoa física é a briga
que o usuário perde depois.

**Consumidor ou empresa?** Consumidor é quem compra o serviço ou produto como destinatário
final, pra uso próprio: o paciente, o aluno, a pessoa que contratou a festa. Empresa
contratando pra atividade dela (a agência que contrata o designer, a loja que compra
do fornecedor) é relação entre iguais, e vale o que foi assinado. Na dúvida, tratar
como consumidor: o teto de 2% cabe nos dois casos, e ninguém contesta multa menor.

---

## O que a lei proíbe na cobrança

| Proibido | Onde está | O que vira na prática |
|---|---|---|
| Expor o devedor ao ridículo, constranger, ameaçar | [CDC art. 42](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | nada de "vou postar", nada de aviso no mural, nada de "você vai ser processado" sem que isso esteja decidido |
| Ameaça, coação, afirmação falsa, interferir no trabalho, descanso ou lazer | [CDC art. 71](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm): crime, detenção de 3 meses a 1 ano e multa | ligação de madrugada, mensagem em série, ameaçar prisão (dívida civil não prende) |
| Documento de cobrança sem nome, endereço e CPF ou CNPJ do credor | [CDC art. 42-A](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | a notificação do D+30 leva a identificação completa; mensagem de WhatsApp também se identifica |
| Negativar sem avisar por escrito antes | [CDC art. 43 §2º](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | o aviso prévio é obrigação de quem inscreve; a mensagem do D+30 já cumpre a função se disser o prazo e a consequência |
| Manter registro negativo por mais de 5 anos | [CDC art. 43 §1º](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | dívida velha não volta pro cadastro |
| Cobrar dívida prescrita como se fosse exigível | [CC art. 206 §5º, I e II](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm): 5 anos pra dívida líquida escrita em contrato ou recibo e pra honorário de profissional liberal; sem documento, o prazo pode ser o geral de 10 anos do [art. 205](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) | depois do prazo, sem ação, a dívida existe mas não se cobra na Justiça nem se negativa. O `scripts/regua.js` marca a parcela que passou de 5 anos e tira ela do valor cobrável; quem confirma o prazo do caso é advogado |

Tudo conferido no texto do Planalto em 22/09/2026.

**Palavras que não entram em mensagem de cobrança:** caloteiro, inadimplente (na
mensagem; no arquivo interno pode), "última chance", "medidas cabíveis" sem dizer quais,
"vou ter que", "infelizmente", "constrangimento". E emoji nenhum: cobrança com carinha
soa deboche.

**Palavras que funcionam:** "não constou aqui", "aconteceu alguma coisa?", "qual data
fica boa pra você?", "posso dividir", "à vista sai sem os encargos", "fico no aguardo
até sexta".

---

## Depois do D+30: as saídas, com custo e pré-requisito

| Saída | Serve pra | O que precisa | Fonte |
|---|---|---|---|
| **Acordo por escrito** | qualquer valor; primeira opção sempre | novo prazo, valor, forma; assinatura ou aceite por mensagem guardada | boa prática, sem lei específica |
| **Protesto em cartório** | dívida documentada (contrato assinado, nota, boleto, duplicata) | o documento, o endereço do devedor; o cartório intima e registra em 3 dias úteis | [Lei 9.492/1997 arts. 1º, 12 e 14](https://www.planalto.gov.br/ccivil_03/leis/l9492.htm). Conferido em 22/09/2026 |
| **Negativação (SPC, Serasa)** | quem tem contrato com a entidade; ME e MEI entram por associação comercial | aviso prévio por escrito ao devedor | CDC art. 43 §2º |
| **Juizado Especial Cível** | causa até 40 salários mínimos (art. 3º); até 20 a parte vai sem advogado (art. 9º) | pessoa física capaz, ME ou EPP como autora (art. 8º §1º); contrato, mensagens e comprovante da entrega | [Lei 9.099/1995 arts. 3º, 8º e 9º](https://www.planalto.gov.br/ccivil_03/leis/l9099.htm). Conferido em 23/09/2026 |
| **Advogado e ação comum** | valor alto ou cliente que contesta o serviço | tudo acima, mais o honorário | conversa com advogado |

Antes de qualquer uma delas, conferir que o serviço foi entregue como combinado. Cliente
que reclama da entrega não é inadimplente: é reclamação, e vai pro `/retencao` ou pra
resolução do problema antes de qualquer cobrança. Cobrar em cima de reclamação aberta é
o caminho mais curto pro juizado do lado errado.

---

## Sinais no arquivo de cobrança

O que o `financeiro/cobranca-<mes>.md` costuma revelar, e o que fazer com cada sinal:

| Sinal | O que costuma significar | Pra onde vai |
|---|---|---|
| Mesmo cliente atrasado três meses seguidos | a mensalidade não cabe no orçamento dele, ou o serviço perdeu valor | `/retencao` antes da próxima cobrança |
| Atraso concentrado numa forma de pagamento (boleto) | atrito no meio, não no cliente | trocar pra Pix com link no D-3 |
| Metade da carteira atrasa nos primeiros dias | vencimento em data ruim (antes do salário) | mover o vencimento pro dia 10 no `/contrato` |
| Parcela sem contrato nem recibo | sem cláusula, sem multa; só juros pela taxa legal | `/contrato` pros próximos; esta cobra-se sem encargo |
| Total recuperável acima de um mês de faturamento | cobrança virou prioridade do mês | `/caixa` e `/tarefas` |

---

## Fontes consultadas

- Código de Defesa do Consumidor, texto compilado no Planalto: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm (arts. 42, 42-A, 43, 52 e 71)
- Código Civil, texto compilado: https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm (arts. 206, 389, 397, 406, 412 e 413)
- Lei 14.905/2024 (taxa legal e Lei da Usura entre pessoas jurídicas): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14905.htm
- Decreto 22.626/1933, Lei da Usura: https://www.planalto.gov.br/ccivil_03/decreto/d22626.htm
- Decreto 2.181/1997 art. 13, XIX, que trata a multa de mora acima de 2% como prática infrativa: https://www.planalto.gov.br/ccivil_03/decreto/d2181.htm
- Resolução CMN 5.171/2024, metodologia da taxa legal: https://www.bcb.gov.br/content/estabilidadefinanceira/especialnor/Resolu%C3%A7%C3%A3o5171.pdf
- Lei 9.492/1997, protesto: https://www.planalto.gov.br/ccivil_03/leis/l9492.htm
- Lei 9.099/1995, juizados especiais: https://www.planalto.gov.br/ccivil_03/leis/l9099.htm
- Cobrativa, "CDC e cobrança: o que pode e o que não pode" (horário comercial e canal como prática, não como lei): https://cobrativa.com.br/blog/cdc-cobranca-o-que-pode-o-que-nao-pode
- Neofin, "Mensagem de cobrança" (estrutura por estágio; a régua daqui é mais curta e datada em dia útil): https://www.neofin.com.br/blog/mensagem-de-cobranca
- marketingskills, churn-prevention (dunning de cartão via Stripe; útil como contraste, não como modelo, porque lá o cobrado é a máquina e aqui é a pessoa): https://github.com/coreyhaines31/marketingskills/blob/main/skills/churn-prevention/SKILL.md
