---
name: aprovar-post
description: >
  Recurso avançado e opcional: publica automaticamente um post já criado, flipa o blog de draft
  pra published, sobe os PNGs pro site e posta o carrossel no Instagram + Facebook via Meta Graph API.
  Exige token da Meta e site com deploy automático já configurados. Use SOMENTE quando o usuário
  pedir automação explicitamente ("publica automático", "posta no Insta pela API", "/aprovar-post").
  NÃO use quando ele disser apenas "publicar", "aprovar" ou "postar": nesses casos o padrão do
  Contex OS é entregar os arquivos prontos pra ele programar na mão.
---

# /aprovar-post — Publicação automática (avançado, opcional)

> **Esse não é o caminho padrão do Contex OS.** O fluxo normal termina com os
> arquivos prontos na pasta do conteúdo — legenda pra copiar e PNGs numerados —
> e você programa no Meta Business Suite, no app ou onde preferir. É mais
> simples, não depende de token nenhum e te deixa escolher o horário.
>
> Essa skill existe pra quem publica em volume e já tem a integração da Meta
> montada. Se esse não é o seu caso, ignore ela.

Faz a ponte entre o conteúdo aprovado (blog + carrossel + legendas, criado por `/publicar-tema`)
e a publicação real no feed (site + Instagram + Facebook).

## Antes de rodar — confirmar a intenção

Se o usuário chegou aqui sem pedir automação de forma explícita, oferecer o caminho manual primeiro:

> "Posso publicar automático (Instagram + Facebook via API da Meta), mas isso
> precisa de token configurado e publica na hora, sem escolher horário.
> O caminho mais simples é eu te entregar a legenda e os PNGs prontos pra você
> programar no Meta Business Suite. Qual você prefere?"

Só seguir com o fluxo abaixo se ele escolher a automação.

## Quando NÃO usar

- Conteúdo ainda não foi criado → use `/publicar-tema` primeiro
- Usuário ainda está revisando → não rodar até ele dizer "aprovado" / "pode postar"
- Usuário quer escolher o horário da publicação → caminho manual, não essa skill
- Site não está deployado / Meta API não configurada → **não montar a integração agora**; entregar os arquivos e seguir manual

## Pré-requisitos (uma vez só)

- `.env` na raiz com:
  - `META_PAGE_ACCESS_TOKEN` — token de longa duração da Página FB
  - `META_PAGE_ID` — ID da Página FB
  - `META_IG_USER_ID` — ID da conta Insta Business
  - `SITE_URL` — ex: `https://exemplo.com.br`
- Site com deploy automático a partir do `main` do GitHub (Netlify, Vercel, etc.)
- Conta Insta Business conectada à Página FB
- Página FB com permissões corretas no Meta App
- Scripts `scripts/postar-instagram.js` e `scripts/postar-facebook.js` configurados

Se algo disso faltar: parar e apontar pro guia de setup (criar `campanhas/automacao-meta-setup.md` se ainda não existir).

## Argumento

`/aprovar-post <slug>`: onde `<slug>` é o nome do arquivo do blog **sem `.md`**.

Exemplo: `/aprovar-post como-conservar-produto`

Se o usuário não passou slug, listar os blogs em draft (arquivos com `draft: true`) e perguntar qual.

## Workflow

### Passo 1 — Localizar arquivos

- Blog: `site/.../blog/<slug>.md` (caminho depende do stack — Astro, Hugo, etc.)
- Carrossel: procurar `conteudo/<slug>-*` (a pasta tem sufixo de data)
- Validar que existem PNGs em `<pasta-carrossel>/instagram/slide-XX.png` (2 a 10)
- Validar que existem `legenda.md` e `legenda-linkedin.md`

Se faltar qualquer um, parar e relatar.

**Validar antes de tentar publicar** (a Meta API rejeita silenciosamente ou dá erro genérico):
- Legenda com no máximo 2.200 caracteres e 30 hashtags
- Cada PNG em 1080x1350, JPEG ou PNG, abaixo de 8 MB
- Proporção entre 4:5 e 1.91:1
- Entre 2 e 10 imagens no carrossel

Se algo estourar, corrigir (ou pedir pro usuário decidir o corte) antes de seguir.

### Passo 2 — Mostrar resumo + pedir confirmação final

Mostrar pro usuário:
- Título do blog
- Quantos slides do carrossel
- Primeiras 200 chars da legenda
- URL final que vai ser publicada

Perguntar: **"Confirma publicação? (sim/não)"**. Só seguir se ele disser sim.

### Passo 3 — Flipar draft pra false

Editar o frontmatter do blog: `draft: true` → `draft: false`.

### Passo 4 — Copiar PNGs pro public folder do site

- Origem: `conteudo/<slug>-<data>/instagram/slide-*.png`
- Destino: `site/.../public/img/posts/<slug>/slide-*.png`
- Criar pasta de destino se não existir
- Sobrescrever se já existir (caso seja re-publicação)

### Passo 5 — Commit + push

```bash
git add site/<caminho>/blog/<slug>.md site/<caminho>/public/img/posts/<slug>/
git commit -m "publicar: <título do blog>"
git push origin main
```

Esperar push terminar com sucesso.

### Passo 6 — Aguardar deploy

Deploy automático (Netlify/Vercel) leva ~1-2 min. Validar que o post está no ar:

```bash
curl -sf -o /dev/null -w "%{http_code}" "$SITE_URL/blog/$slug/"
```

Aguardar HTTP 200 (com timeout de 5 min). Também checar que pelo menos `slide-01.png` está acessível:

```bash
curl -sf -o /dev/null -w "%{http_code}" "$SITE_URL/img/posts/$slug/slide-01.png"
```

Sem isso, a Meta API vai falhar: ela busca a imagem por URL pública.

### Passo 7 — Postar no Instagram

```bash
node --env-file=.env scripts/postar-instagram.js conteudo/<slug>-<data>
```

Capturar o post id retornado. Se falhar, **não seguir pra Facebook**: relatar e parar.

### Passo 8 — Postar no Facebook

```bash
node --env-file=.env scripts/postar-facebook.js conteudo/<slug>-<data>
```

Capturar o post id retornado.

### Passo 9 — LinkedIn

LinkedIn é manual por enquanto (API de empresa precisa de aprovação demorada). Mostrar pro usuário:

```
LinkedIn: cole esse texto manualmente em https://linkedin.com/in/<seu-perfil>:
<conteúdo de legenda-linkedin.md>
```

### Passo 10 — Resumo

Mostrar:
```
✓ Post publicado: <título>

Site:        <SITE_URL>/blog/<slug>/
Instagram:   <link do post>
Facebook:    <link do post>
LinkedIn:    pendente — texto pronto em legenda-linkedin.md (postar manual)
```

### Passo 11 — Atualizar o índice

Marcar a linha do tema em `conteudo/indice.md` como `publicado`, com as URLs do site, Instagram e Facebook. É o histórico que o `/publicar-tema` consulta pra não repetir tema.

## Tratamento de erro

- Push falhou: rollback do `draft: false` (restaura `draft: true`) **e** dos PNGs copiados pro `public/` (remover a pasta criada), relata e para. O objetivo é o repo voltar ao estado anterior — nada de "meio publicado"
- Deploy não subiu em 5 min: relata, pergunta se quer continuar mesmo assim ou abortar
- Insta API falhou: para e relata. Site já está no ar, blog publicado — só o post no feed que não foi. **Não** fazer rollback do site nesse ponto (o artigo publicado é válido por si)
- FB falhou mas Insta OK: relata, sugere tentar de novo só o FB depois
- Token expirado (erro 190 da Meta): explicar que o token de longa duração venceu e apontar como gerar outro. Não tentar de novo em loop
- Rate limit da Meta: esperar e tentar no máximo 2 vezes, depois parar e relatar

## Princípios

1. **Confirmação humana antes de qualquer coisa irreversível.** Nunca pular o passo 2.
2. **Idempotente onde possível.** Re-rodar com mesmo slug deve detectar publicação prévia (blog não-draft, PNGs já no public/) e perguntar se é pra re-postar ou só atualizar.
3. **Falha cedo, falha alto.** Qualquer pré-requisito faltando = abortar e explicar o que falta.
4. **Logar tudo.** Cada passo imprime o que está fazendo e o resultado.
