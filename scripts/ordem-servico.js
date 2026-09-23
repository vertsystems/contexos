#!/usr/bin/env node
/**
 * Contex OS — ordem-servico.js
 * Monta a ordem de serviço de atendimento técnico a partir de um JSON: numera
 * em sequência sem repetir, calcula a validade do orçamento e o prazo em dia
 * útil, soma mão de obra, peças e deslocamento, e devolve a OS em .html (pra
 * imprimir e assinar), em .md (origem do .docx) e a mensagem curta de aprovação
 * pro WhatsApp. Mantém o status de cada OS em os/indice.csv e imprime a folha
 * em branco pra quem atende no balcão sem computador na mão.
 *
 * Existe porque a discussão de assistência técnica é sempre a mesma: "o aparelho
 * já chegou riscado", "eu não autorizei esse serviço", "o orçamento era outro".
 * O Código de Defesa do Consumidor resolve os três no papel — orçamento
 * discriminado com validade de dez dias (art. 40 e § 1º) e autorização expressa
 * antes de executar (art. 39, VI) —, e o que falha é a conta feita de cabeça: a
 * validade que ninguém somou, a peça que ficou fora do total, a OS 247 emitida
 * duas vezes. O script faz essas contas e recusa a OS incompleta.
 *
 * Uso:
 *   node scripts/ordem-servico.js exemplo [--saida os/os-exemplo.json]
 *   node scripts/ordem-servico.js conferir <os.json> [--json]
 *   node scripts/ordem-servico.js gerar <os.json> [--saida pasta] [--indice os/indice.csv] [--tokens identidade/tokens.css] [--sobrescrever]
 *   node scripts/ordem-servico.js branco [--saida pasta] [--negocio "Nome"] [--tokens identidade/tokens.css]
 *   node scripts/ordem-servico.js status <numero> <novo status> [--indice os/indice.csv] [--nota "texto"]
 *   node scripts/ordem-servico.js resumo [--indice os/indice.csv] [--hoje DD/MM/AAAA] [--parada 7] [--json]
 *
 * Opções:
 *   --saida <pasta>        onde gravar (padrão: a pasta do próprio JSON, que deve ser os/)
 *   --indice <arquivo>     o índice de numeração e status (padrão: os/indice.csv, ao lado da saída)
 *   --tokens <tokens.css>  lê --accent e a fonte de corpo do tokens.css pro HTML
 *   --sobrescrever         grava por cima de OS que já existe com o mesmo número
 *   --feriado DD/MM        feriado local (repetir pra cada um); muda só as datas de dia útil
 *   --parada <dias>        em `resumo`, dias sem atualização que acusam OS parada (padrão: 7)
 *   --json                 imprime o resultado em JSON, pra outra ferramenta ler
 *
 * O que sai de `gerar`, na pasta de saída:
 *   OS-<numero>.html             a OS completa, duas vias, assinatura na entrada e na saída
 *   OS-<numero>.md               a mesma OS em markdown (vira .docx com scripts/gerar-docx.js)
 *   OS-<numero>-aprovacao.md     a mensagem curta pra o cliente aprovar o orçamento por escrito
 *   indice.csv                   numero;abertura;cliente;equipamento;status;validade;prazo;total;arquivo;atualizado_em;nota
 *
 * Node 18+, sem dependência. Usa scripts/br.js (datas, dia útil, moeda, CPF/CNPJ,
 * telefone, slug).
 */

"use strict";

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const STATUS = ["aberta", "aguardando aprovação", "aguardando peça", "em execução", "concluída", "cancelada"];
const TIPOS = {
  corretiva: "Corretiva (equipamento parou, cliente chamou)",
  preventiva: "Preventiva (manutenção planejada)",
  instalacao: "Instalação (equipamento novo)",
  garantia: "Garantia (retorno de serviço já feito)",
  retrabalho: "Retrabalho (voltou pra refazer)",
};
const CABECALHO = ["numero", "abertura", "cliente", "equipamento", "status", "validade", "prazo", "total", "arquivo", "atualizado_em", "nota"];
const PLACEHOLDER = /\[[^\]]*(confirmar|preencher|definir|seu nome|nome do|xxx)[^\]]*\]|\{\{|lorem ipsum/i;

function curto(p) {
  const rel = path.relative(process.cwd(), p);
  return rel.startsWith("../../..") || rel.length > p.length ? p : rel;
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Lê "--chave valor" e "--flag". Opção repetida vira lista. */
/** Os "--feriado DD/MM" da linha de comando, já conferidos. */
function feriadosDe(o) {
  const lista = [].concat(o.feriado === undefined ? [] : o.feriado).filter((f) => typeof f === "string");
  for (const f of lista) {
    if (!/^\d{2}\/\d{2}$/.test(f)) morrer(`--feriado "${f}" fora do formato DD/MM`, "exemplo: --feriado 24/09 --feriado 08/12");
  }
  return lista;
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2);
    const prox = argv[i + 1];
    const v = prox !== undefined && !prox.startsWith("--") ? argv[++i] : true;
    if (o[k] === undefined) o[k] = v;
    else o[k] = [].concat(o[k], v);
  }
  return o;
}

const vazio = (s) => !String(s === undefined || s === null ? "" : s).trim();

// ───────────────────────────── exemplo ─────────────────────────────

const EXEMPLO = {
  tipo: "corretiva",
  status: "aguardando aprovação",
  abertura: "22/09/2026",
  prazo_dias_uteis: 4,
  negocio: {
    nome: "Frio Certo Refrigeração",
    documento: "11.222.333/0001-81",
    responsavel: "Marcos Ferreira",
    contato: "(13) 99728-7738",
    endereco: "Rua das Palmeiras, 240 — Santos/SP",
  },
  cliente: {
    nome: "Padaria Pão da Serra",
    documento: "12.345.678/0001-95",
    contato: "(13) 98888-7777",
    endereco: "Av. Ana Costa, 88, loja 2 — Santos/SP",
    responsavel: "Carlos Pereira",
  },
  equipamento: {
    descricao: "Balcão refrigerado de 4 portas",
    marca: "Gelopar",
    modelo: "GBPB-190",
    serie: "BR45821",
    acessorios: ["duas bandejas de inox", "cabo de força original"],
    senha_informada: "",
  },
  estado_entrada: {
    descricao: "Liga, ilumina, mas não gela. Pintura com desgaste normal de uso.",
    avarias: ["amassado de 4 cm na lateral direita", "pé dianteiro esquerdo torto"],
    fotos: ["dados/fotos/balcao-padaria-entrada-frente.jpg", "dados/fotos/balcao-padaria-entrada-lateral.jpg"],
  },
  defeito_relatado: "O cliente diz: \"para de gelar de tarde e volta de manhã, e agora não gela mais nada\".",
  diagnostico: "Compressor com partida travada e capacitor de marcha estufado. Gás dentro da faixa; sem vazamento no teste de pressão.",
  servico_executado: "",
  orcamento: {
    recebido_em: "22/09/2026",
    validade_dias: 10,
    mao_de_obra: [
      { descricao: "Troca do capacitor de marcha e teste de partida", horas: 1.5, valor: "180,00" },
      { descricao: "Limpeza do condensador e verificação de pressão", horas: 1, valor: "120,00" },
    ],
    pecas: [
      { descricao: "Capacitor de marcha 30µF 440V", codigo: "CAP-30-440", qtd: 1, valor_unitario: "95,00", custo_unitario: "48,00" },
      { descricao: "Relé de partida PTC", codigo: "REL-PTC-12", qtd: 1, valor_unitario: "70,00", custo_unitario: "35,00" },
    ],
    deslocamento: { descricao: "Visita técnica na loja (ida e volta)", valor: "60,00" },
    desconto: "0",
  },
  pagamento: "Pix ou cartão em até 3 vezes, na retirada.",
  garantia: {
    dias: 90,
    escopo: "as duas peças trocadas e a mão de obra desta OS",
    exclusoes: ["queima por oscilação da rede elétrica", "mau uso e porta mantida aberta", "outro componente que não foi tocado nesta OS"],
  },
  aprovacao: { data: "", meio: "", por: "" },
  saida: { data: "", retirado_por: "", documento: "" },
  observacoes: [
    "O cliente foi avisado de que equipamento não retirado em 90 dias passa a ter diária de guarda combinada por escrito.",
  ],
};

// ───────────────────────────── contas ─────────────────────────────

/** Item a item: subtotal de cada bloco, total, e margem só quando o custo da peça vem informado. */
function calcular(spec) {
  const o = spec.orcamento || {};
  const linhas = [];
  let mao = 0, pecas = 0, desloc = 0, custoPecas = 0;
  let pecaSemCusto = [];

  for (const m of o.mao_de_obra || []) {
    const v = br.numero(m.valor);
    if (!isFinite(v)) continue;
    mao += v;
    linhas.push({ bloco: "Mão de obra", descricao: m.descricao || "serviço", detalhe: m.horas ? `${br.numero(m.horas)} h` : "", qtd: 1, unitario: v, total: v });
  }
  for (const p of o.pecas || []) {
    const q = isFinite(br.numero(p.qtd)) ? br.numero(p.qtd) : 1;
    const u = br.numero(p.valor_unitario);
    if (!isFinite(u)) continue;
    const t = br.centavos(q * u);
    pecas += t;
    const c = br.numero(p.custo_unitario);
    if (isFinite(c)) custoPecas += br.centavos(q * c);
    else pecaSemCusto.push(p.descricao || p.codigo || "peça sem descrição");
    linhas.push({ bloco: "Peça", descricao: p.descricao || "peça", detalhe: p.codigo ? `cód. ${p.codigo}` : "", qtd: q, unitario: u, total: t });
  }
  const d = o.deslocamento || {};
  if (isFinite(br.numero(d.valor))) {
    desloc = br.numero(d.valor);
    linhas.push({ bloco: "Deslocamento", descricao: d.descricao || "deslocamento", detalhe: "", qtd: 1, unitario: desloc, total: desloc });
  }

  const desconto = isFinite(br.numero(o.desconto)) ? br.numero(o.desconto) : 0;
  const subtotal = br.centavos(mao + pecas + desloc);
  const total = br.centavos(subtotal - desconto);

  // Margem: só quando TODA peça informou custo. Uma peça sem custo deixa o campo vazio.
  let margem = null;
  if ((o.pecas || []).length && !pecaSemCusto.length) {
    const lucroPecas = br.centavos(pecas - custoPecas);
    margem = {
      custo_pecas: custoPecas,
      lucro_pecas: lucroPecas,
      pct_pecas: pecas > 0 ? lucroPecas / pecas : 0,
      sobra_total: br.centavos(total - custoPecas),
      pct_total: total > 0 ? br.centavos(total - custoPecas) / total : 0,
    };
  }

  return { linhas, mao: br.centavos(mao), pecas: br.centavos(pecas), deslocamento: desloc, desconto, subtotal, total, margem, pecaSemCusto };
}

/**
 * Validade do orçamento: dez dias corridos por padrão (CDC, art. 40, § 1º),
 * contados do recebimento pelo consumidor, excluído o dia do começo (CC,
 * art. 132). Vencimento em dia sem banco nem balcão prorroga (§ 1º).
 */
function validade(spec, extras = []) {
  const o = spec.orcamento || {};
  const base = br.lerData(o.recebido_em || spec.abertura);
  if (!base) return null;
  const dias = isFinite(br.numero(o.validade_dias)) ? br.numero(o.validade_dias) : 10;
  const bruta = br.mais(base, dias);
  const { data, motivo } = br.proximoUtil(bruta, extras);
  return { base, dias, bruta, data, motivo };
}

/** Prazo prometido: data fixa em `prazo`, ou N dias úteis a partir da abertura. */
function prazoDe(spec, extras = []) {
  const abertura = br.lerData(spec.abertura);
  if (spec.prazo && br.lerData(spec.prazo)) return { data: br.lerData(spec.prazo), uteis: null };
  const n = br.numero(spec.prazo_dias_uteis);
  if (!abertura || !isFinite(n)) return null;
  return { data: br.maisUteis(abertura, n, extras), uteis: n };
}

/**
 * Garantia do serviço: conta do término da execução (CDC, art. 26, § 1º). Sem
 * data de saída ainda, devolve só o prazo.
 */
function garantiaAte(spec, extras = []) {
  const dias = br.numero((spec.garantia || {}).dias);
  const saida = br.lerData((spec.saida || {}).data);
  if (!isFinite(dias)) return null;
  if (!saida) return { dias, data: null, legal: null };
  const { data, motivo } = br.proximoUtil(br.mais(saida, dias), extras);
  // Art. 26, II e § 1º: 90 dias pra reclamar de vício, contados do término da
  // execução. Corre em paralelo à garantia da casa, e pode passar dela.
  const { data: legal } = br.proximoUtil(br.mais(saida, 90), extras);
  return { dias, data, motivo, legal };
}

// ───────────────────────────── índice ─────────────────────────────

function celulaCsv(v) {
  const s = String(v === undefined || v === null ? "" : v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function lerLinhaCsv(linha) {
  const out = [];
  let campo = "", aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (aspas) {
      if (ch === '"') { if (linha[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ";") { out.push(campo); campo = ""; }
    else campo += ch;
  }
  out.push(campo);
  return out;
}

/** Devolve { cabecalho, itens } do indice.csv. Arquivo inexistente vira índice vazio. */
function lerIndice(arq) {
  if (!fs.existsSync(arq)) return { cabecalho: CABECALHO.slice(), itens: [] };
  const linhas = fs.readFileSync(arq, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!linhas.length) return { cabecalho: CABECALHO.slice(), itens: [] };
  const cab = lerLinhaCsv(linhas[0]).map((c) => c.trim());
  const itens = linhas.slice(1).map((l) => {
    const cel = lerLinhaCsv(l);
    const o = {};
    cab.forEach((c, i) => { o[c] = (cel[i] || "").trim(); });
    return o;
  });
  return { cabecalho: cab, itens };
}

function escreverIndice(arq, indice) {
  const cab = indice.cabecalho.length ? indice.cabecalho : CABECALHO.slice();
  const linhas = [cab.map(celulaCsv).join(";")];
  for (const it of indice.itens) linhas.push(cab.map((c) => celulaCsv(it[c])).join(";"));
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, linhas.join("\n") + "\n", "utf8");
}

/** AAAA-NNNN, reiniciando a cada ano, sempre acima do maior já emitido no ano. */
function proximoNumero(indice, ano) {
  let maior = 0;
  for (const it of indice.itens) {
    const m = String(it.numero || "").match(/^(\d{4})-(\d+)$/);
    if (m && Number(m[1]) === ano) maior = Math.max(maior, Number(m[2]));
  }
  return `${ano}-${String(maior + 1).padStart(4, "0")}`;
}

// ───────────────────────────── conferência ─────────────────────────────

/**
 * Os campos que evitam palavra contra palavra. Falta que impede a OS de sair
 * vira `faltas`; o que enfraquece a OS sem invalidá-la vira `avisos`.
 */
function conferir(spec, opts = {}) {
  const faltas = [], avisos = [];
  const extras = opts.feriados || [];
  const F = (rot, v) => { if (vazio(v)) faltas.push(rot); };
  const P = (rot, v) => { if (!vazio(v) && PLACEHOLDER.test(String(v))) avisos.push(`${rot} ainda está com texto de exemplo: "${String(v).trim().slice(0, 50)}"`); };

  const n = spec.negocio || {}, c = spec.cliente || {}, e = spec.equipamento || {}, ee = spec.estado_entrada || {};
  const o = spec.orcamento || {}, g = spec.garantia || {}, ap = spec.aprovacao || {}, sa = spec.saida || {};
  const status = String(spec.status || "aberta").trim();

  if (!STATUS.includes(status)) faltas.push(`status "${status}" não existe (use: ${STATUS.join(", ")})`);
  if (spec.tipo && !TIPOS[spec.tipo]) faltas.push(`tipo "${spec.tipo}" não existe (use: ${Object.keys(TIPOS).join(", ")})`);

  F("negocio.nome", n.nome);
  F("negocio.responsavel (quem atendeu)", n.responsavel);
  F("negocio.contato", n.contato);
  F("cliente.nome", c.nome);
  F("cliente.contato", c.contato);
  F("cliente.endereco", c.endereco);
  F("equipamento.descricao", e.descricao);
  F("equipamento.marca", e.marca);
  F("equipamento.modelo", e.modelo);
  F("equipamento.serie (escreva \"sem número de série visível\" quando não houver)", e.serie);
  F("estado_entrada.descricao", ee.descricao);
  F("defeito_relatado (na palavra do cliente)", spec.defeito_relatado);
  F("pagamento", spec.pagamento);
  F("garantia.dias", g.dias);
  F("garantia.escopo", g.escopo);

  for (const [rot, doc, valida] of [["cliente.documento", c.documento, null], ["negocio.documento", n.documento, null]]) {
    if (vazio(doc)) { avisos.push(`${rot} em branco: sem CPF ou CNPJ a OS identifica menos na hora de cobrar`); continue; }
    const d = String(doc).replace(/\D/g, "");
    const ok = d.length === 11 ? br.cpfValido(doc) : br.cnpjValido(doc);
    if (!ok) faltas.push(`${rot} inválido: "${doc}" não passa no dígito verificador`);
  }
  for (const [rot, tel] of [["cliente.contato", c.contato], ["negocio.contato", n.contato]]) {
    if (!vazio(tel) && !br.telefoneE164(tel) && !/@/.test(String(tel))) avisos.push(`${rot} "${tel}" não é telefone válido com DDD`);
  }

  if (!br.lerData(spec.abertura)) faltas.push("abertura não é data válida (DD/MM/AAAA)");
  if (!o.recebido_em && !spec.abertura) faltas.push("orcamento.recebido_em: a validade conta do recebimento pelo cliente");
  if (o.recebido_em && !br.lerData(o.recebido_em)) faltas.push("orcamento.recebido_em não é data válida");
  const pz = prazoDe(spec, extras);
  if (!pz) faltas.push("prazo ou prazo_dias_uteis: o cliente precisa saber até quando");

  if (!(o.mao_de_obra || []).length && !(o.pecas || []).length && !(o.deslocamento || {}).valor) {
    faltas.push("orcamento: sem mão de obra, peça nem deslocamento não há orçamento discriminado (CDC, art. 40)");
  }
  const contas = calcular(spec);
  if (contas.total <= 0 && status !== "cancelada") avisos.push("total do orçamento ficou em zero ou negativo: conferir os valores");
  if (contas.pecaSemCusto.length) avisos.push(`sem custo informado em ${contas.pecaSemCusto.length} peça(s) (${contas.pecaSemCusto.join("; ")}): a margem sai em branco`);

  if (!(ee.fotos || []).length) avisos.push("estado_entrada.fotos vazio: foto na entrada é o que responde \"já chegou riscado\"");
  if (vazio(spec.diagnostico) && status !== "aberta") avisos.push("diagnostico em branco: o que o técnico encontrou fica separado do que o cliente relatou");

  const precisaAprovacao = ["em execução", "concluída"].includes(status);
  if (precisaAprovacao && (vazio(ap.data) || vazio(ap.meio))) {
    faltas.push(`status "${status}" sem aprovacao.data e aprovacao.meio: executar serviço sem autorização expressa é prática abusiva (CDC, art. 39, VI)`);
  }
  if (!vazio(ap.data) && !br.lerData(ap.data)) faltas.push("aprovacao.data não é data válida");

  const val = validade(spec, extras);
  if (val && !vazio(ap.data)) {
    const ad = br.lerData(ap.data);
    if (ad && ad > val.data) avisos.push(`a aprovação (${br.fmt(ad)}) veio depois da validade do orçamento (${br.fmt(val.data)}): refazer o orçamento antes de executar`);
  }
  if (status === "concluída") {
    if (vazio(spec.servico_executado)) faltas.push("status \"concluída\" sem servico_executado: é o que a garantia cobre");
    if (vazio(sa.data)) faltas.push("status \"concluída\" sem saida.data: a garantia e o prazo do art. 26 contam da entrega");
    if (vazio(sa.retirado_por)) avisos.push("saida.retirado_por em branco: quem assinou a retirada");
  }
  if (!vazio(sa.data) && !br.lerData(sa.data)) faltas.push("saida.data não é data válida");
  const ab = br.lerData(spec.abertura);
  if (ab) {
    const sd = br.lerData(sa.data), apd = br.lerData(ap.data);
    if (sd && sd < ab) faltas.push(`saida.data (${br.fmt(sd)}) é anterior à abertura (${br.fmt(ab)}): o equipamento não sai antes de entrar`);
    if (apd && apd < ab) faltas.push(`aprovacao.data (${br.fmt(apd)}) é anterior à abertura (${br.fmt(ab)}): o cliente não aprova orçamento que ainda não existia`);
    if (sd && apd && sd < apd) avisos.push(`a saída (${br.fmt(sd)}) é anterior à aprovação (${br.fmt(apd)}): conferir qual das duas datas está trocada`);
  }
  if (!(g.exclusoes || []).length) avisos.push("garantia.exclusoes vazio: garantia sem exclusão escrita é entendida como \"o aparelho todo\"");

  P("defeito_relatado", spec.defeito_relatado);
  P("diagnostico", spec.diagnostico);
  P("garantia.escopo", g.escopo);

  return { faltas, avisos, contas, datas: { abertura: br.lerData(spec.abertura), prazo: pz, validade: val, garantia: garantiaAte(spec, extras) }, status };
}

// ───────────────────────────── markdown ─────────────────────────────

const F = (d) => (d ? `${br.fmt(d)} (${br.diaSemana(d)})` : "[a confirmar]");
const R = (n) => br.reais(n);

function md(spec, res, numero) {
  const n = spec.negocio || {}, c = spec.cliente || {}, e = spec.equipamento || {}, ee = spec.estado_entrada || {};
  const o = spec.orcamento || {}, g = spec.garantia || {}, ap = spec.aprovacao || {}, sa = spec.saida || {};
  const L = [];
  L.push(`# Ordem de serviço ${numero} — ${n.nome || ""}`);
  L.push("");
  L.push(`**Abertura:** ${F(res.datas.abertura)} · **Tipo:** ${TIPOS[spec.tipo] || "[a confirmar]"} · **Status:** ${res.status}`);
  L.push(`**Prazo combinado:** ${res.datas.prazo ? F(res.datas.prazo.data) + (res.datas.prazo.uteis ? ` — ${res.datas.prazo.uteis} dias úteis da abertura` : "") : "[a confirmar]"}`);
  L.push(`**Atendeu:** ${n.responsavel || "[a confirmar]"} · **Contato:** ${n.contato || ""}${n.documento ? ` · **CNPJ/CPF:** ${n.documento}` : ""}`);
  L.push("");
  L.push("## Cliente");
  L.push(`| Campo | Conteúdo |`);
  L.push(`|---|---|`);
  L.push(`| Nome | ${c.nome || ""} |`);
  L.push(`| CPF ou CNPJ | ${c.documento || "[não informado]"} |`);
  L.push(`| Responsável no local | ${c.responsavel || c.nome || ""} |`);
  L.push(`| Contato | ${c.contato || ""} |`);
  L.push(`| Endereço | ${c.endereco || ""} |`);
  L.push("");
  L.push("## Equipamento");
  L.push(`| Campo | Conteúdo |`);
  L.push(`|---|---|`);
  L.push(`| Descrição | ${e.descricao || ""} |`);
  L.push(`| Marca | ${e.marca || ""} |`);
  L.push(`| Modelo | ${e.modelo || ""} |`);
  L.push(`| Número de série | ${e.serie || ""} |`);
  L.push(`| Acessórios recebidos | ${(e.acessorios || []).join("; ") || "nenhum"} |`);
  if (!vazio(e.senha_informada)) L.push(`| Senha informada pelo cliente | ${e.senha_informada} |`);
  L.push("");
  L.push("## Estado na entrada");
  L.push(ee.descricao || "");
  if ((ee.avarias || []).length) {
    L.push("");
    L.push("Marcas e avarias registradas na entrada, conferidas com o cliente:");
    (ee.avarias || []).forEach((a) => L.push(`- ${a}`));
  }
  if ((ee.fotos || []).length) {
    L.push("");
    L.push(`Fotos da entrada (${(ee.fotos || []).length}): ${(ee.fotos || []).join("; ")}`);
  }
  L.push("");
  L.push("## Defeito relatado pelo cliente");
  L.push(spec.defeito_relatado || "");
  L.push("");
  L.push("## Diagnóstico técnico");
  L.push(vazio(spec.diagnostico) ? "A confirmar depois da avaliação." : spec.diagnostico);
  L.push("");
  L.push("## Orçamento");
  L.push("| Item | O que é | Qtd | Preço unit. | Total |");
  L.push("|---|---|---|---|---|");
  for (const l of res.contas.linhas) {
    L.push(`| ${l.descricao}${l.detalhe ? ` (${l.detalhe})` : ""} | ${l.bloco} | ${l.qtd} | ${R(l.unitario)} | ${R(l.total)} |`);
  }
  L.push(`| **Subtotal** | | | | ${R(res.contas.subtotal)} |`);
  L.push("");
  L.push("| Bloco | Valor |");
  L.push("|---|---|");
  L.push(`| Mão de obra | ${R(res.contas.mao)} |`);
  L.push(`| Peças | ${R(res.contas.pecas)} |`);
  L.push(`| Deslocamento | ${R(res.contas.deslocamento)} |`);
  if (res.contas.desconto) L.push(`| Desconto | -${R(res.contas.desconto)} |`);
  L.push(`| Total | ${R(res.contas.total)} |`);
  L.push("");
  const val = res.datas.validade;
  if (val) {
    L.push(`**Validade do orçamento:** ${F(val.data)} — ${val.dias} dias corridos do recebimento em ${br.fmt(val.base)}${val.motivo ? `, prorrogado porque ${br.fmt(val.bruta)} caiu em ${val.motivo}` : ""}.`);
  }
  L.push("**Pagamento:** " + (spec.pagamento || ""));
  L.push("");
  L.push("**Aprovação do orçamento.** Nada é executado antes do cliente aprovar por escrito. Aprovado, o valor obriga as duas partes e só muda por nova negociação (CDC, art. 40, § 2º). Serviço de terceiro que não estava aqui não é cobrado do cliente (§ 3º).");
  L.push("");
  L.push(`Aprovado em: ${vazio(ap.data) ? "____/____/________" : F(br.lerData(ap.data))} · Por: ${ap.por || "____________________"} · Meio: ${ap.meio || "____________________"}`);
  L.push("");
  L.push("## Serviço executado");
  L.push(vazio(spec.servico_executado) ? "A preencher no fechamento da OS." : spec.servico_executado);
  L.push("");
  L.push("## Garantia");
  const gar = res.datas.garantia;
  L.push(`**${gar && isFinite(gar.dias) ? gar.dias : "[a confirmar]"} dias** sobre ${g.escopo || "[a confirmar]"}, contados da entrega do equipamento${gar && gar.data ? `, ou seja, até ${F(gar.data)}` : ""}.`);
  if ((g.exclusoes || []).length) {
    L.push("");
    L.push("A garantia **não** cobre:");
    (g.exclusoes || []).forEach((x) => L.push(`- ${x}`));
  }
  L.push("");
  const legalOutra = gar && gar.legal && (!gar.data || br.fmt(gar.legal) !== br.fmt(gar.data));
  L.push(`A garantia acima é contratual e soma-se à legal, que existe por lei e não depende deste termo (CDC, art. 24 e 50). O prazo pra reclamar de vício do serviço é de 90 dias do término da execução${legalOutra ? `, ou seja, até ${br.fmt(gar.legal)}` : ""} (art. 26, II e § 1º); em vício oculto, conta de quando ele aparece (§ 3º).`);
  if ((spec.observacoes || []).length) {
    L.push("");
    L.push("## Observações");
    (spec.observacoes || []).forEach((x) => L.push(`- ${x}`));
  }
  L.push("");
  L.push("## Assinatura na entrada");
  L.push("O cliente confere o equipamento, os acessórios e as avarias descritas acima, e autoriza a avaliação técnica.");
  L.push("");
  L.push("______________________________");
  L.push(c.responsavel || c.nome || "Cliente");
  L.push(c.documento ? `CPF/CNPJ ${c.documento}` : "CPF/CNPJ");
  L.push("");
  L.push("______________________________");
  L.push(n.responsavel || "Responsável pelo atendimento");
  L.push(n.nome || "");
  L.push("");
  L.push("## Assinatura na saída");
  L.push(`Retirado em ${vazio(sa.data) ? "____/____/________" : F(br.lerData(sa.data))}, em funcionamento, com os acessórios entregues na entrada.`);
  L.push("");
  L.push("______________________________");
  L.push(sa.retirado_por || "Quem retirou");
  L.push(sa.documento || "CPF/CNPJ");
  L.push("");
  L.push("______________________________");
  L.push(n.responsavel || "Responsável pela entrega");
  L.push(n.nome || "");
  L.push("");
  L.push("Base: CDC (Lei 8.078/1990), art. 40 (orçamento discriminado), art. 39, VI (autorização expressa), art. 20 (vício de serviço), art. 26 (90 dias pra reclamar, do término da execução), art. 24 e 50 (garantia). Duas vias, uma pra cada parte.");
  return L.join("\n");
}

/** A mensagem curta pro cliente aprovar por escrito, que é o que o art. 39, VI exige. */
function mensagemAprovacao(spec, res, numero) {
  const c = spec.cliente || {}, e = spec.equipamento || {};
  const primeiro = String(c.responsavel || c.nome || "").split(" ")[0] || "";
  const val = res.datas.validade, pz = res.datas.prazo;
  const L = [`# Aprovação do orçamento — OS ${numero}`, "", `Pra mandar no WhatsApp de ${c.contato || c.nome}. A resposta por escrito é a autorização expressa que o CDC exige (art. 39, VI); guardar o print junto da OS.`, "", "```"];
  L.push(`${primeiro}, o orçamento do ${e.descricao || "equipamento"}${e.serie ? ` (série ${e.serie})` : ""} ficou assim:`);
  L.push("");
  L.push(`Mão de obra: ${R(res.contas.mao)}`);
  L.push(`Peças: ${R(res.contas.pecas)}`);
  if (res.contas.deslocamento) L.push(`Deslocamento: ${R(res.contas.deslocamento)}`);
  if (res.contas.desconto) L.push(`Desconto: -${R(res.contas.desconto)}`);
  L.push(`Total: ${R(res.contas.total)}`);
  L.push("");
  L.push(`O que vou fazer: ${((spec.orcamento || {}).mao_de_obra || []).map((m) => String(m.descricao || "").toLowerCase()).join("; ") || "o serviço descrito na OS"}.`);
  if (!vazio(spec.diagnostico)) L.push(`O que eu encontrei: ${spec.diagnostico}`);
  L.push(`Prazo depois do seu ok: ${pz ? br.fmt(pz.data) : "[a confirmar]"}.`);
  L.push(`Garantia: ${(spec.garantia || {}).dias || "[a confirmar]"} dias sobre ${(spec.garantia || {}).escopo || "[a confirmar]"}.`);
  if (val) L.push(`Esse valor vale até ${br.fmt(val.data)}.`);
  L.push("");
  L.push(`Se puder, me responde aqui \"aprovo o orçamento da OS ${numero}\" que eu começo. Sem esse ok eu não mexo em nada, e nada do que não está aqui entra na conta.`);
  L.push("```");
  L.push("");
  L.push(`OS completa pra assinar: \`OS-${numero}.html\`. Depois do ok, rodar: \`node scripts/ordem-servico.js status ${numero} "em execução"\`.`);
  return L.join("\n");
}

// ───────────────────────────── HTML ─────────────────────────────

function lerTokens(arq) {
  const css = fs.readFileSync(arq, "utf8");
  const cor = (css.match(/--accent\s*:\s*(#[0-9a-f]{3,8})/i) || [])[1];
  const fonte = (css.match(/--font-body\s*:\s*([^;]+);/i) || [])[1];
  return { cor, fonte: fonte && fonte.trim() };
}

function esc(s) {
  return String(s === undefined || s === null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function campos(pares, alt) {
  return `<dl class="campos${alt ? " alto" : ""}">` + pares.map(([r, v]) => `<div><dt>${esc(r)}</dt><dd>${vazio(v) ? '<span class="linha"></span>' : esc(v)}</dd></div>`).join("") + "</dl>";
}

function bloco(titulo, corpo) {
  return `<section><h2>${esc(titulo)}</h2>${corpo}</section>`;
}

function textoOuLinhas(t, n = 3) {
  if (!vazio(t)) return `<p>${esc(t)}</p>`;
  return `<div class="pauta">${Array.from({ length: n }, () => '<span class="linha"></span>').join("")}</div>`;
}

function assinatura(nome, doc) {
  return `<div class="assinatura"><div class="risco"></div><p class="nome">${esc(nome)}</p><p class="doc">${esc(doc)}</p></div>`;
}

function estilo(cor, fonte) {
  return `
  :root {
    --cor-fundo: #ffffff; --cor-texto: #1c1c1c; --cor-suave: #5a5a5a;
    --cor-destaque: ${cor}; --cor-borda: #d8d8d8; --cor-caixa: #f4f6f8;
    --fonte: ${fonte}; --largura: 760px;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--cor-fundo, #fff); color: var(--cor-texto, #1c1c1c); font-family: var(--fonte, system-ui, sans-serif); font-size: 15px; line-height: 1.5; }
  main { max-width: var(--largura, 760px); margin: 0 auto; padding: 32px 16px 56px; }
  header { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid var(--cor-destaque, #1f4e79); padding-bottom: 10px; margin-bottom: 20px; }
  header .marca { font-weight: 700; font-size: 18px; }
  header .marca span { display: block; font-weight: 400; font-size: 13px; color: var(--cor-suave, #5a5a5a); }
  header .numero { text-align: right; }
  header .numero strong { display: block; font-size: 24px; color: var(--cor-destaque, #1f4e79); letter-spacing: .01em; }
  header .numero span { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--cor-suave, #5a5a5a); }
  h1 { font-size: 20px; margin: 0 0 14px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 8px; color: var(--cor-destaque, #1f4e79); }
  section { border: 1px solid var(--cor-borda, #d8d8d8); border-radius: 4px; padding: 12px 14px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
  p { margin: 0 0 8px; }
  ul { margin: 0 0 8px; padding-left: 20px; }
  li { margin-bottom: 4px; }
  dl.campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px 18px; margin: 0; }
  dl.campos.alto { grid-template-columns: 1fr; }
  dt { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--cor-suave, #5a5a5a); }
  dd { margin: 1px 0 0; font-weight: 500; }
  .linha { display: block; border-bottom: 1px dotted #9a9a9a; height: 17px; }
  .linha-inline { display: inline-block; min-width: 240px; max-width: 100%; border-bottom: 1px dotted #9a9a9a; }
  .pauta .linha { margin-bottom: 7px; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; font-size: 14px; }
  th, td { border: 1px solid var(--cor-borda, #d8d8d8); padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: var(--cor-caixa, #f4f6f8); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  tr.total td { font-weight: 700; background: var(--cor-caixa, #f4f6f8); }
  .aviso { background: var(--cor-caixa, #f4f6f8); border-left: 3px solid var(--cor-destaque, #1f4e79); padding: 8px 10px; font-size: 13px; }
  .assinaturas { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 26px; }
  .assinatura { flex: 1 1 250px; break-inside: avoid; page-break-inside: avoid; }
  .assinatura .risco { border-top: 1px solid var(--cor-texto, #1c1c1c); margin-top: 44px; }
  .assinatura .nome { margin: 5px 0 0; font-weight: 600; font-size: 14px; }
  .assinatura .doc { margin: 0; color: var(--cor-suave, #5a5a5a); font-size: 13px; }
  footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--cor-borda, #d8d8d8); color: var(--cor-suave, #5a5a5a); font-size: 12px; }
  @media (max-width: 520px) {
    header .numero { text-align: left; }
    table, thead, tbody, tr, th, td { display: block; }
    thead { display: none; }
    td { border-top: none; text-align: left; }
    td::before { content: attr(data-rotulo); display: block; font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--cor-suave, #5a5a5a); }
    tr { border-top: 1px solid var(--cor-borda, #d8d8d8); margin-bottom: 8px; }
  }
  @page { size: A4; margin: 14mm 13mm; }
  @media print {
    body { font-size: 10.5pt; color: #000; background: #fff; }
    main { max-width: none; padding: 0; }
    h2 { break-after: avoid; }
    section, table, .assinaturas { break-inside: avoid; }
    footer { font-size: 8.5pt; }
  }`;
}

function html(spec, res, numero, tokens) {
  const cor = tokens.cor || "#1f4e79";
  const fonte = tokens.fonte || '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const n = spec.negocio || {}, c = spec.cliente || {}, e = spec.equipamento || {}, ee = spec.estado_entrada || {};
  const o = spec.orcamento || {}, g = spec.garantia || {}, ap = spec.aprovacao || {}, sa = spec.saida || {};
  const val = res.datas.validade, pz = res.datas.prazo, gar = res.datas.garantia;
  const S = [];

  S.push(bloco("Cliente", campos([
    ["Nome", c.nome], ["CPF ou CNPJ", c.documento], ["Responsável no local", c.responsavel || c.nome],
    ["Contato", c.contato], ["Endereço", c.endereco],
  ])));

  S.push(bloco("Equipamento", campos([
    ["Descrição", e.descricao], ["Marca", e.marca], ["Modelo", e.modelo], ["Número de série", e.serie],
    ["Acessórios recebidos", (e.acessorios || []).join("; ")], ["Senha informada", e.senha_informada],
  ])));

  S.push(bloco("Estado na entrada (conferido com o cliente)",
    textoOuLinhas(ee.descricao, 2) +
    ((ee.avarias || []).length ? `<ul>${(ee.avarias || []).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : '<div class="pauta"><span class="linha"></span><span class="linha"></span></div>') +
    ((ee.fotos || []).length ? `<p class="aviso">Fotos da entrada (${(ee.fotos || []).length}) guardadas em: ${esc((ee.fotos || []).join("; "))}</p>` : '<p class="aviso">Fotos da entrada: ______ arquivos, guardados em ____________________</p>')
  ));

  S.push(bloco("Defeito relatado pelo cliente", textoOuLinhas(spec.defeito_relatado, 3)));
  S.push(bloco("Diagnóstico técnico", textoOuLinhas(spec.diagnostico, 3)));

  const linhasOrc = res.contas.linhas.length
    ? res.contas.linhas.map((l) => `<tr><td data-rotulo="Item">${esc(l.descricao)}${l.detalhe ? ` <em>(${esc(l.detalhe)})</em>` : ""}</td><td data-rotulo="O que é">${esc(l.bloco)}</td><td class="n" data-rotulo="Qtd">${esc(l.qtd)}</td><td class="n" data-rotulo="Preço unit.">${esc(R(l.unitario))}</td><td class="n" data-rotulo="Total">${esc(R(l.total))}</td></tr>`).join("") + `<tr><td colspan="4">Subtotal</td><td class="n" data-rotulo="Subtotal">${esc(R(res.contas.subtotal))}</td></tr>`
    : Array.from({ length: 6 }, () => '<tr><td><span class="linha"></span></td><td><span class="linha"></span></td><td><span class="linha"></span></td><td><span class="linha"></span></td><td><span class="linha"></span></td></tr>').join("");
  const temContas = res.contas.linhas.length > 0;
  S.push(bloco("Orçamento (mão de obra, peças e deslocamento discriminados)",
    `<table><thead><tr><th>Item</th><th>O que é</th><th class="n">Qtd</th><th class="n">Preço unit.</th><th class="n">Total</th></tr></thead><tbody>${linhasOrc}` +
    `<tr><td colspan="4">Mão de obra</td><td class="n" data-rotulo="Mão de obra">${temContas ? esc(R(res.contas.mao)) : '<span class="linha"></span>'}</td></tr>` +
    `<tr><td colspan="4">Peças</td><td class="n" data-rotulo="Peças">${temContas ? esc(R(res.contas.pecas)) : '<span class="linha"></span>'}</td></tr>` +
    `<tr><td colspan="4">Deslocamento</td><td class="n" data-rotulo="Deslocamento">${temContas ? esc(R(res.contas.deslocamento)) : '<span class="linha"></span>'}</td></tr>` +
    (res.contas.desconto ? `<tr><td colspan="4">Desconto</td><td class="n" data-rotulo="Desconto">-${esc(R(res.contas.desconto))}</td></tr>` : "") +
    `<tr class="total"><td colspan="4">Total</td><td class="n" data-rotulo="Total">${temContas ? esc(R(res.contas.total)) : '<span class="linha"></span>'}</td></tr>` +
    `</tbody></table>` +
    campos([
      ["Validade do orçamento", val ? `${br.fmt(val.data)} (${val.dias} dias do recebimento em ${br.fmt(val.base)})` : ""],
      ["Prazo depois da aprovação", pz ? br.fmt(pz.data) : ""],
      ["Forma de pagamento", spec.pagamento],
    ]) +
    `<p class="aviso">Nada é executado antes da sua aprovação por escrito. Aprovado, o valor obriga as duas partes e só muda por nova negociação. Serviço de terceiro que não está nesta lista não é cobrado de você. <strong>CDC, art. 40, §§ 1º a 3º, e art. 39, VI.</strong></p>` +
    campos([["Aprovado em", ap.data && br.lerData(ap.data) ? br.fmt(br.lerData(ap.data)) : ""], ["Por", ap.por], ["Meio (WhatsApp, assinatura, e-mail)", ap.meio]])
  ));

  S.push(bloco("Serviço executado", textoOuLinhas(spec.servico_executado, 4)));

  S.push(bloco("Garantia do serviço",
    `<p><strong>${gar && isFinite(gar.dias) ? esc(gar.dias) : "______"} dias</strong> sobre ${vazio(g.escopo) ? '<span class="linha-inline"></span>' : esc(g.escopo)}, contados da entrega do equipamento${gar && gar.data ? `, ou seja, até <strong>${esc(br.fmt(gar.data))}</strong>` : ""}.</p>` +
    ((g.exclusoes || []).length ? `<p>A garantia <strong>não</strong> cobre:</p><ul>${(g.exclusoes || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : '<p>A garantia <strong>não</strong> cobre:</p><div class="pauta"><span class="linha"></span><span class="linha"></span></div>') +
    `<p class="aviso">Esta garantia é contratual e soma-se à legal, que existe por lei e não depende deste termo (CDC, art. 24 e 50). O prazo pra reclamar de vício do serviço é de 90 dias contados do término da execução${gar && gar.legal && (!gar.data || br.fmt(gar.legal) !== br.fmt(gar.data)) ? `, ou seja, até <strong>${esc(br.fmt(gar.legal))}</strong>` : ""} (art. 26, II e § 1º); em vício oculto, conta de quando o vício aparece (§ 3º).</p>`
  ));

  if ((spec.observacoes || []).length) {
    S.push(bloco("Observações", `<ul>${(spec.observacoes || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`));
  }

  S.push(bloco("Assinatura na entrada",
    `<p>O cliente confere o equipamento, os acessórios e as avarias descritas acima, e autoriza a avaliação técnica.</p>` +
    `<div class="assinaturas">${assinatura(c.responsavel || c.nome || "Cliente", c.documento ? `CPF/CNPJ ${c.documento}` : "CPF/CNPJ")}${assinatura(n.responsavel || "Responsável pelo atendimento", n.nome || "")}</div>`
  ));

  S.push(bloco("Assinatura na saída",
    `<p>Equipamento retirado em ${sa.data && br.lerData(sa.data) ? `<strong>${esc(br.fmt(br.lerData(sa.data)))}</strong>` : "____/____/________"}, em funcionamento, com os acessórios entregues na entrada.</p>` +
    `<div class="assinaturas">${assinatura(sa.retirado_por || "Quem retirou", sa.documento || "CPF/CNPJ")}${assinatura(n.responsavel || "Responsável pela entrega", n.nome || "")}</div>`
  ));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OS ${esc(numero)} — ${esc(c.nome || n.nome || "ordem de serviço")}</title>
<meta name="description" content="Ordem de serviço ${esc(numero)} de ${esc(n.nome || "")}: equipamento, estado na entrada, orçamento discriminado, garantia e assinaturas.">
<meta name="robots" content="noindex">
<style>${estilo(cor, fonte)}</style>
</head>
<body>
<main>
  <header>
    <div class="marca">${esc(n.nome || "")}<span>${esc([n.documento, n.contato, n.endereco].filter(Boolean).join(" · "))}</span></div>
    <div class="numero"><span>Ordem de serviço</span><strong>${esc(numero)}</strong></div>
  </header>
  <h1>${esc(TIPOS[spec.tipo] || "Ordem de serviço")}</h1>
  ${campos([
    ["Abertura", res.datas.abertura ? `${br.fmt(res.datas.abertura)} (${br.diaSemana(res.datas.abertura)})` : ""],
    ["Prazo combinado", pz ? `${br.fmt(pz.data)}${pz.uteis ? ` — ${pz.uteis} dias úteis` : ""}` : ""],
    ["Status", res.status],
    ["Atendeu", n.responsavel],
  ])}
${S.join("\n")}
  <footer>Base legal: Código de Defesa do Consumidor (Lei 8.078/1990), art. 40 (orçamento discriminado e validade), art. 39, VI (autorização expressa antes de executar), art. 20 (vício do serviço), art. 26 (prazo pra reclamar), art. 24 e 50 (garantia). Duas vias, uma pra cada parte. Guardar por 5 anos.</footer>
</main>
</body>
</html>
`;
}

/** A folha em branco pra imprimir e preencher no balcão, sem computador na mão. */
function branco(nomeNegocio, tokens) {
  const spec = {
    tipo: "", status: "", abertura: "", negocio: { nome: nomeNegocio || "" }, cliente: {}, equipamento: {},
    estado_entrada: {}, defeito_relatado: "", diagnostico: "", servico_executado: "",
    orcamento: { mao_de_obra: [], pecas: [], deslocamento: {} }, pagamento: "",
    garantia: { dias: "", escopo: "", exclusoes: [] }, aprovacao: {}, saida: {}, observacoes: [],
  };
  const res = { status: "", contas: calcular(spec), datas: { abertura: null, prazo: null, validade: null, garantia: null } };
  const doc = html(spec, res, "__________", tokens)
    .replace("<h1>Ordem de serviço</h1>", "<h1>Ordem de serviço — preencher no atendimento</h1>")
    .replace("<footer>", '<footer><strong>Validade do orçamento: 10 dias corridos do recebimento, salvo combinado diferente por escrito (CDC, art. 40, § 1º).</strong> Depois de preencher, lançar no índice: <code>node scripts/ordem-servico.js gerar os/os-&lt;cliente&gt;.json</code>.<br>');
  return doc;
}

// ───────────────────────────── comandos ─────────────────────────────

function lerSpec(arq) {
  if (!arq) morrer("passe o arquivo da OS", "node scripts/ordem-servico.js gerar os/os-padaria.json");
  if (!fs.existsSync(arq)) morrer(`não achei ${curto(arq)}`, "gere um modelo: node scripts/ordem-servico.js exemplo --saida os/os-exemplo.json");
  let spec;
  try { spec = JSON.parse(fs.readFileSync(arq, "utf8").replace(/^﻿/, "")); }
  catch (e) { morrer(`${curto(arq)} não é um JSON válido: ${e.message}`, "conferir vírgula sobrando e aspas não fechadas"); }
  spec._arquivo = arq;
  return spec;
}

function imprimirConferencia(res, titulo) {
  console.log(`\n${titulo}`);
  if (res.faltas.length) {
    console.log(`\n✖ ${res.faltas.length} campo(s) que impedem a OS de sair:`);
    res.faltas.forEach((f) => console.log(`  · ${f}`));
  } else console.log("\n✔ os campos obrigatórios estão preenchidos");
  if (res.avisos.length) {
    console.log(`\n⚠ ${res.avisos.length} aviso(s):`);
    res.avisos.forEach((a) => console.log(`  · ${a}`));
  }
  const c = res.contas, d = res.datas;
  console.log("\nContas:");
  console.log(`  mão de obra ${R(c.mao)} + peças ${R(c.pecas)} + deslocamento ${R(c.deslocamento)}${c.desconto ? ` − desconto ${R(c.desconto)}` : ""} = ${R(c.total)}`);
  console.log(`  margem: ${c.margem ? `${R(c.margem.sobra_total)} sobre o total (${br.pct(c.margem.pct_total)}), peças compradas por ${R(c.margem.custo_pecas)}` : "em branco (custo da peça não informado)"}`);
  if (d.validade) console.log(`  validade do orçamento: ${br.fmt(d.validade.data)} (${d.validade.dias} dias de ${br.fmt(d.validade.base)}${d.validade.motivo ? `, prorrogado: ${br.fmt(d.validade.bruta)} caiu em ${d.validade.motivo}` : ""})`);
  if (d.prazo) console.log(`  prazo combinado: ${br.fmt(d.prazo.data)} (${br.diaSemana(d.prazo.data)})${d.prazo.uteis ? ` — ${d.prazo.uteis} dias úteis da abertura` : ""}`);
  if (d.garantia) console.log(`  garantia: ${d.garantia.dias} dias${d.garantia.data ? ` — até ${br.fmt(d.garantia.data)}` : " (conta da entrega, ainda sem data de saída)"}`);
}

function cmdGerar(o) {
  const arq = o._[1];
  const spec = lerSpec(arq);
  const extras = feriadosDe(o);
  const res = conferir(spec, { feriados: extras });
  const pasta = typeof o.saida === "string" ? o.saida : path.dirname(path.resolve(arq));
  const arqIndice = typeof o.indice === "string" ? o.indice : path.join(pasta, "indice.csv");
  const indice = lerIndice(arqIndice);

  imprimirConferencia(res, `OS de ${(spec.cliente || {}).nome || "cliente sem nome"} — ${curto(path.resolve(arq))}`);
  if (res.faltas.length) {
    console.error("\n✖ nada foi gravado. Preencher os campos acima e rodar de novo.\n");
    process.exit(1);
  }

  const ano = (res.datas.abertura || new Date()).getFullYear();
  let numero = String(spec.numero || "").trim();
  const jaTem = numero ? indice.itens.find((i) => i.numero === numero) : null;
  if (!numero) numero = proximoNumero(indice, ano);
  else if (jaTem && !o.sobrescrever) morrer(`a OS ${numero} já está no índice (${jaTem.arquivo || "sem arquivo"})`, "use --sobrescrever pra regravar, ou apague o campo \"numero\" do JSON pra numerar de novo");

  fs.mkdirSync(pasta, { recursive: true });
  const base = `OS-${numero}`;
  const tokens = typeof o.tokens === "string" && fs.existsSync(o.tokens) ? lerTokens(o.tokens) : {};
  const textoMd = md(spec, res, numero);
  const arquivos = [
    [path.join(pasta, `${base}.md`), textoMd],
    [path.join(pasta, `${base}.html`), html(spec, res, numero, tokens)],
    [path.join(pasta, `${base}-aprovacao.md`), mensagemAprovacao(spec, res, numero)],
  ];
  for (const [p, conteudo] of arquivos) {
    if (fs.existsSync(p) && !o.sobrescrever) morrer(`${curto(p)} já existe`, "use --sobrescrever se for pra regravar");
    fs.writeFileSync(p, conteudo, "utf8");
  }

  const hoje = new Date();
  const antigo = indice.itens.find((x) => x.numero === numero);
  if (antigo && antigo.status && antigo.status !== res.status) {
    console.log(`\n⚠ o índice tinha a OS ${numero} em "${antigo.status}" e o JSON diz "${res.status}": o índice passa a valer o JSON.`);
    console.log(`  Se o certo era "${antigo.status}", corrigir o campo "status" do JSON e rodar de novo com --sobrescrever.`);
  }
  const linha = {
    numero,
    abertura: res.datas.abertura ? br.fmt(res.datas.abertura) : "",
    cliente: (spec.cliente || {}).nome || "",
    equipamento: [(spec.equipamento || {}).descricao, (spec.equipamento || {}).marca, (spec.equipamento || {}).serie].filter(Boolean).join(" "),
    status: res.status,
    validade: res.datas.validade ? br.fmt(res.datas.validade.data) : "",
    prazo: res.datas.prazo ? br.fmt(res.datas.prazo.data) : "",
    total: br.reais(res.contas.total),
    arquivo: curto(path.join(path.resolve(pasta), `${base}.html`)),
    atualizado_em: br.fmt(hoje),
  };
  // A nota é do comando `status`, não do `gerar`: regravar a OS não pode apagar
  // "capacitor pedido, chega dia 25".
  if (!antigo) linha.nota = "";
  const i = indice.itens.findIndex((x) => x.numero === numero);
  if (i >= 0) indice.itens[i] = Object.assign({}, indice.itens[i], linha);
  else indice.itens.push(linha);
  indice.itens.sort((a, b) => String(a.numero).localeCompare(String(b.numero)));
  escreverIndice(arqIndice, indice);

  if (spec.numero !== numero) {
    spec.numero = numero;
    const copia = Object.assign({}, spec);
    delete copia._arquivo;
    fs.writeFileSync(arq, JSON.stringify(copia, null, 2) + "\n", "utf8");
  }

  console.log("\nGravado:");
  arquivos.forEach(([p]) => console.log(`  ${curto(p)}`));
  console.log(`  ${curto(arqIndice)} (${indice.itens.length} OS no índice)`);
  console.log(`\nPróximo passo: imprimir duas vias de ${base}.html e colher a assinatura da entrada antes de abrir o equipamento.\n`);
}

function cmdStatus(o) {
  const numero = o._[1], novo = o._.slice(2).join(" ").trim();
  if (!numero || !novo) morrer("passe o número e o novo status", `node scripts/ordem-servico.js status 2026-0007 "aguardando peça"`);
  if (!STATUS.includes(novo)) morrer(`status "${novo}" não existe`, `use um destes: ${STATUS.join(", ")}`);
  const arqIndice = typeof o.indice === "string" ? o.indice : "os/indice.csv";
  if (!fs.existsSync(arqIndice)) morrer(`não achei ${curto(arqIndice)}`, "gere a primeira OS antes: node scripts/ordem-servico.js gerar <os.json>");
  const indice = lerIndice(arqIndice);
  const it = indice.itens.find((x) => x.numero === numero);
  if (!it) morrer(`a OS ${numero} não está em ${curto(arqIndice)}`, `números no índice: ${indice.itens.map((x) => x.numero).join(", ") || "nenhum"}`);
  const antes = it.status;
  it.status = novo;
  it.atualizado_em = br.fmt(new Date());
  if (typeof o.nota === "string") it.nota = o.nota;
  escreverIndice(arqIndice, indice);
  console.log(`\nOS ${numero} (${it.cliente}): "${antes}" → "${novo}" em ${it.atualizado_em}${it.nota ? ` — ${it.nota}` : ""}\n`);
}

function resumo(indice, opts = {}) {
  const hoje = opts.hoje || new Date();
  const parada = isFinite(opts.parada) ? opts.parada : 7;
  const porStatus = {};
  const vencidas = [], paradas = [], atrasadas = [];
  for (const it of indice.itens) {
    porStatus[it.status || "sem status"] = (porStatus[it.status || "sem status"] || 0) + 1;
    const val = br.lerData(it.validade), atu = br.lerData(it.atualizado_em), pz = br.lerData(it.prazo);
    const aberta = !["concluída", "cancelada"].includes(it.status);
    if (aberta && it.status === "aguardando aprovação" && val && val < hoje) vencidas.push({ numero: it.numero, cliente: it.cliente, validade: it.validade, dias: br.diasEntre(val, hoje) });
    if (aberta && atu && br.diasEntre(atu, hoje) >= parada) paradas.push({ numero: it.numero, cliente: it.cliente, status: it.status, dias: br.diasEntre(atu, hoje), nota: it.nota || "" });
    if (aberta && pz && pz < hoje) atrasadas.push({ numero: it.numero, cliente: it.cliente, prazo: it.prazo, dias: br.diasEntre(pz, hoje) });
  }
  return { total: indice.itens.length, porStatus, vencidas, paradas, atrasadas, hoje, parada };
}

function cmdResumo(o) {
  const arqIndice = typeof o.indice === "string" ? o.indice : "os/indice.csv";
  if (!fs.existsSync(arqIndice)) morrer(`não achei ${curto(arqIndice)}`, "gere a primeira OS antes: node scripts/ordem-servico.js gerar <os.json>");
  const hoje = typeof o.hoje === "string" ? br.lerData(o.hoje) : new Date();
  if (!hoje) morrer(`--hoje "${o.hoje}" não é data válida`, "use DD/MM/AAAA");
  const r = resumo(lerIndice(arqIndice), { hoje, parada: br.numero(o.parada) });
  if (o.json) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(`\n${r.total} OS em ${curto(arqIndice)} — situação em ${br.fmt(hoje)} (${br.diaSemana(hoje)})\n`);
  for (const [s, q] of Object.entries(r.porStatus).sort((a, b) => b[1] - a[1])) console.log(`  ${String(q).padStart(3)} ${s}`);
  const secao = (titulo, lista, linha) => {
    console.log(`\n${titulo}: ${lista.length}`);
    lista.forEach((x) => console.log(`  · ${linha(x)}`));
  };
  secao("Orçamento vencido esperando aprovação", r.vencidas, (x) => `OS ${x.numero} (${x.cliente}) venceu em ${x.validade}, ${x.dias} dias atrás — refazer o orçamento antes de executar`);
  secao("Prazo estourado", r.atrasadas, (x) => `OS ${x.numero} (${x.cliente}) prometida pra ${x.prazo}, ${x.dias} dias atrás`);
  secao(`Sem atualização há ${r.parada} dias ou mais`, r.paradas, (x) => `OS ${x.numero} (${x.cliente}) em "${x.status}" há ${x.dias} dias${x.nota ? ` — ${x.nota}` : ""}`);
  console.log("");
}

function ajuda() {
  console.log(`
Contex OS — ordem-servico.js

  node scripts/ordem-servico.js exemplo [--saida os/os-exemplo.json]
  node scripts/ordem-servico.js conferir <os.json> [--json]
  node scripts/ordem-servico.js gerar <os.json> [--saida pasta] [--indice os/indice.csv] [--tokens identidade/tokens.css] [--sobrescrever]
  node scripts/ordem-servico.js branco [--saida pasta] [--negocio "Nome"] [--tokens identidade/tokens.css]
  node scripts/ordem-servico.js status <numero> <novo status> [--indice os/indice.csv] [--nota "texto"]
  node scripts/ordem-servico.js resumo [--indice os/indice.csv] [--hoje DD/MM/AAAA] [--parada 7] [--json]

Status válidos: ${STATUS.join(", ")}
Tipos válidos: ${Object.keys(TIPOS).join(", ")}
`);
}

function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  if (!cmd || cmd === "ajuda" || o.ajuda) { ajuda(); return; }

  if (cmd === "exemplo") {
    const saida = typeof o.saida === "string" ? o.saida : null;
    const texto = JSON.stringify(EXEMPLO, null, 2) + "\n";
    if (!saida) { console.log(texto); return; }
    if (fs.existsSync(saida) && !o.sobrescrever) morrer(`${curto(saida)} já existe`, "use --sobrescrever ou escolha outro nome");
    fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
    fs.writeFileSync(saida, texto, "utf8");
    console.log(`\nModelo em ${curto(path.resolve(saida))}. Trocar os dados pelos do atendimento e rodar:\n  node scripts/ordem-servico.js conferir ${curto(saida)}\n`);
    return;
  }

  if (cmd === "conferir") {
    const spec = lerSpec(o._[1]);
    const extras = feriadosDe(o);
    const res = conferir(spec, { feriados: extras });
    if (o.json) { console.log(JSON.stringify(res, null, 2)); process.exit(res.faltas.length ? 1 : 0); }
    imprimirConferencia(res, `OS de ${(spec.cliente || {}).nome || "cliente sem nome"} — ${curto(path.resolve(o._[1]))}`);
    console.log(res.faltas.length ? "\n✖ falta preencher pra gerar.\n" : "\n✔ pronta pra gerar.\n");
    process.exit(res.faltas.length ? 1 : 0);
  }

  if (cmd === "gerar") return cmdGerar(o);
  if (cmd === "status") return cmdStatus(o);
  if (cmd === "resumo") return cmdResumo(o);

  if (cmd === "branco") {
    const pasta = typeof o.saida === "string" ? o.saida : "os";
    const tokens = typeof o.tokens === "string" && fs.existsSync(o.tokens) ? lerTokens(o.tokens) : {};
    fs.mkdirSync(pasta, { recursive: true });
    const p = path.join(pasta, "em-branco.html");
    if (fs.existsSync(p) && !o.sobrescrever) morrer(`${curto(p)} já existe`, "use --sobrescrever pra regravar");
    fs.writeFileSync(p, branco(typeof o.negocio === "string" ? o.negocio : "", tokens), "utf8");
    console.log(`\nFolha em branco em ${curto(p)}. Imprimir um bloco de duas vias e deixar no balcão.\n`);
    return;
  }

  morrer(`comando "${cmd}" não existe`, "exemplo, conferir, gerar, branco, status ou resumo");
}

module.exports = {
  calcular, validade, prazoDe, garantiaAte, conferir, md, mensagemAprovacao, html, branco, feriadosDe,
  lerIndice, escreverIndice, proximoNumero, resumo, EXEMPLO, STATUS, TIPOS, CABECALHO,
};

if (require.main === module) main();
