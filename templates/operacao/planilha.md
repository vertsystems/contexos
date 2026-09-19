# Planilha — referência da spec e dos modelos

Referência do `/planilha`, usada também pelo `/projecao` (que escreve uma spec dessas e
chama o script) e por qualquer skill que precise entregar um `.xlsx` em vez de tabela em
markdown. O arquivo é
produzido por `scripts/gerar-planilha.js` a partir de uma especificação em JSON; este
molde diz o que a spec aceita, quais fórmulas funcionam e como são os sete modelos que o
pequeno negócio mais pede.

---

## 1. A spec, campo a campo

```json
{
  "titulo": "Orçamento — reforma da sala",
  "autor": "Nome do negócio",
  "corCabecalho": "#1F3A5F",
  "abas": [
    {
      "nome": "Orçamento",
      "titulo": "Orçamento — reforma da sala",
      "colunas": [
        { "titulo": "Item", "tipo": "texto", "largura": 32 },
        { "titulo": "Qtd", "tipo": "inteiro" },
        { "titulo": "Unidade", "opcoes": ["un", "m²", "h"] },
        { "titulo": "Valor unitário", "tipo": "moeda" },
        { "titulo": "Total", "tipo": "moeda", "formula": "=B{n}*D{n}" },
        { "titulo": "Entrega", "tipo": "data" }
      ],
      "linhas": [
        ["Tinta acrílica 18 L", 2, "un", 289.9, null, "2026-10-02"],
        { "Item": "Piso vinílico", "Qtd": 18, "Unidade": "m²", "Valor unitário": "R$ 89,00" }
      ],
      "linhasExtras": 10,
      "totais": { "Qtd": "soma", "Total": "soma" },
      "congelar": true,
      "filtro": true,
      "imprimir": "retrato"
    },
    { "nome": "Como usar", "texto": ["# Como usar", "Preencha só as colunas azuis."] }
  ]
}
```

| Campo | O que faz | Padrão |
|---|---|---|
| `titulo` (raiz) | Título do documento (propriedades do arquivo) | nome do arquivo |
| `corCabecalho` | Cor de fundo do cabeçalho; o texto fica branco ou preto conforme o contraste | `#1F3A5F` |
| `aba.titulo` | Linha 1 em destaque, mesclada sobre as colunas; o cabeçalho desce pra linha 2 | sem título |
| `colunas[].tipo` | `texto`, `numero`, `inteiro`, `moeda`, `percentual`, `data` | inferido do dado |
| `colunas[].largura` | Largura em caracteres | pelo maior conteúdo, entre 8 e 60 |
| `colunas[].formula` | Fórmula aplicada em toda linha que não trouxer valor; `{n}` é o número da linha | nenhuma |
| `colunas[].opcoes` | Lista suspensa com essas opções (validação de dado) | nenhuma |
| `colunas[].quebra` | Quebra o texto dentro da célula | falso |
| `linhas` | Array de arrays na ordem das colunas, ou array de objetos `{ "Título": valor }` | vazio |
| `linhasExtras` | Linhas em branco no fim, já formatadas e com a fórmula da coluna, pro usuário digitar | 0 |
| `totais` | `{ "Coluna": "soma" }`; aceita `soma`, `media`, `contagem`, `maximo`, `minimo` ou uma fórmula | nenhum |
| `rodape` | Rodapé explícito, um valor por coluna, quando `totais` não basta | nenhum |
| `rotuloTotal` | Texto da primeira célula do rodapé | `Total` |
| `congelar` | Congela cabeçalho (e título, se houver) | verdadeiro |
| `filtro` | Filtro automático no cabeçalho | verdadeiro quando há dado |
| `imprimir` | `retrato` ou `paisagem`, A4, ajustado à largura da página | sem ajuste |
| `csv` | Caminho de um CSV que vira as linhas da aba (cabeçalho do CSV vira colunas se não houver) | nenhum |
| `texto` | Aba de instruções: array de parágrafos; `# ` é título, `## ` é subtítulo | nenhum |

Valores de célula: número, string, `true`/`false`, `null` (vazio), string começando com `=`
(fórmula), ou objeto `{ "v": 0.05, "tipo": "percentual" }` / `{ "f": "=B2*B3" }` quando a
célula foge do tipo da coluna.

Formato brasileiro entra direto: `"R$ 1.234,56"`, `"4,5%"`, `"18/09/2026"`. O script converte
pra número e data de verdade; o Excel mostra formatado. Percentual é fração: `0.045` ou
`"4,5%"`, nunca `4.5`.

---

## 2. Fórmulas

- Pode escrever em português com `;` (`=SE(C2="Pago";D2;0)`) ou em inglês com `,`. O arquivo
  guarda sempre em inglês, que é o formato interno; o Excel em português exibe `SE`
- Quando a fórmula usa `;`, a vírgula entre dígitos é decimal (`0,15`). Quando usa `,`, o
  decimal é ponto
- Placeholders: `{n}` linha atual, `{primeira}` e `{ultima}` primeira e última linha de dado
  da própria aba (contando as `linhasExtras`). Servem na `formula` da coluna, nas `linhas` e
  no `rodape`. Pra apontar pra faixa de outra aba, `{Pedidos.primeira}` e `{Pedidos.ultima}`:
  `=SOMASE(Pedidos!C{Pedidos.primeira}:C{Pedidos.ultima};"Pago";Pedidos!D{Pedidos.primeira}:D{Pedidos.ultima})`
- Referência a outra aba: `Pedidos!D8`. Nome com espaço ou acento fica entre aspas simples:
  `'Resumo do mês'!B2`
- O script calcula e grava o resultado de: soma, média, mín, máx, contagens, `SE` e
  `SEERRO` (só o ramo escolhido é calculado, então `=SE(B3=0;0;B2/B3)` não quebra), `E`, `OU`,
  `ARRED`, `SOMASE`, `SOMASES`, `CONT.SE`, `CONT.SES`, `SOMARPRODUTO`, `PROCV` e `CORRESP`
  com busca exata, `ÍNDICE`, aritmética, comparação, `&`, `HOJE`, datas. O que ele não
  calcula (`PROCV` aproximado, `TEXTO`, `PROCX`) entra no arquivo sem valor em cache, e o
  Excel calcula ao abrir. O relatório diz quais ficaram sem cache
- Fórmula que dá erro (`#VALUE!` por texto onde devia ter número, `#DIV/0!`) é gravada com
  o erro e apontada no relatório com a célula de origem. O Excel vai mostrar o mesmo erro:
  o conserto é no dado, não na fórmula
- Total sempre por fórmula que aponta pra faixa (`=SUM(E3:E12)`), nunca valor colado. A
  faixa precisa cobrir as `linhasExtras`, senão o que o usuário digitar depois não soma

Traduções que o script reconhece: SOMA, MÉDIA, SE, SEERRO, MÁXIMO, MÍNIMO, CONT.NÚM,
CONT.VALORES, CONT.VAZIAS, CONT.SE, CONT.SES, SOMASE, SOMASES, MÉDIASE, ARRED,
ARREDONDAR.PARA.CIMA, ARREDONDAR.PARA.BAIXO, PROCV, PROCH, PROCX, CORRESP, ÍNDICE, HOJE,
AGORA, DATA, DIA, MÊS, ANO, DIAS, DIA.DA.SEMANA, DIATRABALHOTOTAL, CONCATENAR, TEXTO,
ESQUERDA, DIREITA, EXT.TEXTO, NÚM.CARACT, MAIÚSCULA, MINÚSCULA, ARRUMAR, E, OU, NÃO,
VERDADEIRO, FALSO, ABS, INT, MOD, RAIZ, POTÊNCIA, SOMARPRODUTO, ÉCÉL.VAZIA, É.NÃO.DISP,
MAIOR, MENOR, ORDEM, TRUNCAR. Função fora dessa lista passa como está, em maiúsculas: se o
nome em inglês existe no Excel, funciona; se não, o Excel mostra `#NOME?`.

---

## 3. O que faz uma planilha boa de usar

1. **Uma tabela por aba**, começando em A1 (ou A2, se houver título). Tabela no meio da
   aba, com colunas vazias no caminho, quebra filtro, ordenação e tabela dinâmica
2. **Cabeçalho em uma linha só, sem célula mesclada.** Mesclagem na área de dado impede
   ordenar. O único merge aceito é o do título, acima do cabeçalho
3. **Cada coluna com um tipo.** Data como data (dá pra somar dias e filtrar por mês),
   dinheiro como moeda, percentual como fração. "R$ 1.200" digitado como texto não soma
4. **Coluna de cálculo é fórmula, coluna de entrada é digitação.** Dizer na aba "Como usar"
   quais são quais. O erro clássico do usuário é sobrescrever a fórmula com o valor
5. **Linhas extras já formatadas**, e o total apontando pra elas. Planilha que "para de
   somar" depois da décima linha é a reclamação mais comum
6. **Lista suspensa nas colunas de status** (Aberto, Pago, Cancelado). Sem ela, aparecem
   "pago", "Pago " e "PAGO", e o `CONT.SE` erra
7. **Aba "Como usar"** quando há mais de uma aba ou alguma fórmula que o usuário pode
   quebrar. Três a seis parágrafos. Ninguém lê mais que isso
8. **Sem dado pessoal além do necessário.** Nome e telefone de cliente só se a planilha é
   pra isso (cadastro, prospecção), e aí ela fica fora de ferramenta externa

---

## 4. Os sete modelos

Cada um com as colunas mínimas, o que é entrada (E) e o que é fórmula (F). O usuário
acrescenta coluna; a skill não tira nenhuma dessas sem perguntar.

### Orçamento
`Item (E) · Qtd (E) · Unidade (E, lista) · Valor unitário (E, moeda) · Total (F: Qtd × Unitário)`
Rodapé: soma de Total. Aba Resumo opcional com desconto em percentual, entrada e saldo,
apontando pro total. Se a cobrança tem faixas ou pacotes, o valor vem do `/preco`, não se
inventa aqui.

### Controle de estoque
`Produto (E) · Unidade (E) · Mínimo (E) · Entradas (E) · Saídas (E) · Saldo (F: Entradas − Saídas) · Repor? (F: SE(Saldo<=Mínimo;"REPOR";""))`
Uma aba de movimentação (Data, Produto, Tipo com lista Entrada/Saída, Qtd) e a aba de
saldo somando com `SOMASE` por produto é a versão que aguenta o dia a dia.

### Cronograma
`Etapa (E) · Responsável (E) · Início (E, data) · Dias (E, inteiro) · Fim (F: Início + Dias − 1) · Status (E, lista: A fazer, Fazendo, Feito, Atrasado) · Dias restantes (F: Fim − HOJE())`
O dia da semana de cada data se confere com `node scripts/verificar.js datas` depois de
exportar o resumo em markdown; a planilha não sabe feriado.

### Tabela de preços
`Serviço ou produto (E) · Custo (E, moeda) · Margem (E, percentual) · Preço (F: Custo ÷ (1 − Margem)) · Preço parcelado (F: Preço × (1 + taxa))`
Margem sobre o preço, não sobre o custo: 30% de margem sobre custo de R$ 100 é preço de
R$ 142,86, não R$ 130. Quem calcula "custo mais 30%" acha que tem 30% e tem 23%. Conferir
qual das duas o usuário quer antes de escrever a fórmula.

### Fluxo de caixa
Aba Lançamentos: `Data (E) · Descrição (E) · Categoria (E, lista) · Tipo (E, lista: Entrada/Saída) · Valor (E, moeda)`.
Aba Resumo: `Entradas (F: SOMASE Tipo="Entrada") · Saídas (F) · Saldo (F) · por categoria (F: SOMASE)`.
O fechamento e a leitura do que o número permite decidir são do `/caixa`; a planilha é o
registro que o `/caixa` vai ler no fim do mês.

### Lista de prospecção
`Empresa (E) · Contato (E) · Canal (E, lista) · Pontuação (E, inteiro) · Último contato (E, data) · Próximo passo (E) · Status (E, lista: Frio, Abordado, Respondeu, Reunião, Fechou, Perdeu)`
Rodapé: contagem por status com `CONT.SE`. O critério de pontuação e as mensagens são do
`/prospeccao`; a planilha só guarda a lista.

### Controle de pedidos
`Data (E) · Cliente (E) · Pedido (E) · Status (E, lista) · Valor (E, moeda) · Taxa (E, percentual) · Líquido (F: SE(Status="Cancelado";0;Valor × (1 − Taxa))) · Entrega (E, data)`
Rodapé: faturado sem cancelado (`SOMASE`), líquido (soma), quantidade (`CONT.VALORES`).

---

## 5. Abrir planilha que já existe

`node scripts/gerar-planilha.js --ler arquivo.xlsx` mostra as abas, o cabeçalho, as
primeiras linhas e, com `--formulas`, toda fórmula com o valor que estava gravado. Com
`--spec` devolve o JSON equivalente pra editar e gerar de novo: fórmula repetida por coluna
vira `formula` com `{n}`, a linha de total vira `totais`, linhas em branco do fim viram
`linhasExtras`, lista suspensa vira `opcoes`. Linha de título acima do cabeçalho é
reconhecida e vira `titulo` da aba.

Três avisos que vêm com a leitura:

- **Formatação do original não é preservada** ao gerar de novo: cor, fonte e largura vêm
  do padrão do script. Se o usuário quer manter o visual dele, a resposta é a lista de
  correções pra ele aplicar, não um arquivo novo
- **Arquivo `.xlsm` tem macro.** O script só lê; nunca executa. Avisar antes de sugerir que
  o usuário abra no Excel com macro habilitada
- **`.xls` (formato de 2003) e `.numbers` não abrem aqui.** Pedir pra salvar como `.xlsx`

---

## 6. CSV: separador e vírgula

Excel em português salva CSV com `;` e decimal com vírgula; Google Planilhas salva com `,`
e ponto. Os dois chegam aqui. O script detecta o separador pela primeira linha e converte
número brasileiro; quando exporta (`--csv`), sai no formato do Excel em português, com BOM,
pra abrir com dois cliques sem virar acento quebrado.

Pra importar em outra ferramenta (CRM, sistema de nota, Google Ads), conferir o formato
que ela exige antes: `node scripts/verificar.js csv arquivo.csv` acusa campo desalinhado
e linha com número errado de colunas.
