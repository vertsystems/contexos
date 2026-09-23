# Protótipo — a pergunta antes do código

Referência do `/prototipo`. Aqui fica o método: como a dúvida escolhe a forma, o que
confere num fluxo clicável, o que faz uma versão de tela ser de verdade diferente da
outra, como conduzir a sessão de cinco minutos e por que o código é jogado fora depois.

O workflow não se repete aqui. Isto é o conhecimento de apoio.

Fonte do método de dois ramos: a skill `prototype`, de Matt Pocock
(https://skills.sh/mattpocock/skills/prototype, conferido em 23/09/2026). A ideia central
que veio de lá: **código descartável que responde uma pergunta só**, e a escolha errada
do ramo estraga o protótipo inteiro. O resto deste arquivo é o ajuste pro negócio
pequeno brasileiro: a pessoa que vai clicar é o dono, o sócio ou o cliente, e ela abre o
arquivo no navegador do celular dela.

---

## Por que existe um degrau entre decidir e construir

O `/escopo` responde "vale a pena, e o que entra". O `/quebrar` responde "em que ordem".
Entre os dois mora um tipo de dúvida que nenhum dos dois resolve: a que só se responde
vendo alguém usar.

"O cliente entende que o pedido só é confirmado depois do pagamento?" não tem resposta
em reunião. Tem resposta quando a dona da padaria clica, para no meio e pergunta "já
pedi ou não?". Trinta segundos de silêncio valem mais que uma hora de discussão entre
duas pessoas que já sabem como o sistema funciona.

O custo de errar aqui é assimétrico. Descobrir na conversa custa uma tarde. Descobrir
depois de construído custa a semana de quem construiu, mais a semana de quem refaz, mais
a confiança de quem pagou.

---

## A pergunta escolhe o ramo

Antes de qualquer coisa, a dúvida é escrita em uma frase que termina com interrogação. Se
não dá pra escrever, não é dúvida de produto: é ansiedade, ou é decisão de escopo que
ainda não foi tomada.

| A dúvida soa assim | Ramo | O que sai |
|---|---|---|
| "O cliente entende esse fluxo de pedido?" | fluxo clicável | uma tela por estado, botões que andam |
| "Ele vai saber que precisa pagar pra reservar?" | fluxo clicável | o mesmo, com o dado visível na tela |
| "Qual dessas três telas?" | versões da tela | 3 a 5 variações trocáveis |
| "O painel abre na lista ou no resumo?" | versões da tela | o mesmo |
| "Cabe fazer isso em duas semanas?" | nenhum: é `/escopo` | |
| "As pessoas pagariam por isso?" | nenhum: é validação, em `validacao.md` | |

Ramo errado é o erro mais caro do protótipo. Fluxo respondido com telas bonitas: a pessoa
elogia o visual e a dúvida fica de pé. Escolha de tela respondida com fluxo: ela clica até
o fim e ninguém descobre qual layout ela entende.

**Teste do ramo:** se a resposta certa muda o que o sistema faz, é fluxo. Se muda só o
que a pessoa vê, é versões da tela.

---

## Ramo fluxo clicável

Três palavras, e nenhuma delas é "máquina de estados":

- **Tela** — um momento do uso, com nome que o dono reconhece ("Carrinho", "Pagamento", "Pedido confirmado")
- **Botão** — o que a pessoa pode fazer ali, e pra onde isso leva
- **O que o sistema sabe agora** — o painel embaixo, que mostra o estado inteiro depois de cada clique

O painel é o que transforma clique em conversa. Sem ele, a pessoa vê uma tela nova e
segue. Com ele, ela olha "pedido confirmado: não" e diz "ué, eu já não pedi?". Achou o
problema sozinha, e a frase dela vai literal pra conclusão.

### As quatro falhas de desenho

Todas as quatro passam por uma leitura atenta e nenhuma passa pelo `conferir` do
`scripts/prototipo.js`:

1. **Ação sem destino.** O botão existe, a tela que ele abre não. No protótipo feito à mão, o clique não faz nada e a pessoa acha que travou
2. **Tela que ninguém alcança.** Ela está desenhada e nenhum caminho leva até lá. Quase sempre é sinal de que falta um botão em algum lugar, não de que a tela é inútil
3. **Beco sem saída.** Tela sem botão nenhum que não é o fim. A pessoa para de clicar e a sessão morre ali
4. **Nenhum fim.** O fluxo não tem onde terminar, e ninguém percebe porque no papel "acaba" quando a conversa acaba

### O estado fica na memória

Nada de `localStorage`, nada de banco, nada de servidor. Recarregar a página volta ao
começo, e isso é vantagem: a segunda pessoa a clicar começa limpa. Protótipo que guarda
estado ganha um bug de estado velho, e aí passa-se a tarde depurando o protótipo em vez
de responder a pergunta.

O arquivo é **um HTML só**, sem CSS de fora, sem imagem de fora, sem npm. Ele precisa
abrir com dois cliques na máquina de alguém que não programa, e isso também é medido: o
`conferir` reprova `<img src="https://...">`, `@import` e folha de estilo de fora, porque
a foto que não carrega no avião ou no metrô vira um buraco branco no meio da tela e a
pessoa acha que o sistema está quebrado.

---

## Ramo versões da tela

### Por que de 3 a 5

Com duas, a conversa vira preferência pessoal: "gostei mais da segunda". Com três, aparece
o critério, porque a pessoa precisa explicar por que descartou uma. Acima de cinco,
ninguém compara: ela olha as duas primeiras e chuta.

### Diferente de verdade

Cada versão carrega uma **aposta** escrita em uma linha: no que ela é diferente e o que
ela está tentando ganhar. Se as apostas de duas versões podem ser trocadas de lugar sem
mudar nada, são a mesma versão com a cor trocada.

| Não é variação | É variação |
|---|---|
| A mesma lista com botão azul e depois verde | a lista completa contra um horário só, com "ver outros" embaixo |
| Título em cima e depois em baixo | o preço antes da ficha do produto contra o preço depois |
| Card com sombra e card sem sombra | grade de botões contra campo de busca |

A variação mexe em **o que aparece primeiro, o que fica escondido e quantas escolhas a
pessoa faz**. Isso é decisão de produto, e é por isso que a resposta vale registro.

### O pente de contraste

Variação escura com texto cinza morre no celular no sol. A régua é do WCAG 2.2, critério
1.4.3: **4,5:1 pra texto normal** e 3:1 pra texto grande
(https://www.w3.org/TR/WCAG22/#contrast-minimum, conferido em 23/09/2026). Cada versão
declara suas cores no spec e o script mede antes de gerar o HTML. Par que reprova não
entrega: conserta.

A regra do `/design-system` vale aqui do mesmo jeito: nunca entregar par de cor que
reprova, nem em protótipo. Variação que a pessoa escolheu porque não conseguiu ler a
outra não decidiu nada.

O tamanho de alvo segue o que está em `templates/design/acessibilidade.md`, e o alvo
grande importa mais aqui do que no produto final: a pessoa vai clicar no celular dela,
com pressa, na frente de outra pessoa.

---

## As três perguntas

Três, sempre. Elas ficam na barra de baixo do HTML, visíveis enquanto a pessoa clica,
porque quem conduz esquece e quem clica lê.

O que separa pergunta boa de pergunta inútil:

| Ruim | Por quê | Boa |
|---|---|---|
| "Ficou fácil de entender, né?" | já traz a resposta | "O que você faria agora nessa tela?" |
| "Você gostou?" | mede simpatia com quem perguntou | "O que aqui você não faria de jeito nenhum?" |
| "Tá claro que precisa pagar?" | ensina o que era pra descobrir | "Nesse ponto, o pedido já está feito?" |
| "Qual a melhor?" | pede opinião de design | "Qual dessas você mandaria pro seu cliente?" |

A pergunta boa pede **ação ou expectativa**, não avaliação. E vem sempre depois do
silêncio: quem conduz não explica a tela antes. Explicação é a resposta entregue de
graça, e a sessão perde o valor.

Uma quarta pergunta aparece sozinha quando a pessoa hesita: "o que você estava esperando
que acontecesse?". Anotar a resposta literal, com as palavras dela. Essa frase costuma
ser o nome certo do botão.

---

## A sessão

Cinco a dez minutos. Mais que isso, a pessoa entra no modo de ajudar e começa a elogiar.

- **Um clicador por vez.** Duas pessoas juntas: uma clica e a outra responde por ela
- **Silêncio depois de mandar o link.** A primeira coisa que ela faz sem instrução é o dado mais valioso da sessão
- **Anotar onde ela para**, não só o que ela diz. Hesitação de três segundos vale mais que "achei bom"
- **Anotar onde ela clica em algo que não é botão.** É onde ela esperava uma ação que o desenho não tem
- **Nunca consertar ao vivo.** Consertar no meio apaga o problema e a memória dele

---

## O que isto não é

- **Não é MVP.** MVP é produto pequeno que já entrega valor e fica de pé. Protótipo é descartável, não tem banco e não atende cliente de verdade
- **Não é teste de mercado.** "Pagariam por isso?" é a página com preço de `templates/software/validacao.md`
- **Não é design final.** O visual do protótipo é o suficiente pra decidir; `/interface` e `/design-system` fazem o padrão que vai pro produto
- **Não é teste A/B.** Teste A/B mede número com tráfego real e página no ar. Protótipo colhe frase de três pessoas, e a amostra não prova nada. O comparável é `/teste-ab`, e ele exige amostra calculada
- **Não é demonstração de venda.** Protótipo que vira apresentação de proposta cria expectativa de algo que não existe

---

## Quando não vale prototipar

- A dúvida se responde olhando o que o negócio já faz hoje no papel ou no WhatsApp
- A resposta não muda nada do que vai ser construído. Sem consequência, é curiosidade
- O sistema já está no ar e tem uso medido: aí a resposta está no dado, e o caminho é `/evoluir`
- Ninguém vai clicar. Protótipo sem pessoa é maquete, e maquete se aprova sozinho

---

## O descarte, e por que ele é uma regra

Protótipo tem duas saídas honestas, e as duas terminam no mesmo lugar. Numa, a pessoa
entendeu, a decisão fica escrita e o código é apagado. Na outra, ela não entendeu, a
decisão passa a ser "não construir assim", fica escrita do mesmo jeito, e o código é
apagado igual. Existe uma terceira saída, virar base do produto, e é ela que estraga
tudo: o código foi escrito pra responder rápido, sem banco, sem erro tratado, sem teste,
e o que se economiza em um dia se paga em três meses de conserto.

A conclusão é o que sobrevive. Ela guarda:

- a pergunta e o ramo escolhido
- o que foi posto na frente da pessoa, e a aposta de cada versão ou tela
- o que ela fez, incluindo onde parou
- as três perguntas com a resposta **na palavra dela**, entre aspas
- a decisão, e **o que deixou de ser construído por causa dela**

A última linha é a que dá valor ao arquivo. Protótipo que não tirou nada do escopo
provavelmente só confirmou o que o dono já queria fazer, e isso é bom de saber também:
está escrito, com data, e a próxima conversa começa daí.

---

## Léxico: como falar disso com o dono

| Não diga | Diga |
|---|---|
| máquina de estados | fluxo clicável |
| variantes de UI | versões da tela |
| protótipo de alta fidelidade | tela desenhada pra clicar |
| happy path | o caminho normal |
| dead end | tela sem saída |
| descartável | a gente joga fora depois, de propósito |
| validar a hipótese | ver se a pessoa entende |
| estado do sistema | o que o sistema sabe agora |

A tradução não é preciosismo. "Máquina de estados" faz o dono achar que precisa entender
o termo antes de opinar, e ele para de opinar. "Fluxo clicável" ele já sabe o que é
porque acabou de clicar.
