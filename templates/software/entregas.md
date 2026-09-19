# Entregas — do escopo aprovado ao plano de execução

Referência da skill `/quebrar`. Como transformar um escopo aprovado numa lista de entregas
que alguém consegue construir uma por uma, mostrar funcionando e marcar como feita.

> **O que não está aqui.** Decidir o que entra e o que fica de fora é
> `templates/software/escopo.md`, e a lista ordenada de funcionalidades nasce lá. Quanto
> custa e quem paga o pedido que chega depois está em `templates/software/custo.md`. Como
> escrever o código de cada entrega é `templates/backend/`. Aqui é o meio do caminho: o
> escopo já disse o quê; este arquivo diz em que pedaços, em que ordem e com que prova.

---

## O escopo diz o quê; a entrega diz o pedaço

Escopo aprovado é uma lista de funcionalidades com critério de aceite. "Controle de
estoque com baixa automática" é um item de escopo. Ninguém constrói isso numa sentada, e
quando alguém tenta, o dono passa três semanas sem ver nada e no fim recebe tudo de uma
vez, com os erros de três semanas dentro.

Entrega é o pedaço desse item que dá para construir, publicar e mostrar em poucos dias.
"Dar baixa de um produto pela tela e ver o saldo mudar" é uma entrega. "Recusar baixa
maior que o saldo, com a mensagem certa" é outra. Cada uma sai do escopo, e cada uma
atravessa o sistema inteiro.

A diferença aparece na conversa com o dono. Item de escopo ele aprova. Entrega ele vê
funcionando na sexta-feira.

---

## A entrega vertical fina

A imagem certa é a bala traçante: um único tiro que atravessa tudo e mostra o caminho. A
primeira entrega passa pela tela, pela regra, pelo banco e pela publicação, com uma
funcionalidade só, do tamanho mais fino que ainda faça sentido. Não prova que o sistema
está pronto. Prova que a arquitetura funciona de ponta a ponta, e que dá para repetir o
gesto.

| Isso é fatia | Isso é camada |
|---|---|
| Lançar um pedido no celular e ver na tela da cozinha | Todas as tabelas do banco modeladas |
| Cadastrar um cliente com nome e telefone e achar ele na busca | A API inteira, sem nenhuma tela |
| Gerar o PDF de uma proposta com os dados de um cliente real | O sistema de login completo, antes de existir o que proteger |

Camada pronta não serve para nada. Ninguém usa metade de uma escada.

**Fina quer dizer sem opções.** A primeira versão de "lançar pedido" tem um campo de
produto, um de quantidade e um botão. Sem desconto, sem observação, sem foto. O que o
dono pedir depois de ver funcionando vira entrega nova, e ele vai pedir menos coisa do
que imaginou antes de ver.

**Fina não quer dizer torta.** O que entra na fatia entra inteiro: valida, avisa o erro em
português, grava, aparece. Cortar escopo é certo. Cortar acabamento do que entrou é o
que produz o sistema que "funciona, mas ninguém confia".

---

## Prova de pronto: o que o dono consegue ver

Critério de aceite, no escopo, é entrada e resultado com número. A prova de pronto da
entrega é mais curta e mais concreta: a cena que o dono assiste e diz "é isso".

| Não serve como prova | Serve |
|---|---|
| "Cadastro de produto funcionando" | Carla cadastra o pão francês pelo celular e ele aparece na lista do balcão |
| "API de pedidos pronta" | Um pedido lançado às 10h05 aparece na tela da cozinha antes das 10h06 |
| "Testes passando" | O fechamento de terça bate com a soma das 41 notas do dia, conferida por comando |
| "Integração com o Pix feita" | Cliente paga R$ 12,50 pelo QR e o pedido muda para "pago" sem ninguém tocar |

Três perguntas separam prova de promessa:

1. **Quem faz a ação?** Uma pessoa com nome, no aparelho que ela usa de verdade
2. **O que ela vê acontecer?** Uma tela, um número, um estado que mudou
3. **Onde?** No sistema publicado, não na máquina de quem construiu

Prova que só quem construiu consegue conferir não é prova. "Rodei o teste e passou" é o
começo da conversa, não o fim.

---

## Estimar em faixa, com o que faz estourar

Número único é mentira com cara de precisão. "Três dias" vira "você disse três dias" na
segunda semana. Faixa é o formato honesto: um piso, quando tudo dá certo, e um teto, com
o que costuma dar errado já dentro.

**Toda faixa vem acompanhada do motivo do teto.** Sem isso, a faixa é só um número único
com margem escondida:

| Entrega | Faixa | Estoura se |
|---|---|---|
| Lançar pedido e ver na cozinha | 2 a 3 dias | a impressora térmica da cozinha exigir formato próprio |
| Pagamento por Pix | 2 a 4 dias | o banco demorar a liberar a chave da API, ou o retorno do pagamento chegar fora de ordem |
| Importar os clientes da planilha | 1 a 3 dias | a planilha tiver telefone em quatro formatos diferentes, o que ela sempre tem |

Os estouros mais comuns, na ordem em que aparecem em sistema de negócio pequeno:

- **Dado real diferente do imaginado** — a planilha tem coluna vazia, o CPF está com ponto, o mesmo cliente aparece três vezes
- **Terceiro no caminho** — chave de API, aprovação de loja, resposta do contador, acesso ao servidor antigo
- **Ferramenta nunca usada** — a primeira integração com um serviço custa bem mais que a segunda: é ali que se descobre a documentação errada e o limite que ninguém avisou
- **Aparelho de verdade** — funciona no computador de quem construiu e trava no celular de 2019 do balcão
- **Regra que ninguém contou** — "ah, mas quando é pedido de funcionário não cobra"

### Dia de trabalho, não dia de calendário

A faixa conta dias de trabalho dedicado. Um time que dedica três dias por semana a esse
sistema leva duas semanas de calendário para cumprir uma faixa de "4 a 6 dias". Escrever
a dedicação no topo da lista é o que permite converter uma coisa na outra por comando,
em vez de prometer "semana que vem" e descobrir na sexta.

### Duas réguas para a faixa

- **Teto acima de uma semana do time real** — a entrega não é uma. Quebre
- **Teto acima do triplo do piso** — ninguém entendeu a entrega ainda. Faixa de "2 a 9 dias" não é estimativa, é o desconhecido com número. Antes de começar, gaste meio dia investigando o que ninguém sabe, e a faixa encolhe sozinha

O que não se faz: somar as faixas e prometer o total como data. O total serve para o dono
decidir se o plano cabe no teto de prazo que ele deu no escopo. Se não cabe, a lista
encolhe por baixo. O teto não se negocia; a lista, sim.

---

## Sinais de entrega grande demais

- O nome tem "e": "cadastro de cliente **e** histórico de compras" são duas
- A prova de pronto precisa de mais de uma cena para ser contada
- Tem mais de um tipo de usuário dentro: o que o balcão faz e o que o gerente vê
- Mistura o caminho feliz com o caminho de erro de outro item
- Depende de duas coisas externas ao mesmo tempo
- Quem vai construir não consegue dizer por onde começa
- A faixa passa de uma semana, ou o teto passa do triplo do piso

### Como quebrar

| Corte por | Exemplo |
|---|---|
| **Caminho feliz primeiro, erro depois** | E1 lança o pedido; E2 recusa pedido com produto sem estoque |
| **Um tipo de usuário por vez** | E1 o balcão lança; E3 o gerente vê o total do dia |
| **Um canal por vez** | E1 pelo celular; E5 pela tela do computador do caixa |
| **Um dado por vez** | E1 cadastra nome e telefone; E4 acrescenta endereço e aniversário |
| **Manual antes de automático** | E2 marca "pago" na mão; E6 o Pix marca sozinho |

A quinta linha é a mais útil e a menos usada. Toda automação nasce de um gesto manual que
já funciona. Construir o manual primeiro entrega valor na primeira semana e mostra, no
uso, se a automação vale o que custa.

---

## Ordem: primeiro o que reduz risco, depois o que gera valor

A intuição manda começar pelo que o dono mais quer ver. A intuição está errada na
primeira metade da lista.

Risco é o que ninguém sabe se funciona: a integração nunca feita, o aparelho nunca
testado, a regra de negócio que só o dono conhece, o dado real que ninguém abriu. Valor é
o que o dono ganha quando aquilo está no ar. Os dois se cruzam assim:

| | Reduz muito risco | Reduz pouco risco |
|---|---|---|
| **Gera muito valor** | Primeiro, sem discussão | Segundo |
| **Gera pouco valor** | Terceiro, e cedo o bastante para não derrubar o plano | Por último, ou nunca |

O motivo de o risco vir antes: uma integração que não funciona na primeira semana muda a
arquitetura, e a mudança custa pouco porque ainda não tem nada em cima. A mesma descoberta
na quinta semana custa refazer quatro semanas.

Dentro da mesma célula, o critério de desempate é a dependência: o que destrava mais
entregas vem antes. E dentro disso, o que é menor. Entrega pequena feita cedo ensina mais
que entrega grande planejada.

**A primeira é sempre a bala traçante.** Nem a mais valiosa, nem a mais arriscada: a mais
fina que prova que dá para ir do banco à tela publicada. Depois dela, a matriz.

---

## Dependência externa

Boa parte das entregas de sistema de negócio pequeno espera por alguém de fora: a chave do
banco, a aprovação da loja de aplicativos, a exportação do sistema antigo, a resposta do
contador sobre a regra do imposto. Isso não é imprevisto. É previsível, e por isso entra
na lista com nome.

Como tratar:

- **Peça no primeiro dia** o que vai precisar na terceira semana. A chave da API demora o que demora, e o pedido custa dez minutos
- **Marque a entrega como "esperando <o quê> desde <data>"** em vez de deixar como "a fazer": `esperando chave do banco desde 2026-09-10`. A lista precisa dizer o que trava, quem, e há quanto tempo
- **Construa a entrega com o dado simulado** quando a espera for longa: o pagamento por Pix pode nascer com um botão "simular retorno do banco" e trocar pela chave real depois. A entrega fica quase pronta em vez de parada
- **Não deixe uma dependência externa na primeira entrega.** A bala traçante atravessa só o que está sob controle do time
- **Ponha data na espera.** "Esperando a chave desde 10/09" muda a conversa com o fornecedor. "Esperando" solto vira semana, e o `entregas.js` avisa quando a data falta

Quando a espera passa de duas semanas, a entrega desce na lista e outra sobe. Plano parado
esperando terceiro é plano que ninguém está tocando.

---

## Manter a lista viva

A lista morre no dia em que deixa de refletir o que aconteceu. Três gestos a mantêm de pé:

**Entrega feita ganha data.** "feita 2026-09-17", não "feita". A data é o que permite, dois
meses depois, comparar a faixa com o que levou de verdade, e é assim que a próxima
estimativa fica melhor. Sem data, ninguém aprende nada.

**Escopo que mudou vira entrega nova, nunca estica a existente.** O dono viu o pedido
funcionando e quer campo de observação. Isso não entra na E1 "porque é só um campo". Vira
E7, com prova de pronto, faixa e posição na ordem. Esticar a entrega em andamento é como
o plano deixa de bater com a realidade sem ninguém decidir nada: a E1 de "2 a 3 dias"
leva oito e ninguém consegue dizer por quê.

Antes de virar entrega, o pedido passa pelas quatro caixas de `templates/software/custo.md`:
problema, melhoria, alteração ou funcionalidade nova. Só a primeira entra sem conversa.

**Entrega cancelada fica na lista, marcada.** Apagar a linha apaga a decisão. Daqui a três
meses alguém pergunta "e o relatório por vendedor?", e a resposta está lá: cancelada em
outubro, porque o dono passou a ver o mesmo número no fechamento do dia.

---

## Antes de passar pro /backend

- [ ] A primeira entrega atravessa tela, regra, banco e publicação, sem depender de ninguém de fora
- [ ] Toda entrega tem prova de pronto com quem faz, o que vê e onde
- [ ] Toda faixa tem piso, teto e o motivo do teto, na coluna "Estoura se" da mesma linha
- [ ] Nenhum teto passa de uma semana do time real, nem do triplo do piso
- [ ] Toda dependência aponta para uma entrega que vem antes na lista
- [ ] Dependência externa está marcada como "esperando", com o quê e desde quando
- [ ] A ordem coloca risco antes de valor, e a dependência desempata
- [ ] A dedicação do time está escrita no topo, em dias por semana
- [ ] A soma das faixas cabe no teto de prazo do escopo, ou a lista já foi cortada por baixo
- [ ] `node scripts/entregas.js` termina em "Tudo certo."

Lista que passa nisso é lista que o `/backend` pega e constrói, uma entrega por vez, sem
voltar para perguntar o que vem primeiro.
