# Interface — controle, estado e densidade

Referência das skills que desenham tela de uso. Não peça de marketing.
Lida por `/interface`, e consultada por `/design-system` e `/revisar-design` quando a
peça tem controle, formulário ou tabela.

## A gramática base

Quando as referências discordam, **Material 3 manda**. As outras entram só onde o M3
não responde:

| Fonte | Entra quando |
|---|---|
| **Material 3** (base) | cor, camada de estado, elevação, forma, movimento, densidade |
| Fluent 2 (Microsoft) | altura e largura mínima de controle, tabela densa de dados |
| Apple (apple.com) | página de produto e bloco de número grande — ver `pagina-produto.md` |
| Spotify | escala de hover em card e capa |
| One UI (Samsung) | alcance do polegar em tela grande de celular |

Empilhar as cinco sem base declarada é o erro clássico. A tela não parece de nenhuma.
Se uma decisão vier de fora do M3, escrever o motivo em uma linha no CSS.

**Unidade: px CSS, sempre.** O M3 publica em `dp` e a Apple em `pt`. Na tela, com
densidade 1, `1dp = 1pt = 1px CSS`: a conversão já está feita em todo número deste
arquivo. Nunca escrever `dp` ou `pt` num HTML: essas unidades não existem em CSS.

---

## Altura de controle

Três alturas resolvem uma interface inteira (Fluent 2, `useButtonStyles.styles.ts`):

| Tamanho | Altura | Largura mínima | Onde |
|---|---|---|---|
| pequeno | 24px | 64px | barra de ferramentas, ação dentro de linha de tabela |
| **médio (padrão)** | 32px | 96px | quase tudo |
| grande | 40px | 96px | ação principal da tela, formulário curto |

### Densidade compacta é proibida por padrão

O piso do ContexOS é **34px de alvo clicável no desktop e 44px no celular**: mesmo
quando o controle desenhado tem 24px de altura visual. A diferença se resolve com
`padding` ou com área de toque invisível, não encolhendo o botão:

```css
.acao-linha {
  height: 24px;              /* o que se vê */
  min-height: 34px;          /* o que se clica — nunca abaixo disso */
  min-width: 34px;
}
@media (pointer: coarse) { .acao-linha { min-height: 44px; min-width: 44px; } }
```

Por quê: o público do ContexOS é negócio real, com gente de 50, 60, 70 anos usando no
celular apoiado numa bancada. **Restrição vence estética**: a mesma regra do
`briefing-visual.md`. Interface de 24px é confortável para quem desenha, não para quem
usa oito horas por dia com o dedo.

A exceção é literal e única: ação repetida dentro de uma linha de tabela densa, no
desktop, com mouse, e ainda assim com `min-height: 34px`.

---

## Camada de estado, não segunda cor

O erro comum é inventar um `#hex` novo para hover. O M3 resolve com uma camada de cor
por cima, em opacidade fixa (`_md-sys-state.scss`):

| Estado | Opacidade da camada |
|---|---|
| repouso | 0 |
| **hover** | 0.08 |
| **foco** | 0.12 |
| **pressionado** | 0.12 |
| arrastando | 0.16 |
| **desabilitado** (o conteúdo, não a camada) | 0.38 |

```css
.botao { position: relative; isolation: isolate; }
.botao::after {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: currentColor; opacity: 0; border-radius: inherit;
  transition: opacity 200ms cubic-bezier(0.2, 0, 0, 1);
}
.botao:hover::after   { opacity: 0.08; }
.botao:focus-visible::after,
.botao:active::after  { opacity: 0.12; }
.botao:disabled       { opacity: 0.38; pointer-events: none; }
```

Ganho concreto: funciona sobre qualquer cor de fundo, sobrevive à troca do token da
marca e não multiplica hex no arquivo. Um botão passa a ter **um** valor de cor.

---

## Campo de formulário

A borda do campo tem dois papéis, e é isso que quase todo mundo erra ao clarear tudo
para "ficar leve":

```css
--campo-borda-lateral: #d1d1d1;   /* decorativa — pode ser clara */
--campo-borda-baixo:   #616161;   /* 6.19:1 sobre branco — É ELA que carrega o requisito */
```

A borda inferior é a que sinaliza "aqui se digita" e precisa passar em 3:1 (WCAG
1.4.11). Laterais claras + inferior escura dão o campo leve **e** aprovado.

Restante do campo:

- Rótulo **fora** do campo, sempre visível. Placeholder como rótulo some quando a
  pessoa começa a digitar, e é a causa nº 1 de formulário preenchido errado
- Erro em texto, ao lado do campo, com `aria-describedby`. Cor sozinha não comunica
- Campo obrigatório marcado no rótulo, não só com asterisco vermelho
- `autocomplete` no que é dado pessoal (WCAG 1.3.5 e 3.3.7 — ver `acessibilidade.md`)
- `inputmode="numeric"` em CPF, CEP, telefone e valor: abre o teclado certo no celular
- Espaço do erro reservado antes de o erro existir: `min-height` na linha da mensagem.
  Sem isso a tela pula quando a validação reprova, o botão muda de lugar debaixo do dedo,
  e a pessoa toca no que não queria
- Senha com opção de ver o que foi digitado. Asterisco só protege de quem espia por cima
  do ombro, e quem enxerga o que escreveu não precisa do campo "confirme a senha". A
  exceção é caixa, balcão e totem, onde estranho vê a tela
- Um campo a mais é uma pessoa a menos terminando. Pergunte de cada um: sem esse dado, a
  ação de agora acontece? Se acontece, ele sai do formulário e vira pedido depois

No celular, a ação principal fica na parte de baixo da tela, na faixa que o polegar alcança
sem trocar a pegada (One UI). E o botão que apaga não fica colado no que envia. Errar por
um centímetro ali custa o pedido inteiro.

---

## Elevação no escuro é tom, não sombra

Sombra preta sobre fundo escuro não aparece: o resultado é uma tela chapada onde nada
parece acima de nada. O M3 resolve clareando a superfície:

| Nível | Sobreposição de branco | Uso |
|---|---|---|
| 0 | 0% | fundo da tela |
| 1 | **4%** | card, superfície padrão |
| 2 | **10%** | cabeçalho fixo, barra |
| 3 | **12%** | menu, dropdown |
| 4 | **17%** | diálogo |
| 5 | **22%** | folha modal, elemento arrastado |

```css
--superficie-1: color-mix(in srgb, #fff 4%,  var(--bg));
--superficie-3: color-mix(in srgb, #fff 12%, var(--bg));
```

No claro vale o inverso: sombra tingida com o matiz do fundo (nunca preta pura), uma
direção de luz só para a tela inteira.

---

## Os quatro estados de toda tela

É o que separa tela "pronta" de tela terminada, e o que mais aparece como bug depois
que o cliente começa a usar. **Toda tela que carrega dado escreve os quatro**, marcados
para virar verificação por comando:

```html
<section data-estado="cheio">    <!-- tem dado -->
<section data-estado="vazio">    <!-- nunca teve dado -->
<section data-estado="carregando">
<section data-estado="erro">
```

| Estado | O que precisa ter | Erro comum |
|---|---|---|
| **cheio** | o dado, ordenado por algo que faça sentido pro negócio | ordenar por id |
| **vazio** | uma frase do que aparece ali **e** o botão que cria o primeiro | ilustração fofa e nada mais |
| **carregando** | esqueleto com a forma do conteúdo real | rodinha girando no meio da tela |
| **erro** | o que houve, em português, e o que fazer agora | "Erro 500" |

O estado vazio de primeira vez e o de busca sem resultado são **diferentes**: um
convida a criar, o outro sugere mudar o filtro. Tratar como um só é o deslize mais
frequente.

---

## Tabela de dados

Onde o pequeno negócio realmente passa o dia: pedido, cliente, estoque:

- **Uma linha por item.** Card com foto para listar 200 pedidos é bonito e inútil
- `font-variant-numeric: tabular-nums` em toda coluna de número, para as casas alinharem
- Número à direita, texto à esquerda, data em formato fixo (`dd/mm/aaaa`)
- Cabeçalho grudento (`position: sticky; top: 0`) com fundo opaco — sem isso, rolar 40
  linhas faz a pessoa esquecer o que é cada coluna
- Ação da linha **sempre visível**, não só no hover: no celular não existe hover, e a
  ação que só aparece ao passar o mouse simplesmente não existe pra metade dos usuários
- Zebra listrada só a partir de 5 colunas; abaixo disso, respiro basta
- A tabela rola dentro de um contêiner com `overflow-x: auto`, nunca a página inteira

---

## Antes de entregar

1. Os quatro estados escritos, com `data-estado`
2. Alvo clicável ≥34px (≥44px no celular) — rodar `node scripts/verificar.js alvo <arquivo.html>`
3. Foco visível em tudo que recebe teclado, e não escondido atrás de cabeçalho fixo
4. Contraste calculado em texto, borda de campo e ícone informativo
5. Nada de `dp` ou `pt` no CSS
6. Conferido contra `anti-generico.md`
7. As quatro perguntas de `usabilidade.md`, tela a tela: onde estou, o que faço, o que acontece, para onde vou

Este arquivo define como a tela se parece. O que ela pede, o que responde e o que impede
está em `usabilidade.md`, e a decisão de interação vem antes do CSS.
