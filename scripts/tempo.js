#!/usr/bin/env node
/**
 * Contex OS — tempo.js
 * Mede um roteiro de vídeo longo: soma a duração pelo ritmo de fala, dá o
 * timecode previsto de cada bloco e acusa o trecho que passa de 60 a 90
 * segundos sem troca de cena, dado, história ou pergunta.
 *
 * Existe porque duração de roteiro chutada erra feio e sempre pro mesmo lado.
 * "Isso aqui dá uns dez minutos" costuma ser dezesseis, e quem descobre é o
 * espectador na barra de progresso. A conta é simples (palavras ÷ ritmo), o
 * problema é que ninguém a faz, e sem ela o timecode do roteiro é decoração.
 * A segunda medida é a que salva retenção: a distância, em segundos de fala,
 * entre uma quebra de padrão e a seguinte. Decorar "pattern interrupt a cada
 * 60-90s" não ajuda; ver que o bloco 3 fica 2min14 sem nenhuma quebra ajuda.
 *
 * Uso:
 *   node scripts/tempo.js medir <roteiro.md> [--ritmo 132] [--alvo 12]
 *   node scripts/tempo.js orcamento --alvo 12 [--ritmo 132] [--blocos 5]
 *   node scripts/tempo.js ritmo <transcricao.txt> --duracao 11:42
 *   node scripts/tempo.js molde [saida.md]
 *
 * Opções:
 *   --ritmo <n>      palavras por minuto (padrão: o do arquivo, ou 130)
 *   --alvo <t>       duração alvo: "12", "12 min", "12:30" ou "720s"
 *   --blocos <n>     quantos blocos de conteúdo, no orcamento (2 a 12)
 *   --duracao <t>    duração real do áudio, no ritmo
 *   --checklist      imprime o checklist de retenção em markdown, pra colar
 *   --json           saída em JSON, pra outro script ler
 *
 * Sai com código 1 quando o roteiro tem erro duro: gancho acima de 45s, trecho
 * acima de 90s sem quebra de padrão, total a mais de 15% do alvo pra cima ou
 * pra baixo, CTA só nos últimos 10% (ou nenhum) e bloco sem uma palavra de
 * fala. Aviso não derruba o código de saída: gancho entre 30 e 45s, trecho
 * entre 60 e 90s sem quebra, bloco acima de 3 min, desvio de alvo entre 8% e
 * 15%, nada de concreto nos primeiros 90s, loop faltando, mais de dois CTAs,
 * menos de 3 blocos, alvo fora da faixa de 6 a 20 min e [a confirmar] pendente.
 *
 * Formato do roteiro.md (o molde completo sai de `node scripts/tempo.js molde`):
 *   - **Duração alvo:** 12 min
 *   - **Ritmo:** 132 palavras/min
 *
 *   ## Gancho — paga a promessa do título
 *   **Na tela:** título em três palavras
 *   [cena: close no rosto] A conta que quase todo mundo erra é essa.
 *
 *   ## Bloco 1 — o problema
 *   [loop: no fim eu mostro a planilha] Fala corrida aqui...
 *
 * Marcas inline: [cena: …] [dado: …] [historia: …] [pergunta: …] [demo: …]
 * [grafico: …] [tela: …] contam como quebra de padrão. [loop: …] é promessa
 * aberta e [cta] é a chamada — essas duas não contam como quebra. Marca é
 * direção de gravação: sai da contagem de palavras. Ponto de interrogação na
 * fala já conta como pergunta, sem precisar de marca.
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── réguas ───────────────────────────
// Cada número aqui está sustentado em templates/crescimento/roteiro-longo.md,
// com a fonte e a data de conferência. Mudar aqui muda o molde também.

const RITMO_PADRAO = 130;        // palavras/min: dentro da faixa de apresentação
                                 // confortável (100 a 150), acima dos 90 medidos
                                 // em fala espontânea pt-BR. Fonte no molde.
const GANCHO_AVISO = 30;         // s — o "intro" que o YouTube mede
const GANCHO_ERRO = 45;          // s
const LACUNA_AVISO = 60;         // s sem quebra de padrão
const LACUNA_ERRO = 90;          // s
const BLOCO_AVISO = 180;         // s — bloco que ninguém segura inteiro
const ALVO_AVISO = 0.08;         // 8% de folga
const ALVO_ERRO = 0.15;          // 15% e já é outro vídeo
const ENTREGA_ANTECIPADA = 90;   // s — valor na mão antes disso
const CTA_TARDE = 0.90;          // CTA que só aparece depois disso é CTA perdido
const CTA_IDEAL = 0.70;          // pelo menos um antes disso

/** Marcas que contam como quebra de padrão. */
const QUEBRAS = ["cena", "dado", "historia", "história", "pergunta", "demo", "grafico", "gráfico", "tela"];
/** Marcas que existem mas não quebram padrão. */
const OUTRAS = ["loop", "cta"];
/** Rótulos de direção no começo da linha: não são fala. */
const ROTULOS = /^\*\*[^*]{1,40}:\*\*/;
/**
 * Seções do arquivo que não são bloco de vídeo: o mapa colado da medição, o
 * checklist, os ganchos que ficaram de fora, as instruções de gravação. Sem
 * essa lista o mapa (que é tabela) viraria "bloco sem uma palavra de fala" e os
 * ganchos alternativos entrariam na duração.
 */
const NAO_E_BLOCO = /^(mapa|checklist|ganchos? alternativos?|como gravar|grava(ç|c)[aã]o|notas?|refer[eê]ncias?|o que sobrou|corta(dos)?)/i;

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/**
 * mm:ss a partir de segundos. Aceita negativo (o sinal sai na frente, e não no
 * meio: "-04:37", nunca "-4:-37") porque desvio de alvo e sobra de corte são
 * valores com sinal e já apareceram assim na saída.
 */
function timecode(s) {
  const n = Number(s);
  if (!Number.isFinite(n)) return "--:--";
  const t = Math.round(Math.abs(n));
  const sinal = n < 0 ? "-" : "";
  return `${sinal}${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Lê duração escrita como "12", "12 min", "12:30", "720s", "1h02". */
function lerDuracao(txt) {
  const t = String(txt || "").trim().toLowerCase().replace(",", ".");
  if (!t) return null;
  let m;
  if ((m = t.match(/^(\d{1,2}):(\d{2})$/))) return +m[1] * 60 + +m[2];
  if ((m = t.match(/^(\d{1,2})h\s*(\d{1,2})?/))) return +m[1] * 3600 + (+(m[2] || 0)) * 60;
  if ((m = t.match(/^([\d.]+)\s*s(eg)?/))) return Math.round(+m[1]);
  if ((m = t.match(/^([\d.]+)/))) return Math.round(+m[1] * 60);
  return null;
}

// ─────────────────────── leitura do roteiro ───────────────────────

/**
 * Tira as marcas da linha e devolve o texto limpo mais as marcas achadas, cada
 * uma com o deslocamento em palavras de fala até ali (`offset`). É o offset que
 * transforma marca em segundo: sem ele, toda marca da linha cairia no começo
 * dela e uma lacuna de 80s passaria batido.
 */
function separarMarcas(linha) {
  const marcas = [];
  const re = /\[([^\]:]{1,20})(?::([^\]]*))?\]/g;
  let limpo = "";
  let ultimo = 0;
  let m;
  while ((m = re.exec(linha))) {
    limpo += linha.slice(ultimo, m.index) + " ";
    ultimo = m.index + m[0].length;
    const t = m[1].trim().toLowerCase();
    const offset = contarPalavras(limpo);
    if (QUEBRAS.includes(t) || OUTRAS.includes(t)) {
      marcas.push({ tipo: t.replace("história", "historia").replace("gráfico", "grafico"), texto: (m[2] || "").trim(), offset });
    } else {
      // [a confirmar] e qualquer outro colchete: não é fala nem marca conhecida
      marcas.push({ tipo: "?", texto: m[0], offset });
    }
  }
  limpo += linha.slice(ultimo);
  return { limpo, marcas };
}

/**
 * Junta a marca que o editor de texto quebrou em duas linhas. Enquanto a linha
 * tem mais "[" que "]", puxa a linha seguinte — parando em linha vazia ou em
 * título, pra que um colchete aberto por engano não engula o arquivo inteiro.
 */
function juntarMarcas(linhas) {
  const saida = [];
  for (let i = 0; i < linhas.length; i++) {
    let l = linhas[i];
    let abre = (l.match(/\[/g) || []).length - (l.match(/\]/g) || []).length;
    while (abre > 0 && i + 1 < linhas.length) {
      const prox = linhas[i + 1];
      if (!prox.trim() || /^\s*#/.test(prox) || /^\s*```/.test(prox)) break;
      l += " " + prox.trim();
      i++;
      abre = (l.match(/\[/g) || []).length - (l.match(/\]/g) || []).length;
    }
    saida.push(l);
  }
  return saida;
}

/** Conta palavras de fala: token com pelo menos uma letra ou dígito. */
function contarPalavras(texto) {
  const sem = texto
    .replace(/`[^`]*`/g, " ")
    .replace(/[*_~]/g, "")
    .replace(/\((https?:[^)]*)\)/g, " ");
  return sem.split(/\s+/).filter((w) => /[0-9A-Za-zÀ-ÿ]/.test(w)).length;
}

/**
 * Lê o roteiro e devolve os blocos com fala, marcas posicionadas em palavra e
 * os metadados do cabeçalho. Não calcula tempo: isso é o medir().
 */
function lerRoteiro(arquivo) {
  const bruto = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  const linhas = juntarMarcas(bruto.split(/\r?\n/));

  const meta = { alvo: null, ritmo: null, ritmoFonte: null, promessa: null, tema: null };
  const blocos = [];
  let atual = null;
  let emCodigo = false;
  let palavrasTotal = 0;
  let aConfirmar = 0;

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();

    if (/^```/.test(linha)) { emCodigo = !emCodigo; continue; }
    if (emCodigo) continue;

    // metadados do cabeçalho, em qualquer lugar do arquivo
    let m;
    if ((m = linha.match(/\*\*Dura(?:ç|c)[aã]o alvo:?\*\*\s*(.+)/i))) meta.alvo = lerDuracao(m[1]);
    if ((m = linha.match(/\*\*Ritmo:?\*\*\s*([\d.,]+)\s*palavras?\s*\/?\s*min(?:uto)?\s*(.*)/i))) {
      meta.ritmo = Math.round(parseFloat(m[1].replace(",", ".")));
      meta.ritmoFonte = (m[2] || "").replace(/^[(\s]+|[)\s]+$/g, "") || null;
    }
    if ((m = linha.match(/\*\*Promessa[^:*]*:?\*\*\s*(.+)/i))) meta.promessa = m[1].trim();
    if (/^#\s+/.test(linha) && !meta.tema) meta.tema = linha.replace(/^#\s+/, "").trim();

    if (/^##\s+/.test(linha)) {
      const titulo = linha.replace(/^#+\s+/, "").trim();
      if (NAO_E_BLOCO.test(titulo)) { atual = null; continue; }
      atual = { titulo, palavras: 0, inicioPalavra: palavrasTotal, marcas: [], tela: [] };
      blocos.push(atual);
      continue;
    }

    if (!atual) continue;                       // preâmbulo antes do primeiro bloco
    if (!linha) continue;
    if (/^#/.test(linha)) continue;             // subtítulo dentro do bloco
    if (/^>/.test(linha)) continue;             // nota
    if (/^\|/.test(linha)) continue;            // tabela

    if (ROTULOS.test(linha)) {                  // **Na tela:** … é direção, não fala
      const rot = linha.match(ROTULOS)[0].replace(/\*\*|:/g, "").trim();
      const { marcas } = separarMarcas(linha);
      for (const mk of marcas) if (mk.tipo !== "?") atual.marcas.push({ ...mk, palavra: palavrasTotal });
      if (/tela|imagem|corte|b-?roll/i.test(rot)) atual.tela.push(linha.replace(ROTULOS, "").trim());
      continue;
    }

    const ehLista = /^[-*+]\s/.test(linha) || /^\d+[.)]\s/.test(linha);
    const { limpo, marcas } = separarMarcas(linha);

    // cada marca entra na palavra em que aparece dentro da linha
    for (const mk of marcas) {
      if (mk.tipo === "?") { if (/a confirmar|preencher/i.test(mk.texto)) aConfirmar++; continue; }
      atual.marcas.push({ ...mk, palavra: palavrasTotal + (ehLista ? 0 : mk.offset) });
    }

    if (ehLista) continue;                      // lista é estrutura, não fala corrida

    const n = contarPalavras(limpo);
    // pergunta falada conta como quebra, mesmo sem marca
    if (/\?/.test(limpo)) {
      const antes = contarPalavras(limpo.slice(0, limpo.indexOf("?")));
      atual.marcas.push({ tipo: "pergunta", texto: "(?)", palavra: palavrasTotal + antes, auto: true });
    }
    atual.palavras += n;
    palavrasTotal += n;
  }

  for (const b of blocos) b.marcas.sort((x, y) => x.palavra - y.palavra);
  return { meta, blocos, palavras: palavrasTotal, aConfirmar };
}

// ─────────────────────────── medição ───────────────────────────

/** Mede o roteiro: timecode por bloco, lacunas sem quebra, posição do CTA. */
function medir(arquivo, opcoes = {}) {
  const lido = lerRoteiro(arquivo);
  const ritmo = opcoes.ritmo || lido.meta.ritmo || RITMO_PADRAO;
  const alvo = opcoes.alvo || lido.meta.alvo || null;
  const porPalavra = 60 / ritmo;

  const erros = [];
  const avisos = [];
  const blocos = [];
  let tempo = 0;

  if (!lido.blocos.length) morrer(`${path.basename(arquivo)} não tem nenhum bloco (título "## ")`, "Comece pelo molde: node scripts/tempo.js molde");

  for (const b of lido.blocos) {
    const dur = b.palavras * porPalavra;
    const bloco = {
      titulo: b.titulo,
      palavras: b.palavras,
      inicio: tempo,
      fim: tempo + dur,
      duracao: dur,
      quebras: b.marcas.filter((m) => QUEBRAS.includes(m.tipo)).length,
      tela: b.tela.length,
      marcas: b.marcas.map((m) => ({ ...m, segundo: m.palavra * porPalavra })),
    };
    blocos.push(bloco);
    if (b.palavras === 0) erros.push(`bloco sem uma palavra de fala: "${b.titulo}"`);
    else if (dur > BLOCO_AVISO) avisos.push(`bloco de ${timecode(dur)} — "${b.titulo}" (acima de ${BLOCO_AVISO}s fica difícil segurar; quebrar em dois)`);
    tempo += dur;
  }

  const total = tempo;

  // ── gancho: o primeiro bloco ──
  const gancho = blocos[0];
  if (gancho.duracao > GANCHO_ERRO) erros.push(`gancho de ${timecode(gancho.duracao)} — o teto é ${GANCHO_ERRO}s. Cortar ${Math.round((gancho.duracao - GANCHO_AVISO) * (ritmo / 60))} palavras deixa em 30s`);
  else if (gancho.duracao > GANCHO_AVISO) avisos.push(`gancho de ${timecode(gancho.duracao)} — o alvo é ${GANCHO_AVISO}s (é o "intro" que o YouTube mede)`);

  // ── lacunas sem quebra de padrão, no roteiro inteiro ──
  const quebras = [];
  for (const b of blocos) for (const m of b.marcas) if (QUEBRAS.includes(m.tipo)) quebras.push(m.segundo);
  quebras.sort((a, b) => a - b);
  const lacunas = [];
  let anterior = 0;
  for (const q of quebras.concat([total])) {
    const vao = q - anterior;
    if (vao > LACUNA_AVISO) {
      // o bloco que interessa é o do meio do vão, não o do início: uma quebra no
      // primeiro segundo do gancho fazia o vão inteiro ser cobrado do gancho,
      // quando o trecho parado era o bloco seguinte
      const meio = anterior + vao / 2;
      const onde = blocos.find((b) => meio >= b.inicio - 0.01 && meio < b.fim) || blocos[blocos.length - 1];
      lacunas.push({ de: anterior, ate: q, vao, bloco: onde.titulo });
    }
    anterior = q;
  }
  for (const l of lacunas) {
    const msg = `${timecode(l.de)} → ${timecode(l.ate)}: ${timecode(l.vao)} sem troca de cena, dado, história ou pergunta (bloco "${l.bloco}")`;
    if (l.vao > LACUNA_ERRO) erros.push(msg);
    else avisos.push(msg);
  }

  // ── entrega antecipada ──
  const temValorCedo = blocos.some((b) => b.marcas.some((m) => ["dado", "demo", "historia", "grafico", "tela"].includes(m.tipo) && m.segundo <= ENTREGA_ANTECIPADA));
  if (!temValorCedo) avisos.push(`nada de concreto (dado, demonstração, história, gráfico) nos primeiros ${ENTREGA_ANTECIPADA}s — é aí que a entrega antecipada paga a promessa`);

  // ── CTA ──
  const ctas = [];
  for (const b of blocos) for (const m of b.marcas) if (m.tipo === "cta") ctas.push(m.segundo);
  if (!ctas.length) erros.push("nenhum [cta] no roteiro — a chamada precisa estar escrita, no ponto em que ela cabe");
  else {
    if (ctas.every((c) => c > total * CTA_TARDE)) erros.push(`CTA só em ${timecode(ctas[0])}, nos últimos 10% do vídeo: quem ia ouvir já saiu`);
    else if (!ctas.some((c) => c <= total * CTA_IDEAL)) avisos.push(`o primeiro CTA cai em ${timecode(ctas[0])} (${Math.round((ctas[0] / total) * 100)}% do vídeo) — antes de 70% pega mais gente`);
    if (ctas.length > 2) avisos.push(`${ctas.length} CTAs — dois é o limite antes de virar propaganda`);
  }

  // ── loops abertos ──
  let loops = 0;
  for (const b of blocos) for (const m of b.marcas) if (m.tipo === "loop") loops++;
  if (blocos.length >= 4 && loops < blocos.length - 2) avisos.push(`${loops} loop(s) aberto(s) pra ${blocos.length} blocos — o normal é um antes de cada bloco de conteúdo`);

  // ── alvo ──
  let desvio = null;
  if (alvo) {
    desvio = (total - alvo) / alvo;
    const quanto = `${timecode(total)} contra ${timecode(alvo)} de alvo (${desvio > 0 ? "+" : ""}${Math.round(desvio * 100)}%)`;
    const palavrasDif = Math.round(Math.abs(total - alvo) * (ritmo / 60));
    if (Math.abs(desvio) > ALVO_ERRO) erros.push(`${quanto} — ${desvio > 0 ? "cortar" : "escrever"} ${palavrasDif} palavras`);
    else if (Math.abs(desvio) > ALVO_AVISO) avisos.push(`${quanto} — ${desvio > 0 ? "cortar" : "escrever"} ${palavrasDif} palavras deixa no alvo`);
  } else {
    avisos.push('sem duração alvo: escrever "- **Duração alvo:** 12 min" no cabeçalho, ou passar --alvo');
  }
  if (alvo && (alvo < 6 * 60 || alvo > 20 * 60)) avisos.push(`alvo de ${timecode(alvo)} fora da faixa de 6 a 20 min desta skill — abaixo de 6 min o formato é o /video, acima de 20 quase sempre são dois vídeos`);
  if (blocos.length < 3) avisos.push(`${blocos.length} bloco(s) — vídeo longo sem pelo menos gancho, dois blocos de conteúdo e fecho não tem onde abrir loop`);
  if (lido.aConfirmar) avisos.push(`${lido.aConfirmar} marca(s) de [a confirmar] no roteiro — resolver antes de gravar`);

  return { arquivo, ritmo, ritmoFonte: lido.meta.ritmo && !opcoes.ritmo ? lido.meta.ritmoFonte : opcoes.ritmo ? "--ritmo" : "padrão do script", alvo, total, desvio, palavras: lido.palavras, blocos, quebras, lacunas, ctas, loops, aConfirmar: lido.aConfirmar, erros, avisos, meta: lido.meta };
}

/**
 * Orçamento de palavras antes de escrever: quantas palavras cabem no alvo, como
 * elas se dividem entre gancho, blocos e fecho, e quantas quebras de padrão o
 * vídeo vai precisar. Serve pra não descobrir no fim que o roteiro tem o dobro
 * do tamanho.
 */
function orcamento(alvo, ritmo, blocos) {
  const total = Math.round(alvo * (ritmo / 60));
  const fecho = 40;                                     // s
  const conteudo = Math.max(30, alvo - GANCHO_AVISO - fecho);
  const n = blocos || Math.max(3, Math.round(conteudo / 120));
  const porBloco = conteudo / n;
  return {
    alvo, ritmo, total, blocos: n,
    gancho: { segundos: GANCHO_AVISO, palavras: Math.round(GANCHO_AVISO * (ritmo / 60)) },
    fecho: { segundos: fecho, palavras: Math.round(fecho * (ritmo / 60)) },
    bloco: { segundos: porBloco, palavras: Math.round(porBloco * (ritmo / 60)) },
    quebras: Math.ceil(alvo / ((LACUNA_AVISO + LACUNA_ERRO) / 2)),
    loops: n,
  };
}

/** Palavras por minuto medidas numa transcrição de duração conhecida. */
function medirRitmo(arquivo, segundos) {
  const bruto = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  const sem = bruto
    .split(/\r?\n/)
    .filter((l) => !/^\s*(#|>|\|)/.test(l))
    .map((l) => l.trim().replace(ROTULOS, " "))   // **Locutor:** e **Na tela:** não são fala
    .join(" ")
    .replace(/\[\d{1,2}:\d{2}(:\d{2})?\]/g, " ")  // marcação de tempo da transcrição
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, " ");
  const palavras = contarPalavras(separarMarcas(sem).limpo);
  const ritmo = palavras / (segundos / 60);
  return { palavras, segundos, ritmo, plausivel: ritmo >= 90 && ritmo <= 200 };
}

// ─────────────────────────── saída ───────────────────────────

function imprimir(r) {
  const larguraTitulo = Math.min(46, Math.max(18, ...r.blocos.map((b) => b.titulo.length)));
  console.log(`\nRoteiro: ${path.basename(r.arquivo)}`);
  console.log(`Ritmo: ${Math.round(r.ritmo)} palavras/min${r.ritmoFonte ? ` (${r.ritmoFonte})` : ""} · ${r.palavras} palavras de fala`);
  console.log(`Duração prevista: ${timecode(r.total)}${r.alvo ? ` · alvo ${timecode(r.alvo)}` : ""}\n`);

  console.log(`  ${"início".padEnd(7)}${"dura".padEnd(7)}${"pal".padEnd(6)}${"queb".padEnd(6)}bloco`);
  for (const b of r.blocos) {
    console.log(`  ${timecode(b.inicio).padEnd(7)}${timecode(b.duracao).padEnd(7)}${String(b.palavras).padEnd(6)}${String(b.quebras).padEnd(6)}${b.titulo.slice(0, larguraTitulo)}`);
  }

  if (r.ctas.length) console.log(`\n  CTA em ${r.ctas.map(timecode).join(", ")}${r.alvo || r.total ? ` (vídeo de ${timecode(r.total)})` : ""}`);
  console.log(`  Quebras de padrão: ${r.quebras.length} · loops abertos: ${r.loops}`);

  if (r.avisos.length) {
    console.log("\nAvisos:");
    for (const a of r.avisos) console.log(`  ⚠ ${a}`);
  }
  if (r.erros.length) {
    console.log("\nErros:");
    for (const e of r.erros) console.log(`  ✖ ${e}`);
    console.log("\nCorrigir e rodar de novo.\n");
    return 1;
  }
  console.log(r.avisos.length ? "\nNenhum erro duro. Os avisos acima valem uma olhada.\n" : "\nTudo certo.\n");
  return 0;
}

/** Checklist de retenção em markdown, calculado a partir da medição. */
function checklist(r) {
  const l = [];
  l.push("## Checklist de retenção (medido, não opinado)", "");
  l.push(`Medido em ${br.fmt(new Date())} com \`node scripts/tempo.js medir\`, ritmo de ${Math.round(r.ritmo)} palavras/min.`, "");
  l.push("| Item | Régua | Como saiu | Situação |");
  l.push("|---|---|---|---|");
  const linha = (item, regua, valor, ok) => l.push(`| ${item} | ${regua} | ${valor} | ${ok ? "ok" : "rever"} |`);
  const g = r.blocos[0];
  linha("Gancho paga a promessa em 30s", `até ${GANCHO_AVISO}s`, timecode(g.duracao), g.duracao <= GANCHO_AVISO);
  linha("Duração no alvo", r.alvo ? `${timecode(r.alvo)} ± 8%` : "sem alvo declarado", timecode(r.total), r.alvo ? Math.abs(r.desvio) <= ALVO_AVISO : false);
  linha("Entrega antecipada", `algo concreto até ${ENTREGA_ANTECIPADA}s`, r.avisos.some((a) => a.includes("nada de concreto")) ? "não achei" : "tem", !r.avisos.some((a) => a.includes("nada de concreto")));
  linha("Quebra de padrão", `nenhum vão acima de ${LACUNA_ERRO}s`, r.lacunas.length ? `${r.lacunas.length} vão(s) acima de ${LACUNA_AVISO}s` : "nenhum", !r.lacunas.length);
  linha("Loop aberto antes de cada bloco", `${Math.max(0, r.blocos.length - 2)} ou mais`, String(r.loops), r.loops >= r.blocos.length - 2);
  linha("CTA no ponto certo", "primeiro antes de 70%", r.ctas.length ? `${timecode(r.ctas[0])} (${Math.round((r.ctas[0] / r.total) * 100)}%)` : "nenhum", r.ctas.length ? r.ctas[0] <= r.total * CTA_IDEAL : false);
  l.push("");
  l.push("### O que a medição apontou", "");
  if (!r.erros.length && !r.avisos.length) l.push("- Nada. As seis réguas passaram.");
  for (const e of r.erros) l.push(`- **Erro:** ${e}`);
  for (const a of r.avisos) l.push(`- Aviso: ${a}`);
  return l.join("\n") + "\n";
}

const MOLDE = `# Roteiro — <tema>

- **Promessa do título:** <o que o título prometeu, na frase exata>
- **Duração alvo:** 12 min
- **Ritmo:** 130 palavras/min (padrão pt-BR; medir o seu com \`node scripts/tempo.js ritmo\`)

## Gancho — paga a promessa em 30s
**Na tela:** três palavras, não a frase inteira

[cena: close no rosto, já falando] <a frase que prova que o vídeo é pra essa pessoa>.
<uma frase do que ela sai sabendo, concreta>. <uma frase do que está em jogo>.
[dado: número na tela, com fonte] <a entrega antecipada: o primeiro pedaço de valor,
antes de qualquer apresentação>. [loop: e no fim eu mostro <a coisa>]

## Bloco 1 — <o problema, na palavra do cliente>
**Na tela:** <o que aparece enquanto você fala>

<fala corrida, escrita do jeito que você fala>. [cena: muda o plano] <continua>.
[pergunta: joga a dúvida pro espectador] [loop: antes disso, falta uma coisa]

## Bloco 2 — <a virada>
[historia: o caso do <cliente>, com autorização] <fala>.
[cta] <a chamada, uma só, no ponto em que ela faz sentido>
[loop: falta a parte que ninguém conta]

## Bloco 3 — <a demonstração>
[demo: mostrar a tela / a mão fazendo] <fala>.

## Fecho — o que fazer agora
<uma frase fechando o último loop>. <o próximo vídeo, não o pedido de inscrição>.
`;

// ─────────────────────────── comando ───────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const livres = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const nome = a.slice(2);
      if (["ritmo", "alvo", "duracao", "duração", "blocos"].includes(nome)) flags[nome] = argv[++i];
      else flags[nome] = true;
    } else livres.push(a);
  }

  const comando = livres[0];
  if (!comando || flags.ajuda || flags.help) {
    console.log(`
tempo.js — duração e retenção de roteiro de vídeo longo

  node scripts/tempo.js medir <roteiro.md> [--ritmo 132] [--alvo 12] [--checklist]
  node scripts/tempo.js orcamento --alvo 12 [--ritmo 132] [--blocos 5]
  node scripts/tempo.js ritmo <transcricao.txt> --duracao 11:42
  node scripts/tempo.js molde [saida.md]
`);
    process.exit(comando ? 0 : 1);
  }

  if (comando === "molde") {
    const saida = livres[1];
    if (saida) {
      if (fs.existsSync(saida)) morrer(`${saida} já existe`, "Apagar ou escolher outro nome.");
      fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
      fs.writeFileSync(saida, MOLDE);
      console.log(`\n✓ molde em ${saida}`);
      console.log(`  Trocar a linha **Ritmo:** pelo medido antes de escrever a fala.\n`);
    } else {
      console.log(MOLDE);
      console.log(`<!-- Salvar em conteudo/roteiro-${br.slug("<tema>")}-${br.iso(new Date())}/roteiro.md -->`);
    }
    process.exit(0);
  }

  if (comando === "orcamento" || comando === "orçamento") {
    const cru = flags.alvo === true ? null : flags.alvo || livres[1];
    const alvo = lerDuracao(cru);
    if (!alvo) morrer(cru ? `não entendi a duração alvo "${cru}"` : "falta a duração alvo", 'Aceita "12", "12 min", "12:30" ou "720s", e tem que ser maior que zero.');
    let ritmo = RITMO_PADRAO;
    if (flags.ritmo) {
      const n = parseFloat(String(flags.ritmo).replace(",", "."));
      if (!(n > 40 && n < 400)) morrer(`--ritmo ${flags.ritmo} não é um ritmo de fala plausível`, "Fala humana fica entre 90 e 200 palavras/min.");
      ritmo = Math.round(n);
    }
    let nBlocos = null;
    if (flags.blocos !== undefined && flags.blocos !== true) {
      const n = parseInt(String(flags.blocos), 10);
      if (!Number.isInteger(n) || n < 2 || n > 12) {
        morrer(`--blocos ${flags.blocos} não serve`, "Um número inteiro de 2 a 12. Menos de 2 não tem onde abrir loop; mais de 12 dá bloco de meio minuto, que é corte de vertical, não bloco de vídeo longo.");
      }
      nBlocos = n;
    } else if (flags.blocos === true) {
      morrer("--blocos veio sem número", "node scripts/tempo.js orcamento --alvo 12 --blocos 5");
    }
    const o = orcamento(alvo, ritmo, nBlocos);
    if (flags.json) { console.log(JSON.stringify(o, null, 2)); process.exit(0); }
    console.log(`\nVídeo de ${timecode(o.alvo)} a ${o.ritmo} palavras/min → ${o.total} palavras de fala\n`);
    const linhas = [
      [`Gancho (até ${o.gancho.segundos}s)`, `${o.gancho.palavras} palavras`],
      [`${o.blocos} blocos de conteúdo`, `${o.bloco.palavras} palavras cada (${timecode(o.bloco.segundos)})`],
      [`Fecho (até ${o.fecho.segundos}s)`, `${o.fecho.palavras} palavras`],
    ];
    const col = Math.max(...linhas.map((l) => l[0].length)) + 2;
    for (const [rotulo, valor] of linhas) console.log(`  ${rotulo.padEnd(col)}${valor}`);
    console.log(`\n  Quebras de padrão: ao menos ${o.quebras} · loops abertos: ${o.loops}`);
    console.log(`\n  Régua: nenhum trecho acima de ${LACUNA_ERRO}s sem quebra, CTA antes de ${timecode(alvo * CTA_IDEAL)}.\n`);
    process.exit(0);
  }

  if (comando === "ritmo") {
    const arquivo = livres[1];
    if (!arquivo) morrer("falta a transcrição", "node scripts/tempo.js ritmo conteudo/transcricao.txt --duracao 11:42");
    if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);
    const cru = [flags.duracao, flags["duração"]].find((v) => v && v !== true);
    const seg = lerDuracao(cru);
    if (!seg) morrer(cru ? `não entendi --duracao "${cru}"` : "falta --duracao com a duração real do áudio", 'Aceita "11:42", "12 min" ou "702s", e tem que ser maior que zero.');
    const r = medirRitmo(arquivo, seg);
    if (flags.json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    console.log(`\n${r.palavras} palavras em ${timecode(r.segundos)} → ${Math.round(r.ritmo)} palavras/min`);
    if (!r.plausivel) {
      console.log(`\n  ⚠ fora da faixa de 90 a 200 palavras/min da fala humana. Conferir se a`);
      console.log(`    duração é a do áudio inteiro e se o arquivo tem a transcrição completa.`);
    }
    console.log(`\n  Escreva no cabeçalho do roteiro:`);
    console.log(`  - **Ritmo:** ${Math.round(r.ritmo)} palavras/min (medido em ${path.basename(arquivo)}, ${br.fmt(new Date())})\n`);
    process.exit(0);
  }

  if (comando !== "medir") morrer(`não conheço o comando "${comando}"`, "Comandos: medir, orcamento, ritmo, molde.");

  const arquivo = livres[1];
  if (!arquivo) morrer("falta o roteiro", "node scripts/tempo.js medir conteudo/roteiro-preco-2026-09-22/roteiro.md");
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);

  const opcoes = {};
  if (flags.ritmo) {
    const n = parseFloat(String(flags.ritmo).replace(",", "."));
    if (!(n > 40 && n < 400)) morrer(`--ritmo ${flags.ritmo} não é um ritmo de fala plausível`, "Fala humana fica entre 90 e 200 palavras/min.");
    opcoes.ritmo = Math.round(n);
  }
  if (flags.alvo !== undefined) {
    const s = flags.alvo === true ? null : lerDuracao(flags.alvo);
    if (!s) morrer(`não entendi --alvo ${flags.alvo === true ? "(vazio)" : flags.alvo}`, 'Aceita "12", "12 min", "12:30" ou "720s", e tem que ser maior que zero.');
    opcoes.alvo = s;
  }

  const r = medir(arquivo, opcoes);
  if (flags.json) { console.log(JSON.stringify(r, null, 2)); process.exit(r.erros.length ? 1 : 0); }
  if (flags.checklist) { console.log(checklist(r)); process.exit(r.erros.length ? 1 : 0); }
  process.exit(imprimir(r));
}

module.exports = {
  lerRoteiro, juntarMarcas, contarPalavras, separarMarcas, lerDuracao, timecode,
  medir, medirRitmo, orcamento, checklist,
  RITMO_PADRAO, GANCHO_AVISO, GANCHO_ERRO, LACUNA_AVISO, LACUNA_ERRO,
};

if (require.main === module) main();
