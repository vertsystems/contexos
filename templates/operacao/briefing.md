# Briefing assíncrono — as perguntas que outra pessoa precisa responder

Referência do `/briefing`. Consultada também pelo `/proposta` e pelo `/escopo` quando o
briefing do cliente chega pela metade, e pelo `/briefing-reuniao` quando a pergunta vai
ser feita na conversa em vez de por escrito.

Existe uma família de trabalho travado que nenhuma entrevista resolve: a resposta está
com quem não está na sala. O cliente não mandou o briefing. Ninguém sabe em que anexo do
Simples a empresa está, porque o contador não respondeu. E o sócio ainda não decidiu se
entra com o carro. Enquanto isso, quem escreve a proposta escolhe: espera, ou chuta. As
duas custam caro, e a segunda custa depois.

O conserto é um arquivo que a pessoa responde no tempo dela. Não um e-mail com cinco
perguntas soltas no meio do parágrafo.

---

## Os campos canônicos do briefing

Esta é a lista que o `scripts/briefing.js` usa pra decidir o que já está respondido e o
que falta. Peso 5 é campo sem o qual nada anda; peso 2 melhora a peça e não bloqueia
ninguém. A coluna da direita é o que passa a ser possível quando o campo enche.

| Campo | Tema | Peso | Destrava |
|---|---|---|---|
| **Objetivo** (`objetivo`) | O que precisa mudar | 5 | `/proposta` `/escopo` `/medir` |
| **Como medir** (`medida`) | O que precisa mudar | 4 | `/medir` `/relatorio-cliente` |
| **Prazo** (`prazo`) | O que precisa mudar | 4 | `/escopo` `/calendario` `/contrato` |
| **Entregas** (`entregas`) | O trabalho | 5 | `/proposta` `/escopo` `/contrato` |
| **Restrições** (`restricoes`) | O trabalho | 4 | `/publicidade-regulada` `/blindar` |
| **Fora do escopo** (`fora`) | O trabalho | 3 | `/escopo` `/contrato` |
| **O que já tentaram** (`historico`) | O trabalho | 3 | `/escopo` `/oferta` |
| **Quem compra** (`publico`) | Quem compra de você | 5 | `/publico` `/landing` `/carrossel` |
| **A dor na palavra do cliente** (`dor`) | Quem compra de você | 5 | `/publico` `/landing` `/angulos` |
| **O que se vende** (`oferta`) | Quem compra de você | 4 | `/oferta` `/preco` `/produto` |
| **Objeções** (`objecao`) | Quem compra de você | 4 | `/vender` `/landing` `/oferta` |
| **Concorrentes** (`concorrentes`) | Quem compra de você | 2 | `/concorrente` |
| **Prova autorizada** (`prova`) | Quem compra de você | 2 | `/case` `/landing` `/biblioteca` |
| **Orçamento** (`orcamento`) | Dinheiro e decisão | 4 | `/proposta` `/preco` |
| **Quem decide** (`decisor`) | Dinheiro e decisão | 4 | `/proposta` `/contrato` `/briefing-reuniao` |
| **Acessos** (`acessos`) | Material e acesso | 3 | `/conectar` `/site` `/seo` |
| **Marca** (`marca`) | Material e acesso | 3 | `/design-system` `/marca` |
| **Dado pessoal** (`dados`) | Material e acesso | 3 | `/cadastro-clientes` `/blindar` |
| **Canal e retorno** (`canal`) | Como a gente se fala | 3 | `/confirmacao-de-agenda` `/pos-venda` `/relatorio-cliente` |
| **Quem é o cliente** (`quem`) | Contexto | 3 | `/proposta` `/relatorio-cliente` |

`node scripts/briefing.js referencia` imprime essa tabela e, embaixo dela, quais campos
cada skill espera. É de lá que sai a frase "com isso já dá pra rodar o `/proposta`".

### Como o script decide que um campo está vazio

Ele não exige que o briefing use esses títulos. Casa por sinônimo: "Público alvo",
"persona" e "cliente ideal" caem todos em `publico`; "Entregas previstas" e
"deliverables" caem em `entregas`. Depois mede o que sobrou de conteúdo real e classifica
em quatro estados:

- **preenchido** (`✓`) — tem texto de verdade, acima de doze caracteres depois de tirar
  marcação, linha de fonte e frase de pendência
- **parcial** (`~`) — tem texto e tem `[a confirmar]`, "a definir" ou "pendente" no meio.
  Conta como presente
- **perguntado, voltou "não sei"** (`?`) — o campo só tem a dúvida datada que o `voltar`
  gravou. Não é resposta, e não destrava skill nenhuma: serve pra ninguém perguntar a
  mesma coisa duas vezes sem saber
- **vazio** (`·`) — nenhum título casou, ou o que casou é só rótulo

Só o vazio entra no questionário por padrão. Parcial e `?` entram com `--incompletos`, e
qualquer um deles com `--campos <chave>`.

Duas frases não contam como conteúdo, de propósito: "Em aberto", que é o que o próprio
script grava em campo sem resposta, e a linha `_Fonte: ..._`, que é procedência. Sem essa
exceção a segunda rodada acusava divergência com um texto que o script tinha escrito.

---

## As cinco regras da pergunta que volta respondida

**1. Uma ideia por pergunta.** "Qual o objetivo, o público e o prazo?" recebe resposta
sobre o objetivo. As outras duas somem, e quem perguntou acha que foram respondidas.

**2. Mais importante primeiro.** Todo mundo cansa na metade. Se a pessoa parar na
pergunta seis, o que você perdeu foi o que pesa menos. Por isso a ordem é por peso, não
por assunto: o tema que carrega a pergunta mais pesada abre o arquivo.

**3. "Não sei" precisa estar autorizado por escrito.** Sem essa linha, a pessoa educada
inventa. Dúvida marcada é insumo: você sabe onde não pisar. Palpite escrito com cara de
fato é pior que campo vazio, porque ninguém desconfia dele.

**4. "Por que a gente pergunta" só onde a pergunta parece estranha.** Explicar tudo
dobra o tamanho do arquivo e ensina a pessoa a pular texto. Vale a explicação em três
casos: quando a pergunta parece invasiva (orçamento), quando a resposta óbvia é a errada
(prazo sem motivo) e quando a pessoa não imagina o uso (a frase exata do cliente dela).

**5. Um campo aberto no fim, sempre.** "Tem alguma coisa que a gente não perguntou e que
você acha que precisamos saber?" É a pergunta que mais rende por caractere. Sai de lá o
que nenhum formulário previa: o sócio que vetou a cor, a fiscalização que veio em julho,
a data em que a loja fecha.

O desenho vem do `to-questionnaire` de Matt Pocock, que trata o assunto como envio e não
como tema: a entrevista é com quem manda, sobre quem vai receber e o que precisa voltar
(github.com/mattpocock/skills, lido em 22/09/2026). Duas coisas foram acrescentadas
aqui: a âncora no campo que a pergunta destrava, e o passo de volta.

---

## Como escrever cada pergunta

Quem responde é o cliente, o contador ou o sócio, não um colega de profissão. Três
hábitos resolvem quase tudo.

**Peça o material, não o resumo.** "Qual a dor do seu público?" produz "as pessoas
querem qualidade". "Copie uma mensagem em que um cliente te pediu isso" produz a frase
que vai pra página. Sempre que existir um documento, um áudio ou um print que responde,
peça o documento.

**Ancore no concreto.** Em vez de "descreva seu cliente ideal", pergunte pela última
pessoa que comprou. Memória de caso real vem com detalhe; descrição de perfil vem com
adjetivo.

**Aceite faixa onde valor exato trava.** Orçamento é o campo que mais fica em branco, e
quase nunca por sigilo: é porque a pessoa não tem o número. Faixa ela tem.

### A mesma pergunta em outra voz

O campo é o mesmo; a pergunta não. Quem responde muda o que a pergunta pode pedir, e é
por isso que `--para` troca o texto e não só corta a lista.

| Campo | Pro cliente | Pro contador | Pro sócio |
|---|---|---|---|
| `quem` | o que a sua empresa vende e desde quando | em que regime a empresa está e, se for Simples, em qual anexo | — |
| `oferta` | o que está sendo vendido, por quanto | essa atividade cabe no CNAE? dá pra emitir nota? | — |
| `orcamento` | qual faixa já está aprovada | entra como despesa da empresa ou sai da pessoa física? | quanto sai do caixa por mês, e de onde |
| `entregas` | o que você espera receber | — | o que fica com você e o que fica comigo |
| `decisor` | quem mais precisa concordar | — | nesse assunto, quem bate o martelo |

O pedido do contador é o exemplo mais claro de por que isso importa. "Qual faixa de
investimento já está aprovada pra isso?" mandada pro contador volta em branco, porque não
é assunto dele; a mesma linha do briefing, perguntada como "entra como despesa da empresa
ou sai da pessoa física?", volta respondida e ainda diz quem emite a nota.

Duas dessas perguntas mexem com alíquota, e por isso vale a fonte: a Lei Complementar
123/2006 divide as atividades do Simples Nacional em cinco anexos, e o art. 18 manda tirar
a alíquota do cruzamento entre o anexo e a receita bruta acumulada dos doze meses
anteriores ao período de apuração (planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm,
conferido em 23/09/2026). Qual é o anexo da empresa quem responde é o contador; esta skill
formula a pergunta, não a resposta.

### O que nunca entra

- **Senha, token ou cartão.** A pergunta de acesso é sobre **quem** tem o acesso, nunca
  qual é. Credencial não viaja em anexo de e-mail nem em arquivo compartilhado
- **Pergunta condicional.** "Se você respondeu sim na 4, pule pra 9" não funciona no
  papel e não funciona no Word. Arquivo assíncrono é lista plana
- **Pergunta cuja resposta já está no briefing.** É o jeito mais rápido de a pessoa achar
  que você não leu o que ela mandou. O script existe pra isso não acontecer
- **Mais de doze perguntas.** O teto padrão. Formulário longo volta pela metade ou não
  volta, e o que sobra respondido é a parte de cima. Se faltam vinte campos, mande doze
  agora e os oito depois, na segunda rodada
- **Colchete de nenhum tipo.** O `scripts/gerar-docx.js` recusa gravar `.docx` com
  placeholder, e `[preencher aqui]` é placeholder. O espaço de resposta é linha em
  branco embaixo de **Resposta:**

---

## A volta, que é onde a maioria desiste

Mandar o questionário é metade. A outra metade é a resposta chegar e virar briefing, em
vez de virar um arquivo a mais na pasta.

O `voltar` casa resposta com campo por duas vias. A principal é o mapa que o
questionário carrega no bloco entre `---` do topo (`campos: 1=entregas 2=restricoes`),
lido com `--questionario <arquivo enviado>`: ele vale mesmo depois de as perguntas serem
reescritas na voz do negócio, que é o que sempre acontece. A segunda é a semelhança com o
texto original da pergunta, e ela só salva questionário que ninguém reescreveu. Por isso
`--questionario` não é opção de emergência: é parte do comando. Três desfechos:

| O que voltou | O que vira no briefing |
|---|---|
| Resposta com conteúdo | o texto, com a linha de fonte e a data |
| "Não sei" | registro de que foi perguntado, com a data. Não é campo vazio: é dúvida datada |
| Nada | "Em aberto", e o campo continua na fila da próxima rodada |

A linha de fonte não é burocracia. Três meses depois, a diferença entre "o cliente
disse" e "a gente supôs" é o que decide quem paga o retrabalho.

### Segunda rodada

Campo que voltou vazio duas vezes não é esquecimento. É uma de três coisas: a pessoa não
sabe, não quer dizer, ou não é ela quem sabe. Na terceira tentativa, mude o
destinatário ou mude a decisão. Trabalho parado esperando resposta que não vem é pior
que trabalho decidido com premissa escrita e assumida.

---

## Dado pessoal no caminho

O questionário pede, às vezes, coisa que é dado pessoal de terceiro: nome de cliente
para depoimento, lista de contatos, cadastro. Duas consequências práticas.

A primeira: o arquivo de resposta passa a ser material com dado pessoal, e a pasta do
cliente não é lugar de deixar isso solto. A segunda: usar depoimento com nome exige
autorização de quem falou, e é por isso que o campo `prova` pergunta se pode usar
publicamente em vez de só pedir o texto.

O art. 7º da Lei 13.709/2018, a LGPD, é onde está a base legal de cada uso: ele lista as
hipóteses em que o tratamento de dado pessoal é permitido
(planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm, conferido em 23/09/2026).
Duas dessas hipóteses aparecem aqui toda hora: o inciso V, execução de contrato ou de
procedimento preliminar a pedido do titular, que é o que cobre o dado que o próprio
cliente manda sobre o negócio dele; e o inciso I, consentimento, que é o que um
depoimento com nome exige. Lista de contatos do cliente dele é outra conversa, e quem
conduz é o `/cadastro-clientes`. Nada disso substitui advogado: a leitura do caso
concreto é dele.

---

## Fronteira com as vizinhas

- `/decidir` e `/novo-projeto` entrevistam quem está na sessão, uma pergunta por
  mensagem, com a resposta chegando na hora
- `/briefing-reuniao` prepara as perguntas pra fazer ao vivo, na conversa marcada
- `/proposta`, `/escopo` e `/contrato` leem o `briefing.md` já preenchido. Nenhuma delas
  deve pedir de novo o que está lá
- `/cobranca` e `/confirmacao-de-agenda` também mandam mensagem pro cliente, mas cobram
  ação, não informação
