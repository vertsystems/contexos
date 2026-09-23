---
name: confirmacao-de-agenda
description: >
  Mede quanto o cliente que marca e não vem custa por mês, em reais, a partir da exportação
  da agenda ou da contagem da semana, e monta o que derruba esse número: a régua de três
  toques, a política de cancelamento e remarcação, a regra de sinal e a meta numérica
  (ex.: de 25% pra 10%). Sai em `agenda/confirmacao.md`, com a conta feita por comando.
  Use quando o usuário disser "o cliente marca e não vem", "quanto eu perco com falta",
  "muita gente falta", "como confirmar a consulta", "posso cobrar quem falta", "cobrar sinal
  pra marcar", "política de cancelamento", "remarcação em cima da hora", "furaram comigo de
  novo", "lembrete de horário", ou /confirmacao-de-agenda.
---

# /confirmacao-de-agenda — O horário que ficou vazio

> **Convenção de pastas:** a saída vai em `agenda/` (`confirmacao.md` e o relatório mensal `no-show-<AAAA-MM>.md`). Na convenção **por cliente**, `clientes/<Nome>/agenda/`. A pasta nasce na primeira medição.

Falta não aparece em extrato. O aluguel foi pago, a pessoa estava lá, a cadeira ficou vazia
às 17h, e nenhuma planilha registra isso como prejuízo. Por isso ninguém mede, e por isso o
dono acha que "uns 15% faltam" quando a contagem dá 27%. Esta skill mede, converte em reais
por mês e escreve as três coisas que fazem o número cair: a régua de toques, a política de
cancelamento e a regra de sinal. Uma métrica só, com meta e data de revisão.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que é o horário (consulta, corte, sessão, ensaio), quem atende, o canal em que se marca, se há conselho profissional
- **Tom:** `_memoria/preferencias.md` — mensagem de confirmação é a mais lida do negócio; voz errada aqui vira spam
- **Cliente real:** `_memoria/publico.md`, se existir — a palavra que ele usa pra "desmarcar"
- **Preço:** `_memoria/oferta.md` e o estudo do `/preco`, quando existirem — de lá sai o ticket médio
- **Referência:** `templates/operacao/confirmacao-de-agenda.md` — o que conta como falta, a régua, o que a lei e os conselhos dizem sobre sinal e taxa, lista de espera, LGPD, com fonte e data
- **Script:** `scripts/no-show.js` — lê CSV ou .xlsx da agenda (ou os três números) e devolve taxa, custo mensal, meta e as quebras por dia, hora e tipo de cliente
- **Entrada de dado:** exportação da agenda em `dados/` (CSV ou .xlsx). Sem exportação, a contagem da semana serve
- **Conferência:** `node scripts/verificar.js tabela`, `datas` e `texto`
- **Saída:** `agenda/confirmacao.md` (política, régua e meta) e `agenda/no-show-<AAAA-MM>.md` (o relatório do script, um por mês)

---

## Workflow

### Passo 1 — Descobrir como a agenda funciona hoje

Se `_memoria/empresa.md` já responde, não perguntar de novo. O que falta vai numa mensagem
só, porque é levantamento:

> 1. "Como a pessoa marca com você hoje? (WhatsApp, telefone, sistema, site)"
> 2. "Quantos horários você atende numa semana normal?"
> 3. "Quanto vale um horário, em média?" (se o `/preco` ou o `/caixa` já disseram, usar de lá)
> 4. "O que acontece hoje quando alguém falta? Você manda alguma mensagem antes?"
> 5. "O sistema que você usa exporta a agenda em planilha ou CSV?"
> 6. "Você responde a algum conselho profissional? (CRM, CRO, CRP, outro)"

A pergunta 6 decide o Passo 6: médico tem regra própria sobre cobrar por falta, e a skill
não escreve política que o conselho dele proíbe.

### Passo 2 — Medir a taxa por comando

Duas entradas possíveis, e as duas passam pelo script. Nunca aceitar "acho que uns 20%".

**Com exportação:** o usuário joga o arquivo em `dados/`. O script reconhece colunas de
data, hora, status, valor, serviço, primeira vez e data da marcação, em qualquer ordem e
com nome livre (a tabela de sinônimos está no molde e no cabeçalho do script):

```bash
node scripts/no-show.js dados/agenda.csv --saida agenda/no-show-2026-09.md
node scripts/no-show.js dados/agenda.xlsx --ticket 180 --saida agenda/no-show-2026-09.md
```

Se a exportação não tem coluna de valor, `--ticket` é obrigatório; sem ele o relatório sai
com a taxa e sem o custo. Se o script listar status que não entendeu ("Atenção" no fim do
relatório), perguntar ao usuário o que cada um significa, renomear na exportação e rodar
de novo. Status ignorado é falta que some da conta.

**Sem exportação:** contar uma semana inteira com ele, na mensagem: quantos horários
tinham gente marcada, quantos não vieram sem avisar, quantos cancelaram em cima da hora.
Os dois últimos somados são `--faltas`; cancelamento com antecedência fica fora dos dois
números. Ele não quer esperar a semana passar? Então conte pra trás. O caderno de
agendamento, a conversa do WhatsApp ou o histórico do sistema das últimas quatro semanas
servem, desde que a contagem seja horário por horário. De memória não vale. Aí:

```bash
node scripts/no-show.js --agendados 38 --faltas 9 --ticket 120 --semana --saida agenda/no-show-2026-09.md
```

O `--semana` converte pra mês por 52 ÷ 12. Se ele contou o mês inteiro, tirar a flag.

Quando o relatório avisar amostra pequena (menos de 30 horários ou menos de 14 dias),
entregar a taxa como primeira leitura e marcar em `tarefas.md` a recontagem em 4 semanas.
Meta fixada em cima de 12 horários é chute com casa decimal.

### Passo 3 — Ler o custo e fixar a meta

O relatório traz a conta pronta, e é essa conta que vai pro chat, com os números do
usuário, nunca com o exemplo. Com a contagem de um mês, ela tem três linhas:

```
Taxa de no-show: 37 ÷ 150 = 24,7%
Custo no período medido: 37 faltas × R$ 200,00 = R$ 7.400,00 (no mês)
Custo por mês: R$ 7.400,00 (o mesmo que 150 horários × ticket × taxa)
Custo por ano: 12 × R$ 7.400,00 = R$ 88.800,00
```

Com arquivo, o período quase nunca é um mês redondo. Aí o relatório mostra o custo do
período e o fator que leva pro mês. Copiar as três linhas, não só a última. É o fator que
explica por que 44 faltas viraram R$ 8.465,93 por mês.

Na tabela "Contagem" entra só quem está na base. Quem ficou fora (cancelou com
antecedência, horário ainda em aberto, status que o script não entendeu) aparece na linha
"Fora da base", logo abaixo, e é ali que se descobre exportação mal preenchida.

```
Custo no período medido: 44 faltas × R$ 170,68 = R$ 7.509,92 (em 27 dias)
Fator do mês: 30,44 ÷ 27 = 1,1273, e 161 horários em 27 dias viram 181,5 por mês
Custo por mês: R$ 7.509,92 × 1,1273 → R$ 8.465,93
```

Quando o arquivo cobre menos de duas semanas, o relatório avisa que o valor mensal é
projeção. Nesse caso o número entra no chat com o aviso colado nele, e não vai pra
proposta nem pra contrato até a próxima medição.

A meta é numérica e sai da taxa medida. Sem `--meta`, o script propõe metade da atual com
piso de 5% (de 24,7% vai pra 12%). O usuário pode pedir outra. Meta acima da taxa medida o
script recusa e troca pela metade da atual; abaixo de 5% ele aceita com a ressalva de que
ali o esforço passa o ganho, e a ressalva vai pro arquivo. Meta sem número não existe.
Rodar de novo com `--meta` pra que o relatório mostre o ganho por mês e por ano com a
meta dele:

```bash
node scripts/no-show.js dados/agenda.csv --meta 10 --sinal 30 --saida agenda/no-show-2026-09.md
```

O `--sinal 30` só mostra quanto é 30% do ticket, pra o Passo 6 não fazer conta de cabeça.

### Passo 4 — Achar onde a falta se concentra

Com exportação, o relatório quebra a taxa por dia da semana, por hora, por serviço, por
primeira vez × retorno e por antecedência da marcação. Ler as cinco tabelas e trazer só o
que se destaca: "às 17h a taxa é 70%; no resto do dia fica abaixo de 30%" ou "primeira
consulta falta três vezes mais que retorno". Isso muda a régua: horário pior ganha sinal
ou ligação; cliente de primeira vez recebe o toque 2 com 48h em vez de 24h.

Falta cara e falta barata não são o mesmo problema. Quando a coluna de valor existe, o
relatório compara o ticket de quem faltou com a média geral. Se quem falta tem horário
mais caro (a linha "Atenção ao ticket"), o custo real é maior que faltas × média e o sinal
passa a valer primeiro nesse serviço. Três faltas de R$ 350 pesam mais que seis de R$ 120.

Sem exportação, pular. Não inferir concentração a partir da memória do usuário; anotar
que a quebra entra na próxima medição, com o arquivo.

### Passo 5 — Escrever a régua de três toques

A régua está no molde: toque 1 na marcação (registro do combinado e da política), toque 2
como confirmação 48h antes (24h pra horário curto e barato) com uma pergunta só, toque 3
no dia, 2h a 3h antes, sem pergunta. Mais que dois lembretes irrita e não reduz falta.

Escrever as mensagens na voz de `_memoria/preferencias.md`, no formato que o `/whatsapp`
calibra: curtas, sem "prezado", sem promoção, data e dia da semana por extenso. Além dos
três toques, mais duas peças que a régua precisa:

- **Resposta a "não vou poder ir":** agradece, oferece dois horários, e o horário que vagou
  vai pra lista de espera (Passo 7) na mesma hora
- **Roteiro da ligação de 30 segundos:** pra quem não respondeu o toque 2 até 24h antes.
  Quem confirma por telefone recebe o toque 3 normal; quem não atende perde o horário
  conforme a política do Passo 6, e a mensagem diz isso sem ameaça

Duas variantes de cada mensagem, com temperatura diferente, pra ele escolher. Toda data que
aparecer como exemplo passa por `node scripts/verificar.js datas` antes de entrar no arquivo.

Se o usuário só quer o texto dos lembretes, sem medir nem escrever política, o `/sequencia`
entrega a série com gatilho e intervalo; esta skill entra quando o alvo é a taxa.

### Passo 6 — Escrever a política de cancelamento e a regra de sinal

Uma pergunta por vez, na ordem, porque cada resposta muda a seguinte:

1. "Até quantas horas antes a pessoa pode cancelar ou remarcar sem custo?" Padrão do
   molde: 24h pra horário curto, 48h pra procedimento longo ou com preparo, 7 dias pra dia
   inteiro bloqueado
2. "Fora desse prazo, o que acontece?" Uma das três: perde o sinal, paga uma taxa fixa, ou
   o próximo horário só sai com sinal. Uma, não as três
3. "Na segunda falta em seis meses, o que muda?" A regra mais usada é "só marca com sinal"
4. "E quando é você que precisa desmarcar em cima da hora, o que o cliente ganha?"
   Sem reciprocidade a cláusula cai como abusiva (CDC, art. 51, IV e XI, no molde)

Antes de escrever a regra de sinal, checar a profissão da pergunta 6 do Passo 1 contra a
tabela "Conselho profissional" do molde:

- **Médico:** o Código de Ética Médica veda remuneração por atendimento não prestado (art.
  59), e os despachos jurídicos do CFM leem taxa e multa por falta como afronta a isso;
  regionais divergem. A política sai com confirmação ativa, remarcação e lista de espera,
  e a linha "sinal ou taxa: só depois de consulta formal ao CRM"
- **Psicólogo e dentista:** previsão no contrato e `[a confirmar no CRP/CRO da região]`
- **Sem conselho com regra própria** (salão, barbearia, estética, tatuagem, personal,
  fotógrafo, consultor, aula): vale o Código Civil e o CDC. Sinal proporcional, 20% a 30%
  do horário, abatido do valor quando a pessoa vem, avisado por escrito antes de marcar

Sinal pago por link ou Pix pelo WhatsApp é contratação fora do estabelecimento: o CDC dá
7 dias pra desistir com devolução (art. 49). A política diz isso e marca `[a confirmar com
advogado]` no que depende de horário marcado com menos de 7 dias. A skill entrega o texto
da política e a conta do sinal; quem valida a cláusula é o advogado, e o arquivo diz isso
uma vez, sem sermão.

O valor do sinal sai do script, nunca de cabeça. Rodar de novo com a porcentagem escolhida
e ler a linha "Sinal" do relatório; o que sobra pra pagar na hora é o ticket menos ela:

```bash
node scripts/no-show.js dados/agenda.csv --meta 10 --sinal 30 --saida agenda/no-show-2026-09.md
```

### Passo 7 — Lista de espera (opcional)

Uma pergunta: "sobra gente querendo horário e não achando?" Se não, pular e não criar a
lista. Se sim, o arquivo ganha a seção com as quatro regras do molde (um aviso por vaga
pra até três pessoas, o horário é de quem responde primeiro, duas recusas tiram da lista,
última hora só pra quem aceitou), a mensagem de encaixe e o que a lista guarda por pessoa.
A lista em si fica em `agenda/lista-de-espera.md` só se o usuário quiser mantê-la aqui;
se ele já tem no sistema de agenda, o arquivo só aponta pra lá.

### Passo 8 — Escrever o arquivo

```markdown
# Confirmação de agenda — <nome do negócio>

> Medido em <AAAA-MM-DD> a partir de <arquivo ou "contagem de <período>">.
> Não substitui advogado nem o conselho profissional: a política e o sinal passam por eles antes de valer.

## A conta
| Linha | Valor |
|---|---|
| Período medido | <27 dias, de <data> a <data>> ou <mês de <AAAA-MM>> |
| Horários na base | 150 |
| Faltas na base | 37 |
| Taxa de no-show | 24,7% |
| Ticket médio | R$ 200,00 |
| Custo por mês | R$ 7.400,00 |
| Custo por ano | R$ 88.800,00 |

Conta: 37 faltas × R$ 200,00 = R$ 7.400,00 por mês; 12 × R$ 7.400,00 = R$ 88.800,00 por ano.
Quando o período não é um mês redondo, copiar as três linhas do relatório: custo do
período, fator do mês e custo por mês.
Reproduzir: `node scripts/no-show.js <arquivo> --meta 10`

## Meta
De 24,7% pra 10% em 60 dias (até <data>). Ganho: R$ 4.400,00 por mês, R$ 52.800,00 por ano.
Revisão: <data>, com a exportação nova e o mesmo comando.

## Onde a falta se concentra
[só o que se destaca nas quebras; ou "sem exportação: entra na próxima medição"]

## A régua de três toques
| Toque | Quando | Mensagem |
|---|---|---|
| 1. Na marcação | no ato | [texto] |
| 2. Confirmação | 48h antes | [texto, uma pergunta] |
| 3. Lembrete | 2h antes | [texto] |

Quem não respondeu o toque 2 até 24h antes: ligação. [roteiro]
Quem pediu pra remarcar: [resposta], e o horário vai pra lista de espera.

## Política de cancelamento e remarcação
[o texto que vai no toque 1, em uma linha; e a versão completa em cinco itens]

## Sinal
[regra, valor, como paga, o que acontece quando vem e quando não vem; ou "sem sinal: motivo (conselho)"]

## Lista de espera
[as regras, ou "não se aplica hoje"]

## O que confirmar com advogado ou conselho
[cada [a confirmar], com a pergunta pronta]
```

A tabela "A conta" não soma (é uma ficha, não uma coluna de parcelas), então o
`verificar.js tabela` confere só a multiplicação em prosa. Rodar os três:

```bash
node scripts/verificar.js tabela agenda/confirmacao.md
node scripts/verificar.js datas agenda/confirmacao.md
node scripts/verificar.js texto agenda/confirmacao.md
```

Se algum número divergir do relatório do script, refazer a partir do arquivo de origem;
nunca ajustar o texto pra bater.

### Passo 9 — Levar pra rotina e pra tarefas

Régua que fica só no arquivo não roda. Três itens em `tarefas.md`, no formato do `/tarefas`,
com a origem:

- `- [ ] Mandar toque 2 pros horários de depois de amanhã — todo dia útil, 9h (/confirmacao-de-agenda)`
- `- [ ] Ligar pra quem não confirmou até 24h antes — todo dia útil, 15h (/confirmacao-de-agenda)`
- `- [ ] Remedir o no-show com a exportação nova — <data da revisão> (/confirmacao-de-agenda)`

Se o usuário tem sistema que manda o lembrete sozinho, os dois primeiros viram "conferir
que saiu". Oferecer o `/rotina` uma vez, pra que o toque diário apareça no `/abrir` sem
depender de memória.

### Passo 10 — Entregar e revisar em 60 dias

A entrega é curta: a taxa, o custo por mês, a meta com o ganho, o toque 2 pronto pra
copiar, e a frase de que política e sinal passam pelo advogado ou conselho antes de valer.
O arquivo inteiro fica em `agenda/confirmacao.md`.

Na revisão, rodar o script na exportação nova com o mesmo `--meta` e salvar como
`agenda/no-show-<AAAA-MM>.md`. Comparar com o anterior por comando, não de memória:

```bash
grep -h "Taxa de no-show\|Custo por mês" agenda/no-show-*.md
```

Se a taxa não andou metade do caminho até a meta, o molde lista as três causas mais comuns
(toque 2 sem pergunta, política não comunicada no toque 1, horário pior sem sinal). Trazer
a que os dados apontam, com o número.

---

## Regras

- **Taxa é medida, nunca estimada.** "Acho que uns 20%" não entra no arquivo. Entra o que o `scripts/no-show.js` devolveu da exportação ou da contagem de uma semana inteira, com o comando reproduzível escrito no arquivo
- **Custo em reais sempre com a conta visível.** Faltas × ticket, e o ticket vem do `/preco`, do `/caixa`, da coluna de valor ou do usuário; sem ticket o arquivo diz `[a confirmar]` e não inventa
- **Uma métrica, uma meta, uma data.** A skill não vira gestão de agenda: não desenha grade de horários, não escolhe sistema, não organiza a semana. Isso é o `/escopo` ou a ferramenta dele
- **Meta não é onde você já está.** Meta acima da taxa medida o script troca por metade da atual e diz que trocou, na seção "Atenção à meta". O arquivo registra a meta que valeu, e o comando reproduzível também. Meta abaixo de 5% o script aceita com ressalva: ali o esforço passa o ganho
- **Status que o script não entendeu é falta escondida.** A seção "Atenção" do relatório lista cada um. Perguntar ao usuário o que significa, renomear na exportação e rodar de novo antes de fixar meta. "Aguardando confirmação" e "Cancelado pelo paciente" ficam fora da base de propósito; "Encaixe" e "Bloqueio" ninguém adivinha
- **Dois lembretes, não cinco.** Toque 2 e toque 3, mais a ligação pra quem não respondeu. Mensagem a mais aumenta cancelamento por irritação e não reduz falta (fonte no molde)
- **Lembrete não é marketing.** Sem promoção, sem "aproveite", sem pacote no toque 2 nem no 3. A base legal do lembrete é a execução do que a pessoa pediu (LGPD, art. 7º, V); oferta é outra finalidade e precisa de outro aceite
- **Cancelar tem que ser mais fácil que faltar.** Um canal, um jeito. Política que dificulta o cancelamento aumenta o no-show em vez de reduzir
- **Sinal proporcional, avisado antes, com reciprocidade.** 100% do serviço não prestado é o que o juiz reduz (CC, art. 413) e o CDC chama de vantagem excessiva (art. 39, V). Sem cláusula do que o negócio deve quando é ele que falha, a política sai incompleta
- **Médico não cobra por falta sem o CRM dizer que pode.** O art. 59 do Código de Ética Médica e os despachos do CFM estão no molde; a política médica sai com confirmação, remarcação e lista de espera, e a taxa fica `[a confirmar com o CRM]`. Dentista e psicólogo: `[a confirmar no CRO/CRP]`
- **Não substitui advogado nem conselho.** A skill entrega o texto da política, a conta do sinal e a pergunta pronta; quem valida é o advogado ou o conselho, e o arquivo diz isso uma vez, sem sermão
- **Dado de agenda é dado pessoal.** Nome, telefone e horário de cliente ficam em `dados/` (fora do repositório) e não vão pra WebSearch, pra prompt de ferramenta externa nem pra exemplo de comando. Em saúde, o lembrete diz "seu horário", nunca o procedimento ou o diagnóstico (dado sensível, LGPD art. 5º, II e art. 11)
- **Quem pediu pra não receber lembrete não recebe.** Anotar no cadastro e tirar da régua; a política de falta continua valendo pra ele, comunicada na marcação
- **Amostra pequena é primeira leitura, não meta.** Menos de 30 horários ou menos de 14 dias: entregar a taxa com o aviso do script e marcar a recontagem em 4 semanas
- **Fronteira com as vizinhas:** o `/whatsapp` é o atendimento e o kit de respostas, e é ele que calibra o formato das mensagens daqui; o `/sequencia` é série de mensagens com gatilho de venda, e recebe o pedido quando o usuário só quer o texto do lembrete; o `/pos-venda` começa depois do fechou e cuida de quem sumiu; o `/cobranca` cobra quem ficou devendo depois de vir; o `/contrato` e o `/revisar-contrato` levam a política pro contrato escrito; o `/caixa` e o `/preco` dão o ticket; o `/rotina` e o `/tarefas` fazem o toque diário aparecer
- **Quando o número for ruim, dizer o número.** 35% de falta e R$ 11.000 por mês na mesa se escrevem assim, com a conta ao lado e o próximo passo, sem suavizar
- **O molde envelhece.** Artigo, parecer e faixa de mercado têm data de conferência em `templates/operacao/confirmacao-de-agenda.md`; antes de escrever regra de sinal, conferir por WebSearch com termo genérico ("CFM cobrança consulta paciente faltou") e usar a URL oficial. Se mudou, o arquivo de saída usa o novo e avisa que o molde precisa de atualização
