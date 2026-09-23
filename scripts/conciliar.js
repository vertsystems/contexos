#!/usr/bin/env node
/**
 * Contex OS — conciliar.js
 * Lê o extrato do banco (OFX ou CSV de Nubank PJ, Itaú, BB, Inter e parecidos,
 * ou .xlsx) e o que deveria ter entrado e saído (faturas, maquininha, Pix
 * cobrado, lançamentos do caixa), casa os dois lados em camadas com tolerância
 * declarada e escreve a conciliação do mês: conciliados, só no banco, só nos
 * registros, e o quadro que fecha a zero.
 *
 * Existe porque OFX de banco brasileiro vem em SGML sem tag de fechamento, com
 * cabeçalho ENCODING:USASCII e acento em CP1252 (lido como UTF-8 vira "Jo�o");
 * porque CSV de cada banco tem coluna com nome diferente e valor no formato
 * "1.234,56 D"; e porque conciliar de cabeça descarta a tarifa de R$ 12,90 e o
 * Pix sem nome, que somados são a diferença que ninguém explica no fim do mês.
 * Aqui nenhuma linha some: cada uma cai em exatamente um dos quatro grupos.
 *
 * Uso:
 *   node scripts/conciliar.js <extrato.ofx|.csv|.xlsx> --registros <arq> [--registros <arq2>...] [opções]
 *   node scripts/conciliar.js <extrato.ofx|.csv> --ler          só mostra o extrato lido (data, descrição, valor)
 *
 * Registros: CSV, .xlsx ou JSON com colunas (nome aproximado, qualquer ordem)
 * data, descrição (ou cliente/fornecedor/referente), valor e, se quiser, origem
 * (proposta, contrato, maquininha, pix, caixa) e tipo (entrada/saída) quando o
 * valor vem sem sinal. Entrada é positiva, saída é negativa.
 *
 * Opções:
 *   --mes AAAA-MM          mês conciliado (padrão: o mês da maioria das linhas do extrato)
 *   --saida <arquivo.md>   grava o markdown em vez de imprimir
 *   --cobranca <arq.csv>   grava os recebíveis que não caíram no formato que o scripts/regua.js lê
 *   --json                 imprime o resultado em JSON, pra outra ferramenta ler
 *   --dias <n>             janela da camada 2, em dias úteis (padrão: 2)
 *   --tolerancia <pct>     diferença de valor aceita na camada 3, em % (padrão: 2)
 *   --janela <n>           janela da camada 3 e do um-pra-muitos, em dias úteis (padrão: 5)
 *   --feriado DD/MM        feriado local que fecha banco (repetir pra cada um)
 *   --saldo-inicial <v>    saldo da conta no início do mês, quando o extrato não traz
 *   --hoje DD/MM/AAAA      data de referência do atraso (padrão: hoje)
 *
 * Camadas, na ordem (cada linha casa uma vez só):
 *   1  mesmo valor em centavos e mesma data
 *   2  mesmo valor, até N dias úteis de diferença (padrão 2)
 *   3  nome parecido e valor igual em até 30 dias corridos, ou valor até X% diferente em até J dias úteis
 *   4  um lançamento de um lado igual à soma de 2 ou 3 do outro, dentro de J dias úteis
 *
 * Depois das camadas, o que sobrou é cruzado com o que ficou FORA do mês: a
 * fatura prevista em 28/08 cujo crédito caiu em 28/08 continua listada, mas com
 * "casou com lançamento fora do mês" na classe, e o --cobranca a deixa de fora.
 * Sem isso, quem pagou no mês passado entraria na régua de cobrança deste.
 *
 * Node 18+, sem dependência. Usa scripts/br.js (feriados, dia útil, números) e
 * scripts/gerar-planilha.js (CSV e .xlsx).
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const PADRAO = { dias: 2, tolerancia: 2, janela: 5, maxCombo: 3, maxCandidatos: 12 };

// ─────────────────────────── leitura de bytes ───────────────────────────

/** Decodifica como UTF-8 se for UTF-8 válido; senão como Windows-1252 (o "USASCII com acento" dos bancos). */
function decodificar(buf) {
  try {
    return { texto: new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, ""), codificacao: "UTF-8" };
  } catch (e) {
    let texto;
    try { texto = new TextDecoder("windows-1252").decode(buf); }
    catch (e2) { texto = buf.toString("latin1"); }
    return { texto, codificacao: "Windows-1252" };
  }
}

/** "1.234,56" · "1234.56" · "1,234.56" · "-1.234,56" · "(1.234,56)" · "1.234,56 D" · "R$ 1.234,56 C" → número com sinal. */
function valorBR(s) {
  if (typeof s === "number") return s;
  let t = String(s ?? "").trim();
  if (!t) return NaN;
  let sinal = 1;
  if (/^\(.*\)$/.test(t)) { sinal = -1; t = t.slice(1, -1); }
  if (/\bD\b\s*$/i.test(t) || /^D\b/i.test(t)) { sinal = -1; t = t.replace(/\bD\b/gi, ""); }
  else if (/\bC\b\s*$/i.test(t) || /^C\b/i.test(t)) { t = t.replace(/\bC\b/gi, ""); }
  if (/-\s*$/.test(t)) { sinal = -1; t = t.replace(/-\s*$/, ""); }
  if (/^-/.test(t)) { sinal = -1; t = t.slice(1); }
  let corpo = t.replace(/[^\d.,]/g, "").trim();
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(corpo)) corpo = corpo.replace(/,/g, ""); // 1,234.56 é milhar em inglês, não decimal
  const n = br.numero(corpo);
  return isNaN(n) ? NaN : br.centavos(sinal * n);
}

/** Data em qualquer formato que banco usa: DD/MM/AAAA, AAAA-MM-DD, AAAAMMDD, DD/MM/AA, "DD/MM/AAAA 10:32". */
function dataBR(s, anoPadrao) {
  if (s instanceof Date) return s;
  let t = String(s ?? "").trim().split(/[ T]/)[0];
  let m;
  if ((m = t.match(/^(\d{4})(\d{2})(\d{2})/))) return br.lerData(`${m[1]}-${m[2]}-${m[3]}`);
  if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/))) t = `${m[1]}/${m[2]}/20${m[3]}`;
  if ((m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) t = `${m[1]}/${m[2]}/${m[3]}`;
  return br.lerData(t, anoPadrao);
}

// ─────────────────────────── OFX ───────────────────────────

function ehOfx(texto) { return /OFXHEADER|<OFX>/i.test(texto.slice(0, 2000)); }

/** Valor de uma tag SGML/XML: <TAG>valor até a quebra de linha ou a próxima tag. */
function tag(bloco, nome) {
  const m = bloco.match(new RegExp(`<${nome}>\\s*([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : "";
}

function lerOfx(texto) {
  const avisos = [];
  const cabecalho = texto.slice(0, 600);
  const enc = (cabecalho.match(/ENCODING:\s*(\S+)/i) || [])[1];
  const charset = (cabecalho.match(/CHARSET:\s*(\S+)/i) || [])[1];
  if (enc) avisos.push(`cabeçalho OFX declara ENCODING:${enc}${charset ? " CHARSET:" + charset : ""}`);
  const blocos = [...texto.matchAll(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRN>\s*<\/BANKTRANLIST>|<LEDGERBAL>|$)/gi)];
  const lancamentos = [];
  const vistos = new Set();
  let duplicados = 0;
  for (const [, b] of blocos) {
    const data = dataBR(tag(b, "DTPOSTED"));
    const valor = valorBR(tag(b, "TRNAMT"));
    const id = tag(b, "FITID");
    const descricao = [tag(b, "NAME"), tag(b, "MEMO")].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(" · ");
    if (!data || isNaN(valor)) { avisos.push(`lançamento OFX sem data ou valor legível: "${b.replace(/\s+/g, " ").slice(0, 80)}"`); continue; }
    if (id && vistos.has(id)) { duplicados++; continue; }
    if (id) vistos.add(id);
    lancamentos.push({ data, valor, descricao: descricao || "(sem descrição)", id, tipo: tag(b, "TRNTYPE"), documento: tag(b, "CHECKNUM") || tag(b, "REFNUM") });
  }
  if (duplicados) avisos.push(`${duplicados === 1 ? "1 lançamento com o mesmo FITID ignorado" : duplicados + " lançamentos com o mesmo FITID ignorados"} (o banco repetiu a linha)`);
  // BALAMT vem "5557.80" na maioria dos bancos e "5.557,80" em alguns (o mesmo
  // que faz TRNAMT sair com vírgula); valorBR entende os dois.
  const saldoFinal = tag(texto, "BALAMT");
  const dataSaldo = tag(texto, "DTASOF");
  const conta = tag(texto, "ACCTID");
  return {
    formato: "OFX", lancamentos, avisos,
    saldoFinal: saldoFinal && !isNaN(valorBR(saldoFinal)) ? valorBR(saldoFinal) : null,
    dataSaldo: dataSaldo ? dataBR(dataSaldo) : null,
    conta: conta ? "…" + conta.slice(-4) : null,
    banco: tag(texto, "ORG") || tag(texto, "BANKID") || null,
  };
}

// ─────────────────────────── CSV e planilha ───────────────────────────

const COLUNAS = {
  data: /^(data|dt|date|data ?(do )?(lan[cç]amento|mov(imento)?|da transa[cç][aã]o)|dia)$/i,
  descricao: /^(descri[cç][aã]o|hist[oó]rico|lan[cç]amento|t[ií]tulo|memo|name|nome|descr|detalhe|opera[cç][aã]o)$/i,
  valor: /^(valor|montante|quantia|amount|valor ?\(r\$\)|vlr)$/i,
  credito: /^(cr[eé]dito|entrada|entradas|receita|valor ?cr[eé]dito|receb)/i,
  debito: /^(d[eé]bito|sa[ií]da|sa[ií]das|despesa|valor ?d[eé]bito|pago)/i,
  saldo: /^saldo/i,
  id: /^(identificador|id|n[uú]mero ?(do )?documento|documento|doc|refer[eê]ncia|fitid|c[oó]digo)/i,
  tipo: /^(tipo|natureza|d\/c|c\/d|sinal)$/i,
  origem: /^(origem|fonte|canal)$/i,
  cliente: /^(cliente|fornecedor|referente|quem|pagador|benefici[aá]rio|contraparte|servi[cç]o|produto)$/i,
};

function limpo(s) { return br.semAcento(String(s ?? "")).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); }

function acharColunas(cab) {
  const idx = {};
  cab.forEach((c, i) => {
    const t = String(c ?? "").trim();
    for (const [nome, re] of Object.entries(COLUNAS)) {
      if (idx[nome] === undefined && re.test(t)) { idx[nome] = i; break; }
    }
  });
  // toda coluna de texto que descreve o lançamento entra na descrição, na ordem: cliente, referente, descrição, histórico
  idx.textos = [];
  cab.forEach((c, i) => {
    const t = String(c ?? "").trim();
    if (COLUNAS.cliente.test(t) || COLUNAS.descricao.test(t)) idx.textos.push(i);
  });
  return idx;
}

function matrizDaAba(aba) {
  const linhas = [];
  for (const [ref, cel] of aba.celulas) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    const lin = +m[2];
    if (!linhas[lin - 1]) linhas[lin - 1] = [];
    let v = cel.v;
    if (cel.tipo === "data" && typeof v === "number") { const base = new Date(1899, 11, 30); v = br.fmt(new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.floor(v))); }
    linhas[lin - 1][col - 1] = v === null || v === undefined ? "" : v;
  }
  return linhas.filter((l) => l && l.some((c) => c !== "")).map((l) => Array.from(l, (c) => (c === undefined ? "" : c)));
}

function linhasDe(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  const planilha = require("./gerar-planilha.js");
  if (ext === ".xlsx") {
    const { abas } = planilha.lerXlsx(arquivo);
    if (!abas.length) throw new Error("planilha sem aba");
    return { linhas: matrizDaAba(abas[0]), codificacao: "xlsx" };
  }
  const { texto, codificacao } = decodificar(fs.readFileSync(arquivo));
  return { linhas: planilha.parseCsv(texto).linhas, codificacao, texto };
}

/** Tabela (matriz) → lançamentos. Acha o cabeçalho pulando o preâmbulo (Inter, BB) e entende Itaú sem cabeçalho. */
function lerTabela(linhas, { anoPadrao } = {}) {
  const avisos = [];
  let inicio = -1, idx = null;
  for (let i = 0; i < Math.min(linhas.length, 30); i++) {
    const c = acharColunas(linhas[i]);
    if (c.data !== undefined && (c.valor !== undefined || c.credito !== undefined || c.debito !== undefined)) { inicio = i; idx = c; break; }
  }
  if (inicio < 0) {
    // Itaú: "DD/MM/AAAA;lançamento;valor" sem cabeçalho; ou qualquer tabela data;descrição;valor
    const l = linhas.find((x) => x.length >= 3 && dataBR(x[0]) && !isNaN(valorBR(x[x.length - 1])));
    if (!l) throw new Error("não achei coluna de data e de valor; se o arquivo tem cabeçalho, ele precisa ter \"Data\" e \"Valor\" (ou Crédito/Débito)");
    idx = { data: 0, descricao: 1, valor: l.length - 1, textos: [1] };
    if (l.length > 3) idx.textos.push(l.length - 2);
    inicio = -1;
    avisos.push("arquivo sem cabeçalho: li como data; descrição; valor (padrão do Itaú)");
  }
  const lancamentos = [];
  for (let i = inicio + 1; i < linhas.length; i++) {
    const l = linhas[i];
    const data = dataBR(l[idx.data], anoPadrao);
    if (!data) {
      // linha de saldo, rodapé e total não têm data nem valor: essas somem mesmo.
      // Linha com valor legível e data que não existe (31/02, ano faltando) vira aviso.
      const cru = String(l[idx.data] ?? "").trim();
      const v = idx.valor !== undefined ? valorBR(l[idx.valor]) : valorBR(l[idx.credito]) || valorBR(l[idx.debito]);
      if (cru && !isNaN(v)) avisos.push(`linha ${i + 1}: data "${cru}" não existe ou está em formato que não reconheço; a linha de ${br.reais(v)} ficou de fora`);
      continue;
    }
    let valor;
    if (idx.valor !== undefined) valor = valorBR(l[idx.valor]);
    else {
      // colunas separadas de Crédito e Débito: as duas vazias é linha de saldo ou
      // de rodapé, não lançamento de R$ 0,00 (que entraria na contagem e na conta)
      const c = valorBR(l[idx.credito]), d = valorBR(l[idx.debito]);
      if (isNaN(c) && isNaN(d)) continue;
      valor = br.centavos((isNaN(c) ? 0 : c) - Math.abs(isNaN(d) ? 0 : d));
    }
    if (isNaN(valor)) { avisos.push(`linha ${i + 1}: valor ilegível "${l[idx.valor]}"`); continue; }
    if (idx.tipo !== undefined) {
      const t = limpo(l[idx.tipo]);
      if (/^(d|debito|saida|despesa|pagar|pagamento)$/.test(t) && valor > 0) valor = -valor;
      if (/^(c|credito|entrada|receita|receber)$/.test(t) && valor < 0) valor = -valor;
    }
    const partes = idx.textos.map((k) => String(l[k] ?? "").trim()).filter(Boolean).filter((x, k, a) => a.indexOf(x) === k);
    const descricao = partes.join(" · ") || "(sem descrição)";
    if (/^saldo (do dia|anterior|final|inicial)/i.test(descricao) || /^s ?a ?l ?d ?o$/i.test(descricao)) continue;
    lancamentos.push({
      data, valor, descricao,
      id: idx.id !== undefined ? String(l[idx.id] ?? "").trim() : "",
      saldo: idx.saldo !== undefined ? valorBR(l[idx.saldo]) : NaN,
      origem: idx.origem !== undefined ? String(l[idx.origem] ?? "").trim() : "",
    });
  }
  return { lancamentos, avisos, colunas: idx };
}

function lerExtrato(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  if (ext === ".ofx" || ext === ".qfx") {
    const { texto, codificacao } = decodificar(fs.readFileSync(arquivo));
    const r = lerOfx(texto);
    r.codificacao = codificacao;
    return r;
  }
  const { linhas, codificacao, texto } = linhasDe(arquivo);
  if (texto && ehOfx(texto)) { const r = lerOfx(texto); r.codificacao = codificacao; return r; }
  const r = lerTabela(linhas);
  const comSaldo = r.lancamentos.filter((x) => !isNaN(x.saldo));
  const ultimo = comSaldo.length ? comSaldo.reduce((a, b) => (b.data >= a.data ? b : a)) : null;
  return {
    formato: ext === ".xlsx" ? "XLSX" : "CSV", lancamentos: r.lancamentos, avisos: r.avisos, codificacao,
    saldoFinal: ultimo ? ultimo.saldo : null, dataSaldo: ultimo ? ultimo.data : null, conta: null, banco: null,
  };
}

function lerRegistros(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  const origemPadrao = path.basename(arquivo).replace(/\.[^.]+$/, "");
  let lista, avisos = [];
  if (ext === ".json") {
    const j = JSON.parse(fs.readFileSync(arquivo, "utf8"));
    const arr = Array.isArray(j) ? j : j.registros || j.lancamentos;
    if (!Array.isArray(arr)) throw new Error(`${arquivo}: o JSON precisa ser uma lista ou ter a chave "registros"`);
    lista = arr.map((r, i) => {
      const data = dataBR(r.data || r.vencimento || r.previsto);
      let valor = valorBR(r.valor);
      if (r.tipo && /sa[ií]da|d[eé]bito|pagar|despesa/i.test(r.tipo) && valor > 0) valor = -valor;
      if (!data || isNaN(valor)) { avisos.push(`${arquivo} item ${i + 1}: sem data ou valor`); return null; }
      return { data, valor, descricao: [r.descricao, r.cliente, r.fornecedor, r.referente].filter(Boolean).join(" · ") || "(sem descrição)", origem: r.origem || origemPadrao, id: r.id || "" };
    }).filter(Boolean);
  } else {
    const { linhas } = linhasDe(arquivo);
    const r = lerTabela(linhas);
    avisos = r.avisos.map((a) => `${path.basename(arquivo)}: ${a}`);
    lista = r.lancamentos.map((x) => ({ ...x, origem: x.origem || origemPadrao }));
  }
  return { lista, avisos };
}

// ─────────────────────────── matcher ───────────────────────────

const PALAVRAS_VAZIAS = new Set(("pix ted doc transf transferencia recebido recebida enviado enviada pagamento pgto pag compra cartao debito credito " +
  "de da do das dos e em para por com ltda me epp eireli sa s a cia ref parcela fatura nf boleto cobranca deposito saque tarifa " +
  "conta cc ag agencia banco bco mov movimentacao lancamento valor cpf cnpj enviada recebida via internet mobile app " +
  // mês é o token que mais aparece nos dois lados ("Fatura setembro"): se contasse
  // como nome parecido, a camada 3 casaria dois clientes diferentes do mesmo mês
  "janeiro fevereiro marco abril maio junho julho agosto setembro outubro novembro dezembro " +
  "jan fev mar abr mai jun jul ago set out nov dez mes mensal mensalidade ").split(/\s+/).filter(Boolean));

function tokens(s) {
  return limpo(s).split(" ").filter((t) => t.length >= 3 && !PALAVRAS_VAZIAS.has(t) && !/^\d+$/.test(t));
}

/** Dice sobre tokens, ou um token "forte" (5+ letras) em comum, ou os mesmos 11/14 dígitos de CPF/CNPJ. */
function parecidos(a, b) {
  const da = (String(a).match(/\d{11,14}/g) || []), db = (String(b).match(/\d{11,14}/g) || []);
  if (da.some((x) => db.includes(x))) return true;
  const ta = new Set(tokens(a)), tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return false;
  const comuns = [...ta].filter((t) => tb.has(t));
  if (comuns.some((t) => t.length >= 5)) return true;
  return (2 * comuns.length) / (ta.size + tb.size) >= 0.5;
}

function iguais(a, b) { return Math.abs(a - b) < 0.005; }

function conciliar(banco, registros, opc = {}) {
  const o = { ...PADRAO, feriados: [] };
  for (const [k, v] of Object.entries(opc)) if (v !== undefined && v !== null && !(typeof v === "number" && isNaN(v))) o[k] = v;
  const B = banco.map((x, i) => ({ ...x, i, lado: "banco", casado: null }));
  const R = registros.map((x, i) => ({ ...x, i, lado: "registros", casado: null }));
  const pares = [];
  const du = (a, b) => Math.abs(br.diasUteisEntre(a < b ? a : b, a < b ? b : a, o.feriados));
  const dc = (a, b) => Math.abs(br.diasEntre(a, b));
  const livresB = () => B.filter((x) => !x.casado);
  const livresR = () => R.filter((x) => !x.casado);
  const fechar = (bs, rs, camada, regra) => {
    const p = { camada, regra, banco: bs, registros: rs, diferenca: br.centavos(bs.reduce((s, x) => s + x.valor, 0) - rs.reduce((s, x) => s + x.valor, 0)) };
    for (const x of [...bs, ...rs]) x.casado = p;
    pares.push(p);
  };

  // camada 1: valor e data iguais
  for (const b of livresB()) {
    const r = livresR().find((x) => iguais(x.valor, b.valor) && br.iso(x.data) === br.iso(b.data));
    if (r) fechar([b], [r], 1, "mesmo valor, mesma data");
  }
  // camada 2: valor igual, ±N dias úteis (o mais próximo primeiro)
  for (const b of livresB()) {
    const c = livresR().filter((x) => iguais(x.valor, b.valor) && du(x.data, b.data) <= o.dias).sort((p, q) => du(p.data, b.data) - du(q.data, b.data));
    if (c.length) {
      const u = du(c[0].data, b.data), k = dc(c[0].data, b.data);
      // sábado, domingo e feriado dão 0 dia útil com data diferente: dizer os dois
      fechar([b], [c[0]], 2, u ? `mesmo valor, ${plural(u, "dia útil", "dias úteis")} de diferença` : `mesmo valor, ${plural(k, "dia corrido", "dias corridos")} de diferença sem dia útil no meio (fim de semana ou feriado)`);
    }
  }
  // camada 3: nome parecido + (valor igual em 30 dias corridos, ou valor ±X% em J dias úteis)
  for (const b of livresB()) {
    const c = livresR().filter((x) => Math.sign(x.valor) === Math.sign(b.valor) && parecidos(x.descricao, b.descricao) && (
      (iguais(x.valor, b.valor) && dc(x.data, b.data) <= 30) ||
      (Math.abs(x.valor - b.valor) <= Math.abs(b.valor) * o.tolerancia / 100 && du(x.data, b.data) <= o.janela)
    )).sort((p, q) => Math.abs(p.valor - b.valor) - Math.abs(q.valor - b.valor) || dc(p.data, b.data) - dc(q.data, b.data));
    if (c.length) {
      const r = c[0];
      const regra = iguais(r.valor, b.valor) ? `nome parecido, mesmo valor, ${dc(r.data, b.data)} dia(s) corrido(s)` : `nome parecido, valor ${br.pct(Math.abs(r.valor - b.valor) / Math.abs(b.valor))} diferente`;
      fechar([b], [r], 3, regra);
    }
  }
  // camada 4: um pra muitos (2 ou 3), nos dois sentidos, dentro da janela. Limitado a maxCandidatos por alvo.
  const umPraMuitos = (alvo, pool) => {
    const c = pool.filter((x) => Math.sign(x.valor) === Math.sign(alvo.valor) && du(x.data, alvo.data) <= o.janela && Math.abs(x.valor) <= Math.abs(alvo.valor) + 0.02)
      .sort((p, q) => du(p.data, alvo.data) - du(q.data, alvo.data)).slice(0, o.maxCandidatos);
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      if (Math.abs(c[i].valor + c[j].valor - alvo.valor) <= 0.02) return [c[i], c[j]];
    }
    if (o.maxCombo >= 3) for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) for (let k = j + 1; k < c.length; k++) {
      if (Math.abs(c[i].valor + c[j].valor + c[k].valor - alvo.valor) <= 0.02) return [c[i], c[j], c[k]];
    }
    return null;
  };
  for (const b of livresB()) {
    const g = umPraMuitos(b, livresR());
    if (g) fechar([b], g, 4, `um lançamento do banco = soma de ${g.length} registros`);
  }
  for (const r of livresR()) {
    const g = umPraMuitos(r, livresB());
    if (g) fechar(g, [r], 4, `um registro = soma de ${g.length} lançamentos do banco`);
  }

  const soBanco = livresB().map((x) => ({ ...x, classe: classificarBanco(x) }));
  const soRegistros = livresR().map((x) => ({ ...x, classe: x.valor > 0 ? "recebível que não caiu" : "pagamento registrado que não saiu" }));
  const soma = (l) => br.centavos(l.reduce((s, x) => s + x.valor, 0));
  const concB = pares.flatMap((p) => p.banco), concR = pares.flatMap((p) => p.registros);
  const quadro = {
    totalBanco: soma(B), totalRegistros: soma(R),
    soBanco: soma(soBanco), soRegistros: soma(soRegistros),
    conciliadoBanco: soma(concB), conciliadoRegistros: soma(concR),
    toleranciaCamada3: br.centavos(pares.filter((p) => p.camada === 3).reduce((s, p) => s + p.diferenca, 0)),
    arredondamentoCamada4: br.centavos(pares.filter((p) => p.camada === 4).reduce((s, p) => s + p.diferenca, 0)),
  };
  quadro.diferenca = br.centavos((quadro.totalBanco - quadro.soBanco) - (quadro.totalRegistros - quadro.soRegistros) - quadro.toleranciaCamada3 - quadro.arredondamentoCamada4);
  return { pares, soBanco, soRegistros, quadro, opcoes: o, contagem: { banco: B.length, registros: R.length, conciliadosBanco: concB.length, conciliadosRegistros: concR.length } };
}

/**
 * Cruza o que sobrou com o que ficou FORA do mês, nos dois sentidos.
 *
 * Existe por causa de um falso "não caiu" que só aparece na vida real: o
 * registro previsto em 28/08 entra na conciliação de setembro pela janela da
 * camada 3, mas o crédito dele caiu em 28/08 e está fora do mês, então não tem
 * com quem casar. Sem este cruzamento, a cliente que pagou em agosto sai na
 * lista de cobrança de setembro. A linha continua em "só nos registros" (o
 * movimento do mês não muda), mas com o destino certo escrito na classe, e o
 * --cobranca a deixa de fora.
 */
function cruzarComForaDoMes(res, fora, o) {
  const du = (a, b) => Math.abs(br.diasUteisEntre(a < b ? a : b, a < b ? b : a, o.feriados));
  const marcar = (sobras, candidatos, molde, porNome) => {
    const usados = new Set();   // cada linha de fora explica uma sobra só
    for (const x of sobras) {
      const k = candidatos.findIndex((y, i) => !usados.has(i) && iguais(y.valor, x.valor) &&
        (du(y.data, x.data) <= o.dias || (porNome && parecidos(y.descricao, x.descricao))));
      if (k < 0) continue;
      usados.add(k);
      x.foraDoMes = br.iso(candidatos[k].data).slice(0, 7);
      x.classe = molde(candidatos[k]);
    }
  };
  marcar(res.soRegistros, fora.banco, (c) => `casou com lançamento de ${br.fmt(c.data)}, fora do mês: conferir na conciliação de ${br.fmt(c.data).slice(3)}`);
  // do lado do banco vale também o nome: a fatura de julho paga em setembro cai
  // longe da data prevista, e é exatamente o crédito que viraria "a identificar"
  marcar(res.soBanco, fora.registros, (c) => `bate com registro previsto em ${br.fmt(c.data)}, fora do mês: recebimento de outra competência, não venda sem registro`, true);
  return res;
}

const CLASSES_BANCO = [
  ["tarifa", /tarifa|tar\b|manuten|pacote|cesta|anuidade|mensalidade (do )?(pacote|conta)|taxa (de )?(servi|manuten|ted|doc|saque)/i],
  ["juros e encargos", /juros|iof|encargo|mora|multa/i],
  ["imposto", /\bdas\b|darf|\bgps\b|inss|fgts|\biss\b|icms|simples nacional|receita federal|tributo/i],
  ["rendimento ou aplicação", /rendimento|remunera|aplica|resgate|cdb|tesouro|poupan|invest/i],
  ["estorno", /estorno|devolu|cancelamento|chargeback/i],
  ["transferência entre contas", /transf.*(mesma titularidade|entre contas|propria|própria)|aplicacao automatica|resgate automatico/i],
  ["Pix não identificado", /pix/i],
  ["cartão ou maquininha", /cart[aã]o|maquininha|stone|pagseguro|mercado ?pago|cielo|rede\b|getnet|sumup|infinitepay|ton\b/i],
];

function classificarBanco(x) {
  for (const [nome, re] of CLASSES_BANCO) if (re.test(x.descricao)) return nome;
  return "a identificar";
}

// ─────────────────────────── saída ───────────────────────────

/**
 * Mês com mais lançamentos. No empate vale o mês mais recente (extrato recém
 * exportado quase sempre pega o fim do mês passado e o começo deste), e o
 * segundo colocado volta em `outros` pra virar aviso: escolher mês em silêncio
 * joga metade do extrato em "fora do mês".
 */
function mesDe(lancamentos) {
  const cont = {};
  for (const l of lancamentos) { const k = br.iso(l.data).slice(0, 7); cont[k] = (cont[k] || 0) + 1; }
  const ordem = Object.entries(cont).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1));
  return { mes: ordem[0]?.[0], contagem: cont, outros: ordem.slice(1) };
}

function limitesDoMes(mes) {
  const [a, m] = mes.split("-").map(Number);
  return { inicio: new Date(a, m - 1, 1), fim: new Date(a, m, 0), ano: a, mesIdx: m - 1 };
}

/** "1 par", "2 pares" — o texto da saída é lido por gente. */
function plural(n, um, muitos) { return `${n} ${n === 1 ? um : muitos}`; }

function esc(s) { return String(s ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim(); }
const dt = (d) => `${br.fmt(d)} (${br.diaSemana(d)})`;

function markdown(res, ctx) {
  const { pares, soBanco, soRegistros, quadro, opcoes: o, contagem } = res;
  const L = [];
  const mesNome = `${br.MESES[ctx.limites.mesIdx]}/${ctx.limites.ano}`;
  L.push(`# Conciliação — ${mesNome}`, "");
  L.push(`> Extrato: ${ctx.extratoNome} (${ctx.extrato.formato}, ${ctx.extrato.codificacao}${ctx.extrato.banco ? ", " + ctx.extrato.banco : ""}${ctx.extrato.conta ? ", conta " + ctx.extrato.conta : ""}), ${contagem.banco} lançamentos no mês. Registros: ${ctx.registrosNomes.join(", ")}, ${contagem.registros} lançamentos.`);
  L.push(`> Tolerâncias: camada 2 até ${o.dias} dias úteis; camada 3 nome parecido com valor igual em 30 dias corridos ou até ${br.pct(o.tolerancia / 100, Number.isInteger(o.tolerancia) ? 0 : 2)} de diferença em ${o.janela} dias úteis; camada 4 soma de 2 ou 3 lançamentos em ${o.janela} dias úteis. Gerado em ${br.fmt(ctx.hoje)}.`);
  L.push("");
  L.push("## O mês em uma frase", "", "[o assistente escreve: quanto conciliou, o que sobrou de cada lado e o que fazer primeiro]", "");

  L.push("## Bate a zero", "");
  const difLados = br.centavos(quadro.conciliadoBanco - quadro.conciliadoRegistros);
  L.push("| Métrica | Banco | Registros |", "|---|---|---|");
  L.push(`| Movimento do mês | ${br.reais(quadro.totalBanco)} | ${br.reais(quadro.totalRegistros)} |`);
  L.push(`| (−) só de um lado | ${br.reais(quadro.soBanco)} | ${br.reais(quadro.soRegistros)} |`);
  L.push(`| = Conciliado | ${br.reais(quadro.conciliadoBanco)} | ${br.reais(quadro.conciliadoRegistros)} |`);
  L.push(`| Diferença entre os lados | ${br.reais(difLados)} | |`);
  L.push(`| Explicada pela camada 3 (valor com tolerância) | ${br.reais(quadro.toleranciaCamada3)} | |`);
  L.push(`| Explicada pela camada 4 (centavos da soma) | ${br.reais(quadro.arredondamentoCamada4)} | |`);
  L.push(`| Sobra sem explicação | ${br.reais(quadro.diferenca)} | |`);
  L.push("");
  L.push(`Conta: ${br.reais(quadro.totalBanco)} − ${br.reais(quadro.soBanco)} = ${br.reais(quadro.conciliadoBanco)} no banco; ${br.reais(quadro.totalRegistros)} − ${br.reais(quadro.soRegistros)} = ${br.reais(quadro.conciliadoRegistros)} nos registros; ${br.reais(quadro.conciliadoBanco)} − ${br.reais(quadro.conciliadoRegistros)} = ${br.reais(difLados)}, dos quais ${br.reais(quadro.toleranciaCamada3)} são a folga aceita na camada 3 e ${br.reais(quadro.arredondamentoCamada4)} a da camada 4. ${iguais(quadro.diferenca, 0) ? "Fecha a zero." : "NÃO fecha: há erro no script ou no arquivo, não entregar."}`);
  if (ctx.extrato.saldoFinal !== null && ctx.extrato.saldoFinal !== undefined) {
    L.push("", `Saldo final do extrato em ${ctx.extrato.dataSaldo ? br.fmt(ctx.extrato.dataSaldo) : "[data não informada]"}: ${br.reais(ctx.extrato.saldoFinal)}.` + (ctx.saldoInicial !== undefined ? ` Saldo inicial informado ${br.reais(ctx.saldoInicial)} + movimento ${br.reais(quadro.totalBanco)} = ${br.reais(br.centavos(ctx.saldoInicial + quadro.totalBanco))}${iguais(ctx.saldoInicial + quadro.totalBanco, ctx.extrato.saldoFinal) ? " (bate com o extrato)" : " (NÃO bate com o extrato: faltou lançamento ou o saldo inicial está errado)"}.` : ""));
  }
  L.push("");

  L.push(`## Só no banco (${soBanco.length})`, "");
  if (soBanco.length) {
    L.push("| Data | Descrição no extrato | Valor | Classe | O que fazer |", "|---|---|---|---|---|");
    for (const x of soBanco.sort((a, b) => a.data - b.data)) L.push(`| ${dt(x.data)} | ${esc(x.descricao)} | ${br.reais(x.valor)} | ${x.classe} | ${acaoBanco(x)} |`);
    L.push(`| Total | | ${br.reais(quadro.soBanco)} | | |`);
    L.push("", `Líquido só no banco: entradas ${br.reais(br.centavos(soBanco.filter((x) => x.valor > 0).reduce((s, x) => s + x.valor, 0)))} e saídas ${br.reais(br.centavos(soBanco.filter((x) => x.valor < 0).reduce((s, x) => s + x.valor, 0)))}.`);
  } else L.push("Nenhum lançamento do banco ficou sem registro.");
  L.push("");

  L.push(`## Só nos meus registros (${soRegistros.length})`, "");
  if (soRegistros.length) {
    L.push("| Previsto | Registro | Origem | Valor | Classe | Atraso em dias úteis |", "|---|---|---|---|---|---|");
    let atrasoSoma = 0;
    for (const x of soRegistros.sort((a, b) => a.data - b.data)) {
      const atraso = x.foraDoMes || x.data >= ctx.hoje ? 0 : br.diasUteisEntre(x.data, ctx.hoje, o.feriados);
      atrasoSoma += atraso;
      L.push(`| ${dt(x.data)} | ${esc(x.descricao)} | ${esc(x.origem)} | ${br.reais(x.valor)} | ${x.classe} | ${atraso} |`);
    }
    const receb = soRegistros.filter((x) => x.valor > 0 && !x.foraDoMes);
    L.push(`| Total | | | ${br.reais(quadro.soRegistros)} | | ${atrasoSoma} dias somados |`);
    L.push("", receb.length
      ? `Recebível que não caiu: ${plural(receb.length, "lançamento", "lançamentos")}, ${br.reais(br.centavos(receb.reduce((s, x) => s + x.valor, 0)))}${ctx.cobrancaArq ? `; os de cliente foram gravados em ${ctx.cobrancaArq} pro /cobranca (repasse de maquininha fica de fora: se confere no relatório da adquirente)` : " (rodar de novo com --cobranca <arquivo.csv> pra mandar os de cliente ao /cobranca)"}.`
      : "Nenhum recebível em aberto pra cobrar neste mês.");
    const cruzados = soRegistros.filter((x) => x.foraDoMes);
    if (cruzados.length) L.push("", `${plural(cruzados.length, "linha", "linhas")} deste lado bateu com lançamento de outro mês (coluna Classe): não é atraso, é competência diferente, e o /cobranca não recebe essas.`);
  } else L.push("Todo registro apareceu no banco.");
  L.push("");

  L.push(`## Conciliados (${plural(pares.length, "par", "pares")}, ${plural(contagem.conciliadosBanco, "lançamento do banco", "lançamentos do banco")} e ${plural(contagem.conciliadosRegistros, "registro", "registros")})`, "");
  const NOME_CAMADA = { 1: "exata", 2: "data próxima", 3: "nome e valor", 4: "soma" };
  L.push("| Data no banco | Descrição no extrato | Registro | Valor no banco | Camada | Como casou |", "|---|---|---|---|---|---|");
  for (const p of pares.sort((a, b) => a.banco[0].data - b.banco[0].data)) {
    const vb = br.centavos(p.banco.reduce((s, x) => s + x.valor, 0));
    L.push(`| ${p.banco.length === 1 ? dt(p.banco[0].data) : p.banco.map((x) => br.fmt(x.data)).join(" e ")} | ${p.banco.map((x) => esc(x.descricao)).join("; ")} | ${p.registros.map((x) => `${esc(x.descricao)} (${br.fmt(x.data)}, ${br.reais(x.valor)})`).join("; ")} | ${br.reais(vb)} | ${NOME_CAMADA[p.camada]} | ${p.regra}${iguais(p.diferenca, 0) ? "" : ", diferença " + br.reais(p.diferenca)} |`);
  }
  L.push(`| Total | | | ${br.reais(quadro.conciliadoBanco)} | | |`);
  const porCamada = [1, 2, 3, 4].map((c) => `${NOME_CAMADA[c]} (camada ${c}): ${pares.filter((p) => p.camada === c).length}`).join(", ");
  L.push("", `Por camada: ${porCamada}. Pares de "nome e valor" e "soma" merecem um olhar: são os que a regra aceitou com folga.`, "");

  const foraDeTudo = [...ctx.foraDoMes.banco, ...ctx.foraDoMes.registros];
  if (foraDeTudo.length) {
    L.push("## Fora do mês (não entraram na conta)", "");
    const grupo = (titulo, lista, destino) => {
      if (!lista.length) return;
      const total = br.centavos(lista.reduce((s, x) => s + x.valor, 0));
      L.push(`- **${titulo}:** ${plural(lista.length, "lançamento", "lançamentos")}, ${br.reais(total)} somados. ${destino}`);
      for (const x of lista.slice(0, 8)) L.push(`  - ${br.fmt(x.data)} · ${esc(x.descricao)} · ${br.reais(x.valor)}`);
      if (lista.length > 8) L.push(`  - e mais ${plural(lista.length - 8, "linha", "linhas")} do mesmo grupo`);
    };
    grupo("Extrato, fora de " + mesNome, ctx.foraDoMes.banco, "Conciliar no mês em que caíram.");
    grupo("Registros previstos antes de " + mesNome, ctx.foraDoMes.registros.filter((x) => x.data < ctx.limites.inicio),
      `Previstos mais de ${plural(ctx.janela, "dia útil", "dias úteis")} antes do dia 1: são da conciliação do mês deles, e é lá que aparecem se continuam em aberto.`);
    grupo("Registros previstos depois de " + mesNome, ctx.foraDoMes.registros.filter((x) => x.data > ctx.limites.fim),
      "Entram na conciliação do mês em que estão previstos.");
    L.push("");
  }

  L.push("## O que fazer com cada sobra", "", "[o assistente escreve, por linha das duas tabelas acima: identificar, lançar no caixa, cobrar, ou perguntar ao banco]", "");
  L.push("## Feriados considerados", "");
  const fer = br.feriados(ctx.limites.ano, o.feriados);
  const doMes = Object.entries(fer).filter(([k]) => Number(k.slice(3)) === ctx.limites.mesIdx + 1);
  L.push(doMes.length ? doMes.map(([k, v]) => `- ${k}/${ctx.limites.ano}: ${v}`).join("\n") : `- nenhum feriado nacional em ${mesNome}`);
  // o --feriado local vale pra conta de dia útil mesmo caindo em outro mês da janela:
  // se não sair listado, ninguém entende por que a camada 2 contou o que contou
  if (o.feriados.length) L.push(`- feriado local informado no comando, contado como dia sem banco: ${o.feriados.join(", ")}`);
  L.push("");
  if (ctx.avisos.length) { L.push("## Avisos da leitura", "", ...ctx.avisos.map((a) => `- ${a}`), ""); }
  return L.join("\n");
}

function acaoBanco(x) {
  // o cruzamento com o que ficou fora do mês reescreve a classe: a ação vem dele
  if (x.foraDoMes) return `conferir o registro de ${x.foraDoMes} e lançar na competência dele, não como venda nova`;
  switch (x.classe) {
    case "tarifa": return "lançar no caixa como custo fixo (tarifa bancária)";
    case "juros e encargos": return "lançar no caixa e conferir o que atrasou";
    case "imposto": return "lançar no caixa; conferir com o /obrigacoes";
    case "rendimento ou aplicação": return "lançar como rendimento (não é venda)";
    case "estorno": return "achar a venda ou compra de origem";
    case "transferência entre contas": return "conferir se é a mesma titularidade; não é receita nem despesa";
    case "Pix não identificado": return x.valor > 0 ? "descobrir quem pagou (comprovante, nome no extrato) e ligar ao registro" : "descobrir o que foi pago e lançar";
    case "cartão ou maquininha": return "comparar com o relatório da maquininha (líquido, não bruto)";
    default: return "identificar; se for venda, criar o registro; se for gasto, lançar no caixa";
  }
}

function csvCobranca(soRegistros) {
  const q = (s) => { const t = String(s ?? ""); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  // telefone e email saem em branco de propósito: o extrato não tem contato, e o
  // scripts/regua.js lê essas duas colunas pra montar a mensagem. Quem preenche
  // é o usuário (ou o /cadastro-clientes), e em branco vira "[a confirmar]" lá.
  const linhas = [["cliente", "referente", "valor", "vencimento", "telefone", "email", "origem"].join(";")];
  // maquininha e adquirente não se cobram por régua: o repasse se confere no relatório deles
  for (const x of soRegistros.filter((x) => x.valor > 0 && !x.foraDoMes && !/maquininha|adquirente|cart[aã]o|stone|pagseguro|cielo|getnet|rede\b|sumup|mercado ?pago|infinitepay/i.test(`${x.origem} ${x.descricao}`))) {
    const [cliente, ...resto] = String(x.descricao).split(" · ");
    linhas.push([q(cliente), q(resto.join(" · ") || x.origem || "conciliação"), br.reais(x.valor).replace("R$ ", ""), br.fmt(x.data), "", "", q(x.origem)].join(";"));
  }
  return linhas.join("\r\n") + "\r\n";
}

// ─────────────────────────── CLI ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function argumentos(argv) {
  const a = { registros: [], feriados: [], posicionais: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const prox = () => { if (argv[i + 1] === undefined) morrer(`a opção ${x} precisa de um valor`); return argv[++i]; };
    if (x === "--registros") a.registros.push(prox());
    else if (x === "--feriado") a.feriados.push(prox());
    else if (x === "--mes") a.mes = prox();
    else if (x === "--saida") a.saida = prox();
    else if (x === "--cobranca") a.cobranca = prox();
    else if (x === "--dias") a.dias = Number(prox());
    else if (x === "--tolerancia") a.tolerancia = br.numero(prox());
    else if (x === "--janela") a.janela = Number(prox());
    else if (x === "--saldo-inicial") { const v = prox(); a.saldoInicial = valorBR(v); if (isNaN(a.saldoInicial)) morrer(`--saldo-inicial precisa ser um valor, veio "${v}"`, 'use o formato brasileiro, entre aspas: --saldo-inicial "4.120,33"'); }
    else if (x === "--hoje") { const v = prox(); a.hoje = br.lerData(v); if (!a.hoje) morrer(`--hoje precisa ser DD/MM/AAAA e existir no calendário, veio "${v}"`); }
    else if (x === "--json") a.json = true;
    else if (x === "--ler") a.ler = true;
    else if (x.startsWith("--")) morrer(`opção desconhecida: ${x}`, "node scripts/conciliar.js --help mostra as opções");
    else a.posicionais.push(x);
  }
  return a;
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    console.log(fs.readFileSync(__filename, "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ""));
    process.exit(argv.length ? 0 : 1);
  }
  const a = argumentos(argv);
  const extratoArq = a.posicionais[0];
  if (!extratoArq) morrer("falta o extrato", "node scripts/conciliar.js dados/extrato.ofx --registros dados/registros-2026-09.csv");
  if (!fs.existsSync(extratoArq)) morrer(`não achei ${extratoArq}`);
  if (a.mes && !/^\d{4}-\d{2}$/.test(a.mes)) morrer(`--mes precisa ser AAAA-MM, veio "${a.mes}"`);
  for (const f of a.feriados) if (!/^\d{2}\/\d{2}$/.test(f)) morrer(`--feriado precisa ser DD/MM, veio "${f}"`, 'dois dígitos em cada parte e sem o ano: --feriado 07/09 --feriado 20/01');
  if (a.dias !== undefined && (!Number.isInteger(a.dias) || a.dias < 0)) morrer("--dias precisa ser inteiro ≥ 0");
  if (a.tolerancia !== undefined && (isNaN(a.tolerancia) || a.tolerancia < 0 || a.tolerancia > 20)) morrer("--tolerancia é uma porcentagem entre 0 e 20");
  if (a.janela !== undefined && (!Number.isInteger(a.janela) || a.janela < 0 || a.janela > 60)) morrer("--janela precisa ser um inteiro de 0 a 60 (dias úteis)");

  let extrato;
  try { extrato = lerExtrato(extratoArq); } catch (e) { morrer(`não consegui ler o extrato: ${e.message}`, "aceito OFX (SGML ou XML), CSV com cabeçalho Data/Valor ou Crédito/Débito, CSV do Itaú sem cabeçalho e .xlsx"); }
  if (!extrato.lancamentos.length) morrer("o extrato não tem nenhum lançamento legível", "abrir o arquivo e conferir se tem linhas com data e valor; OFX precisa de blocos <STMTTRN>");

  if (a.ler) {
    console.log(`\nEXTRATO: ${extratoArq} (${extrato.formato}, ${extrato.codificacao}${extrato.banco ? ", " + extrato.banco : ""})\n`);
    console.log("| Data | Descrição | Valor |\n|---|---|---|");
    for (const l of extrato.lancamentos.sort((p, q) => p.data - q.data)) console.log(`| ${dt(l.data)} | ${esc(l.descricao)} | ${br.reais(l.valor)} |`);
    const tot = br.centavos(extrato.lancamentos.reduce((s, x) => s + x.valor, 0));
    const ent = br.centavos(extrato.lancamentos.filter((x) => x.valor > 0).reduce((s, x) => s + x.valor, 0));
    console.log(`\n${extrato.lancamentos.length} lançamentos. Entradas ${br.reais(ent)}, saídas ${br.reais(br.centavos(tot - ent))}, líquido ${br.reais(tot)}.${extrato.saldoFinal !== null && extrato.saldoFinal !== undefined ? " Saldo final " + br.reais(extrato.saldoFinal) + "." : ""}`);
    for (const av of extrato.avisos) console.log(`  aviso: ${av}`);
    return;
  }

  if (!a.registros.length) morrer("falta o que deveria ter entrado e saído", "passe --registros <arquivo> (CSV, .xlsx ou JSON com data, descrição e valor); pra só ler o extrato use --ler");
  const registros = [];
  const avisos = [...extrato.avisos];
  for (const arq of a.registros) {
    if (!fs.existsSync(arq)) morrer(`não achei ${arq}`);
    try { const r = lerRegistros(arq); registros.push(...r.lista); avisos.push(...r.avisos); }
    catch (e) { morrer(`não consegui ler ${arq}: ${e.message}`); }
  }
  if (!registros.length) morrer("os registros não têm nenhuma linha com data e valor");

  const escolha = mesDe(extrato.lancamentos);
  const mes = a.mes || escolha.mes;
  if (!a.mes && escolha.outros.length) {
    const resto = escolha.outros.map(([k, n]) => `${k} com ${plural(n, "linha", "linhas")}`).join(", ");
    avisos.push(`o extrato tem lançamento em mais de um mês: escolhi ${mes} (${plural(escolha.contagem[mes], "linha", "linhas")}) e deixei ${resto} em "fora do mês"; pra conciliar outro, rode com --mes AAAA-MM`);
  }
  const limites = limitesDoMes(mes);
  const janela = a.janela ?? PADRAO.janela;
  // o registro previsto no fim do mês passado pode ter caído neste, e o deste pode cair no que vem:
  // a janela abre dos dois lados. Mais longe que isso é registro de outro mês, e some daqui com nome e valor.
  const fimJanela = br.maisUteis(limites.fim, janela, a.feriados);
  const inicioJanela = br.maisUteis(limites.inicio, -janela, a.feriados);
  const noMes = (x) => x.data >= limites.inicio && x.data <= limites.fim;
  const naJanela = (x) => x.data >= inicioJanela && x.data <= fimJanela;
  const bancoMes = extrato.lancamentos.filter(noMes);
  const bancoFora = extrato.lancamentos.filter((x) => !noMes(x));
  const regMes = registros.filter(naJanela);
  const regFora = registros.filter((x) => !naJanela(x));
  if (!bancoMes.length) morrer(`o extrato não tem lançamento em ${mes}`, "confira --mes; o padrão é o mês com mais linhas no extrato");

  const repetidos = (lista, nome) => {
    const cont = new Map();
    for (const x of lista) { const k = `${br.iso(x.data)}|${x.valor}|${limpo(x.descricao)}`; cont.set(k, (cont.get(k) || 0) + 1); }
    const dup = [...cont.entries()].filter(([, n]) => n > 1);
    if (dup.length) avisos.push(`${nome}: ${dup.length === 1 ? "1 lançamento aparece" : dup.length + " lançamentos aparecem"} mais de uma vez com a mesma data, valor e descrição (${dup.map(([k, n]) => `${n}× ${k.split("|")[2] || "(sem descrição)"} ${br.reais(+k.split("|")[1])}`).slice(0, 3).join("; ")}); confira se não é linha duplicada`);
  };
  repetidos(bancoMes, "extrato");
  repetidos(regMes, "registros");
  const hoje = a.hoje || new Date();
  const res = conciliar(bancoMes, regMes, { dias: a.dias, tolerancia: a.tolerancia, janela: a.janela, feriados: a.feriados });
  if (!iguais(res.quadro.diferenca, 0)) morrer(`o quadro não fechou a zero (diferença ${br.reais(res.quadro.diferenca)}); isso é erro do script, não do usuário`, "mande o arquivo pra conferência em vez de entregar");

  cruzarComForaDoMes(res, { banco: bancoFora, registros: regFora }, res.opcoes);

  let cobrancaArq;
  if (a.cobranca) {
    fs.mkdirSync(path.dirname(a.cobranca), { recursive: true });
    fs.writeFileSync(a.cobranca, csvCobranca(res.soRegistros));
    cobrancaArq = a.cobranca;
  }
  const ctx = {
    extrato, extratoNome: path.basename(extratoArq), registrosNomes: a.registros.map((x) => path.basename(x)),
    limites, hoje, janela, foraDoMes: { banco: bancoFora.sort((p, q) => p.data - q.data), registros: regFora.sort((p, q) => p.data - q.data) },
    avisos, saldoInicial: a.saldoInicial, cobrancaArq,
  };
  if (a.json) {
    const s = (l) => l.map((x) => ({ data: br.iso(x.data), descricao: x.descricao, valor: x.valor, origem: x.origem, classe: x.classe, id: x.id }));
    console.log(JSON.stringify({
      mes, quadro: res.quadro, contagem: res.contagem, tolerancias: { dias: res.opcoes.dias, tolerancia: res.opcoes.tolerancia, janela: res.opcoes.janela },
      conciliados: res.pares.map((p) => ({ camada: p.camada, regra: p.regra, diferenca: p.diferenca, banco: s(p.banco), registros: s(p.registros) })),
      soBanco: s(res.soBanco), soRegistros: s(res.soRegistros), foraDoMes: { banco: s(bancoFora), registros: s(regFora) }, avisos,
    }, null, 2));
    return;
  }
  const md = markdown(res, ctx);
  if (a.saida) {
    fs.mkdirSync(path.dirname(a.saida), { recursive: true });
    fs.writeFileSync(a.saida, md);
    console.log(`✔ ${a.saida}: ${res.pares.length} pares conciliados, ${res.soBanco.length} só no banco, ${res.soRegistros.length} só nos registros, diferença ${br.reais(res.quadro.diferenca)}.${cobrancaArq ? ` Recebíveis em ${cobrancaArq}.` : ""}`);
    for (const av of avisos) console.log(`  aviso: ${av}`);
  } else console.log(md);
}

module.exports = { decodificar, valorBR, dataBR, lerOfx, lerTabela, lerExtrato, lerRegistros, conciliar, cruzarComForaDoMes, classificarBanco, parecidos, tokens, markdown, csvCobranca, mesDe };

if (require.main === module) main();
