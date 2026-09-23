# Assinatura de e-mail — o que sobrevive em cada programa

Referência da `/assinatura-email`. O `email-html.md` trata da campanha que vai
pra uma lista. Aqui o problema é menor e mais chato: um bloco de 400 px que vai
junto de **todo** e-mail que a pessoa manda, ano após ano, e que cada programa
de e-mail reescreve do seu jeito na hora de salvar.

A diferença prática: numa campanha, o HTML que você escreveu é o HTML que sai.
Numa assinatura, o HTML passa pelo editor do Gmail, ou pelo editor do Outlook,
ou pelo arquivo `.mailsignature` do Apple Mail, e cada um deles corta o que não
entende antes de guardar. Por isso a assinatura é mais conservadora que a
campanha, não menos.

---

## O esqueleto

- **Tabela de uma linha**, com `role="presentation"`. Duas células quando há logo
  ao lado; uma só quando o logo fica em cima
- **Largura de 400 a 480 px**, declarada em atributo `width` **e** em `style`,
  com `max-width:100%` junto. O teto é 600 px; acima disso empurra o painel de
  leitura. Os dois lugares porque cada motor lê um deles: o atributo segura a
  medida no Word, o `style` segura no WebKit e no navegador. E é por isso que
  400 a 480 px é faixa, não capricho — no Outlook clássico a medida em CSS ainda
  cresce com a escala do Windows (veja abaixo), e 480 px é o maior número que
  aguenta isso sem invadir a janela
- **CSS inline em cada elemento.** Bloco `<style>` não sobrevive ao editor de
  assinatura do Gmail, e token (`var(--cor)`) não existe dentro do e-mail: o
  valor do `tokens.css` entra escrito, em hexadecimal
- **Fonte do sistema**: Arial, Helvetica, Georgia, Verdana, Tahoma. Fonte da
  marca por `@font-face` não carrega, e o que aparece é o fallback, quase sempre
  Times New Roman
- **Altura de linha folgada** (1,4) e corpo de 13 a 14 px. Menor que 12 px vira
  ilegível no celular, que é onde metade dos e-mails é lida

---

## Logo hospedado, sempre

O logo entra por URL `https://` de um PNG que você controla. Não como base64,
não como anexo, não como SVG.

| Jeito | O que acontece |
|---|---|
| `src="https://.../logo.png"` | funciona em todos; a imagem pode chegar bloqueada, e aí vale o `alt` |
| `src="data:image/png;base64,..."` | o Gmail não mostra, e o código do logo sozinho passa dos 10.000 caracteres que o editor de assinatura aceita |
| imagem anexada (CID) | vira clipe de anexo em todo e-mail enviado, e alguns filtros tratam como suspeito |
| SVG | o Gmail não renderiza |

Três contas que o `scripts/assinatura-email.js` faz por você: o peso do HTML
(teto de 20 KB), a contagem de caracteres (teto de 10.000, que é o limite do
campo de assinatura do Gmail) e o contraste de cada cor do spec sobre o branco.

**Nitidez:** exporte o PNG com o dobro da medida de exibição e declare a medida
menor no HTML. Logo exibido a 120 × 40 px sai do arquivo em 240 × 80 px. É o que
mantém a borda limpa em tela de alta densidade.

**Medida do logo só em atributo.** No `<img>`, `width="120" height="40"` e nada
de `width:120px` no `style`. Motivo no bloco da escala do Windows, mais abaixo:
o atributo continua em pixel no motor do Word, e o pixel do CSS não. O `style`
da imagem fica com o que não é medida: `display:block`, `border:0` e a fonte e a
cor do texto alternativo, que é o que aparece quando a imagem chega bloqueada.

**Onde hospedar:** no próprio site, numa pasta que ninguém vai reorganizar. O
link precisa durar mais que a assinatura. Serviço de hospedagem de imagem
grátis costuma expirar, e aí o logo some de todos os e-mails já enviados.

---

## Compatibilidade, por programa

Conferido em 23/09/2026. Cada linha diz o que muda, não o que é bonito.

| Programa | O que ele faz com a assinatura |
|---|---|
| **Gmail (web)** | editor visual: aceita colar do navegador, não aceita código. Descarta `<style>`, classe e `@media`. Teto de 10.000 caracteres no campo |
| **Gmail (app Android/iOS)** | assinatura do app é **texto puro** e separada da assinatura da web. Por isso a `assinatura.txt` existe |
| **Outlook clássico (Windows)** | renderiza com o motor do Word: sem `flex`, sem `grid`, sem `background-image`, sem `max-width`. Com a escala do sistema acima de 100%, a medida em CSS cresce (veja abaixo) |
| **Outlook novo e Outlook na web** | motor de navegador, bem mais tolerante. Ainda reescreve parte do HTML ao salvar |
| **Apple Mail (macOS)** | usa o WebKit e renderiza quase tudo. A instalação é manual, editando o arquivo `.mailsignature`, e ele reescreve o arquivo se você não bloquear |
| **Apple Mail (iOS)** | assinatura do iPhone é separada e aceita texto com formatação simples. Costuma ser colada do Mac |
| **Thunderbird** | aceita arquivo HTML externo, e é o único que lê o `assinatura.html` direto |

### A escala do Windows, com o mecanismo certo

A escala do Windows é a causa mais comum de "o logo do fulano aparece gigante
pra mim", e a explicação que corre por aí ("o Outlook multiplica tudo") está
errada de um jeito que atrapalha o conserto. O que o motor do Word faz, acima de
96 DPI, é **converter pixel de CSS em ponto** e deixar o pixel de atributo
HTML em paz. Ponto é unidade relativa: a 120 DPI (125%) e a 144 DPI (150%) ele
cresce junto com a escala. Pixel de atributo, não.

Daí as duas consequências práticas, que são o oposto do palpite comum:

1. **No `<img>`, a medida vai só em atributo.** `width="120" height="40"` fica
   de 120 px em qualquer escala; `style="width:120px"` viraria 120 pt, que a
   150% aparece perto de 180 px. É esse o logo gigante
2. **Na `<table>`, valem os dois** — atributo e `style` —, porque sem o `style`
   o WebKit e o navegador (de onde você copia a assinatura) medem de outro
   jeito. Como o `style` da tabela cresce na escala, a largura precisa ter
   folga: daí a faixa de 400 a 480 px em vez dos 600 px do teto

Em campanha existe o remendo de `<o:PixelsPerInch>96</o:PixelsPerInch>` num
comentário condicional. **Numa assinatura ele não serve:** o editor do Gmail
descarta comentário condicional e bloco `<style>` na hora de salvar. O que sobra
é o de cima, mais logo pequeno (120 a 160 px), mais o print de alguém com
Outlook no Windows.

---

## Modo escuro

Metade dos programas inverte a cor por conta própria. O que reduz o estrago:

- Texto quase preto (`#14181f`) sobre fundo branco inverte melhor do que cinza médio
- PNG com fundo transparente some quando o fundo vira preto. Logo escuro precisa
  de versão clara, ou de fundo próprio no arquivo
- Linha divisória em cinza claro vira linha invisível no escuro. Prefira uma
  borda de 3 px numa cor da marca, que sobrevive aos dois modos

---

## WhatsApp com mensagem pronta

O link é `https://wa.me/<E.164 sem sinais>?text=<mensagem codificada>`:

```
https://wa.me/5513997287738?text=Ol%C3%A1%2C%20Marina!%20Vim%20pela%20assinatura%20de%20e-mail.
```

A mensagem pré-preenchida faz duas coisas. Poupa a pessoa de explicar quem é, e
marca a origem do contato: quem chega dizendo "vim pela assinatura de e-mail" é
contabilizado sem você perguntar nada.

**O WhatsApp ignora UTM.** Parâmetro `utm_source` no `wa.me` não aparece em
relatório nenhum, porque não existe página pra registrar a visita. Por isso a
origem vai dentro do texto. Já o link do **site** na assinatura aceita UTM
normal, na convenção do `scripts/utm.js`
(`utm_source=assinatura-email&utm_medium=email&utm_campaign=assinatura`), e aí o
GA4 mostra quanta visita vem da assinatura da equipe.

---

## O que não entra

- **Foto da pessoa**, na maioria dos casos. Pesa, chega bloqueada e envelhece
- **Ícone de rede social como imagem**: são 4 a 6 pedidos de rede em todo e-mail,
  e com imagem bloqueada resta um punhado de quadrados vazios. Nome escrito
  ("Instagram · LinkedIn") funciona melhor e é clicável do mesmo jeito
- **"Pense antes de imprimir"** e frase motivacional. Ocupa a única linha que
  ainda tinha atenção
- **GIF animado**: o Outlook clássico mostra só o primeiro quadro
- **Pixel de rastreio** na assinatura de e-mail pessoal: é coleta de dado sem
  aviso, e entra no campo da LGPD sem necessidade nenhuma
- **Aviso jurídico de 12 linhas.** Se precisar de aviso de sigilo, duas linhas em
  11 px resolvem. O texto longo não muda o valor legal e domina a assinatura
- **Anexo vCard** automático. Vira clipe de anexo em toda mensagem, inclusive nas
  respostas de uma palavra

---

## Acessibilidade e leitura

- `role="presentation"` na tabela, senão o leitor de tela anuncia a estrutura
  antes de cada linha
- `alt` em toda imagem, com estilo junto: o texto alternativo herda a cor e a
  fonte declaradas no `style` da `<img>` e aparece no lugar dela
- Contraste de 4.5:1 no texto, inclusive no cinza de apoio. O `gerar` já avisa
  quando alguma cor do spec não chega lá; pra conferir uma cor solta,
  `node scripts/verificar.js contraste "#5b6472" "#ffffff"` (o `#5b6472` do
  padrão dá 5.98:1 sobre branco)
- Telefone e e-mail como link (`tel:`, `mailto:`), não como texto solto: no
  celular, é a diferença entre um toque e copiar na mão

---

## Antes de distribuir pra equipe

1. `node scripts/assinatura-email.js conferir <pasta>` — peso, caracteres,
   largura, CSS proibido e resposta HTTP de cada link
2. Abra o `assinatura.html` no navegador e olhe com a imagem bloqueada
3. Mande um e-mail de teste e responda ele: a assinatura aparece duas vezes na
   conversa, e é aí que o exagero aparece
4. Peça pra uma pessoa com Outlook no Windows mandar um print. É o programa que
   mais diverge, e o único jeito honesto de conferir é ver

---

## Fontes

Cada link abaixo foi aberto em **23/09/2026**, e respondeu 200.

- Teto de 10.000 caracteres no campo de assinatura do Gmail. O Google não
  publica esse número em página de documentação; o que existe é a mensagem de
  erro ("Signature exceeds maximum length of 10000 characters") aparecendo no
  fórum oficial e o número repetido por quem vende assinatura:
  https://support.google.com/mail/thread/188868195/getting-error-saying-my-email-signature-is-too-long-but-it-is-well-under-the-10-000-character-limit
  e https://support.xink.io/support/solutions/articles/1000299609-gmail-signature-too-long-error-10000-character-limit-
  Trate como régua de trabalho, não como cláusula: o script avisa a partir de
  8.000 caracteres justamente porque a contagem do Gmail inclui o que ele
  reescreve ao salvar
- Gmail não mostra imagem em base64; Apple Mail e Yahoo mostram, e o Outlook
  mostra em parte: https://www.caniemail.com/features/image-base64/
- CSS que o Gmail aceita em e-mail, direto da documentação do Google:
  https://developers.google.com/workspace/gmail/design/css
- Outlook do Windows renderiza com o motor do Word, e a lista de HTML e CSS que
  ele suporta, na documentação da Microsoft:
  https://learn.microsoft.com/en-us/previous-versions/office/developer/office-2007/aa338201(v=office.12)
- A escala do Windows converte pixel de CSS em ponto e deixa o pixel de atributo
  intacto ("Widths and heights specified in HTML attributes remain
  pixel values. Other pixel values (px) are converted to point (pt) values
  instead"), com o remendo de VML que não serve pra assinatura:
  https://www.emailonacid.com/blog/article/email-development/dpi-scaling-in-outlook-2007-2013/
- Logo exportado em 2× da medida de exibição, e o que a escala faz com imagem de
  assinatura:
  https://support.xink.io/support/solutions/articles/1000334485-logo-guidelines-for-outlook-email-signatures
- Instalação pelo arquivo `.mailsignature` no Apple Mail, com a pasta `V<n>` e o
  passo de bloquear o arquivo:
  https://johanronsse.be/2022/07/26/adding-an-html-signature-to-apple-mail-and-have-it-show-up-properly
- Suporte de recurso por programa de e-mail, tabela mantida pela comunidade:
  https://www.caniemail.com
- Pixel de rastreio e telefone de funcionário são dado pessoal, e a Lei
  13.709/2018 (LGPD) define isso no art. 5º, I, e lista as bases de tratamento
  no art. 7º:
  https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

Número de versão e caminho de menu mudam. Quando o passo não bater com a tela do
usuário, a conferência é a tela dele, não este arquivo. E o único jeito honesto
de saber como a assinatura chega no Outlook do Windows continua sendo o print de
quem usa Outlook no Windows.
