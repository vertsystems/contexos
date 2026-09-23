#!/usr/bin/env node
/**
 * Contex OS — novidades.js
 * Lê o histórico do repositório num intervalo, joga fora o que é conversa
 * interna e devolve as mudanças agrupadas em Novo / Melhorado / Corrigido,
 * mais a lista do que não deu pra classificar sozinho.
 *
 * Existe porque contar novidade pro cliente sempre trava no mesmo ponto: o dono
 * abre o histórico, vê "chore: bump deps" e "fix: null check no checkout", e
 * fecha. O filtro não é opinião: prefixo convencional (feat, fix, chore, test,
 * refactor) e caminho de arquivo dizem, por comando, o que nunca deveria ir pro
 * texto. O que sobra ainda precisa de gente: quem escreve é o assistente, com a
 * frase de impacto, e este script confere que ela existe e que o jargão saiu.
 *
 * Uso:
 *   node scripts/novidades.js ler --repo <caminho> --dias 7
 *   node scripts/novidades.js ler --repo <caminho> --desde v1.3.0 --ate v1.4.0
 *   node scripts/novidades.js ler --repo <caminho> --desde 01/09/2026
 *   node scripts/novidades.js ler --log <git-log.txt>
 *   node scripts/novidades.js conferir <CHANGELOG.md> [<commits.json>]
 *   node scripts/novidades.js mensagem <whatsapp.md> [--linhas 5]
 *   node scripts/novidades.js formato
 *
 * Opções:
 *   --json          saída em JSON (é o que vira commits.json na pasta da peça)
 *   --salvar <arq>  grava o JSON no arquivo
 *   --tudo          mostra também os descartados, um por um
 *   --linhas <n>    no `mensagem`, muda o teto de linhas (padrão 5)
 *
 * O formato de git log que o `ler --log` espera está no comando `formato`.
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const br = require("./br.js");

const RS = "\x1e"; // separa commit
const FS_ = "\x1f"; // separa campo

const FORMATO_LOG = `--no-merges --date=short --pretty=format:%x1e%H%x1f%ad%x1f%an%x1f%s --name-only`;

/** Prefixo convencional → gaveta do cliente. Fonte: conventionalcommits.org/en/v1.0.0 */
const TIPOS = {
  feat: "Novo", feature: "Novo", add: "Novo",
  fix: "Corrigido", bugfix: "Corrigido", hotfix: "Corrigido",
  perf: "Melhorado", improve: "Melhorado", melhoria: "Melhorado",
  ui: "Melhorado", ux: "Melhorado",
};

/** Prefixo que é conversa entre quem programa. Nunca vira novidade. */
const INTERNOS = new Set([
  "chore", "test", "tests", "testes", "ci", "build", "refactor", "refac", "refatora",
  "style", "deps", "dep", "dependencies", "docs", "doc", "lint", "typo", "wip",
  "config", "infra", "release", "bump", "version", "cleanup", "merge", "format",
]);

/** Prefixo que o dono precisa olhar na mão: reverter pode desfazer coisa anunciada. */
const REVISAR = new Set(["revert", "reverte"]);

/**
 * Assunto que não diz o que mudou. Sem prefixo convencional, chutar a gaveta
 * por "ajust" é pior que perguntar: vai pro dono decidir com o texto original.
 */
const VAGOS = [
  /^(v[a-z]*ri[ao]s? |algum[ao]s? |uns |umas )?(ajustes?|corre[cç][oõ]es?|melhorias?|altera[cç][oõ]es?|mudan[cç]as?|atualiza[cç][oõ]es?|coisas?|detalhes?)( gerais| geral| diversos| diversas| variad[ao]s| finais| pequen[ao]s| r[aá]pid[ao]s| no c[oó]digo| no sistema| no projeto| no site| no app)?$/,
  /^(wip|tmp|temp|teste|testes|rascunho|x+|a+|z+|\.+|-+)\b/,
  /^(salva|salvando|subindo|commit|commitando|push|primeiro commit|initial commit)\b/,
];

/** true quando o assunto não diz nada a quem lê de fora. */
function assuntoVago(texto) {
  const t = semAcentoMin(texto).replace(/[.!…\s]+$/, "").trim();
  if (!t) return true;
  return VAGOS.some((re) => re.test(t));
}

/** Caminho que, sozinho, não muda nada pra quem usa. */
const CAMINHOS_INTERNOS = [
  /(^|\/)(test|tests|spec|specs|__tests__|e2e|cypress|playwright|fixtures)(\/|$)/i,
  /\.(test|spec)\.[a-z0-9]+$/i,
  /(^|\/)\.(github|vscode|husky|idea|circleci)(\/|$)/i,
  /(^|\/)(docs?|documentation)(\/|$)/i,
  /(package-lock\.json|yarn\.lock|pnpm-lock\.ya?ml|composer\.lock|Gemfile\.lock|poetry\.lock|go\.sum)$/i,
  /(^|\/)(\.gitignore|\.gitattributes|\.editorconfig|\.nvmrc|\.env\.example)$/i,
  /(^|\/)(\.prettierrc[^/]*|\.eslintrc[^/]*|eslint\.config\.[a-z]+|tsconfig[^/]*\.json)$/i,
  /(^|\/)(jest|vitest|playwright|cypress|rollup|webpack)\.config\.[a-z]+$/i,
  /(^|\/)(Dockerfile|docker-compose\.ya?ml|\.dockerignore|Makefile|Procfile)$/i,
  /(^|\/)(CHANGELOG|README|CONTRIBUTING|LICENSE|AGENTS|CLAUDE|SECURITY)\.(md|txt)$/i,
];

/** Palavra que só quem programa entende. Se sobrou no texto do cliente, é erro. */
const JARGAO = [
  "endpoint", "endpoints", "deploy", "commit", "commits", "refactor", "refatorar",
  "cache", "query", "queries", "branch", "merge", "bug", "bugs", "api", "backend",
  "frontend", "timeout", "null", "undefined", "log", "logs", "hotfix", "patch",
  "middleware", "webhook", "payload", "token", "migration", "migrações", "schema",
  "regex", "async", "callback", "typo", "build", "release", "rollback", "lint",
  "repositório", "pull request", "front-end", "back-end", "banco de dados",
];

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function semAcentoMin(s) { return br.semAcento(String(s || "")).toLowerCase(); }

/** Palavras com mais de 3 letras, sem acento, sem pontuação. */
function palavras(s) {
  return semAcentoMin(s).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
}

// ─────────────────────────── ler o histórico ───────────────────────────

/** Monta os argumentos de intervalo do git log a partir das opções. */
function intervaloGit(op) {
  const args = [];
  const criterio = [];
  const dataDesde = op.desde ? br.lerData(op.desde) : null;
  const dataAte = op.ate ? br.lerData(op.ate) : null;

  if (op.dias) {
    const n = Math.round(br.numero(op.dias));
    if (!isFinite(n) || n <= 0) morrer(`--dias precisa ser um número de dias, recebi "${op.dias}"`);
    const inicio = br.mais(new Date(), -n);
    args.push(`--since=${br.iso(inicio)}`);
    criterio.push(`últimos ${n} dias (desde ${br.fmt(inicio)})`);
  }
  if (dataDesde) { args.push(`--since=${br.iso(dataDesde)}`); criterio.push(`desde ${br.fmt(dataDesde)}`); }
  if (dataAte) { args.push(`--until=${br.iso(dataAte)}`); criterio.push(`até ${br.fmt(dataAte)}`); }
  if (op.desde && !dataDesde) {
    const ate = op.ate && !dataAte ? op.ate : "HEAD";
    args.push(`${op.desde}..${ate}`);
    criterio.push(`de ${op.desde} até ${ate}`);
  } else if (op.ate && !dataAte) {
    args.push(op.ate);
    criterio.push(`até ${op.ate}`);
  }
  if (!args.length) morrer("preciso de um intervalo", "use --dias 7, --desde <tag>, ou --desde 01/09/2026");
  return { args, criterio: criterio.join(", ") };
}

/** Roda git log no repositório e devolve o texto cru. */
function gitLog(repo, op) {
  if (!fs.existsSync(repo)) morrer(`não achei o repositório em ${repo}`);
  const { args, criterio } = intervaloGit(op);
  const base = FORMATO_LOG.split(" ");
  let saida;
  try {
    saida = execFileSync("git", ["-C", repo, "log", ...base, ...args], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    const bruto = String((e && e.stderr) || (e && e.message) || "").trim();
    const erro = bruto.split("\n")[0].replace(/^fatal:\s*/i, "").trim();
    if (/not a git repository/i.test(bruto)) morrer(`${repo} não é um repositório git`, "aponte --repo pra pasta onde o código está versionado");
    if (/unknown revision|bad revision|ambiguous argument/i.test(bruto)) morrer(`o git não conhece essa referência: ${erro}`, "confira o nome da tag com: git -C <repo> tag --sort=-creatordate | head");
    morrer(`o git falhou: ${erro || "sem mensagem"}`);
  }
  return { texto: saida, criterio };
}

/** Texto do git log (no formato do comando `formato`) → lista de commits crus. */
function lerLog(texto) {
  const commits = [];
  for (const bloco of String(texto).split(RS)) {
    if (!bloco.trim()) continue;
    const linhas = bloco.split("\n");
    const campos = linhas.shift().split(FS_);
    if (campos.length < 4) continue;
    const [sha, data, autor, ...resto] = campos;
    commits.push({
      sha: sha.trim().slice(0, 7),
      data: data.trim(),
      autor: autor.trim(),
      assunto: resto.join(FS_).trim(),
      arquivos: linhas.map((l) => l.trim()).filter(Boolean),
    });
  }
  return commits;
}

/** "feat(checkout)!: aceita Pix" → tipo, escopo, quebra, assunto limpo. */
function parsePrefixo(assunto) {
  const m = String(assunto).match(/^\s*([a-zA-Zçã]+)\s*(?:\(([^)]*)\))?\s*(!)?\s*:\s*(.+)$/);
  if (!m) return { tipo: null, escopo: null, quebra: /BREAKING[ -]CHANGE/i.test(assunto), texto: String(assunto).trim() };
  return {
    tipo: semAcentoMin(m[1]),
    escopo: m[2] ? m[2].trim() : null,
    quebra: Boolean(m[3]) || /BREAKING[ -]CHANGE/i.test(assunto),
    texto: m[4].trim(),
  };
}

function caminhoInterno(p) { return CAMINHOS_INTERNOS.some((re) => re.test(p)); }

/** Sem prefixo convencional: tenta pela palavra, e avisa que a confiança é baixa. */
function porPalavra(texto) {
  const t = semAcentoMin(texto);
  if (/\b(corrig|correc|conserta|conserto|arrum|resolv|fix|bug|erro|falha|quebrad|trava|nao funciona|volta a funcionar)/.test(t)) return "Corrigido";
  if (/\b(adicion|cria|criou|nov[ao]|inclui|implementa|permite|habilita|libera|add|new|passa a|agora da pra)/.test(t)) return "Novo";
  if (/\b(melhor|ajust|atualiz|otimiz|acelera|reduz|simplifica|improv|faster|rapid|troca|renomeia|muda|altera|remove|aumenta|diminui)/.test(t)) return "Melhorado";
  if (/\bagora\b/.test(t)) return "Novo"; // "agora o cliente recebe lembrete": jeito mais comum de anunciar coisa nova
  return null;
}

/**
 * Classifica os commits. Devolve os três grupos, o que ficou pro dono decidir,
 * o que foi descartado (com o motivo) e os avisos.
 */
function classificar(commits, opcoes) {
  const op = opcoes || {};
  const grupos = { Novo: [], Melhorado: [], Corrigido: [] };
  const aDecidir = [];
  const descartados = [];
  const avisos = [];
  const vistos = new Map();

  for (const c of commits) {
    const p = parsePrefixo(c.assunto);
    const item = {
      sha: c.sha, data: c.data, autor: c.autor, assunto: c.assunto,
      texto: p.texto, tipo: p.tipo, escopo: p.escopo, quebra: p.quebra,
      arquivos: c.arquivos.length, exemplo: c.arquivos[0] || null,
      confianca: "alta", motivo: null, grupo: null,
    };

    const chave = br.slug(`${p.escopo || ""} ${p.texto}`) || c.sha;
    if (vistos.has(chave)) {
      item.grupo = "descartado";
      item.motivo = `mesma mudança já listada (${vistos.get(chave)})`;
      descartados.push(item);
      continue;
    }
    vistos.set(chave, c.sha);

    if (p.tipo && INTERNOS.has(p.tipo)) {
      item.grupo = "descartado";
      item.motivo = `prefixo ${p.tipo}: conversa interna`;
      descartados.push(item);
      continue;
    }
    if (p.tipo && REVISAR.has(p.tipo)) {
      item.grupo = "a decidir";
      item.confianca = "baixa";
      item.motivo = "desfaz alguma coisa: confira se o cliente já tinha visto";
      aDecidir.push(item);
      continue;
    }
    if (!p.quebra && c.arquivos.length && c.arquivos.every(caminhoInterno)) {
      item.grupo = "descartado";
      item.motivo = `só mexeu em arquivo de bastidor (${c.arquivos[0]})`;
      descartados.push(item);
      continue;
    }

    let grupo = p.tipo ? TIPOS[p.tipo] : null;
    if (grupo) {
      item.grupo = grupo;
      grupos[grupo].push(item);
      continue;
    }
    if (assuntoVago(p.texto)) {
      item.grupo = "a decidir";
      item.confianca = "baixa";
      item.motivo = `o assunto não diz o que mudou ("${p.texto}"): só quem escreveu sabe`;
      aDecidir.push(item);
      continue;
    }
    grupo = porPalavra(p.texto);
    if (grupo) {
      item.grupo = grupo;
      item.confianca = "média";
      item.motivo = "sem prefixo: li pela palavra, confirme a gaveta";
      grupos[grupo].push(item);
      continue;
    }
    item.grupo = "a decidir";
    item.confianca = "baixa";
    item.motivo = "não reconheci nem o prefixo nem a palavra";
    aDecidir.push(item);
  }

  // Conserto de coisa que nasceu na mesma janela: o cliente nunca viu o defeito.
  const escoposNovos = new Set(grupos.Novo.map((i) => i.escopo).filter(Boolean));
  for (const i of grupos.Corrigido) {
    if (i.escopo && escoposNovos.has(i.escopo)) {
      i.motivo = `conserto de "${i.escopo}", que entrou no mesmo intervalo: talvez o cliente nunca tenha visto o problema`;
      avisos.push(`${i.sha} conserta "${i.escopo}", criado nesse mesmo intervalo. Se o defeito não chegou ao cliente, não anuncie.`);
    }
  }
  for (const i of [...grupos.Novo, ...grupos.Melhorado, ...grupos.Corrigido]) {
    if (i.quebra) avisos.push(`${i.sha} muda o jeito de usar (marcado com "!" ou BREAKING CHANGE). Isso vai num bloco próprio, com data e o que o cliente precisa fazer.`);
  }
  if (!grupos.Novo.length && !grupos.Melhorado.length && !grupos.Corrigido.length) {
    avisos.push("nenhuma mudança visível pro cliente nesse intervalo. Publicar novidade sem novidade é pior que não publicar.");
  }

  return {
    gerado_em: br.iso(new Date()),
    intervalo: op.criterio || null,
    repo: op.repo || null,
    total_commits: commits.length,
    por_grupo: { Novo: grupos.Novo.length, Melhorado: grupos.Melhorado.length, Corrigido: grupos.Corrigido.length },
    classificados: grupos.Novo.length + grupos.Melhorado.length + grupos.Corrigido.length,
    grupos, a_decidir: aDecidir, descartados, avisos,
  };
}

// ─────────────────────────── conferir o texto ───────────────────────────

const SECOES = /^#{2,3}\s*(novo|melhorado|corrigido|muda o seu jeito de usar|nao entrou|não entrou)/i;

/** Achata o item de lista: "- **X** — Y" → { titulo, impacto, linha }. */
function partirItem(linha) {
  const corpo = linha.replace(/^\s*[-*]\s+/, "").trim();
  const partes = corpo.split(/\s+—\s+/);
  return { titulo: partes[0] || "", impacto: partes.slice(1).join(" — ").trim(), bruto: corpo };
}

/**
 * Confere o CHANGELOG.md do cliente: frase de impacto em cada item, jargão
 * fora, e nenhuma mudança classificada desaparecida no caminho.
 */
function conferir(md, dados) {
  const erros = [];
  const avisos = [];
  const linhas = String(md).split("\n");
  let secao = null;
  let emCodigo = false;
  const itens = [];
  const secoesVistas = new Set();

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (/^\s*```/.test(l)) { emCodigo = !emCodigo; continue; }
    if (emCodigo) continue;
    const m = l.match(SECOES);
    if (m) { secao = semAcentoMin(m[1]); secoesVistas.add(secao); continue; }
    if (/^#{1,6}\s/.test(l)) { secao = null; continue; }
    if (secao && /^\s*[-*]\s+\S/.test(l)) itens.push({ ...partirItem(l), secao, n: i + 1 });
  }

  if (!itens.length) erros.push("não achei nenhum item nas seções Novo, Melhorado, Corrigido ou Não entrou");

  for (const it of itens) {
    const rotulo = `linha ${it.n}`;
    if (it.secao === "nao entrou") continue;
    if (!it.impacto) {
      erros.push(`${rotulo}: item sem frase de impacto. O formato é "- **o que mudou** — o que isso muda pro cliente"`);
    } else if (palavras(it.impacto).length < 4) {
      erros.push(`${rotulo}: a frase de impacto tem ${palavras(it.impacto).length} palavra(s) de conteúdo. Diga o que muda no dia do cliente`);
    }
    const achado = JARGAO.filter((j) => new RegExp(`(^|[^a-zà-ú])${j.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zà-ú]|$)`, "i").test(it.bruto));
    if (achado.length) erros.push(`${rotulo}: palavra de quem programa no texto do cliente: ${achado.join(", ")}`);
  }

  if (dados && dados.grupos) {
    const classificados = dados.classificados || 0;
    const naSecao = itens.filter((it) => it.secao !== "nao entrou").length;
    const naoEntrou = itens.filter((it) => it.secao === "nao entrou").length;
    if (naSecao + naoEntrou < classificados) {
      erros.push(`${classificados} mudanças foram classificadas e o arquivo mostra ${naSecao + naoEntrou} (${naSecao} em seção, ${naoEntrou} em "Não entrou"). Toda mudança aparece, ou como item, ou na lista do que não entrou`);
    }
    const todos = [...dados.grupos.Novo, ...dados.grupos.Melhorado, ...dados.grupos.Corrigido];
    const quebram = [...todos, ...(dados.a_decidir || [])].filter((c) => c.quebra);
    if (quebram.length && !secoesVistas.has("muda o seu jeito de usar")) {
      const quantas = quebram.length === 1 ? "uma mudança muda" : `${quebram.length} mudanças mudam`;
      erros.push(`${quantas} o jeito de usar (${quebram.map((c) => c.sha).join(", ")}) e o arquivo não tem a seção "## Muda o seu jeito de usar". Isso vai em bloco próprio, com data e com o que o cliente precisa fazer`);
    }
    for (const c of todos) {
      const pc = palavras(c.texto);
      if (pc.length < 3) continue;
      for (const it of itens) {
        const pi = new Set(palavras(it.bruto));
        const comuns = pc.filter((w) => pi.has(w)).length;
        if (comuns / pc.length >= 0.8) {
          avisos.push(`linha ${it.n}: ainda está na língua do commit ${c.sha} ("${c.assunto}"). Reescreva pelo que o cliente sente`);
          break;
        }
      }
    }
    for (const a of dados.avisos || []) avisos.push(a);
  }

  return { erros, avisos, itens: itens.length };
}

/** Confere a mensagem curta: cinco linhas, sem jargão, com o que fazer. */
function conferirMensagem(texto, limite) {
  const max = limite || 5;
  const erros = [];
  const avisos = [];
  const linhas = String(texto).split("\n").map((l) => l.trim()).filter((l) => l && !/^#/.test(l) && !/^```/.test(l));
  if (linhas.length > max) erros.push(`a mensagem tem ${linhas.length} linhas e o limite é ${max}. No WhatsApp, o que passa disso ninguém lê`);
  if (!linhas.length) erros.push("mensagem vazia");
  const corpo = linhas.join(" ");
  const achado = JARGAO.filter((j) => new RegExp(`(^|[^a-zà-ú])${j.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zà-ú]|$)`, "i").test(corpo));
  if (achado.length) erros.push(`palavra de quem programa na mensagem: ${achado.join(", ")}`);
  const caracteres = corpo.length;
  if (caracteres > 600) avisos.push(`${caracteres} caracteres: enxugue, a mensagem boa fica abaixo de 600`);
  if (!/\?|\bveja\b|\bconfira\b|\babra\b|\bteste\b|\bentra\b|\bexperimenta\b|\bqualquer coisa\b|\bme (chama|avisa|diz)\b/i.test(corpo)) {
    avisos.push("não achei o convite do fim (o que o cliente faz com essa novidade)");
  }
  return { erros, avisos, linhas: linhas.length, caracteres };
}

// ─────────────────────────── impressão ───────────────────────────

function imprimir(r, tudo) {
  console.log(`\nHistórico lido: ${r.total_commits} registro(s)${r.intervalo ? ` — ${r.intervalo}` : ""}`);
  console.log(`Vira novidade: ${r.classificados}  ·  pro dono decidir: ${r.a_decidir.length}  ·  descartado: ${r.descartados.length}\n`);
  for (const g of ["Novo", "Melhorado", "Corrigido"]) {
    console.log(`## ${g} (${r.grupos[g].length})`);
    if (!r.grupos[g].length) console.log("   (nada)");
    for (const i of r.grupos[g]) {
      const marca = i.quebra ? " [muda o jeito de usar]" : i.confianca !== "alta" ? ` [confiança ${i.confianca}]` : "";
      console.log(`   ${i.sha} ${i.data}  ${i.texto}${marca}`);
      if (i.motivo) console.log(`      ↳ ${i.motivo}`);
    }
    console.log("");
  }
  console.log(`## Pro dono decidir (${r.a_decidir.length})`);
  if (!r.a_decidir.length) console.log("   (nada)");
  for (const i of r.a_decidir) console.log(`   ${i.sha} ${i.data}  ${i.assunto}\n      ↳ ${i.motivo}`);
  console.log("");
  if (tudo) {
    console.log(`## Descartado (${r.descartados.length})`);
    for (const i of r.descartados) console.log(`   ${i.sha} ${i.assunto}\n      ↳ ${i.motivo}`);
    console.log("");
  } else if (r.descartados.length) {
    console.log(`(${r.descartados.length} descartado(s). Use --tudo pra ver um por um.)\n`);
  }
  if (r.avisos.length) {
    console.log("## Avisos");
    for (const a of r.avisos) console.log(`   ! ${a}`);
    console.log("");
  }
}

function imprimirConferencia(r, arquivo) {
  console.log("");
  for (const e of r.erros) console.log(`✖ ${e}`);
  for (const a of r.avisos) console.log(`! ${a}`);
  if (!r.erros.length && !r.avisos.length) console.log(`✓ ${path.basename(arquivo)}: tudo certo.`);
  else if (!r.erros.length) console.log(`\n✓ ${path.basename(arquivo)}: nenhum erro, ${r.avisos.length} aviso(s) pra olhar.`);
  console.log("");
  return r.erros.length === 0;
}

// ─────────────────────────── linha de comando ───────────────────────────

function opcoes(argv) {
  const op = {};
  const livres = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") op.json = true;
    else if (a === "--tudo") op.tudo = true;
    else if (a.startsWith("--")) op[a.slice(2)] = argv[++i];
    else livres.push(a);
  }
  return { op, livres };
}

function lerJson(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);
  try { return JSON.parse(fs.readFileSync(arquivo, "utf8")); }
  catch (e) { morrer(`${arquivo} não é JSON válido: ${e.message}`); }
}

function main() {
  const { op, livres } = opcoes(process.argv.slice(2));
  const cmd = livres[0];

  if (!cmd || cmd === "ajuda" || cmd === "--ajuda") {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n/, "").replace(/\/\*\*?\n?/, "").replace(/^ \* ?/gm, ""));
    return;
  }

  if (cmd === "formato") {
    console.log(`\nO \`ler --log\` espera a saída de:\n\n  git -C <repo> log ${FORMATO_LOG} --since=2026-09-01\n\nou, entre duas tags:\n\n  git -C <repo> log ${FORMATO_LOG} v1.3.0..v1.4.0\n\nGrave num arquivo e passe com --log. Cada commit começa com \\x1e e tem\nsha, data, autor e assunto separados por \\x1f, seguidos dos arquivos mexidos.\n`);
    return;
  }

  if (cmd === "ler") {
    let texto, criterio = null;
    if (op.log) {
      if (!fs.existsSync(op.log)) morrer(`não achei ${op.log}`);
      texto = fs.readFileSync(op.log, "utf8");
      criterio = `arquivo ${path.basename(op.log)}`;
    } else if (op.repo) {
      const g = gitLog(op.repo, op);
      texto = g.texto;
      criterio = g.criterio;
    } else {
      morrer("preciso saber de onde ler o histórico", "use --repo <caminho> --dias 7, ou --log <git-log.txt> (veja: node scripts/novidades.js formato)");
    }
    const commits = lerLog(texto);
    if (!commits.length) {
      if (op.log) morrer(`não achei commit nenhum em ${path.basename(op.log)}`, "o arquivo está vazio ou fora do formato esperado. Veja: node scripts/novidades.js formato");
      morrer("não achei commit nenhum nesse intervalo", "confira o intervalo, ou rode com --dias maior");
    }
    const blocos = String(texto).split(RS).filter((b) => b.trim()).length;
    if (blocos > commits.length) {
      console.error(`! ${blocos - commits.length} bloco(s) do histórico não vieram no formato esperado e ficaram de fora. Veja: node scripts/novidades.js formato`);
    }
    const r = classificar(commits, { criterio, repo: op.repo || null });
    if (op.salvar) {
      try {
        const pasta = path.dirname(path.resolve(op.salvar));
        fs.mkdirSync(pasta, { recursive: true });
        fs.writeFileSync(op.salvar, JSON.stringify(r, null, 2));
      } catch (e) {
        morrer(`não consegui gravar ${op.salvar}: ${e.message}`, "confira se a pasta é gravável, ou passe outro caminho em --salvar");
      }
      console.log(`✓ ${op.salvar}`);
    }
    if (op.json) console.log(JSON.stringify(r, null, 2));
    else imprimir(r, op.tudo);
    return;
  }

  if (cmd === "conferir") {
    const md = livres[1];
    if (!md) morrer("uso: node scripts/novidades.js conferir <CHANGELOG.md> [<commits.json>]");
    if (!fs.existsSync(md)) morrer(`não achei ${md}`);
    const jsonPadrao = path.join(path.dirname(md), "commits.json");
    const dj = livres[2] || (fs.existsSync(jsonPadrao) ? jsonPadrao : null);
    const dados = dj ? lerJson(dj) : null;
    if (!dados) console.log("\n(sem commits.json ao lado: conferi só o texto, não a cobertura)");
    const r = conferir(fs.readFileSync(md, "utf8"), dados);
    if (op.json) { console.log(JSON.stringify(r, null, 2)); process.exit(r.erros.length ? 1 : 0); }
    process.exit(imprimirConferencia(r, md) ? 0 : 1);
  }

  if (cmd === "mensagem") {
    const arq = livres[1];
    if (!arq) morrer("uso: node scripts/novidades.js mensagem <whatsapp.md> [--linhas 5]");
    if (!fs.existsSync(arq)) morrer(`não achei ${arq}`);
    const r = conferirMensagem(fs.readFileSync(arq, "utf8"), op.linhas ? Math.round(br.numero(op.linhas)) : 5);
    console.log(`\n${r.linhas} linha(s), ${r.caracteres} caracteres`);
    if (op.json) { console.log(JSON.stringify(r, null, 2)); process.exit(r.erros.length ? 1 : 0); }
    process.exit(imprimirConferencia(r, arq) ? 0 : 1);
  }

  morrer(`não entendi "${cmd}"`, "comandos: ler, conferir, mensagem, formato");
}

module.exports = { lerLog, parsePrefixo, classificar, conferir, conferirMensagem, porPalavra, caminhoInterno, assuntoVago, JARGAO, TIPOS, INTERNOS, VAGOS, FORMATO_LOG };

if (require.main === module) main();
