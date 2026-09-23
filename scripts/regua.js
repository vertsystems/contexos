#!/usr/bin/env node
/**
 * Contex OS — regua.js
 * Calcula o valor corrigido de parcela atrasada e monta a régua de cobrança
 * em dia útil, a partir de uma planilha, de um CSV, de um JSON ou de uma
 * parcela só passada na linha de comando.
 *
 * Existe porque chat solto erra o juro de três jeitos: aplica 1% cheio no
 * segundo dia de atraso (juro de mora é pro rata, por dia), cobra 5% de multa
 * de consumidor (o CDC limita a 2%) e conta o atraso a partir de um sábado
 * (boleto que vence em dia sem banco se paga no dia útil seguinte sem encargo).
 * E porque a régua escrita de cabeça manda mensagem de domingo, insiste no
 * sexto lembrete e mantém na lista dívida que já prescreveu.
 *
 * Uso:
 *   node scripts/regua.js <parcelas.csv|.xlsx|.json> [opções]
 *   node scripts/regua.js --valor 1200 --vencimento 10/09/2026 --cliente "Ana" [opções]
 *
 * Colunas reconhecidas (nome aproximado, qualquer ordem): cliente, referente
 * (ou descrição/serviço), valor, vencimento, telefone, email, pago, tipo
 * (consumidor ou b2b por linha) e "último contato" (a data do último toque que
 * já foi enviado, pra skill não repetir o que você já mandou). Linha com
 * pago = sim/x/ok é ignorada.
 *
 * Opções:
 *   --hoje DD/MM/AAAA     data de referência (padrão: hoje)
 *   --tipo <t>            consumidor (padrão) ou b2b. Consumidor: multa acima de 2% é recusada
 *   --multa <pct>         multa por atraso, % sobre a parcela (padrão: 2)
 *   --juros <pct>         juros de mora, % ao mês, pro rata por dia (padrão: 1)
 *   --sem-clausula        contrato ou recibo não fala em multa nem juros: multa 0 e juros
 *                         pela taxa legal, que sai como [a confirmar] com o link do Banco Central
 *   --correcao <pct>      correção monetária acumulada no período, % (padrão: 0)
 *   --parcelas <n>        em quantas vezes propor o parcelamento do D+15 (padrão: 3)
 *   --feriado DD/MM       feriado local que fecha banco (repetir pra cada um)
 *   --saida <arquivo.md>  grava o markdown em vez de imprimir
 *   --json                imprime o resultado em JSON, pra outra ferramenta ler
 *
 * O que sai: quem cobrar hoje e com qual toque, a tabela das parcelas em aberto
 * com multa, juros e valor corrigido, a régua de cinco toques por parcela (D-3,
 * D+1, D+7, D+15, D+30) já em dia útil e com o dia da semana escrito, o que
 * fazer com quem passou do D+30, e o que já prescreveu. Cada número tem a conta
 * ao lado, pra bater com o `verificar.js tabela` e pro cliente conferir.
 *
 * Regras de data: o vencimento que cai em dia sem banco vale no dia útil
 * seguinte, e o atraso começa a contar no dia seguinte a esse. O toque antes
 * do vencimento (D-3) antecipa pro dia útil anterior; os toques depois
 * empurram pro dia útil seguinte. Nada é agendado pra sábado, domingo ou feriado.
 *
 * Node 18+, sem dependência. Usa br.js (feriados, dia útil, número) e o leitor
 * de planilha do gerar-planilha.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

/** Data em que as fontes de lei abaixo foram conferidas no Planalto. */
const CONFERIDO = "23/09/2026";

const FONTES = {
  multa: "CDC art. 52 §1º (redação da Lei 9.298/1996): multa de mora de consumidor limitada a 2% da prestação — https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm",
  multaSemClausula: "sem cláusula não há multa: multa de atraso é cláusula penal, e só se cobra se estiver escrita no contrato ou no recibo (CC arts. 408 e 409) — https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm",
  multaB2b: "entre empresas vale a multa assinada; pena desproporcional o juiz pode reduzir (CC arts. 412 e 413) — https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm",
  juros: "juros de mora convencionados; sem taxa no contrato vale a taxa legal do CC art. 406 (redação da Lei 14.905/2024), divulgada pelo Banco Central — https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm",
  taxaLegal: "Calculadora do Cidadão do Banco Central, módulo Taxa Legal (Resolução CMN 5.171/2024) — https://www3.bcb.gov.br/CALCIDADAO",
  correcao: "sem índice no contrato, a correção é pelo IPCA (CC art. 389, parágrafo único, redação da Lei 14.905/2024)",
  usura: "Decreto 22.626/1933 art. 1º (Lei da Usura): juros convencionais limitados ao dobro da taxa legal; desde 30/08/2024 não se aplica a obrigação contratada entre pessoas jurídicas (Lei 14.905/2024 art. 3º, I)",
  prescricao: "CC art. 206 §5º, I: prescreve em 5 anos a cobrança de dívida líquida escrita em contrato ou recibo (o inciso II cobre honorário de profissional liberal). Sem documento, o prazo pode ser o geral do art. 205, de 10 anos — confirmar com advogado — https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm",
  indebito: "CDC art. 42, parágrafo único: quem paga quantia indevida tem direito a receber o dobro do que pagou a mais, com correção e juros. Cobrar acima do teto também é prática infrativa punível pelo Procon (Decreto 2.181/1997 art. 13, XIX)",
  saidas: "acordo por escrito; protesto (Lei 9.492/1997); negativação com aviso prévio ao devedor (CDC art. 43 §2º); Juizado Especial Cível até 40 salários mínimos, até 20 sem advogado (Lei 9.099/1995 arts. 3º e 9º)",
};

/** Anos de prescrição da dívida líquida em contrato ou recibo (CC art. 206 §5º, I). */
const PRESCRICAO_ANOS = 5;

const TOQUES = [
  { chave: "D-3", dias: -3, nome: "lembrete", sentido: "antes", canal: "WhatsApp",
    oQue: "lembrar do vencimento, com valor, data e forma de pagar",
    precisa: "valor, data do vencimento e o jeito de pagar (Pix, boleto ou link). Nada de encargo: ainda não venceu" },
  { chave: "D+1", dias: 1, nome: "aviso", sentido: "depois", canal: "WhatsApp",
    oQue: "avisar que não constou o pagamento e perguntar se houve algum problema",
    precisa: "quem está falando, o que venceu, o valor original e uma pergunta só (\"não constou aqui; aconteceu alguma coisa?\")" },
  { chave: "D+7", dias: 7, nome: "cobrança", sentido: "depois", canal: "WhatsApp e e-mail",
    oQue: "cobrar com o valor corrigido e pedir uma data",
    precisa: "valor original, valor corrigido com a conta aberta, e o pedido de uma data" },
  { chave: "D+15", dias: 15, nome: "parcelamento", sentido: "depois", canal: "WhatsApp e e-mail",
    oQue: "oferecer parcelamento ou desconto de encargo por pagamento à vista",
    precisa: "duas saídas (à vista sem encargo até uma data, ou entrada mais parcelas) e prazo pra responder" },
  { chave: "D+30", dias: 30, nome: "formal", sentido: "depois", canal: "e-mail ou carta",
    oQue: "notificação formal por escrito, com prazo e o que acontece depois",
    precisa: "nome, endereço e CPF ou CNPJ de quem cobra (CDC art. 42-A), o débito discriminado, prazo final com a data escrita e a consequência que você vai de fato executar" },
];

/** 4.2 → "4,2": porcentagem em português, que é como o usuário digitou. */
function num(n) { return String(n).replace(".", ","); }

/** "1 dia" / "12 dias" — o script escrevia "1 dias". */
function qtd(n, um, muitos) { return `${n} ${n === 1 ? um : muitos}`; }

// ─────────────────────────── leitura ───────────────────────────

const SINONIMOS = {
  cliente: ["cliente", "nome", "devedor", "aluno", "paciente", "razao social", "empresa"],
  referente: ["referente", "descricao", "servico", "produto", "parcela", "mensalidade", "item", "historico", "observacao"],
  valor: ["valor", "principal", "total", "valor original", "vlr"],
  vencimento: ["vencimento", "venc", "data", "data de vencimento", "vence em"],
  telefone: ["telefone", "whatsapp", "celular", "fone", "contato"],
  email: ["email", "e-mail", "mail"],
  pago: ["pago", "status", "situacao", "quitado", "pagamento"],
  tipo: ["tipo", "perfil", "relacao"],
  ultimoContato: ["ultimo contato", "ultimo toque", "ultima cobranca", "cobrado em", "cobrado", "ultimo envio"],
};

function acharColunas(cabecalho) {
  const norm = cabecalho.map((c) => br.semAcento(String(c || "")).trim());
  const idx = {};
  // "último contato" primeiro: senão "contato" vira telefone e "cobrado em" sobra
  const ordem = ["ultimoContato", ...Object.keys(SINONIMOS).filter((c) => c !== "ultimoContato")];
  const usadas = new Set();
  for (const campo of ordem) {
    const nomes = SINONIMOS[campo];
    let i = norm.findIndex((c, k) => !usadas.has(k) && nomes.includes(c));
    if (i < 0) i = norm.findIndex((c, k) => !usadas.has(k) && nomes.some((n) => c.startsWith(n)));
    if (i >= 0) { idx[campo] = i; usadas.add(i); }
  }
  return idx;
}

/** Serial do Excel (dias desde 30/12/1899) → Date local. */
function dataDoSerial(n) {
  const base = new Date(1899, 11, 30);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.floor(n));
}

/** Aba do lerXlsx → matriz de linhas. O gerar-planilha guarda a célula por referência ("B3"). */
function matrizDaAba(aba) {
  const linhas = [];
  const celulas = aba.celulas instanceof Map ? aba.celulas : new Map(Object.entries(aba.celulas || {}));
  for (const [ref, cel] of celulas) {
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

function lerArquivo(arquivo) {
  if (!fs.existsSync(arquivo)) throw new Error(`não achei o arquivo "${arquivo}". Confira o caminho (a lista costuma ficar em dados/)`);
  const ext = path.extname(arquivo).toLowerCase();
  if (![".csv", ".xlsx", ".json", ".txt", ".tsv"].includes(ext)) {
    throw new Error(`não sei ler "${ext || "arquivo sem extensão"}". Aceito .csv, .xlsx e .json (PDF ou print: o assistente lê pela ferramenta Read e transcreve num JSON)`);
  }
  if (ext === ".json") {
    let j;
    try { j = JSON.parse(fs.readFileSync(arquivo, "utf8")); }
    catch (e) { throw new Error(`o JSON de ${path.basename(arquivo)} está quebrado: ${e.message}`); }
    const lista = Array.isArray(j) ? j : j.parcelas;
    if (!Array.isArray(lista)) throw new Error("o JSON precisa ser uma lista de parcelas ou ter a chave \"parcelas\"");
    return lista.map((p, i) => ({ linha: i + 1, ...p }));
  }
  const planilha = require("./gerar-planilha.js");
  let linhas;
  if (ext === ".xlsx") {
    const { abas } = planilha.lerXlsx(arquivo);
    if (!abas.length) throw new Error("planilha sem aba");
    linhas = matrizDaAba(abas[0]);
  } else {
    const txt = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
    linhas = planilha.parseCsv(txt).linhas;
  }
  if (linhas.length < 2) throw new Error("o arquivo tem cabeçalho e nenhuma linha de parcela");
  // pula linha de título (uma célula só) antes do cabeçalho
  let inicio = 0;
  while (inicio < linhas.length - 1 && linhas[inicio].filter((c) => String(c).trim() !== "").length < 2) inicio++;
  const idx = acharColunas(linhas[inicio]);
  const faltam = ["cliente", "valor", "vencimento"].filter((c) => idx[c] === undefined);
  if (faltam.length) throw new Error(`não achei a coluna ${faltam.map((f) => `"${f}"`).join(", ")} no cabeçalho: ${linhas[inicio].join(" | ")}`);
  const pega = (l, campo) => (idx[campo] === undefined ? "" : String(l[idx[campo]] ?? "").trim());
  return linhas.slice(inicio + 1).map((l, i) => ({
    linha: inicio + i + 2,
    cliente: pega(l, "cliente"),
    referente: pega(l, "referente"),
    valor: pega(l, "valor"),
    vencimento: pega(l, "vencimento"),
    telefone: pega(l, "telefone"),
    email: pega(l, "email"),
    pago: pega(l, "pago"),
    tipo: pega(l, "tipo"),
    ultimoContato: pega(l, "ultimoContato"),
  }));
}

function estaPaga(s) {
  const t = br.semAcento(String(s ?? "")).trim();
  return ["sim", "s", "x", "ok", "pago", "paga", "quitado", "quitada", "true", "1"].includes(t);
}

// ─────────────────────────── cálculo ───────────────────────────

/**
 * Encargos de uma parcela. `dias` são dias corridos de atraso contados a
 * partir do dia seguinte ao vencimento efetivo (o vencimento empurrado pra
 * dia útil). Juros ao mês viram juros ao dia dividindo por 30 (mês comercial).
 */
function calcularEncargos(valor, dias, { multa = 2, juros = 1, correcao = 0, semClausula = false } = {}) {
  if (!(valor > 0)) throw new Error(`valor inválido: ${valor}`);
  const d = Math.max(0, dias);
  const pMulta = semClausula ? 0 : multa;
  const pJuros = semClausula ? 0 : juros;
  const vMulta = d > 0 ? br.centavos(valor * pMulta / 100) : 0;
  const vJuros = d > 0 ? br.centavos(valor * (pJuros / 100) / 30 * d) : 0;
  const vCorrecao = d > 0 ? br.centavos(valor * correcao / 100) : 0;
  return {
    dias: d,
    multaPct: pMulta,
    jurosMesPct: pJuros,
    jurosDiaPct: pJuros / 30,
    correcaoPct: correcao,
    multa: vMulta,
    juros: vJuros,
    correcao: vCorrecao,
    total: br.centavos(valor + vMulta + vJuros + vCorrecao),
    jurosAConfirmar: semClausula && d > 0,
  };
}

/**
 * Régua dos cinco toques a partir do vencimento EFETIVO (o empurrado pra dia
 * útil), cada um em dia útil. Contar do efetivo evita mandar "não constou o
 * pagamento" na segunda-feira em que o boleto de sábado ainda podia ser pago.
 */
function regua(vencimentoEfetivo, hoje, extras = []) {
  return TOQUES.map((t) => {
    const bruta = br.mais(vencimentoEfetivo, t.dias);
    const { data, motivo } = t.sentido === "antes" ? br.anteriorUtil(bruta, extras) : br.proximoUtil(bruta, extras);
    const delta = br.diasEntre(hoje, data);
    const semBanco = motivo === "sábado" || motivo === "domingo";
    return {
      ...t,
      data,
      dataTxt: br.fmt(data),
      diaSemana: br.diaSemana(data),
      movida: motivo ? `${t.chave} seria ${br.fmt(bruta)} (${br.diaSemana(bruta)}), ${semBanco ? "sem banco" : motivo}; ${t.sentido === "antes" ? "antecipou pra" : "foi pra"} ${br.fmt(data)} (${br.diaSemana(data)})` : null,
      status: delta < 0 ? "passou" : delta === 0 ? "hoje" : "futuro",
    };
  });
}

/** Divide o total em n parcelas em centavos: a primeira leva a sobra. */
function parcelar(total, n) {
  const cent = Math.round(total * 100);
  const base = Math.floor(cent / n);
  const sobra = cent - base * n;
  const primeira = (base + sobra) / 100;
  const demais = base / 100;
  return { n, primeira, demais, iguais: sobra === 0, total: br.centavos(total) };
}

/** Frase da proposta de parcelamento, no formato que o verificar.js tabela confere. */
function frasePar(pc) {
  return pc.iguais
    ? `${pc.n}× ${br.reais(pc.demais)} = ${br.reais(pc.total)}`
    : `entrada de ${br.reais(pc.primeira)} mais ${qtd(pc.n - 1, "parcela", "parcelas")} de ${br.reais(pc.demais)}, fechando ${br.reais(pc.total)}`;
}

function processar(parcelas, opts) {
  const hoje = opts.hoje;
  const extras = opts.feriados || [];
  const avisos = [];
  const saida = [];
  for (const p of parcelas) {
    if (estaPaga(p.pago)) continue;
    const valor = br.numero(p.valor);
    const venc = br.lerData(p.vencimento, hoje.getFullYear());
    if (!(valor > 0)) { avisos.push(`linha ${p.linha}: valor "${p.valor}" não é número; pulei`); continue; }
    if (!venc) { avisos.push(`linha ${p.linha}: vencimento "${p.vencimento}" não é data (use DD/MM/AAAA); pulei`); continue; }
    let ultimoContato = null;
    if (String(p.ultimoContato || "").trim()) {
      ultimoContato = br.lerData(p.ultimoContato, hoje.getFullYear());
      if (!ultimoContato) avisos.push(`linha ${p.linha}: último contato "${p.ultimoContato}" não é data (use DD/MM/AAAA); tratei como se nada tivesse sido enviado`);
    }
    const tipo = br.semAcento(p.tipo || "") === "b2b" ? "b2b" : br.semAcento(p.tipo || "") === "consumidor" ? "consumidor" : opts.tipo;
    const regras = { multa: opts.multa, juros: opts.juros, correcao: opts.correcao, semClausula: opts.semClausula };
    if (tipo === "consumidor" && regras.multa > 2) {
      avisos.push(`linha ${p.linha}: ${p.cliente} é consumidor e a multa pedida é ${regras.multa}%; apliquei o teto de 2% (${FONTES.multa})`);
      regras.multa = 2;
    }
    const vencEfetivo = br.proximoUtil(venc, extras);
    const dias = Math.max(0, br.diasEntre(vencEfetivo.data, hoje));
    const enc = calcularEncargos(valor, dias, regras);
    const toques = regua(vencEfetivo.data, hoje, extras);
    const passados = toques.filter((t) => t.status !== "futuro");
    const estagio = passados.length ? passados[passados.length - 1] : null;
    const proximo = toques.find((t) => t.status === "futuro") || null;
    const deHoje = toques.find((t) => t.status === "hoje") || null;
    const formal = toques[toques.length - 1];
    const esgotada = formal.status === "passou";
    const prescreveEm = new Date(vencEfetivo.data.getFullYear() + PRESCRICAO_ANOS, vencEfetivo.data.getMonth(), vencEfetivo.data.getDate());
    const prescrita = br.diasEntre(prescreveEm, hoje) >= 0;
    // toque que já venceu e não consta envio: é o que se manda hoje, com o texto
    // dele. Inclui o D+30 de quem já passou da régua: quem nunca recebeu a
    // notificação formal recebe agora, e só depois dela a cobrança vira decisão.
    const vencidoSemEnvio = !deHoje && estagio && estagio.status === "passou"
      && (!ultimoContato || br.diasEntre(ultimoContato, estagio.data) > 0) ? estagio : null;
    const aplicar = prescrita ? null : (deHoje || vencidoSemEnvio);
    const formalEnviado = esgotada && !!ultimoContato && br.diasEntre(ultimoContato, formal.data) <= 0;
    saida.push({
      linha: p.linha,
      cliente: p.cliente || "[sem nome]",
      referente: p.referente || "",
      telefone: p.telefone ? br.telefoneE164(p.telefone) || p.telefone : "",
      email: p.email || "",
      tipo,
      valor: br.centavos(valor),
      vencimento: br.fmt(venc),
      vencimentoDia: br.diaSemana(venc),
      vencimentoEfetivo: br.fmt(vencEfetivo.data),
      vencimentoEfetivoDia: br.diaSemana(vencEfetivo.data),
      vencimentoMovido: vencEfetivo.motivo,
      atrasada: dias > 0,
      atrasoDesde: dias > 0 ? br.fmt(br.mais(vencEfetivo.data, 1)) : "",
      ultimoContato: ultimoContato ? br.fmt(ultimoContato) : "",
      ...enc,
      parcelamento: dias > 0 ? parcelar(enc.total, opts.parcelas) : null,
      estagio: estagio ? estagio.chave : "antes do D-3",
      reguaEsgotada: esgotada,
      formalEnviado,
      prescrita,
      prescreveEm: br.fmt(prescreveEm),
      diasParaPrescrever: Math.max(0, br.diasEntre(hoje, prescreveEm)),
      cobrarHoje: !!aplicar,
      toqueDeHoje: aplicar ? aplicar.chave : null,
      toqueAplicar: aplicar || null,
      motivoHoje: prescrita ? `prescrita desde ${br.fmt(prescreveEm)}: não entra em cobrança`
        : deHoje ? `o ${deHoje.chave} cai hoje`
        : vencidoSemEnvio ? `o ${vencidoSemEnvio.chave} venceu em ${vencidoSemEnvio.dataTxt} (${vencidoSemEnvio.diaSemana}) e não consta envio${vencidoSemEnvio === formal ? ", e a notificação formal é o último passo da régua" : ""}`
        : formalEnviado ? `a notificação formal já foi em ${br.fmt(ultimoContato)}: agora é decisão, não mensagem`
        : ultimoContato ? `último contato em ${br.fmt(ultimoContato)}; o próximo toque ainda não venceu`
        : "nenhum toque vence hoje",
      proximoToque: proximo ? `${proximo.chave} em ${proximo.dataTxt} (${proximo.diaSemana})` : "régua esgotada: acordo, protesto, negativação ou juizado",
      toques,
    });
  }
  saida.sort((a, b) => (b.cobrarHoje - a.cobrarHoje) || (b.dias - a.dias) || (b.total - a.total));
  const soma = (lista, k) => br.centavos(lista.reduce((s, p) => s + p[k], 0));
  const atrasadas = saida.filter((p) => p.atrasada);
  const prescritas = saida.filter((p) => p.prescrita);
  const esgotadas = saida.filter((p) => p.reguaEsgotada);
  const recuperavel = soma(saida, "total");
  const prescrito = soma(prescritas, "total");
  // anos que a lista toca: o de hoje e os dos toques que ainda vão acontecer
  const anos = new Set([hoje.getFullYear()]);
  for (const p of saida) for (const t of p.toques) if (t.status !== "passou") anos.add(t.data.getFullYear());
  const anoA = Math.min(...anos), anoB = Math.max(...anos);
  return {
    hoje: br.fmt(hoje),
    hojeDia: br.diaSemana(hoje),
    mesAno: `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`,
    regras: {
      tipo: opts.tipo, multaPct: opts.semClausula ? 0 : opts.multa, jurosMesPct: opts.semClausula ? 0 : opts.juros,
      correcaoPct: opts.correcao, semClausula: opts.semClausula, parcelas: opts.parcelas, feriadosLocais: extras,
      consumidores: saida.filter((p) => p.tipo === "consumidor").length,
      empresas: saida.filter((p) => p.tipo === "b2b").length,
    },
    totais: {
      parcelas: saida.length, atrasadas: atrasadas.length, cobrarHoje: saida.filter((p) => p.cobrarHoje).length,
      esgotadas: esgotadas.length, prescritas: prescritas.length,
      principal: soma(saida, "valor"), multa: soma(saida, "multa"), juros: soma(saida, "juros"), correcao: soma(saida, "correcao"),
      encargos: br.centavos(recuperavel - soma(saida, "valor")),
      recuperavel, prescrito, cobravel: br.centavos(recuperavel - prescrito),
      principalAtrasado: soma(atrasadas, "valor"),
    },
    parcelas: saida,
    anos: anoA === anoB ? [anoA] : [anoA, anoB],
    feriados: anoA === anoB ? br.feriados(anoA, extras) : br.feriadosEntre(anoA, anoB, extras),
    avisos,
    fontes: FONTES,
  };
}

// ─────────────────────────── markdown ───────────────────────────

/** Como a relação entra no cabeçalho: uma só, ou misturada por linha. */
function relacao(reg) {
  if (reg.consumidores && reg.empresas) {
    return `Relação por linha: ${qtd(reg.consumidores, "parcela de consumidor", "parcelas de consumidor")} (teto de 2% de multa) e ${qtd(reg.empresas, "de empresa com empresa", "de empresa com empresa")} (vale a cláusula assinada). A coluna "tipo" da lista manda; o padrão da rodada é ${reg.tipo === "b2b" ? "empresa com empresa" : "consumidor"}.`;
  }
  return `Relação: ${reg.empresas ? "empresa com empresa" : "consumidor"}.`;
}

// Formatação com duas travas do verificar.js em mente: o dia da semana nunca
// encosta na data de outra coluna (viraria par falso no "datas") e nada aqui
// sai em negrito com número dentro, porque o "tabela" lê negrito curto como
// total declarado e acusaria soma errada num nome tipo "Cliente 40".
function markdown(r) {
  const L = [];
  const R = br.reais;
  const reg = r.regras;
  const t = r.totais;
  const semJuros = reg.semClausula;
  L.push(`# Cobrança — ${r.mesAno}`);
  L.push("");
  L.push(`> Referência: ${r.hoje} (${r.hojeDia}). Regra aplicada: ${semJuros
    ? "contrato sem cláusula de atraso, então multa 0 e juros pela taxa legal, que sai como [a confirmar]"
    : `multa ${num(reg.multaPct)}% mais juros de ${num(reg.jurosMesPct)}% ao mês pro rata por dia (${br.pct(reg.jurosMesPct / 30 / 100, 4)} ao dia)`}${reg.correcaoPct ? `, com correção de ${num(reg.correcaoPct)}%` : ", sem correção monetária"}. ${relacao(reg)}`);
  const fonteMulta = semJuros ? FONTES.multaSemClausula
    : reg.empresas && !reg.consumidores ? FONTES.multaB2b
    : reg.empresas ? `${FONTES.multa}; ${FONTES.multaB2b}` : FONTES.multa;
  L.push(`> Fonte da regra: ${fonteMulta}. Conferido em ${CONFERIDO}.`);
  if (semJuros) L.push(`> Juros sem cláusula: ${FONTES.juros}. Simular em ${FONTES.taxaLegal}.`);
  L.push("> Isto não é aconselhamento jurídico. Protesto, negativação, juizado e cliente que contesta o serviço passam por advogado antes de virar ação.");
  L.push("");

  L.push("## Quem cobrar hoje");
  L.push("");
  const hoje = r.parcelas.filter((p) => p.cobrarHoje);
  if (!hoje.length) {
    const proximas = r.parcelas.filter((p) => !p.reguaEsgotada).slice(0, 3).map((p) => `${p.cliente} (${p.proximoToque})`);
    L.push(`Nenhum toque vence hoje. ${proximas.length ? `Próximos: ${proximas.join("; ")}.` : "Nenhuma parcela dentro da régua."}`);
  } else {
    L.push(`${qtd(hoje.length, "parcela", "parcelas")} pra tocar hoje. O toque de cada uma vai do lado, com o que a mensagem precisa ter.`);
    L.push("");
    for (const p of hoje) {
      const tq = p.toqueAplicar;
      L.push(`- ${p.cliente} — ${p.referente || "parcela"} · venceu ${p.vencimento} (${p.vencimentoDia}), ${qtd(p.dias, "dia de atraso", "dias de atraso")} · toque ${tq.chave} ${tq.nome}, por ${tq.canal} · ${R(p.valor)} original, ${semJuros ? "sem encargo definido" : `${R(p.total)} corrigido`} · contato ${p.telefone || p.email || "[a confirmar]"}`);
      L.push(`  - por que hoje: ${p.motivoHoje}`);
      L.push(`  - a mensagem precisa ter: ${tq.precisa}`);
      if (tq.chave === "D+15" && p.parcelamento) L.push(`  - proposta: à vista ${R(p.valor)} sem encargo, ou ${frasePar(p.parcelamento)}`);
    }
  }
  L.push("");

  L.push("## Parcelas em aberto");
  L.push("");
  // A coluna do dia da semana vem logo depois da data (o verificar.js datas
  // confere esse par), e a do atraso começa pelo número de dias: data colada
  // num dia da semana de outra coluna viraria par falso no conferidor.
  const comCorrecao = !!reg.correcaoPct;
  L.push(`| Cliente | Referente | Vencimento | Dia | Atraso | Original | Multa | Juros |${comCorrecao ? " Correção |" : ""} Corrigido | Estágio | Próximo toque |`);
  L.push(`|---|---|---|---|---|---|---|---|${comCorrecao ? "---|" : ""}---|---|---|`);
  for (const p of r.parcelas) {
    const atraso = p.atrasada ? `${qtd(p.dias, "dia", "dias")} (desde ${p.atrasoDesde})` : "em dia";
    L.push(`| ${p.cliente} | ${p.referente} | ${p.vencimento} | ${p.vencimentoDia} | ${atraso} | ${R(p.valor)} | ${R(p.multa)} | ${p.jurosAConfirmar ? "[a confirmar]" : R(p.juros)} |${comCorrecao ? ` ${R(p.correcao)} |` : ""} ${R(p.total)} | ${p.estagio}${p.prescrita ? " (prescrita)" : ""} | ${p.proximoToque} |`);
  }
  L.push(`| **Total** | | | | | ${R(t.principal)} | ${R(t.multa)} | ${semJuros ? "[a confirmar]" : R(t.juros)} |${comCorrecao ? ` ${R(t.correcao)} |` : ""} ${R(t.recuperavel)} | | |`);
  L.push("");
  L.push(`Em aberto: ${R(t.recuperavel)} em ${qtd(t.parcelas, "parcela", "parcelas")}, ${t.atrasadas ? `${qtd(t.atrasadas, "já atrasada", "já atrasadas")}. Principal atrasado: ${R(t.principalAtrasado)}; encargo somado: ${R(t.encargos)}` : "nenhuma vencida ainda, então nenhum encargo"}.`);
  if (reg.correcaoPct) L.push(`Correção monetária dentro do encargo: ${R(t.correcao)} (${num(reg.correcaoPct)}% sobre o principal em atraso; ${FONTES.correcao}).`);
  if (t.prescritas) {
    L.push(`Fora da conta cobrável: ${R(t.prescrito)} em ${qtd(t.prescritas, "parcela prescrita", "parcelas prescritas")} (${r.parcelas.filter((p) => p.prescrita).map((p) => p.cliente).join(", ")}). Cobrável hoje: ${R(t.cobravel)}. ${FONTES.prescricao}.`);
  }
  L.push("");

  L.push("## Como cada valor foi calculado");
  L.push("");
  const atrasadas = r.parcelas.filter((x) => x.atrasada);
  if (!atrasadas.length) L.push("Nenhuma parcela venceu ainda: valor original, sem multa e sem juros.");
  for (const p of atrasadas) {
    const partes = [`multa ${num(p.multaPct)}% de ${R(p.valor)} = ${R(p.multa)}`];
    partes.push(p.jurosAConfirmar
      ? `juros pela taxa legal do período [a confirmar] (${FONTES.taxaLegal})`
      : `juros ${num(p.jurosMesPct)}% ÷ 30 × ${qtd(p.dias, "dia", "dias")} × ${R(p.valor)} = ${R(p.juros)}`);
    if (p.correcao) partes.push(`correção ${num(p.correcaoPct)}% = ${R(p.correcao)}`);
    const semBanco = p.vencimentoMovido === "sábado" || p.vencimentoMovido === "domingo";
    const venc = p.vencimentoMovido
      ? `vencia ${p.vencimento} (${p.vencimentoDia}); como ${semBanco ? "não tinha banco" : `era ${p.vencimentoMovido}`}, o pagamento valia até ${p.vencimentoEfetivo} (${p.vencimentoEfetivoDia}), e o atraso conta de ${p.atrasoDesde}`
      : `venceu ${p.vencimento} (${p.vencimentoDia}), e o atraso conta de ${p.atrasoDesde}`;
    L.push(`- ${p.cliente}, ${p.referente || "parcela"} — ${venc}; ${partes.join("; ")}; corrigido ${R(p.total)}`);
  }
  if (atrasadas.length && reg.consumidores) {
    L.push("");
    L.push(`O juro sai por dia, não por mês cheio: ${FONTES.indebito}.`);
  }
  L.push("");

  const naRegua = r.parcelas.filter((p) => !p.reguaEsgotada);
  if (naRegua.length) {
    L.push("## Régua por parcela");
    L.push("");
    for (const p of naRegua) {
      L.push(`### ${p.cliente} — ${p.referente || "parcela"} de ${R(p.valor)}, vencimento ${p.vencimento} (${p.vencimentoDia})`);
      L.push("");
      L.push("| Toque | Data | Dia | Situação | O que fazer |");
      L.push("|---|---|---|---|---|");
      for (const tq of p.toques) L.push(`| ${tq.chave} ${tq.nome} | ${tq.dataTxt} | ${tq.diaSemana} | ${tq.status} | ${tq.oQue} |`);
      const movidas = p.toques.filter((tq) => tq.movida);
      if (movidas.length) { L.push(""); for (const tq of movidas) L.push(`- ${tq.movida}`); }
      if (p.parcelamento) {
        L.push("");
        L.push(`- Proposta pro D+15: à vista ${R(p.valor)} sem encargo, ou ${frasePar(p.parcelamento)}`);
      }
      L.push("");
    }
  }

  const esgotadas = r.parcelas.filter((p) => p.reguaEsgotada);
  if (esgotadas.length) {
    L.push("## Depois do D+30");
    L.push("");
    L.push("A régua acabou pra estas: cinco toques e pronto, sem sexto lembrete. Quem ainda não recebeu a notificação formal recebe hoje (está na lista de cima); depois dela, o que vem é decisão com custo.");
    L.push("");
    for (const p of esgotadas) {
      const formal = p.toques[p.toques.length - 1];
      L.push(`- ${p.cliente} — ${p.referente || "parcela"} · ${R(p.valor)} original, ${R(p.total)} corrigido · ${qtd(p.dias, "dia de atraso", "dias de atraso")} · o D+30 venceu em ${formal.dataTxt} (${formal.diaSemana})`);
      L.push(`  - ${p.formalEnviado ? `notificação formal enviada em ${p.ultimoContato}` : p.prescrita ? "sem nova cobrança" : "a notificação formal do D+30 sai hoje, e o prazo dela é o último combinado antes de decidir"}`);
      if (p.prescrita) L.push(`  - prescrita desde ${p.prescreveEm}: não se cobra na Justiça nem se negativa; só acordo, se ele quiser pagar. ${FONTES.prescricao}`);
      else L.push(`  - prescreve em ${p.prescreveEm}: ${qtd(p.diasParaPrescrever, "dia", "dias")} pra decidir`);
      if (p.parcelamento) L.push(`  - acordo possível: ${frasePar(p.parcelamento)}`);
      if (!p.prescrita) L.push(`  - saídas: ${FONTES.saidas}. Pré-requisito de cada uma em templates/financeiro/cobranca.md`);
    }
    L.push("");
  }

  L.push("## Feriados considerados");
  L.push("");
  L.push(`Feriado nacional e bancário de ${r.anos.length > 1 ? `${r.anos[0]} a ${r.anos[1]}` : r.anos[0]}${reg.feriadosLocais.length ? `, mais o local informado (${reg.feriadosLocais.join(", ")})` : ""}. Nenhum toque cai em dia sem banco.`);
  L.push("");
  for (const [d, n] of Object.entries(r.feriados)) L.push(`- ${d}: ${n}`);
  L.push("");
  if (r.avisos.length) {
    L.push("## Avisos do cálculo");
    L.push("");
    for (const a of r.avisos) L.push(`- ${a}`);
    L.push("");
  }
  return L.join("\n");
}

// ─────────────────────────── linha de comando ───────────────────────────

function ajuda() {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
}

function lerArgs(argv) {
  const o = { tipo: "consumidor", multa: 2, juros: 1, correcao: 0, parcelas: 3, feriados: [], semClausula: false, json: false };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const prox = () => { const v = argv[++i]; if (v === undefined) throw new Error(`falta o valor de ${a}`); return v; };
    if (a === "--hoje") o.hoje = prox();
    else if (a === "--tipo") o.tipo = prox();
    else if (a === "--multa") o.multa = br.numero(prox());
    else if (a === "--juros") o.juros = br.numero(prox());
    else if (a === "--correcao") o.correcao = br.numero(prox());
    else if (a === "--parcelas") o.parcelas = parseInt(prox(), 10);
    else if (a === "--feriado") o.feriados.push(prox());
    else if (a === "--saida") o.saida = prox();
    else if (a === "--sem-clausula") o.semClausula = true;
    else if (a === "--json") o.json = true;
    else if (a === "--valor") o.valor = prox();
    else if (a === "--vencimento") o.vencimento = prox();
    else if (a === "--cliente") o.cliente = prox();
    else if (a === "--referente") o.referente = prox();
    else if (a === "-h" || a === "--help") o.ajuda = true;
    else if (a.startsWith("--")) throw new Error(`opção desconhecida: ${a}`);
    else pos.push(a);
  }
  o.arquivo = pos[0];
  return o;
}

function main() {
  let o;
  try { o = lerArgs(process.argv.slice(2)); } catch (e) { console.error(`✖ ${e.message}`); process.exit(1); }
  if (o.ajuda || (!o.arquivo && !o.valor)) { ajuda(); process.exit(o.ajuda ? 0 : 1); }
  try {
    if (!["consumidor", "b2b"].includes(o.tipo)) throw new Error(`--tipo precisa ser consumidor ou b2b, não "${o.tipo}"`);
    if (!(o.multa >= 0) || !(o.juros >= 0) || !(o.correcao >= 0)) throw new Error("multa, juros e correção precisam ser números iguais ou maiores que zero");
    if (!(o.parcelas >= 1)) throw new Error("--parcelas precisa ser um inteiro a partir de 1");
    if (o.tipo === "consumidor" && o.multa > 2) throw new Error(`multa de ${o.multa}% pra consumidor passa do teto de 2%. ${FONTES.multa}. Pra relação entre empresas, use --tipo b2b`);
    if (o.juros > 1) console.error(`⚠ juros de ${num(o.juros)}% ao mês passam do 1% que a praxe adota. ${FONTES.usura}. Cláusula acima disso pede advogado antes de cobrar; o juiz pode reduzir (CC art. 413).`);
    o.hoje = o.hoje ? br.lerData(o.hoje) : new Date();
    if (!o.hoje) throw new Error("--hoje precisa ser DD/MM/AAAA");
    o.hoje = new Date(o.hoje.getFullYear(), o.hoje.getMonth(), o.hoje.getDate());
    br.feriados(o.hoje.getFullYear(), o.feriados); // valida o formato dos feriados

    const parcelas = o.arquivo
      ? lerArquivo(o.arquivo)
      : [{ linha: 1, cliente: o.cliente || "[cliente]", referente: o.referente || "", valor: o.valor, vencimento: o.vencimento || "" }];
    if (!o.arquivo && !br.lerData(o.vencimento || "", o.hoje.getFullYear())) throw new Error("--vencimento precisa ser DD/MM/AAAA");

    const r = processar(parcelas, o);
    if (!r.parcelas.length) throw new Error("nenhuma parcela em aberto: tudo pago ou nenhuma linha válida" + (r.avisos.length ? "\n  " + r.avisos.join("\n  ") : ""));
    for (const a of r.avisos) console.error(`⚠ ${a}`);
    if (o.json) { console.log(JSON.stringify(r, null, 2)); return; }
    const md = markdown(r);
    if (o.saida) {
      fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
      fs.writeFileSync(o.saida, md);
      const t = r.totais;
      console.log(`✓ ${o.saida}: ${qtd(t.parcelas, "parcela", "parcelas")}, ${qtd(t.atrasadas, "atrasada", "atrasadas")}, ${t.cobrarHoje} pra cobrar hoje, em aberto ${br.reais(t.recuperavel)}${t.prescritas ? ` (${br.reais(t.prescrito)} prescrito, cobrável ${br.reais(t.cobravel)})` : ""}`);
      if (t.esgotadas) console.log(`  ${t.esgotadas === 1 ? "1 parcela passou" : `${t.esgotadas} parcelas passaram`} do D+30: notificação formal quando ainda não foi, e depois decisão (acordo, protesto, negativação ou juizado), na seção "Depois do D+30"`);
      console.log(`  conferir: node scripts/verificar.js datas ${o.saida} && node scripts/verificar.js tabela ${o.saida}`);
    } else console.log(md);
  } catch (e) {
    console.error(`✖ ${e.message}`);
    process.exit(1);
  }
}

module.exports = { calcularEncargos, regua, parcelar, processar, markdown, lerArquivo, acharColunas, frasePar, TOQUES, FONTES, CONFERIDO };

if (require.main === module) main();
