# Catálogo de Ferramentas

Referência de APIs, CLIs e conectores para usar dentro de skills do Claude Code.
Consulte antes de criar skill nova. Ele diz o que já existe.

> Toda chave de API vai no `.env` da raiz (modelo em `.env.example`). O `.env` é
> ignorado pelo git — nunca cole chave em skill, script ou markdown.

---

## Criar visuais (HTML pra PNG)

### Playwright CLI
**O que faz:** Renderiza qualquer HTML em imagem PNG (carrosséis, slides, propostas, cards)
**Precisa de conta:** Não, roda local
**Como instalar** (uma vez só, dentro de `scripts/`):
```bash
cd scripts && npm install playwright && npx playwright install chromium
```
**Como usar numa skill:**
```bash
npx playwright screenshot --viewport-size=1080,1350 --full-page "file:///caminho/slide.html" "slide.png"
```
**Tamanhos comuns:**
- Instagram feed: 1080x1350
- Instagram/TikTok story: 1080x1920
- Slide 16:9: 1920x1080
- Card quadrado: 1080x1080

---

## Publicar na web

### Cloudflare Pages API
**O que faz:** Publica arquivos HTML com link público (propostas, landing pages, estudos)
**Precisa de conta:** Sim, Cloudflare (grátis)
**Configurar:** `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no `.env`
**Quando usar:** Sempre que a skill gerar um HTML que precisa ser compartilhado por link

---

## Publicar em redes sociais

### Meta Graph API (Instagram + Facebook)
**O que faz:** Publica carrossel e post único no Instagram Business e na Página do Facebook
**Precisa de conta:** Sim — App na Meta for Developers, Página FB e conta Instagram Business conectada
**Configurar:** `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` no `.env`
**Atenção:** a API busca as imagens por **URL pública** — os PNGs precisam estar no ar antes de publicar
**Quando usar:** só se você for publicar em volume e quiser montar a automação por conta. O ContexOS não publica sozinho — a skill opcional em `templates/opcional/aprovar-post/` depende de scripts que não vêm no produto

### Post for Me API
**O que faz:** Publica posts no Instagram e TikTok direto do Claude Code (alternativa mais simples à Meta API)
**Precisa de conta:** Sim, postforme.dev
**Configurar:** `POSTFORME_API_KEY` no `.env`
**Quando usar:** Quando o setup do App da Meta for barreira demais pro cliente

---

## Buscar conteúdo da web

### WebFetch (nativo)
**O que faz:** Lê o conteúdo de qualquer URL e traz como texto
**Precisa de conta:** Não, já vem no Claude Code
**Quando usar:** Pesquisa de referências, ler artigos, buscar dados de sites

### WebSearch (nativo)
**O que faz:** Pesquisa na web e traz resultados
**Precisa de conta:** Não, já vem no Claude Code
**Quando usar:** Quando o usuário precisa pesquisar antes de criar conteúdo

### Jina Reader
**O que faz:** Converte qualquer URL em markdown limpo (melhor que WebFetch pra artigos longos)
**Precisa de conta:** Não
**Como usar:** Acessar `https://r.jina.ai/{URL}` via WebFetch
**Quando usar:** Extrair texto de artigos, posts de blog, páginas com muito HTML

---

## Extrair conteúdo de vídeo

### yt-dlp (CLI)
**O que faz:** Baixa transcrições/legendas de vídeos do YouTube
**Precisa de conta:** Não, roda local
**Como instalar:**
```bash
brew install yt-dlp
```
**Quando usar:** Skills que partem de um vídeo pra criar conteúdo (carrossel, newsletter, roteiro)

---

## Gerar imagens com IA

### Script pronto: `gerar-imagem.js` — funciona com OpenAI **ou** Gemini
**O que faz:** Gera imagem a partir de texto, usando a conta do próprio usuário
**Precisa de conta:** Uma das duas, à escolha dele:
- **Google Gemini** — cota gratuita, sem cartão: aistudio.google.com/apikey → `GEMINI_API_KEY`
- **OpenAI** — pago por imagem: platform.openai.com/api-keys → `OPENAI_API_KEY`

Assinar ChatGPT Plus ou Gemini Advanced **não** libera. Aplicativo e API são cobrados separado.

**Como usar:**
```bash
node scripts/gerar-imagem.js "PROMPT EM INGLÊS" "conteudo/pasta/foto.png"
```
O provedor é detectado pela chave que existir. Opções: `--formato retrato|quadrado|paisagem` · `--provedor openai|gemini` · `--modelo <nome>`
**Guia de configuração pro usuário:** `templates/imagem-ia.md`
**Quando usar:** É o que o `/carrossel` tipo 2 usa. Sem instalação e sem biblioteca — só Node 18+

### Outros geradores (Midjourney, Leonardo, Firefly…)
**Integração:** não há, e não vale montar
**Como usar na prática:** gere a imagem no painel que você já usa e passe o arquivo — o `/carrossel` aceita foto pronta igual à gerada aqui

> **Regra do ContexOS:** não gerar imagem de pessoa com rosto identificável, e não
> usar foto de IA como se fosse foto real do negócio (produto, equipe, fachada).

---

## Conectar com plataformas (MCPs)

MCPs são conectores que dão acesso direto a plataformas dentro do Claude Code.
O assistente passa a usar esses conectores automaticamente quando fizer sentido.

Pra ver quais MCPs já estão instalados: `claude mcp list`
Pra remover um MCP: `claude mcp remove nome-do-mcp`

> Cada MCP instalado ocupa espaço de contexto e pode ler dados da plataforma.
> Instale o que você vai usar de verdade, não a lista inteira.

### Notion
**O que faz:** Acessa projetos, bases de dados, briefings e tarefas do Notion
**Precisa de conta:** Sim, API key em notion.so/my-integrations
**Como instalar:**
```bash
claude mcp add notion -- npx -y @notionhq/notion-mcp-server
```
**Quando usar:** Skills que precisam ler/escrever tarefas, bases de clientes, documentos

### Gmail
**O que faz:** Lê e compõe e-mails sem sair do Claude Code
**Precisa de conta:** Sim, OAuth Google
**Como instalar:**
```bash
claude mcp add gmail -- npx -y @gongrzhe/server-gmail-autoauth-mcp
```
**Quando usar:** Skills de e-mail, follow-up, comunicação com clientes

### Google Calendar
**O que faz:** Vê agenda, cria eventos e encontra horários disponíveis
**Precisa de conta:** Sim, OAuth Google
**Como instalar:**
```bash
claude mcp add google-calendar -- npx -y @gongrzhe/server-google-calendar-autoauth-mcp
```
**Quando usar:** Skills de agendamento, planejamento, organização de reuniões

### Canva
**O que faz:** Acessa designs e cria assets visuais direto pelo assistente
**Precisa de conta:** Sim, Canva Pro
**Como instalar:**
```bash
claude mcp add canva -- npx -y @canva/canva-mcp-server
```
**Quando usar:** Skills de design, criação visual, materiais de marca

### Facebook Ads (Meta)
**O que faz:** Gerencia campanhas do Meta (Facebook/Instagram Ads)
**Precisa de conta:** Sim, token Meta Business
**Quando usar:** Skills de gestão de mídia paga, relatórios de performance

### Google Ads
**O que faz:** Acessa e edita campanhas, busca dados de performance
**Precisa de conta:** Sim, credenciais Google Ads
**Quando usar:** Skills de gestão de mídia paga, relatórios de performance

### n8n
**O que faz:** Dispara automações e workflows do n8n
**Precisa de conta:** Sim, instância n8n + API key
**Como instalar:**
```bash
claude mcp add n8n -- npx -y n8n-mcp
```
**Quando usar:** Skills que precisam disparar automações externas

### Supabase
**O que faz:** Banco de dados e backend completo
**Precisa de conta:** Sim, projeto Supabase
**Quando usar:** Skills que precisam guardar dados, autenticação, backend

### Telegram
**O que faz:** Envia e recebe mensagens via bot do Telegram
**Precisa de conta:** Sim, token de bot do BotFather
**Quando usar:** Skills de notificação, comunicação automática

---

## Como adicionar ferramentas novas

Se você usa uma API ou ferramenta que não está nessa lista, adicione aqui seguindo o formato:

```markdown
### Nome da Ferramenta
**O que faz:** [descrição em uma frase]
**Precisa de conta:** [Sim/Não]
**Configurar:** [o que salvar no .env, se aplicável]
**Como usar numa skill:** [comando ou instrução]
**Quando usar:** [em que tipo de skill faz sentido]
```
