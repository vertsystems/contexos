---
name: pessoa
description: >
  Mantém uma ficha por pessoa que importa pro negócio (cliente com pasta, fornecedor,
  parceiro, jornalista, quem indica) em `pessoas/<slug>.md`: papel, como chegou, o que
  importa pra ela, último contato, próximo passo e as promessas dos dois lados. Gera por
  script o índice com quem ficou no vácuo, o que está atrasado e os aniversários e
  renovações próximos, pra não reexplicar ninguém a cada sessão.
  Use quando o usuário disser "anota que a Carla prefere", "quem eu deixei sem resposta",
  "faz tempo que não falo com o fornecedor", "o que eu combinei com o João", "cria a ficha
  do cliente", "salva o contato dessa jornalista", "quem eu prometi alguma coisa e não
  entreguei", "quem faz aniversário esse mês", "o contrato de quem vence agora", "ele pediu
  pra não receber mais mensagem", ou /pessoa.
---

# /pessoa — Quem eu deixei no vácuo

> **Convenção de pastas:** a ficha vai em `pessoas/<slug>.md` e o índice em `pessoas/indice.md`. Na convenção **por cliente**, `pessoas/` também fica na raiz, uma pasta só, porque a conta de "quem está sem resposta" só funciona com todo mundo no mesmo lugar; o campo `empresa` da ficha aponta pra `clientes/<Nome>/`. A pasta nasce na primeira ficha.

Toda sessão começa do zero pra quem não tem ficha. O usuário explica de novo que a Carla
odeia reunião longa, que o João ficou de mandar as fotos, que o Pedro pediu orçamento há
três semanas e sumiu. O assistente escreve a mensagem certa e no dia seguinte esqueceu.
Pior: ninguém somou os dias. "Faz uns dias que não falo com ela" era 24. A promessa "te
mando até sexta" venceu duas sextas atrás. A ficha guarda o que só o dono sabe, e o
script faz a conta que ninguém faz de cabeça: quem está esperando você.

## Dependências

- **Contexto:** `_memoria/empresa.md` (quem são os clientes, fornecedores e parceiros que já aparecem lá) e `_memoria/preferencias.md` (o tom da mensagem que sai pra pessoa)
- **De onde a pessoa vem:** a ata em `reunioes/`, a conversa do `/whatsapp`, a lista do `/prospeccao`, o `imprensa/contatos.md` do `/imprensa`, o arquivo do `/parcerias`
- **Molde:** `templates/operacao/pessoa.md`: os campos e o que cada um significa, o ritmo por papel, o formato da promessa, como o índice decide "vácuo", a migração dos três arquivos antigos e a LGPD com fonte e data
- **Script:** `scripts/pessoas.js` (`nova`, `contato`, `indice`, `vacuo`, `conferir`). Usa `scripts/br.js` pra data, dia da semana e slug
- **Conferência:** `node scripts/verificar.js datas` e `tabela` no índice
- **Pipeline:** `tarefas.md`: o próximo passo com data entra lá também
- **Saída:** `pessoas/<slug>.md` (uma por pessoa, slug do nome: `carla-mendes.md`) e `pessoas/indice.md` (gerado, nunca editado à mão)
- **Saída secundária:** `vendas/prospeccao/nao-contatar.md`, uma linha acrescentada pelo `contato <slug> --nao-contatar`. É o arquivo que o `/prospeccao`, o `/cadastro-clientes` e o `/whatsapp` leem antes de montar qualquer lista

---

## Workflow

### Passo 1 — Reconhecer a pessoa

A skill entra de três jeitos, e o primeiro trabalho é saber qual:

| Como chegou | O que fazer |
|---|---|
| **Um nome** ("anota que a Carla...", "o que eu combinei com o João") | `ls pessoas/` e procurar o slug. Existe: é atualização (Passo 3). Não existe: é ficha nova (Passo 2) |
| **Um contato que surgiu em outra skill** (ata do `/reuniao`, resposta na `/prospeccao`, jornalista da `/imprensa`, parceiro do `/parcerias`) | perguntar uma vez: "Quer que eu crie a ficha da <Nome>? Ela tem cara de <papel>." Sem "sim", não cria |
| **A pergunta de balanço** ("quem eu deixei sem resposta", "quem faz aniversário") | direto pro Passo 4, sem perguntar nada |

Nome parecido não é a mesma pessoa. "Ana" com duas fichas (`ana-souza.md`, `ana-lima.md`)
pede a pergunta "qual Ana?", nunca o palpite. Se `_memoria/empresa.md` já cita a pessoa
(cliente atual, contador, fornecedor), o que está lá vale como "Quem é" e não se pergunta
de novo.

### Passo 2 — Criar a ficha

Uma pergunta por vez, na ordem, parando quando o usuário disser "só isso":

1. "Qual é o papel dela pra você: cliente, prospect, parceiro, fornecedor, jornalista, quem indica, equipe?"
2. "Como ela chegou até você?" (indicação de quem, reunião de que dia, respondeu qual pauta)
3. "Onde ela responde de verdade: WhatsApp ou e-mail? Me passa o contato."
4. "O que pesa pra ela decidir? Uma coisa que você já sabe." (prazo, preço, formato, horário)
5. "Quando foi a última conversa real com ela?"
6. "Tem alguma coisa combinada em aberto? Você deve algo a ela, ou ela a você?"

Da resposta 1 sai `--papel` e a base legal quase sempre junto. Cliente, fornecedor e
parceiro com acordo são `contrato`; o prospect que pediu orçamento também, porque a lei
chama isso de procedimento preliminar de contrato pedido pelo próprio titular (art. 7º,
V). Jornalista com contato público e quem indica são `legitimo-interesse`; quem só
autorizou receber novidade é `consentimento`. Se não encaixa em nenhuma, a ficha nasce com
`base_legal` vazia e o `conferir` vai acusar até o usuário decidir: é o sinal de que talvez
essa pessoa não devesse ter ficha.

Base legal vazia é pergunta, não palpite.

Criar por comando, nunca colando um arquivo escrito à mão: o script garante o slug e os
campos que o índice lê.

```bash
node scripts/pessoas.js nova "Carla Mendes" --papel cliente --empresa "Padaria Pão Quente" \
  --canal "whatsapp +5513997287738" --como-chegou "indicação da Ana, 2026-03" \
  --importa "prazo cumprido; odeia reunião longa" \
  --base-legal contrato --data 18/09/2026 --aniversario 05/10
```

`--data` é a última conversa real (resposta 5); sem ela, o script usa hoje, e hoje só é
verdade se a conversa foi hoje. Data no futuro é recusada. Aniversário vai sem ano.
Renovação de contrato ou plano entra em `--renovacao AAAA-MM-DD` quando o usuário souber,
e `--ritmo <dias>` quando essa relação pede um intervalo diferente do padrão do papel
(contrato mensal pede 7; projeto entregue pede 60). Formato errado o script recusa na
hora. Gravar torto é deixar o índice errar depois.

O que ficou combinado na resposta 6 entra em outro comando, o mesmo que vai registrar
todos os contatos daí em diante. `--ate` exige `--proximo`: data sem ação escrita não vira
nada no índice.

```bash
node scripts/pessoas.js contato carla-mendes \
  --resumo "reunião de alinhamento do site" --data 18/09/2026 --canal whatsapp \
  --fonte reunioes/2026-09-18-padaria-site.md \
  --prometi "enviar o orçamento do site até 25/09/2026" \
  --prometeu "mandar as fotos do cardápio até 23/09/2026" \
  --proximo "enviar orçamento do site" --ate 25/09/2026
```

Aí o frontmatter já está inteiro, e o que sobra pra escrever à mão são as duas seções do
corpo que o script deixa em branco, com o que veio da conversa e nada além:

```markdown
---
nome: Carla Mendes
papel: cliente
empresa: Padaria Pão Quente
como_chegou: indicação da Ana, 2026-03
canal: whatsapp +5513997287738
o_que_importa: prazo cumprido; odeia reunião longa
ultimo_contato: 2026-09-18
ritmo_dias:
proximo_passo: enviar orçamento do site
proximo_passo_ate: 2026-09-25
eu_prometi:
  - enviar o orçamento do site até 25/09/2026
me_prometeu:
  - mandar as fotos do cardápio até 23/09/2026
aniversario: 05/10
renovacao:
base_legal: contrato
nao_contatar:
---

# Carla Mendes

## Quem é

Dona da padaria no centro. Decide rápido, paga adiantado, responde de manhã.

## O que não reexplicar

- Não quer blog no site: decidiu em 18/09, não voltar no assunto
- Reunião de 20 minutos, no máximo. Prefere áudio a call
- O sócio é o marido, Rui; ele cuida do dinheiro

## Histórico

| Data | Canal | O que aconteceu | Fonte |
|---|---|---|---|
| 18/09/2026 | whatsapp | reunião de alinhamento do site | reunioes/2026-09-18-padaria-site.md |

---

Base legal (LGPD, Lei 13.709/2018, art. 7º): `contrato`. Guarda só o que a relação precisa. Se pedir pra sair, `nao_contatar: sim` no mesmo dia; se pedir pra apagar, o arquivo sai.
```

A promessa com prazo leva "até DD/MM/AAAA" dentro do texto, com o ano: é isso que o
script lê. Sem data, fica como lembrete e não entra na conta de vácuo. Com "até 28/12" e
sem ano, o `conferir` acusa, porque na virada do ano a conta erra o lado. O molde tem o
formato.

### Passo 3 — Registrar cada contato

A ficha só vale se a data de último contato for verdade. Cada conversa real (reunião,
áudio respondido, e-mail com resposta) entra por comando, que atualiza `ultimo_contato`
e acrescenta a linha do histórico de uma vez:

```bash
node scripts/pessoas.js contato carla-mendes --resumo "mandei o orçamento, ela pediu parcelar em 3" \
  --data 22/09/2026 --canal whatsapp --fonte vendas/pos-venda/orcamento-2026-09-22.md \
  --cumpri "orçamento" --proximo "cobrar resposta" --ate 29/09/2026
```

`--cumpri` tira a promessa sua da lista pelo trecho; `--cumpriu`, a dela. `--prometi` e
`--prometeu` acrescentam. `--data` no futuro é recusada: contato se registra depois que
aconteceu. "Curti o story" não é contato; "ela respondeu" é.

`--cumpri` sozinho, sem `--resumo`, deixa linha no histórico e **não** move
`ultimo_contato`: mandar o orçamento é entrega, não conversa. A data só anda com
`--resumo`, que é a frase do que a pessoa disse do outro lado. No exemplo acima os dois
vêm juntos porque ela respondeu na mesma hora.

Quando a ata do `/reuniao` nasce com a pessoa presente, o registro é a mesma linha, com a
ata como `--fonte` e as promessas que a ata chama de tarefa e pendência. Quando o
`/whatsapp` ou o `/email-profissional` escreve pra alguém com ficha, ler a seção "O que
não reexplicar" antes de escrever, e registrar o contato só quando a pessoa responder.

O que a pessoa contou de novo vai pra "O que não reexplicar" na mesma sessão. Item que
virou regra ("sempre de manhã") sobe pro `o_que_importa`.

### Passo 4 — Gerar o índice e ler quem está no vácuo

```bash
node scripts/pessoas.js indice
node scripts/verificar.js datas pessoas/indice.md
node scripts/verificar.js tabela pessoas/indice.md
```

O índice sai neste formato, sempre regenerado inteiro. Abaixo, o recorte de um workspace com doze fichas (em "Todo mundo" entram todas, uma por linha):

```markdown
# Pessoas — índice

> Gerado por `node scripts/pessoas.js indice` em 22/09/2026 (ter). Não editar aqui: editar a ficha em `pessoas/<slug>.md` e rodar de novo.

Fichas lidas: 12. No vácuo: 3. Esperando resposta deles: 1. Datas nos próximos 30 dias: 1. Pediram pra não receber: 1.

## No vácuo

| Pessoa | Papel | Dias sem contato | Por quê | O que fazer |
|---|---|---|---|---|
| [Marcos Reis](marcos-reis.md) | cliente | 21 | prometi "enviar o orçamento até 05/09/2026" e passou há 17 dia(s) | cumprir ou avisar a nova data hoje |
| [Pedro Lima](pedro-lima.md) | prospect | 12 | próximo passo "ligar pra fechar" venceu em 18/09/2026 (sex) | ligar pra fechar |
| [João Batista Ltda](joao-batista-ltda.md) | fornecedor | 113 | 113 dias sem contato (ritmo de fornecedor: 90) | mandar uma mensagem com motivo concreto |

## Esperando resposta deles

| Pessoa | Prometeu | Até | Situação |
|---|---|---|---|
| [Carla Mendes](carla-mendes.md) | mandar as fotos do cardápio até 23/09/2026 | 23/09/2026 | faltam 1 dia(s) |

## Nos próximos 30 dias

| Data | Pessoa | O quê |
|---|---|---|
| 05/10/2026 (seg) | [Carla Mendes](carla-mendes.md) | aniversário |

## Todo mundo

Ordenado por quem está há mais tempo sem contato.

| Pessoa | Papel | Empresa | Último contato | Dias | Próximo passo |
|---|---|---|---|---|---|
| [João Batista Ltda](joao-batista-ltda.md) | fornecedor | Distribuidora Batista | 01/06/2026 | 113 |  |
| [Carla Mendes](carla-mendes.md) | cliente | Padaria Pão Quente | 22/09/2026 | 0 | cobrar resposta (até 29/09/2026) |

## Pediram pra não receber

Ficam fora de qualquer lista, transmissão ou sequência. Quem lê `vendas/prospeccao/nao-contatar.md` encontra os mesmos nomes lá.

- [Rui Alves](rui-alves.md) · whatsapp +5513991112222

## Fichas com problema

- `bia-fotografa.md`: sem `base_legal` (a ficha guarda dado pessoal; ver templates/operacao/pessoa.md)
```

Seção vazia não vira tabela vazia. Sai a frase: "Ninguém. Toda promessa cumprida e todo
mundo dentro do ritmo." É o que o usuário precisa ler numa segunda de manhã. O resumo do
topo conta as fichas que entraram na conta, e arquivo sem frontmatter aparece separado, em
"Fichas com problema".

Na conversa, entregar só a primeira seção, na ordem em que o script pôs: primeiro quem
espera algo que você prometeu, depois o próximo passo vencido, depois o silêncio longo.
Pra cada linha, uma frase do que fazer hoje, e a mensagem pronta se o usuário pedir (na
voz de `preferencias.md`, lendo "O que não reexplicar" antes). Promessa vencida não se
pede desculpa em três parágrafos. Pro Marcos da tabela acima, dezessete dias depois do
prazo que você mesmo deu, a mensagem é do tamanho disto:

> Marcos, o orçamento ficou pra trás aqui e a culpa é minha. Te mando hoje até as 16h. Se
> mudou alguma coisa no que a gente combinou, me fala agora que eu já ajusto.

Sem "peço desculpas pelo transtorno", sem explicar a semana corrida. Uma linha de
reconhecimento, uma data nova e uma pergunta que serve pra ele.

Quem está em "Esperando resposta deles" com atraso recebe a cobrança com jeito do
`/pos-venda`. Aniversário e renovação da janela entram em `tarefas.md` com a data; o
próximo passo vencido também, se ainda não estava lá.

Pra olhar sem gerar arquivo (no meio de uma sessão, antes de escrever pra alguém):

```bash
node scripts/pessoas.js vacuo
```

### Passo 5 — Absorver os contatos que já existiam

Na primeira rodada num workspace que já tem trabalho, procurar os três lugares onde
contato vivia antes e migrar com o usuário confirmando nome a nome, nunca em lote:

- **`imprensa/contatos.md`**: cada jornalista vira ficha com `papel: jornalista`, as últimas pautas dela em "O que não reexplicar" e cada envio como linha do histórico. O arquivo antigo fica com uma linha só: "os contatos moram em `pessoas/`, filtro `papel: jornalista`"
- **`vendas/prospeccao/nao-contatar.md`**: quem está lá e tem ficha recebe `nao_contatar: sim`. O arquivo continua existindo, porque o `/prospeccao`, o `/cadastro-clientes` e o `/whatsapp` leem dele; a partir daqui é o script que escreve nele quando alguém pede pra sair (`contato <slug> --nao-contatar`)
- **"Cliente parado" do `/pos-venda`**: quem tem pasta ou histórico de trabalho ganha ficha com `papel: cliente` e `ultimo_contato` real. Daí em diante o `/pos-venda` lê a seção "No vácuo" filtrada por cliente; a base em massa continua no `dados/clientes.csv` do `/cadastro-clientes`

Nome a nome, a migração é um `nova` com o que o arquivo antigo já tinha, seguido de um
`contato` por envio que estava registrado lá:

```bash
node scripts/pessoas.js nova "Lívia Prado" --papel jornalista --empresa "Jornal da Cidade" \
  --canal "email livia@jornaldacidade.com.br" --como-chegou "publicou a nota do aniversário da loja" \
  --importa "pauta com número local; fecha edição na quinta" \
  --base-legal legitimo-interesse --data 12/06/2026
node scripts/pessoas.js contato livia-prado --resumo "publicou a nota de 3 parágrafos" \
  --data 12/06/2026 --canal email --fonte imprensa/contatos.md
```

Cada rodada de migração termina com `node scripts/pessoas.js conferir`, que acusa a ficha
que nasceu sem `base_legal` ou sem data. Quem pediu pra não receber e não tem ficha não
ganha uma: fica só na lista.

### Passo 6 — Manter

- **Toda reunião, proposta enviada e resposta recebida** passa pelo `contato`. É um comando; sem ele, o índice mente
- **Segunda de manhã**, o `/revisao-semanal` lê `pessoas/indice.md` e a seção "No vácuo" vira a primeira lista da semana. O `/rotina` pode agendar o `indice` pra rodar antes
- **Uma vez por mês**, `node scripts/pessoas.js conferir`: ficha sem `ultimo_contato`, sem `base_legal` ou com data que não existe aparece ali, e cada uma é uma decisão do usuário (completar ou apagar)
- **Ficha parada há um ano** sem promessa, sem renovação e sem contato é candidata a sair. Dado que não serve mais não se guarda; perguntar uma vez

---

## Regras

- **Nunca inventar o que a pessoa disse.** "O que não reexplicar" só recebe o que o usuário contou ou o que está na ata. Preferência deduzida do tom de uma mensagem não entra; vira pergunta ("ela te pareceu com pressa, é sempre assim?")
- **Data é calculada, nunca lembrada.** "Dias sem contato", "atrasado há", "venceu em" saem do script; se o usuário diz "faz uns dez dias" e a ficha diz 24, vale a ficha, e a conversa corrige a ficha se ela estiver errada, não o contrário
- **Registrar contato só quando houve contato.** Mensagem enviada sem resposta não atualiza `ultimo_contato`; vai pra `proximo_passo` ("cobrar resposta") com data. Senão o índice esconde exatamente quem está no vácuo
- **Promessa sem data não é prazo.** O script só conta o que tem "até DD/MM/AAAA". Prazo que a pessoa não disse se combina na próxima conversa, não se inventa na ficha
- **Uma ficha por pessoa, poucas fichas.** Se a lista passa de umas cinquenta, é base em massa e o lugar é o `/cadastro-clientes`. Aqui é quem tem relação: nome, histórico e promessa. Homônimo é pergunta, nunca mescla
- **O índice não se edita.** Toda mudança vai na ficha e o `indice` roda de novo. Linha corrigida à mão some na próxima rodada
- **Mínimo necessário (LGPD).** Um canal, não três. Aniversário sem ano. Nada de CPF, endereço, documento: isso mora no `/contrato` ou no `dados/clientes.csv`. Dado sensível como a lei define (saúde, vida sexual, convicção religiosa, opinião política, sindicato, origem racial ou étnica, dado genético ou biométrico) nunca entra, nem em "O que não reexplicar": "está em tratamento, não cobrar" vira "pediu pra pausar a cobrança até novembro"
- **"Não me manda mais nada" é o mesmo dia.** `contato <slug> --nao-contatar` marca a ficha e escreve na lista que as outras skills leem. Não se discute nem se pede motivo, e o artigo da LGPD (Lei 13.709/2018) muda com a `base_legal` da ficha: em `consentimento`, é revogação a qualquer momento, por procedimento gratuito e facilitado (art. 8º, § 5º, e art. 18, IX); em `legitimo-interesse`, é oposição (art. 18, § 2º) somada ao pedido de eliminação de dado que virou excessivo (art. 18, IV). A prática é a mesma nos dois casos: para de mandar hoje. Texto compilado em https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm, conferido em 23/09/2026
- **"O que você tem sobre mim" se responde mostrando a ficha.** É confirmação de tratamento e acesso (art. 18, I e II): a ficha inteira cabe numa tela e foi escrita pra ser lida pela própria pessoa. "Apaga o que você tem sobre mim" é o arquivo fora da pasta, ficando só o canal e a data na lista de não contatar, pra não recadastrar sem querer. A renovação de contrato continua aparecendo no índice mesmo pra quem pediu pra não receber mensagem: conversa de contrato não é divulgação
- **Fronteira com as vizinhas:** o `/cadastro-clientes` é a base em massa num CSV (300 pacientes, telefone validado, deduplicação); o `/prospeccao` é a lista pontuada de quem ainda não respondeu, e a pessoa que respondeu com interesse é que ganha ficha aqui; o `/reuniao` produz a ata que vira linha do histórico; o `/pos-venda` escreve a mensagem de reativação e de cobrança com jeito pra quem o índice apontou; o `/tarefas` guarda a data do próximo passo; a `/biblioteca` guarda o depoimento que a pessoa deu, não a pessoa; o `/imprensa` e o `/parcerias` continuam donos da pauta e da proposta, e leem daqui quem é a pessoa. Esta skill é a ficha e a conta de dias, nada além
- **Não substitui advogado.** A tabela de base legal do molde é o mínimo pra não guardar dado sem motivo. Pedido de titular que vá além de sair ou apagar, incidente e dado de menor passam por advogado antes de virar ação. Dizer isso uma vez, na primeira ficha, sem sermão
- **Quando a lista for ruim, dizer a lista.** "Sete pessoas esperando algo que você prometeu, a mais antiga há 41 dias" é a frase, com o número do script, sem suavizar: é o que define o que o usuário faz hoje de manhã
