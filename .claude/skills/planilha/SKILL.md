---
name: planilha
description: >
  Produz planilha Excel de verdade (.xlsx) a partir de uma conversa curta: orçamento, controle
  de estoque, cronograma, tabela de preços, fluxo de caixa, lista de prospecção, controle de
  pedidos. Com fórmula que recalcula, cabeçalho congelado e formatado, moeda e data no formato
  certo, lista suspensa nas colunas de status e uma aba "Como usar". Também abre planilha ou
  CSV que já existe, mostra o que tem dentro e propõe correção.
  Use quando o usuário disser "faz uma planilha", "preciso de uma planilha de", "monta um
  controle de estoque", "quero uma tabela no Excel", "planilha de orçamento", "cronograma
  em planilha", "abre essa planilha", "conserta minha planilha", "essa fórmula não funciona",
  "transforma esse CSV em planilha", ou /planilha.
---

# /planilha — Planilha que funciona

> **Convenção de pastas:** a saída vai na pasta da peça a que a planilha pertence (`financeiro/` pra fluxo de caixa e projeção, `propostas/` pra orçamento, `vendas/prospeccao/` pra lista de prospecção, `sistemas/` pra cronograma de um sistema que o `/escopo` definiu) ou em `planilhas/<nome>.xlsx` quando é avulsa (estoque, pedidos, tabela de preços, cronograma de qualquer outra coisa). Na convenção **por cliente**, a planilha feita pra um cliente recebe o prefixo `clientes/<Nome>/`; a da própria casa fica na raiz. A spec JSON fica ao lado do arquivo. A pasta nasce na primeira planilha.

Tabela em markdown não é planilha. O usuário quer abrir no Excel, no Numbers ou no Google
Planilhas, mudar um número e ver o total acompanhar. Quer digitar na linha 14 e ela somar.
Quer que a data seja data, pra filtrar por mês, e que "R$ 1.250,50" seja um número, não um
texto. Esta skill entrega isso: um `.xlsx` de verdade, com fórmula, formato e cabeçalho
fixo, gerado por script e conferido antes de sair.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende e como opera; é o que define as colunas que fazem sentido
- **Tom:** `_memoria/preferencias.md` — a aba "Como usar" fala na voz do usuário
- **Preço e oferta:** `_memoria/oferta.md` e `oferta/preco-*.md`, quando a planilha tem preço. Valor vem de lá, não se inventa
- **Marca:** `identidade/tokens.css` ou `identidade/design-guide.md`, se existirem — a cor do cabeçalho pode ser a cor primária da marca
- **Molde:** `templates/operacao/planilha.md` — a spec campo a campo, as fórmulas que o script traduz e os sete modelos com colunas mínimas
- **Script:** `scripts/gerar-planilha.js` — escreve o `.xlsx` a partir da spec e lê `.xlsx`/`.csv` existente (`--ler`). Node puro, sem instalar nada
- **Conferência:** `scripts/verificar.js` (`tabela`, `datas`, `csv`)
- **Saída:** `<pasta da peça>/<nome>-<AAAA-MM-DD>.xlsx` e, ao lado, `<nome>-<AAAA-MM-DD>.planilha.json`

---

## Workflow

### Passo 0 — Decidir se é criar ou abrir

Se o usuário mandou um arquivo (`.xlsx`, `.xlsm`, `.csv`) ou apontou um em `dados/`, é
**abrir**: pular pro Passo 6. Se descreveu o que quer, é **criar**: seguir daqui.

Se o pedido é "quanto sobrou no mês" com a planilha, é `/caixa`. Se é "o que esses dados
mostram", é `/analisar-dados`. Aqui se produz e se conserta o arquivo.

### Passo 1 — Entender pra que serve

Uma pergunta só, e é essa:

> "Pra que você vai usar essa planilha no dia a dia? Me conta como seria uma linha dela."

A resposta diz quase tudo: as colunas, o que é digitado e o que é calculado, se precisa de
data, se tem status. "Cada linha é um pedido: quem pediu, quanto, se já pagou" já é a
planilha inteira.

Se o pedido casa com um dos sete modelos do molde (orçamento, estoque, cronograma, tabela
de preços, fluxo de caixa, prospecção, pedidos), partir do modelo e só confirmar o que muda.

### Passo 2 — Fechar as colunas

Mostrar a proposta de colunas em uma tabela curta, marcando o que é entrada e o que é
fórmula, e perguntar se falta alguma. Uma mensagem, uma resposta.

| Coluna | Tipo | Quem preenche |
|---|---|---|
| Data | data | você |
| Cliente | texto | você |
| Status | lista: Aberto, Pago, Entregue, Cancelado | você |
| Valor | moeda | você |
| Líquido | moeda | fórmula (Valor menos taxa, zero se cancelado) |

Perguntar também, na mesma mensagem, se ele já tem dado pra colocar (um CSV, uma lista no
WhatsApp, "os pedidos de setembro") ou se a planilha nasce vazia com linhas prontas pra
digitar.

Três coisas que se decidem aqui, sem perguntar:

- **Coluna de status vira lista suspensa.** Sem isso aparecem "pago", "Pago " e "PAGO", e a contagem erra
- **Total é fórmula apontando pra faixa que inclui as linhas em branco.** Planilha que "para de somar" é a reclamação número um
- **Mais de uma aba ou alguma fórmula que dá pra quebrar pede a aba "Como usar".** Três a seis parágrafos; ninguém lê mais que isso

### Passo 3 — Escrever a spec

Salvar em `<pasta>/<nome>-<AAAA-MM-DD>.planilha.json`, seguindo o molde. O essencial:

```json
{
  "titulo": "Controle de pedidos — setembro/2026",
  "corCabecalho": "#1F3A5F",
  "abas": [
    {
      "nome": "Pedidos",
      "colunas": [
        { "titulo": "Data", "tipo": "data" },
        { "titulo": "Cliente" },
        { "titulo": "Status", "opcoes": ["Aberto", "Pago", "Entregue", "Cancelado"] },
        { "titulo": "Valor", "tipo": "moeda" },
        { "titulo": "Taxa", "tipo": "percentual" },
        { "titulo": "Líquido", "tipo": "moeda", "formula": "=SE(C{n}=\"Cancelado\";0;D{n}*(1-E{n}))" }
      ],
      "linhas": [
        ["01/09/2026", "Padaria Central", "Pago", "R$ 1.250,50", "4,5%"]
      ],
      "linhasExtras": 30,
      "totais": { "Valor": "soma", "Líquido": "soma", "Cliente": "contagem" }
    },
    {
      "nome": "Como usar",
      "texto": [
        "# Como usar",
        "Preencha Data, Cliente, Status, Valor e Taxa. A coluna Líquido e a linha Total se calculam sozinhas.",
        "As 30 linhas em branco já estão prontas. Pra mais, insira linhas acima da linha Total."
      ]
    }
  ]
}
```

Regras da spec que evitam retrabalho:

- Fórmula pode ir em português com `;` (`=SE(...)`, `=SOMA(...)`); o script traduz. Nome de aba com espaço fica entre aspas simples: `'Resumo do mês'!B2`
- `{n}` é a linha atual; `{primeira}` e `{ultima}` são a faixa de dado da própria aba, contando as linhas extras. Fórmula na aba Resumo que aponta pra outra aba usa `{Pedidos.primeira}` e `{Pedidos.ultima}`, senão a faixa sai curta e o resumo para de somar na linha 5
- Valor em formato brasileiro entra como está: `"R$ 1.250,50"`, `"4,5%"`, `"18/09/2026"`. Percentual em número é fração: `0.045`
- Cor do cabeçalho: a primária de `identidade/tokens.css` quando existir. O script escolhe texto branco ou preto pelo contraste
- Se o dado vem de um CSV, `"csv": "dados/arquivo.csv"` na aba poupa transcrever

### Passo 4 — Gerar e conferir

```bash
node scripts/gerar-planilha.js <pasta>/<nome>-<AAAA-MM-DD>.planilha.json
```

O script escreve o `.xlsx`, relê o próprio arquivo pra provar que abre, e imprime: abas,
colunas, linhas, cada total com a fórmula e o valor calculado. Três linhas do relatório
decidem se a planilha sai ou volta:

| Linha do relatório | O que significa | O que fazer |
|---|---|---|
| `⚠ Pedidos!A5: "31/02/2026" não é data; ficou como texto` | o dado não converteu; o filtro por mês vai ignorar essa linha | corrigir o dado na spec |
| `⚠ Pedidos!F36 vai mostrar #VALUE! (vem de Pedidos!F5)` | uma fórmula depende de célula com texto onde devia ter número; o erro aparece no Excel também | consertar a célula de origem, nunca a fórmula |
| `2 sem valor em cache (o Excel calcula ao abrir)` | função que o script não calcula (`PROCV` aproximado, `TEXTO`); o arquivo está certo, só a pré-visualização fica vazia | nada, ou trocar por função que ele calcula, se o total precisa aparecer no chat |

Se o usuário disser que o arquivo não abriu, a primeira prova é por comando, não por palpite:

```bash
python3 -c "import zipfile; z=zipfile.ZipFile('<arquivo.xlsx>'); print(z.testzip()); print(z.namelist())"
```

`None` na primeira linha é zip íntegro. Aí o problema é outro (arquivo baixado pela metade,
Numbers antigo, extensão trocada), e é isso que se pergunta.

Se o arquivo já existe, o script recusa sobrescrever. Planilha que o usuário pode ter
editado não se sobrescreve sem avisar: gerar com outro nome (`-v2`) ou confirmar com ele e
passar `--sobrescrever`.

### Passo 5 — Entregar

Dizer onde ficou o arquivo, o que ele tem e como usar, em cinco linhas. Todo número dito
no chat vem do relatório do script ou de conta por comando, nunca de cabeça:

```bash
# soma de uma coluna a partir da leitura do arquivo gerado (pula cabeçalho e linha Total)
node scripts/gerar-planilha.js --ler <arquivo.xlsx> --json | node -e '
const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
const a=d.abas[0]; const col=a.cabecalho.indexOf("Valor");
const linhas=a.dados.slice(1).filter(l=>l[0]!=="Total");
console.log(linhas.reduce((s,l)=>s+(typeof l[col]==="number"?l[col]:0),0));'
```

Se o usuário pediu a mesma coisa em markdown (pra colar numa proposta ou no `/caixa`),
exportar com `--csv` ou `--json` e montar a tabela; aí `node scripts/verificar.js tabela`
confere a soma antes de sair.

O que dizer, e o que não dizer, na entrega:

> Ficou em `planilhas/pedidos-2026-09-18.xlsx`, aba Pedidos com 4 pedidos de setembro e
> 30 linhas prontas pra digitar. Lançado: R$ 2.350,50; sem o pedido cancelado: R$ 1.550,50.
> Status é lista suspensa. A aba Resumo aponta pra Pedidos e acompanha o que você digitar.

Sem "planilha profissional", sem "otimizada", sem prometer que abre em todo programa: o que
se garante é o que o script provou.

Registrar em `biblioteca.md` só quando a planilha for um modelo que o negócio vai reusar
(tabela de preços, orçamento padrão).

### Passo 6 — Abrir planilha que já existe

```bash
node scripts/gerar-planilha.js --ler dados/arquivo.xlsx            # resumo: abas, cabeçalho, primeiras linhas
node scripts/gerar-planilha.js --ler dados/arquivo.xlsx --formulas # toda fórmula, com o valor gravado
node scripts/gerar-planilha.js --ler dados/arquivo.xlsx --aba 2 --json
node scripts/gerar-planilha.js --ler dados/arquivo.xlsx --spec > planilhas/arquivo.planilha.json
```

Antes de qualquer coisa, se a extensão é `.xlsm` ou o script avisou "contém macro": dizer
ao usuário que o arquivo tem macro, que aqui ele só foi lido, e que nada foi executado.
Não sugerir abrir com macro habilitada sem ele saber de onde veio o arquivo.

O `--spec` devolve a planilha como spec editável: reconhece fórmula que se repete por
coluna (vira `formula` com `{n}`), a linha de total (vira `totais`), as linhas em branco do
fim (viram `linhasExtras`) e as listas suspensas (viram `opcoes`). O que ele não recupera:
cor, fonte, largura, gráfico, tabela dinâmica e lista suspensa que aponta pra um intervalo.

Depois de ler, o que se procura:

| Sintoma | Causa mais comum | Correção |
|---|---|---|
| Total não muda quando ele digita | total apontando pra faixa curta, ou valor colado no lugar da fórmula | fórmula com faixa até a última linha útil |
| Número que não soma | valor digitado como texto ("R$ 1.200", "1.200,00 ") | converter a coluna pra número |
| Filtro por mês não funciona | data como texto | converter pra data |
| `CONT.SE` erra | "Pago", "pago", "PAGO " | lista suspensa na coluna de status |
| `#REF!`, `#DIV/0!`, `#VALOR!` | linha apagada, divisão por célula vazia, texto na conta | mostrar a célula e a fórmula, propor a versão com `SEERRO` ou `SE` |
| Célula mesclada no meio do dado | layout "bonito" que quebra ordenação | desfazer e repetir o valor |

Entregar a lista de correções com a célula e a fórmula nova, na ordem de impacto. Duas
saídas possíveis, e o usuário escolhe:

1. **Ele corrige no arquivo dele**, com a lista em mãos. É o caminho quando a planilha tem formatação, gráfico ou aba que ele não quer perder
2. **Gerar uma versão nova** a partir do `--spec` editado, com outro nome (`-v2.xlsx`). Avisar que cor, fonte e largura vêm do padrão do script, não do original

Se o usuário pediu pra "transformar o CSV em planilha", é o caminho 2 direto: `"csv"` na
aba, tipos nas colunas, totais e cabeçalho congelado.

---

## Fechar a conta (obrigatório)

Toda soma, contagem ou média que aparecer no chat ou num `.md` gerado a partir da planilha
foi conferida por comando. O relatório do script já dá os totais das linhas de rodapé; pra
qualquer outro número, `node -e` sobre o `--json`, ou `node scripts/verificar.js tabela`
quando a tabela foi pra markdown.

Se o valor do script divergir do que o usuário esperava, a conta certa é a do script, e o
que se investiga é o dado de entrada (linha duplicada, valor como texto, cancelado que
entrou na soma). Nunca ajustar a spec pra bater com a expectativa.

E se a planilha tem cronograma com dia da semana escrito, exportar o resumo em markdown e
rodar `node scripts/verificar.js datas`: a planilha não sabe feriado nem confere dia da
semana.

---

## Regras

- **Fórmula, nunca valor colado, quando a célula depende de outra.** Total, subtotal, líquido, prazo final e percentual são sempre fórmula. Valor fixo ali é a planilha errando em silêncio na semana seguinte
- **O script é quem gera o arquivo.** Não montar `.xlsx` de outro jeito, não entregar CSV chamando de planilha, não entregar tabela em markdown quando o pedido foi Excel
- **Ler o relatório do script até o fim** e corrigir todo `⚠` antes de entregar. Fórmula "sem valor em cache" é aceitável (o Excel calcula); tipo errado não é
- **Não sobrescrever planilha que o usuário pode ter editado.** Nome novo ou confirmação explícita
- **Arquivo com macro é só leitura, com aviso.** Nunca executar, nunca sugerir habilitar macro de arquivo cuja origem o usuário não conhece
- **Preço e valor vêm da memória ou do usuário.** Tabela de preços usa `_memoria/oferta.md` e o estudo do `/preco`; o que não existe fica `[a confirmar]` na célula, visível
- **Formato brasileiro na entrada, número de verdade na célula.** Vírgula decimal e ponto de milhar são convertidos; data vira data. Se algo não converteu, o script avisa e a spec é corrigida
- **Fronteira:** `/analisar-dados` lê e interpreta o que os dados dizem; `/caixa` fecha o mês e diz o que a conta permite decidir; `/projecao` monta a spec dos próximos meses e chama este script; `/proposta` é o documento que vai pro cliente, e o orçamento em planilha é a conta por trás dele; `/prospeccao` decide quem abordar e como, a lista fica aqui; `/planilha` produz e conserta o arquivo. Quando a conversa vira "e o que esses números significam?", passar pra vizinha certa em uma linha
- **Dado pessoal fica no arquivo, não no chat.** Lista de clientes com telefone, CPF ou e-mail é dado de terceiro (LGPD): não reproduzir no resumo além do necessário, não mandar pra ferramenta externa sem autorização, e a planilha de prospecção só tem o que a abordagem precisa
- **Não é consultoria contábil nem tributária.** Fluxo de caixa e tabela de preços aqui são controle do dono. Alíquota, regime e obrigação acessória são conversa com o contador, e a skill diz isso quando a pergunta for pra lá
