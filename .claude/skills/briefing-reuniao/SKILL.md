---
name: briefing-reuniao
description: >
  Monta a página que se lê antes de falar com um cliente que já tem histórico no
  workspace (reunião, call, WhatsApp ou visita): o que você prometeu e ainda não
  entregou, o que ele deve, o que ele espera ouvir hoje, o que não repetir, três
  perguntas e a meta da conversa. O script cruza a última ata, o pipeline, a ficha
  da pessoa, proposta, contrato e cobrança, e calcula dias sem contato, pendências
  vencidas e valor em jogo.
  Use quando o usuário disser "vou falar com o fulano daqui a pouco", "tenho reunião
  com a Acme mais tarde", "o cliente me ligou, me prepara", "vou visitar a padaria
  amanhã", "o que eu prometi pra ele mesmo", "me lembra onde a gente parou com esse
  cliente", "tenho call com o cliente, o que eu não posso esquecer", "vou responder
  ele no WhatsApp, o que tá pendente", "briefing pra reunião", ou /briefing-reuniao.
---

# /briefing-reuniao — Antes de falar com ele

> **Convenção de pastas:** a saída vai em `reunioes/<AAAA-MM-DD>-<cliente>-briefing.md`. Na convenção **por cliente**, `clientes/<Nome>/reunioes/`. A pasta nasce no primeiro briefing (em geral já existe, criada pela primeira ata do `/reuniao`).

Quem tem cliente recorrente fala com ele toda semana, e chega na conversa lembrando de
metade. Promete de novo o que já prometeu, esquece o acesso que ele ficou de mandar, e
descobre no meio da call que a parcela de setembro está aberta. O cliente percebe cada
uma dessas três coisas, e é por elas que decide se renova. Esta skill junta numa página
o que o workspace já sabe sobre ele: atas, pipeline, ficha da pessoa, proposta, contrato,
cobrança. Os cinco minutos antes da conversa viram leitura, não busca.

## Dependências

- **Contexto:** `_memoria/empresa.md` (quem é o usuário, pra separar o que é dele do que é do cliente nas atas) e `_memoria/preferencias.md` (as perguntas saem na voz do usuário)
- **A conversa anterior:** as atas do `/reuniao` em `reunioes/` ou `clientes/<Nome>/reunioes/`
- **O pipeline:** `tarefas.md`, mantido pelo `/tarefas`: o que está aberto e o que está em "Esperando resposta"
- **A pessoa:** a ficha do `/pessoa` em `pessoas/<slug>.md` com `empresa:` apontando pro cliente. De lá saem o "não reexplicar", o que ela pediu pra não receber, o próximo passo combinado e as promessas dos dois lados
- **O dinheiro:** proposta em `propostas/`, contrato em `contratos/`, parcelas em aberto em `financeiro/cobranca-<AAAA-MM>.md` (do `/cobranca`)
- **Molde:** `templates/operacao/briefing-reuniao.md`: as seções e de onde cada uma vem, o que conta como prometido, o método das três perguntas, o que muda por tipo de conversa
- **Script:** `scripts/briefing-reuniao.js` (cruza os arquivos e calcula; `--ajuda` lista as opções), `scripts/verificar.js` (`datas`, `tabela`, `texto`)
- **Saída:** `reunioes/<AAAA-MM-DD>-<cliente>-briefing.md` (a data é a da conversa, não a de hoje, quando forem diferentes)

---

## Workflow

### Passo 1 — Situar a conversa

O gatilho é largo de propósito: "vou falar com", "tenho call", "vou visitar", "ele me
ligou", "vou responder no WhatsApp". Qualquer contato com cliente que já tem histórico
no workspace serve. Antes de rodar qualquer coisa, saber três coisas. Se a mensagem do
usuário já disse, não perguntar. Se faltar, perguntar uma por vez:

1. "Com quem?" O nome como está nos arquivos. Se `_memoria/empresa.md` lista os
   clientes, conferir lá; na convenção por cliente, `ls clientes/` resolve
2. "Que tipo de conversa: reunião marcada, call rápida, WhatsApp, visita ou balcão?"
   O tipo vira `--tipo` e muda o tamanho da página
3. "Quando?" Se for hoje, a data do arquivo é hoje. Se for amanhã, o arquivo leva a
   data da conversa, que entra em `--hoje`

Se o cliente **não tem nada** no workspace (nenhuma ata, nenhum item no pipeline,
nenhuma ficha, nenhuma proposta), esta skill não tem o que cruzar. O script avisa
isso em uma linha. Dizer ao usuário e apontar: primeira conversa de venda é
`/vender`; cliente antigo que voltou sem arquivo é conversa normal, e a ata do
`/reuniao` depois cria o histórico.

### Passo 2 — Cruzar os arquivos por comando

```bash
node scripts/briefing-reuniao.js "Acme" --tipo reuniao \
  --saida "reunioes/2026-09-23-acme-briefing.md"
```

O script procura o cliente por nome, sem acento e sem caixa, em `reunioes/`,
`tarefas.md`, `pessoas/`, `propostas/`, `contratos/` e `financeiro/cobranca-*.md`, e na
pasta `clientes/<Nome>/` quando ela existe. Devolve o esqueleto da página com as partes
de conta preenchidas e as de julgamento marcadas `[preencher]`.

O que ele calcula, e como:

| Número | Conta |
|---|---|
| **Dias sem contato** | a data da conversa menos a data do arquivo mais novo que cita o cliente (ata, proposta, contrato, pasta de vendas, `ultimo_contato` da ficha). Contato que não deixou arquivo entra com `--ultimo-contato DD/MM/AAAA` |
| **Pendências vencidas, minhas** | item aberto em `tarefas.md` com data passada, tarefa da última ata com o usuário em "Quem", e `eu_prometi` da ficha do `/pessoa` |
| **Pendências vencidas, dele** | item de "Esperando resposta" com data de cobrar passada, tarefa da ata com o nome do cliente ou da pessoa de contato dele em "Quem", `me_prometeu` da ficha, parcela vencida |
| **Valor em jogo** | contrato (ou proposta, quando não há contrato) + proposta nova depois do contrato + parcelas vencidas do `/cobranca` + o que entrar por `--valor "rótulo=1234,56"` |

O mesmo item escrito de dois jeitos ("Carla, acesso ao domínio" no pipeline, "Mandar
acesso ao domínio" na ata) vira uma linha só, com as duas origens ao lado. Dentro de
cada lista a ordem é a ordem da conversa: vencida primeiro, da mais velha pra mais
nova, e o que não tem data no fim.

Nome na coluna "Quem" que não é o do usuário nem o do cliente sai numa terceira
seção, "Tarefas da ata com outro nome". Pode ser a pessoa de contato do cliente que
ainda não tem ficha, ou pode ser alguém da equipe. Pra saber qual, o script lê a
linha `**Com:**` da ata: participante marcado com a empresa do cliente ("Carla
Mendes (Acme)") passa a contar como lado dele. Sem essa linha, a seção fica e o
usuário confirma antes de cobrar. Pedir ao cliente uma coisa que o seu próprio
time deve derruba a confiança na página inteira, e de uma vez.

As opções que costumam ser necessárias:

- `--tipo reuniao | call | whatsapp | visita | balcao`: reunião leva a página inteira;
  call e WhatsApp cortam a pergunta de expansão e o resumo da ata; visita sai sem valor
  em jogo, que não se discute em pé; balcão é o cabeçalho e as duas listas
- `--hoje DD/MM/AAAA` quando a conversa não é hoje. É dela que sai o dia da semana do
  título e a conta do que está vencido
- `--eu "Bruno"` quando o script não acha quem é o usuário. Ele tenta primeiro as
  linhas "Dono:" e "Responsável:" de `_memoria/empresa.md`, que são pessoa. A linha
  "Nome:" é o nome do negócio, e essa entra só como palpite: vale se aparecer na
  coluna "Quem" de alguma ata. Sem nada disso, as tarefas da ata saem numa seção
  separada, "sem saber de quem são", em vez de entrar no lado errado da página
- `--valor "Aditivo do blog=1.500,00"` pra acordo que está num PDF ou foi verbal. O
  Claude Code lê PDF direto pela ferramenta Read: abrir a proposta, achar o total e
  passar por aqui, com o rótulo dizendo de onde veio
- `--pasta clientes/Acme` quando o nome da pasta não bate com o nome falado

`--json` devolve o cruzamento inteiro pra conferir de onde saiu cada linha.

### Passo 3 — Conferir o que o script achou

O script acha por padrão de nome e de tabela. Ele não lê sentido, e cinco coisas
precisam de olho antes de a página valer:

- **Valor marcado "confirmar"**: o script não achou "total" nem "investimento" perto
  do R$ e pegou o maior valor do arquivo. Abrir o arquivo, ler o trecho, confirmar
- **Seção "sem saber de quem são"**: rodar de novo com `--eu "Nome"`. Enquanto ela
  existe, o cabeçalho não sabe quantas pendências são do usuário
- **Tarefa da ata que já foi feita** sem ninguém fechar em `tarefas.md`. Perguntar,
  em uma mensagem, listando só as que vieram da ata:

> "A ata de 18/08 diz que você ficou de mandar o wireframe até 05/10. Já foi?"

- **Parcela marcada prescrita**: o script a mostra em "o que ele deve" e a deixa fora
  do total, porque o `/cobranca` já a tirou da conta cobrável. Se o usuário quiser
  discutir aquele valor na conversa, é decisão dele, não da página
- **Seção "Tarefas da ata com outro nome"**: perguntar de quem é cada linha, numa
  mensagem. "A ata diz que a Maria ficou de mandar a logo. Maria é do lado do cliente
  ou da sua equipe?" O que for do cliente sobe pra "o que ele deve"; o resto fica de
  fora da conversa. Quando a pessoa é do cliente, criar a ficha dela pelo `/pessoa`
  com `empresa:` apontando pro cliente resolve os próximos briefings de uma vez

O que o usuário confirmar como feito sai da página e, se ele quiser, fecha em
`tarefas.md` pelas regras do `/tarefas`. O que não foi, fica, com a data.

Se o script avisou que nenhum arquivo cita o cliente, o nome pode estar diferente
("Acme" no pipeline, "ACME Ltda" na proposta). Rodar de novo com o nome mais curto
antes de concluir que não há histórico.

### Passo 4 — Escrever as seções de julgamento

Agora o assistente lê o material de verdade: a última ata inteira, a ficha da pessoa,
as mensagens em `vendas/` que citam o cliente. E preenche, na voz de
`_memoria/preferencias.md`, o que o script deixou em `[preencher]`:

- **Em uma frase**: por que essa conversa existe, e o que precisa sair dela
- **O que ele espera ouvir hoje**: uma ou duas linhas, na forma "ele quer saber se
  X". Vem de "Próxima reunião" e "Vira o quê" da ata, da proposta sem resposta, da
  pendência que destrava com o usuário. Se a resposta é não, dizer que é não
- **O que não repetir**: o script já traz o que a ficha do `/pessoa` manda não
  reexplicar. Completar com pergunta já respondida numa ata, promessa que falhou uma
  vez, e o que ele disse que não quer. Assunto que ele pediu pra não registrar entra
  só como "não tocar em X"
- **As perguntas**: uma de avanço, uma de risco, uma de expansão, conforme o molde. O
  `--tipo` já cortou as que não cabem nessa conversa
- **Meta da conversa**: uma frase com verbo e data. "Sair com a home aprovada e o
  acesso combinado pra quinta 24/09". Meta sem data não é meta

Cada linha dessas seções cita a origem entre parênteses (`ata 18/08`, `proposta
25/08`, `pessoas/carla-mendes.md`). O que não tem origem em arquivo nem na conversa com
o usuário não entra. Briefing é o lugar onde inventar detalhe faz mais estrago: o
usuário vai dizer aquilo na frente do cliente.

Quando a conversa é de venda (cliente que ainda não fechou, proposta nova pra
cliente antigo), a página para em "o que ele espera ouvir" e aponta: "roteiro de
venda é `/vender`; este briefing dá o histórico". Não escrever roteiro aqui.

### Passo 5 — Notícia, só se o usuário pedir

Cliente que é empresa pode ter notícia: loja nova, sócio novo, prêmio. Se o usuário
pedir ("vê se saiu alguma coisa sobre eles"), rodar WebSearch com o nome da empresa
e a cidade, e o que entrar leva a URL e a data da leitura, numa linha:

```markdown
## Do lado de fora
- Abriu segunda unidade em Santos (jornal X, URL, lido em 23/09/2026)
```

Sem pedido, sem busca. Padaria, clínica e pessoa física não têm notícia, e rede
social não é fonte.

### Passo 6 — Fechar a página

O arquivo final tem esta forma (reunião marcada; os outros tipos saem menores):

```markdown
# Briefing — <cliente> — <dia da semana> <DD/MM/AAAA>

**Tipo de conversa:** reunião marcada  ·  **Onde/quando:** <local ou canal, hora>
**Último contato:** <DD/MM/AAAA>, há <n> dias (<arquivo>)
**Pendências vencidas:** <n> minhas · <n> dele
**Valor em jogo:** R$ <total>
**Ficha:** `pessoas/<slug>.md` (<nome>)
**O que importa pra <nome>:** <a lente dela, da ficha>

> **Não contatar <nome>:** <o que a ficha proíbe>. Confirmar o canal antes de falar.

## Em uma frase
<por que essa conversa existe e o que precisa sair dela>

## O que eu prometi e ainda não entreguei
- [ ] <o quê> · <data> · **vencida** _(tarefas.md › Agora)_

## O que ele deve
- [ ] <resposta, insumo ou parcela> · <data> _(ata DD/MM › pendências)_

## Tarefas da ata com outro nome
- [ ] <nome>: <o quê> · <data> _(ata DD/MM)_

## Valor em jogo
| Origem | Valor | Fonte |
|---|---|---|
| Contrato | R$ ... | `contratos/...` |
| **Total** | **R$ ...** | |

## O que ele espera ouvir hoje
<uma ou duas linhas, com a origem>

## O que não repetir
- <pergunta já respondida, promessa que falhou, o que ele não quer> _(origem)_

## Três perguntas
1. <avanço>
2. <risco>
3. <expansão>

## Meta da conversa
<uma frase com verbo e data>

## Da última ata (<DD/MM/AAAA>, `<arquivo>`)
- Em uma frase: ...
- Decidido: ...
- Próxima reunião combinada: ...

## Fontes lidas
- <o que o script leu e o que não existia>
```

Uma página. Se passou de uma tela de celular, cortar de baixo pra cima: "Da última
ata" e "Fontes lidas" saem primeiro, as perguntas nunca.

Antes de entregar:

```bash
node scripts/verificar.js datas "reunioes/2026-09-23-acme-briefing.md"
node scripts/verificar.js tabela "reunioes/2026-09-23-acme-briefing.md"
```

O `datas` confere o dia da semana do título e das datas escritas por extenso; o
`tabela` confere que o total de "Valor em jogo" é a soma das linhas.

Se o `tabela` divergir, rodar o script de novo em vez de corrigir o número na mão.
Se o `datas` reclamar, olhar de onde veio a linha: quase sempre o dia da semana
errado foi copiado de `tarefas.md` ou da ata, e o conserto é no arquivo de origem.
Depois roda o briefing de novo. Corrigir só aqui deixa o erro vivo pro próximo
briefing, e pro próximo.

### Passo 7 — Entregar

No chat, o cabeçalho e o que muda a conversa, em cinco linhas. O resto está no arquivo.

```
✓ Briefing: reunioes/2026-09-23-acme-briefing.md
  18 dias sem contato · 1 pendência sua vencida (proposta revisada, 15/09) · 2 dele
  Em jogo: R$ 15.574,40 (contrato + parcela de setembro)
  Ele espera: saber se a home sai até sexta. Meta: aprovar a home e combinar o acesso
  Não repetir: perguntar do domínio (ela decidiu que fica, ata de 18/08)
```

Depois da conversa, o que aconteceu vai pra ata pelo `/reuniao`, a ata alimenta o
`/tarefas`, e o que a pessoa ensinou vai pra ficha do `/pessoa`. O briefing não se
atualiza: é o registro de com o que o usuário entrou na sala. O próximo briefing lê a
ata nova.

---

## Regras

- **Só funciona com histórico em arquivo.** Sem ata, pipeline, ficha, proposta ou contrato citando o cliente, não há o que cruzar. Dizer isso e apontar o `/vender` (primeira conversa) ou o `/reuniao` (pra criar o histórico), sem inventar um briefing de duas linhas genéricas
- **Toda conta é do script.** Dias sem contato, pendências vencidas e valor em jogo saem de `scripts/briefing-reuniao.js`, com a fonte ao lado. Nada disso se estima de cabeça, e o total passa pelo `verificar.js tabela`
- **Valor marcado "confirmar" se confirma** abrindo o arquivo. Número errado no briefing vira número errado dito na frente do cliente
- **Nome de terceiro não vira dívida do cliente.** Tarefa da ata com um nome que não é o do usuário nem o do cliente fica na seção à parte até alguém dizer de quem é. Cobrar do cliente o que a sua equipe deve estraga a conversa e a página de uma vez
- **A ordem de cada lista é a ordem da conversa.** Vencida primeiro, da mais velha pra mais nova, o sem data no fim. Quem lê de cima pra baixo já lê na sequência em que o assunto vai aparecer
- **Tarefa sem dono não escolhe lado.** Enquanto o script não sabe quem é o usuário na ata, aquelas linhas ficam na seção à parte. Chutar erraria justo o cabeçalho, que é o que o usuário lê antes de entrar na sala
- **Não inventar o que ele espera ouvir.** Vem da ata, da proposta, da pendência ou da mensagem que motivou a conversa. Sem origem, a seção diz "[a confirmar: por que ele pediu a conversa?]" e o assistente pergunta
- **Promessa vencida vai no topo, em negrito**, e o usuário decide antes da conversa: entregar antes, pedir prazo novo ou avisar que não vai dar. A página não suaviza
- **Tarefa da ata que pode já ter sido feita se pergunta**, uma mensagem, antes de virar pauta. Cobrar o usuário de coisa que ele já entregou é o jeito mais rápido de ele parar de usar a página
- **Uma página.** Cortar de baixo pra cima, nunca as perguntas nem o que ele espera ouvir
- **Notícia só com pedido e com URL e data.** Rede social não é fonte, e cliente pequeno não tem notícia
- **O que a ficha diz que a pessoa não quer manda mais que a conveniência do usuário.** Se `nao_contatar` está preenchido em `pessoas/<slug>.md`, a página abre com esse aviso e o canal se confirma antes da conversa
- **LGPD:** a página junta numa tela o que uma pessoa deve, disse e não quer. É dado pessoal na Lei 13.709/2018 ([planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), conferido em 23/09/2026). Fica no workspace, não vai pra ferramenta externa, e o que ela pediu pra não registrar não entra nem como pista. Versão pra alguém da equipe sai sem a parte financeira e sem "o que não repetir"
- **Prazo de dívida e prescrição não se resolvem aqui.** A página repete o que o `/cobranca` calculou e diz de onde veio; o que fazer com parcela velha é conversa de advogado ou contador, e o briefing não dá essa resposta
- **Valor em jogo não é preço nem cobrança.** É o tamanho da relação, pra decidir quanto ceder. Reajuste é `/preco`; parcela atrasada é `/cobranca`; contrato é `/contrato`
- **Quando o usuário está com pendência vencida e o cliente também**, a ordem na conversa é: a do usuário primeiro. Quem cobra antes de entregar perde o direito de cobrar
- **Fronteira:** primeira conversa de venda e roteiro de venda são `/vender`; o que aconteceu na conversa vira ata pelo `/reuniao`, que alimenta o `/tarefas`; a ficha profunda da pessoa é o `/pessoa`, e o briefing lê de lá; a cobrança em si (régua, mensagem, juros) é `/cobranca`, aqui entra só o valor em aberto; o deck que vai pra reunião é `/apresentacao`; o relatório mensal que o cliente recebe é `/relatorio-cliente`
