#!/usr/bin/env node
/**
 * Contex OS — assinatura-email.js
 * Monta a assinatura de e-mail de cada pessoa (HTML em tabela com CSS inline,
 * mais a versão em texto puro) e confere se ela sobrevive ao Gmail, ao Outlook
 * clássico e ao Apple Mail.
 *
 * Existe porque assinatura quebra sempre pelos mesmos quatro motivos, e todos
 * são conta, não gosto. O logo entrou como base64 e o Gmail não mostra imagem
 * embutida (além de estourar o limite de 10.000 caracteres do editor de
 * assinatura só com o logo). A tabela foi declarada com 700 px e o Outlook
 * clássico, que renderiza com o motor do Word, ainda multiplica isso pela
 * escala do sistema: 700 px a 150% viram 1050 px e a assinatura empurra a
 * janela. O layout usou `display:flex`, que o Word ignora, e as três colunas
 * viraram uma pilha torta. E o link do site apontava pra uma página que mudou
 * de endereço no ano passado.
 *
 * Uso:
 *   node scripts/assinatura-email.js gerar <spec.json> [--csv <pessoas.csv>] [--saida <pasta>]
 *   node scripts/assinatura-email.js conferir <pasta|arquivo.html> [--sem-rede]
 *   node scripts/assinatura-email.js --exemplo [arquivo.json]
 *
 * Opções:
 *   --csv <arquivo>    lê a equipe de um CSV (colunas: nome, cargo, email,
 *                      telefone, whatsapp, site, instagram, linkedin, registro)
 *                      e ignora a lista "pessoas" do spec
 *   --saida <pasta>    onde gravar (padrão: identidade/assinatura-email)
 *   --sem-rede         não testa os links por HTTP (só a conferência estática)
 *   --espera <ms>      tempo máximo por link no teste de rede (padrão: 8000)
 *   --json             imprime o resultado em JSON, pra outra ferramenta ler
 *   --exemplo          escreve um spec de exemplo pra editar
 *   --forcar           sobrescreve o arquivo de exemplo que já existe
 *
 * Réguas conferidas pelo `conferir` (a fonte de cada uma está em
 * templates/design/assinatura-email.md):
 *   peso do HTML abaixo de 20 KB · até 10.000 caracteres (limite do editor de
 *   assinatura do Gmail) · largura declarada até 600 px · nenhum flex, grid,
 *   background-image, base64, <style>, <script>, SVG ou var() do CSS ·
 *   toda imagem com alt, width e height · texto de verdade fora da imagem ·
 *   contraste de 4.5:1 no texto · todo link absoluto e respondendo 200.
 *
 * O que ele NÃO faz, de propósito: não hospeda o logo (isso é decisão de onde
 * fica o arquivo, e o link precisa durar anos) e não instala nada no programa
 * de e-mail. A instalação é manual, por cliente, e sai escrita em instalar.md.
 *
 * Node 18+, sem dependência de npm. Usa ./br.js e ./gerar-planilha.js (parseCsv).
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");
const { parseCsv } = require("./gerar-planilha.js");

// ─────────────────────────── réguas ───────────────────────────

const LIMITE_BYTES = 20 * 1024;   // 20 KB de HTML
const LIMITE_CHARS = 10000;       // editor de assinatura do Gmail
const LIMITE_LARGURA = 600;       // painel de leitura sem rolagem horizontal
const LARGURA_PADRAO = 480;

const PROIBIDO = [
  [/display\s*:\s*(inline-)?flex/i, "display:flex", "o motor do Word (Outlook clássico) ignora flex e a assinatura vira uma pilha torta"],
  [/display\s*:\s*(inline-)?grid/i, "display:grid", "grid não existe no Outlook clássico"],
  [/\b(flex-direction|flex-wrap|justify-content|align-items|grid-template|gap)\s*:/i, "propriedade de flex/grid", "sem suporte no Outlook clássico"],
  [/background-image\s*:/i, "background-image", "o Outlook clássico descarta; fundo de imagem só com VML, que não vale numa assinatura"],
  [/background\s*:\s*[^;"']*url\s*\(/i, "background com url()", "mesmo caso do background-image"],
  [/src\s*=\s*["']?data:/i, "imagem em base64 (data:)", "o Gmail não mostra imagem embutida, e o base64 do logo já estoura os 10.000 caracteres"],
  [/<style[\s>]/i, "<style>", "o Gmail descarta boa parte do bloco <style>, e o editor de assinatura remove o que sobrar"],
  [/<script[\s>]/i, "<script>", "removido por todo cliente de e-mail"],
  [/<form[\s>]/i, "<form>", "removido ou marcado como spam"],
  [/<svg[\s>]|\.svg\b/i, "SVG", "o Gmail não renderiza SVG; logo de assinatura é PNG"],
  [/var\s*\(\s*--/i, "var() do CSS", "token de design não resolve dentro do e-mail; o valor entra escrito"],
];

// Sinal fraco: vale olhar, não reprova. Assinatura antiga colada do Gmail sai
// cheia de <div>, e nem por isso está quebrada.
const SUSPEITO = [
  [/@media[\s(]/i, "@media: o editor de assinatura descarta, e 480 px não precisa de ponto de quebra"],
  [/position\s*:\s*(absolute|fixed)/i, "position:absolute: o motor do Word posiciona de outro jeito"],
  [/<div[\s>]/i, "<div> no layout: tabela é mais previsível no Outlook clássico"],
];

const PLACEHOLDERS = [/\bSEU[_\s-][A-ZÀ-Ú]+/, /\bLOREM\b/i, /\bxxx+\b/i, /\[(a confirmar|inserir|preencher)[^\]]*\]/i, /\bTODO\b/];

// Rede social responde 403, 404 ou 999 pra quem não é navegador, e o link
// funciona na mão. Nesses domínios o status vira aviso, não reprovação: o
// script diz o que viu e manda conferir no navegador, em vez de mentir dos dois
// jeitos possíveis (aprovar link morto ou reprovar link vivo).
const HOSTS_COM_MURO = [
  "linkedin.com", "instagram.com", "facebook.com", "x.com", "twitter.com",
  "tiktok.com", "threads.net", "threads.com", "youtube.com", "pinterest.com",
];

function temMuro(url) {
  const h = hostDe(url).replace(/^www\./, "").toLowerCase();
  return HOSTS_COM_MURO.some((d) => h === d || h.endsWith("." + d));
}

// ─────────────────────────── contraste ───────────────────────────

/** #abc ou #aabbcc → [r,g,b] de 0 a 255, ou null. */
function corRgb(hex) {
  const h = String(hex || "").trim().replace(/^#/, "");
  const c = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(c)) return null;
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
}

/** Razão de contraste WCAG entre duas cores. Devolve null se alguma não é cor. */
function contraste(cor1, cor2) {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = corRgb(cor1), b = corRgb(cor2);
  if (!a || !b) return null;
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ─────────────────────────── utilidades ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function curto(p) {
  const rel = path.relative(process.cwd(), p);
  return rel.length < p.length ? rel : p;
}

// Flag que não leva valor. Sem essa lista, `conferir --sem-rede <pasta>` engolia
// a pasta como se fosse o valor do --sem-rede, e o comando morria dizendo que
// não encontrou "(vazio)".
// (--exemplo fica fora: ele aceita o nome do arquivo a escrever.)
const SO_LIGA_DESLIGA = new Set(["sem-rede", "json", "forcar", "ajuda", "h"]);

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const chave = a.slice(2);
      const prox = argv[i + 1];
      // --exemplo aceita nome de arquivo; o resto da lista, não.
      const aceitaValor = !SO_LIGA_DESLIGA.has(chave);
      if (aceitaValor && prox && !prox.startsWith("--")) { o[chave] = prox; i++; }
      else o[chave] = true;
    } else o._.push(a);
  }
  return o;
}

function esc(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Só o que tem valor: tira campo vazio, espaço sobrando e undefined. */
function limpo(s) {
  return String(s === undefined || s === null ? "" : s).trim();
}

// ─────────────────────────── UTM ───────────────────────────

/** Mesma normalização do scripts/utm.js: minúscula, sem acento, hífen no lugar de espaço. */
function normalizarUtm(valor) {
  return String(valor)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Acrescenta UTM ao link, só quando ele aponta pro domínio do próprio negócio.
 * Link de rede social e de terceiro fica intacto: UTM em domínio alheio não
 * chega em relatório nenhum e ainda suja o link. Sem domínio próprio conhecido
 * (negócio que não tem site), nenhum link recebe UTM — era por aí que o
 * `utm_source` vazava pro link do Instagram.
 */
function comUtm(url, utm, hostProprio) {
  const bruto = limpo(url);
  if (!bruto || !utm || !utm.source || !hostProprio) return bruto;
  let u;
  try { u = new URL(/^https?:\/\//i.test(bruto) ? bruto : "https://" + bruto); } catch { return bruto; }
  if (u.hostname.replace(/^www\./, "") !== hostProprio.replace(/^www\./, "")) return u.toString();
  for (const k of ["source", "medium", "campaign", "content"]) {
    if (!utm[k]) continue;
    const v = normalizarUtm(utm[k]);
    if (v) u.searchParams.set(`utm_${k}`, v);
  }
  return u.toString();
}

function hostDe(url) {
  try { return new URL(/^https?:\/\//i.test(url) ? url : "https://" + url).hostname; } catch { return ""; }
}

// ─────────────────────────── spec ───────────────────────────

const MARCA_PADRAO = {
  empresa: "",
  site: "",
  endereco: "",
  aviso: "",
  fonte: "Arial, Helvetica, sans-serif",
  cor_texto: "#14181f",
  cor_apoio: "#5b6472",
  cor_link: "#0b5cd5",
  cor_linha: "#dfe3e9",
  largura: LARGURA_PADRAO,
  layout: "lado-a-lado",
  logo: null,
};

function lerSpec(arquivo) {
  if (!arquivo || !fs.existsSync(arquivo)) {
    morrer(`spec não encontrado: ${arquivo || "(vazio)"}`, "uso: node scripts/assinatura-email.js gerar identidade/assinatura-email/assinatura.json\n  pra começar: node scripts/assinatura-email.js --exemplo");
  }
  let spec;
  try { spec = JSON.parse(fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "")); }
  catch (e) { morrer(`JSON inválido em ${curto(arquivo)}: ${e.message}`, "vírgula sobrando no fim da lista é o erro mais comum"); }
  spec.marca = Object.assign({}, MARCA_PADRAO, spec.marca || {});
  if (!Array.isArray(spec.pessoas)) spec.pessoas = [];
  return spec;
}

const COLUNAS = {
  nome: ["nome", "name"],
  cargo: ["cargo", "funcao", "função", "titulo", "título", "role"],
  email: ["email", "e-mail"],
  telefone: ["telefone", "tel", "fone", "fixo"],
  whatsapp: ["whatsapp", "zap", "celular", "whats"],
  site: ["site", "url", "pagina", "página"],
  instagram: ["instagram", "insta", "ig"],
  linkedin: ["linkedin", "in"],
  registro: ["registro", "conselho", "crm", "cro", "oab", "crp", "crea"],
};

function pessoasDoCsv(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`CSV não encontrado: ${arquivo}`);
  const { linhas } = parseCsv(fs.readFileSync(arquivo, "utf8").replace(/^﻿/, ""));
  if (linhas.length < 2) morrer(`${curto(arquivo)} não tem linha de dado`, "a primeira linha é o cabeçalho: nome;cargo;email;telefone;whatsapp");
  const cab = linhas[0].map((c) => br.semAcento(c).trim());
  const achar = (nomes) => cab.findIndex((c) => nomes.some((n) => c === br.semAcento(n)));
  const idx = {};
  for (const [campo, nomes] of Object.entries(COLUNAS)) idx[campo] = achar(nomes);
  if (idx.nome < 0) morrer(`${curto(arquivo)} não tem coluna "nome"`, `colunas encontradas: ${cab.join(", ")}`);
  return linhas.slice(1).map((l) => {
    const p = {};
    for (const campo of Object.keys(COLUNAS)) if (idx[campo] >= 0) p[campo] = limpo(l[idx[campo]]);
    p.redes = {};
    if (p.instagram) p.redes.Instagram = p.instagram;
    if (p.linkedin) p.redes.LinkedIn = p.linkedin;
    delete p.instagram; delete p.linkedin;
    return p;
  }).filter((p) => p.nome);
}

// ─────────────────────────── montagem ───────────────────────────

/** Primeiro nome, pra mensagem pré-preenchida do WhatsApp. */
function primeiroNome(nome) {
  return limpo(nome).split(/\s+/)[0] || "";
}

/**
 * Mensagem pré-preenchida do WhatsApp. O WhatsApp ignora UTM (o wa.me só lê
 * `text`), por isso a origem entra dentro da própria mensagem: é o que faz o
 * atendimento saber de onde a pessoa veio sem perguntar.
 */
function mensagemWhatsapp(modelo, pessoa, marca) {
  const base = limpo(modelo) || "Olá, {primeiro}! Cheguei pela sua assinatura de e-mail.";
  return base
    .replace(/\{primeiro\}/g, primeiroNome(pessoa.nome))
    .replace(/\{nome\}/g, limpo(pessoa.nome))
    .replace(/\{empresa\}/g, limpo(marca.empresa));
}

/** Uma linha de contato da assinatura. */
function linha(rotulo, conteudo, marca, tam = 14) {
  return `<p style="margin:0 0 4px;font:${tam}px/1.4 ${marca.fonte};color:${marca.cor_texto};">` +
    (rotulo ? `<span style="color:${marca.cor_apoio};">${esc(rotulo)}</span> ` : "") + conteudo + `</p>`;
}

function link(href, texto, marca) {
  const alvo = /^(mailto:|tel:)/i.test(href) ? "" : ' target="_blank"';
  return `<a href="${esc(href)}"${alvo} style="color:${marca.cor_link};text-decoration:none;">${esc(texto)}</a>`;
}

/**
 * Monta o HTML da assinatura de uma pessoa. Devolve { html, avisos }.
 * Toda cor e toda medida entram inline: assinatura não tem folha de estilo.
 */
function montarHtml(pessoa, marca, opts = {}) {
  const avisos = [];
  const utm = opts.utm || null;
  const hostProprio = hostDe(limpo(pessoa.site) || limpo(marca.site));
  const largura = Math.min(Number(marca.largura) || LARGURA_PADRAO, LIMITE_LARGURA);
  if (Number(marca.largura) > LIMITE_LARGURA) avisos.push(`largura ${marca.largura} px passa de ${LIMITE_LARGURA}; usei ${largura}`);
  else if (largura > 520) avisos.push(`largura de ${largura} px: a faixa que sobrevive à escala do Windows é 400 a 480 px`);

  if (marca.layout && !["lado-a-lado", "empilhado"].includes(marca.layout)) {
    avisos.push(`layout "${marca.layout}" não existe; usei o empilhado. Vale "lado-a-lado" ou "empilhado"`);
  }

  // Contraste conferido, não estimado: o cinza de apoio é o que costuma passar
  // de 4.5:1 sem ninguém notar, e é nele que mora o telefone.
  for (const [campo, valor] of [["cor_texto", marca.cor_texto], ["cor_apoio", marca.cor_apoio], ["cor_link", marca.cor_link]]) {
    const r = contraste(valor, "#ffffff");
    if (r === null) avisos.push(`${campo} "${valor}" não é cor hexadecimal`);
    else if (r < 4.5) avisos.push(`${campo} ${valor} tem ${r.toFixed(2)}:1 sobre branco, abaixo de 4.5:1 (WCAG AA). Escureça`);
  }

  const corpo = [];
  corpo.push(`<p style="margin:0 0 2px;font:bold 16px/1.3 ${marca.fonte};color:${marca.cor_texto};">${esc(pessoa.nome)}</p>`);

  const cargoEmpresa = [limpo(pessoa.cargo), limpo(marca.empresa)].filter(Boolean).join(" · ");
  const temRegistro = Boolean(limpo(pessoa.registro));
  if (cargoEmpresa) corpo.push(`<p style="margin:0 0 ${temRegistro ? 2 : 10}px;font:14px/1.4 ${marca.fonte};color:${marca.cor_apoio};">${esc(cargoEmpresa)}</p>`);
  if (temRegistro) corpo.push(`<p style="margin:0 0 10px;font:13px/1.4 ${marca.fonte};color:${marca.cor_apoio};">${esc(pessoa.registro)}</p>`);

  const tel = br.telefoneE164(pessoa.telefone);
  if (limpo(pessoa.telefone) && !tel) avisos.push(`telefone "${pessoa.telefone}" não é telefone brasileiro válido; ficou de fora`);
  if (tel) corpo.push(linha("Tel", link(`tel:${tel}`, br.telefoneBonito(tel), marca), marca));

  const zap = br.telefoneE164(pessoa.whatsapp);
  if (limpo(pessoa.whatsapp) && !zap) avisos.push(`WhatsApp "${pessoa.whatsapp}" não é telefone brasileiro válido; ficou de fora`);
  if (zap) {
    const msg = mensagemWhatsapp(opts.whatsappMensagem, pessoa, marca);
    corpo.push(linha("WhatsApp", link(br.linkWhatsapp(zap, msg), br.telefoneBonito(zap), marca), marca));
  }

  const email = limpo(pessoa.email);
  if (email && !br.emailValido(email)) avisos.push(`e-mail "${email}" não parece válido`);
  if (email) corpo.push(linha("", link(`mailto:${email}`, email, marca), marca));

  const site = limpo(pessoa.site) || limpo(marca.site);
  if (site) {
    const alvo = comUtm(site, utm, hostProprio);
    corpo.push(linha("", link(alvo, site.replace(/^https?:\/\//i, "").replace(/\/$/, ""), marca), marca));
  }

  const redes = Object.entries(pessoa.redes || {}).filter(([, v]) => limpo(v));
  if (redes.length) {
    const partes = redes.map(([rotulo, url]) => link(comUtm(url, utm, hostProprio), rotulo, marca));
    corpo.push(linha("", partes.join(`<span style="color:${marca.cor_apoio};"> · </span>`), marca, 13));
  }

  if (limpo(marca.endereco)) corpo.push(`<p style="margin:10px 0 0;font:12px/1.4 ${marca.fonte};color:${marca.cor_apoio};">${esc(marca.endereco)}</p>`);
  if (limpo(marca.aviso)) corpo.push(`<p style="margin:6px 0 0;font:11px/1.4 ${marca.fonte};color:${marca.cor_apoio};">${esc(marca.aviso)}</p>`);

  const logo = marca.logo && limpo(marca.logo.url) ? marca.logo : null;
  if (marca.logo && /^data:/i.test(limpo(marca.logo.url))) {
    avisos.push("logo em base64: o Gmail não mostra imagem embutida. Hospede o PNG e use a URL");
  }
  let imgLogo = "";
  let larguraLogo = 0;
  if (logo) {
    larguraLogo = Number(logo.largura) || 120;
    const lh = Number(logo.altura) || 40;
    const alt = esc(limpo(logo.alt) || limpo(marca.empresa) || "Logo");
    // A medida do logo vai só nos atributos width/height, de propósito. No motor
    // do Word (Outlook clássico) a medida em atributo continua em pixel, e o
    // `width:120px` do CSS é convertido em ponto — que cresce junto com a escala
    // do Windows. É essa conversão que faz "o logo do fulano aparecer gigante".
    // Fonte: emailonacid.com/blog/article/email-development/dpi-scaling-in-outlook-2007-2013/
    const img = `<img src="${esc(logo.url)}" width="${larguraLogo}" height="${lh}" alt="${alt}" style="display:block;border:0;outline:none;font:bold 14px ${marca.fonte};color:${marca.cor_texto};text-decoration:none;">`;
    imgLogo = site ? `<a href="${esc(comUtm(site, utm, hostProprio))}" target="_blank" style="text-decoration:none;">${img}</a>` : img;
    if (!/\.png($|\?)/i.test(logo.url)) avisos.push("o logo não termina em .png: o Gmail não renderiza SVG, e WebP falha em Outlook antigo");
    if (!/^https:\/\//i.test(logo.url)) avisos.push("o logo não está em https: cliente de e-mail bloqueia imagem em http");
    if (larguraLogo > 200) avisos.push(`logo de ${larguraLogo} px: acima de 200 px ele domina a assinatura e cresce mais ainda na escala do Windows`);
  }

  const abre = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${largura}" style="width:${largura}px;max-width:100%;border-collapse:collapse;">`;
  const empilhado = marca.layout === "empilhado" || !imgLogo;
  // Sem logo, a faixa de 3 px na cor da marca é o que sobra de identidade — e é
  // a única marcação que sobrevive ao modo escuro dos dois lados.
  const faixa = imgLogo ? "" : `border-left:3px solid ${marca.cor_linha};padding:0 0 0 16px;`;
  const html = empilhado
    ? `${abre}
${imgLogo ? `  <tr><td style="padding:0 0 12px;">${imgLogo}</td></tr>\n` : ""}  <tr>
    <td style="vertical-align:top;${faixa}">
${corpo.map((l) => "      " + l).join("\n")}
    </td>
  </tr>
</table>`
    : `${abre}
  <tr>
    <td width="${larguraLogo}" style="padding:0 16px 0 0;vertical-align:top;">${imgLogo}</td>
    <td style="vertical-align:top;border-left:3px solid ${marca.cor_linha};padding:0 0 0 16px;">
${corpo.map((l) => "      " + l).join("\n")}
    </td>
  </tr>
</table>`;

  return { html: html + "\n", avisos };
}

/** Versão em texto puro: mesma informação, links por extenso, sem marcação. */
function montarTexto(pessoa, marca, opts = {}) {
  const utm = opts.utm || null;
  const hostProprio = hostDe(limpo(pessoa.site) || limpo(marca.site));
  const l = [];
  l.push(limpo(pessoa.nome));
  const cargoEmpresa = [limpo(pessoa.cargo), limpo(marca.empresa)].filter(Boolean).join(" · ");
  if (cargoEmpresa) l.push(cargoEmpresa);
  if (limpo(pessoa.registro)) l.push(limpo(pessoa.registro));
  const tel = br.telefoneE164(pessoa.telefone);
  if (tel) l.push(`Tel ${br.telefoneBonito(tel)}`);
  const zap = br.telefoneE164(pessoa.whatsapp);
  if (zap) l.push(`WhatsApp ${br.telefoneBonito(zap)} — ${br.linkWhatsapp(zap, mensagemWhatsapp(opts.whatsappMensagem, pessoa, marca))}`);
  if (limpo(pessoa.email)) l.push(limpo(pessoa.email));
  const site = limpo(pessoa.site) || limpo(marca.site);
  if (site) l.push(comUtm(site, utm, hostProprio));
  for (const [rotulo, url] of Object.entries(pessoa.redes || {})) if (limpo(url)) l.push(`${rotulo}: ${limpo(url)}`);
  if (limpo(marca.endereco)) l.push(limpo(marca.endereco));
  if (limpo(marca.aviso)) l.push(limpo(marca.aviso));
  return l.join("\n") + "\n";
}

// ─────────────────────────── conferência ───────────────────────────

/** Desfaz as entidades que o HTML exige, pra o link voltar a ser o link. */
function desescapar(s) {
  return String(s)
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'");
}

/** Todos os href e src do HTML, na ordem em que aparecem, já desescapados. */
function linksDe(html) {
  const out = [];
  let m;
  const re = /href\s*=\s*["']([^"']*)["']/gi;
  while ((m = re.exec(html))) out.push(desescapar(m[1]));
  const img = /<img[^>]+src\s*=\s*["']([^"']*)["']/gi;
  while ((m = img.exec(html))) out.push(desescapar(m[1]));
  return out;
}

/** Maior largura declarada, em atributo width ou em style width:Npx. */
function larguraDeclarada(html) {
  let max = 0;
  let m;
  const attr = /<(table|td|img)[^>]*\swidth\s*=\s*["']?(\d+)/gi;
  while ((m = attr.exec(html))) max = Math.max(max, Number(m[2]));
  const css = /width\s*:\s*(\d+)px/gi;
  while ((m = css.exec(html))) max = Math.max(max, Number(m[1]));
  return max;
}

/**
 * Conferência estática de um HTML de assinatura. Devolve
 * { bytes, caracteres, largura, imagens, links, problemas, avisos }.
 */
function conferirHtml(html, nome = "assinatura.html") {
  const problemas = [];
  const avisos = [];
  const bytes = Buffer.byteLength(html, "utf8");
  const caracteres = html.length;

  if (bytes > LIMITE_BYTES) problemas.push(`${(bytes / 1024).toFixed(1)} KB de HTML, acima dos ${LIMITE_BYTES / 1024} KB`);
  if (caracteres > LIMITE_CHARS) problemas.push(`${caracteres} caracteres: o editor de assinatura do Gmail aceita ${LIMITE_CHARS}`);
  else if (caracteres > LIMITE_CHARS * 0.8) avisos.push(`${caracteres} caracteres, perto do limite de ${LIMITE_CHARS} do Gmail`);

  const largura = larguraDeclarada(html);
  if (largura > LIMITE_LARGURA) problemas.push(`largura declarada de ${largura} px, acima de ${LIMITE_LARGURA} px`);
  if (largura === 0) avisos.push("nenhuma largura declarada: o Outlook clássico decide sozinho");

  for (const [re, nomeRegra, porque] of PROIBIDO) {
    if (re.test(html)) problemas.push(`${nomeRegra} — ${porque}`);
  }
  for (const [re, recado] of SUSPEITO) if (re.test(html)) avisos.push(recado);

  const plural = (n, um, muitos) => `${n} ${n === 1 ? um : muitos}`;
  const imagens = (html.match(/<img\b/gi) || []).length;
  const semAlt = (html.match(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi) || []).length;
  if (semAlt) problemas.push(`${plural(semAlt, "imagem", "imagens")} sem alt: com a imagem bloqueada não sobra nada no lugar`);
  const tagsImg = html.match(/<img\b[^>]*>/gi) || [];
  const semMedida = tagsImg.filter((t) => !/\bwidth\s*=/i.test(t) || !/\bheight\s*=/i.test(t)).length;
  if (semMedida) problemas.push(`${plural(semMedida, "imagem", "imagens")} sem width e height em atributo: o Outlook clássico estica`);
  if (imagens > 3) avisos.push(`${imagens} imagens: cada uma é um pedido de rede em todo e-mail enviado. Logo basta`);

  // Assinatura que é só imagem: com a imagem bloqueada não sobra contato nenhum,
  // e ninguém consegue copiar o telefone.
  const visivel = html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  if (imagens > 0 && visivel.length < 20) {
    problemas.push("a assinatura é uma imagem só: sem texto, o contato desaparece quando a imagem chega bloqueada");
  }

  for (const re of PLACEHOLDERS) {
    const achou = html.match(re);
    if (achou) problemas.push(`sobrou placeholder no texto: "${achou[0].trim()}"`);
  }

  const links = linksDe(html);
  for (const h of new Set(links)) {
    if (/^data:/i.test(h)) continue; // já reprovado pela regra do base64
    if (!h.trim() || h.trim() === "#") problemas.push("link vazio ou href=\"#\"");
    else if (/^http:\/\//i.test(h)) problemas.push(`link em http (sem s): ${h}`);
    else if (!/^(https:|mailto:|tel:)/i.test(h)) problemas.push(`link relativo não abre dentro do e-mail: ${h}`);
  }

  if (!/role\s*=\s*["']presentation["']/i.test(html) && /<table/i.test(html)) {
    avisos.push('tabela sem role="presentation": o leitor de tela anuncia "tabela" antes de cada linha');
  }

  return { arquivo: nome, bytes, caracteres, largura, imagens, links, problemas, avisos };
}

/**
 * Testa por HTTP se cada link responde 200. Devolve lista de
 * { url, status, erro, muro }, onde `muro` marca o domínio que trata script como
 * robô (LinkedIn e Instagram são os campeões) e cujo status não prova nada.
 */
async function checarLinks(links, espera = 8000) {
  const unicos = [...new Set(links.filter((h) => /^https:\/\//i.test(h)))];
  const ms = Number(espera) || 8000;
  const out = [];
  for (const url of unicos) {
    let r = null, erro = null;
    for (const metodo of ["HEAD", "GET"]) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      try {
        const resp = await fetch(url, {
          method: metodo,
          redirect: "follow",
          signal: ctrl.signal,
          // Sem User-Agent de navegador, metade dos sites devolve 403 e o teste
          // vira alarme falso.
          headers: { "user-agent": "Mozilla/5.0 (compatible; ContexOS assinatura-email)" },
        });
        r = resp.status;
        erro = null;
        if (resp.status !== 405 && resp.status !== 403 && resp.status < 500) break;
      } catch (e) {
        erro = e.name === "AbortError" ? `sem resposta em ${ms} ms` : e.message;
      } finally { clearTimeout(t); }
    }
    out.push({ url, status: r, erro, muro: temMuro(url) });
  }
  return out;
}

// ─────────────────────────── comandos ───────────────────────────

const EXEMPLO = {
  marca: {
    empresa: "Clínica Vale Verde",
    site: "https://clinicavaleverde.com.br",
    endereco: "Rua Amador Bueno, 142 — Santos/SP",
    aviso: "Esta mensagem pode conter informação de saúde. Se não for para você, apague e avise.",
    fonte: "Arial, Helvetica, sans-serif",
    cor_texto: "#14181f",
    cor_apoio: "#5b6472",
    cor_link: "#0b5cd5",
    cor_linha: "#dfe3e9",
    largura: 480,
    layout: "lado-a-lado",
    logo: { url: "https://clinicavaleverde.com.br/img/assinatura-logo.png", largura: 120, altura: 40, alt: "Clínica Vale Verde" },
  },
  utm: { source: "assinatura-email", medium: "email", campaign: "assinatura" },
  whatsapp_mensagem: "Olá, {primeiro}! Cheguei pela assinatura de e-mail da {empresa} e queria marcar um horário.",
  pessoas: [
    {
      nome: "Marina Okuda", cargo: "Fisioterapeuta", registro: "CREFITO-3 98765-F",
      email: "marina@clinicavaleverde.com.br", telefone: "(13) 3222-1140", whatsapp: "(13) 99728-7738",
      site: "", redes: { Instagram: "https://instagram.com/clinicavaleverde" },
    },
  ],
};

function cmdExemplo(o) {
  const destino = (typeof o.exemplo === "string" ? o.exemplo : o._[1]) || "assinatura.json";
  if (fs.existsSync(destino) && !o.forcar) morrer(`${destino} já existe`, "escolha outro nome ou passe --forcar");
  fs.writeFileSync(destino, JSON.stringify(EXEMPLO, null, 2) + "\n");
  console.log(`\n✓ ${curto(path.resolve(destino))}\n\n  Edite e rode: node scripts/assinatura-email.js gerar ${destino}\n`);
}

function instalarMd(marca, pastas) {
  const hoje = br.fmt(new Date());
  const quem = limpo(marca.empresa) ? ` — ${limpo(marca.empresa)}` : "";
  return `# Instalar a assinatura${quem}

Gerado em ${hoje} por \`scripts/assinatura-email.js\`. Cada pessoa tem a pasta dela,
com \`assinatura.html\` (a que vai no programa de e-mail) e \`assinatura.txt\`
(a versão em texto puro, pra quem escreve sem formatação).

Pastas: ${pastas.map((p) => "`" + p + "`").join(", ")}

## O que esperar em cada programa

| Programa | Como instalar | O que ele faz com a assinatura |
|---|---|---|
| Gmail (computador) | copiar do navegador e colar | descarta \`<style>\`, classe e \`@media\`; teto de 10.000 caracteres no campo |
| Gmail (app do celular) | colar o \`assinatura.txt\` | a assinatura do app é texto puro e separada da do computador |
| Outlook clássico (Windows) | copiar do navegador e colar | renderiza com o motor do Word; a escala do Windows aumenta o que estiver medido em CSS |
| Outlook novo e na web | copiar do navegador e colar | motor de navegador, bem mais tolerante; ainda reescreve parte do HTML ao salvar |
| Apple Mail (macOS) | editar o \`.mailsignature\` (abaixo) | renderiza quase tudo, e reescreve o arquivo se ele não estiver bloqueado |
| Apple Mail (iPhone) | colar o texto, ou sincronizar do Mac | assinatura separada, com formatação simples |
| Thunderbird | apontar pro \`assinatura.html\` | é o único que lê o arquivo HTML direto |

Conferido em 23/09/2026; os detalhes e as fontes de cada linha estão em
\`templates/design/assinatura-email.md\`.

## Gmail (no computador, com o Chrome)

1. Abra o \`assinatura.html\` no navegador, com dois cliques no arquivo
2. Selecione tudo na página (Ctrl+A / Cmd+A) e copie (Ctrl+C / Cmd+C)
3. No Gmail: engrenagem → **Ver todas as configurações** → aba **Geral** → **Assinatura**
4. Crie a assinatura, cole no campo, escolha ela em "novos e-mails" e em "resposta"
5. Role até o fim e clique em **Salvar alterações**

Copiar do navegador (e não colar o código HTML) é o caminho que funciona: o campo
do Gmail é um editor visual, não aceita código.

## Outlook

**Outlook no Windows (clássico):** Arquivo → Opções → E-mail → **Assinaturas**.
Cole do navegador, igual ao Gmail. Se o logo aparecer maior do que deveria,
o motivo é a escala do Windows; veja o que fazer em
\`templates/design/assinatura-email.md\`.

**Outlook novo e Outlook na web:** Configurações → Conta → **Assinaturas**.
Mesmo caminho de copiar e colar.

## Apple Mail

1. Mail → Configurações → **Assinaturas** → **+** e escreva qualquer coisa
   (é só pra criar o arquivo). Feche o Mail
2. Abra o Finder, Ir → **Ir para a pasta** e cole:
   \`~/Library/Mail/V10/MailData/Signatures\` (o número do V muda conforme a
   versão do macOS; entre no maior)
3. Abra o \`.mailsignature\` mais recente num editor de texto
4. Mantenha as linhas de cabeçalho do topo e troque só o que está entre
   \`<body>\` e \`</body>\` pelo conteúdo do \`assinatura.html\`
5. Salve, clique com o botão direito no arquivo, **Obter informações**, e marque
   **Bloqueado**. Sem isso o Mail reescreve a assinatura na próxima abertura
6. Abra o Mail

## Depois de instalar

Mande um e-mail de teste pra você mesmo e abra **no celular**. É o único jeito de
ver o que o modo escuro faz com o logo.
`;
}

function cmdGerar(o) {
  const spec = lerSpec(o._[1]);
  const marca = spec.marca;
  const utm = spec.utm || null;
  const pessoas = o.csv ? pessoasDoCsv(o.csv) : spec.pessoas;
  if (!pessoas.length) morrer("nenhuma pessoa no spec", 'preencha a lista "pessoas" do JSON, ou passe --csv equipe.csv');

  const saida = path.resolve(o.saida || "identidade/assinatura-email");
  fs.mkdirSync(saida, { recursive: true });

  const linhas = [];
  const todosAvisos = [];
  const pastas = [];
  let houveProblema = false;

  for (const p of pessoas) {
    if (!limpo(p.nome)) continue;
    const slug = br.slug(p.nome);
    const dir = path.join(saida, slug);
    fs.mkdirSync(dir, { recursive: true });
    const { html, avisos } = montarHtml(p, marca, { utm, whatsappMensagem: spec.whatsapp_mensagem });
    const txt = montarTexto(p, marca, { utm, whatsappMensagem: spec.whatsapp_mensagem });
    fs.writeFileSync(path.join(dir, "assinatura.html"), html);
    fs.writeFileSync(path.join(dir, "assinatura.txt"), txt);
    const c = conferirHtml(html, `${slug}/assinatura.html`);
    if (c.problemas.length) houveProblema = true;
    for (const a of avisos) todosAvisos.push(`${p.nome}: ${a}`);
    for (const a of c.avisos) todosAvisos.push(`${p.nome}: ${a}`);
    for (const a of c.problemas) todosAvisos.push(`${p.nome}: ✖ ${a}`);
    linhas.push({ nome: p.nome, slug, bytes: c.bytes, caracteres: c.caracteres, largura: c.largura, problemas: c.problemas });
    pastas.push(slug);
  }

  fs.writeFileSync(path.join(saida, "instalar.md"), instalarMd(marca, pastas));

  if (o.json) {
    console.log(JSON.stringify({ saida, pessoas: linhas, avisos: todosAvisos }, null, 2));
    return houveProblema ? 1 : 0;
  }

  console.log(`\n✓ ${linhas.length} assinatura(s) em ${curto(saida)}\n`);
  const larg = Math.max(12, ...linhas.map((l) => l.nome.length));
  console.log(`  ${"pessoa".padEnd(larg)}  ${"peso".padStart(8)}  ${"caract.".padStart(8)}  largura`);
  for (const l of linhas) {
    console.log(`  ${l.nome.padEnd(larg)}  ${(l.bytes / 1024).toFixed(1).padStart(5)} KB  ${String(l.caracteres).padStart(8)}  ${l.largura} px${l.problemas.length ? "  ✖" : ""}`);
  }
  console.log(`\n  instalar.md com o passo a passo de Gmail, Outlook e Apple Mail está na mesma pasta.`);
  if (todosAvisos.length) {
    console.log("\n  Olhar antes de distribuir:");
    for (const a of todosAvisos) console.log(`   · ${a}`);
  }
  console.log(`\n  Falta testar os links: node scripts/assinatura-email.js conferir ${curto(saida)}`);
  if (houveProblema) console.log(`\n✖ Tem assinatura com problema (marcada com ✖ na tabela). Conserte o spec e rode de novo antes de distribuir.\n`);
  else console.log("");
  return houveProblema ? 1 : 0;
}

async function cmdConferir(o) {
  const alvo = o._[1];
  if (!alvo || !fs.existsSync(alvo)) morrer(`não encontrei: ${alvo || "(vazio)"}`, "uso: node scripts/assinatura-email.js conferir identidade/assinatura-email");
  const arquivos = [];
  const st = fs.statSync(alvo);
  if (st.isDirectory()) {
    const anda = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) anda(p);
        else if (/\.html?$/i.test(e.name)) arquivos.push(p);
      }
    };
    anda(alvo);
  } else arquivos.push(alvo);
  if (!arquivos.length) morrer(`nenhum .html em ${curto(path.resolve(alvo))}`, "gere primeiro: node scripts/assinatura-email.js gerar <spec.json>");

  const resultados = [];
  for (const f of arquivos) {
    const html = fs.readFileSync(f, "utf8");
    const c = conferirHtml(html, curto(path.resolve(f)));
    if (!o["sem-rede"]) {
      c.rede = await checarLinks(c.links, o.espera);
      // Se nenhum link respondeu, o problema é a rede daqui, não os links. Se
      // algum respondeu, quem não respondeu está quebrado de verdade.
      const redeViva = c.rede.some((r) => r.status);
      if (c.rede.length && !redeViva) c.avisos.push("não deu pra testar link nenhum: sem rede nesta máquina. Rode de novo conectado");
      for (const r of c.rede) {
        if (r.erro) (redeViva ? c.problemas : c.avisos).push(`${r.url} não respondeu: ${r.erro}`);
        else if (r.status === 200) continue;
        else if (r.muro) c.avisos.push(`${r.url} respondeu ${r.status}, mas esse domínio bloqueia script. Abra no navegador pra confirmar`);
        else c.problemas.push(`${r.url} respondeu ${r.status}, não 200`);
      }
    }
    resultados.push(c);
  }

  if (o.json) { console.log(JSON.stringify(resultados, null, 2)); return resultados.some((r) => r.problemas.length) ? 1 : 0; }

  let ruim = 0;
  for (const c of resultados) {
    console.log(`\n${c.arquivo}`);
    const unicos = new Set(c.links).size;
    console.log(`  ${(c.bytes / 1024).toFixed(1)} KB · ${c.caracteres} caracteres (limite do Gmail: ${LIMITE_CHARS}) · ${c.largura} px de largura · ${c.imagens} imagem(ns) · ${unicos} link(s)`);
    if (c.rede) {
      const ok = c.rede.filter((r) => r.status === 200).length;
      console.log(`  rede: ${ok}/${c.rede.length} link(s) respondendo 200`);
    }
    for (const a of c.avisos) console.log(`  ⚠ ${a}`);
    for (const p of c.problemas) { console.log(`  ✖ ${p}`); ruim++; }
    if (!c.problemas.length) console.log("  ✓ passa nas réguas de Gmail, Outlook clássico e Apple Mail");
  }
  console.log(ruim ? `\n✖ ${ruim} problema(s) pra corrigir antes de distribuir.\n` : "\nTudo certo.\n");
  return ruim ? 1 : 0;
}

// ─────────────────────────── main ───────────────────────────

async function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  if (o.exemplo) { cmdExemplo(o); return 0; }
  if (!cmd || o.ajuda || o.h) {
    console.log(`
Contex OS — assinatura-email.js

  node scripts/assinatura-email.js gerar <spec.json> [--csv equipe.csv] [--saida pasta]
  node scripts/assinatura-email.js conferir <pasta|arquivo.html> [--sem-rede] [--espera 15000]
  node scripts/assinatura-email.js --exemplo [arquivo.json] [--forcar]

  --json  devolve o resultado em JSON, pra outra ferramenta ler
`);
    return 0;
  }
  if (cmd === "gerar") return cmdGerar(o);
  if (cmd === "conferir") return await cmdConferir(o);
  morrer(`comando desconhecido: ${cmd}`, "vale gerar, conferir ou --exemplo");
}

if (require.main === module) {
  main().then((c) => process.exit(c || 0)).catch((e) => morrer(e.message));
}

module.exports = {
  montarHtml, montarTexto, conferirHtml, checarLinks, linksDe, larguraDeclarada,
  comUtm, normalizarUtm, mensagemWhatsapp, pessoasDoCsv, lerSpec, instalarMd,
  contraste, corRgb, temMuro,
  LIMITE_BYTES, LIMITE_CHARS, LIMITE_LARGURA,
};
