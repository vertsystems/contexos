#!/usr/bin/env node
/**
 * Contex OS — utm.js
 * Gera, lê e conta link com UTM, por comando.
 *
 * Existe porque link montado na mão erra de três jeitos silenciosos: "Instagram"
 * e "instagram" viram duas linhas no relatório; espaço e acento viram "%20" e
 * "%C3%A7" no meio do valor; e a página que já tinha "?" ganha um segundo "?" e
 * para de abrir. Aqui o valor é normalizado (minúscula, sem acento, hífen no
 * lugar de espaço), o encode é o do navegador, e uma planilha inteira de links
 * sai de uma vez, com o mesmo padrão em todos.
 *
 * Uso:
 *   node scripts/utm.js <url> --source instagram --medium social --campaign bio [--content botao-1] [--term ...]
 *   node scripts/utm.js --lista <arquivo.csv> [--saida <arquivo.csv>] [--md]
 *   node scripts/utm.js ler <url>
 *   node scripts/utm.js contar <arquivo.csv> --coluna origem [--valor valor] [--peso sessoes] [--mes 2026-08] [--md] [--saida <arquivo>]
 *
 * O CSV da --lista precisa das colunas url, source, medium e campaign (aceita
 * também os nomes em português: link, origem, meio, campanha, conteudo, termo).
 * Qualquer outra coluna ("onde", "peça") é mantida na saída, e a coluna "link"
 * é acrescentada no fim (ou "link_utm", se o CSV já usava "link" pra URL de
 * entrada). Linha com URL quebrada sai com o link vazio e o erro no final.
 *
 * O `contar` agrupa uma coluna de qualquer CSV (a planilha de clientes com a
 * coluna "origem", ou o export do GA4) e devolve quantidade e porcentagem por
 * valor. Linha em branco vira "(não informado)" e aparece na tabela: cliente de
 * origem desconhecida é uma linha, não um sumiço. Com --valor, soma também uma
 * coluna de dinheiro (aceita "1.234,56"); com --soma, uma coluna de número sem
 * R$ (cliques, leads). Com --peso, cada linha vale o número daquela coluna em
 * vez de 1: é o caso do export do GA4, que já vem com uma linha por canal e a
 * quantidade de sessões ao lado. Linha "Total"/"Totais" no meio do dado é
 * pulada, senão contaria em dobro. Com --mes AAAA-MM, só entram as linhas
 * cuja data (coluna "data", ou a de --data) cai naquele mês; aceita
 * 2026-08-02, 02/08/2026 e 2/8/26.
 *
 * Opções:
 *   --md               tabela markdown em vez de CSV (lista e contar)
 *   --saida <arquivo>  grava o resultado no arquivo em vez de só imprimir
 *   --bruto            não normaliza os valores (mantém maiúscula, acento, espaço)
 *   --sep <;|,|tab>    separador do CSV de entrada (padrão: detecta)
 *   --mes AAAA-MM      (contar) só as linhas daquele mês, pela coluna de data
 *   --data <coluna>    (contar) qual coluna é a data, se não se chama "data"
 *
 * Node 18+, sem dependência.
 */

const fs = require("fs");
const path = require("path");

const UTM = ["source", "medium", "campaign", "term", "content"];

// Nomes que o CSV pode usar pra cada campo. Minúsculo, sem acento.
const ALIAS = {
  url: ["url", "link", "pagina", "destino", "endereco"],
  source: ["source", "utm_source", "origem", "fonte"],
  medium: ["medium", "utm_medium", "meio", "midia"],
  campaign: ["campaign", "utm_campaign", "campanha"],
  term: ["term", "utm_term", "termo"],
  content: ["content", "utm_content", "conteudo", "variante"],
};

// Meios que a convenção do Contex OS usa (templates/crescimento/medicao.md).
// Valor fora da lista não é erro, é aviso: o relatório do GA4 agrupa por medium,
// e um "instagram-bio" no lugar de "social" some do grupo certo.
const MEIOS = ["social", "paid_social", "cpc", "email", "referral", "organic", "offline", "cliente", "parceiro", "afiliado", "whatsapp", "sms", "display", "video"];

const avisos = [];
function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}
function avisar(msg) { avisos.push(msg); }

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith("--") && v.length > 2)) o[k] = true;
      else { o[k] = v; i++; }
    } else o._.push(a);
  }
  return o;
}

/** "Black Friday 2026" → "black-friday-2026"; "Instagram" → "instagram" */
function normalizar(valor) {
  return String(valor)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function semAcento(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * "1.234,56" → 1234.56; "R$ 97" → 97; "1,5" → 1.5; "2.000" → 2000; "3.5" → 3.5;
 * "" → NaN. Ponto seguido de exatamente três dígitos, sem vírgula, é milhar
 * (formato brasileiro); qualquer outro ponto é decimal.
 */
function numeroBR(s) {
  if (s === undefined || s === null) return NaN;
  let t = String(s).replace(/[R$\s%]/g, "");
  if (!t) return NaN;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** "2026-08-02" | "02/08/2026" | "2/8/26" | "02-08-2026" → "2026-08"; outra coisa → null */
function mesDe(s) {
  const t = String(s ?? "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${ano}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

function moedaBR(n) {
  return "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ── URL ──────────────────────────────────────────────────────────────────────

function montar(urlBruta, valores, bruto) {
  let texto = String(urlBruta || "").trim();
  if (!texto) throw new Error("URL vazia");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(texto)) {
    texto = "https://" + texto;
    avisar(`"${urlBruta}" veio sem https://, assumi https`);
  }
  let url;
  try { url = new URL(texto); } catch { throw new Error(`URL inválida: "${urlBruta}"`); }
  if (!/^https?:$/.test(url.protocol)) throw new Error(`só http e https: "${urlBruta}"`);
  if (!url.hostname.includes(".") && url.hostname !== "localhost") throw new Error(`domínio incompleto: "${urlBruta}"`);

  if (/(^|\.)(wa\.me|api\.whatsapp\.com|whatsapp\.com)$/i.test(url.hostname)) {
    avisar(`"${url.hostname}" é link do WhatsApp: o WhatsApp ignora UTM. Registre a origem na pergunta do atendimento ou no texto pré-preenchido (?text=)`);
  }

  for (const k of ["source", "medium", "campaign"]) {
    if (!valores[k] || !String(valores[k]).trim()) throw new Error(`falta --${k} pra "${urlBruta}"`);
  }

  for (const k of UTM) {
    const chave = `utm_${k}`;
    if (url.searchParams.has(chave)) {
      avisar(`"${urlBruta}" já tinha ${chave}=${url.searchParams.get(chave)}; substituído`);
      url.searchParams.delete(chave);
    }
  }

  const finais = {};
  for (const k of UTM) {
    if (valores[k] === undefined || valores[k] === null || !String(valores[k]).trim()) continue;
    const v = bruto ? String(valores[k]).trim() : normalizar(valores[k]);
    if (!v) throw new Error(`--${k} ficou vazio depois de limpar ("${valores[k]}")`);
    if (!bruto && v !== String(valores[k]).trim()) avisar(`${k}: "${valores[k]}" → "${v}"`);
    finais[k] = v;
    url.searchParams.set(`utm_${k}`, v);
  }

  if (!MEIOS.includes(finais.medium)) {
    avisar(`medium "${finais.medium}" não está na convenção (${MEIOS.join(", ")}). Vale, mas o GA4 pode não agrupar no canal certo`);
  }
  if (finais.source === finais.medium && finais.source !== "whatsapp") avisar(`source e medium iguais ("${finais.source}"): source é DE ONDE (instagram), medium é o TIPO (social)`);

  return { link: url.toString(), valores: finais };
}

function ler(urlBruta) {
  let url;
  try { url = new URL(String(urlBruta).trim()); } catch { morrer(`URL inválida: "${urlBruta}"`); }
  const achados = UTM.map((k) => [k, url.searchParams.get(`utm_${k}`)]).filter(([, v]) => v !== null);
  console.log(`\nLINK: ${url.origin}${url.pathname}`);
  if (!achados.length) {
    console.log("  sem UTM: quem clicar aqui aparece no relatório como (direct) ou como o site de origem, sem campanha");
    return;
  }
  for (const [k, v] of achados) {
    const marca = /[A-Z\s]|[^\x20-\x7E]/.test(v) ? "   ← maiúscula, espaço ou acento: vira linha separada no relatório" : "";
    console.log(`  utm_${k.padEnd(9)} ${v}${marca}`);
  }
  const faltam = ["source", "medium", "campaign"].filter((k) => !achados.find(([a]) => a === k));
  if (faltam.length) console.log(`  falta: ${faltam.map((k) => "utm_" + k).join(", ")} (os três obrigatórios são source, medium e campaign)`);
  const outros = [...url.searchParams.keys()].filter((k) => !k.startsWith("utm_"));
  if (outros.length) console.log(`  outros parâmetros mantidos: ${outros.join(", ")}`);
}

// ── CSV ──────────────────────────────────────────────────────────────────────

function detectarSep(linha, forcado) {
  if (forcado) return forcado === "tab" ? "\t" : forcado;
  const c = { ";": 0, ",": 0, "\t": 0 };
  let aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (!aspas && ch in c) c[ch]++;
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}

function parseLinha(linha, sep) {
  const campos = [];
  let atual = "", aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (aspas) {
      if (ch === '"' && linha[i + 1] === '"') { atual += '"'; i++; }
      else if (ch === '"') aspas = false;
      else atual += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { campos.push(atual); atual = ""; }
    else atual += ch;
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

function lerCsv(arquivo, sepForcado) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);
  const texto = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  // Export do GA4 começa com linhas de comentário ("# ----") e pode ter blocos
  // separados por linha em branco; só o primeiro bloco com cabeçalho interessa.
  const linhas = texto.split(/\r?\n/).filter((l) => !l.startsWith("#"));
  while (linhas.length && !linhas[0].trim()) linhas.shift();
  if (!linhas.length) morrer(`${arquivo} está vazio`);
  const sep = detectarSep(linhas[0], sepForcado);
  const cab = parseLinha(linhas[0], sep);
  const dados = [];
  for (let i = 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) break;
    const c = parseLinha(linhas[i], sep);
    if (c.every((x) => !x)) continue;
    dados.push({ n: i + 1, campos: c });
  }
  return { sep, cab, dados };
}

function csvCampo(v, sep) {
  const s = String(v ?? "");
  return /["\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

function acharColuna(cab, nomes) {
  const limpo = cab.map(semAcento);
  for (const n of nomes) {
    const i = limpo.indexOf(semAcento(n));
    if (i >= 0) return i;
  }
  return -1;
}

function tabelaMd(cabecalho, linhas) {
  const larg = cabecalho.map((h, i) => Math.max(h.length, ...linhas.map((l) => String(l[i]).length)));
  const fmt = (l) => "| " + l.map((c, i) => String(c).padEnd(larg[i])).join(" | ") + " |";
  return [fmt(cabecalho), "|" + larg.map((w) => "-".repeat(w + 2)).join("|") + "|", ...linhas.map(fmt)].join("\n");
}

function gravarOuImprimir(saida, texto) {
  if (saida && saida !== true) {
    fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
    fs.writeFileSync(saida, texto + "\n");
    console.log(`\n✓ gravado em ${saida}`);
  } else console.log("\n" + texto);
}

// ── comandos ─────────────────────────────────────────────────────────────────

function cmdUm(o) {
  const url = o._[0];
  if (!url) morrer("falta a URL", "node scripts/utm.js https://seusite.com.br --source instagram --medium social --campaign bio");
  let r;
  try { r = montar(url, o, o.bruto); } catch (e) { morrer(e.message); }
  console.log("\n" + r.link);
  if (o.md) {
    console.log("\n" + tabelaMd(["Onde", "source", "medium", "campaign", "content", "Link"],
      [[o.onde || "", r.valores.source, r.valores.medium, r.valores.campaign, r.valores.content || "", r.link]]));
  }
  if (o.saida && o.saida !== true) { fs.appendFileSync(o.saida, r.link + "\n"); console.log(`✓ acrescentado em ${o.saida}`); }
}

function cmdLista(o) {
  const { sep, cab, dados } = lerCsv(o.lista, o.sep);
  const col = {};
  for (const k of Object.keys(ALIAS)) col[k] = acharColuna(cab, ALIAS[k]);
  const faltam = ["url", "source", "medium", "campaign"].filter((k) => col[k] < 0);
  if (faltam.length) {
    morrer(`o CSV não tem coluna ${faltam.join(", ")}`,
      `Cabeçalho lido: ${cab.join(" | ")}\n  Esperado: url, source, medium, campaign (e opcionais content, term). Aceita também link, origem, meio, campanha, conteudo, termo.`);
  }
  const extras = cab.map((h, i) => i).filter((i) => !Object.values(col).includes(i));
  const erros = [];
  const saida = [];
  for (const { n, campos } of dados) {
    const v = {};
    for (const k of UTM) if (col[k] >= 0) v[k] = campos[col[k]];
    let link = "";
    try { link = montar(campos[col.url], v, o.bruto).link; }
    catch (e) { erros.push(`linha ${n}: ${e.message}`); }
    saida.push({ campos, link });
  }
  let texto;
  if (o.md) {
    const cabMd = [...extras.map((i) => cab[i]), "source", "medium", "campaign", "content", "Link"];
    texto = tabelaMd(cabMd, saida.map(({ campos, link }) => [
      ...extras.map((i) => campos[i]),
      ...["source", "medium", "campaign", "content"].map((k) => (col[k] >= 0 ? (o.bruto ? campos[col[k]] : normalizar(campos[col[k]])) : "")),
      link || "(erro)",
    ]));
  } else {
    const nomeLink = cab.map(semAcento).includes("link") ? "link_utm" : "link";
    const linhas = [[...cab, nomeLink].map((c) => csvCampo(c, sep)).join(sep)];
    for (const { campos, link } of saida) linhas.push([...campos, link].map((c) => csvCampo(c, sep)).join(sep));
    texto = linhas.join("\n");
  }
  gravarOuImprimir(o.saida, texto);
  console.log(`\n${saida.length - erros.length} link(s) gerado(s)${erros.length ? `, ${erros.length} com erro` : ""}`);
  if (erros.length) { console.error("\n✖ " + erros.join("\n✖ ")); process.exitCode = 1; }
}

function cmdContar(o) {
  const arquivo = o._[1];
  if (!arquivo) morrer("falta o arquivo", "node scripts/utm.js contar dados/clientes.csv --coluna origem");
  if (!o.coluna || o.coluna === true) morrer("falta --coluna <nome ou número>", "o nome como está no cabeçalho, ou o número da coluna começando em 1");
  const { cab, dados } = lerCsv(arquivo, o.sep);
  const idx = (ref) => (/^\d+$/.test(String(ref)) ? Number(ref) - 1 : acharColuna(cab, [ref]));
  const ci = idx(o.coluna);
  if (ci < 0 || ci >= cab.length) morrer(`coluna "${o.coluna}" não existe`, `Cabeçalho lido: ${cab.map((c, i) => `${i + 1}=${c}`).join(" | ")}`);
  const colunaOpcional = (flag) => {
    if (!o[flag] || o[flag] === true) return -1;
    const i = idx(o[flag]);
    if (i < 0 || i >= cab.length) morrer(`coluna de --${flag} "${o[flag]}" não existe`, `Cabeçalho lido: ${cab.map((c, j) => `${j + 1}=${c}`).join(" | ")}`);
    return i;
  };
  const vi = colunaOpcional("valor"); // dinheiro, sai como R$
  const si = colunaOpcional("soma");  // número simples (cliques, leads)
  const pi = colunaOpcional("peso");  // quanto cada linha vale na contagem (sessões do GA4)

  // --mes 2026-08: filtra pela coluna de data antes de contar
  let mes = null, di = -1, foraDoMes = 0, semData = 0;
  if (o.mes && o.mes !== true) {
    if (!/^\d{4}-\d{2}$/.test(String(o.mes))) morrer(`--mes precisa ser AAAA-MM (veio "${o.mes}")`);
    mes = String(o.mes);
    di = o.data && o.data !== true ? idx(o.data) : acharColuna(cab, ["data", "date", "dia", "data-da-venda", "data_venda", "criado-em", "cadastro"]);
    if (di < 0 || di >= cab.length) morrer(`não achei a coluna de data pra filtrar por --mes`, `Diga qual é com --data <nome ou número>. Cabeçalho lido: ${cab.map((c, j) => `${j + 1}=${c}`).join(" | ")}`);
  }

  const grupos = new Map();
  let semValor = 0, semSoma = 0, semPeso = 0, totaisPulados = 0;
  for (const { campos } of dados) {
    const chave = (campos[ci] || "").trim() || "(não informado)";
    // Linha de total que a ferramenta já põe no export: somar de novo dobraria tudo.
    if (/^(total|totais|grand total|totals?)$/i.test(semAcento(chave))) { totaisPulados++; continue; }
    if (mes) {
      const m = mesDe(campos[di]);
      if (!m) { semData++; continue; }
      if (m !== mes) { foraDoMes++; continue; }
    }
    const g = grupos.get(chave) || { n: 0, valor: 0, soma: 0 };
    if (pi >= 0) {
      const p = numeroBR(campos[pi]);
      if (Number.isNaN(p)) semPeso++; else g.n += p;
    } else g.n++;
    if (vi >= 0) {
      const v = numeroBR(campos[vi]);
      if (Number.isNaN(v)) semValor++; else g.valor += v;
    }
    if (si >= 0) {
      const v = numeroBR(campos[si]);
      if (Number.isNaN(v)) semSoma++; else g.soma += v;
    }
    grupos.set(chave, g);
  }
  if (!grupos.size) morrer(mes ? `nenhuma linha de ${arquivo} cai em ${mes} (${foraDoMes} de outro mês, ${semData} sem data legível)` : `${arquivo} não tem linha de dado`);
  const total = [...grupos.values()].reduce((s, g) => s + g.n, 0);
  if (!total) morrer(`a coluna de --peso "${cab[pi]}" não tem número legível em nenhuma linha`);
  const ordem = [...grupos.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0], "pt-BR"));
  const valorTotal = ordem.reduce((s, [, g]) => s + g.valor, 0);
  const somaTotal = ordem.reduce((s, [, g]) => s + g.soma, 0);
  const pct = (n) => ((n / total) * 100).toFixed(1).replace(".", ",") + "%";
  const numero = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
  const cabecalho = [cab[ci], pi >= 0 ? cab[pi] : "Quantidade", "%"];
  if (vi >= 0) cabecalho.push(cab[vi]);
  if (si >= 0) cabecalho.push(cab[si]);
  const linhas = ordem.map(([k, g]) => {
    const l = [k, numero(g.n), pct(g.n)];
    if (vi >= 0) l.push(moedaBR(g.valor));
    if (si >= 0) l.push(numero(g.soma));
    return l;
  });
  const totalLinha = ["Total", numero(total), "100%"];
  if (vi >= 0) totalLinha.push(moedaBR(valorTotal));
  if (si >= 0) totalLinha.push(numero(somaTotal));
  linhas.push(totalLinha);

  let texto;
  if (o.md) texto = tabelaMd(cabecalho, linhas);
  else texto = [cabecalho.join(";"), ...linhas.map((l) => l.map((c) => csvCampo(c, ";")).join(";"))].join("\n");
  gravarOuImprimir(o.saida, texto);
  const usadas = dados.length - totaisPulados - foraDoMes - semData;
  console.log(`\nBase: ${usadas} linha(s) de ${path.basename(arquivo)}${mes ? ` em ${mes}` : ""}, agrupadas por "${cab[ci]}"${pi >= 0 ? `, pesadas por "${cab[pi]}"` : ""}`);
  if (mes && foraDoMes) console.log(`  ${foraDoMes} linha(s) de outro mês, fora da conta`);
  if (mes && semData) console.log(`  ${semData} linha(s) sem data legível em "${cab[di]}", fora da conta (não dá pra saber o mês)`);
  const naoInformado = grupos.get("(não informado)");
  if (naoInformado) console.log(`  ${numero(naoInformado.n)} sem origem (${pct(naoInformado.n)}). Essa linha fica na tabela; o conserto é perguntar no atendimento, não apagar`);
  if (semValor) console.log(`  ${semValor} linha(s) com "${cab[vi]}" em branco ou ilegível, somadas como zero`);
  if (semSoma) console.log(`  ${semSoma} linha(s) com "${cab[si]}" em branco ou ilegível, somadas como zero`);
  if (semPeso) console.log(`  ${semPeso} linha(s) sem número em "${cab[pi]}", contadas como zero`);
  if (totaisPulados) console.log(`  ${totaisPulados} linha(s) de total do próprio export ignoradas, pra não contar em dobro`);
}

// ── main ─────────────────────────────────────────────────────────────────────

const o = args(process.argv.slice(2));
if (!process.argv.slice(2).length || o.ajuda || o.help) {
  console.log(`
Contex OS — utm.js: link com UTM, leitura de link e contagem de origem

  node scripts/utm.js <url> --source instagram --medium social --campaign bio [--content botao-1]
  node scripts/utm.js --lista links.csv [--saida medicao/links.csv] [--md]
  node scripts/utm.js ler "<url>"
  node scripts/utm.js contar dados/clientes.csv --coluna origem --mes 2026-08 [--valor valor] [--md]
  node scripts/utm.js contar dados/ga4.csv --coluna 1 --peso 2 --md

Opções: --md  --saida <arquivo>  --bruto  --sep <;|,|tab>
Contar: --valor <coluna de R$>  --soma <coluna de número>  --peso <coluna que vale a quantidade>
        --mes AAAA-MM [--data <coluna>]  só as linhas daquele mês
Convenção de source/medium/campaign: templates/crescimento/medicao.md
`);
  process.exit(0);
}

if (o.lista) cmdLista(o);
else if (o._[0] === "ler") { if (!o._[1]) morrer("falta a URL", 'node scripts/utm.js ler "https://..."'); ler(o._[1]); }
else if (o._[0] === "contar") cmdContar(o);
else cmdUm(o);

if (avisos.length) {
  console.log("\nAvisos:");
  for (const a of [...new Set(avisos)]) console.log("  · " + a);
}
