#!/usr/bin/env node
/**
 * Contex OS — retencao-video.js
 * Lê a curva de retenção de um vídeo longo do YouTube e acha o segundo de cada queda.
 *
 * Existe porque a leitura a olho do gráfico do Studio erra sempre nos mesmos
 * três pontos: o eixo vem em porcentagem da duração (não em segundo, então
 * "caiu ali" não vira timestamp), o export em PT-BR usa vírgula decimal e ponto
 * de milhar (somar direto dá NaN), e o que parece queda costuma ser a sangria
 * normal do vídeo, enquanto o degrau de verdade some no meio da linha. Aqui a
 * posição vira segundo pela duração, cada intervalo ganha a taxa de queda, e o
 * degrau é o que passa da mediana do próprio vídeo, não do que parece grande.
 *
 * Uso:
 *   node scripts/retencao-video.js curva <retencao.csv> --duracao 12:34
 *   node scripts/retencao-video.js curva <retencao.csv> --duracao 12:34 --legenda aula.srt
 *   node scripts/retencao-video.js curva <retencao.csv> --duracao 12:34 --alcance alcance.csv
 *   node scripts/retencao-video.js curva <retencao.csv> --duracao 12:34 --saida conteudo/retencao/dados.md
 *   node scripts/retencao-video.js funil <alcance.csv> --duracao 12:34
 *   node scripts/retencao-video.js funil --impressoes 12.400 --ctr 3,8 --visualizacoes 470 \
 *          --duracao 12:34 --media 4:12
 *   node scripts/retencao-video.js legenda <aula.srt> --em 1:47
 *
 * Opções:
 *   --duracao <mm:ss|hh:mm:ss>   duração total do vídeo (obrigatória em curva e funil)
 *   --legenda <arquivo>          .srt, .sbv ou .vtt pra cruzar queda com fala
 *   --alcance <alcance.csv>      fecha o funil junto com a curva, no mesmo comando
 *   --saida <arquivo.md>         grava as tabelas prontas em markdown
 *   --impressoes / --ctr / --visualizacoes / --media / --pct   entrada manual do funil
 *   --json                       devolve o laudo em JSON
 *
 * Réguas aplicadas (justificativa, fonte e data em templates/crescimento/retencao-de-video.md):
 *   degrau        — taxa de queda ≥ 3× a mediana do próprio vídeo E ≥ 1 ponto no intervalo
 *                   E ≥ 2 pontos percentuais no bloco (régua da skill, calculada)
 *                   O piso em pontos vale por intervalo, não em pp/10 s: a API devolve
 *                   100 pontos por vídeo (developers.google.com/youtube/analytics/dimensions,
 *                   conferido em 23/09/2026), então o passo cresce com a duração e um piso
 *                   fixo em pp/10 s desligava a detecção de degrau em vídeo longo.
 *   gancho        — perda nos primeiros 30 s: ≥ 30 pontos é problema, ≥ 20 é atenção
 *   pico de replay— bloco de subida contínua que somado passa de 1 ponto
 *   CTR           — metade dos vídeos do YouTube fica entre 2% e 10%
 *                   (support.google.com/youtube/answer/7628154, conferido em 23/09/2026)
 *
 * Só serve pra vídeo longo do YouTube: é o único formato que exporta a curva em CSV.
 * Node 18+. Sem dependência de npm. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const REGUA = {
  degrauFator: 3,        // vezes a mediana das taxas do próprio vídeo
  degrauPontoMin: 1,     // pontos percentuais perdidos no intervalo (piso por passo do CSV)
  degrauQuedaMin: 2,     // pontos percentuais somados no bloco
  ganchoAte: 30,         // segundos que contam como gancho
  ganchoProblema: 30,    // pontos perdidos nos primeiros 30 s
  ganchoAtencao: 20,
  replayMin: 1,          // pontos de subida somados no bloco
  sangriaCoefVar: 0.5,   // queda constante: taxas pouco dispersas
  quedaMin: 1,           // piso pra uma queda entrar na lista das maiores
  sobraFator: 1.5,       // vezes a mediana: queda solta só entra se for acima do padrão
  ctrPiso: 2,            // % — abaixo disso está fora da faixa de metade dos vídeos
  ctrTeto: 10,
  r30Piso: 70,           // % — retenção aos 30 s abaixo disso joga o gargalo no gancho
  pctPiso: 30,           // % média assistida abaixo disso joga o gargalo no corpo do vídeo
};

// ─────────────────────────── tempo ───────────────────────────

/** "12:34" → 754 · "1:02:30" → 3750 · "90" → 90 · "4:12.5" → 252.5 */
function segundos(t) {
  const s = String(t == null ? "" : t).trim().replace(",", ".");
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const m = s.match(/^(?:(\d{1,3}):)?(\d{1,3}):(\d{1,2}(?:\.\d+)?)$/);
  if (!m) return null;
  const h = m[1] === undefined ? 0 : Number(m[1]);
  return h * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** 754 → "12:34" · 3750 → "1:02:30" */
function relogio(seg) {
  if (seg == null || !isFinite(seg)) return "—";
  const t = Math.round(seg);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const dois = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${dois(m)}:${dois(s)}` : `${m}:${dois(s)}`;
}

// ─────────────────────────── CSV ───────────────────────────

/** Separador do arquivo: o que mais aparece no cabeçalho entre ; , e tab. */
function separador(cabecalho) {
  const cand = [";", "\t", ","];
  let melhor = ",", n = -1;
  for (const c of cand) {
    const q = cabecalho.split(c).length - 1;
    if (q > n) { n = q; melhor = c; }
  }
  return melhor;
}

function linhaCsv(linha, sep) {
  const campos = [];
  let atual = "", aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++; }
      else aspas = !aspas;
    } else if (c === sep && !aspas) { campos.push(atual); atual = ""; }
    else atual += c;
  }
  campos.push(atual);
  return campos.map((x) => x.trim());
}

/** Lê CSV (ou TSV) do Studio: tira BOM, detecta separador, devolve cabeçalho e linhas. */
function lerCsv(arquivo) {
  let bruto = fs.readFileSync(arquivo, "utf8");
  if (bruto.charCodeAt(0) === 0xfeff) bruto = bruto.slice(1);
  const linhas = bruto.split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) throw new Error(`arquivo vazio: ${arquivo}`);
  const sep = separador(linhas[0]);
  const cabecalho = linhaCsv(linhas[0], sep);
  const dados = linhas.slice(1).map((l) => linhaCsv(l, sep));
  // Vírgula separando coluna e vírgula decimal no mesmo arquivo não tem como
  // desempatar: "0,0,98,1" é duas colunas ou quatro. Melhor parar do que chutar.
  if (sep === "," && dados.some((l) => l.length > cabecalho.length)) {
    throw new Error(
      `${path.basename(arquivo)} usa vírgula como separador de coluna e como vírgula decimal ao mesmo tempo.\n` +
      `  Reexporte do Studio escolhendo o CSV separado por ponto e vírgula, ou abra no editor e troque o separador.`
    );
  }
  return { cabecalho, dados, sep };
}

/**
 * Número da curva: vem entre 0 e 100, ou entre 0 e 1. Aqui o ponto é SEMPRE
 * decimal, porque nenhum valor da curva chega a mil. É a diferença que importa:
 * `br.numero("0.020")` devolve 20, tratando o ponto como milhar, e a curva
 * inteira sai deslocada. No funil, onde "12.400" impressões existe de verdade,
 * quem lê é o `br.numero`.
 */
function decimal(s) {
  if (typeof s === "number") return s;
  const t = String(s == null ? "" : s).trim().replace(/[%\s"]/g, "");
  if (!t) return NaN;
  if (t.includes(",")) return parseFloat(t.replace(/\./g, "").replace(",", "."));
  return parseFloat(t);
}

/** Acha a coluna pelo nome, aceitando PT-BR e inglês. Devolve o índice ou -1. */
function coluna(cabecalho, padroes) {
  for (const re of padroes) {
    const i = cabecalho.findIndex((c) => re.test(br.semAcento(c)));
    if (i >= 0) return i;
  }
  return -1;
}

// ─────────────────────────── curva ───────────────────────────

const COL_POSICAO = [/posicao.*(%|video|relativ)/, /^posicao/, /video position/, /^position/, /elapsed/, /tempo do video/, /^tempo/, /^time/];
const COL_ABSOLUTA = [/reten.*absolut/, /absolut.*reten/, /audiencewatchratio/, /^reten/, /audience retention/, /watch ratio/];
const COL_RELATIVA = [/reten.*relativ/, /relativ.*reten/, /relativeretention/];

/**
 * Transforma o CSV de retenção em pontos {seg, ret}.
 * Detecta sozinho se a posição vem em fração (0 a 1), em porcentagem (0 a 100)
 * ou já em segundo, e se a retenção vem em fração ou em porcentagem.
 */
function lerCurva(arquivo, duracaoSeg) {
  const { cabecalho, dados } = lerCsv(arquivo);
  const iPos = coluna(cabecalho, COL_POSICAO);
  const iAbs = coluna(cabecalho, COL_ABSOLUTA);
  const iRel = coluna(cabecalho, COL_RELATIVA);

  if (iPos < 0) {
    throw new Error(
      `não achei a coluna de posição em ${path.basename(arquivo)}.\n` +
      `  Colunas do arquivo: ${cabecalho.join(" | ")}\n` +
      `  Esperado algo como "Posição do vídeo (%)" ou "Video position (%)".`
    );
  }
  const iRet = iAbs >= 0 ? iAbs : iRel;
  if (iRet < 0) {
    throw new Error(
      `não achei a coluna de retenção em ${path.basename(arquivo)}.\n` +
      `  Colunas do arquivo: ${cabecalho.join(" | ")}\n` +
      `  Esperado algo como "Retenção absoluta do público (%)".`
    );
  }

  const cru = [];
  for (const linha of dados) {
    const p = decimal(linha[iPos]);
    const r = decimal(linha[iRet]);
    if (!isFinite(p) || !isFinite(r)) continue;
    cru.push({ p, r, rel: iRel >= 0 ? decimal(linha[iRel]) : null });
  }
  if (cru.length < 5) throw new Error(`só ${cru.length} pontos de curva legíveis — o CSV não parece ser o da retenção`);

  const maxP = Math.max(...cru.map((x) => x.p));
  const unidadePos = maxP <= 1.5 ? "fracao" : maxP <= 100.5 ? "porcento" : "segundo";
  // A unidade da retenção sai da MEDIANA, não do máximo: o `audienceWatchRatio`
  // pode passar de 1 no trecho que a audiência reviu (a própria documentação diz
  // isso — developers.google.com/youtube/analytics/metrics, conferido em
  // 23/09/2026). Um pico de replay em 1,6 fazia o máximo furar a régua de 1,5 e
  // a curva inteira era lida como 1,6% em vez de 160%.
  const fatorR = mediana(cru.map((x) => x.r)) <= 1.5 ? 100 : 1;
  if (unidadePos === "segundo" && maxP > duracaoSeg * 1.05) {
    throw new Error(
      `a coluna "${cabecalho[iPos]}" vai até ${maxP} e o vídeo tem ${Math.round(duracaoSeg)} segundos.\n` +
      `  Ou a --duracao está errada, ou essa coluna não é a posição no vídeo.`
    );
  }

  const pontos = cru
    .map((x) => ({
      seg: unidadePos === "segundo" ? x.p : (unidadePos === "fracao" ? x.p : x.p / 100) * duracaoSeg,
      ret: x.r * fatorR,
      rel: x.rel,
    }))
    .sort((a, b) => a.seg - b.seg);

  // tira posição repetida (export às vezes traz o 0 duas vezes)
  const limpos = [];
  for (const pt of pontos) {
    if (limpos.length && Math.abs(pt.seg - limpos[limpos.length - 1].seg) < 0.001) continue;
    limpos.push(pt);
  }
  return { pontos: limpos, unidadePos, temRelativa: iRel >= 0, colunaUsada: cabecalho[iRet] };
}

/** Retenção num segundo qualquer, por interpolação entre os dois pontos vizinhos. */
function retencaoEm(pontos, seg) {
  if (!pontos.length) return null;
  if (seg <= pontos[0].seg) return pontos[0].ret;
  const ult = pontos[pontos.length - 1];
  if (seg >= ult.seg) return ult.ret;
  for (let i = 1; i < pontos.length; i++) {
    if (pontos[i].seg >= seg) {
      const a = pontos[i - 1], b = pontos[i];
      const t = (seg - a.seg) / (b.seg - a.seg);
      return a.ret + t * (b.ret - a.ret);
    }
  }
  return ult.ret;
}

/** Primeiro segundo em que a curva cruza um valor, interpolado. null se nunca cruza. */
function cruzaEm(pontos, valor) {
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1], b = pontos[i];
    if (a.ret >= valor && b.ret < valor) {
      const t = (a.ret - valor) / (a.ret - b.ret);
      return a.seg + t * (b.seg - a.seg);
    }
  }
  return null;
}

/** Junta intervalos vizinhos que passam no teste num bloco só (a mesma queda). */
function agrupar(intervalos, passa) {
  const blocos = [];
  let atual = null;
  for (const x of intervalos) {
    if (passa(x)) {
      if (atual && Math.abs(x.de - atual.ate) < 0.01) { atual.ate = x.ate; atual.queda += x.queda; atual.partes++; }
      else { if (atual) blocos.push(atual); atual = { de: x.de, ate: x.ate, queda: x.queda, partes: 1 }; }
    } else if (atual) { blocos.push(atual); atual = null; }
  }
  if (atual) blocos.push(atual);
  for (const b of blocos) { b.dt = b.ate - b.de; b.taxa = (b.queda * 10) / b.dt; }
  return blocos;
}

function mediana(v) {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Analisa a curva: taxa de queda por intervalo, degrau, gancho, replay, sangria.
 * Tudo em pontos percentuais (pp). Taxa em pp por 10 segundos.
 */
function analisarCurva(pontos, duracaoSeg) {
  const intervalos = [];
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1], b = pontos[i];
    const dt = b.seg - a.seg;
    if (dt <= 0) continue;
    const queda = a.ret - b.ret;
    intervalos.push({ de: a.seg, ate: b.seg, dt, queda, taxa: (queda * 10) / dt });
  }
  if (!intervalos.length) throw new Error("curva sem intervalo mensurável");

  const depoisDoGancho = intervalos.filter((x) => x.de >= REGUA.ganchoAte);
  const base = depoisDoGancho.length >= 4 ? depoisDoGancho : intervalos;
  const taxas = base.map((x) => x.taxa);
  const medianaTaxa = mediana(taxas);
  const mediaTaxa = taxas.reduce((a, b) => a + b, 0) / taxas.length;
  const dp = Math.sqrt(taxas.reduce((a, b) => a + (b - mediaTaxa) ** 2, 0) / taxas.length);
  const coefVar = mediaTaxa ? dp / Math.abs(mediaTaxa) : 0;

  // O passo do CSV muda com a duração (100 pontos por vídeo, então 7,5 s num
  // vídeo de 12 min e 39 s num de 65 min). Por isso o piso do degrau é em pontos
  // perdidos dentro de um intervalo, convertido pra pp/10 s no passo deste
  // arquivo: piso fixo em pp/10 s desligava a detecção em vídeo longo.
  const passo = mediana(intervalos.map((x) => x.dt)) || 1;
  const pisoTaxa = (REGUA.degrauPontoMin * 10) / passo;
  const limiteTaxa = Math.max(REGUA.degrauFator * medianaTaxa, pisoTaxa);

  // Intervalo vizinho de queda forte é a MESMA queda: o CSV tem passo fixo e uma
  // saída de 20 segundos aparece em três linhas. Sem juntar, as "3 maiores quedas"
  // viravam três pedaços do mesmo gancho.
  const blocos = agrupar(intervalos, (x) => x.taxa >= limiteTaxa);
  const degraus = blocos.filter((b) => b.de >= REGUA.ganchoAte && b.queda >= REGUA.degrauQuedaMin).sort((a, b) => b.queda - a.queda);
  const blocoGancho = blocos.filter((b) => b.de < REGUA.ganchoAte);

  // Subida também vem fatiada: com passo de 7,5 s, um replay de 25 s aparece em
  // três linhas de +0,8 ponto cada. Testar linha por linha contra 1 ponto perdia
  // o pico inteiro, então o bloco é a subida contínua e a régua vale na soma.
  const replays = agrupar(intervalos, (x) => x.queda < 0)
    .map((x) => ({ ...x, subida: -x.queda }))
    .filter((x) => x.subida >= REGUA.replayMin)
    .sort((a, b) => b.subida - a.subida);

  // O export não começa no segundo zero: a dimensão vai de 0,01 a 1,0 e o valor é
  // o fim do intervalo (developers.google.com/youtube/analytics/dimensions,
  // conferido em 23/09/2026). Num vídeo de 12 min o primeiro ponto já é 0:07, e
  // chamar isso de "início" esconde a perda dos primeiros segundos. O número sai
  // com o segundo dele, e o laudo avisa quando o buraco é grande.
  const inicio = pontos[0].ret;
  const segInicio = pontos[0].seg;
  const r15 = retencaoEm(pontos, 15);
  const r30 = retencaoEm(pontos, REGUA.ganchoAte);
  const r60 = retencaoEm(pontos, 60);
  const fim = pontos[pontos.length - 1].ret;
  const perdaGancho = inicio - r30;
  const meiaVida = cruzaEm(pontos, 50);

  const perdidoEmDegrau = degraus.reduce((a, b) => a + b.queda, 0);
  const perdidoTotal = inicio - fim;
  const perdidoResto = Math.max(0, perdidoTotal - perdaGancho - perdidoEmDegrau);

  // As 3 maiores quedas saem de blocos, não de linhas soltas do CSV: o passo é
  // fixo, então uma saída de 25 s aparece em três linhas seguidas e a lista virava
  // três pedaços da mesma queda. O gancho entra como um bloco só.
  const candidatos = [
    // Bloco que começa no gancho mas varre os primeiros minutos não é gancho:
    // chamar de gancho manda o usuário cortar 12 segundos de um problema de 5 min.
    ...blocoGancho.map((b) => ({ ...b, tipo: b.ate <= REGUA.ganchoAte * 2 ? "gancho" : "queda longa no começo" })),
    ...degraus.map((b) => ({ ...b, tipo: "degrau" })),
  ];
  const cobertos = (x) => candidatos.some((c) => x.de >= c.de - 0.01 && x.ate <= c.ate + 0.01);
  // Queda solta só entra se for acima do padrão do próprio vídeo. Sem esse filtro
  // a lista de "maiores quedas" enchia de intervalo de 0,1 ponto em curva plana, e
  // em sangria linear devolvia três fatias iguais da mesma ladeira — sem nada pra
  // consertar em nenhuma delas.
  const sobra = intervalos
    .filter((x) => !cobertos(x) && x.taxa >= REGUA.sobraFator * medianaTaxa)
    .map((x) => ({ ...x, tipo: "acima do padrão do vídeo, sem chegar a degrau" }));
  const maiores = [...candidatos, ...sobra]
    .filter((x) => x.queda >= REGUA.quedaMin)
    .sort((a, b) => b.queda - a.queda)
    .slice(0, 3);

  const formas = [];
  if (perdaGancho >= REGUA.ganchoProblema) formas.push({ forma: "queda no gancho", peso: perdaGancho, nota: `${pp(perdaGancho)} pontos perdidos nos primeiros ${REGUA.ganchoAte} s` });
  else if (perdaGancho >= REGUA.ganchoAtencao) formas.push({ forma: "gancho em atenção", peso: perdaGancho, nota: `${pp(perdaGancho)} pontos perdidos nos primeiros ${REGUA.ganchoAte} s` });
  if (degraus.length) formas.push({ forma: "degrau", peso: perdidoEmDegrau, nota: `${degraus.length === 1 ? "uma queda" : degraus.length + " quedas"} fora do padrão do próprio vídeo, ${pp(perdidoEmDegrau)} pontos no total` });
  if (!degraus.length && coefVar < REGUA.sangriaCoefVar) formas.push({ forma: "sangria linear", peso: perdidoResto, nota: `queda constante de ${pp(medianaTaxa, 2)} pp a cada 10 s, sem degrau` });
  if (replays.length) formas.push({ forma: "pico de replay", peso: replays[0].subida, nota: `retenção sobe ${pp(replays[0].subida)} pontos em ${relogio(replays[0].de)}` });
  if (!formas.length && maiores.length) {
    const m = maiores[0];
    formas.push({ forma: "queda localizada", peso: m.queda, nota: `${pp(m.queda)} pontos entre ${relogio(m.de)} e ${relogio(m.ate)}, sem gancho furado e sem degrau na régua deste vídeo` });
  }
  if (!formas.length) formas.push({ forma: "curva limpa", peso: 0, nota: "sem gancho furado, sem degrau e sem queda constante acima da régua" });
  formas.sort((a, b) => b.peso - a.peso);

  return {
    duracaoSeg,
    pontos: pontos.length,
    passo,
    inicio, segInicio, r15, r30, r60, fim,
    perdaGancho, meiaVida,
    medianaTaxa, coefVar,
    limiteTaxa,
    perdidoTotal, perdidoEmDegrau, perdidoResto,
    intervalos, blocos, degraus, replays, formas, maiores,
  };
}

// ─────────────────────────── legenda ───────────────────────────

/** Lê .srt, .vtt ou .sbv e devolve [{de, ate, texto}]. */
function lerLegenda(arquivo) {
  let bruto = fs.readFileSync(arquivo, "utf8");
  if (bruto.charCodeAt(0) === 0xfeff) bruto = bruto.slice(1);
  const linhas = bruto.split(/\r?\n/);
  const cues = [];
  const RE_SETA = /^(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,3}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,3}:\d{2}[.,]\d{1,3})/;
  const RE_SBV = /^(\d{1,2}:\d{2}:\d{2}\.\d{1,3}),(\d{1,2}:\d{2}:\d{2}\.\d{1,3})\s*$/;

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].trim();
    let de = null, ate = null;
    const m1 = l.match(RE_SETA), m2 = l.match(RE_SBV);
    if (m1) { de = segundos(m1[1].replace(",", ".")); ate = segundos(m1[2].replace(",", ".")); }
    else if (m2) { de = segundos(m2[1]); ate = segundos(m2[2]); }
    if (de === null) continue;
    const texto = [];
    for (let j = i + 1; j < linhas.length; j++) {
      const t = linhas[j].trim();
      if (!t || RE_SETA.test(t) || RE_SBV.test(t) || /^\d+$/.test(t)) break;
      texto.push(t.replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, ""));
    }
    cues.push({ de, ate, texto: texto.join(" ").trim() });
  }
  if (!cues.length) throw new Error(`nenhuma marcação de tempo em ${path.basename(arquivo)} — .srt, .vtt e .sbv do Studio servem; texto solto não`);
  return cues.sort((a, b) => a.de - b.de);
}

/** O que estava sendo dito num segundo, com o trecho anterior e o seguinte. */
function falaEm(cues, seg, janela = 1) {
  let idx = -1;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].de <= seg) idx = i; else break;
  }
  if (idx < 0) idx = 0;
  const de = Math.max(0, idx - janela), ate = Math.min(cues.length - 1, idx + janela);
  return {
    principal: cues[idx],
    contexto: cues.slice(de, ate + 1),
  };
}

// ─────────────────────────── funil ───────────────────────────

const COL_IMPRESSOES = [/impress/];
const COL_CTR = [/taxa de clique/, /ctr/, /click.?through/];
const COL_VIEWS = [/visualiza/, /^views/];
const COL_MEDIA = [/duracao media/, /average view duration/, /tempo medio/];
const COL_PCT = [/porcentagem media/, /average percentage viewed/, /media assistida/];

/**
 * Lê o funil de UMA linha do CSV, e diz qual.
 *
 * O export da aba Alcance costuma vir com uma linha por dia mais a linha de total.
 * Pegar "o primeiro valor não vazio de cada coluna" misturava o dia 1 com o dia 2
 * e escrevia no laudo a impressão de um dia como se fosse a do vídeo. E somar não
 * resolve: impressão e visualização somam, CTR e duração média não. Então: usa a
 * linha de total quando ela existe, usa a única linha quando é só uma, e para
 * quando são várias sem total.
 */
function lerFunilCsv(arquivo) {
  const { cabecalho, dados } = lerCsv(arquivo);
  const uteis = dados.filter((l) => l.some((c) => String(c).trim() !== ""));
  if (!uteis.length) throw new Error(`${path.basename(arquivo)} tem cabeçalho e nenhuma linha de dado`);

  const ehTotal = (l) => /^(total|totais|total geral)$/.test(br.semAcento(String(l[0] || "")).trim());
  let linha = uteis.find(ehTotal);
  let deOndeVeio = "da linha de total";
  if (!linha) {
    if (uteis.length > 1) {
      throw new Error(
        `${path.basename(arquivo)} tem ${uteis.length} linhas de dado e nenhuma de total.\n` +
        `  Impressão e visualização somam, CTR e duração média não — somar daria número errado no laudo.\n` +
        `  No Studio, tire o detalhamento por data antes de exportar, ou passe os totais na mão:\n` +
        `  --impressoes 12.400 --ctr 3,8 --visualizacoes 470 --media 4:12`
      );
    }
    linha = uteis[0];
    deOndeVeio = "da única linha do arquivo";
  }

  const pega = (padroes) => {
    const i = coluna(cabecalho, padroes);
    if (i < 0) return null;
    const v = linha[i];
    return v !== undefined && String(v).trim() !== "" ? v : null;
  };
  return {
    impressoes: pega(COL_IMPRESSOES),
    ctr: pega(COL_CTR),
    visualizacoes: pega(COL_VIEWS),
    media: pega(COL_MEDIA),
    pctMedia: pega(COL_PCT),
    cabecalho,
    deOndeVeio,
  };
}

/**
 * Funil impressões → CTR → visualização → retenção, só com o que o Studio exporta.
 * Nada de "alcance estimado": o que não foi dado sai como null.
 */
function analisarFunil({ impressoes, ctr, visualizacoes, media, pctMedia, duracaoSeg, r30, inicio, deOndeVeio }) {
  const imp = impressoes == null ? null : br.numero(impressoes);
  const taxa = ctr == null ? null : br.numero(ctr);
  const views = visualizacoes == null ? null : br.numero(visualizacoes);
  const mediaSeg = media == null ? null : segundos(media);
  let pct = pctMedia == null ? null : br.numero(pctMedia);
  if (pct == null && mediaSeg != null && duracaoSeg) pct = (mediaSeg / duracaoSeg) * 100;

  const cliquesEsperados = imp != null && taxa != null ? (imp * taxa) / 100 : null;
  const ctrRecalculado = imp && views != null ? (views / imp) * 100 : null;
  const foraDeImpressao = cliquesEsperados != null && views != null ? views - cliquesEsperados : null;
  const horasExibicao = views != null && mediaSeg != null ? (views * mediaSeg) / 3600 : null;

  const avisos = [];
  let gargalo = "[a confirmar]";
  if (taxa != null && taxa < REGUA.ctrPiso) {
    gargalo = "antes do play: a miniatura e o título";
    avisos.push(`CTR de ${taxa.toLocaleString("pt-BR")}% está abaixo da faixa de ${REGUA.ctrPiso}% a ${REGUA.ctrTeto}% em que fica metade dos canais e vídeos do YouTube (support.google.com/youtube/answer/7628154, conferido em 23/09/2026)`);
  } else if (r30 != null && r30 < REGUA.r30Piso) {
    gargalo = `nos primeiros ${REGUA.ganchoAte} segundos: o gancho`;
    avisos.push(`${pp((inicio == null ? 100 : inicio) - r30)} pontos da audiência saem antes dos ${REGUA.ganchoAte} s`);
  } else if (pct != null && pct < REGUA.pctPiso) {
    gargalo = "no corpo do vídeo: o meio não paga o tempo";
    avisos.push(`porcentagem média assistida de ${pp(pct)}%`);
  } else if (taxa != null || pct != null) {
    gargalo = r30 == null
      ? "CTR e porcentagem assistida dentro da régua; a curva não foi lida nessa rodada"
      : "nenhuma das três etapas está fora da régua — o teto aqui é volume de impressão";
  }
  if (taxa != null && taxa > REGUA.ctrTeto && views != null && views < 200) {
    avisos.push("CTR alto com pouca visualização quase sempre é vídeo mostrado só pra quem já é inscrito");
  }
  if (foraDeImpressao != null && Math.abs(foraDeImpressao) > Math.max(20, 0.15 * (cliquesEsperados || 1))) {
    avisos.push(
      foraDeImpressao > 0
        ? `${Math.round(foraDeImpressao)} visualizações a mais do que as impressões explicam: a própria página do YouTube diz que site externo e tela final não entram na contagem de impressão (support.google.com/youtube/answer/7628154, conferido em 23/09/2026)`
        : `${Math.round(-foraDeImpressao)} visualizações a menos do que o CTR sugere: conferir se o período das duas tabelas é o mesmo`
    );
  }

  return { imp, taxa, views, mediaSeg, pct, cliquesEsperados, ctrRecalculado, foraDeImpressao, horasExibicao, gargalo, avisos, deOndeVeio };
}

// ─────────────────────────── saída em texto ───────────────────────────

function pp(n, casas = 1) {
  return n == null || !isFinite(n) ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function imprimirCurva(a, curva, cues) {
  console.log(`\nCURVA — ${a.pontos} pontos de ${pp(a.passo, 1)} s cada, duração ${relogio(a.duracaoSeg)} (coluna "${curva.colunaUsada}")\n`);
  console.log(`  no 1º ponto (${relogio(a.segInicio)})      ${pp(a.inicio)}%`);
  console.log(`  aos 15 s                ${pp(a.r15)}%`);
  console.log(`  aos ${REGUA.ganchoAte} s                ${pp(a.r30)}%   ${a.perdaGancho < 0
    ? "(acima do 1º ponto: trecho revisto no começo)"
    : `(perda no gancho: ${pp(a.perdaGancho)} pontos)`}`);
  console.log(`  a 1 min                 ${pp(a.r60)}%`);
  console.log(`  no fim                  ${pp(a.fim)}%`);
  console.log(`  meia-vida (50%)         ${a.meiaVida == null ? "não chega a 50% — bom sinal" : relogio(a.meiaVida)}`);
  console.log(`  sangria mediana         ${pp(a.medianaTaxa, 2)} pp a cada 10 s   (régua de degrau: ${pp(a.limiteTaxa, 2)} pp/10 s)`);
  if (a.segInicio > 5) {
    console.log(`\n  ⚠ o export começa em ${relogio(a.segInicio)}, não no segundo zero: a perda dos primeiros ${Math.round(a.segInicio)} segundos não está neste arquivo, e a perda no gancho aqui é medida do 1º ponto em diante.`);
  }
  if (a.passo > REGUA.ganchoAte) {
    console.log(`\n  ⚠ cada ponto do arquivo cobre ${pp(a.passo, 1)} s, mais que os ${REGUA.ganchoAte} s do gancho: a retenção aos 15 s e aos ${REGUA.ganchoAte} s sai interpolada dentro do primeiro intervalo, e o timestamp das quedas tem a precisão de um passo, não de um segundo.`);
  }

  console.log(`\n  Forma da curva:`);
  for (const f of a.formas) console.log(`    · ${f.forma} — ${f.nota}`);

  if (!a.maiores.length) {
    console.log(`\n  Nenhuma queda localizada: nenhum trecho perdeu ${REGUA.quedaMin} ponto ou mais acima do padrão do próprio vídeo. A perda é espalhada, e o conserto é de estrutura, não de timestamp.`);
  } else console.log(`\n  As maiores quedas (até 3):`);
  a.maiores.forEach((q, i) => {
    console.log(`    ${i + 1}. ${relogio(q.de)} → ${relogio(q.ate)}   −${pp(q.queda)} pontos   (${pp(q.taxa, 2)} pp/10 s, ${q.tipo})`);
    if (cues) {
      const f = falaEm(cues, q.de);
      console.log(`       falando: "${(f.principal.texto || "[sem legenda nesse trecho]").slice(0, 150)}"`);
    }
  });

  if (a.degraus.length) {
    console.log(`\n  Degraus (queda fora do padrão do próprio vídeo):`);
    for (const d of a.degraus) {
      console.log(`    · ${relogio(d.de)} → ${relogio(d.ate)}   −${pp(d.queda)} pontos   ${pp(d.taxa, 2)} pp/10 s`);
      if (cues) console.log(`      falando: "${(falaEm(cues, d.de).principal.texto || "[sem legenda]").slice(0, 150)}"`);
    }
  } else {
    console.log(`\n  Nenhum degrau: nenhuma queda passou de ${pp(a.limiteTaxa, 2)} pp/10 s com 2 pontos ou mais.`);
  }

  if (a.replays.length) {
    console.log(`\n  Picos de replay (a retenção sobe):`);
    for (const r of a.replays.slice(0, 5)) {
      console.log(`    · ${relogio(r.de)} → ${relogio(r.ate)}   +${pp(r.subida)} pontos`);
      if (cues) console.log(`      falando: "${(falaEm(cues, r.de).principal.texto || "[sem legenda]").slice(0, 150)}"`);
    }
  }

  console.log(`\n  Pontos perdidos: ${pp(a.perdidoTotal)} no total — ${pp(a.perdaGancho)} no gancho, ${pp(a.perdidoEmDegrau)} em degrau, ${pp(a.perdidoResto)} de sangria.`);
  if (curva.temRelativa) console.log(`  O arquivo traz retenção relativa: 0,5 é a mediana dos vídeos de duração parecida (developers.google.com/youtube/analytics/metrics).`);
  console.log("");
}

function imprimirFunil(f, duracaoSeg) {
  console.log(`\nFUNIL — duração ${relogio(duracaoSeg)}${f.deOndeVeio ? ` (números lidos ${f.deOndeVeio})` : ""}\n`);
  const l = (rotulo, valor) => console.log(`  ${rotulo.padEnd(30)}${valor}`);
  l("impressões", f.imp == null ? "[a confirmar]" : f.imp.toLocaleString("pt-BR"));
  l("CTR de impressões", f.taxa == null ? "[a confirmar]" : `${pp(f.taxa, 2)}%`);
  l("cliques que o CTR explica", f.cliquesEsperados == null ? "[a confirmar]" : Math.round(f.cliquesEsperados).toLocaleString("pt-BR"));
  l("visualizações", f.views == null ? "[a confirmar]" : f.views.toLocaleString("pt-BR"));
  l("CTR recalculado", f.ctrRecalculado == null ? "[a confirmar]" : `${pp(f.ctrRecalculado, 2)}%`);
  l("duração média assistida", f.mediaSeg == null ? "[a confirmar]" : relogio(f.mediaSeg));
  l("% média assistida", f.pct == null ? "[a confirmar]" : `${pp(f.pct)}%`);
  l("tempo de exibição", f.horasExibicao == null ? "[a confirmar]" : `${pp(f.horasExibicao)} h`);
  console.log(`\n  Gargalo: ${f.gargalo}`);
  for (const av of f.avisos) console.log(`    · ${av}`);
  console.log("");
}

// ─────────────────────────── markdown pra --saida ───────────────────────────

function markdownCurva(a, curva, cues, f) {
  const L = [];
  L.push(`<!-- gerado por scripts/retencao-video.js — não editar os números à mão -->`);
  L.push(``, `## A curva em números`, ``);
  // Nenhuma tabela daqui é soma de coluna: são leituras de pontos diferentes da
  // mesma curva. Por isso a conferência desta saída é `verificar.js texto`, e não
  // `tabela`, que leria "38,8 pontos" como total declarado da coluna ao lado.
  L.push(`Perda no gancho: **${pp(a.perdaGancho)} pontos** nos primeiros ${REGUA.ganchoAte} s. Meia-vida: **${a.meiaVida == null ? "não chega a 50%" : relogio(a.meiaVida)}**. Sangria mediana: **${pp(a.medianaTaxa, 2)} pp a cada 10 s**. Curva lida em ${a.pontos} pontos de ${pp(a.passo, 1)} s cada.`, ``);
  if (a.segInicio > 5) L.push(`> O export começa em ${relogio(a.segInicio)}, não no segundo zero: a perda dos primeiros ${Math.round(a.segInicio)} segundos não está no arquivo.`, ``);
  if (a.passo > REGUA.ganchoAte) L.push(`> Cada ponto cobre ${pp(a.passo, 1)} s, mais que os ${REGUA.ganchoAte} s do gancho: a leitura aos 15 s e aos ${REGUA.ganchoAte} s é interpolada, e o timestamp das quedas tem a precisão de um passo.`, ``);
  L.push(`| Ponto | Retenção |`, `|---|---|`);
  L.push(`| 1º ponto (${relogio(a.segInicio)}) | ${pp(a.inicio)}% |`);
  L.push(`| 15 s | ${pp(a.r15)}% |`);
  L.push(`| ${REGUA.ganchoAte} s | ${pp(a.r30)}% |`);
  L.push(`| 1 min | ${pp(a.r60)}% |`);
  L.push(`| Fim (${relogio(a.duracaoSeg)}) | ${pp(a.fim)}% |`);
  L.push(``, `Forma da curva: ${a.formas.map((x) => `**${x.forma}**`).join(", ")}.`);
  for (const x of a.formas) L.push(`- **${x.forma}** — ${x.nota}`);
  L.push(``, `## As quedas, por segundo`, ``);
  if (!a.maiores.length) {
    L.push(`Nenhuma queda localizada: nenhum trecho perdeu ${REGUA.quedaMin} ponto ou mais acima do padrão do próprio vídeo. A perda é espalhada ao longo do vídeo, e o conserto é de estrutura (duração, ordem dos blocos), não de timestamp.`, ``);
  }
  L.push(`| # | De | Até | Pontos perdidos | Taxa (pp/10 s) | Tipo | O que estava sendo dito |`);
  L.push(`|---|---|---|---|---|---|---|`);
  a.maiores.forEach((q, i) => {
    const fala = cues ? (falaEm(cues, q.de).principal.texto || "[sem legenda]").replace(/\|/g, "/").slice(0, 120) : "[sem legenda carregada]";
    L.push(`| ${i + 1} | ${relogio(q.de)} | ${relogio(q.ate)} | ${pp(q.queda)} | ${pp(q.taxa, 2)} | ${q.tipo} | ${fala} |`);
  });
  if (a.replays.length) {
    L.push(``, `## Picos de replay`, ``);
    L.push(`| Em | Sobe | O que estava sendo dito |`, `|---|---|---|`);
    for (const r of a.replays.slice(0, 5)) {
      const fala = cues ? (falaEm(cues, r.de).principal.texto || "[sem legenda]").replace(/\|/g, "/").slice(0, 120) : "[sem legenda carregada]";
      L.push(`| ${relogio(r.de)} | +${pp(r.subida)} | ${fala} |`);
    }
  }
  if (f) {
    L.push(``, `## O funil, só com o que o Studio exporta`, ``);
    if (f.deOndeVeio) L.push(`Números lidos ${f.deOndeVeio} do export da aba Alcance.`, ``);
    L.push(`| Etapa | Número |`, `|---|---|`);
    L.push(`| Impressões | ${f.imp == null ? "[a confirmar]" : f.imp.toLocaleString("pt-BR")} |`);
    L.push(`| CTR de impressões | ${f.taxa == null ? "[a confirmar]" : pp(f.taxa, 2) + "%"} |`);
    L.push(`| Cliques que o CTR explica | ${f.cliquesEsperados == null ? "[a confirmar]" : Math.round(f.cliquesEsperados).toLocaleString("pt-BR")} |`);
    L.push(`| Visualizações | ${f.views == null ? "[a confirmar]" : f.views.toLocaleString("pt-BR")} |`);
    L.push(`| Duração média assistida | ${f.mediaSeg == null ? "[a confirmar]" : relogio(f.mediaSeg)} |`);
    L.push(`| % média assistida | ${f.pct == null ? "[a confirmar]" : pp(f.pct) + "%"} |`);
    L.push(``, `Gargalo: **${f.gargalo}**`);
    for (const av of f.avisos) L.push(`- ${av}`);
  }
  L.push(``);
  return L.join("\n");
}

// ─────────────────────────── linha de comando ───────────────────────────

function argumentos(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const chave = a.slice(2);
      const prox = argv[i + 1];
      if (prox === undefined || prox.startsWith("--")) o[chave] = true;
      else { o[chave] = prox; i++; }
    } else o._.push(a);
  }
  return o;
}

function ajuda() {
  console.log(`
Contex OS — retencao-video.js

  node scripts/retencao-video.js curva <retencao.csv> --duracao 12:34 [--legenda aula.srt] [--alcance alcance.csv]
  node scripts/retencao-video.js funil <alcance.csv> --duracao 12:34
  node scripts/retencao-video.js funil --impressoes 12.400 --ctr 3,8 --visualizacoes 470 --duracao 12:34 --media 4:12
  node scripts/retencao-video.js legenda <aula.srt> --em 1:47

  --duracao   duração total do vídeo (mm:ss ou hh:mm:ss)  · obrigatória em curva e funil
  --legenda   .srt, .sbv ou .vtt baixado do Studio
  --alcance   CSV da aba Alcance: fecha o funil no mesmo comando da curva
  --saida     grava as tabelas em markdown
  --pct       porcentagem média assistida, quando o export não trouxer
  --json      laudo em JSON

  O CSV da aba Alcance precisa vir com a linha de total (sem detalhamento por data).
`);
}

/** Flag que exige caminho/valor: `--saida` sozinho virava true e não gravava nada. */
function valor(o, chave, dica) {
  if (o[chave] === undefined) return null;
  if (o[chave] === true) morrer(`--${chave} precisa vir com o valor depois`, dica);
  return String(o[chave]);
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function main() {
  const o = argumentos(process.argv.slice(2));
  const comando = o._[0];
  if (!comando || o.ajuda || o.help) { ajuda(); process.exit(comando ? 0 : 1); }

  if (comando === "legenda") {
    const arquivo = o._[1];
    if (!arquivo) morrer("falta o arquivo de legenda", "node scripts/retencao-video.js legenda aula.srt --em 1:47");
    if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);
    const seg = segundos(valor(o, "em", "exemplo: --em 1:47"));
    if (seg === null) morrer("falta --em com o segundo", 'exemplo: --em 1:47');
    let cues;
    try { cues = lerLegenda(arquivo); } catch (e) { morrer(e.message); }
    const f = falaEm(cues, seg, 2);
    console.log(`\nEm ${relogio(seg)}:\n`);
    for (const c of f.contexto) {
      const marca = c === f.principal ? "→" : " ";
      console.log(`  ${marca} ${relogio(c.de)}  ${c.texto}`);
    }
    console.log("");
    return;
  }

  const duracaoSeg = segundos(valor(o, "duracao", "exemplo: --duracao 12:34"));
  if (duracaoSeg === null || duracaoSeg <= 0) {
    morrer("falta --duracao com a duração total do vídeo", 'exemplo: --duracao 12:34 (o Studio mostra na página do vídeo)');
  }

  if (comando === "funil") {
    const arquivo = o._[1];
    let entrada = { duracaoSeg };
    if (arquivo) {
      if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);
      try { Object.assign(entrada, lerFunilCsv(arquivo)); } catch (e) { morrer(e.message); }
    }
    for (const [chave, campo] of [["impressoes", "impressoes"], ["ctr", "ctr"], ["visualizacoes", "visualizacoes"], ["media", "media"], ["pct", "pctMedia"]]) {
      const v = valor(o, chave, `exemplo: --${chave} <valor>`);
      if (v !== null) entrada[campo] = v;
    }
    if (entrada.impressoes == null && entrada.visualizacoes == null) {
      morrer(
        "nada de funil pra ler: nem CSV com coluna de impressão nem --impressoes",
        "o CSV é o export da aba Alcance do Studio; ou passe --impressoes, --ctr, --visualizacoes e --media"
      );
    }
    const f = analisarFunil(entrada);
    if (o.json) { console.log(JSON.stringify(f, null, 2)); return; }
    imprimirFunil(f, duracaoSeg);
    return;
  }

  if (comando !== "curva") morrer(`comando desconhecido: ${comando}`, "os comandos são: curva, funil, legenda");

  const arquivo = o._[1];
  if (!arquivo) morrer("falta o CSV da retenção", "node scripts/retencao-video.js curva retencao.csv --duracao 12:34");
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);

  // Toda flag conferida antes de ler arquivo: erro de digitação aparecendo depois
  // do laudo inteiro impresso faz o usuário achar que a análise saiu.
  const arqLegenda = valor(o, "legenda", "exemplo: --legenda dados/aula.srt");
  const arqAlcance = valor(o, "alcance", "exemplo: --alcance dados/alcance.csv");
  const arqSaida = valor(o, "saida", "exemplo: --saida conteudo/retencao/dados.md");
  for (const f of [arqLegenda, arqAlcance]) if (f && !fs.existsSync(f)) morrer(`não achei ${f}`);

  let curva, analise;
  try {
    curva = lerCurva(arquivo, duracaoSeg);
    analise = analisarCurva(curva.pontos, duracaoSeg);
  } catch (e) { morrer(e.message); }

  let cues = null;
  if (arqLegenda) {
    try { cues = lerLegenda(arqLegenda); } catch (e) { morrer(e.message); }
    const ultima = cues[cues.length - 1];
    const fim = ultima.ate || ultima.de;
    if (fim < duracaoSeg * 0.5) {
      console.error(`\n⚠ a legenda termina em ${relogio(fim)} e o vídeo tem ${relogio(duracaoSeg)} — confira se é a legenda certa.\n`);
    }
  }

  let funil = null;
  if (o.impressoes || o.ctr || o.visualizacoes || o.media || arqAlcance) {
    let entrada = { duracaoSeg, r30: analise.r30, inicio: analise.inicio };
    if (arqAlcance) {
      try { Object.assign(entrada, lerFunilCsv(arqAlcance)); } catch (e) { morrer(e.message); }
    }
    for (const [chave, campo] of [["impressoes", "impressoes"], ["ctr", "ctr"], ["visualizacoes", "visualizacoes"], ["media", "media"], ["pct", "pctMedia"]]) {
      const v = valor(o, chave, `exemplo: --${chave} <valor>`);
      if (v !== null) entrada[campo] = v;
    }
    funil = analisarFunil(entrada);
  }

  if (o.json) {
    console.log(JSON.stringify({ curva: { ...curva, pontos: curva.pontos.length }, analise, funil }, null, 2));
    return;
  }

  imprimirCurva(analise, curva, cues);
  if (funil) imprimirFunil(funil, duracaoSeg);

  if (arqSaida) {
    fs.mkdirSync(path.dirname(path.resolve(arqSaida)), { recursive: true });
    fs.writeFileSync(arqSaida, markdownCurva(analise, curva, cues, funil), "utf8");
    console.log(`✓ tabelas gravadas em ${arqSaida}\n`);
  }
}

module.exports = {
  segundos, relogio, lerCsv, decimal, coluna, valor, lerCurva, retencaoEm, cruzaEm, mediana,
  analisarCurva, lerLegenda, falaEm, lerFunilCsv, analisarFunil, markdownCurva, REGUA,
};

if (require.main === module) main();
