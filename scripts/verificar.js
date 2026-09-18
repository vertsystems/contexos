#!/usr/bin/env node
/**
 * Contex OS — verificar.js
 * Confere o que não pode ser estimado: contagem, soma, data, contraste, peso.
 *
 * Existe porque erro de número não se pega lendo. Toda skill que produz número
 * roda a verificação aqui antes de entregar.
 *
 * Uso:
 *   node scripts/verificar.js csv <arquivo.csv> [--ads]
 *   node scripts/verificar.js datas <arquivo.md>
 *   node scripts/verificar.js tabela <arquivo.md>
 *   node scripts/verificar.js contraste "#0E1116" "#F7F5F1"
 *   node scripts/verificar.js html <arquivo.html>
 *   node scripts/verificar.js peso <pasta-ou-arquivo>
 *   node scripts/verificar.js tudo <pasta>
 *   node scripts/verificar.js sistema [pasta]
 *
 * Sai com código 1 se achar problema — dá pra encadear com &&.
 * Node 18+. Sem dependência.
 */

const fs = require("fs");
const path = require("path");

let problemas = 0;
const erro = (m) => { console.log(`  ✖ ${m}`); problemas++; };
const ok = (m) => console.log(`  ✓ ${m}`);
const info = (m) => console.log(`  · ${m}`);

// ─────────────────────────── CSV ───────────────────────────
// Detecta: campo com vírgula não escapada (linha com nº de colunas diferente),
// e limites do Google Ads (headline 30, description 90, path 15).

function parseCSVLine(linha) {
  const campos = [];
  let atual = "", dentroAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroAspas && linha[i + 1] === '"') { atual += '"'; i++; }
      else dentroAspas = !dentroAspas;
    } else if (c === "," && !dentroAspas) { campos.push(atual); atual = ""; }
    else atual += c;
  }
  campos.push(atual);
  return campos;
}

const LIMITES_ADS = [
  { re: /^headline/i, max: 30, nome: "Headline" },
  { re: /^description/i, max: 90, nome: "Description" },
  { re: /^path/i, max: 15, nome: "Path" },
];

function verCSV(arquivo, ads) {
  console.log(`\nCSV: ${arquivo}`);
  const linhas = fs.readFileSync(arquivo, "utf8").split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) return erro("arquivo vazio");

  const cab = parseCSVLine(linhas[0]);
  info(`${cab.length} colunas, ${linhas.length - 1} linhas de dados`);

  // 1. contagem de campos
  let desalinhadas = 0;
  linhas.forEach((l, i) => {
    if (i === 0) return;
    const n = parseCSVLine(l).length;
    if (n !== cab.length) {
      desalinhadas++;
      erro(`linha ${i + 1}: ${n} campos, esperado ${cab.length} — quase sempre é vírgula dentro de campo sem aspas`);
      const suspeitos = parseCSVLine(l).filter((c) => c.includes(",") === false && c.trim().startsWith(" "));
      if (suspeitos.length) info(`    provável: "${suspeitos[0].trim().slice(0, 40)}"`);
    }
  });
  if (!desalinhadas) ok("todas as linhas com o mesmo número de campos");

  // 2. limites (Google Ads)
  if (ads) {
    let estouros = 0;
    const idx = cab.map((c, i) => ({ i, c: c.trim(), lim: LIMITES_ADS.find((L) => L.re.test(c.trim())) })).filter((x) => x.lim);
    linhas.forEach((l, li) => {
      if (li === 0) return;
      const campos = parseCSVLine(l);
      idx.forEach(({ i, c, lim }) => {
        const v = (campos[i] || "").trim();
        if (v.length > lim.max) {
          estouros++;
          erro(`linha ${li + 1}, ${c}: ${v.length} caracteres (máx ${lim.max}) → "${v}"`);
        }
      });
    });
    if (!estouros && idx.length) ok(`todos os campos dentro do limite (${idx.length} colunas checadas)`);
    if (!idx.length) info("nenhuma coluna Headline/Description/Path encontrada — pulei o limite");
  }
}

// ─────────────────────────── DATAS ───────────────────────────
// Detecta: "seg 01/09" quando 01/09 é terça.

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_LONGO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function normaliza(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function verDatas(arquivo) {
  console.log(`\nDATAS: ${arquivo}`);
  const texto = fs.readFileSync(arquivo, "utf8");
  const linhas = texto.split("\n");

  // ano de referência: prioriza o do título/nome do arquivo (calendario-2026-09),
  // depois "de/em AAAA" no cabeçalho, e só então o primeiro 20xx solto.
  // Pegar qualquer 20xx do texto erra em arquivo que cita "fundada em 2019".
  const doNome = path.basename(arquivo).match(/\b(20\d{2})\b/);
  const doTitulo = (texto.split("\n").slice(0, 8).join(" ")).match(/\b(20\d{2})\b/);
  const solto = texto.match(/\b(20\d{2})\b/);
  const ano = parseInt((doNome && doNome[1]) || (doTitulo && doTitulo[1]) || (solto && solto[1]) || new Date().getFullYear());
  info(`ano de referência: ${ano}${doNome ? " (do nome do arquivo)" : doTitulo ? " (do cabeçalho)" : ""}`);

  let checadas = 0, erradas = 0;
  const DIA = "dom|seg|ter|qua|qui|sex|s[áa]b|domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado";
  const DATA = "(\\d{1,2})[\\/\\-](\\d{1,2})(?:[\\/\\-](\\d{2,4}))?";
  // duas ordens: "seg 01/09"  e  "| 01/09 | seg |" (tabela)
  const padroes = [
    { re: new RegExp(`\\b(${DIA})\\b[^\\d\\n]{0,12}${DATA}`, "gi"), ordem: "dia-data" },
    { re: new RegExp(`${DATA}[^\\dA-Za-z\\n]{0,6}\\b(${DIA})\\b`, "gi"), ordem: "data-dia" },
  ];

  linhas.forEach((linha, i) => {
    const jaVistas = new Set();
    for (const { re, ordem } of padroes) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(linha))) {
        const diaTxt = ordem === "dia-data" ? m[1] : m[4];
        const [d, mes, anoTxt] = ordem === "dia-data" ? [m[2], m[3], m[4]] : [m[1], m[2], m[3]];
        const a = anoTxt && anoTxt.length >= 2 && +anoTxt > 12 ? (anoTxt.length === 2 ? 2000 + +anoTxt : +anoTxt) : ano;
        const dt = new Date(a, +mes - 1, +d);
        const chave = `${d}/${mes}`;
        if (dt.getDate() !== +d || dt.getMonth() !== +mes - 1) {
          if (!jaVistas.has(chave)) {
            jaVistas.add(chave);
            checadas++;
            erradas++;
            erro(`linha ${i + 1}: "${d}/${mes}/${a}" não existe no calendário`);
          }
          continue;
        }
        if (jaVistas.has(chave)) continue;
        jaVistas.add(chave);
        checadas++;
        const real = dt.getDay();
        if (normaliza(diaTxt).slice(0, 3) !== normaliza(DIAS[real]).slice(0, 3)) {
          erradas++;
          erro(`linha ${i + 1}: "${d}/${mes}" está marcado como ${diaTxt} — mas ${d}/${mes}/${a} é ${DIAS_LONGO[real]}`);
        }
      }
    }
  });

  if (!checadas) info("nenhum par dia-da-semana + data encontrado");
  else if (!erradas) ok(`${checadas} datas conferidas, todos os dias da semana corretos`);
}

// ─────────────────────────── TABELA ───────────────────────────
// Detecta: soma das linhas que não bate com o total declarado no texto.

function numerosDe(s) {
  // "R$ 16.900" → 16900 · "62,5%" → 62.5 · "1.487" → 1487
  const limpo = s.replace(/R\$\s*/g, "").trim();
  const m = limpo.match(/-?[\d.,]+/);
  if (!m) return null;
  let n = m[0];
  if (n.includes(",") && n.includes(".")) n = n.replace(/\./g, "").replace(",", ".");
  else if (n.includes(",")) n = n.replace(",", ".");
  else if ((n.match(/\./g) || []).length >= 1 && /\.\d{3}(\D|$)/.test(n + " ")) n = n.replace(/\./g, "");
  const v = parseFloat(n);
  return isNaN(v) ? null : v;
}

/** Divide a linha da tabela preservando célula vazia do meio (só apara as bordas). */
function celulas(linha) {
  const c = linha.split("|").map((s) => s.trim());
  if (c.length && c[0] === "") c.shift();
  if (c.length && c[c.length - 1] === "") c.pop();
  return c;
}

const RE_TOTAL = /^\**\s*(total|totais|soma|somat[óo]rio|subtotal|investimento total|valor total|geral)\b/i;

function verTabela(arquivo) {
  console.log(`\nTABELA: ${arquivo}`);
  const linhas = fs.readFileSync(arquivo, "utf8").split("\n");
  let tabelas = 0;

  for (let i = 0; i < linhas.length; i++) {
    if (!/^\s*\|/.test(linhas[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(linhas[i + 1] || "")) continue;
    const cab = celulas(linhas[i]);
    let corpo = [];
    let j = i + 2;
    while (j < linhas.length && /^\s*\|/.test(linhas[j])) {
      corpo.push(celulas(linhas[j]));
      j++;
    }
    if (corpo.length < 2) { i = j; continue; }
    tabelas++;

    // linha de total DENTRO da tabela: tirar do corpo e usar como valor declarado
    let linhaTotal = null;
    if (corpo.length && RE_TOTAL.test(corpo[corpo.length - 1][0] || "")) {
      linhaTotal = corpo.pop();
    }

    // tabela de métricas heterogêneas (uma métrica por linha) não soma
    const tituloPrimeira = (cab[0] || "").toLowerCase();
    // "Item" NÃO entra: é o cabeçalho padrão de orçamento, que soma.
    // Heterogênea é a tabela em que cada linha é uma métrica diferente
    // (fechamentos, receita, ticket) — somar isso não significa nada.
    const heterogenea = /^(m[ée]trica|indicador|kpi)s?$/.test(tituloPrimeira);
    if (heterogenea) {
      info(`tabela de métricas ("${cab[0]}") — linhas não são somáveis entre si, pulei a soma`);
      i = j;
      continue;
    }

    // texto ao redor da tabela: o total costuma estar num resumo antes ou depois
    const volta = linhas.slice(Math.max(0, i - 25), i).join("\n");
    const depois = linhas.slice(j, j + 15).join("\n");
    const contexto = volta + "\n" + depois;

    cab.forEach((titulo, c) => {
      const vals = corpo.map((r) => numerosDe(r[c] || "")).filter((v) => v !== null);
      if (vals.length < 2 || vals.length < corpo.length - 1) return;
      if (/%|taxa|média|media|preço unit|cpc|cpa/i.test(titulo)) return; // não somam
      const soma = vals.reduce((a, b) => a + b, 0);
      info(`coluna "${titulo}" soma ${soma.toLocaleString("pt-BR")} (${vals.length} linhas)`);

      const igual = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.005);

      // 1) linha de total dentro da própria tabela — a comparação mais confiável
      if (linhaTotal) {
        const dec = numerosDe(linhaTotal[c] || "");
        if (dec !== null) {
          if (!igual(dec, soma)) {
            erro(`coluna "${titulo}": os itens somam ${soma.toLocaleString("pt-BR")}, mas a linha "${linhaTotal[0]}" declara ${dec.toLocaleString("pt-BR")}`);
          } else ok(`coluna "${titulo}": itens batem com a linha de total`);
          return; // total na tabela tem precedência sobre o texto ao redor
        }
      }

      // 2) total declarado no texto ao redor
      const candidatos = [
        ...contexto.matchAll(/\*\*([^*]{1,25})\*\*/g),
        ...contexto.matchAll(/(?:total|somando|somam|no total|receita total)[^\n]{0,40}/gi),
      ].map((m) => ({ txt: m[0], val: numerosDe(m[1] || m[0]) })).filter((x) => x.val !== null);

      for (const cand of candidatos) {
        // só compara com número da mesma ordem de grandeza (evita casar 50% com 6)
        const prox = Math.abs(cand.val - soma) <= Math.max(soma * 0.35, 3);
        if (prox && !igual(cand.val, soma)) {
          erro(`coluna "${titulo}": as linhas somam ${soma.toLocaleString("pt-BR")}, mas o texto declara ${cand.val.toLocaleString("pt-BR")} — "${cand.txt.trim().slice(0, 60)}"`);
          break;
        }
      }
    });
    i = j;
  }
  if (!tabelas) info("nenhuma tabela markdown encontrada");
  verMultiplicacoes(fs.readFileSync(arquivo, "utf8"));
}

// ─────────────────────────── MULTIPLICAÇÃO ───────────────────────────
// "12× R$ 74 = R$ 890" passava em branco: o verTabela só soma coluna, e conta
// escrita em prosa (página de preço, proposta, plano anual) nunca era conferida.
// Numa página de preço, essa é a conta que o cliente refaz na calculadora.

const RE_MULT = /(\d{1,3})\s*[x×]\s*(?:de\s+)?(?:R\$\s*)?([\d][\d.,]*)\s*(?:=|·|—|-)?\s*(?:R\$\s*)?(?:no total|total(?:iza)?(?:ndo)?)?\s*(?:=|:)?\s*R\$\s*([\d][\d.,]*)/gi;

function verMultiplicacoes(texto) {
  let achou = 0;
  for (const m of texto.matchAll(RE_MULT)) {
    const n = parseInt(m[1], 10);
    const unit = numerosDe(m[2]);
    const total = numerosDe(m[3]);
    if (!n || unit === null || total === null) continue;
    // "1× R$ 90 = R$ 90" e parcela maior que o total são outra coisa (desconto, entrada)
    if (n < 2 || total < unit) continue;
    achou++;
    const esperado = n * unit;
    // tolerância de 1%: parcela arredondada em centavos é normal, erro de conta não
    if (Math.abs(esperado - total) > Math.max(0.5, esperado * 0.01)) {
      erro(`"${m[0].trim()}" não fecha: ${n} × ${unit.toLocaleString("pt-BR")} = ${esperado.toLocaleString("pt-BR")}, não ${total.toLocaleString("pt-BR")}`);
    }
  }
  if (achou) ok(`${achou} multiplicação(ões) do tipo "N× R$ X = R$ Y" conferida(s)`);
}

// ─────────────────────────── TEXTO ───────────────────────────
// Sinais de texto gerado por máquina. NÃO é detector de IA — detector de IA não
// funciona, e chuta contra quem escreve bem. O que este check faz é contar os
// padrões que denunciam texto sintético e medir o ritmo, que é o sinal mais
// difícil de disfarçar: máquina escreve frases de comprimento parecido.
//
// A lista editorial completa é `templates/copy/edicao.md`, mantida em prosa.
// Aqui ficam só os padrões que dá para casar por expressão regular.

const CLICHES = [
  [/\bmergulh(e|ar|ando)\b/gi, "mergulhe"],
  [/\bdesvend(e|ar|ando)\b/gi, "desvende"],
  [/\bdescubra o segredo\b/gi, "descubra o segredo"],
  [/\bembarqu(e|ar)\b/gi, "embarque"],
  [/\bdesbloqu(eie|ear)\b/gi, "desbloqueie"],
  [/\btransforme sua?\b/gi, "transforme sua"],
  [/\belev(e|ar) (seu|sua|o seu|a sua)\b/gi, "eleve seu"],
  [/\bpotencialize\b/gi, "potencialize"],
  [/\balavanc(ar|ue|ando)\b/gi, "alavancar"],
  [/\bdestrav(e|ar)\b/gi, "destrave"],
  [/\brevolucionári[oa]\b/gi, "revolucionário"],
  [/\bdisruptiv[oa]\b/gi, "disruptivo"],
  [/\bgame.?changer\b/gi, "game-changer"],
  [/\bnext level\b/gi, "next level"],
  [/n[ãa]o (é|se trata de) (apenas|só|somente) [^.,;!?]{1,45}[,;] (é|mas|mas sim)/gi, '"não é apenas X, é Y"'],
  [/em um mundo cada vez mais/gi, '"em um mundo cada vez mais"'],
  [/\bseja voc[êe] (um|uma)\b/gi, '"seja você um A ou um B"'],
  [/\ba verdade é que\b/gi, '"a verdade é que"'],
  [/\bimagine poder\b/gi, '"imagine poder"'],
  [/e se eu te dissesse/gi, '"e se eu te dissesse"'],
  [/\b(é importante|cabe) (notar|destacar|ressaltar|frisar)\b/gi, '"é importante notar"'],
  [/\bvale (ressaltar|destacar|lembrar|mencionar)\b/gi, '"vale ressaltar"'],
  [/\bno mundo de hoje\b|\bnos dias atuais\b|\bno cen[áa]rio atual\b/gi, '"no mundo de hoje"'],
  [/\bcada vez mais\b/gi, '"cada vez mais"'],
  [/\bnunca foi t[ãa]o f[áa]cil\b/gi, '"nunca foi tão fácil"'],
  [/\bem constante evolu[çc][ãa]o\b/gi, '"em constante evolução"'],
  [/\bo que voc[êe] est[áa] esperando\b/gi, '"o que você está esperando?"'],
  [/\bo futuro é agora\b/gi, '"o futuro é agora"'],
  [/\ba escolha é sua\b/gi, '"a escolha é sua"'],
  [/\bjuntos somos mais fortes\b/gi, '"juntos somos mais fortes"'],
  [/\bnessa jornada\b/gi, '"nessa jornada"'],
  [/\bconte com a gente\b/gi, '"conte com a gente"'],
  // só conta como fecho de texto no começo da frase: "menos gente concluindo," é gerúndio
  [/(?:^|[.!?:]\s+|\n)(?:em suma\b|em resumo,|concluindo,)/gim, '"em suma"'],
  [/\bsem mais delongas\b|\bvamos ao que interessa\b/gi, '"sem mais delongas"'],
  [/\bprepare-se para\b/gi, '"prepare-se para"'],
  [/\bsolu[çc][ãa]o (completa|ideal|perfeita)\b/gi, '"solução completa"'],
  [/\bum dos pilares\b/gi, '"um dos pilares"'],
  [/\bassertiv[oa]s?\b/gi, "assertivo"],
  [/\bfaz toda a diferen[çc]a\b/gi, '"faz toda a diferença"'],
  [/\bé (essencial|fundamental|recomend[áa]vel) que\b/gi, '"é essencial que"'],
  [/\bfica(r)? por dentro\b/gi, '"ficar por dentro"'],
  [/\bponta do iceberg\b/gi, '"ponta do iceberg"'],
];

/** Tira o que não é prosa: frontmatter, código, tabela, URL, marcação. */
function soProsa(bruto, manterMarcacao = false) {
  return bruto
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, "")       // frontmatter
    .replace(/```[\s\S]*?```/g, "")                  // bloco de código
    .replace(/`[^`\n]*`/g, "")                       // código curto
    .replace(/^\s*\|.*\|\s*$/gm, "")                 // tabela markdown
    .replace(/<!--[\s\S]*?-->/g, " ")                 // comentário HTML não é texto publicado
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")  // CSS e JS não são prosa
    // fim de bloco vira fronteira de parágrafo: sem isso, dois blocos vizinhos
    // grudam numa "frase" só e o texto do HTML sai medido errado
    .replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|td|tr|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")                        // tags
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")         // link markdown
    .replace(/https?:\/\/\S+/g, "")                  // URL solta
    .replace(/^#{1,6}\s+.*$/gm, "")                  // título não é frase: entrar na conta infla
                                                     // "frases curtas" e inventa paralelismo
    .replace(manterMarcacao ? /(?!)/ : /[*_]{1,3}/g, "");   // negrito e itálico
}

function frasesDe(prosa) {
  return prosa
    .split(/(?<=[.!?…])\s+|\n{2,}/)
    .map((f) => f.trim())
    .filter((f) => f.split(/\s+/).filter(Boolean).length >= 3);
}

function verTexto(arquivo) {
  console.log(`\nTEXTO: ${arquivo}`);
  const bruto = fs.readFileSync(arquivo, "utf8");
  const prosa = soProsa(bruto);
  const palavras = prosa.split(/\s+/).filter((p) => /[A-Za-zÀ-ÿ]/.test(p));
  const total = palavras.length;
  if (total < 60) return info(`só ${total} palavras de prosa — curto demais para medir ritmo`);

  const problemasAntes = problemas;

  // Ritmo se mede em prosa corrida: item de lista não tem cadência de frase, e um
  // arquivo que é quase todo lista (catálogo, molde) daria número sem significado.
  // Item de lista e suas CONTINUAÇÕES (linhas indentadas embaixo dele) saem juntos.
  // Sem isso, a continuação de um item vira uma "frase" cortada pela metade.
  let emItem = false;
  const corrido = prosa
    .split("\n")
    .filter((l) => {
      if (/^\s*([-*+]|\d+\.|\||>)/.test(l)) { emItem = true; return false; }
      if (emItem && /^\s+\S/.test(l)) return false;      // continuação indentada
      if (!l.trim()) { emItem = false; return true; }      // linha em branco fecha o item
      emItem = false;
      return true;
    })
    .join("\n");
  const frases = frasesDe(corrido);
  const palavrasCorridas = corrido.split(/\s+/).filter((x) => /[A-Za-zÀ-ÿ]/.test(x)).length;
  if (palavrasCorridas < 120) {
    info(`${palavrasCorridas} palavras de prosa corrida (o resto é lista ou tabela) — ritmo não medido`);
  }
  const tam = frases.map((f) => f.split(/\s+/).filter(Boolean).length);
  const media = tam.reduce((a, b) => a + b, 0) / tam.length;
  const dp = Math.sqrt(tam.reduce((a, b) => a + (b - media) ** 2, 0) / tam.length);
  const variacao = media ? dp / media : 0;
  const porMil = (n) => Math.round((n / total) * 1000 * 10) / 10;

  info(`${total} palavras, ${frases.length} frases (média de ${media.toFixed(1)} palavras)`);
  info("    régua de peça que vai pro público (post, página, e-mail); material de referência usa outro registro");

  // ── ritmo: o sinal que menos se disfarça ──
  const RITMO_MIN = 0.45;
  if (palavrasCorridas < 120) { /* medido acima: prosa insuficiente */ }
  else if (variacao < RITMO_MIN) {
    erro(`ritmo uniforme: variação de ${variacao.toFixed(2)} no comprimento das frases (a régua é ${RITMO_MIN})`);
    info(`    máquina escreve frases do mesmo tamanho. O conserto é uma frase curta de verdade — três, quatro palavras — ao lado de uma longa`);
  } else ok(`ritmo variado: ${variacao.toFixed(2)} de variação no comprimento das frases`);

  // ── frase curta de verdade: o sinal mais discriminante que medimos ──
  // Em texto de blog gerado, a proporção fica em 0%. Em texto com voz, entre 23% e 41%.
  const CURTAS_MIN = 15;   // por cento
  const curtas = Math.round((tam.filter((n) => n <= 8).length / tam.length) * 100);
  if (palavrasCorridas < 120) { /* prosa insuficiente */ }
  else if (curtas < CURTAS_MIN) {
    erro(`só ${curtas}% de frases curtas (até 8 palavras) — a régua é ${CURTAS_MIN}%`);
    info("    é o sinal mais fácil de consertar e o que mais muda a leitura: corte uma frase média no meio");
  } else ok(`${curtas}% de frases curtas — a cadência varia`);

  // ── travessão: não é proibido, o excesso é que denuncia ──
  const TRAVESSAO_MAX = 8;   // por mil palavras — ~1 a cada 125 palavras
  // Em item de lista, o PRIMEIRO travessão separa termo e definição — é estrutura.
  // O vício que denuncia texto gerado é o travessão retórico no meio do parágrafo.
  // Definição é estrutura em três formas: item de lista, item dentro de citação e
  // rótulo em negrito abrindo a linha ("**Núcleo** — o jeito de operar o dia a dia").
  // Nas três, o PRIMEIRO travessão separa termo e explicação. Do segundo em diante,
  // é retórica e conta.
  const RE_DEFINICAO = /^\s*(?:>\s*)?(?:[-*+]|\d+\.)\s|^\s*(?:>\s*)?\*\*[^*\n]{2,60}\*\*\s*—/;
  const semDefinicao = soProsa(bruto, true)
    .split("\n")
    .map((l) => (RE_DEFINICAO.test(l) ? l.replace("—", " ") : l))
    .join("\n");
  const travessoes = (semDefinicao.match(/—/g) || []).length;
  // em texto curto a densidade por mil exagera: 2 travessões em 150 palavras não é vício
  if (travessoes >= 3 && porMil(travessoes) > TRAVESSAO_MAX)
    erro(`${travessoes} travessões em ${total} palavras (${porMil(travessoes)} por mil, a régua é ${TRAVESSAO_MAX})`);
  else if (travessoes) ok(`${travessoes} travessões (${porMil(travessoes)} por mil) — dentro da régua`);

  // ── clichê ──
  // Três filtros para não acusar quem ENSINA a evitar clichê:
  //   · linha com "·" repetido enumera termos (é o formato da `edicao.md`)
  //   · termo entre aspas está sendo citado, não usado
  //   · linha em que caem 3+ clichês distintos é enumeração didática, não prosa
  const linhas = prosa.split("\n").map((l) => l.replace(/["“][^"”\n]{2,60}["”]/g, " "));
  // Enumeração didática tem RÓTULO ("Verbos e aberturas:", "Advérbio que não muda nada:").
  // Sem exigir o rótulo, um parágrafo promocional que amontoa clichês seria perdoado
  // justamente por ser pior — foi o que aconteceu na primeira versão desta regra.
  const RE_ROTULO = /^\s*(?:[-*+]\s+)?(?:\*\*)?[^:\n]{3,70}:(?:\*\*)?\s/;
  const ehEnumeracao = (l) => {
    if ((l.match(/·/g) || []).length >= 2) return true;
    if (!RE_ROTULO.test(l)) return false;
    const depois = l.slice(l.indexOf(":") + 1);
    if ((depois.match(/,/g) || []).length >= 3) return true;   // "rótulo: a, b, c, d" é lista
    let distintos = 0;
    for (const [re] of CLICHES) if (re.test(l)) distintos++;
    return distintos >= 3;
  };
  const semListas = linhas.filter((l) => !ehEnumeracao(l)).join("\n");
  const achados = [];
  for (const [re, nome] of CLICHES) {
    const n = (semListas.match(re) || []).length;
    if (n) achados.push(n > 1 ? `${nome} (${n}×)` : nome);
  }
  if (achados.length) {
    erro(`${achados.length} clichê(s) de IA: ${achados.slice(0, 10).join(" · ")}${achados.length > 10 ? ` (+${achados.length - 10})` : ""}`);
  } else ok("nenhum clichê da lista");

  // ── advérbio em -mente ──
  const MENTE_MAX = 8;
  const mentes = prosa
    .split("\n")
    .filter((l) => (l.match(/\b\w{4,}mente\b/gi) || []).length < 3)   // linha com 3+ é a lista de proibidos
    .join("\n")
    .match(/\b\w{4,}mente\b/gi)?.length || 0;
  if (mentes >= 3 && porMil(mentes) > MENTE_MAX) erro(`${mentes} advérbios em "-mente" (${porMil(mentes)} por mil, a régua é ${MENTE_MAX})`);

  // ── formato de lista ──
  const itens = bruto.match(/^\s*[-*+]\s+\S/gm) || [];
  const negrito = bruto.match(/^\s*[-*+]\s+\*\*/gm) || [];
  if (itens.length >= 4 && negrito.length / itens.length > 0.7) {
    const msg = `${negrito.length} de ${itens.length} itens de lista começam em negrito — o formato de bullet mais reconhecível de texto gerado`;
    // Sozinho é sinal fraco: material de referência usa "- **termo** — definição" com
    // razão. Vira problema quando vem junto de ritmo uniforme ou clichê.
    if (problemas > problemasAntes) erro(msg); else info(msg);
  }
  // ✓ ✔ ✗ → e afins são marcação funcional (o bloco de entrega de toda skill usa "✓").
  // O que denuncia é emoji pictórico: 🚀 💡 ✨ 🔥.
  const semCodigo = bruto.replace(/```[\s\S]*?```/g, "");
  const emojiBullet = semCodigo.match(/^\s*[-*+]?\s*[\u{1F300}-\u{1FAFF}\u{2728}\u{2733}\u{2734}\u{2757}\u{2764}]/gmu) || [];
  if (emojiBullet.length >= 3) erro(`${emojiBullet.length} linhas com emoji fazendo papel de bullet`);

  // ── parágrafo que começa com conectivo de enumeração ──
  // "Além disso… Por outro lado… Por fim…" é a espinha do texto escolar de LLM.
  const CONECTIVOS = /^(além disso|por fim|em primeiro lugar|por outro lado|dessa forma|desse modo|portanto|assim sendo|vale lembrar|outro ponto|ademais|nesse sentido)\b/i;
  const paragrafos = prosa.split(/\n{2,}/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length > 8);
  const comConectivo = paragrafos.filter((x) => CONECTIVOS.test(x)).length;
  if (comConectivo >= 3)
    erro(`${comConectivo} parágrafos abrem com conectivo de enumeração ("Além disso", "Por fim") — é a espinha do texto de redação automática`);

  // ── abertura repetida: paralelismo mecânico ──
  // Dentro do MESMO parágrafo. Sem isso, frases separadas por uma lista de vinte itens
  // eram lidas como consecutivas, e todo catálogo virava "paralelismo mecânico".
  let pior = 1, palavraPior = "";
  for (const par of corrido.split(/\n{2,}/)) {
    const ini = frasesDe(par).map((f) => (f.match(/^[A-Za-zÀ-ÿ]+/) || [""])[0].toLowerCase());
    let seguidas = 1;
    for (let i = 1; i < ini.length; i++) {
      if (ini[i] && ini[i] === ini[i - 1]) {
        seguidas++;
        if (seguidas > pior) { pior = seguidas; palavraPior = ini[i]; }
      } else seguidas = 1;
    }
  }
  if (pior >= 3) erro(`${pior} frases seguidas no mesmo parágrafo começando com "${palavraPior}" — paralelismo mecânico`);
}

// ─────────────────────────── CONTRASTE ───────────────────────────

function lum(hex) {
  const h = String(hex ?? "").replace("#", "").trim();
  // Sem isso, "vermelho" ou "rgb(255,0,0)" viram NaN e o check REPROVA em silêncio —
  // a skill "conserta" uma cor que estava boa. Melhor falhar dizendo o que houve.
  if (!/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) {
    throw new Error(`cor inválida: "${hex}" — use hexadecimal (#RGB, #RRGGBB ou #RRGGBBAA). Nome de cor e rgb() não são aceitos.`);
  }
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.substr(i, 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function razao(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function verContraste(c1, c2) {
  console.log(`\nCONTRASTE: ${c1} sobre ${c2}`);
  const r = razao(c1, c2);
  const v = r.toFixed(2);
  console.log(`  razão: ${v}:1`);
  if (r >= 4.5) ok(`passa em texto normal (4.5:1) e grande (3:1)`);
  else if (r >= 3) { erro(`reprova em texto normal (precisa 4.5:1) — só serve pra texto grande`); }
  else erro(`reprova em tudo (precisa 3:1 no mínimo)`);
  return r;
}

// ─────────────────────────── HTML ───────────────────────────
// Detecta: peça que depende de CSS externo local, e var() sem fallback.

function verHTML(arquivo) {
  console.log(`\nHTML: ${arquivo}`);
  const t = fs.readFileSync(arquivo, "utf8");

  const links = [...t.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const externosLocais = links.filter((h) => !/^https?:/.test(h) && /\.css$/i.test(h));
  if (externosLocais.length) {
    erro(`depende de CSS local externo: ${externosLocais.join(", ")}`);
    info("    se o arquivo for enviado sozinho (WhatsApp, e-mail, Drive), chega sem estilo");
  } else ok("não depende de CSS local externo");

  // Não basta existir um :root — cada token usado precisa estar DEFINIDO no arquivo
  // (ou ter fallback). Um inline parcial deixa tokens órfãos e a peça quebra em silêncio.
  const definidos = new Set([...t.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1].toLowerCase()));
  const vars = [...t.matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,[^)]*)?\)/gi)];
  const orfaos = vars.filter((m) => !m[2] && !definidos.has(m[1].toLowerCase()));

  if (vars.length && orfaos.length) {
    const nomes = [...new Set(orfaos.map((m) => m[1]))];
    erro(`${orfaos.length} uso(s) de var() apontando pra token que o arquivo não define, e sem fallback`);
    info(`    ${nomes.slice(0, 8).join(", ")}${nomes.length > 8 ? ` (+${nomes.length - 8})` : ""}`);
    info("    fora da pasta viram vazio — cor some, fundo some, botão fica invisível");
  } else if (vars.length) {
    ok(`${vars.length} var() — todos definidos no arquivo ou com fallback (${definidos.size} tokens declarados)`);
  }

  const page = t.match(/@page\s*\{[^}]*\}/i);
  if (page) {
    const size = page[0].match(/size:\s*([^;}]+)/i);
    if (size && /\d+(px|mm|cm|in)\s+\d+(px|mm|cm|in)\s+(landscape|portrait)/i.test(size[1])) {
      erro(`@page inválido: "size: ${size[1].trim()}" — medida explícita + orientação é descartado pelo navegador`);
      info("    duas medidas já definem a orientação: size: 1920px 1080px");
    } else ok(`@page válido: ${size ? size[1].trim() : "sem size"}`);
  }

  // 100vh só é problema DENTRO do @media print — na regra de tela é correto
  if (page) {
    // extrai o bloco @media print contando chaves — regex com lookahead falha
    // quando existe qualquer CSS depois do bloco de impressão
    const extraiBloco = (txt, iniRe) => {
      const m = txt.match(iniRe);
      if (!m) return null;
      let i = txt.indexOf("{", m.index);
      if (i === -1) return null;
      let nivel = 0;
      for (let k = i; k < txt.length; k++) {
        if (txt[k] === "{") nivel++;
        else if (txt[k] === "}") { nivel--; if (!nivel) return txt.slice(i + 1, k); }
      }
      return null;
    };
    const bloco = extraiBloco(t, /@media[^{]*\bprint\b[^{]*/i);
    const dentro = bloco ? /height:\s*100vh/i.test(bloco) : false;
    const temPrint = bloco !== null;
    if (dentro) erro("100vh dentro do @media print — o vh não corresponde à página impressa, usar a medida fixa (ex: height:1080px)");
    else if (!temPrint && /height:\s*100vh/i.test(t)) erro("100vh e @page sem bloco @media print que sobrescreva a altura — o slide vai sair cortado no PDF");
    else if (temPrint) ok("altura da impressão não depende de vh");
  }

  const placeholders = t.match(/\[(SEU|NOME|VALOR|PRAZO|CLIENTE|EMPRESA|A DEFINIR|a confirmar)[^\]]*\]|lorem ipsum/gi);
  if (placeholders) erro(`placeholder esquecido: ${[...new Set(placeholders)].slice(0, 5).join(", ")}`);

  const hrefsVazios = [...t.matchAll(/href=["'](#|mailto:\s*|tel:\s*|https?:\/\/wa\.me\/?)["']/gi)];
  if (hrefsVazios.length) erro(`${hrefsVazios.length} link vazio ou incompleto (href="#", mailto: sem endereço, wa.me sem número)`);

  // página de preço erra a conta em prosa, não em tabela: "12× R$ 97 = R$ 1.164"
  verMultiplicacoes(t.replace(/<[^>]+>/g, " "));
}

// ─────────────────────────── ALVO ───────────────────────────
// Tamanho de alvo clicável (WCAG 2.5.8 pede 24×24px; o piso do Contex OS é 34px,
// 44px no toque — ver templates/design/interface.md).
//
// A lógica é INVERTIDA de propósito. A versão ingênua — "medir o que declara e
// reprovar o pequeno" — aprova o pior caso: botão com `padding: 4px 8px` e nenhum
// min-height passa, porque não há altura para medir. Só o navegador sabe o tamanho
// final, e este script não é navegador. Então o que se exige é a DECLARAÇÃO:
// quem não declara min-height reprova, em vez de ser premiado pela omissão.

const PISO_ALVO = 34;   // piso do Contex OS no desktop
const MIN_WCAG = 24;    // mínimo do critério 2.5.8

function medidaPx(v) {
  const m = String(v).trim().match(/^([\d.]+)\s*(px|rem|em)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  return (m[2] || "px").toLowerCase() === "px" ? n : n * 16;
}

/** Maior altura declarada num bloco de declarações CSS. Padding NÃO conta. */
function alturaDe(decls) {
  let maior = null;
  for (const m of decls.matchAll(/(?:^|[;{\s])(min-height|min-block-size|height)\s*:\s*([^;}]+)/gi)) {
    const v = medidaPx(m[2]);
    if (v !== null) maior = maior === null ? v : Math.max(maior, v);
  }
  return maior;
}

/** Pares seletor/declarações de todo <style> do arquivo. Blocos @media são achatados. */
function regrasDe(html) {
  const regras = [];
  for (const st of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = st[1].replace(/\/\*[\s\S]*?\*\//g, "");
    for (const r of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const sel of r[1].split(",").map((s) => s.trim()).filter(Boolean)) {
        if (sel.startsWith("@")) continue;
        regras.push({ sel, decls: r[2] });
      }
    }
  }
  return regras;
}

function atributosDe(bruto) {
  const attrs = {};
  for (const m of bruto.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)) attrs[m[1].toLowerCase()] = m[2];
  for (const m of bruto.matchAll(/(?:^|\s)([\w-]+)(?=\s|$)/g)) if (!(m[1].toLowerCase() in attrs)) attrs[m[1].toLowerCase()] = "";
  return attrs;
}

/** O seletor alcança este elemento? Compara só o último simples — basta para o caso real. */
function seletorCasa(sel, el) {
  let s = (sel.split(/\s+|>|\+|~/).filter(Boolean).pop() || "").replace(/::?[a-z-]+(\([^)]*\))?/gi, "");
  if (!s || s === "*") return s === "*";
  const tag = (s.match(/^[a-z][a-z0-9]*/i) || [])[0];
  if (tag && tag.toLowerCase() !== el.tag) return false;
  for (const m of s.matchAll(/\.([\w-]+)/g)) if (!el.classes.includes(m[1])) return false;
  for (const m of s.matchAll(/#([\w-]+)/g)) if (m[1] !== el.attrs.id) return false;
  for (const m of s.matchAll(/\[([\w-]+)(?:[~|^$*]?=["']?([^\]"']*)["']?)?\]/g)) {
    const val = el.attrs[m[1].toLowerCase()];
    if (val === undefined) return false;
    if (m[2] && val !== m[2]) return false;
  }
  return true;
}

const TIPOS_INPUT_ALVO = new Set(["button", "submit", "reset", "checkbox", "radio", "file", "image"]);

function verAlvo(arquivo) {
  console.log(`\nALVO: ${arquivo}`);
  const html = fs.readFileSync(arquivo, "utf8");
  const regras = regrasDe(html);

  const semDeclaracao = new Map();  // assinatura → quantidade
  const pequenos = new Map();       // mensagem → quantidade (agrupa: 30 botões iguais são um problema, não 30)
  let inline = 0, conferidos = 0, aprovados = 0;

  for (const m of html.matchAll(/<(a|button|input|select|summary|textarea)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase();
    const attrs = atributosDe(m[2]);
    if (tag === "a" && attrs.href === undefined) continue;                       // âncora não é alvo
    if (tag === "input" && !TIPOS_INPUT_ALVO.has((attrs.type || "text").toLowerCase())) continue;
    if (attrs.hidden !== undefined || /display:\s*none/i.test(attrs.style || "")) continue;

    const classes = (attrs.class || "").split(/\s+/).filter(Boolean);
    const el = { tag, attrs, classes };

    // exceção "inline" do 2.5.8: link sem classe dentro de texto corrido
    if (tag === "a" && !classes.length) {
      const antes = html.slice(0, m.index);
      const bloco = (antes.match(/<(p|li|td|h[1-6]|figcaption|blockquote)\b[^>]*>(?![\s\S]*<\/\1>)/i) || [])[1];
      if (bloco) { inline++; continue; }
    }

    conferidos++;
    let altura = alturaDe(attrs.style || "");
    for (const r of regras) if (seletorCasa(r.sel, el)) {
      const a = alturaDe(r.decls);
      if (a !== null) altura = altura === null ? a : Math.max(altura, a);
    }

    const assinatura = `<${tag}${classes.length ? "." + classes.join(".") : ""}>`;
    if (altura === null) semDeclaracao.set(assinatura, (semDeclaracao.get(assinatura) || 0) + 1);
    else if (altura < PISO_ALVO) {
      const msg = altura < MIN_WCAG
        ? `${assinatura} declara ${altura}px — reprova no critério 2.5.8 (${MIN_WCAG}px)`
        : `${assinatura} declara ${altura}px — passa na WCAG, mas abaixo do piso do Contex OS (${PISO_ALVO}px)`;
      pequenos.set(msg, (pequenos.get(msg) || 0) + 1);
    }
    else aprovados++;
  }

  if (!conferidos && !inline) return info("nenhum elemento clicável encontrado");

  for (const [ass, n] of semDeclaracao)
    erro(`${ass}${n > 1 ? ` (${n}×)` : ""} sem min-height declarado — padding não garante alvo, e o tamanho final só existe no navegador`);
  for (const [msg, n] of pequenos) erro(n > 1 ? msg.replace(" declara", ` (${n}×) declara`) : msg);

  if (!semDeclaracao.size && !pequenos.size) ok(`${aprovados} elemento(s) clicável(is) com alvo declarado ≥${PISO_ALVO}px`);
  if (inline) info(`${inline} link(s) inline em texto corrido — exceção do 2.5.8, não conferidos`);

  const toque = /@media[^{]*(pointer:\s*coarse|hover:\s*none|max-width)[^{]*\{[\s\S]*?(min-height|min-block-size)\s*:\s*(4[4-9]|[5-9]\d)px/i.test(html);
  if (conferidos && !toque) info("nenhuma regra sobe o alvo para 44px no toque — no celular o piso é 44px");
}

// ─────────────────────────── PESO ───────────────────────────

function verPeso(alvo) {
  console.log(`\nPESO: ${alvo}`);
  const arqs = [];
  const anda = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) fs.readdirSync(p).forEach((f) => anda(path.join(p, f)));
    else if (/\.(png|jpe?g|pdf)$/i.test(p)) arqs.push({ p, mb: st.size / 1048576 });
  };
  anda(alvo);
  if (!arqs.length) return info("nenhuma imagem ou PDF");
  const pesados = arqs.filter((a) => a.mb > 2);
  arqs.sort((a, b) => b.mb - a.mb).slice(0, 3).forEach((a) => info(`${path.basename(a.p)}: ${a.mb.toFixed(1)} MB`));
  if (pesados.length) {
    pesados.forEach((a) => erro(`${path.basename(a.p)}: ${a.mb.toFixed(1)} MB — acima de 2 MB (limite da API da Meta é 8 MB; o Instagram recomprime pra 1080 de largura de qualquer forma)`));
    info("    quase sempre é deviceScaleFactor: 2 no render.js — usar 1");
  } else ok(`${arqs.length} arquivos, nenhum acima de 2 MB`);
}

// ─────────────────────────── TUDO ───────────────────────────

function verTudo(pasta) {
  const anda = (p, prof = 0) => {
    if (prof > 4) return;
    for (const f of fs.readdirSync(p)) {
      if (f.startsWith(".") || f === "node_modules") continue;
      const full = path.join(p, f);
      const st = fs.statSync(full);
      if (st.isDirectory()) anda(full, prof + 1);
      else if (/\.csv$/i.test(f)) verCSV(full, /ads|anuncio|google/i.test(f));
      else if (/\.html$/i.test(f)) { verHTML(full); verAlvo(full); }
      else if (/\.md$/i.test(f)) { verDatas(full); verTabela(full); }
    }
  };
  anda(pasta);
  verPeso(pasta);
}

// ─────────────────────────── SISTEMA ───────────────────────────
// Confere o próprio Contex OS, não o trabalho: skill que não carrega, referência
// a skill ou arquivo que não existe, script prometido e ausente, contagem
// desatualizada. É o check que se roda antes de publicar versão nova.
//
// Existe porque três SKILL.md ficaram meses com BOM UTF-8 antes do `---` (o
// frontmatter não é lido, e a skill nunca é encontrada) e uma skill mandava
// rodar dois scripts que nunca estiveram no repositório.

// Barras que aparecem no texto e NÃO são skill do Contex OS. Cada uma com o
// motivo — a lista é curta de propósito: crescer aqui é esconder problema.
const NAO_SAO_SKILLS = new Set([
  "health",                                       // endpoint HTTP, citado no /backend
  "prazo", "endereco", "pagamento",               // atalhos de resposta rápida do WhatsApp Business
  "schwartz-copy", "ogilvy-copy", "yt-transcript",// skills de terceiros: catalogadas, não instaladas
  "nome-da-skill", "comando", "skill", "nome",    // exemplo genérico em texto
]);

function mdsDe(raiz) {
  const achados = [];
  const anda = (p) => {
    for (const f of fs.readdirSync(p)) {
      if (f === ".git" || f === "node_modules") continue;
      const full = path.join(p, f);
      if (fs.statSync(full).isDirectory()) anda(full);
      else if (/\.md$/i.test(f)) achados.push(full);
    }
  };
  anda(raiz);
  return achados;
}

function verSistema(raiz = ".") {
  console.log(`\nSISTEMA: ${path.resolve(raiz)}`);

  // O workspace está no formato de uma IA (Claude Code ou Codex); scripts/ia.js
  // sabe qual. Tudo abaixo usa a pasta de skills e o arquivo de regras dessa IA.
  const ia = require("./ia.js");
  const est = ia.detectar(raiz);
  if (!est.ativa) return erro(`nem ${ia.IAS.claude.skills}/ nem ${ia.IAS.codex.skills}/ existem — isso não parece um workspace Contex OS`);
  if (est.ativa === "ambas")
    return erro(`${ia.IAS.claude.skills}/ e ${ia.IAS.codex.skills}/ existem ao mesmo tempo — rode \`node scripts/ia.js claude\` ou \`codex\` pra unificar`);
  const base = ia.IAS[est.ativa];
  const outra = ia.IAS[est.ativa === "claude" ? "codex" : "claude"];
  const dirSkills = path.join(raiz, base.skills);
  const relSkills = base.skills.split(path.sep).join("/");

  // ── 1. cada skill carrega? ────────────────────────────────────
  const pastas = fs
    .readdirSync(dirSkills)
    .filter((f) => fs.statSync(path.join(dirSkills, f)).isDirectory());
  const skills = new Set(pastas);
  let skillsOk = 0;

  for (const nome of pastas) {
    const arq = path.join(dirSkills, nome, "SKILL.md");
    if (!fs.existsSync(arq)) { erro(`${nome}/ não tem SKILL.md`); continue; }

    const bruto = fs.readFileSync(arq);
    if (bruto[0] === 0xef && bruto[1] === 0xbb && bruto[2] === 0xbf) {
      erro(`${nome}: BOM UTF-8 antes do '---' — o frontmatter não é lido e a skill nunca é encontrada`);
    }

    const t = bruto.toString("utf8").replace(/^﻿/, "");
    const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) { erro(`${nome}: frontmatter ausente ou malformado`); continue; }

    const fm = m[1];
    const declarado = (fm.match(/^name:[ \t]*(.+)$/m) || [])[1];
    if (!declarado) erro(`${nome}: frontmatter sem 'name:'`);
    else if (declarado.trim() !== nome) erro(`${nome}: 'name: ${declarado.trim()}' não bate com o nome da pasta`);

    if (!/^description:/m.test(fm)) {
      erro(`${nome}: frontmatter sem 'description:'`);
    } else if (!/use quando/i.test(fm)) {
      erro(`${nome}: description sem gatilho ("Use quando o usuário disser…") — sem isso a skill não é acionada pelo que o usuário fala`);
    } else skillsOk++;
  }
  if (skillsOk === pastas.length) ok(`${pastas.length} skills carregam (frontmatter, nome e gatilho conferidos)`);

  // ── 2. referências quebradas em todo .md ──────────────────────
  const mds = mdsDe(raiz);
  const faltaSkill = new Map();
  const faltaPath = new Map();
  const faltaScript = new Map();
  const comBOM = [];

  for (const arq of mds) {
    const bruto = fs.readFileSync(arq);
    if (bruto[0] === 0xef && bruto[1] === 0xbb && bruto[2] === 0xbf) comBOM.push(arq);
    const t = bruto.toString("utf8");
    const rel = path.relative(raiz, arq);
    const opcional = rel.startsWith(path.join("templates", "opcional"));

    for (const m of t.matchAll(/`\/([a-z][a-z0-9-]{2,})`/g)) {
      const n = m[1];
      if (skills.has(n) || NAO_SAO_SKILLS.has(n)) continue;
      if (!faltaSkill.has(n)) faltaSkill.set(n, new Set());
      faltaSkill.get(n).add(rel);
    }

    for (const m of t.matchAll(/`((?:templates|scripts)\/[A-Za-z0-9._/-]+\.(?:md|js|css|json))`/g)) {
      if (fs.existsSync(path.join(raiz, m[1])) || opcional) continue;
      if (!faltaPath.has(m[1])) faltaPath.set(m[1], new Set());
      faltaPath.get(m[1]).add(rel);
    }

    for (const m of t.matchAll(/node[^\n`]*?(scripts\/[A-Za-z0-9._-]+\.js)/g)) {
      if (fs.existsSync(path.join(raiz, m[1])) || opcional) continue;
      if (!faltaScript.has(m[1])) faltaScript.set(m[1], new Set());
      faltaScript.get(m[1]).add(rel);
    }
  }

  comBOM.forEach((a) => erro(`BOM UTF-8 no início de ${path.relative(raiz, a)}`));
  for (const [n, onde] of faltaSkill)
    erro(`\`/${n}\` citado mas não existe em ${relSkills}/ — em: ${[...onde].join(", ")}`);
  for (const [p, onde] of faltaPath)
    erro(`\`${p}\` citado mas não existe — em: ${[...onde].join(", ")}`);
  for (const [p, onde] of faltaScript)
    erro(`skill manda rodar \`${p}\`, que não existe — quebra no meio do fluxo, em: ${[...onde].join(", ")}`);

  if (!comBOM.length && !faltaSkill.size && !faltaPath.size && !faltaScript.size)
    ok(`${mds.length} arquivos .md sem referência quebrada`);

  // ── 3. contagem de skills escrita nos textos ──────────────────
  const total = pastas.length;
  let contagensRuins = 0;
  for (const arq of mds) {
    if (path.relative(raiz, arq).startsWith(path.join("templates", "opcional"))) continue;
    const t = fs.readFileSync(arq, "utf8");
    for (const m of t.matchAll(/(\d+)\s+skills\b/g)) {
      // "mais de 5 skills por sessão" e "de 3 a 5 skills" não falam do total
      const antes = t.slice(Math.max(0, m.index - 24), m.index);
      if (/(mais de|até|menos de|\d+\s+a)\s*$/i.test(antes)) continue;
      if (Number(m[1]) !== total) {
        erro(`${path.relative(raiz, arq)}: diz "${m[1]} skills", mas são ${total}`);
        contagensRuins++;
      }
    }
  }
  if (!contagensRuins) ok(`contagem de skills confere (${total}) em todo texto que a cita`);

  // ── 4. skill que ninguém cataloga ─────────────────────────────
  const catalogo = path.join(raiz, "templates", "skills", "catalogo.md");
  if (fs.existsSync(catalogo)) {
    const t = fs.readFileSync(catalogo, "utf8");
    const citadas = new Set([...t.matchAll(/`\/([a-z][a-z0-9-]{2,})`/g)].map((m) => m[1]));
    const fora = pastas.filter((n) => !citadas.has(n));
    if (fora.length) erro(`skill fora da tabela do catálogo (o usuário nunca descobre): ${fora.join(", ")}`);
    else ok("toda skill aparece no catálogo");
  }

  // ── 5. formato da IA: base inteira, visita mínima, nada da outra ──
  // A base é de uma IA só. A outra entra pelo arquivo de visita (gerado pelo
  // scripts/ia.js) e por mais nada: pasta, molde ou frase dela fora de trecho
  // protegido é conversão pela metade.
  let iaOk = true;
  if (!est.entrada[base.id]) { erro(`${base.entrada} não existe — sem ele a ${base.nome} abre a pasta sem regra nenhuma`); iaOk = false; }
  else if (est.visita[base.id]) { erro(`${base.entrada} é arquivo de visita, mas a base é ${base.nome} — rode \`node scripts/ia.js ${base.id}\``); iaOk = false; }
  if (!est.entrada[outra.id]) { erro(`${outra.entrada} de visita não existe — a ${outra.nome} abriria a pasta sem saber que é Contex OS. Rode \`node scripts/ia.js ${base.id}\``); iaOk = false; }
  else if (!est.visita[outra.id]) { erro(`${outra.entrada} não é arquivo de visita — a ${outra.nome} vai tratar a pasta como dela. Rode \`node scripts/ia.js ${base.id}\``); iaOk = false; }
  if (fs.existsSync(path.join(raiz, outra.raiz))) { erro(`${outra.raiz}/ existe numa base ${base.nome} — sobra da outra IA`); iaOk = false; }
  const pedacos = ia.pedacosDe(raiz, outra, ia.arquivosDeTexto(raiz, base));
  if (pedacos.length) {
    erro(`${pedacos.length} referência(s) à ${outra.nome} fora de trecho protegido (<!-- ia:inicio --> … <!-- ia:fim -->):`);
    pedacos.slice(0, 10).forEach((p) => console.log(`      ${p.arquivo}:${p.linha}  ${p.trecho}`));
    if (pedacos.length > 10) console.log(`      … e mais ${pedacos.length - 10}`);
    iaOk = false;
  }
  if (iaOk) ok(`formato ${base.nome} inteiro, com ${outra.entrada} de visita pra ${outra.nome} e nada mais dela`);
}

// ─────────────────────────── SEGREDO ───────────────────────────
// Chave de API, token e senha dentro de arquivo versionado.
//
// Quem enumera os arquivos é o próprio git (`git ls-files`), e isso não é
// detalhe: arquivo que não está versionado não viaja pra ninguém, e varrer a
// pasta inteira acusaria justamente o `.env` que está corretamente ignorado.
// Quem responde se o `.env` está coberto também é o git (`git check-ignore`),
// não uma leitura do `.gitignore` linha a linha.
//
// O check devolve arquivo:linha e para aí. A pergunta que ele responde é "esta
// linha tem forma de chave?", sim ou não. Ele não pontua risco nem adivinha
// gravidade. Pra silenciar uma linha que é exemplo, escreva
// `contexos:segredo-ok` nela ou na linha logo acima.
//
// Existe porque o arquivo de regras da raiz já manda conferir o stage antes de todo `git add`,
// e hoje isso depende de alguém lembrar de olhar.

const { execFileSync } = require("child_process");

// Formas de chave: o valor se reconhece pelo formato, sem depender de como a
// variável foi batizada. Cada linha aqui é um prefixo publicado pelo próprio
// fornecedor, não um palpite.
const FORMAS_DE_CHAVE = [
  { re: /\bsk-[A-Za-z0-9_-]{20,}/g, nome: "chave da OpenAI (sk-…)" },
  { re: /\bAKIA[0-9A-Z]{16}\b/g, nome: "chave de acesso da AWS (AKIA…)" },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g, nome: "chave do Google (AIza…)" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{20,}/g, nome: "token do GitHub (ghp_…)" },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, nome: "token do Slack (xox…)" },
  { re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g, nome: "chave privada em texto puro" },
  { re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@"'`]+:([^\s:/@"'`]+)@/g, nome: "string de conexão com senha embutida", valor: 1 },
];

const PALAVRA_DE_SEGREDO =
  "senha|password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|secret[_-]?key|client[_-]?secret|private[_-]?key";

// Nome de variável seguido de `=` ou `:`. O nome tem que TERMINAR na palavra:
// sem isso, `--token-espaco: 8px` e `design-tokens:` viram alarme, e "redesenha"
// acusa por causa do "senha" no fim da palavra.
const RE_ATRIBUICAO = /([A-Za-z0-9_$.\-[\]]{2,60})["']?\s*[:=]\s*([^\n]*)/g;
const RE_TERMINA_EM_SEGREDO = new RegExp(`(?:^|[^A-Za-zÀ-ÿ])(?:${PALAVRA_DE_SEGREDO})$`, "i");

// Valores que aparecem nos textos do próprio Contex OS como exemplo de
// preenchimento. Cada um está aqui porque é o texto do molde, não um valor de
// verdade. A lista é curta de propósito: crescer aqui é esconder segredo. Se a
// sua senha de produção é literalmente "senha", o problema não é este check.
const VALORES_DE_EXEMPLO = new Set([
  "senha", "password", "sua-senha", "sua-chave", "seu-token",
  "cole-a-chave-aqui", "sk-cole-a-chave-aqui", "abc123",
  "changeme", "troque-isso", "xxx", "xxxxx",
]);

// Arquivo que nunca deveria estar versionado. Nome fecha a pergunta sozinho.
const ARQUIVOS_QUE_NAO_SE_VERSIONA = [
  { re: /(^|\/)\.env(\.[A-Za-z0-9_-]+)?$/i, salvo: /\.(example|sample|template|modelo|dist)$/i, nome: "arquivo .env" },
  { re: /\.(pem|key|p12|pfx|jks|keystore)$/i, nome: "chave ou certificado" },
  { re: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i, nome: "chave SSH privada" },
  { re: /(^|\/)credentials\.json$/i, nome: "credentials.json" },
  { re: /(^|\/)service-account[^/]*\.json$/i, nome: "conta de serviço do Google" },
  { re: /\.(dump|bak|sqlite|sqlite3|mdb)$|\.sql\.(gz|zip|bz2|xz)$/i, nome: "dump de banco" },
];

/** O texto é um valor escrito ali, ou é referência a outro lugar? Uma coisa vaza, a outra não. */
function valorEscrito(v) {
  let s = String(v).trim().replace(/^[`"']+|[`"']+$/g, "").trim();
  if (!s) return null;                                   // valor vazio: o .env.example é assim
  if (/\.\.\.|…/.test(s)) return null;                  // "sk-..." é a chave cortada do exemplo, não a chave
  if (/\$\{|\$[A-Za-z_]|process\.env|os\.environ|getenv|ENV\[|\{\{/.test(s)) return null;   // referência
  if (/^<.*>$/.test(s) || /^\[.*\]$/.test(s)) return null;                                  // marcador de preencher
  s = s.replace(/[,;.)\]}]+$/, "").trim();
  if (!s || VALORES_DE_EXEMPLO.has(s.toLowerCase())) return null;
  return s;
}

/** O valor da atribuição está escrito na linha? */
function literalDe(nome, resto) {
  const t = resto.trim();
  const entreAspas = t.match(/^(["'`])((?:\\.|(?!\1)[^\\])*)\1/);
  if (entreAspas) return valorEscrito(entreAspas[2]);
  // Sem aspas, só conta em nome de variável de ambiente (MAIÚSCULA_COM_UNDERLINE)
  // e valor de um pedaço só. É o que separa `POSTGRES_PASSWORD: senha` de uma
  // frase em português que por acaso tem "senha:" no meio.
  if (!/^[A-Z][A-Z0-9_]*$/.test(nome)) return null;
  const um = t.match(/^([^\s#]+)\s*(?:#.*)?$/);
  return um ? valorEscrito(um[1]) : null;
}

/** Corta o valor na saída: terminal vira log, e log com chave inteira é o vazamento seguinte. */
const trecho = (s) => (s.length <= 8 ? s : s.slice(0, 6) + "…");

function verSegredo(raiz = ".") {
  console.log(`\nSEGREDO: ${path.resolve(raiz)}`);

  let versionados;
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: raiz, stdio: "ignore" });
    versionados = execFileSync("git", ["ls-files", "-z"], { cwd: raiz, maxBuffer: 64 * 1024 * 1024 })
      .toString("utf8").split("\0").filter(Boolean);
  } catch (e) {
    return info("não é repositório git (ou o git não está instalado) — este check enumera por `git ls-files` e não tem o que ler");
  }

  // ── 1. .env coberto pelo .gitignore? ──────────────────────────
  const ignorado = (p) => {
    try {
      execFileSync("git", ["check-ignore", "-q", "--no-index", p], { cwd: raiz, stdio: "ignore" });
      return true;
    } catch (e) {
      return false;
    }
  };
  const descobertos = [".env", ".env.local", ".env.production"].filter((p) => !ignorado(p));
  if (descobertos.length) {
    erro(`o .gitignore não cobre ${descobertos.join(", ")} — um dia alguém roda \`git add .\` e a chave vai junto`);
    info("    conserto: uma linha `.env` e uma linha `.env.*` no .gitignore, com `!.env.example` embaixo");
  } else ok(".env coberto pelo .gitignore (conferido com `git check-ignore`)");

  // ── 2. arquivo que não se versiona, dentro do índice ──────────
  let proibidos = 0;
  for (const rel of versionados) {
    for (const { re, salvo, nome } of ARQUIVOS_QUE_NAO_SE_VERSIONA) {
      if (!re.test(rel) || (salvo && salvo.test(rel))) continue;
      proibidos++;
      erro(`${rel}: ${nome} está versionado — sai do índice com \`git rm --cached "${rel}"\``);
      break;
    }
  }
  if (!proibidos) ok("nenhum .env, .pem, credencial ou dump de banco no índice");

  // ── 3. varredura linha a linha dos arquivos versionados ───────
  let lidos = 0, pulados = 0, achados = 0;
  for (const rel of versionados) {
    const full = path.join(raiz, rel);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    if (fs.statSync(full).size > 4 * 1024 * 1024) { pulados++; continue; }
    const buf = fs.readFileSync(full);
    if (buf.subarray(0, 8000).includes(0)) { pulados++; continue; }   // binário
    lidos++;

    const linhas = buf.toString("utf8").split(/\r?\n/);
    const silenciada = (i) =>
      /contexos:segredo-ok/.test(linhas[i] || "") || /contexos:segredo-ok/.test(linhas[i - 1] || "");

    linhas.forEach((linha, i) => {
      if (linha.length > 2000 || silenciada(i)) return;

      let jaContou = false;
      for (const { re, nome, valor } of FORMAS_DE_CHAVE) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(linha))) {
          const bruto = valor ? valorEscrito(m[valor]) : m[0];
          if (bruto === null) continue;
          achados++;
          jaContou = true;
          erro(`${rel}:${i + 1}: ${nome} — "${trecho(bruto)}"`);
        }
      }
      // A mesma chave já foi contada pela forma dela: contar de novo pelo nome da
      // variável dobraria o número sem dobrar o problema.
      if (jaContou) return;

      RE_ATRIBUICAO.lastIndex = 0;
      let a;
      while ((a = RE_ATRIBUICAO.exec(linha))) {
        const nome = a[1].replace(/^["'`]+/, "");
        if (nome.startsWith("--")) continue;                    // variável de CSS
        if (!RE_TERMINA_EM_SEGREDO.test(nome)) continue;
        const v = literalDe(nome, a[2]);
        if (v === null) continue;
        achados++;
        erro(`${rel}:${i + 1}: ${nome} recebe um valor escrito no arquivo — "${trecho(v)}"`);
      }
    });
  }

  info(`${lidos} arquivos versionados lidos${pulados ? `, ${pulados} pulados (binário ou acima de 4 MB)` : ""}`);
  if (!achados) ok("nenhuma chave, token ou senha com valor escrito nos arquivos versionados");
  else info("    exemplo de molde acusado à toa se silencia com `contexos:segredo-ok` na linha ou na linha de cima");
  if (achados || proibidos) {
    info("    segredo que já foi versionado continua no histórico depois de apagado: troque a chave no fornecedor");
  }
}

// ─────────────────────────── MIGRAÇÃO ───────────────────────────
// Mudança de estrutura de banco é a única operação que o /backend chama de
// irreversível na prática. Este check lê os próprios arquivos .sql e responde
// quatro perguntas fechadas, todas de sim ou não:
//
//   · número de ordem repetido ou com buraco — comparação de inteiros
//   · migração sem contrapartida de desfazer — arquivo par ou seção existe, ou não
//   · NOT NULL acrescentado sem DEFAULT em tabela que já existe — a linha do
//     banco que já está lá não tem valor pra coluna nova, e o ALTER TABLE para
//     no meio com a tabela travada
//   · DROP junto de adição no mesmo arquivo — é o que obriga a derrubar o
//     sistema pra publicar, em vez de subir a coluna nova primeiro e remover a
//     velha na versão seguinte
//
// Quando não acha arquivo no formato que sabe ler, ele diz isso em voz alta.
// Check que aprova sem ter olhado é pior que check nenhum.

const PASTAS_DE_MIGRACAO = [
  "migrations", "migracoes", "migrações",
  path.join("db", "migrate"), path.join("database", "migrations"),
  path.join("prisma", "migrations"), path.join("supabase", "migrations"),
  path.join("sql", "migrations"), path.join("src", "migrations"),
];

// A marca de desfazer é uma linha de seção ("-- Down", "-- desfazer: tira a coluna"),
// não qualquer comentário que cite a palavra. Sem essa exigência, um "-- não tem
// rollback" no topo do arquivo faria o check considerar a volta como escrita.
const RE_DESFAZER = /^[ \t]*(?:--|#)[ \t]*(?:\+?[ \t]*(?:migrate|goose)[ \t]+)?(?:down|desfazer|rollback|undo)\b(?:[ \t]*[:—-][^\n]{0,70})?[ \t]*$/im;
// Arquivo de volta atrás: a palavra fecha o nome, antes da extensão. Assim
// `001_criar_pedidos.down.sql` conta como par de desfazer e `002_undo_bug.sql`
// continua sendo uma migração comum.
const RE_NOME_DESFAZER = /(?:^|[^A-Za-z])(?:down|desfazer|rollback|undo)(?:\.[a-z]+)?$/i;

/** Apaga comentário SQL preservando o comprimento, pra linha do achado continuar certa. */
function semComentarioSQL(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/--[^\n]*/g, (m) => " ".repeat(m.length));
}

/** Instruções separadas por ponto e vírgula, com a posição de cada uma no arquivo. */
function instrucoesSQL(sql) {
  const out = [];
  let ini = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] !== ";") continue;
    if (sql.slice(ini, i).trim()) out.push({ txt: sql.slice(ini, i), pos: ini });
    ini = i + 1;
  }
  if (sql.slice(ini).trim()) out.push({ txt: sql.slice(ini), pos: ini });
  return out;
}

const linhaEm = (sql, pos) => sql.slice(0, pos).split("\n").length;

function verMigracao(alvo) {
  const raiz = alvo || ".";
  let pasta = null;
  if (alvo && fs.existsSync(alvo) && fs.statSync(alvo).isDirectory() && !PASTAS_DE_MIGRACAO.some((p) => fs.existsSync(path.join(alvo, p)))) {
    pasta = alvo;
  }
  if (!pasta) pasta = PASTAS_DE_MIGRACAO.map((p) => path.join(raiz, p)).find((p) => fs.existsSync(p)) || null;

  console.log(`\nMIGRAÇÃO: ${pasta ? path.resolve(pasta) : path.resolve(raiz)}`);
  if (!pasta) {
    info(`nenhuma pasta de migração aqui (procurei por ${PASTAS_DE_MIGRACAO.slice(0, 6).join(", ")}…)`);
    return info("    se a sua tem outro nome, passe o caminho: node scripts/verificar.js migracao caminho/da/pasta");
  }

  // ── coleta: .sql solto na pasta, ou <numero>_nome/migration.sql ──
  const arquivos = [];
  const desfazerSolto = [];
  const guarda = (arq, nomeNumero) => {
    const m = path.basename(nomeNumero).match(/^[Vv]?(\d+)/);
    if (!m) return;
    if (RE_NOME_DESFAZER.test(path.basename(arq))) desfazerSolto.push({ num: m[1], arq });
    else arquivos.push({ num: m[1], arq });
  };
  for (const f of fs.readdirSync(pasta).sort()) {
    const full = path.join(pasta, f);
    if (fs.statSync(full).isDirectory()) {
      if (/^(down|desfazer|rollback|undo)$/i.test(f)) {
        for (const g of fs.readdirSync(full)) if (/\.sql$/i.test(g)) {
          const m = g.match(/^[Vv]?(\d+)/);
          if (m) desfazerSolto.push({ num: m[1], arq: path.join(full, g) });
        }
        continue;
      }
      // Layout de pasta por migração (Prisma, Supabase): o número está no nome da
      // PASTA, e o arquivo lá dentro só diz se é o que aplica ou o que desfaz.
      for (const g of fs.readdirSync(full)) if (/\.sql$/i.test(g)) guarda(path.join(full, g), f);
      continue;
    }
    if (/\.sql$/i.test(f)) guarda(full, f);
  }

  if (!arquivos.length) {
    const sql = fs.readdirSync(pasta).filter((f) => /\.sql$/i.test(f)).length;
    erro(`não encontrei migrações neste formato: ${sql ? `${sql} arquivo(s) .sql, nenhum com número na frente do nome` : "a pasta não tem nenhum arquivo .sql"}`);
    return info("    o formato que este check lê é arquivo .sql começando por número (001_criar_pedidos.sql, 20260115_criar_pedidos.sql)");
  }

  const onde = path.relative(raiz, pasta);
  info(`${arquivos.length} migraç${arquivos.length > 1 ? "ões" : "ão"}${onde ? ` em ${onde}` : ""}`);

  // ── 1. numeração: um formato só ───────────────────────────────
  const porData = arquivos.filter((a) => a.num.length >= 8);
  const sequencial = arquivos.filter((a) => a.num.length < 8);
  if (porData.length && sequencial.length) {
    erro(`dois formatos de numeração na mesma pasta: ${sequencial.length} sequencial(is) e ${porData.length} por data — a ordem de aplicação fica indefinida`);
    info(`    ${sequencial.slice(0, 3).map((a) => path.basename(a.arq)).join(", ")} contra ${porData.slice(0, 3).map((a) => path.basename(a.arq)).join(", ")}`);
  }

  // ── 2. número repetido ────────────────────────────────────────
  const porNumero = new Map();
  for (const a of arquivos) {
    const n = String(parseInt(a.num, 10));
    if (!porNumero.has(n)) porNumero.set(n, []);
    porNumero.get(n).push(path.basename(a.arq));
  }
  let repetidos = 0;
  for (const [n, quais] of porNumero) {
    if (quais.length < 2) continue;
    repetidos++;
    erro(`número ${n} repetido em ${quais.join(" e ")} — duas pessoas criaram a mesma migração e uma vai deixar de rodar`);
  }
  if (!repetidos) ok("nenhum número de ordem repetido");

  // ── 3. buraco na sequência ────────────────────────────────────
  if (porData.length && !sequencial.length) {
    info("numeração por data e hora — buraco não existe nesse formato, pulei essa conta");
  } else if (sequencial.length) {
    const nums = [...new Set(sequencial.map((a) => parseInt(a.num, 10)))].sort((x, y) => x - y);
    const faltando = [];
    for (let n = nums[0]; n <= nums[nums.length - 1]; n++) if (!nums.includes(n)) faltando.push(n);
    if (faltando.length) {
      erro(`buraco na sequência: falta ${faltando.slice(0, 12).join(", ")}${faltando.length > 12 ? ` (+${faltando.length - 12})` : ""} entre ${nums[0]} e ${nums[nums.length - 1]}`);
      info("    ou alguém apagou uma migração que já rodou em produção, ou uma ficou de fora do commit");
    } else ok(`sequência inteira de ${nums[0]} a ${nums[nums.length - 1]}, sem buraco`);
  }

  // ── 4. desfazer, NOT NULL sem DEFAULT, DROP junto de adição ───
  const numsDesfazer = new Set(desfazerSolto.map((d) => String(parseInt(d.num, 10))));
  let semVolta = 0, semDefault = 0, dropJunto = 0;

  for (const a of arquivos) {
    const nome = path.relative(raiz, a.arq) || path.basename(a.arq);
    const conteudo = fs.readFileSync(a.arq, "utf8");
    const corte = conteudo.search(RE_DESFAZER);

    if (corte === -1 && !numsDesfazer.has(String(parseInt(a.num, 10)))) {
      semVolta++;
      if (semVolta <= 10) erro(`${nome}: sem contrapartida de desfazer — nem arquivo par, nem seção "-- Down" no próprio arquivo`);
    }

    // Só a parte que aplica. Sem esse corte, o arquivo que TEM seção de desfazer
    // seria acusado de DROP junto de adição pelo próprio desfazer dele.
    const sobe = semComentarioSQL(corte === -1 ? conteudo : conteudo.slice(0, corte));

    for (const inst of instrucoesSQL(sobe)) {
      if (!/\bALTER\s+TABLE\b/i.test(inst.txt)) continue;
      if (!/\bNOT\s+NULL\b/i.test(inst.txt) || /\bDEFAULT\b/i.test(inst.txt)) continue;
      semDefault++;
      const comeca = inst.pos + (inst.txt.match(/^\s*/) || [""])[0].length;
      erro(`${nome}:${linhaEm(sobe, comeca)}: NOT NULL em tabela que já existe, sem DEFAULT — a linha que já está gravada não tem valor pra coluna, e o ALTER TABLE para no meio`);
    }

    const temDrop = /\bDROP\s+(TABLE|COLUMN)\b/i.test(sobe);
    const temAdicao = /\bCREATE\s+TABLE\b/i.test(sobe) || /\bADD\s+(COLUMN|CONSTRAINT)\b/i.test(sobe);
    if (temDrop && temAdicao) {
      dropJunto++;
      erro(`${nome}: apaga e acrescenta no mesmo arquivo — a versão antiga do código quebra no instante em que este arquivo roda, então publicar exige tirar o sistema do ar`);
    }
  }

  if (semVolta > 10) erro(`(+${semVolta - 10} sem contrapartida de desfazer, além das 10 acima)`);
  if (!semVolta) ok("toda migração tem como voltar atrás");
  if (!semDefault) ok("nenhum NOT NULL acrescentado sem DEFAULT");
  if (!dropJunto) ok("nenhum arquivo mistura remoção com adição");
  else info("    o caminho sem indisponibilidade é em duas entregas: primeiro a coluna nova, o código passa a usar as duas, e só depois a remoção");
}

// ─────────────────────────── main ───────────────────────────

const [cmd, ...args] = process.argv.slice(2);
const AJUDA = `Contex OS — verificar.js

  csv <arquivo> [--ads]     campos desalinhados e limites do Google Ads
  datas <arquivo.md>        dia da semana declarado vs data real
  tabela <arquivo.md>       soma das colunas vs total declarado, e "N× R$ X = R$ Y"
  contraste <cor1> <cor2>   razão WCAG
  html <arquivo.html>       CSS externo, var() sem fallback, @page, placeholder, link vazio
  alvo <arquivo.html>       tamanho de alvo clicável declarado (WCAG 2.5.8 + piso do Contex OS)
  texto <arquivo>           sinais de texto gerado: ritmo, clichê, travessão, formato
  peso <pasta|arquivo>      imagem acima de 2 MB
  tudo <pasta>              roda o que couber em cada arquivo
  sistema [pasta]           integridade do próprio Contex OS: skill que não carrega, formato da IA,
                            referência quebrada, script ausente, contagem errada
  segredo [pasta]           chave, token e senha em arquivo versionado (enumera pelo git)
  migracao [pasta]          ordem, desfazer, NOT NULL sem DEFAULT e DROP junto de adição`;

try {
  if (!cmd || cmd === "-h" || cmd === "--help") { console.log(AJUDA); process.exit(0); }
  if (cmd === "csv") verCSV(args[0], args.includes("--ads"));
  else if (cmd === "datas") verDatas(args[0]);
  else if (cmd === "tabela") verTabela(args[0]);
  else if (cmd === "contraste") verContraste(args[0], args[1]);
  else if (cmd === "html") verHTML(args[0]);
  else if (cmd === "alvo") verAlvo(args[0]);
  else if (cmd === "texto") verTexto(args[0]);
  else if (cmd === "peso") verPeso(args[0]);
  else if (cmd === "tudo") verTudo(args[0] || ".");
  else if (cmd === "sistema") verSistema(args[0] || ".");
  else if (cmd === "segredo") verSegredo(args[0] || ".");
  else if (cmd === "migracao" || cmd === "migração") verMigracao(args[0]);
  else { console.log(`Comando desconhecido: ${cmd}\n\n${AJUDA}`); process.exit(1); }
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  process.exit(1);
}

console.log(problemas ? `\n${problemas} problema(s) encontrado(s).` : "\nTudo certo.");
process.exit(problemas ? 1 : 0);
