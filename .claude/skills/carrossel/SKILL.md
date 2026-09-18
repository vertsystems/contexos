---
name: carrossel
description: >
  Cria carrosséis e posts visuais pra Instagram, TikTok, LinkedIn com a identidade visual da marca.
  Gera HTML estilizado + renderiza em PNG 1080x1350 via Playwright, com legenda pronta no final.
  Suporta carrossel texto puro, carrossel com foto de IA (OpenAI ou Gemini, com a conta do próprio
  usuário) e post único.
  Entrega os arquivos prontos (PNGs numerados, legenda e um como-postar.md) pro usuário
  publicar ou programar onde quiser, não publica nada por conta própria.
  Use quando o usuário pedir "carrossel", "post", "conteúdo pro instagram", "criar imagem",
  "gerar foto", "post educativo", ou /carrossel.
---

# /carrossel — Carrossel e posts visuais

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

Skill central de criação de conteúdo visual. Pega um tema → entrega HTMLs estilizados + PNGs prontos pra postar + legenda no padrão da marca.

## Dependências

- **Sistema visual, nessa ordem de precedência:**
  1. `identidade/tokens.css` — se existir, é a fonte da verdade: usar as variáveis, não redefinir cor na mão
  2. `identidade/design-guide.md` — se não houver tokens, ler a descrição da marca
  3. "Estilo visual base" desta skill — se os dois estiverem vazios
- **Contexto do negócio:** `_memoria/empresa.md`
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele é o material do hook
- **Oferta ativa:** `_memoria/oferta.md` se existir (`/oferta`) — pra peça não contradizer o que está sendo vendido
- **Tom de voz:** `_memoria/preferencias.md`
- **Insumo opcional (melhora muito a peça):**
  - `pesquisa/<tema>.md` — dado com fonte e citação literal do público (`/pesquisa`)
  - ângulo definido pelo `/angulos` — evita o carrossel sair com a estrutura de sempre
  - `biblioteca.md` — depoimento, número ou foto já catalogados e autorizados
- **Contato/@ da marca:** `_memoria/empresa.md` (bloco "Contato e canais") — usado no rodapé dos slides e no CTA final
- **Playwright:** pra renderizar HTML em PNG (`npx playwright screenshot` ou via `render.js`)
- **Foto por IA (opcional):** script pronto em `scripts/gerar-imagem.js`, que funciona com **OpenAI ou Gemini** — o usuário conecta a conta que preferir. Guia de configuração em `templates/imagem-ia.md`. Sem instalação e sem biblioteca, só Node 18+
- **Outputs vão em:** `conteudo/<tipo>-<tema>-<YYYY-MM-DD>/`
- **Referências de design** (ler antes de produzir):
  - `templates/design/briefing-visual.md` — declarar a leitura do briefing e definir os três ajustes
  - `templates/design/qualidade-visual.md` — tipografia, cor, layout, acabamento
  - `templates/design/anti-generico.md` — conferir antes de entregar
- **Referências de copy:**
  - `templates/copy/ganchos.md` — estrutura gancho → conteúdo → fechamento e a régua de qualidade
  - `templates/copy/edicao.md` — lista negra de clichê, gordura e regras de estilo

---

## Tipos de conteúdo

Ao receber um pedido, identificar qual tipo se encaixa:

### 1. CARROSSEL TEXTO PURO
- **Quando usar:** posts educacionais, dicas, listas, explicações
- **Formato:** 1080x1350 (4:5) — sempre
- **Estilo:** tipografia clean, cores da marca alternadas, sem fotos

### 2. CARROSSEL COM FOTO
- **Quando usar:** apresentação visual, conteúdo aspiracional, capa com personagem
- **Formato:** 1080x1350 (4:5)
- **Estilo:** foto como capa com gradient overlay + slides internos no padrão alternado
- **Foto:** real (passada pelo usuário) ou gerada por IA (Passo 3 — OpenAI ou Gemini)

> **Sem foto disponível, o tipo é o 1 — não o 2 improvisado.** Se o usuário pediu
> com foto mas não há foto real nem chave de API, dizer isso em uma linha e
> oferecer duas saídas: (a) ele manda uma foto, ou (b) sai o carrossel tipográfico,
> que funciona bem e sai na hora.
>
> **Nunca desenhar ilustração, mascote, personagem ou cena em SVG/CSS pra
> preencher o lugar da foto.** Ilustração desenhada na hora sai com cara de
> clip-art e destoa de peça editorial — derruba a percepção de valor da peça
> inteira, mesmo quando o resto está impecável. Elemento gráfico permitido é o
> abstrato do sistema: régua, numeral grande, selo, faixa de cor, textura sutil.

### 3. POST ÚNICO
- **Quando usar:** frase de impacto, dado/estatística, depoimento, bastidores
- **Formato:** 1080x1350
- **Estilo:** varia conforme o conteúdo (citação, número grande, foto com overlay)

Se o tipo não estiver claro, perguntar:
> "Que tipo de conteúdo? (1) carrossel texto, (2) carrossel com foto, (3) post único"

---

## Estilo visual base

O Contex OS tem um estilo próprio, editorial, calmo, premium. Sem clip-art, sem emoji decorativo, sem gradiente arco-íris, sem template genérico de IA. `identidade/tokens.css` e `identidade/design-guide.md` sobrescrevem esses padrões; quando os dois forem vagos ou vazios, usar o que tá aqui (não parar pra pedir `/instalar`, o `/carrossel` funciona com defaults bons).

Os padrões abaixo são o piso. O teto está em `templates/design/qualidade-visual.md`, e o que **nunca** fazer está em `templates/design/anti-generico.md`: conferir os dois antes de entregar.

### Tipografia padrão

- **Fonte:** Inter (Google Fonts), pesos 400/500/600/700/800/900
- **Título de capa:** 90-100px, weight 900, line-height 0.98, letter-spacing **-0.04em**
- **H2 (slides internos):** 60-72px, weight 800, line-height 1.04, letter-spacing **-0.035em**
- **Corpo:** 20-24px, weight 500, line-height 1.5
- **Eyebrow/kicker:** 13-16px, weight 700-800, **UPPERCASE**, letter-spacing **0.22-0.32em**, cor de destaque
- **Page counter (canto sup. dir.):** 14-16px, weight 500-600, letter-spacing 0.18em, cor muted
- **Meta/handle (@):** 15-18px, weight 600

Regra do tipo: títulos grandes com kerning **apertado** (-0.035em), eyebrows pequenos com kerning **aberto** (0.22em+). Esse contraste é o coração do estilo.

### Cores padrão (quando design-guide for vago)

Paleta sóbria, fundo dark + off-white + **UMA** cor de destaque. Nunca quatro cores brigando.

- Fundo escuro: `#0E1116` ou `#1A1A1A`
- Fundo claro alternativo: `#F5ECD7` (cream) ou `#FAFAF7`
- Texto sobre escuro: `#FAFAF7`
- Texto sobre claro: `#1A1A1A` (h2) e `#444` (corpo)
- Destaque: cor da marca (uma só)

### Elementos visuais recorrentes

- **Régua fina** (3-4px de altura, 60-80px de largura, cor de destaque) entre kicker e h2 ou como divisor
- **Logo top-left + page counter top-right** em todos os slides
- **Border-top 1px** `rgba(255,255,255,0.12)` separando rodapé do conteúdo (em slides escuros)
- **Stamps circulares** (200x200, border 3px translúcida, rotate -10deg) pra selos/datas/dados
- **Tags/pills** uppercase, padding generoso, kerning 0.2em, pra rotular categoria do slide
- Padding base: 70-100px nas laterais

### Layouts nomeados

Vocabulário de layout: cada slide tem um nome. Variar entre eles pra criar ritmo:

- **CAPA** — eyebrow + título grande + subtítulo + @handle. Fundo: foto com gradient overlay (`rgba(12,10,9,0.55)` → `rgba(12,10,9,0.85)`) OU sólido (escuro/claro/destaque)
- **SOLO** — split horizontal: foto à esquerda 50% + texto à direita 50% (kicker + h2 + régua + parágrafo)
- **DUO** — texto em cima (kicker + h2 + régua + p) + 2 fotos lado a lado embaixo (ou 1 foto larga)
- **NÚMERO** — numeral gigante (200-320px, weight 800, cor de destaque) como elemento gráfico + h2 + parágrafo de apoio
- **CITAÇÃO** — aspas grandes em watermark + frase em h2 + atribuição
- **CTA FINAL** — fundo na cor de destaque, logo centralizado, headline curta, botão/CTA, telefone/@handle

**Ritmo de slide a slide:** alternar fundo escuro ↔ claro ↔ destaque. Nunca dois slides seguidos com o mesmo fundo.

---

## Padrão do carrossel

**Estrutura base (5 a 10 slides):**
- **Slide 1:** layout `CAPA`
- **Slides internos:** usar 2-3 layouts diferentes entre `SOLO` / `DUO` / `NÚMERO` / `CITAÇÃO`
- **Slide final:** layout `CTA FINAL`

Antes de criar HTML: ler `identidade/design-guide.md`. Se estiver em branco, usar o "Estilo visual base" acima como default.

### Sequência de capas no feed (planejamento de grade)

Antes de definir a capa, considerar a **última capa publicada** pra alternar:
- claro → próxima é foto/escuro
- foto/escuro → próxima é cor da marca
- cor da marca → próxima é claro
- nunca duas capas iguais em sequência

Se o usuário não souber qual foi a última, perguntar.

### Linguagem (regra crítica)

Seguir `_memoria/preferencias.md`. Em geral: frases naturais, sem jargão de marketing, sem corporativês. O público real raramente fala "ticket médio", "performance", "B2B". Falar como ele fala.

### Legenda — sempre gerar junto

Ao terminar de renderizar os PNGs, gerar **automaticamente** a legenda do post e salvar em `legenda.md` na mesma pasta. **Não esperar o usuário pedir.** Estrutura padrão:

1. Hook (pergunta ou afirmação)
2. Contexto (1-2 frases sobre o conteúdo)
3. CTA pra arrastar ("Arraste pro lado e confere")
4. Bloco de oferta (diferenciais da empresa, contato de `_memoria/empresa.md`)
5. Hashtags (10-15 — público + nicho + local se aplicável)

**Limites do Instagram:** legenda até 2.200 caracteres e no máximo 30 hashtags. Se passar, cortar antes de entregar: o Instagram trunca sem avisar.

---

## Workflow

**Antes de tudo: declarar a leitura.** Uma linha, visível pro usuário: *"Estou lendo isso como: [peça] para [público], com linguagem [vibe]."* Depois definir os três ajustes (variação / movimento / densidade) conforme `templates/design/briefing-visual.md`. É o passo que impede a peça de cair no visual padrão de IA, e custa cinco segundos.

### Passo 1 — Entender e planejar

1. Ler `_memoria/preferencias.md` e `_memoria/empresa.md`
2. Ler `identidade/tokens.css` (ou o `design-guide.md`) pra cores, fontes e logo
3. Conferir se existe dossiê do tema em `pesquisa/` — se existir, usar os números e as citações literais; se o tema pede dado e não existe dossiê, oferecer `/pesquisa` antes
4. Identificar o tipo de conteúdo (1, 2 ou 3)
5. Definir o tema e o ângulo. Se o usuário chegou só com tema ("fala sobre conservação"), oferecer uma vez:
   > "Esse tema dá vários tratamentos diferentes. Quer que eu rode `/angulos` pra escolher o melhor, ou sigo com o mais direto?"

### Passo 2 — Texto

Escrever o conteúdo seguindo as regras de tom:

**Pra carrossel (5-10 slides):**
- Slide 1 (Capa): título impactante, máx 8 palavras. Oferecer 3 opções
- Slides internos: um insight por slide, frases naturais, sem bullet points
- Slide final: CTA + logo

**Pra post único:**
- Frase principal em destaque
- Contexto de apoio (se necessário)
- CTA sutil

Antes de mostrar, passar o texto pelos passes do `/revisar`: clichê de IA, gordura e tom. Slide tem 8 palavras: uma palavra vazia custa caro.

**CHECKPOINT:** Mostrar o texto completo. Esperar aprovação antes do visual.

### Passo 2b — Conferir gancho e ritmo

Antes de aprovar o texto, passar pela régua de `templates/copy/ganchos.md`:

- **O número prometido no gancho bate com o que a peça entrega?** Se a capa diz "5 mudanças", contar os slides que entregam mudança. Em teste real saiu "Cinco mudanças" numa peça com quatro — e a legenda listava 4 bullets logo abaixo. Qualquer leitor conta em 5 segundos
- **O primeiro slide funciona sem a imagem?** Se depende da foto, é legenda, não gancho
- **O gancho serviria pra qualquer outro nicho?** Se sim, é genérico — refazer
- **Máximo 10 palavras** no gancho
- **Uma ideia por slide.** Slide com duas ideias perde as duas
- **Muda o tipo de slide a cada 3** (texto → número → citação → foto) — é o que evita o abandono no meio
- **Um fechamento só.** Pedir salvar, comentar e clicar na mesma peça não consegue nada

### Passo 3 — Gerar fotos (se tipo 2)

Só se o usuário pediu carrossel com foto de IA. **O script já vem pronto no sistema**, não escrever script novo, não improvisar outra forma.

#### 3.1 — Conferir se já está ligado

O script funciona com **OpenAI ou Gemini**: o que o usuário tiver. Conferir:

```bash
grep -qE "^(OPENAI_API_KEY|GEMINI_API_KEY)=.+" .env 2>/dev/null && echo "ok" || echo "sem chave"
```

**Se tem chave:** seguir direto pro 3.2, sem comentar nada. Já está resolvido.

**Se não tem:** oferecer uma vez, de forma leve, com as três saídas, e **deixar claro que dá pra seguir sem isso**:

> "Pra eu gerar a foto, você conecta a sua conta de IA de imagem — leva uns 2 minutos
> e a chave fica só no seu computador. Duas opções:
>
> **Gemini** — tem cota gratuita, não precisa de cartão: aistudio.google.com/apikey
> **OpenAI** — pago por imagem, centavos cada: platform.openai.com/api-keys
>
> Pega a chave e cola no arquivo `.env` da raiz, assim: `GEMINI_API_KEY=...`
> (passo a passo com print em `templates/imagem-ia.md`)
>
> Ou, se preferir agora: você me manda uma foto sua, ou eu faço o carrossel
> só com tipografia — fica ótimo e sai na hora. Como você quer?"

**Se ele disser que faz depois, fazer depois.** Seguir com tipografia ou com a foto dele, sem insistir e **sem voltar ao assunto na mesma conversa**. Quando ele configurar, é só pedir de novo.

**Se ele mandar a chave no chat:** escrever no `.env` por ele, confirmar que o `.gitignore` cobre `.env`, e avisar que chave que já circulou em conversa vale a pena trocar depois.

**Se ele usa outro gerador** (Midjourney, Leonardo, Firefly): não montar integração. Ele gera lá e passa o arquivo: o resultado na peça é idêntico.

#### 3.2 — Escrever o prompt

Sempre em inglês (a API responde melhor). Estrutura:

```
Professional [tipo] photography of [assunto],
[detalhe concreto], [ambiente],
[tipo de luz] lighting, shallow depth of field,
shot from [ângulo], [estética],
editorial quality, no text, no watermark
```

Exemplo real: `Professional food photography of raw salted beef cuts on a wooden butcher counter, coarse salt crystals visible, warm rustic butcher shop, soft window lighting, shallow depth of field, shot from a low 45-degree angle, editorial quality, no text, no watermark`

O que faz a foto **não** ter cara de IA:
- **Pedir "no text, no watermark" sempre** — a API tenta escrever e sai errado
- Detalhe concreto e específico em vez de adjetivo ("coarse salt crystals visible" vence "high quality")
- Um tipo de luz só, nomeado ("soft window lighting", "hard midday sun")
- Ângulo explícito
- **Nunca** pedir rosto identificável, pessoa real, marca, logo ou personagem — a API recusa e, quando não recusa, gera problema de direito de imagem
- Nada de "hyper realistic, 8k, ultra detailed, masterpiece" empilhado: isso é sintaxe de gerador antigo e hoje piora o resultado

#### 3.3 — Rodar

Da **raiz do workspace**:

```bash
node scripts/gerar-imagem.js "PROMPT" "conteudo/<pasta>/foto-<nome>.png"
```

O script acha o `.env` sozinho e **detecta o provedor** pela chave que existir (OpenAI ou Gemini), não precisa dizer qual. Formato padrão é retrato, que é o do carrossel; se precisar, `--formato quadrado` ou `--formato paisagem`. Pra forçar um provedor: `--provedor gemini`.

Se der erro, o script já diz o conserto na própria mensagem. Os três mais comuns:

| Erro | O que é | Conserto |
|---|---|---|
| `Nenhuma chave configurada` | `.env` sem chave | voltar ao 3.1 |
| `401` / `API key not valid` | chave errada, incompleta ou com espaço | copiar de novo, colar sem aspas |
| `429` | cota diária do gratuito acabou (Gemini) ou falta crédito (OpenAI) | esperar o dia seguinte, ou adicionar crédito |
| `400` com texto de política | prompt pediu pessoa real, marca ou personagem | reescrever o prompt |
| `404` modelo não encontrado | nome do modelo mudou no provedor | usar `--modelo` com um nome atual, ou trocar de provedor |
| conta sem acesso ao `gpt-image-1` | plano da OpenAI | `--modelo dall-e-3`, ou `--provedor gemini` |

**Sobre o tamanho:** o retrato sai em 2:3 na OpenAI e 3:4 no Gemini, e o slide é 4:5. Isso é proposital: a foto entra como fundo com `background-size: cover`, então sobra margem pro recorte em vez de faltar. Nunca esticar a imagem pra caber.

#### 3.4 — Aprovar

Mostrar a foto pro usuário antes de usar no carrossel.

**CHECKPOINT:** foto aprovada → seguir. Se não, ajustar o prompt e regenerar. Cada tentativa custa dinheiro dele: então mudar um elemento por vez (luz, ângulo, ambiente) em vez de reescrever tudo, e dizer o que mudou.

### Passo 4 — Criar visuais (HTML + PNG)

1. Criar **um único `carrossel.html`** com TODOS os slides como `<div class="slide">` dentro do mesmo arquivo. Inline CSS, Google Fonts como única dependência externa. Aplicar:
   - Cores e tipografia de `identidade/design-guide.md`
   - Mínimo 2 layouts diferentes (não repetir o mesmo em todos os slides)
   - Logo top-left + slide-counter top-right em todos os slides
   - Slide final: logo + CTA, fundo na cor principal

   **Pra incluir foto IA no HTML:**
   ```html
   <div class="slide" style="
     background-image: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('foto-xxx.png');
     background-size: cover;
     background-position: center;
   ">
     <div class="content">
       <h2>Texto sobre a foto</h2>
     </div>
   </div>
   ```

2. Criar `render.js` na mesma pasta — script Node com Playwright que abre o HTML e tira screenshot de cada `.slide` em **1080x1350 com `deviceScaleFactor: 1`**.

   Não usar 2x. O Instagram redimensiona tudo pra 1080 de largura na hora do upload, então 2160px não melhora nada e cria dois problemas: arquivo de 4-6 MB (perto do limite de 8 MB da API da Meta) e transferência lenta pro celular. Se o PNG passar de 2 MB, algo está errado: quase sempre é escala 2x ou imagem de fundo não otimizada.

   **Playwright fica instalado uma vez só, em `scripts/`** (nunca uma cópia por pasta de conteúdo). Na primeira vez:
   ```bash
   cd scripts && npm install playwright && npx playwright install chromium
   ```
   E pra renderizar, apontar o `NODE_PATH` pra lá:
   ```bash
   NODE_PATH="../../scripts/node_modules" node render.js
   ```
   (ajustar o número de `../` conforme a profundidade da pasta do conteúdo)

3. Mostrar slide 1, 2 e o CTA final renderizados. Se aprovado, mostrar os intermediários.

4. **Conferir peso e legibilidade antes de entregar:**

   ```bash
   node scripts/verificar.js peso conteudo/<pasta>/instagram
   ```

   PNG acima de 2 MB é sinal de escala 2x no `render.js`: o Instagram recomprime pra 1080 de largura de qualquer jeito, então o arquivo grande só atrapalha (transferência lenta pro celular, e perto do limite de 8 MB da API da Meta).

   E a olho: texto sobre foto precisa de overlay suficiente pra ler no celular; título não pode estourar o slide nem ficar com viúva (palavra sozinha na última linha); nada de texto a menos de 60px da borda (o Instagram corta a prévia).

### Passo 5 — Salvar e organizar

```
conteudo/<tipo>-<tema>-<YYYY-MM-DD>/
  texto.md              ← texto aprovado + legenda
  foto-<nome>.png       ← fotos geradas por IA (se houver)
  carrossel.html
  render.js
  instagram/
    slide-01.png → slide-NN.png
  tiktok/ (se pedido — formato 9:16)
    slide-01.png → ...
  legenda.md            ← legenda Insta+FB
  legenda-linkedin.md   ← (se pedido, mais formal)
  como-postar.md        ← ordem dos slides + legenda + onde programar
```

Nomear os PNGs com número de dois dígitos (`slide-01`, não `slide-1`), assim a ordem de upload no Meta Business Suite sai certa sozinha.

### Passo 6 — Entregar o kit de publicação

A skill termina aqui: com tudo pronto pro usuário postar quando quiser. **Não publicar nada, não sugerir automação.**

Salvar `como-postar.md` na pasta do conteúdo e mostrar o mesmo resumo no chat:

```markdown
# Como postar — <tema>

**Ordem dos slides:** slide-01 → slide-NN (a ordem do nome é a ordem do carrossel)

## Legenda
[legenda completa, pronta pra copiar]

## Onde os arquivos estão
- Imagens: instagram/slide-01.png … slide-NN.png
- Legenda: legenda.md
- LinkedIn: legenda-linkedin.md (se houver)

## Pra programar
- **Instagram + Facebook juntos:** Meta Business Suite → Criar publicação →
  Carrossel → subir os PNGs na ordem → colar a legenda → Programar
- **Só Instagram, pelo celular:** enviar os PNGs pro celular e postar como
  carrossel (o app agenda em Configurações → Ferramentas de criação)
- **LinkedIn:** publicação com documento ou imagens + `legenda-linkedin.md`

## Melhor horário
[só preencher se `_memoria/empresa.md` tiver dado real de audiência.
Sem dado, escrever: "sem histórico ainda — poste e anote o que performou"]
```

Depois, uma pergunta só (não as duas):

> "Esse conteúdo dá pra virar artigo no blog também. Quer que eu crie a versão blog pra SEO?"

Se sim, chamar `/publicar-tema` com o mesmo tema.

---

## Regras

- Sempre ler o sistema visual antes de criar (`tokens.css` primeiro, `design-guide.md` depois)
- Se `tokens.css` existir, usar as variáveis CSS — não escrever hex solto no HTML
- Carrossel: 1080x1350 (4:5 retrato) — sempre. TikTok/Reels: 1080x1920 (9:16), só quando pedido explicitamente
- Linguagem segue `_memoria/preferencias.md` estritamente
- Sempre considerar a sequência de capa no feed antes de definir capa nova
- Sempre gerar legenda automaticamente ao final, salvando em `legenda.md`
- Fotos IA: sempre pedir aprovação antes de usar no carrossel
- Fotos IA: prompts em inglês, sempre com `no text, no watermark`
- Fotos IA: nunca gerar rosto identificável, pessoa real, marca, logo ou personagem
- Fotos IA: **usar o script que já vem** (`scripts/gerar-imagem.js`). Não escrever script novo, não instalar biblioteca, não improvisar outra ferramenta
- Fotos IA: cada tentativa custa dinheiro do usuário — mudar um elemento por vez ao regenerar, e dizer o que mudou
- Fotos IA: nunca apresentar foto gerada como se fosse foto real do negócio (produto, equipe, fachada). Se for pra parecer real, usar foto real
- HTMLs: um único arquivo `carrossel.html` com todos os slides + `render.js` na mesma pasta. Inline CSS
- Render: Playwright instalado só em `scripts/` — nunca rodar `npm install` dentro da pasta do conteúdo
- Não repetir layout entre slides — usar variação visual
- Legenda: respeitar 2.200 caracteres e 30 hashtags
- Conferir legibilidade no tamanho real antes de entregar (texto sobre foto, viúvas, margem de 60px)
- **A skill entrega arquivo, não publica.** Terminar sempre com o kit (`como-postar.md`) e deixar a decisão de quando postar com o usuário. Não oferecer publicação automática: o usuário publica onde já trabalha, e é assim que o sistema funciona
