# Conexões — ligar uma ferramenta ao sistema

Referência do `/conectar`. Serve também pra qualquer skill que descobre, no meio do trabalho,
que a ferramenta de que precisa não está ligada: em vez de explicar de cabeça, manda pra cá. O
GitHub é a exceção, e fica com o `/salvar`.

Por que existe: a maior parte das ferramentas de fora só precisa de uma linha no `.env` pra
funcionar. É nessa linha que o usuário leigo trava. Ele não sabe onde a chave nasce, cola com
aspas, cola no arquivo errado, e depois não sabe se deu certo. Este arquivo tem, pra cada
ferramenta, o que ela habilita, onde a chave nasce, o nome exato da variável, o teste que prova
que funcionou e os três erros que mais acontecem.

**Conferido em 2026-05, pela base de conhecimento do assistente.** Tela de terceiro muda sem
avisar. Nome de menu, posição do botão, formato do token: tudo isso troca. Quando o que o usuário vê não bater
com o passo a passo, o caminho é buscar na web na hora ("onde fica a chave de API do X em
2026") e corrigir aqui, com a data nova. Nunca insistir num clique que não existe mais.

---

## Os três princípios, antes de qualquer ferramenta

1. **Chave só no `.env` da raiz.** Nunca em skill, molde, `CLAUDE.md`, `conexoes.md`, mensagem
   de commit ou chat. O `.env` é ignorado pelo git; o resto vai pro GitHub junto com o trabalho
2. **O usuário cola a chave no arquivo, não no chat.** O assistente diz a linha exata pra
   escrever; quem abre o `.env` e cola é a pessoa. Chave colada no chat vai pro histórico da
   conversa, pro print de tela e pro log. Se ela colou no chat mesmo assim: gravar no `.env` sem
   ecoar o valor, e recomendar trocar a chave no fornecedor
3. **Ligação sem teste não existe.** `node scripts/conectar.js testar <ferramenta>` faz um
   pedido barato à API e responde funcionou ou não, sem mostrar o valor. Só depois do teste a
   ferramenta é marcada como conectada

Formato da linha no `.env`: `NOME=valor`, sem aspas, sem espaço em volta do `=`, sem `export`.
No Windows, o Bloco de Notas salva `.env.txt` se ninguém escolher "Todos os arquivos" na hora de
salvar. O `node scripts/conectar.js status` acusa cada um desses tropeços, o `.txt` incluído.

Ferramenta de um cliente (na convenção por cliente) usa o mesmo `.env`, com o nome do cliente na
frente: `PADARIA_META_PAGE_ID=...`. O teste é `node scripts/conectar.js testar meta --prefixo padaria`.

---

## Tabela: ferramenta, variável, o que liga, teste

| Ferramenta | Variável no `.env` | Skills que passam a funcionar | Teste de prova |
|---|---|---|---|
| Google Gemini | `GEMINI_API_KEY` | foto por IA no `/carrossel`; transcrição via `scripts/transcrever.js` | `node scripts/conectar.js testar gemini` |
| OpenAI | `OPENAI_API_KEY` | idem, pago por uso | `node scripts/conectar.js testar openai` |
| Meta (Instagram e Facebook) | `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` | publicação por API (skill opcional em `templates/opcional/aprovar-post/`) | `node scripts/conectar.js testar meta` |
| WhatsApp Business (Cloud API) | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | envio automático pra quem monta automação sobre `/sequencia` e `/whatsapp` | `node scripts/conectar.js testar whatsapp` |
| Notion | `NOTION_TOKEN` (+ conector MCP) | ler e escrever tarefas, clientes e briefing pelo assistente | `node scripts/conectar.js testar notion` |
| Gmail | nenhuma (OAuth guardado pelo conector) | `/email-profissional` e `/pos-venda` lendo e respondendo direto | `node scripts/conectar.js testar gmail` |
| Google Analytics (GA4) | `GA4_MEASUREMENT_ID` (+ `SITE_URL`) | `/site` e `/landing` colocam a tag; `/medir` lê o export | `node scripts/conectar.js testar analytics` |
| Vercel | `VERCEL_TOKEN` | publicar o `/site` e o `/landing` por comando | `node scripts/conectar.js testar vercel` |
| Netlify | `NETLIFY_AUTH_TOKEN` | idem | `node scripts/conectar.js testar netlify` |
| Cloudflare Pages | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | HTML com link público (proposta, estudo) | `node scripts/conectar.js testar cloudflare` |
| GitHub | nenhuma (o `gh` guarda) | `/salvar` | `node scripts/conectar.js testar github` |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (+ `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) | o sistema do `/backend`; a medição do `/evoluir` | `node scripts/conectar.js testar supabase` |
| Mailchimp | `MAILCHIMP_API_KEY` | subir a série do `/sequencia` e o `/email` pra lista | `node scripts/conectar.js testar mailchimp` |
| Brevo | `BREVO_API_KEY` | idem | `node scripts/conectar.js testar brevo` |

O `.env.example` da raiz traz só as quatro primeiras (Gemini, OpenAI, Meta e `SITE_URL`). As
outras entram no fim do `.env` com o nome desta tabela; `node scripts/conectar.js lista` imprime
todos com o endereço onde a chave nasce.

---

## Passo a passo por ferramenta

Cada bloco tem o caminho da chave, a linha do `.env`, e os três erros mais comuns. O que está
como `[a confirmar]` é detalhe de tela que muda com frequência: conferir na hora.

### Google Gemini (comece por aqui se for testar sem gastar)

1. Entrar em **aistudio.google.com/apikey** com a conta Google do negócio
2. "Criar chave de API", escolher ou criar um projeto, copiar (começa com `AIza`)
3. `.env`: `GEMINI_API_KEY=AIza...`

Erros: **400 ou 403** é chave copiada pela metade ou com espaço; **429** é a cota gratuita do dia
que acabou (zera no dia seguinte); **"API not enabled"** aparece quando a chave é de um projeto do
Google Cloud onde a Generative Language API não foi ativada. Assinar o Gemini Advanced não libera
a API: aplicativo e chave são cobrados separado.

Com Gemini e OpenAI definidos ao mesmo tempo, `gerar-imagem.js` e `transcrever.js` usam a OpenAI.
Pra fixar o Gemini: `IMAGEM_PROVEDOR=gemini` e `TRANSCRICAO_PROVEDOR=gemini` no `.env`.

### OpenAI

1. **platform.openai.com/api-keys** → "Create new secret key", copiar na hora (começa com `sk-` e
   não aparece de novo)
2. Adicionar crédito em platform.openai.com/settings/organization/billing (sem crédito a chave
   existe mas não responde)
3. `.env`: `OPENAI_API_KEY=sk-...`

Erros: **401** é chave revogada ou incompleta; **429** é crédito zerado (o plano Plus do aplicativo da OpenAI
não conta como crédito de API); **403** é conta sem acesso ao modelo pedido. Sem crédito, nada responde.

### Meta: Instagram e Facebook pela Graph API

Só vale pra quem vai publicar em volume por automação. O fluxo padrão entrega os arquivos. O
usuário posta. Precisa de: Página do Facebook, conta do Instagram **profissional**
ligada a essa Página, e um app em developers.facebook.com.

1. **developers.facebook.com** → "Meus apps" → criar app do tipo Empresa `[a confirmar o nome do tipo]`
2. Adicionar o produto "Login do Facebook" e, no Graph API Explorer, gerar um token de **usuário**
   com as permissões `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`
3. Trocar o token de usuário por um **token de Página de longa duração** (o de usuário vence em
   horas). O caminho é: token de longa duração do usuário → `GET /me/accounts` → o `access_token`
   que vem ali é o da Página e não vence `[a confirmar: a Meta muda essa regra]`
4. `META_PAGE_ID`: em Configurações da Página → Sobre → "ID da Página"
5. `META_IG_USER_ID`: `GET /<META_PAGE_ID>?fields=instagram_business_account` devolve o número
6. `.env`: as três linhas

Erros: **190** é token vencido (gerou o de usuário curto, não o de Página); **100** é ID de Página
errado ou token sem `pages_read_engagement`; **"Instagram não responde"** é conta pessoal em vez de
profissional, ou conta não ligada à Página. App em modo de desenvolvimento só publica pra quem
tem papel no app; pra público geral precisa de revisão da Meta.

### WhatsApp Business (Cloud API)

Não confundir com o aplicativo WhatsApp Business do celular (grátis, sem API). A Cloud API é o
canal oficial pra envio automático, com custo por conversa. Entra na conta pra quem monta
automação em cima do `/sequencia`; o sistema em si não envia mensagem.

1. No mesmo app da Meta, adicionar o produto **WhatsApp** → "Configuração da API"
2. Ali aparecem o **token temporário** (24 h) e o **ID do número de telefone** (é um ID, não o
   número). Pra uso real, criar um usuário de sistema no Business Manager e gerar um token
   permanente com a permissão `whatsapp_business_messaging` `[a confirmar o caminho]`
3. `.env`: `WHATSAPP_TOKEN=...` e `WHATSAPP_PHONE_NUMBER_ID=...`

Erros: **190** é o token de 24 h que venceu; **400/404** é ID do número trocado pelo número em si;
**131030** é destinatário fora da lista de teste, enquanto o número não sai do modo de teste.

### Notion

1. **notion.so/profile/integrations** (o endereço antigo, `notion.so/my-integrations`,
   redireciona pra lá) → "Nova integração" (interna), dar nome, copiar o token (começa com
   `ntn_`; os antigos começam com `secret_`)
2. Em **cada página ou base** que o assistente vai ler: menu `...` → Conexões → escolher a
   integração. Sem isso o token é válido e não enxerga nada
3. `.env`: `NOTION_TOKEN=ntn_...`
4. Instalar o conector, lendo a chave do `.env` sem colar no chat:
   ```bash
   # o comando lê a chave do .env, não escreve chave nenhuma aqui: contexos:segredo-ok
   claude mcp add notion -e NOTION_TOKEN="$(grep '^NOTION_TOKEN=' .env | cut -d= -f2-)" -- npx -y @notionhq/notion-mcp-server
   ```
   O conector guarda a chave na configuração do Claude Code, na pasta do usuário (fora do
   workspace, fora do git). O nome da variável que o conector espera é `[a confirmar]` na
   documentação do pacote: versões antigas usavam `OPENAPI_MCP_HEADERS`

Erros: **401** é token errado; **"object not found"** é página não compartilhada com a integração;
**conector não sobe** é Node abaixo de 18 ou `npx` sem rede.

### Gmail (conector MCP)

Não tem chave: é uma autorização OAuth do Google, guardada pelo conector fora do workspace.

1. Em **console.cloud.google.com**, criar um projeto e ativar a **Gmail API**
2. Tela de consentimento OAuth: tipo "Externo", e o próprio e-mail do negócio como **usuário de
   teste**. Sem isso o Google barra o login com "access_denied"
3. Credenciais → criar credencial OAuth do tipo "Aplicativo para computador" e baixar o JSON
4. Salvar o JSON em `~/.gmail-mcp/gcp-oauth.keys.json` (na pasta do usuário, nunca dentro do
   workspace) `[a confirmar o caminho na documentação do pacote]`
5. Autorizar uma vez: `npx @gongrzhe/server-gmail-autoauth-mcp auth` abre o navegador
6. Instalar: `claude mcp add gmail -- npx -y @gongrzhe/server-gmail-autoauth-mcp`

Erros: **"app não verificado"** na tela do Google é normal em app próprio (Avançado → continuar);
**token vencido** acontece em app em modo de teste depois de 7 dias (refazer o passo 5, ou
publicar o app no console); **conector falha ao subir** é o JSON no lugar errado.

### Google Analytics (GA4)

O que se liga aqui é o **ID da métrica** (`G-...`), pra `/site` e `/landing` colocarem a tag
certa. A leitura de dados continua por export em CSV, como o `/medir` faz; não precisa de chave.

1. **analytics.google.com** → Administrador → Fluxos de dados → o site → "ID da métrica"
2. `.env`: `GA4_MEASUREMENT_ID=G-...` e `SITE_URL=https://...` (pro teste conferir a tag no ar)

Erros: **ID da propriedade** (só números) no lugar do ID da métrica; **UA-** antigo, do Universal
Analytics, que o Google desligou em julho de 2023; **tag no HTML e nada no Tempo real**, que
costuma ser bloqueador de anúncio no navegador de quem testa.

### Vercel, Netlify e Cloudflare Pages

Os três publicam o `/site` e o `/landing`. Sem token, o usuário publica na mão (arrastar a pasta
ou `npx vercel login`), e isso basta pra muita gente. O token serve pra publicar por comando.

1. Vercel: vercel.com/account/tokens → criar, com prazo → `VERCEL_TOKEN=...`
2. Netlify: app.netlify.com/user/applications → Personal access tokens → `NETLIFY_AUTH_TOKEN=...`
3. Cloudflare: dash.cloudflare.com/profile/api-tokens → criar com permissão Cloudflare Pages:
   Edit → `CLOUDFLARE_API_TOKEN=...`. O `CLOUDFLARE_ACCOUNT_ID` está na lateral da página inicial
   do painel

Um token basta. Ninguém precisa dos três.

Erros: **401/403** é token vencido (Vercel vence no prazo escolhido); **token sem permissão** na
Cloudflare (criou com o modelo errado); **publicou no projeto errado** por rodar o comando fora
da pasta `site/`.

### GitHub

É o `/salvar` que configura: instala o `gh`, faz `gh auth login`, cria o repositório privado e
liga o `origin`. O `/conectar` só confere (`testar github`) e manda pra lá.

### Supabase

1. **supabase.com/dashboard** → o projeto → Settings → API
2. `SUPABASE_URL` é o Project URL; `SUPABASE_ANON_KEY` é a chave `anon public`
3. `SUPABASE_SERVICE_ROLE_KEY` só se o `/backend` pedir: ela pula toda regra de segurança e
   nunca pode ir pro navegador. `DATABASE_URL` (Settings → Database) só pra migração e `psql`
4. `.env`: as linhas acima

Erros: **401** é chave anon copiada pela metade; **404** é URL de outro serviço; **projeto
pausado** no plano gratuito depois de uma semana sem uso (reativar no painel).

### Mailchimp e Brevo

1. Mailchimp: perfil → Extras → API keys → criar. A chave termina em `-usNN`, e esse sufixo é
   o servidor. Copiar inteira → `MAILCHIMP_API_KEY=...`
2. Brevo: app.brevo.com/settings/keys/api → nova chave (começa com `xkeysib-`) →
   `BREVO_API_KEY=...`

Erros: **401** é chave desativada ou conta pausada; **sufixo cortado** no Mailchimp (a chave sem
o `-usNN` não sabe pra qual servidor ir); **lista sem opt-in** recusada pela plataforma, que é
regra deles, não erro de chave.

---

## Depois que ligou

1. Teste passou → marcar no `CLAUDE.md` do workspace, seção "Ferramentas conectadas", com a data
   e a variável, nunca o valor: `- [x] Notion (2026-09-18, NOTION_TOKEN no .env, teste ok)`
2. Rodar `node scripts/verificar.js segredo` pra garantir que nada versionado recebeu chave
3. Chave que vazou (foi pro chat, pro print, pro commit) se **troca no fornecedor**. Apagar do
   arquivo não apaga do histórico
