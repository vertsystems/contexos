#!/usr/bin/env node
/**
 * Contex OS — gerar-planilha.js
 * Escreve planilha Excel de verdade (.xlsx) a partir de uma especificação em
 * JSON, e lê .xlsx/.csv que já existem.
 *
 * Existe porque "planilha" entregue como tabela em markdown ou CSV não é
 * planilha: não tem fórmula, o total não recalcula quando o usuário muda um
 * número, a data vira texto e a moeda perde o formato. O usuário quer abrir no
 * Excel, no Numbers ou no Google Planilhas e ver cabeçalho fixo, R$ formatado e
 * um SUM que funciona. Isto aqui monta o arquivo peça por peça (o .xlsx é um
 * zip com XML dentro) sem instalar nada: o deflate vem do zlib do próprio Node
 * e o CRC32 está implementado abaixo.
 *
 * Uso:
 *   node scripts/gerar-planilha.js <spec.json> [saida.xlsx]
 *   node scripts/gerar-planilha.js --ler <arquivo.xlsx|.csv> [--aba N] [--json] [--csv] [--spec]
 *   node scripts/gerar-planilha.js --exemplo [arquivo.json]
 *
 * Opções de geração:
 *   --sobrescrever      substitui o .xlsx se já existir (o padrão é recusar)
 *   --silencioso        só imprime erro
 *
 * Opções de leitura (--ler):
 *   --aba <N|nome>      só essa aba (número a partir de 1, ou o nome)
 *   --json              imprime tudo em JSON (valores, fórmulas e tipos)
 *   --csv [pasta]       grava um CSV por aba (separador ";" e vírgula decimal, como o Excel em português abre)
 *   --spec              imprime a especificação JSON equivalente, pra editar e gerar de novo
 *   --formulas          lista toda célula com fórmula
 *   --linhas <N>        quantas linhas mostrar no resumo (padrão: 8)
 *
 * O que a especificação aceita está documentado em templates/operacao/planilha.md.
 * O essencial: abas, cada uma com colunas (título, tipo, largura, fórmula por
 * linha, opções de lista suspensa), linhas de dado, totais no rodapé, linhas
 * extras em branco já formatadas, cabeçalho congelado e filtro. Tipos: texto,
 * numero, inteiro, moeda, percentual, data. Célula que começa com "=" é fórmula;
 * pode ser escrita em português (SOMA, SE, MÉDIA, com ";") que o script traduz.
 * Na fórmula, {n} é a linha atual, {primeira}/{ultima} a faixa de dado da aba,
 * e {Pedidos.primeira}/{Pedidos.ultima} a faixa de outra aba.
 *
 * As fórmulas são calculadas aqui também e gravadas como valor em cache: SOMA,
 * MÉDIA, MÍN, MÁX, contagens, SE e SEERRO (só o ramo escolhido é calculado),
 * E, OU, ARRED, SOMASE(S), CONT.SE(S), SOMARPRODUTO, PROCV e CORRESP exatos,
 * ÍNDICE, texto, datas, aritmética e referência entre abas. Assim a
 * pré-visualização do Finder e o preview do Drive mostram o total, e o script
 * imprime os totais pra conferir no chat. O que ele não sabe calcular vai sem
 * cache e o Excel calcula ao abrir (fullCalcOnLoad); o que dá erro (#VALUE!,
 * #DIV/0!) é gravado como erro e apontado no relatório, com a célula de origem.
 *
 * Testado abrindo o zip com python3 (zipfile.testzip) e validando cada XML com
 * xml.dom.minidom. Nesta máquina não há LibreOffice (soffice), então a prova de
 * abertura foi feita relendo o arquivo com o próprio --ler e com o zipfile do
 * Python; a estrutura segue o padrão ECMA-376 que Excel, Numbers e Google
 * Planilhas leem. Se o usuário disser que não abriu, o primeiro teste é:
 *   python3 -c "import zipfile; z=zipfile.ZipFile('arquivo.xlsx'); print(z.testzip())"
 *
 * Node 18+, sem dependência de npm.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ─────────────────────────── utilidades ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

let SILENCIOSO = false;
function dizer(msg) { if (!SILENCIOSO) console.log(msg); }

function escXml(s) {
  return String(s)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // caractere de controle não pode ir no XML
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function desXml(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** 1 → A, 26 → Z, 27 → AA */
function letraCol(n) {
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
/** A → 1, AA → 27 */
function numCol(letras) {
  let n = 0;
  for (const ch of letras.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function refCelula(col, linha) { return `${letraCol(col)}${linha}`; }
function separarRef(ref) {
  const m = ref.replace(/\$/g, "").match(/^([A-Z]{1,3})(\d+)$/i);
  if (!m) throw new Error(`referência inválida: ${ref}`);
  return { col: numCol(m[1]), linha: parseInt(m[2], 10) };
}

/** Número em formato brasileiro ("1.234,56", "R$ 90", "15%") → número, ou null. */
function parseNumeroBR(s) {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (typeof s !== "string") return null;
  let t = s.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!t) return null;
  let pct = false;
  if (t.endsWith("%")) { pct = true; t = t.slice(0, -1); }
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (/^-/.test(t)) { neg = !neg; t = t.slice(1); }
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, "");
  else if (/^\d+,\d+$/.test(t)) t = t.replace(",", ".");
  else if (!/^\d*\.?\d+$/.test(t)) return null;
  let n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  if (neg) n = -n;
  if (pct) n = n / 100;
  return n;
}

/** "2026-09-18", "18/09/2026" ou Date → serial do Excel (dias desde 1899-12-30). */
function serialData(v) {
  let y, m, d;
  if (v instanceof Date) { y = v.getFullYear(); m = v.getMonth() + 1; d = v.getDate(); }
  else if (typeof v === "string") {
    let mm = v.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (mm) { y = +mm[1]; m = +mm[2]; d = +mm[3]; }
    else {
      mm = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (!mm) return null;
      d = +mm[1]; m = +mm[2]; y = +mm[3]; if (y < 100) y += 2000;
    }
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 9999) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null; // 31/02 não existe
  return Math.round((dt.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
}
function dataDoSerial(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function fmtBR(n, casas = 2) {
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// ─────────────────────────── CRC32 + ZIP ───────────────────────────

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDataHora(d = new Date()) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { hora, data };
}

/** Monta um zip (deflate) a partir de [{nome, conteudo}]. */
function zipar(entradas) {
  const locais = [];
  const centrais = [];
  let offset = 0;
  const { hora, data } = dosDataHora();
  for (const { nome, conteudo } of entradas) {
    const nomeBuf = Buffer.from(nome, "utf8");
    const dados = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo, "utf8");
    const crc = crc32(dados);
    let comp = zlib.deflateRawSync(dados, { level: 9 });
    let metodo = 8;
    if (comp.length >= dados.length) { comp = dados; metodo = 0; }

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);        // bit 11: nome em UTF-8
    local.writeUInt16LE(metodo, 8);
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(data, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locais.push(local, nomeBuf, comp);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(metodo, 10);
    central.writeUInt16LE(hora, 12);
    central.writeUInt16LE(data, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nomeBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrais.push(central, nomeBuf);

    offset += local.length + nomeBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(0, 4);
  fim.writeUInt16LE(0, 6);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(cd.length, 12);
  fim.writeUInt32LE(offset, 16);
  fim.writeUInt16LE(0, 20);
  return Buffer.concat([...locais, cd, fim]);
}

/** Lê um zip inteiro → Map(nome → Buffer). */
function deszipar(buf) {
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error("não é um arquivo zip (fim do diretório central não encontrado)");
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const arquivos = new Map();
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("diretório central corrompido");
    const metodo = buf.readUInt16LE(p + 10);
    const crcEsperado = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const offLocal = buf.readUInt32LE(p + 42);
    const nome = buf.slice(p + 46, p + 46 + nlen).toString("utf8");
    p += 46 + nlen + elen + clen;

    if (buf.readUInt32LE(offLocal) !== 0x04034b50) throw new Error(`cabeçalho local corrompido em ${nome}`);
    const nlenL = buf.readUInt16LE(offLocal + 26);
    const elenL = buf.readUInt16LE(offLocal + 28);
    const ini = offLocal + 30 + nlenL + elenL;
    const comp = buf.slice(ini, ini + csize);
    let dados;
    if (metodo === 8) dados = zlib.inflateRawSync(comp);
    else if (metodo === 0) dados = comp;
    else throw new Error(`método de compressão ${metodo} não suportado em ${nome}`);
    if (dados.length !== usize) throw new Error(`tamanho não confere em ${nome}`);
    if (crc32(dados) !== crcEsperado) throw new Error(`CRC não confere em ${nome}`);
    arquivos.set(nome, dados);
  }
  return arquivos;
}

// ─────────────────────────── fórmulas: tradução PT → EN ───────────────────────────

const FUNCOES_PT = {
  "SOMA": "SUM", "MÉDIA": "AVERAGE", "MEDIA": "AVERAGE", "SE": "IF", "SEERRO": "IFERROR",
  "MÁXIMO": "MAX", "MAXIMO": "MAX", "MÍNIMO": "MIN", "MINIMO": "MIN",
  "CONT.NÚM": "COUNT", "CONT.NUM": "COUNT", "CONT.VALORES": "COUNTA", "CONT.SE": "COUNTIF",
  "SOMASE": "SUMIF", "SOMASES": "SUMIFS", "CONT.SES": "COUNTIFS", "MÉDIASE": "AVERAGEIF",
  "ARRED": "ROUND", "ARREDONDAR.PARA.CIMA": "ROUNDUP", "ARREDONDAR.PARA.BAIXO": "ROUNDDOWN",
  "PROCV": "VLOOKUP", "PROCH": "HLOOKUP", "PROCX": "XLOOKUP", "CORRESP": "MATCH", "ÍNDICE": "INDEX", "INDICE": "INDEX",
  "HOJE": "TODAY", "AGORA": "NOW", "DIA": "DAY", "MÊS": "MONTH", "MES": "MONTH", "ANO": "YEAR",
  "DATA": "DATE", "DIAS": "DAYS", "DIA.DA.SEMANA": "WEEKDAY", "DIATRABALHOTOTAL": "NETWORKDAYS",
  "CONCATENAR": "CONCATENATE", "CONCAT": "CONCAT", "TEXTO": "TEXT", "ESQUERDA": "LEFT", "DIREITA": "RIGHT",
  "EXT.TEXTO": "MID", "NÚM.CARACT": "LEN", "NUM.CARACT": "LEN", "MAIÚSCULA": "UPPER", "MINÚSCULA": "LOWER", "ARRUMAR": "TRIM",
  "E": "AND", "OU": "OR", "NÃO": "NOT", "NAO": "NOT", "VERDADEIRO": "TRUE", "FALSO": "FALSE",
  "ABS": "ABS", "INT": "INT", "MOD": "MOD", "RAIZ": "SQRT", "POTÊNCIA": "POWER", "POTENCIA": "POWER",
  "SOMARPRODUTO": "SUMPRODUCT", "ÉCÉL.VAZIA": "ISBLANK", "ECEL.VAZIA": "ISBLANK", "É.NÃO.DISP": "ISNA", "CONT.VAZIAS": "COUNTBLANK",
  "MAIOR": "LARGE", "MENOR": "SMALL", "ORDEM": "RANK", "TRUNCAR": "TRUNC",
};

/**
 * Normaliza a fórmula pro formato que o arquivo exige: nome em inglês e vírgula
 * como separador de argumento. Se a fórmula usa ";" (jeito brasileiro), a
 * vírgula entre dígitos é decimal e vira ponto. Ignora o que está entre aspas.
 */
function normalizarFormula(f) {
  let s = String(f).trim();
  if (s.startsWith("=")) s = s.slice(1);
  const partes = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') {
      let j = i + 1;
      while (j < s.length) { if (s[j] === '"') { if (s[j + 1] === '"') { j += 2; continue; } break; } j++; }
      partes.push({ str: true, t: s.slice(i, j + 1) }); i = j + 1;
    } else {
      let j = i;
      while (j < s.length && s[j] !== '"') j++;
      partes.push({ str: false, t: s.slice(i, j) }); i = j;
    }
  }
  const usaPontoVirgula = partes.some((p) => !p.str && p.t.includes(";"));
  return partes.map((p) => {
    if (p.str) return p.t;
    let t = p.t;
    if (usaPontoVirgula) t = t.replace(/(\d),(\d)/g, "$1.$2").replace(/;/g, ",");
    t = t.replace(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.]*)\s*\(/g, (m, nome) => {
      const up = nome.toUpperCase();
      return (FUNCOES_PT[up] || up) + "(";
    });
    t = t.replace(/\b(VERDADEIRO|FALSO)\b/gi, (m) => FUNCOES_PT[m.toUpperCase()]);
    return t;
  }).join("");
}

// ─────────────────────────── fórmulas: avaliador ───────────────────────────
// Subconjunto suficiente pra planilha de negócio pequeno. Se não souber
// calcular, lança erro e a célula vai sem valor em cache (o Excel calcula).

class ErroFormula extends Error {}

function tokenizar(f) {
  const toks = [];
  let i = 0;
  const s = f;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      let j = i + 1, txt = "";
      while (j < s.length) {
        if (s[j] === '"') { if (s[j + 1] === '"') { txt += '"'; j += 2; continue; } break; }
        txt += s[j]; j++;
      }
      toks.push({ t: "str", v: txt }); i = j + 1; continue;
    }
    if (ch === "'") {
      let j = i + 1, nome = "";
      while (j < s.length) {
        if (s[j] === "'") { if (s[j + 1] === "'") { nome += "'"; j += 2; continue; } break; }
        nome += s[j]; j++;
      }
      if (s[j + 1] !== "!") throw new ErroFormula("aba entre aspas sem '!'");
      toks.push({ t: "aba", v: nome }); i = j + 2; continue;
    }
    let m;
    if ((m = s.slice(i).match(/^\d+(\.\d+)?([eE][+-]?\d+)?/))) { toks.push({ t: "num", v: parseFloat(m[0]) }); i += m[0].length; continue; }
    if ((m = s.slice(i).match(/^\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?(?![A-Za-z0-9_(!])/))) {
      const txt = m[0].replace(/\$/g, "").toUpperCase();
      if (txt.includes(":")) { const [a, b] = txt.split(":"); toks.push({ t: "range", a, b }); }
      else toks.push({ t: "ref", v: txt });
      i += m[0].length; continue;
    }
    if ((m = s.slice(i).match(/^[A-Za-z_\u00C0-\u024F][A-Za-z0-9_.\u00C0-\u024F]*/))) {
      const nome = m[0];
      i += nome.length;
      if (s[i] === "!") { toks.push({ t: "aba", v: nome }); i++; continue; }
      toks.push({ t: "id", v: nome.toUpperCase() }); continue;
    }
    if ((m = s.slice(i).match(/^(<=|>=|<>|[-+*\/^&=<>(),%])/))) { toks.push({ t: "op", v: m[0] }); i += m[0].length; continue; }
    throw new ErroFormula(`caractere inesperado "${ch}" na fórmula`);
  }
  return toks;
}

function numDe(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(String(v).replace(",", "."));
  if (Number.isFinite(n)) return n;
  throw new ErroFormula("#VALUE!");
}

function criterio(c) {
  if (typeof c === "number") return (v) => typeof v === "number" && v === c;
  const s = String(c);
  const m = s.match(/^(<=|>=|<>|<|>|=)(.*)$/);
  if (m) {
    const op = m[1];
    const alvoN = parseFloat(m[2]);
    const alvoNum = Number.isFinite(alvoN) && /^-?\d*\.?\d+$/.test(m[2].trim());
    return (v) => {
      if (alvoNum) {
        if (typeof v !== "number") return op === "<>";
        switch (op) {
          case "<": return v < alvoN; case ">": return v > alvoN; case "<=": return v <= alvoN;
          case ">=": return v >= alvoN; case "<>": return v !== alvoN; default: return v === alvoN;
        }
      }
      const eq = String(v ?? "").toLowerCase() === m[2].toLowerCase();
      return op === "<>" ? !eq : eq;
    };
  }
  if (/[*?]/.test(s)) {
    const re = new RegExp("^" + s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
    return (v) => re.test(String(v ?? ""));
  }
  return (v) => String(v ?? "").toLowerCase() === s.toLowerCase();
}

/** Avalia fórmulas de uma pasta de trabalho inteira. `pasta` = Map(nomeAba → grade). */
function criarAvaliador(pasta) {
  const emCurso = new Set();

  function valorCelula(aba, ref) {
    const grade = pasta.get(aba);
    if (!grade) throw new ErroFormula(`aba "${aba}" não existe`);
    const c = grade.get(ref);
    if (!c) return null;
    if (c.f !== undefined) {
      if (c.calc !== undefined) return c.calc;
      const chave = `${aba}!${ref}`;
      if (emCurso.has(chave)) throw new ErroFormula("referência circular");
      emCurso.add(chave);
      try { c.calc = avaliar(aba, c.f); }
      catch (e) { if (e instanceof ErroFormula && /^#/.test(e.message) && !e.origem) e.origem = chave; throw e; }
      finally { emCurso.delete(chave); }
      return c.calc;
    }
    return c.v === undefined ? null : c.v;
  }

  /** Intervalo → array plano com .linhas e .colunas (pra PROCV e ÍNDICE saberem a forma). */
  function valoresRange(aba, a, b) {
    const p = separarRef(a), q = separarRef(b);
    const l0 = Math.min(p.linha, q.linha), l1 = Math.max(p.linha, q.linha);
    const c0 = Math.min(p.col, q.col), c1 = Math.max(p.col, q.col);
    const out = [];
    for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) out.push(valorCelula(aba, refCelula(c, l)));
    out.linhas = l1 - l0 + 1; out.colunas = c1 - c0 + 1;
    return out;
  }
  const lista = (r) => (Array.isArray(r) ? r : [r]);
  const igual = (a, b) => (typeof a === "string" || typeof b === "string" ? texto(a).toLowerCase() === texto(b).toLowerCase() : numDe(a) === numDe(b));

  // Funções que recebem os argumentos JÁ calculados. As que precisam decidir
  // antes de calcular (SE, SEERRO, E, OU) ficam em PREGUICOSAS, logo abaixo.
  const FUNCS = {
    SUM: (args) => args.flat().filter((v) => typeof v === "number").reduce((a, b) => a + b, 0),
    AVERAGE: (args) => { const ns = args.flat().filter((v) => typeof v === "number"); if (!ns.length) throw new ErroFormula("#DIV/0!"); return ns.reduce((a, b) => a + b, 0) / ns.length; },
    MIN: (args) => { const ns = args.flat().filter((v) => typeof v === "number"); return ns.length ? Math.min(...ns) : 0; },
    MAX: (args) => { const ns = args.flat().filter((v) => typeof v === "number"); return ns.length ? Math.max(...ns) : 0; },
    COUNT: (args) => args.flat().filter((v) => typeof v === "number").length,
    COUNTA: (args) => args.flat().filter((v) => v !== null && v !== "").length,
    COUNTBLANK: (args) => args.flat().filter((v) => v === null || v === "").length,
    ROUND: ([x, n = 0]) => { const p = Math.pow(10, numDe(n)); return Math.round((numDe(x) + Number.EPSILON) * p) / p; },
    ROUNDUP: ([x, n = 0]) => { const p = Math.pow(10, numDe(n)); const v = numDe(x); return (v < 0 ? -1 : 1) * Math.ceil(Math.abs(v) * p) / p; },
    ROUNDDOWN: ([x, n = 0]) => { const p = Math.pow(10, numDe(n)); const v = numDe(x); return (v < 0 ? -1 : 1) * Math.floor(Math.abs(v) * p) / p; },
    INT: ([x]) => Math.floor(numDe(x)),
    TRUNC: ([x]) => Math.trunc(numDe(x)),
    ABS: ([x]) => Math.abs(numDe(x)),
    MOD: ([a, b]) => { const d = numDe(b); if (d === 0) throw new ErroFormula("#DIV/0!"); const x = numDe(a); return x - d * Math.floor(x / d); },
    SQRT: ([x]) => Math.sqrt(numDe(x)),
    POWER: ([a, b]) => Math.pow(numDe(a), numDe(b)),
    NOT: ([c]) => !verdade(c),
    TRUE: () => true,
    FALSE: () => false,
    TODAY: () => serialData(new Date()),
    SUMIF: ([range, crit, somaRange]) => {
      const f = criterio(crit);
      const base = lista(range);
      const soma = somaRange === undefined ? base : lista(somaRange);
      let s = 0;
      base.forEach((v, i) => { if (f(v) && typeof soma[i] === "number") s += soma[i]; });
      return s;
    },
    SUMIFS: ([somaRange, ...pares]) => {
      const soma = lista(somaRange);
      const testes = [];
      for (let i = 0; i + 1 < pares.length; i += 2) testes.push({ vals: lista(pares[i]), f: criterio(pares[i + 1]) });
      let s = 0;
      soma.forEach((v, i) => { if (typeof v === "number" && testes.every((t) => t.f(t.vals[i]))) s += v; });
      return s;
    },
    COUNTIF: ([range, crit]) => { const f = criterio(crit); return lista(range).filter(f).length; },
    COUNTIFS: (pares) => {
      const testes = [];
      for (let i = 0; i + 1 < pares.length; i += 2) testes.push({ vals: lista(pares[i]), f: criterio(pares[i + 1]) });
      if (!testes.length) return 0;
      let n = 0;
      for (let i = 0; i < testes[0].vals.length; i++) if (testes.every((t) => t.f(t.vals[i]))) n++;
      return n;
    },
    AVERAGEIF: ([range, crit, mRange]) => {
      const f = criterio(crit);
      const base = lista(range);
      const vals = mRange === undefined ? base : lista(mRange);
      const ns = []; base.forEach((v, i) => { if (f(v) && typeof vals[i] === "number") ns.push(vals[i]); });
      if (!ns.length) throw new ErroFormula("#DIV/0!");
      return ns.reduce((a, b) => a + b, 0) / ns.length;
    },
    SUMPRODUCT: (args) => {
      const listas = args.map(lista);
      const n = listas[0].length;
      let s = 0;
      for (let i = 0; i < n; i++) { let p = 1; for (const l of listas) p *= typeof l[i] === "number" ? l[i] : 0; s += p; }
      return s;
    },
    VLOOKUP: ([chave, tabela, col, aproximado = true]) => {
      const t = lista(tabela);
      if (!t.colunas) throw new ErroFormula("PROCV precisa de um intervalo");
      const c = numDe(col);
      if (c < 1 || c > t.colunas) throw new ErroFormula("#REF!");
      if (verdade(aproximado)) throw new ErroFormula("PROCV aproximado não calculado aqui (use FALSO no 4º argumento)");
      for (let l = 0; l < t.linhas; l++) if (igual(t[l * t.colunas], chave)) return t[l * t.colunas + c - 1];
      throw new ErroFormula("#N/A");
    },
    MATCH: ([chave, range, tipo = 1]) => {
      if (numDe(tipo) !== 0) throw new ErroFormula("CORRESP aproximado não calculado aqui (use 0 no 3º argumento)");
      const i = lista(range).findIndex((v) => igual(v, chave));
      if (i < 0) throw new ErroFormula("#N/A");
      return i + 1;
    },
    INDEX: ([range, linha, coluna = 1]) => {
      const t = lista(range);
      const cols = t.colunas || 1;
      const l = numDe(linha), c = numDe(coluna);
      if (l < 1 || c < 1 || (l - 1) * cols + (c - 1) >= t.length) throw new ErroFormula("#REF!");
      return t[(l - 1) * cols + (c - 1)];
    },
    CONCATENATE: (args) => args.flat().map((v) => texto(v)).join(""),
    CONCAT: (args) => args.flat().map((v) => texto(v)).join(""),
    UPPER: ([s]) => texto(s).toUpperCase(),
    LOWER: ([s]) => texto(s).toLowerCase(),
    TRIM: ([s]) => texto(s).trim().replace(/\s+/g, " "),
    LEN: ([s]) => texto(s).length,
    LEFT: ([s, n = 1]) => texto(s).slice(0, numDe(n)),
    RIGHT: ([s, n = 1]) => { const t = texto(s); return t.slice(Math.max(0, t.length - numDe(n))); },
    ISBLANK: ([v]) => v === null || v === undefined || v === "",
    YEAR: ([d]) => new Date(Date.UTC(1899, 11, 30) + numDe(d) * 86400000).getUTCFullYear(),
    MONTH: ([d]) => new Date(Date.UTC(1899, 11, 30) + numDe(d) * 86400000).getUTCMonth() + 1,
    DAY: ([d]) => new Date(Date.UTC(1899, 11, 30) + numDe(d) * 86400000).getUTCDate(),
    DATE: ([y, m, d]) => Math.round((Date.UTC(numDe(y), numDe(m) - 1, numDe(d)) - Date.UTC(1899, 11, 30)) / 86400000),
    DAYS: ([a, b]) => numDe(a) - numDe(b),
    WEEKDAY: ([d, tipo = 1]) => { const w = new Date(Date.UTC(1899, 11, 30) + numDe(d) * 86400000).getUTCDay(); return numDe(tipo) === 2 ? (w === 0 ? 7 : w) : w + 1; },
  };
  const ehErroExcel = (e) => e instanceof ErroFormula && /^#/.test(e.message);
  // Recebem os argumentos como funções e só calculam o ramo que precisam:
  // =SE(B3=0;0;B2/B3) não pode falhar por causa do B2/B3 que não vai ser usado.
  const PREGUICOSAS = {
    IF: (th) => { if (!th[0]) throw new ErroFormula("SE sem condição"); return verdade(th[0]()) ? (th[1] ? th[1]() : true) : (th[2] ? th[2]() : false); },
    IFERROR: (th) => { try { return th[0](); } catch (e) { if (ehErroExcel(e) && th[1]) return th[1](); throw e; } },
    AND: (th) => { for (const t of th) if (!lista(t()).every(verdade)) return false; return true; },
    OR: (th) => { for (const t of th) if (lista(t()).some(verdade)) return true; return false; },
    ISNA: (th) => { try { th[0](); return false; } catch (e) { if (e instanceof ErroFormula && e.message === "#N/A") return true; throw e; } },
  };
  function verdade(v) { if (typeof v === "string") { if (v === "") return false; throw new ErroFormula("#VALUE!"); } return !!numDe(v); }
  function texto(v) { if (v === null || v === undefined) return ""; if (typeof v === "boolean") return v ? "TRUE" : "FALSE"; return String(v); }

  /**
   * Analisa a fórmula uma vez e monta uma árvore de funções; cada nó é () => valor.
   * É o que permite SE e SEERRO calcularem só o ramo escolhido.
   */
  function avaliar(abaAtual, formula) {
    const toks = tokenizar(formula);
    let p = 0;
    const olhar = () => toks[p];
    const pegar = () => toks[p++];
    const opEh = (v) => olhar() && olhar().t === "op" && olhar().v === v;

    function primario() {
      const t = pegar();
      if (!t) throw new ErroFormula("fórmula incompleta");
      if (t.t === "num") return () => t.v;
      if (t.t === "str") return () => t.v;
      if (t.t === "aba") {
        const r = pegar();
        if (!r) throw new ErroFormula("referência de aba incompleta");
        if (r.t === "ref") return () => valorCelula(t.v, r.v);
        if (r.t === "range") return () => valoresRange(t.v, r.a, r.b);
        throw new ErroFormula("referência de aba inválida");
      }
      if (t.t === "ref") return () => valorCelula(abaAtual, t.v);
      if (t.t === "range") return () => valoresRange(abaAtual, t.a, t.b);
      if (t.t === "id") {
        if (opEh("(")) {
          pegar();
          const args = [];
          if (!opEh(")")) {
            for (;;) {
              args.push(opEh(",") ? () => null : expressao());
              if (opEh(",")) { pegar(); continue; }
              break;
            }
          }
          if (!opEh(")")) throw new ErroFormula(`falta ")" em ${t.v}`);
          pegar();
          const preg = PREGUICOSAS[t.v];
          if (preg) return () => preg(args);
          const fn = FUNCS[t.v];
          if (!fn) throw new ErroFormula(`função ${t.v} não calculada aqui`);
          return () => fn(args.map((a) => a()));
        }
        if (t.v === "TRUE") return () => true;
        if (t.v === "FALSE") return () => false;
        throw new ErroFormula(`nome desconhecido: ${t.v}`);
      }
      if (t.t === "op" && t.v === "(") {
        const v = expressao();
        if (!opEh(")")) throw new ErroFormula('falta ")"');
        pegar();
        return v;
      }
      if (t.t === "op" && t.v === "-") { const v = primario(); return () => -numDe(v()); }
      if (t.t === "op" && t.v === "+") { const v = primario(); return () => numDe(v()); }
      throw new ErroFormula(`token inesperado ${t.v}`);
    }
    function pos() {
      let v = primario();
      while (opEh("%")) { pegar(); const a = v; v = () => numDe(a()) / 100; }
      return v;
    }
    function potencia() {
      let v = pos();
      while (opEh("^")) { pegar(); const a = v, b = pos(); v = () => Math.pow(numDe(a()), numDe(b())); }
      return v;
    }
    function termo() {
      let v = potencia();
      while (opEh("*") || opEh("/")) {
        const op = pegar().v;
        const a = v, b = potencia();
        if (op === "*") v = () => numDe(a()) * numDe(b());
        else v = () => { const dd = numDe(b()); if (dd === 0) throw new ErroFormula("#DIV/0!"); return numDe(a()) / dd; };
      }
      return v;
    }
    function soma() {
      let v = termo();
      while (opEh("+") || opEh("-")) { const op = pegar().v; const a = v, b = termo(); v = op === "+" ? () => numDe(a()) + numDe(b()) : () => numDe(a()) - numDe(b()); }
      return v;
    }
    function concat() {
      let v = soma();
      while (opEh("&")) { pegar(); const a = v, b = soma(); v = () => texto(a()) + texto(b()); }
      return v;
    }
    function expressao() {
      let v = concat();
      while (olhar() && olhar().t === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(olhar().v)) {
        const op = pegar().v;
        const a0 = v, b0 = concat();
        v = () => {
          let a = a0(), b = b0();
          if (typeof a === "string" || typeof b === "string") { a = texto(a).toLowerCase(); b = texto(b).toLowerCase(); }
          else { a = numDe(a); b = numDe(b); }
          switch (op) {
            case "=": return a === b; case "<>": return a !== b; case "<": return a < b;
            case ">": return a > b; case "<=": return a <= b; default: return a >= b;
          }
        };
      }
      return v;
    }
    const arvore = expressao();
    if (p < toks.length) throw new ErroFormula("sobrou texto no fim da fórmula");
    const r = arvore();
    if (Array.isArray(r)) { if (r.length === 1) return r[0]; throw new ErroFormula("intervalo onde se esperava valor"); }
    return r;
  }

  return { valorCelula, avaliar };
}

// ─────────────────────────── estilos ───────────────────────────

const FORMATOS = {
  texto: 0, geral: 0,
  inteiro: 3,          // #,##0
  numero: 4,           // #,##0.00
  percentual: 10,      // 0.00%
  moeda: 164,          // "R$" #,##0.00
  data: 165,           // dd/mm/yyyy
};
const TIPOS = new Set(Object.keys(FORMATOS));

function luminancia(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function criarEstilos(corCabecalho) {
  let cor = String(corCabecalho || "#1F3A5F").replace("#", "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(cor)) { if (/^[0-9A-F]{3}$/.test(cor)) cor = cor.split("").map((c) => c + c).join(""); else cor = "1F3A5F"; }
  const textoClaro = luminancia(cor) < 0.4;
  const xfs = [];
  const cache = new Map();

  // fontes: 0 normal, 1 negrito claro, 2 negrito escuro, 3 título
  const fonts = [
    `<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>`,
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>`,
    `<font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font>`,
    `<font><b/><sz val="14"/><color rgb="FF${cor}"/><name val="Calibri"/><family val="2"/></font>`,
  ];
  // fills: 0 none, 1 gray125 (obrigatório), 2 cabeçalho, 3 rodapé
  const fills = [
    `<fill><patternFill patternType="none"/></fill>`,
    `<fill><patternFill patternType="gray125"/></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="FF${cor}"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="FFEEF1F5"/><bgColor indexed="64"/></patternFill></fill>`,
  ];
  // bordas: 0 nenhuma, 1 linha de total, 2 cabeçalho (linha embaixo)
  const borders = [
    `<border><left/><right/><top/><bottom/><diagonal/></border>`,
    `<border><left/><right/><top style="thin"><color auto="1"/></top><bottom style="double"><color auto="1"/></bottom><diagonal/></border>`,
    `<border><left/><right/><top/><bottom style="medium"><color rgb="FF${cor}"/></bottom><diagonal/></border>`,
  ];

  /** Devolve o índice do estilo pra combinação pedida, criando se for novo. */
  function estilo({ tipo = "texto", papel = "dado", quebra = false } = {}) {
    const chave = `${tipo}|${papel}|${quebra}`;
    if (cache.has(chave)) return cache.get(chave);
    const fmt = FORMATOS[tipo] ?? 0;
    let font = 0, fill = 0, border = 0, alinh = "";
    if (papel === "cabecalho") { font = textoClaro ? 1 : 2; fill = 2; border = 2; alinh = `<alignment vertical="center" wrapText="1"/>`; }
    else if (papel === "total") { font = 2; fill = 3; border = 1; }
    else if (papel === "titulo") { font = 3; }
    else if (papel === "negrito") { font = 2; }
    if (quebra) alinh = `<alignment vertical="top" wrapText="1"/>`;
    const xf = `<xf numFmtId="${fmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"` +
      `${fmt ? ' applyNumberFormat="1"' : ""}${font ? ' applyFont="1"' : ""}${fill ? ' applyFill="1"' : ""}${border ? ' applyBorder="1"' : ""}${alinh ? ' applyAlignment="1"' : ""}>` +
      `${alinh}</xf>`;
    xfs.push(xf);
    const idx = xfs.length - 1;
    cache.set(chave, idx);
    return idx;
  }
  estilo(); // índice 0 = normal

  function xml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>` +
      `<fonts count="${fonts.length}">${fonts.join("")}</fonts>` +
      `<fills count="${fills.length}">${fills.join("")}</fills>` +
      `<borders count="${borders.length}">${borders.join("")}</borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`;
  }
  return { estilo, xml };
}

// ─────────────────────────── montar as abas ───────────────────────────

function nomeAbaValido(nome, usados) {
  let n = String(nome || "Planilha").replace(/[\[\]:*?\/\\]/g, "-").trim().slice(0, 31) || "Planilha";
  let base = n, k = 2;
  while (usados.has(n.toLowerCase())) { const suf = ` (${k++})`; n = base.slice(0, 31 - suf.length) + suf; }
  usados.add(n.toLowerCase());
  return n;
}

function inferirTipo(valores) {
  const uteis = valores.filter((v) => v !== null && v !== undefined && v !== "");
  if (!uteis.length) return "texto";
  if (uteis.every((v) => typeof v === "number")) return "numero";
  if (uteis.every((v) => typeof v === "string" && serialData(v) !== null && /^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{4}-\d{2}-\d{2}/.test(v.trim()))) return "data";
  if (uteis.every((v) => typeof v === "string" && /R\$/.test(v) && parseNumeroBR(v) !== null)) return "moeda";
  if (uteis.every((v) => typeof v === "string" && /%$/.test(v.trim()) && parseNumeroBR(v) !== null)) return "percentual";
  if (uteis.every((v) => typeof v === "string" && parseNumeroBR(v) !== null)) return "numero";
  return "texto";
}

/** Converte o valor bruto da spec pro que vai na célula, respeitando o tipo. */
function converterValor(bruto, tipo) {
  if (bruto === null || bruto === undefined) return { v: null };
  if (typeof bruto === "object" && !Array.isArray(bruto)) {
    if (bruto.f !== undefined) return { f: normalizarFormula(bruto.f), tipo: bruto.tipo };
    return { ...converterValor(bruto.v, bruto.tipo || tipo), tipo: bruto.tipo };
  }
  if (typeof bruto === "string" && bruto.startsWith("=")) return { f: normalizarFormula(bruto) };
  if (typeof bruto === "boolean") return { v: bruto };
  if (tipo === "data") {
    const s = typeof bruto === "number" ? bruto : serialData(bruto);
    if (s === null) return { v: String(bruto), avisoTipo: "data" };
    return { v: s };
  }
  if (tipo === "texto") return { v: typeof bruto === "number" ? bruto : String(bruto) };
  if (typeof bruto === "number") return { v: bruto };
  const n = parseNumeroBR(bruto);
  if (n === null) return { v: String(bruto), avisoTipo: tipo };
  return { v: n };
}

function lerCsvArquivo(caminho) {
  const txt = fs.readFileSync(caminho, "utf8").replace(/^\uFEFF/, "");
  return parseCsv(txt);
}

function parseCsv(txt) {
  const primeira = txt.split(/\r?\n/)[0] || "";
  const cont = (c) => (primeira.match(new RegExp(c === "\t" ? "\t" : `\\${c}`, "g")) || []).length;
  const sep = [";", ",", "\t"].sort((a, b) => cont(b) - cont(a))[0];
  const linhas = [];
  let linha = [], campo = "", aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) {
      if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && txt[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = "";
    } else campo += ch;
  }
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  return { sep, linhas: linhas.filter((l) => l.some((c) => c.trim() !== "")) };
}

/**
 * Primeira e última linha de dado de cada aba, calculadas antes de montar
 * qualquer uma: é o que permite `{Pedidos.ultima}` numa fórmula da aba Resumo.
 */
function faixasDasAbas(abas) {
  const faixas = new Map();
  for (const a of abas) {
    if (!a || Array.isArray(a.texto)) continue;
    let nLinhas = Array.isArray(a.linhas) ? a.linhas.length : 0;
    if (a.csv && fs.existsSync(a.csv)) nLinhas = Math.max(0, lerCsvArquivo(a.csv).linhas.length - 1);
    const extras = Math.max(0, parseInt(a.linhasExtras ?? 0, 10) || 0);
    const primeira = a.titulo ? 3 : 2;
    const total = nLinhas + extras;
    faixas.set(String(a.nome || "").toLowerCase(), { primeira, ultima: total ? primeira + total - 1 : primeira });
  }
  return faixas;
}

/**
 * Transforma a spec de uma aba em grade de células + metadados.
 * Devolve { nome, grade: Map(ref → {v|f, estiloIdx}), largura[], congelar, filtro, validacoes[], merges[], dim, avisos[] }
 */
function montarAba(spec, estilos, nomesUsados, faixas = new Map()) {
  const nome = nomeAbaValido(spec.nome, nomesUsados);
  const grade = new Map();
  const avisos = [];
  const merges = [];
  const validacoes = [];
  let ultimaLinha = 0, ultimaCol = 1;
  const por = (ref, cel) => { grade.set(ref, cel); const p = separarRef(ref); ultimaLinha = Math.max(ultimaLinha, p.linha); ultimaCol = Math.max(ultimaCol, p.col); };

  // aba de texto ("Como usar")
  const alturas = new Map();
  if (Array.isArray(spec.texto)) {
    const larguraTexto = Math.min(120, Math.max(60, Number(spec.largura) || 95));
    let l = 1;
    for (const par of spec.texto) {
      const s = String(par ?? "");
      if (s.trim() === "") { l++; continue; }
      const titulo = s.startsWith("# ");
      const sub = !titulo && s.startsWith("## ");
      const txt = titulo ? s.slice(2) : sub ? s.slice(3) : s;
      por(refCelula(1, l), { v: txt, estiloIdx: estilos.estilo({ papel: titulo ? "titulo" : sub ? "negrito" : "dado", quebra: !titulo && !sub }) });
      if (!titulo && !sub) alturas.set(l, 15 * Math.max(1, Math.ceil(txt.length / (larguraTexto * 1.15))));
      else if (titulo) alturas.set(l, 22);
      l++;
    }
    return { nome, grade, largura: [larguraTexto], congelar: 0, filtro: null, validacoes, merges, ultimaLinha, ultimaCol: 1, avisos, textoSo: true, totais: [], alturas };
  }

  // colunas
  let colunas = (spec.colunas || []).map((c) => (typeof c === "string" ? { titulo: c } : { ...c }));
  let linhasBrutas = Array.isArray(spec.linhas) ? spec.linhas : [];
  if (spec.csv) {
    const csv = lerCsvArquivo(spec.csv);
    if (!csv.linhas.length) throw new Error(`CSV vazio: ${spec.csv}`);
    const [cab, ...resto] = csv.linhas;
    if (!colunas.length) colunas = cab.map((t) => ({ titulo: t.trim() }));
    linhasBrutas = resto.map((l) => l.map((c) => c.trim()));
  }
  if (!colunas.length) {
    if (linhasBrutas.length && !Array.isArray(linhasBrutas[0]) && typeof linhasBrutas[0] === "object")
      colunas = Object.keys(linhasBrutas[0]).map((t) => ({ titulo: t }));
    else throw new Error(`aba "${nome}": sem colunas. Informe "colunas": ["Item", "Qtd", ...]`);
  }
  const nCols = colunas.length;
  const tituloPor = new Map(colunas.map((c, i) => [String(c.titulo).toLowerCase(), i]));

  // linhas como array ou objeto {titulo: valor}
  const linhas = linhasBrutas.map((l, li) => {
    if (Array.isArray(l)) return l;
    if (l && typeof l === "object") {
      const arr = new Array(nCols).fill(null);
      for (const [k, v] of Object.entries(l)) {
        const i = tituloPor.get(String(k).toLowerCase());
        if (i === undefined) avisos.push(`linha ${li + 1}: coluna "${k}" não existe, ignorada`);
        else arr[i] = v;
      }
      return arr;
    }
    return [l];
  });

  // tipo por coluna: declarado ou inferido
  colunas.forEach((c, i) => {
    if (c.tipo && !TIPOS.has(c.tipo)) { avisos.push(`coluna "${c.titulo}": tipo "${c.tipo}" desconhecido, usando texto (aceitos: ${[...TIPOS].join(", ")})`); c.tipo = "texto"; }
    if (!c.tipo) {
      const amostra = linhas.map((l) => l[i]).filter((v) => !(typeof v === "string" && v.startsWith("=")) && !(v && typeof v === "object"));
      c.tipo = c.formula ? "numero" : inferirTipo(amostra);
    }
  });

  let linhaAtual = 1;
  if (spec.titulo) {
    por("A1", { v: String(spec.titulo), estiloIdx: estilos.estilo({ papel: "titulo" }) });
    if (nCols > 1) merges.push(`A1:${letraCol(nCols)}1`);
    linhaAtual = 2;
  }
  const linhaCab = linhaAtual;
  colunas.forEach((c, i) => por(refCelula(i + 1, linhaCab), { v: String(c.titulo), estiloIdx: estilos.estilo({ papel: "cabecalho" }) }));

  const extras = Math.max(0, parseInt(spec.linhasExtras ?? 0, 10) || 0);
  const primeira = linhaCab + 1;
  const totalDados = linhas.length + extras;
  const ultima = totalDados ? primeira + totalDados - 1 : primeira;
  const subst = (f, n) => String(f)
    .replace(/\{([^{}]+?)\.(primeira|ultima)\}/g, (m, aba, qual) => {
      const fx = faixas.get(aba.trim().toLowerCase());
      if (!fx) { avisos.push(`fórmula usa {${aba}.${qual}} mas a aba "${aba}" não existe; ficou como está`); return m; }
      return String(fx[qual]);
    })
    .replace(/\{n\}/g, n).replace(/\{linha\}/g, n).replace(/\{primeira\}/g, primeira).replace(/\{ultima\}/g, ultima);

  for (let li = 0; li < totalDados; li++) {
    const n = primeira + li;
    const linha = linhas[li] || [];
    if (linha.length > nCols) avisos.push(`linha ${li + 1} tem ${linha.length} valores pra ${nCols} colunas; o excedente foi ignorado`);
    colunas.forEach((c, ci) => {
      const ref = refCelula(ci + 1, n);
      let bruto = li < linhas.length ? linha[ci] : null;
      let cel;
      if ((bruto === null || bruto === undefined || bruto === "") && c.formula) cel = { f: normalizarFormula(subst(c.formula, n)) };
      else if (bruto === null || bruto === undefined || bruto === "") cel = { v: null };
      else {
        if (typeof bruto === "string" && bruto.startsWith("=")) bruto = subst(bruto, n);
        cel = converterValor(bruto, c.tipo);
        if (cel.avisoTipo) avisos.push(`${nome}!${ref}: "${bruto && typeof bruto === "object" ? bruto.v : bruto}" não é ${cel.avisoTipo}; ficou como texto`);
      }
      cel.estiloIdx = estilos.estilo({ tipo: cel.tipo || c.tipo, quebra: !!c.quebra });
      por(ref, cel);
    });
  }
  if (!totalDados) ultimaLinha = Math.max(ultimaLinha, linhaCab);

  // rodapé de totais
  const totais = [];
  let linhaTotal = null;
  if (spec.totais || spec.rodape) {
    linhaTotal = ultima + 1;
    const rot = spec.rotuloTotal || "Total";
    const linhaRod = new Array(nCols).fill(null);
    if (Array.isArray(spec.rodape)) spec.rodape.forEach((v, i) => { if (i < nCols) linhaRod[i] = v; });
    if (spec.totais && typeof spec.totais === "object") {
      if (linhaRod[0] === null) linhaRod[0] = rot;
      for (const [k, modo] of Object.entries(spec.totais)) {
        const i = tituloPor.get(String(k).toLowerCase());
        if (i === undefined) { avisos.push(`totais: coluna "${k}" não existe`); continue; }
        const L = letraCol(i + 1);
        const faixa = `${L}${primeira}:${L}${ultima}`;
        const m = String(modo).toLowerCase();
        linhaRod[i] = m === "soma" || m === "sum" ? `=SUM(${faixa})`
          : m === "media" || m === "média" || m === "average" ? `=AVERAGE(${faixa})`
          : m === "contagem" || m === "count" ? `=COUNTA(${faixa})`
          : m === "maximo" || m === "máximo" || m === "max" ? `=MAX(${faixa})`
          : m === "minimo" || m === "mínimo" || m === "min" ? `=MIN(${faixa})`
          : String(modo);
      }
    }
    colunas.forEach((c, ci) => {
      const ref = refCelula(ci + 1, linhaTotal);
      const bruto = linhaRod[ci];
      let cel;
      if (bruto === null || bruto === undefined || bruto === "") cel = { v: null };
      else if (typeof bruto === "string" && bruto.startsWith("=")) cel = { f: normalizarFormula(subst(bruto, linhaTotal)) };
      else cel = converterValor(bruto, ci === 0 ? "texto" : c.tipo);
      cel.estiloIdx = estilos.estilo({ tipo: ci === 0 && !cel.f ? "texto" : c.tipo, papel: "total" });
      por(ref, cel);
      if (cel.f) totais.push({ ref, titulo: c.titulo, tipo: c.tipo });
    });
  }

  // largura das colunas: declarada ou pelo maior conteúdo
  const largura = colunas.map((c, ci) => {
    if (c.largura) return Math.max(4, Math.min(100, Number(c.largura)));
    let max = String(c.titulo).length + 2;
    for (let l = primeira; l <= (linhaTotal || ultima); l++) {
      const cel = grade.get(refCelula(ci + 1, l));
      if (!cel) continue;
      let len = 0;
      if (cel.f !== undefined) len = c.tipo === "moeda" ? 14 : 10;
      else if (typeof cel.v === "number") len = c.tipo === "moeda" ? fmtBR(cel.v).length + 4 : c.tipo === "data" ? 11 : String(cel.v).length + 2;
      else if (cel.v) len = String(cel.v).length + 1;
      max = Math.max(max, len);
    }
    return Math.min(c.quebra ? 45 : 60, Math.max(8, max));
  });

  // validação (lista suspensa)
  colunas.forEach((c, ci) => {
    if (Array.isArray(c.opcoes) && c.opcoes.length) {
      const L = letraCol(ci + 1);
      const fim = Math.max(ultima, primeira + 199);
      const lista = c.opcoes.map((o) => String(o).replace(/,/g, " ")).join(",");
      if (lista.length > 250) avisos.push(`coluna "${c.titulo}": lista de opções longa demais pro Excel (limite ~255 caracteres)`);
      validacoes.push({ sqref: `${L}${primeira}:${L}${fim}`, lista });
    }
  });

  const congelar = spec.congelar === false ? 0 : linhaCab;
  const filtro = spec.filtro === false || !linhas.length ? null : `A${linhaCab}:${letraCol(nCols)}${ultima}`;
  if (spec.titulo) alturas.set(1, 22);
  return { nome, grade, largura, congelar, filtro, validacoes, merges, ultimaLinha: Math.max(ultimaLinha, linhaTotal || ultima), ultimaCol: nCols, avisos, totais, imprimir: spec.imprimir, colunas, primeira, ultima, linhaCab, linhaTotal, alturas };
}

// ─────────────────────────── escrever o .xlsx ───────────────────────────

function xmlAba(aba, indice, sst, total) {
  const partes = [];
  partes.push(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`);
  partes.push(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`);
  if (aba.imprimir) partes.push(`<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`);
  partes.push(`<dimension ref="A1:${letraCol(Math.max(1, aba.ultimaCol))}${Math.max(1, aba.ultimaLinha)}"/>`);
  partes.push(`<sheetViews><sheetView workbookViewId="0"${indice === 0 ? ' tabSelected="1"' : ""}>`);
  if (aba.congelar) partes.push(`<pane ySplit="${aba.congelar}" topLeftCell="A${aba.congelar + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${aba.congelar + 1}" sqref="A${aba.congelar + 1}"/>`);
  partes.push(`</sheetView></sheetViews>`);
  partes.push(`<sheetFormatPr defaultRowHeight="15"/>`);
  if (aba.largura.length) {
    partes.push(`<cols>`);
    aba.largura.forEach((w, i) => partes.push(`<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`));
    partes.push(`</cols>`);
  }
  partes.push(`<sheetData>`);
  const porLinha = new Map();
  for (const [ref, cel] of aba.grade) {
    const p = separarRef(ref);
    if (!porLinha.has(p.linha)) porLinha.set(p.linha, []);
    porLinha.get(p.linha).push({ ref, col: p.col, cel });
  }
  for (const l of [...porLinha.keys()].sort((a, b) => a - b)) {
    const cels = porLinha.get(l).sort((a, b) => a.col - b.col);
    const ht = aba.alturas && aba.alturas.get(l);
    partes.push(`<row r="${l}"${ht ? ` ht="${ht}" customHeight="1"` : ""}>`);
    for (const { ref, cel } of cels) {
      const s = cel.estiloIdx ? ` s="${cel.estiloIdx}"` : "";
      if (cel.f !== undefined) {
        const f = escXml(cel.f);
        const c = cel.calc;
        if (typeof c === "number" && Number.isFinite(c)) partes.push(`<c r="${ref}"${s}><f>${f}</f><v>${Number(c.toPrecision(15))}</v></c>`);
        else if (typeof c === "boolean") partes.push(`<c r="${ref}"${s} t="b"><f>${f}</f><v>${c ? 1 : 0}</v></c>`);
        else if (typeof c === "string") partes.push(`<c r="${ref}"${s} t="str"><f>${f}</f><v>${escXml(c)}</v></c>`);
        else if (cel.erro) partes.push(`<c r="${ref}"${s} t="e"><f>${f}</f><v>${escXml(cel.erro)}</v></c>`);
        else partes.push(`<c r="${ref}"${s}><f>${f}</f></c>`);
      } else if (cel.v === null || cel.v === undefined) {
        if (s) partes.push(`<c r="${ref}"${s}/>`);
      } else if (typeof cel.v === "number") partes.push(`<c r="${ref}"${s}><v>${cel.v}</v></c>`);
      else if (typeof cel.v === "boolean") partes.push(`<c r="${ref}"${s} t="b"><v>${cel.v ? 1 : 0}</v></c>`);
      else partes.push(`<c r="${ref}"${s} t="s"><v>${sst.indice(String(cel.v))}</v></c>`);
    }
    partes.push(`</row>`);
  }
  partes.push(`</sheetData>`);
  if (aba.filtro) partes.push(`<autoFilter ref="${aba.filtro}"/>`);
  if (aba.merges.length) partes.push(`<mergeCells count="${aba.merges.length}">${aba.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`);
  if (aba.validacoes.length) {
    partes.push(`<dataValidations count="${aba.validacoes.length}">`);
    for (const v of aba.validacoes) partes.push(`<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${v.sqref}"><formula1>"${escXml(v.lista)}"</formula1></dataValidation>`);
    partes.push(`</dataValidations>`);
  }
  partes.push(`<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>`);
  if (aba.imprimir) partes.push(`<pageSetup paperSize="9" orientation="${aba.imprimir === "paisagem" ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>`);
  partes.push(`</worksheet>`);
  return partes.join("");
}

function gerar(specPath, saidaPath, opts) {
  if (!fs.existsSync(specPath)) morrer(`Não achei a spec: ${specPath}`, "Uso: node scripts/gerar-planilha.js <spec.json> [saida.xlsx]. Pra ver um exemplo: --exemplo");
  let spec;
  try { spec = JSON.parse(fs.readFileSync(specPath, "utf8").replace(/^\uFEFF/, "")); }
  catch (e) { morrer(`A spec não é JSON válido: ${e.message}`); }
  if (!spec || !Array.isArray(spec.abas) || !spec.abas.length) morrer(`A spec precisa de "abas": [ { "nome": ..., "colunas": [...], "linhas": [...] } ]`);

  const saida = saidaPath || spec.saida || specPath.replace(/\.planilha\.json$|\.json$/i, "") + ".xlsx";
  if (fs.existsSync(saida) && !opts.sobrescrever) morrer(`${saida} já existe.`, "Use --sobrescrever pra substituir, ou dê outro nome. Planilha que o usuário já editou não se sobrescreve sem avisar.");

  const estilos = criarEstilos(spec.corCabecalho);
  const nomes = new Set();
  const faixas = faixasDasAbas(spec.abas);
  const abas = spec.abas.map((a) => { try { return montarAba(a, estilos, nomes, faixas); } catch (e) { morrer(/^aba "/.test(e.message) ? e.message : `aba "${a.nome || "?"}": ${e.message}`); } });

  // calcular fórmulas
  const pasta = new Map(abas.map((a) => [a.nome, a.grade]));
  const av = criarAvaliador(pasta);
  let nFormulas = 0, semCalculo = [], comErro = [];
  for (const a of abas) for (const [ref, cel] of a.grade) {
    if (cel.f === undefined) continue;
    nFormulas++;
    try { cel.calc = av.valorCelula(a.nome, ref); }
    catch (e) {
      cel.calc = undefined;
      if (e instanceof ErroFormula && /^#/.test(e.message)) {
        cel.erro = e.message;
        const origem = e.origem && e.origem !== `${a.nome}!${ref}` ? ` (vem de ${e.origem})` : "";
        comErro.push(`${a.nome}!${ref} vai mostrar ${e.message}${origem}`);
      } else semCalculo.push(`${a.nome}!${ref} (${e.message})`);
    }
  }

  // shared strings
  const strs = [];
  const idx = new Map();
  const sst = { indice(s) { if (!idx.has(s)) { idx.set(s, strs.length); strs.push(s); } return idx.get(s); } };
  const xmlAbas = abas.map((a, i) => xmlAba(a, i, sst));
  const sstXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strs.length}" uniqueCount="${strs.length}">` +
    strs.map((s) => `<si><t${/^\s|\s$/.test(s) ? ' xml:space="preserve"' : ""}>${escXml(s)}</t></si>`).join("") + `</sst>`;

  const agora = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const titulo = spec.titulo || path.basename(saida, ".xlsx");
  const entradas = [
    { nome: "[Content_Types].xml", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { nome: "_rels/.rels", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { nome: "docProps/core.xml", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escXml(titulo)}</dc:title><dc:creator>${escXml(spec.autor || "Contex OS")}</dc:creator><cp:lastModifiedBy>${escXml(spec.autor || "Contex OS")}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${agora}</dcterms:modified></cp:coreProperties>` },
    { nome: "docProps/app.xml", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Contex OS</Application></Properties>` },
    { nome: "xl/workbook.xml", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="0"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="22000" windowHeight="13000"/></bookViews><sheets>` +
      abas.map((a, i) => `<sheet name="${escXml(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
      `</sheets>` +
      (abas.some((a) => a.filtro) ? `<definedNames>` + abas.map((a, i) => (a.filtro ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${escXml(a.nome.replace(/'/g, "''"))}'!${a.filtro.replace(/([A-Z]+)(\d+)/g, "$$$1$$$2")}</definedName>` : "")).join("") + `</definedNames>` : "") +
      `<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { nome: "xl/_rels/workbook.xml.rels", conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId${abas.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>` },
    ...xmlAbas.map((x, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, conteudo: x })),
    { nome: "xl/styles.xml", conteudo: estilos.xml() },
    { nome: "xl/sharedStrings.xml", conteudo: sstXml },
  ];

  const zip = zipar(entradas);
  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
  fs.writeFileSync(saida, zip);

  // reler pra provar que abre
  let prova;
  try { prova = lerXlsx(saida); }
  catch (e) { morrer(`Gravei ${saida}, mas não consegui reler: ${e.message}`); }

  dizer(`\n✔ ${saida} (${fmtBR(zip.length / 1024, 1)} KB)`);
  for (const a of abas) {
    const t = prova.abas.find((x) => x.nome === a.nome);
    const nLin = a.textoSo ? a.ultimaLinha : Math.max(0, a.ultima - a.primeira + 1);
    dizer(`  aba "${a.nome}": ${a.textoSo ? `${nLin} parágrafos` : `${a.colunas.length} colunas, ${nLin} linhas de dado${a.linhaTotal ? " + total" : ""}${a.congelar ? ", cabeçalho congelado" : ""}${a.filtro ? ", filtro" : ""}`}${t ? "" : " (não reli!)"}`);
    for (const tot of a.totais) {
      const cel = a.grade.get(tot.ref);
      const val = cel.calc;
      const mostra = typeof val === "number" ? (tot.tipo === "moeda" ? `R$ ${fmtBR(val)}` : tot.tipo === "percentual" ? `${fmtBR(val * 100)}%` : fmtBR(val, Number.isInteger(val) ? 0 : 2)) : cel.erro ? `${cel.erro} ⚠` : "(calcula ao abrir)";
      dizer(`    ${tot.ref} ${tot.titulo}: ${mostra}   ← =${cel.f}`);
    }
    for (const w of a.avisos) dizer(`  ⚠ ${w}`);
  }
  dizer(`  ${nFormulas} fórmula(s)${semCalculo.length ? `, ${semCalculo.length} sem valor em cache (o Excel calcula ao abrir): ${semCalculo.slice(0, 5).join("; ")}` : comErro.length ? "" : ", todas com valor calculado"}`);
  for (const e of comErro.slice(0, 10)) dizer(`  ⚠ ${e}`);
  if (comErro.length > 10) dizer(`  ⚠ … e mais ${comErro.length - 10} célula(s) com erro`);
  if (comErro.length) dizer(`  Erro de fórmula não some ao abrir no Excel: corrija o dado de entrada ou a fórmula na spec e gere de novo.`);
  dizer(`  Fórmulas gravadas em inglês (SUM, IF); o Excel em português mostra SOMA, SE.`);
  return { saida, abas, nFormulas, semCalculo, comErro };
}

// ─────────────────────────── ler .xlsx ───────────────────────────

function atributos(s) {
  const out = {};
  for (const m of s.matchAll(/([\w:]+)="([^"]*)"/g)) out[m[1]] = desXml(m[2]);
  return out;
}

const FMT_DATA_BUILTIN = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

function lerXlsx(caminho) {
  const buf = fs.readFileSync(caminho);
  const z = deszipar(buf);
  // alguns geradores prefixam os elementos (<x:sheet>, <x:c>); o prefixo sai antes de ler
  const pegar = (n) => { const b = z.get(n) || z.get(n.replace(/^\//, "")); return b ? b.toString("utf8").replace(/<(\/?)[A-Za-z0-9]+:(?=[A-Za-z])/g, "<$1") : null; };
  const temMacro = [...z.keys()].some((n) => /vbaProject\.bin$/i.test(n));

  const wb = pegar("xl/workbook.xml");
  if (!wb) throw new Error("não tem xl/workbook.xml: não é uma planilha .xlsx");
  const rels = pegar("xl/_rels/workbook.xml.rels") || "";
  const relMap = new Map();
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) { const a = atributos(m[1]); relMap.set(a.Id, a.Target); }

  // shared strings
  const strs = [];
  const sstX = pegar("xl/sharedStrings.xml");
  if (sstX) for (const m of sstX.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    strs.push([...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((t) => desXml(t[1])).join(""));
  }

  // estilos → qual índice é data / moeda / percentual
  const estX = pegar("xl/styles.xml") || "";
  const numFmts = new Map();
  for (const m of estX.matchAll(/<numFmt\b([^>]*)\/?>/g)) { const a = atributos(m[1]); numFmts.set(parseInt(a.numFmtId, 10), a.formatCode || ""); }
  const xfs = [];
  const cellXfs = (estX.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/) || [])[1] || "";
  for (const m of cellXfs.matchAll(/<xf\b([^>]*)\/?>/g)) xfs.push(parseInt(atributos(m[1]).numFmtId || "0", 10));
  const tipoDoEstilo = (s) => {
    if (s === undefined) return "geral";
    const id = xfs[parseInt(s, 10)];
    if (id === undefined) return "geral";
    if (FMT_DATA_BUILTIN.has(id)) return "data";
    if (id === 9 || id === 10) return "percentual";
    if (id === 1 || id === 3) return "inteiro";
    const code = numFmts.get(id);
    if (code === undefined) return id === 0 ? "geral" : "numero";
    const limpo = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
    if (/R\$/.test(code)) return "moeda";
    if (/%/.test(limpo)) return "percentual";
    if (/[dyhs]|m/i.test(limpo) && !/[#0]/.test(limpo)) return "data";
    return "numero";
  };

  const abas = [];
  for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const a = atributos(m[1]);
    const alvo = relMap.get(a["r:id"]) || `worksheets/sheet${a.sheetId}.xml`;
    const nomeArq = alvo.startsWith("/") ? alvo.slice(1) : `xl/${alvo}`;
    const x = pegar(nomeArq);
    const aba = { nome: a.name, celulas: new Map(), maxLinha: 0, maxCol: 0, formulas: 0, tiposCol: new Map(), validacoes: [] };
    if (x) {
      for (const dv of x.matchAll(/<dataValidation\b([^>]*)>([\s\S]*?)<\/dataValidation>/g)) {
        const at = atributos(dv[1]);
        const f1 = (dv[2].match(/<formula1>([\s\S]*?)<\/formula1>/) || [])[1];
        if (at.type !== "list" || !f1 || !at.sqref) continue;
        const lista = desXml(f1).trim();
        if (!/^".*"$/.test(lista)) continue; // lista que aponta pra um intervalo: não dá pra reproduzir na spec
        const m0 = at.sqref.split(/\s+/)[0].match(/^\$?([A-Z]{1,3})\$?(\d+)/i);
        if (m0) aba.validacoes.push({ col: numCol(m0[1]), opcoes: lista.slice(1, -1).split(",").map((o) => o.trim()).filter(Boolean) });
      }
      const dados = (x.match(/<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>/) || [])[1] || "";
      for (const c of dados.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const at = atributos(c[1]);
        const corpo = c[2] || "";
        const ref = at.r; if (!ref) continue;
        const p = separarRef(ref);
        const fM = corpo.match(/<f\b[^>]*>([\s\S]*?)<\/f>|<f\b[^>]*\/>/);
        const vM = corpo.match(/<v>([\s\S]*?)<\/v>/);
        const isM = corpo.match(/<is>[\s\S]*?<\/is>/);
        let v = null, tipo = tipoDoEstilo(at.s);
        if (at.t === "s") { v = strs[parseInt(vM ? vM[1] : "-1", 10)] ?? ""; tipo = "texto"; }
        else if (at.t === "inlineStr") { v = isM ? [...isM[0].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((t) => desXml(t[1])).join("") : ""; tipo = "texto"; }
        else if (at.t === "str") { v = vM ? desXml(vM[1]) : ""; tipo = "texto"; }
        else if (at.t === "b") { v = vM ? vM[1] === "1" : null; tipo = "booleano"; }
        else if (at.t === "e") { v = vM ? desXml(vM[1]) : "#ERRO"; tipo = "erro"; }
        else if (vM) { v = parseFloat(vM[1]); if (!Number.isFinite(v)) v = desXml(vM[1]); }
        const f = fM ? (fM[1] !== undefined ? desXml(fM[1]) : "(fórmula compartilhada)") : undefined;
        if (v === null && f === undefined) continue;
        if (f !== undefined) aba.formulas++;
        aba.celulas.set(ref, { v, f, tipo });
        aba.maxLinha = Math.max(aba.maxLinha, p.linha);
        aba.maxCol = Math.max(aba.maxCol, p.col);
        if (tipo !== "texto" && tipo !== "geral") aba.tiposCol.set(p.col, (aba.tiposCol.get(p.col) || new Map()).set(tipo, ((aba.tiposCol.get(p.col) || new Map()).get(tipo) || 0) + 1));
      }
    }
    abas.push(aba);
  }
  return { abas, temMacro, arquivo: caminho };
}

/** Grade → matriz de linhas (valores formatados ou crus). */
function matriz(aba, { crus = false, formulas = false } = {}) {
  const linhas = [];
  for (let l = 1; l <= aba.maxLinha; l++) {
    const linha = [];
    for (let c = 1; c <= aba.maxCol; c++) {
      const cel = aba.celulas.get(refCelula(c, l));
      if (!cel) { linha.push(crus ? null : ""); continue; }
      if (formulas && cel.f !== undefined) { linha.push("=" + cel.f); continue; }
      if (crus) linha.push(cel.tipo === "data" && typeof cel.v === "number" ? dataDoSerial(cel.v) : cel.v);
      else linha.push(formatar(cel));
    }
    linhas.push(linha);
  }
  return linhas;
}
function formatar(cel) {
  const v = cel.v;
  if (v === null || v === undefined) return cel.f !== undefined ? `=${cel.f}` : "";
  if (typeof v === "boolean") return v ? "VERDADEIRO" : "FALSO";
  if (typeof v !== "number") return String(v);
  if (cel.tipo === "data") return dataDoSerial(v);
  if (cel.tipo === "moeda") return `R$ ${fmtBR(v)}`;
  if (cel.tipo === "percentual") return `${fmtBR(v * 100)}%`;
  return Number.isInteger(v) ? String(v) : fmtBR(v, Math.min(6, (String(v).split(".")[1] || "").length));
}

function csvDe(linhas) {
  const q = (s) => { const t = String(s ?? ""); return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return linhas.map((l) => l.map(q).join(";")).join("\r\n") + "\r\n";
}

/** Primeira linha "de verdade" da tabela: pula a linha de título (uma célula só, acima de um cabeçalho cheio). */
function acharCabecalho(m) {
  const cheios = (l) => l.filter((c) => c !== null && c !== "").length;
  if (m.length > 2 && cheios(m[0]) === 1 && cheios(m[1]) > 1) return { titulo: String(m[0].find((c) => c !== null && c !== "")), inicio: 1 };
  return { titulo: undefined, inicio: 0 };
}

/**
 * Lê a grade de volta pra uma spec que gera a mesma planilha: descobre a fórmula
 * de coluna (mesma fórmula linha a linha vira `formula` com {n}), a linha de
 * total (vira `totais`), as linhas em branco do fim (viram `linhasExtras`) e as
 * listas suspensas (viram `opcoes`).
 */
function specDe(dados) {
  const abas = dados.abas.map((aba) => {
    if (!aba.maxLinha) return { nome: aba.nome, colunas: [], linhas: [] };
    let m = matriz(aba, { crus: true, formulas: true });
    const { titulo, inicio } = acharCabecalho(m);
    m = m.slice(inicio);
    const primeira = inicio + 2; // número da linha (1-based) do primeiro dado
    const cab = m[0].map((t, i) => (t === null || t === "" ? letraCol(i + 1) : String(t)));
    const nCols = cab.length;
    let linhas = m.slice(1).map((l) => l.slice(0, nCols));
    const ehFormula = (v) => typeof v === "string" && v.startsWith("=");
    const vazio = (v) => v === null || v === "";

    // rodapé: última linha com rótulo em texto na primeira coluna e só fórmula (ou vazio) no resto
    let totais, rodape, rotuloTotal;
    const ult = linhas[linhas.length - 1];
    const fimDado = primeira + linhas.length - 2; // última linha de dado, se a última for rodapé
    const agregaAcima = (v, i) => ehFormula(v) && new RegExp(`\\b(SUM|AVERAGE|COUNTA?|MAX|MIN|SUBTOTAL)\\([^)]*${letraCol(i + 1)}\\d+:${letraCol(i + 1)}${fimDado}\\)`, "i").test(v);
    if (linhas.length > 1 && ult && typeof ult[0] === "string" && !ehFormula(ult[0]) && ult.some(agregaAcima) && ult.slice(1).every((v) => vazio(v) || ehFormula(v))) {
      const fim = fimDado;
      const simples = { SUM: "soma", AVERAGE: "media", COUNTA: "contagem", MAX: "maximo", MIN: "minimo" };
      totais = {};
      let todosSimples = true;
      ult.forEach((v, i) => {
        if (i === 0 || !ehFormula(v)) return;
        const L = letraCol(i + 1);
        const mm = v.match(new RegExp(`^=(SUM|AVERAGE|COUNTA|MAX|MIN)\\(${L}(\\d+):${L}(\\d+)\\)$`, "i"));
        if (mm && +mm[3] === fim) totais[cab[i]] = simples[mm[1].toUpperCase()];
        else todosSimples = false;
      });
      if (!todosSimples) { rodape = ult.map((v) => (vazio(v) ? null : v)); totais = undefined; }
      if (String(ult[0]) !== "Total") rotuloTotal = String(ult[0]);
      linhas = linhas.slice(0, -1);
    }

    // fórmula de coluna: a mesma fórmula em toda linha, com o número da linha no lugar de {n}
    const formulaCol = new Array(nCols).fill(undefined);
    for (let c = 0; c < nCols; c++) {
      const modelos = new Set();
      let n = 0;
      linhas.forEach((l, li) => {
        const v = l[c];
        if (!ehFormula(v)) return;
        const linhaN = primeira + li;
        modelos.add(v.replace(new RegExp(`(\\$?[A-Z]{1,3}\\$?)${linhaN}(?![0-9])`, "g"), "$1{n}"));
        n++;
      });
      if (modelos.size === 1 && n >= 2) {
        formulaCol[c] = [...modelos][0];
        linhas.forEach((l) => { if (ehFormula(l[c])) l[c] = null; });
      }
    }

    // linhas em branco no fim viram linhasExtras
    let extras = 0;
    while (linhas.length && linhas[linhas.length - 1].every(vazio)) { linhas.pop(); extras++; }

    const validacao = new Map((aba.validacoes || []).map((v) => [v.col, v.opcoes]));
    const colunas = cab.map((titulo, i) => {
      const contagem = aba.tiposCol.get(i + 1);
      let tipo = "texto";
      if (contagem) tipo = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
      else if (linhas.some((l) => typeof l[i] === "number")) tipo = "numero";
      const col = { titulo };
      if (tipo !== "texto" && tipo !== "geral" && tipo !== "booleano" && tipo !== "erro") col.tipo = tipo;
      if (formulaCol[i]) col.formula = formulaCol[i];
      if (validacao.has(i + 1)) col.opcoes = validacao.get(i + 1);
      return col;
    });
    const out = { nome: aba.nome };
    if (titulo) out.titulo = titulo;
    out.colunas = colunas;
    out.linhas = linhas;
    if (extras) out.linhasExtras = extras;
    if (totais && Object.keys(totais).length) out.totais = totais;
    if (rodape) out.rodape = rodape;
    if (rotuloTotal) out.rotuloTotal = rotuloTotal;
    return out;
  });
  return { titulo: path.basename(dados.arquivo).replace(/\.(xlsx|xlsm|csv)$/i, ""), abas };
}

function ler(caminho, opts) {
  if (!fs.existsSync(caminho)) morrer(`Não achei ${caminho}`);
  const ext = path.extname(caminho).toLowerCase();
  let dados;
  if (ext === ".csv" || ext === ".txt") {
    const { sep, linhas } = lerCsvArquivo(caminho);
    const aba = { nome: path.basename(caminho, ext), celulas: new Map(), maxLinha: linhas.length, maxCol: Math.max(...linhas.map((l) => l.length), 0), formulas: 0, tiposCol: new Map() };
    linhas.forEach((l, li) => l.forEach((c, ci) => {
      const n = li > 0 ? parseNumeroBR(c) : null;
      const d = li > 0 && n === null ? serialData(c) : null;
      const cel = n !== null && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(c.trim()) ? { v: n, tipo: /R\$/.test(c) ? "moeda" : /%$/.test(c.trim()) ? "percentual" : "numero" } : d !== null ? { v: d, tipo: "data" } : { v: c, tipo: "texto" };
      if (cel.v === "" ) return;
      aba.celulas.set(refCelula(ci + 1, li + 1), cel);
      if (cel.tipo !== "texto") aba.tiposCol.set(ci + 1, (aba.tiposCol.get(ci + 1) || new Map()).set(cel.tipo, ((aba.tiposCol.get(ci + 1) || new Map()).get(cel.tipo) || 0) + 1));
    }));
    dados = { abas: [aba], temMacro: false, arquivo: caminho, sep };
  } else if (ext === ".xlsx" || ext === ".xlsm") {
    try { dados = lerXlsx(caminho); } catch (e) { morrer(`Não consegui ler ${caminho}: ${e.message}`, "Se for .xls (formato antigo) ou .numbers, salve como .xlsx antes."); }
  } else morrer(`Extensão ${ext || "(nenhuma)"} não suportada.`, "Aceito .xlsx, .xlsm (só leitura) e .csv. Arquivo .xls antigo: salve como .xlsx no Excel.");

  if (dados.temMacro) console.error(`⚠ ${caminho} contém macro (VBA). Só vou LER os dados; nenhuma macro é executada aqui. Avise o usuário antes de abrir esse arquivo no Excel.`);

  let abas = dados.abas;
  if (opts.aba) {
    const n = parseInt(opts.aba, 10);
    abas = Number.isFinite(n) && String(n) === String(opts.aba) ? [dados.abas[n - 1]] : dados.abas.filter((a) => a.nome.toLowerCase() === String(opts.aba).toLowerCase());
    if (!abas[0]) morrer(`Aba "${opts.aba}" não existe. Abas: ${dados.abas.map((a) => a.nome).join(", ")}`);
  }

  if (opts.spec) { process.stdout.write(JSON.stringify(specDe({ ...dados, abas }), null, 2) + "\n"); return; }
  if (opts.json) {
    const out = abas.map((a) => {
      const m = a.maxLinha ? matriz(a) : [];
      const { titulo, inicio } = acharCabecalho(m);
      return {
      nome: a.nome, titulo, linhas: a.maxLinha, colunas: a.maxCol, formulas: a.formulas,
      linhaCabecalho: a.maxLinha ? inicio + 1 : 0,
      cabecalho: a.maxLinha ? m[inicio] : [],
      dados: matriz(a, { crus: true }).slice(inicio),
      formulasPorCelula: Object.fromEntries([...a.celulas].filter(([, c]) => c.f !== undefined).map(([r, c]) => [r, "=" + c.f])),
      };
    });
    process.stdout.write(JSON.stringify({ arquivo: caminho, macro: dados.temMacro, abas: out }, null, 2) + "\n");
    return;
  }
  if (opts.csv !== undefined) {
    const pasta = typeof opts.csv === "string" && opts.csv ? opts.csv : path.dirname(caminho);
    fs.mkdirSync(pasta, { recursive: true });
    const base = path.basename(caminho).replace(/\.(xlsx|xlsm|csv|txt)$/i, "");
    for (const a of abas) {
      const nome = path.join(pasta, `${base}-${a.nome.replace(/[^\wÀ-ſ-]+/g, "_")}.csv`);
      fs.writeFileSync(nome, "\uFEFF" + csvDe(matriz(a)));
      console.log(`✔ ${nome} (${a.maxLinha} linhas)`);
    }
    return;
  }

  // resumo legível
  console.log(`\n${caminho}${dados.sep ? ` (CSV, separador "${dados.sep === "\t" ? "tab" : dados.sep}")` : ""}: ${dados.abas.length} aba(s)${dados.temMacro ? ", COM MACRO" : ""}`);
  const nMostrar = parseInt(opts.linhas || "8", 10);
  for (const a of abas) {
    console.log(`\n── ${a.nome}: ${a.maxLinha} linhas × ${a.maxCol} colunas, ${a.formulas} fórmula(s)`);
    if (!a.maxLinha) continue;
    const m = matriz(a);
    const largs = m[0].map((_, i) => Math.min(28, Math.max(3, ...m.slice(0, nMostrar + 1).map((l) => String(l[i] ?? "").length))));
    const linhaMd = (l) => "| " + l.map((c, i) => String(c ?? "").slice(0, 28).padEnd(largs[i])).join(" | ") + " |";
    console.log(linhaMd(m[0].map((c, i) => c || letraCol(i + 1))));
    console.log("|" + largs.map((w) => "-".repeat(w + 2)).join("|") + "|");
    for (const l of m.slice(1, nMostrar + 1)) console.log(linhaMd(l));
    if (m.length - 1 > nMostrar) console.log(`  … mais ${m.length - 1 - nMostrar} linha(s). Use --linhas N, --json ou --csv pra ver tudo.`);
    if (opts.formulas) {
      for (const [r, c] of a.celulas) if (c.f !== undefined) console.log(`  ${r}: =${c.f}${c.v !== null && c.v !== undefined ? `  → ${formatar({ ...c, f: undefined })}` : ""}`);
    }
  }
  console.log(`\nOpções: --json (tudo), --csv (um arquivo por aba), --spec (JSON pra editar e gerar de novo), --formulas`);
}

// ─────────────────────────── exemplo ───────────────────────────

const EXEMPLO = {
  titulo: "Orçamento — reforma da sala",
  autor: "Contex OS",
  corCabecalho: "#1F3A5F",
  abas: [
    {
      nome: "Orçamento",
      titulo: "Orçamento — reforma da sala",
      colunas: [
        { titulo: "Item", tipo: "texto", largura: 32 },
        { titulo: "Qtd", tipo: "inteiro", largura: 8 },
        { titulo: "Unidade", tipo: "texto", largura: 10, opcoes: ["un", "m²", "h", "kg"] },
        { titulo: "Valor unitário", tipo: "moeda" },
        { titulo: "Total", tipo: "moeda", formula: "=B{n}*D{n}" },
        { titulo: "Entrega", tipo: "data" },
      ],
      linhas: [
        ["Tinta acrílica 18 L", 2, "un", 289.9, null, "2026-10-02"],
        ["Mão de obra pintura", 40, "m²", 22.5, null, "2026-10-06"],
        ["Piso vinílico", 18, "m²", 89, null, "2026-10-10"],
      ],
      linhasExtras: 5,
      totais: { "Qtd": "soma", "Total": "soma" },
      filtro: true,
      imprimir: "retrato",
    },
    {
      nome: "Resumo",
      colunas: [{ titulo: "Linha", largura: 26 }, { titulo: "Valor", tipo: "moeda", largura: 16 }],
      linhas: [
        ["Subtotal", "=Orçamento!E11"],
        ["Desconto (%)", { v: 0.05, tipo: "percentual" }],
        ["Desconto (R$)", "=B2*B3"],
        ["Total com desconto", "=B2-B4"],
        ["Entrada (40%)", "=ARRED(B5*0,4;2)"],
        ["Saldo", "=B5-B6"],
      ],
      congelar: true,
      filtro: false,
    },
    {
      nome: "Como usar",
      texto: [
        "# Como usar esta planilha",
        "Preencha só as colunas Item, Qtd, Unidade, Valor unitário e Entrega. A coluna Total e a linha de total se calculam sozinhas.",
        "As cinco linhas em branco no fim já estão formatadas: é só digitar. Precisa de mais? Insira linhas ACIMA da linha Total pra fórmula continuar somando.",
        "## Aba Resumo",
        "O desconto está em B3. Mude o percentual e o resto acompanha.",
        "Gerada pelo Contex OS. Se editar a estrutura (nova coluna, nova aba), avise o assistente pra ele atualizar a spec e não sobrescrever o que você mudou.",
      ],
    },
  ],
};

// ─────────────────────────── CLI ───────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--ajuda") || args.includes("-h") || args.includes("--help")) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
    process.exit(0);
  }
  const opts = {};
  const livres = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--ler") opts.ler = args[++i];
    else if (a === "--aba") opts.aba = args[++i];
    else if (a === "--linhas") opts.linhas = args[++i];
    else if (a === "--json") opts.json = true;
    else if (a === "--spec") opts.spec = true;
    else if (a === "--formulas") opts.formulas = true;
    else if (a === "--csv") { opts.csv = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : ""; }
    else if (a === "--exemplo") { opts.exemplo = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : ""; }
    else if (a === "--sobrescrever") opts.sobrescrever = true;
    else if (a === "--silencioso") SILENCIOSO = true;
    else if (a.startsWith("--")) morrer(`Opção desconhecida: ${a}`, "Veja as opções com --ajuda");
    else livres.push(a);
  }

  if (opts.exemplo !== undefined) {
    const txt = JSON.stringify(EXEMPLO, null, 2) + "\n";
    if (opts.exemplo) { fs.writeFileSync(opts.exemplo, txt); console.log(`✔ exemplo de spec gravado em ${opts.exemplo}\n  gere com: node scripts/gerar-planilha.js ${opts.exemplo}`); }
    else process.stdout.write(txt);
    return;
  }
  if (opts.ler) { ler(opts.ler, opts); return; }
  if (!livres[0]) morrer("Falta a spec.", "Uso: node scripts/gerar-planilha.js <spec.json> [saida.xlsx]");
  gerar(livres[0], livres[1], opts);
}

if (require.main === module) main();

module.exports = { gerar, lerXlsx, parseCsv, normalizarFormula, criarAvaliador, crc32, zipar, deszipar, serialData, parseNumeroBR };
