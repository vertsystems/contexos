# Reposição de estoque: o método e os cortes

Referência do `/estoque`. As contas que decidem compra, os cortes que tiram um item da
conta, a curva ABC com a política de cada classe, o molde dos dois arquivos de entrada e os
números de mercado com fonte e data. O workflow está na skill; aqui fica o que sustenta
cada número.

> **A fronteira desta pasta.** `templates/operacao/` é o uso da operação do próprio
> negócio. Este arquivo é o produto físico na prateleira. O mês fechado em dinheiro é o
> `/caixa`, o custo de produzir cada porção é o `/ficha-tecnica`, a taxa do aplicativo é o
> `/delivery`, e qualquer arquivo solto que o dono queira entender é o `/analisar-dados`.

---

## 1. As contas

Reposição não é palpite. Quatro contas decidem a compra, na ordem, cada uma usando o
resultado da anterior; cobertura e giro entram depois, pra diagnóstico:

```
média diária     = quantidade vendida ÷ dias em que o item esteve à venda na janela
estoque mínimo   = média diária × dias de segurança
ponto de pedido  = média diária × prazo do fornecedor + estoque mínimo
comprar          = média diária × (prazo + segurança + alvo) − saldo,
                   depois subindo pro pedido mínimo e pro múltiplo de caixa
cobertura        = saldo atual ÷ média diária          (em quantos dias acaba)
giro anualizado  = (quantidade vendida ÷ dias da janela × 365) ÷ saldo atual
```

**O denominador da média não é a janela.** É o tempo em que aquele item esteve à venda
dentro dela: da primeira venda dele até o fim. Item que entrou há 12 dias e vendeu 48
unidades tem média de 4 por dia, não de 0,53. Dividir por 90 corridos faz o lançamento novo
parecer item morto, e é exatamente aí que a falta acontece. O giro é o único número que usa
a janela inteira, porque ele mede quantas vezes o saldo de hoje circularia num ano.

Estoque mínimo e ponto de pedido são as fórmulas clássicas do varejo pequeno: "venda média
diária × dias de cobertura de segurança" e "(venda média por dia × prazo do fornecedor em
dias) + estoque mínimo". O exemplo do mercadinho: 900 unidades em 90 dias dão 10 por dia; com
3 dias de segurança o mínimo é 30; com prazo de 5 dias a espera come 50; o pedido sai quando
o saldo chega a 80 (vendasimples.com.br/blog/estoque-minimo-e-ponto-de-pedido, conferido em
22/09/2026).

O `scripts/estoque.js` roda essas contas e grava o exemplo numérico de um item no fim do
arquivo, pra o dono conferir na calculadora.

**Ponto de pedido não é estoque mínimo.** O mínimo é o colchão; o ponto de pedido é o
gatilho, e existe porque a mercadoria demora pra chegar. Quem compra quando bate no mínimo já
está atrasado pelo prazo do fornecedor.

---

## 2. Prazo do fornecedor e dias de segurança

Esses dois números não saem de arquivo nenhum: só o dono sabe, e é por isso que a skill
pergunta e grava.

- **Prazo do fornecedor (lead time)** — dias entre fazer o pedido e a mercadoria estar na
  prateleira pra vender: pedido, entrega, conferência e reposição. O prazo que interessa é o
  pior recente, não o prometido no catálogo
- **Dias de segurança** — quantos dias de venda ficam de colchão pra fornecedor que atrasa,
  semana que vende mais e erro de saldo. Costuma andar com a classe ABC: item A pede mais
  colchão porque a falta dele custa venda; item C aceita faltar
- **Múltiplo de compra** — caixa fechada, fardo, mínimo do pedido. Comprar 7 quando o
  fornecedor só vende caixa de 12 é conta que não vira pedido. Entra no arquivo de
  parâmetros e o script arredonda pra cima
- **Cobertura alvo** — quantos dias de venda a compra cobre depois de chegar. Trinta dias é
  um padrão de comércio local; quem compra de importador com prazo de 45 dias trabalha com
  alvo maior, e quem tem loja pequena e caixa curto trabalha com menos

Quando o dono não sabe o prazo, a pergunta que funciona é a última entrega: "quando você
pediu a última vez, quantos dias levou pra chegar?" Sem resposta, o número entra como
`[a confirmar]` e a conta daquele item vale menos.

---

## 3. Quando a média mente (os cortes)

Média de 90 dias aplicada sem olhar faz a conta parecer científica e mandar comprar errado. O
script aplica cinco cortes, cada um com um número; o item que bate em qualquer um sai da
tabela de compra e vai pra lista "a conta não decide":

| Corte | Como o script mede | Por que |
|---|---|---|
| **Histórico curto** | menos de 30 dias entre a primeira venda e o fim da janela | 12 dias de venda ainda não dizem qual é o ritmo, e o dono sabe se o lançamento pegou |
| **Poucos dias com venda** | vendeu em menos de 6 dias diferentes na janela | cinco dias de venda em três meses não formam ritmo diário |
| **Concentração num dia** | mais de 50% do volume saiu num único dia, com pelo menos 5 un na janela | pedido de atacado, festa, encomenda. Diluir isso em 90 dias esconde que a venda do dia a dia é outra |
| **Ritmo virado** | média dos últimos 28 dias é o dobro ou a metade da anterior, com 5 un ou mais e janela de 56 dias pra cima | tendência ou sazonalidade em curso: a média dos 90 dias já não descreve a semana que vem |
| **Pico mensal** | com 3 meses ou mais na janela e 12 un no total, um mês vendeu o dobro da mediana e pelo menos 4 un | sazonalidade visível (protetor solar, chocolate, material escolar, panetone) |

Os pisos de volume existem pra não transformar ruído em diagnóstico: 2 unidades contra
mediana de 1 dobram em percentual e não significam nada.

Sazonalidade e tendência não se resolvem com média maior: se resolvem com o dono dizendo o
que vem. A skill pergunta, mostra o número medido, e grava a resposta.

**O que o corte não faz.** Ele não impede a compra: o item continua na página com o motivo
escrito, pra o dono decidir olhando.

---

## 4. Perecível fica fora

Item com validade curta não se repõe por ponto de pedido. Quem manda é a validade, o lote e
a frequência de entrega, não a cobertura em dias. Iogurte com 12 dias de validade e
cobertura calculada de 20 dias significa perda, não folga.

A skill marca o perecível na coluna `perecivel` e o deixa numa seção própria, com média e
cobertura apenas como pista. Compra de perecível se decide por frequência de entrega e lote
mínimo, e o desperdício se mede pesando o que foi jogado fora, não estimando.

---

## 5. Curva ABC e a política de cada classe

A curva ordena os itens pela receita da janela e corta em três classes pelo acumulado: até
80% é A, até 95% é B, o resto é C. O padrão é a distribuição 80/20, e o que muda entre
operações é a política de cada classe, não o corte
(nextar.com.br/blog/estoque-facil-e-eficiente-com-a-curva-abc, conferido em 22/09/2026).

| Classe | O que é | Política |
|---|---|---|
| **A** | poucos itens, a maior parte da receita | contagem física semanal, ruptura zero, mais dias de segurança, negociação de prazo com o fornecedor |
| **B** | o meio da tabela | contagem mensal, ponto de pedido normal |
| **C** | muitos itens, pouca receita | contagem trimestral, comprar em lote maior e com menos frequência, aceitar faltar |

Duas coisas que a curva não diz, e que a skill precisa dizer:

- **Classe A não é margem.** Um item pode trazer muita receita e pouco lucro. Quem quer a
  curva por margem precisa do custo na planilha, e aí a conta é do `/ficha-tecnica` ou do
  `/caixa`
- **Classe C não é lixo.** Item de baixa receita que segura a visita do cliente (pilha,
  isqueiro, sacola) fica, com compra menos frequente

---

## 6. Cobertura, giro e o dinheiro parado

**Cobertura** é a pergunta que o dono faz de verdade: em quantos dias isso acaba. É o uso
que o Sebrae cita como exemplo de análise de dados com inteligência artificial em pequeno
negócio, na frase "Prevê demanda (ex: 'Estoque de Y vai acabar em 10 dias')"
(blog.rn.sebrae.com.br/inteligencia-artificial-pequenos-negocios, publicado em 26/01/2026,
conferido em 22/09/2026).

**Giro** é quantas vezes o estoque circula no período. A conta cheia divide o custo da
mercadoria vendida pelo estoque médio (início mais fim, dividido por dois). O script não tem
o saldo do início, só o de hoje: o giro dele é a venda anualizada sobre o saldo atual, e a
página escreve isso, porque saldo atual atípico distorce o número.

**Não existe giro bom universal.** Supermercado, loja de roupa e distribuidor de peça vivem
em ordens de grandeza diferentes. Referência por setor entra com fonte e data, ou entra como
`[a confirmar]`. O que serve sempre é comparar o item com ele mesmo no mês anterior.

**Dinheiro parado** é saldo × custo unitário. Com o custo de compra, o número é o capital
imobilizado. Sem o custo, o script usa o preço médio de venda e escreve que usou: o valor
sai inflado pela margem, e apresentar isso como capital parado supera a realidade. Sem custo
e sem venda, o valor sai `[a confirmar]`, porque não existe preço de onde tirar.

**Encalhe é classificação, não ordem de compra.** Por isso o corte de cobertura pega também
o item de média fraca, marcado como tal na tabela: um item com 300 unidades e quatro vendas
em 90 dias é o maior dinheiro parado da loja, e esconder ele em "a conta não decide" custa
caro. O mesmo item aparece nas duas seções, de propósito.

**Saldo negativo no arquivo** aparece nos avisos e não vira compra: quando o PDV baixa venda
sem ter dado entrada na mercadoria, o saldo fica abaixo de zero e a conta não tem como
adivinhar o número certo. Valor de estoque pra balanço, baixa de perda e tributação de
mercadoria são do contador do negócio; esta página decide compra da semana.

---

## 7. Números de mercado, com fonte e data

| Número | Fonte | Conferido em |
|---|---|---|
| Ruptura de 11,9% nas gôndolas de supermercado em setembro de 2025, queda de 1,2 ponto sobre agosto | Índice de Ruptura Neogrid, neogrid.com/noticias/ruptura-setembro-2025 | 22/09/2026 |
| Média de ruptura de 14,14% em 2023, ainda elevada em categorias essenciais | CNDL VarejoSA, cndl.org.br/varejosa/gestao-de-estoque-inteligente-como-o-pequeno-varejo-pode-reduzir-ruptura-e-excesso (publicado em 26/02/2026) | 22/09/2026 |
| Previsão de demanda citada como uso de inteligência artificial em gestão: "Estoque de Y vai acabar em 10 dias" | Sebrae RN, blog.rn.sebrae.com.br/inteligencia-artificial-pequenos-negocios (publicado em 26/01/2026) | 22/09/2026 |
| Estoque mínimo e ponto de pedido: fórmulas e exemplo do mercadinho | vendasimples.com.br/blog/estoque-minimo-e-ponto-de-pedido | 22/09/2026 |
| Curva ABC no corte 80/95 e política por classe | nextar.com.br/blog/estoque-facil-e-eficiente-com-a-curva-abc | 22/09/2026 |

Ruptura de 11,9% quer dizer que, a cada cem itens procurados, quase doze não estavam lá. Num
negócio pequeno ninguém mede isso, mas o efeito é o mesmo: quem não achou compra do vizinho
e às vezes não volta. Esse é o lado caro da falta; o do excesso é o dinheiro que dormiu na
prateleira em vez de pagar a conta do mês.

Número novo entra nesta tabela com URL e data. Blog de software de gestão serve pra achar a
fórmula e o consenso do setor; número de mercado precisa da fonte que mediu.

---

## 8. Os erros que aparecem toda semana

- **Saldo do sistema não é o da prateleira.** Furto, quebra, venda sem baixa e devolução não
  lançada afastam os dois. Antes da primeira compra grande pela conta, contar na mão os itens
  da classe A. Se o sistema erra o saldo, ele erra o ponto de pedido junto
- **Comprar porque o fornecedor deu desconto.** O desconto de 10% em três meses de estoque
  custa o dinheiro parado mais o risco de encalhe. A conta é o desconto contra o custo do
  capital e o espaço
- **Comprar o múltiplo grande sem olhar a cobertura.** Caixa de 24 num item de 1 por semana é
  meio ano de prateleira
- **Tratar promoção passada como demanda normal.** A semana da promoção infla a média. Se a
  janela pega uma promoção, o dono precisa dizer, e o item vira caso de olhar
- **Deixar o item novo fora da conta pra sempre.** O script libera sozinho quando o histórico
  chega aos 30 dias
- **Repor perecível por cobertura.** Seção 4, e é o erro mais caro de padaria e açougue

---

## 9. O molde dos dois arquivos

O script recusa arquivo fora do molde em vez de adivinhar coluna: adivinhar coluna de
planilha de cliente é como se produz compra errada com cara de relatório.

**Vendas** (uma linha por venda, por item de venda ou por dia; separador `;` ou `,`):

```
data;sku;qtd;valor
01/07/2026;CAF-500;3;89,70
01/07/2026;SAB-90;5;24,50
```

- `data` aceita DD/MM/AAAA e AAAA-MM-DD. Data que não existe (31/02) é recusada, nunca
  corrigida em silêncio
- `qtd` é a quantidade vendida. Linha negativa (devolução, estorno) fica fora da média e
  aparece nos avisos
- `valor` é o total da linha em reais. Serve pra curva ABC e, sem custo, pro dinheiro parado
- Sinônimos aceitos no cabeçalho: `data_venda`, `dia`, `emissao` · `codigo`, `cod`,
  `referencia` · `quantidade`, `qtde` · `valor_total`, `total`, `faturamento`

**Parâmetros** (uma linha por SKU):

```
sku;nome;saldo;custo;lead_time;dias_seguranca;perecivel;multiplo;minimo
CAF-500;Café torrado 500g;18;17,90;7;5;nao;12;12
```

- Obrigatórias: `sku`, `saldo`, `lead_time`, `dias_seguranca`
- Opcionais: `nome` (só pra leitura humana), `custo` (custo unitário de compra),
  `perecivel` (`sim` ou `nao`), `multiplo` (caixa fechada), `minimo` (pedido mínimo)
- Sinônimos aceitos: `estoque`, `saldo_atual` · `prazo`, `leadtime` · `seguranca`,
  `dias_de_seguranca` · `custo_unitario`, `custo_medio`

Os dois moldes prontos estão em `templates/operacao/estoque-vendas.csv` e
`templates/operacao/estoque-parametros.csv`, e `node scripts/estoque.js modelo dados/`
grava uma cópia preenchida na pasta do usuário.

**O que cada PDV exporta.** Bling, Tiny, Kyte e Nex exportam relatório de vendas por período
em CSV ou XLSX, com nome de coluna próprio. O caminho é exportar, renomear o cabeçalho pro
molde e rodar. O saldo costuma sair de outro relatório (posição de estoque), e o prazo do
fornecedor não sai de nenhum: vem da conversa.
