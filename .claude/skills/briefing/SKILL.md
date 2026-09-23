---
name: briefing
description: >
  Monta o questionário pra mandar pra quem tem a resposta e não está na conversa: o cliente
  que não passou o briefing, o contador que não disse o enquadramento, o sócio que não
  decidiu. Confere por comando quais campos do briefing estão vazios, gera só as perguntas
  que destravam esses campos, ordenadas do que pesa mais pro que pesa menos, e na volta lê a
  resposta e preenche o briefing dizendo qual skill já dá pra rodar.
  Use quando o usuário disser "o cliente não mandou o briefing", "preciso de perguntas pro
  cliente", "monta um questionário", "não tenho informação pra fazer a proposta", "o cliente
  não responde o que eu preciso", "manda um formulário pra ele preencher", "o que eu pergunto
  pro contador", "preciso perguntar pro meu sócio", "o cliente respondeu, agora o que eu faço
  com isso", "briefing incompleto", ou /briefing.
---

# /briefing — As perguntas que estão travando o trabalho

> **Convenção de pastas:** a saída vai em `clientes/<Nome>/questionario-<slug>.md` (mais o `.docx` ao lado), e o briefing preenchido é o `clientes/<Nome>/briefing.md`. Na convenção **por tipo**, o par fica em `projetos/<nome>/` quando existe pasta de projeto; quando não existe (a pergunta é pro contador ou pro sócio sobre o próprio negócio), fica em `briefings/`. A pasta nasce no primeiro questionário.

Tem um tipo de travamento que nenhuma entrevista resolve, porque quem sabe a resposta não
está na conversa. O trabalho para em cima de duas ou três informações que só o cliente
tem, e o que costuma acontecer é o pior dos caminhos: quem escreve a proposta preenche
com plausível, manda, e descobre na reunião que o prazo era outro. Esta skill troca o
palpite por um arquivo curto que a pessoa responde no tempo dela, com cada pergunta
amarrada no campo que ela destrava. E cuida da volta, que é onde a maioria dos
questionários morre.

## Dependências

- **Contexto:** `_memoria/empresa.md` — como o usuário se apresenta e assina, porque o questionário sai no nome dele
- **Tom:** `_memoria/preferencias.md` — quem lê é cliente, não colega de profissão. Pergunta com jargão volta em branco
- **O briefing que já existe:** `clientes/<Nome>/briefing.md` (criado pelo `/novo-projeto`), ou `projetos/<nome>/briefing.md`. Se não existe, todo campo conta como vazio
- **O que a casa já sabe:** `_memoria/publico.md` e `_memoria/oferta.md` — quando o negócio é do próprio usuário, parte das respostas já está aqui e não se pergunta de novo
- **Conversas anteriores:** as atas em `reunioes/` e a ficha do `/pessoa`. Pergunta que o cliente já respondeu numa call não vai pro arquivo
- **Molde:** `templates/operacao/briefing.md` — os campos canônicos com peso, as cinco regras da pergunta que volta respondida, o que nunca entra e o que fazer na segunda rodada
- **Script:** `scripts/briefing.js` — diagnóstico dos campos, geração do questionário e leitura da resposta
- **Word:** `scripts/gerar-docx.js` — o `.docx` que o cliente abre no celular, e o `--texto` que lê o que ele devolveu
- **Saída:** `clientes/<Nome>/questionario-<slug>.md` e `.docx`, e o `clientes/<Nome>/briefing.md` atualizado no passo de volta

---

## Workflow

### Passo 1 — Descobrir quem tem a resposta

Primeira pergunta, e só ela:

> "Quem é que precisa responder isso, e o que você vai fazer com a resposta?"

As duas partes importam. Quem responde define o vocabulário, e costuma ser um destes:

- o cliente que contratou, ou que ainda vai contratar
- o contador, sobre enquadramento, imposto e o que a empresa pode emitir
- o sócio, sobre dinheiro, divisão e o que cada um assume
- um parceiro ou fornecedor, sobre prazo, capacidade e preço

Já o que o usuário vai fazer com a resposta define o corte. Quem precisa fechar uma
proposta precisa de orçamento e decisor, e pode viver sem concorrente e sem prova.

Se ele já disse na primeira mensagem ("o cliente da padaria não mandou o briefing e eu
preciso fazer a proposta"), não perguntar de novo. Seguir.

Uma checagem que economiza o resto: se a pessoa que tem a resposta **está** disponível
pra conversar agora, este não é o caminho. Conversa de dez minutos rende mais que
formulário, e quem conduz isso é o `/decidir` (decisão do usuário), o `/novo-projeto`
(cliente novo) ou o `/briefing-reuniao` (reunião marcada). Dizer isso em uma linha e
esperar a resposta.

### Passo 2 — Medir o que falta, por comando

Nunca ler o briefing e julgar de cabeça o que está vazio. O script casa por sinônimo,
então reconhece "Público alvo" como o campo `publico` e "Entregas previstas" como
`entregas`:

```bash
node scripts/briefing.js campos "clientes/Padaria São João/briefing.md"
```

O que sai: cada campo canônico com um sinal na frente, o peso, e o título do arquivo de
onde a resposta veio.

| Sinal | O que significa | Vai pro questionário? |
|---|---|---|
| `✓` | preenchido: tem texto de verdade | não |
| `~` | parcial: tem texto e tem "a definir" no meio | só com `--incompletos` ou `--campos` |
| `?` | já foi perguntado, e voltou "não sei" | só com `--incompletos` |
| `·` | vazio: nenhum título casou, ou casou só o rótulo | sim |

No fim vêm as duas linhas que valem mais que o resto: quais skills já têm contexto
suficiente pra rodar agora, e o que cada uma das outras ainda espera, campo por campo. A
tabela completa de campos, pesos e papéis sai com `node scripts/briefing.js referencia`.

Mostrar essa leitura pro usuário antes de escrever pergunta nenhuma. Duas vezes em três,
ele olha e diz "ah, o orçamento ele falou no WhatsApp, é de R$ 3 mil a R$ 5 mil". Campo
respondido na conversa não precisa ir pro arquivo, e essa é a economia mais barata do
fluxo.

Se o briefing ainda não existe, o script avisa e trata tudo como vazio. Isso é normal em
cliente novo.

### Passo 3 — Cortar a lista até caber

O teto é doze perguntas, e ele não é decorativo: formulário longo volta pela metade, e a
metade que volta é a de cima. Com quinze campos vazios, a decisão é qual terço fica pra
segunda rodada.

O critério é o do Passo 1: o que a resposta libera. Rodar com o corte e conferir o que
ficou de fora:

```bash
node scripts/briefing.js perguntar "clientes/Padaria São João/briefing.md" \
  --para cliente --max 8 --prazo 29/09/2026 \
  --decisao "fechar a proposta e saber se o bolo entra como produto separado" \
  --saida "clientes/Padaria São João/questionario-bolo-de-festa.md"
```

Três coisas pra conferir na saída do comando:

- quantas perguntas entraram, e se o número cabe no que a pessoa aguenta responder
- quais campos ficaram de fora, que é a pauta da segunda rodada
- se entrou alguma pergunta sobre coisa que o usuário já sabe de conversa

O `--decisao` é a primeira coisa que a pessoa lê, e é o que faz ela responder em vez de
arquivar. "Sem isso a proposta sai com prazo chutado" funciona; "para melhor atendê-lo"
não funciona.

O `--para` faz duas coisas, e a segunda é a que importa. Além de cortar o que a pessoa
não tem como responder, ele troca o texto da pergunta pela versão que faz sentido pra
ela. O campo `quem`, que pro cliente é "o que a sua empresa vende e desde quando", pro
contador é "em que regime a empresa está, e em qual anexo". O campo `entregas`, que pro
cliente é "o que você espera receber", pro sócio é "o que fica com você e o que fica
comigo". Os papéis são `cliente`, `contador`, `socio`, `parceiro` e `fornecedor`; o
`referencia` mostra o que cada um responde.

Quando o corte automático por peso não serve (o usuário precisa exatamente de orçamento
e decisor, nada mais), forçar:

```bash
node scripts/briefing.js perguntar "<briefing>" --campos orcamento,decisor --saida "<arquivo>"
```

O slug do nome do arquivo é o assunto, em minúsculas e sem acento
(`questionario-bolo-de-festa.md`), não a data. Questionário da mesma pasta com assunto
diferente não se sobrescreve.

### Passo 4 — Revisar as perguntas na voz de quem vai responder

O script entrega a pergunta padrão de cada campo. Ela é genérica de propósito, e é aqui
que a skill ganha o trabalho: reescrever cada uma com o vocabulário do negócio, lendo o
molde e o `preferencias.md`.

Três trocas que aparecem sempre:

| A pergunta padrão | A versão que volta respondida |
|---|---|
| "Quem compra de você?" | "Quem foi o último cliente que encomendou bolo, e o que ele pediu?" |
| "Qual faixa de investimento já está aprovada?" | "Quanto você já separou por mês pra isso? Faixa serve" |
| "Existe regra que limita o que a gente pode publicar?" | "Tem algo que o conselho não deixa você falar na propaganda?" |

Ao reescrever, manter quatro coisas intactas, porque o passo de volta depende delas: o
bloco entre `---` no topo do arquivo, a numeração, a linha `**Resposta:**` embaixo de cada
pergunta, e a pergunta aberta do fim.

O bloco do topo é o que permite reescrever tudo o resto. Ele guarda o mapa `1=entregas
2=restricoes 3=dor`, e é por ele que o Passo 6 sabe de qual campo é cada resposta depois
que o texto das perguntas mudou. Sem o mapa, o casamento volta a depender de a pergunta
ter ficado parecida com a original, e resposta que não casa não se perde com aviso: ela
simplesmente não aparece no briefing. O `gerar-docx.js` corta esse bloco, então ele nunca
chega no Word do cliente.

E nenhum colchete no arquivo. O `gerar-docx.js` recusa gravar Word com placeholder, e
`[preencher]` é placeholder. Quem responde escreve na linha em branco.

Formato do arquivo que sai:

```markdown
---
questionario: briefing
campos: 1=<campo da pergunta 1> 2=<campo da pergunta 2> <N+1>=extra
nota: este bloco não vai pro Word e não se apaga; é por ele que o `voltar` sabe de qual campo é cada resposta
---

# Perguntas pra <Nome>

Enviado em <DD/MM/AAAA> · resposta esperada até <DD/MM/AAAA>

**Pra que serve:** <a decisão que a resposta destrava, em uma linha>

São <N> perguntas, mais um campo aberto no fim. Escreva a resposta embaixo de cada uma,
do jeito que você falaria.

Duas coisas que valem a pena saber antes de começar:

- **"não sei" é resposta.** Dúvida marcada serve; palpite escrito com cara de fato
  atrapalha, porque a gente trabalha em cima dele sem saber
- **Resposta curta serve.** Uma linha por pergunta já destrava

---

## <Tema do campo mais pesado>

### 1. <pergunta de uma ideia só>

_Por que a gente pergunta:_ <só quando a pergunta parece estranha ou invasiva>

**Resposta:**


### 2. <pergunta>

**Resposta:**


## <Tema seguinte>

### 3. <pergunta>

**Resposta:**


---

## Por último

### <N+1>. Tem alguma coisa que a gente não perguntou e que você acha que precisamos saber?

**Resposta:**

```

### Passo 5 — Entregar em Word e escrever a mensagem de envio

Quase ninguém responde markdown. O `.docx` abre no celular, no Word e no Google Docs, e
a pessoa digita embaixo de cada pergunta:

```bash
node scripts/gerar-docx.js "clientes/Padaria São João/questionario-bolo-de-festa.md" \
  --cabecalho "<nome do negócio>"
```

Junto do arquivo, entregar a mensagem que vai com ele. Curta, com prazo e com o motivo:

> "Oi <nome>, montei as perguntas que faltam pra eu fechar a proposta. São oito, e
> resposta de uma linha já resolve. Se alguma você não souber, escreve 'não sei' que eu
> viro por outro caminho. Consegue me devolver até sexta?"

Três coisas vão na mensagem, e nenhuma delas está no arquivo:

- o prazo de retorno, com data, não "quando puder"
- o recado de que resposta pela metade já serve
- quem ele chama se travar em alguma pergunta

Formato e temperatura da mensagem seguem o `/whatsapp`, quando o canal é WhatsApp. E a
data de retorno vai pro `tarefas.md`: questionário que ninguém cobra não volta.

### Passo 6 — Ler a resposta e preencher o briefing

A resposta chega como texto colado na conversa, `.md` ou `.docx`. Nos três casos, o
mesmo comando (o `.docx` é lido pelo `gerar-docx.js --texto` por dentro, sem conversão na
mão):

```bash
node scripts/briefing.js voltar "clientes/Padaria São João/briefing.md" \
  "clientes/Padaria São João/resposta-bolo.docx" \
  --questionario "clientes/Padaria São João/questionario-bolo-de-festa.md"
```

O `--questionario` vai sempre, e o motivo é o Passo 4: as perguntas foram reescritas na
voz do negócio, e é o mapa do topo do arquivo enviado que liga cada resposta ao campo
dela. Sem ele, um teste com cinco perguntas reescritas trouxe três respostas de volta e
perdeu duas, sem erro nenhum na tela. Passar o arquivo enviado custa um argumento.

Sem `--aplicar`, ele imprime o briefing que gravaria. Ler antes de gravar, sempre. Antes
de confirmar, conferir se a conta fecha: o número de linhas `✓` mais as `·` tem que dar o
número de perguntas que foram enviadas.

O que o script faz com cada resposta:

| O que voltou | O que vira no briefing |
|---|---|
| Resposta com conteúdo | o texto, com a linha de fonte e a data |
| "Não sei" | dúvida datada, não campo vazio. Fica registrado que foi perguntado |
| Nada | "Em aberto", e o campo volta pra fila da próxima rodada |
| O campo aberto do fim | uma seção própria, "O que ele acrescentou" |

Texto colado no chat: salvar num `.md` na pasta do cliente antes de rodar. Resposta que
só existe na conversa não existe pro sistema.

Depois de gravar, conferir que as datas que vieram na resposta são reais:

```bash
node scripts/verificar.js datas "clientes/Padaria São João/briefing.md"
```

### Passo 7 — Dizer o que destravou

O script termina dizendo quais skills passaram a ter contexto. Essa é a frase que fecha a
conversa com o usuário, e ela precisa ser concreta:

```
Briefing atualizado: 6 campos preenchidos, 1 "não sei" (concorrentes), 8 em aberto.
Passou a dar pra rodar: /publico /oferta /landing /medir
/proposta ainda espera: orcamento, decisor
```

Aí oferecer o próximo passo, um só, o mais óbvio pelo que o usuário disse no Passo 1. Se
ele queria fechar a proposta e faltam orçamento e decisor, o próximo passo é a segunda
rodada com essas duas perguntas, não o `/proposta` pela metade.

Campo que voltou vazio duas vezes muda de tratamento: ou a pessoa não sabe, ou não quer
dizer, ou não é ela quem sabe. Na terceira tentativa, trocar o destinatário ou assumir a
premissa por escrito no briefing, marcada como premissa do usuário, com data. Trabalho
parado esperando resposta que não vem é pior que trabalho decidido com premissa assumida.

---

## Regras

- **Nunca inventar resposta de terceiro.** Campo que o cliente não respondeu fica "Em aberto" ou vira premissa assinada pelo usuário, com data. Briefing com resposta plausível no lugar da real é a origem de quase todo retrabalho de escopo
- **Uma ideia por pergunta.** "Qual o objetivo, o público e o prazo?" recebe resposta sobre o objetivo, e quem perguntou acha que perguntou as três
- **"Não sei" sempre autorizado, no texto do arquivo.** Sem essa permissão a pessoa educada chuta, e o chute chega com cara de fato
- **Teto de doze perguntas.** Acima disso, segunda rodada. O corte é por peso, e o que ficou de fora se mostra ao usuário, não se esconde
- **Nunca pedir senha, token ou cartão por escrito.** A pergunta de acesso é sobre quem tem o acesso. Credencial entra depois, no `.env`, pelo `/conectar`
- **Não perguntar o que já está no briefing.** É o que faz o cliente achar que ninguém leu o que ele mandou. O Passo 2 existe pra isso, e é comando, não leitura
- **Sem pergunta condicional.** "Se respondeu sim na 4, pule pra 9" não funciona no papel nem no Word. Lista plana
- **Nenhum colchete no questionário.** O `gerar-docx.js` recusa gravar `.docx` com placeholder. O espaço de resposta é linha em branco
- **`--questionario` no `voltar`, sempre.** O mapa no topo do questionário enviado é o que liga resposta e campo depois de a pergunta ser reescrita. Sem ele a resposta não casada desaparece calada, e essa é a pior falha possível aqui: o usuário acha que o briefing está completo
- **Ler antes de gravar.** O `voltar` sem `--aplicar` mostra o briefing que sairia. Confirmar com o usuário quando a resposta contradiz algo que já estava escrito, em vez de sobrescrever calado
- **Dado pessoal de terceiro:** nome, telefone e depoimento que vierem na resposta ficam na pasta do cliente e não vão pra ferramenta externa sem o usuário autorizar. Depoimento com nome só é publicado com autorização de quem falou, e a base legal de cada uso está no art. 7º da Lei 13.709/2018 (planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm, conferido em 22/09/2026). Lista de contatos é assunto do `/cadastro-clientes`
- **Isto não substitui advogado nem contador.** Pergunta sobre enquadramento, cláusula ou obrigação fiscal a skill formula e encaminha; quem responde é o profissional. O calendário do que vence está no `/obrigacoes`
- **Fronteira com as vizinhas:** `/decidir` e `/novo-projeto` entrevistam quem está na sessão, com resposta na hora. `/briefing-reuniao` prepara as perguntas pra conversa marcada. `/proposta`, `/escopo` e `/contrato` leem o `briefing.md` já preenchido e não devem pedir de novo o que está lá. `/cobranca` e `/confirmacao-de-agenda` também mandam mensagem pro cliente, mas cobram ação, não informação
