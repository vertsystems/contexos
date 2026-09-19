---
name: evento
description: >
  Planeja um evento do negócio, presencial ou online (workshop, live, aula aberta, webinar,
  evento na loja, encontro de clientes), do objetivo à colheita: meta com número, formato e
  duração, roteiro minuto a minuto, captação com lembretes em datas calculadas, lista de
  checagem de logística, o que dizer no fim e o que fazer com gravação, lista e presentes
  nas 48 horas seguintes.
  Use quando o usuário disser "quero fazer uma live", "vou dar um workshop", "aula aberta",
  "webinar", "evento na loja", "como organizo um evento", "vou fazer uma degustação",
  "encontro com clientes", "roteiro da live", "ninguém apareceu no meu evento", ou /evento.
---

# /evento — Workshop, live, aula aberta, evento na loja

> **Convenção de pastas:** a saída vai em `eventos/<slug>-<AAAA-MM-DD>/` (`plano.md`, `roteiro.md`, `checklist.md`). Na convenção **por cliente**, `clientes/<Nome>/eventos/`. A pasta nasce quando o plano é salvo, nunca antes.

Evento é a peça de marketing mais cara que o pequeno negócio faz: custa uma semana de captação, um dia inteiro de atenção e, no presencial, dinheiro adiantado. E quase sempre é feito sem meta, sem lembrete e sem colheita. O resultado é a frase que abre metade dos pedidos dessa skill: "fiz uma live e não deu em nada". Deu em nada porque nada foi planejado pra dar. Aqui o evento começa pelo número que precisa aparecer no dia seguinte, e tudo o mais é calculado a partir dele.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que vende, canais que já usa, equipe disponível no dia
- **Tom:** `_memoria/preferencias.md` — o roteiro é fala, e fala emprestada trava na hora
- **Cliente real:** `_memoria/publico.md`, se existir — a dor na palavra dele abre o evento, e o horário do evento é o horário dele
- **Oferta:** `_memoria/oferta.md`, se existir — o que se oferece no fim, preço, garantia. Sem ela, o fim do evento é um "próximo passo", e vale oferecer `/oferta` uma vez
- **Ativos:** `biblioteca.md` — depoimento e número pra usar no roteiro e nos lembretes
- **Molde:** `templates/crescimento/evento.md` — formatos, taxa de comparecimento, lista de checagem, erros clássicos
- **Gancho:** `templates/copy/ganchos.md` — os três primeiros minutos seguem a mesma régua de um post
- **Cálculo:** `node scripts/verificar.js datas` (dia da semana dos lembretes) e `node scripts/verificar.js tabela` (soma dos minutos do roteiro e do custo)
- **Saída:** `eventos/<slug>-<AAAA-MM-DD>/plano.md`, `roteiro.md` e `checklist.md`. O slug é o nome curto do evento em minúsculas com hífen; a data é a do evento

---

## Workflow

### Passo 1 — Fechar o objetivo com número

Uma pergunta, antes de qualquer formato:

> "No dia seguinte ao evento, o que precisa ter acontecido pra você dizer que valeu? Me dá um número: tantos contatos novos, tantas vendas, ou tantos clientes na sala."

A resposta cai num dos três objetivos do molde: **leads**, **vendas** ou **relacionamento**. Se ele responder com dois ("quero vender e crescer a lista"), escolher um com ele. O segundo vira consequência, não meta.

Depois, a conta de trás pra frente. Perguntar as taxas do último evento dele; se nunca fez, declarar premissa e marcar como premissa:

```bash
# meta de 5 vendas, conversão de 10% dos presentes, comparecimento de 40% [premissa]
node -e '
const vendas = 5, conversao = 0.10, comparecimento = 0.40;
const presentes = Math.ceil(vendas / conversao);
const inscritos = Math.ceil(presentes / comparecimento);
console.log({ presentes, inscritos });
'
```

A conta muda com o objetivo. **Vendas** é a de cima. **Leads** pula a primeira linha: a meta já é o número de inscritos com contato válido, e a única taxa que entra é a de comparecimento, porque lead que não apareceu esfria mais rápido. **Relacionamento** conta presentes: clientes na sala ÷ comparecimento = convidados. Se a inscrição passa por página, mais uma linha: inscritos ÷ conversão da página = visitas que a divulgação precisa gerar.

O número de inscritos que sai daí é a meta de captação. É ele que decide se a lista atual dá conta ou se vai precisar de anúncio, parceiro ou duas semanas a mais de divulgação. Dizer isso ao usuário com o número: "pra 5 vendas você precisa de 125 inscritos; sua lista hoje tem 80".

### Passo 2 — Escolher formato, duração e data

Ler a tabela de formatos do molde e propor **um**, com o motivo em uma linha. Sem lista e sem verba é live; precisa de contato pra vender depois é webinar ou aula aberta; serviço local de ticket alto é presencial; base que já compra é evento na loja ou encontro.

Confirmar com uma pergunta só, que cobre o que falta:

> "Pensei em [formato], de [duração], porque [motivo]. Que dia e horário funcionam pra você, e quantas pessoas cabem (na sala, ou no plano da plataforma)?"

O horário é do público, não do dono: quem vende pra empresa fala de terça a quinta ao meio-dia ou às 19h; quem vende pra consumidor fala à noite ou no sábado de manhã. Se `publico.md` disser algo diferente, `publico.md` vence.

Conferir o dia da semana da data escolhida por comando, nunca de cabeça:

```bash
node -e 'console.log(new Date("2026-10-15T19:00:00-03:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }))'
```

Se a data cair em feriado nacional ou local, avisar. Feriado é consultado por WebSearch na hora, não de memória.

Em presencial, a capacidade entra na conta do Passo 1 de outro jeito: 30 cadeiras com premissa de 60% de comparecimento pedem 50 confirmados, não 30. Mas 50 inscritos não viram 50 cadeiras: o excedente vai pra lista de espera, e a confirmação ativa do D-1 ("responde SIM se vai vir") é o que libera cadeira pra quem está esperando. Lotar a sala e mandar gente embora na porta custa mais que cadeira vazia.

### Passo 3 — Calcular o calendário de captação

Os marcos são fixos: D-14 abre a inscrição, D-7, D-3 e D-1 lembram, H-2 e H-0 chamam, D+1 colhe. As datas saem por comando, com a hora do evento como referência:

```bash
node -e '
const ev = new Date("2026-10-15T19:00:00-03:00");   // data e hora do evento
const o = { timeZone: "America/Sao_Paulo" };
const dia  = (x) => x.toLocaleDateString("pt-BR", { ...o, weekday: "short" }).replace(".", "");
const data = (x) => x.toLocaleDateString("pt-BR", { ...o, day: "2-digit", month: "2-digit", year: "numeric" });
const hora = (x) => x.toLocaleTimeString("pt-BR", { ...o, hour: "2-digit", minute: "2-digit" });
const marcos = [["D-14", 14 * 864e5], ["D-7", 7 * 864e5], ["D-3", 3 * 864e5], ["D-1", 864e5], ["H-2", 2 * 36e5], ["H-0", 0], ["D+1", -864e5]];
console.log("| Marco | Data | Dia | Envio |\n|---|---|---|---|");
for (const [m, ms] of marcos) { const x = new Date(ev.getTime() - ms); console.log(`| ${m} | ${data(x)} | ${dia(x)} | ${m.startsWith("H") ? hora(x) : "09:00"} |`); }
'
```

A tabela que sai vai direto pro `plano.md`. Cada marco ganha o canal e o **motivo** da mensagem, porque lembrete que só repete a data é ignorado: D-7 diz o que a pessoa leva, D-3 traz uma prova (depoimento, número, bastidor), D-1 traz link ou endereço e o que preparar, H-2 e H-0 são só o link.

Marco que cai em domingo ou feriado muda pro dia útil anterior. No exemplo acima, o D-3 cai em 12/10, feriado nacional: o lembrete vai pra sexta 09/10 ou segue pra terça 13/10, e o usuário escolhe. A linha é corrigida na tabela e o `verificar.js datas` do Passo 8 confere o dia da semana de novo.

Se o evento é em menos de 14 dias, os marcos que já passaram são cortados, e o usuário fica sabendo que a captação vai ser mais curta que o ideal.

Lembrete individual só vai pra quem se inscreveu ou já autorizou contato. Lista antiga de WhatsApp que nunca pediu pra receber nada recebe o post e a história, não a mensagem.

### Passo 4 — Montar a captação

O plano lista as peças, quem faz cada uma e a skill que produz. Nenhuma delas é produzida aqui:

| Peça | Quando | Skill |
|---|---|---|
| Página de inscrição (só com inscrição: webinar, aula, presencial) | D-14 | `/landing`, objetivo captura |
| Post de abertura e conteúdo de antecipação | D-14 e D-10 | `/carrossel`, `/video` |
| Convite pra base e lembretes | D-14 a H-0 | `/whatsapp` (lista de transmissão) e `/email` |
| Roteiro de vídeo curto chamando pro evento | D-10 | `/video` |
| Anúncio, se a lista não alcança a meta de inscritos | D-14 a D-3 | `/anuncio-google` |

O que esta skill escreve, ali mesmo no `plano.md`, é o **texto curto** de cada lembrete (duas a quatro linhas, na voz do usuário, com o motivo do marco), pronto pra ir pro `/whatsapp` ou pro `/email` sem retrabalho. E a promessa do evento em uma frase, que vira o título da página e o gancho dos posts: o que a pessoa sai sabendo ou conseguindo fazer, na palavra dela.

Live sem inscrição não tem página: a captação é história, post fixo e lembrete pra lista que já existe.

### Passo 5 — Escrever o roteiro minuto a minuto

Perguntar os três pontos de conteúdo, um por vez se ele não tiver claro:

> "Qual é a primeira coisa que a pessoa precisa entender, e qual é o exemplo real que você usa pra explicar isso?"

Três pontos, não sete. Cada um com exemplo real (do negócio dele, de `biblioteca.md`) e uma ação que a pessoa faz amanhã. Aplicar a proporção do molde à duração escolhida, por comando, pra que os minutos fechem no total:

```bash
# duração em minutos; as frações são as do molde (abertura, promessa, conteúdo, interação, oferta, encerramento)
node -e '
const total = 60, blocos = [["Abertura", .05], ["Promessa", .10], ["Conteúdo", .55], ["Interação", .10], ["Oferta", .15], ["Encerramento", .05]];
let t = 0, soma = 0;
const min = blocos.map(([n, f]) => { const m = Math.round(total * f); soma += m; return [n, m]; });
min[2][1] += total - soma;   // a diferença de arredondamento vai pro conteúdo
for (const [n, m] of min) { console.log(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")} | ${m} | ${n}`); t += m; }
'
```

Live de 30 minutos sem oferta troca o bloco "Oferta" por "Próximo passo", com a mesma fração. Escrever o `roteiro.md`:

```markdown
# Roteiro — <nome do evento> — <dia da semana> <DD/MM/AAAA>, <HH:MM>

Duração: <N> min · Formato: <formato> · Objetivo: <objetivo com número>

## Bloco a bloco
| Minuto | Duração (min) | Bloco | O que acontece | Quem | Na tela / na mesa |
|---|---|---|---|---|---|
| 00:00 | 3 | Abertura | quem fala, pra quem, o que leva no fim, aviso de que haverá oferta | <nome> | slide de capa |
| 00:03 | 6 | Promessa | a dor na palavra do público; por que o jeito comum falha | <nome> | slide 2 |
| 00:09 | 33 | Conteúdo (3 pontos) | ... | <nome> | ... |
| 00:42 | 6 | Interação | pergunta ao vivo / enquete / exercício | <nome> + moderação | ... |
| 00:48 | 9 | Oferta ou próximo passo | transição, oferta, três objeções | <nome> | slide da oferta com preço |
| 00:57 | 3 | Encerramento | resumo em três frases, o que fazer em 24 h | <nome> | slide final com link |
| **Total** | **60** | | | | |

## Fala de abertura (as primeiras 3 frases, escritas)
...

## Transição pra oferta (escrita, pra não improvisar)
...

## As três objeções e a resposta de cada uma
...

## Se der problema
- Internet caiu: ...
- Ninguém pergunta nada: ...
- Alguém hostil no chat ou na sala: ...
```

A coluna de duração precisa fechar com o total declarado. Conferir por comando:

```bash
node scripts/verificar.js tabela eventos/<slug>-<AAAA-MM-DD>/roteiro.md
```

A fala de abertura e a transição pra oferta ficam **escritas**, palavra por palavra, porque são os dois momentos em que o improviso mais custa. O resto do roteiro é tópico, pra ele falar com a voz dele.

Se o evento tem slides, o roteiro é o briefing do `/apresentacao`: uma ideia por slide, na ordem dos blocos. Se a live é sem slide, a coluna "na tela" vira "o que mostrar" (produto, tela do celular, quadro).

### Passo 6 — Fechar a logística

Copiar do molde a lista de checagem do tipo escolhido (presencial, live, webinar) pro `checklist.md`, e adaptar ao evento: nome do local, nome de quem faz cada coisa, link real da sala. Item genérico ("testar equipamento") vira item com dono e hora ("Marcos testa projetor no salão, sexta 16h").

```markdown
# Checklist — <nome do evento> — <DD/MM/AAAA>

## D-7 (<dia> <DD/MM>)
- [ ] <item> — <quem>
## D-1 (<dia> <DD/MM>)
- [ ] ...
## H-2 (<dia> <DD/MM>, <HH:MM>)
- [ ] ...
## Durante
- [ ] gravação ligada (conferir nos primeiros 2 min)
- [ ] ...
## D+1 (<dia> <DD/MM>)
- [ ] ...
```

Em presencial, o `plano.md` ganha uma tabela de custo (espaço, café, material, equipe extra, anúncio), somada por comando com `verificar.js tabela`. Custo dividido pela meta de presentes é o número que diz se o evento cabe.

### Passo 7 — Definir o que se diz no fim

Ler `_memoria/oferta.md`. Se existe oferta, o fim do evento é ela: nome, preço, condição do dia, prazo real, como pagar. Se não existe, o fim é um **próximo passo** específico: agendar conversa, entrar na lista, responder um formulário curto. O erro é não pedir nada.

Escrever no `roteiro.md` a transição e as três objeções com resposta (a `/oferta` e o `/vender` já mapearam; ler de lá). E avisar o usuário de uma regra que ele vai querer quebrar: a oferta é anunciada na abertura. Quem descobre no minuto 50 que aquilo era uma venda se sente enganado, e isso custa mais que a venda.

### Passo 8 — Escrever o plano e agendar a colheita

```markdown
# Evento — <nome> — <dia da semana> <DD/MM/AAAA>, <HH:MM>

## Objetivo
<leads | vendas | relacionamento>: <número>. Conta: <vendas> ÷ <conversão> = <presentes>; <presentes> ÷ <comparecimento> = <inscritos>.
Taxas de: <último evento em DD/MM/AAAA | premissa>.

## Formato
<formato>, <duração>, <local ou plataforma>, capacidade <N>. Por quê: <uma linha>.

## Promessa (título da página e gancho dos posts)
"<o que a pessoa sai sabendo ou fazendo>"

## Calendário de captação
| Marco | Data | Dia | Envio | Canal | Motivo da mensagem |
|---|---|---|---|---|---|

## Textos dos lembretes
### D-7
...
### D-3
...

## Peças e quem faz
| Peça | Quando | Quem | Skill |
|---|---|---|---|

## Custo (presencial)
| Item | Valor |
|---|---|
| **Total** | **R$ ...** |

## Fim do evento
<oferta ou próximo passo, com preço e prazo>

## Colheita (D+1 e D+2)
| Ativo | Vai pra onde | Quem | Skill |
|---|---|---|---|

## Resultado (preencher depois)
| Métrica | Meta | Real |
|---|---|---|
| Inscritos | | |
| Presentes (pico) | | |
| Ficaram até a oferta | | |
| Fechamentos em 7 dias | | |
| Custo por presente | | |
```

Antes de entregar, os dois comandos:

```bash
node scripts/verificar.js datas eventos/<slug>-<AAAA-MM-DD>/plano.md
node scripts/verificar.js tabela eventos/<slug>-<AAAA-MM-DD>/plano.md
```

Se o `datas` acusar um dia da semana errado, refazer a tabela a partir do comando do Passo 3. Nunca corrigir o dia na mão.

Os marcos de captação e os itens de colheita entram no `tarefas.md` com data. Follow-up que depende de memória não acontece, e a colheita é o passo que mais se perde: quem esteve no evento esfria em 48 horas.

### Passo 9 — Colher, no D+1

Quando o usuário voltar depois do evento, esta skill fecha o ciclo:

1. Preencher a seção **Resultado** com os números reais. Eles substituem a premissa no próximo evento
2. Separar a lista em três grupos (veio, não veio, ficou até a oferta) e mandar cada um pra `/sequencia`, com mensagem diferente por grupo: quem não veio recebe a gravação com prazo; quem veio recebe o resumo e a oferta; quem ficou até a oferta recebe a resposta às objeções
3. Quem esteve no evento e deu sinal (perguntou preço, ficou até o fim, mandou mensagem depois) vai pro `/pos-venda`, no fluxo de orçamento sem resposta, com contato individual em até 48 h. Em evento presencial pequeno, todo presente recebe esse contato, porque a lista cabe na mão
4. A gravação vai pro `/reaproveitar`: três cortes, um carrossel, um artigo
5. Depoimento dito ao vivo ou no chat entra em `biblioteca.md`, com nome só se a pessoa autorizou
6. Pergunta que ninguém esperava vira pauta no `/ideias`

---

## Regras

- **Sem número, sem plano.** Se o usuário não consegue dizer o que precisa acontecer no dia seguinte, o Passo 1 não termina. "Quero aparecer mais" vira "quero 60 contatos novos com WhatsApp" ou não vira evento
- **Planejar pelo presente, nunca pelo inscrito.** A taxa de comparecimento entra na conta, escrita, com a origem (histórico próprio ou premissa). Referência de mercado é `[a confirmar]` e nunca substitui o número do próprio negócio quando ele existe
- **Toda data sai de comando.** Dia da semana dos lembretes, hora do H-2, feriado: `node -e` e `verificar.js datas`. Um lembrete com dia da semana errado é um evento vazio
- **Oferta anunciada na abertura.** Aula que vira pitch sem aviso perde a confiança da sala, e o usuário vai pedir pra esconder. Explicar uma vez, e manter
- **Uma oferta só no fim, com preço dito.** Duas opções é uma decisão a mais pra quem já está cansado; "me chama pra saber o valor" derruba quem perguntaria
- **Prazo real.** Condição que "termina hoje" e continua amanhã queima a próxima edição. Se o usuário quer estender, o plano diz isso antes, não depois
- **Não inventar taxa, custo ou capacidade.** Preço de espaço, plano da plataforma, limite de participantes: o usuário confirma ou entra como `[a confirmar]`
- **Fronteira com as vizinhas:** a página de inscrição é `/landing`; o texto do e-mail em HTML é `/email`; a lista de transmissão e o lembrete no WhatsApp são `/whatsapp`; os slides são `/apresentacao`; o vídeo curto de chamada é `/video`; a sequência de mensagens pra quem se inscreveu é `/sequencia`; o contato individual com quem quase fechou é `/pos-venda`; a gravação vira peça no `/reaproveitar`. Um lançamento com vários eventos e uma janela de venda é o `/lancamento`, e um evento pode ser uma etapa dele; esta skill planeja o evento em si
- **Lista de inscritos é dado pessoal (LGPD).** Nome, telefone e e-mail não saem pra ferramenta externa sem autorização, quem pediu pra não receber mensagem sai da sequência, e a gravação com rosto de participante em presencial só vira peça pública com consentimento
- **Evento presencial tem plano B escrito** pra internet, som e espaço. Não é pessimismo, é o cabo a mais na mochila
- Quando o evento já aconteceu e "não deu em nada", começar pelo Passo 9: os números reais dizem onde quebrou (captação, comparecimento, oferta), e o próximo plano nasce daí
