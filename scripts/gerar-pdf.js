#!/usr/bin/env node
/**
 * Contex OS — gerar-pdf.js
 * Transforma HTML em PDF e confere o resultado.
 *
 * Existe porque o comando cru do Chrome headless falha de três formas silenciosas:
 * caminho do navegador muda por sistema, `file://` precisa ser absoluto, e sem
 * tempo de carregamento o PDF sai com a fonte errada (ou em branco).
 *
 * Uso:
 *   node scripts/gerar-pdf.js <arquivo.html> [saida.pdf]
 *
 * Opções:
 *   --espera <ms>    tempo pra fonte e imagem carregarem (padrão: 4000)
 *   --paisagem       força orientação (o normal é o @page do CSS mandar)
 *   --abrir          abre o PDF no fim
 *
 * Node 18+. Usa o Chrome/Chromium/Edge/Brave que já existe na máquina.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, execSync } = require("child_process");

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

/** Acha um navegador baseado em Chromium, em qualquer sistema. */
function acharNavegador() {
  const candidatos = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    ],
    linux: [
      "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium",
      "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge", "/usr/bin/brave-browser",
      "/snap/bin/chromium",
    ],
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
  };

  for (const p of candidatos[process.platform] || []) {
    if (fs.existsSync(p)) return p;
  }
  // último recurso: procurar no PATH
  for (const nome of ["google-chrome", "chromium", "chrome", "msedge"]) {
    try {
      const achado = execSync(`command -v ${nome}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      if (achado) return achado;
    } catch {}
  }
  return null;
}

/** Conta páginas e detecta PDF em branco, sem depender de biblioteca. */
function inspecionarPDF(arquivo) {
  const buf = fs.readFileSync(arquivo);
  const txt = buf.toString("latin1");
  const paginas = (txt.match(/\/Type\s*\/Page[^s]/g) || []).length;
  // um PDF só com estrutura, sem conteúdo desenhado, fica minúsculo
  const kb = Math.round(buf.length / 1024);
  const temConteudo = /\/Contents/.test(txt) && buf.length > 3000;
  return { paginas, kb, temConteudo, cabecalhoOk: txt.startsWith("%PDF-") };
}

function main() {
  const args = process.argv.slice(2);
  const opts = { espera: 4000, paisagem: false, abrir: false };
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--espera") opts.espera = parseInt(args[++i]) || 4000;
    else if (args[i] === "--paisagem") opts.paisagem = true;
    else if (args[i] === "--abrir") opts.abrir = true;
    else if (args[i].startsWith("--")) morrer(`Opção desconhecida: ${args[i]}`, "Válidas: --espera, --paisagem, --abrir");
    else pos.push(args[i]);
  }

  const entrada = pos[0];
  if (!entrada) {
    morrer("Faltou o arquivo HTML.", "Exemplo:\n  node scripts/gerar-pdf.js materiais/guia/guia.html");
  }
  const htmlAbs = path.resolve(entrada);
  if (!fs.existsSync(htmlAbs)) morrer(`Não achei o arquivo: ${entrada}`, `Procurei em ${htmlAbs}`);

  const saida = path.resolve(pos[1] || htmlAbs.replace(/\.html?$/i, ".pdf"));

  const navegador = acharNavegador();
  if (!navegador) {
    morrer(
      "Não achei Chrome, Chromium, Edge nem Brave nessa máquina.",
      "Instale um deles (o Chrome resolve: google.com/chrome) e rode de novo.\n" +
      "  Sem navegador não há como transformar HTML em PDF com fidelidade de impressão."
    );
  }

  console.log(`→ ${path.basename(navegador)}`);
  console.log(`→ ${curto(htmlAbs)} → ${curto(saida)}`);

  // file:// sempre absoluto, com espaço e acento escapados — erro clássico
  const url = "file://" + htmlAbs.split(path.sep).map(encodeURIComponent).join("/");

  const flags = [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--allow-file-access-from-files",
    // dá tempo pra webfont e imagem carregarem: sem isso o PDF sai com a fonte
    // de sistema no lugar da fonte da marca, e ninguém entende por quê
    `--virtual-time-budget=${opts.espera}`,
    `--print-to-pdf=${saida}`,
  ];
  if (opts.paisagem) flags.push("--landscape");
  flags.push(url);

  try {
    execFileSync(navegador, flags, { stdio: ["ignore", "ignore", "pipe"], timeout: 120000 });
  } catch (e) {
    const err = (e.stderr || "").toString().slice(0, 300);
    morrer(`O navegador falhou ao gerar o PDF.${err ? "\n  " + err : ""}`,
      "Se a mensagem falar de sandbox, tente rodar de novo; se persistir, abra o HTML no navegador e use Imprimir → Salvar como PDF.");
  }

  if (!fs.existsSync(saida)) morrer("O navegador terminou mas o PDF não foi criado.", "Confira se a pasta de destino existe e se há permissão de escrita.");

  const info = inspecionarPDF(saida);
  if (!info.cabecalhoOk) morrer("O arquivo gerado não é um PDF válido.");

  console.log(`✓ ${curto(saida)} — ${info.paginas} página(s), ${info.kb} KB`);

  let alerta = 0;
  if (!info.temConteudo) { console.log("  ✖ o PDF parece vazio — página em branco"); alerta++; }
  if (info.paginas === 0) { console.log("  ✖ nenhuma página detectada"); alerta++; }
  if (info.kb < 20 && info.paginas > 1) { console.log(`  ✖ ${info.kb} KB para ${info.paginas} páginas é pouco — provavelmente o conteúdo não carregou (aumente --espera)`); alerta++; }

  if (!alerta) {
    console.log("  Confira antes de enviar: título órfão no pé da página, tabela cortada,");
    console.log("  imagem estourando a margem e a fonte da marca (não a do sistema).");
  }

  if (opts.abrir && process.platform === "darwin") {
    try { execFileSync("/usr/bin/open", [saida]); } catch {}
  }
  process.exit(alerta ? 1 : 0);
}

main();
