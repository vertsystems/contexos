#!/usr/bin/env node
/**
 * Contex OS — estoque.js
 * Lê o relatório de vendas do PDV no molde (data, sku, qtd, valor) mais os
 * parâmetros de cada item (saldo, lead time, dias de segurança) e escreve a
 * reposição da semana: o que está abaixo do ponto de pedido e quanto comprar,
 * o que encalhou e quanto dinheiro está parado nele, a curva ABC, e a lista do
 * que a conta NÃO decide.
 *
 * Existe porque a média de 90 dias aplicada sem olhar mente em três casos
 * comuns no comércio pequeno: item com duas semanas de vida (a média divide
 * por 90 e manda comprar quase nada), item sazonal (protetor solar em abril),
 * e item que vendeu 40 unidades num pedido único (a média vira 0,44/dia e o
 * saldo parece eterno). Aqui esses três saem da tabela de compra e entram numa
 * lista separada, com o motivo medido. Perecível fica fora da conta por
 * definição: quem manda é a validade, não a cobertura.
 *
 * Uso:
 *   node scripts/estoque.js <vendas.csv|.xlsx> --parametros <parametros.csv|.xlsx> [opções]
 *   node scripts/estoque.js modelo [pasta]        grava os dois arquivos do molde, preenchidos de exemplo
 *   node scripts/estoque.js --ler <arquivo>        mostra o que o script entendeu do arquivo
 *
 * Opções:
 *   --saida <arquivo.md>   grava o markdown em vez de imprimir
 *   --janela <dias>        quantos dias do fim da série entram na média (padrão: 90)
 *   --alvo <dias>          cobertura desejada depois que a compra chegar (padrão: 30)
 *   --encalhado <dias>     cobertura acima da qual o item é encalhe (padrão: 90)
 *   --historico <dias>     histórico mínimo pra confiar na média (padrão: 30)
 *   --hoje DD/MM/AAAA      data de referência (padrão: a última venda do arquivo)
 *   --json                 imprime o resultado em JSON, pra outra ferramenta ler
 *
 * A média diária divide a quantidade vendida pelos dias em que o item esteve à
 * venda dentro da janela (da primeira venda dele até o fim), não pelos 90 dias
 * corridos. Item que entrou há 12 dias tem média de 12 dias, e não uma média
 * dividida por 90 que o faria parecer morto.
 *
 * Molde dos arquivos de entrada (cabeçalho obrigatório, `;` ou `,`):
 *   vendas:     data;sku;qtd;valor          uma linha por venda ou por dia; valor é o total da linha em reais
 *   parametros: sku;saldo;lead_time;dias_seguranca
 *               opcionais: nome, custo, perecivel, multiplo, minimo
 *
 * Node 18+, sem dependência. Usa scripts/br.js (datas, número, moeda, slug) e
 * scripts/gerar-planilha.js (CSV e .xlsx).
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const PADRAO = { janela: 90, alvo: 30, encalhado: 90, historico: 30, diasComVenda: 6, recente: 28 };

// ─────────────────────────── leitura ───────────────────────────

/** UTF-8 quando é UTF-8 válido; senão Windows-1252 (o padrão de exportação de PDV antigo). */
function decodificar(buf) {
  try {
    return { texto: new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, ""), codificacao: "UTF-8" };
  } catch (e) {
    let texto;
    try { texto = new TextDecoder("windows-1252").decode(buf); } catch (e2) { texto = buf.toString("latin1"); }
    return { texto, codificacao: "Windows-1252" };
  }
}

/** Cabeçalho normalizado: sem acento, minúsculo, espaço e pontuação viram "_". */
function chave(s) {
  return br.semAcento(String(s ?? "")).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** "1.234,56", "1234.56", "R$ 12,90", "12" → número. NaN quando não é número. */
function num(s) {
  if (typeof s === "number") return s;
  const t = String(s ?? "").replace(/[R$\s]/g, "").trim();
  if (!t) return NaN;
  return br.numero(t);
}

function matrizDaAba(aba) {
  const linhas = [];
  for (const [ref, cel] of aba.celulas) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    const lin = Number(m[2]);
    if (!linhas[lin - 1]) linhas[lin - 1] = [];
    let v = cel.v;
    if (cel.tipo === "data" && typeof v === "number") {
      const base = new Date(1899, 11, 30);
      v = br.fmt(new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.floor(v)));
    }
    linhas[lin - 1][col - 1] = v === null || v === undefined ? "" : v;
  }
  return linhas.filter((l) => l && l.some((c) => c !== "")).map((l) => Array.from(l, (c) => (c === undefined ? "" : c)));
}

function linhasDe(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  const planilha = require("./gerar-planilha.js");
  if (ext === ".xlsx" || ext === ".xlsm") {
    const { abas } = planilha.lerXlsx(arquivo);
    if (!abas.length) throw new Error("planilha sem aba");
    return { linhas: matrizDaAba(abas[0]), codificacao: "xlsx" };
  }
  const { texto, codificacao } = decodificar(fs.readFileSync(arquivo));
  return { linhas: planilha.parseCsv(texto).linhas, codificacao };
}

const ALIAS_VENDAS = {
  data: ["data", "data_venda", "dia", "emissao", "data_emissao"],
  sku: ["sku", "codigo", "cod", "codigo_do_produto", "referencia"],
  qtd: ["qtd", "quantidade", "qtde", "qte"],
  valor: ["valor", "valor_total", "total", "valor_bruto", "faturamento"],
};
const ALIAS_PARAM = {
  sku: ["sku", "codigo", "cod", "referencia"],
  saldo: ["saldo", "saldo_atual", "estoque", "estoque_atual"],
  lead_time: ["lead_time", "leadtime", "prazo", "prazo_entrega", "prazo_do_fornecedor"],
  dias_seguranca: ["dias_seguranca", "seguranca", "dias_de_seguranca", "margem"],
  nome: ["nome", "descricao", "produto"],
  custo: ["custo", "custo_unitario", "preco_de_custo", "custo_medio"],
  perecivel: ["perecivel", "validade", "vence"],
  multiplo: ["multiplo", "caixa", "embalagem", "fardo"],
  minimo: ["minimo", "pedido_minimo", "minimo_compra"],
};

/** Acha a linha do cabeçalho e o índice de cada coluna do molde. */
function cabecalho(linhas, alias, obrigatorias) {
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const chaves = linhas[i].map(chave);
    const idx = {};
    for (const [campo, nomes] of Object.entries(alias)) {
      const c = chaves.findIndex((k) => nomes.includes(k));
      if (c >= 0) idx[campo] = c;
    }
    if (obrigatorias.every((campo) => idx[campo] !== undefined)) return { linha: i, idx };
  }
  return null;
}

function lerVendas(arquivo) {
  const { linhas, codificacao } = linhasDe(arquivo);
  const cab = cabecalho(linhas, ALIAS_VENDAS, ["data", "sku", "qtd", "valor"]);
  if (!cab) {
    throw new Error(
      "o arquivo não está no molde de vendas: a primeira linha precisa ter as colunas data, sku, qtd e valor\n" +
      `  primeira linha lida: ${(linhas[0] || []).join(" | ").slice(0, 120) || "(vazia)"}\n` +
      "  pra ver o molde preenchido: node scripts/estoque.js modelo dados/"
    );
  }
  const avisos = [];
  const vendas = [];
  let puladas = 0;
  for (let i = cab.linha + 1; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l || !l.some((c) => String(c ?? "").trim() !== "")) continue;
    const data = br.lerData(String(l[cab.idx.data] ?? "").trim().split(/[ T]/)[0]);
    const sku = String(l[cab.idx.sku] ?? "").trim();
    const qtd = num(l[cab.idx.qtd]);
    const valor = num(l[cab.idx.valor]);
    if (!data || !sku || isNaN(qtd)) {
      puladas++;
      if (avisos.length < 3) avisos.push(`linha ${i + 1} sem data, sku ou qtd legível: "${l.join(";").slice(0, 70)}"`);
      continue;
    }
    if (qtd <= 0) { puladas++; if (avisos.length < 3) avisos.push(`linha ${i + 1} com qtd ${qtd}: devolução e estorno não entram na média de venda`); continue; }
    vendas.push({ data, sku, qtd, valor: isNaN(valor) ? 0 : valor, linha: i + 1 });
  }
  if (!vendas.length) throw new Error("nenhuma linha de venda legível depois do cabeçalho");
  if (puladas) avisos.push(`${puladas} linha(s) fora do molde ficaram de fora da conta`);
  return { vendas, avisos, codificacao, cabecalho: cab };
}

function lerParametros(arquivo) {
  const { linhas, codificacao } = linhasDe(arquivo);
  const cab = cabecalho(linhas, ALIAS_PARAM, ["sku", "saldo", "lead_time", "dias_seguranca"]);
  if (!cab) {
    throw new Error(
      "o arquivo não está no molde de parâmetros: a primeira linha precisa ter as colunas sku, saldo, lead_time e dias_seguranca\n" +
      `  primeira linha lida: ${(linhas[0] || []).join(" | ").slice(0, 120) || "(vazia)"}\n` +
      "  pra ver o molde preenchido: node scripts/estoque.js modelo dados/"
    );
  }
  const avisos = [];
  const itens = new Map();
  for (let i = cab.linha + 1; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l || !l.some((c) => String(c ?? "").trim() !== "")) continue;
    const sku = String(l[cab.idx.sku] ?? "").trim();
    const saldo = num(l[cab.idx.saldo]);
    const lead = num(l[cab.idx.lead_time]);
    const seg = num(l[cab.idx.dias_seguranca]);
    if (!sku || isNaN(saldo) || isNaN(lead) || isNaN(seg)) {
      if (avisos.length < 3) avisos.push(`linha ${i + 1} dos parâmetros sem sku, saldo, lead_time ou dias_seguranca: "${l.join(";").slice(0, 70)}"`);
      continue;
    }
    if (saldo < 0) avisos.push(`sku "${sku}" com saldo negativo (${saldo}): o PDV baixou venda sem entrada. Corrigir o saldo antes de comprar por esta página`);
    if (lead < 0 || seg < 0) avisos.push(`sku "${sku}" com prazo ou dias de segurança negativo; tratei como zero`);
    const pega = (campo) => (cab.idx[campo] === undefined ? undefined : l[cab.idx[campo]]);
    const perecivel = /^(s|sim|true|1|x)$/i.test(String(pega("perecivel") ?? "").trim());
    const custo = num(pega("custo"));
    if (itens.has(sku)) avisos.push(`sku "${sku}" aparece mais de uma vez nos parâmetros; usei a última linha`);
    itens.set(sku, {
      sku,
      nome: String(pega("nome") ?? "").trim() || sku,
      saldo, lead: Math.max(0, lead), seg: Math.max(0, seg), perecivel,
      custo: isNaN(custo) ? null : custo,
      multiplo: Math.max(1, Math.round(num(pega("multiplo")) || 1)),
      minimo: Math.max(0, Math.round(num(pega("minimo")) || 0)),
      linha: i + 1,
    });
  }
  if (!itens.size) throw new Error("nenhuma linha de parâmetro legível depois do cabeçalho");
  return { itens, avisos, codificacao, cabecalho: cab };
}

// ─────────────────────────── conta ───────────────────────────

const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** Mediana de uma lista de números. */
function mediana(v) {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * A conta inteira, item por item. Recebe as vendas, os parâmetros e as opções;
 * devolve os grupos já classificados. Nenhuma decisão fica de fora do retorno:
 * o markdown só formata o que sai daqui.
 */
function analisar(vendas, itens, opcoes = {}) {
  const o = { ...PADRAO };
  for (const [k, v] of Object.entries(opcoes)) if (v !== undefined && v !== null) o[k] = v;
  const datas = vendas.map((v) => v.data);
  const ultimaVenda = new Date(Math.max(...datas));
  const primeiraVenda = new Date(Math.min(...datas));
  const fim = o.hoje || ultimaVenda;
  const inicio = new Date(Math.max(br.mais(fim, -(o.janela - 1)).getTime(), primeiraVenda.getTime()));
  const diasJanela = br.diasEntre(inicio, fim) + 1;
  const corte = br.mais(fim, -(o.recente - 1)); // início dos últimos 28 dias

  // histórico global por sku (antes da janela também conta pra saber se o item é novo)
  const hist = new Map();
  for (const v of vendas) {
    const h = hist.get(v.sku) || { primeira: v.data, ultima: v.data };
    if (v.data < h.primeira) h.primeira = v.data;
    if (v.data > h.ultima) h.ultima = v.data;
    hist.set(v.sku, h);
  }

  const naJanela = vendas.filter((v) => v.data >= inicio && v.data <= fim);
  const porSku = new Map();
  for (const v of naJanela) {
    const a = porSku.get(v.sku) || { qtd: 0, receita: 0, dias: new Map(), meses: new Map(), recente: 0, linhas: 0 };
    a.qtd += v.qtd;
    a.receita += v.valor;
    a.linhas++;
    const d = br.iso(v.data);
    a.dias.set(d, (a.dias.get(d) || 0) + v.qtd);
    const m = d.slice(0, 7);
    a.meses.set(m, (a.meses.get(m) || 0) + v.qtd);
    if (v.data >= corte) a.recente += v.qtd;
    porSku.set(v.sku, a);
  }

  const receitaTotal = r2([...porSku.values()].reduce((s, a) => s + a.receita, 0));
  const linhas = [];
  const semParametro = [];

  for (const [sku, a] of porSku) {
    if (!itens.has(sku)) {
      semParametro.push({ sku, qtd: a.qtd, receita: r2(a.receita), ultima: hist.get(sku).ultima });
    }
  }

  for (const item of itens.values()) {
    const a = porSku.get(item.sku) || { qtd: 0, receita: 0, dias: new Map(), meses: new Map(), recente: 0, linhas: 0 };
    const h = hist.get(item.sku);
    const primeiraDoSku = h ? new Date(Math.max(h.primeira.getTime(), inicio.getTime())) : inicio;
    const diasBase = h ? br.diasEntre(primeiraDoSku, fim) + 1 : diasJanela;
    const historico = h ? br.diasEntre(h.primeira, fim) + 1 : 0;
    const media = a.qtd > 0 ? r3(a.qtd / diasBase) : 0;
    const seguranca = r2(media * item.seg);
    const pontoPedido = r2(media * item.lead + seguranca);
    const cobertura = media > 0 ? r2(item.saldo / media) : null;
    const diasComVenda = a.dias.size;
    const maiorDia = Math.max(0, ...a.dias.values());
    const custoUnit = item.custo !== null ? item.custo : (a.qtd > 0 ? r2(a.receita / a.qtd) : null);
    const valorParado = custoUnit !== null ? r2(item.saldo * custoUnit) : null;
    const giro = item.saldo > 0 && a.qtd > 0 ? r2((a.qtd / diasJanela) * 365 / item.saldo) : null;

    // ── por que a média pode não descrever nada ──
    const motivos = [];
    if (!h) motivos.push(item.saldo > 0 ? `sem nenhuma venda no arquivo e ${item.saldo} un em estoque` : "sem venda e sem saldo: o item saiu de linha ou o sku mudou");
    else if (historico < o.historico) motivos.push(`só ${historico} dias de histórico (primeira venda em ${br.fmt(h.primeira)}); o mínimo pra média é ${o.historico}`);
    if (h && a.qtd > 0 && diasComVenda < o.diasComVenda) motivos.push(`vendeu em ${diasComVenda} dia(s) da janela: isso é evento, não ritmo`);
    if (h && a.qtd >= 5 && maiorDia / a.qtd > 0.5) motivos.push(`${Math.round((maiorDia / a.qtd) * 100)}% do volume saiu num único dia (pedido grande ou atacado)`);
    if (h && a.qtd >= 5 && diasJanela >= o.recente * 2) {
      const diasAntes = diasJanela - o.recente;
      const mAntes = r3((a.qtd - a.recente) / diasAntes);
      const mRecente = r3(a.recente / o.recente);
      if (mAntes > 0 && (mRecente >= mAntes * 2 || mRecente <= mAntes * 0.5)) {
        motivos.push(`ritmo virou: ${mRecente.toString().replace(".", ",")} un/dia nos últimos ${o.recente} dias contra ${mAntes.toString().replace(".", ",")} un/dia antes`);
      }
    }
    if (h && a.meses.size >= 3 && a.qtd >= 12) {
      const porMes = [...a.meses.values()];
      const med = mediana(porMes);
      const maior = Math.max(...porMes);
      // o piso de 4 un no mês de pico evita chamar de sazonalidade o que é ruído:
      // 2 un contra mediana de 1 un dobra em percentual e não significa nada
      if (med > 0 && maior >= med * 2 && maior >= 4) {
        const mesPico = [...a.meses.entries()].sort((x, y) => y[1] - x[1])[0];
        motivos.push(`concentração por mês: ${mesPico[0]} vendeu ${mesPico[1]} un contra mediana de ${med} un/mês (sazonalidade)`);
      }
    }

    const l = {
      ...item, qtd: a.qtd, receita: r2(a.receita), diasBase, historico, diasComVenda,
      media, seguranca, pontoPedido, cobertura, giro, custoUnit,
      custoInformado: item.custo !== null, valorParado, motivos,
      ultimaVenda: h ? h.ultima : null,
      diasSemVender: h ? br.diasEntre(h.ultima, fim) : null,
      abaixoDoPonto: media > 0 && item.saldo <= pontoPedido,
    };
    // quanto comprar pra cobrir lead time + segurança + a cobertura alvo
    const bruto = media * (item.lead + item.seg + o.alvo) - item.saldo;
    let comprar = Math.max(0, Math.ceil(bruto));
    if (comprar > 0) {
      if (comprar < item.minimo) comprar = item.minimo;
      if (item.multiplo > 1) comprar = Math.ceil(comprar / item.multiplo) * item.multiplo;
    }
    l.comprar = comprar;
    l.custoCompra = custoUnit !== null ? r2(comprar * custoUnit) : null;
    linhas.push(l);
  }

  // ── curva ABC pela receita da janela ──
  // entra todo SKU que vendeu, inclusive o que não tem parâmetro: ABC é receita, não reposição
  const comVenda = [...linhas, ...semParametro].filter((l) => l.receita > 0).sort((a, b) => b.receita - a.receita);
  let acumulado = 0;
  for (const l of comVenda) {
    const antes = receitaTotal > 0 ? (acumulado / receitaTotal) * 100 : 0;
    acumulado += l.receita;
    const pct = receitaTotal > 0 ? (acumulado / receitaTotal) * 100 : 0;
    // o item que cruza a fronteira fica na classe de cima: com 1 SKU a curva não pode dar C
    l.classe = antes < 80 ? "A" : antes < 95 ? "B" : "C";
    l.pctReceita = receitaTotal > 0 ? r2((l.receita / receitaTotal) * 100) : 0;
    l.pctAcumulado = r2(pct);
  }
  for (const l of linhas) if (!l.classe) { l.classe = "sem venda"; l.pctReceita = 0; }

  // a ordem de classificação importa: perecível sai primeiro, depois o que não
  // vendeu nada (isso é encalhe, não falta de histórico), e só então a média decide
  const pereciveis = linhas.filter((l) => l.perecivel);
  const restante = linhas.filter((l) => !l.perecivel);
  const paradoSemVenda = restante.filter((l) => l.saldo > 0 && l.media === 0);
  const comMedia = restante.filter((l) => !paradoSemVenda.includes(l));
  const naoConfiavel = comMedia.filter((l) => l.motivos.length);
  for (const l of naoConfiavel) l.mediaFraca = true;   // marca só quem tem média medida e fraca
  const confiavel = comMedia.filter((l) => !l.motivos.length);
  const comprarAgora = confiavel.filter((l) => l.abaixoDoPonto && l.comprar > 0).sort((a, b) => (a.cobertura ?? 0) - (b.cobertura ?? 0));
  // encalhe é classificação, não ordem de compra: entra todo item cuja cobertura
  // passa do corte, inclusive o de média fraca. Se olhasse só o confiável, o maior
  // dinheiro parado da loja (item de giro baixo) desapareceria desta seção.
  const encalheLento = comMedia.filter((l) => l.saldo > 0 && l.cobertura !== null && l.cobertura > o.encalhado);
  const encalhado = [...paradoSemVenda, ...encalheLento].sort((a, b) => (b.valorParado ?? 0) - (a.valorParado ?? 0));
  const emOrdem = confiavel.filter((l) => !comprarAgora.includes(l) && !encalheLento.includes(l));

  return {
    opcoes: o,
    periodo: { inicio, fim, diasJanela, primeiraVenda, ultimaVenda, linhasNaJanela: naJanela.length },
    receitaTotal, linhas, comprarAgora, encalhado, emOrdem, naoConfiavel, pereciveis, semParametro,
    abc: ["A", "B", "C"].map((c) => {
      const g = comVenda.filter((l) => l.classe === c);
      return { classe: c, skus: g.length, receita: r2(g.reduce((s, l) => s + l.receita, 0)), itens: g.map((l) => l.sku) };
    }),
  };
}

// ─────────────────────────── markdown ───────────────────────────

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const n1 = (x) => (x === null || x === undefined ? "—" : String(x).replace(".", ","));
const dias = (x) => (x === null ? "sem venda" : x === 0 ? "acabou" : x < 10 ? `${x.toFixed(1).replace(".", ",")} dias` : `${Math.round(x)} dias`);
const money = (x) => (x === null || x === undefined ? "[a confirmar]" : br.reais(x));

function markdown(res, ctx) {
  const o = res.opcoes;
  const p = res.periodo;
  const L = [];
  const compra = r2(res.comprarAgora.reduce((s, l) => s + (l.custoCompra || 0), 0));
  const parado = r2(res.encalhado.reduce((s, l) => s + (l.valorParado || 0), 0));
  const unidades = res.comprarAgora.reduce((s, l) => s + l.comprar, 0);
  const semCustoComVenda = res.linhas.filter((l) => !l.custoInformado && l.custoUnit !== null).length;
  const semPrecoNenhum = res.linhas.filter((l) => !l.custoInformado && l.custoUnit === null && l.saldo > 0).length;

  L.push(`# Reposição — semana de ${br.fmt(p.fim)}`, "");
  L.push(`> Vendas: \`${ctx.vendasNome}\` · parâmetros: \`${ctx.parametrosNome}\``);
  L.push(`> Janela lida: ${br.fmt(p.inicio)} a ${br.fmt(p.fim)} (${p.diasJanela} dias). Cobertura alvo depois da compra: ${o.alvo} dias. Encalhe acima de ${o.encalhado} dias de cobertura.`);
  L.push(`> Gerado por \`scripts/estoque.js\` em ${br.fmt(ctx.hoje)}. Saldo é o que o arquivo de parâmetros informou, não uma contagem física.`, "");

  L.push("## A semana em uma frase", "");
  L.push("[o assistente escreve duas ou três linhas: o que comprar hoje, o que está preso na prateleira, e a decisão que o dono precisa tomar]", "");

  L.push("## Métrica da semana", "");
  L.push("| Métrica | Valor |", "|---|---|");
  L.push(`| Itens abaixo do ponto de pedido | ${res.comprarAgora.length} |`);
  L.push(`| Compra da semana | ${money(compra)} em ${unidades} un |`);
  L.push(`| Itens encalhados | ${res.encalhado.length} |`);
  L.push(`| Dinheiro parado no encalhe | ${money(parado)} |`);
  L.push(`| Itens que a conta não decide | ${res.naoConfiavel.length} |`);
  L.push(`| Perecíveis fora da conta | ${res.pereciveis.length} |`);
  L.push(`| Receita da janela | ${br.reais(res.receitaTotal)} |`, "");

  L.push("## Comprar essa semana", "");
  if (res.comprarAgora.length) {
    L.push("| Item | SKU | Classe | Saldo | Média/dia | Ponto de pedido | Acaba em | Comprar (un) | Custo da compra |", "|---|---|---|---|---|---|---|---|---|");
    for (const l of res.comprarAgora) {
      L.push(`| ${esc(l.nome)} | ${esc(l.sku)} | ${l.classe} | ${l.saldo} | ${n1(l.media)} | ${n1(l.pontoPedido)} | ${dias(l.cobertura)} | ${l.comprar} | ${money(l.custoCompra)} |`);
    }
    L.push("", `Cada linha tem saldo igual ou abaixo do ponto de pedido. A quantidade cobre o prazo do fornecedor, os dias de segurança e mais ${o.alvo} dias de venda no ritmo medido. A compra da semana pede ${money(compra)} em ${unidades} unidades. É o pedido de hoje.`, "");
  } else {
    L.push("Nenhum item confiável está abaixo do ponto de pedido na janela lida.", "");
  }

  L.push("## A conta não decide estes", "");
  if (res.naoConfiavel.length) {
    L.push("| Item | SKU | Saldo | Vendeu na janela | Por que a média não vale | O que fazer |", "|---|---|---|---|---|---|");
    for (const l of res.naoConfiavel) {
      L.push(`| ${esc(l.nome)} | ${esc(l.sku)} | ${l.saldo} | ${l.qtd} un em ${l.diasComVenda} dia(s), ${l.historico || 0} dias de histórico | ${esc(l.motivos.join("; "))} | [o assistente pergunta ao dono] |`);
    }
    L.push("", "Média aplicada em item novo, em item sazonal ou em item de pedido único inventa um ritmo que não existe. Aqui a decisão volta pro dono, com o número medido do lado. Pergunte antes de pedir.", "");
  } else {
    L.push("Todos os itens com parâmetro têm histórico e ritmo que sustentam a média.", "");
  }

  L.push("## Dinheiro parado", "");
  if (res.encalhado.length) {
    L.push("| Item | SKU | Classe | Saldo | Dias sem vender | Cobertura | Custo unitário | Parado em reais |", "|---|---|---|---|---|---|---|---|");
    for (const l of res.encalhado) {
      L.push(`| ${esc(l.nome)} | ${esc(l.sku)} | ${l.classe} | ${l.saldo} | ${l.diasSemVender === null ? "nunca vendeu" : l.diasSemVender === 0 ? "vendeu hoje" : l.diasSemVender} | ${dias(l.cobertura)}${l.mediaFraca ? " (média fraca)" : ""} | ${money(l.custoUnit)}${!l.custoInformado && l.custoUnit !== null ? " (preço de venda)" : ""} | ${money(l.valorParado)} |`);
    }
    L.push("", `São ${money(parado)} na prateleira em vez de no caixa. Saída possível: promoção, combo, devolução ao fornecedor, ou simplesmente parar de comprar. Quem escolhe é o dono; o número é este. Parado é caro.`);
    if (res.encalhado.some((l) => l.mediaFraca)) L.push("", "Item marcado com \"média fraca\" também aparece em \"a conta não decide\": o saldo dele passa do corte de cobertura, mas o ritmo medido é pouco pra cravar quanto tempo aquilo dura.");
    L.push("");
  } else {
    L.push(`Nenhum item confiável passa de ${o.encalhado} dias de cobertura.`, "");
  }

  if (res.pereciveis.length) {
    L.push("## Perecível (fora da conta)", "");
    L.push("| Item | SKU | Saldo | Média/dia | Cobertura pela venda | Quem decide |", "|---|---|---|---|---|---|");
    for (const l of res.pereciveis) {
      L.push(`| ${esc(l.nome)} | ${esc(l.sku)} | ${l.saldo} | ${n1(l.media)} | ${dias(l.cobertura)} | validade e lote, não cobertura |`);
    }
    L.push("", "Perecível não se repõe por ponto de pedido: se repõe por validade, lote e frequência de entrega. A cobertura acima é pista, nunca ordem de compra.", "");
  }

  if (res.emOrdem.length) {
    L.push("## Em ordem (acima do ponto de pedido)", "");
    L.push("| Item | SKU | Classe | Saldo | Média/dia | Acaba em | Giro (vezes/ano) |", "|---|---|---|---|---|---|---|");
    for (const l of res.emOrdem.sort((a, b) => (a.cobertura ?? 1e9) - (b.cobertura ?? 1e9))) {
      L.push(`| ${esc(l.nome)} | ${esc(l.sku)} | ${l.classe} | ${l.saldo} | ${n1(l.media)} | ${dias(l.cobertura)} | ${n1(l.giro)} |`);
    }
    L.push("");
  }

  if (res.semParametro.length) {
    L.push("## Vendeu e não tem parâmetro", "");
    L.push("| SKU | Classe | Vendeu na janela | Receita | Última venda |", "|---|---|---|---|---|");
    for (const x of res.semParametro.sort((a, b) => b.receita - a.receita)) {
      L.push(`| ${esc(x.sku)} | ${x.classe || "sem venda"} | ${x.qtd} un | ${br.reais(x.receita)} | ${br.fmt(x.ultima)} |`);
    }
    L.push("", "Sem saldo, prazo do fornecedor e dias de segurança não existe ponto de pedido pra esses. Completar o arquivo de parâmetros e rodar de novo.", "");
  }

  L.push("## Como as contas foram feitas", "");
  const ex = res.comprarAgora[0] || res.emOrdem[0] || res.linhas.find((l) => l.media > 0) || res.linhas[0];
  if (ex) {
    // o bruto aparece separado do arredondado: mostrar "4 × 42 − 18 = 156" seria
    // uma conta que não fecha na calculadora do dono, e é ele quem confere
    const bruto = r2(ex.media * (ex.lead + ex.seg + o.alvo) - ex.saldo);
    const ajustes = [];
    if (bruto > 0 && Math.ceil(bruto) < ex.minimo) ajustes.push(`pedido mínimo de ${ex.minimo} un`);
    if (bruto > 0 && ex.multiplo > 1) ajustes.push(`múltiplo de ${ex.multiplo} un`);
    L.push(`Exemplo com \`${ex.sku}\`; os mesmos passos valem pra todos:`, "");
    L.push("```");
    L.push(`média diária    ${ex.qtd} un vendidas ÷ ${ex.diasBase} dias à venda na janela = ${n1(ex.media)} un/dia`);
    L.push(`segurança       ${n1(ex.media)} un/dia × ${ex.seg} dias = ${n1(ex.seguranca)} un`);
    L.push(`ponto de pedido ${n1(ex.media)} un/dia × ${ex.lead} dias de prazo + ${n1(ex.seguranca)} un = ${n1(ex.pontoPedido)} un`);
    L.push(ex.media > 0
      ? `acaba em        saldo ${ex.saldo} ÷ ${n1(ex.media)} un/dia = ${n1(ex.cobertura)} dias`
      : `acaba em        sem venda na janela: não há média pra dividir o saldo ${ex.saldo}`);
    L.push(`comprar         ${n1(ex.media)} × (${ex.lead} + ${ex.seg} + ${o.alvo}) − ${ex.saldo} = ${n1(bruto)} un` +
      (bruto <= 0 ? ` → 0 un (o saldo já cobre a janela)` : ajustes.length ? ` → ${ex.comprar} un (${ajustes.join(" e ")})` : ""));
    L.push(ex.giro !== null
      ? `giro            ${ex.qtd} un ÷ ${p.diasJanela} dias × 365 ÷ saldo ${ex.saldo} = ${n1(ex.giro)} vezes/ano`
      : `giro            sem saldo ou sem venda na janela: não dá pra anualizar`);
    L.push("```", "");
    L.push("A média divide pelos dias em que o item esteve à venda dentro da janela, não pelos "
      + `${p.diasJanela} dias corridos: item que entrou no mês passado não pode ser dividido por três meses. `
      + "O giro é o único número que usa a janela inteira, porque ele mede quantas vezes o saldo de hoje "
      + "circularia num ano nesse ritmo.", "");
  }
  L.push(`Refazer: \`node scripts/estoque.js ${ctx.vendasNome} --parametros ${ctx.parametrosNome} --janela ${o.janela} --alvo ${o.alvo}\`. O método e as fontes estão em \`templates/operacao/estoque.md\`.`, "");
  if (semCustoComVenda) L.push(`Atenção: ${semCustoComVenda} item(ns) sem a coluna \`custo\` nos parâmetros. Pra eles o valor parado saiu pelo preço médio de venda, que é maior que o custo, então a conta em reais fica inflada até o custo entrar (quem produz tira o custo no \`/ficha-tecnica\`).`, "");
  if (semPrecoNenhum) L.push(`Atenção: ${semPrecoNenhum} item(ns) com saldo, sem custo e sem venda na janela. Pra esses o dinheiro parado aparece como \`[a confirmar]\`: não existe custo nem preço de onde tirar o valor. Preencher a coluna \`custo\` resolve.`, "");
  if (ctx.avisos.length) L.push("## Avisos da leitura", "", ...ctx.avisos.map((a) => `- ${a}`), "");

  L.push("## Curva ABC (pela receita da janela)", "");
  L.push("| Classe | SKUs | Receita | % da receita |", "|---|---|---|---|");
  for (const g of res.abc) {
    const pct = res.receitaTotal > 0 ? r2((g.receita / res.receitaTotal) * 100) : 0;
    L.push(`| ${g.classe} | ${g.skus} | ${br.reais(g.receita)} | ${n1(pct)}% |`);
  }
  L.push(`| Total | ${res.abc.reduce((s, g) => s + g.skus, 0)} | ${br.reais(r2(res.abc.reduce((s, g) => s + g.receita, 0)))} | 100% |`);
  const classeA = res.abc[0].itens;
  L.push("", classeA.length
    ? `Classe A: ${classeA.map((s) => `\`${s}\``).join(", ")}. São os que pagam a conta: contagem semanal e ruptura zero. Classe C aceita faltar sem drama.`
    : "A janela não teve receita: sem venda não existe curva.", "");
  return L.join("\n");
}

// ─────────────────────────── molde ───────────────────────────

// iguais aos de templates/operacao/estoque-vendas.csv e estoque-parametros.csv:
// o exemplo precisa ter um perecível, que é o caso que sai da conta
const MOLDE_VENDAS = `data;sku;qtd;valor
01/07/2026;CAF-500;3;89,70
01/07/2026;SAB-90;5;24,50
02/07/2026;CAF-500;2;59,80
02/07/2026;LEI-1L;10;54,90
03/07/2026;SAB-90;2;9,80
`;
const MOLDE_PARAMETROS = `sku;nome;saldo;custo;lead_time;dias_seguranca;perecivel;multiplo;minimo
CAF-500;Café torrado 500g;18;17,90;7;5;nao;12;12
SAB-90;Sabonete 90g;40;2,10;10;5;nao;24;0
LEI-1L;Leite integral 1L;36;3,20;3;2;sim;12;0
`;

function gravarModelo(pasta) {
  fs.mkdirSync(pasta, { recursive: true });
  const a = path.join(pasta, "vendas.csv");
  const b = path.join(pasta, "parametros.csv");
  fs.writeFileSync(a, MOLDE_VENDAS);
  fs.writeFileSync(b, MOLDE_PARAMETROS);
  console.log(`✔ ${a}\n✔ ${b}\n\n  Exportar o relatório de vendas do PDV e ajustar o cabeçalho ao molde.`);
  console.log(`  Depois: node scripts/estoque.js ${a} --parametros ${b} --saida estoque/reposicao.md`);
}

// ─────────────────────────── CLI ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function argumentos(argv) {
  const a = { posicionais: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const prox = () => { if (argv[i + 1] === undefined) morrer(`a opção ${x} precisa de um valor`); return argv[++i]; };
    if (x === "--parametros" || x === "--parametro") a.parametros = prox();
    else if (x === "--saida") a.saida = prox();
    else if (x === "--janela") a.janela = Number(prox());
    else if (x === "--alvo") a.alvo = Number(prox());
    else if (x === "--encalhado") a.encalhado = Number(prox());
    else if (x === "--historico") a.historico = Number(prox());
    else if (x === "--hoje") a.hoje = prox();
    else if (x === "--json") a.json = true;
    else if (x === "--ler") a.ler = true;
    else if (x.startsWith("--")) morrer(`opção desconhecida: ${x}`, "node scripts/estoque.js --help mostra as opções");
    else a.posicionais.push(x);
  }
  return a;
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    console.log(fs.readFileSync(__filename, "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ""));
    process.exit(argv.length ? 0 : 1);
  }
  const a = argumentos(argv);

  if (a.posicionais[0] === "modelo") return gravarModelo(a.posicionais[1] || "dados");

  const vendasArq = a.posicionais[0];
  if (!vendasArq) morrer("falta o arquivo de vendas", "node scripts/estoque.js dados/vendas.csv --parametros dados/parametros.csv");
  if (!fs.existsSync(vendasArq)) morrer(`não achei ${vendasArq}`);

  if (a.ler) {
    // tenta ler como vendas; se não for, tenta como parâmetros
    try {
      const v = lerVendas(vendasArq);
      const porSku = new Map();
      for (const x of v.vendas) porSku.set(x.sku, (porSku.get(x.sku) || 0) + x.qtd);
      console.log(`\nVENDAS: ${vendasArq} (${v.codificacao}) — ${v.vendas.length} linhas, ${porSku.size} SKUs`);
      console.log(`Período: ${br.fmt(new Date(Math.min(...v.vendas.map((x) => x.data))))} a ${br.fmt(new Date(Math.max(...v.vendas.map((x) => x.data))))}`);
      for (const [sku, q] of [...porSku].sort((x, y) => y[1] - x[1])) console.log(`  ${sku}: ${q} un`);
      for (const av of v.avisos) console.log(`  aviso: ${av}`);
      return;
    } catch (e1) {
      try {
        const p = lerParametros(vendasArq);
        console.log(`\nPARÂMETROS: ${vendasArq} (${p.codificacao}) — ${p.itens.size} itens`);
        for (const i of p.itens.values()) console.log(`  ${i.sku} (${i.nome}): saldo ${i.saldo}, prazo ${i.lead}d, segurança ${i.seg}d${i.perecivel ? ", perecível" : ""}${i.custo !== null ? `, custo ${br.reais(i.custo)}` : ", sem custo"}`);
        for (const av of p.avisos) console.log(`  aviso: ${av}`);
        return;
      } catch (e2) { morrer(`${vendasArq} não está em nenhum dos dois moldes.\n  como vendas: ${e1.message}\n  como parâmetros: ${e2.message}`); }
    }
  }

  if (!a.parametros) morrer("falta o arquivo de parâmetros", "passe --parametros <arquivo> com sku, saldo, lead_time e dias_seguranca; pra criar o molde: node scripts/estoque.js modelo dados/");
  if (!fs.existsSync(a.parametros)) morrer(`não achei ${a.parametros}`);
  for (const [nome, v] of [["--janela", a.janela], ["--alvo", a.alvo], ["--encalhado", a.encalhado], ["--historico", a.historico]]) {
    if (v !== undefined && (!Number.isInteger(v) || v < 1 || v > 3650)) morrer(`${nome} precisa ser um inteiro de dias entre 1 e 3650, veio "${v}"`);
  }
  let hoje;
  if (a.hoje) { hoje = br.lerData(a.hoje); if (!hoje) morrer(`--hoje precisa ser DD/MM/AAAA ou AAAA-MM-DD, veio "${a.hoje}"`); }

  let v, p;
  try { v = lerVendas(vendasArq); } catch (e) { morrer(`arquivo de vendas recusado: ${e.message}`); }
  try { p = lerParametros(a.parametros); } catch (e) { morrer(`arquivo de parâmetros recusado: ${e.message}`); }

  const res = analisar(v.vendas, p.itens, { janela: a.janela, alvo: a.alvo, encalhado: a.encalhado, historico: a.historico, hoje });
  const avisos = [...v.avisos, ...p.avisos];
  if (res.periodo.fim < res.periodo.ultimaVenda) avisos.push(`a data de referência (${br.fmt(res.periodo.fim)}) é anterior à última venda do arquivo (${br.fmt(res.periodo.ultimaVenda)}): vendas depois dela ficaram fora`);
  const vaoDepois = br.diasEntre(res.periodo.ultimaVenda, res.periodo.fim);
  if (vaoDepois > 7) avisos.push(`a data de referência (${br.fmt(res.periodo.fim)}) é ${vaoDepois} dias depois da última venda do arquivo: a janela pega dias sem venda nenhuma e toda média cai por causa disso`);
  if (!res.periodo.linhasNaJanela) avisos.push(`NENHUMA venda caiu dentro da janela lida (${br.fmt(res.periodo.inicio)} a ${br.fmt(res.periodo.fim)}): a página está dizendo que tudo encalhou porque não tem venda pra comparar, não porque o estoque parou. Conferir --hoje e --janela antes de usar qualquer número daqui`);
  const desatualizado = br.diasEntre(res.periodo.ultimaVenda, br.mais(new Date(), 0));
  if (desatualizado > 7) avisos.push(`a última venda do arquivo é de ${br.fmt(res.periodo.ultimaVenda)}, ${desatualizado} dias atrás: exportar o relatório de novo antes de comprar`);
  if (res.periodo.diasJanela < 30) avisos.push(`a janela tem só ${res.periodo.diasJanela} dias: média diária daqui descreve pouco, e nenhum item deveria virar compra sem o dono olhar`);

  if (a.json) {
    const limpa = (l) => ({ ...l, ultimaVenda: l.ultimaVenda ? br.iso(l.ultimaVenda) : null });
    // custoInformado = o custo veio da coluna `custo`; false quer dizer que o
    // valor em reais daquele item saiu do preço médio de venda
    console.log(JSON.stringify({
      periodo: { inicio: br.iso(res.periodo.inicio), fim: br.iso(res.periodo.fim), diasJanela: res.periodo.diasJanela },
      opcoes: { ...res.opcoes, hoje: undefined },
      receitaTotal: res.receitaTotal,
      comprarAgora: res.comprarAgora.map(limpa), encalhado: res.encalhado.map(limpa), emOrdem: res.emOrdem.map(limpa),
      naoConfiavel: res.naoConfiavel.map(limpa), pereciveis: res.pereciveis.map(limpa),
      semParametro: res.semParametro.map((x) => ({ ...x, ultima: br.iso(x.ultima) })),
      abc: res.abc, avisos,
    }, null, 2));
    return;
  }

  const md = markdown(res, {
    vendasNome: vendasArq, parametrosNome: a.parametros, hoje: new Date(), avisos,
  });
  if (a.saida) {
    fs.mkdirSync(path.dirname(path.resolve(a.saida)), { recursive: true });
    fs.writeFileSync(a.saida, md.endsWith("\n") ? md : md + "\n");
    console.log(`✔ ${a.saida}: ${res.comprarAgora.length} pra comprar, ${res.encalhado.length} encalhado(s), ${res.naoConfiavel.length} não confiável(is), ${res.pereciveis.length} perecível(is) fora da conta.`);
    for (const av of avisos) console.log(`  aviso: ${av}`);
  } else console.log(md);
}

module.exports = { chave, num, lerVendas, lerParametros, analisar, markdown, mediana, MOLDE_VENDAS, MOLDE_PARAMETROS };

if (require.main === module) main();
