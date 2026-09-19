#!/usr/bin/env node
/**
 * Contex OS — entregas.js
 * Confere a lista de entregas de um sistema (ENTREGAS.md) e faz a conta que
 * ninguém faz de cabeça: soma das faixas, o que bloqueia o quê, o caminho mais
 * longo, e o que pode começar agora.
 *
 * Existe porque lista de entregas lida no olho passa com erro dentro: entrega
 * que depende de outra que vem depois dela, faixa de "5 a 40 dias" fingindo ser
 * estimativa, total escrito à mão que não bate com a soma, entrega marcada como
 * feita em cima de dependência aberta. Cada uma dessas vira uma semana perdida
 * quando o /backend começa a construir. Aqui tudo é contagem e grafo; nada é
 * estimado.
 *
 * Uso:
 *   node scripts/entregas.js sistemas/<nome>/ENTREGAS.md              confere e mostra a conta
 *   node scripts/entregas.js sistemas/<nome>/ENTREGAS.md --proxima    só a próxima entrega livre
 *   node scripts/entregas.js sistemas/<nome>/ENTREGAS.md --json       a mesma conta em JSON
 *
 * Opções:
 *   --dedicacao <dias>   dias de trabalho por semana que o time dedica a este sistema.
 *                        Sobrepõe a linha "> **Dedicação:** N dias por semana" do arquivo.
 *                        Padrão: 5. É também o teto de cada entrega (uma semana do time real)
 *
 * O que ele lê: a tabela cujo cabeçalho começa com "#" e tem as colunas
 * Entrega | Prova de pronto | Depende de | Faixa (dias) | Estoura se | Estado.
 * Uma linha por entrega, com o número no formato E1, E2... A linha "Soma" no fim
 * da tabela é conferida contra a soma das faixas. Estados aceitos: "a fazer",
 * "em andamento", "feita AAAA-MM-DD", "esperando <o quê> desde AAAA-MM-DD",
 * "cancelada". Faixa "[a confirmar]" é aceita como pendência (aviso, fora da
 * soma) enquanto quem constrói não respondeu piso, teto e o que estoura.
 *
 * Sai com código 1 se achar erro, pra dar pra encadear num script.
 *
 * Node 18+, sem dependência.
 */

const fs = require("fs");

// ─────────────────────────── utilidades ───────────────────────────

let problemas = 0;
let avisos = 0;
// com --json, as mensagens vão dentro do JSON em vez de sujar a saída
const mensagens = [];
const modoJson = process.argv.includes("--json");
const dizer = (linha) => (modoJson ? mensagens.push(linha.trim()) : console.log(linha));
const erro = (m) => { dizer(`  ✖ ${m}`); problemas++; };
const aviso = (m) => { dizer(`  ! ${m}`); avisos++; };
const ok = (m) => dizer(`  ✓ ${m}`);
const info = (m) => dizer(`  · ${m}`);

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function semAcento(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function celulas(linha) {
  const c = linha.split("|").map((s) => s.trim());
  if (c.length && c[0] === "") c.shift();
  if (c.length && c[c.length - 1] === "") c.pop();
  return c;
}

function numero(s) {
  const v = parseFloat(String(s).replace(",", "."));
  return isNaN(v) ? null : v;
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function dataValida(s) {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d;
}

// ─────────────────────────── argumentos ───────────────────────────

const args = process.argv.slice(2);
const COM_VALOR = ["--dedicacao"];
const flag = (nome) => args.includes(`--${nome}`);
const valorDe = (nome) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : null;
};
// o arquivo é o primeiro argumento que não é flag nem valor de flag
// (senão "--dedicacao 3 ENTREGAS.md" tenta abrir um arquivo chamado "3")
const arquivo = args.find((a, i) => !a.startsWith("--") && !COM_VALOR.includes(args[i - 1]));

if (!arquivo) {
  morrer("Falta o arquivo.", "Uso: node scripts/entregas.js sistemas/<nome>/ENTREGAS.md [--proxima] [--json] [--dedicacao 3]");
}
if (!fs.existsSync(arquivo)) morrer(`Não achei ${arquivo}.`, "O /quebrar grava a lista em sistemas/<nome>/ENTREGAS.md.");

const bruto = fs.readFileSync(arquivo, "utf8");
if (bruto.charCodeAt(0) === 0xfeff) morrer("O arquivo começa com BOM.", "Salve como UTF-8 sem BOM.");
const linhas = bruto.split(/\r?\n/);

// ─────────────────────────── dedicação ───────────────────────────

let dedicacao = 5;
let dedicacaoDeOnde = "padrão";
// só a linha de cabeçalho "> **Dedicação:** N dias por semana", não qualquer frase
// do texto que cite a palavra (a linha "Falta: ... na dedicação atual" também tem número)
const linhaDedicacao = linhas.find((l) => /^\s*>?\s*\**\s*dedica[cç][aã]o\s*:?\**\s*:?/i.test(l) && /\d/.test(l));
if (linhaDedicacao) {
  const m = linhaDedicacao.match(/(\d+(?:[.,]\d+)?)\s*dias?/i);
  if (m) { dedicacao = numero(m[1]); dedicacaoDeOnde = "arquivo"; }
}
if (valorDe("dedicacao") !== null) {
  const v = numero(valorDe("dedicacao"));
  if (v === null) morrer(`--dedicacao precisa ser um número de dias por semana, não "${valorDe("dedicacao")}".`);
  dedicacao = v;
  dedicacaoDeOnde = "--dedicacao";
}
if (dedicacao < 0.5 || dedicacao > 7) {
  morrer(
    `Dedicação de ${fmt(dedicacao)} dias por semana (${dedicacaoDeOnde}) não faz sentido: precisa ficar entre 0,5 e 7.`,
    'Escreva no topo do arquivo "> **Dedicação:** N dias por semana", contando só dia de trabalho de verdade.'
  );
}

// ─────────────────────────── achar a tabela ───────────────────────────

let cab = null;
let corpo = [];
let linhaTabela = -1;
for (let i = 0; i < linhas.length; i++) {
  if (!/^\s*\|\s*#\s*\|/.test(linhas[i])) continue;
  if (!/^\s*\|[\s:|-]+\|\s*$/.test(linhas[i + 1] || "")) continue;
  cab = celulas(linhas[i]);
  linhaTabela = i + 1;
  let j = i + 2;
  while (j < linhas.length && /^\s*\|/.test(linhas[j])) {
    corpo.push({ n: j + 1, c: celulas(linhas[j]) });
    j++;
  }
  break;
}

if (!cab) {
  morrer(
    "Não achei a tabela de entregas.",
    "Ela começa com o cabeçalho | # | Entrega | Prova de pronto | Depende de | Faixa (dias) | Estoura se | Estado |"
  );
}

const col = (chave) => cab.findIndex((t) => semAcento(t).includes(chave));
const COL = {
  id: 0,
  entrega: col("entrega"),
  prova: col("prova") >= 0 ? col("prova") : col("pronto"),
  depende: col("depende"),
  faixa: col("faixa"),
  estoura: col("estoura"),
  estado: col("estado"),
};
for (const [nome, idx] of Object.entries(COL)) {
  if (idx < 0) morrer(`A tabela não tem a coluna "${nome}".`, "Cabeçalho esperado: | # | Entrega | Prova de pronto | Depende de | Faixa (dias) | Estoura se | Estado |");
}

// ─────────────────────────── ler as entregas ───────────────────────────

const RE_ID = /^E\d+$/i;
const RE_FAIXA = /^(\d+(?:[.,]\d+)?)\s*(?:a|até|-|–)\s*(\d+(?:[.,]\d+)?)\s*(?:dias?)?$/i;
const RE_UNICO = /^(\d+(?:[.,]\d+)?)\s*(?:dias?)?$/i;

const entregas = [];
let totalDeclarado = null;

for (const { n, c } of corpo) {
  const id = (c[COL.id] || "").trim();
  if (/^\**\s*(soma|total)\b/i.test(id)) {
    const m = (c[COL.faixa] || "").match(RE_FAIXA);
    totalDeclarado = m ? { min: numero(m[1]), max: numero(m[2]), linha: n } : { min: null, max: null, linha: n };
    continue;
  }
  if (!RE_ID.test(id)) {
    if (id) aviso(`linha ${n}: "${id}" não é E1, E2... nem "Total": ignorei`);
    continue;
  }

  const e = {
    id: id.toUpperCase(),
    linha: n,
    nome: (c[COL.entrega] || "").replace(/\*\*/g, "").trim(),
    prova: (c[COL.prova] || "").trim(),
    dependeBruto: (c[COL.depende] || "").trim(),
    faixaBruto: (c[COL.faixa] || "").trim(),
    estoura: (c[COL.estoura] || "").replace(/^[—–-]$/, "").trim(),
    estadoBruto: (c[COL.estado] || "").trim(),
    depende: [],
    min: null,
    max: null,
    aConfirmar: false,
    estado: null,
    feitaEm: null,
    esperando: null,
    esperandoDesde: null,
  };

  // dependências
  if (!/^(—|-|–|nenhuma|)$/i.test(e.dependeBruto)) {
    e.depende = e.dependeBruto.split(/[,;]|\se\s/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  }

  // estado
  const est = semAcento(e.estadoBruto);
  if (/^a fazer$/.test(est)) e.estado = "a fazer";
  else if (/^em andamento$/.test(est)) e.estado = "em andamento";
  else if (/^feita\b/.test(est)) {
    e.estado = "feita";
    const d = e.estadoBruto.match(/(\d{4}-\d{2}-\d{2})/);
    e.feitaEm = d ? d[1] : null;
  } else if (/^esperando\b/.test(est)) {
    e.estado = "esperando";
    e.esperando = e.estadoBruto.replace(/^esperando[:\s]*/i, "").trim() || null;
    const d = e.estadoBruto.match(/desde\s+(\d{4}-\d{2}-\d{2})/i);
    e.esperandoDesde = d ? d[1] : null;
  } else if (/^cancelada\b/.test(est)) e.estado = "cancelada";
  else e.estado = null;

  // faixa
  const mf = e.faixaBruto.match(RE_FAIXA);
  if (mf) { e.min = numero(mf[1]); e.max = numero(mf[2]); }
  else if (RE_UNICO.test(e.faixaBruto)) { e.min = e.max = numero(e.faixaBruto.match(RE_UNICO)[1]); e.unico = true; }
  else if (/a confirmar/i.test(e.faixaBruto)) e.aConfirmar = true;

  entregas.push(e);
}

if (!entregas.length) morrer("A tabela existe, mas não tem nenhuma linha E1, E2...");

const porId = new Map(entregas.map((e) => [e.id, e]));
const ativa = (e) => e.estado !== "cancelada";
const aberta = (e) => ativa(e) && e.estado !== "feita";

// ─────────────────────────── conferir ───────────────────────────

if (!modoJson) console.log(`\nENTREGAS: ${arquivo}`);
info(`${entregas.length} entregas, dedicação de ${fmt(dedicacao)} dia(s) por semana (teto por entrega: ${fmt(dedicacao)} dias)`);

// ids únicos
const vistos = new Set();
for (const e of entregas) {
  if (vistos.has(e.id)) erro(`linha ${e.linha}: ${e.id} aparece duas vezes`);
  vistos.add(e.id);
}

// campos obrigatórios
for (const e of entregas) {
  if (!e.nome) erro(`linha ${e.linha}: ${e.id} sem nome`);
  if (!e.prova && ativa(e)) erro(`${e.id}: sem prova de pronto. Entrega que ninguém consegue ver funcionando não está pronta nunca`);
  if (e.estado === null) erro(`${e.id}: estado "${e.estadoBruto}" não é um dos aceitos: a fazer, em andamento, feita AAAA-MM-DD, esperando <o quê>, cancelada`);
  if (e.estado === "feita" && !e.feitaEm) erro(`${e.id}: "feita" sem data. Escreva "feita AAAA-MM-DD"`);
  if (e.feitaEm) {
    const d = dataValida(e.feitaEm);
    if (!d) erro(`${e.id}: a data ${e.feitaEm} não existe no calendário`);
    else if (d.getTime() > Date.now() + 86400000) aviso(`${e.id}: marcada como feita em ${e.feitaEm}, que ainda não chegou`);
  }
  if (e.estado === "esperando" && !e.esperando) erro(`${e.id}: "esperando" sem dizer o quê. Escreva "esperando chave do Mercado Pago desde 2026-09-12", por exemplo`);
  else if (e.estado === "esperando" && !e.esperandoDesde) aviso(`${e.id}: "esperando ${e.esperando}" sem data. Acrescente "desde AAAA-MM-DD": espera sem data vira semana sem ninguém cobrar`);
  if (e.esperandoDesde && !dataValida(e.esperandoDesde)) erro(`${e.id}: a data ${e.esperandoDesde} não existe no calendário`);
}

// faixa
const semFaixa = [];
for (const e of entregas) {
  if (!ativa(e)) continue;
  if (e.aConfirmar) {
    // quem estima é quem constrói; até ele responder, a faixa fica visível como pendência
    if (e.estado === "feita" || e.estado === "em andamento") erro(`${e.id}: está "${e.estado}" com faixa [a confirmar]. Entrega que começou tem estimativa de quem está construindo`);
    else { semFaixa.push(e.id); aviso(`${e.id}: faixa [a confirmar]. Fica fora da soma até quem constrói responder piso, teto e o que estoura`); }
    continue;
  }
  if (e.min === null) {
    erro(`${e.id}: faixa "${e.faixaBruto}" não é "N a M". Exemplo: "2 a 3" (ou "[a confirmar]" enquanto quem constrói não estimou)`);
    continue;
  }
  if (e.unico) erro(`${e.id}: "${e.faixaBruto}" é número único, não faixa. Estimativa vem como "de X a Y", com o que faz estourar`);
  if (e.min > e.max) erro(`${e.id}: a faixa ${e.faixaBruto} está invertida`);
  if (e.min <= 0) erro(`${e.id}: faixa começa em zero. Entrega que não custa nada não é entrega`);
  if (e.estado === "feita") continue; // o que já foi feito não se quebra mais; a lição vai pra "Mudanças"
  if (!e.estoura) erro(`${e.id}: faixa sem o que a faz estourar. Sem o motivo do teto, a faixa é número único com margem escondida`);
  if (e.max > dedicacao) erro(`${e.id}: teto de ${fmt(e.max)} dias passa de uma semana do time (${fmt(dedicacao)} dias). Quebre em duas`);
  else if (e.max > 3 * e.min && e.max - e.min >= 3) aviso(`${e.id}: faixa de ${e.faixaBruto} é larga demais (teto acima do triplo do piso). Ninguém entendeu essa entrega ainda: investigue antes de começar`);
}

// dependências: existem, sem auto-referência, sem ciclo, na ordem
for (const e of entregas) {
  for (const d of e.depende) {
    if (!porId.has(d)) erro(`${e.id} depende de ${d}, que não está na lista`);
    else if (d === e.id) erro(`${e.id} depende de si mesma`);
    else if (porId.get(d).estado === "cancelada" && ativa(e)) erro(`${e.id} depende de ${d}, que foi cancelada. Ou ${e.id} cai junto, ou a dependência muda`);
  }
}

const posicao = new Map(entregas.map((e, i) => [e.id, i]));
for (const e of entregas) {
  for (const d of e.depende) {
    if (porId.has(d) && posicao.get(d) > posicao.get(e.id)) {
      erro(`${e.id} depende de ${d}, mas ${d} vem depois dela na lista. A ordem da lista é a ordem de execução`);
    }
  }
}

// ciclo por DFS
const cor = new Map();
let ciclo = null;
function dfs(id, trilha) {
  cor.set(id, 1);
  for (const d of porId.get(id).depende) {
    if (!porId.has(d)) continue;
    if (cor.get(d) === 1) { ciclo = [...trilha, id, d]; return true; }
    if (!cor.get(d) && dfs(d, [...trilha, id])) return true;
  }
  cor.set(id, 2);
  return false;
}
for (const e of entregas) if (!cor.get(e.id) && dfs(e.id, [])) break;
if (ciclo) {
  const inicio = ciclo.indexOf(ciclo[ciclo.length - 1]);
  erro(`dependência circular: ${ciclo.slice(inicio).join(" → ")}. Nenhuma delas consegue começar`);
}

// primeira entrega prova a arquitetura: não depende de nada, nem de ninguém de fora
const primeira = entregas.find(ativa);
if (primeira && primeira.depende.length) erro(`${primeira.id} é a primeira e depende de ${primeira.depende.join(", ")}. A primeira entrega atravessa o sistema sozinha`);
if (primeira && primeira.estado === "esperando") erro(`${primeira.id} é a primeira e está esperando ${primeira.esperando || "alguém de fora"}. A bala traçante só atravessa o que o time controla: troque por outra entrega ou tire a dependência externa dela`);

// estado coerente com as dependências
for (const e of entregas) {
  if (e.estado !== "feita" && e.estado !== "em andamento") continue;
  const abertas = e.depende.filter((d) => porId.has(d) && porId.get(d).estado !== "feita");
  if (abertas.length) erro(`${e.id} está "${e.estado}" mas depende de ${abertas.join(", ")}, que não está feita. Ou a dependência não existia, ou alguém pulou etapa`);
}
const emAndamento = entregas.filter((e) => e.estado === "em andamento");
if (emAndamento.length > 2) aviso(`${emAndamento.length} entregas em andamento ao mesmo tempo (${emAndamento.map((e) => e.id).join(", ")}). Time pequeno termina uma antes de abrir outra`);

// ─────────────────────────── a conta ───────────────────────────

const ativas = entregas.filter((e) => ativa(e) && e.min !== null);
const restantes = ativas.filter(aberta);
const soma = (lista, k) => lista.reduce((a, e) => a + e[k], 0);
const total = { min: soma(ativas, "min"), max: soma(ativas, "max") };
const restante = { min: soma(restantes, "min"), max: soma(restantes, "max") };
const feitas = entregas.filter((e) => e.estado === "feita");

const parcial = semFaixa.length ? ` (parcial: ${semFaixa.join(", ")} ainda sem faixa)` : "";
if (totalDeclarado) {
  if (totalDeclarado.min === null) erro(`linha ${totalDeclarado.linha}: a linha Soma não tem faixa. Escreva "${fmt(total.min)} a ${fmt(total.max)}"${parcial}`);
  else if (totalDeclarado.min !== total.min || totalDeclarado.max !== total.max) {
    erro(`a linha Soma declara ${fmt(totalDeclarado.min)} a ${fmt(totalDeclarado.max)} dias, mas as entregas somam ${fmt(total.min)} a ${fmt(total.max)}${parcial}`);
  } else ok(`linha Soma bate com as faixas: ${fmt(total.min)} a ${fmt(total.max)} dias${parcial}`);
} else aviso(`a tabela não tem linha Soma. Acrescente "| Soma | | | | ${fmt(total.min)} a ${fmt(total.max)} | | |" no fim${parcial}`);

// caminho crítico: cadeia mais longa (pelo teto) entre as entregas abertas
const ordem = entregas.filter(aberta).map((e) => e.id);
const melhor = new Map();
const anterior = new Map();
for (const id of ordem) {
  const e = porId.get(id);
  let base = 0, de = null;
  for (const d of e.depende) {
    if (melhor.has(d) && melhor.get(d) > base) { base = melhor.get(d); de = d; }
  }
  melhor.set(id, base + (e.max || 0));
  anterior.set(id, de);
}
let fim = null;
for (const [id, v] of melhor) if (fim === null || v > melhor.get(fim)) fim = id;
const cadeia = [];
for (let id = fim; id; id = anterior.get(id)) cadeia.unshift(id);
const cadeiaMin = cadeia.reduce((a, id) => a + porId.get(id).min, 0);
const cadeiaMax = cadeia.reduce((a, id) => a + porId.get(id).max, 0);

// o que pode começar agora
const livres = entregas.filter((e) => e.estado === "a fazer" && e.depende.every((d) => porId.has(d) && porId.get(d).estado === "feita"));
const esperando = entregas.filter((e) => e.estado === "esperando");
const bloqueadas = entregas.filter((e) => e.estado === "a fazer" && !livres.includes(e));

const semanas = (dias) => Math.ceil(dias / dedicacao);
const faixaTexto = (min, max, unidade) => (min === max ? `${fmt(min)} ${unidade}` : `${fmt(min)} a ${fmt(max)} ${unidade}`);

const resultado = {
  arquivo,
  dedicacao,
  entregas: entregas.length,
  feitas: feitas.length,
  restantes: restantes.length,
  semFaixa,
  total,
  restante,
  semanas: { min: semanas(restante.min), max: semanas(restante.max) },
  caminhoCritico: { cadeia, min: cadeiaMin, max: cadeiaMax },
  podeComecar: livres.map((e) => e.id),
  bloqueadas: bloqueadas.map((e) => ({ id: e.id, esperaPor: e.depende.filter((d) => porId.has(d) && porId.get(d).estado !== "feita") })),
  esperandoFora: esperando.map((e) => ({ id: e.id, oQue: e.esperando })),
  emAndamento: emAndamento.map((e) => e.id),
  problemas,
  avisos,
  mensagens,
};

if (flag("json")) {
  console.log(JSON.stringify(resultado, null, 2));
  process.exit(problemas ? 1 : 0);
}

if (flag("proxima")) {
  console.log("");
  if (emAndamento.length) info(`em andamento: ${emAndamento.map((e) => `${e.id} ${e.nome}`).join("; ")}`);
  if (!livres.length) info("nenhuma entrega livre pra começar agora");
  for (const e of livres) {
    console.log(`  → ${e.id} — ${e.nome}`);
    console.log(`    prova de pronto: ${e.prova}`);
    console.log(`    faixa: ${e.aConfirmar ? "[a confirmar] — pedir piso, teto e o que estoura a quem constrói" : `${e.faixaBruto} dias`}`);
    if (e.estoura) console.log(`    estoura se: ${e.estoura}`);
  }
  console.log("");
  process.exit(problemas ? 1 : 0);
}

console.log("\nA CONTA");
info(`feitas: ${feitas.length} de ${ativas.length}${feitas.length ? ` (${feitas.map((e) => e.id).join(", ")})` : ""}`);
info(`plano inteiro: ${faixaTexto(total.min, total.max, "dias")} de trabalho${parcial}`);
if (restantes.length || semFaixa.length) {
  if (restantes.length) info(`falta: ${faixaTexto(restante.min, restante.max, "dias")} de trabalho, ou ${faixaTexto(resultado.semanas.min, resultado.semanas.max, "semana(s)")} a ${fmt(dedicacao)} dia(s) por semana${parcial}`);
  if (semFaixa.length) info(`sem faixa ainda: ${semFaixa.join(", ")}. A conta acima não inclui essas`);
  if (cadeia.length > 1) {
    info(`caminho mais longo: ${cadeia.join(" → ")}, ${faixaTexto(cadeiaMin, cadeiaMax, "dias")}. Mesmo com mais gente, não termina antes disso`);
  }
} else ok("nada falta: todas as entregas ativas estão feitas");

console.log("\nAGORA");
if (emAndamento.length) info(`em andamento: ${emAndamento.map((e) => e.id).join(", ")}`);
if (livres.length) ok(`pode começar: ${livres.map((e) => `${e.id} (${e.faixaBruto} dias)`).join(", ")}`);
else if (restantes.length) info("nenhuma entrega livre: o que falta depende de algo aberto");
for (const b of resultado.bloqueadas) info(`${b.id} espera por ${b.esperaPor.join(", ")}`);
for (const e of esperando) info(`${e.id} esperando fora do time: ${e.esperando || "(não diz o quê)"}`);

console.log("");
if (problemas) console.log(`✖ ${problemas} problema(s)${avisos ? `, ${avisos} aviso(s)` : ""}. Corrija antes de passar pro /backend.\n`);
else console.log(`Tudo certo.${avisos ? ` ${avisos} aviso(s) acima valem uma olhada.` : ""}\n`);
process.exit(problemas ? 1 : 0);
