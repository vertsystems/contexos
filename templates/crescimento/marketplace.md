# Marketplace — anunciar no Mercado Livre e na Shopee

Referência do `/marketplace`. Método, régua de título, ficha, descrição e o checklist
operacional que não muda de mês pra mês.

## O que está aqui e o que ficou de fora

Entra o que é **regra da casa** e tem fonte oficial: limite de campo, estrutura de título
que a própria plataforma recomenda, prática que o guia de violação proíbe, e o que o Código
de Defesa do Consumidor exige de qualquer oferta.

Fica de fora, de propósito:

- Fator de ranqueamento: peso de venda, de conversão e de reputação no resultado de busca.
  Nenhuma das duas casas publica a fórmula, e o que circula em blog muda de versão a cada
  semestre
- **Campanha de data** (9.9, 11.11, Black Friday) — regra de adesão, cupom e cota mudam a
  cada edição. O que vale é o comunicado do painel na semana da campanha
- **Comissão e taxa** — variam por categoria, por plano e por programa de frete. O número
  que entra na sua conta é o do simulador de custo do seu painel, não o de uma tabela velha
- **Nota de reputação e faixa de vendedor** — o painel mostra a sua; a régua muda sem aviso

Anúncio com dado inventado nesses quatro pontos não dá erro na hora. Dá erro no mês
seguinte, quando o vendedor tomou decisão de preço em cima de uma taxa que não existe mais.

## As duas casas, lado a lado

| | Mercado Livre | Shopee |
|---|---|---|
| Título | até **60 caracteres** | limite no campo do Seller Centre: `[a confirmar]` |
| Estrutura do título | produto + marca + modelo + especificação | termo mais buscado primeiro, depois produto, marca e atributo |
| Descrição | até **50.000 caracteres** | `[a confirmar]` |
| Fotos | até **12** (10 quando tem variação) | `[a confirmar]` |
| Cor e tamanho | fora do título: viram variação | variação também, por política de anúncio duplicado |
| Palavra promocional no título | a plataforma pede pra não usar | frete e cupom no título viram informação imprecisa |
| Quem cuida da régua | `templates/crescimento/marketplace-mercado-livre.json` | `templates/crescimento/marketplace-shopee.json` |

Os números do Mercado Livre saem da API pública de categorias, e dá pra reconferir a
qualquer momento:

```bash
node scripts/marketplace.js limites MLB1055
```

O comando devolve o limite de título, de subtítulo, de descrição, de foto e a lista de
atributos obrigatórios **daquela** categoria. Quando o número divergir do arquivo de
regras, o arquivo é que está velho.

## O título, que é 90% do trabalho

O comprador não lê o anúncio: ele lê uma lista de títulos e escolhe dois pra abrir. O
título carrega, ao mesmo tempo, o termo que ele digitou e a prova de que o produto é o
que ele quer.

### Mercado Livre

A ordem que a plataforma recomenda: **produto + marca + modelo + especificação que
identifica**. O exemplo da própria casa é `Tênis Adidas Superstar Couro Ecológico`.

O que fica fora do título, porque já está em outro campo do anúncio:

- **Cor e tamanho** — existem como variação. Se o produto só existe numa versão, dá pra
  ignorar o aviso, com consciência
- **Condição** — usado, seminovo e recondicionado ficam no campo de condição
- **Frete, parcelamento, devolução** — a plataforma exibe isso antes de o comprador abrir
  o anúncio
- **Promoção e desconto** — o desconto aparece destacado pela plataforma; a palavra no
  título só gasta caractere e chama moderação
- Símbolo e pontuação decorativa: o guia lista "pontuação desnecessária" entre o que evitar

Compatibilidade é o único caso em que a marca de outro fabricante entra: com as palavras
"para" ou "compatível com". `Capa para iPhone 13 Silicone` passa; `Capa Tipo iPhone` é
denúncia esperando acontecer.

### Shopee

A régua muda: o título começa pelo termo que o comprador digita. Na grade de busca do
aplicativo o texto aparece cortado, então o que está no fim ninguém lê.

Antes: `Copo Inox Parede Dupla Caneca Térmica 500ml Tampa Rosqueável`
Depois: `Caneca Térmica 500ml Inox Parede Dupla Tampa Rosqueável`

O mesmo texto, com o termo na frente. A parte que a Shopee proíbe é o exagero: "termos de
pesquisa irrelevantes ou excessivos no título ou na descrição" é o que ela chama de spam,
e spam excluído gera ponto de penalidade.

### Achar o termo mais buscado sem ferramenta paga

Três fontes que custam zero e não envelhecem:

1. **Autocomplete da busca da própria plataforma.** Digitar as três primeiras palavras e
   anotar o que ela sugere, na ordem em que sugere. É o que gente de verdade buscou
2. **Os títulos dos primeiros resultados.** A palavra que aparece em quase todos costuma
   ser o termo âncora da categoria
3. **A pergunta que chega no chat.** Se três compradores escreveram "caneca que segura
   gelado", esse é o termo, mesmo que o fabricante chame de "garrafa térmica"

Nada disso dá volume de busca. Dá a palavra, que é o que o título precisa.

## A ficha técnica

Atributo em branco tem dois custos. O comprador que filtra por "voltagem 220V" não vê seu
produto, e a plataforma trata anúncio incompleto como anúncio de qualidade pior.

A regra do sistema: **o que o usuário não informou fica marcado pendente**. Voltagem,
material, peso, código de barras e garantia não se deduzem da foto. Um anúncio que diz
"algodão" num produto de poliéster é informação capaz de induzir o consumidor a erro (CDC,
art. 37, § 1º), e a devolução chega junto com a avaliação de uma estrela.

No Mercado Livre, a lista de obrigatórios varia por categoria, e sai por comando:

```bash
node scripts/marketplace.js limites MLB1276   # atributos obrigatórios da categoria
```

## A descrição que serve pra algo

Ninguém lê descrição inteira. Ela é consultada: o comprador procura a medida, a
compatibilidade, o que vem na caixa. Por isso a ordem é de resposta, não de argumento:

1. **O que é, em duas linhas** — produto, material, capacidade
2. **Medidas e o que vem na caixa** — número, não adjetivo
3. **Como usar e como cuidar** — o que evita a devolução por uso errado
4. **O que não é** — "não acompanha carregador", "não vai à lava-louças". Essa linha
   devolve mais dinheiro do que qualquer argumento de venda
5. **Garantia e prazo** — o legal, que é seu de qualquer jeito (30 dias pra produto não
   durável e 90 pra durável, CDC art. 26), mais o contratual, se você dá algum

O que nunca entra na descrição: telefone, e-mail, link, rede social, pedido pra fechar por
fora. Tirar a venda de dentro da plataforma é a violação que derruba o anúncio e a conta
mais rápido, e está escrita em letra grande no guia da Shopee.

## A pergunta do comprador, que vale mais que adjetivo

Existe uma pesquisa que custa quinze minutos e melhora a ficha e a descrição de uma vez:
abrir os cinco primeiros anúncios do mesmo produto e ler a aba de perguntas de cada um.
O que se colhe:

| O que ler | O que fazer com isso |
|---|---|
| Pergunta que se repete em anúncios diferentes | virou linha da descrição, no item 2 ou no item 4 |
| Pergunta sobre medida | falta número na ficha: altura, peso, capacidade |
| Pergunta "serve no meu?" | falta a lista de compatibilidade |
| Reclamação na avaliação de 1 e 2 estrelas | é o item 4, o "o que não é" |
| Palavra que o comprador usa e o fabricante não | candidata a termo do título |

Essa busca é **opcional**: o anúncio sai sem ela. Ela entra quando o produto é disputado,
quando o vendedor já teve devolução, ou quando ele não sabe qual palavra usar. E ela não
autoriza copiar texto, foto nem ficha de anúncio alheio: o que se colhe é a dúvida do
comprador, não a redação do concorrente.

## Foto

O que vale pras duas casas, sem entrar em requisito que muda: primeira foto com o produto
inteiro sobre fundo limpo, sem texto nem selo colado em cima; as seguintes mostrando
escala, detalhe e o produto em uso. Foto tirada de site de fabricante ou de concorrente é
propriedade intelectual de outro, e derruba anúncio.

Requisito exato de resolução, proporção e quantidade fica `[a confirmar]` no painel de cada
plataforma: é a parte que muda com mais frequência.

## Checklist operacional (a parte que não muda)

O anúncio bom vende uma vez. O que decide se você continua vendendo é a operação.

- **Chat** — as duas plataformas medem tempo e taxa de resposta, e mostram o seu número no
  painel. A meta que funciona é a que você cumpre no pior dia da semana, não a ideal
- Pergunta que chega três vezes não é dúvida: é buraco na ficha ou na descrição. Ela vira
  texto do anúncio
- **Envio** — o prazo de postagem prometido é o que você cumpre com a loja cheia. Atraso
  medido pela plataforma cobra caro, e o desconto vem da sua exposição
- **Devolução e arrependimento** — compra pela internet é fora do estabelecimento, então o
  consumidor pode desistir em **7 dias** contados do recebimento (CDC, art. 49), e os
  valores pagos voltam corrigidos. Isso vale mesmo quando o produto está perfeito
- **Vício do produto** — o prazo pra reclamar é de 30 dias (não durável) e 90 dias
  (durável), contados da entrega (CDC, art. 26). A política da plataforma pode ser mais
  generosa; menos do que isso, não
- **Avaliação** — resposta pública a avaliação ruim é conversa de `/responder-avaliacoes`.
  O que resolve antes é o item 4 da descrição, o "o que não é"
- **Penalidade** — na Shopee, anúncio excluído por violação gera ponto, e quem acumula
  muito ponto tem a **cota de anúncio limitada por 28 dias**. Perder cota é perder a
  vitrine inteira, não um produto

## Preço no marketplace

A conta não é o preço de loja. Ela é: custo do produto, embalagem, comissão da categoria,
taxa de parcelamento, frete que fica com você e imposto. O número de cada linha vem do seu
painel e do seu regime, nunca de tabela de terceiro.

Quem já fez a ficha de custo no `/ficha-tecnica` tem a base pronta. Quem fecha o mês no
`/caixa` sabe se o preço do marketplace está pagando a estrutura ou comendo a margem da
loja física.

## Fontes

| O que | Fonte | Conferido em |
|---|---|---|
| Limite de título, descrição e foto no ML | https://api.mercadolibre.com/categories/MLB1055 | 2026-09-22 |
| Estrutura do título no ML e o que evitar | https://vendedores.mercadolivre.com.br/nota/como-criar-um-titulo-atrativo | 2026-09-22 |
| Passo a passo do anúncio no ML | https://vendedores.mercadolivre.com.br/nota/como-criar-anuncios-eficientes-no-mercado-livre | 2026-09-22 |
| Guia de Violação de Anúncio da Shopee (spam, link externo, cota de 28 dias) | https://help.shopee.com.br/portal/4/article/76225 | 2026-09-22 |
| Política de Produtos Proibidos e Restritos da Shopee | https://help.shopee.com.br/portal/4/article/76226 | 2026-09-22 |
| Boas práticas de anúncio da Shopee | https://seller.shopee.com.br/edu/article/15312/boas-praticas-para-criar-bons-anuncios-na-shopee | 2026-09-22 |
| Pontos de penalidade da Shopee | https://seller.shopee.com.br/edu/article/7955/Sistema-de-Pontos-de-Penalidade-do-vendedor | 2026-09-22 |
| Arrependimento em 7 dias, prazo de vício, oferta e publicidade enganosa | https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm | 2026-09-22 |

Isto não substitui advogado nem contador. Regra de plataforma muda por comunicado, e
tributação de venda on-line depende do seu regime.

## O que este molde não decide

- **Qual marketplace usar.** Depende de onde seu produto é procurado e de quanto você
  aguenta de preço. Testar um produto nas duas casas, com a mesma foto, responde melhor
  que qualquer análise
- Se vale anunciar: produto com margem apertada não melhora com vitrine maior
- **Quanto cobrar.** Isso é `/preco` e `/ficha-tecnica`
- **A página do produto no seu site.** Vitrine própria, com seletor, planos e botão de
  compra, é `/produto`. O anúncio de marketplace mora na plataforma e segue a régua dela;
  a página própria segue a sua
- **Busca no Google.** Palavra-chave, título de página e perfil do Google Empresas é
  `/seo`, onde o marketplace aparece do outro lado: como concorrente que disputa o mesmo
  termo com você
- **Quanto sobra depois da comissão.** O cálculo de margem por canal é `/delivery` pra
  aplicativo de comida e `/caixa` pro mês fechado; a conferência do repasse que caiu na
  conta é `/conciliar`
