# Confirmação de agenda — medir a falta, cobrar o que é justo, encher o horário

Referência do `/confirmacao-de-agenda`. O `scripts/no-show.js` faz a conta; este arquivo
diz o que conta como falta, como é a régua de toques, o que pode entrar na política de
cancelamento e onde cada profissão precisa parar e perguntar ao conselho.

Por que existe: horário vazio é o único prejuízo que não aparece em extrato nenhum. O
aluguel foi pago, a profissional estava lá, e a cadeira ficou vazia às 17h. Nenhuma
planilha registra isso como despesa, então ninguém mede. Quem mede se assusta. O número
fica entre 20% e 35%, e a conta dá milhares de reais por mês. É essa conta que faz a
política de cancelamento sair do papel.

Valores e artigos conferidos em 2026-09-22, e reconferidos na fonte oficial em 2026-09-23
(artigos do Código Civil, art. 59 do Código de Ética Médica, Parecer CREMERJ 06/2020 e as
duas faixas de mercado). O que tem lei ou conselho no meio muda, e cada linha diz onde
reconferir.

---

## O que é falta (e o que não é)

| Situação | Entra na base? | Conta como falta? |
|---|---|---|
| Compareceu | sim | não |
| Não veio e não avisou | sim | sim |
| Cancelou dentro do prazo da política (ex.: 24h antes) | não | não |
| Cancelou fora do prazo (tarde) | sim | sim, por padrão |
| Remarcou dentro do prazo | não | não |
| Horário futuro, ainda em aberto | não | não |

**Taxa de no-show = faltas ÷ (compareceu + faltas).** Cancelamento com antecedência fica
fora da base porque o horário pôde ser reaproveitado; cancelamento tardio entra porque
não pôde. O `--tardio-nao-conta` do script tira o tardio da base quando o negócio prefere
medir só o sumiço puro, mas aí o custo fica menor do que é.

**Período mínimo:** 4 semanas ou 30 horários, o que vier primeiro. Com menos que isso, uma
falta mexe a taxa em 3 pontos ou mais e a meta vira chute. O script avisa quando a
amostra é pequena.

**Custo por mês = horários no mês × ticket médio × taxa.** É o mesmo que faltas no mês ×
ticket. Ticket é o valor do horário, não o lucro: o custo fixo da hora já foi pago, então
o que se perdeu foi a receita inteira daquele slot.

O script faz essa conta em duas etapas, e é de propósito. Primeiro o custo do período
medido (faltas × ticket), depois o fator que leva o período pro mês (30,44 ÷ dias do
arquivo, ou 52 ÷ 12 quando a contagem é de uma semana). Assim cada multiplicação impressa
fecha na calculadora de quem ler o relatório, em vez de depender de uma contagem
fracionária de faltas arredondada na tela. Quando o arquivo cobre menos de duas semanas, o
valor mensal é projeção e o relatório escreve isso: número assim não vai pra proposta.

**Quando a falta se concentra no serviço caro, a média engana.** Se a exportação tem coluna
de valor, o relatório compara o ticket de quem faltou com a média geral e avisa quando a
diferença passa de 10%. Três faltas de R$ 350 doem mais que seis de R$ 120.

### O que o script entende na coluna de status

| O script lê como | Palavras aceitas (sem acento, maiúscula indiferente) |
|---|---|
| compareceu | compareceu, presente, presença, realizado, realizada, atendido, atendida, concluído, finalizado, feito, sim, ok |
| faltou | faltou, falta, faltante, no-show, não compareceu, não apareceu, ausente, ausência, absenteísmo, não veio, não |
| cancelou tarde | cancelou tarde, cancelamento tardio, tardia, cancelado no dia, cancelou em cima da hora |
| cancelou | cancelou, cancelado, cancelamento, desmarcou, remarcou, reagendado, transferido |
| em aberto | agendado, marcado, confirmado, não confirmado, aguardando confirmação, pendente, reservado, em aberto, em atendimento, vazio |

O script casa o status pelo nome exato e, quando não acha, procura um desses termos dentro
da frase, com o mínimo de cinco letras. Esse mínimo existe por um motivo prático: sem ele,
o "não" da lista de faltas transformava "Aguardando confirmação" e "Cancelado pelo
paciente" em no-show, e a taxa saía inventada pra cima.

Status fora dessa lista fica fora da base, e o relatório diz qual foi, na seção "Atenção".
"Encaixe", "Bloqueio", "Convênio" e "Sem informação" caem aí: ninguém adivinha se são
falta ou comparecimento. A exportação de quase todo sistema de agenda (Doctoralia,
iClinic, Trinks, Booksy, Google Agenda via planilha) cabe na tabela depois de um
"localizar e substituir".

---

## Referência de mercado

| Dado | Valor | Fonte | Conferido em |
|---|---|---|---|
| Faixa de no-show citada pra clínicas no Brasil | 20% a 30% | Versatilis, "Como Reduzir o No-Show da Clínica: 7 Estratégias" (versatilishealth.com.br/blog/como-reduzir-no-show), sem estudo primário | 2026-09-23 |
| Faixa citada pra clínicas sem processo ativo de confirmação | 20% a 35% | ByDoctor, "Como Reduzir Faltas de Pacientes com Lembretes Automáticos no WhatsApp" (bydoctor.com.br/blog/como-reduzir-faltas-consultas), 18/04/2026, sem estudo primário | 2026-09-23 |
| Queda esperada com confirmação ativa | 50% a 75% em menos de 60 dias | ByDoctor, mesmo artigo, número do fornecedor | 2026-09-23 |
| Dois contatos (48h antes e 2h antes) | é o ponto em que o lembrete reduz falta sem irritar; mais que isso não aparece como ganho | ByDoctor, mesmo artigo | 2026-09-23 |

Nenhum desses números vem de estudo público com amostra descrita; são o que fornecedores
de software observam na base deles. Servem pra dizer "você não está sozinho". Não
substituem a taxa medida. A que vale é a do arquivo do usuário.

---

## A régua de três toques

O primeiro toque não é lembrete: é o registro do combinado. Os outros dois são os únicos
lembretes. Mais que isso irrita e não reduz falta.

| Toque | Quando | Canal | O que tem | O que pede |
|---|---|---|---|---|
| **1. Na marcação** | no ato, mesma conversa | WhatsApp (ou o canal em que marcou) | data, hora, endereço, com quem, o que levar, a política de cancelamento em uma linha | nada; se houver sinal, o link ou a chave Pix |
| **2. Confirmação** | 48h antes (24h pra horário curto e barato) | WhatsApp | data e hora de novo, uma pergunta só | "confirma?" com opção clara de remarcar |
| **3. Lembrete do dia** | 2h a 3h antes | WhatsApp | hora e endereço, nada mais | nada |

Regras da régua:

- **Uma pergunta por mensagem.** O toque 2 pergunta uma coisa: confirma ou remarca. Não
  pede avaliação, não oferece pacote, não manda promoção
- **Quem confirmou no toque 2 recebe o toque 3 curto.** Quem não respondeu até 24h antes
  recebe uma ligação, não uma terceira mensagem. Ligação de 30 segundos resolve o que três
  mensagens não resolvem
- **Quem pediu remarcação sai da régua** e o horário vai pra lista de espera na hora
- **Horário marcado com menos de 48h** recebe só o toque 1 e o toque 3
- **Sem promoção no lembrete.** Lembrete é mensagem que a pessoa pediu ao marcar. Misturar
  oferta transforma em marketing, e aí precisa de outro consentimento (ver LGPD abaixo)
- **Nome, data e hora sempre escritos por extenso** ("quinta, 25/09, às 14h"), e o dia da
  semana conferido por comando (`node scripts/verificar.js datas`)

Quem automatiza (API do WhatsApp, sistema de agenda) precisa de modelo aprovado pela
plataforma pro toque 2 e 3; texto de lembrete é a categoria "utilidade". Quem manda na mão
usa a mensagem salva do `/whatsapp` e o item diário em `tarefas.md`.

---

## Política de cancelamento e remarcação

O que a política precisa responder, em uma página que cabe numa mensagem:

1. **Até quando pode cancelar ou remarcar sem custo.** 24h é o padrão de horário curto
   (corte, consulta, sessão); 48h pra procedimento longo ou que exige preparo (cirurgia,
   tatuagem, ensaio, evento); 7 dias pra bloqueio de dia inteiro
2. **O que acontece fora do prazo.** Perde o sinal, ou paga uma taxa fixa, ou o próximo
   horário só é marcado com sinal. Uma dessas três, não as três
3. **O que acontece na segunda falta.** A regra mais usada: a partir da segunda falta em
   seis meses, só marca com sinal
4. **Como cancelar.** Um canal, um jeito, sem burocracia. Cancelar tem que ser mais fácil
   que faltar
5. **O que o negócio faz quando é ele que cancela.** Reciprocidade: se o cliente perde o
   sinal por faltar, o negócio devolve em dobro ou dá o próximo horário sem custo quando
   falha. Cláusula sem reciprocidade cai como abusiva (CDC, art. 51, IV e XI)

**Como comunicar:** por escrito, no toque 1, antes de o horário existir. A resposta "ok" ou
"combinado" na mesma conversa é o registro do aceite. Política que está só na parede ou só
no site não vale contra ninguém.

---

## Sinal e cobrança por falta: o que a lei diz

Não substitui advogado. O quadro abaixo é o mapa das regras que existem; quem decide
cobrar precisa de um parecer, e o arquivo de saída diz isso.

| Regra | O que diz | Fonte | Conferido em |
|---|---|---|---|
| Código Civil, arts. 417 a 420 (arras ou sinal) | Sinal dado na contratação. Na inexecução: se ela vem de quem deu as arras, a outra parte tem o contrato por desfeito e retém o sinal (art. 418, I); se vem de quem recebeu, quem deu exige a devolução mais o equivalente (art. 418, II, na redação da Lei 14.905/2024). Com direito de arrependimento previsto, o sinal tem função só indenizatória (art. 420) | planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm | 2026-09-23 |
| Código Civil, art. 413 | Juiz reduz a penalidade quando a obrigação foi cumprida em parte ou o valor é manifestamente excessivo pra natureza do negócio | mesma URL | 2026-09-23 |
| CDC, art. 49 | Contratação fora do estabelecimento (telefone, WhatsApp, site) dá 7 dias pra desistir, com devolução imediata do que foi pago, corrigido | planalto.gov.br/ccivil_03/leis/l8078compilado.htm | 2026-09-22 |
| CDC, art. 51, IV e XI | Nula a cláusula que põe o consumidor em desvantagem exagerada (IV), ou que deixa o fornecedor cancelar sem dar o mesmo direito ao cliente (XI) | mesma URL | 2026-09-22 |
| CDC, art. 39, V | Vedado exigir do consumidor vantagem manifestamente excessiva | mesma URL | 2026-09-22 |

O que isso significa na prática, sem virar parecer:

- **Sinal proporcional e avisado antes** é o formato com mais respaldo: 20% a 30% do valor
  do horário, abatido do total quando a pessoa vem. Cobrar 100% do serviço não prestado é
  o que os tribunais reduzem (art. 413) e o que o CDC chama de vantagem excessiva
- **Sinal pago pelo WhatsApp ou por link** é contratação fora do estabelecimento: o cliente
  pode desistir em 7 dias e pedir o dinheiro de volta (art. 49). Horário marcado com menos
  de 7 dias de antecedência fica numa zona que só advogado fecha. Marcar `[a confirmar com
  advogado]` no arquivo de saída quando o sinal for cobrado à distância
- **Reciprocidade** não é gentileza, é o que segura a cláusula em pé (art. 51, XI)
- **Taxa por falta sem sinal** (cobrar depois) é a mais frágil das três opções: depende de
  o cliente pagar e de o negócio provar o aceite. Sinal antes resolve os dois

### Conselho profissional: onde a regra muda

| Profissão | Regra do conselho | Fonte | Conferido em |
|---|---|---|---|
| Médico | Código de Ética Médica, art. 59: vedado "oferecer ou aceitar remuneração ou vantagens por paciente encaminhado ou recebido, bem como por atendimentos não prestados". Os despachos da área jurídica do CFM (SEI 102/15, SEJUR 309/15 e CONJUR 060/22) leem taxa de agendamento e multa por falta como afronta ao art. 59. O Parecer CREMERJ 06/2020, de 16/07/2020 (processo de consulta 12/2019), admite a cobrança só com acordo prévio entre as partes. Regionais divergem | Resolução CFM 2.217/2018 (portal.cfm.org.br/images/PDF/cem2019.pdf); migalhas.com.br/depeso/428952; cremerj.org.br/resolucoes/exibe/pareceres/1079 | 2026-09-23 |
| Psicólogo | O CFP não veda cobrança de sessão cancelada fora do prazo; exige previsão no contrato terapêutico aceito antes de começar | site.cfp.org.br (orientação geral) | [a confirmar no CRP da região] |
| Dentista | Código de Ética Odontológica; posição sobre cobrança por falta | [a confirmar no CRO da região] | [a confirmar] |
| Salão, barbearia, estética, tatuagem, personal, fotógrafo, consultor, aula particular | Sem conselho com regra própria: vale Código Civil e CDC do quadro acima | ver quadro | 2026-09-22 |

Pra médico, o caminho que não depende de parecer é confirmação ativa, política de
remarcação e lista de espera. Sinal ou taxa só depois de consulta formal ao CRM, e o
arquivo de saída sai com isso escrito. Pra dentista e psicólogo, a mesma cautela até o
conselho regional responder.

---

## Lista de espera (opcional)

Só entra quando a agenda lota e sobra gente querendo horário. Sem demanda, não há lista.
O horário que vaga fica vago e o caderno vira trabalho sem retorno.

O que a lista guarda, por pessoa: nome, telefone, serviço, janelas em que pode vir
(dias e horários), data em que pediu, e se aceita ser chamada de última hora. Quatro
regras:

- **Um aviso por vaga, pra até três pessoas ao mesmo tempo**, e o horário é de quem
  responde primeiro. Mandar pra dez cria dez frustrados
- **Quem recusa duas vezes sai da lista** e o negócio avisa que saiu
- **Vaga de última hora** (menos de 3h) só pra quem marcou que aceita
- A lista é dado pessoal com finalidade única (encaixe): não vira lista de transmissão

---

## Meta

A meta é numérica e sai da taxa medida, não de benchmark. Regra que o script aplica
quando ninguém passa `--meta`: **metade da taxa atual, arredondada, com piso de 5%**. De
25% a meta é 13%; de 24,7% é 12%; de 14% é 7%; de 8% é 5%. Abaixo de 5% o custo de
perseguir a meta passa o ganho.

Duas ressalvas que o script escreve em "Atenção à meta". Meta igual ou maior que a taxa
medida ele troca pela metade da atual, porque meta não é onde o negócio já está. Meta
abaixo de 5% ele mantém, com o aviso de que ali o esforço passa o ganho. Nos dois casos, a
linha "Conta reproduzível" do relatório traz a meta que valeu.

O arquivo de saída registra três números: taxa hoje, meta e prazo (60 dias é o padrão,
tempo pra régua rodar dois ciclos). A revisão é mensal, com o mesmo comando e a exportação
nova: `node scripts/no-show.js <arquivo> --meta <meta>`. Se em 60 dias a taxa não caiu
pela metade do caminho, o problema costuma ser um dos três: o toque 2 não pede resposta,
a política não foi comunicada no toque 1, ou o horário pior (a quebra por hora e por dia
mostra) precisa de sinal ou de outro encaixe.

---

## LGPD no lembrete

| Ponto | Regra | Fonte | Conferido em |
|---|---|---|---|
| Base legal do lembrete | Execução de contrato a pedido do titular (art. 7º, V): quem marcou pediu o horário, o lembrete faz parte dele. Não precisa de consentimento separado | planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm | 2026-09-22 |
| Promoção no mesmo número | É outra finalidade: precisa de aceite próprio e de saída fácil. Não vai no lembrete | LGPD, art. 6º (finalidade) e art. 7º | 2026-09-22 |
| Dado de saúde | É dado sensível (art. 5º, II) com regime próprio (art. 11). O lembrete diz "sua consulta" ou "seu horário", não o procedimento, o diagnóstico nem o exame | mesma URL | 2026-09-22 |
| Exportação da agenda | Nome, telefone e horário de cliente ficam em `dados/` (fora do repositório) e não vão pra ferramenta externa sem autorização | CLAUDE.md, seção "Segredos e dados sensíveis" | 2026-09-22 |

O lembrete não precisa de "aceite de LGPD" nem de rodapé jurídico. Precisa de saída.
Uma linha basta ("se preferir não receber lembrete, me avisa"), e o negócio anota quem
pediu pra não receber.

---

## O que este molde não cobre

- Texto final das mensagens na voz do negócio: o `/confirmacao-de-agenda` escreve a partir
  de `_memoria/preferencias.md`, e o `/whatsapp` calibra o formato do canal
- Série de mensagens com gatilho de venda (reativação, pós-compra): `/sequencia`
- O que fazer com quem faltou e sumiu: `/pos-venda`, situação "cliente parado"
- Cobrança de quem ficou devendo depois de vir: `/cobranca`
- Quanto vale a hora e o ticket que entra na conta: `/caixa` e `/preco`
