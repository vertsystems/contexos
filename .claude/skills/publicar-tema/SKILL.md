---
name: publicar-tema
description: >
  Orquestra a criação completa de uma peça de conteúdo SEO + redes sociais a partir de um tema.
  Pega um tema (manual ou da estratégia de conteúdo do SEO), escreve o artigo de blog completo,
  gera o carrossel resumo via skill /carrossel, e produz as legendas pra Instagram, Facebook e
  LinkedIn: tudo amarrado, com o carrossel apontando pro blog. Entrega tudo pronto pro usuário
  revisar e postar na hora que quiser (blog fica em draft, nada é publicado automaticamente).
  Use quando o usuário pedir "publicar tema", "gera o conteúdo do tema X", "transforma esse tema
  em post", "cria o conteúdo completo", "quero postar sobre X", ou /publicar-tema.


---

# /publicar-tema — Pipeline de conteúdo SEO + redes sociais

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

Skill orquestradora. Pega um tema → entrega artigo no blog + carrossel + 3 legendas (Insta, FB, LinkedIn), tudo conectado.

## Dependências

- **Estratégia de conteúdo:** `seo/05-estrategia-conteudo.md` (lista mestra de temas, criada pelo `/seo`)
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Oferta ativa:** `_memoria/oferta.md` se existir (`/oferta`) — o que está sendo vendido, garantia, preço
- **Outras pesquisas SEO:** `seo/01-pesquisa-demanda.md`, `02-analise-concorrencia.md`, `08-geo-otimizacao-ia.md`
- **Skill carrossel:** `.claude/skills/carrossel/SKILL.md` — usar pra fase do carrossel
- **Site (blog):** caminho registrado em `_memoria/empresa.md` (campo "Blog"). Estrutura comum: Astro em `site/astro-site/src/content/blog/`, ou WordPress, ou outro. Se o campo estiver vazio, perguntar uma vez e **salvar a resposta** em `_memoria/empresa.md` — nas próximas execuções não pergunta mais
- **Tom de voz:** `_memoria/preferencias.md`
- **Contexto:** `_memoria/empresa.md`; sistema visual em `identidade/tokens.css` (se existir) ou `identidade/design-guide.md`
- **Insumo opcional:** dossiê em `pesquisa/<tema>.md` (`/pesquisa`) e ângulo escolhido no `/angulos` — é o que separa artigo sólido de artigo genérico
- **Referências de copy:**
  - `templates/copy/metodo.md` — diagnóstico antes de escrever: função, consciência, pilar, motor, barreira
  - `templates/copy/ganchos.md` — os quatro tempos (gancho, exposição, virada, solução), onde o gancho começa e a régua de qualidade
  - `templates/copy/edicao.md` — lista negra de clichê, gordura e regras de estilo

---

## Workflow

### Passo 0 — Escolher o tema

Se o usuário passou um tema explícito → usar.

Se não passou nada → ler `seo/05-estrategia-conteudo.md`, listar os artigos satélite + a página pilar, e perguntar:

> "Qual tema da estratégia? (lista de opções)"

Antes de listar, conferir o que já foi feito em `conteudo/indice.md` (se existir) e na pasta do blog. Marcar os temas já publicados na própria lista de opções: assim o usuário não escolhe repetido:

```
1. Como conservar X — já publicado (12/05, no ar)
2. Diferença entre Y e Z — em draft
3. Guia de W — livre
```

### Passo 1 — Pesquisa rápida

Antes de escrever, ler o que tem nas pesquisas SEO sobre esse tema:
- Keyword principal e variações (`01-pesquisa-demanda.md`)
- Como concorrentes tratam (`02-analise-concorrencia.md`) — pra fugir do óbvio
- Ângulo GEO se aplicável (`08-geo-otimizacao-ia.md`) — perguntas que IAs respondem

### Passo 2 — Escrever o blog post

**Destino:** depende do stack do site. Padrões comuns:
- Astro: `site/astro-site/src/content/blog/<slug>.md`
- WordPress: gerar markdown que o usuário cola no editor
- Outro: confirmar com o usuário

**Slug:** kebab-case curto, sem stopwords. Ex: "Como conservar carne salgada no restaurante" → `conservar-carne-salgada`.

**Frontmatter (se o stack usa markdown com frontmatter):**

```yaml
---
title: "Título atrativo, próximo da keyword"
description: "Meta description 150-160 caracteres, com keyword e benefício pro leitor"
publishedAt: YYYY-MM-DD
author: "<nome configurado em _memoria/empresa.md>"
keywords:
  - keyword principal
  - variação 1
  - variação 2
draft: true
---
```

**Sempre começar com `draft: true`.** O usuário revisa e flipa pra `false` quando aprovar.

**Estrutura do artigo (800-1500 palavras):**

1. **Lead (1-2 parágrafos):** problema concreto do público, sem enrolação
2. **H2 explicativo:** o quê e por quê
3. **H2 prático:** como fazer / o que olhar
4. **H2 comparativo ou de detalhe técnico** (opcional)
5. **H2 onde a empresa se encaixa:** conexão natural com o produto, sem ser propaganda
6. **CTA final:** link WhatsApp / formulário / contato configurado

**Regras de escrita** (seguir `_memoria/preferencias.md` estritamente):
- Sem jargão de marketing/inglês quando o público não usa
- Frases curtas, parágrafos de 2-4 linhas
- Concreto: números, certificações, datas, valores quando souber
- Markdown limpo: `##` pra H2, `###` pra H3, listas com `-`, links em `[texto](url)`

**Antes de salvar o artigo, rodar `/revisar` nele.** Texto de 1.200 palavras é onde clichê de IA e gordura se acumulam sem ninguém notar.

### Passo 3 — Carrossel resumo

**Sem perguntar, partir direto pra criação do carrossel** chamando `.claude/skills/carrossel/SKILL.md` (tipo 1: carrossel texto puro).

**Pasta:** `conteudo/<slug-do-blog>-<YYYY-MM-DD>/`

Estrutura de slides do resumo:
- **Slide 1 — capa:** mesmo título do blog (ou variação enxuta)
- **Slides 2-6:** os pontos-chave do blog (1 ideia por slide, frase natural, não bullet seco)
- **Slide final — CTA pro blog:** "Texto completo no nosso blog" + URL `<dominio>/blog/<slug>`

**Capa:** seguir sequência alternada do feed (claro → foto/escuro → cor principal → repete), checar `conteudo/` mais recente.

### Passo 4 — Legendas (3 versões)

Salvar todas em `conteudo/<pasta-do-carrossel>/`:

**`legenda.md`** (Instagram + Facebook, mesmo texto):
- Hook na primeira linha
- 2-3 parágrafos de contexto (frases naturais, sem corporativês)
- CTA pro carrossel ("Arraste pro lado") + CTA pro blog ("Texto completo no link da bio" ou URL direta)
- Bloco oferta da empresa (diferenciais, contato)
- 10-15 hashtags (público + nicho + local)

**`legenda-linkedin.md`** (LinkedIn, mais formal, sem hashtags):
- Hook (pode ser provocativo, profissional)
- 3-5 parágrafos analíticos — LinkedIn aceita texto longo
- Sem "arraste pro lado" (público diferente, comportamento diferente)
- CTA: link direto pro blog
- Sem bloco de oferta agressivo — fechar com 1 linha de quem é a empresa
- Máx 3 hashtags no final, do nicho profissional

### Passo 5 — Registrar no índice

Acrescentar uma linha em `conteudo/indice.md` (criar o arquivo na primeira vez):

```markdown
| Data | Tema | Slug | Blog | Carrossel | Status |
|---|---|---|---|---|---|
| 2026-05-12 | Como conservar X | conservar-x | site/.../conservar-x.md | conteudo/conservar-x-2026-05-12/ | draft |
```

Atualizar o status na mão conforme for publicando (`draft` → `publicado`). Esse índice é o que evita escrever duas vezes o mesmo tema seis meses depois.

### Passo 6 — Resumo de entrega

A skill termina com tudo pronto e **nada publicado**. Mostrar pro usuário uma lista clara:

```
✓ Blog post: <caminho>/<slug>.md (draft)
✓ Carrossel: conteudo/<pasta>/
  - PNGs prontos em instagram/ (slide-01 … slide-NN)
✓ Legendas:
  - legenda.md (Insta + FB)
  - legenda-linkedin.md
✓ como-postar.md — passo a passo com a legenda pra copiar

Pra publicar, na sua hora:

BLOG
1. Ler o artigo e ajustar o que quiser
2. Trocar draft: true → draft: false
3. Rebuild do site (ou colar no CMS, se for WordPress)

INSTAGRAM + FACEBOOK
4. Meta Business Suite → Criar publicação → Carrossel
5. Subir os PNGs na ordem do nome, colar legenda.md
6. Programar pro horário que você quiser

LINKEDIN
7. Publicação com as imagens + texto de legenda-linkedin.md

Quando publicar, marca como "publicado" no indice.md (ou me avisa que eu marco).
```

Não oferecer publicação automática aqui. A skill entrega os arquivos e o usuário publica onde já trabalha: é o padrão do sistema (existe uma skill opcional de publicação em `templates/opcional/`, que exige App da Meta e configuração própria).

---

## Quando NÃO usar essa skill

- Pedido de carrossel avulso (sem blog) → usar `/carrossel` direto
- Atualização de artigo existente → editar direto o .md
- Post único, frase de impacto → `/carrossel`

## Princípios

1. **Blog é a peça-mãe.** Carrossel e legendas são derivados dele, não o contrário.
2. **Tudo conectado.** Cada peça referencia a outra (carrossel linka pro blog, blog tem CTA pro contato).
3. **Draft sempre.** A skill nunca publica. Entrega os arquivos e quem decide quando e onde postar é o usuário.
4. **Linguagem do público real.** Sem corporativês. Sempre.
