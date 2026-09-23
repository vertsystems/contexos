#!/usr/bin/env node
/**
 * Contex OS — ensaiar.js
 * Mede a transcrição de um ensaio de conversa (venda ou cobrança) contra o
 * plano: perguntas de implicação feitas vs previstas, proporção de fala,
 * quantas vezes o preço apareceu antes do cliente admitir o problema, e cada
 * concessão conferida contra o piso da oferta.
 *
 * Existe porque relatório de treino escrito de cabeça sempre elogia. Quem
 * acabou de ensaiar lembra da parte boa: lembra do argumento que saiu redondo e
 * esquece que soltou o preço na terceira linha, falou 70% do tempo e deu 15% de
 * desconto sem pedir nada em troca. Essas quatro coisas se contam na
 * transcrição, e contadas elas doem o suficiente pra mudar a próxima conversa.
 *
 * Uso:
 *   node scripts/ensaiar.js medir <ensaio.md> [--plano <plano.json>] [--json]
 *   node scripts/ensaiar.js plano <roteiro.md> [saida.json]
 *   node scripts/ensaiar.js molde
 *
 * Opções:
 *   --plano <arquivo>   plano do ensaio (padrão: <ensaio>.plano.json ao lado)
 *   --json              saída em JSON, pra outro script ler; o código de saída
 *                       é o mesmo da saída legível
 *
 * Sai com código 1 quando o ensaio rompeu uma regra dura: concessão fora do
 * piso, concessão sem troca, promessa que está na lista "nunca", ou preço dito
 * antes de o cliente admitir o problema. Aviso (fala desequilibrada, implicação
 * que faltou, número de trocas fora de 5 a 8, piso em branco) não derruba o
 * código de saída: ele aparece na saída pra quem lê decidir.
 *
 * Formato da transcrição (uma fala por linha, dentro da seção "## Transcrição"
 * quando o arquivo tiver uma; linha seguinte sem rótulo continua a fala
 * anterior):
 *   **Você:** Como funciona hoje?
 *   **Cliente:** A gente anota num caderno.
 *   **Pausa:** pediu dica — sugerido voltar pra implicação
 *   **Concessão:** desconto 8% — em troca: fechamento hoje e depoimento
 *   **Objeção nova:** "meu contador disse que não vale a pena"
 *
 * Formato do plano (o molde completo sai de `node scripts/ensaiar.js molde`):
 *   {
 *     "cenario": "venda", "cliente": "Padaria São João", "conferido_em": "2026-09-22",
 *     "implicacao_previstas": ["Isso já te custou quanto em cliente que não voltou?"],
 *     "piso": {
 *       "limites": [
 *         { "o_que": "desconto", "limite": 10, "unidade": "%", "direcao": "maximo" },
 *         { "o_que": "prazo de entrega", "limite": 15, "unidade": "dias", "direcao": "minimo" }
 *       ],
 *       "nunca": ["escopo extra sem custo"]
 *     }
 *   }
 *
 * `direcao` é "maximo" (padrão: romper é passar do número) ou "minimo" (romper
 * é ficar abaixo dele, que é o caso do prazo de entrega mais curto).
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── léxicos ───────────────────────────
// Marcadores em português do Brasil. Contam menção, não intenção: o comando
// imprime a linha que acusou pra quem lê julgar. Ampliar aqui é barato.

/** Abre pergunta de implicação: puxa consequência, custo ou terceiro afetado. */
const MARCA_IMPLICACAO = [
  "o que mais", "o que isso", "alem de voce", "alem de vc", "quem mais",
  "se continuar", "se nada mudar", "se ficar assim", "o que acontece se",
  "quanto isso", "quanto te custa", "quanto ja custou", "quanto voce perde",
  "quanto tempo voce perde", "isso te custa", "que impacto", "reflete em",
  "afeta", "atrapalha em que", "com que frequencia",
];

/** O cliente admitindo que existe problema (ou declarando necessidade). */
const MARCA_PROBLEMA = [
  "me atrapalha", "atrapalha", "da trabalho", "perco", "perdi", "perdemos",
  "preciso resolver", "preciso de um jeito", "quero uma forma", "e um problema",
  "e complicado", "me custa", "ja me custou", "ta ruim", "esta ruim",
  "nao aguento", "me incomoda", "incomoda", "atrasa", "reclamam", "reclama",
  "dor de cabeca", "fica pra tras", "nao dou conta", "vira bagunca",
];

/**
 * Preço e condição comercial dita pelo usuário. Fora daqui, de propósito:
 * "valor" e "custa" soltos, porque "o valor que isso te custa por mês" é
 * pergunta de implicação, e acusá-la como preço inverteria o relatório.
 */
const MARCA_PRECO = [
  "r$", "preco", "investimento", "mensalidade", "orcamento", "parcel",
  "desconto", "fica em", "fica por", "sai por", "cobro", "plano de",
  "pacote de", "a vista", "entrada de", "tabela de",
];

const SEM_PESO = new Set([
  "que", "para", "pra", "com", "como", "isso", "esse", "essa", "sobre", "onde",
  "quem", "quando", "porque", "mais", "muito", "voce", "vocs", "seu", "sua",
  "meu", "minha", "dele", "dela", "pelo", "pela", "nos", "nas", "dos", "das",
  "uma", "uns", "umas", "ser", "esta", "estao", "tem", "teve", "vai", "faz",
  "aqui", "hoje", "ainda", "sem", "mas", "por", "num", "numa", "aos",
]);

// ─────────────────────────── utilidades ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function n(s) { return br.semAcento(String(s || "")).replace(/\s+/g, " ").trim(); }

/** Palavras com peso de uma frase: sem acento, 4+ letras, fora da lista vazia. */
function palavrasChave(s) {
  return [...new Set(
    n(s).replace(/[^a-z0-9 ]/g, " ").split(" ")
      .filter((p) => p.length >= 4 && !SEM_PESO.has(p))
  )];
}

function contarPalavras(s) {
  return n(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(Boolean).length;
}

function achouMarca(texto, lista) {
  const t = n(texto);
  return lista.filter((m) => t.includes(m));
}

// ─────────────────────────── número e unidade ───────────────────────────
// A concessão vem escrita à mão ("desconto de 12% na mensalidade", "entrega em
// 5 dias", "abatimento de R$ 200"). Comparar com o piso sem olhar a unidade era
// o pior erro possível aqui: R$ 200 de abatimento virava "200% contra o limite
// de 10%". Então o número sai sempre acompanhado da unidade, e limite em
// unidade diferente vira aviso, nunca regra rompida.

const RE_NUMERO = /(r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(%|dias?|meses?|m[eê]s|reais|real|parcelas?|x|mil)?/i;

function normalizarUnidade(u) {
  const t = n(u);
  if (!t) return null;
  if (t === "%") return "%";
  if (/^dias?$/.test(t)) return "dias";
  if (/^(meses|mes)$/.test(t)) return "meses";
  if (/^(reais|real|r\$)$/.test(t)) return "reais";
  if (/^(parcelas?|x)$/.test(t)) return "parcelas";
  return null;
}

/** Primeiro número do texto, com a unidade que estiver ao lado dele. */
function numeroComUnidade(texto) {
  const m = String(texto || "").match(RE_NUMERO);
  if (!m) return { valor: NaN, unidade: null };
  let valor = br.numero(m[2]);
  let unidade = normalizarUnidade(m[3]);
  if (m[3] && n(m[3]) === "mil") { valor *= 1000; unidade = "reais"; }
  if (!unidade && m[1]) unidade = "reais";
  return { valor, unidade };
}

function comUnidade(valor, unidade) {
  const v = Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (!unidade) return v;
  return unidade === "%" ? `${v}%` : `${v} ${unidade}`;
}

// ─────────────────────────── transcrição ───────────────────────────

// O rótulo é reconhecido depois de tirar os asteriscos, porque "**Você:**",
// "**Você**:" e "Você:" são a mesma coisa pra quem escreve à mão.
const ROTULOS = [
  { re: /^(voc[eê]|vc|eu)\s*:\s*/i, tipo: "usuario" },
  { re: /^(cliente|ele|ela|devedor)\s*:\s*/i, tipo: "cliente" },
  { re: /^pausa\s*:\s*/i, tipo: "pausa" },
  { re: /^concess[aã]o\s*:\s*/i, tipo: "concessao" },
  { re: /^obje[cç][aã]o nova\s*:\s*/i, tipo: "objecao" },
];

/**
 * Recorta a seção "## Transcrição" quando o arquivo tem uma, e devolve o
 * arquivo inteiro quando não tem (ensaio salvo na correria às vezes é só a
 * lista de falas). O recorte existe porque o relatório mora depois da
 * transcrição no mesmo arquivo: sem ele, a prosa do relatório entra na conta e
 * inventa palavra, menção de preço e objeção que ninguém disse.
 */
function secaoTranscricao(md) {
  const linhas = md.split(/\r?\n/);
  let inicio = -1;
  let nivel = 0;
  for (let i = 0; i < linhas.length; i++) {
    const h = linhas[i].trim().match(/^(#{1,6})\s+(.*)$/);
    if (!h) continue;
    if (inicio === -1) {
      if (n(h[2]).replace(/[^a-z]/g, "").startsWith("transcri")) {
        inicio = i + 1;
        nivel = h[1].length;
      }
      continue;
    }
    if (h[1].length <= nivel) return { inicio, fim: i, linhas };
  }
  if (inicio === -1) return { inicio: 0, fim: linhas.length, linhas };
  return { inicio, fim: linhas.length, linhas };
}

/**
 * Lê as falas de um .md. Devolve a lista na ordem, cada item com tipo, texto e
 * a linha do arquivo (numerada a partir do arquivo inteiro, pra o relatório
 * poder apontar onde foi mesmo quando a transcrição começa na metade).
 */
function lerTranscricao(md) {
  const { inicio, fim, linhas } = secaoTranscricao(md);
  const falas = [];
  for (let i = inicio; i < fim; i++) {
    const original = linhas[i].trim();
    const crua = original.replace(/\*\*/g, "").replace(/^[-*+]\s+/, "").trim();
    let casou = null;
    for (const r of ROTULOS) {
      const m = crua.match(r.re);
      if (m) { casou = { tipo: r.tipo, texto: crua.slice(m[0].length).trim() }; break; }
    }
    if (casou) {
      falas.push({ ...casou, linha: i + 1 });
      continue;
    }
    // Continuação: linha solta logo depois de uma fala. Título, tabela, bloco de
    // código, citação e rótulo em negrito sozinho ficam de fora.
    const ultima = falas[falas.length - 1];
    const estrutura = /^(#|\||```|>|---)/.test(original) || /^\*\*[^*]+\*\*:?$/.test(original);
    if (ultima && crua && !estrutura) ultima.texto += " " + crua;
  }
  return falas;
}

// ─────────────────────────── medidas ───────────────────────────

/** Perguntas de implicação previstas que apareceram de fato nas falas do usuário. */
function medirImplicacao(falas, previstas) {
  const minhas = falas.filter((f) => f.tipo === "usuario");
  const feitas = [];
  const faltaram = [];
  for (const p of previstas) {
    const chaves = palavrasChave(p);
    if (!chaves.length) { faltaram.push({ pergunta: p, motivo: "pergunta sem palavra com peso" }); continue; }
    let melhor = { cobertura: 0, fala: null };
    for (const f of minhas) {
      const t = n(f.texto);
      const acertos = chaves.filter((c) => t.includes(c)).length;
      const cobertura = acertos / chaves.length;
      if (cobertura > melhor.cobertura) melhor = { cobertura, fala: f };
    }
    if (melhor.cobertura >= 0.5) feitas.push({ pergunta: p, linha: melhor.fala.linha, cobertura: melhor.cobertura });
    else faltaram.push({ pergunta: p, cobertura: melhor.cobertura });
  }
  // implicação que saiu na hora, sem estar no plano
  const previstasLinhas = new Set(feitas.map((f) => f.linha));
  const improvisadas = minhas.filter((f) =>
    f.texto.includes("?") && achouMarca(f.texto, MARCA_IMPLICACAO).length && !previstasLinhas.has(f.linha)
  ).map((f) => ({ linha: f.linha, texto: f.texto }));
  return { previstas: previstas.length, feitas, faltaram, improvisadas };
}

/** Proporção de fala em palavras. Régua do sistema: 30% a 50% pra quem vende. */
function medirFala(falas) {
  const minhas = falas.filter((f) => f.tipo === "usuario").reduce((s, f) => s + contarPalavras(f.texto), 0);
  const dele = falas.filter((f) => f.tipo === "cliente").reduce((s, f) => s + contarPalavras(f.texto), 0);
  const total = minhas + dele;
  return { minhas, dele, total, fracao: total ? minhas / total : 0, piso: 0.30, teto: 0.50 };
}

/**
 * Preço dito antes de o cliente admitir o problema. Marca o primeiro momento em
 * que o cliente reconhece a dificuldade e conta as menções de preço anteriores.
 *
 * Em venda isso é regra dura: preço antes do problema vira comparação de
 * orçamento. Em cobrança não é, e forçar seria ensinar errado — quem cobra
 * precisa dizer valor, data e forma na primeira frase, e o `medir` rebaixa esta
 * medida a aviso quando o cenário é cobrança.
 */
function medirPrecoAntesDoProblema(falas) {
  let corte = null;
  for (const f of falas) {
    if (f.tipo === "cliente" && achouMarca(f.texto, MARCA_PROBLEMA).length) { corte = f.linha; break; }
  }
  const antes = falas.filter((f) =>
    f.tipo === "usuario" && achouMarca(f.texto, MARCA_PRECO).length && (corte === null || f.linha < corte)
  ).map((f) => ({ linha: f.linha, texto: f.texto, marcas: achouMarca(f.texto, MARCA_PRECO) }));
  return { corte, antes };
}

/**
 * Acha o limite do piso que fala da mesma coisa que a concessão, por palavra com
 * peso. Empate não vira chute: devolve os candidatos pra virar aviso.
 */
function acharLimite(oQue, limites) {
  const t = n(oQue);
  let topo = 0;
  let melhor = [];
  for (const l of limites) {
    const chaves = palavrasChave(l.o_que);
    if (!chaves.length) continue;
    const s = chaves.filter((c) => t.includes(c)).length / chaves.length;
    if (s > topo) { topo = s; melhor = [l]; }
    else if (s > 0 && s === topo) melhor.push(l);
  }
  if (topo < 0.5) return { limite: null, empate: null };
  if (melhor.length > 1) return { limite: null, empate: melhor.map((l) => l.o_que) };
  return { limite: melhor[0], empate: null };
}

const DIRECAO_ABAIXO = ["menos de", "menos que", "abaixo de", "menor que", "inferior a"];
const DIRECAO_ACIMA = ["mais de", "mais que", "acima de", "maior que", "superior a"];

/**
 * Confere a concessão contra a lista "nunca". Item de texto puro ("escopo extra
 * sem custo") rompe assim que casa. Item com número ("entrega em menos de 15
 * dias") só rompe se o número da linha cair dentro dele: senão "entrega em 20
 * dias" seria acusada de furar um limite que ela respeita.
 */
function confereNunca(oQue, nunca) {
  for (const item of nunca) {
    const chaves = palavrasChave(item);
    if (!chaves.length) continue;
    const t = n(oQue);
    if (chaves.filter((c) => t.includes(c)).length / chaves.length < 0.6) continue;

    const doItem = numeroComUnidade(item);
    if (!Number.isFinite(doItem.valor)) return { item, rompida: true };

    const daLinha = numeroComUnidade(oQue);
    if (!Number.isFinite(daLinha.valor)) {
      return { item, rompida: false, aviso: `parece a lista "nunca" ("${item}"), mas a linha não traz número pra comparar — confira à mão` };
    }
    const ti = n(item);
    const abaixo = DIRECAO_ABAIXO.some((d) => ti.includes(d));
    const acima = DIRECAO_ACIMA.some((d) => ti.includes(d));
    if (abaixo) {
      if (daLinha.valor < doItem.valor) return { item, rompida: true };
      return { item, rompida: false, aviso: `casou com "${item}", mas ${comUnidade(daLinha.valor, daLinha.unidade)} não é menos que ${comUnidade(doItem.valor, doItem.unidade)} — está dentro` };
    }
    if (acima) {
      if (daLinha.valor > doItem.valor) return { item, rompida: true };
      return { item, rompida: false, aviso: `casou com "${item}", mas ${comUnidade(daLinha.valor, daLinha.unidade)} não passa de ${comUnidade(doItem.valor, doItem.unidade)} — está dentro` };
    }
    if (daLinha.valor === doItem.valor) return { item, rompida: true };
    return { item, rompida: false, aviso: `casou com "${item}", mas o número é outro (${comUnidade(daLinha.valor, daLinha.unidade)} contra ${comUnidade(doItem.valor, doItem.unidade)}) — confira à mão` };
  }
  return null;
}

/** Concessões da transcrição conferidas contra o piso do plano. */
function medirConcessoes(falas, piso = {}) {
  const limites = Array.isArray(piso.limites) ? piso.limites : [];
  const nunca = (Array.isArray(piso.nunca) ? piso.nunca : [])
    .filter((x) => String(x || "").trim() && !/\[a confirmar\]/i.test(String(x)));

  return falas.filter((f) => f.tipo === "concessao").map((f) => {
    const m = f.texto.match(/em\s+troca\s*:\s*(.*)$/i);
    const troca = m ? m[1].trim() : "";
    const oQue = (m ? f.texto.slice(0, m.index) : f.texto).replace(/[—–-]\s*$/, "").trim();
    const semTroca = !troca || /^(nada|nenhuma?|n\/a|-|—)\.?$/i.test(troca);

    const problemas = [];
    const avisos = [];
    if (semTroca) problemas.push("cedeu sem pedir nada em troca");

    const proibida = confereNunca(oQue, nunca);
    if (proibida && proibida.rompida) problemas.push(`está na lista "nunca" do piso: ${proibida.item}`);
    else if (proibida && proibida.aviso) avisos.push(proibida.aviso);

    const { limite, empate } = acharLimite(oQue, limites);
    const daLinha = numeroComUnidade(oQue);
    if (empate) {
      avisos.push(`casou com mais de um limite do piso (${empate.join(", ")}) — escreva na linha qual deles é`);
    } else if (limite) {
      const teto = br.numero(limite.limite);
      const uPiso = normalizarUnidade(limite.unidade);
      const minimo = n(limite.direcao) === "minimo";
      if (!Number.isFinite(teto)) {
        avisos.push(`o piso ainda não tem número pra "${limite.o_que}" — preencha o plano antes de confiar nesta linha`);
      } else if (!Number.isFinite(daLinha.valor)) {
        avisos.push(`casou com "${limite.o_que}" mas sem número na linha — confira à mão`);
      } else if (uPiso && daLinha.unidade && uPiso !== daLinha.unidade) {
        avisos.push(`a linha está em ${daLinha.unidade} e o piso de "${limite.o_que}" está em ${uPiso} — confira à mão`);
      } else if (minimo && daLinha.valor < teto) {
        problemas.push(`furou o piso: ${comUnidade(daLinha.valor, uPiso || daLinha.unidade)} contra o mínimo de ${comUnidade(teto, uPiso)} em "${limite.o_que}"`);
      } else if (!minimo && daLinha.valor > teto) {
        problemas.push(`passou do piso: ${comUnidade(daLinha.valor, uPiso || daLinha.unidade)} contra o limite de ${comUnidade(teto, uPiso)} em "${limite.o_que}"`);
      }
    } else if (!proibida) {
      avisos.push("não casou com nenhum limite declarado no piso — confira à mão");
    }

    return { linha: f.linha, o_que: oQue, troca, problemas, avisos };
  });
}

/** Trocas = pares fala do usuário → fala do cliente. A ficha pede de 5 a 8. */
function medirTrocas(falas) {
  let trocas = 0;
  let esperando = false;
  for (const f of falas) {
    if (f.tipo === "usuario") esperando = true;
    else if (f.tipo === "cliente" && esperando) { trocas++; esperando = false; }
  }
  return trocas;
}

/** Piso que não dá pra conferir nada: sem limite com número e sem "nunca". */
function pisoEmBranco(piso = {}) {
  const limites = (Array.isArray(piso.limites) ? piso.limites : [])
    .filter((l) => Number.isFinite(br.numero(l && l.limite)));
  const nunca = (Array.isArray(piso.nunca) ? piso.nunca : [])
    .filter((x) => String(x || "").trim() && !/\[a confirmar\]/i.test(String(x)));
  return !limites.length && !nunca.length;
}

function medir(arquivo, plano = {}) {
  const md = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  const falas = lerTranscricao(md);
  if (!falas.some((f) => f.tipo === "usuario") || !falas.some((f) => f.tipo === "cliente")) {
    morrer(
      `não achei transcrição em ${path.basename(arquivo)}`,
      'Cada fala numa linha, começando com "**Você:**" ou "**Cliente:**", debaixo de "## Transcrição". Rode `node scripts/ensaiar.js molde` pra ver o formato.'
    );
  }
  const cobranca = n(plano.cenario).startsWith("cobran");
  const r = {
    arquivo,
    cenario: plano.cenario || "[a confirmar]",
    preco_e_regra_dura: !cobranca,
    cliente: plano.cliente || "[a confirmar]",
    trocas: medirTrocas(falas),
    implicacao: medirImplicacao(falas, plano.implicacao_previstas || []),
    fala: medirFala(falas),
    preco: medirPrecoAntesDoProblema(falas),
    concessoes: medirConcessoes(falas, plano.piso || {}),
    piso_em_branco: pisoEmBranco(plano.piso || {}),
    pausas: falas.filter((f) => f.tipo === "pausa").length,
    objecoes_novas: falas.filter((f) => f.tipo === "objecao").map((f) => f.texto),
  };
  r.duras = [];
  if (r.preco.antes.length && r.preco_e_regra_dura) {
    r.duras.push(`preço apareceu ${r.preco.antes.length}× antes do problema`);
  }
  for (const c of r.concessoes) for (const p of c.problemas) r.duras.push(`linha ${c.linha}: ${p}`);
  return r;
}

// ─────────────────────────── relatório ───────────────────────────

function imprimir(r) {
  console.log(`\nEnsaio: ${path.basename(r.arquivo)} — cenário ${r.cenario}, cliente ${r.cliente}`);
  console.log(`Trocas: ${r.trocas}${r.trocas < 5 || r.trocas > 8 ? "  (aviso: a régua é de 5 a 8)" : ""}`);
  if (r.pausas) console.log(`Pausas pedidas: ${r.pausas}`);

  console.log(`\n— Perguntas de implicação`);
  if (!r.implicacao.previstas) {
    console.log(`  plano sem perguntas previstas: nada pra comparar (aviso)`);
  } else {
    console.log(`  feitas ${r.implicacao.feitas.length} de ${r.implicacao.previstas} previstas`);
    for (const f of r.implicacao.feitas) {
      console.log(`  ✓ linha ${f.linha} (${br.pct(f.cobertura, 0)} das palavras): ${f.pergunta}`);
    }
    for (const f of r.implicacao.faltaram) console.log(`  ✗ não saiu: ${f.pergunta}`);
  }
  for (const i of r.implicacao.improvisadas) console.log(`  + saiu fora do plano (linha ${i.linha}): ${i.texto}`);

  console.log(`\n— Proporção de fala`);
  console.log(`  você ${br.pct(r.fala.fracao, 1)} (${r.fala.minhas} palavras) · cliente ${br.pct(1 - r.fala.fracao, 1)} (${r.fala.dele} palavras)`);
  if (r.fala.fracao > r.fala.teto) console.log(`  aviso: acima da régua de ${br.pct(r.fala.teto, 0)}. Quem fala mais está apresentando, não investigando`);
  else if (r.fala.fracao < r.fala.piso) console.log(`  aviso: abaixo de ${br.pct(r.fala.piso, 0)}. Investigação curta também deixa a venda solta`);
  else console.log(`  dentro da régua de ${br.pct(r.fala.piso, 0)} a ${br.pct(r.fala.teto, 0)}`);

  console.log(`\n— Preço antes do problema`);
  if (r.preco.corte === null) console.log(`  o cliente nunca admitiu o problema na transcrição`);
  else console.log(`  o cliente admitiu o problema na linha ${r.preco.corte}`);
  if (r.preco.antes.length) {
    const marca = r.preco_e_regra_dura ? "✗" : "·";
    for (const p of r.preco.antes) console.log(`  ${marca} linha ${p.linha} (${p.marcas.join(", ")}): ${p.texto}`);
    if (!r.preco_e_regra_dura) console.log(`  aviso, não regra dura: em cobrança valor e data entram cedo de propósito`);
  } else console.log(`  nenhuma menção de preço antes disso`);

  console.log(`\n— Concessões contra o piso`);
  if (r.piso_em_branco && r.concessoes.length) {
    console.log(`  aviso: o plano está sem piso preenchido. Sem número declarado, este bloco só`);
    console.log(`  consegue apontar concessão sem troca. Preencha o piso e rode de novo`);
  }
  if (!r.concessoes.length) console.log(`  nenhuma concessão marcada`);
  for (const c of r.concessoes) {
    console.log(`  linha ${c.linha}: ${c.o_que} → em troca: ${c.troca || "(nada)"}`);
    for (const p of c.problemas) console.log(`    ✗ ${p}`);
    for (const a of c.avisos) console.log(`    · ${a}`);
  }

  if (r.objecoes_novas.length) {
    console.log(`\n— Objeção nova pra levar pro _memoria/publico.md`);
    for (const o of r.objecoes_novas) console.log(`  ${o}`);
  }

  if (r.duras.length) {
    console.log(`\n✖ ${r.duras.length} ${r.duras.length === 1 ? "regra dura rompida" : "regras duras rompidas"}:`);
    for (const d of r.duras) console.log(`  · ${d}`);
    console.log("");
    return 1;
  }
  console.log(`\n✓ Nenhuma regra dura rompida.\n`);
  return 0;
}

// ─────────────────────────── plano a partir do roteiro ───────────────────────────

/**
 * Puxa as perguntas de implicação de um `vendas/roteiro-*.md` do /vender. Duas
 * formas, porque o roteiro sai das duas: título que fala de implicação (colhe o
 * que ali termina em "?") e rótulo na própria linha, tipo
 * `- **Implicação:** "quanto isso te custa por mês?"`. É rascunho, e o comando
 * imprime o que achou pra o usuário confirmar antes de medir.
 */
function planoDoRoteiro(arquivo) {
  const linhas = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "").split(/\r?\n/);
  let dentro = false;
  let nivel = 0;
  const perguntas = [];
  for (const linha of linhas) {
    const t = linha.trim();
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      if (n(h[2]).includes("implica")) { dentro = true; nivel = h[1].length; continue; }
      if (dentro && h[1].length <= nivel) dentro = false;
      continue;
    }
    if (!t) continue;

    const rotulo = t.match(/^(?:[-*+]|\d+[.)])?\s*\*{0,2}implica[^\s:*]*\*{0,2}\s*:\s*\*{0,2}\s*(.+)$/i);
    const corpo = rotulo ? rotulo[1] : (dentro ? t : null);
    if (corpo === null) continue;

    const citadas = corpo.match(/["“]([^"”]+\?)["”]/g);
    if (citadas) {
      for (const c of citadas) perguntas.push(c.replace(/^["“]|["”]$/g, "").trim());
      continue;
    }
    const item = corpo.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").replace(/^\*+|\*+$/g, "").trim();
    if (item.endsWith("?") && item.length > 12) perguntas.push(item);
  }
  return [...new Set(perguntas)];
}

const MOLDE_PLANO = {
  cenario: "venda",
  cliente: "Padaria São João",
  conferido_em: br.iso(new Date()),
  implicacao_previstas: [
    "E quando falta o pão da tarde, o que mais isso afeta no movimento do dia seguinte?",
    "Isso já te custou quanto em cliente que não voltou?",
    "Se continuar assim nos próximos seis meses, o que acontece com a segunda loja?",
  ],
  piso: {
    limites: [
      { o_que: "desconto", limite: 10, unidade: "%", direcao: "maximo" },
      { o_que: "prazo de pagamento", limite: 30, unidade: "dias", direcao: "maximo" },
      { o_que: "prazo de entrega", limite: 15, unidade: "dias", direcao: "minimo" },
    ],
    nunca: ["escopo extra sem custo", "serviço novo com parcela aberta"],
  },
};

/**
 * O que o comando `plano` escreve. O piso sai em branco de propósito: piso de
 * exemplo salvo por engano faz o relatório medir contra número inventado, e
 * número inventado apresentado como medida é o pior defeito que este script
 * pode ter.
 */
const PLANO_EM_BRANCO = {
  cenario: "venda",
  cliente: "[a confirmar]",
  conferido_em: br.iso(new Date()),
  implicacao_previstas: [],
  piso: {
    limites: [
      { o_que: "desconto", limite: null, unidade: "%", direcao: "maximo" },
      { o_que: "prazo de pagamento", limite: null, unidade: "dias", direcao: "maximo" },
      { o_que: "prazo de entrega", limite: null, unidade: "dias", direcao: "minimo" },
    ],
    nunca: [],
  },
};

const MOLDE_TRANSCRICAO = [
  "## Transcrição",
  "",
  "**Você:** Como funciona hoje o controle da produção?",
  "**Cliente:** A gente anota num caderno e no fim do dia soma.",
  "**Pausa:** pediu dica — sugerido puxar a implicação antes de falar de plano",
  "**Concessão:** desconto de 8% — em troca: fechamento hoje e depoimento gravado",
  '**Objeção nova:** "meu contador disse que não vale a pena"',
].join("\n");

// ─────────────────────────── main ───────────────────────────

const AJUDA = `
Contex OS — ensaiar.js

  node scripts/ensaiar.js medir <ensaio.md> [--plano <plano.json>] [--json]
  node scripts/ensaiar.js plano <roteiro.md> [saida.json]
  node scripts/ensaiar.js molde

Código de saída 1 quando há regra dura rompida (concessão fora do piso,
concessão sem troca, item da lista "nunca", preço antes do problema).
`;

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const livres = [];
  let planoArg = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") continue;
    if (argv[i] === "--plano") {
      planoArg = argv[++i];
      if (!planoArg || planoArg.startsWith("--")) morrer("a opção --plano precisa do caminho do arquivo", "node scripts/ensaiar.js medir ensaio.md --plano ensaio.plano.json");
      continue;
    }
    livres.push(argv[i]);
  }
  const comando = (livres[0] || "").toLowerCase();

  if (!comando || comando === "ajuda" || comando === "--help") {
    console.log(AJUDA);
    process.exit(0);
  }

  if (comando === "molde") {
    console.log(JSON.stringify(MOLDE_PLANO, null, 2));
    console.log("\n" + MOLDE_TRANSCRICAO + "\n");
    process.exit(0);
  }

  if (comando === "plano") {
    const roteiro = livres[1];
    if (!roteiro) morrer("falta o roteiro", "node scripts/ensaiar.js plano vendas/roteiro-padaria-2026-09-22.md");
    if (!fs.existsSync(roteiro)) morrer(`não achei ${roteiro}`);
    const perguntas = planoDoRoteiro(roteiro);
    const plano = JSON.parse(JSON.stringify(PLANO_EM_BRANCO));
    plano.implicacao_previstas = perguntas;
    plano.conferido_em = br.iso(new Date());
    const saida = livres[2];
    if (saida) {
      fs.writeFileSync(saida, JSON.stringify(plano, null, 2) + "\n");
      console.log(`\n✓ ${perguntas.length} pergunta(s) de implicação em ${saida}`);
      console.log(`  Falta o piso: os quatro limites estão em null e saem da conversa com o dono.\n`);
    } else {
      console.log(JSON.stringify(plano, null, 2));
    }
    if (!perguntas.length) {
      console.error(`\n  Aviso: nenhuma pergunta de implicação no roteiro. Pergunte as 3 a 5 ao usuário e escreva à mão.\n`);
    }
    process.exit(0);
  }

  if (comando !== "medir") morrer(`não conheço o comando "${comando}"`, "Comandos: medir, plano, molde.");

  const arquivo = livres[1];
  if (!arquivo) morrer("falta o arquivo do ensaio", "node scripts/ensaiar.js medir vendas/ensaios/2026-09-22-padaria.md");
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);

  const caminhoPlano = planoArg || arquivo.replace(/\.md$/i, "") + ".plano.json";
  let plano = {};
  if (fs.existsSync(caminhoPlano)) {
    try {
      plano = JSON.parse(fs.readFileSync(caminhoPlano, "utf8").replace(/^﻿/, ""));
    } catch (e) {
      morrer(`o plano ${path.basename(caminhoPlano)} não é JSON válido: ${e.message}`);
    }
    if (!plano || typeof plano !== "object" || Array.isArray(plano)) {
      morrer(`o plano ${path.basename(caminhoPlano)} precisa ser um objeto JSON`, "Rode `node scripts/ensaiar.js molde` pra ver a forma.");
    }
  } else if (planoArg) {
    morrer(`não achei o plano ${planoArg}`);
  } else {
    console.error(`\n  Aviso: sem plano ao lado (${path.basename(caminhoPlano)}). Sem ele não há implicação prevista nem piso pra conferir.`);
  }

  const r = medir(arquivo, plano);
  if (json) {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.duras.length ? 1 : 0);
  }
  process.exit(imprimir(r));
}

module.exports = {
  secaoTranscricao, lerTranscricao, medirImplicacao, medirFala,
  medirPrecoAntesDoProblema, medirConcessoes, medirTrocas, medir, planoDoRoteiro,
  palavrasChave, numeroComUnidade, normalizarUnidade, acharLimite, confereNunca,
  pisoEmBranco, MOLDE_PLANO, PLANO_EM_BRANCO,
};

if (require.main === module) main();
