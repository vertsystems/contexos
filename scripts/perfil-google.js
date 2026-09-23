#!/usr/bin/env node
/**
 * Contex OS — perfil-google.js
 * Monta o esqueleto do mês de posts do Perfil da Empresa no Google e confere
 * cada post contra o que o Google reprova ou corta: gancho de até 80
 * caracteres, corpo de até 1.500, oferta e evento com data de início e fim no
 * futuro, botão de uma lista fechada, sem telefone, link ou e-mail no corpo,
 * foto em todo post, dia da semana batendo com a data.
 *
 * Existe porque post do Perfil do Google é reprovado em silêncio: o dono cola o
 * telefone no texto, a oferta sai sem data, o gancho passa de 80 caracteres e
 * some no "..." do celular. Nada disso aparece lendo. Aqui o texto é contado
 * por comando, a data é conferida contra o calendário e o telefone é achado
 * por expressão regular, com o laudo dizendo linha e conserto.
 *
 * Uso:
 *   node scripts/perfil-google.js esqueleto <AAAA-MM> [--posts 6] [--saida conteudo/google-perfil/AAAA-MM.md]
 *   node scripts/perfil-google.js conferir <AAAA-MM.md> [--hoje AAAA-MM-DD] [--json]
 *   node scripts/perfil-google.js contar --texto "Pão de fermentação natural todo sábado às 7h. ..."
 *   node scripts/perfil-google.js numeros <AAAA-MM.md> [--json]   os três números do rodapé contra o mês anterior
 *   node scripts/perfil-google.js semanas <AAAA-MM> [--json]      as semanas do mês, numeradas de 1 a N
 *
 * Opções:
 *   --posts <n>       quantos blocos de post o esqueleto cria (4 a 8; padrão 6)
 *   --saida <arquivo> onde escrever o esqueleto (padrão: mostra no terminal)
 *   --hoje <data>     data de referência pra "fim no futuro" (padrão: hoje)
 *   --texto "<...>"   texto solto pra contar (o comando contar)
 *   --json            resultado em JSON, pra outro script ler (conferir, semanas, numeros, contar)
 *
 * As semanas vão de segunda a domingo e são numeradas de 1 a N. A ponta que
 * entra no mês com menos de quatro dias não vira semana: os dias dela entram na
 * vizinha, pra que a Semana 1 seja sempre a do dia 1 e nenhum dia fique fora.
 *
 * Formato do arquivo que o conferir lê (o esqueleto já sai nele):
 *   ## Post 1 — Semana 1 (28/09 a 04/10) — Novidade|Oferta|Evento
 *   - **Publicar em:** 29/09/2026 (ter)
 *   - **Foto:** dados/fotos/fachada.jpg  |  biblioteca: fachada da loja
 *   - **Botão:** Saiba mais → https://...   |  Ligar agora  |  Nenhum
 *   - **Título:** (oferta e evento)
 *   - **Início:** 01/10/2026 [08:00]   - **Fim:** 31/10/2026 [18:00]
 *   ```texto
 *   primeira linha = gancho (o que aparece antes do "...")
 *   resto do corpo
 *   ```
 *
 * Sai com código 1 se achar erro. Aviso não derruba.
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── limites (fonte e data no molde) ───────────────────────────
// templates/crescimento/perfil-google.md carrega a URL e a data de conferência de cada um.

const LIMITES = {
  GANCHO_MAX: 80,        // o que aparece antes do "..." no celular; não há página oficial
  CORPO_MAX: 1500,       // limite do formulário de postagem
  TITULO_MAX: 58,        // título de oferta e evento; limite da interface, sem página oficial
  POSTS_MIN: 4,
  POSTS_MAX: 8,
  PERGUNTAS_MIN: 3,
  FOTO_MIN_BYTES: 10 * 1024,        // support.google.com/business/answer/6103862
  FOTO_MAX_BYTES: 5 * 1024 * 1024,  // idem
  EMOJI_MAX: 3,
};

const TIPOS = { novidade: "novidade", atualizacao: "novidade", oferta: "oferta", evento: "evento" };

/** Lista fechada de botões: chave = enum da API (developers.google.com/my-business, ActionType). */
const BOTOES = {
  BOOK: ["reservar", "agendar", "book"],
  ORDER: ["fazer o pedido", "pedir on-line", "pedir online", "pedir", "order", "order online"],
  SHOP: ["comprar", "shop", "buy"],
  LEARN_MORE: ["saiba mais", "learn more"],
  SIGN_UP: ["inscrever-se", "inscrever", "sign up"],
  CALL: ["ligar agora", "ligar", "call now", "call"],
  NENHUM: ["nenhum", "sem botão", "sem botao", "none"],
};
const ROTULO_BOTAO = { BOOK: "Reservar", ORDER: "Fazer o pedido", SHOP: "Comprar", LEARN_MORE: "Saiba mais", SIGN_UP: "Inscrever-se", CALL: "Ligar agora", NENHUM: "Nenhum" };

// ─────────────────────────── utilidades ───────────────────────────

/** Caminho curto pra exibir: relativo se fizer sentido, absoluto se for longe. */
function curto(p) {
  const rel = path.relative(process.cwd(), p) || ".";
  return rel.startsWith("../../") ? p : rel;
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function args(argv) {
  const r = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const prox = argv[i + 1];
      if (prox !== undefined && !prox.startsWith("--")) { r[k] = prox; i++; } else r[k] = true;
    } else r._.push(a);
  }
  return r;
}

/** Conta como o Google conta: por caractere visível (code point), não por byte. */
function contarCaracteres(s) { return Array.from(String(s || "")).length; }

function contarEmoji(s) {
  return (String(s || "").match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu) || []).length;
}

/** "AAAA-MM" → { ano, mes (0-11) } ou null. */
function lerMes(s) {
  const x = String(s || "").match(/^(\d{4})-(\d{2})$/);
  if (!x) return null;
  const ano = +x[1], mes = +x[2] - 1;
  if (mes < 0 || mes > 11) return null;
  return { ano, mes };
}

const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * Semanas do mês, de segunda a domingo, numeradas de 1 a N.
 *
 * A ponta que entra no mês com menos de quatro dias não vira semana do plano:
 * os dias dela entram na semana vizinha. Sem isso, fevereiro de 2026 (dia 1 num
 * domingo) sairia com "Semana 2" como primeira semana do mês e nenhuma Semana 1
 * no arquivo. Depois do ajuste, todo dia do mês cai em exatamente uma semana
 * numerada, e a Semana 1 é sempre a do dia 1.
 *
 * Devolve [{ n, segunda, domingo, inicio, fim, diasNoMes }]: `segunda` e
 * `domingo` são a semana de calendário; `inicio` e `fim` são o pedaço que fica
 * dentro do mês (é o que aparece no título do post e o que o conferir usa pra
 * dizer em que semana a data cai).
 */
function semanasDoMes(ano, mes) {
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const cru = [];
  // segunda-feira da semana do dia 1
  for (let seg = br.mais(primeiro, -((primeiro.getDay() + 6) % 7)); seg <= ultimo; seg = br.mais(seg, 7)) {
    const dom = br.mais(seg, 6);
    let dias = 0;
    for (let d = seg; d <= dom; d = br.mais(d, 1)) if (d.getMonth() === mes) dias++;
    cru.push({ seg, dom, dias });
  }
  if (cru.length > 1 && cru[0].dias < 4) cru.shift();
  if (cru.length > 1 && cru[cru.length - 1].dias < 4) cru.pop();
  return cru.map((s, i) => {
    const inicio = i === 0 ? primeiro : s.seg;
    const fim = i === cru.length - 1 ? ultimo : s.dom;
    return { n: i + 1, segunda: s.seg, domingo: s.dom, inicio, fim, diasNoMes: br.diasEntre(inicio, fim) + 1 };
  });
}

// ─────────────────────────── detecção no corpo ───────────────────────────

// Telefone brasileiro em qualquer grafia: (11) 99999-9999, 11 9 9999 9999, 0800 123 4567, +55...
const RE_TELEFONE = /(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9\s?)?\d{4}[\s.-]?\d{4}\b|\b0800[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const RE_URL_ABS = /\b(?:https?:\/\/|www\.)\S+/gi;
// Domínio nu só em minúscula: "exemplo.com.br" é link, "na loja.Site do pedido" é ponto de frase.
const RE_DOMINIO = /\b[a-z0-9-]{2,}\.(?:com\.br|com|net|org|app|io|me|shop|store|site|online)(?:\/\S*)?\b/g;
const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const RE_HASHTAG = /(?:^|\s)#\w+/g;
const RE_CAPS = /\b[A-ZÀ-Ú]{4,}\b/g;
// Marca que o esqueleto deixou pra preencher: "[preencher: ...]", "[gancho: ...]", "[a confirmar]".
const RE_PLACEHOLDER = /\[(?:preencher|a confirmar|gancho|corpo|pergunta|resposta)\b[^\]]*\]/i;


/** Links no corpo, sem repetir o mesmo achado. */
function acharLinks(texto) {
  const t = String(texto || "");
  const achados = [...(t.match(RE_URL_ABS) || []), ...(t.match(RE_DOMINIO) || [])]
    .map((u) => u.replace(/[.,;:!?)]+$/, ""));
  return [...new Set(achados)];
}

function acharTelefones(texto) {
  // tira o que é data, hora, CEP e preço antes de procurar: "10/10/2026", "08:00", "01310-100", "R$ 1.200,00"
  const limpo = String(texto)
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/\b\d{1,2}:\d{2}\b/g, " ")
    .replace(/\bR\$\s?[\d.,]+/g, " ")
    .replace(/\b\d{5}-\d{3}\b/g, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ");   // ano: "desde 1998", "de 2024 a 2026"
  const achados = (limpo.match(RE_TELEFONE) || []).filter((t) => t.replace(/\D/g, "").length >= 8);
  return [...new Set(achados.map((t) => t.trim()))];
}

// ─────────────────────────── leitura do arquivo do mês ───────────────────────────

function lerBullet(bloco, rotulo) {
  const re = new RegExp(`^\\s*[-*]\\s*\\*\\*${rotulo}:\\*\\*\\s*(.*)$`, "im");
  const x = bloco.match(re);
  return x ? x[1].trim() : "";
}

/** Separa o arquivo em cabeçalho, posts, perguntas, fotos e números. */
function lerArquivo(md) {
  const linhas = md.split(/\r?\n/);
  const posts = [];
  const secoes = { perguntas: "", fotos: "", numeros: "" };
  let atual = null, bufSecao = null;
  const fechar = () => { if (atual) { posts.push(atual); atual = null; } };
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const post = l.match(/^##\s+Post\s+(\d+)\s*(?:—|-|–)\s*(.*)$/i);
    if (post) { fechar(); bufSecao = null; atual = { n: +post[1], titulo: post[2].trim(), linha: i + 1, linhas: [] }; continue; }
    const secao = l.match(/^##\s+(.*)$/);
    if (secao) {
      fechar();
      const nome = br.semAcento(secao[1]);
      bufSecao = nome.startsWith("perguntas") ? "perguntas" : nome.startsWith("fotos") ? "fotos" : nome.startsWith("numeros") ? "numeros" : null;
      continue;
    }
    if (atual) atual.linhas.push(l);
    else if (bufSecao) secoes[bufSecao] += l + "\n";
  }
  fechar();
  for (const p of posts) {
    const bloco = p.linhas.join("\n");
    const tipoRaw = (p.titulo.split(/—|–| - /).pop() || "").trim();
    p.tipo = TIPOS[br.semAcento(tipoRaw).replace(/[^a-z]/g, "")] || null;
    p.tipoRaw = tipoRaw;
    p.publicar = lerBullet(bloco, "Publicar em");
    p.foto = lerBullet(bloco, "Foto");
    p.botao = lerBullet(bloco, "Botão") || lerBullet(bloco, "Botao");
    p.tituloPost = lerBullet(bloco, "Título") || lerBullet(bloco, "Titulo");
    p.inicio = lerBullet(bloco, "Início") || lerBullet(bloco, "Inicio");
    p.fimData = lerBullet(bloco, "Fim");
    p.termos = lerBullet(bloco, "Termos");
    const t = bloco.match(/```texto\s*\n([\s\S]*?)\n```/);
    p.texto = t ? t[1].replace(/\s+$/, "") : null;
  }
  return { posts, secoes };
}

/** "29/09/2026 (ter)" → { data, diaEscrito } */
function lerDataComDia(s, ano) {
  const x = String(s || "").match(/(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*(?:\(\s*(\p{L}{3})\.?\s*\))?/u);
  if (!x) return { data: null, diaEscrito: null };
  return { data: br.lerData(x[1], ano), diaEscrito: x[2] ? br.semAcento(x[2]) : null, bruto: x[1] };
}

/** "01/10/2026 08:00" → { data, hora } */
function lerDataHora(s, ano) {
  const x = String(s || "").match(/(\d{1,2}\/\d{1,2}(?:\/\d{4})?)(?:\s+(\d{1,2}:\d{2}))?/);
  if (!x) return { data: null, hora: null };
  const data = br.lerData(x[1], ano);
  if (data && x[2]) { const [h, m] = x[2].split(":").map(Number); data.setHours(h, m, 0, 0); }
  return { data, hora: x[2] || null };
}

function resolverBotao(s) {
  const t = br.semAcento(String(s || "").split(/→|->/)[0]).trim().replace(/[^a-z\s-]/g, "").trim();
  if (!t) return null;
  for (const [chave, lista] of Object.entries(BOTOES)) if (lista.some((x) => br.semAcento(x) === t)) return chave;
  return null;
}

function linkDoBotao(s) {
  const x = String(s || "").match(/(?:→|->)\s*(\S+)/);
  return x ? x[1] : null;
}

// ─────────────────────────── conferir ───────────────────────────

/** Um post → lista de { nivel: "erro"|"aviso", msg }. Função pura, sem I/O. */
function conferirPost(p, ctx) {
  const out = [];
  const erro = (m) => out.push({ nivel: "erro", msg: m });
  const aviso = (m) => out.push({ nivel: "aviso", msg: m });
  const { ano, mes, hoje, semanas, dirBase } = ctx;

  if (!p.tipo) erro(`tipo "${p.tipoRaw}" não é Novidade, Oferta nem Evento (vai no fim do título do post)`);

  // texto
  if (p.texto === null) { erro("sem bloco ```texto```: é dele que o Google lê o post"); }
  else if (RE_PLACEHOLDER.test(p.texto)) {
    p.placeholder = true;
    erro("texto ainda com a marca do esqueleto ([gancho: ...], [corpo: ...]): escrever o post antes de conferir");
  } else {
    const corpo = p.texto.trim();
    const gancho = corpo.split("\n")[0].trim();
    const nCorpo = contarCaracteres(corpo), nGancho = contarCaracteres(gancho);
    p.contagem = { gancho: nGancho, corpo: nCorpo };
    if (!corpo) erro("texto vazio");
    if (nGancho > LIMITES.GANCHO_MAX) erro(`gancho com ${nGancho} caracteres (a régua é ${LIMITES.GANCHO_MAX}): a primeira linha é o que aparece antes do "..." no celular`);
    if (nCorpo > LIMITES.CORPO_MAX) erro(`corpo com ${nCorpo} caracteres (o formulário aceita ${LIMITES.CORPO_MAX})`);
    const tels = acharTelefones(corpo);
    if (tels.length) erro(`telefone no corpo (${tels.join(", ")}): o Google reprova; o telefone vai no botão "Ligar agora"`);
    const urls = acharLinks(corpo);
    if (urls.length) erro(`link no corpo (${urls.join(", ")}): o link vai no botão, não no texto`);
    const emails = [...new Set(corpo.match(RE_EMAIL) || [])];
    if (emails.length) erro(`e-mail no corpo (${emails.join(", ")})`);
    const tags = corpo.match(RE_HASHTAG) || [];
    if (tags.length) aviso(`${tags.length} hashtag(s): o Perfil não indexa hashtag, é ruído pra quem lê`);
    const caps = (corpo.match(RE_CAPS) || []).filter((w) => !/^(R\$|CNPJ|CPF|LGPD|PIX|MEI|CEP|SUS|ANVISA|CRM|CRO|OAB)$/.test(w));
    if (caps.length >= 2) aviso(`${caps.length} palavras em caixa alta (${caps.slice(0, 3).join(", ")}): o Google trata como baixa qualidade`);
    if (/!{2,}/.test(corpo)) aviso("exclamação dupla ou tripla: conta como caractere de apelo");
    const emojis = contarEmoji(corpo);
    if (emojis > LIMITES.EMOJI_MAX) aviso(`${emojis} emojis (a régua é ${LIMITES.EMOJI_MAX})`);
    if (p.tipo === "novidade" && nCorpo > 0 && nCorpo < 40) aviso(`corpo com ${nCorpo} caracteres: curto demais pra dizer o quê, onde e quando`);
    // preço "de X por Y": a conta e a direção
    const dePor = corpo.match(/de\s+R\$\s?([\d.,]+)\s+por\s+R\$\s?([\d.,]+)/i);
    if (dePor) {
      const a = br.numero(dePor[1]), b = br.numero(dePor[2]);
      if (!(b < a)) erro(`"de ${br.reais(a)} por ${br.reais(b)}": o preço "por" não é menor que o "de"`);
      else {
        const desc = (a - b) / a;
        out.push({ nivel: "info", msg: `desconto calculado: ${br.reais(a)} → ${br.reais(b)} = ${br.pct(desc, 1)} de desconto (o "de" precisa ter sido praticado de verdade, CDC art. 37 §1º)` });
      }
    }
  }

  // data de publicação
  const pub = lerDataComDia(p.publicar, ano);
  if (!pub.data) erro(pub.bruto ? `"Publicar em" ${pub.bruto}: essa data não existe no calendário` : `"Publicar em" vazio ou fora de DD/MM/AAAA: "${p.publicar}"`);
  else {
    p.dataPublicar = pub.data;
    if (pub.data.getFullYear() !== ano || pub.data.getMonth() !== mes) erro(`publicar em ${br.fmt(pub.data)} está fora do mês do arquivo`);
    const diaReal = br.semAcento(br.diaSemana(pub.data));
    if (pub.diaEscrito && pub.diaEscrito !== diaReal) erro(`${br.fmt(pub.data)} é ${br.diaSemana(pub.data)}, não "${pub.diaEscrito}"`);
    if (!pub.diaEscrito) aviso(`dia da semana não escrito ao lado da data: ${br.fmt(pub.data)} é ${br.diaSemana(pub.data)}`);
    const sem = semanas.find((s) => pub.data >= s.inicio && pub.data <= s.fim);
    const semTitulo = (p.titulo.match(/Semana\s+(\d+)/i) || [])[1];
    if (sem && semTitulo && +semTitulo !== sem.n) erro(`título diz Semana ${semTitulo}, mas ${br.fmt(pub.data)} cai na Semana ${sem.n} (${br.ddmm(sem.inicio)} a ${br.ddmm(sem.fim)})`);
    p.semana = sem ? sem.n : null;
  }

  // foto
  if (!p.foto || /^\[/.test(p.foto)) erro("sem foto: todo post leva foto (o texto sozinho some no feed do perfil)");
  else if (!/^biblioteca:/i.test(p.foto)) {
    const arq = path.isAbsolute(p.foto) ? p.foto : path.join(dirBase, p.foto);
    if (!fs.existsSync(arq)) aviso(`foto "${p.foto}" não achada a partir de ${curto(dirBase)}; se está na /biblioteca, escreva "biblioteca: <o que é>"`);
    else {
      const st = fs.statSync(arq);
      const ext = path.extname(arq).toLowerCase();
      if (![".jpg", ".jpeg", ".png"].includes(ext)) erro(`foto ${ext}: o Google aceita JPG ou PNG`);
      if (st.size < LIMITES.FOTO_MIN_BYTES) erro(`foto com ${st.size} bytes (mínimo 10 KB)`);
      if (st.size > LIMITES.FOTO_MAX_BYTES) erro(`foto com ${(st.size / 1048576).toFixed(1)} MB (máximo 5 MB)`);
    }
  }

  // botão
  const botao = resolverBotao(p.botao);
  const link = linkDoBotao(p.botao);
  if (link && !/^https:\/\//.test(link)) erro(`link "${link}" precisa começar com https:// (o Google recusa http:// no botão)`);
  if (!p.botao || /^\[/.test(p.botao)) erro(`sem botão: escolha um da lista (${Object.values(ROTULO_BOTAO).join(", ")})`);
  else if (!botao) erro(`botão "${p.botao.split(/→|->/)[0].trim()}" não existe no Google; a lista é ${Object.values(ROTULO_BOTAO).join(", ")}`);
  else {
    p.botaoChave = botao;
    if (!["CALL", "NENHUM"].includes(botao) && !link) erro(`botão "${ROTULO_BOTAO[botao]}" precisa do link depois da seta (→ https://...)`);
    if (botao === "CALL" && link) erro('botão "Ligar agora" não leva link: ele usa o telefone verificado do perfil, e a seta tem que sair');
    if (botao === "NENHUM" && link) erro('"Nenhum" com link: ou escolhe um botão da lista, ou apaga a seta e o link');
    if (botao === "NENHUM" && p.tipo !== "novidade") aviso("oferta e evento sem botão perdem o clique; o Google já põe \"Ver oferta\" na oferta, mas o link ajuda");
  }

  // oferta e evento: título, início e fim
  if (p.tipo === "oferta" || p.tipo === "evento") {
    if (!p.tituloPost || /^\[/.test(p.tituloPost)) erro(`${p.tipo} sem título (o Google exige)`);
    else if (contarCaracteres(p.tituloPost) > LIMITES.TITULO_MAX) aviso(`título com ${contarCaracteres(p.tituloPost)} caracteres; a interface corta perto de ${LIMITES.TITULO_MAX}`);
    const ini = lerDataHora(p.inicio, ano), fim = lerDataHora(p.fimData, ano);
    if (!ini.data) erro(p.inicio && !/^\[/.test(p.inicio) ? `início "${p.inicio}" não é uma data que existe` : `${p.tipo} sem data de início: o Google exige início e fim`);
    if (!fim.data) erro(p.fimData && !/^\[/.test(p.fimData) ? `fim "${p.fimData}" não é uma data que existe` : `${p.tipo} sem data de fim: o Google exige início e fim`);
    if (ini.data && fim.data) {
      if (fim.data < ini.data) erro(`fim (${br.fmt(fim.data)}) antes do início (${br.fmt(ini.data)})`);
      if (fim.data < hoje) erro(`fim em ${br.fmt(fim.data)} já passou (hoje é ${br.fmt(hoje)}): o post nasceria expirado`);
      if (p.dataPublicar && fim.data < p.dataPublicar) erro(`fim (${br.fmt(fim.data)}) antes da data de publicação (${br.fmt(p.dataPublicar)})`);
      if (p.dataPublicar && ini.data > br.mais(p.dataPublicar, 30)) aviso(`início ${br.diasEntre(p.dataPublicar, ini.data)} dias depois da publicação; post de oferta muito antecipado some antes de valer`);
      if (p.tipo === "evento" && !ini.hora) aviso("evento sem hora de início (o formulário pede)");
      if (p.tipo === "evento" && !fim.hora) aviso("evento sem hora de fim (o formulário pede)");
      if (fim.data >= ini.data) p.periodo = { inicio: ini.data, fim: fim.data, dias: br.diasEntre(ini.data, fim.data) + 1 };
    }
    if (p.tipo === "oferta" && p.texto && !p.placeholder) {
      const temData = /\d{1,2}\/\d{1,2}|\bdia\s+\d{1,2}\b|\b(?:janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i.test(p.texto);
      if (!temData) erro("oferta sem o prazo escrito no corpo: o campo de data não aparece pra quem lê no Maps, e oferta veiculada obriga (CDC arts. 30 e 31)");
      if (!p.termos || /^\[/.test(p.termos)) aviso("oferta sem Termos: a condição (quantidade, retirada, estoque) tem que estar escrita em algum lugar (CDC art. 31)");
    }
  } else if (p.inicio || p.fimData) aviso("novidade com início/fim: só oferta e evento levam data; se é promoção, o tipo é Oferta");

  return out;
}

function conferirArquivo(md, opts = {}) {
  const arquivo = opts.arquivo || "";
  const hoje = opts.hoje === undefined || opts.hoje === true ? new Date() : br.lerData(opts.hoje);
  if (!hoje) morrer(`--hoje "${opts.hoje}" não é uma data`, "o formato é --hoje 2026-10-01 ou --hoje 01/10/2026");
  hoje.setHours(0, 0, 0, 0);
  const nomeMes = (path.basename(arquivo).match(/(\d{4}-\d{2})/) || [])[1] || (md.match(/(\d{4}-\d{2})/) || [])[1];
  const m = lerMes(nomeMes);
  if (!m) morrer(`não achei o mês (AAAA-MM) no nome do arquivo "${path.basename(arquivo)}"`, "o padrão é conteudo/google-perfil/AAAA-MM.md");
  const semanas = semanasDoMes(m.ano, m.mes);
  // raiz do workspace: sobe até achar CLAUDE.md, senão a pasta do arquivo
  let dirBase = arquivo ? path.dirname(path.resolve(arquivo)) : process.cwd();
  for (let d = dirBase; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "CLAUDE.md"))) { dirBase = d; break; }
    if (path.dirname(d) === d) break;
  }
  const { posts, secoes } = lerArquivo(md);
  const ctx = { ano: m.ano, mes: m.mes, hoje, semanas, dirBase };
  const geral = [];
  const erro = (msg) => geral.push({ nivel: "erro", msg });
  const aviso = (msg) => geral.push({ nivel: "aviso", msg });

  if (posts.length < LIMITES.POSTS_MIN) erro(`${posts.length} post(s); o mês pede de ${LIMITES.POSTS_MIN} a ${LIMITES.POSTS_MAX}`);
  if (posts.length > LIMITES.POSTS_MAX) aviso(`${posts.length} posts; acima de ${LIMITES.POSTS_MAX} a cadência costuma não sobreviver ao mês`);
  for (const p of posts) p.problemas = conferirPost(p, ctx);

  // mix de tipos
  const tipos = posts.map((p) => p.tipo).filter(Boolean);
  for (const t of ["novidade", "oferta", "evento"]) if (!tipos.includes(t)) aviso(`nenhum post do tipo ${t}; o mês pede os três tipos`);

  // texto repetido
  const vistos = new Map();
  for (const p of posts) {
    if (!p.texto || p.placeholder) continue;
    const chave = br.semAcento(p.texto).replace(/\s+/g, " ").trim();
    if (vistos.has(chave)) erro(`Post ${p.n} repete o texto do Post ${vistos.get(chave)}: o Google marca duplicado`);
    else vistos.set(chave, p.n);
  }

  // cobertura das semanas
  const porSemana = {};
  for (const p of posts) if (p.semana) porSemana[p.semana] = (porSemana[p.semana] || 0) + 1;
  for (const s of semanas) {
    if (!porSemana[s.n]) aviso(`Semana ${s.n} (${br.ddmm(s.inicio)} a ${br.ddmm(s.fim)}) sem post; a régua é pelo menos um por semana`);
  }

  // perguntas e respostas
  const pares = (secoes.perguntas.match(/\*\*P:\*\*/g) || []).length;
  const respostas = (secoes.perguntas.match(/\*\*R:\*\*\s*\S/g) || []).length;
  if (!secoes.perguntas.trim()) erro('sem seção "## Perguntas e respostas"');
  else {
    if (pares < LIMITES.PERGUNTAS_MIN) erro(`${pares} pergunta(s) na seção de Perguntas e respostas; a régua é ${LIMITES.PERGUNTAS_MIN}`);
    if (respostas < pares) erro(`${pares - respostas} pergunta(s) sem resposta`);
    const telsR = acharTelefones(secoes.perguntas);
    if (telsR.length) aviso(`telefone nas respostas (${telsR.join(", ")}); prefira "pelo botão Ligar do perfil"`);
    if (RE_PLACEHOLDER.test(secoes.perguntas)) erro("Perguntas e respostas ainda com a marca do esqueleto: a pergunta vem do WhatsApp da semana, não do molde");
  }

  // fotos por semana
  if (!secoes.fotos.trim()) erro('sem seção "## Fotos da semana"');
  else {
    const linhasTabela = secoes.fotos.split("\n").filter((l) => /^\|\s*\d+\s*\|/.test(l));
    if (linhasTabela.length < semanas.length) aviso(`${linhasTabela.length} semana(s) com foto na tabela, o mês tem ${semanas.length}`);
    if (RE_PLACEHOLDER.test(secoes.fotos)) aviso("tabela de fotos com [preencher]: foto que ainda não existe vira tarefa com data de tirar, não fica em branco");
  }

  // números do mês
  const numeros = lerNumeros(secoes.numeros);
  if (!secoes.numeros.trim()) erro('sem seção "## Números do mês"');
  else if (numeros.length < 3) erro(`${numeros.length} linha(s) na tabela de números; são três (Visualizações, Chamadas, Rotas ou Cliques no site)`);

  const problemas = [...geral, ...posts.flatMap((p) => p.problemas.map((x) => ({ ...x, post: p.n })))];
  const erros = problemas.filter((x) => x.nivel === "erro").length;
  const avisos = problemas.filter((x) => x.nivel === "aviso").length;
  return { arquivo, mes: nomeMes, hoje: br.iso(hoje), semanas: semanas.map((s) => ({ n: s.n, inicio: br.iso(s.inicio), fim: br.iso(s.fim), diasNoMes: s.diasNoMes })), posts, geral, numeros, erros, avisos };
}

function imprimirConferencia(r) {
  console.log(`\nPERFIL DO GOOGLE — ${r.mes} (${r.posts.length} posts, hoje ${br.fmt(br.lerData(r.hoje))})\n`);
  for (const p of r.posts) {
    const tipo = p.tipo ? p.tipo : "tipo?";
    const c = p.contagem ? ` · gancho ${p.contagem.gancho}/${LIMITES.GANCHO_MAX} · corpo ${p.contagem.corpo}/${LIMITES.CORPO_MAX}` : "";
    const sem = p.semana ? ` · semana ${p.semana}` : "";
    const per = p.periodo ? ` · ${br.fmt(p.periodo.inicio)} a ${br.fmt(p.periodo.fim)} (${p.periodo.dias} dia${p.periodo.dias === 1 ? "" : "s"})` : "";
    console.log(`Post ${p.n} (linha ${p.linha}) — ${tipo}${sem}${c}${per}`);
    for (const x of p.problemas) console.log(`  ${x.nivel === "erro" ? "✖" : x.nivel === "aviso" ? "△" : "·"} ${x.msg}`);
    if (!p.problemas.some((x) => x.nivel !== "info")) console.log("  ✓ passa");
  }
  if (r.geral.length) {
    console.log("\nO mês");
    for (const x of r.geral) console.log(`  ${x.nivel === "erro" ? "✖" : "△"} ${x.msg}`);
  }
  console.log("");
  if (r.erros) console.log(`✖ ${r.erros} erro(s), ${r.avisos} aviso(s). Corrigir antes de publicar.`);
  else if (r.avisos) console.log(`△ ${r.avisos} aviso(s), nenhum erro. Dá pra publicar; vale olhar os avisos.`);
  else console.log("Tudo certo.");
}

// ─────────────────────────── números do mês ───────────────────────────

/** Tabela "| Número | Este mês | Mês anterior | Variação |" → [{ nome, valor }] */
function lerNumeros(secao) {
  const out = [];
  for (const l of String(secao || "").split("\n")) {
    const c = l.split("|").map((x) => x.trim());
    if (c.length < 3 || !c[1] || /^-+$/.test(c[1]) || /^n[úu]mero$/i.test(c[1])) continue;
    const v = br.numero(c[2]);
    out.push({ nome: c[1], valor: Number.isFinite(v) ? v : null, bruto: c[2] });
  }
  return out;
}

/**
 * Cruza a tabela deste mês com a do anterior. Porcentagem sobre zero não
 * existe: quando o mês anterior estava em zero, o que sai é a diferença
 * absoluta, e a célula de variação diz "+96" em vez de ficar vazia.
 */
function compararNumeros(atual, anterior) {
  return atual.map((n) => {
    const chave = br.semAcento(n.nome);
    const ant = (anterior || []).find((a) => br.semAcento(a.nome) === chave);
    const temPar = n.valor !== null && ant && ant.valor !== null;
    let variacao = null, diferenca = null;
    if (temPar) {
      diferenca = n.valor - ant.valor;
      if (ant.valor !== 0) variacao = diferenca / ant.valor;
    }
    return { nome: n.nome, atual: n.valor, anterior: ant ? ant.valor : null, variacao, diferenca };
  });
}

function mesAnterior(nomeMes) {
  const m = lerMes(nomeMes);
  const d = new Date(m.ano, m.mes - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─────────────────────────── esqueleto ───────────────────────────

function esqueleto(nomeMes, nPosts = 6) {
  const m = lerMes(nomeMes);
  if (!m) morrer(`mês "${nomeMes}" fora do formato AAAA-MM`);
  if (!Number.isInteger(nPosts) || nPosts < LIMITES.POSTS_MIN || nPosts > LIMITES.POSTS_MAX) {
    morrer(`--posts ${nPosts}: o mês pede um número inteiro de ${LIMITES.POSTS_MIN} a ${LIMITES.POSTS_MAX}`, "quatro pra quem está começando, seis é o normal, oito só com promoção e evento no mesmo mês");
  }
  const semanas = semanasDoMes(m.ano, m.mes);
  const tipos = ["Novidade", "Oferta", "Evento"];
  const linhas = [];
  linhas.push(`# Perfil do Google — ${MESES_LONGOS[m.mes]} de ${m.ano}`, "");
  linhas.push("## Semanas do mês", "", "| Semana | De | Até | Dias no mês |", "|---|---|---|---|");
  // dia da semana ANTES da data: é a ordem que o verificar.js datas confere sem
  // confundir o "(dom)" de uma coluna com a data da coluna seguinte.
  for (const s of semanas) linhas.push(`| ${s.n} | ${br.diaSemana(s.inicio)} ${br.fmt(s.inicio)} | ${br.diaSemana(s.fim)} ${br.fmt(s.fim)} | ${s.diasNoMes} |`);
  linhas.push("");
  // um post por semana na terça; se pedirem mais posts que semanas, a segunda
  // leva cai na quinta e a terceira no sábado. Terça que cai fora do mês (a
  // Semana 1 pode começar no meio da semana) vira o primeiro dia da semana.
  const naSemana = (s, desloc) => {
    const d = br.mais(s.segunda, desloc);
    return d >= s.inicio && d <= s.fim ? d : null;
  };
  const vagas = semanas.map((s) => ({ s, dia: naSemana(s, 1) || s.inicio }));
  for (const desloc of [3, 5, 0, 2, 4]) {
    if (vagas.length >= nPosts) break;
    for (const s of semanas) {
      if (vagas.length >= nPosts) break;
      const dia = naSemana(s, desloc);
      if (dia && !vagas.some((v) => br.iso(v.dia) === br.iso(dia))) vagas.push({ s, dia });
    }
  }
  if (vagas.length < nPosts) {
    morrer(`${MESES_LONGOS[m.mes]} de ${m.ano} só tem ${vagas.length} dia(s) de publicação pra distribuir`, `rodar de novo com --posts ${vagas.length}`);
  }
  const escolhidas = vagas.slice(0, nPosts).sort((a, b) => a.dia - b.dia);
  for (let i = 0; i < nPosts; i++) {
    const { s, dia } = escolhidas[i];
    const tipo = tipos[i % 3];
    linhas.push(`## Post ${i + 1} — Semana ${s.n} (${br.ddmm(s.inicio)} a ${br.ddmm(s.fim)}) — ${tipo}`);
    linhas.push(`- **Publicar em:** ${br.fmt(dia)} (${br.diaSemana(dia)})`);
    linhas.push("- **Foto:** [preencher: caminho do arquivo ou \"biblioteca: o que é\"]");
    linhas.push("- **Botão:** [preencher: Reservar | Fazer o pedido | Comprar | Saiba mais | Inscrever-se | Ligar agora | Nenhum] → [preencher: link https:// ou apagar a seta se for Ligar agora]");
    if (tipo !== "Novidade") {
      linhas.push("- **Título:** [preencher: até 58 caracteres]");
      linhas.push(`- **Início:** ${br.fmt(dia)}${tipo === "Evento" ? " 09:00" : ""}`);
      linhas.push(`- **Fim:** ${br.fmt(br.mais(dia, tipo === "Evento" ? 0 : 14))}${tipo === "Evento" ? " 12:00" : ""}`);
      if (tipo === "Oferta") linhas.push("- **Termos:** [preencher ou apagar: validade, quantidade, condição]");
    }
    linhas.push("", "```texto", "[gancho: até 80 caracteres, o que aparece antes do \"...\"]", "[corpo: o quê, pra quem, onde e quando; sem telefone, sem link]", "```", "");
  }
  linhas.push("## Perguntas e respostas", "", "Semear na seção do perfil, uma por dia, com a conta da empresa.", "");
  for (let i = 1; i <= 5; i++) linhas.push(`${i}. **P:** [pergunta que o cliente faz no WhatsApp]  `, `   **R:** [resposta curta, sem telefone]`, "");
  linhas.push("## Fotos da semana", "", "| Semana | Foto | Onde usar |", "|---|---|---|");
  for (const s of semanas) linhas.push(`| ${s.n} | [preencher] | post / galeria do perfil |`);
  linhas.push("", "## Números do mês", "", `Copiar da aba Desempenho do perfil no primeiro dia útil de ${MESES_LONGOS[(m.mes + 1) % 12]}, período do mês inteiro.`, "");
  linhas.push("| Número | Este mês | Mês anterior | Variação |", "|---|---|---|---|");
  linhas.push("| Visualizações | [preencher] | | |", "| Chamadas | [preencher] | | |", "| Rotas | [preencher] | | |", "");
  return linhas.join("\n");
}

// ─────────────────────────── main ───────────────────────────

function main() {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  if (!cmd || a.help) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n/, "").replace(/^\/\*\*\n?|^ \* ?/gm, "").trim());
    process.exit(cmd ? 0 : 1);
  }

  if (cmd === "semanas") {
    const m = lerMes(a._[1]);
    if (!m) morrer("uso: semanas <AAAA-MM>");
    const s = semanasDoMes(m.ano, m.mes);
    if (a.json) { console.log(JSON.stringify(s.map((x) => ({ n: x.n, inicio: br.iso(x.inicio), fim: br.iso(x.fim), diasNoMes: x.diasNoMes })), null, 2)); return; }
    console.log(`\nSemanas de ${MESES_LONGOS[m.mes]} de ${m.ano} (segunda a domingo):\n`);
    for (const x of s) console.log(`  Semana ${x.n}: ${br.fmt(x.inicio)} a ${br.fmt(x.fim)}${x.diasNoMes < 7 ? ` (${x.diasNoMes} dias no mês)` : ""}`);
    return;
  }

  if (cmd === "contar") {
    const texto = typeof a.texto === "string" ? a.texto : (a._[1] && fs.existsSync(a._[1]) ? fs.readFileSync(a._[1], "utf8") : null);
    if (texto === null) morrer('uso: contar --texto "o texto do post" (ou: contar <arquivo.txt>)');
    const corpo = texto.trim();
    const gancho = corpo.split("\n")[0].trim();
    const r = { gancho: contarCaracteres(gancho), corpo: contarCaracteres(corpo), telefones: acharTelefones(corpo), links: acharLinks(corpo), emojis: contarEmoji(corpo) };
    if (a.json) { console.log(JSON.stringify(r)); return; }
    console.log(`\n  gancho: ${r.gancho}/${LIMITES.GANCHO_MAX} ${r.gancho > LIMITES.GANCHO_MAX ? `✖ passou ${r.gancho - LIMITES.GANCHO_MAX} caractere(s) do limite` : "✓"}`);
    console.log(`  corpo:  ${r.corpo}/${LIMITES.CORPO_MAX} ${r.corpo > LIMITES.CORPO_MAX ? `✖ passou ${r.corpo - LIMITES.CORPO_MAX} caractere(s) do limite` : "✓"}`);
    if (r.telefones.length) console.log(`  ✖ telefone no corpo: ${r.telefones.join(", ")}`);
    if (r.links.length) console.log(`  ✖ link no corpo: ${r.links.join(", ")}`);
    if (r.emojis > LIMITES.EMOJI_MAX) console.log(`  △ ${r.emojis} emojis`);
    console.log("");
    process.exit(r.gancho > LIMITES.GANCHO_MAX || r.corpo > LIMITES.CORPO_MAX || r.telefones.length || r.links.length ? 1 : 0);
  }

  if (cmd === "esqueleto") {
    const nomeMes = a._[1];
    if (!lerMes(nomeMes)) morrer("uso: esqueleto <AAAA-MM> [--posts 6] [--saida arquivo.md]");
    const md = esqueleto(nomeMes, a.posts === undefined ? 6 : Number(a.posts));
    if (a.saida !== undefined) {
      if (typeof a.saida !== "string") morrer("--saida precisa do caminho do arquivo", "exemplo: --saida conteudo/google-perfil/2026-10.md");
      if (fs.existsSync(a.saida)) morrer(`${a.saida} já existe; não sobrescrevo o mês`, "apague ou renomeie o arquivo se quiser recomeçar");
      fs.mkdirSync(path.dirname(a.saida), { recursive: true });
      fs.writeFileSync(a.saida, md);
      console.log(`✓ esqueleto escrito em ${a.saida} (${md.split("\n").length} linhas). Agora preencher os [preencher] e rodar: conferir ${a.saida}`);
    } else process.stdout.write(md);
    return;
  }

  if (cmd === "conferir") {
    const arquivo = a._[1];
    if (!arquivo || !fs.existsSync(arquivo)) morrer(`uso: conferir <AAAA-MM.md>${arquivo ? ` (não achei ${arquivo})` : ""}`);
    const md = fs.readFileSync(arquivo, "utf8");
    if (md.charCodeAt(0) === 0xfeff) morrer("arquivo com BOM no começo; salvar como UTF-8 sem BOM");
    const r = conferirArquivo(md, { arquivo, hoje: a.hoje });
    if (a.json) {
      const limpo = { ...r, posts: r.posts.map((p) => ({ n: p.n, tipo: p.tipo, semana: p.semana, publicar: p.dataPublicar ? br.iso(p.dataPublicar) : null, contagem: p.contagem || null, botao: p.botaoChave || null, problemas: p.problemas })) };
      console.log(JSON.stringify(limpo, null, 2));
    } else imprimirConferencia(r);
    process.exit(r.erros ? 1 : 0);
  }

  if (cmd === "numeros") {
    const arquivo = a._[1];
    if (!arquivo || !fs.existsSync(arquivo)) morrer("uso: numeros <AAAA-MM.md>");
    const md = fs.readFileSync(arquivo, "utf8");
    const nomeMes = (path.basename(arquivo).match(/(\d{4}-\d{2})/) || [])[1];
    if (!nomeMes || !lerMes(nomeMes)) morrer(`o nome do arquivo precisa ter um mês que existe (AAAA-MM): "${path.basename(arquivo)}"`, "o padrão é conteudo/google-perfil/2026-10.md");
    const atual = lerNumeros(lerArquivo(md).secoes.numeros);
    if (!atual.length) morrer('sem tabela em "## Números do mês"');
    const arqAnt = path.join(path.dirname(arquivo), `${mesAnterior(nomeMes)}.md`);
    const anterior = fs.existsSync(arqAnt) ? lerNumeros(lerArquivo(fs.readFileSync(arqAnt, "utf8")).secoes.numeros) : [];
    const comp = compararNumeros(atual, anterior);
    if (a.json) { console.log(JSON.stringify({ mes: nomeMes, anterior: fs.existsSync(arqAnt) ? mesAnterior(nomeMes) : null, numeros: comp }, null, 2)); return; }
    console.log(`\nNÚMEROS DO MÊS — ${nomeMes}${anterior.length ? ` contra ${mesAnterior(nomeMes)}` : " (sem mês anterior na pasta)"}\n`);
    console.log("| Número | Este mês | Mês anterior | Variação |");
    console.log("|---|---|---|---|");
    for (const n of comp) {
      const sinal = (x) => (x >= 0 ? "+" : "") + x.toLocaleString("pt-BR");
      const v = n.variacao !== null ? (n.variacao >= 0 ? "+" : "") + br.pct(n.variacao, 1)
        : n.diferenca !== null ? `${sinal(n.diferenca)} (não dá % sobre zero)` : "";
      const mil = (x) => (x === null ? "" : x.toLocaleString("pt-BR"));
      console.log(`| ${n.nome} | ${n.atual === null ? "[preencher]" : mil(n.atual)} | ${mil(n.anterior)} | ${v} |`);
    }
    const vazios = comp.filter((n) => n.atual === null).length;
    console.log(vazios ? `\n△ ${vazios} número(s) ainda por preencher (aba Desempenho do perfil)` : "\n✓ linhas prontas pra colar na tabela do arquivo");
    return;
  }

  morrer(`comando "${cmd}" não existe`, "os comandos são: esqueleto, conferir, contar, numeros, semanas");
}

module.exports = { LIMITES, BOTOES, ROTULO_BOTAO, contarCaracteres, contarEmoji, acharTelefones, acharLinks, semanasDoMes, lerArquivo, lerNumeros, compararNumeros, conferirPost, conferirArquivo, esqueleto, resolverBotao, mesAnterior };

if (require.main === module) main();
