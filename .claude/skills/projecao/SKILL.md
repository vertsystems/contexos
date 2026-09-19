---
name: projecao
description: >
  Projeta o caixa dos próximos 3 a 6 meses em três cenários (pessimista, base, otimista), cada
  um com a premissa escrita: receita mês a mês com a sazonalidade que o dono conhece, custos
  fixos e variáveis, ponto de equilíbrio, caixa acumulado e a reserva se parar de entrar.
  Responde por conta as perguntas do dono: se dá pra contratar, o que acontece se subir o
  preço e perder cliente, quantos meses de caixa existem. Toda tabela sai por comando e é
  conferida antes de entregar.
  Use quando o usuário disser "como vai ficar o caixa nos próximos meses", "quantos meses
  eu aguento", "se eu contratar alguém a 3 mil, fecha?", "se eu subir o preço e perder
  cliente, sobra mais ou menos?", "projeção", "quanto preciso vender pra pagar as contas",
  "dá pra pegar esse empréstimo", "vou ter caixa em janeiro?", "cenário pessimista",
  ou /projecao.
---

# /projecao — Os próximos meses, em cenários

> **Convenção de pastas:** a saída vai em `financeiro/`, ao lado dos fechamentos do `/caixa`. Na convenção **por cliente**, a projeção do próprio negócio fica na raiz (`financeiro/`); trabalho de cliente não entra aqui. A pasta nasce na primeira projeção, se o `/caixa` ainda não a criou.

O `/caixa` diz quanto sobrou no mês que fechou. A pergunta seguinte é sempre sobre o que
ainda não aconteceu: "dá pra contratar?", "aguento janeiro?", "se subir o preço, sobra mais
ou menos?". Dono de negócio pequeno responde isso na cabeça, com o faturamento do melhor
mês e sem lembrar que dezembro passa. Aqui a resposta sai da conta. Três cenários, cada um
com a premissa escrita, pra ser conferida no próximo fechamento.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, tamanho da equipe, o que já se sabe da sazonalidade
- **Foco atual:** `_memoria/estrategia.md` — a aposta em andamento (lançamento, reajuste, canal novo) é a premissa do cenário otimista
- **O passado:** `financeiro/fechamento-<AAAA-MM>.md` (o mais recente e os anteriores) e `financeiro/custos-fixos.md`, quando existirem. É de lá que saem a receita histórica, os fixos, o percentual de variáveis e a retirada
- **Preço praticado:** `_memoria/oferta.md`, pra pergunta de reajuste
- **Gastos com data marcada:** `financeiro/obrigacoes.md` (do `/obrigacoes`), quando existir: imposto anual e parcela que cai num mês só entram em `extras`
- **Meta do lançamento:** `lancamentos/<slug>-<AAAA-MM>/plano.md` (do `/lancamento`), quando o otimista depende de um lançamento
- **Molde:** `templates/financeiro/projecao.md` — premissa por cenário, sazonalidade por comando, margem de contribuição, a conta da contratação e a do reajuste, o erro do crescimento linear
- **Script:** `scripts/projecao.js` — lê a spec com as premissas e gera a projeção em markdown (e, se pedir, a spec de planilha). É ele quem faz a conta
- **Conferência:** `scripts/verificar.js` (`tabela`, `texto`)
- **Planilha (opcional):** `scripts/gerar-planilha.js`, pelo fluxo do `/planilha`
- **Saída:** `financeiro/projecao-<AAAA-MM>.md`, em que `AAAA-MM` é o primeiro mês projetado. A spec fica ao lado: `financeiro/projecao-<AAAA-MM>.projecao.json`

---

## Workflow

### Passo 1 — Levantar o ponto de partida

Primeiro, ler o que já existe. O último `financeiro/fechamento-*.md`
dá receita, custos fixos, percentual de variáveis e retirada; os anteriores dão a
tendência; `custos-fixos.md` dá a lista dos fixos por item.

Se não há fechamento, ou o último tem mais de dois meses, perguntar em uma mensagem só:

> 1. "Quanto tem na conta do negócio hoje? (só o que está lá, não o que vai entrar)"
> 2. "Quanto entrou em cada um dos últimos três meses?"
> 3. "Quais são os custos que se repetem todo mês, e quanto dá a soma?" (aluguel, sistema, contador, salário, internet)
> 4. "De cada R$ 100 que entram, quanto vai embora em taxa de cartão, imposto sobre a venda, insumo, comissão?" (se ele não souber, o `/caixa` do último mês tem esse número; sem nada, perguntar o piso e o teto que ele reconhece, "fica entre 10 e 25?", e a spec roda duas vezes, uma com cada ponta, marcadas como `[a confirmar]`. Ele vê as duas; o número do meio não existe)
> 5. "Quanto você tira pra você por mês?"
> 6. "Tem algum gasto grande que vai cair nesses meses e não se repete?" (imposto anual, equipamento, décimo terceiro da equipe; se `financeiro/obrigacoes.md` existe, as datas de imposto já estão lá)

Quando o levantamento revela que o usuário não sabe quanto sobrou no mês passado, o
caminho certo é fechar o mês primeiro (`/caixa`), e a projeção sai em seguida com número
de verdade em vez de lembrança.

### Passo 2 — Fechar o horizonte e a sazonalidade

Uma pergunta, e só se a resposta não estiver no pedido: "Quer ver os próximos 3 ou os
próximos 6 meses?". Decisão de contratação ou de investimento pede 6; "aguento até o
fim do ano?" pede o que faltar até lá. Menos de 3 é o mês que vem. Mais de 6 é chute.

Sazonalidade vem do histórico quando ele existe. Com doze ou mais fechamentos em
`financeiro/`, puxar a receita de cada um e calcular o fator por comando (receita do mês
dividida pela média; o `node -e` completo está no molde):

```bash
# a linha "Entrou" de cada fechamento, com o mês no nome do arquivo
grep -H "^| Entrou" financeiro/fechamento-*.md
```

Com menos que doze, perguntar:

> "Tem mês que costuma vender bem mais ou bem menos que a média? Quais, e mais ou menos quanto?"

O que ele disser entra como fator (`"12": 1.25`, `"01": 0.7`) e fica marcado como
estimativa do dono no arquivo. Se não souber, o fator é 1 em todo mês, e a projeção diz
isso em "O que não dá pra afirmar ainda".

### Passo 3 — Escrever as três premissas

Propor as três em uma mensagem, cada uma em uma frase que nomeia a causa, e pedir pra
ele corrigir o que não bate:

> **Pessimista:** "os dois maiores clientes não renovam em janeiro e não entra cliente novo; receita cai 5% ao mês"
> **Base:** "a carteira se mantém e entra um cliente novo a cada dois meses, como nos últimos seis fechamentos"
> **Otimista:** "o lançamento de novembro converte 30 alunos a R$ 497 e a carteira cresce 5% ao mês"

De onde cada uma sai:

| Cenário | Fonte da premissa | O que ela precisa ter |
|---|---|---|
| Pessimista | o que já está frágil: cliente quieto, canal que esfriou, o mês ruim de todo ano | doer o suficiente pra mostrar o caixa mais baixo |
| Base | a média e a tendência dos últimos fechamentos | continuar como está, sem desejo embutido |
| Otimista | a aposta em `_memoria/estrategia.md`: lançamento, reajuste, parceria | citar a aposta e o custo novo que ela traz |

Premissa que não cita causa ("as coisas melhoram") volta pra ele com a pergunta "o que
precisa acontecer pra isso?". Cenário sem premissa não entra na spec. O script recusa.

Se o otimista depende de um lançamento que já tem plano no `/lancamento`, a meta de lá
(lista × conversão × ticket) é a receita extra do mês, e não se recalcula aqui.

### Passo 4 — Colher as perguntas do dono

A reserva ("quantos meses se parar de entrar") sai sempre. As outras duas entram quando
ele pede, e o pedido geralmente veio na primeira frase ("se eu contratar alguém a 3 mil"):

- Contratar: custo mensal total. Se ele disser o salário e não o custo, avisar que CLT tem encargos e provisões em cima do salário e que o valor exato é do contador; entrar com `[a confirmar com o contador]` na descrição e usar o número que ele der
- Reajuste: aumento em % e a perda de clientes que ele teme, em %. Se não tiver ideia da perda, rodar com 10% e dizer qual perda empata a conta

Uma pergunta por vez, e só sobre o que falta. Quando ele já deu tudo, pular pro Passo 5.

### Passo 5 — Escrever a spec e rodar

Gerar o exemplo e editar com os números levantados. O nome usa o primeiro mês projetado:

```bash
node scripts/projecao.js --exemplo financeiro/projecao-<AAAA-MM>.projecao.json
```

A spec, no essencial (o exemplo gerado tem todos os campos comentados no cabeçalho do
script):

```json
{
  "inicio": "2026-10",
  "meses": 6,
  "caixaInicial": "18.000,00",
  "custosFixos": [
    { "nome": "Aluguel e condomínio", "valor": "2.500,00" },
    { "nome": "Salário com encargos", "valor": "3.900,00" }
  ],
  "variaveisPct": "12,5",
  "retirada": "5.000,00",
  "sazonalidade": { "12": 1.25, "01": 0.7 },
  "extras": [{ "mes": "2026-11", "nome": "Imposto anual", "valor": "3.200,00" }],
  "cenarios": {
    "pessimista": { "premissa": "...", "receitaInicial": "20.000,00", "crescimentoMensalPct": "-5" },
    "base": { "premissa": "...", "receitaInicial": "22.000,00", "crescimentoMensalPct": "2" },
    "otimista": { "premissa": "...", "receitas": ["23.000", "37.910", "30.000", "21.000", "24.000", "26.000"] }
  },
  "perguntas": {
    "contratar": { "custoMensal": "3.500,00", "descricao": "assistente meio período, com encargos" },
    "reajuste": { "aumentoPct": "15", "perdaClientesPct": "10" }
  }
}
```

Receita entra como `receitaInicial` mais `crescimentoMensalPct` (o script aplica a
sazonalidade por cima) ou como `receitas`, um valor por mês, quando o dono já sabe o que
cada mês dá (aí a sazonalidade já está no que ele digitou). Os custos fixos podem ir por
item, que o script soma, e a soma aparece no arquivo.

```bash
node scripts/projecao.js financeiro/projecao-<AAAA-MM>.projecao.json --md financeiro/projecao-<AAAA-MM>.md
```

O script escreve o arquivo com premissas, ponto de equilíbrio, a tabela de cada cenário,
o caixa mês a mês, os três lado a lado, a reserva e as respostas às perguntas, e imprime
o resumo no terminal. As duas últimas seções ficam com colchetes pra preencher no Passo 7.

### Passo 6 — Conferir a conta

```bash
node scripts/verificar.js tabela financeiro/projecao-<AAAA-MM>.md
```

Cada tabela de cenário fecha com uma linha Total, e o verificador soma as colunas e
compara. O script arredonda cada linha ao centavo antes de somar, então o Total bate
exato com as linhas impressas, sem diferença de um centavo. Se divergir, o problema está
na spec, nunca no total. O que costuma ser:

- ponto de milhar onde era vírgula decimal (`"12.500"` vira doze mil e quinhentos)
- receita de um mês fora do lugar na lista
- gasto extra no mês errado

Corrigir a spec e gerar de novo.

Conferir um número por fora, escolhido a dedo, antes de confiar no resto:

```bash
# o resultado de um mês, do zero: receita × margem − fixos − retirada − extras
node -e 'const r=22000, v=12.5, f=7230, ret=5000, ex=0; console.log((r*(1-v/100)-f-ret-ex).toFixed(2))'
```

Se esse número não bate com a linha correspondente do arquivo, parar. Descobrir por quê
antes de seguir.

### Passo 7 — Escrever o que a projeção permite decidir

O arquivo gerado tem esta forma, e as duas últimas seções são escritas à mão, com o
número do cenário que sustenta cada frase:

```markdown
# Projeção — out/2026 a mar/2027

## Premissas
- Período, caixa inicial, custos fixos (por item), variáveis em %, retirada, sazonalidade, gastos que não se repetem

## Ponto de equilíbrio mensal
- Da estrutura (só os fixos) e do dono (fixos mais retirada), com a conta mostrada

## Cenário pessimista (out/2026 a mar/2027)
Premissa: [a frase]
| Mês | Receita | (-) Variáveis | = Margem | (-) Fixos | (-) Retirada | (-) Extras | = Resultado |
| ... | ... | ... | ... | ... | ... | ... | ... |
| Total | ... |
Leitura: [meses abaixo do equilíbrio; caixa mais baixo e em que mês]

## Cenário base ...
## Cenário otimista ...

## Caixa acumulado, mês a mês
| Indicador | Outubro | Novembro | ... |
| Caixa no fim, pessimista | ... |
| Caixa no fim, base | ... |
| Caixa no fim, otimista | ... |

## Os três lado a lado
| Indicador | Pessimista | Base | Otimista |
(receita média, resultado médio, caixa no fim, caixa mais baixo, meses abaixo do equilíbrio)

## Reserva: se parar de entrar
## Posso contratar? (quando pedido)
## Se eu subir o preço em X% e perder Y% dos clientes (quando pedido)

## O que a projeção permite decidir
1. [decisão concreta, com o número do cenário que a sustenta]
2. [o que fazer se o pessimista começar: qual sinal, em que mês, qual corte]

## O que não dá pra afirmar ainda
[premissa que ainda é chute, e o que anotar no próximo fechamento pra confirmar]
```

A decisão se escreve olhando o **caixa mais baixo do pessimista**, não a média do base.
"Dá pra contratar: no base sobra R$ 3.093 por mês depois do custo, e no pessimista o
caixa mais baixo fica em R$ 9.734, positivo" é uma decisão. "Parece viável" não é.

O segundo item é obrigatório: qual sinal mostra que o pessimista começou (o cliente
avisou, a receita de novembro ficou abaixo de X), e o que se corta quando ele aparecer.
Escrito antes, custa uma linha. Depois, custa uma briga consigo mesmo.

Depois de preencher, as duas seções escritas à mão passam pelo medidor de prosa, porque
é o que o usuário vai reler em três meses. Só elas: o resto do arquivo é tabela e lista
gerada, e a régua de ritmo acusaria isso sem ter o que consertar.

```bash
awk '/^## O que a projeção permite decidir/,0' financeiro/projecao-<AAAA-MM>.md > /tmp/projecao-decisao.md
node scripts/verificar.js texto /tmp/projecao-decisao.md
```

### Passo 8 — Planilha, se ele quiser mexer nos números

Quem quer testar "e se a receita de janeiro for 15 mil?" precisa de planilha. Markdown
não recalcula. O script gera a spec do `/planilha` com fórmula viva: mudar uma receita ou uma
premissa recalcula resultado e caixa.

```bash
node scripts/projecao.js financeiro/projecao-<AAAA-MM>.projecao.json --planilha financeiro/projecao-<AAAA-MM>.planilha.json
node scripts/gerar-planilha.js financeiro/projecao-<AAAA-MM>.planilha.json
```

Ler o relatório do `gerar-planilha.js` até o fim: os totais impressos precisam bater com
a linha Total do markdown, ao centavo. Depois, conferir o arquivo do jeito que o `/planilha`
manda (`zipfile.testzip` e XML bem formado). Gerar de novo depois de mexer na spec pede
`--sobrescrever`, e só se o usuário não editou a planilha na mão; se editou, o nome é
outro. Se ele pedir coluna nova ou outro layout, o resto é o fluxo do `/planilha`.

### Passo 9 — Entregar e marcar a revisão

Entregar em cinco linhas. Todo número dito no chat vem do arquivo conferido:

- onde ficou o arquivo
- o ponto de equilíbrio do dono
- o caixa mais baixo do pessimista, com o mês
- a resposta à pergunta que ele fez
- a premissa que mais precisa ser confirmada

Registrar em `tarefas.md`: "revisar projeção no fechamento de <mês>". Projeção que não
é revisada vira o número que o dono lembra, e o número que ele lembra é o otimista.

Se já existe `financeiro/projecao-*.md` anterior, comparar em duas linhas: qual cenário
o mês real ficou mais perto, e qual premissa errou. É a informação que faz a próxima
projeção ser melhor que esta.

---

## Regras

- **Cenário sem premissa escrita não existe.** A premissa nomeia a causa, em uma frase. O script recusa spec sem ela, e a skill não contorna o script com tabela feita à mão
- **Nunca apresentar um cenário só.** Nem "o realista". Os três saem juntos, e a decisão se toma no pessimista
- **Toda conta roda por comando.** Tabela sai do `scripts/projecao.js`, passa pelo `verificar.js tabela`, e um número é conferido por fora com `node -e`. Número de cabeça não entra no arquivo nem no chat
- **Se a soma divergir, corrigir a spec, nunca o total.** O erro está no dado de entrada; ajustar o resultado pra bater é esconder o erro onde ele mais custa
- **Projeção se revisa a cada fechamento do `/caixa`.** O mês real substitui o projetado, a premissa que caiu sai, e o arquivo ganha uma versão nova com o mês seguinte no nome. A anterior fica: é o registro de quanto se errou
- **Crescimento tem custo.** Cenário otimista com receita subindo e custo fixo parado está errado. Perguntar o que a receita nova exige (gente, ferramenta, estoque) e colocar em `extras` ou nos fixos
- **Custo de contratação é do contador.** Encargos e provisões dependem do regime da empresa; o número entra como o usuário informou, com `[a confirmar com o contador]` na descrição quando ele deu só o salário
- **Nunca inventar sazonalidade nem receita.** Histórico por comando, ou estimativa do dono marcada como tal. Sem nenhum dos dois, fator 1 e o aviso em "O que não dá pra afirmar ainda"
- **Fronteira:** `/caixa` é o passado (o mês que fechou, quanto sobrou de verdade); `/preco` decide se e como reajustar; `/lancamento` calcula a meta que vira receita extra do otimista; `/obrigacoes` diz em que mês cai cada imposto; `/decidir` conduz a decisão grande até o fim quando a projeção não basta; `/planilha` produz o arquivo pra ele mexer; `/escopo` cuida do custo de construir um sistema. `/projecao` é o futuro em cenários: o que acontece com o caixa se cada premissa se realizar
- **Não é consultoria financeira nem contábil.** Empréstimo, regime tributário, aplicação da reserva e dedução são conversa com o contador ou com o banco. A projeção mostra o caixa em cada cenário; a decisão de tomar crédito é dele, e a skill diz isso quando a pergunta for pra lá
- **Dado financeiro não sai daqui.** Extrato, receita por cliente, salário de funcionário e nome de quem deve são dados sensíveis (LGPD): não vão pra ferramenta externa sem autorização explícita, e o arquivo cita cliente por nome só quando o usuário escreveu assim na premissa
- **Resultado ruim se diz.** Se o pessimista zera o caixa em janeiro, a primeira linha da entrega é essa, com o mês e o valor. Suavizar aqui é tirar do dono o tempo que ele tinha pra reagir
