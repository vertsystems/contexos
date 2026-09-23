#!/usr/bin/env node
/**
 * Contex OS — pessoas.js
 * Lê as fichas de `pessoas/<slug>.md`, calcula quem ficou no vácuo e gera o
 * `pessoas/indice.md` que o /revisao-semanal, o /abrir e o /pos-venda leem.
 *
 * Existe porque "faz tempo que não falo com a Carla" é uma conta de calendário,
 * e conta de calendário feita de cabeça erra: o "faz uns dias" vira três
 * semanas, a promessa com data passa em silêncio e o aniversário do cliente
 * mais antigo é lembrado no dia seguinte. Tudo aqui é aritmética com Date a
 * partir do frontmatter da ficha; nada é estimado. O /pessoa usa este script
 * pra criar a ficha (slug certo, campos certos), pra registrar cada contato
 * (data e histórico no mesmo comando) e pra montar o índice.
 *
 * Uso:
 *   node scripts/pessoas.js indice [pessoas/] [--hoje AAAA-MM-DD] [--janela 30] [--json]
 *   node scripts/pessoas.js vacuo  [pessoas/] [--hoje AAAA-MM-DD]        a mesma conta, no chat, sem escrever arquivo
 *   node scripts/pessoas.js nova "Nome" --papel cliente [--empresa X] [--canal "whatsapp +55..."] [--como-chegou "..."] [--importa "..."]
 *                          [--data DD/MM/AAAA] [--proximo "..." --ate DD/MM/AAAA] [--ritmo <dias>] [--aniversario DD/MM] [--renovacao AAAA-MM-DD]
 *                          [--base-legal contrato] [--pasta pessoas/]
 *   node scripts/pessoas.js contato <slug> --resumo "mandei o orçamento" [--canal whatsapp] [--data DD/MM/AAAA] [--fonte reunioes/2026-09-18-x.md]
 *                          [--proximo "ligar dia 25" --ate DD/MM/AAAA] [--prometi "... até DD/MM/AAAA"] [--prometeu "..."]
 *                          [--cumpri "trecho"] [--cumpriu "trecho"] [--nao-contatar]
 *   node scripts/pessoas.js conferir [pessoas/]                           só acusa ficha com campo faltando ou data inválida
 *
 * Opções:
 *   --hoje AAAA-MM-DD   data de referência (padrão: hoje)
 *   --janela <dias>     aniversário e renovação até N dias à frente (padrão: 30)
 *   --pasta <pasta>     onde as fichas moram (padrão: pessoas/)
 *   --json              resumo em JSON (pra outro script ler)
 *
 * O que decide "no vácuo", nesta ordem de gravidade:
 *   1. eu prometi algo com "até DD/MM/AAAA" e a data passou
 *   2. proximo_passo com proximo_passo_ate vencido
 *   3. dias sem contato acima do ritmo do papel (ou do campo ritmo_dias da ficha)
 * Quem tem nao_contatar: sim nunca entra no vácuo; aparece só na lista de quem pediu pra sair.
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

/** Dias sem contato a partir dos quais a pessoa está no vácuo, por papel. A ficha pode sobrescrever com `ritmo_dias`. */
const RITMO_PADRAO = {
  cliente: 30, prospect: 7, parceiro: 45, fornecedor: 90, jornalista: 60, indicador: 60, equipe: 14, outro: 90,
};
const PAPEIS = Object.keys(RITMO_PADRAO);
const BASES_LEGAIS = ["contrato", "consentimento", "legitimo-interesse", "obrigacao-legal"];

/** Campos que toda ficha tem, na ordem em que o frontmatter é escrito. */
const CAMPOS = [
  "nome", "papel", "empresa", "como_chegou", "canal", "o_que_importa",
  "ultimo_contato", "ritmo_dias", "proximo_passo", "proximo_passo_ate",
  "eu_prometi", "me_prometeu", "aniversario", "renovacao", "base_legal", "nao_contatar",
];
const CAMPOS_LISTA = new Set(["eu_prometi", "me_prometeu"]);

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

// ─────────────────────────── frontmatter ───────────────────────────

/**
 * Lê o frontmatter de uma ficha. Subconjunto de YAML de propósito: `chave: valor`,
 * lista com `  - item`, aspas opcionais, `[]` como lista vazia. O que não for
 * isso vira aviso, não erro silencioso.
 */
function lerFrontmatter(texto) {
  const m = String(texto).replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) return { dados: null, corpo: texto, avisos: ["sem frontmatter (o arquivo precisa começar com ---)"] };
  const dados = {}; const avisos = [];
  let chaveLista = null;
  for (const linhaCrua of m[1].split(/\r?\n/)) {
    const linha = linhaCrua.replace(/\s+$/, "");
    if (!linha.trim() || linha.trim().startsWith("#")) continue;
    const item = linha.match(/^\s+-\s*(.*)$/);
    if (item && chaveLista) {
      if (!Array.isArray(dados[chaveLista])) dados[chaveLista] = [];
      dados[chaveLista].push(desaspar(item[1]));
      continue;
    }
    const kv = linha.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) { avisos.push(`linha do frontmatter que não entendi: "${linha.trim()}"`); continue; }
    const [, chave, valor] = kv;
    if (CAMPOS_LISTA.has(chave)) {
      dados[chave] = valor.trim() === "" || valor.trim() === "[]" ? [] : [desaspar(valor)];
      chaveLista = chave;
    } else {
      dados[chave] = desaspar(valor);
      chaveLista = valor.trim() === "" ? chave : null; // "chave:" vazia pode ser uma lista que começa na linha seguinte
    }
  }
  return { dados, corpo: texto.slice(m[0].length), avisos };
}

function desaspar(s) {
  const t = String(s).trim();
  if (t.length > 1 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\(["\\])/g, "$1");
  if (t.length > 1 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
  return t;
}

function aspar(s) {
  const t = String(s == null ? "" : s);
  if (t === "") return "";
  return /[:#"'\[\]{}]|^\s|\s$|^-/.test(t) ? `"${t.replace(/[\\"]/g, "\\$&")}"` : t;
}

/** `chave: valor`, sem espaço sobrando quando o valor é vazio. */
function linhaKV(chave, valor) {
  const v = aspar(valor);
  return v === "" ? `${chave}:` : `${chave}: ${v}`;
}

function escreverFrontmatter(dados) {
  const L = ["---"];
  for (const c of CAMPOS) {
    const v = dados[c];
    if (CAMPOS_LISTA.has(c)) {
      const lista = Array.isArray(v) ? v : (v ? [v] : []);
      if (!lista.length) L.push(`${c}: []`);
      else { L.push(`${c}:`); for (const i of lista) L.push(`  - ${aspar(i)}`); }
    } else L.push(linhaKV(c, v));
  }
  for (const [k, v] of Object.entries(dados)) if (!CAMPOS.includes(k)) L.push(linhaKV(k, v));
  L.push("---");
  return L.join("\n");
}

// ─────────────────────────── leitura das fichas ───────────────────────────

function listarFichas(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta)
    .filter((f) => f.endsWith(".md") && f !== "indice.md" && !f.startsWith("_"))
    .sort()
    .map((f) => path.join(pasta, f));
}

/** "até 25/09/2026" ou "até 2026-09-25" no fim (ou no meio) de uma promessa → Date ou null. */
function dataDaPromessa(texto, anoPadrao) {
  const m = String(texto).match(/\bat[ée]\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?)\b/i);
  return m ? br.lerData(m[1], anoPadrao) : null;
}

function lerFicha(arquivo) {
  const texto = fs.readFileSync(arquivo, "utf8");
  const { dados, corpo, avisos } = lerFrontmatter(texto);
  const slug = path.basename(arquivo, ".md");
  const f = { arquivo, slug, dados: dados || {}, corpo, avisos: [...avisos] };
  if (!dados) return f;
  const d = f.dados;
  if (!d.nome) f.avisos.push("sem `nome`");
  if (!d.papel) f.avisos.push("sem `papel`");
  else if (!PAPEIS.includes(d.papel)) f.avisos.push(`papel "${d.papel}" não é um de: ${PAPEIS.join(", ")}`);
  if (!d.base_legal) f.avisos.push("sem `base_legal` (a ficha guarda dado pessoal; ver templates/operacao/pessoa.md)");
  else if (!BASES_LEGAIS.includes(d.base_legal)) f.avisos.push(`base_legal "${d.base_legal}" não é uma de: ${BASES_LEGAIS.join(", ")}`);
  if (d.nome && br.slug(d.nome) !== slug) f.avisos.push(`nome do arquivo (${slug}) não bate com o slug do nome (${br.slug(d.nome)})`);
  for (const c of ["ultimo_contato", "proximo_passo_ate", "renovacao"]) {
    if (d[c] && !br.lerData(d[c])) f.avisos.push(`${c} "${d[c]}" não é uma data válida (use AAAA-MM-DD)`);
  }
  if (d.aniversario && !/^\d{1,2}\/\d{1,2}$/.test(d.aniversario)) f.avisos.push(`aniversario "${d.aniversario}" precisa ser DD/MM, sem ano`);
  else if (d.aniversario && !br.lerData(d.aniversario, 2024)) f.avisos.push(`aniversario "${d.aniversario}" não existe no calendário`);
  if (d.ritmo_dias && !/^\d+$/.test(String(d.ritmo_dias))) f.avisos.push(`ritmo_dias "${d.ritmo_dias}" precisa ser um número de dias`);
  for (const c of CAMPOS_LISTA) {
    for (const prom of Array.isArray(d[c]) ? d[c] : (d[c] ? [d[c]] : [])) {
      const m = String(prom).match(/\bat[ée]\s+(\d{1,2}\/\d{1,2})(?![\d/])/i);
      if (m) f.avisos.push(`${c}: "${prom}" tem "até ${m[1]}" sem o ano. Na virada do ano a conta erra o lado: escreva "até ${m[1]}/AAAA"`);
    }
  }
  for (const c of CAMPOS_LISTA) {
    if (d[c] === undefined) continue;
    if (!Array.isArray(d[c])) { f.avisos.push(`${c} precisa ser lista (uma linha "  - ..." por promessa)`); d[c] = [d[c]]; }
  }
  return f;
}

// ─────────────────────────── a conta ───────────────────────────

/** Próxima ocorrência de um DD/MM a partir de hoje (inclusive). */
function proximoAniversario(ddmm, hoje) {
  const [d, m] = ddmm.split("/").map(Number);
  let x = new Date(hoje.getFullYear(), m - 1, d);
  if (x.getMonth() !== m - 1) x = new Date(hoje.getFullYear(), m, 0); // 29/02 em ano comum → 28/02
  if (x < hoje) { x = new Date(hoje.getFullYear() + 1, m - 1, d); if (x.getMonth() !== m - 1) x = new Date(hoje.getFullYear() + 1, m, 0); }
  return x;
}

/**
 * Calcula a situação de cada ficha. Devolve { pessoas, vacuo, esperando, proximos, naoContatar, problemas }.
 * Puro: não lê disco, não escreve nada.
 */
function calcular(fichas, hoje, janela = 30) {
  const pessoas = []; const vacuo = []; const esperando = []; const proximos = []; const naoContatar = []; const problemas = [];
  for (const f of fichas) {
    const d = f.dados;
    if (f.avisos.length) problemas.push({ slug: f.slug, avisos: f.avisos });
    if (!d.nome) continue;
    const ultimo = d.ultimo_contato ? br.lerData(d.ultimo_contato) : null;
    const dias = ultimo ? br.diasEntre(ultimo, hoje) : null;
    const ritmo = d.ritmo_dias ? Number(d.ritmo_dias) : (RITMO_PADRAO[d.papel] ?? RITMO_PADRAO.outro);
    const p = {
      slug: f.slug, nome: d.nome, papel: d.papel || "?", empresa: d.empresa || "", canal: d.canal || "",
      ultimo, dias, ritmo, proximo: d.proximo_passo || "", ate: d.proximo_passo_ate ? br.lerData(d.proximo_passo_ate) : null,
      naoContatar: /^(sim|s|true|yes)$/i.test(String(d.nao_contatar || "")),
    };
    const renovacao = d.renovacao ? br.lerData(d.renovacao) : null;
    if (renovacao) {
      const em = br.diasEntre(hoje, renovacao);
      if (em <= janela && em >= -janela) {
        const base = em < 0 ? `renovação vencida há ${-em} dia(s)` : "renovação";
        proximos.push({ ...p, data: renovacao, em, oque: base + (p.naoContatar ? " (pediu pra não receber mensagem: só o contrato justifica a conversa)" : "") });
      }
    }
    pessoas.push(p);
    if (p.naoContatar) { naoContatar.push(p); continue; }

    // Cada pessoa entra uma vez, pelo motivo mais grave.
    // 1. promessa minha vencida
    const vencidas = (d.eu_prometi || [])
      .map((prom) => ({ prom, dt: dataDaPromessa(prom, hoje.getFullYear()) }))
      .filter((x) => x.dt && x.dt < hoje)
      .sort((a, b) => a.dt - b.dt);
    if (vencidas.length) {
      const v = vencidas[0];
      const mais = vencidas.length > 1 ? ` (+${vencidas.length - 1} outra(s) vencida(s))` : "";
      vacuo.push({ ...p, gravidade: 1, motivo: `prometi "${v.prom}" e passou há ${br.diasEntre(v.dt, hoje)} dia(s)${mais}`, fazer: "cumprir ou avisar a nova data hoje" });
    }
    // 2. próximo passo vencido
    else if (p.proximo && p.ate && p.ate < hoje) {
      vacuo.push({ ...p, gravidade: 2, motivo: `próximo passo "${p.proximo}" venceu em ${br.fmt(p.ate)} (${br.diaSemana(p.ate)})`, fazer: p.proximo });
    }
    // 3. silêncio acima do ritmo
    else if (dias !== null && dias > ritmo) {
      vacuo.push({ ...p, gravidade: 3, motivo: `${dias} dias sem contato (ritmo de ${p.papel}: ${ritmo})`, fazer: p.proximo || "mandar uma mensagem com motivo concreto" });
    }
    if (dias === null && !d.ultimo_contato) problemas.push({ slug: f.slug, avisos: ["sem `ultimo_contato`: não dá pra saber se está no vácuo"] });

    // promessas deles vencidas
    for (const prom of d.me_prometeu || []) {
      const dt = dataDaPromessa(prom, hoje.getFullYear());
      esperando.push({ ...p, promessa: prom, ate: dt, atraso: dt ? br.diasEntre(dt, hoje) : null });
    }
    // datas à frente
    if (d.aniversario && /^\d{1,2}\/\d{1,2}$/.test(d.aniversario) && br.lerData(d.aniversario, 2024)) {
      const dt = proximoAniversario(d.aniversario, hoje);
      const em = br.diasEntre(hoje, dt);
      if (em <= janela) proximos.push({ ...p, data: dt, em, oque: "aniversário" });
    }
  }
  vacuo.sort((a, b) => a.gravidade - b.gravidade || (b.dias ?? 0) - (a.dias ?? 0));
  esperando.sort((a, b) => (b.atraso ?? -1e9) - (a.atraso ?? -1e9));
  proximos.sort((a, b) => a.em - b.em);
  pessoas.sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));
  return { pessoas, vacuo, esperando, proximos, naoContatar, problemas };
}

// ─────────────────────────── o índice ───────────────────────────

function celula(s) { return String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " "); }

function montarIndice(r, hoje, janela, pasta) {
  const L = [];
  L.push("# Pessoas — índice", "");
  L.push(`> Gerado por \`node scripts/pessoas.js indice\` em ${br.fmt(hoje)} (${br.diaSemana(hoje)}). Não editar aqui: editar a ficha em \`${pasta.replace(/\/?$/, "/")}<slug>.md\` e rodar de novo.`, "");
  L.push(`Fichas lidas: ${r.pessoas.length}. No vácuo: ${r.vacuo.length}. Esperando resposta deles: ${r.esperando.length}. Datas nos próximos ${janela} dias: ${r.proximos.length}. Pediram pra não receber: ${r.naoContatar.length}.`, "");

  L.push("## No vácuo", "");
  if (!r.vacuo.length) L.push("Ninguém. Toda promessa cumprida e todo mundo dentro do ritmo.", "");
  else {
    L.push("| Pessoa | Papel | Dias sem contato | Por quê | O que fazer |", "|---|---|---|---|---|");
    for (const v of r.vacuo) L.push(`| [${celula(v.nome)}](${v.slug}.md) | ${v.papel} | ${v.dias ?? "?"} | ${celula(v.motivo)} | ${celula(v.fazer)} |`);
    L.push("");
  }

  L.push("## Esperando resposta deles", "");
  if (!r.esperando.length) L.push("Nenhuma promessa aberta do outro lado.", "");
  else {
    L.push("| Pessoa | Prometeu | Até | Situação |", "|---|---|---|---|");
    for (const e of r.esperando) {
      const sit = e.ate ? (e.atraso > 0 ? `atrasado ${e.atraso} dia(s): cobrar com jeito` : e.atraso === 0 ? "vence hoje" : `faltam ${-e.atraso} dia(s)`) : "sem data: combinar uma";
      L.push(`| [${celula(e.nome)}](${e.slug}.md) | ${celula(e.promessa)} | ${e.ate ? br.fmt(e.ate) : "?"} | ${sit} |`);
    }
    L.push("");
  }

  L.push(`## Nos próximos ${janela} dias`, "");
  if (!r.proximos.length) L.push("Nenhum aniversário nem renovação na janela.", "");
  else {
    L.push("| Data | Pessoa | O quê |", "|---|---|---|");
    for (const p of r.proximos) L.push(`| ${br.fmt(p.data)} (${br.diaSemana(p.data)}) | [${celula(p.nome)}](${p.slug}.md) | ${celula(p.oque)} |`);
    L.push("");
  }

  L.push("## Todo mundo", "");
  if (!r.pessoas.length) L.push("Nenhuma ficha válida ainda. A primeira nasce com `node scripts/pessoas.js nova \"Nome\" --papel cliente`.", "");
  else {
    L.push("Ordenado por quem está há mais tempo sem contato.", "");
    L.push("| Pessoa | Papel | Empresa | Último contato | Dias | Próximo passo |", "|---|---|---|---|---|---|");
    for (const p of r.pessoas) {
      L.push(`| [${celula(p.nome)}](${p.slug}.md) | ${p.papel} | ${celula(p.empresa)} | ${p.ultimo ? br.fmt(p.ultimo) : "?"} | ${p.dias ?? "?"} | ${p.naoContatar ? "não contatar" : celula(p.proximo) + (p.ate ? ` (até ${br.fmt(p.ate)})` : "")} |`);
    }
    L.push("");
  }

  L.push("## Pediram pra não receber", "");
  if (!r.naoContatar.length) L.push("Ninguém com `nao_contatar: sim`.", "");
  else {
    L.push("Ficam fora de qualquer lista, transmissão ou sequência. Quem lê `vendas/prospeccao/nao-contatar.md` encontra os mesmos nomes lá.", "");
    for (const p of r.naoContatar) L.push(`- [${celula(p.nome)}](${p.slug}.md)${p.canal ? ` · ${celula(p.canal)}` : ""}`);
    L.push("");
  }

  L.push("## Fichas com problema", "");
  if (!r.problemas.length) L.push("Nenhum. Todo campo obrigatório preenchido e toda data válida.", "");
  else for (const p of r.problemas) for (const a of p.avisos) L.push(`- \`${p.slug}.md\`: ${a}`);
  L.push("");
  return L.join("\n");
}

// ─────────────────────────── nova ficha ───────────────────────────

function esqueletoFicha(dados, hoje) {
  const fm = escreverFrontmatter(dados);
  const corpo = [
    "",
    `# ${dados.nome}`,
    "",
    "## Quem é",
    "",
    "[uma ou duas linhas: o que faz, como fala, o que já comprou ou o que já fizemos juntos]",
    "",
    "## O que não reexplicar",
    "",
    "- [o que ele já disse que gosta, odeia, ou já decidiu: prazo, formato, horário, jeito de ser tratado]",
    "",
    "## Histórico",
    "",
    "| Data | Canal | O que aconteceu | Fonte |",
    "|---|---|---|---|",
    `| ${br.fmt(br.lerData(dados.ultimo_contato) || hoje)} | ${dados.canal ? dados.canal.split(" ")[0] : "?"} | primeiro registro${dados.como_chegou ? ": " + dados.como_chegou : ""} | |`,
    "",
    "---",
    "",
    `Base legal (LGPD, Lei 13.709/2018, art. 7º): \`${dados.base_legal || "[a confirmar]"}\`. Guarda só o que a relação precisa. Se pedir pra sair, \`nao_contatar: sim\` no mesmo dia; se pedir pra apagar, o arquivo sai.`,
    "",
  ];
  return fm + "\n" + corpo.join("\n");
}

function nova(o, hoje) {
  const nome = o._[1];
  if (!nome) morrer("faltou o nome", 'node scripts/pessoas.js nova "Carla Mendes" --papel cliente');
  const papel = o.papel || "";
  if (!papel) morrer("faltou --papel", `um de: ${PAPEIS.join(", ")}`);
  if (!PAPEIS.includes(papel)) morrer(`papel "${papel}" não existe`, `use um de: ${PAPEIS.join(", ")}`);
  if (o["base-legal"] && !BASES_LEGAIS.includes(o["base-legal"])) morrer(`base legal "${o["base-legal"]}" não existe`, `use uma de: ${BASES_LEGAIS.join(", ")}`);
  const pasta = o.pasta || "pessoas";
  const slug = br.slug(nome);
  if (!slug) morrer(`não consegui fazer um slug de "${nome}"`);
  const arquivo = path.join(pasta, `${slug}.md`);
  if (fs.existsSync(arquivo)) morrer(`${arquivo} já existe`, "registre o contato nela: node scripts/pessoas.js contato " + slug + ' --resumo "..."');
  const data = o.data ? br.lerData(o.data) : hoje;
  if (!data) morrer(`--data "${o.data}" não é uma data válida`, "use DD/MM/AAAA ou AAAA-MM-DD");
  if (data > hoje) morrer(`--data ${br.fmt(data)} está no futuro`, "--data é a última conversa que já aconteceu");
  const ate = o.ate ? br.lerData(o.ate) : null;
  if (o.ate && !ate) morrer(`--ate "${o.ate}" não é uma data válida`, "use DD/MM/AAAA ou AAAA-MM-DD");
  const renovacao = o.renovacao ? br.lerData(o.renovacao) : null;
  if (o.renovacao && !renovacao) morrer(`--renovacao "${o.renovacao}" não é uma data válida`, "use AAAA-MM-DD");
  let aniversario = "";
  if (o.aniversario) {
    const dt = br.lerData(String(o.aniversario).replace(/\/\d{4}$/, ""), 2024);
    if (!dt || !/^\d{1,2}\/\d{1,2}(\/\d{4})?$/.test(String(o.aniversario))) morrer(`--aniversario "${o.aniversario}" não é uma data`, "use DD/MM, sem ano");
    aniversario = br.ddmm(dt);
  }
  if (o.ritmo && (!/^\d+$/.test(String(o.ritmo)) || Number(o.ritmo) < 1)) morrer(`--ritmo "${o.ritmo}" precisa ser um número de dias a partir de 1`);
  if (ate && !o.proximo) morrer("--ate sem --proximo", "a data só vira vácuo com o próximo passo escrito: passe --proximo \"o que fazer\"");
  const dados = {
    nome, papel, empresa: o.empresa || "", como_chegou: o["como-chegou"] || "", canal: o.canal || "",
    o_que_importa: o.importa || "", ultimo_contato: br.iso(data), ritmo_dias: o.ritmo || "",
    proximo_passo: o.proximo || "", proximo_passo_ate: ate ? br.iso(ate) : "",
    eu_prometi: [], me_prometeu: [], aniversario, renovacao: renovacao ? br.iso(renovacao) : "",
    base_legal: o["base-legal"] || "", nao_contatar: "",
  };
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(arquivo, esqueletoFicha(dados, hoje));
  const f = lerFicha(arquivo);
  console.log(`✓ Ficha: ${arquivo}`);
  if (f.avisos.length) for (const a of f.avisos) console.log(`  ⚠ ${a}`);
  console.log("  Preencher \"Quem é\" e \"O que não reexplicar\" e rodar: node scripts/pessoas.js indice");
  return arquivo;
}

// ─────────────────────────── registrar contato ───────────────────────────

function registrarContato(o, hoje) {
  const slug = o._[1];
  if (!slug) morrer("faltou o slug da pessoa", 'node scripts/pessoas.js contato carla-mendes --resumo "mandei o orçamento"');
  const pasta = o.pasta || "pessoas";
  const arquivo = path.join(pasta, `${slug}.md`);
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`, "crie com: node scripts/pessoas.js nova \"Nome\" --papel ...");
  if (!o.resumo && !o.prometi && !o.prometeu && !o.proximo && !o.cumpri && !o.cumpriu && !o["nao-contatar"]) morrer("nada pra registrar", "passe --resumo, --prometi, --prometeu, --proximo, --cumpri, --cumpriu ou --nao-contatar");
  const data = o.data ? br.lerData(o.data) : hoje;
  if (!data) morrer(`--data "${o.data}" não é uma data válida`);
  if (data > hoje) morrer(`--data ${br.fmt(data)} está no futuro`, "contato se registra depois que aconteceu");
  const texto = fs.readFileSync(arquivo, "utf8");
  const { dados, corpo, avisos } = lerFrontmatter(texto);
  if (!dados) morrer(`${arquivo} não tem frontmatter`, "a ficha precisa começar com --- ; veja templates/operacao/pessoa.md");
  for (const c of CAMPOS_LISTA) if (!Array.isArray(dados[c])) dados[c] = dados[c] ? [dados[c]] : [];

  const mudou = [];
  if (o.resumo) {
    const atual = dados.ultimo_contato ? br.lerData(dados.ultimo_contato) : null;
    if (!atual || data > atual) { dados.ultimo_contato = br.iso(data); mudou.push(`ultimo_contato → ${br.fmt(data)}`); }
  }
  if (o.canal && typeof o.canal === "string" && !dados.canal) { dados.canal = o.canal; mudou.push(`canal → ${o.canal}`); }
  if (o.proximo) { dados.proximo_passo = o.proximo; mudou.push(`proximo_passo → "${o.proximo}"`); }
  if (o.ate) {
    const dt = br.lerData(o.ate); if (!dt) morrer(`--ate "${o.ate}" não é uma data válida`);
    dados.proximo_passo_ate = br.iso(dt); mudou.push(`proximo_passo_ate → ${br.fmt(dt)}`);
  }
  const semAno = [];
  for (const [flag, campo] of [["prometi", "eu_prometi"], ["prometeu", "me_prometeu"]]) {
    if (!o[flag]) continue;
    dados[campo].push(o[flag]);
    mudou.push(`${campo} + "${o[flag]}"`);
    const m = String(o[flag]).match(/\bat[ée]\s+(\d{1,2}\/\d{1,2})(?![\d/])/i);
    if (m) semAno.push(`"até ${m[1]}" sem o ano: escreva "até ${m[1]}/${data.getFullYear()}" ou a conta erra na virada do ano`);
  }
  if (o.cumpri) {
    const n = dados.eu_prometi.length; dados.eu_prometi = dados.eu_prometi.filter((p) => !p.toLowerCase().includes(String(o.cumpri).toLowerCase()));
    if (dados.eu_prometi.length === n) morrer(`nenhuma promessa minha contém "${o.cumpri}"`, `abertas: ${dados.eu_prometi.map((p) => `"${p}"`).join(", ") || "nenhuma"}`);
    mudou.push(`eu_prometi − "${o.cumpri}"`);
  }
  if (o.cumpriu) {
    const n = dados.me_prometeu.length; dados.me_prometeu = dados.me_prometeu.filter((p) => !p.toLowerCase().includes(String(o.cumpriu).toLowerCase()));
    if (dados.me_prometeu.length === n) morrer(`nenhuma promessa dele contém "${o.cumpriu}"`, `abertas: ${dados.me_prometeu.map((p) => `"${p}"`).join(", ") || "nenhuma"}`);
    mudou.push(`me_prometeu − "${o.cumpriu}"`);
  }
  if (o["nao-contatar"]) { dados.nao_contatar = "sim"; dados.proximo_passo = ""; dados.proximo_passo_ate = ""; mudou.push("nao_contatar → sim (próximo passo apagado)"); }

  // linha no histórico
  let novoCorpo = corpo;
  let trocouSemente = false;
  const cumpridas = [];
  if (o.cumpri) cumpridas.push(`cumpri: ${o.cumpri}`);
  if (o.cumpriu) cumpridas.push(`ela cumpriu: ${o.cumpriu}`);
  const resumo = o.resumo || (o["nao-contatar"] ? "pediu pra não receber mais mensagem" : cumpridas.join("; "));
  if (resumo) {
    const linha = `| ${br.fmt(data)} | ${celula(o.canal || (dados.canal || "?").split(" ")[0])} | ${celula(resumo)} | ${celula(o.fonte || "")} |`;
    const idx = novoCorpo.indexOf("## Histórico");
    if (idx < 0) {
      const bloco = `## Histórico\n\n| Data | Canal | O que aconteceu | Fonte |\n|---|---|---|---|\n${linha}\n`;
      novoCorpo = /\n---\n/.test(novoCorpo) ? novoCorpo.replace(/\n---\n/, `\n${bloco}\n---\n`) : novoCorpo.replace(/\s*$/, "\n\n") + bloco;
    }
    else {
      // acha o fim da tabela do histórico e insere a linha ali
      const depois = novoCorpo.slice(idx);
      const linhas = depois.split("\n");
      let fim = 0; let viuTabela = false;
      for (let i = 1; i < linhas.length; i++) {
        if (linhas[i].startsWith("|")) { viuTabela = true; fim = i; }
        else if (viuTabela && linhas[i].trim() === "") break;
        else if (viuTabela) break;
      }
      if (!viuTabela) { linhas.splice(1, 0, "", "| Data | Canal | O que aconteceu | Fonte |", "|---|---|---|---|", linha); }
      else {
        // a linha-semente que o `nova` escreve ("primeiro registro") cede o lugar ao
        // primeiro contato de verdade da mesma data: o "como chegou" já mora no frontmatter
        const semente = linhas.findIndex((l, i) => i > 0 && l.startsWith(`| ${br.fmt(data)} |`) && /\|\s*primeiro registro/.test(l));
        if (semente > 0 && o.resumo) { linhas[semente] = linha; trocouSemente = true; }
        else linhas.splice(fim + 1, 0, linha);
      }
      novoCorpo = novoCorpo.slice(0, idx) + linhas.join("\n");
    }
    mudou.push(trocouSemente ? "histórico: primeiro registro virou este contato" : "histórico + 1 linha");
  }
  if (o["nao-contatar"]) {
    const lista = path.join("vendas", "prospeccao", "nao-contatar.md");
    const chave = (dados.canal || dados.nome).trim();
    let atual = fs.existsSync(lista) ? fs.readFileSync(lista, "utf8") : "# Não contatar\n\nQuem pediu pra não receber mensagem. Nenhuma lista nasce sem ler este arquivo.\n\n";
    if (!atual.includes(chave)) {
      fs.mkdirSync(path.dirname(lista), { recursive: true });
      const semFim = atual.replace(/\s*$/, "");
      const sep = /(^|\n)- [^\n]*$/.test(semFim) ? "\n" : "\n\n";
      fs.writeFileSync(lista, semFim + sep + `- ${dados.nome}${dados.canal ? " · " + dados.canal : ""} · pediu em ${br.fmt(data)} · ficha: pessoas/${slug}.md\n`);
      mudou.push(`${lista} + 1 linha`);
    }
  }
  fs.writeFileSync(arquivo, escreverFrontmatter(dados) + "\n" + (novoCorpo.startsWith("\n") ? novoCorpo : "\n" + novoCorpo));
  console.log(`✓ ${arquivo}`);
  for (const m of mudou) console.log(`  ${m}`);
  for (const a of semAno) console.log(`  ⚠ ${a}`);
  for (const a of avisos) console.log(`  ⚠ ${a}`);
  return { arquivo, mudou };
}

// ─────────────────────────── linha de comando ───────────────────────────

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const prox = argv[i + 1];
      if (prox !== undefined && !prox.startsWith("--")) { o[k] = prox; i++; } else o[k] = true;
    } else o._.push(a);
  }
  return o;
}

function ajuda() {
  console.log(`Contex OS — pessoas.js

  node scripts/pessoas.js indice [pessoas/] [--hoje AAAA-MM-DD] [--janela 30] [--json]
  node scripts/pessoas.js vacuo  [pessoas/] [--hoje AAAA-MM-DD]
  node scripts/pessoas.js nova "Nome" --papel <${PAPEIS.join("|")}> [--empresa X] [--canal "whatsapp +55..."] [--como-chegou "..."]
                          [--importa "o que pesa pra ela decidir"] [--data DD/MM/AAAA da última conversa] [--proximo "..." --ate DD/MM/AAAA]
                          [--ritmo <dias>] [--aniversario DD/MM] [--renovacao AAAA-MM-DD] [--base-legal <${BASES_LEGAIS.join("|")}>]
  node scripts/pessoas.js contato <slug> --resumo "..." [--canal whatsapp] [--data DD/MM/AAAA] [--fonte arquivo.md] [--proximo "..." --ate DD/MM/AAAA] [--prometi "... até DD/MM/AAAA"] [--prometeu "..."] [--cumpri "trecho"] [--cumpriu "trecho"] [--nao-contatar]
  node scripts/pessoas.js conferir [pessoas/]

  --pasta <pasta>   onde as fichas moram (padrão: pessoas/)`);
}

function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  if (!cmd || o.ajuda || o.help) return ajuda();
  const hoje = o.hoje ? br.lerData(o.hoje) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  if (!hoje) morrer(`--hoje "${o.hoje}" não é uma data válida`, "use AAAA-MM-DD");
  const janela = o.janela ? Number(o.janela) : 30;
  if (!Number.isInteger(janela) || janela < 0) morrer(`--janela "${o.janela}" precisa ser um número de dias`);

  if (cmd === "nova") return nova(o, hoje);
  if (cmd === "contato") return registrarContato(o, hoje);

  const pasta = o.pasta || o._[1] || "pessoas";
  if (!["indice", "vacuo", "conferir"].includes(cmd)) morrer(`comando "${cmd}" não existe`, "indice, vacuo, nova, contato ou conferir");
  if (!fs.existsSync(pasta)) morrer(`não achei a pasta ${pasta}`, 'a primeira ficha nasce com: node scripts/pessoas.js nova "Nome" --papel cliente');
  const fichas = listarFichas(pasta).map(lerFicha);
  if (!fichas.length) morrer(`nenhuma ficha .md em ${pasta}`, 'a primeira nasce com: node scripts/pessoas.js nova "Nome" --papel cliente');
  const r = calcular(fichas, hoje, janela);

  if (cmd === "conferir") {
    if (!r.problemas.length) { console.log(`✓ ${fichas.length} ficha(s), nenhum problema.`); return; }
    for (const p of r.problemas) for (const a of p.avisos) console.log(`✖ ${p.slug}.md: ${a}`);
    process.exitCode = 1;
    return;
  }
  if (o.json) { console.log(JSON.stringify({ hoje: br.iso(hoje), ...r }, function (k, v) { return this[k] instanceof Date ? br.iso(this[k]) : v; }, 2)); return; }
  if (cmd === "vacuo") {
    console.log(`Hoje: ${br.fmt(hoje)} (${br.diaSemana(hoje)}) · ${r.pessoas.length} ficha(s)\n`);
    if (!r.vacuo.length) console.log("Ninguém no vácuo.");
    else for (const v of r.vacuo) console.log(`• ${v.nome} (${v.papel}) · ${v.motivo} → ${v.fazer}`);
    if (r.esperando.length) { console.log("\nEsperando deles:"); for (const e of r.esperando) console.log(`• ${e.nome}: "${e.promessa}"${e.ate ? (e.atraso > 0 ? ` · atrasado ${e.atraso} dia(s)` : ` · até ${br.fmt(e.ate)}`) : ""}`); }
    if (r.proximos.length) { console.log(`\nPróximos ${janela} dias:`); for (const p of r.proximos) console.log(`• ${br.fmt(p.data)} (${br.diaSemana(p.data)}) ${p.nome}: ${p.oque}`); }
    if (r.problemas.length) console.log(`\n⚠ ${new Set(r.problemas.map((p) => p.slug)).size} ficha(s) com problema: node scripts/pessoas.js conferir`);
    return;
  }
  const saida = path.join(pasta, "indice.md");
  fs.writeFileSync(saida, montarIndice(r, hoje, janela, pasta));
  const ignorados = fichas.length - r.pessoas.length;
  console.log(`✓ Índice: ${saida}`);
  console.log(`  ${r.pessoas.length} ficha(s) lida(s) · ${r.vacuo.length} no vácuo · ${r.esperando.length} esperando deles · ${r.proximos.length} data(s) nos próximos ${janela} dias · ${r.naoContatar.length} não contatar`);
  if (ignorados > 0) console.log(`  ⚠ ${ignorados} arquivo(s) sem frontmatter ou sem \`nome\`, fora da conta`);
  if (r.problemas.length) console.log(`  ⚠ ${new Set(r.problemas.map((p) => p.slug)).size} ficha(s) com problema (seção "Fichas com problema")`);
}

module.exports = { lerFrontmatter, escreverFrontmatter, lerFicha, listarFichas, calcular, montarIndice, esqueletoFicha, dataDaPromessa, proximoAniversario, RITMO_PADRAO, PAPEIS, BASES_LEGAIS, CAMPOS };

if (require.main === module) main();
