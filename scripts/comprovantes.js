#!/usr/bin/env node
/**
 * Contex OS — comprovantes.js
 * Organiza a pasta de nota, comprovante de Pix, boleto e recibo do mês: confere
 * o manifesto que o assistente preencheu lendo cada arquivo, copia com nome
 * padronizado pra `financeiro/comprovantes/AAAA/MM/categoria/`, soma por
 * categoria, escreve o CSV pro contador e separa o que faltou dado.
 *
 * Existe porque chat não varre pasta nem renomeia arquivo, e porque a parte que
 * erra em silêncio é a outra: data que não existe (31/02), valor lido com ponto
 * onde era vírgula, a mesma nota contada duas vezes (uma como PDF e uma como
 * foto), e o arquivo que "sumiu" porque alguém moveu na mão. Aqui a leitura é do
 * assistente (PDF e imagem entram pela ferramenta Read), a conferência e a conta
 * são deste script, nenhum arquivo é movido — só copiado — e todo lote sai com
 * log pra desfazer.
 *
 * Uso:
 *   node scripts/comprovantes.js listar <pasta> [--saida <manifesto.json>]
 *   node scripts/comprovantes.js conferir <manifesto.json> [--mes AAAA-MM] [--json]
 *   node scripts/comprovantes.js organizar <manifesto.json> [--destino <pasta>] [--simular]
 *   node scripts/comprovantes.js desfazer <log.json>
 *
 * O `listar` cria o esqueleto do manifesto (um item por arquivo, campos vazios e
 * os palpites tirados do nome do arquivo). O assistente abre cada comprovante,
 * preenche data, fornecedor, número, valor, categoria e descrição, e só então o
 * `conferir` e o `organizar` rodam.
 *
 * Opções:
 *   --saida <arquivo>     onde gravar o manifesto (listar) — padrão: ao lado da pasta
 *   --destino <pasta>     raiz da árvore organizada — padrão: financeiro/comprovantes
 *   --mes AAAA-MM         mês do lote (padrão: o campo "mes" do manifesto, ou a maioria das datas)
 *   --simular             mostra o plano de cópia e não escreve nada
 *   --ext <lista>         extensões consideradas no listar (padrão: pdf,jpg,jpeg,png,heic,heif,webp,xml)
 *   --bom                 grava o CSV com BOM (Excel pt-BR abre com acento certo)
 *   --totais-no-csv       acrescenta o bloco de total por categoria no fim do CSV
 *   --json                imprime o resultado da conferência em JSON
 *
 * Categorias (as mesmas do /caixa, mais `receita` pro que entrou):
 *   receita · fixo · variavel · retirada · investimento
 *
 * Node 18+, sem dependência. Usa scripts/br.js (data, número, moeda, slug, CNPJ).
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const br = require("./br.js");

const CATEGORIAS = ["receita", "fixo", "variavel", "retirada", "investimento"];
const APELIDOS = {
  entrada: "receita", entradas: "receita", receitas: "receita", venda: "receita", vendas: "receita",
  fixa: "fixo", fixos: "fixo", fixas: "fixo", "custo-fixo": "fixo", "despesa-fixa": "fixo",
  variaveis: "variavel", "custo-variavel": "variavel", "despesa-variavel": "variavel",
  retiradas: "retirada", prolabore: "retirada", "pro-labore": "retirada", socio: "retirada",
  investimentos: "investimento", imobilizado: "investimento",
};
const EXT_PADRAO = ["pdf", "jpg", "jpeg", "png", "heic", "heif", "webp", "xml"];

// ─────────────────────────── utilidades ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Caminho curto pra exibir: relativo quando faz sentido. */
function curto(p) {
  const rel = path.relative(process.cwd(), p);
  return rel && !rel.startsWith("../../..") && rel.length < p.length ? rel : p;
}

/** Caminho pra colar no terminal: com espaço, vai entre aspas. */
function citar(p) {
  const c = curto(p);
  return /[\s'"$`\\]/.test(c) ? `"${c.replace(/(["$`\\])/g, "\\$1")}"` : c;
}

function sha1(caminho) {
  return crypto.createHash("sha1").update(fs.readFileSync(caminho)).digest("hex");
}

/** Tira do nome de arquivo o que Windows, macOS e Drive recusam, sem tirar acento. */
function limpar(s, max) {
  let t = String(s || "")
    .replace(/[\\/:*?"<>|\n\r\t]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-{2,}/g, "-")
    .trim()
    .replace(/[.\-\s]+$/g, "");
  if (max && t.length > max) t = t.slice(0, max).trim().replace(/[.\-\s]+$/g, "");
  return t;
}

/** "variável " → "variavel"; devolve null quando não é categoria conhecida. */
function normalizarCategoria(s) {
  const t = br.slug(String(s || "").trim());
  if (!t) return "";
  if (CATEGORIAS.includes(t)) return t;
  if (APELIDOS[t]) return APELIDOS[t];
  return null;
}

/** AAAA-MM de uma data. */
function mesDe(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

function lerJson(caminho, oQue) {
  if (!fs.existsSync(caminho)) morrer(`Não achei o ${oQue}: ${curto(caminho)}`);
  try {
    return JSON.parse(fs.readFileSync(caminho, "utf8").replace(/^﻿/, ""));
  } catch (e) {
    morrer(`O ${oQue} não é JSON válido: ${e.message}`, "Vírgula sobrando no fim da lista é o erro mais comum.");
  }
}

// ─────────────────────────── listar ───────────────────────────

/** Varre a pasta (com subpastas) e devolve os arquivos de comprovante. */
function varrer(pasta, exts) {
  const achados = [];
  const ignorados = [];
  const pilha = [pasta];
  while (pilha.length) {
    const atual = pilha.pop();
    for (const nome of fs.readdirSync(atual).sort()) {
      if (nome.startsWith(".")) continue;
      const cheio = path.join(atual, nome);
      let st;
      try { st = fs.statSync(cheio); } catch { ignorados.push(`${nome} (não consegui abrir)`); continue; }
      if (st.isDirectory()) { pilha.push(cheio); continue; }
      const ext = path.extname(nome).replace(".", "").toLowerCase();
      if (exts.includes(ext)) achados.push({ caminho: cheio, bytes: st.size });
      else ignorados.push(nome);
    }
  }
  achados.sort((a, b) => a.caminho.localeCompare(b.caminho, "pt-BR"));
  return { achados, ignorados };
}

/**
 * Palpite tirado do nome do arquivo. Nunca preenche o campo de verdade: quem
 * preenche é o assistente depois de abrir o arquivo. Serve pra ele conferir.
 */
function palpitar(nome) {
  const p = {};
  let m = nome.match(/(20\d{2})[-_.](\d{2})[-_.](\d{2})/);
  if (m) p.data = `${m[3]}/${m[2]}/${m[1]}`;
  else if ((m = nome.match(/(\d{2})[-_.](\d{2})[-_.](20\d{2})/))) p.data = `${m[1]}/${m[2]}/${m[3]}`;
  if ((m = nome.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/))) p.valor = m[1];
  if (/nfs-?e|nfse/i.test(nome)) p.documento = "NFS-e";
  else if (/danfe/i.test(nome)) p.documento = "DANFE";
  else if (/nf-?e/i.test(nome)) p.documento = "NF-e";
  else if (/pix/i.test(nome)) p.documento = "comprovante Pix";
  else if (/boleto/i.test(nome)) p.documento = "boleto";
  else if (/recibo/i.test(nome)) p.documento = "recibo";
  return p;
}

function comandoListar(pasta, opts) {
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) {
    morrer(`Não achei a pasta: ${curto(pasta)}`, "Uso: node scripts/comprovantes.js listar <pasta> [--saida manifesto.json]");
  }
  const exts = (opts.ext ? String(opts.ext).split(",") : EXT_PADRAO).map((e) => e.replace(".", "").trim().toLowerCase());
  const { achados, ignorados } = varrer(pasta, exts);
  if (!achados.length) morrer(`A pasta não tem nenhum arquivo com extensão ${exts.join(", ")}.`, `Ignorados: ${ignorados.length}. Pra incluir outra extensão: --ext pdf,png,xml`);

  const itens = achados.map((a) => ({
    arquivo: a.caminho,
    bytes: a.bytes,
    lido_por: "",
    data: "",
    fornecedor: "",
    cnpj: "",
    documento: "",
    numero: "",
    descricao: "",
    categoria: "",
    subcategoria: "",
    valor: "",
    forma: "",
    observacao: "",
    palpite: palpitar(path.basename(a.caminho)),
  }));

  const manifesto = {
    mes: opts.mes || "",
    pasta,
    gerado_em: br.fmt(new Date()),
    categorias: CATEGORIAS,
    instrucao: "Abrir cada arquivo, preencher data, fornecedor, valor, categoria e descricao, e escrever quem leu em lido_por. O campo palpite vem do nome do arquivo e não vale como leitura.",
    itens,
  };

  const saida = opts.saida || path.join(path.dirname(path.resolve(pasta)), `comprovantes-${opts.mes || "manifesto"}.json`);
  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
  fs.writeFileSync(saida, JSON.stringify(manifesto, null, 2) + "\n", "utf8");

  console.log(`\nManifesto: ${curto(saida)}`);
  console.log(`${itens.length} arquivo(s) pra ler.`);
  if (ignorados.length) {
    console.log(`\n${ignorados.length} arquivo(s) fora da lista de extensões, nenhum deles entrou:`);
    console.log("  " + ignorados.slice(0, 8).join(", ") + (ignorados.length > 8 ? ", ..." : ""));
  }
  console.log(`\nPróximo passo: abrir cada arquivo, preencher o manifesto, e rodar`);
  console.log(`  node scripts/comprovantes.js conferir ${citar(saida)}\n`);
  return manifesto;
}

// ─────────────────────────── conferir ───────────────────────────

/**
 * Confere o manifesto e devolve { itens, erros, faltas, avisos, totais, mes }.
 * Erro impede organizar. Falta manda o item pra revisar/. Aviso é pra ler.
 */
function conferir(manifesto, opts = {}) {
  const erros = [];
  const faltas = [];
  const avisos = [];
  const itens = [];
  const lista = Array.isArray(manifesto.itens) ? manifesto.itens : [];
  if (!lista.length) erros.push({ item: "-", erro: 'O manifesto não tem "itens".' });

  const vistos = new Map();
  lista.forEach((cru, i) => {
    const rotulo = cru.arquivo ? path.basename(cru.arquivo) : `item ${i + 1}`;
    const it = { indice: i + 1, arquivo: cru.arquivo || "", rotulo, falta: [], aviso: [], invalido: false };
    // erro no item o tira da conta: item sem data válida ou sem categoria conhecida
    // não pode virar linha do CSV nem cair numa pasta chutada
    const errar = (msg) => { erros.push({ item: rotulo, erro: msg }); it.invalido = true; };

    if (!cru.arquivo) errar('Item sem "arquivo".');
    else if (!fs.existsSync(cru.arquivo)) errar(`Arquivo não existe mais: ${cru.arquivo}`);
    else it.bytes = fs.statSync(cru.arquivo).size;

    // data
    const dataCrua = String(cru.data || "").trim();
    if (!dataCrua) it.falta.push("data");
    else {
      const d = br.lerData(dataCrua);
      if (!d) errar(`Data que não existe no calendário: "${dataCrua}"`);
      else { it.data = d; it.mes = mesDe(d); }
    }

    // valor
    const valorCru = String(cru.valor === 0 ? "0" : cru.valor || "").trim();
    if (!valorCru) it.falta.push("valor");
    else {
      const v = br.numero(valorCru);
      if (!isFinite(v)) errar(`Valor que não é número: "${valorCru}"`);
      else if (v <= 0) errar(`Valor zerado ou negativo: "${valorCru}" (o sinal é dado pela categoria, não pelo valor)`);
      else it.valor = br.centavos(v);
    }

    // fornecedor
    it.fornecedor = String(cru.fornecedor || "").trim();
    if (!it.fornecedor) it.falta.push("fornecedor");

    // categoria
    const catCrua = String(cru.categoria || "").trim();
    if (!catCrua) it.falta.push("categoria");
    else {
      const cat = normalizarCategoria(catCrua);
      if (cat === null) errar(`Categoria fora da lista: "${catCrua}". Use ${CATEGORIAS.join(", ")}`);
      else it.categoria = cat;
    }

    it.documento = String(cru.documento || "").trim();
    it.numero = String(cru.numero || "").trim();
    it.descricao = String(cru.descricao || "").trim();
    it.subcategoria = String(cru.subcategoria || "").trim();
    it.forma = String(cru.forma || "").trim();
    it.observacao = String(cru.observacao || "").trim();
    it.cnpj = String(cru.cnpj || "").trim();

    if (!String(cru.lido_por || "").trim()) it.aviso.push("ninguém marcou lido_por: o arquivo foi preenchido sem ser aberto?");
    // sem descrição só incomoda em item que vai ser organizado: o de revisar/ mantém o nome original
    if (!it.descricao && !it.falta.length && !it.invalido) it.aviso.push("sem descrição: o nome do arquivo vai sair só com fornecedor e documento");
    // boleto é cobrança. Sozinho ele não prova que o dinheiro saiu
    if (/boleto/i.test(it.documento) && !/comprovante|pago|quita/i.test(it.documento + " " + it.observacao)) {
      it.aviso.push("boleto sozinho prova a cobrança, não o pagamento: confirmar se existe o comprovante do banco");
    }
    // 2016 no lugar de 2026 é o erro de leitura mais comum, e a data manda na pasta
    if (it.data && br.diasEntre(new Date(), it.data) > 1) {
      it.aviso.push(`data no futuro (${br.fmt(it.data)}): confira o ano no documento`);
    }
    if (it.cnpj) {
      const so = it.cnpj.replace(/[^0-9A-Za-z]/g, "");
      const ok = so.length === 11 ? br.cpfValido(so) : br.cnpjValido(so);
      if (!ok) it.aviso.push(`CNPJ/CPF que não passa no dígito verificador: ${it.cnpj}`);
    }

    // duplicata: mesmo fornecedor + valor + data, ou mesmo documento + número + fornecedor
    if (it.fornecedor && it.valor && it.data) {
      const chave = `${br.slug(it.fornecedor)}|${it.valor.toFixed(2)}|${br.iso(it.data)}`;
      if (vistos.has(chave)) it.aviso.push(`possível duplicata de "${vistos.get(chave)}" (mesmo fornecedor, valor e data)`);
      else vistos.set(chave, rotulo);
    }
    if (it.numero && it.fornecedor) {
      const chave = `n|${br.slug(it.fornecedor)}|${br.slug(it.documento)}|${it.numero}`;
      if (vistos.has(chave)) it.aviso.push(`mesmo número de documento de "${vistos.get(chave)}"`);
      else vistos.set(chave, rotulo);
    }

    itens.push(it);
    it.falta.forEach((f) => faltas.push({ item: rotulo, campo: f }));
    it.aviso.forEach((a) => avisos.push({ item: rotulo, aviso: a }));
  });

  // mês do lote
  let mes = opts.mes || manifesto.mes || "";
  if (!mes) {
    const cont = {};
    itens.forEach((i) => { if (i.mes) cont[i.mes] = (cont[i.mes] || 0) + 1; });
    mes = Object.keys(cont).sort((a, b) => cont[b] - cont[a])[0] || "";
  }
  itens.forEach((i) => {
    if (i.mes && mes && i.mes !== mes) {
      const a = `data de ${i.mes}, fora do mês ${mes} do lote`;
      i.aviso.push(a);
      avisos.push({ item: i.rotulo, aviso: a });
    }
  });

  const prontos = itens.filter((i) => !i.falta.length && !i.invalido);
  const totais = {};
  CATEGORIAS.forEach((c) => { totais[c] = { n: 0, valor: 0 }; });
  prontos.forEach((i) => { totais[i.categoria].n += 1; totais[i.categoria].valor = br.centavos(totais[i.categoria].valor + i.valor); });
  const total = { n: prontos.length, valor: br.centavos(prontos.reduce((s, i) => s + i.valor, 0)) };

  return { mes, itens, prontos, revisar: itens.filter((i) => i.falta.length && !i.invalido), erros, faltas, avisos, totais, total };
}

function imprimirConferencia(r) {
  console.log(`\nMês do lote: ${r.mes || "[a confirmar]"}`);
  console.log(`${r.itens.length} item(ns) no manifesto · ${r.prontos.length} pronto(s) · ${r.revisar.length} pra revisar`);

  if (r.erros.length) {
    console.log(`\n✖ ${r.erros.length} erro(s) — nada é organizado enquanto existirem:`);
    r.erros.forEach((e) => console.log(`  · ${e.item}: ${e.erro}`));
  }
  if (r.revisar.length) {
    console.log(`\n▸ ${r.revisar.length} item(ns) com campo faltando (vão pra revisar/):`);
    r.revisar.forEach((i) => console.log(`  · ${i.rotulo}: falta ${i.falta.join(", ")}`));
  }
  if (r.avisos.length) {
    console.log(`\n▸ ${r.avisos.length} aviso(s) pra olhar:`);
    r.avisos.forEach((a) => console.log(`  · ${a.item}: ${a.aviso}`));
  }

  console.log(`\nTotal por categoria (só o que está pronto):`);
  CATEGORIAS.forEach((c) => {
    if (r.totais[c].n) console.log(`  ${c.padEnd(13)} ${String(r.totais[c].n).padStart(3)} doc  ${br.reais(r.totais[c].valor)}`);
  });
  console.log(`  ${"TOTAL".padEnd(13)} ${String(r.total.n).padStart(3)} doc  ${br.reais(r.total.valor)}`);
  console.log(r.erros.length ? "\n✖ Conferência reprovada.\n" : "\n✔ Conferência aprovada.\n");
}

// ─────────────────────────── organizar ───────────────────────────

/** "2026-09-03 Contabilidade Ramos - Honorários de setembro.pdf" */
function nomePadrao(it) {
  const data = br.iso(it.data);
  // " - " é o separador do padrão: dentro do fornecedor ou da descrição ele vira espaço,
  // senão "Distribuidora São João / Filial 2" sairia com dois separadores e o nome deixa de se ler
  const semSeparador = (s) => String(s).replace(/\s+-\s+/g, " ").replace(/\s{2,}/g, " ").trim();
  const forn = semSeparador(limpar(it.fornecedor, 40)) || "Sem fornecedor";
  let desc = it.descricao;
  if (!desc) desc = [it.documento, it.numero].filter(Boolean).join(" ");
  desc = semSeparador(limpar(desc, 60));
  const ext = path.extname(it.arquivo).toLowerCase();
  return desc ? `${data} ${forn} - ${desc}${ext}` : `${data} ${forn}${ext}`;
}

/** Nome livre na pasta: "nome (2).pdf", "nome (3).pdf"... */
function semColisao(pasta, nome, usados) {
  const ext = path.extname(nome);
  const base = nome.slice(0, nome.length - ext.length);
  let tentativa = nome, n = 2;
  while (usados.has(path.join(pasta, tentativa)) || fs.existsSync(path.join(pasta, tentativa))) {
    tentativa = `${base} (${n})${ext}`;
    n += 1;
  }
  usados.add(path.join(pasta, tentativa));
  return tentativa;
}

/**
 * Plano de cópia: um destino por item pronto, mais os de revisar. Arquivo que já
 * está no lugar certo com o mesmo conteúdo não é copiado de novo nem ganha "(2)":
 * rodar o mesmo lote duas vezes tem que dar a mesma pasta.
 */
function planejar(r, destino) {
  const usados = new Set();
  const plano = [];
  const inscrever = (it, pasta, nomeQuerido, revisar) => {
    const alvo = path.join(pasta, nomeQuerido);
    if (!usados.has(alvo) && fs.existsSync(alvo) && fs.existsSync(it.arquivo) && sha1(alvo) === sha1(it.arquivo)) {
      usados.add(alvo);
      plano.push({ item: it, origem: it.arquivo, destino: alvo, revisar, jaExiste: true });
      return;
    }
    const nome = semColisao(pasta, nomeQuerido, usados);
    plano.push({ item: it, origem: it.arquivo, destino: path.join(pasta, nome), revisar });
  };
  r.prontos.forEach((it) => {
    const pasta = path.join(destino, String(it.data.getFullYear()), String(it.data.getMonth() + 1).padStart(2, "0"), it.categoria);
    inscrever(it, pasta, nomePadrao(it), false);
  });
  r.revisar.forEach((it) => {
    const pasta = path.join(destino, "revisar");
    inscrever(it, pasta, limpar(path.basename(it.arquivo)) || `sem-nome${path.extname(it.arquivo)}`, true);
  });
  return plano;
}

function csvEscapar(v) {
  const s = String(v == null ? "" : v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function montarCsv(plano, r, opts) {
  const cab = ["data", "fornecedor", "cnpj", "documento", "numero", "descricao", "categoria", "subcategoria", "valor", "forma", "arquivo"];
  const linhas = [cab.join(";")];
  plano.filter((p) => !p.revisar).sort((a, b) => br.iso(a.item.data).localeCompare(br.iso(b.item.data))).forEach((p) => {
    const it = p.item;
    linhas.push([
      br.fmt(it.data), it.fornecedor, it.cnpj, it.documento, it.numero, it.descricao,
      it.categoria, it.subcategoria,
      it.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      it.forma, path.relative(process.cwd(), p.destino),
    ].map(csvEscapar).join(";"));
  });
  if (opts.totaisNoCsv) {
    linhas.push("");
    linhas.push("categoria;documentos;total");
    CATEGORIAS.forEach((c) => {
      if (r.totais[c].n) linhas.push(`${c};${r.totais[c].n};${r.totais[c].valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    });
    linhas.push(`TOTAL;${r.total.n};${r.total.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  return (opts.bom ? "﻿" : "") + linhas.join("\n") + "\n";
}

function montarResumo(r, plano, caminhoCsv, mes) {
  const L = [];
  L.push(`# Comprovantes — ${mes}`);
  L.push("");
  L.push(`> Lote conferido e organizado em ${br.fmt(new Date())}. ${r.total.n} documento(s) no CSV, ${r.revisar.length} em \`revisar/\`.`);
  L.push(`> Arquivo pro contador: \`${path.relative(process.cwd(), caminhoCsv)}\`. Os originais continuam onde estavam: aqui tudo é cópia.`);
  L.push("");
  L.push("## O mês em uma frase");
  L.push("");
  L.push("[a confirmar: quanto saiu com documento, em que categoria está o maior valor, e o que a conferência revelou]");
  L.push("");
  L.push("## Total por categoria");
  L.push("");
  L.push("| Categoria | Documentos | Valor |");
  L.push("|---|---|---|");
  CATEGORIAS.forEach((c) => {
    if (r.totais[c].n) L.push(`| ${c} | ${r.totais[c].n} | ${br.reais(r.totais[c].valor)} |`);
  });
  L.push(`| **Total** | ${r.total.n} | ${br.reais(r.total.valor)} |`);
  L.push("");
  L.push("## O que faltou dado");
  L.push("");
  if (!r.revisar.length) L.push("Nenhum: todo comprovante do lote tem data, fornecedor, valor e categoria.");
  else {
    L.push("| Arquivo | O que falta | Onde está |");
    L.push("|---|---|---|");
    plano.filter((p) => p.revisar).forEach((p) => {
      L.push(`| ${path.basename(p.item.arquivo)} | ${p.item.falta.join(", ")} | \`${path.relative(process.cwd(), p.destino)}\` |`);
    });
  }
  L.push("");
  L.push("## Avisos da conferência");
  L.push("");
  if (!r.avisos.length) L.push("Nenhum.");
  else r.avisos.forEach((a) => L.push(`- **${a.item}**: ${a.aviso}`));
  L.push("");
  L.push("## O que fazer agora");
  L.push("");
  L.push("[a confirmar: quem tira outra foto, qual boleto falta o comprovante do banco, o que vai pro /caixa, o que o contador ainda vai pedir]");
  L.push("");
  return L.join("\n") + "\n";
}

function comandoOrganizar(caminhoManifesto, opts) {
  const manifesto = lerJson(caminhoManifesto, "manifesto");
  const r = conferir(manifesto, opts);
  imprimirConferencia(r);
  if (r.erros.length) morrer("Não organizei nada: corrija os erros no manifesto e rode de novo.", `Manifesto: ${citar(caminhoManifesto)}`);
  if (!r.mes) morrer('Não sei de que mês é o lote.', 'Informe --mes AAAA-MM ou preencha "mes" no manifesto.');

  const destino = path.resolve(opts.destino || path.join("financeiro", "comprovantes"));
  const plano = planejar(r, destino);

  if (opts.simular) {
    console.log("Plano de cópia (--simular: nada foi escrito):\n");
    plano.forEach((p) => console.log(`  ${curto(p.origem)}\n    → ${curto(p.destino)}${p.revisar ? "   [revisar]" : ""}${p.jaExiste ? "   [já estava lá, não copio de novo]" : ""}`));
    console.log("");
    return { plano, resultado: r };
  }

  const copiados = [];
  let jaEstavam = 0;
  plano.forEach((p) => {
    if (p.jaExiste) { jaEstavam += 1; return; }
    fs.mkdirSync(path.dirname(p.destino), { recursive: true });
    fs.copyFileSync(p.origem, p.destino);
    copiados.push({ origem: path.resolve(p.origem), destino: p.destino, bytes: fs.statSync(p.destino).size, sha1: sha1(p.destino), revisar: !!p.revisar });
  });

  const caminhoCsv = path.join(destino, `comprovantes-${r.mes}.csv`);
  fs.writeFileSync(caminhoCsv, montarCsv(plano, r, opts), "utf8");
  const caminhoResumo = path.join(destino, `comprovantes-${r.mes}.md`);
  fs.writeFileSync(caminhoResumo, montarResumo(r, plano, caminhoCsv, r.mes), "utf8");

  // log só existe quando houve cópia: log vazio não desfaz nada e confunde
  let caminhoLog = null;
  if (copiados.length) {
    const agora = new Date();
    const selo = `${br.iso(agora)}-${String(agora.getHours()).padStart(2, "0")}${String(agora.getMinutes()).padStart(2, "0")}${String(agora.getSeconds()).padStart(2, "0")}`;
    const pastaLog = path.join(destino, "log");
    fs.mkdirSync(pastaLog, { recursive: true });
    caminhoLog = path.join(pastaLog, semColisao(pastaLog, `organizar-${selo}.json`, new Set()));
    fs.writeFileSync(caminhoLog, JSON.stringify({
      gerado_em: br.fmt(agora), mes: r.mes, manifesto: path.resolve(caminhoManifesto),
      destino, csv: caminhoCsv, resumo: caminhoResumo, copiados,
    }, null, 2) + "\n", "utf8");
  }

  console.log(`Copiados: ${copiados.filter((c) => !c.revisar).length} organizado(s), ${copiados.filter((c) => c.revisar).length} em revisar/${jaEstavam ? `, ${jaEstavam} já estava(m) lá` : ""}`);
  console.log(`CSV pro contador: ${curto(caminhoCsv)}`);
  console.log(`Resumo:           ${curto(caminhoResumo)}`);
  if (caminhoLog) {
    console.log(`Log pra desfazer: ${curto(caminhoLog)}`);
    console.log(`\nDesfazer este lote: node scripts/comprovantes.js desfazer ${citar(caminhoLog)}\n`);
  } else {
    console.log(`\nNenhum arquivo novo foi copiado, então não gravei log: não há o que desfazer.\n`);
  }
  return { plano, resultado: r, log: caminhoLog, csv: caminhoCsv, resumo: caminhoResumo };
}

// ─────────────────────────── desfazer ───────────────────────────

function comandoDesfazer(caminhoLog) {
  const log = lerJson(caminhoLog, "log");
  if (!Array.isArray(log.copiados)) morrer('O log não tem "copiados".');
  if (!log.copiados.length) morrer("Esse log não registrou nenhuma cópia: não há o que desfazer.");

  let apagados = 0;
  const mantidos = [];
  log.copiados.forEach((c) => {
    if (!fs.existsSync(c.destino)) { mantidos.push({ arquivo: c.destino, motivo: "já não existe" }); return; }
    if (sha1(c.destino) !== c.sha1) { mantidos.push({ arquivo: c.destino, motivo: "mudou depois da cópia, não apaguei" }); return; }
    fs.unlinkSync(c.destino);
    apagados += 1;
  });

  // pastas que ficaram vazias, de baixo pra cima
  const raiz = log.destino ? path.resolve(log.destino) : null;
  const pastas = [...new Set(log.copiados.map((c) => path.dirname(c.destino)))].sort((a, b) => b.length - a.length);
  pastas.forEach((p) => {
    let atual = p;
    // só apaga pasta vazia dentro da raiz do lote, e nunca a raiz
    while (raiz && atual.startsWith(raiz + path.sep) && fs.existsSync(atual) && fs.readdirSync(atual).length === 0) {
      fs.rmdirSync(atual);
      atual = path.dirname(atual);
    }
  });

  console.log(`\n${apagados} cópia(s) apagada(s).`);
  if (mantidos.length) {
    console.log(`\n${mantidos.length} não apaguei:`);
    mantidos.forEach((m) => console.log(`  · ${curto(m.arquivo)} — ${m.motivo}`));
  }
  console.log(`\nO original de cada comprovante nunca foi tocado: continua em ${log.copiados[0] ? curto(path.dirname(log.copiados[0].origem)) : "onde estava"}.`);
  console.log(`O CSV e o resumo ficaram: apague na mão se quiser (${curto(log.csv || "-")}).\n`);
  return { apagados, mantidos };
}

// ─────────────────────────── linha de comando ───────────────────────────

function lerOpcoes(argv) {
  const opts = {};
  const livres = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--simular") opts.simular = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--bom") opts.bom = true;
    else if (a === "--totais-no-csv") opts.totaisNoCsv = true;
    else if (a === "--saida") opts.saida = argv[++i];
    else if (a === "--destino") opts.destino = argv[++i];
    else if (a === "--mes") opts.mes = argv[++i];
    else if (a === "--ext") opts.ext = argv[++i];
    else if (a.startsWith("--")) morrer(`Opção que não existe: ${a}`, "Rode sem argumento pra ver o uso.");
    else livres.push(a);
  }
  return { opts, livres };
}

const USO = `
Contex OS — comprovantes.js

  node scripts/comprovantes.js listar <pasta> [--saida manifesto.json] [--ext pdf,jpg]
  node scripts/comprovantes.js conferir <manifesto.json> [--mes AAAA-MM] [--json]
  node scripts/comprovantes.js organizar <manifesto.json> [--destino financeiro/comprovantes] [--simular] [--bom] [--totais-no-csv]
  node scripts/comprovantes.js desfazer <log.json>

Categorias: ${CATEGORIAS.join(" · ")}
`;

function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) { console.log(USO); process.exit(0); }
  const { opts, livres } = lerOpcoes(argv.slice(1));
  const comando = argv[0];

  if (comando === "listar") {
    if (!livres[0]) morrer("Falta a pasta.", USO.trim());
    comandoListar(livres[0], opts);
  } else if (comando === "conferir") {
    if (!livres[0]) morrer("Falta o manifesto.", USO.trim());
    const r = conferir(lerJson(livres[0], "manifesto"), opts);
    if (opts.json) console.log(JSON.stringify({
      mes: r.mes, total: r.total, totais: r.totais, erros: r.erros, faltas: r.faltas, avisos: r.avisos,
    }, null, 2));
    else imprimirConferencia(r);
    process.exit(r.erros.length ? 1 : 0);
  } else if (comando === "organizar") {
    if (!livres[0]) morrer("Falta o manifesto.", USO.trim());
    comandoOrganizar(livres[0], opts);
  } else if (comando === "desfazer") {
    if (!livres[0]) morrer("Falta o log.", USO.trim());
    comandoDesfazer(livres[0]);
  } else {
    morrer(`Comando que não existe: ${comando}`, USO.trim());
  }
}

module.exports = { conferir, nomePadrao, planejar, montarCsv, montarResumo, palpitar, normalizarCategoria, limpar, CATEGORIAS };

if (require.main === module) main();
