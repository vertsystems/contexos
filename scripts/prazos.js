#!/usr/bin/env node
/**
 * Contex OS — prazos.js
 * Calcula as datas-limite de troca, devolução e conserto de um produto vendido
 * ao consumidor, pra responder no WhatsApp com a data certa em vez de "uns dias".
 *
 * Existe porque o dono da loja mistura três prazos que a lei separa: os 7 dias
 * de arrependimento (CDC art. 49) valem só pra compra fora da loja; os 30 ou 90
 * dias de garantia legal (art. 26) valem pra defeito, em qualquer canal; e os 30
 * dias pra consertar (art. 18, § 1º) começam quando o cliente reclama, não quando
 * ele comprou. Troca por gosto (número, cor, "não gostei") não tem prazo em lei:
 * é o que a loja prometeu, e se prometeu, obriga (art. 30 e 35).
 *
 * Uso:
 *   node scripts/prazos.js --compra DD/MM/AAAA --canal <canal> --tipo <tipo> [opções]
 *
 * Canal (onde a venda fechou):
 *   loja        no balcão, presencial: não tem arrependimento de 7 dias
 *   online      site, marketplace, WhatsApp, Instagram, telefone: tem
 *   domicilio   vendedor foi até o cliente, porta a porta: tem
 *
 * Tipo de produto:
 *   duravel      roupa, calçado, móvel, eletrônico, joia: 90 dias de garantia legal
 *   nao-duravel  alimento, cosmético, flor, material de consumo: 30 dias
 *
 * Opções:
 *   --recebimento DD/MM/AAAA   dia da entrega efetiva. Vale em QUALQUER canal, não só online:
 *                              a garantia legal conta da entrega (art. 26, § 1º), então sofá
 *                              comprado no balcão e entregue duas semanas depois conta da entrega.
 *                              Sem ela, o script usa a data da compra
 *   --reclamacao DD/MM/AAAA    dia em que o cliente reclamou do defeito: dispara os 30 dias de conserto
 *   --politica <dias>          prazo de troca por gosto que a loja anuncia (placa, etiqueta, site)
 *   --politica-de <origem>     de onde o prazo da política conta: "compra" ou "recebimento".
 *                              Padrão: recebimento fora da loja, compra no balcão. Importa porque
 *                              a promessa obriga nos termos anunciados: "30 dias da compra" e
 *                              "30 dias de quando você receber" dão datas diferentes
 *   --garantia <dias>          garantia contratual da loja ou do fabricante, além da legal
 *                              (art. 50), contada da entrega. É o que responde "quebrou depois
 *                              de 4 meses" quando os 90 dias já passaram
 *   --hoje DD/MM/AAAA          data de referência pra dizer se cada prazo está aberto (padrão: hoje)
 *   --feriado DD/MM            feriado local (repetir pra cada um); muda só a coluna "aceitar até"
 *   --json                     imprime em JSON, pra outra ferramenta ler
 *   --saida <arquivo>          grava em arquivo em vez de imprimir (markdown, ou JSON com --json)
 *
 * Como conta: dias corridos, sem o dia do começo e com o do vencimento (Código
 * Civil, art. 132). Se o último dia cai em sábado, domingo ou feriado, a coluna
 * "aceitar até" empurra pro dia útil seguinte (art. 132, § 1º): é a data segura
 * pra loja honrar, e a que vai na resposta ao cliente.
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const CANAIS = { loja: "na loja", online: "fora da loja (site, WhatsApp, marketplace, telefone)", domicilio: "fora da loja (a domicílio)" };
const TIPOS = { duravel: 90, "nao-duravel": 30 };
const ORIGENS = { compra: "compra", recebimento: "recebimento" };
const FONTE_CDC = "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm";
const FONTE_CC = "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm";
const FONTE_DECRETO = "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm";

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Só --feriado aceita repetição; as outras opções são de valor único. */
const REPETIVEL = new Set(["feriado"]);

/** Lê "--chave valor" e "--flag". --feriado repetido vira lista. */
function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2);
    const prox = argv[i + 1];
    const v = prox !== undefined && !prox.startsWith("--") ? argv[++i] : true;
    if (o[k] === undefined) o[k] = v;
    else if (REPETIVEL.has(k)) o[k] = [].concat(o[k], v);
    else morrer(`--${k} apareceu mais de uma vez`, "cada opção entra uma vez só; --feriado é a única que repete");
  }
  return o;
}

/** Data-limite de um prazo em dias corridos, com a versão empurrada pra dia útil. */
function limite(inicio, dias, feriados) {
  const vence = br.mais(inicio, dias);
  const { data: aceitar, motivo } = br.proximoUtil(vence, feriados);
  return { vence, aceitar, motivo };
}

/** "dentro do prazo (faltam 3 dias)" ou "venceu há 12 dias", medido contra a data segura. */
function situacao(aceitar, hoje) {
  const n = br.diasEntre(hoje, aceitar);
  if (n > 0) return { aberto: true, texto: `dentro do prazo (faltam ${n} dia${n === 1 ? "" : "s"})` };
  if (n === 0) return { aberto: true, texto: "vence hoje" };
  return { aberto: false, texto: `venceu há ${-n} dia${n === -1 ? "" : "s"}` };
}

/**
 * Calcula todos os prazos de uma venda. Entradas: objetos Date (ou string que
 * br.lerData aceita) e strings de canal/tipo. Devolve { linhas, avisos, entrada }.
 */
function calcularPrazos({ compra, recebimento, canal, tipo, reclamacao, politica, politicaDe, garantia, hoje, feriados = [] }) {
  const dCompra = br.lerData(compra);
  if (!dCompra) throw new Error(`data de compra inválida: "${compra}" (use DD/MM/AAAA)`);
  const dReceb = recebimento ? br.lerData(recebimento) : dCompra;
  if (!dReceb) throw new Error(`data de recebimento inválida: "${recebimento}" (use DD/MM/AAAA)`);
  if (dReceb < dCompra) throw new Error(`recebimento (${br.fmt(dReceb)}) antes da compra (${br.fmt(dCompra)}): confira as datas`);
  if (!CANAIS[canal]) throw new Error(`canal "${canal}" não existe: use loja, online ou domicilio`);
  if (!TIPOS[tipo]) throw new Error(`tipo "${tipo}" não existe: use duravel ou nao-duravel`);
  const dHoje = hoje ? br.lerData(hoje) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  if (!dHoje) throw new Error(`data de hoje inválida: "${hoje}"`);
  let dRecl = null;
  if (reclamacao) {
    dRecl = br.lerData(reclamacao);
    if (!dRecl) throw new Error(`data da reclamação inválida: "${reclamacao}"`);
    if (dRecl < dReceb) throw new Error(`reclamação (${br.fmt(dRecl)}) antes do recebimento (${br.fmt(dReceb)}): confira as datas`);
  }
  let nPolitica = null;
  if (politica !== undefined && politica !== null && politica !== false) {
    nPolitica = br.numero(politica);
    if (!Number.isInteger(nPolitica) || nPolitica < 0) throw new Error(`--politica precisa ser um número inteiro de dias: "${politica}"`);
  }
  let nGarantia = null;
  if (garantia !== undefined && garantia !== null && garantia !== false) {
    nGarantia = br.numero(garantia);
    if (!Number.isInteger(nGarantia) || nGarantia <= 0) throw new Error(`--garantia precisa ser um número inteiro de dias maior que zero: "${garantia}"`);
  }
  // fora da loja o cliente recebe depois, e contar da compra encurtaria o prazo dele
  const origem = politicaDe === undefined || politicaDe === null || politicaDe === false
    ? (canal === "loja" ? "compra" : "recebimento")
    : String(politicaDe);
  if (!ORIGENS[origem]) throw new Error(`--politica-de "${politicaDe}" não existe: use compra ou recebimento`);

  const linhas = [];
  const avisos = [];
  const foraDaLoja = canal !== "loja";

  // 1. arrependimento — só fora da loja
  if (foraDaLoja) {
    const l = limite(dReceb, 7, feriados);
    linhas.push({
      direito: "Arrependimento (desistir sem motivo)",
      base: "CDC art. 49",
      obrigatorio: true,
      inicio: dReceb, inicioRotulo: `recebimento ${br.fmt(dReceb)}`,
      dias: 7, ...l, situacao: situacao(l.aceitar, dHoje),
      nota: "devolver tudo que ele pagou, inclusive frete; a loja paga a devolução",
    });
  } else {
    linhas.push({
      direito: "Arrependimento (desistir sem motivo)",
      base: "CDC art. 49",
      obrigatorio: false,
      inicio: null, inicioRotulo: "não se aplica: venda na loja",
      dias: 0, vence: null, aceitar: null, motivo: null, situacao: { aberto: false, texto: "não existe nesse canal" },
      nota: "compra no balcão não tem os 7 dias; o que vale é a política da loja",
    });
  }

  // 2. garantia legal — vício aparente
  {
    const dias = TIPOS[tipo];
    const l = limite(dReceb, dias, feriados);
    linhas.push({
      direito: `Garantia legal (defeito, produto ${tipo === "duravel" ? "durável" : "não durável"})`,
      base: "CDC art. 26",
      obrigatorio: true,
      inicio: dReceb, inicioRotulo: `entrega ${br.fmt(dReceb)}`,
      dias, ...l, situacao: situacao(l.aceitar, dHoje),
      nota: "defeito escondido conta de quando aparece (art. 26, § 3º); reclamação por escrito trava o prazo (§ 2º)",
    });
  }

  // 3. conserto — 30 dias a partir da reclamação
  if (dRecl) {
    const l = limite(dRecl, 30, feriados);
    linhas.push({
      direito: "Conserto do defeito",
      base: "CDC art. 18, § 1º",
      obrigatorio: true,
      inicio: dRecl, inicioRotulo: `reclamação ${br.fmt(dRecl)}`,
      dias: 30, ...l, situacao: situacao(l.aceitar, dHoje),
      nota: "passou disso, o cliente escolhe: produto novo, dinheiro de volta corrigido ou abatimento",
    });
    const legal = linhas[1];
    if (dRecl > legal.aceitar) {
      const dentroDaContratual = nGarantia !== null && dRecl <= limite(dReceb, nGarantia, feriados).aceitar;
      if (dentroDaContratual) avisos.push(`a reclamação (${br.fmt(dRecl)}) veio depois do fim da garantia legal (${br.fmt(legal.aceitar)}), mas dentro da garantia contratual de ${nGarantia} dias: a loja responde pelos termos que prometeu (art. 50)`);
      else avisos.push(`a reclamação (${br.fmt(dRecl)}) veio depois do fim da garantia legal (${br.fmt(legal.aceitar)}): só há obrigação se for defeito oculto (art. 26, § 3º) ou se houver garantia contratual da loja ou do fabricante ainda aberta (art. 50) — rodar de novo com --garantia <dias> pra ver a data`);
    }
  } else {
    const l = limite(dHoje, 30, feriados);
    linhas.push({
      direito: "Conserto do defeito",
      base: "CDC art. 18, § 1º",
      obrigatorio: true,
      inicio: null, inicioRotulo: "começa no dia em que o cliente reclamar",
      dias: 30, vence: null, aceitar: null, motivo: null,
      situacao: { aberto: null, texto: `se reclamar hoje (${br.fmt(dHoje)}), vence ${br.fmt(l.aceitar)}` },
      nota: "rodar de novo com --reclamacao quando a reclamação chegar",
    });
  }

  // 4. política da loja (liberalidade que virou obrigação)
  if (nPolitica !== null) {
    const dInicio = origem === "compra" ? dCompra : dReceb;
    const l = limite(dInicio, nPolitica, feriados);
    linhas.push({
      direito: "Troca por gosto (política da loja)",
      base: "CDC art. 30 e 35",
      obrigatorio: true,
      inicio: dInicio, inicioRotulo: `${origem} ${br.fmt(dInicio)}`,
      dias: nPolitica, ...l, situacao: situacao(l.aceitar, dHoje),
      nota: `${nPolitica} dias contados da ${origem}, como a loja anunciou. Não é lei, é promessa: e promessa anunciada obriga nas condições anunciadas`,
    });
  } else {
    linhas.push({
      direito: "Troca por gosto (política da loja)",
      base: "CDC art. 30 e 35",
      obrigatorio: false,
      inicio: null, inicioRotulo: "nenhuma política informada",
      dias: 0, vence: null, aceitar: null, motivo: null,
      situacao: { aberto: false, texto: "sem obrigação; a loja decide caso a caso" },
      nota: "se a loja anuncia prazo de troca, rodar com --politica <dias>",
    });
  }

  // 5. garantia contratual — só aparece quando a loja tem uma
  if (nGarantia !== null) {
    const l = limite(dReceb, nGarantia, feriados);
    linhas.push({
      direito: "Garantia contratual (da loja ou do fabricante)",
      base: "CDC art. 50",
      obrigatorio: true,
      inicio: dReceb, inicioRotulo: `entrega ${br.fmt(dReceb)}`,
      dias: nGarantia, ...l, situacao: situacao(l.aceitar, dHoje),
      nota: "complementa a legal, não substitui; vale nos termos do que a loja entregou por escrito (art. 50). Fora dela, o caminho é a assistência do fabricante",
    });
    if (nGarantia <= TIPOS[tipo]) avisos.push(`a garantia contratual de ${nGarantia} dias não passa da legal de ${TIPOS[tipo]} dias: anunciar isso como vantagem não acrescenta nada ao cliente`);
  }

  if (canal === "online" && !recebimento) avisos.push("venda fora da loja sem --recebimento: os prazos foram contados da compra. O certo é contar da entrega efetiva, tanto no arrependimento (art. 49) quanto na garantia legal (art. 26, § 1º): rodar de novo com --recebimento antes de responder ao cliente");

  return { entrada: { compra: dCompra, recebimento: dReceb, canal, tipo, reclamacao: dRecl, politica: nPolitica, politica_de: nPolitica === null ? null : origem, garantia: nGarantia, hoje: dHoje, feriados }, linhas, avisos };
}

function diaFmt(d) { return d ? `${br.fmt(d)} (${br.diaSemana(d)})` : "—"; }

function markdown(r) {
  const e = r.entrada;
  const out = [];
  out.push(`# Prazos — compra em ${br.fmt(e.compra)}, ${CANAIS[e.canal]}, produto ${e.tipo === "duravel" ? "durável" : "não durável"}`);
  out.push("");
  out.push(`> Referência: hoje é ${diaFmt(e.hoje)}. Dias corridos, sem o dia do começo e com o do vencimento (Código Civil, art. 132). "Aceitar até" empurra pra dia útil quando o vencimento cai em fim de semana ou feriado (art. 132, § 1º): é a data pra responder ao cliente.`);
  out.push("");
  out.push("| Direito | Base | Obrigatório? | Conta de | Vence em | Aceitar até | Situação |");
  out.push("|---|---|---|---|---|---|---|");
  for (const l of r.linhas) {
    // só a coluna "Aceitar até" leva o dia da semana: duas datas com dia na mesma
    // linha confundem o `verificar.js datas`, que pareia o dia com a data vizinha
    const aceitar = l.aceitar ? diaFmt(l.aceitar) + (l.motivo ? `, empurrado: ${l.motivo}` : "") : "—";
    out.push(`| ${l.direito} | ${l.base} | ${l.obrigatorio ? "sim" : "não"} | ${l.inicioRotulo} | ${l.vence ? br.fmt(l.vence) : "—"} | ${aceitar} | ${l.situacao.texto} |`);
  }
  out.push("");
  out.push("## O que cada linha significa");
  for (const l of r.linhas) out.push(`- **${l.direito}** — ${l.nota}`);
  if (r.avisos.length) {
    out.push("");
    out.push("## Atenção");
    for (const a of r.avisos) out.push(`- ${a}`);
  }
  out.push("");
  out.push(`Fontes: [CDC, Lei 8.078/1990](${FONTE_CDC}) art. 18, 26, 30, 35, 49 e 50; [Decreto 7.962/2013](${FONTE_DECRETO}) art. 5º; [Código Civil, art. 132](${FONTE_CC}). Conferidos em 22/09/2026. Não substitui advogado.`);
  return out.join("\n") + "\n";
}

function json(r) {
  const s = (d) => (d ? br.iso(d) : null);
  return JSON.stringify({
    entrada: { ...r.entrada, compra: s(r.entrada.compra), recebimento: s(r.entrada.recebimento), reclamacao: s(r.entrada.reclamacao), hoje: s(r.entrada.hoje) },
    prazos: r.linhas.map((l) => ({
      direito: l.direito, base: l.base, obrigatorio: l.obrigatorio, dias: l.dias,
      inicio: s(l.inicio), vence: s(l.vence), aceitar_ate: s(l.aceitar), empurrado_por: l.motivo,
      aberto: l.situacao.aberto, situacao: l.situacao.texto, nota: l.nota,
    })),
    avisos: r.avisos,
    fontes: [FONTE_CDC, FONTE_DECRETO, FONTE_CC],
    conferido_em: "2026-09-22",
  }, null, 2) + "\n";
}

function ajuda() {
  console.log(fs.readFileSync(__filename, "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ""));
}

function main() {
  const o = args(process.argv.slice(2));
  if (!process.argv.slice(2).length || o.ajuda || o.help) { ajuda(); process.exit(0); }
  if (!o.compra || o.compra === true) morrer("falta --compra DD/MM/AAAA", "ex.: node scripts/prazos.js --compra 10/09/2026 --canal online --tipo duravel --recebimento 15/09/2026");
  if (!o.canal || o.canal === true) morrer("falta --canal (loja, online ou domicilio)");
  if (!o.tipo || o.tipo === true) morrer("falta --tipo (duravel ou nao-duravel)");
  if (o["politica-de"] && !o.politica) morrer("--politica-de sem --politica", "a origem só faz sentido junto com o prazo: --politica 30 --politica-de compra");
  const feriados = [].concat(o.feriado || []).filter((f) => f !== true);
  for (const f of feriados) if (!/^\d{2}\/\d{2}$/.test(f)) morrer(`feriado "${f}" fora do formato DD/MM`);

  let r;
  try {
    r = calcularPrazos({
      compra: o.compra, recebimento: o.recebimento === true ? null : o.recebimento, canal: o.canal, tipo: o.tipo,
      reclamacao: o.reclamacao === true ? null : o.reclamacao, politica: o.politica === true ? null : o.politica,
      politicaDe: o["politica-de"] === true ? null : o["politica-de"], garantia: o.garantia === true ? null : o.garantia,
      hoje: o.hoje === true ? null : o.hoje, feriados,
    });
  } catch (e) {
    morrer(e.message);
  }

  const texto = o.json ? json(r) : markdown(r);
  if (o.saida && o.saida !== true) {
    fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
    fs.writeFileSync(o.saida, texto);
    console.log(`✔ ${o.json ? "JSON" : "markdown"} gravado em ${o.saida}`);
  } else {
    process.stdout.write(texto);
  }
  if (r.avisos.length && !o.json) console.error(`\n⚠ ${r.avisos.length} aviso(s) no fim do arquivo`);
}

module.exports = { calcularPrazos, limite, situacao, markdown, json, CANAIS, TIPOS, ORIGENS };

if (require.main === module) main();
