---
name: estoque
description: >
  Diz o que comprar essa semana e o que está parado na prateleira, a partir do relatório de
  vendas do PDV e do saldo de cada item: média diária, ponto de pedido, em quantos dias cada
  produto acaba, quanto dinheiro está preso no encalhe e a curva ABC. O item novo, o sazonal e
  o de pedido único saem da média cega e viram pergunta pro dono; perecível fica fora da conta.
  Use quando o usuário disser "o que eu preciso comprar essa semana", "em quantos dias meu
  estoque acaba", "quanto tempo dura meu estoque", "tem muito produto encalhado aqui",
  "quanto dinheiro eu tenho parado em mercadoria", "sempre falta o que mais vende",
  "comprei demais e ficou parado", "quais produtos vendem mais", "curva ABC",
  "quanto pedir pro fornecedor", ou /estoque.
---

# /estoque — O que comprar e o que está parado

> **Convenção de pastas:** a saída vai em `estoque/` (`reposicao.md` e `parametros.csv`). Na convenção **por cliente**, `clientes/<Nome>/estoque/` quando o estoque é de um cliente; o da própria loja fica na raiz. A pasta nasce na primeira reposição.

Quem vende produto perde dinheiro de duas formas ao mesmo tempo, e quase nunca vê as duas.
Falta o que mais vende, e o cliente compra do vizinho. Sobra o que ninguém procura, e o
dinheiro do mês fica dormindo na prateleira. As duas coisas têm a mesma origem: comprar por
memória. Aqui a compra sai de conta feita por comando, com o número visível pro dono
conferir, e o que a conta não consegue decidir aparece como pergunta em vez de virar pedido.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, quantos fornecedores, qual PDV usa, se tem depósito
- **Tom:** `_memoria/preferencias.md` — a página é lida às sete da manhã antes de abrir a loja
- **Oferta:** `_memoria/oferta.md`, quando existir — promoção e combo mudam a demanda de um item e precisam entrar como premissa
- **Entrada:** relatório de vendas do PDV (Bling, Tiny, Kyte, Nex e parecidos) e a posição de estoque, em `dados/`
- **Método e fontes:** `templates/operacao/estoque.md` — as contas, os cinco cortes, a curva ABC, os números de mercado com fonte e data, o molde dos arquivos
- **Moldes de entrada:** `templates/operacao/estoque-vendas.csv` e `templates/operacao/estoque-parametros.csv`
- **Script:** `scripts/estoque.js` — lê os dois arquivos, faz a conta e escreve a página. É ele quem calcula, sempre
- **Planilha:** `scripts/gerar-planilha.js`, quando o relatório vier em `.xlsx` (`--ler` mostra o conteúdo)
- **Conferência:** `scripts/verificar.js` (`tabela`, `texto`)
- **Saída:** `estoque/reposicao.md` (a semana atual) e `estoque/parametros.csv` (prazo do fornecedor, dias de segurança, múltiplo e custo, guardados entre semanas)

---

## Workflow

### Passo 1 — Confirmar que a conta se aplica

Esta skill só serve a quem vende produto físico com saldo. Serviço, hora de trabalho e
assinatura não têm ponto de pedido. Se `_memoria/empresa.md` já diz que o negócio é de
serviço, dizer isso em uma linha e oferecer o `/caixa` ou o `/capacidade` no lugar.

Confirmada a aplicação, uma pergunta por vez:

1. "Você tem o relatório de vendas do seu sistema? Precisa de data, código do produto, quantidade e valor, dos últimos 90 dias se der"
2. "E o saldo atual de cada produto, tem como exportar?"

Se ele não usa sistema e anota em caderno, ainda dá: pedir os 20 itens que mais vendem, com
a venda do mês e o saldo de hoje. A conta funciona com 20 SKUs, e é onde está a maior parte
do dinheiro. Caderno serve.

### Passo 2 — Ajustar o arquivo ao molde

O script recusa arquivo fora do molde, de propósito: adivinhar qual coluna é a quantidade
numa planilha de PDV é como se produz pedido errado com cara de relatório.

```bash
# grava os dois arquivos do molde, preenchidos, na pasta do usuário
node scripts/estoque.js modelo dados/

# mostra o que o script entendeu de um arquivo (vendas ou parâmetros)
node scripts/estoque.js dados/vendas.csv --ler

# relatório em .xlsx: ver o conteúdo antes de converter
node scripts/gerar-planilha.js --ler dados/relatorio.xlsx
```

O molde de vendas é `data;sku;qtd;valor`, uma linha por venda ou por dia, com o valor total
da linha em reais. O de parâmetros é `sku;saldo;lead_time;dias_seguranca`, mais as colunas
opcionais `nome`, `custo`, `perecivel`, `multiplo` e `minimo`. Os sinônimos de cabeçalho
aceitos estão em `templates/operacao/estoque.md`; qualquer coisa fora disso, renomear a
coluna, nunca mexer no script. Renomear leva um minuto.

O que o script recusa e por que dizer isso ao dono:

- Arquivo sem as quatro colunas de venda: ele mostra a primeira linha que leu, pra você ver onde está o problema
- Data que não existe (31/02) e linha com quantidade negativa: ficam nos avisos e fora da média. Devolução não é venda
- SKU que vendeu e não está nos parâmetros: aparece numa seção própria, porque sem saldo e prazo não existe ponto de pedido
- Saldo negativo: entra nos avisos e nenhuma compra sai dele. Saldo abaixo de zero é venda baixada sem entrada da mercadoria, e a conta não tem como adivinhar o número certo
- Coluna com nome de cliente, CPF ou telefone no relatório do PDV: apagar antes de rodar. A conta usa data, SKU, quantidade e valor, e mais nada

### Passo 3 — Perguntar o prazo do fornecedor e a segurança

Estes dois números não existem em relatório nenhum. Só o dono sabe, e é o que separa esta
página de um resumo de vendas. Uma pergunta por vez, e não perguntar item por item quando o
fornecedor é o mesmo:

1. "Quando você pede pro seu fornecedor principal, quantos dias leva pra chegar e estar na prateleira?" Se ele não lembra, perguntar pela última entrega, não pela média
2. "Já aconteceu atrasar? Quantos dias no pior caso?" O pior caso recente é o que define os dias de segurança
3. "Tem produto que só vende em caixa fechada ou tem pedido mínimo?" Isso vira `multiplo` e `minimo`
4. "Você sabe quanto paga por cada um desses, o custo de compra?" Sem custo, o dinheiro parado sai pelo preço de venda, e a conta fica inflada
5. "Tem algum desses com validade curta?" Perecível fica fora da conta de ponto de pedido

Gravar as respostas em `estoque/parametros.csv`, que passa a ser o arquivo do negócio: na
semana seguinte só o saldo muda. O prazo padrão do fornecedor vai também pra
`_memoria/empresa.md`, com a pergunta do `CLAUDE.md` sobre atualizar a memória, porque
`/preco`, `/delivery` e `/projecao` usam o mesmo número.

Prazo que o dono não souber entra como `[a confirmar]` na conversa, e a página diz que
aquele item vale menos. Chutar 7 dias porque é redondo é o jeito mais rápido de a compra
sair errada.

### Passo 4 — Rodar a conta

Nenhum número desta página é calculado de cabeça, nem no chat. O comando é o mesmo toda
semana: ele faz as contas e escreve o arquivo.

```bash
# o comando da semana
node scripts/estoque.js dados/vendas.csv \
  --parametros estoque/parametros.csv \
  --saida estoque/reposicao.md

# janela menor pra quem mudou de mix, alvo maior pra fornecedor distante
node scripts/estoque.js dados/vendas.csv --parametros estoque/parametros.csv \
  --janela 60 --alvo 45 --encalhado 120 --saida estoque/reposicao.md

# o mesmo resultado em JSON, quando outra skill vai ler
node scripts/estoque.js dados/vendas.csv --parametros estoque/parametros.csv --json
```

O que cada opção muda: `--janela` são os dias que entram na média (padrão 90), `--alvo` são
os dias de venda que a compra precisa cobrir depois de chegar (padrão 30), `--encalhado` é a
cobertura acima da qual o item conta como parado (padrão 90), `--historico` é o mínimo de
dias de venda pra confiar na média (padrão 30) e `--hoje DD/MM/AAAA` troca a data de
referência, que por padrão é a última venda do arquivo. Mudar o padrão é decisão do dono, e
o motivo entra escrito na página.

As contas, na ordem em que o script faz (e que ele repete no fim do arquivo com um item de
exemplo, número por número):

```
média diária     quantidade vendida ÷ dias em que o item esteve à venda na janela
estoque mínimo   média diária × dias de segurança
ponto de pedido  média diária × prazo do fornecedor + estoque mínimo
comprar          média diária × (prazo + segurança + alvo) − saldo,
                 subindo depois pro pedido mínimo e pro múltiplo de caixa
cobertura        saldo ÷ média diária        (em quantos dias acaba)
giro             venda da janela anualizada ÷ saldo atual
```

O denominador da média é o tempo em que o item esteve à venda dentro da janela, não os 90
dias corridos. Item que entrou há duas semanas tem média de duas semanas. Dividir por 90
faria o lançamento novo parecer morto, e é justo aí que a falta acontece.

Antes de sobrescrever `estoque/reposicao.md`, renomear a versão da semana passada pra
`estoque/reposicao-<AAAA-MM-DD>.md`, com a data dela. A comparação entre semanas é o que
mostra o item que está virando encalhe devagar.

### Passo 5 — Conversar sobre o que a conta não decide

A seção "a conta não decide estes" é a parte mais valiosa da página, e é a única que precisa
do dono. Para cada item da lista, o script já escreveu o motivo medido. Levar no máximo
cinco por conversa, um por vez, com a pergunta que resolve:

| O que o script achou | A pergunta |
|---|---|
| Menos de 30 dias de histórico | "Esse é novo? Está vendendo como você esperava?" |
| Ritmo virou nos últimos 28 dias | "Esse mudou de patamar ou foi coisa do mês? Vai continuar assim?" |
| Um mês vendeu o dobro dos outros | "Esse é de época? Qual mês ele vende de verdade?" |
| Metade do volume saiu num dia | "Foi uma encomenda grande? Ela repete?" |
| Vendeu em poucos dias da janela | "Esse é item de giro baixo mesmo, ou o saldo ficou zerado e deixou de vender?" |

A última pergunta pega o caso mais traiçoeiro: item que parece de baixa demanda porque
faltou. Ruptura esconde venda, e a média mede o que sobrou, não o que o cliente quis.

A resposta vale mais que a média. Ela entra na página, na coluna "o que fazer", com a decisão em número
("comprar 2 semanas e olhar de novo", "não comprar até setembro"). Se ele mudar um
parâmetro, mudar em `estoque/parametros.csv` e rodar o script de novo, nunca editar a tabela
na mão.

### Passo 6 — Escrever a página

O script escreve a estrutura inteira. O assistente completa três lugares e não mexe em
número nenhum:

````markdown
# Reposição — semana de DD/MM/AAAA

> Vendas: `dados/vendas.csv` · parâmetros: `estoque/parametros.csv`
> Janela lida: DD/MM/AAAA a DD/MM/AAAA (90 dias). Cobertura alvo depois da compra: 30 dias.
> Gerado por `scripts/estoque.js` em DD/MM/AAAA. Saldo é o que o arquivo informou, não uma contagem física.

## A semana em uma frase
[o assistente escreve: o que comprar hoje, o que está preso na prateleira, e a decisão que o dono precisa tomar]

## Métrica da semana
[tabela do script: itens abaixo do ponto, compra da semana, encalhe, dinheiro parado, receita da janela]

## Comprar essa semana
[tabela do script: item, sku, classe, saldo, média/dia, ponto de pedido, acaba em, comprar, custo]

## A conta não decide estes
[tabela do script, com a coluna "o que fazer" preenchida pelo assistente depois do Passo 5]

## Dinheiro parado
[tabela do script: saldo, dias sem vender, cobertura, custo unitário, parado em reais; o item marcado "média fraca" também está na seção de cima]

## Perecível (fora da conta)
[tabela do script, quando houver]

## Em ordem (acima do ponto de pedido)
[tabela do script]

## Vendeu e não tem parâmetro
[tabela do script, quando houver]

## Como as contas foram feitas
[bloco do script com um item de exemplo, número por número]

## Avisos da leitura
[o que o script recusou ou não entendeu no arquivo]

## Curva ABC (pela receita da janela)
[tabela do script, e a lista dos itens de classe A]
````

Os três lugares do assistente: a frase da semana, a coluna "o que fazer" e, quando fizer
sentido, um parágrafo curto depois do dinheiro parado dizendo qual saída cabe no caso (o
`/combos` monta a combinação, o `/whatsapp` avisa a lista de clientes, o `/vender` trata a
conversa de balcão). Nenhuma outra linha se edita na mão.

### Passo 7 — Conferir por comando

```bash
node scripts/verificar.js tabela estoque/reposicao.md
node scripts/verificar.js texto estoque/reposicao.md
```

Os dois precisam terminar em "Tudo certo.". Dois comandos, nada mais. O `tabela` soma as colunas e confere a linha de
total da curva ABC; o `texto` mede o ritmo do que o assistente escreveu. Se o `tabela`
acusar divergência, o conserto é rodar o script de novo a partir dos arquivos de entrada,
nunca ajustar o número pra bater.

Ler os avisos antes de mandar o pedido, sempre. Dois deles invalidam a página inteira: "a
última venda do arquivo é de..." quer dizer relatório velho, e "nenhuma venda caiu dentro da
janela lida" quer dizer que tudo aparece como encalhe porque não havia venda pra comparar,
não porque o estoque parou.

Uma conferência a mais, que só o dono faz: contar na mão o saldo dos itens de classe A antes
da primeira compra grande decidida por aqui. Se o saldo do sistema está errado, o ponto de
pedido nasce errado junto, e a página não tem como saber disso.

### Passo 8 — Entregar e deixar a rotina de pé

A entrega no chat é curta: o que comprar hoje com o valor, o dinheiro parado com o valor, e
as perguntas que ficaram abertas. O arquivo inteiro fica em `estoque/reposicao.md`.

Duas pontas que fazem a skill valer na semana seguinte:

- As compras da semana viram itens em `tarefas.md`, no formato do `/tarefas`, com fornecedor e valor: `- [ ] Pedir 72 un de CAF-500 (R$ 1.288,80) — fornecedor X (/estoque)`
- A reposição entra em `rotinas.md` pelo `/rotina`, no dia da semana em que ele faz pedido. O `/revisao-semanal` puxa o que vence

---

## Regras

- **Nenhum número sai de cabeça.** Média, ponto de pedido, cobertura, giro, curva e dinheiro parado saem do `scripts/estoque.js`. Se o chat mostra um número, ele é o mesmo que está no arquivo, gerado pelo mesmo comando. Conta refeita na mão é conta errada esperando a vez
- **Arquivo fora do molde é recusado, não adivinhado.** Coluna com nome estranho se renomeia no arquivo do usuário. Inventar qual coluna é a quantidade produz pedido errado com aparência de relatório
- **Média cega nunca decide.** Item com menos de 30 dias de venda, com sazonalidade visível, com ritmo virado nos últimos 28 dias ou com metade do volume num único dia sai da tabela de compra e vira pergunta. O motivo medido vai escrito do lado
- **Encalhe entra pela cobertura, inclusive o de média fraca.** Item com 300 unidades e quatro vendas em três meses é o maior dinheiro parado da loja, mesmo sem média confiável. Ele aparece nas duas seções, marcado, porque classificar encalhe não emite pedido de compra
- **Perecível fica fora do ponto de pedido.** Validade, lote e frequência de entrega mandam na compra de perecível. A cobertura em dias serve de pista e nunca de ordem de compra
- **Saldo do arquivo não é o da prateleira.** Dizer isso na entrega, uma vez. Furto, quebra e venda sem baixa afastam os dois, e a contagem física dos itens de classe A é o que fecha essa diferença
- **Dinheiro parado precisa do custo.** Sem a coluna `custo`, o valor sai pelo preço médio de venda e a página diz que saiu assim. Apresentar valor de venda como capital parado exagera o número. Quem produz o que vende tira o custo no `/ficha-tecnica`
- **Ruptura esconde demanda.** Item que ficou zerado vendeu menos do que o cliente quis, e a média não sabe disso. Quando o dono diz que faltou, a média daquele item passa a valer menos, e isso entra escrito
- **Comprar mais barato não é comprar melhor.** Desconto do fornecedor que traz três meses de estoque custa o dinheiro parado e o risco de encalhe. A conta do desconto contra o capital está em `templates/operacao/estoque.md`; decisão grande assim é `/decidir`
- **Número de mercado entra com fonte e data.** Ruptura, giro por setor, percentual de perda: URL e data de conferência, ou `[a confirmar]`. A tabela de referência está no molde, e ela envelhece
- **Não substitui contagem de inventário nem contador.** Esta página decide compra. Valor de estoque para balanço, baixa de perda e tributação de mercadoria passam pelo contador do negócio
- **Dado de venda não sai do workspace.** Relatório de PDV, custo de compra, nome de fornecedor e margem ficam em `dados/` e `estoque/`. Nada disso vai pra busca na web nem pra ferramenta externa sem o dono autorizar na mesma conversa
- **Dado de cliente não entra na conta.** Exportação de PDV costuma trazer nome, CPF e telefone de quem comprou, e a reposição não usa nada disso: apagar essas colunas antes de rodar e não copiar nenhuma delas pra dentro da página. Menos dado guardado é menos risco de LGPD, e aqui não custa nada
- **Fronteira com as vizinhas:** o `/analisar-dados` resume qualquer arquivo solto e não sabe o que é ponto de pedido; o `/caixa` e o `/projecao` cuidam do dinheiro do mês e dos meses adiante; o `/ficha-tecnica` dá o custo de cada unidade produzida; o `/delivery` trata a taxa do aplicativo; o `/combos` monta a saída do encalhe; o `/planilha` transforma esta página em `.xlsx` quando o dono quiser mexer. Esta skill é o produto na prateleira: quanto tem, quanto vende, quanto comprar
- **Quando o resultado for ruim, dizer o resultado.** Metade do estoque encalhado, o item que mais vende zerado, três meses de compra parada: escrever com o número e o próximo passo, sem suavizar
