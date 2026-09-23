#!/usr/bin/env node
/**
 * Contex OS — retencao.js
 * Lê a lista de clientes de mensalidade do mês (export do sistema de cobrança,
 * planilha ou CSV feito na mão) e calcula os três números que decidem a saúde
 * de um negócio de recorrência: churn, retenção e receita em risco. Separa
 * cada cliente em ativo, sumido ou cancelado, e escreve a planilha de saúde
 * com fórmula viva.
 *
 * Existe porque churn feito de cabeça sai errado de três jeitos: divide os
 * cancelados pelo total do fim do mês (o certo é pelo início), conta quem
 * entrou e saiu no mesmo mês como churn da base velha, e esquece que o aluno
 * que não aparece há três semanas ainda paga, mas já está saindo. O terceiro
 * erro é o mais caro: o cancelamento é a última etapa, e quando chega já não
 * tem conversa.
 *
 * Uso:
 *   node scripts/retencao.js <clientes.csv|.xlsx|.json> [opções]
 *
 * Colunas reconhecidas (nome aproximado, qualquer ordem): cliente, plano,
 * valor (mensal), inicio (entrada), status (ativo, pausado, cancelado, ou
 * sumido quando o dono já sabe quem sumiu),
 * ultima visita (ou último acesso, última presença, última compra),
 * cancelado em, motivo, reclamou (sim/não), pausa até, telefone.
 * Obrigatórias: cliente e valor. Sem "inicio", todo mundo conta como base
 * do início do mês. Sem "status" nem "cancelado em", ninguém conta como
 * cancelado, e o script avisa.
 *
 * Opções:
 *   --mes AAAA-MM         mês de referência (padrão: o mês de --hoje)
 *   --hoje DD/MM/AAAA     data de referência (padrão: hoje)
 *   --sumido <dias>       dias sem visita pra contar como sumido (padrão: 14)
 *   --uteis               conta o limiar em dias úteis (agência, contrato de
 *                         serviço: "10 dias úteis sem resposta"), com feriado
 *                         nacional do br.js
 *   --saida <arquivo.md>  grava o markdown em vez de imprimir
 *   --xlsx <arquivo.xlsx> grava a planilha de saúde (usa gerar-planilha.js)
 *   --json                imprime o resultado em JSON, pra outra ferramenta ler
 *
 * O que sai: os três números com a conta ao lado, a lista de cancelados com
 * tempo de casa e motivo, a lista de sumidos ordenada por valor e dias sem
 * aparecer, e a fila de quem contatar hoje. Cada número tem a conta escrita,
 * pra bater com o `verificar.js tabela` e pro dono conferir.
 *
 * Regras: churn de clientes = cancelados no mês ÷ clientes no início do mês.
 * Quem entrou e saiu dentro do mês aparece na lista, mas não entra no churn
 * da base (não estava no início). Cancelado sem data conta no mês de
 * referência e sai marcado [a confirmar]. Cancelado em mês anterior é
 * ignorado com aviso. Cancelamento agendado pra depois do mês vira sumido,
 * no topo da fila. Pausado conta como sumido (a pausa é o aviso prévio do
 * cancelamento) e não entra no churn enquanto não cancelar. "Trancado" e
 * "trancou" são pausa de academia, não cancelamento. Pagamento em atraso
 * (inadimplente, vencido, bloqueado) sai numa lista à parte e fora da
 * receita em risco: atraso é régua de cobrança, não retenção. Sem nenhuma
 * coluna de status ou de cancelamento, churn e retenção saem como
 * [sem dado] em vez de 0% e 100%.
 *
 * Node 18+, sem dependência. Usa br.js (datas, número, moeda) e o leitor de
 * planilha do gerar-planilha.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const SINONIMOS = {
  cliente: ["cliente", "nome", "aluno", "paciente", "assinante", "membro", "razao social", "empresa", "contratante"],
  plano: ["plano", "produto", "servico", "assinatura", "modalidade", "pacote"],
  valor: ["valor", "mensalidade", "valor mensal", "preco", "mrr", "recorrencia", "valor do plano"],
  inicio: ["inicio", "entrada", "desde", "cliente desde", "data de inicio", "adesao", "matricula", "cadastro", "primeira compra", "data de entrada", "entrou em", "entrou", "inicio do plano"],
  status: ["status", "situacao", "estado"],
  ultimaVisita: ["ultima visita", "ultimo acesso", "ultima presenca", "ultimo uso", "ultimo login", "ultimo checkin", "ultimo check-in", "ultima compra", "ultimo contato", "ultima aula", "ultima sessao", "ultima consulta"],
  canceladoEm: ["cancelado em", "cancelamento", "data de cancelamento", "saida", "fim", "encerrado em", "data de saida", "cancelou em"],
  motivo: ["motivo", "razao", "por que", "motivo do cancelamento"],
  reclamou: ["reclamou", "reclamacao", "chamado", "ticket", "suporte", "reclamacoes"],
  pausaAte: ["pausa ate", "pausado ate", "retorno", "volta em", "trancado ate", "retorna em"],
  telefone: ["telefone", "whatsapp", "celular", "fone", "contato"],
};

const OBRIGATORIAS = ["cliente", "valor"];

// ─────────────────────────── leitura ───────────────────────────

function acharColunas(cabecalho) {
  const norm = cabecalho.map((c) => br.semAcento(String(c || "")).replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim());
  const idx = {};
  const usada = new Set();
  // duas passadas: primeiro todo nome exato, só depois os aproximados. Sem isso, um
  // cabeçalho "Cliente desde" era tomado como a coluna do nome e a data de entrada sumia.
  for (const [campo, nomes] of Object.entries(SINONIMOS)) {
    const i = norm.findIndex((c, k) => !usada.has(k) && nomes.includes(c));
    if (i >= 0) { idx[campo] = i; usada.add(i); }
  }
  for (const [campo, nomes] of Object.entries(SINONIMOS)) {
    if (idx[campo] !== undefined) continue;
    const i = norm.findIndex((c, k) => !usada.has(k) && nomes.some((n) => c.startsWith(n)));
    if (i >= 0) { idx[campo] = i; usada.add(i); }
  }
  return idx;
}

function dataDoSerial(n) {
  const base = new Date(1899, 11, 30);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.floor(n));
}

function matrizDaAba(aba) {
  const linhas = [];
  for (const [ref, cel] of aba.celulas) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    const lin = +m[2];
    if (!linhas[lin - 1]) linhas[lin - 1] = [];
    let v = cel.v;
    if (cel.tipo === "data" && typeof v === "number") v = br.fmt(dataDoSerial(v));
    linhas[lin - 1][col - 1] = v === null || v === undefined ? "" : v;
  }
  return linhas.filter((l) => l && l.some((c) => c !== "")).map((l) => Array.from(l, (c) => (c === undefined ? "" : c)));
}

/** Lê CSV, .xlsx ou JSON e devolve a lista bruta de clientes com os campos já nomeados. */
function lerArquivo(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  if (ext === ".json") {
    const j = JSON.parse(fs.readFileSync(arquivo, "utf8").replace(/^\uFEFF/, ""));
    const lista = Array.isArray(j) ? j : j.clientes;
    if (!Array.isArray(lista) || !lista.length) throw new Error("o JSON precisa ser uma lista de clientes ou ter a chave \"clientes\"");
    // as chaves do JSON passam pelo mesmo mapa de sinônimos do CSV (cancelado_em, "Última visita"…)
    const chaves = [...new Set(lista.flatMap((c) => Object.keys(c || {})))];
    const idx = acharColunas(chaves);
    const faltam = OBRIGATORIAS.filter((c) => idx[c] === undefined);
    if (faltam.length) throw new Error(`não achei o campo ${faltam.join(", ")} no JSON: ${chaves.join(", ")}`);
    const registros = lista.map((c, i) => {
      const r = { linha: i + 1 };
      for (const [campo, k] of Object.entries(idx)) r[campo] = c[chaves[k]] === undefined || c[chaves[k]] === null ? "" : c[chaves[k]];
      return r;
    });
    return { registros, colunas: Object.keys(idx) };
  }
  const planilha = require("./gerar-planilha.js");
  let linhas;
  if (ext === ".xlsx") {
    const { abas } = planilha.lerXlsx(arquivo);
    if (!abas.length) throw new Error("planilha sem aba");
    linhas = matrizDaAba(abas[0]);
  } else {
    const txt = fs.readFileSync(arquivo, "utf8").replace(/^\uFEFF/, "");
    linhas = planilha.parseCsv(txt).linhas;
  }
  if (!linhas.length) throw new Error("o arquivo está vazio");
  if (linhas.length < 2) throw new Error("o arquivo tem cabeçalho e nenhuma linha de cliente");
  let inicio = 0;
  while (inicio < linhas.length - 1 && linhas[inicio].filter((c) => String(c).trim() !== "").length < 2) inicio++;
  const idx = acharColunas(linhas[inicio]);
  const faltam = OBRIGATORIAS.filter((c) => idx[c] === undefined);
  if (faltam.length) throw new Error(`não achei a(s) coluna(s) ${faltam.join(", ")} no cabeçalho: ${linhas[inicio].join(" | ")}`);
  const registros = [];
  for (let i = inicio + 1; i < linhas.length; i++) {
    const l = linhas[i];
    const r = { linha: i + 1 };
    for (const [campo, c] of Object.entries(idx)) r[campo] = l[c] === undefined ? "" : l[c];
    registros.push(r);
  }
  return { registros, colunas: Object.keys(idx) };
}

// ─────────────────────────── classificação ───────────────────────────

function normalizarStatus(s) {
  const t = br.semAcento(String(s || "")).trim();
  if (!t) return "";
  // "trancado"/"trancou" é pausa de academia, não cancelamento: fica antes da regra de cancelado
  if (/^(paus|tranc|congel|suspens|licen|ferias|afastad)/.test(t)) return "pausado";
  if (/^(inadimpl|vencid|atrasad|em atraso|bloquead|devedor|em cobranca|negativad|recusad|nao pagou|boleto|cartao|pagamento)/.test(t)) return "inadimplente";
  if (/^(cancel|inativ|encerr|desativ|churn|saiu|desist|evadi|rescind|baixa)/.test(t)) return "cancelado";
  if (/^(ativ|active|ok|em dia|regular|adimpl|pagante|matriculad)/.test(t)) return "ativo";
  if (/^(sumid|risco|em risco|inativo na pratica|nao vem|faltoso)/.test(t)) return "sumido";
  return t;
}

function simOuNao(s) {
  const t = br.semAcento(String(s || "")).trim();
  if (!t) return false;
  if (/^(nao|n|0|false|-)$/.test(t)) return false;
  return true;
}

function mesesDeCasa(inicio, ate) {
  if (!inicio) return null;
  let m = (ate.getFullYear() - inicio.getFullYear()) * 12 + (ate.getMonth() - inicio.getMonth());
  if (ate.getDate() < inicio.getDate()) m--;
  return Math.max(0, m);
}

/**
 * Classifica cada cliente e calcula os números do mês.
 * opts: { hoje: Date, mes: "AAAA-MM", limiarSumido: number }
 */
function calcular(registros, opts = {}) {
  const hoje = opts.hoje || new Date();
  const mes = opts.mes || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [ano, m] = mes.split("-").map(Number);
  if (!ano || !m || m < 1 || m > 12) throw new Error(`mês "${mes}" fora do formato AAAA-MM`);
  const inicioMes = new Date(ano, m - 1, 1);
  const fimCalendario = new Date(ano, m, 0);
  const fimMes = hoje < fimCalendario && hoje >= inicioMes ? hoje : fimCalendario;
  const limiar = opts.limiarSumido ?? 14;
  const uteis = !!opts.diasUteis;
  const unidade = uteis ? "dias úteis" : "dias";
  const avisos = [];
  const clientes = [];

  for (const r of registros) {
    const nome = String(r.cliente || "").trim();
    if (!nome) { avisos.push(`linha ${r.linha}: sem nome de cliente, pulei`); continue; }
    const valor = br.numero(r.valor);
    if (isNaN(valor) || valor < 0) { avisos.push(`linha ${r.linha} (${nome}): valor "${r.valor}" não é número, pulei`); continue; }
    const inicio = r.inicio ? br.lerData(r.inicio) : null;
    if (r.inicio && !inicio) avisos.push(`linha ${r.linha} (${nome}): data de início "${r.inicio}" inválida, tratei como base antiga`);
    let status = normalizarStatus(r.status);
    let canceladoEm = r.canceladoEm ? br.lerData(r.canceladoEm) : null;
    if (r.canceladoEm && !canceladoEm) avisos.push(`linha ${r.linha} (${nome}): data de cancelamento "${r.canceladoEm}" inválida`);
    if (canceladoEm && status !== "cancelado") status = "cancelado";
    const marcadoSumido = status === "sumido";
    if (marcadoSumido) status = "ativo";
    if (status && !["ativo", "pausado", "cancelado", "inadimplente"].includes(status)) { avisos.push(`linha ${r.linha} (${nome}): status "${r.status}" desconhecido, tratei como ativo`); status = "ativo"; }
    if (!status) status = "ativo";
    const ultimaVisita = r.ultimaVisita ? br.lerData(r.ultimaVisita) : null;
    if (r.ultimaVisita && !ultimaVisita) avisos.push(`linha ${r.linha} (${nome}): última visita "${r.ultimaVisita}" inválida, ignorei`);
    const pausaAte = r.pausaAte ? br.lerData(r.pausaAte) : null;
    const reclamou = simOuNao(r.reclamou);

    // fora do mês
    if (inicio && inicio > fimMes) { avisos.push(`${nome}: entra em ${br.fmt(inicio)}, depois do mês, não contei`); continue; }
    if (status === "cancelado" && canceladoEm && canceladoEm < inicioMes) { avisos.push(`${nome}: cancelou em ${br.fmt(canceladoEm)}, antes do mês, não contei`); continue; }
    let agendadoPra = null;
    if (status === "cancelado" && canceladoEm && canceladoEm > fimMes) {
      agendadoPra = canceladoEm;
      avisos.push(`${nome}: cancelamento agendado pra ${br.fmt(canceladoEm)}, depois do mês; ainda paga, entrou na lista de sumidos`);
      status = "ativo"; canceladoEm = null;
    }

    const novo = !!(inicio && inicio >= inicioMes);
    const c = {
      linha: r.linha, cliente: nome, plano: String(r.plano || "").trim(), valor: br.centavos(valor),
      inicio, novo, status, canceladoEm, agendadoPra, ultimaVisita, pausaAte, reclamou,
      motivo: String(r.motivo || "").trim(), telefone: String(r.telefone || "").trim(),
      mesesDeCasa: mesesDeCasa(inicio, status === "cancelado" && canceladoEm ? canceladoEm : fimMes),
      diasSemVisita: ultimaVisita ? (uteis ? br.diasUteisEntre(ultimaVisita, fimMes) : br.diasEntre(ultimaVisita, fimMes)) : null,
      situacao: "ativo", sinal: "", confirmar: [],
    };
    if (status === "cancelado") {
      c.situacao = "cancelado";
      if (!canceladoEm) c.confirmar.push("data do cancelamento");
      if (!c.motivo) c.confirmar.push("motivo");
    } else if (status === "inadimplente") {
      c.situacao = "inadimplente";
      c.sinal = "pagamento em atraso";
    } else {
      const sinais = [];
      if (agendadoPra) sinais.push(`já pediu pra cancelar em ${br.fmt(agendadoPra)}`);
      if (marcadoSumido) sinais.push("marcado como sumido na lista");
      if (status === "pausado") {
        if (pausaAte && pausaAte < fimMes) { sinais.push(`pausa venceu em ${br.fmt(pausaAte)} e não voltou`); c.pausaVencida = true; }
        else sinais.push(pausaAte ? `em pausa até ${br.fmt(pausaAte)}` : "em pausa");
      }
      if (reclamou) sinais.push("reclamou");
      if (c.diasSemVisita !== null && c.diasSemVisita >= limiar) sinais.push(`${c.diasSemVisita} ${unidade} sem aparecer`);
      if (sinais.length) { c.situacao = "sumido"; c.sinal = sinais.join(", "); }
    }
    clientes.push(c);
  }

  if (!clientes.length) throw new Error("nenhum cliente válido no arquivo");
  const temVisita = clientes.some((c) => c.ultimaVisita);
  if (!temVisita) avisos.push("nenhuma coluna de última visita/acesso: só reclamação, pausa e status \"sumido\" contam como sinal");
  // sem nada que diga quem saiu, churn e retenção não são zero e 100%: são desconhecidos
  const semDadoDeCancelamento = !registros.some((r) => r.status || r.canceladoEm);
  if (semDadoDeCancelamento) avisos.push("sem coluna de status nem de cancelamento: churn e retenção saíram como [sem dado], porque o arquivo não diz quem cancelou. Acrescente a coluna \"status\" ou \"cancelado em\" e rode de novo");

  const cancelados = clientes.filter((c) => c.situacao === "cancelado");
  const sumidos = clientes.filter((c) => c.situacao === "sumido").sort((a, b) => b.valor - a.valor || (b.diasSemVisita || 0) - (a.diasSemVisita || 0));
  const ativos = clientes.filter((c) => c.situacao === "ativo");
  const inadimplentes = clientes.filter((c) => c.situacao === "inadimplente").sort((a, b) => b.valor - a.valor);
  if (inadimplentes.length) avisos.push(`pagamento em atraso: ${inadimplentes.map((c) => c.cliente).join(", ")}. Atraso é régua de cobrança (\`/cobranca\`), não retenção: ficou fora da receita em risco`);
  const base = clientes.filter((c) => !c.novo);
  const novos = clientes.filter((c) => c.novo);
  const canceladosDaBase = cancelados.filter((c) => !c.novo);
  const soma = (l) => br.centavos(l.reduce((a, c) => a + c.valor, 0));

  const n = {
    clientesInicio: base.length,
    novos: novos.length,
    cancelados: cancelados.length,
    canceladosDaBase: canceladosDaBase.length,
    clientesFim: base.length + novos.length - cancelados.length,
    ativos: ativos.length,
    sumidos: sumidos.length,
    inadimplentes: inadimplentes.length,
    churn: null,
    retencao: null,
    mrrInicio: soma(base),
    mrrPerdido: soma(cancelados),
    mrrPerdidoDaBase: soma(canceladosDaBase),
    mrrNovo: soma(novos),
    mrrAtivos: soma(ativos),
    mrrInadimplente: soma(inadimplentes),
    mrrFim: br.centavos(soma(ativos) + soma(sumidos) + soma(inadimplentes)),
    churnReceita: null,
    receitaEmRisco: soma(sumidos),
    pctEmRisco: null,
    vidaMediaMeses: null,
    semDadoDeCancelamento,
  };
  if (base.length && !semDadoDeCancelamento) {
    n.churn = canceladosDaBase.length / base.length;
    n.retencao = (base.length - canceladosDaBase.length) / base.length;
  }
  if (n.mrrInicio && !semDadoDeCancelamento) n.churnReceita = n.mrrPerdidoDaBase / n.mrrInicio;
  n.pctEmRisco = n.mrrFim ? n.receitaEmRisco / n.mrrFim : null;
  n.vidaMediaMeses = n.churn ? 1 / n.churn : null;

  const motivos = {};
  for (const c of cancelados) { const k = c.motivo || "(sem motivo)"; motivos[k] = (motivos[k] || 0) + 1; }

  return { mes, inicioMes, fimMes, hoje, limiar, unidade, avisos, clientes, cancelados, sumidos, ativos, inadimplentes, novos, numeros: n, motivos };
}

// ─────────────────────────── saída ───────────────────────────

const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function nomeMes(mes) { const [a, m] = mes.split("-"); return `${MESES_LONGOS[+m - 1]}/${a}`; }
function pctOuTraco(x) { return x === null ? "[sem dado]" : br.pct(x, 1); }
/** plural(1, "cliente") → "1 cliente"; plural(3, "cliente") → "3 clientes" */
function plural(n, um, muitos) { return `${n} ${n === 1 ? um : muitos || um + "s"}`; }

function oQueFazer(c) {
  if (c.agendadoPra) return `já pediu pra cancelar: pesquisa de saída e a oferta do motivo, uma vez, antes de ${br.fmt(c.agendadoPra)}`;
  if (c.pausaVencida) return "a pausa venceu: perguntar se volta essa semana ou se prefere encerrar";
  if (c.status === "pausado") return "confirmar a data de volta e marcar o primeiro dia";
  if (c.reclamou) return "resolver a reclamação antes de qualquer oferta";
  if (c.diasSemVisita !== null && c.diasSemVisita >= 30) return "ligar, não mandar texto: perguntar o que mudou";
  return "mensagem curta com motivo concreto pra voltar essa semana";
}

function markdown(r) {
  const n = r.numeros;
  const L = [];
  L.push(`# Saúde dos clientes — ${nomeMes(r.mes)}`);
  L.push("");
  L.push(`Referência: ${br.fmt(r.inicioMes)} a ${br.fmt(r.fimMes)}. Sumido = ${r.limiar} ${r.unidade} ou mais sem aparecer, reclamação aberta, pausa ou cancelamento já pedido. Gerado por \`scripts/retencao.js\` em ${br.fmt(r.hoje)}.`);
  L.push("");
  L.push("## Os três números");
  L.push("");
  L.push("| Métrica | Valor | Conta |");
  L.push("|---|---|---|");
  const semDado = n.semDadoDeCancelamento ? "o arquivo não diz quem cancelou" : null;
  L.push(`| Churn de clientes | ${pctOuTraco(n.churn)} | ${semDado || `${n.canceladosDaBase} da base ${n.canceladosDaBase === 1 ? "cancelou" : "cancelaram"} ÷ ${plural(n.clientesInicio, "cliente")} no início`} |`);
  L.push(`| Retenção | ${pctOuTraco(n.retencao)} | ${semDado || `(${n.clientesInicio} − ${n.canceladosDaBase}) ÷ ${n.clientesInicio}`} |`);
  L.push(`| Receita em risco | ${br.reais(n.receitaEmRisco)}/mês (${pctOuTraco(n.pctEmRisco)} da receita atual) | soma da mensalidade dos ${plural(n.sumidos, "sumido")} |`);
  L.push(`| Churn de receita | ${pctOuTraco(n.churnReceita)} | ${semDado || `${br.reais(n.mrrPerdidoDaBase)} perdidos ÷ ${br.reais(n.mrrInicio)} no início`} |`);
  L.push(`| Clientes no fim do mês | ${n.clientesFim} | ${n.clientesInicio} no início + ${plural(n.novos, "novo")} − ${plural(n.cancelados, "cancelado")} |`);
  L.push(`| Receita recorrente atual | ${br.reais(n.mrrFim)}/mês | ${br.reais(n.mrrAtivos)} dos ativos + ${br.reais(n.receitaEmRisco)} dos sumidos${n.inadimplentes ? ` + ${br.reais(n.mrrInadimplente)} em atraso` : ""} |`);
  if (n.vidaMediaMeses !== null) L.push(`| Vida média (aproximação) | ${n.vidaMediaMeses.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} meses | 1 ÷ churn; só vale com três meses ou mais de histórico |`);
  L.push("");
  if (n.cancelados > n.canceladosDaBase) {
    const q = n.cancelados - n.canceladosDaBase;
    L.push(q === 1
      ? "Um cliente entrou e saiu dentro do mês: aparece na lista de cancelados, mas fora do churn da base, porque não estava lá no início."
      : `${q} clientes entraram e saíram dentro do mês: aparecem na lista de cancelados, mas fora do churn da base, porque não estavam lá no início.`);
    L.push("");
  }

  L.push(`## Cancelados no mês (${r.cancelados.length})`);
  L.push("");
  if (!r.cancelados.length) L.push("Ninguém cancelou no período.");
  else {
    L.push("| Cliente | Plano | Mensalidade | Entrou em | Saiu em | Meses de casa | Motivo |");
    L.push("|---|---|---|---|---|---|---|");
    for (const c of r.cancelados) {
      const saiu = c.canceladoEm ? br.fmt(c.canceladoEm) : `${nomeMes(r.mes)} [a confirmar]`;
      L.push(`| ${c.cliente} | ${c.plano || "—"} | ${br.reais(c.valor)} | ${c.inicio ? br.fmt(c.inicio) : "—"} | ${saiu} | ${c.mesesDeCasa === null ? "—" : c.mesesDeCasa} | ${c.motivo || "[a confirmar]"} |`);
    }
    L.push(`| **Total** | | ${br.reais(n.mrrPerdido)} | | | | |`);
    L.push("");
    const mot = Object.entries(r.motivos).sort((a, b) => b[1] - a[1]);
    L.push("Por motivo: " + mot.map(([k, v]) => `${k} (${v})`).join(", ") + ".");
  }
  L.push("");

  L.push(`## Sumidos (${r.sumidos.length}) — ainda pagam, já estão saindo`);
  L.push("");
  if (!r.sumidos.length) L.push("Nenhum sinal de risco na base. Se não há coluna de última visita, o número não diz nada: ver os avisos.");
  else {
    L.push("| Cliente | Plano | Mensalidade | Sinal | Última visita | Meses de casa | O que fazer |");
    L.push("|---|---|---|---|---|---|---|");
    for (const c of r.sumidos) {
      L.push(`| ${c.cliente} | ${c.plano || "—"} | ${br.reais(c.valor)} | ${c.sinal} | ${c.ultimaVisita ? br.fmt(c.ultimaVisita) : "—"} | ${c.mesesDeCasa === null ? "—" : c.mesesDeCasa} | ${oQueFazer(c)} |`);
    }
    L.push(`| **Total** | | ${br.reais(n.receitaEmRisco)} | | | | |`);
  }
  L.push("");

  L.push("## Quem contatar hoje, na ordem");
  L.push("");
  // ordem: quem já pediu pra cancelar, quem reclamou, e depois por valor da mensalidade
  const peso = (c) => (c.agendadoPra ? 0 : c.reclamou ? 1 : 2);
  const fila = [...r.sumidos].sort((a, b) => peso(a) - peso(b));
  if (!fila.length) L.push("Ninguém na fila. Bom sinal, ou falta de dado: ver os avisos.");
  else fila.slice(0, 15).forEach((c, i) => L.push(`${i + 1}. **${c.cliente}** (${br.reais(c.valor)}/mês, ${c.sinal}): ${oQueFazer(c)}${c.telefone ? ` · ${c.telefone}` : ""}`));
  if (fila.length > 15) {
    L.push("");
    L.push(`Os outros ${fila.length - 15} estão na planilha, na mesma ordem.`);
  }
  L.push("");

  if (r.inadimplentes.length) {
    L.push(`## Em atraso (${r.inadimplentes.length}) — é cobrança, não retenção`);
    L.push("");
    L.push(`${br.reais(n.mrrInadimplente)}/mês parados em boleto vencido ou cartão recusado. A régua de cobrança é o \`/cobranca\`; quem pagar e continuar sem aparecer volta pra cá no mês que vem.`);
    L.push("");
    for (const c of r.inadimplentes) L.push(`- ${c.cliente} — ${br.reais(c.valor)}/mês${c.telefone ? ` · ${c.telefone}` : ""}`);
    L.push("");
  }

  L.push(`## Ativos (${r.ativos.length})`);
  L.push("");
  L.push(`${plural(r.ativos.length, "cliente")} sem sinal de risco, ${br.reais(n.mrrAtivos)}/mês. ${r.novos.length === 0 ? "Ninguém entrou" : r.novos.length === 1 ? "Um entrou" : `${r.novos.length} entraram`} no mês${r.novos.length ? ` (${br.reais(n.mrrNovo)}/mês)` : ""}.`);
  L.push("");

  if (r.avisos.length) {
    L.push("## Avisos do script");
    L.push("");
    for (const a of r.avisos) L.push(`- ${a}`);
    L.push("");
  }
  return L.join("\n");
}

/** Spec do gerar-planilha.js: aba Clientes com a classificação e aba Saúde com fórmula viva. */
function specPlanilha(r, saidaXlsx) {
  const EXTRAS = 10;
  const RESULTADOS = ["voltou", "prometeu voltar", "sem resposta", "aceitou oferta", "cancelou"];
  const COLS = [
    { titulo: "Cliente", tipo: "texto", largura: 28, v: (c) => c.cliente },
    { titulo: "Plano", tipo: "texto", largura: 16, v: (c) => c.plano },
    { titulo: "Mensalidade", tipo: "moeda", largura: 14, v: (c) => c.valor },
    { titulo: "Entrou em", tipo: "data", largura: 12, v: (c) => (c.inicio ? br.iso(c.inicio) : null) },
    { titulo: "Novo no mês", tipo: "texto", largura: 12, opcoes: ["sim", "não"], v: (c) => (c.novo ? "sim" : "não") },
    { titulo: "Situação", tipo: "texto", largura: 13, opcoes: ["ativo", "sumido", "cancelado", "inadimplente"], v: (c) => c.situacao },
    { titulo: "Sinal", tipo: "texto", largura: 30, v: (c) => c.sinal },
    { titulo: "Última visita", tipo: "data", largura: 13, v: (c) => (c.ultimaVisita ? br.iso(c.ultimaVisita) : null) },
    { titulo: r.unidade === "dias" ? "Dias sem aparecer" : "Dias úteis sem aparecer", tipo: "inteiro", largura: 12, v: (c) => c.diasSemVisita },
    { titulo: "Meses de casa", tipo: "inteiro", largura: 11, v: (c) => c.mesesDeCasa },
    { titulo: "Cancelado em", tipo: "data", largura: 13, v: (c) => (c.canceladoEm ? br.iso(c.canceladoEm) : null) },
    { titulo: "Motivo", tipo: "texto", largura: 24, v: (c) => c.motivo },
    { titulo: "Telefone", tipo: "texto", largura: 16, v: (c) => c.telefone },
    { titulo: "Contatado em", tipo: "data", largura: 13, v: () => null },
    { titulo: "Resultado", tipo: "texto", largura: 16, opcoes: RESULTADOS, v: () => null },
  ];
  // faixa de dado da aba Clientes: cabeçalho na linha 1, dado a partir da 2, mais as linhas em branco formatadas.
  // A letra da coluna sai do título, pra acrescentar coluna sem quebrar fórmula nenhuma.
  const prim = 2, ult = prim + r.clientes.length + EXTRAS - 1;
  if (COLS.length > 26) throw new Error("mais de 26 colunas na aba Clientes: a conta da letra precisa virar AA, AB…");
  const letra = (i) => String.fromCharCode(65 + i);
  const col = (titulo) => {
    const i = COLS.findIndex((c) => c.titulo === titulo);
    if (i < 0) throw new Error(`coluna "${titulo}" não existe na aba Clientes`);
    return `Clientes!${letra(i)}${prim}:${letra(i)}${ult}`;
  };
  // ordem da fila na planilha = ordem do markdown: sumidos primeiro, depois o resto
  const peso = (c) => ({ sumido: 0, cancelado: 1, inadimplente: 2, ativo: 3 })[c.situacao] ?? 4;
  const ordenados = [...r.clientes].sort((a, b) => peso(a) - peso(b) || b.valor - a.valor);
  const linhas = ordenados.map((c) => COLS.map((k) => k.v(c)));

  // a aba Saúde referencia a si mesma por rótulo: B da linha do rótulo, sem número na mão
  const SAUDE = [
    ["Clientes no início do mês", () => `=CONT.SE(${col("Novo no mês")};"não")`, "inteiro"],
    ["Novos no mês", () => `=CONT.SE(${col("Novo no mês")};"sim")`, "inteiro"],
    ["Cancelados no mês", () => `=CONT.SE(${col("Situação")};"cancelado")`, "inteiro"],
    ["Cancelados que já eram da base", () => `=CONT.SES(${col("Situação")};"cancelado";${col("Novo no mês")};"não")`, "inteiro"],
    ["Sumidos", () => `=CONT.SE(${col("Situação")};"sumido")`, "inteiro"],
    ["Ativos", () => `=CONT.SE(${col("Situação")};"ativo")`, "inteiro"],
    ["Em atraso (vai pro /cobranca)", () => `=CONT.SE(${col("Situação")};"inadimplente")`, "inteiro"],
    ["Churn de clientes", (b) => `=SEERRO(${b("Cancelados que já eram da base")}/${b("Clientes no início do mês")};0)`, "percentual"],
    ["Retenção", (b) => `=SEERRO((${b("Clientes no início do mês")}-${b("Cancelados que já eram da base")})/${b("Clientes no início do mês")};0)`, "percentual"],
    ["Receita no início (R$/mês)", () => `=SOMASE(${col("Novo no mês")};"não";${col("Mensalidade")})`, "moeda"],
    ["Receita perdida com cancelados da base (R$/mês)", () => `=SOMASES(${col("Mensalidade")};${col("Situação")};"cancelado";${col("Novo no mês")};"não")`, "moeda"],
    ["Churn de receita", (b) => `=SEERRO(${b("Receita perdida com cancelados da base (R$/mês)")}/${b("Receita no início (R$/mês)")};0)`, "percentual"],
    ["Receita em risco (R$/mês)", () => `=SOMASE(${col("Situação")};"sumido";${col("Mensalidade")})`, "moeda"],
    ["Receita recorrente atual (R$/mês)", (b) => `=SOMASE(${col("Situação")};"ativo";${col("Mensalidade")})+${b("Receita em risco (R$/mês)")}+SOMASE(${col("Situação")};"inadimplente";${col("Mensalidade")})`, "moeda"],
    ["Receita em risco sobre a atual", (b) => `=SEERRO(${b("Receita em risco (R$/mês)")}/${b("Receita recorrente atual (R$/mês)")};0)`, "percentual"],
    ["Sumidos contatados", () => `=CONT.SES(${col("Situação")};"sumido";${col("Contatado em")};"<>")`, "inteiro"],
    ["Sumidos que voltaram", () => `=CONT.SE(${col("Resultado")};"voltou")`, "inteiro"],
    ["Ofertas aceitas", () => `=CONT.SE(${col("Resultado")};"aceitou oferta")`, "inteiro"],
  ];
  const b = (rotulo) => {
    const i = SAUDE.findIndex((l) => l[0] === rotulo);
    if (i < 0) throw new Error(`métrica "${rotulo}" não existe na aba Saúde`);
    return `B${i + 2}`;
  };

  return {
    titulo: `Saúde dos clientes — ${nomeMes(r.mes)}`,
    autor: "Contex OS",
    saida: saidaXlsx,
    abas: [
      {
        nome: "Clientes",
        colunas: COLS.map(({ v, ...c }) => c),
        linhas,
        linhasExtras: EXTRAS,
        filtro: true,
      },
      {
        nome: "Saúde",
        colunas: [{ titulo: "Métrica", tipo: "texto", largura: 46 }, { titulo: "Valor", largura: 16 }],
        linhas: SAUDE.map(([rotulo, f, tipo]) => [rotulo, { f: f(b), tipo }]),
        congelar: true,
        filtro: false,
      },
      {
        nome: "Como usar",
        texto: [
          "# Como usar esta planilha",
          "A aba Clientes é a lista do mês. Mude a coluna Situação (ativo, sumido, cancelado, inadimplente) ou Novo no mês e a aba Saúde recalcula sozinha.",
          `Sumido aqui é quem está há ${r.limiar} ${r.unidade} ou mais sem aparecer, reclamou, está em pausa ou já pediu pra cancelar. Mude o critério na conversa com o assistente, não na fórmula.`,
          "Churn de clientes = cancelados que já eram da base ÷ clientes no início do mês. Quem entrou e saiu no mesmo mês não entra na conta.",
          "Depois de falar com cada sumido, preencha Contatado em e Resultado. É o que faz as três últimas linhas da aba Saúde saírem do zero e mostra se o processo roda ou se só o relatório sai.",
          "Cliente com pagamento em atraso está em cobrança, não em retenção: entra como inadimplente e fica fora da receita em risco.",
          "As dez linhas em branco no fim já estão formatadas. Insira novas linhas ACIMA da última pra fórmula continuar contando.",
          "Gerada pelo Contex OS a partir de scripts/retencao.js. No mês que vem, rode de novo com o export novo em vez de editar esta.",
        ],
      },
    ],
  };
}

// ─────────────────────────── linha de comando ───────────────────────────

function args(argv) {
  const o = { livres: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--uteis") o.uteis = true;
    else if (a.startsWith("--")) { o[a.slice(2)] = argv[i + 1]; i++; }
    else o.livres.push(a);
  }
  return o;
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function main() {
  const o = args(process.argv.slice(2));
  const arquivo = o.livres[0];
  if (!arquivo) morrer("Falta o arquivo de clientes.", "Uso: node scripts/retencao.js <clientes.csv|.xlsx|.json> [--mes AAAA-MM] [--sumido 14] [--uteis] [--saida saude.md] [--xlsx saude.xlsx]");
  if (!fs.existsSync(arquivo)) morrer(`Não achei o arquivo: ${arquivo}`);
  const hoje = o.hoje ? br.lerData(o.hoje) : new Date();
  if (!hoje) morrer(`--hoje "${o.hoje}" não é uma data válida (DD/MM/AAAA)`);
  const limiar = o.sumido === undefined ? 14 : parseInt(o.sumido, 10);
  if (isNaN(limiar) || limiar < 1) morrer(`--sumido "${o.sumido}" precisa ser um número de dias`);
  for (const [op, ext] of [["saida", ".md"], ["xlsx", ".xlsx"], ["mes", ""], ["hoje", ""], ["sumido", ""]]) {
    if (!Object.prototype.hasOwnProperty.call(o, op)) continue;
    if (typeof o[op] !== "string" || o[op].startsWith("--")) morrer(`--${op} precisa vir com o valor ao lado${ext ? ` (--${op} vendas/retencao/saude-2026-09${ext})` : ""}`);
  }

  let lido, r;
  try { lido = lerArquivo(arquivo); } catch (e) { morrer(`Não consegui ler ${arquivo}: ${e.message}`, "Colunas que o script entende: cliente, plano, valor, inicio, status, ultima visita, cancelado em, motivo, reclamou, pausa ate, telefone."); }
  try { r = calcular(lido.registros, { hoje, mes: o.mes, limiarSumido: limiar, diasUteis: !!o.uteis }); } catch (e) { morrer(e.message); }

  if (o.json) {
    const s = { ...r, clientes: r.clientes, cancelados: undefined, sumidos: undefined, ativos: undefined, novos: undefined };
    console.log(JSON.stringify(s, function (k, v) { const bruto = this[k]; return bruto instanceof Date ? br.iso(bruto) : v; }, 2));
    return;
  }

  const md = markdown(r);
  if (o.saida) {
    fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
    fs.writeFileSync(o.saida, md + "\n");
    console.log(`✔ ${o.saida} gravado`);
  } else console.log(md);

  if (o.xlsx) {
    const planilha = require("./gerar-planilha.js");
    const spec = specPlanilha(r, o.xlsx);
    const specPath = o.xlsx.replace(/\.xlsx$/i, "") + ".planilha.json";
    fs.mkdirSync(path.dirname(path.resolve(o.xlsx)), { recursive: true });
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
    planilha.gerar(specPath, o.xlsx, { sobrescrever: true, silencioso: true });
    console.log(`✔ ${o.xlsx} gravado (spec em ${specPath})`);
  }

  const n = r.numeros;
  console.error(`\n${nomeMes(r.mes)}: ${n.clientesInicio} no início, ${plural(n.novos, "novo")}, ${plural(n.cancelados, "cancelado")}, ${plural(n.sumidos, "sumido")}${n.inadimplentes ? `, ${plural(n.inadimplentes, "em atraso", "em atraso")}` : ""} · churn ${pctOuTraco(n.churn)} · retenção ${pctOuTraco(n.retencao)} · em risco ${br.reais(n.receitaEmRisco)}/mês`);
  if (r.avisos.length) console.error(`${plural(r.avisos.length, "aviso")}, no fim do relatório. Ler antes de mandar mensagem pra alguém.`);
}

module.exports = { lerArquivo, acharColunas, normalizarStatus, calcular, markdown, specPlanilha, mesesDeCasa };

if (require.main === module) main();
