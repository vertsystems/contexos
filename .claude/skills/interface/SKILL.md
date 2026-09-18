---
name: interface
description: >
  Define o padrão visual das telas de uso do negócio (botão, campo, tabela, painel, menu)
  e entrega `identidade/interface.css` mais uma amostra navegável, com altura de controle,
  camada de estado, densidade e os quatro estados de conteúdo (cheio, vazio, carregando, erro).
  Use quando o usuário disser "meu sistema tá feio", "a tabela tá horrível", "padroniza os
  botões", "os campos do formulário estão diferentes em cada tela", "cabe pouca coisa na tela",
  "como deve ser o painel", "falta o estado vazio", ou /interface.
---

# /interface — O padrão das telas de uso

> **Convenção de pastas:** a saída vai em `identidade/`, junto do `tokens.css`. Na convenção **por cliente**, `clientes/<Nome>/identidade/`. Esta skill **não** cria pasta de sistema: quem constrói software é o `/backend`, e ele consome o padrão gerado aqui.

O Contex OS sabia desenhar peça de marketing e sabia construir servidor. No meio ficava a
tela onde o negócio passa o dia: a lista de pedidos, a ficha do cliente, o painel da
manhã. Desenhada no improviso, com um botão diferente em cada canto.

Marketing e interface têm regras opostas: peça de marketing pode ser generosa e
assimétrica; tela de uso repete o mesmo gesto duzentas vezes por dia e precisa ser
previsível. Esta skill escreve essa previsibilidade em valores fixos.

## Dependências

- **Sistema da marca:** `identidade/tokens.css` — se não existir, rodar `/design-system` antes; sem tokens, esta skill inventaria cor e a tela nasceria fora da marca
- **Contexto:** `_memoria/empresa.md` — quem usa (idade, se é no balcão, no celular, o dia inteiro) muda densidade e tamanho de alvo mais que qualquer preferência
- **Referências** (ler antes de gerar):
  - `templates/design/interface.md` — altura de controle, camada de estado, densidade, os quatro estados
  - `templates/design/usabilidade.md` — o comportamento da tela: ação primária, retorno de clique, erro impedido, campo que sai do formulário, tela sem saída
  - `templates/design/acessibilidade.md` — foco, alvo, formulário, teclado
  - `templates/design/movimento.md` — só a parte de estado de interação
  - `templates/design/anti-generico.md` — conferir antes de entregar
- **Saída:** `identidade/interface.css` e `identidade/interface.html`

---

## Workflow

### Passo 1 — Descobrir onde essa tela vive

Três perguntas, e só elas. As respostas decidem densidade, tamanho e contraste:

> 1. "Quem usa isso o dia inteiro — e com que idade?"
> 2. "Usa no computador sentado, no celular em pé, ou nos dois?"
> 3. "Qual é a tela que mais abre no dia?"

A terceira é a que dá o exemplo real da amostra. Padrão desenhado sobre "um formulário
qualquer" não sobrevive ao primeiro uso; desenhado sobre a tela de lançar pedido do
balcão, sim.

Se o negócio atende no balcão ou no celular, o piso sobe direto para 44px de alvo e a
densidade cai — **restrição vence estética**, a mesma regra do `briefing-visual.md`.

### Passo 2 — Fixar os valores de controle

Consultar `templates/design/interface.md` e escrever, como tokens que consomem o
`tokens.css` existente:

- **Altura:** 24 / 32 / 40px de altura visual, com `min-height: 34px` no alvo clicável (44px se o passo 1 apontou celular ou balcão). Densidade compacta é proibida por padrão
- **Camada de estado:** hover 0.08, foco 0.12, pressionado 0.12, desabilitado 0.38 — camada por cima, nunca segunda cor inventada
- **Campo:** borda lateral clara decorativa, borda inferior escura carregando o contraste de 3:1, rótulo fora do campo
- **Elevação:** no tema escuro, tom (4/10/12/17/22% de branco); no claro, sombra tingida com o matiz do fundo
- **Foco:** `:focus-visible` com contorno de 2px e `scroll-padding-top` da altura do cabeçalho fixo

Material 3 é a gramática base. Onde uma decisão vier de outra fonte, escrever o motivo
em uma linha de comentário no CSS.

### Passo 3 — Escrever `identidade/interface.css`

Um arquivo, comentado, consumindo os tokens semânticos do `tokens.css` (nunca a escala
bruta). Blocos, nessa ordem:

1. Tokens de controle (altura, alvo, densidade, raio, camada de estado)
2. Botão — primário, secundário, discreto, com os quatro estados
3. Campo — texto, seleção, com erro, desabilitado; rótulo e mensagem de erro
4. Tabela — cabeçalho grudento, `tabular-nums`, ação de linha sempre visível
5. Superfícies — card, painel, menu, diálogo
6. Os quatro estados de conteúdo
7. Foco e `prefers-reduced-motion`

### Passo 4 — Escrever `identidade/interface.html`

Amostra navegável, com **dado real do negócio**: os produtos, os nomes de coluna e os
valores que o usuário citou no passo 1, nunca "Item 1, Item 2". A tela mais aberta do
dia aparece montada, e ao lado dela os quatro estados:

```html
<section data-estado="cheio">…</section>
<section data-estado="vazio">…</section>
<section data-estado="carregando">…</section>
<section data-estado="erro">…</section>
```

O estado vazio de primeira vez ("você ainda não lançou nenhum pedido" + botão que cria
o primeiro) é **diferente** do vazio de busca ("nenhum pedido com esse filtro" + limpar
filtro). Os dois entram.

O CSS vai inline no HTML da amostra: ela é enviada por WhatsApp e precisa chegar com
estilo (mesma regra da peça).

### Passo 5 — Verificar antes de entregar

```bash
node scripts/verificar.js alvo identidade/interface.html
node scripts/verificar.js html identidade/interface.html
node scripts/verificar.js contraste "<borda-do-campo>" "<fundo>"
```

Se o alvo reprovar, subir o `min-height`, nunca relaxar a régua para o arquivo passar.

### Passo 6 — Entregar

```
✓ identidade/interface.css   — [N] tokens de controle, alvo mínimo [34|44]px
✓ identidade/interface.html  — amostra com a tela de [X] e os quatro estados

Abre o HTML no navegador pra ver. O que estiver estranho aqui vai estar
estranho no sistema inteiro — conserta no CSS e vale pra todas as telas.

Quando for construir o sistema de verdade, o /backend consome esse arquivo.
```

---

## Regras

- **Sem `tokens.css`, não começar.** Oferecer `/design-system` primeiro. Interface que inventa cor nasce fora da marca e contamina todas as telas
- **Os quatro estados sempre.** Tela entregue só com o estado cheio está pela metade, e o que falta aparece justamente no dia ruim — sem resultado, sem internet, com erro
- **Alvo nunca abaixo de 34px** (44px no celular), por mais que o controle desenhado seja menor. A exceção é ação repetida em linha de tabela, no desktop
- **Camada de estado, não segunda cor.** Um botão tem um valor de cor
- **Dado real na amostra.** "Item 1, Item 2" esconde exatamente os problemas que aparecem com nome comprido e valor grande
- Nada de `dp` ou `pt` no CSS — a saída é HTML, onde essas unidades não existem
- Não desenhar tela nova por conta própria: o padrão nasce da tela que já existe no dia do usuário
- Não migrar tecnologia nem propor framework de componente. A saída é CSS que funciona em qualquer lugar
- Se o pedido for **construir** o sistema (banco, login, API), a skill é `/backend` — esta entrega só o padrão visual que ele consome
