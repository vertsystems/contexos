#!/usr/bin/env node
/**
 * Contex OS — socios.js
 * Faz as três contas do acordo de sócios que ninguém faz de cabeça: confere
 * que as participações somam 100%, monta a tabela de vesting por data (cliff,
 * período e o que cada sócio já tem "ganho" em cada dia) e simula a apuração
 * de haveres de quem sai (valor, parcelas em dia útil, comparado com o padrão
 * da lei: à vista em 90 dias).
 *
 * Existe porque a conversa entre sócios costuma terminar em "a gente se
 * entende", e o dia em que um sai, morre ou para de trabalhar é o dia em que
 * ninguém mais se entende. A lei tem um padrão pra cada silêncio do contrato
 * (Código Civil, art. 1.028 a 1.031; CPC, art. 599 a 609), e esse padrão quase
 * nunca é o que os sócios queriam. O número mostrado aqui é o que vai na folha
 * de decisões que o /socios leva ao advogado. O script não redige cláusula.
 *
 * Uso:
 *   node scripts/socios.js <spec.json> [opções]
 *   node scripts/socios.js --exemplo > juridico/acordo-de-socios.json
 *
 * Opções:
 *   --saida <arquivo.md>   grava o markdown em vez de imprimir
 *   --hoje DD/MM/AAAA      data de referência do "já adquirido até hoje" (padrão: hoje)
 *   --json                 imprime o resultado em JSON, pra outra ferramenta ler
 *   --feriado DD/MM        feriado local (repetir pra cada um); move parcela que cai nele
 *   --exemplo              imprime um spec de exemplo, comentado, pra começar
 *
 * O spec (ver --exemplo) tem: empresa, capital, socios[] com participacao (%) e,
 * opcionalmente, vesting {inicio, meses, cliff, periodo, sujeito}; e haveres
 * {quem, motivo, data, valor_referencia, parcelas, carencia_meses}.
 *
 * Se as participações não somarem 100%, o script mostra a tabela com o diagnóstico,
 * NÃO calcula vesting nem haveres, não grava arquivo nenhum e sai com código 2.
 * Percentual de um bolo que não fecha dá número errado com cara de número certo.
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const FONTE_CC = "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm";
const FONTE_CPC = "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm";
const FONTE_1445 = "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14451.htm";
const CONFERIDO_EM = "2026-09-23";
const PERIODOS = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
// Cada motivo carrega o nome do evento que dispara a contagem, porque a data da
// resolução da sociedade muda conforme ele (CPC art. 605).
const MOTIVOS = {
  retirada: { evento: "da notificação da retirada", texto: "retirada voluntária (CC art. 1.029; data da resolução = 60º dia após a notificação, CPC art. 605, II)" },
  morte: { evento: "do óbito", texto: "morte do sócio (CC art. 1.028; data da resolução = a do óbito, CPC art. 605, I)" },
  exclusao: { evento: "da reunião que deliberou a exclusão", texto: "exclusão extrajudicial por justa causa (CC art. 1.085; data da resolução = a da reunião, CPC art. 605, V)" },
  incapacidade: { evento: "do trânsito em julgado da decisão", texto: "exclusão judicial por incapacidade superveniente (CC art. 1.030; data da resolução = trânsito em julgado, CPC art. 605, IV)" },
};

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Lê "--chave valor" e "--flag". Opção repetida vira lista. */
function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2);
    const prox = argv[i + 1];
    const v = prox === undefined || prox.startsWith("--") ? true : argv[++i];
    if (o[k] === undefined) o[k] = v;
    else o[k] = [].concat(o[k], v);
  }
  return o;
}

/** Soma meses mantendo o dia; se o mês não tem o dia (31 → fev), vai pro último dia. */
function maisMeses(d, n) {
  const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  return new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(d.getDate(), ultimo));
}

// ─────────────────────────── participações ───────────────────────────

/** Confere que as participações somam 100% (tolerância de 0,01) e devolve as quotas de cada um. */
function conferirParticipacoes(spec) {
  const socios = spec.socios || [];
  if (socios.length < 2) throw new Error("o spec precisa de pelo menos dois sócios em \"socios\"");
  const capital = br.numero(spec.capital);
  if (spec.capital !== undefined && spec.capital !== null && (isNaN(capital) || capital <= 0))
    throw new Error(`"capital" inválido ("${spec.capital}"): use o número em reais, como 20000 ou "R$ 20.000,00", ou apague a chave`);
  const vistos = new Set();
  const linhas = socios.map((s) => {
    const p = br.numero(s.participacao);
    if (!s.nome) throw new Error("todo sócio precisa de \"nome\"");
    if (vistos.has(s.nome)) throw new Error(`dois sócios com o nome "${s.nome}": o nome é a chave do vesting e dos haveres, então precisa ser único (use "João pai" e "João filho", por exemplo)`);
    vistos.add(s.nome);
    if (isNaN(p) || p <= 0 || p > 100) throw new Error(`participação de ${s.nome} inválida: "${s.participacao}" (esperado um número maior que 0 e até 100, em %)`);
    return { nome: s.nome, participacao: p, quotas: isNaN(capital) ? null : br.centavos(capital * p / 100) };
  });
  const soma = br.centavos(linhas.reduce((a, l) => a + l.participacao, 0));
  const fecha = Math.abs(soma - 100) < 0.01;
  return { linhas, soma, fecha, capital: isNaN(capital) ? null : capital };
}

// ─────────────────────────── vesting ───────────────────────────

/**
 * Tabela de vesting por data pra um sócio. Regras:
 *   · antes do cliff, 0% adquirido; no cliff, cliff/meses;
 *   · depois, a cada período (mensal, trimestral...), mais periodo/meses;
 *   · "sujeito" é a fração da participação que entra no vesting (100 = tudo).
 * Devolve { marcos: [{data, mesesDecorridos, adquiridoPct, participacaoAdquirida, participacaoEmRisco}], ... }
 */
function tabelaVesting(socio, hoje) {
  const v = socio.vesting;
  const inicio = br.lerData(v.inicio);
  if (!inicio) throw new Error(`vesting de ${socio.nome}: "inicio" inválido ("${v.inicio}"), use DD/MM/AAAA`);
  const meses = Number(v.meses);
  const cliff = v.cliff === undefined ? 0 : Number(v.cliff);
  const periodoNome = v.periodo || "mensal";
  const passo = PERIODOS[periodoNome];
  if (!passo) throw new Error(`vesting de ${socio.nome}: período "${periodoNome}" desconhecido (mensal, trimestral, semestral, anual)`);
  if (!Number.isInteger(meses) || meses <= 0) throw new Error(`vesting de ${socio.nome}: "meses" precisa ser inteiro positivo`);
  if (!Number.isInteger(cliff) || cliff < 0 || cliff > meses) throw new Error(`vesting de ${socio.nome}: cliff ${cliff} fora de 0..${meses}`);
  const sujeito = v.sujeito === undefined ? 100 : br.numero(v.sujeito);
  if (isNaN(sujeito) || sujeito <= 0 || sujeito > 100)
    throw new Error(`vesting de ${socio.nome}: "sujeito" inválido ("${v.sujeito}"), use a fatia da participação que entra no vesting, de 1 a 100`);
  const participacao = br.numero(socio.participacao);
  const fixo = br.centavos(participacao * (100 - sujeito) / 100);

  const marcos = [];
  const pontos = new Set([cliff]);
  for (let m = cliff; m <= meses; m += passo) pontos.add(m);
  pontos.add(meses);
  for (const m of [...pontos].sort((a, b) => a - b)) {
    if (m === 0 && cliff === 0) continue;
    const frac = m / meses;
    const adquiridoPct = Math.round(frac * 10000) / 100;
    const adquirida = br.centavos(fixo + participacao * (sujeito / 100) * frac);
    marcos.push({
      data: maisMeses(inicio, m),
      mesesDecorridos: m,
      adquiridoPct,
      participacaoAdquirida: adquirida,
      participacaoEmRisco: br.centavos(participacao - adquirida),
      cliff: m === cliff && cliff > 0,
    });
  }
  const passado = marcos.filter((x) => x.data <= hoje);
  const hojeAdquirido = passado.length ? passado[passado.length - 1] : { adquiridoPct: 0, participacaoAdquirida: fixo, participacaoEmRisco: br.centavos(participacao - fixo) };
  return { nome: socio.nome, inicio, meses, cliff, periodo: periodoNome, sujeito, participacao, fixo, marcos, hoje: hojeAdquirido };
}

// ─────────────────────────── haveres ───────────────────────────

/**
 * Simula a apuração de haveres de quem sai.
 *   valor_referencia: o valor da empresa inteira pelo critério escolhido (balanço de determinação,
 *   múltiplo, valor contábil). O script não avalia empresa: usa o número que veio.
 *   haveres = valor_referencia × participação (a adquirida, se houver vesting em curso).
 *   Padrão legal: em dinheiro, em 90 dias da liquidação (CC art. 1.031, § 2º), salvo contrato.
 */
function simularHaveres(spec, vestings, extras = []) {
  const h = spec.haveres;
  const socio = (spec.socios || []).find((s) => s.nome === h.quem);
  if (!socio) throw new Error(`haveres: sócio "${h.quem}" não está na lista de sócios`);
  const motivo = h.motivo || "retirada";
  if (!MOTIVOS[motivo]) throw new Error(`haveres: motivo "${motivo}" desconhecido (use um destes: ${Object.keys(MOTIVOS).join(", ")})`);
  const evento = br.lerData(h.data);
  if (!evento) throw new Error(`haveres: "data" inválida ("${h.data}"), use DD/MM/AAAA`);
  const valorRef = br.numero(h.valor_referencia);
  if (isNaN(valorRef) || valorRef < 0) throw new Error(`haveres: "valor_referencia" inválido ("${h.valor_referencia}")`);
  const parcelas = h.parcelas === undefined ? 1 : Number(h.parcelas);
  if (!Number.isInteger(parcelas) || parcelas < 1) throw new Error("haveres: \"parcelas\" precisa ser inteiro a partir de 1");
  const carencia = h.carencia_meses === undefined ? 0 : Number(h.carencia_meses);
  if (!Number.isInteger(carencia) || carencia < 0) throw new Error("haveres: \"carencia_meses\" precisa ser inteiro a partir de 0");

  // data da resolução conforme o motivo (CPC art. 605)
  const resolucao = motivo === "retirada" ? br.mais(evento, 60) : evento;
  const participacaoTotal = br.numero(socio.participacao);
  const vest = vestings.find((v) => v.nome === socio.nome);
  let participacaoPaga = participacaoTotal;
  let nota = null;
  if (vest) {
    const passado = vest.marcos.filter((x) => x.data <= resolucao);
    participacaoPaga = passado.length ? passado[passado.length - 1].participacaoAdquirida : vest.fixo;
    nota = `${socio.nome} tem vesting em curso: na data da resolução tinha ${pctBr(participacaoPaga)} adquiridos de ${pctBr(participacaoTotal)}. A parte não adquirida (${pctBr(br.centavos(participacaoTotal - participacaoPaga))}) segue a regra de recompra do acordo, não entra nos haveres.`;
    if (participacaoPaga === 0) nota += ` Como a resolução cai antes do cliff, os haveres dão zero: o que existe é a recompra da participação inteira, pelo preço que o acordo fixar. Esse preço precisa estar escrito, senão a conta volta pro juiz.`;
  }
  const total = br.centavos(valorRef * participacaoPaga / 100);
  const bruta = Math.floor(total / parcelas * 100) / 100;
  const primeira = maisMeses(resolucao, carencia);
  const lista = [];
  let acumulado = 0;
  for (let i = 1; i <= parcelas; i++) {
    const valor = i === parcelas ? br.centavos(total - acumulado) : bruta;
    acumulado = br.centavos(acumulado + valor);
    const prevista = maisMeses(primeira, i - 1);
    const { data, motivo: m } = br.proximoUtil(prevista, extras);
    lista.push({ n: i, prevista, data, empurrada: m, valor });
  }
  const padraoLegal = br.proximoUtil(br.mais(resolucao, 90), extras).data;
  return { socio: socio.nome, motivo, descricaoMotivo: MOTIVOS[motivo].texto, nomeEvento: MOTIVOS[motivo].evento, evento, resolucao, valorRef, participacaoTotal, participacaoPaga, total, parcelas, carencia, lista, padraoLegal, nota };
}

// ─────────────────────────── markdown ───────────────────────────

function pctBr(n) { return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%"; }

function markdown(spec, r, hoje) {
  const L = [];
  L.push(`# Contas do acordo de sócios — ${spec.empresa || "[empresa]"}`);
  L.push("");
  L.push(`> Gerado por \`scripts/socios.js\` em ${br.fmt(hoje)}. Rascunho pra advogado: números, não cláusulas.`);
  L.push(`> Base legal conferida em ${CONFERIDO_EM}: [Código Civil](${FONTE_CC}) art. 997, 1.028 a 1.031, 1.055, 1.057, 1.076 e 1.085; [CPC](${FONTE_CPC}) art. 599 a 609; [Lei 14.451/2022](${FONTE_1445}), que baixou o quórum de alteração do contrato social pra mais da metade do capital.`);
  L.push("");
  L.push("## Participações");
  L.push("");
  L.push("| Sócio | Participação | Quotas (R$) |");
  L.push("|---|---|---|");
  for (const l of r.participacoes.linhas) L.push(`| ${l.nome} | ${pctBr(l.participacao)} | ${l.quotas === null ? "[capital não informado]" : br.reais(l.quotas)} |`);
  L.push(`| **Total** | **${pctBr(r.participacoes.soma)}** | ${r.participacoes.capital === null ? "" : "**" + br.reais(r.participacoes.capital) + "**"} |`);
  L.push("");
  if (r.participacoes.fecha) {
    L.push("As participações fecham 100%.");
  } else {
    const falta = br.centavos(100 - r.participacoes.soma);
    const diagnostico = falta > 0
      ? `Faltam ${pctBr(falta)}, que é quota sem dono no registro da Junta`
      : `Sobram ${pctBr(-falta)}, ou seja, mais quota distribuída do que existe`;
    L.push(`**As participações somam ${pctBr(r.participacoes.soma)}, não 100%.** ${diagnostico}. Corrigir antes de qualquer outra conta: vesting e haveres não foram calculados, porque toda conta daqui pra frente é uma fatia deste bolo.`);
  }
  L.push("");

  if (r.vestings.length) {
    L.push("## Vesting por permanência");
    L.push("");
    for (const v of r.vestings) {
      L.push(`### ${v.nome}: ${pctBr(v.participacao)} no papel, ${pctBr(v.sujeito)} disso sujeito a vesting`);
      L.push("");
      L.push(`Início em ${br.fmt(v.inicio)}, ${v.meses} meses, cliff de ${v.cliff} ${v.cliff === 1 ? "mês" : "meses"}, aquisição ${v.periodo}. Parte fixa (fora do vesting): ${pctBr(v.fixo)}. Até ${br.fmt(hoje)}: ${pctBr(v.hoje.participacaoAdquirida)} adquiridos, ${pctBr(v.hoje.participacaoEmRisco)} ainda em risco.`);
      L.push("");
      // Todas as colunas desta tabela levam "%" no título de propósito, e o marco junta
      // data, mês e percentual numa célula só. Motivo: o verificar.js tabela soma coluna
      // de número puro e compara com o total declarado por perto. Um cronograma não soma
      // — 13 datas do dia 01 dariam 13, quatro marcos anuais dariam 120 — e o "100,00%"
      // da tabela de participações logo acima virava falso erro. Coluna com "%" no título
      // o verificador pula, e aqui isso é correto: percentual acumulado não se soma.
      L.push("| Marco (data, mês e % do vesting) | Participação adquirida (%) | Em risco se sair (%) |");
      L.push("|---|---|---|");
      for (const m of v.marcos) L.push(`| ${br.fmt(m.data)} (${br.diaSemana(m.data)}) · mês ${m.mesesDecorridos} de ${v.meses} · ${pctBr(m.adquiridoPct)}${m.cliff ? " · cliff" : ""} | ${pctBr(m.participacaoAdquirida)} | ${pctBr(m.participacaoEmRisco)} |`);
      L.push("");
    }
    L.push("A coluna \"em risco\" é o que a sociedade ou os outros sócios recompram, pelo preço que o acordo fixar, se o sócio sair antes da data. Quota não pode ser paga com trabalho (CC art. 1.055, § 2º), então o vesting vive no acordo como promessa de recompra ou de cessão, nunca como capital \"a integralizar com serviço\".");
    L.push("");
  }

  if (r.haveres) {
    const h = r.haveres;
    L.push("## Apuração de haveres (exemplo numérico)");
    L.push("");
    L.push(`Cenário: ${h.descricaoMotivo}. Data ${h.nomeEvento}: ${br.fmt(h.evento)} (${br.diaSemana(h.evento)}). Data da resolução da sociedade: ${br.fmt(h.resolucao)} (${br.diaSemana(h.resolucao)}).`);
    L.push("");
    if (h.nota) { L.push(h.nota); L.push(""); }
    // "Quanto (R$ ou %)" tem % no título porque a coluna mistura reais e percentual:
    // somar as três linhas não significa nada, e o verificador pula coluna com "%".
    L.push("| Item | Quanto (R$ ou %) |");
    L.push("|---|---|");
    L.push(`| Valor de referência da empresa inteira | ${br.reais(h.valorRef)} |`);
    L.push(`| Participação de ${h.socio} que entra na conta | ${pctBr(h.participacaoPaga)} |`);
    L.push(`| Haveres | ${br.reais(h.total)} |`);
    L.push("");
    L.push(`Conta: ${br.reais(h.valorRef)} × ${pctBr(h.participacaoPaga)} = ${br.reais(h.total)}.`);
    L.push("");
    if (h.total === 0) {
      // Sem participação adquirida não há haveres, e tabela de parcelas de R$ 0,00 só
      // ocupa espaço na folha. O que precisa de resposta é o preço da recompra.
      L.push(`Não há haveres a pagar neste cenário: a participação adquirida é zero. A pergunta que sobra pro advogado é o preço da recompra da parte não adquirida e em quanto tempo ela se paga — sem esse número escrito, o cenário volta a ser uma discussão.`);
      L.push("");
      return L.join("\n");
    }
    L.push(`**Padrão da lei, se o contrato não disser nada:** tudo em dinheiro em 90 dias da liquidação (CC art. 1.031, § 2º), ou seja, ${br.reais(h.total)} até ${br.fmt(h.padraoLegal)} (${br.diaSemana(h.padraoLegal)}), contando da data da resolução como se a liquidação fosse imediata. Na prática a liquidação depende do balanço de determinação e costuma demorar mais.`);
    L.push("");
    L.push(`**Como o acordo propõe:** ${h.parcelas} ${h.parcelas === 1 ? "parcela" : "parcelas"}${h.carencia ? `, carência de ${h.carencia} ${h.carencia === 1 ? "mês" : "meses"}` : ""}, vencimento empurrado pra dia útil.`);
    L.push("");
    // Mesma razão da tabela de vesting: a coluna de vencimento junta número de parcela,
    // data e fatia, e leva "%" no título pra o verificador não somar dia do mês nem
    // número de parcela. A coluna "Valor" fica limpa de propósito — é a única soma que
    // significa alguma coisa aqui, e é ela que a linha de total confere. A observação
    // sai sem dígito pro mesmo motivo.
    L.push("| Parcela e vencimento (% do total) | Valor | Observação |");
    L.push("|---|---|---|");
    for (const p of h.lista) {
      const fatia = h.total > 0 ? " · " + pctBr(br.centavos(p.valor / h.total * 100)) : "";
      L.push(`| ${p.n} de ${h.parcelas} · ${br.fmt(p.data)} (${br.diaSemana(p.data)})${fatia} | ${br.reais(p.valor)} | ${p.empurrada ? `caía em ${p.empurrada}; empurrada pro dia útil seguinte` : ""} |`);
    }
    L.push(`| **Total** | **${br.reais(h.total)}** | |`);
    L.push("");
    L.push("Correção monetária e juros das parcelas não estão na tabela: o índice é decisão do acordo (CPC art. 608, parágrafo único, garante ao menos correção e juros legais depois da resolução).");
    L.push("");
  }
  return L.join("\n");
}

// ─────────────────────────── exemplo ───────────────────────────

const EXEMPLO = {
  "_comentario": "Spec do scripts/socios.js. Participação em %, datas DD/MM/AAAA, valores em reais. Apague as chaves que não usar (vesting e haveres são opcionais).",
  empresa: "Estúdio Exemplo Ltda.",
  capital: 20000,
  socios: [
    { nome: "Ana", participacao: 50 },
    { nome: "Bruno", participacao: 30, vesting: { inicio: "01/10/2026", meses: 48, cliff: 12, periodo: "trimestral", sujeito: 100 } },
    { nome: "Carla", participacao: 20, vesting: { inicio: "01/10/2026", meses: 36, cliff: 12, periodo: "mensal", sujeito: 50 } },
  ],
  haveres: {
    "_comentario": "motivo: retirada | morte | exclusao | incapacidade. valor_referencia é a empresa inteira pelo critério que os sócios escolheram; o script não avalia empresa.",
    quem: "Bruno",
    motivo: "retirada",
    data: "15/03/2028",
    valor_referencia: 600000,
    parcelas: 12,
    carencia_meses: 3,
  },
};

// ─────────────────────────── principal ───────────────────────────

function calcular(spec, opts = {}) {
  const hoje = opts.hoje ? br.lerData(opts.hoje) : new Date();
  if (!hoje) throw new Error(`--hoje inválido ("${opts.hoje}"), use DD/MM/AAAA`);
  const extras = [].concat(opts.feriado || []).filter((f) => f !== true);
  for (const f of extras) {
    if (!/^\d{2}\/\d{2}$/.test(f)) throw new Error(`--feriado "${f}" fora do formato DD/MM (feriado local não leva ano: --feriado 20/01)`);
  }
  const participacoes = conferirParticipacoes(spec);
  // Participação que não fecha 100% para a conta aqui. Não é preciosismo: os haveres
  // são um percentual do valor da empresa, e percentual de um bolo que não fecha dá
  // um número errado com cara de número certo, que é o pior defeito de uma folha que
  // vai pro advogado.
  if (!participacoes.fecha) return { hoje, participacoes, vestings: [], haveres: null, bloqueado: true };
  const vestings = (spec.socios || []).filter((s) => s.vesting).map((s) => tabelaVesting(s, hoje));
  const haveres = spec.haveres ? simularHaveres(spec, vestings, extras) : null;
  return { hoje, participacoes, vestings, haveres, bloqueado: false };
}

function main() {
  const o = args(process.argv.slice(2));
  if (o.exemplo) { console.log(JSON.stringify(EXEMPLO, null, 2)); return; }
  const arquivo = o._[0];
  if (!arquivo) morrer("falta o spec", "node scripts/socios.js juridico/acordo-de-socios.json [--saida juridico/acordo-de-socios-contas.md]\nnode scripts/socios.js --exemplo > juridico/acordo-de-socios.json");
  const caminho = path.resolve(arquivo);
  if (!fs.existsSync(caminho)) morrer(`arquivo não encontrado: ${arquivo}`);
  let spec;
  try { spec = JSON.parse(fs.readFileSync(caminho, "utf8")); }
  catch (e) { morrer(`o spec não é JSON válido: ${e.message}`); }

  let r;
  try { r = calcular(spec, { hoje: o.hoje, feriado: o.feriado }); }
  catch (e) { morrer(e.message); }

  if (o.json) {
    console.log(JSON.stringify(r, function (k, v) { const bruto = this[k]; return bruto instanceof Date ? br.fmt(bruto) : v; }, 2));
  } else {
    const md = markdown(spec, r, r.hoje);
    // Spec quebrado não grava arquivo: folha de decisões pela metade no disco é pior
    // que folha nenhuma, porque alguém lê depois e acha que está pronta.
    if (o.saida && o.saida !== true && r.participacoes.fecha) {
      fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
      fs.writeFileSync(path.resolve(o.saida), md + "\n");
      console.log(`✔ gravado em ${o.saida}`);
    } else console.log(md);
  }
  if (!r.participacoes.fecha) {
    const falta = br.centavos(100 - r.participacoes.soma);
    console.error(`\n✖ as participações somam ${pctBr(r.participacoes.soma)}, não 100%`);
    console.error(`\n  ${falta > 0 ? "Faltam" : "Sobram"} ${pctBr(Math.abs(falta))}. Corrija o campo "participacao" dos sócios no spec e rode de novo; nada foi gravado.\n`);
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = { conferirParticipacoes, tabelaVesting, simularHaveres, calcular, markdown, maisMeses, MOTIVOS, EXEMPLO };
