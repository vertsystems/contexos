# Retenção de vídeo longo no YouTube — curva, funil e o segundo da queda

Referência do `/retencao-de-video`. Não é o workflow: é o que a skill consulta pra ler a
curva sem chutar. Serve pra vídeo longo do YouTube, o único formato que exporta a curva de
retenção ponto a ponto em arquivo. Reels, TikTok e Shorts mostram gráfico na tela e não
entregam CSV; ali o que sobra é comparar vídeo com vídeo, e isso é outro trabalho.

Cada número e cada definição daqui foi aberta na página oficial que a publica e conferida em
23/09/2026; a URL está na linha ao lado. O que é régua da própria skill está marcado como
**régua calculada**, e não como número do YouTube — a diferença importa, porque o YouTube não
publica limite de "queda boa".

---

## O que o Studio exporta, e de onde

Três arquivos, três telas diferentes. Sem os três o cruzamento não fecha.

| Insumo | Onde no Studio | O que sai | Fonte |
|---|---|---|---|
| **Curva de retenção** | vídeo → Analytics → Engajamento → Retenção de público; o arquivo sai pelo modo avançado, em "Exportar visualização atual" | CSV com posição no vídeo e retenção em cada ponto | relatório: support.google.com/youtube/answer/9314415?hl=pt-BR · export: support.google.com/youtube/answer/9088722?hl=pt-BR |
| **Impressões, CTR, visualizações, duração média** | vídeo → Analytics → Alcance, ou o modo avançado | CSV ou planilha com as métricas do período | support.google.com/youtube/answer/9314486?hl=pt-BR |
| **Transcrição com marcação de tempo** | Studio → Legendas → o vídeo → Editar → Opções → Baixar legendas | `.srt`, `.sbv` ou `.vtt` com `hh:mm:ss` em cada trecho | support.google.com/youtube/answer/2734705?hl=pt-BR e, pros formatos aceitos, answer/2734698?hl=pt-BR |

O modo avançado é a porta do export: "Exportar visualização atual" gera o arquivo de
qualquer relatório aberto, com teto de 500 linhas por download
(support.google.com/youtube/answer/9088722?hl=pt-BR). Pra curva isso sobra: a API devolve 100
pontos por vídeo, e o Studio exporta a mesma granularidade.

**Atenção ao prazo de processamento.** A própria página do relatório avisa que o dado de
retenção leva de um a dois dias pra ficar disponível
(support.google.com/youtube/answer/9314415?hl=pt-BR). Vídeo de ontem tem curva instável, e
ler curva de vídeo com 30 visualizações produz opinião com aparência de número.

---

## As três armadilhas do arquivo

O script existe por causa destas. Nenhuma se resolve olhando o gráfico.

**1. O eixo não vem em segundo.** A posição vem como porcentagem da duração (`0` a `100`) ou
como fração (`0` a `1`) — a dimensão da API se chama `elapsedVideoTimeRatio` e é "a proporção
entre a parte decorrida do vídeo e a duração dele", com valores de `0,01` a `1,0`
(developers.google.com/youtube/analytics/dimensions). Sem multiplicar pela duração, "caiu aos
34%" não vira timestamp, e timestamp é a única coisa que o criador consegue consertar.

Duas consequências que a mesma página deixa explícitas, e que mudam a leitura:

- **São 100 pontos por vídeo, sempre.** O passo cresce com a duração: 7,5 s num vídeo de 12
  minutos, 39 s num de 65. Régua de queda em "pontos por 10 segundos" com piso fixo não
  dispara em vídeo longo, porque a saída chega diluída no intervalo grande. Por isso o piso do
  degrau é em pontos perdidos dentro de um intervalo, convertido pro passo daquele arquivo
- **O primeiro ponto não é o segundo zero.** O valor marca o fim do intervalo e a série começa
  em `0,01`: num vídeo de 20 minutos o primeiro ponto é 0:12, e a perda dos 12 primeiros
  segundos não está no arquivo. O laudo diz isso em vez de chamar o primeiro ponto de "início"

**2. Vírgula decimal e ponto de milhar.** O export em PT-BR escreve `61,20` e `12.400`.
Somar sem normalizar dá `NaN` ou dá vinte onde era dois centésimos. O script lê a curva com
regra própria (na curva o ponto é sempre decimal, porque nada ali chega a mil) e lê o funil
com o `scripts/br.js`, onde `12.400` impressões é milhar de verdade.

**3. O nome da coluna muda.** Idioma, data do export e tela de origem trocam o cabeçalho.
O script procura por padrão, não por nome exato, e aceita as duas línguas:

| O que ele procura | Cabeçalhos que já apareceram |
|---|---|
| posição | `Posição do vídeo (%)`, `Video position (%)`, `elapsedVideoTimeRatio`, `Tempo` |
| retenção absoluta | `Retenção absoluta do público (%)`, `Absolute audience retention`, `audienceWatchRatio` |
| retenção relativa | `Retenção relativa do público`, `relativeRetentionPerformance` |

Se ele não achar, devolve a lista de colunas do arquivo e para. É melhor que adivinhar.

---

## As duas retenções, e o que cada uma responde

| Métrica | O que é | Como se lê |
|---|---|---|
| **Absoluta** (`audienceWatchRatio`) | proporção entre quantas vezes aquele trecho foi assistido e o total de visualizações do vídeo | 61% aos 30 s: seis de cada dez que deram play ainda estão ali |
| **Relativa** (`relativeRetentionPerformance`) | desempenho contra outros vídeos do YouTube de duração parecida | **0,5 é a mediana.** Acima disso o vídeo segura melhor que a metade dos pares |

Fonte das duas: developers.google.com/youtube/analytics/metrics, conferida em 23/09/2026. A
mesma página avisa que a retenção absoluta **pode passar de 1** quando a audiência revê o
trecho — é por isso que a unidade do arquivo (fração ou porcentagem) se decide pela mediana
da coluna, nunca pelo maior valor dela.

A distinção decide o diagnóstico. Curva absoluta caindo pode ser só vídeo longo. Curva
absoluta caindo com relativa abaixo de 0,5 no mesmo trecho é problema do vídeo, não do
formato. Quando o export traz a coluna relativa, ela entra no arquivo do usuário.

O relatório de **momentos importantes** do Studio marca picos e quedas na tela, e separa a
introdução — os primeiros 30 segundos — do resto do vídeo
(support.google.com/youtube/answer/9314415?hl=pt-BR). É a mesma ideia do que o script faz,
com uma diferença prática: ele marca no gráfico, e o script devolve o segundo em texto, que
é o que dá pra cruzar com a transcrição.

---

## As quatro formas da curva

Toda curva de vídeo longo é combinação destas quatro. O script diz quais aparecem e quanto
cada uma custou em pontos perdidos.

### Queda no gancho

A curva despenca antes dos 30 segundos e depois estabiliza. Quem saiu não recusou o
conteúdo: recusou a abertura. Causa quase sempre banal, e sempre a mesma lista: cumprimento,
apresentação pessoal, pedido de inscrição, vinheta, explicação do que o vídeo vai explicar.

O que fazer: cortar o começo até o primeiro segundo em que o assunto aparece. Na maioria dos
vídeos isso é o corte dos primeiros 12 a 20 segundos, sem reescrever nada.

### Degrau

A curva anda estável e cai de repente num trecho, voltando a andar estável depois. O degrau
é o achado mais valioso da análise, porque tem causa localizada e conserto barato.

Causas mais comuns, em ordem de frequência: leitura de texto na tela, digressão que não
volta, mudança de assunto sem aviso, plano parado por muito tempo, pedido de inscrição no
meio, propaganda de produto próprio antes da entrega do que foi prometido.

### Sangria linear

Nenhum degrau, queda constante do início ao fim. É a curva mais difícil de consertar, porque
não há culpado: o vídeo perde gente sempre no mesmo ritmo, o que costuma significar que o
assunto acabou antes do vídeo. O conserto é estrutural, e quase sempre é duração.

### Pico de replay

A retenção **sobe** num trecho: gente voltando pra rever. É informação de ouro e ninguém
usa. Marca exatamente o que a audiência considerou útil o suficiente pra repetir: uma conta,
uma tabela, um endereço, um passo rápido demais.

O que fazer: refazer aquele trecho mais devagar, transformar em capítulo, e usar o mesmo
assunto como vídeo inteiro no próximo. Pico de replay é pauta pronta.

---

## As réguas (calculadas, não oficiais)

O YouTube não publica limite de "queda boa" nem de "queda ruim", e quem publica número
redondo pra isso está inventando. As réguas abaixo são da skill, definidas pra serem
reprodutíveis, e o script aplica exatamente estas:

| Régua | Valor | Por que esse |
|---|---|---|
| **Degrau** | taxa ≥ 3× a mediana do próprio vídeo, **e** ≥ 1 ponto perdido dentro de um intervalo, **e** ≥ 2 pontos somados no bloco | comparar o vídeo com ele mesmo evita chamar sangria normal de degrau; o piso em pontos por intervalo evita acusar ruído em curva plana **e** continua disparando em vídeo longo, onde o passo do CSV passa de meio minuto |
| **Gancho** | perda ≥ 30 pontos nos primeiros 30 s é problema; ≥ 20 é atenção | perder um terço da audiência antes de o assunto começar é perda de abertura, não de conteúdo |
| **Pico de replay** | bloco de subida contínua somando ≥ 1 ponto | testar linha por linha perdia o replay inteiro: com passo de 7,5 s, uma volta de 25 segundos aparece como três subidas de 0,8 |
| **Sangria linear** | nenhum degrau e coeficiente de variação das taxas abaixo de 0,5 | taxas pouco dispersas descrevem queda constante |
| **Meia-vida** | primeiro segundo em que a curva cruza 50% | número único, comparável entre vídeos do mesmo canal |
| **Queda que entra na lista** | ≥ 1 ponto perdido; queda solta (fora de gancho e de degrau) só entra se a taxa for ≥ 1,5× a mediana | sem esse piso a lista das "maiores quedas" enchia de intervalo de 0,1 ponto, e em sangria linear devolvia três fatias iguais da mesma ladeira, nenhuma com conserto possível |
| **Gargalo no gancho** | retenção aos 30 s abaixo de 70% | com o CTR dentro da faixa, a perda antes do assunto começar é o que segura o vídeo |
| **Gargalo no corpo** | porcentagem média assistida abaixo de 30% | as duas primeiras etapas de pé e o meio não pagando o tempo |

Bloco de queda é um conceito do script, e resolve um erro real: o CSV tem passo fixo, então
uma saída de 25 segundos aparece em três linhas seguidas. Sem juntar as linhas vizinhas, as
"três maiores quedas" viravam três pedaços da mesma queda.

Quando nenhuma queda passa da régua, a resposta honesta é "nenhuma queda localizada": a
perda está espalhada, e o conserto é de estrutura (duração, ordem dos blocos), não de
timestamp. Tabela de quedas vazia é resultado, não falha do script.

**Pontos percentuais, não porcentagem.** Cair de 60% pra 51% é queda de 9 pontos, não de 9%
(seria 15%). A skill escreve "pontos" em todo lugar por isso.

---

## O funil, limitado ao que o Studio exporta

Quatro etapas, e só a primeira e a última costumam receber atenção:

```
impressões → CTR → visualizações → retenção
```

| Termo | Definição oficial | Fonte |
|---|---|---|
| **Impressão** | "uma impressão é contabilizada quando pelo menos 50% da miniatura estiver visível na tela durante mais de um segundo" | support.google.com/youtube/answer/9314486?hl=pt-BR |
| **CTR de impressões** | com que frequência quem viu a miniatura no YouTube abriu o vídeo | support.google.com/youtube/answer/7628154?hl=pt-BR |
| **Faixa de referência do CTR** | "metade de todos os canais e vídeos no YouTube tem uma taxa de cliques de impressões que varia entre 2% e 10%" | mesma página |
| **Duração média da visualização** | `averageViewDuration`: "a duração média, em segundos, das reproduções do vídeo" | developers.google.com/youtube/analytics/metrics |

Duas contas que o script faz e que quase ninguém fecha na mão:

- **Cliques que o CTR explica** = impressões × CTR. Quando as visualizações passam disso, a
  diferença veio de fora da impressão contada: site externo, tela final, playlist, link
  direto. A própria página do YouTube avisa que "nem todas as impressões são contabilizadas
  nesta métrica, como as de sites externos ou telas finais"
  (support.google.com/youtube/answer/7628154?hl=pt-BR)
- **Porcentagem média assistida** = duração média ÷ duração total. É o único número do funil
  que compara vídeos de tamanhos diferentes

O gargalo sai da comparação, não da impressão de quem lê: CTR abaixo de 2% coloca o problema
antes do play, e aí miniatura e título decidem. CTR dentro da faixa com retenção aos 30 s
abaixo de 70% coloca o problema no gancho. As duas etapas de pé, com porcentagem assistida
abaixo de 30%, colocam o problema no corpo do vídeo. Os dois últimos cortes são régua
calculada da skill, não número publicado pelo YouTube.

**Uma linha, e a linha certa.** O export da aba Alcance costuma vir com uma linha por dia mais
a de total. Impressão e visualização somam; CTR e duração média não. O script usa a linha de
total, aceita o arquivo de uma linha só, e para quando há várias sem total: ler a impressão de
um dia como se fosse a do vídeo é o erro que passa despercebido no laudo.

**O que o funil não responde:** de onde vieram as impressões (isso é o relatório de fontes
de tráfego), quanto o vídeo vendeu (isso é `/medir`), e se o vídeo trouxe inscrito que
depois virou cliente. Não preencher esse buraco com estimativa é parte do método.

---

## As três correções, por tipo de queda

A análise só vale se termina em ação. Uma queda, uma correção, e sempre no timestamp.

| Onde caiu | O que quase sempre está acontecendo | Correção |
|---|---|---|
| 0 a 15 s | cumprimento, apresentação, vinheta | cortar até a primeira frase de assunto |
| 15 a 40 s | promessa vaga, "antes de começar" | começar pelo resultado e prometer o específico |
| meio, degrau seco | leitura de texto na tela | falar o texto em vez de ler, e mostrar só a linha que importa |
| meio, degrau suave | digressão | cortar o trecho inteiro na edição |
| antes de um bloco longo | plano parado | trocar de plano, inserir imagem, mudar de enquadramento |
| depois do assunto acabar | vídeo mais longo que o conteúdo | encerrar antes; o resto é outro vídeo |

**A regra pro próximo vídeo** é uma frase só, escrita em imperativo, derivada da maior queda
deste. Ela vive num arquivo que a skill de roteiro lê antes de escrever. Uma regra por
análise: lista de dez regras não muda nenhum comportamento.

---

## Léxico

- **Ponto percentual (pp)** — a unidade da diferença entre duas porcentagens
- **Bloco de queda** — intervalos vizinhos de queda forte juntados, a mesma saída
- **Passo** — o intervalo entre dois pontos do CSV: duração ÷ 100, então cresce com o vídeo
- **Meia-vida** — segundo em que metade da audiência já saiu
- **Sangria** — taxa de queda por 10 segundos fora dos degraus
- **Gancho** — os primeiros 30 segundos, onde a decisão de ficar acontece
- **Pico de replay** — trecho em que a retenção sobe, gente revendo
- **Tempo de exibição** — visualizações × duração média, em horas

---

## O que não entra nesta análise

- **Reels, TikTok e Shorts.** Sem CSV de curva, o cruzamento com a transcrição viraria chute
- **Comparação entre canais.** O dado de retenção de outro canal não é público
- **Previsão de alcance.** O que a recomendação do YouTube faz com a curva não é documentado em número
- **Curva de vídeo com pouca visualização.** Abaixo de algumas centenas de visualizações, o gráfico descreve dez pessoas, e o script diz quantos pontos leu pra isso ficar visível
