#!/usr/bin/env node
/**
 * Contex OS — leitor-frio.js
 * Mede a peça antes da leitura fria e cruza as respostas dos leitores depois.
 *
 * Existe porque leitura fria sem número vira troca de opinião. Cinco leitores
 * dizem "ficou confuso", o dono discorda, e ninguém sai do lugar. Quatro coisas
 * dessa discussão se contam no arquivo: quantas palavras a pessoa atravessa
 * antes de achar o que clicar, em que ponto do texto o preço aparece (se
 * aparecer), quanto tempo a peça inteira leva e o que cabe nos cinco segundos
 * de atenção que o leitor de celular dá. Contado, o assunto muda: deixa de ser
 * gosto e passa a ser distância.
 *
 * Depois da leitura, o `cruzar` faz o trabalho que ninguém faz à mão: junta as
 * respostas, acha a frase em que dois ou mais leitores travaram no mesmo ponto
 * e confere que cada citação existe mesmo na peça. Tropeço de um leitor é
 * gosto; de dois é defeito.
 *
 * Uso:
 *   node scripts/leitor-frio.js medir <peca.md|.html|.txt> [--cta "texto"]
 *   node scripts/leitor-frio.js cruzar <respostas.json> [--peca <arquivo>] [--preco 1497]
 *   node scripts/leitor-frio.js molde
 *
 * Opções:
 *   --cta "<texto>"   qual é o CTA de verdade, quando o léxico erra ou não acha
 *   --preco <valor>   preço real da oferta, pra medir o buraco até o que o leitor achou
 *   --wpm <n>         velocidade de leitura (padrão 238)
 *   --json            saída em JSON, pra outro script ler
 *
 * A régua de 238 palavras por minuto é a média de leitura silenciosa de prosa
 * informativa em adultos, da meta-análise de 190 estudos de Brysbaert (2019),
 * Journal of Memory and Language — https://biblio.ugent.be/publication/8647789
 * (conferido em 22/09/2026). É dado de inglês: serve de ordem de grandeza, não
 * de medida fina do português. Os cinco segundos vêm dela: 238 ÷ 60 × 5 ≈ 20
 * palavras.
 *
 * Sai com código 1 quando a peça não tem CTA nenhum, quando ela é curta demais
 * pra medir, e no `cruzar` quando um leitor citou frase que não está na peça
 * (citação inventada derruba a leitura inteira). Aviso — preço que não aparece,
 * falta do leitor apressado, frase longa — não derruba o código de saída.
 *
 * Formato do arquivo de respostas (o molde sai de `node scripts/leitor-frio.js molde`):
 *   {
 *     "peca": "propostas/padaria-2026-09-22.md",
 *     "conferido_em": "2026-09-22",
 *     "preco_real": "R$ 1.480,00",
 *     "leitores": [
 *       {
 *         "nome": "apressado no celular",
 *         "entendi_em_5s": "acho que é serviço de consultoria, não sei de quê",
 *         "onde_parei": [ { "frase": "escopo modular de implantação", "por_que": "não sei o que é isso" } ],
 *         "achei_que_custava": "R$ 500",
 *         "duvida_que_sobrou": "quanto tempo leva",
 *         "o_que_eu_faria": "fechava a aba"
 *       }
 *     ]
 *   }
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const WPM_PADRAO = 238;
const SEGUNDOS_DE_ATENCAO = 5;

// ─────────────────────────── léxicos ───────────────────────────
// Contam menção, não intenção: o comando imprime o trecho que acusou pra quem
// lê julgar. Ampliar aqui é barato, e é o que se faz quando o negócio usa outra
// palavra pro mesmo gesto.

/** O que convida a agir. Verbo de ação, canal e o link ou botão do HTML. */
const MARCA_CTA = [
  "CTAAQUI", "fale com", "fala com", "falar com", "entre em contato", "chama no",
  "chame no", "me chama", "nos chame", "whatsapp", "wa.me", "clique", "clica aqui",
  "peca seu", "peca o", "pedir orcamento", "solicite", "solicitar", "agende",
  "agendar", "marque", "marcar sua", "reserve", "reservar", "compre", "comprar agora",
  "assine", "assinar", "quero", "baixe", "baixar o", "preencha", "cadastre",
  "inscreva", "responda esse", "responda este", "me manda", "manda um",
];

/**
 * Preço e condição comercial. "valor" solto ficou fora de propósito: "o valor
 * que isso te devolve" é promessa, não preço, e acusá-la inverteria a medida.
 */
const MARCA_PRECO = [
  "r$", "preco", "precos", "investimento", "mensalidade", "quanto custa",
  "quanto fica", "custo de", "a partir de", "parcela", "parcelado", "parcelamos",
  "entrada de", "sai por", "fica em", "fica por", "tabela de preco",
  "orcamento a partir",
];

// ─────────────────────────── utilidades ───────────────────────────

/** Plural sem gambiarra no relatório: "1 palavra", "2 palavras". */
function plural(q, um, muitos) {
  return `${q} ${q === 1 ? um : muitos}`;
}

/**
 * Lê o arquivo ou morre em português. Pasta passada no lugar de arquivo
 * derrubava o comando com pilha de erro do Node na cara do usuário.
 */
function lerArquivo(caminho, oQueE) {
  if (!fs.existsSync(caminho)) morrer(`não achei ${caminho}`, `Confira o caminho d${oQueE === "a peça" ? "a peça" : "o arquivo"}.`);
  if (!fs.statSync(caminho).isFile()) morrer(`${caminho} é uma pasta, não ${oQueE}`, "Passe o caminho do arquivo.");
  try {
    return fs.readFileSync(caminho, "utf8").replace(/^﻿/, "");
  } catch (e) {
    return morrer(`não consegui ler ${caminho}: ${e.message}`);
  }
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function n(s) {
  return br.semAcento(String(s || "")).replace(/\s+/g, " ").trim();
}

/**
 * Reduz a frase ao esqueleto comparável: sem acento, sem pontuação, sem espaço
 * dobrado. Os dois lados da conferência de citação passam por aqui, e é por isso
 * que precisam ser a mesma função. Quando não eram, "acoplar o fluxo - de caixa"
 * virava espaço duplo e a citação legítima era acusada de inventada.
 */
function esqueleto(s) {
  return n(s).replace(/[^0-9a-z ]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Decide se uma abertura de <a> é convite a agir ou só navegação. Marcar todo
 * link como CTA era pior que não marcar nenhum: o primeiro <a> de uma landing
 * costuma ser o logotipo ou o menu, e o comando saía dizendo que o convite
 * estava na palavra 2. Aqui entram três casos que quase nunca erram: botão
 * declarado na classe, canal direto de conversa e formulário de contato.
 */
function ancoraEhConvite(tag) {
  const t = n(tag);
  if (/class\s*=\s*["'][^"']*\b(cta|btn|button|botao|whats|comprar|assinar)\b/.test(t)) return true;
  if (/href\s*=\s*["']?\s*(tel:|mailto:|sms:)/.test(t)) return true;
  if (/(wa\.me|api\.whatsapp|whatsapp\.com|calendly|cal\.com|checkout|pagar\.me|mpago|forms\.gle|docs\.google\.com\/forms|typeform)/.test(t)) return true;
  return false;
}

/** Corta a marcação e devolve a prosa que o leitor de verdade atravessa. */
function prosa(bruto) {
  let t = String(bruto || "");
  // Botão do HTML é convite mesmo sem verbo dentro. Link só quando a tag diz
  // que é botão ou aponta pra canal de conversa, compra ou agenda; o resto é
  // navegação, e o texto do link continua na prosa pro léxico julgar.
  t = t.replace(/<a\b[^>]*>/gi, (tag) => (ancoraEhConvite(tag) ? " CTAAQUI " : " "));
  t = t.replace(/<button\b[^>]*>/gi, " CTAAQUI ");
  return t
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, "")
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|td|tr|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_`#>|]/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function palavrasDe(s) {
  return String(s || "").split(/\s+/).filter((p) => /[0-9A-Za-zÀ-ÿ]/.test(p));
}

/**
 * Acha a primeira marca do léxico e devolve em que palavra ela cai. O índice é
 * em palavras, não em caracteres: é assim que se compara peça curta com longa.
 */
function primeiraMarca(texto, lista) {
  const plano = n(texto);
  let melhor = null;
  for (const marca of lista) {
    const alvo = n(marca);
    if (!alvo) continue;
    const at = plano.indexOf(alvo);
    if (at < 0) continue;
    if (!melhor || at < melhor.at) melhor = { at, marca };
  }
  if (!melhor) return null;
  const antes = palavrasDe(plano.slice(0, melhor.at)).length;
  return {
    marca: melhor.marca === "CTAAQUI" ? "link ou botão" : melhor.marca,
    palavra: antes + 1,
    // O trecho sai do texto de verdade, com acento e maiúscula. Antes saía da
    // versão achatada da comparação, e o usuário via o próprio texto
    // desfigurado num relatório que pede citação exata.
    trecho: trechoOriginal(texto, antes),
  };
}

/**
 * Devolve as palavras em volta da marca, do texto como ele é, cortando em
 * palavra inteira. Recebe quantas palavras vêm antes da marca porque o índice
 * em caracteres da versão achatada não serve pro texto original.
 */
function trechoOriginal(texto, palavrasAntes, janela = 12) {
  const ps = palavrasDe(String(texto || "").replace(/\s+/g, " "));
  const de = Math.max(0, palavrasAntes - janela);
  const ate = Math.min(ps.length, palavrasAntes + janela);
  const corpo = ps.slice(de, ate).join(" ").replace(/CTAAQUI/g, "[botão]");
  return `${de > 0 ? "…" : ""}${corpo}${ate < ps.length ? "…" : ""}`;
}

function frasesDe(p) {
  return p
    .split(/(?<=[.!?…])\s+|\n{2,}/)
    .map((f) => f.trim())
    .filter((f) => palavrasDe(f).length >= 3);
}

function tempoDeLeitura(palavras, wpm) {
  const seg = Math.round((palavras / wpm) * 60);
  if (seg < 60) return { segundos: seg, texto: `${seg} s` };
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return { segundos: seg, texto: s ? `${m} min ${s} s` : `${m} min` };
}

// ─────────────────────────── medir ───────────────────────────

/**
 * Quatro medidas na peça: o que cabe em cinco segundos, quantas palavras até o
 * primeiro convite a agir, onde o preço aparece e quanto a leitura toda leva.
 * Mais os obstáculos que se contam: frase longa e parágrafo grande.
 */
function medir(bruto, opcoes = {}) {
  const wpm = opcoes.wpm || WPM_PADRAO;
  const p = prosa(bruto);
  const palavras = palavrasDe(p);
  const total = palavras.length;

  const quantasEm5s = Math.round((wpm / 60) * SEGUNDOS_DE_ATENCAO);
  const cincoSegundos = {
    palavras: Math.min(quantasEm5s, total),
    trecho: palavras.slice(0, quantasEm5s).join(" ").replace(/CTAAQUI/g, "[botão]"),
  };

  const lexicoCta = opcoes.cta ? [opcoes.cta, ...MARCA_CTA] : MARCA_CTA;
  const cta = primeiraMarca(p, lexicoCta);
  const preco = primeiraMarca(p, MARCA_PRECO);

  const frases = frasesDe(p);
  const longas = frases
    .map((f) => ({ palavras: palavrasDe(f).length, trecho: f.slice(0, 90) }))
    .filter((f) => f.palavras > 30)
    .sort((a, b) => b.palavras - a.palavras);

  const paragrafos = p.split(/\n{2,}/).map((x) => ({ palavras: palavrasDe(x).length, trecho: x.slice(0, 70) }));
  const paragrafoMaior = paragrafos.sort((a, b) => b.palavras - a.palavras)[0] || { palavras: 0, trecho: "" };

  return {
    arquivo: opcoes.arquivo || null,
    wpm,
    palavras: total,
    frases: frases.length,
    tempo: tempoDeLeitura(total, wpm),
    cincoSegundos,
    cta: cta ? { ...cta, pct: total ? Math.round((cta.palavra / total) * 100) : 0 } : null,
    preco: preco ? { ...preco, pct: total ? Math.round((preco.palavra / total) * 100) : 0 } : null,
    frasesLongas: longas.slice(0, 3),
    paragrafoMaior,
  };
}

function imprimirMedida(r) {
  let duro = 0;
  console.log(`\nLEITURA FRIA — medida da peça: ${r.arquivo || "(entrada)"}`);
  console.log(`  ${plural(r.palavras, "palavra", "palavras")} · ${plural(r.frases, "frase", "frases")} · ${r.tempo.texto} de leitura a ${r.wpm} palavras por minuto`);

  if (r.palavras < 40) {
    console.error(`\n✖ só ${plural(r.palavras, "palavra", "palavras")} de prosa: curto demais pra medir distância`);
    console.error(`  Se a peça é uma imagem ou um PDF, salve o texto num .txt antes de medir.`);
    return 1;
  }

  console.log(`\nO que cabe nos ${SEGUNDOS_DE_ATENCAO} segundos de atenção (${plural(r.cincoSegundos.palavras, "palavra", "palavras")}):`);
  console.log(`  "${r.cincoSegundos.trecho}"`);
  console.log(`  → é só isso que o leitor apressado leva. Se o que a peça faz não está aí, ele não soube.`);

  if (r.cta) {
    const quando = tempoDeLeitura(r.cta.palavra, r.wpm);
    console.log(`\n✓ primeiro convite a agir na palavra ${r.cta.palavra} de ${r.palavras} (${r.cta.pct}% do texto, ~${quando.texto} de leitura)`);
    console.log(`  achou por "${r.cta.marca}": ${r.cta.trecho}`);
    if (r.cta.palavra > quantasDeAtencao(r.wpm) * 6) {
      console.log(`  ⚠ mais de 30 segundos de leitura antes do primeiro convite. Em peça de celular, é tarde.`);
    }
  } else {
    console.error(`\n✖ nenhum convite a agir na peça`);
    console.error(`  O léxico procurou verbo de ação, canal e link ou botão. Se o CTA usa outra palavra, rode com --cta "a frase".`);
    duro = 1;
  }

  if (r.preco) {
    console.log(`\n✓ preço aparece na palavra ${r.preco.palavra} de ${r.palavras} (${r.preco.pct}% do texto)`);
    console.log(`  achou por "${r.preco.marca}": ${r.preco.trecho}`);
    if (r.preco.pct > 70) console.log(`  ⚠ preço nos últimos 30% da peça: quem quer saber quanto custa já rolou muito.`);
  } else {
    console.log(`\n⚠ preço não aparece em lugar nenhum da peça`);
    console.log(`  Às vezes é decisão (bio, e-mail de relacionamento). Na proposta e na página de venda, é onde o leitor desiste.`);
  }

  if (r.frasesLongas.length) {
    console.log(`\n⚠ ${plural(r.frasesLongas.length, "frase", "frases")} acima de 30 palavras, obstáculo no celular:`);
    for (const f of r.frasesLongas) console.log(`  ${plural(f.palavras, "palavra", "palavras")}: "${f.trecho}…"`);
  }
  if (r.paragrafoMaior.palavras > 120) {
    console.log(`\n⚠ maior parágrafo com ${r.paragrafoMaior.palavras} palavras: "${r.paragrafoMaior.trecho}…"`);
  }

  console.log(`\n  Essas medidas dizem distância, não qualidade. Quem julga o texto é o leitor frio.\n`);
  return duro;
}

function quantasDeAtencao(wpm) {
  return Math.round((wpm / 60) * SEGUNDOS_DE_ATENCAO);
}

// ─────────────────────────── cruzar ───────────────────────────

const MOLDE_RESPOSTAS = {
  peca: "propostas/padaria-2026-09-22.md",
  conferido_em: "2026-09-22",
  preco_real: "R$ 1.480,00",
  leitores: [
    {
      nome: "apressado no celular",
      entendi_em_5s: "algo de consultoria, não entendi de quê",
      onde_parei: [
        { frase: "escopo modular de implantação", por_que: "não sei o que é isso" },
      ],
      achei_que_custava: "R$ 500",
      duvida_que_sobrou: "quanto tempo leva pra ficar pronto",
      o_que_eu_faria: "fechava a aba",
    },
    {
      nome: "dona de padaria, desconfiada de serviço de fora",
      entendi_em_5s: "que vão mexer no meu caixa",
      onde_parei: [
        { frase: "escopo modular de implantação", por_que: "parece coisa de empresa grande" },
      ],
      achei_que_custava: "R$ 3.000",
      duvida_que_sobrou: "quem vai fazer, e se eu preciso parar a loja",
      o_que_eu_faria: "pedia pro meu contador olhar",
    },
  ],
};

/**
 * Cruza as respostas: agrupa o tropeço pela frase citada, guarda quem caiu nela
 * e confere que a citação existe na peça. Dois leitores no mesmo ponto é
 * defeito da peça; um é gosto de um leitor.
 */
function cruzar(respostas, textoDaPeca) {
  const leitores = Array.isArray(respostas.leitores) ? respostas.leitores : [];
  const avisos = [];
  const duros = [];

  if (!leitores.length) duros.push("o arquivo de respostas não tem leitor nenhum em \"leitores\"");
  if (leitores.length === 1) avisos.push("só 1 leitor: sem cruzamento possível, tudo que aparecer é gosto de um");
  if (leitores.length === 2) avisos.push("com 2 leitores a leitura vale menos, e isso precisa estar escrito no arquivo de saída");
  if (leitores.length > 5) avisos.push(`${leitores.length} leitores: acima de 5 a leitura se repete e o arquivo incha sem ganhar nada`);
  if (leitores.length && !leitores.some((l) => n(l.nome).includes("apressado"))) {
    avisos.push('nenhum leitor com "apressado" no nome — o apressado no celular é obrigatório');
  }

  const pecaEsqueleto = textoDaPeca === null ? null : esqueleto(textoDaPeca);
  const grupos = new Map();
  for (const l of leitores) {
    const nome = l.nome || "(sem nome)";
    // Resposta vazia nas perguntas de abertura e de fecho é o rastro de ficha
    // preenchida à mão, sem leitor nenhum ter lido a peça.
    if (!l.entendi_em_5s || !l.o_que_eu_faria) {
      avisos.push(`"${nome}" está sem a resposta 1 ou a resposta 5 — leitura incompleta, confira se esse leitor rodou de verdade`);
    }
    const paradas = Array.isArray(l.onde_parei) ? l.onde_parei : [];
    if (!paradas.length) avisos.push(`"${nome}" não citou onde parou — resposta sem frase não entra no cruzamento`);
    for (const parada of paradas) {
      const frase = String(parada.frase || "").trim();
      if (!frase) { avisos.push(`"${nome}" tem parada sem frase`); continue; }
      const chave = esqueleto(frase);
      if (!chave) { avisos.push(`"${nome}" citou uma parada sem palavra nenhuma`); continue; }
      if (!grupos.has(chave)) grupos.set(chave, { frase, leitores: [], porques: [], naPeca: null });
      const g = grupos.get(chave);
      if (!g.leitores.includes(nome)) g.leitores.push(nome);
      if (parada.por_que) g.porques.push(`${nome}: ${parada.por_que}`);
      if (pecaEsqueleto !== null && g.naPeca === null) {
        g.naPeca = pecaEsqueleto.includes(chave);
        if (!g.naPeca) duros.push(`"${frase}" não existe na peça — citação inventada, essa resposta não vale`);
      }
    }
  }

  // Citação que não está na peça sai do relatório. Correção escrita em cima de
  // frase inventada piora a peça, então ela não pode contar pro limiar de dois.
  const todos = [...grupos.values()].sort((a, b) => b.leitores.length - a.leitores.length);
  const inventados = todos.filter((t) => t.naPeca === false);
  const tropecos = todos.filter((t) => t.naPeca !== false);

  // Buraco de preço: o que o leitor achou contra o que a peça cobra.
  const real = respostas.preco_real ? br.numero(respostas.preco_real) : null;
  const todosOsChutes = leitores
    .filter((l) => l.achei_que_custava)
    .map((l) => ({ nome: l.nome, texto: l.achei_que_custava, valor: br.numero(l.achei_que_custava) }));
  const chutes = todosOsChutes.filter((c) => Number.isFinite(c.valor) && c.valor > 0);
  for (const c of todosOsChutes) {
    if (!chutes.includes(c)) {
      avisos.push(`"${c.nome}" respondeu "${c.texto}" no preço: não dá número, então fica fora da conta. No relatório entra como resposta, não como chute`);
    }
  }
  for (const l of leitores) {
    if (!l.achei_que_custava) avisos.push(`"${l.nome}" está sem a resposta de preço`);
  }
  const preco = { real, chutes, menor: null, maior: null };
  if (chutes.length) {
    const vs = chutes.map((c) => c.valor).sort((a, b) => a - b);
    preco.menor = vs[0];
    preco.maior = vs[vs.length - 1];
    if (Number.isFinite(real) && real > 0) {
      for (const c of chutes) c.buraco = Math.round(((c.valor - real) / real) * 100);
    }
  }

  return {
    peca: respostas.peca || null,
    leitores: leitores.length,
    tropecos,
    confirmados: tropecos.filter((t) => t.leitores.length >= 2),
    inventados,
    preco,
    avisos,
    duros,
  };
}

function imprimirCruzamento(r) {
  console.log(`\nLEITURA FRIA — cruzamento: ${r.peca || "(peça não informada)"}`);
  console.log(`  ${plural(r.leitores, "leitor", "leitores")} · ${plural(r.tropecos.length, "ponto citado", "pontos citados")} · ${plural(r.confirmados.length, "confirmado", "confirmados")} por 2 leitores ou mais`);

  if (r.confirmados.length) {
    console.log(`\nTropeço confirmado (2+ leitores no mesmo ponto):`);
    for (const t of r.confirmados) {
      console.log(`\n  "${t.frase}"  — ${t.leitores.length} leitores: ${t.leitores.join(", ")}`);
      for (const p of t.porques) console.log(`    · ${p}`);
    }
  } else if (r.leitores >= 2) {
    console.log(`\n  Nenhum ponto pegou 2 leitores. Ou a peça está clara, ou os leitores foram parecidos demais.`);
  }

  const soUm = r.tropecos.filter((t) => t.leitores.length === 1);
  if (soUm.length) {
    console.log(`\nCitado por um só leitor (não vira correção, vira nota):`);
    for (const t of soUm) console.log(`  "${t.frase}" — ${t.leitores[0]}`);
  }

  if (r.inventados.length) {
    console.log(`\nFora do relatório, por citação que não está na peça:`);
    for (const t of r.inventados) console.log(`  "${t.frase}" — ${t.leitores.join(", ")}`);
  }

  if (r.preco.chutes.length) {
    console.log(`\nO que acharam que custava:`);
    for (const c of r.preco.chutes) {
      const buraco = c.buraco === undefined ? "" : ` (${c.buraco > 0 ? "+" : ""}${c.buraco}% do preço real)`;
      console.log(`  ${c.nome}: ${br.reais(c.valor)}${buraco}`);
    }
    if (r.preco.menor !== r.preco.maior) {
      const abertura = Math.round((r.preco.maior / r.preco.menor) * 10) / 10;
      console.log(`  → o chute mais alto é ${String(abertura).replace(".", ",")}× o mais baixo. Abertura grande significa que a peça não ancora preço.`);
    }
    if (Number.isFinite(r.preco.real)) console.log(`  → preço real: ${br.reais(r.preco.real)}`);
  }

  for (const a of r.avisos) console.log(`\n⚠ ${a}`);
  for (const d of r.duros) console.error(`\n✖ ${d}`);
  console.log("");
  return r.duros.length ? 1 : 0;
}

// ─────────────────────────── linha de comando ───────────────────────────

function main() {
  const args = process.argv.slice(2);
  const livres = [];
  let cta = null, precoArg = null, pecaArg = null, wpm = WPM_PADRAO, json = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--cta") cta = args[++i];
    else if (a === "--preco") precoArg = args[++i];
    else if (a === "--peca") pecaArg = args[++i];
    else if (a === "--wpm") {
      const v = Number(args[++i]);
      if (!Number.isFinite(v) || v < 60 || v > 1000) {
        morrer(`--wpm ${v} não serve`, "Use um número entre 60 e 1000. O padrão é 238, a média de leitura silenciosa de adulto.");
      }
      wpm = v;
    }
    else if (a === "--json") json = true;
    else livres.push(a);
  }

  const comando = livres[0];
  if (!comando || comando === "--ajuda" || comando === "-h") {
    console.log(`
Contex OS — leitor-frio.js

  node scripts/leitor-frio.js medir <peca.md|.html|.txt> [--cta "texto"] [--wpm 238]
  node scripts/leitor-frio.js cruzar <respostas.json> [--peca <arquivo>] [--preco 1480]
  node scripts/leitor-frio.js molde

Sai com erro quando a peça não tem convite a agir, quando ela é curta demais pra
medir, e quando um leitor citou frase que não está na peça.
`);
    process.exit(0);
  }

  if (comando === "molde") {
    console.log(JSON.stringify(MOLDE_RESPOSTAS, null, 2));
    process.exit(0);
  }

  if (comando === "medir") {
    const arquivo = livres[1];
    if (!arquivo) morrer("falta a peça", 'node scripts/leitor-frio.js medir propostas/padaria-2026-09-22.md');
    const bruto = lerArquivo(arquivo, "a peça");
    const r = medir(bruto, { arquivo, cta, wpm });
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    process.exit(imprimirMedida(r));
  }

  if (comando === "cruzar") {
    const arquivo = livres[1];
    if (!arquivo) morrer("falta o arquivo de respostas", "node scripts/leitor-frio.js cruzar revisoes/leitura-fria-padaria.json");
    const cru = lerArquivo(arquivo, "o arquivo de respostas");
    let respostas;
    try {
      respostas = JSON.parse(cru);
      if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) throw new Error("o arquivo tem que ser um objeto com a chave \"leitores\"");
    } catch (e) {
      morrer(`${path.basename(arquivo)} não é JSON válido: ${e.message}`, "node scripts/leitor-frio.js molde mostra o formato.");
    }
    if (precoArg) respostas.preco_real = precoArg;

    const declarado = pecaArg || respostas.peca;
    // Primeiro do jeito que está escrito, depois ao lado do arquivo de
    // respostas: o JSON mora em revisoes/ e o caminho dentro dele costuma ser
    // relativo à raiz do projeto, mas nem sempre é de lá que se roda.
    const candidatos = declarado
      ? [declarado, path.resolve(path.dirname(arquivo), declarado)]
      : [];
    const caminhoPeca = candidatos.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || declarado;
    let textoDaPeca = null;
    if (declarado && candidatos.some((c) => fs.existsSync(c) && fs.statSync(c).isFile())) {
      textoDaPeca = prosa(lerArquivo(caminhoPeca, "a peça"));
      // O cabeçalho mostra o arquivo que foi lido de verdade, não o que estava
      // escrito no JSON, senão --peca some do relatório.
      respostas.peca = caminhoPeca;
    } else if (declarado) {
      console.error(`\n  Aviso: não achei a peça ${caminhoPeca} — as citações não foram conferidas contra o texto.`);
    } else {
      console.error(`\n  Aviso: sem a peça, as citações não foram conferidas. Rode com --peca <arquivo>.`);
    }

    const r = cruzar(respostas, textoDaPeca);
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(r.duros.length ? 1 : 0); }
    process.exit(imprimirCruzamento(r));
  }

  morrer(`não conheço o comando "${comando}"`, "Comandos: medir, cruzar, molde.");
}

module.exports = {
  prosa, esqueleto, palavrasDe, primeiraMarca, trechoOriginal, tempoDeLeitura,
  medir, cruzar, plural, ancoraEhConvite, MOLDE_RESPOSTAS, MARCA_CTA, MARCA_PRECO,
};

if (require.main === module) main();
