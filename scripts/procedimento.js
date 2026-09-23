#!/usr/bin/env node
/**
 * Contex OS — procedimento.js
 * Confere uma folha de procedimento (o que o /procedimento escreve em
 * operacao/procedimentos/<tarefa>.md) antes de ela ir pra mão de quem executa.
 *
 * Existe porque a folha lida no olho passa com o erro que mais custa: passo sem
 * responsável, passo sem critério de pronto ("quando estiver ok"), e a tabela
 * de escalação apontando pra "gerência", que não atende telefone. A pessoa nova
 * descobre isso no sábado, com o dono viajando. Aqui cada passo é lido célula
 * por célula, e cada nome de escalação é conferido contra quem existe em
 * _memoria/empresa.md.
 *
 * Uso:
 *   node scripts/procedimento.js operacao/procedimentos/abrir-a-loja.md     confere uma folha
 *   node scripts/procedimento.js operacao/procedimentos/                    confere todas da pasta
 *   node scripts/procedimento.js modelo "Abrir a loja" [--saida <arquivo>]  esqueleto vazio da folha
 *   node scripts/procedimento.js indice operacao/procedimentos/             indice.md com todas as folhas
 *
 * Opções:
 *   --empresa <arquivo>   de onde ler os nomes da equipe (padrão: _memoria/empresa.md)
 *   --pessoa <Nome>       nome extra aceito na escalação (repetir pra cada um)
 *   --json                o resultado em JSON, pra encadear
 *
 * O que ele lê: título "# Procedimento — <tarefa>", cabeçalho em citação
 * (Quem executa, Quem chamar, Quando, Leva, Última revisão) e as seções
 * "Antes de começar", "Passos", "Quando parar e me chamar", "Regra ou hábito"
 * e "Histórico", cada uma com a tabela do molde templates/operacao/procedimento.md.
 *
 * Sai com código 1 se achar erro. Aviso não derruba.
 *
 * Node 18+, sem dependência.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── listas ───────────────────────────

/** Quem faz o passo. Nenhum destes é uma pessoa. */
const QUEM_GENERICO = /^(alguém|algum|todos|todo mundo|a equipe|equipe|o time|time|qualquer um|quem estiver|quem puder|a gerência|gerência|o responsável|responsável|a loja|o pessoal)$/i;

/** Frequência ou condição sem número. Do manual de POP: "a cada 2 horas", não "periodicamente". */
const VAGO = [
  "periodicamente", "regularmente", "frequentemente", "eventualmente",
  "quando necessário", "se necessário", "se precisar", "quando precisar",
  "conforme o caso", "conforme necessário", "de vez em quando", "com frequência",
  "assim que possível", "sempre que possível", "quando der", "o quanto antes",
  "quando for preciso", "caso precise",
];

/** Critério de pronto que só o dono enxerga. */
const PRONTO_VAGO = /^(ok|feito|pronto|concluído|terminado|quando estiver (ok|bom|pronto|certo)|quando ficar (bom|certo|pronto)|do jeito certo|tá bom|está bom|quando terminar|quando acabar)\.?$/i;

/**
 * Linha que parece senha escrita: "senha: 1234", "pin=0000", "senha é Loja@2024",
 * "senha do wifi: casa2024". Só acusa quando o valor depois do separador tem dígito —
 * "Senha: pedir pro Bruno" é o jeito certo e não acusa.
 */
const SENHA = /\b(senhas?|pin|password|c[oó]digo\s+(?:de\s+acesso|do\s+alarme|do\s+cofre|do\s+painel)|token)\b[^|\n:=]{0,24}?\s*(?:[:=]|\s(?:é|eh)\s)\s*(\S*\d\S*)/i;

/** Pendência aberta. A forma com dois-pontos dentro do colchete passa pelo gerar-docx. */
const PLACEHOLDER = /\[(a confirmar|preencher|confirmar)[^\]]*\]/gi;
const PLACEHOLDER_FROUXO = /\[(?:a confirmar|preencher|confirmar)\s*[:\-][^\]]*\]/gi;

// ─────────────────────────── leitura ───────────────────────────

const norm = (s) => br.semAcento(String(s || "")).toLowerCase().trim();

/** Nomes das seções, já sem acento e em minúsculas, como as chaves de lerFolha. */
const SECOES = {
  antes: norm("Antes de começar"),
  passos: norm("Passos"),
  chamar: norm("Quando parar e me chamar"),
  regra: norm("Regra ou hábito"),
  historico: norm("Histórico"),
};

/** Divide o markdown em título, cabeçalho e seções por "## ". */
function lerFolha(texto) {
  const linhas = texto.replace(/^\uFEFF/, "").split(/\r?\n/);
  const folha = { titulo: null, tarefa: null, cabecalho: {}, secoes: {}, linhas };
  let atual = null;
  for (const l of linhas) {
    const h1 = l.match(/^#\s+(.+)$/);
    if (h1 && !folha.titulo) {
      folha.titulo = h1[1].trim();
      const t = folha.titulo.match(/^procedimento\s*[—–-]\s*(.+)$/i);
      folha.tarefa = t ? t[1].trim() : null;
      continue;
    }
    const h2 = l.match(/^##\s+(.+)$/);
    if (h2) { atual = norm(h2[1]); folha.secoes[atual] = []; continue; }
    const campo = l.match(/^>\s*\*\*([^*]+):\*\*\s*(.*)$/);
    if (campo && !atual) { folha.cabecalho[norm(campo[1])] = campo[2].trim(); continue; }
    if (atual) folha.secoes[atual].push(l);
  }
  return folha;
}

/** Primeira tabela markdown de uma lista de linhas → [{coluna: valor}]. */
function lerTabela(linhas = []) {
  const rows = linhas.filter((l) => /^\s*\|.*\|\s*$/.test(l));
  if (rows.length < 2) return { colunas: [], linhas: [] };
  const celulas = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const colunas = celulas(rows[0]);
  const dados = rows.slice(1)
    .filter((l) => !/^\s*\|\s*:?-{2,}/.test(l))
    .map(celulas)
    .filter((c) => c.some((x) => x))            // linha toda vazia (do esqueleto) não é linha
    .map((c) => {
      const o = {};
      colunas.forEach((nome, i) => { o[norm(nome)] = c[i] || ""; });
      return o;
    });
  return { colunas, linhas: dados };
}

/**
 * Nomes próprios de uma string: tokens que começam em maiúscula.
 * Aceita nome curto de verdade (Zé, Jô, Bel); o que sobra de palavra comum
 * capitalizada no começo da frase cai na lista NAO_E_NOME.
 */
const TOKEN_NOME = /(?<![A-Za-zÁ-Úá-úÂ-Ûâ-ûÃ-Õã-õÇç])[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+/g;
function nomesDe(s) {
  return (String(s || "").match(TOKEN_NOME) || []).map(norm).filter((n) => !NAO_E_NOME.has(n));
}

/** Palavra capitalizada que não é gente: papel, palavra comum de começo de frase, nome de ferramenta. */
const NAO_E_NOME = new Set([
  "nome", "equipe", "time", "dono", "dona", "socio", "socia", "socios", "responsavel", "pessoas",
  "sim", "nao", "eu", "ele", "ela", "eles", "elas", "nos", "voce", "hoje", "amanha", "ontem",
  "quem", "quando", "onde", "como", "qual", "que", "se", "por", "para", "pra", "com", "sem",
  "ate", "mais", "menos", "meu", "minha", "seu", "sua", "todo", "toda", "todos", "todas",
  "atendente", "gerente", "caixa", "loja", "balcao", "cozinha", "whatsapp", "telefone",
  "ligacao", "mensagem", "presencial", "contexto", "ferramentas", "negocio", "perfil",
]);

/** Rótulos de _memoria/empresa.md em que mora gente, com ou sem marcador de lista. */
const ROTULO_PESSOA = /^\s*(?:[-*+]\s*)?\**\s*(dono|dona|donos|respons[aá]vel|s[oó]cios?|s[oó]cias?|equipe|time|pessoas|quem executa|quem atende|quem responde|funcion[aá]rios?|colaboradores?)\s*\**\s*:\s*\**\s*(.*)$/i;

/** A linha "Nome:" costuma ser o nome do negócio ("Padaria Pão da Serra"), não de gente. Só vale como reserva. */
const ROTULO_NOME = /^\s*(?:[-*+]\s*)?\**\s*nome(?: do neg[oó]cio| da empresa)?\s*\**\s*:\s*\**\s*(.*)$/i;

/** Seção cujo conteúdo é lista de gente: "## Equipe", "## Quem é quem". */
const SECAO_PESSOA = /^##+\s*(equipe|time|pessoas|quem é quem|quem e quem|s[oó]cios)/i;

/**
 * Nomes de gente em _memoria/empresa.md: linhas de rótulo (Nome, Dono, Sócios, Equipe…)
 * e itens de uma seção "## Equipe". Devolve um Map normalizado → como está escrito,
 * ou null quando o arquivo não existe.
 */
function nomesDaEmpresa(arquivo) {
  if (!arquivo || !fs.existsSync(arquivo)) return null;
  const nomes = new Map();
  const reserva = new Map();
  let dentroDeSecao = false;
  const guardar = (alvo, valor) => {
    for (const orig of String(valor || "").match(TOKEN_NOME) || []) {
      const n = norm(orig);
      if (!NAO_E_NOME.has(n)) alvo.set(n, orig);
    }
  };
  for (const l of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (/^##+\s/.test(l)) { dentroDeSecao = SECAO_PESSOA.test(l); continue; }
    const m = l.match(ROTULO_PESSOA);
    if (m) { guardar(nomes, m[2]); continue; }
    const mn = l.match(ROTULO_NOME);
    if (mn) { guardar(reserva, mn[1]); continue; }
    if (dentroDeSecao && /^\s*(?:[-*+]|\d+\.)\s+/.test(l)) guardar(nomes, l);
  }
  // marca pessoal: sem Equipe nem Sócios preenchidos, quem responde é quem está na linha Nome
  return nomes.size ? nomes : reserva;
}

// ─────────────────────────── conferência ───────────────────────────

function vagoEm(texto) {
  const t = norm(texto);
  return VAGO.filter((v) => t.includes(norm(v)));
}

/**
 * Confere uma folha. Devolve { erros: [], avisos: [], resumo: {} }.
 * `nomes` é o Map (normalizado → escrito) de nomes aceitos na escalação, ou null quando não há empresa.md.
 */
function conferir(texto, { nomes = null, hoje = new Date() } = {}) {
  const erros = [], avisos = [];
  const erro = (m) => erros.push(m);
  const aviso = (m) => avisos.push(m);
  const f = lerFolha(texto);

  if (!f.titulo) erro('sem título: a primeira linha é "# Procedimento — <tarefa>"');
  else if (!f.tarefa) erro(`título "${f.titulo}" não segue "# Procedimento — <tarefa>"`);

  // cabeçalho
  for (const campo of ["quem executa", "quem chamar", "ultima revisao"]) {
    if (!f.cabecalho[campo]) erro(`cabeçalho sem "${campo === "ultima revisao" ? "Última revisão" : campo[0].toUpperCase() + campo.slice(1)}"`);
  }
  for (const campo of ["quando", "leva"]) if (!f.cabecalho[campo]) aviso(`cabeçalho sem "${campo[0].toUpperCase() + campo.slice(1)}"`);

  let idadeDias = null;
  if (f.cabecalho["ultima revisao"]) {
    const d = br.lerData(f.cabecalho["ultima revisao"]);
    if (!d) erro(`"Última revisão: ${f.cabecalho["ultima revisao"]}" não é uma data (DD/MM/AAAA)`);
    else {
      idadeDias = br.diasEntre(d, hoje);
      if (idadeDias < 0) erro(`"Última revisão" está no futuro (${br.fmt(d)})`);
      else if (idadeDias > 180) aviso(`última revisão há ${idadeDias} dias (${br.fmt(d)}): folha de mais de 180 dias descreve uma loja que já mudou`);
    }
  }

  // senha escrita: erro em qualquer linha
  f.linhas.forEach((l, i) => {
    const m = l.match(SENHA);
    if (m) erro(`linha ${i + 1} tem "${m[1]}" seguido de um valor com número: a folha diz onde a senha está guardada ("envelope azul na gaveta") ou quem dá o acesso, nunca a senha`);
  });

  // antes de começar
  const antes = lerTabela(f.secoes[SECOES.antes]);
  if (!(SECOES.antes in f.secoes)) erro('sem a seção "## Antes de começar" (acesso, senha, ferramenta, material)');
  else if (!antes.linhas.length) erro('"Antes de começar" sem nenhuma linha: quase toda tarefa precisa de pelo menos um acesso ou material');

  // passos
  const passos = lerTabela(f.secoes[SECOES.passos]);
  const col = (o, ...nomes) => { for (const n of nomes) if (n in o) return o[n]; return undefined; };
  if (!(SECOES.passos in f.secoes)) erro('sem a seção "## Passos"');
  else if (!passos.linhas.length) erro('"Passos" sem nenhuma linha');
  else {
    const faltam = ["#", "o que fazer", "quem", "pronto quando"].filter((c) => !passos.colunas.map(norm).includes(norm(c)));
    if (faltam.length) erro(`tabela de passos sem a(s) coluna(s): ${faltam.join(", ")}`);
    if (!passos.colunas.map(norm).includes("se falhar")) aviso('tabela de passos sem a coluna "Se falhar"');
    passos.linhas.forEach((p, i) => {
      const n = i + 1;
      const num = col(p, "#");
      if (num !== undefined && String(num).trim() !== String(n)) erro(`passo ${n} está numerado "${num}": a numeração precisa ser 1, 2, 3… sem pulo`);
      const oque = col(p, "o que fazer") || "";
      const quem = col(p, "quem") || "";
      const pronto = col(p, "pronto quando") || "";
      const falhar = col(p, "se falhar");
      const rotulo = oque ? `passo ${n} ("${oque.slice(0, 40)}${oque.length > 40 ? "…" : ""}")` : `passo ${n}`;
      if (!oque.trim()) erro(`${rotulo} sem "O que fazer"`);
      else {
        if (oque.split(/\s+/).length > 20) aviso(`${rotulo} tem ${oque.split(/\s+/).length} palavras: passo com mais de 20 costuma ser dois passos`);
        const v = vagoEm(oque);
        if (v.length) aviso(`${rotulo} usa "${v[0]}": trocar por número ("a cada 2 horas", "quando bater em 5")`);
      }
      if (!quem.trim()) erro(`${rotulo} sem "Quem"`);
      else if (QUEM_GENERICO.test(quem.trim())) erro(`${rotulo} tem "Quem" = "${quem}": passo de todo mundo é passo de ninguém; pôr o papel ou o nome`);
      if (!pronto.trim()) erro(`${rotulo} sem "Pronto quando": é o passo que vira a pergunta "tá bom assim?"`);
      else if (PRONTO_VAGO.test(pronto.trim())) erro(`${rotulo} tem "Pronto quando" = "${pronto}": precisa de algo que a pessoa enxerga (painel verde, mensagem respondida, valor bate)`);
      else if (vagoEm(pronto).length) erro(`${rotulo} tem "Pronto quando" vago ("${vagoEm(pronto)[0]}")`);
      if (falhar !== undefined && !falhar.trim()) aviso(`${rotulo} sem "Se falhar"`);
    });
    // dois passos com o mesmo critério: um dos dois está errado
    const porCriterio = new Map();
    passos.linhas.forEach((p, i) => {
      const c = norm(col(p, "pronto quando"));
      if (!c) return;
      if (!porCriterio.has(c)) porCriterio.set(c, []);
      porCriterio.get(c).push(i + 1);
    });
    for (const [c, quais] of porCriterio) {
      if (quais.length > 1) aviso(`passos ${quais.join(" e ")} têm o mesmo "Pronto quando" ("${c}"): um dos dois está descrevendo o pronto do outro`);
    }
  }

  // escalação
  const chamar = lerTabela(f.secoes[SECOES.chamar]);
  const semPessoa = [];
  const confereNome = (valor, onde) => {
    const v = String(valor || "").trim();
    if (!v) { erro(`${onde} sem "Quem chamar"`); return; }
    const primeiro = v.split(/[·,;(/]/)[0].trim();
    if (QUEM_GENERICO.test(primeiro)) { erro(`${onde} manda chamar "${primeiro}": escalação aponta pra uma pessoa com nome, nunca "a gerência" ou "a equipe"`); return; }
    const achados = nomesDe(v).filter((n) => !NAO_E_NOME.has(n));
    if (!achados.length) { erro(`${onde} tem "Quem chamar" = "${v}" sem nome de pessoa`); return; }
    if (nomes && !achados.some((n) => nomes.has(n))) semPessoa.push({ onde, valor: v });
  };
  if (f.cabecalho["quem chamar"]) confereNome(f.cabecalho["quem chamar"], "cabeçalho");
  if (!(SECOES.chamar in f.secoes)) erro('sem a seção "## Quando parar e me chamar"');
  else if (!chamar.linhas.length) erro('"Quando parar e me chamar" sem nenhuma linha: sem ela a pessoa liga pra tudo, ou decide o que não devia');
  else chamar.linhas.forEach((r, i) => {
    const onde = `escalação ${i + 1} ("${(col(r, "situacao") || "").slice(0, 40)}")`;
    if (!(col(r, "situacao") || "").trim()) erro(`${onde} sem "Situação"`);
    confereNome(col(r, "quem chamar"), onde);
    if (!(col(r, "como") || "").trim()) aviso(`${onde} sem "Como" (ligação, mensagem, presencial)`);
    if (!(col(r, "enquanto espera") || "").trim()) aviso(`${onde} sem "Enquanto espera"`);
  });
  if (nomes === null) aviso("_memoria/empresa.md não encontrado: os nomes da escalação não foram conferidos contra a equipe");
  else if (!nomes.size) aviso("_memoria/empresa.md sem nome na linha Nome ou Equipe: os nomes da escalação não foram conferidos");
  else for (const s of semPessoa) {
    const conhecidos = [...nomes.values()];
    erro(`${s.onde} manda chamar "${s.valor}", e esse nome não está em _memoria/empresa.md. Quem está lá: ${conhecidos.slice(0, 8).join(", ")}${conhecidos.length > 8 ? "…" : ""}. Resolver de um dos dois jeitos: acrescentar a pessoa na linha **Equipe:** do empresa.md, ou rodar com --pessoa "${s.valor.split(/[·,;(/]/)[0].trim()}" quando for alguém de fora da equipe`);
  }

  // regra ou hábito, histórico
  if (!(SECOES.regra in f.secoes)) aviso('sem a seção "## Regra ou hábito"');
  if (!(SECOES.historico in f.secoes)) aviso('sem a seção "## Histórico"');

  // placeholders
  const pend = (texto.match(PLACEHOLDER) || []);
  if (pend.length) aviso(`${pend.length} pendência(s) [a confirmar]: a folha não vai pra pessoa com isso aberto`);
  const frouxo = (texto.match(PLACEHOLDER_FROUXO) || []);
  if (frouxo.length) aviso(`${frouxo.length} pendência(s) escritas como "${frouxo[0]}": o gerar-docx só trava em "[a confirmar]" puro, então escrever "[a confirmar] ${frouxo[0].replace(/^\[(?:a confirmar|preencher|confirmar)\s*[:\-]\s*/i, "").replace(/\]$/, "")}" pra pendência não escapar pro Word`);

  return {
    erros, avisos,
    resumo: {
      tarefa: f.tarefa, quemExecuta: f.cabecalho["quem executa"] || "", quemChamar: f.cabecalho["quem chamar"] || "",
      quando: f.cabecalho["quando"] || "", leva: f.cabecalho["leva"] || "", ultimaRevisao: f.cabecalho["ultima revisao"] || "",
      idadeDias, passos: passos.linhas.length, escalacoes: chamar.linhas.length, acessos: antes.linhas.length, pendencias: pend.length,
    },
  };
}

// ─────────────────────────── modelo e índice ───────────────────────────

function modelo(tarefa, hoje = new Date()) {
  return `# Procedimento — ${tarefa}

> **Quem executa:** [a confirmar] papel (hoje: nome)
> **Quem chamar:** [a confirmar] nome do dono ou substituto · [a confirmar] ligação ou mensagem
> **Quando:** [a confirmar] dia e hora, ou o evento que dispara
> **Leva:** [a confirmar] minutos
> **Última revisão:** ${br.fmt(hoje)}

## Pra que serve
[a confirmar] o que dá errado quando isso não é feito, ou é feito de outro jeito

## Antes de começar
| Precisa de | Onde pega / quem dá |
|---|---|
| | |

## Passos
| # | O que fazer | Quem | Pronto quando | Se falhar |
|---|---|---|---|---|
| 1 | | | | |

## Quando parar e me chamar
| Situação | Quem chamar | Como | Enquanto espera |
|---|---|---|---|
| | | | |

## Regra ou hábito
| Coisa | Regra ou hábito | Por quê |
|---|---|---|

## Histórico
| Data | O que mudou | Quem |
|---|---|---|
| ${br.fmt(hoje)} | Folha criada | |
`;
}

function folhasDe(pasta) {
  return fs.readdirSync(pasta)
    .filter((a) => a.endsWith(".md") && a.toLowerCase() !== "indice.md")
    .sort()
    .map((a) => path.join(pasta, a));
}

function indice(pasta, opts = {}) {
  const nomes = opts.nomes;
  const linhas = folhasDe(pasta).map((arq) => {
    const r = conferir(fs.readFileSync(arq, "utf8"), { nomes, hoje: opts.hoje });
    const estado = r.erros.length ? `${r.erros.length} erro(s)`
      : r.resumo.pendencias ? `ok, ${r.resumo.pendencias} pendência(s)`
      : r.avisos.length ? `ok, ${r.avisos.length} aviso(s)` : "ok";
    return `| [${r.resumo.tarefa || path.basename(arq, ".md")}](${path.basename(arq)}) | ${r.resumo.quemExecuta} | ${r.resumo.quando} | ${r.resumo.leva} | ${r.resumo.ultimaRevisao} | ${estado} |`;
  });
  return `# Procedimentos

> Uma folha por tarefa. Gerado por \`node scripts/procedimento.js indice\` em ${br.fmt(opts.hoje || new Date())}; regenerar depois de mudar qualquer folha.

| Folha | Quem executa | Quando | Leva | Última revisão | Estado |
|---|---|---|---|---|---|
${linhas.join("\n")}
`;
}

// ─────────────────────────── linha de comando ───────────────────────────

function args(argv) {
  const o = { _: [], pessoa: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valor = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) { console.error(`✖ ${a} precisa de um valor: ${a} <valor>`); process.exit(2); }
      return v;
    };
    if (a === "--json") o.json = true;
    else if (a === "--empresa") o.empresa = valor();
    else if (a === "--saida") o.saida = valor();
    else if (a === "--pessoa") o.pessoa.push(valor());
    else if (a.startsWith("--")) { console.error(`✖ opção desconhecida: ${a}`); process.exit(2); }
    else o._.push(a);
  }
  return o;
}

function main() {
  const o = args(process.argv.slice(2));
  const raiz = path.resolve(__dirname, "..");
  const empresa = o.empresa || path.join(raiz, "_memoria", "empresa.md");
  let nomes = nomesDaEmpresa(empresa);
  if (o.pessoa.length) { nomes = nomes || new Map(); for (const p of o.pessoa) for (const n of nomesDe(p)) nomes.set(n, p); }

  const cmd = o._[0];
  if (!cmd) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
    process.exit(2);
  }

  if (cmd === "modelo") {
    const tarefa = o._[1];
    if (!tarefa) { console.error('✖ falta a tarefa: node scripts/procedimento.js modelo "Abrir a loja"'); process.exit(2); }
    const texto = modelo(tarefa);
    if (o.saida) {
      if (fs.existsSync(o.saida)) { console.error(`✖ ${o.saida} já existe; não sobrescrevo folha`); process.exit(1); }
      fs.mkdirSync(path.dirname(o.saida), { recursive: true });
      fs.writeFileSync(o.saida, texto);
      console.log(`✓ esqueleto gravado em ${o.saida} (com [a confirmar] em cada campo; o lint acusa até preencher)`);
    } else process.stdout.write(texto);
    return;
  }

  if (cmd === "indice") {
    const pasta = o._[1];
    if (!pasta || !fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) { console.error("✖ passe a pasta: node scripts/procedimento.js indice operacao/procedimentos/"); process.exit(2); }
    if (!folhasDe(pasta).length) { console.error(`✖ nenhuma folha .md em ${pasta} (o indice.md não conta): escreva a primeira folha com "modelo"`); process.exit(2); }
    const texto = indice(pasta, { nomes });
    const saida = o.saida || path.join(pasta, "indice.md");
    fs.writeFileSync(saida, texto);
    console.log(`✓ ${saida}: ${folhasDe(pasta).length} folha(s)`);
    process.stdout.write(texto);
    return;
  }

  // conferir arquivo ou pasta
  const alvo = cmd;
  if (!fs.existsSync(alvo)) { console.error(`✖ não achei ${alvo}`); process.exit(2); }
  const arquivos = fs.statSync(alvo).isDirectory() ? folhasDe(alvo) : [alvo];
  if (!arquivos.length) { console.error(`✖ nenhuma folha .md em ${alvo}`); process.exit(2); }

  const saida = [];
  let totalErros = 0;
  for (const arq of arquivos) {
    const r = conferir(fs.readFileSync(arq, "utf8"), { nomes });
    totalErros += r.erros.length;
    saida.push({ arquivo: arq, ...r });
    if (o.json) continue;
    console.log(`\nPROCEDIMENTO: ${arq}`);
    const s = r.resumo;
    console.log(`  → ${s.tarefa || "(sem tarefa)"} · executa: ${s.quemExecuta || "?"} · chama: ${s.quemChamar || "?"} · ${s.passos} passo(s), ${s.escalacoes} escalação(ões), ${s.acessos} acesso(s)`);
    for (const e of r.erros) console.log(`  ✖ ${e}`);
    for (const a of r.avisos) console.log(`  ⚠ ${a}`);
    if (!r.erros.length && !r.avisos.length) console.log("  ✓ todo passo tem responsável e critério de pronto; escalação aponta pra pessoa da equipe");
    else if (!r.erros.length) console.log("  ✓ sem erro (os avisos acima não travam a entrega)");
  }
  if (o.json) console.log(JSON.stringify(saida, null, 2));
  else console.log(totalErros ? `\n✖ ${totalErros} erro(s) em ${arquivos.length} folha(s). Corrigir antes de entregar.` : `\nTudo certo. ${arquivos.length} folha(s) conferida(s).`);
  process.exit(totalErros ? 1 : 0);
}

module.exports = { lerFolha, lerTabela, nomesDe, nomesDaEmpresa, conferir, modelo, indice, folhasDe, vagoEm, VAGO, SENHA };

if (require.main === module) main();
