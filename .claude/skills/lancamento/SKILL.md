---
name: lancamento
description: >
  Planeja e orquestra um lançamento em três fases: pré (lista, conteúdo de antecipação,
  captação), durante (abertura, janela de venda, urgência honesta, atendimento) e pós
  (depoimento, lista de espera ou reabertura, medição). Entrega o plano com calendário em
  datas conferidas por comando, a lista de peças de cada fase com a skill que produz cada
  uma, as mensagens-chave e a meta em número. Serve pra curso, turma, produto, serviço
  novo, promoção de época e inauguração.
  Use quando o usuário disser "vou lançar um curso", "abrir turma nova", "vou lançar um
  produto", "quero fazer uma promoção de Black Friday", "vou inaugurar a loja", "como faço
  um lançamento", "quero abrir as vendas", "vou soltar uma novidade", "quero encher a turma",
  "montar a campanha de lançamento", ou /lancamento.
---

# /lancamento — Abrir vendas com começo, meio e fim

> **Convenção de pastas:** a saída vai em `lancamentos/<slug>-<AAAA-MM>/` (`plano.md` e `calendario.md`). Na convenção **por cliente**, `clientes/<Nome>/lancamentos/<slug>-<AAAA-MM>/`. A pasta nasce quando o plano é salvo.

A maior parte dos lançamentos de negócio pequeno morre na terça-feira da abertura: o dono
posta "abriu!", três pessoas curtem, ninguém compra. Não foi o produto. Foi abrir pra uma
lista que não existia, sem data anunciada, sem motivo pra decidir agora e sem ninguém no
WhatsApp na hora em que alguém perguntou. Esta skill organiza as três fases pra que a
janela de venda fale com gente que já estava esperando, e pra que o que aconteceu vire
número no fim.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, canais, quem atende
- **Oferta:** `_memoria/oferta.md` — preço, o que inclui, garantia. Se não existir, o Passo 2 manda pro `/oferta` antes de qualquer peça
- **Cliente real:** `_memoria/publico.md` — a dor na palavra dele, e a objeção que vai aparecer no meio da janela
- **Tom:** `_memoria/preferencias.md`
- **Foco atual:** `_memoria/estrategia.md` — o lançamento precisa caber no mês, não competir com ele
- **Prova disponível:** `biblioteca.md` — depoimento, foto, número já autorizados
- **Conteúdo já planejado:** `conteudo/calendario-<AAAA-MM>.md`, se existir, pra não postar duas coisas no mesmo dia
- **Lançamento anterior:** `lancamentos/*/plano.md`, se existir — o bloco "O que aconteceu" do último é a conversão de referência deste
- **Referência:** `templates/crescimento/lancamento.md` — os cinco tipos, as três fases, a conta, urgência honesta e os erros clássicos
- **Psicologia da decisão:** `templates/copy/psicologia.md` — o limite ético de cada mecanismo
- **Scripts:** `scripts/lancamento.js` (calendário de marcos e conta da meta), `scripts/utm.js` (link com origem, convenção do `/medir`), `scripts/verificar.js` (`datas`, `tabela`, `texto`)
- **Vizinhas:** `/oferta` (o que se vende), `/calendario` (o conteúdo do mês), `/evento` (um evento dentro do lançamento), `/sequencia` (as mensagens automáticas), `/medir` (o que rastrear e como ler a origem)
- **Saída:** `lancamentos/<slug>-<AAAA-MM>/plano.md` e `lancamentos/<slug>-<AAAA-MM>/calendario.md`. O slug é o nome do produto ou da promoção em minúsculas com hífen (`turma-confeitaria-2026-11`, `black-friday-2026-11`)

---

## Workflow

### Passo 1 — Entender o que vai ser lançado

Uma pergunta por vez. A primeira define quase tudo:

> "O que você vai lançar, e isso já foi vendido alguma vez?"

Depois, na ordem, só o que ainda não ficou claro:

1. "Quando você quer abrir as vendas? Tem data que não pode mudar (feriado, evento, início de turma)?"
2. "Quem vai ficar sabendo primeiro? Você tem lista de e-mail, grupo de WhatsApp, seguidores que respondem, ou vai começar do zero?"
3. "Quantos você quer vender, ou quanto precisa faturar com isso?"
4. "Quem responde o WhatsApp nos dias de venda, e em que horário?"

A resposta 2 é a que mais muda o plano. Lista de 40 pessoas que já perguntaram "quando
abre?" é melhor que 3 mil seguidores que nunca responderam. Anotar o tamanho **e** a
temperatura da lista, porque a conta do Passo 5 usa as duas.

### Passo 2 — Conferir se a oferta está fechada

Ler `_memoria/oferta.md`. Se faltar preço, o que inclui, garantia ou forma de pagamento,
parar aqui: cada uma dessas lacunas vira pergunta sem resposta no meio da janela, e
pergunta sem resposta em janela curta é venda que esfria. Dizer isso em uma linha e
oferecer o `/oferta` (e o `/preco`, se o valor ainda não existe). Voltar quando fechar.

O que a skill precisa saber da oferta pra seguir: nome, preço, forma de pagamento, o que
inclui, garantia, quantidade real (vagas, unidades, ou "sem limite") e o motivo verdadeiro
pra decidir dentro da janela.

### Passo 3 — Escolher o tipo

Cruzar o que ele respondeu com a tabela de `templates/crescimento/lancamento.md`:

| Se ele disse | Tipo | O que isso implica |
|---|---|---|
| Nunca vendeu, quer testar | **Semente** | Pré de 2 semanas, poucas vagas, entrega ao vivo ou por etapas |
| Já tem lista e já vendeu | **Interno** | Pré de 4 semanas com 3 peças de antecipação, janela de 5 a 7 dias |
| Tem parceiros com público | **Externo** | Só se o interno já rodou; 8 semanas, comissão combinada |
| Quer vender o ano todo | **Perpétuo** | Depende de série automática (`/sequencia`) e tráfego; não é o primeiro lançamento de ninguém |
| Promoção de época, reabertura, estoque | **Relâmpago** | 3 dias de aviso, 48 a 72 horas de janela, só pra lista quente |

Dizer o tipo escolhido e o motivo em uma frase, e seguir. Se ele quer externo ou perpétuo
sem nunca ter feito um interno, dizer que a ordem importa e propor o interno primeiro. A
escolha continua sendo dele.

### Passo 4 — Calcular as datas

Data de lançamento não se conta de cabeça. O script gera os marcos do tipo a partir da
abertura e do fechamento, com dia da semana, distância da abertura (D-21, D0, D+7) e
feriado nacional:

```bash
node scripts/lancamento.js datas --abre 2026-11-10 --fecha 2026-11-16 --tipo interno \
  --md "lancamentos/<slug>-<AAAA-MM>/calendario.md"
```

O que conferir na saída antes de aceitar:

- **Abertura e fechamento em dia útil.** O script avisa se cair em sábado, domingo ou feriado nacional. Feriado da cidade ele não conhece: perguntar
- **Marco de WhatsApp em fim de semana.** O script lista os que caíram; post no feed pode ficar, mensagem de negócio rende mais em dia útil. `--uteis` puxa esses marcos pro dia útil anterior (abertura, fechamento e véspera ficam onde estão)
- **Abertura longe do fim do mês**, quando o público recebe no dia 5. Perguntar quando o cliente dele costuma ter dinheiro
- **O pré cabe na agenda.** Se o pré começa semana que vem e ele ainda não tem página nem lista, ou a abertura anda pra frente ou o tipo vira relâmpago pra uma lista menor. `--pre 14` encurta o pré do tipo, quando a lista já está quente
- **Choque com o calendário editorial.** Se `conteudo/calendario-<AAAA-MM>.md` existe, as peças do lançamento entram lá no lugar do que estava planejado, não em cima

Mudou a data? Rodar de novo. Depois, sempre:

```bash
node scripts/verificar.js datas "lancamentos/<slug>-<AAAA-MM>/calendario.md"
```

Só seguir com "Tudo certo". A coluna `Dia` é o que o verificador confere; não tirar.
Quando o calendário atravessa a virada do ano, o script escreve a data com o ano
(`22/12/2026`); manter assim, senão o verificador confere dezembro com o ano de janeiro.

### Passo 5 — Calcular a meta

Meta é uma conta, e ela nasce de trás pra frente: lista × conversão = vendas. A conversão
que vale é a do histórico dele: se já lançou, perguntar quantos entraram na lista e
quantos compraram, e usar esse número (ou ler do bloco "O que aconteceu" do plano
anterior, se existir). Se nunca lançou, a taxa não sai da skill: perguntar "de cada 100
pessoas da lista, quantas você acha que compram?" e rodar com o número dele, marcado
`[a confirmar]`. Se ele não faz ideia, rodar duas vezes, com 1% e com 3%, e mostrar as
duas saídas como os extremos de uma hipótese, não como previsão. O script devolve três
cenários em volta do número usado:

```bash
node scripts/lancamento.js meta --lista 850 --conversao 1,5 --ticket 497
node scripts/lancamento.js meta --vendas 30 --conversao 1,5 --ticket 497   # lista necessária
```

A segunda forma responde a pergunta que decide o pré: "pra vender 30 com essa lista, a
lista precisa ter quantas pessoas?". Se a resposta é 2.000 e ele tem 200, a conversa muda:
ou a meta cai, ou o pré cresce, ou o tipo vira semente. Descobrir isso agora custa uma
conversa. Descobrir no fechamento custa o lançamento.

A linha `conta da meta` que o script imprime vai pro plano como está: é ela que o
`verificar.js tabela` confere depois.

Se ele tem custo no lançamento (anúncio, ferramenta, bônus físico, comissão de parceiro),
a tabela de custo entra no plano e o cenário pessimista precisa cobrir esse custo. Ponto
de equilíbrio do lançamento é o cenário mínimo aceitável, não a meta.

### Passo 6 — Montar a lista de peças por fase

Cada peça do calendário tem uma skill que a produz. A tabela vai no plano com a data, e o
usuário pede cada peça quando chegar a vez, ou tudo de uma vez se preferir:

| Fase | Peça | Skill | Quando |
|---|---|---|---|
| Pré | Página ou formulário de lista de espera | `/landing` | Início do pré |
| Pré | Mensagem de convite pra lista (grupo, transmissão) | `/whatsapp` | Início do pré |
| Pré | 3 conteúdos de antecipação (problema, o que muda, prova) | `/carrossel` ou `/video` | D-21, D-14, D-7 |
| Pré | Série automática pra quem entrou na lista (boas-vindas, aquecimento) | `/sequencia` | Do início do pré até a abertura |
| Pré | Aula aberta ou live de antecipação, se houver | `/evento` | D-3 a D-1 |
| Pré | Anúncio de captação, se houver verba | `/anuncio-google` | Início do pré |
| Durante | Página de vendas com a oferta completa | `/landing` | Pronta antes da abertura |
| Durante | Mensagem de abertura, meio e fechamento | `/whatsapp` + `/email` | Abertura, meio, D-2, véspera, dia |
| Durante | Vídeo curto respondendo a objeção principal | `/video` | Dia seguinte à abertura |
| Pós | Boas-vindas, pedido de depoimento | `/pos-venda` | Dia seguinte ao fechamento, e no primeiro resultado |
| Pós | Lista de espera de quem não comprou | `/sequencia` | Dia seguinte ao fechamento |
| Pós | Medição e leitura do que vendeu | `/revisao-semanal` + `/medir` | Uma semana depois |

Não é obrigatório produzir tudo. O mínimo que funciona: um lugar pra levantar a mão, três
peças de antecipação, a mensagem de abertura, a de fechamento e a de agradecimento. O
resto cresce com a lista.

Cada link de cada peça leva a origem, na convenção do `/medir` (`source` e `medium` da
tabela "Onde cada link vive" em `templates/crescimento/medicao.md`; `campaign` é o slug do
lançamento; `content` é a peça), gerado por comando pra sair igual em todas:

```bash
node scripts/utm.js "https://site.com/turma" --source whatsapp --medium whatsapp --campaign turma-confeitaria-2026-11 --content abertura
node scripts/utm.js "https://site.com/turma" --source newsletter --medium email --campaign turma-confeitaria-2026-11 --content vespera
```

Sem isso, o pós não tem como dizer qual mensagem vendeu. A tabela de links entra no plano.

### Passo 7 — Escrever as mensagens-chave

Não são todas as mensagens; são as cinco que decidem o lançamento, escritas na voz dele,
em `_memoria/preferencias.md`, e na palavra do cliente, em `_memoria/publico.md`:

1. **Convite pra lista** — o que vem, quando, e por que entrar na lista antes é melhor do que esperar (bônus real, ordem de vaga, aviso antes de todo mundo)
2. **Abertura** — o que é, pra quem, quanto, até quando, o link. Tudo na primeira mensagem. Quem precisa perguntar o preço não compra na abertura
3. **Meio da janela** — a objeção principal tratada de frente, com prova. É a mensagem mais fria do lançamento e a mais pulada
4. **Fechamento** — o motivo verdadeiro de fechar (turma começa, lote acaba, bônus sai), a hora exata, e nada de novo: bônus surpresa no último dia pune quem comprou cedo
5. **Depois** — agradecimento pra quem entrou, uma mensagem só pra quem não entrou, com o lugar onde ele fica sabendo da próxima. Sem insistir. Se vai haver reabertura, ela é anunciada aqui como turma nova, com data e condição próprias (preço maior, lote 2), nunca como o mesmo prazo esticado

Cada uma em duas variantes de temperatura, como o `/pos-venda` faz. Mensagem de WhatsApp
segue o formato do `/whatsapp`; e-mail longo vai pro `/email`.

### Passo 8 — Escrever o plano

`lancamentos/<slug>-<AAAA-MM>/plano.md`:

```markdown
# Lançamento — <nome> — <mês/ano>

## Em uma frase
[O que abre, pra quem, de <data> a <data>, com meta de N vendas.]

## Tipo e por quê
[Semente/interno/externo/perpétuo/relâmpago, e o motivo em uma linha]

## A oferta (de _memoria/oferta.md)
| Item | Valor |
|---|---|
| Nome | |
| Preço e forma de pagamento | |
| O que inclui | |
| Garantia | |
| Quantidade real (vagas, unidades) | |
| Motivo verdadeiro pra decidir na janela | |

## A lista
| Canal | Contatos hoje | Temperatura | Meta de entradas no pré |
|---|---|---|---|

## A meta (conferida com scripts/lancamento.js meta)
| Cenário | Conversão | Vendas | Receita |
|---|---|---|---|
| Pessimista | | | |
| Meta | | | |
| Otimista | | | |

Conta da meta: <lista> × <conversão>% = <N> vendas · <N> × R$ <ticket> = R$ <receita>
Conversão usada: N% [do histórico de <lançamento anterior> / a confirmar com este]

## Custo do lançamento
| Item | Valor |
|---|---|
| **Total** | |

## Datas (detalhe em calendario.md)
- Pré começa: <dia> <dd/mm>
- Abre: <dia> <dd/mm> às <hora>
- Fecha: <dia> <dd/mm> às <hora>

## Peças por fase
| Fase | Peça | Skill | Data | Status |
|---|---|---|---|---|

## Links com origem (scripts/utm.js)
| Peça | Link |
|---|---|

## Mensagens-chave
### Convite pra lista — A / B
### Abertura — A / B
### Meio da janela — A / B
### Fechamento — A / B
### Depois — A / B

## Atendimento na janela
[Quem responde, em que horário, e o que responder nas 5 perguntas mais prováveis]

## O que medir
| Fase | Número | Onde |
|---|---|---|
| Pré | Entradas na lista por dia, por canal | Formulário, grupo, planilha |
| Durante | Cliques por link (utm_content), vendas por dia, objeção mais repetida | Plataforma de pagamento, WhatsApp |
| Pós | Conversão final, receita, custo, depoimentos | Este plano, conferido por comando |

## Pendências antes de abrir
- [ ] Oferta fechada em _memoria/oferta.md
- [ ] Datas conferidas por comando
- [ ] Página de vendas no ar e testada no celular
- [ ] Link de pagamento testado com uma compra real
- [ ] Quem atende, definido
- [ ] [regra legal de promoção, se houver sorteio ou preço riscado: a confirmar]
```

Depois de escrever, conferir por comando:

```bash
node scripts/verificar.js datas  "lancamentos/<slug>-<AAAA-MM>/plano.md"
node scripts/verificar.js tabela "lancamentos/<slug>-<AAAA-MM>/plano.md"
node scripts/verificar.js texto  "lancamentos/<slug>-<AAAA-MM>/plano.md"
```

A tabela de custo soma; a de cenários não (cada linha é um cenário, e o verificador
imprime a soma das colunas como informação, não como erro). A linha `Conta da meta` é
conferida como multiplicação. Se o verificador acusar diferença no custo, refazer a
partir dos itens, nunca ajustar o total. As datas do plano precisam ser as mesmas do
`calendario.md`: copiar de lá, não redigitar.

### Passo 9 — Levar pro dia a dia

- As datas do calendário entram em `tarefas.md`, uma linha por marco, com a skill que produz a peça
- Se existe `conteudo/calendario-<AAAA-MM>.md`, as peças do lançamento substituem os posts daqueles dias; avisar o que saiu
- Perguntar se ele quer as peças agora ou conforme a data chega. Se for agora, começar pelo que o pré precisa primeiro: a captação

### Passo 10 — Fechar o ciclo

O marco "Medição", uma semana depois do fechamento, está em `tarefas.md`. Quando ele
chega, abrir o plano e preencher o que aconteceu: quantos entraram na lista, quantos
compraram, de qual origem (`node scripts/utm.js contar` na planilha de vendas com a
coluna de origem, como o `/medir` faz), qual mensagem vendeu, quanto custou. Esse bloco
entra no fim do `plano.md`, e o `/revisao-semanal` da semana lê daqui:

```markdown
## O que aconteceu
| Número | Planejado | Real |
|---|---|---|
| Entradas na lista | | |
| Vendas | | |
| Conversão | | |
| Receita | | |
| Custo | | |

Origem que mais vendeu: <canal/mensagem>
Quem não comprou: <lista de espera montada em /sequencia, ou reabertura marcada pra <data>>
O que mudar no próximo: [3 linhas, no máximo]
```

A conversão real vira a referência do próximo lançamento. É assim que o segundo é melhor
que o primeiro em vez de igual. Depoimento que chegar vai pra `biblioteca.md` com nome,
contexto e data.

---

## Regras

- **Nunca abrir sem lista.** Se a resposta do Passo 1 é "vou postar e ver", o plano começa pelo pré, e a abertura anda pra frente até a lista existir. Dizer isso uma vez, sem sermão
- **Urgência só quando é verdade.** Vaga limitada tem número real, prazo que fecha não reabre na segunda, bônus que sai não volta, preço que sobe sobe de verdade. Contador que recomeça e "últimas vagas" em turma vazia queimam a marca, e a segunda vez ninguém acredita nem na urgência verdadeira. O limite está em `templates/copy/psicologia.md`
- **Não mudar a regra no meio.** Estender prazo, baixar preço ou criar bônus no último dia pune quem comprou cedo. Se o lançamento vai mal, a resposta é mais conversa e mais prova, não mais desconto. Reabertura é lançamento novo, com data e condição próprias, anunciado depois do fechamento; nunca o mesmo prazo esticado
- **Data se calcula, nunca se conta de cabeça.** `scripts/lancamento.js datas` gera, `verificar.js datas` confere. Nenhum plano sai sem "Tudo certo" no calendário
- **Meta é número, com a conta ao lado.** "Vender bastante" não entra no plano. Se a conversão é hipótese, ela aparece como hipótese, marcada `[a confirmar]`, e a primeira turma serve pra medir. A skill não escolhe a taxa por ele: sem histórico, o número é dele ou é uma faixa mostrada como faixa
- **Não inventar taxa nem regra legal.** Conversão de mercado, prazo do preço anterior no Código de Defesa do Consumidor, autorização pra sorteio: tudo entra como `[a confirmar]` e vira pendência antes da abertura, conferida com o usuário ou por WebSearch na hora
- **Fronteira com as vizinhas:** o que se vende é `/oferta` e o valor é `/preco`; o conteúdo do mês fora do lançamento é `/calendario`; a página é `/landing`; cada peça é da skill que a produz (`/carrossel`, `/video`, `/email`, `/whatsapp`, `/anuncio-google`); o depois de quem comprou é `/pos-venda`; a leitura do resultado é `/revisao-semanal`, e o rastreio (UTM, pixel, de onde veio cada venda) é `/medir`. Um evento ao vivo dentro do lançamento (aula aberta, live, inauguração) entra aqui como marco do calendário; o roteiro, a captação e a logística dele são `/evento`. A série de mensagens automáticas (lista de espera, aquecimento de quem entrou, perpétuo) é `/sequencia`; esta skill diz quais mensagens existem e em que dia, e a `/sequencia` escreve a série com gatilho e intervalo
- **Sorteio, concurso e preço riscado têm regra própria.** O plano marca como pendência e não produz peça com esses mecanismos antes de o usuário confirmar o que vale
- **Lista é dado pessoal (LGPD).** Quem entrou na lista de espera deu o contato pra saber do lançamento, não pra receber tudo pra sempre. Descadastro em um clique, nada de mandar a lista pra ferramenta externa sem autorização, e quem pediu pra sair, sai. Grupo de WhatsApp com número visível de todos precisa de aviso na entrada
- **Uma pergunta por vez no Passo 1.** Levantamento de lançamento tem cinco perguntas; feitas juntas, voltam três respostas e duas lacunas
- **Quando o resultado for ruim, dizer o resultado.** Lançamento que vendeu 4 com meta de 30 é dado, não vergonha: o bloco "O que aconteceu" existe pra isso, e é dele que sai o próximo
