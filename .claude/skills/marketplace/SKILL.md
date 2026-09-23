---
name: marketplace
description: >
  Monta o anúncio de um produto pra Mercado Livre ou Shopee e devolve o arquivo pronto pra
  colar no cadastro: título na régua da casa (60 caracteres no Mercado Livre, termo mais
  buscado na frente na Shopee), ficha técnica, descrição que responde a dúvida do comprador
  e o checklist de chat, envio e devolução. O que o dono não informou fica marcado pendente,
  nunca deduzido da foto, e o script confere por comando só o que é regra fixa: tamanho de
  título, atributo obrigatório vazio e palavra que o guia de violação proíbe.
  Use quando o usuário disser "quero vender esse produto no Mercado Livre", "como eu anuncio
  isso na Shopee", "que título eu ponho no anúncio", "meu anúncio foi derrubado e não sei por
  quê", "monta o anúncio com essa foto", "o que escrever na descrição do produto", "meu
  anúncio não aparece na busca", "tenho o mesmo produto nas duas plataformas", "o pessoal
  pergunta sempre a mesma coisa no chat", ou /marketplace.
---

# /marketplace — O anúncio na régua da casa

> **Convenção de pastas:** a saída vai em `produtos/<produto>/anuncio-<plataforma>.md`, um arquivo por plataforma, e o laudo em `produtos/<produto>/laudo-<plataforma>.md` quando o dono quiser guardar. A foto fica em `produtos/<produto>/fotos/`. Na convenção **por cliente**, `clientes/<Nome>/produtos/<produto>/`. A pasta nasce na primeira rodada.

O cadastro de anúncio tem quarenta campos, e três decidem a venda: o título, a ficha técnica
e a primeira foto. O vendedor passa a tarde escolhendo entre duas fotos parecidas e escreve o
título em quinze segundos. Sai com 63 caracteres num campo que aceita 60. A plataforma corta
os três últimos e leva embora o atributo do fim, que era justamente o que separava esse
produto do vizinho na mesma tela de resultado.

Nada disso é opinião, é contagem. Esta skill conta o que é contável (caractere, atributo em
branco, palavra que o guia de violação proíbe) e deixa marcado, em branco, o que só o dono
sabe. Voltagem não se deduz de foto.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, em quais canais, quem atende o chat
- **Cliente real:** `_memoria/publico.md`, quando existir — a palavra que o comprador usa, primeira candidata a termo do título
- **Entrada do dono:** a foto do produto, o que ele é, o preço, e os atributos (material, capacidade, voltagem, medida, peso, código de barras, garantia). O que não vier fica pendente
- **Custo, se a conversa virar preço:** `precos/ficha-tecnica.json` do `/ficha-tecnica`, que é quem tem o custo por unidade
- **Molde:** `templates/crescimento/marketplace.md` — método, régua de título das duas casas, a ficha, a descrição em cinco partes, o checklist operacional, a tabela de fontes com data, e a lista do que ficou de fora de propósito
- **Regras datadas:** `templates/crescimento/marketplace-mercado-livre.json` e `templates/crescimento/marketplace-shopee.json` — limite de campo, atributo mínimo e padrão de palavra vetada, cada entrada com `fonte` e `conferido_em`
- **Script:** `scripts/marketplace.js` — `esqueleto`, `titulo`, `conferir`, `limites`, `plataformas`. Node puro, sem npm
- **Conferência:** `node scripts/verificar.js texto` no arquivo do anúncio
- **Saída:** `produtos/<produto>/anuncio-<plataforma>.md`

---

## Workflow

### Passo 1 — Produto e plataforma, nessa ordem

Duas perguntas, e a segunda tem só duas respostas possíveis:

1. "Qual produto, e você tem foto dele?"
2. "Mercado Livre ou Shopee?"

Só essas duas casas têm régua conferida aqui, e o motivo está escrito no molde: limite de
campo e guia de violação são verificáveis em fonte oficial, enquanto o resto do que circula
sobre marketplace (peso do algoritmo na busca, cota de campanha de data, comissão por
categoria) muda por temporada e viraria dado inventado dentro de dois meses.

Se ele quiser anunciar nas duas, o caminho é o Passo 8: mesmo produto, dois arquivos, duas
réguas. Para ver qual versão das regras está no workspace:

```bash
node scripts/marketplace.js plataformas
```

O arquivo nasce vazio e honesto, com todo campo em `[pendente]`:

```bash
node scripts/marketplace.js esqueleto shopee --produto "Caneca térmica 500ml" \
  --saida produtos/caneca-termica-500ml/anuncio-shopee.md
```

Daí em diante o trabalho é trocar `[pendente]` por informação que existe. Nunca por
informação plausível.

### Passo 2 — Ler a foto, e separar o que ela prova

A ferramenta de leitura do assistente abre imagem. Vale abrir a foto e descrever o que dá
pra ver, porque isso preenche meia ficha sem perguntar nada: formato, cor, acabamento
aparente, o que está escrito na embalagem, quantas peças aparecem, se tem selo ou certificação
impressa.

E vale ser explícito sobre o outro lado:

| A foto mostra | A foto não diz |
|---|---|
| que é prateado e parece metal | se é inox 304, inox 201 ou alumínio |
| que tem plugue | se é 110V, 220V ou bivolt |
| o tamanho aparente ao lado da mão | a medida em centímetros e o peso com embalagem |
| o logo na caixa | o código de barras e o modelo exato |

Essas quatro linhas são as que voltam como devolução. Produto anunciado como algodão que é
poliéster é informação capaz de induzir o consumidor a erro (CDC, art. 37, § 1º:
https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm, conferido em 22/09/2026).
Então elas ficam `[pendente]` até o dono virar a etiqueta e responder.

Duas coisas pra dizer na hora, se for o caso: foto com texto colado em cima ou selo de
promoção não serve como primeira imagem, porque as duas casas pedem o produto inteiro sobre
fundo limpo; e foto baixada do site do fabricante ou do concorrente é propriedade de outro,
e derruba anúncio.

### Passo 3 — O termo que o comprador digita

O título inteiro depende de uma palavra, e ela quase nunca é a palavra do fabricante. Três
fontes que custam zero, na ordem em que valem:

1. **Autocomplete da busca da própria plataforma:** digitar as três primeiras palavras do produto e anotar as sugestões, na ordem em que aparecem. É o que gente de verdade buscou
2. **Título dos cinco primeiros resultados:** a palavra que aparece em quase todos é a âncora da categoria
3. **Pergunta que chega no chat:** se três compradores escreveram "caneca que segura gelado", o termo é esse, mesmo que a nota fiscal diga "garrafa térmica"

Se `_memoria/publico.md` existe, ler de lá antes: a dor escrita na palavra do cliente
costuma ser o termo, já colhido de conversa real.

Existe uma busca **opcional**, que entra quando o produto é disputado ou quando o vendedor já
teve devolução: abrir a aba de perguntas dos cinco primeiros anúncios do mesmo produto e
colher a dúvida que se repete. O molde tem a tabela do que ler e o que fazer com cada coisa.
Ela alimenta a ficha e a descrição, raramente o título, e não autoriza copiar texto, foto nem
ficha de anúncio alheio: o que se colhe é a dúvida do comprador.

Nada disso dá volume de busca, e o arquivo não finge que dá. Dá a palavra, que é o que o
título precisa. Volume de busca real é assunto de `/seo`, com ferramenta própria.

### Passo 4 — O título, que é o trabalho

Duas casas, duas réguas, e uma não serve na outra:

| | Mercado Livre | Shopee |
|---|---|---|
| Limite de caractere | 60, conferido na API da categoria | `[a confirmar]`: o campo do Seller Centre é a régua |
| Ordem | produto + marca + modelo + atributo que identifica | termo mais buscado primeiro, depois produto, marca e atributo |
| Exemplo da casa | `Tênis Adidas Superstar Couro Ecológico` | `Caneca Térmica 500ml Inox Parede Dupla Tampa Rosqueável` |
| O corte que importa | o cadastro barra o excedente | a grade de busca do aplicativo corta o fim na tela |

O que fica fora do título nas duas, porque já mora em outro campo do anúncio:

- **Cor e tamanho** — viram variação do mesmo anúncio. Se o produto só existe numa versão, o aviso se ignora com consciência
- **Condição** — usado, seminovo e recondicionado têm campo próprio
- **Frete, parcelamento e devolução** — a plataforma mostra isso antes de o comprador abrir o anúncio
- **Promoção e desconto** — o desconto já aparece destacado, e a palavra no título só gasta caractere e chama moderação
- **Marca de outro fabricante** — só entra com "para" ou "compatível com". `Capa para iPhone 13 Silicone` passa; `Capa Tipo iPhone` é denúncia esperando acontecer

Medir, nunca olhar:

```bash
node scripts/marketplace.js titulo "Caneca Térmica Ecolife Trilha 500ml Inox Parede Dupla" \
  --plataforma ml --termo "caneca térmica"
```

Contar caractere de cabeça erra por dois ou três, e é exatamente a faixa em que o erro
acontece. Título de 63 caracteres não dá erro na tela: chega no cadastro como um título de 60
com o fim serrado.

### Passo 5 — A ficha técnica, e o que fica pendente

Atributo em branco custa duas vezes. Quem filtra a busca por "voltagem 220V" não vê o
produto, e a plataforma trata anúncio incompleto como anúncio de qualidade pior.

No Mercado Livre a lista de obrigatórios muda por categoria, e sai por comando:

```bash
node scripts/marketplace.js limites MLB1055
```

O comando devolve, daquela categoria, o limite de título, de subtítulo, de descrição e de
foto, mais a lista de atributos obrigatórios. Quando um número divergir do JSON de regras, o
JSON é que está velho: atualizar o valor junto com a data em `conferido_em`, nunca ajustar na
direção contrária.

A regra que não se negocia: **atributo que o dono não informou fica `[pendente]` no arquivo.**
Não se escreve "Material: aço inox" porque a foto é prateada, nem "Garantia: 12 meses" porque
é o costume do setor, nem "Peso: 500 g" porque parece leve. Pendente é informação honesta que
o dono resolve em dois minutos com o produto na mão; chute é devolução com avaliação de uma
estrela e a frase "não é o que estava escrito".

### Passo 6 — A descrição, em cinco partes

Ninguém lê descrição inteira. Ela é consultada: o comprador procura a medida, a
compatibilidade e o que vem na caixa. Por isso a ordem é de resposta, não de argumento:

1. **O que é:** produto, material, capacidade, em duas linhas
2. **Medidas e o que vem na caixa:** número, não adjetivo
3. **Como usar e como cuidar:** o que evita a devolução por uso errado
4. **O que não é:** "não acompanha carregador", "não vai à lava-louças", "não mantém gelado por 24 horas". Essa parte devolve mais dinheiro do que qualquer argumento de venda
5. **Garantia e prazo:** o legal é seu de qualquer jeito, 30 dias pra produto não durável e 90 pra durável, contados da entrega (CDC, art. 26), mais o contratual se a loja der algum

Fora da descrição, sempre: telefone, e-mail, link, rede social e qualquer pedido pra fechar
por fora. Tirar a venda de dentro da plataforma é a violação que derruba anúncio e conta mais
rápido, e está escrita em letra grande no Guia de Violação de Anúncio da Shopee
(https://help.shopee.com.br/portal/4/article/76225, conferido em 22/09/2026).

Com a descrição escrita, o arquivo fica assim:

```markdown
# <produto> — anúncio <Mercado Livre | Shopee>

- **Plataforma:** <mercado-livre | shopee>
- **Categoria:** <categoria escolhida na plataforma>
- **Termo mais buscado:** <termo, e de onde veio>
- **Preço:** R$ <valor>
- **Fotos:** <quantas, e a ordem delas>
- **Variações:** <cor, tamanho, voltagem, ou "só existe nesta versão">
- **Restrição:** <licença, registro Anvisa ou Inmetro, categoria restrita, ou "não se aplica">
- **Título:** <o título, medido por comando>

## Ficha técnica

| Atributo | Valor |
|---|---|
| Marca | <marca, ou "sem marca"> |
| Modelo | <modelo> |
| <atributo da categoria> | <valor, ou [pendente]> |

## Descrição

### O que é
### Medidas e o que vem na caixa
### Como usar e como cuidar
### O que não é
### Garantia

## Checklist operacional

- [ ] Chat: quem responde, e em quanto tempo no pior dia da semana
- [ ] Envio: prazo de postagem que se cumpre com a loja cheia
- [ ] Devolução: 7 dias de arrependimento (CDC, art. 49) e a política da plataforma
- [ ] Avaliação: quem lê e quem responde

## Pendente

| O que falta | Onde o dono acha | O que acontece se ficar vazio |
|---|---|---|

## Fontes e datas

| O que | Fonte | Conferido em |
|---|---|---|
```

A seção **Pendente** é parte da entrega, não sobra. Ela é a lista de tarefas de dois minutos
que separa um anúncio publicável de um anúncio chutado.

### Passo 7 — Conferir por comando

```bash
node scripts/marketplace.js conferir produtos/caneca-termica-500ml/anuncio-mercado-livre.md
node scripts/verificar.js texto produtos/caneca-termica-500ml/anuncio-mercado-livre.md
```

O `conferir` mede três coisas, e só três, porque são as que são regra fixa da casa:

1. **Tamanho de campo:** caractere do título e da descrição, foto declarada, contra o limite do JSON. Onde o limite está `a_confirmar`, ele escreve isso em vez de inventar um número
2. **Atributo obrigatório vazio:** o que está na lista mínima da plataforma e ficou em branco, `[pendente]` ou fora da ficha
3. **Palavra vetada:** os padrões que o guia de violação proíbe: contato fora da plataforma, superlativo sem prova, marca de terceiro pendurada, frete e promoção no título, promessa de resultado de saúde, termo repetido três vezes

Cada achado sai com gravidade, o trecho onde está, o conserto e a fonte com data de
conferência. O comando termina com código 1 quando existe REPROVA ou CORRIGIR, e 0 quando só
restam aviso e pendência. Aviso não impede publicar; ele existe pra ser lido e decidido, como
o caso da cor no título de produto que só existe numa cor.

O que o script **não** faz, de propósito: prever posição na busca, estimar quanto o anúncio
vai vender, calcular comissão, opinar se o título é bonito. Nada disso é regra fixa, e medidor
que finge medir o que não mede estraga a confiança no que ele mede de verdade.

Para guardar o laudo junto do anúncio:

```bash
node scripts/marketplace.js conferir produtos/caneca-termica-500ml/anuncio-mercado-livre.md \
  --saida produtos/caneca-termica-500ml/laudo-mercado-livre.md
```

Corrigir sempre no arquivo do anúncio e rodar de novo. O laudo é derivado; editar o laudo pra
ele ficar verde não muda nada no cadastro da plataforma.

### Passo 8 — O mesmo produto na outra casa

Não é copiar e colar. Um arquivo por plataforma, porque a régua do título muda e o nome dos
atributos também:

```bash
node scripts/marketplace.js esqueleto shopee --produto "Caneca térmica 500ml" \
  --saida produtos/caneca-termica-500ml/anuncio-shopee.md
```

O que muda entre as duas: a ordem e o limite do título, os nomes dos campos da ficha, e o peso
e as dimensões do pacote, que a Shopee usa pro frete. O que não muda: os números da ficha. Se
a altura é 22 cm num arquivo e 21 cm no outro, um dos dois está errado, e o comprador que
receber vai descobrir qual.

Uma coisa que economiza discussão depois: anúncio quase igual na mesma loja é o que a Shopee
chama de duplicado, e o caminho é variação do mesmo anúncio em vez de anúncio novo (Guia de
Violação de Anúncio, item 3; fonte e data no JSON de regras). Por isso o campo **Variações**
existe no esqueleto e o script pergunta quando ele fica vazio.

### Passo 9 — O checklist operacional, que é o que sustenta

O anúncio bom vende uma vez. O que decide se a loja continua vendendo é a operação, e ela não
muda de mês pra mês:

- **Chat** — as duas casas medem tempo e taxa de resposta e mostram o número no painel. A meta que funciona é a que se cumpre no pior dia da semana, não a ideal
- **Pergunta que chega três vezes** — não é dúvida, é buraco na ficha ou na descrição. Ela vira texto do anúncio, e aí o Passo 6 roda de novo
- **Envio** — o prazo de postagem prometido é o que se cumpre com a loja cheia. Atraso medido pela plataforma cobra caro, e o desconto sai da exposição
- **Arrependimento** — compra pela internet é fora do estabelecimento, então o consumidor pode desistir em 7 dias contados do recebimento (CDC, art. 49), com devolução dos valores pagos, mesmo com o produto perfeito
- **Vício do produto** — 30 dias pra não durável e 90 pra durável, contados da entrega (CDC, art. 26). A política da plataforma pode ser mais generosa; menos do que isso, não
- **Penalidade** — na Shopee, anúncio excluído por violação gera ponto, e acúmulo de ponto limita a cota de anúncio por 28 dias. Perder cota é perder a vitrine inteira, não um produto

Avaliação ruim que já chegou é conversa de `/responder-avaliacoes`. O que evita a próxima é o
item 4 da descrição.

### Passo 10 — Fechar

Três coisas e a skill acaba:

1. Mostrar a seção **Pendente** como pergunta única, com a lista do que falta e onde ele acha cada coisa (etiqueta, nota fiscal, embalagem, balança)
2. Perguntar uma vez se vale registrar o produto e o preço em `_memoria/oferta.md`, que é onde a oferta do negócio mora
3. Oferecer o `/rotina` pra uma volta trimestral nos anúncios, e anotar a data. Régua de plataforma muda por comunicado, e o JSON de regras envelhece

Se a próxima pergunta dele for sobre dinheiro, a bola passa: quanto sobra depois da comissão
é `/caixa` e `/conciliar`; quanto cobrar é `/preco`; o custo por unidade é `/ficha-tecnica`.

---

## Regras

- **Nada se deduz da foto.** Material, voltagem, medida, peso, composição, código de barras e garantia são informação do dono. Sem resposta, o campo fica `[pendente]` no arquivo e aparece na seção Pendente. Ficha preenchida por dedução é devolução marcada com hora
- **As três conferências são do script.** Caractere de título, atributo obrigatório vazio e palavra vetada saem de `scripts/marketplace.js`. Contagem feita na conversa erra na faixa exata em que o erro importa, entre 58 e 63 caracteres
- **Só Mercado Livre e Shopee.** As duas têm limite de campo e guia de violação verificáveis. Outra plataforma entra quando alguém abrir a fonte oficial dela e escrever o JSON datado, não por analogia
- **Fator de ranqueamento não entra.** Nenhuma das duas casas publica a fórmula da busca, e o que circula em blog muda de versão a cada semestre. Se o dono perguntar "como eu subo no ranking", a resposta honesta é o que se pode fazer: título com o termo certo, ficha completa, foto própria, chat rápido, prazo cumprido
- **Campanha de data e comissão não entram.** Regra de adesão de 9.9, 11.11 e Black Friday muda a cada edição, e comissão varia por categoria, plano e programa de frete. A fonte é o comunicado do painel dele na semana, e o simulador da própria conta
- **Regra vem de arquivo datado.** Cada limite, atributo mínimo e padrão de palavra vetada mora em `templates/crescimento/marketplace-<plataforma>.json` com `fonte` e `conferido_em`. Regra citada de memória na conversa não vale; se a plataforma mudou, muda o JSON, com a data
- **Limite não publicado fica `a_confirmar`.** O campo de título da Shopee não tem número em página aberta, e o arquivo diz isso. Inventar 100 ou 255 caracteres porque "é o usual" é o tipo de erro que só aparece quando o cadastro corta o texto
- **Lei se cita com artigo e URL.** Arrependimento em 7 dias é o art. 49 do CDC; prazo de vício é o art. 26; publicidade enganosa é o art. 37, § 1º; informação da oferta é o art. 31. Todos com fonte e data na tabela do molde. Artigo citado errado é pior que artigo nenhum
- **Superlativo precisa de prova ou sai.** "O melhor do Brasil" e "imbatível" são afirmação publicitária sem sustentação. A troca é pela característica que sustenta a frase, com número: garantia de 12 meses, envio no mesmo dia, 640 g na balança
- **Contato fora da plataforma não entra em lugar nenhum.** Telefone, e-mail, link, rede social e convite pra fechar por fora derrubam anúncio e conta. Se o dono quiser levar o cliente pra venda direta, isso se faz depois da entrega, e é `/pos-venda` e `/whatsapp`
- **Marca de terceiro só com "para" ou "compatível com".** "Tipo", "estilo", "similar a" e "inspirado em" são denúncia de propriedade intelectual em fila. E a marca declarada na ficha é a do produto anunciado, ou "sem marca"
- **Cor e tamanho são variação, não título.** Produto que existe em três cores é um anúncio com três variações. Três anúncios quase iguais é o que a Shopee trata como duplicado
- **Produto regulado para aqui.** Suplemento, cosmético, produto infantil, equipamento elétrico e item com exigência de Anvisa ou Inmetro têm regra própria de oferta e de publicidade, e a alegação de efeito passa pelo `/publicidade-regulada` antes de ir pro ar. A lista de produto proibido e restrito de cada casa se confere antes de publicar, não depois
- **Não substitui advogado nem contador.** Regra de plataforma muda por comunicado, e tributação de venda on-line depende do regime do negócio, que é conversa de `/obrigacoes` e do contador dele
- **Fronteira com as vizinhas:** o `/produto` é a página no site do próprio usuário, onde a régua é dele; o `/seo` é a busca do Google, e lá o marketplace aparece do outro lado, como concorrente que disputa o mesmo termo; o `/ficha-tecnica` é o custo por unidade produzida; o `/preco` é quanto cobrar; o `/delivery` é margem por canal em aplicativo de comida; o `/combos` é o que sai junto no mesmo pedido; o `/estoque` é quanto comprar e quando; o `/conciliar` bate o repasse que caiu na conta com o que a plataforma prometeu; o `/impressao` é a etiqueta e o encarte que vão na caixa; o `/responder-avaliacoes` cuida da avaliação que já chegou. Esta skill faz uma coisa só: o anúncio pronto pra colar, na régua da casa
