---
name: prospeccao
description: >
  Monta a lista qualificada de quem ainda não é cliente: desenha o perfil ideal a partir dos
  melhores clientes atuais e de `_memoria/publico.md`, diz onde achar (Google Maps, Instagram,
  LinkedIn, associação, indicação, lista pública), pontua cada nome com critério de corte, e
  escreve a abordagem fria por canal com três follow-ups e fim elegante. Entrega a planilha de
  prospecção, as mensagens em variantes e a rotina semanal com meta calculada.
  Use quando o usuário disser "preciso de cliente novo", "como eu acho cliente",
  "quero prospectar", "mandar mensagem fria", "abordar empresa que não me conhece",
  "lista de prospects", "quem eu deveria procurar", "tô sem cliente e ninguém me chama",
  "quantos contatos por dia", ou /prospeccao.
---

# /prospeccao — Gerar a conversa

> **Convenção de pastas:** a saída vai em `vendas/prospeccao/`. Na convenção **por cliente**, a prospecção da própria casa fica na raiz (`vendas/prospeccao/`) e a feita em nome de um cliente vai em `clientes/<Nome>/vendas/prospeccao/`. A pasta nasce na primeira lista.

Quem depende de indicação vive em ciclo: mês cheio, mês vazio, e nenhum controle sobre
qual vem. Prospecção é o que troca esse ciclo por uma torneira: abre quando precisa, fecha
quando a agenda lota. O problema é que quase todo mundo começa pela mensagem e nunca pela
lista, e aí manda 200 textos iguais pra gente que nunca ia comprar, gasta a semana inteira
nisso e conclui que prospecção não funciona. Funciona. Só que a ordem é outra: primeiro
quem, depois onde, só então o quê. Lista primeiro. Mensagem depois.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, região, canal em que atende, tempo disponível
- **Tom:** `_memoria/preferencias.md` — mensagem fria com voz de redator vai pro lixo em dois segundos
- **Cliente real:** `_memoria/publico.md`, se existir — a dor na palavra dele vira o gancho; o gatilho de compra vira o sinal de dor
- **Oferta:** `_memoria/oferta.md`, se existir — a frase de valor sai daqui, não da cabeça
- **Concorrentes:** `pesquisa/concorrentes-*.md`, se existir (`/concorrente`) — a reclamação repetida nas avaliações deles é gancho pronto
- **Prova:** `biblioteca.md` — o caso parecido que entra no segundo follow-up
- **Exclusão:** `vendas/prospeccao/nao-contatar.md`, se existir — quem pediu pra não receber; nenhuma lista nasce sem ler
- **Molde:** `templates/crescimento/prospeccao.md` — perfil ideal, pontuação, estrutura da mensagem, LGPD por tipo de contato, limites por canal
- **Referência de copy:** `templates/copy/humanizacao.md` — o que denuncia texto de máquina numa mensagem de 60 palavras
- **Verificação:** `node scripts/verificar.js tabela` (cadência), `csv` (a lista), `datas` (a agenda de follow-up), `texto` (as mensagens); a pontuação e a meta reversa têm comando próprio nos Passos 3 e 5
- **Saída:** `vendas/prospeccao/<segmento>-<AAAA-MM-DD>.md` e, quando o usuário pedir, `vendas/prospeccao/<segmento>-<AAAA-MM-DD>.csv`

---

## Workflow

### Passo 1 — Levantar o que existe

É levantamento, então vai numa mensagem só. Ler `empresa.md`, `publico.md` e `oferta.md`
antes, e perguntar só o que não está lá:

> 1. "Quais foram os três melhores clientes que você já teve? Não os maiores: os que pagaram sem reclamar, indicaram alguém e deram pouco trabalho. O que eles têm em comum?"
> 2. "Onde você consegue falar com esse tipo de gente hoje? (e-mail, LinkedIn, WhatsApp comercial, Instagram, bater na porta)"
> 3. "Quantas horas por semana você consegue dedicar a isso, sem furar?"
> 4. "Quantos clientes novos por mês resolvem o seu problema agora?"
> 5. "Já tentou abordar frio antes? O que aconteceu?"

A resposta da pergunta 1 vale mais que qualquer pesquisa de mercado, porque descreve o cliente
que já pagou, já indicou e já provou que o negócio resolve o problema dele. A da 5 mostra o
que não repetir. Ler as duas com atenção.

Se `publico.md` não existe e o usuário não sabe responder a 1, oferecer `/publico` uma vez.
Se ele preferir seguir, seguir com o que tem e marcar `[a confirmar]` no perfil.

Antes de ir adiante, uma checagem que muda tudo: **o cliente ideal é empresa ou pessoa
física?** Nutricionista que atende pessoa, personal, advogado de família, loja de roupa:
o cliente é pessoa física, e pessoa física que nunca teve contato com o negócio não se
aborda fria (o molde explica a base legal). Nesse caso a skill para aqui e diz o
caminho que gera o contato com consentimento: `/ideias` e `/calendario` pra conteúdo,
`/anuncio-google` pra anúncio, `/indicacao` pra indicação, `/lancamento` pra evento com
cadastro. Se o mesmo negócio também vende pra empresa (a nutricionista que atende
academia, o advogado que atende construtora), a prospecção segue só pra essa ponta.

### Passo 2 — Desenhar o perfil ideal

Cruzar o que os três melhores clientes têm em comum com `publico.md` e fechar os cinco
critérios do molde: segmento, tamanho, sinal de dor, acesso, região ou canal.

```markdown
## Perfil ideal
| Critério | O que bate (2 pts) | Bate em parte (1 pt) | Não bate (0) |
|---|---|---|---|
| Segmento | ... | ... | ... |
| Tamanho | ... | ... | ... |
| Sinal de dor | ... | ... | ... |
| Acesso | ... | ... | ... |
| Região / canal | ... | ... | ... |
```

O **sinal de dor** é o critério que o usuário quase nunca traz sozinho, e é o que separa
lista morna de lista quente. Perguntar: "o que, visto de fora, mostra que a empresa está
com esse problema agora?" Vaga aberta, unidade nova, reclamação pública, troca de sócio,
mudança de endereço. Se a resposta for "nada, não dá pra ver", o critério vira `[a
confirmar]` e a lista se apoia nos outros quatro.

Mostrar o perfil e confirmar antes de ir buscar nome. Perfil errado gera lista inteira
errada, e pesquisar 40 nomes custa uma tarde. Confirmar custa um minuto.

### Passo 3 — Montar a lista

Escolher as fontes pelo tipo de negócio, usando a tabela do molde. Negócio local vai de
Google Maps e associação; B2B com decisor identificável vai de LinkedIn; quem vende pelo
perfil vai de Instagram. Indicação entra em todos.

Pra cada fonte, dizer ao usuário exatamente o que fazer e o que anotar:

> "No Google Maps, busca `clínica odontológica em <bairro>`. Abre uma por uma. De cada
> uma, anota: nome, telefone que aparece como comercial, site, nota e o que a avaliação
> mais recente reclama. Vinte nomes já dão pra começar."

A coleta é à mão ou por WebSearch, um nome de cada vez. Nada de ferramenta que raspa o
Maps ou o LinkedIn em massa: viola os termos, sai com dado velho e a plataforma bloqueia a
conta. Base comprada não entra. O usuário pode trazer a lista pronta (planilha, contatos
do celular, cartões de feira), e aí o trabalho é qualificar.

Antes de anotar o primeiro nome, ler `vendas/prospeccao/nao-contatar.md`, se existir. Quem
pediu pra não receber não entra em lista nenhuma, nem por outro canal.

Cada nome recebe de 0 a 2 pontos em cada um dos cinco critérios, numa tabela própria, com
a soma na última coluna:

```markdown
## Pontuação
| Nome | Segmento | Tamanho | Sinal de dor | Acesso | Região | Pontos |
|---|---|---|---|---|---|---|
| Clínica Sorriso | 2 | 2 | 2 | 1 | 2 | 9 |
```

A soma é conferida por comando, não de cabeça. Com 40 linhas, um erro de soma passa
por qualquer leitura:

```bash
sed -n '/^## Pontuação/,/^## Lista/p' vendas/prospeccao/<segmento>-<AAAA-MM-DD>.md \
  | awk -F'|' 'NF>=8 && $3 ~ /^ *[0-9]+ *$/ { s=$3+$4+$5+$6+$7; if (s != $8+0) printf "%s: soma %d, declarado %d\n", $2, s, $8; else n++ } END { print n+0 " nomes conferidos" }'
```

Cada linha que ele acusar se refaz a partir dos critérios, nunca ajustando o total.
Abaixo de 5 sai da lista. O que fica é ordenado do maior pro menor e vai pra lista
qualificada.

Pros que pontuaram 8 ou mais, pesquisar o **gancho**: uma coisa concreta que só quem
olhou o negócio dele saberia. O post da semana passada, a unidade nova, a vaga, a
reclamação repetida. Um gancho por nome, na coluna. Sem gancho, o nome desce pra morno e
recebe a variante padrão, que troca o gancho individual por um gancho de segmento: algo
que o usuário sabe do grupo por experiência própria e confirma antes de entrar no texto
("das clínicas com duas unidades que atendo, quase todas descobriram o problema X na
primeira apuração"), não um elogio.

Mínimo pra valer a rotina: 30 nomes acima do corte. Com menos, a semana acaba antes da
lista, o usuário fica sem ter pra quem mandar na quinta-feira e a rotina morre ali. Trinta é o piso.

### Passo 4 — Escrever a abordagem por canal

Uma mensagem fria tem três partes e mais nada: gancho específico, uma frase de valor,
pergunta fácil. A frase de valor vem de `oferta.md`; o gancho vem da coluna da planilha;
a pergunta se responde com sim, não ou um nome. O molde lista o que denuncia spam na
primeira linha, e nenhum item daquela lista entra.

Escrever pro canal que o usuário usa de verdade, em **duas variantes** (uma mais seca, uma
mais próxima) pra ele escolher com a própria voz:

| Canal | Tamanho | O que muda |
|---|---|---|
| **E-mail** | 50 a 90 palavras, assunto de até 6 palavras sem "proposta" nem "parceria" | Assinatura curta com um jeito de conferir quem ele é (site ou perfil). Sem anexo, sem link encurtado |
| **LinkedIn** | Convite sem nota ou com nota de 1 linha; a mensagem só depois do aceite | O gancho é o que ele publicou. Sem pedir reunião na primeira |
| **WhatsApp** | 30 a 60 palavras, uma pergunta | Só pro número que ele expôs como comercial, ou que veio por indicação com nome de quem indicou. O `/whatsapp` calibra o formato |
| **Visita** | Roteiro de 90 segundos falado | Chegar fora do pico do negócio dele, deixar algo de valor (não o cartão: uma amostra, um diagnóstico de uma página), pedir o melhor horário pra voltar |

Pra calibrar o registro, um e-mail que segue as três partes (contador escrevendo pra
clínica; os fatos são ilustrativos, cada mensagem real usa o gancho da planilha):

> **Assunto:** unidade do Cambuí
>
> Vi que a Sorriso abriu a unidade do Cambuí em agosto. Cuido do fiscal de clínicas com
> mais de uma unidade, que é quando o Simples começa a apertar. Faz sentido eu te mandar
> em duas linhas o que muda com a segunda unidade?
>
> Ana Prado · contadora de clínicas · anaprado.com.br

Quarenta e quatro palavras no corpo (contadas com `wc -w`), sem "meu nome é", sem "espero que esteja bem", sem pedir
reunião. A pergunta se responde com "manda". A variante B é a mesma coisa em tom mais
próximo, do jeito que o usuário fala no balcão; a diferença é temperatura, não conteúdo.

Depois da primeira mensagem, os três follow-ups do molde, com data:

1. **3 a 4 dias depois:** uma linha nova na mesma conversa, sem repetir o texto. "Só subindo isso na caixa: a pergunta é se vale eu mandar as duas linhas"
2. **7 dias depois do 1º:** informação nova. Caso parecido da `biblioteca.md`, dado do setor com fonte, algo que ele publicou. "Uma clínica que atendo passou pelo mesmo em [ano]: [o que aconteceu, em uma frase, da biblioteca.md]. Tenho o que ela fez, se quiser"
3. **10 a 14 dias depois do 2º:** fim elegante. "Vou parar por aqui pra não encher a tua caixa. Se fizer sentido mais pra frente, é só chamar." E parar de verdade

O caso do segundo follow-up só entra se existe em `biblioteca.md` ou o usuário contou
com nome e data. Sem caso real, o segundo leva um dado do setor com fonte, ou pula pra
uma pergunta diferente da primeira. Caso inventado pra parecer experiente é o jeito
mais rápido de perder o cliente na primeira reunião.

Os prazos são ponto de partida: segmento que decide rápido aceita intervalo menor;
segmento que decide em comitê pede maior. Ajustar com o usuário, e o `verificar.js datas`
confere o dia da semana quando a agenda entra no arquivo.

A seção **Se ele responder** cobre os três desfechos mais prováveis, e cada um tem uma
regra:

- **Interessado** ("manda", "como funciona?"): responder no mesmo dia com o que prometeu na pergunta fácil, nada além, e propor o próximo passo em uma linha. Daqui em diante é `/vender`
- **"Agora não"**: agradecer, perguntar se pode voltar em uma data (ele escolhe), anotar em `tarefas.md`. Sem contra-argumentar. Quem disse "agora não" e foi respeitado tende a abrir a porta na segunda vez
- **"Manda mais informação"**: quase sempre é um "não" educado. Mandar o mínimo que responde (uma página, não um PDF de 12), e fechar com uma pergunta que exige posição: "faz sentido pra vocês esse ano ou é assunto do ano que vem?"

Passar cada mensagem pelo `node scripts/verificar.js texto` num arquivo temporário. Numa
mensagem de 60 palavras, um clichê é o texto inteiro. Não passa.

### Passo 5 — Fechar a rotina e a meta

A meta se calcula de trás pra frente, e não existe taxa de referência universal: o único
número que vale é o do próprio negócio, medido no canal dele, com a lista dele e a mensagem
dele. Nas duas primeiras semanas, a rotina roda pra **medir**. Só depois a meta vira número.
Medir vem antes.

```
contatos por mês    = clientes desejados por mês ÷ (resposta × reunião × fechamento)
contatos por semana = contatos por mês ÷ 4,3
```

Enquanto as taxas não existem, escrever a conta com o que o usuário chuta, marcado como
hipótese, e mostrar o que muda se a taxa for metade. Exemplo, com hipótese declarada: se
10 em 100 respondem, 4 desses marcam conversa e 1 fecha, são 100 contatos por cliente.
Com 5 respostas em vez de 10, são 200. Esse intervalo é o que decide se a meta cabe nas
horas da pergunta 3 do Passo 1. A conta se roda, com as taxas declaradas no próprio
comando pra ficarem visíveis no arquivo:

```bash
node -e 'const c=2, r=0.10, m=0.40, f=0.25; const mes=Math.ceil(c/(r*m*f));
console.log("por mês:", mes, "· por semana:", Math.ceil(mes/4.3), "· se a resposta cair pela metade:", Math.ceil(c/(r/2*m*f)), "por mês")'
```

A cadência distribui os contatos nos dias que ele disse ter, com o limite do canal (o
molde tem a régua conservadora de cada um). Prospecção que não cabe na agenda não
acontece; é melhor 6 contatos por dia que se cumprem do que 20 que param na quarta-feira.
Contato novo custa mais que follow-up: pesquisar o gancho, escrever, conferir. O tempo
por contato é hipótese até o usuário cronometrar uma tarde real na primeira semana, e
entra no arquivo marcado assim.

```markdown
## Rotina semanal
| Dia | Contatos novos | Follow-ups | Total |
|---|---|---|---|
| Segunda | 6 | 4 | 10 |
| Terça | 6 | 4 | 10 |
| Quarta | 6 | 4 | 10 |
| Quinta | 6 | 4 | 10 |
| Sexta | 0 | 8 | 8 |
| Total | 24 | 24 | 48 |

Tempo por contato novo: [X] min · por follow-up: [Y] min [hipótese até cronometrar]
```

A tabela é exemplo de formato; os números saem das horas do usuário. Conferir por
comando antes de entregar, duas vezes:

```bash
# a tabela: soma cada coluna e compara com a linha Total
node scripts/verificar.js tabela vendas/prospeccao/<segmento>-<AAAA-MM-DD>.md
# a agenda: horas que a rotina consome contra as horas declaradas
node -e 'const novos=24, fu=24, minNovo=12, minFu=3, declaradas=6; const h=(novos*minNovo+fu*minFu)/60;
console.log("precisa de", h.toFixed(1), "h ·", h<=declaradas ? "cabe" : "NÃO cabe nas " + declaradas + " h")'
```

O `tabela` também soma a coluna "Pontos" da lista e outras colunas sem total, e imprime
o resultado como informação; só a linha marcada com erro importa. Se a rotina não cabe,
refazer a partir das horas declaradas, reduzindo contatos novos primeiro (cortar
follow-up joga fora o trabalho já feito), nunca ajustando o número pra bater.

Sexta é dia de follow-up e de medir: quantos mandou, quantos responderam, quantos
marcaram. Esses três números entram no fim do arquivo toda semana, e são a linha de
vendas da `/revisao-semanal`: apontar esse arquivo quando ela rodar, porque ela varre
`tarefas.md` e `propostas/`, não `vendas/`.

### Passo 6 — Entregar o arquivo e a planilha

```markdown
# Prospecção — <segmento> — <data>

## Perfil ideal
[tabela de critérios do Passo 2]

## Onde achar
| Fonte | O que buscar | O que anotar |
|---|---|---|

## Pontuação
[tabela do Passo 3, todos os nomes coletados, conferida por comando]

## Lista qualificada
| Nome | Empresa | Canal | Pontos | Por que ele | Gancho | Fonte | Status | Próximo contato |
|---|---|---|---|---|---|---|---|---|

## Mensagens
### <Canal> — primeira mensagem — variante A
[texto pronto pra copiar]
### <Canal> — primeira mensagem — variante B
[texto pronto pra copiar]
### Follow-up 1 · 2 · 3
[um texto por follow-up, com o dia em que sai]

## Se ele responder
[o que dizer nos 3 desfechos mais prováveis: interessado, "agora não", "manda mais informação"]

## Rotina semanal
[tabela de cadência, conferida por comando]

## Meta
[a conta reversa, com as taxas marcadas como hipótese até a segunda semana]

## Medição
| Semana | Enviados | Respostas | Conversas | Fechados |
|---|---|---|---|---|
```

A coluna **Status** usa quatro valores, e só esses: `a contatar`, `contatado`, `respondeu`,
`encerrado`. A **Fonte** diz de onde veio o contato; se o titular perguntar, a resposta
está lá. **Próximo contato** é data, não "semana que vem".

Quando o usuário pedir a planilha, gerar o `.csv` com as mesmas colunas, separado por
vírgula, campo com vírgula entre aspas, e conferir:

```bash
node scripts/verificar.js csv vendas/prospeccao/<segmento>-<AAAA-MM-DD>.csv
```

Ele acusa linha com número de campos diferente do cabeçalho, que é o que acontece quando
"Clínica Sorriso, unidade 2" entra sem aspas. Corrigir e rodar de novo até passar. Se o
usuário quer abrir no Excel com filtro e cor por status, é o `/planilha`, que gera o
`.xlsx` a partir dessa mesma lista. Os follow-ups com data entram no `tarefas.md`:
follow-up que depende de memória não acontece.

### Passo 7 — Fechar o ciclo

Quando alguém responde com interesse, a `/prospeccao` acabou pra aquele nome. A conversa é
o `/vender`, e o status vira `respondeu`. Quando alguém pede pra não receber, o nome vai
pra `vendas/prospeccao/nao-contatar.md` na hora, e a próxima lista consulta esse arquivo
antes de nascer.

No fim da segunda semana, ler a tabela de medição e ajustar:

- **Resposta baixa com lista boa:** o gancho está genérico. Reescrever com mais pesquisa
- **Resposta boa, reunião baixa:** a pergunta fácil está pedindo demais. Trocar por uma que custa três segundos
- **Reunião boa, fechamento baixo:** o problema não é aqui. É `/oferta` ou `/vender`
- **Objeção que se repete** na resposta fria vai pra `_memoria/publico.md`: é a mesma que vai aparecer na landing e na proposta

---

## Regras

- **Lista antes de mensagem.** Nunca escrever abordagem sem perfil ideal confirmado e pelo menos 30 nomes acima do corte. Mensagem perfeita pra lista errada é tempo perdido dos dois lados
- **Abaixo de 5 pontos não recebe mensagem.** O tempo que iria pro frio é o que falta pra pesquisar o gancho do quente
- **Gancho é fato, não elogio.** "Vi que abriu a unidade do Cambuí" funciona; "adorei o seu trabalho" é o que todo spam diz. Sem gancho verificável, o nome desce pra morno
- **Nunca inventar gancho, número ou caso.** Se não achou nada específico sobre o prospect, a mensagem é a variante padrão, com `[preencher: gancho]` visível, não uma pesquisa fingida
- **Sem escassez falsa, sem relação fingida.** "Só 3 vagas esse mês", "como conversamos", "fulano me passou seu contato" quando não é verdade: cada uma dessas fecha a porta pra sempre com quem descobre, e quem não descobre não era cliente. Se existe limite real de agenda, dizer o número real
- **Sem promessa de resultado.** "Vou dobrar seu faturamento" não entra nem na variante mais quente. A frase de valor diz o que o negócio faz e pra quem, na palavra da `oferta.md`
- **Três follow-ups e acabou.** O quarto contato queima a marca e a chance futura. O nome só volta com sinal novo, e aí recomeça do gancho
- **Opt-out vale na hora, em todos os canais.** "Não quero receber" encerra a sequência, o nome vai pra `nao-contatar.md`, e nenhuma lista futura passa por cima disso
- **B2C frio não se aborda.** Pessoa física que nunca teve contato com o negócio precisa de consentimento (LGPD, art. 7º, I). O caminho é gerar o contato: conteúdo, anúncio, evento, indicação. Se o usuário insistir, dizer o risco uma vez e não escrever a mensagem
- **B2B frio vai por legítimo interesse, com condições.** Dado de fonte pública ou do site dele, assunto ligado à atividade da empresa, canal que ele expôs como comercial, e jeito claro de sair. Celular pessoal que ele não expôs não entra; vai por indicação ou visita
- **Sem raspagem, sem base comprada, sem automação de convite.** Cada uma dessas custa a conta, o domínio ou os dois. A coleta é à mão ou por WebSearch, e a plataforma mede proporção de bloqueio, não volume
- **Limites de envio são régua da plataforma, não lei.** Os números do molde são prática conservadora; a plataforma muda sem avisar. Quando o usuário for escalar, conferir por WebSearch na hora, e marcar `[a confirmar]` no arquivo até lá
- **Taxa de conversão não tem referência universal.** Toda meta nasce como hipótese declarada e vira número na segunda semana, com o dado do próprio negócio. Nunca apresentar "a média do mercado é X%" sem fonte datada
- **Cadência cabe na agenda ou não existe.** A tabela da semana respeita as horas que o usuário declarou. Se a meta não cabe, a conversa é sobre reduzir a meta ou o escopo, não sobre trabalhar de madrugada
- **Toda conta sai do comando.** A pontuação de cada nome pelo `awk` do Passo 3; a cadência pelo `verificar.js tabela`; a meta reversa e o encaixe na agenda pelos `node -e` do Passo 5; a lista pelo `verificar.js csv`; as datas pelo `verificar.js datas`; as mensagens pelo `verificar.js texto`. Número que diverge se refaz do dado bruto
- **Setor regulado tem regra própria.** Saúde, jurídico, contábil e financeiro têm conselho de classe com limite pra abordagem comercial. Conferir antes de escrever, e marcar `[a confirmar]` o que não deu pra confirmar
- A lista é dado pessoal. Nome, e-mail nominal e celular do decisor não vão pra ferramenta externa sem autorização explícita do usuário, e a planilha fica em `vendas/prospeccao/`, nunca em anexo de mensagem
- Quem já é cliente não está nessa lista. Se um nome da coleta aparece em `empresa.md` ou no histórico de `vendas/`, sai da prospecção e vai pro `/pos-venda`, que é outra conversa e outra base legal
- **Fronteira com as vizinhas:** `/publico` descobre quem é o cliente e como ele fala; `/concorrente` mapeia quem disputa o mesmo cliente; a `/prospeccao` usa os dois pra gerar a conversa com quem ainda não conhece o negócio. Quando a pessoa responde com interesse, é `/vender`. Quem já comprou ou já pediu orçamento é `/pos-venda`. O formato da mensagem no WhatsApp é `/whatsapp`; o e-mail longo pra um contato específico é `/email-profissional`. O programa que faz cliente trazer cliente é `/indicacao`; a `/prospeccao` só usa a indicação como fonte da lista. Série automatizada pra quem se cadastrou é `/sequencia`; o follow-up daqui é manual, um a um, pra quem nunca pediu pra receber. A lista em `.xlsx`, com filtro e cor, é `/planilha`
