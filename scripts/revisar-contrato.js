#!/usr/bin/env node
/**
 * Contex OS — revisar-contrato.js
 * Varre o contrato que chegou pra assinar e aponta, com a linha e a cláusula,
 * o que costuma custar dinheiro: multa, prazo de pagamento, foro, cessão de
 * direito autoral, exclusividade, revisões, rescisão, responsabilidade, LGPD.
 * Também diz o que está FALTANDO, que é metade do risco de contrato alheio.
 *
 * Existe porque a leitura de contrato erra de duas formas previsíveis: passa
 * batido pela cláusula que só faz sentido junto com outra (multa de 30% "sem
 * prejuízo de perdas e danos"), e não percebe a ausência (contrato sem juros
 * por atraso do cliente, sem teto de responsabilidade, sem reajuste em dois
 * anos de vigência). Regex não interpreta contrato; encontra o que ler.
 *
 * Uso:
 *   node scripts/revisar-contrato.js <arquivo.md|.txt|.html|.docx>
 *   node scripts/revisar-contrato.js --manifesto <revisao.json>
 *   node scripts/revisar-contrato.js --marcar <original.docx> --manifesto <revisao.json>
 *
 * Opções:
 *   --valor "24.000"      valor do contrato: mede a multa contra o art. 412 do Código Civil
 *   --mensal "12.000"     faturamento (ou custo fixo) de um mês: é a régua do que é risco alto
 *   --prazo 15            prazo de pagamento que o usuário pratica (dias), pra comparar
 *   --revisoes 2          revisões que a oferta do usuário prevê, pra comparar
 *   --cidade "Sinop/MT"   cidade do usuário: confere o foro contra o art. 63, § 1º, do CPC
 *   --json                devolve os achados em JSON (é a base do manifesto do Passo 6)
 *   --manifesto <arquivo> confere o manifesto preenchido e imprime o painel em markdown
 *   --marcar <docx>       grava o contrato recebido com controle de alterações (w:ins/w:del):
 *                         cada "trecho" do manifesto vira exclusão marcada e cada "redacao"
 *                         vira inserção marcada, do jeito que o jurídico do outro lado espera
 *   --saida <arquivo>     nome do .docx marcado (padrão: <manifesto sem .json>-marcado.docx)
 *   --autor "Nome"        autor das marcas de revisão (padrão: o campo "revisor" do manifesto)
 *
 * PDF não entra aqui: o assistente lê o PDF direto pela ferramenta Read, preenche o
 * manifesto JSON com as cláusulas e roda --manifesto pra conferir as contas.
 *
 * Isto não é assessoria jurídica: é triagem. A base legal de cada tema está em
 * templates/juridico/revisao-de-contrato.md, com artigo, fonte e data.
 *
 * Node 18+. Sem dependência de npm. Usa scripts/br.js.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");
const br = require("./br.js");

// ─────────────────────────── temas de risco ───────────────────────────

const TEMAS = [
  {
    id: "multa",
    nome: "Multa e cláusula penal",
    nivel: "medio",
    padroes: [/\bmultas?\b/i, /cl[áa]usula penal/i, /\bpenalidade/i],
    agrava: [
      [/sem prejuízo (?:d[ae]s?\s+)?(?:perdas e danos|indeniza)/i, "multa somada a perdas e danos"],
      [/multa[^.]{0,120}(?:valor total|valor global|integralidade)/i, "multa sobre o valor total, não sobre a etapa atrasada"],
    ],
    lei: "arts. 412 e 413 do Código Civil",
    pergunta: "A multa vale pros dois lados, tem teto, e incide sobre a etapa ou sobre o total?",
  },
  {
    id: "cessao",
    nome: "Cessão de direito autoral",
    nivel: "alto",
    padroes: [/cess[ãa]o/i, /cede(?:r|m)?\b/i, /direitos? autora/i, /propriedade intelectual/i, /titularidade/i],
    agrava: [
      [/perp[ée]tu/i, "cessão perpétua"],
      [/irrevog[áa]vel/i, "cessão irrevogável e irretratável"],
      [/universo|mundial|qualquer territ[óo]rio/i, "território ilimitado"],
      [/venham? a (?:ser criad|existir)/i, "modalidades que ainda não existem (art. 49, V)"],
      [/(?:sem|nenhum[ao]?)[^.]{0,60}(?:contrapartida|remunera[çc][ãa]o adicional)/i, "cessão sem contrapartida"],
    ],
    lei: "arts. 4º, 27, 49 e 50 da Lei 9.610/1998",
    pergunta: "É licença de uso ou cessão definitiva? Por quanto tempo, em que território, e o portfólio está ressalvado?",
  },
  {
    id: "pagamento",
    nome: "Prazo e condição de pagamento",
    nivel: "medio",
    padroes: [/pagamento/i, /\bpagar[áa]?\b/i, /nota fiscal/i, /\bboleto\b/i, /parcela/i],
    agrava: [
      [/(?:aprova[çc][ãa]o|valida[çc][ãa]o|aceite)[^.]{0,80}(?:nota fiscal|medi[çc][ãa]o)/i, "prazo conta de evento que o prestador não controla"],
      [/(?<![\d.,])(?:45|60|75|90|120)\s*(?:\([^)]{0,30}\))?\s*dias/i, "prazo de pagamento longo"],
      [/ret(?:en[çc][ãa]o|er)[^.]{0,80}pagamento/i, "retenção de pagamento"],
    ],
    lei: "art. 406 do Código Civil, com a redação da Lei 14.905/2024",
    pergunta: "O prazo conta de quê, e o que acontece quando o cliente atrasa?",
  },
  {
    id: "foro",
    nome: "Foro, jurisdição e arbitragem",
    nivel: "medio",
    padroes: [/\bforo\b/i, /comarca/i, /arbitra(?:gem|l)/i, /\bju[íi]zo\b/i, /legisla[çc][ãa]o (?:do estado|de)/i],
    agrava: [
      [/arbitra(?:gem|l)/i, "arbitragem obrigatória: custa taxa de câmara antes de qualquer decisão"],
      [/renunci[a-z]*[^.]{0,60}(?:qualquer outro|demais foro|mais privilegiado)/i, "renúncia a qualquer outro foro"],
    ],
    lei: "art. 63, § 1º, do CPC, com a redação da Lei 14.879/2024",
    pergunta: "A comarca escolhida tem ligação com o domicílio de alguma das partes ou com o local do serviço?",
  },
  {
    id: "exclusividade",
    nome: "Exclusividade e não concorrência",
    nivel: "alto",
    padroes: [/exclusividade/i, /dedica[çc][ãa]o exclusiva/i, /n[ãa]o\s*[- ]?concorr/i, /alicia/i, /concorrentes? d[oa]/i],
    agrava: [
      [/(?<![\d.,])(?:12|18|24|36|48|60)\s*(?:\([^)]{0,30}\))?\s*(?:meses|anos)/i, "prazo longo de restrição"],
      [/(?:mesmo|ainda que)[^.]{0,60}(?:ap[óo]s|encerr)/i, "restrição que continua depois do fim do contrato"],
    ],
    lei: "sem artigo próprio: é negociação de preço e de prazo (molde, seção 8)",
    pergunta: "Qual o prazo, quais concorrentes estão nomeados, e qual é a contrapartida em dinheiro?",
  },
  {
    id: "revisoes",
    nome: "Revisões e escopo aberto",
    nivel: "medio",
    padroes: [/revis[õo]e?s?\b/i, /ajustes? (?:necess[áa]ri|solicitad)/i, /aprova[çc][ãa]o final/i,
      /melhores esfor[çc]os/i, /sempre que solicitad/i, /demais (?:atividades|servi[çc]os)/i, /conforme (?:a )?necessidade/i],
    agrava: [
      [/(?:quantas|tantas|ilimitad)[^.]{0,80}(?:necess[áa]ri|aprova)/i, "revisão ilimitada até a aprovação"],
      [/a crit[ée]rio (?:exclusivo )?d[oa] contratante/i, "aprovação a critério exclusivo do contratante"],
      [/demais (?:atividades|servi[çc]os) (?:correlat|afin)/i, "escopo aberto por atividade correlata"],
      [/conforme (?:a )?necessidade d[oa] contratante/i, "escopo aberto por necessidade do contratante"],
      [/melhores esfor[çc]os/i, "obrigação de melhores esforços, sem critério objetivo"],
      [/sempre que solicitad/i, "atendimento sempre que solicitado"],
    ],
    lei: "sem artigo próprio: é margem, e sai do bolso do prestador",
    pergunta: "Quantas rodadas estão incluídas, em que prazo, e quanto custa a rodada extra?",
  },
  {
    id: "rescisao",
    nome: "Rescisão, vigência e renovação",
    nivel: "medio",
    padroes: [/rescis/i, /rescind/i, /resili/i, /distrat/i, /den[úu]ncia/i,
      /aviso (?:pr[ée]vio|escrito|por escrito)/i, /vig[êe]ncia/i, /renova/i, /extin[çc][ãa]o do contrato/i],
    agrava: [
      [/a qualquer (?:tempo|momento)[^.]{0,80}(?:sem|independente)/i, "rescisão a qualquer tempo sem motivo"],
      [/renova(?:d[oa]|[çc][ãa]o)[^.]{0,40}automat/i, "renovação automática"],
      [/imotivad/i, "rescisão imotivada"],
    ],
    lei: "art. 473 e parágrafo único do Código Civil",
    pergunta: "O aviso prévio é igual pros dois lados, e o que já foi executado é pago?",
  },
  {
    id: "responsabilidade",
    nome: "Responsabilidade e indenização",
    nivel: "alto",
    padroes: [/indeniz/i, /responsabili/i, /lucros? cessante/i, /perdas e danos/i, /ressarci/i, /garant(?:e|ia|ir)/i],
    agrava: [
      [/lucros? cessante/i, "indenização por lucro cessante do cliente"],
      [/ilimitad/i, "responsabilidade ilimitada"],
      [/(?:qualquer|toda)[^.]{0,60}reclama[çc][ãa]o de terceiro/i, "indenização por qualquer reclamação de terceiro"],
      [/garant(?:e|ia)[^.]{0,80}(?:resultado|faturamento|posi[çc][ãa]o|seguidores|vendas)/i, "garantia de resultado comercial"],
    ],
    lei: "sem teto legal: o teto é o que o contrato escrever",
    pergunta: "Existe limite de responsabilidade? Lucro cessante e dano indireto estão excluídos?",
  },
  {
    id: "lgpd",
    nome: "Dados pessoais",
    nivel: "medio",
    padroes: [/dados pessoais/i, /\blgpd\b/i, /\boperador\b/i, /\bcontrolador\b/i, /titular(?:es)? dos dados/i, /13\.709/],
    agrava: [
      [/(?:integral|exclusiv|[úu]nic)[a-z]*\s*(?:e\s*)?respons[áa]vel[^.]{0,120}dados/i, "responsabilidade integral do prestador por dados"],
      [/vazamento|incidente de seguran[çc]a/i, "cláusula de incidente de segurança"],
    ],
    lei: "arts. 5º, VI e VII, 39 e 42 da LGPD",
    pergunta: "Quem é controlador e quem é operador, e cada parte responde pelo que está sob a guarda dela?",
  },
  {
    id: "unilateral",
    nome: "Alteração unilateral",
    nivel: "alto",
    padroes: [/unilateral/i, /poder[áa] (?:alterar|modificar|revisar)/i, /a qualquer tempo, (?:alterar|modificar)/i],
    agrava: [
      [/(?:altera|modifica)[^.]{0,80}sem (?:aviso|pr[ée]via|anu[êe]ncia)/i, "alteração sem aviso"],
    ],
    lei: "art. 424 do Código Civil (contrato de adesão)",
    pergunta: "O que exatamente a outra parte pode mudar sozinha, e você fica preso ao resultado?",
  },
  {
    id: "vinculo",
    nome: "Sinal de vínculo empregatício",
    nivel: "medio",
    padroes: [/jornada/i, /hor[áa]rio de (?:trabalho|expediente)/i, /subordina/i, /ponto eletr[ôo]nico/i, /f[ée]rias/i, /superior imediato/i],
    agrava: [
      [/dedica[çc][ãa]o (?:exclusiva|integral)/i, "dedicação exclusiva somada a controle de jornada"],
    ],
    lei: "art. 3º da CLT",
    pergunta: "O contrato combina entrega com prazo, ou controla como e quando o trabalho é feito?",
  },
  {
    id: "confidencialidade",
    nome: "Confidencialidade e portfólio",
    nivel: "atencao",
    padroes: [/confidencial/i, /sigilo/i, /\bnda\b/i, /divulga[çc][ãa]o/i, /portf[óo]lio/i],
    agrava: [
      [/perp[ée]tu/i, "sigilo perpétuo"],
      [/(?:vedad|proibid)[ao][^.]{0,120}(?:divulgar|mencionar|portf[óo]lio)/i, "proibição de mostrar o trabalho"],
    ],
    lei: "sem artigo próprio: é prazo, definição e exceção (molde, seção NDA)",
    pergunta: "O sigilo é mútuo, tem prazo, e o portfólio está ressalvado por escrito?",
  },
  {
    id: "reajuste",
    nome: "Reajuste",
    nivel: "medio",
    padroes: [/reajust/i, /\bipca\b/i, /\bigp-?m\b/i, /\binpc\b/i, /corre[çc][ãa]o monet[áa]ria/i],
    agrava: [
      [/(?:sem|n[ãa]o haver[áa])[^.]{0,40}reajust/i, "contrato sem reajuste"],
    ],
    lei: "livre entre as partes; a Lei 14.905/2024 separou correção monetária de juros",
    pergunta: "Vigência de 12 meses ou mais sem índice de reajuste significa perder inflação.",
  },
];

/** Temas que, ausentes, são risco por omissão. */
const EXIGIDOS = [
  { id: "pagamento", falta: "prazo de pagamento definido", porque: "sem prazo escrito, quem decide quando paga é quem paga" },
  { id: "mora", falta: "multa e juros por atraso do cliente", porque: "sem isso, atrasar não custa nada pro contratante", padroes: [/juros[^.]{0,80}(?:mora|atraso)/i, /\bmora\b/i, /morat[óo]ri/i, /(?:multa|juros)[^.]{0,120}(?:contratante|cliente|tomador)/i] },
  { id: "cessao", falta: "propriedade do que foi entregue", porque: "silêncio favorece o autor, mas gera briga; escrever a licença resolve antes" },
  { id: "responsabilidade", falta: "limite de responsabilidade", porque: "sem teto, o risco é maior que o contrato" },
  { id: "rescisao", falta: "rescisão e aviso prévio", porque: "sem regra, o fim da relação vira discussão" },
  { id: "foro", falta: "foro", porque: "sem eleição, vale a regra geral do CPC, e isso costuma favorecer quem tem advogado" },
  { id: "naoincluso", falta: "lista do que NÃO está incluso", porque: "é a lista que evita a conversa de \"mas eu achei que...\"", padroes: [/n[ãa]o\s+(?:est[áãa]o?|estar[ãa]o|ser[áã]o?)\s+inclu/i, /n[ãa]o inclu[íi]d/i, /exclu[íi]d[oa]s? do escopo/i, /fora do escopo/i] },
  { id: "lgpd", falta: "cláusula de dados pessoais", porque: "obrigatória quando o serviço toca base de cliente do cliente (LGPD)" },
];

/** Em NDA, a ausência que importa é outra: não tem escopo nem pagamento pra cobrar. */
const EXIGIDOS_NDA = [
  { falta: "exceções ao sigilo", porque: "informação pública, já conhecida ou exigida por lei precisa estar fora da obrigação", padroes: [/(?:n[ãa]o se (?:aplica|considera)|excetua|exclu[íi]d[ao]s?)[^.]{0,120}(?:p[úu]blic|dom[íi]nio|conhecid|lei)/i] },
  { falta: "prazo do sigilo", porque: "sigilo sem prazo é sigilo perpétuo, e ninguém controla arquivo por trinta anos", padroes: [/(?:pelo prazo|durante|por)\s+\d{1,2}\s*\(?[a-zç ]*\)?\s*(?:meses|anos)[^.]{0,60}(?:sigilo|confidencial)/i, /(?:sigilo|confidencialidade)[^.]{0,80}\d{1,2}\s*\(?[a-zç ]*\)?\s*(?:meses|anos)/i] },
  { falta: "ressalva de portfólio", porque: "sem ela, o trabalho feito não pode ser mostrado a novo cliente", padroes: [/portf[óo]lio[^.]{0,120}(?:permitid|autoriza|ressalva|poder[áa])/i] },
  { falta: "obrigação mútua", porque: "NDA de mão única protege só quem escreveu", padroes: [/(?:ambas as partes|rec[íi]proc|m[úu]tu)/i] },
  { falta: "devolução ou eliminação da informação", porque: "no fim da conversa, o material precisa voltar ou ser apagado, com prazo", padroes: [/(?:devolver|devolu[çc][ãa]o|eliminar|elimina[çc][ãa]o|destrui)/i] },
];

/** NDA ou termo de confidencialidade: fala de sigilo e não fala de preço. */
function ehNda(texto) {
  const sigilo = (texto.match(/confidencial|sigilo|\bnda\b/gi) || []).length;
  const dinheiro = (texto.match(/remunera[çc][ãa]o|pre[çc]o|pagamento|parcela/gi) || []).length;
  return sigilo >= 3 && dinheiro <= 1;
}

// ─────────────────────────── leitura ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Tira tag de HTML mantendo a quebra de bloco. */
function deHtml(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|li|tr|h[1-6]|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n");
}

/** Lê .md, .txt, .html ou .docx (o .docx sai pelo gerar-docx.js --texto). */
function lerTexto(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`não achei o arquivo: ${arquivo}`);
  const ext = path.extname(arquivo).toLowerCase();
  if (ext === ".pdf") {
    morrer("PDF não entra na varredura por comando.",
      "Peça ao assistente pra ler o PDF pela ferramenta Read, preencher o manifesto JSON e rodar:\n  node scripts/revisar-contrato.js --manifesto <revisao.json>");
  }
  if (ext === ".docx") {
    const script = path.join(__dirname, "gerar-docx.js");
    if (!fs.existsSync(script)) morrer("scripts/gerar-docx.js não está aqui, e é ele que extrai o texto do .docx");
    try {
      return execFileSync(process.execPath, [script, "--texto", arquivo], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    } catch (e) {
      morrer(`não consegui extrair o texto de ${path.basename(arquivo)}`, "Abra no Word e salve como .docx de novo, ou copie o texto pra um .md");
    }
  }
  const bruto = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  return ext === ".html" || ext === ".htm" ? deHtml(bruto) : bruto;
}

/** Começo de item numerado, título ou marcador: linha que nunca é emenda da anterior. */
const INICIO_DE_ITEM = /^\s*(?:[#>|=]|[-*+•]\s|\d{1,2}(?:\.\d{1,3})*\s*[).:\u2013-]?\s+\S|cl[áa]usula\b|par[áa]grafo\b|art\.|anexo\b)/i;

/**
 * Junta a linha que quebrou no meio da frase. Texto colado de PDF ou de e-mail vem
 * com quebra a cada 80 colunas, e aí a palavra "multa" fica numa linha e o
 * "R$ 50.000,00" na seguinte: o regex perde as duas, e a linha órfã ainda cai no tema
 * errado. O .docx já chega um parágrafo por linha e passa por aqui sem mudança.
 */
function blocos(texto) {
  const saida = [];
  texto.split(/\r?\n/).forEach((bruta, i) => {
    const l = bruta.replace(/\s+$/, "");
    const ant = saida.length ? saida[saida.length - 1] : null;
    const emenda =
      ant &&
      ant.texto.trim() &&
      l.trim() &&
      !INICIO_DE_ITEM.test(l) &&
      !/[.;:!?]\s*$/.test(ant.texto) &&
      !ehTitulo(ant.texto) &&
      !ehTitulo(l);   // "da PARTE" + "REVELADORA por 24 meses" é uma frase só
    if (emenda) ant.texto += " " + l.trim();
    else saida.push({ texto: l, linha: i + 1 });   // a linha é a do arquivo, não a do bloco
  });
  return saida;
}

/** O texto remendado, pra quem só precisa procurar termo no documento inteiro. */
function juntarLinhas(texto) {
  return blocos(texto).map((b) => b.texto).join("\n");
}

// ─────────────────────────── varredura ───────────────────────────

/**
 * Rótulo da cláusula que contém cada linha, guardado cru ("7", "12.3", "DO OBJETO"):
 * é o mesmo valor que vai pro campo "clausula" do manifesto, e quem enfeita com a
 * palavra "cláusula" é o rotuloClausula() na hora de imprimir.
 */
function mapaClausulas(linhas) {
  const mapa = [];
  let atual = "preâmbulo";
  for (const l of linhas) {
    const t = l.trim();
    let m;
    if ((m = t.match(/^#{1,6}\s*(.{0,60})/))) atual = m[1].replace(/[*_]/g, "").trim() || atual;
    else if ((m = t.match(/^cl[áa]usula\s+([\wªº°IVXLC]+[^\s,.:\u2013-]*)/i))) atual = m[1];
    else if ((m = t.match(/^(\d{1,2}(?:\.\d{1,3})+)\s*[).:\u2013-]?\s+\S/))) atual = m[1];
    else if ((m = t.match(/^(\d{1,2})\s*[).:\u2013-]\s+\S/))) atual = m[1];
    mapa.push(atual);
  }
  return mapa;
}

/** "5.1" → "cláusula 5.1" · "DO OBJETO" → "DO OBJETO" · "preâmbulo" → "preâmbulo". */
function rotuloClausula(c) {
  const t = String(c || "").trim();
  if (!t) return "cláusula não identificada";
  return /^(?:\d[\d.]*|[IVXLC]+)$/i.test(t) ? `cláusula ${t}` : t;
}

/**
 * Sobe o nível do tema conforme o número de agravantes na linha. Um agravante
 * num tema de nível médio continua médio: o que vira alto é o acúmulo, ou o
 * tema que já nasce alto (cessão, responsabilidade, exclusividade).
 */
function promover(nivel, agravantes) {
  if (!agravantes) return nivel;
  if (agravantes >= 2) return "alto";
  return nivel === "atencao" ? "medio" : nivel;
}

/** Título de seção ou de cláusula: serve pra localizar, não é texto de obrigação. */
function ehTitulo(linha) {
  const t = linha.trim();
  if (!t) return true;
  if (/^#{1,6}\s/.test(t)) return true;
  if (/^(?:cl[áa]usula|par[áa]grafo)\b/i.test(t) && t.length < 80 && !/[.;]\s*\S/.test(t)) return true;
  const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letras.length > 3 && t.length < 80 && letras === letras.toUpperCase()) return true;
  return false;
}

/** Frase em volta do achado, pra mostrar no relatório sem despejar a cláusula inteira. */
function trechoDa(linha, limite = 220) {
  const t = linha.trim().replace(/\s+/g, " ");
  return t.length <= limite ? t : t.slice(0, limite - 1) + "…";
}

/** Percentuais citados na linha (em número). */
function percentuais(linha) {
  const achados = [];
  const re = /(\d{1,3}(?:[.,]\d{1,2})?)\s*%/g;
  let m;
  while ((m = re.exec(linha))) {
    const n = br.numero(m[1]);
    if (!isNaN(n)) achados.push(n);
  }
  return achados;
}

/**
 * Dias citados na linha (em número). O parêntese tem que ser parêntese de verdade:
 * a versão frouxa lia "juros de 1% ao mês, pago em até 15 dias" como "1 dias".
 */
function dias(linha) {
  const achados = [];
  const re = /(?<![\d.,])(\d{1,3})\s*(?:\([^)]{0,30}\))?\s*dias?\b/gi;
  let m;
  while ((m = re.exec(linha))) achados.push(Number(m[1]));
  return achados;
}

/** Valores em reais citados na linha (em número). */
function valores(linha) {
  const achados = [];
  const re = /R\$\s*([\d.]+(?:,\d{2})?)/g;
  let m;
  while ((m = re.exec(linha))) {
    const n = br.numero(m[1]);
    if (!isNaN(n) && n > 0) achados.push(n);
  }
  return achados;
}

/** Todos os valores do documento, do maior pro menor, sem repetir. */
function valoresDoTexto(texto) {
  const todos = new Set();
  for (const linha of texto.split(/\r?\n/)) for (const v of valores(linha)) todos.add(v);
  return [...todos].sort((a, b) => b - a);
}

/**
 * Varre o texto e devolve um achado por linha que casa com um tema.
 * Nada aqui interpreta o contrato: aponta o que precisa ser lido.
 */
function varrer(texto, opcoes = {}) {
  const partes = blocos(texto);
  const clausulas = mapaClausulas(partes.map((b) => b.texto));
  const achados = [];
  partes.forEach(({ texto: linha, linha: numero }, i) => {
    if (ehTitulo(linha)) return;             // título de cláusula não é cláusula
    if (linha.trim().length < 25) return;
    // O tema com mais sinal na linha ganha: agravante pesa o dobro do padrão solto.
    const candidatos = [];
    for (const tema of TEMAS) {
      const casou = tema.padroes.filter((r) => r.test(linha)).length;
      if (!casou) continue;
      const agravantes = (tema.agrava || []).filter(([r]) => r.test(linha));
      candidatos.push({ tema, agravantes, nota: casou + agravantes.length * 2 });
    }
    if (!candidatos.length) return;
    candidatos.sort((a, b) => b.nota - a.nota);
    const comAgravante = candidatos.filter((c) => c.agravantes.length);
    const escolhidos = comAgravante.length ? comAgravante.slice(0, 2) : [candidatos[0]];
    for (const { tema, agravantes } of escolhidos) {
      const notas = agravantes.map(([, n]) => n);
      let nivel = promover(tema.nivel, agravantes.length);
      const pcts = percentuais(linha);
      const ds = dias(linha);

      if (tema.id === "multa" && opcoes.valor) {
        const fixas = valores(linha);
        if (fixas.length) {
          const maior = Math.max(...fixas);
          const vezes = maior / opcoes.valor;
          notas.push(`multa fixa de ${br.reais(maior)} contra um contrato de ${br.reais(opcoes.valor)}: ${vezes.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}× o valor`);
          if (maior > opcoes.valor) {
            notas.push("multa acima do valor da obrigação principal: o art. 412 do Código Civil veda o excesso");
            nivel = "alto";
          } else if (opcoes.mensal && maior >= opcoes.mensal) {
            notas.push(`${br.reais(maior)} é ${(maior / opcoes.mensal).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mês do seu faturamento`);
            nivel = "alto";
          }
        }
        if (pcts.length) {
          const maior = Math.max(...pcts);
          const emReais = br.centavos(opcoes.valor * maior / 100);
          notas.push(`multa de ${br.pct(maior / 100, maior % 1 ? 2 : 0)} sobre ${br.reais(opcoes.valor)} dá ${br.reais(emReais)}`);
          if (/di[áa]ri/i.test(linha)) {
            const em30 = br.centavos(emReais * 30);
            notas.push(`multa diária: 30 dias de atraso acumulam ${br.reais(em30)}${em30 > opcoes.valor ? ", mais que o contrato inteiro (art. 412 do Código Civil)" : ""}`);
            nivel = "alto";
          }
          if (maior >= 100) {
            notas.push("multa igual ou maior que o valor do contrato: o art. 412 do Código Civil veda o excesso");
            nivel = "alto";
          } else if (opcoes.mensal && emReais >= opcoes.mensal) {
            // A régua do molde é a conta, não o percentual: 20% de R$ 3.000 é R$ 600 e
            // segue médio; 20% de R$ 80.000 é R$ 16.000, e aí some um mês de trabalho.
            notas.push(`${br.reais(emReais)} é ${(emReais / opcoes.mensal).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mês do seu faturamento`);
            nivel = "alto";
          }
        }
      }

      if (tema.id === "pagamento" && opcoes.prazo && ds.length) {
        const maior = Math.max(...ds);
        if (maior > opcoes.prazo) {
          notas.push(`${maior} dias contra os ${opcoes.prazo} dias que você pratica: ${maior - opcoes.prazo} dias a mais de caixa parado`);
          if (maior >= opcoes.prazo * 3) nivel = "alto";
        }
      }

      if (tema.id === "foro" && opcoes.cidade) {
        const eleita = (linha.match(/comarca\s+d[aeo]\s+([^,;.()\n]{2,40})/i)
          || linha.match(/(?:foro|ju[íi]zo)\s+d[aeo]\s+([^,;.()\n]{2,40})/i) || [])[1];
        if (eleita) {
          const minha = br.slug(String(opcoes.cidade).split("/")[0]);
          const dela = br.slug(eleita.split("/")[0]);
          if (dela && minha && dela === minha) {
            notas.push(`o foro eleito é a sua própria comarca (${eleita.trim()}): esse ponto já está do seu lado`);
          } else if (dela && minha) {
            notas.push(`o foro eleito é ${eleita.trim()} e você é de ${opcoes.cidade}: se a comarca também não for o domicílio da outra parte nem o local do serviço, a eleição não produz efeito (art. 63, § 1º, do CPC) e o juiz pode declinar de ofício (§ 5º). Se for o domicílio dela, é válida — e o custo de litigar longe fica com você`);
          }
        }
      }

      if (tema.id === "revisoes" && opcoes.revisoes != null) {
        const n = (linha.match(/(\d{1,2})\s*(?:\(\w+\)\s*)?(?:rodadas?|revis)/i) || [])[1];
        if (n != null && Number(n) !== opcoes.revisoes) {
          notas.push(`o contrato fala em ${n}, a sua oferta prevê ${opcoes.revisoes}`);
        }
      }

      achados.push({
        tema: tema.id,
        nome: tema.nome,
        nivel,
        linha: numero,
        clausula: clausulas[i],
        trecho: trechoDa(linha),
        notas,
        lei: tema.lei,
        pergunta: tema.pergunta,
      });
    }
  });
  return achados;
}

/** Temas exigidos que não aparecem no texto. */
function ausentes(texto, achados) {
  texto = juntarLinhas(texto);
  const vistos = new Set(achados.map((a) => a.tema));
  const faltando = [];
  for (const e of (ehNda(texto) ? EXIGIDOS_NDA : EXIGIDOS)) {
    const tem = e.padroes ? e.padroes.some((p) => p.test(texto)) : vistos.has(e.id);
    if (!tem) faltando.push({ falta: e.falta, porque: e.porque });
  }
  return faltando;
}

/** Simetria: a multa é prevista contra as duas partes ou contra uma só? */
function simetriaDaMulta(texto) {
  const frases = juntarLinhas(texto).split(/(?<=[.;])\s+/).filter((f) => /\bmultas?\b|cl[áa]usula penal/i.test(f));
  let contraPrestador = 0, contraCliente = 0, mutua = 0;
  for (const f of frases) {
    const p = /contratad[oa]|prestador|fornecedor/i.test(f);
    const c = /contratante|cliente|tomador/i.test(f);
    if (p && c) mutua++;
    else if (p) contraPrestador++;
    else if (c) contraCliente++;
  }
  return { frases: frases.length, contraPrestador, contraCliente, mutua };
}

// ─────────────────────────── manifesto ───────────────────────────

const NIVEIS = ["alto", "medio", "atencao"];
const ROTULO = { alto: "Alto", medio: "Médio", atencao: "Atenção" };

/**
 * Confere o manifesto que o assistente preencheu depois de ler o contrato
 * (útil pro PDF, que a Read abre e o regex não). Devolve erros e as contas.
 */
function conferirManifesto(m) {
  const erros = [];
  const contas = [];
  if (!m || typeof m !== "object") return { erros: ["manifesto não é um objeto JSON"], contas };
  for (const campo of ["contrato", "arquivo", "lido_em", "achados"]) {
    if (!m[campo]) erros.push(`falta o campo "${campo}"`);
  }
  if (m.lido_em && !br.lerData(m.lido_em)) erros.push(`"lido_em" não é uma data válida: ${m.lido_em}`);
  const valor = m.valor != null ? br.numero(m.valor) : null;
  if (m.valor != null && isNaN(valor)) erros.push(`"valor" não é um número: ${m.valor}`);
  if (!Array.isArray(m.achados)) {
    erros.push('"achados" precisa ser uma lista');
    return { erros, contas };
  }
  if (!m.achados.length) erros.push('"achados" está vazio: contrato sem nenhum ponto é contrato não lido');
  const conhecidos = new Set(TEMAS.map((t) => t.id));
  m.achados.forEach((a, i) => {
    const onde = `achado ${i + 1}${a.clausula ? ` (${rotuloClausula(a.clausula)})` : ""}`;
    if (!a.clausula) erros.push(`${onde}: falta "clausula"`);
    if (!a.tema || !conhecidos.has(a.tema)) erros.push(`${onde}: "tema" ausente ou desconhecido (${a.tema || "vazio"})`);
    if (!NIVEIS.includes(a.nivel)) erros.push(`${onde}: "nivel" precisa ser alto, medio ou atencao`);
    if (!a.trecho || String(a.trecho).trim().length < 20) erros.push(`${onde}: "trecho" precisa citar o contrato (20 caracteres ou mais)`);
    if (!a.problema) erros.push(`${onde}: falta "problema"`);
    if ((a.nivel === "alto" || a.nivel === "medio") && !a.redacao) erros.push(`${onde}: nível ${a.nivel} sem "redacao" alternativa`);
    if (a.percentual != null) {
      const p = br.numero(a.percentual);
      if (isNaN(p)) erros.push(`${onde}: "percentual" não é número (${a.percentual})`);
      else if (valor) {
        const emReais = br.centavos(valor * p / 100);
        contas.push(`${rotuloClausula(a.clausula)}: ${br.pct(p / 100, p % 1 ? 2 : 0)} de ${br.reais(valor)} = ${br.reais(emReais)}`);
        if (p >= 100) erros.push(`${onde}: multa de ${p}% do contrato passa do valor da obrigação principal (art. 412 do Código Civil)`);
      }
    }
    if (a.dias != null) {
      if (isNaN(Number(a.dias))) erros.push(`${onde}: "dias" não é número (${a.dias})`);
      else if (m.prazo_praticado != null && Number(a.dias) > Number(m.prazo_praticado)) {
        contas.push(`${rotuloClausula(a.clausula)}: ${a.dias} dias contra os ${m.prazo_praticado} que você pratica = ${Number(a.dias) - Number(m.prazo_praticado)} dias de caixa parado`);
      }
    }
  });
  if (m.parcelas != null && !Array.isArray(m.parcelas)) erros.push('"parcelas" precisa ser uma lista de valores');
  else if (Array.isArray(m.parcelas) && m.parcelas.length) {
    const numeros = m.parcelas.map((x) => br.numero(x));
    const ruins = m.parcelas.filter((x, k) => isNaN(numeros[k]));
    if (ruins.length) erros.push(`parcela que não é número: ${ruins.join(", ")}`);
    else if (valor) {
      const soma = br.centavos(numeros.reduce((t, n) => t + n, 0));
      contas.push(`${numeros.length} parcelas somam ${br.reais(soma)} contra o valor declarado de ${br.reais(valor)}`);
      if (Math.abs(soma - valor) > 0.01) erros.push(`as parcelas somam ${br.reais(soma)} e o contrato diz ${br.reais(valor)}: a diferença é ${br.reais(br.centavos(Math.abs(soma - valor)))}`);
    }
  }
  return { erros, contas };
}

/** Painel de risco em markdown, pronto pra colar na revisão. */
function painelMarkdown(m) {
  const por = { alto: 0, medio: 0, atencao: 0 };
  for (const a of m.achados || []) if (por[a.nivel] != null) por[a.nivel]++;
  const linhas = [];
  linhas.push(`| Nível | Pontos | O que fazer |`);
  linhas.push(`|---|---|---|`);
  linhas.push(`| Alto | ${por.alto} | não assinar como está |`);
  linhas.push(`| Médio | ${por.medio} | pedir a mudança |`);
  linhas.push(`| Atenção | ${por.atencao} | saber que aceitou |`);
  linhas.push("");
  linhas.push(`| Cláusula | Tema | Nível | O problema | Redação alternativa |`);
  linhas.push(`|---|---|---|---|---|`);
  for (const nivel of NIVEIS) {
    for (const a of (m.achados || []).filter((x) => x.nivel === nivel)) {
      const tema = TEMAS.find((t) => t.id === a.tema);
      linhas.push(`| ${a.clausula} | ${tema ? tema.nome : a.tema} | ${ROTULO[a.nivel]} | ${(a.problema || "").replace(/\|/g, "/")} | ${(a.redacao || "—").replace(/\|/g, "/")} |`);
    }
  }
  return linhas.join("\n");
}

// ───────────────── .docx com controle de alterações ─────────────────

/*
 * O jurídico do outro lado não lê markdown: ele abre o .docx, vê o que foi riscado,
 * o que foi inserido, e aceita ou recusa cláusula por cláusula. Esse rastro é XML:
 * o texto antigo vira <w:del> com <w:delText>, o texto novo vira <w:ins>. É o mesmo
 * que o Word grava quando alguém liga o controle de alterações.
 *
 * O .docx é um zip de XMLs, então dá pra fazer isso sem instalar nada: zlib nativo
 * pra deflate, CRC32 na mão, e o word/document.xml reescrito parágrafo por parágrafo.
 * O resto do arquivo (estilo, cabeçalho, numeração) volta pro zip sem ser tocado.
 */

let TABELA_CRC = null;

function crc32(buf) {
  if (!TABELA_CRC) {
    TABELA_CRC = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABELA_CRC[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ TABELA_CRC[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

/** Abre o zip pelo diretório central e devolve [{nome, dados}]. */
function lerZip(buf) {
  let fim = buf.length - 22;
  while (fim >= 0 && buf.readUInt32LE(fim) !== 0x06054b50) fim--;
  if (fim < 0) throw new Error("não parece um .docx: não achei o fim do zip");
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const entradas = [];
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("o diretório do zip está corrompido");
    const metodo = buf.readUInt16LE(p + 10);
    const compTam = buf.readUInt32LE(p + 20);
    const nomeTam = buf.readUInt16LE(p + 28);
    const extraTam = buf.readUInt16LE(p + 30);
    const comentTam = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const nome = buf.slice(p + 46, p + 46 + nomeTam).toString("utf8");
    const localNome = buf.readUInt16LE(offset + 26);
    const localExtra = buf.readUInt16LE(offset + 28);
    const inicio = offset + 30 + localNome + localExtra;
    const bruto = buf.slice(inicio, inicio + compTam);
    const dados = metodo === 8 ? zlib.inflateRawSync(bruto) : metodo === 0 ? bruto : null;
    if (!dados) throw new Error(`compressão ${metodo} não suportada em ${nome}`);
    entradas.push({ nome, dados });
    p += 46 + nomeTam + extraTam + comentTam;
  }
  return entradas;
}

/** Remonta o zip (deflate, sem data e sem zip64: o Word não pede mais que isso). */
function montarZip(entradas) {
  const corpo = [];
  const central = [];
  let offset = 0;
  for (const { nome, dados } of entradas) {
    const nomeBuf = Buffer.from(nome, "utf8");
    const crc = crc32(dados);
    const comp = zlib.deflateRawSync(dados, { level: 9 });
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);
    corpo.push(local, nomeBuf, comp);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(dados.length, 24);
    cd.writeUInt16LE(nomeBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nomeBuf);
    offset += local.length + nomeBuf.length + comp.length;
  }
  const dir = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(dir.length, 12);
  fim.writeUInt32LE(offset, 16);
  return Buffer.concat([...corpo, dir, fim]);
}

function escXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Texto visível de um <w:p>: a tabulação vira espaço e a quebra de linha vira \n. */
function textoDoParagrafo(xml) {
  const partes = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:(?:br|cr)\s*\/>/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[1] !== undefined) partes.push(m[1]);
    else partes.push(m[0].startsWith("<w:tab") ? " " : "\n");
  }
  return partes.join("")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** Compara texto de contrato sem tropeçar em acento, aspa curva ou espaço duplo. */
function normalizar(s) {
  return br.semAcento(String(s))
    .replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ").trim();
}

/** O mesmo normalizar, guardando de qual posição do original veio cada caractere. */
function normalizarComMapa(bruto) {
  const s = String(bruto);
  let texto = "";
  const mapa = [];
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (/[“”«»]/.test(c)) c = '"';
    else if (/[‘’]/.test(c)) c = "'";
    else if (/\s/.test(c)) {
      if (!texto || texto.endsWith(" ")) continue;
      c = " ";
    } else c = br.semAcento(c);
    if (!c) continue;
    texto += c[0];
    mapa.push(i);
  }
  return { texto, mapa };
}

/**
 * Onde o trecho citado começa e acaba dentro do parágrafo, em posição do texto
 * original. Quando o trecho vem cortado com reticências (o relatório corta em 220
 * caracteres), casa o começo e estende até o fim da frase: marcar meia frase deixa
 * o parágrafo sem sentido depois de aceitar a alteração.
 */
function acharTrecho(textoDoPar, trecho) {
  const { texto, mapa } = normalizarComMapa(textoDoPar);
  const cru = String(trecho || "");
  const cortado = /(?:…|\.\.\.)\s*$/.test(cru);
  const alvo = normalizar(cru.replace(/(?:…|\.\.\.)+\s*$/, ""));
  if (alvo.length < 15) return null;
  const fimDaFrase = (desde) => {
    const ponto = texto.slice(desde + 1).search(/[.;](?:\s|$)/);
    return ponto >= 0 ? desde + 1 + ponto : texto.length - 1;
  };
  let de = texto.indexOf(alvo);
  let ate;
  if (de >= 0) {
    ate = de + alvo.length - 1;
  } else {
    const prefixo = alvo.slice(0, 70);
    de = texto.indexOf(prefixo);
    if (de < 0) return null;
    ate = fimDaFrase(de + prefixo.length - 1);
  }
  // Trecho cortado com reticências: o resto da frase sai junto, senão o parágrafo
  // aceito fica com meia oração colada na redação nova.
  if (cortado) ate = fimDaFrase(ate);
  return { de: mapa[de], ate: mapa[ate] };
}

/**
 * Reescreve o parágrafo com o trecho antigo riscado (w:del) e a redação nova
 * inserida (w:ins) no mesmo lugar. O que está fora do trecho continua no parágrafo:
 * apagar a cláusula 3.1 inteira porque o problema era na 3.2 é pior que não marcar.
 * A formatação interna (negrito no meio da frase) é simplificada; o texto, nunca.
 */
function paragrafoMarcado(xml, textoNovo, ctx, span) {
  const antigo = textoDoParagrafo(xml);
  const pPr = (xml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [""])[0];
  const rPr = (xml.match(/<w:r(?:\s[^>]*)?>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/) || ["", ""])[1];
  const de = span ? span.de : 0;
  const ate = span ? span.ate : antigo.length - 1;
  const quem = `w:author="${escXml(ctx.autor)}" w:date="${ctx.data}"`;
  const pedacos = (t, tag) => t.split("\n")
    .map((x, i) => (i ? "<w:br/>" : "") + `<${tag} xml:space="preserve">${escXml(x)}</${tag}>`).join("");
  const run = (t) => (t ? `<w:r>${rPr}${pedacos(t, "w:t")}</w:r>` : "");
  const morto = antigo.slice(de, ate + 1);
  const del = morto.trim()
    ? `<w:del w:id="${ctx.id++}" ${quem}><w:r>${rPr}${pedacos(morto, "w:delText")}</w:r></w:del>`
    : "";
  const ins = `<w:ins w:id="${ctx.id++}" ${quem}><w:r>${rPr}${pedacos(textoNovo, "w:t")}</w:r></w:ins>`;
  return `<w:p>${pPr}${run(antigo.slice(0, de))}${del}${ins}${run(antigo.slice(ate + 1))}</w:p>`;
}

/**
 * Grava o contrato recebido com a redação alternativa marcada. Casa cada achado pelo
 * "trecho" citado no manifesto, que é justamente o que a regra manda copiar literal:
 * trecho parafraseado não acha o parágrafo, e o script diz qual ficou de fora.
 */
function marcarDocx(original, manifesto, saida, autor) {
  const entradas = lerZip(fs.readFileSync(original));
  const doc = entradas.find((e) => e.nome === "word/document.xml");
  if (!doc) throw new Error("não achei word/document.xml dentro do arquivo: isso não é um .docx do Word");
  let xml = doc.dados.toString("utf8");
  const paragrafos = xml.match(/<w:p(?:\s[^>]*)?(?:\/>|>[\s\S]*?<\/w:p>)/g) || [];
  if (!paragrafos.length) throw new Error("o .docx não tem parágrafo nenhum pra marcar");
  const textos = paragrafos.map((x) => textoDoParagrafo(x));
  const ctx = { id: 9000, autor: autor || "Revisão", data: `${br.iso(new Date())}T00:00:00Z` };
  const feitos = [];
  const perdidos = [];
  const usados = new Set();

  for (const a of manifesto.achados || []) {
    const rotulo = rotuloClausula(a.clausula);
    if (!a.redacao) { perdidos.push({ rotulo, porque: "sem redação alternativa no manifesto (nível atenção não precisa)" }); continue; }
    if (normalizar(a.trecho || "").length < 15) {
      perdidos.push({ rotulo, porque: "o trecho citado é curto demais pra localizar no documento" });
      continue;
    }
    let achou = null;
    for (let k = 0; k < paragrafos.length && !achou; k++) {
      if (usados.has(k)) continue;
      const span = acharTrecho(textos[k], a.trecho);
      if (span) achou = { k, span };
    }
    if (!achou) {
      perdidos.push({ rotulo, porque: "não achei esse trecho no .docx — confira se é o mesmo arquivo e se o trecho foi copiado literal" });
      continue;
    }
    usados.add(achou.k);
    feitos.push({
      rotulo,
      antigo: paragrafos[achou.k],
      novo: paragrafoMarcado(paragrafos[achou.k], a.redacao, ctx, achou.span),
    });
  }

  // Sem nenhuma marca não existe arquivo: não gravar é melhor que gravar cópia limpa,
  // que o usuário manda pro cliente pensando que mandou a contraproposta.
  if (!feitos.length) return { feitos, perdidos, perdeuTexto: [], gravou: false, ins: 0, del: 0, tamanho: 0, paragrafos: paragrafos.length };

  for (const f of feitos) xml = xml.replace(f.antigo, () => f.novo);
  doc.dados = Buffer.from(xml, "utf8");
  const buf = montarZip(entradas);
  fs.writeFileSync(saida, buf);

  // Confere o que gravou relendo o zip: arquivo que não reabre não é entrega.
  const relido = lerZip(fs.readFileSync(saida)).find((e) => e.nome === "word/document.xml").dados.toString("utf8");
  const perdeuTexto = [];
  for (const f of feitos) {
    const antes = normalizar(textoDoParagrafo(f.antigo));
    const depois = normalizar(textoDoParagrafo(f.novo));
    if (antes && !depois.includes(antes.slice(0, 40))) perdeuTexto.push(f.rotulo);
  }
  return {
    feitos, perdidos, perdeuTexto, gravou: true,
    ins: (relido.match(/<w:ins /g) || []).length,
    del: (relido.match(/<w:del /g) || []).length,
    tamanho: buf.length,
    paragrafos: paragrafos.length,
  };
}

// ─────────────────────────── saída ───────────────────────────

const ICONE = { alto: "‼", medio: "▲", atencao: "·" };

function imprimirVarredura(arquivo, achados, faltando, simetria, extras = {}) {
  console.log(`\nCONTRATO: ${arquivo}`);
  const por = { alto: 0, medio: 0, atencao: 0 };
  for (const a of achados) por[a.nivel]++;
  console.log(`  ${achados.length} pontos pra ler: ${por.alto} de risco alto, ${por.medio} médio, ${por.atencao} de atenção\n`);
  for (const nivel of NIVEIS) {
    const lista = achados.filter((a) => a.nivel === nivel);
    if (!lista.length) continue;
    console.log(`── ${ROTULO[nivel]} ──`);
    for (const a of lista) {
      console.log(`${ICONE[nivel]} ${a.nome} — ${rotuloClausula(a.clausula)}, linha ${a.linha}`);
      console.log(`   "${a.trecho}"`);
      for (const n of a.notas) console.log(`   → ${n}`);
      console.log(`   base: ${a.lei}`);
      console.log(`   perguntar: ${a.pergunta}\n`);
    }
  }
  if (simetria.frases) {
    console.log("── Simetria da multa ──");
    const p = simetria.frases > 1;
    console.log(`  ${simetria.frases} ${p ? "frases falam" : "frase fala"} de multa: ${simetria.mutua} ${simetria.mutua === 1 ? "vale" : "valem"} pras duas partes, ${simetria.contraPrestador} só contra quem presta, ${simetria.contraCliente} só contra quem contrata`);
    if (simetria.contraPrestador && !simetria.contraCliente && !simetria.mutua) {
      console.log("  ‼ multa só contra o prestador: pedir a recíproca é a emenda mais fácil de conseguir");
    }
    console.log("");
  }
  if (faltando.length) {
    console.log("── O que está faltando ──");
    for (const f of faltando) console.log(`  ○ ${f.falta} — ${f.porque}`);
    console.log("");
  }
  const cifras = extras.valores || [];
  if (cifras.length) {
    console.log("── Valores citados no documento ──");
    console.log(`  ${cifras.slice(0, 6).map((v) => br.reais(v)).join(" · ")}${cifras.length > 6 ? ` (e mais ${cifras.length - 6})` : ""}`);
    if (extras.valor == null) console.log(`  ○ rode de novo com --valor "${cifras[0].toLocaleString("pt-BR", { minimumFractionDigits: 2 })}" (ou o valor certo) pra medir a multa em reais`);
    else if (extras.valores.length && !cifras.includes(extras.valor)) console.log(`  ○ o --valor que você passou (${br.reais(extras.valor)}) não aparece escrito no documento: confira se é o mesmo contrato`);
    console.log("");
  }
  if (extras.valor != null && extras.mensal == null) {
    console.log("○ sem --mensal, o nível alto sai só do art. 412 e da leitura: passe um mês de");
    console.log("  faturamento pra saber quando a multa deixa de ser aborrecimento e vira prejuízo.\n");
  }
  console.log("Isto é triagem, não parecer: cada ponto precisa ser lido no contrato.");
  console.log("A base legal de cada tema está em templates/juridico/revisao-de-contrato.md.\n");
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--ajuda") || args.includes("-h")) {
    console.log(`
Uso:
  node scripts/revisar-contrato.js <arquivo.md|.txt|.html|.docx> [opções]
  node scripts/revisar-contrato.js --manifesto <revisao.json>
  node scripts/revisar-contrato.js --marcar <original.docx> --manifesto <revisao.json>

Opções:
  --valor "24.000"    valor do contrato (mede a multa contra o art. 412 do Código Civil)
  --mensal "12.000"   um mês de faturamento seu: é a régua do que é risco alto
  --prazo 15          prazo de pagamento que você pratica, em dias
  --revisoes 2        revisões que a sua oferta prevê
  --cidade "Sinop/MT" sua cidade (confere o foro pelo art. 63, § 1º, do CPC)
  --json              achados em JSON, no formato do manifesto
  --saida <arquivo>   nome do .docx marcado (só com --marcar)
  --autor "Nome"      autor das marcas de revisão (só com --marcar)
`);
    process.exit(args.length ? 0 : 1);
  }

  const pega = (nome) => {
    const i = args.indexOf(nome);
    return i >= 0 ? args[i + 1] : null;
  };

  const manifesto = pega("--manifesto");
  const marcar = pega("--marcar");
  if (marcar && !manifesto) {
    morrer("--marcar precisa do manifesto conferido",
      "node scripts/revisar-contrato.js --marcar dados/contrato-alfa.docx --manifesto contratos/revisao-alfa.json");
  }
  if (manifesto) {
    if (!fs.existsSync(manifesto)) morrer(`não achei o manifesto: ${manifesto}`);
    let obj;
    try {
      obj = JSON.parse(fs.readFileSync(manifesto, "utf8").replace(/^﻿/, ""));
    } catch (e) {
      morrer(`o manifesto não é JSON válido: ${e.message}`, "Confira vírgula sobrando e aspas não fechadas.");
    }
    const { erros, contas } = conferirManifesto(obj);
    console.log(`\nMANIFESTO: ${manifesto}`);
    console.log(`  ${(obj.achados || []).length} achados, contrato "${obj.contrato || "[sem nome]"}", lido em ${obj.lido_em || "[sem data]"}\n`);
    if (contas.length) {
      console.log("── Contas ──");
      for (const c of contas) console.log(`  = ${c}`);
      console.log("");
    }
    if (erros.length) {
      console.log("── Corrigir antes de entregar ──");
      for (const e of erros) console.log(`  ✖ ${e}`);
      console.log("");
      process.exit(1);
    }
    if (!marcar) {
      console.log("── Painel pra colar na revisão ──\n");
      console.log(painelMarkdown(obj));
      console.log("\nTudo certo.\n");
      return;
    }

    if (!fs.existsSync(marcar)) morrer(`não achei o contrato original: ${marcar}`);
    if (path.extname(marcar).toLowerCase() !== ".docx") {
      morrer("a marca de revisão só existe dentro de .docx",
        "PDF não tem onde guardar w:ins e w:del. Peça o Word ao cliente, ou entregue o texto atual e o proposto lado a lado.");
    }
    const saida = pega("--saida") || marcar.replace(/\.docx$/i, "") + "-marcado.docx";
    let r;
    try {
      r = marcarDocx(marcar, obj, saida, pega("--autor") || obj.revisor);
    } catch (e) {
      morrer(`não consegui marcar o .docx: ${e.message}`, "Abra o arquivo no Word e salve de novo como .docx, depois repita.");
    }
    console.log(`── Controle de alterações ──`);
    console.log(`  ${r.feitos.length} de ${(obj.achados || []).length} cláusulas marcadas em ${r.paragrafos} parágrafos`);
    for (const f of r.feitos) console.log(`  ✓ ${f.rotulo}`);
    for (const d of r.perdidos) console.log(`  ✖ ${d.rotulo}: ${d.porque}`);
    console.log("");
    if (!r.gravou) {
      morrer("nenhuma cláusula foi marcada, então não gravei arquivo nenhum",
        "O casamento é pelo campo \"trecho\": copie do contrato literal, sem reescrever, e repita.\n  Cópia limpa do contrato do cliente não é contraproposta, e é isso que sairia daqui.");
    }
    for (const t of r.perdeuTexto) console.log(`  ▲ ${t}: confira o parágrafo no Word, o texto antigo pode ter saído do lugar`);
    console.log(`✓ ${saida} — ${Math.round(r.tamanho / 1024)} KB, ${r.ins} inserções e ${r.del} exclusões marcadas`);
    console.log("  Abra no Word em Revisão › Controle de Alterações pra ver riscado e inserido.");
    console.log(`  As cláusulas que ficaram de fora entram na revisão em texto, e o painel sai com --manifesto sem --marcar.`);
    console.log("");
    console.log("Tudo certo.\n");
    return;
  }

  const arquivo = args[0];
  if (arquivo.startsWith("--")) morrer("falta o arquivo do contrato", "node scripts/revisar-contrato.js contratos/recebido.docx --valor 24.000");
  const opcoes = {};
  const valor = pega("--valor");
  if (valor != null) {
    opcoes.valor = br.numero(valor);
    if (isNaN(opcoes.valor)) morrer(`--valor não é um número: ${valor}`, 'Use o formato brasileiro: --valor "24.000,00"');
  }
  const mensal = pega("--mensal");
  if (mensal != null) {
    opcoes.mensal = br.numero(mensal);
    if (isNaN(opcoes.mensal) || opcoes.mensal <= 0) morrer(`--mensal não é um número: ${mensal}`, 'Um mês de faturamento seu, no formato brasileiro: --mensal "12.000,00"');
  }
  const cidade = pega("--cidade");
  if (cidade != null) {
    if (cidade.startsWith("--")) morrer("--cidade ficou sem valor", 'Assim: --cidade "Sinop/MT"');
    opcoes.cidade = cidade;
  }
  const prazo = pega("--prazo");
  if (prazo != null) {
    opcoes.prazo = Number(prazo);
    if (!Number.isFinite(opcoes.prazo) || opcoes.prazo <= 0) morrer(`--prazo precisa ser um número de dias: ${prazo}`);
  }
  const revisoes = pega("--revisoes");
  if (revisoes != null) {
    opcoes.revisoes = Number(revisoes);
    if (!Number.isFinite(opcoes.revisoes) || opcoes.revisoes < 0) morrer(`--revisoes precisa ser um número: ${revisoes}`);
  }

  const texto = lerTexto(arquivo);
  if (texto.trim().length < 200) morrer("o arquivo tem texto quase nenhum", "Se o contrato é PDF escaneado, o assistente lê pela ferramenta Read e preenche o manifesto.");
  const achados = varrer(texto, opcoes);
  const faltando = ausentes(texto, achados);
  const simetria = simetriaDaMulta(texto);

  if (args.includes("--json")) {
    console.log(JSON.stringify({
      contrato: path.basename(arquivo, path.extname(arquivo)),
      arquivo,
      valor: opcoes.valor != null ? opcoes.valor : null,
      parcelas: [],
      prazo_praticado: opcoes.prazo != null ? opcoes.prazo : null,
      revisor: null,
      lido_em: br.iso(new Date()),
      achados: achados.map((a) => ({ clausula: a.clausula, tema: a.tema, nivel: a.nivel, linha: a.linha, trecho: a.trecho, notas: a.notas, problema: "", redacao: "" })),
      faltando,
      simetria,
    }, null, 2));
    return;
  }
  imprimirVarredura(arquivo, achados, faltando, simetria, {
    valores: valoresDoTexto(texto),
    valor: opcoes.valor != null ? opcoes.valor : null,
    mensal: opcoes.mensal != null ? opcoes.mensal : null,
  });
}

module.exports = {
  TEMAS, EXIGIDOS, EXIGIDOS_NDA, ehNda, promover, lerTexto, juntarLinhas, varrer, ausentes,
  simetriaDaMulta, conferirManifesto, painelMarkdown, mapaClausulas, rotuloClausula,
  percentuais, dias, valores, valoresDoTexto, blocos, lerZip, montarZip, textoDoParagrafo,
  normalizar, normalizarComMapa, acharTrecho, paragrafoMarcado, marcarDocx,
};

if (require.main === module) main();
