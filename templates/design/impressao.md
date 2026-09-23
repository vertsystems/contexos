# Impressão — arquivo que a gráfica aceita

Referência do `/impressao`. Aqui está o conhecimento que não muda de peça pra peça: o vocabulário da gráfica, as medidas, a régua de resolução, o que acontece com a cor no papel e o checklist de envio. O passo a passo fica na skill.

Tudo que é número tem fonte e data de conferência. Medida de gráfica varia por equipamento: o que está aqui é o ponto de partida, e o pedido confirma.

---

## As quatro devoluções

Quem atende no balcão da gráfica repete as mesmas frases o ano inteiro:

1. **"O arquivo veio sem sangria."** O PDF saiu no tamanho final. Na guilhotina, o corte varia um pouco pra cada lado, e sem margem extra de arte aparece um fio branco na borda, ou o corte entra na arte.
2. **"O texto vai cortar."** Telefone, endereço ou logo encostado na borda. A variação de corte come o que estiver a menos de 3 mm da linha.
3. **"A imagem está em baixa."** A foto veio do WhatsApp com 600 px de largura e vai ocupar 90 mm. Dá 169 DPI, e o papel mostra o chuvisco que a tela esconde.
4. **"A cor não é a da tela."** Monitor emite luz, papel reflete. Verde-limão e azul elétrico são os que mais decepcionam.

As três primeiras são conta, e conta se confere por comando: `node scripts/impressao.js medidas <arte.html>` mede o arquivo renderizado (folga até o corte, DPI real, fundo que sangra) e `node scripts/impressao.js medir <arte.pdf>` lê o tamanho de página do PDF. A quarta é conversa com a gráfica, e por isso entra no checklist de envio.

---

## Vocabulário

- **Tamanho final** — a medida da peça depois de cortada. É o que o cliente pede: cartão 90 × 50 mm.
- **Sangria** — arte que continua além da linha de corte, pra que o corte torto ainda caia dentro de área impressa. Padrão de 3 mm por lado, o que soma 6 mm em cada dimensão do arquivo ([Printi](https://www.printi.com.br/blog/o-que-sao-sangria-e-marcas-de-corte), conferido em 23/09/2026; a [ANS Gráfica](https://www.ans.com.br/artigos/qual-sangria-usar-no-arquivo) diz o mesmo, conferido em 23/09/2026).
- **Área de segurança** — faixa interna onde nada importante entra. A referência é manter texto, logo e QR code a pelo menos 3 mm da borda final ([ANS Gráfica](https://www.ans.com.br/artigos/qual-sangria-usar-no-arquivo), conferido em 23/09/2026). O sistema usa 4 mm como padrão, por folga, e 5 mm em peça grande; abaixo de 3 mm ele avisa.
- **Marcas de corte** — os traços nos cantos que mostram onde cortar. Gráfica online costuma pedir arquivo **sem** marcas, só com sangria, porque a marca dela entra na montagem da folha. Gráfica de bairro às vezes pede com marca: aí o arquivo ganha mais uns 5 mm por lado só pra elas.
- **Gramatura** — peso do papel em g/m². Quanto maior, mais rígido.
- **Laminação** — filme plástico aplicado depois da impressão. A fosca abafa a cor e segura digital; a brilho satura e reflete.
- **Prova impressa** — uma unidade impressa antes da tiragem. É a única forma honesta de aprovar cor.

---

## Medidas

Sangria de 3 mm por lado, área de segurança de 4 mm. A lista viva sai por comando: `node scripts/impressao.js tamanhos`.

| Peça | Tamanho final | Arquivo com sangria | Área segura | Pixel a 300 DPI |
|---|---|---|---|---|
| Cartão de visita (`cartao`) | 90 × 50 mm | 96 × 56 mm | 82 × 42 mm | 1134 × 662 |
| Cartão 85 × 55 (`cartao-85`) | 85 × 55 mm | 91 × 61 mm | 77 × 47 mm | 1075 × 721 |
| Cartão 90 × 48 (`cartao-90x48`) | 90 × 48 mm | 96 × 54 mm | 82 × 40 mm | 1134 × 638 |
| Cartão 88 × 48 (`cartao-88`) | 88 × 48 mm | 94 × 54 mm | 80 × 40 mm | 1111 × 638 |
| Ímã de geladeira (`ima`) | 85 × 55 mm | 91 × 61 mm | 77 × 47 mm | 1075 × 721 |
| A6 (`a6`) — postal, flyer pequeno | 105 × 148 mm | 111 × 154 mm | 97 × 140 mm | 1312 × 1819 |
| A5 (`a5`) — flyer, panfleto | 148 × 210 mm | 154 × 216 mm | 140 × 202 mm | 1819 × 2552 |
| A4 (`a4`) — cartaz pequeno, encarte | 210 × 297 mm | 216 × 303 mm | 202 × 289 mm | 2552 × 3579 |
| A3 (`a3`) — cartaz | 297 × 420 mm | 303 × 426 mm | 289 × 412 mm | 3579 × 5032 |
| Tag de produto (`tag`) | 50 × 80 mm | 56 × 86 mm | 42 × 72 mm | 662 × 1016 |
| Adesivo 50 mm (`adesivo-50`) | 50 × 50 mm | 56 × 56 mm | 42 × 42 mm | 662 × 662 |
| Adesivo 80 mm (`adesivo-80`) | 80 × 80 mm | 86 × 86 mm | 72 × 72 mm | 1016 × 1016 |
| Marcador de página (`marcador`) | 50 × 150 mm | 56 × 156 mm | 42 × 142 mm | 662 × 1843 |

**Fontes.** A série A é norma: A4 210 × 297, A5 148 × 210, A6 105 × 148, A3 297 × 420 mm, pela ISO 216:2007 ([ficha no catálogo da ISO](https://www.iso.org/standard/36631.html), [amostra em PDF](https://cdn.standards.iteh.ai/samples/36631/c0883203ea25445c9992bb09343620c5/ISO-216-2007.pdf), conferido em 23/09/2026).

Cartão de visita não tem norma. A Printi responde que "os tamanhos mais usados são 9,0 x 5,0 cm e 8,5 x 5,5 cm", e o catálogo dela vende 9 × 4,8, 8 × 5, 8,5 × 5,5, 8,3 × 4,6, 4,8 × 4,8 e 6 × 6 cm ([Printi](https://www.printi.com.br/cartao-de-visita/), conferido em 23/09/2026). O 88 × 48 mm segue aparecendo em gráfica de bairro, mas não está nesse catálogo: se for esse o pedido, confirme antes [a confirmar com a sua gráfica]. Tag, ímã e adesivo variam demais — trate o valor da tabela como sugestão e confirme no pedido.

Peça redonda usa o diâmetro no lugar dos dois lados, e a sangria soma igual: adesivo de 50 mm vira arquivo de 56 mm.

---

## Resolução

DPI não é propriedade do arquivo, é razão entre pixel e tamanho impresso:

```
DPI = pixel ÷ (milímetros ÷ 25,4)
```

Uma foto de 1200 px ocupando 32 mm imprime a 952 DPI, de sobra. A mesma foto ocupando 148 mm imprime a 206 DPI, e já é aposta.

| Situação | Régua | Por quê |
|---|---|---|
| Cartão, tag, adesivo, flyer de mão | **300 DPI** | peça vista a 30 cm, o olho pega o pixel |
| Cartaz A3 visto a dois metros | 150 DPI serve | a distância faz o trabalho |
| Abaixo de 150 DPI | trocar a foto | chuvisco visível em qualquer peça de mão |

Os 300 DPI em tamanho real são o padrão que as gráficas pedem para cartão, adesivo, flyer, catálogo e embalagem; sobre 150 DPI, a mesma orientação responde "para grandes formatos vistos à distância (como banners), pode funcionar. Para materiais pequenos e detalhados, não é recomendado" ([Printi](https://www.printi.com.br/blog/resolucao-para-material-impresso-entenda-de-uma-vez-por-todas-e-nao-erre-mais), atualizado em 27/02/2026, conferido em 23/09/2026).

**Ampliar não resolve.** Subir a foto de 600 px para 3000 px em qualquer editor inventa pixel novo a partir dos vizinhos: o arquivo fica pesado e a imagem continua borrada. O caminho é conseguir o original, fotografar de novo, ou usar a foto menor na arte.

**Logo é caso à parte.** Em vetor (SVG, PDF, EPS, AI) não existe DPI: imprime nítido em qualquer tamanho. Se o negócio só tem o logo em PNG pequeno, vale refazer em vetor antes de imprimir mil unidades.

---

## Cor

A gráfica pede CMYK: "sempre que possível, exporte em CMYK para garantir fidelidade" ([Printi](https://www.printi.com.br/blog/resolucao-para-material-impresso-entenda-de-uma-vez-por-todas-e-nao-erre-mais), conferido em 23/09/2026). O Chrome gera PDF em RGB, e o sistema não finge o contrário. Converter para CMYK sem o perfil de quem imprime troca um erro previsível por um imprevisível, então a conversão fica com a gráfica, avisada na mensagem de envio, e o que fica do nosso lado é dizer o que muda.

**O que muda ao imprimir:**

- Cor muito viva na tela sai mais fechada no papel. Neon, verde-limão e azul elétrico são os que mais mudam
- Preto chapado em área grande (`#000000`) sai acinzentado. A gráfica tem um preto rico em CMYK para isso, com valor próprio de cada equipamento (algo perto de C60 M40 Y40 K100, a confirmar com ela)
- Papel fosco abafa, papel brilho satura. A mesma arte muda de tom conforme o acabamento
- Cor de marca crítica pede Pantone, que é tinta separada, custa mais e está fora do que esta skill produz

**O que fazer na prática:** mandar o PDF em RGB dizendo isso na mensagem, pedir que a gráfica converta com o perfil dela, e pedir prova impressa quando a tiragem passar de algumas centenas ou quando a cor da marca for o ponto da peça.

---

## Papel e acabamento

Conversa de orçamento, não de arquivo. Serve para o dono não travar na hora do pedido:

| Peça | O que costuma se usar | Observação |
|---|---|---|
| Cartão de visita | couché 300 g | é o mais vendido; com laminação fosca fica sedoso e não marca digital |
| Flyer de mão | couché 115 a 150 g | abaixo disso amassa no bolso |
| Cartaz | couché 150 a 250 g | fosco reflete menos sob luz de loja |
| Tag | cartão 250 a 300 g | confirme o furo e o local antes |
| Adesivo | vinil ou papel couché adesivo | vinil aguenta rua e chuva, papel não |

Gramatura e acabamento variam por gráfica; os valores acima são os que aparecem nas linhas de cartão e folheto das gráficas online — o catálogo de cartão da Printi abre em couché fosco 300 g, cartão 300 g e couché brilho 300 g, com laminação fosca e soft touch como enobrecimento ([Printi](https://www.printi.com.br/cartao-de-visita/), conferido em 23/09/2026). Peça o orçamento com duas opções de papel: a diferença de preço costuma ser menor que a diferença de percepção.

**Verniz localizado, hot stamping, corte especial e lona de banner** ficam fora do que o sistema monta. Esses acabamentos exigem arquivo separado de máscara e ajuste de escala que muda por equipamento. Se o usuário quiser, o caminho é o designer da gráfica.

---

## Checklist de envio

O que vai escrito na mensagem para a gráfica, junto do arquivo:

```
Peça: <o que é>
Quantidade: <n>
Tamanho final: <L> × <A> mm
Arquivo: PDF com 3 mm de sangria por lado (<L+6> × <A+6> mm), sem marcas de corte
Páginas: <1 = só frente | 2 = frente e verso>
Cor: arquivo em RGB — por favor converter com o perfil de vocês
Fontes: incorporadas no PDF
Papel: <gramatura e tipo>
Acabamento: <laminação, se houver>
Prazo: <quando precisa na mão>

Confirmam antes de rodar? Se algo estiver fora do padrão de vocês, me digam
que eu reenvio.
```

A última linha é a que economiza dinheiro: pedir confirmação antes da tiragem transforma erro de arquivo em e-mail, não em mil unidades no lixo.

---

## O que este método não garante

Honestidade sobre o limite evita promessa que o papel desmente:

- **Cor exata.** Sem perfil ICC e sem prova impressa, ninguém garante tom
- **Fonte convertida em curvas.** O PDF do Chrome incorpora a fonte, o que resolve na maioria das gráficas; se a sua exigir curvas, ela mesma converte ou o arquivo vai para um editor vetorial
- **Encaixe de acabamento especial.** Verniz e corte faca pedem arquivo de máscara
- **Perfil PDF/X.** Algumas gráficas pedem PDF/X-1a; o Chrome não exporta nesse perfil, e a conversão é feita por quem imprime

Quando a gráfica exigir algo dessa lista, a resposta certa é encaminhar o HTML e o PDF para o designer dela, não improvisar.

---

## Fontes

- Sangria e marcas de corte, com o padrão de 3 mm por lado: [Printi](https://www.printi.com.br/blog/o-que-sao-sangria-e-marcas-de-corte) · 23/09/2026
- Sangria de 3 mm em cada lado (+6 mm na largura e na altura) e elementos importantes a pelo menos 3 mm da borda: [ANS Gráfica](https://www.ans.com.br/artigos/qual-sangria-usar-no-arquivo) · 23/09/2026
- Resolução de 300 DPI em tamanho real, 150 DPI só em grande formato visto de longe, e a recomendação de exportar em CMYK: [Printi](https://www.printi.com.br/blog/resolucao-para-material-impresso-entenda-de-uma-vez-por-todas-e-nao-erre-mais) · atualizado em 27/02/2026, conferido em 23/09/2026
- Medidas da série A: ISO 216:2007, [catálogo](https://www.iso.org/standard/36631.html) e [amostra em PDF](https://cdn.standards.iteh.ai/samples/36631/c0883203ea25445c9992bb09343620c5/ISO-216-2007.pdf) · 23/09/2026
- Tamanhos de cartão vendidos, papel e acabamento: [Printi](https://www.printi.com.br/cartao-de-visita/) · 23/09/2026
