# Desempenho — as três métricas que o Google mede

Referência compartilhada. Lida por `/acessivel` (o laudo é único: consegue usar **e**
consegue esperar) e consultada por `/landing`, `/produto` e `/seo`.

Página lenta não é só desconforto: no celular do cliente, com 4G ruim, é a diferença
entre ler a oferta e voltar pro Instagram.

---

## As três métricas

Os **Core Web Vitals**, medidos no **percentil 75** dos acessos reais, com **celular e
desktop contados separado**: a média engana, e o celular quase sempre é o que reprova.

| Métrica | O que mede | Bom | Ruim acima de |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | quando o maior elemento da tela inicial aparece | **≤ 2,5s** | 4,0s |
| **INP** (Interaction to Next Paint) | quanto a página demora a responder ao clique | **≤ 200ms** | 500ms |
| **CLS** (Cumulative Layout Shift) | quanto o conteúdo pula enquanto carrega | **≤ 0,1** | 0,25 |

O INP substituiu o FID em março de 2024, e é mais duro: mede **toda** interação, não só
a primeira, e conta até o próximo quadro desenhado.

---

## LCP — o elemento maior da primeira tela

Descobrir qual é o elemento antes de otimizar qualquer coisa: quase sempre é a imagem
do topo, um vídeo de fundo ou o título grande. Otimizar outra coisa não move o número.

```html
<!-- imagem do topo: prioridade alta, e NUNCA lazy -->
<img src="topo.webp" width="1200" height="675" fetchpriority="high" alt="...">
```

- **`loading="lazy"` no elemento do LCP é o erro de desempenho mais comum.** O atributo
  manda o navegador esperar: no elemento que define a métrica. Lazy só abaixo da dobra
- `fetchpriority="high"` na imagem do topo; nas outras, nada
- Imagem em WebP, no tamanho real de exibição. Foto de 3000px servida num bloco de
  600px é o desperdício mais frequente
- Fonte: `font-display: swap` e `<link rel="preload">` só na fonte do título. Precarregar
  seis arquivos de fonte atrasa a própria imagem
- Nada de CSS externo bloqueando a primeira tela — para peça do ContexOS, o estilo vai
  inline no arquivo, o que já resolve

```bash
node scripts/verificar.js peso <pasta>     # imagem acima de 2 MB
```

---

## CLS — a página que pula

Quatro causas, e o conserto de cada uma. A primeira responde pela maioria:

| Causa | Conserto |
|---|---|
| **imagem sem dimensão declarada** | `width` e `height` no HTML **mais** `style="width:100%;height:auto"` no CSS. O navegador reserva o espaço antes de baixar |
| **fonte que troca depois de carregar** | `font-display: swap` com fonte de fallback de métrica parecida (`size-adjust`), e nunca trocar a família no meio |
| **conteúdo injetado acima do que já está na tela** | reservar a altura por CSS (`min-height`) antes de preencher — banner de cookie, aviso de frete, chat |
| **iframe/embed sem altura** | `aspect-ratio` no contêiner |

É a métrica mais barata das três: quase tudo se resolve declarando tamanho antes.

---

## INP — o clique que demora a responder

- Responder primeiro, processar depois: mudar o estado visual do botão **no mesmo
  quadro** do clique, e só então rodar a validação, a busca ou o envio
- Trabalho longo no clique (filtrar 5.000 linhas, gerar PDF) sai do caminho da resposta
- Menos JavaScript na página é o conserto estrutural. Biblioteca de carrossel de 90 KB
  para exibir três fotos é o caso clássico
- Animação disparada por clique não pode segurar a resposta — ver `movimento.md`

---

## Como medir (nunca estimar)

1. **Dado de campo** — PageSpeed Insights (`pagespeed.web.dev`) mostra o que aconteceu
   com usuário real nos últimos 28 dias, celular e desktop separados. É o número que
   vale
2. **Dado de laboratório** — Lighthouse na aba Performance do navegador, com a rede
   emulada em "Slow 4G". Serve para comparar antes/depois, não para reportar
3. **Local** — se o site ainda não está no ar, só existe laboratório. Dizer isso no
   laudo em vez de apresentar o número como se fosse de campo

**Medir antes de otimizar.** Mesma regra do `/backend`: sem medida, otimização é
palpite caro. E a maioria das páginas de pequeno negócio tem um problema só, grande —
achá-lo vale mais que dez micro-ajustes.

---

## Quando desempenho e movimento discordam

Ganha o desempenho, com uma exceção. Ordem de decisão:

1. INP acima de 200ms → cortar ou adiar a animação. Sem discussão
2. Animação que só decora e custa CLS → sai
3. Animação que **comunica** (esqueleto de carregamento, confirmação de envio) → fica,
   porque tirar transfere o custo para a confiança do usuário

E o inverso também vale: a otimização não pode remover o bloco
`prefers-reduced-motion`. Ele é CSS puro, não custa nada e é requisito de
acessibilidade, não de estética.
