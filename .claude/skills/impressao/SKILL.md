---
name: impressao
description: >
  Monta a peça que vai pra gráfica: cartão de visita, flyer A5 ou A4, tag de produto, adesivo,
  ímã, cartaz. Sai o PDF no tamanho certo com sangria, a prévia em PNG pra olhar antes e a
  mensagem pronta pra mandar junto com o arquivo. As medidas, o DPI de cada foto e a distância
  do texto até o corte são conferidos por comando, no arquivo renderizado, não no olho.
  Use quando o usuário disser "preciso de cartão de visita", "faz um flyer",
  "quero mandar imprimir", "a gráfica pediu o arquivo com sangria", "a gráfica
  devolveu meu arquivo", "panfleto pra distribuir", "adesivo pro pote", "tag pra roupa",
  "cartaz pra vitrine", "arquivo em alta pra impressão", ou /impressao.
---

# /impressao — Arquivo pra gráfica

> **Convenção de pastas:** a saída vai em `impressos/<peça>-<AAAA-MM-DD>/`. Na convenção **por cliente**, `clientes/<Nome>/impressos/<peça>-<AAAA-MM-DD>/`. A pasta nasce na primeira peça.

Cartão de visita é a primeira coisa que padaria, salão e advogado mandam imprimir, e também a primeira que volta errada. O arquivo sai no tamanho final em vez do tamanho com sangria, o telefone fica encostado na borda, a foto veio do WhatsApp. Aqui a peça nasce com as medidas calculadas, e tanto o HTML quanto o PDF são medidos em milímetro antes de sair da sua mão.

## Dependências

- **Contexto:** `_memoria/empresa.md` — nome, endereço, telefone, o que o negócio vende, e o que a peça precisa provocar
- **Sistema visual:** `identidade/tokens.css` se existir; senão `identidade/design-guide.md`; senão as cores que o usuário disser
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — quem recebe a peça na mão, e em que situação
- **Tom:** `_memoria/preferencias.md` — cartão com texto de máquina é constrangedor de entregar
- **Molde:** `templates/design/impressao.md` — vocabulário da gráfica, tabela de medidas com fonte, régua de DPI, cor no papel, checklist de envio
- **Referências de design:** `templates/design/briefing-visual.md` (ler o pedido antes de desenhar), `templates/design/qualidade-visual.md` (tipografia e hierarquia), `templates/design/anti-generico.md` (conferir antes de entregar)
- **Referência de copy:** `templates/copy/edicao.md` — em peça impressa, cada palavra a mais ocupa espaço que não volta
- **Scripts:** `scripts/impressao.js` (medidas, prévia, medição do HTML e do PDF, conferência), `scripts/gerar-pdf.js` (HTML → PDF pelo Chrome), `scripts/verificar.js` (HTML autônomo, contraste)
- **Chrome, Chromium, Edge ou Brave** instalado: é o que renderiza o PDF, a prévia e a medição
- **Saída:** `impressos/<peça>-<AAAA-MM-DD>/` com `arte.html`, `arte.pdf`, `previa.png`, `manifesto.json` e `enviar-para-grafica.md`

---

## Workflow

**Antes de tudo: declarar a leitura.** Uma linha visível pro usuário: *"Estou lendo isso como: [peça] para [quem recebe], que precisa [o que a pessoa faz depois]."* Depois os três ajustes de `templates/design/briefing-visual.md`. Cinco segundos que tiram a peça do visual padrão.

### Passo 1 — Descobrir a peça

Uma pergunta por vez, na ordem. A primeira resposta muda as seguintes:

1. "O que você vai imprimir? (cartão de visita, flyer, tag, adesivo, ímã, cartaz)"
2. "Já sabe o tamanho, ou uso o padrão?" — mostrar o padrão da peça com `node scripts/impressao.js tamanhos`
3. "Frente só, ou frente e verso?"
4. "Quantas unidades, e pra quando?" (a resposta muda a conversa de papel e prazo)
5. "Já tem gráfica? Ela pediu alguma coisa específica?" Se pediu, a instrução dela vence tudo que está aqui

Se ele não souber o tamanho, decidir pelo uso: cartão entra na carteira, flyer de mão A5 cabe no bolso, A4 é cartaz de vitrine ou encarte, tag pende do produto.

**Se a gráfica já devolveu um arquivo** ("disseram que está errado"), o diagnóstico vem antes de qualquer desenho. Medir o PDF que existe:

```bash
node scripts/impressao.js medir <arquivo.pdf> --peca cartao
```

Ele diz em milímetro o que está fora: tamanho final sem sangria, página trocada, número de páginas. Com o diagnóstico na mão, a peça se remonta do Passo 5 em diante, agora com as medidas certas.

### Passo 2 — Levantar o conteúdo

Peça impressa não tem rolagem nem link. O que não coube, não existe. Perguntar em uma mensagem só:

> 1. "O que essa peça precisa fazer a pessoa fazer? (ligar, ir até a loja, salvar o contato, comprar)"
> 2. "Qual o nome que aparece, e como você quer ser chamado?"
> 3. "Que contatos entram? (telefone, WhatsApp, Instagram, endereço, site)"
> 4. "Tem logo? Em que arquivo?" (pedir SVG, PDF ou EPS; PNG só se for grande)
> 5. "Tem foto? Manda o arquivo original, não a versão que passou por WhatsApp"

**Corte antes de desenhar.** Cartão com cinco formas de contato não é completo, é indeciso. Dois contatos e um endereço bastam. Flyer tem uma oferta e uma ação, não três.

Se a peça faz promessa sobre preço, prazo ou resultado, a regra do CDC vale igual no papel: o que está escrito obriga. Profissional de saúde, advogado e outros regulados têm limite do conselho pra o que pode aparecer, e aí o caminho é `/publicidade-regulada` antes de imprimir.

### Passo 3 — Calcular as medidas

Por comando, sempre. Nunca somar sangria de cabeça:

```bash
node scripts/impressao.js peca cartao
node scripts/impressao.js peca 90x50 --sangria 3 --seguranca 4
```

Sai o tamanho final, o tamanho do arquivo com sangria, a área segura, o pixel a 300 DPI, o MediaBox esperado e o bloco de CSS pronto pra colar. Mostrar ao usuário as três medidas que importam, em uma linha: final, arquivo, área segura.

Se a gráfica pediu marca de corte desenhada no arquivo, acrescentar `--marcas 5`. Gráfica online quase sempre pede o contrário: sangria e mais nada.

### Passo 4 — Escrever o que vai na peça

Hierarquia antes de estética. Em cartão de visita, a ordem que funciona:

1. **Nome do negócio** (ou da pessoa, se o nome dela é a marca)
2. **O que você faz**, em quatro a seis palavras concretas. "Conserto de máquina de lavar" vence "Soluções em assistência técnica"
3. **Como falar com você**: dois canais, no máximo três
4. **Onde**, se receber cliente no local

Em flyer, a ordem é outra: o que ganha quem ler, a prova de que é verdade, e o que fazer agora. QR code entra quando leva pra algo que vale a pena no celular (cardápio, WhatsApp com mensagem pronta, mapa), nunca só pra ter. Testar o QR lido de longe, no tamanho impresso: abaixo de 20 mm de lado, leitor de celular antigo sofre.

Rodar `/revisar` no texto antes de montar a arte. Em peça impressa, erro de digitação custa a tiragem inteira.

### Passo 5 — Montar o HTML print-first

Um arquivo HTML por peça, com um `<section class="peca">` por lado. Cada `.peca` tem exatamente o tamanho do arquivo com sangria: é nesse bloco que a medição do Passo 6 se ancora. As coordenadas de tudo nascem do canto do **tamanho final**, dentro do `.arte`.

```html
<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Cartão — Padaria Aurora</title>
<style>
  :root{
    /* copiados do peca: tamanho final, sangria, área segura, marcas */
    --corte-l:90mm; --corte-a:50mm; --sangria:3mm; --seguranca:4mm; --marcas:0mm;
    /* cole aqui o :root do identidade/tokens.css */
    --tinta:#1A1A1A; --marca:#7B1E2B; --papel:#F6EFE6;
  }
  @page{ size:96mm 56mm; margin:0; }      /* = tamanho do arquivo com sangria */
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fff}
  .peca{position:relative;width:96mm;height:56mm;overflow:hidden;break-after:page;background:var(--papel)}
  /* a arte começa onde a gráfica corta: 0,0 daqui pra dentro é área impressa garantida */
  .arte{position:absolute;left:calc(var(--marcas) + var(--sangria));top:calc(var(--marcas) + var(--sangria));
        width:var(--corte-l);height:var(--corte-a)}
  /* fundo que encosta na borda usa .sangra: ele passa da linha de corte */
  .sangra{position:absolute;left:calc(-1*var(--sangria));top:calc(-1*var(--sangria));
          width:calc(var(--corte-l) + 2*var(--sangria))}
  .faixa{height:18mm;background:var(--marca)}
  .nome{position:absolute;left:6mm;top:8mm;width:50mm;font-size:16pt;color:#fff}
  .contato{position:absolute;left:6mm;top:38mm;width:44mm;font-size:9pt;color:var(--tinta)}
  /* guias: aparecem na prévia, somem no PDF e na medição */
  .guias{position:absolute;inset:0;pointer-events:none}
  .guias .corte{position:absolute;left:calc(var(--marcas) + var(--sangria));top:calc(var(--marcas) + var(--sangria));
                width:var(--corte-l);height:var(--corte-a);outline:.2mm dashed #d00}
  .guias .segura{position:absolute;left:calc(var(--marcas) + var(--sangria) + var(--seguranca));
                 top:calc(var(--marcas) + var(--sangria) + var(--seguranca));
                 width:calc(var(--corte-l) - 2*var(--seguranca));height:calc(var(--corte-a) - 2*var(--seguranca));
                 outline:.2mm dashed #06c}
  @media print{ .guias{display:none} }
</style></head>
<body>
  <section class="peca">
    <div class="arte">
      <div class="sangra"><div class="faixa"></div></div>
      <h1 class="nome" data-nome="nome do negócio">Padaria Aurora</h1>
      <p class="contato" data-nome="telefone e endereço">(11) 98888-7777 · Rua das Flores, 120</p>
    </div>
    <div class="guias"><div class="corte"></div><div class="segura"></div></div>
  </section>
  <!-- verso: outra section .peca, mesma estrutura -->
</body></html>
```

Três regras que sustentam esse esqueleto:

- **Medida em milímetro, nunca em pixel.** O CSS converte sozinho na hora de imprimir; pixel vira tamanho errado no papel
- **Fundo que encosta na borda entra no `.sangra`.** Meio caminho é o pior dos mundos: o corte varia e aparece fio branco de um lado só
- **Texto e logo ficam dentro da área segura.** O `.arte` é o limite absoluto; a linha azul da prévia é o limite confortável

Duas convenções que o medidor usa: o que estiver dentro de `.guias` (ou de `[data-impressao="ignorar"]`) fica de fora da conta, e o `data-nome` vira o nome do elemento no relatório. Sem `data-nome`, ele usa o começo do texto, que costuma bastar.

**Autonomia do arquivo.** A peça vai por WhatsApp ou e-mail, longe da pasta. Copiar o bloco `:root` do `identidade/tokens.css` pra dentro do `<style>`, e foto no mesmo diretório do HTML. Conferir com `node scripts/verificar.js html impressos/<pasta>/arte.html` antes de seguir.

### Passo 6 — Medir o HTML renderizado

Aqui o Chrome abre a peça, mede a caixa de cada texto, foto e fundo, e compara com o corte. É a etapa que pega o erro enquanto ele ainda é barato de consertar:

```bash
node scripts/impressao.js medidas impressos/<pasta>/arte.html --peca cartao
```

O que ele devolve, medido em milímetro a partir da linha de corte:

- A **folga de cada elemento** até o corte. Menos que a área de segurança vira aviso; atravessar a linha vira erro
- **DPI real de cada foto**, pelo pixel do arquivo dividido pelo espaço que ela ocupa na arte. Abaixo de 150 é erro, abaixo de 300 é aviso
- A **sangria de cada fundo**: cor cheia ou foto que morre em cima da linha de corte é erro, porque é ali que nasce o fio branco
- **Tamanho da peça**: se nenhum bloco tem o tamanho do arquivo com sangria, ele diz isso na primeira linha, e costuma significar que a peça foi montada no tamanho final

As opções são as mesmas do `peca`: se a peça foi calculada com `--marcas 5` ou `--seguranca 5`, esses valores entram aqui também, senão a régua muda no meio do caminho.

Cada reprovação se conserta no CSS, e o comando roda de novo. Só passar adiante quando sair "Tudo certo", ou quando o aviso que restou for decisão consciente do usuário (foto de 200 DPI em cartaz visto de longe, por exemplo).

### Passo 7 — Gerar o PDF e a prévia

```bash
node scripts/gerar-pdf.js impressos/<pasta>/arte.html
node scripts/impressao.js previa impressos/<pasta>/arte.html impressos/<pasta>/previa.png --peca cartao --lados 2
```

O PDF é o que vai pra gráfica, sem as guias. A prévia empilha os lados num PNG só, com a linha de corte e a área segura desenhadas, e é o que o usuário olha pra aprovar.

**Abrir a prévia e olhar de verdade** (a ferramenta de leitura de imagem abre o PNG). O que procurar: texto atravessando a linha vermelha, fundo que para antes da borda, foto esticada, palavra órfã no título, contraste fraco entre tinta e papel.

Em peça pequena o `gerar-pdf.js` avisa "N KB para 2 páginas é pouco" e sai com erro. Num cartão de 96 × 56 mm sem foto isso é esperado: o alerta foi calibrado pra e-book. O que vale é a medição do passo seguinte.

### Passo 8 — Conferir o arquivo final

Escrever `manifesto.json` na pasta da peça. Ele aponta pro HTML e pro PDF, e guarda o que foi decidido:

```json
{
  "peca": "Cartão de visita — Padaria Aurora",
  "tamanho": "cartao",
  "sangria_mm": 3,
  "seguranca_mm": 4,
  "dpi": 300,
  "paginas": 2,
  "html": "arte.html",
  "pdf": "arte.pdf",
  "cores": [{ "nome": "vinho da marca", "hex": "#7B1E2B", "area": "grande" }]
}
```

```bash
node scripts/impressao.js conferir impressos/<pasta>/manifesto.json
```

Os campos `sangria_mm`, `seguranca_mm` e `marcas_mm` repetem o que foi decidido no Passo 3 (o padrão é 3, 4 e 0). Com `html` no manifesto, o comando refaz a medição do Passo 6 no arquivo renderizado e ainda lê o MediaBox de cada página do PDF, compara em milímetro com o tamanho de sangria, confere o número de páginas e avisa o que muda na cor ao imprimir. Sem `html`, dá pra descrever os elementos na mão (`elementos`, `fundos`, `imagens`, com `x_mm`, `y_mm`, `largura_mm`, `altura_mm` medidos do canto do tamanho final), e o comando avisa que a conferência ficou valendo o que está escrito, não o que o Chrome desenha.

Se algo reprovar, o conserto é no HTML, e o PDF se gera de novo. Nunca ajustar o manifesto pra bater com o erro.

### Passo 9 — Entregar

```
✓ impressos/cartao-padaria-aurora-2026-09-23/
  arte.html                 ← fonte editável
  arte.pdf                  ← 2 páginas, 96 × 56 mm (90 × 50 + 3 mm de sangria)
  previa.png                ← frente e verso, com corte e área segura marcados
  manifesto.json            ← o que foi conferido
  enviar-para-grafica.md    ← texto pronto pra colar no pedido

Conferido por comando: tamanho do PDF, DPI do logo, folga até o corte, sangria do fundo.
```

O `enviar-para-grafica.md` segue o checklist de `templates/design/impressao.md`: peça, quantidade, tamanho final, tamanho do arquivo, páginas, cor em RGB com pedido de conversão, papel, acabamento e prazo. Fecha pedindo confirmação antes de rodar a tiragem.

Encerrar com o que fazer agora: pedir orçamento em duas gráficas, com o mesmo texto. A diferença de preço entre elas costuma ser grande na mesma peça, e o arquivo é o mesmo.

---

## Regras

- **Sangria é conta, não palpite.** Toda medida sai de `node scripts/impressao.js peca`, o HTML passa por `medidas` e o PDF final passa por `conferir`. Peça enviada sem medição é peça que volta
- **A prévia se olha, sempre.** Gerar o PNG e abrir. O que o comando mede é geometria; o que só o olho pega é palavra órfã, hierarquia fraca e foto feia
- Foto pequena não se amplia. Subir a resolução inventa pixel e continua borrado. Ou consegue o original, ou usa a foto menor na arte, ou tira outra
- **Cor no papel não se promete.** O PDF sai em RGB, a gráfica converte com o perfil dela. Quando a cor da marca é o ponto da peça, pedir prova impressa antes da tiragem, e dizer isso ao usuário antes de ele aprovar
- O padrão da gráfica vence o daqui. Se ela pede marca de corte, PDF/X ou sangria diferente de 3 mm, é a instrução dela que vale, e `--sangria` e `--marcas` existem pra isso
- **Nunca inventar contato.** Telefone, endereço, CNPJ e rede social entram como o usuário escreveu, ou como `[a confirmar]` visível no arquivo. Cartão com telefone errado é a tiragem no lixo. O mesmo vale pra preço, prazo e medida: número que ninguém confirmou não entra na arte
- Antes de gerar o PDF, ler o telefone e o endereço em voz alta com o usuário, dígito por dígito. É o erro mais caro e o mais fácil de evitar
- **Dado de pessoa não vai pra peça sem autorização.** Nome de cliente em depoimento impresso, foto de pessoa reconhecível e imagem de criança precisam de permissão registrada (LGPD), e o arquivo com esse material não vai pra repositório público
- **Promessa impressa obriga.** Preço, prazo e condição valem como estão no papel, pelo CDC. Se a peça tem oferta com validade, a data entra escrita
- **Isto não é parecer jurídico nem serviço de gráfica.** O que está aqui sobre CDC e conselho profissional é orientação pra não imprimir besteira; caso concreto vai pro advogado ou pro contador. Acabamento especial (verniz localizado, corte faca, hot stamping), lona de banner e conversão para PDF/X ficam com o designer da gráfica, e publicidade de área regulada passa por `/publicidade-regulada` antes de imprimir
- **Fronteira com as vizinhas:** material de leitura em PDF (e-book, apostila, manual) é `/documento`; peça de tela (feed, story, carrossel) é `/carrossel`; deck de reunião é `/apresentacao`; a cor e a tipografia da marca vêm do `/design-system`, e esta skill consome, não redefine; a avaliação visual da peça pronta é `/revisar-design`
