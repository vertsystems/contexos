---
name: movimento
description: >
  Define e conserta o movimento das peças: duração, curva, entrada ao rolar, hover, e o
  respeito a quem pediu para reduzir animação. Entrega `identidade/movimento.css` com os
  tokens e uma amostra navegável, ou audita a animação de uma peça que já existe.
  Use quando o usuário disser "a animação tá estranha", "tá muito parado", "o menu abre
  travado", "quero que apareça conforme rola", "tá dando enjoo de olhar", "a transição tá
  lenta", "quero deixar mais vivo", ou /movimento.
---

# /movimento — Animação com número

> **Convenção de pastas:** a saída vai em `identidade/`, junto do `tokens.css`. Na convenção **por cliente**, `clientes/<Nome>/identidade/`.

O sistema graduava movimento de 1 a 10 no `briefing-visual.md` e exigia estado de
interação em tudo que é clicável, sem dizer **quanto tempo** nem **com que curva**.
Resultado: cada peça animava de um jeito, e "a animação tá estranha" não tinha resposta.

Estranho, quase sempre, é uma destas três coisas: a mesma curva usada na entrada e na
saída, saída mais longa que a entrada, ou `transition: all` animando o que ninguém
pediu. As três se consertam com dois valores e três curvas.

## Dependências

- **Sistema da marca:** `identidade/tokens.css` se existir — o movimento consome os tokens, não redefine cor nem espaço
- **Contexto:** `_memoria/empresa.md` — público idoso, saúde e tema sensível pedem movimento 1-2
- **Referências** (ler antes de gerar):
  - `templates/design/movimento.md` — durações, curvas, escala, o que animar
  - `templates/design/briefing-visual.md` — o ajuste de movimento (1 a 10) e como inferir
  - `templates/design/desempenho.md` — só a parte do INP, que impõe o limite
- **Saída:** `identidade/movimento.css` e `identidade/movimento.html` — ou correções aplicadas na peça auditada

---

## Workflow

O pedido chega de duas formas. Identificar qual antes de tudo:

### A. "Tá estranho / travado / parado" — auditar peça que existe

**Passo A1.** Abrir a peça e listar toda declaração de `transition`, `animation` e
`@keyframes`. Ler os números, não a impressão.

**Passo A2.** Rodar os seis diagnósticos, na ordem em que resolvem mais:

| Sintoma que ele descreveu | O que procurar | Conserto |
|---|---|---|
| "fecha travado", "some devagar" | mesma curva na entrada e na saída | `--ease-sai` na saída, e saída mais curta |
| "tá lento", "demora" | duração acima de 400ms em elemento pequeno | 200ms para cor/opacidade, 350ms para deslocamento |
| "pisca", "pula" | `transition: all` | listar as propriedades animadas |
| "engasga", "trava o dedo" | animação de `width`, `height`, `top`, `left`, `box-shadow` | `transform` e `opacity` |
| "aparece do nada" | `scale(0)` ou opacidade sem deslocamento | mínimo `0.92` + `translateY(12px)` |
| "dá enjoo" | movimento em excesso, sem `prefers-reduced-motion` | reduzir e escrever o bloco |

**Passo A3.** Aplicar as correções e mostrar o antes/depois. Se a peça está no ar,
valem as regras de redesign do `anti-generico.md`: nada de mudar rótulo, URL ou campo
de formulário em silêncio.

### B. "Quero deixar mais vivo" — escrever o padrão

**Passo B1: Definir o ajuste.** Ler o contexto e declarar em uma linha:

> "Movimento **3**: landing de serviço para público que decide devagar: transição só
> onde ajuda a entender, nada que chame atenção sozinho."

O padrão do Contex OS é **movimento 3**. Peça estática (carrossel, proposta, material
impresso) é **movimento 0**, e isso é resposta certa, não falta de capricho.

**Passo B2: Escrever `identidade/movimento.css`.** Os tokens do
`templates/design/movimento.md`: duas durações, três curvas, duas escalas, e o bloco
`prefers-reduced-motion`. Mais que isso é ruído: se o arquivo tiver sete durações,
elas foram digitadas, não escolhidas.

Junto, as receitas prontas que as outras skills consomem: botão, card, menu, modal,
toast e entrada ao rolar.

**Passo B3: Escrever `identidade/movimento.html`.** Amostra navegável com cada
transição isolada e o número visível ao lado ("menu abrindo · 350ms · entra"). É o
arquivo que responde "a animação tá estranha" com evidência, e serve para o usuário
escolher olhando.

Incluir um botão que liga e desliga a redução de movimento na própria página, para ele
ver os dois estados sem mexer no sistema operacional.

**Passo B4: Verificar.**

```bash
node scripts/verificar.js html identidade/movimento.html
```

E conferir à mão: existe bloco `prefers-reduced-motion`? nenhum `transition: all`?
nenhuma animação de propriedade cara?

**Passo B5: Entregar.**

```
✓ identidade/movimento.css   — 2 durações, 3 curvas, redução de movimento respeitada
✓ identidade/movimento.html  — amostra com o número de cada transição

Daqui pra frente /landing, /produto e /interface usam esses tokens em vez de
inventar duração na hora.
```

---

## Regras

- **Duas durações e três curvas.** 200ms para aparecer/sumir/cor, 350ms para deslocar/abrir. Curva com direção: fica, entra, sai
- **Saída sempre mais curta que a entrada.** Entrada informa, saída só confirma
- **`transition: all` é proibido** — vai para o `anti-generico.md` junto com o gradiente roxo-azul
- **Só `transform` e `opacity`.** O resto obriga o navegador a recalcular a página a cada quadro
- **Todo arquivo com movimento tem `prefers-reduced-motion`.** Não é opcional: para parte das pessoas, movimento em tela causa enjoo real
- **Nunca esconder conteúdo por CSS esperando JavaScript.** Se o script falhar, o texto some para sempre. A classe que liga a animação é que entra por script
- Entrada ao rolar acontece **uma vez**; reanimar a cada rolagem transforma a página num carrossel involuntário
- Escala de hover `1.04`, active `0.97`, nunca `scale(0)`
- **INP ≤ 200ms manda.** Animação que segura a resposta ao clique é defeito de desempenho, não escolha estética
- Se a peça é impressa ou estática, a resposta é movimento 0 — e dizer isso em vez de animar por educação
