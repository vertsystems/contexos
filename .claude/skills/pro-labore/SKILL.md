---
name: pro-labore
description: >
  Calcula quanto o dono tira da empresa por mês, separando pró-labore de distribuição de
  lucro. Acha o pró-labore mínimo que segura a alíquota do Anexo III do Simples (Fator R de
  28%), soma o que ele custa de INSS e de IRRF contra a economia de DAS, e diz quanto ainda
  sai como lucro isento dentro da presunção. Cada tabela com lei, fonte e data.
  Use quando o usuário disser "quanto eu tiro pra mim", "quanto de pró-labore eu coloco",
  "meu contador falou em Fator R", "pago 15,5% de imposto e queria pagar 6%", "posso tirar
  tudo como lucro", "é melhor pró-labore ou distribuição", "quanto eu posso retirar sem
  pagar imposto", "tirar mais pró-labore ajuda na aposentadoria?", "nunca definimos quanto
  cada sócio tira", "minha retirada tá certa?", ou /pro-labore.
---

# /pro-labore — Quanto o dono tira

> **Convenção de pastas:** a saída vai em `financeiro/retirada.md`. Na convenção **por cliente**, a retirada da própria casa fica na raiz (`financeiro/`); simulação feita pra um cliente vai em `clientes/<Nome>/financeiro/retirada.md`. Quando já existe um arquivo, ele é renomeado pra `retirada-<AAAA-MM-DD>.md` com a data em que foi feito, e o novo assume o nome sem data. A pasta nasce na primeira simulação.

Quem tem CNPJ e trabalha nele tira dinheiro por duas portas: pela folha, como pró-labore, ou
pelo caixa, como lucro. Parece a mesma coisa porque chega no mesmo
bolso. Não é: numa empresa de serviço, o pró-labore é folha, e é a folha que decide se o
Simples cobra 6% ou 15,5% sobre tudo que a empresa faturar no ano. Num escritório com
R$ 40 mil de faturamento por mês, escolher errado custa mais de R$ 30 mil por ano. A
decisão é tomada uma vez, vale doze meses, e quase sempre é tomada no escuro.

> **Isto não é aconselhamento contábil.** A skill monta a simulação com a conta aberta e as
> fontes na mão. Quem lança na folha, emite o recibo e assume o risco é o contador. A skill
> diz isso na entrega, uma vez, e entrega junto a pergunta pronta pra ele.

## Dependências

- **Contexto:** `_memoria/empresa.md` — regime tributário, anexo do Simples, quantos sócios trabalham, se tem contador, se tem empregado
- **Preferências:** `_memoria/preferencias.md` — o tom da entrega; a conversa é sobre o dinheiro dele, e o registro pesa
- **Faturamento e sobra:** os fechamentos do `/caixa` em `financeiro/fechamento-<AAAA-MM>.md`. É de lá que saem a receita dos 12 meses e o quanto sobra por mês
- **Enquadramento:** `financeiro/obrigacoes.md` (do `/obrigacoes`), quando existir, pro anexo e pra RBT12 já conferida
- **Folha atual:** `pessoas/contratacao-*.md` (do `/custo-de-funcionario`), quando existir, pro custo de empregado que já entra na folha
- **Referência:** `templates/operacao/pro-labore.md` — as duas portas de saída do dinheiro, a mecânica do Fator R, as seis faixas do Anexo III e do V, presunção, retenção de 10%, sinais de retirada errada e glossário, cada bloco com fonte e data
- **Referência fiscal:** `templates/financeiro/obrigacoes.md` — teto do INSS, GPS do contribuinte individual e a fórmula da alíquota efetiva. A tabela do IRRF mora no `scripts/custo-funcionario.js`, e é de lá que o script desta skill a lê
- **Script:** `scripts/pro-labore.js` — a simulação inteira; usa `scripts/br.js` pra número e moeda e lê as tabelas de INSS e IRRF do `scripts/custo-funcionario.js`
- **Conferência:** `node scripts/verificar.js tabela` e `texto`
- **Saída:** `financeiro/retirada.md`

---

## Workflow

### Passo 1 — Descobrir o regime, e parar cedo quando não se aplica

Quatro caminhos, e três deles terminam aqui. Se `_memoria/empresa.md` já diz o regime, não
perguntar de novo. Se não diz, uma pergunta por vez, parando quando fechar:

1. "Você tem CNPJ?" Não: a pergunta dele é outra, e quem responde é o `/obrigacoes` (autônomo pessoa física não tem pró-labore, tem carnê-leão)
2. "É MEI ou ME?" Se ele não sabe: "o boleto do mês é sempre o mesmo valor, entre R$ 82 e R$ 87?" Sim é MEI, porque o DAS dele é fixo e não acompanha o faturamento
3. Se ME: "está no Simples Nacional, ou no Lucro Presumido?" Se não sabe, o contador sabe; a guia mensal única (DAS) é sinal de Simples
4. Se Simples: "qual anexo o contador te disse?" Se não sabe, perguntar o que a empresa faz e olhar a tabela do molde. Anexo III e Anexo V são os dois que o Fator R conecta; I, II e IV ficam de fora
5. "Quantos sócios recebem retirada, e quantos deles trabalham na empresa?"

**MEI, Lucro Presumido e Lucro Real não têm Fator R.** Nesses três casos rodar o script
mesmo assim, porque ele escreve a linha do "não se aplica, e por quê" com a base legal, e é
essa linha que o usuário precisa pra parar de perseguir uma economia que não existe:

```bash
node scripts/pro-labore.js --regime mei --receita12 78000 --md financeiro/retirada.md
node scripts/pro-labore.js --regime presumido --receita12 900000 --md financeiro/retirada.md
```

Depois disso a conversa vira `/caixa` (quanto cabe tirar sem quebrar o mês) ou `/obrigacoes`
(o calendário e o teto). Não insistir.

### Passo 2 — Levantar os quatro números

A simulação tem quatro entradas, e três delas costumam já estar no workspace. Ler antes de
perguntar; perguntar só o que faltar, uma coisa por vez.

| Número | Onde procurar | Se não achar, perguntar |
|---|---|---|
| Receita bruta dos 12 meses (RBT12) | linha "Entrou" de cada `financeiro/fechamento-<AAAA-MM>.md`, somada por comando | "quanto a empresa faturou nos últimos 12 meses, somando tudo?" |
| Folha de empregados dos 12 meses, com FGTS e INSS recolhido | `pessoas/contratacao-*.md` e a linha de salário dos fechamentos | "quanto você paga de salário e encargo por mês, somando a equipe?" |
| Pró-labore de hoje, por mês | `financeiro/fechamento-*.md`, linha de retirada | "quanto sai hoje como pró-labore, com recibo e INSS?" |
| Sobra mensal antes da retirada | linha de lucro dos fechamentos | "quanto sobra por mês depois de pagar tudo, antes de você tirar?" |

Somar a receita por comando, nunca de cabeça:

```bash
grep -h "^| Entrou" financeiro/fechamento-*.md
node -e 'const f=[38000,41500,36200,44000,39800,42100,37500,40900,43200,38600,41000,45200]; console.log("RBT12:", f.reduce((a,b)=>a+b,0).toFixed(2), "| meses:", f.length)'
```

Se houver menos de 12 fechamentos, a base é curta e o arquivo diz isso: RBT12 de empresa
nova é a soma do que existe, e o Fator R dela vai mudar todo mês. Anotar `[base de N meses]`
ao lado do número.

**Uma pergunta que o usuário quase nunca responde de primeira:** o que ele tira hoje tem
recibo de pró-labore, ou é só transferência? A base do contribuinte individual é o total
pago ou creditado a qualquer título no mês (Lei 8.212/1991, art. 28, III; IN RFB 2.110/2022,
art. 33, II), e sem discriminação entre trabalho e lucro a retirada inteira tende a ser
tratada como remuneração. Se a resposta for "eu só transfiro", isso vira o primeiro item da
conversa com o contador, antes de qualquer otimização.

### Passo 3 — Reconferir as tabelas antes de entregar

O molde e o script carregam a data da última conferência, e data velha vale como pista, não
como fonte. Antes de escrever no arquivo do usuário, rodar WebSearch nos valores que vão
entrar, com termo genérico e nunca com dado do negócio:

| O que conferir | Onde (fonte oficial) | Quando muda |
|---|---|---|
| Salário mínimo | planalto.gov.br, decreto de dezembro | janeiro |
| Teto do salário de contribuição do INSS | Portaria Interministerial MPS/MF de janeiro, gov.br/previdencia | janeiro |
| Tabela progressiva mensal do IRRF e o redutor | gov.br/receitafederal, "Meu Imposto de Renda", tabelas | quase todo ano desde 2023 |
| Alíquota e parcela a deduzir dos Anexos III e V | LC 123/2006 no planalto.gov.br | só por lei complementar |
| Piso de 28% do Fator R, e a janela de 12 meses | LC 123/2006, art. 18, §5º-J, §5º-K e §5º-M | só por lei complementar |
| Presunção da distribuição isenta | Lei 9.249/1995, art. 15, e Lei 9.250/1995, art. 40 | só por lei |
| Retenção de 10% sobre distribuição acima de R$ 50 mil no mês | Lei 9.250/1995, art. 6º-A (inserido pela Lei 15.270/2025) e perguntas e respostas da Receita | por lei; a regra é nova, de janeiro de 2026 |

O que a busca confirmar entra com a URL e a data de hoje. O que não confirmar entra como
`[a confirmar]`, com o lugar onde conferir. Se a busca mostrar valor diferente do que está
no `scripts/pro-labore.js`, avisar: o script precisa de atualização, e o número do arquivo
vai pelo novo.

### Passo 4 — Rodar a simulação por comando

Nenhum número desta skill é calculado de cabeça. A alíquota efetiva tem parcela a deduzir, o
IRRF tem cinco faixas e um redutor, o INSS tem teto, e o alvo do Fator R é uma divisão que
precisa arredondar pra cima porque 27,99% cai no Anexo V.

```bash
# agência no Anexo V: RBT12 de R$ 480 mil, R$ 96 mil de folha de empregados,
# pró-labore de R$ 3.000, sobra de R$ 22 mil por mês
node scripts/pro-labore.js --anexo V --receita12 480000 --folha12 96000 \
  --prolabore 3000 --sobra 22000 --distribuir 15000 \
  --nome "Estúdio Arauto" --md financeiro/retirada.md

# dois sócios, um dependente no IRRF, folha que já cruzou os 28%
node scripts/pro-labore.js --anexo III --receita12 720000 --folha12 180000 \
  --prolabore 6000 --socios 2 --dependentes 1 --md financeiro/retirada.md

# só os números, pra conferir uma hipótese antes de escrever
node scripts/pro-labore.js --anexo V --receita12 170000 --json
```

O script devolve, em uma tela: o Fator R de hoje, o pró-labore mensal que fecha os 28%, a
alíquota efetiva nos dois anexos, a economia de DAS no ano, o INSS e o IRRF a mais que esse
pró-labore custa, o saldo entre os dois, o limite da distribuição isenta e os avisos que
mudam a decisão. Ele escreve o arquivo inteiro com `--md`, tabelas prontas e seção de fontes
no fim.

Três coisas que ele faz sozinho e que a conta de cabeça erra. Com `--socios 2` o imposto sai
de dois pró-labores em partes iguais, não de um só, porque a tabela do IRRF é progressiva e
somar tudo numa pessoa infla o custo. Quando a folha já passa de 28%, ele mostra o pró-labore
mínimo que ainda sustenta o Anexo III em vez de repetir o valor de hoje. E acima de
R$ 4.320.000 de RBT12 ele avisa que o Fator R inverteu de sinal: ali o Anexo V fica mais
barato que o III, e cruzar os 28% aumenta o DAS.

O assistente edita depois esse mesmo arquivo: acrescenta as seções do Passo 6 e **não altera
nenhuma linha das tabelas**. Número editado na mão é número que ninguém consegue reproduzir.

### Passo 5 — Ler o resultado com o usuário, em três frases

O script cospe muita coisa. O que vai pro chat é curto, e nesta ordem:

1. **Onde ele está:** "seu Fator R é 27,5%, e a linha é 28%. Falta pouco."
2. **O que muda:** "subindo o pró-labore de R$ 3.000 pra R$ 3.200 por mês, a alíquota cai de 17,44% pra 9,83%. São R$ 36.540 menos de DAS no ano, e R$ 264 a mais de INSS."
3. **O que ele decide:** "o pró-labore é decisão de folha, e o contador lança. A pergunta pra ele é: em que mês a alíquota muda, já que o Fator R olha os 12 meses anteriores?"

Quando o saldo dá negativo, dizer isso com o mesmo tom. Não vale cruzar o Fator R a qualquer
custo: com receita alta e folha zero, o alvo passa do teto do INSS, o IRRF vai pra 27,5% e o
imposto a mais come a economia inteira. O arquivo mostra os dois números e recomenda ficar
onde está.

Três coisas que o usuário vai perguntar aqui, e que a skill responde sem enrolar:

- **"Posso tirar tudo como lucro, sem pró-labore?"** A lei põe "o sócio gerente e o sócio cotista que recebam remuneração decorrente de seu trabalho" como contribuinte individual (Lei 8.212/1991, art. 12, V, "f"), e a base da contribuição é a remuneração auferida no mês (art. 28, III). Sem pró-labore discriminado, o que sai pro sócio tende a ser tratado como remuneração inteira, e a empresa fica devendo a contribuição
- **"Tirar mais pró-labore aumenta minha aposentadoria?"** Até o teto, sim, porque a contribuição entra na média. Acima do teto, não: a contribuição trava e só o IRRF continua subindo. Valor exato de benefício sai do extrato do CNIS, não desta skill
- **"E se eu contratar em vez de subir o pró-labore?"** Salário de empregado conta no Fator R com os encargos por cima, e às vezes cruza os 28% mais barato. O `/custo-de-funcionario` fecha essa conta, e o `/decidir` conduz quando contratar é decisão grande

### Passo 6 — Escrever o arquivo

O script já escreve as tabelas. O assistente acrescenta as seções de decisão, na abertura e
no fim, e mantém o resto intacto:

```markdown
# Retirada — <nome do negócio>

> Gerado por `node scripts/pro-labore.js` em <DD/MM/AAAA>. Tabelas conferidas em <DD/MM/AAAA>.
> Não é aconselhamento contábil: a simulação vai ao contador antes de virar folha.

## A decisão em uma frase
[pró-labore de R$ X por mês e distribuição de até R$ Y, porque o Fator R cruza em 28% e o
saldo entre economia de DAS e imposto a mais é de R$ Z no ano]

## O que entrou na conta
[tabela do script: anexo, RBT12, receita do mês, folha de empregados, pró-labore de hoje,
sócios, dependentes, sobra]

## Fator R
[tabela do script: folha de hoje, fator de hoje, folha necessária, falta e o pró-labore alvo;
quando a folha já cruzou, entra no lugar dele o mínimo que ainda sustenta os 28%]

## A alíquota nos dois anexos
[tabela do script: faixa, efetiva no V, efetiva no III, DAS do ano nos dois, economia]

## O que o pró-labore do Fator R custa
[tabela do script: INSS do ano, IRRF do ano, total; e a conta mensal em prosa. Com mais de um
sócio, o script divide o alvo em partes iguais e diz que dividiu]

## O veredito
[tabela do script: economia, imposto a mais, saldo, pró-labore recomendado]

## Distribuição de lucro isenta
[tabela do script: presunção, DAS do ano, limite no ano, limite por mês]

## Aposentadoria: piso e teto
[tabela do script: salário de contribuição, INSS mensal, piso, teto]

## Avisos
[a lista do script, mais o que a conversa acrescentou]

## O que levar pro contador
1. [pergunta pronta, uma linha cada, na ordem de quem responde primeiro]
2. ...

## O que não deu pra confirmar
[cada [a confirmar], com onde conferir]

## Quando revisar
[a data: mudança de faixa da RBT12, contratação, saída de sócio, ou janeiro do ano que vem]

## Fontes
[a lista do script, com lei, portaria, URL e data]
```

A seção "O que levar pro contador" é a que faz o arquivo valer a viagem. Ela sai da
simulação, não de um modelo genérico: em que mês a alíquota muda, se o recibo de pró-labore
dos meses passados está certo, se a distribuição do ano cabe na presunção, e se vale
contratar escrituração contábil pra derrubar o teto do art. 14.

### Passo 7 — Conferir e entregar

Antes de mostrar, rodar os dois comandos e colar o resultado na conversa:

```bash
node scripts/verificar.js tabela financeiro/retirada.md
node scripts/verificar.js texto financeiro/retirada.md
```

Os dois precisam terminar em "Tudo certo." Se a soma divergir, refazer pelo script a partir
do dado bruto; nunca ajustar número pra bater.

A entrega no chat é o Passo 5, mais uma linha dizendo onde o arquivo ficou. Pra fechar,
levar a data de revisão pro `tarefas.md`, no formato do `/tarefas`, com a origem:

```
- [ ] Revisar o pró-labore com o contador (Fator R e limite de distribuição) — 15/01/2027 (/pro-labore)
```

Item único, em "Depois". Retirada é decisão de uma vez por ano que muda dinheiro todo mês, e
o lugar dela é o começo do ano, junto da opção pelo Simples.

---

## Regras

- **Nunca chutar alíquota, teto, piso ou prazo.** O que não foi conferido nesta entrega entra como `[a confirmar]`, com o lugar onde conferir. Fonte é Planalto, Receita Federal, gov.br/previdencia ou portal do Simples, com URL e data. Blog de contabilidade serve pra achar a norma, nunca como fonte no arquivo
- **Toda conta passou pelo comando.** Alíquota efetiva, IRRF por faixa, INSS com teto e alvo do Fator R saem do `scripts/pro-labore.js`. Nenhum desses números é reproduzido de memória no chat, porque o usuário vai levar o arquivo pro contador e a conta precisa fechar na frente dele
- **O Fator R olha 12 meses pra trás, e isso muda a promessa.** Subir o pró-labore hoje não muda a alíquota do mês que vem: a folha nova entra um doze avos por mês. Dizer isso sempre, com a pergunta pro contador sobre em que mês a conta vira. Prometer economia imediata é o erro mais comum de quem vende essa ideia
- **Pró-labore é decisão de folha, e folha tem dono.** A skill calcula e recomenda; quem lança, emite recibo, recolhe o INSS e informa no eSocial é o contador. Mudar o valor por conta própria sem avisar ele gera diferença de guia e retificação
- Sobre aposentadoria a skill afirma duas coisas, e só: contribuir sobre o mínimo dá benefício de um salário mínimo, e acima do teto a contribuição trava. Valor de benefício depende da média da vida inteira e do tempo de contribuição, e sai do extrato do CNIS, nunca desta conta
- **Retirada não é lucro, e lucro não é o que está na conta.** Se o `/caixa` não foi fechado, a sobra é chute, e o arquivo diz isso. Simulação com sobra inventada recomenda um pró-labore que quebra o caixa em três meses
- **Distribuição tem dois limites, e os dois entram no arquivo.** O da presunção, sem escrituração contábil (LC 123/2006, art. 14, §1º), e a retenção de 10% sobre o que passar de R$ 50 mil pagos pela mesma empresa ao mesmo sócio num mês (Lei 15.270/2025). Distribuir acima do primeiro sem escrituração é rendimento tributável na pessoa física, não economia
- **Sócio que trabalha tem pró-labore.** Não existe versão em que a skill recomende zerar. A base do contribuinte individual é o total pago ou creditado a qualquer título no mês (Lei 8.212/1991, art. 28, III; IN RFB 2.110/2022, art. 33, II), então sem discriminação entre trabalho e lucro a retirada inteira tende a virar remuneração, com a contribuição em aberto e correção por cima. O dispositivo exato vai pra lista do contador, não pro arquivo como certeza
- **Quando não vale, dizer que não vale.** Alvo acima do teto do INSS, IRRF na faixa de 27,5% ou RBT12 acima de R$ 4.320.000, que é onde as duas curvas se cruzam e o Anexo V passa a ser mais barato que o III: nesses casos a recomendação é ficar onde está. A skill não existe pra justificar a mudança, existe pra calcular se ela paga
- **Não é consultoria contábil nem jurídica.** Reenquadramento, CNAE, retificação de guia, escrituração e planejamento tributário são decisão com contador. A skill entrega a conta e a pergunta pronta, nunca a decisão. Isso aparece uma vez na entrega, sem sermão
- **LGPD e dado sensível.** CNPJ, CPF, faturamento, folha, nome de sócio e valor de retirada ficam em `_memoria/` e `financeiro/`. Não vão pra WebSearch, pra prompt de ferramenta externa nem pra exemplo de comando. A busca pergunta "teto do INSS 2026", nunca "pró-labore do CNPJ tal"
- **Fronteira com as vizinhas:** o `/caixa` fecha o mês e trata a retirada como número de entrada, e é de lá que vem a receita e a sobra; o `/obrigacoes` monta o calendário fiscal e manda o pró-labore pra cá de propósito; o `/custo-de-funcionario` cuida do custo de quem tem carteira, que entra na mesma folha por outro lado; o `/socios` divide a sociedade e cuida de quem sai, não de quanto cada um retira por mês; o `/projecao` testa a retirada nova em três cenários de caixa; o `/decidir` entra quando contratar pra cruzar o Fator R é a decisão em si; o `/preco` usa a alíquota daqui pro piso do orçamento. Esta skill é o tamanho da retirada, nada além
- **O molde e o script envelhecem juntos.** Se a conferência do Passo 3 achar valor diferente, o arquivo do usuário vai pelo novo, e o aviso é explícito: `templates/operacao/pro-labore.md` e `scripts/pro-labore.js` precisam de atualização (o `/atualizar-sistema` traz a versão nova quando ela sai)
