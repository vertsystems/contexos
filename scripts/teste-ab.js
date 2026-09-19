#!/usr/bin/env node
/**
 * Contex OS — teste-ab.js
 * Faz a conta do teste A/B: quantas visitas cada versão precisa, quantos dias
 * isso leva com o tráfego que existe, e, no fim, se a diferença observada é
 * resultado ou ruído.
 *
 * Existe porque essa conta é a que mais se erra de cabeça. Com 2% de conversão
 * e a intenção de enxergar 20% de melhora, cada versão precisa de mais de
 * 20 mil visitas. Quem não faz a conta antes começa o teste, olha no terceiro
 * dia, vê a versão B "ganhando" e troca a página por causa de ruído.
 *
 * Uso:
 *   node scripts/teste-ab.js amostra --taxa <%> --efeito <%> [--visitas <por mês>]
 *   node scripts/teste-ab.js ler --a <visitas>/<conversões> --b <visitas>/<conversões>
 *   node scripts/teste-ab.js tabela
 *
 * Exemplos:
 *   node scripts/teste-ab.js amostra --taxa 2,5 --efeito 20 --visitas 3000
 *   node scripts/teste-ab.js ler --a 1480/37 --b 1502/51
 *   node scripts/teste-ab.js ler --a 1480/37 --b 1502/51 --guarda-a 1480/210 --guarda-b 1502/168
 *
 * Opções:
 *   --taxa <%>        taxa de conversão atual da página, do anúncio ou da oferta (ex: 2,5)
 *   --efeito <%>      melhora RELATIVA mínima que vale detectar (ex: 20 = de 2,5% pra 3,0%)
 *   --visitas <n>     visitas (ou impressões, ou envios) por mês; com isso sai a duração
 *   --variantes <n>   quantas versões ao todo, contando o controle (padrão: 2)
 *   --confianca <%>   nível de confiança (padrão: 95)
 *   --poder <%>       poder estatístico (padrão: 80)
 *   --a, --b          visitas/conversões de cada versão, no formato 1480/37
 *   --guarda-a/-b     a métrica de guarda de cada versão, no mesmo formato (opcional)
 *   --planejado <n>   amostra por versão que foi planejada, pra acusar leitura antes da hora
 *   --json            saída em JSON (pra outra skill ler)
 *
 * Node 18+. Sem dependência. Teste bicaudal de duas proporções, a fórmula
 * clássica. As calculadoras de mercado usam variantes dela e chegam a números
 * parecidos (diferença de poucos por cento), nunca a outra ordem de grandeza.
 * Com mais de duas versões, a confiança é apertada (Bonferroni) pra compensar
 * as comparações extras contra o controle.
 */

const args = process.argv.slice(2);
const comando = args[0];

// ── leitura de argumentos ──────────────────────────────────────────────

function opcao(nome, padrao) {
  const i = args.indexOf(`--${nome}`);
  if (i === -1) return padrao;
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) return true;
  return v;
}

function numero(valor, nome) {
  if (valor === undefined || valor === true) return undefined;
  const n = Number(normalizar(String(valor)));
  if (!Number.isFinite(n)) morrer(`--${nome} precisa ser número; veio "${valor}"`);
  return n;
}

/**
 * Aceita os dois formatos: "2,5" e "1.480" (brasileiro) e "2.5" (teclado numérico).
 * Ponto seguido de exatamente três dígitos, sem vírgula, é milhar; senão é decimal.
 */
function normalizar(s) {
  s = s.trim().replace("%", "");
  if (s.includes(",")) return s.replace(/\./g, "").replace(",", ".");
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return s.replace(/\./g, "");
  return s;
}

/** "1480/37" → { n: 1480, c: 37 } */
function par(valor, nome) {
  if (valor === undefined || valor === true) morrer(`falta --${nome} no formato visitas/conversões, ex: --${nome} 1480/37`);
  const m = String(valor).match(/^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/);
  if (!m) morrer(`--${nome} precisa ser visitas/conversões, ex: 1480/37; veio "${valor}"`);
  const n = Number(normalizar(m[1]));
  const c = Number(normalizar(m[2]));
  if (c > n) morrer(`--${nome}: ${c} conversões em ${n} visitas não existe; confira a ordem (visitas primeiro)`);
  if (n === 0) morrer(`--${nome}: zero visitas`);
  return { n, c };
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

// ── estatística (sem biblioteca) ───────────────────────────────────────

/** Função erro, aproximação de Abramowitz e Stegun 7.1.26 (erro < 1,5e-7). */
function erf(x) {
  const sinal = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sinal * y;
}

/** Distribuição normal acumulada. */
function phi(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Inversa da normal (Acklam), boa até a quinta casa: basta pra z de 1,96 e 0,84. */
function phiInv(p) {
  if (p <= 0 || p >= 1) morrer(`probabilidade fora de (0,1): ${p}`);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425, ph = 1 - pl;
  let q, r;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= ph) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/**
 * Amostra por versão pra detectar p1 → p2 (teste bicaudal de duas proporções).
 * A fórmula clássica: n = (zα·√(2·p̄·(1−p̄)) + zβ·√(p1(1−p1) + p2(1−p2)))² / (p2−p1)²
 */
function amostraPorVersao(p1, p2, confianca, poder) {
  const za = phiInv(1 - (1 - confianca) / 2);
  const zb = phiInv(poder);
  const pm = (p1 + p2) / 2;
  const num = za * Math.sqrt(2 * pm * (1 - pm)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((num * num) / ((p2 - p1) * (p2 - p1)));
}

/** Teste z de duas proporções (pooled) mais intervalo de 95% da diferença. */
function comparar(a, b, confianca) {
  const p1 = a.c / a.n, p2 = b.c / b.n;
  const pp = (a.c + b.c) / (a.n + b.n);
  const se = Math.sqrt(pp * (1 - pp) * (1 / a.n + 1 / b.n));
  const z = se === 0 ? 0 : (p2 - p1) / se;
  const pvalor = 2 * (1 - phi(Math.abs(z)));
  const za = phiInv(1 - (1 - confianca) / 2);
  const seDif = Math.sqrt(p1 * (1 - p1) / a.n + p2 * (1 - p2) / b.n);
  const dif = p2 - p1;
  return {
    p1, p2, dif, z, pvalor,
    lift: p1 === 0 ? null : dif / p1,
    ic: [dif - za * seDif, dif + za * seDif],
    significativo: pvalor < 1 - confianca,
  };
}

// ── formatação ─────────────────────────────────────────────────────────

const fmtN = (n) => Math.round(n).toLocaleString("pt-BR");
const fmtPct = (x, casas = 2) => (x * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
const fmtPctBruto = (x, casas = 1) => x.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas }) + "%";

function ok(msg) { console.log(`  ✔ ${msg}`); }
function aviso(msg) { console.log(`  ⚠ ${msg}`); }
function info(msg) { console.log(`  · ${msg}`); }

// ── comandos ───────────────────────────────────────────────────────────

function cmdAmostra() {
  const taxa = numero(opcao("taxa"), "taxa");
  const efeito = numero(opcao("efeito"), "efeito");
  const visitas = numero(opcao("visitas"), "visitas");
  const variantes = numero(opcao("variantes", 2), "variantes");
  const confianca = numero(opcao("confianca", 95), "confianca") / 100;
  const poder = numero(opcao("poder", 80), "poder") / 100;
  if (taxa === undefined || efeito === undefined) morrer("faltou --taxa ou --efeito", "ex: node scripts/teste-ab.js amostra --taxa 2,5 --efeito 20 --visitas 3000");
  if (taxa <= 0 || taxa >= 100) morrer(`--taxa precisa estar entre 0 e 100 (é a conversão atual em %); veio ${taxa}`);
  if (efeito <= 0) morrer("--efeito precisa ser maior que zero (é a melhora relativa mínima que vale detectar, em %)");
  if (variantes < 2) morrer("--variantes precisa ser 2 ou mais (o controle conta)");

  const p1 = taxa / 100;
  const p2 = Math.min(0.9999, p1 * (1 + efeito / 100));
  // com 3 versões são 2 comparações contra o controle: a confiança de cada uma sobe (Bonferroni)
  const comparacoes = variantes - 1;
  const confiancaAjustada = 1 - (1 - confianca) / comparacoes;
  const porVersao = amostraPorVersao(p1, p2, confiancaAjustada, poder);
  const total = porVersao * variantes;
  const conversoesEsperadas = Math.round(porVersao * p1);

  const saida = { taxaAtual: p1, taxaAlvo: p2, efeitoRelativo: efeito / 100, porVersao, total, variantes, confianca, confiancaAjustada, poder };

  if (visitas) {
    const porDia = visitas / 30;
    const diasBrutos = Math.ceil(total / porDia);
    const dias = Math.max(14, diasBrutos);          // nunca menos de duas semanas inteiras
    const semanas = Math.ceil(dias / 7);
    Object.assign(saida, { visitasMes: visitas, diasBrutos, dias, semanas });
    saida.veredito = dias <= 28 ? "cabe" : dias <= 56 ? "aperta" : "nao-fecha";
  }

  if (opcao("json")) { console.log(JSON.stringify(saida, null, 2)); return; }

  console.log(`\nAmostra pro teste A/B (confiança ${fmtPctBruto(confianca * 100)}, poder ${fmtPctBruto(poder * 100)})\n`);
  info(`taxa atual ${fmtPct(p1)} → precisa enxergar ${fmtPct(p2)} (melhora relativa de ${fmtPctBruto(efeito)})`);
  info(`${fmtN(porVersao)} visitas por versão · ${variantes} versões · ${fmtN(total)} no total`);
  info(`isso dá cerca de ${fmtN(conversoesEsperadas)} conversões por versão no ritmo atual`);
  if (variantes > 2) aviso(`${variantes} versões = ${comparacoes} comparações contra o controle. A confiança de cada uma foi apertada pra ${fmtPctBruto(confiancaAjustada * 100)} pra não inflar o falso positivo, e por isso cada versão pede mais visitas. Duas versões fecham mais rápido`);

  if (!visitas) {
    console.log("");
    aviso("sem --visitas não dá pra dizer quantos dias leva. Rode de novo com o tráfego mensal da página");
    return;
  }

  console.log("");
  info(`${fmtN(visitas)} visitas por mês ≈ ${fmtN(visitas / 30)} por dia → ${fmtN(saida.diasBrutos)} dias pra juntar a amostra`);
  if (saida.diasBrutos < 14) info("duração ajustada pra 14 dias: menos que duas semanas inteiras confunde dia da semana com efeito");
  console.log("");
  if (saida.veredito === "cabe") ok(`cabe: ${saida.dias} dias (${saida.semanas} semanas). Marque a data de fim antes de começar`);
  else if (saida.veredito === "aperta") aviso(`aperta: ${saida.dias} dias (${saida.semanas} semanas). Dá pra rodar, mas qualquer mudança no tráfego nesse período contamina. Se puder, teste uma mudança maior (efeito maior = amostra menor)`);
  else {
    aviso(`não fecha: ${saida.dias} dias (${saida.semanas} semanas) é mais que dois meses. O teste vai morrer antes da conclusão`);
    console.log("");
    console.log("  Alternativas, na ordem:");
    console.log("    1. Testar uma mudança grande (oferta, headline inteira, preço): efeito grande pede amostra pequena. Rode de novo com --efeito maior e veja");
    console.log("    2. Teste sequencial por período: duas semanas com A, duas com B, mesma origem de tráfego, e ler com `ler` (cada período é uma versão)");
    console.log("    3. Perguntar em vez de medir: cinco entrevistas do /publico dizem mais que um teste que nunca fecha");
    console.log("    4. Aplicar a correção direto e comparar 30 dias antes com 30 dias depois");
    console.log("    5. Testar no anúncio, não na página: a taxa de clique tem muito mais volume, e o ângulo vencedor vira a headline");
  }
  console.log("");
}

function cmdLer() {
  const a = par(opcao("a"), "a");
  const b = par(opcao("b"), "b");
  const confianca = numero(opcao("confianca", 95), "confianca") / 100;
  const planejado = numero(opcao("planejado"), "planejado");
  const r = comparar(a, b, confianca);

  const guardaA = opcao("guarda-a"), guardaB = opcao("guarda-b");
  let guarda = null;
  if (guardaA !== undefined || guardaB !== undefined) {
    if (guardaA === undefined || guardaB === undefined) morrer("--guarda-a e --guarda-b vêm juntos");
    guarda = comparar(par(guardaA, "guarda-a"), par(guardaB, "guarda-b"), confianca);
  }

  const amostraMinima = Math.min(a.n, b.n);
  const conversoesMinimas = Math.min(a.c, b.c);
  let veredito;
  if (r.significativo && r.dif > 0) veredito = "ganhou";
  else if (r.significativo && r.dif < 0) veredito = "perdeu";
  else veredito = "inconclusivo";

  // amostra que seria necessária pra detectar a diferença que apareceu
  const precisaria = r.p1 > 0 && r.p2 > 0 && r.p1 !== r.p2 ? amostraPorVersao(r.p1, r.p2, confianca, 0.8) : null;

  const saida = {
    a: { ...a, taxa: r.p1 }, b: { ...b, taxa: r.p2 },
    diferencaAbsoluta: r.dif, liftRelativo: r.lift, z: r.z, pvalor: r.pvalor, ic95: r.ic,
    veredito, planejado: planejado ?? null, precisariaPorVersao: precisaria,
    guarda: guarda ? { taxaA: guarda.p1, taxaB: guarda.p2, pvalor: guarda.pvalor, caiu: guarda.significativo && guarda.dif < 0 } : null,
  };
  if (opcao("json")) { console.log(JSON.stringify(saida, null, 2)); return; }

  console.log(`\nLeitura do teste (confiança ${fmtPctBruto(confianca * 100)})\n`);
  info(`A: ${fmtN(a.c)} de ${fmtN(a.n)} = ${fmtPct(r.p1)}`);
  info(`B: ${fmtN(b.c)} de ${fmtN(b.n)} = ${fmtPct(r.p2)}`);
  info(`diferença: ${r.dif >= 0 ? "+" : ""}${fmtPct(r.dif)} em pontos${r.lift === null ? "" : ` (${r.lift >= 0 ? "+" : ""}${fmtPctBruto(r.lift * 100)} relativo)`}`);
  info(`intervalo de ${fmtPctBruto(confianca * 100)} da diferença: ${fmtPct(r.ic[0])} a ${fmtPct(r.ic[1])}`);
  info(`z = ${r.z.toFixed(2).replace(".", ",")} · p = ${r.pvalor < 0.0001 ? "< 0,0001" : r.pvalor.toFixed(4).replace(".", ",")}`);
  console.log("");

  if (planejado && amostraMinima < planejado) {
    aviso(`amostra planejada era ${fmtN(planejado)} por versão e a menor tem ${fmtN(amostraMinima)}. Leitura antes da hora: o que aparece abaixo pode virar ao contrário até o fim`);
  }
  if (conversoesMinimas < 25) aviso(`uma das versões tem só ${conversoesMinimas} conversões. Abaixo de ~25 por versão o teste z é grosseiro; segure a conclusão`);
  if (Math.abs(a.n - b.n) / Math.max(a.n, b.n) > 0.1) aviso(`as versões receberam volumes diferentes (${fmtN(a.n)} × ${fmtN(b.n)}). Divisão desigual costuma ser bug de ferramenta ou período diferente; confira antes de concluir`);

  if (veredito === "ganhou") ok(`B ganhou: a diferença é maior que o ruído esperado. Publicar B e registrar o aprendizado`);
  else if (veredito === "perdeu") ok(`B perdeu: ficou pior que o controle, e não é acaso. Manter A e registrar o que a hipótese errou`);
  else {
    aviso("inconclusivo: a diferença que apareceu cabe dentro do ruído. Nem ganhou nem perdeu");
    if (precisaria) info(`pra ter certeza de uma diferença desse tamanho, cada versão precisaria de ${fmtN(precisaria)} visitas`);
    info("se o teste já bateu a amostra planejada: encerre, mantenha A (é grátis) e teste uma mudança maior");
    info("se ainda não bateu: continue até a data marcada, sem olhar todo dia");
  }

  if (guarda) {
    console.log("");
    info(`métrica de guarda: A ${fmtPct(guarda.p1)} · B ${fmtPct(guarda.p2)} · p = ${guarda.pvalor.toFixed(4).replace(".", ",")}`);
    if (saida.guarda.caiu) aviso("a guarda caiu com B de forma significativa. Mesmo que a primária tenha subido, B não pode ser publicado como está");
    else ok("a guarda não piorou de forma detectável");
  }
  console.log("");
}

function cmdTabela() {
  const taxas = [0.5, 1, 2, 3, 5, 10, 20];
  const efeitos = [10, 20, 30, 50];
  console.log("\nVisitas POR VERSÃO (confiança 95%, poder 80%, duas versões). Dobre pro total.\n");
  console.log(`| Taxa atual | ${efeitos.map((e) => `+${e}%`).join(" | ")} |`);
  console.log(`|---|${efeitos.map(() => "---").join("|")}|`);
  for (const t of taxas) {
    const linha = efeitos.map((e) => fmtN(amostraPorVersao(t / 100, (t / 100) * (1 + e / 100), 0.95, 0.8)));
    console.log(`| ${t.toLocaleString("pt-BR")}% | ${linha.join(" | ")} |`);
  }
  console.log("\nLeitura: com 2% de conversão, pra enxergar +20% (de 2% pra 2,4%) cada versão precisa da coluna +20% na linha 2%.\n");
}

// ── despacho ───────────────────────────────────────────────────────────

const comandos = { amostra: cmdAmostra, ler: cmdLer, tabela: cmdTabela };

if (!comando || opcao("help") || comando === "--help" || comando === "-h" || !comandos[comando]) {
  console.log(`
Contex OS — teste-ab.js: a conta do teste A/B

  node scripts/teste-ab.js amostra --taxa 2,5 --efeito 20 --visitas 3000
      quantas visitas por versão e quantos dias leva com o tráfego atual

  node scripts/teste-ab.js ler --a 1480/37 --b 1502/51 [--planejado 5000] [--guarda-a n/c --guarda-b n/c]
      ganhou, perdeu ou inconclusivo, com intervalo e p-valor

  node scripts/teste-ab.js tabela
      a tabela de amostra mínima por taxa base e efeito

Opções comuns: --variantes 2 · --confianca 95 · --poder 80 · --json
`);
  process.exit(comando && !comandos[comando] && comando !== "--help" && comando !== "-h" ? 1 : 0);
}

comandos[comando]();
