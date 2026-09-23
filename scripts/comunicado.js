#!/usr/bin/env node
/**
 * Contex OS — comunicado.js
 * Duas contas que todo aviso difícil exige e quase ninguém faz: quanto tempo de
 * aviso existe até a data em que a mudança passa a valer, e se as peças do
 * comunicado contam o mesmo fato.
 *
 * Existe porque comunicado erra de dois jeitos previsíveis. O primeiro é prazo:
 * "a partir do mês que vem" mandado com onze dias de antecedência não cumpre os
 * 30 dias de aviso que contrato de prestação continuada pressupõe, e o disparo
 * cai num sábado em que não tem ninguém no atendimento pra responder. O segundo
 * é divergência: a mensagem do cliente diz R$ 890, o cartaz diz R$ 895 e o post
 * fala "a partir de março" sem dia. Nas duas o dono descobre pelo cliente.
 *
 * Uso:
 *   node scripts/comunicado.js prazo --vigencia DD/MM/AAAA [opções]
 *   node scripts/comunicado.js conferir <pasta-do-comunicado>
 *
 * Opções de `prazo`:
 *   --vigencia DD/MM/AAAA   dia em que a mudança passa a valer (obrigatório)
 *   --minimo <dias>         aviso mínimo em dias corridos (padrão: 30)
 *   --tipo <tipo>           define o mínimo pelo tipo de aviso (ver tabela abaixo)
 *   --acao DD/MM/AAAA       prazo até quando quem recebe precisa fazer algo
 *   --hoje DD/MM/AAAA       data de referência (padrão: hoje)
 *   --feriado DD/MM         feriado local que fecha o atendimento (repetir)
 *   --json                  imprime em JSON, pra outra ferramenta ler
 *
 * `prazo` sugere o disparo no primeiro dia útil a partir de hoje e mostra em
 * separado o último dia em que o aviso ainda cumpre o mínimo. Mandar no limite
 * é o que faz o cliente receber o aviso junto com a fatura.
 *
 * Tipos e de onde vem o mínimo de cada um:
 *   reajuste    30 dias — prática de mercado, não prazo legal
 *   escolar     45 dias — Lei 9.870/1999, art. 2º (escola de educação infantil,
 *               fundamental, média ou superior divulga a proposta 45 dias antes
 *               do fim do prazo de matrícula). Curso livre não entra nessa lei
 *   contrato    60 dias — prática, pra contrato em que a outra parte investiu
 *               (Código Civil, art. 473, parágrafo único: prazo compatível)
 *   regra       30 dias — prática
 *   sistema     30 dias — prática
 *   fechamento  15 dias — prática
 *   desculpa     0 dias — falha já aconteceu; o aviso sai hoje
 *
 * `conferir` lê `<pasta>/fato.json` (a fonte única do fato) e confere as peças
 * contra ele: marca obrigatória presente, data em número, nenhum valor, nenhuma
 * porcentagem e nenhuma data que não esteja no fato.json, nada de "em breve"
 * onde o fato exige dia, nenhum "[a confirmar]" em peça pública, e o disparo.md
 * com datas que ainda não passaram.
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const ITENS = ["muda", "desde", "fazer", "se_nao"];
const ROTULO = { muda: "o que muda", desde: "desde quando", fazer: "o que a pessoa precisa fazer", se_nao: "o que acontece se não fizer" };

const TIPOS = {
  reajuste: { dias: 30, fonte: "prática de mercado, não prazo legal" },
  escolar: { dias: 45, lei: true, fonte: "Lei 9.870/1999, art. 2º — escola de educação infantil, fundamental, média ou superior divulga a proposta de contrato 45 dias antes do fim do prazo de matrícula; curso livre não é regido por ela (planalto.gov.br/ccivil_03/leis/l9870.htm)" },
  contrato: { dias: 60, fonte: "prática; Código Civil, art. 473, parágrafo único, exige prazo compatível com o vulto do investimento da outra parte" },
  regra: { dias: 30, fonte: "prática de mercado, não prazo legal" },
  sistema: { dias: 30, fonte: "prática de mercado, não prazo legal" },
  fechamento: { dias: 15, fonte: "prática de mercado, não prazo legal" },
  desculpa: { dias: 0, fonte: "a falha já aconteceu: o aviso sai hoje" },
};

// Linguagem que esconde o fato. Sai como aviso, menos "em breve" e parentes,
// que são erro na peça obrigada a dizer o dia.
const ESCONDE = [
  [/\binformamos que\b/i, "informamos que"],
  [/\bcomunicamos que\b/i, "comunicamos que"],
  [/\bvimos por meio de(sta|ste)\b/i, "vimos por meio desta"],
  [/\bpor motivos alheios\b/i, "por motivos alheios"],
  [/\beventuais transtornos\b/i, "eventuais transtornos"],
  [/\bpedimos (a |a sua |sua )?compreens(ã|a)o\b/i, "pedimos compreensão"],
  [/\bpassar(á|a) por (uma )?reestruturaç(ão|ao)\b/i, "passará por reestruturação"],
  [/\bser(á|a) (necess(á|a)rio|realizado) o?\s?ajuste\b/i, "será necessário ajuste"],
  [/\bhaver(á|a) (um )?(pequeno )?re?ajuste\b/i, "haverá um reajuste"],
  [/\bser(ão|ao) implementad/i, "serão implementadas"],
  [/\b(a|nossa) empresa (decidiu|informa|comunica)\b/i, "a empresa decidiu"],
  [/\bassumimos total responsabilidade\b/i, "assumimos total responsabilidade"],
];
const SEM_DIA = [
  [/\bem breve\b/i, "em breve"],
  [/\bnos pr(ó|o)ximos dias\b/i, "nos próximos dias"],
  [/\ba partir do pr(ó|o)ximo m(ê|e)s\b/i, "a partir do próximo mês"],
  [/\bat(é|e) o final do m(ê|e)s\b/i, "até o final do mês"],
  [/\bno decorrer do m(ê|e)s\b/i, "no decorrer do mês"],
];

let problemas = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const aviso = (m) => console.log(`  ! ${m}`);
const erro = (m) => { problemas++; console.log(`  ✖ ${m}`); };
const info = (m) => console.log(`    ${m}`);

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Lê "--chave valor" e "--flag". Opção repetida vira lista. */
function lerArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    if (o[k] === undefined) o[k] = v;
    else if (Array.isArray(o[k])) o[k].push(v);
    else o[k] = [o[k], v];
  }
  return o;
}

function comparavel(s) {
  return br.semAcento(String(s)).replace(/\s+/g, " ").trim();
}

// ─────────────────────────── prazo ───────────────────────────

/**
 * Matemática do aviso: quanto tempo existe até a vigência, o primeiro dia útil em
 * que o comunicado pode sair, o último dia em que ele ainda cumpre o mínimo, e os
 * três toques. O disparo sugerido é o mais cedo possível, nunca o limite: aviso
 * mandado no último dia permitido chega junto com a fatura.
 * Devolve objeto puro (sem imprimir), pra teste e pra --json.
 */
function calcularPrazo({ vigencia, hoje, minimo = 30, acao = null, feriados = [], tipo = null, fonte = null }) {
  const v = br.lerData(vigencia);
  if (!v) throw new Error(`vigência "${vigencia}" não é uma data válida (use DD/MM/AAAA)`);
  const h = hoje ? br.lerData(hoje) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  if (!h) throw new Error(`data de hoje "${hoje}" não é uma data válida (use DD/MM/AAAA)`);
  if (!(minimo >= 0)) throw new Error(`mínimo "${minimo}" não é um número de dias`);

  const corridos = br.diasEntre(h, v);
  const uteis = br.diasUteisEntre(h, v, feriados);

  // O aviso sai no primeiro dia útil: comunicado mandado em dia sem atendimento
  // não é aviso, é arquivo parado até alguém abrir a loja.
  const disparo = br.proximoUtil(h, feriados);
  // Último dia em que o aviso ainda cumpre o mínimo, também antecipado pro dia útil.
  const limite = br.anteriorUtil(br.mais(v, -minimo), feriados);

  const avisoEfetivo = br.diasEntre(disparo.data, v);
  const retroativo = avisoEfetivo < 0;
  const cabe = !retroativo && avisoEfetivo >= minimo;

  const r = {
    hoje: br.fmt(h), vigencia: br.fmt(v), diaDaVigencia: br.diaSemana(v),
    minimo, tipo, fonteDoMinimo: fonte || (tipo && TIPOS[tipo] ? TIPOS[tipo].fonte : "informado na mão"),
    diasCorridos: corridos, diasUteis: uteis, cabe, retroativo,
    disparo: br.fmt(disparo.data), disparoDia: br.diaSemana(disparo.data),
    disparoAdiado: disparo.motivo || null,
    avisoEfetivo,
    limite: br.fmt(limite.data), limiteDia: br.diaSemana(limite.data),
    limiteAntecipado: limite.motivo || null,
    folgaDias: br.diasEntre(disparo.data, limite.data),
  };

  if (retroativo) {
    r.diasDeAtraso = -avisoEfetivo;
  } else if (!cabe) {
    const min = br.proximoUtil(br.mais(disparo.data, minimo), feriados);
    r.vigenciaMinima = br.fmt(min.data);
    r.adiarDias = br.diasEntre(v, min.data);
    r.faltamDias = minimo - avisoEfetivo;
  }

  if (acao) {
    const a = br.lerData(acao);
    if (!a) throw new Error(`prazo de ação "${acao}" não é uma data válida (use DD/MM/AAAA)`);
    const ajustada = br.anteriorUtil(a, feriados);
    r.acao = {
      informada: br.fmt(a), usar: br.fmt(ajustada.data), dia: br.diaSemana(ajustada.data),
      antecipada: ajustada.motivo || null,
      diasUteisAPartirDoDisparo: br.diasUteisEntre(disparo.data, ajustada.data, feriados),
      antesDaVigencia: br.diasEntre(ajustada.data, v) > 0,
      depoisDoDisparo: br.diasEntre(disparo.data, ajustada.data) > 0,
    };
  }

  // Três toques: o aviso, o lembrete no meio do caminho e a véspera. Janela curta
  // (desculpa, mudança de amanhã) não tem meio nem véspera: tem um toque.
  const janela = avisoEfetivo;
  const toque = (d, o_que) => ({ quando: br.fmt(d), dia: br.diaSemana(d), o_que });
  r.toques = [toque(disparo.data, "aviso completo (equipe primeiro, depois cliente, depois rede)")];
  const usadas = new Set([br.fmt(disparo.data)]);
  const empilhar = (d, o_que) => { const k = br.fmt(d); if (usadas.has(k)) return; usadas.add(k); r.toques.push(toque(d, o_que)); };
  if (janela >= 6) empilhar(br.anteriorUtil(br.mais(disparo.data, Math.round(janela / 2)), feriados).data, "lembrete curto pra quem ainda não fez o que precisa fazer");
  if (janela >= 3) empilhar(br.maisUteis(v, -1, feriados), "véspera: última chamada, com o prazo no assunto");
  r.toques.sort((a, b) => br.lerData(a.quando) - br.lerData(b.quando));
  return r;
}

function imprimirPrazo(r) {
  console.log(`\nPRAZO DE AVISO`);
  console.log(`  hoje: ${r.hoje} · vigência: ${r.vigencia} (${r.diaDaVigencia})`);
  console.log(`  ${r.diasCorridos} ${r.diasCorridos === 1 ? "dia corrido" : "dias corridos"}, ${r.diasUteis} ${r.diasUteis === 1 ? "dia útil" : "dias úteis"} até a vigência`);
  console.log(`  mínimo pedido: ${r.minimo} ${r.minimo === 1 ? "dia" : "dias"} (${r.fonteDoMinimo})\n`);

  console.log(`  disparo do aviso: ${r.disparo} (${r.disparoDia})`);
  if (r.disparoAdiado) info(`primeiro dia útil, porque ${r.hoje} é ${r.disparoAdiado}`);

  if (r.retroativo) {
    erro(`a vigência (${r.vigencia}) já passou há ${r.diasDeAtraso} ${r.diasDeAtraso === 1 ? "dia" : "dias"}: o comunicado é retroativo`);
    info(`peça retroativa diz isso na primeira linha, antes do que muda, e não finge que o aviso saiu antes`);
  } else if (r.minimo === 0) {
    ok(`nada a esperar: o aviso sai em ${r.disparo}, o mais cedo que dá`);
  } else if (r.cabe) {
    ok(`o aviso cabe: ${r.avisoEfetivo} ${r.avisoEfetivo === 1 ? "dia" : "dias"} entre ${r.disparo} e a vigência ≥ ${r.minimo}`);
    if (r.folgaDias > 0) info(`último dia em que ainda cumpre o mínimo: ${r.limite} (${r.limiteDia}) — ${r.folgaDias} ${r.folgaDias === 1 ? "dia" : "dias"} de folga, e mandar antes é sempre melhor`);
    else info(`${r.disparo} é o último dia em que o aviso ainda cumpre o mínimo: não dá pra empurrar`);
    if (r.limiteAntecipado) info(`o limite antecipou porque o dia cheio cai em ${r.limiteAntecipado}`);
  } else {
    erro(`o aviso não cabe: mandando em ${r.disparo} são ${r.avisoEfetivo} ${r.avisoEfetivo === 1 ? "dia" : "dias"}, faltam ${r.faltamDias} pra fechar os ${r.minimo}`);
    info(`vigência mínima possível: ${r.vigenciaMinima} (adiar ${r.adiarDias} ${r.adiarDias === 1 ? "dia" : "dias"})`);
    info(`a outra saída é manter a data e assumir por escrito que o aviso saiu curto`);
  }

  if (r.acao) {
    console.log(`\n  prazo de ação de quem recebe: ${r.acao.usar} (${r.acao.dia})`);
    if (r.acao.antecipada) info(`antecipado de ${r.acao.informada} porque ${r.acao.antecipada}`);
    if (!r.acao.depoisDoDisparo) erro(`o prazo de ação (${r.acao.usar}) não é depois do disparo (${r.disparo}): ninguém age antes de ser avisado`);
    else if (!r.acao.antesDaVigencia) erro(`o prazo de ação (${r.acao.usar}) não é antes da vigência (${r.vigencia})`);
    else ok(`quem recebe tem ${r.acao.diasUteisAPartirDoDisparo} ${r.acao.diasUteisAPartirDoDisparo === 1 ? "dia útil" : "dias úteis"} entre o aviso e o prazo`);
  }

  console.log(`\n  calendário de disparo`);
  for (const t of r.toques) console.log(`    ${t.quando} (${t.dia}) — ${t.o_que}`);
  console.log("");
  return r;
}

// ─────────────────────────── conferir ───────────────────────────

const RE_DATA_LONGA = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
const RE_DATA_CURTA = /\b(\d{2})\/(\d{2})\b(?!\/)/g;
const RE_DINHEIRO = /R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/g;
const RE_PCT = /(\d{1,3}(?:,\d{1,2})?)\s?%/g;

function achar(texto, re, converter) {
  const fora = [];
  for (const m of texto.matchAll(re)) {
    const v = converter(m);
    if (v !== null) fora.push({ bruto: m[0], valor: v });
  }
  return fora;
}

function datasDe(texto) {
  const out = [];
  for (const m of texto.matchAll(RE_DATA_LONGA)) {
    const d = br.lerData(`${m[1]}/${m[2]}/${m[3]}`);
    if (d) out.push({ bruto: m[0], valor: br.iso(d) });
  }
  for (const m of texto.matchAll(RE_DATA_CURTA)) {
    const dia = +m[1], mes = +m[2];
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) continue;
    out.push({ bruto: m[0], valor: `--${m[2]}-${m[1]}` });
  }
  return out;
}

/** Números e datas que o fato.json declara. Tudo que está lá dentro vale. */
function declarado(fatoTexto) {
  const dinheiro = new Set(achar(fatoTexto, RE_DINHEIRO, (m) => br.numero(m[1])).map((x) => x.valor.toFixed(2)));
  const pct = new Set(achar(fatoTexto, RE_PCT, (m) => br.numero(m[1])).map((x) => x.valor.toFixed(2)));
  const datas = new Set();
  for (const d of datasDe(fatoTexto)) {
    datas.add(d.valor);
    if (d.valor.startsWith("--")) continue;
    datas.add(`--${d.valor.slice(5, 7)}-${d.valor.slice(8, 10)}`);
  }
  return { dinheiro, pct, datas };
}

function conferir(pasta, { hoje = null } = {}) {
  problemas = 0;
  const dir = path.resolve(pasta);
  const refHoje = hoje ? br.lerData(hoje) : new Date();
  if (!refHoje) morrer(`data de hoje "${hoje}" não é uma data válida`, "use DD/MM/AAAA.");
  const ref = new Date(refHoje.getFullYear(), refHoje.getMonth(), refHoje.getDate());
  const arqFato = path.join(dir, "fato.json");
  if (!fs.existsSync(arqFato)) morrer(`não achei ${arqFato}`, "o comunicado começa pelo fato.json: é a fonte única do fato, e é contra ele que as peças são conferidas.");

  const fatoTexto = fs.readFileSync(arqFato, "utf8");
  let fato;
  try { fato = JSON.parse(fatoTexto); } catch (e) { morrer(`fato.json não é JSON válido: ${e.message}`); }

  console.log(`\nFATO: ${path.join(path.basename(dir), "fato.json")}`);

  for (const campo of ["tema", ...ITENS]) {
    const v = fato[campo];
    if (!v || String(v).trim().length < 3) erro(`campo "${campo}" vazio (${ROTULO[campo] || "tema"})`);
  }
  for (const campo of ["muda", "fazer", "se_nao"]) {
    const v = String(fato[campo] || "");
    if (v && v.trim().length < 15) erro(`campo "${campo}" curto demais pra ser o fato: "${v.trim()}"`);
    if (/\[a confirmar\]/i.test(v)) erro(`campo "${campo}" ainda tem [a confirmar] — comunicado não sai com lacuna`);
  }

  const dDesde = br.lerData(fato.desde);
  if (!dDesde) erro(`"desde" ("${fato.desde}") não é uma data válida em DD/MM/AAAA`);
  else {
    if (br.diasEntre(ref, dDesde) < 0) aviso(`a vigência (${br.fmt(dDesde)}) já passou: comunicado retroativo precisa dizer isso na primeira linha`);
    else ok(`vigência em ${br.fmt(dDesde)} (${br.diaSemana(dDesde)}), ${br.diasEntre(ref, dDesde)} dias a partir de ${br.fmt(ref)}`);
  }

  const marcas = fato.marcas || {};
  const pecas = fato.pecas || {};
  if (!Object.keys(pecas).length) erro(`"pecas" vazio: liste cada arquivo e o que ele precisa carregar (ex: {"clientes.md": "todos"})`);

  const exigidos = new Set();
  for (const [arquivo, spec] of Object.entries(pecas)) {
    for (const it of String(spec) === "todos" ? ITENS : String(spec).split(/[,\s]+/).filter(Boolean)) {
      if (!ITENS.includes(it)) { erro(`pecas["${arquivo}"] pede "${it}", que não é item da checklist — use "todos" ou uma lista de: ${ITENS.join(", ")}`); continue; }
      exigidos.add(it);
    }
  }
  for (const it of exigidos) {
    if (it !== "desde" && !marcas[it]) erro(`falta marcas.${it}: a frase curta que precisa aparecer literalmente nas peças (${ROTULO[it] || it})`);
  }

  const decl = declarado(fatoTexto);
  info(`declarado no fato: ${decl.dinheiro.size} valor(es), ${decl.pct.size} porcentagem(ns), ${decl.datas.size} forma(s) de data`);

  for (const [arquivo, spec] of Object.entries(pecas)) {
    const p = path.join(dir, arquivo);
    console.log(`\nPEÇA: ${arquivo}`);
    if (!fs.existsSync(p)) { erro(`arquivo não existe`); continue; }
    const texto = fs.readFileSync(p, "utf8");
    const palavras = texto.split(/\s+/).filter((x) => /[A-Za-zÀ-ÿ]/.test(x)).length;
    if (palavras < 20) { erro(`só ${palavras} palavras: peça vazia ou só com esqueleto`); continue; }
    const cmp = comparavel(texto);
    const itens = String(spec) === "todos" ? ITENS : String(spec).split(/[,\s]+/).filter((x) => ITENS.includes(x));
    info(`${palavras} palavras · precisa carregar: ${itens.join(", ")}`);

    for (const it of itens) {
      if (it === "desde") {
        const achadas = datasDe(texto).map((x) => x.valor);
        const alvo = dDesde ? br.iso(dDesde) : null;
        const curta = alvo ? `--${alvo.slice(5, 7)}-${alvo.slice(8, 10)}` : null;
        if (alvo && (achadas.includes(alvo) || achadas.includes(curta))) ok(`traz a data da vigência em número`);
        else erro(`não traz a data da vigência (${fato.desde}) em número — mês sem dia não é data`);
        continue;
      }
      const marca = marcas[it];
      if (!marca) continue;
      if (cmp.includes(comparavel(marca))) ok(`"${marca}" presente (${ROTULO[it]})`);
      else erro(`falta "${marca}" (${ROTULO[it]})`);
    }

    // Fato que escapou da fonte única.
    for (const d of achar(texto, RE_DINHEIRO, (m) => br.numero(m[1]))) {
      if (!decl.dinheiro.has(d.valor.toFixed(2))) erro(`valor "${d.bruto}" não está no fato.json`);
    }
    for (const d of achar(texto, RE_PCT, (m) => br.numero(m[1]))) {
      if (!decl.pct.has(d.valor.toFixed(2))) erro(`porcentagem "${d.bruto}" não está no fato.json`);
    }
    for (const d of datasDe(texto)) {
      if (!decl.datas.has(d.valor)) erro(`data "${d.bruto}" não está no fato.json`);
    }

    if (/\[a confirmar\]/i.test(texto)) {
      if (/clientes|redes|cartaz/i.test(arquivo)) erro(`tem [a confirmar]: peça que vai pro público não sai com lacuna`);
      else aviso(`tem [a confirmar]: resolver antes do disparo`);
    }
    for (const [re, nome] of SEM_DIA) {
      if (re.test(texto)) {
        if (itens.includes("desde")) erro(`"${nome}": esta peça precisa dizer o dia`);
        else aviso(`"${nome}" no lugar do dia`);
      }
    }
    for (const [re, nome] of ESCONDE) if (re.test(texto)) aviso(`"${nome}" esconde quem decidiu e o que muda`);
    if (/redes/i.test(arquivo) && palavras > 150) aviso(`${palavras} palavras: a versão pública some depois de 150`);
  }

  const arqDisparo = path.join(dir, "disparo.md");
  console.log(`\nCALENDÁRIO: disparo.md`);
  if (!fs.existsSync(arqDisparo)) erro(`falta disparo.md: sem calendário, o comunicado fica pronto e não sai`);
  else {
    const texto = fs.readFileSync(arqDisparo, "utf8");
    const linhas = datasDe(texto).filter((x) => !x.valor.startsWith("--"));
    if (!linhas.length) erro(`nenhuma data em DD/MM/AAAA no disparo.md — as datas saem do "comunicado.js prazo", não da cabeça`);
    let passadas = 0;
    for (const d of linhas) if (br.diasEntre(ref, br.lerData(d.bruto)) < 0) passadas++;
    if (passadas) erro(`${passadas} data(s) do disparo.md já passaram em ${br.fmt(ref)}: rodar "comunicado.js prazo" de novo e refazer o calendário`);
    else if (linhas.length) ok(`${linhas.length} data(s) de disparo, nenhuma no passado`);
    if (dDesde) {
      const depois = linhas.filter((d) => br.diasEntre(br.lerData(d.bruto), dDesde) < 0);
      if (depois.length) aviso(`data(s) de disparo depois da vigência (${br.fmt(dDesde)}): ${depois.map((d) => d.bruto).join(", ")}`);
    }
  }

  const soltos = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !pecas[f] && f !== "disparo.md");
  if (soltos.length) aviso(`arquivo .md fora de "pecas": ${soltos.join(", ")} — ou entra na conferência, ou sai da pasta`);

  console.log("");
  if (problemas) console.log(`${problemas} problema(s). Corrigir e rodar de novo.\n`);
  else console.log("Tudo certo.\n");
  return problemas;
}

// ─────────────────────────── main ───────────────────────────

const AJUDA = `
Contex OS — comunicado.js

  node scripts/comunicado.js prazo --vigencia DD/MM/AAAA [--tipo reajuste] [--minimo 30]
                                   [--acao DD/MM/AAAA] [--hoje DD/MM/AAAA] [--feriado DD/MM] [--json]
  node scripts/comunicado.js conferir <pasta-do-comunicado> [--hoje DD/MM/AAAA]

Tipos: ${Object.keys(TIPOS).join(", ")}
`;

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const o = lerArgs(argv.slice(1));

  if (!cmd || cmd === "-h" || cmd === "--help") { console.log(AJUDA); process.exit(0); }

  if (cmd === "prazo") {
    if (!o.vigencia || o.vigencia === true) morrer("falta --vigencia DD/MM/AAAA", "é o dia em que a mudança passa a valer. Sem ela não tem prazo pra calcular.");
    let minimo = 30, tipo = null, fonte = null;
    if (o.tipo && o.tipo !== true) {
      tipo = String(o.tipo);
      if (!TIPOS[tipo]) morrer(`tipo "${tipo}" não existe`, `use um de: ${Object.keys(TIPOS).join(", ")}`);
      minimo = TIPOS[tipo].dias;
    }
    if (o.minimo && o.minimo !== true) {
      const n = br.numero(o.minimo);
      if (!(n >= 0)) morrer(`--minimo "${o.minimo}" não é um número de dias`);
      if (tipo && TIPOS[tipo].lei && n < TIPOS[tipo].dias) {
        morrer(`--minimo ${n} é menor que o mínimo do tipo "${tipo}", que é de lei: ${TIPOS[tipo].dias} dias`, `${TIPOS[tipo].fonte}\n  Pra calcular com outro prazo, tire o --tipo e assuma o número como seu.`);
      }
      if (tipo) fonte = `${n} dias informados na mão; o tipo "${tipo}" pede ${TIPOS[tipo].dias} (${TIPOS[tipo].fonte})`;
      minimo = n;
    }
    const feriados = o.feriado ? [].concat(o.feriado).filter((x) => x !== true) : [];
    let r;
    try {
      r = calcularPrazo({ vigencia: o.vigencia, hoje: o.hoje !== true ? o.hoje : null, minimo, acao: o.acao !== true ? o.acao : null, feriados, tipo, fonte });
    } catch (e) { morrer(e.message); }
    if (o.json) console.log(JSON.stringify(r, null, 2));
    else imprimirPrazo(r);
    const acaoOk = !r.acao || (r.acao.antesDaVigencia && r.acao.depoisDoDisparo);
    process.exit(r.cabe && !r.retroativo && acaoOk ? 0 : 1);
  }

  if (cmd === "conferir") {
    const pasta = o._[0];
    if (!pasta) morrer("falta a pasta do comunicado", "ex: node scripts/comunicado.js conferir comunicacao/2027-01-29-reajuste");
    if (!fs.existsSync(pasta)) morrer(`pasta "${pasta}" não existe`);
    const n = conferir(pasta, { hoje: o.hoje !== true ? o.hoje : null });
    process.exit(n ? 1 : 0);
  }

  morrer(`comando "${cmd}" não existe`, AJUDA.trim());
}

if (require.main === module) main();

module.exports = { calcularPrazo, conferir, declarado, datasDe, TIPOS, ITENS };
