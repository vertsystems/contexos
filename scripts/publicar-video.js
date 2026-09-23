#!/usr/bin/env node
/**
 * Contex OS — publicar-video.js
 * Confere o pacote de publicação de um vídeo longo do YouTube antes do upload.
 *
 * Existe porque as regras do YouTube são objetivas e a conferência a olho falha
 * sempre nos mesmos quatro pontos: capítulo que não começa em 00:00 (aí o YouTube
 * simplesmente não cria nenhum), capítulo de menos de 10 segundos, título que
 * passa do ponto de truncagem e campo de tags acima do limite de 500 caracteres,
 * que conta a vírgula e as aspas implícitas de tag com espaço.
 *
 * Uso:
 *   node scripts/publicar-video.js <upload.md>
 *   node scripts/publicar-video.js capitulos <arquivo> [--duracao 18:42]
 *   node scripts/publicar-video.js titulo "Como fazer pão de fermentação natural"
 *   node scripts/publicar-video.js tags "pão caseiro, fermentação natural"
 *
 * Opções:
 *   --duracao <mm:ss|hh:mm:ss>   duração do vídeo, pra conferir o último capítulo
 *   --json                        devolve o laudo em JSON em vez de texto
 *
 * Regras conferidas (fonte e data em templates/crescimento/publicar-video.md):
 *   capítulos  — primeiro em 00:00, mínimo 3, ordem crescente, 10s ou mais cada
 *                (support.google.com/youtube/answer/9884579)
 *   título     — máximo 100 caracteres (support.google.com/youtube/answer/57407)
 *   descrição  — máximo 5.000 (mesma página); dobra do "mostrar mais" é limite
 *                de interface, medido, não documentado
 *   tags       — 500 caracteres somando vírgula e aspas de tag com espaço
 *                (developers.google.com/youtube/v3/docs/videos)
 *   hashtag    — acima de 60 no vídeo o YouTube ignora todas
 *                (support.google.com/youtube/answer/6390658)
 *
 * Node 18+. Sem dependência de npm. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── limites ───────────────────────────

const LIM = {
  tituloMax: 100,        // limite duro do YouTube
  tituloAlvo: 70,        // onde a truncagem começa no resultado de busca em desktop
  tituloAlvoCelular: 60, // onde começa no celular
  tituloMin: 20,         // régua de trabalho: abaixo disso o título não promete nada
  descricaoMax: 5000,    // limite duro, em bytes UTF-8
  primeiraLinha: 100,    // dobra do "mostrar mais": limite de interface
  duasPrimeirasLinhas: 200,
  tagsMax: 500,
  tagsMin: 8,             // faixa de trabalho do molde, não regra do YouTube
  tagsAlvoMax: 15,
  capitulosMin: 3,        // regra do YouTube
  capitulosAlvoMax: 12,   // faixa de trabalho do molde
  capituloMinSegundos: 10,
  capituloTituloAlvo: 40, // onde a barra do player corta: limite de interface
  hashtagsMax: 60,        // acima disso o YouTube ignora todas as hashtags
  comentarioMax: 10000,   // [a confirmar]: o campo de comentário não tem limite em página oficial
  comentarioAlvo: 500,    // régua de trabalho: comentário fixado longo ninguém lê
};

/** Abertura que queima o espaço visível da descrição. */
const ABERTURA_FRACA = /^(neste v[ií]deo|nesse v[ií]deo|ol[áa]\b|oi[,! ]|e a[ií]|fala\b|sejam bem|bem-?vindo|bom dia|boa tarde|boa noite|#)/i;

/** Nome de capítulo que a pessoa quer pular: o nome é só o rótulo, sem assunto. */
const CAPITULO_GENERICO = /^(introdu[çc][ãa]o|intro|abertura|in[íi]cio|come[çc]o|boas-?vindas|apresenta[çc][ãa]o|oi|ol[áa])([\s:,—-]*(do v[ií]deo|da aula|da live|inicial))?[.!]?$/i;

// ─────────────────────────── tempo ───────────────────────────

/** "12:30" ou "1:02:30" → 750 / 3750 segundos. Devolve null se não for timestamp. */
function segundos(t) {
  const m = String(t || "").trim().match(/^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?$/);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]), c = m[3] === undefined ? null : Number(m[3]);
  return c === null ? a * 60 + b : a * 3600 + b * 60 + c;
}

/** 3750 → "1:02:30". Mantém 00:00 com dois dígitos, como o YouTube mostra. */
function relogio(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(x).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ─────────────────────────── medidas ───────────────────────────

/** Caracteres visíveis (conta emoji como 1, igual ao contador do YouTube). */
function chars(s) { return [...String(s || "")].length; }

/** Bytes UTF-8 — é assim que o limite de 5.000 da descrição é aplicado. */
function bytes(s) { return Buffer.byteLength(String(s || ""), "utf8"); }

/**
 * Mede um título: tamanho, e se sobrevive à truncagem.
 * Devolve { texto, chars, cabe, truncaDesktop, truncaCelular, trecho }.
 */
function medirTitulo(texto) {
  const n = chars(texto);
  const arr = [...String(texto || "")];
  return {
    texto: String(texto || ""),
    chars: n,
    cabe: n <= LIM.tituloMax,
    truncaDesktop: n > LIM.tituloAlvo,
    truncaCelular: n > LIM.tituloAlvoCelular,
    invalido: /[<>]/.test(String(texto || "")),
    trecho: arr.slice(0, LIM.tituloAlvoCelular).join(""),
  };
}

/**
 * Peso do campo de tags na conta do YouTube: soma o tamanho de cada tag, mais a
 * vírgula entre elas, mais duas aspas por tag que tem espaço.
 * Devolve { total, lista: [{ tag, chars, peso }] }.
 */
function pesoTags(entrada) {
  const lista = (Array.isArray(entrada) ? entrada : String(entrada || "").split(","))
    .map((t) => String(t).trim())
    .filter(Boolean);
  const itens = lista.map((tag) => {
    const c = chars(tag);
    return { tag, chars: c, peso: /\s/.test(tag) ? c + 2 : c };
  });
  const soma = itens.reduce((a, i) => a + i.peso, 0);
  const total = itens.length === 0 ? 0 : soma + (itens.length - 1);
  const vistas = new Set(), repetidas = [];
  for (const i of itens) {
    const k = br.semAcento(i.tag).toLowerCase();
    if (vistas.has(k)) repetidas.push(i.tag); else vistas.add(k);
  }
  return { total, lista: itens, repetidas, cabe: total <= LIM.tagsMax };
}

/** Laudo do campo de tags: limite duro, faixa de trabalho e repetição. */
function conferirTags(entrada) {
  const p = pesoTags(entrada);
  const erros = [], avisos = [];
  if (!p.cabe) {
    erros.push(`campo de tags com ${p.total} caracteres: o limite é ${LIM.tagsMax} (conta a vírgula e as aspas de tag com espaço)`);
  }
  if (p.lista.length === 0) {
    avisos.push("nenhuma tag: o campo pesa pouco na descoberta, mas deixá-lo vazio não devolve esse tempo pra nada");
  } else if (p.lista.length < LIM.tagsMin) {
    avisos.push(`${p.lista.length} tag(s): a faixa de trabalho é de ${LIM.tagsMin} a ${LIM.tagsAlvoMax}`);
  } else if (p.lista.length > LIM.tagsAlvoMax) {
    avisos.push(`${p.lista.length} tags: acima de ${LIM.tagsAlvoMax} é tempo tirado do título e da miniatura, que é onde o resultado mora`);
  }
  if (p.repetidas.length) {
    avisos.push(`tag repetida: ${p.repetidas.join(", ")} — a repetição só gasta caractere do limite`);
  }
  const invalidas = p.lista.filter((i) => /[<>]/.test(i.tag)).map((i) => i.tag);
  if (invalidas.length) {
    avisos.push(`tag com < ou >: ${invalidas.join(", ")} — a referência da API não aceita esses caracteres`);
  }
  return { erros, avisos, peso: p };
}

/** Extrai os capítulos de um texto solto. Linha vira capítulo se começa com timestamp. */
function lerCapitulos(texto) {
  const out = [];
  for (const linha of String(texto || "").split("\n")) {
    const m = linha.trim().match(/^\[?(\d{1,3}:[0-5]\d(?::[0-5]\d)?)\]?\s*[-–—]?\s*(.*)$/);
    if (!m) continue;
    const s = segundos(m[1]);
    if (s === null) continue;
    out.push({ ts: m[1], segundos: s, titulo: m[2].trim(), linha: linha.trim() });
  }
  return out;
}

/**
 * Regra objetiva do YouTube para capítulo. Devolve { erros, avisos, capitulos }.
 * Erro = o YouTube não cria os capítulos. Aviso = cria, mas fica ruim de usar.
 */
function conferirCapitulos(capitulos, duracaoSegundos) {
  const erros = [], avisos = [];
  if (capitulos.length === 0) {
    erros.push("nenhum capítulo encontrado (linha de capítulo começa com o timestamp: `00:00 Abertura`)");
    return { erros, avisos, capitulos };
  }
  if (capitulos[0].segundos !== 0) {
    erros.push(`o primeiro capítulo é ${capitulos[0].ts} e precisa ser 00:00 — sem isso o YouTube não cria capítulo nenhum`);
  }
  if (capitulos.length < LIM.capitulosMin) {
    erros.push(`${capitulos.length} capítulo(s): o mínimo é ${LIM.capitulosMin}`);
  } else if (capitulos.length > LIM.capitulosAlvoMax) {
    avisos.push(`${capitulos.length} capítulos: acima de ${LIM.capitulosAlvoMax} a barra vira uma lista que ninguém lê`);
  }
  if (CAPITULO_GENERICO.test(capitulos[0].titulo || "")) {
    avisos.push(`o primeiro capítulo se chama "${capitulos[0].titulo}": é o nome do trecho que a pessoa mais quer pular — o primeiro capítulo é o gancho`);
  }
  for (let i = 1; i < capitulos.length; i++) {
    const a = capitulos[i - 1], b = capitulos[i];
    if (b.segundos <= a.segundos) {
      erros.push(`fora de ordem: ${b.ts} ("${b.titulo}") não vem depois de ${a.ts} ("${a.titulo}")`);
      continue;
    }
    const dur = b.segundos - a.segundos;
    if (dur < LIM.capituloMinSegundos) {
      erros.push(`o capítulo ${a.ts} ("${a.titulo}") dura ${dur}s: o mínimo é ${LIM.capituloMinSegundos}s`);
    }
  }
  const ultimo = capitulos[capitulos.length - 1];
  if (duracaoSegundos == null) {
    avisos.push(`sem --duracao o último capítulo (${ultimo.ts}) não foi conferido: se sobrar menos de ${LIM.capituloMinSegundos}s até o fim do vídeo, o YouTube descarta a lista inteira`);
  } else {
    if (ultimo.segundos >= duracaoSegundos) {
      erros.push(`o último capítulo (${ultimo.ts}) começa depois do fim do vídeo (${relogio(duracaoSegundos)})`);
    } else {
      const sobra = duracaoSegundos - ultimo.segundos;
      if (sobra < LIM.capituloMinSegundos) {
        erros.push(`o último capítulo (${ultimo.ts}) tem ${sobra}s até o fim do vídeo: o mínimo é ${LIM.capituloMinSegundos}s`);
      }
    }
  }
  for (const c of capitulos) {
    if (!c.titulo) erros.push(`o capítulo ${c.ts} está sem título`);
    else if (chars(c.titulo) > LIM.capituloTituloAlvo) avisos.push(`título longo em ${c.ts} (${chars(c.titulo)} caracteres): a barra do player corta perto de ${LIM.capituloTituloAlvo}`);
  }
  return { erros, avisos, capitulos };
}

/** Confere descrição: limite duro, dobra do "mostrar mais", link e capítulos dentro. */
function conferirDescricao(texto, capitulos) {
  const erros = [], avisos = [];
  const t = String(texto || "");
  if (!t.trim()) { erros.push("descrição vazia"); return { erros, avisos, bytes: 0, hashtags: 0 }; }
  const b = bytes(t);
  if (b > LIM.descricaoMax) {
    erros.push(`descrição com ${b} bytes: o limite é ${LIM.descricaoMax} (a conta é em bytes, e cada acento vale 2)`);
  }
  if (/[<>]/.test(t)) {
    avisos.push("a descrição tem < ou >: são os dois caracteres que a referência da API recusa, e o Studio come sem avisar");
  }

  const linhas = t.split("\n");
  const l1 = (linhas[0] || "").trim();
  const l2 = (linhas[1] || "").trim();
  if (chars(l1) > LIM.primeiraLinha) {
    avisos.push(`primeira linha com ${chars(l1)} caracteres: acima de ${LIM.primeiraLinha} ela já entra cortada antes do "mostrar mais"`);
  }
  if (chars(l1) + chars(l2) > LIM.duasPrimeirasLinhas) {
    avisos.push(`as duas primeiras linhas somam ${chars(l1) + chars(l2)} caracteres: acima de ${LIM.duasPrimeirasLinhas} a venda não caberia antes da dobra`);
  }
  if (ABERTURA_FRACA.test(l1)) {
    avisos.push(`a primeira linha abre com "${l1.slice(0, 24)}": saudação, "neste vídeo" e hashtag gastam o espaço mais lido da descrição`);
  } else if (ABERTURA_FRACA.test(l2)) {
    avisos.push(`a segunda linha abre com "${l2.slice(0, 24)}": ela também aparece antes do "mostrar mais", então vale o mesmo cuidado da primeira`);
  }
  if (!/https?:\/\//i.test(t)) avisos.push("nenhum link na descrição: o vídeo não tem pra onde mandar quem se interessou");
  const links = (t.match(/https?:\/\/\S+/gi) || []);
  const alvos = new Set(links.map((u) => u.replace(/[).,;]+$/, "")));
  if (alvos.size > 3) {
    avisos.push(`${alvos.size} links diferentes na descrição: uma chamada por vídeo — quatro links viram zero clique`);
  }

  const hashtags = (t.match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length;
  if (hashtags > LIM.hashtagsMax) {
    erros.push(`${hashtags} hashtags: acima de ${LIM.hashtagsMax} o YouTube ignora todas (support.google.com/youtube/answer/6390658)`);
  }

  if (capitulos && capitulos.length) {
    const naDescricao = lerCapitulos(t);
    const segsDescricao = new Set(naDescricao.map((c) => c.segundos));
    const faltando = capitulos.filter((c) => !segsDescricao.has(c.segundos));
    if (faltando.length) {
      erros.push(`${faltando.length} capítulo(s) da lista não aparecem na descrição (${faltando.map((c) => c.ts).join(", ")}) — o YouTube só lê capítulo que está lá`);
    }
    const segsLista = new Set(capitulos.map((c) => c.segundos));
    const sobrando = naDescricao.filter((c) => !segsLista.has(c.segundos));
    if (sobrando.length) {
      avisos.push(`a descrição tem timestamp que não está na lista (${sobrando.map((c) => c.ts).join(", ")}): quem vale é a descrição, então conferir se é capítulo ou menção solta a um minuto do vídeo`);
    }
  }
  return { erros, avisos, bytes: b, hashtags };
}

// ─────────────────────────── leitura do upload.md ───────────────────────────

/** Nome de seção sem acento, minúsculo, sem pontuação — pra casar "Descrição" e "descricao". */
function chave(s) {
  return br.semAcento(String(s || "")).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Quebra o upload.md em seções por "## ". De cada seção pega o primeiro bloco
 * de código cercado, se houver; senão, o texto cru.
 */
function lerPacote(md) {
  // O esqueleto do upload.md aparece na skill dentro de uma cerca de quatro crases,
  // e quem copia junto com a cerca acabaria com o arquivo inteiro dentro de um bloco.
  // Nesse caso a cerca de fora sai antes de procurar seção.
  const mEnvelope = String(md).match(/^\s*(`{3,})[a-z]*\n([\s\S]*?)\n\1\s*$/);
  if (mEnvelope && /^##\s+/m.test(mEnvelope[2])) md = mEnvelope[2];

  const secoes = {};
  let atual = null, buffer = [], cerca = 0;
  const guardar = () => { if (atual) secoes[atual] = buffer.join("\n").trim(); };
  for (const linha of String(md).split("\n")) {
    // Cerca fecha só com a mesma quantidade de crase ou mais: assim um bloco ```
    // dentro de um ````markdown não abre e fecha a cerca de fora pela metade.
    const c = linha.match(/^\s*(`{3,})/);
    if (c) {
      if (cerca === 0) cerca = c[1].length;
      else if (c[1].length >= cerca) cerca = 0;
    }
    const h = cerca > 0 ? null : linha.match(/^##\s+(.+?)\s*$/);
    if (h) { guardar(); atual = chave(h[1]); buffer = []; continue; }
    if (atual) buffer.push(linha);
  }
  guardar();

  const bloco = (txt) => {
    const m = String(txt || "").match(/^[ \t]*(`{3,})[a-z]*\n([\s\S]*?)\n?[ \t]*\1[ \t]*$/m);
    return m ? m[2].replace(/\n+$/, "") : String(txt || "").trim();
  };
  const achar = (...alvos) => {
    for (const a of alvos) {
      const k = Object.keys(secoes).find((x) => x === a || x.startsWith(a));
      if (k) return secoes[k];
    }
    return null;
  };

  const brutoTitulos = achar("titulos", "titulo");
  const titulos = [];
  if (brutoTitulos) {
    for (const linha of brutoTitulos.split("\n")) {
      const m = linha.trim().match(/^(?:\d+[.)]|[-*])\s+(.+)$/);
      if (m) titulos.push(m[1].replace(/^\*\*|\*\*$/g, "").replace(/\s*\(\d+\s*car\w*\)\s*$/i, "").trim());
    }
  }

  const descricao = achar("descricao") ? bloco(achar("descricao")) : null;
  const brutoCapitulos = achar("capitulos");
  let capitulos = lerCapitulos(brutoCapitulos || "");
  let capitulosDaDescricao = false;
  if (capitulos.length === 0 && descricao) {
    // O YouTube lê capítulo da descrição. Se a seção separada não existe, ela
    // não é o que impede a publicação: a lista é conferida do jeito que vai subir.
    capitulos = lerCapitulos(descricao);
    capitulosDaDescricao = capitulos.length > 0;
  }
  const tagsBruto = achar("tags") ? bloco(achar("tags")) : null;
  const comentario = achar("comentario fixado", "comentario") ? bloco(achar("comentario fixado", "comentario")) : null;

  return { titulos, descricao, capitulos, capitulosDaDescricao, tags: tagsBruto, comentario, secoes: Object.keys(secoes) };
}

/** Laudo completo do pacote. Devolve { erros, avisos, resumo }. */
function conferirPacote(pacote, duracaoSegundos) {
  const erros = [], avisos = [], resumo = [];

  if (pacote.titulos.length === 0) {
    erros.push('nenhum título encontrado (a seção "## Títulos" espera uma lista numerada)');
  } else {
    if (pacote.titulos.length < 3) avisos.push(`${pacote.titulos.length} título(s): o padrão é entregar 3 pra escolher`);
    const inicios = new Map();
    pacote.titulos.forEach((t, i) => {
      const m = medirTitulo(t);
      if (!m.cabe) erros.push(`título ${i + 1} com ${m.chars} caracteres: o limite do YouTube é ${LIM.tituloMax}`);
      else if (m.truncaDesktop) avisos.push(`título ${i + 1} com ${m.chars} caracteres: acima de ${LIM.tituloAlvo} corta na busca em desktop`);
      if (m.invalido) avisos.push(`título ${i + 1} tem < ou >: o campo recusa esses caracteres`);
      if (m.chars < LIM.tituloMin) avisos.push(`título ${i + 1} com ${m.chars} caracteres: abaixo de ${LIM.tituloMin} não sobra espaço pra dizer o que a pessoa ganha assistindo`);
      const ini = br.semAcento(t).toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 25);
      if (inicios.has(ini)) avisos.push(`título ${i + 1} começa igual ao ${inicios.get(ini)}: os três são apostas diferentes (busca, erro, resultado), não variações da mesma frase`);
      else inicios.set(ini, i + 1);
      resumo.push(`título ${i + 1}: ${m.chars} car.${m.truncaCelular ? ` · no celular o leitor vê até "${m.trecho}…"` : ""}`);
    });
  }

  if (pacote.capitulosDaDescricao) {
    avisos.push('seção "## Capítulos" não encontrada: conferi os timestamps que estão dentro da descrição, que é de onde o YouTube lê. Vale repetir a lista numa seção própria pra não perder na próxima edição');
  }
  const cap = conferirCapitulos(pacote.capitulos, duracaoSegundos);
  erros.push(...cap.erros); avisos.push(...cap.avisos);
  if (pacote.capitulos.length) {
    resumo.push(`capítulos: ${pacote.capitulos.length}, de ${pacote.capitulos[0].ts} a ${pacote.capitulos[pacote.capitulos.length - 1].ts}`);
  }

  if (pacote.descricao === null) erros.push('seção "## Descrição" não encontrada');
  else {
    const d = conferirDescricao(pacote.descricao, pacote.capitulosDaDescricao ? [] : pacote.capitulos);
    erros.push(...d.erros); avisos.push(...d.avisos);
    resumo.push(`descrição: ${d.bytes} de ${LIM.descricaoMax} bytes${d.hashtags ? ` · ${d.hashtags} hashtag(s)` : ""}`);
  }

  if (pacote.tags === null) avisos.push('seção "## Tags" não encontrada — tags pesam pouco, mas o campo vazio não ajuda em nada');
  else {
    const p = conferirTags(pacote.tags);
    erros.push(...p.erros); avisos.push(...p.avisos);
    resumo.push(`tags: ${p.peso.lista.length} tag(s), ${p.peso.total} de ${LIM.tagsMax} caracteres`);
  }

  if (pacote.comentario === null) avisos.push('seção "## Comentário fixado" não encontrada');
  else {
    const n = chars(pacote.comentario);
    if (n === 0) erros.push("comentário fixado vazio");
    if (n > LIM.comentarioMax) erros.push(`comentário fixado com ${n} caracteres: o campo aceita ${LIM.comentarioMax}`);
    else if (n > LIM.comentarioAlvo) avisos.push(`comentário fixado com ${n} caracteres: acima de ${LIM.comentarioAlvo} o celular esconde o resto atrás de "Ler mais"`);
    if (!/https?:\/\/|wa\.me|whats|\?/i.test(pacote.comentario)) {
      avisos.push("o comentário fixado não tem link nem pergunta: ele serve pra uma função só — chamada, correção ou pergunta");
    }
    resumo.push(`comentário fixado: ${n} car.`);
  }

  return { erros, avisos, resumo };
}

// ─────────────────────────── saída ───────────────────────────

function imprimir(titulo, laudo) {
  console.log(`\n${titulo}\n`);
  for (const l of laudo.resumo || []) console.log(`  · ${l}`);
  if ((laudo.resumo || []).length) console.log("");
  for (const e of laudo.erros) console.log(`  ✖ ${e}`);
  for (const a of laudo.avisos) console.log(`  ! ${a}`);
  if (!laudo.erros.length && !laudo.avisos.length) console.log("  ✓ Tudo certo.");
  else if (!laudo.erros.length) console.log("\n  ✓ Nada impede a publicação. Os avisos são de qualidade.");
  console.log("");
  return laudo.erros.length ? 1 : 0;
}

function ajuda() {
  console.log(`
Contex OS — publicar-video.js

  node scripts/publicar-video.js <upload.md> [--duracao 18:42]
  node scripts/publicar-video.js capitulos <arquivo> [--duracao 18:42]
  node scripts/publicar-video.js titulo "texto do título"
  node scripts/publicar-video.js tags "tag um, tag dois"

  --duracao mm:ss   duração do vídeo. Sem ela o último capítulo não é conferido,
                    e é justamente o que mais derruba a lista inteira
  --json            laudo em JSON

  Sai com 1 quando há ✖ (a publicação para) e 0 quando só há ! (qualidade).
  Fonte e data de cada limite: templates/crescimento/publicar-video.md
`);
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const iDur = argv.indexOf("--duracao");
  let duracao = null;
  if (iDur !== -1) {
    duracao = segundos(argv[iDur + 1]);
    if (duracao === null) { console.error("\n✖ --duracao pede mm:ss ou hh:mm:ss (ex.: 18:42)\n"); process.exit(1); }
  }
  const livres = argv.filter((a, i) => !a.startsWith("--") && !(iDur !== -1 && i === iDur + 1));

  if (livres.length === 0) { ajuda(); process.exit(1); }

  const modo = livres[0];

  if (modo === "titulo") {
    const t = livres.slice(1).join(" ");
    if (!t) { console.error("\n✖ passe o título entre aspas\n"); process.exit(1); }
    const m = medirTitulo(t);
    if (json) { console.log(JSON.stringify(m, null, 2)); process.exit(m.cabe ? 0 : 1); }
    const laudo = {
      erros: [], avisos: [],
      resumo: [
        `${m.chars} caracteres`,
        m.truncaCelular
          ? `no celular o leitor vê "${m.trecho}…" e decide a partir daí`
          : `cabe inteiro no celular: "${m.texto}"`,
      ],
    };
    if (!m.cabe) laudo.erros.push(`passa do limite de ${LIM.tituloMax} caracteres`);
    else if (m.truncaDesktop) laudo.avisos.push(`acima de ${LIM.tituloAlvo} caracteres corta na busca em desktop`);
    if (m.invalido) laudo.erros.push("tem < ou >: o campo de título recusa esses caracteres");
    process.exit(imprimir("Título", laudo));
  }

  if (modo === "tags") {
    const t = livres.slice(1).join(" ");
    const c = conferirTags(t);
    const p = c.peso;
    if (json) { console.log(JSON.stringify(c, null, 2)); process.exit(c.erros.length ? 1 : 0); }
    const comEspaco = p.lista.filter((i) => i.peso !== i.chars);
    const laudo = {
      erros: c.erros, avisos: c.avisos,
      resumo: [`${p.lista.length} tag(s), ${p.total} de ${LIM.tagsMax} caracteres`],
    };
    if (comEspaco.length) {
      const extra = comEspaco.reduce((a, i) => a + (i.peso - i.chars), 0);
      laudo.resumo.push(`${comEspaco.length} tag(s) com espaço custam ${extra} caractere(s) a mais: o YouTube põe aspas em volta e cobra as duas`);
      if (comEspaco.length <= 5) for (const i of comEspaco) laudo.resumo.push(`  "${i.tag}" pesa ${i.peso}, não ${i.chars}`);
    }
    laudo.resumo.push(`vírgula entre as tags: ${Math.max(0, p.lista.length - 1)} caractere(s)`);
    process.exit(imprimir("Campo de tags", laudo));
  }

  const alvo = modo === "capitulos" ? livres[1] : livres[0];
  if (!alvo) { console.error("\n✖ falta o arquivo\n"); process.exit(1); }
  const arq = path.resolve(alvo);
  if (!fs.existsSync(arq)) { console.error(`\n✖ não encontrei ${alvo}\n`); process.exit(1); }
  const conteudo = fs.readFileSync(arq, "utf8").replace(/^﻿/, "");

  if (modo === "capitulos") {
    const caps = lerCapitulos(conteudo);
    const c = conferirCapitulos(caps, duracao);
    if (json) { console.log(JSON.stringify(c, null, 2)); process.exit(c.erros.length ? 1 : 0); }
    const laudo = {
      erros: c.erros, avisos: c.avisos,
      resumo: caps.map((x, i) => {
        const fim = i + 1 < caps.length ? caps[i + 1].segundos : duracao;
        // Só mostra a duração quando ela faz sentido: com a lista fora de ordem o
        // número sairia negativo, e número negativo confunde mais do que ajuda.
        const dur = fim != null && fim > x.segundos ? ` (${fim - x.segundos}s)` : "";
        return `${x.ts} ${x.titulo || "[sem título]"}${dur}`;
      }),
    };
    process.exit(imprimir(`Capítulos — ${path.basename(arq)}`, laudo));
  }

  const pacote = lerPacote(conteudo);
  const laudo = conferirPacote(pacote, duracao);
  if (json) { console.log(JSON.stringify({ ...laudo, secoes: pacote.secoes }, null, 2)); process.exit(laudo.erros.length ? 1 : 0); }
  process.exit(imprimir(`Pacote de publicação — ${path.basename(arq)} — ${br.fmt(new Date())}`, laudo));
}

module.exports = {
  LIM, segundos, relogio, chars, bytes,
  medirTitulo, pesoTags, conferirTags, lerCapitulos, conferirCapitulos, conferirDescricao,
  lerPacote, conferirPacote,
};

if (require.main === module) main();
