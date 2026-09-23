#!/usr/bin/env node
/**
 * Contex OS — case.js
 * Calcula a variação antes → depois de um case de cliente e confere que todo
 * número e toda data do texto existem nos fatos colhidos.
 *
 * Existe porque case é prova, e prova escrita de cabeça vira propaganda enganosa
 * sem querer: "caiu 80%" quando a conta dá 75%, "em 3 meses" quando foram 19
 * semanas, um "R$ 24.500" que ninguém sabe de onde saiu. O /case colhe os fatos
 * num JSON (com fonte e data em cada número), o assistente escreve o texto, e
 * este script faz as duas coisas que leitura atenta não faz: a conta e o cruzamento.
 *
 * Uso:
 *   node scripts/case.js calcular <slug>.fatos.json            variação de cada métrica, prazo e status
 *   node scripts/case.js conferir <slug>.md [<slug>.fatos.json] cada número e data do .md contra os fatos
 *   node scripts/case.js linha <slug>.fatos.json               a linha pronta pra tabela "Cases" do biblioteca.md
 *   node scripts/case.js slug "Padaria São João" "perda de lote" nome de arquivo no padrão
 *   node scripts/case.js <slug>.fatos.json                     calcular + conferir (se o .md existir ao lado)
 *   node scripts/case.js <slug>.md                             só conferir (os fatos são lidos ao lado)
 *
 * Opções:
 *   --json     saída em JSON (pra outro script ler)
 *
 * Formato do .fatos.json (o molde completo está em templates/crescimento/case.md):
 *   {
 *     "cliente": "Padaria São João", "segmento": "padaria de bairro", "trava": "jogava pão fora",
 *     "pode_citar_nome": true, "atualizado_em": "2026-09-22",
 *     "periodo": { "inicio": "2026-03-01", "fim": "2026-08-31" },
 *     "metricas": [ { "nome": "Perda de lote", "antes": 12, "depois": 3, "unidade": "%",
 *                     "fonte": "planilha de controle da padaria", "data": "2026-08-31" } ],
 *     "outros_numeros": [ { "valor": 3, "o_que": "funcionários", "fonte": "dito pelo cliente" } ],
 *     "depoimento": { "texto": "...", "quem": "Maria, dona", "data": "2026-09-05", "canal": "WhatsApp" },
 *     "autorizacao": { "data": "2026-09-10", "arquivo": "biblioteca/cases/padaria-sao-joao-autorizacao.md" }
 *   }
 *
 * Status possíveis: "comprovado" (ao menos uma métrica com antes, depois, fonte e data),
 * "relato sem prova" (falta número com fonte) e, em qualquer um dos dois, o sufixo
 * "aguardando autorização" enquanto autorizacao.data estiver vazio.
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_SA = MESES_LONGOS.map((m) => br.semAcento(m));
const PALAVRA_DE_CARGO = ["dona", "dono", "socia", "socio", "gerente", "diretora", "diretor", "cliente", "responsavel", "coordenadora", "coordenador", "proprietaria", "proprietario"];

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function lerJson(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);
  let dados;
  try { dados = JSON.parse(fs.readFileSync(arquivo, "utf8")); }
  catch (e) { morrer(`${arquivo} não é JSON válido: ${e.message}`, "vírgula sobrando no fim de lista e aspas simples são os erros mais comuns"); }
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) morrer(`${arquivo} precisa ser um objeto JSON`);
  return dados;
}

/** Número em qualquer formato (12, "12", "R$ 1.234,56", "12%") → número ou NaN. */
function num(v) {
  if (v === undefined || v === null || v === "") return NaN;
  return br.numero(v);
}

/** Sempre uma lista: campo ausente ou com tipo errado não derruba o script. */
function lista(v) { return Array.isArray(v) ? v : []; }

function arred(n, casas) { const f = 10 ** casas; return Math.round(n * f) / f; }

/** Formata conforme a unidade: R$ vira reais, % vira "12%", resto vira número pt-BR. */
function formatar(n, unidade) {
  if (!isFinite(n)) return "?";
  const u = String(unidade || "").trim().toUpperCase();
  if (u === "R$") return br.reais(n);
  const s = Number(arred(n, 2)).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (u === "%") return s + "%";
  return unidade ? `${s} ${unidade}` : s;
}

// ─────────────────────────── calcular ───────────────────────────

/**
 * Variação de uma métrica. Devolve null se antes ou depois não for número.
 * direcao: "subiu" | "caiu" | "igual". pct é sobre o antes; vezes é depois ÷ antes.
 */
function variacao(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  const antes = num(m.antes), depois = num(m.depois);
  if (!isFinite(antes) || !isFinite(depois)) return null;
  const dif = depois - antes;
  const pct = antes === 0 ? null : (dif / Math.abs(antes)) * 100;
  const vezes = antes === 0 ? null : depois / antes;
  return {
    nome: m.nome || "(sem nome)", unidade: m.unidade || "", antes, depois,
    diferenca: arred(dif, 2), pct: pct === null ? null : arred(pct, 1),
    vezes: vezes === null ? null : arred(vezes, 2),
    direcao: dif > 0 ? "subiu" : dif < 0 ? "caiu" : "igual",
    comFonte: !!(m.fonte && String(m.fonte).trim()) && !!br.lerData(m.data),
  };
}

/** Prazo entre duas datas: dias, semanas, meses completos e meses de calendário tocados. */
function prazo(inicio, fim) {
  const a = br.lerData(inicio), b = br.lerData(fim);
  if (!a || !b) return null;
  const dias = br.diasEntre(a, b);
  if (dias < 0) return { erro: `fim (${fim}) antes do início (${inicio})` };
  const meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1);
  // "de março a agosto" são 6 meses de calendário, mesmo que só 5 tenham se completado
  const mesesCalendario = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
  return { dias, semanas: arred(dias / 7, 1), meses, mesesCalendario, inicio: br.fmt(a), fim: br.fmt(b) };
}

/** Status do case a partir dos fatos. */
function status(fatos) {
  const metricas = lista(fatos.metricas).map(variacao).filter(Boolean);
  const provado = metricas.some((m) => m.comFonte);
  const autorizado = !!(fatos.autorizacao && br.lerData(fatos.autorizacao.data));
  const base = provado ? "comprovado" : "relato sem prova";
  return { texto: autorizado ? base : `${base}, aguardando autorização`, provado, autorizado };
}

function calcular(fatos) {
  const problemas = [], avisos = [];
  if (!fatos.cliente) problemas.push('falta "cliente"');
  if (fatos.metricas !== undefined && !Array.isArray(fatos.metricas)) problemas.push('"metricas" precisa ser uma lista (pode ser vazia)');
  if (fatos.outros_numeros !== undefined && !Array.isArray(fatos.outros_numeros)) problemas.push('"outros_numeros" precisa ser uma lista');
  const metricas = [];
  for (const m of lista(fatos.metricas)) {
    const v = variacao(m);
    if (!v) { problemas.push(`métrica "${(m && m.nome) || "?"}": antes ou depois não é número (antes=${JSON.stringify(m && m.antes)}, depois=${JSON.stringify(m && m.depois)})`); continue; }
    if (m.data && !br.lerData(m.data)) problemas.push(`métrica "${v.nome}": a data "${m.data}" não existe (use AAAA-MM-DD ou DD/MM/AAAA)`);
    if (!v.comFonte) avisos.push(`métrica "${v.nome}" sem fonte ou sem data válida: não conta como prova`);
    if (m.periodo) v.prazo = prazo(m.periodo.inicio, m.periodo.fim);
    metricas.push(v);
  }
  const p = fatos.periodo ? prazo(fatos.periodo.inicio, fatos.periodo.fim) : null;
  if (fatos.periodo && !p) problemas.push(`"periodo" com data que não existe: ${JSON.stringify(fatos.periodo)}`);
  if (p && p.erro) problemas.push(`"periodo": ${p.erro}`);
  const st = status(fatos);
  return { cliente: fatos.cliente, metricas, prazo: p && !p.erro ? p : null, status: st, problemas, avisos };
}

function descreverPrazo(p) {
  const cal = p.mesesCalendario !== p.meses ? `, ${p.mesesCalendario} meses de calendário` : "";
  return `${p.dias} dias (${p.semanas.toLocaleString("pt-BR")} semanas, ${p.meses} meses completos${cal})`;
}

function imprimirCalculo(r) {
  console.log(`\nCase — ${r.cliente || "(sem cliente)"}\n`);
  if (!r.metricas.length) console.log("  nenhuma métrica com antes e depois numéricos");
  for (const m of r.metricas) {
    const partes = [`${formatar(m.antes, m.unidade)} → ${formatar(m.depois, m.unidade)}`, `${m.direcao} ${formatar(Math.abs(m.diferenca), m.unidade)}`];
    if (m.pct !== null) partes.push(`${Math.abs(m.pct).toLocaleString("pt-BR")}% ${m.direcao === "caiu" ? "a menos" : "a mais"} sobre o antes`);
    if (m.vezes !== null && m.vezes >= 1.5) partes.push(`${m.vezes.toLocaleString("pt-BR")}× o antes`);
    console.log(`  ${m.comFonte ? "✓" : "?"} ${m.nome}: ${partes.join(" · ")}${m.comFonte ? "" : "  [sem fonte/data: não é prova]"}`);
    if (m.prazo && !m.prazo.erro) console.log(`      no período ${m.prazo.inicio} a ${m.prazo.fim}: ${descreverPrazo(m.prazo)}`);
  }
  if (r.prazo) console.log(`\n  prazo: ${r.prazo.inicio} a ${r.prazo.fim} = ${descreverPrazo(r.prazo)}`);
  console.log(`\n  status: ${r.status.texto}`);
  for (const a of r.avisos) console.log(`  ! ${a}`);
  for (const p of r.problemas) console.log(`  ✖ ${p}`);
  console.log("");
}

// ─────────────────────────── conferir ───────────────────────────

/** Conjunto de números que o texto pode citar, com os arredondamentos aceitos. */
function numerosPermitidos(fatos, calc) {
  const set = new Set();
  const add = (n) => {
    if (!isFinite(n)) return;
    const a = Math.abs(n);
    for (const c of [0, 1, 2]) set.add(String(arred(a, c)));
  };
  const addPrazo = (p) => { add(p.dias); add(p.semanas); add(Math.round(p.semanas)); add(p.meses); add(p.mesesCalendario); };
  for (const m of calc.metricas) {
    add(m.antes); add(m.depois); add(m.diferenca);
    if (m.pct !== null) { add(m.pct); add(Math.round(m.pct)); }
    if (m.vezes !== null && Math.abs(m.vezes) >= 1.5) { add(m.vezes); add(Math.round(m.vezes)); }
    if (m.prazo && !m.prazo.erro) addPrazo(m.prazo);
  }
  if (calc.prazo) addPrazo(calc.prazo);
  for (const o of lista(fatos.outros_numeros)) add(num(o && o.valor));
  return set;
}

/** Datas dos fatos em ISO, mais os pares ano-mês e anos que elas cobrem. */
function datasPermitidas(fatos) {
  const iso = new Set(), anoMes = new Set(), anos = new Set();
  const add = (s) => {
    const d = br.lerData(s);
    if (!d) return;
    iso.add(br.iso(d)); anoMes.add(`${d.getFullYear()}-${d.getMonth()}`); anos.add(String(d.getFullYear()));
  };
  if (fatos.periodo) { add(fatos.periodo.inicio); add(fatos.periodo.fim); }
  for (const m of lista(fatos.metricas)) { if (!m || typeof m !== "object") continue; add(m.data); if (m.periodo) { add(m.periodo.inicio); add(m.periodo.fim); } }
  if (fatos.depoimento) add(fatos.depoimento.data);
  if (fatos.autorizacao) add(fatos.autorizacao.data);
  add(fatos.atualizado_em);
  for (const o of lista(fatos.outros_numeros)) add(o && o.data);
  return { iso, anoMes, anos };
}

/**
 * Varre o texto e devolve { numeros: [{texto, valor, linha}], datas: [{texto, iso|anoMes|ano, linha}] }.
 * Tira URL, bloco de código e comentário HTML antes: número de link não é afirmação.
 */
function extrair(md) {
  const limpo = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\[a confirmar[^\]]*\]/gi, " ")
    // hora do relógio ("às 13h", "13h30", "14:30") não é afirmação de resultado.
    // "7h por dia" fica: economia de hora é métrica e tem que estar nos fatos.
    .replace(/\bàs \d{1,2}h(?:\d{2})?\b|\b\d{1,2}h\d{2}\b|\b\d{1,2}:\d{2}\b/gi, " ");
  const numeros = [], datas = [];
  limpo.split("\n").forEach((linhaTexto, i) => {
    let l = linhaTexto;
    const linha = i + 1;
    // Cada guarda consome o que casou. O que a função devolve volta pra linha:
    // é assim que "meta de 3500" perde o falso mês e entrega o 3500 pra varredura.
    const guarda = (re, fn) => {
      const devolvido = [];
      l = l.replace(re, (...args) => { const v = fn(args); if (v) devolvido.push(String(v)); return " "; });
      if (devolvido.length) l += ` ${devolvido.join(" ")}`;
    };
    const mesDe = (mes) => MESES_SA.indexOf(br.semAcento(mes));
    // datas completas
    guarda(/\b(\d{4})-(\d{2})-(\d{2})\b/g, ([t]) => { datas.push({ texto: t, iso: br.lerData(t) ? br.iso(br.lerData(t)) : null, linha }); });
    guarda(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, ([t]) => { datas.push({ texto: t, iso: br.lerData(t) ? br.iso(br.lerData(t)) : null, linha }); });
    guarda(/\b(\d{1,2}) de ([a-zçá-ú]+) de (\d{4})\b/gi, ([t, d, mes, ano]) => {
      const m = mesDe(mes);
      datas.push({ texto: t, iso: m >= 0 ? br.iso(new Date(+ano, m, +d)) : null, linha });
    });
    guarda(/\b([a-zçá-ú]+) de (\d{4})\b/gi, ([t, mes, ano]) => {
      const m = mesDe(mes);
      if (m >= 0) { datas.push({ texto: t, anoMes: `${ano}-${m}`, linha }); return null; }
      return ano; // não era mês: o número volta pra varredura
    });
    guarda(/\b(\d{1,2})\/(\d{4})\b/g, ([t, mes, ano]) => { datas.push({ texto: t, anoMes: `${ano}-${+mes - 1}`, linha }); });
    // dinheiro, porcentagem e número solto (com milhar e decimal brasileiros)
    guarda(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d+)?|R\$\s?\d+(?:,\d+)?/g, ([t]) => { numeros.push({ texto: t, valor: num(t), linha }); });
    guarda(/\d{1,3}(?:\.\d{3})+(?:,\d+)?%?|\d+,\d+%?|\d+%|\d+(?:[×x]\b)?/g, ([t]) => {
      const raw = t.replace(/[×x]$/, "");
      const v = num(raw);
      if (!/[.,%×x]/.test(t) && /^\d{4}$/.test(raw) && v >= 1990 && v <= 2100) datas.push({ texto: t, ano: raw, linha });
      else numeros.push({ texto: t, valor: v, linha });
    });
  });
  return { numeros, datas };
}

function conferir(md, fatos, base) {
  const calc = calcular(fatos);
  const permitidos = numerosPermitidos(fatos, calc);
  const datas = datasPermitidas(fatos);
  const { numeros, datas: datasTexto } = extrair(md);
  const erros = [], avisos = [];

  for (const n of numeros) {
    const chave = String(arred(Math.abs(n.valor), 2));
    if (!permitidos.has(chave)) erros.push(`linha ${n.linha}: "${n.texto}" não está nos fatos (nem como antes, depois, diferença, %, prazo ou outros_numeros)`);
  }
  for (const d of datasTexto) {
    if (d.iso !== undefined) {
      if (!d.iso) erros.push(`linha ${d.linha}: "${d.texto}" é uma data que não existe`);
      else if (!datas.iso.has(d.iso)) erros.push(`linha ${d.linha}: data "${d.texto}" não está nos fatos`);
    } else if (d.anoMes) {
      if (!datas.anoMes.has(d.anoMes)) erros.push(`linha ${d.linha}: "${d.texto}" não bate com nenhum mês dos fatos`);
    } else if (d.ano) {
      if (!datas.anos.has(d.ano)) erros.push(`linha ${d.linha}: ano "${d.texto}" não aparece em nenhuma data dos fatos`);
    }
  }

  // status escrito no texto precisa ser o calculado
  const st = calc.status;
  const mStatus = md.match(/\*\*Status:\*\*\s*([^\n]+)/i) || md.match(/^Status:\s*([^\n]+)/im);
  if (!mStatus) erros.push('o texto não declara "**Status:** ..." (comprovado | relato sem prova, com ou sem "aguardando autorização")');
  else {
    const escrito = br.semAcento(mStatus[1]);
    if (st.provado && escrito.includes("relato sem prova")) erros.push(`status escrito "${mStatus[1].trim()}", mas os fatos têm métrica com fonte: é "comprovado"`);
    if (!st.provado && !escrito.includes("relato sem prova")) erros.push(`status escrito "${mStatus[1].trim()}", mas nenhuma métrica tem antes, depois, fonte e data: é "relato sem prova"`);
    if (!st.autorizado && !escrito.includes("aguardando autorizacao")) erros.push(`sem autorizacao.data nos fatos, o status precisa dizer "aguardando autorização"`);
    if (st.autorizado && escrito.includes("aguardando autorizacao")) avisos.push(`os fatos já têm autorização de ${fatos.autorizacao.data}; o status ainda diz "aguardando"`);
  }

  // nome do cliente e nome de quem deu o depoimento só entram com pode_citar_nome
  if (fatos.pode_citar_nome === false) {
    const corpo = br.semAcento(md);
    const proibidos = [];
    if (fatos.cliente) proibidos.push(String(fatos.cliente));
    if (fatos.depoimento && fatos.depoimento.quem) {
      // "Maria, dona" → só "Maria": cargo não identifica, nome próprio identifica
      for (const parte of String(fatos.depoimento.quem).split(/[,;/]|\s+/)) {
        const limpo = parte.trim();
        if (limpo.length < 3 || !/^[A-ZÀ-Ý]/.test(limpo)) continue;
        if (PALAVRA_DE_CARGO.includes(br.semAcento(limpo))) continue;
        proibidos.push(limpo);
      }
    }
    for (const nome of proibidos) {
      if (corpo.includes(br.semAcento(nome))) erros.push(`o cliente pediu anonimato (pode_citar_nome=false) e "${nome}" aparece no texto (inclusive no nome do arquivo citado: case anônimo usa o segmento no slug)`);
    }
  }

  // arquivo da autorização, quando informado, sem campo em branco
  if (fatos.autorizacao && fatos.autorizacao.arquivo) {
    const candidatos = path.isAbsolute(fatos.autorizacao.arquivo)
      ? [fatos.autorizacao.arquivo]
      : [path.join(process.cwd(), fatos.autorizacao.arquivo), path.join(base || process.cwd(), path.basename(fatos.autorizacao.arquivo))];
    const arq = candidatos.find((c) => fs.existsSync(c));
    if (!arq) avisos.push(`autorizacao.arquivo aponta pra ${fatos.autorizacao.arquivo}, que não existe`);
    else {
      const vazios = (fs.readFileSync(arq, "utf8").match(/\[[^\]\n]{2,60}\]/g) || []).filter((c) => !/^\[[xX ]\]$/.test(c));
      if (vazios.length) avisos.push(`o termo de autorização tem ${vazios.length} campo(s) em branco: ${vazios.slice(0, 4).join(", ")}${vazios.length > 4 ? "…" : ""}`);
    }
  }

  // sem prova, o texto não pode afirmar variação
  if (!st.provado) {
    const promessa = md.match(/\b(\d+(?:,\d+)?%|dobr(ou|amos)|tripl(icou|icamos)|\d+(?:,\d+)?\s?[×x]\b)/i);
    if (promessa) erros.push(`status "relato sem prova" e o texto afirma variação ("${promessa[0]}"): sem fonte, isso é alegação, não case`);
  }

  return { calc, erros, avisos, numeros: numeros.length, datas: datasTexto.length };
}

function imprimirConferencia(r, arquivo) {
  console.log(`\nConferindo ${arquivo}: ${r.numeros} números e ${r.datas} datas no texto\n`);
  for (const e of r.erros) console.log(`  ✖ ${e}`);
  for (const a of r.avisos) console.log(`  ! ${a}`);
  for (const a of r.calc.avisos) console.log(`  ! fatos: ${a}`);
  for (const p of r.calc.problemas) console.log(`  ✖ fatos: ${p}`);
  const total = r.erros.length + r.calc.problemas.length;
  if (!total) console.log(`  ✓ todo número e data do texto existe nos fatos · status: ${r.calc.status.texto}`);
  console.log(total ? `\n${total} problema(s). Corrigir o texto ou completar os fatos; nunca ajustar o número pra bater.\n` : "\nTudo certo.\n");
  return total === 0;
}

// ─────────────────────────── linha do catálogo ───────────────────────────

function linhaBiblioteca(fatos, calc, arquivoMd) {
  const m = calc.metricas.find((x) => x.comFonte) || calc.metricas[0];
  const quem = fatos.pode_citar_nome === false ? `${fatos.segmento || "cliente"} (anônimo)` : fatos.cliente || "?";
  const trava = fatos.trava ? `${String(fatos.trava).trim()} → ` : "";
  const resultado = m
    ? `${trava}${m.nome}: ${formatar(m.antes, m.unidade)} → ${formatar(m.depois, m.unidade)}${m.pct !== null ? ` (${m.direcao} ${Math.abs(m.pct).toLocaleString("pt-BR")}%)` : ""}`
    : `${trava}relato sem número`;
  const pode = fatos.pode_citar_nome === false ? "não (anônimo)" : calc.status.autorizado ? `sim (${fatos.autorizacao.data})` : "aguardando";
  return `| ${quem} | ${resultado} | ${pode} | ${arquivoMd} |`;
}

// ─────────────────────────── main ───────────────────────────

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const livres = args.filter((a) => !a.startsWith("--"));
  const cmd = livres[0];

  if (!cmd || cmd === "-h" || cmd === "--help") {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
    return;
  }

  if (cmd === "slug") {
    if (!livres[1]) morrer('uso: node scripts/case.js slug "<cliente>" ["<tema>"]');
    console.log(livres.slice(1).map(br.slug).filter(Boolean).join("-"));
    return;
  }

  if (cmd === "calcular" || cmd === "linha") {
    const arquivo = livres[1];
    if (!arquivo) morrer(`uso: node scripts/case.js ${cmd} <slug>.fatos.json`);
    const fatos = lerJson(arquivo);
    const r = calcular(fatos);
    if (cmd === "linha") {
      const md = arquivo.replace(/\.fatos\.json$/, ".md");
      const rel = path.relative(process.cwd(), md);
      console.log(linhaBiblioteca(fatos, r, !rel || rel.startsWith("..") ? md : rel));
      for (const p of r.problemas) console.error(`  ✖ fatos: ${p}`);
      if (r.problemas.length) process.exit(1);
      return;
    }
    if (json) console.log(JSON.stringify(r, null, 2)); else imprimirCalculo(r);
    if (r.problemas.length) process.exit(1);
    return;
  }

  if (cmd === "conferir") {
    const md = livres[1];
    if (!md) morrer("uso: node scripts/case.js conferir <slug>.md [<slug>.fatos.json]");
    if (!fs.existsSync(md)) morrer(`não achei ${md}`);
    const fj = livres[2] || md.replace(/\.md$/, ".fatos.json");
    if (!fs.existsSync(fj)) morrer(`não achei os fatos em ${fj}`, "o /case salva os fatos em <slug>.fatos.json ao lado do .md; passe o caminho como segundo argumento se estiver em outro lugar");
    const r = conferir(fs.readFileSync(md, "utf8"), lerJson(fj), path.dirname(path.resolve(fj)));
    if (json) { console.log(JSON.stringify({ erros: r.erros, avisos: r.avisos, status: r.calc.status }, null, 2)); process.exit(r.erros.length || r.calc.problemas.length ? 1 : 0); }
    process.exit(imprimirConferencia(r, md) ? 0 : 1);
  }

  // padrão: recebeu um .fatos.json → calcular e, se o .md existir, conferir
  if (cmd.endsWith(".json")) {
    const fatos = lerJson(cmd);
    const r = calcular(fatos);
    imprimirCalculo(r);
    const md = cmd.replace(/\.fatos\.json$/, ".md").replace(/\.json$/, ".md");
    let ok = !r.problemas.length;
    if (fs.existsSync(md) && md !== cmd) ok = imprimirConferencia(conferir(fs.readFileSync(md, "utf8"), fatos, path.dirname(path.resolve(cmd))), md) && ok;
    else console.log(`(sem ${path.basename(md)} ao lado: só calculei)\n`);
    process.exit(ok ? 0 : 1);
  }

  // padrão: recebeu o .md do case → confere contra os fatos ao lado
  if (cmd.endsWith(".md")) {
    if (!fs.existsSync(cmd)) morrer(`não achei ${cmd}`);
    const fj = cmd.replace(/\.md$/, ".fatos.json");
    if (!fs.existsSync(fj)) morrer(`não achei os fatos em ${fj}`, 'o /case salva os fatos em <slug>.fatos.json ao lado do .md; use "conferir <slug>.md <caminho dos fatos>" se estiverem em outro lugar');
    const r = conferir(fs.readFileSync(cmd, "utf8"), lerJson(fj), path.dirname(path.resolve(fj)));
    process.exit(imprimirConferencia(r, cmd) ? 0 : 1);
  }

  morrer(`não entendi "${cmd}"`, "comandos: calcular, conferir, linha, slug — ou um .fatos.json (calcula e confere) ou .md (confere) direto");
}

module.exports = { variacao, prazo, status, calcular, conferir, extrair, numerosPermitidos, datasPermitidas, linhaBiblioteca, formatar, lista };

if (require.main === module) main();
