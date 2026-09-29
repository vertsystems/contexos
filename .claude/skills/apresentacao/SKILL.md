---
name: apresentacao
description: >
  Monta deck 16:9 com a identidade da marca pra reunião, pitch, treinamento ou aula, uma ideia por
  slide, notas do apresentador, e duas versões (uma pra apresentar, uma pra enviar). Sai em HTML
  navegável e PDF. Use quando o usuário pedir "apresentação", "slides", "deck", "pitch",
  "vou apresentar pra", "PowerPoint", ou /apresentacao.
---

# /apresentacao — Deck de reunião e pitch

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

Slide não é documento projetado. Se dá pra ler tudo na tela, não precisava da reunião.

## Dependências

- **Sistema visual:** `identidade/tokens.css` se existir; senão `identidade/design-guide.md`
- **Oferta ativa:** `_memoria/oferta.md` se existir (`/oferta`) — o que está sendo vendido, garantia, preço
- **Contexto:** `_memoria/empresa.md`, `_memoria/preferencias.md`
- **Se for pitch comercial:** proposta em `propostas/` (o deck é a versão falada dela)
- **Chrome/Chromium** pra exportar PDF
- **Saída:** `apresentacoes/<nome>-<YYYY-MM-DD>/`
- **Referências de design** (ler antes de produzir):
  - `templates/design/briefing-visual.md` — declarar a leitura do briefing e definir os três ajustes
  - `templates/design/qualidade-visual.md` — tipografia, cor, layout, acabamento
  - `templates/design/anti-generico.md` — conferir antes de entregar
- **Referências de copy:**
  - `templates/copy/metodo.md` — diagnóstico antes de escrever: função, consciência, pilar, motor, barreira
  - `templates/copy/ganchos.md` — os quatro tempos (gancho, exposição, virada, solução), onde o gancho começa e a régua de qualidade

---

## Workflow

**Antes de tudo: declarar a leitura.** Uma linha, visível pro usuário: *"Estou lendo isso como: [peça] para [público], com linguagem [vibe]."* Depois definir os três ajustes (variação / movimento / densidade) conforme `templates/design/briefing-visual.md`. É o passo que impede a peça de cair no visual padrão de IA, e custa cinco segundos.

### Passo 1 — Quem, onde, quanto tempo

1. "Pra quem você apresenta e o que essa pessoa decide depois?"
2. "Quanto tempo você tem?" — 10 min são ~8 slides; 30 min, ~15. Mais que isso é palestra, não reunião
3. "Vai apresentar ao vivo, enviar por e-mail, ou os dois?"
4. "Qual a única coisa que a plateia precisa sair lembrando?"

A resposta 4 é a espinha. Todo slide que não sustenta ela é candidato a sair.

### Passo 2 — Roteiro antes de slide

Aprovar o roteiro em texto primeiro. Estrutura para pitch comercial:

1. **Abertura** — o problema do cliente, na fala dele
2. **Consequência** — o custo de não resolver (número, quando houver)
3. **Virada** — o que muda com a solução
4. **Como funciona** — 3 blocos, sem detalhe técnico demais
5. **Prova** — case, dado, cliente
6. **Investimento** — valor, sem enrolar
7. **Próximo passo** — uma ação, com data

Para treinamento/aula: contexto → conceito → exemplo → prática → recapitulação.

### Passo 3 — Montar os slides

**Regra dura: uma ideia por slide.** Se o slide precisa de duas frases pra explicar, são dois slides.

- Título do slide é uma **afirmação**, não um rótulo: "Conservação errada custa R$ 4 mil por mês" em vez de "Sobre conservação"
- No máximo ~25 palavras por slide
- Número grande quando o dado é o argumento
- Zero bullet aninhado. Zero parágrafo
- Imagem que explica, não que decora
- Numeração e logo discretos; nada de rodapé pesado repetindo a marca

**Notas do apresentador:** o que é pra *falar* vai nas notas, não no slide. É isso que permite slide limpo sem perder conteúdo.

### Passo 4 — Duas versões

- **`apresentar.html`** — slides mínimos, navegação por seta, notas escondidas. É o que vai no projetor
- **`enviar.pdf`** — os mesmos slides com as notas incorporadas como texto de apoio, pra fazer sentido sem você falando

Isso resolve o dilema clássico: slide bom de apresentar é ruim de enviar, e vice-versa.

### Passo 5 — Exportar e conferir

```bash
node scripts/gerar-pdf.js apresentacoes/<nome>/enviar.html
```

O script acha o navegador sozinho em qualquer sistema, espera as fontes carregarem e confere o resultado (número de páginas e PDF em branco). O número de páginas tem que bater com o de slides: se não bater, o `@page` está errado.

Conferir: nenhum texto cortado, contraste legível **em projetor** (que lava a cor, evitar cinza sobre cinza), fonte grande o suficiente pra última fileira (mínimo equivalente a 20pt).

### Passo 6 — Entregar

```
✓ apresentacoes/<nome>-<data>/
  apresentar.html   ← abre no navegador, F11 pra tela cheia, setas pra navegar
  enviar.pdf        ← versão com notas, pra mandar depois
  roteiro.md        ← o que falar em cada slide

[N] slides pra ~[N] minutos.
```

---


## Autonomia do arquivo (obrigatório)

A peça vai ser enviada por WhatsApp, e-mail ou Drive: sozinha, longe da pasta. Se depender do `identidade/tokens.css` por caminho relativo, chega sem estilo: em teste real, um deck ficou **preto sobre preto**, ilegível.

**Copiar o bloco `:root` do `tokens.css` pra dentro do `<style>` da própria peça.** O `tokens.css` continua sendo a fonte da verdade; o que muda é a peça carregar uma cópia inline. Google Fonts é a única dependência externa aceita.

Antes de entregar:

```bash
node scripts/verificar.js html <caminho-da-peça>.html
```

Ele acusa CSS local externo, token sem definição, `@page` inválido, placeholder esquecido e link vazio.

**O deck precisa dos dois blocos de impressão**, sem eles o PDF sai em A4 retrato com os slides cortados:

```css
@page { size: 1920px 1080px; margin: 0 }   /* duas medidas já definem a orientação */
@media print {
  .slide { height: 1080px; page-break-after: always }   /* nunca 100vh aqui */
}
```

`100vh` funciona na tela e quebra no papel: na impressão o "vh" não corresponde à página. Só entregar quando o verificador sair "Tudo certo" e o PDF tiver sido gerado e conferido.

## Regras

- **Uma ideia por slide.** É a regra que mais melhora deck ruim
- Título em forma de afirmação. Rótulo desperdiça a linha mais lida do slide
- Nada de texto que o apresentador vai ler em voz alta — isso vai nas notas
- Não inventar case, número ou logo de cliente
- Contraste pensado pra projetor, não pra monitor
- Se `tokens.css` existir, usar
- Deck de pitch nunca substitui a proposta escrita: o preço detalhado, escopo e condições ficam em `/proposta`
- Se o usuário pedir 40 slides pra 15 minutos, dizer o que não vai caber e propor o corte
