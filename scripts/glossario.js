#!/usr/bin/env node
/**
 * Contex OS — glossario.js
 * Confere o vocabulário de um sistema contra o GLOSSARIO.md do projeto.
 *
 * Existe porque nomear é a decisão mais barata de tomar e a mais cara de
 * desfazer, e porque ninguém acha o problema lendo. O mesmo conceito ganha
 * três nomes em três semanas (orcamento na tabela, proposta na tela, quote na
 * função que envia o e-mail), o estado novo entra como texto solto numa
 * comparação perdida no meio do código, e seis meses depois a consulta do
 * fechamento do mês ignora metade dos registros sem dar erro nenhum. Aqui nada
 * é lembrado: o glossário é lido, o código é varrido, e cada divergência sai
 * com arquivo e linha pra você abrir.
 *
 * Uso:
 *   node scripts/glossario.js varrer <pasta>               palavras do domínio que o código já usa, por frequência, e os nomes vagos
 *   node scripts/glossario.js conferir <pasta>             glossário contra código: nome duplicado e estado de fora
 *   node scripts/glossario.js estados <GLOSSARIO.md>       higiene das máquinas de estado e do dono de cada termo
 *
 * Opções:
 *   --glossario <arquivo>   caminho do GLOSSARIO.md (padrão: procura na pasta e nas duas acima)
 *   --lexico <arquivo>      léxico de sinônimos (padrão: templates/software/sinonimos-de-dominio.json)
 *   --json                  a mesma saída em JSON, pra outro script consumir
 *   --saida <arquivo>       grava a saída de `varrer` em markdown no arquivo
 *   --limite <n>            quantas palavras o `varrer` lista (padrão: 40)
 *   --sem-lexico            não usa o léxico: só o que está escrito no glossário
 *
 * O GLOSSARIO.md é lido por convenção, não por parser esperto. Uma seção `##`
 * por termo, e dentro dela itens com rótulo em negrito:
 *
 *   ## Pedido
 *   - **É:** compra que o cliente confirmou e que a cozinha vai produzir.
 *   - **Não é:** orçamento, que ainda não teve sim, nem entrega, que é o transporte.
 *   - **No banco:** `pedido`, `pedido_id`
 *   - **Na tela:** Pedido
 *   - **No WhatsApp:** pedido
 *   - **Nunca:** venda, order, comanda
 *   - **Estados:** rascunho → aguardando_pagamento → pago → em_producao → entregue
 *   - **Estado final:** entregue, cancelado
 *   - **De qualquer estado:** cancelado
 *   - **Dono da palavra:** Bruno — 22/09/2026
 *
 * Os rótulos que o script usa são "No banco", "Nunca", "Estados", "Estado
 * final" e "De qualquer estado". Os outros são pra quem lê. Variante com menos
 * de 3 letras é ignorada de propósito e sai avisada: sigla de duas letras casa
 * com qualquer coisa.
 *
 * O que o `conferir` NÃO acha, e está dito na skill: enum declarado sem aspas
 * (`enum Status { PAGO }`), estado montado por concatenação, estado que só
 * existe como dado no banco, e sinônimo que o léxico não conhece. Ele acha o
 * que está escrito literal no código, e é por isso que a entrevista continua
 * sendo a parte que decide.
 *
 * Sai com código 1 se achar problema, pra dar pra encadear com &&.
 *
 * Node 18+, sem dependência de npm. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const MIN_VARIANTE = 3;
const RAIZ = path.resolve(__dirname, "..");
const LEXICO_PADRAO = path.join(RAIZ, "templates", "software", "sinonimos-de-dominio.json");

const EXT_CODIGO = new Set([
  ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".vue", ".svelte",
  ".py", ".php", ".rb", ".go", ".java", ".kt", ".cs", ".swift", ".dart",
  ".sql", ".prisma", ".graphql",
  ".html", ".htm", ".hbs", ".ejs", ".twig",
  ".json", ".yml", ".yaml",
]);

const PASTAS_FORA = new Set([
  "node_modules", ".git", ".next", ".nuxt", "dist", "build", "out", "coverage",
  "vendor", "__pycache__", ".venv", "venv", ".cache", "target", "tmp", ".turbo",
]);

// Palavra que aparece em todo código e não é vocabulário de negócio.
const RUIDO = new Set((
  "a o e de da do das dos em no na nos nas um uma para por com que se ao aos as os " +
  "the of to in for and or not is are be this that with from as at on by an it its " +
  "if else return function const let var new class public private static void async await " +
  "import export default from require module exports type interface enum extends implements " +
  "string number boolean null undefined true false int float double char long bool " +
  "select insert update delete where join left right inner outer group order limit offset " +
  "table create alter drop primary foreign key references index unique constraint check " +
  "not exists cascade serial varchar text timestamp timestamptz numeric date time now " +
  "div span href class id style src alt href width height lang meta head body html script " +
  "get post put patch delete req res err error data result response request params query body " +
  "console log id ids name nome value valor list lista map filter reduce foreach length " +
  "test describe it expect mock jest spec fixture setup teardown " +
  "props state use effect ref memo callback context provider component render return " +
  "self def pass raise try catch finally throw with yield lambda print " +
  "count sum min max avg total soma"
).split(/\s+/));

// ─────────────────────────── utilidades ───────────────────────────

let problemas = 0;
let avisos = 0;

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

// Pasta usada como referência pra encurtar os caminhos exibidos.
let baseExibicao = process.cwd();

/** Caminho curto pra exibir: relativo à pasta varrida, ou ao diretório atual. */
function curto(p) {
  for (const base of [baseExibicao, process.cwd()]) {
    const rel = path.relative(base, p);
    if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return rel;
  }
  return p;
}

/**
 * Quebra um texto em palavras comparáveis: camelCase virou espaço, acento caiu,
 * tudo em minúsculas, pontuação fora. `pedidoStatus` → ["pedido","status"].
 */
function palavras(texto) {
  const separado = String(texto == null ? "" : texto)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return br.semAcento(separado).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Chave canônica de um termo ou estado: palavras juntas por underline. */
function chave(texto) {
  return palavras(texto).join("_");
}

// Palavra de ligação que o nome do conceito carrega e o código não escreve:
// "ordem de serviço" no glossário é `ordem_servico` na tabela.
const LIGACOES = new Set(
  "de do da dos das e em no na a o as os ao aos para pra por com um uma".split(" ")
);

/**
 * A sequência de palavras que se procura no código a partir de um nome escrito
 * por gente. Tira as ligações, porque "Ordem de serviço" vira `ordem_servico`
 * no banco e `ordemServico` no código, e nenhum dos dois tem o "de".
 */
function sequencia(texto) {
  const toks = palavras(texto);
  const limpo = toks.filter((t) => !LIGACOES.has(t));
  return limpo.length ? limpo : toks;
}

/** Escapa o que for especial em regex. Nome de campo é palavra, mas nome vem de arquivo. */
function escaparRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A sequência `seq` aparece dentro da lista `toks`? */
function contemSequencia(toks, seq) {
  if (seq.length === 0) return false;
  for (let i = 0; i + seq.length <= toks.length; i++) {
    let bate = true;
    for (let j = 0; j < seq.length; j++) {
      if (toks[i + j] !== seq[j]) { bate = false; break; }
    }
    if (bate) return true;
  }
  return false;
}

// ─────────────────────────── ler o glossário ───────────────────────────

const ROTULOS = {
  e: "definicao",
  "nao e": "nao_e",
  "no banco": "banco",
  "na tela": "tela",
  "no whatsapp": "whatsapp",
  nunca: "nunca",
  estados: "estados",
  "estado final": "finais",
  "de qualquer estado": "de_qualquer",
  "dono da palavra": "dono",
};

/**
 * Tira crase, negrito e espaço das pontas. O underline fica: `aguardando_pagamento`
 * é um nome de estado, e comer o underline aqui faz o estado do código nunca casar
 * com o do glossário (foi o primeiro defeito que este script teve).
 */
function limpar(v) {
  return String(v).replace(/`/g, "").replace(/\*\*/g, "").replace(/(^|\s)\*(\S)/g, "$1$2").trim();
}

/** Quebra "a, b → c | d" numa lista de pedaços, na ordem em que aparecem. */
function pedacos(v) {
  return limpar(v)
    .split(/→|->|,|;|\||\/(?=\s)/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Lê um GLOSSARIO.md e devolve a lista de termos.
 * Cada termo: { nome, linha, banco[], nunca[], estados[], finais[], deQualquer[], ... }
 */
function lerGlossario(arquivo) {
  const bruto = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  const linhas = bruto.split(/\r?\n/);
  const termos = [];
  let atual = null;
  let emCodigo = false;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (/^\s*```/.test(linha)) { emCodigo = !emCodigo; continue; }
    if (emCodigo) continue;

    const cab = linha.match(/^##\s+(.+?)\s*$/);
    if (cab) {
      const nome = limpar(cab[1]);
      atual = {
        nome,
        chave: chave(nome),
        linha: i + 1,
        definicao: "",
        nao_e: "",
        banco: [],
        tela: [],
        whatsapp: [],
        nunca: [],
        estados: [],
        transicoes: [],
        finais: [],
        deQualquer: [],
        dono: "",
      };
      continue;
    }

    const item = linha.match(/^\s*[-*]\s+\*\*(.+?):?\*\*:?\s*(.*)$/);
    if (!item || !atual) continue;
    // Só entra na lista a seção que tem pelo menos um rótulo conhecido. É o que
    // mantém "## Casos de borda decididos" e "## Fora do glossário" fora da
    // contagem de termos, sem precisar de lista de exceções.
    const rotuloBruto = br.semAcento(limpar(item[1])).replace(/\s+/g, " ").trim();
    const campo = ROTULOS[rotuloBruto];
    if (!campo) continue;
    const valor = item[2];
    if (!termos.includes(atual)) termos.push(atual);

    if (campo === "definicao" || campo === "nao_e" || campo === "dono") {
      atual[campo] = limpar(valor);
    } else if (campo === "estados") {
      // Rótulo repetido acumula em vez de substituir: quem tem mais de um ramo
      // escreve "**Estados:**" duas vezes, e perder a primeira linha aqui
      // apagaria metade da máquina de estado sem avisar ninguém.
      for (const e of pedacos(valor)) if (!atual.estados.includes(e)) atual.estados.push(e);
      // Transições só das setas: "a → b, c → d" liga a→b e c→d.
      const trechos = limpar(valor).split(/[,;]/);
      for (const t of trechos) {
        const cadeia = t.split(/→|->/).map((x) => x.trim()).filter(Boolean);
        for (let k = 0; k + 1 < cadeia.length; k++) {
          atual.transicoes.push([cadeia[k], cadeia[k + 1]]);
        }
      }
    } else if (campo === "finais") {
      for (const e of pedacos(valor)) if (!atual.finais.includes(e)) atual.finais.push(e);
    } else if (campo === "de_qualquer") {
      for (const e of pedacos(valor)) if (!atual.deQualquer.includes(e)) atual.deQualquer.push(e);
    } else {
      for (const e of pedacos(valor)) if (!atual[campo].includes(e)) atual[campo].push(e);
    }
  }

  return termos;
}

/** Todos os estados que o glossário conhece, em chave canônica. */
function estadosDoGlossario(termos) {
  const mapa = new Map();
  for (const t of termos) {
    for (const e of [...t.estados, ...t.finais, ...t.deQualquer]) {
      const k = chave(e);
      if (!k) continue;
      if (!mapa.has(k)) mapa.set(k, []);
      if (!mapa.get(k).includes(t.nome)) mapa.get(k).push(t.nome);
    }
  }
  return mapa;
}

/** Acha o GLOSSARIO.md: o que foi passado, ou o da pasta, ou o de até duas acima. */
function acharGlossario(pasta, passado) {
  if (passado) {
    if (!fs.existsSync(passado)) morrer(`não achei o glossário em ${curto(passado)}.`);
    return path.resolve(passado);
  }
  let dir = path.resolve(pasta);
  for (let i = 0; i < 3; i++) {
    const tentativa = path.join(dir, "GLOSSARIO.md");
    if (fs.existsSync(tentativa)) return tentativa;
    const acima = path.dirname(dir);
    if (acima === dir) break;
    dir = acima;
  }
  morrer(
    "não achei nenhum GLOSSARIO.md.",
    "Rode a skill /glossario pra escrever o primeiro, ou aponte o arquivo com --glossario <caminho>."
  );
}

// ─────────────────────────── varrer o código ───────────────────────────

/** Lista os arquivos de código de uma pasta, recursivo, pulando o que não é código. */
function arquivosDe(pasta) {
  const achados = [];
  const raiz = path.resolve(pasta);
  if (!fs.existsSync(raiz)) morrer(`a pasta ${curto(raiz)} não existe.`);
  const st = fs.statSync(raiz);
  if (st.isFile()) return [raiz];

  (function andar(dir) {
    let entradas;
    try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (PASTAS_FORA.has(e.name) || e.name.startsWith(".")) continue;
        andar(p);
      } else if (e.isFile() && EXT_CODIGO.has(path.extname(e.name).toLowerCase())) {
        let tam = 0;
        try { tam = fs.statSync(p).size; } catch { continue; }
        if (tam > 2 * 1024 * 1024) continue;
        achados.push(p);
      }
    }
  })(raiz);

  return achados.sort();
}

// O mesmo arquivo é varrido uma vez por variante procurada. Sem cache, um
// repositório de 500 arquivos viraria dezenas de milhares de leituras de disco.
const cacheLinhas = new Map();
const cacheTokens = new Map();

/** Lê um arquivo em linhas, tolerando arquivo binário disfarçado. */
function linhasDe(arquivo) {
  if (cacheLinhas.has(arquivo)) return cacheLinhas.get(arquivo);
  let linhas;
  try {
    linhas = fs.readFileSync(arquivo, "utf8").split(/\r?\n/);
  } catch {
    linhas = [];
  }
  cacheLinhas.set(arquivo, linhas);
  return linhas;
}

/** As palavras de cada linha do arquivo, calculadas uma vez só. */
function tokensDe(arquivo) {
  if (cacheTokens.has(arquivo)) return cacheTokens.get(arquivo);
  const toks = linhasDe(arquivo).map(palavras);
  cacheTokens.set(arquivo, toks);
  return toks;
}

/**
 * Onde cada palavra do domínio aparece.
 * Devolve Map<palavra, { total, arquivos:Set, exemplo:{arquivo,linha,texto} }>
 */
function contarPalavras(arquivos) {
  const conta = new Map();
  for (const arq of arquivos) {
    const linhas = linhasDe(arq);
    const toks = tokensDe(arq);
    for (let i = 0; i < linhas.length; i++) {
      for (const p of toks[i]) {
        if (p.length < 4 || /^\d+$/.test(p) || RUIDO.has(p)) continue;
        if (!conta.has(p)) conta.set(p, { total: 0, arquivos: new Set(), exemplo: null });
        const r = conta.get(p);
        r.total++;
        r.arquivos.add(arq);
        if (!r.exemplo) r.exemplo = { arquivo: arq, linha: i + 1, texto: linhas[i].trim().slice(0, 120) };
      }
    }
  }
  return conta;
}

/** Acha ocorrências de uma sequência de palavras no código. */
function ocorrencias(arquivos, seq, teto = 12) {
  const achados = [];
  for (const arq of arquivos) {
    const linhas = linhasDe(arq);
    const toks = tokensDe(arq);
    for (let i = 0; i < linhas.length; i++) {
      if (contemSequencia(toks[i], seq)) {
        achados.push({ arquivo: arq, linha: i + 1, texto: linhas[i].trim().slice(0, 120) });
        // Bateu no teto: a contagem passa a ser "pelo menos isso", e quem
        // imprime avisa. Dizer "12 lugares" quando são 200 faz o usuário
        // achar que a limpeza é pequena.
        if (achados.length >= teto) { achados.truncado = true; return achados; }
      }
    }
  }
  return achados;
}

// O que liga o campo de estado ao valor, em qualquer linguagem: atribuição,
// comparação, chave de objeto, lista de enum, IN e CHECK de SQL.
const LIGA = "(?:===|!==|==|!=|<>|=>|=|:|\\bin\\b|\\bnot\\s+in\\b|\\blike\\b|\\bdefault\\b|\\benum\\b)";

// Chave que carrega valor de estado fora do campo: <option value="pago">, um
// DEFAULT de migração, um `padrao: "rascunho"` de formulário.
const RE_CHAVE_VALOR = /(?<![A-Za-z0-9_])(?:value|valor|default|padrao)(?![A-Za-z0-9_])\s*[:=]?\s*/gi;

/** Aspas simples, duplas ou crase, com conteúdo curto e sem quebra de linha. */
const RE_LITERAL = /(['"`])([^'"`\n]{1,48})\1/g;

/** Isso parece nome de estado, ou é frase de mensagem e caminho de arquivo? */
function pareceEstado(cru) {
  if (!cru || /\s/.test(cru)) return false;
  if (/[<>{}()$\\/%:.@#]/.test(cru)) return false;
  if (/^\d+([.,]\d+)?$/.test(cru)) return false;
  return true;
}

/**
 * Colhe os literais presos à posição `de`. Aceita lista quando a lista abre ali
 * (`IN ('a','b')`, `['a','b']`) e aceita a barra vertical da união de tipo
 * (`'a' | 'b'`). Fora de lista, a vírgula NÃO liga: `console.log("erro",
 * pedido.status, "grave")` tem vírgula e o "grave" é outro argumento, não um
 * estado. Foi o defeito que fazia mensagem de log virar estado que falta.
 */
function literaisApos(linha, de) {
  let i = de;
  let lista = false;
  while (i < linha.length && /^[([\s]$/.test(linha[i])) {
    if (linha[i] === "(" || linha[i] === "[") lista = true;
    i++;
  }
  const achados = [];
  while (i < linha.length) {
    RE_LITERAL.lastIndex = i;
    const m = RE_LITERAL.exec(linha);
    if (!m || m.index !== i) break;
    const cru = m[2].trim();
    if (!pareceEstado(cru)) break;
    achados.push(cru);
    i = m.index + m[0].length;
    const sep = linha.slice(i).match(lista ? /^[\s,|]+/ : /^[\s|]+/);
    if (!sep) break;
    i += sep[0].length;
  }
  return achados;
}

/**
 * Textos entre aspas que estão presos a um campo de estado. Pega atribuição,
 * comparação, chave de objeto, lista de enum, CHECK e DEFAULT de SQL, e o
 * value da tela. O que não está preso ao campo não entra: a versão anterior
 * pegava qualquer palavra entre aspas na linha e acusava mensagem de log como
 * estado que falta no glossário.
 *
 * O que ela não pega, e está escrito na skill: enum sem aspas (`enum Status {
 * PAGO }`), estado montado por concatenação e estado que só existe no banco.
 */
function literaisDeEstado(arquivos, camposEstado) {
  const seqs = camposEstado.map((c) => palavras(c));
  const reCampos = camposEstado.map(
    (c) => new RegExp(`(?<![A-Za-z0-9_])${escaparRegex(c)}(?![A-Za-z0-9_])\\s*${LIGA}?\\s*`, "gi")
  );
  const achados = new Map();

  for (const arq of arquivos) {
    const linhas = linhasDe(arq);
    const porLinha = tokensDe(arq);
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      if (!seqs.some((s) => contemSequencia(porLinha[i], s))) continue;

      const crus = [];
      for (const re of reCampos) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(linha)) !== null) {
          crus.push(...literaisApos(linha, m.index + m[0].length));
          if (re.lastIndex === m.index) re.lastIndex++; // casamento vazio: não travar
        }
      }
      RE_CHAVE_VALOR.lastIndex = 0;
      let mv;
      while ((mv = RE_CHAVE_VALOR.exec(linha)) !== null) {
        crus.push(...literaisApos(linha, mv.index + mv[0].length));
        if (RE_CHAVE_VALOR.lastIndex === mv.index) RE_CHAVE_VALOR.lastIndex++;
      }

      for (const cru of crus) {
        const k = chave(cru);
        if (!k || k.length < 3) continue;
        if (camposEstado.some((c) => chave(c) === k)) continue; // é o nome do campo, não o estado
        if (!achados.has(k)) achados.set(k, { escrito: cru, ocorrencias: [] });
        const r = achados.get(k);
        const ja = r.ocorrencias.some((o) => o.arquivo === arq && o.linha === i + 1);
        if (!ja && r.ocorrencias.length < 6) {
          r.ocorrencias.push({ arquivo: arq, linha: i + 1, texto: linha.trim().slice(0, 120) });
        }
      }
    }
  }
  return achados;
}

// ─────────────────────────── conferir ───────────────────────────

function lerLexico(caminho) {
  const arq = caminho || LEXICO_PADRAO;
  if (!fs.existsSync(arq)) {
    morrer(`não achei o léxico em ${curto(arq)}.`, "Passe outro com --lexico, ou rode com --sem-lexico.");
  }
  try {
    return JSON.parse(fs.readFileSync(arq, "utf8").replace(/^﻿/, ""));
  } catch (e) {
    morrer(`o léxico ${curto(arq)} não é um JSON válido: ${e.message}`);
  }
}

/**
 * Compara glossário e código. Devolve o relatório em dados, sem imprimir nada.
 */
function conferir({ pasta, termos, lexico }) {
  const arquivos = arquivosDe(pasta);
  // Pasta sem código dava relatório de mentira: todo termo aparecia como "o
  // código não usa", quando o que aconteceu foi apontar pra pasta errada.
  if (!arquivos.length) {
    morrer(
      `não achei nenhum arquivo de código em ${curto(path.resolve(pasta))}.`,
      "Aponte a pasta onde o código mora (a raiz do repositório, app/, src/). O glossário pode ficar em outra: use --glossario."
    );
  }
  const rel = {
    pasta: path.resolve(pasta),
    arquivos: arquivos.length,
    termos: termos.length,
    proibidos: [],
    duplicados: [],
    semTermo: [],
    estadosDeFora: [],
    termosSemUso: [],
    variantesCurtas: [],
  };

  // Toda palavra que o glossário declara, em chave canônica: nome do termo e
  // grafia do banco. Nada que esteja aqui pode ser acusado de ser o nome errado
  // de outro conceito — o glossário que separa cliente de contato e de usuário
  // está certo, e o léxico junta os três como variantes de propósito.
  const declarados = new Set();
  for (const t of termos) {
    if (t.chave) declarados.add(t.chave);
    for (const b of t.banco || []) if (chave(b)) declarados.add(chave(b));
  }

  // 1. O que o glossário proíbe e o código usa.
  for (const t of termos) {
    for (const v of t.nunca) {
      const seq = sequencia(v);
      if (seq.join("").length < MIN_VARIANTE) {
        rel.variantesCurtas.push({ termo: t.nome, variante: v });
        continue;
      }
      const onde = ocorrencias(arquivos, seq);
      if (onde.length) rel.proibidos.push({ termo: t.nome, variante: v, onde });
    }
  }

  // 2. O mesmo conceito com dois nomes, pelo léxico.
  if (lexico) {
    for (const c of lexico.conceitos || []) {
      const presentes = [];
      for (const v of c.variantes || []) {
        const seq = sequencia(v);
        if (seq.join("").length < MIN_VARIANTE) continue;
        const onde = ocorrencias(arquivos, seq, 4);
        if (onde.length) presentes.push({ variante: v, vezes: onde.length, onde });
      }
      if (presentes.length < 2) continue;
      const doGlossario = termos.filter((t) =>
        (c.variantes || []).some((v) => chave(v) === t.chave) ||
        (t.banco || []).some((b) => (c.variantes || []).some((v) => chave(v) === chave(b)))
      );
      if (doGlossario.length) {
        const canonico = doGlossario[0];
        const jaAcusadas = new Set(rel.proibidos.map((x) => chave(x.variante)));
        const fora = presentes.filter((p) => !declarados.has(chave(p.variante)) &&
          !jaAcusadas.has(chave(p.variante)));
        if (fora.length) rel.duplicados.push({ conceito: c.conceito, canonico: canonico.nome, fora, fonte: c.fonte });
      } else {
        rel.semTermo.push({ conceito: c.conceito, sugerido: c.canonico_sugerido, presentes, fonte: c.fonte });
      }
    }
  }

  // 3. Estado que o código usa e o glossário não declara.
  const camposEstado = (lexico && lexico.campos_de_estado) || ["status", "estado", "situacao", "state"];
  const conhecidos = estadosDoGlossario(termos);
  const literais = literaisDeEstado(arquivos, camposEstado);
  const jaProibidas = new Set(rel.proibidos.map((x) => chave(x.variante)));
  for (const [k, v] of literais) {
    if (conhecidos.has(k)) continue;
    if (declarados.has(k)) continue; // é nome de termo ou de tabela, não de estado
    if (jaProibidas.has(k)) continue; // já saiu na lista de palavra proibida
    rel.estadosDeFora.push({ estado: v.escrito, chave: k, onde: v.ocorrencias });
  }

  // 4. Termo declarado que o código não usa.
  for (const t of termos) {
    const nomes = [t.nome, ...(t.banco || [])];
    const usado = nomes.some((n) => ocorrencias(arquivos, sequencia(n), 1).length > 0);
    if (!usado) rel.termosSemUso.push(t.nome);
  }

  return rel;
}

// ─────────────────────────── estados ───────────────────────────

/**
 * Higiene das máquinas de estado do glossário: quem não tem entrada, quem não
 * tem saída, e o estado que dois termos disputam.
 */
function analisarEstados(termos) {
  const rel = { termos: [], ambiguos: [] };
  const dono = new Map();

  for (const t of termos) {
    if (!t.estados.length) continue;
    const todos = [];
    for (const e of [...t.estados, ...t.finais]) {
      const k = chave(e);
      if (k && !todos.includes(k)) todos.push(k);
    }
    const entra = new Set();
    const sai = new Set();
    for (const [a, b] of t.transicoes) {
      sai.add(chave(a));
      entra.add(chave(b));
    }
    for (const d of t.deQualquer) entra.add(chave(d));

    const finais = new Set(t.finais.map(chave));
    const inicial = t.estados.length ? chave(t.estados[0]) : null;

    const semEntrada = todos.filter((k) => k !== inicial && !entra.has(k));
    const semSaida = todos.filter((k) => !sai.has(k) && !finais.has(k));

    rel.termos.push({
      termo: t.nome,
      inicial,
      quantos: todos.length,
      semEntrada,
      semSaida,
      semFinal: finais.size === 0,
      semCancelamento: !todos.some((k) => /cancel|estorn|devolv|recus|perdid/.test(k)),
    });

    for (const k of todos) {
      if (!dono.has(k)) dono.set(k, []);
      if (!dono.get(k).includes(t.nome)) dono.get(k).push(t.nome);
    }
  }

  for (const [k, lista] of dono) {
    if (lista.length > 1) rel.ambiguos.push({ estado: k, termos: lista });
  }

  return rel;
}

/**
 * O dono da palavra de cada termo: tem nome, tem data que existe, e a data não é
 * de outra era. A data passa pelo br.js, que recusa 31/02 em vez de corrigir
 * calado. Meio ano é o limite porque glossário parado é glossário que o código
 * já passou por cima.
 */
const DIAS_ESQUECIDO = 180;

function analisarDonos(termos, hoje = new Date()) {
  const rel = { semDono: [], dataInvalida: [], esquecidos: [] };
  for (const t of termos) {
    const bruto = String(t.dono || "").trim();
    if (!bruto) { rel.semDono.push(t.nome); continue; }
    const m = bruto.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
    if (!m) { rel.dataInvalida.push({ termo: t.nome, escrito: bruto }); continue; }
    const d = br.lerData(m[1]);
    if (!d) { rel.dataInvalida.push({ termo: t.nome, escrito: m[1] }); continue; }
    const dias = br.diasEntre(d, hoje);
    if (dias > DIAS_ESQUECIDO) rel.esquecidos.push({ termo: t.nome, dias, data: br.fmt(d) });
  }
  return rel;
}

// ─────────────────────────── saída ───────────────────────────

function cab(titulo) {
  console.log(`\n${titulo}`);
}

function imprimirConferir(rel, glossario) {
  cab(`GLOSSÁRIO: ${curto(glossario)}`);
  console.log(`  · ${rel.termos} termo(s) declarado(s), ${rel.arquivos} arquivo(s) de código lido(s) em ${curto(rel.pasta)}`);

  if (rel.proibidos.length) {
    cab("✖ Palavra que o glossário proíbe, e o código usa");
    for (const p of rel.proibidos) {
      problemas++;
      const quantos = p.onde.truncado ? `pelo menos ${p.onde.length}` : `${p.onde.length}`;
      console.log(`  ${p.termo}: "${p.variante}" em ${quantos} lugar(es)`);
      for (const o of p.onde.slice(0, 4)) console.log(`      ${curto(o.arquivo)}:${o.linha}  ${o.texto}`);
      if (p.onde.length > 4) {
        console.log(`      … e mais ${p.onde.length - 4}${p.onde.truncado ? " até onde a busca foi" : ""}`);
      }
    }
  }

  if (rel.duplicados.length) {
    cab("✖ O mesmo conceito com mais de um nome");
    for (const d of rel.duplicados) {
      problemas++;
      console.log(`  ${d.conceito}: o glossário diz "${d.canonico}", mas o código também usa:`);
      for (const f of d.fora) {
        console.log(`      "${f.variante}" — ${curto(f.onde[0].arquivo)}:${f.onde[0].linha}`);
      }
      if (d.fonte) console.log(`      referência do conceito: ${d.fonte}`);
    }
  }

  if (rel.semTermo.length) {
    cab("⚠ Conceito que o código trata com dois nomes e o glossário não menciona");
    for (const s of rel.semTermo) {
      avisos++;
      const nomes = s.presentes.map((p) => `"${p.variante}"`).join(", ");
      console.log(`  ${s.conceito}: ${nomes} — sugestão de nome único: ${s.sugerido}`);
      console.log(`      primeiro lugar: ${curto(s.presentes[0].onde[0].arquivo)}:${s.presentes[0].onde[0].linha}`);
    }
  }

  if (rel.estadosDeFora.length) {
    cab("✖ Estado que o código usa e o glossário não declara");
    for (const e of rel.estadosDeFora) {
      problemas++;
      console.log(`  "${e.estado}" — ${e.onde.length} lugar(es)`);
      for (const o of e.onde.slice(0, 3)) console.log(`      ${curto(o.arquivo)}:${o.linha}  ${o.texto}`);
    }
  }

  if (rel.termosSemUso.length) {
    cab("⚠ Termo no glossário que o código não usa em lugar nenhum");
    for (const t of rel.termosSemUso) { avisos++; console.log(`  ${t}`); }
    console.log("  (ou o termo morreu e sai do glossário, ou a parte que o usa ainda não foi escrita)");
  }

  if (rel.variantesCurtas.length) {
    cab("⚠ Variante curta demais pra conferir por máquina");
    for (const v of rel.variantesCurtas) {
      avisos++;
      console.log(`  ${v.termo}: "${v.variante}" tem menos de ${MIN_VARIANTE} letras — escreva a forma completa`);
    }
  }

  if (!problemas && !avisos) console.log("\n✓ código e glossário falam a mesma língua.");
}

function imprimirDonos(rel) {
  if (rel.semDono.length) {
    cab("⚠ Termo sem dono da palavra");
    for (const t of rel.semDono) { avisos++; console.log(`  ${t}`); }
    console.log("  Termo sem dono é termo que ninguém defende quando duas pessoas discordarem");
  }
  if (rel.dataInvalida.length) {
    cab("⚠ Data do dono que não existe no calendário");
    for (const d of rel.dataInvalida) {
      avisos++;
      console.log(`  ${d.termo}: "${d.escrito}" — escreva DD/MM/AAAA`);
    }
  }
  if (rel.esquecidos.length) {
    cab(`⚠ Termo que ninguém revisou há mais de ${DIAS_ESQUECIDO} dias`);
    for (const e of rel.esquecidos) {
      avisos++;
      console.log(`  ${e.termo} — última confirmação em ${e.data}, ${e.dias} dias atrás`);
    }
  }
}

function imprimirEstados(rel, arquivo) {
  cab(`ESTADOS: ${curto(arquivo)}`);
  if (!rel.termos.length) {
    console.log("  · nenhum termo com a linha **Estados:**. Nada pra conferir.");
    return;
  }
  for (const t of rel.termos) {
    console.log(`\n  ${t.termo} — ${t.quantos} estado(s), começa em "${t.inicial}"`);
    if (t.semEntrada.length) {
      problemas++;
      console.log(`    ✖ sem jeito de chegar: ${t.semEntrada.join(", ")}`);
    }
    if (t.semSaida.length) {
      problemas++;
      console.log(`    ✖ sem jeito de sair e não declarado final: ${t.semSaida.join(", ")}`);
    }
    if (t.semFinal) {
      problemas++;
      console.log("    ✖ nenhum estado final declarado — falta a linha **Estado final:**");
    }
    if (t.semCancelamento) {
      avisos++;
      console.log("    ⚠ nenhum estado de desistência (cancelado, recusado, devolvido, estornado). Alguém vai desistir");
    }
    if (!t.semEntrada.length && !t.semSaida.length && !t.semFinal && !t.semCancelamento) {
      console.log("    ✓ toda entrada e toda saída fecham");
    }
  }
  if (rel.ambiguos.length) {
    cab("⚠ A mesma palavra de estado em mais de um termo");
    for (const a of rel.ambiguos) {
      avisos++;
      console.log(`  "${a.estado}" — ${a.termos.join(", ")}`);
    }
    console.log("  Pode ser de propósito. Só confira se num relatório a palavra sozinha diz de quê");
  }
}

function imprimirVarrer(conta, lexico, limite, saida) {
  const lista = [...conta.entries()]
    .map(([p, r]) => ({ palavra: p, total: r.total, arquivos: r.arquivos.size, exemplo: r.exemplo }))
    .sort((a, b) => b.arquivos - a.arquivos || b.total - a.total)
    .slice(0, limite);

  // Variante de uma palavra é procurada direto. A de duas (`line_item`,
  // `produto_pedido`) só conta quando as duas palavras aparecem: aqui a conta é
  // por palavra, não por linha, e isso é palpite pra entrevista, não acusação.
  const grupos = [];
  const vagos = [];
  if (lexico) {
    for (const c of lexico.conceitos || []) {
      const achadas = (c.variantes || []).filter((v) => {
        const toks = sequencia(v);
        return toks.length > 0 && toks.every((t) => conta.has(t));
      });
      if (achadas.length >= 2) grupos.push({ conceito: c.conceito, variantes: achadas, sugerido: c.canonico_sugerido });
    }
    for (const v of lexico.nomes_vagos || []) {
      const r = conta.get(chave(v));
      if (r) vagos.push({ palavra: v, arquivos: r.arquivos.size, exemplo: r.exemplo });
    }
  }

  const linhas = [];
  linhas.push("# Vocabulário que o código já usa");
  linhas.push("");
  linhas.push("Palavras ordenadas por quantos arquivos as citam. É a lista que a entrevista do");
  linhas.push("`/glossario` percorre: cada uma vira pergunta, ou é descartada como termo técnico.");
  linhas.push("");
  linhas.push("| Palavra | Arquivos | Vezes | Primeiro lugar |");
  linhas.push("|---|---|---|---|");
  for (const l of lista) {
    linhas.push(`| ${l.palavra} | ${l.arquivos} | ${l.total} | ${curto(l.exemplo.arquivo)}:${l.exemplo.linha} |`);
  }
  if (grupos.length) {
    linhas.push("");
    linhas.push("## Conceitos que podem estar com mais de um nome");
    linhas.push("");
    linhas.push("Cada linha é palpite do léxico, não veredito. Às vezes são duas coisas diferentes");
    linhas.push("de propósito (cliente e usuário, entrega e frete): confirmar na entrevista.");
    linhas.push("");
    for (const g of grupos) {
      linhas.push(`- **${g.conceito}** — ${g.variantes.join(", ")}. Nome único sugerido: \`${g.sugerido}\``);
    }
  }
  if (vagos.length) {
    linhas.push("");
    linhas.push("## Nome vago que o código usa");
    linhas.push("");
    linhas.push("Palavra que não diz de que. Cada uma esconde um conceito que a entrevista precisa");
    linhas.push("nomear, ou é lixo que sobrou de um rascunho.");
    linhas.push("");
    for (const v of vagos) {
      linhas.push(`- \`${v.palavra}\` — ${v.arquivos} arquivo(s), primeiro em ${curto(v.exemplo.arquivo)}:${v.exemplo.linha}`);
    }
  }
  const texto = linhas.join("\n") + "\n";

  if (saida) {
    try {
      fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
      fs.writeFileSync(saida, texto, "utf8");
    } catch (e) {
      morrer(`não consegui gravar em ${curto(saida)}: ${e.message}`, "Confira o caminho depois de --saida.");
    }
    console.log(`\n✓ ${curto(saida)} — ${lista.length} palavra(s), ${grupos.length} conceito(s) com nome repetido, ${vagos.length} nome(s) vago(s)`);
  } else {
    console.log("\n" + texto);
  }
  return { lista, grupos, vagos };
}

// ─────────────────────────── linha de comando ───────────────────────────

function opcoes(argv) {
  const o = { _: [] };
  // Opção sem valor era aceita calada: `--glossario` no fim da linha virava
  // undefined e o script caía na busca automática, apontando pro glossário
  // errado sem dizer nada.
  const valorDe = (i, nome) => {
    const v = argv[i];
    if (v === undefined || v.startsWith("--")) morrer(`falta o valor depois de ${nome}.`, "Rode sem argumento pra ver o uso.");
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--sem-lexico") o.semLexico = true;
    else if (a === "--glossario") o.glossario = valorDe(++i, a);
    else if (a === "--lexico") o.lexico = valorDe(++i, a);
    else if (a === "--saida") o.saida = valorDe(++i, a);
    else if (a === "--limite") {
      const cru = valorDe(++i, a);
      const n = Number(cru);
      if (!Number.isInteger(n) || n < 1 || n > 500) {
        morrer(`--limite pede um número inteiro de 1 a 500, e veio "${cru}".`);
      }
      o.limite = n;
    } else if (a.startsWith("--")) morrer(`não conheço a opção ${a}.`, "Rode sem argumento pra ver o uso.");
    else o._.push(a);
  }
  return o;
}

function uso() {
  console.log(`
Contex OS — glossario.js

  node scripts/glossario.js varrer <pasta>            vocabulário do código e os nomes vagos
  node scripts/glossario.js conferir <pasta>          glossário contra código
  node scripts/glossario.js estados <GLOSSARIO.md>    máquinas de estado e dono de cada termo

Opções: --glossario <arquivo>  --lexico <arquivo>  --json  --saida <arquivo>
        --limite <n>  --sem-lexico
`);
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) { uso(); process.exit(0); }
  const o = opcoes(argv);
  const comando = o._[0];
  const alvo = o._[1];
  if (alvo && fs.existsSync(alvo)) {
    const abs = path.resolve(alvo);
    baseExibicao = fs.statSync(abs).isDirectory() ? abs : path.dirname(abs);
  }

  if (comando === "varrer") {
    if (!alvo) morrer("falta a pasta.", "node scripts/glossario.js varrer sistemas/pedidos/");
    const lexico = o.semLexico ? null : lerLexico(o.lexico);
      const arquivos = arquivosDe(alvo);
    if (!arquivos.length) {
      morrer(
        `não achei nenhum arquivo de código em ${curto(path.resolve(alvo))}.`,
        "Aponte a pasta onde o código mora (a raiz do repositório, app/, src/)."
      );
    }
    const conta = contarPalavras(arquivos);
    const r = imprimirVarrer(conta, lexico, o.limite || 40, o.saida);
    if (o.json) console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }

  if (comando === "conferir") {
    if (!alvo) morrer("falta a pasta do código.", "node scripts/glossario.js conferir sistemas/pedidos/");
    const glossario = acharGlossario(alvo, o.glossario);
    const termos = lerGlossario(glossario);
    if (!termos.length) {
      morrer(
        `${curto(glossario)} não tem nenhuma seção "## <Termo>".`,
        "O formato está no cabeçalho deste script e no molde templates/software/glossario.md."
      );
    }
    const lexico = o.semLexico ? null : lerLexico(o.lexico);
    const rel = conferir({ pasta: alvo, termos, lexico });
    if (o.json) {
      imprimirConferir(rel, glossario);
      console.log(JSON.stringify(rel, null, 2));
    } else {
      imprimirConferir(rel, glossario);
    }
    console.log(`\n${problemas} problema(s), ${avisos} aviso(s).`);
    process.exit(problemas ? 1 : 0);
  }

  if (comando === "estados") {
    if (!alvo) morrer("falta o arquivo do glossário.", "node scripts/glossario.js estados sistemas/pedidos/GLOSSARIO.md");
    if (!fs.existsSync(alvo)) morrer(`não achei ${curto(alvo)}.`);
    const termos = lerGlossario(alvo);
    const rel = analisarEstados(termos);
    imprimirEstados(rel, alvo);
    const donos = analisarDonos(termos);
    imprimirDonos(donos);
    if (o.json) console.log(JSON.stringify({ ...rel, donos }, null, 2));
    console.log(`\n${problemas} problema(s), ${avisos} aviso(s).`);
    process.exit(problemas ? 1 : 0);
  }

  morrer(`não conheço o comando "${comando}".`, "Os comandos são: varrer, conferir, estados.");
}

module.exports = {
  lerGlossario, estadosDoGlossario, analisarEstados, analisarDonos, conferir,
  palavras, chave, sequencia, contemSequencia, literaisDeEstado, contarPalavras, arquivosDe,
};

if (require.main === module) main();
