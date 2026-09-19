#!/usr/bin/env node
/**
 * Contex OS — projecao.js
 * Projeta o caixa dos próximos meses em três cenários, por comando.
 *
 * Existe porque projeção feita de cabeça erra sempre pro mesmo lado: o
 * crescimento vira linha reta, a sazonalidade some, o custo variável não
 * acompanha a receita, e o "dá pra contratar" sai do faturamento em vez de
 * sair da margem. Aqui tudo é aritmética sobre as premissas escritas no JSON.
 * O que o script não recebe, ele não inventa: cenário sem premissa é erro.
 *
 * Uso:
 *   node scripts/projecao.js <spec.projecao.json>                  imprime a projeção em markdown
 *   node scripts/projecao.js <spec.projecao.json> --md <saida.md>  grava a projeção no arquivo
 *   node scripts/projecao.js <spec.projecao.json> --json           só os números, pra conferir por comando
 *   node scripts/projecao.js <spec.projecao.json> --planilha <saida.planilha.json>
 *                                                                  spec pro gerar-planilha.js, com fórmula viva
 *   node scripts/projecao.js --exemplo [arquivo.json]              spec de exemplo, pra editar
 *
 * O que a spec aceita (o exemplo mostra tudo):
 *   inicio           primeiro mês projetado, "AAAA-MM"
 *   meses            quantos meses (3 a 6; o script recusa fora disso)
 *   caixaInicial     o que está na conta hoje
 *   aReceber         o que já foi faturado e ainda vai cair (opcional; entra só na conta da reserva)
 *   custosFixos      número, ou lista [{ "nome", "valor" }] que o script soma
 *   variaveisPct     % da receita que vai embora em taxa, imposto, insumo, comissão
 *   retirada         o que o dono tira por mês
 *   sazonalidade     fator por mês do ano: { "12": 1.25, "01": 0.7 }; mês ausente é 1
 *   extras           gastos que não se repetem: [{ "mes": "AAAA-MM", "nome", "valor" }]
 *   cenarios         pessimista, base e otimista, cada um com "premissa" (obrigatória) e
 *                    ou "receitas" (lista, um valor por mês, já final) ou
 *                    "receitaInicial" + "crescimentoMensalPct" (o script aplica a sazonalidade)
 *   perguntas        opcional: contratar { custoMensal, descricao }, reajuste { aumentoPct, perdaClientesPct }
 *
 * Números aceitam formato brasileiro: "9.800,00", "12,5". Cada linha é
 * arredondada ao centavo antes de somar, então o Total bate ao centavo com as
 * linhas impressas: é o que o `node scripts/verificar.js tabela` confere depois.
 * A planilha gerada usa ARRED na mesma célula, pra dar o mesmo total.
 *
 * Node 18+, sem dependência.
 */

const fs = require("fs");
const path = require("path");

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const CENARIOS = ["pessimista", "base", "otimista"];

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

/** "9.800,00" → 9800; "12,5" → 12.5; 4200 → 4200; "R$ 1.200" → 1200 */
function numeroBR(v, campo) {
  if (typeof v === "number") return v;
  if (typeof v !== "string") morrer(`"${campo}" precisa ser número (veio ${JSON.stringify(v)})`);
  let s = v.replace(/R\$\s*/g, "").replace(/%/g, "").trim();
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/\.\d{3}(\D|$)/.test(s + " ")) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  if (isNaN(n)) morrer(`"${campo}" não é número: ${JSON.stringify(v)}`);
  return n;
}

/** 9800 → "R$ 9.800,00"; -1200 → "-R$ 1.200,00" (hífen ASCII: é o que o verificar.js lê como negativo) */
function reais(n) {
  const abs = Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "-" : "") + "R$ " + abs;
}

/** Arredonda ao centavo. Cada linha da tabela é arredondada antes de somar, pra
 * que o Total bata ao centavo com as linhas impressas (é o que o verificar.js
 * tabela e o leitor conferem), e a planilha faz o mesmo com ARRED. */
function cent(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function pct(n, casas = 1) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
}

function dec(n, casas = 1) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** "2026-10" → { ano: 2026, mes: 10 } */
function lerMes(s, campo) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(s || ""));
  if (!m) morrer(`"${campo}" precisa estar no formato AAAA-MM (veio ${JSON.stringify(s)})`);
  const mes = parseInt(m[2], 10);
  if (mes < 1 || mes > 12) morrer(`"${campo}": mês ${mes} não existe`);
  return { ano: parseInt(m[1], 10), mes };
}

function somaMeses({ ano, mes }, n) {
  const total = (mes - 1) + n;
  return { ano: ano + Math.floor(total / 12), mes: (total % 12) + 1 };
}

const chaveMes = ({ ano, mes }) => `${ano}-${String(mes).padStart(2, "0")}`;
const nomeMes = ({ mes }) => MESES[mes - 1][0].toUpperCase() + MESES[mes - 1].slice(1);
const curtoMes = ({ ano, mes }) => `${MESES_CURTO[mes - 1]}/${ano}`;

// ─────────────────────────── leitura da spec ───────────────────────────

function lerSpec(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`, "Gere um exemplo com: node scripts/projecao.js --exemplo");
  let spec;
  try { spec = JSON.parse(fs.readFileSync(arquivo, "utf8")); }
  catch (e) { morrer(`o JSON não abre: ${e.message}`); }

  const s = {};
  s.inicio = lerMes(spec.inicio, "inicio");
  s.meses = parseInt(spec.meses, 10);
  if (!(s.meses >= 3 && s.meses <= 6)) morrer(`"meses" precisa ficar entre 3 e 6 (veio ${spec.meses})`, "Menos de 3 não é projeção, é o mês que vem. Mais de 6 é chute: revise a cada fechamento do /caixa.");
  s.caixaInicial = numeroBR(spec.caixaInicial ?? 0, "caixaInicial");
  s.aReceber = spec.aReceber === undefined ? null : numeroBR(spec.aReceber, "aReceber");
  s.retirada = numeroBR(spec.retirada ?? 0, "retirada");
  s.variaveisPct = numeroBR(spec.variaveisPct ?? 0, "variaveisPct");
  if (s.variaveisPct < 0 || s.variaveisPct >= 100) morrer(`"variaveisPct" precisa ficar entre 0 e 99 (veio ${spec.variaveisPct})`);

  if (Array.isArray(spec.custosFixos)) {
    s.fixosLista = spec.custosFixos.map((c, i) => ({ nome: c.nome || `item ${i + 1}`, valor: numeroBR(c.valor, `custosFixos[${i}].valor`) }));
    s.fixos = s.fixosLista.reduce((a, c) => a + c.valor, 0);
  } else {
    s.fixosLista = null;
    s.fixos = numeroBR(spec.custosFixos ?? 0, "custosFixos");
  }

  s.sazonalidade = {};
  for (const [k, v] of Object.entries(spec.sazonalidade || {})) {
    const m = parseInt(k, 10);
    if (!(m >= 1 && m <= 12)) morrer(`sazonalidade: "${k}" não é um mês de 1 a 12`);
    s.sazonalidade[m] = numeroBR(v, `sazonalidade.${k}`);
  }

  s.extras = (spec.extras || []).map((e, i) => ({
    mes: chaveMes(lerMes(e.mes, `extras[${i}].mes`)),
    nome: e.nome || `extra ${i + 1}`,
    valor: numeroBR(e.valor, `extras[${i}].valor`),
  }));

  if (!spec.cenarios || typeof spec.cenarios !== "object") morrer(`faltou "cenarios"`, "São três, sempre: pessimista, base e otimista. Um cenário só não é projeção.");
  s.cenarios = {};
  for (const nome of CENARIOS) {
    const c = spec.cenarios[nome];
    if (!c) morrer(`faltou o cenário "${nome}"`, "Nunca apresentar um cenário só. Os três precisam existir, cada um com a própria premissa.");
    if (!c.premissa || !String(c.premissa).trim()) morrer(`o cenário "${nome}" está sem "premissa"`, "Cenário sem premissa escrita não existe. Diga o que precisa acontecer pra esse cenário se realizar.");
    const out = { premissa: String(c.premissa).trim() };
    if (Array.isArray(c.receitas)) {
      if (c.receitas.length !== s.meses) morrer(`o cenário "${nome}" tem ${c.receitas.length} receitas, e a projeção é de ${s.meses} meses`);
      out.receitas = c.receitas.map((r, i) => numeroBR(r, `cenarios.${nome}.receitas[${i}]`));
      out.modo = "lista";
    } else if (c.receitaInicial !== undefined) {
      out.receitaInicial = numeroBR(c.receitaInicial, `cenarios.${nome}.receitaInicial`);
      out.crescimentoMensalPct = numeroBR(c.crescimentoMensalPct ?? 0, `cenarios.${nome}.crescimentoMensalPct`);
      if (out.crescimentoMensalPct <= -100) morrer(`o cenário "${nome}" tem crescimento de ${out.crescimentoMensalPct}% ao mês; abaixo de -100% a receita fica negativa`);
      if (Math.abs(out.crescimentoMensalPct) > 50) console.error(`  aviso: o cenário "${nome}" varia ${out.crescimentoMensalPct}% ao mês. Composto por ${s.meses} meses dá ×${(Math.pow(1 + out.crescimentoMensalPct / 100, s.meses)).toFixed(2)}. Confira se a premissa sustenta isso.`);
      out.modo = "crescimento";
    } else morrer(`o cenário "${nome}" precisa de "receitas" (uma por mês) ou "receitaInicial" com "crescimentoMensalPct"`);
    s.cenarios[nome] = out;
  }

  s.perguntas = {};
  const p = spec.perguntas || {};
  if (p.contratar) {
    s.perguntas.contratar = {
      custoMensal: numeroBR(p.contratar.custoMensal, "perguntas.contratar.custoMensal"),
      descricao: p.contratar.descricao || "a contratação",
    };
  }
  if (p.reajuste) {
    s.perguntas.reajuste = {
      aumentoPct: numeroBR(p.reajuste.aumentoPct, "perguntas.reajuste.aumentoPct"),
      perdaClientesPct: numeroBR(p.reajuste.perdaClientesPct ?? 0, "perguntas.reajuste.perdaClientesPct"),
    };
  }
  s.titulo = spec.titulo || null;
  return s;
}

// ─────────────────────────── a conta ───────────────────────────

function calcular(s) {
  const margemFator = 1 - s.variaveisPct / 100;
  const meses = [];
  for (let i = 0; i < s.meses; i++) {
    const m = somaMeses(s.inicio, i);
    meses.push({ i, ...m, chave: chaveMes(m), nome: nomeMes(m), curto: curtoMes(m), fator: s.sazonalidade[m.mes] ?? 1 });
  }

  const cenarios = {};
  for (const nome of CENARIOS) {
    const c = s.cenarios[nome];
    let caixa = s.caixaInicial;
    const linhas = meses.map((m) => {
      const receita = cent(c.modo === "lista"
        ? c.receitas[m.i]
        : c.receitaInicial * Math.pow(1 + c.crescimentoMensalPct / 100, m.i) * m.fator);
      const variaveis = cent(receita * (s.variaveisPct / 100));
      const margem = cent(receita - variaveis);
      const extras = cent(s.extras.filter((e) => e.mes === m.chave).reduce((a, e) => a + e.valor, 0));
      const resultado = cent(margem - s.fixos - s.retirada - extras);
      caixa = cent(caixa + resultado);
      return { ...m, receita, variaveis, margem, fixos: s.fixos, retirada: s.retirada, extras, resultado, caixa };
    });
    const soma = (k) => cent(linhas.reduce((a, l) => a + l[k], 0));
    const n = linhas.length;
    cenarios[nome] = {
      premissa: c.premissa,
      linhas,
      totais: { receita: soma("receita"), variaveis: soma("variaveis"), margem: soma("margem"), fixos: soma("fixos"), retirada: soma("retirada"), extras: soma("extras"), resultado: soma("resultado") },
      receitaMedia: soma("receita") / n,
      resultadoMedio: soma("resultado") / n,
      caixaFinal: linhas[n - 1].caixa,
      caixaMinimo: Math.min(...linhas.map((l) => l.caixa)),
      mesCaixaMinimo: linhas.reduce((a, l) => (l.caixa < a.caixa ? l : a), linhas[0]),
      primeiroNegativo: linhas.find((l) => l.caixa < 0) || null,
    };
  }

  const equilibrio = {
    margemPct: margemFator * 100,
    estrutura: margemFator > 0 ? s.fixos / margemFator : Infinity,
    dono: margemFator > 0 ? (s.fixos + s.retirada) / margemFator : Infinity,
  };
  for (const nome of CENARIOS) {
    cenarios[nome].mesesAbaixoDono = cenarios[nome].linhas.filter((l) => l.receita < equilibrio.dono).length;
  }

  const queima = s.fixos + s.retirada;
  const reserva = {
    queimaMensal: queima,
    meses: queima > 0 ? s.caixaInicial / queima : Infinity,
    mesesComAReceber: queima > 0 && s.aReceber !== null ? (s.caixaInicial + s.aReceber) / queima : null,
  };
  if (isFinite(reserva.meses)) {
    reserva.acabaEm = curtoMes(somaMeses(s.inicio, Math.max(0, Math.floor(reserva.meses))));
  }

  const perguntas = {};
  if (s.perguntas.contratar) {
    const custo = s.perguntas.contratar.custoMensal;
    const receitaExtra = margemFator > 0 ? custo / margemFator : Infinity;
    const por = {};
    for (const nome of CENARIOS) {
      const c = cenarios[nome];
      let caixa = s.caixaInicial;
      let minimo = Infinity;
      for (const l of c.linhas) { caixa = cent(caixa + l.resultado - custo); minimo = Math.min(minimo, caixa); }
      por[nome] = {
        mesesQuePagam: c.linhas.filter((l) => l.resultado >= custo).length,
        resultadoMedioDepois: c.resultadoMedio - custo,
        caixaFinalDepois: caixa,
        caixaMinimoDepois: minimo,
      };
    }
    perguntas.contratar = { ...s.perguntas.contratar, receitaExtraNecessaria: receitaExtra, por };
  }
  if (s.perguntas.reajuste) {
    const { aumentoPct, perdaClientesPct } = s.perguntas.reajuste;
    const fator = (1 + aumentoPct / 100) * (1 - perdaClientesPct / 100);
    const base = cenarios.base;
    const receitaAntes = base.receitaMedia;
    const receitaDepois = receitaAntes * fator;
    perguntas.reajuste = {
      aumentoPct, perdaClientesPct, fator,
      receitaAntes, receitaDepois,
      margemAntes: receitaAntes * margemFator,
      margemDepois: receitaDepois * margemFator,
      diferencaMensal: (receitaDepois - receitaAntes) * margemFator,
      perdaQueEmpata: (aumentoPct / (100 + aumentoPct)) * 100,
    };
  }

  return { meses, cenarios, equilibrio, reserva, perguntas, margemFator };
}

// ─────────────────────────── markdown ───────────────────────────

// A coluna de caixa acumulado fica fora desta tabela de propósito: ela não
// soma (é saldo), e o verificar.js tabela tentaria somar e acusaria erro.
// O caixa mês a mês vai numa tabela própria, com "Indicador" na primeira
// coluna, que é o que o verificador reconhece como não somável.
function tabelaCenario(c) {
  const cab = "| Mês | Receita | (-) Variáveis | = Margem | (-) Fixos | (-) Retirada | (-) Extras | = Resultado |";
  const sep = "|---|---|---|---|---|---|---|---|";
  const linhas = c.linhas.map((l) =>
    `| ${l.nome} | ${reais(l.receita)} | ${reais(l.variaveis)} | ${reais(l.margem)} | ${reais(l.fixos)} | ${reais(l.retirada)} | ${reais(l.extras)} | ${reais(l.resultado)} |`);
  const t = c.totais;
  const total = `| Total | ${reais(t.receita)} | ${reais(t.variaveis)} | ${reais(t.margem)} | ${reais(t.fixos)} | ${reais(t.retirada)} | ${reais(t.extras)} | ${reais(t.resultado)} |`;
  return [cab, sep, ...linhas, total].join("\n");
}

function tabelaCaixa(r) {
  const cab = `| Indicador | ${r.meses.map((m) => m.nome).join(" | ")} |`;
  const sep = `|---|${r.meses.map(() => "---").join("|")}|`;
  const linhas = CENARIOS.map((nome) => `| Caixa no fim, ${nome} | ${r.cenarios[nome].linhas.map((l) => reais(l.caixa)).join(" | ")} |`);
  return [cab, sep, ...linhas].join("\n");
}

function markdown(s, r) {
  const primeiro = r.meses[0];
  const ultimo = r.meses[r.meses.length - 1];
  const periodo = `${primeiro.curto} a ${ultimo.curto}`;
  const out = [];

  out.push(`# Projeção — ${periodo}`);
  out.push("");
  out.push(`Gerada por \`node scripts/projecao.js\` a partir das premissas abaixo. Revisar a cada fechamento do /caixa.`);
  out.push("");
  out.push("## Premissas");
  out.push("");
  out.push(`- Período: ${s.meses} meses, de ${primeiro.nome.toLowerCase()} de ${primeiro.ano} a ${ultimo.nome.toLowerCase()} de ${ultimo.ano}`);
  out.push(`- Caixa inicial: ${reais(s.caixaInicial)}${s.aReceber !== null ? ` (mais ${reais(s.aReceber)} a receber, contado só na reserva)` : ""}`);
  if (s.fixosLista) {
    out.push(`- Custos fixos: ${reais(s.fixos)} por mês (${s.fixosLista.map((c) => `${c.nome} ${reais(c.valor)}`).join(", ")})`);
  } else out.push(`- Custos fixos: ${reais(s.fixos)} por mês`);
  out.push(`- Custos variáveis: ${pct(s.variaveisPct)} da receita (margem de contribuição de ${pct(r.equilibrio.margemPct)})`);
  out.push(`- Retirada do dono: ${reais(s.retirada)} por mês`);
  const saz = Object.entries(s.sazonalidade);
  if (saz.length) out.push(`- Sazonalidade: ${saz.map(([m, f]) => `${MESES_CURTO[m - 1]} ×${dec(f, 2)}`).join(", ")} (aplicada só aos cenários por crescimento)`);
  else out.push("- Sazonalidade: nenhuma informada (todo mês vale 1)");
  if (s.extras.length) out.push(`- Gastos que não se repetem: ${s.extras.map((e) => `${e.nome} ${reais(e.valor)} em ${MESES_CURTO[parseInt(e.mes.slice(5), 10) - 1]}/${e.mes.slice(0, 4)}`).join(", ")}`);
  out.push("");

  out.push("## Ponto de equilíbrio mensal");
  out.push("");
  out.push(`- Da estrutura (só os fixos): ${reais(r.equilibrio.estrutura)} de receita por mês`);
  out.push(`- Do dono (fixos mais retirada): ${reais(r.equilibrio.dono)} de receita por mês. Abaixo disso o mês come caixa`);
  out.push(`- Conta: (${reais(s.fixos)} + ${reais(s.retirada)}) ÷ ${dec(r.margemFator, 4)}`);
  out.push("");

  for (const nome of CENARIOS) {
    const c = r.cenarios[nome];
    const cfg = s.cenarios[nome];
    const titulo = nome[0].toUpperCase() + nome.slice(1);
    out.push(`## Cenário ${titulo.toLowerCase()} (${periodo})`);
    out.push("");
    out.push(`Premissa: ${c.premissa}`);
    if (cfg.modo === "crescimento") {
      out.push("");
      out.push(`Receita: parte de ${reais(cfg.receitaInicial)} e varia ${pct(cfg.crescimentoMensalPct)} ao mês, vezes o fator de sazonalidade do mês.`);
    } else {
      out.push("");
      out.push("Receita: informada mês a mês, já com a sazonalidade que o dono conhece.");
    }
    out.push("");
    out.push(tabelaCenario(c));
    out.push("");
    const avisos = [];
    if (c.mesesAbaixoDono) avisos.push(`${c.mesesAbaixoDono} de ${c.linhas.length} meses ficam abaixo do ponto de equilíbrio do dono.`);
    else avisos.push("Nenhum mês fica abaixo do ponto de equilíbrio do dono.");
    if (c.primeiroNegativo) avisos.push(`O caixa fica negativo em ${c.primeiroNegativo.nome.toLowerCase()}: ${reais(c.primeiroNegativo.caixa)}.`);
    else avisos.push(`Caixa mais baixo: ${reais(c.caixaMinimo)}, em ${c.mesCaixaMinimo.nome.toLowerCase()}.`);
    out.push(`Leitura: ${avisos.join(" ")}`);
    out.push("");
  }

  out.push("## Caixa acumulado, mês a mês");
  out.push("");
  out.push(`Parte de ${reais(s.caixaInicial)} e soma o resultado de cada mês.`);
  out.push("");
  out.push(tabelaCaixa(r));
  out.push("");

  out.push("## Os três lado a lado");
  out.push("");
  out.push("| Indicador | Pessimista | Base | Otimista |");
  out.push("|---|---|---|---|");
  const c3 = CENARIOS.map((n) => r.cenarios[n]);
  out.push(`| Receita média por mês | ${c3.map((c) => reais(c.receitaMedia)).join(" | ")} |`);
  out.push(`| Resultado médio por mês | ${c3.map((c) => reais(c.resultadoMedio)).join(" | ")} |`);
  out.push(`| Caixa no fim do período | ${c3.map((c) => reais(c.caixaFinal)).join(" | ")} |`);
  out.push(`| Caixa mais baixo | ${c3.map((c) => reais(c.caixaMinimo)).join(" | ")} |`);
  out.push(`| Meses abaixo do equilíbrio do dono | ${c3.map((c) => `${c.mesesAbaixoDono} de ${c.linhas.length}`).join(" | ")} |`);
  out.push("");

  out.push("## Reserva: se parar de entrar");
  out.push("");
  out.push(`- Sai por mês, com receita zero: ${reais(r.reserva.queimaMensal)} (fixos mais retirada)`);
  if (isFinite(r.reserva.meses)) {
    out.push(`- Com ${reais(s.caixaInicial)} em caixa: ${dec(r.reserva.meses)} meses. O dinheiro acaba por volta de ${r.reserva.acabaEm}`);
    if (r.reserva.mesesComAReceber !== null) out.push(`- Contando o que está pra receber: ${dec(r.reserva.mesesComAReceber)} meses`);
  } else out.push("- Sem custo fixo nem retirada, o caixa não queima; a reserva não se aplica");
  out.push("");

  if (r.perguntas.contratar) {
    const q = r.perguntas.contratar;
    out.push(`## Posso contratar? (${q.descricao}, ${reais(q.custoMensal)} por mês)`);
    out.push("");
    out.push(`- Pra pagar essa contratação só com venda nova, precisa entrar ${reais(q.receitaExtraNecessaria)} a mais por mês (${reais(q.custoMensal)} ÷ ${dec(r.margemFator, 4)} de margem)`);
    out.push("");
    out.push("| Indicador | Pessimista | Base | Otimista |");
    out.push("|---|---|---|---|");
    const p3 = CENARIOS.map((n) => q.por[n]);
    out.push(`| Meses em que o resultado paga o custo | ${p3.map((p) => `${p.mesesQuePagam} de ${s.meses}`).join(" | ")} |`);
    out.push(`| Resultado médio depois da contratação | ${p3.map((p) => reais(p.resultadoMedioDepois)).join(" | ")} |`);
    out.push(`| Caixa mais baixo com a contratação | ${p3.map((p) => reais(p.caixaMinimoDepois)).join(" | ")} |`);
    out.push(`| Caixa no fim com a contratação | ${p3.map((p) => reais(p.caixaFinalDepois)).join(" | ")} |`);
    out.push("");
    const b = q.por.base;
    const pe = q.por.pessimista;
    if (b.resultadoMedioDepois >= 0 && pe.resultadoMedioDepois >= 0 && pe.caixaMinimoDepois >= 0) {
      out.push("Leitura: o resultado paga a contratação nos três cenários e o caixa não fica negativo em nenhum. Dá.");
    } else if (b.resultadoMedioDepois >= 0 && pe.caixaMinimoDepois >= 0) {
      out.push(`Leitura: no cenário base o resultado paga. No pessimista a contratação come ${reais(Math.abs(pe.resultadoMedioDepois))} por mês do caixa; a reserva segura o período, não além dele. Contratar é apostar que o pessimista não acontece, e vale escrever agora o que seria cortado se acontecer.`);
    } else if (b.caixaMinimoDepois >= 0) {
      out.push(`Leitura: cabe no cenário base, mas no pessimista o caixa fica negativo (${reais(pe.caixaMinimoDepois)} no pior mês). Sem reserva pra errar. Ou a receita sobe antes, ou a contratação entra menor.`);
    } else {
      out.push("Leitura: nem o cenário base sustenta. Antes de contratar, a receita precisa subir ou o custo fixo precisa cair.");
    }
    out.push("");
  }

  if (r.perguntas.reajuste) {
    const q = r.perguntas.reajuste;
    out.push(`## Se eu subir o preço em ${pct(q.aumentoPct)} e perder ${pct(q.perdaClientesPct)} dos clientes`);
    out.push("");
    out.push(`- Receita média do cenário base hoje: ${reais(q.receitaAntes)}. Depois do reajuste: ${reais(q.receitaDepois)} (fator ${dec(q.fator, 4)})`);
    out.push(`- Margem de contribuição por mês: ${reais(q.margemAntes)} hoje, ${reais(q.margemDepois)} depois. Diferença: ${reais(q.diferencaMensal)} por mês`);
    out.push(`- Perda de clientes que empata a conta: ${pct(q.perdaQueEmpata)}. Perdendo menos que isso, sobra mais; perdendo mais, sobra menos`);
    out.push("- Essa conta considera o custo variável proporcional à receita. Se parte dele é por volume (insumo, hora), a margem depois do reajuste fica melhor que o mostrado, não pior");
    out.push("");
    if (q.diferencaMensal >= 0) out.push(`Leitura: sobra mais. ${reais(q.diferencaMensal)} a mais por mês, atendendo ${pct(q.perdaClientesPct)} menos gente.`);
    else out.push(`Leitura: sobra menos. ${reais(Math.abs(q.diferencaMensal))} a menos por mês. Pra esse aumento compensar, a perda precisa ficar abaixo de ${pct(q.perdaQueEmpata)}.`);
    out.push("");
  }

  out.push("## O que a projeção permite decidir");
  out.push("");
  out.push("1. [decisão concreta, com o número do cenário que a sustenta]");
  out.push("2. [o que fazer se o pessimista começar a se realizar: qual sinal, em que mês, qual corte]");
  out.push("");
  out.push("## O que não dá pra afirmar ainda");
  out.push("");
  out.push("[premissa que ainda é chute, e o que anotar no próximo fechamento pra confirmar]");
  out.push("");
  return out.join("\n");
}

// ─────────────────────────── spec pro gerar-planilha.js ───────────────────────────

function specPlanilha(s, r) {
  const premissas = {
    nome: "Premissas",
    colunas: [{ titulo: "Premissa", largura: 34 }, { titulo: "Valor", tipo: "moeda" }],
    linhas: [
      ["Custos fixos por mês", s.fixos],
      ["Custos variáveis (fração da receita)", { v: s.variaveisPct / 100, tipo: "percentual" }],
      ["Retirada do dono por mês", s.retirada],
      ["Caixa inicial", s.caixaInicial],
    ],
    congelar: true,
    filtro: false,
  };
  // linhas: cabeçalho na 1, dado a partir da 2 → B2 fixos, B3 variáveis, B4 retirada, B5 caixa inicial
  const abas = [premissas];
  for (const nome of CENARIOS) {
    const c = r.cenarios[nome];
    const linhas = c.linhas.map((l, i) => {
      const n = i + 2;
      return [
        l.nome,
        Math.round(l.receita * 100) / 100,
        `=ROUND(B${n}*Premissas!$B$3,2)`,
        `=B${n}-C${n}`,
        `=Premissas!$B$2`,
        `=Premissas!$B$4`,
        Math.round(l.extras * 100) / 100,
        `=D${n}-E${n}-F${n}-G${n}`,
        i === 0 ? `=Premissas!$B$5+H${n}` : `=I${n - 1}+H${n}`,
      ];
    });
    abas.push({
      nome: nome[0].toUpperCase() + nome.slice(1),
      colunas: [
        { titulo: "Mês", largura: 12 },
        { titulo: "Receita", tipo: "moeda" },
        { titulo: "Variáveis", tipo: "moeda" },
        { titulo: "Margem", tipo: "moeda" },
        { titulo: "Fixos", tipo: "moeda" },
        { titulo: "Retirada", tipo: "moeda" },
        { titulo: "Extras", tipo: "moeda" },
        { titulo: "Resultado", tipo: "moeda" },
        { titulo: "Caixa no fim", tipo: "moeda" },
      ],
      linhas,
      totais: { Receita: "soma", Variáveis: "soma", Margem: "soma", Fixos: "soma", Retirada: "soma", Extras: "soma", Resultado: "soma" },
      congelar: true,
      filtro: false,
      imprimir: "paisagem",
    });
  }
  abas.push({
    nome: "Como usar",
    texto: [
      "# Como usar",
      "Mude a Receita de qualquer mês, ou uma premissa na aba Premissas, e o resultado e o caixa recalculam sozinhos.",
      "## Premissa de cada cenário",
      `Pessimista: ${r.cenarios.pessimista.premissa}.`,
      `Base: ${r.cenarios.base.premissa}.`,
      `Otimista: ${r.cenarios.otimista.premissa}.`,
      "A coluna Extras é o gasto que não se repete (imposto anual, equipamento). Digite no mês em que sai.",
      "Projeção se revisa a cada fechamento do mês. O que virou real substitui a premissa.",
    ],
  });
  return { titulo: s.titulo || `Projeção ${r.meses[0].curto} a ${r.meses[r.meses.length - 1].curto}`, abas };
}

// ─────────────────────────── exemplo ───────────────────────────

const EXEMPLO = {
  titulo: "Projeção out/2026 a mar/2027",
  inicio: "2026-10",
  meses: 6,
  caixaInicial: "18.000,00",
  aReceber: "4.200,00",
  custosFixos: [
    { nome: "Aluguel e condomínio", valor: "2.500,00" },
    { nome: "Contador", valor: "450,00" },
    { nome: "Sistemas e internet", valor: "380,00" },
    { nome: "Salário com encargos", valor: "3.900,00" },
  ],
  variaveisPct: "12,5",
  retirada: "5.000,00",
  sazonalidade: { "12": 1.25, "01": 0.7, "02": 0.8 },
  extras: [{ mes: "2026-11", nome: "Imposto anual", valor: "3.200,00" }],
  cenarios: {
    pessimista: {
      premissa: "os dois maiores clientes não renovam em janeiro e não entra cliente novo; receita cai 5% ao mês",
      receitaInicial: "20.000,00",
      crescimentoMensalPct: "-5",
    },
    base: {
      premissa: "carteira atual se mantém e entra um cliente novo a cada dois meses, como nos últimos seis fechamentos",
      receitaInicial: "22.000,00",
      crescimentoMensalPct: "2",
    },
    otimista: {
      premissa: "o lançamento de novembro converte 30 alunos a R$ 497 e a carteira cresce 5% ao mês",
      receitas: ["23.000,00", "37.910,00", "30.000,00", "21.000,00", "24.000,00", "26.000,00"],
    },
  },
  perguntas: {
    contratar: { custoMensal: "3.500,00", descricao: "assistente meio período, com encargos" },
    reajuste: { aumentoPct: "15", perdaClientesPct: "10" },
  },
};

// ─────────────────────────── main ───────────────────────────

function main() {
  const o = args(process.argv.slice(2));

  if (o.exemplo) {
    const destino = typeof o.exemplo === "string" ? o.exemplo : o._[0];
    const json = JSON.stringify(EXEMPLO, null, 2) + "\n";
    if (destino) {
      if (fs.existsSync(destino)) morrer(`${destino} já existe; não vou sobrescrever`);
      fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
      fs.writeFileSync(destino, json);
      console.log(`✓ exemplo gravado em ${destino}. Edite as premissas e rode: node scripts/projecao.js ${destino}`);
    } else process.stdout.write(json);
    return;
  }

  const arquivo = o._[0];
  if (!arquivo) morrer("faltou a spec", "Uso: node scripts/projecao.js <spec.projecao.json> [--md saida.md] [--json] [--planilha saida.planilha.json]\n  Exemplo pra editar: node scripts/projecao.js --exemplo financeiro/projecao-2026-10.projecao.json");

  const s = lerSpec(arquivo);
  const r = calcular(s);

  if (o.json) {
    process.stdout.write(JSON.stringify({ premissas: s, resultado: r }, null, 2) + "\n");
    return;
  }

  if (o.planilha) {
    const destino = typeof o.planilha === "string" ? o.planilha : arquivo.replace(/\.projecao\.json$/, "") + ".planilha.json";
    fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(specPlanilha(s, r), null, 2) + "\n");
    console.log(`✓ spec de planilha gravada em ${destino}. Gere com: node scripts/gerar-planilha.js ${destino}`);
  }

  const md = markdown(s, r);
  if (o.md) {
    const destino = typeof o.md === "string" ? o.md : arquivo.replace(/\.projecao\.json$/, "") + ".md";
    fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
    fs.writeFileSync(destino, md);
    console.log(`✓ projeção gravada em ${destino}`);
    console.log(`  agora confira: node scripts/verificar.js tabela ${destino}`);
  } else if (!o.planilha) {
    process.stdout.write(md);
  }

  // resumo curto no terminal, sempre que gravou arquivo
  if (o.md || o.planilha) {
    console.log("");
    console.log(`  equilíbrio do dono: ${reais(r.equilibrio.dono)}/mês · reserva: ${isFinite(r.reserva.meses) ? dec(r.reserva.meses) + " meses" : "não se aplica"}`);
    for (const nome of CENARIOS) {
      const c = r.cenarios[nome];
      console.log(`  ${nome.padEnd(10)} receita média ${reais(c.receitaMedia)} · resultado médio ${reais(c.resultadoMedio)} · caixa no fim ${reais(c.caixaFinal)}`);
    }
  }
}

main();
