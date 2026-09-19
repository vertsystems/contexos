---
name: rotina
description: >
  Cria e mantém o trabalho recorrente do sistema: revisão da semana toda sexta, leitura de
  ads toda segunda, lembrete do calendário de conteúdo, tarefas vencidas, fechamento do caixa
  no dia 1, pedido de depoimento dias depois da entrega. Cada rotina tem nome, quando, o que
  roda, onde entrega e como desligar, registrada em `rotinas.md`. Agenda no cliente de IA
  quando ele tem rotinas; sem agendamento, a abertura da sessão avisa o que venceu.
  Use quando o usuário disser "toda sexta quero a revisão", "me lembra toda segunda",
  "faz isso automático", "quero que rode sozinho", "agenda isso pra mim", "todo mês fecha
  o caixa", "não quero ter que lembrar", "desliga essa rotina", "o que tá agendado",
  "quais rotinas eu tenho", ou /rotina.
---

# /rotina — Trabalho recorrente, agendado

> **Convenção de pastas:** a saída é `rotinas.md` na raiz, nas duas convenções. É estado do sistema, não peça: na convenção **por cliente**, a rotina de um cliente fica no mesmo arquivo e a coluna "Entrega" já carrega `clientes/<Nome>/`. O arquivo nasce na primeira rotina.

Negócio pequeno não perde por falta de ideia. Perde por falta de repetição. A revisão da
semana que aconteceu três vezes em maio e nunca mais; o relatório de anúncio que só é aberto
quando o cartão estoura; o depoimento que ninguém pediu porque a entrega foi há um mês e a
janela fechou. Cada uma dessas coisas o sistema já sabe fazer. Falta alguém lembrar de
pedir. É isso que o `/rotina` tira da cabeça do dono: registra o que repete, com dia e
hora, e a abertura da sessão cobra o que venceu. Onde o cliente de IA tem agendamento, a
rotina roda sem ninguém pedir. Onde não tem, ela lembra de existir. Isso já resolve muito.

## Dependências

- **Contexto:** `_memoria/empresa.md` (perfil e o que o negócio repete de fato) e `_memoria/estrategia.md` (rotina que não serve ao foco atual não entra)
- **O que já existe:** `tarefas.md`, `conteudo/calendario-<AAAA-MM>.md`, `campanhas/`, `financeiro/`, `revisoes/`: cada um diz se a rotina correspondente tem com o que trabalhar. O `tarefas.md` é também a fonte das rotinas por evento (item "entregue" ou "proposta enviada" com data)
- **Molde:** `templates/operacao/rotinas.md`, as oito rotinas que mais valem, o que nunca se automatiza e o modelo de prompt pra rotina agendada
- **Script:** `scripts/rotinas.js`, que converte a cadência em data e em cron, diz o que venceu, faz a conta das rotinas por evento, registra cada execução e desliga ou religa uma rotina sem editar tabela na mão
- **Git:** `.git/` com `origin` do usuário (configurado pelo `/salvar`). Sem ele, o modo agendado não existe pra esse workspace
- **Drop zone:** `dados/` fica fora do repositório (`.gitignore`). Rotina que lê extrato ou CSV de lá só roda no modo manual, com o dono presente
- **Saída:** `rotinas.md` na raiz (registro único, atualizado a cada rotina e a cada execução) e o agendamento no cliente de IA, quando houver

---

## Workflow

### Passo 1 — Descobrir o que ele quer que se repita

Duas portas de entrada, e a resposta muda o caminho:

**Ele já sabe** ("toda segunda quero o relatório de ads"): nome, quando e o que rodar já
vieram. Confirmar em uma linha e ir pro Passo 2. Não perguntar o que ele acabou de dizer.

**Ele não sabe** ("quero automatizar", "o que dá pra deixar rodando"): antes de perguntar,
olhar o que existe no workspace. Cada arquivo diz qual rotina tem material:

| Existe | Rotina que faz sentido |
|---|---|
| `campanhas/` com relatório | Leitura de ads toda segunda |
| `conteudo/calendario-<mês>.md` | Lembrete do calendário toda segunda |
| `revisoes/` com uma ou duas revisões e depois nada | Revisão da semana toda sexta |
| `financeiro/` com fechamento antigo | Fechamento do caixa no primeiro dia útil |
| `tarefas.md` com item "entregue" ou "proposta enviada" | Depoimento e follow-up, por evento |
| `avaliacoes-google/` ou perfil no Google em `empresa.md` | Avaliações novas toda segunda |

Com isso em mãos, **uma pergunta**, com no máximo três opções que o workspace sustenta:

> "Pelo que tem aqui, três rotinas pagariam o tempo: revisão da semana toda sexta, leitura
> de ads toda segunda e o caixa no primeiro dia útil. Quer as três, ou começa por uma?"

Não oferecer as oito do molde de uma vez. Três a cinco rotinas ativas é o que um negócio de
uma pessoa sustenta; oito viram ruído na abertura da sessão em duas semanas.

Se `rotinas.md` já existe, ler antes: a rotina pedida pode já estar lá, ativa ou desligada.
Rotina desligada por três vazios volta quando o que faltava passou a existir (o CSV começou
a ser exportado), e isso é um `religar`, não uma criação nova.

### Passo 2 — Definir os cinco campos

Toda rotina tem cinco campos, e cada um tem um jeito certo de preencher:

| Campo | Vale | Não vale |
|---|---|---|
| **Nome** | "Revisão da semana", "Leitura de ads" | "Rotina 1", "Automação" |
| **Quando** | "toda sexta 17h", "primeiro dia útil do mês 9h", "por evento: 7 dias depois da entrega" | "semanalmente", "de vez em quando", cadência sem hora |
| **Executa** | `/relatorio-ads` com os CSVs de `dados/`; se não houver CSV novo, registrar vazio e parar | "gerar relatório" |
| **Entrega** | `campanhas/relatorios/<data>.md` | "na pasta de sempre" |
| **Como desligar** | "pedir 'desliga a leitura de ads', ou três segundas sem CSV" | em branco |

O campo **Quando** é o único que o script precisa entender, e ele entende cadência em
português: `todo dia 8h`, `todo dia útil 8h`, `toda sexta 17h`, `às sextas 17h`, `toda
segunda e quinta 9h`, `dia 1 de cada mês 9h`, `dia 5 e 20 de cada mês 9h`, `último dia do
mês 18h`, `primeiro dia útil do mês 9h`, `último dia útil do mês 18h` e `por evento: N dias
depois de <o quê>`. "Quinzenal" não existe: vira "dia 1 e 15". Hora é obrigatória, e o
script recusa cadência sem hora. Antes de gravar, conferir por comando que a cadência foi
entendida e que as datas caem onde ele imagina:

```bash
node scripts/rotinas.js proxima "toda sexta 17h"
```

Ele devolve as três próximas datas com dia da semana e a expressão cron em UTC. "Dia 1 de
cada mês" cai num domingo em novembro e numa terça em dezembro; se a rotina precisa do
dono presente (colar extrato, responder pergunta), "primeiro dia útil do mês" é a cadência
certa, e a conversa é essa. "Dia 31" não existe em metade dos meses, e o script avisa: pra
fim de mês, a cadência é "último dia do mês".

O campo **Executa** precisa dizer o que fazer quando a entrada não existe. Rotina que não
acha o CSV e inventa um relatório é pior que rotina nenhuma. A frase padrão é "se não
houver <entrada>, registrar vazio e parar".

Rotina **por evento** (depoimento 7 dias depois da entrega, follow-up 3 dias depois da
proposta) não tem data fixa: quem dispara é o item com data em `tarefas.md` ("Site da
Padaria entregue 10/09", "proposta enviada 15/09"). O campo Quando precisa ter o número de
dias e o gatilho, nessa forma, porque é isso que o script procura:

```bash
node scripts/rotinas.js eventos
```

Ele lê o `tarefas.md`, acha cada item com a palavra do gatilho e uma data, soma os dias e
diz o que venceu, o que vem, o que já foi registrado e o que passou da janela (30 dias
depois de vencer, o depoimento não se pede mais; vira reativação pelo `/pos-venda`). A conta
da data é dele, nunca de cabeça.

### Passo 3 — Escolher o modo: manual ou agendada

Dois modos, e a escolha depende de duas coisas que se conferem, não se supõem. A primeira
é se o cliente de IA instalado agenda alguma coisa: o assistente sabe se tem um comando ou
ferramenta de agendamento na sessão (no Claude Code, na versão conferida em 19/09/2026, é
o comando **/schedule** do próprio cliente, que cria rotinas na nuvem em cima do repositório;
não é skill do sistema). Se não encontra, não tem. Não se descreve um comando que não se viu. A segunda é o repositório:

```bash
git remote -v 2>/dev/null | head -2     # o workspace está no GitHub do usuário?
```

| Situação | Modo | O que acontece |
|---|---|---|
| Cliente de IA sem agendamento, ou workspace sem `origin` | **Manual** | O registro em `rotinas.md` é a rotina. A abertura da sessão roda `node scripts/rotinas.js vencidas` e mostra o que venceu na linha "Pendente". Ele diz "roda a revisão" e a skill roda |
| Cliente com agendamento **e** `origin` configurado | **Agendada** | O assistente cria o agendamento no cliente, e o registro em `rotinas.md` recebe `Modo: agendada`. A rotina roda sozinha e anota o resultado no histórico |

Uma rotina que lê `dados/` (extrato do `/caixa`, CSV do `/relatorio-ads`, avaliações
coladas) é manual mesmo com agendamento disponível: a pasta não vai pro repositório, e a
rotina na nuvem não a enxerga. Se ele quiser essa rotina agendada, o arquivo precisa morar
numa pasta versionada (`campanhas/`) e não pode ter dado pessoal. Na dúvida, manual.

O manual não é o modo de quem não conseguiu o outro. Pra quem abre o assistente quase todo
dia, ele resolve: a rotina lembra de existir na hora certa, e a execução tem o dono junto,
que é o que a maior parte das rotinas pede (colar avaliação, confirmar número). Muita gente
nunca vai precisar do outro modo.

**No modo agendado**, o que o assistente cria contém, em qualquer cliente:

1. **Nome**, o mesmo do registro
2. **Horário em UTC**, vindo do `node scripts/rotinas.js proxima`, nunca de cabeça. 17h em
   São Paulo é 20h UTC; 22h já é o dia seguinte em UTC, e o script desloca o dia da semana
3. **O repositório** do workspace no GitHub. A rotina na nuvem começa do zero: não vê a
   máquina do dono, nem o `.env` local, nem arquivo que não passou pelo `/salvar`
4. **O prompt autocontido**, no modelo do molde: ler o `CLAUDE.md`, rodar a skill como está
   em `.claude/skills/<nome>/SKILL.md`, não perguntar nada (deixar `[a confirmar]`), salvar
   na pasta prevista, registrar com `node scripts/rotinas.js registrar`, fazer commit, e a
   lista do que **não** fazer: enviar, publicar, apagar, mexer em `_memoria/estrategia.md`
5. **Onde desligar**: pelo painel de rotinas do cliente de IA ou pedindo ao assistente. O
   registro precisa refletir o desligamento, senão a abertura da sessão segue cobrando

Antes de criar, mostrar os cinco itens e esperar o "pode criar". Criar agendamento é ação
no cliente, fora do workspace, e entra na regra de confirmação explícita. Intervalo mínimo,
formato do horário, onde fica o painel e o jeito de desligar mudam entre versões do cliente:
o que não foi conferido na hora entra como `[a confirmar]`, e o assistente confere antes de
prometer que "vai rodar sozinho toda sexta". Os cinco itens se descrevem pra ele em
linguagem de gente, não de cron:

> "Vou criar no cliente uma rotina chamada Revisão da semana. Ela roda toda sexta às 17h
> (20h no relógio do servidor), em cima do que está salvo no GitHub, faz a revisão como o
> `/revisao-semanal` faz e deixa o arquivo em `revisoes/`. Não manda mensagem, não publica,
> não apaga nada. Pra desligar, é me pedir. Posso criar?"

Enquanto uma sessão está aberta, alguns clientes repetem uma tarefa em intervalo curto. Isso
não é rotina: morre quando a sessão fecha, e não entra no registro.

### Passo 4 — Escrever o registro

`rotinas.md` na raiz, com data por comando (`date "+%d/%m/%Y"`). As quatro seções, nessa
ordem, com esses títulos: o script procura por eles.

```markdown
# Rotinas

> Atualizado em <DD/MM/AAAA> · fuso: <America/Sao_Paulo>

## Ativas

| Rotina | Quando | Executa | Entrega | Modo | Última execução | Resultado |
|---|---|---|---|---|---|---|
| Revisão da semana | toda sexta 17h | /revisao-semanal; sem nada na semana, registrar vazio | revisoes/<data>.md | manual | 18/09/2026 | útil |
| Leitura de ads | toda segunda 9h | /relatorio-ads com dados/*.csv; sem CSV novo, registrar vazio e parar | campanhas/relatorios/<data>.md | manual | | |
| Tarefas vencidas | todo dia útil 8h | leitura de tarefas.md: o que venceu e o que vence em 3 dias; sem nada, registrar vazio | histórico deste arquivo | agendada | | |
| Pedido de depoimento | por evento: 7 dias depois da entrega | /pos-venda (acabou de entregar); prepara, não envia | vendas/pos-venda/ | manual | | |

## Como desligar

- **Revisão da semana:** pedir "desliga a revisão", ou três sextas seguidas sem nada a revisar
- **Leitura de ads:** pedir "desliga a leitura de ads", ou três segundas sem CSV em dados/
- **Tarefas vencidas:** pedir, ou desligar no painel do cliente; três dias úteis sem item vencido
- **Pedido de depoimento:** pedir; rotina por evento não desliga por vazio

## Desligadas

| Rotina | Quando | Desligada em | Motivo |
|---|---|---|---|

## Histórico (últimas 30 execuções)

- 18/09/2026 sex — Revisão da semana — útil: 3 itens pra semana que entra
```

`Modo` é `manual` ou `agendada`. As colunas "Última execução" e "Resultado" começam vazias
e são preenchidas pelo script, não na mão. Cada item de "Como desligar" começa com o nome
da rotina em negrito, igual ao da tabela, porque é assim que o `desligar` acha a linha pra
tirar. O histórico guarda uma linha por execução, com a data, o dia da semana e o resultado
em uma frase, começando com `útil:` ou `vazio:`. É esse `vazio:` que o script conta.

Antes de fechar o arquivo, dois comandos:

```bash
node scripts/verificar.js datas rotinas.md   # dia da semana do histórico bate com a data
node scripts/rotinas.js listar               # cada cadência foi entendida, próxima data de cada uma
```

Cadência que o script marca como "não reconhecida" volta pro Passo 2. Não gravar rotina que
a abertura da sessão não vai conseguir cobrar.

**Na primeira rotina do workspace**, garantir que alguém vai cobrar. Conferir se a abertura
da sessão já roda a checagem:

```bash
grep -l "rotinas.js" .claude/skills/abrir/SKILL.md CLAUDE.md 2>/dev/null
```

Se voltar vazio, acrescentar uma linha na seção de regras do `CLAUDE.md` do workspace (é
contexto do negócio, não o sistema), mostrando antes de salvar:

> No começo de toda sessão, se `rotinas.md` existir, rodar `node scripts/rotinas.js vencidas`
> e `node scripts/rotinas.js eventos`; o que estiver 🔴 entra na linha "Pendente" da abertura.

Sem isso, o registro é uma lista que ninguém lê, e o modo manual não funciona.

### Passo 5 — Rodar a primeira vez agora, junto

Rotina nova roda uma vez com o dono olhando, na mesma sessão, antes de ficar sozinha. É
onde aparece o que o registro não previu: o CSV tem outro nome, o calendário do mês não
existe, a revisão precisa de uma pergunta que ninguém vai responder de madrugada.

Rodar a skill do campo **Executa** como ela é, e ao terminar, registrar:

```bash
node scripts/rotinas.js registrar "Leitura de ads" --resultado "útil: CPA caiu de R$ 71 pra R$ 56, uma ação pra semana"
```

O script preenche "Última execução" e "Resultado" na tabela, acrescenta a linha no
histórico e diz quantos vazios seguidos a rotina tem. Se a primeira execução já saiu vazia
por falta de entrada, a conversa é sobre a entrada ("o CSV precisa estar em `dados/` até
domingo à noite"), não sobre a rotina.

Ao fechar, ele recebe uma frase, não um relatório. Com a próxima data vinda do script:

> "Registrei a Leitura de ads: toda segunda 9h, lê o CSV que estiver em `dados/` e salva o
> relatório em `campanhas/relatorios/`. Modo manual: quando você abrir o assistente depois
> das 9h de segunda, eu cobro. Próxima: seg 21/09. Pra desligar, é só pedir."

No modo agendado, a primeira execução supervisionada é também a prova do prompt: o que
precisou de intervenção humana nessa rodada entra no prompt como instrução ("se o CSV não
tiver a coluna Conversões, seguir só com tráfego e avisar no relatório").

### Passo 6 — Manter: registrar, cobrar, desligar

**A cada execução**, manual ou agendada, uma linha no histórico pelo `registrar`. Execução
sem registro não existe pro sistema. É o registro que faz a abertura parar de cobrar. Rotina
por evento registra com o nome do cliente no resultado ("útil: mensagem pronta pra Padaria
Central"): é por essa palavra que o `eventos` sabe que aquele item já foi atendido.

**Na abertura da sessão**, a checagem de pendências ganha duas fontes:

```bash
node scripts/rotinas.js vencidas   # cadência fixa: o que devia ter rodado e não rodou
node scripts/rotinas.js eventos    # por evento: depoimento e follow-up que venceram
```

O que estiver 🔴 entra na linha "Pendente" ("Revisão da semana vencida desde sex 18/09",
"follow-up da Acme venceu hoje"). No máximo dois itens, como o resto da abertura; se houver
mais, o mais antigo primeiro e "e mais N rotinas vencidas".

**Três vazios seguidos** e a rotina é desligada. O script avisa no terceiro; a skill desliga
por comando, desliga no cliente se era agendada (com confirmação, porque é ação fora do
workspace), e diz ao dono em uma linha o que aconteceu e o que faria a rotina voltar:

```bash
node scripts/rotinas.js desligar "Leitura de ads" --motivo "três segundas seguidas sem CSV em dados/"
```

> "Desliguei a leitura de ads: três segundas seguidas sem CSV em `dados/`. Se voltar a
> exportar, é só pedir que eu religo."

O `desligar` move a linha pra "Desligadas" com a data e o motivo, tira o item de "Como
desligar" e anota no histórico. **Desligar a pedido** é o mesmo comando com
`--motivo "a pedido"`. **Religar** é `node scripts/rotinas.js religar "<nome>"`: a linha
volta pra "Ativas" em modo manual com as execuções zeradas e a contagem de vazios zerada;
Executa e Entrega voltam como `[a confirmar]` pra preencher na hora, e a linha de "Como
desligar" precisa ser reescrita.

**A cada revisão do mês** (ou quando ele perguntar "o que tá agendado"), o `listar` mostra
as ativas com modo, última execução e próxima data. Rotina que ele não lembra por que
existe é candidata a sair: perguntar, uma vez. E conferir que o que está `agendada` no
registro existe mesmo no painel do cliente, e vice-versa.

---

## Regras

- **Rotina que fala com cliente nunca envia sozinha.** Depoimento, follow-up, resposta de avaliação, e-mail pra lista: a rotina prepara a mensagem e deixa em `vendas/` (ou onde a skill de origem salva), com o item em `tarefas.md`. Quem envia é o dono, depois de ler
- **Rotina não publica, não apaga, não gasta.** Post, artigo e página ficam renderizados esperando aprovação; arquivo obsoleto vira lista, não exclusão; "cabe subir o orçamento do anúncio" é frase de relatório, e quem sobe é ele. A tabela completa está no molde
- **Três execuções sem nada útil e a rotina é desligada, com o dono avisado.** O motivo quase sempre é entrada que não chega, e a conversa é sobre isso. Rotina por evento (depoimento, follow-up) não entra na regra: semana sem entrega é normal
- **No máximo cinco rotinas ativas.** Passou disso, perguntar qual sai antes de criar a sexta. A abertura que começa com seis pendências é a abertura que ninguém lê
- **Data, dia da semana e cron saem do script, nunca de cabeça.** `node scripts/rotinas.js proxima` antes de gravar, `eventos` pra rotina por evento, `node scripts/verificar.js datas` antes de fechar o arquivo. Sexta que cai no dia errado é rotina que roda no dia errado
- **Tabela do registro não se edita na mão.** Registrar, desligar e religar são comandos do script; editar a tabela direto é como a data da última execução some e a contagem de vazios quebra. Na mão só o que o script não faz: Executa, Entrega e a linha de "Como desligar"
- **Criar ou desligar agendamento no cliente pede confirmação explícita na mesma conversa.** É ação fora do workspace. Mostrar os cinco itens do Passo 3 e esperar o sim
- **Não inventar recurso do cliente de IA.** O que o cliente instalado faz ou não faz com agendamento (intervalo mínimo, fuso, onde fica o painel, jeito de desligar) se confere na hora; o que não foi conferido entra como `[a confirmar]`. Prometer "vai rodar sozinho" sem confirmar é pior que oferecer o modo manual
- **Rotina agendada começa do zero.** Não vê a máquina do dono, o `.env` local nem o que não foi salvo pelo `/salvar`. O prompt precisa dizer tudo, inclusive o que não fazer
- **Registro é a fonte da verdade.** Agendamento no cliente sem linha em `rotinas.md` é rotina fantasma; linha em `rotinas.md` sem agendamento é modo manual. Os dois precisam bater, e a skill confere quando ele pergunta "o que tá agendado"
- **Não é pipeline.** O que está em jogo essa semana, com prazo, é `tarefas.md` pelo `/tarefas`. A rotina lê o pipeline (tarefas vencidas, entrega fechada) e alimenta o pipeline (follow-up criado), mas não é ele
- **Não é a revisão.** O `/revisao-semanal` é uma rotina possível, a mais comum. O `/rotina` é quem agenda e cobra; o conteúdo da revisão é da skill dela
- **Não é criação de skill.** Tarefa repetitiva que ainda não tem skill é o `/mapear-rotinas`, que descobre o que automatizar e cria a skill. O `/rotina` agenda o que já existe. Se ele pedir uma rotina de algo que nenhuma skill faz, o caminho é `/mapear-rotinas` primeiro
- **Não é o meio do caminho.** Onde um trabalho parou é o `/pausar`; a abertura que lê tudo é o `/abrir`. A rotina só acrescenta uma fonte à linha "Pendente"
- **Dado de cliente não vai pra rotina agendada.** A rotina na nuvem lê o repositório, e `dados/` está fora dele de propósito (`.gitignore`). Extrato, base de contatos, CSV de venda com nome de cliente e CPF ou CNPJ de terceiro não entram no repositório pra rotina ler; rotina que precisa disso roda no modo manual, com o dono presente. Chave de API e senha nunca entram no prompt do agendamento (LGPD e a regra de segredos do `CLAUDE.md`)
- Rotina não é desculpa pra número sem fonte. O que a skill de origem exige (conta somada por comando no `/caixa`, CSV lido de verdade no `/relatorio-ads`) vale igual quando ela roda sem ninguém olhando. Sem entrada, o resultado é `vazio:`, e `[a confirmar]` onde faltou resposta do dono
- **Rotina não muda a estratégia.** Padrão que a revisão encontrou vira pergunta pro dono, e `_memoria/estrategia.md` só muda com padrão confirmado em três semanas, pela mão dele
