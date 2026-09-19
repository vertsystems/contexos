#!/usr/bin/env node
/**
 * Contex OS — transcrever.js
 * Transforma gravação de reunião (áudio ou vídeo) em texto, com marcação de tempo.
 *
 * Existe porque a ata boa nasce da transcrição inteira, não da lembrança de quem
 * estava na sala. E porque mandar arquivo pra API de transcrição na mão tem três
 * armadilhas: o multipart precisa estar certo byte a byte, cada provedor tem um
 * limite de tamanho diferente, e o vídeo de 1 h não cabe em pedido nenhum sem
 * cortar. O script cuida das três e escreve um .txt ao lado do arquivo, com o
 * minuto de cada trecho, pra ata citar "(min 14)" em vez de "em algum momento".
 *
 * Uso:
 *   node scripts/transcrever.js <gravação> [saida.txt]
 *   node scripts/transcrever.js "https://youtu.be/..."   (precisa do yt-dlp instalado)
 *
 * Opções:
 *   --provedor openai|gemini   (padrão: detecta pela chave que existir no .env)
 *   --modelo <nome>            (padrão: whisper-1 na OpenAI, gemini-2.5-flash no Gemini)
 *   --idioma <código>          (padrão: pt)
 *   --dica "Nome, Empresa"     nomes próprios e termos do negócio, pra sair grafado certo
 *   --partes <minutos>         tamanho de cada parte ao cortar (padrão: calculado pelo limite)
 *   --simular                  mostra o plano (provedor, tamanho, partes) e não chama a API
 *   --manter                   não apaga os arquivos temporários (áudio convertido, partes)
 *   --ajuda                    mostra este texto
 *
 * Formatos aceitos: mp3, m4a, wav, mp4, webm, ogg, flac, aac, mpeg, mpga, mov
 *
 * Chaves — basta ter UMA delas no .env da raiz do workspace:
 *   OPENAI_API_KEY=sk-...        → platform.openai.com/api-keys   (limite: 25 MB por pedido)
 *   GEMINI_API_KEY=...           → aistudio.google.com/apikey     (aceita até 2 GB, com cota gratuita)
 *
 * Arquivo maior que o limite: se o ffmpeg existir na máquina, o script converte pra
 * áudio leve (mono, 48 kbps) e corta em partes; se não existir, avisa e diz o que fazer.
 * Com ffmpeg, vídeo sempre vira áudio antes de subir (mais rápido e mais barato), e
 * gravação longa no Gemini é cortada em partes de 45 min pra resposta não vir truncada.
 * Sem chave nenhuma: avisa, e a skill segue com a transcrição colada pelo usuário.
 *
 * A transcrição sai ao lado da gravação (dados/ fica fora do git) ou no caminho pedido.
 *
 * Privacidade: o áudio SAI da máquina e vai pro provedor escolhido. Gravação de
 * reunião é dado pessoal e pode ter segredo de cliente. Quem chama o script
 * confirma isso com o usuário antes; o script não pergunta de novo.
 *
 * O script procura o .env na pasta atual e até 3 níveis acima.
 * Node 18 ou mais novo. Sem dependência nenhuma pra instalar.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, spawnSync } = require("child_process");

const MB = 1024 * 1024;

const PROVEDORES = {
  openai: {
    nome: "OpenAI",
    chave: "OPENAI_API_KEY",
    modeloPadrao: "whisper-1",
    onde: "platform.openai.com/api-keys",
    limiteBytes: 25 * MB,          // limite documentado por arquivo
    base: "https://api.openai.com/v1",
  },
  gemini: {
    nome: "Google Gemini",
    chave: "GEMINI_API_KEY",
    modeloPadrao: "gemini-2.5-flash",
    onde: "aistudio.google.com/apikey",
    limiteInline: 12 * MB,         // acima disso vai pela Files API (o pedido inline tem teto de 20 MB, e base64 cresce 1/3)
    limiteBytes: 2 * 1024 * MB,    // teto da Files API
    maxSegundosPorParte: 45 * 60,  // acima disso a resposta do modelo pode vir cortada no meio
    base: "https://generativelanguage.googleapis.com",
  },
};

const MIME = {
  ".mp3": "audio/mpeg", ".mpga": "audio/mpeg", ".mpeg": "audio/mpeg",
  ".m4a": "audio/mp4", ".aac": "audio/aac", ".wav": "audio/wav",
  ".ogg": "audio/ogg", ".oga": "audio/ogg", ".flac": "audio/flac",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};
const VIDEO = new Set([".mp4", ".webm", ".mov"]);

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
  const opts = { provedor: null, modelo: null, idioma: "pt", dica: "", partes: 0, simular: false, manter: false, ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (["--provedor", "--modelo", "--idioma", "--dica", "--partes"].includes(a)) {
      const v = (argv[++i] || "").trim();
      if (a === "--partes") opts.partes = parseFloat(v.replace(",", ".")) || 0;
      else opts[a.slice(2)] = v;
    } else if (a === "--simular") opts.simular = true;
    else if (a === "--manter") opts.manter = true;
    else if (a === "--ajuda" || a === "--help" || a === "-h") opts.ajuda = true;
    else if (a.startsWith("--")) {
      morrer(`Opção desconhecida: ${a}`, "Válidas: --provedor, --modelo, --idioma, --dica, --partes, --simular, --manter, --ajuda");
    } else posicionais.push(a);
  }
  return { posicionais, opts };
}

function existeComando(nome) {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [nome], { encoding: "utf8" });
  return r.status === 0;
}

function tamanhoLegivel(bytes) {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** hh:mm:ss a partir de segundos, pra ata citar o minuto. */
function tempo(seg) {
  const s = Math.max(0, Math.round(seg));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dois = (n) => String(n).padStart(2, "0");
  return h ? `${dois(h)}:${dois(m)}:${dois(r)}` : `${dois(m)}:${dois(r)}`;
}

// ─────────────────────────── ffmpeg ───────────────────────────

/** Duração em segundos, via ffprobe ou pela saída do próprio ffmpeg. Devolve 0 se não souber. */
function duracaoDe(arquivo) {
  if (existeComando("ffprobe")) {
    const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arquivo], { encoding: "utf8" });
    const d = parseFloat(r.stdout);
    if (d > 0) return d;
  }
  if (existeComando("ffmpeg")) {
    const r = spawnSync("ffmpeg", ["-i", arquivo], { encoding: "utf8" });
    const m = (r.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  return 0;
}

/** Converte pra mp3 mono 48 kbps: vídeo de 1 h vira ~20 MB de áudio. */
function comprimir(entrada, pastaTmp) {
  const saida = path.join(pastaTmp, path.basename(entrada, path.extname(entrada)) + ".mp3");
  console.log(`→ Convertendo pra áudio leve com ffmpeg (mono, 48 kbps)...`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", entrada, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", saida], { stdio: "inherit" });
  return saida;
}

/** Corta em partes de N segundos, sem recodificar. Devolve os caminhos em ordem. */
function cortar(entrada, pastaTmp, segundos) {
  const padrao = path.join(pastaTmp, "parte-%03d" + path.extname(entrada));
  console.log(`→ Cortando em partes de ${Math.round(segundos / 60)} min...`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", entrada, "-f", "segment", "-segment_time", String(segundos), "-c", "copy", padrao], { stdio: "inherit" });
  return fs.readdirSync(pastaTmp).filter((f) => f.startsWith("parte-")).sort().map((f) => path.join(pastaTmp, f));
}

// ─────────────────────────── multipart ───────────────────────────

/**
 * Monta um corpo multipart/form-data à mão. Cada campo vira uma parte; o arquivo
 * leva filename e content-type. Devolve { corpo, boundary } prontos pro fetch.
 * Exportado pra teste: é a parte que mais quebra em silêncio.
 */
function montarMultipart(campos, arquivo) {
  const boundary = "----ContexOS" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const pedacos = [];
  for (const [nome, valor] of Object.entries(campos)) {
    if (valor === undefined || valor === null || valor === "") continue;
    pedacos.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${nome}"\r\n\r\n${valor}\r\n`, "utf8"));
  }
  pedacos.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${arquivo.campo}"; filename="${arquivo.nome.replace(/"/g, "_")}"\r\n` +
    `Content-Type: ${arquivo.mime}\r\n\r\n`, "utf8"));
  pedacos.push(arquivo.dados);
  pedacos.push(Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"));
  return { corpo: Buffer.concat(pedacos), boundary };
}

// ─────────────────────────── OpenAI ───────────────────────────

async function viaOpenAI({ chave, arquivo, opts, base, offset }) {
  const cfg = PROVEDORES.openai;
  const modelo = opts.modelo || cfg.modeloPadrao;
  const ext = path.extname(arquivo).toLowerCase();
  const dados = fs.readFileSync(arquivo);
  const { corpo, boundary } = montarMultipart(
    {
      model: modelo,
      language: opts.idioma,
      prompt: opts.dica,
      // whisper-1 devolve trechos com tempo; modelos mais novos só aceitam json/text
      response_format: modelo === "whisper-1" ? "verbose_json" : "json",
    },
    { campo: "file", nome: path.basename(arquivo), mime: MIME[ext] || "application/octet-stream", dados }
  );

  const resp = await fetch(`${base}/audio/transcriptions`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, Authorization: `Bearer ${chave}` },
    body: corpo,
  });
  const texto = await resp.text();
  if (!resp.ok) {
    let detalhe = texto.slice(0, 400);
    try { detalhe = JSON.parse(texto)?.error?.message || detalhe; } catch {}
    const dicas = {
      401: "Chave inválida ou revogada. Gere outra em platform.openai.com/api-keys e atualize o .env.",
      413: "O arquivo passou do limite de 25 MB. Instale o ffmpeg (brew install ffmpeg) pra o script cortar sozinho, ou use --provedor gemini.",
      429: "Sem crédito ou limite atingido. Confira em platform.openai.com/usage — a API é paga e separada da assinatura do app de chat.",
      400: "A API recusou o pedido. Confira o formato do arquivo (mp3, m4a, wav, mp4, webm) e o nome do modelo.",
    };
    morrer(`OpenAI respondeu ${resp.status}: ${detalhe}`, dicas[resp.status] || "Tente de novo em alguns minutos.");
  }
  const json = JSON.parse(texto);
  if (Array.isArray(json.segments) && json.segments.length) {
    return json.segments.map((s) => `[${tempo(offset + s.start)}] ${String(s.text || "").trim()}`).join("\n");
  }
  return (json.text || "").trim();
}

// ─────────────────────────── Gemini ───────────────────────────

const IDIOMAS = { pt: "português do Brasil", "pt-br": "português do Brasil", en: "inglês", es: "espanhol", fr: "francês", it: "italiano", de: "alemão" };

const PROMPT_GEMINI = (idioma, dica) =>
  `Transcreva esta gravação de reunião na íntegra, em ${IDIOMAS[idioma.toLowerCase()] || `"${idioma}"`}, sem resumir e sem corrigir o que foi dito. ` +
  `Comece cada fala numa linha nova, no formato "[mm:ss] Falante: texto". Se der pra distinguir as vozes, chame de Falante 1, Falante 2 e assim por diante; ` +
  `se alguém disser o nome, use o nome. Marque trecho inaudível como [inaudível]. Não acrescente comentário, título nem resumo.` +
  (dica ? ` Nomes e termos que aparecem na gravação, pra grafar certo: ${dica}.` : "");

async function subirNoGemini({ chave, arquivo, mime, base }) {
  const dados = fs.readFileSync(arquivo);
  console.log(`→ Enviando ${tamanhoLegivel(dados.length)} pela Files API do Gemini...`);
  const inicio = await fetch(`${base}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": chave,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(dados.length),
      "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: path.basename(arquivo) } }),
  });
  if (!inicio.ok) morrer(`Gemini recusou o início do envio (${inicio.status}): ${(await inicio.text()).slice(0, 300)}`);
  const urlEnvio = inicio.headers.get("x-goog-upload-url");
  if (!urlEnvio) morrer("O Gemini não devolveu a URL de envio do arquivo.", "Tente de novo; se repetir, use --provedor openai.");

  const envio = await fetch(urlEnvio, {
    method: "POST",
    headers: {
      "Content-Length": String(dados.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: dados,
  });
  if (!envio.ok) morrer(`Falha ao enviar o arquivo pro Gemini (${envio.status}): ${(await envio.text()).slice(0, 300)}`);
  let info = (await envio.json()).file;

  // vídeo passa por processamento antes de ficar disponível
  for (let i = 0; i < 60 && info.state === "PROCESSING"; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await fetch(`${base}/v1beta/${info.name}`, { headers: { "x-goog-api-key": chave } });
    if (r.ok) info = await r.json();
  }
  if (info.state === "FAILED") morrer("O Gemini não conseguiu processar o arquivo.", "Se for vídeo, converta pra áudio (mp3/m4a) e tente de novo.");
  return { fileUri: info.uri, mimeType: info.mimeType || mime };
}

async function viaGemini({ chave, arquivo, opts, base, offset }) {
  const cfg = PROVEDORES.gemini;
  const modelo = opts.modelo || cfg.modeloPadrao;
  const ext = path.extname(arquivo).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const tamanho = fs.statSync(arquivo).size;

  let parteArquivo;
  if (tamanho > cfg.limiteInline) {
    parteArquivo = { fileData: await subirNoGemini({ chave, arquivo, mime, base }) };
  } else {
    parteArquivo = { inlineData: { mimeType: mime, data: fs.readFileSync(arquivo).toString("base64") } };
  }

  const resp = await fetch(`${base}/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      contents: [{ parts: [parteArquivo, { text: PROMPT_GEMINI(opts.idioma, opts.dica) }] }],
      generationConfig: { temperature: 0 },
    }),
  });
  const texto = await resp.text();
  if (!resp.ok) {
    let detalhe = texto.slice(0, 400);
    try { detalhe = JSON.parse(texto)?.error?.message || detalhe; } catch {}
    const chaveRuim = /api key not valid|api_key_invalid|invalid api key/i.test(detalhe);
    const dicas = {
      400: "Pedido recusado. Confira o formato do arquivo; se for vídeo, converta pra áudio e tente de novo.",
      403: "Chave sem permissão pra esse modelo. Confira em aistudio.google.com/apikey se a chave está ativa.",
      404: `Modelo "${modelo}" não encontrado. O nome muda com o tempo — veja os disponíveis em ai.google.dev/gemini-api/docs/models`,
      429: "Limite de uso atingido. O nível gratuito tem cota diária; espere ou ative faturamento no Google AI Studio.",
    };
    morrer(`Gemini respondeu ${resp.status}: ${detalhe}`,
      chaveRuim ? "A chave está errada ou incompleta. Pegue outra em aistudio.google.com/apikey e cole no .env em GEMINI_API_KEY= (sem aspas, sem espaço)."
                : dicas[resp.status] || "Tente de novo em alguns minutos.");
  }
  const json = JSON.parse(texto);
  const partes = json?.candidates?.[0]?.content?.parts || [];
  const saida = partes.map((p) => p.text || "").join("").trim();
  if (!saida) morrer("O Gemini respondeu sem texto.", "Tente de novo; se repetir, converta pra áudio ou use --provedor openai.");
  if (!offset) return saida;
  // parte 2 em diante: somar o deslocamento nos tempos [mm:ss] que o modelo escreveu
  return saida.replace(/^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/gm, (_, a, b, c) => {
    const seg = c !== undefined ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
    return `[${tempo(offset + seg)}]`;
  });
}

// ─────────────────────────── YouTube ───────────────────────────

function baixarLink(url, pastaTmp) {
  if (!existeComando("yt-dlp")) {
    morrer(
      "Pra transcrever um link do YouTube o script precisa do yt-dlp, e ele não está instalado.",
      "Instale com:  brew install yt-dlp   (Windows: winget install yt-dlp)\n" +
      "  Depois rode este comando de novo. Detalhes em templates/ferramentas/catalogo.md.\n\n" +
      "  Sem instalar nada, dá pra pegar a legenda automática do vídeo e colar no chat:\n" +
      "  no YouTube, abra a descrição do vídeo e clique em \"Mostrar transcrição\"."
    );
  }
  console.log(`→ Baixando o áudio com yt-dlp...`);
  const padrao = path.join(pastaTmp, "youtube.%(ext)s");
  const r = spawnSync("yt-dlp", ["--no-playlist", "-f", "bestaudio[ext=m4a]/bestaudio/best", "-o", padrao, url], { stdio: "inherit" });
  if (r.status !== 0) morrer("O yt-dlp não conseguiu baixar o vídeo.", "Confira se o link abre no navegador e se o vídeo não é privado. Se o yt-dlp for antigo: brew upgrade yt-dlp");
  const baixado = fs.readdirSync(pastaTmp).find((f) => f.startsWith("youtube."));
  if (!baixado) morrer("O yt-dlp terminou sem gerar arquivo.");
  return path.join(pastaTmp, baixado);
}

// ─────────────────────────── principal ───────────────────────────

async function main() {
  const { posicionais, opts } = lerArgs(process.argv.slice(2));
  let [entrada, saida] = posicionais;

  if (opts.ajuda) {
    const fonte = fs.readFileSync(__filename, "utf8");
    const cab = fonte.slice(fonte.indexOf("/**") + 3, fonte.indexOf("*/")).replace(/^ \* ?/gm, "");
    console.log(cab.trim());
    return;
  }
  if (!entrada) {
    morrer("Faltou a gravação.", 'Exemplo:\n  node scripts/transcrever.js "dados/reuniao-acme.m4a"\n  node scripts/transcrever.js "https://youtu.be/xxxx" dados/transcricao.txt');
  }
  if (typeof fetch !== "function") morrer("Seu Node é antigo demais.", "Precisa do Node 18 ou mais novo. Veja com: node --version");

  const env = { ...lerEnv(), ...process.env };

  // ── provedor: o escolhido, o do .env, ou o único com chave ──
  let provedor = opts.provedor || env.TRANSCRICAO_PROVEDOR || null;
  if (provedor && !PROVEDORES[provedor]) morrer(`Provedor desconhecido: ${provedor}`, "Use: openai ou gemini");
  if (!provedor) {
    const comChave = Object.keys(PROVEDORES).filter((p) => env[PROVEDORES[p].chave]);
    if (comChave.length === 1) provedor = comChave[0];
    else if (comChave.length > 1) {
      provedor = "openai";
      console.log(`ℹ Achei chave de mais de um provedor. Usando ${PROVEDORES[provedor].nome}.`);
      console.log(`  Pra fixar outro, ponha TRANSCRICAO_PROVEDOR=gemini no .env, ou use --provedor gemini`);
    }
  }
  if (!provedor) {
    morrer(
      "Nenhuma chave de transcrição configurada. Não dá pra transcrever por aqui.",
      "Duas saídas:\n\n" +
      "  1. Colar a transcrição pronta no chat (o app de reunião costuma gerar uma: Meet, Zoom, Teams) e seguir\n" +
      "  2. Configurar UMA chave no arquivo .env da raiz do seu negócio:\n" +
      "     OpenAI   →  OPENAI_API_KEY=sk-...     (platform.openai.com/api-keys, pago por minuto)\n" +
      "     Gemini   →  GEMINI_API_KEY=...        (aistudio.google.com/apikey, tem cota gratuita)\n\n" +
      "  Lembre: o áudio vai pro provedor escolhido. Gravação de reunião é dado pessoal."
    );
  }
  const cfg = PROVEDORES[provedor];
  const chave = env[cfg.chave];
  if (!chave && !opts.simular) {
    morrer(`Você escolheu ${cfg.nome}, mas não achei ${cfg.chave} no .env.`, `Pegue a chave em ${cfg.onde} e cole no .env da raiz assim:\n    ${cfg.chave}=...`);
  }
  const base = provedor === "openai" ? (env.OPENAI_BASE_URL || cfg.base) : (env.GEMINI_BASE_URL || cfg.base);

  // ── entrada: link ou arquivo ──
  const pastaTmp = fs.mkdtempSync(path.join(os.tmpdir(), "contexos-transcrever-"));
  const limpar = () => { if (!opts.manter) fs.rmSync(pastaTmp, { recursive: true, force: true }); };
  process.on("exit", limpar);   // vale também quando o script morre no meio
  let origem = entrada;
  const ehLink = /^https?:\/\//i.test(entrada);
  if (ehLink) {
    if (opts.simular) { console.log(`ℹ Link: ${entrada} (com --simular o download não roda)`); return; }
    entrada = baixarLink(entrada, pastaTmp);
  }
  if (!fs.existsSync(entrada)) morrer(`Não achei o arquivo: ${entrada}`, "Se a gravação está na pasta dados/, o caminho é dados/<nome do arquivo>.");
  const ext = path.extname(entrada).toLowerCase();
  if (!MIME[ext]) morrer(`Formato não aceito: ${ext || "(sem extensão)"}`, `Aceitos: ${Object.keys(MIME).join(", ")}`);

  if (!saida) {
    // link: vai pra dados/ se a pasta existir (fica fora do git); arquivo: ao lado dele
    const pastaLink = fs.existsSync(path.join(process.cwd(), "dados")) ? path.join(process.cwd(), "dados") : process.cwd();
    saida = ehLink
      ? path.join(pastaLink, "transcricao-" + new Date().toISOString().slice(0, 10) + ".txt")
      : path.join(path.dirname(entrada), path.basename(entrada, ext) + ".txt");
  }

  // ── tamanho, limite e plano de corte ──
  const temFfmpeg = existeComando("ffmpeg");
  let arquivo = entrada;
  let tamanho = fs.statSync(arquivo).size;
  const modelo = opts.modelo || cfg.modeloPadrao;
  let duracao = temFfmpeg ? duracaoDe(arquivo) : 0;
  console.log(`→ ${cfg.nome} (${modelo}) · ${path.basename(origem)} · ${tamanhoLegivel(tamanho)}${duracao ? ` · ${tempo(duracao)}` : ""}${VIDEO.has(ext) ? " · vídeo" : ""}`);

  // segundos por parte: 0 = não corta
  const segundosPorParte = () => {
    if (opts.partes) return opts.partes * 60;
    let seg = 0;
    if (tamanho > cfg.limiteBytes && duracao) seg = Math.floor(duracao * ((cfg.limiteBytes * 0.9) / tamanho));
    if (cfg.maxSegundosPorParte && duracao > cfg.maxSegundosPorParte) seg = seg ? Math.min(seg, cfg.maxSegundosPorParte) : cfg.maxSegundosPorParte;
    return seg ? Math.max(60, seg) : 0;
  };

  let partes = [arquivo];
  if (tamanho > cfg.limiteBytes && !temFfmpeg) {
    morrer(
      `O arquivo tem ${tamanhoLegivel(tamanho)} e o limite da ${cfg.nome} é ${tamanhoLegivel(cfg.limiteBytes)}.`,
      "Três saídas:\n" +
      "  1. Instalar o ffmpeg (brew install ffmpeg) — aí o script converte e corta sozinho\n" +
      (provedor === "openai" ? "  2. Usar o Gemini, que aceita arquivo bem maior: --provedor gemini (chave em aistudio.google.com/apikey)\n" : "  2. Exportar só o áudio da gravação, em mp3 ou m4a\n") +
      "  3. Exportar a gravação em partes menores no app que gravou e rodar uma por vez"
    );
  }
  // com ffmpeg: vídeo vira áudio sempre (sobe mais rápido e custa menos); áudio só se passar do limite ou precisar de corte
  const vaiConverter = temFfmpeg && (tamanho > cfg.limiteBytes || VIDEO.has(ext) || segundosPorParte() > 0);
  if (opts.simular) {
    if (vaiConverter) console.log(`ℹ Plano: converter pra mp3 mono 48 kbps${segundosPorParte() ? ` e cortar em partes de ~${Math.round(segundosPorParte() / 60)} min` : ""}`);
    else console.log(`ℹ Plano: enviar o arquivo como está, em um pedido só`);
    console.log(`ℹ Simulação: nada foi enviado. Saída iria pra ${saida}`);
    return;
  }
  if (vaiConverter) {
    arquivo = comprimir(entrada, pastaTmp);
    tamanho = fs.statSync(arquivo).size;
    console.log(`  áudio leve: ${tamanhoLegivel(tamanho)}`);
    if (!duracao) duracao = duracaoDe(arquivo);
    partes = [arquivo];
    const seg = segundosPorParte();
    if (!seg && tamanho > cfg.limiteBytes) {
      morrer(`Mesmo em áudio leve o arquivo ficou com ${tamanhoLegivel(tamanho)}, acima do limite, e não consegui medir a duração pra cortar.`,
        "Passe o tamanho da parte na mão, por exemplo --partes 30, ou exporte o áudio em partes menores e rode uma por vez.");
    }
    if (seg) {
      partes = cortar(arquivo, pastaTmp, seg);
      console.log(`  ${partes.length} partes`);
    }
  }

  // ── transcrever, parte a parte, somando o tempo ──
  const blocos = [];
  let offset = 0;
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    if (partes.length > 1) console.log(`→ Transcrevendo parte ${i + 1} de ${partes.length}...`);
    else console.log(`→ Transcrevendo...`);
    const texto = provedor === "openai"
      ? await viaOpenAI({ chave, arquivo: p, opts, base, offset })
      : await viaGemini({ chave, arquivo: p, opts, base, offset });
    blocos.push(texto);
    if (partes.length > 1) offset += duracaoDe(p) || (duracao / partes.length);
    if (partes.length > 1 && i < partes.length - 1) await new Promise((r) => setTimeout(r, 500));   // folga entre pedidos
  }

  const cabecalho = [
    `# Transcrição — ${path.basename(origem)}`,
    `# Gerada em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} por ${cfg.nome} (${modelo})${partes.length > 1 ? `, em ${partes.length} partes` : ""}${duracao ? ` · duração ${tempo(duracao)}` : ""}`,
    `# Transcrição automática: nome próprio e número podem ter saído errados. Conferir antes de citar.`,
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
  fs.writeFileSync(saida, cabecalho + blocos.join("\n\n") + "\n");
  const palavras = blocos.join(" ").split(/\s+/).filter(Boolean).length;
  console.log(`✓ Salvo: ${saida}  (${palavras} palavras${duracao ? `, ${tempo(duracao)} de gravação` : ""})`);
}

if (require.main === module) {
  main().catch((e) => morrer(`Erro inesperado: ${e.message}`));
}

module.exports = { montarMultipart, tempo, lerArgs };
