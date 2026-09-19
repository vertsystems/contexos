---
name: word
description: >
  Exporta proposta, contrato, documento ou qualquer texto em markdown pra .docx editável, que
  abre no Word, no Google Docs e no LibreOffice: títulos, negrito, listas, tabela, quebra de
  página, link, cabeçalho e rodapé com o nome do negócio, fonte e cor da marca. Salva o .docx
  ao lado do original e diz o que se perde no caminho. Também compara o Word que o cliente
  devolveu com o que foi enviado.
  Use quando o usuário disser "manda em Word", "o cliente pediu em .docx", "quero editar no
  Word", "exporta pra Word", "versão editável", "salva como docx", "preciso do contrato em Word
  pra ele alterar", "abre no Google Docs?", "o cliente devolveu o contrato alterado, o que
  mudou?", ou /word.
---

# /word — Versão editável em .docx

> **Convenção de pastas:** o `.docx` nasce **ao lado do arquivo de origem, com o mesmo nome** (`propostas/padaria-2026-03-04.html` vira `propostas/padaria-2026-03-04.docx`). Na convenção **por cliente**, onde estiver o original em `clientes/<Nome>/`. Esta skill não cria pasta: se o original existe, a pasta já existe.

Cliente pede Word por três motivos: o jurídico dele precisa marcar alteração no contrato, o setor de compras exige anexo editável, ou ele quer copiar a tabela pra planilha interna. PDF não serve em nenhum dos três. Só que `.docx` muda de cara conforme a máquina que abre: fonte que não existe vira Calibri, tabela larga aperta, logo some. Por isso o Word é a versão de trabalho, e o PDF continua sendo a versão final. A skill entrega o editável, avisa o que ficou de fora e confere por comando o que voltar.

Fronteira com as vizinhas: `/proposta`, `/contrato` e `/documento` produzem a peça (HTML e PDF); esta skill só exporta o editável dela. Se o que o cliente quer é a tabela de preço pra mexer no Excel, o `.xlsx` com fórmula é do `/planilha`. Slide editável não existe aqui: o `/apresentacao` entrega HTML e PDF.

## Dependências

- **Origem:** o `.md` ou `.html` que já existe (saída do `/proposta`, `/contrato`, `/documento`, ou texto solto do usuário)
- **Contexto:** `_memoria/empresa.md` — nome do negócio pro cabeçalho, contato e CNPJ pro rodapé
- **Identidade:** `identidade/tokens.css` (o `--accent` vira cor de título) ou, sem tokens, `identidade/design-guide.md`
- **Molde:** `templates/operacao/word-editavel.md` — o que vira o quê, o que não passa, tabela de fontes seguras, comparação do arquivo devolvido
- **Script:** `scripts/gerar-docx.js` — markdown ou HTML pra `.docx`, sem instalar nada; `--texto` extrai o texto de um `.docx` recebido e `--comparar` mostra o que mudou entre o enviado e o devolvido
- **Texto revisado:** `/revisar` antes de exportar, quando a origem ainda não passou por ele
- **Saída:** mesmo caminho do original, extensão `.docx`

---

## Workflow

### Passo 1 — Achar a origem

Se o usuário disse qual arquivo, usar. Se disse "a proposta da padaria", procurar por comando e confirmar em uma linha, sem lista de opções:

```bash
ls -t propostas/ | head -5        # ou contratos/, materiais/, clientes/<Nome>/propostas/
```

> "Vou exportar `propostas/padaria-2026-03-04.html` (a mais recente). É essa?"

Se a origem é HTML, o script converte sozinho. Se é um texto que o usuário colou na conversa, salvar primeiro como `.md` na pasta certa da convenção (proposta em `propostas/`, texto solto em `emails/` ou onde ele indicar) e exportar de lá: o `.docx` precisa de um original ao lado pra ser refeito depois.

Uma pergunta que vale fazer quando o pedido vem sem motivo: "Ele vai editar, ou só quer abrir?" Se só quer abrir, o PDF do `/proposta` ou do `/documento` preserva a peça inteira, e o Word perde logo, fundo e coluna. Dizer isso uma vez e seguir com o que ele escolher.

### Passo 2 — Decidir cabeçalho e rodapé

Ler `_memoria/empresa.md` e propor, sem perguntar se o dado existe:

| Peça | Cabeçalho | Rodapé |
|---|---|---|
| Proposta | Nome do negócio | Site ou WhatsApp · validade |
| Contrato | Nome do negócio | Contrato de prestação de serviço · nome do cliente |
| Documento, apostila | Título curto do material | Nome do negócio |
| Texto avulso | Nome do negócio | nada, ou só a numeração |

"Página X de Y" entra sozinha no rodapé. Se faltar o nome do negócio na memória, perguntar uma vez e oferecer salvar em `empresa.md`.

### Passo 3 — Puxar a identidade

Se `identidade/tokens.css` existe, o script lê a cor (`--accent`) e a fonte de corpo com `--tokens`. Conferir o que ele achou nas primeiras linhas da saída:

```
→ tokens: cor de título #2563EB, fonte Inter
→ fonte da marca "Inter" não existe na máquina do cliente: usando Calibri
```

**Fonte:** a da marca quase nunca está instalada na máquina do cliente, e o Word troca por outra sem avisar. O script já faz a troca pela parecida (`Inter` vira `Calibri`, `Playfair Display` vira `Georgia`, `Montserrat` vira `Verdana`; a tabela inteira está no molde) e diz qual usou. Pra escolher outra, `--fonte "Georgia"`. Se o usuário insistir na fonte original, a resposta honesta é que só o PDF garante isso: passar uma fonte da web em `--fonte` gera o arquivo, mas o script avisa que ela vai ser trocada na máquina de quem abre.

**Cor de título:** conferir que a cor da marca lê bem em fundo branco. Título é texto grande, então a régua é 3:1:

```bash
node scripts/verificar.js contraste "#2563EB" "#FFFFFF"
```

Abaixo de 3:1, escurecer o tom (usar o degrau `700` ou `800` da escala do `tokens.css`) e avisar que o Word está usando uma variação da cor. Sem tokens nem design-guide, deixar o padrão do script (título em `#1A1A1A`) e mencionar que o `/design-system` resolve isso de vez.

### Passo 4 — Revisar antes de exportar

Duas situações, com regra diferente:

- **A origem é peça já entregue** (proposta enviada, contrato aceito): exportar **fiel**. Não reescrever, não "melhorar", não cortar. O cliente vai comparar com o que recebeu, e qualquer diferença vira desconfiança
- **A origem é texto novo** que ainda não passou pelo `/revisar`: passar antes. Rodar `node scripts/verificar.js texto <origem.md>` e, se acusar clichê ou ritmo de máquina, corrigir no original. O Word carrega o texto pra dentro de um sistema onde ele será copiado e colado; clichê ali se espalha

Se a tabela tem valor, conferir a soma no original antes: `node scripts/verificar.js tabela <origem.md>`. O Word não faz conta.

### Passo 5 — Gerar

```bash
node scripts/gerar-docx.js propostas/padaria-2026-03-04.html \
  --tokens identidade/tokens.css \
  --fonte "Calibri" \
  --cabecalho "Studio Ana" \
  --rodape "studioana.com.br · válida até 20/03/2026"
```

Opções que aparecem no dia a dia:

| Opção | Quando |
|---|---|
| `--paisagem` | Tabela com mais de 5 colunas, cronograma largo |
| `--cor-titulo "#1F3A5F"` | Sem `tokens.css`, ou pra escurecer a cor da marca |
| `--sem-numero` | Texto de uma página, e-mail longo |
| `--salvar-md` | Origem em HTML: guarda o `.md` intermediário ao lado, pra edição futura |
| `--titulo`, `--autor` | Propriedades do arquivo; o padrão é o primeiro título e o nome do cabeçalho |
| `--pdf` | Se o LibreOffice está instalado, converte pra provar que abre; a prova fica na pasta temporária, não ao lado da peça |

O script diz o que converteu ("5 títulos, 4 parágrafos, 2 listas, 1 tabela, 1 link, 1 quebra de página"), confere o zip e cada XML, e no Mac abre o arquivo com o leitor do sistema pra contar as palavras. Se achar placeholder (`[a confirmar]`, `[nome do cliente]`, `[valor]`, `XXX`, `lorem`), ele para **antes de gravar** e lista o que achou: resolver no original e gerar de novo. Nunca abrir o `.docx` pra corrigir na mão, porque a próxima exportação apaga o conserto.

O script também avisa quando a tabela tem mais de 5 colunas em retrato (candidata a `--paisagem`) e quando saiu sem `--cabecalho`.

Quebra de página no markdown é uma linha só com `\pagebreak` ou `<!-- quebra -->`. No HTML, `class="page-break"` ou `style="break-before: page"`. Contrato costuma pedir uma antes das assinaturas; proposta, uma antes do investimento.

### Passo 6 — Conferir o que saiu

O script valida a estrutura. O olho confere o resto:

1. Abrir o arquivo por comando quando der (`open` no Mac, `xdg-open` no Linux, `start` no Windows), ou pedir pro usuário abrir no Word ou arrastar pro Google Drive e abrir como Docs
2. Contar os títulos no painel de navegação do Word contra os `#` do original: número diferente é seção que virou parágrafo
3. Olhar a tabela: coluna espremida pede `--paisagem`; célula que estourou é conteúdo longo demais pra tabela
4. Ler a lista do que **não passou** (imagem, fundo, coluna, ícone), no molde, e dizer ao usuário o que ficou de fora dessa peça em específico. "O logo da capa não vai no Word; a cor da marca está nos títulos" é uma frase, e evita a pergunta depois

Sem Word na máquina e sem LibreOffice, a conferência mínima é a que o script já fez mais a extração do texto:

```bash
node scripts/gerar-docx.js --texto propostas/padaria-2026-03-04.docx | head -40
```

Título sai com `## ` na frente, tabela sai uma linha por fileira com `|` entre as células. Se o texto sai inteiro e na ordem, a estrutura está lá. Contar os `## ` contra os `#` do original é a mesma conferência do item 2, sem abrir o Word.

### Passo 7 — Entregar

```
✓ propostas/padaria-2026-03-04.docx  (ao lado do .html original)

O que foi: 5 títulos, escopo em lista, tabela de investimento com o total,
quebra antes do investimento, cabeçalho "Studio Ana", rodapé com validade
e numeração.

O que não foi: o logo da capa e o fundo azul. A cor da marca ficou nos
títulos, em Calibri (a Inter não existe na máquina de quem abre).

O PDF continua sendo a versão final. Manda os dois: o Word pra ele
mexer, o PDF pra ele guardar.

Quer o e-mail de envio? (/email-profissional)
```

Registrar em `tarefas.md` quando a peça é contrato: "aguardando retorno do Word do cliente X", com data. Contrato editável que sai sem anotação some no WhatsApp.

### Passo 8 — Quando o cliente devolve alterado

É o uso que justifica o Word, e o momento de mais risco: o `.docx` volta e ninguém sabe o que mudou. O arquivo devolvido vai em `dados/` (a zona de entrada; ele nunca substitui o que está na pasta do contrato). Comparar por comando, nunca lendo os dois de cabeça:

```bash
node scripts/gerar-docx.js --comparar contratos/padaria-2026-03-04/contrato.docx dados/contrato-devolvido.docx
```

O script extrai o texto dos dois, mostra só as linhas que saíram e entraram, com o título mais próximo acima de cada mudança pra localizar a cláusula, e marca com `⚠` a linha que toca em valor, prazo, multa, cancelamento, propriedade, garantia ou dados pessoais. Se o cliente usou controle de alterações, ele diz quantas inserções, exclusões e comentários tem, e compara o texto com tudo aceito. Se não usou, o diff é a única forma de saber, e é comum que a mudança mais cara esteja numa linha que ninguém marcou.

```
  [7. Cancelamento]
  ⚠ saiu:   Multa de 20% sobre o valor restante em caso de desistência.
  ⚠ entrou: Sem multa em caso de desistência com aviso de 5 dias.
```

Levar ao usuário o resumo por cláusula, antes e depois. O que toca em dinheiro, prazo e propriedade ele decide com o `/contrato` aberto ao lado e, quando o caso é delicado, com o advogado dele. Alteração aceita volta pro original (`.md` ou `.html`), e daí se exporta de novo. O `.docx` devolvido pelo cliente nunca vira o original.

---

## O que o Word carrega

| No original | No Word |
|---|---|
| `#`, `##`, `###` | Título 1, 2 e 3, na cor da marca, visíveis no painel de navegação |
| `**negrito**`, `*itálico*`, `` `código` `` | Negrito, itálico, monoespaçado com fundo |
| `[texto](url)` | Link clicável (`mailto:` e `tel:` também) |
| Lista com `-` ou `1.` | Marcador ou numeração, aninhando por indentação |
| Tabela `\|` | Tabela com borda fina, cabeçalho em cinza que repete ao virar a página |
| `> citação` | Recuo com barra na cor da marca |
| `---` | Linha fina |
| `\pagebreak` | Quebra de página |

A tabela completa, com o que não passa e a substituição de cada fonte, está em `templates/operacao/word-editavel.md`.

---

## Regras

- **O Word não substitui o PDF final.** A formatação varia por máquina; o PDF é a fotografia. Toda entrega desta skill diz isso, e oferece o PDF junto quando ele ainda não existe (`scripts/gerar-pdf.js` no HTML de origem)
- **Texto passa pelo `/revisar` antes de exportar** quando é novo. Peça já entregue vai fiel, sem reescrita
- **Nunca editar o `.docx` na mão.** Correção vai no original (`.md` ou `.html`) e se exporta de novo. O `.docx` é derivado; quem edita o derivado perde o conserto na próxima geração
- **Nenhum placeholder sai no Word.** O script acusa `[a confirmar]`, `[nome do cliente]`, `[valor]`, `XXX` e `lorem`, e não grava o arquivo. Em contrato, um campo em branco na frente de quem vai assinar é constrangimento
- **Dizer o que ficou de fora**, peça por peça: logo, fundo, foto, coluna. Silêncio aqui vira "cadê o logo?" dois dias depois
- **Fonte só da lista segura.** `Calibri`, `Arial`, `Georgia`, `Verdana`, `Trebuchet MS`, `Cambria`, `Times New Roman`. O script troca a da marca pela parecida sozinho; fonte que não está instalada na máquina do cliente não existe pra ele
- **Proposta, contrato e documento continuam sendo do `/proposta`, `/contrato` e `/documento`.** Eles produzem a peça em HTML e PDF; esta skill só exporta o editável. Mudança de escopo, cláusula ou preço volta pra skill de origem
- **Tabela pra mexer no Excel é `/planilha`.** O Word carrega a tabela, mas não faz conta. Se o cliente quer alterar quantidade e ver o total mudar, o `.xlsx` com fórmula resolve e o `.docx` não
- **Apresentação não sai daqui.** Slide editável é outro formato; o `/apresentacao` entrega HTML e PDF. Se o cliente pedir PowerPoint, dizer que não há exportação e oferecer o PDF
- **Devolvido não vira original.** O `.docx` que o cliente mandou de volta é comparado por `diff`; o que for aceito entra no original e se exporta de novo
- **Dado pessoal fica na máquina.** Contrato tem CPF, CNPJ, endereço. Não subir o `.docx` em conversor online, nem em ferramenta de "comparar documentos" na web. O script gera, lê e compara tudo local, sem chave e sem rede (LGPD)
- **Metadado limpo.** O autor gravado no arquivo é o nome do negócio (o texto do cabeçalho), nunca e-mail pessoal ou nome de terceiro. O cliente vê isso em Arquivo, Propriedades
- Quando o usuário pergunta "e se ele alterar e assinar?", a resposta é do `/contrato`: assinatura vale sobre o texto assinado, e é por isso que o PDF vai junto e o retorno é comparado antes de qualquer assinatura
