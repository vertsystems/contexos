# Projeção de caixa em cenários

Referência da skill `/projecao`. Como montar os próximos meses sem se enganar: premissa
por cenário, sazonalidade que vem do dado, margem de contribuição, a conta da contratação,
a conta do reajuste, e o erro que quase todo mundo comete ao projetar crescimento.

> **A fronteira desta pasta.** `templates/financeiro/` é o dinheiro do próprio negócio:
> o que já aconteceu (`/caixa`) e o que pode acontecer (`/projecao`). Preço do serviço
> é `/preco`; custo de construir um sistema é `templates/software/custo.md`.

---

## O que uma projeção é

Uma projeção não diz o que vai acontecer. Diz o que acontece com o caixa **se** uma
premissa se realizar. A premissa é a parte que vale; o número é consequência dela.

Por isso a unidade de trabalho aqui não é "a projeção", é o **cenário**: uma premissa
escrita em uma frase, e a tabela que sai dela. Três cenários, sempre. Um cenário só é
uma aposta disfarçada de plano, e dois (o "realista" e o "otimista") escondem o que o
dono mais precisa enxergar: quanto ele aguenta se der errado.

Horizonte: de 3 a 6 meses. Menos que isso é o mês que vem, e o `/caixa` já cobre.
Mais que isso é chute com casas decimais. A projeção se refaz a cada fechamento,
substituindo o mês projetado pelo mês real, e a premissa que errou pela que acertou.

---

## Premissa por cenário

Uma premissa boa responde "o que precisa acontecer pra esse número existir?" com algo
que dá pra observar no meio do caminho. Compare:

| Ruim | Boa |
|---|---|
| "Cenário otimista: receita cresce 20%" | "O lançamento de novembro converte 30 alunos a R$ 497 e a carteira cresce 5% ao mês" |
| "Cenário pessimista: as coisas pioram" | "Os dois maiores clientes não renovam em janeiro e não entra cliente novo" |
| "Cenário base: continua como está" | "A carteira se mantém e entra um cliente novo a cada dois meses, como nos últimos seis fechamentos" |

A da direita tem três propriedades que a da esquerda não tem: nomeia a causa, dá pra
conferir em outubro se está acontecendo, e aponta a decisão (se os dois clientes
avisarem que não renovam, o pessimista virou o base).

**O que cada cenário precisa ser:**

- **Pessimista** — o que acontece se o que já está frágil quebrar. Não é catástrofe
  (pandemia, incêndio); é o cliente grande que anda quieto, o canal de venda que
  esfriou, a sazonalidade ruim que vem todo ano. Ele precisa doer o suficiente pra
  o dono olhar o caixa mais baixo e decidir se aguenta
- **Base** — o que acontece se os últimos meses continuarem. A fonte é o histórico
  do `/caixa`, não o desejo. Se os últimos seis fechamentos mostram receita parada,
  o base é receita parada
- **Otimista** — o que acontece se a aposta em andamento der certo. Precisa citar a
  aposta: o lançamento, o reajuste, a parceria, o canal novo. Otimista sem aposta
  nomeada é o base com um número maior, e não serve pra nada

Receita pode entrar de dois jeitos: **mês a mês**, quando o dono já sabe o que cada
mês costuma dar, ou **valor inicial mais variação mensal**, quando a premissa é uma
tendência. No segundo caso a sazonalidade entra por cima; no primeiro, ela já está
embutida no que ele digitou.

---

## Sazonalidade: vem do dado, não da sensação

Todo negócio tem mês que vende mais e mês que vende menos, e o dono geralmente sabe
qual é qual. O que ele não sabe é o **tamanho** da diferença, e é aí que a projeção erra:
"dezembro é forte" vira ×1,5 na cabeça e era ×1,15 no extrato.

Com histórico de pelo menos um ano, o fator de cada mês é a receita daquele mês
dividida pela média dos doze. A receita de cada mês está na linha "Entrou" de cada
`financeiro/fechamento-<AAAA-MM>.md` (`grep -H "^| Entrou" financeiro/fechamento-*.md`
lista todas). Daí, por comando:

```bash
# receita por mês, uma por linha, no formato "2025-12 31500" → fator de cada mês
node -e '
const l = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\n").map(x => x.split(/\s+/));
const media = l.reduce((a, [, v]) => a + Number(v), 0) / l.length;
for (const [m, v] of l) console.log(m, (Number(v) / media).toFixed(2));
' <<EOF
2025-10 24000
2025-11 25000
2025-12 31500
2026-01 17000
EOF
```

Sem histórico, a sazonalidade entra como o dono descreve, marcada como estimativa na
projeção, e vira a primeira coisa a confirmar no próximo fechamento. Sem histórico e
sem descrição, o fator é 1 em todo mês, e a projeção diz isso.

Cuidado com dois vieses: **o mês bom mais recente vira a base** (foi o lançamento, não
a tendência), e **o mês ruim vira "atípico"** (janeiro é atípico todo ano).

---

## Margem de contribuição e ponto de equilíbrio

A conta inteira depende de uma separação que o `/caixa` já fez: **fixo** existe mesmo
com venda zero; **variável** cresce com a venda. Taxa de cartão, imposto sobre a nota,
comissão, insumo e frete são variáveis, e viram uma porcentagem da receita.

```
margem de contribuição (%)  = 1 − custos variáveis ÷ receita
ponto de equilíbrio da estrutura = custos fixos ÷ margem de contribuição
ponto de equilíbrio do dono      = (custos fixos + retirada) ÷ margem de contribuição
```

O do dono é o número que importa: abaixo dele, o mês come caixa mesmo que "dê lucro"
no papel. Um negócio com R$ 7.230 de fixos, R$ 5.000 de retirada e 12,5% de variáveis
precisa de R$ 13.977 de receita por mês só pra ficar no zero. Cada mês do cenário
abaixo disso é um mês que a reserva paga.

---

## A conta da contratação

"Posso contratar alguém por R$ 3.500?" tem uma resposta errada muito comum: "sim, eu
faturo R$ 22.000". O custo sai da margem, não da receita. Pra pagar R$ 3.500 só com
venda nova, precisa entrar R$ 3.500 ÷ margem: com 87,5% de margem, R$ 4.000 a mais por
mês. Com 40% de margem (comércio, insumo caro), R$ 8.750.

E a pergunta certa não é uma, são três:

1. **Em quantos meses de cada cenário o resultado paga o custo?** Se no base são 5 de
   6, o mês que não paga é qual, e o caixa segura?
2. **Qual o caixa mais baixo com a contratação, no pessimista?** Se fica negativo, a
   contratação é uma aposta de que o pessimista não acontece. Pode ser uma aposta
   boa; precisa ser dita em voz alta
3. **O que seria cortado se o pessimista começar?** Escrito antes, com o sinal que
   dispara o corte. Depois de contratar, essa decisão fica muito mais difícil

O custo mensal de quem é contratado em regime CLT fica bem acima do salário anotado
na conversa: entram encargos e provisões (férias, décimo terceiro, FGTS, INSS
patronal, e o que mais o regime da empresa exigir). O valor exato depende do regime
tributário e é conta do contador: entra na projeção como `[a confirmar com o contador]`
até ele confirmar. Contratar como PJ ou freelancer muda a conta e muda o risco
trabalhista, e isso também não se decide aqui.

---

## A conta do reajuste

"Se eu subir 15% e perder 10% dos clientes, sobra mais ou menos?" é aritmética, e a
resposta costuma surpreender pra cima.

```
receita depois = receita antes × (1 + aumento) × (1 − perda)
15% e 10%:  1,15 × 0,90 = 1,035  → 3,5% a mais de receita, atendendo 10% menos gente
```

A perda de clientes que **empata** a conta é `aumento ÷ (1 + aumento)`: pra 15%, 13,0%;
pra 20%, 16,7%; pra 30%, 23,1%. Perdendo menos que isso, sobra mais.

Duas ressalvas que fazem diferença:

- A conta acima trata o custo variável como proporcional à receita (taxa, imposto).
  Se parte dele é por volume (insumo, hora de trabalho), atender menos gente reduz
  custo, e a margem depois do reajuste fica **melhor** que o mostrado. O erro é a favor
- Quem decide **se** reajusta e **como** comunica é o `/preco`. A projeção diz o que
  acontece com o caixa em cada hipótese de perda; não diz qual hipótese vai acontecer

---

## Reserva: quantos meses se parar de entrar

`caixa ÷ (custos fixos + retirada)`. É o número que diz quanto tempo o dono tem pra
reagir se a receita sumir. Um a dois meses é operar sem margem de erro; a
contratação e o investimento ficam mais arriscados do que a tabela do cenário base
sugere. O que já foi faturado e ainda vai cair entra à parte, e só se for certo.

---

## O erro de projetar crescimento linear

O mais comum, e o mais caro. Aparece de quatro formas:

1. **Régua no último mês.** Cresceu de R$ 20 mil pra R$ 24 mil? "Então mês que vem
   R$ 28 mil." Um mês não é tendência. A pergunta é o que causou os R$ 4 mil, e se a
   causa se repete
2. **Crescimento sem custo.** Receita sobe 10% ao mês na tabela e o custo fixo fica
   parado. Crescer costuma pedir gente, ferramenta, estoque. Se o cenário otimista
   não tem um custo novo, ele está errado
3. **Composto tratado como simples.** 5% ao mês por seis meses não é 30%, é 34%
   (`1,05^6 = 1,3401`). Em seis meses a diferença é pequena; a cabeça que erra isso
   é a mesma que estende a linha até "em dois anos"
4. **Sazonalidade esquecida na hora boa.** O otimista projetado em outubro esquece
   que janeiro vem. A tabela sobe até dezembro e o dono contrata em cima do pico

O antídoto é mecânico: toda receita projetada tem uma causa escrita, todo crescimento
tem o custo que ele traz, e a tabela é gerada por comando (`scripts/projecao.js`),
que aplica o composto e a sazonalidade sem esquecer.

---

## Quando refazer a projeção

- **Todo fechamento do `/caixa`.** O mês real substitui o projetado. Se ficou perto do
  base, ótimo. Se ficou perto do pessimista, o base do mês seguinte precisa descer
- **Quando uma premissa se confirma ou cai.** O cliente grande avisou que não renova:
  o pessimista virou o base, hoje, sem esperar o fechamento
- **Antes de qualquer decisão com custo fixo novo.** Contratar, alugar, assinar. A
  decisão se toma olhando o caixa mais baixo do pessimista, não a média do base
- **Quando o `/obrigacoes` marca um imposto no horizonte.** Gasto com data e valor
  conhecidos entra em `extras`, no mês em que sai, e não se dilui na média

---

## Antes de entregar

- Três cenários, cada um com premissa em uma frase que cita a causa
- Sazonalidade com origem declarada: histórico por comando, ou descrição do dono
  marcada como estimativa
- Custos fixos e retirada iguais aos do último fechamento, ou a diferença explicada
- Tabela gerada e conferida por comando (`verificar.js tabela` passou)
- Caixa mais baixo de cada cenário dito em voz alta, com o mês
- Perguntas do dono respondidas com o número do cenário que sustenta a resposta
- O que ainda é chute listado em "O que não dá pra afirmar ainda"
