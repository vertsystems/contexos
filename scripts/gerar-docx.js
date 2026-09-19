#!/usr/bin/env node
/**
 * Contex OS — gerar-docx.js
 * Transforma markdown (ou o HTML que /proposta, /contrato e /documento geram)
 * em .docx editável, e confere o resultado.
 *
 * Existe porque cliente pede Word: o jurídico dele marca alteração no contrato,
 * o setor de compras exige anexo editável, ou ele quer copiar a tabela pra
 * planilha interna. PDF não resolve nenhum dos três. E não dá pra "salvar como
 * .docx" a partir de HTML sem perder título, lista e tabela no caminho.
 *
 * Não instala nada: o .docx é um zip de XMLs, e o script monta o zip na mão
 * (deflate do zlib nativo + CRC32 calculado aqui).
 *
 * Uso:
 *   node scripts/gerar-docx.js <arquivo.md|arquivo.html> [saida.docx]
 *   node scripts/gerar-docx.js --texto <arquivo.docx>                    extrai o texto de um .docx (o que o cliente devolveu, por exemplo)
 *   node scripts/gerar-docx.js --comparar <enviado.docx> <devolvido.docx>  mostra o que mudou entre os dois, linha a linha
 *
 * Opções:
 *   --fonte "Nome"          fonte de corpo e título (padrão: Calibri; use fonte que exista na máquina do cliente)
 *   --cor-titulo "#1F3A5F"  cor dos títulos (padrão: #1A1A1A)
 *   --cabecalho "texto"     texto no alto de toda página (ex.: nome do negócio)
 *   --rodape "texto"        texto no pé de toda página; "Página X de Y" entra sozinho
 *   --sem-numero            rodapé sem numeração de página
 *   --paisagem              A4 deitado (tabela larga)
 *   --tokens <tokens.css>   lê --accent (cor de título) e a fonte de corpo do tokens.css; fonte da web
 *                           é trocada pela substituta segura (Inter → Calibri, Playfair → Georgia) e o script avisa
 *   --titulo "..."          título nas propriedades do arquivo (padrão: o primeiro H1)
 *   --autor "..."           autor nas propriedades (padrão: o cabeçalho, ou "Contex OS")
 *   --salvar-md             quando a origem é HTML, salva também o .md intermediário ao lado
 *   --pdf                   depois de gerar, converte pra PDF com o LibreOffice (se instalado) pra provar que abre
 *
 * Markdown aceito: # ## ### títulos · parágrafo · **negrito** *itálico* `código` [link](url)
 *   · lista com - ou 1. (aninha por indentação) · tabela com | · > citação · ``` bloco de código
 *   · --- linha · quebra de página com uma linha contendo só \pagebreak ou <!-- quebra -->
 *
 * Sai com erro (e não grava o .docx) quando o texto ainda tem placeholder: [a confirmar],
 * [nome do cliente], [valor], XXX, lorem ipsum. Resolve no original e gera de novo.
 *
 * Node 18+. Sem dependência de npm.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");
const { execFileSync, execSync } = require("child_process");

// ───────────────────────────── utilidades ─────────────────────────────

function curto(p) {
  const rel = path.relative(process.cwd(), p);
  return rel.startsWith("..".repeat(3)) || rel.length > p.length ? p : rel;
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Tira caractere que o XML 1.0 não aceita (controle, exceto tab/quebra). */
function limparXml(s) {
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
}

function normalizarHex(cor, padrao) {
  if (!cor) return padrao;
  let c = String(cor).trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(c)) c = c.split("").map((x) => x + x).join("");
  if (!/^[0-9a-f]{6}$/i.test(c)) return null;
  return c.toUpperCase();
}

/** Decodifica entidade HTML comum (o suficiente pra proposta e contrato). */
function decodificarEntidades(s) {
  const mapa = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00A0",
    hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»",
    ldquo: "\u201C", rdquo: "\u201D", lsquo: "\u2018", rsquo: "\u2019",
    copy: "©", reg: "®", trade: "™", middot: "·", bull: "•", times: "×",
    eacute: "é", aacute: "á", iacute: "í", oacute: "ó", uacute: "ú",
    atilde: "ã", otilde: "õ", ccedil: "ç", ecirc: "ê", ocirc: "ô", acirc: "â",
    agrave: "à", Eacute: "É", Aacute: "Á", Ccedil: "Ç", Atilde: "Ã", Otilde: "Õ",
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in mapa ? mapa[n] : m));
}

// ───────────────────────────── CRC32 e zip ─────────────────────────────

const CRC_TABELA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABELA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dataDos(d) {
  const ano = Math.max(1980, d.getFullYear());
  const data = ((ano - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  return { data, hora };
}

/**
 * Monta um zip a partir de [{nome, conteudo}]. A ordem importa: o
 * [Content_Types].xml precisa ser a primeira entrada, e o Word confere isso.
 */
function montarZip(entradas) {
  const agora = dataDos(new Date());
  const locais = [];
  const centrais = [];
  let offset = 0;

  for (const e of entradas) {
    const nome = Buffer.from(e.nome, "utf8");
    const dados = Buffer.isBuffer(e.conteudo) ? e.conteudo : Buffer.from(e.conteudo, "utf8");
    const crc = crc32(dados);
    let metodo = 8;
    let comprimido = zlib.deflateRawSync(dados, { level: 9 });
    if (comprimido.length >= dados.length) { metodo = 0; comprimido = dados; }

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);        // versão necessária
    local.writeUInt16LE(0x0800, 6);    // nomes em UTF-8
    local.writeUInt16LE(metodo, 8);
    local.writeUInt16LE(agora.hora, 10);
    local.writeUInt16LE(agora.data, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nome.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);      // feito por
    central.writeUInt16LE(20, 6);      // versão necessária
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(metodo, 10);
    central.writeUInt16LE(agora.hora, 12);
    central.writeUInt16LE(agora.data, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nome.length, 28);
    central.writeUInt16LE(0, 30);      // extra
    central.writeUInt16LE(0, 32);      // comentário
    central.writeUInt16LE(0, 34);      // disco
    central.writeUInt16LE(0, 36);      // atributo interno
    central.writeUInt32LE(0, 38);      // atributo externo
    central.writeUInt32LE(offset, 42);

    locais.push(local, nome, comprimido);
    centrais.push(central, nome);
    offset += local.length + nome.length + comprimido.length;
  }

  const tamCentral = centrais.reduce((s, b) => s + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(0, 4);
  fim.writeUInt16LE(0, 6);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(tamCentral, 12);
  fim.writeUInt32LE(offset, 16);
  fim.writeUInt16LE(0, 20);

  return Buffer.concat([...locais, ...centrais, fim]);
}

/** Lê as entradas de um zip pelo diretório central. Devolve {nome: Buffer}. */
function lerZip(buf) {
  let fimIdx = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fimIdx = i; break; }
  }
  if (fimIdx < 0) throw new Error("não achei o fim do diretório central: não é um zip");
  const total = buf.readUInt16LE(fimIdx + 10);
  let pos = buf.readUInt32LE(fimIdx + 16);
  const arquivos = {};
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) throw new Error("diretório central corrompido");
    const metodo = buf.readUInt16LE(pos + 10);
    const crcEsperado = buf.readUInt32LE(pos + 16);
    const tamComp = buf.readUInt32LE(pos + 20);
    const tamNome = buf.readUInt16LE(pos + 28);
    const tamExtra = buf.readUInt16LE(pos + 30);
    const tamCom = buf.readUInt16LE(pos + 32);
    const offLocal = buf.readUInt32LE(pos + 42);
    const nome = buf.slice(pos + 46, pos + 46 + tamNome).toString("utf8");
    const tamNomeL = buf.readUInt16LE(offLocal + 26);
    const tamExtraL = buf.readUInt16LE(offLocal + 28);
    const inicio = offLocal + 30 + tamNomeL + tamExtraL;
    const bruto = buf.slice(inicio, inicio + tamComp);
    const dados = metodo === 8 ? zlib.inflateRawSync(bruto) : metodo === 0 ? bruto : null;
    if (!dados) throw new Error(`método de compressão ${metodo} em ${nome} não suportado`);
    if (crc32(dados) !== crcEsperado) throw new Error(`CRC não bate em ${nome}`);
    arquivos[nome] = dados;
    pos += 46 + tamNome + tamExtra + tamCom;
  }
  return arquivos;
}

// ───────────────────────────── HTML → markdown ─────────────────────────────

const BLOCOS_HTML = new Set(["p", "div", "section", "article", "header", "footer", "main", "aside", "nav",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "blockquote", "pre", "hr", "br", "figure", "figcaption", "dl", "dt", "dd", "address", "form", "fieldset"]);

/**
 * Converte o HTML das peças do sistema num markdown do subset aceito. Não é
 * um parser completo de HTML: cobre o que /proposta, /contrato e /documento
 * produzem (título, parágrafo, lista, tabela, negrito, link, citação, quebra).
 */
function htmlParaMarkdown(html) {
  let h = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    // menu de navegação, template e noscript são da página, não do documento
    .replace(/<(nav|noscript|template|dialog)\b[\s\S]*?<\/\1>/gi, "")
    // elemento escondido (aria-hidden="true" ou display:none inline) não vai pro Word.
    // Aproximação: corta até o primeiro fechamento da mesma tag; serve pra banner, modal e ícone decorativo
    .replace(/<([a-z][a-z0-9]*)\b[^>]*(?:aria-hidden\s*=\s*["']true["']|display\s*:\s*none)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(img|input|button|video|audio|iframe|canvas)\b[^>]*>/gi, "");

  const saida = [];
  let par = "";          // parágrafo em construção
  let emPre = false;
  const pilhaLista = [];
  let tabela = null;     // {linhas: [[célula]], atual: [], celula: ""}
  let emCitacao = false;
  let emTitulo = 0;
  let prefixoItem = null;
  let hrefAtual = null;  // destino do <a> aberto; null = fora de link

  function fecharPar() {
    let texto = par.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
    par = "";
    if (!texto) return;
    if (emTitulo) { saida.push(`${"#".repeat(Math.min(emTitulo, 3))} ${texto.replace(/\n/g, " ")}`, ""); return; }
    if (prefixoItem !== null) { saida.push(prefixoItem + texto.replace(/\n/g, " ")); prefixoItem = null; return; }
    if (emCitacao) { saida.push(...texto.split("\n").map((l) => `> ${l}`), ""); return; }
    saida.push(texto, "");
  }

  function textoCelula(t) { return t.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim(); }
  // dentro de célula, o texto e as marcas inline vão pra célula, não pro parágrafo
  const add = (t) => { if (tabela && tabela.atual) tabela.celula += t; else par += t; };

  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(h)) !== null) {
    if (m[3] !== undefined) {
      let t = decodificarEntidades(m[3]);
      if (emPre) { par += t; continue; }
      t = t.replace(/[\r\n\t]+/g, " ");
      if (tabela && tabela.atual) { tabela.celula += t; continue; }
      if (!t.trim() && !par) continue;
      par += t;
      continue;
    }

    const fecha = m[0][1] === "/";
    const tag = m[1].toLowerCase();
    const attrs = m[2] || "";

    if (emPre && !(fecha && tag === "pre")) { par += m[0]; continue; }

    const classes = (attrs.match(/class\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
    const estilo = (attrs.match(/style\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
    const quebraPagina = !fecha && (/\b(page-?break|quebra|nova-pagina|pagebreak)\b/i.test(classes) ||
      /(page-break|break)-(before|after)\s*:\s*(always|page)/i.test(estilo));
    if (quebraPagina && tag !== "br") { fecharPar(); saida.push("\\pagebreak", ""); }

    // ── inline ──
    if (tag === "strong" || tag === "b") { add("**"); continue; }
    if (tag === "em" || tag === "i") { add("*"); continue; }
    if (tag === "code" && !emPre) { add("`"); continue; }
    if (tag === "a") {
      if (fecha) { if (hrefAtual !== null) { add(hrefAtual ? `](${hrefAtual})` : ""); hrefAtual = null; } continue; }
      const href = (attrs.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
      // âncora sem destino útil (#, mailto vazio) vira texto simples
      hrefAtual = /^(https?:|mailto:.+|tel:.+|wa\.me)/i.test(href) ? href : "";
      if (hrefAtual) add("[");
      continue;
    }
    if (tag === "br") { if (tabela && tabela.atual) tabela.celula += " "; else par += "\n"; continue; }
    if (tag === "span" || tag === "small" || tag === "u" || tag === "mark" || tag === "sup" || tag === "sub" || tag === "label") continue;

    // ── tabela ──
    if (tag === "table") {
      fecharPar();
      if (!fecha) tabela = { linhas: [], atual: null, celula: "", cab: false };
      else if (tabela) {
        const linhas = tabela.linhas.filter((l) => l.length);
        if (linhas.length) {
          const colunas = Math.max(...linhas.map((l) => l.length));
          const norm = linhas.map((l) => { const c = l.slice(); while (c.length < colunas) c.push(""); return c; });
          saida.push(`| ${norm[0].join(" | ")} |`);
          saida.push(`|${norm[0].map(() => "---").join("|")}|`);
          for (const l of norm.slice(1)) saida.push(`| ${l.join(" | ")} |`);
          saida.push("");
        }
        tabela = null;
      }
      continue;
    }
    if (tabela) {
      if (tag === "tr") { if (!fecha) tabela.atual = []; else if (tabela.atual) { tabela.linhas.push(tabela.atual); tabela.atual = null; } continue; }
      if (tag === "td" || tag === "th") {
        if (!fecha) { tabela.celula = ""; if (!tabela.atual) tabela.atual = []; }
        else if (tabela.atual) { tabela.atual.push(textoCelula(tabela.celula)); tabela.celula = ""; }
        continue;
      }
      continue; // thead/tbody e o resto dentro da tabela
    }

    // ── blocos ──
    if (/^h[1-6]$/.test(tag)) { fecharPar(); emTitulo = fecha ? 0 : parseInt(tag[1]); continue; }
    if (tag === "ul" || tag === "ol") {
      fecharPar();
      if (!fecha) pilhaLista.push({ tipo: tag, n: 0 });
      else { pilhaLista.pop(); if (!pilhaLista.length) saida.push(""); }
      continue;
    }
    if (tag === "li") {
      fecharPar();
      if (!fecha && pilhaLista.length) {
        const topo = pilhaLista[pilhaLista.length - 1];
        topo.n++;
        const indent = "  ".repeat(pilhaLista.length - 1);
        prefixoItem = indent + (topo.tipo === "ol" ? `${topo.n}. ` : "- ");
      }
      continue;
    }
    if (tag === "blockquote") { fecharPar(); emCitacao = !fecha; continue; }
    if (tag === "pre") {
      if (!fecha) { fecharPar(); emPre = true; }
      else {
        emPre = false;
        const codigo = decodificarEntidades(par.replace(/<[^>]+>/g, "")).replace(/^\n+|\n+$/g, "");
        par = "";
        saida.push("```", codigo, "```", "");
      }
      continue;
    }
    if (tag === "hr") { fecharPar(); saida.push("---", ""); continue; }
    if (BLOCOS_HTML.has(tag)) { fecharPar(); continue; }
    // tag desconhecida: ignora, mantém o texto
  }
  fecharPar();

  return saida.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ───────────────────────────── markdown → blocos ─────────────────────────────

const MARCAS_QUEBRA = /^\s*(\\pagebreak|\\newpage|<!--\s*(quebra( de p[aá]gina)?|pagebreak|page-break)\s*-->|---\s*quebra\s*---)\s*$/i;

function markdownParaBlocos(md) {
  const linhas = md.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const blocos = [];
  let i = 0;

  // frontmatter YAML no topo
  if (linhas[0] && linhas[0].trim() === "---") {
    let j = 1;
    while (j < linhas.length && linhas[j].trim() !== "---") j++;
    if (j < linhas.length) i = j + 1;
  }

  let par = [];
  function fecharPar() {
    if (par.length) { blocos.push({ tipo: "p", texto: par.join("\n") }); par = []; }
  }

  while (i < linhas.length) {
    const linha = linhas[i];
    const t = linha.trim();

    if (!t) { fecharPar(); i++; continue; }

    if (MARCAS_QUEBRA.test(linha)) { fecharPar(); blocos.push({ tipo: "quebra" }); i++; continue; }

    if (/^```/.test(t)) {
      fecharPar();
      const corpo = [];
      i++;
      while (i < linhas.length && !/^```/.test(linhas[i].trim())) corpo.push(linhas[i++]);
      i++;
      blocos.push({ tipo: "codigo", linhas: corpo });
      continue;
    }

    const titulo = t.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (titulo) { fecharPar(); blocos.push({ tipo: "h", nivel: titulo[1].length, texto: titulo[2] }); i++; continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { fecharPar(); blocos.push({ tipo: "hr" }); i++; continue; }

    if (/^>/.test(t)) {
      fecharPar();
      const corpo = [];
      while (i < linhas.length && /^\s*>/.test(linhas[i])) corpo.push(linhas[i++].replace(/^\s*>\s?/, ""));
      // linha vazia dentro da citação separa parágrafos
      const paragrafos = corpo.join("\n").split(/\n\s*\n/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
      blocos.push({ tipo: "citacao", paragrafos });
      continue;
    }

    if (/^\|/.test(t) && i + 1 < linhas.length && /^\s*\|?\s*:?-{2,}/.test(linhas[i + 1])) {
      fecharPar();
      const linhasTab = [];
      while (i < linhas.length && /^\s*\|/.test(linhas[i])) linhasTab.push(linhas[i++]);
      const celulas = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
      const cab = celulas(linhasTab[0]);
      const alinh = celulas(linhasTab[1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-+:$/.test(c) ? "right" : "left"));
      const corpo = linhasTab.slice(2).map(celulas);
      blocos.push({ tipo: "tabela", cab, alinh, corpo });
      continue;
    }

    const item = linha.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      fecharPar();
      const pilha = [];   // indentações
      const itens = [];
      while (i < linhas.length) {
        const l = linhas[i];
        const it = l.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (it) {
          const indent = it[1].replace(/\t/g, "  ").length;
          while (pilha.length && indent < pilha[pilha.length - 1]) pilha.pop();
          if (!pilha.length || indent > pilha[pilha.length - 1]) pilha.push(indent);
          itens.push({ nivel: Math.min(pilha.length - 1, 2), ordenado: /\d/.test(it[2]), texto: it[3] });
          i++;
        } else if (l.trim() && /^\s+/.test(l) && itens.length) {
          itens[itens.length - 1].texto += " " + l.trim();   // continuação do item
          i++;
        } else break;
      }
      blocos.push({ tipo: "lista", itens });
      continue;
    }

    par.push(t);
    i++;
  }
  fecharPar();
  return blocos;
}

// ───────────────────────────── inline → runs ─────────────────────────────

/**
 * Quebra um trecho em runs: [{texto, b, i, code, link, br}].
 * Aceita **negrito**, *itálico*, _itálico_, `código`, [texto](url) e quebra de linha (\n).
 */
function parsearInline(texto) {
  const runs = [];
  let b = false, it = false, code = false;
  let atual = "";
  const flush = (link) => { if (atual) { runs.push({ texto: atual, b, i: it, code, link: link || null }); atual = ""; } };

  let s = texto;
  let k = 0;
  while (k < s.length) {
    const ch = s[k];
    if (ch === "\\" && k + 1 < s.length && /[*_`\\\[\]]/.test(s[k + 1])) { atual += s[k + 1]; k += 2; continue; }
    if (ch === "\n") { flush(); runs.push({ br: true }); k++; continue; }
    if (code) {
      if (ch === "`") { flush(); code = false; k++; continue; }
      atual += ch; k++; continue;
    }
    if (ch === "`") { flush(); code = true; k++; continue; }
    if (s.startsWith("**", k) || s.startsWith("__", k)) { flush(); b = !b; k += 2; continue; }
    if (ch === "*" || ch === "_") {
      const antes = k > 0 ? s[k - 1] : " ";
      const depois = k + 1 < s.length ? s[k + 1] : " ";
      // _ no meio de palavra (snake_case) e * solto entre espaços (5 * 3) são texto
      if (ch === "_" && /\w/.test(antes) && /\w/.test(depois)) { atual += ch; k++; continue; }
      if (ch === "*" && /\s/.test(antes) && /\s/.test(depois)) { atual += ch; k++; continue; }
      flush(); it = !it; k++; continue;
    }
    if (ch === "[") {
      const fim = s.indexOf("](", k);
      const fecha = fim > 0 ? s.indexOf(")", fim + 2) : -1;
      if (fim > 0 && fecha > 0 && !s.slice(k + 1, fim).includes("\n")) {
        flush();
        const rotulo = s.slice(k + 1, fim);
        const url = s.slice(fim + 2, fecha).trim();
        const sub = parsearInline(rotulo);
        for (const r of sub) { if (!r.br) { r.link = url; r.b = r.b || b; r.i = r.i || it; runs.push(r); } }
        k = fecha + 1;
        continue;
      }
    }
    atual += ch; k++;
  }
  flush();
  return runs;
}

// ───────────────────────────── XML do Word ─────────────────────────────

const NS_W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

/**
 * Um run. `extra` é {sz, b} opcional (tabela usa corpo menor e cabeçalho em negrito).
 * A ordem dentro de <w:rPr> segue o schema: rStyle, rFonts, b, bCs, i, iCs, sz, szCs, shd.
 */
function runXml(r, ctx, extra) {
  if (r.br) return "<w:r><w:br/></w:r>";
  const pr = [];
  if (r.code) pr.push(`<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>`);
  if (r.b || (extra && extra.b)) pr.push("<w:b/><w:bCs/>");
  if (r.i) pr.push("<w:i/><w:iCs/>");
  if (extra && extra.sz) pr.push(`<w:sz w:val="${extra.sz}"/><w:szCs w:val="${extra.sz}"/>`);
  if (r.code) pr.push(`<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>`);
  const rPr = pr.length ? `<w:rPr>${pr.join("")}</w:rPr>` : "";
  const texto = `<w:t xml:space="preserve">${esc(limparXml(r.texto))}</w:t>`;
  if (r.link) {
    const rid = ctx.link(r.link);
    return `<w:hyperlink r:id="${rid}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/>${pr.join("")}</w:rPr>${texto}</w:r></w:hyperlink>`;
  }
  return `<w:r>${rPr}${texto}</w:r>`;
}

function runsXml(texto, ctx, extra) {
  return parsearInline(texto).map((r) => runXml(r, ctx, extra)).join("");
}

function paragrafoXml(texto, ctx, pPr, extra) {
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${runsXml(texto, ctx, extra)}</w:p>`;
}

function tabelaXml(bloco, ctx) {
  const colunas = Math.max(bloco.cab.length, ...bloco.corpo.map((l) => l.length), 1);
  const larguraTotal = ctx.larguraUtil; // twips
  const larguraCol = Math.floor(larguraTotal / colunas);
  const jc = (a) => (a === "center" ? "center" : a === "right" ? "right" : "left");

  const celula = (texto, idx, cab) => {
    const pPr = `<w:spacing w:before="40" w:after="40"/><w:jc w:val="${jc(bloco.alinh[idx])}"/>`;
    const tcPr = `<w:tcPr><w:tcW w:w="${larguraCol}" w:type="dxa"/>${cab ? `<w:shd w:val="clear" w:color="auto" w:fill="${ctx.corTabela}"/>` : ""}<w:vAlign w:val="center"/></w:tcPr>`;
    return `<w:tc>${tcPr}${paragrafoXml(texto || "", ctx, pPr, { sz: 20, b: cab })}</w:tc>`;
  };
  const linha = (cels, cab) => {
    const c = cels.slice(); while (c.length < colunas) c.push("");
    return `<w:tr>${cab ? "<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>" : "<w:trPr><w:cantSplit/></w:trPr>"}${c.map((t, idx) => celula(t, idx, cab)).join("")}</w:tr>`;
  };

  const grid = Array.from({ length: colunas }, () => `<w:gridCol w:w="${larguraCol}"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TabelaContex"/><w:tblW w:w="5000" w:type="pct"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>` +
    `<w:tblGrid>${grid}</w:tblGrid>${linha(bloco.cab, true)}${bloco.corpo.map((l) => linha(l, false)).join("")}</w:tbl>` +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>`;
}

function blocosParaDocumento(blocos, ctx) {
  const partes = [];
  const stats = { titulos: 0, paragrafos: 0, listas: 0, itens: 0, tabelas: 0, quebras: 0, links: 0, codigo: 0, citacoes: 0 };

  for (const b of blocos) {
    switch (b.tipo) {
      case "h": {
        stats.titulos++;
        const nivel = Math.min(b.nivel, 3);
        partes.push(paragrafoXml(b.texto, ctx, `<w:pStyle w:val="Heading${nivel}"/>`));
        break;
      }
      case "p": {
        stats.paragrafos++;
        partes.push(paragrafoXml(b.texto, ctx));
        break;
      }
      case "lista": {
        stats.listas++;
        // cada lista numerada recomeça do 1: precisa de um w:num próprio
        let numOrdenado = null;
        for (const it of b.itens) {
          stats.itens++;
          let numId;
          if (it.ordenado) { if (numOrdenado === null) numOrdenado = ctx.novaNumeracao(); numId = numOrdenado; }
          else numId = ctx.numBullet;
          partes.push(paragrafoXml(it.texto, ctx, `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${it.nivel}"/><w:numId w:val="${numId}"/></w:numPr>`));
        }
        // parágrafo vazio curto depois da lista pra respirar
        partes.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr></w:p>`);
        break;
      }
      case "tabela": {
        stats.tabelas++;
        partes.push(tabelaXml(b, ctx));
        break;
      }
      case "citacao": {
        stats.citacoes++;
        for (const p of b.paragrafos) partes.push(paragrafoXml(p, ctx, `<w:pStyle w:val="Quote"/>`));
        break;
      }
      case "codigo": {
        stats.codigo++;
        const linhas = b.linhas.length ? b.linhas : [""];
        const runs = linhas.map((l, idx) => `${idx ? "<w:r><w:br/></w:r>" : ""}<w:r><w:t xml:space="preserve">${esc(limparXml(l))}</w:t></w:r>`).join("");
        partes.push(`<w:p><w:pPr><w:pStyle w:val="Codigo"/></w:pPr>${runs}</w:p>`);
        break;
      }
      case "hr":
        partes.push(`<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr><w:spacing w:before="120" w:after="240"/></w:pPr></w:p>`);
        break;
      case "quebra":
        stats.quebras++;
        partes.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
        break;
    }
  }
  stats.links = ctx.links.length;
  return { xml: partes.join(""), stats };
}

function documentoXml(corpo, ctx) {
  const pg = ctx.paisagem
    ? `<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>`
    : `<w:pgSz w:w="11906" w:h="16838"/>`;
  const refs = (ctx.temCabecalho ? `<w:headerReference w:type="default" r:id="rIdHeader"/>` : "") +
    (ctx.temRodape ? `<w:footerReference w:type="default" r:id="rIdFooter"/>` : "");
  const sect = `<w:sectPr>${refs}${pg}<w:pgMar w:top="${ctx.margem}" w:right="${ctx.margem}" w:bottom="${ctx.margem}" w:left="${ctx.margem}" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS_W}><w:body>${corpo}${sect}</w:body></w:document>`;
}

function stylesXml(ctx) {
  const f = esc(ctx.fonte);
  const fontes = `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}" w:eastAsia="${f}"/>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${NS_W}>
<w:docDefaults>
  <w:rPrDefault><w:rPr>${fontes}<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault>
  <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:color w:val="${ctx.corTexto}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
  <w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="480" w:after="200"/><w:outlineLvl w:val="0"/></w:pPr>
  <w:rPr><w:b/><w:bCs/><w:color w:val="${ctx.corTitulo}"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
  <w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="360" w:after="140"/><w:outlineLvl w:val="1"/></w:pPr>
  <w:rPr><w:b/><w:bCs/><w:color w:val="${ctx.corTitulo}"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
  <w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="100"/><w:outlineLvl w:val="2"/></w:pPr>
  <w:rPr><w:b/><w:bCs/><w:color w:val="${ctx.corTitulo}"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/>
  <w:pPr><w:spacing w:after="80"/><w:contextualSpacing/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/>
  <w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="12" w:color="${ctx.corTitulo}"/></w:pBdr><w:spacing w:before="120" w:after="200"/><w:ind w:left="567"/></w:pPr>
  <w:rPr><w:i/><w:iCs/><w:color w:val="404040"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Codigo"><w:name w:val="Codigo"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:spacing w:before="120" w:after="200" w:line="240" w:lineRule="auto"/><w:ind w:left="227" w:right="227"/></w:pPr>
  <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="BFBFBF"/></w:pBdr><w:spacing w:after="0"/></w:pPr>
  <w:rPr><w:color w:val="595959"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="BFBFBF"/></w:pBdr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr>
  <w:rPr><w:color w:val="595959"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="${ctx.corTitulo}"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
<w:style w:type="table" w:styleId="TabelaContex"><w:name w:val="Tabela Contex"/><w:basedOn w:val="TableNormal"/>
  <w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/></w:tblBorders>
  <w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;
}

function numberingXml(ctx) {
  const f = esc(ctx.fonte);
  const bullets = ["•", "◦", "▪"];
  const nivelBullet = (n) =>
    `<w:lvl w:ilvl="${n}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${bullets[n]}"/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${720 * (n + 1)}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:hint="default"/></w:rPr></w:lvl>`;
  const fmts = ["decimal", "lowerLetter", "lowerRoman"];
  const nivelNum = (n) =>
    `<w:lvl w:ilvl="${n}"><w:start w:val="1"/><w:numFmt w:val="${fmts[n]}"/><w:lvlText w:val="%${n + 1}."/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${720 * (n + 1)}" w:hanging="360"/></w:pPr></w:lvl>`;

  const nums = [`<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>`];
  for (let id = 2; id <= ctx.ultimoNum; id++) {
    nums.push(`<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${NS_W}>
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${[0, 1, 2].map(nivelBullet).join("")}</w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${[0, 1, 2].map(nivelNum).join("")}</w:abstractNum>
${nums.join("\n")}
</w:numbering>`;
}

function cabecalhoXml(texto) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:hdr ${NS_W}><w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr><w:r><w:t xml:space="preserve">${esc(limparXml(texto))}</w:t></w:r></w:p></w:hdr>`;
}

function rodapeXml(texto, comNumero) {
  const partes = [];
  if (texto) partes.push(`<w:r><w:t xml:space="preserve">${esc(limparXml(texto))}</w:t></w:r>`);
  if (comNumero) {
    if (texto) partes.push(`<w:r><w:t xml:space="preserve"> · </w:t></w:r>`);
    partes.push(`<w:r><w:t xml:space="preserve">Página </w:t></w:r>` +
      `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>` +
      `<w:r><w:t xml:space="preserve"> de </w:t></w:r>` +
      `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr ${NS_W}><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr>${partes.join("")}</w:p></w:ftr>`;
}

function contentTypesXml(ctx) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
${ctx.temCabecalho ? `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>\n` : ""}${ctx.temRodape ? `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>\n` : ""}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function relsRaiz() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function relsDocumento(ctx) {
  const base = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
  const linhas = [
    `<Relationship Id="rIdStyles" Type="${base}styles" Target="styles.xml"/>`,
    `<Relationship Id="rIdNumbering" Type="${base}numbering" Target="numbering.xml"/>`,
    `<Relationship Id="rIdSettings" Type="${base}settings" Target="settings.xml"/>`,
  ];
  if (ctx.temCabecalho) linhas.push(`<Relationship Id="rIdHeader" Type="${base}header" Target="header1.xml"/>`);
  if (ctx.temRodape) linhas.push(`<Relationship Id="rIdFooter" Type="${base}footer" Target="footer1.xml"/>`);
  ctx.links.forEach((url, idx) => {
    linhas.push(`<Relationship Id="rIdLink${idx + 1}" Type="${base}hyperlink" Target="${esc(limparXml(url))}" TargetMode="External"/>`);
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${linhas.join("\n")}\n</Relationships>`;
}

function settingsXml() {
  // Sem <w:updateFields>: PAGE e NUMPAGES o Word recalcula sozinho ao paginar, e
  // com updateFields ligado ele abre perguntando "este documento contém campos
  // que podem se referir a outros arquivos", que assusta quem recebe o contrato.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings ${NS_W}><w:defaultTabStop w:val="708"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
}

function coreXml(ctx) {
  const agora = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(limparXml(ctx.titulo))}</dc:title>
<dc:creator>${esc(limparXml(ctx.autor))}</dc:creator>
<cp:lastModifiedBy>${esc(limparXml(ctx.autor))}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${agora}</dcterms:modified>
</cp:coreProperties>`;
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Contex OS</Application></Properties>`;
}

// ───────────────────────────── tokens.css ─────────────────────────────

function lerTokens(arquivo) {
  const css = fs.readFileSync(arquivo, "utf8");
  const vars = {};
  for (const m of css.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  const resolver = (v, prof = 0) => {
    if (!v || prof > 5) return v;
    const ref = v.match(/^var\(--([a-zA-Z0-9_-]+)(?:,\s*([^)]+))?\)$/);
    if (ref) return resolver(vars[ref[1]] || ref[2], prof + 1);
    return v;
  };
  const cor = normalizarHex(resolver(vars.accent), null);

  // fonte: a de corpo vence a de título; tamanho, peso e mono não contam
  const nomeFonte = (val) => {
    const m = val && String(val).match(/^\s*["']?([^"',;]+)["']?/);
    if (!m) return null;
    const n = m[1].trim();
    if (!n || /^(var\(|inherit|initial|system-ui|sans-serif|serif|monospace|ui-|-apple)/i.test(n)) return null;
    if (/^[\d.]+(px|rem|em|pt|%)?$/i.test(n) || /^\d+$/.test(n)) return null;   // era --font-size
    return n;
  };
  const chaves = Object.keys(vars).filter((k) =>
    /^(font|fonte|ff|type|tipo)([-_]|$)/i.test(k) && !/(size|weight|line|height|leading|tracking|mono|code|fs-|escala|scale|peso|tamanho)/i.test(k));
  const prioridade = [/(corpo|body|base|text|texto|sans|serif|principal|primary)/i, /(family|familia)/i, /^(font|fonte|ff)$/i, /./];
  let fonte = null;
  for (const re of prioridade) {
    for (const k of chaves) {
      if (!re.test(k)) continue;
      const n = nomeFonte(resolver(vars[k]));
      if (n) { fonte = n; break; }
    }
    if (fonte) break;
  }
  return { cor, fonte };
}

// ───────────────────────────── fonte segura ─────────────────────────────

/** Fontes que existem no Word do Windows, no Mac com Office e no Google Docs. */
const FONTES_SEGURAS = ["Calibri", "Arial", "Georgia", "Verdana", "Trebuchet MS", "Cambria", "Times New Roman", "Helvetica", "Tahoma", "Garamond", "Book Antiqua", "Century Gothic", "Consolas", "Courier New"];

/**
 * Fonte da marca quase nunca está na máquina do cliente; o Word troca por outra
 * sem avisar. Aqui a troca é feita de propósito, pela parecida. Devolve
 * {fonte, trocada}: trocada=true quando o nome mudou.
 */
function fonteSegura(nome) {
  const n = String(nome || "").trim();
  if (!n) return { fonte: "Calibri", trocada: false };
  const igual = FONTES_SEGURAS.find((f) => f.toLowerCase() === n.toLowerCase());
  if (igual) return { fonte: igual, trocada: false };
  const mapa = [
    [/^(inter|dm sans|work sans|roboto|open sans|lato|nunito|source sans|ibm plex sans|figtree|manrope|plus jakarta|outfit|public sans|karla|rubik|mulish|hind)/i, "Calibri"],
    [/^(montserrat|poppins|syne|raleway|josefin|quicksand|urbanist|lexend|sora|red hat|barlow|oswald|bebas|anton|archivo)/i, "Verdana"],
    [/^(bricolage|space grotesk|geist|satoshi|general sans|cabinet|clash|switzer|neue|helvetica neue|sf pro|aeonik|gt )/i, "Arial"],
    [/^(playfair|instrument serif|lora|libre baskerville|cormorant|dm serif|fraunces|newsreader|crimson|eb garamond|spectral|literata|domine|prata|bodoni|didot|tiempos|freight)/i, "Georgia"],
    [/^(merriweather|source serif|ibm plex serif|pt serif|noto serif|roboto serif|charter|vollkorn|alegreya)/i, "Cambria"],
    [/(mono|code|courier)/i, "Consolas"],
    [/(sans|grotesk|grotesque)/i, "Calibri"],
    [/(serif)/i, "Georgia"],
  ];
  for (const [re, f] of mapa) if (re.test(n)) return { fonte: f, trocada: true };
  return { fonte: "Calibri", trocada: true };
}

// ───────────────────────────── extrair texto ─────────────────────────────

function desescaparXml(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/**
 * Lê um .docx (nosso ou do Word) e devolve {texto, alteracoes}. O texto é o
 * "aceitar tudo": inserção do controle de alterações entra, exclusão sai.
 * Tabela vira uma linha por fileira, células separadas por " | ", pra
 * comparar com diff sem ruído.
 */
function lerDocx(docx) {
  const zip = lerZip(fs.readFileSync(docx));
  const doc = zip["word/document.xml"];
  if (!doc) morrer(`${curto(docx)} não tem word/document.xml: não é um documento do Word.`);
  let xml = doc.toString("utf8");

  const alteracoes = {
    insercoes: (xml.match(/<w:ins\b/g) || []).length,
    exclusoes: (xml.match(/<w:del\b/g) || []).length,
    comentarios: zip["word/comments.xml"] ? (zip["word/comments.xml"].toString("utf8").match(/<w:comment\b/g) || []).length : 0,
  };

  xml = xml
    .replace(/<w:del\b[\s\S]*?<\/w:del>/g, "")                 // exclusão marcada: já saiu
    .replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/g, "") // código de campo (PAGE, TOC)
    .replace(/<w:delText\b[^>]*>[\s\S]*?<\/w:delText>/g, "")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<w:cr\/>/g, "\n");

  const textoDe = (trecho) => desescaparXml(trecho.replace(/<[^>]+>/g, ""));

  // tabela: cada <w:tr> vira uma linha, células com " | "
  xml = xml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (tr) => {
    const cels = [];
    tr.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (tc) => { cels.push(textoDe(tc.replace(/<\/w:p>/g, " ")).replace(/\s+/g, " ").trim()); return ""; });
    return `<w:p>${esc(cels.join(" | "))}</w:p>`;
  });

  // título (nosso Heading1-3 ou o "Título 1" do Word em qualquer idioma) ganha "## " na frente, pra localizar a cláusula no diff
  xml = xml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?<w:pStyle w:val="(?:Heading|Ttulo|Titulo|Title|berschrift|Titre|Encabezado)\d?"\/>/g, (m) => m.replace(/^(<w:p\b[^>]*>)/, "$1## "));
  const texto = textoDe(xml.replace(/<\/w:p>/g, "\n"))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
  return { texto, alteracoes };
}

function extrairTexto(docx) {
  const { texto, alteracoes } = lerDocx(docx);
  if (alteracoes.insercoes || alteracoes.exclusoes || alteracoes.comentarios) {
    console.error(`(controle de alterações: ${alteracoes.insercoes} inserção(ões), ${alteracoes.exclusoes} exclusão(ões); ${alteracoes.comentarios} comentário(s). O texto abaixo é com tudo aceito.)`);
  }
  return texto;
}

// ───────────────────────────── comparar dois .docx ─────────────────────────────

const PALAVRAS_SENSIVEIS = /\b(R\$|valor|pre[çc]o|parcela|reajuste|prazo|dias?|entrega|multa|juros|mora|cancel|rescis|desist|propriedade|direito|autoral|cess[ãa]o|licen[çc]|exclusiv|garantia|responsab|indeniz|confidenc|dados pessoais|LGPD|foro|vig[êe]ncia|renova|revis[õo]es)/i;

/** Diff por linha (LCS). Devolve [{tipo: "=", "-", "+", linha}]. */
function diffLinhas(a, b) {
  const n = a.length, m = b.length;
  const tab = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    tab[i][j] = a[i] === b[j] ? tab[i + 1][j + 1] + 1 : Math.max(tab[i + 1][j], tab[i][j + 1]);
  const saida = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { saida.push({ tipo: "=", linha: a[i] }); i++; j++; }
    else if (tab[i + 1][j] >= tab[i][j + 1]) saida.push({ tipo: "-", linha: a[i++] });
    else saida.push({ tipo: "+", linha: b[j++] });
  }
  while (i < n) saida.push({ tipo: "-", linha: a[i++] });
  while (j < m) saida.push({ tipo: "+", linha: b[j++] });
  return saida;
}

function compararDocx(enviado, devolvido) {
  const A = lerDocx(enviado), B = lerDocx(devolvido);
  const la = A.texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const lb = B.texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const d = diffLinhas(la, lb);

  const removidas = d.filter((x) => x.tipo === "-").length;
  const inseridas = d.filter((x) => x.tipo === "+").length;
  console.log(`Comparando ${curto(enviado)} (enviado) com ${curto(devolvido)} (devolvido)`);
  if (B.alteracoes.insercoes || B.alteracoes.exclusoes || B.alteracoes.comentarios) {
    console.log(`  o devolvido usa controle de alterações: ${B.alteracoes.insercoes} inserção(ões), ${B.alteracoes.exclusoes} exclusão(ões), ${B.alteracoes.comentarios} comentário(s). Abaixo, o texto com tudo aceito.`);
  } else if (B.alteracoes.comentarios === 0) {
    console.log("  o devolvido não usa controle de alterações: só o diff mostra o que mudou.");
  }
  if (!removidas && !inseridas) { console.log("\n✓ O texto é idêntico. Nada mudou.\n"); return 0; }

  console.log(`\n${removidas} linha(s) saíram, ${inseridas} entraram. Título mais próximo acima de cada mudança, pra achar a cláusula:\n`);
  let ultimoTitulo = "(início)";
  let sensiveis = 0;
  for (let k = 0; k < d.length; k++) {
    const x = d[k];
    const ehTitulo = /^## /.test(x.linha) || (x.linha.length < 60 && /^(cl[áa]usula\s+\d|\d+(\.\d+)*\s*[-–.)]\s+\S)/i.test(x.linha) && !/[.;:,]$/.test(x.linha));
    if (x.tipo === "=") { if (ehTitulo) ultimoTitulo = x.linha.replace(/^## /, ""); continue; }
    const marca = PALAVRAS_SENSIVEIS.test(x.linha) ? "  ⚠ " : "    ";
    if (marca.trim()) sensiveis++;
    const anterior = k === 0 || d[k - 1].tipo === "=";
    if (anterior) console.log(`  [${ultimoTitulo}]`);
    console.log(`${marca}${x.tipo === "-" ? "saiu:  " : "entrou:"} ${x.linha.replace(/^## /, "")}`);
    if (ehTitulo && x.tipo === "+") ultimoTitulo = x.linha.replace(/^## /, "");
  }
  console.log(`\n${sensiveis ? `⚠ ${sensiveis} mudança(s) tocam em valor, prazo, multa, cancelamento, propriedade ou garantia. Decide com o /contrato aberto, e com o advogado quando for delicado.` : "Nenhuma mudança toca em valor, prazo, multa, cancelamento ou propriedade."}`);
  console.log("Alteração aceita vai pro original (.md ou .html) e se exporta de novo. O .docx devolvido não vira o original.\n");
  return 0;
}

// ───────────────────────────── conferência ─────────────────────────────

function acharSoffice() {
  const candidatos = process.platform === "darwin"
    ? ["/Applications/LibreOffice.app/Contents/MacOS/soffice"]
    : process.platform === "win32"
      ? ["C:\\Program Files\\LibreOffice\\program\\soffice.exe", "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"]
      : ["/usr/bin/soffice", "/usr/bin/libreoffice", "/snap/bin/libreoffice", "/usr/local/bin/soffice"];
  for (const p of candidatos) if (fs.existsSync(p)) return p;
  try {
    const achado = execSync("command -v soffice || command -v libreoffice", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (achado) return achado.split("\n")[0];
  } catch {}
  return null;
}

function conferir(saida, ctx, opts) {
  const buf = fs.readFileSync(saida);
  const kb = Math.round(buf.length / 1024);
  let entradas;
  try { entradas = lerZip(buf); } catch (e) { morrer(`O arquivo gerado não abre como zip: ${e.message}`); }

  const obrigatorios = ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/_rels/document.xml.rels"];
  const faltando = obrigatorios.filter((n) => !entradas[n]);
  if (faltando.length) morrer(`Faltou parte obrigatória no .docx: ${faltando.join(", ")}`);
  for (const [nome, dados] of Object.entries(entradas)) {
    const txt = dados.toString("utf8");
    if (!txt.startsWith("<?xml")) morrer(`${nome} não começa com <?xml`);
    // conferência barata de balanceamento: cada abertura tem fechamento
    const abre = (txt.match(/<w:p[ >]/g) || []).length;
    const fecha = (txt.match(/<\/w:p>/g) || []).length;
    if (abre !== fecha) morrer(`${nome}: ${abre} <w:p> abertos e ${fecha} fechados`);
  }
  console.log(`✓ ${curto(saida)} — ${kb} KB, ${Object.keys(entradas).length} partes, zip e XML íntegros`);

  // prova externa, quando a máquina tem com quê
  let provou = false;
  if (opts.pdf) {
    const soffice = acharSoffice();
    if (!soffice) {
      console.log("  – LibreOffice não encontrado: pulei a conversão pra PDF.");
    } else {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contexos-docx-"));
      try {
        execFileSync(soffice, ["--headless", "--convert-to", "pdf", "--outdir", dir, saida], { stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
        const pdf = path.join(dir, path.basename(saida).replace(/\.docx$/i, ".pdf"));
        if (fs.existsSync(pdf)) {
          const txt = fs.readFileSync(pdf).toString("latin1");
          const paginas = (txt.match(/\/Type\s*\/Page[^s]/g) || []).length;
          // fica na pasta temporária de propósito: um segundo PDF ao lado da proposta vira "qual dos dois eu mando?"
          console.log(`  ✓ LibreOffice abriu e converteu: ${paginas} página(s). Prova em ${pdf} (só pra olhar; o PDF de entrega é o do gerar-pdf.js)`);
          provou = true;
        } else console.log("  ✖ LibreOffice rodou mas não gerou PDF");
      } catch (e) {
        console.log(`  ✖ LibreOffice falhou: ${(e.stderr || "").toString().slice(0, 200)}`);
      }
    }
  }
  if (!provou && process.platform === "darwin" && fs.existsSync("/usr/bin/textutil")) {
    try {
      const txt = execFileSync("/usr/bin/textutil", ["-convert", "txt", "-stdout", saida], { stdio: ["ignore", "pipe", "ignore"], timeout: 60000 }).toString("utf8");
      const palavras = txt.split(/\s+/).filter(Boolean).length;
      if (palavras > 0) console.log(`  ✓ o macOS abriu o arquivo e leu ${palavras} palavras`);
      else console.log("  ✖ o macOS abriu o arquivo mas não leu texto nenhum");
    } catch { console.log("  – não consegui abrir com o textutil do macOS (não impede o uso)"); }
  }
}

// ───────────────────────────── main ─────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const opts = { fonte: null, corTitulo: null, cabecalho: null, rodape: null, semNumero: false, paisagem: false, tokens: null, titulo: null, autor: null, salvarMd: false, pdf: false, texto: false, comparar: false };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--fonte") opts.fonte = args[++i];
    else if (a === "--cor-titulo") opts.corTitulo = args[++i];
    else if (a === "--cabecalho") opts.cabecalho = args[++i];
    else if (a === "--rodape") opts.rodape = args[++i];
    else if (a === "--sem-numero") opts.semNumero = true;
    else if (a === "--paisagem") opts.paisagem = true;
    else if (a === "--tokens") opts.tokens = args[++i];
    else if (a === "--titulo") opts.titulo = args[++i];
    else if (a === "--autor") opts.autor = args[++i];
    else if (a === "--salvar-md") opts.salvarMd = true;
    else if (a === "--pdf") opts.pdf = true;
    else if (a === "--texto") opts.texto = true;
    else if (a === "--comparar") opts.comparar = true;
    else if (a === "--ajuda" || a === "-h" || a === "--help") { console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^\/\*\*\n/, "").replace(/^ \* ?/gm, "")); return; }
    else if (a.startsWith("--")) morrer(`Opção desconhecida: ${a}`, "Válidas: --fonte, --cor-titulo, --cabecalho, --rodape, --sem-numero, --paisagem, --tokens, --titulo, --autor, --salvar-md, --pdf, --texto, --comparar");
    else pos.push(a);
  }

  if (opts.comparar) {
    if (pos.length !== 2) morrer("--comparar espera dois arquivos: o enviado e o devolvido.", "Exemplo:\n  node scripts/gerar-docx.js --comparar contratos/padaria-2026-03-04/contrato.docx dados/contrato-devolvido.docx");
    for (const f of pos) {
      if (!fs.existsSync(path.resolve(f))) morrer(`Não achei o arquivo: ${f}`);
      if (!/\.docx$/i.test(f)) morrer(`--comparar espera .docx, e ${f} não é.`);
    }
    process.exit(compararDocx(path.resolve(pos[0]), path.resolve(pos[1])));
  }

  const entrada = pos[0];
  if (!entrada) morrer("Faltou o arquivo de origem.", "Exemplo:\n  node scripts/gerar-docx.js propostas/padaria-2026-03-04.html --cabecalho \"Studio Ana\"");
  const entradaAbs = path.resolve(entrada);
  if (!fs.existsSync(entradaAbs)) morrer(`Não achei o arquivo: ${entrada}`, `Procurei em ${entradaAbs}`);

  if (opts.texto) {
    if (!/\.docx$/i.test(entradaAbs)) morrer("--texto espera um arquivo .docx.");
    process.stdout.write(extrairTexto(entradaAbs));
    return;
  }

  const ehHtml = /\.html?$/i.test(entradaAbs);
  const ehMd = /\.(md|markdown|txt)$/i.test(entradaAbs);
  if (!ehHtml && !ehMd) morrer("A origem precisa ser .md, .txt ou .html.", "Pra extrair texto de um .docx, use --texto.");

  let md = fs.readFileSync(entradaAbs, "utf8");
  if (ehHtml) {
    md = htmlParaMarkdown(md);
    if (opts.salvarMd) {
      const destinoMd = entradaAbs.replace(/\.html?$/i, ".md");
      fs.writeFileSync(destinoMd, md);
      console.log(`→ markdown intermediário salvo em ${curto(destinoMd)}`);
    }
  }
  if (!md.trim()) morrer("A origem está vazia (ou o HTML não tem texto fora de script e estilo).");

  const saida = path.resolve(pos[1] || entradaAbs.replace(/\.(html?|md|markdown|txt)$/i, ".docx"));

  // identidade
  let tokens = { cor: null, fonte: null };
  if (opts.tokens) {
    const tAbs = path.resolve(opts.tokens);
    if (!fs.existsSync(tAbs)) morrer(`Não achei o tokens.css: ${opts.tokens}`);
    tokens = lerTokens(tAbs);
    console.log(`→ tokens: cor de título ${tokens.cor ? "#" + tokens.cor : "não achei --accent"}, fonte ${tokens.fonte || "não declarada"}`);
  }
  const corTitulo = normalizarHex(opts.corTitulo || (tokens.cor && "#" + tokens.cor), "1A1A1A");
  if (!corTitulo) morrer(`Cor de título inválida: ${opts.corTitulo}`, "Use hexadecimal, ex.: --cor-titulo \"#1F3A5F\"");

  // fonte: --fonte manda; sem ela, a do tokens.css trocada pela substituta segura
  let fonte;
  if (opts.fonte && opts.fonte.trim()) {
    fonte = opts.fonte.trim();
    const seg = fonteSegura(fonte);
    if (seg.trocada) console.log(`  – "${fonte}" não costuma existir na máquina de quem abre; o Word vai trocar por outra sem avisar. Substituta parecida e segura: ${seg.fonte}`);
  } else if (tokens.fonte) {
    const seg = fonteSegura(tokens.fonte);
    fonte = seg.fonte;
    if (seg.trocada) console.log(`→ fonte da marca "${tokens.fonte}" não existe na máquina do cliente: usando ${fonte} (passe --fonte pra escolher outra)`);
  } else fonte = "Calibri";

  const blocos = markdownParaBlocos(md);
  if (!blocos.length) morrer("Não achei nenhum bloco de conteúdo na origem.");
  const primeiroH1 = blocos.find((b) => b.tipo === "h" && b.nivel === 1);

  const ctx = {
    fonte,
    corTitulo,
    corTexto: "1A1A1A",
    corTabela: "F2F2F2",
    paisagem: opts.paisagem,
    margem: 1134, // 2 cm
    larguraUtil: (opts.paisagem ? 16838 : 11906) - 2 * 1134,
    temCabecalho: !!(opts.cabecalho && opts.cabecalho.trim()),
    temRodape: !!((opts.rodape && opts.rodape.trim()) || !opts.semNumero),
    titulo: opts.titulo || (primeiroH1 ? primeiroH1.texto.replace(/[*_`]/g, "") : path.basename(saida, ".docx")),
    autor: opts.autor || (opts.cabecalho && opts.cabecalho.trim()) || "Contex OS",
    links: [],
    numBullet: 1,
    ultimoNum: 1,
    link(url) { let idx = this.links.indexOf(url); if (idx < 0) { this.links.push(url); idx = this.links.length - 1; } return `rIdLink${idx + 1}`; },
    novaNumeracao() { this.ultimoNum++; return this.ultimoNum; },
  };

  // placeholder não sai no Word: em contrato, campo em branco na frente de quem assina é constrangimento
  const placeholders = md.match(/\[(a confirmar|a definir|preencher[^\]]*|seu[^\]]*|sua[^\]]*|valor[^\]]*|pre[çc]o[^\]]*|prazo[^\]]*|nome[^\]]*|cliente[^\]]*|empresa[^\]]*|cnpj[^\]]*|cpf[^\]]*|endere[çc]o[^\]]*|data[^\]]*|xxx+|\?\?+)\](?!\()/gi) || [];
  const soltos = md.match(/(^|[\s(])(XXX+|TBD|TODO|lorem ipsum)(?=[\s).,;:]|$)/gim) || [];
  const achados = [...new Set([...placeholders, ...soltos.map((x) => x.trim())])];
  if (achados.length) {
    morrer(`Tem placeholder no texto e o .docx não foi gravado: ${achados.slice(0, 6).join(", ")}${achados.length > 6 ? ` e mais ${achados.length - 6}` : ""}`,
      `Resolva no original (${curto(entradaAbs)}) e gere de novo. Corrigir no Word não adianta: a próxima exportação apaga.`);
  }

  const { xml: corpo, stats } = blocosParaDocumento(blocos, ctx);

  const entradas = [
    { nome: "[Content_Types].xml", conteudo: contentTypesXml(ctx) },
    { nome: "_rels/.rels", conteudo: relsRaiz() },
    { nome: "docProps/core.xml", conteudo: coreXml(ctx) },
    { nome: "docProps/app.xml", conteudo: appXml() },
    { nome: "word/document.xml", conteudo: documentoXml(corpo, ctx) },
    { nome: "word/styles.xml", conteudo: stylesXml(ctx) },
    { nome: "word/numbering.xml", conteudo: numberingXml(ctx) },
    { nome: "word/settings.xml", conteudo: settingsXml() },
    { nome: "word/_rels/document.xml.rels", conteudo: relsDocumento(ctx) },
  ];
  if (ctx.temCabecalho) entradas.push({ nome: "word/header1.xml", conteudo: cabecalhoXml(opts.cabecalho.trim()) });
  if (ctx.temRodape) entradas.push({ nome: "word/footer1.xml", conteudo: rodapeXml((opts.rodape || "").trim(), !opts.semNumero) });

  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, montarZip(entradas));

  console.log(`→ ${curto(entradaAbs)} → ${curto(saida)}`);
  console.log(`→ fonte ${fonte}, títulos #${corTitulo}, ${opts.paisagem ? "paisagem" : "retrato"} A4` +
    `${ctx.temCabecalho ? `, cabeçalho "${opts.cabecalho.trim()}"` : ""}${ctx.temRodape ? `, rodapé${opts.rodape ? ` "${opts.rodape.trim()}"` : ""}${opts.semNumero ? "" : " com Página X de Y"}` : ""}`);
  console.log(`  ${stats.titulos} título(s), ${stats.paragrafos} parágrafo(s), ${stats.listas} lista(s) com ${stats.itens} item(ns), ${stats.tabelas} tabela(s), ${stats.links} link(s), ${stats.quebras} quebra(s) de página` +
    `${stats.citacoes ? `, ${stats.citacoes} citação(ões)` : ""}${stats.codigo ? `, ${stats.codigo} bloco(s) de código` : ""}`);

  conferir(saida, ctx, opts);

  const colunasMax = blocos.filter((b) => b.tipo === "tabela").reduce((m, b) => Math.max(m, b.cab.length), 0);
  if (colunasMax > 5 && !opts.paisagem) console.log(`  – tabela com ${colunasMax} colunas em retrato costuma apertar: veja se --paisagem fica melhor`);
  if (!ctx.temCabecalho) console.log("  – sem cabeçalho: passe --cabecalho \"Nome do negócio\" pra ele aparecer em toda página");

  console.log("  Abra no Word ou no Google Docs antes de enviar: fonte que não existe na máquina vira outra,");
  console.log("  tabela larga pode quebrar. O PDF continua sendo a versão final; o .docx é a editável.");
}

main();
