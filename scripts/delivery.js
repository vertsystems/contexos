#!/usr/bin/env node
/**
 * Contex OS — delivery.js
 * Calcula a margem real de cada item em cada canal de venda por aplicativo
 * (iFood, Rappi, 99Food, WhatsApp direto, retirada no balcão), descontando
 * comissão do plano, taxa de pagamento online, cupom bancado pela loja,
 * embalagem de entrega, entrega paga pela loja e mensalidade rateada por item.
 * Devolve o preço que bate a meta de lucro em cada canal, o desconto máximo que
 * cabe numa promoção sem prejuízo, e a decisão por item: tirar do app,
 * precificar diferente, empurrar pra venda direta ou promover.
 *
 * Existe porque o extrato do marketplace mostra o repasse e nunca a margem. O
 * dono vê "entrou R$ 32,90" no cardápio e "caiu R$ 24,40" na conta, e não sabe
 * qual dos dois números pagou a marmita. A comissão é só o começo: a taxa de
 * pagamento online, o cupom que ele mesmo bancou, a sacola térmica e a
 * mensalidade do plano entram depois, e é a soma delas que transforma o item
 * mais vendido no que mais dá prejuízo.
 *
 * Nenhuma taxa é fixa aqui. Toda porcentagem vem da spec, que o usuário
 * preenche com o que o contrato dele diz. Plano muda, taxa muda, promoção da
 * plataforma muda; a conta é a mesma.
 *
 * Uso:
 *   node scripts/delivery.js <spec.json>                gera o .md e o .xlsx ao lado da spec
 *   node scripts/delivery.js <spec.json> --simular "iFood Entrega:comissao_pct=27" [--simular "iFood Entrega:cupom_pct=15"]
 *                                                       roda tudo com o canal alterado, sem tocar nos arquivos
 *   node scripts/delivery.js --exemplo [arquivo.json]   escreve uma spec de exemplo pra editar
 *
 * Opções:
 *   --saida <pasta>     onde gravar (padrão: a pasta da spec)
 *   --json              imprime o resultado em JSON em vez do resumo
 *   --so-md             não gera a planilha
 *   --silencioso        só imprime erro
 *
 * A spec: { "negocio", "mes", "despesas_pct", "lucro_alvo_pct", "canais": [...],
 * "itens": [...] }. Campo a campo em templates/financeiro/delivery.md. Toda
 * função de cálculo está exportada (module.exports) pra ser reproduzida por
 * comando.
 *
 * Node 18+, sem dependência de npm. Usa ./br.js e ./gerar-planilha.js.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const br = require("./br.js");
const planilha = require("./gerar-planilha.js");

// ─────────────────────────── utilidades ───────────────────────────

class ErroDelivery extends Error {}

let SILENCIOSO = false;
function dizer(msg) { if (!SILENCIOSO) console.log(msg); }

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function R(v) { return br.reais(v); }
function P(v) { return `${br.numero(v * 100).toFixed(1).replace(".", ",")}%`; }

function num(v, campo, onde) {
  const n = br.numero(v);
  if (!Number.isFinite(n)) throw new ErroDelivery(`${onde}: "${campo}" precisa ser número (veio ${JSON.stringify(v)})`);
  return n;
}

/** Aceita 23, "23%" ou 0,23. Acima de 1 é porcentagem; até 1 é fração. */
function pct(v, campo, onde, padrao = 0) {
  if (v === undefined || v === null || v === "") return padrao;
  let n = num(v, campo, onde);
  if (n > 1) n = n / 100;
  if (n < 0) throw new ErroDelivery(`${onde}: "${campo}" não pode ser negativo`);
  return n;
}

function dinheiro(v, campo, onde, padrao = 0) {
  if (v === undefined || v === null || v === "") return padrao;
  const n = num(v, campo, onde);
  if (n < 0) throw new ErroDelivery(`${onde}: "${campo}" não pode ser negativo`);
  return n;
}

/** Acha o canal pelo nome exato, ou por pedaço do nome sem acento. */
function acharCanal(canais, alvo) {
  const s = br.slug(String(alvo || ""));
  if (!s) return null;
  const exato = canais.find((c) => br.slug(c.nome) === s);
  if (exato) return exato;
  const parciais = canais.filter((c) => br.slug(c.nome).includes(s));
  if (parciais.length === 1) return parciais[0];
  if (parciais.length > 1) throw new ErroDelivery(`"${alvo}" casa com ${parciais.length} canais: ${parciais.map((c) => c.nome).join(", ")}`);
  return null;
}

// ─────────────────────────── leitura da spec ───────────────────────────

const CAMPOS_CANAL = [
  "nome", "comissao_pct", "taxa_pagamento_pct", "mensalidade", "entrega_loja",
  "embalagem_extra", "cupom_pct", "cupom_valor", "comissao_sobre", "pedidos_mes",
  "itens_por_pedido", "despesas_pct", "direto", "fonte", "conferido_em",
];

function lerCanal(c, i, geral) {
  const onde = `canal ${c && c.nome ? `"${c.nome}"` : `#${i + 1}`}`;
  if (!c || typeof c !== "object") throw new ErroDelivery(`${onde}: cada canal é um objeto`);
  if (!c.nome || !String(c.nome).trim()) throw new ErroDelivery(`${onde}: falta "nome" (ex: "iFood — Plano Entrega")`);
  for (const k of Object.keys(c)) {
    if (!CAMPOS_CANAL.includes(k)) throw new ErroDelivery(`${onde}: campo "${k}" não existe. Os campos são: ${CAMPOS_CANAL.join(", ")}`);
  }
  const sobre = String(c.comissao_sobre || "com_desconto").trim();
  if (sobre !== "com_desconto" && sobre !== "cheio") {
    throw new ErroDelivery(`${onde}: "comissao_sobre" só aceita "com_desconto" ou "cheio" (veio "${sobre}")`);
  }
  const canal = {
    nome: String(c.nome).trim(),
    comissao: pct(c.comissao_pct, "comissao_pct", onde),
    taxaPagamento: pct(c.taxa_pagamento_pct, "taxa_pagamento_pct", onde),
    mensalidade: dinheiro(c.mensalidade, "mensalidade", onde),
    entregaLoja: dinheiro(c.entrega_loja, "entrega_loja", onde),
    embalagemExtra: dinheiro(c.embalagem_extra, "embalagem_extra", onde),
    cupomPct: pct(c.cupom_pct, "cupom_pct", onde),
    cupomValor: dinheiro(c.cupom_valor, "cupom_valor", onde),
    comissaoSobre: sobre,
    pedidosMes: c.pedidos_mes === undefined ? null : num(c.pedidos_mes, "pedidos_mes", onde),
    itensPorPedido: c.itens_por_pedido === undefined ? 1 : num(c.itens_por_pedido, "itens_por_pedido", onde),
    direto: c.direto === true,
    fonte: c.fonte ? String(c.fonte) : null,
    conferidoEm: c.conferido_em ? String(c.conferido_em) : null,
  };
  const t = canal.comissao + canal.taxaPagamento;
  if (t >= 1) throw new ErroDelivery(`${onde}: comissão (${P(canal.comissao)}) mais taxa de pagamento (${P(canal.taxaPagamento)}) chega a ${P(t)}. Acima de 100% o repasse é negativo em qualquer preço: confira o contrato`);
  if (canal.cupomPct >= 1) throw new ErroDelivery(`${onde}: "cupom_pct" de ${P(canal.cupomPct)} zera o preço. Cupom bancado pela loja é o pedaço que sai do bolso dele, não o desconto que o cliente vê na tela`);
  if (canal.itensPorPedido <= 0) throw new ErroDelivery(`${onde}: "itens_por_pedido" precisa ser maior que zero`);
  if (canal.pedidosMes !== null && canal.pedidosMes < 0) throw new ErroDelivery(`${onde}: "pedidos_mes" não pode ser negativo`);
  if (canal.conferidoEm && !br.lerData(canal.conferidoEm)) {
    throw new ErroDelivery(`${onde}: "conferido_em" precisa ser DD/MM/AAAA ou AAAA-MM-DD (veio "${canal.conferidoEm}")`);
  }
  canal.despesas = c.despesas_pct !== undefined ? pct(c.despesas_pct, "despesas_pct", onde) : geral.despesas;
  canal.lucroAlvo = geral.lucroAlvo;
  return canal;
}

function lerItem(it, i, canais) {
  const onde = `item ${it && it.nome ? `"${it.nome}"` : `#${i + 1}`}`;
  if (!it || typeof it !== "object") throw new ErroDelivery(`${onde}: cada item é um objeto`);
  if (!it.nome || !String(it.nome).trim()) throw new ErroDelivery(`${onde}: falta "nome"`);
  if (it.custo_porcao === undefined) {
    throw new ErroDelivery(`${onde}: falta "custo_porcao". É o custo por porção do /ficha-tecnica (ingredientes + embalagem do produto + mão de obra), sem a embalagem de entrega`);
  }
  const item = {
    nome: String(it.nome).trim(),
    custoPorcao: dinheiro(it.custo_porcao, "custo_porcao", onde),
    precos: {},
    vendas: {},
    observacao: it.observacao ? String(it.observacao) : null,
  };
  if (item.custoPorcao <= 0) throw new ErroDelivery(`${onde}: "custo_porcao" precisa ser maior que zero`);
  for (const [nome, valor] of Object.entries(it.precos || {})) {
    const canal = acharCanal(canais, nome);
    if (!canal) throw new ErroDelivery(`${onde}: preço no canal "${nome}", que não está na lista de canais (${canais.map((c) => c.nome).join(", ")})`);
    const preco = dinheiro(valor, `precos["${nome}"]`, onde);
    if (preco <= 0) {
      throw new ErroDelivery(`${onde}: preço ${R(preco)} no canal "${canal.nome}". Preço zero não é canal: se o item não é vendido ali, tire o canal de "precos" em vez de deixar zero`);
    }
    item.precos[canal.nome] = preco;
  }
  for (const [nome, valor] of Object.entries(it.vendas || {})) {
    const canal = acharCanal(canais, nome);
    if (!canal) throw new ErroDelivery(`${onde}: vendas no canal "${nome}", que não está na lista de canais`);
    item.vendas[canal.nome] = num(valor, `vendas["${nome}"]`, onde);
  }
  if (!Object.keys(item.precos).length) throw new ErroDelivery(`${onde}: nenhum preço. Cada item precisa de pelo menos um canal em "precos"`);
  return item;
}

function lerSpec(spec) {
  if (!spec || typeof spec !== "object") throw new ErroDelivery("a spec precisa ser um objeto JSON");
  if (!Array.isArray(spec.canais) || !spec.canais.length) throw new ErroDelivery('falta "canais": a lista de onde o item é vendido (iFood, Rappi, 99Food, WhatsApp direto, balcão)');
  if (!Array.isArray(spec.itens) || !spec.itens.length) throw new ErroDelivery('falta "itens": a lista de pratos com o custo por porção');

  const geral = {
    despesas: pct(spec.despesas_pct, "despesas_pct", "spec"),
    lucroAlvo: pct(spec.lucro_alvo_pct, "lucro_alvo_pct", "spec", 0.15),
    reajusteMax: pct(spec.reajuste_max_pct, "reajuste_max_pct", "spec", 0.2),
    descontoMin: pct(spec.desconto_minimo_pct, "desconto_minimo_pct", "spec", 0.1),
  };
  const canais = spec.canais.map((c, i) => lerCanal(c, i, geral));
  const nomes = new Set();
  for (const c of canais) {
    if (nomes.has(br.slug(c.nome))) throw new ErroDelivery(`dois canais com o mesmo nome: "${c.nome}"`);
    nomes.add(br.slug(c.nome));
  }
  for (const c of canais) {
    if (c.despesas + geral.lucroAlvo >= 1) {
      throw new ErroDelivery(`canal "${c.nome}": despesas (${P(c.despesas)}) mais lucro alvo (${P(geral.lucroAlvo)}) chegam a ${P(c.despesas + geral.lucroAlvo)}. Não sobra preço pra cobrir custo e taxa: revise os dois números`);
    }
  }
  const itens = spec.itens.map((it, i) => lerItem(it, i, canais));
  return { negocio: spec.negocio ? String(spec.negocio) : null, mes: spec.mes ? String(spec.mes) : null, geral, canais, itens };
}

// ─────────────────────────── a conta ───────────────────────────

/**
 * Coeficientes da reta do repasse: repasse líquido = a × preço − b.
 * Em "com_desconto" a comissão incide sobre o preço já com o cupom abatido;
 * em "cheio" ela incide sobre o preço de tabela e o cupom sai depois.
 */
function coeficientes(canal) {
  const t = canal.comissao + canal.taxaPagamento;
  if (canal.comissaoSobre === "cheio") {
    return { a: (1 - t) - canal.cupomPct, b: canal.cupomValor, t };
  }
  return { a: (1 - canal.cupomPct) * (1 - t), b: canal.cupomValor * (1 - t), t };
}

/** Quantos itens do canal entram no rateio da mensalidade. */
function itensMes(canal, itens) {
  const somaVendas = itens.reduce((s, it) => s + (it.vendas[canal.nome] || 0), 0);
  if (somaVendas > 0) return { valor: somaVendas, origem: "vendas por item" };
  if (canal.pedidosMes) return { valor: canal.pedidosMes * canal.itensPorPedido, origem: "pedidos_mes × itens_por_pedido" };
  return { valor: 0, origem: null };
}

/**
 * A margem de um item num canal. Devolve cada parcela em reais, pra que o
 * usuário consiga refazer a soma na mão e achar onde o dinheiro foi.
 */
function margem(item, canal, preco, mensalidadePorItem) {
  const { a, b, t } = coeficientes(canal);
  const cupom = preco * canal.cupomPct + canal.cupomValor;
  const base = canal.comissaoSobre === "cheio" ? preco : preco - cupom;
  const comissao = base * canal.comissao;
  const taxaPagamento = base * canal.taxaPagamento;
  const repasse = a * preco - b;
  const custoItem = item.custoPorcao + canal.embalagemExtra;
  // entrega e mensalidade são do PEDIDO, não do item: rateadas por itens_por_pedido
  const entrega = canal.entregaLoja / canal.itensPorPedido;
  const fixo = custoItem + entrega + mensalidadePorItem;
  const despesasReais = preco * canal.despesas;
  const contribuicao = repasse - entrega - custoItem;
  const lucro = contribuicao - mensalidadePorItem - despesasReais;
  const denMeta = a - canal.despesas - canal.lucroAlvo;
  const denZero = a - canal.despesas;
  const precoMeta = denMeta > 0 ? (b + fixo) / denMeta : null;
  const precoZero = denZero > 0 ? (b + fixo) / denZero : null;
  const descontoMax = precoZero !== null && preco > 0 ? Math.max(0, 1 - precoZero / preco) : 0;
  const lucroPct = preco > 0 ? lucro / preco : 0;
  let situacao;
  if (preco <= 0) situacao = "sem preço";
  else if (lucro < 0) situacao = "prejuízo";
  else if (lucroPct < canal.lucroAlvo - 0.0005) situacao = "abaixo da meta";
  else situacao = "dá lucro";
  return {
    item: item.nome,
    canal: canal.nome,
    preco: br.centavos(preco),
    cupom: br.centavos(cupom),
    base: br.centavos(base),
    comissao: br.centavos(comissao),
    taxaPagamento: br.centavos(taxaPagamento),
    entrega: br.centavos(entrega),
    repasse: br.centavos(repasse),
    custoItem: br.centavos(custoItem),
    embalagemExtra: br.centavos(canal.embalagemExtra),
    mensalidadePorItem: br.centavos(mensalidadePorItem),
    despesas: br.centavos(despesasReais),
    contribuicao: br.centavos(contribuicao),
    lucro: br.centavos(lucro),
    lucroPct,
    taxaTotalPct: t,
    precoMeta: precoMeta === null ? null : br.centavos(precoMeta),
    precoZero: precoZero === null ? null : br.centavos(precoZero),
    descontoMax,
    situacao,
    coefA: a,
  };
}

/** Roda a spec inteira: uma linha por item em cada canal onde ele tem preço. */
function calcular(res) {
  const avisos = [];
  const rateio = new Map();
  for (const canal of res.canais) {
    const im = itensMes(canal, res.itens);
    if (canal.mensalidade > 0 && !im.valor) {
      throw new ErroDelivery(`canal "${canal.nome}": tem mensalidade de ${R(canal.mensalidade)} e nenhum volume pra ratear. Informe "pedidos_mes" no canal, ou "vendas" por item`);
    }
    const porItem = im.valor ? canal.mensalidade / im.valor : 0;
    rateio.set(canal.nome, { porItem, itensMes: im.valor, origem: im.origem });
    const somaVendas = res.itens.reduce((s, it) => s + (it.vendas[canal.nome] || 0), 0);
    if (somaVendas > 0 && canal.pedidosMes) {
      const previsto = canal.pedidosMes * canal.itensPorPedido;
      if (previsto > 0 && Math.abs(somaVendas - previsto) / previsto > 0.1) {
        avisos.push(`canal "${canal.nome}": a soma das vendas por item é ${br.numero(somaVendas)} e "pedidos_mes × itens_por_pedido" dá ${br.numero(previsto)}. Usei a soma das vendas; confira se faltou item na lista`);
      }
    }
    if (!canal.conferidoEm) avisos.push(`canal "${canal.nome}": sem "conferido_em". Taxa sem data de conferência envelhece sem avisar`);
    if (!canal.fonte) avisos.push(`canal "${canal.nome}": sem "fonte". A fonte é o extrato ou o contrato, não a matéria de blog`);
  }

  const linhas = [];
  for (const item of res.itens) {
    for (const canal of res.canais) {
      const preco = item.precos[canal.nome];
      if (preco === undefined) continue;
      linhas.push(margem(item, canal, preco, rateio.get(canal.nome).porItem));
    }
    const faltando = res.canais.filter((c) => item.precos[c.nome] === undefined).map((c) => c.nome);
    if (faltando.length) avisos.push(`item "${item.nome}": sem preço em ${faltando.join(", ")}. Item que não está no canal não entra na comparação daquele canal`);
  }

  // totais por canal, só quando há venda informada
  const porCanal = res.canais.map((canal) => {
    const doCanal = linhas.filter((l) => l.canal === canal.nome);
    const comVenda = doCanal.filter((l) => {
      const it = res.itens.find((x) => x.nome === l.item);
      return it && Object.prototype.hasOwnProperty.call(it.vendas, canal.nome);
    });
    const soma = { faturamento: 0, taxas: 0, cupons: 0, repasse: 0, custo: 0, lucro: 0, itens: 0 };
    for (const l of comVenda) {
      const it = res.itens.find((x) => x.nome === l.item);
      const q = it.vendas[canal.nome] || 0;
      soma.itens += q;
      soma.faturamento += l.preco * q;
      soma.taxas += (l.comissao + l.taxaPagamento) * q;
      soma.cupons += l.cupom * q;
      soma.repasse += l.repasse * q;
      soma.custo += l.custoItem * q;
      soma.lucro += l.lucro * q;
    }
    const completo = comVenda.length === doCanal.length && doCanal.length > 0;
    return {
      nome: canal.nome,
      direto: canal.direto,
      taxaTotalPct: canal.comissao + canal.taxaPagamento,
      mensalidade: canal.mensalidade,
      mensalidadePorItem: br.centavos(rateio.get(canal.nome).porItem),
      itensMes: rateio.get(canal.nome).itensMes,
      origemRateio: rateio.get(canal.nome).origem,
      fonte: canal.fonte,
      conferidoEm: canal.conferidoEm,
      temVolume: comVenda.length > 0,
      volumeCompleto: completo,
      faturamento: br.centavos(soma.faturamento),
      taxasPagas: br.centavos(soma.taxas),
      cuponsBancados: br.centavos(soma.cupons),
      repasse: br.centavos(soma.repasse),
      custo: br.centavos(soma.custo),
      lucro: br.centavos(soma.lucro),
      itensVendidos: soma.itens,
    };
  });

  const decisoes = decidir(res, linhas, rateio);
  return { ...res, linhas, porCanal, decisoes, avisos, rateio };
}

/** Do ranking pra decisão: o que tirar, o que repreçar, o que empurrar, o que promover. */
function decidir(res, linhas, rateio) {
  const canalDireto = res.canais.find((c) => c.direto);
  const tirar = [];
  const reprecificar = [];
  const empurrar = [];
  const promover = [];

  for (const l of linhas) {
    const canal = res.canais.find((c) => c.nome === l.canal);
    const tetoReajuste = l.preco * (1 + res.geral.reajusteMax);
    if (l.situacao === "prejuízo" && (l.precoMeta === null || l.precoZero === null || l.precoZero > tetoReajuste)) {
      tirar.push({
        ...l,
        motivo: l.precoZero === null
          ? `Nesse canal a taxa consome o preço inteiro: ${P(l.coefA)} do que o cliente paga chega na loja, e as despesas de ${P(canal.despesas)} não caberiam nem com preço infinito`
          : `Pra sair do prejuízo o preço precisaria ir a ${R(l.precoZero)}, ${P(l.precoZero / l.preco - 1)} acima do preço de hoje`,
      });
    } else if ((l.situacao === "prejuízo" || l.situacao === "abaixo da meta") && l.precoMeta !== null) {
      const item = res.itens.find((x) => x.nome === l.item);
      const noTeto = margem(item, canal, tetoReajuste, rateio.get(canal.nome).porItem);
      reprecificar.push({
        ...l,
        diferenca: br.centavos(l.precoMeta - l.preco),
        metaForaDoTeto: l.precoMeta > tetoReajuste,
        precoTeto: br.centavos(tetoReajuste),
        lucroNoTeto: noTeto.lucro,
        lucroPctNoTeto: noTeto.lucroPct,
      });
    }
    if (l.situacao === "dá lucro" && l.descontoMax >= res.geral.descontoMin) {
      promover.push(l);
    }
  }

  if (canalDireto) {
    for (const item of res.itens) {
      const noDireto = linhas.find((l) => l.item === item.nome && l.canal === canalDireto.nome);
      if (!noDireto || noDireto.lucro <= 0) continue;
      for (const l of linhas) {
        if (l.item !== item.nome || l.canal === canalDireto.nome) continue;
        const ganho = br.centavos(noDireto.lucro - l.lucro);
        if (ganho > 0) empurrar.push({ item: item.nome, de: l.canal, para: canalDireto.nome, ganho, lucroApp: l.lucro, lucroDireto: noDireto.lucro });
      }
    }
  }

  const ordem = (a, b) => a.lucro - b.lucro;
  return {
    tirar: tirar.sort(ordem),
    reprecificar: reprecificar.sort(ordem),
    empurrar: empurrar.sort((a, b) => b.ganho - a.ganho),
    promover: promover.sort((a, b) => b.descontoMax - a.descontoMax),
    canalDireto: canalDireto ? canalDireto.nome : null,
  };
}

// ─────────────────────────── simulação ───────────────────────────

const SIMULAVEIS = {
  comissao_pct: "comissao", taxa_pagamento_pct: "taxaPagamento", cupom_pct: "cupomPct",
  cupom_valor: "cupomValor", mensalidade: "mensalidade", entrega_loja: "entregaLoja",
  embalagem_extra: "embalagemExtra", pedidos_mes: "pedidosMes",
};

/** "iFood Entrega:comissao_pct=27" ou "iFood Entrega:cupom_pct=+5" → spec com o canal alterado. */
function aplicarSimulacao(res, expressoes) {
  const copia = JSON.parse(JSON.stringify(res));
  const mudancas = [];
  for (const exp of expressoes) {
    const m = String(exp).match(/^(.+?):([a-z_]+)\s*=\s*(.+)$/i);
    if (!m) throw new ErroDelivery(`simulação "${exp}" não entendida. Formato: --simular "iFood Entrega:comissao_pct=27" ou "iFood Entrega:cupom_pct=+5"`);
    const [, alvoCanal, campo, valor] = m;
    const chave = SIMULAVEIS[campo.trim().toLowerCase()];
    if (!chave) throw new ErroDelivery(`não dá pra simular "${campo}". Campos simuláveis: ${Object.keys(SIMULAVEIS).join(", ")}`);
    const canal = acharCanal(copia.canais, alvoCanal);
    if (!canal) throw new ErroDelivery(`simulação "${exp}": nenhum canal chamado "${alvoCanal.trim()}"`);
    const antes = canal[chave];
    const bruto = String(valor).trim();
    const ehPercentual = ["comissao", "taxaPagamento", "cupomPct"].includes(chave);
    let depois;
    if (/^[+-]/.test(bruto) && bruto.endsWith("%") && !ehPercentual) {
      const fator = 1 + pct(bruto.replace(/^[+-]/, ""), campo, `simulação "${exp}"`) * (bruto.startsWith("-") ? -1 : 1);
      depois = antes * fator;
    } else if (/^[+-]/.test(bruto)) {
      const delta = ehPercentual ? pct(bruto.replace(/^[+-]/, ""), campo, `simulação "${exp}"`) : num(bruto.replace(/^[+-]/, ""), campo, `simulação "${exp}"`);
      depois = antes + (bruto.startsWith("-") ? -delta : delta);
    } else {
      depois = ehPercentual ? pct(bruto, campo, `simulação "${exp}"`) : num(bruto, campo, `simulação "${exp}"`);
    }
    if (depois < 0) throw new ErroDelivery(`simulação "${exp}": o resultado ficaria negativo (${depois})`);
    canal[chave] = depois;
    mudancas.push({ canal: canal.nome, campo: campo.trim(), antes, depois, percentual: ehPercentual });
  }
  for (const c of copia.canais) {
    if (c.comissao + c.taxaPagamento >= 1) throw new ErroDelivery(`simulação: no canal "${c.nome}" comissão mais taxa passariam de 100%`);
  }
  return { spec: copia, mudancas };
}

// ─────────────────────────── markdown ───────────────────────────

function tabela(cabecalho, linhas) {
  const out = [`| ${cabecalho.join(" | ")} |`, `|${cabecalho.map(() => "---").join("|")}|`];
  for (const l of linhas) out.push(`| ${l.join(" | ")} |`);
  return out.join("\n");
}

function markdown(res) {
  const L = [];
  const titulo = `Delivery e margem por canal${res.negocio ? ` — ${res.negocio}` : ""}`;
  L.push(`# ${titulo}`, "");
  const comPreco = res.linhas.length;
  const prejuizo = res.linhas.filter((l) => l.situacao === "prejuízo").length;
  const abaixo = res.linhas.filter((l) => l.situacao === "abaixo da meta").length;
  const lucro = res.linhas.filter((l) => l.situacao === "dá lucro").length;
  L.push("## O cardápio nos aplicativos em uma frase", "");
  const conj = (n, um, muitos) => (n === 1 ? um : muitos);
  L.push(`De ${comPreco} ${conj(comPreco, "combinação", "combinações")} de item e canal, ${lucro} ${conj(lucro, "bate", "batem")} a meta de ${P(res.geral.lucroAlvo)}, ${abaixo} ${conj(abaixo, "fica", "ficam")} abaixo dela e ${prejuizo} ${conj(prejuizo, "dá", "dão")} prejuízo.`, "");

  L.push("## Os canais", "");
  L.push(tabela(
    ["Canal", "Comissão", "Taxa de pagamento", "Taxa total", "Mensalidade", "Rateio por item", "Embalagem extra"],
    res.porCanal.map((c) => {
      const canal = res.canais.find((x) => x.nome === c.nome);
      return [c.nome, P(canal.comissao), P(canal.taxaPagamento), P(c.taxaTotalPct), R(c.mensalidade), R(c.mensalidadePorItem), R(canal.embalagemExtra)];
    })
  ), "");
  for (const c of res.porCanal) {
    const fonte = c.fonte ? `${c.fonte}` : "[a confirmar]";
    const data = c.conferidoEm ? `conferido em ${c.conferidoEm}` : "sem data de conferência";
    L.push(`- **${c.nome}** — ${fonte}, ${data}${c.itensMes ? `. Rateio sobre ${br.numero(c.itensMes)} itens no mês (${c.origemRateio})` : ""}`);
  }
  L.push("");

  L.push("## Margem por item e canal", "");
  L.push(tabela(
    ["Item", "Canal", "Preço", "Cupom", "Comissão + taxa", "Entrega", "Custo + embalagem", "Mensalidade", "Despesas", "Lucro real", "Lucro %", "Situação"],
    res.linhas.map((l) => [
      l.item, l.canal, R(l.preco), R(l.cupom), R(l.comissao + l.taxaPagamento), R(l.entrega),
      R(l.custoItem), R(l.mensalidadePorItem), R(l.despesas), R(l.lucro), P(l.lucroPct), l.situacao,
    ])
  ), "");

  L.push("## O preço que bate a meta", "");
  L.push(tabela(
    ["Item", "Canal", "Preço hoje", "Preço da meta", "Diferença", "Preço de empate", "Desconto que cabe"],
    res.linhas.map((l) => [
      l.item, l.canal, R(l.preco),
      l.precoMeta === null ? "impossível" : R(l.precoMeta),
      l.precoMeta === null ? "—" : R(l.precoMeta - l.preco),
      l.precoZero === null ? "impossível" : R(l.precoZero),
      l.precoZero === null ? "—" : P(l.descontoMax),
    ])
  ), "");

  const d = res.decisoes;
  L.push("## A decisão", "");
  L.push("### Sair do canal", "");
  if (!d.tirar.length) L.push("Nenhum item precisa sair: todos têm preço que fecha a conta dentro do teto de reajuste.", "");
  else {
    for (const l of d.tirar) L.push(`- **${l.item} no ${l.canal}** — perde ${R(Math.abs(l.lucro))} por unidade vendida. ${l.motivo}`);
    L.push("");
  }
  L.push("### Precificar diferente por canal", "");
  if (!d.reprecificar.length) L.push("Nenhum ajuste necessário.", "");
  else {
    for (const l of d.reprecificar) {
      const base = `- **${l.item} no ${l.canal}** — de ${R(l.preco)} pra ${R(l.precoMeta)} (${R(l.diferenca)} a mais) pra chegar em ${P(res.geral.lucroAlvo)} de lucro. Hoje: ${P(l.lucroPct)}`;
      L.push(l.metaForaDoTeto
        ? `${base}. Esse preço fica ${P(l.precoMeta / l.preco - 1)} acima de hoje e passa o teto de reajuste de ${P(res.geral.reajusteMax)}. No teto (${R(l.precoTeto)}) o lucro chega a ${P(l.lucroPctNoTeto)}: o resto vem de corte de custo por porção, ou de sair do canal`
        : base);
    }
    L.push("");
  }
  L.push("### Empurrar pra venda direta", "");
  if (!d.canalDireto) L.push('Nenhum canal está marcado como `"direto": true` na spec. Sem ele não há comparação de venda direta.', "");
  else if (!d.empurrar.length) L.push(`O ${d.canalDireto} não rende mais que os aplicativos em nenhum item desta lista.`, "");
  else {
    for (const e of d.empurrar) L.push(`- **${e.item}** — ${R(e.ganho)} a mais por unidade no ${e.para} que no ${e.de} (${R(e.lucroDireto)} contra ${R(e.lucroApp)})`);
    L.push("");
  }
  L.push("### Pode entrar em promoção", "");
  if (!d.promover.length) L.push("Nenhum item tem folga suficiente pra promoção sem prejuízo agora.", "");
  else {
    for (const l of d.promover) L.push(`- **${l.item} no ${l.canal}** — até ${P(l.descontoMax)} de desconto (preço de empate ${R(l.precoZero)}) antes de zerar o lucro`);
    L.push("");
  }

  const comVolume = res.porCanal.filter((c) => c.temVolume);
  if (comVolume.length) {
    L.push("## O mês por canal", "");
    L.push(tabela(
      ["Canal", "Itens vendidos", "Faturamento", "Cupom bancado", "Comissão + taxa", "Custo do produto", "Lucro do canal"],
      comVolume.map((c) => [c.nome, br.numero(c.itensVendidos), R(c.faturamento), R(c.cuponsBancados), R(c.taxasPagas), R(c.custo), R(c.lucro)])
    ), "");
    const incompletos = comVolume.filter((c) => !c.volumeCompleto).map((c) => c.nome);
    if (incompletos.length) L.push(`Nestes canais faltou venda de algum item, então o total é parcial: ${incompletos.join(", ")}.`, "");
  }

  if (res.avisos.length) {
    L.push("## O que conferir", "");
    for (const a of res.avisos) L.push(`- ${a}`);
    L.push("");
  }

  L.push("## Como refazer", "");
  L.push("```bash");
  L.push("node scripts/delivery.js <spec.json>");
  L.push(`node scripts/delivery.js <spec.json> --simular "${res.canais[0].nome}:comissao_pct=27"`);
  L.push("```");
  L.push("");
  L.push(`Toda taxa desta página veio da spec, preenchida com o contrato e o extrato do próprio negócio. Despesas rateadas: ${P(res.geral.despesas)} do preço. Lucro alvo: ${P(res.geral.lucroAlvo)}. Teto de reajuste considerado: ${P(res.geral.reajusteMax)}.`);
  return L.join("\n") + "\n";
}

function markdownSimulacao(base, sim, mudancas) {
  const L = [];
  L.push(`# Simulação de taxa${base.negocio ? ` — ${base.negocio}` : ""}`, "");
  L.push("## O que mudou", "");
  for (const m of mudancas) {
    const fmt = (v) => (m.percentual ? P(v) : R(v));
    L.push(`- **${m.canal}**, ${m.campo}: ${fmt(m.antes)} → ${fmt(m.depois)}`);
  }
  L.push("");
  L.push("## Efeito por item", "");
  const linhas = [];
  for (const dep of sim.linhas) {
    const antes = base.linhas.find((l) => l.item === dep.item && l.canal === dep.canal);
    if (!antes) continue;
    if (Math.abs(antes.lucro - dep.lucro) < 0.005 && antes.situacao === dep.situacao) continue;
    linhas.push([
      dep.item, dep.canal, R(antes.lucro), R(dep.lucro), R(dep.lucro - antes.lucro),
      antes.situacao === dep.situacao ? dep.situacao : `${antes.situacao} → **${dep.situacao}**`,
    ]);
  }
  if (!linhas.length) L.push("Nenhum item muda de lucro com essa alteração.", "");
  else L.push(tabela(["Item", "Canal", "Lucro antes", "Lucro depois", "Diferença", "Situação"], linhas), "");
  const virou = sim.linhas.filter((dep) => {
    const antes = base.linhas.find((l) => l.item === dep.item && l.canal === dep.canal);
    return antes && antes.situacao !== "prejuízo" && dep.situacao === "prejuízo";
  });
  L.push("## Quem vira prejuízo", "");
  if (!virou.length) L.push("Nenhum item passa a dar prejuízo com essa alteração.", "");
  else for (const l of virou) L.push(`- **${l.item} no ${l.canal}** — ${R(l.lucro)} por unidade. Preço de empate: ${l.precoZero === null ? "impossível nesse canal" : R(l.precoZero)}`);
  L.push("");
  L.push("A simulação não altera a spec nem a planilha.");
  return L.join("\n") + "\n";
}

// ─────────────────────────── planilha ───────────────────────────

function specPlanilha(res) {
  const C = "Canais";
  const canais = res.porCanal.map((c) => {
    const canal = res.canais.find((x) => x.nome === c.nome);
    return [canal.nome, canal.comissao, canal.taxaPagamento, canal.mensalidade, canal.entregaLoja,
      canal.embalagemExtra, canal.cupomPct, canal.cupomValor, canal.comissaoSobre,
      canal.itensPorPedido, c.itensMes, null, null, null];
  });
  const faixa = `${C}!A{${C}.primeira}:N{${C}.ultima}`;
  const v = (n) => `PROCV($B{n};${faixa};${n};FALSO)`;
  const margem = res.linhas.map((l) => {
    const canal = res.canais.find((x) => x.nome === l.canal);
    return [l.item, l.canal, res.itens.find((i) => i.nome === l.item).custoPorcao,
      null, null, null, null, l.preco, null, null, null, null, null,
      canal.despesas, canal.lucroAlvo, null, null, null, null, null, null, null, null, null];
  });
  return {
    titulo: `Delivery e margem por canal${res.negocio ? ` — ${res.negocio}` : ""}`,
    autor: res.negocio || "Contex OS",
    abas: [
      {
        nome: C,
        colunas: [
          { titulo: "Canal", tipo: "texto", largura: 26 },
          { titulo: "Comissão", tipo: "percentual" },
          { titulo: "Taxa de pagamento", tipo: "percentual" },
          { titulo: "Mensalidade", tipo: "moeda" },
          { titulo: "Entrega paga pela loja (por pedido)", tipo: "moeda" },
          { titulo: "Embalagem de entrega (por item)", tipo: "moeda" },
          { titulo: "Cupom %", tipo: "percentual" },
          { titulo: "Cupom R$", tipo: "moeda" },
          { titulo: "Comissão sobre", opcoes: ["com_desconto", "cheio"] },
          { titulo: "Itens por pedido", tipo: "numero" },
          { titulo: "Itens no mês", tipo: "numero" },
          { titulo: "Mensalidade por item", tipo: "moeda", formula: '=SE(OU(A{n}="";K{n}=0);0;D{n}/K{n})' },
          { titulo: "Entrega por item", tipo: "moeda", formula: '=SE(OU(A{n}="";J{n}=0);0;E{n}/J{n})' },
          { titulo: "Taxa total", tipo: "percentual", formula: '=SE(A{n}="";"";B{n}+C{n})' },
        ],
        linhas: canais, linhasExtras: 6, congelar: true, filtro: true,
      },
      {
        nome: "Margem",
        colunas: [
          { titulo: "Item", tipo: "texto", largura: 24 },
          { titulo: "Canal", tipo: "texto", largura: 24 },
          { titulo: "Custo por porção", tipo: "moeda" },
          { titulo: "Embalagem de entrega", tipo: "moeda", formula: `=SE(A{n}="";"";${v(6)})` },
          { titulo: "Custo total", tipo: "moeda", formula: '=SE(A{n}="";"";C{n}+D{n})' },
          { titulo: "Entrega por item", tipo: "moeda", formula: `=SE(A{n}="";"";${v(13)})` },
          { titulo: "Mensalidade por item", tipo: "moeda", formula: `=SE(A{n}="";"";${v(12)})` },
          { titulo: "Preço no canal", tipo: "moeda" },
          { titulo: "Cupom", tipo: "moeda", formula: `=SE(A{n}="";"";H{n}*${v(7)}+${v(8)})` },
          { titulo: "Base da comissão", tipo: "moeda", formula: `=SE(A{n}="";"";SE(${v(9)}="cheio";H{n};H{n}-I{n}))` },
          { titulo: "Comissão", tipo: "moeda", formula: `=SE(A{n}="";"";J{n}*${v(2)})` },
          { titulo: "Taxa de pagamento", tipo: "moeda", formula: `=SE(A{n}="";"";J{n}*${v(3)})` },
          { titulo: "Repasse", tipo: "moeda", formula: `=SE(A{n}="";"";SE(${v(9)}="cheio";H{n}-I{n}-K{n}-L{n};J{n}-K{n}-L{n}))` },
          { titulo: "Despesas", tipo: "percentual" },
          { titulo: "Lucro alvo", tipo: "percentual" },
          { titulo: "Despesas em R$", tipo: "moeda", formula: '=SE(A{n}="";"";H{n}*N{n})' },
          { titulo: "Lucro real", tipo: "moeda", formula: '=SE(A{n}="";"";M{n}-F{n}-E{n}-G{n}-P{n})' },
          { titulo: "Lucro real %", tipo: "percentual", formula: '=SE(A{n}="";"";SE(H{n}=0;0;Q{n}/H{n}))' },
          { titulo: "Coef. do repasse", tipo: "numero", formula: `=SE(A{n}="";"";SE(${v(9)}="cheio";1-${v(14)}-${v(7)};(1-${v(7)})*(1-${v(14)})))` },
          { titulo: "Custo fixo da conta", tipo: "moeda", formula: `=SE(A{n}="";"";SE(${v(9)}="cheio";${v(8)};${v(8)}*(1-${v(14)}))+E{n}+F{n}+G{n})` },
          { titulo: "Preço da meta", tipo: "moeda", formula: '=SE(A{n}="";"";SE(S{n}-N{n}-O{n}<=0;0;T{n}/(S{n}-N{n}-O{n})))' },
          { titulo: "Preço de empate", tipo: "moeda", formula: '=SE(A{n}="";"";SE(S{n}-N{n}<=0;0;T{n}/(S{n}-N{n})))' },
          { titulo: "Desconto que cabe", tipo: "percentual", formula: '=SE(A{n}="";"";SE(OU(H{n}=0;V{n}=0);0;MAX(0;1-V{n}/H{n})))' },
          { titulo: "Situação", tipo: "texto", formula: '=SE(A{n}="";"";SE(H{n}=0;"sem preço";SE(Q{n}<0;"prejuízo";SE(R{n}<O{n}-0.0005;"abaixo da meta";"dá lucro"))))' },
        ],
        linhas: margem, linhasExtras: 10, congelar: true, filtro: true, imprimir: "paisagem",
      },
      {
        nome: "Como usar",
        texto: [
          "# Como usar esta planilha",
          "Duas abas têm digitação: Canais (as taxas do seu contrato) e, na aba Margem, as colunas Custo por porção, Preço no canal, Despesas e Lucro alvo. O resto é fórmula: não digite por cima.",
          "## Quando a taxa mudar",
          "O plano subiu de 23% para 27%? Troque só a célula da coluna Comissão, na aba Canais. Todo item vendido naquele canal recalcula o lucro real, o preço da meta e o desconto que cabe.",
          "## O que cada coluna responde",
          "Repasse é o que cai na sua conta: preço menos cupom, menos comissão, menos taxa de pagamento. Lucro real é o repasse menos a entrega que você paga, menos o custo do produto com embalagem, menos a mensalidade rateada por item e menos as despesas fixas do negócio rateadas sobre o preço.",
          "Preço da meta é quanto o item precisaria custar naquele canal para deixar o lucro alvo. Preço de empate é onde o lucro zera: abaixo dele a venda tira dinheiro do caixa. Desconto que cabe é a distância entre o preço de hoje e o de empate, e é o teto de qualquer promoção.",
          "## Comissão sobre",
          "Quando a plataforma cobra comissão sobre o valor já com o cupom abatido, deixe 'com_desconto'. Quando cobra sobre o preço de tabela, mude para 'cheio': a diferença aparece direto no repasse. Confira no extrato de um pedido com cupom qual dos dois é o seu caso.",
          "## Entrega e mensalidade são do pedido",
          "A entrega que você paga e a mensalidade do plano não são do item, são do pedido e do mês. As colunas Itens por pedido e Itens no mês, na aba Canais, é que dividem esses dois valores até chegar ao item. Menos pedido no mês significa mensalidade mais pesada por item: é por isso que canal com mensalidade e pouco giro costuma ser o primeiro a sair.",
          "## Fonte e data",
          "Taxa é cláusula de contrato, e muda. O arquivo .md ao lado guarda a fonte e a data de conferência de cada canal. Sem isso, a planilha decide com número velho.",
        ],
      },
    ],
  };
}

function gerarPlanilha(res, saidaXlsx) {
  const specP = specPlanilha(res);
  const tmp = path.join(os.tmpdir(), `delivery-${process.pid}.planilha.json`);
  fs.writeFileSync(tmp, JSON.stringify(specP, null, 2));
  try {
    const log = console.log;
    console.log = () => {};
    let out;
    try { out = planilha.gerar(tmp, saidaXlsx, { sobrescrever: true }); } finally { console.log = log; }
    const grade = out.abas.find((a) => a.nome === "Margem");
    const diverge = [];
    res.linhas.forEach((l, i) => {
      const linha = grade.primeira + i;
      const conferir = [["Q", l.lucro, "lucro real"], ["M", l.repasse, "repasse"], ["U", l.precoMeta === null ? 0 : l.precoMeta, "preço da meta"]];
      for (const [col, esperado, nome] of conferir) {
        const cel = grade.grade.get(`${col}${linha}`);
        if (!cel || typeof cel.calc !== "number") { diverge.push(`${l.item}/${l.canal}: célula ${col}${linha} (${nome}) sem valor calculado`); continue; }
        if (Math.abs(cel.calc - esperado) > 0.01) diverge.push(`${l.item}/${l.canal} — ${nome}: script ${R(esperado)} × planilha ${R(cel.calc)}`);
      }
      const sit = grade.grade.get(`X${linha}`);
      if (!sit || sit.calc !== l.situacao) diverge.push(`${l.item}/${l.canal}: situação "${l.situacao}" no script, "${sit ? sit.calc : "?"}" na planilha`);
    });
    const abas = out.abas.map((x) => ({ nome: x.nome, colunas: x.textoSo ? 0 : x.colunas.length, linhas: x.textoSo ? x.ultimaLinha : Math.max(0, x.ultima - x.primeira + 1) }));
    return { saida: out.saida, nFormulas: out.nFormulas, comErro: out.comErro, diverge, abas };
  } finally { try { fs.unlinkSync(tmp); } catch (_) { /* nada */ } }
}

// ─────────────────────────── exemplo ───────────────────────────

const EXEMPLO = {
  negocio: "Marmitaria exemplo",
  mes: "2026-09",
  despesas_pct: 18,
  lucro_alvo_pct: 15,
  reajuste_max_pct: 20,
  desconto_minimo_pct: 10,
  canais: [
    {
      nome: "iFood Entrega",
      comissao_pct: 23,
      taxa_pagamento_pct: 3.2,
      mensalidade: 150,
      embalagem_extra: 0.9,
      cupom_pct: 0,
      pedidos_mes: 300,
      itens_por_pedido: 1.2,
      fonte: "Portal do Parceiro, extrato de setembro",
      conferido_em: "20/09/2026",
    },
    {
      nome: "iFood Básico",
      comissao_pct: 12,
      taxa_pagamento_pct: 3.2,
      mensalidade: 110,
      entrega_loja: 7,
      embalagem_extra: 0.9,
      pedidos_mes: 75,
      itens_por_pedido: 1.2,
      fonte: "Portal do Parceiro, extrato de setembro",
      conferido_em: "20/09/2026",
    },
    {
      nome: "WhatsApp direto",
      comissao_pct: 0,
      taxa_pagamento_pct: 1.2,
      entrega_loja: 7,
      embalagem_extra: 0.9,
      direto: true,
      pedidos_mes: 90,
      itens_por_pedido: 1.3,
      fonte: "extrato da maquininha e do Pix",
      conferido_em: "20/09/2026",
    },
  ],
  itens: [
    {
      nome: "Marmita de frango",
      custo_porcao: 9.4,
      precos: { "iFood Entrega": 32.9, "iFood Básico": 32.9, "WhatsApp direto": 28.0 },
      vendas: { "iFood Entrega": 240, "iFood Básico": 90, "WhatsApp direto": 70 },
    },
    {
      nome: "Marmita fitness",
      custo_porcao: 13.2,
      precos: { "iFood Entrega": 34.9, "WhatsApp direto": 31.0 },
      vendas: { "iFood Entrega": 120, "WhatsApp direto": 47 },
    },
    {
      nome: "Suco 500 ml",
      custo_porcao: 3.1,
      precos: { "iFood Entrega": 8.9, "WhatsApp direto": 8.0 },
      vendas: { "iFood Entrega": 0, "WhatsApp direto": 0 },
    },
  ],
};

// ─────────────────────────── comando ───────────────────────────

function parseArgs(argv) {
  const a = { simular: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--simular") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) morrer('--simular precisa da alteração entre aspas.', 'Ex: --simular "iFood Entrega:comissao_pct=27"');
      a.simular.push(v);
    } else if (x === "--saida") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) morrer("--saida precisa da pasta.", "Ex: --saida cardapio");
      a.saida = v;
    }
    else if (x === "--json") a.json = true;
    else if (x === "--so-md") a.soMd = true;
    else if (x === "--silencioso") a.silencioso = true;
    else if (x === "--exemplo") { a.exemplo = true; if (argv[i + 1] && !argv[i + 1].startsWith("--")) a.exemploArquivo = argv[++i]; }
    else if (x === "--ajuda" || x === "-h" || x === "--help") a.ajuda = true;
    else if (x.startsWith("--")) morrer(`opção desconhecida: ${x}`, "Opções: --simular, --saida, --json, --so-md, --silencioso, --exemplo");
    else if (!a.spec) a.spec = x;
    else morrer(`argumento sobrando: ${x}`);
  }
  return a;
}

function ajuda() {
  console.log(`
delivery.js — margem real por item e por canal de delivery

  node scripts/delivery.js <spec.json>
  node scripts/delivery.js <spec.json> --simular "iFood Entrega:comissao_pct=27"
  node scripts/delivery.js --exemplo cardapio/delivery.json

Campos simuláveis: ${Object.keys(SIMULAVEIS).join(", ")}
Spec campo a campo: templates/financeiro/delivery.md
`);
}

function resumo(res) {
  dizer("");
  dizer(`  ${"Item".padEnd(22)}${"Canal".padEnd(18)}${"Preço".padStart(11)}${"Lucro".padStart(11)}${"Lucro %".padStart(9)}  Situação`);
  for (const l of res.linhas) {
    dizer(`  ${l.item.slice(0, 21).padEnd(22)}${l.canal.slice(0, 17).padEnd(18)}${R(l.preco).padStart(11)}${R(l.lucro).padStart(11)}${P(l.lucroPct).padStart(9)}  ${l.situacao}`);
  }
  dizer("");
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  SILENCIOSO = !!a.silencioso;
  if (a.ajuda) return ajuda();

  if (a.exemplo) {
    const destino = a.exemploArquivo || "delivery.json";
    if (fs.existsSync(destino)) morrer(`${destino} já existe.`, "Escolha outro nome ou apague o arquivo.");
    fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(EXEMPLO, null, 2) + "\n");
    dizer(`✔ ${destino} (spec de exemplo: 3 canais, 3 itens). Edite as taxas com o que o seu contrato diz e rode: node scripts/delivery.js ${destino}`);
    return;
  }

  if (!a.spec) morrer("Falta a spec.", 'Uso: node scripts/delivery.js <spec.json> [--simular "iFood Entrega:comissao_pct=27"]. Pra começar do zero: --exemplo');
  if (!fs.existsSync(a.spec)) morrer(`não achei ${a.spec}`, "Pra criar uma spec de exemplo: node scripts/delivery.js --exemplo <arquivo.json>");

  let bruto;
  try { bruto = JSON.parse(fs.readFileSync(a.spec, "utf8")); }
  catch (e) { morrer(`${a.spec} não é um JSON válido: ${e.message}`, "Vírgula sobrando antes de } ou ] é o erro mais comum."); }

  let res;
  try { res = calcular(lerSpec(bruto)); }
  catch (e) { if (e instanceof ErroDelivery) morrer(e.message, "Corrija a spec e rode de novo. Campo a campo: templates/financeiro/delivery.md"); throw e; }

  const pasta = a.saida || path.dirname(path.resolve(a.spec));
  fs.mkdirSync(pasta, { recursive: true });
  const mes = res.mes || br.iso(new Date()).slice(0, 7);

  if (a.simular.length) {
    let sim, mudancas;
    try {
      const ap = aplicarSimulacao(res, a.simular);
      mudancas = ap.mudancas;
      sim = calcular(ap.spec);
    } catch (e) { if (e instanceof ErroDelivery) morrer(e.message); throw e; }
    const rotulo = mudancas
      .map((m) => `${br.slug(m.canal)}-${br.slug(m.campo)}`)
      .join("-").slice(0, 60).replace(/-+$/, "");
    const saida = path.join(pasta, `simulacao-delivery-${br.iso(new Date())}-${rotulo}.md`);
    fs.writeFileSync(saida, markdownSimulacao(res, sim, mudancas));
    if (a.json) { console.log(JSON.stringify({ antes: res.linhas, depois: sim.linhas, mudancas }, null, 2)); return; }
    dizer(`✔ ${saida}`);
    resumo(sim);
    const viraram = sim.linhas.filter((dep) => {
      const antes = res.linhas.find((l) => l.item === dep.item && l.canal === dep.canal);
      return antes && antes.situacao !== "prejuízo" && dep.situacao === "prejuízo";
    });
    if (viraram.length) dizer(`  ⚠ ${viraram.length} item(ns) passam a dar prejuízo: ${viraram.map((l) => `${l.item}/${l.canal}`).join(", ")}`);
    else dizer("  Nenhum item passa a dar prejuízo com essa alteração.");
    dizer("");
    return;
  }

  const saidaMd = path.join(pasta, `delivery-${mes}.md`);
  fs.writeFileSync(saidaMd, markdown(res));

  let plan = null;
  if (!a.soMd) {
    try { plan = gerarPlanilha(res, path.join(pasta, `delivery-${mes}.xlsx`)); }
    catch (e) { console.error(`\n⚠ a planilha não saiu: ${e.message}\n  O markdown está gravado. Rode com --so-md se quiser só ele.\n`); }
  }

  if (a.json) { console.log(JSON.stringify({ linhas: res.linhas, porCanal: res.porCanal, decisoes: res.decisoes, avisos: res.avisos }, null, 2)); return; }

  dizer(`✔ ${saidaMd}`);
  if (plan) {
    dizer(`✔ ${plan.saida} — ${plan.nFormulas} fórmulas`);
    for (const x of plan.abas) dizer(`  aba "${x.nome}": ${x.colunas ? `${x.colunas} colunas, ${x.linhas} linhas` : `${x.linhas} parágrafos`}`);
    if (plan.comErro && plan.comErro.length) dizer(`  ⚠ ${plan.comErro.length} fórmula(s) com erro`);
    if (plan.diverge.length) { dizer("  ⚠ planilha e script divergem:"); for (const d of plan.diverge) dizer(`    ${d}`); }
    else dizer("  planilha e script batem em repasse, lucro real, preço da meta e situação");
  }
  resumo(res);
  const d = res.decisoes;
  if (d.tirar.length) dizer(`  Sair do canal: ${d.tirar.map((l) => `${l.item}/${l.canal}`).join(", ")}`);
  if (d.reprecificar.length) dizer(`  Repreçar: ${d.reprecificar.map((l) => `${l.item}/${l.canal} → ${R(l.precoMeta)}`).join(", ")}`);
  if (d.empurrar.length) dizer(`  Venda direta rende mais em: ${[...new Set(d.empurrar.map((e) => e.item))].join(", ")}`);
  if (d.promover.length) dizer(`  Cabe promoção em: ${d.promover.map((l) => `${l.item}/${l.canal} até ${P(l.descontoMax)}`).join(", ")}`);
  if (res.avisos.length) dizer(`  ${res.avisos.length} aviso(s) no fim do markdown`);
  dizer("");
}

module.exports = {
  lerSpec, calcular, margem, coeficientes, itensMes, decidir, aplicarSimulacao,
  markdown, markdownSimulacao, specPlanilha, gerarPlanilha, ErroDelivery, EXEMPLO,
};

if (require.main === module) main();
