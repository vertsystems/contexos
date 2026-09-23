#!/usr/bin/env node
/**
 * Contex OS — capacidade.js
 * O teto físico da agenda: quanto cabe, quanto está ocupado, quanto a hora
 * vazia custa e a partir de que ocupação a próxima cadeira se paga.
 *
 * Existe porque o dono de salão, clínica ou estúdio vende hora e não sabe
 * quantas horas tem pra vender. "Tô lotado" convive com terça-feira de manhã
 * vazia, e as duas coisas são verdade em horários diferentes. A conta é
 * aritmética simples e ninguém faz: minutos abertos × unidades ÷ duração
 * média do serviço. O /capacidade usa a saída pra escrever
 * operacao/capacidade.md com o mapa, os três buracos e a conta da contratação.
 *
 * Uso:
 *   node scripts/capacidade.js <spec.capacidade.json> [--md saida.md]
 *   node scripts/capacidade.js <spec.capacidade.json> --agenda dados/agenda.csv
 *   node scripts/capacidade.js --exemplo [pasta]     escreve spec e agenda de exemplo
 *
 * Opções:
 *   --agenda <arquivo>  exportação da agenda (.ics, .csv ou .xlsx); vence o que
 *                       estiver em "ocupacao.arquivo" na spec
 *   --teto <pct>        teto praticável de ocupação (padrão: o da spec, ou 85)
 *   --md <arquivo>      grava o relatório em markdown
 *   --json              imprime tudo em JSON (pra outro script ler)
 *   --ajuda             mostra este cabeçalho
 *
 * A spec (o --exemplo escreve uma comentada):
 *   unidade          { "nome": "cadeira", "quantidade": 2 }
 *   funcionamento    { "seg": [["09:00","12:00"],["13:00","19:00"]], "dom": [] }
 *   servicos         [{ "nome", "duracaoMin", "preco", "custoVariavel", "mixPct" }]
 *   custoFixoMes     custo fixo do mês (vem do /caixa)
 *   retiradaMes      retirada do dono no mês (vem do /caixa)
 *   tetoPraticavelPct  ocupação que o negócio consegue sustentar (premissa, não lei)
 *   ocupacao         { "arquivo": "dados/agenda.csv" } ou { "porDia": { "seg": 12 } }
 *   contratar        { "descricao", "custoMes", "horasSemana", "demandaRecusadaMes" }
 *
 * Colunas que o script reconhece num CSV/XLSX de agenda (nome livre, sem acento):
 *   data | dia · hora | inicio · fim | hora fim · duracao | minutos ·
 *   servico | procedimento | tipo · status | situacao · unidade | profissional
 *
 * Node 18+, sem dependência. Usa scripts/br.js, scripts/gerar-planilha.js e
 * o léxico de status do scripts/no-show.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");
const { parseCsv, lerXlsx } = require("./gerar-planilha.js");
const { classificarStatus } = require("./no-show.js");

const SEMANAS_POR_MES = 365.25 / 12 / 7; // 4,348
const DIAS_POR_MES = 365.25 / 12; // 30,44
const CHAVES_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const NOME_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Caminho curto pra exibir: relativo quando fica menor, absoluto quando não. */
function curto(p) {
  const rel = path.relative(process.cwd(), p);
  return !rel || rel.startsWith("../..") || rel.length > p.length ? p : rel;
}

const h1 = (n) => (Math.round(n * 10) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const h2 = (n) => (Math.round(n * 100) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n0 = (n) => Math.round(n).toLocaleString("pt-BR");
const pct0 = (f) => (f * 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "%";
const pct1 = (f) => (f * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
/** "1 compromisso" / "3 compromissos" — plural que não sai errado no relatório. */
const plural = (n, um, muitos) => `${n0(n)} ${Math.round(n) === 1 ? um : muitos || um + "s"}`;
const ficou = (n) => (Math.round(n) === 1 ? "ficou" : "ficaram");
/** Bloco que dá a leitura do mapa de calor num relance. */
const bloco = (t) => (t < 0.25 ? "░" : t < 0.6 ? "▒" : t < 0.85 ? "▓" : "█");

// ─────────────────────────── horário ───────────────────────────

/**
 * "09:30" → 570 (minutos desde a meia-noite). Aceita "9h", "9h30", "09:30:00" e
 * a fração de dia que planilha usa pra guardar hora (0,375 = 09:00).
 */
function minutosDeHora(s) {
  if (typeof s === "number" && s > 0 && s < 1) return Math.round(s * 24 * 60);
  const t = String(s ?? "").trim().replace(/h/i, ":").replace(/:$/, ":00");
  if (/^0?[.,]\d+$/.test(t)) return Math.round(Number(t.replace(",", ".")) * 24 * 60);
  const m = t.match(/^(\d{1,2})(?::(\d{1,2}))?/);
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2] || 0);
  if (hh > 24 || mm > 59) return null;
  return hh * 60 + mm;
}

/** 570 → "09:30" */
function horaDeMinutos(n) {
  const hh = Math.floor(n / 60), mm = Math.round(n % 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Minutos em que [a,b) e [c,d) se sobrepõem. */
function intersecao(a, b, c, d) {
  return Math.max(0, Math.min(b, d) - Math.max(a, c));
}

/**
 * Normaliza o funcionamento pra um array indexado por getDay() (0 = domingo),
 * cada posição com as janelas abertas em minutos. Aceita "sab" e "sáb".
 */
function normalizarFuncionamento(func) {
  if (!func || typeof func !== "object") morrer('a spec precisa de "funcionamento"', 'exemplo: { "seg": [["09:00","18:00"]], "dom": [] }');
  const janelas = [[], [], [], [], [], [], []];
  for (const [chave, valor] of Object.entries(func)) {
    const k = br.semAcento(chave).slice(0, 3);
    const idx = CHAVES_DIA.indexOf(k);
    if (idx < 0) morrer(`não entendi o dia "${chave}" em funcionamento`, `use ${CHAVES_DIA.join(", ")} (ou o nome inteiro: "segunda", "sábado")`);
    for (const faixa of valor || []) {
      if (!Array.isArray(faixa) || faixa.length !== 2) morrer(`a janela de ${chave} precisa ser ["HH:MM","HH:MM"]`);
      const ini = minutosDeHora(faixa[0]), fim = minutosDeHora(faixa[1]);
      if (ini === null || fim === null) morrer(`hora inválida em ${chave}: ${JSON.stringify(faixa)}`);
      if (fim <= ini) morrer(`em ${chave}, ${faixa[1]} não é depois de ${faixa[0]}`, "vire a janela ou quebre em duas");
      janelas[idx].push([ini, fim]);
    }
    janelas[idx].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < janelas[idx].length; i++) {
      if (janelas[idx][i][0] < janelas[idx][i - 1][1]) morrer(`as janelas de ${chave} se sobrepõem`, "intervalo de almoço é uma janela que fecha e outra que abre");
    }
  }
  if (!janelas.some((d) => d.length)) morrer("nenhum dia com horário aberto em funcionamento");
  return janelas;
}

/** Média dos serviços ponderada pelo mix. Sem mix, peso igual pra todos. */
function medias(servicos) {
  if (!Array.isArray(servicos) || !servicos.length) morrer('a spec precisa de "servicos" com pelo menos um item', 'exemplo: [{ "nome": "Corte", "duracaoMin": 45, "preco": "60,00" }]');
  let pesoTotal = 0, dur = 0, preco = 0, cv = 0;
  const lista = [];
  for (const s of servicos) {
    const d = br.numero(s.duracaoMin);
    if (!(d > 0)) morrer(`o serviço "${s.nome || "(sem nome)"}" precisa de duracaoMin maior que zero`);
    const p = s.preco === undefined ? NaN : br.numero(s.preco);
    if (!(p >= 0)) morrer(`o serviço "${s.nome || "(sem nome)"}" precisa de preco`);
    const c = s.custoVariavel === undefined ? 0 : br.numero(s.custoVariavel);
    if (!(c >= 0)) morrer(`custoVariavel inválido em "${s.nome}"`);
    if (c > p) morrer(`o custo variável de "${s.nome}" é maior que o preço`, "confira os dois valores: a margem ficaria negativa");
    const w = s.mixPct === undefined ? 1 : br.numero(s.mixPct);
    if (!(w >= 0)) morrer(`mixPct inválido em "${s.nome}"`);
    pesoTotal += w; dur += d * w; preco += p * w; cv += c * w;
    lista.push({ nome: s.nome || "(sem nome)", duracaoMin: d, preco: p, custoVariavel: c, mixPct: w });
  }
  if (!(pesoTotal > 0)) morrer("a soma de mixPct deu zero", "deixe mixPct de fora pra dar peso igual a todos");
  return {
    servicos: lista,
    pesoTotal,
    duracaoMedia: dur / pesoTotal,
    precoMedio: br.centavos(preco / pesoTotal),
    custoVariavelMedio: br.centavos(cv / pesoTotal),
  };
}

// ─────────────────────────── leitura da agenda ───────────────────────────

function letraCol(n) { let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

function serialParaData(n) {
  const ms = Math.round((n - 25569) * 86400000);
  const d = new Date(ms);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function lerTabela(arquivo) {
  if (/\.xlsx$/i.test(arquivo)) {
    const { abas } = lerXlsx(arquivo);
    const aba = abas[0];
    if (!aba) morrer("a planilha não tem aba");
    const grade = [];
    for (let l = 1; l <= aba.maxLinha; l++) {
      const linha = [];
      for (let c = 1; c <= aba.maxCol; c++) {
        const cel = aba.celulas.get(letraCol(c) + l);
        if (!cel) { linha.push(""); continue; }
        if (cel.tipo === "data" && typeof cel.v === "number") linha.push(br.fmt(serialParaData(cel.v)));
        else linha.push(cel.v === null || cel.v === undefined ? "" : cel.v);
      }
      if (linha.some((x) => String(x).trim() !== "")) grade.push(linha);
    }
    return { cabecalho: grade[0] || [], linhas: grade.slice(1) };
  }
  const txt = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  const { linhas } = parseCsv(txt);
  return { cabecalho: linhas[0] || [], linhas: linhas.slice(1) };
}

const COLUNAS = {
  data: ["data", "dia", "data do horario", "data do atendimento", "date", "start date"],
  hora: ["hora", "horario", "inicio", "hora inicio", "hora de inicio", "time", "start time"],
  fim: ["fim", "hora fim", "hora de fim", "termino", "end time", "final"],
  duracao: ["duracao", "duracao min", "minutos", "tempo", "duration"],
  servico: ["servico", "procedimento", "tipo", "tipo de atendimento", "titulo", "subject"],
  status: ["status", "situacao", "compareceu", "presenca", "comparecimento"],
  unidade: ["unidade", "profissional", "cadeira", "mesa", "sala", "recurso", "atendente"],
};

function mapearColunas(cabecalho) {
  const norm = cabecalho.map((c) => br.semAcento(String(c)).trim().replace(/\s+/g, " "));
  const mapa = {};
  for (const [chave, nomes] of Object.entries(COLUNAS)) {
    let i = norm.findIndex((c) => nomes.includes(c));
    if (i < 0) i = norm.findIndex((c) => c && nomes.some((n) => c.startsWith(n)));
    if (i >= 0) mapa[chave] = i;
  }
  return mapa;
}

/** Dobra de linha do iCalendar: linha que começa com espaço continua a de cima. */
function desdobrar(txt) {
  return txt.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

/** Lê os VEVENT de um .ics. Devolve { eventos, ignorados }. */
function lerIcs(arquivo) {
  const linhas = desdobrar(fs.readFileSync(arquivo, "utf8")).split("\n");
  const eventos = [];
  const ignorados = { cancelados: 0, diaInteiro: 0, semFim: 0 };
  let atual = null;
  for (const linha of linhas) {
    if (/^BEGIN:VEVENT/i.test(linha)) { atual = {}; continue; }
    if (/^END:VEVENT/i.test(linha)) {
      if (atual) {
        if (atual.cancelado) ignorados.cancelados++;
        else if (atual.diaInteiro) ignorados.diaInteiro++;
        else if (!atual.inicio || !atual.fim) ignorados.semFim++;
        else eventos.push({ data: atual.inicio.data, inicioMin: atual.inicio.min, fimMin: atual.fim.min, servico: atual.servico || "", unidade: "" });
      }
      atual = null;
      continue;
    }
    if (!atual) continue;
    const dp = linha.indexOf(":");
    if (dp < 0) continue;
    const nome = linha.slice(0, dp);
    const valor = linha.slice(dp + 1).trim();
    const campo = nome.split(";")[0].toUpperCase();
    if (campo === "STATUS" && /CANCELLED/i.test(valor)) atual.cancelado = true;
    else if (campo === "SUMMARY") atual.servico = valor.replace(/\\,/g, ",").replace(/\\n/gi, " ").trim();
    else if (campo === "DTSTART" || campo === "DTEND") {
      const m = valor.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
      if (!m) continue;
      if (!m[4]) { atual.diaInteiro = true; continue; }
      let ano = Number(m[1]), mes = Number(m[2]) - 1, dia = Number(m[3]), hh = Number(m[4]), mi = Number(m[5]);
      if (m[7]) { // UTC: converter pro fuso da máquina
        const d = new Date(Date.UTC(ano, mes, dia, hh, mi));
        ano = d.getFullYear(); mes = d.getMonth(); dia = d.getDate(); hh = d.getHours(); mi = d.getMinutes();
      }
      const alvo = { data: new Date(ano, mes, dia), min: hh * 60 + mi };
      if (campo === "DTSTART") atual.inicio = alvo;
      else {
        // evento que atravessa a meia-noite: fecha no fim do dia de início
        if (atual.inicio && alvo.data.getTime() !== atual.inicio.data.getTime()) alvo.min = 24 * 60;
        atual.fim = alvo;
      }
    }
  }
  return { eventos, ignorados };
}

/** Lê CSV ou XLSX de agenda. duracaoPadrao entra quando não há fim nem duração. */
function lerCsvAgenda(arquivo, duracaoPadrao, duracaoPorServico) {
  const { cabecalho, linhas } = lerTabela(arquivo);
  if (!linhas.length) morrer(`${arquivo} tem cabeçalho e nenhuma linha`);
  const col = mapearColunas(cabecalho);
  if (col.data === undefined) morrer(`não achei coluna de data em ${arquivo}`, `o cabeçalho lido foi: ${cabecalho.join(" | ")}`);
  if (col.hora === undefined) morrer(`não achei coluna de hora em ${arquivo}`, `o cabeçalho lido foi: ${cabecalho.join(" | ")}`);
  const eventos = [];
  const ignorados = { cancelados: 0, semData: 0, semFim: 0 };
  const statusDesconhecidos = new Set();
  for (const linha of linhas) {
    const data = br.lerData(linha[col.data]);
    const inicioMin = minutosDeHora(linha[col.hora]);
    if (!data || inicioMin === null) { ignorados.semData++; continue; }
    if (col.status !== undefined) {
      const cls = classificarStatus(linha[col.status]);
      if (cls === "cancelou" || cls === "cancelou_tarde") { ignorados.cancelados++; continue; }
      if (cls === "desconhecido" && String(linha[col.status]).trim()) statusDesconhecidos.add(String(linha[col.status]).trim());
    }
    const servico = col.servico !== undefined ? String(linha[col.servico] || "").trim() : "";
    let fimMin = null;
    if (col.fim !== undefined) fimMin = minutosDeHora(linha[col.fim]);
    if (fimMin === null && col.duracao !== undefined) {
      const d = br.numero(linha[col.duracao]);
      if (d > 0) fimMin = inicioMin + d;
    }
    if (fimMin === null) {
      const chave = br.semAcento(servico);
      const d = duracaoPorServico.get(chave) || duracaoPadrao;
      fimMin = inicioMin + d;
    }
    if (fimMin <= inicioMin) { ignorados.semFim++; continue; }
    eventos.push({ data, inicioMin, fimMin: Math.min(fimMin, 24 * 60), servico, unidade: col.unidade !== undefined ? String(linha[col.unidade] || "").trim() : "" });
  }
  return { eventos, ignorados, statusDesconhecidos: [...statusDesconhecidos] };
}

function lerAgenda(arquivo, med) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`, "exporte a agenda (ICS, CSV ou XLSX) pra dados/ e passe o caminho, ou preencha ocupacao.porDia na spec");
  const porServico = new Map(med.servicos.map((s) => [br.semAcento(s.nome), s.duracaoMin]));
  if (/\.ics$/i.test(arquivo)) return { ...lerIcs(arquivo), statusDesconhecidos: [] };
  return lerCsvAgenda(arquivo, med.duracaoMedia, porServico);
}

// ─────────────────────────── a conta ───────────────────────────

/** Quantas vezes cada dia da semana cai entre duas datas, inclusive as pontas. */
function ocorrenciasPorDia(inicio, fim) {
  const cont = [0, 0, 0, 0, 0, 0, 0];
  for (let d = new Date(inicio); d <= fim; d = br.mais(d, 1)) cont[d.getDay()]++;
  return cont;
}

/** Faixas de uma hora cheia que a operação toca em algum dia. */
function faixasDeHora(janelas) {
  const horas = new Set();
  for (const dia of janelas) for (const [ini, fim] of dia) {
    for (let h = Math.floor(ini / 60); h < Math.ceil(fim / 60); h++) horas.add(h);
  }
  return [...horas].sort((a, b) => a - b);
}

/**
 * O cálculo inteiro. Devolve capacidade, ocupação, hora ociosa, receita de teto,
 * a conta da contratação e a grade por dia e hora quando há agenda.
 */
function calcular(spec, entrada = {}) {
  const janelas = normalizarFuncionamento(spec.funcionamento);
  const med = medias(spec.servicos);
  const unidades = br.numero(spec.unidade?.quantidade ?? 1);
  if (!(unidades >= 1)) morrer("unidade.quantidade precisa ser 1 ou mais");
  const nomeUnidade = spec.unidade?.nome || "posto";
  const teto = entrada.tetoPct !== undefined ? entrada.tetoPct : (spec.tetoPraticavelPct !== undefined ? br.numero(spec.tetoPraticavelPct) : 85);
  if (!(teto > 0 && teto <= 100)) morrer(`o teto praticável é uma porcentagem entre 1 e 100, recebi "${teto}"`, "vem de tetoPraticavelPct na spec ou de --teto na linha de comando");
  const custoFixoMes = spec.custoFixoMes === undefined ? null : br.numero(spec.custoFixoMes);
  const retiradaMes = spec.retiradaMes === undefined ? 0 : br.numero(spec.retiradaMes);
  if (custoFixoMes !== null && !(custoFixoMes >= 0)) morrer("custoFixoMes inválido");
  if (!(retiradaMes >= 0)) morrer("retiradaMes inválido");

  // capacidade
  const minutosAbertosDia = janelas.map((d) => d.reduce((a, [i, f]) => a + (f - i), 0));
  const capMinDia = minutosAbertosDia.map((m) => m * unidades);
  const capMinSemana = capMinDia.reduce((a, b) => a + b, 0);
  const capMinMes = capMinSemana * SEMANAS_POR_MES;
  const horasAbertasSemana = capMinSemana / 60;
  const horasAbertasMes = capMinMes / 60;
  const slotsSemana = capMinSemana / med.duracaoMedia;
  const slotsMes = capMinMes / med.duracaoMedia;

  const margemUnit = br.centavos(med.precoMedio - med.custoVariavelMedio);
  const horasPorAtendimento = med.duracaoMedia / 60;
  const receitaPorHora = br.centavos(med.precoMedio / horasPorAtendimento);
  const margemPorHora = br.centavos(margemUnit / horasPorAtendimento);
  const receitaTetoMes = br.centavos(slotsMes * med.precoMedio);
  const receitaTetoPratico = br.centavos(receitaTetoMes * teto / 100);

  // ocupação
  let ocup = null;
  if (entrada.eventos && entrada.eventos.length) {
    const datas = entrada.eventos.map((e) => e.data.getTime());
    const inicio = new Date(Math.min(...datas)), fim = new Date(Math.max(...datas));
    const dias = br.diasEntre(inicio, fim) + 1;
    const ocorr = ocorrenciasPorDia(inicio, fim);
    const capPeriodoDia = capMinDia.map((m, i) => m * ocorr[i]);
    const capPeriodo = capPeriodoDia.reduce((a, b) => a + b, 0);
    if (!(capPeriodo > 0)) morrer("o período da agenda não tem nenhum dia aberto no funcionamento", "confira as chaves de funcionamento e as datas da exportação");

    const horas = faixasDeHora(janelas);
    const grade = janelas.map((dia, i) => {
      const celulas = new Map();
      for (const h of horas) {
        const capHora = dia.reduce((a, [ini, f]) => a + intersecao(ini, f, h * 60, h * 60 + 60), 0) * unidades * ocorr[i];
        celulas.set(h, { capMin: capHora, ocupMin: 0 });
      }
      return celulas;
    });

    const ocupDia = [0, 0, 0, 0, 0, 0, 0];
    let ocupMin = 0, foraDoHorario = 0;
    for (const e of entrada.eventos) {
      const d = e.data.getDay();
      const abertas = janelas[d];
      let dentro = 0;
      for (const [ini, f] of abertas) dentro += intersecao(e.inicioMin, e.fimMin, ini, f);
      const cheio = e.fimMin - e.inicioMin;
      if (dentro < cheio) foraDoHorario += cheio - dentro;
      ocupDia[d] += dentro;
      ocupMin += dentro;
      for (const h of horas) {
        let m = 0;
        for (const [ini, f] of abertas) m += intersecao(Math.max(e.inicioMin, ini), Math.min(e.fimMin, f), h * 60, h * 60 + 60);
        const cel = grade[d].get(h);
        if (cel && m > 0) cel.ocupMin += m;
      }
    }

    // Cada dia da semana se normaliza pelas vezes que ELE caiu no período. Dividir
    // tudo por "dias ÷ 7" erra quando o período não fecha em semanas inteiras, e
    // aí o total da tabela por dia não bate com a ocupação declarada no texto.
    const ocupDiaSemana = ocupDia.map((m, i) => (ocorr[i] ? m / ocorr[i] : 0));
    const ocupMinSemana = ocupDiaSemana.reduce((a, b) => a + b, 0);
    const eventosDia = [0, 0, 0, 0, 0, 0, 0];
    for (const e of entrada.eventos) eventosDia[e.data.getDay()]++;
    ocup = {
      fonte: "agenda", arquivo: entrada.arquivo, inicio, fim, dias, eventos: entrada.eventos.length,
      horas, grade, ocorr, capPeriodo, capPeriodoDia, ocupMin, foraDoHorario,
      taxa: ocupMinSemana / capMinSemana,
      ocupMinSemana,
      ocupDiaSemana,
      atendimentosSemana: eventosDia.reduce((a, n, i) => a + (ocorr[i] ? n / ocorr[i] : 0), 0),
      ignorados: entrada.ignorados || {},
      statusDesconhecidos: entrada.statusDesconhecidos || [],
    };
  } else if (spec.ocupacao && spec.ocupacao.porDia) {
    const ocupDia = [0, 0, 0, 0, 0, 0, 0];
    let atendimentos = 0;
    for (const [chave, valor] of Object.entries(spec.ocupacao.porDia)) {
      const idx = CHAVES_DIA.indexOf(br.semAcento(chave).slice(0, 3));
      if (idx < 0) morrer(`não entendi o dia "${chave}" em ocupacao.porDia`);
      const n = br.numero(valor);
      if (!(n >= 0)) morrer(`ocupacao.porDia["${chave}"] precisa ser um número de atendimentos`);
      ocupDia[idx] = n * med.duracaoMedia;
      atendimentos += n;
    }
    const ocupMinSemana = ocupDia.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 7; i++) {
      if (ocupDia[i] > capMinDia[i]) morrer(`${NOME_DIA[i]}: ${n0(ocupDia[i] / med.duracaoMedia)} atendimentos não cabem em ${h1(capMinDia[i] / 60)} horas-${nomeUnidade} abertas`, "confira o funcionamento, a quantidade de unidades e a duração média");
    }
    ocup = {
      fonte: "porDia", taxa: ocupMinSemana / capMinSemana, ocupMinSemana,
      ocupDiaSemana: ocupDia, atendimentosSemana: atendimentos, ignorados: {}, statusDesconhecidos: [],
    };
  }

  const r = {
    nomeUnidade, unidades, teto, janelas, minutosAbertosDia, capMinDia, capMinSemana, capMinMes,
    horasAbertasSemana, horasAbertasMes, slotsSemana, slotsMes,
    duracaoMedia: med.duracaoMedia, precoMedio: med.precoMedio, custoVariavelMedio: med.custoVariavelMedio,
    servicos: med.servicos, margemUnit, receitaPorHora, margemPorHora, receitaTetoMes, receitaTetoPratico,
    custoFixoMes, retiradaMes, ocup, buracos: [], contratar: null,
  };

  if (custoFixoMes !== null) {
    // Custo da hora aberta só depende da estrutura e do horário: sai mesmo sem
    // nenhuma medição de ocupação, e já é o piso de preço por hora.
    const estrutura = custoFixoMes + retiradaMes;
    r.custoEstruturaMes = br.centavos(estrutura);
    r.custoHoraAberta = br.centavos(estrutura / (capMinMes / 60));
  }

  if (ocup) {
    const ocupMinMes = ocup.ocupMinSemana * SEMANAS_POR_MES;
    const ociosoMinMes = capMinMes - ocupMinMes;
    r.horasOcupadasSemana = ocup.ocupMinSemana / 60;
    r.horasOcupadasMes = ocupMinMes / 60;
    r.horasOciosasSemana = (capMinSemana - ocup.ocupMinSemana) / 60;
    r.horasOciosasMes = ociosoMinMes / 60;
    r.atendimentosMes = ocup.atendimentosSemana * SEMANAS_POR_MES;
    r.receitaRealizadaMes = br.centavos(r.atendimentosMes * med.precoMedio);
    r.folgaAteTetoMinMes = Math.max(0, capMinMes * teto / 100 - ocupMinMes);
    r.folgaAteTetoAtendimentos = r.folgaAteTetoMinMes / med.duracaoMedia;
    r.receitaFolgaMes = br.centavos(r.folgaAteTetoAtendimentos * med.precoMedio);
    r.margemFolgaMes = br.centavos(r.folgaAteTetoAtendimentos * margemUnit);
    if (custoFixoMes !== null) {
      r.custoHoraEntregue = r.horasOcupadasMes > 0 ? br.centavos(r.custoEstruturaMes / r.horasOcupadasMes) : null;
      r.custoOciosidadeMes = br.centavos((ociosoMinMes / 60) * r.custoHoraAberta);
    }
    r.buracos = ocup.grade ? acharBuracos(r, ocup) : acharBuracosPorDia(r, ocup);
  }

  if (spec.contratar) r.contratar = contaContratar(spec.contratar, r);
  return r;
}

const ACOES = ["bloqueio", "encaixe", "promoção de horário"];

/**
 * Três buracos com três consertos diferentes valem mais que os três maiores, que
 * quase sempre são a mesma borda de dia repetida em três dias. Pega o maior de
 * cada ação e completa por tamanho quando falta ação.
 */
function diversificar(celulas, n = 3) {
  const escolhidos = [];
  for (const acao of ACOES) {
    const c = celulas.find((x) => x.acao === acao);
    if (c) escolhidos.push(c);
  }
  for (const c of celulas) {
    if (escolhidos.length >= n) break;
    if (!escolhidos.includes(c)) escolhidos.push(c);
  }
  escolhidos.sort((a, b) => b.ociosasSemana - a.ociosasSemana || a.taxa - b.taxa);
  return escolhidos.slice(0, n);
}

/**
 * Os buracos por dia e hora, cada um com a ação que cabe: bloqueio na borda
 * quase vazia, encaixe quando o mesmo dia enche em outra hora, promoção no
 * resto. A regra é grosseira de propósito — quem decide é o dono.
 */
function acharBuracos(r, ocup) {
  const celulas = [];
  const picoDoDia = [];
  for (let d = 0; d < 7; d++) {
    let pico = 0;
    for (const [, c] of ocup.grade[d]) if (c.capMin > 0) pico = Math.max(pico, c.ocupMin / c.capMin);
    picoDoDia[d] = pico;
  }
  for (let d = 0; d < 7; d++) {
    const abertas = [...ocup.grade[d].entries()].filter(([, c]) => c.capMin > 0).map(([h]) => h);
    if (!abertas.length) continue;
    const primeira = Math.min(...abertas), ultima = Math.max(...abertas);
    for (const [h, c] of ocup.grade[d]) {
      if (c.capMin <= 0) continue;
      const taxa = c.ocupMin / c.capMin;
      const ociosasSemana = ocup.ocorr[d] ? ((c.capMin - c.ocupMin) / 60) / ocup.ocorr[d] : 0;
      const borda = h === primeira || h === ultima;
      // Encaixe é a ação quando o MESMO dia enche em outra hora: aí o conserto é
      // mover gente de lugar, não trazer gente nova. Comparar com o pico do dia
      // acha isso; um corte fixo em 90% quase nunca dispara na vida real.
      let acao;
      if (taxa < 0.2 && borda) acao = "bloqueio";
      else if (picoDoDia[d] >= 0.65 && picoDoDia[d] >= taxa * 2) acao = "encaixe";
      else acao = "promoção de horário";
      celulas.push({ dia: d, hora: h, taxa, ociosasSemana, acao, pico: picoDoDia[d], borda });
    }
  }
  celulas.sort((a, b) => b.ociosasSemana - a.ociosasSemana || a.taxa - b.taxa);
  return diversificar(celulas);
}

/**
 * Sem exportação não existe mapa por hora, e o buraco que dá pra apontar é o do
 * dia inteiro. Encaixe não entra aqui: ele depende de ver o pico dentro do dia.
 */
function acharBuracosPorDia(r, ocup) {
  const celulas = [];
  for (let d = 0; d < 7; d++) {
    const cap = r.capMinDia[d];
    if (cap <= 0) continue;
    const usado = ocup.ocupDiaSemana[d] || 0;
    const taxa = usado / cap;
    celulas.push({
      dia: d, hora: null, taxa, ociosasSemana: (cap - usado) / 60,
      acao: taxa < 0.2 ? "bloqueio" : "promoção de horário", pico: taxa, borda: false,
    });
  }
  celulas.sort((a, b) => b.ociosasSemana - a.ociosasSemana || a.taxa - b.taxa);
  return diversificar(celulas);
}

/** A partir de que ocupação a unidade nova se paga, e se ela já faz sentido hoje. */
function contaContratar(cfg, r) {
  const custoMes = br.numero(cfg.custoMes);
  if (!(custoMes > 0)) morrer("contratar.custoMes precisa ser o custo mensal total da unidade nova, em reais");
  const horasSemana = cfg.horasSemana === undefined ? r.horasAbertasSemana / r.unidades : br.numero(cfg.horasSemana);
  if (!(horasSemana > 0)) morrer("contratar.horasSemana precisa ser maior que zero");
  if (!(r.margemUnit > 0)) {
    morrer(
      `a margem média por atendimento deu ${br.reais(r.margemUnit)}: sem margem não existe conta de contratação`,
      "confira preco e custoVariavel de cada serviço na spec. Enquanto a margem for zero, o que falta é preço, não cadeira: veja o /preco"
    );
  }
  const horasMes = horasSemana * SEMANAS_POR_MES;
  const atendimentosCabem = (horasMes * 60) / r.duracaoMedia;
  const atendimentosEquilibrio = custoMes / r.margemUnit;
  const ocupacaoEquilibrio = atendimentosEquilibrio / atendimentosCabem;
  const demanda = cfg.demandaRecusadaMes === undefined ? null : br.numero(cfg.demandaRecusadaMes);
  const out = {
    descricao: cfg.descricao || `mais 1 ${r.nomeUnidade}`, custoMes, horasSemana, horasMes,
    atendimentosCabem, atendimentosEquilibrio, ocupacaoEquilibrio,
    receitaEquilibrio: br.centavos(atendimentosEquilibrio * r.precoMedio),
    demandaRecusadaMes: demanda, margemDemanda: demanda === null ? null : br.centavos(Math.min(demanda, atendimentosCabem) * r.margemUnit),
    folgaAtualAtendimentos: r.folgaAteTetoAtendimentos ?? null,
  };
  out.cabeNaFolga = out.folgaAtualAtendimentos !== null && demanda !== null && demanda <= out.folgaAtualAtendimentos;
  out.resultadoComDemanda = out.margemDemanda === null ? null : br.centavos(out.margemDemanda - custoMes);
  return out;
}

// ─────────────────────────── relatório ───────────────────────────

function relatorio(r, extra = {}) {
  const L = [];
  const u = r.nomeUnidade;
  L.push(`# Capacidade — ${extra.negocio || "o negócio"}`, "");
  L.push(`Gerado por \`scripts/capacidade.js\` em ${br.fmt(new Date())}. Toda linha abaixo é conta do script; nenhuma foi digitada à mão.`, "");

  L.push("## Premissas", "");
  L.push(`- **Unidades:** ${n0(r.unidades)} ${u}${r.unidades > 1 ? "s" : ""} atendendo ao mesmo tempo`);
  L.push(`- **Duração média do serviço:** ${h1(r.duracaoMedia)} min (média ponderada pelo mix)`);
  L.push(`- **Preço médio:** ${br.reais(r.precoMedio)} · custo variável médio ${br.reais(r.custoVariavelMedio)} · margem ${br.reais(r.margemUnit)}`);
  L.push(`- **Por hora:** ${br.reais(r.receitaPorHora)} de receita e ${br.reais(r.margemPorHora)} de margem, com a agenda cheia`);
  L.push(`- **Teto praticável:** ${pct0(r.teto / 100)} de ocupação (premissa do dono, não referência de mercado)`);
  if (r.custoFixoMes !== null) L.push(`- **Estrutura:** ${br.reais(r.custoFixoMes)} de custo fixo + ${br.reais(r.retiradaMes)} de retirada = ${br.reais(r.custoEstruturaMes ?? r.custoFixoMes + r.retiradaMes)} por mês`);
  else L.push("- **Estrutura:** [a confirmar] — sem `custoFixoMes` na spec não há custo da hora ociosa");
  L.push(`- **Mês:** ${h2(SEMANAS_POR_MES)} semanas (${h2(DIAS_POR_MES)} dias ÷ 7)`);
  L.push("");

  L.push("## O que cabe na semana", "");
  L.push(`| Dia | Janelas | Horas abertas | Horas-${u} | Atendimentos que cabem |`, "|---|---|---|---|---|");
  // Os totais somam os valores JÁ arredondados das linhas: é o que o
  // verificar.js confere, e assim a coluna fecha exata em vez de por perto.
  let somaH = 0, somaHU = 0, somaA = 0;
  for (let d = 1; d <= 7; d++) {
    const i = d % 7;
    if (!r.janelas[i].length) continue;
    const horasDia = Math.round((r.minutosAbertosDia[i] / 60) * 10) / 10;
    const hu = Math.round((r.capMinDia[i] / 60) * 10) / 10;
    const at = Math.round(r.capMinDia[i] / r.duracaoMedia);
    somaH += horasDia; somaHU += hu; somaA += at;
    const janelas = r.janelas[i].map(([a, b]) => `${horaDeMinutos(a)}–${horaDeMinutos(b)}`).join(", ");
    L.push(`| ${NOME_DIA[i]} | ${janelas} | ${h1(horasDia)} | ${h1(hu)} | ${n0(at)} |`);
  }
  L.push(`| Total | — | ${h1(somaH)} | ${h1(somaHU)} | ${n0(somaA)} |`);
  L.push("");
  L.push(`Por mês: **${h1(r.horasAbertasMes)} horas-${u}** e **${n0(r.slotsMes)} atendimentos** de teto físico.`);
  L.push(`Receita de teto: **${br.reais(r.receitaTetoMes)}** por mês com a agenda 100% cheia (${n0(r.slotsMes)} atendimentos ao preço médio de ${br.reais(r.precoMedio)}), e **${br.reais(r.receitaTetoPratico)}** no teto praticável de ${pct0(r.teto / 100)}.`);
  L.push("");
  L.push("Agenda 100% cheia não existe: entre um atendimento e outro há limpeza, atraso, ida ao banheiro e o cliente que remarca. O número que serve de meta é o do teto praticável.", "");

  const o = r.ocup;
  if (!o) {
    L.push("## Ocupação", "");
    L.push("Sem dado de ocupação: a spec não tem `ocupacao.porDia` e nenhuma agenda foi lida. O que está acima é só o teto, e teto sem ocupação não decide nada. Exporte a agenda pra `dados/` e rode de novo com `--agenda`, ou preencha os atendimentos de uma semana normal em `ocupacao.porDia`.", "");
  } else {
  L.push("## Ocupação medida", "");
  if (o.fonte === "agenda") {
    L.push(`Fonte: \`${o.arquivo}\`, ${n0(o.eventos)} compromissos entre ${br.fmt(o.inicio)} e ${br.fmt(o.fim)} (${n0(o.dias)} dias).`, "");
  } else {
    L.push("Fonte: a contagem de uma semana normal que o dono informou (`ocupacao.porDia`). Serve pra primeira leitura; a exportação da agenda dá o mapa por hora.", "");
  }
  L.push(`| Dia | Horas-${u} | Horas ocupadas | Horas ociosas | Ocupação % |`, "|---|---|---|---|---|");
  let cH = 0, oH = 0, iH = 0;
  const d1 = (n) => Math.round(n * 10) / 10;
  for (let d = 1; d <= 7; d++) {
    const i = d % 7;
    if (!r.janelas[i].length) continue;
    const cap = d1(r.capMinDia[i] / 60), usado = d1(o.ocupDiaSemana[i] / 60);
    cH += cap; oH += usado; iH += d1(cap - usado);
    // A % sai dos minutos crus, não das horas já arredondadas: senão o sábado
    // aparece com 20% aqui e 19% na tabela de buracos, e o leitor perde a conta.
    const taxaDia = r.capMinDia[i] ? o.ocupDiaSemana[i] / r.capMinDia[i] : 0;
    L.push(`| ${NOME_DIA[i]} | ${h1(cap)} | ${h1(usado)} | ${h1(cap - usado)} | ${pct0(taxaDia)} |`);
  }
  L.push(`| Total | ${h1(cH)} | ${h1(oH)} | ${h1(iH)} | ${pct0(o.taxa)} |`);
  L.push("");
  L.push(`**Ocupação da semana: ${pct1(o.taxa)}.** ${h1(iH)} horas-${u} vazias por semana, ${h1(r.horasOciosasMes)} por mês.`, "");

  if (o.grade) {
    L.push("## Mapa por hora", "");
    const dias = [];
    for (let d = 1; d <= 7; d++) { const i = d % 7; if (r.janelas[i].length) dias.push(i); }
    // Grade em bloco de código, não em tabela markdown: ocupação de hora não é
    // coluna somável, e em largura fixa o buraco aparece de longe.
    L.push("```");
    L.push(`Hora  ${dias.map((i) => NOME_DIA[i].slice(0, 3).padEnd(7)).join("")}`.trimEnd());
    for (const h of o.horas) {
      const celulas = dias.map((i) => {
        const c = o.grade[i].get(h);
        if (!c || c.capMin <= 0) return "  —    ";
        const t = c.ocupMin / c.capMin;
        return `${bloco(t)} ${pct0(t).padStart(4)} `;
      });
      L.push(`${horaDeMinutos(h * 60)} ${celulas.join("")}`.trimEnd());
    }
    L.push("```", "");
    L.push("Cada célula é a ocupação daquela hora naquele dia da semana, no período lido. `—` é hora fechada. Os blocos vão de `░` (abaixo de 25%) a `█` (85% ou mais).", "");
  }

  }

  L.push("## Quanto a hora vazia custa", "");
  if (r.custoHoraAberta === undefined || r.custoHoraAberta === null) {
    L.push("Sem `custoFixoMes` na spec. O custo da hora sai do fechamento do mês (`/caixa`): custo fixo mais retirada, dividido pelas horas abertas. Preencha e rode de novo.", "");
  } else {
    L.push(`- **Custo da hora aberta:** ${br.reais(r.custoEstruturaMes)} ÷ ${h1(r.horasAbertasMes)} horas-${u} = **${br.reais(r.custoHoraAberta)}**`);
    if (r.custoHoraEntregue) L.push(`- **Custo da hora entregue:** ${br.reais(r.custoEstruturaMes)} ÷ ${h1(r.horasOcupadasMes)} horas vendidas = **${br.reais(r.custoHoraEntregue)}**`);
    if (r.custoOciosidadeMes !== undefined) L.push(`- **Custo da ociosidade:** ${h1(r.horasOciosasMes)} horas × ${br.reais(r.custoHoraAberta)} = **${br.reais(r.custoOciosidadeMes)}** por mês`);
    if (r.receitaFolgaMes !== undefined) L.push(`- **Receita que cabia até o teto praticável:** **${br.reais(r.receitaFolgaMes)}** por mês, em ${n0(r.folgaAteTetoAtendimentos)} atendimentos ao preço médio (margem de ${br.reais(r.margemFolgaMes)})`);
    L.push("");
    if (r.custoHoraEntregue) {
      L.push(`A hora vazia não tira dinheiro do caixa: ela já foi paga. O que ela faz é jogar o custo das horas vendidas pra cima, de ${br.reais(r.custoHoraAberta)} para ${br.reais(r.custoHoraEntregue)}. Essa diferença é o preço da agenda com buraco.`, "");
    } else {
      L.push(`Cada hora de porta aberta custa ${br.reais(r.custoHoraAberta)} antes de qualquer cliente entrar, e a receita média da hora cheia é ${br.reais(r.receitaPorHora)}. Quanto disso está sendo vendido de verdade só a medição da ocupação responde.`, "");
    }
  }

  if (r.buracos.length) {
    L.push(r.buracos.length === 3 ? "## Os três buracos maiores" : `## ${r.buracos.length === 1 ? "O buraco maior" : "Os dois buracos maiores"}`, "");
    const onde = (b) => (b.hora === null ? `${NOME_DIA[b.dia]} (o dia todo)` : `${NOME_DIA[b.dia]}, ${horaDeMinutos(b.hora * 60)}`);
    L.push("| Buraco | Ocupação % | Horas vazias/semana | Ação |", "|---|---|---|---|");
    for (const b of r.buracos) L.push(`| ${onde(b)} | ${pct0(b.taxa)} | ${h1(b.ociosasSemana)} | ${b.acao} |`);
    L.push("");
    for (const b of r.buracos) {
      const porque = b.hora === null
        ? (b.acao === "bloqueio"
          ? `o dia inteiro fica em ${pct0(b.taxa)}: vale estudar encurtar ou fechar esse dia e concentrar nos que enchem`
          : `ocupação de ${pct0(b.taxa)} no dia: falta motivo pra alguém escolher esse dia, e é a maior sobra da semana`)
        : b.acao === "bloqueio"
          ? `está na borda do dia com ${pct0(b.taxa)} de ocupação: fechar esse pedaço corta custo sem perder atendimento`
          : b.acao === "encaixe"
            ? `o mesmo dia chega a ${pct0(b.pico)} em outra hora: cabe puxar quem marca no pico pra cá`
            : `ocupação de ${pct0(b.taxa)} com o dia inteiro morno: precisa de motivo pra alguém escolher esse horário`;
      L.push(`- **${onde(b)} — ${b.acao}:** ${porque}`);
    }
    L.push("");
    if (r.buracos[0].hora === null) {
      L.push("O buraco aqui é do dia inteiro porque a contagem por dia não mostra a hora. Com a exportação da agenda, o mapa por hora aponta a faixa exata, e aí aparece o encaixe: mover gente do pico pro vazio do mesmo dia.", "");
    }
  }

  if (r.contratar) {
    const c = r.contratar;
    L.push(`## Vale mais 1 ${r.nomeUnidade}?`, "");
    L.push(`- **O que entra:** ${c.descricao}, ${br.reais(c.custoMes)} por mês, ${h1(c.horasSemana)} horas por semana`);
    L.push(`- **Capacidade nova:** ${h1(c.horasMes)} horas por mês = ${n0(c.atendimentosCabem)} atendimentos`);
    L.push(`- **Equilíbrio:** ${br.reais(c.custoMes)} ÷ ${br.reais(r.margemUnit)} de margem = **${n0(c.atendimentosEquilibrio)} atendimentos por mês**, ou ${pct0(c.ocupacaoEquilibrio)} de ocupação da unidade nova`);
    L.push(`- **Em receita:** ${br.reais(c.receitaEquilibrio)} por mês só pra empatar`);
    if (c.folgaAtualAtendimentos !== null) L.push(`- **Antes disso:** ainda cabem ${n0(c.folgaAtualAtendimentos)} atendimentos por mês no que já está aberto (até o teto de ${pct0(r.teto / 100)}), que valem ${br.reais(r.margemFolgaMes)} de margem sem custo novo`);
    if (c.demandaRecusadaMes !== null) {
      L.push(`- **Demanda recusada informada:** ${n0(c.demandaRecusadaMes)} por mês → ${br.reais(c.margemDemanda)} de margem − ${br.reais(c.custoMes)} de custo = **${br.reais(c.resultadoComDemanda)}**`);
    }
    L.push("");
    if (c.ocupacaoEquilibrio > 1) {
      L.push(`**Não fecha.** A unidade nova cabe ${n0(c.atendimentosCabem)} atendimentos por mês e precisaria de ${n0(c.atendimentosEquilibrio)} só pra pagar o próprio custo. Nem lotada ela se paga com o preço e a margem de hoje.`, "");
    } else if (c.cabeNaFolga) {
      L.push(`**Ainda não.** A demanda que você recusa (${n0(c.demandaRecusadaMes)} por mês) cabe nos horários que já estão abertos e vazios. Encher os buracos acima vale ${br.reais(r.margemFolgaMes)} de margem sem folha nova.`, "");
    } else if (c.resultadoComDemanda !== null && c.resultadoComDemanda > 0) {
      L.push(`**Fecha, com a demanda informada.** ${n0(c.demandaRecusadaMes)} atendimentos recusados por mês sustentam a unidade nova e sobram ${br.reais(c.resultadoComDemanda)}. Levar o número pro \`/projecao\` no cenário "contratar" antes de assinar.`, "");
    } else {
      L.push(`**Depende da demanda.** A conta fecha a partir de ${n0(c.atendimentosEquilibrio)} atendimentos novos por mês (${pct0(c.ocupacaoEquilibrio)} da unidade nova). Se você não sabe quantas pessoas recusou no último mês, comece a contar: é esse número que decide, não a sensação de estar cheio.`, "");
    }
  }

  const avisos = [];
  if (o && o.fonte === "agenda") {
    if (o.dias < 28) avisos.push(`o período lido tem ${n0(o.dias)} dias: com menos de 4 semanas, uma semana atípica move o mapa inteiro`);
    if (o.foraDoHorario > 0) avisos.push(`${h1(o.foraDoHorario / 60)} horas de compromisso caíram fora do horário declarado em funcionamento e ficaram de fora da conta`);
    if (o.ignorados.cancelados) avisos.push(`${plural(o.ignorados.cancelados, "compromisso")} cancelado${Math.round(o.ignorados.cancelados) === 1 ? "" : "s"} ${ficou(o.ignorados.cancelados)} de fora: horário cancelado é horário vazio`);
    if (o.ignorados.diaInteiro) avisos.push(`${plural(o.ignorados.diaInteiro, "evento")} de dia inteiro ${ficou(o.ignorados.diaInteiro)} de fora: não tem hora de início`);
    if (o.ignorados.semData) avisos.push(`${plural(o.ignorados.semData, "linha")} sem data ou hora legível ${ficou(o.ignorados.semData)} de fora`);
    if (o.ignorados.semFim) avisos.push(`${plural(o.ignorados.semFim, "compromisso")} sem duração utilizável ${ficou(o.ignorados.semFim)} de fora`);
    if (o.statusDesconhecidos.length) avisos.push(`status que o script não reconheceu e tratou como horário ocupado: ${o.statusDesconhecidos.map((s) => `"${s}"`).join(", ")}`);
  }
  if (r.unidades > 1 && o && o.fonte === "agenda") avisos.push(`a conta trata as ${n0(r.unidades)} ${u}s como se fossem intercambiáveis; se cada profissional atende serviço diferente, o teto real é menor`);
  if (avisos.length) L.push("## Atenção", "", ...avisos.map((a) => `- ${a}`), "");

  L.push(`Conta reproduzível: \`node scripts/capacidade.js ${(extra.comando || "").trim()}\``, "");
  return L.join("\n");
}

// ─────────────────────────── exemplo ───────────────────────────

function escreverExemplo(pasta) {
  fs.mkdirSync(pasta, { recursive: true });
  const spec = {
    negocio: "Studio Lumi (exemplo)",
    unidade: { nome: "cadeira", quantidade: 2 },
    funcionamento: {
      seg: [], ter: [["09:00", "12:00"], ["13:00", "19:00"]], qua: [["09:00", "12:00"], ["13:00", "19:00"]],
      qui: [["09:00", "12:00"], ["13:00", "19:00"]], sex: [["09:00", "12:00"], ["13:00", "20:00"]],
      sab: [["09:00", "14:00"]], dom: [],
    },
    servicos: [
      { nome: "Corte", duracaoMin: 45, preco: "70,00", custoVariavel: "6,00", mixPct: 55 },
      { nome: "Coloração", duracaoMin: 120, preco: "260,00", custoVariavel: "60,00", mixPct: 25 },
      { nome: "Escova", duracaoMin: 40, preco: "60,00", custoVariavel: "5,00", mixPct: 20 },
    ],
    custoFixoMes: "9.400,00",
    retiradaMes: "5.000,00",
    tetoPraticavelPct: 85,
    ocupacao: { arquivo: "agenda-exemplo.csv" },
    contratar: { descricao: "terceira cadeira com profissional em meio período", custoMes: "3.400,00", horasSemana: 24, demandaRecusadaMes: 30 },
  };
  const arqSpec = path.join(pasta, "exemplo.capacidade.json");
  fs.writeFileSync(arqSpec, JSON.stringify(spec, null, 2) + "\n");

  // agenda de 5 semanas corridas: manhã cheia, terça e tarde de sábado vazias.
  // Precisa passar de 28 dias entre o primeiro e o último compromisso, senão o
  // próprio exemplo sai com o aviso de período curto.
  const linhas = ["data;hora;fim;servico;status"];
  const inicio = new Date(2026, 8, 1); // 01/09/2026, terça
  const pesos = { 2: 0.45, 3: 0.7, 4: 0.75, 5: 0.95, 6: 0.5 };
  let n = 0;
  for (let d = 0; d < 35; d++) {
    const dia = br.mais(inicio, d);
    const peso = pesos[dia.getDay()];
    if (!peso) continue;
    const abertas = dia.getDay() === 6 ? [[9 * 60, 14 * 60]] : dia.getDay() === 5 ? [[9 * 60, 12 * 60], [13 * 60, 20 * 60]] : [[9 * 60, 12 * 60], [13 * 60, 19 * 60]];
    for (const [ini, fim] of abertas) {
      for (let cadeira = 0; cadeira < 2; cadeira++) {
        let t = ini;
        while (t < fim) {
          const manha = t < 12 * 60;
          const chance = peso * (manha ? 1.15 : 0.75) * (cadeira === 1 ? 0.8 : 1);
          const dur = n % 7 === 0 ? 120 : n % 3 === 0 ? 40 : 45;
          if (t + dur > fim) break;
          if ((n * 37) % 100 < chance * 100) {
            const servico = dur === 120 ? "Coloração" : dur === 40 ? "Escova" : "Corte";
            linhas.push([br.fmt(dia), horaDeMinutos(t), horaDeMinutos(t + dur), servico, n % 11 === 0 ? "cancelou" : "compareceu"].join(";"));
          }
          t += dur;
          n++;
        }
      }
    }
  }
  const arqAgenda = path.join(pasta, "agenda-exemplo.csv");
  fs.writeFileSync(arqAgenda, linhas.join("\n") + "\n");
  console.log(`✔ spec em ${arqSpec}`);
  console.log(`✔ agenda em ${arqAgenda} (${linhas.length - 1} compromissos)`);
  console.log(`  rode: node scripts/capacidade.js "${arqSpec}"`);
}

// ─────────────────────────── main ───────────────────────────

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const prox = argv[i + 1];
      if (["json", "exemplo", "ajuda", "help"].includes(k)) o[k] = true;
      else if (prox !== undefined && !prox.startsWith("--")) { o[k] = prox; i++; }
      else o[k] = true;
    } else o._.push(a);
  }
  return o;
}

function main() {
  const o = args(process.argv.slice(2));
  if (o.ajuda || o.help || (!o._.length && !o.exemplo)) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
    process.exit(o.ajuda || o.help ? 0 : 1);
  }
  if (o.exemplo) return escreverExemplo(typeof o.exemplo === "string" ? o.exemplo : o._[0] || ".");

  const arqSpec = o._[0];
  if (!fs.existsSync(arqSpec)) morrer(`não achei ${arqSpec}`, "rode `node scripts/capacidade.js --exemplo <pasta>` pra ver o formato da spec");
  let spec;
  try { spec = JSON.parse(fs.readFileSync(arqSpec, "utf8").replace(/^﻿/, "")); }
  catch (e) { morrer(`${arqSpec} não é JSON válido: ${e.message}`, "vírgula sobrando no fim da lista é o erro mais comum"); }

  const med = medias(spec.servicos);
  let entrada = {};
  const arqAgenda = o.agenda || spec.ocupacao?.arquivo;
  if (arqAgenda) {
    const caminho = path.isAbsolute(arqAgenda) ? arqAgenda : path.resolve(path.dirname(arqSpec), arqAgenda);
    const usado = fs.existsSync(caminho) ? caminho : arqAgenda;
    const lido = lerAgenda(usado, med);
    if (!lido.eventos.length) morrer(`${usado} não rendeu nenhum compromisso utilizável`, "confira as colunas de data e hora, ou os status cancelados");
    entrada = { ...lido, arquivo: curto(usado) };
  }
  if (o.teto !== undefined) entrada.tetoPct = br.numero(o.teto);

  const r = calcular(spec, entrada);
  const comando = `"${arqSpec}"${o.agenda ? ` --agenda "${o.agenda}"` : ""}${o.teto !== undefined ? ` --teto ${o.teto}` : ""}`;

  if (o.json) {
    const limpo = JSON.parse(JSON.stringify(r, (k, v) => (k === "grade" ? undefined : v)));
    console.log(JSON.stringify(limpo, null, 2));
    return;
  }
  const md = relatorio(r, { negocio: spec.negocio, comando });
  if (o.md) {
    fs.mkdirSync(path.dirname(path.resolve(o.md)), { recursive: true });
    fs.writeFileSync(o.md, md);
    console.log(`✔ relatório em ${o.md}`);
  }
  console.log(md);
}

module.exports = {
  calcular, medias, normalizarFuncionamento, minutosDeHora, horaDeMinutos, intersecao,
  lerIcs, lerCsvAgenda, acharBuracos, acharBuracosPorDia, diversificar, contaContratar, relatorio, SEMANAS_POR_MES,
};

if (require.main === module) main();
