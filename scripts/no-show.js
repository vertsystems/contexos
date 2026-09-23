#!/usr/bin/env node
/**
 * Contex OS — no-show.js
 * Mede a taxa de falta de uma agenda e quanto ela custa por mês, em reais.
 *
 * Existe porque "acho que uns 20% faltam" nunca bate com a contagem. A taxa
 * sai de uma exportação de agendamentos (CSV ou .xlsx) ou de três números
 * contados na mão (agendados, faltas, ticket), e a conta é sempre a mesma:
 * custo mensal = horários no mês × ticket × taxa, calculado em dois passos que
 * quem lê refaz na calculadora — faltas × ticket no período, e o resultado
 * multiplicado pelo fator do mês. O /confirmacao-de-agenda usa a saída pra
 * escrever agenda/confirmacao.md com a meta e o ganho.
 *
 * Uso:
 *   node scripts/no-show.js <agenda.csv|agenda.xlsx> [--ticket 200] [--meta 10]
 *   node scripts/no-show.js --agendados 150 --faltas 37 --ticket 200 [--meta 10]
 *   node scripts/no-show.js --agendados 38 --faltas 9 --ticket 120 --semana
 *   node scripts/no-show.js --exemplo <pasta>          escreve um CSV de exemplo pra testar
 *
 * Opções:
 *   --ticket <R$>       valor médio do horário (obrigatório se o arquivo não tem coluna de valor)
 *   --meta <pct>        taxa alvo; sem ela, metade da atual com piso de 5%
 *   --semana            os três números são de uma semana (o mês vira ×52/12)
 *   --sinal <pct>       mostra o valor do sinal nessa porcentagem do ticket
 *   --tardio-conta      cancelamento em cima da hora entra como falta (é o padrão)
 *   --tardio-nao-conta  tira o cancelamento tardio da base (o custo sai menor do que é)
 *   --saida <arquivo>   grava o relatório em markdown (ou o JSON, junto com --json)
 *   --json              saída em JSON (pra outro script ler)
 *
 * Colunas que o script reconhece no arquivo (nome livre, sem acento, qualquer ordem):
 *   data | dia               data do horário (DD/MM/AAAA, AAAA-MM-DD ou data do Excel)
 *   hora | horario           hora do horário (HH:MM)
 *   status | situacao | compareceu | presenca
 *                            compareceu / faltou / cancelou / cancelou tarde (léxico abaixo)
 *   valor | ticket | preco   valor do horário, em reais
 *   servico | procedimento | tipo
 *   primeira | novo | primeira vez   sim/não: cliente de primeira vez
 *   marcado em | agendado em         data em que o horário foi marcado (calcula a antecedência)
 *
 * Status que o script não reconhece fica fora da base e aparece no fim do
 * relatório, em "Atenção". Status fora da base é falta que some da conta: vale
 * renomear na exportação e rodar de novo.
 *
 * Node 18+, sem dependência. Usa scripts/br.js e scripts/gerar-planilha.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");
const { parseCsv, lerXlsx } = require("./gerar-planilha.js");

const DIAS_POR_MES = 365.25 / 12; // 30,44

/** Faixas de antecedência, na ordem em que fazem sentido ler. */
const FAIXAS_ANTECEDENCIA = ["até 2 dias", "3 a 7 dias", "8 a 30 dias", "mais de 30 dias"];

/** Léxico de status: o que cada palavra da exportação significa pra conta. */
const LEXICO = {
  compareceu: ["compareceu", "presente", "presenca", "realizado", "realizada", "atendido", "atendida", "concluido", "concluida", "finalizado", "finalizada", "feito", "ok", "sim", "confirmado e atendido", "show", "veio", "compareceu no horario"],
  faltou: ["faltou", "falta", "no-show", "no show", "noshow", "nao compareceu", "ausente", "ausencia", "faltante", "absenteismo", "nao veio", "nao apareceu", "nao", "n"],
  cancelou_tarde: ["cancelou tarde", "cancelado tarde", "cancelamento tardio", "tardio", "tardia", "cancelou em cima", "cancelado no dia", "cancelado em cima da hora"],
  cancelou: ["cancelou", "cancelado", "cancelada", "cancelamento", "desmarcou", "desmarcado", "remarcou", "remarcado", "reagendado", "reagendou", "transferido"],
  aberto: ["agendado", "marcado", "confirmado", "pendente", "aguardando", "a confirmar", "aguardando confirmacao", "nao confirmado", "em aberto", "reservado", "em atendimento", "em andamento", "chegou", "na recepcao", ""],
};

/**
 * Tamanho mínimo pra um termo do léxico valer como trecho. Sem esse piso, o "n"
 * e o "nao" de `faltou` classificam como falta tudo que tenha a letra n:
 * "Aguardando confirmação", "Cancelado pelo paciente" e "Atendimento realizado"
 * entravam como no-show e a taxa saía inventada.
 */
const MIN_TRECHO = 5;
const ORDEM = ["cancelou_tarde", "faltou", "compareceu", "cancelou", "aberto"];

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function classificarStatus(s) {
  const t = br.semAcento(String(s ?? "")).trim().replace(/[.;]+$/, "").replace(/\s+/g, " ");
  for (const chave of ORDEM) {
    if (LEXICO[chave].some((p) => p === t)) return chave;
  }
  for (const chave of ORDEM) {
    if (LEXICO[chave].some((p) => p.length >= MIN_TRECHO && t.includes(p))) return chave;
  }
  return "desconhecido";
}

// ─────────────────────────── leitura do arquivo ───────────────────────────

function letraCol(n) { let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

function serialParaData(n) {
  // serial do Excel: dias desde 30/12/1899; 25569 = 01/01/1970
  const ms = Math.round((n - 25569) * 86400000);
  const d = new Date(ms);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Devolve { cabecalho: [...], linhas: [[...]] } de um CSV ou da primeira aba de um .xlsx. */
function lerTabela(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`, "exporte a agenda em CSV ou .xlsx e passe o caminho, ou use --agendados/--faltas/--ticket");
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
  const txt = fs.readFileSync(arquivo, "utf8").replace(/^\uFEFF/, "");
  const { linhas } = parseCsv(txt);
  return { cabecalho: linhas[0] || [], linhas: linhas.slice(1) };
}

const COLUNAS = {
  data: ["data", "dia", "data do horario", "data da consulta", "data do atendimento", "date"],
  hora: ["hora", "horario", "hora do horario", "inicio", "time"],
  status: ["status", "situacao", "compareceu", "presenca", "resultado", "comparecimento"],
  valor: ["valor", "ticket", "preco", "valor do horario", "valor da consulta", "total"],
  servico: ["servico", "procedimento", "tipo", "tipo de atendimento", "consulta"],
  primeira: ["primeira", "primeira vez", "novo", "novo cliente", "cliente novo", "primeira consulta"],
  marcado: ["marcado em", "agendado em", "data do agendamento", "data da marcacao", "criado em"],
};

function mapearColunas(cabecalho) {
  const norm = cabecalho.map((c) => br.semAcento(String(c)).trim().replace(/\s+/g, " "));
  const idx = {};
  for (const [campo, nomes] of Object.entries(COLUNAS)) {
    let i = norm.findIndex((n) => nomes.includes(n));
    if (i < 0) i = norm.findIndex((n) => nomes.some((x) => x.length > 3 && n.includes(x)));
    if (i >= 0) idx[campo] = i;
  }
  // Exportação com uma coluna só chamada "Data do agendamento" casava em data e em
  // marcado, e a antecedência saía zero pra todo mundo. Sem duas colunas de data,
  // não há antecedência pra medir.
  if (idx.marcado !== undefined && idx.marcado === idx.data) delete idx.marcado;
  return idx;
}

/** "14:30", "14h30", "2026-08-03T14:30", "03/08/2026 14:00" e "8" viram 14, 14, 14, 14 e 8. */
function lerHora(s) {
  const t = String(s ?? "").trim();
  const m = t.match(/(?:^|[\sT])(\d{1,2})[:h](\d{2})/);
  if (m) { const h = +m[1]; return h >= 0 && h <= 23 ? h : null; }
  const so = t.match(/^(\d{1,2})h?$/);
  if (so) { const h = +so[1]; return h >= 0 && h <= 23 ? h : null; }
  return null;
}

function simNao(s) {
  const t = br.semAcento(String(s ?? "")).trim();
  if (["sim", "s", "1", "true", "x", "novo", "primeira"].includes(t)) return true;
  if (["nao", "n", "0", "false", "", "retorno", "recorrente"].includes(t)) return false;
  return null;
}

// ─────────────────────────── cálculo ───────────────────────────

/** Contagem e quebras a partir das linhas do arquivo. */
function analisarLinhas(cabecalho, linhas, opts = {}) {
  const idx = mapearColunas(cabecalho);
  if (idx.status === undefined) morrer("não achei a coluna de status (compareceu / faltou / cancelou)", `colunas lidas: ${cabecalho.join(" | ")}`);
  const tardioConta = opts.tardioConta !== false;
  const cont = { compareceu: 0, faltou: 0, cancelou_tarde: 0, cancelou: 0, aberto: 0, desconhecido: 0 };
  const quebras = { diaSemana: {}, hora: {}, servico: {}, primeira: {}, antecedencia: {} };
  const desconhecidos = new Set();
  const datas = [];
  const valores = [];
  const valoresFaltas = [];

  const somar = (grupo, chave, tipo) => {
    if (chave === null || chave === undefined || chave === "") return;
    const conta = tipo === "faltou" || (tipo === "cancelou_tarde" && tardioConta);
    // Quem está fora da base não abre linha na quebra, senão a tabela ganha
    // "14h | 0 | 0 | —" por causa de um cancelamento avisado com antecedência.
    if (!conta && tipo !== "compareceu") return;
    const g = quebras[grupo][chave] || (quebras[grupo][chave] = { base: 0, faltas: 0 });
    g.base++;
    if (conta) g.faltas++;
  };

  for (const l of linhas) {
    const tipo = classificarStatus(l[idx.status]);
    cont[tipo]++;
    if (tipo === "desconhecido") desconhecidos.add(String(l[idx.status]));
    if (tipo === "aberto" || tipo === "desconhecido") continue;

    const data = idx.data !== undefined ? br.lerData(String(l[idx.data]).trim().slice(0, 10)) : null;
    if (data) datas.push(data);
    if (idx.valor !== undefined) {
      const v = br.numero(l[idx.valor]);
      if (Number.isFinite(v) && v > 0 && tipo !== "cancelou") {
        valores.push(v);
        if (tipo === "faltou" || (tipo === "cancelou_tarde" && tardioConta)) valoresFaltas.push(v);
      }
    }

    somar("diaSemana", data ? br.diaSemana(data) : null, tipo);
    const h = idx.hora !== undefined ? lerHora(l[idx.hora]) : null;
    somar("hora", h === null ? null : `${String(h).padStart(2, "0")}h`, tipo);
    somar("servico", idx.servico !== undefined ? String(l[idx.servico]).trim() : null, tipo);
    if (idx.primeira !== undefined) { const p = simNao(l[idx.primeira]); somar("primeira", p === null ? null : p ? "primeira vez" : "retorno", tipo); }
    if (idx.marcado !== undefined && data) {
      const m = br.lerData(String(l[idx.marcado]).trim().slice(0, 10));
      if (m) { const d = br.diasEntre(m, data); somar("antecedencia", d <= 2 ? "até 2 dias" : d <= 7 ? "3 a 7 dias" : d <= 30 ? "8 a 30 dias" : "mais de 30 dias", tipo); }
    }
  }

  const faltas = cont.faltou + (tardioConta ? cont.cancelou_tarde : 0);
  const base = cont.compareceu + faltas;
  let dias = null, inicio = null, fim = null;
  if (datas.length) {
    datas.sort((a, b) => a - b);
    inicio = datas[0]; fim = datas[datas.length - 1];
    dias = br.diasEntre(inicio, fim) + 1;
  }
  const media = (v) => br.centavos(v.reduce((a, b) => a + b, 0) / v.length);
  const ticketArquivo = valores.length ? media(valores) : null;
  // Ticket só das faltas: quando a falta se concentra no serviço caro, o custo
  // real é maior que faltas × média, e o relatório precisa dizer isso.
  const ticketFaltas = valoresFaltas.length ? media(valoresFaltas) : null;

  return { idx, cont, faltas, base, dias, inicio, fim, ticketArquivo, ticketFaltas, quebras, desconhecidos: [...desconhecidos], linhasLidas: linhas.length };
}

/**
 * A conta central. Recebe o que foi contado (base = compareceu + faltas) e o
 * ticket, e devolve taxa, custo no período, custo por mês, meta e ganho.
 *
 * `fatorMes` converte o período pra mês: 1 pra mês, 52/12 pra semana,
 * 30,44/dias pra um arquivo que cobre `dias` dias. Ele é arredondado em quatro
 * casas e o custo do mês sai do custo do período multiplicado por ele, não de
 * uma contagem fracionária de faltas. É o que faz cada multiplicação impressa
 * fechar na calculadora de quem ler o relatório: "R$ 7.509,92 × 1,1273" dá o
 * mesmo centavo que o script mostra.
 */
function calcular({ base, faltas, ticket, fatorMes = 1, meta, sinalPct }) {
  if (!base) morrer("base zerada: nenhum horário compareceu nem faltou", "a taxa é faltas ÷ (compareceu + faltas); cancelamento com antecedência fica fora da base");
  if (faltas > base) morrer(`faltas (${faltas}) maior que a base (${base})`);
  fatorMes = Math.round(fatorMes * 10000) / 10000;
  const taxa = faltas / base;
  const agendadosMes = base * fatorMes;
  const faltasMes = faltas * fatorMes;
  const temTicket = Number.isFinite(ticket) && ticket > 0;
  const custoPeriodo = temTicket ? br.centavos(faltas * ticket) : null;
  const custoMes = temTicket ? br.centavos(custoPeriodo * fatorMes) : null;
  const custoAno = temTicket ? br.centavos(custoMes * 12) : null;

  // Meta: a do usuário, se cabe; senão metade da taxa atual com piso de 5%.
  // Quem já está em 4% não tem meta a perseguir: tem manutenção. Sem esse caso,
  // o piso de 5% viraria uma meta acima da taxa medida e o ganho saía negativo.
  const padrao = Math.max(0.05, Math.round((taxa / 2) * 100) / 100);
  const noPiso = taxa <= 0.05;
  let metaFrac = Number.isFinite(meta) ? meta / 100 : noPiso ? taxa : padrao;
  const avisos = [];
  if (noPiso && !Number.isFinite(meta)) {
    avisos.push(`a taxa medida (${br.pct(taxa, 1)}) já está no piso de 5%: aqui o trabalho é manutenção, não meta. Deixei a meta igual à taxa atual e o ganho em zero — a régua serve pra não deixar subir`);
  } else if (metaFrac >= taxa) {
    if (padrao < taxa) {
      avisos.push(`a meta pedida (${br.pct(metaFrac, 0)}) é igual ou maior que a taxa medida (${br.pct(taxa, 1)}): meta não é onde você já está. Usei ${br.pct(padrao, 0)}, metade da atual`);
      metaFrac = padrao;
    } else {
      avisos.push(`a meta pedida (${br.pct(metaFrac, 0)}) não fica abaixo da taxa medida (${br.pct(taxa, 1)}), e a taxa já está no piso de 5%: deixei a meta igual à atual, que aqui é manutenção`);
      metaFrac = taxa;
    }
  } else if (metaFrac > 0 && metaFrac < 0.05) {
    avisos.push(`meta de ${br.pct(metaFrac, 1)}: abaixo de 5% o esforço de perseguir a meta passa o ganho. Mantive o número que você pediu, mas confira se vale`);
  } else if (metaFrac === 0) {
    avisos.push("meta de 0%: agenda sem nenhuma falta não existe. Confira se você não quis dizer 5%");
  }

  const faltasMetaPeriodo = br.centavos(base * metaFrac);
  const custoMetaPeriodo = temTicket ? br.centavos(faltasMetaPeriodo * ticket) : null;
  const custoMeta = temTicket ? br.centavos(custoMetaPeriodo * fatorMes) : null;
  const ganhoMes = temTicket ? br.centavos(custoMes - custoMeta) : null;
  const ganhoAno = temTicket ? br.centavos(ganhoMes * 12) : null;
  const faltasMeta = agendadosMes * metaFrac;
  const sinal = temTicket && Number.isFinite(sinalPct) ? br.centavos(ticket * sinalPct / 100) : null;
  return { base, faltas, taxa, fatorMes, agendadosMes, faltasMes, ticket: temTicket ? ticket : null, custoPeriodo, custoMes, custoAno, meta: metaFrac, faltasMetaPeriodo, custoMetaPeriodo, custoMeta, faltasMeta, ganhoMes, ganhoAno, sinalPct: sinal !== null ? sinalPct : null, sinal, avisos };
}

// ─────────────────────────── saída ───────────────────────────

const um = (n, casas = 1) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });

function relatorio(r, extra = {}) {
  const L = [];
  const hoje = br.iso(new Date());
  L.push(`# No-show medido — ${hoje}`, "");
  if (extra.arquivo) {
    L.push(`Fonte: \`${extra.arquivo}\`, ${extra.linhasLidas} linhas` + (extra.inicio ? `, de ${br.fmt(extra.inicio)} a ${br.fmt(extra.fim)} (${extra.dias} dias)` : "") + ".");
  } else {
    L.push(`Fonte: contagem manual (${r.fatorMes === 1 ? "um mês" : "uma semana"}).`);
  }
  L.push("");
  // Uma tabela só, com a linha de total no formato que o verificar.js tabela
  // reconhece ("Total ..."), e nenhum rótulo em negrito com número dentro: era
  // o "8 dias" do rótulo antigo que ele casava com a soma de outra coluna.
  const tardio = extra.tardioConta !== false;
  L.push("## Contagem", "", "| Situação | Horários |", "|---|---|");
  if (extra.cont) {
    L.push(`| Compareceu | ${extra.cont.compareceu} |`);
    L.push(`| Faltou sem avisar | ${extra.cont.faltou} |`);
    if (tardio) L.push(`| Cancelou em cima da hora (conta como falta) | ${extra.cont.cancelou_tarde} |`);
  } else {
    L.push(`| Compareceu | ${r.base - r.faltas} |`, `| Faltou | ${r.faltas} |`);
  }
  L.push(`| **Total na base (compareceu + faltas)** | **${r.base}** |`, "");
  if (extra.cont) {
    const fora = [];
    if (!tardio && extra.cont.cancelou_tarde) fora.push(["cancelaram em cima da hora (tirados da base por --tardio-nao-conta)", extra.cont.cancelou_tarde]);
    if (extra.cont.cancelou) fora.push(["cancelaram com antecedência (o horário pôde ser reaproveitado)", extra.cont.cancelou]);
    if (extra.cont.aberto) fora.push(["ainda em aberto", extra.cont.aberto]);
    if (extra.cont.desconhecido) fora.push(["com status que o script não entendeu", extra.cont.desconhecido]);
    // Em prosa, e não numa segunda tabela: total de tabela vizinha com número
    // parecido faz o verificar.js tabela acusar divergência onde não há.
    if (fora.length) L.push(`Fora da base: ${fora.map(([nome, n]) => `${n} ${nome}`).join("; ")}.`, "");
  }

  const periodo = r.fatorMes === 1 ? "no mês" : extra.dias ? `em ${extra.dias} dias` : "na semana";
  const origemFator = extra.dias ? `30,44 ÷ ${extra.dias}` : "52 ÷ 12";
  L.push("## A conta", "");
  // A porcentagem sai sem negrito de propósito: "**20,4%**" perto de uma quebra
  // cuja coluna de faltas soma 30 faz o verificar.js tabela ler os dois como o
  // mesmo número e acusar divergência inexistente.
  L.push(`- **Taxa de no-show:** ${r.faltas} ÷ ${r.base} = ${br.pct(r.taxa, 1)}`);
  if (r.ticket !== null) {
    L.push(`- **Ticket médio:** ${br.reais(r.ticket)}${extra.ticketOrigem ? ` (${extra.ticketOrigem})` : ""}`);
    L.push(`- **Custo no período medido:** ${r.faltas} faltas × ${br.reais(r.ticket)} = ${br.reais(r.custoPeriodo)} (${periodo})`);
    if (r.fatorMes !== 1) {
      L.push(`- **Fator do mês:** ${origemFator} = ${um(r.fatorMes, 4)} — ${r.base} horários ${periodo} viram ${um(r.agendadosMes, 1)} por mês`);
      // A seta (e não o "=") na conversão pro mês é de propósito: "R$ 7.509,92 ×
      // 1,1273 = R$ 8.465,93" faz o verificar.js tabela ler "95" como quantidade
      // e acusar erro numa conta que está certa.
      L.push(`- **Custo por mês:** ${br.reais(r.custoPeriodo)} × ${um(r.fatorMes, 4)} → **${br.reais(r.custoMes)}**`);
    } else {
      L.push(`- **Custo por mês:** **${br.reais(r.custoMes)}** (o mesmo que ${um(r.agendadosMes, 0)} horários × ticket × taxa)`);
    }
    L.push(`- **Custo por ano:** 12 × ${br.reais(r.custoMes)} = ${br.reais(r.custoAno)}`);
    if (extra.ticketFaltas !== null && extra.ticketFaltas !== undefined && Math.abs(extra.ticketFaltas - r.ticket) / r.ticket > 0.1) {
      const lado = extra.ticketFaltas > r.ticket ? "mais caro" : "mais barato";
      L.push(`- **Atenção ao ticket:** quem faltou tinha horário ${lado} que a média — ${br.reais(extra.ticketFaltas)} contra ${br.reais(r.ticket)}. Somando o valor de cada falta, o período perdeu ${br.reais(br.centavos(extra.ticketFaltas * r.faltas))}. A quebra por serviço mostra onde`);
    }
  } else {
    L.push("- **Ticket médio:** [a confirmar] (passe --ticket ou uma coluna de valor; sem ele não há custo em reais)");
  }
  L.push("");
  L.push("## Meta", "");
  L.push(`- **Meta:** de ${br.pct(r.taxa, 1)} para ${br.pct(r.meta, 0)}: ${um(r.faltasMes, 1)} faltas/mês hoje, ${um(r.faltasMeta, 1)} na meta`);
  if (r.ticket !== null) {
    L.push(`- **Custo na meta, no período:** ${r.base} × ${br.pct(r.meta, 0)} = ${um(r.faltasMetaPeriodo, 2)} faltas × ${br.reais(r.ticket)} = ${br.reais(r.custoMetaPeriodo)}`);
    if (r.fatorMes !== 1) L.push(`- **Custo na meta, por mês:** ${br.reais(r.custoMetaPeriodo)} × ${um(r.fatorMes, 4)} → ${br.reais(r.custoMeta)}`);
    L.push(`- **Ganho por mês:** ${br.reais(r.custoMes)} − ${br.reais(r.custoMeta)} = **${br.reais(r.ganhoMes)}**`);
    L.push(`- **Ganho por ano:** 12 × ${br.reais(r.ganhoMes)} = **${br.reais(r.ganhoAno)}**`);
  }
  if (r.sinal !== null) L.push(`- **Sinal:** ${um(r.sinalPct, 0)}% do ticket = ${br.reais(r.sinal)}`);
  L.push("");
  if (r.avisos && r.avisos.length) {
    L.push("## Atenção à meta", "");
    for (const a of r.avisos) L.push(`- ${a}`);
    L.push("");
  }

  if (extra.quebras) {
    const blocos = [["diaSemana", "Por dia da semana", "Dia"], ["hora", "Por hora", "Hora"], ["servico", "Por serviço", "Serviço"], ["primeira", "Primeira vez × retorno", "Cliente"], ["antecedencia", "Por antecedência da marcação", "Marcado com"]];
    const ordemDia = br.DIAS;
    for (const [chave, titulo, col] of blocos) {
      const q = extra.quebras[chave];
      const nomes = Object.keys(q);
      if (nomes.length < 2) continue;
      nomes.sort((a, b) => chave === "diaSemana" ? ordemDia.indexOf(a) - ordemDia.indexOf(b)
        : chave === "hora" ? a.localeCompare(b)
        : chave === "antecedencia" ? FAIXAS_ANTECEDENCIA.indexOf(a) - FAIXAS_ANTECEDENCIA.indexOf(b)
        : q[b].faltas / q[b].base - q[a].faltas / q[a].base);
      L.push(`## ${titulo}`, "", `| ${col} | Base | Faltas | Taxa |`, "|---|---|---|---|");
      for (const n of nomes) L.push(`| ${n} | ${q[n].base} | ${q[n].faltas} | ${q[n].base ? br.pct(q[n].faltas / q[n].base, 0) : "—"} |`);
      const pior = nomes.filter((n) => q[n].base >= 5).sort((a, b) => q[b].faltas / q[b].base - q[a].faltas / q[a].base)[0];
      if (pior) L.push("", `Pior: ${pior} (${br.pct(q[pior].faltas / q[pior].base, 0)}, ${q[pior].faltas} de ${q[pior].base}).`);
      L.push("");
    }
  }
  const amostraPequena = r.base < 30 || (extra.dias && extra.dias < 14) || (r.fatorMes > 1 && !extra.dias && r.base < 30);
  if (amostraPequena) {
    L.push("## Atenção: amostra pequena", "", `${r.base} horários${extra.dias ? ` em ${extra.dias} dias` : ""} é pouco: uma falta a mais ou a menos muda a taxa em ${br.pct(1 / r.base, 1)}. Use o número como primeira leitura e conte pelo menos 4 semanas (30 horários ou mais) antes de fixar a meta.`);
    if (r.fatorMes > 1.5) L.push("", `O custo por mês e por ano aqui é uma projeção de ${extra.dias ? `${extra.dias} dias` : "uma semana"} multiplicada por ${um(r.fatorMes, 4)}. Não é número pra colocar em proposta nem em contrato antes da próxima medição.`);
    L.push("");
  }
  if (extra.desconhecidos && extra.desconhecidos.length) {
    L.push("## Atenção", "", `Status que o script não reconheceu e deixou fora da base: ${extra.desconhecidos.map((s) => `"${s}"`).join(", ")}. Se algum deles é falta ou comparecimento, renomeie na exportação e rode de novo.`, "");
  }
  L.push(`Conta reproduzível: \`node scripts/no-show.js ${(extra.comando || "").trim()}\``, "");
  return L.join("\n");
}

// ─────────────────────────── exemplo ───────────────────────────

function escreverExemplo(pasta) {
  fs.mkdirSync(pasta, { recursive: true });
  const arq = path.join(pasta, "agenda-exemplo.csv");
  const linhas = ["data;hora;cliente;servico;valor;primeira vez;marcado em;status"];
  const status = ["compareceu", "compareceu", "compareceu", "faltou", "compareceu", "cancelou", "compareceu", "faltou", "compareceu", "cancelou tarde", "compareceu", "compareceu"];
  const servicos = ["consulta", "retorno", "avaliação"];
  const horas = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
  let n = 0;
  const inicio = new Date(2026, 7, 3); // 03/08/2026 (seg)
  for (let d = 0; d < 28; d++) {
    const dia = br.mais(inicio, d);
    if (dia.getDay() === 0) continue;
    for (const h of horas.slice(0, dia.getDay() === 6 ? 4 : 8)) {
      const st = status[n % status.length];
      const primeira = n % 3 === 0 ? "sim" : "não";
      const marcado = br.mais(dia, -((n % 5) * 4 + 1));
      linhas.push([br.fmt(dia), h, `Cliente ${n + 1}`, servicos[n % 3], n % 3 === 1 ? "120,00" : "200,00", primeira, br.fmt(marcado), st].join(";"));
      n++;
    }
  }
  fs.writeFileSync(arq, linhas.join("\n") + "\n");
  console.log(`✔ exemplo em ${arq} (${linhas.length - 1} horários)`);
  console.log(`  rode: node scripts/no-show.js "${arq}" --meta 10`);
}

// ─────────────────────────── main ───────────────────────────

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const prox = argv[i + 1];
      if (["semana", "json", "tardio-conta", "tardio-nao-conta", "exemplo", "ajuda", "help"].includes(k)) o[k] = true;
      else if (prox !== undefined && !prox.startsWith("--")) { o[k] = prox; i++; }
      else o[k] = true;
    } else o._.push(a);
  }
  return o;
}

function main() {
  const o = args(process.argv.slice(2));
  if (o.ajuda || o.help || (!o._.length && !o.agendados && !o.exemplo)) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
    process.exit(o.ajuda || o.help ? 0 : 1);
  }
  if (o.exemplo) {
    const pasta = typeof o.exemplo === "string" ? o.exemplo : o._[0];
    if (!pasta) morrer("--exemplo precisa da pasta onde gravar o CSV", "ex.: node scripts/no-show.js --exemplo dados/");
    return escreverExemplo(pasta);
  }

  const ticketArg = o.ticket !== undefined ? br.numero(o.ticket) : NaN;
  if (o.ticket !== undefined && !(ticketArg > 0)) morrer(`--ticket precisa ser um valor em reais, recebi "${o.ticket}"`);
  const meta = o.meta !== undefined ? br.numero(o.meta) : undefined;
  if (o.meta !== undefined && !(meta >= 0 && meta < 100)) morrer(`--meta é uma porcentagem entre 0 e 99, recebi "${o.meta}"`);
  const sinalPct = o.sinal !== undefined ? br.numero(o.sinal) : undefined;
  if (o.sinal !== undefined && !(sinalPct > 0 && sinalPct <= 100)) morrer(`--sinal é uma porcentagem do ticket, recebi "${o.sinal}"`);

  let r, extra = {};
  if (o.agendados !== undefined) {
    const agendados = br.numero(o.agendados), faltas = br.numero(o.faltas);
    if (!Number.isInteger(agendados) || agendados <= 0) morrer(`--agendados precisa ser um inteiro maior que zero, recebi "${o.agendados}"`);
    if (!Number.isInteger(faltas) || faltas < 0) morrer(`--faltas precisa ser um inteiro (zero ou mais), recebi "${o.faltas}"`, "conte as faltas do mesmo período de --agendados");
    if (faltas > agendados) morrer(`--faltas (${faltas}) maior que --agendados (${agendados})`);
    r = calcular({ base: agendados, faltas, ticket: ticketArg, fatorMes: o.semana ? 52 / 12 : 1, meta, sinalPct });
    // A meta do comando é a que o script usou, não a que foi pedida: com --meta
    // acima da taxa medida ele troca pelo padrão, e o comando tem que repetir o
    // relatório de verdade.
    extra.comando = `--agendados ${agendados} --faltas ${faltas}${ticketArg > 0 ? ` --ticket ${ticketArg}` : ""}${o.semana ? " --semana" : ""}${meta !== undefined ? ` --meta ${um(r.meta * 100, 2)}` : ""}`;
  } else {
    const arquivo = o._[0];
    const { cabecalho, linhas } = lerTabela(arquivo);
    if (!linhas.length) morrer(`${arquivo} tem cabeçalho e nenhuma linha`);
    if (o["tardio-conta"] && o["tardio-nao-conta"]) morrer("--tardio-conta e --tardio-nao-conta juntos: escolha se cancelamento em cima da hora entra na base ou não");
    const a = analisarLinhas(cabecalho, linhas, { tardioConta: !o["tardio-nao-conta"] });
    const ticket = ticketArg > 0 ? ticketArg : a.ticketArquivo;
    const fatorMes = a.dias ? DIAS_POR_MES / a.dias : 1;
    r = calcular({ base: a.base, faltas: a.faltas, ticket, fatorMes, meta, sinalPct });
    extra = { arquivo, linhasLidas: a.linhasLidas, inicio: a.inicio, fim: a.fim, dias: a.dias, cont: a.cont, quebras: a.quebras, desconhecidos: a.desconhecidos, tardioConta: !o["tardio-nao-conta"], ticketFaltas: a.ticketFaltas };
    extra.ticketOrigem = ticketArg > 0 ? "informado por --ticket" : a.ticketArquivo ? "média da coluna de valor" : null;
    if (!a.dias) extra.aviso = "sem coluna de data: o período foi tratado como um mês";
    extra.comando = `"${arquivo}"${ticketArg > 0 ? ` --ticket ${ticketArg}` : ""}${meta !== undefined ? ` --meta ${um(r.meta * 100, 2)}` : ""}${o["tardio-nao-conta"] ? " --tardio-nao-conta" : ""}${sinalPct !== undefined ? ` --sinal ${sinalPct}` : ""}`;
  }

  if (o.json) {
    const js = JSON.stringify({ ...r, ...extra, inicio: extra.inicio ? br.iso(extra.inicio) : null, fim: extra.fim ? br.iso(extra.fim) : null }, null, 2);
    if (o.saida) {
      fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
      fs.writeFileSync(o.saida, js + "\n");
      console.log(`✔ JSON em ${o.saida}`);
    } else console.log(js);
    return;
  }
  const md = relatorio(r, extra);
  if (o.saida) {
    fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
    fs.writeFileSync(o.saida, md);
    console.log(`✔ relatório em ${o.saida}`);
  }
  console.log(md);
  if (extra.aviso) console.log(`\n⚠ ${extra.aviso}`);
  if (r.ticket === null) console.log("\n⚠ sem ticket não há custo em reais: rode de novo com --ticket <valor médio do horário>");
}

module.exports = { calcular, analisarLinhas, classificarStatus, mapearColunas, lerHora, relatorio, LEXICO, DIAS_POR_MES, FAIXAS_ANTECEDENCIA };

if (require.main === module) main();
