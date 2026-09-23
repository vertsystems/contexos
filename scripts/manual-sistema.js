#!/usr/bin/env node
/**
 * Contex OS — manual-sistema.js
 * Levanta os fatos que o manual do sistema precisa e que ninguém confere de
 * cabeça: o que o repositório declara, quanto o sistema custa por mês somado,
 * quando cada coisa vence e quantos dias faltam.
 *
 * Existe porque o manual escrito de memória erra exatamente nos pontos que
 * derrubam o sistema num sábado: o comando de publicar que mudou no
 * package.json, a variável de ambiente que entrou no .env.example e ninguém
 * anotou, a fatura em dólar somada como se fosse real, o certificado que vence
 * em março e o domínio que vence em abril. Aqui nada é lembrado: é lido do
 * arquivo, consultado no whois, medido no certificado e somado por comando.
 *
 * Uso:
 *   node scripts/manual-sistema.js varrer <pasta-do-repo>        inventário do que está no código
 *   node scripts/manual-sistema.js custo <spec.json>             tabela de custo mensal somada
 *   node scripts/manual-sistema.js vencimentos <spec.json>       datas na ordem, com dias restantes
 *   node scripts/manual-sistema.js dominio <dominio>             whois + certificado do domínio real
 *
 * Opções:
 *   --json               a mesma saída em JSON, pra outro script consumir
 *   --saida <arquivo>    grava o markdown no arquivo em vez de imprimir
 *   --em DD/MM/AAAA      data de referência dos vencimentos (padrão: hoje)
 *   --aviso <dias>       a partir de quantos dias de folga o vencimento vira aviso (padrão: 45)
 *   --consultar          em "vencimentos": junta domínio e certificado na MESMA tabela,
 *                        consultando whois e openssl na hora (precisa de rede)
 *
 * O spec é um JSON com a lista de contas do sistema. Uma entrada por conta:
 *
 *   {
 *     "sistema": "Pedidos da Padaria",
 *     "dominio": "padariadobairro.com.br",
 *     "contas": [
 *       { "item": "Vercel", "para_que": "hospeda o site", "plano": "Pro",
 *         "valor": "20", "moeda": "USD", "cotacao": "5,40", "cotacao_em": "23/09/2026",
 *         "periodo": "mes", "conta": "dono@padaria.com.br",
 *         "cofre": "1Password › Padaria › Vercel", "vence": "14/03/2027" }
 *     ]
 *   }
 *
 * Regras que o script aplica sozinho: valor em moeda estrangeira sem cotação
 * não entra na soma, vira pendência. Valor anual é dividido por 12 pra entrar
 * no mensal, e o mensal é multiplicado por 12 pra fechar o ano. Gasto de uma
 * vez só fica fora das duas somas, listado à parte. E segredo dentro do spec
 * (senha, token, chave) faz o script parar: no manual entra o NOME do cofre,
 * nunca o valor.
 *
 * Sai com código 1 se achar problema, pra dar pra encadear com &&.
 *
 * Node 18+, sem dependência de npm. Usa scripts/br.js, o whois e o openssl da máquina.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const br = require("./br.js");

// ─────────────────────────── utilidades ───────────────────────────

let problemas = 0;
let avisos = 0;

function erro(msg) { problemas++; console.error(`  ✖ ${msg}`); }
function aviso(msg) { avisos++; console.error(`  ! ${msg}`); }
function ok(msg) { console.error(`  ✓ ${msg}`); }
function info(msg) { console.error(`  · ${msg}`); }

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}`);
  console.error("");
  process.exit(1);
}

function lerJson(arquivo) {
  if (!fs.existsSync(arquivo)) morrer(`não achei ${arquivo}`);
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    morrer(`${arquivo} não é JSON válido: ${e.message}`, "Vírgula sobrando antes de } ou ] é a causa em nove de dez vezes.");
  }
}

function existe(base, rel) { return fs.existsSync(path.join(base, rel)); }

function texto(base, rel) {
  try { return fs.readFileSync(path.join(base, rel), "utf8"); } catch { return null; }
}

// ─────────────────────────── segredo no spec ───────────────────────────

const CHAVE_SECRETA = /(senha|password|passwd|secret|token|api[_-]?key|apikey|chave|credential|private[_-]?key|authorization|bearer)/i;
// prefixos reconhecíveis de credencial de serviço + blocos longos sem espaço
const VALOR_SECRETO = [
  /^sk-[A-Za-z0-9_-]{16,}/,
  /^ghp_[A-Za-z0-9]{20,}/,
  /^github_pat_[A-Za-z0-9_]{20,}/,
  /^xox[baprs]-[A-Za-z0-9-]{10,}/,
  /^AIza[A-Za-z0-9_-]{20,}/,
  /^eyJ[A-Za-z0-9_-]{20,}\./,
  /^glpat-[A-Za-z0-9_-]{16,}/,
  /^[A-Za-z0-9+/]{40,}={0,2}$/,
];

/**
 * Varre o spec inteiro e devolve os caminhos que carregam segredo.
 * Campo cujo NOME é de segredo só passa quando o valor é o nome de um cofre
 * ("1Password › ...") ou um [a confirmar].
 */
function acharSegredo(valor, caminho = "") {
  const achados = [];
  if (valor === null || valor === undefined) return achados;
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => achados.push(...acharSegredo(v, `${caminho}[${i}]`)));
    return achados;
  }
  if (typeof valor === "object") {
    for (const [k, v] of Object.entries(valor)) {
      const onde = caminho ? `${caminho}.${k}` : k;
      if (k.toLowerCase() === "cofre" || k.toLowerCase() === "onde_mora") continue;
      if (CHAVE_SECRETA.test(k) && typeof v === "string" && v.trim()) {
        const t = v.trim();
        const referencia = /\u203a|›|>|cofre|\[a confirmar\]|env(?:ironment)?|vari[áa]vel/i.test(t);
        if (!referencia) achados.push({ onde, motivo: `o campo "${k}" tem valor dentro` });
        continue;
      }
      achados.push(...acharSegredo(v, onde));
    }
    return achados;
  }
  if (typeof valor === "string") {
    const t = valor.trim();
    if (t.length >= 20 && !/\s/.test(t) && VALOR_SECRETO.some((re) => re.test(t))) {
      achados.push({ onde: caminho, motivo: "o valor tem a cara de uma credencial de serviço" });
    }
  }
  return achados;
}

// ─────────────────────────── custo ───────────────────────────

/** Normaliza o período escrito de várias formas pra uma das três chaves. */
function periodoDe(item) {
  const bruto = String(item.periodo || item.período || "mes").toLowerCase().trim();
  if (/ano|anual/.test(bruto)) return "ano";
  if (/unic|únic|uma vez|avulso/.test(bruto)) return "unico";
  return "mes";
}

/**
 * Converte um item de custo em valor mensal e anual em reais.
 * Moeda estrangeira sem cotação, valor ausente ou "[a confirmar]" viram pendência
 * em vez de virar número chutado.
 */
function mensalizar(item) {
  const periodo = periodoDe(item);
  const moeda = String(item.moeda || "BRL").toUpperCase().trim();
  const bruto = item.valor === 0 ? "0" : item.valor;
  const rotulo = item.item || item.nome || "(sem nome)";

  if (bruto === undefined || bruto === null || String(bruto).trim() === "" || /a confirmar/i.test(String(bruto))) {
    return { rotulo, periodo, moeda, aConfirmar: true, motivo: "valor não informado", mensal: 0, anual: 0 };
  }
  const valor = br.numero(bruto);
  if (!Number.isFinite(valor)) {
    return { rotulo, periodo, moeda, aConfirmar: true, motivo: `valor "${bruto}" não é número`, mensal: 0, anual: 0 };
  }

  let emReais = valor;
  let conversao = null;
  if (moeda !== "BRL" && moeda !== "R$") {
    const cot = item.cotacao || item.cotação;
    const c = cot === undefined || cot === null || String(cot).trim() === "" ? NaN : br.numero(cot);
    if (!Number.isFinite(c) || c <= 0) {
      return {
        rotulo, periodo, moeda, aConfirmar: true, mensal: 0, anual: 0,
        motivo: `${moeda} ${bruto} sem cotação: informe "cotacao" com a cotação do dia e a data`,
      };
    }
    emReais = valor * c;
    // A conversão volta escrita por extenso porque ela precisa aparecer no
    // manual com a data: cotação sem data é número que ninguém sabe conferir.
    conversao = {
      texto: `${moeda} ${valor.toLocaleString("pt-BR")} × ${c.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      em: String(item.cotacao_em || item.cotacao_data || item.cotado_em || "").trim() || null,
    };
  }

  const mensal = periodo === "mes" ? emReais : periodo === "ano" ? emReais / 12 : 0;
  const anual = periodo === "mes" ? emReais * 12 : periodo === "ano" ? emReais : 0;
  return {
    rotulo, periodo, moeda, aConfirmar: false, conversao,
    mensal: br.centavos(mensal), anual: br.centavos(anual), unico: periodo === "unico" ? br.centavos(emReais) : 0,
  };
}

/** Soma a lista de contas: total mensal, total anual, o que ficou fora e por quê. */
function somarCustos(itens) {
  const linhas = itens.map((i) => ({ item: i, conta: mensalizar(i) }));
  let mensal = 0, anual = 0, unico = 0;
  for (const l of linhas) {
    if (l.conta.aConfirmar) continue;
    mensal += l.conta.mensal;
    anual += l.conta.anual;
    unico += l.conta.unico || 0;
  }
  return {
    linhas,
    totalMensal: br.centavos(mensal),
    totalAnual: br.centavos(anual),
    totalUnico: br.centavos(unico),
    pendentes: linhas.filter((l) => l.conta.aConfirmar),
  };
}

function contasDo(spec) {
  const lista = spec.contas || spec.custos || spec.itens;
  if (!Array.isArray(lista) || !lista.length) {
    morrer("o spec não tem a lista \"contas\"", "Formato: { \"sistema\": \"...\", \"contas\": [ { \"item\": \"Vercel\", \"valor\": \"120\", \"periodo\": \"mes\" } ] }");
  }
  return lista;
}

// ─────────────────────────── vencimento ───────────────────────────

/**
 * Devolve o domínio limpo, ou null quando o que veio não é domínio.
 * Vale pra todo mundo: o nome entra em linha de comando de shell mais adiante,
 * e o que não passa por aqui não chega lá.
 */
function dominioLimpo(bruto) {
  // Minúscula primeiro: "HTTPS://Site.com.br/x" chegava aqui e saía como "https:".
  const limpo = String(bruto || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(limpo) ? limpo : null;
}

// Certificado tem régua própria, e mais curta que a das outras contas de
// propósito: ele renova sozinho com um terço da validade pela frente, então
// faltar pouco já é sinal de que a renovação automática quebrou. Domínio e
// plano, ao contrário, dependem de alguém agir, e 45 dias é a folga que dá pra
// resolver cartão recusado sem correr.
const JANELA_CERTIFICADO = 15;

/** Folga em dias vira o estado que o manual usa pra decidir se alguém age hoje. */
function estadoDe(dias, janela) {
  if (dias < 0) return "vencido";
  if (dias <= 7) return "urgente";
  if (dias <= janela) return "aviso";
  return "em dia";
}

/** Dias entre hoje e a data, negativo quando já passou. */
function diasAte(dataStr, hoje) {
  const d = br.lerData(dataStr);
  if (!d) return null;
  return br.diasEntre(hoje, d);
}

/**
 * Ordena tudo que tem data de vencimento e classifica pela folga.
 * "vencido" é o que já passou; "urgente" é o que cabe na semana.
 */
function nomeDe(c) { return c.item || c.nome || "(sem nome)"; }

function lerVencimentos(spec, hoje, janelaAviso = 45) {
  const linhas = [];
  for (const c of contasDo(spec)) {
    if (periodoDe(c) === "unico") continue;   // compra de uma vez não vence
    const quando = c.vence || c.vencimento || c.renova_em;
    if (!quando || /a confirmar/i.test(String(quando))) {
      linhas.push({ o_que: nomeDe(c), data: null, dias: null, estado: "sem data", onde: c.conta || c.dono || "" });
      continue;
    }
    const d = br.lerData(quando);
    if (!d) {
      linhas.push({ o_que: nomeDe(c), data: null, dias: null, estado: `data "${quando}" não entendida`, onde: c.conta || c.dono || "" });
      continue;
    }
    const dias = br.diasEntre(hoje, d);
    linhas.push({
      o_que: nomeDe(c),
      data: d,
      dias,
      estado: estadoDe(dias, janelaAviso),
      onde: c.conta || c.dono || "",
      cofre: c.cofre || "",
    });
  }
  const comData = linhas.filter((l) => l.data).sort((a, b) => a.data - b.data);
  const semData = linhas.filter((l) => !l.data);
  return { comData, semData };
}

// ─────────────────────────── whois e certificado ───────────────────────────

function rodar(cmd, args, ms = 25000) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: ms, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 4 * 1024 * 1024 });
  } catch (e) {
    return e.stdout && String(e.stdout).trim() ? String(e.stdout) : null;
  }
}

/**
 * whois do host. Quando vem "www.padaria.com.br", o registro que tem data de
 * vencimento é o do domínio, então tenta de novo sem o www antes de desistir.
 */
function whoisDe(dominio) {
  const primeira = rodar("whois", [dominio]);
  if (primeira && expiraNoWhois(primeira)) return primeira;
  if (/^www\./.test(dominio)) {
    const segunda = rodar("whois", [dominio.replace(/^www\./, "")]);
    if (segunda && expiraNoWhois(segunda)) return segunda;
    return primeira || segunda;
  }
  return primeira;
}

/** Acha a data de expiração no texto do whois, nos formatos que os registros usam. */
function expiraNoWhois(saida) {
  if (!saida) return null;
  const padroes = [
    /^\s*(?:Registry Expiry Date|Registrar Registration Expiration Date|Expiration Date|Expiry Date|paid-till|expire[sd]? on|expires?)\s*:\s*(.+)$/im,
    /^\s*expires\s*:\s*(\d{8})\s*$/im,
  ];
  for (const re of padroes) {
    const m = saida.match(re);
    if (!m) continue;
    const bruto = m[1].trim();
    const iso8 = bruto.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (iso8) return new Date(Number(iso8[1]), Number(iso8[2]) - 1, Number(iso8[3]));
    const isoTraco = bruto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoTraco) return new Date(Number(isoTraco[1]), Number(isoTraco[2]) - 1, Number(isoTraco[3]));
    const d = new Date(bruto);
    if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

/**
 * As quatro respostas de DNS que o manual precisa: quem controla o domínio (NS),
 * pra onde o site aponta (A e CNAME) e quem entrega o e-mail da empresa (MX).
 * O MX é o que se perde sem perceber ao trocar de hospedagem.
 */
function dnsDe(dominio) {
  const consulta = (tipo, nome) => {
    const saida = rodar("dig", ["+short", tipo, nome], 15000);
    if (!saida) return [];
    return saida.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  };
  // NS, A e MX se perguntam ao domínio, não ao host: em "www.padaria.com.br" o
  // www costuma ser um CNAME, e a resposta vem contaminada pelo destino dele —
  // o MX apareceria como se o e-mail da empresa fosse entregue pela CDN.
  const raiz = dominio.replace(/^www\./, "");
  return {
    dominio: raiz,
    ns: consulta("NS", raiz),
    a: consulta("A", raiz),
    cname: consulta("CNAME", `www.${raiz}`),
    mx: consulta("MX", raiz),
  };
}

/** notAfter do certificado que o servidor apresenta de verdade, não o que se supõe. */
function certificadoDe(dominio) {
  // O nome vai montado numa linha de /bin/sh: o que não é domínio não passa daqui.
  const limpo = dominioLimpo(dominio);
  if (!limpo) return null;
  const cmd = `echo | openssl s_client -connect ${limpo}:443 -servername ${limpo} 2>/dev/null | openssl x509 -noout -dates -issuer -subject 2>/dev/null`;
  const saida = rodar("/bin/sh", ["-c", cmd], 25000);
  if (!saida) return null;
  const m = saida.match(/notAfter=(.+)/);
  if (!m) return null;
  const d = new Date(m[1].trim());
  if (isNaN(d)) return null;
  const issuer = (saida.match(/issuer=\s*(.+)/) || [, ""])[1].trim();
  const cn = (issuer.match(/CN\s*=\s*([^,/]+)/) || [, issuer])[1].trim();
  return { notAfter: new Date(d.getFullYear(), d.getMonth(), d.getDate()), emissor: cn || "(não declarado)" };
}

/**
 * Traduz o cron pro português de quem vai ler o manual. "0 3 * * *" não informa
 * nada a quem paga a conta; "todo dia às 03:00" informa. O que não cai num
 * padrão conhecido volta como null e a expressão crua vai pro manual do jeito
 * que está, com [a confirmar] do lado.
 */
const DIA_SEMANA_CRON = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
// "toda domingo" e "do segunda" saíam do manual quando o artigo era fixo.
const ARTIGO_TODO = ["todo", "toda", "toda", "toda", "toda", "toda", "todo"];
const ARTIGO_DE = ["do", "da", "da", "da", "da", "da", "do"];

/** No cron o domingo é 0 e também 7. Sem normalizar, "0 9 * * 7" virava [a confirmar]. */
function diaCron(n) { return Number(n) === 7 ? 0 : Number(n); }

/**
 * O campo de dia da semana em português. Faixa e lista são o caso comum de
 * negócio ("de segunda a sexta"), e era justamente o que caía no [a confirmar].
 */
function semanaEmPortugues(campo) {
  if (/^[0-7]$/.test(campo)) {
    const d = diaCron(campo);
    return `${ARTIGO_TODO[d]} ${DIA_SEMANA_CRON[d]}`;
  }
  const faixa = campo.match(/^([0-7])-([0-7])$/);
  if (faixa) {
    const a = diaCron(faixa[1]), b = diaCron(faixa[2]);
    if (a >= b) return null;
    return `de ${DIA_SEMANA_CRON[a]} a ${DIA_SEMANA_CRON[b]}`;
  }
  if (/^[0-7](,[0-7])+$/.test(campo)) {
    const dias = [...new Set(campo.split(",").map(diaCron))].sort((x, y) => x - y).map((d) => DIA_SEMANA_CRON[d]);
    if (dias.length < 2) return null;
    return `${dias.slice(0, -1).join(", ")} e ${dias[dias.length - 1]}`;
  }
  return null;
}

function cronEmPortugues(expr) {
  const campos = String(expr || "").trim().split(/\s+/);
  if (campos.length !== 5) return null;
  const [min, hora, dia, mes, semana] = campos;
  const hhmm = () => {
    if (!/^\d{1,2}$/.test(min) || !/^\d{1,2}$/.test(hora)) return null;
    const h = Number(hora), m = Number(min);
    if (h > 23 || m > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  if (mes !== "*") return null;
  const cada = min.match(/^\*\/(\d{1,2})$/);
  if (cada && hora === "*" && dia === "*" && semana === "*") return `a cada ${cada[1]} minuto(s)`;
  const cadaHora = hora.match(/^\*\/(\d{1,2})$/);
  if (cadaHora && /^\d{1,2}$/.test(min) && dia === "*" && semana === "*") return `a cada ${cadaHora[1]} hora(s), no minuto ${Number(min)}`;
  const t = hhmm();
  if (!t) return null;
  if (dia === "*" && semana === "*") return `todo dia às ${t}`;
  if (dia === "*") {
    const s = semanaEmPortugues(semana);
    return s ? `${s} às ${t}` : null;
  }
  if (/^\d{1,2}$/.test(dia) && Number(dia) >= 1 && Number(dia) <= 31 && semana === "*") return `todo dia ${Number(dia)} do mês às ${t}`;
  return null;
}

/** O mesmo horário lido no fuso de quem opera o negócio. Brasília é UTC−3 o ano inteiro. */
function emBrasilia(expr) {
  const campos = String(expr || "").trim().split(/\s+/);
  if (campos.length !== 5) return null;
  const [min, hora, , , semana] = campos;
  if (!/^\d{1,2}$/.test(min) || !/^\d{1,2}$/.test(hora)) return null;
  const h = Number(hora), m = Number(min);
  if (h > 23 || m > 59) return null;
  const local = (h + 24 - 3) % 24;
  // 01:00 UTC de segunda é 22:00 de domingo. Sem essa linha, quem foi procurar
  // o registro da rotina procurou no dia seguinte ao que ela rodou.
  let dia = "";
  if (h < 3) {
    dia = /^[0-7]$/.test(semana) ? ` ${ARTIGO_DE[(diaCron(semana) + 6) % 7]} ${DIA_SEMANA_CRON[(diaCron(semana) + 6) % 7]}` : " do dia anterior";
  }
  return `${String(local).padStart(2, "0")}:${String(m).padStart(2, "0")}${dia}`;
}

/** Uma linha de rotina do jeito que ela entra na seção "O que roda sozinho". */
function linhaRotina(o_que, expr, onde, utc) {
  const humano = cronEmPortugues(expr);
  const local = utc ? emBrasilia(expr) : null;
  const quando = humano
    ? `${humano}${local ? ` em UTC, que é ${local} em Brasília` : ""}`
    : `\`${expr}\` — [a confirmar] qual horário é esse`;
  return `${o_que}: ${quando} (${onde})`;
}

// ─────────────────────────── varrer o repositório ───────────────────────────

const PLATAFORMAS = [
  ["vercel.json", "Vercel"],
  ["netlify.toml", "Netlify"],
  ["railway.json", "Railway"],
  ["railway.toml", "Railway"],
  ["fly.toml", "Fly.io"],
  ["render.yaml", "Render"],
  ["Procfile", "Heroku ou compatível"],
  ["Dockerfile", "container Docker"],
  ["docker-compose.yml", "Docker Compose"],
  ["compose.yaml", "Docker Compose"],
  ["app.yaml", "Google App Engine"],
  ["wrangler.toml", "Cloudflare Workers"],
];

const BANCOS = [
  [/@supabase\/supabase-js|supabase/, "Supabase (Postgres)"],
  [/^prisma$|@prisma\/client/, "Prisma"],
  [/drizzle-orm/, "Drizzle"],
  [/^pg$|postgres/, "Postgres"],
  [/mysql2?|mariadb/, "MySQL ou MariaDB"],
  [/mongoose|mongodb/, "MongoDB"],
  [/better-sqlite3|sqlite3/, "SQLite"],
  [/redis|ioredis/, "Redis"],
  [/firebase|firebase-admin/, "Firebase"],
];

const FRAMEWORKS = [
  [/^next$/, "Next.js"],
  [/^nuxt$/, "Nuxt"],
  [/^astro$/, "Astro"],
  [/^remix|@remix-run/, "Remix"],
  [/^express$/, "Express"],
  [/^fastify$/, "Fastify"],
  [/@nestjs\/core/, "NestJS"],
  [/^hono$/, "Hono"],
  [/^vite$/, "Vite"],
  [/^react$/, "React"],
  [/^vue$/, "Vue"],
  [/^svelte/, "Svelte"],
];

/** Só os NOMES das variáveis. O valor nunca sai daqui. */
function variaveisDo(conteudo) {
  const nomes = [];
  const comValor = [];
  const comCredencial = [];
  for (const linha of conteudo.split(/\r?\n/)) {
    const l = linha.trim();
    if (!l || l.startsWith("#")) continue;
    const m = l.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!m) continue;
    nomes.push(m[1]);
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    const ehExemplo = /^(<|\{|xxx|your|sua|seu|troque|change|placeholder|exemplo|example|…|\.\.\.)/i.test(v);
    const ehPublico = /^(https?:\/\/|true|false|\d+$|localhost|development|production)/i.test(v);
    if (v && !ehExemplo && !ehPublico && v.length >= 16 && !/\s/.test(v)) {
      comValor.push(m[1]);
      // Nome de campo de segredo com valor preenchido, ou valor com cara de
      // credencial de serviço: isso não é exemplo mal formatado, é chave vazada.
      if (CHAVE_SECRETA.test(m[1]) || VALOR_SECRETO.some((re) => re.test(v))) comCredencial.push(m[1]);
    }
  }
  return { nomes, comValor, comCredencial };
}

function varrerPasta(base) {
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) morrer(`${base} não é uma pasta`);
  const r = {
    pasta: path.resolve(base), nome: null, versao: null, node: null, gerenciador: null,
    comandos: {}, publicacao: null, framework: [], banco: [], plataforma: [], variaveis: [], variaveisComValor: [], credenciais: [],
    arquivoDeVariaveis: null, migracoes: null, rotinas: [], alertas: [], readme: false, readmeEnsinaRodar: false,
  };

  const pkgBruto = texto(base, "package.json");
  if (pkgBruto) {
    let pkg = {};
    try { pkg = JSON.parse(pkgBruto.replace(/^\uFEFF/, "")); } catch { r.alertas.push("package.json não é JSON válido"); }
    r.nome = pkg.name || null;
    r.versao = pkg.version || null;
    r.node = (pkg.engines && pkg.engines.node) || null;
    r.comandos = pkg.scripts || {};
    const deps = Object.keys(Object.assign({}, pkg.dependencies, pkg.devDependencies));
    for (const [re, nome] of FRAMEWORKS) if (deps.some((d) => re.test(d)) && !r.framework.includes(nome)) r.framework.push(nome);
    for (const [re, nome] of BANCOS) if (deps.some((d) => re.test(d)) && !r.banco.includes(nome)) r.banco.push(nome);
    if (!r.node) r.alertas.push('package.json sem "engines.node": quem for rodar na máquina nova não sabe qual versão do Node usar');
  } else if (existe(base, "requirements.txt") || existe(base, "pyproject.toml")) {
    r.alertas.push("projeto Python: o inventário de comandos precisa ser levantado na conversa, o script lê package.json");
  } else {
    r.alertas.push("não achei package.json: confirme que a pasta é a raiz do repositório");
  }

  if (existe(base, "pnpm-lock.yaml")) r.gerenciador = "pnpm";
  else if (existe(base, "yarn.lock")) r.gerenciador = "yarn";
  else if (existe(base, "bun.lockb") || existe(base, "bun.lock")) r.gerenciador = "bun";
  else if (existe(base, "package-lock.json")) r.gerenciador = "npm";
  if (pkgBruto && !r.gerenciador) r.alertas.push("nenhum lockfile no repositório: a instalação numa máquina nova pode trazer versão diferente e quebrar sem motivo aparente");

  // Uma linha por plataforma, com todos os arquivos dela juntos: Railway com
  // railway.json e railway.toml é uma plataforma, não duas.
  const porPlataforma = new Map();
  for (const [arq, nome] of PLATAFORMAS) {
    if (!existe(base, arq)) continue;
    if (!porPlataforma.has(nome)) porPlataforma.set(nome, []);
    porPlataforma.get(nome).push(arq);
  }
  for (const [nome, arqs] of porPlataforma) r.plataforma.push(`${nome} (${arqs.join(", ")})`);
  if (existe(base, ".github/workflows")) {
    try {
      const dir = path.join(base, ".github/workflows");
      const fluxos = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
      if (fluxos.length) r.plataforma.push(`GitHub Actions (${fluxos.join(", ")})`);
      for (const f of fluxos) {
        let conteudo = "";
        try { conteudo = fs.readFileSync(path.join(dir, f), "utf8"); } catch { continue; }
        // O YAML aceita a expressão com e sem aspas, e a versão sem aspas
        // (`- cron: 0 3 * * *`) é legítima: lendo só a com aspas, a rotina
        // ficava fora do manual e ninguém sabia que ela existia.
        for (const m of conteudo.matchAll(/^\s*-?\s*cron\s*:\s*(.+)$/gm)) {
          const expr = m[1].trim().replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "").trim();
          if (expr) r.rotinas.push(linhaRotina(f, expr, `.github/workflows/${f}`, true));
        }
      }
    } catch { /* pasta ilegível, segue */ }
  }

  const vercel = texto(base, "vercel.json");
  if (vercel) {
    try {
      const v = JSON.parse(vercel);
      if (v.buildCommand) r.publicacao = v.buildCommand;
      if (Array.isArray(v.crons)) {
        for (const c of v.crons) {
          if (!c || !c.schedule) continue;
          r.rotinas.push(linhaRotina(c.path || "(rotina sem caminho declarado)", String(c.schedule), "vercel.json", true));
        }
      }
    } catch { r.alertas.push("vercel.json não é JSON válido"); }
  }

  for (const arq of [".env.example", ".env.sample", ".env.template", "env.example", ".env.exemplo"]) {
    const c = texto(base, arq);
    if (!c) continue;
    const { nomes, comValor, comCredencial } = variaveisDo(c);
    r.arquivoDeVariaveis = arq;
    r.variaveis = nomes;
    r.variaveisComValor = comValor;
    r.credenciais = comCredencial;
    break;
  }
  if (!r.arquivoDeVariaveis) r.alertas.push("sem .env.example: a lista do que o sistema precisa pra subir não existe em nenhum lugar conferível");
  const soFormatacao = r.variaveisComValor.filter((v) => !r.credenciais.includes(v));
  if (soFormatacao.length) r.alertas.push(`${r.arquivoDeVariaveis} tem valor de verdade dentro (${soFormatacao.join(", ")}): arquivo de exemplo leva o nome e um espaço vazio`);

  const gitignore = texto(base, ".gitignore") || "";
  if (existe(base, ".env") && !/^\s*\.env\s*$/m.test(gitignore) && !/^\s*\*?\.env\*?\s*$/m.test(gitignore)) {
    r.alertas.push(".env existe na pasta e o .gitignore não cobre ele: rode node scripts/verificar.js segredo antes de qualquer commit");
  }

  for (const [pasta, rotulo] of [["prisma/migrations", "Prisma"], ["supabase/migrations", "Supabase"], ["migrations", "próprias"], ["db/migrate", "próprias"]]) {
    if (!existe(base, pasta)) continue;
    try {
      const n = fs.readdirSync(path.join(base, pasta)).filter((f) => !f.startsWith(".")).length;
      r.migracoes = `${n} migração(ões) em ${pasta} (${rotulo})`;
      break;
    } catch { /* segue */ }
  }

  const readme = texto(base, "README.md") || texto(base, "readme.md");
  if (readme) {
    r.readme = true;
    r.readmeEnsinaRodar = /(npm|pnpm|yarn|bun)\s+(i|install|run)/i.test(readme);
    if (!r.readmeEnsinaRodar) r.alertas.push("o README não mostra como instalar e rodar: é o primeiro item da passagem de bastão");
  } else r.alertas.push("sem README no repositório");

  return r;
}

// ─────────────────────────── markdown ───────────────────────────

/**
 * Célula de tabela. O pipe é o que separa coluna em markdown, então um pipe
 * dentro de valor lido de arquivo (o comando `next build | tee log` do
 * package.json, por exemplo) partia a linha em duas colunas e desalinhava a
 * tabela inteira. Quebra de linha dentro da célula faz o mesmo estrago.
 */
function celula(v) {
  return String(v === undefined || v === null ? "" : v).replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function tabela(cabecalho, linhas) {
  const l = [`| ${cabecalho.map(celula).join(" | ")} |`, `|${cabecalho.map(() => "---").join("|")}|`];
  for (const linha of linhas) l.push(`| ${linha.map(celula).join(" | ")} |`);
  return l.join("\n");
}

function mdVarredura(r) {
  const out = [];
  out.push(`# Inventário do repositório — ${r.nome || path.basename(r.pasta)}`);
  out.push("");
  out.push(`Lido de \`${r.pasta}\` em ${br.fmt(new Date())} por \`node scripts/manual-sistema.js varrer\`.`);
  out.push("");
  out.push("## O que o sistema é");
  out.push("");
  const ficha = [];
  if (r.nome) ficha.push(["Nome no `package.json`", r.nome + (r.versao ? ` (versão ${r.versao})` : "")]);
  ficha.push(["Node declarado", r.node || "[a confirmar] — não está no `engines.node`"]);
  ficha.push(["Instalação", r.gerenciador ? `\`${r.gerenciador} install\`` : "[a confirmar] — sem lockfile"]);
  ficha.push(["Como foi construído", r.framework.length ? r.framework.join(", ") : "[a confirmar]"]);
  ficha.push(["Onde o dado mora", r.banco.length ? r.banco.join(", ") : "[a confirmar]"]);
  ficha.push(["Onde roda", r.plataforma.length ? r.plataforma.join("; ") : "[a confirmar] — nenhum arquivo de plataforma no repositório"]);
  ficha.push(["Migrações", r.migracoes || "nenhuma pasta de migração encontrada"]);
  out.push(tabela(["Item", "O que o repositório diz"], ficha));
  out.push("");
  out.push("## Comandos que existem de verdade");
  out.push("");
  const cmds = Object.entries(r.comandos);
  if (cmds.length) {
    out.push(tabela(["Comando", "O que está escrito"], cmds.map(([k, v]) => [`\`${r.gerenciador || "npm"} run ${k}\``, `\`${v}\``])));
  } else out.push("Nenhum script declarado. O comando de subir e de publicar precisa ser levantado com quem construiu.");
  out.push("");
  if (r.publicacao) {
    out.push(`A plataforma publica rodando \`${r.publicacao}\` (o \`buildCommand\` do vercel.json).`);
    out.push("");
  }
  if (r.rotinas.length) {
    out.push("## O que roda sozinho");
    out.push("");
    for (const x of r.rotinas) out.push(`- ${x}`);
    out.push("");
  }
  out.push("## O que o sistema precisa pra subir");
  out.push("");
  if (r.variaveis.length) {
    out.push(`Do \`${r.arquivoDeVariaveis}\`, ${r.variaveis.length} variável(is). Só o nome: o valor mora no cofre.`);
    out.push("");
    out.push(tabela(["Variável", "Pra que serve", "Onde o valor mora"], r.variaveis.map((v) => [`\`${v}\``, "[a confirmar]", "[a confirmar]"])));
  } else out.push("Nenhuma lista de variáveis encontrada no repositório.");
  out.push("");
  if (r.credenciais.length) {
    out.push("## Achado de segurança, pra tratar antes do manual");
    out.push("");
    out.push(`O \`${r.arquivoDeVariaveis}\` está versionado com valor de verdade em ${r.credenciais.map((v) => `\`${v}\``).join(", ")}. Chave que entrou no repositório está queimada mesmo depois de apagada, porque o histórico guarda. A ordem é: trocar no provedor, apagar o valor do arquivo, e só então escrever o manual.`);
    out.push("");
  }
  if (r.alertas.length) {
    out.push("## O que já apareceu de errado");
    out.push("");
    for (const a of r.alertas) out.push(`- ${a}`);
    out.push("");
  }
  return out.join("\n");
}

function mdCusto(spec, soma) {
  const out = [];
  out.push(`# Custo mensal — ${spec.sistema || "sistema"}`);
  out.push("");
  out.push(`Somado em ${br.fmt(new Date())} por \`node scripts/manual-sistema.js custo\`.`);
  out.push("");
  // Três tabelas de propósito, e a divisão não é estética. O
  // `node scripts/verificar.js tabela` só confere a coluna contra a linha Total
  // quando todas as células dela têm número: uma única linha "[a confirmar]" no
  // meio faz a conferência ser pulada em silêncio, e é justamente a conferência
  // que pega o total copiado errado pro MANUAL.md. Então a primeira tabela leva
  // só o que entrou na soma, e o que ficou de fora vai na última, por escrito.
  const recorrentes = soma.linhas.filter((l) => !l.conta.aConfirmar && l.conta.periodo !== "unico");
  const unicos = soma.linhas.filter((l) => !l.conta.aConfirmar && l.conta.periodo === "unico");
  if (recorrentes.length) {
    const linhas = recorrentes.map(({ item, conta }) => [
      conta.rotulo,
      item.para_que || item.para_quê || "[a confirmar]",
      item.plano || "-",
      br.reais(conta.mensal),
      item.conta || item.dono || "[a confirmar]",
    ]);
    linhas.push(["Total", "", "", br.reais(soma.totalMensal), ""]);
    out.push(tabela(["Conta", "Pra que serve", "Plano", "Valor", "No nome de quem"], linhas));
    out.push("");
    out.push(`No ano isso dá ${br.reais(soma.totalAnual)}. A anuidade entra inteira nessa conta e dividida por doze na tabela de cima, então o anual não é o mensal vezes doze exato.`);
  } else {
    out.push("Nenhuma conta recorrente com valor confirmado. Enquanto essa tabela estiver vazia, o manual não responde quanto o sistema custa por mês.");
  }

  const comCotacao = recorrentes.concat(unicos).filter((l) => l.conta.conversao);
  if (comCotacao.length) {
    out.push("");
    out.push("Cotação usada pra converter:");
    out.push("");
    for (const { conta } of comCotacao) {
      const quando = conta.conversao.em ? `cotação de ${conta.conversao.em}` : "**[a confirmar] de que dia é essa cotação**";
      out.push(`- ${conta.rotulo}: ${conta.conversao.texto} (${quando})`);
    }
  }

  if (unicos.length) {
    out.push("");
    out.push("Gasto de uma vez só, fora da soma mensal:");
    out.push("");
    const lu = unicos.map(({ item, conta }) => [conta.rotulo, item.para_que || item.para_quê || "[a confirmar]", br.reais(conta.unico)]);
    lu.push(["Total", "", br.reais(soma.totalUnico)]);
    out.push(tabela(["Gasto", "Pra que serve", "Valor"], lu));
  }

  if (soma.pendentes.length) {
    out.push("");
    out.push("Fora da soma, por falta de dado. Cada linha daqui vira item do `[a confirmar]` no manual, com o nome de quem responde:");
    out.push("");
    out.push(tabela(["Conta", "Pra que serve", "Por que ficou fora"], soma.pendentes.map(({ item, conta }) => [
      conta.rotulo,
      item.para_que || item.para_quê || "[a confirmar]",
      conta.motivo,
    ])));
  }
  out.push("");
  return out.join("\n");
}

function mdVencimentos(spec, v, hoje) {
  const out = [];
  out.push(`# Vencimentos — ${spec.sistema || "sistema"}`);
  out.push("");
  out.push(`Contado a partir de ${br.fmt(hoje)} (${br.diaSemana(hoje)}).`);
  out.push("");
  const linhas = v.comData.map((l) => [
    l.o_que,
    `${br.fmt(l.data)} (${br.diaSemana(l.data)})`,
    l.dias < 0 ? `venceu há ${Math.abs(l.dias)} dia(s)` : `faltam ${l.dias} dia(s)`,
    l.estado,
    l.onde || "[a confirmar]",
  ]);
  if (linhas.length) out.push(tabela(["O que vence", "Quando", "Folga", "Estado", "No nome de quem"], linhas));
  else out.push("Nenhuma conta com data confirmada. Enquanto essa tabela estiver vazia, o manual não avisa ninguém de nada.");
  if (v.semData.length) {
    out.push("");
    out.push("Sem data confirmada:");
    out.push("");
    for (const s of v.semData) out.push(`- **${s.o_que}** — ${s.estado}`);
  }
  out.push("");
  return out.join("\n");
}

// ─────────────────────────── comandos ───────────────────────────

function entregar(md, args, dados) {
  if (args.json) { console.log(JSON.stringify(dados, null, 2)); return; }
  if (args.saida) {
    fs.mkdirSync(path.dirname(path.resolve(args.saida)), { recursive: true });
    fs.writeFileSync(args.saida, md.endsWith("\n") ? md : md + "\n", "utf8");
    console.error(`\n  → ${args.saida}\n`);
    return;
  }
  console.log(md);
}

function cmdVarrer(alvo, args) {
  console.error(`\nVARRENDO ${alvo}`);
  const r = varrerPasta(alvo);
  if (r.framework.length) ok(`construído com ${r.framework.join(", ")}`);
  if (r.plataforma.length) ok(`roda em ${r.plataforma.join("; ")}`);
  else aviso("nenhum arquivo de plataforma: onde isso está publicado precisa ser perguntado");
  if (Object.keys(r.comandos).length) ok(`${Object.keys(r.comandos).length} comando(s) declarado(s) no package.json`);
  if (r.variaveis.length) ok(`${r.variaveis.length} variável(is) em ${r.arquivoDeVariaveis} (só nomes, nenhum valor lido)`);
  for (const a of r.alertas) aviso(a);
  if (r.credenciais.length) {
    erro(`${r.arquivoDeVariaveis} tem chave de verdade dentro: ${r.credenciais.join(", ")}`);
    info("isso é vazamento, não formatação: troque a chave no provedor, apague o valor do arquivo de exemplo e rode node scripts/verificar.js segredo antes de seguir");
  }
  entregar(mdVarredura(r), args, r);
  return r;
}

/** Spec com segredo dentro não passa por nenhum comando: o arquivo vira o vazamento. */
function exigirSemSegredo(spec) {
  const segredos = acharSegredo(spec);
  if (!segredos.length) return;
  for (const s of segredos) erro(`${s.onde}: ${s.motivo}`);
  morrer("tem segredo dentro do spec", "No manual entra o NOME do cofre (campo \"cofre\"), nunca o valor. Apague o valor do JSON, troque a chave no provedor se ela já circulou, e rode node scripts/verificar.js segredo .");
}

function cmdCusto(arquivo, args) {
  const spec = lerJson(arquivo);
  console.error(`\nCUSTO DE ${spec.sistema || arquivo}`);
  exigirSemSegredo(spec);
  const soma = somarCustos(contasDo(spec));
  ok(`${soma.linhas.length} conta(s), total de ${br.reais(soma.totalMensal)} por mês e ${br.reais(soma.totalAnual)} no ano`);
  if (soma.totalUnico) info(`mais ${br.reais(soma.totalUnico)} de gasto de uma vez só, que fica fora da soma mensal de propósito`);
  for (const p of soma.pendentes) aviso(`${p.conta.rotulo} ficou fora da soma: ${p.conta.motivo}`);
  for (const l of soma.linhas) {
    if (l.conta.conversao && !l.conta.conversao.em) {
      aviso(`${l.conta.rotulo}: a cotação não tem data. Informe "cotacao_em": "DD/MM/AAAA", porque cotação sem data ninguém confere depois`);
    }
  }
  entregar(mdCusto(spec, soma), args, { totalMensal: soma.totalMensal, totalAnual: soma.totalAnual, totalUnico: soma.totalUnico, linhas: soma.linhas });
}

/**
 * Domínio e certificado viram linha da mesma tabela dos outros vencimentos.
 * Separado em duas listas, alguém precisa juntar de cabeça pra saber o que
 * vence primeiro — e é aí que a data mais próxima passa batida.
 */
function vencimentosDoDominio(dominio, hoje, janela) {
  const limpo = dominioLimpo(dominio);
  if (!limpo) {
    aviso(`"${dominio}" não parece um domínio: registro e certificado ficam como [a confirmar]`);
    return [];
  }
  const linhas = [];
  const semData = (o_que, motivo) => ({ o_que, data: null, dias: null, estado: motivo, onde: "" });
  const comData = (o_que, data, onde, janelaDela = janela) => ({ o_que, data, dias: br.diasEntre(hoje, data), estado: estadoDe(br.diasEntre(hoje, data), janelaDela), onde });

  const whois = whoisDe(limpo);
  const exp = whois ? expiraNoWhois(whois) : null;
  if (exp) linhas.push(comData(`Registro do domínio ${limpo}`, exp, "conta do registrador"));
  else linhas.push(semData(`Registro do domínio ${limpo}`, whois ? "o whois respondeu sem data legível — confira no painel do registrador" : "o whois não respondeu — confira no painel do registrador"));

  const cert = certificadoDe(limpo);
  if (cert) linhas.push(comData(`Certificado de ${limpo}`, cert.notAfter, `emitido por ${cert.emissor}`, Math.min(janela, JANELA_CERTIFICADO)));
  else linhas.push(semData(`Certificado de ${limpo}`, "não deu pra ler o certificado — porta 443 fechada, sem rede, ou openssl ausente"));
  return linhas;
}

function cmdVencimentos(arquivo, args) {
  const spec = lerJson(arquivo);
  exigirSemSegredo(spec);
  const hoje = args.em ? br.lerData(args.em) : new Date();
  if (!hoje) morrer(`não entendi a data "${args.em}"`, "Use --em DD/MM/AAAA.");
  const janela = args.aviso !== undefined ? args.aviso : 45;
  console.error(`\nVENCIMENTOS DE ${spec.sistema || arquivo}`);
  const v = lerVencimentos(spec, hoje, janela);
  if (args.consultar) {
    const dom = spec.dominio || spec["domínio"];
    if (!dom) aviso("--consultar pede o domínio, e o spec não tem o campo \"dominio\"");
    else {
      info(`consultando ${dom} no whois e no certificado, o que leva alguns segundos`);
      for (const l of vencimentosDoDominio(dom, hoje, janela)) (l.data ? v.comData : v.semData).push(l);
      v.comData.sort((a, b) => a.data - b.data);
    }
  }
  for (const l of v.comData) {
    const quando = `${br.fmt(l.data)} (${br.diaSemana(l.data)})`;
    if (l.estado === "vencido") erro(`${l.o_que} venceu em ${quando}, há ${Math.abs(l.dias)} dia(s)`);
    else if (l.estado === "urgente") erro(`${l.o_que} vence em ${quando}, faltam ${l.dias} dia(s)`);
    else if (l.estado === "aviso") aviso(`${l.o_que} vence em ${quando}, faltam ${l.dias} dia(s)`);
    else ok(`${l.o_que} vence em ${quando}, faltam ${l.dias} dia(s)`);
  }
  for (const s of v.semData) aviso(`${s.o_que}: ${s.estado}`);
  if (!v.comData.length) aviso("nenhuma conta com data de vencimento: sem isso o manual não avisa nada");
  entregar(mdVencimentos(spec, v, hoje), args, v);
}

function cmdDominio(dominio, args) {
  const limpo = dominioLimpo(dominio);
  if (!limpo) morrer(`"${dominio}" não parece um domínio`, "Exemplo: node scripts/manual-sistema.js dominio padariadobairro.com.br");
  console.error(`\nDOMÍNIO ${limpo}`);
  const janela = args.aviso !== undefined ? args.aviso : 45;
  const hoje = args.em ? br.lerData(args.em) : new Date();
  if (!hoje) morrer(`não entendi a data "${args.em}"`, "Use --em DD/MM/AAAA.");
  const dados = { dominio: limpo, registro: null, certificado: null, dns: null };
  let dataRegistro = null, dataCert = null;

  const whois = whoisDe(limpo);
  if (!whois) aviso("o whois não respondeu (sem rede, sem o comando instalado, ou o registro limitou a consulta): o vencimento do domínio entra como [a confirmar]");
  else {
    const exp = expiraNoWhois(whois);
    if (!exp) aviso("o whois respondeu mas não traz data de expiração legível: confira no painel do registrador");
    else {
      const dias = br.diasEntre(hoje, exp);
      dados.registro = { vence: br.iso(exp), dias };
      dataRegistro = exp;
      const msg = `registro do domínio vence em ${br.fmt(exp)} (${br.diaSemana(exp)}), ${dias < 0 ? `há ${Math.abs(dias)} dia(s)` : `faltam ${dias} dia(s)`}`;
      if (dias < 0) erro(msg); else if (dias <= janela) aviso(msg); else ok(msg);
    }
  }

  const cert = certificadoDe(limpo);
  if (!cert) aviso("não deu pra ler o certificado (porta 443 fechada, sem rede, ou openssl ausente): entra como [a confirmar]");
  else {
    const dias = br.diasEntre(hoje, cert.notAfter);
    dados.certificado = { vence: br.iso(cert.notAfter), dias, emissor: cert.emissor };
    dataCert = cert.notAfter;
    const msg = `certificado vence em ${br.fmt(cert.notAfter)} (${br.diaSemana(cert.notAfter)}), ${dias < 0 ? `há ${Math.abs(dias)} dia(s)` : `faltam ${dias} dia(s)`}, emitido por ${cert.emissor}`;
    if (dias < 0) erro(msg); else if (dias <= JANELA_CERTIFICADO) aviso(msg); else ok(msg);
    if (dias > 0 && dias <= JANELA_CERTIFICADO) info("certificado que renova sozinho costuma renovar com um terço da validade pela frente: se não renovou, a renovação automática quebrou");
  }

  const dns = dnsDe(limpo);
  dados.dns = dns;
  if (!dns.ns.length && !dns.a.length) aviso("o dig não respondeu nada: sem rede, ou o domínio não está publicado");
  else {
    if (dns.ns.length) ok(`DNS controlado por ${dns.ns.join(", ")}`);
    else aviso("sem registro NS: o domínio não tem servidor de nomes respondendo");
    if (dns.a.length) ok(`o endereço aponta pra ${dns.a.join(", ")}`);
    if (dns.cname.length) info(`www vai por CNAME pra ${dns.cname.join(", ")}`);
    if (dns.mx.length) ok(`e-mail da empresa entregue por ${dns.mx.join(", ")}`);
    else aviso("sem registro MX: ou o e-mail da empresa é de outro domínio, ou ele não chega");
  }

  const md = [
    `# Domínio, certificado e DNS — ${limpo}`,
    "",
    `Consultado em ${br.fmt(hoje)} por \`node scripts/manual-sistema.js dominio ${limpo}\`.`,
    "",
    tabela(["O que", "Vence em", "Folga", "Fonte"], [
      ["Registro do domínio", dataRegistro ? `${br.fmt(dataRegistro)} (${br.diaSemana(dataRegistro)})` : "[a confirmar]", dados.registro ? `${dados.registro.dias} dia(s)` : "-", "`whois`"],
      ["Certificado TLS", dataCert ? `${br.fmt(dataCert)} (${br.diaSemana(dataCert)})` : "[a confirmar]", dados.certificado ? `${dados.certificado.dias} dia(s)` : "-", `\`openssl s_client\`${dados.certificado ? `, emitido por ${dados.certificado.emissor}` : ""}`],
    ]),
    "",
    "## Pra onde as coisas apontam",
    "",
    tabela(["O que", "Resposta de hoje", "Por que importa"], [
      ["Quem controla o DNS (NS)", dns.ns.length ? dns.ns.join(", ") : "[a confirmar]", "é aqui que se aponta o site, e quem tem essa conta manda no endereço"],
      ["Onde o site está (A)", dns.a.length ? dns.a.join(", ") : "[a confirmar]", "trocar isso troca o site inteiro de lugar"],
      ["www (CNAME)", dns.cname.length ? dns.cname.join(", ") : "sem CNAME", "o endereço com www só funciona se essa linha existir"],
      ["E-mail da empresa (MX)", dns.mx.length ? dns.mx.join(", ") : "[a confirmar]", "mexer no DNS sem copiar essa linha derruba o e-mail junto"],
    ]),
    "",
  ].join("\n");
  entregar(md, args, dados);
}

// ─────────────────────────── main ───────────────────────────

function valorDe(opcao, valor, exemplo) {
  if (valor === undefined || String(valor).startsWith("--")) morrer(`${opcao} veio sem valor`, `Exemplo: ${exemplo}`);
  return valor;
}

function lerArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    // Valor faltando não segue em silêncio: `--saida` sem nome de arquivo
    // imprimia na tela e o documento nunca era gravado, sem nenhum aviso.
    else if (a === "--saida") args.saida = valorDe(a, argv[++i], "--saida sistemas/padaria/docs/custo.md");
    else if (a === "--em") args.em = valorDe(a, argv[++i], "--em 30/09/2026");
    else if (a === "--aviso") args.aviso = valorDe(a, argv[++i], "--aviso 45");
    else if (a === "--consultar") args.consultar = true;
    else if (a.startsWith("--")) morrer(`opção desconhecida: ${a}`, "Opções: --json, --saida <arquivo>, --em DD/MM/AAAA, --aviso <dias>, --consultar");
    else args._.push(a);
  }
  if (args.aviso !== undefined) {
    // Sem esta conferência, --aviso escrito errado virava NaN e toda comparação
    // dava falso: o script dizia "em dia" pra conta que vencia na semana.
    const n = br.numero(args.aviso);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      morrer(`--aviso espera um número de dias, e veio "${args.aviso}"`, "Exemplo: --aviso 45 pra tratar como aviso tudo que vence nos próximos 45 dias.");
    }
    args.aviso = n;
  }
  return args;
}

const AJUDA = `
Contex OS — manual-sistema.js

  node scripts/manual-sistema.js varrer <pasta-do-repo>     inventário do que está no código
  node scripts/manual-sistema.js custo <spec.json>          tabela de custo mensal somada
  node scripts/manual-sistema.js vencimentos <spec.json>    datas na ordem, com dias restantes
  node scripts/manual-sistema.js dominio <dominio>          whois + certificado do domínio real

Opções: --json, --saida <arquivo>, --em DD/MM/AAAA, --aviso <dias>
Em "vencimentos", --consultar junta domínio e certificado na mesma tabela (precisa de rede).
Sai com código 1 quando acha problema: chave dentro do arquivo de exemplo, segredo no
spec, ou conta vencida ou a vencer em uma semana.
`;

function main() {
  const args = lerArgs(process.argv.slice(2));
  const [comando, alvo] = args._;
  if (!comando || comando === "ajuda" || comando === "--help") { console.log(AJUDA); process.exit(0); }
  if (!alvo) morrer(`falta o argumento de "${comando}"`, AJUDA.trim());

  if (comando === "varrer") cmdVarrer(alvo, args);
  else if (comando === "custo") cmdCusto(alvo, args);
  else if (comando === "vencimentos") cmdVencimentos(alvo, args);
  else if (comando === "dominio") cmdDominio(alvo, args);
  else morrer(`comando desconhecido: ${comando}`, AJUDA.trim());

  if (!args.json) {
    console.error("");
    if (problemas) console.error(`✖ ${problemas} problema(s)${avisos ? `, ${avisos} aviso(s)` : ""}.\n`);
    else console.error(`Tudo certo.${avisos ? ` ${avisos} aviso(s) acima valem uma olhada.` : ""}\n`);
  }
  process.exit(problemas ? 1 : 0);
}

module.exports = {
  acharSegredo, mensalizar, somarCustos, periodoDe, diasAte, lerVencimentos, estadoDe,
  varrerPasta, variaveisDo, expiraNoWhois, certificadoDe, dominioLimpo, whoisDe,
  cronEmPortugues, semanaEmPortugues, emBrasilia, linhaRotina, vencimentosDoDominio,
  tabela, celula, mdCusto, JANELA_CERTIFICADO,
};

if (require.main === module) main();
