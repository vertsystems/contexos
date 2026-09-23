#!/usr/bin/env node
/**
 * Contex OS — relatorio-cliente.js
 * Consolida o mês de um cliente de agência ou freelancer num arquivo só
 * (`numeros-AAAA-MM.json`), compara com o mês anterior de forma determinística
 * e monta o relatório em HTML com a marca do cliente e a da agência, o e-mail
 * de envio e a lista do que o cliente precisa aprovar.
 *
 * Existe porque relatório mensal feito na mão sai com três defeitos que o
 * cliente percebe antes da agência: número copiado errado de uma tela, variação
 * "de cabeça" que não bate com a tabela, e peça produzida que ficou de fora
 * porque ninguém lembrou. Aqui todo número vem de arquivo (o JSON aponta a
 * fonte de cada um), a variação é calculada, e a lista de peças sai da pasta
 * do cliente, não da memória.
 *
 * Uso:
 *   node scripts/relatorio-cliente.js coletar  <pasta-do-cliente> --mes AAAA-MM
 *   node scripts/relatorio-cliente.js validar  <pasta-do-cliente> --mes AAAA-MM
 *   node scripts/relatorio-cliente.js comparar <pasta-do-cliente> --mes AAAA-MM [--md|--json]
 *   node scripts/relatorio-cliente.js html     <pasta-do-cliente> --mes AAAA-MM [--agencia "Nome"]
 *
 * O que cada comando faz:
 *   coletar   cria `relatorios/numeros-AAAA-MM.json` com o que dá pra puxar de
 *             arquivo: investimento e conversões dos relatórios do /relatorio-ads
 *             (frontmatter) que caem no mês, e a lista de peças produzidas na
 *             pasta do cliente naquele mês (data no nome do arquivo ou da pasta).
 *             O resto fica null, que vira "não medido" no relatório. Não
 *             sobrescreve arquivo existente sem --forcar
 *   validar   confere o JSON: mês certo, valor numérico ou null, e todo valor
 *             preenchido com a fonte (arquivo de onde veio). Número sem fonte é
 *             erro, e aprovação sem prazo também. Prazo em fim de semana ou
 *             feriado sai como aviso, com o próximo dia útil calculado
 *   comparar  lê o mês e o anterior e calcula a variação de cada métrica.
 *             --md imprime a tabela pra colar no relatório; --json pra outra
 *             ferramenta ler
 *   html      preenche `templates/crescimento/relatorio-cliente.html` com os
 *             números, a comparação, os cinco textos, as peças e as aprovações,
 *             e grava `relatorios/relatorio-AAAA-MM.html` e
 *             `relatorios/email-AAAA-MM.md`. O PDF sai depois com
 *             `node scripts/gerar-pdf.js`
 *
 * Opções:
 *   --mes AAAA-MM        mês do relatório (obrigatório)
 *   --hoje DD/MM/AAAA    data de geração (padrão: hoje). Serve pra teste e pra
 *                        reemitir um relatório antigo
 *   --agencia "Nome"     nome da agência no relatório (padrão: lido de
 *                        _memoria/empresa.md, ou "[agência]")
 *   --raiz <pasta>       raiz do workspace (padrão: sobe da pasta do cliente até
 *                        achar _memoria/ ou CLAUDE.md)
 *   --forcar             coletar por cima de um numeros.json que já existe
 *   --md / --json        formato de saída do comparar
 *   --tudo               no comparar, lista também as métricas sem dado nos dois
 *                        meses (por padrão elas ficam fora da tabela)
 *
 * Regras de comparação: atual null → "não medido"; anterior inexistente → "sem
 * base"; anterior zero e atual maior → "de zero" (sem porcentagem); no resto,
 * variação = (atual − anterior) ÷ |anterior|. Métrica de custo (CPA, CPL) melhora
 * quando cai; investimento e quantidade de post são neutros: mudam, não
 * melhoram nem pioram. Métrica medida no mês anterior continua na tabela mesmo
 * sem dado agora, como "não medido": linha que some esconde número que piorou.
 *
 * Node 18+, sem dependência. Usa br.js (número, moeda, data, slug).
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── métricas conhecidas ───────────────────────────
// melhor: "maior" (quanto mais, melhor), "menor" (custo), "neutro" (só muda)
const METRICAS = {
  investimento_ads: { rotulo: "Investimento em anúncio", unidade: "R$", melhor: "neutro" },
  alcance: { rotulo: "Pessoas alcançadas", unidade: "un", melhor: "maior" },
  impressoes: { rotulo: "Vezes que o anúncio apareceu", unidade: "un", melhor: "maior" },
  cliques: { rotulo: "Cliques", unidade: "un", melhor: "maior" },
  visitas_site: { rotulo: "Visitas no site", unidade: "un", melhor: "maior" },
  leads: { rotulo: "Contatos recebidos", unidade: "un", melhor: "maior" },   // o cliente lê o relatório: "leads" fica na conversa interna
  conversas: { rotulo: "Conversas iniciadas no WhatsApp", unidade: "un", melhor: "maior" },
  cpl: { rotulo: "Custo por contato", unidade: "R$", melhor: "menor" },
  cpa: { rotulo: "Custo por conversão", unidade: "R$", melhor: "menor" },
  vendas: { rotulo: "Vendas", unidade: "un", melhor: "maior" },
  receita: { rotulo: "Receita atribuída", unidade: "R$", melhor: "maior" },
  ticket_medio: { rotulo: "Ticket médio", unidade: "R$", melhor: "maior" },
  seguidores: { rotulo: "Seguidores", unidade: "un", melhor: "maior" },
  posts_publicados: { rotulo: "Posts publicados", unidade: "un", melhor: "neutro" },
  avaliacoes_google: { rotulo: "Avaliações no Google", unidade: "un", melhor: "maior" },
  nota_google: { rotulo: "Nota no Google", unidade: "nota", melhor: "maior" },
};

const ORDEM = Object.keys(METRICAS);
const SEMPRE_VISIVEIS = ["leads", "vendas", "receita"];
const MESES_EXTENSO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const EXT_PECA = new Set([".md", ".html", ".png", ".jpg", ".jpeg", ".webp", ".pdf", ".csv", ".xlsx", ".docx", ".mp4", ".mov", ".svg", ".txt"]);
const EXT_IMAGEM = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const PASTAS_IGNORADAS = new Set(["relatorios", "dados", "node_modules", "identidade", ".git"]);
// Arquivo de trabalho interno não é peça entregue. Sem esta lista, um briefing
// aberto pra reler no dia 12 entra no relatório como "produzido em agosto".
const ARQUIVOS_IGNORADOS = new Set([
  "briefing.md", "notas.md", "notas-internas.md", "indice.md", "readme.md",
  "claude.md", "tarefas.md", "contrato.md", "proposta.md", "biblioteca.md",
]);
// Ordem de peso no e-mail: o dono olha resultado antes de esforço.
const PESO_EMAIL = ["leads", "conversas", "vendas", "receita", "cpl", "cpa", "visitas_site", "ticket_medio", "investimento_ads"];
const APROVACOES_MAX = 3;

// ─────────────────────────── utilitários ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function mesValido(m) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || "")); }

function mesAnterior(m) {
  const [a, mm] = m.split("-").map(Number);
  const d = new Date(a, mm - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesExtenso(m) {
  const [a, mm] = m.split("-").map(Number);
  return `${MESES_EXTENSO[mm - 1]} de ${a}`;
}

function lerJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { morrer(`Não consegui ler ${p}: ${e.message}`); }
}

function escapar(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inteiro(n) { return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 }); }

/** Formata um valor conforme a unidade da métrica. */
function fmtValor(v, unidade) {
  if (v === null || v === undefined || Number.isNaN(v)) return "não medido";
  if (unidade === "R$") return br.reais(v);
  if (unidade === "%") return br.pct(v / 100, 1);
  if (unidade === "nota") return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return Number.isInteger(v) ? inteiro(v) : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Frontmatter YAML simples (chave: valor), como o /relatorio-ads grava. */
function frontmatter(txt) {
  const m = String(txt).replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const obj = {};
  for (const linha of m[1].split(/\r?\n/)) {
    const x = linha.match(/^([\w-]+):\s*(.*)$/);
    if (x) obj[x[1]] = x[2].trim();
  }
  return obj;
}

/** Acha a raiz do workspace subindo da pasta do cliente. */
function acharRaiz(pasta) {
  let d = path.resolve(pasta);
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, "_memoria")) || fs.existsSync(path.join(d, "CLAUDE.md"))) return d;
    const pai = path.dirname(d);
    if (pai === d) break;
    d = pai;
  }
  return null;
}

function nomeDaAgencia(raiz) {
  if (!raiz) return null;
  const p = path.join(raiz, "_memoria", "empresa.md");
  if (!fs.existsSync(p)) return null;
  const txt = fs.readFileSync(p, "utf8");
  let m = txt.match(/^\*\*Nome(?: do neg[óo]cio| da empresa)?:?\*\*:?\s*(.+)$/mi) || txt.match(/^-\s*\*\*Nome[^*]*\*\*:?\s*(.+)$/mi);
  if (m) return m[1].trim();
  m = txt.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/\s*[—-]\s*.*$/, "").trim() : null;
}

// ─────────────────────────── coletar ───────────────────────────

/** Data AAAA-MM-DD escondida no nome de arquivo ou de pasta. */
function dataNoNome(nome) {
  const m = nome.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Lista o que foi produzido na pasta do cliente dentro do mês. */
function listarEntregas(pasta, mes) {
  const raizCliente = path.resolve(pasta);
  const grupos = new Map();
  const soltos = [];

  function andar(dir, prof) {
    if (prof > 6) return;
    let itens;
    try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const it of itens) {
      if (it.name.startsWith(".")) continue;
      const p = path.join(dir, it.name);
      if (it.isDirectory()) {
        if (PASTAS_IGNORADAS.has(it.name)) continue;
        andar(p, prof + 1);
        continue;
      }
      const ext = path.extname(it.name).toLowerCase();
      if (!EXT_PECA.has(ext)) continue;
      if (/^numeros-\d{4}-\d{2}\.json$/.test(it.name)) continue;
      if (ARQUIVOS_IGNORADOS.has(it.name.toLowerCase())) continue;
      const pastaPai = path.basename(dir);
      const dataPasta = dir !== raizCliente ? dataNoNome(pastaPai) : null;
      const dataArq = dataNoNome(it.name);
      let data = dataArq || dataPasta;
      if (!data) {
        try { data = br.iso(fs.statSync(p).mtime); } catch { continue; }
      }
      if (!data.startsWith(mes)) continue;
      const rel = path.relative(raizCliente, p).split(path.sep).join("/");
      if (dataPasta && !dataArq) {
        const relPasta = path.relative(raizCliente, dir).split(path.sep).join("/");
        const g = grupos.get(relPasta) || { peca: pastaPai, caminho: relPasta, data, arquivos: 0, imagem: null, estado: "[a confirmar]" };
        g.arquivos++;
        if (!g.imagem && EXT_IMAGEM.has(ext)) g.imagem = rel;
        grupos.set(relPasta, g);
      } else {
        soltos.push({ peca: it.name.replace(/\.[^.]+$/, ""), caminho: rel, data, arquivos: 1, imagem: EXT_IMAGEM.has(ext) ? rel : null, estado: "[a confirmar]" });
      }
    }
  }
  andar(raizCliente, 0);
  return [...grupos.values(), ...soltos].sort((a, b) => a.data.localeCompare(b.data) || a.caminho.localeCompare(b.caminho));
}

/** Soma investimento e conversões dos relatórios semanais do /relatorio-ads que caem no mês. */
function lerRelatoriosAds(pasta, mes) {
  const dir = path.join(pasta, "campanhas", "relatorios");
  if (!fs.existsSync(dir)) return null;
  const usados = [];
  let investimento = 0, conversoes = 0, temInv = false, temConv = false;
  for (const nome of fs.readdirSync(dir).sort()) {
    if (!nome.endsWith(".md")) continue;
    const fm = frontmatter(fs.readFileSync(path.join(dir, nome), "utf8"));
    if (!fm) continue;
    const fim = fm.periodo_fim || dataNoNome(nome);
    if (!fim || !fim.startsWith(mes)) continue;
    const inv = br.numero(fm.investimento_total), conv = br.numero(fm.conversoes_total);
    if (!Number.isNaN(inv)) { investimento += inv; temInv = true; }
    if (!Number.isNaN(conv)) { conversoes += conv; temConv = true; }
    usados.push(`campanhas/relatorios/${nome}`);
  }
  if (!usados.length) return null;
  const fonte = usados.join(", ");
  const out = { usados };
  if (temInv) out.investimento_ads = { valor: br.centavos(investimento), fonte };
  if (temConv) out.leads = { valor: conversoes, fonte };
  if (temInv && temConv && conversoes > 0) out.cpl = { valor: br.centavos(investimento / conversoes), fonte: `${fonte} (investimento ÷ conversões)` };
  return out;
}

function esqueletoMetricas() {
  const m = {};
  for (const k of ORDEM) m[k] = { valor: null, fonte: null };
  return m;
}

function coletar(pasta, mes, opts) {
  const dirRel = path.join(pasta, "relatorios");
  const destino = path.join(dirRel, `numeros-${mes}.json`);
  if (fs.existsSync(destino) && !opts.forcar) {
    morrer(`${destino} já existe.`, "Edite o arquivo, ou rode com --forcar pra coletar por cima (o que você preencheu à mão se perde).");
  }
  const numeros = {
    cliente: opts.nomeCliente || path.basename(path.resolve(pasta)),
    mes,
    gerado_em: br.iso(opts.hoje),
    metricas: esqueletoMetricas(),
    entregas: listarEntregas(pasta, mes),
    texto: { feito: "", mudou: "", porque: "", vem: "", precisa_de_voce: "" },
    aprovacoes: [],
    proximo_mes: [],
    fontes_lidas: [],
  };
  const ads = lerRelatoriosAds(pasta, mes);
  if (ads) {
    for (const k of ["investimento_ads", "leads", "cpl"]) if (ads[k]) numeros.metricas[k] = ads[k];
    numeros.fontes_lidas.push(...ads.usados);
  }
  fs.mkdirSync(dirRel, { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(numeros, null, 2) + "\n");
  const preenchidas = Object.values(numeros.metricas).filter((m) => m.valor !== null).length;
  console.log(`✓ ${destino}`);
  console.log(`  ${preenchidas} métrica(s) vieram de arquivo${ads ? ` (${ads.usados.length} relatório(s) de ads)` : " (nenhum relatório de ads no mês)"}`);
  console.log(`  ${numeros.entregas.length} peça(s) encontrada(s) na pasta do cliente em ${mesExtenso(mes)}`);
  if (ads && ads.leads) {
    console.log("  As conversões do /relatorio-ads entraram como \"contatos recebidos\". Se a conversão desse cliente");
    console.log("  é venda, mova o valor pra \"vendas\" e o custo de \"cpl\" pra \"cpa\" antes de gerar o relatório.");
  }
  console.log("  Arquivo sem data no nome entra pela data de modificação: confira a lista de peças antes de seguir.");
  console.log("  O que ficou null sai como \"não medido\". Preencha com valor e fonte (arquivo) o que tiver dado; nunca de memória.");
  return destino;
}

// ─────────────────────────── validar ───────────────────────────

function validar(numeros, mes) {
  const erros = [], avisos = [];
  if (!numeros || typeof numeros !== "object") return { erros: ["JSON vazio"], avisos };
  if (numeros.mes !== mes) erros.push(`campo "mes" é ${numeros.mes}, esperado ${mes}`);
  if (!numeros.cliente) erros.push('campo "cliente" vazio');
  const metricas = numeros.metricas || {};
  if (!Object.keys(metricas).length) erros.push("nenhuma métrica no arquivo");
  for (const [k, m] of Object.entries(metricas)) {
    if (!m || typeof m !== "object") { erros.push(`métrica "${k}" precisa ser objeto {valor, fonte}`); continue; }
    if (m.valor !== null && typeof m.valor !== "number") erros.push(`métrica "${k}": valor "${m.valor}" não é número nem null`);
    if (typeof m.valor === "number" && Number.isNaN(m.valor)) erros.push(`métrica "${k}": valor é NaN`);
    if (m.valor !== null && !(m.fonte && String(m.fonte).trim())) erros.push(`métrica "${k}" tem valor (${m.valor}) sem fonte. Número sem arquivo de origem não entra no relatório`);
    if (!METRICAS[k] && !(m.rotulo && m.unidade)) erros.push(`métrica "${k}" não é conhecida: precisa de "rotulo" e "unidade" (R$, un, %, nota) e, se quiser, "melhor" (maior, menor, neutro)`);
    if (m.melhor && !["maior", "menor", "neutro"].includes(m.melhor)) erros.push(`métrica "${k}": "melhor" deve ser maior, menor ou neutro`);
  }
  const t = numeros.texto || {};
  for (const k of ["feito", "mudou", "porque", "vem", "precisa_de_voce"]) if (!(t[k] && String(t[k]).trim())) avisos.push(`texto.${k} está vazio`);
  for (const e of numeros.entregas || []) {
    if (!e.estado || /a confirmar/i.test(e.estado)) avisos.push(`entrega "${e.peca}" sem estado (publicado, aguardando aprovação, em produção)`);
  }
  const aprovacoes = numeros.aprovacoes || [];
  for (const a of aprovacoes) {
    const nome = (a && a.item) || "(sem nome)";
    if (!a || !a.item || !String(a.item).trim()) { erros.push('aprovação sem "item": escreva o que o cliente precisa aprovar'); continue; }
    if (!a.prazo || !String(a.prazo).trim()) {
      erros.push(`aprovação "${nome}" sem prazo. Pedido sem data não é pedido, é desejo`);
      continue;
    }
    const d = br.lerData(a.prazo);
    if (!d) { erros.push(`aprovação "${nome}": prazo "${a.prazo}" não é data válida`); continue; }
    if (!br.ehUtil(d)) {
      const { data } = br.proximoUtil(d);
      avisos.push(`aprovação "${nome}": ${br.fmt(d)} cai em ${br.porQueNaoUtil(d)} — o próximo dia útil é ${br.fmt(data)} (${br.diaSemana(data)})`);
    }
  }
  if (aprovacoes.length > APROVACOES_MAX) {
    avisos.push(`${aprovacoes.length} itens pra aprovar; a régua é ${APROVACOES_MAX}. O que sobra vira pauta de reunião, senão nada é aprovado`);
  }
  if (!(numeros.entregas || []).length) avisos.push("nenhuma peça listada em entregas");
  return { erros, avisos };
}

// ─────────────────────────── comparar ───────────────────────────

function definicao(k, m) {
  const base = METRICAS[k] || {};
  return { rotulo: m.rotulo || base.rotulo || k, unidade: m.unidade || base.unidade || "un", melhor: m.melhor || base.melhor || "neutro" };
}

function comparar(atual, anterior) {
  const doAtual = atual.metricas || {};
  const doAnterior = (anterior && anterior.metricas) || {};
  // A métrica que foi medida no mês passado entra mesmo sem dado neste mês: sai
  // como "não medido", que é o certo. Deixar a linha cair fora do relatório
  // esconderia justamente o número que parou de ser acompanhado.
  const todas = [...new Set([...Object.keys(doAtual), ...Object.keys(doAnterior)])];
  const chaves = [...ORDEM.filter((k) => todas.includes(k)), ...todas.filter((k) => !ORDEM.includes(k))];
  const linhas = [];
  for (const k of chaves) {
    const m = doAtual[k] || { valor: null, fonte: null };
    const mAnt = doAnterior[k] || null;
    const d = definicao(k, { ...(mAnt || {}), ...m });   // rótulo de métrica custom pode vir só do mês anterior
    const a = m.valor === undefined ? null : m.valor;
    const ant = mAnt ? (mAnt.valor === undefined ? null : mAnt.valor) : null;
    const linha = { chave: k, ...d, atual: a, anterior: ant, delta: null, pct: null, situacao: "", direcao: "neutro", fonte: m.fonte || null };
    if (a === null || a === undefined) { linha.situacao = "não medido"; }
    else if (ant === null || ant === undefined) { linha.situacao = "sem base"; }
    else if (ant === 0 && a > 0) { linha.situacao = "de zero"; linha.delta = a; linha.direcao = d.melhor === "menor" ? "piorou" : d.melhor === "maior" ? "melhorou" : "mudou"; }
    else if (ant === 0 && a === 0) { linha.situacao = "igual"; linha.delta = 0; linha.pct = 0; linha.direcao = "igual"; }
    else {
      linha.delta = d.unidade === "R$" ? br.centavos(a - ant) : a - ant;
      linha.pct = (a - ant) / Math.abs(ant);
      if (linha.delta === 0) { linha.situacao = "igual"; linha.direcao = "igual"; }
      else {
        linha.situacao = "variou";
        if (d.melhor === "neutro") linha.direcao = "mudou";
        else linha.direcao = (linha.delta > 0) === (d.melhor === "maior") ? "melhorou" : "piorou";
      }
    }
    linhas.push(linha);
  }
  // No relatório entram as métricas medidas neste mês ou no anterior, mais as três
  // que o cliente sempre pergunta (contato, venda, receita), que saem como "não
  // medido" quando ninguém informou. As outras ficam no JSON, à espera de dado.
  for (const l of linhas) l.visivel = l.atual !== null || (l.anterior !== null && l.anterior !== undefined) || SEMPRE_VISIVEIS.includes(l.chave);
  const medidas = linhas.filter((l) => l.situacao !== "não medido").length;
  return { mes: atual.mes, mesAnterior: anterior ? anterior.mes : null, linhas, medidas, naoMedidas: linhas.filter((l) => l.visivel).length - medidas, temBase: !!anterior };
}

function textoVariacao(l) {
  if (l.situacao === "não medido") return "não medido";
  if (l.situacao === "sem base") return "sem base";
  if (l.situacao === "igual") return "igual";
  if (l.situacao === "de zero") return "de zero";
  const sinal = l.delta > 0 ? "+" : "−";
  const absDelta = fmtValor(Math.abs(l.delta), l.unidade);
  return `${sinal}${absDelta} (${sinal}${br.pct(Math.abs(l.pct), 1)})`;
}

/** Mesma variação, sem os parênteses de dentro: "+9, +29,0%" pra usar entre parênteses. */
function textoVariacaoCurto(l) {
  if (l.situacao !== "variou") return textoVariacao(l);
  const sinal = l.delta > 0 ? "+" : "−";
  return `${sinal}${fmtValor(Math.abs(l.delta), l.unidade)}, ${sinal}${br.pct(Math.abs(l.pct), 1)}`;
}

function tabelaMd(cmp, tudo = false) {
  const cab = `| Métrica | ${mesExtenso(cmp.mes)} | ${cmp.mesAnterior ? mesExtenso(cmp.mesAnterior) : "mês anterior"} | Variação | Leitura |\n|---|---|---|---|---|`;
  const rows = cmp.linhas.filter((l) => tudo || l.visivel).map((l) => `| ${l.rotulo} | ${fmtValor(l.atual, l.unidade)} | ${l.anterior === null || l.anterior === undefined ? "—" : fmtValor(l.anterior, l.unidade)} | ${textoVariacao(l)} | ${l.situacao === "não medido" || l.situacao === "sem base" ? "—" : l.direcao} |`);
  return [cab, ...rows].join("\n");
}

// ─────────────────────────── html ───────────────────────────

/** Lê o tokens.css e resolve um nível de var(). Devolve { accent, text, bg, fonte } ou {}. */
function lerTokens(dirIdentidade) {
  const p = path.join(dirIdentidade, "tokens.css");
  if (!fs.existsSync(p)) return {};
  const css = fs.readFileSync(p, "utf8");
  const vars = {};
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  const resolver = (v, prof = 0) => {
    if (!v || prof > 4) return v;
    const r = v.match(/^var\(--([\w-]+)\)$/);
    return r ? resolver(vars[r[1]], prof + 1) : v;
  };
  const cor = (k) => { const v = resolver(vars[k]); return v && /^(#|rgb|hsl)/.test(v) ? v : null; };
  const fonte = resolver(vars["font-body"] || vars["fonte-corpo"] || vars["font-sans"] || vars["ff-body"]);
  return { accent: cor("accent"), text: cor("text"), bg: cor("bg"), fonte: fonte && !fonte.startsWith("var(") ? fonte : null };
}

function acharLogo(dirIdentidade) {
  if (!fs.existsSync(dirIdentidade)) return null;
  for (const ext of [".svg", ".png", ".jpg", ".jpeg", ".webp"]) {
    const p = path.join(dirIdentidade, "logo" + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const MIME = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

/** Imagem como data URI (até 1,5 MB), pra o HTML e o PDF andarem sozinhos. */
function dataUri(p) {
  try {
    const st = fs.statSync(p);
    if (st.size > 1.5 * 1024 * 1024) return null;
    return `data:${MIME[path.extname(p).toLowerCase()] || "application/octet-stream"};base64,${fs.readFileSync(p).toString("base64")}`;
  } catch { return null; }
}

function marcaHtml(nome, logoPath, classe) {
  const uri = logoPath ? dataUri(logoPath) : null;
  if (uri) return `<img class="${classe}" src="${uri}" alt="${escapar(nome)}">`;
  return `<span class="${classe} marca-texto">${escapar(nome)}</span>`;
}

function paragrafos(txt) {
  const t = String(txt || "").trim();
  if (!t) return '<p class="pendente">[preencher]</p>';
  return t.split(/\n{2,}/).map((p) => `<p>${escapar(p).replace(/\n/g, "<br>")}</p>`).join("\n");
}

/** "9 números medidos, 1 não medido" — sem "1 não medidos" no alto da capa. */
function resumoMedicao(cmp) {
  const m = cmp.medidas, n = cmp.naoMedidas;
  const medidos = m === 1 ? "1 número medido" : `${m} números medidos`;
  if (!n) return medidos;
  return `${medidos}, ${n === 1 ? "1 não medido" : `${n} não medidos`}`;
}

function classeDirecao(d) { return { melhorou: "bom", piorou: "ruim", igual: "neutro", mudou: "neutro", neutro: "neutro" }[d] || "neutro"; }

function setaHtml(l) {
  if (l.situacao === "não medido" || l.situacao === "sem base") return `<span class="var sem">${escapar(textoVariacao(l))}</span>`;
  const seta = l.situacao === "igual" ? "=" : l.delta > 0 ? "▲" : "▼";
  return `<span class="var ${classeDirecao(l.direcao)}">${seta} ${escapar(textoVariacao(l))}</span>`;
}

function montarHtml(molde, ctx) {
  const { numeros, cmp, agencia, hoje, tokensCliente, tokensAgencia, logoCliente, logoAgencia, pastaCliente } = ctx;
  const linhasTabela = cmp.linhas.filter((l) => l.visivel).map((l) => `
        <tr>
          <td>${escapar(l.rotulo)}</td>
          <td class="num">${escapar(fmtValor(l.atual, l.unidade))}</td>
          <td class="num">${l.anterior === null || l.anterior === undefined ? "—" : escapar(fmtValor(l.anterior, l.unidade))}</td>
          <td class="num">${setaHtml(l)}</td>
        </tr>`).join("");

  const fontes = [...new Set(cmp.linhas.filter((l) => l.fonte).map((l) => l.fonte))];
  const listaFontes = fontes.length ? fontes.map((f) => `<li>${escapar(f)}</li>`).join("\n") : "<li>nenhum número com fonte neste mês</li>";

  const entregas = (numeros.entregas || []).map((e) => {
    const img = e.imagem ? dataUri(path.join(pastaCliente, e.imagem)) : null;
    const d = br.lerData(e.data);
    return `
      <li class="peca">
        ${img ? `<img src="${img}" alt="${escapar(e.peca)}">` : '<div class="peca-vazia"></div>'}
        <div>
          <strong>${escapar(e.peca)}</strong>
          <span>${d ? br.fmt(d) : escapar(e.data || "")} · ${escapar(e.estado || "[a confirmar]")}${e.arquivos > 1 ? ` · ${e.arquivos} arquivos` : ""}</span>
          <code>${escapar(e.caminho)}</code>
        </div>
      </li>`;
  }).join("") || '<li class="pendente">Nenhuma peça listada neste mês.</li>';

  const aprovacoes = (numeros.aprovacoes || []).map((a) => {
    const d = a.prazo ? br.lerData(a.prazo) : null;
    return `<li><span class="caixa"></span><div><strong>${escapar(a.item)}</strong>${d ? ` <span class="prazo">até ${br.fmt(d)} (${br.diaSemana(d)})</span>` : ""}${a.caminho ? `<br><code>${escapar(a.caminho)}</code>` : ""}</div></li>`;
  }).join("") || "<li>Nada pendente de aprovação.</li>";

  const proximo = (numeros.proximo_mes || []).map((p) => `<li>${escapar(p)}</li>`).join("") || '<li class="pendente">[preencher]</li>';

  const valores = {
    cliente: escapar(numeros.cliente),
    agencia: escapar(agencia),
    mes_extenso: mesExtenso(numeros.mes),
    mes_anterior_extenso: cmp.mesAnterior ? mesExtenso(cmp.mesAnterior) : "mês anterior",
    gerado_em: br.fmt(hoje),
    cor_cliente: tokensCliente.accent || "#1F2937",
    cor_agencia: tokensAgencia.accent || "#6B7280",
    cor_texto: tokensCliente.text || "#111827",
    fonte: tokensCliente.fonte || tokensAgencia.fonte || "Inter, 'Helvetica Neue', Arial, sans-serif",
    marca_cliente: marcaHtml(numeros.cliente, logoCliente, "logo-cliente"),
    marca_agencia: marcaHtml(agencia, logoAgencia, "logo-agencia"),
    tabela_numeros: linhasTabela,
    fontes: listaFontes,
    feito: paragrafos(numeros.texto?.feito),
    mudou: paragrafos(numeros.texto?.mudou),
    porque: paragrafos(numeros.texto?.porque),
    vem: paragrafos(numeros.texto?.vem),
    precisa_de_voce: paragrafos(numeros.texto?.precisa_de_voce),
    entregas,
    aprovacoes,
    proximo_mes: proximo,
    resumo_medicao: resumoMedicao(cmp),
    aviso_base: cmp.temBase ? "" : `<p class="aviso">Este é o primeiro mês com os números guardados em arquivo: não há mês anterior pra comparar. A coluna de variação começa a valer no relatório de ${mesExtenso(mesProximo(numeros.mes))}.</p>`,
  };
  let html = molde.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in valores ? valores[k] : m));
  const sobrou = html.match(/\{\{\w+\}\}/g);
  if (sobrou) morrer(`O molde tem marcador que o script não conhece: ${[...new Set(sobrou)].join(", ")}`);
  return html;
}

function montarEmail(numeros, cmp, agencia, pdfNome) {
  const t = numeros.texto || {};
  // Quatro números, na ordem do que o dono pergunta: resultado primeiro, esforço depois.
  const peso = (k) => {
    const i = PESO_EMAIL.indexOf(k);
    if (i !== -1) return i;
    const j = ORDEM.indexOf(k);            // métrica do próprio cliente (fora da lista) vem logo depois
    return j === -1 ? PESO_EMAIL.length : PESO_EMAIL.length + 1 + j;
  };
  const linhasNum = cmp.linhas
    .filter((l) => l.situacao !== "não medido" && l.chave !== "posts_publicados")
    .sort((x, y) => peso(x.chave) - peso(y.chave))
    .slice(0, 4)
    .map((l) => `- ${l.rotulo}: ${fmtValor(l.atual, l.unidade)}${l.situacao === "variou" || l.situacao === "de zero" ? ` (${textoVariacaoCurto(l)})` : l.situacao === "sem base" ? " (primeiro mês medido)" : ""}`);
  const aprov = (numeros.aprovacoes || []).map((a) => {
    const d = a.prazo ? br.lerData(a.prazo) : null;
    return `- [ ] ${a.item}${d ? ` — até ${br.fmt(d)} (${br.diaSemana(d)})` : ""}`;
  });
  return `# E-mail de envio — ${numeros.cliente} — ${mesExtenso(numeros.mes)}

**Assunto:** ${numeros.cliente}: relatório de ${mesExtenso(numeros.mes)}${aprov.length ? ` e ${aprov.length} ${aprov.length > 1 ? "itens" : "item"} pra você aprovar` : ""}

**Anexo:** ${pdfNome}

---

Oi, [nome de quem recebe],

Segue o relatório de ${mesExtenso(numeros.mes)}. O resumo, em cinco linhas:

**O que foi feito:** ${(t.feito || "[preencher]").trim().split(/\n/)[0]}

**O que mudou:** ${(t.mudou || "[preencher]").trim().split(/\n/)[0]}

**Por quê:** ${(t.porque || "[preencher]").trim().split(/\n/)[0]}

**O que vem em ${mesExtenso(mesProximo(numeros.mes))}:** ${(t.vem || "[preencher]").trim().split(/\n/)[0]}

**O que precisa de você:** ${(t.precisa_de_voce || "[preencher]").trim().split(/\n/)[0]}

${linhasNum.length ? `Os números que mais pesam:\n${linhasNum.join("\n")}\n` : ""}${aprov.length ? `\nPra eu seguir sem travar, preciso do seu ok em:\n${aprov.join("\n")}\n` : ""}
Qualquer dúvida sobre um número, me chama que eu mostro de onde saiu.

[assinatura de ${agencia}]

---

> Revisar antes de enviar: nome de quem recebe, a assinatura, e se as cinco linhas estão na voz da agência (\`_memoria/preferencias.md\`). Enviar é ação do usuário, não do assistente.
`;
}

function mesProximo(m) {
  const [a, mm] = m.split("-").map(Number);
  const d = new Date(a, mm, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─────────────────────────── main ───────────────────────────

function lerArgs(argv) {
  const opts = { pos: [], md: false, json: false, forcar: false, hoje: new Date() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mes") opts.mes = argv[++i];
    else if (a === "--hoje") { opts.hoje = br.lerData(argv[++i]); if (!opts.hoje) morrer("--hoje precisa ser DD/MM/AAAA ou AAAA-MM-DD"); }
    else if (a === "--agencia") opts.agencia = argv[++i];
    else if (a === "--cliente") opts.nomeCliente = argv[++i];
    else if (a === "--raiz") opts.raiz = argv[++i];
    else if (a === "--molde") opts.molde = argv[++i];
    else if (a === "--forcar") opts.forcar = true;
    else if (a === "--md") opts.md = true;
    else if (a === "--tudo") opts.tudo = true;
    else if (a === "--json") opts.json = true;
    else if (a.startsWith("--")) morrer(`Opção desconhecida: ${a}`, "Válidas: --mes, --hoje, --agencia, --cliente, --raiz, --molde, --forcar, --md, --json, --tudo");
    else opts.pos.push(a);
  }
  return opts;
}

function carregarMes(pasta, mes, obrigatorio) {
  const p = path.join(pasta, "relatorios", `numeros-${mes}.json`);
  if (!fs.existsSync(p)) {
    if (obrigatorio) morrer(`Não achei ${p}.`, `Rode antes:\n  node scripts/relatorio-cliente.js coletar "${pasta}" --mes ${mes}`);
    return null;
  }
  return lerJson(p);
}

function main() {
  const opts = lerArgs(process.argv.slice(2));
  const [comando, pasta] = opts.pos;
  const ajuda = "Uso:\n  node scripts/relatorio-cliente.js <coletar|validar|comparar|html> <pasta-do-cliente> --mes AAAA-MM";
  if (!comando || !["coletar", "validar", "comparar", "html"].includes(comando)) morrer("Faltou o comando.", ajuda);
  if (!pasta) morrer("Faltou a pasta do cliente.", ajuda);
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) morrer(`A pasta ${pasta} não existe.`, "Na convenção por cliente é clientes/<Nome>/; por tipo, relatorios/<cliente>/.");
  if (!opts.mes) morrer("Faltou --mes AAAA-MM (ex.: --mes 2026-08).", ajuda);
  if (!mesValido(opts.mes)) morrer(`Mês inválido: "${opts.mes}".`, "O formato é AAAA-MM, com mês de 01 a 12 (ex.: --mes 2026-08).");
  const mes = opts.mes;

  if (comando === "coletar") { coletar(pasta, mes, opts); return; }

  const atual = carregarMes(pasta, mes, true);
  const { erros, avisos } = validar(atual, mes);

  if (comando === "validar") {
    for (const e of erros) console.log(`  ✖ ${e}`);
    for (const a of avisos) console.log(`  · ${a}`);
    if (erros.length) { console.log(`\n✖ ${erros.length} erro(s) em numeros-${mes}.json`); process.exit(1); }
    console.log(`✓ numeros-${mes}.json válido${avisos.length ? ` (${avisos.length} aviso(s) acima)` : ""}`);
    return;
  }

  if (erros.length) {
    for (const e of erros) console.error(`  ✖ ${e}`);
    morrer(`numeros-${mes}.json tem ${erros.length} erro(s). Corrija antes de comparar ou gerar o HTML.`);
  }

  const anterior = carregarMes(pasta, mesAnterior(mes), false);
  const cmp = comparar(atual, anterior);

  if (comando === "comparar") {
    if (opts.json) { console.log(JSON.stringify(cmp, null, 2)); return; }
    if (!anterior) console.log(`(sem numeros-${mesAnterior(mes)}.json: a comparação sai como "sem base")\n`);
    console.log(tabelaMd(cmp, opts.tudo));
    const ocultas = cmp.linhas.filter((l) => !l.visivel).length;
    console.log(`\n${cmp.medidas} métrica(s) medida(s), ${cmp.naoMedidas} não medida(s) no relatório${ocultas && !opts.tudo ? `, ${ocultas} sem dado em nenhum dos dois meses (fora do relatório; --tudo lista)` : ""}`);
    return;
  }

  // html
  const raiz = opts.raiz ? path.resolve(opts.raiz) : acharRaiz(pasta);
  const moldePath = opts.molde || (raiz && path.join(raiz, "templates", "crescimento", "relatorio-cliente.html")) || path.join(__dirname, "..", "templates", "crescimento", "relatorio-cliente.html");
  if (!fs.existsSync(moldePath)) morrer(`Não achei o molde ${moldePath}.`, "Passe --molde <arquivo.html> ou --raiz <workspace>.");
  const molde = fs.readFileSync(moldePath, "utf8");
  const agencia = opts.agencia || nomeDaAgencia(raiz) || "[agência]";
  const dirIdCliente = path.join(pasta, "identidade");
  const dirIdAgencia = raiz ? path.join(raiz, "identidade") : "";
  const ctx = {
    numeros: atual, cmp, agencia, hoje: opts.hoje, pastaCliente: path.resolve(pasta),
    tokensCliente: lerTokens(dirIdCliente), tokensAgencia: dirIdAgencia ? lerTokens(dirIdAgencia) : {},
    logoCliente: acharLogo(dirIdCliente), logoAgencia: dirIdAgencia ? acharLogo(dirIdAgencia) : null,
  };
  const html = montarHtml(molde, ctx);
  const dirRel = path.join(pasta, "relatorios");
  fs.mkdirSync(dirRel, { recursive: true });
  const htmlPath = path.join(dirRel, `relatorio-${mes}.html`);
  const emailPath = path.join(dirRel, `email-${mes}.md`);
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(emailPath, montarEmail(atual, cmp, agencia, `relatorio-${mes}.pdf`));
  console.log(`✓ ${htmlPath}`);
  console.log(`✓ ${emailPath}`);
  console.log(`  marca do cliente: ${ctx.logoCliente ? "logo" : "nome em texto"}${ctx.tokensCliente.accent ? ", cor " + ctx.tokensCliente.accent : ", sem tokens.css (cor padrão)"}`);
  console.log(`  marca da agência: ${agencia}${ctx.logoAgencia ? " (logo)" : " (nome em texto)"}`);
  for (const a of avisos) console.log(`  · ${a}`);
  console.log(`\nPróximo passo:\n  node scripts/gerar-pdf.js "${htmlPath}"`);
}

module.exports = { METRICAS, comparar, textoVariacao, textoVariacaoCurto, tabelaMd, fmtValor, resumoMedicao, validar, listarEntregas, lerRelatoriosAds, frontmatter, mesAnterior, mesProximo, mesExtenso, lerTokens, montarEmail };

if (require.main === module) main();
