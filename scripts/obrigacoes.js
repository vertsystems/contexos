#!/usr/bin/env node
/**
 * Contex OS — obrigacoes.js
 * Monta o calendário de obrigações do ano, com a data já empurrada pra dia útil.
 *
 * Existe porque data de imposto calculada de cabeça erra de três jeitos: o dia 20
 * cai no domingo e ninguém empurra pra segunda; o feriado de 20 de novembro
 * (Consciência Negra, feriado nacional desde 2024) engole o vencimento do DAS; e
 * o Carnaval muda de mês conforme o ano. Aqui a Páscoa é calculada, os feriados
 * nacionais entram sozinhos, e cada linha sai com o dia da semana escrito, pra
 * passar no `verificar.js datas`.
 *
 * Uso:
 *   node scripts/obrigacoes.js <ano> <enquadramento> [opções]
 *
 * Enquadramento:
 *   mei        Microempreendedor Individual (DAS-MEI dia 20, DASN-SIMEI até 31/05)
 *   simples    ME ou EPP no Simples Nacional (PGDAS-D e DAS dia 20, DEFIS até 31/03)
 *   autonomo   pessoa física com carnê-leão (DARF último dia útil) e GPS dia 15
 *   informal   quem ainda não formalizou: só o que vale pra pessoa física
 *
 * Opções:
 *   --atividade <tipo>   só no mei: servicos | comercio | ambos | caminhoneiro (padrão: servicos)
 *   --empregado          mei ou simples com empregado: acrescenta a guia do empregado e o 13º
 *   --feriado DD/MM      feriado local que fecha banco (repetir a opção pra cada um)
 *   --saida <arquivo>    grava o markdown em vez de imprimir
 *   --json               imprime a lista em JSON, pra outra ferramenta ler
 *
 * O que sai: uma tabela markdown com data, dia da semana, obrigação, o que é,
 * valor ou base, e a fonte. Três regras de data:
 *   - imposto (DAS, DARF, GPS, DAE) que cai em fim de semana ou feriado vai pro
 *     dia útil SEGUINTE;
 *   - declaração (DASN, DEFIS, IRPF) não é empurrada: o portal aceita no domingo
 *     e a Receita conta o dia do calendário;
 *   - obrigação trabalhista (13º) que cai em dia não útil ANTECIPA pro dia útil
 *     anterior, porque o empregado precisa receber até a data.
 *
 * Valores fixos (DAS-MEI, GPS) saem com o salário mínimo do ano quando o script
 * o conhece; senão, saem como [a confirmar] com o link de onde conferir. A guia
 * paga em janeiro é a competência de dezembro e usa o mínimo do ano ANTERIOR
 * (o primeiro DAS com o valor novo vence em 20 de fevereiro). Data e fonte de
 * cada valor estão em templates/financeiro/obrigacoes.md.
 *
 * Node 18+, sem dependência.
 */

const fs = require("fs");
const path = require("path");

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Salário mínimo por ano. Só entra aqui valor com decreto publicado.
// 2025: Decreto nº 12.342, de 30/12/2024. 2026: Decreto nº 12.797, de 23/12/2025
// (planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm, conferido em 19/09/2026).
// O ano anterior fica aqui porque a guia de janeiro (competência dezembro) usa o mínimo dele.
const SALARIO_MINIMO = { 2025: 1518.0, 2026: 1621.0 };

// Prazos de declaração que a Receita fixa por ano. Fora daqui vira [a confirmar].
const PRAZOS_ANUAIS = {
  2026: {
    irpfInicio: "23/03", irpfFim: "29/05",   // Receita Federal, 16/03/2026 (conferido em 19/09/2026)
    dasn: "31/05",                           // Receita Federal, maio/2026 (conferido em 19/09/2026)
    defis: "31/03",                          // Portal do Simples Nacional, 09/12/2025 (conferido em 19/09/2026)
  },
};

const FONTES = {
  dasMei: "https://www8.receita.fazenda.gov.br/simplesnacional/Noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3",
  tetoMei: "https://www.gov.br/memp/pt-br/teto-do-mei",
  dasn: "https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/maio/microempreendedor-individual-mei-tem-ate-31-de-maio-para-entregar-declaracao-anual",
  pgdas: "https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=1e17613a-4a08-4ba0-9a7d-550e833f3e13",
  irpf: "https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/marco/receita-comeca-a-receber-declaracoes-do-irpf-no-dia-23-de-marco-prazo-de-entrega-se-encerra-em-29-de-maio",
  tabelaIr: "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026",
  inss: "https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf",
  empregadoMei: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/empregado-do-mei/qual-o-custo-para-contratacao",
  fgtsDigital: "https://www.gov.br/trabalho-e-emprego/pt-br/servicos/empregador/fgtsdigital/manual-e-documentacao-tecnica/manual-do-orientacao-do-fgts-digital-versao-1-50-20-03-2026.pdf",
  nfse: "https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/simples-nacional-nfs-e-nacional-sera-obrigatoria-para-me-e-epp-a-partir-de-1o-de-novembro-de-2026",
};

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

// ─────────────────────────── feriados ───────────────────────────

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

function mais(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function chave(d) { return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; }

/**
 * Feriados nacionais mais os dias em que banco não abre (Carnaval, Corpus Christi).
 * Ponto facultativo entra porque o que decide vencimento é banco fechado, não
 * repartição. Feriado estadual e municipal não entra: passar por --feriado.
 */
function feriados(ano, extras) {
  const p = pascoa(ano);
  const lista = {
    [`01/01`]: "Confraternização Universal",
    [chave(mais(p, -48))]: "Carnaval (segunda, banco fechado)",
    [chave(mais(p, -47))]: "Carnaval (terça, banco fechado)",
    [chave(mais(p, -2))]: "Sexta-feira Santa",
    [`21/04`]: "Tiradentes",
    [`01/05`]: "Dia do Trabalho",
    [chave(mais(p, 60))]: "Corpus Christi (banco fechado)",
    [`07/09`]: "Independência",
    [`12/10`]: "Nossa Senhora Aparecida",
    [`02/11`]: "Finados",
    [`15/11`]: "Proclamação da República",
    [`20/11`]: "Consciência Negra (Lei 14.759/2023)",
    [`25/12`]: "Natal",
  };
  for (const f of extras) {
    if (!/^\d{2}\/\d{2}$/.test(f)) morrer(`feriado "${f}" fora do formato DD/MM`);
    lista[f] = "feriado local (informado)";
  }
  return lista;
}

function ehUtil(d, fer) { return d.getDay() !== 0 && d.getDay() !== 6 && !fer[chave(d)]; }

/** Empurra pro dia útil seguinte. Devolve a data e o motivo do empurrão, se houve. */
function proximoUtil(d, fer) {
  let x = d, motivo = null;
  while (!ehUtil(x, fer)) {
    if (!motivo) motivo = fer[chave(x)] ? fer[chave(x)] : DIAS[x.getDay()] === "sáb" ? "sábado" : "domingo";
    x = mais(x, 1);
  }
  return { data: x, motivo };
}

/** Antecipa pro dia útil anterior (obrigação trabalhista: o empregado recebe até a data). */
function anteriorUtil(d, fer) {
  let x = d, motivo = null;
  while (!ehUtil(x, fer)) {
    if (!motivo) motivo = fer[chave(x)] ? fer[chave(x)] : DIAS[x.getDay()] === "sáb" ? "sábado" : "domingo";
    x = mais(x, -1);
  }
  return { data: x, motivo };
}

/** Último dia útil do mês (0 a 11). */
function ultimoUtil(ano, mes, fer) {
  let x = new Date(ano, mes + 1, 0);
  while (!ehUtil(x, fer)) x = mais(x, -1);
  return x;
}

// ─────────────────────────── dinheiro ───────────────────────────

function reais(n) {
  return "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Valor do DAS-MEI pelo salário mínimo do ano da COMPETÊNCIA (janeiro paga dezembro do ano anterior). */
function valorDasMei(anoComp, atividade) {
  const sm = SALARIO_MINIMO[anoComp];
  if (!sm) return `[a confirmar: 5% do salário mínimo de ${anoComp} + R$ 1 de ICMS e/ou R$ 5 de ISS]`;
  const inss = atividade === "caminhoneiro" ? sm * 0.12 : sm * 0.05;
  const extra = { servicos: 5, comercio: 1, ambos: 6, caminhoneiro: 0 }[atividade];
  const partes = atividade === "caminhoneiro"
    ? `12% do mínimo de ${reais(sm)}; soma R$ 1 de ICMS e/ou R$ 5 de ISS conforme a carga`
    : `${reais(inss)} de INSS, 5% do mínimo de ${reais(sm)}` + { servicos: " + R$ 5 de ISS", comercio: " + R$ 1 de ICMS", ambos: " + R$ 1 de ICMS + R$ 5 de ISS" }[atividade];
  return `${reais(inss + extra)} (${partes})`;
}

function valorGps(anoComp) {
  const sm = SALARIO_MINIMO[anoComp];
  if (!sm) return `[a confirmar: 11% do salário mínimo de ${anoComp} no plano simplificado, ou 20% do que declarar entre o mínimo e o teto]`;
  return `${reais(sm * 0.11)} no plano simplificado (11% do mínimo de ${reais(sm)}), ou 20% do valor declarado entre ${reais(sm)} e o teto do INSS`;
}

// ─────────────────────────── linhas ───────────────────────────

function data(ano, ddmm) { const [d, m] = ddmm.split("/").map(Number); return new Date(ano, m - 1, d); }

function linhasDe(ano, enq, op) {
  const fer = feriados(ano, op.feriados);
  const prazos = PRAZOS_ANUAIS[ano] || {};
  const L = [];
  const mesNome = (m) => ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][m];
  const anoAnt = ano - 1;

  // pagamento mensal no dia N: competência do mês anterior. `valor` pode ser
  // texto ou função do ano da competência (janeiro paga dezembro do ano anterior).
  const mensal = (dia, nome, oque, valor, fonte) => {
    for (let m = 0; m < 12; m++) {
      const bruta = new Date(ano, m, dia);
      const { data: d, motivo } = proximoUtil(bruta, fer);
      const anoComp = m === 0 ? anoAnt : ano;
      const comp = m === 0 ? `dez/${anoAnt}` : `${mesNome(m - 1)}/${ano}`;
      const v = typeof valor === "function" ? valor(anoComp) : valor;
      L.push({ data: d, obrigacao: nome, oque: `${oque} (competência ${comp})${motivo ? `; dia ${dia} caiu em ${motivo}` : ""}`, valor: v, fonte, tipo: "pagamento" });
    }
  };
  const anual = (ddmm, nome, oque, valor, fonte) => {
    if (!ddmm) { L.push({ data: null, obrigacao: nome, oque, valor: "[a confirmar: prazo do ano ainda não publicado]", fonte, tipo: "declaracao" }); return; }
    L.push({ data: data(ano, ddmm), obrigacao: nome, oque, valor, fonte, tipo: "declaracao" });
  };

  if (enq === "mei") {
    mensal(20, "DAS-MEI", "guia mensal do MEI: INSS + ICMS/ISS", (a) => valorDasMei(a, op.atividade), FONTES.dasMei);
    mensal(20, "Relatório mensal de receitas", "preencher o relatório de receitas brutas do mês e guardar as notas; não se envia, fica arquivado", "sem valor", FONTES.tetoMei);
    anual(prazos.dasn, "DASN-SIMEI", `declaração anual do MEI, faturamento de ${anoAnt}; obrigatória mesmo sem faturamento`, "sem valor; atraso: multa mínima de R$ 50", FONTES.dasn);
    L.push({ data: new Date(ano, 11, 31), obrigacao: "Conferir o teto do MEI", "oque": "somar o faturamento do ano e comparar com R$ 81.000 (R$ 6.750 por mês no ano de abertura)", valor: "até R$ 97.200 paga DAS complementar; acima disso, desenquadra desde janeiro", fonte: FONTES.tetoMei, tipo: "controle" });
    L.push({ data: new Date(ano, 0, 2), obrigacao: "Rever o enquadramento", oque: "faturou perto do teto ou quer contratar mais de uma pessoa? é a janela de pedir desenquadramento sem custo retroativo", valor: "sem valor", fonte: FONTES.tetoMei, tipo: "controle" });
  }

  if (enq === "simples") {
    mensal(20, "PGDAS-D + DAS", "declarar a receita do mês no PGDAS-D e pagar o DAS gerado", "alíquota efetiva do anexo sobre a receita do mês; sem receita, declarar zero (multa mínima de R$ 50 se atrasar)", FONTES.pgdas);
    anual(prazos.defis, "DEFIS", `declaração anual do Simples, dados de ${anoAnt}; sem ela o PGDAS-D de março trava`, "sem valor; atraso: multa mínima de R$ 200", FONTES.pgdas);
    const optIn = ultimoUtil(ano, 0, fer);
    L.push({ data: optIn, obrigacao: "Opção pelo Simples", oque: "quem abriu ME fora do Simples ou saiu dele só entra de novo até o último dia útil de janeiro", valor: "sem valor", fonte: FONTES.pgdas, tipo: "controle" });
    L.push({ data: new Date(ano, 11, 31), obrigacao: "Conferir o Fator R e a faixa", oque: "folha dos últimos 12 meses ÷ receita dos últimos 12 meses: 28% ou mais fica no Anexo III, menos vai pro V; e ver em que faixa a receita acumulada caiu", valor: "sem valor", fonte: FONTES.pgdas, tipo: "controle" });
    if (ano === 2026) L.push({ data: new Date(2026, 10, 1), obrigacao: "NFS-e padrão nacional", oque: "ME e EPP do Simples que prestam serviço passam a emitir só pelo Emissor Nacional (Resolução CGSN 191/2026)", valor: "sem valor", fonte: FONTES.nfse, tipo: "controle" });
  }

  if (enq === "autonomo") {
    for (let m = 0; m < 12; m++) {
      const d = ultimoUtil(ano, m, fer);
      const comp = m === 0 ? `dez/${anoAnt}` : `${mesNome(m - 1)}/${ano}`;
      L.push({ data: d, obrigacao: "Carnê-leão (DARF 0190)", oque: `imposto sobre o que recebeu de pessoa física ou do exterior (competência ${comp}); só há imposto acima da faixa isenta`, valor: "tabela progressiva mensal + redutor da Lei 15.270/2025 (até R$ 5.000 não paga)", fonte: FONTES.tabelaIr, tipo: "pagamento" });
    }
    mensal(15, "GPS (INSS contribuinte individual)", "contribuição previdenciária de quem trabalha por conta própria", valorGps, FONTES.inss);
  }

  if (enq === "autonomo" || enq === "informal" || enq === "mei" || enq === "simples") {
    const inicio = prazos.irpfInicio ? ` (envio abre em ${prazos.irpfInicio})` : "";
    anual(prazos.irpfFim, "IRPF (pessoa física)", `declaração de ajuste anual da pessoa física, ano-base ${anoAnt}${inicio}; obriga quem passou dos limites de renda, bens ou atividade rural`, "sem valor; atraso: multa mínima de R$ 165,74", FONTES.irpf);
  }

  if (enq === "informal") {
    L.push({ data: new Date(ano, 0, 2), obrigacao: "Decidir a formalização", oque: "receita esperada no ano contra o teto do MEI e a lista de atividades permitidas; sem CNPJ, tudo que entrar de pessoa física é carnê-leão", valor: "sem valor", fonte: FONTES.tetoMei, tipo: "controle" });
    for (let m = 0; m < 12; m++) {
      const d = ultimoUtil(ano, m, fer);
      L.push({ data: d, obrigacao: "Carnê-leão (DARF 0190)", oque: "quem recebe de pessoa física sem CNPJ apura o imposto mês a mês", valor: "tabela progressiva mensal; até R$ 5.000 por mês não paga (Lei 15.270/2025)", fonte: FONTES.tabelaIr, tipo: "pagamento" });
    }
  }

  if (op.empregado && (enq === "mei" || enq === "simples")) {
    if (enq === "mei") {
      mensal(20, "DAE do eSocial (FGTS + INSS do empregado)", "guia única do empregado do MEI, gerada no eSocial; o FGTS mensal segue nela, só a rescisão vai pelo FGTS Digital", "8% de FGTS + 3% de INSS patronal sobre o salário, mais o INSS descontado do empregado", FONTES.fgtsDigital);
    } else {
      mensal(20, "FGTS Digital + DARF da DCTFWeb (empregado)", "FGTS do mês pela guia do FGTS Digital e INSS pelo DARF gerado na DCTFWeb (a DCTFWeb se entrega até o dia 15)", "8% de FGTS sobre o salário; INSS patronal só no Anexo IV (nos outros anexos já está dentro do DAS)", FONTES.fgtsDigital);
    }
    const p1 = anteriorUtil(new Date(ano, 10, 30), fer);
    const p2 = anteriorUtil(new Date(ano, 11, 20), fer);
    L.push({ data: p1.data, obrigacao: "13º salário (1ª parcela)", oque: `metade do salário, até 30/11${p1.motivo ? `; 30/11 caiu em ${p1.motivo}, antecipa` : ""}`, valor: "metade do salário, sem desconto", fonte: FONTES.empregadoMei, tipo: "pagamento" });
    L.push({ data: p2.data, obrigacao: "13º salário (2ª parcela)", oque: `o resto, até 20/12${p2.motivo ? `; 20/12 caiu em ${p2.motivo}, antecipa` : ""}`, valor: "metade do salário, com INSS e FGTS", fonte: FONTES.empregadoMei, tipo: "pagamento" });
  }

  L.sort((a, b) => (a.data ? a.data.getTime() : Infinity) - (b.data ? b.data.getTime() : Infinity));
  return { linhas: L, feriados: fer };
}

// ─────────────────────────── saída ───────────────────────────

function fmt(d) { return `${chave(d)}/${d.getFullYear()}`; }

function markdown(ano, enq, op, { linhas, feriados: fer }) {
  const nome = { mei: "MEI", simples: "ME/EPP no Simples Nacional", autonomo: "autônomo pessoa física", informal: "não formalizado" }[enq];
  const hoje = new Date();
  const out = [];
  out.push(`# Obrigações ${ano} — ${nome}`);
  out.push("");
  out.push(`> Gerado por \`node scripts/obrigacoes.js ${ano} ${enq}${op.atividade !== "servicos" && enq === "mei" ? ` --atividade ${op.atividade}` : ""}${op.empregado ? " --empregado" : ""}\` em ${fmt(hoje)}. Valor e prazo mudam todo ano: reconferir na fonte antes de pagar.`);
  out.push("");
  out.push("| Data | Dia | Obrigação | O que é | Valor ou base | Fonte |");
  out.push("|---|---|---|---|---|---|");
  for (const l of linhas) {
    const d = l.data ? fmt(l.data) : "[a confirmar]";
    const dia = l.data ? DIAS[l.data.getDay()] : "";
    out.push(`| ${d} | ${dia} | ${l.obrigacao} | ${l.oque} | ${l.valor} | ${l.fonte} |`);
  }
  out.push("");
  out.push("## Feriados considerados");
  out.push("");
  for (const [k, v] of Object.entries(fer).sort((a, b) => a[0].slice(3) + a[0].slice(0, 2) > b[0].slice(3) + b[0].slice(0, 2) ? 1 : -1)) {
    const d = data(ano, k);
    out.push(`- ${k} (${DIAS[d.getDay()]}) — ${v}`);
  }
  out.push("");
  out.push("Feriado estadual e municipal não entra sozinho. Pra ISS e obrigação da prefeitura, passar `--feriado DD/MM`.");
  return out.join("\n") + "\n";
}

// ─────────────────────────── CLI ───────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--ajuda") || args.includes("-h")) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\*\n?|^ \* ?/gm, "").trim());
    return;
  }
  const ano = parseInt(args[0], 10);
  const enq = (args[1] || "").toLowerCase();
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) morrer(`ano "${args[0]}" inválido`, "Uso: node scripts/obrigacoes.js 2026 mei");
  if (!["mei", "simples", "autonomo", "informal"].includes(enq)) morrer(`enquadramento "${args[1] || ""}" não existe`, "Aceita: mei, simples, autonomo, informal");

  const op = { atividade: "servicos", empregado: false, feriados: [], saida: null, json: false };
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === "--atividade") op.atividade = (args[++i] || "").toLowerCase();
    else if (a === "--empregado") op.empregado = true;
    else if (a === "--feriado") op.feriados.push(args[++i]);
    else if (a === "--saida") { op.saida = args[++i]; if (!op.saida) morrer("--saida precisa do caminho do arquivo"); }
    else if (a === "--json") op.json = true;
    else morrer(`opção "${a}" desconhecida`);
  }
  if (!["servicos", "comercio", "ambos", "caminhoneiro"].includes(op.atividade)) morrer(`atividade "${op.atividade}" não existe`, "Aceita: servicos, comercio, ambos, caminhoneiro");

  const res = linhasDe(ano, enq, op);
  if (!SALARIO_MINIMO[ano]) console.error(`⚠ salário mínimo de ${ano} não está no script: DAS-MEI e GPS saem como [a confirmar]`);
  if (!PRAZOS_ANUAIS[ano]) console.error(`⚠ prazos de declaração de ${ano} não estão no script: DASN, DEFIS e IRPF saem como [a confirmar]`);

  if (op.json) {
    const j = res.linhas.map((l) => ({ ...l, data: l.data ? fmt(l.data) : null, dia: l.data ? DIAS[l.data.getDay()] : null }));
    const s = JSON.stringify(j, null, 2);
    if (op.saida) { fs.mkdirSync(path.dirname(path.resolve(op.saida)), { recursive: true }); fs.writeFileSync(op.saida, s + "\n"); console.log(`✔ ${j.length} linhas em ${op.saida}`); } else console.log(s);
    return;
  }
  const md = markdown(ano, enq, op, res);
  if (op.saida) {
    fs.mkdirSync(path.dirname(path.resolve(op.saida)), { recursive: true });
    fs.writeFileSync(op.saida, md);
    console.log(`✔ ${res.linhas.length} linhas em ${op.saida}`);
    console.log(`  confira: node scripts/verificar.js datas ${op.saida}`);
  } else {
    process.stdout.write(md);
  }
}

main();
