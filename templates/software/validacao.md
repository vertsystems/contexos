# Vale a pena construir isto?

Referência das skills `/escopo` e `/evoluir`. O que se faz **antes** de aprovar a construção,
para descobrir se existe alguém do outro lado. É o degrau anterior ao escopo: não o que vai
ser feito, mas se vale ser feito.

> **A fronteira desta pasta.** `templates/backend/` é o código. `templates/software/` é o que
> o dono decide e paga. Como escrever código não entra aqui.

> **O que não está aqui.** Achar o problema embaixo do pedido, as perguntas da entrevista, a
> fatia mínima e o prazo como teto estão em `escopo.md`. As duas colunas do orçamento e a
> pergunta de quem mantém depois estão em `custo.md`. O que fazer com o sistema já no ar está
> em `evolucao.md`.

---

## Três situações, três testes diferentes

A pergunta "vale a pena" não tem uma resposta só. Ela depende de quem vai usar o software, e
essa é a primeira coisa a separar:

| Situação | O que testar antes | Como |
|---|---|---|
| **Produto para vender** a clientes que ainda não existem | se alguém tem esse problema e paga para resolvê-lo | página de teste com preço, tráfego pago, e-mails capturados |
| **Sistema interno**, para o próprio negócio | se o processo de hoje custa mais que o sistema custaria | medir o processo atual: tempo, dinheiro e frequência de erro |
| **Trabalho sob encomenda**, para um cliente que já contratou | se quem paga sabe o que quem usa precisa | observar três pessoas fazendo a tarefa antes do primeiro desenho de tela |

Aplicar o teste errado é o que mais desperdiça: gastar em anúncio para validar sistema
interno de público cativo, ou construir produto de mercado sem nunca perguntar o preço a
ninguém.

---

## Produto para vender: a página antes do código

Uma página, três blocos, um campo de e-mail:

1. **O problema** — escrito na palavra de quem sofre com ele, não na sua
2. **A solução** — em uma frase, sem lista de funcionalidades
3. **O preço** — visível, mesmo que ainda não seja definitivo

Publique, leve tráfego pago por trinta dias com verba fixa por dia, e meça duas coisas:
quantas pessoas viram e quantas deixaram o e-mail.

**O preço fica na página desde o primeiro dia.** Interesse medido sem preço não mede
disposição de pagar, e é justamente essa que decide se o produto existe. Mostrar o valor
costuma reduzir o número de cliques e melhorar o que vem depois deles: chega menos gente, e a
que chega já sabe que aquilo é pago.

Se houver mais de uma ideia na mesa, teste todas ao mesmo tempo, com a mesma verba e o mesmo
período. Comparar entre si vale mais que o número absoluto de cada uma.

**Uma ressalva sobre o número:** existe uma régua clássica para produto genérico, de dez por
cento de conversão e cento e cinquenta e-mails em um mês. Ela vem de casos medidos entre 2011
e 2014, com custo de anúncio daquela época, e não sobrevive intacta. Use como ordem de
grandeza. O que decide é a comparação entre as suas ideias e a conversa com quem deixou o
e-mail.

Em produto de nicho, ignore a taxa. Com trinta interessados, o teste passa a ser outro:
ligue para dez deles e pergunte quanto esse problema custa hoje, em dinheiro ou em horas. A
resposta vale mais que qualquer porcentagem.

Guarde a lista de e-mails. Ela é a primeira leva de convidados no lançamento, e a única
audiência que você terá no primeiro dia.

**Quando isto não se aplica:** software interno, obrigação legal e público cativo. Não há
tráfego a comprar, e a decisão é a de baixo.

---

## Sistema interno: medir o processo de hoje

O erro clássico aqui é aprovar o sistema pela dor, sem nunca quantificá-la. Meses depois
ninguém consegue dizer se ele pagou o que custou, e a conversa vira impressão contra
impressão.

Antes de construir, meça o que existe hoje:

| O que medir | Como levantar | Para que serve depois |
|---|---|---|
| Tempo gasto na tarefa | cronômetro em três repetições reais, por três pessoas diferentes | a economia que o sistema promete |
| Frequência | quantas vezes por semana ou por mês | multiplica a economia |
| Custo da hora de quem faz | folha, ou o que a pessoa deixa de faturar | transforma hora em dinheiro |
| Erros por mês | quantos aconteceram nos últimos três meses, e o que cada um custou para desfazer | o ganho que ninguém lembra de contar |

A conta do retorno é uma linha:

```
economia mensal = (horas por mês × valor da hora) + (erros por mês × custo médio do erro)
```

Compare com a coluna mensal do orçamento, em `custo.md`. Se a economia mensal não cobre o
custo mensal, o sistema não se paga com uso, e a decisão precisa de outro motivo escrito
(obrigação legal, risco, um cliente que exige).

Anote esses números **antes**. É o que, seis meses depois, prova que valeu, e é a única
defesa contra a pergunta "isso aí realmente melhorou alguma coisa?".

Rode `node scripts/verificar.js tabela <arquivo.md>` na tabela do retorno. Conta de economia
errada é a que mais volta para assombrar.

---

## Sob encomenda: quem paga não é quem usa

A regra está em `escopo.md`, seção "Quem paga não é quem usa". O que ela implica aqui é
prático: **as horas de conversa com quem vai usar entram embutidas no preço e no cronograma**,
nunca como item opcional.

Item opcional é o primeiro a cair quando o prazo aperta, e é exatamente ele que evitaria o
retrabalho de depois. O cliente não precisa escolher entre "com pesquisa" e "sem pesquisa".
Ele recebe os achados e entende para que serviram.

Se o cliente não conhece os próprios usuários, descobrir quem são faz parte do serviço. O
roteiro de observação está em `templates/design/usabilidade.md`, seção "Ver três pessoas
usando".

---

## Comprar pronto, construir, ou não fazer nada

Antes de escrever a primeira linha, três caminhos, e o mais barato quase nunca é o terceiro:

- **Já existe pronto e serve** — assine, mesmo que não seja perfeito. Custo mensal conhecido, sem manutenção sua, e você descobre em um mês se o problema era esse mesmo
- **Existe pronto e não serve** — escreva o que falta, em uma frase. Se a frase for pequena, provavelmente o certo é adaptar o pronto ou aceitar a falta
- **Não existe** — aí sim, construir, e pela fatia mínima do `escopo.md`

**Saber fazer não é motivo para fazer.** Quem sabe montar o site vai gastar dois fins de
semana e deixar de faturar as horas equivalentes. Some o que você deixa de ganhar e compare
com o preço do pronto. A conta costuma decidir sozinha.

Isso vale para as partes do projeto, não só para o todo: modelo de página, autenticação,
emissão de nota, envio de e-mail, cobrança. Construir base que já existe pronta é o gasto
mais silencioso de projeto pequeno.

---

## O que nunca se terceiriza

Duas coisas ficam com o dono, sempre, mesmo quando todo o resto é contratado:

1. **Decidir de quem é o problema e qual resolver.** Nenhum fornecedor tem como saber isso por você, e quem for contratado vai construir exatamente o que for pedido
2. **Garantir que as peças se encontram.** Programador, designer e quem cuida do anúncio entregam partes; alguém precisa responder pelo conjunto

Desenvolvimento, interface, infraestrutura, texto e conhecimento do tema podem ser comprados
sem prejuízo. Corte de escopo, não.

---

## O dia de abrir as portas

Checklist do dono, para o lançamento. A parte técnica de cada item está no `backend/`; aqui
está a lista do que não pode faltar:

- [ ] Sistema no ar, com aviso automático quando cair (`templates/backend/entrega.md`, seção "Monitorar")
- [ ] Os limites mapeados e alertados, não só a disponibilidade: espaço em disco, tamanho do banco, cota de envio de e-mail
- [ ] Fluxo principal testado por alguém que nunca viu o sistema
- [ ] Cobrança testada de ponta a ponta: cobrar, receber a confirmação e liberar o acesso
- [ ] Período de experiência definido, entre cinco dias e um mês, conforme o tempo até a pessoa perceber valor
- [ ] Liberação de acesso pode ser manual no começo, e é bom que seja: acompanhar os primeiros pagantes de perto ensina mais que qualquer relatório
- [ ] E-mail pronto para quem deixou contato na validação, avisando que abriu
- [ ] Estatística de acesso instalada, no site e dentro do sistema
- [ ] Diário de mudanças aberto, com o lançamento na primeira linha (`evolucao.md`)

O item mais esquecido é o segundo. Um produto parou de aceitar cadastros porque estourou a
cota de envio de e-mail do fornecedor, e a confirmação deixou de sair. O site estava no ar o
tempo todo, respondendo, verde em qualquer monitor de disponibilidade.

**Sobre cobrar:** se o produto vai ser pago, a cobrança entra no lançamento ou nas quatro
semanas seguintes. Não precisa ser automática. Precisa existir, porque o caro é o mês sem
receita, não o dia.

---

## Armadilhas

### Validar sem mostrar o preço

**Sintoma:** a página de teste converteu muito bem, e no lançamento quase ninguém assina.
**O que custa:** meses de desenvolvimento decididos por um número que media curiosidade, não
disposição de pagar.
**Conserto:** preço na página e no anúncio desde o primeiro dia do teste, mesmo provisório.

### Contar com receita de anúncio

**Sintoma:** o plano é "coloco anúncio e me sustento", com tráfego que parece razoável.
**O que custa:** receita irrisória sustentando um custo mensal real. Anúncio só paga operação
em volume de audiência que negócio pequeno não tem.
**Conserto:** faça a conta antes: quanto o seu tráfego atual renderia, e por quanto ele
precisaria ser multiplicado para pagar a conta do mês. O número costuma encerrar a discussão.

### Plano gratuito permanente porque "assim as pessoas experimentam"

**Sintoma:** a base cresce, o elogio cresce, a conta de infraestrutura cresce junto, e a
receita não.
**O que custa:** um custo mensal que sobe com o sucesso, sem contrapartida.
**Conserto:** o que resolve "quero que experimentem" é período de experiência, de cinco dias
a um mês. Gratuito permanente só se sustenta quando servir cada usuário custa perto de zero
**e** a base grande tem função clara: conteúdo que ela mesma gera, efeito de rede, ou venda
para uma fatia dela.

### Levantar tudo e não testar nada

**Sintoma:** meses de reunião, um documento grosso, e nenhuma pessoa real consultada.
**O que custa:** o documento envelhece antes de virar código, e a primeira semana de uso
derruba metade dele.
**Conserto:** entender o problema custa horas, não semanas. Depois de três conversas e uma
observação, comece a construir a fatia mínima. O resto se aprende com o sistema no ar.

---

## Antes de aprovar a construção

- [ ] Está escrito qual das três situações é esta, e o teste correspondente foi feito
- [ ] Se é produto para vender: o preço apareceu no teste, e existe uma lista de interessados
- [ ] Se é sistema interno: o processo de hoje foi medido em tempo, dinheiro e erro, com data
- [ ] A conta do retorno foi comparada com a coluna mensal do orçamento
- [ ] Foi verificado se já existe pronto, e por que o pronto não serve
- [ ] O que deixa de ser faturado no tempo de fazer você mesmo entrou na conta
- [ ] Alguém de dentro responde pelo conjunto, e essa pessoa tem nome
- [ ] Se a resposta for "não vale", ela está escrita com o número que a sustenta

Projeto recusado com número na frente não volta em três meses como se nada tivesse sido
conversado. Projeto recusado por opinião volta sempre.

---

## O que não trazer

- **As taxas de conversão e os custos de campanha do material de origem** — são de 2011 a 2016, em reais daquela época e em plataformas que mudaram de preço e de regra. Servem de método, não de meta
- **Modelo de negócio de aplicativo com milhões de usuários** (rede de dois lados, subsídio de um lado pelo outro, receita por escala de audiência). O comprador do ContexOS vende para dezenas ou centenas de clientes
- **A discussão de investidor, rodada e participação societária** — não é o eixo, e distorce a decisão de um negócio que se paga com o próprio caixa
- **Teste A/B para escolher entre versões da página de validação** — sem volume, o resultado é ruído. Com uma ideia por página e a mesma verba, a comparação já responde
