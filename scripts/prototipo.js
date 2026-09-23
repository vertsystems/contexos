#!/usr/bin/env node
/**
 * Contex OS — prototipo.js
 * Monta o protótipo descartável num HTML só, e confere o fluxo antes de gerar.
 *
 * Existe porque protótipo feito à mão falha de três formas que a leitura não
 * pega: um botão que aponta pra uma tela que não existe, uma tela que ninguém
 * alcança pelo caminho de verdade, e uma tela sem saída, onde quem está
 * clicando acha que travou e para de responder. No ramo visual a falha é
 * outra: a variação mais bonita é a que tem texto ilegível no celular.
 *
 * Uso:
 *   node scripts/prototipo.js conferir  <arquivo.json>
 *   node scripts/prototipo.js fluxo     <fluxo.json>  [saida.html]
 *   node scripts/prototipo.js visual    <visual.json> [saida.html]
 *   node scripts/prototipo.js conclusao <arquivo.json> [saida.md]
 *
 * Opções:
 *   --abrir     abre o arquivo gerado no navegador do sistema
 *   --forcar    gera o HTML mesmo com problema apontado (só pra depurar)
 *
 * Node 18+, sem dependência de npm. Usa ./br.js pra data.
 * A fórmula de contraste é a mesma do verificar.js, copiada porque ele não exporta nada.
 */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const br = require("./br.js");

// ─────────────────────────── saída no terminal ───────────────────────────

const ok = (m) => console.log(`  ✓ ${m}`);
const info = (m) => console.log(`  · ${m}`);

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

// ─────────────────────────── leitura do spec ───────────────────────────

function lerSpec(arquivo) {
  if (!arquivo) morrer("falta o arquivo de spec.", "Ex.: node scripts/prototipo.js conferir prototipo/pedido/fluxo.json");
  if (!fs.existsSync(arquivo)) morrer(`não achei "${arquivo}".`, "O spec é um .json escrito antes de gerar o HTML.");
  let bruto = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  try {
    return JSON.parse(bruto);
  } catch (e) {
    morrer(`o JSON de "${arquivo}" está quebrado: ${e.message}`, "Vírgula sobrando no fim da lista é a causa mais comum.");
  }
}

function tipoDe(spec) {
  if (Array.isArray(spec.estados)) return "fluxo";
  if (Array.isArray(spec.variacoes)) return "visual";
  return null;
}

// ─────────────────────────── contraste (mesma fórmula do verificar.js) ───────────────────────────

function lum(hex) {
  const h = String(hex ?? "").replace("#", "").trim();
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

// ─────────────────────────── markup: o arquivo tem que ser um só ───────────────────────────

/**
 * O protótipo é um HTML só, que abre com dois cliques na máquina de quem não
 * programa. Referência de fora quebra essa promessa em silêncio: a pessoa abre
 * sem internet, ou recebe por e-mail, e vê caixa vazia onde era a foto do
 * produto. `verificar.js html` pega CSS externo, não pega imagem nem @import.
 */
function conferirMarkup(html, onde, problemas, avisos) {
  if (!html) return;
  const fora = [];
  for (const m of html.matchAll(/\b(?:src|srcset)\s*=\s*["']([^"']+)["']/gi)) {
    if (!/^(data:|#)/i.test(m[1].trim())) fora.push(m[1].trim());
  }
  for (const m of html.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) fora.push(m[1].trim());
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    if (!/^data:/i.test(m[1].trim())) fora.push(m[1].trim());
  }
  if (/@import\b/i.test(html)) fora.push("@import");
  if (fora.length) {
    const lista = [...new Set(fora)].slice(0, 4).join(", ");
    problemas.push(`${onde}: referência de fora do arquivo (${lista}) — o protótipo é um HTML só, e quem abrir sem internet vê um buraco. Descreva em texto ou use \`data:\``);
  }
  if (/<(script|iframe|object|embed)\b/i.test(html)) {
    avisos.push(`${onde}: tem <script> ou <iframe> dentro — protótipo pede markup e CSS, não comportamento escondido`);
  }
}

/**
 * Mede os pares de cor de um bloco `cores`. Devolve as medidas e empurra o que
 * reprova pra lista de problemas: cor ilegível não decide nada.
 */
function conferirCores(cores, onde, problemas, avisos) {
  const pares = [];
  if (cores.texto && cores.fundo) pares.push(["texto sobre fundo", cores.texto, cores.fundo]);
  if (cores.textoDestaque && cores.destaque) pares.push(["texto sobre destaque", cores.textoDestaque, cores.destaque]);
  if (cores.sobre && cores.destaque && !cores.textoDestaque) pares.push(["texto sobre destaque", cores.sobre, cores.destaque]);
  if (cores.suave && (cores.papel || cores.fundo)) pares.push(["texto suave sobre papel", cores.suave, cores.papel || cores.fundo]);

  for (const v of Object.values(cores)) {
    if (typeof v === "string" && /^#[0-9a-f]{8}$/i.test(v.trim())) {
      avisos.push(`${onde}: "${v}" tem transparência (8 dígitos) — a medida ignora o canal alfa, então o contraste real na tela é menor`);
    }
  }

  const medidas = [];
  for (const [nome, a, b] of pares) {
    let r;
    try { r = razao(a, b); } catch (e) { problemas.push(`${onde}: ${e.message}`); continue; }
    medidas.push({ nome, a, b, razao: r });
    if (r < 4.5) problemas.push(`${onde}: ${nome} dá ${r.toFixed(2)}:1 — reprova no WCAG AA, que pede 4.5:1`);
  }
  return { pares, medidas };
}

// ─────────────────────────── conferência do fluxo ───────────────────────────

/**
 * Confere o desenho do fluxo: destino que não existe, estado que ninguém
 * alcança, beco sem saída e fim que não existe. Devolve listas, não imprime.
 */
function conferirFluxo(spec) {
  const problemas = [];
  const avisos = [];
  const estados = Array.isArray(spec.estados) ? spec.estados : [];

  if (!spec.pergunta) problemas.push("falta a `pergunta`: protótipo sem pergunta não tem como terminar em decisão");
  const perguntas = Array.isArray(spec.perguntas) ? spec.perguntas.filter(Boolean) : [];
  if (perguntas.length !== 3) {
    problemas.push(`\`perguntas\` precisa ter exatamente 3 (tem ${perguntas.length}): são as perguntas a fazer enquanto a pessoa clica`);
  }
  if (!estados.length) problemas.push("nenhum estado em `estados`");

  const ids = new Map();
  for (const e of estados) {
    if (!e.id) { problemas.push("estado sem `id`"); continue; }
    if (ids.has(e.id)) problemas.push(`id repetido: "${e.id}"`);
    ids.set(e.id, e);
    if (!e.nome) avisos.push(`estado "${e.id}" sem \`nome\`: vai aparecer o id na tela`);
    if (!e.tela && !e.final) avisos.push(`estado "${e.id}" sem \`tela\`: quem clica vê um card vazio`);
    conferirMarkup(e.tela, `estado "${e.id}"`, problemas, avisos);
  }

  // o painel "o que o sistema sabe agora" imprime texto: objeto virava "[object Object]"
  if (spec.dados && typeof spec.dados === "object") {
    for (const [k, v] of Object.entries(spec.dados)) {
      if (v !== null && typeof v === "object") problemas.push(`\`dados\`: "${k}" guarda lista ou objeto, e o painel imprime "[object Object]". Use texto ou número`);
    }
  }
  for (const e of estados) {
    for (const a of Array.isArray(e.acoes) ? e.acoes : []) {
      if (!a.define || typeof a.define !== "object") continue;
      for (const [k, v] of Object.entries(a.define)) {
        if (v !== null && typeof v === "object") problemas.push(`estado "${e.id}", ação "${a.rotulo || "(sem rótulo)"}": o \`define\` de "${k}" guarda lista ou objeto, e o painel imprime "[object Object]"`);
      }
    }
  }

  // o fluxo também pinta a tela com `cores`, e ninguém media isso
  const medidasCor = conferirCores(spec.cores || {}, "as `cores` do fluxo", problemas, avisos).medidas;

  if (!spec.inicial) problemas.push("falta o `inicial`: por onde a pessoa começa");
  else if (!ids.has(spec.inicial)) problemas.push(`o \`inicial\` aponta pra "${spec.inicial}", que não existe em \`estados\``);

  // ação sem destino, ação sem rótulo, rótulo repetido no mesmo estado
  for (const e of estados) {
    if (!e.id) continue;  // já foi acusado acima; sem id, toda mensagem sairia "undefined"
    const acoes = Array.isArray(e.acoes) ? e.acoes : [];
    const rotulos = new Set();
    for (const a of acoes) {
      const onde = `estado "${e.id}"`;
      if (!a.rotulo) problemas.push(`${onde}: ação sem \`rotulo\` (é o texto do botão)`);
      else if (rotulos.has(a.rotulo)) problemas.push(`${onde}: dois botões com o mesmo texto "${a.rotulo}"`);
      else rotulos.add(a.rotulo);
      if (!a.para) problemas.push(`${onde}: a ação "${a.rotulo || "(sem rótulo)"}" não diz \`para\` onde vai`);
      else if (!ids.has(a.para)) problemas.push(`${onde}: a ação "${a.rotulo || "(sem rótulo)"}" aponta pra "${a.para}", que não existe`);
    }
    if (!acoes.length && !e.final) problemas.push(`beco sem saída: "${e.id}" não tem ação nenhuma e não está marcado como \`"final": true\``);
    if (acoes.length && e.final) avisos.push(`"${e.id}" está marcado como final e ainda tem botão: confirme se o fluxo continua depois do fim`);
  }

  // alcançabilidade a partir do inicial
  if (spec.inicial && ids.has(spec.inicial)) {
    const vistos = new Set([spec.inicial]);
    const fila = [spec.inicial];
    while (fila.length) {
      const atual = ids.get(fila.shift());
      for (const a of Array.isArray(atual.acoes) ? atual.acoes : []) {
        if (a.para && ids.has(a.para) && !vistos.has(a.para)) { vistos.add(a.para); fila.push(a.para); }
      }
    }
    for (const e of estados) {
      if (e.id && !vistos.has(e.id)) problemas.push(`ninguém alcança "${e.id}": nenhum botão leva até lá a partir de "${spec.inicial}"`);
    }
  }

  if (estados.length && !estados.some((e) => e.final)) {
    problemas.push('nenhum estado marcado `"final": true`: o fluxo não tem onde terminar');
  }

  return { problemas, avisos, medidasCor };
}

// ─────────────────────────── conferência do visual ───────────────────────────

/**
 * Confere as variações: quantidade, aposta escrita, fonte do markup e
 * contraste dos pares declarados. Carrega o HTML de cada variação.
 */
function conferirVisual(spec, baseDir) {
  const problemas = [];
  const avisos = [];
  const variacoes = Array.isArray(spec.variacoes) ? spec.variacoes : [];

  if (!spec.pergunta) problemas.push("falta a `pergunta`: sem ela as variações não decidem nada");
  const perguntas = Array.isArray(spec.perguntas) ? spec.perguntas.filter(Boolean) : [];
  if (perguntas.length !== 3) {
    problemas.push(`\`perguntas\` precisa ter exatamente 3 (tem ${perguntas.length})`);
  }
  if (variacoes.length < 3 || variacoes.length > 5) {
    problemas.push(`\`variacoes\` precisa ter de 3 a 5 (tem ${variacoes.length}): menos de 3 é preferência, mais de 5 ninguém compara`);
  }

  const prontas = [];
  const apostas = new Map();
  variacoes.forEach((v, i) => {
    const n = i + 1;
    if (!v.nome) problemas.push(`variação ${n} sem \`nome\``);
    if (!v.aposta) problemas.push(`variação ${n} ("${v.nome || n}") sem \`aposta\`: escreva em uma linha no que ela é diferente`);

    let html = typeof v.html === "string" ? v.html : "";
    if (!html && v.arquivo) {
      const alvo = path.resolve(baseDir, v.arquivo);
      if (!fs.existsSync(alvo)) problemas.push(`variação ${n}: não achei o arquivo "${v.arquivo}"`);
      else html = fs.readFileSync(alvo, "utf8").replace(/^﻿/, "");
    }
    if (!html) problemas.push(`variação ${n}: falta o markup (\`arquivo\` apontando pra um .html, ou \`html\` direto no spec)`);
    const onde = `variação ${n} ("${v.nome || n}")`;
    conferirMarkup(html, onde, problemas, avisos);
    // as 5 versões moram no mesmo arquivo: <style> solto pinta todas as outras
    for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      if (!new RegExp(`#v${n}\\b`).test(m[1])) {
        problemas.push(`${onde}: tem <style> que não começa em \`#v${n}\` — as versões dividem o mesmo arquivo, e essa regra vaza pras outras. Use \`style="..."\` no próprio elemento, ou prefixe tudo com \`#v${n} \``);
      }
    }

    const cores = v.cores || {};
    const { pares, medidas } = conferirCores(cores, onde, problemas, avisos);
    if (!pares.length) problemas.push(`variação ${n}: declare \`cores\` com pelo menos \`texto\` e \`fundo\` pra dar pra conferir o contraste`);

    // duas variações com a mesma aposta são a mesma variação com outra cor
    const chave = String(v.aposta || "").toLowerCase().replace(/[^a-zà-ú0-9 ]/gi, "").replace(/\s+/g, " ").trim();
    if (chave) {
      if (apostas.has(chave)) avisos.push(`variação ${n} repete a aposta da variação ${apostas.get(chave)}: se as duas apostam na mesma coisa, é uma versão com a cor trocada`);
      else apostas.set(chave, n);
    }

    prontas.push({ ...v, n, html, medidas });
  });

  const medidasCor = conferirCores(spec.cores || {}, "as `cores` do casco", problemas, avisos).medidas;

  return { problemas, avisos, variacoes: prontas, medidasCor };
}

// ─────────────────────────── HTML: o casco comum ───────────────────────────

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cssBase(cores = {}) {
  const c = {
    fundo: cores.fundo || "#f7f6f3",
    papel: cores.papel || "#ffffff",
    texto: cores.texto || "#15181c",
    suave: cores.suave || "#5b626d",
    linha: cores.linha || "#e2dfd9",
    destaque: cores.destaque || "#1f5fd0",
    sobre: cores.sobre || "#ffffff",
  };
  return `
:root{--fundo:${c.fundo};--papel:${c.papel};--texto:${c.texto};--suave:${c.suave};--linha:${c.linha};--destaque:${c.destaque};--sobre:${c.sobre}}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--fundo);color:var(--texto);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:0 16px 140px}
.folha{max-width:940px;margin:0 auto}
header.topo{padding:28px 0 8px}
h1{font-size:22px;line-height:1.25;margin:0 0 6px}
.pergunta{font-size:15px;color:var(--suave);margin:0}
.aviso{margin:14px 0 0;padding:10px 12px;border:1px solid var(--linha);border-left:3px solid var(--destaque);background:var(--papel);font-size:13px;color:var(--suave);border-radius:4px}
.cartao{background:var(--papel);border:1px solid var(--linha);border-radius:10px;padding:20px;margin:18px 0}
.rotulo{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--suave);margin:0 0 10px}
button{font:inherit;min-height:44px;padding:11px 16px;border-radius:8px;border:1px solid var(--destaque);background:var(--destaque);color:var(--sobre);cursor:pointer}
button.secundario{background:transparent;color:var(--texto);border-color:var(--linha)}
button:focus-visible{outline:3px solid var(--destaque);outline-offset:2px}
.acoes{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.painel{font-size:14px}
.painel dl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0}
.painel dt{color:var(--suave)}
.painel dd{margin:0;font-variant-numeric:tabular-nums}
.caminho{margin:10px 0 0;font-size:13px;color:var(--suave);word-break:break-word}
.barra{position:fixed;left:0;right:0;bottom:0;background:var(--papel);border-top:1px solid var(--linha);padding:12px 16px;z-index:9}
.barra .folha{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:space-between}
.barra ol{margin:0;padding-left:20px;font-size:13px;color:var(--suave);max-width:560px}
.barra .botoes{display:flex;gap:8px;flex-wrap:wrap}
.barra button{min-height:40px;padding:8px 12px;font-size:14px}
@media (pointer:coarse){button{min-height:48px}}
@media (max-width:640px){body{padding-bottom:210px}h1{font-size:20px}.cartao{padding:16px}}
`.trim();
}

function barraHtml(perguntas, botoes) {
  const itens = (perguntas || []).map((p) => `      <li>${esc(p)}</li>`).join("\n");
  return `<div class="barra"><div class="folha">
    <ol>
${itens}
    </ol>
    <div class="botoes">
${botoes.map((b) => `      ${b}`).join("\n")}
    </div>
  </div></div>`;
}

// ─────────────────────────── HTML: ramo fluxo ───────────────────────────

function gerarFluxoHtml(spec) {
  const titulo = spec.titulo || "Fluxo clicável";
  const json = JSON.stringify(spec, null, 2).replace(/<\//g, "<\\/");
  const runtime = [
    "var SPEC = " + json + ";",
    "var inicio = { id: SPEC.inicial, dados: Object.assign({}, SPEC.dados || {}) };",
    "var atual, dados, caminho, pilha;",
    "function achar(id){for(var i=0;i<SPEC.estados.length;i++){if(SPEC.estados[i].id===id)return SPEC.estados[i];}return null;}",
    "function nomeDe(id){var e=achar(id);return (e&&e.nome)||id;}",
    "function comecar(){atual=inicio.id;dados=Object.assign({},inicio.dados);caminho=[atual];pilha=[];desenhar();}",
    "function ir(acao){pilha.push({id:atual,dados:Object.assign({},dados)});",
    "  if(acao.define){for(var k in acao.define){dados[k]=acao.define[k];}}",
    "  atual=acao.para;caminho.push(atual);desenhar();}",
    "function voltar(){if(!pilha.length)return;var p=pilha.pop();atual=p.id;dados=p.dados;caminho.pop();desenhar();}",
    "function desenhar(){",
    "  var e=achar(atual)||{id:atual,nome:atual};",
    "  document.getElementById('nome').textContent=e.nome||e.id;",
    "  document.getElementById('tela').innerHTML=e.tela||'';",
    "  var alvo=document.getElementById('acoes');alvo.innerHTML='';",
    "  var acoes=e.acoes||[];",
    "  for(var i=0;i<acoes.length;i++){(function(a){",
    "    var b=document.createElement('button');b.textContent=a.rotulo;",
    "    if(a.tom==='secundario')b.className='secundario';",
    "    b.onclick=function(){ir(a);};alvo.appendChild(b);})(acoes[i]);}",
    "  if(!acoes.length){var fim=document.createElement('p');fim.className='caminho';",
    "    fim.textContent='Fim do fluxo. Use \"Começar de novo\" pra rodar outro caminho.';alvo.appendChild(fim);}",
    "  var dl=document.getElementById('estado');dl.innerHTML='';",
    "  var linhas=[['tela atual',e.nome||e.id],['passos dados',String(caminho.length-1)]];",
    "  for(var k in dados){linhas.push([k,String(dados[k])]);}",
    "  for(var j=0;j<linhas.length;j++){",
    "    var dt=document.createElement('dt');dt.textContent=linhas[j][0];",
    "    var dd=document.createElement('dd');dd.textContent=linhas[j][1];",
    "    dl.appendChild(dt);dl.appendChild(dd);}",
    "  var nomes=[];for(var c=0;c<caminho.length;c++){nomes.push(nomeDe(caminho[c]));}",
    "  document.getElementById('caminho').textContent='Caminho: '+nomes.join(' → ');",
    "  document.getElementById('voltar').disabled=!pilha.length;",
    "}",
    "function copiar(){var t=document.getElementById('caminho').textContent;",
    "  try{navigator.clipboard.writeText(t);}catch(err){}",
    "  window.prompt('Copie o caminho pra colar na conclusão:',t);}",
    "document.getElementById('voltar').onclick=voltar;",
    "document.getElementById('recomecar').onclick=comecar;",
    "document.getElementById('copiar').onclick=copiar;",
    "comecar();",
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} — protótipo</title>
<style>
${cssBase(spec.cores)}
</style>
</head>
<body>
<div class="folha">
  <header class="topo">
    <h1>${esc(titulo)}</h1>
    <p class="pergunta">${esc(spec.pergunta || "")}</p>
    <p class="aviso">Isto é um protótipo pra clicar e decidir, não o sistema. Nada aqui é salvo: ao recarregar a página tudo volta ao começo.</p>
  </header>

  <section class="cartao">
    <p class="rotulo">O que a pessoa vê</p>
    <h2 id="nome" style="font-size:18px;margin:0 0 10px"></h2>
    <div id="tela"></div>
    <div class="acoes" id="acoes"></div>
  </section>

  <section class="cartao painel">
    <p class="rotulo">O que o sistema sabe agora</p>
    <dl id="estado"></dl>
    <p class="caminho" id="caminho"></p>
  </section>
</div>

${barraHtml(spec.perguntas, [
  '<button class="secundario" id="voltar">Voltar um passo</button>',
  '<button class="secundario" id="copiar">Copiar o caminho</button>',
  '<button id="recomecar">Começar de novo</button>',
])}

<script>
${runtime}
</script>
</body>
</html>
`;
}

// ─────────────────────────── HTML: ramo visual ───────────────────────────

function gerarVisualHtml(spec, variacoes) {
  const titulo = spec.titulo || "Versões da tela";
  const total = variacoes.length;
  const blocos = variacoes.map((v) => {
    const c = v.cores || {};
    const escopo = `#v${v.n}{--fundo:${c.fundo || "inherit"};--texto:${c.texto || "inherit"};` +
      (c.destaque ? `--destaque:${c.destaque};` : "") + (c.textoDestaque ? `--sobre:${c.textoDestaque};` : "") +
      `background:${c.fundo || "var(--papel)"};color:${c.texto || "var(--texto)"}}`;
    return { escopo, html: `  <section class="versao cartao" id="v${v.n}" hidden>\n    <p class="rotulo">Versão ${v.n} de ${total} — ${esc(v.nome)}</p>\n${v.html}\n  </section>` };
  });
  const seletor = variacoes.map((v) => `      <button class="secundario" data-v="${v.n}">${v.n}. ${esc(v.nome)}</button>`).join("\n");
  const apostas = variacoes.map((v) => `    <p class="aposta" id="aposta${v.n}" hidden><strong>Versão ${v.n}:</strong> ${esc(v.aposta || "")}</p>`).join("\n");

  const runtime = [
    "var TOTAL = " + total + ";",
    "function mostrar(n){",
    "  if(!(n>=1&&n<=TOTAL))n=1;",
    "  for(var i=1;i<=TOTAL;i++){",
    "    document.getElementById('v'+i).hidden=(i!==n);",
    "    document.getElementById('aposta'+i).hidden=(i!==n);",
    "    var b=document.querySelector('[data-v=\"'+i+'\"]');",
    "    if(b)b.setAttribute('aria-current',i===n?'true':'false');",
    "  }",
    "  try{history.replaceState(null,'','?v='+n);}catch(err){}",
    "}",
    "var botoes=document.querySelectorAll('[data-v]');",
    "for(var i=0;i<botoes.length;i++){(function(b){",
    "  b.onclick=function(){mostrar(parseInt(b.getAttribute('data-v'),10));};})(botoes[i]);}",
    "var m=/[?&]v=(\\d+)/.exec(location.search);",
    "mostrar(m?parseInt(m[1],10):1);",
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} — versões da tela</title>
<style>
${cssBase(spec.cores)}
.versao{overflow-wrap:break-word}
.aposta{font-size:13px;color:var(--suave);margin:8px 0 0;max-width:560px}
[aria-current="true"]{border-color:var(--destaque);box-shadow:inset 0 0 0 1px var(--destaque)}
${blocos.map((b) => b.escopo).join("\n")}
</style>
</head>
<body>
<div class="folha">
  <header class="topo">
    <h1>${esc(titulo)}</h1>
    <p class="pergunta">${esc(spec.pergunta || "")}</p>
    <p class="aviso">São ${total} versões da mesma tela, trocáveis pelos botões ou por <code>?v=1</code> até <code>?v=${total}</code>. Nenhuma está construída: o que muda entre elas é a decisão, não o código.</p>
  </header>

${blocos.map((b) => b.html).join("\n\n")}
</div>

<div class="barra"><div class="folha">
  <div>
    <ol>
${(spec.perguntas || []).map((p) => `      <li>${esc(p)}</li>`).join("\n")}
    </ol>
${apostas}
  </div>
  <div class="botoes">
${seletor}
  </div>
</div></div>

<script>
${runtime}
</script>
</body>
</html>
`;
}

// ─────────────────────────── conclusão ───────────────────────────

function gerarConclusao(spec, tipo, hoje = new Date()) {
  const data = br.iso(hoje);
  const titulo = spec.titulo || "Protótipo";
  const ramo = tipo === "fluxo" ? "fluxo clicável" : "versões da tela";
  const linhas = tipo === "fluxo"
    ? (spec.estados || []).map((e) => `| ${e.nome || e.id} | ${e.aposta || "[a confirmar]"} |`)
    : (spec.variacoes || []).map((v, i) => `| ${i + 1}. ${v.nome || "(sem nome)"} | ${v.aposta || "[a confirmar]"} |`);
  const cabeca = tipo === "fluxo" ? "Tela" : "Versão";
  const perguntas = (spec.perguntas || []).map((p, i) => `${i + 1}. ${p}\n   **Resposta:** [preencher ao vivo]`);

  return `# Protótipo — ${titulo}

- **Pergunta que ele responde:** ${spec.pergunta || "[a confirmar]"}
- **Ramo:** ${ramo}
- **Rodou em:** ${data}
- **Quem clicou:** [nome e papel — cliente, sócio, quem vai usar]

## O que foi posto na frente da pessoa

| ${cabeca} | No que ela aposta |
|---|---|
${linhas.join("\n") || "| [a confirmar] | [a confirmar] |"}

## O que a pessoa fez

[o caminho que ela percorreu, onde ela parou, o que ela perguntou em voz alta, onde ela clicou em algo que não era botão]

## As três perguntas

${perguntas.join("\n\n") || "[a confirmar]"}

## Decisão

- **Escolhido:** [qual, em uma linha]
- **Motivo, na palavra dela:** "[citação literal]"
- **O que muda no que vai ser construído:** [concreto]
- **O que NÃO vai ser construído por causa disso:** [obrigatório: se nada saiu, o protótipo não decidiu nada]

## Para onde isso vai

- [ ] entra em \`sistemas/<nome>/ESCOPO.md\` (\`/escopo\`)
- [ ] entra na lista de entregas (\`/quebrar\`)
- [ ] nada: a resposta foi "não construir", e está registrada aqui

## O código descartável

- [ ] jogado fora em [data] — o protótipo não virou base de nada
`;
}

// ─────────────────────────── relatório ───────────────────────────

function relatar(titulo, r, fechou) {
  console.log(`\n${titulo}`);
  for (const a of r.avisos) console.log(`  ! ${a}`);
  for (const p of r.problemas) console.log(`  ✖ ${p}`);
  if (!r.problemas.length) ok(fechou);
  return r.problemas.length;
}

const FECHOU = {
  fluxo: "o desenho fecha: todo botão tem destino, toda tela é alcançável, nenhuma tela sem saída",
  visual: "as versões fecham: cada uma tem nome, aposta e par de cor que passa no WCAG AA",
};

function imprimirMedidas(r, tipo) {
  if (tipo === "visual") {
    for (const v of r.variacoes) for (const m of v.medidas) info(`versão ${v.n} — ${m.nome}: ${m.razao.toFixed(2)}:1`);
  }
  for (const m of r.medidasCor || []) info(`cores do casco — ${m.nome}: ${m.razao.toFixed(2)}:1`);
}

function abrir(arquivo) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  execFile(cmd, [arquivo], () => {});
}

function gravar(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(path.resolve(arquivo)), { recursive: true });
  fs.writeFileSync(arquivo, conteudo, "utf8");
  const kb = (Buffer.byteLength(conteudo, "utf8") / 1024).toFixed(1);
  ok(`escrito: ${arquivo} (${kb} kB)`);
}

// ─────────────────────────── comando ───────────────────────────

const AJUDA = `
prototipo.js — protótipo descartável em um HTML só

  node scripts/prototipo.js conferir  <arquivo.json>
  node scripts/prototipo.js fluxo     <fluxo.json>  [saida.html]
  node scripts/prototipo.js visual    <visual.json> [saida.html]
  node scripts/prototipo.js conclusao <arquivo.json> [saida.md]

  --abrir    abre o arquivo gerado
  --forcar   gera mesmo com problema apontado
`;

const FLAGS = ["--abrir", "--forcar", "--ajuda", "-h"];

function main() {
  const bruto = process.argv.slice(2);
  const desconhecida = bruto.find((a) => a.startsWith("-") && !FLAGS.includes(a));
  // sem isto, "--forçar" com cedilha virava caminho de arquivo e o erro saía errado
  if (desconhecida) morrer(`opção desconhecida: "${desconhecida}".`, AJUDA.trim());
  const args = bruto.filter((a) => !FLAGS.includes(a));
  const querAbrir = bruto.includes("--abrir");
  const forcar = bruto.includes("--forcar");
  const cmd = args[0];
  if (!cmd || bruto.includes("--ajuda") || bruto.includes("-h")) { console.log(AJUDA); return; }

  const arquivo = args[1];
  const spec = lerSpec(arquivo);
  const base = path.dirname(path.resolve(arquivo));
  const tipo = tipoDe(spec);
  if (!tipo) morrer("não sei se é fluxo ou visual.", 'Spec de fluxo tem a lista `estados`; spec de visual tem a lista `variacoes`.');

  if (cmd === "conferir") {
    const r = tipo === "fluxo" ? conferirFluxo(spec) : conferirVisual(spec, base);
    const n = relatar(tipo === "fluxo" ? `FLUXO: ${arquivo}` : `VERSÕES DA TELA: ${arquivo}`, r, FECHOU[tipo]);
    imprimirMedidas(r, tipo);
    console.log(n ? `\n${n} problema(s) encontrado(s).` : "\nTudo certo.");
    process.exit(n ? 1 : 0);
  }

  if (cmd === "fluxo" || cmd === "visual") {
    if (cmd !== tipo) morrer(`"${arquivo}" é spec de ${tipo}, e você pediu ${cmd}.`, `Rode: node scripts/prototipo.js ${tipo} ${arquivo}`);
    const r = tipo === "fluxo" ? conferirFluxo(spec) : conferirVisual(spec, base);
    const n = relatar(tipo === "fluxo" ? `FLUXO: ${arquivo}` : `VERSÕES DA TELA: ${arquivo}`, r, FECHOU[tipo]);
    imprimirMedidas(r, tipo);
    if (n && !forcar) morrer(`${n} problema(s): o HTML não foi gerado.`, "Conserte o spec e rode de novo. Pra gerar de propósito com problema (só pra depurar), use --forcar.");
    const saida = args[2] || path.join(base, "prototipo.html");
    const html = tipo === "fluxo" ? gerarFluxoHtml(spec) : gerarVisualHtml(spec, r.variacoes);
    gravar(saida, html);
    info("abra no navegador. Mandar o arquivo por WhatsApp não funciona: o app abre HTML como texto.");
    if (querAbrir) abrir(path.resolve(saida));
    process.exit(0);
  }

  if (cmd === "conclusao" || cmd === "conclusão") {
    const saida = args[2] || path.join(base, "conclusao.md");
    if (fs.existsSync(saida)) morrer(`"${saida}" já existe.`, "Conclusão não se sobrescreve: ela é o registro da decisão. Passe outro caminho se quiser um segundo arquivo.");
    gravar(saida, gerarConclusao(spec, tipo));
    info("preencha durante a conversa, não depois de memória.");
    process.exit(0);
  }

  morrer(`comando desconhecido: "${cmd}".`, AJUDA.trim());
}

module.exports = { conferirFluxo, conferirVisual, conferirMarkup, conferirCores, gerarFluxoHtml, gerarVisualHtml, gerarConclusao, razao, lum };

if (require.main === module) main();
