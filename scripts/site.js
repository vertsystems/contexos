#!/usr/bin/env node
/**
 * Contex OS — site.js
 * Confere um site de várias páginas e gera o sitemap.xml e o robots.txt.
 *
 * Existe porque `verificar.js html` e `verificar.js alvo` foram feitos pra peça
 * que viaja sozinha (landing, proposta, deck): eles reprovam CSS externo e só
 * leem o <style> da própria página. Num site de cinco páginas o CSS
 * compartilhado é a regra, não o erro. Este script junta o css/site.css a cada
 * página numa cópia temporária, roda os dois verificadores em cima dela, e
 * acrescenta o que só faz sentido em conjunto: title e description repetidos,
 * menu diferente entre páginas, link interno pra arquivo que não existe,
 * sitemap que esqueceu uma página, formulário sem página de privacidade.
 *
 * Uso:
 *   node scripts/site.js conferir <pasta> [--dominio https://exemplo.com.br]
 *   node scripts/site.js sitemap  <pasta> --dominio https://exemplo.com.br [--limpo] [--corrigir]
 *
 * Opções de `conferir`:
 *   --dominio <url>   confere se o canonical, o og:url e o sitemap apontam pra ele
 *                     (aceita subpasta: https://usuario.github.io/projeto)
 *
 * Opções de `sitemap`:
 *   --limpo      URL sem ".html" (/sobre em vez de /sobre.html). Só se a hospedagem
 *                serve assim; Netlify e Cloudflare Pages fazem por padrão
 *   --corrigir   reescreve o canonical e o og:url de cada página com a URL final
 *
 * Só olha os .html da raiz da pasta. Subpasta (site/promo/ de uma landing) é outra
 * peça e tem verificação própria.
 *
 * Sai com código 1 se achar problema. Node 18+, sem dependência.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

let problemas = 0;
const erro = (m) => { console.log(`  ✖ ${m}`); problemas++; };
const ok = (m) => console.log(`  ✓ ${m}`);
const info = (m) => console.log(`  · ${m}`);

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

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

// ─────────────────────────── leitura do HTML ───────────────────────────

function atributos(bruto) {
  const attrs = {};
  for (const m of bruto.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[m[1].toLowerCase()] = m[2] ?? m[3];
  for (const m of bruto.matchAll(/(?:^|\s)([\w-]+)(?=\s|\/?$)/g)) if (!(m[1].toLowerCase() in attrs)) attrs[m[1].toLowerCase()] = "";
  return attrs;
}

function meta(html, nome) {
  for (const m of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const a = atributos(m[1]);
    if ((a.name || a.property || "").toLowerCase() === nome) return a.content ?? "";
  }
  return null;
}

function linkRel(html, rel) {
  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const a = atributos(m[1]);
    if ((a.rel || "").toLowerCase().split(/\s+/).includes(rel)) return a;
  }
  return null;
}

function texto(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function paginasDe(pasta) {
  return fs.readdirSync(pasta)
    .filter((f) => /\.html?$/i.test(f) && fs.statSync(path.join(pasta, f)).isFile())
    .sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
}

function urlDe(dominio, nome, limpo) {
  const base = dominio.replace(/\/+$/, "");
  if (/^index\.html?$/i.test(nome)) return `${base}/`;
  return limpo ? `${base}/${nome.replace(/\.html?$/i, "")}` : `${base}/${nome}`;
}

// ─────────────────────────── contraste (mesma conta do verificar.js) ───────────────────────────

function lum(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function razao(a, b) {
  const la = lum(a), lb = lum(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Resolve var(--x) contra o :root do CSS, até 6 níveis. Devolve hex ou null. */
function resolveCor(valor, tokens, nivel = 0) {
  if (!valor || nivel > 6) return null;
  const v = valor.trim().replace(/\s*!important/, "");
  const hex = v.match(/^#[0-9a-f]{3,6}$/i);
  if (hex) return hex[0];
  const m = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/i);
  if (m) {
    if (tokens[m[1]] !== undefined) return resolveCor(tokens[m[1]], tokens, nivel + 1);
    return m[2] ? resolveCor(m[2], tokens, nivel + 1) : null;
  }
  return null;
}

function regrasCSS(css) {
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const regras = [];
  for (const r of limpo.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const sel of r[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      if (sel.startsWith("@")) continue;
      regras.push({ sel, decls: r[2] });
    }
  }
  return regras;
}

function declaracao(decls, prop) {
  const re = new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;}]+)`, "gi");
  let ultimo = null;
  for (const m of decls.matchAll(re)) ultimo = m[1].trim();
  return ultimo;
}

function verContrasteCSS(css) {
  const tokens = {};
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) if (!(m[1] in tokens)) tokens[m[1]] = m[2].trim();
  const regras = regrasCSS(css);
  const pares = [];
  for (const r of regras) {
    const cor = declaracao(r.decls, "color");
    const fundo = declaracao(r.decls, "background-color") || declaracao(r.decls, "background");
    if (!cor || !fundo) continue;
    if (!/^(body|html|\.btn|\.botao|\.button|button|a\.btn|\.cta|\.hero|\.rodape|footer|\.header|header|\.nav|nav|\.card|\.faixa|\.destaque)/i.test(r.sel)) continue;
    const c = resolveCor(cor, tokens), f = resolveCor(fundo, tokens);
    if (!c || !f) continue;
    pares.push({ sel: r.sel, c, f, r: razao(c, f) });
  }
  if (!pares.length) return info("contraste: nenhum par cor/fundo resolvível no CSS (use verificar.js contraste com os hex da marca)");
  let ruins = 0;
  for (const p of pares) {
    if (p.r === null) continue;
    const grande = /h1|h2|display|hero/i.test(p.sel);
    const minimo = grande ? 3 : 4.5;
    if (p.r < minimo) { erro(`contraste ${p.r.toFixed(2)}:1 em \`${p.sel}\` (${p.c} sobre ${p.f}) — mínimo ${minimo}:1`); ruins++; }
  }
  if (!ruins) ok(`contraste: ${pares.length} par(es) cor/fundo do site.css acima do mínimo (${pares.map((p) => `${p.sel} ${p.r.toFixed(1)}`).join(", ")})`);
}

// ─────────────────────────── conferir ───────────────────────────

function rodarVerificar(raizScripts, cmd, arquivo) {
  const r = spawnSync(process.execPath, [path.join(raizScripts, "verificar.js"), cmd, arquivo], { encoding: "utf8" });
  const saida = (r.stdout || "") + (r.stderr || "");
  const linhas = saida.split("\n").filter((l) => /^\s*[✖✓·]/.test(l));
  return { linhas, falhou: r.status !== 0 };
}

function conferir(pasta, opts) {
  if (!pasta || !fs.existsSync(pasta)) morrer(`pasta não encontrada: ${pasta || "(vazio)"}`, "uso: node scripts/site.js conferir site/");
  if (opts.dominio === true) morrer("--dominio veio sem a URL", "ex: --dominio https://www.exemplo.com.br");
  if (opts.dominio) opts.dominio = opts.dominio.replace(/\/+$/, "");
  pasta = path.resolve(pasta);
  const raizScripts = __dirname;
  const paginas = paginasDe(pasta);
  if (!paginas.length) morrer(`nenhum .html na raiz de ${pasta}`);

  console.log(`\nSITE: ${pasta}`);
  console.log(`  ${paginas.length} página(s): ${paginas.join(", ")}`);

  // ── CSS compartilhado ──
  const cssPath = path.join(pasta, "css", "site.css");
  const temCSS = fs.existsSync(cssPath);
  const css = temCSS ? fs.readFileSync(cssPath, "utf8") : "";
  console.log("\nCSS compartilhado");
  if (!temCSS) erro("css/site.css não existe — cada página com CSS próprio vira cinco versões da marca em um mês");
  else {
    ok(`css/site.css (${css.split("\n").length} linhas)`);
    if (!/:root\s*\{/.test(css)) erro("site.css sem bloco :root — os tokens da marca precisam estar declarados nele");
    if (!/@media[^{]*max-width[^{]*\{[\s\S]*?(min-height|min-block-size)\s*:\s*(4[4-9]|[5-9]\d)px/i.test(css) &&
        !/@media[^{]*(pointer:\s*coarse|hover:\s*none)[^{]*\{[\s\S]*?(min-height|min-block-size)\s*:\s*(4[4-9]|[5-9]\d)px/i.test(css))
      erro("site.css não sobe o alvo clicável pra 44px no toque (@media (pointer: coarse) ou max-width com min-height: 44px)");
    if (!/prefers-reduced-motion/i.test(css) && /transition|animation/i.test(css))
      erro("site.css tem transição ou animação e não respeita prefers-reduced-motion");
    if (!/:focus-visible/i.test(css)) erro("site.css sem :focus-visible — quem navega por teclado não vê onde está");
    verContrasteCSS(css);
  }

  // ── por página ──
  const titulos = new Map(), descricoes = new Map(), menus = new Map();
  let temForm = false, temWa = false, temPrivacidade = paginas.some((p) => /^privacidade\.html?$/i.test(p));
  const rastreadores = new Set();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "contexos-site-"));

  for (const nome of paginas) {
    const arq = path.join(pasta, nome);
    const html = fs.readFileSync(arq, "utf8");
    console.log(`\n${nome}`);

    if (!/<html[^>]*\blang\s*=\s*["']pt-BR["']/i.test(html)) erro('<html> sem lang="pt-BR"');
    if (!meta(html, "viewport")) erro("sem <meta name=\"viewport\">");

    const h1s = [...html.matchAll(/<h1\b/gi)].length;
    if (h1s !== 1) erro(`${h1s} <h1> (precisa ser exatamente um)`);

    const t = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    const titulo = t ? t.replace(/\s+/g, " ").trim() : null;
    if (!titulo) erro("sem <title>");
    else {
      if (titulos.has(titulo)) erro(`<title> repetido de ${titulos.get(titulo)}: "${titulo}"`);
      else titulos.set(titulo, nome);
      if (titulo.length < 30 || titulo.length > 70) erro(`<title> com ${titulo.length} caracteres (o Google corta acima de 60; abaixo de 30 desperdiça a busca)`);
      else if (titulo.length > 60) info(`<title> com ${titulo.length} caracteres — a régua é 50 a 60`);
    }

    const d = meta(html, "description");
    if (!d) erro("sem <meta name=\"description\">");
    else {
      if (descricoes.has(d)) erro(`description repetida de ${descricoes.get(d)}`);
      else descricoes.set(d, nome);
      if (d.length < 70 || d.length > 170) erro(`description com ${d.length} caracteres (régua: 120 a 155)`);
      else if (d.length < 120 || d.length > 155) info(`description com ${d.length} caracteres — a régua é 120 a 155`);
    }

    const canon = linkRel(html, "canonical");
    if (!canon || !canon.href) erro("sem <link rel=\"canonical\">");
    else if (opts.dominio) {
      const esperado = [...new Set([urlDe(opts.dominio, nome, false), urlDe(opts.dominio, nome, true)])];
      if (!esperado.includes(canon.href)) erro(`canonical "${canon.href}" não bate com o domínio (esperado ${esperado.join(" ou ")})`);
    }

    const ogFalta = ["og:title", "og:description", "og:image", "og:url"].filter((p) => !meta(html, p));
    if (ogFalta.length) erro(`Open Graph incompleto: falta ${ogFalta.join(", ")}`);
    else if (opts.dominio && !meta(html, "og:url").startsWith(opts.dominio)) erro(`og:url "${meta(html, "og:url")}" fora do domínio`);

    // JSON-LD
    const lds = [...html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    if (!lds.length) erro("sem dados estruturados (JSON-LD)");
    else {
      const tipos = [];
      for (const m of lds) {
        try {
          const j = JSON.parse(m[1]);
          const lista = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
          for (const item of lista) {
            const tipo = item["@type"];
            tipos.push(Array.isArray(tipo) ? tipo.join("/") : tipo);
            const local = /LocalBusiness|Dentist|Restaurant|HairSalon|AutoRepair|Store|MedicalClinic|LegalService|Bakery|Cafe|Hotel|Gym|Pharmacy|BeautySalon/i.test(String(tipo));
            if (local) {
              if (!item.address) erro(`schema ${tipo} sem address`);
              if (!item.telephone) erro(`schema ${tipo} sem telephone`);
              if (!item.openingHoursSpecification && !item.openingHours) erro(`schema ${tipo} sem horário (openingHoursSpecification)`);
            }
            if (String(tipo) === "FAQPage") {
              const perguntas = (item.mainEntity || []).map((q) => q.name).filter(Boolean);
              const corpo = texto(html);
              const escondidas = perguntas.filter((p) => !corpo.includes(p.trim()));
              if (escondidas.length) erro(`FAQPage com ${escondidas.length} pergunta(s) que não aparecem no texto da página`);
            }
          }
        } catch (e) { erro(`JSON-LD inválido: ${e.message.slice(0, 60)}`); }
      }
      if (tipos.length) ok(`schema: ${tipos.join(", ")}`);
    }

    // navegação e rodapé
    const nav = (html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i) || [])[1];
    if (!nav) erro("sem <nav>");
    else {
      const links = [...nav.matchAll(/<a\b([^>]*)>/gi)].map((m) => atributos(m[1]));
      const chave = links.map((a) => a.href).join(" | ");
      menus.set(nome, chave);
      const atual = links.find((a) => (a["aria-current"] || "").toLowerCase() === "page");
      const apontaPraMim = links.some((a) => a.href && (a.href === nome || (nome === "index.html" && /^(\.\/|\/|index\.html)$/.test(a.href))));
      if (apontaPraMim && !atual) erro('página atual sem aria-current="page" no menu');
      if (links.length > 7) erro(`menu com ${links.length} links — acima de sete vira lista, não menu`);
    }
    if (!/<footer\b/i.test(html)) erro("sem <footer>");
    if (!/<main\b/i.test(html)) erro("sem <main> — leitor de tela e SEO usam pra achar o conteúdo");

    // CSS da página
    const linksCSS = [...html.matchAll(/<link\b([^>]*)>/gi)].map((m) => atributos(m[1]))
      .filter((a) => (a.rel || "").toLowerCase().includes("stylesheet")).map((a) => a.href || "");
    const usaCompartilhado = linksCSS.some((h) => /(^|\/)css\/site\.css$/.test(h));
    if (!usaCompartilhado) erro("não carrega css/site.css");
    const estilosInline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
    const linhasInline = estilosInline.reduce((n, m) => n + m[1].split("\n").length, 0);
    if (linhasInline > 40) erro(`${linhasInline} linhas de CSS dentro da página — o lugar é css/site.css`);

    // links internos
    const quebrados = new Set(), limpos = new Set();
    for (const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      const h = m[1].trim();
      if (/^(https?:|mailto:|tel:|#|data:|javascript:|\/\/|sms:|whatsapp:)/i.test(h)) continue;
      const limpo = h.split(/[?#]/)[0];
      if (!limpo) continue;
      const alvo = limpo.startsWith("/") ? path.join(pasta, limpo) : path.resolve(pasta, limpo);
      if (fs.existsSync(alvo)) continue;
      if (!/\.[a-z0-9]+$/i.test(limpo) && fs.existsSync(`${alvo}.html`)) limpos.add(h);
      else quebrados.add(h);
    }
    if (quebrados.size) erro(`${quebrados.size} link/arquivo interno que não existe: ${[...quebrados].slice(0, 6).join(", ")}`);
    if (limpos.size) info(`${limpos.size} link sem .html (${[...limpos].slice(0, 4).join(", ")}) — só funciona na hospedagem que serve URL limpa; aberto do disco, quebra`);

    // imagens
    const imgs = [...html.matchAll(/<img\b([^>]*)>/gi)].map((m) => atributos(m[1]));
    const semAlt = imgs.filter((a) => a.alt === undefined).length;
    const semTamanho = imgs.filter((a) => !a.width || !a.height).length;
    if (semAlt) erro(`${semAlt} <img> sem alt`);
    if (semTamanho) erro(`${semTamanho} <img> sem width/height — a página pula ao carregar (CLS)`);
    if (imgs.length && (imgs[0].loading || "").toLowerCase() === "lazy") erro('a primeira imagem tem loading="lazy" — é a do topo, e o lazy atrasa o LCP');

    // formulário, WhatsApp e privacidade
    if (/<form\b/i.test(html)) {
      temForm = true;
      const form = atributos((html.match(/<form\b([^>]*)>/i) || [, ""])[1]);
      const temDestino = (form.action && form.action.trim() && form.action.trim() !== "#") || form.onsubmit || /data-(whatsapp|destino|wa)/i.test(html) || /addEventListener\(\s*["']submit/i.test(html);
      if (!temDestino) erro("formulário sem destino (action vazio e nenhum submit no JS) — o envio não vai pra lugar nenhum");
      if (!/privacidade\.html?/i.test(html)) erro("página com formulário sem link pra privacidade.html (LGPD art. 9º)");
      if (!/\brequired\b/i.test(html)) info("formulário sem campo required — confirmar se é de propósito");
    }
    if (/wa\.me\/\d{10,}/i.test(html)) temWa = true;
    for (const [re, nome] of [[/googletagmanager\.com|gtag\(/i, "Google Analytics/Tag Manager"], [/connect\.facebook\.net|fbq\(/i, "Pixel da Meta"], [/clarity\.ms/i, "Microsoft Clarity"], [/hotjar\.com/i, "Hotjar"]])
      if (re.test(html)) rastreadores.add(nome);
    if (/^contato\.html?$/i.test(nome) && !/wa\.me\/\d{10,}/i.test(html)) erro("página de contato sem link wa.me com número — é o canal que o cliente brasileiro usa");

    // verificar.js html e alvo, sobre a cópia com o CSS embutido
    let inlined = html;
    if (temCSS) inlined = html.replace(/<link\b[^>]*href\s*=\s*["'][^"']*css\/site\.css["'][^>]*>/i, `<style>\n${css}\n</style>`);
    const tmp = path.join(tmpDir, nome);
    fs.writeFileSync(tmp, inlined);
    for (const cmd of ["html", "alvo"]) {
      const r = rodarVerificar(raizScripts, cmd, tmp);
      for (const l of r.linhas) {
        if (/^\s*✖/.test(l)) { problemas++; console.log(`  ✖ [${cmd}] ${l.replace(/^\s*✖\s*/, "")}`); }
        else if (/^\s*·/.test(l) && !/link\(s\) inline em texto corrido/.test(l)) console.log(`  · [${cmd}] ${l.replace(/^\s*·\s*/, "")}`);
      }
      if (!r.linhas.some((l) => /^\s*✖/.test(l))) ok(`verificar.js ${cmd}: sem problema`);
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // ── conjunto ──
  console.log("\nConjunto");
  const chaves = [...new Set(menus.values())];
  if (chaves.length > 1) {
    const grupos = {};
    for (const [p, k] of menus) (grupos[k] = grupos[k] || []).push(p);
    erro(`menu diferente entre páginas: ${Object.values(grupos).map((g) => g.join("+")).join(" vs ")}`);
  } else if (chaves.length === 1) ok("o mesmo menu, na mesma ordem, em toda página");

  if (rastreadores.size) info(`rastreador encontrado: ${[...rastreadores].join(", ")} — precisa estar citado na privacidade.html`);
  if (temForm && !temPrivacidade) erro("há formulário e não existe privacidade.html — a LGPD exige quando o site coleta dado");
  else if (rastreadores.size && !temPrivacidade) erro(`há ${[...rastreadores].join(" e ")} e não existe privacidade.html — rastreador coleta dado pessoal, e a LGPD exige a página`);
  else if (!temPrivacidade) info("sem privacidade.html — obrigatória se entrar formulário, Analytics ou Pixel");
  if (!temWa) erro("nenhuma página tem link wa.me com número");

  const sitemapPath = path.join(pasta, "sitemap.xml");
  if (!fs.existsSync(sitemapPath)) erro("sitemap.xml não existe (node scripts/site.js sitemap <pasta> --dominio ...)");
  else {
    const sm = fs.readFileSync(sitemapPath, "utf8");
    const locs = [...sm.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    const nomesNoMapa = locs.map((u) => {
      const p = (opts.dominio && u.startsWith(opts.dominio) ? u.slice(opts.dominio.length) : u.replace(/^https?:\/\/[^/]+/, "")).replace(/^\//, "");
      return p === "" ? "index.html" : /\.html?$/i.test(p) ? p : `${p}.html`;
    });
    const indexaveis = paginas.filter((p) => !/^404\.html?$/i.test(p) && !/noindex/i.test(meta(fs.readFileSync(path.join(pasta, p), "utf8"), "robots") || ""));
    const faltam = indexaveis.filter((p) => !nomesNoMapa.includes(p));
    const sobram = nomesNoMapa.filter((p) => !fs.existsSync(path.join(pasta, p)));
    if (faltam.length) erro(`sitemap.xml não lista: ${faltam.join(", ")}`);
    if (sobram.length) erro(`sitemap.xml lista página que não existe: ${sobram.join(", ")}`);
    if (opts.dominio && locs.some((u) => !u.startsWith(opts.dominio))) erro("sitemap.xml com URL fora do domínio informado");
    if (!faltam.length && !sobram.length) ok(`sitemap.xml lista as ${locs.length} páginas indexáveis`);
  }
  const robotsPath = path.join(pasta, "robots.txt");
  if (!fs.existsSync(robotsPath)) erro("robots.txt não existe");
  else if (!/^Sitemap:\s*https?:\/\//im.test(fs.readFileSync(robotsPath, "utf8"))) erro("robots.txt sem a linha Sitemap: com a URL completa");
  else ok("robots.txt aponta pro sitemap");

  if (!paginas.some((p) => /^404\.html?$/i.test(p))) info("sem 404.html — Netlify, Cloudflare Pages e Vercel usam esse nome pra página de erro");

  console.log(problemas ? `\n${problemas} problema(s). Corrigir antes de publicar.\n` : "\nTudo certo. Pode publicar.\n");
  process.exit(problemas ? 1 : 0);
}

// ─────────────────────────── sitemap ───────────────────────────

function sitemap(pasta, opts) {
  if (!pasta || !fs.existsSync(pasta)) morrer(`pasta não encontrada: ${pasta || "(vazio)"}`, "uso: node scripts/site.js sitemap site/ --dominio https://exemplo.com.br");
  if (!opts.dominio || opts.dominio === true) morrer("faltou --dominio", "ex: --dominio https://www.exemplo.com.br (com https e sem barra no fim)");
  if (!/^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/i.test(opts.dominio.replace(/\/+$/, ""))) morrer(`domínio inválido: ${opts.dominio}`, "precisa ser o domínio com protocolo: https://exemplo.com.br (ou https://usuario.github.io/projeto, quando o site mora numa subpasta)");
  pasta = path.resolve(pasta);
  const dominio = opts.dominio.replace(/\/+$/, "");
  const paginas = paginasDe(pasta);
  const entradas = [];

  console.log(`\nSITEMAP: ${pasta} → ${dominio}`);
  for (const nome of paginas) {
    const arq = path.join(pasta, nome);
    let html = fs.readFileSync(arq, "utf8");
    const url = urlDe(dominio, nome, !!opts.limpo);
    const lastmod = fs.statSync(arq).mtime.toISOString().slice(0, 10);
    // 404 e noindex ficam fora do sitemap, mas o canonical e o og:url delas também são alinhados
    if (/^404\.html?$/i.test(nome)) info(`${nome}: página de erro, fora do sitemap`);
    else if (/noindex/i.test(meta(html, "robots") || "")) info(`${nome}: noindex, fora do sitemap`);
    else entradas.push({ url, lastmod, nome });

    if (opts.corrigir) {
      let mudou = false;
      const antes = html;
      html = html.replace(/(<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["'])[^"']*(["'])/i, `$1${url}$2`);
      html = html.replace(/(<link\b[^>]*href\s*=\s*["'])[^"']*(["'][^>]*rel\s*=\s*["']canonical["'])/i, `$1${url}$2`);
      html = html.replace(/(<meta\b[^>]*property\s*=\s*["']og:url["'][^>]*content\s*=\s*["'])[^"']*(["'])/i, `$1${url}$2`);
      html = html.replace(/(<meta\b[^>]*content\s*=\s*["'])[^"']*(["'][^>]*property\s*=\s*["']og:url["'])/i, `$1${url}$2`);
      mudou = html !== antes;
      if (mudou) { fs.writeFileSync(arq, html); ok(`${nome}: canonical e og:url → ${url}`); }
      else info(`${nome}: canonical e og:url já apontavam pra ${url}, ou não existem na página`);
    } else {
      const canon = linkRel(html, "canonical");
      if (canon && canon.href && canon.href !== url) erro(`${nome}: canonical é "${canon.href}", a URL do sitemap é "${url}" (rode com --corrigir pra alinhar)`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entradas.map((e) => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`).join("\n") +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(pasta, "sitemap.xml"), xml);
  ok(`sitemap.xml com ${entradas.length} URL(s): ${entradas.map((e) => e.nome).join(", ")}`);

  const robotsPath = path.join(pasta, "robots.txt");
  const linhaSitemap = `Sitemap: ${dominio}/sitemap.xml`;
  if (!fs.existsSync(robotsPath)) {
    fs.writeFileSync(robotsPath, `User-agent: *\nAllow: /\n\n${linhaSitemap}\n`);
    ok("robots.txt criado");
  } else {
    let r = fs.readFileSync(robotsPath, "utf8");
    if (/^Sitemap:/im.test(r)) r = r.replace(/^Sitemap:.*$/im, linhaSitemap);
    else r = r.trimEnd() + `\n\n${linhaSitemap}\n`;
    fs.writeFileSync(robotsPath, r);
    ok("robots.txt já existia; linha Sitemap: atualizada");
  }

  if (opts.limpo) info("URLs sem .html: confirme que a hospedagem serve /sobre (Netlify e Cloudflare Pages sim; na Vercel precisa de cleanUrls no vercel.json)");
  console.log(problemas ? `\n${problemas} aviso(s) sobre canonical.\n` : "\nPronto. Depois de publicar, envie o sitemap no Google Search Console.\n");
  process.exit(problemas ? 1 : 0);
}

// ─────────────────────────── main ───────────────────────────

const [cmd, ...resto] = process.argv.slice(2);
const opts = opcoes(resto);
const AJUDA = `Contex OS — site.js

  conferir <pasta> [--dominio <url>]                   confere as páginas, o CSS, o menu, o sitemap e roda
                                                       verificar.js html e alvo com o CSS embutido
  sitemap  <pasta> --dominio <url> [--limpo] [--corrigir]
                                                       gera sitemap.xml e robots.txt; --corrigir alinha o
                                                       canonical e o og:url de cada página`;

try {
  if (!cmd || cmd === "-h" || cmd === "--help") { console.log(AJUDA); process.exit(0); }
  if (cmd === "conferir") conferir(opts._[0], opts);
  else if (cmd === "sitemap") sitemap(opts._[0], opts);
  else { console.log(`Comando desconhecido: ${cmd}\n\n${AJUDA}`); process.exit(1); }
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  process.exit(1);
}
