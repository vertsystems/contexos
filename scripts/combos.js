#!/usr/bin/env node
/**
 * Contex OS — combos.js
 * Lê o CSV de pedidos com itens (uma linha por item do pedido, do jeito que PDV,
 * iFood e Shopify exportam) mais o custo unitário que o dono informou, e escreve
 * o que sai junto: ticket médio, itens por pedido, a tabela de pares com
 * coocorrência, suporte, confiança e lift, e os combos com preço, desconto real
 * e margem conferida.
 *
 * Existe porque esse cálculo é de par, não de linha: são N·(N−1)/2 combinações
 * por pedido, e em 5 mil linhas ninguém faz isso de cabeça nem olhando a
 * planilha. E porque lift alto de item raro é miragem: dois itens que
 * apareceram juntos duas vezes em 900 pedidos dão lift 40 e não sustentam
 * cartaz nenhum. Aqui todo par passa por piso de volume, e o que ficou de fora
 * aparece numa lista separada com o motivo, em vez de sumir.
 *
 * Margem nunca é estimada: item sem custo informado sai como [a confirmar], e o
 * script diz cedo quais faltam em vez de inventar percentual.
 *
 * Uso:
 *   node scripts/combos.js <pedidos.csv> [opções]
 *   node scripts/combos.js modelo [pasta]          grava pedidos.csv e custos.csv de exemplo
 *   node scripts/combos.js <pedidos.csv> --ler     mostra o que o script entendeu do arquivo
 *
 * Opções:
 *   --custos <arq>           custo unitário por item: CSV (item;custo), o
 *                            `estoque/parametros.csv` do /estoque, ou o
 *                            `precos/ficha-tecnica.json` do /ficha-tecnica
 *   --custo "Item=12,90"     custo de um item na linha de comando (repetir pra cada um)
 *   --saida <arquivo.md>     grava o markdown em vez de imprimir
 *   --json                   imprime o resultado em JSON, pra outra ferramenta ler
 *   --mes AAAA-MM            rótulo do período (padrão: deduzido das datas, se houver coluna)
 *   --min-pedidos <n>        piso de pedidos em que o par precisa aparecer (padrão: 5)
 *   --min-item <n>           piso de pedidos de cada item do par (padrão: o mesmo do par)
 *   --pares <n>              quantos pares entram na tabela (padrão: 15)
 *   --combos <n>             quantos combos propor (padrão: 5)
 *   --desconto <pct>         desconto de vitrine do combo (padrão: 10)
 *   --margem-minima <pct>    margem abaixo da qual o combo é reprovado (padrão: 30)
 *   --reuso <n>              quantas vezes o mesmo item pode entrar em combos (padrão: 2)
 *   --ordem lift|volume      o que ordena a escolha dos combos (padrão: lift)
 *   --min-lift <n>           lift abaixo disso não vira combo (padrão: 1,2)
 *   --valor linha|unitario   o que a coluna de valor significa (padrão: deduzido do nome)
 *   --sem-arredondar         não termina o preço do combo em ,90
 *   --excluir "Sacola, Taxa"  tira da conta item de operação, que vai em todo pedido
 *   --juntar "Coca lata=Coca 350, Coca-cola lata"
 *                            costura cadastro duplicado do mesmo produto
 *
 * Molde do arquivo de pedidos (cabeçalho obrigatório, `;` ou `,`):
 *   pedido;item;qtd;valor            uma linha por item; valor é o total da linha
 *   opcional: data
 *   Nome de coluna de PDV, iFood e Shopify é reconhecido por apelido
 *   (order_id, ID do pedido, Name, Lineitem name, Lineitem quantity...).
 *
 * Molde do arquivo de custos:
 *   item;custo                       custo unitário, sem imposto sobre a venda
 *   toda coluna que identifica o item (nome, sku, código) vira chave, então
 *   `estoque/parametros.csv` entra direto; `.json` é lido como ficha técnica
 *
 * Node 18+, sem dependência. Usa scripts/br.js (número, moeda, slug, datas) e
 * scripts/gerar-planilha.js (leitura de CSV).
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const PADRAO = {
  minPedidos: 5,
  pares: 15,
  combos: 5,
  desconto: 10,
  margemMinima: 30,
  reuso: 2,
  ordem: "lift",
  minLift: 1.2,
  maxItensPorPedido: 60,
};

// ─────────────────────────── leitura ───────────────────────────

/** Decodifica como UTF-8 se for UTF-8 válido; senão como Windows-1252 (o export de PDV antigo). */
function decodificar(buf) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch (e) {
    return new TextDecoder("windows-1252").decode(buf).replace(/^﻿/, "");
  }
}

function linhasDe(arquivo) {
  if (!fs.existsSync(arquivo)) {
    throw new Error(`arquivo não encontrado: ${arquivo}`);
  }
  const ext = path.extname(arquivo).toLowerCase();
  const planilha = require("./gerar-planilha.js");
  if (ext === ".xlsx" || ext === ".xlsm") {
    throw new Error(
      "esta skill lê CSV. Exporte a planilha como CSV (no Excel: Arquivo > Salvar como > CSV) e rode de novo\n" +
      "  pra só olhar o conteúdo do .xlsx: node scripts/gerar-planilha.js --ler " + arquivo
    );
  }
  return planilha.parseCsv(decodificar(fs.readFileSync(arquivo))).linhas;
}

/** Normaliza nome de coluna: minúsculo, sem acento, sublinhado. */
function chave(s) {
  return br.semAcento(String(s || "")).trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// A ordem de cada lista é a ordem de preferência, e isso importa: no
// `orders_export.csv` da Shopify a coluna "Subtotal" (total do pedido, em branco
// da segunda linha em diante) vem antes de "Lineitem price". Casando por posição,
// o script perderia todas as linhas menos a primeira de cada pedido. Por isso o
// nome de coluna de nível de item vem sempre antes do de nível de pedido.
const ALIAS_PEDIDOS = {
  pedido: ["pedido", "id_do_pedido", "id_pedido", "pedido_id", "numero_do_pedido", "numero_pedido",
    "order_id", "order_number", "order", "id_venda", "venda", "cupom_fiscal", "cupom",
    "comanda", "numero_da_nota", "nota", "ticket", "name"],
  item: ["lineitem_name", "nome_do_item", "nome_item", "nome_do_produto", "descricao_do_produto",
    "descricao_item", "produto", "item", "descricao", "nome",
    "lineitem_sku", "sku", "codigo_do_produto"],
  qtd: ["lineitem_quantity", "qtd_item", "quantidade_item", "qtd", "qtde", "quantidade", "qte", "quant"],
  valor: ["valor_total_do_item", "valor_do_item", "total_do_item", "total_item", "subtotal_do_item",
    "lineitem_price", "preco_unitario", "valor_unitario", "preco_do_item",
    "valor_total", "valor", "subtotal", "total", "preco"],
  data: ["data_do_pedido", "data_pedido", "data_da_venda", "data_venda", "data_emissao", "emissao",
    "data", "dia", "paid_at", "created_at"],
};

const ALIAS_CUSTOS = {
  item: ["item", "produto", "nome_do_item", "nome_item", "descricao_do_produto", "nome",
    "descricao", "sku", "codigo_do_produto", "codigo"],
  custo: ["custo_unitario", "custo", "preco_de_custo", "custo_medio", "custo_do_item", "cmv"],
};

/** Toda coluna que identifica o item serve de chave no arquivo de custos. */
const CHAVES_DE_CUSTO = new Set([...ALIAS_CUSTOS.item, "sku", "codigo", "cod", "codigo_do_produto", "lineitem_sku"]);

/** Mesma regra de chave nos dois arquivos, senão custo e pedido não casam. */
function slugItem(nome) {
  const t = String(nome || "").trim().replace(/\s+/g, " ");
  return br.slug(t) || t.toLowerCase();
}

/** Acha a linha do cabeçalho e o índice de cada coluna do molde. */
function cabecalho(linhas, alias, obrigatorias) {
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const chaves = linhas[i].map(chave);
    const idx = {};
    const tomadas = new Set();
    for (const [campo, nomes] of Object.entries(alias)) {
      for (const nome of nomes) {
        const c = chaves.findIndex((k, j) => k === nome && !tomadas.has(j));
        if (c >= 0) { idx[campo] = c; tomadas.add(c); break; }
      }
    }
    if (obrigatorias.every((campo) => idx[campo] !== undefined)) return { linha: i, idx, chaves };
  }
  return null;
}

/**
 * Aceita "AAAA-MM-DD 10:00:00 -0300" e "02/09/2026 10:00", que é como loja
 * virtual e PDV gravam a data. `br.lerData` sozinho devolveria null nos dois.
 */
function lerDataFlex(v) {
  const t = String(v ?? "").trim();
  if (!t) return null;
  return br.lerData(t) || br.lerData(t.split(/[ T]/)[0]);
}

/** Nome de coluna decide se o valor é da linha ou de uma unidade. */
function semanticaDoValor(nomeColuna) {
  const k = chave(nomeColuna);
  if (/unitario|^preco$|lineitem_price|preco_do_item/.test(k)) return "unitario";
  if (/total|subtotal|^valor/.test(k)) return "linha";
  return "linha";
}

function lerPedidos(arquivo, opcoes = {}) {
  const linhas = linhasDe(arquivo);
  const cab = cabecalho(linhas, ALIAS_PEDIDOS, ["pedido", "item", "qtd", "valor"]);
  if (!cab) {
    throw new Error(
      "o arquivo não está no molde: a linha de cabeçalho precisa ter pedido, item, qtd e valor\n" +
      `  primeira linha lida: ${(linhas[0] || []).join(" | ").slice(0, 140) || "(vazia)"}\n` +
      "  pra ver o molde preenchido: node scripts/combos.js modelo dados/"
    );
  }
  const nomeValor = linhas[cab.linha][cab.idx.valor];
  const semantica = opcoes.valor || semanticaDoValor(nomeValor);
  const avisos = [];
  const itens = [];
  const juntar = opcoes.juntar instanceof Map ? opcoes.juntar : new Map();
  const excluir = opcoes.excluir instanceof Set ? opcoes.excluir : new Set();
  const juntou = new Set();
  const excluiu = new Map();
  let puladas = 0;
  let semData = 0;
  let devolucoes = 0;
  const exemplos = [];
  for (let i = cab.linha + 1; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l || !l.some((c) => String(c).trim() !== "")) continue;
    const pedido = String(l[cab.idx.pedido] ?? "").trim();
    const nome = String(l[cab.idx.item] ?? "").trim().replace(/\s+/g, " ");
    const qtd = br.numero(l[cab.idx.qtd]);
    const valor = br.numero(l[cab.idx.valor]);
    if (!pedido || !nome) { puladas++; continue; }
    if (!isFinite(qtd) || !isFinite(valor)) { puladas++; continue; }
    if (qtd <= 0 || valor < 0) {
      devolucoes++;
      if (exemplos.length < 3) exemplos.push(`linha ${i + 1}, ${nome} (qtd ${l[cab.idx.qtd]}, valor ${l[cab.idx.valor]})`);
      continue;
    }
    let data = null;
    if (cab.idx.data !== undefined && String(l[cab.idx.data] ?? "").trim() !== "") {
      data = lerDataFlex(l[cab.idx.data]);
      if (!data) semData++;
    }
    let rotulo = nome;
    let chaveItem = slugItem(nome);
    // Cadastro duplicado do mesmo produto ("Coca 350", "Coca lata") divide o item
    // em dois e afunda o lift dos dois. `--juntar` costura antes de contar.
    const alvo = juntar.get(chaveItem);
    if (alvo) { juntou.add(chaveItem); rotulo = alvo.nome; chaveItem = alvo.slug; }
    // Item que vai em todo pedido (sacola, taxa de entrega, embalagem) não é
    // escolha do cliente: infla suporte com lift perto de um. `--excluir` tira.
    if (excluir.has(chaveItem)) {
      excluiu.set(chaveItem, (excluiu.get(chaveItem) || 0) + 1);
      continue;
    }
    itens.push({
      pedido,
      nome: rotulo,
      slug: chaveItem,
      qtd,
      total: semantica === "unitario" ? br.centavos(valor * qtd) : br.centavos(valor),
      data,
    });
  }
  const linhas_ = (n) => (n === 1 ? "1 linha" : `${n} linhas`);
  if (excluiu.size) {
    const total = [...excluiu.values()].reduce((a, b) => a + b, 0);
    avisos.push(`${linhas_(total)} de item excluído por \`--excluir\` ${total === 1 ? "saiu" : "saíram"} da conta: ${[...excluiu.keys()].join(", ")}. Item de operação não é escolha do cliente, e deixar ele dentro infla o suporte de todo par`);
  }
  const excluirSemUso = [...excluir].filter((k) => !excluiu.has(k));
  if (excluirSemUso.length) avisos.push(`\`--excluir\` não achou item nenhum com ${excluirSemUso.join(", ")} — conferir o nome do jeito que ele está no CSV`);
  const juntarSemUso = [...juntar.keys()].filter((k) => !juntou.has(k));
  if (juntarSemUso.length) avisos.push(`\`--juntar\` não achou ${juntarSemUso.join(", ")} no arquivo — conferir o nome do jeito que ele está no CSV`);
  if (puladas) avisos.push(`${linhas_(puladas)} sem pedido, item, quantidade ou valor legível ${puladas === 1 ? "ficou" : "ficaram"} fora da conta`);
  if (devolucoes) avisos.push(`${linhas_(devolucoes)} com quantidade zero ou negativa, ou valor negativo, ${devolucoes === 1 ? "ficou" : "ficaram"} fora da conta (devolução, estorno, cancelamento). Exemplo: ${exemplos.join("; ")}`);
  if (semData) avisos.push(`${linhas_(semData)} com data que não existe ou em formato não reconhecido — o período pode sair incompleto`);
  if (!itens.length) {
    throw new Error("nenhuma linha de item legível no arquivo — conferir separador, cabeçalho e formato de número");
  }
  return { itens, avisos, semantica, colunaValor: nomeValor, linhasLidas: linhas.length - cab.linha - 1 };
}

/**
 * Lê o custo unitário informado pelo dono. Indexa por toda coluna que identifica
 * o item (nome e SKU), porque `estoque/parametros.csv` tem os dois e o CSV de
 * pedidos pode usar qualquer um. Devolve o mapa e a lista de linhas, pra dizer
 * depois qual linha de custo não casou com nenhum item vendido.
 */
function lerCustos(arquivo) {
  if (/\.json$/i.test(arquivo)) return lerCustosDaFicha(arquivo);
  const linhas = linhasDe(arquivo);
  const cab = cabecalho(linhas, ALIAS_CUSTOS, ["item", "custo"]);
  if (!cab) {
    throw new Error(
      "o arquivo de custos não está no molde: a linha de cabeçalho precisa ter item e custo\n" +
      `  primeira linha lida: ${(linhas[0] || []).join(" | ").slice(0, 140) || "(vazia)"}\n` +
      "  pra ver o molde preenchido: node scripts/combos.js modelo dados/"
    );
  }
  const colunasChave = cab.chaves
    .map((k, j) => (CHAVES_DE_CUSTO.has(k) ? j : -1))
    .filter((j) => j >= 0);
  const custos = new Map();
  const itens = [];
  for (let i = cab.linha + 1; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l) continue;
    const v = br.numero(l[cab.idx.custo]);
    if (!isFinite(v) || v < 0) continue;
    const chaves = [];
    for (const j of colunasChave) {
      const k = slugItem(l[j]);
      if (k && !chaves.includes(k)) chaves.push(k);
    }
    if (!chaves.length) continue;
    for (const k of chaves) custos.set(k, br.centavos(v));
    itens.push({ rotulo: String(l[cab.idx.item] ?? chaves[0]).trim(), chaves, custo: br.centavos(v) });
  }
  if (!custos.size) {
    throw new Error(`nenhuma linha de custo legível em ${arquivo} — conferir separador e formato de número (1,80 e não 1.80)`);
  }
  return { custos, itens };
}

/**
 * Custo por porção vindo do `precos/ficha-tecnica.json` do `/ficha-tecnica`:
 * quem produz já tem o custo calculado ali e não precisa digitar de novo.
 */
function lerCustosDaFicha(arquivo) {
  if (!fs.existsSync(arquivo)) throw new Error(`arquivo não encontrado: ${arquivo}`);
  let spec;
  try {
    spec = JSON.parse(decodificar(fs.readFileSync(arquivo)));
  } catch (e) {
    throw new Error(`${arquivo} não é um JSON válido: ${e.message}`);
  }
  let res;
  try {
    res = require("./ficha-tecnica.js").calcular(spec);
  } catch (e) {
    throw new Error(
      `${arquivo} não é uma ficha técnica que fecha: ${e.message}\n` +
      `  conferir com: node scripts/ficha-tecnica.js ${arquivo}`
    );
  }
  const custos = new Map();
  const itens = [];
  for (const r of res.receitas) {
    const k = slugItem(r.nome);
    if (!k) continue;
    const custo = br.centavos(r.custoPorcao);
    custos.set(k, custo);
    itens.push({ rotulo: r.nome, chaves: [k], custo });
  }
  if (!custos.size) throw new Error(`nenhuma receita com custo em ${arquivo}`);
  return { custos, itens };
}

// ─────────────────────────── cálculo ───────────────────────────

/**
 * Agrupa as linhas em pedidos. Presença é por pedido: o item que aparece em
 * duas linhas do mesmo pedido conta uma vez no par e soma quantidade e valor.
 */
function agrupar(itens) {
  const pedidos = new Map();
  const catalogo = new Map();
  for (const it of itens) {
    let p = pedidos.get(it.pedido);
    if (!p) { p = { id: it.pedido, itens: new Map(), receita: 0, qtd: 0, data: it.data }; pedidos.set(it.pedido, p); }
    if (!p.data && it.data) p.data = it.data;
    p.receita = br.centavos(p.receita + it.total);
    p.qtd += it.qtd;
    p.itens.set(it.slug, (p.itens.get(it.slug) || 0) + it.qtd);

    let c = catalogo.get(it.slug);
    if (!c) { c = { slug: it.slug, rotulos: new Map(), pedidos: 0, qtd: 0, receita: 0 }; catalogo.set(it.slug, c); }
    c.rotulos.set(it.nome, (c.rotulos.get(it.nome) || 0) + 1);
    c.qtd += it.qtd;
    c.receita = br.centavos(c.receita + it.total);
  }
  for (const p of pedidos.values()) {
    for (const slug of p.itens.keys()) catalogo.get(slug).pedidos++;
  }
  for (const c of catalogo.values()) {
    c.nome = [...c.rotulos.entries()].sort((a, b) => b[1] - a[1])[0][0];
    c.precoMedio = c.qtd ? br.centavos(c.receita / c.qtd) : 0;
  }
  return { pedidos, catalogo };
}

/** Coocorrência de pares, contada por pedido. */
function pares(pedidos, catalogo, opcoes) {
  const N = pedidos.size;
  const bruto = new Map();
  let pedidosGrandes = 0;
  for (const p of pedidos.values()) {
    const chaves = [...p.itens.keys()].sort();
    if (chaves.length < 2) continue;
    if (chaves.length > opcoes.maxItensPorPedido) { pedidosGrandes++; continue; }
    for (let i = 0; i < chaves.length; i++) {
      for (let j = i + 1; j < chaves.length; j++) {
        const k = `${chaves[i]}|${chaves[j]}`;
        const atual = bruto.get(k);
        if (atual) { atual.n++; atual.receita = br.centavos(atual.receita + p.receita); }
        else bruto.set(k, { a: chaves[i], b: chaves[j], n: 1, receita: p.receita });
      }
    }
  }
  const todos = [];
  for (const par of bruto.values()) {
    const A = catalogo.get(par.a), B = catalogo.get(par.b);
    const suporte = par.n / N;
    const confAB = par.n / A.pedidos;
    const confBA = par.n / B.pedidos;
    const lift = (par.n * N) / (A.pedidos * B.pedidos);
    todos.push({
      a: A.nome, b: B.nome, slugA: A.slug, slugB: B.slug,
      n: par.n, pedidosA: A.pedidos, pedidosB: B.pedidos,
      suporte, confAB, confBA, lift,
      receitaPedidos: par.receita,
      precoCheio: br.centavos(A.precoMedio + B.precoMedio),
    });
  }
  const minItem = opcoes.minItem ?? opcoes.minPedidos;
  const dentro = [], fora = [];
  for (const p of todos) {
    if (p.n < opcoes.minPedidos) { fora.push({ ...p, motivo: `só ${p.n} ${p.n === 1 ? "pedido" : "pedidos"} com os dois; o piso é ${opcoes.minPedidos}` }); continue; }
    if (p.pedidosA < minItem || p.pedidosB < minItem) { fora.push({ ...p, motivo: `item de pouco giro (${Math.min(p.pedidosA, p.pedidosB)} ${Math.min(p.pedidosA, p.pedidosB) === 1 ? "pedido" : "pedidos"}); o piso é ${minItem}` }); continue; }
    dentro.push(p);
  }
  const ordem = (x, y) => (y.lift - x.lift) || (y.n - x.n) || x.a.localeCompare(y.a);
  dentro.sort(ordem);
  fora.sort((x, y) => y.n - x.n);
  return { dentro, fora, pedidosGrandes, combinacoes: todos.length };
}

/** Termina o preço em ,90 sem se afastar mais de um real do valor calculado. */
function arredondarNoventa(v) {
  if (v < 5) return br.centavos(v);
  const base = Math.floor(v);
  const opcoes = [br.centavos(base - 0.1), br.centavos(base + 0.9)];
  const escolha = opcoes.reduce((m, o) => (Math.abs(o - v) < Math.abs(m - v) ? o : m));
  return escolha > 0 ? escolha : br.centavos(v);
}

/**
 * Monta os combos a partir dos pares aprovados, sem repetir item além do reuso,
 * e confere a margem. Item sem custo informado não vira margem inventada.
 */
function montarCombos(paresDentro, catalogo, custos, opcoes) {
  const fila = opcoes.ordem === "volume"
    ? [...paresDentro].sort((x, y) => (y.n - x.n) || (y.lift - x.lift))
    : paresDentro;
  const usos = new Map();
  const combos = [];
  const d = opcoes.desconto / 100;
  const m = opcoes.margemMinima / 100;
  for (const par of fila) {
    if (combos.length >= opcoes.combos) break;
    if (par.lift < opcoes.minLift) continue;
    const usoA = usos.get(par.slugA) || 0, usoB = usos.get(par.slugB) || 0;
    if (usoA >= opcoes.reuso || usoB >= opcoes.reuso) continue;
    const cheio = par.precoCheio;
    const bruto = br.centavos(cheio * (1 - d));
    // Desconto zero é combo de conveniência: arredondar pra ,90 criaria um
    // desconto que ninguém pediu, então o preço fica igual à soma.
    let preco = opcoes.arredondar && d > 0 ? arredondarNoventa(bruto) : bruto;
    if (preco > cheio) preco = br.centavos(Math.floor(cheio) - 0.1) > 0 ? br.centavos(Math.floor(cheio) - 0.1) : cheio;
    const descontoReal = cheio > 0 ? (cheio - preco) / cheio : 0;
    const A = catalogo.get(par.slugA), B = catalogo.get(par.slugB);
    const ancora = A.pedidos >= B.pedidos ? A : B;
    const anexo = ancora === A ? B : A;
    const cA = custos.get(par.slugA), cB = custos.get(par.slugB);
    const temCusto = cA !== undefined && cB !== undefined;
    const custo = temCusto ? br.centavos(cA + cB) : null;
    const margem = temCusto && preco > 0 ? (preco - custo) / preco : null;
    // Teto de conversão: quem já leva os dois não converte, porque já está dentro
    // do par. Sobra quem leva a âncora sem o anexo, e esse número é o limite do
    // que o combo pode capturar no mês. Combo que precisa de mais que isso não se
    // paga, mesmo com margem aprovada.
    const tetoConversao = Math.max(0, ancora.pedidos - par.n);
    let veredito = "custo não informado", descontoMax = null, precoMinimo = null;
    let perda = null, ganhoNovo = null, pedidosNovos = null;
    if (temCusto) {
      precoMinimo = br.centavos(custo / (1 - m));
      descontoMax = cheio > 0 ? 1 - custo / (cheio * (1 - m)) : -1;
      // Quem já levava os dois passa a levar com desconto: essa é a perda.
      perda = br.centavos(par.n * (cheio - preco));
      // Quem levava só a âncora e passa a levar o combo: esse é o ganho.
      const margemAncora = br.centavos(ancora.precoMedio - custos.get(ancora.slug));
      ganhoNovo = br.centavos((preco - custo) - margemAncora);
      pedidosNovos = ganhoNovo > 0 ? Math.ceil(perda / ganhoNovo) : null;
      if (margem < m) veredito = "reprovado na margem";
      else if (perda === 0) veredito = "passa";
      else if (pedidosNovos === null) veredito = "o desconto come o ganho";
      else if (pedidosNovos > tetoConversao) veredito = "não se paga no volume do mês";
      else veredito = "passa";
    }
    combos.push({
      nome: `${par.a} + ${par.b}`,
      itens: [par.a, par.b],
      slugs: [par.slugA, par.slugB],
      pedidosJuntos: par.n, lift: par.lift, confAB: par.confAB, confBA: par.confBA,
      precoCheio: cheio, preco, descontoReal,
      custo, margem, margemMinima: m, precoMinimo,
      descontoMaximo: descontoMax,
      ancora: ancora.nome, anexo: anexo.nome,
      pedidosAncora: ancora.pedidos, tetoConversao,
      perdaNoDesconto: perda, ganhoPorPedidoNovo: ganhoNovo, pedidosNovosNecessarios: pedidosNovos,
      veredito,
      faltaCusto: [cA === undefined ? par.a : null, cB === undefined ? par.b : null].filter(Boolean),
    });
    usos.set(par.slugA, usoA + 1);
    usos.set(par.slugB, usoB + 1);
  }
  return combos;
}

function analisar(dados, custos, opcoes, custoItens) {
  const { pedidos, catalogo } = agrupar(dados.itens);
  const N = pedidos.size;
  let receita = 0, qtd = 0, umItem = 0, receitaUmItem = 0, receitaVarios = 0;
  let min = null, max = null;
  for (const p of pedidos.values()) {
    receita = br.centavos(receita + p.receita);
    qtd += p.qtd;
    if (p.itens.size === 1) { umItem++; receitaUmItem = br.centavos(receitaUmItem + p.receita); }
    else receitaVarios = br.centavos(receitaVarios + p.receita);
    if (p.data) {
      if (!min || p.data < min) min = p.data;
      if (!max || p.data > max) max = p.data;
    }
  }
  const distintos = [...pedidos.values()].reduce((s, p) => s + p.itens.size, 0);
  const resumo = {
    pedidos: N,
    itensVendidos: qtd,
    receita,
    ticketMedio: N ? br.centavos(receita / N) : 0,
    itensPorPedido: N ? qtd / N : 0,
    distintosPorPedido: N ? distintos / N : 0,
    pedidosUmItem: umItem,
    pedidosVariosItens: N - umItem,
    ticketUmItem: umItem ? br.centavos(receitaUmItem / umItem) : null,
    ticketVariosItens: N - umItem ? br.centavos(receitaVarios / (N - umItem)) : null,
    itensNoCatalogo: catalogo.size,
    primeiraData: min ? br.fmt(min) : null,
    ultimaData: max ? br.fmt(max) : null,
  };
  const p = pares(pedidos, catalogo, opcoes);
  const combos = montarCombos(p.dentro, catalogo, custos, opcoes);
  const maisVendidos = [...catalogo.values()].sort((a, b) => b.pedidos - a.pedidos || b.receita - a.receita);
  // O custo que trava a conta é o dos itens que entraram nos pares aprovados: o
  // dono não precisa levantar o custo do catálogo inteiro pra fechar cinco combos.
  const nosPares = new Set();
  for (const par of p.dentro) { nosPares.add(par.slugA); nosPares.add(par.slugB); }
  const semCusto = maisVendidos
    .filter((c) => !custos.has(c.slug))
    .map((c) => ({ nome: c.nome, slug: c.slug, pedidos: c.pedidos, precoMedio: c.precoMedio, nosPares: nosPares.has(c.slug) }))
    .sort((a, b) => (Number(b.nosPares) - Number(a.nosPares)) || (b.pedidos - a.pedidos))
    .slice(0, 30);
  const custosOrfaos = (custoItens || [])
    .filter((it) => !it.chaves.some((k) => catalogo.has(k)))
    .map((it) => it.rotulo);
  return { resumo, pares: p, combos, maisVendidos, semCusto, custosOrfaos, avisos: dados.avisos, opcoes };
}

// ─────────────────────────── saída ───────────────────────────

function num(v, casas = 2) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function markdown(r, meta) {
  const { resumo, opcoes } = r;
  const L = [];
  L.push(`# Combos — ${meta.periodo}`);
  L.push("");
  L.push(`Base: \`${meta.arquivo}\` — ${resumo.pedidos} pedidos, ${resumo.itensNoCatalogo} itens diferentes, ${num(resumo.itensVendidos, 0)} unidades vendidas. Calculado em ${meta.hoje}.`);
  L.push("");
  if (meta.comando) {
    L.push(`Comando que gerou esta página, pra repetir igual no mês que vem (a limpeza de catálogo vai nele):`);
    L.push("");
    L.push("```bash");
    L.push(meta.comando);
    L.push("```");
    L.push("");
  }
  L.push("## O tamanho do pedido hoje");
  L.push("");
  L.push("| Linha | Valor |");
  L.push("|---|---|");
  L.push(`| Pedidos | ${num(resumo.pedidos, 0)} |`);
  L.push(`| Receita dos pedidos | ${br.reais(resumo.receita)} |`);
  L.push(`| Ticket médio | ${br.reais(resumo.ticketMedio)} |`);
  L.push(`| Itens por pedido (unidades) | ${num(resumo.itensPorPedido)} |`);
  L.push(`| Itens diferentes por pedido | ${num(resumo.distintosPorPedido)} |`);
  L.push(`| Pedidos de um item só | ${num(resumo.pedidosUmItem, 0)} (${br.pct(resumo.pedidos ? resumo.pedidosUmItem / resumo.pedidos : 0, 1)}) |`);
  L.push(`| Ticket do pedido de um item | ${resumo.ticketUmItem === null ? "—" : br.reais(resumo.ticketUmItem)} |`);
  L.push(`| Ticket do pedido de dois ou mais | ${resumo.ticketVariosItens === null ? "—" : br.reais(resumo.ticketVariosItens)} |`);
  if (resumo.primeiraData) L.push(`| Período do arquivo | ${resumo.primeiraData} a ${resumo.ultimaData} |`);
  L.push("");
  if (resumo.ticketUmItem !== null && resumo.ticketVariosItens !== null) {
    const dif = br.centavos(resumo.ticketVariosItens - resumo.ticketUmItem);
    L.push(`O pedido com dois itens ou mais vale ${br.reais(dif)} a mais que o de um item só. Esse é o dinheiro que um combo tenta capturar: não é venda nova, é o mesmo cliente levando o segundo item.`);
    L.push("");
  }

  L.push("## O que sai junto");
  L.push("");
  if (!r.pares.dentro.length) {
    L.push(`Nenhum par passou o piso de ${opcoes.minPedidos} pedidos. Com esse volume, qualquer par que aparecesse aqui seria coincidência. O que fazer: juntar mais um mês de pedidos, ou baixar o piso com \`--min-pedidos\` sabendo que o número fica frágil.`);
  } else {
    L.push(`Piso aplicado: o par precisa aparecer em pelo menos ${opcoes.minPedidos} pedidos, e cada item em ${opcoes.minItem ?? opcoes.minPedidos}. Ordenado por lift.`);
    L.push("");
    L.push("| Par | Pedidos com os dois | Suporte | Quem leva A leva B | Quem leva B leva A | Lift |");
    L.push("|---|---|---|---|---|---|");
    for (const p of r.pares.dentro.slice(0, opcoes.pares)) {
      L.push(`| ${p.a} + ${p.b} | ${p.n} | ${br.pct(p.suporte, 1)} | ${br.pct(p.confAB, 1)} | ${br.pct(p.confBA, 1)} | ${num(p.lift)} |`);
    }
    L.push("");
    L.push("Como ler: **suporte** é em quantos por cento dos pedidos os dois aparecem juntos. **Confiança** tem direção, e por isso são duas colunas: de quem leva o primeiro, quanto leva o segundo, e o contrário. **Lift** perto de um é indiferença, ou seja, saem juntos só porque os dois vendem muito; de 1,5 pra cima há atração de verdade; abaixo de um os dois se evitam, e combo de item que se evita divide a venda em vez de somar.");
  }
  L.push("");

  if (r.pares.fora.length) {
    L.push("### Ficou de fora, e por quê");
    L.push("");
    L.push("| Par | Pedidos com os dois | Motivo |");
    L.push("|---|---|---|");
    for (const p of r.pares.fora.slice(0, 8)) {
      L.push(`| ${p.a} + ${p.b} | ${p.n} | ${p.motivo} |`);
    }
    if (r.pares.fora.length > 8) L.push(`| ... | | e outros ${r.pares.fora.length - 8} pares abaixo do piso |`);
    L.push("");
  }

  L.push("## Os combos");
  L.push("");
  if (!r.combos.length) {
    if (!r.pares.dentro.length) {
      L.push("Nenhum par passou o piso de volume, então não há combo pra propor com número. Não vale escolher de intuição e chamar de cálculo: o caminho é juntar mais um mês de pedidos, ou baixar o piso por comando e dizer na página que o número é frágil.");
    } else {
      const melhor = r.pares.dentro[0];
      L.push(`${r.pares.dentro.length === 1 ? "O par acima passou" : `Os ${r.pares.dentro.length} pares acima passaram`} o piso de volume, mas nenhum chegou ao lift mínimo de ${num(opcoes.minLift)}: o melhor é ${melhor.a} + ${melhor.b}, com lift ${num(melhor.lift)}. Lift perto de 1,0 quer dizer que os dois saem juntos só porque os dois vendem muito, e combo de item indiferente vira desconto sem ganho. Duas saídas honestas: combo de conveniência sem desconto (\`--desconto 0\`), que ganha em velocidade de atendimento e não em margem, ou baixar o corte com \`--min-lift\` sabendo que a atração entre os dois não está no dado.`);
    }
    L.push("");
  } else {
    L.push(`Escolhidos por ${opcoes.ordem === "volume" ? "volume (quantos pedidos já levam os dois)" : "lift (força da atração entre os dois)"}, com o mesmo item entrando em no máximo ${opcoes.reuso} ${opcoes.reuso === 1 ? "combo" : "combos"} e lift mínimo de ${num(opcoes.minLift)}. Preço cheio é a soma do preço médio praticado de cada item no período. Desconto de vitrine pedido: ${num(opcoes.desconto, 0)}%${opcoes.arredondar && opcoes.desconto > 0 ? ", com o preço final terminando em ,90 (por isso o desconto real muda um pouco)" : ""}. Margem mínima exigida: ${num(opcoes.margemMinima, 0)}%.`);
    L.push("");
    L.push("| # | Combo | Pedidos juntos | Lift | Cheio | Preço | Desconto real | Custo | Margem | Se paga com | Veredito |");
    L.push("|---|---|---|---|---|---|---|---|---|---|---|");
    r.combos.forEach((c, i) => {
      const paga = c.perdaNoDesconto === null ? "[a confirmar]"
        : c.perdaNoDesconto === 0 ? "o primeiro pedido"
        : c.pedidosNovosNecessarios === null ? "não se paga"
        : `${c.pedidosNovosNecessarios} ${c.pedidosNovosNecessarios === 1 ? "pedido novo" : "pedidos novos"}`;
      L.push(`| ${i + 1} | ${c.nome} | ${c.pedidosJuntos} | ${num(c.lift)} | ${br.reais(c.precoCheio)} | ${br.reais(c.preco)} | ${br.pct(c.descontoReal, 1)} | ${c.custo === null ? "[a confirmar]" : br.reais(c.custo)} | ${c.margem === null ? "[a confirmar]" : br.pct(c.margem, 1)} | ${paga} | ${c.veredito} |`);
    });
    L.push("");
    L.push("Tipo e lugar de exposição não saem do dado: são decisão do dono, com a tabela dos cinco tipos do molde ao lado. Cada bloco abaixo tem os dois campos pra preencher.");
    L.push("");
    r.combos.forEach((c, i) => {
      L.push(`### ${i + 1}. ${c.nome}`);
      L.push("");
      L.push(`Veredito: ${c.veredito}.`);
      L.push("");
      L.push(`- **Itens:** ${c.itens.join(" + ")} — a âncora é ${c.ancora} (aparece em mais pedidos), o anexo é ${c.anexo}`);
      L.push(`- **Preço:** ${br.reais(c.preco)} (cheio ${br.reais(c.precoCheio)}, desconto real ${br.pct(c.descontoReal, 1)})`);
      if (c.margem === null) {
        L.push(`- **Margem:** [a confirmar] — falta o custo de ${c.faltaCusto.join(" e ")}. Sem isso a margem não é conta, é chute`);
      } else {
        L.push(`- **Margem:** ${br.pct(c.margem, 1)} (custo ${br.reais(c.custo)}) — ${c.margem >= c.margemMinima ? `em cima do mínimo de ${num(opcoes.margemMinima, 0)}%` : `abaixo do mínimo de ${num(opcoes.margemMinima, 0)}%`}`);
      }
      L.push(`- **Por que esse par:** sai junto em ${c.pedidosJuntos} pedidos, lift ${num(c.lift)}; de quem leva ${c.itens[0]}, ${br.pct(c.confAB, 1)} leva ${c.itens[1]} também, e no sentido inverso ${br.pct(c.confBA, 1)}`);
      if (c.perdaNoDesconto === null) {
        L.push("- **Se paga com:** [a confirmar] — sem o custo dos dois, essa conta não sai");
      } else if (c.perdaNoDesconto === 0) {
        L.push(`- **Se paga com:** o primeiro pedido. Sem desconto não há perda a recuperar, e cada combo que troca ${c.ancora} sozinho rende ${br.reais(c.ganhoPorPedidoNovo)}`);
      } else if (c.pedidosNovosNecessarios === null) {
        L.push(`- **Se paga com:** volume nenhum. Cada pedido novo rende ${br.reais(c.ganhoPorPedidoNovo)} a mais que quem levava só ${c.ancora}: o desconto come o ganho antes de ele existir. Rever o desconto ou o par`);
      } else {
        L.push(`- **Se paga com:** ${c.pedidosNovosNecessarios} ${c.pedidosNovosNecessarios === 1 ? "pedido novo" : "pedidos novos"} no mês, contra os ${c.pedidosJuntos} que já levavam os dois. O desconto nesses ${c.pedidosJuntos} custa ${br.reais(c.perdaNoDesconto)} no mês, e cada pedido que hoje leva só ${c.ancora} e passa a levar o combo rende ${br.reais(c.ganhoPorPedidoNovo)}`);
        L.push(`- **Teto de conversão:** ${c.tetoConversao} ${c.tetoConversao === 1 ? "pedido leva" : "pedidos levam"} ${c.ancora} sem ${c.anexo} hoje. Quem já leva os dois não converte, então esse é o máximo que o combo pode capturar no mês${c.pedidosNovosNecessarios > c.tetoConversao ? ` — e ele é menor que os ${c.pedidosNovosNecessarios} necessários` : ""}`);
      }
      if (c.veredito === "não se paga no volume do mês") {
        L.push(`- **Conserto:** com ${num(opcoes.desconto, 0)}% de desconto o par é grande demais pra pagar o próprio desconto. Tirar o desconto e vender conveniência (\`--desconto 0\`), trocar por um par de coocorrência baixa e lift alto, ou mover o desconto pro item de margem maior`);
      }
      if (c.margem !== null && c.margem < c.margemMinima) {
        if (c.descontoMaximo !== null && c.descontoMaximo > 0) {
          L.push(`- **Conserto:** a ${num(opcoes.desconto, 0)}% de desconto a margem fica em ${br.pct(c.margem, 1)}. Pra fechar em ${num(opcoes.margemMinima, 0)}%, o desconto máximo é ${br.pct(c.descontoMaximo, 1)}, ou o preço mínimo é ${br.reais(c.precoMinimo)}`);
        } else {
          L.push(`- **Conserto:** não fecha em ${num(opcoes.margemMinima, 0)}% nem sem desconto — o custo dos dois é ${br.reais(c.custo)} e o preço cheio é ${br.reais(c.precoCheio)}. Esse combo só existe como chamariz, com a perda declarada`);
        }
      }
      L.push("- **Tipo:** <âncora + anexo | completa a ocasião | conveniência | volume | presente>");
      L.push("- **Onde aparece:** <balcão | cardápio | tela do aplicativo | resposta de WhatsApp>");
      L.push("");
    });
  }

  L.push("## O que falta pra fechar a conta");
  L.push("");
  let faltou = false;
  if (r.semCusto.length) {
    faltou = true;
    const nosPares = r.semCusto.filter((c) => c.nosPares);
    const frase = nosPares.length === 0
      ? "Nenhum deles entrou nos pares aprovados, então a margem dos combos não depende desta lista."
      : nosPares.length === 1
        ? `Um item da lista entrou nos pares aprovados, o primeiro da tabela: é ele que trava a margem, e basta ele.`
        : `Os ${nosPares.length} primeiros itens da tabela entraram nos pares aprovados — são esses que travam a margem, e bastam eles.`;
    L.push(`Export de PDV, iFood e Shopify traz preço de venda, nunca custo: quem informa é o dono. ${frase}`);
    L.push("");
    L.push("| Item | Entra em par aprovado | Pedidos | Preço médio praticado | Custo |");
    L.push("|---|---|---|---|---|");
    for (const c of r.semCusto.slice(0, 12)) {
      L.push(`| ${c.nome} | ${c.nosPares ? "sim" : "não"} | ${c.pedidos} | ${br.reais(c.precoMedio)} | [a confirmar] |`);
    }
    if (r.semCusto.length > 12) L.push(`| ... | | | | e outros ${r.semCusto.length - 12} itens sem custo |`);
    L.push("");
    L.push("Preencher a coluna de custo em `dados/custos.csv` (`item;custo`) e rodar de novo com `--custos dados/custos.csv`.");
    L.push("");
  }
  if (r.custosOrfaos.length) {
    faltou = true;
    const n = r.custosOrfaos.length;
    L.push(`- ${n === 1 ? "Uma linha do arquivo de custos não casou" : `${n} linhas do arquivo de custos não casaram`} com nenhum item dos pedidos: ${r.custosOrfaos.slice(0, 5).join(", ")}${n > 5 ? "..." : ""}. Nome diferente nos dois arquivos é a causa mais comum, e o conserto é copiar o nome do jeito que está no CSV de pedidos`);
  }
  for (const a of r.avisos) { faltou = true; L.push(`- ${a}`); }
  if (r.pares.pedidosGrandes) {
    faltou = true;
    L.push(`- ${r.pares.pedidosGrandes} pedido(s) com mais de ${opcoes.maxItensPorPedido} itens diferentes ${r.pares.pedidosGrandes === 1 ? "ficou" : "ficaram"} fora da contagem de pares (parecem pedido de atacado, ou número de pedido repetido no arquivo). Eles continuam no ticket médio, então o lift sai um pouco pra baixo`);
  }
  if (!faltou) L.push("Nada: todo item dos pares tem custo informado e nenhuma linha do arquivo ficou de fora.");
  L.push("");

  L.push("## O que medir no mês que vem");
  L.push("");
  L.push("Alvo é decisão do dono, não do script. A coluna Hoje é a linha de base deste arquivo, e o `/revisao-semanal` cobra a comparação.");
  L.push("");
  L.push("| Número | Hoje | Alvo | Onde confere |");
  L.push("|---|---|---|---|");
  L.push(`| Itens diferentes por pedido | ${num(resumo.distintosPorPedido)} | <a combinar> | rodar este script no CSV do mês |`);
  L.push(`| Ticket médio | ${br.reais(resumo.ticketMedio)} | <a combinar> | rodar este script no CSV do mês |`);
  L.push(`| Pedidos de um item só | ${br.pct(resumo.pedidos ? resumo.pedidosUmItem / resumo.pedidos : 0, 1)} | <a combinar> | rodar este script no CSV do mês |`);
  if (r.combos.length) {
    const c = r.combos[0];
    L.push(`| Pedidos com o combo "${c.nome}" | 0 | ${c.pedidosNovosNecessarios === null ? "<a combinar>" : c.pedidosNovosNecessarios} | relatório do PDV ou do aplicativo |`);
  }
  L.push("");
  return L.join("\n");
}

// ─────────────────────────── linha de comando ───────────────────────────

const MODELO_PEDIDOS = `pedido;data;item;qtd;valor
1001;02/09/2026;Pão na chapa;2;9,00
1001;02/09/2026;Café coado 200ml;2;11,00
1002;02/09/2026;Pão na chapa;1;4,50
1002;02/09/2026;Café coado 200ml;1;5,50
1003;02/09/2026;Bolo de cenoura fatia;1;8,00
1004;03/09/2026;Pão na chapa;1;4,50
1004;03/09/2026;Café coado 200ml;1;5,50
1005;03/09/2026;Pão de queijo;3;13,50
1005;03/09/2026;Café coado 200ml;1;5,50
1006;03/09/2026;Pão na chapa;2;9,00
1006;03/09/2026;Café coado 200ml;2;11,00
1007;04/09/2026;Bolo de cenoura fatia;1;8,00
1007;04/09/2026;Café coado 200ml;1;5,50
1008;04/09/2026;Pão na chapa;1;4,50
1008;04/09/2026;Café coado 200ml;1;5,50
1009;04/09/2026;Pão de queijo;2;9,00
1010;05/09/2026;Pão na chapa;1;4,50
1010;05/09/2026;Café coado 200ml;1;5,50
1010;05/09/2026;Pão de queijo;1;4,50
`;

const MODELO_CUSTOS = `item;custo
Pão na chapa;1,80
Café coado 200ml;1,20
Pão de queijo;1,60
Bolo de cenoura fatia;2,40
`;

function gravarModelo(pasta) {
  const dir = pasta || "dados";
  fs.mkdirSync(dir, { recursive: true });
  const a = path.join(dir, "pedidos.csv");
  const b = path.join(dir, "custos.csv");
  fs.writeFileSync(a, MODELO_PEDIDOS, "utf8");
  fs.writeFileSync(b, MODELO_CUSTOS, "utf8");
  console.log(`✔ molde gravado:\n  ${a}\n  ${b}\n\nPra rodar:\n  node scripts/combos.js ${a} --custos ${b}`);
}

const AJUDA = `
combos.js — o que sai junto no mesmo pedido, e quanto sobra no combo

  node scripts/combos.js <pedidos.csv> [--custos custos.csv] [opções]
  node scripts/combos.js modelo [pasta]        grava pedidos.csv e custos.csv de exemplo
  node scripts/combos.js <pedidos.csv> --ler   mostra o que o script entendeu

Opções: --custos <arq> --custo "Item=12,90" --saida <arq.md> --json --mes AAAA-MM
        --min-pedidos <n> --min-item <n> --pares <n> --combos <n>
        --desconto <pct> --margem-minima <pct> --reuso <n>
        --ordem lift|volume --min-lift <n>
        --valor linha|unitario --sem-arredondar
        --excluir "Sacola, Taxa de entrega"
        --juntar "Coca lata=Coca 350, Coca-cola lata"

Molde dos pedidos: pedido;item;qtd;valor (data opcional), uma linha por item.
Molde dos custos:  item;custo (custo unitário, sem imposto sobre a venda).
                   --custos aceita CSV, estoque/parametros.csv e precos/ficha-tecnica.json.
`;

function inteiroDe(v, opcao) {
  const n = br.numero(v);
  if (!isFinite(n) || n < 1) throw new Error(`${opcao} espera um número inteiro de 1 pra cima, recebeu "${v === undefined ? "" : v}"`);
  return Math.round(n);
}

function numeroDe(v, opcao) {
  const n = br.numero(v);
  if (!isFinite(n)) throw new Error(`${opcao} espera um número, recebeu "${v === undefined ? "" : v}"`);
  return n;
}

function textoDe(v, opcao) {
  const t = String(v ?? "").trim();
  if (!t || t.startsWith("--")) throw new Error(`${opcao} espera um valor depois dele`);
  return t;
}

function lerArgs(argv) {
  const o = { ...PADRAO, arredondar: true, custosSoltos: new Map(), custosRotulos: [], excluir: new Set(), juntar: new Map() };
  const livres = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const prox = () => argv[++i];
    switch (a) {
      case "--custos": o.custosArquivo = textoDe(prox(), "--custos"); break;
      case "--custo": {
        const v = String(prox() || "");
        const p = v.split("=");
        if (p.length < 2) throw new Error(`--custo espera "Item=valor", recebeu "${v}"`);
        const custo = br.numero(p.slice(1).join("="));
        if (!isFinite(custo) || custo < 0) throw new Error(`custo inválido em "${v}"`);
        o.custosSoltos.set(slugItem(p[0]), br.centavos(custo));
        o.custosRotulos.push({ rotulo: String(p[0]).trim(), chaves: [slugItem(p[0])], custo: br.centavos(custo) });
        break;
      }
      case "--saida": o.saida = textoDe(prox(), "--saida"); break;
      case "--json": o.json = true; break;
      case "--ler": o.ler = true; break;
      case "--mes": o.mes = textoDe(prox(), "--mes"); break;
      case "--min-pedidos": o.minPedidos = inteiroDe(prox(), "--min-pedidos"); break;
      case "--min-item": o.minItem = inteiroDe(prox(), "--min-item"); break;
      case "--pares": o.pares = inteiroDe(prox(), "--pares"); break;
      case "--combos": o.combos = inteiroDe(prox(), "--combos"); break;
      case "--desconto": o.desconto = numeroDe(prox(), "--desconto"); break;
      case "--margem-minima": o.margemMinima = numeroDe(prox(), "--margem-minima"); break;
      case "--reuso": o.reuso = inteiroDe(prox(), "--reuso"); break;
      case "--min-lift": o.minLift = numeroDe(prox(), "--min-lift"); break;
      case "--ordem": {
        const v = String(prox() || "").toLowerCase();
        if (v !== "lift" && v !== "volume") throw new Error("--ordem aceita lift ou volume");
        o.ordem = v;
        break;
      }
      case "--valor": {
        const v = String(prox() || "").toLowerCase();
        if (v !== "linha" && v !== "unitario") throw new Error("--valor aceita linha ou unitario");
        o.valor = v;
        break;
      }
      case "--sem-arredondar": o.arredondar = false; break;
      case "--excluir": {
        const v = textoDe(prox(), "--excluir");
        for (const nome of v.split(/[;,]/)) {
          const k = slugItem(nome);
          if (k) o.excluir.add(k);
        }
        break;
      }
      case "--juntar": {
        const v = textoDe(prox(), "--juntar");
        const corte = v.indexOf("=");
        if (corte < 1) throw new Error(`--juntar espera "Nome que fica=variação, variação", recebeu "${v}"`);
        const nome = v.slice(0, corte).trim();
        const alvo = { nome, slug: slugItem(nome) };
        if (!alvo.slug) throw new Error(`--juntar sem nome antes do "=" em "${v}"`);
        const variacoes = v.slice(corte + 1).split(/[;,]/).map((x) => slugItem(x)).filter(Boolean);
        if (!variacoes.length) throw new Error(`--juntar sem variação depois do "=" em "${v}"`);
        for (const k of variacoes) o.juntar.set(k, alvo);
        break;
      }
      default:
        if (a.startsWith("--")) throw new Error(`opção desconhecida: ${a}`);
        livres.push(a);
    }
  }
  if (!isFinite(o.desconto) || o.desconto < 0 || o.desconto >= 100) throw new Error("--desconto espera um número entre 0 e 99");
  if (!isFinite(o.minLift) || o.minLift <= 0) throw new Error("--min-lift espera um número maior que zero");
  if (!isFinite(o.margemMinima) || o.margemMinima < 0 || o.margemMinima >= 100) throw new Error("--margem-minima espera um número entre 0 e 99");
  return { o, livres };
}

function periodoDe(r, opcoes) {
  if (opcoes.mes) return opcoes.mes;
  if (r.resumo.primeiraData && r.resumo.ultimaData) {
    return r.resumo.primeiraData === r.resumo.ultimaData
      ? r.resumo.primeiraData
      : `${r.resumo.primeiraData} a ${r.resumo.ultimaData}`;
  }
  return "período do arquivo";
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === "--ajuda" || argv[0] === "-h") {
    console.log(AJUDA);
    process.exit(0);
  }
  if (argv[0] === "modelo") { gravarModelo(argv[1]); return; }
  let o, livres;
  try { ({ o, livres } = lerArgs(argv)); }
  catch (e) { console.error(`✖ ${e.message}`); process.exit(1); }
  if (!livres.length) { console.error("✖ falta o arquivo de pedidos.\n  node scripts/combos.js <pedidos.csv> [--custos custos.csv]"); process.exit(1); }

  let dados, custos = new Map(), custoItens = [];
  try {
    dados = lerPedidos(livres[0], o);
    if (o.custosArquivo) {
      const lidos = lerCustos(o.custosArquivo);
      custos = lidos.custos;
      custoItens = lidos.itens;
    }
    for (const [k, v] of o.custosSoltos) custos.set(k, v);
    custoItens = custoItens.concat(o.custosRotulos);
  } catch (e) {
    console.error(`✖ ${e.message}`);
    process.exit(1);
  }

  if (o.ler) {
    console.log(`Arquivo: ${livres[0]}`);
    console.log(`Linhas de item lidas: ${dados.itens.length} de ${dados.linhasLidas}`);
    console.log(`Coluna de valor: "${dados.colunaValor}" lida como valor ${dados.semantica === "unitario" ? "de uma unidade (multiplicado pela quantidade)" : "total da linha"}`);
    const { pedidos, catalogo } = agrupar(dados.itens);
    console.log(`Pedidos: ${pedidos.size} | Itens diferentes: ${catalogo.size}`);
    console.log("\nPrimeiras linhas entendidas:");
    for (const it of dados.itens.slice(0, 8)) {
      console.log(`  pedido ${it.pedido} | ${it.nome} | ${num(it.qtd, Number.isInteger(it.qtd) ? 0 : 2)} un | ${br.reais(it.total)}${it.data ? ` | ${br.fmt(it.data)}` : ""}`);
    }
    if (custos.size) console.log(`\nCustos informados: ${custos.size} item(ns)`);
    for (const a of dados.avisos) console.log(`\n⚠ ${a}`);
    return;
  }

  const r = analisar(dados, custos, o, custoItens);
  if (o.json) {
    console.log(JSON.stringify({
      arquivo: livres[0], resumo: r.resumo,
      pares: r.pares.dentro, foraDoPiso: r.pares.fora, combos: r.combos,
      semCusto: r.semCusto.map((c) => ({ item: c.nome, pedidos: c.pedidos, precoMedio: c.precoMedio, nosPares: c.nosPares })),
      custosOrfaos: r.custosOrfaos,
      avisos: r.avisos,
      opcoes: {
        minPedidos: o.minPedidos, minItem: o.minItem ?? o.minPedidos, minLift: o.minLift,
        desconto: o.desconto, margemMinima: o.margemMinima, reuso: o.reuso, ordem: o.ordem,
      },
    }, null, 2));
    return;
  }
  const comando = "node scripts/combos.js " + argv
    .filter((a, i) => a !== "--saida" && argv[i - 1] !== "--saida")
    .map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    .join(" ");
  const md = markdown(r, { arquivo: livres[0], periodo: periodoDe(r, o), hoje: br.fmt(new Date()), comando });
  if (o.saida) {
    fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
    fs.writeFileSync(o.saida, md + "\n", "utf8");
    console.log(`✔ ${o.saida}`);
    console.log(`  ${r.resumo.pedidos} pedidos, ${r.pares.dentro.length} par(es) acima do piso, ${r.combos.length} combo(s) propostos`);
    const semMargem = r.combos.filter((c) => c.margem === null).length;
    if (semMargem) console.log(`  ⚠ ${semMargem} combo(s) sem margem por falta de custo informado`);
  } else {
    console.log(md);
  }
}

module.exports = { lerPedidos, lerCustos, lerCustosDaFicha, agrupar, pares, montarCombos, analisar, markdown, arredondarNoventa, slugItem, lerDataFlex };

if (require.main === module) main();
