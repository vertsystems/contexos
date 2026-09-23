# Briefing de conversa — a página que se lê antes de falar com o cliente

Referência do `/briefing-reuniao`. Consultada também pelo `/reuniao` quando a ata
precisa dizer o que a próxima conversa vai cobrar, e pelo `/pessoa` quando a ficha
de alguém recebe o que a conversa ensinou.

Quem tem cliente recorrente fala com ele toda semana e chega na conversa lembrando
de metade. Promete de novo o que já prometeu, esquece o que ele ficou de mandar, e
descobre no meio da call que a parcela de setembro está aberta. A página de
briefing existe pra que os cinco minutos antes da conversa sejam de leitura, não de
busca. Ela cabe numa tela do celular, e tudo nela aponta o arquivo de onde saiu.

---

## O que a página responde, e em que ordem

| Seção | A pergunta que ela responde | De onde vem |
|---|---|---|
| **Cabeçalho** | Faz quanto tempo, quanto está vencido, quanto dinheiro tem na mesa | `scripts/briefing-reuniao.js` (conta) |
| **Em uma frase** | Por que essa conversa existe | quem pediu a conversa, e o que ele disse ao pedir |
| **O que eu prometi e ainda não entreguei** | Com o que ele vai começar a conversa, se for esperto | `tarefas.md` (Agora, Depois) e a coluna "Quem" da última ata |
| **O que ele deve** | O que trava o trabalho e está do lado dele | `tarefas.md` (Esperando resposta), pendências da ata, parcelas do `/cobranca` |
| **Valor em jogo** | Quanto custa essa relação azedar | proposta, contrato, cobrança, acordo fora de arquivo |
| **O que ele espera ouvir hoje** | A resposta que ele quer, mesmo que não vá gostar | o pedido dele na ata, a proposta pendente, o que ficou de ser respondido |
| **O que não repetir** | O que já foi dito, prometido ou recusado | atas anteriores, ficha da pessoa, mensagens |
| **Três perguntas** | O que descobrir hoje que muda o trabalho | o método abaixo |
| **Meta da conversa** | Com o que sair da conversa, em uma frase com data | o que falta pra avançar |

A ordem é a ordem em que ele vai cobrar. Cliente que chega na reunião abre com o que
você deve a ele, não com o que ele deve a você. Por isso "o que eu prometi" vem antes
de "o que ele deve": o usuário precisa ter a resposta pronta pra primeira frase.

O `Pre-Meeting Context` do repositório de skills não-código de Kotrotsos descreve o
mesmo desenho, em três partes: histórico da relação, itens abertos, pontos de
conversa, numa página só (github.com/Kotrotsos/claude-skills-non-coding, lido em
22/09/2026). A diferença aqui é que a página não sai do e-mail nem da agenda: sai
dos arquivos que o próprio sistema gerou, e a conta é feita por comando.

---

## O que conta como "prometido"

Tudo que o usuário disse que faria, com ou sem data, e que não está marcado como
feito. Três fontes, nessa ordem de confiança:

1. **Item aberto em `tarefas.md`** que cita o cliente. É a fonte viva: se o usuário
   fechou a tarefa, ela está em "Feito" e não entra
2. **Linha da tabela "Tarefas" da última ata** com o usuário na coluna "Quem". Pode já
   ter sido feita sem ninguém fechar em `tarefas.md`; por isso a página marca a origem
   e o usuário confirma antes de a linha virar pauta
3. **Mensagem do `/pos-venda` ou do `/whatsapp`** com promessa ("te mando até sexta").
   Não entra por script; entra quando o usuário lembra ou o assistente lê a pasta

O que **não** conta: ideia solta ("seria legal fazer um blog"), tarefa de terceiro,
o que o contrato prevê pra fase seguinte. Prometido é o que ele pode cobrar hoje.

Promessa vencida vai no topo e em negrito. Não é pra constranger o usuário: é pra
ele decidir, antes da conversa, se entrega antes de falar, se pede prazo novo ou se
avisa que não vai dar. Qualquer uma das três é melhor que ser lembrado pelo cliente.

---

## O que conta como "ele deve"

Três tipos, e a página diz qual é cada um:

- **Resposta**: aprovação, decisão, "vou ver com o sócio". Vem de "Esperando
  resposta" em `tarefas.md` e das pendências da ata
- **Insumo**: foto, acesso, texto, senha, logo. Sem ele o prazo não corre, e o
  `/contrato` costuma dizer que o prazo é suspenso. É o item mais valioso da lista:
  é o que transforma "vocês estão atrasados" em "estamos esperando o acesso desde
  o dia 7"
- **Dinheiro**: parcela em aberto na cobrança mais recente do `/cobranca`, com o
  valor corrigido. Entra na página, mas a cobrança em si é conversa do `/cobranca`,
  não desta

Item dele que venceu também vai em negrito. Serve pra abrir a conversa com a data:
"o acesso ficou de vir dia 7, chegou?" tem outro peso que "cadê o acesso?".

Dentro de cada lista a ordem é: vencido primeiro, do mais velho pro mais novo, e o
sem data no fim. É a ordem em que o assunto vai aparecer na conversa.

---

## Quando o nome na ata não é nem seu nem dele

A coluna "Quem" da ata guarda nomes soltos: "Equipe", "Maria", "o contador do
cliente". Três destinos possíveis, e a página não adivinha entre eles:

- **É o usuário** — vai pra "o que eu prometi"
- **É o cliente, ou a pessoa de contato dele** — vai pra "o que ele deve". Reconhece-se
  pela ficha do `/pessoa` com `empresa:` apontando pro cliente, ou pela linha
  `**Com:**` da ata, onde o molde do `/reuniao` pede a empresa ao lado do nome:
  "Carla Mendes (Acme)"
- **É outra pessoa** (equipe, sócio, fornecedor, o contador dele) — fica numa seção à
  parte, "Tarefas da ata com outro nome", e o usuário confirma antes da conversa

Chutar aqui é o erro mais caro da página. Pedir ao cliente o que a sua própria
equipe deve queima a reunião inteira, e o cliente não corrige em voz alta: ele
anota. Quando a pessoa é do lado dele, abrir a ficha pelo `/pessoa` com `empresa:`
preenchida acaba com a dúvida em todos os briefings seguintes.

---

## Valor em jogo: o que soma e o que não soma

| Entra | Não entra |
|---|---|
| Contrato assinado: o valor total do documento | Faturamento do cliente dito de passagem na ata |
| Proposta enviada e sem contrato: o valor proposto | Proposta que ele recusou |
| Proposta nova depois do contrato (aditivo, fase 2) | O que o usuário "pretende" propor |
| Parcelas em aberto, corrigidas pelo `/cobranca` | Parcela a vencer que não atrasou |
| Acordo fora de arquivo, informado com `--valor` e rótulo | Estimativa de "quanto ele vale por ano" |

O script escolhe o valor de cada documento pela palavra ao lado ("total",
"investimento", "valor do contrato"). Quando não acha palavra, pega o maior R$ do
arquivo e marca "confirmar". Nesses casos o assistente abre o arquivo, lê o trecho e
confirma com o usuário antes de deixar o número na página. Valor errado no briefing
vira valor errado na conversa.

O total é uma linha só, com a tabela de origem em cima. Ele responde a uma pergunta:
quanto custa essa conversa dar errado. É o número que decide se o usuário cede no
prazo ou segura.

---

## O que ele espera ouvir hoje

A seção que separa briefing útil de lista de pendências. Cliente marca conversa por
um motivo, e o motivo quase sempre está escrito em algum lugar:

- Na ata anterior, em "Próxima reunião" ("aprovação da home") ou em "Vira o quê"
  ("pediu proposta com as três páginas")
- Na proposta sem resposta: ele quer saber se dá pra parcelar, ou se cabe no prazo
- Na pendência que destrava com o usuário: ele espera a resposta
- Na mensagem que motivou a conversa: "precisamos falar sobre o prazo" é um pedido
  claro de data nova

Escrever em uma ou duas linhas, na forma "ele quer saber se X" ou "ele espera que
eu diga Y". Se a resposta é não, a página diz que é não, e a meta da conversa passa
a ser dizer o não com alternativa.

---

## O que não repetir

Três coisas que fazem o cliente sentir que ninguém do outro lado presta atenção:

1. **Pergunta já respondida.** Ele já disse que o domínio fica; perguntar de novo é
   dizer que a ata não foi lida. Vem das decisões das atas anteriores
2. **Promessa que já falhou.** Se "te mando na sexta" já falhou uma vez, a página
   avisa: prometer a mesma coisa com a mesma frase é pedir pra não ser acreditado.
   O conserto é prazo com folga e entrega antes
3. **O que ele disse que não quer.** Blog, vídeo, reunião presencial, WhatsApp fora
   do horário. Vem da ficha do `/pessoa` quando existe, e das atas quando não

Também entra aqui o assunto que ele pediu pra não registrar. Ele não aparece na
página; aparece só a linha "não tocar no assunto X".

---

## As três perguntas

Toda conversa com cliente ativo merece três perguntas preparadas. Uma de cada tipo:

| Tipo | O que descobre | Exemplo |
|---|---|---|
| **Avanço** | O que falta pra próxima etapa acontecer | "O que você precisa ver na home pra aprovar?" |
| **Risco** | O que pode fazer o trabalho azedar e ainda não foi dito | "Tem alguém mais que precisa aprovar antes de ir ao ar?" |
| **Expansão** | O que ele precisa e ainda não pediu | "O blog que ficou pra outubro ainda faz sentido?" |

A ordem importa: avanço primeiro, porque é o que a conversa precisa produzir. Risco
no meio, quando já há confiança. Expansão por último e só se a conversa correu bem;
oferecer coisa nova pra cliente com pendência vencida do seu lado é o pior momento.

Pergunta boa cabe numa frase, tem resposta que muda o trabalho e não pode ser
respondida com "sim" sem nada depois. "Está tudo bem?" não é pergunta de briefing.

---

## Meta da conversa

Uma frase, com verbo e data: "sair com a home aprovada e o acesso ao domínio
combinado pra quinta 24/09". Se a meta tiver duas partes, são duas frases. Meta sem
data vira "conversamos bastante". Meta com data vira item em `tarefas.md` no fim do
dia, pelo `/reuniao`.

Quando o objetivo da conversa é vender (primeira conversa, cliente que ainda não
fechou, cliente antigo que voltou com pedido novo), a meta é do `/vender`, e o
briefing aponta pra lá em vez de tentar substituir o roteiro.

---

## O que muda com o tipo de conversa

| Conversa | O que a página enfatiza | O que sai |
|---|---|---|
| **Reunião marcada** (presencial ou vídeo) | Tudo. É a única que comporta as três perguntas | nada |
| **Call rápida** | Cabeçalho, o que ele espera ouvir e a meta. Uma pergunta, a de avanço | expansão |
| **WhatsApp** | O que eu prometi (ele vai cobrar por escrito) e o que ele deve, com data | as três perguntas viram uma, se couber |
| **Visita** (na loja, no consultório, na obra) | O que ele deve (insumo) e o que não repetir. Visita é onde se ouve, não onde se cobra | valor em jogo, que não se discute em pé |
| **Balcão / ele apareceu** | Só o cabeçalho, lido em dez segundos | o resto |

Conversa por WhatsApp merece o briefing tanto quanto a reunião: é onde a promessa
fica registrada com hora, e onde o usuário mais responde de memória.

---

## Notícia do cliente: opcional, e só com fonte

Cliente que é empresa às vezes aparece na imprensa, abre loja nova, muda de sócio.
Isso pode entrar na página numa linha, com a URL e a data em que foi lida. Cliente
que é padaria, clínica ou pessoa não tem notícia, e procurar é perda de tempo. Por
isso a busca é opcional: o usuário pede, o assistente procura, e o que não tem fonte
não entra. Fofoca de rede social não é notícia.

---

## Depois da conversa

O briefing é descartável: vale até a conversa acontecer. Tudo que ela produziu vai
pra ata (`/reuniao`), pro pipeline (`/tarefas`) e pra ficha da pessoa (`/pessoa`),
não pro briefing. Na pasta, o arquivo fica como registro de com o que o usuário
entrou na sala, e o próximo briefing lê a ata, não ele.

---

## Dado pessoal

A página junta, numa tela, tudo que o sistema sabe de uma pessoa: o que ela deve, o
que disse, o que não quer. É dado pessoal no sentido da LGPD. Fica na pasta do
workspace, não vai pra ferramenta externa, e o que a pessoa pediu pra não registrar
não entra nem como pista. Se o usuário quiser mandar o briefing pra alguém da
equipe, a versão que sai tira a parte financeira e a seção "o que não repetir".
