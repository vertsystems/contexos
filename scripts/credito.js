#!/usr/bin/env node
/**
 * Contex OS — credito.js
 * Diz quanto um dinheiro emprestado custa de verdade: empréstimo do banco
 * (Price ou SAC, com IOF, tarifa e seguro), antecipação de recebível da
 * maquininha e compra parcelada com juros embutidos. Monta a tabela de
 * amortização de cada proposta, calcula o CET (Custo Efetivo Total) do jeito
 * que a Resolução CMN 4.881/2020 define, com TIR por bisseção sobre dias
 * corridos, e entrega a parcela pronta pra entrar como `extras` no
 * scripts/projecao.js.
 *
 * Existe porque CET é conta que chat erra e que o banco mostra só no fim: a
 * taxa "de 1,99% ao mês" vira 40% ao ano depois do IOF, da tarifa de cadastro
 * e do seguro que ninguém pediu. E a antecipação da maquininha, que o
 * comércio pega toda semana, quase nunca é convertida pra taxa anual.
 *
 * Uso:
 *   node scripts/credito.js <spec.credito.json>                    imprime a comparação em markdown
 *   node scripts/credito.js <spec.credito.json> --md <saida.md>    grava o markdown
 *   node scripts/credito.js <spec.credito.json> --xlsx <saida.xlsx> planilha com fórmula viva (usa gerar-planilha.js)
 *   node scripts/credito.js <spec.credito.json> --json             só os números, pra conferir por comando
 *   node scripts/credito.js <spec.credito.json> --extras [n]       parcelas da proposta n no formato "extras" do projecao.js
 *   node scripts/credito.js <spec.credito.json> --projecao <spec.projecao.json> [--proposta n] [--somar]
 *                                                                  escreve as parcelas nos "extras" da spec de projeção
 *                                                                  (tira o crédito que já estava lá; --somar mantém)
 *   node scripts/credito.js referencia                             taxa média de mercado (Banco Central, sem chave), pra comparar
 *   node scripts/credito.js --exemplo [arquivo.json]               spec de exemplo, pra editar
 *
 * O que a spec aceita (o exemplo mostra tudo):
 *   titulo        título do arquivo de saída
 *   tomador       "pf", "pj", "simples" (Simples Nacional ou MEI, operação até R$ 30.000) ou "nenhum" (sem IOF)
 *   liberacao     data em que o dinheiro cai, "DD/MM/AAAA" ou "AAAA-MM-DD" (padrão: hoje)
 *   folga         quanto sobra por mês antes da parcela: número, ou { "AAAA-MM": valor } (sai do /projecao, cenário pessimista)
 *   propostas     lista, cada uma com "nome" e "tipo":
 *     price / sac     valor, taxaMensal, parcelas, carenciaMeses (0), encargos [{ nome, valor,
 *                     quando: "inicio" | "financiado" | "parcela" }], iof (true, false ou o valor da proposta),
 *                     primeiraParcela ("DD/MM/AAAA" ou dias; sem ela, um mês depois da liberação mais a carência)
 *     parcelado       valorAVista, parcelas, parcela (o script descobre a taxa embutida), iof (padrão false),
 *                     primeiraParcela ("DD/MM/AAAA" ou dias; sem ela, um mês depois da liberação)
 *     antecipacao     recebiveis [{ valor, dias }] (valor já líquido da taxa da maquininha), taxaMensal (pro rata por dia),
 *                     taxaFixaPct (0), iof (padrão false: credenciadora não é banco)
 *
 * Números aceitam formato brasileiro: "30.000,00", "2,4". Cada linha da tabela é
 * arredondada ao centavo antes de somar; o Total bate ao centavo com as linhas
 * impressas, e o `node scripts/verificar.js tabela` confere isso depois.
 *
 * IOF: Decreto 6.306/2007 na redação do Decreto 12.499/2025 (efeitos
 * restabelecidos pelo STF na ADC 96, em 16/07/2025): 0,0082% ao dia sobre
 * cada amortização, limitado a 365 dias, mais 0,38% sobre o principal; Simples
 * Nacional e MEI em operação até R$ 30.000: 0,00274% ao dia. Conferido em
 * 22/09/2026 em planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/D12499.htm.
 * Se a proposta do banco traz o IOF em reais, esse valor manda: iof: "812,33".
 *
 * Node 18+, sem dependência. Usa br.js (datas, número) e gerar-planilha.js (xlsx).
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const br = require("./br.js");

const IOF = {
  conferidoEm: "2026-09-22",
  fonte: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/D12499.htm",
  adicional: 0.0038,
  diaria: { pf: 0.000082, pj: 0.000082, simples: 0.0000274 },
  tetoDias: 365,
};

// séries do SGS do Banco Central (taxa média, % ao ano, recursos livres)
const SERIES_BCB = [
  { id: 20725, nome: "PJ, capital de giro (total)" },
  { id: 20724, nome: "PJ, capital de giro rotativo" },
  { id: 20719, nome: "PJ, desconto de duplicatas e recebíveis" },
  { id: 20721, nome: "PJ, antecipação de faturas de cartão" },
  { id: 20727, nome: "PJ, cheque especial" },
  { id: 22020, nome: "PJ, cartão de crédito parcelado" },
  { id: 20748, nome: "PF, crédito pessoal (total)" },
  { id: 20741, nome: "PF, cheque especial" },
];

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

/** Flag que precisa de caminho: --md sozinho vira true e quebraria lá dentro, em inglês. */
function caminhoDe(v, flag, exemplo) {
  if (typeof v === "string" && v.trim()) return v;
  morrer(`${flag} precisa do nome do arquivo.`, `Assim: ${exemplo}`);
}

const cent = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const reais = (n) => (n < 0 ? "-" : "") + br.reais(Math.abs(n));
const pct = (fracao, casas = 2) => br.pct(fracao, casas);

function num(v, campo, { opcional = false } = {}) {
  if (v === undefined || v === null || v === "") {
    if (opcional) return undefined;
    morrer(`falta "${campo}"`);
  }
  const n = br.numero(v);
  if (isNaN(n)) morrer(`"${campo}" não é número: ${JSON.stringify(v)}`);
  return n;
}

/** Soma meses mantendo o dia (31/01 + 1 mês = 28/02). */
function maisMeses(d, n) {
  const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  return new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(d.getDate(), ultimo));
}

const chaveMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// ─────────────────────────── matemática financeira ───────────────────────────

/** Parcela fixa (Price): PV × i / (1 − (1+i)^−n). Com i = 0, PV / n. */
function parcelaPrice(pv, i, n) {
  if (i === 0) return pv / n;
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

/**
 * Raiz de f por bisseção. f precisa trocar de sinal entre lo e hi.
 * Devolve null se não troca (fluxo sem solução, ex.: total pago menor que o liberado).
 */
function bissecao(f, lo, hi, { tol = 1e-12, max = 300 } = {}) {
  let flo = f(lo), fhi = f(hi);
  if (isNaN(flo) || isNaN(fhi) || flo * fhi > 0) return null;
  for (let k = 0; k < max; k++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < tol || (hi - lo) / 2 < tol) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/**
 * CET anual pela fórmula da Resolução CMN 4.881/2020, art. 4º:
 *   FC0 = Σ FCj / (1 + CET)^(dj/365)
 * fluxos: [{ dias, valor }] com o que o tomador paga; liberado é FC0 (líquido de tarifa paga na hora).
 */
function cetAnual(liberado, fluxos) {
  const f = (r) => fluxos.reduce((s, x) => s + x.valor / Math.pow(1 + r, x.dias / 365), 0) - liberado;
  const r = bissecao(f, -0.9999, 1e6);
  return r;
}

/** Taxa mensal embutida numa série de n parcelas iguais sobre um valor à vista. */
function taxaEmbutida(pv, parcela, n) {
  if (parcela * n <= pv + 1e-9) return 0;
  const f = (i) => parcelaPrice(pv, i, n) - parcela;
  return bissecao(f, 1e-12, 10);
}

/**
 * IOF de operação parcelada com principal definido (Decreto 6.306/2007, art. 7º, I, "b", e § 15):
 * alíquota diária sobre o principal de cada parcela pelos dias até o vencimento (teto 365),
 * mais a alíquota adicional sobre o principal.
 */
function iofParcelado(amortizacoes, tomador) {
  const diaria = IOF.diaria[tomador];
  if (diaria === undefined) return 0;
  let v = 0;
  for (const a of amortizacoes) v += a.valor * diaria * Math.min(a.dias, IOF.tetoDias);
  const principal = amortizacoes.reduce((s, a) => s + a.valor, 0);
  return v + principal * IOF.adicional;
}

// ─────────────────────────── leitura da spec ───────────────────────────

function lerSpec(caminho) {
  if (!fs.existsSync(caminho)) morrer(`Não achei a spec: ${caminho}`, "Pra ver um exemplo: node scripts/credito.js --exemplo");
  let spec;
  try { spec = JSON.parse(fs.readFileSync(caminho, "utf8").replace(/^﻿/, "")); }
  catch (e) { morrer(`A spec não é JSON válido: ${e.message}`); }
  if (!Array.isArray(spec.propostas) || !spec.propostas.length) morrer(`A spec precisa de "propostas": [ { "nome", "tipo", ... } ]`);

  if (spec.tomador === undefined || spec.tomador === null || spec.tomador === "") morrer(`falta "tomador" na spec`, 'É o que define o IOF: "pf" pessoa física, "pj" empresa fora do Simples, "simples" Simples Nacional ou MEI em operação até R$ 30.000, "nenhum" quando a proposta já diz que não tem IOF.');
  const tomador = String(spec.tomador).toLowerCase();
  if (!["pf", "pj", "simples", "nenhum"].includes(tomador)) morrer(`"tomador" precisa ser "pf", "pj", "simples" ou "nenhum" (veio ${JSON.stringify(spec.tomador)})`, "pj é empresa fora do Simples; simples cobre Simples Nacional e MEI em operação até R$ 30.000; nenhum é pra quando a proposta já diz que não tem IOF.");

  const liberacao = spec.liberacao ? br.lerData(spec.liberacao) : new Date(new Date().setHours(0, 0, 0, 0));
  if (!liberacao) morrer(`"liberacao" não é data válida: ${JSON.stringify(spec.liberacao)}`);

  let folga = null;
  if (spec.folga !== undefined && spec.folga !== null) {
    if (typeof spec.folga === "object") {
      folga = {};
      for (const [k, v] of Object.entries(spec.folga)) {
        if (!/^\d{4}-\d{2}$/.test(k)) morrer(`"folga": chave "${k}" precisa ser AAAA-MM`);
        folga[k] = num(v, `folga.${k}`);
      }
    } else folga = num(spec.folga, "folga");
  }

  const propostas = spec.propostas.map((p, i) => lerProposta(p, i, tomador, liberacao));
  return { titulo: spec.titulo || "Crédito", tomador, liberacao, folga, folgaOrigem: spec.folgaOrigem || "", propostas };
}

function lerProposta(p, i, tomador, liberacao) {
  const rot = `propostas[${i}]`;
  const nome = p.nome || `Proposta ${i + 1}`;
  const tipo = String(p.tipo || "").toLowerCase();
  if (!["price", "sac", "parcelado", "antecipacao"].includes(tipo)) morrer(`${rot} "${nome}": "tipo" precisa ser price, sac, parcelado ou antecipacao (veio ${JSON.stringify(p.tipo)})`);

  const base = { nome, tipo, iofInformado: undefined, iofAplica: false, encargos: [] };
  if (p.iof === true) base.iofAplica = tomador !== "nenhum";
  else if (p.iof === false || p.iof === undefined) base.iofAplica = false;
  else { base.iofInformado = num(p.iof, `${rot}.iof`); base.iofAplica = true; }
  // empréstimo de banco tem IOF por padrão, a não ser que a spec diga o contrário
  if ((tipo === "price" || tipo === "sac") && p.iof === undefined) base.iofAplica = tomador !== "nenhum";

  for (const [k, e] of (p.encargos || []).entries()) {
    const quando = String(e.quando || "inicio").toLowerCase();
    if (!["inicio", "financiado", "parcela"].includes(quando)) morrer(`${rot}.encargos[${k}]: "quando" precisa ser inicio, financiado ou parcela`);
    base.encargos.push({ nome: e.nome || `Encargo ${k + 1}`, valor: num(e.valor, `${rot}.encargos[${k}].valor`), quando });
  }

  const primeira = (padraoDias) => {
    const v = p.primeiraParcela;
    if (v === undefined || v === null) return br.mais(liberacao, padraoDias);
    if (typeof v === "number" || /^\d+$/.test(String(v).trim())) return br.mais(liberacao, parseInt(v, 10));
    const d = br.lerData(v);
    if (!d) morrer(`${rot}.primeiraParcela: use dias (30) ou data "DD/MM/AAAA"`);
    if (d <= liberacao) morrer(`${rot}.primeiraParcela (${br.fmt(d)}) precisa ser depois da liberação (${br.fmt(liberacao)})`);
    return d;
  };

  if (tipo === "price" || tipo === "sac") {
    const n = num(p.parcelas, `${rot}.parcelas`);
    if (!Number.isInteger(n) || n < 1 || n > 600) morrer(`${rot}.parcelas precisa ser inteiro entre 1 e 600`);
    const carencia = num(p.carenciaMeses, `${rot}.carenciaMeses`, { opcional: true }) || 0;
    if (!Number.isInteger(carencia) || carencia < 0) morrer(`${rot}.carenciaMeses precisa ser inteiro, 0 ou mais`);
    const taxa = num(p.taxaMensal, `${rot}.taxaMensal`) / 100;
    if (taxa < 0 || taxa > 1) morrer(`${rot}.taxaMensal fora do razoável: ${p.taxaMensal}% ao mês`, "A taxa entra como está na proposta: 2,4 quer dizer 2,4% ao mês.");
    return { ...base, valor: num(p.valor, `${rot}.valor`), taxa, n, carencia, primeiraParcela: p.primeiraParcela === undefined ? maisMeses(liberacao, 1 + carencia) : primeira(30) };
  }
  if (tipo === "parcelado") {
    const n = num(p.parcelas, `${rot}.parcelas`);
    if (!Number.isInteger(n) || n < 1) morrer(`${rot}.parcelas precisa ser inteiro`);
    return { ...base, valorAVista: num(p.valorAVista, `${rot}.valorAVista`), parcela: num(p.parcela, `${rot}.parcela`), n, primeiraParcela: p.primeiraParcela === undefined ? maisMeses(liberacao, 1) : primeira(30) };
  }
  // antecipação
  if (!Array.isArray(p.recebiveis) || !p.recebiveis.length) morrer(`${rot} "${nome}": antecipação precisa de "recebiveis": [{ "valor", "dias" }]`);
  const recebiveis = p.recebiveis.map((r, k) => {
    const dias = num(r.dias, `${rot}.recebiveis[${k}].dias`);
    if (!Number.isInteger(dias) || dias < 1) morrer(`${rot}.recebiveis[${k}].dias precisa ser inteiro a partir de 1`);
    return { valor: num(r.valor, `${rot}.recebiveis[${k}].valor`), dias };
  });
  return { ...base, recebiveis, taxa: num(p.taxaMensal, `${rot}.taxaMensal`) / 100, taxaFixa: (num(p.taxaFixaPct, `${rot}.taxaFixaPct`, { opcional: true }) || 0) / 100 };
}

// ─────────────────────────── cálculo ───────────────────────────

function calcularEmprestimo(p, tomador, liberacao) {
  const encInicio = p.encargos.filter((e) => e.quando === "inicio").reduce((s, e) => s + e.valor, 0);
  const encFinanciado = p.encargos.filter((e) => e.quando === "financiado").reduce((s, e) => s + e.valor, 0);
  const encParcela = p.encargos.filter((e) => e.quando === "parcela").reduce((s, e) => s + e.valor, 0);

  const datas = [];
  for (let j = 0; j < p.n; j++) datas.push(maisMeses(p.primeiraParcela, j));
  const dias = datas.map((d) => br.diasEntre(liberacao, d));

  // tabela em função do saldo financiado (principal + encargo financiado + IOF financiado)
  const tabela = (pvFinanciado) => {
    let saldo = cent(pvFinanciado * Math.pow(1 + p.taxa, p.carencia)); // carência capitaliza
    const juroCarencia = cent(saldo - pvFinanciado);
    const linhas = [];
    const fixa = p.tipo === "price" ? cent(parcelaPrice(saldo, p.taxa, p.n)) : null;
    const amortSac = p.tipo === "sac" ? cent(saldo / p.n) : null;
    for (let j = 0; j < p.n; j++) {
      const juros = cent(saldo * p.taxa);
      let amort = p.tipo === "price" ? cent(fixa - juros) : amortSac;
      if (j === p.n - 1) amort = saldo; // última parcela zera o saldo
      const saldoDepois = cent(saldo - amort);
      const parcela = cent(amort + juros + encParcela);
      linhas.push({ n: j + 1, data: datas[j], dias: dias[j], parcela, juros, amortizacao: amort, encargos: encParcela, saldo: saldoDepois });
      saldo = saldoDepois;
    }
    return { linhas, juroCarencia, parcelaFixa: fixa };
  };

  // IOF: informado na proposta, ou calculado; quando calculado, é financiado junto (ponto fixo)
  let iof = 0;
  let iofRegra = "não se aplica";
  if (p.iofAplica && p.iofInformado !== undefined) { iof = p.iofInformado; iofRegra = "valor informado na proposta"; }
  else if (p.iofAplica) {
    let anterior = -1;
    for (let k = 0; k < 20 && Math.abs(iof - anterior) > 0.005; k++) {
      anterior = iof;
      const t = tabela(p.valor + encFinanciado + iof);
      iof = cent(iofParcelado(t.linhas.map((l) => ({ valor: l.amortizacao, dias: l.dias })), tomador));
    }
    iofRegra = `${pct(IOF.diaria[tomador], 5)} ao dia sobre cada amortização (teto ${IOF.tetoDias} dias) + ${pct(IOF.adicional)} sobre o principal, financiado junto`;
  }

  const pvFinanciado = cent(p.valor + encFinanciado + iof);
  const t = tabela(pvFinanciado);
  const liberado = cent(p.valor - encInicio);
  const fluxos = t.linhas.map((l) => ({ dias: l.dias, valor: l.parcela }));
  const cet = cetAnual(liberado, fluxos);
  const totalPago = cent(t.linhas.reduce((s, l) => s + l.parcela, 0) + encInicio);
  const totais = {
    parcela: cent(t.linhas.reduce((s, l) => s + l.parcela, 0)),
    juros: cent(t.linhas.reduce((s, l) => s + l.juros, 0)),
    amortizacao: cent(t.linhas.reduce((s, l) => s + l.amortizacao, 0)),
    encargos: cent(t.linhas.reduce((s, l) => s + l.encargos, 0)),
  };
  return {
    nome: p.nome, tipo: p.tipo, valor: p.valor, liberado, pvFinanciado, taxa: p.taxa, n: p.n, carencia: p.carencia,
    encInicio, encFinanciado, encParcela, encargos: p.encargos, iof, iofRegra, juroCarencia: t.juroCarencia,
    parcelaFixa: t.parcelaFixa, linhas: t.linhas, totais, totalPago, custo: cent(totalPago - liberado),
    maiorParcela: Math.max(...t.linhas.map((l) => l.parcela)), primeira: t.linhas[0], ultima: t.linhas[t.linhas.length - 1],
    cetAnual: cet, cetMensal: cet === null ? null : Math.pow(1 + cet, 1 / 12) - 1, fluxos,
  };
}

function calcularParcelado(p, tomador, liberacao) {
  const taxa = taxaEmbutida(p.valorAVista, p.parcela, p.n);
  if (taxa === null) morrer(`"${p.nome}": não achei a taxa embutida de ${p.n}× de ${br.reais(p.parcela)} sobre ${br.reais(p.valorAVista)}`, "Confira o preço à vista, o valor da parcela e o número de parcelas: um deles está trocado de campo.");
  const datas = [];
  for (let j = 0; j < p.n; j++) datas.push(maisMeses(p.primeiraParcela, j));
  let saldo = p.valorAVista;
  const linhas = [];
  for (let j = 0; j < p.n; j++) {
    const juros = cent(saldo * taxa);
    let amort = cent(p.parcela - juros);
    if (j === p.n - 1) amort = saldo;
    const parcela = j === p.n - 1 ? cent(amort + juros) : p.parcela;
    const saldoDepois = cent(saldo - amort);
    linhas.push({ n: j + 1, data: datas[j], dias: br.diasEntre(liberacao, datas[j]), parcela, juros, amortizacao: amort, encargos: 0, saldo: saldoDepois });
    saldo = saldoDepois;
  }
  let iof = 0, iofRegra = "não se aplica (preço parcelado pela loja não é operação de banco; se for parcelamento de fatura ou crédito do cartão, informar o IOF da proposta)";
  if (p.iofAplica && p.iofInformado !== undefined) { iof = p.iofInformado; iofRegra = "valor informado na proposta"; }
  else if (p.iofAplica) { iof = cent(iofParcelado(linhas.map((l) => ({ valor: l.amortizacao, dias: l.dias })), tomador)); iofRegra = `${pct(IOF.diaria[tomador], 5)} ao dia + ${pct(IOF.adicional)}, pago na hora`; }
  const liberado = cent(p.valorAVista - iof);
  const fluxos = linhas.map((l) => ({ dias: l.dias, valor: l.parcela }));
  const cet = cetAnual(liberado, fluxos);
  const totais = {
    parcela: cent(linhas.reduce((s, l) => s + l.parcela, 0)),
    juros: cent(linhas.reduce((s, l) => s + l.juros, 0)),
    amortizacao: cent(linhas.reduce((s, l) => s + l.amortizacao, 0)),
    encargos: 0,
  };
  const totalPago = cent(totais.parcela + iof);
  return {
    nome: p.nome, tipo: "parcelado", valor: p.valorAVista, liberado, pvFinanciado: p.valorAVista, taxa, n: p.n, carencia: 0,
    encInicio: iof, encFinanciado: 0, encParcela: 0, encargos: [], iof, iofRegra, juroCarencia: 0, parcelaFixa: p.parcela,
    linhas, totais, totalPago, custo: cent(totalPago - p.valorAVista), maiorParcela: Math.max(...linhas.map((l) => l.parcela)),
    primeira: linhas[0], ultima: linhas[linhas.length - 1], cetAnual: cet, cetMensal: cet === null ? null : Math.pow(1 + cet, 1 / 12) - 1, fluxos,
  };
}

function calcularAntecipacao(p, tomador, liberacao) {
  const linhas = p.recebiveis.map((r, j) => {
    const desconto = cent(r.valor * p.taxa * (r.dias / 30) + r.valor * p.taxaFixa);
    return { n: j + 1, data: br.mais(liberacao, r.dias), dias: r.dias, valor: r.valor, desconto, recebe: cent(r.valor - desconto) };
  });
  const bruto = cent(linhas.reduce((s, l) => s + l.valor, 0));
  const descontoTotal = cent(linhas.reduce((s, l) => s + l.desconto, 0));
  let iof = 0, iofRegra = "não se aplica (antecipação pela credenciadora é compra de recebível; num banco, como desconto de recebíveis, tem IOF: informar o valor da proposta)";
  if (p.iofAplica && p.iofInformado !== undefined) { iof = p.iofInformado; iofRegra = "valor informado na proposta"; }
  else if (p.iofAplica) { iof = cent(iofParcelado(linhas.map((l) => ({ valor: l.recebe, dias: l.dias })), tomador)); iofRegra = `${pct(IOF.diaria[tomador], 5)} ao dia + ${pct(IOF.adicional)} sobre o líquido entregue de cada recebível, descontado na hora`; }
  const liberado = cent(bruto - descontoTotal - iof);
  const fluxos = linhas.map((l) => ({ dias: l.dias, valor: l.valor }));
  const cet = cetAnual(liberado, fluxos);
  const diasMedio = linhas.reduce((s, l) => s + l.valor * l.dias, 0) / bruto;
  return {
    nome: p.nome, tipo: "antecipacao", valor: bruto, liberado, liberacao, taxa: p.taxa, taxaFixa: p.taxaFixa, n: linhas.length, linhas, iof, iofRegra,
    descontoTotal, totalPago: bruto, custo: cent(bruto - liberado), diasMedio,
    cetAnual: cet, cetMensal: cet === null ? null : Math.pow(1 + cet, 1 / 12) - 1, fluxos,
  };
}

function calcular(spec) {
  const resultados = spec.propostas.map((p) => {
    if (p.tipo === "antecipacao") return calcularAntecipacao(p, spec.tomador, spec.liberacao);
    if (p.tipo === "parcelado") return calcularParcelado(p, spec.tomador, spec.liberacao);
    return calcularEmprestimo(p, spec.tomador, spec.liberacao);
  });
  // parcela por mês (o que sai do caixa em cada mês), pra folga e pra extras
  for (const r of resultados) {
    const porMes = {};
    if (r.tipo === "antecipacao") {
      // o custo já foi pago na liberação; o que sai do caixa depois é o recebível que não vai mais cair
      for (const l of r.linhas) porMes[chaveMes(l.data)] = cent((porMes[chaveMes(l.data)] || 0) + l.valor);
    } else for (const l of r.linhas) porMes[chaveMes(l.data)] = cent((porMes[chaveMes(l.data)] || 0) + l.parcela);
    r.porMes = porMes;
    r.aperta = [];
    if (spec.folga !== null && r.tipo !== "antecipacao") {
      for (const [mes, v] of Object.entries(porMes)) {
        const folga = typeof spec.folga === "number" ? spec.folga : spec.folga[mes];
        if (folga === undefined) continue;
        r.aperta.push({ mes, folga, parcela: v, sobra: cent(folga - v) });
      }
    }
  }
  const melhor = [...resultados].filter((r) => r.cetAnual !== null).sort((a, b) => a.cetAnual - b.cetAnual)[0] || null;
  return { resultados, melhor };
}

// ─────────────────────────── markdown ───────────────────────────

const mesCurto = (d) => `${br.MESES[d.getMonth()]}/${d.getFullYear()}`;
const tipoNome = { price: "empréstimo, Price (parcela fixa)", sac: "empréstimo, SAC (parcela decrescente)", parcelado: "compra parcelada", antecipacao: "antecipação de recebíveis" };
const fmtCet = (r) => (r.cetAnual === null ? "[sem solução]" : `${pct(r.cetMensal)} ao mês (${pct(r.cetAnual)} ao ano)`);

function markdown(spec, calc, referencia) {
  const { resultados, melhor } = calc;
  const out = [];
  out.push(`# Crédito: ${spec.titulo}`);
  out.push("");
  out.push(`> Tomador: ${{ pf: "pessoa física", pj: "empresa (fora do Simples)", simples: "Simples Nacional ou MEI, operação até R$ 30.000", nenhum: "sem IOF" }[spec.tomador]}. Liberação em ${br.fmt(spec.liberacao)}.`);
  out.push(`> IOF pela regra em vigor (Decreto 6.306/2007 na redação do Decreto 12.499/2025), conferida em ${IOF.conferidoEm}: ${IOF.fonte}`);
  out.push(`> CET pela fórmula da Resolução CMN 4.881/2020, sobre dias corridos. Não é consultoria financeira: a decisão é sua, e o contrato é o que vale.`);
  out.push("");

  out.push("## As propostas lado a lado");
  out.push("");
  out.push(`| Indicador | ${resultados.map((r) => r.nome).join(" | ")} |`);
  out.push(`|---|${resultados.map(() => "---").join("|")}|`);
  out.push(`| Tipo | ${resultados.map((r) => tipoNome[r.tipo]).join(" | ")} |`);
  out.push(`| Cai na conta hoje | ${resultados.map((r) => reais(r.liberado)).join(" | ")} |`);
  out.push(`| Taxa do contrato | ${resultados.map((r) => r.tipo === "parcelado" ? `${pct(r.taxa)} ao mês (embutida)` : `${pct(r.taxa)} ao mês`).join(" | ")} |`);
  out.push(`| IOF | ${resultados.map((r) => reais(r.iof)).join(" | ")} |`);
  out.push(`| Tarifa e seguro | ${resultados.map((r) => r.tipo === "antecipacao" ? reais(0) : reais(r.encInicio + r.encFinanciado + r.totais.encargos - (r.tipo === "parcelado" ? r.iof : 0))).join(" | ")} |`);
  out.push(`| Parcelas | ${resultados.map((r) => r.tipo === "antecipacao" ? `${plural(r.n, "recebível", "recebíveis")}, prazo médio ${r.diasMedio.toFixed(0)} dias` : `${r.n}× de ${r.tipo === "sac" ? `${reais(r.primeira.parcela)} a ${reais(r.ultima.parcela)}` : reais(r.parcelaFixa + (r.encParcela || 0))}`).join(" | ")} |`);
  out.push(`| Maior parcela | ${resultados.map((r) => r.tipo === "antecipacao" ? "n/a" : reais(r.maiorParcela)).join(" | ")} |`);
  out.push(`| Pago ao todo | ${resultados.map((r) => reais(r.totalPago)).join(" | ")} |`);
  out.push(`| Custo do dinheiro | ${resultados.map((r) => `${reais(r.custo)}${r.liberado > 0 ? ` (${pct(r.custo / r.liberado)} do liberado)` : ""}`).join(" | ")} |`);
  out.push(`| CET | ${resultados.map(fmtCet).join(" | ")} |`);
  out.push("");
  if (melhor && resultados.length > 1) out.push(`Menor CET: ${melhor.nome}, ${fmtCet(melhor)}. CET compara o preço do dinheiro; a parcela que cabe no mês é outra conta, abaixo.`);
  else if (melhor) out.push(`CET de ${melhor.nome}: ${fmtCet(melhor)}.`);
  out.push("");

  resultados.forEach((r, i) => {
    out.push(`## Proposta ${i + 1}: ${r.nome}`);
    out.push("");
    if (r.tipo === "antecipacao") {
      out.push(`- Recebíveis antecipados: ${reais(r.valor)} em ${plural(r.n, "lançamento", "lançamentos")}, prazo médio de ${r.diasMedio.toFixed(0)} dias`);
      out.push(`- Taxa de antecipação: ${pct(r.taxa)} ao mês, pro rata por dia${r.taxaFixa ? `, mais ${pct(r.taxaFixa)} fixo` : ""}`);
      out.push(`- Desconto cobrado: ${reais(r.descontoTotal)} · IOF: ${reais(r.iof)} (${r.iofRegra})`);
      out.push(`- Cai na conta hoje: ${reais(r.liberado)}`);
      out.push(`- CET: ${fmtCet(r)}`);
      out.push("");
      out.push("| Recebível (cairia em) | Dias | Valor do recebível | Desconto | Recebe hoje |");
      out.push("|---|---|---|---|---|");
      for (const l of r.linhas) out.push(`| ${l.n} (${br.fmt(l.data)}) | ${l.dias} | ${reais(l.valor)} | ${reais(l.desconto)} | ${reais(l.recebe)} |`);
      out.push(`| Total | | ${reais(r.valor)} | ${reais(r.descontoTotal)} | ${reais(cent(r.valor - r.descontoTotal))} |`);
      out.push("");
      if (r.iof) out.push(`A coluna "Recebe hoje" é antes do IOF. Tirando os ${reais(r.iof)} de IOF, cai na conta ${reais(r.liberado)}.`);
      if (r.iof) out.push("");
      return;
    }
    if (r.tipo === "parcelado") {
      out.push(`- Preço à vista: ${reais(r.valor)} · ${r.n}× de ${reais(r.parcelaFixa)}, a primeira em ${br.fmt(r.primeira.data)}`);
      out.push(`- Taxa embutida: ${pct(r.taxa)} ao mês${r.taxa === 0 ? " (sem juros: o custo, se existe, está no desconto à vista que a loja não deu)" : ""}`);
      out.push(`- IOF: ${reais(r.iof)} (${r.iofRegra})`);
    } else {
      out.push(`- Valor contratado: ${reais(r.valor)} · cai na conta: ${reais(r.liberado)}${r.encInicio ? ` (${reais(r.encInicio)} de encargo descontado na liberação)` : ""}`);
      out.push(`- Taxa do contrato: ${pct(r.taxa)} ao mês · ${r.n} parcelas mensais, a primeira em ${br.fmt(r.primeira.data)}${r.carencia ? ` · carência de ${plural(r.carencia, "mês", "meses")}, com juros de ${reais(r.juroCarencia)} somados ao saldo` : ""}`);
      out.push(`- IOF: ${reais(r.iof)} (${r.iofRegra})`);
      if (r.encFinanciado) out.push(`- Encargo financiado junto com o valor: ${reais(r.encFinanciado)} (${r.encargos.filter((e) => e.quando === "financiado").map((e) => e.nome).join(", ")})`);
      if (r.encParcela) out.push(`- Encargo em cada parcela: ${reais(r.encParcela)} (${r.encargos.filter((e) => e.quando === "parcela").map((e) => e.nome).join(", ")})`);
      out.push(`- Saldo financiado de verdade: ${reais(r.pvFinanciado)} (valor + encargo financiado + IOF)`);
    }
    out.push(`- CET: ${fmtCet(r)}`);
    out.push(`- Pago ao todo: ${reais(r.totalPago)} · custo do dinheiro: ${reais(r.custo)}`);
    out.push("");
    out.push("| Parcela nº (vence em) | Parcela | Juros | Amortização | Encargos |");
    out.push("|---|---|---|---|---|");
    for (const l of r.linhas) out.push(`| ${l.n} (${br.fmt(l.data)}) | ${reais(l.parcela)} | ${reais(l.juros)} | ${reais(l.amortizacao)} | ${reais(l.encargos)} |`);
    out.push(`| Total | ${reais(r.totais.parcela)} | ${reais(r.totais.juros)} | ${reais(r.totais.amortizacao)} | ${reais(r.totais.encargos)} |`);
    out.push("");
    if (r.n > 1) {
      const marcos = [...new Set([1, ...Array.from({ length: Math.floor(r.n / 6) }, (_, k) => (k + 1) * 6), r.n - 1].filter((k) => k >= 1 && k < r.n))].sort((a, b) => a - b);
      out.push("| Indicador | Valor |");
      out.push("|---|---|");
      for (const k of marcos) out.push(`| Falta pra quitar depois da parcela ${k} | ${reais(r.linhas[k - 1].saldo)} |`);
      out.push("");
      out.push("Quitar antes é pagar só esse saldo: os juros das parcelas que não venceram caem (CDC, art. 52, § 2º). A planilha traz o saldo depois de cada parcela.");
      out.push("");
    }
  });

  const comFolga = resultados.filter((r) => r.aperta.length);
  const antecipacoes = resultados.filter((r) => r.tipo === "antecipacao");
  // antecipação não tem parcela, mas tira receita dos meses seguintes: entra aqui mesmo
  // quando nenhuma proposta com parcela tem folga (o caso do comércio que só antecipa)
  if (comFolga.length || (spec.folga !== null && antecipacoes.length)) {
    out.push("## Onde aperta");
    out.push("");
    out.push(comFolga.length
      ? `Folga é o que sobra no mês antes da parcela${spec.folgaOrigem ? ` (${spec.folgaOrigem})` : ""}. Sobra negativa é mês em que a parcela come o caixa.`
      : `Folga é o que sobra no mês${spec.folgaOrigem ? ` (${spec.folgaOrigem})` : ""}. Antecipação não cria parcela: tira receita dos meses seguintes.`);
    out.push("");
    for (const r of comFolga) {
      out.push(`### ${r.nome}`);
      out.push("");
      const mostrar = r.aperta.slice(0, 12);
      const rotulo = (m) => `${br.MESES[parseInt(m.slice(5), 10) - 1]}/${m.slice(2, 4)}`;
      out.push(`| Indicador | ${mostrar.map((a) => rotulo(a.mes)).join(" | ")} |`);
      out.push(`|---|${mostrar.map(() => "---").join("|")}|`);
      out.push(`| Folga antes | ${mostrar.map((a) => reais(a.folga)).join(" | ")} |`);
      out.push(`| Parcela | ${mostrar.map((a) => reais(a.parcela)).join(" | ")} |`);
      out.push(`| Sobra | ${mostrar.map((a) => `${reais(a.sobra)}${a.sobra < 0 ? " (aperta)" : ""}`).join(" | ")} |`);
      out.push("");
      if (r.aperta.length > 12) out.push(`(primeiros 12 meses de ${r.aperta.length}; a leitura abaixo considera todos)`);
      const ruins = r.aperta.filter((a) => a.sobra < 0);
      const pior = ruins.length ? ruins.reduce((a, b) => (b.sobra < a.sobra ? b : a)) : null;
      out.push(pior ? `Aperta em ${plural(ruins.length, "mês", "meses")}: ${ruins.map((a) => rotulo(a.mes)).join(", ")}. O pior é ${rotulo(pior.mes)}, com ${reais(pior.sobra)}.` : "Não aperta em nenhum mês com essa folga.");
      out.push("");
    }
    for (const r of antecipacoes) {
      out.push(`### ${r.nome}`);
      out.push("");
      out.push(`Antecipação não tem parcela: o custo (${reais(r.custo)}) sai na hora, e ${reais(r.liberado)} entram em ${mesCurto(spec.liberacao)}. O aperto vem nos meses em que esse dinheiro não cai mais: ${r.linhas.map((l) => `${mesCurto(l.data)} recebe ${reais(l.valor)} a menos`).join(", ")}. Se a projeção conta com essa receita nesses meses, ela precisa sair de lá.`);
      out.push("");
    }
  }

  if (referencia && referencia.length) {
    out.push("## Referência de mercado");
    out.push("");
    out.push("Taxa média das operações novas, % ao ano, recursos livres, Banco Central (SGS). É a média do país: proposta acima dela pede uma segunda cotação.");
    out.push("");
    out.push("| Modalidade | Taxa média ao ano | Mês de referência | Série |");
    out.push("|---|---|---|---|");
    for (const s of referencia) out.push(`| ${s.nome} | ${s.valor === null ? "[sem dado]" : pct(s.valor / 100)} | ${s.data || ""} | ${s.id} |`);
    out.push("");
    out.push(`Fonte: https://api.bcb.gov.br/dados/serie/bcdata.sgs.<série>/dados/ultimos/1?formato=json, consultado em ${br.fmt(new Date())}.`);
    out.push("");
  }

  out.push("## Pra testar no /projecao");
  out.push("");
  out.push(`A parcela de cada proposta entra em \`extras\` da spec de projeção com \`node scripts/credito.js <spec> --projecao <spec.projecao.json> --proposta N\`. Aí os três cenários mostram em que mês o caixa fica mais baixo com a dívida.`);
  out.push("");
  out.push("## O que a conta permite decidir");
  out.push("");
  out.push("1. [qual proposta, com o CET e o custo em reais que sustentam a escolha]");
  out.push("2. [em que mês a parcela aperta, no cenário pessimista, e o que se faz nesse mês]");
  out.push("3. [o que pedir ao banco antes de assinar: seguro fora, tarifa negociada, carência]");
  out.push("");
  out.push("## O que não dá pra afirmar ainda");
  out.push("");
  out.push("[encargo que a proposta não mostrou, CET que o banco ainda não confirmou por escrito, folga que ainda é estimativa]");
  out.push("");
  return out.join("\n");
}

// ─────────────────────────── extras pro projecao.js ───────────────────────────

function extrasDe(r) {
  const lista = [];
  const brl = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (r.tipo === "antecipacao") {
    // entra líquido no mês da liberação (extra negativo é entrada) e sai dos meses em que cairia
    lista.push({ mes: chaveMes(r.liberacao), nome: `Crédito ${r.nome}, valor antecipado que entra (líquido do desconto)`, valor: "-" + brl(r.liberado) });
    for (const l of r.linhas) lista.push({ mes: chaveMes(l.data), nome: `Crédito ${r.nome}, recebível ${l.n}/${r.n} que não cai mais neste mês`, valor: brl(l.valor) });
    return lista;
  }
  for (const l of r.linhas) lista.push({ mes: chaveMes(l.data), nome: `Crédito ${r.nome}, parcela ${l.n}/${r.n}`, valor: brl(l.parcela) });
  return lista;
}

function escreverNaProjecao(caminho, r, { somar = false } = {}) {
  if (!fs.existsSync(caminho)) morrer(`Não achei a spec de projeção: ${caminho}`, "Gere com: node scripts/projecao.js --exemplo <arquivo.projecao.json>");
  let spec;
  try { spec = JSON.parse(fs.readFileSync(caminho, "utf8").replace(/^﻿/, "")); }
  catch (e) { morrer(`A spec de projeção não é JSON válido: ${e.message}`); }
  // Só uma proposta é contratada: por padrão sai todo lançamento que este script já
  // escreveu, senão testar a proposta 2 depois da 1 deixaria as duas dívidas na projeção.
  // --somar mantém as outras, pro caso raro de pegar dois créditos de uma vez.
  const meu = (e) => /^Crédito /.test(String(e.nome || ""));
  const daMesma = (e) => String(e.nome || "").startsWith(`Crédito ${r.nome},`);
  const antigos = (spec.extras || []).filter((e) => (somar ? daMesma(e) : meu(e)));
  const deOutras = [...new Set(antigos.filter((e) => !daMesma(e)).map((e) => String(e.nome).replace(/^Crédito /, "").split(",")[0]))];
  spec.extras = (spec.extras || []).filter((e) => !(somar ? daMesma(e) : meu(e)));
  const removidos = antigos.length;
  let novos = extrasDe(r);
  const inicio = spec.inicio ? String(spec.inicio) : null;
  const meses = spec.meses ? parseInt(spec.meses, 10) : null;
  let fora = 0;
  if (inicio && meses) {
    const [a, m] = inicio.split("-").map(Number);
    const fim = `${a + Math.floor((m - 1 + meses - 1) / 12)}-${String(((m - 1 + meses - 1) % 12) + 1).padStart(2, "0")}`;
    const dentro = novos.filter((e) => e.mes >= inicio && e.mes <= fim);
    fora = novos.length - dentro.length;
    novos = dentro; // o que cai fora do período não entra: a projeção não o veria mesmo
  }
  spec.extras.push(...novos);
  fs.writeFileSync(caminho, JSON.stringify(spec, null, 2) + "\n");
  return { adicionados: novos.length, removidos, fora, deOutras };
}

// ─────────────────────────── spec pro gerar-planilha.js ───────────────────────────

function specPlanilha(spec, calc) {
  const { resultados } = calc;
  const abas = [];
  abas.push({
    nome: "Comparação",
    colunas: [{ titulo: "Indicador", largura: 28 }, ...resultados.map((r) => ({ titulo: r.nome.slice(0, 30), largura: 26 }))],
    linhas: [
      ["Tipo", ...resultados.map((r) => tipoNome[r.tipo])],
      ["Cai na conta hoje", ...resultados.map((r) => ({ v: r.liberado, tipo: "moeda" }))],
      ["Taxa do contrato (ao mês)", ...resultados.map((r) => ({ v: r.taxa, tipo: "percentual" }))],
      ["IOF", ...resultados.map((r) => ({ v: r.iof, tipo: "moeda" }))],
      ["Total pago", ...resultados.map((r) => ({ v: r.totalPago, tipo: "moeda" }))],
      ["Custo do dinheiro", ...resultados.map((r) => ({ v: r.custo, tipo: "moeda" }))],
      ["CET ao mês", ...resultados.map((r) => ({ v: r.cetMensal === null ? 0 : r.cetMensal, tipo: "percentual" }))],
      ["CET ao ano", ...resultados.map((r) => ({ v: r.cetAnual === null ? 0 : r.cetAnual, tipo: "percentual" }))],
    ],
    filtro: false,
    congelar: true,
  });

  resultados.forEach((r, i) => {
    const nome = `${i + 1} ${r.nome}`.replace(/[\[\]*?/\\:']/g, " ").slice(0, 25).trim();
    if (r.tipo === "antecipacao") {
      abas.push({
        nome,
        colunas: [
          { titulo: "Nº", tipo: "inteiro" }, { titulo: "Cairia em", tipo: "data" }, { titulo: "Dias", tipo: "inteiro" },
          { titulo: "Valor do recebível", tipo: "moeda" }, { titulo: "Taxa ao mês", tipo: "percentual" }, { titulo: "Desconto", tipo: "moeda" }, { titulo: "Recebe hoje", tipo: "moeda" },
        ],
        linhas: r.linhas.map((l, k) => [l.n, br.iso(l.data), l.dias, l.valor, r.taxa, `=ROUND(D${k + 2}*E${k + 2}*C${k + 2}/30+D${k + 2}*${r.taxaFixa},2)`, `=D${k + 2}-F${k + 2}`]),
        totais: { "Valor do recebível": "soma", Desconto: "soma", "Recebe hoje": "soma" },
        filtro: false, congelar: true,
      });
      return;
    }
    // Price, SAC e parcelado: premissas em cima, tabela com fórmula viva
    const p = 2; // linha da primeira premissa (linha 1 é cabeçalho)
    const premissas = [
      ["Saldo financiado (valor + encargo financiado + IOF)", r.pvFinanciado],
      ["Taxa ao mês", { v: r.taxa, tipo: "percentual" }],
      ["Parcelas", { v: r.n, tipo: "inteiro" }],
      ["Carência (meses)", { v: r.carencia || 0, tipo: "inteiro" }],
      ["Encargo por parcela", r.encParcela || 0],
      ["Saldo após carência", `=ROUND(B${p}*(1+B${p + 1})^B${p + 3},2)`],
      ["Parcela fixa (Price)", r.tipo === "price" ? `=ROUND(IF(B${p + 1}=0,B${p + 5}/B${p + 2},B${p + 5}*B${p + 1}/(1-(1+B${p + 1})^(-B${p + 2}))),2)` : r.tipo === "parcelado" ? r.parcelaFixa : 0],
      ["Amortização fixa (SAC)", r.tipo === "sac" ? `=ROUND(B${p + 5}/B${p + 2},2)` : 0],
    ];
    const nomePrem = `${nome} prem`;
    abas.push({ nome: nomePrem, colunas: [{ titulo: "Premissa", largura: 44 }, { titulo: "Valor", tipo: "moeda" }], linhas: premissas, filtro: false, congelar: false });
    const P = `'${nomePrem}'`;
    const linhas = r.linhas.map((l, k) => {
      const n = k + 2, prev = k === 0 ? `${P}!$B$${p + 5}` : `G${n - 1}`;
      const ultima = k === r.linhas.length - 1;
      const juros = `=ROUND(${prev}*${P}!$B$${p + 1},2)`;
      const amort = ultima ? `=${prev}` : r.tipo === "sac" ? `=${P}!$B$${p + 7}` : `=ROUND(${P}!$B$${p + 6}-D${n},2)`;
      return [l.n, br.iso(l.data), `=D${n}+E${n}+F${n}`, juros, amort, `=${P}!$B$${p + 4}`, `=${prev}-E${n}`];
    });
    abas.push({
      nome,
      colunas: [
        { titulo: "Nº", tipo: "inteiro" }, { titulo: "Vencimento", tipo: "data" }, { titulo: "Parcela", tipo: "moeda" },
        { titulo: "Juros", tipo: "moeda" }, { titulo: "Amortização", tipo: "moeda" }, { titulo: "Encargos", tipo: "moeda" }, { titulo: "Saldo devedor", tipo: "moeda" },
      ],
      linhas,
      totais: { Parcela: "soma", Juros: "soma", Amortização: "soma", Encargos: "soma" },
      filtro: false, congelar: true, imprimir: "retrato",
    });
  });

  abas.push({
    nome: "Como usar",
    texto: [
      "# Como usar",
      "Cada proposta tem uma aba de premissas e uma tabela. Mude a taxa, o número de parcelas ou o encargo na aba de premissas e a tabela recalcula.",
      "O IOF e o CET da aba Comparação são valores calculados pelo script, não fórmula: mudou a premissa, gere de novo com node scripts/credito.js.",
      `Regra do IOF usada: ${pct(IOF.diaria[spec.tomador] || 0, 5)} ao dia sobre cada amortização (teto de 365 dias) mais ${pct(IOF.adicional)} sobre o principal, conferida em ${IOF.conferidoEm}.`,
      "CET pela Resolução CMN 4.881/2020: taxa anual que iguala o que caiu na conta ao valor presente de tudo que se paga, em dias corridos.",
    ],
  });
  return { titulo: `Crédito: ${spec.titulo}`, abas };
}

// ─────────────────────────── referência do Banco Central ───────────────────────────

function baixarJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "contexos-credito" }, timeout: 15000 }, (res) => {
      let corpo = "";
      res.on("data", (c) => (corpo += c));
      res.on("end", () => { try { resolve(JSON.parse(corpo)); } catch (e) { reject(new Error(`resposta inválida de ${url}`)); } });
    });
    req.on("timeout", () => { req.destroy(new Error("tempo esgotado")); });
    req.on("error", reject);
  });
}

async function referenciaBcb() {
  const saida = [];
  for (const s of SERIES_BCB) {
    try {
      const d = await baixarJson(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.id}/dados/ultimos/1?formato=json`);
      const u = Array.isArray(d) && d[0] ? d[0] : null;
      saida.push({ ...s, valor: u ? parseFloat(u.valor) : null, data: u ? u.data.slice(3) : null });
    } catch (e) {
      saida.push({ ...s, valor: null, data: null, erro: e.message });
    }
  }
  return saida;
}

// ─────────────────────────── exemplo ───────────────────────────

const EXEMPLO = {
  titulo: "Forno novo da padaria",
  tomador: "simples",
  liberacao: "01/10/2026",
  folga: { "2026-11": "4.200,00", "2026-12": "5.100,00", "2027-01": "2.300,00", "2027-02": "2.900,00" },
  folgaOrigem: "coluna Resultado do cenário pessimista em financeiro/projecao-2026-11.md",
  propostas: [
    {
      nome: "Banco A, capital de giro",
      tipo: "price",
      valor: "30.000,00",
      taxaMensal: "2,4",
      parcelas: 24,
      carenciaMeses: 0,
      encargos: [
        { nome: "Tarifa de cadastro", valor: "450,00", quando: "inicio" },
        { nome: "Seguro prestamista", valor: "38,00", quando: "parcela" },
      ],
      iof: true,
    },
    { nome: "Banco B, SAC 18 meses", tipo: "sac", valor: "30.000,00", taxaMensal: "2,1", parcelas: 18, iof: true },
    { nome: "Loja, 12x no cartão", tipo: "parcelado", valorAVista: "30.000,00", parcelas: 12, parcela: "2.980,00" },
    {
      nome: "Maquininha, antecipar novembro",
      tipo: "antecipacao",
      taxaMensal: "3,49",
      recebiveis: [{ valor: "10.000,00", dias: 30 }, { valor: "10.000,00", dias: 60 }, { valor: "10.000,00", dias: 90 }],
    },
  ],
};

// ─────────────────────────── main ───────────────────────────

async function main() {
  const o = args(process.argv.slice(2));

  if (o.exemplo !== undefined) {
    const destino = typeof o.exemplo === "string" ? o.exemplo : o._[0];
    const texto = JSON.stringify(EXEMPLO, null, 2) + "\n";
    if (destino) {
      if (fs.existsSync(destino)) morrer(`${destino} já existe.`, "Dê outro nome ou apague antes: spec que o usuário editou não se sobrescreve.");
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, texto);
      console.log(`✓ Exemplo gravado em ${destino}. Edite os números e rode: node scripts/credito.js ${destino}`);
    } else process.stdout.write(texto);
    return;
  }

  if (o._[0] === "referencia") {
    const ref = await referenciaBcb();
    console.log("\nTaxa média das operações novas, % ao ano, recursos livres (Banco Central, SGS)\n");
    for (const s of ref) console.log(`  ${s.nome.padEnd(42)} ${s.valor === null ? "[sem dado: " + (s.erro || "vazio") + "]" : pct(s.valor / 100).padStart(8)}   ${s.data || ""}   série ${s.id}`);
    console.log(`\n  Fonte: https://api.bcb.gov.br/dados/serie/bcdata.sgs.<série>/dados/ultimos/1?formato=json (${br.fmt(new Date())})`);
    console.log("  É média do país. Serve pra saber se a proposta está cara, não pra prometer taxa.\n");
    return;
  }

  const caminho = o._[0];
  if (!caminho) morrer("Falta a spec.", "Uso: node scripts/credito.js <spec.credito.json> [--md saida.md] [--xlsx saida.xlsx] [--json] [--extras n] [--projecao spec.projecao.json]\n  Exemplo pra editar: node scripts/credito.js --exemplo financeiro/credito-2026-10-01.credito.json");

  const spec = lerSpec(caminho);
  const calc = calcular(spec);

  if (o.json) {
    const limpo = calc.resultados.map((r) => ({ ...r, linhas: r.linhas.map((l) => ({ ...l, data: br.fmt(l.data) })), primeira: undefined, ultima: undefined }));
    process.stdout.write(JSON.stringify({ tomador: spec.tomador, liberacao: br.fmt(spec.liberacao), iof: IOF, propostas: limpo, melhor: calc.melhor ? calc.melhor.nome : null }, null, 2) + "\n");
    return;
  }

  const escolher = (v) => {
    if (v === true || v === undefined) {
      if (calc.resultados.length === 1) return calc.resultados[0];
      morrer("Diga qual proposta: --proposta N (ou --extras N)", `Há ${calc.resultados.length}: ${calc.resultados.map((r, i) => `${i + 1} = ${r.nome}`).join(", ")}`);
    }
    const n = parseInt(v, 10);
    if (!(n >= 1 && n <= calc.resultados.length)) morrer(`Proposta ${v} não existe (há ${calc.resultados.length})`);
    return calc.resultados[n - 1];
  };

  if (o.extras !== undefined) {
    process.stdout.write(JSON.stringify(extrasDe(escolher(o.extras)), null, 2) + "\n");
    return;
  }

  if (o.projecao) {
    const destino = caminhoDe(o.projecao, "--projecao", "node scripts/credito.js <spec.credito.json> --projecao financeiro/projecao-2026-11.projecao.json --proposta 2");
    const r = escolher(o.proposta);
    const res = escreverNaProjecao(destino, r, { somar: !!o.somar });
    console.log(`✓ ${plural(res.adicionados, "lançamento", "lançamentos")} de "${r.nome}" em extras de ${destino}${res.removidos ? ` (${plural(res.removidos, "lançamento anterior de crédito substituído", "lançamentos anteriores de crédito substituídos")})` : ""}.`);
    if (res.deOutras.length) console.log(`  Saíram também os lançamentos de ${res.deOutras.map((n) => `"${n}"`).join(" e ")}: só uma proposta é contratada, e duas na mesma projeção somariam dívida que não existe. Pra manter as duas, --somar.`);
    if (res.fora) console.log(`  ${plural(res.fora, "lançamento cai", "lançamentos caem")} depois do último mês da projeção e ${res.fora === 1 ? "ficou" : "ficaram"} de fora. A dívida é mais longa que a projeção: o caixa do fim ainda deve o resto.`);
    console.log(`  Agora: node scripts/projecao.js ${destino} --md <saida.md>`);
    return;
  }

  let referencia = null;
  if (o.referencia) {
    referencia = await referenciaBcb();
    const falhas = referencia.filter((s) => s.valor === null).length;
    if (falhas === referencia.length) { console.error("  (sem acesso ao Banco Central agora: a referência de mercado ficou de fora)"); referencia = null; }
  }

  const md = markdown(spec, calc, referencia);
  if (o.md) {
    const saida = caminhoDe(o.md, "--md", "node scripts/credito.js <spec.credito.json> --md financeiro/credito-2026-10-01.md");
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    fs.writeFileSync(saida, md);
    console.log(`✓ Comparação gravada em ${saida}`);
  }

  if (o.xlsx) {
    const saida = caminhoDe(o.xlsx, "--xlsx", "node scripts/credito.js <spec.credito.json> --xlsx financeiro/credito-2026-10-01.xlsx");
    const { gerar } = require("./gerar-planilha.js");
    const specPath = saida.replace(/\.xlsx$/i, "") + ".planilha.json";
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    fs.writeFileSync(specPath, JSON.stringify(specPlanilha(spec, calc), null, 2) + "\n");
    gerar(specPath, saida, { sobrescrever: !!o.sobrescrever });
  }

  if (!o.md && !o.xlsx) process.stdout.write(md);
  else {
    console.log("");
    for (const r of calc.resultados) console.log(`  ${r.nome.padEnd(34)} CET ${fmtCet(r).padEnd(30)} total ${reais(r.totalPago).padStart(15)}  custo ${reais(r.custo).padStart(14)}`);
    if (calc.melhor && calc.resultados.length > 1) console.log(`\n  Menor CET: ${calc.melhor.nome}. Confira com: node scripts/verificar.js tabela ${typeof o.md === "string" ? o.md : "<saida.md>"}`);
  }
}

module.exports = { parcelaPrice, bissecao, cetAnual, taxaEmbutida, iofParcelado, calcular, calcularEmprestimo, calcularParcelado, calcularAntecipacao, lerSpec, markdown, specPlanilha, extrasDe, maisMeses, IOF, SERIES_BCB };

if (require.main === module) main().catch((e) => morrer(e.message));
