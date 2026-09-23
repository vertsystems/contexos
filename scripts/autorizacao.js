#!/usr/bin/env node
/**
 * Contex OS — autorizacao.js
 * Monta o termo de autorização de imagem ou depoimento (LGPD + direito de
 * imagem) e o aceite de entrega de um projeto a partir de um JSON, confere o
 * que falta, calcula as datas e devolve três arquivos: o termo em .md (origem
 * do .docx), o termo em .html (pra assinar e imprimir) e a versão curta pra
 * mandar no WhatsApp. Depois registra o "sim" na biblioteca.
 *
 * Existe porque todo depoimento em vídeo catalogado sem autorização é um
 * passivo (Código Civil, art. 20; STJ, Súmula 403), e porque "revisão" só
 * acaba quando alguém assina que recebeu. O termo escrito de cabeça esquece
 * a finalidade (LGPD, art. 8, § 4: autorização genérica é nula), esquece a
 * revogação (art. 8, § 5) e erra a data de validade. O script não esquece.
 *
 * Uso:
 *   node scripts/autorizacao.js exemplo <imagem|depoimento|aceite> [--saida termo.json]
 *   node scripts/autorizacao.js conferir <termo.json>
 *   node scripts/autorizacao.js gerar <termo.json> [--saida pasta] [--tokens identidade/tokens.css] [--sobrescrever]
 *   node scripts/autorizacao.js registrar <termo.json> --data DD/MM/AAAA --meio <whatsapp|docx|eletronica|papel> [--prova arquivo] [--biblioteca biblioteca.md]
 *   node scripts/autorizacao.js linha <termo.json>
 *
 * Opções:
 *   --saida <pasta>        onde gravar (padrão: a pasta do próprio JSON, que deve ser contratos/termos/); em `exemplo`, o arquivo JSON
 *   --tokens <tokens.css>  lê --accent e a fonte de corpo do tokens.css pro HTML
 *   --sobrescrever         grava por cima de termo que já existe com o mesmo nome
 *   --feriado DD/MM        feriado local (repetir pra cada um); muda só a data de dia útil
 *   --json                 em `conferir`, imprime o resultado e as datas em JSON
 *
 * O que sai de `gerar`, na pasta de saída:
 *   <tipo>-<pessoa>.md            o termo, pra `node scripts/gerar-docx.js` virar .docx
 *   <tipo>-<pessoa>.html          o termo com campo de assinatura, pra imprimir ou PDF
 *   <tipo>-<pessoa>-whatsapp.md   a versão curta pra mandar e receber o "autorizo"
 *
 * Node 18+, sem dependência. Usa scripts/br.js.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

const TIPOS = {
  imagem: "Autorização de uso de imagem",
  depoimento: "Autorização de uso de depoimento",
  aceite: "Termo de aceite de entrega",
};
const MEIOS = ["whatsapp", "docx", "eletronica", "papel"];
const PLACEHOLDER = /\[[^\]]*(confirmar|preencher|definir|nome|valor|prazo|cliente|empresa|cpf|cnpj|cidade|data)[^\]]*\]|\{\{|XXX|lorem ipsum/i;

/** Caminho curto pra exibir: relativo se fizer sentido, absoluto se for longe. */
function curto(p) {
  const rel = path.relative(process.cwd(), p);
  return rel.startsWith("..".repeat(3)) || rel.length > p.length ? p : rel;
}

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Lê "--chave valor" e "--flag". Opção repetida vira lista. */
function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2);
    const prox = argv[i + 1];
    const v = prox !== undefined && !prox.startsWith("--") ? argv[++i] : true;
    if (o[k] === undefined) o[k] = v;
    else o[k] = [].concat(o[k], v);
  }
  return o;
}

// ───────────────────────────── exemplos ─────────────────────────────

const EXEMPLOS = {
  imagem: {
    tipo: "imagem",
    negocio: { nome: "Clínica Sorriso Aberto", documento: "12.345.678/0001-95", responsavel: "Dra. Ana Lima", registro: "CRO/SP 12345", cidade: "Campinas/SP", canal_revogacao: "WhatsApp (19) 99999-0000 ou contato@sorrisoaberto.com.br" },
    pessoa: { nome: "Maria Souza", documento: "111.444.777-35", relacao: "paciente", contato: "(19) 98888-7777" },
    itens: [
      { o_que: "as duas fotos do sorriso, antes e depois do clareamento", captado_em: "12/09/2026", por: "Dra. Ana Lima", onde: "dados/fotos/maria-souza-clareamento.jpg" },
    ],
    canais: ["Instagram e outras redes sociais da Clínica Sorriso Aberto", "site da clínica"],
    finalidade: "mostrar o resultado de um clareamento a quem procura a clínica, sem prometer o mesmo resultado a ninguém",
    sensivel: true,
    anonimo: true,
    prazo_anos: 2,
    prazo_retirada_dias: 10,
    remuneracao: "gratuito",
    data: "22/09/2026",
    assinatura: { data: "", meio: "", prova: "" },
  },
  depoimento: {
    tipo: "depoimento",
    negocio: { nome: "Estúdio Luz Norte", documento: "12.345.678/0001-95", responsavel: "Pedro Nakamura", cidade: "Curitiba/PR", canal_revogacao: "WhatsApp (41) 99999-0000" },
    pessoa: { nome: "Carla Mendes", documento: "111.444.777-35", relacao: "cliente", contato: "(41) 98888-7777" },
    itens: [
      { o_que: "o depoimento em vídeo de 48 segundos gravado no estúdio", captado_em: "18/09/2026", por: "Pedro Nakamura", onde: "dados/depoimentos/carla-mendes.mp4", texto: "Eu tinha medo de ficar dura na foto. Saí do ensaio com 30 fotos que eu uso até hoje no site." },
    ],
    canais: ["Instagram e outras redes sociais do Estúdio Luz Norte", "site e página de vendas do estúdio", "proposta comercial enviada a outros clientes"],
    finalidade: "mostrar a experiência de uma cliente do ensaio corporativo a quem está decidindo contratar",
    sensivel: false,
    anonimo: false,
    prazo_anos: 2,
    prazo_retirada_dias: 10,
    remuneracao: "gratuito",
    data: "22/09/2026",
    assinatura: { data: "", meio: "", prova: "" },
  },
  aceite: {
    tipo: "aceite",
    negocio: { nome: "Estúdio Luz Norte", documento: "12.345.678/0001-95", responsavel: "Pedro Nakamura", cidade: "Curitiba/PR" },
    pessoa: { nome: "Padaria Pão da Serra", documento: "11.222.333/0001-81", responsavel: "Carlos Pereira", relacao: "cliente", contato: "(41) 97777-6666" },
    projeto: "Ensaio fotográfico dos produtos e da equipe",
    contrato: "contratos/padaria-pao-da-serra-2026-08-04/contrato.html",
    entregues: [
      { item: "62 fotos tratadas em alta resolução", onde: "pasta compartilhada no Drive, link enviado por e-mail em 19/09/2026", data: "19/09/2026" },
      { item: "62 fotos em versão pra Instagram (1080 × 1350)", onde: "mesma pasta, subpasta 'instagram'", data: "19/09/2026" },
    ],
    ressalvas: [
      { o_que: "trocar a foto 41 (reflexo na vitrine) por outra do mesmo lote", ate: "29/09/2026" },
    ],
    data_entrega: "19/09/2026",
    consumidor: false,
    duravel: true,
    garantia_dias: 30,
    pagamento_final: { valor: 1500, dias_uteis: 5 },
    data: "22/09/2026",
    assinatura: { data: "", meio: "", prova: "" },
  },
};

// ───────────────────────────── conferência ─────────────────────────────

function lerSpec(arquivo) {
  const abs = path.resolve(arquivo);
  if (!fs.existsSync(abs)) morrer(`Não achei o arquivo: ${arquivo}`, "Comece por `node scripts/autorizacao.js exemplo imagem --saida termo.json` e preencha.");
  let spec;
  try { spec = JSON.parse(fs.readFileSync(abs, "utf8")); }
  catch (e) { morrer(`JSON inválido em ${arquivo}: ${e.message}`); }
  spec._arquivo = abs;
  return spec;
}

function documentoOk(s) {
  const d = String(s || "").replace(/[^0-9A-Za-z]/g, "");
  if (d.length === 11) return br.cpfValido(d);
  return br.cnpjValido(s);
}

function temPlaceholder(obj, caminho, lista) {
  if (typeof obj === "string") { if (PLACEHOLDER.test(obj)) lista.push(caminho); return; }
  if (Array.isArray(obj)) return obj.forEach((v, i) => temPlaceholder(v, `${caminho}[${i}]`, lista));
  if (obj && typeof obj === "object") for (const k of Object.keys(obj)) if (!k.startsWith("_")) temPlaceholder(obj[k], caminho ? `${caminho}.${k}` : k, lista);
}

/** Nome do arquivo: <tipo>-<slug da pessoa>. */
function baseNome(spec) {
  if (spec.arquivo) return br.slug(String(spec.arquivo).replace(/\.(html|md|json)$/i, ""));
  return `${spec.tipo}-${br.slug(spec.pessoa && spec.pessoa.nome || "sem-nome")}`;
}

/** Data de validade: anos somados no dia de igual número (Código Civil, art. 132, § 3). */
function validade(data, anos) {
  if (!anos) return null;
  return new Date(data.getFullYear() + anos, data.getMonth(), data.getDate());
}

/** Prazo em dias corridos sem o dia do começo, empurrado pro dia útil seguinte se cair em dia não útil (art. 132 e § 1). */
function prazoCorrido(inicio, dias, extras) {
  const fim = br.mais(inicio, dias);
  const u = br.proximoUtil(fim, extras);
  return { fim, seguro: u.data, motivo: u.motivo };
}

/**
 * Confere o JSON e calcula as datas. Devolve { erros, avisos, datas }.
 * Erro impede gerar; aviso vai pra conversa.
 */
function conferir(spec, extras = []) {
  const erros = [], avisos = [], datas = {};
  const tipo = spec.tipo;
  if (!TIPOS[tipo]) { erros.push(`"tipo" precisa ser imagem, depoimento ou aceite (veio: ${tipo})`); return { erros, avisos, datas }; }

  const n = spec.negocio || {}, p = spec.pessoa || {};
  if (!n.nome) erros.push("negocio.nome está vazio");
  if (!n.documento) erros.push("negocio.documento (CNPJ ou CPF) está vazio");
  else if (!documentoOk(n.documento)) erros.push(`negocio.documento não é CPF nem CNPJ válido: ${n.documento}`);
  if (!n.cidade) erros.push("negocio.cidade está vazio (é a cidade que vai no fecho do termo)");
  if (!p.nome) erros.push("pessoa.nome está vazio");
  if (!p.documento) erros.push("pessoa.documento (CPF ou CNPJ de quem assina) está vazio");
  else if (!documentoOk(p.documento)) erros.push(`pessoa.documento não é CPF nem CNPJ válido: ${p.documento}`);

  const data = br.lerData(spec.data);
  if (!data) erros.push(`data inválida ou vazia: ${spec.data} (use DD/MM/AAAA)`);
  else datas.termo = data;

  const ph = [];
  temPlaceholder(spec, "", ph);
  if (ph.length) erros.push(`placeholder ainda no JSON: ${ph.slice(0, 5).join(", ")}`);

  if (tipo === "imagem" || tipo === "depoimento") {
    if (!n.canal_revogacao) erros.push("negocio.canal_revogacao está vazio (por onde a pessoa retira a autorização; LGPD, art. 8, § 5)");
    if (!spec.finalidade || String(spec.finalidade).trim().length < 15) erros.push("finalidade está vazia ou curta demais: diga pra quê, em uma frase (LGPD, art. 8, § 4: autorização genérica é nula)");
    if (!Array.isArray(spec.itens) || !spec.itens.length) erros.push("itens está vazio: o que exatamente vai ser usado (foto, vídeo, áudio, frase)");
    else spec.itens.forEach((it, i) => {
      if (!it.o_que) erros.push(`itens[${i}].o_que está vazio`);
      if (!it.captado_em) erros.push(`itens[${i}].captado_em está vazio (data em que a foto, o vídeo ou a frase foram captados)`);
      else if (!br.lerData(it.captado_em)) erros.push(`itens[${i}].captado_em inválida: ${it.captado_em}`);
      else if (data && br.lerData(it.captado_em) > data) erros.push(`itens[${i}].captado_em (${it.captado_em}) é depois da data do termo (${spec.data})`);
      if (tipo === "depoimento" && !(it.texto && String(it.texto).trim())) erros.push(`itens[${i}].texto está vazio: em depoimento, a fala entra literal no termo`);
      if (it.por && n.responsavel && it.por !== n.responsavel && it.por !== n.nome) avisos.push(`itens[${i}] foi captado por "${it.por}", que não é o negócio: quem fez a foto ou o vídeo tem direito autoral sobre ela (Lei 9.610/1998, art. 29). Precisa de autorização dessa pessoa também`);
    });
    if (!Array.isArray(spec.canais) || !spec.canais.length) erros.push("canais está vazio: onde a peça pode aparecer (site, Instagram, proposta, impresso, anúncio)");
    const anos = spec.prazo_anos;
    if (anos === undefined || anos === null || isNaN(Number(anos)) || Number(anos) < 0) erros.push("prazo_anos precisa ser número (0 = tempo indeterminado)");
    else if (data) { datas.validade = validade(data, Number(anos)); if (Number(anos) === 0) avisos.push("prazo_anos 0 = tempo indeterminado. Vale, mas quem assina prefere ver um fim; 2 anos é o usual"); }
    const ret = Number(spec.prazo_retirada_dias);
    if (!ret || ret < 1) erros.push("prazo_retirada_dias precisa ser ao menos 1 (dias pra tirar a peça do ar depois do pedido)");
    else if (data) datas.retirada_exemplo = prazoCorrido(data, ret, extras);
    if (!spec.remuneracao) erros.push('remuneracao está vazia: "gratuito" ou o valor, por extenso');
    if (spec.sensivel && !spec.anonimo) avisos.push("sensivel = true e anonimo = false: dado de saúde exige consentimento específico e destacado (LGPD, art. 11, I), e a Resolução CFM 2.336/2023, art. 14, II, i, manda garantir o anonimato do paciente mesmo com autorização. Se o conselho for outro, o /publicidade-regulada confere");
    if (p.menor) {
      if (!p.menor.nome) erros.push("pessoa.menor.nome está vazio");
      if (!/respons/i.test(p.relacao || "")) erros.push('pessoa.relacao precisa dizer "responsável legal" quando há menor (LGPD, art. 14, § 1)');
      avisos.push("imagem de menor: o termo sai com a cláusula do responsável, mas passa por advogado antes de qualquer peça pública (ECA, art. 17)");
    }
    if (/funcion|colaborad|emprega/i.test(p.relacao || "")) avisos.push("pessoa é da equipe: consentimento de empregado é frágil por causa da relação de trabalho. O termo não pode condicionar nada ao emprego, e a revogação tem que ser fácil de verdade");
  }

  if (tipo === "aceite") {
    if (!p.responsavel && String(p.documento || "").replace(/\D/g, "").length !== 11) avisos.push("pessoa.responsavel vazio: quem assina representa uma empresa; diga o nome de quem assina");
    if (!spec.projeto) erros.push("projeto está vazio (o nome do trabalho, igual ao da proposta ou do contrato)");
    if (!Array.isArray(spec.entregues) || !spec.entregues.length) erros.push("entregues está vazio: cada item entregue, com onde está");
    else spec.entregues.forEach((e, i) => {
      if (!e.item) erros.push(`entregues[${i}].item está vazio`);
      if (!e.onde) erros.push(`entregues[${i}].onde está vazio (link, pasta, e-mail com data: é a prova de que foi entregue)`);
      if (e.data && !br.lerData(e.data)) erros.push(`entregues[${i}].data inválida: ${e.data}`);
    });
    const ent = br.lerData(spec.data_entrega);
    if (!ent) erros.push(`data_entrega inválida ou vazia: ${spec.data_entrega}`);
    else {
      datas.entrega = ent;
      if (data && ent > data) erros.push(`data_entrega (${spec.data_entrega}) é depois da data do aceite (${spec.data})`);
      const g = Number(spec.garantia_dias);
      if (spec.garantia_dias !== undefined && (isNaN(g) || g < 0)) erros.push("garantia_dias precisa ser número de dias corridos (0 = sem garantia contratual)");
      else if (g > 0) datas.garantia = prazoCorrido(ent, g, extras);
      if (spec.consumidor) {
        const d = spec.duravel === false ? 30 : 90;
        datas.cdc = { dias: d, ...prazoCorrido(ent, d, extras) };
      }
    }
    (spec.ressalvas || []).forEach((r, i) => {
      if (!r.o_que) erros.push(`ressalvas[${i}].o_que está vazio`);
      const ate = br.lerData(r.ate);
      if (!ate) erros.push(`ressalvas[${i}].ate inválida ou vazia: ${r.ate} (toda ressalva tem data pra ser resolvida)`);
      else if (data && ate < data) erros.push(`ressalvas[${i}].ate (${r.ate}) é antes da data do aceite`);
    });
    const pf = spec.pagamento_final;
    if (pf) {
      const v = br.numero(pf.valor);
      if (isNaN(v) || v <= 0) erros.push("pagamento_final.valor precisa ser número maior que zero");
      if (pf.vence) { const vv = br.lerData(pf.vence); if (!vv) erros.push(`pagamento_final.vence inválida: ${pf.vence}`); else datas.pagamento = vv; }
      else if (pf.dias_uteis !== undefined && data) datas.pagamento = br.maisUteis(data, Number(pf.dias_uteis), extras);
      else erros.push("pagamento_final precisa de vence (DD/MM/AAAA) ou dias_uteis");
    }
    if (spec.contrato && !fs.existsSync(path.resolve(spec.contrato))) avisos.push(`contrato apontado não existe no workspace: ${spec.contrato}. O aceite cita o contrato; confira o caminho`);
    if (!spec.contrato) avisos.push("sem contrato apontado: o aceite vale sozinho, mas é contra o contrato ou a proposta que se confere o que foi entregue");
  }

  const a = spec.assinatura || {};
  if (a.data) {
    const ad = br.lerData(a.data);
    if (!ad) erros.push(`assinatura.data inválida: ${a.data}`);
    else if (data && ad < data) erros.push(`assinatura.data (${a.data}) é antes da data do termo (${spec.data})`);
    else datas.assinado = ad;
    if (!MEIOS.includes(a.meio)) erros.push(`assinatura.meio precisa ser ${MEIOS.join(", ")} (veio: ${a.meio || "vazio"})`);
    if (!a.prova) avisos.push("assinatura.prova vazia: guarde o print, o .docx devolvido ou o comprovante da assinatura ao lado do termo");
  }
  return { erros, avisos, datas };
}

// ───────────────────────────── textos ─────────────────────────────

function docFmt(s) {
  const d = String(s || "").replace(/[^0-9A-Za-z]/g, "");
  return d.length === 11 ? br.formatarCpf(s) : br.formatarCnpj(s);
}
const F = (d) => (d ? br.fmt(d) : "");
const diaFmt = (d) => `${br.fmt(d)} (${br.diaSemana(d)})`;
const anosPorExtenso = (n) => `${n} ${Number(n) === 1 ? "ano" : "anos"}`;

function porExtenso(d) {
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

function quemAssina(p) {
  const rep = p.responsavel ? `${p.responsavel}, representando ${p.nome}` : p.nome;
  return rep;
}

/** O termo de imagem ou depoimento, em markdown. */
function termoImagem(spec, datas) {
  const n = spec.negocio, p = spec.pessoa, d = datas.termo;
  const tipo = spec.tipo;
  const titulo = tipo === "depoimento" ? "Autorização de uso de depoimento" : "Autorização de uso de imagem";
  const menor = p.menor;
  const quem = menor
    ? `Eu, ${p.nome}, CPF ${docFmt(p.documento)}, ${p.relacao} de ${menor.nome}${menor.nascimento ? `, nascido(a) em ${menor.nascimento}` : ""},`
    : `Eu, ${p.nome}, ${/^\d{11}$/.test(String(p.documento).replace(/\D/g, "")) ? "CPF" : "CNPJ"} ${docFmt(p.documento)}${p.relacao ? `, ${p.relacao} de ${n.nome}` : ""},`;
  const L = [];
  L.push(`# ${titulo}`, "");
  L.push(`${quem} autorizo ${n.nome}, ${/^\d{11}$/.test(String(n.documento).replace(/\D/g, "")) ? "CPF" : "CNPJ"} ${docFmt(n.documento)}${n.responsavel ? `, representada por ${n.responsavel}${n.registro ? ` (${n.registro})` : ""}` : ""}, a usar o que está descrito abaixo, nas condições deste termo.`, "");
  L.push("## 1. O que autorizo", "");
  spec.itens.forEach((it) => {
    L.push(`- ${it.o_que}, de ${it.captado_em}${it.por ? ` (por ${it.por})` : ""}`);
    if (it.texto) L.push(`  - Texto literal: "${String(it.texto).trim()}"`);
  });
  if (spec.anonimo) L.push(`- Sem meu nome, sem meu rosto identificável e sem qualquer dado que permita me reconhecer`);
  else L.push(`- Com ${menor ? `o primeiro nome de ${menor.nome.split(" ")[0]}` : "meu nome"}, do jeito que está neste termo`);
  L.push("", "## 2. Pra quê", "");
  L.push(`Finalidade: ${spec.finalidade}.`, "");
  L.push("Nada além disso. Uso pra outra finalidade, ou repasse pra outra empresa, exige nova autorização por escrito.", "");
  L.push("## 3. Onde pode aparecer", "");
  spec.canais.forEach((c) => L.push(`- ${c}`));
  L.push("", "## 4. Condições", "");
  const val = datas.validade ? `Vale por ${anosPorExtenso(spec.prazo_anos)} a partir de ${F(d)}, até ${F(datas.validade)}.` : "Vale por tempo indeterminado a partir da assinatura, até eu revogar.";
  L.push(`1. O uso é ${spec.remuneracao === "gratuito" ? "gratuito" : `remunerado em ${spec.remuneracao}`} e não cria vínculo além do que já existe entre nós.`);
  L.push(`2. ${val}`);
  L.push(`3. Posso revogar a qualquer momento, sem custo e sem precisar explicar, por mensagem em: ${n.canal_revogacao}. Depois do aviso, ${n.nome} tem ${spec.prazo_retirada_dias} dias corridos pra tirar o material do ar e parar de usar em peça nova. O que já foi impresso ou já foi enviado antes do aviso não precisa ser recolhido.`);
  L.push(`4. ${n.nome} não vai editar a imagem ou o texto além de corte, enquadramento e correção de digitação, e não vai usar o material pra prometer o mesmo resultado a outras pessoas.`);
  if (spec.sensivel) L.push(`5. Sei que o material contém informação sobre ${menor ? `a saúde de ${menor.nome}` : "minha saúde"}, que é dado pessoal sensível, e dou este consentimento de forma específica e destacada pra finalidade do item 2 (Lei 13.709/2018, art. 11, I).`);
  if (menor) L.push(`${spec.sensivel ? 6 : 5}. Assino como ${p.relacao} de ${menor.nome}, no melhor interesse dele(a), e posso revogar em nome dele(a) (Lei 13.709/2018, art. 14, § 1).`);
  const lgpd = ["art. 7, I", "art. 8"];
  if (spec.sensivel) lgpd.push("art. 11, I");
  if (menor) lgpd.push("art. 14, § 1");
  lgpd.push("art. 18, IX");
  const base = ["Código Civil, art. 20", `Lei 13.709/2018 (LGPD), ${lgpd.slice(0, -1).join(", ")} e ${lgpd[lgpd.length - 1]}`];
  if (menor) base.push("Lei 8.069/1990 (ECA), art. 17");
  L.push("", `Base: ${base.join("; ")}.`, "");
  L.push(`${n.cidade}, ${porExtenso(d)}`, "");
  L.push("_______________________________________", `${p.nome}`, `${/^\d{11}$/.test(String(p.documento).replace(/\D/g, "")) ? "CPF" : "CNPJ"} ${docFmt(p.documento)}${p.contato ? ` · ${p.contato}` : ""}`, "");
  L.push("_______________________________________", `${n.responsavel || n.nome}${n.responsavel ? ` · ${n.nome}` : ""}`, `${/^\d{11}$/.test(String(n.documento).replace(/\D/g, "")) ? "CPF" : "CNPJ"} ${docFmt(n.documento)}`, "");
  return L.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** O aceite de entrega, em markdown. */
function termoAceite(spec, datas) {
  const n = spec.negocio, p = spec.pessoa, d = datas.termo;
  const L = [];
  L.push("# Termo de aceite de entrega", "");
  L.push(`Projeto: **${spec.projeto}**${spec.contrato ? `, conforme o contrato em ${spec.contrato}` : ""}.`, "");
  L.push(`${quemAssina(p)}, ${/^\d{11}$/.test(String(p.documento).replace(/\D/g, "")) ? "CPF" : "CNPJ"} ${docFmt(p.documento)}, declaro que recebi de ${n.nome}, ${/^\d{11}$/.test(String(n.documento).replace(/\D/g, "")) ? "CPF" : "CNPJ"} ${docFmt(n.documento)}, em ${F(datas.entrega)}, o que está listado abaixo, e que conferi cada item.`, "");
  L.push("## 1. O que foi entregue", "");
  L.push("| Item | Onde está | Entregue em |", "|---|---|---|");
  spec.entregues.forEach((e) => L.push(`| ${e.item} | ${e.onde} | ${e.data || F(datas.entrega)} |`));
  L.push("");
  const rs = spec.ressalvas || [];
  L.push("## 2. Ressalvas", "");
  if (!rs.length) L.push("Nenhuma. O trabalho foi entregue conforme o combinado e está aceito por inteiro.");
  else {
    L.push("Aceito o trabalho com as pendências abaixo, que não impedem o uso do que foi entregue:", "");
    L.push("| Pendência | Resolver até |", "|---|---|");
    rs.forEach((r) => L.push(`| ${r.o_que} | ${r.ate} |`));
    L.push("", "Resolvida a pendência na data, o aceite passa a ser integral sem novo documento.");
  }
  L.push("", "## 3. O que este aceite fecha", "");
  let k = 1;
  L.push(`${k++}. As rodadas de revisão ${spec.contrato ? "previstas no contrato" : "combinadas"} estão encerradas. Pedido novo a partir daqui é escopo novo, com prazo e valor combinados à parte.`);
  if (datas.pagamento) {
    const valor = br.reais(br.numero(spec.pagamento_final.valor));
    L.push(spec.pagamento_final.vence
      ? `${k++}. A parcela final de ${valor} vence em ${diaFmt(datas.pagamento)}, na data combinada no contrato.`
      : `${k++}. A parcela final de ${valor} vence em ${spec.pagamento_final.dias_uteis} dias úteis contados deste aceite, ou seja, em ${diaFmt(datas.pagamento)}. Assinado em outro dia, a contagem corre da assinatura.`);
  }
  if (datas.garantia) L.push(`${k++}. ${n.nome} corrige, sem custo, erro do que foi entregue apontado até ${diaFmt(datas.garantia.seguro)} (${spec.garantia_dias} dias corridos a partir da entrega). Mudança de gosto ou de escopo não entra na garantia.`);
  if (datas.cdc) L.push(`${k++}. ${datas.garantia ? "Esse prazo não reduz o" : "Vale o"} que a lei garante ao consumidor: reclamar de vício aparente em até ${datas.cdc.dias} dias contados do término do serviço (Código de Defesa do Consumidor, art. 26), ou seja, até ${diaFmt(datas.cdc.seguro)}.`);
  L.push(`${k++}. O que foi entregue passa a ser de responsabilidade de quem recebeu: guardar cópia, publicar, imprimir. ${n.nome} mantém cópia por ${spec.guarda_dias || 90} dias.`);
  L.push("", `Base: Código Civil, art. 615 e 616 (recebimento da obra concluída conforme o ajuste, ou com abatimento)${datas.cdc ? "; Código de Defesa do Consumidor, art. 20 e 26" : ""}.`, "");
  L.push(`${n.cidade}, ${porExtenso(d)}`, "");
  L.push("_______________________________________", `${p.responsavel || p.nome}${p.responsavel ? ` · ${p.nome}` : ""}`, `${/^\d{11}$/.test(String(p.documento).replace(/\D/g, "")) ? "CPF" : "CNPJ"} ${docFmt(p.documento)}${p.contato ? ` · ${p.contato}` : ""}`, "");
  L.push("_______________________________________", `${n.responsavel || n.nome}${n.responsavel ? ` · ${n.nome}` : ""}`, `${/^\d{11}$/.test(String(n.documento).replace(/\D/g, "")) ? "CPF" : "CNPJ"} ${docFmt(n.documento)}`, "");
  return L.join("\n");
}

/** A versão curta pro WhatsApp: o que a pessoa lê e responde "autorizo" ou "aceito". */
function versaoCurta(spec, datas, base) {
  const n = spec.negocio, p = spec.pessoa;
  const primeiro = (p.responsavel || p.nome).split(" ")[0];
  const L = [`# Versão curta — ${base}`, "", `Pra mandar no WhatsApp de ${p.contato || p.nome}. A resposta por escrito vale como assinatura; guardar o print ao lado do termo.`, "", "```"];
  if (spec.tipo === "aceite") {
    L.push(`${primeiro}, fechando o ${spec.projeto.toLowerCase()}: entreguei em ${F(datas.entrega)}`);
    spec.entregues.forEach((e) => L.push(`• ${e.item} (${e.onde})`));
    if ((spec.ressalvas || []).length) { L.push("Fica pendente, por minha conta:"); spec.ressalvas.forEach((r) => L.push(`• ${r.o_que}, até ${r.ate}`)); }
    L.push("");
    L.push(`Se está tudo certo, me responde "aceito" que eu considero o trabalho entregue${datas.pagamento ? ` e a última parcela (${br.reais(br.numero(spec.pagamento_final.valor))}) fica pra ${F(datas.pagamento)}` : ""}. Se faltou alguma coisa, me diz o quê que eu resolvo antes.`);
  } else {
    L.push(`${primeiro}, posso usar ${spec.itens.map((i) => i.o_que).join(" e ")}?`);
    L.push(`Seria em: ${spec.canais.join("; ")}.`);
    L.push(`Pra quê: ${spec.finalidade}.`);
    L.push(spec.anonimo ? "Sem seu nome e sem nada que identifique você." : "Com seu nome, do jeito que está aqui.");
    L.push(`Vale por ${spec.prazo_anos ? anosPorExtenso(spec.prazo_anos) : "tempo indeterminado"}, e você pode pedir pra tirar quando quiser, sem explicar: eu tiro em ${spec.prazo_retirada_dias} dias.`);
    if (spec.itens.some((i) => i.texto)) L.push(`A frase que sairia: "${spec.itens.find((i) => i.texto).texto}"`);
    L.push("");
    L.push(`Se topar, me responde "autorizo" que já vale. Se preferir sem nome, ou só em um lugar, me fala que eu ajusto.`);
  }
  L.push("```", "", `Termo completo: \`${base}.html\` (e \`${base}.docx\`, se a pessoa quiser assinar no Word).`);
  return L.join("\n");
}

// ───────────────────────────── HTML ─────────────────────────────

function lerTokens(arq) {
  const css = fs.readFileSync(arq, "utf8");
  const cor = (css.match(/--accent\s*:\s*(#[0-9a-f]{3,8})/i) || [])[1];
  const fonte = (css.match(/--font-body\s*:\s*([^;]+);/i) || [])[1];
  return { cor, fonte: fonte && fonte.trim() };
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Markdown do termo → HTML de impressão. Cobre só o que o termo usa: título, parágrafo, lista, tabela, assinatura. */
function mdParaHtml(md) {
  const linhas = md.split("\n");
  const out = [];
  let i = 0;
  const inline = (s) => escHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  while (i < linhas.length) {
    const l = linhas[i];
    if (/^# /.test(l)) { out.push(`<h1>${inline(l.slice(2))}</h1>`); i++; continue; }
    if (/^## /.test(l)) { out.push(`<h2>${inline(l.slice(3))}</h2>`); i++; continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < linhas.length && /^\|/.test(linhas[i])) { rows.push(linhas[i]); i++; }
      const cel = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const cab = cel(rows[0]);
      out.push("<table><thead><tr>" + cab.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>");
      rows.slice(2).forEach((r) => out.push("<tr>" + cel(r).map((c, k) => `<td data-rotulo="${escHtml(cab[k] || "")}">${inline(c)}</td>`).join("") + "</tr>"));
      out.push("</tbody></table>");
      continue;
    }
    if (/^(-|\d+\.) /.test(l)) {
      const ord = /^\d+\. /.test(l);
      out.push(ord ? "<ol>" : "<ul>");
      while (i < linhas.length && /^(-|\d+\.) /.test(linhas[i])) {
        let item = inline(linhas[i].replace(/^(-|\d+\.) /, ""));
        i++;
        while (i < linhas.length && /^ {2,}- /.test(linhas[i])) { item += `<br><em>${inline(linhas[i].replace(/^ {2,}- /, ""))}</em>`; i++; }
        out.push(`<li>${item}</li>`);
      }
      out.push(ord ? "</ol>" : "</ul>");
      continue;
    }
    if (/^_{10,}$/.test(l)) {
      const nome = linhas[i + 1] || "", doc = linhas[i + 2] || "";
      out.push(`<div class="assinatura"><div class="linha"></div><p class="nome">${inline(nome)}</p><p class="doc">${inline(doc)}</p></div><!--/assinatura-->`);
      i += 3; continue;
    }
    if (!l.trim()) { i++; continue; }
    if (/^Base: /.test(l)) { out.push(`<p class="lei">${inline(l)}</p>`); i++; continue; }
    out.push(`<p>${inline(l)}</p>`); i++;
  }
  return out.join("\n");
}

function html(spec, md, tokens) {
  const cor = tokens.cor || "#1f4e79";
  const fonte = tokens.fonte || '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const titulo = TIPOS[spec.tipo];
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(titulo)} — ${escHtml(spec.pessoa.nome)}</title>
<meta name="description" content="${escHtml(titulo)} entre ${escHtml(spec.pessoa.nome)} e ${escHtml(spec.negocio.nome)}, ${escHtml(spec.data)}.">
<meta name="robots" content="noindex">
<style>
  :root {
    --cor-fundo: #ffffff;
    --cor-texto: #1c1c1c;
    --cor-suave: #5a5a5a;
    --cor-destaque: ${cor};
    --cor-borda: #dcdcdc;
    --cor-caixa: #f4f6f8;
    --fonte: ${fonte};
    --largura: 720px;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--cor-fundo, #fff); color: var(--cor-texto, #1c1c1c); font-family: var(--fonte, system-ui, sans-serif); font-size: 16px; line-height: 1.55; }
  main { max-width: var(--largura, 720px); margin: 0 auto; padding: 40px 16px 64px; }
  header { border-bottom: 2px solid var(--cor-destaque, #1f4e79); padding-bottom: 12px; margin-bottom: 28px; }
  header p { margin: 0; font-weight: 600; color: var(--cor-destaque, #1f4e79); text-transform: uppercase; letter-spacing: .02em; font-size: 13px; }
  h1 { font-size: 26px; line-height: 1.2; margin: 0 0 16px; }
  h2 { font-size: 18px; margin: 28px 0 10px; color: var(--cor-destaque, #1f4e79); }
  p { margin: 0 0 12px; }
  ul, ol { padding-left: 22px; margin: 0 0 12px; }
  li { margin-bottom: 8px; }
  li em { color: var(--cor-suave, #5a5a5a); }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 15px; }
  th, td { border: 1px solid var(--cor-borda, #dcdcdc); padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: var(--cor-caixa, #f4f6f8); font-weight: 600; }
  .lei { color: var(--cor-suave, #5a5a5a); font-size: 13px; }
  .assinaturas { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 48px; }
  .assinatura { flex: 1 1 260px; break-inside: avoid; page-break-inside: avoid; }
  .assinatura .linha { border-top: 1px solid var(--cor-texto, #1c1c1c); margin-top: 56px; }
  .assinatura .nome { margin: 6px 0 0; font-weight: 600; }
  .assinatura .doc { margin: 0; color: var(--cor-suave, #5a5a5a); font-size: 14px; }
  footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid var(--cor-borda, #dcdcdc); color: var(--cor-suave, #5a5a5a); font-size: 13px; }
  @media (max-width: 480px) {
    h1 { font-size: 22px; }
    table, thead, tbody, tr, th, td { display: block; }
    thead { display: none; }
    td { border-top: none; }
    td::before { content: attr(data-rotulo); display: block; font-weight: 600; font-size: 12px; color: var(--cor-suave, #5a5a5a); }
    tr { border-top: 1px solid var(--cor-borda, #dcdcdc); margin-bottom: 10px; }
  }
  @page { size: A4; margin: 20mm 18mm; }
  @media print {
    body { font-size: 11.5pt; color: #000; background: #fff; }
    main { max-width: none; padding: 0; }
    h2 { break-after: avoid; }
    table, .assinaturas { break-inside: avoid; }
    footer { display: none; }
  }
</style>
</head>
<body>
<main>
  <header><p>${escHtml(spec.negocio.nome)}</p></header>
${mdParaHtml(md).replace(/(<div class="assinatura">[\s\S]*?<!--\/assinatura-->\s*){2}/, (m) => `<div class="assinaturas">${m}</div>`)}
  <footer>Gerado em ${escHtml(spec.data)} a partir de ${escHtml(path.basename(spec._arquivo || "termo.json"))}. Duas vias, uma pra cada parte.</footer>
</main>
</body>
</html>
`;
}

// ───────────────────────────── biblioteca ─────────────────────────────

function linhaBiblioteca(spec, caminhoTermo) {
  const a = spec.assinatura || {};
  const status = a.data ? `sim, ${a.data} (${caminhoTermo})` : `pendente, termo em ${caminhoTermo}`;
  const p = spec.pessoa;
  if (spec.tipo === "depoimento") {
    const it = spec.itens.find((i) => i.texto) || spec.itens[0];
    const trecho = it.texto ? `"${String(it.texto).trim().slice(0, 60)}${String(it.texto).trim().length > 60 ? "…" : ""}"` : it.o_que;
    return { tabela: "Depoimentos", linha: `| ${p.nome} | ${p.relacao || "cliente"}, ${it.captado_em} | ${trecho} | ${it.onde || "arquivo ainda não apontado"} | ${status} |` };
  }
  if (spec.tipo === "imagem") {
    const it = spec.itens[0];
    return { tabela: "Fotos e imagens", linha: `| ${it.o_que} (${p.nome}${spec.anonimo ? ", anônimo" : ""}) | ${it.onde || "arquivo ainda não apontado"} | autorização: ${status} | ${spec.canais.join(", ")} |` };
  }
  return { tabela: null, linha: `- [x] Aceite de ${spec.projeto} por ${p.nome} — ${a.data || spec.data} (${caminhoTermo})` };
}

/** Grava o "sim" na biblioteca.md: acha a linha pelo nome da pessoa e troca a última coluna; se não acha, acrescenta na tabela certa. */
function registrarBiblioteca(arq, spec, caminhoTermo) {
  const { tabela, linha } = linhaBiblioteca(spec, caminhoTermo);
  if (!tabela) return { acao: "nada" };
  const a = spec.assinatura;
  const carimbo = `sim, ${a.data} (${caminhoTermo})`;
  if (!fs.existsSync(arq)) {
    const cab = tabela === "Depoimentos"
      ? "| Quem | Contexto | Trecho | Onde está | Autorizado |\n|---|---|---|---|---|"
      : "| O que é | Arquivo | Direitos | Boa pra |\n|---|---|---|---|";
    fs.writeFileSync(arq, `# Biblioteca\n*Atualizado em ${br.iso(new Date())}*\n\n## ${tabela}\n${cab}\n${linha}\n`);
    return { acao: "criou", linha };
  }
  const t = fs.readFileSync(arq, "utf8").replace(/^\*Atualizado em [^*]+\*/m, `*Atualizado em ${br.iso(new Date())}*`);
  const linhas = t.split("\n");
  const nome = spec.pessoa.nome.toLowerCase();
  let ini = linhas.findIndex((l) => new RegExp(`^##\\s+${tabela}`, "i").test(l));
  if (ini === -1) {
    const cab = tabela === "Depoimentos"
      ? "| Quem | Contexto | Trecho | Onde está | Autorizado |\n|---|---|---|---|---|"
      : "| O que é | Arquivo | Direitos | Boa pra |\n|---|---|---|---|";
    fs.writeFileSync(arq, t.replace(/\s*$/, "") + `\n\n## ${tabela}\n${cab}\n${linha}\n`);
    return { acao: "acrescentou seção", linha };
  }
  let fim = ini + 1;
  while (fim < linhas.length && !/^##\s/.test(linhas[fim])) fim++;
  for (let k = ini + 1; k < fim; k++) {
    const l = linhas[k];
    if (!/^\|/.test(l) || /^\|\s*-{2,}/.test(l) || !l.toLowerCase().includes(nome)) continue;
    const cels = l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const idx = tabela === "Depoimentos" ? cels.length - 1 : Math.min(2, cels.length - 1);
    cels[idx] = tabela === "Depoimentos" ? carimbo : `autorização: ${carimbo}`;
    linhas[k] = `| ${cels.join(" | ")} |`;
    fs.writeFileSync(arq, linhas.join("\n"));
    return { acao: "atualizou", linha: linhas[k] };
  }
  let ult = fim - 1;
  while (ult > ini && !/^\|/.test(linhas[ult])) ult--;
  linhas.splice(ult + 1, 0, linha);
  fs.writeFileSync(arq, linhas.join("\n"));
  return { acao: "acrescentou", linha };
}

// ───────────────────────────── comandos ─────────────────────────────

function mostrarConferencia(r, spec) {
  r.erros.forEach((e) => console.log(`  ✖ ${e}`));
  r.avisos.forEach((a) => console.log(`  – ${a}`));
  const d = r.datas;
  if (d.termo) console.log(`  → data do termo: ${diaFmt(d.termo)}`);
  if (d.validade) console.log(`  → vale até: ${diaFmt(d.validade)} (${anosPorExtenso(spec.prazo_anos)}; Código Civil, art. 132, § 3)`);
  if (d.retirada_exemplo) console.log(`  → revogação pedida no dia do termo teria que sair do ar até ${diaFmt(d.retirada_exemplo.fim)}${d.retirada_exemplo.seguro > d.retirada_exemplo.fim ? `, dia útil seguinte ${diaFmt(d.retirada_exemplo.seguro)}` : ""}`);
  if (d.entrega) console.log(`  → entrega: ${diaFmt(d.entrega)}`);
  if (d.garantia) console.log(`  → garantia contratual até: ${diaFmt(d.garantia.seguro)}${d.garantia.seguro > d.garantia.fim ? ` (o ${spec.garantia_dias}º dia cai em ${br.fmt(d.garantia.fim)}, dia não útil)` : ""}`);
  if (d.cdc) console.log(`  → vício aparente pelo CDC, art. 26: até ${diaFmt(d.cdc.seguro)} (${d.cdc.dias} dias da entrega)`);
  if (d.pagamento) console.log(`  → parcela final vence: ${diaFmt(d.pagamento)}`);
  if (d.assinado) console.log(`  → assinado em: ${diaFmt(d.assinado)} por ${spec.assinatura.meio}`);
}

function cmdExemplo(o) {
  const tipo = o._[1];
  if (!EXEMPLOS[tipo]) morrer("Diga o tipo: imagem, depoimento ou aceite", "node scripts/autorizacao.js exemplo depoimento --saida termo.json");
  const txt = JSON.stringify(EXEMPLOS[tipo], null, 2) + "\n";
  if (o.saida && o.saida !== true) {
    const abs = path.resolve(o.saida);
    if (fs.existsSync(abs) && !o.sobrescrever) morrer(`${o.saida} já existe`, "Use --sobrescrever ou outro nome.");
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, txt);
    console.log(`✓ exemplo de ${tipo} em ${o.saida}. Troque cada valor pelo dado real; os documentos do exemplo são de teste.`);
  } else process.stdout.write(txt);
}

function cmdConferir(o) {
  const spec = lerSpec(o._[1]);
  const r = conferir(spec, [].concat(o.feriado || []).filter((x) => x !== true));
  if (o.json) { console.log(JSON.stringify({ erros: r.erros, avisos: r.avisos, datas: Object.fromEntries(Object.entries(r.datas).map(([k, v]) => [k, v instanceof Date ? br.fmt(v) : v && v.seguro ? { fim: br.fmt(v.fim), seguro: br.fmt(v.seguro), dias: v.dias } : v])) }, null, 2)); return r; }
  console.log(`\nTERMO: ${o._[1]} (${TIPOS[spec.tipo] || spec.tipo})`);
  mostrarConferencia(r, spec);
  if (r.erros.length) { console.log(`\n${r.erros.length} erro(s). Corrija o JSON e rode de novo.`); process.exitCode = 1; }
  else console.log("\nTudo certo.");
  return r;
}

function cmdGerar(o) {
  const spec = lerSpec(o._[1]);
  const extras = [].concat(o.feriado || []).filter((x) => x !== true);
  const r = conferir(spec, extras);
  console.log(`\nTERMO: ${o._[1]} (${TIPOS[spec.tipo] || spec.tipo})`);
  mostrarConferencia(r, spec);
  if (r.erros.length) morrer(`${r.erros.length} erro(s) no JSON; nada foi gerado.`, "Termo com campo em branco na frente de quem assina é constrangimento. Corrija e rode de novo.");

  const pasta = path.resolve(o.saida && o.saida !== true ? o.saida : path.dirname(spec._arquivo));
  fs.mkdirSync(pasta, { recursive: true });
  const base = baseNome(spec);
  const arqMd = path.join(pasta, `${base}.md`);
  const arqHtml = path.join(pasta, `${base}.html`);
  const arqZap = path.join(pasta, `${base}-whatsapp.md`);
  if (fs.existsSync(arqHtml) && !o.sobrescrever) morrer(`${curto(arqHtml)} já existe`, "Termo novo pra mesma pessoa: ponha \"arquivo\": \"depoimento-maria-2026-10\" no JSON. Pra refazer o mesmo: --sobrescrever.");

  let tokens = { cor: null, fonte: null };
  if (o.tokens && o.tokens !== true) {
    if (!fs.existsSync(path.resolve(o.tokens))) morrer(`Não achei o tokens.css: ${o.tokens}`);
    tokens = lerTokens(path.resolve(o.tokens));
    if (tokens.fonte && /Inter|Playfair|Poppins|Montserrat|Lora/i.test(tokens.fonte)) tokens.fonte = `${tokens.fonte}, system-ui, sans-serif`;
  }

  const md = spec.tipo === "aceite" ? termoAceite(spec, r.datas) : termoImagem(spec, r.datas);
  fs.writeFileSync(arqMd, md + "\n");
  fs.writeFileSync(arqHtml, html(spec, md, tokens));
  fs.writeFileSync(arqZap, versaoCurta(spec, r.datas, base) + "\n");
  const rel = curto;
  console.log(`\n✓ ${rel(arqMd)}\n✓ ${rel(arqHtml)}\n✓ ${rel(arqZap)}`);
  const lb = linhaBiblioteca(spec, rel(arqHtml));
  console.log(lb.tabela ? `\nLinha pra biblioteca.md (tabela "${lb.tabela}"):\n${lb.linha}` : `\nLinha pra tarefas.md (Feito), quando o aceite chegar:\n${lb.linha}`);
  console.log(`\nDepois:\n  node scripts/gerar-docx.js ${rel(arqMd)}      # .docx pra quem quer assinar no Word\n  node scripts/verificar.js html ${rel(arqHtml)}\n  node scripts/autorizacao.js registrar ${o._[1]} --data DD/MM/AAAA --meio whatsapp --prova <print>   # quando o "sim" chegar`);
  return { arqMd, arqHtml, arqZap };
}

function cmdRegistrar(o) {
  const spec = lerSpec(o._[1]);
  if (!o.data || o.data === true) morrer("Diga a data do sim: --data DD/MM/AAAA");
  if (!MEIOS.includes(o.meio)) morrer(`Diga o meio: --meio ${MEIOS.join("|")}`);
  spec.assinatura = { data: o.data, meio: o.meio, prova: o.prova && o.prova !== true ? o.prova : "" };
  const r = conferir(spec, [].concat(o.feriado || []).filter((x) => x !== true));
  if (r.erros.length) { r.erros.forEach((e) => console.log(`  ✖ ${e}`)); morrer("O JSON tem erro; nada foi registrado."); }
  if (spec.assinatura.prova && !fs.existsSync(path.resolve(spec.assinatura.prova))) console.log(`  – a prova apontada não existe ainda: ${spec.assinatura.prova}. Salve o print aí.`);
  const arq = spec._arquivo;
  delete spec._arquivo;
  fs.writeFileSync(arq, JSON.stringify(spec, null, 2) + "\n");
  spec._arquivo = arq;
  const pasta = path.resolve(o.saida && o.saida !== true ? o.saida : path.dirname(spec._arquivo));
  const termo = curto(path.join(pasta, `${baseNome(spec)}.html`));
  if (!fs.existsSync(termo)) console.log(`  – o termo ${termo} não existe. Gere antes: node scripts/autorizacao.js gerar ${o._[1]}`);
  console.log(`✓ assinatura registrada no JSON: ${o.data} por ${o.meio}`);
  const lb = linhaBiblioteca(spec, termo);
  if (spec.tipo === "aceite") {
    console.log(`\nLinha pra tarefas.md (Feito):\n${lb.linha}`);
    const extras = [].concat(o.feriado || []).filter((x) => x !== true);
    const ag = [], dep = [];
    const pf = spec.pagamento_final;
    if (pf && r.datas.assinado) {
      const venc = pf.vence ? br.lerData(pf.vence) : br.maisUteis(r.datas.assinado, Number(pf.dias_uteis), extras);
      ag.push(`- [ ] Cobrar a parcela final de ${spec.projeto} — ${br.reais(br.numero(pf.valor))} vence ${diaFmt(venc)} (/cobranca)`);
    }
    if (r.datas.garantia) dep.push(`- [ ] Fim da garantia de ${spec.projeto} — ${diaFmt(r.datas.garantia.seguro)} (/autorizacao)`);
    if (r.datas.cdc) dep.push(`- [ ] Fim do prazo do CDC, art. 26 (${r.datas.cdc.dias} dias) — ${diaFmt(r.datas.cdc.seguro)}`);
    if (ag.length) console.log(`\nLinha pra tarefas.md (Agora):\n${ag.join("\n")}`);
    if (dep.length) console.log(`\nLinha pra tarefas.md (Depois):\n${dep.join("\n")}`);
    console.log(`\nE o marco pro /pos-venda: aceite assinado é "acabou de entregar", a janela do pedido de depoimento.`);
    return;
  }
  const bib = o.biblioteca && o.biblioteca !== true ? path.resolve(o.biblioteca) : path.resolve("biblioteca.md");
  const res = registrarBiblioteca(bib, spec, termo);
  console.log(`✓ ${curto(bib)}: ${res.acao} na tabela "${lb.tabela}"\n${res.linha}`);
  if (r.datas.validade) console.log(`\nLinha pra tarefas.md (Depois):\n- [ ] Renovar ou encerrar a autorização de ${spec.pessoa.nome} — vence ${br.fmt(r.datas.validade)} (/autorizacao)`);
}

function cmdLinha(o) {
  const spec = lerSpec(o._[1]);
  const pasta = o.saida && o.saida !== true ? path.resolve(o.saida) : path.dirname(spec._arquivo);
  console.log(linhaBiblioteca(spec, curto(path.join(pasta, `${baseNome(spec)}.html`))).linha);
}

function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  if (!cmd || o.ajuda || o.help) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("\n").slice(2).map((l) => l.replace(/^ \* ?/, "")).join("\n"));
    return;
  }
  if (cmd !== "exemplo" && !o._[1]) morrer(`Falta o arquivo JSON: node scripts/autorizacao.js ${cmd} <termo.json>`);
  if (cmd === "exemplo") return cmdExemplo(o);
  if (cmd === "conferir") return cmdConferir(o);
  if (cmd === "gerar") return cmdGerar(o);
  if (cmd === "registrar") return cmdRegistrar(o);
  if (cmd === "linha") return cmdLinha(o);
  morrer(`Comando desconhecido: ${cmd}`, "Use exemplo, conferir, gerar, registrar ou linha.");
}

module.exports = { conferir, validade, prazoCorrido, termoImagem, termoAceite, versaoCurta, linhaBiblioteca, registrarBiblioteca, baseNome, mdParaHtml, EXEMPLOS, TIPOS };

if (require.main === module) main();
