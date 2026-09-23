#!/usr/bin/env node
/**
 * Contex OS — vazamento.js
 * Procura chave secreta no que vai pro navegador: a pasta do build (dist/,
 * build/, .next/, out/), os source maps, o código do front e, se houver URL,
 * o app no ar (baixa a página, cada script que ela carrega e o .map de cada um).
 *
 * Existe porque a chave service_role do Supabase, a sk- da OpenAI e a
 * sk_live_ do Stripe funcionam do navegador igual funcionam do servidor. Se
 * estão no bundle, estão na mão de quem abrir o "ver código-fonte". O
 * `verificar.js segredo` olha o que está versionado no git; este olha o que
 * está publicado, que é outra pergunta: uma chave pode nunca ter ido pro git e
 * mesmo assim estar no ar, porque o bundler embutiu a variável do .env.
 *
 * Uso:
 *   node scripts/vazamento.js <pasta-do-sistema | pasta-do-build> [--url https://app.com]
 *
 * Opções:
 *   --url <https://...>     baixa a página e os scripts dela e varre também
 *   --saida <arquivo.json>  grava os achados pra outro script (ou o laudo) ler
 *   --tudo                  varre o código-fonte inteiro, não só as pastas de build e o front
 *   --json                  só o JSON no terminal
 *
 * Não precisa de chave nenhuma. Node 18+ (fetch nativo), sem npm.
 */

const fs = require("fs");
const path = require("path");

// ─────────────────────────── o que é chave ───────────────────────────
// Cada forma abaixo é um prefixo que o próprio fornecedor publica. `nivel`:
// CRÍTICO é chave que dá poder de servidor; AVISO é chave feita pra ficar
// pública, mas que merece conferência (restrição de domínio, por exemplo).

const FORMAS = [
  { nome: "chave secreta do Supabase (sb_secret_)", re: /\bsb_secret_[A-Za-z0-9_-]{20,}/g, nivel: "CRÍTICO" },
  { nome: "chave pública do Supabase (sb_publishable_)", re: /\bsb_publishable_[A-Za-z0-9_-]{20,}/g, nivel: "OK" },
  { nome: "chave da OpenAI (sk-)", re: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/g, nivel: "CRÍTICO" },
  { nome: "chave da Anthropic (sk-ant-)", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, nivel: "CRÍTICO" },
  { nome: "chave secreta do Stripe (sk_live_/sk_test_)", re: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g, nivel: "CRÍTICO" },
  { nome: "chave restrita do Stripe (rk_live_)", re: /\brk_(?:live|test)_[A-Za-z0-9]{16,}/g, nivel: "CRÍTICO" },
  { nome: "segredo de webhook do Stripe (whsec_)", re: /\bwhsec_[A-Za-z0-9]{16,}/g, nivel: "CRÍTICO" },
  { nome: "chave pública do Stripe (pk_live_)", re: /\bpk_(?:live|test)_[A-Za-z0-9]{16,}/g, nivel: "OK" },
  { nome: "chave de acesso da AWS (AKIA)", re: /\bAKIA[0-9A-Z]{16}\b/g, nivel: "CRÍTICO" },
  { nome: "token do GitHub (ghp_/github_pat_)", re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{40,})/g, nivel: "CRÍTICO" },
  { nome: "token do Slack (xox)", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, nivel: "CRÍTICO" },
  { nome: "chave do SendGrid (SG.)", re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g, nivel: "CRÍTICO" },
  { nome: "chave do Resend (re_)", re: /\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{20,}/g, nivel: "CRÍTICO" },
  { nome: "chave do Brevo (xkeysib-)", re: /\bxkeysib-[a-f0-9]{64}-[A-Za-z0-9]{10,}/g, nivel: "CRÍTICO" },
  { nome: "chave do Asaas ($aact_)", re: /\$aact_(?:prod_|hmlg_)?[A-Za-z0-9=:_-]{30,}/g, nivel: "CRÍTICO" },
  { nome: "access token do Mercado Pago (APP_USR-…)", re: /\b(?:APP_USR|TEST)-\d{6,}-\d{6}-[0-9a-f]{32}-\d{6,}\b/g, nivel: "CRÍTICO" },
  { nome: "chave privada em texto puro", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g, nivel: "CRÍTICO" },
  { nome: "string de conexão com senha", re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:/@"'`]+:[^\s:/@"'`]+@[^\s"'`]+/g, nivel: "CRÍTICO" },
  { nome: "chave do Google (AIza)", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, nivel: "AVISO", dica: "é feita pra ficar no front (Maps, Firebase), mas só com restrição por domínio no console do Google; sem restrição, qualquer um gasta a sua cota" },
];

const RE_JWT = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

// Variável de ambiente que o bundler embute no front por causa do prefixo.
const RE_PREFIXO_PUBLICO = /\b((?:VITE_|NEXT_PUBLIC_|REACT_APP_|EXPO_PUBLIC_|NUXT_PUBLIC_|PUBLIC_|GATSBY_|VUE_APP_)[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|SENHA)[A-Z0-9_]*)\b/g;

/** Decodifica o payload de um JWT sem validar assinatura (não precisa: só queremos o `role`). */
function decodificarJwt(token) {
  try {
    const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(p, "base64").toString("utf8"));
  } catch { return null; }
}

/** Corta o valor na saída: terminal vira log, e log com chave inteira é o vazamento seguinte. */
const trecho = (s) => (s.length <= 10 ? s : s.slice(0, 8) + "…" + s.slice(-3));

const linhaDe = (txt, pos) => txt.slice(0, pos).split("\n").length;

/** Varre um texto e devolve os achados, cada um com linha e o começo da chave. */
function varrerTexto(txt, origem) {
  const achados = [];
  const vistos = new Set();
  const add = (a) => { const k = a.tipo + a.valor; if (vistos.has(k)) return; vistos.add(k); achados.push(a); };

  for (const f of FORMAS) {
    f.re.lastIndex = 0;
    let m;
    while ((m = f.re.exec(txt))) {
      if (/\.\.\.|…/.test(m[0]) || /xxx|exemplo|example|your[_-]?key|sua[_-]?chave/i.test(m[0])) continue;
      add({ origem, linha: linhaDe(txt, m.index), tipo: f.nome, nivel: f.nivel, valor: m[0], amostra: trecho(m[0]), dica: f.dica || null });
    }
  }
  RE_JWT.lastIndex = 0;
  let m;
  while ((m = RE_JWT.exec(txt))) {
    const p = decodificarJwt(m[0]);
    if (!p) continue;
    const linha = linhaDe(txt, m.index);
    if (p.role === "service_role") add({ origem, linha, tipo: "chave service_role do Supabase (JWT)", nivel: "CRÍTICO", valor: m[0], amostra: trecho(m[0]), ref: p.ref || null,
      dica: "ignora toda política de RLS; quem tem essa chave lê e apaga o banco inteiro. Trocar no painel (Settings → API) e tirar do front" });
    else if (p.role === "anon") add({ origem, linha, tipo: "chave anon do Supabase (JWT)", nivel: "OK", valor: m[0], amostra: trecho(m[0]), ref: p.ref || null });
    else if (p.iss === "supabase" || p.ref) add({ origem, linha, tipo: `JWT do Supabase com role=${p.role || "?"}`, nivel: "AVISO", valor: m[0], amostra: trecho(m[0]), ref: p.ref || null });
    else if (p.exp && p.exp * 1000 > Date.now() && (p.sub || p.email)) add({ origem, linha, tipo: "JWT de sessão de alguém, ainda válido", nivel: "ALTO", valor: m[0], amostra: trecho(m[0]),
      dica: "token de login gravado no código; quem pegar entra como essa pessoa até expirar" });
  }
  RE_PREFIXO_PUBLICO.lastIndex = 0;
  while ((m = RE_PREFIXO_PUBLICO.exec(txt))) {
    add({ origem, linha: linhaDe(txt, m.index), tipo: "variável secreta com prefixo público", nivel: "ALTO", valor: m[1], amostra: m[1],
      dica: "o prefixo manda o bundler embutir o valor no JavaScript do navegador; segredo não pode ter esse prefixo" });
  }
  // URL do Supabase, pra alimentar o teste ao vivo
  const urls = new Set();
  const reUrl = /https:\/\/([a-z0-9]{15,25})\.supabase\.(?:co|in)\b/g;
  while ((m = reUrl.exec(txt))) urls.add(m[0]);
  return { achados, urls: [...urls] };
}

// ─────────────────────────── pastas ───────────────────────────

const PASTAS_DE_BUILD = ["dist", "build", "out", ".next", ".nuxt", ".output", ".svelte-kit/output", ".vercel/output", "public", "www", "storybook-static"];
const PASTAS_DE_FRONT = ["src", "app", "pages", "components", "lib", "utils", "hooks", "store", "assets", "js"];
const EXT_TEXTO = /\.(m?js|cjs|jsx|ts|tsx|mts|html?|json|map|txt|vue|svelte|astro|css|env(?:\..+)?|ya?ml|toml)$/i;
const IGNORAR = new Set(["node_modules", ".git", "cache", ".cache", "coverage", ".turbo"]);
const TAMANHO_MAX = 12 * 1024 * 1024;

/** Lista arquivos de texto de uma pasta, sem node_modules e sem cache. */
function listar(pasta, prof = 0, out = []) {
  if (prof > 8 || !fs.existsSync(pasta)) return out;
  for (const f of fs.readdirSync(pasta).sort()) {
    if (IGNORAR.has(f)) continue;
    const full = path.join(pasta, f);
    let st; try { st = fs.statSync(full); } catch { continue; }
    if (st.isDirectory()) listar(full, prof + 1, out);
    else if ((EXT_TEXTO.test(f) || /^\.env/.test(f)) && st.size <= TAMANHO_MAX) out.push(full);
  }
  return out;
}

/** Varre uma pasta de sistema: pastas de build primeiro, depois o front, depois o resto se --tudo. */
function varrerPasta(raiz, opcoes = {}) {
  const abs = path.resolve(raiz);
  const builds = PASTAS_DE_BUILD.map((p) => path.join(abs, p)).filter((p) => fs.existsSync(p));
  let arquivos;
  let escopo;
  if (opcoes.tudo) { arquivos = listar(abs); escopo = "pasta inteira"; }
  else if (builds.length && !PASTAS_DE_BUILD.some((p) => path.basename(abs) === p)) {
    arquivos = builds.flatMap((b) => listar(b));
    for (const p of PASTAS_DE_FRONT) arquivos.push(...listar(path.join(abs, p)));
    for (const f of fs.readdirSync(abs)) if (/^\.env/.test(f) || /^(index\.html|vite\.config|next\.config|app\.json)/.test(f)) arquivos.push(path.join(abs, f));
    escopo = `build (${builds.map((b) => path.relative(abs, b)).join(", ")}) + front`;
  } else { arquivos = listar(abs); escopo = "pasta inteira (nenhuma pasta de build reconhecida)"; }
  arquivos = [...new Set(arquivos)];

  const achados = [];
  const urls = new Set();
  const mapas = [];
  let lidos = 0;
  for (const arq of arquivos) {
    const buf = fs.readFileSync(arq);
    if (buf.subarray(0, 8000).includes(0)) continue;
    lidos++;
    const rel = path.relative(abs, arq) || path.basename(arq);
    const txt = buf.toString("utf8");
    const ehEnvExemplo = /\.env\.(example|sample|template|modelo|dist)$/i.test(rel);
    const r = varrerTexto(txt, rel);
    if (/\.map$/i.test(rel)) {
      // O .map carrega o código original inteiro em `sourcesContent`. Varrer cada fonte
      // separada dá o nome do arquivo e a linha de verdade, e não o JSON numa linha só.
      let mapa = null; try { mapa = JSON.parse(txt); } catch {}
      const fontes = mapa && Array.isArray(mapa.sourcesContent) ? mapa.sourcesContent.filter((x) => typeof x === "string") : [];
      if (fontes.length) {
        r.achados.length = 0;
        mapa.sourcesContent.forEach((src, i) => {
          if (typeof src !== "string") return;
          const rr = varrerTexto(src, `${rel} → ${(mapa.sources && mapa.sources[i]) || i}`);
          r.achados.push(...rr.achados);
          rr.urls.forEach((u) => r.urls.push(u));
        });
      }
    }
    for (const a of r.achados) {
      if (ehEnvExemplo && a.nivel !== "OK") { a.nivel = "AVISO"; a.dica = "está no .env de exemplo: se é valor de verdade, é vazamento; se é placeholder, troque por algo que não pareça chave"; }
      if (/^\.env(?!\.example|\.sample)/.test(rel) && a.nivel === "CRÍTICO" && !builds.length) { a.nivel = "AVISO"; a.dica = "está no .env local, que não vai pro navegador; o problema é só se uma variável com prefixo público apontar pra ele"; }
      achados.push(a);
    }
    r.urls.forEach((u) => urls.add(u));
    if (/\.map$/i.test(rel)) mapas.push(rel);
    else if (/\/\/[#@]\s*sourceMappingURL=/.test(txt) && /\.(m?js|cjs)$/i.test(rel)) mapas.push(rel + " (aponta pra um .map)");
  }
  return { raiz: abs, escopo, lidos, achados, urls: [...urls], mapas };
}

// ─────────────────────────── ao vivo ───────────────────────────

/** Baixa a página, cada script que ela carrega e o source map de cada um. */
async function varrerUrl(url) {
  if (typeof fetch !== "function") throw new Error("este teste precisa de Node 18 ou mais novo (fetch nativo)");
  const achados = [], urls = new Set(), mapasPublicos = [], baixados = [];
  const base = new URL(url);
  const pegar = async (u) => {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "contexos-vazamento/1 (auditoria do proprio dono)" }, redirect: "follow" });
      if (!r.ok) return null;
      return await r.text();
    } catch { return null; }
  };
  const html = await pegar(url);
  if (html === null) throw new Error(`não consegui baixar ${url}`);
  baixados.push(url);
  const registrar = (txt, origem) => {
    const r = varrerTexto(txt, origem);
    achados.push(...r.achados);
    r.urls.forEach((x) => urls.add(x));
  };
  registrar(html, url);

  const scripts = new Set();
  let m;
  const reSrc = /<script[^>]+src=["']([^"']+)["']/gi;
  while ((m = reSrc.exec(html))) scripts.add(new URL(m[1], base).href);
  const reLink = /<link[^>]+rel=["'](?:modulepreload|preload)["'][^>]+href=["']([^"']+\.m?js[^"']*)["']/gi;
  while ((m = reLink.exec(html))) scripts.add(new URL(m[1], base).href);
  // Next.js e Vite: scripts inline que listam mais chunks
  const reChunk = /["'](\/(?:_next\/static|assets|static)\/[^"'\s]+\.js)["']/g;
  while ((m = reChunk.exec(html))) scripts.add(new URL(m[1], base).href);

  for (const s of scripts) {
    if (new URL(s).host !== base.host && !/\.(supabase|vercel|netlify)\./.test(new URL(s).host)) {
      // script de terceiro (CDN, analytics): não é o bundle do app
      continue;
    }
    const js = await pegar(s);
    if (js === null) continue;
    baixados.push(s);
    registrar(js, s);
    // source map: pelo comentário ou por convenção (arquivo.js.map)
    const mm = js.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
    const candidatos = new Set([s + ".map"]);
    if (mm && !/^data:/.test(mm[1])) candidatos.add(new URL(mm[1], s).href);
    for (const c of candidatos) {
      const mapa = await pegar(c);
      if (mapa === null) continue;
      let json = null; try { json = JSON.parse(mapa); } catch {}
      if (!json || !Array.isArray(json.sources)) continue;
      mapasPublicos.push({ url: c, fontes: json.sources.length });
      if (Array.isArray(json.sourcesContent)) json.sourcesContent.forEach((src, i) => { if (typeof src === "string") registrar(src, `${c} → ${json.sources[i] || i}`); });
    }
  }
  return { url, baixados, achados, urls: [...urls], mapasPublicos };
}

// ─────────────────────────── saída ───────────────────────────

const NIVEIS = { CRÍTICO: 0, ALTO: 1, AVISO: 2, OK: 3 };
const COR = process.stdout.isTTY ? { v: "\x1b[31m", a: "\x1b[33m", ok: "\x1b[32m", z: "\x1b[0m", d: "\x1b[2m" } : { v: "", a: "", ok: "", z: "", d: "" };

function imprimir(titulo, r) {
  console.log(`\n${titulo}`);
  if (r.escopo) console.log(`${COR.d}${r.raiz} · ${r.escopo} · ${r.lidos} arquivo(s) lido(s)${COR.z}`);
  if (r.baixados) console.log(`${COR.d}${r.baixados.length} arquivo(s) baixado(s): página + ${r.baixados.length - 1} script(s)${COR.z}`);
  const ordenados = [...r.achados].sort((a, b) => NIVEIS[a.nivel] - NIVEIS[b.nivel]);
  const resumo = { CRÍTICO: 0, ALTO: 0, AVISO: 0, OK: 0 };
  ordenados.forEach((a) => resumo[a.nivel]++);
  console.log(`${COR.v}${resumo.CRÍTICO} crítico${COR.z} · ${COR.a}${resumo.ALTO} alto${COR.z} · ${resumo.AVISO} aviso · ${resumo.OK} chave pública (esperada)`);
  for (const a of ordenados) {
    if (a.nivel === "OK") continue;
    const cor = a.nivel === "CRÍTICO" ? COR.v : a.nivel === "ALTO" ? COR.a : COR.d;
    console.log(`${cor}[${a.nivel}]${COR.z} ${a.tipo} — "${a.amostra}"${a.ref ? ` (projeto ${a.ref})` : ""}`);
    console.log(`   ${COR.d}${a.origem}:${a.linha}${COR.z}`);
    if (a.dica) console.log(`   ${a.dica}`);
  }
  const ok = ordenados.filter((a) => a.nivel === "OK");
  if (ok.length) console.log(`${COR.d}chaves públicas encontradas (é o esperado no front): ${[...new Set(ok.map((a) => a.tipo))].join("; ")}${COR.z}`);
  if (r.mapas && r.mapas.length) console.log(`${COR.a}source map na pasta de build (${r.mapas.length}): ${r.mapas.slice(0, 5).join(", ")}${r.mapas.length > 5 ? "…" : ""}${COR.z}\n   se essa pasta vai pro ar, o código-fonte inteiro vai junto; desligue \`sourcemap\` no build de produção ou não publique os .map`);
  if (r.mapasPublicos && r.mapasPublicos.length) console.log(`${COR.a}source map PÚBLICO no ar (${r.mapasPublicos.length}): ${r.mapasPublicos.map((x) => `${x.url} (${x.fontes} fontes)`).slice(0, 5).join(", ")}${COR.z}\n   qualquer pessoa lê o código original; o conteúdo dele foi varrido acima`);
  if (r.urls.length) console.log(`${COR.d}URL do Supabase no código: ${r.urls.join(", ")} (serve pro teste ao vivo do auditar-rls.js)${COR.z}`);
  if (resumo.CRÍTICO || resumo.ALTO) console.log(`${COR.d}nenhuma linha acima é palpite: cada uma tem arquivo e linha${COR.z}`);
  else if (resumo.AVISO) console.log(`${COR.ok}✔ nenhuma chave secreta no que vai pro navegador${COR.z} — os ${resumo.AVISO} aviso(s) acima são de arquivo que fica no seu computador ou de chave que só pede restrição`);
  else console.log(`${COR.ok}✔ nenhuma chave secreta no que foi lido${COR.z}`);
}

function lerArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) { const k = a.slice(2); if (["tudo", "json", "ajuda"].includes(k)) o[k] = true; else o[k] = argv[++i]; }
    else o._.push(a);
  }
  return o;
}

async function main() {
  const o = lerArgs(process.argv.slice(2));
  if (o.ajuda || (!o._.length && !o.url)) {
    console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(2, 25).map((l) => l.replace(/^ \*\/?\s?/, "")).join("\n"));
    process.exit(o.ajuda ? 0 : 1);
  }
  const saida = { geradoEm: new Date().toISOString(), pasta: null, aoVivo: null };
  if (o._.length) {
    const alvo = path.resolve(o._[0]);
    if (!fs.existsSync(alvo)) { console.error(`\n✖ não achei ${alvo}\n`); process.exit(1); }
    if (!fs.statSync(alvo).isDirectory()) { console.error(`\n✖ ${alvo} não é pasta; passe a pasta do sistema ou a do build\n`); process.exit(1); }
    saida.pasta = varrerPasta(alvo, { tudo: !!o.tudo });
    if (!saida.pasta.lidos) { console.error(`\n✖ nenhum arquivo de texto legível em ${alvo}\n`); process.exit(1); }
    if (!o.json) imprimir("VAZAMENTO NA PASTA", saida.pasta);
  }
  if (o.url) {
    if (!/^https?:\/\//.test(o.url)) { console.error("\n✖ --url precisa começar com http:// ou https://\n"); process.exit(1); }
    saida.aoVivo = await varrerUrl(o.url);
    if (!o.json) imprimir("VAZAMENTO NO AR", saida.aoVivo);
  }
  // no JSON, a chave inteira fica: é o dono lendo o próprio laudo, e ele precisa saber qual chave trocar
  if (o.saida) {
    fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
    fs.writeFileSync(o.saida, JSON.stringify(saida, null, 2));
    if (!o.json) console.log(`\n${COR.ok}✔${COR.z} achados em ${o.saida}`);
  }
  if (o.json) console.log(JSON.stringify(saida, null, 2));
  const todos = [...(saida.pasta ? saida.pasta.achados : []), ...(saida.aoVivo ? saida.aoVivo.achados : [])];
  process.exit(todos.some((a) => a.nivel === "CRÍTICO") ? 2 : 0);
}

module.exports = { FORMAS, varrerTexto, varrerPasta, varrerUrl, decodificarJwt, listar };

if (require.main === module) main().catch((e) => { console.error(`\n✖ ${e.message}\n`); process.exit(1); });
