# Experimentos — o que dá pra testar num negócio pequeno

Referência do `/teste-ab`. Consultada também pelo `/conversao` quando a pergunta é
"testo ou mudo direto?", e pelo `/relatorio-ads` quando dois criativos disputam.

Teste A/B é uma pergunta feita ao público com dinheiro real: metade vê uma versão, metade
vê outra, e o comportamento responde. A parte difícil não é montar as duas versões. É
juntar visita suficiente pra que a diferença entre elas seja resultado e não sorte. A
maior parte dos testes de negócio pequeno morre aí, e o dono publica a versão "vencedora"
de um sorteio.

---

## O que vale testar (e o que é só conserto)

Nem toda mudança precisa de teste. Contraste ilegível, botão escondido, link quebrado,
formulário com sete campos: isso se corrige e pronto. Teste é pra quando as duas versões
são defensáveis e ninguém sabe qual vence.

| Onde | O que costuma dar efeito grande | O que quase nunca dá |
|---|---|---|
| **Página** | Promessa da headline, oferta exibida (preço, garantia, bônus), o que o formulário pede, ordem das seções | Cor do botão, fonte, foto de banco por outra foto de banco |
| **Anúncio** | Ângulo do criativo (dor × ganho, prova × promessa), formato (vídeo × imagem), primeira frase | Emoji, pontuação, trocar "você" por "tu" |
| **Preço** | Âncora (mostrar o plano caro primeiro), parcelamento visível, três faixas × duas | Centavos (R$ 97 × R$ 99) sem volume grande |
| **E-mail e WhatsApp** | Assunto, horário de envio, uma chamada × duas, texto curto × longo | Assinatura, cor do botão |
| **Atendimento** | Script de abertura, pedir o WhatsApp antes ou depois do preço, follow-up em 2 ou 5 dias | Saudação |

Regra que decide: **mudança grande dá efeito grande, e efeito grande pede amostra
pequena.** Quem tem pouco tráfego só consegue concluir teste de mudança grande. Cor de
botão é luxo de site com 50 mil visitas por mês.

---

## Uma variável, uma hipótese

A hipótese cabe numa frase e tem três partes:

> Se **[mudar X]**, então **[Y sobe/desce]**, porque **[Z]**.

"Se trocar a headline de 'Consultoria financeira' por 'Saiba quanto sobra no fim do mês',
o clique no WhatsApp sobe, porque o público fala em 'sobrar', não em 'consultoria'
(`_memoria/publico.md`)." O **porque** é a parte que ensina algo mesmo quando o teste perde.

Uma variável por teste. Se a versão B tem headline nova **e** foto nova **e** botão novo,
e ganha, ninguém sabe o que fez ganhar. Se perde, ninguém sabe o que fez perder. Teste
com três mudanças produz opinião, não aprendizado.

Exceção honesta: **redesenho inteiro** contra a página antiga é um teste válido, desde
que a pergunta seja "a página nova é melhor?" e não "qual elemento ajudou?".

---

## Métrica primária e métrica de guarda

- **Primária** — a única que decide. Precisa ser um evento contado (clique no WhatsApp,
  formulário enviado, compra), não uma impressão ("ficou mais bonito")
- **Guarda** — o que não pode piorar enquanto a primária sobe. Headline agressiva
  aumenta clique e derruba a qualidade do lead; preço menor aumenta venda e derruba a
  margem; assunto sensacionalista aumenta abertura e aumenta descadastro

Sem guarda, o teste "ganha" e o negócio perde. Com guarda, o veredito tem duas condições:
primária subiu **e** guarda não caiu.

---

## Amostra mínima por versão

Calculada com `node scripts/teste-ab.js tabela` (confiança 95%, poder 80%, duas versões,
teste bicaudal de duas proporções, a fórmula clássica; calculadoras de mercado usam
variantes dela e chegam perto). Dobre o número pro total. Três versões pedem mais por
versão, porque são duas comparações contra o controle: `--variantes 3` no `amostra`.

| Taxa atual | +10% | +20% | +30% | +50% |
|---|---|---|---|---|
| 0,5% | 327.922 | 85.862 | 39.885 | 15.599 |
| 1% | 163.095 | 42.693 | 19.827 | 7.750 |
| 2% | 80.682 | 21.109 | 9.798 | 3.826 |
| 3% | 53.211 | 13.914 | 6.455 | 2.518 |
| 5% | 31.234 | 8.158 | 3.780 | 1.471 |
| 10% | 14.751 | 3.841 | 1.774 | 686 |
| 20% | 6.510 | 1.683 | 772 | 294 |

Como ler: página com 2% de conversão, e a intenção de enxergar uma melhora de 20% (de 2%
pra 2,4%), precisa de **21.109 visitas em cada versão**. Com 3.000 visitas por mês, isso
leva 14 meses. Com 50.000, leva 26 dias.

A tabela é onde a conversa fica honesta. As duas linhas de cima são de e-commerce grande
e anúncio com muito volume. Negócio local com página de 800 visitas por mês vive nas
duas últimas colunas, e só se a taxa base for alta. Página curta cujo único botão é o
WhatsApp, recebendo quem já clicou num anúncio, costuma ter taxa bem maior que loja
virtual; a taxa que vale é a dele, lida no painel, não uma média de setor.

**Duração mínima: duas semanas inteiras**, mesmo que a amostra feche antes. Segunda-feira
converte diferente de sábado, e começo do mês converte diferente do fim. Uma semana
inteira captura o ciclo; duas confirmam que não foi uma semana atípica.

---

## Menos de mil visitas por mês: o que fazer em vez de A/B

Com menos de ~1.000 visitas por mês, a maioria dos testes não fecha em prazo útil. Isso
não é falta de rigor: é a conta. As saídas, na mesma ordem em que o `scripts/teste-ab.js`
as lista quando o veredito é "não fecha":

1. **Mudança maior.** Trocar "texto do botão" por "oferta inteira". Efeito grande pede
   amostra pequena, e é o único tipo de teste que tráfego pequeno conclui. Rodar o
   `amostra` de novo com o efeito maior e ver se agora cabe
2. **Teste sequencial por período.** Duas semanas com A, duas com B, mesma origem de
   tráfego, mesma época (sem feriado ou promoção no meio). Compara os dois períodos com o
   `ler`, cada período como uma versão. Mais fraco que o A/B simultâneo, porque o tempo
   vira variável, mas é infinitamente mais forte que "achei que melhorou"
3. **Entrevista.** Cinco conversas de vinte minutos com quem comprou e cinco com quem
   pediu orçamento e sumiu (`/publico`) dizem por que a página não converte. O A/B diz
   só que não converte
4. **Antes e depois.** Aplica a correção que o `/conversao` apontou, anota a data, e compara
   30 dias antes com 30 dias depois. Serve pra mudança grande e óbvia
5. **Teste no anúncio, não na página.** Anúncio tem impressão de sobra; a taxa de clique
   fecha teste com muito menos volume do que conversão na página. Testar o ângulo no
   criativo primeiro, e levar o vencedor pra headline

---

## Como dividir o tráfego

| Jeito | Quando serve | Cuidado |
|---|---|---|
| **Ferramenta de teste** (a da plataforma de página, do anúncio ou do e-mail) | Sempre que existir. Divide por visitante, ao acaso, e conta sozinha | Conferir que a divisão ficou perto de 50/50; desequilíbrio grande é bug |
| **Duas páginas, dois links** (a mesma campanha manda metade pra `/a` e metade pra `/b`) | Página feita à mão, sem ferramenta | Metade de verdade: dois anúncios iguais com orçamento igual, não "um link no post e outro no story" |
| **Dia alternado** (A na segunda, B na terça, A na quarta...) | Loja, WhatsApp, atendimento, quando não dá pra dividir a mesma pessoa | Precisa de semanas inteiras pra cada versão pegar todos os dias da semana |
| **Por lista** (metade dos contatos recebe A, metade B) | E-mail e WhatsApp em massa | Sortear a divisão, não cortar por ordem alfabética ou por data de cadastro |

O que invalida a divisão: mandar tráfego de origem diferente pra cada versão (Instagram
pra A, Google pra B), mudar o anúncio no meio, rodar promoção só numa das semanas.

---

## Os erros que mais matam teste

- **Parar cedo.** No terceiro dia B está 40% acima. É ruído. Com poucas conversões, a
  diferença balança pra qualquer lado; ela se acalma perto da amostra calculada, e é aí
  que se lê. Quem para quando "já dá pra ver" pega o pico do ruído e chama de resultado
- **Olhar todo dia.** Cada olhada é uma tentação de parar. Marcar a data de fim no
  calendário e abrir o painel nela. O `/revisao-semanal` pode registrar "teste rodando,
  ler em <data>" e nada além
- **Testar duas coisas.** Já dito acima, e ainda assim é o erro mais comum
- **Mudar a versão no meio.** "Ajustei só o texto do botão da B na quarta". Agora são
  três versões e nenhuma tem amostra
- **Tráfego diferente em cada versão.** Ver a tabela de divisão
- **Declarar vencedor sem guarda.** Clique subiu, lead piorou, ninguém olhou
- **Testar o que não importa.** Cor de botão com 900 visitas por mês é um teste que não
  fecha nunca, sobre algo que não mudaria nada se fechasse
- **Não registrar.** Sem folha de registro, o mesmo teste é refeito em seis meses, com o
  mesmo resultado inconclusivo

---

## Como ler o resultado

`node scripts/teste-ab.js ler --a <visitas>/<conversões> --b <visitas>/<conversões>` faz
a conta e dá um de três vereditos:

| Veredito | O que significa | O que fazer |
|---|---|---|
| **Ganhou** | B é melhor que A e a diferença não cabe no ruído (p < 0,05), com a guarda intacta | Publicar B. Registrar o aprendizado na folha e em `_memoria/publico.md` se ensinou algo sobre o público. Escolher o próximo teste |
| **Ganhou a primária, caiu a guarda** | Clique subiu, mas o lead piorou ou a margem caiu de forma significativa | B não vai pro ar como está. Registrar o que subiu e o que caiu; o próximo teste é uma B que corrige a guarda |
| **Perdeu** | B é pior que A, e não é acaso | Manter A. Registrar **o que a hipótese errou**: é o aprendizado mais valioso, porque contradiz uma crença do dono |
| **Inconclusivo** | A diferença cabe no ruído | Se bateu a amostra planejada: manter A (é grátis), encerrar, e testar mudança maior. Se não bateu: continuar até a data, sem olhar |

Um lift de "+35%" com p = 0,15 não é uma vitória tímida. É a ausência de resultado. O
intervalo de confiança da diferença diz o tamanho da dúvida: se ele cruza zero, B pode
ser tanto melhor quanto pior que A.

**Ganhou pouco?** Um lift de 8% significativo em página que vende é dinheiro todo mês, e
compõe com o próximo teste. Não desprezar vitória pequena com amostra grande. Desprezar
vitória grande com amostra pequena.

---

## Folha de registro

Cada experimento tem uma folha (`experimentos/<slug>-<AAAA-MM-DD>.md`), e ela é o que
transforma um teste em conhecimento. Campos que não podem faltar: hipótese com o porquê,
variável única, métrica primária e de guarda, amostra e data de fim calculadas antes de
começar, como foi dividido, o que aconteceu de fora durante o teste (feriado, promoção,
matéria na imprensa), o resultado por comando, o veredito e a decisão.

O campo "o que aconteceu de fora" é o que salva a leitura seis meses depois. "B ganhou"
sem "a semana da B coincidiu com o Dia das Mães" é um aprendizado falso guardado como
verdadeiro.
