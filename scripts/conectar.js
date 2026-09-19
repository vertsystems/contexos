#!/usr/bin/env node
/**
 * Contex OS — conectar.js
 * Diz o que está ligado ao sistema e prova, por comando, que a ligação funciona.
 *
 * Existe porque "colei a chave e não sei se deu certo" é a dúvida mais comum de quem
 * conecta uma ferramenta pela primeira vez. Sem um teste, a pessoa só descobre que a
 * chave está errada dias depois, no meio de um carrossel ou de uma publicação. E
 * porque conferir chave lendo o `.env` em voz alta no chat é vazamento: o valor vai
 * pro histórico, pro print, pro log. Este script lê a chave, faz um pedido barato à
 * API do fornecedor, e responde só "funcionou" ou "não funcionou, e por quê". O valor
 * nunca aparece na tela.
 *
 * Uso:
 *   node scripts/conectar.js status               o que está definido no .env, sem mostrar valor
 *   node scripts/conectar.js lista                as ferramentas que o script conhece, e o que cada uma pede
 *   node scripts/conectar.js testar <ferramenta>  prova a ligação com um pedido real
 *   node scripts/conectar.js testar tudo          testa todas as que têm chave no .env
 *                                                 (GitHub e Gmail não têm chave: testar pelo nome)
 *
 * Ferramentas: openai, gemini, meta, whatsapp, notion, vercel, netlify, cloudflare,
 *              supabase, mailchimp, brevo, analytics, github, gmail
 *
 * Opções:
 *   --endpoint <url>   usa outro endereço no lugar da API do fornecedor (pra teste em
 *                      rede fechada ou servidor de mentira; a chave vai junto, cuidado)
 *   --versao <vNN.N>   versão da Graph API da Meta (padrão: a que a Meta usa sem versão)
 *   --tempo <ms>       tempo máximo de espera por resposta (padrão: 15000)
 *   --prefixo <NOME>   testa a chave de um cliente: lê NOME_META_PAGE_ID em vez de
 *                      META_PAGE_ID (convenção por cliente, com a chave no mesmo .env)
 *
 * Sai com código 0 quando tudo que foi testado funcionou, 1 quando algo falhou, e 2
 * quando faltou chave pra testar.
 *
 * O script procura o .env na pasta atual e até 3 níveis acima. Se acha só um
 * `.env.txt` (o Bloco de Notas do Windows põe a extensão sem avisar), diz isso.
 * Node 18 ou mais novo. Sem dependência nenhuma pra instalar.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// ─────────────────────────── utilidades ───────────────────────────

const ok = (m) => console.log(`  ✓ ${m}`);
const erro = (m) => console.log(`  ✖ ${m}`);
const info = (m) => console.log(`  · ${m}`);

function opcoes(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const prox = args[i + 1];
      if (prox !== undefined && !prox.startsWith("--")) { o[a.slice(2)] = prox; i++; }
      else o[a.slice(2)] = true;
    } else o._.push(a);
  }
  return o;
}

/**
 * Lê o .env (pasta atual e até 3 acima). Devolve as variáveis e os avisos de forma:
 * aspas, espaço em volta do "=", "export " na frente, BOM. Cada um desses já fez
 * alguém achar que a chave estava errada quando só o arquivo estava torto.
 */
function lerEnv() {
  const vars = {};
  const avisos = [];
  let arquivo = null;
  let dir = process.cwd();
  for (let i = 0; i <= 3; i++) {
    const env = path.join(dir, ".env");
    if (fs.existsSync(env)) {
      arquivo = env;
      let texto = fs.readFileSync(env, "utf8");
      if (texto.charCodeAt(0) === 0xfeff) { avisos.push("o .env começa com BOM (marca invisível do editor): salve como UTF-8 sem BOM"); texto = texto.slice(1); }
      texto.split(/\r?\n/).forEach((linha, n) => {
        if (!linha.trim() || linha.trim().startsWith("#")) return;
        const m = linha.match(/^\s*(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) { avisos.push(`linha ${n + 1} não tem a forma NOME=valor`); return; }
        const [, exp, nome, bruto] = m;
        if (exp) avisos.push(`linha ${n + 1}: "export" na frente de ${nome} não é preciso aqui`);
        if (bruto.trim() && /\s=|=\s/.test(linha.split("#")[0])) avisos.push(`linha ${n + 1}: espaço em volta do "=" em ${nome}; alguns leitores guardam o espaço como parte da chave`);
        let valor = bruto.trim();
        if (/^(["']).*\1$/.test(valor)) { avisos.push(`linha ${n + 1}: ${nome} está entre aspas; funciona aqui, mas não em todo leitor de .env`); valor = valor.slice(1, -1); }
        if (valor && !(nome in vars)) vars[nome] = valor;
      });
      break;
    }
    if (fs.existsSync(env + ".txt")) { avisos.push(`achei ${env}.txt: o editor salvou com extensão .txt. Renomeie pra .env, sem nada depois`); break; }
    const pai = path.dirname(dir);
    if (pai === dir) break;
    dir = pai;
  }
  return { vars, avisos, arquivo };
}

/** Pedido HTTP com tempo máximo. Devolve status, corpo em texto e o JSON quando houver. */
async function pedir(url, { metodo = "GET", cabecalhos = {}, corpo, tempo = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), tempo);
  try {
    const resp = await fetch(url, { method: metodo, headers: cabecalhos, body: corpo, signal: ctrl.signal });
    const texto = await resp.text();
    let json = null;
    try { json = JSON.parse(texto); } catch {}
    return { status: resp.status, texto, json };
  } catch (e) {
    if (e.name === "AbortError") return { status: 0, texto: "", json: null, falha: `sem resposta em ${tempo / 1000} s` };
    return { status: 0, texto: "", json: null, falha: e.cause?.code || e.message };
  } finally {
    clearTimeout(timer);
  }
}

/** Corta qualquer coisa que pareça chave antes de imprimir uma mensagem de erro da API. */
function semSegredo(texto, valores) {
  let s = String(texto || "").slice(0, 300).replace(/\s+/g, " ");
  for (const v of valores) if (v && v.length >= 8) s = s.split(v).join("[chave]");
  return s;
}

function comando(bin, args) {
  try { return execFileSync(bin, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim(); }
  catch (e) { return null; }
}

// ─────────────────────────── ferramentas ───────────────────────────
// Cada ferramenta diz: o que habilita, quais variáveis pede, e como se prova.
// `testar` recebe as variáveis e o contexto (endpoint, versão, tempo) e devolve
// { ok, detalhe } ou { ok: false, detalhe, dica }. Nunca devolve a chave.

const FERRAMENTAS = {
  openai: {
    nome: "OpenAI",
    habilita: "foto por IA no /carrossel e transcrição de gravação (scripts/transcrever.js)",
    vars: ["OPENAI_API_KEY"],
    onde: "platform.openai.com/api-keys",
    async testar(v, c) {
      const r = await pedir((c.endpoint || "https://api.openai.com") + "/v1/models", { cabecalhos: { Authorization: `Bearer ${v.OPENAI_API_KEY}` }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200) return { ok: true, detalhe: `a conta responde e lista ${r.json?.data?.length ?? "os"} modelos` };
      if (r.status === 401) return { ok: false, detalhe: "401: chave inválida ou revogada", dica: "gere outra em platform.openai.com/api-keys e troque no .env (a chave começa com sk- e só aparece uma vez)" };
      if (r.status === 429) return { ok: false, detalhe: "429: sem crédito ou acima do limite", dica: "adicione crédito em platform.openai.com/settings/organization/billing; o plano Plus do aplicativo de chat não vale como crédito de API" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.error?.message || r.texto, [v.OPENAI_API_KEY])}` };
    },
  },
  gemini: {
    nome: "Google Gemini",
    habilita: "foto por IA no /carrossel e transcrição de gravação (scripts/transcrever.js), com cota gratuita",
    vars: ["GEMINI_API_KEY"],
    onde: "aistudio.google.com/apikey",
    async testar(v, c) {
      const r = await pedir((c.endpoint || "https://generativelanguage.googleapis.com") + "/v1beta/models?pageSize=1", { cabecalhos: { "x-goog-api-key": v.GEMINI_API_KEY }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200) return { ok: true, detalhe: "a chave responde e a lista de modelos abre" };
      if (r.status === 400 || r.status === 403) return { ok: false, detalhe: `${r.status}: chave inválida, incompleta ou sem permissão`, dica: "copie de novo em aistudio.google.com/apikey e cole sem aspas e sem espaço; se a chave é de outro projeto do Google Cloud, a API Generative Language precisa estar ativada nele" };
      if (r.status === 429) return { ok: false, detalhe: "429: cota do dia acabou", dica: "a cota gratuita zera todo dia; espere ou ative cobrança no projeto" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.error?.message || r.texto, [v.GEMINI_API_KEY])}` };
    },
  },
  meta: {
    nome: "Meta (Instagram e Facebook)",
    habilita: "publicação por API (skill opcional em templates/opcional/aprovar-post/) e leitura da Página",
    vars: ["META_PAGE_ACCESS_TOKEN", "META_PAGE_ID", "META_IG_USER_ID"],
    onde: "developers.facebook.com (app → Graph API Explorer → token da Página)",
    async testar(v, c) {
      const base = c.endpoint || "https://graph.facebook.com" + (c.versao ? `/${c.versao}` : "");
      // O token vai no cabeçalho, não na URL: URL para em log de proxy e de servidor.
      const cab = { Authorization: `Bearer ${v.META_PAGE_ACCESS_TOKEN}` };
      const r = await pedir(`${base}/${encodeURIComponent(v.META_PAGE_ID)}?fields=id,name`, { cabecalhos: cab, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200 && r.json?.id) {
        const r2 = await pedir(`${base}/${encodeURIComponent(v.META_IG_USER_ID)}?fields=id,username`, { cabecalhos: cab, tempo: c.tempo });
        if (r2.status === 200 && r2.json?.id) return { ok: true, detalhe: `Página "${r.json.name}" e Instagram @${r2.json.username || r2.json.id} respondem` };
        return { ok: false, detalhe: `a Página responde, mas o Instagram não (${r2.status}): ${semSegredo(r2.json?.error?.message || r2.texto, [v.META_PAGE_ACCESS_TOKEN])}`, dica: "confira o META_IG_USER_ID (é o ID numérico da conta profissional, não o @) e se a conta está ligada à Página" };
      }
      const cod = r.json?.error?.code;
      if (r.status === 400 && cod === 190) return { ok: false, detalhe: "190: token expirado ou inválido", dica: "token de usuário curto dura horas; gere um token de Página de longa duração e troque no .env" };
      if (r.status === 400 && cod === 100) return { ok: false, detalhe: "100: o META_PAGE_ID não existe ou o token não tem acesso a ele", dica: "confira o ID da Página em Configurações → Sobre, e se o token foi gerado com a permissão pages_read_engagement" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.error?.message || r.texto, [v.META_PAGE_ACCESS_TOKEN])}` };
    },
  },
  whatsapp: {
    nome: "WhatsApp Business (Cloud API)",
    habilita: "envio de mensagem por API, pra quem monta automação em cima do /sequencia e do /whatsapp",
    vars: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    onde: "developers.facebook.com (app → WhatsApp → Configuração da API)",
    async testar(v, c) {
      const base = c.endpoint || "https://graph.facebook.com" + (c.versao ? `/${c.versao}` : "");
      const r = await pedir(`${base}/${encodeURIComponent(v.WHATSAPP_PHONE_NUMBER_ID)}?fields=display_phone_number,verified_name,quality_rating`, { cabecalhos: { Authorization: `Bearer ${v.WHATSAPP_TOKEN}` }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200 && r.json?.display_phone_number) return { ok: true, detalhe: `número ${r.json.display_phone_number} (${r.json.verified_name || "sem nome verificado"}, qualidade ${r.json.quality_rating || "?"})` };
      if (r.json?.error?.code === 190) return { ok: false, detalhe: "190: token expirado ou inválido", dica: "o token temporário do painel dura 24 h; pra uso real crie um usuário de sistema no Business Manager e gere um token permanente" };
      if (r.status === 400 || r.status === 404) return { ok: false, detalhe: `${r.status}: o WHATSAPP_PHONE_NUMBER_ID não bate com o token`, dica: "o ID do número aparece em WhatsApp → Configuração da API, embaixo do número de telefone; não é o número em si" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.error?.message || r.texto, [v.WHATSAPP_TOKEN])}` };
    },
  },
  notion: {
    nome: "Notion",
    habilita: "ler e escrever páginas e bases (tarefas, clientes, briefing) pelo conector MCP",
    vars: ["NOTION_TOKEN"],
    onde: "notion.so/profile/integrations",
    async testar(v, c) {
      const r = await pedir((c.endpoint || "https://api.notion.com") + "/v1/users/me", { cabecalhos: { Authorization: `Bearer ${v.NOTION_TOKEN}`, "Notion-Version": "2022-06-28" }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200) return { ok: true, detalhe: `integração "${r.json?.name || r.json?.bot?.workspace_name || "sem nome"}" responde; lembre de compartilhar cada página com ela (menu ... → Conexões)` };
      if (r.status === 401) return { ok: false, detalhe: "401: token inválido", dica: "o token interno começa com ntn_ (antigo: secret_); copie de novo em notion.so/profile/integrations" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.message || r.texto, [v.NOTION_TOKEN])}` };
    },
  },
  vercel: {
    nome: "Vercel",
    habilita: "publicar o site do /site e a página do /landing por comando",
    vars: ["VERCEL_TOKEN"],
    onde: "vercel.com/account/tokens",
    async testar(v, c) {
      const r = await pedir((c.endpoint || "https://api.vercel.com") + "/v2/user", { cabecalhos: { Authorization: `Bearer ${v.VERCEL_TOKEN}` }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200) return { ok: true, detalhe: `conta ${r.json?.user?.username || r.json?.user?.email || "responde"}` };
      if (r.status === 403 || r.status === 401) return { ok: false, detalhe: `${r.status}: token inválido ou expirado`, dica: "gere outro em vercel.com/account/tokens; token com prazo vence sem avisar" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.error?.message || r.texto, [v.VERCEL_TOKEN])}` };
    },
  },
  netlify: {
    nome: "Netlify",
    habilita: "publicar o site do /site e a página do /landing por comando",
    vars: ["NETLIFY_AUTH_TOKEN"],
    onde: "app.netlify.com/user/applications (Personal access tokens)",
    async testar(v, c) {
      const r = await pedir((c.endpoint || "https://api.netlify.com") + "/api/v1/user", { cabecalhos: { Authorization: `Bearer ${v.NETLIFY_AUTH_TOKEN}` }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200) return { ok: true, detalhe: `conta ${r.json?.email || r.json?.full_name || "responde"}` };
      if (r.status === 401) return { ok: false, detalhe: "401: token inválido", dica: "crie um Personal access token novo em app.netlify.com/user/applications" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.message || r.texto, [v.NETLIFY_AUTH_TOKEN])}` };
    },
  },
  cloudflare: {
    nome: "Cloudflare Pages",
    habilita: "publicar HTML com link público (proposta, landing, estudo)",
    vars: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
    onde: "dash.cloudflare.com/profile/api-tokens",
    async testar(v, c) {
      const r = await pedir((c.endpoint || "https://api.cloudflare.com") + "/client/v4/user/tokens/verify", { cabecalhos: { Authorization: `Bearer ${v.CLOUDFLARE_API_TOKEN}` }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200 && r.json?.result?.status === "active") return { ok: true, detalhe: "token ativo" };
      if (r.status === 200) return { ok: false, detalhe: `token com status "${r.json?.result?.status}"`, dica: "token desativado ou vencido; edite em dash.cloudflare.com/profile/api-tokens" };
      if (r.status === 401 || r.status === 400) return { ok: false, detalhe: `${r.status}: token inválido`, dica: "crie um token com o modelo \"Edit Cloudflare Workers\" ou com permissão Cloudflare Pages: Edit" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.errors?.[0]?.message || r.texto, [v.CLOUDFLARE_API_TOKEN])}` };
    },
  },
  supabase: {
    nome: "Supabase",
    habilita: "banco e login do sistema que o /backend constrói e o /evoluir mede",
    vars: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
    opcionais: ["SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"],
    onde: "supabase.com/dashboard → projeto → Settings → API",
    async testar(v, c) {
      const base = (c.endpoint || v.SUPABASE_URL).replace(/\/$/, "");
      if (!c.endpoint && !/^https:\/\//.test(base)) return { ok: false, detalhe: "SUPABASE_URL precisa começar com https://", dica: "é o Project URL, no formato https://xxxx.supabase.co" };
      const r = await pedir(base + "/rest/v1/", { cabecalhos: { apikey: v.SUPABASE_ANON_KEY, Authorization: `Bearer ${v.SUPABASE_ANON_KEY}` }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200) return { ok: true, detalhe: "o projeto responde com a chave anon" + (v.SUPABASE_SERVICE_ROLE_KEY ? " (service_role também definida: nunca vai pro navegador)" : "") };
      if (r.status === 401) return { ok: false, detalhe: "401: chave anon inválida", dica: "copie de novo em Settings → API → Project API keys → anon public" };
      if (r.status === 404) return { ok: false, detalhe: "404: a URL não é de um projeto Supabase", dica: "confira o Project URL em Settings → API" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.message || r.texto, [v.SUPABASE_ANON_KEY])}` };
    },
  },
  mailchimp: {
    nome: "Mailchimp",
    habilita: "subir a série do /sequencia e o e-mail do /email pra lista de envio",
    vars: ["MAILCHIMP_API_KEY"],
    onde: "Mailchimp → perfil → Extras → API keys",
    async testar(v, c) {
      const dc = (v.MAILCHIMP_API_KEY.split("-")[1] || "").trim();
      if (!dc && !c.endpoint) return { ok: false, detalhe: "a chave não termina em -usNN", dica: "a chave do Mailchimp tem o servidor no fim (ex.: ...-us21); copie inteira" };
      const r = await pedir((c.endpoint || `https://${dc}.api.mailchimp.com`) + "/3.0/ping", { cabecalhos: { Authorization: "Basic " + Buffer.from("qualquer:" + v.MAILCHIMP_API_KEY).toString("base64") }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200) return { ok: true, detalhe: r.json?.health_status || "responde" };
      if (r.status === 401) return { ok: false, detalhe: "401: chave inválida ou desativada", dica: "gere outra em Extras → API keys; chave de conta pausada também dá 401" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.detail || r.texto, [v.MAILCHIMP_API_KEY])}` };
    },
  },
  brevo: {
    nome: "Brevo",
    habilita: "subir a série do /sequencia e o e-mail do /email pra lista de envio",
    vars: ["BREVO_API_KEY"],
    onde: "app.brevo.com/settings/keys/api",
    async testar(v, c) {
      const r = await pedir((c.endpoint || "https://api.brevo.com") + "/v3/account", { cabecalhos: { "api-key": v.BREVO_API_KEY, accept: "application/json" }, tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status === 200) return { ok: true, detalhe: `conta ${r.json?.email || r.json?.companyName || "responde"}` };
      if (r.status === 401) return { ok: false, detalhe: "401: chave inválida", dica: "a chave v3 começa com xkeysib-; gere outra em app.brevo.com/settings/keys/api" };
      return { ok: false, detalhe: `${r.status}: ${semSegredo(r.json?.message || r.texto, [v.BREVO_API_KEY])}` };
    },
  },
  analytics: {
    nome: "Google Analytics (GA4)",
    habilita: "o /site e o /landing colocam a tag certa; o /medir lê o export em CSV",
    vars: ["GA4_MEASUREMENT_ID"],
    opcionais: ["SITE_URL"],
    onde: "analytics.google.com → Administrador → Fluxos de dados → o site → ID da métrica (G-...)",
    async testar(v, c) {
      const id = v.GA4_MEASUREMENT_ID.trim();
      if (!/^G-[A-Z0-9]{6,}$/i.test(id)) return { ok: false, detalhe: `"${id}" não tem a forma G-XXXXXXX`, dica: "é o ID da métrica do fluxo de dados, não o ID da propriedade (só números) nem o UA- antigo" };
      const url = c.endpoint || v.SITE_URL;
      if (!url) return { ok: true, detalhe: "o ID tem a forma certa; defina SITE_URL no .env pra eu conferir se a tag está no ar" };
      const r = await pedir(url, { tempo: c.tempo });
      if (r.falha) return rede(r);
      if (r.status >= 400) return { ok: false, detalhe: `o site respondeu ${r.status}`, dica: "confira o SITE_URL; se o site ainda não foi publicado, o teste vem depois" };
      if (r.texto.includes(id)) return { ok: true, detalhe: `a tag ${id} está no HTML de ${url}` };
      return { ok: false, detalhe: `a página ${url} carrega, mas a tag ${id} não está no HTML`, dica: "se o site é do /site ou do /landing, peça pra colocar a tag; se é Wix, WordPress ou Shopify, a tag entra pela integração da plataforma e pode carregar por script externo (confira em analytics.google.com → Tempo real)" };
    },
  },
  github: {
    nome: "GitHub",
    habilita: "o /salvar guarda o trabalho num repositório privado",
    vars: [],
    onde: "é o /salvar que configura; aqui só confere",
    async testar() {
      const gh = comando("gh", ["auth", "status"]);
      const remoto = comando("git", ["remote", "get-url", "origin"]);
      if (gh !== null && remoto) return { ok: true, detalhe: `gh autenticado e origin definido (${remoto.replace(/https?:\/\/[^@]+@/, "https://")})` };
      if (gh !== null) return { ok: false, detalhe: "gh autenticado, mas este workspace não tem origin", dica: "rode o /salvar: é ele que cria o repositório e liga o origin" };
      if (remoto) return { ok: true, detalhe: `origin definido (${remoto.replace(/https?:\/\/[^@]+@/, "https://")}); o gh não está instalado ou não está logado, o que só importa pra criar repositório novo` };
      return { ok: false, detalhe: "nem gh logado nem origin definido", dica: "rode o /salvar; se quiser o gh, instale em cli.github.com e faça gh auth login" };
    },
  },
  gmail: {
    nome: "Gmail (conector MCP)",
    habilita: "ler e responder e-mail sem sair do assistente (/email-profissional, /pos-venda)",
    vars: [],
    onde: "OAuth do Google, guardado fora do workspace pelo próprio conector",
    async testar() {
      const lista = comando("claude", ["mcp", "list"]);
      if (lista === null) return { ok: false, detalhe: "não consegui rodar `claude mcp list`", dica: "o comando claude precisa estar no PATH; abra um terminal novo e tente de novo" };
      const linha = lista.split("\n").find((l) => /gmail/i.test(l));
      if (!linha) return { ok: false, detalhe: "nenhum conector chamado gmail instalado", dica: "siga o passo a passo do Gmail em templates/operacao/conexoes.md" };
      if (/failed|error|✗|✘/i.test(linha)) return { ok: false, detalhe: `o conector existe mas não sobe: ${linha.trim()}`, dica: "quase sempre é a autorização OAuth que venceu; refaça o passo de autorizar" };
      return { ok: true, detalhe: linha.trim() };
    },
  },
};

const rede = (r) => ({ ok: false, detalhe: `sem resposta da API (${r.falha})`, dica: "confira a internet, VPN ou proxy; se estiver numa rede de empresa, o firewall pode bloquear a API" });

// ─────────────────────────── comandos ───────────────────────────

function status() {
  const { vars, avisos, arquivo } = lerEnv();
  console.log("\nCONEXÕES: o que está definido no .env (o valor nunca aparece aqui)\n");
  if (!arquivo) {
    erro("não achei o .env na pasta atual nem em 3 níveis acima");
    for (const a of avisos) erro(a);
    info("crie a partir do modelo: cp .env.example .env (o modelo traz Gemini, OpenAI, Meta e SITE_URL; as outras linhas você acrescenta)");
    return 2;
  }
  info(`arquivo: ${arquivo}`);
  if (comando("git", ["rev-parse", "--is-inside-work-tree"]) === "true") {
    const ign = comando("git", ["check-ignore", "-q", "--no-index", ".env"]);
    if (ign === null) erro("o .gitignore NÃO cobre o .env: um `git add .` levaria a chave junto. Acrescente a linha `.env` no .gitignore");
    else ok(".env coberto pelo .gitignore");
  }
  for (const a of avisos) erro(a);
  console.log("");
  let definidas = 0;
  for (const [id, f] of Object.entries(FERRAMENTAS)) {
    if (!f.vars.length) { info(`${f.nome.padEnd(32)} sem chave no .env (${f.onde})`); continue; }
    const tem = f.vars.filter((n) => vars[n]);
    const falta = f.vars.filter((n) => !vars[n]);
    const opc = (f.opcionais || []).filter((n) => vars[n]);
    if (!falta.length) { definidas++; ok(`${f.nome.padEnd(32)} definida${opc.length ? ` (+ ${opc.join(", ")})` : ""}  → testar: node scripts/conectar.js testar ${id}`); }
    else if (tem.length) erro(`${f.nome.padEnd(32)} incompleta: falta ${falta.join(", ")}`);
    else info(`${f.nome.padEnd(32)} vazia (${f.vars.join(", ")})`);
  }
  console.log(`\n  ${definidas} ferramenta(s) com chave definida. Passo a passo de cada uma: templates/operacao/conexoes.md\n`);
  return avisos.length ? 1 : 0;
}

function lista() {
  console.log("\nFERRAMENTAS que o conectar.js sabe testar\n");
  for (const [id, f] of Object.entries(FERRAMENTAS)) {
    console.log(`  ${id.padEnd(11)} ${f.nome}`);
    console.log(`  ${"".padEnd(11)} habilita: ${f.habilita}`);
    console.log(`  ${"".padEnd(11)} .env: ${f.vars.length ? f.vars.join(", ") : "nenhuma variável"}${f.opcionais ? ` (opcional: ${f.opcionais.join(", ")})` : ""}`);
    console.log(`  ${"".padEnd(11)} onde: ${f.onde}\n`);
  }
}

/** Com --prefixo PADARIA, a ferramenta lê PADARIA_META_PAGE_ID no lugar de META_PAGE_ID. */
function comPrefixo(vars, prefixo) {
  if (!prefixo) return vars;
  const p = prefixo.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/_+$/, "") + "_";
  const v = {};
  for (const [n, val] of Object.entries(vars)) if (n.startsWith(p)) v[n.slice(p.length)] = val;
  return v;
}

async function testar(alvo, c) {
  const lido = lerEnv();
  const arquivo = lido.arquivo;
  const vars = comPrefixo(lido.vars, c.prefixo);
  const ids = alvo === "tudo"
    ? Object.keys(FERRAMENTAS).filter((id) => FERRAMENTAS[id].vars.length && FERRAMENTAS[id].vars.every((n) => vars[n]))
    : [alvo];
  if (!FERRAMENTAS[ids[0]] && alvo !== "tudo") {
    erro(`não conheço "${alvo}". Ferramentas: ${Object.keys(FERRAMENTAS).join(", ")}`);
    return 2;
  }
  if (!arquivo && alvo !== "tudo" && FERRAMENTAS[alvo].vars.length) {
    erro("não achei o .env. Crie a partir do modelo: cp .env.example .env");
    for (const a of lido.avisos) erro(a);
    return 2;
  }
  let falhas = 0, faltando = 0;
  console.log(`\nTESTE DE CONEXÃO${c.prefixo ? ` (cliente: ${c.prefixo})` : ""}${c.endpoint ? ` (endpoint: ${c.endpoint})` : ""}\n`);
  for (const id of ids) {
    const f = FERRAMENTAS[id];
    const falta = f.vars.filter((n) => !vars[n]);
    if (falta.length) {
      faltando++;
      erro(`${f.nome}: falta ${falta.map((n) => (c.prefixo ? `${c.prefixo.toUpperCase()}_${n}` : n)).join(", ")} no .env`);
      info(`    onde pegar: ${f.onde}`);
      continue;
    }
    process.stdout.write(`  → ${f.nome}... `);
    let r;
    try { r = await f.testar(vars, c); }
    catch (e) { r = { ok: false, detalhe: `erro inesperado: ${semSegredo(e.message, Object.values(vars))}` }; }
    console.log(r.ok ? "funcionou" : "falhou");
    (r.ok ? ok : erro)(r.detalhe);
    if (!r.ok) { falhas++; if (r.dica) info(`    conserto: ${r.dica}`); }
  }
  if (alvo === "tudo" && !ids.length) { info("nenhuma ferramenta com chave completa no .env. Veja: node scripts/conectar.js status"); return 2; }
  console.log("");
  if (falhas) { info("a mensagem de erro acima nunca contém a chave; pode colar no chat sem medo"); return 1; }
  if (faltando) return 2;
  ok("tudo que foi testado funcionou. Marque no CLAUDE.md, seção \"Ferramentas conectadas\"");
  return 0;
}

// ─────────────────────────── entrada ───────────────────────────

(async () => {
  const o = opcoes(process.argv.slice(2));
  const cmd = o._[0];
  const ctx = {
    endpoint: o.endpoint && o.endpoint !== true ? o.endpoint : null,
    versao: o.versao && o.versao !== true ? o.versao : null,
    tempo: Number(o.tempo) || 15000,
    prefixo: o.prefixo && o.prefixo !== true ? String(o.prefixo) : null,
  };
  let codigo = 0;
  if (cmd === "status") codigo = status();
  else if (cmd === "lista") lista();
  else if (cmd === "testar" && o._[1]) codigo = await testar(o._[1], ctx);
  else {
    console.log(`
Uso:
  node scripts/conectar.js status               o que está definido no .env, sem mostrar valor
  node scripts/conectar.js lista                as ferramentas conhecidas e o que cada uma pede
  node scripts/conectar.js testar <ferramenta>  prova a ligação com um pedido real
  node scripts/conectar.js testar tudo          testa todas as que têm chave (github e gmail: pelo nome)

Opções: --prefixo <CLIENTE> (chave de um cliente, ex.: PADARIA_META_PAGE_ID), --tempo <ms>, --versao <vNN.N>, --endpoint <url>

Ferramentas: ${Object.keys(FERRAMENTAS).join(", ")}
`);
    codigo = cmd ? 2 : 0;
  }
  process.exit(codigo);
})();
