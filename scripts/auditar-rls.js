#!/usr/bin/env node
/**
 * Contex OS — auditar-rls.js
 * Lê as migrations SQL de um sistema (Supabase ou Postgres exposto por API) e
 * responde, tabela por tabela, se um desconhecido com a chave pública consegue
 * ler ou escrever. Opcionalmente prova isso ao vivo, contra o app no ar.
 *
 * Existe porque a falha mais comum de app feito às pressas não está no código:
 * está na tabela criada sem RLS, na política `using (true)` e na função
 * `security definer` que qualquer um chama pela API. Nada disso dá erro, nada
 * disso aparece no teste, e tudo isso vaza dado de cliente. O script lê o SQL
 * do jeito que o banco vai ler (na ordem, aplicando cada instrução), aponta o
 * que ficou aberto e escreve a migration que fecha.
 *
 * Uso:
 *   node scripts/auditar-rls.js <pasta-do-sistema | pasta-de-migrations | arquivo.sql>
 *
 * Opções:
 *   --migration <arquivo.sql>   escreve a migration de correção (com seção de desfazer)
 *   --saida <arquivo.json>      grava os achados em JSON pra outro script ler
 *   --publico t1,t2             tabelas que são públicas de propósito (cardápio, produtos)
 *   --plataforma supabase|postgres   no Postgres puro, tabela sem GRANT a anon não conta (padrão: supabase)
 *   --url <https://xxx.supabase.co>  testa ao vivo: leitura anônima em cada tabela
 *   --chave <chave anon>        chave pública (anon / sb_publishable_) pro teste ao vivo
 *   --tabelas t1,t2             limita o teste ao vivo a essas tabelas
 *   --escrever                  também sonda escrita anônima (pode gravar uma linha; veja o aviso)
 *   --json                      só o JSON no terminal, sem o relatório colorido
 *
 * Sai com código 2 quando há achado CRÍTICO ou tabela aberta no teste ao vivo,
 * 1 em erro de uso, 0 quando não achou nada grave.
 *
 * O teste ao vivo usa só fetch nativo (Node 18+) e a chave PÚBLICA. Chave
 * service_role/sb_secret_ nunca entra aqui: ela ignora toda política, então
 * provaria o contrário do que se quer.
 */

const fs = require("fs");
const path = require("path");
const br = require("./br.js");

// ─────────────────────────── tokenização SQL ───────────────────────────

/** Índice do primeiro caractere que não é espaço nem comentário. */
function inicioReal(txt) {
  let i = 0;
  const n = txt.length;
  while (i < n) {
    if (/\s/.test(txt[i])) { i++; continue; }
    if (txt[i] === "-" && txt[i + 1] === "-") { while (i < n && txt[i] !== "\n") i++; continue; }
    if (txt[i] === "/" && txt[i + 1] === "*") { const f = txt.indexOf("*/", i + 2); i = f < 0 ? n : f + 2; continue; }
    break;
  }
  return i;
}

/** Quebra o SQL em instruções, respeitando aspas, $tag$...$tag$ e comentários. Guarda a linha. */
function instrucoes(sql) {
  const guardar = (txt, linhaIni) => {
    if (!txt.trim()) return;
    const idx = inicioReal(txt);
    if (idx >= txt.length) return;
    out.push({ txt: txt.slice(idx), linha: linhaIni + (txt.slice(0, idx).match(/\n/g) || []).length });
  };
  const out = [];
  let i = 0, ini = 0, linha = 1, linhaIni = 1;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    if (c === "\n") { linha++; i++; continue; }
    if (c === "-" && sql[i + 1] === "-") { while (i < n && sql[i] !== "\n") i++; continue; }
    if (c === "/" && sql[i + 1] === "*") {
      const fim = sql.indexOf("*/", i + 2);
      const bloco = fim < 0 ? sql.slice(i) : sql.slice(i, fim + 2);
      linha += (bloco.match(/\n/g) || []).length;
      i = fim < 0 ? n : fim + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      i++;
      while (i < n && sql[i] !== c) { if (sql[i] === "\n") linha++; if (sql[i] === "\\" ) i++; i++; }
      i++;
      continue;
    }
    if (c === "$") {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        const fim = sql.indexOf(tag, i + tag.length);
        const bloco = fim < 0 ? sql.slice(i) : sql.slice(i, fim + tag.length);
        linha += (bloco.match(/\n/g) || []).length;
        i = fim < 0 ? n : fim + tag.length;
        continue;
      }
    }
    if (c === ";") {
      guardar(sql.slice(ini, i), linhaIni);
      i++;
      ini = i;
      linhaIni = linha;
      continue;
    }
    i++;
  }
  guardar(sql.slice(ini), linhaIni);
  return out;
}

/** Tira comentário do texto de uma instrução, preservando dollar-quote e aspas. */
function semComentario(txt) {
  let out = "", i = 0;
  const n = txt.length;
  while (i < n) {
    const c = txt[i];
    if (c === "-" && txt[i + 1] === "-") { while (i < n && txt[i] !== "\n") i++; continue; }
    if (c === "/" && txt[i + 1] === "*") { const f = txt.indexOf("*/", i + 2); i = f < 0 ? n : f + 2; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < n && txt[j] !== c) { if (txt[j] === "\\") j++; j++; }
      out += txt.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === "$") {
      const m = txt.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) { const f = txt.indexOf(m[0], i + m[0].length); const fim = f < 0 ? n : f + m[0].length; out += txt.slice(i, fim); i = fim; continue; }
    }
    out += c; i++;
  }
  return out;
}

/** `"public"."Pedidos"` → { schema: "public", nome: "Pedidos" }; `pedidos` → schema public. */
function identificador(bruto) {
  const partes = [];
  const re = /"((?:[^"]|"")+)"|([A-Za-z_][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(bruto))) partes.push(m[1] !== undefined ? m[1].replace(/""/g, '"') : m[2].toLowerCase());
  if (!partes.length) return null;
  if (partes.length === 1) return { schema: "public", nome: partes[0] };
  return { schema: partes[partes.length - 2], nome: partes[partes.length - 1] };
}
const chave = (id) => `${id.schema}.${id.nome}`;
const RE_IDENT = `(?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\\s*\\.\\s*(?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*))?`;

/** Pega o conteúdo entre parênteses balanceados a partir de `pos` (que aponta pro "("). */
function entreParenteses(txt, pos) {
  let nivel = 0, i = pos;
  for (; i < txt.length; i++) {
    const c = txt[i];
    if (c === "'" ) { i++; while (i < txt.length && txt[i] !== "'") i++; continue; }
    if (c === "(") nivel++;
    else if (c === ")") { nivel--; if (nivel === 0) return { conteudo: txt.slice(pos + 1, i), fim: i + 1 }; }
  }
  return { conteudo: txt.slice(pos + 1), fim: txt.length };
}

/** Colunas de um CREATE TABLE: só o nome de cada uma. */
function colunasDe(conteudo) {
  const cols = [];
  let nivel = 0, ini = 0;
  const partes = [];
  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (c === "(") nivel++;
    else if (c === ")") nivel--;
    else if (c === "," && nivel === 0) { partes.push(conteudo.slice(ini, i)); ini = i + 1; }
  }
  partes.push(conteudo.slice(ini));
  for (const p of partes) {
    const t = p.trim();
    if (!t || /^(constraint|primary\s+key|foreign\s+key|unique|check|exclude|like)\b/i.test(t)) continue;
    const m = t.match(/^(?:"((?:[^"]|"")+)"|([A-Za-z_][A-Za-z0-9_$]*))/);
    if (m) cols.push(m[1] !== undefined ? m[1] : m[2].toLowerCase());
  }
  return cols;
}

// ─────────────────────────── modelo do banco ───────────────────────────

const SCHEMAS_INTERNOS = new Set(["pg_catalog", "information_schema", "auth", "storage", "extensions", "graphql",
  "graphql_public", "realtime", "supabase_functions", "supabase_migrations", "_analytics", "pgsodium", "vault",
  "pgbouncer", "net", "cron", "private", "internal"]);

const RE_SENSIVEL = /usuari|users?$|^user_|profile|perfil|client|customer|pacient|patient|pedido|order|pagamento|payment|cobranc|invoice|fatura|assinatura|subscri|mensag|message|convers|chat|endereco|address|cart(ao|oes)|card|funcionari|employee|aluno|student|lead|contato|contact|agendamento|appointment|consulta|prontuario|documento|arquivo|file|senha|password|token|session|sessao|api_key|chave|financeiro|transac|nota|prescri|exame|cpf|cnpj|telefone|phone|email/i;
const RE_PUBLICO_POR_NATUREZA = /^(produto|product|categoria|categor|servico|service|plano|plan|cidade|estado|pais|countr|moeda|currenc|faq|depoimento|testimonial|cardapio|menu|item|banner|config_public|tag|marca|brand)s?$/i;
// Coluna que desmente o "essa tabela é pública de propósito": preço de custo, margem,
// estoque interno e dado pessoal não entram em cardápio nem em catálogo.
const RE_COLUNA_QUE_NAO_E_PUBLICA = /^(custo|preco_custo|precocusto|margem|lucro|comissao|desconto_max|estoque|qtd_estoque|quantidade_estoque|saldo|telefone|celular|whatsapp|email|e_mail|cpf|cnpj|endereco|senha|password|token|observacao_interna|nota_interna)/i;
const COLUNAS_DE_DONO = ["user_id", "usuario_id", "owner_id", "dono_id", "profile_id", "perfil_id", "created_by", "criado_por", "author_id", "autor_id", "account_id", "conta_id", "cliente_id", "customer_id", "tenant_id", "empresa_id", "org_id", "organization_id"];

function novoEstado() {
  return { tabelas: new Map(), funcoes: new Map(), views: new Map(), grantsSchema: [], avisosParser: [] };
}

function tabela(estado, id, origem) {
  const k = chave(id);
  if (!estado.tabelas.has(k)) {
    estado.tabelas.set(k, { schema: id.schema, nome: id.nome, rls: false, force: false, politicas: [], grants: new Map(), revokes: new Map(), colunas: [], origem, desligadoEm: null });
  }
  return estado.tabelas.get(k);
}

/** Aplica uma instrução ao estado. Devolve true se reconheceu. */
function aplicar(estado, inst, origem) {
  const txt = semComentario(inst.txt).replace(/\s+/g, " ").trim();
  const t = txt.toLowerCase();
  const org = { arquivo: origem, linha: inst.linha };
  let m;

  // CREATE TABLE
  if ((m = txt.match(new RegExp(`^create\\s+(?:unlogged\\s+|temp(?:orary)?\\s+)?table\\s+(?:if\\s+not\\s+exists\\s+)?(${RE_IDENT})`, "i")))) {
    const id = identificador(m[1]);
    const tb = tabela(estado, id, org);
    tb.origem = org;
    const p = txt.indexOf("(", m[0].length);
    if (p > 0 && !/^\s*as\b/i.test(txt.slice(m[0].length))) tb.colunas = colunasDe(entreParenteses(txt, p).conteudo);
    return true;
  }
  // DROP TABLE
  if ((m = txt.match(new RegExp(`^drop\\s+table\\s+(?:if\\s+exists\\s+)?(${RE_IDENT})`, "i")))) {
    estado.tabelas.delete(chave(identificador(m[1])));
    return true;
  }
  // ALTER TABLE ... ENABLE/DISABLE/FORCE ROW LEVEL SECURITY
  if ((m = txt.match(new RegExp(`^alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(${RE_IDENT})\\s+(.*)$`, "i")))) {
    const tb = tabela(estado, identificador(m[1]), org);
    const acoes = m[2];
    if (/\benable\s+row\s+level\s+security\b/i.test(acoes)) { tb.rls = true; tb.desligadoEm = null; }
    if (/\bdisable\s+row\s+level\s+security\b/i.test(acoes)) { tb.rls = false; tb.desligadoEm = org; }
    if (/\bno\s+force\s+row\s+level\s+security\b/i.test(acoes)) tb.force = false;
    else if (/\bforce\s+row\s+level\s+security\b/i.test(acoes)) tb.force = true;
    if (/\badd\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?/i.test(acoes)) {
      const re = /\badd\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(?:"((?:[^"]|"")+)"|([A-Za-z_][A-Za-z0-9_$]*))/gi;
      let c; while ((c = re.exec(acoes))) tb.colunas.push(c[1] !== undefined ? c[1] : c[2].toLowerCase());
    }
    return true;
  }
  // CREATE POLICY
  if ((m = txt.match(new RegExp(`^create\\s+policy\\s+("(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)\\s+on\\s+(${RE_IDENT})(.*)$`, "i")))) {
    const nome = m[1].replace(/^"|"$/g, "").replace(/""/g, '"');
    const tb = tabela(estado, identificador(m[2]), org);
    const resto = m[3];
    const pol = { nome, cmd: "ALL", roles: ["public"], using: null, withCheck: null, permissiva: true, origem: org, sql: inst.txt.trim() };
    let mm;
    if ((mm = resto.match(/\bas\s+(permissive|restrictive)\b/i))) pol.permissiva = mm[1].toLowerCase() === "permissive";
    if ((mm = resto.match(/\bfor\s+(all|select|insert|update|delete)\b/i))) pol.cmd = mm[1].toUpperCase();
    if ((mm = resto.match(/\bto\s+((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_]*)(?:\s*,\s*(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_]*))*)/i))) {
      pol.roles = mm[1].split(",").map((r) => r.trim().replace(/^"|"$/g, "").toLowerCase());
    }
    const u = resto.search(/\busing\s*\(/i);
    if (u >= 0) pol.using = entreParenteses(resto, resto.indexOf("(", u)).conteudo.trim();
    const w = resto.search(/\bwith\s+check\s*\(/i);
    if (w >= 0) pol.withCheck = entreParenteses(resto, resto.indexOf("(", w)).conteudo.trim();
    tb.politicas = tb.politicas.filter((p) => p.nome !== nome);
    tb.politicas.push(pol);
    return true;
  }
  // DROP POLICY
  if ((m = txt.match(new RegExp(`^drop\\s+policy\\s+(?:if\\s+exists\\s+)?("(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)\\s+on\\s+(${RE_IDENT})`, "i")))) {
    const nome = m[1].replace(/^"|"$/g, "").replace(/""/g, '"');
    const tb = tabela(estado, identificador(m[2]), org);
    tb.politicas = tb.politicas.filter((p) => p.nome !== nome);
    return true;
  }
  // CREATE FUNCTION
  if ((m = txt.match(new RegExp(`^create\\s+(?:or\\s+replace\\s+)?function\\s+(${RE_IDENT})\\s*\\(`, "i")))) {
    const id = identificador(m[1]);
    const { conteudo: args, fim } = entreParenteses(txt, m[0].length - 1);
    const cauda = txt.slice(fim);
    const assinatura = args.replace(/\s+(?:default|=)\s+[^,]+/gi, "").replace(/\s+/g, " ").trim();
    const f = {
      schema: id.schema, nome: id.nome, assinatura,
      definer: /\bsecurity\s+definer\b/i.test(cauda),
      searchPath: /\bset\s+search_path\b/i.test(cauda),
      revogadoDe: new Set(), origem: org,
    };
    estado.funcoes.set(`${chave(id)}(${assinatura})`, f);
    return true;
  }
  // REVOKE EXECUTE ON FUNCTION ... FROM roles
  if ((m = txt.match(new RegExp(`^revoke\\s+(?:all(?:\\s+privileges)?|execute)\\s+on\\s+(?:function|procedure|routine)\\s+(${RE_IDENT})\\s*(?:\\(([^)]*)\\))?[^]*?\\bfrom\\s+(.+)$`, "i")))) {
    const id = identificador(m[1]);
    const roles = m[3].split(",").map((r) => r.trim().replace(/^"|"$/g, "").toLowerCase());
    for (const [k, f] of estado.funcoes) if (k.startsWith(chave(id) + "(")) roles.forEach((r) => f.revogadoDe.add(r));
    return true;
  }
  if ((m = txt.match(/^revoke\s+(?:all(?:\s+privileges)?|execute)\s+on\s+all\s+functions\s+in\s+schema\s+(\w+)[^]*?\bfrom\s+(.+)$/i))) {
    const roles = m[2].split(",").map((r) => r.trim().replace(/^"|"$/g, "").toLowerCase());
    for (const f of estado.funcoes.values()) if (f.schema === m[1].toLowerCase()) roles.forEach((r) => f.revogadoDe.add(r));
    return true;
  }
  // GRANT / REVOKE em tabela
  if ((m = txt.match(new RegExp(`^(grant|revoke)\\s+([a-z ,]+?)\\s+on\\s+(?:table\\s+)?(${RE_IDENT}(?:\\s*,\\s*${RE_IDENT})*)\\s+(?:to|from)\\s+(.+)$`, "i")))) {
    const verbo = m[1].toLowerCase();
    const privs = m[2].toLowerCase().split(",").map((s) => s.trim());
    const roles = m[4].split(",").map((r) => r.trim().replace(/^"|"$/g, "").toLowerCase());
    for (const alvo of m[3].split(",")) {
      const tb = tabela(estado, identificador(alvo.trim()), org);
      for (const r of roles) {
        const mapa = verbo === "grant" ? tb.grants : tb.revokes;
        if (!mapa.has(r)) mapa.set(r, new Set());
        privs.forEach((p) => mapa.get(r).add(p.replace(/\s+privileges/, "")));
        if (verbo === "revoke") tb.grants.delete(r);
      }
    }
    return true;
  }
  if ((m = txt.match(/^(grant|revoke)\s+([a-z ,]+?)\s+on\s+all\s+tables\s+in\s+schema\s+(\w+)\s+(?:to|from)\s+(.+)$/i))) {
    estado.grantsSchema.push({ verbo: m[1].toLowerCase(), schema: m[3].toLowerCase(), roles: m[4].split(",").map((r) => r.trim().toLowerCase()), origem: org });
    return true;
  }
  // CREATE VIEW
  if ((m = txt.match(new RegExp(`^create\\s+(?:or\\s+replace\\s+)?(?:temp(?:orary)?\\s+)?(?:recursive\\s+)?view\\s+(${RE_IDENT})`, "i")))) {
    const id = identificador(m[1]);
    const cabeca = txt.slice(0, txt.search(/\bas\s+select\b/i) >= 0 ? txt.search(/\bas\s+select\b/i) : txt.length);
    estado.views.set(chave(id), {
      schema: id.schema, nome: id.nome,
      invoker: /security_invoker\s*=?\s*(?:true|on|'true'|'on')/i.test(cabeca),
      leAuthUsers: /\bauth\s*\.\s*users\b/i.test(txt),
      origem: org,
    });
    return true;
  }
  if ((m = txt.match(new RegExp(`^alter\\s+view\\s+(?:if\\s+exists\\s+)?(${RE_IDENT})\\s+set\\s*\\(([^)]*)\\)`, "i")))) {
    const v = estado.views.get(chave(identificador(m[1])));
    if (v && /security_invoker\s*=\s*(?:true|on|'true'|'on')/i.test(m[2])) v.invoker = true;
    if (v && /security_invoker\s*=\s*(?:false|off)/i.test(m[2])) v.invoker = false;
    return true;
  }
  if ((m = txt.match(new RegExp(`^drop\\s+view\\s+(?:if\\s+exists\\s+)?(${RE_IDENT})`, "i")))) {
    estado.views.delete(chave(identificador(m[1])));
    return true;
  }
  return false;
}

// ─────────────────────────── arquivos ───────────────────────────

const PASTAS_DE_MIGRACAO = ["supabase/migrations", "migrations", "migracoes", "db/migrate", "database/migrations",
  "prisma/migrations", "drizzle", "sql/migrations", "src/migrations", "sql", "db", "supabase"];

/** Lista os .sql de um sistema, na ordem em que o banco os aplica. */
function acharSql(alvo) {
  const abs = path.resolve(alvo);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return /\.sql$/i.test(abs) ? [abs] : [];
  const lista = (pasta) => {
    const out = [];
    const andar = (p, prof) => {
      if (prof > 3) return;
      for (const f of fs.readdirSync(p).sort()) {
        if (f === "node_modules" || f.startsWith(".")) continue;
        const full = path.join(p, f);
        const st = fs.statSync(full);
        if (st.isDirectory()) andar(full, prof + 1);
        else if (/\.sql$/i.test(f) && !/\.(down|desfazer|rollback|undo)\.sql$/i.test(f)) out.push(full);
      }
    };
    andar(pasta, 0);
    return out;
  };
  const direto = fs.readdirSync(abs).filter((f) => /\.sql$/i.test(f));
  if (direto.length) return lista(abs);
  for (const p of PASTAS_DE_MIGRACAO) {
    const full = path.join(abs, p);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      const achados = lista(full);
      if (achados.length) return achados;
    }
  }
  return lista(abs);
}

/** Lê os arquivos na ordem e monta o estado final do banco. */
function analisarArquivos(arquivos, raiz) {
  const estado = novoEstado();
  let total = 0;
  for (const arq of arquivos) {
    const rel = raiz ? path.relative(raiz, arq) || path.basename(arq) : arq;
    const sql = fs.readFileSync(arq, "utf8");
    for (const inst of instrucoes(sql)) { total++; aplicar(estado, inst, rel); }
  }
  estado.instrucoes = total;
  return estado;
}

function analisarSql(sql, origem = "sql") {
  const estado = novoEstado();
  for (const inst of instrucoes(sql)) aplicar(estado, inst, origem);
  return estado;
}

// ─────────────────────────── auditoria ───────────────────────────

const NIVEIS = { CRÍTICO: 0, ALTO: 1, MÉDIO: 2, AVISO: 3 };
const OWASP = { acesso: "A01:2025 Broken Access Control", config: "A02:2025 Security Misconfiguration" };
const ehVerdade = (e) => e !== null && e !== undefined && /^\(?\s*(true|1\s*=\s*1)\s*\)?$/i.test(e);
const citaUsuario = (e) => /auth\s*\.\s*(uid|jwt|role)\s*\(|current_setting|session_user|current_user|\bselect\b/i.test(e || "");
const nomeSql = (t) => `${t.schema}.${/^[a-z_][a-z0-9_]*$/.test(t.nome) ? t.nome : `"${t.nome}"`}`;

function anonTemGrant(tb, estado, plataforma) {
  if (tb.revokes.get("anon") && [...tb.revokes.get("anon")].some((p) => /^(all|select)$/.test(p))) return false;
  if (tb.grants.has("anon") || tb.grants.has("public")) return true;
  const doSchema = estado.grantsSchema.filter((g) => g.schema === tb.schema && g.roles.some((r) => r === "anon" || r === "public"));
  if (doSchema.length) return doSchema[doSchema.length - 1].verbo === "grant";
  return plataforma === "supabase" && tb.schema === "public";
}

function auditar(estado, opcoes = {}) {
  const publicas = new Set((opcoes.publico || []).map((s) => s.trim().toLowerCase()).filter(Boolean));
  const plataforma = opcoes.plataforma || "supabase";
  const achados = [];
  const semForce = [];
  const add = (a) => achados.push(a);

  for (const tb of estado.tabelas.values()) {
    if (SCHEMAS_INTERNOS.has(tb.schema)) continue;
    const exposta = tb.schema === "public";
    const sensivel = RE_SENSIVEL.test(tb.nome);
    const publica = publicas.has(tb.nome.toLowerCase()) || RE_PUBLICO_POR_NATUREZA.test(tb.nome);
    const semSub = (c) => c.toLowerCase().replace(/_/g, "");
    let donoBruto = null;
    for (const d of COLUNAS_DE_DONO) { const c = tb.colunas.find((c) => semSub(c) === semSub(d)); if (c) { donoBruto = c; break; } }
    const colDono = donoBruto ? (/^[a-z_][a-z0-9_]*$/.test(donoBruto) ? donoBruto : `"${donoBruto}"`) : null;
    const base = { tabela: nomeSql(tb), arquivo: tb.origem.arquivo, linha: tb.origem.linha, colDono, sensivel, publica };
    const grantAnon = anonTemGrant(tb, estado, plataforma);

    if (!tb.rls) {
      if (grantAnon) {
        add({ ...base, codigo: "RLS-01", nivel: sensivel ? "CRÍTICO" : exposta ? "CRÍTICO" : "ALTO",
          titulo: `${nomeSql(tb)} sem RLS: qualquer pessoa com a chave pública lê e escreve a tabela inteira`,
          detalhe: tb.desligadoEm
            ? `o RLS foi desligado em ${tb.desligadoEm.arquivo}:${tb.desligadoEm.linha} e não voltou`
            : exposta
              ? `a tabela está no schema public, que a API expõe, e ${plataforma === "supabase" ? "no Supabase o papel anon já nasce com GRANT em tudo que entra no public" : "existe GRANT pro papel anônimo"}`
              : `schema ${tb.schema} não é exposto por padrão; conferir nas configurações da API [a confirmar]`,
          owasp: OWASP.acesso, lint: "0013_rls_disabled_in_public",
          prova: `${tb.origem.arquivo}:${tb.origem.linha} cria a tabela; nenhum \`enable row level security\` depois disso` });
        if (tb.politicas.length) {
          base.politicasExistentes = tb.politicas.map((p) => p.nome);
          achados[achados.length - 1].politicasExistentes = base.politicasExistentes;
          add({ ...base, codigo: "RLS-02", nivel: "CRÍTICO",
          titulo: `${nomeSql(tb)} tem ${tb.politicas.length} política(s) escrita(s), mas o RLS está desligado: nenhuma vale`,
          detalhe: "política só funciona com o RLS ligado; sem isso é decoração", owasp: OWASP.acesso, lint: "0007_policy_exists_rls_disabled",
          prova: tb.politicas.map((p) => `${p.origem.arquivo}:${p.origem.linha} create policy "${p.nome}"`).join("; ") });
        }
      } else {
        add({ ...base, codigo: "RLS-01", nivel: "MÉDIO",
          titulo: `${nomeSql(tb)} sem RLS (o papel anônimo não tem GRANT, então depende do papel que a API usa)`,
          detalhe: "sem RLS, qualquer papel com GRANT lê tudo; confira quem conecta nessa tabela",
          owasp: OWASP.acesso, lint: "0013_rls_disabled_in_public", prova: `${tb.origem.arquivo}:${tb.origem.linha}` });
      }
      if (!tb.politicas.length) continue;
      // com política escrita, ela é auditada também: é o que vai valer quando o RLS ligar
    }

    if (!tb.politicas.length) {
      add({ ...base, codigo: "RLS-03", nivel: "AVISO",
        titulo: `${nomeSql(tb)} tem RLS ligado e nenhuma política: ninguém lê nem escreve pela API (o app quebra em silêncio, mas não vaza)`,
        detalhe: "consulta devolve lista vazia sem erro; se o app precisa dessa tabela, falta a política", owasp: OWASP.config, lint: "0008_rls_enabled_no_policy",
        prova: `${tb.origem.arquivo}:${tb.origem.linha}` });
      continue;
    }

    for (const pol of tb.politicas) {
      const escrita = pol.cmd !== "SELECT";
      const paraAnon = pol.roles.includes("public") || pol.roles.includes("anon");
      const pbase = { ...base, politica: pol.nome, cmd: pol.cmd, roles: pol.roles.join(", "), arquivo: pol.origem.arquivo, linha: pol.origem.linha, sqlOriginal: pol.sql };

      if (ehVerdade(pol.using) || ehVerdade(pol.withCheck)) {
        // Colunas que desmentem o "é pública de propósito" do dono.
        const vaza = publica ? tb.colunas.filter((c) => RE_COLUNA_QUE_NAO_E_PUBLICA.test(c)) : [];
        let nivel = "CRÍTICO";
        if (!escrita && publica) nivel = vaza.length ? "ALTO" : "AVISO";
        else if (!escrita && !paraAnon && !sensivel) nivel = "ALTO";
        const oQue = pol.cmd === "ALL" ? "ler, inserir, alterar e apagar" : pol.cmd === "SELECT" ? "ler" : pol.cmd === "INSERT" ? "inserir" : pol.cmd === "UPDATE" ? "alterar" : "apagar";
        const faz = pol.cmd === "ALL" ? "lê, insere, altera e apaga" : pol.cmd === "SELECT" ? "lê" : pol.cmd === "INSERT" ? "insere" : pol.cmd === "UPDATE" ? "altera" : "apaga";
        const quem = paraAnon ? "qualquer pessoa, logada ou não," : pol.roles.join(", ");
        add({ ...pbase, codigo: "RLS-04", nivel,
          titulo: `política "${pol.nome}" em ${nomeSql(tb)} deixa ${quem} ${oQue} qualquer linha, com \`${ehVerdade(pol.using) ? "using (true)" : "with check (true)"}\``,
          detalhe: !escrita && publica
            ? vaza.length
              ? `a tabela foi tratada como pública, mas tem coluna que não é pra cliente ver: ${vaza.join(", ")}. Ou a coluna sai da tabela (ou de uma view), ou a leitura deixa de ser pública`
              : "aceitável se a tabela é pública de propósito (cardápio, produtos); as colunas expostas são " + (tb.colunas.join(", ") || "[a confirmar: o CREATE TABLE não veio no SQL lido]")
            : escrita ? `qualquer um ${faz} linha de qualquer outro usuário` : "qualquer um lê todas as linhas",
          colunasExpostas: publica ? tb.colunas : undefined, colunasQueNaoSaoPublicas: vaza.length ? vaza : undefined,
          owasp: OWASP.acesso,
          // 0024_permissive_rls_policy não acusa SELECT com using (true): o próprio lint
          // exclui o caso, porque leitura pública às vezes é intencional. Então o painel
          // fica calado aqui, e é exatamente por isso que esta linha do laudo existe.
          lint: escrita ? "0024_permissive_rls_policy" : null,
          painelCalado: !escrita || undefined,
          prova: pol.sql });
        continue;
      }
      if ((pol.cmd === "UPDATE" || pol.cmd === "ALL") && pol.withCheck === null && escrita) {
        add({ ...pbase, codigo: "RLS-05", nivel: "MÉDIO",
          titulo: `política "${pol.nome}" (${pol.cmd}) em ${nomeSql(tb)} não tem WITH CHECK: o Postgres reaproveita o USING pra escrita`,
          detalhe: "funciona quando o USING já amarra a linha ao dono; se o USING é frouxo, o usuário move a linha pra outro dono. Escrever o WITH CHECK explícito tira a dúvida",
          owasp: OWASP.acesso, lint: null, painelCalado: true, prova: pol.sql });
      }
      if (pol.cmd === "INSERT" && pol.withCheck !== null && !citaUsuario(pol.withCheck)) {
        add({ ...pbase, codigo: "RLS-05", nivel: "ALTO",
          titulo: `política "${pol.nome}" (INSERT) em ${nomeSql(tb)} tem WITH CHECK que não olha quem está logado`,
          detalhe: `\`with check (${pol.withCheck})\` aceita linha com o user_id de outra pessoa`, owasp: OWASP.acesso, lint: null, painelCalado: true, prova: pol.sql });
      }
      if (/auth\s*\.\s*jwt\s*\(\s*\)\s*(->>?|#>>?)\s*'user_metadata'|raw_user_meta_data/i.test(`${pol.using || ""} ${pol.withCheck || ""}`)) {
        add({ ...pbase, codigo: "RLS-07", nivel: "ALTO",
          titulo: `política "${pol.nome}" em ${nomeSql(tb)} decide pelo user_metadata, que o próprio usuário edita`,
          detalhe: "qualquer usuário grava `{\"role\":\"admin\"}` no próprio metadata pela API de auth e passa; papel tem que vir de app_metadata ou de tabela própria",
          owasp: OWASP.acesso, lint: "0015_rls_references_user_metadata", prova: pol.sql });
      }
      if (pol.roles.includes("public") && citaUsuario(pol.using || pol.withCheck) && !escrita) {
        add({ ...pbase, codigo: "RLS-06", nivel: "AVISO",
          titulo: `política "${pol.nome}" em ${nomeSql(tb)} não tem \`to authenticated\`: roda pra anon também`,
          detalhe: "com auth.uid() nula o anon não vê linha, mas a política executa à toa e a intenção fica implícita; nomear o papel é a recomendação do próprio Supabase",
          owasp: OWASP.config, lint: null, prova: pol.sql });
      }
    }
    if (!tb.force) semForce.push(nomeSql(tb));
  }
  if (semForce.length) {
    // aviso baixo, um só: no Supabase o papel da API não é dono; pesa pra função que roda como dono
    add({ codigo: "RLS-08", nivel: "AVISO", tabela: semForce[0], arquivo: "-", linha: "-",
      titulo: `${semForce.length} tabela(s) com RLS sem FORCE ROW LEVEL SECURITY: ${semForce.join(", ")}`,
      detalhe: "o dono da tabela (postgres) ignora as políticas; afeta função security definer e job que roda como dono, não a API pública",
      owasp: OWASP.config, lint: null, prova: "ausência de `alter table ... force row level security`" });
  }

  for (const f of estado.funcoes.values()) {
    if (!f.definer) continue;
    const nome = `${f.schema}.${f.nome}(${f.assinatura})`;
    const base = { funcao: nome, arquivo: f.origem.arquivo, linha: f.origem.linha };
    if (f.schema === "public" && !f.revogadoDe.has("anon") && !f.revogadoDe.has("public")) {
      add({ ...base, codigo: "FN-01", nivel: "ALTO",
        titulo: `função ${nome} é SECURITY DEFINER e qualquer pessoa chama por /rest/v1/rpc/${f.nome}`,
        detalhe: "roda como dona do banco, ignorando toda política; se ela lê ou grava tabela a partir de argumento, é uma porta pra fora do RLS",
        owasp: OWASP.acesso, lint: "0028_anon_security_definer_function_executable", prova: `${f.origem.arquivo}:${f.origem.linha}` });
    } else if (f.schema === "public" && !f.revogadoDe.has("authenticated")) {
      add({ ...base, codigo: "FN-03", nivel: "MÉDIO",
        titulo: `função ${nome} é SECURITY DEFINER e qualquer usuário logado chama por rpc`,
        detalhe: "revogada do anon, mas não do authenticated: basta criar conta", owasp: OWASP.acesso, lint: "0029_authenticated_security_definer_function_executable", prova: `${f.origem.arquivo}:${f.origem.linha}` });
    }
    if (!f.searchPath) {
      add({ ...base, codigo: "FN-02", nivel: "ALTO",
        titulo: `função ${nome} é SECURITY DEFINER sem \`set search_path\``,
        detalhe: "quem cria uma função ou tabela com nome igual num schema que vem antes no caminho faz a função executar o código dele com poder de dona",
        owasp: OWASP.config, lint: "0011_function_search_path_mutable", prova: `${f.origem.arquivo}:${f.origem.linha}` });
    }
  }

  for (const v of estado.views.values()) {
    if (v.schema !== "public") continue;
    const base = { view: `${v.schema}.${v.nome}`, arquivo: v.origem.arquivo, linha: v.origem.linha };
    if (v.leAuthUsers) add({ ...base, codigo: "VW-01", nivel: "CRÍTICO",
      titulo: `view ${v.schema}.${v.nome} expõe auth.users pela API`,
      detalhe: "e-mail, telefone e metadata de todo usuário cadastrado, sem RLS", owasp: OWASP.acesso, lint: "0002_auth_users_exposed", prova: `${v.origem.arquivo}:${v.origem.linha}` });
    else if (!v.invoker) add({ ...base, codigo: "VW-02", nivel: "ALTO",
      titulo: `view ${v.schema}.${v.nome} sem \`security_invoker = true\`: roda como dona e pula o RLS das tabelas de origem`,
      detalhe: "quem consulta a view vê o que a dona vê, mesmo com as tabelas protegidas", owasp: OWASP.acesso, lint: "0010_security_definer_view", prova: `${v.origem.arquivo}:${v.origem.linha}` });
  }

  achados.sort((a, b) => NIVEIS[a.nivel] - NIVEIS[b.nivel] || (a.tabela || a.funcao || a.view || "").localeCompare(b.tabela || b.funcao || b.view || ""));
  return achados;
}

// ─────────────────────────── migration ───────────────────────────

function politicasDeDono(tabela, col, prefixo) {
  const dono = `(select auth.uid()) = ${col}`;
  return [
    `create policy "${prefixo}: dono le" on ${tabela} for select to authenticated using (${dono});`,
    `create policy "${prefixo}: dono insere" on ${tabela} for insert to authenticated with check (${dono});`,
    `create policy "${prefixo}: dono altera" on ${tabela} for update to authenticated using (${dono}) with check (${dono});`,
    `create policy "${prefixo}: dono apaga" on ${tabela} for delete to authenticated using (${dono});`,
  ];
}

/** Escreve a migration de correção, com a seção de desfazer no fim. */
function gerarMigration(achados, opcoes = {}) {
  const data = opcoes.data || br.iso(new Date());
  const sobe = [], desce = [];
  const vistos = new Set();
  const prefixo = (t) => t.replace(/^public\./, "").replace(/"/g, "");

  for (const a of achados) {
    if (a.codigo === "RLS-01" && !vistos.has("rls:" + a.tabela)) {
      vistos.add("rls:" + a.tabela);
      sobe.push(`-- ${a.tabela}: liga o RLS. Sem política, a tabela fecha pra API: as políticas abaixo entram junto.`);
      sobe.push(`alter table ${a.tabela} enable row level security;`);
      if (a.politicasExistentes && a.politicasExistentes.length) {
        sobe.push(`-- as políticas já escritas passam a valer: ${a.politicasExistentes.map((n) => '"' + n + '"').join(", ")}. Confira os achados delas no laudo.`);
      } else if (a.colDono) sobe.push(...politicasDeDono(a.tabela, a.colDono, prefixo(a.tabela)));
      else {
        sobe.push(`-- [a confirmar] ${a.tabela} não tem coluna de dono reconhecível (user_id, owner_id, tenant_id...).`);
        sobe.push(`-- Quem pode ler? Se for tabela pública de verdade:`);
        sobe.push(`-- create policy "${prefixo(a.tabela)}: leitura publica" on ${a.tabela} for select to anon, authenticated using (true);`);
        sobe.push(`-- Se for só de quem está logado, troque a condição pela coluna que liga a linha ao usuário.`);
      }
      sobe.push("");
      desce.push(`alter table ${a.tabela} disable row level security;`);
      if (a.colDono && !(a.politicasExistentes && a.politicasExistentes.length)) desce.push(...["le", "insere", "altera", "apaga"].map((v) => `drop policy if exists "${prefixo(a.tabela)}: dono ${v}" on ${a.tabela};`));
    }
    if (a.codigo === "RLS-04" && a.nivel !== "AVISO" && !vistos.has("pol:" + a.tabela + a.politica)) {
      vistos.add("pol:" + a.tabela + a.politica);
      if (a.colunasQueNaoSaoPublicas && a.cmd === "SELECT") {
        // Tabela que o dono declarou pública e que tem coluna de dentro de casa. Derrubar a
        // política fecha o catálogo e o site quebra; a decisão é dele, então sai comentada.
        sobe.push(`-- [a confirmar] ${a.tabela} é lida por qualquer pessoa e tem coluna que não é pra cliente ver: ${a.colunasQueNaoSaoPublicas.join(", ")}.`);
        sobe.push(`-- Dois caminhos, e o app quebra se você escolher errado:`);
        sobe.push(`-- 1) a coluna sai da vista: crie uma view só com as colunas públicas e leia a view no front;`);
        sobe.push(`-- 2) a leitura deixa de ser pública: troque a política pela condição de quem pode ver.`);
        sobe.push(`-- Enquanto não decidir, NÃO derrube a política: ${a.tabela} fecharia e a página que lista ${prefixo(a.tabela)} pararia.`);
        sobe.push("");
        continue;
      }
      sobe.push(`-- ${a.tabela}: a política "${a.politica}" liberava ${a.cmd} com condição sempre verdadeira.`);
      sobe.push(`${a.colDono ? "" : "-- "}drop policy if exists "${a.politica}" on ${a.tabela};`);
      if (a.colDono) {
        const dono = `(select auth.uid()) = ${a.colDono}`;
        const n = `${prefixo(a.tabela)}: ${a.politica}`.slice(0, 60);
        if (a.cmd === "SELECT") sobe.push(`create policy "${n}" on ${a.tabela} for select to authenticated using (${dono});`);
        else if (a.cmd === "INSERT") sobe.push(`create policy "${n}" on ${a.tabela} for insert to authenticated with check (${dono});`);
        else if (a.cmd === "DELETE") sobe.push(`create policy "${n}" on ${a.tabela} for delete to authenticated using (${dono});`);
        else sobe.push(`create policy "${n}" on ${a.tabela} for ${a.cmd === "ALL" ? "all" : "update"} to authenticated using (${dono}) with check (${dono});`);
        desce.push(`drop policy if exists "${n}" on ${a.tabela};`);
      } else {
        sobe.push(`-- [a confirmar] sem coluna de dono reconhecível em ${a.tabela}: quem pode ${a.cmd === "SELECT" ? "ler" : "escrever"} aqui?`);
        sobe.push(`-- O drop acima está comentado de propósito: derrubar a política sem pôr outra no lugar fecha a tabela e o app para.`);
        sobe.push(`-- Escreva a política nova, descomente o drop junto com ela, e só então aplique.`);
      }
      sobe.push("");
      if (a.colDono) desce.push(a.sqlOriginal.replace(/\s+/g, " ").trim() + ";");
    }
    if (a.codigo === "RLS-07" && !vistos.has("meta:" + a.tabela + a.politica)) {
      vistos.add("meta:" + a.tabela + a.politica);
      sobe.push(`-- [a confirmar] ${a.tabela}: a política "${a.politica}" decide pelo user_metadata, que o próprio usuário edita.`);
      sobe.push(`-- Onde mora o papel de verdade? Se numa tabela de perfis, a condição vira algo assim:`);
      sobe.push(`-- drop policy if exists "${a.politica}" on ${a.tabela};`);
      sobe.push(`-- create policy "${a.politica}" on ${a.tabela} for ${a.cmd === "ALL" ? "all" : a.cmd.toLowerCase()} to authenticated`);
      sobe.push(`--   using (exists (select 1 from public.perfis p where p.user_id = (select auth.uid()) and p.papel = 'admin'));`);
      sobe.push("");
    }
    if (a.codigo === "FN-02" && !vistos.has("sp:" + a.funcao)) {
      vistos.add("sp:" + a.funcao);
      sobe.push(`alter function ${a.funcao} set search_path = '';`);
      sobe.push("");
      desce.push(`alter function ${a.funcao} reset search_path;`);
    }
    if (a.codigo === "FN-01" && a.nivel === "ALTO" && !vistos.has("rv:" + a.funcao)) {
      vistos.add("rv:" + a.funcao);
      sobe.push(`-- ${a.funcao}: só quem precisa chama. Se o app chama pelo front logado, troque por \`from anon, public\`.`);
      sobe.push(`revoke execute on function ${a.funcao} from anon, authenticated, public;`);
      sobe.push("");
      desce.push(`grant execute on function ${a.funcao} to anon, authenticated, public;`);
    }
    if (a.codigo === "VW-01" && !vistos.has("vw:" + a.view)) {
      vistos.add("vw:" + a.view);
      sobe.push(`-- ${a.view} lê auth.users. Tira da API agora; depois decida se a view precisa existir.`);
      sobe.push(`revoke all on ${a.view} from anon, authenticated, public;`);
      sobe.push("");
      desce.push(`grant select on ${a.view} to anon, authenticated;`);
    }
    if (a.codigo === "VW-02" && !vistos.has("vw:" + a.view)) {
      vistos.add("vw:" + a.view);
      sobe.push(`alter view ${a.view} set (security_invoker = true);`);
      sobe.push("");
      desce.push(`alter view ${a.view} set (security_invoker = false);`);
    }
  }

  const cab = [
    `-- Blindagem gerada pelo Contex OS em ${data} (scripts/auditar-rls.js).`,
    `-- Leia antes de aplicar: cada bloco fecha um achado do laudo. O que está`,
    `-- marcado [a confirmar] precisa de uma decisão sua e está comentado.`,
    `-- Aplicar em produção só depois de rodar num projeto de teste.`,
    ``,
    ``,
  ];
  if (!sobe.length) return cab.join("\n") + "-- Nada a corrigir por migration nesta auditoria.\n\n-- desfazer: nada a desfazer\n";
  return cab.join("\n") + sobe.join("\n") + "\n\n-- desfazer: volta ao estado anterior\n" + desce.map((l) => "-- " + l).join("\n") + "\n";
}

// ─────────────────────────── ao vivo ───────────────────────────

/** Leitura e (opcionalmente) escrita anônima em cada tabela, por fetch nativo. */
async function aoVivo({ url, chave: apikey, tabelas, escrever }) {
  if (typeof fetch !== "function") throw new Error("este teste precisa de Node 18 ou mais novo (fetch nativo)");
  const base = url.replace(/\/+$/, "");
  const cab = { apikey, Authorization: `Bearer ${apikey}`, "Content-Type": "application/json" };
  const resultado = { url: base, chave: descreverChave(apikey), expostas: null, tabelas: [] };

  // 1. o que a API lista pra essa chave
  try {
    const r = await fetch(`${base}/rest/v1/`, { headers: cab });
    if (r.ok) {
      const spec = await r.json();
      resultado.expostas = Object.keys(spec.definitions || {}).sort();
    } else resultado.expostas = `HTTP ${r.status}`;
  } catch (e) { resultado.expostas = `erro: ${e.message}`; }

  const alvo = tabelas && tabelas.length ? tabelas : Array.isArray(resultado.expostas) ? resultado.expostas : [];
  for (const t of alvo) {
    const item = { tabela: t, leitura: null, escrita: null };
    // 2. leitura
    try {
      const r = await fetch(`${base}/rest/v1/${encodeURIComponent(t)}?select=*&limit=1`, { headers: cab });
      const corpo = await r.text();
      let json = null; try { json = JSON.parse(corpo); } catch {}
      if (r.status === 200 && Array.isArray(json)) {
        item.leitura = json.length
          ? { estado: "ABERTA", http: 200, colunas: Object.keys(json[0]), detalhe: `devolveu 1 linha com ${Object.keys(json[0]).length} colunas` }
          : { estado: "VAZIA", http: 200, detalhe: "200 com lista vazia: tabela vazia ou política filtrou tudo" };
      } else if (r.status === 401 || r.status === 403 || (json && json.code === "42501")) {
        item.leitura = { estado: "BLOQUEADA", http: r.status, detalhe: (json && json.message) || corpo.slice(0, 120) };
      } else if (r.status === 404) {
        item.leitura = { estado: "NAO_EXPOSTA", http: 404, detalhe: (json && json.message) || "não existe ou não está no schema exposto" };
      } else item.leitura = { estado: "OUTRO", http: r.status, detalhe: corpo.slice(0, 160) };
    } catch (e) { item.leitura = { estado: "ERRO", detalhe: e.message }; }

    // 3. escrita (opcional): POST {} com pedido de rollback. Se o servidor não honrar o
    //    rollback e a tabela aceitar tudo por padrão, fica uma linha vazia: por isso é opt-in.
    if (escrever && item.leitura.estado !== "NAO_EXPOSTA") {
      try {
        const r = await fetch(`${base}/rest/v1/${encodeURIComponent(t)}`, {
          method: "POST", headers: { ...cab, Prefer: "tx=rollback, return=representation" }, body: "{}",
        });
        const corpo = await r.text();
        let json = null; try { json = JSON.parse(corpo); } catch {}
        if (r.status === 201 || r.status === 200) {
          const linha = Array.isArray(json) && json[0] ? json[0] : null;
          // Guarda só o nome das colunas e o id. O valor devolvido pode ter dado de
          // cliente (default, trigger, coluna gerada) e o JSON do laudo não é lugar pra isso.
          item.escrita = { estado: "ABERTA", http: r.status, detalhe: "inseriu uma linha", colunas: linha ? Object.keys(linha) : null, id: linha && linha.id !== undefined ? String(linha.id) : null };
          // tenta limpar pelo id, se houver e se a API aceitar
          if (linha && linha.id !== undefined) {
            const d = await fetch(`${base}/rest/v1/${encodeURIComponent(t)}?id=eq.${encodeURIComponent(linha.id)}`, { method: "DELETE", headers: cab });
            item.escrita.limpeza = d.ok ? `DELETE aceito (HTTP ${d.status}): se a linha id=${linha.id} chegou a gravar, foi apagada; e o anon também apaga, o que é mais um achado` : `não consegui apagar (HTTP ${d.status}); apague a linha id=${linha.id} à mão`;
          } else item.escrita.limpeza = "sem id na resposta: procure a linha mais recente e apague à mão (se o rollback foi honrado, não há nada)";
        } else if (json && json.code === "42501") {
          item.escrita = { estado: "BLOQUEADA", http: r.status, detalhe: json.message };
        } else if (json && /^(23502|23503|23514|23505)$/.test(json.code || "")) {
          item.escrita = { estado: "PASSOU_NA_PERMISSAO", http: r.status, detalhe: `a escrita passou pela política e parou numa regra da tabela (${json.code}: ${json.message}); com um payload completo, grava` };
        } else item.escrita = { estado: "OUTRO", http: r.status, detalhe: corpo.slice(0, 160) };
      } catch (e) { item.escrita = { estado: "ERRO", detalhe: e.message }; }
    }
    resultado.tabelas.push(item);
  }
  return resultado;
}

/** Diz que tipo de chave é, sem imprimir a chave. */
function descreverChave(k) {
  if (!k) return "nenhuma";
  if (/^sb_publishable_/.test(k)) return "sb_publishable_ (pública, ok)";
  if (/^sb_secret_/.test(k)) return "sb_secret_ (SECRETA: não use aqui)";
  const p = k.split(".");
  if (p.length === 3 && p[0].startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(p[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      return `JWT role=${payload.role || "?"} ref=${payload.ref || "?"}`;
    } catch { return "JWT (não decodificado)"; }
  }
  return "formato desconhecido";
}

// ─────────────────────────── saída ───────────────────────────

const COR = process.stdout.isTTY ? { v: "\x1b[31m", a: "\x1b[33m", ok: "\x1b[32m", z: "\x1b[0m", d: "\x1b[2m" } : { v: "", a: "", ok: "", z: "", d: "" };

function imprimir(estado, achados, arquivos) {
  console.log(`\nAUDITORIA DE RLS`);
  console.log(`${COR.d}${arquivos.length} arquivo(s) SQL, ${estado.instrucoes || 0} instruções, ${estado.tabelas.size} tabela(s), ${estado.funcoes.size} função(ões), ${estado.views.size} view(s)${COR.z}`);
  const resumo = { CRÍTICO: 0, ALTO: 0, MÉDIO: 0, AVISO: 0 };
  for (const a of achados) resumo[a.nivel]++;
  console.log(`${COR.v}${resumo.CRÍTICO} crítico${COR.z} · ${COR.a}${resumo.ALTO} alto${COR.z} · ${resumo.MÉDIO} médio · ${resumo.AVISO} aviso\n`);
  for (const a of achados) {
    const cor = a.nivel === "CRÍTICO" ? COR.v : a.nivel === "ALTO" ? COR.a : COR.d;
    console.log(`${cor}[${a.nivel}] ${a.codigo}${COR.z} ${a.titulo}`);
    console.log(`   ${COR.d}${a.arquivo}:${a.linha} · ${a.owasp}${a.lint ? " · lint " + a.lint : ""}${COR.z}`);
    if (a.detalhe) console.log(`   ${a.detalhe}`);
  }
  if (!achados.length) console.log(`${COR.ok}✔ nenhum achado: toda tabela com RLS e política com condição de dono${COR.z}`);
  console.log();
}

function imprimirAoVivo(r) {
  console.log(`AO VIVO: ${r.url} (chave: ${r.chave})`);
  if (Array.isArray(r.expostas)) console.log(`${COR.d}a API lista ${r.expostas.length} tabela(s)/view(s) pra essa chave: ${r.expostas.join(", ") || "nenhuma"}${COR.z}`);
  else console.log(`${COR.d}listagem da API: ${r.expostas}${COR.z}`);
  for (const t of r.tabelas) {
    const l = t.leitura, e = t.escrita;
    const corL = l.estado === "ABERTA" ? COR.v : l.estado === "BLOQUEADA" || l.estado === "NAO_EXPOSTA" ? COR.ok : COR.a;
    console.log(`  ${t.tabela}: leitura ${corL}${l.estado}${COR.z} (${l.http || "-"}) ${COR.d}${l.detalhe || ""}${COR.z}`);
    if (e) {
      const corE = e.estado === "ABERTA" || e.estado === "PASSOU_NA_PERMISSAO" ? COR.v : e.estado === "BLOQUEADA" ? COR.ok : COR.a;
      console.log(`      escrita ${corE}${e.estado}${COR.z} (${e.http || "-"}) ${COR.d}${e.detalhe || ""}${e.limpeza ? " · " + e.limpeza : ""}${COR.z}`);
    }
  }
  console.log();
}

// ─────────────────────────── main ───────────────────────────

function lerArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      if (["escrever", "ajuda", "json"].includes(k)) o[k] = true;
      else o[k] = argv[++i];
    } else o._.push(a);
  }
  return o;
}

async function main() {
  const o = lerArgs(process.argv.slice(2));
  if (o.ajuda || (!o._.length && !o.url)) {
    console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(2, 34).map((l) => l.replace(/^ \*\/?\s?/, "")).join("\n"));
    process.exit(o.ajuda ? 0 : 1);
  }
  let estado = novoEstado(), achados = [], arquivos = [];
  if (o._.length) {
    const alvo = path.resolve(o._[0]);
    if (!fs.existsSync(alvo)) { console.error(`\n✖ não achei ${alvo}\n`); process.exit(1); }
    arquivos = acharSql(alvo);
    if (!arquivos.length) {
      console.error(`\n✖ nenhum .sql em ${alvo}\n  procurei em ${PASTAS_DE_MIGRACAO.slice(0, 6).join(", ")}… Passe a pasta de migrations ou o schema.sql direto.\n`);
      process.exit(1);
    }
    const raiz = fs.statSync(alvo).isDirectory() ? alvo : path.dirname(alvo);
    estado = analisarArquivos(arquivos, raiz);
    if (!estado.tabelas.size) {
      console.error(`\n✖ li ${arquivos.length} arquivo(s) e ${estado.instrucoes} instruções, mas nenhum CREATE TABLE.\n  Se o schema vem de ORM (Prisma sem migrations, Drizzle push), gere o SQL primeiro: \`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql\`\n`);
      process.exit(1);
    }
    achados = auditar(estado, { publico: (o.publico || "").split(","), plataforma: o.plataforma });
    if (!o.json) imprimir(estado, achados, arquivos);
    if (o.migration) {
      fs.mkdirSync(path.dirname(path.resolve(o.migration)), { recursive: true });
      fs.writeFileSync(o.migration, gerarMigration(achados));
      if (!o.json) console.log(`${COR.ok}✔${COR.z} migration de correção: ${o.migration}`);
    }
  }
  let vivo = null;
  if (o.url) {
    if (!o.chave) { console.error("\n✖ --url precisa de --chave (a chave anon / sb_publishable_ do projeto)\n"); process.exit(1); }
    if (/^sb_secret_/.test(o.chave) || /service_role/.test(descreverChave(o.chave))) {
      console.error("\n✖ essa é a chave SECRETA. Ela ignora toda política; o teste só vale com a chave pública (anon / sb_publishable_).\n");
      process.exit(1);
    }
    const tabelas = o.tabelas ? o.tabelas.split(",").map((s) => s.trim()).filter(Boolean)
      : [...estado.tabelas.values()].filter((t) => t.schema === "public").map((t) => t.nome);
    vivo = await aoVivo({ url: o.url, chave: o.chave, tabelas, escrever: !!o.escrever });
    if (!o.json) imprimirAoVivo(vivo);
  }
  if (o.saida) {
    fs.mkdirSync(path.dirname(path.resolve(o.saida)), { recursive: true });
    fs.writeFileSync(o.saida, JSON.stringify({ geradoEm: new Date().toISOString(), arquivos, achados, aoVivo: vivo }, null, 2));
    if (!o.json) console.log(`${COR.ok}✔${COR.z} achados em ${o.saida}`);
  }
  if (o.json) console.log(JSON.stringify({ achados, aoVivo: vivo }, null, 2));
  const grave = achados.some((a) => a.nivel === "CRÍTICO") || (vivo && vivo.tabelas.some((t) => t.leitura.estado === "ABERTA" || (t.escrita && t.escrita.estado !== "BLOQUEADA" && t.escrita.estado !== "ERRO" && t.escrita.estado !== "OUTRO")));
  process.exit(grave ? 2 : 0);
}

module.exports = { instrucoes, identificador, analisarSql, analisarArquivos, acharSql, auditar, gerarMigration, aoVivo, descreverChave, NIVEIS };

if (require.main === module) main().catch((e) => { console.error(`\n✖ ${e.message}\n`); process.exit(1); });
