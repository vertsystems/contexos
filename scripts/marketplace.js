#!/usr/bin/env node
/**
 * Contex OS — marketplace.js
 * Confere um anúncio de Mercado Livre ou Shopee contra a regra fixa da casa e
 * devolve o laudo: o que passa, o que reprova, e o que o usuário ainda não
 * informou (pendência, nunca preenchida por chute).
 *
 * Existe porque as três coisas que derrubam anúncio são contáveis, e ninguém
 * conta: título estourado (o ML corta em 60 caracteres, e o chat sempre escreve
 * 63), palavra que o guia de violação proíbe, e atributo obrigatório vazio. As
 * regras vivem em templates/crescimento/marketplace-<plataforma>.json, cada uma
 * com fonte oficial e data de conferência. O que a plataforma não publica em
 * página aberta fica marcado a_confirmar em vez de virar número inventado.
 *
 * Uso:
 *   node scripts/marketplace.js conferir produtos/<produto>/anuncio-shopee.md
 *   node scripts/marketplace.js conferir <arquivo.md> --plataforma ml --saida laudo.md
 *   node scripts/marketplace.js titulo "Tênis Adidas Superstar Couro" --plataforma ml
 *   node scripts/marketplace.js esqueleto shopee --produto "Caneca térmica 500ml"
 *   node scripts/marketplace.js limites MLB1055
 *   node scripts/marketplace.js plataformas
 *
 * Opções:
 *   --plataforma <p>   ml | mercado-livre | shopee (o padrão vem do próprio arquivo)
 *   --termo "<t>"      termo mais buscado, quando não está no arquivo
 *   --regras <json>    outro arquivo de regras
 *   --saida <arquivo>  escreve o laudo (ou o esqueleto) em vez de mostrar no terminal
 *   --json             resultado em JSON, pra encadear
 *
 * Sai com código 1 quando acha infração alta ou média. Aviso e pendência não derrubam.
 *
 * Node 18+, sem dependência de npm.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const DIR_REGRAS = path.join(__dirname, "..", "templates", "crescimento");
const ORDEM = { alta: 0, media: 1, aviso: 2 };
const VAZIO = ["", "-", "?", "[pendente]", "[a confirmar]", "[preencher]", "pendente", "a confirmar"];

// palavra curta e conectivo não contam como repetição de termo de busca
const PARADAS = new Set([
  "com", "sem", "para", "por", "dos", "das", "nos", "nas", "que", "una", "uma", "aos",
  "mais", "pra", "ate", "the", "and", "kit", "und", "nao",
]);

// ─────────────────────────── utilidades ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Conta caractere de verdade (acento e emoji contam como um). */
function contar(texto) {
  return Array.from(String(texto || "")).length;
}

function norm(texto) {
  return br.semAcento(String(texto || "").toLowerCase());
}

function vazio(valor) {
  return VAZIO.includes(String(valor || "").trim().toLowerCase());
}

function curto(p) {
  const rel = path.relative(process.cwd(), p);
  return rel.length < p.length ? rel : p;
}

// ─────────────────────────── regras ───────────────────────────

/** "ml", "Mercado Livre", "shopee" → caminho do arquivo de regras. */
function resolverPlataforma(entrada) {
  const alvo = norm(entrada).trim();
  if (!alvo) return null;
  for (const arquivo of fs.readdirSync(DIR_REGRAS)) {
    if (!/^marketplace-.+\.json$/.test(arquivo)) continue;
    const dados = JSON.parse(fs.readFileSync(path.join(DIR_REGRAS, arquivo), "utf8"));
    const chaves = [dados.plataforma, dados.nome, ...(dados.apelidos || [])].map(norm);
    if (chaves.includes(alvo)) return path.join(DIR_REGRAS, arquivo);
  }
  return null;
}

function plataformasDisponiveis() {
  return fs.readdirSync(DIR_REGRAS)
    .filter((a) => /^marketplace-.+\.json$/.test(a))
    .map((a) => {
      const d = JSON.parse(fs.readFileSync(path.join(DIR_REGRAS, a), "utf8"));
      return { arquivo: a, plataforma: d.plataforma, nome: d.nome, versao: d.versao, apelidos: d.apelidos || [] };
    });
}

function carregarRegras(plataforma, caminho) {
  const arquivo = caminho || resolverPlataforma(plataforma);
  if (!arquivo) {
    const nomes = plataformasDisponiveis().map((p) => p.plataforma).join(", ");
    morrer(`não reconheci a plataforma "${plataforma || ""}".`, `As que existem: ${nomes}. Só Mercado Livre e Shopee têm regra conferida aqui.`);
  }
  const regras = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  for (const r of regras.regras || []) {
    if (r.padrao) {
      try { r._re = new RegExp(r.padrao, "gi"); }
      catch (e) { morrer(`regra ${r.id}: padrão inválido (${e.message})`); }
    }
  }
  regras._arquivo = arquivo;
  return regras;
}

// ─────────────────────────── leitura do anúncio ───────────────────────────

/**
 * Lê o markdown do anúncio e devolve os campos.
 * O contrato é o do esqueleto: linhas "- **Campo:** valor", a tabela de
 * "## Ficha técnica" e a seção "## Descrição".
 */
function extrairAnuncio(texto) {
  const linhas = String(texto).split(/\r?\n/);
  const campos = {};
  const atributos = [];
  const secoes = {};
  let secao = "";

  for (const linha of linhas) {
    const titulo = linha.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (titulo) {
      secao = norm(titulo[1]).replace(/[^a-z0-9 ]/g, " ").trim();
      secoes[secao] = secoes[secao] || [];
      continue;
    }
    if (secao) (secoes[secao] = secoes[secao] || []).push(linha);

    const campo = linha.match(/^\s*(?:[-*]\s*)?\*\*([^*:]+):?\*\*:?\s*(.*)$/);
    if (campo) {
      const chave = campo[1].trim();
      if (!(norm(chave) in campos)) campos[norm(chave)] = campo[2].trim();
      continue;
    }

    if (/^\s*\|/.test(linha) && /ficha/.test(secao)) {
      const celulas = linha.split("|").slice(1, -1).map((c) => c.trim());
      if (celulas.length < 2) continue;
      if (/^:?-{2,}/.test(celulas[0])) continue;
      if (["atributo", "caracteristica", "campo"].includes(norm(celulas[0]))) continue;
      atributos.push({ nome: celulas[0].replace(/\*\*/g, "").trim(), valor: celulas[1] });
    }
  }

  const secaoTexto = (nome) => {
    const chave = Object.keys(secoes).find((s) => s.includes(nome));
    return chave ? secoes[chave].join("\n").trim() : "";
  };

  return {
    plataforma: campos["plataforma"] || "",
    categoria: campos["categoria"] || "",
    titulo: campos["titulo"] || "",
    termo: campos["termo mais buscado"] || campos["termo"] || "",
    preco: campos["preco"] || "",
    fotos: campos["fotos"] || "",
    campos,
    atributos,
    descricao: secaoTexto("descricao"),
  };
}

// ─────────────────────────── conferência ───────────────────────────

function achado(r, extra) {
  return {
    id: r.id, gravidade: r.gravidade, termo: r.termo, motivo: r.motivo,
    correcao: r.correcao || "", fonte: r.fonte || "", fonte_nota: r.fonte_nota || "",
    conferido_em: r.conferido_em || "",
    ...extra,
  };
}

function ocorrencias(re, texto) {
  const achou = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(norm(texto))) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    achou.push(texto.slice(m.index, m.index + m[0].length));
    if (achou.length >= 8) break;
  }
  return [...new Set(achou)];
}

function palavrasRepetidas(titulo, minimo) {
  const conta = new Map();
  for (const p of norm(titulo).split(/[^a-z0-9]+/)) {
    if (p.length < 3 || PARADAS.has(p)) continue;
    conta.set(p, (conta.get(p) || 0) + 1);
  }
  return [...conta.entries()].filter(([, n]) => n >= minimo).map(([p, n]) => ({ palavra: p, vezes: n }));
}

/**
 * Roda as regras da plataforma sobre o anúncio.
 * Devolve { medidas, achados, pendentes, resumo }.
 */
function conferir(anuncio, regras, opcoes = {}) {
  const achados = [];
  const pendentes = [];
  const medidas = [];
  const lim = regras.limites || {};
  const titulo = (anuncio.titulo || "").trim();
  const termo = (opcoes.termo || anuncio.termo || "").trim();

  const pendencia = (o) => pendentes.push({ gravidade: "pendencia", ...o });

  // 1. título existe?
  if (vazio(titulo)) {
    achados.push(achado(
      { id: "titulo-vazio", gravidade: "alta", termo: "título não escrito", motivo: "sem título não existe anúncio", correcao: "escrever o título na linha **Título:**", fonte: regras.titulo?.fonte, conferido_em: regras.titulo?.conferido_em },
      { trechos: [] }
    ));
  } else {
    // 2. tamanho, contado por comando
    const n = contar(titulo);
    const max = lim.titulo_maximo || {};
    medidas.push({ o_que: "caracteres do título", valor: n, limite: max.valor ?? null, fonte: max.fonte || "", conferido_em: max.conferido_em || "" });
    if (max.valor && n > max.valor) {
      achados.push(achado(
        { id: "titulo-longo", gravidade: "alta", termo: `título com ${n} caracteres`, motivo: `o limite da plataforma é ${max.valor}; o que passa disso é cortado ou barrado no cadastro`, correcao: `tirar ${n - max.valor} caractere(s) — começando pelo atributo menos buscado`, fonte: max.fonte, conferido_em: max.conferido_em },
        { trechos: [titulo] }
      ));
    }
    if (max.valor === null) {
      pendencia({ id: "titulo-limite-a-confirmar", termo: "limite de caractere do título", pergunta: `${max.onde_conferir || "conferir no painel da plataforma"} (o arquivo de regras marca a_confirmar)`, fonte: max.fonte, conferido_em: max.conferido_em });
    }
    const rec = lim.titulo_recomendado || {};
    if (rec.maximo && n > rec.maximo) {
      achados.push(achado({ id: "titulo-acima-do-recomendado", gravidade: "aviso", termo: `título com ${n} caracteres`, motivo: rec.motivo, correcao: `encurtar pra até ${rec.maximo}`, fonte: rec.fonte, conferido_em: rec.conferido_em }, { trechos: [] }));
    }
    const minRec = rec.minimo ?? lim.titulo_minimo_recomendado?.valor;
    if (minRec && n < minRec) {
      const f = rec.minimo ? rec : lim.titulo_minimo_recomendado;
      achados.push(achado({ id: "titulo-curto", gravidade: "aviso", termo: `título com ${n} caracteres`, motivo: f.motivo || "título curto desperdiça espaço de busca", correcao: `usar pelo menos ${minRec} caracteres, com atributo que o comprador procura`, fonte: f.fonte, conferido_em: f.conferido_em }, { trechos: [] }));
    }
  }

  // 3. descrição
  const desc = (anuncio.descricao || "").replace(/^\s*\[.*\]\s*$/m, "").trim();
  if (vazio(desc) || !desc) {
    achados.push(achado({ id: "descricao-vazia", gravidade: "media", termo: "descrição não escrita", motivo: "descrição vazia derruba a qualidade do anúncio e deixa a dúvida pro chat", correcao: "escrever a descrição na seção ## Descrição", fonte: regras.titulo?.fonte, conferido_em: regras.versao }, { trechos: [] }));
  } else {
    const nd = contar(desc);
    const maxd = lim.descricao_maxima || {};
    medidas.push({ o_que: "caracteres da descrição", valor: nd, limite: maxd.valor ?? null, fonte: maxd.fonte || "", conferido_em: maxd.conferido_em || "" });
    if (maxd.valor && nd > maxd.valor) {
      achados.push(achado({ id: "descricao-longa", gravidade: "media", termo: `descrição com ${nd} caracteres`, motivo: `o limite do campo é ${maxd.valor}`, correcao: "cortar o excedente", fonte: maxd.fonte, conferido_em: maxd.conferido_em }, { trechos: [] }));
    }
  }

  // 4. fotos declaradas
  const nf = parseInt(String(anuncio.fotos).replace(/[^0-9]/g, ""), 10);
  const maxf = lim.fotos_maximo || {};
  if (Number.isFinite(nf) && maxf.valor) {
    medidas.push({ o_que: "fotos declaradas", valor: nf, limite: maxf.valor, fonte: maxf.fonte || "", conferido_em: maxf.conferido_em || "" });
    if (nf > maxf.valor) {
      achados.push(achado({ id: "fotos-acima", gravidade: "media", termo: `${nf} fotos`, motivo: `a plataforma aceita ${maxf.valor}${maxf.nota ? ` (${maxf.nota})` : ""}`, correcao: "escolher as melhores até o limite", fonte: maxf.fonte, conferido_em: maxf.conferido_em }, { trechos: [] }));
    }
  }

  // 5. atributos mínimos
  for (const a of regras.atributos_minimos || []) {
    const achadoAttr = (anuncio.atributos || []).find((x) => norm(x.nome) === norm(a.nome));
    if (!achadoAttr) {
      pendencia({ id: `atributo-${br.slug(a.nome)}`, termo: `atributo "${a.nome}" não está na ficha`, pergunta: a.nota || `informar ${a.nome}`, status: a.status, fonte: a.fonte, conferido_em: a.conferido_em });
    } else if (vazio(achadoAttr.valor)) {
      pendencia({ id: `atributo-${br.slug(a.nome)}`, termo: `atributo "${a.nome}" em branco`, pergunta: a.nota || `preencher ${a.nome}`, status: a.status, fonte: a.fonte, conferido_em: a.conferido_em });
    }
  }
  for (const x of anuncio.atributos || []) {
    if (vazio(x.valor) && !(regras.atributos_minimos || []).some((a) => norm(a.nome) === norm(x.nome))) {
      pendencia({ id: `atributo-${br.slug(x.nome)}`, termo: `atributo "${x.nome}" em branco`, pergunta: "o que o usuário não informou fica pendente; não é preenchido por dedução", fonte: regras._arquivo ? path.basename(regras._arquivo) : "", conferido_em: regras.versao });
    }
  }

  // 6. estrutura do título: marca e modelo informados aparecem nele?
  if (!vazio(titulo)) {
    for (const nome of ["Marca", "Modelo"]) {
      if (!(regras.titulo?.estrutura || []).some((e) => norm(e) === norm(nome))) continue;
      const attr = (anuncio.atributos || []).find((x) => norm(x.nome) === norm(nome));
      if (!attr || vazio(attr.valor)) continue;
      // "sem marca", "genérico" e "não se aplica" não são texto pra colocar no título
      if (/^(sem marca|generic[oa]|nao se aplica|n\/a|sem modelo|unico)$/.test(norm(attr.valor).trim())) continue;
      if (!norm(titulo).includes(norm(attr.valor))) {
        achados.push(achado({
          id: `estrutura-${norm(nome)}`, gravidade: "aviso",
          termo: `${nome.toLowerCase()} "${attr.valor}" está na ficha e não no título`,
          motivo: `a estrutura recomendada pela plataforma é ${(regras.titulo.estrutura || []).join(" + ")}`,
          correcao: `incluir ${attr.valor} no título, se couber no limite`,
          fonte: regras.titulo.fonte, conferido_em: regras.titulo.conferido_em,
        }, { trechos: [titulo] }));
      }
    }
  }

  // 7. regras do arquivo
  for (const r of regras.regras || []) {
    const onde = r.onde || ["titulo"];
    const campoTexto = { titulo, descricao: desc };

    if (r.tipo === "texto") {
      const trechos = [];
      for (const campo of onde) {
        for (const t of ocorrencias(r._re, campoTexto[campo] || "")) trechos.push(`${campo}: ${t}`);
      }
      if (trechos.length) achados.push(achado(r, { trechos }));
      continue;
    }

    if (r.tipo === "repeticao") {
      const repetidas = palavrasRepetidas(titulo, r.minimo || 3);
      if (repetidas.length) {
        achados.push(achado(r, { trechos: repetidas.map((x) => `${x.palavra} (${x.vezes}×)`) }));
      }
      continue;
    }

    if (r.tipo === "termo_comeco") {
      if (!termo || vazio(termo)) {
        pendencia({ id: r.id, termo: "termo mais buscado não informado", pergunta: "qual termo o comprador digita pra achar esse produto? Sem isso não dá pra conferir o começo do título", fonte: r.fonte, conferido_em: r.conferido_em });
        continue;
      }
      const pos = norm(titulo).indexOf(norm(termo));
      if (pos === -1) {
        achados.push(achado({ ...r, gravidade: "media", termo: `o termo "${termo}" não aparece no título` }, { trechos: [titulo] }));
      } else if (pos > (r.tolerancia || 20)) {
        achados.push(achado(r, { trechos: [`"${termo}" começa no caractere ${pos + 1}`] }));
      }
      continue;
    }

    if (r.tipo === "declaracao") {
      const valor = anuncio.campos[norm(r.chave)];
      if (valor === undefined || vazio(valor)) {
        pendencia({ id: r.id, termo: r.termo, pergunta: r.pergunta, chave: r.chave, fonte: r.fonte, conferido_em: r.conferido_em });
      }
    }
  }

  achados.sort((a, b) => (ORDEM[a.gravidade] ?? 9) - (ORDEM[b.gravidade] ?? 9));
  const resumo = { alta: 0, media: 0, aviso: 0, pendencia: pendentes.length };
  for (const a of achados) resumo[a.gravidade] = (resumo[a.gravidade] || 0) + 1;

  return {
    plataforma: regras.plataforma, nome: regras.nome, versao: regras.versao,
    titulo, termo, medidas, achados, pendentes, resumo,
    reprovado: resumo.alta + resumo.media > 0,
  };
}

// ─────────────────────────── laudo ───────────────────────────

const ETIQUETA = { alta: "REPROVA", media: "CORRIGIR", aviso: "AVISO" };

function laudoTexto(res, arquivo) {
  const l = [];
  l.push("");
  l.push(`Anúncio: ${arquivo ? curto(arquivo) : "(título avulso)"}`);
  l.push(`Plataforma: ${res.nome} — regras de ${res.versao}`);
  l.push("");
  for (const m of res.medidas) {
    l.push(`  ${m.o_que}: ${m.valor}${m.limite ? ` (limite ${m.limite})` : m.limite === null ? " (limite a confirmar)" : ""}`);
  }
  l.push("");
  if (!res.achados.length) l.push("✔ Nenhuma regra fixa violada.");
  for (const a of res.achados) {
    l.push(`${a.gravidade === "aviso" ? "·" : "✖"} [${ETIQUETA[a.gravidade] || a.gravidade}] ${a.termo}`);
    if (a.trechos && a.trechos.length) l.push(`    onde: ${a.trechos.join(" | ")}`);
    if (a.motivo) l.push(`    por que: ${a.motivo}`);
    if (a.correcao) l.push(`    conserto: ${a.correcao}`);
    if (a.fonte) l.push(`    fonte: ${a.fonte} (conferido em ${a.conferido_em || "?"})`);
    if (a.fonte_nota) l.push(`    ressalva da fonte: ${a.fonte_nota}`);
  }
  if (res.pendentes.length) {
    l.push("");
    l.push("Pendente (o usuário informa; nada aqui é preenchido por dedução):");
    for (const p of res.pendentes) l.push(`  ? ${p.termo} — ${p.pergunta || ""}`);
  }
  l.push("");
  l.push(`Resumo: ${res.resumo.alta} reprova, ${res.resumo.media} corrigir, ${res.resumo.aviso} aviso, ${res.resumo.pendencia} pendente.`);
  l.push(res.reprovado ? "Não publicar antes de corrigir o que está como REPROVA e CORRIGIR." : "Regra fixa em ordem. O que está pendente vai pro usuário.");
  l.push("");
  return l.join("\n");
}

function laudoMarkdown(res, arquivo) {
  const l = [];
  l.push(`# Laudo do anúncio — ${res.nome}`);
  l.push("");
  l.push(`- **Arquivo:** ${arquivo ? curto(arquivo) : "(título avulso)"}`);
  l.push(`- **Regras:** \`templates/crescimento/marketplace-${res.plataforma}.json\`, versão ${res.versao}`);
  l.push(`- **Resultado:** ${res.reprovado ? "não publicar antes de corrigir" : "regra fixa em ordem"}`);
  l.push("");
  l.push("## Medido por comando");
  l.push("");
  l.push("| O que | Valor | Limite | Fonte |");
  l.push("|---|---|---|---|");
  for (const m of res.medidas) l.push(`| ${m.o_que} | ${m.valor} | ${m.limite ?? "a confirmar"} | ${m.fonte || "—"} |`);
  l.push("");
  l.push("## Achados");
  l.push("");
  if (!res.achados.length) l.push("Nenhuma regra fixa violada.");
  for (const a of res.achados) {
    l.push(`### ${ETIQUETA[a.gravidade] || a.gravidade} — ${a.termo}`);
    l.push("");
    if (a.trechos && a.trechos.length) l.push(`- **Onde:** ${a.trechos.join(" | ")}`);
    if (a.motivo) l.push(`- **Por que:** ${a.motivo}`);
    if (a.correcao) l.push(`- **Conserto:** ${a.correcao}`);
    if (a.fonte) l.push(`- **Fonte:** ${a.fonte} — conferido em ${a.conferido_em || "?"}`);
    if (a.fonte_nota) l.push(`- **Ressalva da fonte:** ${a.fonte_nota}`);
    l.push("");
  }
  l.push("## Pendente");
  l.push("");
  if (!res.pendentes.length) l.push("Nada pendente.");
  for (const p of res.pendentes) l.push(`- **${p.termo}** — ${p.pergunta || ""}`);
  l.push("");
  return l.join("\n");
}

// ─────────────────────────── esqueleto ───────────────────────────

function esqueleto(regras, produto) {
  const nome = produto || "<produto>";
  const l = [];
  l.push(`# ${nome} — anúncio ${regras.nome}`);
  l.push("");
  l.push(`- **Plataforma:** ${regras.plataforma}`);
  l.push("- **Categoria:** [pendente]");
  l.push("- **Termo mais buscado:** [pendente]");
  l.push("- **Preço:** [pendente]");
  l.push("- **Fotos:** [pendente]");
  l.push("- **Variações:** [pendente]");
  l.push("- **Restrição:** [pendente]");
  l.push("- **Título:** [pendente]");
  l.push("");
  l.push(`Estrutura do título nesta casa: ${(regras.titulo?.estrutura || []).join(" + ")}${regras.limites?.titulo_maximo?.valor ? `, em até ${regras.limites.titulo_maximo.valor} caracteres` : ""}.`);
  l.push("");
  l.push("## Ficha técnica");
  l.push("");
  l.push("| Atributo | Valor |");
  l.push("|---|---|");
  for (const a of regras.atributos_minimos || []) l.push(`| ${a.nome} | [pendente] |`);
  l.push("");
  l.push("## Descrição");
  l.push("");
  l.push("[pendente]");
  l.push("");
  l.push("## Checklist operacional");
  l.push("");
  l.push("- [ ] Chat: quem responde e em quanto tempo");
  l.push("- [ ] Envio: prazo de postagem que você cumpre");
  l.push("- [ ] Devolução: quem paga o quê, na regra da plataforma");
  l.push("");
  return l.join("\n");
}

// ─────────────────────────── limites pela API pública do ML ───────────────────────────

function pegarJson(url) {
  return new Promise((resolve, reject) => {
    const https = require("https");
    const req = https.get(url, { timeout: 15000, headers: { "User-Agent": "contexos/marketplace.js" } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let dados = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { dados += c; });
      res.on("end", () => { try { resolve(JSON.parse(dados)); } catch (e) { reject(e); } });
    });
    req.on("timeout", () => req.destroy(new Error("tempo esgotado")));
    req.on("error", reject);
  });
}

async function limites(categoria) {
  const id = (categoria || "MLB1055").toUpperCase();
  console.log(`\nConsultando a API pública do Mercado Livre para ${id}…`);
  try {
    const cat = await pegarJson(`https://api.mercadolibre.com/categories/${id}`);
    const s = cat.settings || {};
    console.log(`\nCategoria: ${cat.id} — ${cat.name}`);
    console.log(`  título: até ${s.max_title_length} caracteres`);
    console.log(`  subtítulo: até ${s.max_sub_title_length} caracteres`);
    console.log(`  descrição: até ${s.max_description_length} caracteres`);
    console.log(`  fotos: até ${s.max_pictures_per_item} (${s.max_pictures_per_item_var} com variação)`);
    const attrs = await pegarJson(`https://api.mercadolibre.com/categories/${id}/attributes`);
    const req = attrs.filter((a) => (a.tags || {}).required || (a.tags || {}).catalog_required);
    console.log(`\n  atributos obrigatórios da categoria (${req.length}):`);
    for (const a of req) console.log(`    - ${a.name}${a.value_type ? ` (${a.value_type})` : ""}`);
    console.log(`\nSe algum número divergir de templates/crescimento/marketplace-mercado-livre.json, atualize o arquivo e a data de conferência.\n`);
  } catch (e) {
    console.log(`\n· não deu pra consultar agora (${e.message}).`);
    console.log("  O valor que vale é o do arquivo de regras, com a data de conferência que está lá.\n");
  }
}

// ─────────────────────────── main ───────────────────────────

function lerOpcoes(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") o.json = true;
    else if (a === "--plataforma") o.plataforma = args[++i];
    else if (a === "--termo") o.termo = args[++i];
    else if (a === "--regras") o.regras = args[++i];
    else if (a === "--saida") o.saida = args[++i];
    else if (a === "--produto") o.produto = args[++i];
    else if (a.startsWith("--")) morrer(`opção desconhecida: ${a}`, "Rode sem argumento pra ver o uso.");
    else o._.push(a);
  }
  return o;
}

function uso() {
  console.log(`
Uso:
  node scripts/marketplace.js conferir <anuncio.md> [--plataforma ml|shopee] [--termo "..."] [--saida laudo.md] [--json]
  node scripts/marketplace.js titulo "<título>" --plataforma ml [--termo "..."]
  node scripts/marketplace.js esqueleto <plataforma> [--produto "nome"] [--saida arquivo.md]
  node scripts/marketplace.js limites [MLB1055]
  node scripts/marketplace.js plataformas
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) { uso(); process.exit(0); }
  const comando = args[0];
  const o = lerOpcoes(args.slice(1));

  if (comando === "plataformas") {
    for (const p of plataformasDisponiveis()) {
      console.log(`${p.plataforma}  (${p.nome}, regras de ${p.versao})  apelidos: ${p.apelidos.join(", ")}`);
    }
    return;
  }

  if (comando === "limites") { await limites(o._[0]); return; }

  if (comando === "esqueleto") {
    const regras = carregarRegras(o._[0] || o.plataforma, o.regras);
    const texto = esqueleto(regras, o.produto);
    if (o.saida) {
      fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
      fs.writeFileSync(o.saida, texto + "\n", "utf8");
      console.log(`\n✔ esqueleto em ${curto(path.resolve(o.saida))}\n`);
    } else console.log(texto);
    return;
  }

  if (comando === "titulo") {
    const texto = o._[0];
    if (!texto) morrer("falta o título.", 'Exemplo: node scripts/marketplace.js titulo "Tênis Adidas Superstar" --plataforma ml');
    const regras = carregarRegras(o.plataforma, o.regras);
    const anuncio = { titulo: texto, termo: o.termo || "", atributos: [], descricao: "(não conferida)", campos: {} };
    const res = conferir(anuncio, regras, { termo: o.termo });
    res.achados = res.achados.filter((a) => !["descricao-vazia", "descricao-longa"].includes(a.id));
    res.medidas = res.medidas.filter((m) => norm(m.o_que).includes("titulo"));
    res.pendentes = res.pendentes.filter((p) => !String(p.id).startsWith("atributo-") && !p.chave);
    res.resumo = res.achados.reduce((acc, a) => { acc[a.gravidade]++; return acc; }, { alta: 0, media: 0, aviso: 0, pendencia: res.pendentes.length });
    res.reprovado = res.resumo.alta + res.resumo.media > 0;
    if (o.json) console.log(JSON.stringify(res, null, 2));
    else console.log(laudoTexto(res, null));
    process.exit(res.reprovado ? 1 : 0);
  }

  if (comando === "conferir") {
    const arquivo = o._[0];
    if (!arquivo) morrer("falta o arquivo do anúncio.", "Exemplo: node scripts/marketplace.js conferir produtos/caneca/anuncio-shopee.md");
    const caminho = path.resolve(arquivo);
    if (!fs.existsSync(caminho)) morrer(`não achei o arquivo ${curto(caminho)}.`, "Gere o esqueleto com: node scripts/marketplace.js esqueleto shopee --saida <arquivo.md>");
    const anuncio = extrairAnuncio(fs.readFileSync(caminho, "utf8"));
    const regras = carregarRegras(o.plataforma || anuncio.plataforma, o.regras);
    const res = conferir(anuncio, regras, { termo: o.termo });
    if (o.json) console.log(JSON.stringify(res, null, 2));
    else if (o.saida) {
      fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
      fs.writeFileSync(o.saida, laudoMarkdown(res, caminho) + "\n", "utf8");
      console.log(`\n✔ laudo em ${curto(path.resolve(o.saida))}\n`);
      console.log(laudoTexto(res, caminho));
    } else console.log(laudoTexto(res, caminho));
    process.exit(res.reprovado ? 1 : 0);
  }

  morrer(`comando desconhecido: ${comando}`, "Comandos: conferir, titulo, esqueleto, limites, plataformas.");
}

module.exports = {
  carregarRegras, plataformasDisponiveis, resolverPlataforma,
  extrairAnuncio, conferir, contar, esqueleto, laudoMarkdown, laudoTexto, palavrasRepetidas,
};

if (require.main === module) {
  main().catch((e) => morrer(e.message));
}
