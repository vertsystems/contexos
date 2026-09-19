---
name: parcerias
description: >
  Encontra o parceiro complementar do negócio (mesmo público, produto diferente) e desenha a
  ação conjunta: o que cada um dá e leva, o formato (combo, sorteio, evento, conteúdo cruzado,
  desconto cruzado, indicação mútua), como medir e a mensagem de proposta. Cobre também criador
  e influenciador local: como escolher pelo engajamento real, briefing de uma página, o que
  pedir de entrega, valor ou permuta e o contrato mínimo.
  Use quando o usuário disser "quero fazer uma parceria", "conhece alguém pra fazer uma ação
  junto", "quero fechar com uma influenciadora da cidade", "quanto pago pra um influenciador",
  "vale a pena mandar produto pra criador", "quero fazer um sorteio com outra loja",
  "como proponho uma parceria", "combo com a loja do lado", "quero um criador de conteúdo
  local", "briefing pra influencer", ou /parcerias.
---

# /parcerias — Crescer com quem já tem o seu cliente

> **Convenção de pastas:** a saída vai em `parcerias/`. Na convenção **por cliente**, `clientes/<Nome>/parcerias/`. A pasta nasce na primeira parceria.

O cliente da padaria da esquina passa todo dia na frente da academia, e a academia gasta
com anúncio pra alcançar exatamente essa pessoa. Parceria é isso: em vez de pagar pra
chegar num público, chegar por quem já o tem. É o canal mais barato que um negócio local
pode ter, e o mais desperdiçado, porque quase sempre fica no "a gente devia fazer algo
junto" e nunca vira ação com data, cupom e conta no fim.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que vende, onde fica, ticket, época fraca do ano
- **Cliente real:** `_memoria/publico.md` — é o que decide se o público do parceiro bate ou só parece bater
- **Oferta:** `_memoria/oferta.md`, se existir — o que pode virar combo ou desconto sem estragar a margem
- **Tom:** `_memoria/preferencias.md` — a proposta sai na voz do usuário, não na de agência
- **Concorrência:** o comparativo do `/concorrente`, se existir — evita propor parceria com quem disputa o mesmo real
- **Margem:** o fechamento do `/caixa`, se existir — desconto cruzado sem margem é prejuízo dividido
- **Molde:** `templates/crescimento/parcerias.md` — tipos, critérios, conta de engajamento, briefing, cláusulas e a regra de identificação de publicidade
- **Ferramentas:** WebSearch e WebFetch pra mapear candidatos e ler avaliação; `node -e` pra toda conta
- **Saída:** `parcerias/<parceiro-slug>-<AAAA-MM-DD>.md` (um arquivo por parceiro ou criador)

---

## Workflow

### Passo 1 — Descobrir o objetivo antes do parceiro

Quase todo mundo chega com o parceiro na cabeça ("a loja do lado") e sem saber o que
quer da ação. Perguntar uma coisa por vez, e a primeira é sempre essa:

> "O que precisa acontecer pra essa parceria ter valido a pena? Cliente novo, vender o
> que está parado, encher a agenda de um mês fraco, lançar alguma coisa?"

A resposta define o formato. Cliente novo pede indicação mútua ou desconto cruzado.
Estoque parado pede combo. Mês fraco pede evento. Lançamento pede criador. Sem essa
resposta, a skill não segue.

Depois, uma pergunta só pra escolher a trilha:

> "Você está pensando em outro negócio, tipo uma loja ou um profissional, ou em alguém
> que cria conteúdo e tem público?"

Negócio segue pro Passo 2 e vai até o 5. Criador pula pro Passo 6. As duas trilhas
terminam no Passo 7, que escreve o arquivo. Quando a ação junta uma loja parceira e um
criador pra divulgar, são as duas trilhas e um arquivo por parte envolvida.

### Passo 2 — Mapear candidatos

Se ele já tem alguém em mente, pontuar esse. Se não tem, montar a lista com ele:

> "Onde o seu cliente está uma hora antes ou uma hora depois de comprar de você?"

É a pergunta que revela o par complementar. A mãe que sai da pediatra vai pra escola;
o casal que fecha o fotógrafo já tem a cerimonialista; quem malha às 7h toma café às 8h.

Com o tipo definido, usar WebSearch pra listar de três a cinco candidatos reais do
bairro ou da cidade, e ler o que dá pra ler de cada um: a nota e os comentários
recentes no Google (WebFetch na página pública; se não abrir, pedir ao usuário um
print). Parceria com negócio mal avaliado empresta a má fama pra você. O que o usuário
já sabe do candidato ("o dono é gente boa, mas nunca responde") vale como dado, e vai
anotado como opinião dele.

Pontuar cada candidato na tabela do molde (público que bate, não compete, reputação,
capacidade de entregar, ganho claro pra ele), de 0 a 2 por critério. Somar por comando:

```bash
node -e 'const c={"Academia Corpo Vivo":[2,2,2,1,2],"Studio Pilates Ana":[2,2,1,1,1]}; for (const [n,v] of Object.entries(c)) console.log(n, "=", v.reduce((a,b)=>a+b,0), "de 10")'
```

Abaixo de 6, tirar da lista. Empate se resolve pelo quinto critério: se não dá pra
escrever em uma frase o que o parceiro ganha, ele não responde a mensagem.

### Passo 3 — Desenhar a ação

Uma mensagem só, com as opções que cabem no objetivo do Passo 1 (não a tabela inteira
do molde), e o que cada uma exige do usuário:

| Formato | Serve pra | O que o usuário precisa ter |
|---|---|---|
| Indicação mútua | cliente novo, custo zero | um jeito de registrar "quem te indicou" |
| Desconto cruzado | cliente novo, rápido de montar | margem que aguente o desconto |
| Combo | vender estoque parado, subir ticket | um preço fechado e quem entrega o quê |
| Conteúdo cruzado | público novo no perfil | tempo pra produzir junto |
| Evento conjunto | mês fraco, relação de longo prazo | espaço, data e quem organiza |
| Sorteio | seguidor e cadastro | autorização legal prévia e regra escrita |

Escolhido o formato, fechar o "dá e leva" em duas colunas:

```
O que a <Empresa> dá   → o que o parceiro leva
O que o parceiro dá    → o que a <Empresa> leva
```

Os dois lados precisam ficar com peso parecido. Se um dá desconto de 20% e o outro dá
um post, alguém vai se sentir usado no segundo mês.

**Sorteio tem freio.** Antes de desenhar sorteio, avisar que distribuição gratuita de
prêmio exige autorização federal prévia (Lei 5.768/1971), e que o órgão e o rito ficam
como `[a confirmar]` até o usuário checar com o contador ou por WebSearch em fonte
oficial datada. Se ele não quer a burocracia, trocar por desconto cruzado ou conteúdo
cruzado. A skill não desenha sorteio "do jeito que todo mundo faz".

### Passo 4 — Fechar a conta e a meta

Toda ação sai com um número pra bater e um jeito de contar, combinados antes de começar.
Nada disso se faz de cabeça:

```bash
# desconto cruzado: quanto sobra por venda com o desconto, e quantas vendas pagam a ação
node -e 'const preco=180, custoVar=64, desconto=0.15, custoAcao=300; const margem=preco*(1-desconto)-custoVar; console.log("margem por venda com desconto: R$", margem.toFixed(2)); console.log("vendas pra pagar a ação:", Math.ceil(custoAcao/margem))'
```

```bash
# combo: preço fechado, custo dos dois lados e como dividir
node -e 'const pA=90, cA=30, pB=70, cB=25, precoCombo=140; const custo=cA+cB, sobra=precoCombo-custo; const partA=sobra*(pA/(pA+pB)); console.log("sobra do combo: R$", sobra.toFixed(2)); console.log("parte de A: R$", partA.toFixed(2), "| parte de B: R$", (sobra-partA).toFixed(2))'
```

A divisão do combo é proporcional ao preço que cada um cobraria sozinho, salvo acordo
diferente. Escrever a regra no arquivo, com o número, porque é onde a parceria racha.

Como contar: cupom com o nome do parceiro, pergunta "quem te indicou?" registrada no
atendimento, ou contagem antes e depois. Contagem antes e depois só vale com a linha de
base fechada antes da ação começar, e ela também sai de comando:

```bash
# linha de base: média das 4 semanas anteriores, pra comparar com a semana da ação
node -e 'const semanas=[31,28,35,30]; const base=semanas.reduce((a,b)=>a+b,0)/semanas.length; console.log("média semanal antes da ação:", base.toFixed(1)); console.log("acima disso na semana da ação é efeito; abaixo, a ação não moveu")'
```

A meta é um número com data, e tem dois patamares escritos: o mínimo é o que paga a
ação (o "vendas pra pagar" do comando acima); o desejado é o usuário quem diz, e a skill
só confere se ele cabe no alcance do parceiro. Meta que ninguém sabe de onde veio não
entra no arquivo.

### Passo 5 — Escrever a proposta pro parceiro

Curta, na voz do usuário, no canal em que o parceiro atende (quase sempre WhatsApp, e o
formato segue o `/whatsapp`; se for e-mail, o `/email-profissional` calibra). A
estrutura:

1. Quem você é e por que ele: uma frase que mostre que você conhece o negócio dele
2. O que o cliente dele ganha
3. O que ele ganha, em uma frase
4. O que você está propondo, com o esforço dele explícito (duas horas, um post, um cartão no balcão)
5. Uma pergunta só, fácil de responder: "faz sentido a gente conversar 15 minutos essa semana?"

Entregar duas variantes com temperatura diferente: uma mais direta, pra quem o usuário
já conhece de vista, e uma mais apresentada, pra quem nunca ouviu falar dele. Sem
"oportunidade única", sem "sinergia", sem número de resultado que ainda não foi medido.
Junto, as três respostas prontas: se ele topou, a mensagem que marca a conversa e já
leva o "dá e leva" resumido; se disse "depois", uma data pra voltar e nada mais; se
ficou em silêncio, um follow-up em uma semana, e encerrar. Quem não responde duas
mensagens não vai executar uma parceria.

Segue pro Passo 7.

### Passo 6 — Trilha do criador local

Quatro decisões, uma por vez.

**6a. Escolher.** Pedir a lista de criadores que ele já olhou, ou mapear por WebSearch
(nome do bairro ou da cidade mais o nicho: "confeitaria Santo Amaro", "mãe de primeira
viagem Sorocaba"). A skill não entra no Instagram: quem abre os últimos 10 posts do feed
e anota curtidas, comentários e seguidores de cada perfil é o usuário, num print ou numa
lista. Com os números na mão, rodar a conta do molde (`templates/crescimento/parcerias.md`,
seção "A conta, por comando") e anotar a data da coleta. Medir três perfis do mesmo
tamanho e comparar entre si: a régua é relativa, não existe percentual mágico. Conferir
os sinais de seguidor comprado listados no molde. Pedir ao criador o print dos insights
com alcance dos últimos 30 dias e as cidades do público: quem não manda, não fecha.
O criador também passa pela tabela dos cinco critérios do Passo 2; "reputação" aí é o
que as marcas anteriores dizem dele, e "capacidade de entregar" é prazo cumprido.

**6b. Definir valor ou permuta.** Nunca começar por "quanto você cobra". Começar pelo
que a ação precisa render (Passo 1) e pelo custo por mil contas alcançadas de verdade:

```bash
node -e 'const valor=600, alcance=[5200,4800,6100,4400]; const m=alcance.reduce((a,b)=>a+b,0)/alcance.length; console.log("alcance médio:", Math.round(m)); console.log("R$ por mil alcançadas:", (valor/(m/1000)).toFixed(2))'
```

Comparar com o custo por mil do anúncio pago que o negócio já conhece
(`campanhas/relatorios/`, se houver). Faixa de mercado por tamanho de perfil entra como
`[a confirmar]`, por WebSearch em fonte datada ou perguntando a dois criadores da
região. Permuta é válida quando o produto tem valor real pro criador, e o valor em reais
fica escrito no acordo. Pagamento em dinheiro sai em duas partes, uma no aceite e outra
depois da última peça no ar com o print dos insights entregue; adiantar tudo é ficar sem
o que cobrar.

**6c. Briefing de uma página.** Preencher o esqueleto do molde: objetivo em uma frase,
quem vai ver (na palavra de `_memoria/publico.md`), a mensagem que não pode faltar, o
que não dizer, tabela de entregas com data e aprovação, cupom e link com UTM, e a
identificação de publicidade. A forma é do criador; a mensagem e o que não dizer são
do negócio.

**6d. Contrato mínimo.** Listar as onze cláusulas do molde preenchidas com o caso: uso
de imagem (prazo, canais, se pode virar anúncio pago), exclusividade (categoria e
duração, ou "não há"), remuneração e nota fiscal, cancelamento, dados pessoais. Se o
usuário quiser o documento formatado pra assinar, o `/contrato` monta a partir daqui.
Valor alto, exclusividade longa ou campanha em anúncio pago pedem advogado, e a skill
diz isso.

**6e. Primeiro contato.** A mensagem pro criador segue a estrutura do Passo 5, com
duas trocas: no lugar do "o que o cliente dele ganha" entra por que o público dele tem
a ver com o negócio (uma frase que mostre que o usuário viu o conteúdo, não só o
número), e o pedido é o mídia kit ou o print dos insights, antes de falar de valor. Sem
"amei seu trabalho" genérico: citar um post específico. Se o criador responder com uma
tabela de preço, a conta do 6b decide, não a tabela.

Segue pro Passo 7.

### Passo 7 — Escrever o arquivo

```markdown
# Parceria — <Parceiro ou criador> — <AAAA-MM-DD>

## Objetivo
[o que precisa acontecer, com número e data: "40 cupons usados até 31/10"]

## Por que esse parceiro
| Critério | Nota (0 a 2) | Por quê |
|---|---|---|
| Público que bate | | |
| Não compete | | |
| Reputação | | |
| Capacidade de entregar | | |
| Ganho claro pra ele | | |
| **Total** | **x de 10** | |

## A ação
Formato: <indicação mútua | desconto cruzado | combo | conteúdo cruzado | evento | sorteio | criador>

| Lado | Dá | Leva |
|---|---|---|
| <Empresa> | | |
| <Parceiro> | | |

## A conta
[margem, custo da ação, vendas pra pagar, divisão do combo: cada número com o comando que o gerou]

## Como vamos medir
[cupom, "quem te indicou", contagem no dia 0/7/15, e quem anota]

## Proposta (variante A)
[texto pronto pra copiar]

## Proposta (variante B)
[texto pronto pra copiar]

## Se ele responder
[interessado / "depois" / silêncio: o que dizer em cada um]

## Briefing (só criador)
[o briefing de uma página do molde, preenchido, ou "não se aplica"]

## Acordo escrito
[criador: as onze cláusulas do molde preenchidas. Dois negócios: partes, objeto, prazo,
quem paga o quê, uso de imagem, cancelamento e dados pessoais. O que pede advogado, marcado]

## O que ficou como [a confirmar]
[autorização de sorteio, faixa de valor, cláusula que pede advogado]

## Resultado
[preenchido depois da ação: o número contado contra a meta, data, e o que faria diferente]
```

Antes de entregar:

```bash
node scripts/verificar.js texto parcerias/<parceiro-slug>-<AAAA-MM-DD>.md
node scripts/verificar.js tabela parcerias/<parceiro-slug>-<AAAA-MM-DD>.md
```

O `tabela` confere o total da pontuação contra as linhas e qualquer conta de combo ou
desconto escrita no arquivo; a soma de verdade é a do `node -e` do Passo 2, e o
`tabela` é a segunda rede. Se divergir, refazer a partir do dado bruto, nunca ajustar
pra bater.

### Passo 8 — Registrar e acompanhar

- Marcar em `tarefas.md` (`/tarefas`): envio da proposta, follow-up em uma semana, data de início, contagem no dia 7 e no dia 15
- Fotos, vídeos e depoimentos que a ação gerar vão pro `biblioteca.md` (`/biblioteca`) com nome, data e o que pode ser reaproveitado (o uso de imagem combinado no contrato manda aqui)
- Depois da ação, preencher a seção "Resultado" do arquivo com o número contado contra a meta. É esse número que abre a próxima parceria, e a proposta seguinte começa por ele
- Se deu certo, o `/reaproveitar` transforma o conteúdo em post, story e prova na `/landing`

---

## Regras

- **Objetivo antes de parceiro.** Sem saber o que precisa acontecer, a skill não desenha ação nem escreve proposta
- **Nunca inventar taxa, faixa de valor ou prazo legal.** Valor de criador, órgão que autoriza sorteio e alcance de cláusula entram como `[a confirmar]`, com a instrução de checar por WebSearch em fonte oficial datada ou com o contador e o advogado
- **Publicidade é identificada como tal, sempre.** Criador pago, com produto ou permuta marca a peça como "publicidade", "publi" ou "parceria paga", no começo da legenda e no vídeo. É o que exigem o CDC (art. 36) e o CONAR (art. 28 do Código e o guia de influenciadores). Quem se recusa não serve, e a responsabilidade cai também sobre o anunciante
- **Depoimento pago não se apresenta como espontâneo.** Isso é propaganda enganosa pros dois lados. Depoimento de cliente de verdade é assunto do `/pos-venda`
- **Sorteio não sai sem a autorização conferida.** A skill avisa, marca `[a confirmar]` e oferece formato sem sorte envolvida
- **Seguidor não é critério.** Engajamento real medido por comando, público na cidade certa e comentário específico decidem. Perfil que não manda o print dos insights não entra
- **Toda conta roda em comando.** Pontuação, margem com desconto, divisão do combo, custo por mil alcançadas: nada de cabeça, e o arquivo passa pelo `verificar.js tabela`
- **Os dois lados ganham na hora.** Ação em que um lado só "ganha visibilidade" dura um mês. Se o "dá e leva" ficou torto, reequilibrar antes de propor
- **Não competir com quem se convida.** Parceiro que vende o que o usuário vende sai da lista, mesmo que seja amigo
- **Uma pergunta por mensagem** na proposta, e follow-up uma vez só. Depois disso, encerra com elegância
- **Menor de idade exige autorização escrita do responsável**, sem exceção, quando o criador ou quem aparece na peça for menor
- **Número que vai pro parceiro é número medido.** A proposta não promete "vai lotar" nem cita alcance que o usuário não contou. O que ele pode dizer é o que tem: quantos clientes atende por semana, quantos seguidores tem hoje, o resultado da parceria anterior
- **A skill não acessa perfil logado.** Curtidas, comentários e alcance vêm do usuário (print ou lista) ou de página pública, e entram no arquivo com a data em que foram coletados
- **Fronteira:** programa de cliente que indica cliente é `/indicacao`; organizar o evento em si (roteiro, inscrição, o dia) é `/evento`; jornalista e pauta são `/imprensa`; formatar o contrato pra assinar é `/contrato`; anúncio pago é `/anuncio-google`; a mensagem em si, quando for pelo WhatsApp, segue o `/whatsapp`
- **Não é assessoria jurídica.** As cláusulas são o mínimo pra ninguém brigar. Valor alto, exclusividade longa, uso de imagem em campanha paga ou qualquer coisa fora do comum vai pro advogado, e a skill diz isso na hora
- **Dado sensível (LGPD).** Lista de clientes, contatos de cupom e cadastro de sorteio são dados pessoais: não vão pro parceiro nem pra ferramenta externa sem autorização explícita do usuário, e o contrato diz o que cada lado faz com o que recebe. Print de insights do criador é dado dele, e fica no arquivo da parceria, não em outro lugar
