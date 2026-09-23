#!/usr/bin/env node
/**
 * Contex OS — br.js
 * O que todo script brasileiro do sistema precisa e ninguém deveria reescrever:
 * feriado nacional, dia útil, data no formato DD/MM/AAAA, número e moeda com
 * vírgula, CPF e CNPJ (inclusive o alfanumérico de julho/2026), telefone em
 * E.164 e CEP.
 *
 * Existe porque obrigacoes.js e lancamento.js nasceram cada um com a própria
 * tabela de feriados, e a terceira cópia seria a que diverge. Módulo, não
 * comando: `const br = require("./br.js")` de dentro de scripts/. Rodar direto
 * só mostra os exemplos.
 *
 * Node 18+, sem dependência.
 */

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// ─────────────────────────── datas ───────────────────────────

/** Páscoa pelo algoritmo de Meeus/Jones/Butcher (calendário gregoriano). */
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Soma dias corridos (aceita negativo). Sempre meia-noite local, sem fuso. */
function mais(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

/** "DD/MM" de uma data, chave da tabela de feriados. */
function ddmm(d) { return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; }

/** "DD/MM/AAAA". */
function fmt(d) { return `${ddmm(d)}/${d.getFullYear()}`; }

/** "AAAA-MM-DD". */
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

/** "seg", "ter"… */
function diaSemana(d) { return DIAS[d.getDay()]; }

/**
 * Lê "DD/MM/AAAA", "AAAA-MM-DD" ou "DD/MM" (assume o ano informado ou o atual).
 * Devolve null se a data não existe (31/02, 30/13) — nunca "corrige" em silêncio.
 */
function lerData(s, anoPadrao) {
  if (s instanceof Date) return isNaN(s) ? null : s;
  const t = String(s || "").trim();
  let d, m, a;
  let x;
  if ((x = t.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { a = +x[1]; m = +x[2]; d = +x[3]; }
  else if ((x = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) { d = +x[1]; m = +x[2]; a = +x[3]; }
  else if ((x = t.match(/^(\d{1,2})\/(\d{1,2})$/))) { d = +x[1]; m = +x[2]; a = anoPadrao || new Date().getFullYear(); }
  else return null;
  const dt = new Date(a, m - 1, d);
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** Dias corridos entre a e b (b − a). */
function diasEntre(a, b) { return Math.round((b - a) / 86400000); }

/**
 * Feriados nacionais mais os dias em que banco não abre (Carnaval, Corpus
 * Christi). O que decide vencimento é banco fechado, não repartição. Feriado
 * estadual e municipal não entra: passar em `extras` como ["25/01", "09/07"].
 * Devolve { "DD/MM": "nome" }.
 */
function feriados(ano, extras = []) {
  const p = pascoa(ano);
  const lista = {
    "01/01": "Confraternização Universal",
    [ddmm(mais(p, -48))]: "Carnaval (segunda, banco fechado)",
    [ddmm(mais(p, -47))]: "Carnaval (terça, banco fechado)",
    [ddmm(mais(p, -2))]: "Sexta-feira Santa",
    "21/04": "Tiradentes",
    "01/05": "Dia do Trabalho",
    [ddmm(mais(p, 60))]: "Corpus Christi (banco fechado)",
    "07/09": "Independência",
    "12/10": "Nossa Senhora Aparecida",
    "02/11": "Finados",
    "15/11": "Proclamação da República",
    "20/11": "Consciência Negra (Lei 14.759/2023)",
    "25/12": "Natal",
  };
  for (const f of extras) {
    if (!/^\d{2}\/\d{2}$/.test(f)) throw new Error(`feriado "${f}" fora do formato DD/MM`);
    lista[f] = "feriado local (informado)";
  }
  return lista;
}

/** Feriados de vários anos numa tabela só, chave "DD/MM/AAAA". */
function feriadosEntre(anoA, anoB, extras = []) {
  const t = {};
  for (let a = anoA; a <= anoB; a++) for (const [k, v] of Object.entries(feriados(a, extras))) t[`${k}/${a}`] = v;
  return t;
}

/** Motivo de não ser útil: nome do feriado, "sábado", "domingo" ou null. */
function porQueNaoUtil(d, extras = []) {
  const f = feriados(d.getFullYear(), extras)[ddmm(d)];
  if (f) return f;
  if (d.getDay() === 6) return "sábado";
  if (d.getDay() === 0) return "domingo";
  return null;
}

function ehUtil(d, extras = []) { return porQueNaoUtil(d, extras) === null; }

/** Empurra pro dia útil seguinte (imposto, boleto). Devolve { data, motivo }. */
function proximoUtil(d, extras = []) {
  let x = d, motivo = null;
  while (!ehUtil(x, extras)) { if (!motivo) motivo = porQueNaoUtil(x, extras); x = mais(x, 1); }
  return { data: x, motivo };
}

/** Antecipa pro dia útil anterior (obrigação trabalhista: o empregado recebe até a data). */
function anteriorUtil(d, extras = []) {
  let x = d, motivo = null;
  while (!ehUtil(x, extras)) { if (!motivo) motivo = porQueNaoUtil(x, extras); x = mais(x, -1); }
  return { data: x, motivo };
}

/** Soma n dias ÚTEIS (n pode ser negativo). */
function maisUteis(d, n, extras = []) {
  let x = d, passo = n < 0 ? -1 : 1, resta = Math.abs(n);
  while (resta > 0) { x = mais(x, passo); if (ehUtil(x, extras)) resta--; }
  return x;
}

/** Dias úteis entre a e b, sem contar a, contando b. */
function diasUteisEntre(a, b, extras = []) {
  let n = 0, x = a;
  while (x < b) { x = mais(x, 1); if (ehUtil(x, extras)) n++; }
  return n;
}

/** Último dia útil do mês (mes de 0 a 11). */
function ultimoUtil(ano, mes, extras = []) {
  let x = new Date(ano, mes + 1, 0);
  while (!ehUtil(x, extras)) x = mais(x, -1);
  return x;
}

// ─────────────────────────── números e dinheiro ───────────────────────────

/** "1,5" → 1.5 · "1.497,00" → 1497 · "1.200" → 1200 · "R$ 497" → 497 · "497.50" → 497.5 · "12%" → 12 */
function numero(s) {
  if (typeof s === "number") return s;
  if (s === undefined || s === null || s === true) return NaN;
  let t = String(s).trim().replace(/[R$\s%]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, "");
  return parseFloat(t);
}

/** 1497.5 → "R$ 1.497,50" */
function reais(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 0.1234 → "12,34%" */
function pct(fracao, casas = 2) {
  return (fracao * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
}

/** Arredonda em centavos (evita 0.1 + 0.2). */
function centavos(n) { return Math.round(n * 100) / 100; }

function semAcento(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "Padaria São João" → "padaria-sao-joao" */
function slug(s) {
  return semAcento(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ─────────────────────────── documentos ───────────────────────────

/** CPF com ou sem pontuação. Rejeita sequência repetida e dígito errado. */
function cpfValido(s) {
  const d = String(s || "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base, peso) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (peso - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10]);
}

/**
 * CNPJ numérico ou alfanumérico (formato novo, emitido a partir de julho/2026:
 * 12 posições com letras e números + 2 dígitos verificadores numéricos).
 * O cálculo usa o valor ASCII − 48 de cada posição, como a Receita definiu.
 */
function cnpjValido(s) {
  const t = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (t.length !== 14 || !/^[A-Z0-9]{12}\d{2}$/.test(t) || /^(.)\1{13}$/.test(t)) return false;
  const val = (ch) => ch.charCodeAt(0) - 48;
  const dv = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += val(base[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(t.slice(0, 12)) === Number(t[12]) && dv(t.slice(0, 13)) === Number(t[13]);
}

/** "12.345.678/0001-95" ou "12ABC34501DE35" já limpo. */
function formatarCnpj(s) {
  const t = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return t.length === 14 ? `${t.slice(0, 2)}.${t.slice(2, 5)}.${t.slice(5, 8)}/${t.slice(8, 12)}-${t.slice(12)}` : t;
}

function formatarCpf(s) {
  const d = String(s || "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d;
}

/**
 * Telefone brasileiro em qualquer formato → E.164 ("+5513997287738"), ou null.
 * Aceita DDD com ou sem 0, celular com 9 dígitos e fixo com 8. Não inventa o 9:
 * fixo continua fixo. DDD fora da lista da Anatel (11–99, sem 0 no meio) → null.
 */
function telefoneE164(s) {
  let d = String(s || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99 || d[1] === "0") return null;
  const resto = d.slice(2);
  if (resto.length === 9 && resto[0] !== "9") return null;
  if (resto.length === 8 && !/^[2-5]/.test(resto)) return null;
  return "+55" + d;
}

/** "+5513997287738" → "(13) 99728-7738" */
function telefoneBonito(e164) {
  const d = String(e164 || "").replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}

/** Link do WhatsApp com mensagem pré-preenchida. */
function linkWhatsapp(e164, mensagem) {
  const d = String(e164).replace(/\D/g, "");
  return `https://wa.me/${d}` + (mensagem ? `?text=${encodeURIComponent(mensagem)}` : "");
}

function emailValido(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim()); }

/** CEP "01310-100" ou "01310100" → "01310-100", ou null. Só formato: não consulta os Correios. */
function cep(s) {
  const d = String(s || "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : null;
}

// ─────────────────────────── exemplos ───────────────────────────

if (require.main === module) {
  const hoje = new Date();
  console.log("Contex OS — br.js (módulo). Exemplos:\n");
  console.log(`  hoje: ${fmt(hoje)} (${diaSemana(hoje)})`);
  const { data, motivo } = proximoUtil(lerData("20/11/2026"));
  console.log(`  20/11/2026 empurrado: ${fmt(data)}${motivo ? " (" + motivo + ")" : ""}`);
  console.log(`  5 dias úteis depois de 18/12/2026: ${fmt(maisUteis(lerData("18/12/2026"), 5))}`);
  console.log(`  numero("1.497,50") = ${numero("1.497,50")} · reais(1497.5) = ${reais(1497.5)} · pct(0.1234) = ${pct(0.1234)}`);
  console.log(`  cpfValido("111.444.777-35") = ${cpfValido("111.444.777-35")} · cnpjValido("11.222.333/0001-81") = ${cnpjValido("11.222.333/0001-81")}`);
  console.log(`  telefoneE164("(13) 99728-7738") = ${telefoneE164("(13) 99728-7738")} · slug("Padaria São João") = ${slug("Padaria São João")}`);
}

module.exports = {
  DIAS, MESES, pascoa, mais, ddmm, fmt, iso, diaSemana, lerData, diasEntre,
  feriados, feriadosEntre, porQueNaoUtil, ehUtil, proximoUtil, anteriorUtil, maisUteis, diasUteisEntre, ultimoUtil,
  numero, reais, pct, centavos, semAcento, slug,
  cpfValido, cnpjValido, formatarCnpj, formatarCpf, telefoneE164, telefoneBonito, linkWhatsapp, emailValido, cep,
};
