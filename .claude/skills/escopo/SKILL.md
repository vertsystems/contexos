---
name: escopo
description: >
  Diz o que exatamente vai ser construído, em que ordem, quanto custa todo mês e quem mantém
  depois. Corta o pedido até a fatia mínima que já resolve o problema, separa o problema da
  solução que o dono já trouxe pronta, decide entre site e aplicativo pela lista de recursos do
  aparelho, e fecha a tabela de custo conferida por comando. Prazo não vira promessa: vira teto,
  e a pergunta passa a ser o que cabe dentro dele.
  Use quando o usuário disser "quero um sistema pra controlar meus pedidos", "quero um app pro
  meu delivery", "quanto custa fazer esse sistema", "vale a pena fazer isso", "é melhor site ou
  aplicativo", "dá pra fazer sozinho ou preciso contratar alguém", "esse projeto não acaba
  nunca", "toda semana o cliente pede uma coisa nova", "pediram um dashboard pra mim", "recebi
  um orçamento de desenvolvedor, o que eu confiro nele", ou /escopo.
  Fronteira com as vizinhas: preço do serviço que você vende é /preco; documento comercial pra
  mandar pro cliente é /proposta; site de uma página pra anúncio é /landing; abrir pasta de
  trabalho é /novo-projeto; escrever o código depois de aprovado é /backend; decidir o que vem
  depois, com o sistema no ar e o uso medido, é /evoluir.
---

# /escopo — O que construir, quanto custa, e se vale

> **Convenção de pastas:** a saída vai em `sistemas/<nome>/ESCOPO.md`. Na convenção **por cliente**, `clientes/<Nome>/sistemas/<nome>/ESCOPO.md`. A pasta só nasce quando o veredito é "vale a pena". Se for "não vale", a resposta fica na conversa e nenhuma pasta é criada.

Pedido de sistema chega pronto, em forma de tela. O dono descreve o que imaginou, não a
dificuldade que tem, e quem constrói exatamente aquilo entrega e ouve "já ajuda, mas agora eu
preciso também de...". Esta skill faz o caminho de volta: do pedido até o problema, e do problema
até a menor coisa que já resolve. O que sai é um arquivo que dá para ler e apontar. Isto entra,
aquilo não. Nenhuma linha de código.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` — o que o negócio faz, quantas pessoas trabalham nele, quem mexe em computador todo dia
- **Prioridades:** `_memoria/estrategia.md` — o dinheiro e o tempo disponíveis cortam mais escopo que qualquer preferência técnica
- **Referências** (ler a que o passo pedir, não todas):
  - `templates/software/validacao.md` — o degrau anterior: as três situações, a página de teste com preço, a medição do processo de hoje, e comprar pronto em vez de construir
  - `templates/software/escopo.md` — problema por baixo do pedido, fatia vertical, lista ordenada, aceite com número, prazo como teto, como dizer não
  - `templates/software/custo.md` — as duas colunas do orçamento, as quatro caixas do que o cliente pede depois, e a pergunta de quem mantém
  - `templates/software/manutencao.md` — o que o dono precisa receber por escrito para terminar dono do que foi feito
  - `templates/backend/stack.md` — linguagem, banco e hospedagem, e o critério que vem antes de todos
- **Saída:** `sistemas/<nome>/ESCOPO.md`, e só quando o veredito for "vale a pena"

---

## Workflow

### Passo 1 — Achar o problema embaixo do pedido

Ninguém chega dizendo "meus pedidos se perdem entre o WhatsApp e o caderno". Chega dizendo "põe
um campo de observação na tela e um relatório por vendedor". Anote a solução que ele trouxe,
agradeça, e volte ao problema.

A pergunta que abre tudo: **de quanto para quanto isso tem que mudar?** Quatro horas de
fechamento para quinze minutos. Trinta ligações de "cadê meu pedido" por semana para cinco. Se o
dono não consegue dizer o número, o item ainda não está pronto para ser construído.

As perguntas da entrevista estão em `templates/software/escopo.md`, seção "Perguntas que trazem a
conversa de volta ao problema". Faça de três a cinco, não todas.

**Regra:** só siga adiante depois de escrever o problema em uma frase, sem citar tela, campo nem
botão.

Se o sistema vai ser **vendido a clientes que ainda não existem**, o teste vem antes desta
conversa toda: página com problema, solução e preço, e a lista de quem deixou o contato. E se
ele é **para o próprio negócio**, o processo de hoje se mede antes, em tempo e em dinheiro,
senão ninguém consegue provar depois que o sistema pagou o que custou. Os dois caminhos estão
em `templates/software/validacao.md`.

### Passo 2 — Descobrir quem vai usar, que não é quem paga

O dono contrata. Quem passa oito horas na tela é a atendente. Sistema que atende só o primeiro é
entregue conforme o combinado e detestado no primeiro dia.

Escreva os dois separados no arquivo: o objetivo de quem paga e a dificuldade de quem opera. Se o
dono não souber responder pela segunda, sentar ao lado de três pessoas e vê-las fazer a tarefa
principal faz parte da entrega. Não é um item opcional de orçamento.

### Passo 3 — Cortar até a fatia mínima que já resolve

Fatia é uma funcionalidade inteira funcionando de ponta a ponta: cadastrar um pedido e ver o
pedido na lista. Camada é o banco todo modelado, e camada não serve para nada. Lance a versão
menor inteira, nunca a versão grande pela metade.

Depois monte a lista do resto em ordem, sem dois itens na mesma posição. Se tudo é prioridade
máxima, nada é, e a decisão volta para quem constrói. Detalhe só o que está perto de entrar; o
que fica para depois merece um nome e mais nada. O detalhe está em `templates/software/escopo.md`,
seções "A fatia vertical" e "Uma lista só, ordenada, sem empate".

Se o pedido foi "quero um dashboard", pare aqui e monte a matriz de medidas e recortes da seção
"Quero um dashboard" antes de qualquer outra coisa. É o pedido que mais vira projeto sem fim.

### Passo 4 — Escrever a lista do que NÃO entra

Esta lista é obrigatória e nunca sai vazia. Se saiu, o escopo não foi cortado: foi copiado.

Ela vem direto do Passo 3, do que ficou abaixo da linha, e cada item entra com o motivo em meia
linha. Nota fiscal fica de fora porque o contador já emite. Aplicativo fica de fora porque
ninguém precisa da câmera. A lista escrita é o que impede a conversa de ser repetida em março, e
é o que separa orçamento fechado de discussão infinita.

Mostre esta lista ao dono no mesmo momento em que mostra a outra. Quem corta é ele.

### Passo 5 — Site ou aplicativo

Não decida por gosto. Escreva a lista dos recursos do aparelho que o sistema precisa chamar:
câmera, leitor de código de barras, notificação que chega com o app fechado, sensor, arquivo do
telefone, funcionamento sem internet.

**Lista vazia significa site.** Lista com item significa que vale conversar sobre aplicativo, e a
conversa continua assim:

| Pergunta | Se a resposta for esta, é site | Se for esta, é aplicativo |
|---|---|---|
| Como a pessoa chega ao sistema? | link mandado no WhatsApp | ícone na tela do celular, uso repetido |
| Ela já conhece a marca? | não, é o primeiro contato | sim, já é cliente |
| A correção precisa chegar hoje? | sim | pode esperar a revisão da loja |
| Quem usa é conhecido? | qualquer pessoa | equipe da loja, aparelhos que você entrega |

Três custos que quase nunca aparecem no orçamento e precisam entrar: a conta de desenvolvedor da
loja é cobrada por ano mesmo com o app gratuito, publicar para iPhone exige um Mac sem
alternativa, e a revisão da loja é feita por gente, demora e pode recusar sem canal de
negociação. Some a chave que assina o aplicativo: se ela se perder, não há conserto, só
republicar como outro app e perder quem já instalou. O detalhe está em
`templates/software/custo.md`, armadilha "O aplicativo que ninguém pediu", e a escolha de
linguagem, banco e hospedagem fica em `templates/backend/stack.md`.

### Passo 6 — Escrever o critério de aceite com número

Adjetivo não é critério. "Rápido", "intuitivo" e "bonito" não dá para conferir olhando, e por
isso não dá para dizer que o item terminou. Cada item do topo da lista ganha uma tabela de
entrada e resultado esperado, com os dados de partida dentro do próprio texto:

| Entrada | Resultado esperado |
|---|---|
| Baixa de 3 unidades num produto com 2 em estoque | Recusa com a mensagem "estoque insuficiente: 2 disponíveis", e o estoque continua 2 |
| Baixa de 2 unidades no mesmo produto | Estoque gravado: 0, e o produto sai da lista de disponíveis |

Toda funcionalidade nasce com pelo menos dois cenários: um de sucesso e um de erro. O de erro é o
que quase ninguém escreve, e é de onde vem a maior parte dos chamados do primeiro mês. A tabela de
tradução de adjetivo em fato está em `templates/software/escopo.md`, seção "Critério de aceite:
entrada e resultado, com número".

### Passo 7 — Montar a tabela de custo, e conferir a soma

Duas colunas, sempre separadas. O que se paga uma vez sai do caixa hoje. O que se paga todo mês
sai do caixa para sempre, inclusive no mês em que ninguém abrir o sistema.

Copie a estrutura das duas tabelas de `templates/software/custo.md`, seções "O que se paga uma
vez" e "O que se paga todo mês", e troque cada linha pelo número que veio de uma fatura, de um
contrato ou do painel do fornecedor. Linha sem origem vira `[a confirmar]` visível, nunca um valor
plausível. Multiplique o total mensal por doze e escreva o resultado, porque é esse número que o
dono precisa ver antes de assinar.

Depois escreva a conta que decide o veredito, na mesma tabela: quantas horas por mês a rotina
manual consome hoje, vezes o custo dessas horas, contra o total mensal do sistema. Um sistema que
custa por mês mais do que economiza por mês não deveria existir.

```bash
node scripts/verificar.js tabela sistemas/<nome>/ESCOPO.md
```

Rode antes de mostrar qualquer número. Soma errada custa a venda inteira.

### Passo 8 — Transformar prazo em teto

Ninguém sabe quanto tempo leva. Nem você, nem o desenvolvedor, nem a IA. Estimativa em horas
vira promessa na cabeça de quem ouviu, e volta como "você disse três dias".

Então inverta. O dono diz até quando precisa estar no ar e por quê, a lista ordenada é lida de
cima para baixo até acabar o tempo, e o que ficou abaixo da linha se junta à lista do Passo 4. O
teto não se negocia; a lista, sim.

Calcular capacidade pela média dos últimos ciclos só funciona depois de três ciclos entregues. No
primeiro projeto isso não existe, e inventar um número no lugar é estimativa fantasiada de conta.
Prefira "em novembro" dito com honestidade a "dia 12" dito com firmeza.

### Passo 9 — Decidir quem constrói agora e quem mantém depois

Duas perguntas, as duas por escrito, as duas com nome.

**Quem constrói.** Compare o preço de contratar com o que o dono deixa de faturar no tempo que
gastaria fazendo. Quando o segundo for maior, contrate. Fazer sozinho economiza caixa e gasta
semanas de trabalho que pagariam as contas.

**Quem mantém daqui a um ano, e quanto custa a hora dessa pessoa.** As respostas são três, e cada
uma muda o orçamento e a stack. Você mesmo: escolha o que você consegue tocar, não o que é mais
elegante. Quem construiu, num contrato de manutenção: exija repositório, contas e segredos em nome
do dono desde o primeiro dia. Ninguém: é a resposta mais comum e a mais cara, porque sistema sem
dono não para de custar, só para de melhorar. A lista do que exigir por escrito está em
`templates/software/manutencao.md`, seção "O desenvolvedor está saindo".

As horas de manutenção entram na coluna mensal do Passo 7. Não numa conversa futura.

### Passo 10 — Dar o veredito, e só então abrir a pasta

**Não vale a pena** quando qualquer uma destas for verdade: o custo mensal supera o que a rotina
manual custa hoje; o problema não tem número de quanto para quanto; ninguém mantém o sistema
depois e ele precisa de visita mensal para continuar de pé; ou o teto de prazo não comporta nem a
fatia mínima. Nesse caso, responda na conversa, diga qual das quatro travou, e ofereça o caminho
mais barato que resolve o mesmo problema. Não crie pasta nenhuma.

**Vale a pena:** aí sim, escreva `sistemas/<nome>/ESCOPO.md` com o problema em uma frase, quem
usa separado de quem paga, a fatia mínima, a lista ordenada, a lista do que NÃO entra, a decisão
site ou aplicativo, os critérios de aceite, a tabela de custo conferida, o teto de prazo e o nome
de quem mantém. Mostre ao dono e peça que ele aponte um item para cortar. Se ele não cortar nada,
a lista ainda não está longa o bastante para ser real.

Com o arquivo aceito, passe a bola: o `/quebrar` transforma a lista em entregas pequenas e
ordenadas (`ENTREGAS.md`), e o `/backend` escolhe a stack, desenha os dados e constrói uma por uma.

---

## Conferir antes de entregar (obrigatório)

O Contex OS não estima número, calcula. Aqui os números são três: a soma das colunas de custo, a
multiplicação por doze e a data do teto de prazo.

```bash
# a soma bate com o total, e "12× R$ 160 = R$ 1.920" está certo
node scripts/verificar.js tabela sistemas/<nome>/ESCOPO.md

# se o arquivo cita dia da semana junto com data
node scripts/verificar.js datas sistemas/<nome>/ESCOPO.md

# o texto que vai pro dono não pode soar de máquina
node scripts/verificar.js texto sistemas/<nome>/ESCOPO.md
```

Se a soma divergir, refaça a conta a partir da fatura. Nunca ajuste o número para bater.

---

## Regras

- **A lista do que NÃO entra é obrigatória e nunca sai vazia.** Escopo sem recusa escrita é uma conversa que vai ser repetida
- Critério de aceite com adjetivo não passa: entrada e resultado esperado, com número, ou o item volta para quem pediu
- **Nunca prometa prazo.** O teto é do dono, e a pergunta é o que cabe dentro dele. Estimativa em horas vira cobrança
- Cada linha de custo aponta para uma fatura, um contrato ou um painel. O que não tiver origem vai como `[a confirmar]` visível
- **Rode `node scripts/verificar.js tabela` antes de mostrar a conta.** Sempre, inclusive na tabela que vai dentro de uma proposta
- Quem corta é o dono. Mostre as duas listas e deixe ele escolher; escolher por ele e avisar depois é outra coisa
- **A pasta `sistemas/<nome>/` só nasce com o veredito "vale a pena".** "Não vale" se responde na conversa, sem arquivo e sem pasta
- **Dúvida sobre o que a pessoa entende é `/prototipo`, não discussão.** "O cliente vai entender que o pedido só fica confirmado depois de pagar?" não se resolve em reunião entre duas pessoas que já sabem como funciona: sai um HTML pra ela clicar, e a decisão volta escrita pro `ESCOPO.md`
- **Esta skill não escreve código.** Não cria tabela, não escolhe framework, não sobe nada para lugar nenhum. Aprovado o escopo, o trabalho é do `/backend`
- Lista de recursos do aparelho vazia significa site. Aplicativo entra com a lista escrita e com as contas anuais da loja dentro da coluna mensal
