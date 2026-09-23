# Glossário — um nome por conceito, e a grafia de cada lugar

Referência da skill `/glossario`. Como puxar o vocabulário de um negócio, como fechar a
lista de estados de cada coisa, e como escrever isso de um jeito que máquina confere.

> O que construir e em que ordem está em `templates/software/escopo.md`. Quanto custa está
> em `templates/software/custo.md`. Decisão grande de negócio, com alternativas e data de
> revisão, está em `templates/operacao/decisao.md`. Aqui não se decide nada: aqui se combina
> como as coisas se chamam, o que é uma decisão pequena tomada duzentas vezes.

---

## Por que o mesmo conceito ganha três nomes

Ninguém escolhe dois nomes de propósito. Acontece assim: na segunda-feira o banco recebe a
tabela `orcamento`, porque o dono falou orçamento. Na quinta, a tela é escrita com a palavra
que ficou mais bonita no botão, e nasce "Proposta". No mês seguinte a integração com o
e-mail precisa de uma função, e quem escreveu estava lendo documentação em inglês: sai
`sendQuote`.

Três nomes, nenhuma discussão, e nenhum erro visível. O preço aparece depois, sempre nos
mesmos três lugares:

- **Na consulta** que soma o mês e ignora metade dos registros, sem dar erro nenhum
- **No atendimento**, quando a cliente pergunta do orçamento e a atendente procura por
  proposta
- **Na próxima sessão de trabalho**, quando quem for mexer no código tem que adivinhar se
  `proposta` e `orcamento` são a mesma coisa ou duas coisas parecidas

O terceiro é o mais caro e o menos percebido. Vocabulário instável faz toda conversa sobre o
sistema começar pela tradução.

---

## Um conceito, um nome, três grafias

A regra é uma só: **um conceito tem um nome**. O que muda de lugar pra lugar é a grafia, não
a palavra.

| Onde | Como se escreve | Regra |
|---|---|---|
| Banco de dados | `orcamento` | minúsculas, sem acento, singular, underline entre palavras |
| Código | `orcamento`, `orcamentoId` | a mesma palavra, na convenção da linguagem |
| Tela | Orçamento | com acento, do jeito que gente lê |
| WhatsApp e e-mail | orçamento | a palavra que o cliente usa, sem jargão |
| Relatório | Orçamento | igual à tela, pra ninguém reconciliar na mão |

Quando a palavra do cliente e a palavra do sistema divergem de verdade, a do cliente ganha na
tela e a do sistema ganha no banco, e as duas ficam escritas na mesma linha do glossário. O
que não pode é a divergência viver só na cabeça de quem escreveu.

---

## Os pares que mais se confundem

Cada linha aqui é um par que já custou retrabalho em sistema de negócio pequeno. A coluna da
direita aponta a referência que define o conceito em dado estruturado, conferida em
22/09/2026.

| Par | A diferença | Referência |
|---|---|---|
| orçamento × pedido | Orçamento é a oferta antes do sim. Pedido é o que existe depois dele: schema.org define Order como "a confirmation of a transaction (a receipt)" (conferido em 23/09/2026) | https://schema.org/Offer e https://schema.org/Order |
| pedido × item | Pedido é a compra inteira. Item é um produto dentro dela, com quantidade e preço congelados no dia | https://schema.org/OrderItem |
| produto × item | Produto vive no catálogo e muda de preço. Item é a cópia congelada dentro do pedido | https://schema.org/Product |
| reserva × pedido | Reserva prende um horário ou uma vaga. Pedido prende mercadoria | https://schema.org/Reservation |
| cliente × contato | Cliente comprou. Contato deixou o telefone. Misturar os dois estraga toda conta de conversão | https://schema.org/customer |
| cliente × usuário | Cliente compra. Usuário entra no sistema pra trabalhar, e às vezes não é gente: é integração | https://schema.org/Person |
| cobrança × pagamento | Cobrança é o que se pede. Pagamento é o que entra. Fatura é o documento | https://schema.org/Invoice |
| entrega × frete | Entrega é o transporte. Frete é o preço dele | https://schema.org/ParcelDelivery |
| estoque × disponível | Estoque é o que está na prateleira. Disponível é estoque menos reserva. Uma coluna só pras duas coisas vende o que não tem | https://schema.org/ItemAvailability |
| cancelado × devolvido × estornado | Cancelado nunca aconteceu. Devolvido voltou. Estornado é o dinheiro voltando, e pode acontecer sem devolução | https://schema.org/OrderStatus |

A lista completa, no formato que o script lê, está em
`templates/software/sinonimos-de-dominio.json`.

---

## Estado não é adjetivo

Estado é uma lista fechada, num campo só, com transições escritas. Três coisas que o dono do
sistema costuma descobrir tarde:

**Um campo, não três colunas de sim ou não.** Sistema que guarda `pago`, `cancelado` e
`entregue` como três caixinhas separadas permite as oito combinações, inclusive as quatro que
não existem no mundo. Pedido cancelado e entregue ao mesmo tempo passa pelo banco sem
reclamar, e alguém vai ter que explicar isso pro contador.

**A lista fecha.** Estado novo entra no glossário antes de entrar no código. Se entrar
primeiro no código, ele nasce como texto solto numa comparação, escrito de um jeito na tela e
de outro no relatório.

**A transição também é um combinado.** `pago → cancelado` pode ser permitido, e aí vira
estorno. `entregue → rascunho` não existe em negócio nenhum, e o sistema tem que recusar em
vez de aceitar calado.

### As perguntas que forçam o caso de borda

Fazer uma por vez, e escrever a resposta no glossário antes da próxima:

- Pedido pago e depois cancelado é o quê? Fica no faturamento do mês?
- Pedido entregue e depois devolvido: o estado volta, ou é um estado novo?
- Orçamento parado é parado a partir de quantos dias sem resposta? Quem conta, o sistema ou a
  pessoa?
- Orçamento expirado ainda dá pra aceitar? Quem pode reabrir?
- Cliente parado é parado desde quando? Compra antiga conta ou não?
- Reserva de quem não apareceu tem estado próprio, ou fica cancelada como qualquer outra?
- Produto esgotado sai da tela, ou aparece marcado?
- Pagamento recusado e tentado de novo é o mesmo pagamento ou outro?
- Se a mesma pessoa é cliente e funcionária, são dois registros ou um?

A pergunta do "quantos dias" é a que mais aparece e a que menos tem resposta pronta. Quem
decide é o dono, com o número na mão, e o número vai escrito no glossário. Sem ele, cada
consulta escolhe o seu, e dois relatórios da mesma semana discordam.

---

## Os estados que ninguém lembra de modelar

Duas listas públicas servem de checklist. Nenhuma delas é a lista do negócio do usuário, e as
duas mostram o que falta na primeira versão de quase todo sistema.

**Pedido**, pela enumeração `OrderStatus` de schema.org, conferida em 23/09/2026 em
https://schema.org/OrderStatus, tem oito valores: `OrderPaymentDue`, `OrderProcessing`,
`OrderInTransit`, `OrderPickupAvailable`, `OrderDelivered`, `OrderProblem`, `OrderReturned` e
`OrderCancelled`. Os dois que quase sempre faltam no sistema caseiro são o de problema e o de
devolução, e são justamente os que geram ligação.

**Reserva**, pela enumeração `ReservationStatusType`, conferida em 23/09/2026 em
https://schema.org/ReservationStatusType, tem quatro: `ReservationPending`,
`ReservationConfirmed`, `ReservationHold` e `ReservationCancelled`. Falta o que mais importa
no salão, na clínica e na barbearia: o não comparecimento. Esse entra na mão, e vale separar
de cancelamento, porque um avisa e o outro não.

Copiar essas listas não resolve. Elas servem pra provocar a pergunta que o dono responde.

---

## Nome que não serve

- **`dados`, `info`, `valor`, `tipo`, `flag`, `aux`, `temp`** — não dizem de que. Toda vez que
  aparecem, quem lê tem que abrir outro arquivo
- **`status1`, `status2`, `novoStatus`** — dois estados no mesmo registro é a marca de uma
  modelagem que não fechou
- **Sigla de duas letras** (`OS`, `NF`, `PV`) — casa com qualquer palavra e nenhuma máquina
  consegue conferir. Escreva a forma completa, e deixe a sigla só na tela
- **Booleano que quer ser estado** — `ativo`, `pago`, `cancelado` como sim ou não. Dois
  booleanos já são quatro combinações, e três já são oito
- **Nome de tela no lugar de nome de conceito** — `telaPedido`, `modalCliente`. A tela muda, o
  conceito fica
- **Inglês e português na mesma palavra** — `pedidoStatus`, `clienteList`. Escolha uma língua
  por camada e escreva a escolha no glossário
- **Plural onde o registro é um** — tabela `pedidos` com uma linha por pedido. Singular na
  tabela, plural na coleção

Nada disso é regra de bom gosto. É o que faz a busca no código achar tudo, ou achar nada.

A lista que a máquina confere está no campo `nomes_vagos` de
`templates/software/sinonimos-de-dominio.json`, e o `varrer` marca cada uma dessas palavras com
o arquivo e a linha onde ela aparece. Sigla de duas letras fica de fora de propósito: `OS` casa
com qualquer palavra e acusaria meio repositório.

---

## A grafia do banco

- Minúsculas, sem acento, sem cedilha, palavras separadas por underline: `aguardando_pagamento`
- Singular na tabela e na coluna: `pedido`, `pedido_id`, `cliente_id`
- Estado com underline dentro, nunca com espaço. Texto com espaço em campo de estado atrapalha
  toda comparação e some no primeiro `trim()` esquecido
- Uma língua por camada, e a escolha escrita. Banco em português com framework em inglês
  funciona, desde que a fronteira esteja combinada

---

## O que fica fora do glossário

Glossário de sistema de negócio pequeno tem entre dez e trinta termos. Passar disso quer dizer
que entrou coisa que não é vocabulário do negócio:

- Termo de infraestrutura (fila, cache, migração, container). Isso vive em `DECISOES.md`, do
  `/backend`
- Nome de biblioteca, de framework e de serviço contratado
- Detalhe de implementação (índice, chave estrangeira, tipo de coluna)
- Conceito que aparece em um lugar só e ninguém mais cita

O corte é simples: se duas pessoas diferentes precisam usar a palavra na mesma frase, ela
entra. Se é só quem escreve código que usa, fica fora.

---

## Como um termo morre

Termo não se apaga: se aposenta. Quando o negócio para de usar a palavra, ela sai da lista de
termos e entra na linha **Nunca** do termo que ficou. Aí o script passa a acusar todo lugar do
código onde a palavra velha sobrou, e a limpeza fica com nome e endereço.

Renomear no código é um trabalho à parte, e a ordem importa: banco por último. Primeiro o
texto da tela e das mensagens, depois o código, depois a coluna, com migração testada e volta
atrás escrita (`templates/backend/versoes.md`). Renomear coluna com o sistema no ar sem isso
tira o sistema do ar.

---

## Checklist antes de fechar o glossário

- [ ] Cada termo tem uma frase de **É** que não usa outro termo do glossário sem definir
- [ ] Cada termo que se confunde com outro tem a linha **Não é**
- [ ] Cada termo tem a grafia do banco, a da tela e a do WhatsApp
- [ ] Cada termo tem a lista **Nunca** com as palavras que o código não pode usar
- [ ] Todo termo que tem ciclo de vida tem **Estados**, **Estado final** e as transições
- [ ] Toda pergunta de borda que o dono respondeu está escrita, com o número quando tem número
- [ ] Nenhum termo com sigla de duas letras na lista **Nunca**
- [ ] Cada termo tem **Dono da palavra** com nome e data em DD/MM/AAAA
- [ ] `node scripts/glossario.js estados <arquivo>` fecha sem problema
- [ ] `node scripts/glossario.js conferir <pasta>` fecha sem problema, ou cada divergência está
      na tabela **Divergências conhecidas**, com arquivo, linha, dono e prazo
- [ ] O `CLAUDE.md` do projeto manda ler o glossário antes de nomear qualquer coisa, e nomeia
      `/escopo`, `/backend`, `/interface` e `/whatsapp`
