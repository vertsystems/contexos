#!/usr/bin/env node
/**
 * Contex OS — gerar-imagem.js
 * Gera imagem por IA e salva em arquivo. Funciona com mais de um provedor.
 *
 * Uso:
 *   node contexos/assets/scripts/gerar-imagem.js "PROMPT EM INGLÊS" "conteudo/pasta/foto.png"
 *
 * Opções:
 *   --provedor openai|gemini    (padrão: detecta pela chave que existir no .env)
 *   --formato retrato|quadrado|paisagem   (padrão: retrato, que é o do carrossel)
 *   --modelo <nome>             (padrão: o recomendado do provedor)
 *   --qualidade high|medium|low (só OpenAI)
 *
 * Chaves — basta ter UMA delas no .env da raiz do workspace:
 *   OPENAI_API_KEY=sk-...        → platform.openai.com/api-keys
 *   GEMINI_API_KEY=...           → aistudio.google.com/apikey
 *
 * O script procura o .env na pasta atual e até 3 níveis acima.
 * Node 18 ou mais novo. Sem dependência nenhuma pra instalar.
 */

const fs = require("fs");
const path = require("path");

const PROVEDORES = {
  openai: {
    nome: "OpenAI",
    chave: "OPENAI_API_KEY",
    modeloPadrao: "gpt-image-1",
    onde: "platform.openai.com/api-keys",
    formatos: {
      retrato:  { "gpt-image-1": "1024x1536", "dall-e-3": "1024x1792" },
      quadrado: { "gpt-image-1": "1024x1024", "dall-e-3": "1024x1024" },
      paisagem: { "gpt-image-1": "1536x1024", "dall-e-3": "1792x1024" },
    },
  },
  gemini: {
    nome: "Google Gemini",
    chave: "GEMINI_API_KEY",
    modeloPadrao: "gemini-2.5-flash-image",
    onde: "aistudio.google.com/apikey",
    formatos: { retrato: "3:4", quadrado: "1:1", paisagem: "4:3" },
  },
};

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

/** Lê variáveis do .env (pasta atual e até 3 acima), sem depender de flag do Node. */
function lerEnv() {
  const achadas = {};
  let dir = process.cwd();
  for (let i = 0; i <= 3; i++) {
    const env = path.join(dir, ".env");
    if (fs.existsSync(env)) {
      for (const linha of fs.readFileSync(env, "utf8").split("\n")) {
        const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
        if (m) {
          const valor = m[2].trim().replace(/^["']|["']$/g, "");
          if (valor && !achadas[m[1]]) achadas[m[1]] = valor;
        }
      }
    }
    const pai = path.dirname(dir);
    if (pai === dir) break;
    dir = pai;
  }
  return achadas;
}

function lerArgs(argv) {
  const posicionais = [];
  const opts = { formato: "retrato", qualidade: "high", provedor: null, modelo: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (["--formato", "--modelo", "--qualidade", "--provedor"].includes(a)) {
      opts[a.slice(2)] = (argv[++i] || "").trim();
    } else if (a.startsWith("--")) {
      morrer(`Opção desconhecida: ${a}`, "Válidas: --provedor, --formato, --modelo, --qualidade");
    } else {
      posicionais.push(a);
    }
  }
  return { posicionais, opts };
}

async function viaOpenAI({ chave, prompt, opts }) {
  const cfg = PROVEDORES.openai;
  const modelo = opts.modelo || cfg.modeloPadrao;
  const size = cfg.formatos[opts.formato]?.[modelo];
  if (!size) morrer(`Formato "${opts.formato}" não existe no modelo ${modelo}.`, "Use: retrato, quadrado ou paisagem.");

  const corpo = { model: modelo, prompt, n: 1, size };
  if (modelo === "gpt-image-1") {
    corpo.quality = opts.qualidade;
  } else {
    corpo.quality = opts.qualidade === "high" ? "hd" : "standard";
    corpo.response_format = "b64_json";
  }

  console.log(`→ Gerando na OpenAI (${modelo}, ${size})...`);
  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
    body: JSON.stringify(corpo),
  });

  const texto = await resp.text();
  if (!resp.ok) {
    let detalhe = texto.slice(0, 400);
    try { detalhe = JSON.parse(texto)?.error?.message || detalhe; } catch {}
    const dicas = {
      401: "Chave inválida ou revogada. Gere outra em platform.openai.com/api-keys e atualize o .env.",
      403: "Sua conta não tem acesso a esse modelo. Tente: --modelo dall-e-3",
      429: "Sem crédito ou limite atingido. Confira em platform.openai.com/usage — a API é paga e separada do ChatGPT Plus.",
      400: "A API recusou o pedido. Quase sempre é o prompt: evite pedir pessoa real, marca, logo ou personagem protegido.",
    };
    morrer(`OpenAI respondeu ${resp.status}: ${detalhe}`, dicas[resp.status] || "Tente de novo em alguns minutos.");
  }

  const dados = JSON.parse(texto);
  const b64 = dados?.data?.[0]?.b64_json;
  const url = dados?.data?.[0]?.url;
  if (b64) return { buffer: Buffer.from(b64, "base64"), info: size };
  if (url) {
    const img = await fetch(url);
    if (!img.ok) morrer(`Não consegui baixar a imagem (${img.status}).`);
    return { buffer: Buffer.from(await img.arrayBuffer()), info: size };
  }
  morrer("A OpenAI não devolveu imagem.", "Tente de novo; se repetir, mude o prompt.");
}

async function viaGemini({ chave, prompt, opts }) {
  const cfg = PROVEDORES.gemini;
  const modelo = opts.modelo || cfg.modeloPadrao;
  const proporcao = cfg.formatos[opts.formato];
  if (!proporcao) morrer(`Formato inválido: ${opts.formato}`, "Use: retrato, quadrado ou paisagem.");

  console.log(`→ Gerando no Gemini (${modelo}, ${proporcao})...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: proporcao } },
    }),
  });

  const texto = await resp.text();
  if (!resp.ok) {
    let detalhe = texto.slice(0, 400);
    try { detalhe = JSON.parse(texto)?.error?.message || detalhe; } catch {}
    const dicas = {
      400: "Pedido recusado. Pode ser o prompt (pessoa real, marca, personagem) ou o modelo não aceitar esse formato — tente --formato quadrado.",
      403: "Chave sem permissão pra esse modelo. Confira em aistudio.google.com/apikey se a chave está ativa.",
      404: `Modelo "${modelo}" não encontrado. O nome muda com o tempo — veja os disponíveis em ai.google.dev/gemini-api/docs/image-generation`,
      429: "Limite de uso atingido. O nível gratuito tem cota diária; espere ou ative faturamento no Google AI Studio.",
    };
    // O Gemini devolve 400 tanto pra chave errada quanto pra prompt recusado — separar os dois
    const chaveRuim = /api key not valid|api_key_invalid|invalid api key/i.test(detalhe);
    morrer(
      `Gemini respondeu ${resp.status}: ${detalhe}`,
      chaveRuim
        ? "A chave está errada ou incompleta. Pegue outra em aistudio.google.com/apikey e cole no .env em GEMINI_API_KEY= (sem aspas, sem espaço)."
        : dicas[resp.status] || "Tente de novo em alguns minutos."
    );
  }

  const dados = JSON.parse(texto);
  const partes = dados?.candidates?.[0]?.content?.parts || [];
  const img = partes.find((p) => p.inlineData?.data || p.inline_data?.data);
  if (!img) {
    const txt = partes.find((p) => p.text)?.text;
    morrer(
      "O Gemini respondeu sem imagem.",
      txt ? `Ele devolveu texto: "${txt.slice(0, 200)}"\n  Isso costuma ser recusa por política — reescreva o prompt.`
          : "Tente de novo; se repetir, mude o prompt."
    );
  }
  const b64 = img.inlineData?.data || img.inline_data?.data;
  return { buffer: Buffer.from(b64, "base64"), info: proporcao };
}

async function main() {
  const { posicionais, opts } = lerArgs(process.argv.slice(2));
  const [prompt, saida] = posicionais;

  if (!prompt || !saida) {
    morrer(
      "Faltou o prompt ou o caminho de saída.",
      'Exemplo:\n  node contexos/assets/scripts/gerar-imagem.js "Professional food photography of..." "conteudo/post/foto.png"'
    );
  }
  if (typeof fetch !== "function") {
    morrer("Seu Node é antigo demais.", "Precisa do Node 18 ou mais novo. Veja com: node --version");
  }

  const env = { ...lerEnv(), ...process.env };

  // Qual provedor usar: o escolhido, o configurado no .env, ou o único que tiver chave
  let provedor = opts.provedor || env.IMAGEM_PROVEDOR || null;
  if (provedor && !PROVEDORES[provedor]) {
    morrer(`Provedor desconhecido: ${provedor}`, "Use: openai ou gemini");
  }
  if (!provedor) {
    const comChave = Object.keys(PROVEDORES).filter((p) => env[PROVEDORES[p].chave]);
    if (comChave.length === 1) provedor = comChave[0];
    else if (comChave.length > 1) {
      provedor = "openai";
      console.log(`ℹ Achei chave de mais de um provedor. Usando ${PROVEDORES[provedor].nome}.`);
      console.log(`  Pra fixar outro, ponha IMAGEM_PROVEDOR=gemini no .env, ou use --provedor gemini`);
    }
  }

  if (!provedor) {
    morrer(
      "Nenhuma chave de geração de imagem configurada.",
      "Escolha um dos dois e cole a chave no arquivo .env da raiz do seu negócio:\n\n" +
      "  OpenAI   →  OPENAI_API_KEY=sk-...     (platform.openai.com/api-keys)\n" +
      "  Gemini   →  GEMINI_API_KEY=...        (aistudio.google.com/apikey — tem cota gratuita)\n\n" +
      "  Os dois funcionam igual aqui. Passo a passo em contexos/templates/imagem-ia.md"
    );
  }

  const cfg = PROVEDORES[provedor];
  const chave = env[cfg.chave];
  if (!chave) {
    morrer(
      `Você escolheu ${cfg.nome}, mas não achei ${cfg.chave} no .env.`,
      `Pegue a chave em ${cfg.onde} e cole no .env da raiz assim:\n    ${cfg.chave}=...`
    );
  }

  const { buffer, info } =
    provedor === "openai"
      ? await viaOpenAI({ chave, prompt, opts })
      : await viaGemini({ chave, prompt, opts });

  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
  fs.writeFileSync(saida, buffer);
  console.log(`✓ Salvo: ${saida}  (${cfg.nome}, ${info}, ${Math.round(buffer.length / 1024)} KB)`);
}

main().catch((e) => morrer(`Erro inesperado: ${e.message}`));
