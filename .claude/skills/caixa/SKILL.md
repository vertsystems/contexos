---
name: caixa
description: >
  Fecha o mês do negócio: quanto entrou, quanto saiu, quanto sobrou de verdade, qual serviço ou
  produto dá lucro, quanto custa a hora de trabalho e o que a conta permite decidir (contratar,
  aumentar preço, cortar gasto). Lê extrato ou planilha quando existir, ou monta a partir de uma
  conversa curta. Toda conta é somada por comando, nunca estimada.
  Use quando o usuário disser "quanto eu ganhei esse mês", "fecha o caixa", "quanto sobrou",
  "não sei pra onde vai o dinheiro", "esse trabalho vale a pena", "quanto custa minha hora",
  "posso contratar alguém", "tô trabalhando muito e sobrando pouco", ou /caixa.
---

# /caixa — O dinheiro do mês

> **Convenção de pastas:** a saída vai em `financeiro/`. Na convenção **por cliente**, o fechamento do próprio negócio fica na raiz (`financeiro/`) — trabalho de cliente não entra aqui. A pasta nasce no primeiro fechamento.

Quase todo dono de pequeno negócio sabe quanto **fatura** e não sabe quanto **sobra**. São
números diferentes, e é o segundo que decide se dá pra contratar, baixar preço ou parar de
atender um cliente.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, quem é a equipe, o que já se sabe do custo
- **Preço praticado:** `_memoria/oferta.md` e o estudo do `/preco`, se existirem
- **Retirada do dono:** `financeiro/retirada.md` (`/pro-labore`), se existir — o pró-labore já fixado e o teto da distribuição isenta entram como número de entrada
- **Sociedade:** `juridico/acordo-de-socios.md` (`/socios`), quando houver sócio — é lá que está a divisão entre pró-labore e distribuição, e as duas entram como retirada
- **Entrada de dado:** extrato bancário, planilha ou CSV que o usuário jogar em `dados/`. Se não houver, a conversa do Passo 1 basta
- **Conciliação do mês:** `financeiro/conciliacao-<AAAA-MM>.md` (`/conciliar`), se existir — de lá saem a tarifa, o imposto e o Pix que o extrato traz e ninguém lançou, e o que foi vendido e ainda não caiu. Fechar sem ela soma o que caiu e chama de faturamento
- **Despesa com documento:** `financeiro/comprovantes/comprovantes-<AAAA-MM>.csv` (`/comprovantes`), quando existir — já somado nas mesmas categorias, então a nota não é classificada duas vezes
- **Mercadoria:** `estoque/reposicao.md` (`/estoque`), quando existir — dinheiro parado em produto não é despesa do mês, e é o que explica caixa curto com lucro no papel
- **Margem por canal de delivery:** `cardapio/delivery-<AAAA-MM>.md` (`/delivery`), quando o negócio vende por aplicativo — o lucro real por canal, já sem comissão, cupom e embalagem
- **Serviço por atendimento:** `os/indice.csv` (`/ordem-servico`), se existir — a coluna `total` das OS concluídas no mês é receita já discriminada entre mão de obra, peça e deslocamento
- **Saída:** `financeiro/fechamento-<AAAA-MM>.md` e, quando o usuário quiser manter, `financeiro/custos-fixos.md`

---

## Workflow

### Passo 1 — Levantar os números

Se ele mandou extrato ou planilha, ler e classificar. Se não mandou, perguntar. Em uma mensagem só, não uma pergunta por vez:

> 1. "Quanto entrou no mês? (só o que caiu na conta, não o que foi prometido)"
> 2. "Quais são os custos que se repetem todo mês?" (aluguel, sistema, contador, salário, internet, pró-labore)
> 3. "O que você gastou esse mês que não se repete?" (equipamento, imposto anual, reforma)
> 4. "Quanto você tirou pra você?"
> 5. "Tem cliente que ficou devendo?"

**Não misturar pessoa física com empresa.** Se o usuário paga o mercado pela conta do
negócio, isso é retirada, e precisa aparecer como retirada, senão o lucro fica falso.

### Passo 2 — Separar o que é fixo do que é variável

| Tipo | O que é | Por que importa |
|---|---|---|
| **Fixo** | Existe mesmo com zero venda: aluguel, sistema, salário, contador | Define quanto você **precisa** faturar pra não ter prejuízo |
| **Variável** | Cresce com a venda: matéria-prima, comissão, taxa da maquininha, frete, tráfego pago | Define quanto sobra de cada venda |
| **Retirada** | O que sai pro dono | Não é lucro. É salário do dono, e precisa estar na conta |
| **Investimento** | Equipamento, obra, curso | Sai do caixa mas não é despesa do mês — anotar à parte pra não distorcer |

Taxa de maquininha e imposto sobre a venda são **variáveis** e quase sempre esquecidos. Uma
venda de R$ 1.000 com 4,5% de taxa e 6% de imposto entrega R$ 895: a diferença aparece no
fim do ano.

### Passo 3 — Fazer as quatro contas que importam

```
1. Entrou            todo dinheiro que caiu na conta
2. Margem de contribuição   Entrou − custos variáveis
3. Lucro             Margem de contribuição − custos fixos − retiradas
4. Ponto de equilíbrio   custos fixos ÷ (margem de contribuição ÷ Entrou)
```

O **ponto de equilíbrio** é o número mais útil da página: o faturamento abaixo do qual o mês
dá prejuízo. Muita gente descobre aqui uma coisa dura: trabalha as três primeiras semanas do mês só pra pagar a estrutura.

### Passo 4 — Descobrir o que dá lucro e o que dá prejuízo

Quando o usuário vende mais de uma coisa, quebrar por serviço/produto:

| Serviço | Vendas | Receita | Custo variável | Margem | Horas | R$/hora |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... |

Negócio que produz comida ou produto físico tem o custo variável por item em
`precos/cardapio-margem.md`, do `/ficha-tecnica`. Se o arquivo existe, o custo por porção da
tabela acima vem de lá, não de estimativa.

A coluna de **horas** é a que costuma revelar o problema: o serviço de maior receita
frequentemente é o de pior retorno por hora. Se o usuário não controla horas, estimar com
ele, e marcar como estimativa no arquivo.

**Custo da hora do dono:** `(custos fixos + retirada desejada) ÷ horas trabalhadas no mês`.
É o piso de qualquer orçamento. Se ele cobra abaixo disso, está pagando pra trabalhar.

### Passo 5 — Escrever o fechamento

```markdown
# Fechamento — <mês>/<ano>

## O mês em uma frase
[Entrou R$ X, sobrou R$ Y. O que explica o resultado.]

## Os números
| Linha | Valor |
|---|---|
| Entrou | R$ ... |
| (−) Custos variáveis | R$ ... |
| = Margem de contribuição | R$ ... |
| (−) Custos fixos | R$ ... |
| (−) Retiradas | R$ ... |
| = Lucro do mês | R$ ... |

Ponto de equilíbrio: R$ ... (faturamento mínimo pra não dar prejuízo)

## Por serviço
| Serviço | Receita | Margem | Horas | R$/hora |
|---|---|---|---|---|

## A receber
| Cliente | Valor | Vencido há |
|---|---|---|

## O que a conta permite decidir
1. [decisão concreta, com o número que a sustenta]
2. ...

## O que não dá pra afirmar ainda
[o que faltou de dado, e o que anotar no mês que vem pra resolver]
```

A tabela **A receber** alimenta o `/cobranca`: é lá que a parcela vencida ganha valor corrigido
por comando, régua em dia útil e mensagem pronta.

Pra ver os próximos meses em cenários (contratar, reajuste, quantos meses de caixa), o
fechamento alimenta o `/projecao`. Quem vende hora e chegou por "posso contratar alguém" precisa
do outro lado da conta: o `/capacidade` mede quantas horas a agenda tem pra vender, quanto está
vazio e a partir de que ocupação a próxima cadeira se paga. Planilha `.xlsx` que o usuário mandou se lê com
`node scripts/gerar-planilha.js --ler <arquivo>`.

### Passo 6 — Comparar com os meses anteriores

Se já existe fechamento anterior em `financeiro/`, ler e comparar. Um mês isolado quase não
informa: o que informa é a direção. Apontar o que mudou e o que **explica** a mudança —
nunca só a variação percentual.

---

## Fechar a conta (obrigatório)

Erro de soma aqui não é detalhe: o usuário decide contratar, baixar preço ou pegar
empréstimo com base nesse número.

```bash
node scripts/verificar.js tabela financeiro/fechamento-<AAAA-MM>.md
```

Ele soma cada coluna. Depois compara com o total declarado, na tabela e no texto ao redor. Se
divergir, **refazer a conta a partir do dado bruto**, nunca ajustar o número pra bater.

Duas atenções ao montar as tabelas:

- A tabela de **quebra por serviço** soma: a primeira coluna precisa nomear a categoria (`Serviço`, `Produto`, `Canal`), não "Métrica"
- A tabela **os números** é uma cascata com subtração, não uma soma de linhas. Conferir na mão: margem = entrou − variáveis; lucro = margem − fixos − retiradas

E ao extrair do extrato: contar por comando, não de cabeça.

```bash
# soma de uma coluna de CSV (ajustar o número da coluna e o separador)
awk -F';' 'NR>1 {s+=$3} END {printf "%.2f\n", s}' dados/extrato.csv
```

---

## Regras

- **Formato brasileiro:** vírgula é decimal, ponto é milhar (`1.234,56`). Normalizar antes de somar. Extrato de banco costuma vir com o valor negativo entre parênteses ou com sinal no fim — conferir a convenção do arquivo antes de confiar na soma
- **Faturamento não é lucro, e lucro não é o que está na conta.** Dizer isso quando o usuário confundir, uma vez, sem lição de moral
- **Retirada do dono entra na conta.** Negócio que "dá lucro" só porque o dono não se paga não dá lucro
- **Nunca inventar número que o usuário não deu.** Faltou o custo variável? Marcar `[a confirmar]` e mostrar o resultado com e sem ele
- **Não é consultoria contábil.** Regime tributário, dedução e obrigação acessória são conversa com o contador dele. Dizer isso quando a pergunta for pra lá, sem tentar responder
- **Dado financeiro não sai daqui.** Não mandar extrato, planilha de vendas ou nome de cliente devedor pra ferramenta externa sem autorização explícita
- Quando o resultado for ruim, dizer o resultado. Suavizar número de prejuízo é o oposto de ajudar
- Toda recomendação vem com o número que a sustenta ("dá pra contratar: sobra R$ 4.200/mês e o custo do contratado é R$ 2.900 com encargos"), nunca só com a opinião
