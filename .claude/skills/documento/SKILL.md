---
name: documento
description: >
  Produz material rico em PDF com qualidade editorial (e-book, apostila, guia, manual,
  relatório), a partir de HTML print-first renderizado por Chrome headless. Capa, sumário, tipografia de leitura,
  numeração e quebras controladas. Use quando o usuário pedir "e-book", "apostila", "guia em PDF",
  "material pra baixar", "isca digital", "manual", "documento bonito", ou /documento.
---

# /documento — Material rico em PDF

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

Material que a pessoa baixa, imprime e guarda. O padrão de qualidade aqui é livro, não slide exportado.

## Dependências

- **Sistema visual:** `identidade/tokens.css` se existir; senão `identidade/design-guide.md`
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Conteúdo:** `_memoria/empresa.md`, dossiê em `pesquisa/` se houver
- **Tom:** `_memoria/preferencias.md`
- **Chrome/Chromium** pra gerar o PDF (headless)
- **Saída:** `materiais/<nome>/` — ou `clientes/<Nome>/materiais/` quando for entrega de cliente
- **Referências de design** (ler antes de produzir):
  - `templates/design/briefing-visual.md` — declarar a leitura do briefing e definir os três ajustes
  - `templates/design/qualidade-visual.md` — tipografia, cor, layout, acabamento
  - `templates/design/anti-generico.md` — conferir antes de entregar
- **Referências de copy:**
  - `templates/copy/edicao.md` — lista negra de clichê, gordura e regras de estilo

---

## Workflow

**Antes de tudo: declarar a leitura.** Uma linha, visível pro usuário: *"Estou lendo isso como: [peça] para [público], com linguagem [vibe]."* Depois definir os três ajustes (variação / movimento / densidade) conforme `templates/design/briefing-visual.md`. É o passo que impede a peça de cair no visual padrão de IA, e custa cinco segundos.

### Passo 1 — Definir formato e função

1. "Qual o tipo? (e-book / apostila / guia prático / manual / relatório)"
2. "Pra quem, e o que essa pessoa faz depois de ler?"
3. "Vai ser lido na tela, impresso, ou os dois?" — muda margem, tamanho de fonte e uso de cor
4. "É isca digital (troca por e-mail), material de curso, ou entrega de cliente?"

Se for isca digital, o documento precisa **entregar valor real**: material fraco queima a lista.

### Passo 2 — Estruturar antes de escrever

Montar o sumário e aprovar com o usuário antes de produzir. Estrutura que funciona:

1. **Capa** — título, subtítulo que explica o benefício, marca
2. **Sumário** — com número de página
3. **Introdução curta** — pra quem é, o que vai aprender, o que **não** está aqui
4. **Capítulos** — um conceito por capítulo, cada um fechando com o que fazer com aquilo
5. **Parte prática** — checklist, tabela, passo a passo, modelo pra preencher
6. **Fechamento** — próximo passo concreto (aqui entra o CTA, discreto)
7. **Sobre / contato** — última página

Um documento de 12 páginas bem construídas vale mais que 40 de enchimento. Dizer isso ao usuário se ele pedir "umas 50 páginas".

### Passo 3 — Escrever o conteúdo

Seguir `preferencias.md`. Regras específicas de material longo:

- Um conceito por seção, com exemplo concreto logo depois da explicação
- Elemento visual a cada 2-3 páginas (tabela, box de destaque, diagrama simples, citação) — parede de texto faz abandonar
- Nada de "neste capítulo veremos" e nada de recapitulação no fim de cada capítulo
- Dado com fonte e data, no rodapé ou em nota
- Rodar `/revisar` no texto completo antes de montar o HTML

### Passo 4 — Montar o HTML print-first

O CSS nasce pensando em página física, não em rolagem:

```css
@page { size: A4; margin: 22mm 20mm; }
@media print {
  h1, h2 { break-after: avoid; }       /* título não fica órfão no pé da página */
  figure, table, .box { break-inside: avoid; }
  p { orphans: 3; widows: 3; }
}
```

**Tipografia de leitura longa:** corpo 11-12pt, entrelinha 1.5-1.6, largura de linha 65-75 caracteres, serifada ou sans de boa legibilidade. Título com hierarquia clara e escala consistente.

**Estrutura da página:** cabeçalho discreto (título curto), rodapé com numeração. Capa e sumário sem número.

**Se for pra impressão em gráfica:** evitar fundo escuro em página inteira (custo e mancha), garantir que o conteúdo funciona em preto e branco, e deixar margem interna maior se houver encadernação.

### Passo 5 — Gerar o PDF

```bash
node scripts/gerar-pdf.js materiais/<nome>/documento.html
```

O script acha o navegador sozinho (Chrome, Chromium, Edge ou Brave, em qualquer sistema), resolve o caminho, **espera as fontes carregarem** e confere o resultado, dizendo quantas páginas saíram e acusando PDF em branco. Aceita `--espera 8000` quando a peça tem muita imagem.

Não montar o comando do Chrome na mão: o caminho do navegador muda por sistema, o `file://` precisa ser absoluto e escapado, e sem tempo de carregamento o PDF sai com a fonte do sistema no lugar da fonte da marca. São três formas silenciosas de errar.

Conferir o PDF gerado antes de entregar: página em branco sobrando, título órfão, tabela cortada no meio, sumário com página errada, imagem estourando a margem. Se algo quebrou, ajustar o CSS e gerar de novo, não entregar PDF que o usuário vai abrir e ver o defeito.

### Passo 6 — Entregar

```
✓ materiais/<nome>/
  documento.html    ← fonte editável
  documento.pdf     ← [N] páginas, pronto pra enviar
  imagens/

Conferido: sumário batendo, sem título órfão, sem tabela cortada.

Pra editar depois: mexe no HTML e gera o PDF de novo (comando no README da pasta).
```

Se for isca digital, oferecer o encadeamento:
> "Quer que eu monte a landing de captura desse material? (`/landing`)"

---

## Quando o material é isca digital

Material trocado por contato tem regra própria, e a maioria falha em uma das quatro:

1. **Resolve um problema específico**, não um tema amplo. "Checklist de 12 pontos pra conferir antes de assinar contrato de obra" vence "Guia completo de construção"
2. **Casa com o estágio da pessoa:**
   - quem está descobrindo o problema → checklist, guia curto, calculadora simples
   - quem está comparando → comparativo, critérios de escolha, planilha de orçamento
   - quem está decidindo → case detalhado, demonstração, proposta modelo
3. **Alto valor percebido, baixo tempo de consumo.** 8 páginas úteis vencem 40 páginas de enchimento — e são mais lidas
4. **Leva naturalmente ao serviço.** Se o material resolve tudo, ninguém contrata; se não resolve nada, queima a lista. O ponto certo: resolve o "o quê" e mostra que o "como" dá trabalho

**Sobre pedir o contato:** pedir só o que vai usar. Nome e WhatsApp (ou e-mail) bastam. Cada campo extra derruba a conversão, e cargo/empresa/faturamento se descobre na conversa. Aviso de privacidade é obrigatório (LGPD).



## Autonomia do arquivo (obrigatório)

A peça vai ser enviada por WhatsApp, e-mail ou Drive: sozinha, longe da pasta. Se depender do `identidade/tokens.css` por caminho relativo, chega sem estilo: em teste real, um deck ficou **preto sobre preto**, ilegível.

**Copiar o bloco `:root` do `tokens.css` pra dentro do `<style>` da própria peça.** O `tokens.css` continua sendo a fonte da verdade; o que muda é a peça carregar uma cópia inline. Google Fonts é a única dependência externa aceita.

Antes de entregar:

```bash
node scripts/verificar.js html <caminho-da-peça>.html
```

Ele acusa CSS local externo, `var()` sem fallback, `@page` inválido, placeholder esquecido e link vazio (`href="#"`, `mailto:` sem endereço, `wa.me` sem número). Só entregar quando sair "Tudo certo".

## Regras

- **Sempre conferir o PDF renderizado.** HTML que parece certo na tela quebra na paginação — é o erro mais comum aqui
- Nunca inflar com enchimento pra bater número de páginas
- Todo dado com fonte e data
- Imagem em resolução suficiente pra impressão (mínimo 150 DPI no tamanho final)
- Se `tokens.css` existir, usar; a versão impressa pode precisar de ajuste de contraste — declarar isso no `@media print`
- CTA no fechamento, discreto. Material que é anúncio disfarçado não é guardado
- Se o conteúdo é técnico/regulado, marcar que precisa de revisão profissional antes de distribuir
- Peça que a gráfica corta (cartão, flyer, tag, adesivo, ímã) é `/impressao`: ela nasce com sangria, marca de corte e área de segurança, que o PDF de leitura daqui não tem
- Documento com dado de cliente dentro não vai pro repositório público — avisar
