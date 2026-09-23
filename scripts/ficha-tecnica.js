#!/usr/bin/env node
/**
 * Contex OS — ficha-tecnica.js
 * Calcula o custo de cada receita ou produto a partir dos insumos (quantidade,
 * unidade, fator de correção) e da lista de preço de compra, e devolve o preço
 * pela fórmula custo ÷ (1 − despesas% − lucro%), o CMV e o ranking do cardápio.
 *
 * Existe porque padaria, confeitaria e marmitaria fazem essa conta de cabeça:
 * somam o quilo da farinha como se fosse o preço de 300 g, esquecem que a
 * cenoura perde 20% na casca, não contam a caixinha, e descobrem que o bolo
 * mais vendido dá prejuízo quando o ovo sobe. Aqui a unidade é validada antes
 * de somar (g com kg, ml com L, un com dz), o fator de correção entra no peso,
 * a perda entra no lote, a embalagem entra na porção, e a planilha sai com a
 * fórmula viva pra recalcular quando o preço de compra mudar.
 *
 * Uso:
 *   node scripts/ficha-tecnica.js <spec.json>                gera precos/ficha-tecnica.xlsx e cardapio-margem.md ao lado da spec
 *   node scripts/ficha-tecnica.js <spec.json> --simular "Ovo=+15%" [--simular "Farinha de trigo=27,90"]
 *                                                            roda o cardápio inteiro com o insumo no preço novo, sem tocar na planilha
 *   node scripts/ficha-tecnica.js --exemplo [arquivo.json]   escreve uma spec de exemplo pra editar
 *
 * Opções:
 *   --saida <pasta>     onde gravar (padrão: a pasta da spec)
 *   --json              imprime o resultado em JSON em vez do resumo
 *   --so-md             não gera a planilha, só o markdown
 *   --silencioso        só imprime erro
 *
 * A spec: { "negocio", "despesas_pct", "lucro_pct", "insumos": [...], "receitas": [...] }.
 * Campo a campo em templates/financeiro/ficha-tecnica.md. Toda função de
 * cálculo está exportada (module.exports) pra ser reproduzida por comando.
 *
 * Node 18+, sem dependência de npm. Usa ./br.js e ./gerar-planilha.js.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const br = require("./br.js");
const planilha = require("./gerar-planilha.js");

// ─────────────────────────── unidades ───────────────────────────

/** Fator pra unidade base da família: g, ml ou un. */
const UNIDADES = {
  massa: { kg: 1000, g: 1, mg: 0.001 },
  volume: { l: 1000, ml: 1 },
  contagem: { un: 1, dz: 12, cento: 100 },
};
const ALIAS = {
  quilo: "kg", quilos: "kg", kilo: "kg", kilos: "kg", grama: "g", gramas: "g", gr: "g",
  litro: "l", litros: "l", lt: "l", mililitro: "ml", mililitros: "ml",
  unidade: "un", unidades: "un", unid: "un", u: "un", pc: "un", pç: "un", peça: "un", peca: "un",
  duzia: "dz", dúzia: "dz", duzias: "dz", dúzias: "dz",
};
const BASE = { massa: "g", volume: "ml", contagem: "un" };
/** Unidade em que o dono pensa o preço: o quilo, o litro, a unidade. */
const UNID_USUAL = { massa: { nome: "quilo", artigo: "o", fator: 1000 }, volume: { nome: "litro", artigo: "o", fator: 1000 }, contagem: { nome: "unidade", artigo: "a", fator: 1 } };
/** Dias depois dos quais o preço de compra vira aviso na entrega. */
const VALIDADE_PRECO = 60;

/** "Kg" → { familia: "massa", unidade: "kg", fator: 1000 }; unidade desconhecida → null. */
function unidade(s) {
  let u = String(s || "").trim().toLowerCase().replace(/\.$/, "");
  u = ALIAS[u] || u;
  if (u === "l") u = "l";
  for (const [familia, tabela] of Object.entries(UNIDADES)) {
    if (u in tabela) return { familia, unidade: u === "l" ? "L" : u, fator: tabela[u] };
  }
  return null;
}

function listaUnidades() {
  return "kg, g, mg (massa) · L, ml (volume) · un, dz, cento (contagem)";
}

// ─────────────────────────── validação ───────────────────────────

class ErroFicha extends Error {}

function num(v, campo, onde) {
  const n = br.numero(v);
  if (!Number.isFinite(n)) throw new ErroFicha(`${onde}: "${campo}" precisa ser número (veio ${JSON.stringify(v)})`);
  return n;
}

function pctFracao(v, campo, onde) {
  if (v === undefined || v === null) return undefined;
  const comSinal = typeof v === "string" && v.includes("%");
  let n = num(v, campo, onde);
  // "30%" e "0,5%" são sempre porcentagem; sem o sinal, 30 é 30% e 0,30 é 30%
  if (comSinal) n = n / 100;
  else if (n > 1) n = n / 100;
  else if (n === 1) throw new ErroFicha(`${onde}: "${campo}" em 1 é ambíguo. Escreva "1%" (ou 0.01) pra um por cento, e 100 pra cem por cento`);
  if (n < 0) throw new ErroFicha(`${onde}: "${campo}" não pode ser negativo`);
  return n;
}

/** Normaliza um insumo: custo por unidade base (R$/g, R$/ml ou R$/un). */
function normalizarInsumo(i, idx) {
  const onde = `insumo ${idx + 1}${i && i.nome ? ` ("${i.nome}")` : ""}`;
  if (!i || !i.nome) throw new ErroFicha(`${onde}: sem "nome"`);
  const c = i.compra;
  if (!c) throw new ErroFicha(`${onde}: sem "compra": { "qtd", "unidade", "preco" } (como você compra: 5 kg por R$ 22,90)`);
  const qtd = num(c.qtd, "compra.qtd", onde);
  const preco = num(c.preco, "compra.preco", onde);
  if (qtd <= 0) throw new ErroFicha(`${onde}: compra.qtd precisa ser maior que zero`);
  if (preco < 0) throw new ErroFicha(`${onde}: compra.preco negativo`);
  if (preco === 0) throw new ErroFicha(`${onde}: compra.preco é zero. Insumo de graça não existe; se é sobra, ponha o preço que pagou`);
  const u = unidade(c.unidade);
  if (!u) throw new ErroFicha(`${onde}: unidade de compra "${c.unidade}" não reconhecida. Aceitas: ${listaUnidades()}`);
  let fc = i.fc === undefined || i.fc === null ? 1 : num(i.fc, "fc", onde);
  if (fc < 1) throw new ErroFicha(`${onde}: fator de correção ${fc} menor que 1. FC = peso bruto ÷ peso limpo, nunca fica abaixo de 1 (sem perda é 1)`);
  if (fc > 10) throw new ErroFicha(`${onde}: fator de correção ${fc} acima de 10. Confira: caranguejo inteiro é 8,33; o resto fica entre 1 e 3`);
  const densidade = i.densidade === undefined ? undefined : num(i.densidade, "densidade", onde);
  const pesoUn = i.peso_un === undefined ? undefined : num(i.peso_un, "peso_un", onde);
  if (densidade !== undefined && densidade <= 0) throw new ErroFicha(`${onde}: densidade precisa ser g por ml, maior que zero`);
  if (pesoUn !== undefined && pesoUn <= 0) throw new ErroFicha(`${onde}: peso_un é gramas por unidade, maior que zero`);
  const tipo = (i.tipo || "ingrediente").toLowerCase();
  if (!["ingrediente", "embalagem"].includes(tipo)) throw new ErroFicha(`${onde}: tipo "${i.tipo}" desconhecido (ingrediente ou embalagem)`);
  let data;
  if (i.data !== undefined && i.data !== null && String(i.data).trim() !== "") {
    data = br.lerData(i.data);
    if (!data) throw new ErroFicha(`${onde}: "${i.data}" não é uma data que exista. Use DD/MM/AAAA ou AAAA-MM-DD (é o dia da nota ou da consulta de preço)`);
    if (br.diasEntre(data, new Date()) < 0) throw new ErroFicha(`${onde}: data "${i.data}" está no futuro`);
  }
  const custoBase = preco / (qtd * u.fator);
  return { nome: String(i.nome).trim(), tipo, compra: { qtd, unidade: u.unidade, preco }, familia: u.familia, fatorCompra: u.fator, fc, densidade, pesoUn, custoBase, fonte: i.fonte ? String(i.fonte).trim() : undefined, data };
}

/**
 * Converte a quantidade do ingrediente pra unidade base do insumo. Família
 * diferente só passa com ponte declarada: densidade (ml ↔ g) ou peso_un (un ↔ g).
 */
function converterQtd(qtd, u, insumo, onde) {
  if (u.familia === insumo.familia) return qtd * u.fator;
  const qtdBase = qtd * u.fator; // na base da própria família
  const par = `${u.familia}→${insumo.familia}`;
  if (par === "volume→massa" && insumo.densidade) return qtdBase * insumo.densidade;
  if (par === "massa→volume" && insumo.densidade) return qtdBase / insumo.densidade;
  if (par === "contagem→massa" && insumo.pesoUn) return qtdBase * insumo.pesoUn;
  if (par === "massa→contagem" && insumo.pesoUn) return qtdBase / insumo.pesoUn;
  const ponte = par.includes("volume") ? `"densidade" (g por ml)` : `"peso_un" (g por unidade)`;
  throw new ErroFicha(`${onde}: a receita usa "${u.unidade}" (${u.familia}) e o insumo "${insumo.nome}" é comprado em ${insumo.compra.unidade} (${insumo.familia}). Ou troque a unidade da receita, ou declare ${ponte} no insumo`);
}

function acharInsumo(nome, mapa) {
  const chave = br.semAcento(nome).trim();
  if (mapa.has(chave)) return mapa.get(chave);
  const parecidos = [...mapa.keys()].filter((k) => k.includes(chave) || chave.includes(k)).slice(0, 3);
  throw new ErroFicha(`insumo "${nome}" não está na lista de insumos${parecidos.length ? `. Parecido: ${parecidos.map((p) => `"${mapa.get(p).nome}"`).join(", ")}` : ""}`);
}

// ─────────────────────────── cálculo ───────────────────────────

/** Preço de venda pela fórmula do divisor: custo ÷ (1 − despesas − lucro). */
function precoSugerido(custo, despesas, lucro) {
  const div = 1 - despesas - lucro;
  if (div <= 0) throw new ErroFicha(`despesas (${br.pct(despesas, 0)}) + lucro (${br.pct(lucro, 0)}) chegam a 100% ou mais: a fórmula divide por zero. Só existe preço quando a soma fica abaixo de 100%`);
  return custo / div;
}

/** O que sobra de cada porção no preço atual, já pagas as despesas rateadas. */
function lucroReal(preco, custo, despesas) {
  if (!preco) return { reais: null, fracao: null, cmv: null };
  const reais = preco - custo - despesas * preco;
  return { reais, fracao: reais / preco, cmv: custo / preco };
}

function situacao(r, lucroAlvo) {
  if (!r.precoAtual) return "sem preço";
  if (r.lucroRealReais < 0) return "prejuízo";
  if (r.lucroRealFracao < lucroAlvo) return "abaixo da meta";
  return "dá lucro";
}

function calcularReceita(rec, idx, mapa, global) {
  const onde = `receita ${idx + 1}${rec && rec.nome ? ` ("${rec.nome}")` : ""}`;
  if (!rec || !rec.nome) throw new ErroFicha(`${onde}: sem "nome"`);
  if (!Array.isArray(rec.ingredientes) || !rec.ingredientes.length) throw new ErroFicha(`${onde}: sem "ingredientes"`);
  let rendQtd, rendUnidade;
  if (typeof rec.rendimento === "object" && rec.rendimento) { rendQtd = num(rec.rendimento.qtd, "rendimento.qtd", onde); rendUnidade = String(rec.rendimento.unidade || "porção"); }
  else { rendQtd = num(rec.rendimento, "rendimento", onde); rendUnidade = "porção"; }
  if (rendQtd <= 0) throw new ErroFicha(`${onde}: rendimento precisa ser maior que zero (quantas porções a receita dá)`);
  const perda = pctFracao(rec.perda_pct, "perda_pct", onde) ?? 0;
  if (perda > 0.5) throw new ErroFicha(`${onde}: perda de ${br.pct(perda, 0)}. Perda acima de 50% é sinal de dado errado (perda é o que estraga, sobra ou quebra, em % do lote)`);
  const despesas = pctFracao(rec.despesas_pct, "despesas_pct", onde) ?? global.despesas;
  const lucro = pctFracao(rec.lucro_pct, "lucro_pct", onde) ?? global.lucro;
  const precoAtual = rec.preco_atual === undefined || rec.preco_atual === null || rec.preco_atual === "" ? null : num(rec.preco_atual, "preco_atual", onde);
  if (precoAtual !== null && precoAtual <= 0) throw new ErroFicha(`${onde}: preco_atual precisa ser maior que zero, ou ficar de fora`);

  const linhas = [];
  let custoIngredientes = 0;
  rec.ingredientes.forEach((ing, k) => {
    const ondeI = `${onde}, ingrediente ${k + 1}`;
    if (!ing || !ing.insumo) throw new ErroFicha(`${ondeI}: sem "insumo"`);
    const ins = acharInsumo(ing.insumo, mapa);
    if (ins.tipo !== "ingrediente") throw new ErroFicha(`${ondeI}: "${ins.nome}" é embalagem; ponha em "embalagem", não em "ingredientes"`);
    const qtd = num(ing.qtd, "qtd", ondeI);
    if (qtd <= 0) throw new ErroFicha(`${ondeI}: qtd precisa ser maior que zero`);
    const u = unidade(ing.unidade);
    if (!u) throw new ErroFicha(`${ondeI}: unidade "${ing.unidade}" não reconhecida. Aceitas: ${listaUnidades()}`);
    const qtdBase = converterQtd(qtd, u, ins, ondeI);
    const fc = ing.bruto ? 1 : ins.fc;
    const custo = qtdBase * fc * ins.custoBase;
    custoIngredientes += custo;
    linhas.push({ insumo: ins.nome, qtd, unidade: u.unidade, qtdBase, base: BASE[ins.familia], fc, bruto: !!ing.bruto, custoUnitBase: ins.custoBase, custo });
  });

  const embalagem = [];
  let custoEmbalagem = 0;
  (rec.embalagem || []).forEach((e, k) => {
    const ondeE = `${onde}, embalagem ${k + 1}`;
    if (!e || !e.insumo) throw new ErroFicha(`${ondeE}: sem "insumo"`);
    const ins = acharInsumo(e.insumo, mapa);
    if (ins.tipo !== "embalagem") throw new ErroFicha(`${ondeE}: "${ins.nome}" está na lista de insumos como ingrediente. Ponha \`"tipo": "embalagem"\` nele, ou tire daqui`);
    const qtd = num(e.qtd === undefined ? 1 : e.qtd, "qtd", ondeE);
    const u = unidade(e.unidade || "un");
    if (!u) throw new ErroFicha(`${ondeE}: unidade "${e.unidade}" não reconhecida`);
    const qtdBase = converterQtd(qtd, u, ins, ondeE);
    const custo = qtdBase * ins.custoBase;
    custoEmbalagem += custo;
    embalagem.push({ insumo: ins.nome, qtd, unidade: u.unidade, qtdBase, custo });
  });

  let maoDeObra = 0;
  if (rec.mao_de_obra) {
    const m = rec.mao_de_obra;
    if (typeof m === "object") {
      const min = num(m.minutos, "mao_de_obra.minutos", onde);
      const hora = num(m.custo_hora, "mao_de_obra.custo_hora", onde);
      maoDeObra = (min / 60) * hora / rendQtd;
    } else maoDeObra = num(m, "mao_de_obra", onde);
  }

  const custoLote = custoIngredientes / (1 - perda);
  const custoPorcaoIngredientes = custoLote / rendQtd;
  const custoPorcao = custoPorcaoIngredientes + custoEmbalagem + maoDeObra;
  const sugerido = precoSugerido(custoPorcao, despesas, lucro);
  const lr = lucroReal(precoAtual, custoPorcao, despesas);
  const r = {
    nome: String(rec.nome).trim(), rendimento: rendQtd, unidadePorcao: rendUnidade, perda, despesas, lucroAlvo: lucro,
    ingredientes: linhas, embalagem, custoIngredientes: br.centavos(custoIngredientes), custoLote: br.centavos(custoLote),
    custoPorcaoIngredientes, custoEmbalagem, maoDeObra, custoPorcao, precoSugerido: sugerido, precoAtual,
    cmv: lr.cmv, lucroRealReais: lr.reais, lucroRealFracao: lr.fracao,
  };
  r.situacao = situacao(r, lucro);
  return r;
}

/** Calcula o cardápio inteiro. Devolve { negocio, despesas, lucro, insumos, receitas, avisos }. */
function calcular(spec) {
  if (!spec || typeof spec !== "object") throw new ErroFicha("spec vazia");
  if (!Array.isArray(spec.insumos) || !spec.insumos.length) throw new ErroFicha(`a spec precisa de "insumos": [ { "nome", "compra": { "qtd", "unidade", "preco" }, "fc" } ]`);
  if (!Array.isArray(spec.receitas) || !spec.receitas.length) throw new ErroFicha(`a spec precisa de "receitas": [ { "nome", "rendimento", "ingredientes": [...] } ]`);
  const despesas = pctFracao(spec.despesas_pct, "despesas_pct", "spec");
  const lucro = pctFracao(spec.lucro_pct, "lucro_pct", "spec");
  if (despesas === undefined) throw new ErroFicha(`falta "despesas_pct" na spec: custos fixos + variáveis (taxa de cartão, imposto) como % do faturamento. Sai do /caixa: custos fixos ÷ faturamento do mês`);
  if (lucro === undefined) throw new ErroFicha(`falta "lucro_pct" na spec: quanto você quer que sobre de cada venda, em % do preço`);
  precoSugerido(1, despesas, lucro); // valida a soma antes de calcular qualquer receita

  const insumos = spec.insumos.map(normalizarInsumo);
  const mapa = new Map();
  for (const i of insumos) {
    const k = br.semAcento(i.nome);
    if (mapa.has(k)) throw new ErroFicha(`insumo "${i.nome}" aparece duas vezes na lista`);
    mapa.set(k, i);
  }
  const receitas = spec.receitas.map((r, i) => calcularReceita(r, i, mapa, { despesas, lucro }));
  const nomes = new Set();
  for (const r of receitas) { if (nomes.has(r.nome)) throw new ErroFicha(`receita "${r.nome}" aparece duas vezes`); nomes.add(r.nome); }

  const avisos = [];
  const usados = new Set(receitas.flatMap((r) => [...r.ingredientes, ...r.embalagem].map((l) => l.insumo)));
  for (const i of insumos) if (!usados.has(i.nome)) avisos.push(`insumo "${i.nome}" não entra em nenhuma receita`);
  for (const i of insumos) if (i.tipo === "ingrediente" && i.fc === 1 && /cebola|batata|cenoura|frango|peixe|abóbora|abobora|mandioca|banana|laranja|abacaxi|manga|melancia|repolho|couve|alface|tomate/i.test(i.nome))
    avisos.push(`"${i.nome}" com fator de correção 1: esse tipo de insumo costuma perder casca, semente ou osso. Confira em templates/financeiro/ficha-tecnica.md`);
  for (const r of receitas) if (r.precoAtual === null) avisos.push(`"${r.nome}" sem preco_atual: dá pra sugerir preço, mas não pra dizer se hoje dá lucro`);
  for (const r of receitas) if (!r.embalagem.length && r.custoEmbalagem === 0) avisos.push(`"${r.nome}" sem embalagem: se vai em caixa, saco ou marmita, o custo está faltando`);
  for (const i of insumos) if (i.tipo === "embalagem" && i.fc !== 1) avisos.push(`embalagem "${i.nome}" com fator de correção ${qtdBonita(i.fc)}: FC é perda de limpeza de ingrediente e não entra no custo de embalagem. Tire o campo`);
  const semData = insumos.filter((i) => !i.data).map((i) => i.nome);
  if (semData.length) avisos.push(`sem data do preço de compra: ${semData.join(", ")}. Preço sem data envelhece sem avisar — ponha "data" em cada insumo`);
  const hoje = new Date();
  const velhos = insumos.filter((i) => i.data && br.diasEntre(i.data, hoje) > VALIDADE_PRECO)
    .map((i) => `${i.nome} (${br.fmt(i.data)}, ${br.diasEntre(i.data, hoje)} dias)`);
  if (velhos.length) avisos.push(`preço de compra com mais de ${VALIDADE_PRECO} dias: ${velhos.join("; ")}. Confira no fornecedor antes de decidir reajuste`);

  return { negocio: spec.negocio || "", despesas, lucro, insumos, receitas, avisos };
}

// ─────────────────────────── simulação ───────────────────────────

/** "Ovo=+15%" → { nome: "Ovo", tipo: "pct", valor: 0.15 } · "Ovo=27,90" → { tipo: "preco", valor: 27.9 } */
function lerSimulacao(s) {
  const m = String(s).match(/^\s*(.+?)\s*=\s*([+-]?\s*[\d.,]+)\s*(%?)\s*$/);
  if (!m) throw new ErroFicha(`--simular "${s}" fora do formato. Use "Insumo=+15%", "Insumo=-10%" ou "Insumo=27,90" (preço novo da compra)`);
  const valor = br.numero(m[2].replace(/\s/g, ""));
  if (!Number.isFinite(valor)) throw new ErroFicha(`--simular "${s}": valor inválido`);
  if (m[3] === "%") return { nome: m[1], tipo: "pct", valor: valor / 100 };
  if (valor <= 0) throw new ErroFicha(`--simular "${s}": preço novo precisa ser maior que zero`);
  return { nome: m[1], tipo: "preco", valor };
}

/** Devolve uma spec nova com os preços de compra alterados. Não muda a original. */
function aplicarSimulacao(spec, mudancas) {
  const nova = JSON.parse(JSON.stringify(spec));
  for (const m of mudancas) {
    const chave = br.semAcento(m.nome).trim();
    const ins = nova.insumos.find((i) => br.semAcento(i.nome || "").trim() === chave);
    if (!ins) throw new ErroFicha(`--simular: insumo "${m.nome}" não está na lista`);
    const atual = br.numero(ins.compra.preco);
    ins.compra.preco = m.tipo === "pct" ? br.centavos(atual * (1 + m.valor)) : m.valor;
    m.de = atual; m.para = ins.compra.preco;
  }
  return nova;
}

function compararCardapios(antes, depois) {
  return antes.receitas.map((a) => {
    const d = depois.receitas.find((x) => x.nome === a.nome);
    return {
      nome: a.nome, custoAntes: a.custoPorcao, custoDepois: d.custoPorcao, delta: d.custoPorcao - a.custoPorcao,
      deltaFracao: a.custoPorcao ? (d.custoPorcao - a.custoPorcao) / a.custoPorcao : 0,
      sugeridoAntes: a.precoSugerido, sugeridoDepois: d.precoSugerido, precoAtual: a.precoAtual,
      lucroAntes: a.lucroRealFracao, lucroDepois: d.lucroRealFracao, situacaoAntes: a.situacao, situacaoDepois: d.situacao,
    };
  }).sort((x, y) => y.delta - x.delta);
}

// ─────────────────────────── saída: markdown ───────────────────────────

const R = (n) => br.reais(n);
const P = (f, c = 1) => (f === null || f === undefined ? "—" : br.pct(f, c));
/** Porcentagem sem casa quando é redonda (30%), com uma casa quando não é (0,5%). */
const Pp = (f) => (f === null || f === undefined ? "—" : br.pct(f, Math.abs(f * 1000 - Math.round(f * 1000)) < 1e-6 && Math.abs(f * 100 - Math.round(f * 100)) < 1e-6 ? 0 : 1));
const qtdBonita = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
/** "un" → "unidade", "dz" → "dúzia"; o resto fica como o usuário escreveu. */
const POR_EXTENSO = { un: "unidade", dz: "dúzia", cento: "cento", kg: "quilo", g: "grama", l: "litro", ml: "mililitro" };
function nomePorcao(unid) {
  const u = String(unid || "porção").trim();
  return POR_EXTENSO[u.toLowerCase()] || u;
}
/** "fatia" → "fatias", "porção" → "porções", "unidade" → "unidades". */
function plural(unid, n) {
  const u = nomePorcao(unid);
  if (n === 1 || /s$/i.test(u)) return u;
  if (/ão$/i.test(u)) return u.replace(/ão$/i, "ões");
  return u + "s";
}

function markdownCardapio(res, specNome) {
  const hoje = br.fmt(new Date());
  const ordem = [...res.receitas].sort((a, b) => {
    const la = a.lucroRealFracao ?? -Infinity, lb = b.lucroRealFracao ?? -Infinity;
    return lb - la;
  });
  const comPreco = ordem.filter((r) => r.precoAtual !== null);
  const ruins = comPreco.filter((r) => r.situacao === "prejuízo");
  const abaixo = comPreco.filter((r) => r.situacao === "abaixo da meta");
  const boas = comPreco.filter((r) => r.situacao === "dá lucro");
  const L = [];
  L.push(`# Cardápio e margem${res.negocio ? ` — ${res.negocio}` : ""}`);
  L.push("");
  L.push(`Gerado em ${hoje} por \`node scripts/ficha-tecnica.js ${specNome}\`. Despesas rateadas: ${Pp(res.despesas)} do preço. Lucro alvo: ${Pp(res.lucro)} do preço. Preço sugerido = custo por porção ÷ (1 − ${Pp(res.despesas)} − ${Pp(res.lucro)}).`);
  L.push("");
  L.push("## O cardápio em uma frase");
  L.push("");
  if (!comPreco.length) L.push("Nenhuma receita tem preço atual, então há preço sugerido pra todas e situação pra nenhuma. Preencha `preco_atual` e rode de novo.");
  else {
    const q = (n, um, muitos) => (n === 0 ? `nenhum ${um}` : `${n} ${n === 1 ? um : muitos}`);
    L.push(`De ${comPreco.length} ${comPreco.length === 1 ? "item com preço" : "itens com preço"}, ${q(boas.length, "bate", "batem")} a meta de lucro, ${q(abaixo.length, "fica", "ficam")} abaixo dela e ${q(ruins.length, "dá", "dão")} prejuízo depois das despesas.`);
  }
  L.push("");
  L.push("## Ranking");
  L.push("");
  L.push("| Item | Custo/porção | Preço atual | CMV | Lucro real | Preço sugerido | Situação |");
  L.push("|---|---|---|---|---|---|---|");
  for (const r of ordem) L.push(`| ${r.nome} | ${R(r.custoPorcao)} | ${r.precoAtual === null ? "—" : R(r.precoAtual)} | ${P(r.cmv, 0)} | ${r.lucroRealReais === null ? "—" : `${R(r.lucroRealReais)} (${P(r.lucroRealFracao, 0)})`} | ${R(r.precoSugerido)} | ${r.situacao} |`);
  L.push("");
  L.push("CMV é o custo da porção dividido pelo preço. Lucro real é o que sobra da porção depois de pagar o custo e a fatia de despesas.");
  L.push("");
  if (ruins.length || abaixo.length) {
    L.push("## O que não dá lucro");
    L.push("");
    for (const r of [...ruins, ...abaixo]) {
      const falta = r.precoSugerido - r.precoAtual;
      L.push(`- **${r.nome}** — custa ${R(r.custoPorcao)} a porção e vende a ${R(r.precoAtual)}. ${r.situacao === "prejuízo" ? `Depois das despesas, cada venda tira ${R(-r.lucroRealReais)} do caixa.` : `Sobra ${R(r.lucroRealReais)} (${P(r.lucroRealFracao, 0)}), abaixo da meta de ${P(r.lucroAlvo, 0)}.`} Pra bater a meta: ${R(r.precoSugerido)} (${falta >= 0 ? "+" : ""}${R(falta)}), ou cortar ${R(r.custoPorcao - (r.precoAtual * (1 - r.despesas - r.lucroAlvo)))} de custo por porção`);
    }
    L.push("");
  }
  L.push("## Ficha de cada item");
  L.push("");
  for (const r of res.receitas) {
    L.push(`### ${r.nome}`);
    L.push("");
    L.push(`Rende ${qtdBonita(r.rendimento)} ${plural(r.unidadePorcao, r.rendimento)}. Perda de ${P(r.perda, 0)} no lote.`);
    L.push("");
    L.push("| Insumo | Qtd na receita | Qtd comprada (com FC) | Custo |");
    L.push("|---|---|---|---|");
    for (const l of r.ingredientes) L.push(`| ${l.insumo} | ${qtdBonita(l.qtd)} ${l.unidade} | ${qtdBonita(l.qtdBase * l.fc)} ${l.base}${l.fc !== 1 ? ` (FC ${qtdBonita(l.fc)})` : l.bruto ? " (já é peso bruto)" : ""} | ${R(l.custo)} |`);
    L.push(`| Total dos ingredientes | | | ${R(r.custoIngredientes)} |`);
    L.push("");
    const extras = [];
    if (r.embalagem.length) extras.push(`embalagem ${R(r.custoEmbalagem)} (${r.embalagem.map((e) => `${qtdBonita(e.qtd)} ${e.unidade} ${e.insumo}`).join(", ")})`);
    if (r.maoDeObra) extras.push(`mão de obra ${R(r.maoDeObra)}`);
    L.push(`Lote com perda: ${R(r.custoLote)}. Por ${nomePorcao(r.unidadePorcao)}: ${R(r.custoPorcaoIngredientes)}${extras.length ? ` + ${extras.join(" + ")} = ${R(r.custoPorcao)}` : ""}.`);
    L.push("");
  }
  L.push("## Preço de compra usado");
  L.push("");
  for (const i of res.insumos) {
    const u = UNID_USUAL[i.familia];
    const partes = [`${qtdBonita(i.compra.qtd)} ${i.compra.unidade} por ${R(i.compra.preco)}, ou ${R(i.custoBase * u.fator)} ${u.artigo} ${u.nome}`];
    if (i.fc !== 1) partes.push(`fator de correção ${qtdBonita(i.fc)}`);
    if (i.densidade) partes.push(`densidade de ${qtdBonita(i.densidade)} g por ml`);
    if (i.pesoUn) partes.push(`cada unidade pesa ${qtdBonita(i.pesoUn)} g`);
    partes.push(i.data ? `Preço de ${br.fmt(i.data)}${i.fonte ? `, ${i.fonte}` : ""}` : `Preço sem data${i.fonte ? `, ${i.fonte}` : ""}`);
    L.push(`- **${i.nome}**${i.tipo === "embalagem" ? " (embalagem)" : ""} — ${partes.join(". ")}`);
  }
  L.push("");
  L.push(`Preço com mais de ${VALIDADE_PRECO} dias entra na lista do que conferir: a ficha decide errado com confiança quando o preço envelhece.`);
  L.push("");
  if (res.avisos.length) {
    L.push("## O que conferir");
    L.push("");
    for (const a of res.avisos) L.push(`- ${a}`);
    L.push("");
  }
  L.push("## Como refazer");
  L.push("");
  L.push(`Preço de compra mudou: edite o insumo na spec e rode \`node scripts/ficha-tecnica.js ${specNome}\`. Pra ver o efeito antes de mudar: \`--simular "Insumo=+15%"\`. A planilha \`ficha-tecnica.xlsx\` recalcula sozinha quando você troca o preço na aba Insumos.`);
  L.push("");
  return L.join("\n");
}

function markdownSimulacao(antes, depois, mudancas, specNome) {
  const cmp = compararCardapios(antes, depois);
  const L = [];
  L.push(`# Simulação — ${mudancas.map((m) => m.nome).join(", ")}`);
  L.push("");
  L.push(`Gerado em ${br.fmt(new Date())} a partir de \`${specNome}\`. A spec e a planilha não foram alteradas.`);
  L.push("");
  L.push("## O que mudou na compra");
  L.push("");
  L.push("| Insumo | Preço antes | Preço depois | Variação |");
  L.push("|---|---|---|---|");
  for (const m of mudancas) L.push(`| ${m.nome} | ${R(m.de)} | ${R(m.para)} | ${P((m.para - m.de) / m.de, 1)} |`);
  L.push("");
  L.push("## Efeito em cada item");
  L.push("");
  L.push("| Item | Custo antes | Custo depois | Variação | Lucro real antes | Lucro real depois | Sugerido antes | Sugerido depois |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const c of cmp) L.push(`| ${c.nome} | ${R(c.custoAntes)} | ${R(c.custoDepois)} | ${c.delta >= 0 ? "+" : ""}${R(c.delta)} (${P(c.deltaFracao, 1)}) | ${P(c.lucroAntes, 0)} | ${P(c.lucroDepois, 0)} | ${R(c.sugeridoAntes)} | ${R(c.sugeridoDepois)} |`);
  L.push("");
  const viraram = cmp.filter((c) => c.situacaoAntes !== c.situacaoDepois);
  if (viraram.length) {
    L.push("## Quem muda de situação");
    L.push("");
    for (const c of viraram) L.push(`- **${c.nome}** — de "${c.situacaoAntes}" pra "${c.situacaoDepois}" no preço atual de ${R(c.precoAtual)}`);
    L.push("");
  } else {
    L.push("Nenhum item muda de situação com essa alteração.");
    L.push("");
  }
  return L.join("\n");
}

// ─────────────────────────── saída: planilha ───────────────────────────

function specPlanilha(res, spec) {
  const insumos = res.insumos.map((i) => [i.nome, i.tipo, i.compra.qtd, i.compra.unidade, i.compra.preco, i.fatorCompra, i.fc, null, i.fonte || null, i.data ? br.fmt(i.data) : null]);
  const receitas = [];
  for (const r of res.receitas) {
    for (const l of r.ingredientes) receitas.push([r.nome, "Ingrediente", l.insumo, l.qtd, l.unidade, l.qtdBase / l.qtd, l.bruto ? "sim" : "não", null, null]);
    for (const e of r.embalagem) receitas.push([r.nome, "Embalagem", e.insumo, e.qtd, e.unidade, e.qtdBase / e.qtd, "não", null, null]);
  }
  const cardapio = res.receitas.map((r) => [r.nome, null, r.perda, null, r.rendimento, null, null, r.maoDeObra, null, r.despesas, r.lucroAlvo, null, r.precoAtual, null, null, null]);
  const I = "Insumos", Rc = "Receitas";
  return {
    titulo: `Ficha técnica${res.negocio ? ` — ${res.negocio}` : ""}`,
    autor: res.negocio || "Contex OS",
    abas: [
      {
        nome: I,
        colunas: [
          { titulo: "Insumo", tipo: "texto", largura: 28 },
          { titulo: "Tipo", opcoes: ["ingrediente", "embalagem"] },
          { titulo: "Qtd comprada", tipo: "numero" },
          { titulo: "Unidade", opcoes: ["kg", "g", "L", "ml", "un", "dz", "cento"] },
          { titulo: "Preço da compra", tipo: "moeda" },
          { titulo: "Unid. base por unid. compra", tipo: "numero" },
          { titulo: "FC", tipo: "numero" },
          { titulo: "Custo por unid. base", tipo: "numero", formula: '=SE(OU(A{n}="";C{n}*F{n}=0);"";E{n}/(C{n}*F{n}))' },
          { titulo: "Fonte do preço", tipo: "texto", largura: 22 },
          { titulo: "Data do preço", tipo: "data" },
        ],
        linhas: insumos, linhasExtras: 15, congelar: true, filtro: true,
      },
      {
        nome: Rc,
        colunas: [
          { titulo: "Receita", tipo: "texto", largura: 26 },
          { titulo: "Tipo", opcoes: ["Ingrediente", "Embalagem"] },
          { titulo: "Insumo", tipo: "texto", largura: 26 },
          { titulo: "Qtd", tipo: "numero" },
          { titulo: "Unidade", opcoes: ["kg", "g", "L", "ml", "un", "dz", "cento"] },
          { titulo: "Unid. base por unid. da receita", tipo: "numero" },
          { titulo: "Qtd já é peso bruto", opcoes: ["não", "sim"] },
          { titulo: "FC", tipo: "numero", formula: `=SE(C{n}="";"";SE(OU(B{n}="Embalagem";G{n}="sim");1;PROCV(C{n};${I}!A{${I}.primeira}:H{${I}.ultima};7;FALSO)))` },
          { titulo: "Custo", tipo: "moeda", formula: `=SE(C{n}="";"";D{n}*F{n}*H{n}*PROCV(C{n};${I}!A{${I}.primeira}:H{${I}.ultima};8;FALSO))` },
        ],
        linhas: receitas, linhasExtras: 30, congelar: true, filtro: true,
      },
      {
        nome: "Cardápio",
        colunas: [
          { titulo: "Item", tipo: "texto", largura: 26 },
          { titulo: "Custo ingredientes (lote)", tipo: "moeda", formula: `=SE(A{n}="";"";SOMASES(${Rc}!I{${Rc}.primeira}:I{${Rc}.ultima};${Rc}!A{${Rc}.primeira}:A{${Rc}.ultima};A{n};${Rc}!B{${Rc}.primeira}:B{${Rc}.ultima};"Ingrediente"))` },
          { titulo: "Perda", tipo: "percentual" },
          { titulo: "Custo do lote c/ perda", tipo: "moeda", formula: '=SE(A{n}="";"";B{n}/(1-C{n}))' },
          { titulo: "Rendimento (porções)", tipo: "numero" },
          { titulo: "Ingredientes por porção", tipo: "moeda", formula: '=SE(A{n}="";"";SE(E{n}=0;0;D{n}/E{n}))' },
          { titulo: "Embalagem por porção", tipo: "moeda", formula: `=SE(A{n}="";"";SOMASES(${Rc}!I{${Rc}.primeira}:I{${Rc}.ultima};${Rc}!A{${Rc}.primeira}:A{${Rc}.ultima};A{n};${Rc}!B{${Rc}.primeira}:B{${Rc}.ultima};"Embalagem"))` },
          { titulo: "Mão de obra por porção", tipo: "moeda" },
          { titulo: "Custo por porção", tipo: "moeda", formula: '=SE(A{n}="";"";F{n}+G{n}+H{n})' },
          { titulo: "Despesas", tipo: "percentual" },
          { titulo: "Lucro alvo", tipo: "percentual" },
          { titulo: "Preço sugerido", tipo: "moeda", formula: '=SE(A{n}="";"";SE(1-J{n}-K{n}<=0;0;I{n}/(1-J{n}-K{n})))' },
          { titulo: "Preço atual", tipo: "moeda" },
          { titulo: "CMV", tipo: "percentual", formula: '=SE(A{n}="";"";SE(M{n}=0;0;I{n}/M{n}))' },
          { titulo: "Lucro real", tipo: "percentual", formula: '=SE(A{n}="";"";SE(M{n}=0;0;(M{n}-I{n}-J{n}*M{n})/M{n}))' },
          { titulo: "Situação", tipo: "texto", formula: `=SE(A{n}="";"";SE(M{n}=0;"sem preço";SE(O{n}<0;"prejuízo";SE(O{n}<K{n};"abaixo da meta";"dá lucro"))))` },
        ],
        linhas: cardapio, linhasExtras: 10, congelar: true, filtro: true, imprimir: "paisagem",
      },
      {
        nome: "Como usar",
        texto: [
          "# Como usar esta planilha",
          "Só três abas têm digitação: Insumos (quantidade e preço da compra, FC, fonte e data), Receitas (quanto de cada insumo entra) e, no Cardápio, as colunas Perda, Rendimento, Mão de obra, Despesas, Lucro alvo e Preço atual. O resto é fórmula: não digite por cima.",
          "Preço de compra mudou: troque o valor na aba Insumos. Toda receita que usa aquele insumo recalcula no Cardápio.",
          "## Unidades",
          "A coluna 'Unid. base por unid. compra' converte a compra pra grama, mililitro ou unidade (kg = 1000, L = 1000, dz = 12, g/ml/un = 1). Na aba Receitas, a coluna 'Unid. base por unid. da receita' faz o mesmo com a quantidade da receita. Se você trocar a unidade de uma linha, ajuste esse número também, senão o custo sai mil vezes errado.",
          "## FC (fator de correção)",
          "Peso bruto dividido por peso limpo. Cenoura descascada perde cerca de 20%, então FC = 1,25: você paga 125 g pra usar 100 g. Insumo sem perda (farinha, açúcar, leite) fica em 1. Tabela de referência em templates/financeiro/ficha-tecnica.md.",
          "A coluna 'Qtd já é peso bruto' da aba Receitas resolve o caso em que a quantidade da receita já é o que você compra: 3 ovos contados, 1 kg de frango com osso. Nessas linhas o FC vira 1 pra não cobrar a perda duas vezes.",
          "## Data do preço",
          "A aba Insumos tem fonte e data de cada preço. Preço com mais de 60 dias merece uma volta ao fornecedor antes de qualquer decisão de reajuste.",
          "## A fórmula do preço",
          "Preço sugerido = custo por porção ÷ (1 − despesas − lucro alvo). Com despesas de 30% e lucro de 20%, um custo de R$ 5,00 vira R$ 10,00. Despesas é o rateio dos custos fixos e variáveis sobre o faturamento: sai do fechamento do mês (/caixa).",
          "Situação compara o preço atual com a meta: 'prejuízo' quando o preço não cobre custo mais despesas; 'abaixo da meta' quando sobra menos que o lucro alvo; 'dá lucro' quando bate.",
        ],
      },
    ],
  };
}

function gerarPlanilha(res, spec, saidaXlsx) {
  const specP = specPlanilha(res, spec);
  const tmp = path.join(os.tmpdir(), `ficha-tecnica-${process.pid}.planilha.json`);
  fs.writeFileSync(tmp, JSON.stringify(specP, null, 2));
  try {
    // o gerador só cala com a flag de linha de comando; o resumo dele é substituído pelo daqui
    const log = console.log;
    console.log = () => {};
    let out;
    try { out = planilha.gerar(tmp, saidaXlsx, { sobrescrever: true }); } finally { console.log = log; }
    // conferir que a planilha chegou ao mesmo custo por porção que o script
    const grade = out.abas.find((a) => a.nome === "Cardápio");
    const diverge = [];
    res.receitas.forEach((r, i) => {
      const linha = grade.primeira + i;
      const cel = grade.grade.get(`I${linha}`);
      if (!cel || typeof cel.calc !== "number") { diverge.push(`${r.nome}: célula I${linha} sem valor calculado`); return; }
      if (Math.abs(cel.calc - r.custoPorcao) > 0.005) diverge.push(`${r.nome}: script ${R(r.custoPorcao)} × planilha ${R(cel.calc)}`);
      const sit = grade.grade.get(`P${linha}`);
      if (!sit || sit.calc !== r.situacao) diverge.push(`${r.nome}: situação "${r.situacao}" no script, "${sit ? sit.calc : "?"}" na planilha`);
    });
    const abas = out.abas.map((x) => ({ nome: x.nome, colunas: x.textoSo ? 0 : x.colunas.length, linhas: x.textoSo ? x.ultimaLinha : Math.max(0, x.ultima - x.primeira + 1) }));
    return { saida: out.saida, nFormulas: out.nFormulas, comErro: out.comErro, diverge, abas };
  } finally { try { fs.unlinkSync(tmp); } catch (_) { /* nada */ } }
}

// ─────────────────────────── exemplo ───────────────────────────

const HOJE = br.fmt(new Date());
const EXEMPLO = {
  negocio: "Confeitaria exemplo",
  despesas_pct: 30,
  lucro_pct: 20,
  insumos: [
    { nome: "Farinha de trigo", compra: { qtd: 5, unidade: "kg", preco: 22.9 }, fc: 1, fonte: "nota do atacado", data: HOJE },
    { nome: "Açúcar", compra: { qtd: 5, unidade: "kg", preco: 19.5 }, fc: 1, fonte: "nota do atacado", data: HOJE },
    { nome: "Ovo", compra: { qtd: 30, unidade: "un", preco: 24 }, fc: 1.13, peso_un: 50, fonte: "nota do atacado", data: HOJE },
    { nome: "Óleo", compra: { qtd: 900, unidade: "ml", preco: 7.49 }, fc: 1, densidade: 0.92, fonte: "nota do atacado", data: HOJE },
    { nome: "Cenoura", compra: { qtd: 1, unidade: "kg", preco: 5.99 }, fc: 1.25, fonte: "feira", data: HOJE },
    { nome: "Chocolate em pó", compra: { qtd: 1, unidade: "kg", preco: 38 }, fc: 1, fonte: "nota do atacado", data: HOJE },
    { nome: "Leite condensado", compra: { qtd: 395, unidade: "g", preco: 6.9 }, fc: 1, fonte: "mercado", data: HOJE },
    { nome: "Fermento", compra: { qtd: 100, unidade: "g", preco: 4.5 }, fc: 1, fonte: "mercado", data: HOJE },
    { nome: "Caixa de bolo", tipo: "embalagem", compra: { qtd: 50, unidade: "un", preco: 95 }, fonte: "loja de embalagem", data: HOJE },
    { nome: "Forminha de brigadeiro", tipo: "embalagem", compra: { qtd: 100, unidade: "un", preco: 6.5 }, fonte: "loja de embalagem", data: HOJE },
  ],
  receitas: [
    {
      nome: "Bolo de cenoura com cobertura",
      rendimento: { qtd: 12, unidade: "fatia" },
      perda_pct: 5,
      preco_atual: 8,
      mao_de_obra: { minutos: 40, custo_hora: 20 },
      ingredientes: [
        { insumo: "Cenoura", qtd: 300, unidade: "g" },
        { insumo: "Ovo", qtd: 3, unidade: "un", bruto: true },
        { insumo: "Óleo", qtd: 200, unidade: "ml" },
        { insumo: "Açúcar", qtd: 350, unidade: "g" },
        { insumo: "Farinha de trigo", qtd: 300, unidade: "g" },
        { insumo: "Fermento", qtd: 15, unidade: "g" },
        { insumo: "Chocolate em pó", qtd: 60, unidade: "g" },
        { insumo: "Leite condensado", qtd: 395, unidade: "g" },
      ],
      embalagem: [{ insumo: "Caixa de bolo", qtd: 1, unidade: "un" }],
    },
    {
      nome: "Brigadeiro",
      rendimento: { qtd: 25, unidade: "un" },
      perda_pct: 3,
      preco_atual: 2.5,
      ingredientes: [
        { insumo: "Leite condensado", qtd: 395, unidade: "g" },
        { insumo: "Chocolate em pó", qtd: 40, unidade: "g" },
      ],
      embalagem: [{ insumo: "Forminha de brigadeiro", qtd: 1, unidade: "un" }],
    },
  ],
};

// ─────────────────────────── CLI ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function lerArgs(argv) {
  const a = { simular: [], posicionais: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--simular") a.simular.push(argv[++i]);
    else if (x === "--saida") a.saida = argv[++i];
    else if (x === "--json") a.json = true;
    else if (x === "--so-md") a.soMd = true;
    else if (x === "--silencioso") a.silencioso = true;
    else if (x === "--exemplo") { a.exemplo = true; if (argv[i + 1] && !argv[i + 1].startsWith("--")) a.exemploArquivo = argv[++i]; }
    else if (x === "--ajuda" || x === "-h" || x === "--help") a.ajuda = true;
    else if (x.startsWith("--")) morrer(`opção desconhecida: ${x}`, "Opções: --simular, --saida, --json, --so-md, --silencioso, --exemplo");
    else a.posicionais.push(x);
  }
  return a;
}

function main() {
  const a = lerArgs(process.argv.slice(2));
  const dizer = (m) => { if (!a.silencioso && !a.json) console.log(m); };
  if (a.ajuda) { console.log(fs.readFileSync(__filename, "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, "")); return; }
  if (a.exemplo) {
    const destino = a.exemploArquivo || "ficha-tecnica.json";
    if (fs.existsSync(destino)) morrer(`${destino} já existe. Dê outro nome ou apague antes`);
    fs.mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(EXEMPLO, null, 2) + "\n");
    dizer(`✔ ${destino} (spec de exemplo: 10 insumos, 2 receitas, preços fictícios datados de hoje). Troque pelos seus preços e rode: node scripts/ficha-tecnica.js ${destino}`);
    return;
  }
  const specPath = a.posicionais[0];
  if (!specPath) morrer("Falta a spec.", "Uso: node scripts/ficha-tecnica.js <spec.json> [--simular \"Insumo=+15%\"]. Pra começar do zero: --exemplo");
  if (!fs.existsSync(specPath)) morrer(`Não achei ${specPath}`);
  let spec;
  try { spec = JSON.parse(fs.readFileSync(specPath, "utf8").replace(/^﻿/, "")); }
  catch (e) { morrer(`A spec não é JSON válido: ${e.message}`, "Quase sempre é vírgula sobrando antes de } ou ], aspas faltando num nome de campo, ou vírgula decimal em número (use 22.90, não 22,90)"); }

  const pasta = a.saida || path.dirname(path.resolve(specPath));
  const specNome = path.basename(specPath);
  let res;
  try { res = calcular(spec); }
  catch (e) { if (e instanceof ErroFicha) morrer(e.message); throw e; }

  if (a.simular.length) {
    let mudancas, depois;
    try {
      mudancas = a.simular.map(lerSimulacao);
      depois = calcular(aplicarSimulacao(spec, mudancas));
    } catch (e) { if (e instanceof ErroFicha) morrer(e.message); throw e; }
    const cmp = compararCardapios(res, depois);
    const md = markdownSimulacao(res, depois, mudancas, specNome);
    fs.mkdirSync(pasta, { recursive: true });
    const apelido = br.slug(mudancas.map((m) => m.nome).join(" ")).slice(0, 40).replace(/-+$/, "");
    const saidaMd = path.join(pasta, `simulacao-${br.iso(new Date())}${apelido ? `-${apelido}` : ""}.md`);
    fs.writeFileSync(saidaMd, md);
    if (a.json) { console.log(JSON.stringify({ mudancas, itens: cmp, arquivo: saidaMd }, null, 2)); return; }
    dizer(`\n✔ ${saidaMd}`);
    for (const m of mudancas) dizer(`  ${m.nome}: ${R(m.de)} → ${R(m.para)} (${P((m.para - m.de) / m.de, 1)})`);
    dizer("");
    for (const c of cmp) dizer(`  ${c.nome.padEnd(34)} custo ${R(c.custoAntes)} → ${R(c.custoDepois)} (${c.delta >= 0 ? "+" : ""}${P(c.deltaFracao, 1)})  lucro real ${P(c.lucroAntes, 0)} → ${P(c.lucroDepois, 0)}${c.situacaoAntes !== c.situacaoDepois ? `  ⚠ ${c.situacaoAntes} → ${c.situacaoDepois}` : ""}`);
    dizer("");
    return;
  }

  fs.mkdirSync(pasta, { recursive: true });
  const saidaMd = path.join(pasta, "cardapio-margem.md");
  fs.writeFileSync(saidaMd, markdownCardapio(res, specNome));
  let plan = null;
  if (!a.soMd) {
    try { plan = gerarPlanilha(res, spec, path.join(pasta, "ficha-tecnica.xlsx")); }
    catch (e) { morrer(`Calculei, gravei ${saidaMd}, mas a planilha falhou: ${e.message}`); }
  }

  if (a.json) { console.log(JSON.stringify({ ...res, arquivos: { markdown: saidaMd, planilha: plan && plan.saida }, planilha: plan }, null, 2)); return; }

  dizer(`\n✔ ${saidaMd}`);
  if (plan) {
    dizer(`✔ ${plan.saida} (${plan.nFormulas} fórmulas${plan.comErro.length ? `, ${plan.comErro.length} com erro` : ", todas calculadas"})`);
    for (const x of plan.abas) dizer(`  aba "${x.nome}": ${x.colunas ? `${x.colunas} colunas, ${x.linhas} linhas (contando as em branco pra digitar)` : `${x.linhas} parágrafos`}`);
    for (const e of plan.comErro.slice(0, 5)) dizer(`  ⚠ ${e}`);
    for (const d of plan.diverge) dizer(`  ⚠ planilha e script divergem em ${d}`);
    if (!plan.diverge.length) dizer(`  custo por porção e situação da planilha conferem com os do script em ${res.receitas.length} ${res.receitas.length === 1 ? "receita" : "receitas"}`);
  }
  dizer(`\n  Despesas ${Pp(res.despesas)} + lucro alvo ${Pp(res.lucro)} → preço = custo ÷ ${(1 - res.despesas - res.lucro).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}\n`);
  const ordem = [...res.receitas].sort((x, y) => (y.lucroRealFracao ?? -1) - (x.lucroRealFracao ?? -1));
  for (const r of ordem) {
    dizer(`  ${r.nome.padEnd(34)} custo ${R(r.custoPorcao).padStart(11)}  sugerido ${R(r.precoSugerido).padStart(11)}  atual ${(r.precoAtual === null ? "—" : R(r.precoAtual)).padStart(11)}  CMV ${P(r.cmv, 0).padStart(6)}  lucro real ${(r.lucroRealFracao === null ? "—" : P(r.lucroRealFracao, 0)).padStart(6)}  ${r.situacao}`);
  }
  if (res.avisos.length) { dizer(""); for (const w of res.avisos) dizer(`  ⚠ ${w}`); }
  dizer("");
}

module.exports = {
  UNIDADES, VALIDADE_PRECO, unidade, converterQtd, normalizarInsumo, precoSugerido, lucroReal, situacao, calcularReceita, calcular,
  lerSimulacao, aplicarSimulacao, compararCardapios, markdownCardapio, markdownSimulacao, specPlanilha, ErroFicha, EXEMPLO,
};

if (require.main === module) main();
