---
name: emprestimo
description: >
  Responde "esse dinheiro custa quanto de verdade?" com as propostas na mão: empréstimo do
  banco (Price ou SAC, com IOF, tarifa e seguro embutido), antecipação de recebível da
  maquininha e compra parcelada com juros escondidos. Calcula o CET real de cada proposta
  por comando, monta as tabelas de amortização em planilha, diz qual proposta e por quê, em
  que mês a parcela aperta, e entrega a parcela pronta pra testar nos três cenários do /projecao.
  Use quando o usuário disser "o banco me ofereceu um empréstimo", "vale a pena pegar esse
  dinheiro", "qual dessas propostas é melhor", "quanto vou pagar no total", "a taxa é 1,99%
  ao mês, é caro?", "antecipar as vendas da maquininha compensa?", "12 vezes sem juros ou à
  vista com desconto?", "quero trocar uma dívida cara por uma mais barata", "a parcela cabe
  no meu caixa?", "o que é CET", ou /emprestimo.
---

# /emprestimo — Quanto o dinheiro custa

> **Convenção de pastas:** a saída vai em `financeiro/`, ao lado do fechamento do `/caixa` e da projeção do `/projecao`. Na convenção **por cliente**, crédito do próprio negócio fica na raiz (`financeiro/`); dívida de cliente não entra aqui. A pasta nasce na primeira comparação, se o `/caixa` ainda não a criou.

O gerente diz "1,99% ao mês" e a proposta cabe na parcela. O que ele não diz em voz alta: o
IOF, a tarifa de cadastro descontada na liberação, o seguro prestamista que "já vem incluso"
e a carência que soma juros ao saldo. Junte tudo e o dinheiro de 1,99% ao mês sai a 38,59% ao
ano para uma empresa fora do Simples (R$ 20.000 em 24 vezes, R$ 450 de cadastro descontado na
liberação, R$ 38 de seguro em cada parcela, IOF financiado junto). A antecipação da maquininha
passa mais despercebida, porque o comércio pega toda semana sem nunca converter 2,49% ao mês
em 36% ao ano. Aqui a conta sai por comando, do jeito que o Banco Central manda calcular o
CET, e a parcela vai direto pro cenário pessimista da projeção, que é onde se descobre se ela
cabe.

> **Isto não é consultoria financeira.** A skill calcula o custo e mostra onde aperta. Quem
> assina é o dono, e o contrato é o que vale. Cláusula, garantia e renegociação de dívida
> passam por advogado ou contador antes de virar ação.

## Dependências

- **Contexto:** `_memoria/empresa.md` — enquadramento (MEI, Simples, ME fora do Simples ou pessoa física), que define o IOF; o que o negócio vende e como recebe (cartão, boleto, Pix)
- **O caixa de hoje:** `financeiro/fechamento-<AAAA-MM>.md` (do `/caixa`), quando existir: é a folga real do mês
- **O caixa adiante:** `financeiro/projecao-<AAAA-MM>.md` e a spec `financeiro/projecao-<AAAA-MM>.projecao.json` (do `/projecao`), quando existirem: a coluna Resultado do cenário pessimista é a folga mês a mês, e a spec recebe a parcela
- **Molde:** `templates/financeiro/credito.md` — CET pela Resolução CMN 4.881/2020, Price e SAC, tabela do IOF com fonte e data, antecipação de recebíveis, parcelado "sem juros", quitação antecipada, o que pedir ao banco, séries do Banco Central
- **Script:** `scripts/credito.js` — lê a spec com as propostas, monta as tabelas, calcula IOF e CET por bisseção, escreve o markdown, a planilha (via `scripts/gerar-planilha.js`) e os `extras` do `scripts/projecao.js`; `referencia` busca a taxa média de mercado no Banco Central, sem chave
- **Conferência:** `scripts/verificar.js` (`tabela`, `texto`)
- **Saída:** `financeiro/credito-<AAAA-MM-DD>.md` (a comparação e a decisão), `financeiro/credito-<AAAA-MM-DD>.xlsx` (as tabelas com fórmula viva) e a spec ao lado, `financeiro/credito-<AAAA-MM-DD>.credito.json`. A data é a da liberação prevista

---

## Workflow

### Passo 1 — Entender pra quê e quanto

Antes de olhar proposta, uma pergunta por vez, parando quando a resposta já estiver no
pedido ou em `_memoria/`:

1. "Pra que é o dinheiro?" Equipamento, estoque, reforma, cobrir buraco de caixa, trocar dívida. A resposta muda o prazo que faz sentido: equipamento que dura cinco anos aguenta 24 meses; buraco de caixa em 24 meses é sinal de que o problema é outro
2. "Quanto você precisa, e quando precisa cair na conta?"
3. "Você é MEI, está no Simples, é empresa fora do Simples, ou vai pegar como pessoa física?" Se `_memoria/empresa.md` já diz, não perguntar. É isso que define o IOF (Simples e MEI pagam cerca de um terço da alíquota diária em operação até R$ 30.000)
4. "Quanto sobra por mês hoje, depois de tudo?" Se existe `financeiro/fechamento-*.md`, a linha "Lucro do mês" do último responde. Se existe projeção, a coluna Resultado do pessimista responde melhor, mês a mês

Se ele não sabe quanto sobra, o caminho é fechar o mês primeiro (`/caixa`). Empréstimo
decidido sem saber a folga é decidido pela parcela, e parcela que cabe hoje é a que aperta
em janeiro.

Quando o dinheiro é pra cobrir caixa e a antecipação da maquininha já é rotina, dizer isso
uma vez: o crédito resolve a semana e cobra o mês. O `/caixa` mostra se é margem, prazo de
recebimento ou retirada alta, e a resposta pode não ser crédito.

### Passo 2 — Levantar as propostas

Cada proposta entra com tudo que custa. Se ele mandou o PDF, o print ou a foto da proposta, ler
pela ferramenta Read e tirar os números de lá, sem conversão nenhuma; se só tem a conversa com
o gerente, perguntar o que falta, em uma mensagem só por proposta:

> 1. "Valor liberado e sistema de amortização (Price, parcela fixa, ou SAC, parcela que cai)?"
> 2. "Taxa ao mês, número de parcelas, e quando vence a primeira?"
> 3. "IOF em reais, se a proposta mostra?"
> 4. "Tarifa de cadastro, avaliação, seguro: quanto, e cada uma é descontada na hora, financiada junto ou cobrada na parcela?"
> 5. "Tem carência? Quantos meses?"
> 6. "O CET que o banco informou, ao mês e ao ano?"

O item 6 é obrigatório por norma (Resolução CMN 4.881/2020, art. 7º: o banco informa o
CET e o demonstrativo antes da contratação). Proposta sem CET escrito volta pro banco com
o pedido; a lista completa do que pedir está no molde.

Pra **antecipação de recebíveis**: a taxa ao mês da credenciadora, o valor líquido de cada
lançamento que cairia (já descontada a taxa da maquininha, que é custo de venda e não de
crédito) e em quantos dias cairia. O extrato da maquininha tem os três.

Pra **compra parcelada**: o preço à vista, o número de parcelas e o valor da parcela. O
script descobre a taxa embutida; se a loja diz "sem juros" e o à vista é menor, os juros
estão lá.

Quando o gerente deu só a parcela ("R$ 30.000 em 24 de R$ 1.716") e não disse a taxa, a
proposta entra como `parcelado`: `valorAVista` é o que cai na conta e `parcela` é a parcela.
O script descobre a taxa por bisseção e o CET cai no mesmo lugar (no exemplo do Banco A,
40,08% contra 40,09%, porque a última parcela fecha o centavo de outro jeito). Voltar ao banco
pela taxa e pelo CET escrito continua valendo, mas a conta não espera por isso.

Duas ou três propostas comparam. Uma só também vale: o arquivo diz quanto custa e se cabe,
e sugere a segunda cotação quando o CET fica acima da média do Banco Central.

### Passo 3 — Escrever a spec e rodar

Gerar o exemplo e trocar pelos números levantados. O nome leva a data da liberação:

```bash
node scripts/credito.js --exemplo financeiro/credito-<AAAA-MM-DD>.credito.json
```

A lista inteira de campos aceitos está no cabeçalho do script, que vale ler antes de inventar
chave: `sed -n "29,41p" scripts/credito.js`. No essencial:

```json
{
  "titulo": "Forno novo da padaria",
  "tomador": "simples",
  "liberacao": "01/10/2026",
  "folga": { "2026-11": "4.200,00", "2026-12": "5.100,00", "2027-01": "2.300,00" },
  "folgaOrigem": "coluna Resultado do cenário pessimista em financeiro/projecao-2026-11.md",
  "propostas": [
    { "nome": "Banco A, capital de giro", "tipo": "price", "valor": "30.000,00", "taxaMensal": "2,4", "parcelas": 24,
      "encargos": [{ "nome": "Tarifa de cadastro", "valor": "450,00", "quando": "inicio" }, { "nome": "Seguro prestamista", "valor": "38,00", "quando": "parcela" }],
      "iof": true },
    { "nome": "Banco B, SAC 18 meses", "tipo": "sac", "valor": "30.000,00", "taxaMensal": "2,1", "parcelas": 18,
      "carenciaMeses": 3, "iof": "812,33" },
    { "nome": "Loja, 12x no cartão", "tipo": "parcelado", "valorAVista": "30.000,00", "parcelas": 12,
      "parcela": "2.980,00", "primeiraParcela": "10/11/2026" },
    { "nome": "Maquininha, antecipar novembro", "tipo": "antecipacao", "taxaMensal": "3,49",
      "recebiveis": [{ "valor": "10.000,00", "dias": 30 }, { "valor": "10.000,00", "dias": 60 }] }
  ]
}
```

`tomador` é `pf`, `pj`, `simples` (Simples Nacional ou MEI, operação até R$ 30.000) ou
`nenhum`. `iof: true` calcula pela regra em vigor e financia junto; `iof: "812,33"` usa o
valor da proposta, que manda quando existe; `iof: false` tira. `carenciaMeses` são os meses
sem parcela, com juros correndo e entrando no saldo, e o script mostra quanto isso custou
antes da primeira parcela. `primeiraParcela` aceita a data ("10/11/2026") ou os dias a partir
da liberação (`45`); sem ela, a primeira cai um mês depois da liberação, mais a carência. Onde
tem carência, deixar a data em paz: a carência já empurra o vencimento, e as duas coisas juntas
contam juros de um prazo e cobram noutro.
`taxaFixaPct`, só na antecipação, é a tarifa fixa por operação que algumas credenciadoras
cobram além da taxa ao mês. A `folga` vem da projeção
quando ela existe (a spec de projeção tem os meses; o markdown tem a coluna Resultado do
pessimista, que se lê por grep, não de memória):

```bash
grep -A 12 "^## Cenário pessimista" financeiro/projecao-<AAAA-MM>.md | grep "^| [A-Z]"
```

Depois:

```bash
node scripts/credito.js financeiro/credito-<AAAA-MM-DD>.credito.json --md financeiro/credito-<AAAA-MM-DD>.md --xlsx financeiro/credito-<AAAA-MM-DD>.xlsx
```

O script escreve o markdown com as propostas lado a lado (o que cai na conta, IOF, tarifa,
parcelas, total pago, custo do dinheiro, CET ao mês e ao ano), a tabela de cada proposta
com o total, os marcos de quitação antecipada, a seção "Onde aperta" quando há folga, e as
duas últimas seções em colchetes pra preencher no Passo 7. A planilha sai com fórmula viva:
mudar a taxa ou o prazo na aba de premissas recalcula a tabela. Se a planilha já existe e
o usuário não a editou, `--sobrescrever`; se editou, outro nome.

### Passo 4 — Conferir a conta

```bash
node scripts/verificar.js tabela financeiro/credito-<AAAA-MM-DD>.md
```

Cada tabela fecha com uma linha Total, e o verificador soma as colunas e compara. O script
arredonda cada linha ao centavo antes de somar, então bate exato. Se divergir, o problema
está na spec (ponto de milhar onde era vírgula, parcela no campo do valor), nunca no total.

Conferir um número por fora, escolhido a dedo, antes de confiar no resto:

```bash
# parcela do Price do zero: saldo financiado × i / (1 − (1+i)^−n)  → 1678.94 no exemplo
node -e 'const pv=30362.32, i=0.024, n=24; console.log((pv*i/(1-Math.pow(1+i,-n))).toFixed(2))'

# CET anual de uma antecipação: recebe X hoje, deixa de receber V em d dias
node -e 'const X=9651, V=10000, d=30; console.log(((Math.pow(V/X,365/d)-1)*100).toFixed(2)+"% ao ano")'
```

E o CET do empréstimo, conferido pelo outro lado: descontar as parcelas pela taxa que o script
achou e ver se o valor presente volta no que caiu na conta. Trocar `liberado`, `parcelas`,
`dias` e `cet` pelos números do arquivo. No exemplo do Banco A a diferença dá -R$ 0,97, que é o
arredondamento do CET a duas casas; dezenas ou centenas de reais querem dizer parcela, data ou
valor liberado trocado.

```bash
node -e 'const liberado=29550, cet=0.4009, dias=[31,61,92,123,151,182,212,243,273,304,335,365,396,426,457,488,517,548,578,609,639,670,701,731];
const parcelas=dias.map((_,j)=>j===23?1717.11:1716.94);
const vp=parcelas.reduce((s,v,j)=>s+v/Math.pow(1+cet,dias[j]/365),0);
console.log("valor presente", vp.toFixed(2), "| caiu na conta", liberado, "| diferença", (vp-liberado).toFixed(2))'
```

Os dias saem do próprio arquivo (a coluna de vencimento contra a data de liberação); em caso de
dúvida, `node -e 'console.log(Math.round((new Date(2028,9,1)-new Date(2026,9,1))/864e5))'`.

E a conferência que mais pega problema: **o CET do script contra o CET que o banco
informou**. Diferença acima de meio ponto ao ano quase sempre é encargo que a proposta não
mostrou (seguro, tarifa de manutenção, IOF calculado noutra base). Voltar ao banco com a
pergunta "o que mais compõe o CET?" antes de seguir. Se o banco não deu o CET, o do script
é o único número, e o arquivo diz isso.

### Passo 5 — Testar a parcela nos três cenários

CET compara o preço do dinheiro. Se a parcela cabe é outra conta, e ela se faz no caixa
projetado, não na folga de hoje. Quando existe spec de projeção, a parcela da proposta
escolhida entra nos `extras` dela por comando:

```bash
node scripts/credito.js financeiro/credito-<AAAA-MM-DD>.credito.json --projecao financeiro/projecao-<AAAA-MM>.projecao.json --proposta 2
node scripts/projecao.js financeiro/projecao-<AAAA-MM>.projecao.json --md financeiro/projecao-<AAAA-MM>.md
```

O script escreve um lançamento por parcela, com o nome da proposta. Ele é uma proposta por
vez: ao escrever a segunda, tira a primeira da spec e diz quem saiu, porque só uma dívida
vai ser contratada e duas na mesma projeção somariam parcela que não existe. Os lançamentos
que o usuário escreveu à mão (imposto anual, compra de equipamento) ficam onde estão. Se o
caso for de pegar dois créditos de uma vez, `--somar` mantém o anterior.

Antecipação entra de outro jeito: o líquido entra no mês da liberação, como lançamento
negativo, e cada recebível sai do mês em que cairia, porque a projeção contava com ele.
Parcela que vence depois do último mês projetado fica de fora, e o script avisa: a dívida é
mais longa que a projeção, e o caixa do fim ainda deve o resto.

Rodar pra cada proposta que sobreviveu ao CET, uma depois da outra, e anotar o **caixa mais
baixo do pessimista** de cada rodada antes de passar pra próxima. É esse número que decide,
não a média do base. Se não há projeção, a seção "Onde aperta" do markdown (folga mês a mês
menos a parcela) é o que se tem, e o arquivo diz que a folga é a de hoje, sem sazonalidade.
Oferecer o `/projecao` uma vez.

### Passo 6 — Comparar com o mercado

```bash
node scripts/credito.js referencia
```

Busca no Banco Central a taxa média das operações novas por modalidade (capital de giro,
desconto de recebíveis, antecipação de faturas de cartão, cheque especial, crédito pessoal),
% ao ano, com o mês de referência. Sem chave, sem cadastro. É a média do país, não a taxa
que o banco dele vai dar; serve pra saber se a proposta está cara. Proposta com CET acima
da média da modalidade pede segunda cotação, e o arquivo diz onde: registradora de
recebíveis permite antecipar em qualquer banco, não só na credenciadora (molde). Com
`--referencia` no comando do Passo 3, a tabela entra no arquivo. Sem internet, o script
pula e avisa.

### Passo 7 — Escrever o que a conta permite decidir

O arquivo gerado tem esta forma, e as duas últimas seções são escritas à mão:

```markdown
# Crédito: <título>

> Tomador, data de liberação, regra do IOF com fonte e data, fórmula do CET, aviso de que não é consultoria

## As propostas lado a lado
| Indicador | Banco A | Banco B | Loja | Maquininha |
(tipo, cai na conta hoje, taxa do contrato, IOF, tarifa e seguro, parcelas, maior parcela, pago ao todo, custo do dinheiro, CET)
Menor CET: [proposta], [CET].

## Proposta 1: <nome>
- Valor contratado, o que cai na conta, taxa, parcelas, IOF e a regra, encargos, saldo financiado de verdade, CET, pago ao todo
| Parcela nº (vence em) | Parcela | Juros | Amortização | Encargos |
| Total | ... |
| Indicador | Valor |  (falta pra quitar depois da parcela 1, 6, 12...)

## Proposta 2: ...

## Proposta 4: <antecipação>
- Recebíveis antecipados, prazo médio, taxa ao mês, desconto cobrado, IOF, o que cai na conta, CET
| Recebível (cairia em) | Dias | Valor do recebível | Desconto | Recebe hoje |
| Total | ... |

## Onde aperta  (quando há folga)
| Indicador | nov/26 | dez/26 | ... |
| Folga antes | Parcela | Sobra |
Aperta em N meses: ... O pior é ..., com -R$ ...
(na antecipação, em vez de parcela: os meses em que o recebível não cai mais)

## Referência de mercado  (com --referencia)

## Pra testar no /projecao

## O que a conta permite decidir
1. [qual proposta, com o CET e o custo em reais que sustentam a escolha]
2. [em que mês a parcela aperta, no cenário pessimista, e o que se faz nesse mês]
3. [o que pedir ao banco antes de assinar: seguro fora, tarifa negociada, carência]

## O que não dá pra afirmar ainda
[encargo que a proposta não mostrou, CET que o banco ainda não confirmou por escrito, folga que ainda é estimativa]
```

Decisão se escreve com número: "Banco B: CET de 30,29% ao ano contra 40,09% do Banco A, e
R$ 5.280,92 a menos no total; no pessimista o caixa mais baixo fica em R$ 2.140 em janeiro,
positivo" é uma decisão. "A segunda parece melhor" não é. Quando nenhuma cabe, a primeira
linha é essa, com o mês e o valor em que o caixa vira negativo, e o que mudaria isso (menos
valor, mais prazo, adiar).

O segundo item é obrigatório. Empréstimo aperta em mês previsível (janeiro, o mês do
imposto anual, o mês fraco de todo ano), e escrever antes o que se faz nesse mês custa uma
linha. Descobrir depois custa a antecipação da maquininha pra pagar a parcela do banco.

As duas seções passam pelo medidor de prosa, só elas, porque o resto do arquivo é tabela:

```bash
awk '/^## O que a conta permite decidir/,0' financeiro/credito-<AAAA-MM-DD>.md > /tmp/credito-decisao.md
node scripts/verificar.js texto /tmp/credito-decisao.md
```

### Passo 8 — Entregar e anotar

Entregar em cinco linhas, todo número vindo do arquivo conferido:

- onde ficou o arquivo e a planilha
- a proposta com menor CET, com o CET ao ano e o custo em reais
- se cabe: o caixa mais baixo do pessimista com a parcela, e o mês
- o que pedir ao banco antes de assinar
- a frase de que isto não substitui advogado nem contador, uma vez

Se ele decidir pegar, registrar em `tarefas.md`: "conferir contrato contra a proposta:
CET, IOF, seguro, tarifa" antes de assinar, e "revisar projeção com a parcela no
fechamento de <mês>". Se a parcela entrou na projeção, o `/projecao` já a carrega nos
próximos fechamentos; se entrou como gasto fixo novo, o `/caixa` precisa saber. Perguntar
uma vez se ele quer anotar a dívida em `_memoria/empresa.md` (valor, banco, parcelas,
último vencimento): é dado que pesa em toda conversa de dinheiro depois.

---

## Regras

- **Toda conta roda por comando.** Tabela sai do `scripts/credito.js`, passa pelo `verificar.js tabela`, e um número é conferido por fora com `node -e`. CET de cabeça não entra no arquivo nem no chat: é conta que erra por muito, e o erro sai do bolso do usuário
- **CET, nunca a taxa nominal.** Comparar proposta é comparar CET ao ano com tudo dentro (IOF, tarifa, seguro, carência). Taxa "ao mês" sem CET escrito volta pro banco, com a norma que obriga (Resolução CMN 4.881/2020, art. 7º)
- **O CET do banco e o do script precisam bater.** Diferença acima de meio ponto ao ano é encargo escondido ou dado errado na spec. Descobrir qual antes de entregar; nunca ajustar a spec pra bater
- **Valor de lei, alíquota e regra entram com fonte e data.** O molde traz o IOF conferido em 22/09/2026 no Planalto; a alíquota mudou três vezes em 2025. Antes de entregar, rodar WebSearch em "IOF operações de crédito alíquota" pra confirmar que não mudou de novo, com termo genérico, sem dado do negócio. Se mudou, usar a nova no arquivo com a data de hoje, avisar que o molde envelheceu, e passar o IOF da proposta em reais na spec, que tem precedência
- **Se a proposta traz o IOF em reais, esse valor manda.** O calculado é conferência, não substituto
- **Norma citada tem de estar em vigor.** Resolução de banco central é revogada em silêncio: a 3.516/2007, que vedava tarifa por quitação antecipada, caiu em 02/05/2022 com a Resolução CMN 5.004/2022, e quem a cita hoje cita norma morta. Antes de repetir número de resolução que veio do molde, conferir se ela vive, e citar a que a substituiu. Artigo errado é pior que artigo nenhum
- **Quitar antes é pagar valor presente, não a soma das parcelas.** O saldo pra quitação é o valor presente do que falta, descontado pela taxa do próprio contrato (Resolução CMN 5.004/2022, art. 7º, pra pessoa física, microempresa e EPP em operação prefixada), com a redução proporcional dos juros que o CDC garante (art. 52, § 2º). Banco que oferece "desconto" sobre a soma das parcelas está cobrando juros que não venceram: pedir a memória de cálculo
- **Antecipação de recebível é crédito, e entra na mesma régua.** Taxa ao mês da maquininha vira CET ao ano como qualquer empréstimo. O valor do recebível entra líquido da taxa da maquininha (MDR), que é custo de venda e mora no `/caixa`, não aqui
- **Parcela que cabe hoje não é parcela que cabe.** A decisão se toma no caixa mais baixo do cenário pessimista do `/projecao`, com a parcela dentro. Sem projeção, a seção "Onde aperta" usa a folga de hoje, e o arquivo diz que é isso
- **Prazo maior baixa a parcela e sobe o total.** Quando a parcela só cabe alongando, mostrar as duas colunas (parcela e pago ao todo) lado a lado. Esconder o total é o truque mais comum da proposta
- **Onde investir a sobra não entra aqui.** É opinião, e opinião de investimento é conversa com quem responde por ela. A skill diz quanto custa pegar; nada sobre onde aplicar
- **Nunca inventar taxa, tarifa ou folga.** O que ele não deu entra como `[a confirmar]` e o arquivo mostra o resultado com e sem. Sem a folga, não há "Onde aperta"; sem o CET do banco, o arquivo diz que só existe o calculado
- **Não é consultoria financeira nem jurídica.** Dizer na entrega, uma vez. Cláusula de garantia, aval, renegociação de dívida atrasada, dívida ativa e portabilidade contestada passam por advogado ou contador antes de virar ação. A skill entrega a conta e a pergunta pronta, não a assinatura
- **Fronteira com as vizinhas:** o `/caixa` fecha o mês e diz a folga de hoje; o `/projecao` testa a parcela nos três cenários e aceita "dá pra pegar esse empréstimo", mas devolve a escolha da proposta pra cá; o `/obrigacoes` diz em que mês cai o imposto que disputa a folga com a parcela; o `/decidir` conduz a decisão grande quando o crédito é parte de algo maior (abrir filial, contratar); o `/planilha` cuida de layout diferente do que o script gera; o `/escopo` cuida do custo de construir um sistema. Esta skill é o custo de trazer dinheiro de fora e a escolha entre propostas
- **Dado financeiro não sai daqui.** Proposta do banco, extrato da maquininha, valor da dívida e nome do gerente ficam em `financeiro/` e `_memoria/`. Não vão pra WebSearch nem pra ferramenta externa; a busca pergunta "alíquota IOF crédito 2026", nunca "empréstimo da empresa tal". O `referencia` do script consulta o Banco Central só pela série, sem dado do negócio (LGPD)
- **Quando o resultado for ruim, dizer o resultado.** Nenhuma proposta cabe, o CET é o dobro da média, a antecipação toda semana está comendo a margem: escrever isso com o número, na primeira linha, sem suavizar. Adiar a notícia custa o mês em que ele ainda podia mudar de ideia
