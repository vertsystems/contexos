#!/usr/bin/env node
/**
 * Contex OS — lancamento.js
 * Calcula o calendário de um lançamento e a conta da meta, por comando.
 *
 * Existe porque data contada de cabeça sai errada: "abre terça, dia 13" cai
 * na quarta, o fechamento cai num feriado, e o "D-7" vira D-6 quando o mês
 * tem 30 dias. E porque meta de lançamento é uma conta (lista × conversão),
 * não um desejo. Tudo aqui é aritmética com Date e número; nada é estimado.
 *
 * Uso:
 *   node scripts/lancamento.js datas --abre AAAA-MM-DD --fecha AAAA-MM-DD [--tipo interno]
 *   node scripts/lancamento.js meta --lista 1200 --conversao 1,5 --ticket 497
 *   node scripts/lancamento.js meta --vendas 30 --conversao 1,5 [--ticket 497]
 *
 * Opções de `datas`:
 *   --tipo <semente|interno|externo|perpetuo|relampago>   marcos do tipo (padrão: interno)
 *   --pre <dias>       tamanho do pré em dias, se quiser sobrepor o padrão do tipo
 *   --uteis            puxa pro dia útil anterior o marco que cair em fim de semana
 *                      ou feriado nacional (abertura, fechamento e véspera ficam onde estão)
 *   --md <arquivo>     grava a tabela no arquivo em vez de só imprimir
 *
 * Opções de `meta`:
 *   --conversao <pct>  taxa da lista que compra, em %, aceita vírgula ("1,5")
 *   --ticket <valor>   preço médio por venda, em reais, aceita "497,00" ou "1.497"
 *
 * Saída de `datas`: tabela markdown com as colunas Data | Dia | D | Marco | Fase | Peça,
 * pronta pra colar no calendario.md. "D" é a distância da abertura (D-21, D0, D+7).
 * A coluna "Dia" é o que o `node scripts/verificar.js datas` confere depois. Quando o
 * calendário atravessa a virada do ano, a data sai com o ano (dd/mm/aaaa), senão o
 * verificador conferiria dezembro com o ano de janeiro.
 *
 * Node 18+, sem dependência.
 */

const fs = require("fs");
const path = require("path");

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_LONGO = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MS_DIA = 86400000;

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) o[k] = true;
      else { o[k] = v; i++; }
    } else o._.push(a);
  }
  return o;
}

function semAcento(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "1,5" → 1.5 · "1.497,00" → 1497 · "1.200" → 1200 · "497" → 497 · "497.50" → 497.5 */
function numeroBR(s) {
  if (s === undefined || s === true) return NaN;
  let t = String(s).trim().replace(/[R$\s%]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // ponto de milhar sem decimal
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, "");
  return parseFloat(t);
}

function reais(n) {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataDe(s, nome) {
  if (s === undefined || s === true) morrer(`falta --${nome} (formato AAAA-MM-DD)`, `Exemplo: --${nome} 2026-10-13`);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) morrer(`--${nome} precisa estar no formato AAAA-MM-DD (veio "${s}")`, `Exemplo: --${nome} 2026-10-13`);
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3])
    morrer(`--${nome}: ${s} não existe no calendário`);
  return d;
}

function mais(d, dias) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + dias);
  return r;
}

function ddmm(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasEntre(a, b) {
  return Math.round((b - a) / MS_DIA);
}

// ── feriados nacionais ────────────────────────────────────────────
// Só os nacionais fixos e os móveis que saem da Páscoa (algoritmo de
// Meeus/Jones/Butcher). Feriado estadual e municipal o usuário confere.
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function feriados(ano) {
  const p = pascoa(ano);
  const f = new Map();
  const fixo = (m, d, nome) => f.set(iso(new Date(ano, m - 1, d)), nome);
  fixo(1, 1, "Confraternização Universal");
  fixo(4, 21, "Tiradentes");
  fixo(5, 1, "Dia do Trabalho");
  fixo(9, 7, "Independência");
  fixo(10, 12, "Nossa Senhora Aparecida");
  fixo(11, 2, "Finados");
  fixo(11, 15, "Proclamação da República");
  fixo(11, 20, "Consciência Negra");
  fixo(12, 25, "Natal");
  f.set(iso(mais(p, -48)), "Carnaval (segunda, ponto facultativo)");
  f.set(iso(mais(p, -47)), "Carnaval (terça, ponto facultativo)");
  f.set(iso(mais(p, -2)), "Sexta-feira Santa");
  f.set(iso(mais(p, 60)), "Corpus Christi (ponto facultativo)");
  return f;
}

function feriadosEntre(anoA, anoB) {
  const f = new Map();
  for (let a = Math.min(anoA, anoB); a <= Math.max(anoA, anoB); a++) for (const [k, v] of feriados(a)) f.set(k, v);
  return f;
}

// ── marcos por tipo ───────────────────────────────────────────────
// em: "pre" conta do início do pré; "abre" da abertura; "meio" do meio da
// janela; "fecha" do fechamento. d negativo = dias antes; positivo = depois.
const TIPOS = {
  semente: {
    pre: 14,
    marcos: [
      { em: "pre", d: 0, marco: "Início do pré: abrir lista de espera", fase: "pré", peca: "/whatsapp ou /landing" },
      { em: "abre", d: -10, marco: "Conteúdo de antecipação 1: o problema", fase: "pré", peca: "/carrossel ou /video" },
      { em: "abre", d: -6, marco: "Conteúdo de antecipação 2: o que muda", fase: "pré", peca: "/carrossel ou /video" },
      { em: "abre", d: -3, marco: "Anúncio da data e do formato ao vivo", fase: "pré", peca: "/whatsapp + /email" },
      { em: "abre", d: -1, marco: "Véspera: lembrete com hora", fase: "pré", peca: "/whatsapp" },
      { em: "abre", d: 0, marco: "Abertura: oferta, vagas reais, link", fase: "durante", peca: "/whatsapp + /email" },
      { em: "abre", d: 1, marco: "Dúvidas mais frequentes respondidas", fase: "durante", peca: "/whatsapp" },
      { em: "fecha", d: -1, marco: "Véspera do fechamento", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: 0, marco: "Fechamento: última chamada", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: 1, marco: "Boas-vindas a quem entrou; lista de espera pra quem não", fase: "pós", peca: "/pos-venda + /sequencia" },
      { em: "fecha", d: 14, marco: "Primeiro resultado: pedir depoimento", fase: "pós", peca: "/pos-venda" },
      { em: "fecha", d: 21, marco: "Medição e decisão: virou turma? vira interno?", fase: "pós", peca: "/revisao-semanal" },
    ],
  },
  interno: {
    pre: 28,
    marcos: [
      { em: "pre", d: 0, marco: "Início do pré: captação (lista de espera, grupo, página) e série de boas-vindas", fase: "pré", peca: "/landing + /whatsapp + /sequencia" },
      { em: "abre", d: -21, marco: "Conteúdo de antecipação 1: o problema", fase: "pré", peca: "/carrossel ou /video" },
      { em: "abre", d: -14, marco: "Conteúdo de antecipação 2: o que muda quando resolve", fase: "pré", peca: "/carrossel ou /video" },
      { em: "abre", d: -10, marco: "Prova: depoimento ou bastidor", fase: "pré", peca: "/carrossel + biblioteca.md" },
      { em: "abre", d: -7, marco: "Conteúdo de antecipação 3 e anúncio da data", fase: "pré", peca: "/carrossel + /email" },
      { em: "abre", d: -3, marco: "Aviso: abre em 3 dias, com hora", fase: "pré", peca: "/whatsapp + /email" },
      { em: "abre", d: -1, marco: "Véspera: o que vai ter e a hora", fase: "pré", peca: "/whatsapp" },
      { em: "abre", d: 0, marco: "Abertura: oferta completa e link", fase: "durante", peca: "/whatsapp + /email + /landing" },
      { em: "abre", d: 1, marco: "Dúvidas mais frequentes e objeção principal", fase: "durante", peca: "/whatsapp + /video" },
      { em: "meio", d: 0, marco: "Meio da janela: prova e caso real", fase: "durante", peca: "/carrossel + /email" },
      { em: "fecha", d: -2, marco: "Aviso: fecha em 2 dias", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: -1, marco: "Véspera do fechamento", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: 0, marco: "Fechamento: última chamada, hora exata", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: 1, marco: "Agradecimento e boas-vindas; lista de espera pra quem não entrou", fase: "pós", peca: "/pos-venda + /sequencia" },
      { em: "fecha", d: 7, marco: "Medição: lista, vendas, canal, mensagem que vendeu", fase: "pós", peca: "/revisao-semanal" },
      { em: "fecha", d: 21, marco: "Primeiro resultado: pedir depoimento", fase: "pós", peca: "/pos-venda" },
    ],
  },
  externo: {
    pre: 56,
    marcos: [
      { em: "pre", d: 0, marco: "Convite aos parceiros: proposta de comissão e calendário", fase: "pré", peca: "/email-profissional" },
      { em: "abre", d: -35, marco: "Material do parceiro pronto (textos, imagens, link com origem)", fase: "pré", peca: "/carrossel + /email" },
      { em: "abre", d: -28, marco: "Início da captação própria", fase: "pré", peca: "/landing + /whatsapp" },
      { em: "abre", d: -21, marco: "Parceiros começam a divulgar; conteúdo de antecipação 1", fase: "pré", peca: "/carrossel ou /video" },
      { em: "abre", d: -14, marco: "Conteúdo de antecipação 2", fase: "pré", peca: "/carrossel ou /video" },
      { em: "abre", d: -7, marco: "Conteúdo 3 e anúncio da data (você e parceiros)", fase: "pré", peca: "/carrossel + /email" },
      { em: "abre", d: -3, marco: "Aviso: abre em 3 dias", fase: "pré", peca: "/whatsapp + /email" },
      { em: "abre", d: -1, marco: "Véspera", fase: "pré", peca: "/whatsapp" },
      { em: "abre", d: 0, marco: "Abertura: você e parceiros no mesmo horário", fase: "durante", peca: "/whatsapp + /email + /landing" },
      { em: "abre", d: 1, marco: "Dúvidas e objeção principal", fase: "durante", peca: "/whatsapp + /video" },
      { em: "meio", d: 0, marco: "Meio da janela: prova e caso real", fase: "durante", peca: "/carrossel + /email" },
      { em: "fecha", d: -2, marco: "Aviso: fecha em 2 dias", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: -1, marco: "Véspera do fechamento", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: 0, marco: "Fechamento", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: 1, marco: "Boas-vindas; lista de espera; relatório parcial aos parceiros", fase: "pós", peca: "/pos-venda + /email-profissional" },
      { em: "fecha", d: 7, marco: "Fechamento de comissão por parceiro (origem do link)", fase: "pós", peca: "/caixa" },
      { em: "fecha", d: 21, marco: "Pedir depoimento", fase: "pós", peca: "/pos-venda" },
    ],
  },
  relampago: {
    pre: 3,
    marcos: [
      { em: "pre", d: 0, marco: "Aviso à lista quente: vem promoção, dia e hora", fase: "pré", peca: "/whatsapp" },
      { em: "abre", d: -1, marco: "Véspera: o que vai ter, sem o preço ainda", fase: "pré", peca: "/whatsapp + /email" },
      { em: "abre", d: 0, marco: "Abertura: oferta, prazo, quantidade real", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: -1, marco: "Véspera do fechamento", fase: "durante", peca: "/whatsapp" },
      { em: "fecha", d: 0, marco: "Fechamento: última chamada com hora", fase: "durante", peca: "/whatsapp + /email" },
      { em: "fecha", d: 1, marco: "Agradecimento; encerrar de verdade", fase: "pós", peca: "/pos-venda" },
      { em: "fecha", d: 7, marco: "Medição: vendas, canal, o que sobrou", fase: "pós", peca: "/revisao-semanal" },
    ],
  },
  perpetuo: {
    pre: 0,
    marcos: [
      { em: "abre", d: 0, marco: "Entrada da pessoa (dia 0 dela): boas-vindas e o problema", fase: "pré", peca: "/sequencia" },
      { em: "abre", d: 1, marco: "Dia 1: o que muda quando resolve", fase: "pré", peca: "/sequencia" },
      { em: "abre", d: 2, marco: "Dia 2: prova e caso real", fase: "pré", peca: "/sequencia" },
      { em: "abre", d: 3, marco: "Dia 3: abertura da oferta pra ela, com prazo pessoal", fase: "durante", peca: "/sequencia + /landing" },
      { em: "abre", d: 5, marco: "Dia 5: objeção principal", fase: "durante", peca: "/sequencia" },
      { em: "abre", d: 6, marco: "Dia 6: véspera do prazo dela", fase: "durante", peca: "/sequencia" },
      { em: "abre", d: 7, marco: "Dia 7: fechamento do prazo dela", fase: "durante", peca: "/sequencia" },
      { em: "abre", d: 8, marco: "Dia 8: quem não comprou vai pra lista comum", fase: "pós", peca: "/sequencia" },
    ],
  },
};

function cmdDatas(o) {
  const tipo = semAcento(o.tipo || "interno");
  const T = TIPOS[tipo];
  if (!T) morrer(`tipo "${o.tipo}" não existe`, `Tipos: ${Object.keys(TIPOS).join(", ")}`);

  const abre = dataDe(o.abre, "abre");
  const perpetuo = tipo === "perpetuo";
  let fecha;
  if (perpetuo) {
    fecha = mais(abre, 7);
  } else {
    fecha = dataDe(o.fecha, "fecha");
    if (fecha <= abre) morrer("--fecha precisa ser depois de --abre");
  }
  const pre = o.pre !== undefined ? parseInt(o.pre, 10) : T.pre;
  if (Number.isNaN(pre) || pre < 0) morrer("--pre precisa ser um número de dias");

  const inicioPre = mais(abre, -pre);
  const dif = diasEntre(abre, fecha);      // dias entre abertura e fechamento
  const janela = dif + 1;                  // contando os dois dias, que é como se fala
  const meio = mais(abre, Math.floor(dif / 2));

  // feriados de todos os anos que o calendário toca (o pós vai até fecha+21)
  const fer = feriadosEntre(inicioPre.getFullYear(), mais(fecha, 30).getFullYear());
  const naoUtil = (d) => fer.has(iso(d)) || d.getDay() === 0 || d.getDay() === 6;
  const fixo = (m) => (m.em === "abre" && m.d === 0) || (m.em === "fecha" && m.d === 0) || (m.d === -1 && (m.em === "abre" || m.em === "fecha"));

  const linhas = [];
  const movidos = [];
  for (const m of T.marcos) {
    if (m.em === "pre" && pre === 0) continue;
    if (m.em === "abre" && m.d < 0 && -m.d > pre) continue;   // pré mais curto que o marco
    if (m.em === "meio" && dif < 4) continue;
    if (m.em === "fecha" && m.d < 0 && -m.d >= dif) continue;
    if (m.em === "abre" && m.d > 0 && !perpetuo && m.d >= dif) continue;
    const base = m.em === "pre" ? inicioPre : m.em === "abre" ? abre : m.em === "meio" ? meio : fecha;
    let d = mais(base, m.d);
    if (o.uteis && !perpetuo && !fixo(m) && naoUtil(d)) {
      const original = d;
      while (naoUtil(d) && d > inicioPre) d = mais(d, -1);
      if (d > inicioPre) movidos.push(`${m.marco.split(":")[0]}: ${ddmm(original)} (${DIAS[original.getDay()]}) → ${ddmm(d)} (${DIAS[d.getDay()]})`);
      else d = original;
    }
    linhas.push({ ...m, data: d, D: diasEntre(abre, d) });
  }
  linhas.sort((a, b) => a.data - b.data);

  // atravessa a virada do ano? então toda data leva o ano, senão o verificador confere errado
  const primeira = linhas[0].data, ultima = linhas[linhas.length - 1].data;
  const anos = primeira.getFullYear() === ultima.getFullYear() ? [primeira.getFullYear()] : [primeira.getFullYear(), ultima.getFullYear()];
  const fmt = anos.length > 1 ? (d) => `${ddmm(d)}/${d.getFullYear()}` : ddmm;
  const rotuloD = (n) => (n === 0 ? "D0" : n < 0 ? `D${n}` : `D+${n}`);

  const avisos = [];
  const marca = (d, rotulo) => {
    const f = fer.get(iso(d));
    const dia = d.getDay();
    if (f) avisos.push(`${rotulo} (${fmt(d)}, ${DIAS_LONGO[dia]}) cai em feriado nacional: ${f}`);
    else if (dia === 0 || dia === 6) avisos.push(`${rotulo} (${fmt(d)}) cai em ${DIAS_LONGO[dia]}`);
  };
  marca(abre, "Abertura");
  if (!perpetuo) marca(fecha, "Fechamento");
  const foraDoUtil = perpetuo ? [] : linhas.filter((l) => !fixo(l) && naoUtil(l.data)).map((l) => `${fmt(l.data)} (${DIAS[l.data.getDay()]})`);

  const out = [];
  out.push(`| Data | Dia | D | Marco | Fase | Peça |`);
  out.push(`|---|---|---|---|---|---|`);
  for (const l of linhas) {
    const f = fer.get(iso(l.data));
    const obs = f ? ` (feriado: ${f})` : "";
    out.push(`| ${fmt(l.data)} | ${DIAS[l.data.getDay()]} | ${rotuloD(l.D)} | ${l.marco}${obs} | ${l.fase} | ${l.peca} |`);
  }
  const tabela = out.join("\n");

  if (perpetuo) console.log("\nℹ perpétuo: a janela é por pessoa. As datas abaixo são de UMA pessoa que entrou em " + fmt(abre) + "; o calendário real é a série automática do /sequencia, não uma data fixa.");
  console.log(`\nLANÇAMENTO (${tipo}) — pré de ${pre} dias, janela de ${janela} dias (${fmt(abre)} a ${fmt(fecha)})`);
  console.log(`  pré começa ${fmt(inicioPre)} (${DIAS_LONGO[inicioPre.getDay()]})`);
  console.log(`  abre       ${fmt(abre)} (${DIAS_LONGO[abre.getDay()]})`);
  if (!perpetuo) console.log(`  fecha      ${fmt(fecha)} (${DIAS_LONGO[fecha.getDay()]})`);
  console.log("");
  console.log(tabela);
  if (avisos.length) {
    console.log("");
    for (const a of avisos) console.log(`⚠ ${a}`);
  } else console.log("\n✔ abertura e fechamento em dia útil, sem feriado nacional");
  if (movidos.length) {
    console.log(`\n· ${movidos.length} marco(s) puxado(s) pro dia útil anterior (--uteis):`);
    for (const m of movidos) console.log(`  ${m}`);
  } else if (foraDoUtil.length) {
    console.log(`\n· ${foraDoUtil.length} marco(s) em fim de semana ou feriado: ${foraDoUtil.join(", ")}. Post no feed pode ficar; mensagem de WhatsApp de negócio costuma render mais em dia útil (rode com --uteis pra puxar)`);
  }
  console.log("\nℹ feriado estadual e municipal não estão aqui: conferir os da cidade do público");

  if (o.md) {
    const arq = path.resolve(String(o.md));
    fs.mkdirSync(path.dirname(arq), { recursive: true });
    const corpo = [
      `# Calendário do lançamento — ${tipo} — ${anos.join("/")}`,
      ``,
      `- Pré: ${pre} dias, começa ${DIAS[inicioPre.getDay()]} ${fmt(inicioPre)}`,
      `- Abre: ${DIAS[abre.getDay()]} ${fmt(abre)}`,
      perpetuo
        ? `- Prazo por pessoa: ${dif} dias depois da entrada (as datas abaixo são de quem entrou em ${fmt(abre)})`
        : `- Fecha: ${DIAS[fecha.getDay()]} ${fmt(fecha)} (janela de ${janela} dias)`,
      ``,
      tabela,
      avisos.length ? "\n## Atenção\n" + avisos.map((a) => `- ${a}`).join("\n") : "",
      ``,
    ].join("\n");
    fs.writeFileSync(arq, corpo);
    console.log(`\n✔ gravado em ${arq}`);
    console.log(`  conferir: node scripts/verificar.js datas "${arq}"`);
  }
}

function cmdMeta(o) {
  const conv = numeroBR(o.conversao);
  if (Number.isNaN(conv) || conv <= 0 || conv > 100) morrer("--conversao precisa ser uma porcentagem entre 0 e 100 (ex: 1,5)");
  const ticket = o.ticket !== undefined ? numeroBR(o.ticket) : NaN;
  if (o.ticket !== undefined && (Number.isNaN(ticket) || ticket <= 0)) morrer("--ticket precisa ser um valor em reais (ex: 497 ou 1.497,00)");
  const taxa = conv / 100;

  let lista, vendas;
  if (o.lista !== undefined) {
    lista = Math.round(numeroBR(o.lista));
    if (Number.isNaN(lista) || lista <= 0) morrer("--lista precisa ser um número inteiro de contatos");
    vendas = lista * taxa;
  } else if (o.vendas !== undefined) {
    vendas = numeroBR(o.vendas);
    if (Number.isNaN(vendas) || vendas <= 0) morrer("--vendas precisa ser um número");
    lista = Math.ceil(vendas / taxa);
  } else morrer("informe --lista (pra saber quantas vendas) ou --vendas (pra saber a lista necessária)");

  const cen = [
    ["Pessimista", taxa / 2],
    ["Meta", taxa],
    ["Otimista", taxa * 2],
  ];
  const pct = (t) => (t * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";

  console.log(`\nMETA DO LANÇAMENTO`);
  if (o.lista !== undefined) console.log(`  lista: ${lista.toLocaleString("pt-BR")} contatos · conversão: ${pct(taxa)}`);
  else console.log(`  vendas desejadas: ${vendas.toLocaleString("pt-BR")} · conversão: ${pct(taxa)} · lista necessária: ${lista.toLocaleString("pt-BR")} contatos`);
  console.log("");
  console.log(`| Cenário | Conversão | Vendas |${Number.isNaN(ticket) ? "" : " Receita |"}`);
  console.log(`|---|---|---|${Number.isNaN(ticket) ? "" : "---|"}`);
  for (const [nome, t] of cen) {
    const v = Math.floor(lista * t);
    const r = Number.isNaN(ticket) ? "" : ` ${reais(v * ticket)} |`;
    console.log(`| ${nome} | ${pct(t)} | ${v} |${r}`);
  }
  const v = Math.floor(lista * taxa);
  if (Number.isNaN(ticket)) {
    console.log(`\n  conta da meta: ${lista.toLocaleString("pt-BR")} × ${pct(taxa)} = ${v} vendas`);
  } else {
    console.log(`\n  conta da meta: ${lista.toLocaleString("pt-BR")} × ${pct(taxa)} = ${v} vendas · ${v} × ${reais(ticket)} = ${reais(v * ticket)}`);
    console.log(`  (a linha acima cabe no plano.md; o "verificar.js tabela" confere o "${v} × ${reais(ticket)} = ${reais(v * ticket)}")`);
  }
  console.log("\nℹ a conversão certa é a do seu histórico. Sem histórico, a coluna Meta é hipótese, e a primeira turma serve pra medir.");
}

function ajuda() {
  console.log(`
Contex OS — lancamento.js

  node scripts/lancamento.js datas --abre AAAA-MM-DD --fecha AAAA-MM-DD [--tipo interno] [--pre 28] [--uteis] [--md arquivo.md]
  node scripts/lancamento.js meta --lista 1200 --conversao 1,5 [--ticket 497]
  node scripts/lancamento.js meta --vendas 30 --conversao 1,5 [--ticket 497]

Tipos: ${Object.keys(TIPOS).join(", ")}
`);
}

const o = args(process.argv.slice(2));
const cmd = o._[0];
if (cmd === "datas") cmdDatas(o);
else if (cmd === "meta") cmdMeta(o);
else { ajuda(); process.exit(cmd ? 1 : 0); }
