#!/usr/bin/env node
/**
 * Contex OS — custo-funcionario.js
 * Calcula quanto custa uma pessoa por mês e por ano, rubrica por rubrica, em
 * CLT (conforme o regime de quem contrata), como PJ e como MEI.
 *
 * Existe porque a conta de cabeça erra sempre nos mesmos lugares: soma 20% de
 * INSS patronal em empresa do Simples (que não paga, fora do Anexo IV), esquece
 * que FGTS e INSS também incidem sobre 13º e férias, ignora o RAT, e compara o
 * salário CLT com o valor da nota do PJ como se fossem a mesma coisa. Aqui cada
 * linha sai de uma alíquota com fonte e data, e o resultado já vai no formato
 * que o scripts/projecao.js consome em perguntas.contratar.custoMensal.
 *
 * Uso:
 *   node scripts/custo-funcionario.js --salario 3000 --regime simples --anexo III
 *   node scripts/custo-funcionario.js --salario 1621 --regime mei --cargo "atendente"
 *   node scripts/custo-funcionario.js --salario 4500 --regime presumido --rat 2 --transporte 260 --refeicao 600 --md pessoas/contratacao-designer.md
 *
 * Opções:
 *   --salario <valor>       salário bruto mensal CLT (obrigatório; aceita "3.000,00")
 *   --regime <r>            mei | simples | presumido | real (obrigatório)
 *   --anexo <I..V>          anexo do Simples (obrigatório quando --regime simples)
 *   --cargo <texto>         nome do cargo, só pro título
 *   --horas <n>             horas semanais (padrão 44; o salário informado é o dessa jornada)
 *   --rat <1|2|3>           risco da atividade (padrão 1); só pesa fora do Simples e no Anexo IV
 *   --fap <n>               fator acidentário, de 0,5 a 2 (padrão 1)
 *   --transporte <valor>    custo mensal das passagens; o script desconta os 6% do empregado
 *   --refeicao <valor>      vale-refeição ou alimentação, por mês (sem encargo)
 *   --saude <valor>         plano de saúde, por mês
 *   --outros <valor>        outro benefício fixo mensal
 *   --dependentes <n>       dependentes do empregado, pro IRRF (padrão 0)
 *   --permanencia <meses>   premissa da provisão de rescisão: saída sem justa causa depois de N meses (padrão 24)
 *   --sem-rescisao          não provisiona multa do FGTS nem aviso prévio
 *   --pj-imposto <pct>      imposto do prestador PJ sobre a nota (padrão 6: Anexo III, 1ª faixa)
 *   --pj-contador <valor>   contador do prestador PJ, por mês (padrão 0)
 *   --pj-nota <valor>       valor de nota já combinado; sem ele, o script calcula a nota equivalente ao CLT
 *   --folha12 <valor>       folha atual dos últimos 12 meses, pra recalcular o Fator R (com --receita12)
 *   --receita12 <valor>     receita bruta dos últimos 12 meses
 *   --ja-tem-empregado      quem contrata já tem um empregado (MEI só pode ter um)
 *   --md <arquivo.md>       grava o relatório em markdown
 *   --json                  imprime só os números
 *
 * Node 18+, sem dependência. Alíquotas em TABELAS, cada uma com fonte e data.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── alíquotas datadas ───────────────────────────
// Tudo aqui muda por lei ou por portaria. A skill manda reconferir antes de
// entregar; o molde é templates/operacao/custo-de-funcionario.md.

const TABELAS = {
  conferidoEm: "22/09/2026",
  salarioMinimo: { valor: 1621.0, fonte: "Decreto 12.797/2025, https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm" },
  fgts: { pct: 0.08, fonte: "Lei 8.036/1990, art. 15, https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm" },
  multaFgts: { pct: 0.40, fonte: "Lei 8.036/1990, art. 18, §1º" },
  decimoTerceiro: { fracao: 1 / 12, fonte: "Lei 4.090/1962, art. 1º, https://www.planalto.gov.br/ccivil_03/leis/l4090.htm" },
  ferias: { fracao: 1 / 12, terco: 1 / 36, fonte: "CF/88, art. 7º, XVII (férias + 1/3); CLT art. 129 e 130" },
  patronal: { pct: 0.20, fonte: "Lei 8.212/1991, art. 22, I, https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm" },
  rat: { pct: { 1: 0.01, 2: 0.02, 3: 0.03 }, fonte: "Lei 8.212/1991, art. 22, II; FAP de 0,5 a 2 pela Lei 10.666/2003, art. 10" },
  terceiros: { pct: 0.058, fonte: "salário-educação 2,5% + INCRA 0,2% + SESC 1,5% + SENAC 1% + SEBRAE 0,6% (FPAS 515, comércio e serviços), https://www.gov.br/pgfn/pt-br/cidadania-tributaria/por-assunto/tributacao-sobre-a-folhas-de-salarios-e-outras/contribuicoes-devidas-a-terceiros" },
  mei: { patronal: 0.03, dasServico: 86.05, tetoMensal: 6750, fonte: "LC 123/2006, art. 18-C, https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm; Portal do Empreendedor, https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/empregado-do-mei/qual-o-custo-para-contratacao" },
  simples: { fonte: "LC 123/2006, art. 13, VI e §3º (CPP dentro do DAS, exceto Anexo IV; dispensa de terceiros)" },
  valeTransporte: { descontoPct: 0.06, fonte: "Lei 7.418/1985, art. 4º, parágrafo único, https://www.planalto.gov.br/ccivil_03/leis/l7418.htm" },
  avisoPrevio: { fonte: "Lei 12.506/2011: 30 dias + 3 por ano de serviço, até 90" },
  inss: {
    // Portaria Interministerial MPS/MF 13, de 09/01/2026
    faixas: [[1621.0, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]],
    fonte: "Portaria Interministerial MPS/MF 13/2026, https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf",
  },
  irrf: {
    faixas: [[2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]],
    dependente: 189.59,
    simplificado: 607.20,
    redutor: { ate: 5000, fim: 7350, a: 978.62, b: 0.133145 },
    fonte: "Receita Federal, tabelas 2026 (Lei 15.191/2025 e Lei 15.270/2025), https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026",
  },
  proLaboreMinimo: { pct: 0.11, fonte: "INSS do sócio: 11% sobre o pró-labore, no mínimo um salário mínimo" },
};

const ANEXOS = ["I", "II", "III", "IV", "V"];
const REGIMES = ["mei", "simples", "presumido", "real"];

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
      if (v === undefined || (v.startsWith("--") && v.length > 2)) o[k] = true;
      else { o[k] = v; i++; }
    } else o._.push(a);
  }
  return o;
}

function num(v, nome, padrao) {
  if (v === undefined || v === true) {
    if (padrao !== undefined) return padrao;
    morrer(`falta --${nome}`, `ex.: --${nome} 3000`);
  }
  const n = br.numero(v);
  if (isNaN(n) || n < 0) morrer(`--${nome} não é número: ${JSON.stringify(v)}`, 'aceita "3.000,00", "3000" ou "3000.50"');
  return n;
}

const c2 = br.centavos;

// ─────────────────────────── descontos do empregado ───────────────────────────

/** INSS progressivo do empregado (soma por faixa, como a Portaria manda). */
function inssEmpregado(bruto) {
  let anterior = 0, total = 0;
  for (const [teto, aliq] of TABELAS.inss.faixas) {
    if (bruto <= anterior) break;
    total += (Math.min(bruto, teto) - anterior) * aliq;
    anterior = teto;
  }
  return c2(total);
}

/** IRRF mensal sobre salário, com desconto simplificado quando for melhor e o redutor da Lei 15.270/2025. */
function irrfEmpregado(bruto, inss, dependentes = 0) {
  const t = TABELAS.irrf;
  const legal = inss + dependentes * t.dependente;
  const base = Math.max(0, bruto - Math.max(legal, t.simplificado));
  const [, aliq, ded] = t.faixas.find(([lim]) => base <= lim);
  let imposto = Math.max(0, base * aliq - ded);
  let redutor = 0;
  if (bruto <= t.redutor.ate) redutor = imposto;
  else if (bruto <= t.redutor.fim) redutor = Math.min(imposto, Math.max(0, t.redutor.a - t.redutor.b * bruto));
  return { imposto: c2(imposto - redutor), redutor: c2(redutor), base: c2(base) };
}

function liquido(bruto, dependentes) {
  const inss = inssEmpregado(bruto);
  const ir = irrfEmpregado(bruto, inss, dependentes);
  return { bruto: c2(bruto), inss, irrf: ir.imposto, redutor: ir.redutor, liquido: c2(bruto - inss - ir.imposto) };
}

// ─────────────────────────── a conta ───────────────────────────

function calcular(e) {
  const T = TABELAS;
  const avisos = [];
  const regime = String(e.regime || "").toLowerCase();
  if (!REGIMES.includes(regime)) morrer(`--regime precisa ser um de: ${REGIMES.join(", ")}`);
  let anexo = e.anexo ? String(e.anexo).toUpperCase() : null;
  if (regime === "simples") {
    if (!anexo || !ANEXOS.includes(anexo)) morrer("--anexo é obrigatório no Simples (I, II, III, IV ou V)", "se o usuário não sabe, o contador sabe; sem isso a conta do INSS patronal não fecha");
  }
  const salario = e.salario;
  const horas = e.horas;
  if (horas <= 0 || horas > 44) morrer("--horas precisa ficar entre 1 e 44 (CF art. 7º, XIII: jornada máxima de 8h diárias e 44 semanais)");
  const divisor = horas * 5; // 220 pra 44h, 200 pra 40h, 180 pra 36h
  const rat = T.rat.pct[e.rat];
  if (!rat) morrer("--rat precisa ser 1, 2 ou 3");
  if (e.fap < 0.5 || e.fap > 2) morrer("--fap fica entre 0,5 e 2 (Lei 10.666/2003, art. 10)");

  // ── regras do MEI contratante ──
  if (regime === "mei") {
    if (e.jaTemEmpregado) morrer("MEI só pode ter um empregado (LC 123/2006, art. 18-C)", "o segundo desenquadra: rodar como --regime simples --anexo <o do contador> e levar pro /obrigacoes");
    if (Math.abs(salario - T.salarioMinimo.valor) > 0.01) {
      avisos.push(`MEI só pode pagar um salário mínimo (${br.reais(T.salarioMinimo.valor)}) ou o piso da categoria (LC 123, art. 18-C). O salário informado é ${br.reais(salario)}: só vale se for o piso [a confirmar na convenção coletiva]`);
    }
    if (horas < 44) avisos.push("jornada parcial no MEI: a lei fala em salário mínimo ou piso, e salário proporcional à jornada é tema pra confirmar com o contador antes de assinar");
  }

  // ── piso salarial: o mínimo é por hora, então jornada parcial tem piso proporcional ──
  const minimoHora = T.salarioMinimo.valor / 220;
  const salarioHora = salario / divisor;
  if (salarioHora < minimoHora - 0.005) {
    avisos.push(`salário abaixo do piso legal: ${br.reais(salario)} por ${horas}h semanais dá ${br.reais(c2(salarioHora))} a hora, e o mínimo de 2026 (${br.reais(T.salarioMinimo.valor)} por 44h) dá ${br.reais(c2(minimoHora))} a hora. Pra essa jornada o piso é ${br.reais(c2(T.salarioMinimo.valor * horas / 44))} (CF art. 7º, IV e VII; jornada parcial pelo art. 58-A da CLT). O piso da categoria pode ser maior [a confirmar na convenção coletiva]`);
  }

  // ── rubricas CLT ──
  const decimo = c2(salario * T.decimoTerceiro.fracao);
  const ferias = c2(salario * T.ferias.fracao);
  const terco = c2(salario * T.ferias.terco);
  const baseEncargos = c2(salario + decimo + ferias + terco); // FGTS e INSS incidem sobre 13º e férias também

  const fgts = c2(baseEncargos * T.fgts.pct);

  let patronalPct = 0, ratPct = 0, terceirosPct = 0, patronalNome = "";
  if (regime === "mei") { patronalPct = T.mei.patronal; patronalNome = "INSS patronal do MEI (3%)"; }
  else if (regime === "simples" && anexo !== "IV") { patronalPct = 0; patronalNome = "INSS patronal (já dentro do DAS no Anexo " + anexo + ")"; }
  else if (regime === "simples" && anexo === "IV") { patronalPct = T.patronal.pct; ratPct = rat * e.fap; patronalNome = "INSS patronal (Anexo IV recolhe por fora)"; }
  else { patronalPct = T.patronal.pct; ratPct = rat * e.fap; terceirosPct = T.terceiros.pct; patronalNome = "INSS patronal"; }

  const patronal = c2(baseEncargos * patronalPct);
  const ratValor = c2(baseEncargos * ratPct);
  const terceiros = c2(baseEncargos * terceirosPct);

  // ── provisão de rescisão (premissa: saída sem justa causa depois de N meses) ──
  let aviso = 0, fgtsAviso = 0, multa = 0;
  if (!e.semRescisao) {
    const anos = Math.floor(e.permanencia / 12);
    const diasAviso = Math.min(90, 30 + 3 * anos);
    aviso = c2((salario * diasAviso / 30) / e.permanencia);
    fgtsAviso = c2(aviso * T.fgts.pct);
    multa = c2((fgts + fgtsAviso) * T.multaFgts.pct);
  }
  const rescisao = c2(aviso + fgtsAviso + multa);

  // ── benefícios ──
  const vtEmpresa = e.transporte > 0 ? c2(Math.max(0, e.transporte - salario * T.valeTransporte.descontoPct)) : 0;
  const vtEmpregado = e.transporte > 0 ? c2(Math.min(e.transporte, salario * T.valeTransporte.descontoPct)) : 0;
  const beneficios = c2(vtEmpresa + e.refeicao + e.saude + e.outros);

  const encargos = c2(fgts + patronal + ratValor + terceiros);
  const provisoes = c2(decimo + ferias + terco);
  const custoMensal = c2(salario + provisoes + encargos + rescisao + beneficios);
  const custoAnual = c2(custoMensal * 12);
  const custoHora = c2(custoMensal / divisor);
  const multiplicador = custoMensal / salario;

  const rubricas = [
    { item: "Salário bruto", calculo: `jornada de ${horas}h semanais`, valor: salario },
    { item: "13º salário (provisão)", calculo: `1/12 de ${br.reais(salario)}`, valor: decimo },
    { item: "Férias (provisão)", calculo: `1/12 de ${br.reais(salario)}`, valor: ferias },
    { item: "1/3 de férias (provisão)", calculo: `1/36 de ${br.reais(salario)}`, valor: terco },
    { item: "FGTS", calculo: `8% sobre ${br.reais(baseEncargos)} (salário + 13º + férias)`, valor: fgts },
    { item: patronalNome, calculo: patronalPct ? `${br.pct(patronalPct, 0)} sobre ${br.reais(baseEncargos)}` : "0%: a CPP está na alíquota do DAS", valor: patronal },
  ];
  if (ratPct) rubricas.push({ item: `RAT ${e.rat}% × FAP ${String(e.fap).replace(".", ",")}`, calculo: `${br.pct(ratPct, 2)} sobre ${br.reais(baseEncargos)}`, valor: ratValor });
  if (terceirosPct) rubricas.push({ item: "Terceiros (Sistema S, salário-educação, INCRA)", calculo: `5,8% sobre ${br.reais(baseEncargos)}`, valor: terceiros });
  if (!e.semRescisao) {
    rubricas.push({ item: "Aviso prévio indenizado (provisão)", calculo: `${Math.min(90, 30 + 3 * Math.floor(e.permanencia / 12))} dias de salário ÷ ${e.permanencia} meses, mais 8% de FGTS`, valor: c2(aviso + fgtsAviso) });
    rubricas.push({ item: "Multa de 40% do FGTS (provisão)", calculo: `40% sobre ${br.reais(c2(fgts + fgtsAviso))} de FGTS do mês`, valor: multa });
  }
  if (vtEmpresa) rubricas.push({ item: "Vale-transporte (parte da empresa)", calculo: `${br.reais(e.transporte)} de passagens − 6% do salário (${br.reais(vtEmpregado)})`, valor: vtEmpresa });
  if (e.refeicao) rubricas.push({ item: "Vale-refeição/alimentação", calculo: "valor informado, sem encargo", valor: c2(e.refeicao) });
  if (e.saude) rubricas.push({ item: "Plano de saúde", calculo: "valor informado", valor: c2(e.saude) });
  if (e.outros) rubricas.push({ item: "Outros benefícios", calculo: "valor informado", valor: c2(e.outros) });

  // ── o que a pessoa recebe ──
  const mes = liquido(salario, e.dependentes);
  const mesFerias = liquido(salario + salario / 3, e.dependentes); // no mês de férias entra o terço inteiro
  const dec = liquido(salario, e.dependentes); // 13º tem tributação própria, mesma tabela
  const naConta = c2(mes.liquido * 11 + mesFerias.liquido + dec.liquido - vtEmpregado * 12);
  const noFgts = c2(fgts * 12);
  const totalPessoaAno = c2(naConta + noFgts);
  const pessoa = { mensal: mes, naContaAno: naConta, noFgtsAno: noFgts, totalAno: totalPessoaAno, vtDescontoMes: vtEmpregado };

  // ── PJ e MEI prestadores: a nota que deixa a pessoa com o mesmo dinheiro ──
  const alvoMes = c2(totalPessoaAno / 12);
  const pjImp = e.pjImposto / 100;
  if (pjImp >= 1) morrer("--pj-imposto é porcentagem da nota, menor que 100");
  const proLaboreInss = c2(T.salarioMinimo.valor * T.proLaboreMinimo.pct);
  const notaPj = c2((alvoMes + e.pjContador + proLaboreInss) / (1 - pjImp));
  const notaMei = c2(alvoMes + T.mei.dasServico);
  const meiCabe = notaMei <= T.mei.tetoMensal;
  const pj = {
    alvoMes,
    equivalente: { nota: notaPj, imposto: c2(notaPj * pjImp), contador: c2(e.pjContador), proLaboreInss, liquido: c2(notaPj - notaPj * pjImp - e.pjContador - proLaboreInss) },
    mei: { nota: notaMei, das: T.mei.dasServico, liquido: c2(notaMei - T.mei.dasServico), cabe: meiCabe, teto: T.mei.tetoMensal },
  };
  if (e.pjNota !== undefined) {
    const n = e.pjNota;
    pj.informada = {
      nota: c2(n),
      liquidoPj: c2(n - n * pjImp - e.pjContador - proLaboreInss),
      liquidoMei: c2(n - T.mei.dasServico),
      cabeMei: n <= T.mei.tetoMensal,
      diferencaParaClt: c2(custoMensal - n),
    };
  }
  if (!meiCabe) avisos.push(`a nota equivalente como MEI (${br.reais(notaMei)}) passa do teto mensal de ${br.reais(T.mei.tetoMensal)} (R$ 81.000 no ano): esse valor não cabe no MEI`);

  // ── Fator R (Simples, Anexos III e V) ──
  let fatorR = null;
  if (e.folha12 > 0 || e.receita12 > 0) {
    if (regime !== "simples" || (anexo !== "III" && anexo !== "V")) {
      avisos.push("--folha12 e --receita12 só servem pro Fator R, que existe no Simples, Anexos III e V (LC 123, art. 18, §5º-J). No regime informado eles não entraram na conta");
    } else if (e.receita12 <= 0) {
      avisos.push("--folha12 veio sem --receita12: o Fator R é folha ÷ receita dos últimos 12 meses, e sem a receita não dá pra calcular. Rodar de novo com os dois");
    } else if (e.folha12 <= 0) {
      avisos.push("--receita12 veio sem --folha12: a conta assumiu folha atual de zero, o que só vale se hoje não há salário nem pró-labore na empresa");
    }
  }
  if (e.receita12 > 0 && regime === "simples" && (anexo === "III" || anexo === "V")) {
    const folhaNova = c2((salario + provisoes + encargos) * 12);
    const folhaTotal = c2(e.folha12 + folhaNova);
    const r = folhaTotal / e.receita12;
    fatorR = { folhaAtual: c2(e.folha12), folhaNova, folhaTotal, receita12: c2(e.receita12), fatorR: r, cruza28: r >= 0.28 };
    if (anexo === "V" && r >= 0.28) avisos.push(`com essa contratação o Fator R vai a ${br.pct(r)}: acima de 28%, a atividade sai do Anexo V pro Anexo III (LC 123, art. 18, §5º-J). Isso pode reduzir o DAS mais do que a folha custa; pedir a conta ao contador`);
    if (anexo === "III" && r < 0.28) avisos.push(`Fator R em ${br.pct(r)}: se a atividade depende dos 28% pra ficar no Anexo III, ela cai pro Anexo V. Confirmar com o contador se o CNAE é dos que dependem do Fator R`);
  }

  return {
    entrada: { ...e, regime, anexo, divisor },
    rubricas, provisoes, encargos, rescisao, beneficios,
    custoMensal, custoAnual, custoHora, multiplicador,
    pessoa, pj, fatorR, avisos,
    tabelas: { conferidoEm: T.conferidoEm },
  };
}

// ─────────────────────────── relatório ───────────────────────────

function markdown(r) {
  const e = r.entrada;
  const T = TABELAS;
  const regimeNome = { mei: "MEI", simples: `Simples Nacional, Anexo ${e.anexo}`, presumido: "Lucro Presumido", real: "Lucro Real" }[e.regime];
  const out = [];
  out.push(`# Contratação — ${e.cargo || "cargo"}`);
  out.push("");
  out.push(`> Contratante: ${regimeNome}. Salário bruto de ${br.reais(e.salario)} por ${e.horas}h semanais. Alíquotas conferidas em ${T.conferidoEm}.`);
  out.push("> Não substitui contador nem advogado: convenção coletiva, piso e benefício obrigatório da categoria mudam a conta.");
  out.push("");
  out.push("## Resumo");
  out.push("");
  out.push(`- **Custo mensal em CLT:** ${br.reais(r.custoMensal)} (${r.multiplicador.toFixed(2).replace(".", ",")} vezes o salário)`);
  out.push(`- **Custo anual em CLT:** ${br.reais(r.custoAnual)}`);
  out.push(`- **Custo da hora:** ${br.reais(r.custoHora)} (${br.reais(r.custoMensal)} ÷ ${e.divisor} horas do mês)`);
  out.push(`- **O que cai na conta da pessoa:** ${br.reais(r.pessoa.mensal.liquido)} por mês (INSS ${br.reais(r.pessoa.mensal.inss)}, IRRF ${br.reais(r.pessoa.mensal.irrf)})`);
  out.push("");
  out.push("## Rubrica por rubrica (CLT)");
  out.push("");
  out.push("| Item | Cálculo (% × base) | Valor |");
  out.push("|---|---|---|");
  for (const l of r.rubricas) out.push(`| ${l.item} | ${l.calculo} | ${br.reais(l.valor)} |`);
  out.push(`| **Total por mês** | | **${br.reais(r.custoMensal)}** |`);
  out.push("");
  out.push(`Conta do ano: 12× ${br.reais(r.custoMensal)} = ${br.reais(r.custoAnual)}. As provisões (13º, férias, terço, rescisão) já estão diluídas no mês, então o ano é doze vezes o mês.`);
  out.push("");
  out.push("## CLT, PJ e MEI lado a lado");
  out.push("");
  out.push(`Pra comparar de verdade, a pergunta é: quanto a pessoa precisa faturar como PJ ou MEI pra ficar com o mesmo dinheiro que teria na CLT? Na CLT ela recebe ${br.reais(r.pessoa.naContaAno)} líquidos no ano (12 salários, 13º e terço de férias, descontados INSS e IRRF) mais ${br.reais(r.pessoa.noFgtsAno)} depositados no FGTS: ${br.reais(r.pessoa.totalAno)} no ano, ${br.reais(r.pj.alvoMes)} por mês.`);
  out.push("");
  out.push("| Indicador | CLT | PJ (Simples) | MEI |");
  out.push("|---|---|---|---|");
  out.push(`| Custo mensal pra quem contrata | ${br.reais(r.custoMensal)} | ${br.reais(r.pj.equivalente.nota)} | ${r.pj.mei.cabe ? br.reais(r.pj.mei.nota) : br.reais(r.pj.mei.nota) + " (não cabe: acima do teto)"} |`);
  out.push(`| Custo anual pra quem contrata | ${br.reais(r.custoAnual)} | ${br.reais(c2(r.pj.equivalente.nota * 12))} | ${br.reais(c2(r.pj.mei.nota * 12))} |`);
  out.push(`| O que a pessoa paga de imposto por mês | ${br.reais(c2(r.pessoa.mensal.inss + r.pessoa.mensal.irrf))} | ${br.reais(c2(r.pj.equivalente.imposto + r.pj.equivalente.proLaboreInss))} (${String(e.pjImposto).replace(".", ",")}% da nota + INSS do pró-labore) | ${br.reais(r.pj.mei.das)} (DAS fixo) |`);
  out.push(`| Fica pra pessoa por mês | ${br.reais(r.pessoa.mensal.liquido)} + FGTS | ${br.reais(r.pj.equivalente.liquido)} | ${br.reais(r.pj.mei.liquido)} |`);
  out.push(`| 13º, férias, FGTS, multa | a empresa paga | a pessoa guarda | a pessoa guarda |`);
  out.push(`| Aviso prévio e multa de 40% | sim | não (é contrato civil) | não |`);
  out.push("");
  if (r.pj.informada) {
    const i = r.pj.informada;
    out.push(`**Com a nota combinada de ${br.reais(i.nota)}:** custa ${br.reais(i.diferencaParaClt)} ${i.diferencaParaClt >= 0 ? "a menos" : "a mais"} por mês que a CLT; a pessoa fica com ${br.reais(i.liquidoPj)} como PJ no Simples ou ${br.reais(i.liquidoMei)} como MEI${i.cabeMei ? "" : " (não cabe no MEI: acima do teto mensal)"}.`);
    out.push("");
  }
  out.push("Premissas da coluna PJ: prestador no Simples, Anexo III, 1ª faixa (6% da nota) e INSS de 11% sobre um salário mínimo de pró-labore; contador do prestador " + (e.pjContador ? br.reais(e.pjContador) + " por mês" : "não incluído [a confirmar]") + ". Premissas da coluna MEI: DAS de serviços de " + br.reais(T.mei.dasServico) + " por mês e teto de R$ 81.000 por ano. Se a atividade não está na lista do MEI, essa coluna não existe.");
  out.push("");
  out.push("**Isso é comparação de custo, não permissão.** PJ que cumpre horário, recebe ordem, trabalha só pra você e todo mês é empregado com outro nome (CLT, art. 3º). O teste dos quatro sinais está em `templates/operacao/custo-de-funcionario.md`.");
  out.push("");
  if (r.fatorR) {
    const f = r.fatorR;
    out.push("## Fator R depois da contratação");
    out.push("");
    out.push(`Folha atual de 12 meses ${br.reais(f.folhaAtual)} + folha nova ${br.reais(f.folhaNova)} = ${br.reais(f.folhaTotal)}, sobre receita de ${br.reais(f.receita12)}: Fator R de ${br.pct(f.fatorR)} (${f.cruza28 ? "acima" : "abaixo"} dos 28%).`);
    out.push("");
  }
  out.push("## Pra levar pro /projecao");
  out.push("");
  out.push("```json");
  out.push(JSON.stringify({ perguntas: { contratar: { custoMensal: r.custoMensal.toFixed(2).replace(".", ","), descricao: `${e.cargo || "contratação"} em CLT, ${e.horas}h, com encargos e provisões (custo-funcionario.js, ${T.conferidoEm})` } } }, null, 2));
  out.push("```");
  out.push("");
  if (r.avisos.length) {
    out.push("## Avisos");
    out.push("");
    for (const a of r.avisos) out.push(`- ${a}`);
    out.push("");
  }
  out.push("## O que a conta permite decidir");
  out.push("");
  out.push(`1. [cabe ou não cabe, com o número do /caixa que sustenta: "sobra R$ X no último fechamento, a pessoa custa ${br.reais(r.custoMensal)}"]`);
  out.push("2. [se não cabe: quanta receita nova o custo pede, ou que jornada e benefício mudam a conta]");
  out.push("3. [a pergunta pronta pro contador: piso da categoria, RAT do CNAE e benefício obrigatório da convenção]");
  out.push("");
  out.push("## Premissas e fontes");
  out.push("");
  out.push(`- Provisão de rescisão: saída sem justa causa depois de ${e.permanencia} meses${e.semRescisao ? " (desligada com --sem-rescisao)" : ""}. Quem sai por pedido de demissão não gera multa nem aviso indenizado; a provisão é o cenário que custa`);
  out.push(`- FGTS e INSS incidem sobre salário, 13º e férias com o terço; por isso a base dos encargos é ${br.reais(c2(e.salario + r.provisoes))}, não o salário`);
  out.push(`- Salário mínimo 2026: ${br.reais(T.salarioMinimo.valor)} (${T.salarioMinimo.fonte})`);
  out.push(`- FGTS 8%: ${T.fgts.fonte}; multa de 40%: ${T.multaFgts.fonte}`);
  out.push(`- 13º: ${T.decimoTerceiro.fonte}; férias + 1/3: ${T.ferias.fonte}`);
  out.push(`- INSS patronal 20%: ${T.patronal.fonte}; RAT: ${T.rat.fonte}`);
  out.push(`- Terceiros 5,8%: ${T.terceiros.fonte}`);
  out.push(`- Simples: ${T.simples.fonte}`);
  out.push(`- MEI: ${T.mei.fonte}`);
  out.push(`- Vale-transporte: ${T.valeTransporte.fonte}`);
  out.push(`- INSS do empregado: ${T.inss.fonte}`);
  out.push(`- IRRF: ${T.irrf.fonte}`);
  out.push(`- Tudo conferido em ${T.conferidoEm}. Salário mínimo, tabela do INSS e do IRRF mudam em janeiro`);
  out.push("");
  out.push("## O que não dá pra afirmar ainda");
  out.push("");
  out.push("- [a confirmar com o contador] piso, benefício obrigatório e contribuição assistencial da convenção coletiva da categoria");
  out.push("- [a confirmar com o contador] o RAT e o FAP reais do CNAE, que mudam a linha do RAT fora do Simples");
  out.push("- [a confirmar] custo de contador, exame admissional, uniforme e equipamento, que entram como benefício ou custo fixo");
  out.push("");
  return out.join("\n");
}

function resumoTerminal(r) {
  const e = r.entrada;
  console.log(`\nCUSTO DE FUNCIONÁRIO — ${e.cargo || "cargo"} (${e.regime}${e.anexo ? " " + e.anexo : ""}, ${br.reais(e.salario)}, ${e.horas}h)`);
  console.log(`  custo mensal CLT: ${br.reais(r.custoMensal)}  (${r.multiplicador.toFixed(2).replace(".", ",")}× o salário)`);
  console.log(`  custo anual CLT:  ${br.reais(r.custoAnual)}`);
  console.log(`  custo da hora:    ${br.reais(r.custoHora)}`);
  console.log(`  líquido da pessoa: ${br.reais(r.pessoa.mensal.liquido)} por mês`);
  console.log(`  nota equivalente PJ: ${br.reais(r.pj.equivalente.nota)} | MEI: ${br.reais(r.pj.mei.nota)}${r.pj.mei.cabe ? "" : " (não cabe no MEI)"}`);
  console.log(`  projecao: "custoMensal": "${r.custoMensal.toFixed(2).replace(".", ",")}"`);
  for (const a of r.avisos) console.log(`  ⚠ ${a}`);
}

function main() {
  const a = args(process.argv.slice(2));
  if (a.ajuda || a.help || a.h) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").filter((l) => l.startsWith(" *")).map((l) => l.slice(3)).join("\n"));
    return;
  }
  const e = {
    salario: num(a.salario, "salario"),
    regime: a.regime,
    anexo: a.anexo,
    cargo: typeof a.cargo === "string" ? a.cargo : "",
    horas: num(a.horas, "horas", 44),
    rat: num(a.rat, "rat", 1),
    fap: num(a.fap, "fap", 1),
    transporte: num(a.transporte, "transporte", 0),
    refeicao: num(a.refeicao, "refeicao", 0),
    saude: num(a.saude, "saude", 0),
    outros: num(a.outros, "outros", 0),
    dependentes: num(a.dependentes, "dependentes", 0),
    permanencia: num(a.permanencia, "permanencia", 24),
    semRescisao: !!a["sem-rescisao"],
    pjImposto: num(a["pj-imposto"], "pj-imposto", 6),
    pjContador: num(a["pj-contador"], "pj-contador", 0),
    pjNota: a["pj-nota"] !== undefined ? num(a["pj-nota"], "pj-nota") : undefined,
    folha12: num(a.folha12, "folha12", 0),
    receita12: num(a.receita12, "receita12", 0),
    jaTemEmpregado: !!a["ja-tem-empregado"],
  };
  if (!a.regime) morrer("falta --regime (mei, simples, presumido ou real)", "é o regime de QUEM CONTRATA, não do contratado; muda o INSS patronal de 0% a 28,8%");
  if (e.salario <= 0) morrer("--salario precisa ser maior que zero");
  if (e.permanencia < 1) morrer("--permanencia em meses, no mínimo 1");
  if (!Number.isInteger(e.permanencia)) morrer("--permanencia é um número inteiro de meses", "ex.: --permanencia 24 (dois anos de casa)");
  if (!Number.isInteger(e.dependentes)) morrer("--dependentes é um número inteiro de pessoas", "ex.: --dependentes 2");
  if (a.md !== undefined && typeof a.md !== "string") morrer("--md precisa do caminho do arquivo", "ex.: --md pessoas/contratacao-atendente.md");

  const r = calcular(e);
  if (typeof a.md === "string") {
    fs.mkdirSync(path.dirname(path.resolve(a.md)), { recursive: true });
    fs.writeFileSync(a.md, markdown(r));
  }
  if (a.json) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  if (typeof a.md === "string") {
    resumoTerminal(r);
    console.log(`\n✔ gravado em ${a.md}`);
    console.log(`  conferir: node scripts/verificar.js tabela ${a.md}`);
  } else {
    console.log(markdown(r));
    resumoTerminal(r);
  }
}

module.exports = { TABELAS, calcular, markdown, inssEmpregado, irrfEmpregado, liquido };

if (require.main === module) main();
