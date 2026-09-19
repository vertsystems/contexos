# Word editável: o que o .docx carrega e o que ele perde

Referência do `/word`, consultada também pelo `/proposta`, `/contrato` e `/documento` quando o cliente pede a versão editável.

Um `.docx` é um zip com XML dentro. Abre no Word, no Google Docs, no LibreOffice e no Pages, e cada um desses programas desenha a página do seu jeito, com a fonte que tem instalada e a régua de margem que preferir. Texto, título, lista e tabela chegam iguais em todos. Aparência, não. Fonte, cor de fundo, coluna e imagem posicionada mudam conforme a máquina que abre, e é isso que define quando mandar Word e quando mandar PDF.

---

## Quando o cliente pede Word, o que ele quer

| Pedido | O que ele precisa de verdade | O que mandar |
|---|---|---|
| "Manda em Word pro jurídico ver" | Marcar alteração em cláusula com controle de alterações | `.docx` e o PDF junto, e conferir o que voltar |
| "A compra exige anexo editável" | Colar trecho no sistema interno, preencher campo | `.docx` simples, sem fundo, sem coluna |
| "Quero copiar a tabela de preço" | Tabela que cola na planilha | `.docx` com tabela de verdade (não imagem, não texto separado por espaço) |
| "Abre no Google Docs?" | Editar junto, comentar | `.docx` aberto no Drive; o Docs converte sozinho |
| "Manda em Word" sem motivo | Costume, ou não confia em PDF | Perguntar se vai editar. Se não, o PDF resolve melhor |

A última linha é a mais comum. Muita gente pede Word por hábito, abre uma vez, nunca edita. Se a peça tem identidade visual forte, com capa colorida, foto e coluna, o PDF preserva tudo isso e o Word desmonta em uma coluna cinza. Pergunte antes.

---

## O que vira o quê

Do markdown (ou do HTML das peças do sistema) pro Word, via `scripts/gerar-docx.js`:

| No original | No .docx | Observação |
|---|---|---|
| `# Título` | Título 1 (20 pt, negrito, cor da marca) | Aparece no painel de navegação do Word |
| `## Subtítulo` | Título 2 (15 pt) | |
| `### Seção` | Título 3 (12 pt) | Nível 4 em diante cai no 3 |
| Parágrafo | Normal, 11 pt, entrelinha 1,15 | Corpo editável |
| `**negrito**`, `*itálico*` | Negrito, itálico | |
| `` `código` `` | Consolas com fundo cinza | Útil pra nome de arquivo e comando |
| `[texto](https://...)` | Link clicável | `mailto:` e `tel:` também; `href="#"` vira texto |
| `- item` / `1. item` | Lista com marcador / numerada | Aninha por indentação, três níveis |
| `\| a \| b \|` | Tabela com borda fina, cabeçalho em cinza | Cabeçalho repete quando a tabela vira a página |
| `> citação` | Parágrafo recuado com barra na cor da marca | |
| ` ``` ` bloco | Parágrafo monoespaçado com fundo | |
| `---` | Linha fina | |
| `\pagebreak` ou `<!-- quebra -->` numa linha só | Quebra de página | No HTML, `class="page-break"` ou `style="break-before: page"` |
| `--cabecalho "texto"` | Texto no alto de toda página | Nome do negócio |
| `--rodape "texto"` | Texto no pé, com "Página X de Y" | Contato, CNPJ, validade |

## O que não passa, e o que fazer

| Não passa | Por quê | O que fazer |
|---|---|---|
| Imagem, logo, foto | O conversor não embute mídia | Avisar. Se o logo importa, inserir no Word depois, ou mandar PDF |
| Fundo colorido, capa chapada | Word imprime fundo mal e cada versão trata diferente | Deixar fundo branco; a cor da marca fica nos títulos |
| Duas colunas, grid | Layout de CSS não tem equivalente direto | Vira uma coluna, na ordem do HTML |
| Ícone, emoji decorativo | Depende da fonte da máquina | Cortar do texto antes de exportar |
| Fonte da web (Google Fonts) | Só aparece se estiver instalada na máquina de quem abre | Escolher fonte segura (tabela abaixo) |
| Célula mesclada | O subset de markdown não representa | Repetir o valor ou dividir a tabela |
| Sumário automático | Precisa de campo atualizado pelo Word | Se for essencial, inserir no Word: Referências, Sumário |

---

## Fontes seguras

A fonte da marca quase nunca existe na máquina do cliente. Quando ela falta, o Word troca por Calibri ou Times New Roman sem avisar ninguém, e o documento que chega lá é outro, mais largo ou mais estreito, com a quebra de página em lugar diferente. Ninguém percebe. Escolher, na exportação, a fonte instalada mais parecida:

| Fonte da marca (exemplos) | Substituta segura | Onde a segura existe |
|---|---|---|
| Inter, DM Sans, Work Sans, Roboto | Calibri ou Arial | Windows, Mac com Office, Google Docs |
| Montserrat, Poppins, Syne | Verdana ou Trebuchet MS | Windows, Mac, Google Docs |
| Playfair Display, Instrument Serif, Lora | Georgia | Windows, Mac, Google Docs |
| Merriweather, Source Serif | Cambria | Windows e Mac com Office |
| Bricolage Grotesque, Space Grotesk | Arial | Todas |
| Qualquer serifada clássica | Times New Roman | Todas |

Regra prática: **Calibri** pra corpo sans, **Georgia** pra corpo serifado. O `gerar-docx.js` aplica essa tabela sozinho quando lê o `tokens.css`, e diz qual troca fez; `--fonte` muda a escolha. E explicar ao usuário que o Word não carrega a fonte da marca. Se ele insistir na original, é PDF.

Tamanhos que funcionam em Word e em impressão A4: título 1 em 20 pt, título 2 em 15 pt, corpo 11 pt, tabela 10 pt. O script já aplica esses.

---

## Cabeçalho e rodapé

O que costuma ir, por tipo de peça:

| Peça | Cabeçalho | Rodapé |
|---|---|---|
| Proposta | Nome do negócio | Contato, validade, página |
| Contrato | Nome do negócio | "Contrato de prestação de serviço", cliente, página |
| Documento, apostila | Título curto do material | Nome do negócio, página |
| Relatório | Nome do negócio e mês | Confidencial, se for; página |

O número de página é o que salva quem imprime e embaralha as folhas na mesa. O script põe "Página X de Y" no rodapé por padrão; `--sem-numero` tira.

O cabeçalho não é lugar de slogan. Nome. No máximo, o site.

---

## Antes de enviar

Lista curta, na ordem que pega mais erro:

1. **Placeholder.** `[a confirmar]`, `[nome do cliente]`, `[valor]`, `XXX`, `lorem`. O script acusa, lista e não grava o arquivo. Resolver no original, não no Word
2. **Abrir o arquivo.** No Word, no Google Docs, ou pelo menos `gerar-docx.js --texto` pra ver o texto inteiro e na ordem. Arquivo que ninguém abriu não foi conferido
3. **Tabela larga.** Mais de 5 colunas em retrato costuma apertar. Ou `--paisagem`, ou dividir a tabela
4. **Título solto no pé da página.** O estilo já pede "manter com o próximo", mas conferir nas primeiras páginas
5. **Soma.** Se a tabela tem valor, rodar `node scripts/verificar.js tabela` no `.md` de origem antes de exportar. O Word não confere conta
6. **Metadado.** O autor gravado no arquivo é o nome do negócio, não o e-mail pessoal. O script usa o texto do cabeçalho como autor

---

## Quando o cliente devolve o Word alterado

É o motivo número um de pedir contrato em Word. E é onde o prestador mais se perde, porque recebe um `.docx` de volta, abre, lê por cima e não sabe o que mudou.

```bash
node scripts/gerar-docx.js --comparar contratos/padaria-2026-03-04/contrato.docx dados/contrato-devolvido.docx
```

O devolvido fica em `dados/`, a zona de entrada, e nunca substitui o arquivo da pasta do contrato. O comando mostra linha a linha o que saiu e o que entrou, com o título mais próximo acima de cada mudança e um `⚠` na linha que fala de valor, prazo, multa, cancelamento, propriedade, garantia ou dados pessoais. Dois minutos. Se o cliente usou controle de alterações, o script conta as inserções, exclusões e comentários, e compara o texto com tudo aceito; se não usou, o diff é a única forma de saber, e é comum que a mudança mais cara esteja numa linha que ninguém marcou.

Tudo roda local. O contrato tem CPF, CNPJ e endereço, e não passa por site de "comparar documentos".

Comparado o texto, a decisão é do usuário. Em cláusula de valor, prazo ou multa, do advogado dele.

---

## Word, PDF ou link

| Situação | Formato |
|---|---|
| Documento final, pra assinar ou guardar | PDF (`scripts/gerar-pdf.js`) |
| Cliente vai editar, comentar ou preencher | `.docx` |
| Peça com identidade visual forte, capa, foto | PDF; Word só se pedirem, com aviso |
| Trabalho conjunto, várias pessoas | `.docx` no Drive, aberto como Google Docs |
| Contrato | Os dois: `.docx` pra revisão, PDF pra assinatura |

PDF é a fotografia. Word é o rascunho que continua vivo, e que por isso mesmo pode voltar diferente. O sistema entrega os dois e diz qual é qual.
