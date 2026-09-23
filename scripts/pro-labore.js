#!/usr/bin/env node
/**
 * Contex OS — pro-labore.js
 * Acha o pró-labore que segura a alíquota do Anexo III do Simples (Fator R de
 * 28%), soma o que esse pró-labore custa de INSS e de IRRF, compara com a
 * economia de DAS, e calcula quanto ainda pode sair como distribuição de lucro
 * isenta sem escrituração contábil.
 *
 * Existe porque a pergunta "quanto eu tiro pra mim" tem duas respostas que se
 * contradizem quando ninguém faz a conta. A primeira é "tire o mínimo, imposto
 * é caro", e ela joga a empresa de serviço no Anexo V, onde a alíquota começa
 * em 15,5% em vez de 6%. A segunda é "tire o máximo pra cruzar o Fator R", e
 * ela paga 11% de INSS mais IRRF de até 27,5% sobre dinheiro que sairia isento
 * como lucro. Qual das duas vale depende de quatro números, e aqui eles entram
 * como argumento em vez de palpite.
 *
 * As tabelas de INSS e de IRRF não são reescritas: vêm do scripts/custo-funcionario.js,
 * que já as carrega com portaria, lei e data. Terceira cópia seria a que diverge.
 *
 * Uso:
 *   node scripts/pro-labore.js --anexo V --receita12 360000 --folha12 0 --prolabore 1621
 *   node scripts/pro-labore.js --anexo V --receita12 480000 --folha12 96000 --prolabore 3000 --sobra 22000 --md financeiro/retirada.md
 *   node scripts/pro-labore.js --regime mei --receita12 78000
 *
 * Opções:
 *   --anexo <III|V>        anexo do Simples (obrigatório quando --regime simples)
 *   --regime <r>           simples | mei | presumido | real (padrão simples)
 *   --receita12 <valor>    receita bruta dos últimos 12 meses, a RBT12 (obrigatório)
 *   --receita-mes <valor>  receita do mês, pro DAS mensal (padrão: receita12 ÷ 12)
 *   --folha12 <valor>      folha de EMPREGADOS dos últimos 12 meses, com FGTS e INSS
 *                          patronal recolhido, SEM o pró-labore (padrão 0)
 *   --prolabore <valor>    pró-labore mensal que o sócio recebe hoje (padrão: salário mínimo)
 *   --socios <n>           quantos sócios recebem pró-labore (padrão 1; o alvo é o total)
 *   --dependentes <n>      dependentes do sócio, pro IRRF (padrão 0)
 *   --sobra <valor>        quanto sobra por mês depois de todos os custos, antes da
 *                          retirada (do /caixa). Sem isso o script não diz se o alvo cabe
 *   --distribuir <valor>   quanto o sócio pretende receber por mês como lucro
 *   --presuncao <8|16|32>  percentual de presunção do art. 15 da Lei 9.249/1995
 *                          (padrão 32 pra serviço; 8 pra comércio e indústria)
 *   --nome <texto>         nome do negócio, pro título do relatório
 *   --md <arquivo.md>      grava o relatório em markdown
 *   --json                 imprime só os números
 *
 * Node 18+, sem dependência de npm.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");
const cf = require("./custo-funcionario.js");

// ─────────────────────────── tabelas datadas ───────────────────────────
// Tudo aqui muda por lei complementar, lei ordinária ou portaria. A skill manda
// reconferir antes de entregar; o molde é templates/operacao/pro-labore.md.

const TABELAS = {
  conferidoEm: "22/09/2026",

  salarioMinimo: cf.TABELAS.salarioMinimo,
  inssTeto: {
    valor: cf.TABELAS.inss.faixas[cf.TABELAS.inss.faixas.length - 1][0],
    fonte: cf.TABELAS.inss.fonte,
  },
  inssSocio: {
    pct: 0.11,
    fonte: "11% = 20% da alíquota do contribuinte individual (Lei 8.212/1991, art. 21) menos a dedução de 45% da contribuição patronal, limitada a 9% do salário de contribuição (art. 30, §4º), https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm; quem retém e recolhe é a empresa (Lei 10.666/2003, art. 4º), https://www.planalto.gov.br/ccivil_03/leis/2003/l10.666.htm",
  },
  patronalDispensada: {
    fonte: "LC 123/2006, art. 13, VI e art. 18, §5º-C (a CPP patronal está dentro do DAS, exceto no Anexo IV), https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm",
  },
  irrf: cf.TABELAS.irrf,

  fatorR: {
    piso: 0.28,
    fonte: "LC 123/2006, art. 18, §5º-J e §5º-M (28% de folha sobre receita joga a atividade do Anexo V pro Anexo III); §5º-K manda olhar os montantes pagos e auferidos nos doze meses anteriores ao período de apuração; §24 define folha de salários incluídos encargos, com as retiradas de pró-labore dentro, https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm",
  },

  // Anexos do Simples: [teto da faixa, alíquota nominal, parcela a deduzir]
  anexos: {
    III: {
      nome: "Anexo III — serviço em geral",
      faixas: [
        [180000, 0.06, 0],
        [360000, 0.112, 9360],
        [720000, 0.135, 17640],
        [1800000, 0.16, 35640],
        [3600000, 0.21, 125640],
        [4800000, 0.33, 648000],
      ],
    },
    V: {
      nome: "Anexo V — serviço intelectual",
      faixas: [
        [180000, 0.155, 0],
        [360000, 0.18, 4500],
        [720000, 0.195, 9900],
        [1800000, 0.205, 17100],
        [3600000, 0.23, 62100],
        [4800000, 0.305, 540000],
      ],
    },
  },
  anexosFonte: "LC 123/2006, Anexos III e V, na redação da LC 155/2016, https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm; partilha publicada pela Receita, https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=48432",

  distribuicao: {
    presuncoes: { 8: "comércio, indústria e atividade imobiliária (Lei 9.249/1995, art. 15, caput)", 16: "transporte, exceto o de carga (art. 15, §1º, II, \"a\"); e serviço em geral de PJ com receita bruta anual até R$ 120 mil, fora de serviço hospitalar, transporte e profissão legalmente regulamentada (Lei 9.250/1995, art. 40 e parágrafo único)", 32: "serviço em geral, intermediação de negócios, administração, locação ou cessão de bens e direitos (art. 15, §1º, III)" },
    fonte: "LC 123/2006, art. 14, §1º e §2º (isenção limitada à presunção menos o valor devido no Simples no período, salvo escrituração contábil que evidencie lucro maior), https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm; percentuais no art. 15 da Lei 9.249/1995, https://www.planalto.gov.br/ccivil_03/leis/l9249.htm, e no art. 40 da Lei 9.250/1995, https://www.planalto.gov.br/ccivil_03/leis/l9250.htm",
  },
  dividendos: {
    limiteMensal: 50000,
    pct: 0.10,
    fonte: "Lei 15.270/2025, que inseriu o art. 6º-A na Lei 9.250/1995: lucro e dividendo pagos pela mesma PJ à mesma pessoa física residente no Brasil acima de R$ 50 mil no mesmo mês têm 10% retidos na fonte desde janeiro de 2026, vedada qualquer dedução da base (§1º), e com recálculo quando há mais de um pagamento no mês (§2º). O §3º só deixa de fora o que cumpre as três condições juntas: resultado apurado até o ano-calendário de 2025, distribuição aprovada até 31/12/2025 e pagamento nos termos originalmente previstos no ato de aprovação, https://www.planalto.gov.br/ccivil_03/leis/l9250.htm",
  },
  semDiscriminacao: {
    fonte: "o sócio que recebe remuneração pelo trabalho é contribuinte individual (Lei 8.212/1991, art. 12, V, \"f\") e a base é a remuneração auferida no mês (art. 28, III), https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm; a base de cálculo do contribuinte individual é o total pago ou creditado a qualquer título no mês (IN RFB 2.110/2022, art. 33, II), https://normas.receita.fazenda.gov.br. Sem discriminação entre o que é trabalho e o que é lucro, a retirada inteira é tratada como remuneração [confirmar o dispositivo exato com o contador]",
  },
};

// Arredonda pra cima no real inteiro, ignorando resto de ponto flutuante:
// 480000 × 0,28 dá 134400,00000000001 em JavaScript, e sem isso o alvo subia R$ 1
// sem motivo. A margem de um centésimo de centavo não muda decisão nenhuma.
const praCima = (v) => Math.ceil(v - 1e-6);

const ANEXOS_FATOR_R = ["III", "V"];
const REGIMES = ["simples", "mei", "presumido", "real"];
const c2 = br.centavos;

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
      if (v === undefined || (v.startsWith("--") && v.length > 2)) o[k] = true;
      else { o[k] = v; i++; }
    } else o._.push(a);
  }
  return o;
}

function num(v, nome, padrao) {
  if (v === undefined || v === true) {
    if (padrao !== undefined) return padrao;
    morrer(`falta --${nome}`, `ex.: --${nome} 360000`);
  }
  const n = br.numero(v);
  if (isNaN(n) || n < 0) morrer(`--${nome} não é número: ${JSON.stringify(v)}`, 'aceita "360.000,00", "360000" ou "360000.50"');
  return n;
}

// ─────────────────────────── as contas ───────────────────────────

/**
 * Alíquota efetiva do Simples: (RBT12 × nominal − parcela a deduzir) ÷ RBT12.
 * É ela que se paga, nunca a da tabela. RBT12 zero devolve a nominal da 1ª faixa.
 */
function aliquotaEfetiva(anexo, rbt12) {
  const tab = TABELAS.anexos[anexo];
  if (!tab) throw new Error(`anexo ${anexo} não está na tabela (só III e V têm Fator R)`);
  const idx = tab.faixas.findIndex(([teto]) => rbt12 <= teto);
  if (idx === -1) return { faixa: null, nominal: null, deduzir: null, efetiva: null, acimaDoTeto: true };
  const [, nominal, deduzir] = tab.faixas[idx];
  const efetiva = rbt12 > 0 ? (rbt12 * nominal - deduzir) / rbt12 : nominal;
  return { faixa: idx + 1, nominal, deduzir, efetiva: Math.max(0, efetiva), acimaDoTeto: false };
}

/**
 * RBT12 a partir do qual o Anexo V fica mais barato que o III.
 * Na 6ª faixa a nominal do III é maior (33% contra 30,5%), mas a parcela a
 * deduzir também (R$ 648 mil contra R$ 540 mil), e as duas curvas só se cruzam
 * onde a diferença de dedução empata com a diferença de alíquota. Não é o começo
 * da faixa: é R$ 4.320.000 com as tabelas de hoje.
 */
function pontoDeInversao() {
  const [, nomIII, dedIII] = TABELAS.anexos.III.faixas[5];
  const [, nomV, dedV] = TABELAS.anexos.V.faixas[5];
  return c2((dedIII - dedV) / (nomIII - nomV));
}

/** INSS do sócio: 11% sobre o pró-labore, limitado ao teto do salário de contribuição. */
function inssSocio(prolabore) {
  const base = Math.min(prolabore, TABELAS.inssTeto.valor);
  return { base: c2(base), valor: c2(base * TABELAS.inssSocio.pct) };
}

/** O que sai do pró-labore antes de chegar na conta do sócio: INSS mais IRRF. */
function custoProlabore(prolabore, dependentes = 0) {
  if (prolabore <= 0) return { prolabore: 0, inss: 0, irrf: 0, redutor: 0, liquido: 0, custo: 0, baseInss: 0 };
  const i = inssSocio(prolabore);
  const ir = cf.irrfEmpregado(prolabore, i.valor, dependentes);
  return {
    prolabore: c2(prolabore),
    baseInss: i.base,
    inss: i.valor,
    irrf: ir.imposto,
    redutor: ir.redutor,
    liquido: c2(prolabore - i.valor - ir.imposto),
    custo: c2(i.valor + ir.imposto),
  };
}

/**
 * Custo de um pró-labore TOTAL repartido entre N sócios em partes iguais.
 * Cada sócio tem INSS e IRRF próprios, e a tabela do IRRF é progressiva: dois
 * pró-labores de R$ 6.000 custam bem menos imposto que um de R$ 12.000. Somar o
 * total numa única pessoa inflaria o custo e podia inverter o veredito.
 */
function custoRepartido(total, socios = 1, dependentes = 0) {
  const n = Math.max(1, Math.round(socios));
  const porSocio = custoProlabore(total / n, dependentes);
  return {
    prolabore: c2(total),
    porSocio,
    socios: n,
    baseInss: c2(porSocio.baseInss * n),
    inss: c2(porSocio.inss * n),
    irrf: c2(porSocio.irrf * n),
    redutor: c2(porSocio.redutor * n),
    liquido: c2(porSocio.liquido * n),
    custo: c2(porSocio.custo * n),
  };
}

/** Fator R: folha dos 12 meses (com pró-labore) ÷ receita bruta dos 12 meses. */
function fatorR(folha12, receita12) {
  return receita12 > 0 ? folha12 / receita12 : 0;
}

/**
 * Pró-labore mensal que, mantido por 12 meses, leva a folha a 28% da receita.
 * Arredonda pra cima no real inteiro: 27,999% cai no Anexo V, e o alvo não pode
 * ficar na casa decimal.
 */
function prolaboreAlvo({ receita12, folha12Empregados, prolaboreAtual }) {
  const folhaAlvo = receita12 * TABELAS.fatorR.piso;
  const folhaHoje = folha12Empregados + prolaboreAtual * 12;
  const falta = folhaAlvo - folhaHoje;
  const bruto = prolaboreAtual + Math.max(0, falta) / 12;
  const alvo = Math.max(praCima(bruto), TABELAS.salarioMinimo.valor);
  // Quanto de pró-labore a folha ainda exige se os empregados já fazem o serviço.
  const minimo = Math.max(praCima(Math.max(0, folhaAlvo - folha12Empregados) / 12), TABELAS.salarioMinimo.valor);
  return {
    folhaAlvo: c2(folhaAlvo),
    folhaHoje: c2(folhaHoje),
    falta: c2(Math.max(0, falta)),
    // Tolerância de um centavo: 27,999999% é 28%, e float não é conta de contador.
    alvo: c2(alvo),
    minimo: c2(minimo),
    jaCruzou: falta <= 0.01,
  };
}

/**
 * Teto da distribuição de lucro isenta sem escrituração contábil:
 * presunção × receita bruta do período − o DAS devido no período (LC 123, art. 14, §1º).
 */
function distribuicaoIsenta({ receita12, presuncao, dasAno }) {
  const presumido = receita12 * (presuncao / 100);
  const limite = Math.max(0, presumido - dasAno);
  return { presumido: c2(presumido), dasAno: c2(dasAno), limiteAno: c2(limite), limiteMes: c2(limite / 12) };
}

/** A simulação inteira. Devolve só números e avisos; quem escreve texto é o markdown(). */
function simular(e) {
  const avisos = [];
  const regime = String(e.regime || "simples").toLowerCase();
  if (!REGIMES.includes(regime)) morrer(`--regime precisa ser um de: ${REGIMES.join(", ")}`);

  if (regime !== "simples") return { naoSeAplica: motivoNaoSeAplica(regime, e), regime, entrada: e };

  const anexo = String(e.anexo || "").toUpperCase();
  if (!ANEXOS_FATOR_R.includes(anexo)) {
    morrer("--anexo precisa ser III ou V", "Fator R só existe entre esses dois. Comércio (I), indústria (II) e Anexo IV não têm essa escolha: rodar o /obrigacoes pra alíquota e o /custo-de-funcionario pra folha");
  }
  if (e.receita12 <= 0) morrer("--receita12 precisa ser maior que zero", "é a receita bruta dos últimos 12 meses; empresa nova soma o que já faturou e o script avisa que a base é curta");
  if (e.receita12 > 4800000) morrer(`--receita12 de ${br.reais(e.receita12)} passa do teto do Simples (R$ 4.800.000)`, "acima disso a empresa sai do Simples, o Fator R deixa de existir e a conversa é outra: levar ao contador");
  if (e.socios < 1) morrer("--socios precisa ser 1 ou mais");

  const alvo = prolaboreAlvo(e);
  const hojeCusto = custoRepartido(e.prolaboreAtual, e.socios, e.dependentes);
  const alvoCusto = custoRepartido(alvo.alvo, e.socios, e.dependentes);

  const efV = aliquotaEfetiva("V", e.receita12);
  const efIII = aliquotaEfetiva("III", e.receita12);
  const dasAnoV = c2(e.receita12 * efV.efetiva);
  const dasAnoIII = c2(e.receita12 * efIII.efetiva);
  const economiaAno = c2(dasAnoV - dasAnoIII);

  const custoExtraMes = c2(alvoCusto.custo - hojeCusto.custo);
  const custoExtraAno = c2(custoExtraMes * 12);
  const saldoAno = c2(economiaAno - custoExtraAno);

  // O anexo que vai valer depois da mudança, e o DAS que o arquivo mostra.
  const anexoDepois = alvo.jaCruzou || saldoAno > 0 ? "III" : anexo;
  const dasAnoAtual = anexo === "III" ? dasAnoIII : dasAnoV;
  const dasAnoDepois = anexoDepois === "III" ? dasAnoIII : dasAnoV;

  const isenta = distribuicaoIsenta({ receita12: e.receita12, presuncao: e.presuncao, dasAno: dasAnoDepois });

  const prolaboreRecomendado = alvo.jaCruzou
    ? Math.max(e.prolaboreAtual, TABELAS.salarioMinimo.valor)
    : saldoAno > 0 ? alvo.alvo : Math.max(e.prolaboreAtual, TABELAS.salarioMinimo.valor);
  const recomendadoCusto = custoRepartido(prolaboreRecomendado, e.socios, e.dependentes);

  // ── avisos que mudam a decisão ──
  // Erro de digitação que muda tudo: informar o mês no lugar do ano.
  if (e.receita12 < TABELAS.salarioMinimo.valor * 12) {
    avisos.push(`receita de ${br.reais(e.receita12)} nos 12 meses dá ${br.reais(c2(e.receita12 / 12))} por mês, menos que um salário mínimo. Confirmar se o número informado é o do ano e não o de um mês só: trocar um pelo outro inverte a recomendação`);
  }
  if (e.folha12Empregados > e.receita12) {
    avisos.push(`a folha de empregados informada (${br.reais(e.folha12Empregados)}) passa da receita dos 12 meses (${br.reais(e.receita12)}). Ou um dos dois é de um mês só, ou a empresa está pagando folha com dinheiro que não é de receita. Conferir antes de usar este arquivo`);
  }
  const inversao = pontoDeInversao();
  if (e.receita12 > inversao) {
    avisos.push(`com RBT12 de ${br.reais(e.receita12)} o Fator R joga contra: acima de ${br.reais(inversao)} a alíquota efetiva do Anexo V (${br.pct(efV.efetiva)}) fica abaixo da do Anexo III (${br.pct(efIII.efetiva)}), porque na 6ª faixa o III tem nominal maior. Cruzar os 28% aqui aumenta o DAS em ${br.reais(Math.abs(economiaAno))} no ano, e a recomendação é não perseguir a troca de anexo`);
  }
  if (anexo === "III" && !alvo.jaCruzou) {
    avisos.push(`a empresa está no Anexo III mas o Fator R de hoje é ${br.pct(fatorR(alvo.folhaHoje, e.receita12))}, abaixo de 28%: o enquadramento é recalculado mês a mês, e sem folha ela cai pro Anexo V. Conferir no PGDAS-D com o contador`);
  }
  if (!alvo.jaCruzou) {
    avisos.push("o Fator R olha os 12 meses anteriores: subir o pró-labore hoje não muda a alíquota do mês que vem. A folha acumulada entra aos poucos e o cruzamento acontece ao longo dos próximos 12 meses. Perguntar ao contador em que mês a conta vira");
  }
  // Os dois avisos abaixo olham o valor em jogo: o alvo, quando ele é a proposta;
  // o recomendado, quando a folha já cruzou e nada muda.
  const emJogo = alvo.jaCruzou ? prolaboreRecomendado : alvo.alvo;
  const porSocio = emJogo / e.socios;
  if (porSocio > TABELAS.inssTeto.valor) {
    const quem = e.socios > 1 ? `${br.reais(emJogo)} divididos por ${e.socios} sócios, ${br.reais(c2(porSocio))} para cada um,` : `o pró-labore em jogo (${br.reais(emJogo)})`;
    avisos.push(`${quem} passa do teto do salário de contribuição (${br.reais(TABELAS.inssTeto.valor)}): o INSS de cada sócio para de crescer em ${br.reais(inssSocio(porSocio).valor)} por mês, e o benefício futuro também para no teto. O IRRF continua subindo, e é ele que come a economia`);
  }
  if (e.sobra !== null && emJogo > e.sobra) {
    avisos.push(`o pró-labore ${alvo.jaCruzou ? "de hoje" : "em jogo"} (${br.reais(emJogo)} por mês) é maior do que a sobra informada (${br.reais(e.sobra)}), então ele ${alvo.jaCruzou ? "já está saindo de reserva ou de capital de giro, não da sobra do mês" : "não cabe no que o mês produz"}. Ou a receita sobe, ou a folha vem de empregado em vez de pró-labore, ou a conta do /caixa está incompleta`);
  }
  if (isenta.limiteAno <= 0) {
    avisos.push(`não sobra limite de distribuição isenta sem escrituração: a presunção de ${e.presuncao}% sobre a receita dá ${br.reais(isenta.presumido)} e o DAS do ano é ${br.reais(isenta.dasAno)}, maior que ela (LC 123/2006, art. 14, §1º). Nesse caso a escrituração contábil deixa de ser opcional pra distribuir lucro isento, e a pergunta pro contador é quanto custa o honorário a mais contra o imposto que a distribuição pagaria na pessoa física`);
  }
  if (e.distribuir !== null && e.distribuir * 12 > isenta.limiteAno) {
    avisos.push(`a distribuição pretendida (${br.reais(e.distribuir * 12)} no ano) passa do limite isento sem escrituração (${br.reais(isenta.limiteAno)}): o excedente é rendimento tributável na pessoa física, salvo escrituração contábil que evidencie lucro maior (LC 123, art. 14, §2º)`);
  }
  if (e.distribuir !== null && e.distribuir > TABELAS.dividendos.limiteMensal) {
    avisos.push(`distribuição de ${br.reais(e.distribuir)} num mês só passa de R$ 50 mil: desde janeiro de 2026 o valor tem 10% de IRPF retido na fonte (Lei 15.270/2025). Parcelar ao longo dos meses muda a retenção`);
  }
  if (e.socios > 1) {
    avisos.push(`${e.socios} sócios recebendo pró-labore: o alvo de ${br.reais(alvo.alvo)} é o TOTAL da folha de sócios, e a conta de imposto aqui supõe divisão em partes iguais, ${br.reais(c2(alvo.alvo / e.socios))} pra cada um, com INSS de ${br.reais(alvoCusto.porSocio.inss)} e IRRF de ${br.reais(alvoCusto.porSocio.irrf)} por sócio. Divisão desigual muda o IRRF, porque a tabela é progressiva: refazer com o valor de cada um quando o contrato social ou o trabalho de fato pedir proporção diferente`);
  }
  if (e.folha12Empregados === 0 && e.prolaboreAtual === 0) {
    avisos.push("folha zero nos 12 meses: se o sócio nunca retirou pró-labore formal, o que ele tirou pode ter sido lançado como distribuição. Sem discriminação entre trabalho e capital, a Receita trata o total como remuneração (IN RFB 2.110/2022, art. 33, §3º, II). Conferir com o contador antes de mudar qualquer coisa");
  }

  return {
    regime, anexo, anexoDepois, entrada: e, avisos,
    fatorHoje: fatorR(alvo.folhaHoje, e.receita12),
    fatorDepois: fatorR(e.folha12Empregados + prolaboreRecomendado * 12, e.receita12),
    alvo, hojeCusto, alvoCusto, recomendadoCusto, prolaboreRecomendado: c2(prolaboreRecomendado),
    efV, efIII, dasAnoV, dasAnoIII, dasAnoAtual, dasAnoDepois,
    dasMesDepois: c2(e.receitaMes * (anexoDepois === "III" ? efIII.efetiva : efV.efetiva)),
    economiaAno, custoExtraMes, custoExtraAno, saldoAno, isenta,
    inversao, anexoMaisBarato: efIII.efetiva <= efV.efetiva ? "III" : "V",
    vale: saldoAno > 0 && !alvo.jaCruzou,
  };
}

function motivoNaoSeAplica(regime, e) {
  if (regime === "mei") {
    return {
      titulo: "MEI: não se aplica",
      porque: [
        "MEI paga DAS de valor fixo. Não é percentual sobre a receita, então não existe anexo, não existe alíquota efetiva e não existe Fator R: subir a retirada não muda um centavo do imposto da empresa.",
        "A contribuição previdenciária do MEI já vem dentro do DAS, em 5% do salário mínimo (LC 123/2006, art. 18-A, §3º, V). Ele já é segurado. Sem pró-labore formal, sem recibo, sem folha.",
        `O que ele retira é lucro, isento até a presunção do art. 15 da Lei 9.249/1995 sobre a receita do período, menos o DAS pago (LC 123, art. 14, §1º). Com receita de ${br.reais(e.receita12)} nos 12 meses e presunção de ${e.presuncao}%, o teto isento fica perto de ${br.reais(Math.max(0, e.receita12 * (e.presuncao / 100) - 12 * cf.TABELAS.mei.dasServico))}, descontados doze DAS de ${br.reais(cf.TABELAS.mei.dasServico)} [conferir no extrato do DAS o que foi pago de fato no ano, que muda com a atividade].`,
      ],
      proximo: "A pergunta que sobra é outra. Quanto do que entra pode sair sem quebrar o caixa? Isso é o /caixa. Se a receita está encostando no teto do MEI, é o /obrigacoes.",
      fontes: [
        "DAS fixo e contribuição previdenciária do MEI: LC 123/2006, art. 18-A, §3º, V, https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm",
        `Distribuição isenta: ${TABELAS.distribuicao.fonte}`,
        `Retenção de 10%: ${TABELAS.dividendos.fonte}`,
        `Tabelas conferidas em ${TABELAS.conferidoEm}`,
      ],
    };
  }
  return {
    titulo: `Lucro ${regime === "presumido" ? "Presumido" : "Real"}: não se aplica`,
    porque: [
      "Fator R existe só dentro do Simples Nacional, entre os Anexos III e V. Aqui não há anexo pra trocar. O pró-labore deixa de ser alavanca de alíquota e volta a ser só o pagamento pelo trabalho do sócio.",
      "Fora do Simples a empresa recolhe 20% de INSS patronal sobre o pró-labore, mais RAT e terceiros (Lei 8.212/1991, art. 22). Cada real dele custa 11% do sócio e mais de 20% da empresa. No Lucro Real, em troca, ele é despesa dedutível de IRPJ e CSLL. A conta muda de sinal.",
      "A decisão de quanto retirar continua existindo, e continua importando todo mês, mas ela depende de coisas que esta simulação não enxerga: o resultado contábil do trimestre, a adição e a exclusão da base, o que já foi distribuído no ano e a retenção de 10% sobre o que passar de R$ 50 mil no mês (Lei 15.270/2025). Isso é planejamento tributário. O lugar dele é a mesa do contador.",
    ],
    proximo: "O que esta pasta resolve: quanto sobra por mês (/caixa) e o calendário do que se paga (/obrigacoes). O tamanho da retirada, no seu regime, é conversa com o contador.",
    fontes: [
      "Fator R só no Simples: LC 123/2006, art. 18, §5º-J, §5º-K e §5º-M, https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm",
      "Patronal de 20% sobre o pró-labore fora do Simples: Lei 8.212/1991, art. 22, https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm",
      `Retenção de 10%: ${TABELAS.dividendos.fonte}`,
      `Tabelas conferidas em ${TABELAS.conferidoEm}`,
    ],
  };
}

// ─────────────────────────── markdown ───────────────────────────

function markdown(r, nome) {
  const hoje = br.fmt(new Date());
  const L = [];
  const negocio = nome || "o negócio";

  if (r.naoSeAplica) {
    const n = r.naoSeAplica;
    L.push(`# Retirada — ${negocio}`, "");
    L.push(`> Gerado por \`node scripts/pro-labore.js\` em ${hoje}. Não é aconselhamento contábil.`, "");
    L.push(`## ${n.titulo}`, "");
    for (const p of n.porque) L.push(p, "");
    L.push(`## O que fazer no lugar`, "", n.proximo, "");
    L.push("## Fontes", "");
    for (const f of n.fontes) L.push(`- ${f}`);
    L.push("");
    return L.join("\n");
  }

  const e = r.entrada;
  L.push(`# Retirada — ${negocio}`, "");
  L.push(`> Gerado por \`node scripts/pro-labore.js\` em ${hoje}. Tabelas conferidas em ${TABELAS.conferidoEm}.`);
  L.push(`> Não é aconselhamento contábil: a simulação vai ao contador antes de virar folha.`, "");

  L.push("## O que entrou na conta", "");
  L.push("| Indicador | Valor |", "|---|---|");
  L.push(`| Anexo de hoje | ${TABELAS.anexos[r.anexo].nome} |`);
  L.push(`| Receita bruta dos 12 meses (RBT12) | ${br.reais(e.receita12)} |`);
  L.push(`| Receita do mês usada no DAS | ${br.reais(e.receitaMes)} |`);
  L.push(`| Folha de empregados nos 12 meses, com encargos | ${br.reais(e.folha12Empregados)} |`);
  L.push(`| Pró-labore de hoje, por mês | ${br.reais(e.prolaboreAtual)} |`);
  L.push(`| Sócios que recebem pró-labore | ${e.socios} |`);
  L.push(`| Dependentes no IRRF | ${e.dependentes} |`);
  L.push(`| Sobra mensal informada | ${e.sobra === null ? "[a confirmar: rodar o /caixa]" : br.reais(e.sobra)} |`);
  L.push(`| DAS do ano no anexo de hoje | ${br.reais(r.dasAnoAtual)} |`);
  L.push("");

  L.push("## Fator R", "");
  L.push(`A conta é curta. Folha dos 12 meses dividida pela receita dos 12 meses (LC 123/2006, art. 18, §5º-K). Deu 28% ou mais, a atividade de serviço que seria Anexo V é tributada pelo Anexo III (§5º-J); ficou abaixo, é Anexo V (§5º-M). O pró-labore conta como folha (§24), e não tem FGTS nem 13º: cada real que entra nele entra inteiro na conta.`, "");
  L.push("| Indicador | Valor |", "|---|---|");
  L.push(`| Folha de hoje nos 12 meses (empregados + pró-labore) | ${br.reais(r.alvo.folhaHoje)} |`);
  L.push(`| Fator R de hoje | ${br.pct(r.fatorHoje)} |`);
  L.push(`| Folha necessária pra chegar a 28% | ${br.reais(r.alvo.folhaAlvo)} |`);
  L.push(`| Falta de folha nos 12 meses | ${br.reais(r.alvo.falta)} |`);
  if (r.alvo.jaCruzou) L.push(`| Pró-labore mínimo que ainda mantém os 28% | ${br.reais(r.alvo.minimo)} |`);
  else L.push(`| Pró-labore mensal que fecha a conta | ${br.reais(r.alvo.alvo)} |`);
  L.push(`| Fator R com o pró-labore recomendado | ${br.pct(r.fatorDepois)} |`);
  L.push("");
  if (r.alvo.jaCruzou) {
    L.push(`A folha já passa de 28%. Com o que os empregados custam, o pró-labore poderia cair até ${br.reais(r.alvo.minimo)} por mês sem derrubar o enquadramento. Baixar não é recomendação: é a margem que existe, e serve pra saber quanto a folha pode oscilar antes de virar problema.`, "");
  }
  else L.push(`De ${br.reais(e.prolaboreAtual)} pra ${br.reais(r.alvo.alvo)} por mês. A diferença é ${br.reais(r.alvo.alvo - e.prolaboreAtual)}, e ela não é custo: é dinheiro que sai da empresa pro sócio por outra porta. O custo é só o imposto que essa porta cobra.`, "");

  L.push("## A alíquota nos dois anexos", "");
  L.push("| Indicador | Valor |", "|---|---|");
  L.push(`| Faixa da RBT12 | ${r.efV.faixa}ª |`);
  L.push(`| Alíquota efetiva no Anexo V | ${br.pct(r.efV.efetiva)} |`);
  L.push(`| Alíquota efetiva no Anexo III | ${br.pct(r.efIII.efetiva)} |`);
  L.push(`| DAS do ano no Anexo V | ${br.reais(r.dasAnoV)} |`);
  L.push(`| DAS do ano no Anexo III | ${br.reais(r.dasAnoIII)} |`);
  L.push(`| Economia de DAS no ano | ${br.reais(r.economiaAno)} |`);
  L.push("");
  L.push(`Com a receita de ${br.reais(e.receitaMes)} usada como mês típico, a guia fica em ${br.reais(r.dasMesDepois)} no ${TABELAS.anexos[r.anexoDepois].nome.split(" —")[0]}.`, "");
  L.push(`Efetiva é (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12. No Anexo V a nominal da ${r.efV.faixa}ª faixa é ${br.pct(r.efV.nominal)} com ${br.reais(r.efV.deduzir)} a deduzir; no Anexo III, ${br.pct(r.efIII.nominal)} com ${br.reais(r.efIII.deduzir)}. Fonte: ${TABELAS.anexosFonte}`, "");

  const dif = r.custoExtraMes;
  const n = r.alvoCusto.socios;
  L.push("## O que o pró-labore do Fator R custa", "");
  L.push(`Os valores são do pró-labore alvo, ${br.reais(r.alvo.alvo)} por mês${n > 1 ? `, dividido em partes iguais entre ${n} sócios (${br.reais(c2(r.alvo.alvo / n))} cada)` : ""}. Só INSS e IRRF entram aqui. Pró-labore não tem FGTS, 13º nem férias.`, "");
  L.push("| Item | Valor |", "|---|---|");
  L.push(`| INSS retido no ano (11% sobre ${br.reais(r.alvoCusto.baseInss)} por mês${n > 1 ? `, somando os ${n} sócios` : ""}) | ${br.reais(c2(r.alvoCusto.inss * 12))} |`);
  L.push(`| IRRF no ano (tabela progressiva mensal) | ${br.reais(c2(r.alvoCusto.irrf * 12))} |`);
  L.push(`| Total | ${br.reais(c2((r.alvoCusto.inss + r.alvoCusto.irrf) * 12))} |`);
  L.push("");
  L.push(`Por mês: INSS de ${br.reais(r.alvoCusto.inss)} e IRRF de ${br.reais(r.alvoCusto.irrf)} sobre um pró-labore de ${br.reais(r.alvoCusto.prolabore)}, deixando ${br.reais(r.alvoCusto.liquido)} líquidos.`);
  if (r.alvoCusto.redutor > 0) L.push(`A tabela apurava ${br.reais(c2(r.alvoCusto.irrf + r.alvoCusto.redutor))} de IRRF, e o redutor da Lei 15.270/2025 abateu ${br.reais(r.alvoCusto.redutor)} disso.`);
  L.push(`Hoje, sobre ${br.reais(r.hojeCusto.prolabore)}, o custo mensal é ${br.reais(r.hojeCusto.custo)}. A diferença mensal é ${br.reais(dif)}, e 12× ${br.reais(dif)} = ${br.reais(r.custoExtraAno)}.`);
  if (r.prolaboreRecomendado !== r.alvo.alvo) L.push(`O pró-labore recomendado no fim é outro, ${br.reais(r.prolaboreRecomendado)} por mês, e nele o imposto fica em ${br.reais(r.recomendadoCusto.custo)} por mês.`);
  L.push("");

  L.push("## O veredito", "");
  L.push("| Indicador | Valor |", "|---|---|");
  if (r.alvo.jaCruzou && r.economiaAno >= 0) {
    L.push(`| O que a folha de hoje já evita de DAS por ano | ${br.reais(r.economiaAno)} |`);
  } else if (r.alvo.jaCruzou) {
    L.push(`| O que a folha acima de 28% custa de DAS a mais por ano | ${br.reais(c2(-r.economiaAno))} |`);
  } else {
    L.push(`| Economia de DAS no ano | ${br.reais(r.economiaAno)} |`);
    L.push(`| Imposto a mais sobre o pró-labore, no ano | ${br.reais(r.custoExtraAno)} |`);
    L.push(`| Saldo | ${br.reais(r.saldoAno)} |`);
  }
  L.push(`| Pró-labore recomendado, por mês | ${br.reais(r.prolaboreRecomendado)} |`);
  L.push("");
  if (r.alvo.jaCruzou && r.economiaAno >= 0) {
    L.push(`Nada a mudar. A folha já sustenta o Anexo III, e os ${br.reais(r.economiaAno)} da tabela não são economia nova: é o que a folha de hoje já evita de DAS por ano em comparação com o Anexo V. O pró-labore fica em ${br.reais(r.prolaboreRecomendado)}, que é o que existe hoje. A decisão do ano é uma só: não deixar a folha dos 12 meses cair abaixo de ${br.reais(r.alvo.folhaAlvo)}.`, "");
  } else if (r.alvo.jaCruzou) {
    L.push(`Caso invertido, e vale ler com calma. A folha passa de 28%, então o Anexo III é obrigatório (LC 123/2006, art. 18, §5º-J), e nesta faixa de receita ele é ${br.reais(c2(-r.economiaAno))} por ano mais caro que o Anexo V. Não é escolha de quem paga: o enquadramento segue o Fator R. A pergunta pro contador é se compensa deixar a folha cair abaixo dos 28% de propósito, o que mexe em contratação e em pró-labore de sócio ao mesmo tempo, e o que isso faz com a folha do ano seguinte.`, "");
  } else if (r.saldoAno > 0) {
    L.push(`Vale fixar o pró-labore em ${br.reais(r.alvo.alvo)}. A empresa paga ${br.reais(r.custoExtraAno)} a mais de INSS e IRRF no ano, e deixa de pagar ${br.reais(r.economiaAno)} de DAS. Sobram ${br.reais(r.saldoAno)}.`, "");
  } else {
    L.push(`Não vale. Pra cruzar os 28% o pró-labore teria que ir a ${br.reais(r.alvo.alvo)}, o que custa ${br.reais(r.custoExtraAno)} a mais de imposto no ano contra ${br.reais(r.economiaAno)} de economia de DAS. O prejuízo é ${br.reais(Math.abs(r.saldoAno))}. Fica no Anexo V, com pró-labore de ${br.reais(r.prolaboreRecomendado)}.`, "");
  }

  L.push("## Distribuição de lucro isenta", "");
  L.push(`Sem escrituração contábil, a isenção do lucro distribuído para na presunção: ${e.presuncao}% da receita bruta do período, menos o valor devido no Simples no período (LC 123/2006, art. 14, §1º). Com escrituração que evidencie lucro maior, esse teto não se aplica (art. 14, §2º) e vale o lucro contábil. O que passa do limite é rendimento tributável na pessoa física. Não é economia.`, "");
  L.push("| Indicador | Valor |", "|---|---|");
  L.push(`| Presunção de ${e.presuncao}% sobre ${br.reais(e.receita12)} | ${br.reais(r.isenta.presumido)} |`);
  L.push(`| (−) DAS do ano no ${TABELAS.anexos[r.anexoDepois].nome.split(" —")[0]} | ${br.reais(r.isenta.dasAno)} |`);
  L.push(`| Limite isento no ano | ${br.reais(r.isenta.limiteAno)} |`);
  L.push(`| Limite isento por mês | ${br.reais(r.isenta.limiteMes)} |`);
  L.push("");
  L.push(`Acima de R$ 50.000 distribuídos pela mesma empresa ao mesmo sócio num único mês, 10% são retidos na fonte desde janeiro de 2026 (Lei 15.270/2025). ${r.isenta.limiteMes > TABELAS.dividendos.limiteMensal ? "O limite mensal desta empresa passa dessa marca: distribuir tudo de uma vez aciona a retenção." : "O limite mensal desta empresa fica abaixo dessa marca, então a retenção não entra na conta hoje."}`, "");

  L.push("## Aposentadoria: piso e teto", "");
  L.push("| Indicador | Valor |", "|---|---|");
  L.push(`| Salário de contribuição de cada sócio, com o pró-labore recomendado | ${br.reais(r.recomendadoCusto.porSocio.baseInss)} |`);
  L.push(`| INSS mensal de cada sócio (11%) | ${br.reais(r.recomendadoCusto.porSocio.inss)} |`);
  L.push(`| Piso: benefício de quem contribui sobre o salário mínimo | ${br.reais(TABELAS.salarioMinimo.valor)} |`);
  L.push(`| Teto do salário de contribuição | ${br.reais(TABELAS.inssTeto.valor)} |`);
  L.push("");
  L.push(`Quem contribui sobre o mínimo recebe benefício de um salário mínimo, e nada acima disso. Quem contribui acima aumenta a média que entra no cálculo, até o teto. Ali para. Pró-labore maior que o teto não compra aposentadoria maior: o INSS trava e só o IRRF continua subindo. O valor do benefício depende da média de todas as contribuições da vida e do tempo de contribuição, então o número exato sai do extrato do CNIS [a confirmar no meu.inss.gov.br].`, "");

  if (r.avisos.length) {
    L.push("## Avisos", "");
    for (const a of r.avisos) L.push(`- ${a}`);
    L.push("");
  }

  L.push("## Fontes", "");
  L.push(`- Fator R e folha de salários: ${TABELAS.fatorR.fonte}`);
  L.push(`- Anexos III e V: ${TABELAS.anexosFonte}`);
  L.push(`- INSS do sócio: ${TABELAS.inssSocio.fonte}`);
  L.push(`- Patronal dentro do DAS: ${TABELAS.patronalDispensada.fonte}`);
  L.push(`- Teto do INSS: ${TABELAS.inssTeto.fonte}`);
  L.push(`- Salário mínimo: ${TABELAS.salarioMinimo.fonte}`);
  L.push(`- Tabela do IRRF: ${TABELAS.irrf.fonte}`);
  L.push(`- Distribuição isenta: ${TABELAS.distribuicao.fonte}`);
  L.push(`- Retenção de 10%: ${TABELAS.dividendos.fonte}`);
  L.push(`- Retirada sem discriminação: ${TABELAS.semDiscriminacao.fonte}`);
  L.push("");
  return L.join("\n");
}

// ─────────────────────────── terminal ───────────────────────────

function resumoTerminal(r) {
  if (r.naoSeAplica) {
    console.log(`\n${r.naoSeAplica.titulo}\n`);
    for (const p of r.naoSeAplica.porque) console.log(`  ${p}\n`);
    console.log(`  ${r.naoSeAplica.proximo}\n`);
    return;
  }
  const e = r.entrada;
  console.log(`\nPRÓ-LABORE — ${TABELAS.anexos[r.anexo].nome}\n`);
  console.log(`  RBT12 ${br.reais(e.receita12)} · folha de empregados ${br.reais(e.folha12Empregados)} · pró-labore de hoje ${br.reais(e.prolaboreAtual)}`);
  console.log(`  Fator R de hoje: ${br.pct(r.fatorHoje)} (a linha é 28%)`);
  console.log(`  Alíquota efetiva: Anexo V ${br.pct(r.efV.efetiva)} · Anexo III ${br.pct(r.efIII.efetiva)}`);
  console.log("");
  if (r.alvo.jaCruzou) {
    console.log(`  A folha já cruza os 28%: o Anexo III é obrigatório. Mínimo que sustenta: ${br.reais(r.alvo.minimo)} por mês`);
    if (r.economiaAno >= 0) console.log(`  O que a folha de hoje já evita de DAS por ano: ${br.reais(r.economiaAno)}`);
    else console.log(`  Nesta faixa o Anexo III custa ${br.reais(c2(-r.economiaAno))} por ano a mais que o V: ver o aviso`);
  } else {
    console.log(`  Pró-labore que fecha os 28%: ${br.reais(r.alvo.alvo)} por mês`);
    console.log(`  Economia de DAS no ano:      ${br.reais(r.economiaAno)}`);
    console.log(`  INSS + IRRF a mais no ano:   ${br.reais(r.custoExtraAno)}`);
    console.log(`  Saldo:                       ${br.reais(r.saldoAno)}`);
  }
  console.log("");
  console.log(`  Recomendação: fixar o pró-labore em ${br.reais(r.prolaboreRecomendado)} por mês`);
  console.log(`  Distribuição isenta sem escrituração: até ${br.reais(r.isenta.limiteMes)} por mês (${br.reais(r.isenta.limiteAno)} no ano)`);
  if (r.avisos.length) {
    console.log("\n  Avisos:");
    for (const a of r.avisos) console.log(`   · ${a}`);
  }
  console.log(`\n  Tabelas conferidas em ${TABELAS.conferidoEm}. Não é aconselhamento contábil.\n`);
}

function main() {
  const o = args(process.argv.slice(2));
  if (o.h || o.help || (!o.receita12 && !o._.length)) {
    console.log(`
Uso: node scripts/pro-labore.js --anexo <III|V> --receita12 <valor> [opções]

  --anexo <III|V>        anexo do Simples (obrigatório no regime simples)
  --regime <r>           simples | mei | presumido | real (padrão simples)
  --receita12 <valor>    receita bruta dos últimos 12 meses (obrigatório)
  --receita-mes <valor>  receita do mês (padrão: receita12 ÷ 12)
  --folha12 <valor>      folha de empregados dos 12 meses, sem o pró-labore (padrão 0)
  --prolabore <valor>    pró-labore mensal de hoje (padrão: salário mínimo)
  --socios <n>           quantos sócios recebem pró-labore (padrão 1)
  --dependentes <n>      dependentes no IRRF (padrão 0)
  --sobra <valor>        quanto sobra por mês antes da retirada (do /caixa)
  --distribuir <valor>   quanto o sócio pretende receber de lucro por mês
  --presuncao <8|16|32>  presunção do art. 15 da Lei 9.249/1995 (padrão 32)
  --nome <texto>         nome do negócio, pro título do relatório
  --md <arquivo.md>      grava o relatório
  --json                 imprime só os números
`);
    process.exit(0);
  }

  const receita12 = num(o.receita12, "receita12");
  const presuncao = num(o.presuncao, "presuncao", 32);
  if (![8, 16, 32].includes(presuncao)) morrer("--presuncao precisa ser 8, 16 ou 32", "8% comércio e indústria; 16% transporte de passageiros e serviço de PJ com receita anual até R$ 120 mil fora das profissões regulamentadas; 32% serviço em geral (Lei 9.249/1995, art. 15)");

  const e = {
    regime: o.regime === true ? "simples" : (o.regime || "simples"),
    anexo: o.anexo === true ? "" : (o.anexo || ""),
    receita12,
    receitaMes: num(o["receita-mes"], "receita-mes", c2(receita12 / 12)),
    folha12Empregados: num(o.folha12, "folha12", 0),
    prolaboreAtual: num(o.prolabore, "prolabore", TABELAS.salarioMinimo.valor),
    socios: Math.round(num(o.socios, "socios", 1)),
    dependentes: Math.round(num(o.dependentes, "dependentes", 0)),
    sobra: o.sobra === undefined || o.sobra === true ? null : num(o.sobra, "sobra"),
    distribuir: o.distribuir === undefined || o.distribuir === true ? null : num(o.distribuir, "distribuir"),
    presuncao,
  };

  const r = simular(e);

  if (o.json) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }

  resumoTerminal(r);

  if (o.md && o.md !== true) {
    const destino = path.resolve(String(o.md));
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, markdown(r, o.nome === true ? null : o.nome), "utf8");
    console.log(`  Escrito: ${destino}\n`);
  }
}

module.exports = {
  TABELAS, aliquotaEfetiva, inssSocio, custoProlabore, custoRepartido, fatorR,
  pontoDeInversao, prolaboreAlvo, distribuicaoIsenta, simular, markdown,
};

if (require.main === module) main();
