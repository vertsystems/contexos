---
name: glossario
description: >
  Fecha o vocabulário de um sistema antes que ele se espalhe: um nome por conceito, a grafia que
  vai no banco, a que vai na tela e a que vai no WhatsApp, e a lista fechada de estados de cada
  coisa, com os casos de borda respondidos pelo dono. Varre o código que já existe e mostra onde
  o mesmo conceito aparece com dois nomes e onde há estado que o glossário não conhece.
  Use quando o usuário disser "cada parte do sistema chama a mesma coisa de um nome diferente",
  "é orçamento ou proposta", "pedido pago e cancelado é o quê", "meu sistema tem uns status que
  eu não sei de onde saíram", "quero definir os nomes antes de começar a programar", "a atendente
  fala uma coisa e o sistema mostra outra", "toda vez que eu explico o sistema eu preciso
  traduzir", "cliente parado é a partir de quantos dias", "preciso de um glossário do projeto",
  ou /glossario.
---

# /glossario — Um nome por conceito

> **Convenção de pastas:** a saída vai em `sistemas/<nome>/GLOSSARIO.md`, ao lado do `ESCOPO.md`. Na convenção **por cliente**, `clientes/<Nome>/sistemas/<nome>/GLOSSARIO.md`. O arquivo nasce junto da pasta do sistema, e o `CLAUDE.md` do projeto passa a mandar ler ele em toda sessão.

Nomear parece a parte fácil e é a que mais volta pra cobrar. O banco recebe `orcamento` na
segunda, a tela mostra "Proposta" na quinta, e a função que manda o e-mail se chama `sendQuote`
porque quem escreveu estava lendo documentação em inglês. Nada disso dá erro. O que dá é a
consulta do fechamento do mês que ignora metade dos registros, a atendente que procura por
proposta enquanto a cliente pergunta do orçamento, e toda conversa sobre o sistema começando
pela tradução. Esta skill fecha o vocabulário numa página que a máquina confere, e que qualquer
sessão de trabalho lê antes de escrever a primeira linha.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` — as palavras que o negócio já usa no balcão e no WhatsApp são o ponto de partida, não o inglês do framework
- **Cliente real:** `_memoria/publico.md`, quando existir — a palavra que o cliente usa é a que vai na tela e na mensagem
- **O que vai ser construído:** `sistemas/<nome>/ESCOPO.md` (do `/escopo`), quando existir. Cada item da lista ordenada traz um conceito dentro
- **A ordem de construção:** `sistemas/<nome>/ENTREGAS.md` (do `/quebrar`), quando existir. Termo de entrega que ainda não começou pode esperar
- **Decisões técnicas:** `sistemas/<nome>/DECISOES.md` (do `/backend`). Termo de infraestrutura fica lá, não aqui
- **Molde:** `templates/software/glossario.md` — os pares que mais se confundem, as perguntas de borda, o que não serve como nome, a grafia do banco e o checklist de fechamento
- **Léxico:** `templates/software/sinonimos-de-dominio.json` — os conceitos que costumam ganhar dois nomes, com a referência de cada um e a data em que foi conferida
- **Script:** `scripts/glossario.js` — `varrer` levanta o vocabulário do código, `conferir` compara glossário e código, `estados` confere as máquinas de estado
- **Saída:** `sistemas/<nome>/GLOSSARIO.md`, mais o bloco de leitura obrigatória em `sistemas/<nome>/CLAUDE.md`

---

## Workflow

### Passo 1 — Descobrir se já existe código

Duas situações, dois caminhos. Perguntar qual é:

> "O sistema já existe em algum lugar, mesmo que só um começo, ou a gente está antes da primeira linha?"

**Já existe:** o vocabulário atual está escrito lá, e é de lá que a entrevista parte. Siga pro
Passo 2.

**Ainda não existe:** pule o Passo 2 e vá direto pro 3. A entrevista sai da rotina de hoje, que
é onde o vocabulário do negócio realmente vive: o caderno do balcão, a planilha, a conversa de
WhatsApp.

Se não existe nem escopo nem ideia fechada do que construir, a skill é o `/escopo`. Glossário de
um sistema que ainda pode não ser construído é trabalho jogado fora.

### Passo 2 — Varrer o que o código já chama de quê

Nada de ler o repositório procurando padrão de cabeça. Perguntar onde o código mora (a pasta
do sistema, a raiz do repositório, `app/`, `src/`) e apontar o comando pra lá:

```bash
node scripts/glossario.js varrer <pasta do código> --limite 40
```

A saída tem três partes, e cada uma vira um tipo de pergunta:

| Parte | O que ela mostra | O que perguntar |
|---|---|---|
| A tabela | as palavras do domínio por quantos arquivos as citam, com o primeiro lugar de cada | "isso aqui é palavra do negócio ou é coisa de programador?" |
| Conceitos com mais de um nome | `orcamento, proposta, quote` juntos, pelo palpite do léxico | "essas três são a mesma coisa, ou são coisas diferentes de propósito?" |
| Nome vago | `dados`, `flag`, `campo`, `temp` no código | "o que está guardado aqui? isso tem nome no seu dia a dia?" |

A segunda parte é palpite, não veredito: o léxico junta `cliente`, `contato` e `usuario` como
variantes porque na maioria dos sistemas viraram o mesmo campo, e em alguns são três coisas
separadas de propósito. Quem decide é o dono.

Guardar a saída ajuda na entrevista:

```bash
node scripts/glossario.js varrer <pasta do código> --saida sistemas/<nome>/vocabulario-atual.md
```

Ler a tabela com o usuário e separar em três montes: palavra do negócio, palavra técnica que
não entra no glossário, e palavra que ninguém sabe explicar. A terceira é a mais reveladora.

### Passo 3 — Puxar termo por termo, uma pergunta por vez

Aqui é entrevista, não formulário. Uma pergunta, espera a resposta, escreve, próxima.

Comece pelo que se movimenta no negócio:

> "Quando entra dinheiro aqui, o que aconteceu? Como você chama isso?"

Depois, pra cada termo que apareceu, a sequência de quatro:

> 1. "Me explica o que é <termo>, como você explicaria pra alguém que começou hoje."
> 2. "O que é parecido com <termo> e não é <termo>?"
> 3. "Como você fala isso pro cliente no WhatsApp? É a mesma palavra?"
> 4. "Tem alguém aqui dentro que chama isso de outro nome?"

A segunda pergunta é a que mais rende: é ela que separa orçamento de pedido, entrega de frete,
estoque de disponível. Os pares que mais se confundem, com a referência de cada conceito, estão
no molde `templates/software/glossario.md`.

A quarta é a que descobre o sinônimo antes de ele virar coluna. Quando a resposta for sim,
anotar as duas palavras: uma vira o nome, a outra vira linha proibida.

**Teto:** de dez a trinta termos. Passando disso, entrou termo técnico. O corte está no molde,
na seção "O que fica fora do glossário".

### Passo 4 — Fechar os estados, e forçar o caso de borda

Todo termo que tem ciclo de vida precisa de uma lista fechada de estados. Comece por uma
pergunta aberta e vá fechando:

> "Um <termo> nasce como o quê, e por onde ele passa até acabar?"

Depois venha com as perguntas que doem, uma por vez. As respostas não estão prontas na cabeça
de ninguém, e é por isso que elas valem a conversa:

> "Pedido pago e depois cancelado é o quê? Fica no faturamento do mês?"
> "Entregue e depois devolvido: o estado volta atrás ou é um estado novo?"
> "Orçamento parado é parado a partir de quantos dias sem resposta? Quem conta, o sistema ou você?"
> "Cliente parado é parado desde quando? Compra antiga conta ou não conta?"
> "Quem não apareceu na reserva tem estado próprio, ou fica cancelado como qualquer outro?"

A lista completa está no molde. Quando a resposta tiver número (dias, tentativas, prazo), o
número vai escrito no glossário. Sem ele, cada consulta escolhe o seu, e dois relatórios da
mesma semana discordam.

Para provocar o que ninguém lembrou, o molde traz duas listas públicas de estado com fonte e
data de conferência (pedido e reserva). Elas servem de checklist, nunca de resposta: quem
responde é o dono.

### Passo 5 — Escolher um nome só, e escrever as três grafias

Para cada conceito, uma palavra. O que muda de lugar pra lugar é a grafia:

| Onde | Como fica |
|---|---|
| Banco | minúsculas, sem acento, singular, underline entre palavras (`aguardando_pagamento`) |
| Código | a mesma palavra, na convenção da linguagem |
| Tela | com acento, do jeito que gente lê |
| WhatsApp | a palavra que o cliente usa |

Quando a palavra do cliente e a do sistema divergirem de verdade, as duas ficam escritas na
mesma linha. O que não pode é a divergência viver só na cabeça de quem escreveu.

Nome que não serve (`dados`, `info`, `tipo`, `flag`, `status1`, booleano fazendo papel de
estado, tela no lugar de conceito, inglês e português na mesma palavra) está listado no molde.
Sigla de duas letras nunca entra na lista de palavras proibidas: ela casa com qualquer coisa e
máquina nenhuma consegue conferir.

### Passo 6 — Escrever o arquivo

O formato não é enfeite: é o que o `scripts/glossario.js` lê. Uma seção `##` por termo, e
dentro dela itens com rótulo em negrito.

```markdown
# Glossário — <Nome do sistema>

> Toda sessão de trabalho lê este arquivo antes de nomear qualquer coisa: tabela, coluna,
> campo de tela, texto de botão, mensagem de WhatsApp. Nome novo entra aqui primeiro e no
> código depois. Escrito em <data>, mantido por <nome>.

## <Termo>

- **É:** <uma frase, sem usar outro termo do glossário que ainda não foi definido>
- **Não é:** <o conceito vizinho com que ele se confunde, e a diferença>
- **No banco:** `<tabela>`, `<coluna_id>`
- **Na tela:** <Termo com acento>
- **No WhatsApp:** <a palavra do cliente>
- **Nunca:** <palavra proibida>, <outra>
- **Estados:** <inicial> → <segundo> → <terceiro> → <final>
- **Estado final:** <final>, <cancelado>
- **De qualquer estado:** <cancelado>
- **Dono da palavra:** <nome> — <DD/MM/AAAA>

## Casos de borda decididos

| Situação | O que o sistema faz | Quem decidiu | Quando |
|---|---|---|---|
| <pedido pago e cancelado> | <vira estornado, sai do faturamento do mês> | <nome> | <DD/MM/AAAA> |

## Divergências conhecidas

| O que está torto | Onde | Quem conserta | Até quando |
|---|---|---|---|
| <a tela diz Proposta e o banco diz orcamento> | <src/telas/orcamento.tsx:41> | <nome> | <DD/MM/AAAA> |

## Fora do glossário

<termo técnico que apareceu na conversa e mora em DECISOES.md, com o motivo>
```

Os rótulos que o script lê são **No banco**, **Nunca**, **Estados**, **Estado final**, **De
qualquer estado** e **Dono da palavra**. Os outros são pra quem lê. Uma seção `##` só conta como
termo quando tem pelo menos um desses rótulos, e é por isso que "Casos de borda decididos" e
"Divergências conhecidas" não entram na contagem de termos. Termo sem ciclo de vida não recebe as
três linhas de estado, e isso é normal: fornecedor não tem estado, pedido tem.

Quando a vida do termo se divide, escreva a linha **Estados** de novo com o outro ramo
(`pago → estornado` embaixo do caminho principal). O script junta os ramos, e é assim que
`estornado` deixa de aparecer como estado sem jeito de chegar. O caminho principal vem
primeiro: o script toma o primeiro estado da primeira linha como o estado em que a coisa nasce.

A tabela de **Divergências conhecidas** nasce vazia e é preenchida no Passo 8. Ela existe pra
que divergência que o usuário decidiu não consertar agora fique escrita em vez de virar
surpresa.

### Passo 7 — Ligar o glossário na sessão de trabalho

Glossário que ninguém abre é um arquivo a mais. O que faz ele valer é a leitura obrigatória, e
ela mora no `CLAUDE.md` do projeto. Se o sistema não tem um, criar; se tem, acrescentar o bloco
sem reformatar o resto:

```markdown
## Vocabulário deste sistema

Antes de nomear qualquer coisa neste projeto, ler `GLOSSARIO.md`. Vale pra tabela, coluna,
rota, nome de função, campo de tela, texto de botão, título de relatório e mensagem de
WhatsApp. Nome que não está no glossário não entra no código: entra primeiro no glossário,
com o dono da palavra e a data.

Em particular:

- `/escopo` — ao listar o que vai ser construído, usa os termos do glossário, não sinônimos
- `/backend` — antes de criar tabela, coluna, rota ou estado no banco
- `/interface` — antes de escrever rótulo de campo, cabeçalho de tabela e texto de botão
- `/whatsapp` — antes de escrever qualquer mensagem de atendimento
- `/manual-do-sistema` — o manual usa as mesmas palavras da tela

Termo novo apareceu no meio do trabalho: para, escreve no glossário com dono e data, e só
então continua.
```

Esse bloco é o que faz a skill valer. Sem ele, `GLOSSARIO.md` é um arquivo que ninguém abre, e
as quatro skills de construção continuam inventando nome cada uma pro seu lado. Escrever e
depois conferir, por comando, que o bloco ficou lá:

```bash
grep -n "GLOSSARIO.md" sistemas/<nome>/CLAUDE.md
```

Se o projeto já tem um `CLAUDE.md` que fala de nomes de outro jeito, não duplicar: ajustar o
que existe pra apontar pro glossário. Dois parágrafos sobre nomenclatura no mesmo arquivo é
como duas pessoas mandando na mesma coisa.

### Passo 8 — Conferir contra o código, e montar o plano de renomeação

Com o arquivo escrito, o comando compara:

```bash
node scripts/glossario.js conferir sistemas/<nome>/
```

Ele devolve quatro coisas, cada uma com arquivo e linha:

| O que ele acusa | O que fazer |
|---|---|
| Palavra proibida que o código usa | renomear, ou tirar a palavra da lista **Nunca** se a proibição estava errada |
| O mesmo conceito com mais de um nome | escolher um, e o outro vira linha **Nunca** |
| Estado que o código usa e o glossário não declara | ou o estado entra no glossário, ou sai do código |
| Termo declarado que o código não usa | ou o termo morreu, ou a parte que o usa ainda não foi escrita |

Ele acha o que está escrito literal no código. **Não** acha enum declarado sem aspas (`enum
Status { PAGO }`), estado montado por pedaço (`"aguardando_" + tipo`), estado que só existe como
dado dentro do banco, e sinônimo que o léxico nunca viu. Dizer isso ao usuário importa: relatório
limpo não é prova de que está tudo certo, é prova de que o que está escrito literal está certo.

Divergência não se conserta toda de uma vez. O que não for consertado agora vai pra tabela
**Divergências conhecidas** do glossário, com arquivo, linha, dono e prazo. A ordem do conserto
tem regra: primeiro o texto de tela e de mensagem, depois o código, **por último a coluna do
banco**, com migração testada e volta atrás escrita (`templates/backend/versoes.md`). Renomear
coluna com o sistema no ar sem isso tira o sistema do ar.

Quem escreve o código do conserto é o `/backend`. Esta skill entrega a lista.

### Passo 9 — Manter, que é onde quase todo glossário morre

O arquivo vale enquanto acompanha o negócio. Três gatilhos de atualização, e nenhum deles é
"quando der tempo":

- **Termo novo apareceu numa conversa** (o dono usou uma palavra que não está na lista): entra no glossário antes de entrar no código
- **Estado novo foi preciso** (surgiu um caso que os estados atuais não cobrem): a lista reabre, com a transição escrita
- **Termo parou de ser usado**: sai da lista de termos e entra na linha **Nunca** do termo que ficou. Aí o `conferir` passa a apontar onde a palavra velha sobrou

Cada termo tem **dono da palavra**, com nome e data. Não é burocracia: é quem responde quando
duas pessoas discordarem do significado seis meses depois. E é conferido por comando, não por
boa intenção: o `estados` acusa termo sem dono, data que não existe no calendário (31/02) e
termo que ninguém confirmou há mais de 180 dias.

Marcar em `tarefas.md` uma releitura do glossário a cada entrega concluída. Entrega nova quase
sempre traz conceito novo, e é ali que ele entra limpo ou entra torto.

---

## Conferir antes de entregar (obrigatório)

O Contex OS não estima, calcula. Aqui o que se calcula é a coerência entre o que está escrito e
o que está no código.

```bash
# máquinas de estado (entrada, saída, final, desistência) e o dono de cada termo
node scripts/glossario.js estados sistemas/<nome>/GLOSSARIO.md

# glossário contra código: nome duplicado e estado de fora, com arquivo e linha
node scripts/glossario.js conferir sistemas/<nome>/

# o arquivo é lido por gente: não pode soar de máquina
node scripts/verificar.js texto sistemas/<nome>/GLOSSARIO.md

# se o arquivo cita data junto de dia da semana
node scripts/verificar.js datas sistemas/<nome>/GLOSSARIO.md
```

O `estados` acusa estado sem jeito de chegar, estado sem jeito de sair que não foi declarado
final, termo sem nenhum estado final e termo sem nenhum estado de desistência. O último é aviso,
não erro, e quase sempre é aviso verdadeiro: alguém vai desistir. Na mesma passada ele confere o
dono de cada termo e a data dele.

Se o `conferir` acusar divergência que o usuário decidiu não consertar agora, ela fica escrita
na tabela **Divergências conhecidas** do glossário, com arquivo, linha, dono e prazo. Divergência
conhecida e escrita é dívida. Divergência conhecida e não escrita volta como surpresa.

Por último, conferir que a leitura obrigatória ficou de pé — é a única parte desta skill que
decide se o arquivo vai ser lido ou esquecido:

```bash
grep -n "GLOSSARIO.md" sistemas/<nome>/CLAUDE.md
```

---

## Regras

- **Um conceito, um nome.** A grafia muda de lugar pra lugar; a palavra não. Duas palavras pro mesmo conceito é o defeito que esta skill existe pra impedir
- **Nome novo entra no glossário antes de entrar no código.** Na ordem inversa ele nasce como texto solto numa comparação, escrito de um jeito na tela e de outro no relatório
- **Estado é lista fechada num campo só.** Três colunas de sim ou não permitem oito combinações, inclusive as que não existem no mundo. Pedido cancelado e entregue ao mesmo tempo passa pelo banco sem reclamar
- **Caso de borda sem resposta não vira suposição.** Fica `[a confirmar]` visível, com a pergunta escrita, até o dono responder. Número que ninguém deu não se inventa
- **A palavra do cliente ganha na tela.** Se ele diz "orçamento", o botão não diz "Proposta comercial". A palavra do sistema ganha no banco, e as duas ficam escritas na mesma linha
- **Sigla de duas letras nunca entra na lista de palavras proibidas.** Máquina nenhuma confere isso sem acusar meio código
- **De dez a trinta termos.** Mais que isso, entrou termo de infraestrutura. Fila, cache, container e migração vivem em `DECISOES.md`, do `/backend`
- **Esta skill não escreve código e não renomeia nada.** Ela entrega a lista de divergências com arquivo e linha; quem mexe no código é o `/backend`, e coluna de banco é a última a mudar, com migração testada
- **Fronteira com as vizinhas:** decisão grande de negócio, com alternativas e data de revisão, é `/decidir`. O que vai ser construído, quanto custa e se vale é `/escopo`. A ordem das entregas é `/quebrar`. Por que a stack é essa e por que a tabela ficou assim é `DECISOES.md`, do `/backend`. Aqui só se combina como as coisas se chamam
- **Quem consome:** o `/backend` lê antes de criar tabela, coluna e rota; o `/interface` lê antes de escrever rótulo de campo e cabeçalho de tabela; o `/whatsapp` lê antes de escrever mensagem de atendimento; o `/manual-do-sistema` lê pra escrever o manual na mesma língua. Glossário que as três não leem é um arquivo a mais no repositório
- **Nome de pessoa e dado de cliente não entram como exemplo.** Glossário vai pro repositório e às vezes vira anexo de proposta: usar `<Cliente>`, não o nome de quem comprou na terça (LGPD)
- **O dono da palavra é uma pessoa, com nome e data.** Termo sem dono é termo que ninguém defende, e é o primeiro a ganhar sinônimo
