---
name: comprovantes
description: >
  Organiza a pasta bagunçada de nota fiscal, comprovante de Pix, boleto e recibo: o assistente
  abre cada arquivo e preenche um manifesto, o comando confere, copia com nome padronizado pra
  financeiro/comprovantes/AAAA/MM/categoria/, soma por categoria nas mesmas categorias do caixa
  e escreve o CSV que o contador abre. O que faltou dado vai pra revisar/, nada é movido e todo
  lote tem log pra desfazer.
  Use quando o usuário disser "me manda as notas do mês", "o contador pediu os comprovantes",
  "organiza essa pasta de notas", "tá tudo bagunçado, não acho nota nenhuma", "preciso separar
  as notas de setembro", "tenho um monte de foto de recibo no celular", "quanto eu gastei com
  fornecedor esse mês", "não sei se essa nota eu já lancei", "renomeia esses comprovantes",
  "guardar nota fiscal por quanto tempo", ou /comprovantes.
---

# /comprovantes — A pasta de notas que o contador abre sem reclamar

> **Convenção de pastas:** a saída vai em `financeiro/comprovantes/<AAAA>/<MM>/<categoria>/`, com `comprovantes-<AAAA-MM>.csv`, `comprovantes-<AAAA-MM>.md`, `revisar/` e `log/` na raiz de `financeiro/comprovantes/`. Na convenção **por cliente**, os comprovantes do próprio negócio ficam na raiz; só vão pra `clientes/<Nome>/financeiro/comprovantes/` quando o usuário organiza a papelada do cliente dele. A pasta nasce no primeiro lote organizado.

Ninguém perde a nota fiscal. O que se perde é o **nome** dela. Na pasta de downloads
convivem `documento (3).pdf`, `IMG_4472.jpg`, `nfse.pdf` e `comprovante.png`, e em maio o
contador pede "as notas de setembro". Aí vai uma hora abrindo arquivo por arquivo, e o que
não abre vira despesa que ninguém lançou: dinheiro que saiu do caixa e não apareceu em
lugar nenhum. O conserto não é disciplina nem aplicativo novo. É um nome de arquivo que se
lê sem abrir, uma pasta por mês, e a soma feita por comando.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio compra e vende, se tem CNPJ, se tem contador, se tem empregado, quais fornecedores se repetem todo mês
- **Enquadramento:** `financeiro/obrigacoes.md` (`/obrigacoes`), quando existir — diz qual documento o regime exige e qual imposto tem guia pra guardar
- **Fechamento:** `financeiro/fechamento-<AAAA-MM>.md` (`/caixa`) e `financeiro/conciliacao-<AAAA-MM>.md` (`/conciliar`), quando existirem — é contra eles que o total daqui é conferido
- **Entrada de dado:** a pasta que o usuário jogar em `dados/` (ou a pasta de downloads que ele indicar)
- **Referência:** `templates/financeiro/comprovantes.md` — os documentos brasileiros e o que cada um prova, as cinco categorias, o padrão de nome, o prazo de guarda com fonte e data, as armadilhas
- **Script:** `scripts/comprovantes.js` — `listar`, `conferir`, `organizar` e `desfazer`; usa `scripts/br.js` pra data, número e dígito de CNPJ
- **Conferência:** `node scripts/verificar.js tabela` e `texto`
- **Saída:** `financeiro/comprovantes/<AAAA>/<MM>/<categoria>/<AAAA-MM-DD Fornecedor - Descrição.ext>`, mais `financeiro/comprovantes/comprovantes-<AAAA-MM>.csv` e `comprovantes-<AAAA-MM>.md`

---

## Workflow

### Passo 1 — Descobrir onde estão os arquivos e de que mês é o lote

Levantamento, então uma mensagem só:

> 1. "Onde estão os arquivos? (pode ser a pasta de downloads, uma pasta do Drive, ou joga tudo em `dados/`)"
> 2. "De que mês é esse lote?"
> 3. "Tem foto de recibo no celular que ainda não foi pro computador?"

Se ele não sabe responder a primeira, a resposta prática é: criar `dados/comprovantes-<mês>/`
e pedir que arraste tudo pra lá, inclusive o que ele acha que não serve. Separar antes de
listar é o que faz o lote ficar incompleto.

A terceira pergunta parece detalhe e não é: em negócio pequeno, boa parte do recibo de
faxina, de frete e de feira existe só como foto no celular, e foto que não sai de lá não
entra em soma nenhuma.

### Passo 2 — Listar a pasta por comando

```bash
node scripts/comprovantes.js listar dados/comprovantes-setembro --mes 2026-09 \
  --saida dados/comprovantes-2026-09.json
```

O comando varre a pasta e as subpastas, e escreve o manifesto: um item por arquivo, com os
campos vazios e um `palpite` tirado do nome do arquivo. Ele considera `pdf`, `jpg`, `jpeg`,
`png`, `heic`, `heif`, `webp` e `xml`; o que ficou fora aparece na tela com o nome, e é aí
que se descobre o `.zip` da contabilidade ou o `.ofx` do banco que vieram junto.

Mostrar ao usuário quantos arquivos entraram e quantos ficaram fora. Se ficou fora algo que
importa, `--ext pdf,png,xml,zip` inclui.

Os três comandos rodam sempre da raiz do workspace. O manifesto guarda o caminho de cada
arquivo como ele foi digitado no `listar`, então mudar de pasta entre um comando e outro faz
o `conferir` acusar arquivo que sumiu quando o arquivo está lá. Pasta com espaço no nome vai
entre aspas.

### Passo 3 — Abrir cada comprovante e preencher o manifesto

Aqui o trabalho é do assistente, e é leitura de verdade: abrir cada arquivo pela ferramenta
Read (PDF e imagem entram direto) e preencher, no manifesto:

| Campo | O que entra | Quando não der |
|---|---|---|
| `data` | data de **emissão** do documento, em `DD/MM/AAAA` | deixar vazio: o arquivo vai pra `revisar/` |
| `fornecedor` | nome de quem emitiu, como está no documento | vazio |
| `cnpj` | CNPJ ou CPF do emitente, se aparecer | vazio, e não é obrigatório |
| `documento` | `NFS-e`, `DANFE`, `comprovante Pix`, `boleto`, `recibo`, `cupom` | escrever o que se vê |
| `numero` | número da nota ou do documento | vazio |
| `descricao` | o que foi comprado, em português curto: "Insumo de produção", "Honorários de setembro" | vazio, e o nome do arquivo sai só com fornecedor e documento |
| `categoria` | `receita`, `fixo`, `variavel`, `retirada` ou `investimento` | vazio: vai pra `revisar/` |
| `subcategoria` | `aluguel`, `contador`, `fornecedor`, `taxa da maquininha`, `pró-labore` | vazio |
| `valor` | valor total, em formato brasileiro (`1.234,56`) | vazio |
| `forma` | `pix`, `boleto`, `cartão`, `dinheiro`, `débito automático` | vazio |
| `lido_por` | `assistente`, a marca de que o arquivo foi aberto | nunca deixar vazio se foi lido |
| `observacao` | o que o próximo leitor precisa saber ("foto tremida", "mesmo aluguel do recibo") | vazio |

Três regras de leitura que evitam o erro caro:

- **O campo `palpite` é pra conferir, não pra copiar.** Ele vem do nome do arquivo, e nome de arquivo mente: `boleto-1234.pdf` pode ser o número do boleto ou o valor dele
- **Valor ilegível não se estima.** Nota rasgada, foto tremida e cupom apagado ficam com `valor` vazio e uma `observacao` dizendo o motivo. `[a confirmar]` visível vale mais que número plausível
- **XML de NF-e é texto:** abrir e ler os campos `<nNF>`, `<dhEmi>`, `<xNome>` e `<vNF>` em vez de adivinhar pelo nome do arquivo

Quando aparecer documento que não é comprovante (orçamento, proposta, print de conversa,
catálogo), deixar os campos vazios e escrever na `observacao` o que é. Ele vai pra
`revisar/` e o usuário decide.

A escrita é no próprio JSON: editar os campos de cada item, sem tocar em `arquivo`, sem
apagar item e sem inventar item que não estava na pasta. O `palpite` pode ficar onde está.
Lote de trinta ou mais se lê em blocos de dez, avisando o usuário a cada bloco quantos
faltam: assim ele já corrige a categoria de um fornecedor no meio do caminho, em vez de no
fim.

### Passo 4 — Conferir o manifesto por comando

```bash
node scripts/comprovantes.js conferir dados/comprovantes-2026-09.json
```

O comando separa três coisas, e a diferença entre elas é o que decide o que acontece com o
lote:

| | O que é | O que acontece |
|---|---|---|
| **Erro** | data que não existe no calendário, valor que não é número, valor zerado, categoria fora da lista, arquivo que sumiu | o lote inteiro para: nada é copiado |
| **Falta** | sem data, sem fornecedor, sem valor ou sem categoria | só aquele arquivo vai pra `revisar/`, o resto segue |
| **Aviso** | duplicata provável, CNPJ que não passa no dígito, data fora do mês do lote, data no futuro, boleto sem comprovante, item sem `lido_por` | nada para; o usuário decide |

Erro se corrige no manifesto e o comando roda de novo. Aviso vai pra conversa do Passo 5.
A saída já mostra o total por categoria: é o primeiro número que o usuário vê, e costuma ser
onde ele descobre que gastou 1.800 reais em algo que jurava ser 900.

### Passo 5 — Resolver com o usuário o que o comando marcou

O comando aponta; quem decide é o usuário. Uma pergunta por vez, só o que o documento não
responde:

- **Duplicata provável** (mesmo fornecedor, valor e data): "chegou o PDF da nota e a foto do recibo do aluguel de setembro, os dois de R$ 1.800,00. Mantenho os dois ou só a nota?" Duas cópias do mesmo pagamento somam duas vezes no fechamento, e é o erro mais comum do primeiro lote
- **Data fora do mês**: nota de agosto que chegou em setembro fica em `2026/08/` e aparece no aviso. Perguntar se ela já entrou no fechamento anterior
- **Categoria dúbia**: curso é `investimento` ou `variavel`? Mercado pago pela conta do negócio é `retirada`. Decidir com ele, e **manter a decisão nos meses seguintes**, senão a comparação entre meses deixa de valer
- **CNPJ que não passa no dígito**: quase sempre é dígito trocado na leitura, não nota falsa. Abrir o arquivo de novo antes de acusar qualquer coisa
- **Boleto sem comprovante do banco**: "esse boleto da Vivo de R$ 149,90 foi pago?" Boleto é cobrança. Se foi pago, o comprovante entra como segundo arquivo e a `observacao` diz isso; se não foi, ele sai do lote e vira conta a pagar, não despesa do mês
- **Data no futuro**: o aviso pega 2016 digitado onde era 2026 e 03/09/2027 onde era 2026. É erro de leitura em quase todo caso, e a data manda na pasta: conferir no documento antes de organizar

O que ficar sem resposta continua vazio. Campo vazio manda o arquivo pra `revisar/`, e isso
é melhor que palpite: `revisar/` é uma lista de cinco minutos de trabalho, e número errado
no CSV é uma hora do contador.

### Passo 6 — Organizar por comando

Primeiro o ensaio, que não escreve nada:

```bash
node scripts/comprovantes.js organizar dados/comprovantes-2026-09.json --simular
```

Sai o plano linha por linha, `origem → destino`. Mostrar ao usuário e só então valer:

```bash
node scripts/comprovantes.js organizar dados/comprovantes-2026-09.json

# contador que abre o CSV no Excel em português e quer o total dentro do arquivo
node scripts/comprovantes.js organizar dados/comprovantes-2026-09.json --bom --totais-no-csv

# organizando a papelada de um cliente, na convenção por cliente
node scripts/comprovantes.js organizar dados/comprovantes-2026-09.json \
  --destino "clientes/Padaria Aurora/financeiro/comprovantes"
```

O comando **copia**, nunca move: o original fica onde estava. Arquivo idêntico que já está
no lugar certo não é copiado de novo nem ganha `(2)`, então rodar o mesmo lote duas vezes dá
a mesma pasta. Ele escreve quatro coisas: a árvore organizada, o CSV, o resumo em markdown e
o log do lote em `financeiro/comprovantes/log/`.

Se o usuário disser que ficou errado:

```bash
node scripts/comprovantes.js desfazer financeiro/comprovantes/log/organizar-2026-09-22-174437.json
```

O desfazer apaga só as cópias que o log registrou e cujo conteúdo não mudou desde então, e
avisa qual não apagou. O original nunca é tocado, em nenhum dos dois comandos.

### Passo 7 — Conferir a conta e escrever o resumo

O script escreve `financeiro/comprovantes/comprovantes-<AAAA-MM>.md` já com as tabelas
prontas e com duas seções de prosa marcadas `[a confirmar]`. O assistente troca essas duas
por texto e **não altera nenhuma linha de tabela**. Rodar o `organizar` de novo reescreve o
arquivo inteiro, inclusive a prosa, então escrever depois da última rodada:

```markdown
# Comprovantes — <AAAA-MM>

> Lote conferido e organizado em <data>. N documento(s) no CSV, M em `revisar/`.
> Arquivo pro contador: `financeiro/comprovantes/comprovantes-<AAAA-MM>.csv`. Os originais continuam onde estavam: aqui tudo é cópia.

## O mês em uma frase
[Quanto saiu com documento, em que categoria está o maior valor, e o que o usuário descobriu no Passo 5.]

## Total por categoria
[tabela do script: categoria, documentos, valor, linha Total]

## O que faltou dado
[tabela do script: arquivo, o que falta, onde está]

## Avisos da conferência
[lista do script: duplicata, CNPJ, data fora do mês, data no futuro, boleto sem comprovante]

## O que fazer agora
[o assistente escreve: quem precisa tirar outra foto, qual boleto falta o comprovante, o que vai pro /caixa, o que o contador ainda vai pedir]
```

Depois, os dois comandos, com o resultado colado na conversa:

```bash
node scripts/verificar.js tabela financeiro/comprovantes/comprovantes-2026-09.md
node scripts/verificar.js texto financeiro/comprovantes/comprovantes-2026-09.md
```

Os dois precisam terminar em "Tudo certo." Se o `tabela` acusar, alguém editou linha de
tabela na mão: gerar de novo em vez de corrigir o número.

E uma conferência que nenhum comando faz sozinho: comparar o total por categoria com o
fechamento do mês (`/caixa`) ou com a conciliação (`/conciliar`), quando existirem. Despesa
que aparece no extrato e não tem comprovante aqui é documento que falta pedir; comprovante
que está aqui e não aparece no extrato foi pago por outra conta, em dinheiro, ou não foi
pago. As duas descobertas mudam o fechamento, e é por isso que valem a comparação.

### Passo 8 — Passar adiante

Daqui saem quatro coisas:

- No fechamento do mês, apontar `financeiro/comprovantes/comprovantes-<AAAA-MM>.csv` pro `/caixa`: é a despesa com documento, já somada nas categorias que ele usa, e poupa a classificação de novo
- O `/conciliar` recebe o mesmo caminho pra dar nome à linha de extrato que ninguém reconhece: fornecedor, número da nota e valor estão lá
- O que falta vira item em `tarefas.md`, no formato do `/tarefas`, com a origem: `- [ ] Tirar outra foto do recibo da faxina de 12/09 (/comprovantes)`
- Quem faz isso todo mês agenda no `/rotina`: "primeiro dia útil, jogar os comprovantes em `dados/` e rodar o comprovantes"

A entrega no chat é curta: quanto saiu com documento, o total das duas ou três maiores
categorias, quantos arquivos ficaram em `revisar/` e o que fazer com eles, e onde está o CSV
pro contador. O arquivo inteiro fica em `financeiro/comprovantes/`.

---

## Regras

- **Nada é movido, nada é apagado.** O comando copia, e o original continua na pasta de origem. O usuário decide depois se limpa a pasta antiga; enquanto ele não decidir, existem duas cópias, e é assim que tem que ser
- **Nenhum arquivo some da conta.** Todo item do manifesto termina em exatamente um lugar: organizado na árvore, em `revisar/`, ou parando o lote como erro. Arquivo que não é comprovante aparece em `revisar/` com o motivo escrito, nunca é descartado em silêncio
- **A leitura é leitura.** Cada arquivo é aberto pela ferramenta Read antes de virar linha do manifesto, e `lido_por` diz isso. Preencher pelo nome do arquivo é chute com aparência de dado, e o `palpite` existe justamente pra ser conferido contra o documento
- **Valor e soma passam pelo comando.** O total por categoria nasce do `scripts/comprovantes.js` e é conferido pelo `verificar.js tabela`. Somar de cabeça um lote de trinta notas é o começo do mês que não fecha
- **Valor ilegível fica vazio.** Foto tremida, cupom apagado e nota rasgada vão pra `revisar/` com o motivo. Estimar o valor de um comprovante é inventar despesa
- **As categorias são as do `/caixa`.** `receita`, `fixo`, `variavel`, `retirada`, `investimento`, e a subcategoria livre pro resto. Categoria nova só quando o usuário pedir, e aí ela vale também no fechamento, senão os dois arquivos param de conversar
- **Classificação combinada se mantém.** Se curso ficou como `investimento` em setembro, continua em outubro. Mudar a regra no meio do ano estraga a comparação entre meses, e é por isso que a decisão do Passo 5 vai escrita no resumo
- **Duplicata quem decide é o usuário.** O comando aponta mesmo fornecedor, valor e data; manter as duas cópias é escolha legítima (a nota e o comprovante de pagamento), somar as duas não é
- **Foto de recibo é cópia, não é original garantido.** A digitalização só produz os mesmos efeitos do papel quando cumpre integridade, legibilidade e rastreabilidade (Decreto 10.278/2020, art. 4º). Na prática: fotografar com o documento inteiro no quadro, sem corte nem reflexo, e guardar o papel do que é caro. Dizer isso ao usuário quando ele quiser jogar o original fora
- **Prazo de guarda tem fonte e data.** O que a skill diz sobre quanto tempo guardar sai de `templates/financeiro/comprovantes.md`, com a URL oficial e a data de conferência. Prazo "de memória" não entra: 5 anos contados do exercício seguinte é diferente de 5 anos da data da nota
- **Não é contabilidade nem consultoria fiscal.** O que é dedutível, o que precisa de retenção, qual nota entra em qual apuração e o que a Receita cruza é conversa com contador. A skill organiza, soma e entrega o CSV; dizer isso ao usuário uma vez, sem sermão
- **Dado de terceiro é dado pessoal.** CPF e CNPJ de fornecedor, nome de pessoa física em recibo e endereço em nota ficam em `financeiro/` e `dados/`. Não vão pra busca na web, pra ferramenta externa nem pra exemplo de comando, e não viram lista de contato (LGPD). `dados/` fica fora do git por padrão; `financeiro/` só entra no `/salvar` se o repositório for privado
- **Quando o resultado for ruim, dizer o resultado.** Quatorze arquivos em `revisar/`, R$ 3.200,00 de despesa sem nota, o mesmo aluguel contado duas vezes: escrever com o número e o próximo passo. Suavizar aqui vira erro no fechamento
- **Fronteira com as vizinhas:** o `/caixa` fecha o mês e recebe daqui a despesa com documento, já somada; o `/conciliar` bate o extrato contra os registros e usa este CSV pra nomear linha sem dono; o `/obrigacoes` diz qual documento o enquadramento exige e qual guia guardar; o `/cobranca` cuida do que os clientes devem, não do documento; o `/analisar-dados` lê **um** arquivo de dados e responde sobre ele; o `/planilha` monta `.xlsx` avulso. Esta skill é a pasta organizada, o CSV e a soma por categoria, nada além
