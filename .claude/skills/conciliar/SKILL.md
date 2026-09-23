---
name: conciliar
description: >
  Bate o extrato do banco (OFX ou CSV de Nubank PJ, Itaú, BB, Inter) com o que deveria ter
  entrado e saído: faturas de proposta e contrato, relatório da maquininha, cobranças Pix e
  os lançamentos do caixa. Devolve a conciliação do mês com o que casou, o que só está no
  banco (tarifa, juros, Pix sem nome), o que só está nos seus registros (cliente que não
  pagou, que vai direto pra cobrança) e o quadro que fecha a zero. Toda linha é casada por
  comando, com a tolerância escrita, e nenhuma diferença some.
  Use quando o usuário disser "bate o extrato com o que eu vendi", "o saldo não fecha",
  "tem um pix que não sei de quem é", "caiu menos do que eu cobrei", "quem não me pagou
  esse mês", "conciliação bancária", "confere o extrato", "sobrou dinheiro na conta e não
  sei de onde", "importa o OFX", "faz a conciliação de setembro", ou /conciliar.
---

# /conciliar — O banco contra os seus registros

> **Convenção de pastas:** a saída vai em `financeiro/conciliacao-<AAAA-MM>.md`, e os recebíveis que não caíram em `financeiro/a-receber-<AAAA-MM>.csv`. Na convenção **por cliente**, a conciliação da própria conta fica na raiz (`financeiro/`); só vai pra `clientes/<Nome>/financeiro/` quando o usuário concilia a conta do cliente dele. A pasta nasce na primeira conciliação.

O extrato conta o que aconteceu. Não conta o que era pra ter acontecido. A fatura de
R$ 2.380,50 que o cliente esqueceu, o repasse da maquininha que veio com 2,2% a menos e a
tarifa de R$ 12,90 que ninguém lançou só aparecem quando alguém coloca o banco e os
registros lado a lado e explica cada diferença. Sem isso, o `/caixa` fecha um mês que não
existiu: soma o que caiu e chama de faturamento.

## Dependências

- **Contexto:** `_memoria/empresa.md` — banco usado, se tem maquininha (qual), se vende por Pix cobrança, se mistura conta pessoal
- **O que deveria ter entrado:** propostas aceitas em `propostas/` (`/proposta`), contratos com parcelas em `contratos/` (`/contrato`), cobranças abertas em `financeiro/cobranca-<AAAA-MM>.md` (`/cobranca`)
- **O que deveria ter saído:** custos fixos em `financeiro/custos-fixos.md` e o fechamento anterior do `/caixa`, quando existirem
- **Entrada de dado:** o extrato e o relatório da maquininha que o usuário jogar em `dados/`
- **Referência:** `templates/financeiro/conciliacao.md` — formatos por banco, as quatro camadas, classes de sobra, o quadro que fecha a zero, léxico
- **Script:** `scripts/conciliar.js` — lê OFX (SGML ou XML, CP1252 ou UTF-8), CSV e .xlsx; casa em camadas; escreve o markdown e o CSV pro `/cobranca`
- **Conferência:** `node scripts/verificar.js tabela`, `datas` e `texto`
- **Saída:** `financeiro/conciliacao-<AAAA-MM>.md` e `financeiro/a-receber-<AAAA-MM>.csv`

---

## Workflow

### Passo 1 — Pegar o extrato

Se ele já jogou o arquivo em `dados/`, ler direto. Se não, pedir em uma linha: "exporta o
extrato do mês em OFX (no computador: extrato, exportar, OFX) e joga em `dados/`; CSV
também serve". OFX é melhor que CSV porque traz o saldo final e um identificador por linha.

Antes de qualquer conta, mostrar o que o script entendeu do arquivo:

```bash
node scripts/conciliar.js dados/extrato-2026-09.ofx --ler
```

Sai a tabela com data, dia da semana, descrição e valor, mais entradas, saídas, líquido e
saldo final. Conferir três coisas com o usuário, olhando a tabela: o acento está certo
("JOÃO", não "JO?O"), o sinal está certo (tarifa negativa, Pix recebido positivo) e o mês é
o mês. Se qualquer uma falhar, o problema é de leitura e se resolve antes de casar
qualquer linha: o script mostra a codificação que usou e a coluna que não achou.

Extrato baixado no meio do mês costuma trazer duas competências. O script escolhe o mês
com mais lançamentos, diz nos avisos qual escolheu e joga o resto em "fora do mês". Se o
usuário quer o outro, é `--mes 2026-08`. Confira isso no `--ler`. Mês errado produz uma
lista de sobras inteira que não quer dizer nada.

PDF do extrato o assistente lê pela ferramenta Read e transcreve num CSV com `data;descricao;valor`
em `dados/`, mostrando a transcrição inteira antes de seguir. Um dígito trocado aqui vira
sobra sem explicação lá na frente.

### Passo 2 — Montar os registros

Registro é tudo que deveria ter entrado ou saído no mês. O usuário raramente tem isso numa
planilha só, então o assistente monta `dados/registros-<AAAA-MM>.csv` a partir do que existe
no workspace, e pergunta o que falta em uma mensagem só:

> 1. "Quais faturas venciam esse mês? (cliente, valor, data)" Se `propostas/` e `contratos/` já dizem, listar e pedir só confirmação
> 2. "Tem relatório da maquininha? Me manda o CSV ou me diz o líquido de cada repasse"
> 3. "Cobrou alguém por Pix cobrança? Quem, quanto, quando"
> 4. "O que saiu: aluguel, sistema, contador, fornecedor, imposto, o que você tirou pra você"
> 5. "Tem lançamento que já sabe que foi pago em dinheiro ou por outra conta?"

O CSV tem cinco colunas: `data;cliente;referente;valor;origem`. Entrada positiva, saída
negativa, valor em formato brasileiro (`2.380,50`), origem em `proposta`, `contrato`,
`maquininha`, `pix` ou `caixa`. Maquininha entra pelo **líquido** do relatório; se o
usuário só tem o bruto, registrar bruto e taxa em duas linhas, porque a taxa é custo
variável que o `/caixa` precisa ver, não tolerância.

Pode passar mais de um arquivo (`--registros` repetido) quando o relatório da maquininha
já vem em CSV: o script aceita coluna com nome parecido (cliente, referente, descrição,
valor, data) em qualquer ordem, e `.xlsx` também.

### Passo 3 — Casar por comando

```bash
node scripts/conciliar.js dados/extrato-2026-09.ofx \
  --registros dados/registros-2026-09.csv \
  --registros dados/maquininha-2026-09.csv \
  --cobranca financeiro/a-receber-2026-09.csv \
  --saida financeiro/conciliacao-2026-09.md

# feriado da cidade que fecha banco (muda a conta de dia útil)
node scripts/conciliar.js dados/extrato.ofx --registros dados/registros-2026-09.csv --feriado 25/01 --saida financeiro/conciliacao-2026-01.md

# extrato que não traz saldo final: informar o inicial pra conferir o movimento
node scripts/conciliar.js dados/extrato.csv --registros dados/registros-2026-09.csv --saldo-inicial "4.120,33" --saida financeiro/conciliacao-2026-09.md
```

O script casa em quatro camadas, na ordem, e cada linha casa uma vez só:

| Camada | Nome na tabela | Regra | Folga |
|---|---|---|---|
| 1 | exata | mesmo valor, mesma data | nenhuma |
| 2 | data próxima | mesmo valor, até 2 dias úteis | data |
| 3 | nome e valor | nome parecido e valor igual em 30 dias corridos, ou valor até 2% diferente em 5 dias úteis | valor e data |
| 4 | soma | um lançamento igual à soma de 2 ou 3 do outro lado, em 5 dias úteis | agrupamento |

As folgas são as do molde e saem escritas no cabeçalho do arquivo. Mudar tolerância
(`--dias`, `--tolerancia`, `--janela`) é decisão do usuário, e o motivo vai no arquivo:
"subi pra 3 dias úteis porque o boleto do cliente X compensa em D+3". O um-pra-muitos para
em 3 lançamentos e 12 candidatos de propósito; mais que isso encontra soma pra qualquer
valor, inclusive a errada.

Nem toda linha dos arquivos entra na conta, e a regra é assimétrica de propósito:

| Lado | Entra | O que fica de fora |
|---|---|---|
| Banco | do dia 1 ao último dia do mês | o crédito de 02/10 é de outubro, e casar aqui abriria um buraco lá |
| Registros | o mês mais a janela pra trás e pra frente (`--janela`, 5 dias úteis) | previsto muito antes ou muito depois, que é da conciliação do mês dele |

Daí sai o item em trânsito, que aparece todo mês: fatura prevista pro dia 30 e paga no
dia 2 fica em "só nos registros" aqui e casa na conciliação seguinte. Isso não é erro. É o
motivo pelo qual a lista de sobras passa pelo usuário antes de virar cobrança, porque
mandar régua pra quem pagou em 02/10 queima o cliente por um problema de calendário. O que
ficou de fora dos dois lados sai em "Fora do mês", somado. Omitir, nunca.

Terminadas as camadas, o script cruza as duas listas de sobra com o que ficou fora do mês.
Quando bate (mesmo valor e data vizinha, ou mesmo valor e nome parecido do lado do banco),
a linha fica onde está, com a classe trocada por "casou com lançamento fora do mês" e o
mês em que aparece. Essas não vão pro `--cobranca`, e é aqui que se evita o erro mais caro
desta skill: cobrar de novo a cliente que pagou dia 28 do mês passado.

O script recusa gravar se o quadro não fechar a zero. Isso não acontece com dado ruim;
acontece com erro de lógica, e a resposta é mandar o arquivo pra conferência, não entregar.

### Passo 4 — Conferir os números

```bash
node scripts/verificar.js tabela financeiro/conciliacao-2026-09.md
node scripts/verificar.js datas financeiro/conciliacao-2026-09.md
```

Os dois precisam terminar em "Tudo certo." Se o `tabela` acusar, alguém editou linha de
tabela na mão; gerar de novo em vez de corrigir. E olhar os avisos que o script imprime:
`FITID` repetido, linha duplicada nos dois lados, coluna que não achou, lançamento fora do
mês. Cada aviso vai pra seção "Avisos da leitura" do arquivo e o usuário decide.

### Passo 5 — Explicar cada sobra com o usuário

O script classifica; o usuário identifica. Levar as duas listas pra conversa, uma linha por
vez quando forem poucas, ou a tabela inteira quando forem muitas, e perguntar só o que o
extrato não diz:

**Só no banco.** Tarifa, juros, imposto e rendimento quase nunca precisam de pergunta: é
lançar. Pix sem nome é a pergunta principal: "caiu R$ 980,00 dia 08/09 sem nome, você sabe
de quem é?". Se ele souber, criar o registro e rodar de novo. Se não souber, o caminho é o
comprovante no aplicativo do banco, que traz o nome do pagador e o identificador ponta a
ponta daquele Pix: com esse identificador o banco acha a transação mesmo quando o extrato
saiu sem nome. Chute não vale. Pix de R$ 980,00 não é "provavelmente do Pedro" só porque o
Pedro deve R$ 980,00. Crédito de maquininha que sobrou é sinal de que o relatório dela não
foi registrado, e a conta certa é contra o relatório, pelo líquido.

**Só nos registros.** Linha com classe "casou com lançamento fora do mês" não é atraso: o
dinheiro caiu, só em outra competência, e a conferência é abrir a conciliação daquele mês.
O resto sim. Entrada que não caiu é cliente que não pagou, e vai direto pro
`/cobranca`: o `--cobranca` já gravou `financeiro/a-receber-<AAAA-MM>.csv` no formato que o
`scripts/regua.js` lê, com a data prevista como vencimento. As colunas `telefone` e `email`
saem em branco, porque extrato não tem contato; quem preenche é o usuário ou o
`/cadastro-clientes`, e em branco a régua escreve "[a confirmar]" no lugar do contato. Saída que não saiu é conta paga
por outro caminho (dinheiro, outra conta, cartão pessoal) ou conta que não foi paga; a
resposta muda o `/caixa` e às vezes o `/obrigacoes`.

Dois padrões que aparecem em quase toda primeira conciliação, e que valem uma frase na
entrega: o mesmo cliente nos dois lados com nome diferente (apelido no registro, razão
social no banco), que se resolve padronizando o registro; e a sobra idêntica de um mês pro
outro, que é custo fixo que ninguém lançou e vai pra `financeiro/custos-fixos.md`.

### Passo 6 — Escrever as seções que são do assistente

O script escreve o arquivo com as tabelas. O assistente preenche os dois blocos marcados
entre colchetes e **não altera nenhuma linha de tabela**:

```markdown
# Conciliação — <mês>/<ano>

> Extrato: <arquivo> (<formato>, <codificação>, <banco>), N lançamentos. Registros: <arquivos>, N lançamentos.
> Tolerâncias: camada 2 até 2 dias úteis; camada 3 ...; camada 4 ... Gerado em <data>.

## O mês em uma frase
[Casou R$ X em N pares. Sobrou R$ Y no banco (o que é) e R$ Z nos registros (quem não pagou). O que fazer primeiro.]

## Bate a zero
[tabela do script: movimento, só de um lado, conciliado, diferença entre os lados, o que explica, sobra sem explicação = R$ 0,00]

## Só no banco (N)
[tabela do script: data, descrição, valor, classe, o que fazer, linha Total]

## Só nos meus registros (N)
[tabela do script: previsto, registro, origem, valor, classe, atraso em dias úteis, linha Total]

## Conciliados (N pares, N lançamentos do banco e N registros)
[tabela do script: data, descrição, registro, valor, camada, como casou, linha Total]

## Fora do mês (não entraram na conta)
[lista do script]

## O que fazer com cada sobra
[o assistente escreve, por linha: quem identificou o quê na conversa, o que vai pro caixa, o que vai pra cobrança, o que ficou aberto e com quem]

## Feriados considerados
[lista do script]

## Avisos da leitura
[lista do script]
```

Em "O que fazer com cada sobra", cada linha das duas tabelas de sobra ganha um destino:
`lançar no caixa como tarifa`, `cobrar (a-receber-2026-09.csv)`, `identificado: Pedro Alves,
registro criado, casou na segunda rodada`, ou `aberto: perguntar ao banco`. Sobra sem
destino escrito é sobra descartada, e isso a skill não faz.

Quando o usuário identificar um Pix ou corrigir um registro, editar o CSV de registros e
rodar o script de novo. O arquivo final é o da última rodada, e a seção "O que fazer" diz
o que mudou entre elas.

### Passo 7 — Entregar e passar adiante

Antes de mostrar, rodar os três e colar o resultado na conversa:

```bash
node scripts/verificar.js tabela financeiro/conciliacao-2026-09.md
node scripts/verificar.js datas financeiro/conciliacao-2026-09.md
node scripts/verificar.js texto financeiro/conciliacao-2026-09.md
```

A entrega é curta: o mês em uma frase, as três maiores sobras com o que fazer, quanto tem
a receber e de quem, e o aviso de que a taxa da maquininha e o imposto que apareceram aqui
vão pro fechamento. O arquivo inteiro fica em `financeiro/`.

Daqui saem três coisas: o `/caixa` lê `financeiro/conciliacao-<AAAA-MM>.md` antes de fechar
o mês (o que entrou de verdade, a tarifa e o imposto que faltavam, o que ainda vai cair); o
`/cobranca` lê `financeiro/a-receber-<AAAA-MM>.csv` e monta a régua; e o que ficou "aberto"
vira item em `tarefas.md` no formato do `/tarefas`, com a origem:
`- [ ] Descobrir de quem é o Pix de R$ 980,00 de 08/09 (/conciliar)`. Quem concilia todo
mês agenda no `/rotina`: "primeiro dia útil, exportar o OFX e rodar o conciliar".

---

## Regras

- **Nenhuma diferença some.** Toda linha do extrato e todo registro aparece em exatamente um lugar: conciliados, só no banco, só nos registros ou fora do mês. Sobra de R$ 0,37 tem linha própria e destino escrito. Descartar "porque é pequeno" é o começo do mês que não fecha
- **Nada de lançamento inventado pra fechar.** Registro entra porque o usuário confirmou (fatura, contrato, relatório da maquininha) ou porque está num arquivo dele. Criar linha "pra explicar" a sobra, arredondar centavo, supor de quem é um Pix pelo valor que alguém devia ou dar nome a "a identificar" por dedução é fabricar dado, e o estrago aparece dois meses depois, no cliente cobrado por engano. Sobra sem dono fica escrita como sobra sem dono
- **Tolerância é declarada, nunca escondida.** As quatro camadas e as folgas de cada uma saem no cabeçalho do arquivo; o valor que a camada 3 aceitou aparece somado no quadro. Mudou a tolerância, o motivo vai escrito. Par de camada 3 ou 4 se confere no comprovante quando dois clientes pagam o mesmo valor no mesmo mês
- **Todo casamento passou pelo comando.** O arquivo nasce do `scripts/conciliar.js` e é conferido pelo `verificar.js tabela` e `datas`. Tabela editada na mão que quebrar a conferência é regenerada, não corrigida. Conciliar "de olho" no chat não é conciliar
- **Quadro que não fecha não se entrega.** Sobra sem explicação diferente de zero é erro de lógica do script, e o caminho é conferir o script, nunca ajustar o número
- **Ler antes de casar.** O `--ler` vem antes de tudo: acento, sinal e mês conferidos com o usuário. Extrato lido com codificação errada casa errado em silêncio, porque "JO?O" não é parecido com "João"
- **Maquininha pelo líquido, e nunca pra régua.** A taxa da adquirente não é tolerância: é custo variável que o `/caixa` mostra. Repasse que não caiu se confere no relatório da adquirente e no prazo do contrato dela; o `--cobranca` deixa essas linhas de fora
- **Saldo é estoque, conciliação é fluxo.** O quadro bate movimento contra movimento. Saldo inicial mais movimento diferente do saldo final é extrato incompleto (período errado, página que faltou), e o conserto é exportar de novo
- **Não é contabilidade.** A conciliação daqui é gerencial: serve pro dono decidir e cobrar. Conciliação contábil, lançamento no livro, classificação fiscal e o que a Receita cruza são conversa com o contador; dizer isso uma vez quando a pergunta for pra lá
- **Fronteira com as vizinhas:** o `/caixa` fecha o mês a partir daqui e classifica o que entrou (fixo, variável, retirada); este arquivo é pré-requisito do fechamento, não o fechamento. O `/cobranca` recebe o que não caiu e monta a régua; esta skill não escreve mensagem de cobrança. O `/proposta` e o `/contrato` dizem o que deveria ter entrado; o `/obrigacoes` diz que imposto deveria ter saído; o `/comprovantes` cuida do documento por trás de cada lançamento. Esta skill é o casamento dos dois lados e a lista de sobras, nada além
- **Dado bancário não sai do workspace.** Extrato, nome de cliente, CPF ou CNPJ que aparece na descrição do Pix e valor de repasse ficam em `dados/` e `financeiro/`. Não vão pra WebSearch, pra ferramenta externa nem pra exemplo de comando. A busca pergunta "como exportar OFX do Inter", nunca com dado da conta
- **LGPD:** a descrição do Pix traz nome e às vezes CPF do pagador. Isso entra no arquivo só porque é necessário pra identificar o pagamento; não vai pra lista de contatos, pra conteúdo nem pra mensagem sem o usuário decidir. `dados/` fica fora do git por padrão, e `financeiro/` só entra no `/salvar` se o repositório for privado
- **Quando o resultado for ruim, dizer o resultado.** Três clientes sem pagar, R$ 4.348,00 a receber, Pix de R$ 980,00 sem dono há dois meses: escrever com o número e o próximo passo. Suavizar a sobra é o mesmo que descartá-la
