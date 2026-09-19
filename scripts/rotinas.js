#!/usr/bin/env node
/**
 * Contex OS — rotinas.js
 * Lê o registro de rotinas (rotinas.md), diz o que está vencido, converte a
 * cadência escrita em português ("toda sexta 17h") em data e em cron, e anota
 * cada execução no histórico.
 *
 * Existe porque "está vencida?" é uma conta de calendário, e conta de
 * calendário feita de cabeça erra: a sexta cai no dia errado, o "dia 1" cai no
 * domingo, e "17h" vira 20h quando o agendamento pede o horário em UTC. Tudo
 * aqui é aritmética com Date; nada é estimado. É o que o /abrir roda pra montar
 * a linha "Pendente", e o que o /rotina roda antes de gravar uma rotina nova.
 *
 * Uso:
 *   node scripts/rotinas.js vencidas [rotinas.md]                      o que venceu, e a próxima de cada uma
 *   node scripts/rotinas.js listar [rotinas.md]                        as ativas, com modo e próxima ocorrência
 *   node scripts/rotinas.js proxima "toda sexta 17h" [--n 3]           datas, dia da semana e cron em UTC
 *   node scripts/rotinas.js eventos [rotinas.md] [--tarefas tarefas.md] o que as rotinas "por evento" devem a partir do tarefas.md
 *   node scripts/rotinas.js registrar "<rotina>" --resultado "útil: 3 itens" [--data DD/MM/AAAA] [--arquivo rotinas.md]
 *   node scripts/rotinas.js desligar "<rotina>" --motivo "3 segundas sem CSV" [--arquivo rotinas.md]
 *   node scripts/rotinas.js religar "<rotina>" [--arquivo rotinas.md]
 *
 * Cadências que ele entende (a hora é obrigatória, "9h", "17h30" ou "09:30"):
 *   todo dia 8h · todo dia útil 8h · toda sexta 17h · às sextas 17h · toda segunda e quinta 9h
 *   dia 1 de cada mês 9h · dia 5 e 20 de cada mês 9h · último dia do mês 18h
 *   primeiro dia útil do mês 9h · último dia útil do mês 18h · por evento: 7 dias depois da entrega
 * "Quinzenal" e "a cada 15 dias" não existem aqui de propósito: viram "dia 1 e 15 de cada mês".
 *
 * Saída de `vencidas`: tabela markdown com Rotina | Quando | Situação | Próxima,
 * e um aviso por rotina que somou 3 execuções seguidas sem resultado.
 * Saída de `proxima`: as próximas datas com dia da semana e a expressão cron em
 * UTC, pronta pra colar no agendamento do cliente de IA.
 * Saída de `eventos`: por rotina "por evento", os itens do tarefas.md que
 * dispararam (entrega, proposta enviada) e a data em que cada um vence.
 *
 * Node 18+, sem dependência. Usa o fuso da máquina (TZ) pra converter em UTC.
 */

const fs = require("fs");
const path = require("path");

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const COM_DATA = ["diario", "util", "semanal", "mensal", "util-mensal", "util-mensal-fim"];
const DIAS_LONGO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const NOMES_DIA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const LIMITE_VAZIO = 3;
const MAX_ATIVAS = 5; // regra do /rotina: acima disso a abertura da sessão vira ruído

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) o[k] = true;
      else { o[k] = v; i++; }
    } else o._.push(a);
  }
  return o;
}

/** tira acento e caixa, pra comparar nome de rotina e casar cadência */
function normaliza(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const dd = (n) => String(n).padStart(2, "0");
const fmtData = (d) => `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtHora = (d) => `${d.getHours()}h${d.getMinutes() ? dd(d.getMinutes()) : ""}`;
const fmtCurto = (d) => `${DIAS[d.getDay()]} ${dd(d.getDate())}/${dd(d.getMonth() + 1)} ${fmtHora(d)}`;

/** "12/09/2026" → Date local à meia-noite; null se não parsear */
function lerData(s) {
  const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  if (d.getDate() !== +m[1] || d.getMonth() !== +m[2] - 1) return null;
  return d;
}

// ─────────────────────────── CADÊNCIA ───────────────────────────

/**
 * "toda sexta 17h" → { tipo, dias, dia, hora, minuto, texto }
 * tipo: diario | util | semanal | mensal | util-mensal | evento
 */
function lerCadencia(texto) {
  const t = normaliza(texto);
  const cad = { texto: String(texto).trim(), hora: 9, minuto: 0, horaDeclarada: false };

  if (/^por evento|^quando |^depois de |^apos /.test(t) || /\bpor evento\b/.test(t)) {
    cad.tipo = "evento";
    // "7 dias depois da entrega" → quantos dias, e qual palavra procurar no tarefas.md
    const m = t.match(/(\d{1,3})\s*dias?\s*(?:depois|apos)\s*(?:d[aeo]s?\s*)?(.+)$/);
    if (m) {
      cad.diasDepois = +m[1];
      cad.gatilho = m[2].trim();
    }
    return cad;
  }

  // a hora é o ÚLTIMO número seguido de "h" ou ":" ("dia 1 de cada mes 9h" → 9)
  const horas = [...t.matchAll(/(?<![\d\/])(\d{1,2})\s*(?:h\s*(\d{2})?|:(\d{2}))(?!\d)/g)];
  if (horas.length) {
    const h = horas[horas.length - 1];
    cad.hora = +h[1];
    cad.minuto = +(h[2] || h[3] || 0);
    cad.horaDeclarada = true;
    if (cad.hora > 23 || cad.minuto > 59) return { ...cad, tipo: "invalida", erro: `hora "${h[0].trim()}" não existe` };
  }

  if (/primeiro dia util/.test(t)) { cad.tipo = "util-mensal"; return cad; }
  if (/ultimo dia util/.test(t)) { cad.tipo = "util-mensal-fim"; return cad; }
  if (/ultimo dia/.test(t)) { cad.tipo = "mensal"; cad.dia = -1; return cad; }

  // "dia 1", "dia 5 e 20", "dia 1, 10 e 20" (o número seguido de "h" ou ":" é hora, não dia)
  const mensal = t.match(/\bdia\s+((?:\d{1,2}\s*(?:,|e)\s*)*\d{1,2})\b(?!\s*(?:h|:)\s*\d?)/);
  if (mensal) {
    cad.tipo = "mensal";
    cad.diasMes = [...new Set(mensal[1].split(/\s*(?:,|e)\s*/).map(Number))].sort((a, b) => a - b);
    cad.dia = cad.diasMes[0];
    const ruim = cad.diasMes.find((d) => d < 1 || d > 31);
    if (ruim !== undefined) return { ...cad, tipo: "invalida", erro: `dia ${ruim} não existe` };
    return cad;
  }

  if (/quinzen|a cada 15 dias|a cada duas semanas|de 15 em 15/.test(t)) {
    return { ...cad, tipo: "invalida", erro: 'quinzenal não tem dia fixo; escreva "dia 1 e 15 de cada mês 9h"' };
  }

  if (/dia util|dias uteis|de segunda a sexta|segunda a sexta/.test(t)) { cad.tipo = "util"; return cad; }

  const dias = [...t.matchAll(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)s?\b/g)].map((m) => NOMES_DIA[m[1]]);
  if (dias.length) { cad.tipo = "semanal"; cad.dias = [...new Set(dias)].sort(); return cad; }

  if (/todo dia|todos os dias|diariamente|todo o dia/.test(t)) { cad.tipo = "diario"; return cad; }

  return { ...cad, tipo: "invalida", erro: "não reconheci a cadência" };
}

function ultimoDiaDoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

/** o dia (meia-noite local) casa com a cadência? */
function diaCasa(cad, d) {
  const dow = d.getDay();
  switch (cad.tipo) {
    case "diario": return true;
    case "util": return dow >= 1 && dow <= 5;
    case "semanal": return cad.dias.includes(dow);
    case "mensal": {
      const ultimo = ultimoDiaDoMes(d.getFullYear(), d.getMonth());
      if (cad.dia === -1) return d.getDate() === ultimo;
      // "dia 31" num mês de 30 cai no último dia; dois alvos que colidem contam uma vez
      return (cad.diasMes || [cad.dia]).some((x) => d.getDate() === Math.min(x, ultimo));
    }
    case "util-mensal": {
      if (dow === 0 || dow === 6) return false;
      // é o primeiro dia útil se nenhum dia anterior do mês for útil
      for (let i = 1; i < d.getDate(); i++) {
        const w = new Date(d.getFullYear(), d.getMonth(), i).getDay();
        if (w >= 1 && w <= 5) return false;
      }
      return true;
    }
    case "util-mensal-fim": {
      if (dow === 0 || dow === 6) return false;
      // é o último dia útil se nenhum dia posterior do mês for útil
      const ultimo = ultimoDiaDoMes(d.getFullYear(), d.getMonth());
      for (let i = d.getDate() + 1; i <= ultimo; i++) {
        const w = new Date(d.getFullYear(), d.getMonth(), i).getDay();
        if (w >= 1 && w <= 5) return false;
      }
      return true;
    }
    default: return false;
  }
}

function comHora(cad, dia) {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), cad.hora, cad.minuto, 0, 0);
}

/** última ocorrência <= agora (null se a cadência não tem data) */
function ultimaOcorrencia(cad, agora) {
  if (!cad || !COM_DATA.includes(cad.tipo)) return null;
  const cursor = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  for (let i = 0; i < 400; i++) {
    if (diaCasa(cad, cursor)) {
      const oc = comHora(cad, cursor);
      if (oc <= agora) return oc;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return null;
}

/** próximas N ocorrências > agora */
function proximasOcorrencias(cad, agora, n) {
  const out = [];
  if (!cad || !COM_DATA.includes(cad.tipo)) return out;
  const cursor = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  for (let i = 0; i < 400 && out.length < n; i++) {
    if (diaCasa(cad, cursor)) {
      const oc = comHora(cad, cursor);
      if (oc > agora) out.push(oc);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * lista de dias do mês (local) → campo dia-do-mês do cron, já deslocado pro UTC.
 * Dia 0 (véspera do dia 1) vira 28-31; dia 32 vira 1. Devolve null se algum dia
 * fixo sair do calendário sem ser fim de mês.
 */
function diasMesCron(dias, desloca) {
  const out = new Set();
  for (const d of dias) {
    const x = d + desloca;
    if (x >= 1 && x <= 31) out.add(x);
    else if (x < 1) [28, 29, 30, 31].forEach((k) => out.add(k));
    else out.add(1);
  }
  return [...out].sort((a, b) => a - b).join(",");
}

/** expressão cron em UTC (5 campos) a partir de uma ocorrência local de exemplo */
function cronUtc(cad, exemplo) {
  if (!exemplo) return null;
  const min = exemplo.getUTCMinutes();
  const hora = exemplo.getUTCHours();
  // o dia em UTC pode ser o anterior ou o seguinte ao dia local (ex.: 22h em São Paulo é 01h UTC do dia seguinte)
  const diaLocal = Date.UTC(exemplo.getFullYear(), exemplo.getMonth(), exemplo.getDate());
  const diaUtc = Date.UTC(exemplo.getUTCFullYear(), exemplo.getUTCMonth(), exemplo.getUTCDate());
  const desloca = Math.round((diaUtc - diaLocal) / 86400000);
  const shiftDow = (d) => (d + desloca + 7) % 7;
  const avisos = [];
  let expr;
  switch (cad.tipo) {
    case "diario": expr = `${min} ${hora} * * *`; break;
    case "util": {
      const dias = [1, 2, 3, 4, 5].map(shiftDow);
      expr = `${min} ${hora} * * ${desloca ? dias.join(",") : "1-5"}`;
      break;
    }
    case "semanal": expr = `${min} ${hora} * * ${cad.dias.map(shiftDow).join(",")}`; break;
    case "mensal": {
      if (cad.dia === -1) {
        expr = `${min} ${hora} ${diasMesCron([28, 29, 30, 31], desloca)} * *`;
        avisos.push("cron não sabe qual é o último dia do mês: agendado de 28 a 31, e a rotina precisa conferir se hoje é o último dia antes de fazer qualquer coisa");
      } else {
        const fora = cad.diasMes.filter((d) => d + desloca < 1 || d + desloca > 31);
        if (fora.length) {
          expr = null;
          avisos.push(`em UTC o dia ${fora.join(" e ")} cai fora do mês (vira dia ${fora.map((d) => d + desloca).join(" e ")}), e o cron não sabe montar isso: escolher outra hora (mais longe da meia-noite UTC) ou "último dia do mês"`);
        } else {
          expr = `${min} ${hora} ${diasMesCron(cad.diasMes, desloca)} * *`;
          const altos = cad.diasMes.filter((d) => d > 28);
          if (altos.length) avisos.push(`o cron só dispara nos meses que têm dia ${altos.join(" e ")}; nos outros a rotina não roda. Se a ideia é "fim do mês", a cadência certa é "último dia do mês"`);
        }
      }
      break;
    }
    case "util-mensal":
      expr = `${min} ${hora} ${diasMesCron([1, 2, 3], desloca)} * *`;
      avisos.push("cron não sabe qual é o primeiro dia útil: agendado do dia 1 ao 3, e a rotina precisa conferir se hoje é o primeiro dia útil antes de fazer qualquer coisa");
      break;
    case "util-mensal-fim":
      expr = `${min} ${hora} ${diasMesCron([26, 27, 28, 29, 30, 31], desloca)} * *`;
      avisos.push("cron não sabe qual é o último dia útil: agendado do dia 26 em diante, e a rotina precisa conferir se hoje é o último dia útil antes de fazer qualquer coisa");
      break;
    default: return null;
  }
  if (desloca && expr) avisos.push(`em UTC o horário cai ${desloca > 0 ? "no dia seguinte" : "no dia anterior"}: o dia da semana e o dia do mês já estão deslocados na expressão`);
  return { expr, avisos, utc: `${dd(hora)}:${dd(min)} UTC` };
}

// ─────────────────────────── REGISTRO ───────────────────────────

/** lê a tabela markdown de uma seção: cabeçalho + linhas, com índice de linha no arquivo */
function lerTabela(linhas, inicio, fim) {
  let cab = null;
  const rows = [];
  for (let i = inicio; i < fim; i++) {
    const l = linhas[i];
    if (!/^\s*\|/.test(l)) { if (cab && rows.length) break; continue; }
    const cels = l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (!cab) { cab = cels.map(normaliza); continue; }
    if (cels.every((c) => /^:?-+:?$/.test(c) || c === "")) continue;
    const row = { _linha: i };
    cab.forEach((c, j) => (row[c] = cels[j] || ""));
    rows.push(row);
  }
  return { cab, rows };
}

function secoes(linhas) {
  const idx = [];
  linhas.forEach((l, i) => { const m = l.match(/^##\s+(.+)/); if (m) idx.push({ nome: normaliza(m[1]), inicio: i }); });
  const out = {};
  idx.forEach((s, k) => { out[s.nome] = { inicio: s.inicio + 1, fim: k + 1 < idx.length ? idx[k + 1].inicio : linhas.length, titulo: s.inicio }; });
  return out;
}

function lerRegistro(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`, "O registro nasce na primeira rotina, pelo /rotina. Sem ele não há o que conferir.");
  const conteudo = fs.readFileSync(arquivo, "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const linhas = conteudo.split("\n");
  const sec = secoes(linhas);
  const ativas = sec["ativas"] ? lerTabela(linhas, sec["ativas"].inicio, sec["ativas"].fim) : { cab: null, rows: [] };
  const desligadas = sec["desligadas"] ? lerTabela(linhas, sec["desligadas"].inicio, sec["desligadas"].fim) : { cab: null, rows: [] };
  const historico = [];
  const h = Object.keys(sec).find((k) => k.startsWith("historico"));
  if (h) {
    for (let i = sec[h].inicio; i < sec[h].fim; i++) {
      const m = linhas[i].match(/^\s*-\s+(\d{1,2}\/\d{1,2}\/\d{4})[^—]*—\s*([^—]+?)\s*—\s*(.+)$/);
      if (m) historico.push({ _linha: i, data: m[1], rotina: m[2].trim(), resultado: m[3].trim() });
    }
  }
  return { linhas, sec, ativas, desligadas, historico, chaveHistorico: h };
}

/** quebra uma linha de tabela em células */
function celulas(linha) {
  return linha.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

/** a lista "## Como desligar" tem um item por rotina; devolve o índice da linha da rotina, ou -1 */
function linhaComoDesligar(reg, rotina) {
  const s = reg.sec["como desligar"];
  if (!s) return -1;
  const alvo = normaliza(rotina);
  for (let i = s.inicio; i < s.fim; i++) {
    const m = reg.linhas[i].match(/^\s*-\s+\*\*(.+?)\*\*/);
    if (m && normaliza(m[1]).replace(/:$/, "") === alvo) return i;
  }
  return -1;
}

/** índice logo depois da última linha de tabela de uma seção, ou -1 se a seção não tem tabela */
function fimDaTabela(linhas, s) {
  let ultima = -1;
  for (let i = s.inicio; i < s.fim; i++) if (/^\s*\|/.test(linhas[i])) ultima = i;
  return ultima < 0 ? -1 : ultima + 1;
}

/**
 * aplica inserções e remoções de linha num arquivo em ordem decrescente de índice,
 * pra que uma operação não desloque o índice das outras.
 * ops: [{ i, inserir: "linha" }] ou [{ i, remover: true }]
 */
function aplicar(linhas, ops) {
  ops.slice().sort((a, b) => b.i - a.i || (a.remover ? -1 : 1)).forEach((op) => {
    if (op.remover) linhas.splice(op.i, 1);
    else linhas.splice(op.i, 0, op.inserir);
  });
}

function atualizarCabecalho(linhas) {
  const hoje = fmtData(new Date());
  for (let i = 0; i < Math.min(linhas.length, 8); i++) linhas[i] = linhas[i].replace(/(Atualizado em )\d{1,2}\/\d{1,2}\/\d{4}/, `$1${hoje}`);
}

/** acrescenta uma linha no histórico (cria a seção se não existir), mantendo as últimas 30 */
function anotarHistorico(reg, linhas, data, rotina, texto) {
  const linhaHist = `- ${fmtData(data)} ${DIAS[data.getDay()]} — ${rotina} — ${texto}`;
  if (reg.chaveHistorico) {
    const s = reg.sec[reg.chaveHistorico];
    let ultimo = s.titulo;
    for (let i = s.inicio; i < s.fim; i++) if (/^\s*-\s+\d/.test(linhas[i])) ultimo = i;
    linhas.splice(ultimo + 1, 0, linhaHist);
    const itens = [];
    for (let i = s.inicio; i < s.fim + 1; i++) if (/^\s*-\s+\d{1,2}\/\d{1,2}\/\d{4}/.test(linhas[i] || "")) itens.push(i);
    if (itens.length > 30) for (const i of itens.slice(0, itens.length - 30).reverse()) linhas.splice(i, 1);
  } else {
    while (linhas.length && linhas[linhas.length - 1].trim() === "") linhas.pop();
    linhas.push("", "## Histórico (últimas 30 execuções)", "", linhaHist);
  }
}

function salvar(arquivo, linhas) {
  fs.writeFileSync(arquivo, linhas.join("\n").replace(/\n*$/, "\n"));
}

/** quantas execuções seguidas, da mais recente pra trás, vieram vazias */
function vaziasSeguidas(historico, rotina) {
  const alvo = normaliza(rotina);
  // ordena por data (o registro pode ter entrado atrasado, com --data), e conta da mais recente pra trás
  const minhas = historico
    .filter((x) => normaliza(x.rotina) === alvo)
    .map((x, i) => ({ ...x, i, t: (lerData(x.data) || new Date(0)).getTime() }))
    .sort((a, b) => a.t - b.t || a.i - b.i);
  let n = 0;
  for (let i = minhas.length - 1; i >= 0; i--) {
    if (/^vazi[oa]\b/.test(normaliza(minhas[i].resultado))) n++;
    else break;
  }
  return n;
}

// ─────────────────────────── COMANDOS ───────────────────────────

function cmdVencidas(arquivo, soListar) {
  const reg = lerRegistro(arquivo);
  const agora = new Date();
  if (!reg.ativas.rows.length) { console.log("Nenhuma rotina ativa em " + arquivo); return; }
  const faltam = ["rotina", "quando"].filter((c) => !reg.ativas.cab.includes(c));
  if (faltam.length) morrer(`a tabela "Ativas" não tem a(s) coluna(s): ${faltam.join(", ")}`, "O formato está no /rotina: Rotina | Quando | Executa | Entrega | Modo | Última execução | Resultado.");

  const colUltima = reg.ativas.cab.find((c) => c.startsWith("ultima"));
  let vencidas = 0;
  const saida = ["| Rotina | Quando | Situação | Próxima |", "|---|---|---|---|"];
  const avisos = [];

  for (const r of reg.ativas.rows) {
    const cad = lerCadencia(r.quando);
    const prox = proximasOcorrencias(cad, agora, 1)[0];
    let situacao;
    if (cad.tipo === "invalida") {
      situacao = `⚠️ cadência não reconhecida (${cad.erro})`;
    } else if (cad.tipo === "evento") {
      situacao = "por evento (sem data fixa)";
    } else if (soListar) {
      situacao = `ativa${r.modo ? ` · ${r.modo}` : ""}${r[colUltima] ? ` · rodou ${r[colUltima]}` : " · nunca rodou"}`;
    } else {
      const ultimaOc = ultimaOcorrencia(cad, agora);
      const exec = colUltima ? lerData(r[colUltima]) : null;
      if (!ultimaOc) situacao = "ainda não chegou a primeira";
      else if (!exec) { situacao = `🔴 vencida: nunca rodou (devia ter rodado ${fmtCurto(ultimaOc)})`; vencidas++; }
      else if (exec < new Date(ultimaOc.getFullYear(), ultimaOc.getMonth(), ultimaOc.getDate())) {
        const dias = Math.floor((agora - ultimaOc) / 86400000);
        situacao = `🔴 vencida desde ${fmtCurto(ultimaOc)}${dias ? ` (há ${dias} dia${dias > 1 ? "s" : ""})` : ""}`;
        vencidas++;
      } else situacao = `em dia (rodou ${fmtData(exec)})`;
      if (/agendad/.test(normaliza(r.modo)) && /^🔴/.test(situacao)) situacao += " · é agendada e não registrou: conferir se o agendamento existe no cliente de IA";
    }
    if (!cad.horaDeclarada && cad.tipo !== "evento" && cad.tipo !== "invalida") situacao += " · sem hora no registro, assumi 9h";
    saida.push(`| ${r.rotina} | ${r.quando} | ${situacao} | ${prox ? fmtCurto(prox) : "—"} |`);

    const n = vaziasSeguidas(reg.historico, r.rotina);
    if (n >= LIMITE_VAZIO) avisos.push(`"${r.rotina}" somou ${n} execuções seguidas sem resultado: desligar e avisar o usuário (regra do /rotina)`);
  }

  console.log(`Rotinas em ${arquivo} · hoje ${DIAS[agora.getDay()]} ${fmtData(agora)} ${fmtHora(agora)} · fuso ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`);
  console.log(saida.join("\n"));
  if (reg.ativas.rows.length > MAX_ATIVAS) avisos.push(`${reg.ativas.rows.length} rotinas ativas; a regra do /rotina é no máximo ${MAX_ATIVAS}. Perguntar ao usuário qual sai`);
  if (avisos.length) console.log("\n" + avisos.map((a) => `⚠️ ${a}`).join("\n"));
  if (!soListar) console.log(`\n${vencidas ? `${vencidas} vencida${vencidas > 1 ? "s" : ""}.` : "Nenhuma vencida."}`);
}

function cmdProxima(texto, n) {
  if (!texto) morrer("faltou a cadência", 'Ex.: node scripts/rotinas.js proxima "toda sexta 17h"');
  const cad = lerCadencia(texto);
  if (cad.tipo === "invalida") morrer(`não entendi "${texto}": ${cad.erro}`, "Formas aceitas: todo dia 8h · todo dia útil 8h · toda sexta 17h · toda segunda e quinta 9h · dia 1 de cada mês 9h · dia 5 e 20 de cada mês 9h · último dia do mês 18h · primeiro dia útil do mês 9h · último dia útil do mês 18h · por evento: 7 dias depois da entrega");
  if (cad.tipo === "evento") {
    console.log(`"${texto}" é por evento: não tem data fixa nem cron. Quem dispara é o item com data no tarefas.md; \`node scripts/rotinas.js eventos\` faz a conta.`);
    if (!cad.diasDepois) console.log(`  ⚠️ não achei "N dias depois de <o quê>" no texto; sem isso o \`eventos\` não sabe o que procurar. Ex.: "por evento: 7 dias depois da entrega"`);
    return;
  }
  if (!cad.horaDeclarada) morrer(`"${texto}" não tem hora`, 'A hora é obrigatória na rotina: "toda sexta 17h", "dia 1 de cada mês 9h". Sem hora o agendamento não sabe quando disparar e o /abrir não sabe se venceu.');
  const agora = new Date();
  const proximas = proximasOcorrencias(cad, agora, n);
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`Cadência: ${cad.texto} (${cad.tipo}${cad.horaDeclarada ? "" : ", sem hora: assumi 9h"}) · fuso ${fuso}\n`);
  console.log("Próximas:");
  proximas.forEach((p) => console.log(`  ${DIAS[p.getDay()]} ${fmtData(p)} ${fmtHora(p)}`));
  const cron = cronUtc(cad, proximas[0]);
  if (cron) {
    if (cron.expr) console.log(`\nCron em UTC: ${cron.expr}   (${fmtHora(proximas[0])} ${fuso} = ${cron.utc})`);
    else console.log(`\nCron em UTC: não dá pra montar com essa cadência e essa hora (${fmtHora(proximas[0])} ${fuso} = ${cron.utc})`);
    cron.avisos.forEach((a) => console.log(`  ⚠️ ${a}`));
    console.log("\nO agendamento no cliente de IA costuma ter intervalo mínimo (uma hora) e pedir o horário em UTC; conferir na hora de criar.");
  }
}

function cmdRegistrar(nome, opts) {
  if (!nome) morrer("faltou o nome da rotina", 'Ex.: node scripts/rotinas.js registrar "Revisão da semana" --resultado "útil: 3 itens pra semana que entra"');
  const resultado = typeof opts.resultado === "string" ? opts.resultado.trim() : "";
  if (!/^(util|vazio|vazia)\b/.test(normaliza(resultado))) morrer('o resultado precisa começar com "útil:" ou "vazio:"', 'Ex.: --resultado "útil: 3 itens pra semana que entra" ou --resultado "vazio: sem CSV novo em dados/"');
  const arquivo = opts.arquivo || "rotinas.md";
  const reg = lerRegistro(arquivo);
  const data = opts.data ? lerData(opts.data) : new Date();
  if (!data) morrer(`data "${opts.data}" inválida`, "Use DD/MM/AAAA.");
  if (data > new Date()) morrer(`a data ${opts.data} ainda não chegou`, "Só se registra execução que aconteceu. Sem --data, o script usa hoje.");

  const alvo = normaliza(nome);
  const row = reg.ativas.rows.find((r) => normaliza(r.rotina) === alvo);
  if (!row) {
    const desl = reg.desligadas.rows.find((r) => normaliza(r.rotina) === alvo);
    if (desl) morrer(`"${desl.rotina}" está desligada (${desl["desligada em"] || "sem data"}: ${desl.motivo || "sem motivo"})`, `Pra voltar a registrar, religar antes: node scripts/rotinas.js religar "${desl.rotina}"`);
    morrer(`não achei a rotina "${nome}" na tabela Ativas`, `Ativas: ${reg.ativas.rows.map((r) => r.rotina).join(" · ") || "(nenhuma)"}`);
  }

  // atualiza as colunas "Última execução" e "Resultado" da linha
  const linhas = reg.linhas;
  const cels = celulas(linhas[row._linha]);
  const iUlt = reg.ativas.cab.findIndex((c) => c.startsWith("ultima"));
  const iRes = reg.ativas.cab.findIndex((c) => c === "resultado");
  if (iUlt >= 0) cels[iUlt] = fmtData(data);
  if (iRes >= 0) cels[iRes] = /^util/.test(normaliza(resultado)) ? "útil" : "vazio";
  linhas[row._linha] = `| ${cels.join(" | ")} |`;

  anotarHistorico(reg, linhas, data, row.rotina, resultado);
  atualizarCabecalho(linhas);
  salvar(arquivo, linhas);
  console.log(`✔ ${row.rotina}: ${fmtData(data)} ${DIAS[data.getDay()]} — ${resultado}`);

  const n = vaziasSeguidas(lerRegistro(arquivo).historico, row.rotina);
  if (n >= LIMITE_VAZIO) console.log(`\n⚠️ ${n} execuções seguidas sem resultado. Regra do /rotina: mover "${row.rotina}" pra Desligadas e avisar o usuário.`);
  else if (n) console.log(`  (${n} de ${LIMITE_VAZIO} execuções vazias seguidas antes de desligar)`);
}

function cmdDesligar(nome, opts) {
  if (!nome) morrer("faltou o nome da rotina", 'Ex.: node scripts/rotinas.js desligar "Leitura de ads" --motivo "três segundas sem CSV em dados/"');
  const motivo = typeof opts.motivo === "string" ? opts.motivo.trim() : "";
  if (!motivo) morrer("faltou o motivo", 'Ex.: --motivo "a pedido" ou --motivo "três segundas sem CSV em dados/"');
  const arquivo = opts.arquivo || "rotinas.md";
  const reg = lerRegistro(arquivo);
  const alvo = normaliza(nome);
  const row = reg.ativas.rows.find((r) => normaliza(r.rotina) === alvo);
  if (!row) morrer(`não achei "${nome}" na tabela Ativas`, `Ativas: ${reg.ativas.rows.map((r) => r.rotina).join(" · ") || "(nenhuma)"}`);
  if (!reg.sec["desligadas"]) morrer('o registro não tem a seção "## Desligadas"', "O esqueleto está no /rotina: Ativas, Como desligar, Desligadas, Histórico.");

  const linhas = reg.linhas;
  const hoje = fmtData(new Date());
  const onde = fimDaTabela(linhas, reg.sec["desligadas"]);
  if (onde < 0) morrer('a seção "Desligadas" não tem tabela', "Cabeçalho esperado: | Rotina | Quando | Desligada em | Motivo |");
  const ops = [{ i: onde, inserir: `| ${row.rotina} | ${row.quando} | ${hoje} | ${motivo} |` }, { i: row._linha, remover: true }];
  const iComo = linhaComoDesligar(reg, row.rotina);
  if (iComo >= 0) ops.push({ i: iComo, remover: true });
  aplicar(linhas, ops);
  atualizarCabecalho(linhas);
  salvar(arquivo, linhas);
  const reg2 = lerRegistro(arquivo);
  anotarHistorico(reg2, reg2.linhas, new Date(), row.rotina, `desligada: ${motivo}`);
  salvar(arquivo, reg2.linhas);
  console.log(`✔ "${row.rotina}" desligada em ${hoje}: ${motivo}`);
  if (/agendad/.test(normaliza(row.modo))) console.log(`  ⚠️ era agendada: o agendamento no cliente de IA precisa ser desligado também, senão ele continua rodando sem registro.`);
  console.log(`  Pra voltar: node scripts/rotinas.js religar "${row.rotina}"`);
}

function cmdReligar(nome, opts) {
  if (!nome) morrer("faltou o nome da rotina", 'Ex.: node scripts/rotinas.js religar "Leitura de ads"');
  const arquivo = opts.arquivo || "rotinas.md";
  const reg = lerRegistro(arquivo);
  const alvo = normaliza(nome);
  if (reg.ativas.rows.find((r) => normaliza(r.rotina) === alvo)) morrer(`"${nome}" já está ativa`);
  const row = reg.desligadas.rows.find((r) => normaliza(r.rotina) === alvo);
  if (!row) morrer(`não achei "${nome}" na tabela Desligadas`, `Desligadas: ${reg.desligadas.rows.map((r) => r.rotina).join(" · ") || "(nenhuma)"}`);
  if (!reg.sec["ativas"] || !reg.ativas.cab) morrer('o registro não tem a tabela "## Ativas"');

  const cad = lerCadencia(row.quando);
  if (cad.tipo === "invalida") morrer(`a cadência "${row.quando}" não é reconhecida (${cad.erro})`, "Corrigir o campo Quando na tabela Desligadas antes de religar.");

  const linhas = reg.linhas;
  // monta a linha nova com as colunas de Ativas: Executa e Entrega ficam [a confirmar] porque a tabela Desligadas não guarda
  const cels = reg.ativas.cab.map((c) => {
    if (c === "rotina") return row.rotina;
    if (c === "quando") return row.quando;
    if (c === "modo") return "manual";
    if (c.startsWith("ultima") || c === "resultado") return "";
    return "[a confirmar]";
  });
  const onde = fimDaTabela(linhas, reg.sec["ativas"]);
  if (onde < 0) morrer('a tabela "Ativas" não tem linhas de tabela', "Cabeçalho esperado: | Rotina | Quando | Executa | Entrega | Modo | Última execução | Resultado |");
  const ops = [{ i: onde, inserir: `| ${cels.join(" | ")} |` }, { i: row._linha, remover: true }];
  // repõe o item em "Como desligar", pra seção não ficar sem a rotina que voltou
  const sComo = reg.sec["como desligar"];
  if (sComo && linhaComoDesligar(reg, row.rotina) < 0) {
    let ultimo = sComo.titulo;
    for (let i = sComo.inicio; i < sComo.fim; i++) if (/^\s*-\s+/.test(linhas[i])) ultimo = i;
    ops.push({ i: ultimo + 1, inserir: `- **${row.rotina}:** [a confirmar]` });
  }
  aplicar(linhas, ops);
  atualizarCabecalho(linhas);
  salvar(arquivo, linhas);
  // a linha "religada" no histórico zera a contagem de vazios seguidos: o que veio antes não conta mais
  const reg2 = lerRegistro(arquivo);
  anotarHistorico(reg2, reg2.linhas, new Date(), row.rotina, "religada: contagem de vazios zerada");
  salvar(arquivo, reg2.linhas);
  console.log(`✔ "${row.rotina}" voltou pra Ativas (${row.quando}), modo manual, execuções zeradas.`);
  console.log(`  Preencher Executa e Entrega (ficaram [a confirmar]) e a linha dela em "Como desligar". Se for voltar agendada, criar o agendamento de novo e trocar o Modo.`);
}

/** "12/05" ou "12/05/2026" numa linha do tarefas.md → Date; sem ano, assume o atual (ou o anterior se cair no futuro) */
function lerDataSolta(s, hoje) {
  const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (!m) return null;
  let ano = m[3] ? +m[3] : hoje.getFullYear();
  let d = new Date(ano, +m[2] - 1, +m[1]);
  if (d.getDate() !== +m[1]) return null;
  if (!m[3] && d > hoje) d = new Date(ano - 1, +m[2] - 1, +m[1]);
  return d;
}

/** palavra do gatilho ("entrega", "proposta enviada") → regex pra achar o item no tarefas.md */
function regexGatilho(gatilho) {
  const g = normaliza(gatilho);
  if (/entreg/.test(g)) return { re: /entreg/i, nome: "entrega" };
  if (/proposta|orcamento/.test(g)) return { re: /(proposta|orcamento|orçamento)[^\n]*enviad|enviad[^\n]*(proposta|orcamento|orçamento)/i, nome: "proposta enviada" };
  if (/fech/.test(g)) return { re: /fechou|fechad/i, nome: "fechamento" };
  const raiz = g.split(/\s+/)[0].slice(0, 5);
  return { re: new RegExp(raiz.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), nome: gatilho };
}

function cmdEventos(arquivo, opts) {
  const reg = lerRegistro(arquivo);
  const tarefas = path.resolve(opts.tarefas || "tarefas.md");
  const hoje = new Date();
  const hoje0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const porEvento = reg.ativas.rows.map((r) => ({ r, cad: lerCadencia(r.quando) })).filter((x) => x.cad.tipo === "evento");
  if (!porEvento.length) { console.log("Nenhuma rotina por evento em " + arquivo); return; }
  if (!fs.existsSync(tarefas)) morrer(`não achei ${tarefas}`, "Rotina por evento dispara a partir do tarefas.md (item com data e a palavra do gatilho). Sem ele não há evento.");
  const linhasT = fs.readFileSync(tarefas, "utf8").split("\n");

  console.log(`Eventos em ${tarefas} · hoje ${DIAS[hoje.getDay()]} ${fmtData(hoje)}\n`);
  const saida = ["| Rotina | Item do tarefas.md | Evento em | Vence | Situação |", "|---|---|---|---|---|"];
  let pendentes = 0;
  for (const { r, cad } of porEvento) {
    if (!cad.diasDepois) { saida.push(`| ${r.rotina} | — | — | — | ⚠️ o campo Quando não diz "N dias depois de <o quê>" |`); continue; }
    const g = regexGatilho(cad.gatilho);
    const hist = reg.historico.filter((h) => normaliza(h.rotina) === normaliza(r.rotina));
    let achou = 0;
    for (const l of linhasT) {
      if (!/^\s*-\s+\[[ xX]\]/.test(l) || !g.re.test(normaliza(l)) && !g.re.test(l)) continue;
      const data = lerDataSolta(l, hoje);
      if (!data) continue;
      achou++;
      const vence = new Date(data.getFullYear(), data.getMonth(), data.getDate() + cad.diasDepois);
      const item = l.replace(/^\s*-\s+\[[ xX]\]\s*/, "").replace(/\|/g, "/").slice(0, 70);
      // já registrado? procura no histórico da rotina uma palavra do item com 4+ letras (nome do cliente, em geral)
      // palavra comum de item de tarefa não identifica ninguém; o que identifica é o nome (Padaria, Acme)
      const COMUNS = /^(proposta|orcamento|enviad|entreg|fechad|fechou|para|vence|follow|site|logo|post|pagina|landing|cliente|projeto|servico|trabalho|feito|pronto|final|versao|dias?)$/;
      const palavras = normaliza(item).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !COMUNS.test(w));
      const registrado = hist.find((h) => palavras.some((w) => normaliza(h.resultado).includes(w)));
      const dias = Math.round((hoje0 - vence) / 86400000);
      let sit;
      if (registrado) sit = `✓ registrado em ${registrado.data}`;
      else if (dias > 30) sit = `passou (há ${dias} dias): janela fechada, não preparar mais`;
      else if (dias >= 0) { sit = `🔴 venceu ${dias === 0 ? "hoje" : `há ${dias} dia${dias > 1 ? "s" : ""}`}: preparar agora`; pendentes++; }
      else sit = `⏳ em ${-dias} dia${dias < -1 ? "s" : ""}`;
      saida.push(`| ${r.rotina} | ${item} | ${fmtData(data)} | ${DIAS[vence.getDay()]} ${fmtData(vence)} | ${sit} |`);
    }
    if (!achou) saida.push(`| ${r.rotina} | — | — | — | nenhum item com "${g.nome}" e data no tarefas.md |`);
  }
  console.log(saida.join("\n"));
  console.log(`\n${pendentes ? `${pendentes} pra preparar.` : "Nada pra preparar."} Rotina por evento não entra na regra dos três vazios.`);
}

// ─────────────────────────── MAIN ───────────────────────────

const o = args(process.argv.slice(2));
const cmd = o._[0];

if (!cmd || cmd === "ajuda" || cmd === "--help") {
  console.log(`Uso:
  node scripts/rotinas.js vencidas [rotinas.md]                        o que está vencido e a próxima de cada uma
  node scripts/rotinas.js listar [rotinas.md]                          as rotinas ativas, com modo e próxima ocorrência
  node scripts/rotinas.js proxima "toda sexta 17h" [--n 3]             datas, dia da semana e cron em UTC
  node scripts/rotinas.js eventos [rotinas.md] [--tarefas tarefas.md]  o que as rotinas "por evento" devem, a partir do tarefas.md
  node scripts/rotinas.js registrar "<rotina>" --resultado "útil: ..." | "vazio: ..." [--data DD/MM/AAAA] [--arquivo rotinas.md]
  node scripts/rotinas.js desligar "<rotina>" --motivo "..." [--arquivo rotinas.md]
  node scripts/rotinas.js religar "<rotina>" [--arquivo rotinas.md]`);
  process.exit(cmd ? 0 : 1);
}

if (cmd === "vencidas") cmdVencidas(path.resolve(o._[1] || "rotinas.md"), false);
else if (cmd === "listar") cmdVencidas(path.resolve(o._[1] || "rotinas.md"), true);
else if (cmd === "proxima") cmdProxima(o._.slice(1).join(" "), Math.max(1, parseInt(o.n, 10) || 3));
else if (cmd === "eventos") cmdEventos(path.resolve(o._[1] || "rotinas.md"), o);
else if (cmd === "registrar") cmdRegistrar(o._[1], { ...o, arquivo: o.arquivo ? path.resolve(o.arquivo) : undefined });
else if (cmd === "desligar") cmdDesligar(o._[1], { ...o, arquivo: o.arquivo ? path.resolve(o.arquivo) : undefined });
else if (cmd === "religar") cmdReligar(o._[1], { ...o, arquivo: o.arquivo ? path.resolve(o.arquivo) : undefined });
else morrer(`comando desconhecido: ${cmd}`, "Rode sem argumento pra ver o uso.");
