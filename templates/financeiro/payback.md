# Payback de uma compra de capital

Referência do `scripts/payback.js`, usado pelo `/projecao` e pelo `/decidir`. Como sai a
conta de uma compra isolada — forno, van, cadeira a mais, obra, segunda unidade, estoque
grande: quanto precisa vender por mês, em quantos meses o dinheiro volta, quanto sobra em
12 e 24 meses, e a partir de que ponto o certo é desistir.

> **A fronteira.** O `/projecao` faz os três cenários do caixa inteiro e já tem a seção de
> contratação. O `/emprestimo` calcula o custo do dinheiro quando a compra é financiada. O
> `/escopo` cuida do custo de construir software, que se comporta de outro jeito. Aqui é
> uma compra só, com desembolso de uma vez, que passa a gerar venda.

---

## Quando essa conta é a certa

Três coisas precisam ser verdade ao mesmo tempo:

1. **Desembolso de uma vez** — sai um valor do caixa (ou entra uma dívida) num mês só
2. **Custo novo que fica** — energia, manutenção, seguro, espaço, software, alguém pra operar
3. **Venda que passa a existir por causa dela** — um produto novo, mais volume do mesmo, um horário que antes não dava

Falta a terceira e a conta não é payback: é custo. Máquina comprada pra substituir outra
que quebrou não tem venda nova, tem venda que continua, e aí o que se compara é o gasto de
consertar contra o de trocar. Falta a primeira e é o `/projecao` normal, que já projeta
custo mensal novo em três cenários.

---

## O erro que essa conta existe pra impedir

O jeito que sai na cabeça do dono:

> "Vendo 200 pães a R$ 18, dá R$ 3.600 por mês. O forno custa 18 mil. Pago em cinco meses."

O que está errado ali: R$ 3.600 é faturamento, e faturamento não paga máquina. Do pão sai
farinha, fermento, embalagem, energia de assar, taxa de cartão e imposto sobre a venda.
Com 34% de custo variável, a margem é R$ 11,88 por pão, não R$ 18. E o forno cobra R$ 620
por mês de energia e manutenção antes de qualquer pão sair. A conta verdadeira:

```
margem por unidade  = preço − custo variável            = 18,00 − 6,12 = 11,88
sobra do mês        = unidades × margem − custo novo    = 200 × 11,88 − 620 = 1.756
payback             = desembolso ÷ sobra do mês         = 18.500 ÷ 1.756 = 10,5 meses
```

Dez meses e meio, não cinco. A diferença entre os dois números é o que leva equipamento
parado pro fundo da loja.

---

## A margem da venda nova

O percentual de custo variável do negócio inteiro serve como ponto de partida e quase nunca
é o certo pra venda nova. Produto novo costuma ter insumo mais caro, perda maior no começo e
a mesma taxa de cartão. Quando o script herda o percentual da última projeção, ele marca
`[a confirmar]` de propósito: alguém precisa abrir a ficha técnica.

Onde achar o número de verdade:

- `financeiro/fechamento-<AAAA-MM>.md`, do `/caixa` — o percentual do negócio como está hoje
- A ficha técnica do produto, pelo `/ficha-tecnica` — insumo por unidade, com perda
- A nota do fornecedor — o insumo do produto novo, e não a média da compra do mês

Se a venda nova é serviço que ocupa hora de gente, o custo variável inclui essa hora. Uma
sala a mais que exige alguém atendendo tem custo por atendimento, não margem cheia.

---

## O custo novo que a compra traz

A lista que quase sempre aparece incompleta na primeira conversa:

- **Energia** — o que o equipamento puxa, pela etiqueta, vezes a tarifa da conta de luz
- **Manutenção** — a preventiva anual dividida por 12, mais a peça que se sabe que troca
- **Seguro** — quando existe, e quando a compra é financiada costuma ser exigido
- **Espaço** — a máquina ocupa metro quadrado que estava fazendo outra coisa
- **Software e taxa** — sistema, mensalidade de maquininha nova, licença
- **Gente** — meia hora por dia de alguém, contada pelo custo da hora, não pelo salário cheio
- **Treinamento e perda do começo** — as primeiras semanas rendem menos e estragam mais

Custo mensal declarado como zero é sinal de conta incompleta. Se for zero mesmo (uma
prateleira, um freezer que substitui outro igual), isso entra escrito na premissa.

---

## Ponto de equilíbrio, em vendas por mês

São dois, e a diferença entre eles é o que decide:

| Qual | Conta | Pra que serve |
|---|---|---|
| Cobrir o custo novo | custo mensal novo ÷ margem por unidade | abaixo disso a compra tira dinheiro todo mês |
| Pagar a compra no prazo | (custo mensal novo + desembolso ÷ prazo) ÷ margem por unidade | é o número que vale como meta |

O segundo é o que vira meta de vitrine, de cardápio e de conversa com a equipe. Dividido
pelos dias de funcionamento do mês, ele para de ser planilha e passa a ser instrução: "seis
pães por dia a mais".

O prazo aceitável é decisão do dono, não regra de mercado. Serve como referência: o payback
precisa caber com folga dentro da vida útil do equipamento e dentro do tempo em que ele
pretende continuar vendendo aquilo. Payback de 30 meses em equipamento que ele troca em 24
é prejuízo com aparência de investimento.

---

## Os três cenários de uma compra

A mesma regra do `/projecao`: premissa escrita, causa nomeada, três cenários sempre. O que
muda é o que cada um fala.

- **Pessimista** — a venda nova vem pela metade, e vem devagar. O vizinho lança igual, a equipe não engaja, a máquina rende menos na prática que no catálogo
- **Base** — o que o teste mostrou. Quatro semanas com o equipamento alugado, emprestado ou na mão de um concorrente valem mais que qualquer estimativa
- **Otimista** — a capacidade cheia, com a premissa que a sustenta: quem compra, em que horário, com que frequência

Compra de capital tem uma armadilha própria: a capacidade instalada não é venda. O forno
assa 400 pães por dia; isso é o teto físico, e o `/capacidade` é quem trata dele. Quantos
se vendem é outra pergunta, e é a que entra aqui.

A rampa também é real. Equipamento novo produz menos no primeiro mês, por causa de ajuste,
treino e receita que ainda não está no ponto. Isso entra como crescimento mensal no cenário,
não como desconto no chute.

---

## Sazonalidade e o mês de comprar

Sorveteria que compra máquina em abril paga cinco meses de custo novo antes do primeiro
verão. A mesma compra em outubro se paga no primeiro trimestre. A conta é a mesma; o mês
muda o resultado.

Por isso a sazonalidade da última projeção entra na venda extra, e por isso o primeiro mês
da conta é o mês da compra, não janeiro. Quando o dono não sabe a sazonalidade, o fator é 1
em todo mês e isso aparece escrito: a conta fica otimista demais pra quem tem mês morto.

---

## O que o payback não vê

Quatro coisas ficam fora da aritmética e entram na página em prosa:

- **Valor de revenda** — quanto volta se desistir. É o número que transforma uma decisão de porta de um sentido em algo menos definitivo, e precisa ser olhado antes da compra, não depois
- **Capacidade ocupada** — a máquina que assa o pão novo é a mesma que assava o de sempre. Se o forno velho continuava dando conta, parte da "venda nova" é venda mudada de lugar
- **O tempo do dono** — instalar, treinar, refazer processo. Vira reais pela hora do `/caixa` e entra na tabela de custo do `/decidir`
- **Depreciação e imposto** — o efeito fiscal da compra depende do regime da empresa e é conversa com o contador. A conta daqui é de caixa: dinheiro que sai e dinheiro que entra

---

## O gatilho de desistir, escrito antes

É a parte que o dono não escreve sozinho, e é a que evita seis meses de "vai melhorar".

Formato: **em que data se confere, qual número precisa estar de pé, e o que se faz se não
estiver.** O número vem do ponto de equilíbrio do prazo; a data costuma ser o terceiro mês,
tempo suficiente pra rampa e curto o bastante pra revenda ainda valer algo.

> Conferir em dezembro: a venda extra precisa estar em 139 pães por mês, com a sobra
> acumulada em R$ 3.083. Abaixo disso, a compra não se paga em 18 meses no ritmo em que
> está. Nesse dia, ou o pão sai da vitrine e entra no cardápio do café da manhã, ou o forno
> vai pra revenda a R$ 11 mil.

Escrito antes, custa uma linha. Depois, custa a briga de admitir que a máquina foi um erro
enquanto ela continua na cozinha.

---

## Antes de entregar

- A margem por unidade saiu de ficha técnica ou de fechamento, não de palpite
- O custo mensal novo passou pela lista inteira, item por item
- Os três cenários têm premissa com causa, e o pessimista dói
- O ponto de equilíbrio do prazo virou número por dia de funcionamento
- A compra à vista caiu no caixa: a reserva depois da compra está escrita em meses
- O gatilho tem data, número e ação
- `node scripts/verificar.js datas <arquivo>` confere os marcos de 30, 60 e 90 dias
- `node scripts/verificar.js texto <arquivo>` passa nas seções escritas à mão
