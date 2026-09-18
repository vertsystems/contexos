# scripts/ — utilitários (pasta do workspace)

Scripts Node.js e Python que as skills chamam quando precisam fazer coisas fora do alcance da IA pura (gerar imagem, postar em rede social, renderizar HTML em PNG).

A pasta vem **vazia**: cada skill que precisa de script tem instrução de como criar (e geralmente é um único setup por integração que você vai ativar).

## Scripts comuns

Conforme você for ativando skills, isso aqui vai sendo populado. Lista do que cada skill espera encontrar:

| Skill | Script esperado | O que faz |
|---|---|---|
| `/carrossel` (com foto IA) | **já vem pronto** em `scripts/gerar-imagem.js` | Gera foto por IA. Só precisa de `GEMINI_API_KEY` ou `OPENAI_API_KEY` no `.env` |
| `/carrossel` (render PNG) | `render.js` (gerado pela skill, fica na pasta do conteúdo) | Playwright tira screenshot 1080x1350 de cada slide |
| `/anuncio-google` | (nenhum — gera CSV direto) | — |
| `/relatorio-ads` | (lê CSV exportado das plataformas) | — |
| `/proposta` | (nenhum — gera HTML direto) | — |
| `/documento`, `/apresentacao` | **já vem pronto** em `scripts/gerar-pdf.js` | HTML → PDF, achando o navegador e esperando as fontes |
| todas que geram número | **já vem pronto** em `scripts/verificar.js` | Confere contagem, soma, data, contraste, peso e HTML |
| `/publicar-tema` | (nenhum — entrega os arquivos pra você postar) | — |

## Pré-requisitos comuns

**Node.js 20+** instalado na máquina.

**Chaves de API** no `.env` da raiz (copie de `.env.example`):

```bash
# Foto por IA no /carrossel — basta UMA das duas (guia: templates/imagem-ia.md)
GEMINI_API_KEY=...                  # cota gratuita, sem cartão
OPENAI_API_KEY=sk-...               # pago por imagem
```

O fluxo padrão de conteúdo não precisa de chave nenhuma: as skills geram os PNGs e a legenda, e você publica onde quiser.

## O que já vem pronto

`scripts/gerar-imagem.js`: gera foto por IA com **OpenAI ou Gemini** (detecta pela chave que existir). Roda da **raiz do workspace**, acha o `.env` sozinho, sem instalar nada:

```bash
node scripts/gerar-imagem.js "PROMPT EM INGLÊS" "conteudo/pasta/foto.png"
```

Opções: `--provedor openai|gemini` · `--formato retrato|quadrado|paisagem` · `--modelo <nome>` · `--qualidade high|medium|low`

E `scripts/gerar-pdf.js`: transforma HTML em PDF com o navegador que existir na máquina, esperando as fontes carregarem, e confere o resultado:

```bash
node scripts/gerar-pdf.js materiais/guia/guia.html
```

E `scripts/verificar.js`: confere o que não pode ser estimado (contagem, soma, data, contraste, peso, HTML). Rode antes de entregar qualquer peça com número:

```bash
node scripts/verificar.js tudo conteudo/      # roda o que couber em cada arquivo
```

O mesmo script tem um comando que não olha o seu trabalho, e sim o sistema:

```bash
node scripts/verificar.js sistema             # skill que não carrega, referência quebrada
```

Ele confere se toda skill tem frontmatter legível (BOM invisível no início do
arquivo já derrubou três), se o `name:` bate com a pasta, se a `description` tem
o gatilho que faz a skill ser encontrada, se alguma skill manda rodar script que
não existe, se a contagem de skills nos textos ainda confere, e se o workspace
está inteiro no formato de uma IA só. Rode depois de criar skill com o
`/mapear-rotinas` e depois do `/atualizar-sistema`.

<!-- ia:inicio -->
E `scripts/ia.js`: deixa o workspace no formato da IA que o usuário usa, Claude
Code (`CLAUDE.md` + `.claude/skills/`) ou Codex (`AGENTS.md` + `.agents/skills/`),
e gera pra outra um arquivo de entrada de visita. A instalação roda uma vez;
depois só se o usuário pedir pra trocar a base, ou logo após o
`/atualizar-sistema`, que traz a versão nova sempre no formato do Claude Code:

```bash
node scripts/ia.js status                     # formato ativo, e se sobrou pedaço da outra
node scripts/ia.js codex                      # ou claude
```
<!-- ia:fim -->

São os **quatro** scripts que o sistema entrega prontos. Os outros da tabela acima são criados sob demanda pela skill que precisar deles.

**Outro gerador** (Midjourney, Leonardo, Firefly, o que você já paga): não há integração, e não vale montar. Gere a imagem lá e passe o arquivo — o `/carrossel` aceita foto pronta do mesmo jeito.

O `.env` é ignorado pelo git. Nenhuma chave sai daqui.

**Playwright** (pra renderizar HTML em PNG) — instalado **uma vez só, aqui nessa pasta**:

```bash
cd scripts
npm install playwright
npx playwright install chromium
```

Cada pasta de conteúdo reaproveita essa instalação apontando o `NODE_PATH` pra cá:

```bash
NODE_PATH="../../../scripts/node_modules" node render.js
```

Isso evita um `node_modules` de centenas de MB por carrossel criado. O `node_modules/` é ignorado pelo git.

## Como o ContexOS lida com isso

Quando você roda uma skill que precisa de script ausente, o assistente vai:

1. Detectar que falta o script
2. Te perguntar se quer configurar agora
3. Te guiar no setup das chaves de API (Meta, OpenAI, etc.)
4. Criar o script já configurado
5. Rodar a skill

Você não precisa decorar nada. Roda a skill, segue o fluxo.
