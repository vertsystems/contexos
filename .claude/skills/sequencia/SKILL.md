---
name: sequencia
description: >
  Desenha uma série de mensagens automatizável, por e-mail ou WhatsApp: boas-vindas, nutrição,
  orçamento ou carrinho parado, reativação, pós-compra e lista de espera. Cada mensagem sai com
  gatilho, intervalo (D+0, D+2...), objetivo único, assunto, corpo pronto na voz do usuário, uma
  chamada só e a condição de saída. Entrega em formato que cabe em Mailchimp, RD Station,
  ActiveCampaign, Brevo, ManyChat ou envio manual com lembrete.
  Use quando o usuário disser "sequência de e-mails", "e-mails de boas-vindas", "automação de
  e-mail", "quero mandar uma série de mensagens", "régua de relacionamento", "fluxo de nutrição",
  "recuperar carrinho abandonado", "e-mail de quem baixou o material", "mensagens depois que
  a pessoa se cadastra", "lista de espera do lançamento", ou /sequencia.
---

# /sequencia — Mensagens em série

> **Convenção de pastas:** a saída vai em `vendas/sequencias/`. Na convenção **por cliente**, `clientes/<Nome>/vendas/sequencias/`. A pasta nasce na primeira série.

Quem entra na lista de um negócio pequeno costuma receber uma mensagem no dia e mais
nenhuma. Ou recebe a mesma promoção que todo mundo, três meses depois, sem saber por
quê. A série resolve os dois: a pessoa que baixou o material na terça recebe o caminho
certo na terça, na quinta e na semana seguinte, sem ninguém lembrar de mandar. É o único
trabalho de venda que roda enquanto o dono atende.

Não confundir com as vizinhas: o `/email` desenha **um** e-mail em HTML, enquanto um
e-mail avulso pra uma pessoa é trabalho do `/email-profissional`. Mensagens soltas de
cada situação de cliente saem do `/pos-venda`, e o formato da mensagem no canal é o
`/whatsapp` que calibra. Esta skill é a arquitetura da série: quantas mensagens, em que
ordem, com que intervalo, com que gatilho, e o que tira a pessoa dela.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que vende, prazo de entrega, canal principal, ferramenta de envio que já usa
- **Tom:** `_memoria/preferencias.md` — série soa como robô quando não é a voz do usuário; aqui a voz importa mais que em qualquer peça avulsa
- **Cliente real:** `_memoria/publico.md` — a dor e as objeções na palavra dele. Cada mensagem de nutrição vira uma objeção
- **Oferta:** `_memoria/oferta.md` — o que a série vende, a garantia, o prazo. Se não existir, oferecer `/oferta` uma vez e seguir com o que tem
- **Molde:** `templates/crescimento/sequencias.md` — tipos, intervalos, anatomia da mensagem, regra de uma chamada, saída em um clique, LGPD, regras do WhatsApp, medição
- **Copy:** `templates/copy/ganchos.md` (assunto e primeira linha) e `templates/copy/humanizacao.md` (o que denuncia máquina)
- **Depoimentos e casos:** `biblioteca.md`, quando existir — a mensagem de prova usa o que está lá, nunca o que parece plausível
- **Saída:** `vendas/sequencias/<tipo>-<AAAA-MM-DD>.md` (tipo em `boas-vindas`, `nutricao`, `orcamento-parado`, `carrinho`, `reativacao`, `pos-compra`, `lista-de-espera`)

---

## Workflow

### Passo 1 — Descobrir o tipo de série

Cada tipo tem gatilho, tamanho e ritmo próprios. Se o pedido não deixar claro, uma
pergunta só:

> "Essa série é pra quem: quem acabou de entrar na lista, quem pediu orçamento e sumiu,
> quem comprou, ou quem parou de comprar?"

| Tipo | Dispara quando | Mensagens | A série quer que a pessoa |
|---|---|---|---|
| **Boas-vindas** | entrou na lista, baixou a isca, mandou o primeiro oi | 3 a 5 | entenda o que você faz e dê o primeiro passo pequeno |
| **Nutrição** | terminou as boas-vindas sem comprar | 5 a 7 | perca as objeções, uma por mensagem |
| **Orçamento ou carrinho parado** | orçamento enviado, carrinho aberto, sem resposta | 3 | diga o que travou, ou compre |
| **Reativação** | sem compra há X dias (o X é do negócio) | 3 | volte por um motivo concreto |
| **Pós-compra** | pagou ou fechou | 3 a 4 | use o que comprou, e dê o depoimento na hora certa |
| **Lista de espera** | se cadastrou antes de abrir vaga | 3 a 5 | chegue no dia da abertura ainda interessada |

Pedido ambíguo entre dois tipos ("quero mandar e-mail pra minha lista") quase sempre é
boas-vindas seguida de nutrição. Nesse caso, desenhar a primeira, e deixar a segunda
anotada pra depois de a primeira rodar duas semanas.

### Passo 2 — Levantar o que entra

Levantamento se faz em uma mensagem só, não uma pergunta por vez:

> 1. "Por onde vai: e-mail, WhatsApp ou os dois?"
> 2. "Qual ferramenta você usa pra mandar? (Mailchimp, RD Station, ActiveCampaign, Brevo, ManyChat, ou manda na mão)"
> 3. "De onde vem o contato, e o que ele esperava receber quando deixou o e-mail ou o número?" (isca, formulário do site, conversa, cliente antigo)
> 4. "O que conta como 'deu certo' nessa série?" (comprou, agendou, respondeu, pediu orçamento)
> 5. "Quantas pessoas entram nela por mês, mais ou menos?"
> 6. "Tem alguma coisa que você não quer prometer, ou que já deu problema antes?"

A resposta 3 decide se a série pode existir. Contato que deixou o e-mail pra baixar um
material esperava o material; mandar oferta pra ele exige que o formulário tenha dito
isso. Lista comprada, raspada de grupo ou copiada de outro lugar não entra em série
nenhuma, e a skill diz isso na hora, sem rodeio. A régua está na seção de LGPD do molde.

O caso mais comum é o do meio: uma base antiga, de clientes e contatos de anos, sem
registro de quem aceitou o quê. Ela não entra na série direto. Antes vem uma mensagem
só, de repermissão ("vou passar a mandar X a cada Y; quer receber?"), e entra na série
quem clicou ou respondeu. Quem ficou em silêncio fica fora. Parece perder gente; o que
perde é quem ia marcar spam.

Se a resposta 1 for "os dois", dividir por função em vez de duplicar: o WhatsApp leva a
D+0 (a pessoa acabou de falar, a janela de 24 horas está aberta) e a última mensagem, a
que pede resposta; o e-mail leva o meio. A mesma mensagem nos dois canais é o que faz a
pessoa bloquear um deles.

A resposta 5 muda a arquitetura no e-mail: acima de 5.000 envios por dia pro mesmo
domínio, as exigências de Gmail e Yahoo viram bloqueio (Passo 7). No WhatsApp, o número
decide entre envio manual e API oficial: até umas dezenas por semana, o app comum com
lembrete dá conta; acima disso, a série passa por modelo aprovado e custo por conversa.

Se o usuário já tem uma série rodando, pedir os números por mensagem antes de escrever
qualquer coisa. Reescrever o que funciona é o erro mais caro dessa skill.

### Passo 3 — Desenhar a arquitetura

Antes de qualquer texto, a tabela da série: número, gatilho, atraso, objetivo único,
chamada e condição de saída. É ela que vai pra ferramenta; o texto vem depois.

O objetivo de cada posição não se inventa. O molde tem o arco de cada tipo (o que a
mensagem 1 faz, o que a 2 faz, até a última) na seção "O arco de cada tipo": a série
parte dele e muda só o que o negócio pede. Numa nutrição, por exemplo, a lista de
objeções de `_memoria/publico.md` é lida antes da tabela, e cada uma vira uma linha, da
mais frequente pra menos. Se `publico.md` não existe, as objeções vêm do usuário, em uma
pergunta: "o que as pessoas dizem antes de não comprar?"

Os intervalos de partida por tipo estão no molde. Duas regras que não mudam:

- **A primeira mensagem sai na hora.** D+0 é a mensagem mais aberta da série, porque a pessoa acabou de pedir. Esperar um dia joga fora a única que ela está esperando
- **Cada mensagem tem um objetivo, e só um.** Se a série precisa de duas ações (ver o vídeo, depois agendar), são duas mensagens, e a segunda dispara só pra quem fez a primeira

Se o usuário sabe quando a série começa (lançamento, campanha, data de disparo pra base
antiga), as datas reais se calculam por comando, com o dia da semana, nunca de cabeça.
Ajustar a data de início e a lista de atrasos:

```bash
node -e '
const inicio = new Date("2026-09-21T12:00:00");
const dias = [0, 1, 3, 5, 7];
const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
for (const d of dias) {
  const x = new Date(inicio); x.setDate(x.getDate() + d);
  const dd = String(x.getDate()).padStart(2, "0"), mm = String(x.getMonth() + 1).padStart(2, "0");
  console.log(`| D+${d} | ${dd}/${mm}/${x.getFullYear()} | ${nomes[x.getDay()]} |`);
}'
```

Se um envio cai em sábado ou domingo e o negócio vende pra empresa, empurrar pra
segunda e anotar o motivo. Pra consumo, fim de semana costuma abrir bem; sem dado
próprio, manter e medir.

Série de gatilho contínuo (cada pessoa entra numa data diferente) fica só com o D+N. A
coluna de data entra apenas em série com dia de início conhecido.

### Passo 4 — Escrever cada mensagem

Uma por vez, na ordem, com o objetivo da tabela na frente. O que cada uma carrega:

- **Assunto** (e-mail): até uns 40 caracteres pra não cortar no celular, descrevendo o conteúdo. Sem suspense. Dois assuntos pra primeira mensagem, pro usuário testar
- **Preheader** (e-mail): completa o assunto em vez de repetir
- **Primeira linha** (WhatsApp): é o que aparece na notificação. Ela sozinha precisa fazer a pessoa abrir
- **Corpo:** curto, com uma coisa específica que só esse negócio poderia dizer. Numa série de sete, duas vendem; as outras ensinam, mostram bastidor, contam um caso de `biblioteca.md`
- **Uma chamada:** um link, um botão ou uma pergunta. O texto da chamada diz o que acontece depois do clique ("ver os horários da semana", não "clique aqui")
- **Saída visível:** no e-mail, o link de descadastro no rodapé; no WhatsApp, "se não quiser receber, responde SAIR". Em toda mensagem, inclusive na primeira

Quebrar a estrutura entre mensagens. Se a 1 é um parágrafo com botão, a 2 é uma pergunta
de duas linhas, a 3 é uma história. Série em que toda mensagem tem o mesmo formato é a
cara mais reconhecível de automação.

Nome no campo dinâmico só se a ferramenta preenche com segurança. Sem nome é melhor que
"Olá, !".

**No WhatsApp**, a mensagem D+0 costuma cair dentro da janela de 24 horas da última fala
do cliente; as seguintes, não. Fora da janela, a API oficial só manda modelo aprovado
pela Meta, com texto fixo e variáveis numeradas. Escrever as mensagens D+2 em diante já
nesse formato, com `{{1}}` no lugar do nome e do dado variável, e avisar que o texto passa
por aprovação. Formato e tom do canal seguem o `/whatsapp`.

**No e-mail**, o texto sai aqui em markdown. Se alguma mensagem precisa de layout (foto
de produto, botão com a cor da marca), ela vai pro `/email`, uma de cada vez, com o texto
pronto daqui.

### Passo 5 — Escrever o arquivo

```markdown
# Sequência — <tipo> — <AAAA-MM-DD>

Canal: [e-mail / WhatsApp / os dois, com o que vai em cada um]
Ferramenta: [Mailchimp / RD Station / ActiveCampaign / Brevo / ManyChat / manual]
Entram por mês: [número que o usuário deu, ou "[a confirmar]"]
Deu certo quando: [comprou / agendou / respondeu / pediu orçamento]

## Para que serve
[Uma frase: quem entra, o que a série quer, o que conta como deu certo.]

## Onde a pessoa entrou e o que ela aceitou
[origem do contato (qual formulário, qual isca, qual conversa), o que foi prometido
ali, a base legal anotada, e a data desde quando esse registro existe]

## A série
| # | Gatilho | Atraso | Data | Dia | Objetivo | Chamada | Sai se |
|---|---|---|---|---|---|---|---|
| 1 | entrou na lista | D+0 | 21/09/2026 | seg | ... | ... | ... |

Sai da série inteira quando: [comprou / respondeu / pediu pra sair / e-mail voltou]

## Mensagens

### 1 — <objetivo em três palavras>
- **Gatilho:** ...
- **Atraso:** D+0
- **Assunto A:** ...
- **Assunto B:** ...
- **Preheader:** ...
- **Chamada:** <texto do botão ou pergunta> → <URL ou "responder">
- **Sai se:** ...

[corpo pronto pra copiar, na voz do usuário]

[linha de saída: descadastro ou "responde SAIR"]

### 2 — ...

## Se a pessoa responder
[o que dizer nos três desfechos mais prováveis: interessada, "depois", "não quero"]

## Como colocar na ferramenta
[um passo por mensagem, com o nome do bloco na ferramenta dele; ou os itens de tarefas.md pra envio manual]

## Medição (preencher depois de dois ciclos ou 50 pessoas)
| # | Entregues | Abertos | Cliques ou respostas | Conversões | Saídas |
|---|---|---|---|---|---|
| 1 | | | | | |

Regra de corte: mensagem sem clique nem resposta em dois ciclos sai ou muda de objetivo.
```

Os campos de gatilho, atraso, chamada e saída de cada mensagem são o que a ferramenta
pede na tela. Deixar os seis sempre preenchidos: é o que faz o arquivo caber em qualquer
uma delas sem reescrever.

### Passo 6 — Verificar antes de entregar

Série é a peça que mais se repete: um erro sai pra todo mundo que entrar, por meses.

```bash
node scripts/verificar.js texto vendas/sequencias/<tipo>-<data>.md
node scripts/verificar.js datas vendas/sequencias/<tipo>-<data>.md
grep -n "\[a confirmar\]\|\[preencher" vendas/sequencias/<tipo>-<data>.md
```

O primeiro mede ritmo e clichê. Já o segundo confere que cada data bate com o dia da
semana escrito ao lado, e só faz sentido quando a série tem data. Com o terceiro aparece
o que ainda depende do usuário: prazo, valor, link. Nada disso sai pra ferramenta com o
marcador dentro.

Conferir à mão, uma vez por mensagem: **uma chamada, uma saída visível, um objetivo.**
Mensagem com dois links é reescrita, não entregue.

### Passo 7 — Entregar e ligar na ferramenta

```
✓ vendas/sequencias/<tipo>-<data>.md — [N] mensagens, [canal], gatilho: [evento]

Antes de ligar: manda a série pra você mesmo e lê no celular, na ordem, com o
intervalo real se der. É o único jeito de sentir o ritmo.
```

Depois, o mapeamento pra ferramenta dele, na seção "Como colocar na ferramenta" do
arquivo. O nome do bloco muda por ferramenta e por versão; a tabela do molde tem os nomes
usuais, e cada um fica `[a confirmar]` até o usuário ver a tela. A lógica não muda: um
passo por mensagem, o atraso entre eles, e a regra "sair da automação quando" com a
condição de saída. Um exemplo do que a seção precisa dizer, pra RD Station:

> 1. Fluxos de automação → novo fluxo → gatilho de entrada: "converteu no formulário X"
> 2. Enviar e-mail: mensagem 1 (colar assunto A, preheader e corpo)
> 3. Aguardar: 1 dia
> 4. Enviar e-mail: mensagem 2
> 5. Condição de saída do fluxo: "converteu em [evento que conta como deu certo]"

O usuário leigo trava no primeiro nome de bloco que não bate com a tela. Por isso cada
passo diz o que colar e de onde, e não só "configure a automação".

No e-mail, acima de 5.000 envios por dia pro mesmo domínio, avisar o que precisa estar
configurado na ferramenta, não no texto: SPF e DKIM com DMARC publicado, descadastro em
um clique (RFC 8058) processado em até dois dias, taxa de spam abaixo de 0,3%. Os detalhes
estão em `templates/design/email-html.md`. Abaixo desse volume nada disso é bloqueio, mas
tudo continua valendo como higiene.

Envio manual (WhatsApp comum, ou e-mail um a um): cada envio vira um item em `tarefas.md`,
na seção "Esperando resposta", com a data calculada no Passo 3. Série que depende de
memória não acontece.

### Passo 8 — Medir e cortar

Marcar em `tarefas.md` a revisão da série pra daqui a duas semanas. Na revisão, o usuário
traz os números por mensagem da ferramenta, a skill preenche a tabela de medição e calcula
a taxa de cada mensagem por comando, nunca de cabeça:

```bash
sed -n '/^## Medição/,$p' vendas/sequencias/<tipo>-<data>.md \
  | awk -F'|' '$2+0 > 0 && $3+0 > 0 {printf "mensagem %d: %.1f%% de clique ou resposta, %.1f%% de conversão, %.1f%% de saída\n", $2, 100*$5/$3, 100*$6/$3, 100*$7/$3}'
```

A taxa é sobre entregues, não sobre enviados: quem não recebeu não decidiu nada.

Abertura é métrica fraca desde que o Apple Mail passou a pré-carregar imagem: serve pra
comparar mensagens entre si, não como valor absoluto. Clique, resposta e conversão são a
régua. O que se olha é a queda de uma mensagem pra outra: queda brusca entre a 2 e a 3
diz que a 3 tem problema, ou que a 2 prometeu algo que a 3 não entregou.

Mensagem sem clique nem resposta em dois ciclos sai ou muda de objetivo. Nunca se
acrescenta mensagem pra compensar uma que não funciona. Série boa encolhe com o tempo.

---

## Regras

- **Nunca escassez falsa.** "Últimas vagas" numa série que roda pra todo mundo, todo dia, é mentira programada. Prazo só entra quando é real e é o mesmo pra quem lê; se a série é contínua, não tem "só hoje"
- **Sempre caminho de saída, em toda mensagem, inclusive na primeira.** No e-mail é o link de descadastro no corpo mais os cabeçalhos na ferramenta; no WhatsApp é a frase de SAIR. Quem sai, sai de todas as séries, e no mesmo dia
- **Uma chamada por mensagem.** Dois links ou duas perguntas na mesma mensagem recebem metade de cada um, ou nenhum. Se precisa de duas ações, são duas mensagens
- **Uma objeção por mensagem de nutrição**, tirada de `_memoria/publico.md`. Mensagem que tenta responder três objeções não responde nenhuma
- **Nunca inventar prova.** Depoimento, número e caso vêm de `biblioteca.md` ou do usuário. Sem material, a mensagem de prova fica com `[preencher: qual caso?]` e a pergunta volta pra ele
- **Nunca prometer prazo, valor ou condição que o usuário não confirmou.** Fica `[a confirmar]` até ele confirmar, e o Passo 6 impede que saia assim
- **Medir por mensagem e cortar.** Série que não é revisada em duas semanas vira ruído fixo. Regra de corte no Passo 8
- **Não reescrever série que funciona.** Se já roda e tem número, mudar uma mensagem por vez, a pior primeiro
- **Lista de contato é dado pessoal (LGPD).** Só entra em série quem deu o contato sabendo o que ia receber; origem e data ficam anotadas no arquivo. Lista comprada ou raspada não entra, e a skill recusa desenhar pra ela. Base antiga sem registro de aceite recebe uma mensagem de repermissão, e entra quem respondeu. A base de contatos não vai pra ferramenta externa sem o usuário autorizar
- **Base legal não é parecer jurídico.** A skill anota a origem e sugere a base que costuma valer; quem confirma é o contador ou o advogado do usuário, e o arquivo diz isso
- **No WhatsApp, disparo pra quem não pediu bane o número**, e o número leva junto histórico, grupos e catálogo. Volume só pela API oficial, com modelo aprovado e opt-in registrado
- **A skill entrega o arquivo; quem liga a automação é o usuário**, na ferramenta dele. Nada aqui envia mensagem
- **Fronteira:** o texto de um e-mail avulso é `/email-profissional`; o HTML de um e-mail da série é `/email`; as mensagens soltas de cada situação de cliente são `/pos-venda`; o formato do canal e o kit de respostas são `/whatsapp`; a conversa de venda ao vivo é `/vender`; a página que captura o contato é `/landing`. Se o cliente reclamou no meio da série, a série para pra ele e o caso vira atendimento
