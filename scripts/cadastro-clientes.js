#!/usr/bin/env node
/**
 * Contex OS — cadastro-clientes.js
 * Pega a base de clientes do jeito que ela está (CSV, planilha .xlsx, agenda
 * .vcf, contatos do Google, conversa exportada do WhatsApp) e devolve um
 * `clientes.csv` canônico mais um relatório do que foi corrigido e do que
 * ficou em dúvida.
 *
 * Existe porque chat não valida dígito verificador nem deduplica 800 linhas
 * sem errar. Aqui cada telefone vira E.164, cada CPF e CNPJ (inclusive o
 * alfanumérico de julho/2026) passa pelo módulo 11, e-mail e CEP passam por
 * formato, a mesma pessoa que apareceu três vezes vira uma linha, quem é
 * empresa fica separado de quem é pessoa, e quem não compra há X meses sai
 * marcado. Rodar duas vezes com a mesma entrada dá o mesmo arquivo, valor
 * incluído: é o que permite reimportar a exportação do mês sem inflar a base. O que o script NÃO adivinha: origem e base legal (LGPD). Isso vem
 * da entrevista da skill, por opção de linha de comando, nunca inferido.
 *
 * Uso:
 *   node scripts/cadastro-clientes.js <entrada> [entrada2 ...] [opções]
 *   node scripts/cadastro-clientes.js <entrada> --colunas          só mostra o mapeamento
 *
 * Entradas aceitas: .csv .txt .tsv (qualquer separador), .xlsx (primeira aba ou
 * --aba), .vcf (agenda do celular, iCloud, Google Contatos), .txt de conversa
 * exportada do WhatsApp (pega nome e número de quem falou no grupo).
 *
 * Opções:
 *   --saida <pasta>          onde gravar (padrão: dados/)
 *   --meses <N>              marca "parado" quem não compra há N meses ou mais (padrão: 6)
 *   --hoje AAAA-MM-DD        data de referência do cálculo (padrão: hoje)
 *   --origem <valor>         origem pra quem não tem (vem da entrevista: instagram, indicacao...)
 *   --base-legal <valor>     contrato | consentimento | legitimo-interesse | obrigacao-legal
 *   --mapa <mapa.json>       mapeamento de colunas quando o script não acerta: {"nome":"Cliente","telefone":"Cel"}
 *   --aba <N|nome>           qual aba do .xlsx (padrão: a primeira)
 *   --nao-contatar <arquivo> lista de quem pediu pra não receber mensagem (telefone ou e-mail, um por linha ou solto no texto)
 *   --mesclar                junta com o dados/clientes.csv que já existe em vez de recusar.
 *                            Sem arquivo de entrada nenhum, só recalcula meses_sem_comprar
 *                            e situacao com a data de hoje.
 *   --sobrescrever           substitui o dados/clientes.csv sem mesclar, guardando a versão
 *                            anterior em clientes-anterior.csv
 *   --json                   imprime o resumo em JSON (pra outra skill ler)
 *   --silencioso             só imprime erro
 *
 * Saída: <pasta>/clientes.csv (separador ";", UTF-8 com BOM, abre certo no
 * Excel em português) e <pasta>/relatorio-limpeza-<AAAA-MM-DD>.md. As colunas
 * do canônico estão em COLUNAS abaixo e documentadas em
 * templates/operacao/cadastro-clientes.md.
 *
 * Node 18+, sem dependência de npm. Validação de documento, telefone, e-mail
 * e CEP vem de scripts/br.js; leitura de .xlsx e CSV vem de scripts/gerar-planilha.js.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const br = require("./br.js");
const { lerXlsx, parseCsv } = require("./gerar-planilha.js");

// ─────────────────────────── canônico ───────────────────────────

const COLUNAS = [
  "id", "nome", "tipo", "documento", "telefone", "telefone2", "email", "cep", "cidade", "uf",
  "origem", "indicado_por", "primeira_compra", "ultima_compra", "valor_total",
  "meses_sem_comprar", "situacao", "base_legal", "consentimento_em", "nao_contatar",
  "tags", "obs", "atualizado_em",
];

const BASES_LEGAIS = ["contrato", "consentimento", "legitimo-interesse", "obrigacao-legal"];

/** Sinônimos de cabeçalho, já sem acento e em minúsculas. A ordem importa: o primeiro que casar ganha. */
const SINONIMOS = {
  nome: ["nome", "nome completo", "cliente", "razao social", "razao_social", "nome fantasia", "fantasia", "name", "full name", "contato", "titular", "comprador", "destinatario"],
  sobrenome: ["sobrenome", "last name", "family name"],
  empresa: ["empresa", "organizacao", "org", "organization", "company", "razao social"],
  documento: ["cpf/cnpj", "cpf_cnpj", "cpf cnpj", "cpf ou cnpj", "documento", "doc", "cpf", "cnpj", "cnpj/cpf", "tax id", "document"],
  telefone: ["telefone", "celular", "whatsapp", "fone", "tel", "phone", "phone 1 - value", "mobile", "cel", "telefone 1", "telefone principal", "numero", "contato telefone", "phone number"],
  telefone2: ["telefone2", "telefone 2", "phone 2 - value", "telefone secundario", "outro telefone", "fixo", "recado"],
  email: ["email", "e-mail", "e-mail 1 - value", "mail", "correio", "e mail"],
  cep: ["cep", "zip", "postal code", "codigo postal"],
  cidade: ["cidade", "city", "municipio", "localidade"],
  uf: ["uf", "estado", "state"],
  origem: ["origem", "source", "canal", "como conheceu", "como chegou", "de onde veio", "fonte", "utm_source"],
  indicado_por: ["indicado_por", "indicado-por", "indicado por", "indicacao", "quem indicou", "referral"],
  primeira_compra: ["primeira_compra", "primeira compra", "data cadastro", "data de cadastro", "cadastro", "cadastrado em", "criado em", "created", "created at", "data", "desde", "cliente desde", "inicio"],
  ultima_compra: ["ultima_compra", "ultima compra", "ultimo pedido", "ultima venda", "last purchase", "last order", "data ultima compra", "data da ultima compra", "ultima visita", "ultimo atendimento", "data do pedido", "data de pedido", "data da compra", "data de compra", "data da venda", "data de venda", "data do atendimento", "data do servico", "pedido em", "comprou em"],
  ultimo_contato: ["ultimo_contato", "ultimo contato", "ultima mensagem", "last contact"],
  valor_total: ["valor_total", "valor total", "total gasto", "valor gasto", "total pago", "total", "ltv", "faturamento", "valor", "receita", "gasto"],
  meses_sem_comprar: ["meses_sem_comprar"],
  situacao: ["situacao", "status", "situação"],
  base_legal: ["base_legal", "base legal"],
  consentimento_em: ["consentimento_em", "consentimento", "aceite", "opt-in", "optin"],
  nao_contatar: ["nao_contatar", "nao contatar", "não contatar", "opt-out", "optout", "descadastrado", "bloqueado", "nao_receber"],
  tags: ["tags", "tag", "categoria", "grupo", "segmento", "etiqueta", "labels", "group membership"],
  obs: ["obs", "observacao", "observacoes", "notas", "notes", "comentario", "anotacoes"],
  tipo: ["tipo", "pf/pj", "pessoa", "tipo de pessoa", "natureza"],
  nascimento: ["nascimento", "data de nascimento", "aniversario", "birthday", "bday", "dt nascimento"],
  endereco: ["endereco", "endereço", "logradouro", "rua", "address", "address 1 - formatted", "endereco completo"],
  id: ["id", "codigo", "código", "cod", "identificador"],
};

/**
 * Cabeçalho de dado sensível (LGPD, art. 5º, II): nunca entra no canônico, e o
 * relatório avisa que a coluna não foi lida. "digital" sozinho não entra na
 * lista de propósito: "marketing digital" e "canal digital" são cabeçalho comum
 * e não são biometria.
 */
const SENSIVEIS = /\b(saude|doenca|doencas|alergia|alergias|medicamento|remedio|diagnostico|cid|prontuario|religiao|igreja|orientacao sexual|sexualidade|raca|etnia|cor da pele|biometria|impressao digital|digital biometrica|sindicato|filiacao sindical|partido|opiniao politica|deficiencia|gestante|gravida|hiv)\b/;

/** Lista fechada de origem que o `/medir` usa. Valor fora dela não é recusado: entra e o relatório aponta. */
const ORIGENS = ["instagram", "google", "indicacao", "passou-na-frente", "placa", "whatsapp", "evento", "outro", "nao-sei", "site", "facebook", "tiktok", "linkedin", "ifood", "marketplace", "anuncio", "email"];

// ─────────────────────────── utilidades ───────────────────────────

let SILENCIOSO = false;
function dizer(m) { if (!SILENCIOSO) console.log(m); }
function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function limparCab(s) { return br.semAcento(String(s || "")).replace(/[\s_\-]+/g, " ").trim(); }
function vazio(v) { return v === null || v === undefined || String(v).trim() === ""; }

/** "MARIA DA SILVA" → "Maria da Silva". Só mexe em nome todo em caixa alta ou todo em minúscula. */
function capitalizarNome(s) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return t;
  const soLetras = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const todoAlto = soLetras && soLetras === soLetras.toUpperCase();
  const todoBaixo = soLetras && soLetras === soLetras.toLowerCase();
  if (!todoAlto && !todoBaixo) return t;
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e", "di", "del", "della", "von", "van"]);
  // "sa" e "ss" ficaram fora: "Ana Sa" (Sá sem acento) não vira "Ana SA"
  const siglas = /^(ltda|me|epp|eireli|mei|s\/a|s\.a\.|cia)\.?$/i;
  return t.split(" ").map((p, i) => {
    const b = p.toLowerCase();
    if (siglas.test(b)) return p.toUpperCase().replace(/^LTDA\.?$/, "Ltda");
    if (i > 0 && minusculas.has(b)) return b;
    return b.split("-").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join("-");
  }).join(" ");
}

function pareceEmpresa(nome) {
  return /\b(ltda|me|epp|eireli|mei|s\/a|s\.a\.|cia|comercio|comércio|industria|indústria|servicos|serviços|distribuidora|restaurante|padaria|clinica|clínica|escritorio|escritório|associacao|associação|construtora|farmacia|farmácia|mercado|loja|studio|estudio|estúdio|consultoria|agencia|agência)\b/i.test(nome);
}

/** Excel serial (número) ou texto → "AAAA-MM-DD" ou null. Aceita DD/MM/AA. */
function lerDataQualquer(v) {
  if (v instanceof Date) return isNaN(v) ? null : br.iso(v);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  let t = String(v || "").trim();
  if (!t) return null;
  t = t.replace(/[T ]\d{1,2}:\d{2}(:\d{2})?.*$/, ""); // tira hora
  let m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2})$/);
  if (m) t = `${m[1]}/${m[2]}/20${m[3]}`;
  m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) t = `${m[1]}/${m[2]}/${m[3]}`;
  const d = br.lerData(t);
  return d ? br.iso(d) : null;
}

/** Meses completos entre duas datas ISO (b − a). */
function mesesEntre(aIso, bIso) {
  const a = br.lerData(aIso), b = br.lerData(bIso);
  if (!a || !b) return null;
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m--;
  return m;
}

/** 2100.5 → "2100,50" (vírgula decimal, sem milhar: é pra planilha ler, não pra gente). */
function valorCsv(n) { return br.centavos(n).toFixed(2).replace(".", ","); }

function idDe(chave) { return "c-" + crypto.createHash("sha1").update(chave).digest("hex").slice(0, 8); }

function normalizarOrigem(s) {
  const t = br.slug(String(s || ""));
  if (!t) return "";
  const mapa = { insta: "instagram", ig: "instagram", "google-maps": "google", maps: "google", "busca": "google", face: "facebook", fb: "facebook", "indicacao-de-cliente": "indicacao", indicado: "indicacao", "boca-a-boca": "indicacao", zap: "whatsapp", wpp: "whatsapp", "nao-sei": "nao-sei", "nao-informado": "nao-sei", "": "" };
  return mapa[t] || t;
}

function simNao(v) {
  const t = br.semAcento(String(v ?? "")).trim();
  return /^(sim|s|x|1|true|yes|y|verdadeiro|ok)$/.test(t) ? "sim" : "";
}

// ─────────────────────────── leitura das entradas ───────────────────────────

function lerTexto(arquivo) {
  const buf = fs.readFileSync(arquivo);
  let txt = buf.toString("utf8");
  // arquivo que veio do Windows em latin1: o utf8 devolve U+FFFD onde tinha acento
  if ((txt.match(/�/g) || []).length > 0) txt = buf.toString("latin1");
  return txt.replace(/^﻿/, "");
}

/** Matriz (linhas × colunas) a partir do .xlsx lido pelo gerar-planilha. */
function matrizXlsx(aba) {
  const refCol = (n) => { let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const linhas = [];
  for (let l = 1; l <= aba.maxLinha; l++) {
    const linha = [];
    for (let c = 1; c <= aba.maxCol; c++) {
      const cel = aba.celulas.get(`${refCol(c)}${l}`);
      if (!cel) { linha.push(""); continue; }
      if (cel.tipo === "data" && typeof cel.v === "number") linha.push(lerDataQualquer(cel.v) || "");
      else linha.push(cel.v === null || cel.v === undefined ? "" : cel.v);
    }
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => !vazio(c)));
}

function lerPlanilha(arquivo, abaPedida) {
  const { abas } = lerXlsx(arquivo);
  if (!abas.length) morrer(`${arquivo} não tem nenhuma aba`);
  let aba = abas[0];
  if (abaPedida !== undefined && abaPedida !== true) {
    aba = /^\d+$/.test(String(abaPedida)) ? abas[Number(abaPedida) - 1] : abas.find((a) => a.nome.toLowerCase() === String(abaPedida).toLowerCase());
    if (!aba) morrer(`aba "${abaPedida}" não existe em ${arquivo}`, `Abas: ${abas.map((a, i) => `${i + 1}=${a.nome}`).join(" | ")}`);
  }
  return { tipo: "xlsx", nome: `${path.basename(arquivo)} (aba ${aba.nome})`, matriz: matrizXlsx(aba) };
}

/** Decodifica quoted-printable (vCard antigo do Android exporta acento assim). */
function decodificarQP(s) {
  const bytes = [];
  const t = s.replace(/=\r?\n/g, "");
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(t.slice(i + 1, i + 3))) { bytes.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(t.charCodeAt(i));
  }
  return Buffer.from(bytes).toString("utf8");
}

function lerVcf(arquivo) {
  const txt = lerTexto(arquivo).replace(/\r?\n[ \t]/g, ""); // desdobra linha continuada
  const cartoes = txt.split(/BEGIN:VCARD/i).slice(1);
  const linhas = [["nome", "telefone", "telefone2", "email", "empresa", "endereco", "nascimento", "obs"]];
  for (const c of cartoes) {
    const campos = {};
    const tels = [], emails = [];
    for (const l of c.split(/\r?\n/)) {
      const m = l.match(/^([A-Za-z\-]+)((?:;[^:]*)*):(.*)$/);
      if (!m) continue;
      const chave = m[1].toUpperCase(), params = m[2].toUpperCase();
      let valor = m[3];
      if (/ENCODING=QUOTED-PRINTABLE/.test(params)) valor = decodificarQP(valor);
      valor = valor.replace(/\\,/g, ",").replace(/\\n/g, " ").replace(/\\;/g, ";");
      if (chave === "FN") campos.nome = valor;
      else if (chave === "N" && !campos.nome) campos.n = valor.split(";").filter(Boolean).reverse().join(" ").trim();
      else if (chave === "TEL") tels.push({ v: valor, cel: /CELL|MOBILE|IPHONE/.test(params) });
      else if (chave === "EMAIL") emails.push(valor);
      else if (chave === "ORG") campos.empresa = valor.replace(/;+$/, "");
      else if (chave === "ADR") campos.endereco = valor.split(";").filter(Boolean).join(", ");
      else if (chave === "BDAY") campos.nascimento = valor;
      else if (chave === "NOTE") campos.obs = valor;
    }
    tels.sort((a, b) => (b.cel ? 1 : 0) - (a.cel ? 1 : 0));
    const nome = campos.nome || campos.n || campos.empresa || "";
    if (!nome && !tels.length && !emails.length) continue;
    linhas.push([nome, tels[0]?.v || "", tels[1]?.v || "", emails[0] || "", campos.empresa || "", campos.endereco || "", campos.nascimento || "", campos.obs || ""]);
  }
  return { tipo: "vcf", nome: path.basename(arquivo), matriz: linhas };
}

const RE_WHATSAPP = /^‎?\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),? (\d{1,2}:\d{2})(?::\d{2})?\]?\s*[-–]?\s*([^:]{1,80}?):\s/;

function ehConversaWhatsapp(txt) {
  const primeiras = txt.split(/\r?\n/).slice(0, 40);
  return primeiras.filter((l) => RE_WHATSAPP.test(l)).length >= 3;
}

/** Conversa exportada do WhatsApp: cada remetente vira um contato, com a última data em que falou. */
function lerConversaWhatsapp(arquivo, txt) {
  const pessoas = new Map();
  for (const l of txt.split(/\r?\n/)) {
    const m = l.match(RE_WHATSAPP);
    if (!m) continue;
    const remetente = m[5].replace(/‎/g, "").trim();
    const data = lerDataQualquer(`${m[1]}/${m[2]}/${m[3]}`);
    const ehNumero = /^\+?[\d\s\-()]{8,}$/.test(remetente);
    const chave = ehNumero ? remetente.replace(/\D/g, "") : remetente.toLowerCase();
    const p = pessoas.get(chave) || { nome: ehNumero ? "" : remetente, telefone: ehNumero ? remetente : "", mensagens: 0, ultima: null };
    p.mensagens++;
    if (data && (!p.ultima || data > p.ultima)) p.ultima = data;
    pessoas.set(chave, p);
  }
  const linhas = [["nome", "telefone", "ultimo_contato", "obs"]];
  for (const p of pessoas.values()) linhas.push([p.nome, p.telefone, p.ultima || "", `${p.mensagens} mensagem(ns) na conversa exportada`]);
  return { tipo: "whatsapp", nome: path.basename(arquivo), matriz: linhas };
}

function lerEntrada(arquivo, opts) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);
  const ext = path.extname(arquivo).toLowerCase();
  if (ext === ".xlsx" || ext === ".xlsm") return lerPlanilha(arquivo, opts.aba);
  if (ext === ".xls") morrer(`${arquivo} é .xls (formato antigo)`, "Abra no Excel e salve como .xlsx ou .csv, e rode de novo.");
  if (ext === ".vcf" || ext === ".vcard") return lerVcf(arquivo);
  const txt = lerTexto(arquivo);
  if (!txt.trim()) morrer(`${arquivo} está vazio`);
  if (/^BEGIN:VCARD/im.test(txt)) return lerVcf(arquivo);
  if (ehConversaWhatsapp(txt)) return lerConversaWhatsapp(arquivo, txt);
  const { linhas } = parseCsv(txt);
  if (!linhas.length) morrer(`${arquivo} não tem linha nenhuma depois do cabeçalho`);
  return { tipo: "csv", nome: path.basename(arquivo), matriz: linhas };
}

// ─────────────────────────── mapeamento de colunas ───────────────────────────

/** Uma linha é cabeçalho se nenhuma célula parece dado (telefone, e-mail, documento, data). */
function pareceCabecalho(linha) {
  const cels = linha.map((c) => String(c ?? "").trim()).filter(Boolean);
  if (!cels.length) return false;
  const dado = cels.filter((c) => br.emailValido(c) || br.telefoneE164(c) || br.cpfValido(c) || br.cnpjValido(c) || lerDataQualquer(c) || /^\d+([.,]\d+)?$/.test(c));
  return dado.length === 0;
}

function proporcao(valores, teste) {
  const v = valores.filter((x) => !vazio(x));
  if (!v.length) return 0;
  return v.filter(teste).length / v.length;
}

/**
 * Descobre qual coluna da entrada é qual campo canônico. Primeiro pelo cabeçalho
 * (sinônimos), depois pelo conteúdo do que sobrou: e-mail, telefone, documento,
 * data, e o primeiro texto "com cara de nome".
 *
 * O `--mapa` vale pra todos os arquivos da rodada, e cada arquivo tem o cabeçalho
 * dele: entrada do mapa que não existe NESTE arquivo é ignorada aqui e devolvida
 * em `foraDoArquivo`. Quem reclama é o `processar`, e só quando a coluna não
 * apareceu em arquivo nenhum. Sem isso, um mapa escrito pra planilha do sistema
 * derrubava a rodada que também levava o .vcf da agenda.
 *
 * Devolve { mapa: {canonico: índice}, semCabecalho, cab, foraDoArquivo }.
 */
function mapearColunas(matriz, mapaForcado = {}) {
  const semCabecalho = !pareceCabecalho(matriz[0]);
  const cab = semCabecalho ? matriz[0].map((_, i) => `coluna ${i + 1}`) : matriz[0].map((c) => String(c ?? ""));
  const dados = semCabecalho ? matriz : matriz.slice(1);
  const mapa = {};
  const usados = new Set();

  // 1) o que o usuário mandou no --mapa vence
  const foraDoArquivo = [];
  for (const [canon, nomeCol] of Object.entries(mapaForcado)) {
    const i = /^\d+$/.test(String(nomeCol)) ? Number(nomeCol) - 1 : cab.findIndex((c) => limparCab(c) === limparCab(nomeCol));
    if (i < 0 || i >= cab.length) { foraDoArquivo.push({ canon, nomeCol }); continue; }
    mapa[canon] = i; usados.add(i);
  }

  // 2) cabeçalho por sinônimo
  if (!semCabecalho) {
    const limpos = cab.map(limparCab);
    for (const [canon, lista] of Object.entries(SINONIMOS)) {
      if (mapa[canon] !== undefined) continue;
      for (const s of lista) {
        const i = limpos.findIndex((c, j) => !usados.has(j) && c === limparCab(s));
        if (i >= 0) { mapa[canon] = i; usados.add(i); break; }
      }
    }
    // Google Contatos: "First Name" + "Last Name" (ou "Given Name" + "Family Name")
    if (mapa.nome === undefined) {
      const fi = limpos.findIndex((c) => c === "first name" || c === "given name");
      const li = limpos.findIndex((c) => c === "last name" || c === "family name");
      if (fi >= 0) { mapa.nome = fi; usados.add(fi); if (li >= 0) { mapa.sobrenome = li; usados.add(li); } }
    }
  }

  // 3) conteúdo, pra colunas que sobraram
  const coluna = (i) => dados.map((l) => l[i]);
  const testes = [
    ["email", (v) => br.emailValido(v)],
    ["documento", (v) => br.cpfValido(v) || br.cnpjValido(v)],
    ["telefone", (v) => !!br.telefoneE164(v)],
    ["cep", (v) => /^\d{5}-?\d{3}$/.test(String(v).trim())],
  ];
  for (const [canon, teste] of testes) {
    if (mapa[canon] !== undefined) continue;
    for (let i = 0; i < cab.length; i++) {
      if (usados.has(i)) continue;
      if (proporcao(coluna(i), teste) >= 0.6) { mapa[canon] = i; usados.add(i); break; }
    }
  }
  if (mapa.telefone2 === undefined) {
    for (let i = 0; i < cab.length; i++) {
      if (usados.has(i)) continue;
      if (proporcao(coluna(i), (v) => !!br.telefoneE164(v)) >= 0.6) { mapa.telefone2 = i; usados.add(i); break; }
    }
  }
  if (mapa.nome === undefined) {
    for (let i = 0; i < cab.length; i++) {
      if (usados.has(i)) continue;
      const ehNome = (v) => /^[A-Za-zÀ-ÿ'.\- ]{3,}$/.test(String(v).trim()) && /[A-Za-zÀ-ÿ]{2,} [A-Za-zÀ-ÿ]{2,}/.test(String(v).trim());
      if (proporcao(coluna(i), ehNome) >= 0.5) { mapa.nome = i; usados.add(i); break; }
    }
  }
  return { mapa, semCabecalho, cab, foraDoArquivo };
}

// ─────────────────────────── normalização ───────────────────────────

/**
 * Uma linha crua → registro canônico + lista de correções e dúvidas.
 * Correção = o script tinha certeza e mudou. Dúvida = precisa de gente.
 */
function normalizarLinha(linha, mapa, ctx) {
  const pega = (canon) => (mapa[canon] === undefined ? "" : String(linha[mapa[canon]] ?? "").trim());
  const r = Object.fromEntries(COLUNAS.map((c) => [c, ""]));
  const correcoes = [], duvidas = [];
  const obs = [];
  const corrigir = (campo, antes, depois, motivo) => { correcoes.push({ campo, antes, depois, motivo }); return depois; };
  /**
   * `cai` é o nome da condição que apaga a dúvida depois da mesclagem: a linha
   * sem documento que se juntou com a linha que tinha o CPF não é mais dúvida.
   * Sem isso o relatório manda o usuário procurar o que o próprio script já resolveu.
   */
  const duvidar = (campo, valor, problema, acao, cai) => duvidas.push({ campo, valor, problema, acao, cai });

  // nome
  let nome = pega("nome");
  if (mapa.sobrenome !== undefined) nome = `${nome} ${String(linha[mapa.sobrenome] ?? "").trim()}`.trim();
  const nomeLimpo = capitalizarNome(nome);
  if (nomeLimpo !== nome && nome) nome = corrigir("nome", nome, nomeLimpo, "caixa alta ou baixa virou nome próprio");
  if (!nome && pega("empresa")) nome = pega("empresa");
  r.nome = nome;

  // documento → tipo
  const docBruto = pega("documento");
  if (docBruto) {
    let d = docBruto.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const soDigitos = /^\d+$/.test(d);
    if (soDigitos && d.length === 10 && br.cpfValido("0" + d)) d = corrigir("documento", docBruto, "0" + d, "zero à esquerda que a planilha comeu (CPF)");
    else if (soDigitos && d.length === 13 && br.cnpjValido("0" + d)) d = corrigir("documento", docBruto, "0" + d, "zero à esquerda que a planilha comeu (CNPJ)");
    if (d.length === 11 && soDigitos) {
      if (br.cpfValido(d)) { r.documento = br.formatarCpf(d); r.tipo = "PF"; }
      else duvidar("documento", docBruto, "CPF com dígito verificador errado", "conferir com o cliente; pode ser dígito trocado na digitação", "documento");
    } else if (d.length === 14) {
      if (br.cnpjValido(d)) { r.documento = br.formatarCnpj(d); r.tipo = "PJ"; if (!/^\d+$/.test(d)) obs.push("CNPJ alfanumérico (formato de julho/2026)"); }
      else duvidar("documento", docBruto, "CNPJ com dígito verificador errado", "conferir na Receita (consulta pública de CNPJ) ou com o cliente", "documento");
    } else {
      duvidar("documento", docBruto, `documento com ${d.length} caracteres: não é CPF (11) nem CNPJ (14)`, "conferir se faltou ou sobrou dígito", "documento");
    }
    if (r.documento && r.documento !== docBruto && !correcoes.some((c) => c.campo === "documento")) correcoes.push({ campo: "documento", antes: docBruto, depois: r.documento, motivo: "pontuação padronizada" });
  }
  const tipoInformado = pega("tipo").toUpperCase();
  if (!r.tipo && /^(PJ|JURIDICA|JURÍDICA|EMPRESA|CNPJ)$/.test(tipoInformado)) r.tipo = "PJ";
  else if (!r.tipo && /^(PF|FISICA|FÍSICA|PESSOA|CPF)$/.test(tipoInformado)) r.tipo = "PF";
  if (!r.tipo) {
    r.tipo = "?";
    if (pareceEmpresa(r.nome)) duvidar("tipo", r.nome, "sem documento, e o nome tem cara de empresa", "confirmar se é PJ e pegar o CNPJ", "tipo");
    else if (pega("empresa")) duvidar("tipo", r.nome, `sem documento, e o contato traz a empresa "${pega("empresa")}"`, "confirmar se quem compra é a pessoa (CPF) ou a empresa (CNPJ)", "tipo");
  }

  // telefones
  const telDe = (campo, bruto) => {
    if (!bruto) return "";
    let e = br.telefoneE164(bruto);
    if (!e) {
      const d = bruto.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").replace(/^0/, "");
      // celular de 8 dígitos anterior ao nono dígito (2012–2016): 6, 7, 8 ou 9 na frente vira 9 + número
      if (d.length === 10 && /^[6-9]/.test(d.slice(2))) {
        const tent = br.telefoneE164(d.slice(0, 2) + "9" + d.slice(2));
        if (tent) return corrigir(campo, bruto, tent, "nono dígito adicionado (celular anterior a 2016)");
      }
      duvidar(campo, bruto, "telefone que não bate com o padrão brasileiro (DDD + 8 ou 9 dígitos)", "conferir DDD e quantidade de dígitos");
      obs.push(`${campo} original: ${bruto}`);
      return "";
    }
    if (e !== bruto) correcoes.push({ campo, antes: bruto, depois: e, motivo: "formato E.164" });
    return e;
  };
  r.telefone = telDe("telefone", pega("telefone"));
  r.telefone2 = telDe("telefone2", pega("telefone2"));
  if (!r.telefone && r.telefone2) { r.telefone = r.telefone2; r.telefone2 = ""; }
  if (r.telefone && r.telefone === r.telefone2) r.telefone2 = "";

  // e-mail
  const emailBruto = pega("email");
  if (emailBruto) {
    const e = emailBruto.toLowerCase().trim();
    if (/\s/.test(e)) {
      duvidar("email", emailBruto, "e-mail com espaço no meio", "pode ser ponto, hífen ou nada; confirmar com o cliente");
      obs.push(`email original: ${emailBruto}`);
    } else if (br.emailValido(e)) {
      r.email = e;
      if (e !== emailBruto) correcoes.push({ campo: "email", antes: emailBruto, depois: e, motivo: "minúsculas" });
      const dominio = e.split("@")[1];
      const suspeito = { "gmail.con": "gmail.com", "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com", "hotmail.con": "hotmail.com", "hotmal.com": "hotmail.com", "outlook.con": "outlook.com", "yahoo.con": "yahoo.com", "gmail.com.br": "gmail.com", "hotmail.com.br": "hotmail.com" }[dominio];
      if (suspeito) duvidar("email", e, `domínio "${dominio}" parece erro de digitação`, `provável: ${e.split("@")[0]}@${suspeito}; confirmar antes de trocar`);
    } else {
      duvidar("email", emailBruto, "e-mail sem formato válido", "conferir com o cliente");
      obs.push(`email original: ${emailBruto}`);
    }
  }

  // cep, cidade, uf
  const cepBruto = pega("cep");
  if (cepBruto) {
    let d = cepBruto.replace(/\D/g, "");
    if (d.length === 7) { d = "0" + d; correcoes.push({ campo: "cep", antes: cepBruto, depois: br.cep(d), motivo: "zero à esquerda que a planilha comeu" }); }
    const c = br.cep(d);
    if (c) { r.cep = c; if (c !== cepBruto && !correcoes.some((x) => x.campo === "cep")) correcoes.push({ campo: "cep", antes: cepBruto, depois: c, motivo: "formato 00000-000" }); }
    else duvidar("cep", cepBruto, "CEP não tem 8 dígitos", "conferir no site dos Correios");
  }
  r.cidade = capitalizarNome(pega("cidade"));
  const uf = pega("uf").toUpperCase().replace(/[^A-Z]/g, "");
  if (uf) { if (uf.length === 2) r.uf = uf; else duvidar("uf", pega("uf"), "UF precisa ter 2 letras", "usar a sigla (SP, RJ, MG...)"); }

  // origem e indicação
  const origemBruta = pega("origem");
  r.origem = normalizarOrigem(origemBruta) || ctx.origemPadrao || "";
  if (origemBruta && r.origem !== origemBruta) correcoes.push({ campo: "origem", antes: origemBruta, depois: r.origem, motivo: "valor da lista fechada de origem" });
  r.indicado_por = pega("indicado_por");

  // datas e valor
  const dataDe = (campo, bruto) => {
    if (!bruto) return "";
    const d = lerDataQualquer(bruto);
    if (!d) { duvidar(campo, bruto, "data que não existe ou está em formato que não dá pra ler", "usar DD/MM/AAAA"); return ""; }
    if (d > ctx.hoje) { duvidar(campo, bruto, "data no futuro", "conferir ano"); return ""; }
    if (d !== bruto) correcoes.push({ campo, antes: bruto, depois: d, motivo: "data em AAAA-MM-DD" });
    return d;
  };
  r.primeira_compra = dataDe("primeira_compra", pega("primeira_compra"));
  r.ultima_compra = dataDe("ultima_compra", pega("ultima_compra"));
  if (r.primeira_compra && !r.ultima_compra && mapa.ultima_compra === undefined) r.ultima_compra = r.primeira_compra;
  const uc = pega("ultimo_contato"); if (uc) obs.push(`último contato: ${lerDataQualquer(uc) || uc}`);
  if (r.primeira_compra && r.ultima_compra && r.ultima_compra < r.primeira_compra) {
    duvidar("ultima_compra", r.ultima_compra, `última compra antes da primeira (${r.primeira_compra})`, "conferir as duas datas");
  }
  const valorBruto = pega("valor_total");
  if (valorBruto) {
    const n = br.numero(valorBruto);
    if (Number.isFinite(n)) { r.valor_total = valorCsv(n); if (n < 0) duvidar("valor_total", valorBruto, "valor negativo", "conferir se é estorno"); }
    else duvidar("valor_total", valorBruto, "valor que não é número", "usar só o número, com vírgula decimal");
  }

  // LGPD
  const bl = br.slug(pega("base_legal")) || ctx.baseLegalPadrao || "";
  if (bl && !BASES_LEGAIS.includes(bl)) duvidar("base_legal", bl, "base legal fora da lista", `usar uma de: ${BASES_LEGAIS.join(", ")}`);
  else r.base_legal = bl;
  r.consentimento_em = dataDe("consentimento_em", pega("consentimento_em"));
  r.nao_contatar = simNao(pega("nao_contatar"));
  r.tags = pega("tags").split(/[,;|]/).map((t) => br.slug(t)).filter(Boolean).join("|");

  const obsEntrada = pega("obs");
  if (obsEntrada) obs.unshift(obsEntrada);
  const nasc = pega("nascimento"); if (nasc) { const d = lerDataQualquer(nasc); obs.push(`nascimento: ${d || nasc}`); }
  const end = pega("endereco"); if (end) obs.push(`endereço: ${end}`);
  const emp = pega("empresa"); if (emp && emp !== r.nome) obs.push(`empresa: ${emp}`);
  r.obs = [...new Set(obs.flatMap((o) => o.split(" · ")).map((o) => o.trim()).filter(Boolean))].join(" · ");
  r.id = pega("id");

  if (!r.nome && !r.telefone && !r.email && !r.documento) return null; // linha sem nada aproveitável
  if (!r.nome) duvidar("nome", r.telefone || r.email || r.documento, "contato sem nome", "perguntar o nome antes de mandar mensagem", "nome");
  if (!r.telefone && !r.email) duvidar("telefone", "(vazio)", "sem telefone nem e-mail válidos", "sem canal, esse cliente não recebe nada", "canal");

  return { r, correcoes, duvidas };
}

// ─────────────────────────── deduplicação ───────────────────────────

function chavesDe(r) {
  const k = [];
  if (r.telefone) k.push("tel:" + r.telefone);
  if (r.telefone2) k.push("tel:" + r.telefone2);
  if (r.email) k.push("mail:" + r.email);
  if (r.documento) k.push("doc:" + r.documento.replace(/\W/g, ""));
  // sem canal nenhum, o nome é a única chave: senão a linha reaparece a cada --mesclar
  if (!k.length && r.nome) k.push("nome:" + br.slug(r.nome));
  return k;
}

function preenchimento(r) { return COLUNAS.filter((c) => c !== "id" && c !== "atualizado_em" && !vazio(r[c])).length; }

/**
 * Quanto o cliente já gastou, depois de juntar as linhas do grupo.
 *
 * Duas situações diferentes, e é aqui que uma base de cliente costuma mentir:
 *
 * 1. O grupo tem a linha do `clientes.csv` que já existia (`consolidado`). Aquele
 *    total já inclui tudo até a `ultima_compra` dele, então só compra com data
 *    POSTERIOR soma. É o que impede o valor dobrar quando o usuário reimporta a
 *    mesma exportação do mês seguinte, que vem com o histórico inteiro de novo.
 * 2. Primeira rodada, sem linha consolidada: cada data de compra diferente é uma
 *    compra diferente e soma; data repetida é a mesma linha duas vezes e não soma.
 */
function somarValor(grupo, base) {
  const cons = grupo.find((g) => g.consolidado);
  if (cons && cons.r.valor_total) {
    let total = br.numero(cons.r.valor_total);
    const corte = cons.r.ultima_compra;
    let somou = false, naoSomadas = 0;
    for (const g of grupo) {
      if (g === cons || !g.r.valor_total) continue;
      if (!g.r.ultima_compra || (corte && g.r.ultima_compra <= corte)) { naoSomadas++; continue; }
      total += br.numero(g.r.valor_total); somou = true;
    }
    return { valor: valorCsv(total), somou, naoSomadas };
  }
  const vistas = new Set();
  let total = 0, linhas = 0;
  for (const g of grupo) {
    if (!g.r.valor_total) continue;
    const quando = g.r.ultima_compra || "(sem data)";
    if (vistas.has(quando)) continue;
    vistas.add(quando); total += br.numero(g.r.valor_total); linhas++;
  }
  if (!linhas) return { valor: base.r.valor_total, somou: false, naoSomadas: 0 };
  return { valor: valorCsv(total), somou: linhas > 1, naoSomadas: 0 };
}

/** Junta registros que compartilham telefone, e-mail ou documento (união por componente). */
function deduplicar(registros, hoje) {
  const pai = registros.map((_, i) => i);
  const achar = (i) => (pai[i] === i ? i : (pai[i] = achar(pai[i])));
  const unir = (a, b) => { a = achar(a); b = achar(b); if (a !== b) pai[b] = a; };
  const porChave = new Map();
  registros.forEach((reg, i) => {
    for (const k of chavesDe(reg.r)) {
      if (porChave.has(k)) unir(porChave.get(k), i); else porChave.set(k, i);
    }
  });
  const grupos = new Map();
  registros.forEach((reg, i) => { const g = achar(i); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(reg); });

  const finais = [], mesclas = [];
  let naoSomadas = 0;
  for (const grupo of grupos.values()) {
    const duvidasDoGrupo = [];
    if (grupo.length === 1) { finais.push(grupo[0]); continue; }
    grupo.sort((a, b) => preenchimento(b.r) - preenchimento(a.r) || (b.r.ultima_compra || "").localeCompare(a.r.ultima_compra || ""));
    const base = grupo[0];
    const r = { ...base.r };
    const nomes = new Set(grupo.map((g) => g.r.nome).filter(Boolean));
    for (const outro of grupo.slice(1)) {
      for (const c of COLUNAS) if (vazio(r[c]) && !vazio(outro.r[c])) r[c] = outro.r[c];
      if (outro.r.telefone && outro.r.telefone !== r.telefone && !r.telefone2) r.telefone2 = outro.r.telefone;
      if (outro.r.primeira_compra && (!r.primeira_compra || outro.r.primeira_compra < r.primeira_compra)) r.primeira_compra = outro.r.primeira_compra;
      if (outro.r.ultima_compra && (!r.ultima_compra || outro.r.ultima_compra > r.ultima_compra)) r.ultima_compra = outro.r.ultima_compra;
      if (outro.r.nao_contatar === "sim") r.nao_contatar = "sim";
      if (outro.r.tags) r.tags = [...new Set([...(r.tags ? r.tags.split("|") : []), ...outro.r.tags.split("|")])].join("|");
      if (outro.r.obs && outro.r.obs !== r.obs) r.obs = [...new Set([r.obs, outro.r.obs].filter(Boolean).flatMap((o) => o.split(" · ")))].join(" · ");
    }
    const valor = somarValor(grupo, base);
    r.valor_total = valor.valor;
    const somou = valor.somou;
    naoSomadas += valor.naoSomadas;
    // sem primeira compra declarada, a compra mais antiga que apareceu vira a primeira
    if (!r.primeira_compra) { const datas = grupo.map((g) => g.r.ultima_compra).filter(Boolean).sort(); if (datas.length > 1) r.primeira_compra = datas[0]; }
    if (nomes.size > 1) {
      r.nome = [...nomes].sort((a, b) => b.length - a.length)[0];
      duvidasDoGrupo.push({ campo: "nome", valor: [...nomes].join(" / "), problema: "mesmo contato com nomes diferentes", acao: `ficou "${r.nome}"; conferir se é a mesma pessoa` });
    }
    const chave = chavesDe(base.r).find((k) => grupo.slice(1).some((g) => chavesDe(g.r).includes(k))) || chavesDe(base.r)[0];
    mesclas.push({ nome: r.nome, linhas: grupo.length, chave: chave.replace(/^tel:/, "telefone ").replace(/^mail:/, "e-mail ").replace(/^doc:/, "documento ").replace(/^nome:/, "nome (sem outro contato) "), somou });
    finais.push({ r, correcoes: grupo.flatMap((g) => g.correcoes), duvidas: grupo.flatMap((g) => g.duvidas).concat(duvidasDoGrupo) });
  }

  // mesmo nome, contato diferente: não mescla, só avisa
  const porNome = new Map();
  for (const f of finais) { const n = br.slug(f.r.nome); if (!n) continue; if (!porNome.has(n)) porNome.set(n, []); porNome.get(n).push(f.r); }
  const homonimos = [...porNome.values()].filter((l) => l.length > 1).map((l) => ({ nome: l[0].nome, quantos: l.length, contatos: l.map((x) => x.telefone || x.email || x.documento || "(sem contato)").join(" / ") }));

  return { finais, mesclas, homonimos, naoSomadas };
}

// ─────────────────────────── situação e id ───────────────────────────

/**
 * Dúvida que a mesclagem resolveu deixa de ser dúvida: a linha sem documento
 * que se juntou com a que tinha o CPF não precisa mais de ninguém.
 */
const CAI_SE = {
  documento: (r) => !!r.documento,
  tipo: (r) => r.tipo !== "?",
  nome: (r) => !!r.nome,
  canal: (r) => !!(r.telefone || r.email),
};
function duvidasQueSobram(r, duvidas) {
  const vistas = new Set();
  return duvidas.filter((d) => {
    if (d.cai && CAI_SE[d.cai] && CAI_SE[d.cai](r)) return false;
    // a mesma pendência vinda de duas linhas do mesmo cliente é uma pendência, não duas
    const ch = `${d.campo}|${d.valor}|${d.problema}`;
    if (vistas.has(ch)) return false;
    vistas.add(ch);
    return true;
  });
}

/** Correção repetida (o mesmo campo, o mesmo antes e depois) conta uma vez por cliente. */
function correcoesQueSobram(correcoes) {
  const vistas = new Set();
  return correcoes.filter((c) => {
    const ch = `${c.campo}|${c.antes}|${c.depois}`;
    if (vistas.has(ch)) return false;
    vistas.add(ch);
    return true;
  });
}

function fecharRegistro(r, ctx) {
  if (r.ultima_compra) {
    const m = mesesEntre(r.ultima_compra, ctx.hoje);
    r.meses_sem_comprar = String(m);
    r.situacao = m >= ctx.meses ? "parado" : "ativo";
  } else { r.meses_sem_comprar = ""; r.situacao = "sem-data"; }
  if (ctx.naoContatar.size) {
    const bate = [r.telefone, r.telefone2, r.email].filter(Boolean).some((x) => ctx.naoContatar.has(x));
    if (bate) r.nao_contatar = "sim";
  }
  if (!r.id) r.id = idDe(r.telefone || r.email || (r.documento ? r.documento.replace(/\W/g, "") : "") || br.slug(r.nome));
  r.atualizado_em = ctx.hoje;
  return r;
}

function lerNaoContatar(arquivo) {
  const set = new Set();
  if (!arquivo) return set;
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo} (--nao-contatar)`);
  const txt = lerTexto(arquivo);
  for (const m of txt.match(/[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}/gi) || []) set.add(m.toLowerCase());
  for (const m of txt.match(/\+?\d[\d\s().\-]{8,}\d/g) || []) { const e = br.telefoneE164(m); if (e) set.add(e); }
  return set;
}

// ─────────────────────────── saída ───────────────────────────

function csvCanonico(registros) {
  const q = (s) => { const t = String(s ?? ""); return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const linhas = [COLUNAS.join(";")];
  for (const r of registros) linhas.push(COLUNAS.map((c) => q(r[c])).join(";"));
  return "﻿" + linhas.join("\r\n") + "\r\n";
}

function relatorio(res, ctx) {
  const L = [];
  const n = res.finais.length;
  const conta = (f) => res.finais.filter((x) => f(x.r)).length;
  const escapar = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  L.push(`# Relatório de limpeza — ${br.fmt(br.lerData(ctx.hoje))}`, "");
  L.push(`Arquivo gerado: \`${ctx.saidaCsv}\`. Data de referência: ${ctx.hoje}. Quem não compra há ${ctx.meses} meses ou mais está marcado como parado.`, "");
  L.push("## Resumo", "", "| O que | Quantos |", "|---|---|");
  L.push(`| Linhas lidas (${res.entradas.length} arquivo${res.entradas.length > 1 ? "s" : ""}) | ${res.linhasLidas} |`);
  L.push(`| Linhas sem nada aproveitável, ignoradas | ${res.vazias} |`);
  const remesclado = res.entradas.some((e) => e.consolidado);
  L.push(`| ${remesclado ? "Linhas que se juntaram a outra (inclui as do `clientes.csv` anterior)" : "Duplicatas mescladas"} | ${res.mesclas.reduce((s, m) => s + m.linhas - 1, 0)} |`);
  L.push(`| Clientes no arquivo final | ${n} |`);
  L.push(`| Pessoa física (PF) | ${conta((r) => r.tipo === "PF")} |`);
  L.push(`| Empresa (PJ) | ${conta((r) => r.tipo === "PJ")} |`);
  L.push(`| Tipo não determinado (sem documento) | ${conta((r) => r.tipo === "?")} |`);
  L.push(`| Com telefone válido | ${conta((r) => r.telefone)} |`);
  L.push(`| Com e-mail válido | ${conta((r) => r.email)} |`);
  L.push(`| Sem canal nenhum (nem telefone nem e-mail) | ${conta((r) => !r.telefone && !r.email)} |`);
  L.push(`| Parados (${ctx.meses}+ meses sem comprar) | ${conta((r) => r.situacao === "parado")} |`);
  L.push(`| Ativos | ${conta((r) => r.situacao === "ativo")} |`);
  L.push(`| Sem data de compra | ${conta((r) => r.situacao === "sem-data")} |`);
  L.push(`| Pediram pra não receber mensagem | ${conta((r) => r.nao_contatar === "sim")} |`);
  L.push(`| Sem origem | ${conta((r) => !r.origem)} |`);
  L.push(`| Sem base legal | ${conta((r) => !r.base_legal)} |`);
  L.push(`| Correções automáticas | ${res.correcoes.length} |`);
  L.push(`| Dúvidas que precisam de você | ${res.duvidas.length} |`, "");

  L.push("## Como cada arquivo foi lido", "");
  for (const e of res.entradas) {
    L.push(`- **${e.nome}** (${e.tipo}${e.semCabecalho ? ", sem cabeçalho: colunas adivinhadas pelo conteúdo" : ""}): ${e.linhas} linha(s)`);
    const pares = Object.entries(e.mapa).map(([canon, i]) => `${e.cab[i]} → \`${canon}\``);
    L.push(`  - colunas: ${pares.length ? pares.join(", ") : "nenhuma reconhecida"}`);
    const ignoradas = e.cab.filter((c, i) => !Object.values(e.mapa).includes(i) && !e.sensiveis.includes(c));
    if (ignoradas.length) L.push(`  - ignoradas: ${ignoradas.join(", ")}`);
    if (e.sensiveis.length) L.push(`  - **não lidas, por serem dado sensível** (LGPD, art. 5º, II; saúde, religião e afins ficam no prontuário, não na base de contato): ${e.sensiveis.join(", ")}`);
  }
  L.push("");

  L.push("## O que foi corrigido sem precisar de você", "");
  if (!res.correcoes.length) L.push("Nada precisou de correção.", "");
  else {
    const porMotivo = new Map();
    for (const c of res.correcoes) porMotivo.set(c.motivo, (porMotivo.get(c.motivo) || 0) + 1);
    L.push("| Motivo | Quantas |", "|---|---|");
    for (const [m, q] of [...porMotivo.entries()].sort((a, b) => b[1] - a[1])) L.push(`| ${escapar(m)} | ${q} |`);
    L.push("");
    const mostrar = res.correcoes.filter((c) => !/formato E\.164|data em AAAA|pontuação padronizada|formato 00000/.test(c.motivo));
    if (mostrar.length) {
      L.push("As de formato (telefone, data, pontuação) não estão listadas uma a uma. As que mudaram conteúdo:", "");
      L.push("| Cliente | Campo | Antes | Depois | Motivo |", "|---|---|---|---|---|");
      for (const c of mostrar.slice(0, 200)) L.push(`| ${escapar(c.nome)} | ${c.campo} | ${escapar(c.antes)} | ${escapar(c.depois)} | ${escapar(c.motivo)} |`);
      if (mostrar.length > 200) L.push(`| … | | | | mais ${mostrar.length - 200} |`);
      L.push("");
    }
  }

  L.push("## O que ficou em dúvida (precisa de você)", "");
  if (!res.duvidas.length) L.push("Nenhuma. Toda linha passou.", "");
  else {
    L.push("Nada disso foi alterado no arquivo: o campo com problema ficou vazio (o valor original está em `obs`) ou ficou como estava. Corrija na origem ou direto no `clientes.csv` e rode de novo com `--mesclar`.", "");
    L.push("| Cliente | Campo | Valor | Problema | O que fazer |", "|---|---|---|---|---|");
    for (const d of res.duvidas.slice(0, 300)) L.push(`| ${escapar(d.nome)} | ${d.campo} | ${escapar(d.valor)} | ${escapar(d.problema)} | ${escapar(d.acao)} |`);
    if (res.duvidas.length > 300) L.push(`| … | | | mais ${res.duvidas.length - 300} | |`);
    L.push("");
  }

  L.push("## Duplicatas mescladas", "");
  if (!res.mesclas.length) L.push("Nenhuma linha repetida por telefone, e-mail ou documento.", "");
  else {
    L.push("Ficou a linha mais completa, preenchida com o que as outras tinham. Primeira compra é a mais antiga, última compra é a mais recente. Valor somou quando as datas eram diferentes (compras distintas); quando iguais, era a mesma linha repetida e não somou.", "");
    L.push("| Cliente | Linhas | Chave que uniu | Valor somado |", "|---|---|---|---|");
    for (const m of res.mesclas.slice(0, 200)) L.push(`| ${escapar(m.nome)} | ${m.linhas} | ${escapar(m.chave)} | ${m.somou ? "sim" : "não"} |`);
    if (res.mesclas.length > 200) L.push(`| … | | mais ${res.mesclas.length - 200} | |`);
    L.push("");
    if (res.naoSomadas) L.push(`${res.naoSomadas} linha(s) de compra com data igual ou anterior ao total que já estava no \`clientes.csv\` não entraram na soma de novo. É o que impede o \`valor_total\` dobrar quando você reimporta a mesma exportação.`, "");
  }
  if (res.homonimos.length) {
    L.push("## Mesmo nome, contato diferente (não mesclado)", "", "Pode ser duas pessoas ou a mesma com número novo. Só você sabe.", "");
    L.push("| Nome | Quantos | Contatos |", "|---|---|---|");
    for (const h of res.homonimos) L.push(`| ${escapar(h.nome)} | ${h.quantos} | ${escapar(h.contatos)} |`);
    L.push("");
  }

  const parados = res.finais.map((f) => f.r).filter((r) => r.situacao === "parado").sort((a, b) => br.numero(b.valor_total || "0") - br.numero(a.valor_total || "0") || (b.meses_sem_comprar - a.meses_sem_comprar));
  L.push(`## Quem não compra há ${ctx.meses} meses ou mais`, "");
  if (!parados.length) L.push(res.finais.some((f) => f.r.ultima_compra) ? "Ninguém. Toda a base comprou dentro do período." : "Não dá pra saber: nenhuma linha tinha data de última compra. Se a planilha de vendas tem essa data, rode de novo com ela.", "");
  else {
    L.push("Ordenado por quem gastou mais. É a lista que o `/pos-venda` (cliente parado) e o `/retencao` leem.", "");
    L.push("| Cliente | Última compra | Meses | Valor total | Canal |", "|---|---|---|---|---|");
    for (const r of parados.slice(0, 100)) L.push(`| ${escapar(r.nome)} | ${br.fmt(br.lerData(r.ultima_compra))} | ${r.meses_sem_comprar} | ${r.valor_total ? br.reais(br.numero(r.valor_total)) : "" } | ${r.nao_contatar === "sim" ? "NÃO CONTATAR" : r.telefone ? "WhatsApp" : r.email ? "e-mail" : "nenhum"} |`);
    if (parados.length > 100) L.push(`| … | | | mais ${parados.length - 100} | |`);
    L.push("");
  }

  L.push("## Origem e base legal", "");
  const origens = new Map();
  for (const f of res.finais) { const o = f.r.origem || "(sem origem)"; origens.set(o, (origens.get(o) || 0) + 1); }
  L.push("| Origem | Clientes |", "|---|---|");
  for (const [o, q] of [...origens.entries()].sort((a, b) => b[1] - a[1])) {
    const fora = o !== "(sem origem)" && !ORIGENS.includes(o);
    L.push(`| ${o}${fora ? " (fora da lista fechada do `/medir`)" : ""} | ${q} |`);
  }
  L.push("");
  const bases = new Map();
  for (const f of res.finais) { const b = f.r.base_legal || "(sem base legal)"; bases.set(b, (bases.get(b) || 0) + 1); }
  L.push("| Base legal (LGPD) | Clientes |", "|---|---|");
  for (const [b, q] of [...bases.entries()].sort((a, b) => b[1] - a[1])) L.push(`| ${b} | ${q} |`);
  L.push("");
  if (ctx.baseLegalPadrao) L.push(`A base legal \`${ctx.baseLegalPadrao}\` foi aplicada a quem não tinha, por opção de linha de comando (veio da entrevista, não do arquivo).`);
  else L.push("Nenhuma base legal foi aplicada: a coluna `base_legal` ficou como veio do arquivo. A skill pergunta isso na entrevista; sem resposta, a base fica sem justificativa de uso.");
  if (ctx.origemPadrao) L.push(`A origem \`${ctx.origemPadrao}\` foi aplicada a quem não tinha, também por opção de linha de comando.`);
  L.push("");
  L.push("## Próximo passo", "");
  L.push(`1. Resolver as ${res.duvidas.length} dúvida(s) acima, na fonte ou no próprio \`clientes.csv\``);
  L.push("2. Rodar de novo com `--mesclar` quando entrar base nova, pra não criar duplicata");
  L.push("3. Esse arquivo fica em `dados/`, que o git ignora. É dado pessoal: não sai do computador sem autorização de quem está nele", "");
  return L.join("\n");
}

// ─────────────────────────── principal ───────────────────────────

function processar(arquivos, opts = {}) {
  const hoje = opts.hoje ? (lerDataQualquer(opts.hoje) || morrer(`--hoje "${opts.hoje}" não é data`)) : br.iso(new Date());
  const ctx = {
    hoje,
    meses: opts.meses !== undefined ? Number(opts.meses) : 6,
    origemPadrao: opts.origem ? normalizarOrigem(opts.origem) : "",
    baseLegalPadrao: opts.baseLegal ? br.slug(opts.baseLegal) : "",
    naoContatar: lerNaoContatar(opts.naoContatar),
    saidaCsv: opts.saidaCsv || "dados/clientes.csv",
  };
  if (!Number.isInteger(ctx.meses) || ctx.meses < 1) morrer(`--meses precisa ser inteiro a partir de 1 (veio "${opts.meses}")`);
  if (ctx.baseLegalPadrao && !BASES_LEGAIS.includes(ctx.baseLegalPadrao)) morrer(`--base-legal "${opts.baseLegal}" não é uma das bases`, `Use: ${BASES_LEGAIS.join(" | ")}`);
  let mapaForcado = {};
  if (opts.mapa) {
    if (!fs.existsSync(opts.mapa)) morrer(`não achei ${opts.mapa} (--mapa)`);
    try { mapaForcado = JSON.parse(lerTexto(opts.mapa)); } catch (e) { morrer(`--mapa não é JSON válido: ${e.message}`); }
    for (const k of Object.keys(mapaForcado)) if (!SINONIMOS[k]) morrer(`--mapa: "${k}" não é campo canônico`, `Campos: ${Object.keys(SINONIMOS).join(", ")}`);
  }

  const entradas = [], registros = [];
  const casaram = new Set(), naoCasaram = {};
  let linhasLidas = 0, vazias = 0;
  for (const arq of arquivos) {
    const ent = lerEntrada(arq, opts);
    // a linha que vem do clientes.csv anterior já é um total fechado, não uma compra nova
    const consolidado = path.resolve(arq) === path.resolve(ctx.saidaCsv);
    if (!ent.matriz.length) morrer(`${arq} não tem linha nenhuma`);
    const usaMapa = ent.tipo === "csv" || ent.tipo === "xlsx";
    const { mapa, semCabecalho, cab, foraDoArquivo } = mapearColunas(ent.matriz, usaMapa ? mapaForcado : {});
    if (usaMapa) for (const f of foraDoArquivo) (naoCasaram[f.canon] = naoCasaram[f.canon] || []).push({ arq, cab });
    if (usaMapa) for (const canon of Object.keys(mapaForcado)) if (!foraDoArquivo.some((f) => f.canon === canon)) casaram.add(canon);
    const dados = semCabecalho ? ent.matriz : ent.matriz.slice(1);
    if (!dados.length) morrer(`${arq} só tem o cabeçalho, nenhuma linha de cliente`);
    if (mapa.nome === undefined && mapa.telefone === undefined && mapa.email === undefined) {
      morrer(`em ${arq} não achei coluna de nome, telefone nem e-mail`, `Cabeçalho lido: ${cab.map((c, j) => `${j + 1}=${c}`).join(" | ")}\n  Diga qual é qual com --mapa mapa.json, por exemplo {"nome":"Cliente","telefone":"Cel"}`);
    }
    const sensiveis = cab.filter((c) => SENSIVEIS.test(limparCab(c)));
    for (const [canon, i] of Object.entries(mapa)) if (SENSIVEIS.test(limparCab(cab[i]))) delete mapa[canon];
    entradas.push({ nome: ent.nome, tipo: ent.tipo, semCabecalho, cab, mapa, linhas: dados.length, sensiveis, consolidado });
    for (const linha of dados) {
      linhasLidas++;
      const n = normalizarLinha(linha, mapa, ctx);
      if (!n) { vazias++; continue; }
      registros.push({ ...n, consolidado });
    }
  }
  for (const [canon, ocorrencias] of Object.entries(naoCasaram)) {
    if (casaram.has(canon)) continue;
    const o = ocorrencias[0];
    morrer(`--mapa: a coluna "${mapaForcado[canon]}" (pra ${canon}) não existe em nenhum arquivo`, `Cabeçalho de ${o.arq}: ${o.cab.map((c, j) => `${j + 1}=${c}`).join(" | ")}`);
  }
  if (!registros.length) morrer("nenhuma linha com nome, telefone, e-mail ou documento em nenhum arquivo");

  const { finais, mesclas, homonimos, naoSomadas } = deduplicar(registros, hoje);
  for (const f of finais) {
    fecharRegistro(f.r, ctx);
    f.duvidas = duvidasQueSobram(f.r, f.duvidas);
    f.correcoes = correcoesQueSobram(f.correcoes);
  }
  finais.sort((a, b) => a.r.nome.localeCompare(b.r.nome, "pt-BR"));
  const correcoes = finais.flatMap((f) => f.correcoes.map((c) => ({ nome: f.r.nome, ...c })));
  const duvidas = finais.flatMap((f) => f.duvidas.map((d) => ({ nome: f.r.nome || d.valor, ...d })));
  return { entradas, finais, mesclas, homonimos, naoSomadas, correcoes, duvidas, linhasLidas, vazias, ctx };
}

/** Opções que são liga/desliga: não engolem o argumento seguinte (senão `--mesclar base.csv` perdia o arquivo). */
const BOOLEANAS = new Set(["colunas", "mesclar", "sobrescrever", "json", "silencioso", "ajuda", "help"]);
/** Opções que exigem valor: passadas soltas, viram erro em vez de virar `true` e distorcer a conta. */
const COM_VALOR = new Set(["saida", "meses", "hoje", "origem", "baseLegal", "mapa", "aba", "naoContatar"]);

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (BOOLEANAS.has(k)) { o[k] = true; continue; }
      const v = argv[i + 1];
      if (v !== undefined && !v.startsWith("--")) { o[k] = v; i++; }
      else if (COM_VALOR.has(k)) morrer(`--${a.slice(2)} precisa de um valor logo depois`, `Exemplo: --${a.slice(2)} <valor>`);
      else o[k] = true;
      if (!BOOLEANAS.has(k) && !COM_VALOR.has(k)) morrer(`não conheço a opção --${a.slice(2)}`, `Rode sem argumento nenhum pra ver a lista.`);
    } else o._.push(a);
  }
  return o;
}

function main() {
  const o = args(process.argv.slice(2));
  SILENCIOSO = !!o.silencioso;
  const soRecalcular = o.mesclar && !o._.length;
  if ((!o._.length && !soRecalcular) || o.ajuda || o.help) {
    console.log(`Contex OS — cadastro-clientes.js\n\n  node scripts/cadastro-clientes.js <entrada.csv|.xlsx|.vcf|.txt> [outras...] [opções]\n\n  --colunas            só mostra como cada coluna foi entendida\n  --saida <pasta>      padrão: dados/\n  --meses <N>          parado = N meses sem comprar (padrão 6)\n  --hoje AAAA-MM-DD    data de referência\n  --origem <valor>     origem pra quem não tem (da entrevista)\n  --base-legal <v>     ${BASES_LEGAIS.join(" | ")}\n  --mapa <json>        {"nome":"Cliente","telefone":"Cel"} quando o script não acerta\n  --nao-contatar <arq> quem pediu pra não receber mensagem\n  --mesclar            junta com o clientes.csv que já existe (sem entrada, só recalcula)\n  --sobrescrever       substitui sem mesclar (guarda clientes-anterior.csv)\n  --json               resumo em JSON`);
    process.exit(o.ajuda || o.help ? 0 : 1);
  }

  const saidaPasta = o.saida ? String(o.saida) : "dados";
  const saidaCsv = path.join(saidaPasta, "clientes.csv");
  const arquivos = [...o._];
  for (const arq of arquivos) if (!fs.existsSync(arq)) morrer(`não achei ${arq}`, "Confira o caminho. O arquivo precisa estar acessível a partir da pasta onde você rodou o comando.");

  let mapaForcado = {};
  if (o.mapa) {
    if (!fs.existsSync(o.mapa)) morrer(`não achei ${o.mapa} (--mapa)`);
    try { mapaForcado = JSON.parse(lerTexto(o.mapa)); } catch (e) { morrer(`--mapa não é JSON válido: ${e.message}`); }
    for (const k of Object.keys(mapaForcado)) if (!SINONIMOS[k]) morrer(`--mapa: "${k}" não é campo canônico`, `Campos: ${Object.keys(SINONIMOS).join(", ")}`);
  }

  if (o.colunas) {
    for (const arq of arquivos) {
      const ent = lerEntrada(arq, o);
      const forcado = ent.tipo === "csv" || ent.tipo === "xlsx" ? mapaForcado : {};
      const { mapa, semCabecalho, cab, foraDoArquivo } = mapearColunas(ent.matriz, forcado);
      console.log(`\n${ent.nome} (${ent.tipo}${semCabecalho ? ", sem cabeçalho" : ""}): ${ent.matriz.length - (semCabecalho ? 0 : 1)} linha(s)`);
      cab.forEach((c, i) => {
        const canon = Object.keys(mapa).find((k) => mapa[k] === i);
        const veioDoMapa = canon && forcado[canon] !== undefined;
        const sensivel = SENSIVEIS.test(limparCab(c));
        console.log(`  ${String(i + 1).padStart(2)}. ${c || "(vazio)"}  →  ${canon ? canon : "(ignorada)"}${veioDoMapa ? "  [do --mapa]" : ""}${sensivel ? "  [dado sensível: não é lida]" : ""}`);
      });
      if (mapa.nome === undefined && mapa.telefone === undefined && mapa.email === undefined) {
        console.log(`  ⚠ nenhuma coluna de nome, telefone ou e-mail: sem --mapa esse arquivo não roda`);
      }
      for (const f of foraDoArquivo) console.log(`  · o --mapa pede "${f.nomeCol}" (pra ${f.canon}), que não existe neste arquivo; deve ser de outro da rodada`);
    }
    return;
  }

  if (fs.existsSync(saidaCsv)) {
    if (o.mesclar) arquivos.push(saidaCsv);
    else if (!o.sobrescrever) morrer(`${saidaCsv} já existe`, "Use --mesclar pra juntar (sem criar duplicata) ou --sobrescrever pra começar do zero.");
  } else if (o.mesclar && !o._.length) {
    morrer(`não achei ${saidaCsv} pra mesclar`, "Rode a primeira vez com o arquivo da base: node scripts/cadastro-clientes.js dados/base.xlsx --base-legal contrato");
  }
  if (!arquivos.length) morrer("nenhuma entrada", "Passe ao menos um arquivo: node scripts/cadastro-clientes.js dados/base.xlsx");
  // --sobrescrever joga fora dúvida que o usuário resolveu na mão: a versão anterior fica guardada
  if (o.sobrescrever && fs.existsSync(saidaCsv)) fs.copyFileSync(saidaCsv, saidaCsv.replace(/\.csv$/, "-anterior.csv"));

  const res = processar(arquivos, { ...o, saidaCsv, naoContatar: o.naoContatar });
  fs.mkdirSync(saidaPasta, { recursive: true });
  const tmp = saidaCsv + ".novo";
  fs.writeFileSync(tmp, csvCanonico(res.finais.map((f) => f.r)));
  fs.renameSync(tmp, saidaCsv);
  // relê o que gravou: toda linha com o mesmo número de colunas, e a contagem batendo
  const releitura = parseCsv(fs.readFileSync(saidaCsv, "utf8").replace(/^\uFEFF/, ""));
  const tortas = releitura.linhas.filter((l) => l.length !== COLUNAS.length).length;
  if (tortas || releitura.linhas.length - 1 !== res.finais.length) morrer(`o arquivo gravado não confere: ${tortas} linha(s) com número errado de colunas, ${releitura.linhas.length - 1} linha(s) lidas pra ${res.finais.length} cliente(s)`);
  const relPath = path.join(saidaPasta, `relatorio-limpeza-${res.ctx.hoje}.md`);
  fs.writeFileSync(relPath, relatorio(res, res.ctx));

  const conta = (f) => res.finais.filter((x) => f(x.r)).length;
  const resumo = {
    arquivos: res.entradas.map((e) => e.nome), linhasLidas: res.linhasLidas, ignoradas: res.vazias,
    duplicatasMescladas: res.mesclas.reduce((s, m) => s + m.linhas - 1, 0), clientes: res.finais.length,
    pf: conta((r) => r.tipo === "PF"), pj: conta((r) => r.tipo === "PJ"), tipoIndeterminado: conta((r) => r.tipo === "?"),
    comTelefone: conta((r) => r.telefone), comEmail: conta((r) => r.email), semCanal: conta((r) => !r.telefone && !r.email),
    parados: conta((r) => r.situacao === "parado"), ativos: conta((r) => r.situacao === "ativo"), semData: conta((r) => r.situacao === "sem-data"),
    naoContatar: conta((r) => r.nao_contatar === "sim"), semOrigem: conta((r) => !r.origem), semBaseLegal: conta((r) => !r.base_legal),
    correcoes: res.correcoes.length, duvidas: res.duvidas.length,
    comprasNaoSomadasDeNovo: res.naoSomadas, csv: saidaCsv, relatorio: relPath,
  };
  if (o.json) { console.log(JSON.stringify(resumo, null, 2)); return; }
  dizer(`\n✓ ${saidaCsv}: ${resumo.clientes} cliente(s) a partir de ${resumo.linhasLidas} linha(s), relido e conferido (${COLUNAS.length} colunas em toda linha)`);
  const juntou = res.entradas.some((e) => e.consolidado) ? "linha(s) juntada(s) (inclui a base anterior)" : "duplicata(s) mesclada(s)";
  dizer(`  ${resumo.duplicatasMescladas} ${juntou} · ${resumo.pf} PF · ${resumo.pj} PJ · ${resumo.tipoIndeterminado} sem documento`);
  dizer(`  ${resumo.comTelefone} com telefone válido · ${resumo.comEmail} com e-mail · ${resumo.semCanal} sem canal nenhum`);
  dizer(`  ${resumo.parados} parado(s) há ${res.ctx.meses}+ meses · ${resumo.ativos} ativo(s) · ${resumo.semData} sem data`);
  dizer(`  ${resumo.correcoes} correção(ões) automática(s) · ${resumo.duvidas} dúvida(s) pra você`);
  if (resumo.semBaseLegal) dizer(`  ⚠ ${resumo.semBaseLegal} sem base legal: passe --base-legal depois da entrevista`);
  if (resumo.semOrigem) dizer(`  ⚠ ${resumo.semOrigem} sem origem`);
  dizer(`\n  relatório: ${relPath}`);
}

module.exports = {
  COLUNAS, BASES_LEGAIS, SINONIMOS, ORIGENS, SENSIVEIS,
  processar, normalizarLinha, mapearColunas, deduplicar, fecharRegistro, csvCanonico, relatorio,
  capitalizarNome, lerDataQualquer, mesesEntre, normalizarOrigem, lerVcf, lerConversaWhatsapp, decodificarQP,
};

if (require.main === module) main();
