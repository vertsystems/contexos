# Retenção — quem some e quem cancela

Referência do `/retencao`. Não é o workflow: é o que a skill consulta pra classificar a
base, ler os três números, montar a pesquisa de saída e escolher a oferta por motivo sem
improvisar. Vale pra qualquer negócio de mensalidade: academia, clínica com plano,
agência com contrato mensal, curso por assinatura, escola de idioma, box de assinatura.

Conferido em 22/09/2026. O que tem fonte está com o link; o que não tem está marcado.

---

## Os três grupos

| Grupo | Quem é | O que o dono precisa fazer |
|---|---|---|
| **Ativo** | Paga e usa. Apareceu no período, não reclamou, não pediu pausa | Nada além de entregar bem. Não mandar mensagem "só pra ver se está tudo bem" |
| **Sumido** | Paga e não usa, ou usa e reclamou, ou pediu pausa. É o cancelamento em câmera lenta | Contato humano nesta semana, com motivo concreto. É aqui que a retenção acontece |
| **Cancelado** | Pediu pra sair, ou parou de pagar e não voltou | Pesquisa de saída de três perguntas e, se o motivo permitir, uma oferta. Depois, porta aberta |

O grupo do meio é o que ninguém olha, e é onde está o dinheiro. Quem cancela avisou antes:
parou de vir, parou de abrir o relatório, mandou uma reclamação e ficou em silêncio. A
diferença entre 3% e 6% de churn ao mês costuma estar em quantos sumidos alguém ligou.

Cliente com **boleto vencido ou cartão recusado** não está em nenhum dos três grupos: está
em cobrança, e a régua é do `/cobranca`. O script marca esse caso como `inadimplente`, numa
lista à parte e fora da receita em risco. Só entra aqui se, depois de pagar, continuar sem
aparecer.

Quem **já pediu pra cancelar com data à frente** (o plano só termina no dia 15 do mês que
vem) é sumido, e o primeiro da fila: ainda paga e a conversa ainda existe.

---

## O sinal de "sumido" por tipo de negócio

O limiar é ponto de partida. Calibrar com o dono: ele sabe em quantos dias o aluno que
sumiu vira o aluno que cancelou.

| Negócio | Sinal de sumido | Limiar sugerido | Onde o dado está |
|---|---|---|---|
| Academia, studio, crossfit | Sem check-in | 14 dias (mensal), 21 dias (plano anual) | Catraca ou app de treino |
| Clínica com plano ou pacote | Faltou à sessão do mês, ou não remarcou | 1 sessão perdida sem remarcação | Agenda |
| Agência, contrato mensal de serviço | Não respondeu, não aprovou, não abriu o relatório | 10 dias úteis sem resposta (`--uteis` no script) | E-mail e WhatsApp |
| Curso ou comunidade por assinatura | Sem login, não abriu aula nova | 14 dias sem acesso | Plataforma (Hotmart, Kiwify, área de membros) |
| Escola de idioma, aula particular | Faltou duas aulas seguidas | 2 faltas | Diário de presença |
| Box, cesta, entrega recorrente | Pediu pra pular a entrega, não avaliou | 1 pulo ou 2 entregas sem retorno | Sistema de assinatura |

Três sinais valem pra todo negócio, independente do limiar: **reclamou e ficou em
silêncio**, **pediu pausa** e **perguntou como cancelar**. Cada um sozinho já põe o
cliente no grupo dos sumidos.

---

## Os três números

Sempre calculados por `scripts/retencao.js`, nunca de cabeça. A conta:

```
churn de clientes  = cancelados no mês que já estavam na base ÷ clientes no início do mês
retenção           = (clientes no início − cancelados da base) ÷ clientes no início
receita em risco   = soma da mensalidade de todo mundo no grupo dos sumidos
churn de receita   = mensalidade dos cancelados da base ÷ mensalidade total no início
```

Dois erros que a conta de cabeça comete: dividir pelo total do **fim** do mês (o número
sai menor do que é) e contar quem entrou e saiu dentro do mês como churn da base (ele
não estava no início, então não pode ter saído dela). O script lista esse cliente à
parte.

**Vida média** = 1 ÷ churn mensal. Com 5% ao mês, o cliente fica em média 20 meses. É
aproximação, e só vale com três meses ou mais de histórico; um mês bom ou ruim distorce
tudo.

### O que é normal

| Referência | Churn mensal | De onde vem |
|---|---|---|
| SaaS pra consumidor | abaixo de 5% | marketingskills, churn-prevention (github.com/coreyhaines31/marketingskills/blob/main/skills/churn-prevention/SKILL.md), lido em 22/09/2026 |
| SaaS pra empresa | abaixo de 2% | mesma fonte |
| Academia e clínica no Brasil | [a confirmar] | Não há número público com metodologia aberta. Não colocar número de blog de sistema de gestão como se fosse do mercado |

O número que importa não é o do mercado: é o do próprio negócio mês contra mês. Três
meses de série já dizem se está piorando.

---

## A pesquisa de saída (três perguntas)

Mais que três, ninguém responde. Menos que três, não dá pra agir. Mandar no dia do
cancelamento, pelo canal em que o cliente fala com o negócio, sem formulário quando der.

1. **"O que pesou mais na decisão?"** com cinco opções e um "outro" livre: preço, não
   estava usando, mudança na rotina ou de cidade, não ficou como esperava, encontrei
   outro lugar
2. **"Teve algo que a gente poderia ter feito diferente?"** livre, uma linha
3. **"Se as coisas mudarem, posso te chamar de volta?"** sim ou não. É a autorização
   pra reativação (LGPD) e o tamanho da porta que ficou aberta

O que vier na pergunta 2 vai pra `_memoria/publico.md` na palavra do cliente. É a
objeção mais cara que o negócio vai coletar: veio de quem pagou.

---

## A oferta por motivo

Oferta genérica ("volta que eu te dou desconto") ensina o cliente a cancelar pra ganhar
desconto. A oferta certa responde ao motivo que ele deu.

| Motivo | Primeira oferta | Se recusar | Nunca |
|---|---|---|---|
| **Preço** | Desconto por tempo: 20 a 30% por 2 ou 3 meses, com data de fim escrita | Plano menor (downgrade) | Desconto acima de 50%, ou sem prazo |
| **Não estava usando** | Pausa de 1 a 3 meses com data de volta | Sessão de retomada: treino novo, reunião de replanejamento, aula ao vivo | Cobrar a pausa como se fosse uso |
| **Mudança de rotina, cidade, vida** | Pausa com data | Encerrar bem, com a porta aberta | Insistir. Ele não está reclamando de você |
| **Não ficou como esperava** | Resolver o problema primeiro, com prazo e nome de quem cuida | Crédito ou mês de cortesia, só depois de resolvido | Oferecer desconto em cima de problema aberto |
| **Encontrou outro lugar** | Perguntar o que o outro tem. Se for algo que dá pra fazer, propor | Deixar ir e pedir a pergunta 3 | Falar mal do concorrente |
| **Fechou o negócio, perdeu o emprego** | Nenhuma oferta. Agradecer e encerrar sem multa | Manter contato humano, sem venda | Cobrar fidelidade de quem está sem renda |

Os intervalos (20 a 30%, 1 a 3 meses, teto de 50%) vêm da referência de churn-prevention
citada acima e são de SaaS. Pra negócio local, a régua do dono manda: desconto que não
cobre o custo variável não é retenção, é prejuízo adiado. A conta de quanto cabe está no
`/caixa` (margem de contribuição por cliente).

**Regras da oferta:**

- Uma oferta por cliente por ano. Quem aceitou desconto em março não recebe outro em
  junho. Registrar na planilha de saúde, coluna Motivo
- Pausa tem data de volta escrita e um lembrete três dias antes. Pausa sem data é
  cancelamento com atraso
- Desconto tem data de fim e o preço cheio escrito na mesma mensagem. Sem isso, o
  cliente descobre o reajuste no boleto e cancela de novo, com raiva
- A oferta é dita uma vez. Se ele recusou, a próxima mensagem é a pergunta 3, não outra
  oferta

---

## O que a lei diz sobre cancelar

Isto não substitui advogado. É o mínimo pra não montar oferta ou processo de
cancelamento que o Procon derruba.

| Ponto | O que a norma diz, na letra | Fonte |
|---|---|---|
| Dificultar o cancelamento | O CDC proíbe "exigir do consumidor vantagem manifestamente excessiva" (art. 39, V) e anula cláusula que o ponha "em desvantagem exagerada" (art. 51, IV). Cancelamento que só sai presencialmente, com fila ou "só com o gerente" é enquadrado aí por Procon e tribunais — a leitura é do caso concreto, não do texto do artigo, e é [a confirmar com advogado] antes de virar resposta a quem ameaça processo | Lei 8.078/1990, planalto.gov.br/ccivil_03/leis/l8078compilado.htm, conferido em 22/09/2026 |
| Multa de fidelidade | Cláusula que põe o consumidor em desvantagem exagerada é nula (CDC art. 51, IV). Multa só vale se estava no contrato assinado, e proporcional ao tempo que falta | Mesma fonte. A proporcionalidade é entendimento dos tribunais: [a confirmar com advogado o percentual do contrato] |
| Cancelar pelo mesmo canal | Para os "serviços regulados pelo Poder Executivo federal" (art. 1º) — telefonia, banco, plano de saúde, energia —, "o pedido de cancelamento será permitido e assegurado ao consumidor por todos os meios disponíveis para a contratação do serviço", com efeitos imediatos (Decreto 11.034/2022, art. 14, I e II). Academia, clínica e agência estão fora do escopo; a régua vale como boa prática, não como obrigação legal | planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11034.htm, conferido em 22/09/2026 |
| Devolver o que foi pago | É nula a cláusula que "subtraia ao consumidor a opção de reembolso da quantia já paga" (CDC art. 51, II). Plano anual pago à vista e cancelado no meio devolve a parte não usada, descontada a multa contratual válida | Lei 8.078/1990, mesma URL |
| Contatar quem saiu | Dado de cliente cancelado só pode ser usado pra reativação com base legal: consentimento (a pergunta 3) ou legítimo interesse, com opção de sair em toda mensagem (LGPD art. 7º, bases legais, e art. 18, direitos do titular) | Lei 13.709/2018, planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm, conferido em 22/09/2026 |

Regra prática, que vale mesmo para quem está fora do decreto: **quem pediu pra sair, sai
no mesmo dia, pelo mesmo canal, sem passar por ninguém.** A oferta de retenção vem antes
da confirmação, uma vez, e não segura o cancelamento se ele disser não. É o que mantém a
avaliação de uma estrela longe. Nada aqui substitui advogado: multa, reembolso de plano
anual e ameaça de processo passam por um antes de virar mensagem.

---

## A mensagem pra quem sumiu

O que separa mensagem de retenção de spam é o motivo concreto e o tamanho.

- **Nome, um fato, uma pergunta.** "Diego, faz três semanas que você não aparece. Mudou
  alguma coisa na rotina?" Cabe em duas linhas e cabe numa resposta
- **Nunca "sentimos sua falta"** nem "notamos sua ausência". É frase de sistema, e o
  cliente sabe
- **Quem reclamou recebe resposta sobre a reclamação**, não convite pra voltar. Uma
  mensagem, dois assuntos, nenhuma resposta
- **Ligar acima de 30 dias.** Texto pra quem sumiu há um mês vira mais um texto ignorado.
  Ligação de dois minutos do dono muda a decisão
- **Pausa vencida se pergunta, não se cobra.** "Sua pausa terminou dia 20. Volta essa
  semana ou prefere esticar?" Duas saídas, as duas boas pro negócio

O formato da mensagem no canal (tamanho, emoji, hora) é o `/whatsapp` que calibra. A
voz é `_memoria/preferencias.md`.

---

## O que medir todo mês

| Medida | Conta | O que ela diz |
|---|---|---|
| Churn de clientes | do script | Se a base está encolhendo por baixo |
| Receita em risco | do script | Quanto do mês que vem depende dos contatos desta semana |
| Sumidos contatados | contatados ÷ sumidos | Se o processo roda ou só o relatório sai |
| Sumidos que voltaram | voltaram ÷ contatados | Se a mensagem funciona |
| Ofertas aceitas | aceitas ÷ oferecidas | Se a oferta é boa ou só barata. Referência de SaaS: 15 a 25% aceitam (fonte acima) |
| Cancelamentos revertidos | ficaram ÷ pediram pra cancelar | Referência de SaaS: 25 a 35% (fonte acima). Muito acima disso, provavelmente está se dificultando a saída |
| Pausas que voltaram | voltaram ÷ pausadas | Referência de SaaS: 60 a 80% (fonte acima). Abaixo disso, a pausa é cancelamento disfarçado |

As três primeiras saem do script. As outras saem da mão do dono: a planilha de saúde tem
as colunas **Contatado em** e **Resultado** (voltou, prometeu voltar, sem resposta,
aceitou oferta, cancelou) justamente pra isso, e a aba Saúde soma sozinha.

Três meses de série em `vendas/retencao/` já mostram a direção. Um mês isolado não diz
nada, e comparar com o mercado diz menos ainda.

---

## Fontes

- marketingskills, skill churn-prevention (tipos de churn, sinais de risco, oferta por
  motivo, benchmarks de SaaS): github.com/coreyhaines31/marketingskills/blob/main/skills/churn-prevention/SKILL.md, lido em 22/09/2026
- Código de Defesa do Consumidor, Lei 8.078/1990, arts. 39 e 51: planalto.gov.br/ccivil_03/leis/l8078compilado.htm, conferido em 22/09/2026
- Decreto 11.034/2022, regras do SAC pra serviço regulado (art. 1º, escopo; art. 14, pedido de cancelamento): planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11034.htm, conferido em 22/09/2026
- LGPD, Lei 13.709/2018, arts. 7 e 18: planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm, conferido em 22/09/2026
