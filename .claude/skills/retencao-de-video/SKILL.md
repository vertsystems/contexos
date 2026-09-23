---
name: retencao-de-video
description: >
  Lê a curva de retenção de um vídeo longo do YouTube a partir do CSV do Studio, da tabela de
  impressões e CTR e da transcrição com marcação de tempo. Classifica a forma da curva (queda
  no gancho, degrau, sangria linear, pico de replay), devolve o segundo exato de cada queda
  cruzado com o que você estava dizendo ali, aponta em que etapa do funil o vídeo perde gente,
  e fecha com três correções por timestamp e uma regra pro próximo vídeo.
  Use quando o usuário disser "por que as pessoas param de ver meu vídeo", "minha retenção tá
  ruim", "o povo sai no começo", "onde eles desistem do vídeo", "baixei o CSV da retenção do
  YouTube", "analisa a curva de retenção", "tem muita impressão e pouca visualização", "meu
  vídeo tem view mas ninguém assiste até o fim", "o que eu conserto no próximo vídeo",
  "quero saber em que minuto eu perdi a audiência", ou /retencao-de-video.
---

# /retencao-de-video — Onde o vídeo perde gente

> **Convenção de pastas:** a saída vai em `conteudo/retencao/`. Na convenção **por cliente**, `clientes/<Nome>/conteudo/retencao/`. A pasta nasce na primeira análise.

O gráfico de retenção do Studio é a coisa mais útil que o YouTube entrega pra quem publica,
e a mais desperdiçada. Todo mundo olha, vê que cai, e fecha. O problema é que o eixo está em
porcentagem da duração, então "caiu aqui" nunca vira minuto e segundo, e sem o segundo não
existe conserto: existe impressão. Esta skill transforma a curva em uma lista de timestamps
com a frase que você estava falando em cada um deles. Aí o conserto fica óbvio, e quase
sempre é menor do que parecia.

## Dependências

- **Contexto:** `_memoria/empresa.md` (qual é o canal, o que ele vende), `_memoria/preferencias.md` (a voz, pro texto das correções sair no tom dele)
- **Cliente real:** `_memoria/publico.md`, se existir — o que o público veio buscar explica metade das quedas
- **Insumo obrigatório 1:** o CSV da curva de retenção, baixado do Studio (Analytics do vídeo → Engajamento → Retenção de público → download)
- **Insumo obrigatório 2:** a duração total do vídeo, em `mm:ss` ou `hh:mm:ss`
- **Insumo obrigatório 3:** a transcrição com marcação de tempo (`.srt`, `.sbv` ou `.vtt`), baixada em Studio → Legendas, ou gerada por `scripts/transcrever.js` a partir do arquivo de vídeo
- **Insumo obrigatório 4 (pro funil):** a tabela de impressões, CTR, visualizações e duração média (Analytics do vídeo → Alcance), exportada **com a linha de total**, sem detalhamento por data. Sem ela a curva ainda é legível, e o funil sai `[a confirmar]` em vez de estimado
- **Molde de referência (ler antes de escrever):** `templates/crescimento/retencao-de-video.md` — o que cada tela exporta, as armadilhas do arquivo, as duas retenções com fonte, as quatro formas da curva, as réguas e as definições oficiais do funil
- **Referências de copy:** `templates/copy/ganchos.md` (o conserto dos primeiros 30 segundos), `templates/copy/edicao.md` (o que cortar)
- **Script:** `scripts/retencao-video.js` — converte posição em segundo, acha as quedas, cruza com a legenda e fecha o funil
- **Conferência:** `node scripts/verificar.js texto` no arquivo final
- **Saída:** `conteudo/retencao/analise-<slug-do-video>-<AAAA-MM-DD>.md` e a linha nova em `conteudo/retencao/regras.md`

---

## Workflow

### Passo 1 — Confirmar que dá pra fazer a análise

Três condições, e nenhuma é negociável. Conferir antes de pedir arquivo:

| Condição | Por quê |
|---|---|
| **Vídeo longo do YouTube** | é o único formato que exporta a curva ponto a ponto. Reels, TikTok e Shorts mostram gráfico na tela e não geram CSV |
| **Curva já processada** | o dado de retenção leva de um a dois dias pra fechar. Vídeo de ontem tem curva que muda amanhã |
| **Visualização suficiente** | abaixo de algumas centenas, a curva descreve dez pessoas. O script informa quantos pontos leu, e a análise diz isso na cara |

Se for Reels, TikTok ou Shorts, dizer em uma linha que não dá e oferecer o caminho que
existe: comparar os últimos vídeos entre si, o que é trabalho de `/medir`, ou melhorar o
gancho do próximo, que é `/video`. Não fingir análise de curva sem curva.

### Passo 2 — Pedir os arquivos, numa mensagem só

Isto é levantamento, não conversa. Uma mensagem, quatro pedidos:

> 1. "Baixa o CSV da retenção: no Studio, abre o vídeo → Analytics → Engajamento → Retenção de público → o ícone de download. Joga o arquivo em `dados/`"
> 2. "Qual a duração total do vídeo? (o número que aparece na miniatura, tipo 12:34)"
> 3. "Baixa a legenda com os tempos: Studio → Legendas → o vídeo → Editar → Opções → Baixar legendas. Se o vídeo não tem legenda, eu gero a transcrição do arquivo de vídeo"
> 4. "Manda a aba Alcance também: impressões, CTR, visualizações e duração média. Exporta o total do período, sem quebrar por data — o arquivo precisa ter a linha de total"

Se ele não tem a legenda nem o arquivo de vídeo, a análise segue sem o cruzamento, e o
arquivo final diz isso: as quedas saem com o segundo, sem a frase. Vale menos, e vale. Se a
aba Alcance não vier, a seção do funil sai com `[a confirmar]` em cada etapa, e o gargalo
fica sem resposta — que é mais honesto que apontar o gancho porque foi o único dado que tinha.

Nunca reconstruir a fala de memória, nem "supor" o que ele estava dizendo aos 4:09. O
cruzamento é o valor da skill; inventado, ele vira conselho aleatório com aparência de dado.

### Passo 3 — Ler a curva por comando

A curva não se lê a olho. O script converte posição em segundo pela duração, normaliza a
vírgula decimal do export em PT-BR, junta os intervalos vizinhos da mesma queda e compara
cada taxa com a mediana **do próprio vídeo**:

```bash
node scripts/retencao-video.js curva dados/retencao.csv --duracao 12:34 \
  --legenda dados/aula.srt \
  --alcance dados/alcance.csv \
  --saida conteudo/retencao/dados-<slug>.md
```

O que sai do comando, e que o assistente não recalcula:

- a retenção no primeiro ponto do arquivo, aos 15 s, aos 30 s, a 1 min e no fim
- perda no gancho, em pontos percentuais
- meia-vida: o segundo em que metade da audiência já saiu
- sangria mediana, em pontos por 10 segundos, e a régua de degrau daquele vídeo
- a forma da curva, com quanto cada forma custou em pontos
- as maiores quedas, até três, com o segundo de início, o de fim e a fala de cada uma
- os degraus e os picos de replay, também com a fala
- o funil, quando a aba Alcance veio

Duas coisas do cabeçalho do comando mudam o que se pode afirmar depois, e por isso ele
imprime as duas. **Quantos pontos o arquivo tem e quantos segundos cada ponto cobre:** são
sempre 100 pontos por vídeo, então num vídeo de uma hora cada ponto cobre uns 40 segundos e
o timestamp da queda tem a precisão de um passo, não de um segundo. **Em que segundo começa
a série:** o primeiro ponto é o fim do primeiro intervalo, não o segundo zero, então num
vídeo de 20 minutos a curva começa em 0:12 e a perda desses 12 segundos não está no arquivo.
Quando isso acontece o script avisa na tela, e o aviso vai pro arquivo final.

Tem também o que parece erro e não é. Tabela de quedas vazia quer dizer que nenhum trecho
perdeu 1 ponto acima do padrão do próprio vídeo: a perda está espalhada, e o conserto é de
estrutura. Retenção acima de 100% num trecho quer dizer que a audiência voltou pra rever ali,
e a documentação do YouTube prevê isso.

Se o script reclamar da coluna, ele imprime o cabeçalho do arquivo. Aí é conferir se o CSV é
mesmo o da retenção: o do Alcance tem data e impressão, e não tem posição no vídeo.

**Ler o que o comando devolveu antes de escrever qualquer frase.** Número que aparece no
arquivo final sai de lá, nunca de leitura do gráfico.

### Passo 4 — Cruzar cada queda com a fala

O script já traz o trecho da legenda em cada queda. O trabalho aqui é de leitura: entender o
que estava acontecendo e nomear a causa. Pra ver o contexto em volta de um segundo:

```bash
node scripts/retencao-video.js legenda dados/aula.srt --em 4:09
```

Isso mostra o trecho, o anterior e o seguinte. Com os três na tela, a causa quase sempre
aparece sozinha. O molde tem a tabela de causas por tipo de queda; a mais comum de longe é
banal: nos primeiros 20 segundos, o vídeo ainda não começou.

Nomear a causa em linguagem de gravação, não de análise. "Aos 4:09 você começou a ler o
texto da tela em voz alta, e ficou 40 segundos nisso" serve. "Queda de engajamento por baixa
densidade informacional" não serve pra nada.

**Pico de replay merece o mesmo cuidado.** Quando a retenção sobe, a legenda daquele trecho
é pauta pronta pro `/ideias`: alguém voltou porque o que estava ali valia repetir.

### Passo 5 — Fechar o funil com o que o Studio exporta

Quatro etapas, e o gargalo está numa só. Quando o `--alcance` foi junto no Passo 3, o funil
**já saiu ali** — não rodar de novo. O comando abaixo é pra quando só a aba Alcance existe
(vídeo sem curva processada, ou canal de outra pessoa):

```bash
node scripts/retencao-video.js funil dados/alcance.csv --duracao 12:34
```

O comando fecha impressões → CTR → visualizações → retenção, calcula quantos cliques o CTR
explica, compara com as visualizações reais e diz onde está o gargalo. Se o arquivo vier com
uma linha por data e sem linha de total, ele para e explica: impressão e visualização somam,
CTR e duração média não, e somar daria número errado no laudo. O conserto é reexportar sem o
detalhamento por data, ou passar os totais na mão com `--impressoes`, `--ctr`,
`--visualizacoes` e `--media`.

Duas leituras que valem explicar pro usuário, porque ele vai perguntar:

- **Visualização acima do que o CTR explica** não é erro de conta. Impressão só conta
  miniatura mostrada dentro do YouTube; tela final, playlist, link no WhatsApp e site de
  fora entram como visualização sem impressão
- **CTR abaixo de 2%** coloca o problema antes do play. Metade dos canais e vídeos do YouTube
  fica entre 2% e 10% (support.google.com/youtube/answer/7628154, conferido em 23/09/2026). Nesse
  caso a curva é secundária: quem entrou, entrou errado, e quem consertaria isso é miniatura
  e título, trabalho do `/publicar-video`

O que não está no export não entra no arquivo. De onde vieram as impressões, quanto o vídeo
vendeu e quem virou cliente são outra conversa, e `[a confirmar]` é resposta melhor que
número plausível.

### Passo 6 — Escrever as três correções (ou a única que existe)

Três, não dez. Cada uma amarrada a um timestamp, em ordem de pontos perdidos. Cada correção
tem três partes, e a do meio é a que costuma faltar:

1. **Onde** — o timestamp e o que estava sendo dito
2. **Por que caiu** — em uma frase, na causa concreta
3. **O que fazer** — ação de edição ou de roteiro, no imperativo, executável hoje

Correção boa cabe numa tarefa. "Corta de 0:00 a 0:18 e começa em 'o primeiro erro é não
somar o custo fixo'" é uma tarefa. "Melhorar o gancho" é um desejo.

Quando o comando não achou queda localizada, não inventar três. Aí a curva é sangria, e a
correção é uma só, estrutural: a duração. O número que sustenta isso está na tela — sangria de
tanto por 10 segundos, sem degrau —, e a frase honesta é "esse vídeo não perde gente num
ponto, perde no tamanho". Duas correções de timestamp forçadas valem menos que uma verdadeira.

Quando a correção é de edição e o vídeo já está publicado, dizer o que dá e o que não dá:
reenviar vídeo editado zera as métricas e perde os comentários. Corte de introdução costuma
valer no próximo, não neste.

### Passo 7 — Escrever a regra pro próximo vídeo

Uma frase, no imperativo, derivada da maior queda. Ela vai pro fim da análise e também pro
arquivo que o `/roteiro-longo` lê antes de escrever qualquer roteiro novo:

```markdown
<!-- conteudo/retencao/regras.md -->
# Regras que saíram da retenção dos vídeos

| Data | Vídeo | O que a curva mostrou | Regra |
|---|---|---|---|
| 2026-09-22 | Como precificar serviço | 39 pontos perdidos antes dos 30 s: apresentação e vinheta | Começar falando do primeiro erro, sem cumprimento e sem apresentação |
```

Uma regra por análise. Lista de dez regras não muda comportamento nenhum, e a terceira
análise do mesmo canal costuma repetir uma regra que já está lá: quando repetir, marcar como
reincidente em vez de duplicar a linha.

### Passo 8 — Escrever o arquivo

```markdown
# Retenção — <título do vídeo> — <data da análise>

Publicado em <data>. Duração <mm:ss>. <N> visualizações no período lido.

## O vídeo em uma frase
[Onde ele perde gente e quanto isso custou. Um número, não três.]

## A curva em números
[tabela vinda do --saida do script, sem retocar — inclusive o aviso de passo e de primeiro ponto, quando o script gerou]

## A forma da curva
[queda no gancho / degrau / sangria linear / pico de replay, com os pontos de cada uma]

## As quedas, por segundo (até três)
| # | Em | Pontos perdidos | O que você estava dizendo | Por que caiu |
|---|---|---|---|---|
[se o comando não achou queda localizada, escrever isso em uma frase em vez de preencher a tabela]

## Os picos de replay
| Em | Sobe | O que você estava dizendo | Vira pauta? |
|---|---|---|---|

## O funil, só com o que o Studio exporta
| Etapa | Número | Leitura |
|---|---|---|
| Impressões | ... | ... |
| CTR de impressões | ... | ... |
| Visualizações | ... | ... |
| % média assistida | ... | ... |

Gargalo: [uma etapa, com o número que a aponta]

## As correções (até três, na ordem do que custou mais)
1. **<timestamp>** — [por que caiu] → [o que fazer, no imperativo]
2. ...
3. ...

## A regra pro próximo vídeo
> [uma frase, no imperativo]

## O que não dá pra afirmar com esse dado
[o que faltou: legenda ausente, poucas visualizações, aba Alcance não enviada, período diferente entre as duas tabelas, passo do arquivo maior que o gancho, curva começando depois do segundo zero]
```

A última seção não é formalidade. Curva de vídeo com 40 visualizações e curva de vídeo com
9 mil pedem confiança diferente, e é aqui que isso fica escrito.

### Passo 9 — Conferir e entregar

```bash
node scripts/verificar.js texto conteudo/retencao/analise-<slug>-<AAAA-MM-DD>.md
```

Precisa terminar em "Tudo certo."

**Aqui não se roda `verificar.js tabela`.** Nenhuma tabela desta análise é soma de coluna:
são leituras de pontos diferentes da mesma curva. O `tabela` leria "38,8 pontos" como total
declarado da coluna ao lado e acusaria divergência que não existe. Quem garante os números
desta skill é o `retencao-video.js`, que os calculou.

Depois, a entrega no chat:

```
✓ conteudo/retencao/analise-<slug>-<data>.md
✓ conteudo/retencao/regras.md  (atualizado)

O vídeo perde <N> pontos antes dos 30 segundos e tem degrau em <mm:ss>.
As três correções estão no arquivo, em ordem de quanto custaram.

Começa pela primeira: é a que paga o dia de edição.
```

Se o vídeo já performou bem, o trecho de pico de replay vai pro `biblioteca.md`: é matéria
bruta do `/reaproveitar` e pauta confirmada pelo `/ideias`.

---

## Regras

- **Sem CSV, sem análise.** Descrição em texto ("acho que cai no meio") não vira curva. O cruzamento entre segundo e fala é a skill inteira, e sem o arquivo ele seria chute com cara de laudo
- **Só vídeo longo do YouTube.** Reels, TikTok e Shorts não exportam a curva. Nesses casos, dizer isso e mandar pro caminho que existe, sem inventar análise
- **Todo número sai do comando.** Retenção aos 30 s, pontos perdidos, meia-vida, taxa por 10 segundos, cliques que o CTR explica: tudo por `scripts/retencao-video.js`. Número lido no gráfico não entra no arquivo
- **Ponto percentual não é porcentagem.** Cair de 60% pra 51% é queda de 9 pontos. Chamar isso de "queda de 9%" está errado, e o usuário vai comparar com outro vídeo depois
- **Nunca reconstruir a fala.** Se a legenda não veio, a queda sai com o segundo e sem a frase, e o arquivo diz que faltou. Supor o que ele falava é o pior erro possível aqui
- **Três correções, não dez.** Análise que devolve lista longa não muda nada. A ordem é por pontos perdidos, e a primeira é a que vale o esforço
- **Nenhum número de referência sem fonte.** A faixa de 2% a 10% do CTR é a única que o YouTube publica, e entra com a URL e a data. As réguas de degrau, gancho e sangria são da skill, calculadas, e o arquivo diz que são da skill
- **Não prometer alcance.** O que a recomendação do YouTube faz com a retenção não é documentado em número. Dizer "sobe a retenção e o vídeo explode" é vender o que ninguém controla
- **Curva rasa merece aviso, não silêncio.** Abaixo de algumas centenas de visualizações, a análise sai com a ressalva no topo
- **Timestamp tem a precisão do passo.** São 100 pontos por vídeo, então o ponto cobre 7 segundos num vídeo de 12 minutos e 40 num de uma hora. Em vídeo longo, escrever "aos 34:07" finge precisão que o arquivo não tem: o certo é a janela, "entre 34:00 e 34:40"
- **O funil sai de uma linha, e da linha certa.** A tabela do Alcance precisa ser o total do período. Impressão e visualização somam, CTR e duração média não, e ler o número de um dia como se fosse o do vídeo é o erro que ninguém percebe depois
- **Queda vazia é resposta.** Se nada passou da régua, escrever isso. Preencher três linhas de tabela com intervalos de 0,3 ponto entrega tarefa de edição que não muda nada
- **Dado do canal é dado do usuário.** CSV de Analytics, transcrição e número de faturamento por vídeo não vão pra ferramenta externa sem ele autorizar (LGPD). Transcrição gerada por `scripts/transcrever.js` usa a chave do `.env` dele, e isso se diz antes de rodar
- **Fronteira com as vizinhas:** `/video` escreve roteiro de vídeo curto e `/roteiro-longo` escreve o roteiro do longo, lendo `conteudo/retencao/regras.md`; `/publicar-video` cuida de título, miniatura, descrição e capítulo, que é onde o CTR se conserta; `/medir` é rastreamento de site e de canal com GA4 e UTM, não curva de vídeo; `/analisar-dados` é leitura genérica de arquivo, e serve quando o dado não é retenção de YouTube; `/ideias` recebe o pico de replay como pauta. Cuidado com o nome parecido: `/retencao` é churn de quem paga mensalidade, e escreve em `vendas/retencao/`. Se o assunto é cliente cancelando, é lá; aqui é curva de vídeo
