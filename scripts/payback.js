#!/usr/bin/env node
/**
 * Contex OS — payback.js
 * A conta de uma compra de capital isolada: máquina, obra, segunda unidade,
 * estoque grande. Quanto precisa vender por mês pra ela se pagar, em quantos
 * meses o dinheiro volta em cada cenário, quanto sobra em 12 e em 24 meses, e
 * a partir de que ponto o certo é desistir.
 *
 * Existe porque "vale a pena?" aparece em toda conversa de forno novo, van,
 * cadeira a mais, e a resposta sai do faturamento bruto: "vendo 200 pães a
 * R$ 18, dá R$ 3.600, o forno custa 18 mil, pago em cinco meses". Não paga: o
 * que amortiza a compra é a margem de contribuição da venda nova, menos o
 * custo mensal que a compra traz (energia, manutenção, seguro, espaço), com a
 * sazonalidade no lugar. Aqui é aritmética sobre premissa escrita, e cenário
 * sem premissa é erro.
 *
 * Não é skill: o /projecao chama isso quando a pergunta é sobre uma compra
 * isolada, e o /decidir chama quando a compra é a decisão da semana. A saída
 * já sai na convenção do /decidir, com risco, marcos de 30/60/90 e volta-atrás.
 *
 * Uso:
 *   node scripts/payback.js <spec.payback.json>                 imprime o relatório em markdown
 *   node scripts/payback.js <spec.payback.json> --md            grava em decisoes/<data>-<slug>.md
 *   node scripts/payback.js <spec.payback.json> --md <arquivo>  grava onde você disser
 *   node scripts/payback.js <spec.payback.json> --json          só os números, pra conferir por comando
 *   node scripts/payback.js --exemplo [arquivo.json]            spec de exemplo, pra editar
 *
 * Opções:
 *   --projecao <arquivo>  usa essa projeção como contexto do negócio
 *   --sem-projecao        ignora o financeiro/, mesmo que exista projeção
 *   --sobrescrever        deixa gravar em cima de um arquivo de decisão que já existe
 *   --ajuda               mostra este cabeçalho
 *
 * A spec (o --exemplo escreve uma inteira):
 *   titulo               como a decisão se chama ("Forno de lastro novo")
 *   slug                 opcional; sem ele o nome do arquivo sai do título
 *   data                 dia da decisão, DD/MM/AAAA (padrão: hoje)
 *   inicio               primeiro mês depois da compra, "AAAA-MM" (padrão: o mês da data)
 *   horizonteMeses       até onde a conta vai (6 a 60; padrão 24)
 *   prazoAceitavelMeses  em quantos meses a compra precisa se pagar pro dono aceitar
 *   compra               { descricao, custoInicial, custoMensalNovo, oQueEOCustoMensal,
 *                          valorRevenda, vidaUtilMeses }
 *   venda                { nome, precoUnitario, custoVariavelPct } ou custoVariavelUnitario
 *   cenarios             pessimista, base e otimista, cada um com "premissa" (obrigatória) e
 *                        "unidadesMes" ou "receitaExtraMensal", mais "crescimentoMensalPct"
 *   sazonalidade         fator por mês do ano: { "12": 1.25, "01": 0.7 }; ausente é 1
 *   negocio              { custosFixosMes, retiradaMes, variaveisPct, caixaHoje } — o que o
 *                        script já puxa da última projeção quando ela existe
 *   horaDono             R$/h do dono (do /caixa), pra tabela de custo do /decidir
 *   horasImplantacao     horas do dono pra instalar, treinar e acompanhar
 *   alternativas         [{ nome, custoInicial, custoMensal, horas, observacao }]
 *   gatilhoMes           mês em que se confere se veio (padrão 3)
 *
 * Fixos, variáveis, retirada, caixa e sazonalidade vêm do último
 * `financeiro/projecao-*.projecao.json` quando existir, pra não reperguntar o
 * que o /projecao já levantou. O que está na spec vence o que veio de lá.
 *
 * Números em formato brasileiro ("18.500,00", "12,5"). Cada linha é arredondada
 * ao centavo antes de somar. Dinheiro, data e slug saem do scripts/br.js.
 *
 * Node 18+, sem dependência.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const CENARIOS = ["pessimista", "base", "otimista"];
const MESES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_LONGO = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function aviso(msg) {
  console.error(`  aviso: ${msg}`);
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

// ─────────────────────────── formato ───────────────────────────

/** Lê número em formato brasileiro e morre com o nome do campo quando não é número. */
function num(v, campo) {
  const n = br.numero(v);
  if (typeof n !== "number" || isNaN(n)) morrer(`"${campo}" não é número: ${JSON.stringify(v)}`);
  return n;
}

const cent = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const reais = (n) => (n < 0 ? "-" + br.reais(Math.abs(n)) : br.reais(n));
const dec = (n, casas = 1) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const pctN = (n, casas = 1) => dec(n, casas) + "%";
const un = (n) => Math.round(n).toLocaleString("pt-BR");
/** "7,2 meses" / "1,0 mês" — o relatório é lido em voz alta pro contador. */
const mesesTxt = (n) => `${dec(n)} ${Math.round(n * 10) === 10 ? "mês" : "meses"}`;

/** "2026-10" → { ano, mes } */
function lerMes(s, campo) {
  const m = /^(\d{4})-(\d{1,2})$/.exec(String(s || "").trim());
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
const nomeMes = ({ mes }) => MESES_LONGO[mes - 1];
const curtoMes = ({ ano, mes }) => `${br.MESES[mes - 1]}/${ano}`;
/** "sexta-feira, 23/10/2026" — o formato que o verificar.js datas confere. */
const dataLonga = (d) => `${DIAS_LONGO[d.getDay()]}, ${br.fmt(d)}`;

/** Caminho curto pra exibir. */
function curto(p) {
  const rel = path.relative(process.cwd(), p);
  return !rel || rel.startsWith("..") || rel.length > p.length ? p : rel;
}

// ─────────────────────────── contexto: a última projeção ───────────────────────────

/** Acha o `financeiro/projecao-*.projecao.json` mais recente pelo nome. */
function acharProjecao(pasta = "financeiro") {
  if (!fs.existsSync(pasta)) return null;
  const achados = fs.readdirSync(pasta)
    .filter((f) => /\.projecao\.json$/.test(f))
    .sort();
  return achados.length ? path.join(pasta, achados[achados.length - 1]) : null;
}

/**
 * Tira da spec do /projecao o que a compra precisa: fixos somados, variáveis,
 * retirada, caixa e sazonalidade. Projeção ilegível não derruba o script: volta
 * null e a conta segue com o que a spec da compra tem.
 */
function lerProjecao(arquivo) {
  let p;
  try { p = JSON.parse(fs.readFileSync(arquivo, "utf8")); }
  catch (e) { aviso(`${curto(arquivo)} não abre como JSON (${e.message}); segui sem ele`); return null; }

  const fixos = Array.isArray(p.custosFixos)
    ? p.custosFixos.reduce((a, c) => a + num(c.valor, "custosFixos.valor"), 0)
    : p.custosFixos !== undefined ? num(p.custosFixos, "custosFixos") : null;

  const saz = {};
  for (const [k, v] of Object.entries(p.sazonalidade || {})) {
    const m = parseInt(k, 10);
    if (m >= 1 && m <= 12) saz[m] = num(v, `sazonalidade.${k}`);
  }

  return {
    arquivo: curto(arquivo),
    fixos,
    retirada: p.retirada !== undefined ? num(p.retirada, "retirada") : null,
    variaveisPct: p.variaveisPct !== undefined ? num(p.variaveisPct, "variaveisPct") : null,
    caixa: p.caixaInicial !== undefined ? num(p.caixaInicial, "caixaInicial") : null,
    sazonalidade: Object.keys(saz).length ? saz : null,
    inicio: p.inicio ? String(p.inicio) : null,
  };
}

// ─────────────────────────── leitura da spec ───────────────────────────

function lerSpec(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`, "Gere um exemplo com: node scripts/payback.js --exemplo compra.payback.json");
  let spec;
  try { spec = JSON.parse(fs.readFileSync(arquivo, "utf8")); }
  catch (e) { morrer(`o JSON não abre: ${e.message}`); }
  return normalizar(spec);
}

function normalizar(spec) {
  const s = {};
  s.titulo = String(spec.titulo || "").trim();
  if (!s.titulo) morrer(`faltou "titulo"`, "É o nome da decisão no arquivo e no resumo: \"Forno de lastro novo\", \"Van usada\", \"Segunda sala\".");
  s.slug = br.slug(spec.slug || s.titulo);
  if (!s.slug) morrer(`o título "${s.titulo}" não virou slug`, "Use letras e números no título, ou passe \"slug\" na spec.");

  s.data = spec.data ? br.lerData(spec.data) : new Date();
  if (!s.data) morrer(`"data" não é uma data que existe: ${JSON.stringify(spec.data)}`, "Formato DD/MM/AAAA ou AAAA-MM-DD.");

  s.inicio = spec.inicio ? lerMes(spec.inicio, "inicio") : { ano: s.data.getFullYear(), mes: s.data.getMonth() + 1 };

  s.horizonte = spec.horizonteMeses === undefined ? 24 : parseInt(spec.horizonteMeses, 10);
  if (!(s.horizonte >= 6 && s.horizonte <= 60)) morrer(`"horizonteMeses" precisa ficar entre 6 e 60 (veio ${spec.horizonteMeses})`, "Menos de 6 não dá tempo de a compra render. Mais de 60 é chute: nenhum negócio pequeno sabe o que vende em 2032.");

  s.prazo = spec.prazoAceitavelMeses === undefined ? Math.min(18, s.horizonte) : parseInt(spec.prazoAceitavelMeses, 10);
  if (!(s.prazo >= 1)) morrer(`"prazoAceitavelMeses" precisa ser 1 ou mais (veio ${spec.prazoAceitavelMeses})`);
  if (s.prazo > s.horizonte) morrer(`"prazoAceitavelMeses" (${s.prazo}) passa do horizonte (${s.horizonte})`, "Aumente horizonteMeses ou aceite um prazo mais curto: a conta não vê o que está fora do horizonte.");

  s.gatilhoMes = spec.gatilhoMes === undefined ? 3 : parseInt(spec.gatilhoMes, 10);
  if (!(s.gatilhoMes >= 1 && s.gatilhoMes <= s.horizonte)) morrer(`"gatilhoMes" precisa ficar entre 1 e ${s.horizonte} (veio ${spec.gatilhoMes})`);

  // ── a compra ──
  const c = spec.compra || {};
  s.compra = {
    descricao: String(c.descricao || s.titulo).trim(),
    custoInicial: num(c.custoInicial, "compra.custoInicial"),
    custoMensalNovo: c.custoMensalNovo === undefined ? 0 : num(c.custoMensalNovo, "compra.custoMensalNovo"),
    oQue: c.oQueEOCustoMensal ? String(c.oQueEOCustoMensal).trim() : null,
    valorRevenda: c.valorRevenda === undefined ? null : num(c.valorRevenda, "compra.valorRevenda"),
    vidaUtilMeses: c.vidaUtilMeses === undefined ? null : parseInt(c.vidaUtilMeses, 10),
  };
  if (!(s.compra.custoInicial > 0)) morrer(`"compra.custoInicial" precisa ser maior que zero (veio ${JSON.stringify(c.custoInicial)})`, "Compra sem desembolso não tem payback. Se o gasto é mensal e não tem entrada, a conta é a do /projecao.");
  if (s.compra.custoMensalNovo < 0) morrer(`"compra.custoMensalNovo" ficou negativo`, "Se a compra corta custo em vez de criar, ponha a economia como receita extra do cenário e deixe o custo novo em 0.");
  if (s.compra.valorRevenda !== null && s.compra.valorRevenda > s.compra.custoInicial) aviso(`a revenda (${reais(s.compra.valorRevenda)}) está acima do que você vai pagar (${reais(s.compra.custoInicial)}). Confira: equipamento usado raramente sobe de preço.`);
  if (s.compra.custoMensalNovo === 0) aviso("a compra está sem custo mensal novo. Energia, manutenção, seguro, espaço, software: quase nada custa zero por mês. Se for zero mesmo, escreva isso na premissa.");

  // ── o que a compra faz vender ──
  const v = spec.venda || {};
  s.venda = { nome: String(v.nome || "a venda nova").trim() };
  s.venda.preco = num(v.precoUnitario, "venda.precoUnitario");
  if (!(s.venda.preco > 0)) morrer(`"venda.precoUnitario" precisa ser maior que zero`, "É o preço de uma unidade do que a compra passa a permitir vender: um pão, uma hora de sala, uma entrega.");
  if (v.custoVariavelUnitario !== undefined) {
    s.venda.cvUnit = num(v.custoVariavelUnitario, "venda.custoVariavelUnitario");
    s.venda.cvPct = (s.venda.cvUnit / s.venda.preco) * 100;
    s.venda.origemCv = "custo variável por unidade, informado na spec";
  } else if (v.custoVariavelPct !== undefined) {
    s.venda.cvPct = num(v.custoVariavelPct, "venda.custoVariavelPct");
    s.venda.cvUnit = s.venda.preco * (s.venda.cvPct / 100);
    s.venda.origemCv = "percentual informado na spec";
  } else {
    s.venda.cvPct = null; // pode vir da projeção no contexto()
    s.venda.cvUnit = null;
    s.venda.origemCv = null;
  }

  // ── cenários ──
  if (!spec.cenarios || typeof spec.cenarios !== "object") morrer(`faltou "cenarios"`, "São três, sempre: pessimista, base e otimista. Compra de capital decidida num cenário só é a que vira ferro velho no fundo da loja.");
  s.cenarios = {};
  for (const nome of CENARIOS) {
    const x = spec.cenarios[nome];
    if (!x) morrer(`faltou o cenário "${nome}"`, "Os três precisam existir, cada um com a própria premissa.");
    if (!x.premissa || !String(x.premissa).trim()) morrer(`o cenário "${nome}" está sem "premissa"`, "Premissa nomeia a causa: \"o forno assa 3 fornadas por dia e só a padaria da esquina some com metade\". \"As coisas melhoram\" não é premissa.");
    const out = { premissa: String(x.premissa).trim() };
    out.crescimentoPct = x.crescimentoMensalPct === undefined ? 0 : num(x.crescimentoMensalPct, `cenarios.${nome}.crescimentoMensalPct`);
    if (out.crescimentoPct <= -100) morrer(`o cenário "${nome}" cai ${out.crescimentoPct}% ao mês; abaixo de -100% a venda fica negativa`);
    if (x.unidadesMes !== undefined) {
      out.unidadesMes = num(x.unidadesMes, `cenarios.${nome}.unidadesMes`);
      out.origemUnidades = "unidades por mês, informadas na spec";
    } else if (x.receitaExtraMensal !== undefined) {
      const receita = num(x.receitaExtraMensal, `cenarios.${nome}.receitaExtraMensal`);
      out.unidadesMes = receita / s.venda.preco;
      out.origemUnidades = `${reais(receita)} de receita extra ÷ ${reais(s.venda.preco)} por unidade`;
    } else morrer(`o cenário "${nome}" precisa de "unidadesMes" ou "receitaExtraMensal"`, "Quantas unidades a mais por mês, ou quanto entra a mais por mês por causa da compra.");
    if (out.unidadesMes < 0) morrer(`o cenário "${nome}" tem venda extra negativa`);
    s.cenarios[nome] = out;
  }
  if (s.cenarios.pessimista.unidadesMes > s.cenarios.base.unidadesMes || s.cenarios.base.unidadesMes > s.cenarios.otimista.unidadesMes) {
    aviso("o pessimista vende mais que o base, ou o base mais que o otimista. Confira se os cenários não trocaram de lugar.");
  }

  // ── sazonalidade ──
  s.sazonalidade = {};
  s.origemSazonalidade = null;
  for (const [k, val] of Object.entries(spec.sazonalidade || {})) {
    const m = parseInt(k, 10);
    if (!(m >= 1 && m <= 12)) morrer(`sazonalidade: "${k}" não é um mês de 1 a 12`);
    s.sazonalidade[m] = num(val, `sazonalidade.${k}`);
  }
  if (Object.keys(s.sazonalidade).length) s.origemSazonalidade = "informada na spec";

  // ── o negócio em volta ──
  const n = spec.negocio || {};
  s.negocio = {
    fixos: n.custosFixosMes === undefined ? null : num(n.custosFixosMes, "negocio.custosFixosMes"),
    retirada: n.retiradaMes === undefined ? null : num(n.retiradaMes, "negocio.retiradaMes"),
    variaveisPct: n.variaveisPct === undefined ? null : num(n.variaveisPct, "negocio.variaveisPct"),
    caixa: n.caixaHoje === undefined ? null : num(n.caixaHoje, "negocio.caixaHoje"),
    origem: "informado na spec",
  };

  s.horaDono = spec.horaDono === undefined ? null : num(spec.horaDono, "horaDono");
  s.horasImplantacao = spec.horasImplantacao === undefined ? null : num(spec.horasImplantacao, "horasImplantacao");

  s.alternativas = (spec.alternativas || []).map((a, i) => ({
    nome: String(a.nome || `alternativa ${i + 1}`).trim(),
    custoInicial: a.custoInicial === undefined ? 0 : num(a.custoInicial, `alternativas[${i}].custoInicial`),
    custoMensal: a.custoMensal === undefined ? 0 : num(a.custoMensal, `alternativas[${i}].custoMensal`),
    horas: a.horas === undefined ? null : num(a.horas, `alternativas[${i}].horas`),
    observacao: a.observacao ? String(a.observacao).trim() : null,
  }));

  return s;
}

/**
 * Completa o que a spec não disse com a última projeção do /projecao: fixos,
 * retirada, variáveis, caixa e sazonalidade. A spec sempre vence.
 */
function contexto(s, opts = {}) {
  let proj = null;
  if (!opts.semProjecao) {
    const arq = typeof opts.projecao === "string" ? opts.projecao : acharProjecao(opts.pasta || "financeiro");
    if (arq && !fs.existsSync(arq)) morrer(`não achei a projeção ${arq}`);
    if (arq) proj = lerProjecao(arq);
  }
  s.projecao = proj;

  if (proj) {
    const vindo = [];
    if (s.negocio.fixos === null && proj.fixos !== null) { s.negocio.fixos = proj.fixos; vindo.push("custos fixos"); }
    if (s.negocio.retirada === null && proj.retirada !== null) { s.negocio.retirada = proj.retirada; vindo.push("retirada"); }
    if (s.negocio.variaveisPct === null && proj.variaveisPct !== null) { s.negocio.variaveisPct = proj.variaveisPct; vindo.push("variáveis"); }
    if (s.negocio.caixa === null && proj.caixa !== null) { s.negocio.caixa = proj.caixa; vindo.push("caixa"); }
    if (!Object.keys(s.sazonalidade).length && proj.sazonalidade) {
      s.sazonalidade = proj.sazonalidade;
      s.origemSazonalidade = `da projeção ${proj.arquivo}`;
      vindo.push("sazonalidade");
    }
    if (vindo.length) s.negocio.origem = `${vindo.join(", ")} da projeção ${proj.arquivo}`;
  }

  // custo variável da venda nova: sem número próprio, herda o do negócio
  if (s.venda.cvPct === null) {
    if (s.negocio.variaveisPct !== null) {
      s.venda.cvPct = s.negocio.variaveisPct;
      s.venda.cvUnit = s.venda.preco * (s.venda.cvPct / 100);
      s.venda.origemCv = `${pctN(s.venda.cvPct)} do negócio inteiro${s.projecao ? ` (projeção ${s.projecao.arquivo})` : ""} — [a confirmar] se a venda nova tem a mesma margem`;
    } else {
      morrer(`faltou o custo variável da venda nova`, "Ponha \"custoVariavelPct\" ou \"custoVariavelUnitario\" em \"venda\". De cada R$ 100 dessa venda, quanto vai embora em insumo, taxa de cartão, imposto e comissão? Sem isso o payback sai do faturamento, e faturamento não paga máquina.");
    }
  }
  if (s.venda.cvPct < 0 || s.venda.cvPct >= 100) morrer(`o custo variável da venda nova ficou em ${pctN(s.venda.cvPct)}`, "Precisa ficar entre 0 e 99. Em 100% ou mais, cada venda extra dá prejuízo e a compra nunca se paga.");
  s.venda.margemFator = 1 - s.venda.cvPct / 100;
  s.venda.margemUnit = cent(s.venda.preco * s.venda.margemFator);
  if (!(s.venda.margemUnit > 0)) morrer("a margem por unidade ficou em zero ou menos", "Com margem zero, vender mais não paga a compra: paga o insumo. Reveja preço ou custo variável antes de decidir.");
  return s;
}

// ─────────────────────────── a conta ───────────────────────────

/** Mês a mês de um cenário: venda extra, margem, sobra depois do custo novo, acumulado. */
function serie(c, s) {
  const linhas = [];
  let acum = 0;
  for (let i = 0; i < s.horizonte; i++) {
    const m = somaMeses(s.inicio, i);
    const fator = s.sazonalidade[m.mes] ?? 1;
    const unidades = c.unidadesMes * Math.pow(1 + c.crescimentoPct / 100, i) * fator;
    const receita = cent(unidades * s.venda.preco);
    const margem = cent(receita * s.venda.margemFator);
    const sobra = cent(margem - s.compra.custoMensalNovo);
    const antes = acum;
    acum = cent(acum + sobra);
    linhas.push({
      i, mes: i + 1, ...m, chave: chaveMes(m), nome: nomeMes(m), curto: curtoMes(m),
      fator, unidades, receita, margem, sobra, acumAntes: antes, acum,
    });
  }
  return linhas;
}

/** Em quantos meses o acumulado cobre o desembolso. Null quando não cobre no horizonte. */
function paybackDe(linhas, custoInicial) {
  for (const l of linhas) {
    if (l.acum >= custoInicial) {
      const fracao = l.sobra > 0 ? (custoInicial - l.acumAntes) / l.sobra : 1;
      return { meses: l.i + Math.min(1, Math.max(0, fracao)), mesInteiro: l.mes, mesNome: l.curto, linha: l };
    }
  }
  return null;
}

/** Vendas por mês pra cobrir o custo novo, e pra pagar a compra dentro do prazo. */
function pontoEquilibrio(s) {
  const mu = s.venda.margemUnit;
  const paraCusto = s.compra.custoMensalNovo / mu;
  const parcela = s.compra.custoInicial / s.prazo;
  const paraPrazo = (s.compra.custoMensalNovo + parcela) / mu;
  return {
    margemUnit: mu,
    parcelaDoInvestimento: parcela,
    unidadesParaCusto: paraCusto,
    receitaParaCusto: paraCusto * s.venda.preco,
    unidadesParaPrazo: paraPrazo,
    receitaParaPrazo: paraPrazo * s.venda.preco,
    porDiaUtil: paraPrazo / 22,
  };
}

function calcular(s) {
  const eq = pontoEquilibrio(s);
  const cenarios = {};
  for (const nome of CENARIOS) {
    const c = s.cenarios[nome];
    const linhas = serie(c, s);
    const pb = paybackDe(linhas, s.compra.custoInicial);
    const em = (k) => (k <= linhas.length ? linhas[k - 1].acum : null);
    const media = (campo, k) => linhas.slice(0, k).reduce((a, l) => a + l[campo], 0) / k;
    cenarios[nome] = {
      premissa: c.premissa,
      unidadesMes: c.unidadesMes,
      crescimentoPct: c.crescimentoPct,
      origemUnidades: c.origemUnidades,
      linhas,
      unidadesMedia12: media("unidades", Math.min(12, linhas.length)),
      receitaMedia: media("receita", linhas.length),
      margemMedia: media("margem", linhas.length),
      sobraMedia: media("sobra", linhas.length),
      sobraPrimeiroMes: linhas[0].sobra,
      payback: pb,
      dentroDoPrazo: pb ? pb.meses <= s.prazo : false,
      acum12: em(12),
      acum24: em(24),
      acumHorizonte: linhas[linhas.length - 1].acum,
      acumGatilho: em(s.gatilhoMes),
      retorno12: em(12) === null ? null : cent(em(12) - s.compra.custoInicial),
      retorno24: em(24) === null ? null : cent(em(24) - s.compra.custoInicial),
      cobre: (k) => (em(k) === null ? null : em(k) / s.compra.custoInicial),
    };
  }

  // efeito no negócio inteiro, quando o /caixa ou o /projecao já deram os números
  let negocio = null;
  const n = s.negocio;
  if (n.fixos !== null && n.variaveisPct !== null && n.variaveisPct < 100) {
    const fator = 1 - n.variaveisPct / 100;
    const retirada = n.retirada ?? 0;
    const antes = (n.fixos + retirada) / fator;
    const depois = (n.fixos + retirada + s.compra.custoMensalNovo) / fator;
    negocio = {
      fixos: n.fixos, retirada, variaveisPct: n.variaveisPct, margemFator: fator,
      equilibrioAntes: antes, equilibrioDepois: depois, diferenca: depois - antes,
      fixosSobemPct: n.fixos > 0 ? (s.compra.custoMensalNovo / n.fixos) * 100 : null,
    };
    if (n.caixa !== null) {
      const queima = n.fixos + retirada;
      negocio.caixa = n.caixa;
      negocio.caixaDepois = n.caixa - s.compra.custoInicial;
      negocio.pctDoCaixa = (s.compra.custoInicial / n.caixa) * 100;
      negocio.reservaAntes = queima > 0 ? n.caixa / queima : Infinity;
      negocio.reservaDepois = queima + s.compra.custoMensalNovo > 0 ? (n.caixa - s.compra.custoInicial) / (queima + s.compra.custoMensalNovo) : Infinity;
    }
  }

  // gatilho de desistir: o que precisa estar de pé no mês de conferência
  const base = cenarios.base;
  const linhaGatilho = base.linhas[s.gatilhoMes - 1];
  const gatilho = {
    mes: s.gatilhoMes,
    quando: linhaGatilho.curto,
    quandoNome: linhaGatilho.nome,
    unidadesMinimas: eq.unidadesParaPrazo,
    receitaMinima: eq.receitaParaPrazo,
    acumuladoEsperado: linhaGatilho.acum,
    acumuladoMinimo: cent(eq.unidadesParaPrazo * s.venda.margemUnit * s.gatilhoMes - s.compra.custoMensalNovo * s.gatilhoMes),
    voltaSeDesistir: s.compra.valorRevenda,
    custoDeVoltar: s.compra.valorRevenda === null ? null : cent(s.compra.custoInicial - s.compra.valorRevenda),
  };

  const alternativas = s.alternativas.map((a) => ({
    ...a,
    dinheiro6: cent(a.custoInicial + 6 * a.custoMensal),
    tempoReais: a.horas !== null && s.horaDono !== null ? cent(a.horas * s.horaDono) : null,
  }));

  const compra6 = cent(s.compra.custoInicial + 6 * s.compra.custoMensalNovo);
  const tempoCompra = s.horasImplantacao !== null && s.horaDono !== null ? cent(s.horasImplantacao * s.horaDono) : null;

  const revisao = [30, 60, 90].map((d) => ({ dias: d, data: br.mais(s.data, d) }));

  return { eq, cenarios, negocio, gatilho, alternativas, compra6, tempoCompra, revisao };
}

// ─────────────────────────── markdown ───────────────────────────

function tabelaIndicador(titulos, linhas) {
  const cab = `| Indicador | ${titulos.join(" | ")} |`;
  const sep = `|---|${titulos.map(() => "---").join("|")}|`;
  return [cab, sep, ...linhas.map(([nome, vals]) => `| ${nome} | ${vals.join(" | ")} |`)].join("\n");
}

function linhaCusto(nome, dinheiro, horas, tempo, total) {
  const cel = (v) => (v === null ? "[a confirmar]" : v);
  return `| ${nome} | ${reais(dinheiro)} | ${cel(horas === null ? null : un(horas))} | ${cel(tempo === null ? null : reais(tempo))} | ${cel(total === null ? null : reais(total))} |`;
}

function markdown(s, r, comando) {
  const c3 = CENARIOS.map((n) => r.cenarios[n]);
  const titulos = ["Pessimista", "Base", "Otimista"];
  const out = [];
  const fim = somaMeses(s.inicio, s.horizonte - 1);

  out.push(`# Decisão — ${s.titulo} — ${br.iso(s.data)}`);
  out.push("");
  out.push(`**Família:** compra de capital — ${s.compra.descricao}`);
  const volta = r.gatilho.custoDeVoltar;
  out.push(`**Porta:** um sentido — custo de voltar atrás: ${volta === null ? "[a confirmar: quanto se recupera revendendo]" : `${reais(volta)} (${reais(s.compra.valorRevenda)} voltam na revenda)`}, e não volta o tempo de instalação nem o que já foi combinado com quem instalou`);
  out.push("");
  out.push(`Contas de \`node scripts/payback.js ${comando}\`, sobre as premissas abaixo. Premissa, decisão e revisão são do dono.`);
  out.push("");

  out.push("## A decisão");
  out.push("");
  out.push("[Uma frase: compra ou não compra, a partir de quando, com qual dinheiro.]");
  out.push("");

  out.push("## Por quê");
  out.push("");
  out.push("1. [motivo, com o número das seções abaixo que o sustenta]");
  out.push("2. [motivo, com o número que o sustenta]");
  out.push("3. [no máximo três]");
  out.push("");

  out.push("## A compra e as premissas");
  out.push("");
  out.push(`- Desembolso de uma vez: ${reais(s.compra.custoInicial)}`);
  out.push(`- Custo novo por mês: ${reais(s.compra.custoMensalNovo)}${s.compra.oQue ? ` (${s.compra.oQue})` : ""}`);
  out.push(`- O que passa a vender: ${s.venda.nome}, a ${reais(s.venda.preco)} a unidade`);
  out.push(`- Margem por unidade: ${reais(s.venda.margemUnit)} (${reais(s.venda.preco)} − ${reais(s.venda.cvUnit)} de custo variável, ${pctN(s.venda.cvPct)}). Origem: ${s.venda.origemCv}`);
  out.push(`- Horizonte da conta: ${s.horizonte} meses, de ${curtoMes(s.inicio)} a ${curtoMes(fim)}. Prazo que o dono aceita pra compra se pagar: ${s.prazo} meses`);
  if (s.compra.vidaUtilMeses) out.push(`- Vida útil estimada: ${s.compra.vidaUtilMeses} meses. O payback precisa caber bem dentro dela`);
  const saz = Object.entries(s.sazonalidade);
  if (saz.length) out.push(`- Sazonalidade aplicada à venda nova: ${saz.map(([m, f]) => `${br.MESES[m - 1]} ×${dec(f, 2)}`).join(", ")} (${s.origemSazonalidade})`);
  else out.push("- Sazonalidade: nenhuma informada, todo mês vale 1. Se o negócio tem mês morto, a conta está otimista demais");
  if (s.negocio.fixos !== null) out.push(`- O negócio em volta: ${s.negocio.origem}`);
  out.push("");
  for (const nome of CENARIOS) {
    const c = r.cenarios[nome];
    out.push(`- **Cenário ${nome}:** ${c.premissa} — ${un(c.unidadesMes)} unidades no primeiro mês${c.crescimentoPct ? `, variando ${pctN(c.crescimentoPct)} ao mês` : ""} (${c.origemUnidades})`);
  }
  out.push("");

  out.push("## Ponto de equilíbrio da compra");
  out.push("");
  if (s.compra.custoMensalNovo > 0) {
    out.push(`- Pra cobrir só o custo novo do mês: **${un(r.eq.unidadesParaCusto)} unidades por mês** (${reais(r.eq.receitaParaCusto)} de receita extra). Conta: ${reais(s.compra.custoMensalNovo)} ÷ ${reais(r.eq.margemUnit)} de margem`);
  } else {
    out.push("- A compra foi declarada sem custo novo por mês, então não há o que cobrir: cada unidade vendida já é margem inteira. Confira energia, manutenção e espaço antes de confiar nisso");
  }
  out.push(`- Pra pagar a compra em ${s.prazo} meses: **${un(r.eq.unidadesParaPrazo)} unidades por mês** (${reais(r.eq.receitaParaPrazo)} de receita extra). Conta: (${reais(s.compra.custoMensalNovo)} + ${reais(s.compra.custoInicial)} ÷ ${s.prazo}) ÷ ${reais(r.eq.margemUnit)}`);
  out.push(`- Em dia de funcionamento, contando 22 por mês: ${dec(r.eq.porDiaUtil)} unidades por dia`);
  if (r.negocio) {
    out.push(`- No negócio inteiro, o equilíbrio do dono sai de ${reais(r.negocio.equilibrioAntes)} pra ${reais(r.negocio.equilibrioDepois)} de receita por mês (${reais(r.negocio.diferenca)} a mais)${r.negocio.fixosSobemPct !== null ? `, e o custo fixo sobe ${pctN(r.negocio.fixosSobemPct)}` : ""}`);
  }
  out.push("");

  out.push("## Payback por cenário");
  out.push("");
  out.push(tabelaIndicador(titulos, [
    ["Venda extra por mês (média dos 12 primeiros)", c3.map((c) => `${un(c.unidadesMedia12)} un`)],
    ["Receita extra média por mês", c3.map((c) => reais(c.receitaMedia))],
    ["Margem extra média por mês", c3.map((c) => reais(c.margemMedia))],
    ["Sobra depois do custo novo", c3.map((c) => reais(c.sobraMedia))],
    ["Payback", c3.map((c) => (c.payback ? `${mesesTxt(c.payback.meses)} (${c.payback.mesNome})` : `não se paga em ${s.horizonte} meses`))],
    [`Cabe no prazo de ${s.prazo} meses?`, c3.map((c) => (c.dentroDoPrazo ? "sim" : "não"))],
  ]));
  out.push("");
  const pb = r.cenarios.base.payback;
  const pbP = r.cenarios.pessimista.payback;
  if (pb && r.cenarios.base.dentroDoPrazo && pbP && r.cenarios.pessimista.dentroDoPrazo) {
    out.push(`Leitura: a compra se paga dentro de ${s.prazo} meses até no pessimista (${mesesTxt(pbP.meses)}). O risco aqui não é a conta, é a premissa: confira se o pessimista dói o suficiente.`);
  } else if (pb && r.cenarios.base.dentroDoPrazo) {
    out.push(`Leitura: no base o dinheiro volta em ${mesesTxt(pb.meses)}. No pessimista, ${pbP ? `em ${mesesTxt(pbP.meses)}, fora do prazo de ${s.prazo}` : `não volta nos ${s.horizonte} meses da conta`}. Comprar é apostar que o pessimista não acontece, e o gatilho abaixo é o que faz essa aposta ter data.`);
  } else if (pb) {
    out.push(`Leitura: o dinheiro volta em ${mesesTxt(pb.meses)} no cenário base, além dos ${s.prazo} que você aceita esperar. Ou a venda extra sobe, ou a compra entra menor (usado, alugado, meia capacidade).`);
  } else {
    out.push(`Leitura: nem o cenário base paga a compra em ${s.horizonte} meses. Com essas premissas, essa compra não se sustenta na venda que ela gera.`);
  }
  out.push("");

  // 12 e 24 meses é o que o dono pergunta. Horizonte menor troca o marco pelo
  // fim da conta, em vez de imprimir uma tabela inteira de "fora do horizonte".
  const marcos = [12, 24].filter((k) => k <= s.horizonte);
  if (!marcos.length || marcos[marcos.length - 1] !== s.horizonte) marcos.push(s.horizonte);
  const acumEm = (c, k) => c.linhas[k - 1].acum;
  out.push(`## Retorno em ${marcos.join(" e ")} meses`);
  out.push("");
  out.push(tabelaIndicador(titulos, marcos.flatMap((k) => [
    [`Sobra acumulada em ${k} meses`, c3.map((c) => `${reais(acumEm(c, k))} (${pctN((acumEm(c, k) / s.compra.custoInicial) * 100, 0)} do investido)`)],
    [`Resultado em ${k} meses (já pago o desembolso)`, c3.map((c) => reais(cent(acumEm(c, k) - s.compra.custoInicial)))],
  ])));
  out.push("");
  out.push(`A sobra acumulada é margem extra menos o custo novo do mês, somada. Não é lucro do negócio: o custo fixo que já existia continua sendo pago pela venda que já existia.`);
  out.push("");

  if (r.negocio && r.negocio.caixa !== undefined) {
    out.push("## O caixa depois da compra");
    out.push("");
    out.push(`- Caixa hoje: ${reais(r.negocio.caixa)}. Depois de pagar à vista: ${reais(r.negocio.caixaDepois)} (a compra consome ${pctN(r.negocio.pctDoCaixa, 0)} do que está na conta)`);
    out.push(`- Reserva, se parar de entrar: ${isFinite(r.negocio.reservaAntes) ? `${mesesTxt(r.negocio.reservaAntes)} hoje` : "não se aplica"} → ${isFinite(r.negocio.reservaDepois) ? `${mesesTxt(r.negocio.reservaDepois)} depois da compra` : "não se aplica"}`);
    if (r.negocio.caixaDepois < 0) out.push("- **O caixa não cobre a compra à vista.** Ou entra parcelado, ou espera. Parcelado tem custo, e é o `/emprestimo` que calcula quanto");
    out.push("- Se a compra for financiada, a parcela entra em `compra.custoMensalNovo` e o custo do dinheiro é conta do `/emprestimo`");
    out.push("");
  }

  out.push("## O custo");
  out.push("");
  out.push("| Alternativa | Dinheiro em 6 meses | Horas do dono | Tempo em R$ | Total |");
  out.push("|---|---|---|---|---|");
  const totalCompra = r.tempoCompra === null ? null : cent(r.compra6 + r.tempoCompra);
  out.push(linhaCusto(s.compra.descricao, r.compra6, s.horasImplantacao, r.tempoCompra, totalCompra));
  for (const a of r.alternativas) {
    const total = a.tempoReais === null ? null : cent(a.dinheiro6 + a.tempoReais);
    out.push(linhaCusto(a.nome, a.dinheiro6, a.horas, a.tempoReais, total));
  }
  out.push(linhaCusto("Não fazer nada", 0, 0, 0, 0));
  out.push("");
  out.push(`Hora do dono usada na conta: ${s.horaDono === null ? "[a confirmar] — sai do fechamento do `/caixa`" : `${reais(s.horaDono)}/h`}`);
  const margem6 = cent(r.cenarios.base.linhas.slice(0, 6).reduce((a, l) => a + l.margem, 0));
  out.push(`Não fazer nada não custa dinheiro, e deixa de ganhar: ${reais(margem6)} de margem extra nos 6 primeiros meses do cenário base.`);
  for (const a of r.alternativas) if (a.observacao) out.push(`${a.nome}: ${a.observacao}`);
  out.push("");

  out.push("## O que ficou de fora e por quê");
  out.push("");
  out.push("- [alternativa descartada — por que perdeu, em uma linha]");
  out.push("- [pergunta sem resposta — decidido sem ela porque ...]");
  out.push("");

  out.push("## O que precisa ser verdade");
  out.push("");
  out.push(`- A venda extra chega a ${un(r.eq.unidadesParaPrazo)} unidades por mês: como conferir — [contagem de onde: comanda, PDV, caderno]`);
  out.push(`- A margem por unidade se mantém em ${reais(s.venda.margemUnit)}: como conferir — preço e insumo no próximo fechamento do \`/caixa\``);
  out.push(s.compra.custoMensalNovo > 0
    ? `- O custo novo fica em ${reais(s.compra.custoMensalNovo)} por mês: como conferir — conta de luz e manutenção dos três primeiros meses`
    : "- A compra não traz custo mensal nenhum: como conferir — conta de luz dos três primeiros meses, contra a de agora");
  out.push("- [o que mais precisa ser verdade, e como você confere]");
  out.push("");

  out.push("## O risco que mata");
  out.push("");
  out.push("[O cenário em que isso quebra o negócio, não em que dá prejuízo. E o sinal que avisa antes dele chegar.]");
  out.push("");

  out.push("## Se não vier: o gatilho de desistir");
  out.push("");
  out.push(`Conferir em ${r.gatilho.quandoNome} de ${somaMeses(s.inicio, s.gatilhoMes - 1).ano} (mês ${r.gatilho.mes} depois da compra):`);
  out.push("");
  out.push(`- A venda extra precisa estar em ${un(r.gatilho.unidadesMinimas)} unidades por mês (${reais(r.gatilho.receitaMinima)}), e a sobra acumulada em ${reais(r.gatilho.acumuladoMinimo)}. No cenário base, nesse mês, o acumulado seria ${reais(r.gatilho.acumuladoEsperado)}`);
  out.push(`- Se estiver abaixo disso, a compra não se paga em ${s.prazo} meses no ritmo em que está. Não é "esperar mais um pouco": é decidir o que fazer com o que já foi gasto`);
  if (r.gatilho.voltaSeDesistir !== null) {
    out.push(`- Desistir nesse ponto devolve ${reais(r.gatilho.voltaSeDesistir)} na revenda e deixa ${reais(r.gatilho.custoDeVoltar)} no chão. Continuar mais seis meses no ritmo baixo custa ${reais(cent(s.compra.custoMensalNovo * 6))} de custo novo, e a revenda cai`);
  } else {
    out.push("- Quanto volta se revender: [a confirmar — olhe o preço de usado agora, antes de comprar, não depois]");
  }
  out.push("- [a ação, escrita agora: revender, devolver, alugar pra terceiro, mudar o que se vende com isso]");
  out.push("");

  out.push("## Revisão");
  out.push("");
  out.push("| Marco | Data | O que precisa ter acontecido | Se não aconteceu |");
  out.push("|---|---|---|---|");
  out.push(`| 30 dias | ${dataLonga(r.revisao[0].data)} | [esforço: instalado, equipe treinada, ${s.venda.nome} no cardápio ou na vitrine] | [ação] |`);
  out.push(`| 60 dias | ${dataLonga(r.revisao[1].data)} | [sinal: ${un(r.eq.unidadesParaPrazo)} unidades no mês, contadas no PDV] | [ação] |`);
  out.push(`| 90 dias | ${dataLonga(r.revisao[2].data)} | [resultado: ${reais(cent(r.cenarios.base.linhas.slice(0, 3).reduce((a, l) => a + l.sobra, 0)))} de sobra acumulada, do cenário base] | [ação] |`);
  out.push("");
  out.push("Quem confere: <o usuário, na revisão de sexta>");
  out.push("");

  out.push("## Revisão feita");
  out.push("");
  out.push("[Preenchido na data. O dinheiro voltou no ritmo da conta? O que a página não previu?]");
  out.push("");

  return out.join("\n");
}

// ─────────────────────────── exemplo ───────────────────────────

const EXEMPLO = {
  titulo: "Forno de lastro novo",
  data: "23/09/2026",
  inicio: "2026-10",
  horizonteMeses: 24,
  prazoAceitavelMeses: 18,
  gatilhoMes: 3,
  compra: {
    descricao: "forno de lastro de 8 bocas, usado, com instalação elétrica",
    custoInicial: "18.500,00",
    custoMensalNovo: "620,00",
    oQueEOCustoMensal: "energia a mais, manutenção semestral rateada e seguro",
    valorRevenda: "11.000,00",
    vidaUtilMeses: 120,
  },
  venda: {
    nome: "pão de fermentação natural",
    precoUnitario: "18,00",
    custoVariavelPct: "34",
  },
  cenarios: {
    pessimista: {
      premissa: "só a clientela de sábado compra, e a padaria da esquina lança o mesmo pão em dezembro",
      unidadesMes: 120,
      crescimentoMensalPct: "0",
    },
    base: {
      premissa: "duas fornadas por dia úteis vendem, como nas quatro semanas de teste no forno alugado",
      unidadesMes: 260,
      crescimentoMensalPct: "2",
    },
    otimista: {
      premissa: "três fornadas por dia e dois cafés da vizinhança passam a comprar semanalmente",
      unidadesMes: 420,
      crescimentoMensalPct: "3",
    },
  },
  sazonalidade: { "12": 1.25, "01": 0.7, "02": 0.8 },
  negocio: {
    custosFixosMes: "7.230,00",
    retiradaMes: "5.000,00",
    variaveisPct: "12,5",
    caixaHoje: "31.000,00",
  },
  horaDono: "85,00",
  horasImplantacao: 24,
  alternativas: [
    {
      nome: "Alugar o forno por 6 meses",
      custoInicial: "0",
      custoMensal: "1.400,00",
      horas: 6,
      observacao: "custa mais por mês e não vira patrimônio, mas devolve em 30 dias se a venda não vier",
    },
  ],
};

// ─────────────────────────── main ───────────────────────────

/** O cabeçalho deste arquivo, sem a marcação de comentário: é a documentação do script. */
function ajuda() {
  return fs.readFileSync(__filename, "utf8")
    .split("*/")[0]
    .split("\n")
    .filter((l) => !/^#!|^\/\*\*$/.test(l))
    .map((l) => l.replace(/^ \* ?/, ""))
    .join("\n")
    .trim();
}

function main() {
  const o = args(process.argv.slice(2));
  if (o.ajuda) { console.log(ajuda()); return; }

  if (o.exemplo) {
    const destino = typeof o.exemplo === "string" ? o.exemplo : o._[0];
    const json = JSON.stringify(EXEMPLO, null, 2) + "\n";
    if (destino) {
      if (fs.existsSync(destino) && !o.sobrescrever) morrer(`${destino} já existe; não vou sobrescrever`);
      fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
      fs.writeFileSync(destino, json);
      console.log(`✓ exemplo gravado em ${destino}. Troque os números pelos do negócio e rode: node scripts/payback.js ${destino}`);
    } else process.stdout.write(json);
    return;
  }

  const arquivo = o._[0];
  if (!arquivo) morrer("faltou a spec", "Uso: node scripts/payback.js <spec.payback.json> [--md] [--json]\n  Exemplo pra editar: node scripts/payback.js --exemplo compra.payback.json");

  const s = contexto(lerSpec(arquivo), { projecao: o.projecao, semProjecao: o["sem-projecao"] });
  const r = calcular(s);

  if (o.json) {
    process.stdout.write(JSON.stringify({ premissas: s, resultado: r }, (k, v) => (k === "cobre" ? undefined : v), 2) + "\n");
    return;
  }

  const md = markdown(s, r, arquivo.includes(" ") ? `"${arquivo}"` : arquivo);
  let destino = null;
  if (o.md) {
    destino = typeof o.md === "string" ? o.md : path.join("decisoes", `${br.iso(s.data)}-${s.slug}.md`);
    if (fs.existsSync(destino) && !o.sobrescrever) {
      morrer(`${destino} já existe; não vou sobrescrever`, "Decisão escrita é editada à mão depois. Use --sobrescrever se tem certeza, ou mude o slug.");
    }
    fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
    fs.writeFileSync(destino, md);
    console.log(`✓ decisão gravada em ${destino}`);
    console.log(`  agora confira: node scripts/verificar.js datas ${destino}`);
  } else {
    process.stdout.write(md);
  }

  if (destino) {
    console.log("");
    if (s.projecao && /projeção/.test(s.negocio.origem)) console.log(`  contexto: ${s.negocio.origem}`);
    const custoNovo = s.compra.custoMensalNovo > 0 ? `${un(r.eq.unidadesParaCusto)} un/mês pagam o custo novo` : "sem custo novo por mês";
    console.log(`  equilíbrio: ${custoNovo} · ${un(r.eq.unidadesParaPrazo)} un/mês pagam a compra em ${s.prazo} meses`);
    for (const nome of CENARIOS) {
      const c = r.cenarios[nome];
      console.log(`  ${nome.padEnd(10)} ${un(c.unidadesMes)} un/mês · sobra ${reais(c.sobraMedia)}/mês · payback ${c.payback ? mesesTxt(c.payback.meses) : `não se paga em ${s.horizonte} meses`}`);
    }
    console.log(`  gatilho: conferir em ${r.gatilho.quando} se a venda passou de ${un(r.gatilho.unidadesMinimas)} un/mês`);
  }
}

module.exports = {
  normalizar, lerSpec, contexto, calcular, serie, paybackDe, pontoEquilibrio,
  markdown, acharProjecao, lerProjecao, ajuda, CENARIOS,
};

if (require.main === module) main();
