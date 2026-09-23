#!/usr/bin/env node
/**
 * Contex OS — nps.js
 * Lê as respostas da pergunta única de satisfação (nota de 0 a 10 mais o "por
 * quê") e calcula o NPS do jeito certo: percentual de promotores menos
 * percentual de detratores, com a margem de erro da amostra ao lado. Separa
 * quem vai pro pedido de depoimento e quem precisa de recuperação antes de
 * virar uma estrela pública.
 *
 * Existe porque o erro mais comum é calcular a média das notas. Oito respostas
 * com nota 8 dão média 8,0 e NPS 0: pela média o negócio está ótimo, pelo NPS
 * não tem um único cliente que indica. O segundo erro é ler variação de
 * amostra pequena como melhora: com 20 respostas a margem passa de 20 pontos,
 * e o NPS que "subiu de 30 pra 45" pode não ter subido nada.
 *
 * Uso:
 *   node scripts/nps.js <respostas.csv|.xlsx|.json> [opções]
 *
 * Um arquivo por vez, de propósito: NPS de duas populações somadas (quem
 * respondeu no WhatsApp e quem respondeu na loja com o dono olhando) não
 * significa nada.
 *
 * Colunas reconhecidas (nome aproximado, qualquer ordem): cliente, nota,
 * motivo (o "por quê"), servico, data, telefone, canal.
 * Obrigatória: nota. Sem "cliente" o número sai e a triagem não: o script avisa.
 *
 * Opções:
 *   --mes AAAA-MM          período de referência (padrão: o mês mais frequente nas datas)
 *   --hoje DD/MM/AAAA      data de referência (padrão: hoje)
 *   --enviados <n>         quantas perguntas foram mandadas, pra taxa de resposta
 *   --anterior <nps>[/<n>] NPS do período anterior, pra dizer se a diferença é real
 *   --minimo <n>           respostas mínimas pra publicar NPS de um serviço (padrão: 5)
 *   --temas <temas.json>   manifesto de temas feito pelo assistente; o script confere
 *   --saida <arquivo.md>   grava o markdown em vez de imprimir
 *   --xlsx <arquivo.xlsx>  grava a planilha de respostas com fórmula viva
 *   --json                 imprime o resultado em JSON, pra outra ferramenta ler
 *
 * Formato do --temas (o assistente lê os "por quê" e preenche; o script confere
 * se todo comentário entrou em exatamente um tema e se todo nome existe):
 *   { "temas": [ { "tema": "Prazo", "clientes": ["Ana Lima", "Bruno Sá"],
 *                  "citacao": "demorou mais que o combinado" } ] }
 *
 * As contas, pra conferir na mão:
 *   NPS = (promotores ÷ válidas − detratores ÷ válidas) × 100, em pontos
 *   Promotor 9-10 · Neutro 7-8 · Detrator 0-6
 *   Margem (95%) = 1,96 × raiz( ((p+d) − (p−d)²) ÷ n ) × 100
 *     onde p e d são as proporções de promotor e detrator. É o desvio padrão de
 *     uma variável que vale +1 no promotor, 0 no neutro e −1 no detrator.
 *   Quando todas as respostas caem no mesmo grupo a variância dá zero, e aí a
 *   margem vem da regra dos três: o teto de 95% de um evento que não apareceu
 *   em n tentativas é cerca de 3 ÷ n. Nunca passa de 100 pontos.
 *   Do período anterior, quando só o NPS e o n são conhecidos, a margem sai no
 *   pior caso possível: 1,96 × raiz( (1 − nps²) ÷ n ) × 100.
 *
 * Node 18+, sem dependência. Usa br.js (datas, número, slug) e o leitor de
 * planilha do gerar-planilha.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const SINONIMOS = {
  cliente: ["cliente", "nome", "aluno", "paciente", "assinante", "membro", "contato", "quem respondeu", "razao social", "empresa"],
  nota: ["nota", "nota de 0 a 10", "de 0 a 10", "pontuacao", "score", "nps", "avaliacao", "quanto voce indica", "recomendaria"],
  motivo: ["motivo", "por que", "porque", "por que essa nota", "comentario", "observacao", "resposta", "o que", "justificativa", "explique"],
  servico: ["servico", "produto", "plano", "pacote", "modalidade", "entrega", "tipo de servico", "o que comprou"],
  data: ["data", "data da resposta", "respondido em", "respondeu em", "carimbo de data", "carimbo de data/hora", "timestamp", "data da entrega", "quando"],
  telefone: ["telefone", "whatsapp", "celular", "fone"],
  canal: ["canal", "origem", "como respondeu", "meio"],
};

const OBRIGATORIAS = ["nota"];
const Z95 = 1.959964;

// ─────────────────────────── leitura ───────────────────────────

function acharColunas(cabecalho) {
  const norm = cabecalho.map((c) => br.semAcento(String(c || "")).replace(/[_\-?]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase());
  const idx = {};
  for (const [campo, nomes] of Object.entries(SINONIMOS)) {
    let i = norm.findIndex((c) => nomes.includes(c));
    if (i < 0) i = norm.findIndex((c) => nomes.some((n) => c.startsWith(n)));
    if (i < 0) i = norm.findIndex((c) => nomes.some((n) => n.length > 5 && c.includes(n)));
    if (i >= 0 && !Object.values(idx).includes(i)) idx[campo] = i;
  }
  return idx;
}

function dataDoSerial(n) {
  const base = new Date(1899, 11, 30);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.floor(n));
}

function matrizDaAba(aba) {
  const linhas = [];
  for (const [ref, cel] of aba.celulas) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    const lin = +m[2];
    if (!linhas[lin - 1]) linhas[lin - 1] = [];
    let v = cel.v;
    if (cel.tipo === "data" && typeof v === "number") v = br.fmt(dataDoSerial(v));
    linhas[lin - 1][col - 1] = v === null || v === undefined ? "" : v;
  }
  return linhas.filter((l) => l && l.some((c) => c !== "")).map((l) => Array.from(l, (c) => (c === undefined ? "" : c)));
}

/** Lê CSV, .xlsx ou JSON e devolve a lista bruta de respostas com os campos nomeados. */
function lerArquivo(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  if (ext === ".json") {
    const j = JSON.parse(fs.readFileSync(arquivo, "utf8").replace(/^\uFEFF/, ""));
    const lista = Array.isArray(j) ? j : j.respostas;
    if (!Array.isArray(lista) || !lista.length) throw new Error("o JSON precisa ser uma lista de respostas ou ter a chave \"respostas\"");
    const chaves = [...new Set(lista.flatMap((c) => Object.keys(c || {})))];
    const idx = acharColunas(chaves);
    const faltam = OBRIGATORIAS.filter((c) => idx[c] === undefined);
    if (faltam.length) throw new Error(`não achei o campo ${faltam.join(", ")} no JSON: ${chaves.join(", ")}`);
    const registros = lista.map((c, i) => {
      const r = { linha: i + 1 };
      for (const [campo, k] of Object.entries(idx)) {
        const v = c[chaves[k]];
        r[campo] = v === undefined || v === null ? "" : v;
      }
      return r;
    });
    return { registros, colunas: Object.keys(idx) };
  }
  const planilha = require("./gerar-planilha.js");
  let linhas;
  if (ext === ".xlsx") {
    const { abas } = planilha.lerXlsx(arquivo);
    if (!abas.length) throw new Error("planilha sem aba");
    linhas = matrizDaAba(abas[0]);
  } else {
    const txt = fs.readFileSync(arquivo, "utf8").replace(/^\uFEFF/, "");
    linhas = planilha.parseCsv(txt).linhas;
  }
  if (linhas.length < 2) throw new Error("o arquivo tem cabeçalho e nenhuma linha de resposta");
  // O cabeçalho é a primeira linha em que o script reconhece a coluna de nota.
  // Planilha exportada costuma vir com título e linha em branco em cima, e um
  // arquivo de uma coluna só ("Nota") é legítimo: contar células não serve.
  let inicio = -1;
  const limite = Math.min(linhas.length - 1, 12);
  for (let i = 0; i < limite; i++) {
    if (!linhas[i].some((c) => String(c).trim() !== "")) continue;
    if (OBRIGATORIAS.every((c) => acharColunas(linhas[i])[c] !== undefined)) { inicio = i; break; }
  }
  if (inicio < 0) {
    const primeira = linhas.findIndex((l) => l.some((c) => String(c).trim() !== ""));
    const amostra = linhas[primeira < 0 ? 0 : primeira].join(" | ");
    throw new Error(`não achei a coluna ${OBRIGATORIAS.join(", ")} no cabeçalho: ${amostra}`);
  }
  const idx = acharColunas(linhas[inicio]);
  const registros = [];
  for (let i = inicio + 1; i < linhas.length; i++) {
    const l = linhas[i];
    const r = { linha: i + 1 };
    for (const [campo, c] of Object.entries(idx)) r[campo] = l[c] === undefined ? "" : l[c];
    registros.push(r);
  }
  return { registros, colunas: Object.keys(idx) };
}

// ─────────────────────────── conta ───────────────────────────

/** "10/10", "nota 9", "9,0" → 9. Devolve null quando não é nota de 0 a 10. */
function lerNota(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  let t = String(valor).trim();
  const fracao = t.match(/^(\d{1,2})\s*\/\s*10$/);
  if (fracao) t = fracao[1];
  t = t.replace(/nota|pontos?|estrelas?/gi, "").trim();
  const n = br.numero(t);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 10) return null;
  if (Math.abs(n - Math.round(n)) > 1e-9) return null;
  return Math.round(n);
}

function grupoDaNota(nota) {
  if (nota >= 9) return "promotor";
  if (nota >= 7) return "neutro";
  return "detrator";
}

/**
 * Margem de erro do NPS em pontos, 95% de confiança.
 * Quando todas as respostas caem no mesmo grupo, a variância dá zero e a
 * fórmula diria "margem zero", o que é falso: cinco notas 8 não provam que
 * ninguém indica. Nesse caso vale a regra dos três (o teto de 95% de um evento
 * que não apareceu em n tentativas é cerca de 3 ÷ n). Nunca passa de 100
 * pontos, que já é a largura inteira da escala.
 */
function margem(prom, det, n) {
  if (!n) return null;
  const p = prom / n, d = det / n;
  const variancia = (p + d) - Math.pow(p - d, 2);
  const m = variancia <= 0 ? (300 / n) : Z95 * Math.sqrt(variancia / n) * 100;
  return Math.min(100, m);
}

/** Um grupo só respondendo: a margem saiu da regra dos três, não da fórmula. */
function semVariacao(prom, det, n) {
  if (!n) return false;
  return prom === n || det === n || (prom === 0 && det === 0);
}

/** Faixa do NPS, presa na escala de -100 a 100. */
function faixa(nps, m) {
  return [Math.max(-100, nps - m), Math.min(100, nps + m)];
}

/** Margem no pior caso, quando só se conhece o NPS (em pontos) e o n. */
function margemConservadora(npsPontos, n) {
  if (!n) return null;
  const x = npsPontos / 100;
  const v = 1 - x * x;
  const m = v <= 0 ? (300 / n) : Z95 * Math.sqrt(v / n) * 100;
  return Math.min(100, m);
}

function npsDe(prom, det, n) {
  if (!n) return null;
  return ((prom - det) / n) * 100;
}

function bloco(lista) {
  const n = lista.length;
  const prom = lista.filter((r) => r.grupo === "promotor").length;
  const neu = lista.filter((r) => r.grupo === "neutro").length;
  const det = lista.filter((r) => r.grupo === "detrator").length;
  return {
    n, promotores: prom, neutros: neu, detratores: det,
    nps: npsDe(prom, det, n), margem: margem(prom, det, n), semVariacao: semVariacao(prom, det, n),
  };
}

function confianca(b) {
  const quantas = plural(b.n, "resposta", "respostas");
  if (b.n < 10) return { nivel: "insuficiente", frase: `Com ${quantas} não existe NPS confiável. Leia os comentários um por um e trate cada caso; o número só engana.` };
  const margemTxt = `a margem é de ±${b.margem.toFixed(0)} pontos`;
  if (b.margem > 20) return { nivel: "fraca", frase: `Com ${quantas} ${margemTxt}: esse NPS não sustenta decisão nem meta. Serve pra abrir conversa com quem respondeu.` };
  if (b.margem > 10) return { nivel: "media", frase: `Com ${quantas} ${margemTxt}: dá pra ver direção, não pra comemorar variação pequena.` };
  return { nivel: "boa", frase: `Com ${quantas} ${margemTxt}: dá pra comparar com o período anterior.` };
}

function nomeMes(mes) {
  const [a, m] = String(mes).split("-").map(Number);
  const nomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  if (!a || !m || m < 1 || m > 12) return String(mes);
  return `${nomes[m - 1]} de ${a}`;
}

/**
 * Valida, classifica e calcula. opts: { hoje, mes, enviados, anterior, minimo }
 */
function calcular(registros, opts = {}) {
  const hoje = opts.hoje || new Date();
  const minimo = opts.minimo ?? 5;
  const avisos = [];
  const descartadas = [];
  const respostas = [];
  const temCliente = registros.some((r) => String(r.cliente || "").trim() !== "");
  const temData = registros.some((r) => String(r.data || "").trim() !== "");
  const temServico = registros.some((r) => String(r.servico || "").trim() !== "");

  for (const r of registros) {
    const nota = lerNota(r.nota);
    if (nota === null) {
      descartadas.push({ linha: r.linha, cliente: String(r.cliente || "").trim(), valor: String(r.nota ?? "") });
      avisos.push(`linha ${r.linha}${r.cliente ? ` (${String(r.cliente).trim()})` : ""}: nota "${String(r.nota ?? "")}" não é um inteiro de 0 a 10, ficou fora da conta`);
      continue;
    }
    let data = null;
    if (String(r.data || "").trim()) {
      data = br.lerData(String(r.data).trim().split(/[ T]/)[0]);
      if (!data) avisos.push(`linha ${r.linha}: data "${r.data}" inválida, a resposta entra no NPS e fica fora do corte por mês`);
    }
    respostas.push({
      linha: r.linha,
      cliente: String(r.cliente || "").trim(),
      nota,
      grupo: grupoDaNota(nota),
      motivo: String(r.motivo || "").trim(),
      servico: String(r.servico || "").trim(),
      data,
      telefone: String(r.telefone || "").trim(),
      canal: String(r.canal || "").trim(),
    });
  }

  // resposta repetida do mesmo cliente: fica a mais recente
  const vistos = new Map();
  const duplicadas = [];
  for (const r of respostas) {
    if (!r.cliente) continue;
    const k = br.slug(r.cliente);
    if (!k) continue;
    const antes = vistos.get(k);
    if (!antes) { vistos.set(k, r); continue; }
    const fica = (r.data && antes.data) ? (r.data >= antes.data ? r : antes) : r;
    const sai = fica === r ? antes : r;
    sai.repetida = true;
    duplicadas.push(`${r.cliente} respondeu mais de uma vez (linhas ${antes.linha} e ${r.linha}); mantive a nota ${fica.nota}`);
    vistos.set(k, fica);
  }
  for (const d of duplicadas) avisos.push(d);
  const validas = respostas.filter((r) => !r.repetida);

  if (!temCliente) avisos.push("nenhuma resposta tem nome: o NPS sai, a triagem não. Sem saber quem deu 9 e quem deu 4, ninguém pede depoimento nem recupera cliente");
  if (!temData) avisos.push("sem coluna de data não dá pra cortar por mês nem comparar períodos");

  const geral = bloco(validas);
  const mes = opts.mes || mesMaisFrequente(validas) || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  // cruzamentos
  const porServico = temServico ? agrupar(validas, (r) => r.servico || "sem serviço informado", minimo) : [];
  const porMes = temData ? agrupar(validas.filter((r) => r.data), (r) => `${r.data.getFullYear()}-${String(r.data.getMonth() + 1).padStart(2, "0")}`, minimo).sort((a, b) => a.chave.localeCompare(b.chave)) : [];

  // taxa de resposta
  let taxaResposta = null;
  const enviados = opts.enviados === undefined ? null : Number(opts.enviados);
  if (enviados !== null) {
    if (!Number.isFinite(enviados) || enviados <= 0) avisos.push(`--enviados "${opts.enviados}" ignorado: precisa ser um número maior que zero`);
    else if (enviados < validas.length) avisos.push(`--enviados ${enviados} é menor que as ${validas.length} respostas válidas; confira o número de envios`);
    else taxaResposta = validas.length / enviados;
  }

  // comparação com o período anterior
  let comparacao = null;
  if (opts.anterior !== undefined && opts.anterior !== null && geral.n) {
    const m = String(opts.anterior).match(/^\s*(-?[\d.,]+)\s*(?:\/\s*(\d+))?\s*$/);
    if (!m) avisos.push(`--anterior "${opts.anterior}" ignorado: use o NPS, opcionalmente com o n (ex: 34 ou 34/41)`);
    else {
      const npsAntes = br.numero(m[1]);
      const nAntes = m[2] ? Number(m[2]) : null;
      if (!Number.isFinite(npsAntes) || npsAntes < -100 || npsAntes > 100) avisos.push(`--anterior "${opts.anterior}" ignorado: NPS vai de -100 a 100`);
      else {
        const margemAntes = nAntes ? margemConservadora(npsAntes, nAntes) : null;
        const diferenca = geral.nps - npsAntes;
        const margemDiferenca = margemAntes === null
          ? geral.margem
          : Math.sqrt(Math.pow(geral.margem, 2) + Math.pow(margemAntes, 2));
        comparacao = {
          npsAntes, nAntes, margemAntes, diferenca, margemDiferenca,
          real: Math.abs(diferenca) > margemDiferenca,
          aproximada: margemAntes === null,
        };
      }
    }
  }

  const promotores = validas.filter((r) => r.grupo === "promotor").sort((a, b) => (b.nota - a.nota) || (b.motivo.length - a.motivo.length));
  const detratores = validas.filter((r) => r.grupo === "detrator").sort((a, b) => (a.nota - b.nota) || (b.motivo.length - a.motivo.length));
  const neutros = validas.filter((r) => r.grupo === "neutro").sort((a, b) => b.motivo.length - a.motivo.length);

  return {
    hoje, mes, minimo, geral, confianca: confianca(geral),
    respostas: validas, descartadas, todas: respostas,
    promotores, detratores, neutros,
    porServico, porMes, taxaResposta, enviados, comparacao,
    comMotivo: validas.filter((r) => r.motivo).length,
    temCliente, temData, temServico,
    avisos,
  };
}

function mesMaisFrequente(lista) {
  const c = new Map();
  for (const r of lista) {
    if (!r.data) continue;
    const k = `${r.data.getFullYear()}-${String(r.data.getMonth() + 1).padStart(2, "0")}`;
    c.set(k, (c.get(k) || 0) + 1);
  }
  if (!c.size) return null;
  return [...c.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0][0];
}

function agrupar(lista, chaveDe, minimo) {
  const mapa = new Map();
  for (const r of lista) {
    const k = chaveDe(r);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(r);
  }
  return [...mapa.entries()].map(([chave, itens]) => ({ chave, ...bloco(itens), publicavel: itens.length >= minimo }))
    .sort((a, b) => b.n - a.n || String(a.chave).localeCompare(String(b.chave)));
}

// ─────────────────────────── temas ───────────────────────────

/**
 * Confere o manifesto de temas que o assistente escreveu: todo nome citado
 * existe nas respostas, e todo comentário entrou em exatamente um tema.
 */
function conferirTemas(r, manifesto) {
  const temas = Array.isArray(manifesto) ? manifesto : manifesto.temas;
  if (!Array.isArray(temas) || !temas.length) throw new Error("o arquivo de temas precisa ter a chave \"temas\" com uma lista");
  const porSlug = new Map();
  for (const resp of r.respostas) if (resp.cliente) porSlug.set(br.slug(resp.cliente), resp);
  const contagem = new Map();
  const desconhecidos = [];
  const saida = [];
  for (const t of temas) {
    const nome = String(t.tema || t.nome || "").trim();
    if (!nome) throw new Error("tema sem nome no manifesto");
    const nomes = Array.isArray(t.clientes) ? t.clientes : [];
    const achados = [];
    for (const c of nomes) {
      const k = br.slug(String(c));
      const resp = porSlug.get(k);
      if (!resp) { desconhecidos.push(`${c} (tema "${nome}")`); continue; }
      achados.push(resp);
      contagem.set(k, (contagem.get(k) || 0) + 1);
    }
    saida.push({ tema: nome, citacao: String(t.citacao || "").trim(), respostas: achados, ...bloco(achados) });
  }
  const comMotivo = r.respostas.filter((x) => x.motivo && x.cliente);
  const foraDeTema = comMotivo.filter((x) => !contagem.get(br.slug(x.cliente))).map((x) => x.cliente);
  const emDoisTemas = [...contagem.entries()].filter(([, v]) => v > 1).map(([k]) => (porSlug.get(k) || {}).cliente || k);
  return {
    temas: saida.sort((a, b) => b.n - a.n),
    desconhecidos, foraDeTema, emDoisTemas,
    ok: !desconhecidos.length && !foraDeTema.length && !emDoisTemas.length,
  };
}

// ─────────────────────────── saída ───────────────────────────

function pontos(x) {
  if (x === null || x === undefined) return "—";
  const n = Math.sign(x) * Math.round(Math.abs(x));
  if (n > 0) return `+${n}`;
  return n === 0 ? "0" : String(n);
}

/** Uma casa decimal, com vírgula: 0.5 → "50,0%". Vem do br.js. */
function pct1(x) {
  return br.pct(x, 1);
}

/** "1 resposta" / "12 respostas", pra mensagem não sair com "1 promotores". */
function plural(n, singular, plural_) {
  return `${n} ${n === 1 ? singular : plural_}`;
}

function oQueFazer(r) {
  if (r.grupo === "promotor") return r.motivo ? "pedir depoimento usando a frase dele" : "pedir depoimento com pergunta específica";
  if (r.grupo === "neutro") return "perguntar o que faltou pra ser 10";
  if (r.nota <= 3) return "ligar hoje, não mandar texto";
  return "mensagem de recuperação com o problema nomeado";
}

function markdown(r, temas) {
  const g = r.geral;
  const L = [];
  L.push(`# NPS — ${nomeMes(r.mes)}`);
  L.push("");
  const validasTxt = g.n === 1 ? "1 resposta válida" : `${g.n} respostas válidas`;
  const forasTxt = r.descartadas.length ? `, ${plural(r.descartadas.length, "resposta", "respostas")} fora da conta` : "";
  L.push(`${validasTxt}${forasTxt}. Gerado por \`scripts/nps.js\` em ${br.fmt(r.hoje)}.`);
  L.push("");
  L.push("## O número");
  L.push("");
  if (!g.n) {
    L.push("Nenhuma resposta válida. Confira a coluna de nota do arquivo.");
    L.push("");
  } else {
    L.push("| Linha | Valor | Conta |");
    L.push("|---|---|---|");
    L.push(`| Promotores (9-10) | ${g.promotores} (${pct1(g.promotores / g.n)}) | ${g.promotores} ÷ ${g.n} |`);
    L.push(`| Neutros (7-8) | ${g.neutros} (${pct1(g.neutros / g.n)}) | ${g.neutros} ÷ ${g.n} |`);
    L.push(`| Detratores (0-6) | ${g.detratores} (${pct1(g.detratores / g.n)}) | ${g.detratores} ÷ ${g.n} |`);
    L.push(`| **NPS** | **${pontos(g.nps)}** | ${pct1(g.promotores / g.n)} − ${pct1(g.detratores / g.n)} |`);
    const [baixo, cima] = faixa(g.nps, g.margem);
    L.push(`| Margem de erro (95%) | ±${g.margem.toFixed(0)} pontos | amostra de ${g.n}${g.semVariacao ? ", pela regra dos três" : ""} |`);
    L.push(`| Faixa provável | ${pontos(baixo)} a ${pontos(cima)} | NPS ± margem, preso na escala |`);
    if (r.taxaResposta !== null) L.push(`| Taxa de resposta | ${pct1(r.taxaResposta)} | ${g.n} ÷ ${r.enviados} enviadas |`);
    L.push(`| Respostas com "por quê" | ${r.comMotivo} | ${r.comMotivo} de ${g.n} |`);
    L.push("");
    L.push(r.confianca.frase);
    L.push("");
    if (g.semVariacao) {
      L.push("Todas as respostas caíram no mesmo grupo, então a fórmula da margem daria zero. O número acima veio da regra dos três, que é o teto de quem não apareceu na amostra.");
      L.push("");
    }
    const media = r.respostas.reduce((a, x) => a + x.nota, 0) / g.n;
    L.push(`Pra comparação: a média das notas é ${media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}. Média não é NPS e não serve pra decidir nada aqui.`);
    L.push("");
  }

  if (r.comparacao) {
    const c = r.comparacao;
    L.push("## Contra o período anterior");
    L.push("");
    L.push(`Antes: ${pontos(c.npsAntes)}${c.nAntes ? ` (${c.nAntes} respostas)` : ""}. Agora: ${pontos(g.nps)} (${g.n} respostas). Diferença: ${pontos(c.diferenca)} pontos.`);
    L.push("");
    if (c.real) L.push(`A diferença passa da margem de ±${c.margemDiferenca.toFixed(0)} pontos: mudou de verdade.`);
    else L.push(`A diferença cabe dentro da margem de ±${c.margemDiferenca.toFixed(0)} pontos: pode ser variação de amostra, não melhora nem piora.`);
    if (c.aproximada) L.push("");
    if (c.aproximada) L.push("A margem do período anterior foi estimada no pior caso, porque o número de respostas dele não foi informado.");
    L.push("");
  }

  if (r.porServico.length) {
    L.push("## Por serviço");
    L.push("");
    L.push("| Serviço | Respostas | Promotores | Detratores | NPS | Margem |");
    L.push("|---|---|---|---|---|---|");
    for (const s of r.porServico) {
      const npsTxt = s.publicavel ? pontos(s.nps) : `${pontos(s.nps)} [amostra pequena]`;
      L.push(`| ${s.chave} | ${s.n} | ${s.promotores} | ${s.detratores} | ${npsTxt} | ±${s.margem.toFixed(0)} |`);
    }
    L.push("");
    const fracos = r.porServico.filter((s) => !s.publicavel);
    if (fracos.length) L.push(`Serviço com menos de ${r.minimo} respostas não tem NPS pra mostrar a ninguém: ${fracos.map((s) => s.chave).join(", ")}. O número está aí pra você olhar, não pra citar.`);
    L.push("");
  }

  if (r.porMes.length > 1) {
    L.push("## Por mês");
    L.push("");
    L.push("| Mês | Respostas | NPS | Margem |");
    L.push("|---|---|---|---|");
    for (const m of r.porMes) L.push(`| ${nomeMes(m.chave)} | ${m.n} | ${pontos(m.nps)} | ±${m.margem.toFixed(0)} |`);
    L.push("");
    L.push("Três meses é o mínimo pra chamar de tendência. Dois pontos numa linha não são uma linha.");
    L.push("");
  }

  if (temas) {
    L.push("## Os \"por quê\" por tema");
    L.push("");
    L.push("| Tema | Respostas | Promotores | Detratores | Citação |");
    L.push("|---|---|---|---|---|");
    for (const t of temas.temas) L.push(`| ${t.tema} | ${t.n} | ${t.promotores} | ${t.detratores} | ${t.citacao ? `"${t.citacao}"` : "[a confirmar]"} |`);
    L.push("");
    if (temas.foraDeTema.length) L.push(`Comentário sem tema: ${temas.foraDeTema.join(", ")}. Classifique antes de fechar o arquivo.`);
    if (temas.emDoisTemas.length) L.push(`Comentário em dois temas: ${temas.emDoisTemas.join(", ")}. Escolha um.`);
    if (temas.desconhecidos.length) L.push(`Nome que não existe nas respostas: ${temas.desconhecidos.join(", ")}.`);
    if (temas.ok) L.push("Todos os comentários entraram em exatamente um tema.");
    L.push("");
  }

  L.push("## Triagem");
  L.push("");
  L.push(`### Promotores (${r.promotores.length}) — pedir depoimento`);
  L.push("");
  if (!r.promotores.length) L.push("Ninguém deu 9 ou 10. Não force depoimento nesse mês.");
  else {
    L.push("| Cliente | Nota | Serviço | O que ele disse | O que fazer | Contato |");
    L.push("|---|---|---|---|---|---|");
    for (const p of r.promotores) L.push(`| ${p.cliente || "[sem nome]"} | ${p.nota} | ${p.servico || "—"} | ${p.motivo ? `"${p.motivo}"` : "sem comentário"} | ${oQueFazer(p)} | ${p.telefone || "—"} |`);
  }
  L.push("");
  L.push(`### Detratores (${r.detratores.length}) — recuperar antes de virar avaliação pública`);
  L.push("");
  if (!r.detratores.length) L.push("Ninguém deu 6 ou menos no período.");
  else {
    L.push("| Cliente | Nota | Serviço | O que ele disse | O que fazer | Contato |");
    L.push("|---|---|---|---|---|---|");
    for (const d of r.detratores) L.push(`| ${d.cliente || "[sem nome]"} | ${d.nota} | ${d.servico || "—"} | ${d.motivo ? `"${d.motivo}"` : "sem comentário"} | ${oQueFazer(d)} | ${d.telefone || "—"} |`);
  }
  L.push("");
  L.push(`### Neutros (${r.neutros.length}) — o grupo que ninguém olha`);
  L.push("");
  if (!r.neutros.length) L.push("Nenhuma nota 7 ou 8.");
  else {
    L.push("| Cliente | Nota | O que ele disse |");
    L.push("|---|---|---|");
    for (const x of r.neutros) L.push(`| ${x.cliente || "[sem nome]"} | ${x.nota} | ${x.motivo ? `"${x.motivo}"` : "sem comentário"} |`);
    L.push("");
    L.push("Nota 8 não é elogio: é cliente que fica até aparecer algo melhor. Uma pergunta resolve mais aqui que em qualquer outro grupo.");
  }
  L.push("");

  if (r.avisos.length) {
    L.push("## Avisos do script");
    L.push("");
    for (const a of r.avisos) L.push(`- ${a}`);
    L.push("");
  }
  return L.join("\n");
}

/** Spec do gerar-planilha.js: aba Respostas com os grupos e aba Resumo com fórmula viva. */
function specPlanilha(r, saidaXlsx) {
  const EXTRAS = 10;
  const prim = 2, ult = prim + r.respostas.length + EXTRAS - 1;
  const col = (letra) => `Respostas!${letra}${prim}:${letra}${ult}`;
  const linhas = r.respostas.map((x) => [
    x.cliente, x.nota, x.grupo, x.servico, x.data ? br.iso(x.data) : null, x.motivo, x.telefone,
  ]);
  return {
    titulo: `NPS — ${nomeMes(r.mes)}`,
    autor: "Contex OS",
    saida: saidaXlsx,
    abas: [
      {
        nome: "Respostas",
        colunas: [
          { titulo: "Cliente", tipo: "texto", largura: 26 },
          { titulo: "Nota", tipo: "inteiro", largura: 8 },
          { titulo: "Grupo", tipo: "texto", largura: 12, opcoes: ["promotor", "neutro", "detrator"] },
          { titulo: "Serviço", tipo: "texto", largura: 20 },
          { titulo: "Data", tipo: "data", largura: 12 },
          { titulo: "Por quê", tipo: "texto", largura: 50 },
          { titulo: "Telefone", tipo: "texto", largura: 16 },
        ],
        linhas,
        linhasExtras: EXTRAS,
        filtro: true,
      },
      {
        nome: "Resumo",
        colunas: [{ titulo: "Métrica", largura: 40 }, { titulo: "Valor", largura: 16 }],
        linhas: [
          ["Respostas válidas", { f: `=CONT.NUM(${col("B")})`, tipo: "inteiro" }],
          ["Promotores (9-10)", { f: `=CONT.SE(${col("C")};"promotor")`, tipo: "inteiro" }],
          ["Neutros (7-8)", { f: `=CONT.SE(${col("C")};"neutro")`, tipo: "inteiro" }],
          ["Detratores (0-6)", { f: `=CONT.SE(${col("C")};"detrator")`, tipo: "inteiro" }],
          ["% promotores", { f: "=SEERRO(B3/B2;0)", tipo: "percentual" }],
          ["% detratores", { f: "=SEERRO(B5/B2;0)", tipo: "percentual" }],
          ["NPS (pontos)", { f: "=ARRED((B6-B7)*100;0)", tipo: "inteiro" }],
          ["Variância do NPS", { f: "=SEERRO((B6+B7)-POTENCIA(B6-B7;2);0)", tipo: "numero" }],
          ["Margem de erro 95% (pontos)", { f: "=SEERRO(ARRED(SE(B9<=0;MINIMO(100;300/B2);MINIMO(100;1,959964*RAIZ(B9/B2)*100));0);0)", tipo: "inteiro" }],
          ["Faixa de baixo", { f: "=MAXIMO(-100;B8-B10)", tipo: "inteiro" }],
          ["Faixa de cima", { f: "=MINIMO(100;B8+B10)", tipo: "inteiro" }],
          ["Média das notas (não é NPS)", { f: `=SEERRO(MEDIA(${col("B")});0)`, tipo: "numero" }],
        ],
        congelar: true,
        filtro: false,
      },
      {
        nome: "Como usar",
        texto: [
          "# Como usar esta planilha",
          "A aba Respostas é a lista do período. Mude a Nota ou o Grupo e a aba Resumo recalcula sozinha.",
          "Promotor é nota 9 ou 10, neutro é 7 ou 8, detrator é de 0 a 6. NPS = % de promotores menos % de detratores, em pontos.",
          "A margem de erro de 95% diz o quanto o número pode estar longe da verdade por causa do tamanho da amostra. Variação menor que a margem não é notícia.",
          "A média das notas está na última linha só pra comparação. Ela esconde o que o NPS mostra: oito notas 8 dão média 8,0 e NPS zero.",
          "As dez linhas em branco no fim já estão formatadas. Insira novas linhas ACIMA da última pra fórmula continuar contando.",
          "Gerada pelo Contex OS a partir de scripts/nps.js. No mês que vem, rode de novo com as respostas novas em vez de editar esta.",
        ],
      },
    ],
  };
}

// ─────────────────────────── linha de comando ───────────────────────────

function args(argv) {
  const o = { livres: [], semValor: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a.startsWith("--")) {
      const v = argv[i + 1];
      // Sem isso, "--saida --xlsx planilha.xlsx" comeria o --xlsx em silêncio.
      if (v === undefined || v.startsWith("--")) { o.semValor.push(a); continue; }
      o[a.slice(2)] = v; i++;
    } else o.livres.push(a);
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
  if (o.semValor.length) morrer(`Falta o valor de ${o.semValor.join(", ")}.`, "Cada opção pede um valor depois dela, menos --json. Ex: --saida vendas/nps/nps-2026-09.md");
  const arquivo = o.livres[0];
  if (o.livres.length > 1) morrer(`Só um arquivo de respostas por vez. Recebi ${o.livres.length}: ${o.livres.join(", ")}.`, "Junte as respostas num arquivo só antes de calcular; NPS de duas populações somadas não quer dizer nada.");
  if (!arquivo) morrer("Falta o arquivo de respostas.", "Uso: node scripts/nps.js <respostas.csv|.xlsx|.json> [--mes AAAA-MM] [--enviados 60] [--anterior 34/41] [--temas temas.json] [--saida nps.md] [--xlsx nps.xlsx]");
  if (!fs.existsSync(arquivo)) morrer(`Não achei o arquivo: ${arquivo}`);
  const hoje = o.hoje ? br.lerData(o.hoje) : new Date();
  if (!hoje) morrer(`--hoje "${o.hoje}" não é uma data válida (DD/MM/AAAA)`);
  const minimo = o.minimo === undefined ? 5 : parseInt(o.minimo, 10);
  if (isNaN(minimo) || minimo < 1) morrer(`--minimo "${o.minimo}" precisa ser um número de respostas`);
  if (o.mes !== undefined && !/^\d{4}-\d{2}$/.test(String(o.mes))) morrer(`--mes "${o.mes}" precisa estar no formato AAAA-MM`);

  let lido, r;
  try { lido = lerArquivo(arquivo); } catch (e) {
    morrer(`Não consegui ler ${arquivo}: ${e.message}`, "Colunas que o script entende: cliente, nota, motivo (o \"por quê\"), servico, data, telefone, canal. Só nota é obrigatória.");
  }
  try { r = calcular(lido.registros, { hoje, mes: o.mes, enviados: o.enviados, anterior: o.anterior, minimo }); } catch (e) { morrer(e.message); }

  let temas = null;
  if (o.temas) {
    if (!fs.existsSync(o.temas)) morrer(`Não achei o arquivo de temas: ${o.temas}`);
    try { temas = conferirTemas(r, JSON.parse(fs.readFileSync(o.temas, "utf8").replace(/^\uFEFF/, ""))); }
    catch (e) { morrer(`Não consegui usar ${o.temas}: ${e.message}`, "Formato: { \"temas\": [ { \"tema\": \"Prazo\", \"clientes\": [\"Ana\"], \"citacao\": \"...\" } ] }"); }
  }

  if (o.json) {
    const saida = { ...r, temas, respostas: r.respostas, todas: undefined };
    console.log(JSON.stringify(saida, function (k, v) { const bruto = this[k]; return bruto instanceof Date ? br.iso(bruto) : v; }, 2));
    return;
  }

  const md = markdown(r, temas);
  if (o.saida) {
    fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
    fs.writeFileSync(o.saida, md + "\n");
    console.log(`✔ ${o.saida} gravado`);
  } else console.log(md);

  if (o.xlsx) {
    const planilha = require("./gerar-planilha.js");
    const spec = specPlanilha(r, o.xlsx);
    const specPath = String(o.xlsx).replace(/\.xlsx$/i, "") + ".planilha.json";
    fs.mkdirSync(path.dirname(path.resolve(o.xlsx)), { recursive: true });
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
    planilha.gerar(specPath, o.xlsx, { sobrescrever: true, silencioso: true });
    console.log(`✔ ${o.xlsx} gravado (spec em ${specPath})`);
  }

  const g = r.geral;
  if (g.n) {
    const triagem = [
      plural(g.promotores, "promotor", "promotores"),
      plural(g.neutros, "neutro", "neutros"),
      plural(g.detratores, "detrator", "detratores"),
    ].join(", ");
    console.error(`\n${nomeMes(r.mes)}: NPS ${pontos(g.nps)} (±${g.margem.toFixed(0)}) · ${plural(g.n, "resposta", "respostas")} · ${triagem} · confiança ${r.confianca.nivel}`);
  }
  if (r.avisos.length) console.error(`${plural(r.avisos.length, "aviso", "avisos")}, no fim do relatório.`);
}

module.exports = {
  lerArquivo, acharColunas, lerNota, grupoDaNota, margem, margemConservadora, npsDe,
  semVariacao, faixa, bloco, confianca, calcular, conferirTemas, markdown, specPlanilha, nomeMes,
};

if (require.main === module) main();
