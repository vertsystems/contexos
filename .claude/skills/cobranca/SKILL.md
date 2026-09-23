---
name: cobranca
description: >
  Cobra parcela e mensalidade atrasada sem perder o cliente nem passar do que a lei permite:
  lê a lista de quem deve (planilha, export do sistema ou conversa), calcula o valor corrigido
  por comando (multa e juros pro rata, com fonte e data), monta a régua de cinco toques em dia
  útil e escreve as mensagens de WhatsApp e e-mail no tom da marca, com o total recuperável.
  Use quando o usuário disser "tem cliente me devendo", "como cobro sem ser chato", "a
  mensalidade atrasou", "quanto eu posso cobrar de juros", "o cliente sumiu depois do boleto",
  "quem eu cobro hoje", "mensagem de cobrança", "vou negativar o cliente", "posso protestar",
  "quanto tenho a receber atrasado", ou /cobranca.
---

# /cobranca — O dinheiro que já é seu

> **Convenção de pastas:** a saída vai em `financeiro/cobranca-<AAAA-MM>.md`. Na convenção **por cliente**, a cobrança dos próprios clientes fica na raiz (`financeiro/`); só entra em `clientes/<Nome>/financeiro/` quando o usuário cobra em nome do cliente dele. A pasta nasce na primeira cobrança.

O atrasado é o dinheiro mais barato de recuperar que existe: o serviço já foi entregue, o
cliente já disse sim, e a maior parte não pagou porque esqueceu, trocou de cartão ou está
esperando alguém lembrar. Mesmo assim, quase todo dono de negócio pequeno adia a cobrança
por vergonha, e quando cobra, faz das duas formas que perdem: manda "oi, tudo bem?" sem
valor nem data, ou manda o juro errado num tom que dá ao cliente o motivo pra não pagar.

> **Isto não é aconselhamento jurídico.** A skill calcula o que o contrato e a lei
> permitem e escreve a mensagem. Protesto, negativação, juizado e cliente que contesta o
> serviço passam por advogado antes de virar ação. Dizer isso na entrega, uma vez.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que se vende, se o cliente é pessoa ou empresa, forma de pagamento habitual, CNPJ e endereço (a notificação formal exige)
- **Tom:** `_memoria/preferencias.md` — cobrança no tom errado é a mensagem que o cliente guarda
- **A palavra do cliente:** `_memoria/publico.md`, se existir
- **A cláusula de atraso:** o contrato do `/contrato` em `contratos/`, quando existir. É de lá que saem multa e juros; sem contrato, sem multa
- **Referência:** `templates/financeiro/cobranca.md` — a régua, a tabela de encargos com fonte e data, o que a lei proíbe, as saídas depois do D+30
- **Script:** `scripts/regua.js` — valor corrigido pro rata e régua datada em dia útil, a partir de CSV, `.xlsx`, JSON ou de uma parcela na linha de comando
- **Conferência:** `node scripts/verificar.js datas`, `tabela` e `texto`
- **Saída:** `financeiro/cobranca-<AAAA-MM>.md` (quem cobrar hoje, tabela corrigida, régua e mensagens) e os toques em `tarefas.md`

---

## Workflow

### Passo 1 — Levantar quem deve

Se ele mandou planilha, CSV ou export do sistema em `dados/`, ler e seguir. O script
reconhece cabeçalho parecido com "Cliente, Referente, Valor, Vencimento, WhatsApp, Pago",
e mais duas colunas que mudam o resultado quando existem:

| Coluna | O que faz |
|---|---|
| **Tipo** | `consumidor` ou `b2b` por linha. Vale mais que o padrão da rodada, e é o que segura o teto de 2% na linha do consumidor dentro de uma lista de empresas |
| **Último contato** | a data do último toque que já saiu. Sem ela, o script assume que nada foi enviado e repete o estágio; com ela, pula o que já foi |

Coluna com outro nome, renomear num CSV novo em vez de editar o arquivo dele. PDF ou print
do sistema o assistente lê pela ferramenta Read e transcreve num JSON
(`[{"cliente","referente","valor","vencimento","telefone","ultimoContato"}]`), mostrando a
transcrição antes de calcular, porque um dígito trocado aqui vira cobrança indevida.

Se não mandou nada, uma mensagem só, não uma pergunta por vez:

> 1. "Quem está devendo, quanto, e qual era o vencimento de cada parcela?"
> 2. "Esses clientes são pessoas (paciente, aluno, festa) ou empresas?"
> 3. "Tem contrato ou recibo dizendo o que acontece no atraso? Qual a multa e o juro que está lá?"
> 4. "Como eles costumam pagar: Pix, boleto, cartão?"
> 5. "Você já cobrou algum deles? Quando foi a última mensagem pra cada um?"
> 6. "Algum deles reclamou do serviço?"

A pergunta 5 evita o pior erro de operação: mandar de novo o lembrete que ele já mandou
ontem. A 6 separa cobrança de reclamação. Cliente que reclamou não entra na régua: vai pro
`/retencao` ou pra resolução do problema, e só volta pra cá depois.

### Passo 2 — Descobrir a regra de encargo

Três situações, e a skill nunca chuta qual é:

| Situação | Multa | Juros | Como o script roda |
|---|---|---|---|
| Contrato com cláusula, cliente consumidor | a do contrato, até 2% | o do contrato, na praxe 1% ao mês | `--multa 2 --juros 1` (padrão) |
| Contrato com cláusula, empresa com empresa | a do contrato | o do contrato | `--tipo b2b --multa X --juros Y` |
| Sem contrato nem recibo com cláusula | nenhuma | taxa legal do Banco Central, `[a confirmar]` | `--sem-clausula` |

Consumidor com multa acima de 2% no contrato: na linha de comando o script recusa e explica
(CDC art. 52 §1º); dentro de uma planilha, aplica o teto na linha dele e avisa qual foi. Não
é o script sendo chato. Cobrar acima do teto é infração administrativa, e o cliente que
pagar o excesso tem direito a receber o dobro do que pagou a mais. Se o usuário insistir, a
resposta é "o contrato precisa mudar pros próximos, e este cobra 2%".

Juro acima de 1% ao mês, mesmo entre empresas, sai com aviso e pede advogado antes de
cobrar. Correção monetária (`--correcao`) só entra com índice do contrato ou IPCA
acumulado do período conferido no IBGE, com a data.

### Passo 3 — Calcular por comando

```bash
# lista em CSV, planilha ou JSON; a data de hoje é o padrão
node scripts/regua.js dados/atrasados.csv --saida financeiro/cobranca-2026-09.md

# uma parcela só, direto da conversa
node scripts/regua.js --valor "R$ 1.200,00" --vencimento 19/09/2026 --cliente "Carlos" --referente "Parcela 2/4 do site"

# entre empresas, com a cláusula que foi assinada
node scripts/regua.js dados/atrasados.xlsx --tipo b2b --multa 10 --juros 1 --saida financeiro/cobranca-2026-09.md

# sem cláusula nenhuma no papel: multa zero, juros pela taxa legal
node scripts/regua.js dados/atrasados.csv --sem-clausula --saida financeiro/cobranca-2026-09.md

# feriado da cidade que fecha banco, e outra data de referência
node scripts/regua.js dados/atrasados.csv --feriado 25/01 --hoje 22/09/2026 --saida financeiro/cobranca-2026-09.md
```

O script faz cinco coisas que a conta de cabeça erra: empurra vencimento de sábado,
domingo e feriado pro dia útil seguinte antes de contar o atraso; calcula o juro por dia
(1% ao mês em 7 dias sobre R$ 1.200 é R$ 2,80, não R$ 12,00); data a régua em dia útil,
com o dia da semana escrito; propõe o parcelamento do D+15 em centavos que fecham; e marca
a parcela que passou de cinco anos do vencimento, tirando ela da conta do que é cobrável
(CC art. 206 §5º). Tudo sai com a conta ao lado, pro cliente conferir.

Depois, sempre:

```bash
node scripts/verificar.js datas financeiro/cobranca-2026-09.md
node scripts/verificar.js tabela financeiro/cobranca-2026-09.md
```

Precisa terminar em "Tudo certo." nos dois. Se o `tabela` reclamar de uma coluna de
dinheiro, a soma está errada mesmo: rodar o script de novo a partir do dado bruto, nunca
corrigir número na mão. Se reclamar de uma coluna sem linha de Total (Atraso, Vencimento),
o que atrapalhou foi número em negrito perto da tabela, escrito na edição; tirar o negrito
resolve.

### Passo 4 — Ver quem recebe mensagem hoje

O arquivo do script já responde isso, e vale saber a regra que ele usa, porque o usuário
pergunta. Entra na lista de hoje quem tem um toque caindo hoje, e também quem tem um toque
que já venceu sem registro de envio: a parcela de 12 dias cujo D+7 passou há cinco dias
recebe o texto do D+7 agora, não o do D+15. Quem tem "Último contato" depois da data do
toque fica de fora, porque aquela mensagem já foi. A régua:

| Toque | Quando | O que faz |
|---|---|---|
| **D-3** | 3 dias antes | lembrete com valor, data e o jeito de pagar |
| **D+1** | dia útil seguinte | "não constou aqui, aconteceu alguma coisa?" |
| **D+7** | uma semana | cobrança com valor corrigido e pedido de data |
| **D+15** | duas semanas | à vista sem encargo, ou entrada mais parcelas |
| **D+30** | um mês | notificação formal, com prazo e o que vem depois |

Quem está no D+7 recebe a mensagem do D+7, não as três anteriores juntas. Passado o D+30 a
régua acabou: o script joga a parcela na seção "Depois do D+30", com a data de prescrição,
o acordo possível em parcelas e as saídas (acordo, protesto, negativação, juizado). Quem
ainda não recebeu a notificação formal recebe hoje, e é o último texto que sai. Depois
disso é decisão com custo, nunca um sexto lembrete. Parcela prescrita não entra em cobrança
nenhuma: só acordo, se o cliente quiser pagar.

Cliente parado há meses sem parcela em aberto não é cobrança; é reativação, e isso é
`/pos-venda`. Cliente que quer cancelar por causa da cobrança é `/retencao`.

### Passo 5 — Escrever as mensagens

Na voz de `preferencias.md`, no canal dele, curta. Toda mensagem tem: quem está falando,
o que é (referente), quanto, até quando, como pagar, e uma pergunta só. O script imprime,
em cada linha de "Quem cobrar hoje", o que aquele toque precisa conter; usar aquilo como
lista de checagem. O `/whatsapp` calibra o formato quando o negócio já tem kit de respostas.

Duas variantes por toque, temperatura diferente. O valor corrigido aparece com a conta
quando é cobrado (D+7 em diante), nunca antes, e o número é copiado do arquivo do script,
não recalculado na conversa.

```
D+1, variante A
Oi, Ana. Aqui é a Bia, da Estúdio Traço. Não constou aqui o pagamento da
mensalidade de setembro (R$ 350,00, venceu quinta, dia 10). Aconteceu alguma
coisa? Se preferir, segue o Pix de novo: [chave]. Qualquer dúvida é só me chamar.

D+7, variante A
Oi, Ana. A mensalidade de setembro segue em aberto. Com os 12 dias de atraso,
fica em R$ 358,40 (R$ 350,00 + R$ 7,00 de multa de 2% + R$ 1,40 de juros de 1%
ao mês, como está no contrato). Qual data fica boa pra você? Pix: [chave].

D+15, variante A
Oi, Ana. Queria resolver isso com você. Duas opções: à vista até sexta (25/09)
eu abro mão dos encargos e fica R$ 350,00; ou entrada de R$ 119,48 e mais duas
de R$ 119,46 (fechando R$ 358,40). Qual fica melhor?
```

O D+30 é outro texto: formal, por e-mail ou carta, com nome, endereço e CNPJ ou CPF de
quem cobra (o CDC art. 42-A exige), o débito discriminado, prazo final com a data escrita
(cinco dias úteis é o usual) e a consequência que o usuário **de fato** vai executar.
Ameaça vazia é proibida (CDC art. 42) e é o que mais aparece em cobrança de gente sem
assessoria.

O que nunca entra: "caloteiro", "última chance", "medidas cabíveis" sem dizer quais,
emoji, ameaça de prisão (dívida civil não prende), mensagem a terceiro. A lista completa
está no molde.

### Passo 6 — Montar o arquivo

O script escreve o arquivo com as tabelas, a régua e as seções de decisão. O assistente
acrescenta três seções e não toca em nenhuma linha de tabela gerada:

```markdown
# Cobrança — <mês>/<ano>                     ← do script; pode virar "Cobrança — <negócio>, setembro"
> Referência, regra aplicada, fonte e a linha de que não é aconselhamento jurídico  ← do script

## O mês em uma frase                        ← do assistente
[Quantas parcelas, quanto é cobrável, quem cobrar hoje. Número sem negrito.]

## Quem cobrar hoje                          ← do script
[cada cliente com o toque, o valor original, o corrigido, o canal e o que a mensagem precisa ter]

## Parcelas em aberto                        ← do script
[tabela com a linha Total, o que está em aberto e o que já prescreveu]

## Como cada valor foi calculado              ← do script

## Mensagens de hoje                          ← do assistente
### <Cliente> — <toque>, variante A
[texto pronto pra copiar]
### <Cliente> — <toque>, variante B
[texto pronto pra copiar]

## Se ele responder                           ← do assistente
[paga: confirmar o recebimento e dar baixa | pede prazo: aceitar com data e registrar
como acordo por escrito | contesta o serviço: sai da régua e vai pro /retencao | silêncio:
o próximo toque, na data que o arquivo já traz]

## Régua por parcela                          ← do script
## Depois do D+30                             ← do script, quando houver
## Feriados considerados                       ← do script
## Avisos do cálculo                           ← do script, quando houver
```

Antes de entregar:

```bash
node scripts/verificar.js datas financeiro/cobranca-<AAAA-MM>.md
node scripts/verificar.js tabela financeiro/cobranca-<AAAA-MM>.md
node scripts/verificar.js texto financeiro/cobranca-<AAAA-MM>.md
```

### Passo 7 — Levar os toques pra `tarefas.md`

Régua que fica só no arquivo não cobra ninguém. Cada toque futuro vira item no formato do
`/tarefas`, com a origem:

- **Agora (essa semana):** os toques dos próximos 7 dias: `- [ ] Cobrar Ana (D+15, parcelamento) — 25/09/2026 (sex) (/cobranca)`
- **Esperando resposta:** a mensagem que já foi: `- [ ] Ana — D+7 enviado 17/09, próximo toque 25/09 (/cobranca)`
- **Depois:** o D+30 e a decisão de quem passou dele

Se o item já existe, atualizar a data. O `/revisao-semanal` puxa pra "Agora" o que vence
na semana, e o `/rotina` pode agendar o "rodar o regua.js toda segunda" pra quem tem
mensalidade.

### Passo 8 — Entregar e fechar o ciclo

A entrega é curta: quanto é cobrável, quem cobrar hoje com a mensagem pronta, o próximo
toque de cada um com dia da semana, e a frase de que isto não substitui advogado. O
arquivo inteiro fica em `financeiro/`.

Duas anotações mantêm a próxima rodada honesta. Ao mandar cada mensagem, escrever a data na
coluna "Último contato" da lista de origem: é o que evita cobrar duas vezes o mesmo toque
na semana seguinte. E quando o pagamento cair, marcar a parcela como paga e mandar a
confirmação ("recebido, obrigado"), o toque que quase ninguém dá e o que faz o cliente
pagar em dia no mês seguinte.

Parcela que virou acordo entra no `/contrato` como aditivo curto por escrito. O total que
entrou vai pro `/caixa` do mês.

---

## Regras

- **Nunca inventar multa, juro ou artigo de lei.** Multa e juro saem do contrato do usuário; sem contrato, sem multa, e o juro é a taxa legal marcada `[a confirmar]` com o link do Banco Central. Toda regra citada leva a URL do Planalto e a data de conferência do molde; se a conferência tem mais de um ano, rodar WebSearch antes de entregar
- **Todo valor passou pelo comando.** O corrigido nasce do `scripts/regua.js` e é conferido pelo `verificar.js tabela`; a régua é conferida pelo `verificar.js datas`. Número editado na mão que quebrar a conferência é regenerado, não corrigido
- **Consumidor tem teto: 2% de multa** (CDC art. 52 §1º). Na dúvida entre consumidor e empresa, tratar como consumidor. O script recusa a rodada acima disso, ou aplica o teto na linha e avisa
- **Juro é por dia.** 1% ao mês em 7 dias é 0,23%, não 1%. Cobrar o mês cheio no segundo dia é cobrança indevida: se o cliente pagar esse excesso, tem direito a receber o dobro do que pagou a mais (CDC art. 42, parágrafo único), e cobrar acima do teto do CDC é prática infrativa punível pelo Procon (Decreto 2.181/1997 art. 13, XIX)
- **Nada de constranger** (CDC art. 42 e art. 71): sem terceiro, sem grupo, sem ameaça que não vai ser cumprida, uma mensagem por toque. Horário comercial não é lei federal, é o que Procon e juizado tratam como razoável, e a skill segue isso. A skill não escreve mensagem que viole a regra mesmo que o usuário peça; oferece a versão firme dentro dela
- **Toque nenhum em fim de semana ou feriado.** A régua sai do script em dia útil; se o usuário quiser mandar no sábado, é escolha dele, e a skill diz que a data do arquivo é outra
- **Não repetir toque que já foi.** A data do último contato entra na lista ou na conversa, e o script pula o estágio que já saiu. Sem essa informação, perguntar; insistência em série é o que vira reclamação no Procon
- **Reclamação não é inadimplência.** Cliente que contestou o serviço sai da régua até o problema fechar. Cobrar em cima de reclamação aberta é o caminho pro juizado do lado errado
- **A régua tem fim.** Cinco toques e acabou. Depois vem a notificação formal, se ela ainda não foi, e então decisão com custo (acordo, protesto, negativação, juizado), cada uma com pré-requisito no molde, e advogado quando o valor ou o caso pedir. A skill não manda o sexto lembrete
- **Não é aconselhamento jurídico.** Dizer na entrega, uma vez. Protesto, negativação, juizado, dívida antiga e cliente que contesta passam por advogado
- **Fronteira com as vizinhas:** o `/pos-venda` reativa cliente parado e orçamento sem resposta, sem parcela em aberto; o `/contrato` escreve a cláusula de atraso que esta skill lê; o `/caixa` fecha o mês com o que de fato entrou; o `/retencao` cuida de quem quer cancelar ou reclamou; o `/whatsapp` dá o formato do canal; o `/tarefas` guarda as datas. Esta skill é a parcela vencida e a régua, nada além
- **Dado de devedor é dado pessoal (LGPD).** Nome, valor e telefone ficam em `financeiro/` e `dados/`; não vão pra WebSearch, pra ferramenta externa nem pra exemplo de comando. A busca pergunta "multa de mora CDC", nunca "dívida do fulano". A lista de quem deve não circula fora do workspace sem o usuário autorizar, e a mensagem vai só pro devedor
- **Quando o resultado for ruim, dizer o resultado.** Parcela com 8 meses, cliente que sumiu, valor que não compensa juizado: escrever com o número e o próximo passo, sem suavizar. Dívida que passou de 5 anos sem ação prescreveu quando está em contrato ou recibo (CC art. 206 §5º, I; sem documento o prazo pode ser o geral de 10 anos do art. 205, e aí é advogado quem diz). O script marca essas parcelas e as tira do cobrável, em vez de manter a lista inflada
