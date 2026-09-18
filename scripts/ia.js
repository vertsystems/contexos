#!/usr/bin/env node
/**
 * ia.js — deixa o workspace inteiro no formato da IA que o usuário usa.
 *
 *   node scripts/ia.js claude    Claude Code:  CLAUDE.md + .claude/skills/
 *   node scripts/ia.js codex     Codex:        AGENTS.md + .agents/skills/
 *   node scripts/ia.js status    qual formato está ativo, e se sobrou pedaço do outro
 *
 * O Contex OS é publicado no formato do Claude Code. Na instalação o usuário diz
 * qual IA está usando, e este script converte tudo pro formato dela: a pasta de
 * skills, o arquivo de regras da raiz, o nome dos moldes de perfil, o bloco do
 * .gitignore e cada referência no texto das skills, dos templates e do README.
 * Nada da outra IA fica pra trás, e o caminho inverso funciona igual.
 *
 * A outra IA continua podendo abrir a pasta, como visita: o script gera pra ela
 * um arquivo de entrada mínimo (AGENTS.md numa base Claude Code, CLAUDE.md numa
 * base Codex) que manda ler as regras da base e não converter nada. É o único
 * arquivo da outra IA que existe no workspace, e é regenerado a cada conversão.
 *
 * Trechos entre <!-- ia:inicio --> e <!-- ia:fim --> não são convertidos. É
 * onde o texto precisa citar as duas IAs de propósito: a pergunta da instalação,
 * o README, o catálogo de skills externas.
 *
 * Também é o que sincroniza depois do /atualizar-sistema: a versão nova chega no
 * formato do Claude Code (.claude/skills/), e rodar `codex` de novo converte só o
 * que chegou, sobrescrevendo skill do produto e preservando skill que o usuário
 * criou.
 */

const fs = require("fs");
const path = require("path");

const IAS = {
  claude: {
    id: "claude",
    nome: "Claude Code",
    entrada: "CLAUDE.md",
    raiz: ".claude",                       // pasta que pertence à IA
    skills: path.join(".claude", "skills"),
    prefixoPerfil: "claude-md-",
    gitignore: [
      "# Claude Code (sessões locais)",
      ".claude/projects/",
      ".claude/sessions/",
      ".claude/shell-snapshots/",
      ".claude/telemetry/",
      ".claude/file-history/",
      ".claude/backups/",
      ".claude/settings.local.json",
    ].join("\n"),
  },
  codex: {
    id: "codex",
    nome: "Codex",
    entrada: "AGENTS.md",
    raiz: ".agents",
    skills: path.join(".agents", "skills"),
    prefixoPerfil: "agents-md-",
    gitignore: ["# Codex (sessões locais)", ".codex/"].join("\n"),
  },
};

const MARCA_VISITA = "<!-- contexos:visita -->";   // arquivo de entrada da outra IA: não é fonte de verdade
const PROTEGIDO = /(<!-- ia:inicio -->[\s\S]*?<!-- ia:fim -->)/;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const barra = (p) => p.split(path.sep).join("/");

/** Regras de texto de uma IA pra outra. Ordem importa: caminho antes de nome. */
function regras(de, para) {
  return [
    [new RegExp(esc(barra(de.skills)), "g"), barra(para.skills)],
    [new RegExp("\\b" + esc(de.entrada) + "\\b", "g"), para.entrada],
    [new RegExp(esc(de.prefixoPerfil), "g"), para.prefixoPerfil],
    [new RegExp("\\b" + esc(de.nome) + "\\b", "g"), para.nome],
  ];
}

function converterTexto(t, de, para) {
  const rs = regras(de, para);
  return t
    .split(PROTEGIDO)
    .map((p, i) => (i % 2 ? p : rs.reduce((acc, [re, sub]) => acc.replace(re, sub), p)))
    .join("");
}

function mdsDe(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const anda = (p) => {
    for (const f of fs.readdirSync(p)) {
      if (f === ".git" || f === "node_modules") continue;
      const full = path.join(p, f);
      if (fs.statSync(full).isDirectory()) anda(full);
      else if (/\.md$/i.test(f)) out.push(full);
    }
  };
  anda(dir);
  return out;
}

/** Sinais da IA `ia` fora dos trechos protegidos. Devolve [{arquivo, linha, trecho}]. */
function pedacosDe(raiz, ia, arquivos) {
  const sinais = [
    new RegExp(esc(barra(ia.skills))),
    new RegExp("\\b" + esc(ia.entrada) + "\\b"),
    new RegExp(esc(ia.prefixoPerfil)),
    new RegExp("\\b" + esc(ia.nome.split(" ")[0]) + "\\b"),   // "Claude" pega "Claude Code" também
  ];
  const achados = [];
  for (const arq of arquivos) {
    if (!fs.existsSync(arq)) continue;
    const t = fs.readFileSync(arq, "utf8");
    const livre = t.split(PROTEGIDO).map((p, i) => (i % 2 ? p.replace(/[^\n]/g, " ") : p)).join("");
    livre.split("\n").forEach((linha, i) => {
      if (sinais.some((re) => re.test(linha)))
        achados.push({ arquivo: path.relative(raiz, arq), linha: i + 1, trecho: linha.trim().slice(0, 80) });
    });
  }
  return achados;
}

/** Arquivos de sistema que o texto convertido cobre. */
function arquivosDeTexto(raiz, ia) {
  return [
    path.join(raiz, ia.entrada),
    path.join(raiz, "README.md"),
    ...mdsDe(path.join(raiz, "templates")),
    ...mdsDe(path.join(raiz, ia.skills)),
  ];
}

/** Entrada mínima pra outra IA trabalhar numa base que não é dela. */
function textoVisita(base, visita) {
  const sk = barra(base.skills);
  return `${MARCA_VISITA}
# Contex OS — você está de visita

Este workspace é o Contex OS no formato do **${base.nome}**: as regras estão em
\`${base.entrada}\` e as skills em \`${sk}/\`. A base é dele e continua assim.
Você (${visita.nome}) trabalha aqui como apoio, com tudo que a base oferece, sem
mudar a base.

## Como trabalhar

- Ler \`${base.entrada}\` inteiro e seguir como se fosse seu: contexto em
  \`_memoria/\`, marca em \`identidade/\`, onde salvar cada coisa
- Skill é \`${sk}/<nome>/SKILL.md\`. Quando o pedido do usuário bate com a
  \`description\` de uma, ler o arquivo e executar. \`/nome\` escrito pelo usuário
  é a skill \`nome\`
- O usuário fala em português, sem comando. Nunca pedir pra ele escolher \`/comando\`

## O que não fazer, com a base já instalada

- Não rodar \`node scripts/ia.js ${visita.id}\`, não criar \`${visita.raiz}/\` nem
  \`${visita.entrada}\` próprio, não mover skill. Se o usuário quiser trocar a base,
  ele pede, e aí é \`node scripts/ia.js ${visita.id}\`
- Não editar este arquivo: o \`scripts/ia.js\` regenera

## Primeiro uso

Se \`_memoria/\` não existe, ninguém instalou ainda. Na primeira mensagem do
usuário, seja qual for, ler \`${sk}/instalar/SKILL.md\` e executar do início:
banner, pergunta de qual IA, entrevista. A resposta de qual IA é o que decide o
formato da base, e pode ser ${visita.nome}.
`;
}

function detectar(raiz) {
  const tem = (rel) => fs.existsSync(path.join(raiz, rel));
  const claude = tem(IAS.claude.skills);
  const codex = tem(IAS.codex.skills);
  const ehPonte = (ia) => tem(ia.entrada) && fs.readFileSync(path.join(raiz, ia.entrada), "utf8").includes(MARCA_VISITA);
  return {
    skills: { claude, codex },
    entrada: { claude: tem(IAS.claude.entrada), codex: tem(IAS.codex.entrada) },
    visita: { claude: ehPonte(IAS.claude), codex: ehPonte(IAS.codex) },
    instalado: tem("_memoria"),
    ativa: claude && !codex ? "claude" : codex && !claude ? "codex" : claude && codex ? "ambas" : null,
  };
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function converter(raiz, alvoId) {
  const alvo = IAS[alvoId];
  const outra = IAS[alvoId === "claude" ? "codex" : "claude"];
  const est = detectar(raiz);
  const log = [];

  if (!est.skills.claude && !est.skills.codex)
    throw new Error(`nem ${IAS.claude.skills}/ nem ${IAS.codex.skills}/ existem — isso não parece um workspace Contex OS`);

  // ── 1. skills: o que está na pasta da outra IA vem pra cá, convertido ──
  const deSkills = path.join(raiz, outra.skills);
  const paraSkills = path.join(raiz, alvo.skills);
  if (fs.existsSync(deSkills)) {
    fs.mkdirSync(paraSkills, { recursive: true });
    let movidas = 0, substituidas = 0;
    for (const nome of fs.readdirSync(deSkills)) {
      const origem = path.join(deSkills, nome);
      if (!fs.statSync(origem).isDirectory()) continue;
      const destino = path.join(paraSkills, nome);
      if (fs.existsSync(destino)) { rmrf(destino); substituidas++; } else movidas++;
      fs.renameSync(origem, destino);
    }
    const sobras = fs.existsSync(path.join(raiz, outra.raiz)) ? listar(path.join(raiz, outra.raiz)) : [];
    rmrf(path.join(raiz, outra.raiz));
    log.push(`skills: ${movidas} movidas e ${substituidas} substituídas em ${barra(alvo.skills)}/; ${outra.raiz}/ removida` +
      (sobras.length ? ` (junto com ${sobras.length} arquivo(s) que só a ${outra.nome} usava)` : ""));
  }

  // ── 2. moldes de perfil: claude-md-* ↔ agents-md-* ──
  const perfis = path.join(raiz, "templates", "perfis");
  if (fs.existsSync(perfis)) {
    let renomeados = 0;
    for (const f of fs.readdirSync(perfis)) {
      if (!f.startsWith(outra.prefixoPerfil)) continue;
      const novo = path.join(perfis, alvo.prefixoPerfil + f.slice(outra.prefixoPerfil.length));
      rmrf(novo);
      fs.renameSync(path.join(perfis, f), novo);
      renomeados++;
    }
    if (renomeados) log.push(`moldes de perfil: ${renomeados} renomeados pra ${alvo.prefixoPerfil}*`);
  }

  // ── 3. arquivo de regras da raiz ──
  const entAlvo = path.join(raiz, alvo.entrada);
  const entOutra = path.join(raiz, outra.entrada);
  const alvoVale = fs.existsSync(entAlvo) && !fs.readFileSync(entAlvo, "utf8").includes(MARCA_VISITA);
  const outraVale = fs.existsSync(entOutra) && !fs.readFileSync(entOutra, "utf8").includes(MARCA_VISITA);
  if (!alvoVale && outraVale) {
    fs.writeFileSync(entAlvo, converterTexto(fs.readFileSync(entOutra, "utf8"), outra, alvo));
    log.push(`${alvo.entrada} gerado a partir do ${outra.entrada}`);
  } else if (!alvoVale && !outraVale) {
    throw new Error(`nem ${alvo.entrada} nem ${outra.entrada} têm as regras do sistema — sem arquivo de regras não dá pra converter`);
  }
  const visitaAntes = fs.existsSync(entOutra) ? fs.readFileSync(entOutra, "utf8") : "";
  const visitaNova = textoVisita(alvo, outra);
  if (visitaAntes !== visitaNova) {
    fs.writeFileSync(entOutra, visitaNova);
    log.push(outraVale ? `${outra.entrada} virou arquivo de visita da ${outra.nome}` : `${outra.entrada} de visita da ${outra.nome} gerado`);
  }

  // ── 4. texto: skills, templates, README, arquivo de regras ──
  let tocados = 0;
  for (const arq of arquivosDeTexto(raiz, alvo)) {
    if (!fs.existsSync(arq)) continue;
    const antes = fs.readFileSync(arq, "utf8");
    const depois = converterTexto(antes, outra, alvo);
    if (antes !== depois) { fs.writeFileSync(arq, depois); tocados++; }
  }
  if (tocados) log.push(`texto: ${tocados} arquivo(s) com referência reescrita`);

  // ── 5. .gitignore ──
  const gi = path.join(raiz, ".gitignore");
  if (fs.existsSync(gi)) {
    let t = fs.readFileSync(gi, "utf8");
    if (t.includes(outra.gitignore)) { t = t.replace(outra.gitignore, alvo.gitignore); fs.writeFileSync(gi, t); log.push(".gitignore: bloco da IA trocado"); }
    else if (!t.includes(alvo.gitignore)) { fs.writeFileSync(gi, t.trimEnd() + "\n\n" + alvo.gitignore + "\n"); log.push(".gitignore: bloco da IA acrescentado"); }
  }

  return log;
}

function listar(dir) {
  const out = [];
  const anda = (p) => {
    for (const f of fs.readdirSync(p)) {
      const full = path.join(p, f);
      if (fs.statSync(full).isDirectory()) anda(full); else out.push(full);
    }
  };
  anda(dir);
  return out;
}

function status(raiz) {
  const est = detectar(raiz);
  console.log(`\nIA: ${path.resolve(raiz)}`);
  if (!est.ativa) return console.log("  ✗ nenhuma pasta de skills encontrada — isso não parece um workspace Contex OS");
  if (est.ativa === "ambas") {
    console.log(`  ✗ ${IAS.claude.skills}/ e ${IAS.codex.skills}/ existem ao mesmo tempo — rode \`node scripts/ia.js claude\` ou \`codex\` pra unificar`);
    return;
  }
  const ia = IAS[est.ativa];
  const outra = IAS[est.ativa === "claude" ? "codex" : "claude"];
  console.log(`  ✓ formato ${ia.nome}: ${ia.entrada} + ${barra(ia.skills)}/`);
  if (!est.entrada[ia.id]) console.log(`  ✗ ${ia.entrada} não existe`);
  if (est.entrada[outra.id]) {
    if (est.visita[outra.id]) console.log(`  ✓ ${outra.entrada} de visita: a ${outra.nome} pode abrir a pasta sem mudar a base`);
    else console.log(`  ✗ ${outra.entrada} não é arquivo de visita — a ${outra.nome} vai tratar a pasta como dela. Rode \`node scripts/ia.js ${ia.id}\``);
  } else console.log(`  ✗ ${outra.entrada} de visita não existe — rode \`node scripts/ia.js ${ia.id}\` pra gerar`);
  const pedacos = pedacosDe(raiz, outra, arquivosDeTexto(raiz, ia));
  if (pedacos.length) {
    console.log(`  ✗ ${pedacos.length} referência(s) à ${outra.nome} fora de trecho protegido:`);
    pedacos.slice(0, 15).forEach((p) => console.log(`      ${p.arquivo}:${p.linha}  ${p.trecho}`));
    if (pedacos.length > 15) console.log(`      … e mais ${pedacos.length - 15}`);
  } else console.log(`  ✓ nenhuma referência à ${outra.nome} fora de trecho protegido`);
  console.log(`  · ${est.instalado ? "instalado (_memoria/ existe)" : "ainda não instalado"}`);
}

function main() {
  const [cmd, raizArg] = process.argv.slice(2);
  const raiz = raizArg || ".";
  if (cmd === "status") return status(raiz);
  if (cmd !== "claude" && cmd !== "codex") {
    console.log(`uso:
  node scripts/ia.js claude    deixa tudo no formato do Claude Code (CLAUDE.md + .claude/skills/)
  node scripts/ia.js codex     deixa tudo no formato do Codex (AGENTS.md + .agents/skills/)
  node scripts/ia.js status    mostra o formato ativo e acusa pedaço da outra IA`);
    process.exit(cmd ? 1 : 0);
  }
  try {
    const log = converter(raiz, cmd);
    console.log(`\nIA: ${IAS[cmd].nome}`);
    if (!log.length) console.log("  ✓ já estava nesse formato, nada a mudar");
    log.forEach((l) => console.log("  ✓ " + l));
    const pedacos = pedacosDe(raiz, IAS[cmd === "claude" ? "codex" : "claude"], arquivosDeTexto(raiz, IAS[cmd]));
    if (pedacos.length) {
      console.log(`  ✗ ainda há ${pedacos.length} referência(s) à outra IA:`);
      pedacos.slice(0, 10).forEach((p) => console.log(`      ${p.arquivo}:${p.linha}  ${p.trecho}`));
      process.exit(1);
    }
    console.log(`  ✓ nenhum pedaço da outra IA ficou pra trás\n`);
  } catch (e) {
    console.error(`\n  ✗ ${e.message}\n`);
    process.exit(1);
  }
}

module.exports = { IAS, MARCA_VISITA, detectar, pedacosDe, arquivosDeTexto, converterTexto, textoVisita };
if (require.main === module) main();
