#!/usr/bin/env node
/**
 * Contex OS — impressao.js
 * Faz as contas de arquivo pra gráfica: tamanho final, sangria, área de
 * segurança, tamanho em pixel, DPI real de cada foto, e confere o PDF gerado
 * lendo o MediaBox de cada página em milímetros.
 *
 * Existe porque o arquivo devolvido pela gráfica erra quase sempre nas mesmas
 * quatro coisas, e todas são conta: o PDF saiu no tamanho final em vez do
 * tamanho com sangria (aí o corte come 1 mm do texto), o fundo encosta na
 * linha de corte sem sangrar (aparece um fio branco na borda), a foto tem
 * 480 px pra ocupar 90 mm (51 DPI, sai chuviscada) e o telefone ficou a 1,5 mm
 * da borda. Ninguém pega isso olhando a tela: a tela não tem corte.
 *
 * Uso:
 *   node scripts/impressao.js tamanhos                      lista os tamanhos conhecidos, com sangria e pixel
 *   node scripts/impressao.js peca <nome|LxA>                as medidas da peça e o @page pronto pro CSS
 *   node scripts/impressao.js previa <arquivo.html> --peca cartao --lados 2
 *                                                            PNG da peça inteira, com sangria, pra olhar antes de enviar
 *   node scripts/impressao.js medidas <arquivo.html> --peca cartao
 *                                                            mede o HTML renderizado: área segura, DPI real e sangria do fundo
 *   node scripts/impressao.js medir <arquivo.pdf> --peca cartao
 *                                                            lê o MediaBox e diz se bate com a sangria
 *   node scripts/impressao.js conferir <manifesto.json>      confere PDF, DPI das fotos, área segura e sangria do fundo
 *   node scripts/impressao.js --exemplo [arquivo.json]       escreve um manifesto de exemplo pra editar
 *
 * Opções:
 *   --peca <nome|LxA>   tamanho final da peça (ex.: cartao, a5, 90x50)
 *   --sangria <mm>      sangria por lado (padrão: 3)
 *   --seguranca <mm>    área de segurança medida do corte pra dentro (padrão: 4)
 *   --marcas <mm>       margem extra fora da sangria, quando a gráfica pede marca de corte no arquivo (padrão: 0)
 *   --dpi <n>           resolução de referência (padrão: 300)
 *   --paginas <n>       quantas páginas o PDF deve ter (frente e verso = 2)
 *   --lados <n>         quantos lados a prévia empilha (padrão: 1)
 *   --escala <n>        escala da prévia (padrão: 3; 3× de 96 DPI dá ~288 DPI de tela)
 *   --espera <ms>       tempo pra fonte e foto carregarem na prévia (padrão: 3000)
 *   --tolerancia <mm>   folga aceita na medida do PDF (padrão: 0,5)
 *   --json              imprime o resultado em JSON
 *
 * O que ele NÃO faz, de propósito: não converte pra CMYK e não confere perfil
 * de cor. O Chrome gera PDF em RGB, e não existe conversão honesta sem o perfil
 * da gráfica — isso vai no checklist de envio, escrito, não simulado aqui.
 *
 * Node 18+, sem dependência de npm. Usa ./br.js.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");
const br = require("./br.js");

// ─────────────────────────── unidades ───────────────────────────

const PT_POR_MM = 72 / 25.4; // ponto PostScript: 1 pt = 1/72 pol
const MM_POR_POL = 25.4;
const PX_CSS_POR_MM = 96 / 25.4; // o CSS assume 96 px por polegada

/** Milímetro → ponto de PDF. */
function mmParaPt(mm) {
  return mm * PT_POR_MM;
}

/** Ponto de PDF → milímetro. */
function ptParaMm(pt) {
  return pt / PT_POR_MM;
}

/** Milímetro → pixel na resolução dada (arredonda pra cima: pixel quebrado não existe). */
function mmParaPx(mm, dpi = 300) {
  return Math.ceil((mm / MM_POR_POL) * dpi);
}

/** Pixel disponível ÷ tamanho ocupado = resolução real com que a foto vai imprimir. */
function dpiEfetivo(px, mm) {
  if (!mm || mm <= 0) return 0;
  return (px / mm) * MM_POR_POL;
}

/** Arredonda pra exibir: até 2 casas, vírgula decimal, sem zero à direita. */
function n2(x) {
  return Number(x).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
}

// ─────────────────────────── tamanhos ───────────────────────────

/**
 * Tamanho final em mm. A série A é ISO 216 (medida fixa). O resto varia de
 * gráfica pra gráfica: está aqui como ponto de partida, e o `obs` diz o que
 * confirmar antes de enviar.
 */
const TAMANHOS = {
  cartao: { largura: 90, altura: 50, nome: "Cartão de visita 90×50", obs: "um dos dois mais usados no Brasil; a gráfica pode trabalhar com 90×48 ou 85×55" },
  "cartao-85": { largura: 85, altura: 55, nome: "Cartão de visita 85×55", obs: "o outro formato mais usado; cabe na carteira do mesmo jeito" },
  "cartao-90x48": { largura: 90, altura: 48, nome: "Cartão de visita 90×48", obs: "formato retangular padrão de gráfica online; confirme no pedido" },
  "cartao-88": { largura: 88, altura: 48, nome: "Cartão de visita 88×48", obs: "formato antigo de gráfica de bairro; confirme antes, pode não estar no catálogo" },
  ima: { largura: 85, altura: 55, nome: "Ímã de geladeira", obs: "medida comum; confirme com a gráfica" },
  a6: { largura: 105, altura: 148, nome: "A6 (ISO 216) — cartão-postal, flyer pequeno" },
  a5: { largura: 148, altura: 210, nome: "A5 (ISO 216) — flyer, panfleto" },
  a4: { largura: 210, altura: 297, nome: "A4 (ISO 216) — cartaz pequeno, encarte, ficha" },
  a3: { largura: 297, altura: 420, nome: "A3 (ISO 216) — cartaz" },
  tag: { largura: 50, altura: 80, nome: "Tag de produto", obs: "varia muito; confirme medida e furo com a gráfica" },
  "adesivo-50": { largura: 50, altura: 50, nome: "Adesivo quadrado ou redondo 50 mm", obs: "no redondo, a sangria é o diâmetro + 6 mm" },
  "adesivo-80": { largura: 80, altura: 80, nome: "Adesivo quadrado ou redondo 80 mm", obs: "no redondo, a sangria é o diâmetro + 6 mm" },
  marcador: { largura: 50, altura: 150, nome: "Marcador de página" },
};

/** "cartao" ou "90x50" ou "90 x 50" → { largura, altura, nome }. Desconhecido → null. */
function lerTamanho(s) {
  const bruto = String(s || "").trim().toLowerCase();
  if (!bruto) return null;
  const chave = br.slug(bruto);
  if (TAMANHOS[chave]) return { ...TAMANHOS[chave], chave };
  const m = bruto.replace(/\s/g, "").replace(/mm$/, "").match(/^([\d.,]+)[x×]([\d.,]+)$/);
  if (m) {
    const largura = br.numero(m[1]);
    const altura = br.numero(m[2]);
    if (largura && altura && largura > 0 && altura > 0) {
      return { largura, altura, nome: `${n2(largura)}×${n2(altura)} mm`, chave: "medida" };
    }
  }
  return null;
}

/**
 * Todas as medidas que a peça precisa: corte, sangria, área segura e pixel.
 * É a única função que sabe somar sangria — o resto consome daqui.
 */
function medidasDaPeca({ largura, altura, sangria = 3, seguranca = 4, marcas = 0, dpi = 300 }) {
  const comSangria = { largura: largura + 2 * sangria, altura: altura + 2 * sangria };
  // margem extra fora da sangria, só quando a gráfica pede marca de corte
  // desenhada no arquivo. Gráfica online costuma pedir o contrário: sangria e
  // mais nada, porque a marca dela entra na imposição.
  const arquivo = { largura: comSangria.largura + 2 * marcas, altura: comSangria.altura + 2 * marcas };
  const segura = { largura: largura - 2 * seguranca, altura: altura - 2 * seguranca };
  return {
    corte: { largura, altura },
    sangria,
    seguranca,
    marcas,
    dpi,
    comSangria,
    arquivo,
    segura,
    px: {
      corte: { largura: mmParaPx(largura, dpi), altura: mmParaPx(altura, dpi) },
      arquivo: { largura: mmParaPx(arquivo.largura, dpi), altura: mmParaPx(arquivo.altura, dpi) },
    },
    pt: {
      arquivo: { largura: mmParaPt(arquivo.largura), altura: mmParaPt(arquivo.altura) },
    },
  };
}

// ─────────────────────────── PDF ───────────────────────────

/**
 * Lê o MediaBox de cada página do PDF sem biblioteca nenhuma: o MediaBox é
 * escrito em texto puro no dicionário da página, em pontos. Se o PDF vier com
 * a estrutura comprimida em object stream, não acha nada e devolve lista vazia
 * — quem chama avisa em vez de inventar medida.
 */
function lerMediaBox(arquivo) {
  const buf = fs.readFileSync(arquivo);
  const txt = buf.toString("latin1");
  if (!txt.startsWith("%PDF-")) return { erro: "não é um PDF (falta o cabeçalho %PDF-)", caixas: [], paginas: 0 };
  const re = /\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/g;
  const caixas = [];
  let m;
  while ((m = re.exec(txt))) {
    const [x1, y1, x2, y2] = m.slice(1, 5).map(Number);
    caixas.push({
      largura_pt: Math.abs(x2 - x1),
      altura_pt: Math.abs(y2 - y1),
      largura_mm: ptParaMm(Math.abs(x2 - x1)),
      altura_mm: ptParaMm(Math.abs(y2 - y1)),
    });
  }
  const paginas = (txt.match(/\/Type\s*\/Page[^s]/g) || []).length;
  return { caixas, paginas, kb: Math.round(buf.length / 1024) };
}

/**
 * Compara o MediaBox com o tamanho com sangria. Aceita a página deitada
 * (largura e altura trocadas) sem reclamar: gráfica não liga, corte é o mesmo.
 */
function conferirPdf(arquivo, medidas, { paginas = null, tolerancia = 0.5 } = {}) {
  const erros = [];
  const avisos = [];
  const oks = [];
  const info = lerMediaBox(arquivo);
  if (info.erro) return { erros: [info.erro], avisos, oks, info };
  if (!info.caixas.length) {
    avisos.push(
      "não consegui ler o MediaBox desse PDF (estrutura comprimida). Meça no leitor de PDF (Propriedades → Tamanho da página) e compare com " +
        `${n2(medidas.arquivo.largura)} × ${n2(medidas.arquivo.altura)} mm`
    );
    return { erros, avisos, oks, info };
  }

  const esperado = medidas.arquivo;
  const semSangria = medidas.corte;
  info.caixas.forEach((c, i) => {
    const pagina = `página ${i + 1}`;
    const bate = (a, b) => Math.abs(a - b) <= tolerancia;
    const certo =
      (bate(c.largura_mm, esperado.largura) && bate(c.altura_mm, esperado.altura)) ||
      (bate(c.largura_mm, esperado.altura) && bate(c.altura_mm, esperado.largura));
    const noCorte =
      (bate(c.largura_mm, semSangria.largura) && bate(c.altura_mm, semSangria.altura)) ||
      (bate(c.largura_mm, semSangria.altura) && bate(c.altura_mm, semSangria.largura));
    const medida = `${n2(c.largura_mm)} × ${n2(c.altura_mm)} mm`;
    if (certo) {
      oks.push(`${pagina}: ${medida} — tamanho final + ${n2(medidas.sangria)} mm de sangria${medidas.marcas ? ` + ${n2(medidas.marcas)} mm de área de marca` : ""} por lado`);
    } else if (noCorte) {
      erros.push(
        `${pagina}: ${medida} é o tamanho final sem sangria. A gráfica vai cortar dentro da arte. ` +
          `O PDF precisa sair com ${n2(esperado.largura)} × ${n2(esperado.altura)} mm (@page size)`
      );
    } else {
      erros.push(
        `${pagina}: ${medida}, esperado ${n2(esperado.largura)} × ${n2(esperado.altura)} mm ` +
          `(diferença de ${n2(Math.abs(c.largura_mm - esperado.largura))} mm na largura e ${n2(Math.abs(c.altura_mm - esperado.altura))} mm na altura)`
      );
    }
  });

  const qtd = info.caixas.length;
  if (paginas !== null) {
    if (qtd !== paginas) erros.push(`o PDF tem ${qtd} página(s) e o manifesto diz ${paginas}`);
    else oks.push(`${qtd} página(s), como o manifesto diz`);
  }
  if (info.kb < 12) avisos.push(`${info.kb} KB é pouco pra peça de impressão — confira se a foto e a fonte carregaram antes do print`);
  return { erros, avisos, oks, info };
}

// ─────────────────────────── prévia ───────────────────────────

/**
 * Acha um navegador baseado em Chromium. Mesma lista do gerar-pdf.js: o
 * caminho muda por sistema, e montar isso na mão é erro garantido.
 */
function acharNavegador() {
  const candidatos = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ],
    linux: [
      "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium",
      "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge", "/usr/bin/brave-browser", "/snap/bin/chromium",
    ],
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
  };
  for (const p of candidatos[process.platform] || []) if (fs.existsSync(p)) return p;
  for (const nome of ["google-chrome", "chromium", "chrome", "msedge"]) {
    try {
      const achado = execSync(`command -v ${nome}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      if (achado) return achado;
    } catch {}
  }
  return null;
}

/** Janela em pixel de CSS pra caber a peça inteira (com sangria) e todos os lados empilhados. */
function janelaDaPeca(medidas, lados = 1) {
  return {
    largura: Math.round(medidas.arquivo.largura * PX_CSS_POR_MM),
    altura: Math.round(medidas.arquivo.altura * PX_CSS_POR_MM * lados),
  };
}

/**
 * PNG pra olhar antes de mandar pra gráfica: a peça inteira, com sangria e
 * marcas, do jeito que vai sair. Não é prova de cor (a tela é RGB e
 * retroiluminada); é prova de layout, corte e texto cortado.
 */
function gerarPrevia(htmlAbs, saida, medidas, { lados = 1, escala = 3, espera = 3000, navegador = null } = {}) {
  const chrome = navegador || acharNavegador();
  if (!chrome) return { erro: "não achei Chrome, Chromium, Edge nem Brave nessa máquina" };
  const janela = janelaDaPeca(medidas, lados);
  const url = "file://" + htmlAbs.split(path.sep).map(encodeURIComponent).join("/");
  const flags = [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    `--virtual-time-budget=${espera}`,
    `--force-device-scale-factor=${escala}`,
    `--window-size=${janela.largura},${janela.altura}`,
    `--screenshot=${saida}`,
    url,
  ];
  try {
    execFileSync(chrome, flags, { stdio: ["ignore", "ignore", "pipe"], timeout: 120000 });
  } catch (e) {
    return { erro: `o navegador falhou: ${(e.stderr || "").toString().slice(0, 200) || e.message}` };
  }
  if (!fs.existsSync(saida)) return { erro: "o navegador terminou mas o PNG não apareceu" };
  const dim = dimensoesImagem(saida);
  return { arquivo: saida, janela, escala, navegador: chrome, ...dim };
}

// ─────────────────────────── imagem ───────────────────────────

/**
 * Dimensão em pixel de PNG, JPEG, GIF, BMP e WebP, lendo o cabeçalho do
 * arquivo. Vetor (SVG, PDF, EPS, AI) não tem pixel: devolve vetor = true, e a
 * conta de DPI não se aplica.
 */
function dimensoesImagem(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  if ([".svg", ".pdf", ".eps", ".ai"].includes(ext)) return { vetor: true, formato: ext.slice(1) };
  const buf = fs.readFileSync(arquivo);

  // PNG: assinatura de 8 bytes, IHDR com largura e altura em big-endian
  if (buf.length > 24 && buf.toString("latin1", 1, 4) === "PNG") {
    return { largura_px: buf.readUInt32BE(16), altura_px: buf.readUInt32BE(20), formato: "png" };
  }
  // GIF: largura e altura little-endian no header
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "GIF") {
    return { largura_px: buf.readUInt16LE(6), altura_px: buf.readUInt16LE(8), formato: "gif" };
  }
  // BMP
  if (buf.length > 26 && buf.toString("latin1", 0, 2) === "BM") {
    return { largura_px: buf.readInt32LE(18), altura_px: Math.abs(buf.readInt32LE(22)), formato: "bmp" };
  }
  // WebP (VP8X e VP8 simples)
  if (buf.length > 30 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") {
    const tipo = buf.toString("latin1", 12, 16);
    if (tipo === "VP8X") {
      return { largura_px: 1 + buf.readUIntLE(24, 3), altura_px: 1 + buf.readUIntLE(27, 3), formato: "webp" };
    }
    if (tipo === "VP8 ") {
      return { largura_px: buf.readUInt16LE(26) & 0x3fff, altura_px: buf.readUInt16LE(28) & 0x3fff, formato: "webp" };
    }
  }
  // JPEG: percorre os marcadores até um SOF
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marca = buf[i + 1];
      if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)) { i += 2; continue; }
      const tam = buf.readUInt16BE(i + 2);
      const sof = (marca >= 0xc0 && marca <= 0xc3) || (marca >= 0xc5 && marca <= 0xc7) ||
        (marca >= 0xc9 && marca <= 0xcb) || (marca >= 0xcd && marca <= 0xcf);
      if (sof) {
        return { largura_px: buf.readUInt16BE(i + 7), altura_px: buf.readUInt16BE(i + 5), formato: "jpeg" };
      }
      i += 2 + tam;
    }
  }
  return { erro: "não reconheci o formato da imagem" };
}

/**
 * DPI real da foto no tamanho em que ela vai ser impressa, nos dois eixos.
 * Régua: 300 é o padrão de gráfica; abaixo de 150 chuvisca em peça de mão.
 */
function conferirImagem(entrada, baseDir, dpiAlvo = 300) {
  const rel = entrada.arquivo;
  const abs = path.isAbsolute(rel) ? rel : path.resolve(baseDir, rel);
  const nome = entrada.nome || rel;
  if (!fs.existsSync(abs)) return { nome, erro: `não achei o arquivo (${rel})` };
  const dim = dimensoesImagem(abs);
  if (dim.erro) return { nome, erro: `${dim.erro} (${rel})` };
  if (dim.vetor) return { nome, vetor: true, formato: dim.formato };

  const lm = Number(entrada.largura_mm);
  const am = Number(entrada.altura_mm);
  if (!lm || !am) return { nome, erro: "falta largura_mm e altura_mm — sem o tamanho que a foto ocupa não dá pra calcular DPI" };

  const dpiX = dpiEfetivo(dim.largura_px, lm);
  const dpiY = dpiEfetivo(dim.altura_px, am);
  const dpi = Math.min(dpiX, dpiY);
  const proporcaoPx = dim.largura_px / dim.altura_px;
  const proporcaoMm = lm / am;
  const distorcao = Math.abs(proporcaoPx - proporcaoMm) / proporcaoMm;

  return {
    nome,
    arquivo: rel,
    formato: dim.formato,
    largura_px: dim.largura_px,
    altura_px: dim.altura_px,
    largura_mm: lm,
    altura_mm: am,
    dpi,
    dpiX,
    dpiY,
    distorcao,
    px_necessario: { largura: mmParaPx(lm, dpiAlvo), altura: mmParaPx(am, dpiAlvo) },
    nivel: dpi >= dpiAlvo - 1 ? "ok" : dpi >= 150 ? "aviso" : "erro",
  };
}

// ─────────────────────────── área segura e sangria ───────────────────────────

/**
 * Elemento que precisa ficar longe do corte (texto, logo, telefone, QR).
 * A coordenada é medida do canto do TAMANHO FINAL, não do arquivo com sangria:
 * 0,0 é onde a gráfica corta.
 */
function conferirElemento(el, medidas) {
  const s = medidas.seguranca;
  const { largura, altura } = medidas.corte;
  const x = Number(el.x_mm);
  const y = Number(el.y_mm);
  const l = Number(el.largura_mm);
  const a = Number(el.altura_mm);
  if ([x, y, l, a].some((v) => !Number.isFinite(v))) {
    return { nome: el.nome || "(sem nome)", erro: "faltou x_mm, y_mm, largura_mm ou altura_mm" };
  }
  const folga = {
    esquerda: x,
    direita: largura - (x + l),
    topo: y,
    base: altura - (y + a),
  };
  const menor = Math.min(...Object.values(folga));
  const lado = Object.keys(folga).find((k) => folga[k] === menor);
  const nivel = menor < 0 ? "erro" : menor + 0.01 < s ? "aviso" : "ok";
  return { nome: el.nome || "(sem nome)", folga, menor, lado, nivel, seguranca: s };
}

/**
 * Fundo (cor cheia, faixa, foto de fundo) que encosta na borda precisa ir até
 * a sangria. Meio caminho é o pior dos mundos: o corte varia até 1 mm e
 * aparece fio branco de um lado só.
 */
function conferirFundo(el, medidas) {
  const s = medidas.sangria;
  const { largura, altura } = medidas.corte;
  const x = Number(el.x_mm);
  const y = Number(el.y_mm);
  const l = Number(el.largura_mm);
  const a = Number(el.altura_mm);
  if ([x, y, l, a].some((v) => !Number.isFinite(v))) {
    return { nome: el.nome || "(sem nome)", erro: "faltou x_mm, y_mm, largura_mm ou altura_mm" };
  }
  // borda: distância da linha de corte. Negativo = já passou pro lado da sangria.
  const borda = { esquerda: x, direita: largura - (x + l), topo: y, base: altura - (y + a) };
  const problemas = [];
  for (const [lado, d] of Object.entries(borda)) {
    // encosta no corte (até 1,5 mm de distância) mas não chega na sangria cheia
    if (d > -s + 0.01 && d <= 1.5) {
      const onde =
        Math.abs(d) < 0.05
          ? "termina em cima da linha de corte"
          : d > 0
          ? `termina ${n2(d)} mm antes do corte`
          : `passa ${n2(Math.abs(d))} mm do corte, menos que a sangria`;
      problemas.push(`${lado}: ${onde} — precisa chegar a ${n2(s)} mm fora do corte (ou recuar pra dentro de propósito)`);
    }
  }
  return { nome: el.nome || "(sem nome)", borda, problemas, nivel: problemas.length ? "erro" : "ok" };
}

// ─────────────────────────── medida no HTML renderizado ───────────────────────────

/**
 * Roda DENTRO do navegador (vai pro HTML por injeção; nunca é chamada no Node).
 * Mede a caixa de cada texto, foto e fundo com getBoundingClientRect, que é o
 * que o Chrome vai desenhar no PDF — e não o que alguém digitou num manifesto.
 * Publica o resultado num <script type="application/json"> que o Node lê pelo
 * --dump-dom.
 */
function medidorDePagina(cfg) {
  var PX = 96 / 25.4; // o CSS assume 96 px por polegada
  var mm = function (px) { return px / PX; };
  var perto = function (a, b) { return Math.abs(a - b) <= 1; };
  var saida = { pecas: [], semSangria: 0, corte: 0 };
  var pendentes = 0;
  var publicado = false;

  function nomear(el) {
    var dado = el.getAttribute && el.getAttribute("data-nome");
    if (dado) return dado;
    var txt = "";
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) txt += el.childNodes[i].nodeValue;
    }
    txt = txt.replace(/[\s\u00a0]+/g, " ").trim();
    if (txt) return txt.length > 44 ? txt.slice(0, 44) + "…" : txt;
    if (el.tagName === "IMG") return (el.getAttribute("src") || "imagem").split("/").pop().split("?")[0];
    var cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/)[0] : "";
    return el.tagName.toLowerCase() + cls;
  }

  function pintado(cor) {
    if (!cor) return false;
    if (cor === "transparent") return false;
    var m = cor.match(/rgba?\(([^)]+)\)/);
    if (!m) return true;
    var p = m[1].split(",");
    return p.length < 4 || parseFloat(p[3]) > 0.05;
  }

  function urlDoFundo(valor) {
    var m = valor && valor.match(/url\(["']?([^"')]+)["']?\)/);
    return m ? m[1] : null;
  }

  function publicar() {
    if (publicado) return;
    publicado = true;
    var tag = document.createElement("script");
    tag.type = "application/json";
    tag.id = "contexos-medida";
    // "<" escapado pra não fechar a tag no meio do JSON
    tag.textContent = JSON.stringify(saida).replace(/</g, "\\u003c");
    document.body.appendChild(tag);
  }

  var IGNORAR = '[data-impressao="ignorar"], .guias, .guia, .marcas';

  // só mede depois que foto e fonte carregaram: antes disso a imagem ainda não
  // tem altura, e o texto está na fonte de sistema — medida de outro layout
  if (document.readyState === "complete") pronto();
  else window.addEventListener("load", pronto);

  function pronto() {
    var espera = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    espera.then(function () { setTimeout(medir, 60); }, function () { setTimeout(medir, 60); });
  }

  function medir() {
  var todos = [].slice.call(document.querySelectorAll("body *")).filter(function (el) {
    return !(el.closest && el.closest(IGNORAR));
  });
  var candidatos = todos.filter(function (el) {
    var r = el.getBoundingClientRect();
    return perto(mm(r.width), cfg.arqL) && perto(mm(r.height), cfg.arqA);
  });
  // fica com o bloco mais externo de cada peça: camada sobreposta do mesmo tamanho
  // (guia de corte, por exemplo) não rouba o lugar da peça
  var pecas = candidatos.filter(function (el) {
    return !candidatos.some(function (o) { return o !== el && o.contains(el); });
  });

  if (!pecas.length) {
    saida.corte = todos.filter(function (el) {
      var r = el.getBoundingClientRect();
      return perto(mm(r.width), cfg.corteL) && perto(mm(r.height), cfg.corteA);
    }).length;
    saida.semSangria = saida.corte;
    publicar();
    return;
  }

  pecas.forEach(function (peca) {
    var rp = peca.getBoundingClientRect();
    var cx = rp.left + cfg.recuo * PX; // canto do tamanho final: 0,0 é onde a gráfica corta
    var cy = rp.top + cfg.recuo * PX;
    var registro = { elementos: [], imagens: [], fundos: [] };
    var filhos = [].slice.call(peca.querySelectorAll("*"));

    filhos.forEach(function (f) {
      if (f.closest && f.closest(IGNORAR)) return;
      if (f.tagName === "SCRIPT" || f.tagName === "STYLE") return;
      var st = window.getComputedStyle(f);
      if (st.display === "none" || st.visibility === "hidden" || parseFloat(st.opacity) < 0.05) return;
      var r = f.getBoundingClientRect();
      if (r.width < 0.5 || r.height < 0.5) return;

      var caixa = {
        nome: nomear(f),
        x_mm: mm(r.left - cx),
        y_mm: mm(r.top - cy),
        largura_mm: mm(r.width),
        altura_mm: mm(r.height),
      };

      if (f.tagName === "IMG" && f.naturalWidth) {
        registro.imagens.push({
          nome: caixa.nome, largura_mm: caixa.largura_mm, altura_mm: caixa.altura_mm,
          px_l: f.naturalWidth, px_a: f.naturalHeight, fundo: false,
        });
      }

      var temFundoImagem = st.backgroundImage && st.backgroundImage !== "none";
      var src = temFundoImagem ? urlDoFundo(st.backgroundImage) : null;
      if (src && src.indexOf("data:") !== 0) {
        pendentes++;
        var img = new Image();
        img.onload = function () {
          registro.imagens.push({
            nome: caixa.nome + " (fundo)", largura_mm: caixa.largura_mm, altura_mm: caixa.altura_mm,
            px_l: img.naturalWidth, px_a: img.naturalHeight, fundo: true,
          });
          pendentes--;
          if (pendentes === 0) publicar();
        };
        img.onerror = function () { pendentes--; if (pendentes === 0) publicar(); };
        img.src = src;
      }

      var temTexto = false;
      for (var i = 0; i < f.childNodes.length; i++) {
        if (f.childNodes[i].nodeType === 3 && f.childNodes[i].nodeValue.trim()) temTexto = true;
      }
      if (temTexto || f.tagName === "IMG" || f.tagName === "SVG" || f.tagName === "svg") {
        registro.elementos.push(caixa);
      }

      var borda = parseFloat(st.borderTopWidth) > 0 && pintado(st.borderTopColor);
      if (pintado(st.backgroundColor) || temFundoImagem || borda) registro.fundos.push(caixa);
    });

    saida.pecas.push(registro);
  });

  if (pendentes === 0) publicar();
  }
}

/**
 * Renderiza o HTML no Chrome e traz de volta as caixas medidas. Injeta o
 * medidor numa cópia temporária ao lado do original (pra foto e CSS relativos
 * continuarem resolvendo) e lê a resposta pelo --dump-dom.
 */
function medirHtml(htmlAbs, medidas, { espera = 4000, lados = 2, navegador = null } = {}) {
  const chrome = navegador || acharNavegador();
  if (!chrome) return { erro: "não achei Chrome, Chromium, Edge nem Brave nessa máquina" };
  const cfg = {
    arqL: medidas.arquivo.largura,
    arqA: medidas.arquivo.altura,
    corteL: medidas.corte.largura,
    corteA: medidas.corte.altura,
    recuo: medidas.sangria + medidas.marcas,
  };
  let original;
  try {
    original = fs.readFileSync(htmlAbs, "utf8");
  } catch (e) {
    return { erro: `não consegui ler o HTML: ${e.message}` };
  }
  const injecao = `\n<script>(${medidorDePagina.toString()})(${JSON.stringify(cfg)});</scr` + `ipt>\n`;
  const temp = path.join(path.dirname(htmlAbs), `.contexos-medida-${process.pid}.html`);
  const janela = janelaDaPeca(medidas, Math.max(lados, 2));
  try {
    try {
      fs.writeFileSync(temp, original + injecao);
    } catch (e) {
      return { erro: `não consegui escrever o arquivo de medição em ${path.dirname(htmlAbs)} (${e.code || e.message}). A pasta precisa aceitar escrita` };
    }
    const url = "file://" + temp.split(path.sep).map(encodeURIComponent).join("/");
    const flags = [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
      `--virtual-time-budget=${espera}`,
      `--window-size=${janela.largura},${janela.altura}`,
      "--dump-dom", url,
    ];
    let dom;
    try {
      dom = execFileSync(chrome, flags, { stdio: ["ignore", "pipe", "pipe"], timeout: 120000, maxBuffer: 64 * 1024 * 1024 }).toString();
    } catch (e) {
      return { erro: `o navegador falhou: ${(e.stderr || "").toString().slice(0, 200) || e.message}` };
    }
    const m = dom.match(/<script type="application\/json" id="contexos-medida">([\s\S]*?)<\/script>/);
    if (!m) return { erro: "o navegador abriu o arquivo mas não devolveu as medidas (o HTML tem erro de sintaxe?)" };
    try {
      return JSON.parse(m[1]);
    } catch (e) {
      return { erro: `não entendi as medidas que o navegador devolveu: ${e.message}` };
    }
  } finally {
    try { fs.unlinkSync(temp); } catch {}
  }
}

/** Passa a régua nas caixas medidas: área segura, DPI real e sangria do fundo. */
function conferirMedida(med, medidas, { dpiAlvo = 300 } = {}) {
  const erros = [];
  const avisos = [];
  const oks = [];
  const arq = `${n2(medidas.arquivo.largura)} × ${n2(medidas.arquivo.altura)} mm`;
  if (med.erro) return { erros: [med.erro], avisos, oks };
  if (!med.pecas || !med.pecas.length) {
    if (med.semSangria) {
      erros.push(
        `achei ${med.semSangria} bloco(s) de ${n2(medidas.corte.largura)} × ${n2(medidas.corte.altura)} mm no HTML: ` +
          `a peça está montada no tamanho final, sem sangria. Cada lado precisa de um bloco de ${arq}`
      );
    } else {
      erros.push(
        `não achei no HTML nenhum bloco de ${arq} (o tamanho do arquivo com sangria). ` +
          "Cada lado da peça é um bloco com essa largura e essa altura exatas, em mm"
      );
    }
    return { erros, avisos, oks };
  }

  med.pecas.forEach((p, i) => {
    const lado = med.pecas.length > 1 ? `lado ${i + 1}: ` : "";

    const medidos = p.elementos.map((el) => ({ el, r: conferirElemento(el, medidas) })).filter((x) => !x.r.erro);
    const ruins = medidos.filter((x) => x.r.nivel !== "ok");
    for (const x of ruins) {
      if (x.r.nivel === "erro") {
        erros.push(`${lado}"${x.r.nome}" passa da linha de corte em ${n2(Math.abs(x.r.menor))} mm (${x.r.lado}) — vai sair cortado`);
      } else {
        avisos.push(`${lado}"${x.r.nome}" fica a ${n2(x.r.menor)} mm do corte (${x.r.lado}), e a área de segurança é ${n2(medidas.seguranca)} mm`);
      }
    }
    const bons = medidos.filter((x) => x.r.nivel === "ok");
    if (bons.length) {
      const apertado = bons.reduce((a, b) => (a.r.menor <= b.r.menor ? a : b));
      oks.push(`${lado}${bons.length} elemento(s) dentro da área segura — o mais justo é "${apertado.r.nome}", a ${n2(apertado.r.menor)} mm do corte`);
    }

    for (const im of p.imagens) {
      const dpi = Math.min(dpiEfetivo(im.px_l, im.largura_mm), dpiEfetivo(im.px_a, im.altura_mm));
      const base = `${lado}"${im.nome}": ${im.px_l}×${im.px_a} px em ${n2(im.largura_mm)}×${n2(im.altura_mm)} mm = ${Math.round(dpi)} DPI`;
      const precisa = `${mmParaPx(im.largura_mm, dpiAlvo)}×${mmParaPx(im.altura_mm, dpiAlvo)} px`;
      const nota = im.fundo ? " (fundo: a conta usa o tamanho do bloco, então é aproximada)" : "";
      if (dpi < 150) erros.push(`${base}${nota}. Abaixo de 150 DPI a foto chuvisca no papel — precisa de ${precisa}, ou diminua o espaço dela na arte`);
      else if (dpi < dpiAlvo - 1) avisos.push(`${base}${nota}, abaixo dos ${dpiAlvo} DPI da gráfica — precisa de ${precisa} pra chegar lá`);
      else oks.push(base + nota);
    }

    const fundos = p.fundos.map((f) => conferirFundo(f, medidas));
    const furados = fundos.filter((f) => f.nivel === "erro");
    for (const f of furados) for (const pr of f.problemas) erros.push(`${lado}fundo "${f.nome}" ${pr}`);
    const inteiros = fundos.length - furados.length;
    if (inteiros > 0) oks.push(`${lado}${inteiros} fundo(s) com a borda resolvida: ou sangram os ${n2(medidas.sangria)} mm, ou recuam pra dentro de propósito`);
  });

  if (med.pecas.length === 1) oks.push("1 lado medido no HTML renderizado");
  else oks.push(`${med.pecas.length} lados medidos no HTML renderizado`);
  return { erros, avisos, oks };
}

// ─────────────────────────── cor ───────────────────────────

/**
 * Conversão ingênua RGB → CMYK, só pra sinalizar o que muda na gráfica.
 * Não é gerenciamento de cor: sem o perfil ICC da gráfica, número exato não
 * existe. Serve pra dois alertas que valem dinheiro: preto chapado em área
 * grande e cor saturada que vai sair mais apagada no papel.
 */
function avaliarCor(hex, area = "") {
  const h = String(hex || "").trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { hex, erro: "cor fora do formato #rrggbb" };
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  const d = 1 - k || 1;
  const c = k === 1 ? 0 : (1 - r - k) / d;
  const m = k === 1 ? 0 : (1 - g - k) / d;
  const y = k === 1 ? 0 : (1 - b - k) / d;
  const cmyk = [c, m, y, k].map((v) => Math.round(v * 100));
  const avisos = [];
  const grande = /grande|cheia|fundo|chapad/i.test(area);
  if (k >= 0.97 && c < 0.05 && m < 0.05 && y < 0.05 && grande) {
    avisos.push("preto chapado em área grande sai acinzentado em CMYK. Peça o preto rico da gráfica (costuma ser C60 M40 Y40 K100 — confirme o valor com ela)");
  }
  const cromaAlta = Math.max(r, g, b) - Math.min(r, g, b) > 0.55 && Math.max(r, g, b) > 0.85;
  if (cromaAlta) {
    avisos.push("cor muito viva na tela: em CMYK sai mais fechada. Se essa cor é da marca, peça prova impressa antes da tiragem grande");
  }
  return { hex: "#" + full.toLowerCase(), cmyk, avisos };
}

// ─────────────────────────── manifesto ───────────────────────────

/** Confere o manifesto inteiro: PDF, fotos, área segura, fundo e cor. */
function conferirManifesto(man, baseDir = ".") {
  const erros = [];
  const avisos = [];
  const oks = [];

  const tam = lerTamanho(man.tamanho || man.peca_tamanho || "");
  if (!tam) {
    return { erros: [`não entendi "tamanho": use um nome conhecido (${Object.keys(TAMANHOS).slice(0, 4).join(", ")}…) ou LxA em mm, tipo "90x50"`], avisos, oks };
  }
  const sangria = man.sangria_mm === undefined ? 3 : Number(man.sangria_mm);
  const seguranca = man.seguranca_mm === undefined ? 4 : Number(man.seguranca_mm);
  const marcas = man.marcas_mm === undefined ? 0 : Number(man.marcas_mm);
  const dpiAlvo = Number(man.dpi || 300);
  if (!Number.isFinite(sangria) || sangria < 0 || sangria > 20) erros.push(`sangria_mm inválida: ${man.sangria_mm}`);
  if (!Number.isFinite(seguranca) || seguranca < 0) erros.push(`seguranca_mm inválida: ${man.seguranca_mm}`);
  if (!Number.isFinite(marcas) || marcas < 0 || marcas > 30) erros.push(`marcas_mm inválida: ${man.marcas_mm}`);
  if (erros.length) return { erros, avisos, oks };
  if (sangria < 3) avisos.push(`sangria de ${n2(sangria)} mm é menor que os 3 mm que a gráfica pede por padrão`);
  if (seguranca < 3) avisos.push(`área de segurança de ${n2(seguranca)} mm é aperto: o corte varia até 1 mm pra cada lado`);

  const medidas = medidasDaPeca({ largura: tam.largura, altura: tam.altura, sangria, seguranca, marcas, dpi: dpiAlvo });
  if (medidas.segura.largura <= 0 || medidas.segura.altura <= 0) {
    erros.push(`a área de segurança de ${n2(seguranca)} mm não cabe numa peça de ${n2(tam.largura)} × ${n2(tam.altura)} mm`);
    return { erros, avisos, oks, medidas };
  }

  // PDF
  if (man.pdf) {
    const abs = path.isAbsolute(man.pdf) ? man.pdf : path.resolve(baseDir, man.pdf);
    if (!fs.existsSync(abs)) {
      erros.push(`não achei o PDF: ${man.pdf}`);
    } else {
      const r = conferirPdf(abs, medidas, { paginas: man.paginas === undefined ? null : Number(man.paginas), tolerancia: Number(man.tolerancia_mm || 0.5) });
      erros.push(...r.erros);
      avisos.push(...r.avisos);
      oks.push(...r.oks);
    }
  } else {
    avisos.push('sem "pdf" no manifesto: a medida do arquivo final não foi conferida');
  }

  // HTML renderizado: quando o manifesto aponta a arte, a medida sai do que o
  // Chrome desenha, não do que alguém digitou aqui
  let medido = false;
  if (man.html) {
    const absH = path.isAbsolute(man.html) ? man.html : path.resolve(baseDir, man.html);
    if (!fs.existsSync(absH)) {
      erros.push(`não achei o HTML da arte: ${man.html}`);
    } else {
      const med = medirHtml(absH, medidas, { espera: Number(man.espera_ms) || 4000, lados: Number(man.paginas) || 2 });
      const r = conferirMedida(med, medidas, { dpiAlvo });
      erros.push(...r.erros);
      avisos.push(...r.avisos);
      oks.push(...r.oks);
      medido = !med.erro; // só o navegador falhando devolve a conferência pras listas escritas na mão
      if (medido && (man.elementos || man.fundos || man.imagens)) {
        avisos.push('as listas "elementos", "fundos" e "imagens" foram ignoradas: com "html" no manifesto, vale a medida do arquivo renderizado');
      }
    }
  } else {
    avisos.push('sem "html" no manifesto: a área segura e o DPI saem do que está escrito aqui, não do arquivo renderizado');
  }

  // fotos declaradas na mão (só quando não há HTML pra medir)
  const imagens = !medido && Array.isArray(man.imagens) ? man.imagens : [];
  for (const it of imagens) {
    const r = conferirImagem(it, baseDir, dpiAlvo);
    if (r.erro) { erros.push(`${r.nome}: ${r.erro}`); continue; }
    if (r.vetor) { oks.push(`${r.nome}: ${r.formato} é vetor, imprime em qualquer tamanho`); continue; }
    const base = `${r.nome}: ${r.largura_px}×${r.altura_px} px em ${n2(r.largura_mm)}×${n2(r.altura_mm)} mm = ${Math.round(r.dpi)} DPI`;
    if (r.nivel === "erro") {
      erros.push(`${base}. Abaixo de 150 DPI a foto chuvisca no papel. Precisa de ${r.px_necessario.largura}×${r.px_necessario.altura} px pra ${dpiAlvo} DPI, ou diminua o tamanho na arte`);
    } else if (r.nivel === "aviso") {
      avisos.push(`${base}, abaixo dos ${dpiAlvo} DPI da gráfica. Aceitável em peça vista de longe; em cartão, troque a foto (precisa de ${r.px_necessario.largura}×${r.px_necessario.altura} px)`);
    } else {
      oks.push(base);
    }
    if (r.distorcao > 0.02) {
      avisos.push(`${r.nome}: a proporção do arquivo não é a do espaço (${(r.distorcao * 100).toFixed(1).replace(".", ",")}% de diferença) — a foto vai esticar. Use object-fit: cover e recorte de propósito`);
    }
  }

  // área segura declarada na mão
  for (const el of !medido && Array.isArray(man.elementos) ? man.elementos : []) {
    const r = conferirElemento(el, medidas);
    if (r.erro) { erros.push(`elemento "${r.nome}": ${r.erro}`); continue; }
    if (r.nivel === "erro") {
      erros.push(`"${r.nome}" passa da linha de corte em ${n2(Math.abs(r.menor))} mm (${r.lado}) — vai sair cortado`);
    } else if (r.nivel === "aviso") {
      avisos.push(`"${r.nome}" fica a ${n2(r.menor)} mm do corte (${r.lado}), e a área de segurança é ${n2(r.seguranca)} mm`);
    } else {
      oks.push(`"${r.nome}": ${n2(r.menor)} mm de folga do corte no lado mais apertado (${r.lado})`);
    }
  }

  // fundo que precisa sangrar, declarado na mão
  for (const el of !medido && Array.isArray(man.fundos) ? man.fundos : []) {
    const r = conferirFundo(el, medidas);
    if (r.erro) { erros.push(`fundo "${r.nome}": ${r.erro}`); continue; }
    if (r.nivel === "erro") {
      for (const p of r.problemas) erros.push(`fundo "${r.nome}" ${p}`);
    } else {
      oks.push(`fundo "${r.nome}": sangra ou recua de propósito em todos os lados`);
    }
  }

  // cor
  for (const cor of Array.isArray(man.cores) ? man.cores : []) {
    const r = avaliarCor(cor.hex, cor.area || "");
    if (r.erro) { erros.push(`cor "${cor.nome || cor.hex}": ${r.erro}`); continue; }
    const rot = `${cor.nome || r.hex} (${r.hex} ≈ C${r.cmyk[0]} M${r.cmyk[1]} Y${r.cmyk[2]} K${r.cmyk[3]}, conversão aproximada)`;
    if (r.avisos.length) for (const a of r.avisos) avisos.push(`${rot}: ${a}`);
    else oks.push(rot);
  }

  return { erros, avisos, oks, medidas, tamanho: tam };
}

// ─────────────────────────── saída no terminal ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function imprimirMedidas(m, tam) {
  console.log(`\n${tam.nome}`);
  if (tam.obs) console.log(`  (${tam.obs})`);
  console.log("");
  console.log(`  Tamanho final (onde corta)   ${n2(m.corte.largura)} × ${n2(m.corte.altura)} mm`);
  console.log(`  Arquivo com sangria          ${n2(m.comSangria.largura)} × ${n2(m.comSangria.altura)} mm   (${n2(m.sangria)} mm por lado)`);
  if (m.marcas) console.log(`  Página do PDF com marcas     ${n2(m.arquivo.largura)} × ${n2(m.arquivo.altura)} mm   (+${n2(m.marcas)} mm por lado pra marca de corte)`);
  console.log(`  Área segura (texto e logo)   ${n2(m.segura.largura)} × ${n2(m.segura.altura)} mm   (${n2(m.seguranca)} mm do corte pra dentro)`);
  console.log("  " + `Em pixel a ${m.dpi} DPI`.padEnd(29) + `${m.px.arquivo.largura} × ${m.px.arquivo.altura} px`);
  console.log(`  MediaBox esperado no PDF     ${m.pt.arquivo.largura.toFixed(2)} × ${m.pt.arquivo.altura.toFixed(2)} pt`);
  console.log(`\n  Cole no CSS da peça:\n`);
  console.log(`    @page { size: ${n2(m.arquivo.largura)}mm ${n2(m.arquivo.altura)}mm; margin: 0; }`);
  console.log(`    :root {`);
  console.log(`      --corte-l: ${n2(m.corte.largura)}mm; --corte-a: ${n2(m.corte.altura)}mm;`);
  console.log(`      --sangria: ${n2(m.sangria)}mm; --seguranca: ${n2(m.seguranca)}mm; --marcas: ${n2(m.marcas)}mm;`);
  console.log(`    }`);
  console.log(`    .peca { width: ${n2(m.arquivo.largura)}mm; height: ${n2(m.arquivo.altura)}mm; }`);
  console.log("");
}

function relatar(r, resumo = "") {
  for (const o of r.oks) console.log(`  ✓ ${o}`);
  for (const a of r.avisos) console.log(`  ⚠ ${a}`);
  for (const e of r.erros) console.log(`  ✖ ${e}`);
  console.log("");
  if (r.erros.length) {
    console.log(`✖ ${r.erros.length} problema(s) que a gráfica devolve. Corrija o HTML e gere o PDF de novo.\n`);
    return 1;
  }
  if (r.avisos.length) {
    console.log(`⚠ ${r.avisos.length} aviso(s): dá pra enviar, mas leia antes de mandar.\n`);
    return 0;
  }
  console.log(`Tudo certo.${resumo ? " " + resumo : ""}\n`);
  return 0;
}

const EXEMPLO = {
  peca: "Cartão de visita — Padaria Aurora",
  tamanho: "cartao",
  sangria_mm: 3,
  seguranca_mm: 4,
  dpi: 300,
  paginas: 2,
  html: "arte.html",
  pdf: "arte.pdf",
  imagens: [{ nome: "logo", arquivo: "logo.png", largura_mm: 32, altura_mm: 14 }],
  elementos: [
    { nome: "nome do negócio", x_mm: 6, y_mm: 8, largura_mm: 50, altura_mm: 9 },
    { nome: "telefone", x_mm: 6, y_mm: 38, largura_mm: 44, altura_mm: 5 },
  ],
  fundos: [{ nome: "faixa vinho do topo", x_mm: -3, y_mm: -3, largura_mm: 96, altura_mm: 18 }],
  cores: [
    { nome: "vinho da marca", hex: "#7B1E2B", area: "grande" },
    { nome: "texto", hex: "#1A1A1A", area: "texto" },
  ],
};

function main() {
  const args = process.argv.slice(2);
  const opts = { sangria: 3, seguranca: 4, dpi: 300, tolerancia: 0.5, paginas: null, peca: null, marcas: 0, json: false, lados: 1, escala: 3, espera: 3000 };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--sangria") opts.sangria = br.numero(args[++i]);
    else if (a === "--seguranca") opts.seguranca = br.numero(args[++i]);
    else if (a === "--dpi") opts.dpi = parseInt(args[++i], 10);
    else if (a === "--tolerancia") opts.tolerancia = br.numero(args[++i]);
    else if (a === "--paginas") opts.paginas = parseInt(args[++i], 10);
    else if (a === "--peca" || a === "--tamanho") opts.peca = args[++i];
    else if (a === "--marcas") opts.marcas = br.numero(args[++i]);
    else if (a === "--lados") opts.lados = parseInt(args[++i], 10);
    else if (a === "--escala") opts.escala = br.numero(args[++i]);
    else if (a === "--espera") opts.espera = parseInt(args[++i], 10);
    else if (a === "--json") opts.json = true;
    else if (a === "--exemplo") { const alvo = args[i + 1]; pos.push("--exemplo", alvo && !alvo.startsWith("--") ? args[++i] : ""); }
    else if (a.startsWith("--")) morrer(`Opção desconhecida: ${a}`, "Válidas: --peca, --sangria, --seguranca, --marcas, --dpi, --paginas, --tolerancia, --lados, --escala, --espera, --json");
    else pos.push(a);
  }

  for (const [chave, rotulo] of [["sangria", "--sangria"], ["seguranca", "--seguranca"], ["dpi", "--dpi"], ["tolerancia", "--tolerancia"], ["marcas", "--marcas"], ["escala", "--escala"], ["espera", "--espera"]]) {
    if (!Number.isFinite(opts[chave]) || opts[chave] < 0) morrer(`${rotulo} precisa de um número em milímetros (ou DPI), e veio "${opts[chave]}".`, "Exemplo: --sangria 3 --seguranca 4 --dpi 300");
  }
  if (opts.dpi < 30 || opts.dpi > 2400) morrer(`--dpi precisa ficar entre 30 e 2400, e veio "${opts.dpi}".`, "Gráfica pede 300 DPI no tamanho real; 150 serve em cartaz visto de longe.");
  if (opts.sangria > 20) morrer(`--sangria de ${n2(opts.sangria)} mm não é sangria, é margem.`, "O padrão de gráfica é 3 mm por lado. Acima de 20 mm, confirme o que a gráfica pediu.");
  if (opts.escala < 1 || opts.escala > 8) morrer(`--escala precisa ficar entre 1 e 8, e veio "${opts.escala}".`, "3 é o padrão: dá cerca de 288 DPI de tela na prévia.");
  if (opts.paginas !== null && (!Number.isInteger(opts.paginas) || opts.paginas < 1)) morrer(`--paginas precisa ser um número inteiro de páginas, e veio "${opts.paginas}".`);
  if (!Number.isInteger(opts.lados) || opts.lados < 1 || opts.lados > 12) morrer(`--lados precisa ser um inteiro de 1 a 12, e veio "${opts.lados}".`, "Cartão frente e verso é --lados 2.");

  const cmd = pos[0];

  if (cmd === "--exemplo") {
    const destino = path.resolve(pos[1] || "manifesto-impressao.json");
    fs.writeFileSync(destino, JSON.stringify(EXEMPLO, null, 2) + "\n");
    console.log(`✓ manifesto de exemplo em ${destino}`);
    console.log("  Edite os campos e rode: node scripts/impressao.js conferir " + path.basename(destino));
    return;
  }

  if (!cmd || cmd === "ajuda" || cmd === "--ajuda") {
    console.log(`
Contex OS — impressao.js: as contas do arquivo pra gráfica.

  node scripts/impressao.js tamanhos
  node scripts/impressao.js peca <nome|LxA> [--sangria 3] [--seguranca 4] [--dpi 300]
  node scripts/impressao.js previa <arquivo.html> [saida.png] --peca cartao [--lados 2]
  node scripts/impressao.js medidas <arquivo.html> --peca cartao
  node scripts/impressao.js medir <arquivo.pdf> --peca cartao [--paginas 2]
  node scripts/impressao.js conferir <manifesto.json>
  node scripts/impressao.js --exemplo [arquivo.json]

Tamanhos conhecidos: ${Object.keys(TAMANHOS).join(", ")}
`);
    return;
  }

  if (cmd === "tamanhos") {
    const linhas = Object.entries(TAMANHOS).map(([chave, t]) => {
      const m = medidasDaPeca({ largura: t.largura, altura: t.altura, sangria: opts.sangria, seguranca: opts.seguranca, marcas: opts.marcas, dpi: opts.dpi });
      return { chave, nome: t.nome, final: `${n2(t.largura)}×${n2(t.altura)}`, sangria: `${n2(m.comSangria.largura)}×${n2(m.comSangria.altura)}`, segura: `${n2(m.segura.largura)}×${n2(m.segura.altura)}`, px: `${m.px.arquivo.largura}×${m.px.arquivo.altura}` };
    });
    if (opts.json) { console.log(JSON.stringify(linhas, null, 2)); return; }
    console.log(`\nMedidas em mm. Sangria de ${n2(opts.sangria)} mm por lado, área segura de ${n2(opts.seguranca)} mm, pixel a ${opts.dpi} DPI.\n`);
    console.log("  nome".padEnd(16) + "final".padEnd(12) + "com sangria".padEnd(14) + "área segura".padEnd(14) + "pixel");
    for (const l of linhas) {
      console.log("  " + l.chave.padEnd(14) + l.final.padEnd(12) + l.sangria.padEnd(14) + l.segura.padEnd(14) + l.px);
    }
    console.log("\n  A série A é medida fixa de norma (ISO 216). O resto varia por gráfica: confirme no pedido.\n");
    return;
  }

  if (cmd === "peca") {
    const tam = lerTamanho(pos[1] || opts.peca);
    if (!tam) morrer(`Não entendi a peça: ${pos[1] || opts.peca || "(vazio)"}`, `Use um nome conhecido (${Object.keys(TAMANHOS).join(", ")}) ou LxA em mm, tipo 90x50.`);
    const m = medidasDaPeca({ largura: tam.largura, altura: tam.altura, sangria: opts.sangria, seguranca: opts.seguranca, marcas: opts.marcas, dpi: opts.dpi });
    if (m.segura.largura <= 0 || m.segura.altura <= 0) {
      morrer(`Área de segurança de ${n2(opts.seguranca)} mm não cabe numa peça de ${n2(tam.largura)} × ${n2(tam.altura)} mm.`, "Ela é medida do corte pra dentro, nos quatro lados. Em peça pequena, use 3 ou 4 mm.");
    }
    if (opts.json) { console.log(JSON.stringify({ tamanho: tam, medidas: m }, null, 2)); return; }
    imprimirMedidas(m, tam);
    return;
  }

  if (cmd === "medir") {
    const arquivo = pos[1];
    if (!arquivo) morrer("Faltou o PDF.", "Exemplo:\n  node scripts/impressao.js medir impressos/cartao/cartao.pdf --peca cartao");
    const abs = path.resolve(arquivo);
    if (!fs.existsSync(abs)) morrer(`Não achei o arquivo: ${arquivo}`);
    const tam = lerTamanho(opts.peca);
    if (!tam) morrer("Faltou dizer o tamanho final da peça.", "Exemplo: --peca cartao   ou   --peca 90x50");
    const m = medidasDaPeca({ largura: tam.largura, altura: tam.altura, sangria: opts.sangria, seguranca: opts.seguranca, marcas: opts.marcas, dpi: opts.dpi });
    const r = conferirPdf(abs, m, { paginas: opts.paginas, tolerancia: opts.tolerancia });
    if (opts.json) { console.log(JSON.stringify({ tamanho: tam, esperado: m.arquivo, ...r }, null, 2)); process.exit(r.erros.length ? 1 : 0); }
    console.log(`\n${path.basename(abs)} — esperado ${n2(m.arquivo.largura)} × ${n2(m.arquivo.altura)} mm (${tam.nome} + ${n2(m.sangria)} mm de sangria${m.marcas ? ` + ${n2(m.marcas)} mm de marca` : ""})\n`);
    const saidaMedir = relatar(r, "O PDF está no tamanho com sangria. DPI e área segura são outra conferência: rode `medidas` no HTML.");
    process.exit(saidaMedir);
  }

  if (cmd === "previa") {
    const entrada = pos[1];
    if (!entrada) morrer("Faltou o HTML da peça.", "Exemplo:\n  node scripts/impressao.js previa impressos/cartao/cartao.html --peca cartao --lados 2");
    const htmlAbs = path.resolve(entrada);
    if (!fs.existsSync(htmlAbs)) morrer(`Não achei o arquivo: ${entrada}`);
    const tam = lerTamanho(opts.peca);
    if (!tam) morrer("Faltou dizer o tamanho final da peça.", "Exemplo: --peca cartao   ou   --peca 105x148");
    const m = medidasDaPeca({ largura: tam.largura, altura: tam.altura, sangria: opts.sangria, seguranca: opts.seguranca, marcas: opts.marcas, dpi: opts.dpi });
    const saida = path.resolve(pos[2] || htmlAbs.replace(/\.html?$/i, "-previa.png"));
    const r = gerarPrevia(htmlAbs, saida, m, { lados: opts.lados, escala: opts.escala, espera: opts.espera });
    if (r.erro) morrer(`Não deu pra gerar a prévia: ${r.erro}`, "Sem navegador, abra o HTML e use Imprimir → Salvar como PDF pra conferir o layout.");
    console.log(`✓ ${saida}`);
    console.log(`  ${r.largura_px} × ${r.altura_px} px — ${opts.lados} lado(s) de ${n2(m.arquivo.largura)} × ${n2(m.arquivo.altura)} mm, escala ${r.escala}×`);
    console.log("  Abra e olhe: texto perto do corte, fundo com fio branco na borda, foto esticada.");
    console.log("  A prévia é RGB na tela: cor no papel só se aprova com prova impressa.");
    return;
  }

  if (cmd === "medidas") {
    const entrada = pos[1];
    if (!entrada) morrer("Faltou o HTML da peça.", "Exemplo:\n  node scripts/impressao.js medidas impressos/cartao/arte.html --peca cartao");
    const htmlAbs = path.resolve(entrada);
    if (!fs.existsSync(htmlAbs)) morrer(`Não achei o arquivo: ${entrada}`);
    const tam = lerTamanho(opts.peca);
    if (!tam) morrer("Faltou dizer o tamanho final da peça.", "Exemplo: --peca cartao   ou   --peca 90x50");
    const m = medidasDaPeca({ largura: tam.largura, altura: tam.altura, sangria: opts.sangria, seguranca: opts.seguranca, marcas: opts.marcas, dpi: opts.dpi });
    if (m.segura.largura <= 0 || m.segura.altura <= 0) morrer(`Área de segurança de ${n2(opts.seguranca)} mm não cabe numa peça de ${n2(tam.largura)} × ${n2(tam.altura)} mm.`);
    const med = medirHtml(htmlAbs, m, { espera: opts.espera || 4000, lados: opts.lados });
    const r = conferirMedida(med, m, { dpiAlvo: opts.dpi });
    if (opts.json) { console.log(JSON.stringify({ tamanho: tam, medidas: m, medido: med, resultado: r }, null, 2)); process.exit(r.erros.length ? 1 : 0); }
    console.log(`\n${path.basename(htmlAbs)} — ${tam.nome}`);
    console.log(`  final ${n2(m.corte.largura)} × ${n2(m.corte.altura)} mm · arquivo ${n2(m.arquivo.largura)} × ${n2(m.arquivo.altura)} mm · área segura ${n2(m.segura.largura)} × ${n2(m.segura.altura)} mm\n`);
    process.exit(relatar(r, "Texto dentro da área segura, foto com DPI de sobra e fundo sangrando. Falta medir o PDF: `medir`."));
  }

  if (cmd === "conferir") {
    const arquivo = pos[1];
    if (!arquivo) morrer("Faltou o manifesto.", "Crie um com:\n  node scripts/impressao.js --exemplo manifesto.json");
    const abs = path.resolve(arquivo);
    if (!fs.existsSync(abs)) morrer(`Não achei o manifesto: ${arquivo}`, "Crie um com: node scripts/impressao.js --exemplo");
    let man;
    try {
      man = JSON.parse(fs.readFileSync(abs, "utf8").replace(/^\uFEFF/, ""));
    } catch (e) {
      morrer(`O manifesto não é um JSON válido: ${e.message}`, "Vírgula sobrando no fim da lista é a causa mais comum.");
    }
    const r = conferirManifesto(man, path.dirname(abs));
    if (opts.json) { console.log(JSON.stringify(r, null, 2)); process.exit(r.erros.length ? 1 : 0); }
    console.log(`\n${man.peca || path.basename(abs)}`);
    if (r.medidas) console.log(`  final ${n2(r.medidas.corte.largura)} × ${n2(r.medidas.corte.altura)} mm · arquivo ${n2(r.medidas.arquivo.largura)} × ${n2(r.medidas.arquivo.altura)} mm · área segura ${n2(r.medidas.segura.largura)} × ${n2(r.medidas.segura.altura)} mm\n`);
    process.exit(relatar(r, "PDF no tamanho com sangria, texto dentro da área segura, DPI conferido e fundo sangrando."));
  }

  morrer(`Comando desconhecido: ${cmd}`, "Válidos: tamanhos, peca, previa, medidas, medir, conferir, --exemplo, ajuda");
}

module.exports = {
  PT_POR_MM, MM_POR_POL, TAMANHOS,
  mmParaPt, ptParaMm, mmParaPx, dpiEfetivo,
  lerTamanho, medidasDaPeca,
  lerMediaBox, conferirPdf,
  acharNavegador, janelaDaPeca, gerarPrevia,
  dimensoesImagem, conferirImagem,
  conferirElemento, conferirFundo, avaliarCor,
  medidorDePagina, medirHtml, conferirMedida,
  conferirManifesto,
};

if (require.main === module) main();
