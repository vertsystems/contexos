---
name: decidir
description: >
  Entrevista o usuário, uma pergunta por vez, antes de uma decisão grande (abrir uma frente,
  mudar preço, contratar, escolher entre duas ofertas, aceitar um cliente, mudar de nicho,
  investir num sistema) até não sobrar ponta solta: alternativas de verdade, o que acontece se
  não fizer nada, custo em dinheiro e tempo somado por comando, o risco que mata, como saber em
  30, 60 e 90 dias se foi boa, e se dá pra voltar atrás. Devolve a decisão escrita em uma
  página, com o que ficou de fora e a data de revisão.
  Use quando o usuário disser "não sei se contrato", "tô na dúvida se aceito esse cliente",
  "vale a pena abrir isso", "me ajuda a decidir", "recebi duas propostas", "tô pensando em
  mudar de nicho", "será que eu subo o preço", "não consigo decidir", "faz sentido investir
  nisso", ou /decidir.
---

# /decidir — Fechar as pontas antes de decidir

> **Convenção de pastas:** a saída vai em `decisoes/<AAAA-MM-DD>-<slug>.md`, com a data do dia em que a decisão foi escrita e o slug em minúsculas, sem acento, palavras separadas por hífen (`2026-09-18-contratar-atendente.md`). Na convenção **por cliente**, decisão sobre o trabalho de um cliente vai em `clientes/<Nome>/decisoes/`; decisão da própria casa (contratar, mudar preço, nicho) fica na raiz. A pasta nasce na primeira decisão escrita.

Dono de negócio pequeno decide sozinho, no carro, entre um atendimento e outro. Não tem
sócio pra discordar, nem diretoria pra pedir a conta. O resultado é conhecido: contrata
antes de contar as horas, sobe o preço sem saber quantos clientes aguenta perder, aceita o
cliente grande que engole os outros seis. Esta skill faz o papel do sócio chato: pergunta até
não sobrar ramo sem resposta, e só então opina. O que sai é uma página que dá pra reler na
data marcada e dizer se foi boa.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, quem trabalha nele, quantas horas o dono tem
- **Foco atual:** `_memoria/estrategia.md` — decisão que contraria o foco escrito precisa dizer por quê
- **Tom:** `_memoria/preferencias.md` — a página final é lida pelo próprio usuário meses depois; precisa soar como ele
- **Cliente e oferta:** `_memoria/publico.md` e `_memoria/oferta.md`, quando a decisão mexe em quem compra ou no que se vende
- **A conta:** `financeiro/fechamento-<AAAA-MM>.md` e `financeiro/custos-fixos.md`, se existirem (`/caixa`). É de lá que sai o custo da hora do dono e quanto sobra por mês
- **Decisões anteriores:** `decisoes/`, pra não decidir a mesma coisa duas vezes e pra ler o que se aprendeu
- **Molde:** `templates/operacao/decisao.md` — as perguntas por família, os oito ramos, o teste de reversibilidade, os vieses e a pergunta que desarma cada um
- **Compra de capital:** `scripts/payback.js` e `templates/financeiro/payback.md`, quando a decisão é uma máquina, uma obra, uma segunda unidade ou um estoque grande
- **Referência de apoio:** `templates/software/validacao.md`, só quando a decisão é sobre construir sistema
- **Saída:** `decisoes/<AAAA-MM-DD>-<slug>.md`, e a data de revisão em `tarefas.md`

---

## Workflow

### Passo 1 — Nomear a decisão

Primeira pergunta, e só ela:

> "Qual é a decisão, em uma frase, do jeito que você contaria pra um amigo?"

Da resposta saem duas coisas. A **família** (abrir frente, mudar preço, contratar, escolher
entre ofertas, aceitar cliente, mudar de nicho, sistema ou ferramenta), que define as
perguntas do molde. E o **tamanho**: rodar o teste da porta, em `templates/operacao/decisao.md`,
com o que a frase já diz. "Vou contratar" prende alguém; "vou testar anúncio com R$ 300"
desfaz em uma semana. Se a frase não responde uma das quatro linhas do teste, essa é a
segunda pergunta, e só ela.

Basta **uma** resposta na coluna de porta de um sentido pra fazer o caminho inteiro. Se as
quatro caem na coluna de dois sentidos, dizer isso e encerrar: "isso desfaz em duas semanas e
custa menos que uma semana de faturamento. Decide, testa, e volta aqui se virar coisa maior".
Entrevista inteira em decisão pequena é custo sem retorno.

Se ele trouxe a decisão já tomada ("vou contratar, só quero organizar"), a skill serve do
mesmo jeito. A diferença é que a pergunta das alternativas vem mais cedo, porque é a que
ele pulou.

### Passo 2 — Ler o que o sistema já sabe

Antes da segunda pergunta, ler o contexto e não perguntar o que já está escrito:

- `_memoria/empresa.md` e `estrategia.md`: se a decisão contraria o foco do trimestre, anotar pra perguntar depois
- O último fechamento em `financeiro/`: quanto sobra por mês e o custo da hora. Sem isso, o Passo 5 fica com `[a confirmar]`
- `decisoes/`: se existe decisão parecida, ler a seção "Revisão" dela. O que aconteceu da última vez vale mais que qualquer pergunta nova

```bash
ls decisoes/ clientes/*/decisoes/ 2>/dev/null
grep -il "<palavra-chave da decisão>" decisoes/*.md clientes/*/decisoes/*.md 2>/dev/null
```

Se achou uma decisão parecida sem a seção "Revisão feita" preenchida e com marco vencido,
dizer isso antes de seguir: fechar a revisão antiga leva dois minutos e é o melhor insumo
que a nova vai ter.

### Passo 3 — Entrevistar, uma pergunta por mensagem

Os oito ramos estão no molde: contexto, alternativas de verdade, não fazer nada, custo em
dinheiro e tempo, o que precisa ser verdade, risco que mata, sinal em 30/60/90, reversibilidade.
A ordem não é fixa. Começar pelo ramo em que a história dele tem o buraco mais evidente.

O que costuma abrir cada ramo:

| Ramo | Pergunta que abre |
|---|---|
| Contexto | "O que aconteceu, e quando, que trouxe isso pra mesa agora?" |
| Alternativas | "Se essa opção não existisse, o que você faria?" |
| Não fazer nada | "Se ninguém mexer em nada, como está o negócio em seis meses?" |
| Custo | "Quanto isso custa por mês, em dinheiro? E quantas horas suas por semana?" |
| O que precisa ser verdade | "Pra isso dar certo, o que precisa acontecer que ainda não aconteceu?" |
| Risco que mata | "Qual é o cenário em que isso quebra o negócio, não só dá prejuízo?" |
| Sinal em 30/60/90 | "Daqui a 30 dias, que número te diz que foi boa?" |
| Reversibilidade | "Se der errado, quanto custa voltar atrás? E o que não volta?" |

As perguntas específicas da família (contratar, preço, cliente) estão no molde. Fazer as que
a conversa não respondeu sozinha, não a lista inteira.

**Como conduzir:**

- Uma pergunta por mensagem. Mensagem com duas perguntas recebe resposta pra uma
- Antes de cada pergunta, uma linha do que a resposta anterior mudou ("então a alternativa
  do freelancer entra na mesa"). Isso mostra que a entrevista está indo a algum lugar
- Resposta vaga ("acho que uns dois meses") pede a pergunta de calibração do molde: "da
  última vez que você estimou algo parecido, quanto levou?"
- Quando a fala tem viés reconhecível ("já gastei tanto nisso"), fazer a pergunta que
  desarma, sem nomear o viés. A tabela está no molde
- Uma resposta pode fechar dois ramos de uma vez ("se der errado eu demito, e a rescisão
  é uns R$ 4 mil" fecha reversibilidade e abre custo). Contar os dois, não perguntar de novo
- Manter a contagem de ramos fechados e dizer quando ele perguntar: "faltam três: custo,
  risco e sinal de 60 dias"
- Se ele pedir opinião no meio ("mas você acha que eu devo?"), não dar. Dizer quantos ramos
  faltam e por que a opinião agora seria chute: "faltam custo e risco; sem eles eu estaria
  adivinhando, e adivinhar você já faz sozinho"

**Quando parar.** Em uma destas três situações, e em nenhuma outra:

1. Ele disse "chega", "já sei", "pode escrever"
2. Três perguntas seguidas não mudaram nada: nem a decisão, nem uma alternativa, nem um número,
   nem apareceu risco novo. Dizer isso a ele: "as últimas três não mudaram nada, acho que fechou"
3. Os oito ramos estão fechados

Impaciência na segunda pergunta não é motivo pra parar. É motivo pra dizer quantas faltam.

### Passo 4 — Chamar a vizinha quando o assunto é dela

A entrevista estrutura a decisão. O número de cada assunto vem da skill que sabe calculá-lo:

| Se a decisão precisa de | Pausar e rodar | Volta com |
|---|---|---|
| Quanto sobra por mês, custo da hora | `/caixa` | ponto de equilíbrio, R$/hora, sobra mensal |
| O preço novo, faixas, o que se perde | `/preco` | piso, faixa e preço por valor |
| O que exatamente construir e quanto custa manter | `/escopo` | fatia mínima e custo mensal |
| O que o concorrente cobra e onde está a brecha | `/concorrente` | comparativo e diferenças defensáveis |
| Dado de mercado, número com fonte | `/pesquisa` | dossiê datado |
| Se o sistema já no ar merece mais investimento | `/evoluir` | uso medido por funcionalidade |

Dizer em uma linha por que está pausando ("preciso do custo da tua hora, vou fechar o caixa
rápido"), rodar só o passo necessário da vizinha, e voltar pra entrevista com o número.
Não refazer o trabalho delas aqui.

### Passo 5 — Calcular o custo por comando

Custo de decisão grande tem duas colunas: dinheiro e tempo do dono. O tempo vira reais
pela hora do `/caixa`. Sem fechamento, a hora entra como `[a confirmar]` e a conta mostra o
resultado com e sem ela.

Montar a tabela por alternativa e somar por comando, nunca de cabeça:

```bash
# contratação: 6 meses de salário com encargo, mais 40 horas de treino do dono a R$ 85/h
node -e 'const sal=2900, meses=6, treino=40, hora=85; console.log("dinheiro:", sal*meses, "| tempo em R$:", treino*hora, "| total:", sal*meses+treino*hora)'

# preço novo: 14 clientes a R$ 3.200 hoje, contra R$ 4.500 perdendo 3
node -e 'const hoje=3200, novo=4500, n=14, perde=3; console.log("hoje:", hoje*n, "| novo:", novo*(n-perde), "| diferença:", novo*(n-perde)-hoje*n)'
```

Os valores acima são exemplo de formato. Os do usuário entram no lugar, e cada um deles
tem origem dita na conversa (salário que ele falou, hora do fechamento, cliente contado).
Número que ninguém falou não entra na conta: vira `[a confirmar]`.

Depois de escrever a tabela no arquivo, conferir **cada linha** por comando. O
`verificar.js tabela` não serve aqui: ele soma a coluna inteira, e alternativas não se
somam (ninguém contrata E terceiriza E não faz nada). O que precisa bater é dentro da
linha: horas × hora do dono = tempo em R$, e dinheiro + tempo em R$ = total.

```bash
# uso: <arquivo> <hora do dono em R$>
node -e '
const [arq, hora] = process.argv.slice(1);
const n = s => { const m = s.replace(/R\$\s*/g, "").match(/-?\d[\d.]*(,\d+)?/); return m ? parseFloat(m[0].replace(/\./g, "").replace(",", ".")) : null; };
let dentro = false, erros = 0;
for (const l of require("fs").readFileSync(arq, "utf8").split("\n")) {
  if (/^## O custo/.test(l)) { dentro = true; continue; }
  if (dentro && /^## /.test(l)) break;
  if (!dentro || !/^\|/.test(l) || /^\|[\s:|-]+\|$/.test(l) || /^\|\s*Alternativa/i.test(l)) continue;
  const c = l.split("|").map(s => s.trim()); c.shift(); c.pop();
  const [nome, din, h, tempo, total] = [c[0], n(c[1]), n(c[2]), n(c[3]), n(c[4])];
  if ([din, h, tempo, total].includes(null)) { console.log("[a confirmar] " + nome); continue; }
  const tempoOk = Math.abs(h * hora - tempo) < 1, somaOk = Math.abs(din + tempo - total) < 1;
  if (!tempoOk || !somaOk) erros++;
  console.log((tempoOk && somaOk ? "ok   " : "ERRO ") + nome + ": " + h + "h × R$ " + hora + " = R$ " + h * hora + (tempoOk ? "" : " (declarado " + tempo + ")") + " | " + din + " + " + tempo + " = " + (din + tempo) + (somaOk ? "" : " (declarado " + total + ")"));
}
console.log(erros ? erros + " linha(s) com conta errada" : "Tudo certo.");
' decisoes/<AAAA-MM-DD>-<slug>.md <hora do dono>
```

O comando lê só a tabela de "## O custo", espera as cinco colunas do esqueleto do Passo 7,
na ordem, e imprime uma linha por alternativa. Linha com `[a confirmar]` aparece marcada e
não é somada. Se der `ERRO`, refazer a conta a partir do que o usuário disse, nunca ajustar
o número pra bater.

**Prazo também é conta.** Se o usuário deu dois ou três casos anteriores com estimativa e
tempo real, calcular o fator (`real ÷ estimado`, média dos casos) e aplicar no prazo de hoje:

```bash
# casos: [estimado, real] em semanas, do que ele contou; depois o prazo de hoje
node -e 'const casos=[[8,14],[4,7]], hoje=8; const f=casos.reduce((a,[e,r])=>a+r/e,0)/casos.length; console.log("fator:", f.toFixed(2), "| prazo estimado:", hoje, "| pelo histórico:", (hoje*f).toFixed(1))'
```

O prazo entra na página nas duas versões: estimado e corrigido pelo histórico. Sem
histórico, o fator fica `[a confirmar]` e o prazo entra como teto, não como promessa.

**Compra de capital tem script próprio.** Quando a decisão é comprar uma máquina, fazer uma
obra, abrir a segunda unidade ou encher o estoque, a conta que falta não é a de custo: é a
de quanto precisa vender por mês pra aquilo se pagar, em quantos meses o dinheiro volta e a
partir de que ponto o certo é desistir.

```bash
node scripts/payback.js --exemplo financeiro/<slug>.payback.json   # editar com o que ele disse
node scripts/payback.js financeiro/<slug>.payback.json --md        # grava decisoes/<AAAA-MM-DD>-<slug>.md
```

O script lê fixos, variáveis, retirada, caixa e sazonalidade do último
`financeiro/projecao-*.projecao.json`, quando existe, e escreve a página já nesta convenção,
com o ponto de equilíbrio em vendas por mês, o payback nos três cenários, o retorno em 12 e
24 meses e o gatilho de desistir. "A decisão", "Por quê", "O que ficou de fora", "O risco
que mata" e as três linhas da revisão ficam em branco: são os Passos 6 e 7, feitos com ele.
A conta por trás está em `templates/financeiro/payback.md`, e o custo do dinheiro, se a
compra for financiada, é do `/emprestimo`.

### Passo 6 — Opinar, e dizer o que mudaria a opinião

Só agora. Opinião antes de fechar as pontas contamina as respostas: ele passa a responder
pra concordar ou pra discordar, não pra descrever.

A opinião tem três partes, nesta ordem:

1. **O que eu faria no teu lugar**, em uma frase, sem "depende"
2. **Os dois ou três números que sustentam** ("sobra R$ 4.200/mês, a pessoa custa R$ 2.900,
   e você tem 22 horas delegáveis contadas")
3. **O que mudaria a minha opinião**: a suposição que, se falsa, vira o conselho ("se as 22
   horas forem 10, eu diria freelancer, não contratação")

Se a conta não fecha, dizer que não fecha. Suavizar aqui é o mesmo erro do `/caixa`: o usuário
vai assinar contrato com base nessa página.

### Passo 7 — Escrever a decisão em uma página

Calcular as datas de revisão por comando, com dia da semana, antes de escrever:

```bash
node -e 'for (const d of [30,60,90]) { const x=new Date(); x.setDate(x.getDate()+d); console.log(d+" dias:", x.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})) }'
```

Esqueleto do arquivo:

```markdown
# Decisão — <título curto> — <AAAA-MM-DD>

**Família:** <contratar / preço / cliente / frente / nicho / ofertas / sistema>
**Porta:** <dois sentidos / um sentido> — custo de voltar atrás: R$ <valor> e <o que não volta>

## A decisão
[Uma frase. O que vai ser feito, a partir de quando.]

## Por quê
1. [motivo com o número que o sustenta]
2. [motivo com o número que o sustenta]
3. [no máximo três]

## O custo
| Alternativa | Dinheiro em 6 meses | Horas do dono | Tempo em R$ | Total |
|---|---|---|---|---|
| <escolhida> | R$ ... | ... | R$ ... | R$ ... |
| <descartada> | R$ ... | ... | R$ ... | R$ ... |
| Não fazer nada | R$ ... | ... | R$ ... | R$ ... |

Hora do dono usada na conta: R$ <valor>/h (fechamento de <mês>) ou [a confirmar]

## O que ficou de fora e por quê
- **<alternativa descartada>** — [por que perdeu, em uma linha]
- **<pergunta sem resposta>** — [decidido sem ela porque ...]

## O que precisa ser verdade
- [suposição 1: como conferir]
- [suposição 2: como conferir]

## O risco que mata
[O cenário nomeado, e o sinal que avisa antes dele chegar.]

## Revisão
| Marco | Data | O que precisa ter acontecido | Se não aconteceu |
|---|---|---|---|
| 30 dias | <dia da semana, DD/MM/AAAA> | [esforço: fez o que disse] | [ação] |
| 60 dias | <dia da semana, DD/MM/AAAA> | [sinal: alguém respondeu, com número] | [ação] |
| 90 dias | <dia da semana, DD/MM/AAAA> | [resultado: dinheiro, com número] | [ação] |

Quem confere: <o usuário, na revisão de sexta>

## Revisão feita
[Preenchido na data. Foi boa? O que a página não previu?]
```

Antes de entregar, as três conferências:

```bash
# 1) a conta de cada alternativa: o node -e do Passo 5, apontando pra este arquivo
node scripts/verificar.js datas decisoes/<arquivo>.md     # 2) dia da semana das três revisões
node scripts/verificar.js texto decisoes/<arquivo>.md     # 3) a página vai ser relida, precisa soar como gente
```

O `datas` lê o ano do nome do arquivo, por isso a tabela de revisão leva a data completa
(`DD/MM/AAAA`): decisão de novembro tem marco em fevereiro do ano seguinte.

Uma página. Se passou de uma tela de celular, tem gordura ou tem coisa que pertence à conversa,
não à decisão.

### Passo 8 — Registrar e agendar a revisão

- As três datas de revisão vão pra `tarefas.md`, na seção "Depois", um item por marco, com
  o número a conferir e o arquivo (`/tarefas`). Revisão que depende de memória não acontece:

  ```markdown
  - [ ] Revisar decisão "contratar atendente": 6 de 10 orçamentos fechados sem mim — 17/11 (decisoes/2026-09-18-contratar-atendente.md)
  ```
- Se a decisão muda o foco (nicho novo, frente nova, cliente que redefine a agenda),
  propor a linha nova em `_memoria/estrategia.md` e mostrar antes de salvar
- Se a decisão é "aceitar o cliente", o próximo passo é `/contrato`. Se é "subir o preço", é
  `/preco` pra escrever a tabela e `/pos-venda` pra avisar quem já é cliente. Dizer qual é o
  próximo passo, em uma linha, sem abrir a lista de comandos

### Passo 9 — Voltar na data

Quando o usuário abrir a decisão na data de revisão (ou quando o `/revisao-semanal` acusar um
marco vencido), comparar o que a página previu com o que aconteceu, e preencher "Revisão
feita" no mesmo arquivo. Três perguntas, uma por vez:

1. "O número do marco bateu?"
2. "O que aconteceu que a página não previu?"
3. "Se fosse decidir hoje, com o que sabe agora, decidiria igual?"

A resposta da terceira é o que calibra as próximas decisões. Um arquivo de decisões com
seis revisões feitas vale mais que qualquer método: mostra onde esse usuário costuma errar
(prazo, custo, gente) e a entrevista seguinte começa por ali.

---

## Regras

- **Uma pergunta por mensagem, sempre.** Nem em levantamento. Decisão grande se constrói uma resposta de cada vez, e pergunta dupla recebe resposta pela metade
- **Não opinar antes de fechar as pontas.** Nem "parece boa ideia", nem "hum, arriscado". A opinião vem no Passo 6, com os números e com o que a mudaria
- **Quando opinar, dizer o que mudaria a opinião.** Opinião sem condição de mudança é palpite, e palpite o usuário já tem
- **Calcular, nunca estimar.** Custo, diferença entre alternativas, fator de prazo e data de revisão saem de comando. Se o dado não existe, `[a confirmar]` visível, e a conta mostra o resultado com e sem ele
- **Não fazer nada é sempre uma alternativa.** Entra na tabela de custo com número. Decisão sem essa linha compara a escolha com o vazio, e o vazio sempre perde
- **Não nomear o viés no meio da entrevista.** Fazer a pergunta que desarma. Aula sobre custo afundado fecha o usuário; a pergunta abre
- **Decisão pequena não passa por aqui.** Passou no teste da porta, decide e testa. A skill inteira em decisão de R$ 200 é desperdício do tempo dele
- **Respeitar o "chega".** A entrevista termina quando ele diz, e a página registra o que ficou sem resposta. Insistir depois disso é o oposto de ajudar
- **Fronteira com as vizinhas:** `/escopo` decide o que construir e quanto custa manter; `/preco` decide o número; `/caixa` diz quanto sobra e quanto custa a hora; `/oferta` desenha o que se vende; `/evoluir` decide o que fazer com sistema já no ar; `/concorrente` e `/pesquisa` trazem o dado de fora. O `/decidir` é a estrutura da decisão, e chama cada uma delas quando o assunto é dela, sem refazer o trabalho
- **Não é consultoria jurídica nem contábil.** Demissão, rescisão, regime tributário, sociedade: a decisão se estrutura aqui, o enquadramento legal é conversa com contador ou advogado. Dizer isso uma vez quando a pergunta for pra lá
- **Dado sensível fica dentro.** Decisão de contratar ou dispensar envolve nome, salário, motivo e às vezes saúde de terceiro. Na página, usar a função em vez do nome quando for pessoa que não é o usuário, e nada disso vai pra ferramenta externa sem autorização (LGPD). O mesmo vale pra dado financeiro de cliente
- **A página é dele, não do assistente.** Tom de `preferencias.md`, sem moldura, sem "em resumo". Ele vai reler daqui a três meses e precisa reconhecer a própria voz
