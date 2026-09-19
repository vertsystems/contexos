---
name: reuniao
description: >
  Transforma reunião em ata curta, decisões com dono e prazo em data real, tarefas que entram
  no pipeline e pendências com quem destrava. Recebe gravação (áudio ou vídeo), transcrição
  pronta, link de vídeo ou anotação solta; transcreve por script quando houver chave, e diz o
  que da reunião com cliente vira proposta ou contrato.
  Use quando o usuário disser "gravei a reunião", "faz a ata", "o que ficou combinado",
  "transcreve esse áudio", "anota o que decidimos", "resume a call com o cliente",
  "quem ficou de fazer o quê", "tenho as anotações da reunião", "o que ficou pendente",
  ou /reuniao.
---

# /reuniao — A ata e o que ficou combinado

> **Convenção de pastas:** a ata vai em `reunioes/<AAAA-MM-DD>-<slug>.md`. Na convenção **por cliente**, reunião de cliente vai em `clientes/<Nome>/reunioes/`; reunião interna fica na raiz. A gravação e a transcrição ficam em `dados/`, que o git ignora. A pasta nasce na primeira ata.

Reunião sem ata vira duas memórias diferentes da mesma conversa. Uma semana depois, o
cliente lembra que "ficou de incluir o blog" e o usuário lembra que "o blog ficou pra
depois", e os dois têm razão, porque ninguém escreveu. A ata resolve isso no mesmo dia,
com o minuto da gravação ao lado de cada decisão, e joga as tarefas direto no pipeline
em vez de deixá-las na cabeça de quem estava na sala.

## Dependências

- **Contexto:** `_memoria/empresa.md` (quem é a equipe, quem são os clientes, o que está em andamento) e `_memoria/preferencias.md` (a ata que vai pro cliente sai na voz do usuário)
- **Pipeline:** `tarefas.md`, mantido pelo `/tarefas`. É pra lá que as tarefas vão
- **Molde:** `templates/operacao/reuniao.md`: os quatro baldes (decisão, tarefa, pendência, contexto), o que conta como decisão, tipos de reunião, onde a transcrição automática erra, confidencialidade
- **Script:** `scripts/transcrever.js` (gravação ou link vira `.txt` com minuto; `--ajuda` lista as opções), `scripts/verificar.js` (`datas`, `texto`)
- **Ferramenta opcional:** `yt-dlp` pra link do YouTube e `ffmpeg` pra gravação acima do limite da API ou vídeo (`templates/ferramentas/catalogo.md`)
- **Chave opcional:** `OPENAI_API_KEY` ou `GEMINI_API_KEY` no `.env`, uma das duas (com as duas, `TRANSCRICAO_PROVEDOR=gemini` fixa qual). Sem chave, a skill segue com a transcrição colada
- **Entrada:** a gravação vai em `dados/` (drop zone, fora do git). A transcrição nasce ao lado dela, `dados/<arquivo>.txt`
- **Saída:** `reunioes/<AAAA-MM-DD>-<slug>.md` (a data é a da reunião, não a de hoje) e, se o cliente pediu ata, `reunioes/<AAAA-MM-DD>-<slug>-cliente.md`

---

## Workflow

### Passo 1 — Receber a fonte e situar a reunião

A fonte chega de quatro jeitos, e cada um tem um caminho:

| Chegou | Caminho |
|---|---|
| Arquivo de áudio ou vídeo (mp3, m4a, wav, mp4, webm) em `dados/` | Passo 2, com aviso antes de transcrever |
| Transcrição pronta (do Meet, Zoom, Teams, ou colada) | Salvar em `dados/<slug>-transcricao.txt` e ir ao Passo 3 |
| Link de vídeo (YouTube) | Passo 2, via `yt-dlp` |
| Anotação solta, bullet, foto de caderno | Passo 3, com a marca "feita de anotação" na ata |

Foto de caderno ou de quadro: ler a imagem, transcrever os itens em texto e mostrar ao
usuário o que não deu pra ler ("a terceira linha ficou ilegível, o que era?"). Não completar
de cabeça.

Antes de qualquer coisa, situar. Se não estiver claro pelo nome do arquivo ou pela
conversa, perguntar **uma coisa só**:

> "Essa reunião foi com quem, e em que dia?"

Com a resposta vem quase tudo: se é cliente ou interna, se a pasta é `reunioes/` ou
`clientes/<Nome>/reunioes/`, e a data que vai no nome do arquivo. Se `_memoria/empresa.md`
já lista o cliente, não perguntar de novo o que já está lá.

O slug é `<cliente>-<assunto>` em minúsculas, sem acento, com hífen: `acme-kickoff`,
`interna-planejamento-outubro`. Nome de cliente escrito como ele escreve, não como a
transcrição grafou.

### Passo 2 — Transcrever, com o usuário sabendo pra onde o áudio vai

Gravação de reunião é dado pessoal de todo mundo que falou, e reunião com cliente carrega
número e estratégia dele. O áudio sai da máquina quando vai pra API. Por isso, antes de
rodar o script, uma mensagem só, sem rodeio:

> "Pra transcrever eu mando o áudio pra [OpenAI ou Gemini, conforme a chave que existir no
> `.env`]. Ele sai da sua máquina e vai pro servidor deles. Pode mandar? Se preferir, cola
> aqui a transcrição que o app da reunião gerou e eu sigo sem enviar nada."

Só depois do sim:

```bash
node scripts/transcrever.js "dados/reuniao-acme.m4a" --dica "Bruno, Carla, Acme, Dunamis"
```

A transcrição sai em `dados/reuniao-acme.txt`, ao lado da gravação. É de propósito:
`dados/` fica fora do git, então o `/salvar` não sobe a fala de ninguém pro GitHub. A ata,
que é o que se versiona, cita o minuto e o caminho do `.txt`.

A opção `--dica` leva os nomes próprios e termos do negócio: é o que faz "Dunamis" não
virar "do namis". Pegar de `_memoria/empresa.md` e do que o usuário disse.

O script decide sozinho o resto: detecta a chave, escolhe o provedor, converte vídeo em
áudio leve e corta em partes se tiver `ffmpeg` (gravação longa no Gemini também é cortada,
pra resposta não vir pela metade), e escreve o `.txt` com o minuto de cada trecho. Três
situações em que ele para e a skill responde:

- **Sem chave nenhuma:** o script explica as duas saídas. A skill pede a transcrição colada
  e segue pro Passo 3. Não insistir na chave: a maioria dos apps de reunião já gera
  transcrição de graça
- **Arquivo acima do limite sem `ffmpeg`:** o script sugere instalar, trocar de provedor ou
  exportar em partes. Repassar a sugestão e esperar
- **Link sem `yt-dlp`:** o script diz como instalar e como pegar a legenda no próprio
  YouTube. Repassar

Pra conferir o plano antes de gastar crédito, `--simular` mostra provedor, tamanho e
partes sem enviar nada.

### Passo 3 — Ler tudo e separar nos quatro baldes

Ler a transcrição inteira antes de escrever uma linha. Não é curadoria (isso é
`/reaproveitar`): é leitura pra achar o que passou a valer.

Cada trecho cai em um balde, conforme `templates/operacao/reuniao.md`:

- **Decisão** quando alguém fechou e ninguém contestou depois: "fechado", "combinado",
  "pode mandar o contrato", número dito e aceito
- **Tarefa** quando dá pra escrever "Fulano faz X até Y" sem inventar dono nem data
- **Pendência** quando ficou "vamos ver", "deixa eu confirmar", pergunta sem resposta, ou
  duas pessoas concordando com coisas diferentes
- **Contexto** quando é informação sem ação: faturamento dito de passagem, histórico

Anotar o minuto de cada decisão e tarefa (a transcrição do script já traz `[mm:ss]`). É o
que permite reabrir a gravação no ponto certo quando o cliente disser "eu não falei
isso".

Quando a transcrição não diz quem falou (sai "Falante 1", "Falante 2", ou nada), perguntar
uma vez, antes de separar: "Falante 1 é você e Falante 2 é a Carla?". Decisão atribuída à
pessoa errada é pior que decisão sem nome. Se nem o usuário souber, a linha fica sem
"quem fechou" e o item vai pra pendência.

Regra de desempate: na dúvida entre decisão e pendência, é pendência. Decisão registrada
a mais causa briga; pendência a mais causa uma pergunta.

### Passo 4 — Converter prazo em data absoluta

"Semana que vem", "em dez dias", "até o fim do mês", "sexta": tudo se converte a partir
da **data da reunião**, não de hoje. Por comando, nunca de cabeça:

```bash
node -e '
const D=["dom","seg","ter","qua","qui","sex","sáb"];
const base=new Date("2026-09-18T12:00:00");          // data da reunião
for (const dias of [7, 10, 12]) { const d=new Date(base); d.setDate(d.getDate()+dias);
  console.log(`+${dias} dias → ${D[d.getDay()]} ${d.toLocaleDateString("pt-BR")}`); }'
```

Escrever cada data com o dia da semana na frente (`seg 28/09/2026`). Dia da semana solto
("sexta") é o da semana da reunião se ainda não passou; dito na própria sexta, ou depois
dela, vira `[a confirmar: sexta 25/09 ou 02/10?]`. Depois de salvar a ata:

```bash
node scripts/verificar.js datas "reunioes/2026-09-18-acme-kickoff.md"
```

Prazo que ninguém disse não se inventa: fica `[prazo a confirmar com Fulano]`, e a tarefa
entra no pipeline sem data.

### Passo 5 — Escrever a ata

Curta. Quem lê é quem estava lá e esqueceu, ou quem não estava e precisa agir. Nem um
nem outro quer o relato da conversa.

```markdown
# Reunião — <assunto> — <dia da semana> <DD/MM/AAAA>

**Com:** <participantes, com empresa quando é cliente>
**Duração:** <hh:mm> · **Fonte:** gravação transcrita por <provedor> (`dados/<arquivo>.txt`) | transcrição do <app> | anotação do <nome>
**Tipo:** primeira conversa | alinhamento | entrega/aprovação | interna | fornecedor

## Em uma frase
[O que essa reunião mudou. Se não mudou nada, dizer isso.]

## Decisões
| # | O que ficou decidido | Quem fechou | Condição | Minuto |
|---|---|---|---|---|
| 1 | Site com três páginas, sem blog nesta fase | Carla | blog entra se o tráfego for aprovado em outubro | 14:20 |

## Tarefas
| Quem | O quê | Até quando | Minuto |
|---|---|---|---|
| Bruno | Enviar proposta revisada | qua 30/09/2026 | 41:05 |
| Carla | Mandar acesso ao domínio | [prazo a confirmar com Carla] | 33:40 |

## Pendências
| O que ficou no ar | Quem destrava | O que trava |
|---|---|---|
| Domínio atual fica ou muda | Carla, com o contador | configuração do e-mail |

## Contexto que vale guardar
- Loja fatura ~R$ 40 mil/mês, 70% pelo WhatsApp (Carla, min 12)

## Próxima reunião
<data e assunto, ou "não marcada">

## Vira o quê
- `/proposta`: [o que o cliente pediu pra receber]
- `/contrato`: [o que foi fechado com valor e prazo] | mudança de escopo (aditivo)
- nada: [se for interna ou sem pedido]
```

O que **não** entra: quem falou mais, tom de voz, brincadeira, avaliação de pessoa,
trecho que alguém pediu pra não registrar.

Se a fonte foi anotação e não gravação, a linha **Fonte** diz isso, e a coluna de minuto
some. O que não foi anotado não existe pra ata, e é bom que quem ler saiba.

### Passo 6 — Alimentar o pipeline

As tarefas vão pro `tarefas.md` pelas regras do `/tarefas`, com a origem marcada:

```markdown
## Agora (essa semana)
- [ ] Enviar proposta revisada pra Acme — vence 30/09/2026 (reunião 18/09)

## Esperando resposta
- [ ] Carla (Acme) — acesso ao domínio, pedido na reunião 18/09, cobrar seg 28/09
```

Tarefa do usuário vai em "Agora" ou "Depois", conforme o prazo. Tarefa de terceiro (o
cliente manda o acesso, o fornecedor devolve o orçamento) vai em "Esperando resposta",
com a data de cobrar; é a seção que o `/abrir` mostra no começo do dia. Mostrar a lista
antes de gravar:

> "Vou colocar 3 tarefas no pipeline: duas suas, uma esperando a Carla. Confirma?"

Se "Agora" já tem cinco itens, o `/tarefas` pergunta o que sai. Respeitar.

### Passo 7 — Apontar o que vira proposta ou contrato

Só em reunião com cliente ou fornecedor. Três desfechos, e a ata diz qual:

- **Ele pediu pra receber algo** ("manda uma proposta com isso", "me passa o valor"):
  vira `/proposta`, com o escopo e o prazo que saíram da ata. Interesse não é fechamento
- **Ele fechou, com valor e prazo ditos e aceitos**: vira `/contrato`. Mesmo assim, o
  contrato vai como confirmação escrita do combinado, não como surpresa
- **Cliente em andamento pediu coisa fora do combinado**: a ata registra o pedido e a
  fronteira. O que muda de escopo pede aditivo, e isso é conversa do `/contrato`

Oferecer o próximo passo em uma linha, sem executar sem pedir:

> "A Carla pediu a proposta com as três páginas até quarta. Monto agora com o que saiu daqui?"

### Passo 8 — Versão pro cliente, se ele pediu ata

Quando o usuário vai mandar a ata pro cliente, é outra versão, gerada a partir da
interna: só decisões, tarefas dos dois lados e pendências. Sem contexto interno, sem
comentário sobre a conta, sem minuto da gravação. Sai na voz de `_memoria/preferencias.md`
e vai pelo canal do cliente (o `/whatsapp` calibra se for por lá; o
`/email-profissional` se for por e-mail). Salvar como `reunioes/<AAAA-MM-DD>-<slug>-cliente.md`.

Ata mandada no mesmo dia é lida. A da semana seguinte vira discussão sobre o que foi
dito.

### Passo 9 — Verificar e entregar

```bash
node scripts/verificar.js datas "reunioes/<AAAA-MM-DD>-<slug>.md"
node scripts/verificar.js texto "reunioes/<AAAA-MM-DD>-<slug>-cliente.md"   # só a versão que sai
grep -c "a confirmar" "reunioes/<AAAA-MM-DD>-<slug>.md"                     # quantas pontas soltas
```

Entrega:

```
✓ Ata: reunioes/2026-09-18-acme-kickoff.md
  Transcrição: dados/reuniao-acme.txt (52 min, OpenAI; fica fora do git)
  3 decisões · 4 tarefas (3 no pipeline, 1 sem prazo) · 2 pendências
  Vira: /proposta (site de três páginas, pediu até quarta)
  A confirmar: prazo do acesso ao domínio (Carla)
```

---

## Regras

- **Ata não inventa decisão.** Só entra o que alguém fechou e apareceu na transcrição ou na anotação. Se pareceu decidido mas ninguém disse, é pendência
- **Dúvida vira pendência**, com nome de quem destrava. Nunca resolver a dúvida por conta própria pra deixar a ata "completa"
- **Prazo é data absoluta, calculada da data da reunião**, com dia da semana, e passa por `verificar.js datas`. "Semana que vem" não entra na ata
- **Prazo que ninguém disse fica `[a confirmar]`.** Tarefa sem data entra no pipeline sem data; nunca com data inventada
- **O áudio só vai pra API com o usuário sabendo.** Avisar pra onde vai, esperar o sim, e só então rodar o script. Sem chave, seguir com transcrição colada, sem insistir
- **Transcrição automática se confere.** Nome próprio, valor e prazo se confirmam na gravação ou com quem falou antes de ir pra proposta ou contrato. A ata marca o minuto justamente pra isso
- **Fonte de anotação é dita como anotação.** Ata feita de bullet de caderno não finge ser feita de gravação
- **Interesse não é fechamento.** "Gostei, manda a proposta" vira `/proposta`. `/contrato` só quando valor e prazo foram ditos e aceitos
- **Mudança de escopo dita em voz vai pra ata e aponta pro aditivo.** Não vira tarefa silenciosa que o usuário faz de graça
- **Fronteira:** `/reuniao` faz a ata, as decisões e as tarefas. `/tarefas` mantém o pipeline depois. `/reaproveitar` transforma transcrição em conteúdo, e só entra com autorização explícita, nunca em reunião com cliente. `/proposta` e `/contrato` formalizam o que a ata apontou. `/apresentacao` é o deck que vai **pra** reunião, não o que sai dela
- **LGPD:** gravação e transcrição são dado pessoal de quem falou. Ficam em `dados/`, fora do git, não vão pra ferramenta externa além da transcrição autorizada, e a versão pro cliente não leva o que é interno. Se o usuário quiser a transcrição versionada junto da ata, é ele quem pede, sabendo que o `/salvar` sobe o arquivo. Se alguém pediu pra não registrar, não se registra. Se o usuário gravou sem avisar os participantes, dizer isso uma vez
- **Valor dito em reunião é registro, não preço.** "Falou em uns oito mil" entra no contexto com o minuto; o preço da proposta sai do `/preco` e da conta, não da lembrança da call
- **Quando a reunião não decidiu nada, a ata diz isso.** "Nada decidido; volta dia X" é ata legítima, e evita a reunião seguinte começar do zero
