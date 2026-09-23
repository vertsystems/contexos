#!/usr/bin/env node
/**
 * Contex OS — publicidade.js
 * Passa uma peça (post, anúncio, bio, landing) pelo léxico do conselho da
 * profissão e pela política da plataforma, e devolve o laudo: cada trecho que
 * viola, o artigo, a data de vigência, a fonte e a reescrita sugerida.
 *
 * Existe porque chat chuta número de artigo e esquece termo. "Sem dor" passa
 * despercebido numa legenda de dentista, "garantimos" numa bio de advogado, e a
 * conta é anúncio reprovado, perfil restrito ou processo ético. Aqui o termo é
 * casado contra um léxico datado (templates/juridico/lexico-publicidade.json),
 * onde cada regra carrega artigo, vigência, fonte e a data em que foi conferida.
 * O que texto não pega (antes e depois, selfie com paciente, equipamento na
 * foto, segmentação de idade) entra por um manifesto que o usuário declara.
 *
 * Uso:
 *   node scripts/publicidade.js <peca.txt|.md|.html> --profissao dentista [--plataforma instagram]
 *   node scripts/publicidade.js --texto "Clareamento sem dor, R$ 299" --profissao dentista
 *   node scripts/publicidade.js <peca> --profissao medico --plataforma meta-ads --checklist manifesto.json --saida laudo.md
 *   node scripts/publicidade.js manifesto --profissao medico --plataforma meta-ads [--saida manifesto.json]
 *   node scripts/publicidade.js conselhos
 *
 * Opções:
 *   --profissao <p>     dentista, medico, advogado, psicologo, corretor (ou sinônimo do léxico)
 *   --plataforma <p>    instagram, facebook, bio, stories (orgânico) | meta-ads, anuncio (pago) | site, landing
 *   --pago              o mesmo que --plataforma meta-ads
 *   --checklist <json>  manifesto com o que a imagem mostra (gerado por "manifesto")
 *   --saida <arquivo>   escreve o laudo em markdown (padrão: mostra no terminal)
 *   --lexico <json>     outro léxico (padrão: templates/juridico/lexico-publicidade.json)
 *   --json              o resultado em JSON, pra encadear
 *
 * Sai com código 1 se achar infração (alta ou média). Aviso e pendência não derrubam.
 *
 * Node 18+, sem dependência.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const LEXICO_PADRAO = path.join(__dirname, "..", "templates", "juridico", "lexico-publicidade.json");
const ORDEM_GRAVIDADE = { alta: 0, media: 1, aviso: 2 };

// ─────────────────────────── léxico ───────────────────────────

function carregarLexico(caminho = LEXICO_PADRAO) {
  const lex = JSON.parse(fs.readFileSync(caminho, "utf8"));
  for (const r of lex.regras) {
    if (r.padrao) {
      try { r._re = new RegExp(r.padrao, "gi"); }
      catch (e) { throw new Error(`regra ${r.id}: padrão inválido (${e.message})`); }
    }
  }
  return lex;
}

/** "Dentista", "cirurgiã-dentista", "advocacia" → chave do conselho, ou null. */
function resolverConselho(profissao, lex) {
  const p = br.semAcento(profissao || "").trim();
  if (!p) return null;
  for (const [chave, c] of Object.entries(lex.conselhos)) {
    if (c.profissoes.some((s) => p === s || p.startsWith(s + " ") || p.includes(s))) return chave;
  }
  return null;
}

/** "instagram", "Anúncio no Insta", "landing" → "meta" | "meta-ads" | "site" | null. */
function resolverPlataforma(plataforma, lex, pago = false) {
  if (pago) return "meta-ads";
  const p = br.semAcento(plataforma || "").trim();
  if (!p) return null;
  for (const [chave, lista] of Object.entries(lex.plataformas)) {
    if (lista.some((s) => p === s || p.includes(s))) return chave;
  }
  return null;
}

// ─────────────────────────── texto ───────────────────────────

/** HTML vira texto; markdown e txt passam como estão. */
function extrairTexto(arquivo) {
  const bruto = fs.readFileSync(arquivo, "utf8");
  if (!/\.html?$/i.test(arquivo)) return bruto;
  return bruto
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|p|div|li|h[1-6]|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ");
}

/**
 * Normaliza caractere a caractere (minúscula, sem acento) e guarda o mapa
 * de volta pro original, pra citar o trecho como o usuário escreveu.
 */
function normalizar(texto) {
  let norm = "";
  const mapa = [];
  for (let i = 0; i < texto.length; i++) {
    const n = br.semAcento(texto[i]);
    for (let k = 0; k < n.length; k++) { norm += n[k]; mapa.push(i); }
  }
  return { norm, mapa };
}

function linhaDe(texto, indice) {
  let l = 1;
  for (let i = 0; i < indice && i < texto.length; i++) if (texto[i] === "\n") l++;
  return l;
}

function contexto(texto, ini, fim, folga = 40) {
  const a = Math.max(0, ini - folga), b = Math.min(texto.length, fim + folga);
  const pre = (a > 0 ? "…" : "") + texto.slice(a, ini).replace(/\s+/g, " ");
  const pos = texto.slice(fim, b).replace(/\s+/g, " ") + (b < texto.length ? "…" : "");
  return `${pre}**${texto.slice(ini, fim)}**${pos}`.trim();
}

// ─────────────────────────── análise ───────────────────────────

function regraSeAplica(r, conselho, plataforma) {
  if (r.conselho === "geral") return true;
  if (r.conselho === "meta") return plataforma === "meta-ads" && (!r.plataformas || r.plataformas.includes(plataforma));
  return r.conselho === conselho;
}

/**
 * Roda o léxico sobre a peça e o manifesto.
 * Devolve { conselho, plataforma, achados, permitidos, pendentes, resumo }.
 */
function analisar({ texto = "", profissao, plataforma, pago = false, checklist = {}, lexico, linhasConfiaveis = true } = {}) {
  const lex = lexico || carregarLexico();
  const conselho = resolverConselho(profissao, lex);
  const plat = resolverPlataforma(plataforma, lex, pago);
  const platPedida = String(plataforma || "").trim();
  const platNaoReconhecida = !pago && !!platPedida && !plat;
  const { norm, mapa } = normalizar(texto);
  const achados = [], permitidos = [], pendentes = [];

  for (const r of lex.regras) {
    if (!regraSeAplica(r, conselho, plat)) continue;

    if (r.tipo === "texto" || r.tipo === "permitido") {
      const trechos = [];
      r._re.lastIndex = 0;
      let m;
      while ((m = r._re.exec(norm)) !== null) {
        if (m[0].length === 0) { r._re.lastIndex++; continue; }
        const ini = mapa[m.index], fim = mapa[m.index + m[0].length - 1] + 1;
        trechos.push({ trecho: texto.slice(ini, fim), linha: linhaDe(texto, ini), contexto: contexto(texto, ini, fim) });
        if (trechos.length >= 12) break;
      }
      if (r.inverter) {
        if (trechos.length === 0 && texto.trim()) achados.push(item(r, [{ trecho: "(não encontrado na peça)", linha: 0, contexto: "" }]));
        continue;
      }
      if (trechos.length === 0) continue;
      (r.tipo === "permitido" ? permitidos : achados).push(item(r, trechos));
      continue;
    }

    if (r.tipo === "checklist") {
      const valor = checklist[r.chave];
      if (valor === undefined || valor === null) { pendentes.push(pendencia(r, r.chave, r.pergunta)); continue; }
      if (valor !== r.responde_infracao_quando) continue;
      if (!r.condicoes || r.condicoes.length === 0) { achados.push(item(r, [{ trecho: `checklist: ${r.chave} = ${valor}`, linha: 0, contexto: "" }])); continue; }
      const faltam = [], falham = [];
      for (const c of r.condicoes) {
        const v = checklist[c];
        if (v === undefined || v === null) faltam.push(c);
        else if (v !== true) falham.push(c);
      }
      if (falham.length) {
        achados.push(item(r, falham.map((c) => ({ condicao: c, trecho: lex.condicoes[c] || c, linha: 0, contexto: "" }))));
      }
      for (const c of faltam) pendentes.push(pendencia(r, c, lex.condicoes[c] || c));
      if (!falham.length && !faltam.length) permitidos.push(item(r, [{ trecho: `checklist: ${r.chave} com todas as condições cumpridas`, linha: 0, contexto: "" }]));
    }
  }

  achados.sort((a, b) => (ORDEM_GRAVIDADE[a.gravidade] ?? 9) - (ORDEM_GRAVIDADE[b.gravidade] ?? 9));
  const resumo = { alta: 0, media: 0, aviso: 0 };
  for (const a of achados) resumo[a.gravidade] = (resumo[a.gravidade] || 0) + 1;

  // a plataforma libera, mas o conselho já barrou a mesma chave: dizer isso, não só "pode ficar"
  const chavesBarradas = new Set(achados.map((a) => a.chave).filter(Boolean));
  for (const p of permitidos) if (p.chave && chavesBarradas.has(p.chave)) p.barrado_pelo_conselho = true;

  return {
    conselho, conselhoNome: conselho ? lex.conselhos[conselho].nome : null,
    plataforma: plat, plataforma_pedida: platPedida || null, plataforma_nao_reconhecida: platNaoReconhecida,
    coberto: !!conselho, texto_vazio: !texto.trim(), linhas_confiaveis: !!linhasConfiaveis,
    conselhos_cobertos: Object.entries(lex.conselhos).filter(([k]) => !["meta", "geral"].includes(k)).map(([, c]) => c.nome),
    achados, permitidos, pendentes, resumo,
    lexico_versao: lex.versao,
  };
}

function item(r, trechos) {
  return {
    id: r.id, tipo: r.tipo, conselho: r.conselho, gravidade: r.gravidade, chave: r.chave || null,
    termo: r.termo || (r.chave ? `checklist: ${r.chave.replace(/_/g, " ")}` : r.id),
    artigo: r.artigo, texto_da_norma: r.texto_da_norma, vigencia: r.vigencia, fonte: r.fonte,
    conferido_em: r.conferido_em, reescrita: r.reescrita, trechos,
  };
}

function pendencia(r, chave, pergunta) {
  return { id: r.id, chave, pergunta, artigo: r.artigo, gravidade: r.gravidade };
}

// ─────────────────────────── manifesto ───────────────────────────

/** Esqueleto do checklist pra profissão e plataforma: só as perguntas que se aplicam. */
function manifesto(profissao, plataforma, pago, lex) {
  lex = lex || carregarLexico();
  const conselho = resolverConselho(profissao, lex);
  const plat = resolverPlataforma(plataforma, lex, pago);
  const m = { _profissao: profissao || "", _plataforma: plat || "", _perguntas: {} };
  for (const r of lex.regras) {
    if (r.tipo !== "checklist" || !regraSeAplica(r, conselho, plat)) continue;
    m[r.chave] = null; m._perguntas[r.chave] = r.pergunta;
    for (const c of r.condicoes || []) { m[c] = null; if (!m._perguntas[c]) m._perguntas[c] = lex.condicoes[c] || c; }
  }
  return m;
}

// ─────────────────────────── laudo ───────────────────────────

function dataVig(iso) {
  const d = br.lerData(iso);
  return d ? br.fmt(d) : iso;
}

function laudo(res, { nomePeca = "peça", profissao = "", hoje = new Date() } = {}) {
  const L = [];
  L.push(`# Laudo de publicidade regulada — ${nomePeca}`);
  L.push("");
  const plat = res.plataforma
    ? res.plataforma
    : res.plataforma_nao_reconhecida
      ? `"${res.plataforma_pedida}" não está no léxico (as regras de plataforma não entraram)`
      : "não informada";
  L.push(`> Profissão: ${profissao || "[não informada]"} | Conselho: ${res.conselhoNome || "não coberto pelo léxico"} | Plataforma: ${plat}`);
  L.push(`> Léxico de ${dataVig(res.lexico_versao)}, laudo gerado em ${br.fmt(hoje)}. Não substitui o conselho nem advogado: é a triagem antes de publicar.`);
  L.push("");
  if (res.texto_vazio) {
    L.push("> **Peça sem texto.** Nada foi varrido: só o checklist declarado valeu. Se a peça é imagem ou vídeo, transcreva a legenda num `.md` e rode de novo.");
    L.push("");
  }
  if (!res.coberto) {
    L.push(`> **Conselho não coberto.** O léxico cobre: ${res.conselhos_cobertos.join(", ")}. Pra esta profissão valem só as regras gerais (CDC) e as da plataforma. O que o conselho dela diz fica \`[a confirmar]\` com o próprio conselho.`);
    L.push("");
  }
  L.push("## Resumo");
  L.push("");
  L.push(`| Gravidade | Quantas |`);
  L.push(`|---|---|`);
  L.push(`| Alta (infração clara ou reprovação certa) | ${res.resumo.alta || 0} |`);
  L.push(`| Média (depende do contexto, conferir) | ${res.resumo.media || 0} |`);
  L.push(`| Aviso | ${res.resumo.aviso || 0} |`);
  L.push(`| Pendências do checklist | ${res.pendentes.length} |`);
  L.push("");

  L.push("## O que viola, e onde");
  L.push("");
  if (!res.achados.length) { L.push("Nenhum termo do léxico casou com a peça, e o checklist declarado não acusou infração."); L.push(""); }
  let n = 0;
  for (const a of res.achados) {
    n++;
    L.push(`### ${n}. ${a.termo} (${a.gravidade})`);
    L.push("");
    L.push(`- **Regra:** ${a.artigo}, em vigor desde ${dataVig(a.vigencia)}`);
    L.push(`- **O que a norma diz:** ${a.texto_da_norma}`);
    L.push(`- **Fonte:** ${a.fonte} (conferida em ${dataVig(a.conferido_em)})`);
    for (const t of a.trechos) {
      if (t.condicao) { L.push(`- **Condição não cumprida:** \`${t.condicao}\` — ${t.trecho}`); continue; }
      const onde = t.linha ? (res.linhas_confiaveis ? `linha ${t.linha}: ` : `linha ${t.linha} do texto extraído: `) : "";
      L.push(`- **Trecho:** ${onde}${t.contexto || t.trecho}`);
    }
    L.push(`- **Reescrita sugerida:** ${a.reescrita}`);
    L.push("");
  }

  if (res.permitidos.length) {
    L.push("## O que pode ficar");
    L.push("");
    for (const p of res.permitidos) {
      const onde = p.trechos[0] && p.trechos[0].linha ? ` (linha ${p.trechos[0].linha}${res.linhas_confiaveis ? "" : " do texto extraído"})` : "";
      const conflito = p.barrado_pelo_conselho ? " **Atenção: a mesma coisa aparece barrada acima, e o conselho vale antes da plataforma — vale o achado, não esta permissão.**" : "";
      L.push(`- **${p.termo}** — ${p.artigo}: ${p.texto_da_norma}${onde}. ${p.reescrita}${conflito}`);
    }
    L.push("");
  }

  if (res.pendentes.length) {
    L.push("## O que o texto não pega (responder no manifesto)");
    L.push("");
    L.push("| Chave | Pergunta | Regra |");
    L.push("|---|---|---|");
    for (const p of res.pendentes) L.push(`| \`${p.chave}\` | ${p.pergunta} | ${p.artigo} |`);
    L.push("");
  }

  L.push("## Peça reescrita");
  L.push("");
  L.push("[o assistente escreve aqui a peça inteira, mantendo a mensagem e trocando cada trecho acima pela reescrita]");
  L.push("");
  return L.join("\n");
}

// ─────────────────────────── cli ───────────────────────────

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const prox = argv[i + 1];
      if (["pago", "json"].includes(k) || prox === undefined || prox.startsWith("--")) o[k] = true;
      else { o[k] = prox; i++; }
    } else o._.push(a);
  }
  return o;
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function main() {
  const o = args(process.argv.slice(2));
  const caminhoLex = o.lexico || LEXICO_PADRAO;
  let lex;
  try { lex = carregarLexico(caminhoLex); }
  catch (e) {
    const falta = e.code === "ENOENT";
    morrer(
      falta ? `não achei o léxico ${caminhoLex}` : `léxico ${caminhoLex} inválido: ${e.message}`,
      falta ? "o padrão é templates/juridico/lexico-publicidade.json; rode a partir da raiz do workspace" : "é um JSON: conferir vírgula sobrando e aspas fechando"
    );
  }
  const cmd = o._[0];

  if (cmd === "conselhos") {
    console.log(`Léxico de ${dataVig(lex.versao)}\n`);
    for (const [k, c] of Object.entries(lex.conselhos)) {
      const n = lex.regras.filter((r) => r.conselho === k).length;
      console.log(`- ${c.nome} [${k}] — ${c.norma}; vigência ${dataVig(c.vigencia)}; conferido em ${dataVig(c.conferido_em)}; ${n} ${n === 1 ? "regra" : "regras"}`);
      console.log(`  ${c.fonte}`);
      if (c.registro) console.log(`  obrigatório na peça: ${c.registro}`);
      if (c.orgao_consulta) console.log(`  onde consultar: ${c.orgao_consulta}`);
      if (c.nota_de_vigilancia) console.log(`  ⚠ ${c.nota_de_vigilancia}`);
    }
    return;
  }

  if (cmd === "manifesto") {
    if (!o.profissao) morrer("faltou --profissao", "ex.: node scripts/publicidade.js manifesto --profissao dentista --plataforma instagram");
    const m = manifesto(o.profissao, o.plataforma, !!o.pago, lex);
    const txt = JSON.stringify(m, null, 2) + "\n";
    if (o.saida) { fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true }); fs.writeFileSync(o.saida, txt); console.log(`✔ manifesto em ${o.saida} — responda true/false em cada chave (null = não sei)`); }
    else process.stdout.write(txt);
    return;
  }

  let texto = "", nomePeca = "peça", linhasConfiaveis = true;
  if (o.texto !== undefined && o.texto !== true) { texto = String(o.texto); nomePeca = "texto"; }
  else if (cmd) {
    if (!fs.existsSync(cmd)) morrer(`não achei ${cmd}`);
    if (fs.statSync(cmd).isDirectory()) morrer(`${cmd} é uma pasta`, "aponte o arquivo da peça (.md, .txt ou .html)");
    texto = extrairTexto(cmd); nomePeca = path.basename(cmd);
    linhasConfiaveis = !/\.html?$/i.test(cmd);
  } else morrer("faltou a peça", "node scripts/publicidade.js <arquivo> --profissao dentista   ou   --texto \"...\"");

  if (!o.profissao) morrer("faltou --profissao", "dentista, medico, advogado, psicologo, corretor");

  let checklist = {};
  if (o.checklist) {
    if (!fs.existsSync(o.checklist)) morrer(`não achei o manifesto ${o.checklist}`);
    try { checklist = JSON.parse(fs.readFileSync(o.checklist, "utf8")); }
    catch (e) { morrer(`manifesto inválido: ${e.message}`); }
    for (const k of Object.keys(checklist)) if (k.startsWith("_")) delete checklist[k];
  }

  const res = analisar({ texto, profissao: o.profissao, plataforma: o.plataforma, pago: !!o.pago, checklist, lexico: lex, linhasConfiaveis });

  if (o.json) { console.log(JSON.stringify(res, null, 2)); }
  else {
    const md = laudo(res, { nomePeca, profissao: o.profissao });
    if (o.saida) {
      fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
      fs.writeFileSync(o.saida, md);
      console.log(`✔ laudo em ${o.saida}`);
    } else process.stdout.write(md + "\n");
  }

  const { alta = 0, media = 0 } = res.resumo;
  const linha = `${alta} alta, ${media} média, ${res.resumo.aviso || 0} aviso, ${res.pendentes.length} pendência(s) do checklist`;
  if (!res.coberto) console.error(`⚠ profissão "${o.profissao}" fora do léxico: só CDC e plataforma foram conferidos`);
  if (res.plataforma_nao_reconhecida) console.error(`⚠ plataforma "${res.plataforma_pedida}" não está no léxico: nenhuma regra de plataforma entrou (use instagram, meta-ads, site ou --pago)`);
  if (res.texto_vazio) console.error("⚠ a peça não tem texto: só o checklist declarado foi conferido");
  if (res.permitidos.some((p) => p.barrado_pelo_conselho)) console.error("⚠ algo que a plataforma libera está barrado pelo conselho: vale o conselho");
  if (!linhasConfiaveis) console.error("⚠ peça em HTML: os números de linha são do texto extraído, não do arquivo");
  if (alta + media > 0) { console.error(`✖ ${linha}`); process.exit(1); }
  console.error(`✔ ${linha}`);
}

module.exports = { carregarLexico, resolverConselho, resolverPlataforma, extrairTexto, normalizar, analisar, manifesto, laudo, LEXICO_PADRAO };

if (require.main === module) main();
