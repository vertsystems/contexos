#!/usr/bin/env node
/**
 * Contex OS — briefing-reuniao.js
 * Cruza o que o workspace já sabe sobre um cliente antes de uma conversa com
 * ele: a última ata do /reuniao, os itens dele em tarefas.md, a ficha do
 * /pessoa, a proposta, o contrato e a cobrança em aberto. Calcula dias desde o
 * último contato, pendências vencidas de cada lado e o valor em jogo somado, e
 * devolve o esqueleto da página de briefing com as contas prontas.
 *
 * Existe porque briefing feito de memória erra nas três coisas que o cliente
 * percebe: promete de novo o que já foi prometido, esquece o que ele ficou
 * de mandar, e chuta o valor que está na mesa. Aqui cada linha aponta o
 * arquivo de onde saiu, e o que o script não acha fica [a confirmar], nunca
 * preenchido com plausível.
 *
 * Uso:
 *   node scripts/briefing-reuniao.js "<cliente>" [opções]
 *
 * Opções:
 *   --hoje DD/MM/AAAA          data da conversa (padrão: hoje). É dela que saem o
 *                              dia da semana do título e a conta do que está vencido
 *   --tipo <conversa>          reuniao (padrão), call, whatsapp, visita ou balcao.
 *                              Muda quais seções entram, conforme o molde
 *                              templates/operacao/briefing-reuniao.md
 *   --eu "Nome"                como o usuário aparece na coluna "Quem" das atas.
 *                              Sem isso o script tenta as linhas "Dono:" e
 *                              "Responsável:" de _memoria/empresa.md; se não achar,
 *                              as tarefas da ata saem numa seção separada, sem dono
 *   --raiz <pasta>             raiz do workspace (padrão: pasta atual)
 *   --pasta <pasta>            pasta do cliente na convenção por cliente
 *                              (padrão: procura clientes/<Nome>/ pelo nome)
 *   --valor "rótulo=1234,56"   valor em jogo que não está em arquivo (proposta em
 *                              PDF, acordo verbal). Repetir pra cada um. O rótulo
 *                              vira a fonte na tabela
 *   --ultimo-contato DD/MM/AAAA  último contato que não deixou arquivo (ligação,
 *                              WhatsApp). Só vale se for mais recente que o achado
 *   --json                     imprime o cruzamento em JSON, pra outra ferramenta
 *   --saida <arquivo.md>       grava o esqueleto em vez de imprimir
 *
 * O que sai: cabeçalho com os números (dias sem contato, pendências vencidas
 * de cada lado, valor em jogo com fonte), a lista do que você prometeu e
 * ainda está aberto, a lista do que ele deve (resposta, insumo, parcela), a
 * lista das tarefas da ata com um nome que não é nem o seu nem o dele, o
 * resumo da última ata, o que a ficha do /pessoa manda não reexplicar, e as
 * seções de julgamento (o que ele espera ouvir, as três perguntas, a meta)
 * com [preencher]. Essas o assistente escreve lendo o material; o script só
 * faz a conta e aponta a fonte.
 *
 * Node 18+, sem dependência além do br.js ao lado.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── utilidades ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function existe(p) { try { return fs.existsSync(p); } catch { return false; } }
function ler(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }
function listar(dir) { try { return fs.readdirSync(dir); } catch { return []; } }

/** Comparação sem acento nem caixa: "acme" bate com "ACME Ltda". */
function contem(texto, alvo) {
  const a = br.semAcento(String(alvo || "")).trim();
  if (!a) return false;
  return br.semAcento(String(texto || "")).includes(a);
}

/** Data "AAAA-MM-DD" no nome de arquivo ou pasta, ou null. */
function dataDoNome(nome) {
  const m = String(nome).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? br.lerData(m[1]) : null;
}

/**
 * Data num texto curto: a que vem depois de "vence", "cobrar", "até" ou "dia";
 * senão a primeira DD/MM; senão a AAAA-MM-DD, que é como a ficha do /pessoa
 * escreve prazo no frontmatter.
 */
function dataNoTexto(s, anoPadrao) {
  const t = String(s || "");
  const m = t.match(/(?:vence|cobrar|at[eé]|follow-up|dia|entrega)\D{0,12}?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i)
    || t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (m) return br.lerData(m[3] ? `${m[1]}/${m[2]}/${m[3]}` : `${m[1]}/${m[2]}`, anoPadrao);
  const iso = t.match(/\d{4}-\d{2}-\d{2}/);
  return iso ? br.lerData(iso[0]) : null;
}

/** Texto de um HTML: sem style, script e tag. Suficiente pra achar "R$ 8.500,00". */
function textoDoHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ");
}

/** Todos os "R$ x" de um texto, com o trecho ao redor, pra dizer de onde veio. */
function valoresReais(texto) {
  const out = [];
  for (const m of texto.matchAll(/R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/g)) {
    const n = br.numero(m[1]);
    if (!isFinite(n) || n <= 0) continue;
    const ini = Math.max(0, m.index - 70);
    const trecho = texto.slice(ini, m.index + m[0].length + 20).replace(/\s+/g, " ").trim();
    out.push({ valor: n, trecho });
  }
  return out;
}

/**
 * Escolhe o valor "do documento" numa lista de R$: o que estiver perto de
 * "total", "investimento" ou "valor do contrato"; senão o maior. Marca se a
 * escolha foi por palavra ou por tamanho, porque a segunda pede confirmação.
 */
function valorPrincipal(valores) {
  if (!valores.length) return null;
  const chave = valores.filter((v) => /total|investimento|valor do contrato|valor global/i.test(v.trecho));
  if (chave.length) return { ...chave.reduce((a, b) => (b.valor > a.valor ? b : a)), como: "palavra-chave" };
  const maior = valores.reduce((a, b) => (b.valor > a.valor ? b : a));
  return { ...maior, como: "maior valor (confirmar)" };
}

/** Corpo de uma seção "## X" até o próximo "## " ou o fim do arquivo. Sem flag m: "$" é o fim do texto. */
function secaoRe(titulo) { return new RegExp(`(?:^|\\n)##\\s+${titulo}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i"); }

/** Linhas de uma tabela markdown sob um título "## X": array de células por linha. */
function tabelaSob(md, titulo) {
  const m = md.match(secaoRe(titulo));
  if (!m) return { cabecalho: [], linhas: [] };
  const linhas = m[1].split("\n").filter((l) => l.trim().startsWith("|"));
  const celulas = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  if (linhas.length < 2) return { cabecalho: [], linhas: [] };
  const cabecalho = celulas(linhas[0]).map((c) => br.semAcento(c));
  const corpo = linhas.slice(2).map(celulas).filter((c) => c.some((x) => x));
  return { cabecalho, linhas: corpo };
}

/** Texto (parágrafos e bullets) sob um título "## X", sem tabela. */
function textoSob(md, titulo) {
  const m = md.match(secaoRe(titulo));
  return m ? m[1].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("|") && !l.startsWith("[")).join("\n") : "";
}

/** Frontmatter YAML raso de uma ficha do /pessoa: "chave: valor" e listas com "- ". */
function frontmatter(md) {
  const m = String(md).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  let chave = null;
  for (const linha of m[1].split("\n")) {
    const kv = linha.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (kv) { chave = kv[1].toLowerCase(); out[chave] = kv[2].trim(); continue; }
    const item = linha.match(/^\s+-\s+(.*)$/);
    if (item && chave) {
      if (!Array.isArray(out[chave])) out[chave] = out[chave] ? [out[chave]] : [];
      out[chave].push(item[1].trim());
    }
  }
  return out;
}

const fmTexto = (v) => (Array.isArray(v) ? v.join("; ") : String(v || "").trim());
const fmLista = (v) => (Array.isArray(v) ? v.filter(Boolean) : (String(v || "").trim() ? [String(v).trim()] : []));

/** Palavras que não distinguem um item do outro na hora de comparar duas linhas. */
const VAZIAS = new Set(["para", "pra", "com", "dos", "das", "que", "uma", "pelo", "pela", "sobre", "cobrar", "vence", "vencimento", "reuniao", "ata", "hoje", "dia", "ainda", "sem", "este", "essa", "esse"]);

/** Palavras de quatro letras ou mais de um item, sem as vazias. */
function palavrasDoItem(s) {
  return new Set(br.semAcento(s).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((p) => p.length >= 4 && !/^\d+$/.test(p) && !VAZIAS.has(p)));
}

/**
 * Dois itens são o mesmo quando o texto menor cabe inteiro no maior ("Enviar
 * proposta revisada" dentro de "Enviar proposta revisada pra Acme, vence 15/09"),
 * ou quando quase cabe e a data bate. Sem a data, quase não basta: perder uma
 * pendência de verdade é pior que mostrar duas linhas parecidas.
 */
function mesmoItem(a, b) {
  const A = a.palavras, B = b.palavras;
  if (!A.size || !B.size) return false;
  const [menor, maior] = A.size <= B.size ? [A, B] : [B, A];
  let iguais = 0;
  for (const p of menor) if (maior.has(p)) iguais++;
  const razao = iguais / menor.size;
  return razao === 1 || (razao >= 0.6 && !!a.data && a.data === b.data);
}

function pegarOpcao(args, nome, repetir = false) {
  const vals = [];
  for (let i = 0; i < args.length; i++) if (args[i] === nome && args[i + 1] !== undefined) vals.push(args[++i]);
  return repetir ? vals : vals[vals.length - 1];
}

/** Mais novo primeiro; documento sem data no nome vai pro fim, mas não se perde. */
function porDataDesc(a, b) {
  if (a.data && b.data) return b.data - a.data;
  if (a.data) return -1;
  if (b.data) return 1;
  return 0;
}

// ─────────────────────────── onde procurar ───────────────────────────

/** Acha clientes/<Nome>/ pelo nome, tolerando acento e caixa. */
function acharPastaCliente(raiz, cliente) {
  const base = path.join(raiz, "clientes");
  const alvo = br.slug(cliente);
  for (const nome of listar(base)) {
    const s = br.slug(nome);
    if (s === alvo || s.includes(alvo) || alvo.includes(s)) return path.join(base, nome);
  }
  return null;
}

/**
 * Nome do usuário em _memoria/empresa.md. "Dono:" e "Responsável:" são pessoa,
 * então valem direto. "Nome:" no molde da memória é o nome do negócio ("Estúdio
 * Vert"), que raramente aparece na coluna "Quem" de uma ata: entra como palpite,
 * e o cruzamento só o usa se ele bater com alguma tarefa da ata.
 */
function acharEu(raiz) {
  const md = ler(path.join(raiz, "_memoria", "empresa.md"));
  const linha = (re) => { const m = md.match(re); return m ? m[1].trim().split(/[,(|]/)[0].trim() : null; };
  const pessoa = linha(/^\s*(?:[-*]\s*)?\**(?:dono|dona|respons[aá]vel)\**\s*:\**\s*([^\n|]+)/im);
  if (pessoa) return { nome: pessoa, fonte: "_memoria/empresa.md", confiavel: true };
  const nome = linha(/^\s*(?:[-*]\s*)?\**nome\**\s*:\**\s*([^\n|]+)/im);
  if (nome) return { nome, fonte: '_memoria/empresa.md (linha "Nome:")', confiavel: false };
  return null;
}

// ─────────────────────────── fontes ───────────────────────────

/** Atas do /reuniao que citam o cliente, da mais nova pra mais velha. */
function acharAtas(pastas, cliente, pastaCliente) {
  const atas = [];
  const vistos = new Set();
  for (const dir of pastas) {
    for (const nome of listar(dir)) {
      if (!/^\d{4}-\d{2}-\d{2}(?:-.+)?\.md$/.test(nome)) continue;
      if (/-briefing[^/]*\.md$|-cliente\.md$/i.test(nome)) continue; // a saída desta skill mora em reunioes/
      const dentroDoCliente = pastaCliente && dir.startsWith(pastaCliente);
      if (!dentroDoCliente && !contem(nome, br.slug(cliente))) continue;
      const cheio = path.join(dir, nome);
      if (vistos.has(cheio)) continue;
      vistos.add(cheio);
      atas.push({ arquivo: cheio, data: dataDoNome(nome) });
    }
  }
  return atas.filter((a) => a.data).sort((a, b) => b.data - a.data);
}

/**
 * Quem, na linha "**Com:**" da ata, está do lado do cliente. O molde do
 * /reuniao pede "participantes, com empresa quando é cliente", então
 * "Carla Mendes (Acme), Bruno" entrega "carla" e "mendes" quando o cliente é
 * Acme. Serve pra não tratar a pessoa de contato do cliente como terceiro só
 * porque ela ainda não tem ficha do /pessoa.
 */
const HONORIFICOS = new Set(["dona", "dono", "sra", "sr", "senhor", "senhora", "dra", "doutor", "doutora", "seu"]);

function gentesDoCliente(md, cliente) {
  const m = String(md).match(/^\s*\**Com:\**\s*(.+)$/im);
  if (!m) return [];
  const nomes = [];
  for (const parte of m[1].split(/[,;]| e /)) {
    if (!contem(parte, cliente)) continue;
    const semEmpresa = parte.replace(/\([^)]*\)/g, " ").replace(new RegExp(br.semAcento(cliente).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
    for (const p of br.semAcento(semEmpresa).replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
      if (p.length >= 3 && !HONORIFICOS.has(p) && !nomes.includes(p)) nomes.push(p);
    }
  }
  return nomes;
}

function lerAta(arquivo, hoje, cliente) {
  const md = ler(arquivo);
  const tarefas = tabelaSob(md, "Tarefas");
  const iQuem = tarefas.cabecalho.indexOf("quem"), iOque = tarefas.cabecalho.findIndex((c) => c.startsWith("o qu")),
    iAte = tarefas.cabecalho.findIndex((c) => c.startsWith("ate"));
  const itens = tarefas.linhas.map((c) => {
    const ate = iAte >= 0 ? c[iAte] : "";
    const data = /a confirmar/i.test(ate) ? null : dataNoTexto(ate, hoje.getFullYear());
    return { quem: iQuem >= 0 ? c[iQuem] : "", oque: iOque >= 0 ? c[iOque] : c.join(" "), ate: ate || "", data };
  });
  const pend = tabelaSob(md, "Pend[eê]ncias");
  const decis = tabelaSob(md, "Decis[oõ]es");
  return {
    arquivo,
    gentes: gentesDoCliente(md, cliente),
    fraseDaReuniao: textoSob(md, "Em uma frase").split("\n")[0] || "",
    decisoes: decis.linhas.map((c) => c.slice(1, 3).join(" · ")),
    tarefas: itens,
    pendencias: pend.linhas.map((c) => ({ oque: c[0] || "", quem: c[1] || "", trava: c[2] || "" })),
    proximaReuniao: textoSob(md, "Pr[oó]xima reuni[aã]o").split("\n")[0] || "",
    viraOQue: textoSob(md, "Vira o qu[eê]").split("\n").filter((l) => l.startsWith("-")),
  };
}

/** Itens abertos de tarefas.md que citam o cliente, com a seção de origem. */
function lerTarefas(raiz, cliente, hoje) {
  const md = ler(path.join(raiz, "tarefas.md"));
  if (!md) return { existe: false, itens: [] };
  const anoArq = (md.match(/Atualizado em (\d{4})/) || [])[1];
  const ano = anoArq ? Number(anoArq) : hoje.getFullYear();
  let secao = "";
  const itens = [];
  for (const linha of md.split("\n")) {
    const h = linha.match(/^##\s+(.+)/);
    if (h) { secao = h[1].trim(); continue; }
    const m = linha.match(/^\s*-\s*\[( |x|X)\]\s*(.+)/);
    if (!m || m[1] !== " ") continue;
    if (!contem(m[2], cliente)) continue;
    const texto = m[2].trim();
    itens.push({ secao, texto, data: dataNoTexto(texto.replace(/^\d{2}\/\d{2}\s*[—-]\s*/, ""), ano) });
  }
  return { existe: true, itens };
}

/**
 * Fichas do /pessoa que apontam pra esse cliente: pessoas/<slug>.md com
 * "empresa:" batendo com o nome, ou o nome da própria pessoa (cliente pessoa
 * física). É de lá que saem o "não reexplicar", o que ela pediu pra não
 * tocar e as promessas dos dois lados registradas fora da ata.
 */
function lerPessoas(raiz, cliente, pastaCliente) {
  const dirs = [path.join(raiz, "pessoas"), ...(pastaCliente ? [pastaCliente] : [])];
  const fichas = [];
  const vistos = new Set();
  for (const dir of dirs) {
    for (const nome of listar(dir)) {
      if (!/\.md$/i.test(nome) || /^indice\.md$/i.test(nome)) continue;
      const cheio = path.join(dir, nome);
      if (vistos.has(cheio)) continue;
      const md = ler(cheio);
      const fm = frontmatter(md);
      if (!fm.nome && !fm.papel) continue; // não é ficha do /pessoa
      const empresa = fmTexto(fm.empresa), quem = fmTexto(fm.nome);
      const bate = contem(empresa, cliente) || contem(quem, cliente) || contem(cliente, quem) || br.slug(nome.replace(/\.md$/i, "")) === br.slug(cliente);
      if (!bate) continue;
      vistos.add(cheio);
      fichas.push({
        arquivo: cheio,
        nome: quem || nome.replace(/\.md$/i, ""),
        papel: fmTexto(fm.papel),
        empresa,
        canal: fmTexto(fm.canal),
        oQueImporta: fmTexto(fm.o_que_importa),
        naoContatar: fmTexto(fm.nao_contatar),
        euPrometi: fmLista(fm.eu_prometi),
        mePrometeu: fmLista(fm.me_prometeu),
        proximoPasso: fmTexto(fm.proximo_passo),
        proximoPassoAte: (() => { const d = br.lerData(fmTexto(fm.proximo_passo_ate)); return d ? br.fmt(d) : fmTexto(fm.proximo_passo_ate); })(),
        ultimoContato: br.lerData(fmTexto(fm.ultimo_contato)),
        naoReexplicar: textoSob(md, "O que n[aã]o reexplicar").split("\n").filter((l) => l.startsWith("-")).map((l) => l.replace(/^-\s*/, "")),
      });
    }
  }
  return fichas;
}

/**
 * Arquivo mais novo do cliente numa lista de pastas. Entrada casa se o nome
 * cita o cliente ou se a pasta já é a dele (convenção por cliente). Pasta
 * casada é aberta um nível (contratos/<cliente>-<data>/contrato.md). Documento
 * sem data no nome continua valendo: perde a vez pro datado, não a existência.
 */
function acharDocumento(pastas, cliente, regexArquivo, pastaCliente) {
  const achados = [];
  const alvo = br.slug(cliente);
  for (const dir of pastas) {
    const dentroDoCliente = pastaCliente && dir.startsWith(pastaCliente);
    for (const nome of listar(dir)) {
      const cheio = path.join(dir, nome);
      let ehPasta = false; try { ehPasta = fs.statSync(cheio).isDirectory(); } catch { continue; }
      if (/-briefing[^/]*\.md$/i.test(nome)) continue;
      if (!contem(nome, alvo) && !dentroDoCliente) continue;
      if (ehPasta) {
        for (const filho of listar(cheio)) if (regexArquivo.test(filho)) achados.push({ arquivo: path.join(cheio, filho), data: dataDoNome(nome) || dataDoNome(filho) });
      } else if (regexArquivo.test(nome)) {
        achados.push({ arquivo: cheio, data: dataDoNome(nome) });
      }
    }
  }
  return achados.sort(porDataDesc)[0] || null;
}

function lerValorDoDocumento(doc) {
  if (!doc) return null;
  const bruto = ler(doc.arquivo);
  const texto = doc.arquivo.endsWith(".html") ? textoDoHtml(bruto) : bruto;
  const principal = valorPrincipal(valoresReais(texto));
  return { ...doc, valor: principal ? principal.valor : null, como: principal ? principal.como : "sem R$ no arquivo", trecho: principal ? principal.trecho : "" };
}

/**
 * Parcelas do cliente na cobrança mais recente do /cobranca que fala dele. Só
 * entra no valor em jogo o que já atrasou: parcela a vencer não é dívida (ver o
 * molde). A tabela do scripts/regua.js traz a coluna "Atraso" ("em dia" ou
 * "N dias (desde DD/MM/AAAA)"); sem ela o script compara o vencimento com a
 * data da conversa, e só avisa quando nem a data dá pra ler. Parcela marcada
 * "prescrita" fica fora do total: o /cobranca a tira da conta cobrável.
 */
function lerCobranca(raiz, cliente, hoje) {
  const dir = path.join(raiz, "financeiro");
  const arquivos = listar(dir).filter((n) => /^cobranca-\d{4}-\d{2}\.md$/.test(n)).sort().reverse();
  if (!arquivos.length) return null;
  let primeiro = null;
  for (const nome of arquivos) {
    const r = lerUmaCobranca(path.join(dir, nome), cliente, hoje);
    if (!primeiro) primeiro = r;
    if (r.parcelas.length || r.aVencer) return r;
  }
  return primeiro;
}

function lerUmaCobranca(arquivo, cliente, hoje) {
  const t = tabelaSob(ler(arquivo), "Parcelas em aberto");
  const limpo = (c) => String(c || "").replace(/\*\*/g, "").trim();
  const acha = (re) => t.cabecalho.findIndex((c) => re.test(c));
  const iCli = acha(/^cliente/), iRef = acha(/^referente/), iVenc = acha(/^vencimento/), iAtraso = acha(/^atraso/);
  const iCorr = acha(/corrigido/), iOrig = acha(/^(original|valor)/);
  const iCol = iCorr >= 0 ? iCorr : iOrig;
  if (iCli < 0 || iCol < 0) {
    return { arquivo, parcelas: [], aVencer: 0, prescritas: [], total: 0, aviso: t.linhas.length ? "a tabela \"Parcelas em aberto\" não tem coluna de cliente e de valor; conferir o arquivo na mão" : null };
  }
  const parcelas = [], aVencer = [], prescritas = [];
  let semData = 0;
  for (const c of t.linhas) {
    if (/^total/i.test(limpo(c[0]))) continue;
    if (!contem(limpo(c[iCli]), cliente)) continue;
    const valor = br.numero(limpo(c[iCol]));
    const vencimento = iVenc >= 0 ? limpo(c[iVenc]) : "";
    const atraso = iAtraso >= 0 ? limpo(c[iAtraso]) : "";
    const dataVenc = br.lerData(vencimento.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/)?.[0] || "");
    let atrasada;
    if (iAtraso >= 0) atrasada = !/^em dia/i.test(atraso);
    else if (dataVenc) atrasada = br.diasEntre(dataVenc, hoje) > 0;
    else { atrasada = true; semData++; }
    const p = {
      referente: (iRef >= 0 && limpo(c[iRef])) || "parcela",
      vencimento, atraso, atrasada,
      valor: isFinite(valor) ? valor : null,
      porData: iAtraso < 0 && !!dataVenc,
      prescrita: c.some((x) => /prescrit/i.test(limpo(x))),
    };
    if (p.prescrita) prescritas.push(p);
    else if (atrasada) parcelas.push(p);
    else aVencer.push(p);
  }
  const total = br.centavos(parcelas.reduce((s, p) => s + (p.valor || 0), 0));
  const aviso = semData
    ? "a tabela não tem coluna \"Atraso\" nem vencimento legível: conferir na mão se essas parcelas já venceram"
    : null;
  return { arquivo, parcelas, aVencer: aVencer.length, prescritas, total, aviso };
}

/** Datas de arquivos que citam o cliente em pastas de contato (vendas, e-mail, WhatsApp). */
function datasDeContato(pastas, cliente) {
  const out = [];
  const andar = (dir, prof) => {
    if (prof > 2) return;
    for (const nome of listar(dir)) {
      const cheio = path.join(dir, nome);
      let st; try { st = fs.statSync(cheio); } catch { continue; }
      if (st.isDirectory()) { andar(cheio, prof + 1); continue; }
      const d = dataDoNome(nome) || dataDoNome(path.basename(dir));
      if (!d) continue;
      if (contem(nome, br.slug(cliente)) || contem(dir, br.slug(cliente)) || contem(ler(cheio).slice(0, 4000), cliente)) out.push({ arquivo: cheio, data: d });
    }
  };
  for (const p of pastas) andar(p, 0);
  return out;
}

// ─────────────────────────── cruzamento ───────────────────────────

function cruzar(opts) {
  const { raiz, cliente } = opts;
  const hoje = opts.hoje || new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const pastaCliente = opts.pasta ? path.resolve(raiz, opts.pasta) : acharPastaCliente(raiz, cliente);
  const euOpt = opts.eu ? { nome: opts.eu, fonte: "--eu", confiavel: true } : acharEu(raiz);
  const emCliente = (sub) => (pastaCliente ? [path.join(pastaCliente, sub)] : []);
  const rel = (p) => path.relative(raiz, p);

  const atas = acharAtas([path.join(raiz, "reunioes"), ...emCliente("reunioes")], cliente, pastaCliente);
  const ata = atas.length ? lerAta(atas[0].arquivo, hoje, cliente) : null;
  const tarefas = lerTarefas(raiz, cliente, hoje);
  const fichas = lerPessoas(raiz, cliente, pastaCliente);

  // "Nome:" da memória costuma ser o nome do negócio, não o da pessoa que
  // aparece na ata. Palpite só vale se bater com alguma linha da coluna "Quem".
  let eu = euOpt;
  const primeiroNomeDe = (n) => (n ? br.semAcento(n).split(/\s+/)[0] : null);
  if (eu && !eu.confiavel) {
    const pn = primeiroNomeDe(eu.nome);
    const bate = ata && ata.tarefas.some((t) => contem(t.quem, pn));
    if (!bate) eu = { ...eu, nome: null, palpite: eu.nome };
  }
  const primeiroNome = primeiroNomeDe(eu && eu.nome);

  // Na pasta de propostas, qualquer arquivo datado do cliente serve; solto na
  // pasta dele, só o que se chama proposta ou orçamento (senão um relatório
  // datado entraria como proposta).
  const maisNovo = (lista) => lista.filter(Boolean).sort(porDataDesc)[0] || null;
  const proposta = lerValorDoDocumento(maisNovo([
    acharDocumento([path.join(raiz, "propostas"), ...emCliente("propostas")], cliente,
      /^(proposta.*|or[çc]amento.*|.*-\d{4}-\d{2}-\d{2})\.(html|md)$/i, pastaCliente),
    acharDocumento(pastaCliente ? [pastaCliente] : [], cliente, /^(proposta|or[çc]amento).*\.(html|md)$/i, pastaCliente),
  ]));
  const contrato = lerValorDoDocumento(acharDocumento(
    [path.join(raiz, "contratos"), ...emCliente("contratos")], cliente, /^contrato.*\.(md|html)$/i, pastaCliente));
  const cobranca = lerCobranca(raiz, cliente, hoje);

  // Pendências: minhas (o que prometi), dele (o que ele deve) e, quando não se
  // sabe quem é o usuário na ata, as da ata num balde à parte — chutar o lado
  // erraria o cabeçalho, que é a linha que o usuário lê antes de entrar na sala.
  const minhas = [], dele = [], terceiros = [], semDono = [];
  const vistos = [];
  // O mesmo item aparece escrito de dois jeitos ("Carla, acesso ao domínio" em
  // tarefas.md, "Mandar acesso ao domínio" na ata). Vira uma linha só, com as
  // duas origens do lado, em vez de sumir uma delas.
  const baldes = { minhas, dele, terceiros, semDono };
  const registrar = (lado, item, base) => {
    const cand = { lado, base: base || item.texto, data: item.data, palavras: palavrasDoItem(base || item.texto) };
    // Tarefa da ata sem dono que repete um item já classificado entra nele, com
    // a origem somada, em vez de virar uma segunda linha na seção à parte.
    const cabe = lado === "semDono" ? (v) => v.lado === "minhas" || v.lado === "dele" : (v) => v.lado === lado;
    const igual = vistos.find((v) => cabe(v) && mesmoItem(v, cand));
    if (igual) {
      if (!igual.item.origem.includes(item.origem)) igual.item.origem += ` + ${item.origem}`;
      if (!igual.item.data && item.data) igual.item.data = item.data;
      igual.item.vencida = igual.item.vencida || item.vencida;
      return;
    }
    vistos.push({ ...cand, item });
    baldes[lado].push(item);
  };
  for (const it of tarefas.itens) {
    const vencida = it.data ? br.diasEntre(it.data, hoje) > 0 : false;
    const item = { texto: it.texto, data: it.data ? br.fmt(it.data) : null, vencida, origem: `tarefas.md › ${it.secao}` };
    registrar(/esperando/i.test(it.secao) ? "dele" : "minhas", item);
  }
  if (ata) {
    const dataAta = br.fmt(atas[0].data);
    for (const t of ata.tarefas) {
      const vencida = t.data ? br.diasEntre(t.data, hoje) > 0 : false;
      const ehCliente = contem(t.quem, cliente)
        || fichas.some((f) => contem(t.quem, primeiroNomeDe(f.nome)))
        || ata.gentes.some((g) => contem(t.quem, g));
      const ehMinha = primeiroNome ? contem(t.quem, primeiroNome) : null;
      // Tarefa de terceiro (equipe, sócio, fornecedor) não é dívida do cliente:
      // mandar ela pra "o que ele deve" faria o usuário cobrar do cliente o que
      // a própria equipe deve. Ela vai pra uma seção à parte.
      let lado;
      if (ehMinha === true) lado = "minhas";
      else if (ehCliente) lado = "dele";
      else if (ehMinha === false) lado = "terceiros";
      else lado = "semDono";
      const nomeNaFrente = lado === "minhas" ? t.oque : `${t.quem || "[quem?]"}: ${t.oque}`;
      const item = { texto: nomeNaFrente, data: t.data ? br.fmt(t.data) : (t.ate || null), vencida, origem: `ata ${dataAta}` };
      registrar(lado, item, t.oque);
    }
    for (const p of ata.pendencias) registrar("dele", { texto: `${p.oque} (destrava: ${p.quem || "[a confirmar]"})`, data: null, vencida: false, origem: `ata ${dataAta} › pendências` });
  }
  for (const f of fichas) {
    const origem = rel(f.arquivo);
    for (const t of f.euPrometi) {
      const d = dataNoTexto(t, hoje.getFullYear());
      registrar("minhas", { texto: t, data: d ? br.fmt(d) : null, vencida: d ? br.diasEntre(d, hoje) > 0 : false, origem });
    }
    for (const t of f.mePrometeu) {
      const d = dataNoTexto(t, hoje.getFullYear());
      registrar("dele", { texto: `${f.nome}: ${t}`, data: d ? br.fmt(d) : null, vencida: d ? br.diasEntre(d, hoje) > 0 : false, origem }, t);
    }
  }
  if (cobranca) {
    for (const p of [...cobranca.parcelas, ...cobranca.prescritas]) {
      const quanto = p.valor ? br.reais(p.valor) : "[a confirmar: valor ilegível na tabela]";
      const dias = p.atraso.replace(/\s*\(desde[^)]*\)\s*$/i, "").trim();
      const quando = [p.vencimento ? `venceu ${p.vencimento}` : "em aberto", dias || (p.porData ? "vencida pela data" : "")].filter(Boolean).join(", ");
      const rotulo = /^(parcela|mensalidade|fatura|boleto|nota)/i.test(p.referente) ? p.referente : `Parcela · ${p.referente}`;
      const marca = p.prescrita ? " · prescrita, fora do total (ver `/cobranca`)" : "";
      dele.push({ texto: `${rotulo} em aberto · ${quanto} (${quando})${marca}`, data: null, vencida: p.atrasada && !p.prescrita, origem: path.basename(cobranca.arquivo) });
    }
  }

  // Vencida primeiro, da mais velha pra mais nova; depois o que tem data; por
  // último o sem data. O usuário lê de cima pra baixo, e a primeira linha é a
  // que o cliente vai cobrar na primeira frase.
  const quando = (i) => { const d = br.lerData(i.data); return d ? d.getTime() : Infinity; };
  for (const l of [minhas, dele, terceiros, semDono]) {
    l.sort((a, b) => (b.vencida === a.vencida ? quando(a) - quando(b) : (b.vencida ? 1 : -1)));
  }

  // Valor em jogo, com fonte por linha
  const valores = [];
  const daProposta = proposta && proposta.valor;
  const doContrato = contrato && contrato.valor;
  if (doContrato) valores.push({ rotulo: `Contrato (${contrato.como})`, valor: contrato.valor, fonte: rel(contrato.arquivo) });
  else if (daProposta) valores.push({ rotulo: `Proposta sem contrato fechado (${proposta.como})`, valor: proposta.valor, fonte: rel(proposta.arquivo) });
  if (doContrato && daProposta && proposta.data && contrato.data && proposta.data > contrato.data) {
    valores.push({ rotulo: `Proposta nova, depois do contrato (${proposta.como})`, valor: proposta.valor, fonte: rel(proposta.arquivo) });
  }
  if (cobranca && cobranca.total > 0) valores.push({ rotulo: "Parcelas vencidas e em aberto", valor: cobranca.total, fonte: rel(cobranca.arquivo) });
  for (const v of opts.valores || []) {
    const i = String(v).indexOf("=");
    const rotulo = i > 0 ? v.slice(0, i).trim() : "";
    const n = i > 0 ? br.numero(v.slice(i + 1)) : NaN;
    if (!rotulo || !isFinite(n)) morrer(`--valor "${v}" fora do formato rótulo=1234,56`);
    valores.push({ rotulo, valor: n, fonte: "informado na linha de comando" });
  }
  const valorEmJogo = br.centavos(valores.reduce((s, v) => s + v.valor, 0));

  // Último contato: o arquivo mais novo que fala dele, ou o que o usuário informou
  const contatos = [
    ...atas.map((a) => ({ arquivo: a.arquivo, data: a.data })),
    ...(proposta ? [proposta] : []), ...(contrato ? [contrato] : []),
    ...fichas.filter((f) => f.ultimoContato).map((f) => ({ arquivo: f.arquivo, data: f.ultimoContato })),
    ...datasDeContato([path.join(raiz, "vendas"), path.join(raiz, "emails"), ...emCliente("vendas"), ...emCliente("emails")], cliente),
  ].filter((c) => c.data && c.data <= hoje);
  if (opts.ultimoContato) contatos.push({ arquivo: "informado na linha de comando", data: opts.ultimoContato });
  const ultimo = contatos.sort((a, b) => b.data - a.data)[0] || null;

  // "O que importa" não é coisa a não repetir: é a lente da pessoa, e vai no
  // cabeçalho, onde o usuário lê antes de abrir a boca.
  const naoRepetir = [];
  for (const f of fichas) for (const l of f.naoReexplicar) naoRepetir.push({ texto: l, origem: rel(f.arquivo) });

  const nada = !atas.length && !minhas.length && !dele.length && !terceiros.length && !semDono.length && !valores.length && !fichas.length;

  return {
    cliente: pastaCliente ? path.basename(pastaCliente) : cliente,
    tipo: opts.tipo || "reuniao",
    hoje: br.fmt(hoje), diaSemana: br.diaSemana(hoje),
    eu: (eu && eu.nome) || null, euFonte: eu ? eu.fonte : null, euPalpite: (eu && eu.palpite) || null,
    pastaCliente: pastaCliente ? rel(pastaCliente) : null,
    ultimoContato: ultimo ? { data: br.fmt(ultimo.data), dias: br.diasEntre(ultimo.data, hoje), fonte: typeof ultimo.arquivo === "string" && path.isAbsolute(ultimo.arquivo) ? rel(ultimo.arquivo) : ultimo.arquivo } : null,
    atas: atas.map((a) => ({ arquivo: rel(a.arquivo), data: br.fmt(a.data) })),
    ultimaAta: ata ? { ...ata, arquivo: rel(ata.arquivo), tarefas: undefined, gentes: undefined } : null,
    tarefasMd: tarefas.existe,
    minhas, dele, terceiros, semDono,
    vencidas: { minhas: minhas.filter((i) => i.vencida).length, dele: dele.filter((i) => i.vencida).length, terceiros: terceiros.filter((i) => i.vencida).length, semDono: semDono.filter((i) => i.vencida).length },
    valores, valorEmJogo,
    notaValor: doContrato && cobranca && cobranca.total > 0
      ? "A parcela em aberto já faz parte do contrato da linha de cima: o total mede o tamanho da relação, não o que há a receber."
      : null,
    proposta: proposta ? { arquivo: rel(proposta.arquivo), data: proposta.data ? br.fmt(proposta.data) : "sem data no nome", valor: proposta.valor, como: proposta.como, trecho: proposta.trecho } : null,
    contrato: contrato ? { arquivo: rel(contrato.arquivo), data: contrato.data ? br.fmt(contrato.data) : "sem data no nome", valor: contrato.valor, como: contrato.como } : null,
    cobranca: cobranca ? { arquivo: rel(cobranca.arquivo), parcelas: cobranca.parcelas.length, aVencer: cobranca.aVencer, prescritas: cobranca.prescritas.length, total: cobranca.total, aviso: cobranca.aviso || null } : null,
    fichas: fichas.map((f) => ({ arquivo: rel(f.arquivo), nome: f.nome, papel: f.papel, canal: f.canal, oQueImporta: f.oQueImporta, naoContatar: f.naoContatar, proximoPasso: f.proximoPasso, proximoPassoAte: f.proximoPassoAte })),
    naoRepetir,
    nada,
  };
}

// ─────────────────────────── esqueleto ───────────────────────────

/**
 * O que entra em cada tipo de conversa, conforme a tabela do molde. Reunião
 * comporta a página inteira; call e WhatsApp perdem a pergunta de expansão e o
 * resumo da ata; visita não discute dinheiro em pé; balcão é o cabeçalho e as
 * duas listas de pendência, lidos em dez segundos.
 */
const TIPOS = {
  reuniao: { rotulo: "reunião marcada", perguntas: ["avanço", "risco", "expansão"], valorLinha: true, valorTabela: true, ata: true, curto: false },
  call: { rotulo: "call rápida", perguntas: ["avanço"], valorLinha: true, valorTabela: true, ata: false, curto: false },
  whatsapp: { rotulo: "WhatsApp", perguntas: ["avanço"], valorLinha: true, valorTabela: true, ata: false, curto: false },
  visita: { rotulo: "visita", perguntas: ["avanço", "risco"], valorLinha: false, valorTabela: false, ata: true, curto: false },
  balcao: { rotulo: "balcão, ele apareceu", perguntas: [], valorLinha: true, valorTabela: false, ata: false, curto: true },
};

const TITULO_PERGUNTAS = { 1: "## A pergunta da conversa", 2: "## Duas perguntas", 3: "## Três perguntas" };

function esqueleto(r) {
  const L = [];
  const t = TIPOS[r.tipo] || TIPOS.reuniao;
  const lista = (itens, vazio) => itens.length
    ? itens.map((i) => `- [ ] ${i.texto}${i.data ? ` · ${i.data}` : ""}${i.vencida ? " · **vencida**" : ""} _(${i.origem})_`).join("\n")
    : `- ${vazio}`;
  L.push(`# Briefing — ${r.cliente} — ${r.diaSemana} ${r.hoje}`, "");
  L.push(`**Tipo de conversa:** ${t.rotulo}  ·  **Onde/quando:** [preencher]`);
  L.push(`**Último contato:** ${r.ultimoContato ? `${r.ultimoContato.data}, ${r.ultimoContato.dias === 0 ? "hoje" : `há ${r.ultimoContato.dias} dia${r.ultimoContato.dias === 1 ? "" : "s"}`} (${r.ultimoContato.fonte})` : "[a confirmar: nenhum arquivo datado cita esse cliente]"}`);
  L.push(`**Pendências vencidas:** ${r.vencidas.minhas} minha${r.vencidas.minhas === 1 ? "" : "s"} · ${r.vencidas.dele} dele`);
  if (r.semDono.length) L.push(`**Tarefas da ata sem dono:** ${r.semDono.length} (${r.vencidas.semDono} vencida${r.vencidas.semDono === 1 ? "" : "s"}) — rode com \`--eu "Seu Nome"\``);
  if (r.terceiros.length) L.push(`**Tarefas da ata com outro nome:** ${r.terceiros.length} (${r.vencidas.terceiros} vencida${r.vencidas.terceiros === 1 ? "" : "s"}) — confirmar de quem são antes de cobrar`);
  if (t.valorLinha) L.push(`**Valor em jogo:** ${r.valores.length ? br.reais(r.valorEmJogo) : "[a confirmar: sem proposta, contrato ou cobrança em arquivo]"}`);
  if (r.fichas.length) L.push(`**Ficha:** ${r.fichas.map((f) => `\`${f.arquivo}\`${f.nome ? ` (${f.nome})` : ""}`).join(" · ")}`);
  for (const f of r.fichas.filter((x) => x.oQueImporta)) L.push(`**O que importa pra ${f.nome}:** ${f.oQueImporta} _(\`${f.arquivo}\`)_`);
  for (const f of r.fichas.filter((x) => x.naoContatar)) {
    const bandeira = /^(sim|s|x|true|1)$/i.test(f.naoContatar);
    const motivo = bandeira ? "ela pediu pra não receber mensagem" : f.naoContatar;
    L.push("", `> **Não contatar ${f.nome}:** ${motivo}. Antes de falar, confirmar o canal com o usuário (\`${f.arquivo}\`).`);
  }
  L.push("");
  if (!t.curto) L.push("## Em uma frase", "[preencher: por que essa conversa existe e o que precisa sair dela]", "");
  L.push("## O que eu prometi e ainda não entreguei", lista(r.minhas, "nada em aberto nos arquivos (conferir com o usuário)"), "");
  L.push("## O que ele deve", lista(r.dele, "nada em aberto nos arquivos"), "");
  if (r.terceiros.length) {
    L.push("## Tarefas da ata com outro nome");
    L.push(lista(r.terceiros, ""));
    L.push("", "> A coluna \"Quem\" traz um nome que não é o seu e que os arquivos não ligam a esse cliente. Pode ser a pessoa de contato dele — e aí a linha é \"o que ele deve\" — ou alguém da sua equipe, do sócio ou do fornecedor. Confirmar antes de cobrar na conversa; uma ficha do `/pessoa` com `empresa:` resolve isso no próximo briefing.", "");
  }
  if (r.semDono.length) {
    L.push("## Tarefas da ata, sem saber de quem são");
    L.push(lista(r.semDono, ""));
    L.push("", `> O script não achou quem é você na coluna "Quem" da ata${r.euPalpite ? ` (tentou "${r.euPalpite}", de \`${r.euFonte}\`)` : ""}. Rode de novo com \`--eu "Seu Nome"\` pra essas linhas caírem no lado certo.`, "");
  }
  if (t.valorTabela) {
    L.push("## Valor em jogo");
    if (r.valores.length) {
      L.push("| Origem | Valor | Fonte |", "|---|---|---|");
      for (const v of r.valores) L.push(`| ${v.rotulo} | ${br.reais(v.valor)} | \`${v.fonte}\` |`);
      L.push(`| **Total** | **${br.reais(r.valorEmJogo)}** | |`);
      if (r.notaValor) L.push("", `> ${r.notaValor}`);
    } else L.push("- [a confirmar: informar com `--valor \"rótulo=1234,56\"` se houver acordo fora de arquivo]");
    L.push("");
  }
  if (!t.curto) {
    L.push("## O que ele espera ouvir hoje", "[preencher: da última ata, do pedido dele, do que ficou de ser respondido]", "");
    L.push("## O que não repetir");
    if (r.naoRepetir.length) for (const n of r.naoRepetir) L.push(`- ${n.texto} _(${n.origem})_`);
    L.push("[preencher: promessa que já falhou, pergunta já respondida numa ata]", "");
    if (t.perguntas.length) {
      L.push(TITULO_PERGUNTAS[t.perguntas.length] || "## Perguntas");
      t.perguntas.forEach((p, i) => L.push(`${i + 1}. [${p}]`));
      L.push("");
    }
    const passo = r.fichas.find((f) => f.proximoPasso);
    L.push("## Meta da conversa", passo
      ? `[preencher: uma frase com verbo e data. A ficha do /pessoa diz que o próximo passo era "${passo.proximoPasso}"${passo.proximoPassoAte ? ` até ${passo.proximoPassoAte}` : ""}]`
      : "[preencher: uma frase com verbo e data]", "");
  }
  if (t.ata) {
    if (r.ultimaAta) {
      L.push(`## Da última ata (${r.atas[0].data}, \`${r.ultimaAta.arquivo}\`)`);
      if (r.ultimaAta.fraseDaReuniao) L.push(`- Em uma frase: ${r.ultimaAta.fraseDaReuniao}`);
      for (const d of r.ultimaAta.decisoes) L.push(`- Decidido: ${d}`);
      if (r.ultimaAta.proximaReuniao) L.push(`- Próxima reunião combinada: ${r.ultimaAta.proximaReuniao}`);
      for (const v of r.ultimaAta.viraOQue) L.push(`- ${v.replace(/^-\s*/, "")}`);
      if (r.atas.length > 1) L.push(`- Outras atas: ${r.atas.slice(1).map((a) => a.data).join(", ")}`);
      L.push("");
    } else L.push("## Da última ata", "- nenhuma ata do /reuniao cita esse cliente", "");
  }
  L.push("## Fontes lidas");
  L.push(`- tarefas.md: ${r.tarefasMd ? "lido" : "não existe"}`);
  L.push(`- atas: ${r.atas.length ? r.atas.map((a) => a.data).join(", ") : "nenhuma"}`);
  L.push(`- ficha do /pessoa: ${r.fichas.length ? r.fichas.map((f) => `\`${f.arquivo}\``).join(", ") : "nenhuma"}`);
  L.push(`- proposta: ${r.proposta ? `\`${r.proposta.arquivo}\` (${r.proposta.data})` : "nenhuma"}`);
  L.push(`- contrato: ${r.contrato ? `\`${r.contrato.arquivo}\` (${r.contrato.data})` : "nenhum"}`);
  const qtd = (n, um, muitos) => `${n} ${n === 1 ? um : muitos}`;
  if (r.cobranca) {
    const extra = [];
    if (r.cobranca.aVencer) extra.push(`${qtd(r.cobranca.aVencer, "parcela a vencer", "parcelas a vencer")}, fora do total`);
    if (r.cobranca.prescritas) extra.push(`${qtd(r.cobranca.prescritas, "parcela prescrita", "parcelas prescritas")}, fora do total`);
    L.push(`- cobrança: \`${r.cobranca.arquivo}\`, ${qtd(r.cobranca.parcelas, "parcela vencida", "parcelas vencidas")} dele${extra.length ? `; ${extra.join("; ")}` : ""}`);
    if (r.cobranca.aviso) L.push(`- atenção na cobrança: ${r.cobranca.aviso}`);
  } else L.push("- cobrança: nenhum arquivo `financeiro/cobranca-AAAA-MM.md`");
  L.push(`- pasta do cliente: ${r.pastaCliente ? `\`${r.pastaCliente}/\`` : "nenhuma (convenção por tipo)"}`);
  L.push(`- quem é você nas atas: ${r.eu ? `${r.eu} (${r.euFonte})` : "não identificado; passe `--eu \"Nome\"`"}`);
  if (r.nada) L.push("- **nenhum arquivo do workspace cita esse cliente**: conferir o nome, ou é conversa de `/vender`");
  return L.join("\n") + "\n";
}

// ─────────────────────────── main ───────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--ajuda") || args.includes("-h")) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#![^\n]*\n\/\*\*\n|^ \* ?/gm, ""));
    process.exit(0);
  }
  const comValor = new Set(["--hoje", "--tipo", "--eu", "--raiz", "--pasta", "--valor", "--ultimo-contato", "--saida"]);
  let cliente = null;
  for (let i = 0; i < args.length; i++) {
    if (comValor.has(args[i])) { i++; continue; }
    if (args[i].startsWith("--")) { if (args[i] !== "--json") morrer(`Opção desconhecida: ${args[i]}`, "Rode com --ajuda pra ver a lista."); continue; }
    if (!cliente) cliente = args[i];
  }
  if (!cliente) morrer("Falta o nome do cliente.", 'Uso: node scripts/briefing-reuniao.js "Padaria São João" [--hoje DD/MM/AAAA]');

  const raiz = path.resolve(pegarOpcao(args, "--raiz") || process.cwd());
  if (!existe(path.join(raiz, "_memoria")) && !existe(path.join(raiz, "CLAUDE.md"))) morrer(`"${raiz}" não parece a raiz de um workspace do Contex OS.`, "Rode da raiz, ou passe --raiz <pasta>.");

  const hojeStr = pegarOpcao(args, "--hoje");
  const hoje = hojeStr ? br.lerData(hojeStr) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  if (!hoje) morrer(`--hoje "${hojeStr}" não é uma data válida (DD/MM/AAAA).`);
  const ucStr = pegarOpcao(args, "--ultimo-contato");
  const ultimoContato = ucStr ? br.lerData(ucStr) : null;
  if (ucStr && !ultimoContato) morrer(`--ultimo-contato "${ucStr}" não é uma data válida.`);
  if (ultimoContato && ultimoContato > hoje) morrer("--ultimo-contato está no futuro.");
  const tipoStr = pegarOpcao(args, "--tipo");
  const tipo = tipoStr ? br.slug(tipoStr).replace(/-/g, "") : "reuniao";
  if (!TIPOS[tipo]) morrer(`--tipo "${tipoStr}" não existe.`, `Use um destes: ${Object.keys(TIPOS).join(", ")}.`);

  const r = cruzar({ raiz, cliente, hoje, tipo, eu: pegarOpcao(args, "--eu"), pasta: pegarOpcao(args, "--pasta"), valores: pegarOpcao(args, "--valor", true), ultimoContato });

  if (args.includes("--json")) { console.log(JSON.stringify(r, null, 2)); return; }
  const md = esqueleto(r);
  const saida = pegarOpcao(args, "--saida");
  if (saida) {
    fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
    fs.writeFileSync(saida, md);
    console.log(`✓ Esqueleto: ${saida}`);
    console.log(`  Último contato: ${r.ultimoContato ? (r.ultimoContato.dias === 0 ? "hoje" : `há ${r.ultimoContato.dias} dia${r.ultimoContato.dias === 1 ? "" : "s"}`) : "a confirmar"} · vencidas: ${r.vencidas.minhas} minhas, ${r.vencidas.dele} dele · em jogo: ${r.valores.length ? br.reais(r.valorEmJogo) : "a confirmar"}`);
  } else process.stdout.write(md);
  if (r.nada) console.error(`\n⚠ Nenhum arquivo do workspace cita "${cliente}". O nome está como nos arquivos (sem "Ltda", sem sobrenome)? Ele tem pasta em clientes/?`);
  if (r.semDono.length) console.error(`\n⚠ ${r.semDono.length} tarefa(s) da ata sem dono: rode com --eu "Seu Nome" pra separar o que é seu do que é dele.`);
}

module.exports = { cruzar, esqueleto, valoresReais, valorPrincipal, tabelaSob, textoSob, dataNoTexto, dataDoNome, textoDoHtml, frontmatter, gentesDoCliente, lerPessoas, TIPOS };

if (require.main === module) main();
