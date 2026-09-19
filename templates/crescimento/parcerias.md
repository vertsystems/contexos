# Parcerias — co-marketing e criadores locais

Referência do `/parcerias`, consultada também pelo `/evento` e pelo `/lancamento`
quando há terceiro envolvido. O workflow fica na skill; aqui está o que se consulta:
tipos, critério de escolha, a conta de engajamento real, o briefing de uma página,
as cláusulas mínimas e o que a lei exige quando alguém é pago pra falar de você.

---

## O que é parceria boa

Parceria boa tem três coisas ao mesmo tempo: o **mesmo público**, um **produto
diferente** e **dois lados que ganham na hora**, não "quem sabe no futuro".

| Par | Por que funciona |
|---|---|
| Padaria e academia | mesma vizinhança, mesmo horário da manhã, ninguém compete |
| Arquiteta e loja de móveis | o cliente de uma chega na outra na mesma semana |
| Pediatra e escola infantil | a mãe confia nas duas pelo mesmo motivo |

Par ruim: dois negócios com público diferente ("todo mundo compra pão") ou
dois que disputam o mesmo real (duas confeitarias, mesmo que uma faça bolo e
a outra doce).

---

## Formatos, o que cada um custa e o que mede

| Formato | O que é | Custa | Mede-se por |
|---|---|---|---|
| **Indicação mútua** | cada um recomenda o outro quando o cliente pergunta | quase nada | "quem te indicou?" na primeira conversa |
| **Desconto cruzado** | cliente de A ganha desconto em B, e vice-versa | a margem do desconto | cupom com nome do parceiro |
| **Combo** | um pacote só, vendido pelos dois (corte + barba e óleo da barbearia vizinha) | a divisão do preço | vendas do combo por canal |
| **Conteúdo cruzado** | post, live ou vídeo em que um aparece no perfil do outro | tempo de produção | seguidores e mensagens nos 7 dias seguintes |
| **Evento conjunto** | café da manhã, aula aberta, workshop nos dois espaços | espaço, comida, material | inscritos, presentes, quem virou cliente em 30 dias |
| **Sorteio** | os dois montam um prêmio e o público segue os dois | o prêmio e a burocracia | seguidores que ficam depois de 15 dias, não o pico |
| **Ponto de venda cruzado** | o produto de um fica exposto no balcão do outro | espaço e um cartão | unidades vendidas por ponto |

**Sorteio pede cuidado legal.** Distribuição gratuita de prêmio por sorteio,
vale-brinde ou concurso exige autorização federal prévia (Lei 5.768/1971). O
órgão que autoriza hoje é a Secretaria de Prêmios e Apostas do Ministério da
Fazenda [a confirmar o órgão e o rito na hora do uso]. Concurso só cultural,
sem sorte envolvida e sem exigir compra, é a exceção prevista na própria lei
[a confirmar o enquadramento com o contador ou advogado]. "Todo mundo faz
sorteio no Instagram" não é defesa. As redes também têm regra própria pra
promoção, e o texto do post precisa dizer que a plataforma não patrocina nem
tem relação com a ação.

---

## Como escolher o parceiro (pontuar antes de propor)

Cinco critérios, cada um de 0 a 2. Abaixo de 6, procurar outro.

| Critério | 0 | 1 | 2 |
|---|---|---|---|
| **Público que bate** | público diferente | parte do público em comum | o mesmo cliente, na mesma semana |
| **Não compete** | vende o que eu vendo | vende algo parecido | vende o complemento |
| **Reputação** | avaliação ruim ou desconhecida | avaliação regular | nota alta e comentário recente |
| **Capacidade de entregar** | não responde, não tem equipe | responde, mas devagar | responde em um dia e tem quem execute |
| **Ganho claro pra ele** | o ganho é só meu | ganho difuso | dá pra escrever em uma frase o que ele leva |

O quinto critério é o que decide se a proposta é respondida. Antes de mandar
mensagem, escrever a frase: "você ganha X, eu ganho Y". Se não sai, não está
pronto.

---

## Criador local: escolher pelo engajamento real, não pelo seguidor

Número de seguidores é o dado mais fácil de comprar e o menos útil. O que
importa é quanta gente reage, se essa gente é o seu público, e se ela é da sua
cidade. Pedir ao criador o print dos insights (alcance dos últimos 30 dias,
cidades e faixa etária do público): quem não manda, não fecha.

### A conta, por comando

Abrir os últimos 10 posts do feed (não stories, não reels fixados no topo),
anotar curtidas e comentários de cada um, e o número de seguidores.

```bash
# troque os números pelos do perfil analisado
node -e '
const curtidas=[412,380,455,390,402,371,440,398,415,377];
const comentarios=[18,12,25,14,20,9,31,16,22,11];
const seguidores=8400;
const n=curtidas.length;
const L=curtidas.reduce((a,b)=>a+b,0), K=comentarios.reduce((a,b)=>a+b,0);
console.log("média de curtidas por post:", Math.round(L/n));
console.log("média de comentários por post:", (K/n).toFixed(1));
console.log("engajamento real: " + ((L+K)/n/seguidores*100).toFixed(2) + "% por post");
console.log("comentários a cada 100 curtidas: " + (K/L*100).toFixed(1));
'
```

Não existe número mágico. A régua é **relativa**: medir três perfis do mesmo
nicho e do mesmo tamanho, do mesmo jeito, e comparar. Um perfil com o dobro
do engajamento dos pares, com comentários específicos ("onde fica?", "quanto
tá o combo?"), vale mais que um com o triplo de seguidores e comentário de
emoji.

### Sinais de seguidor comprado ou engajamento inflado

- Comentários genéricos em série ("lindo!", "top", só emoji), muitos de perfis sem foto
- Curtidas altas e comentários quase zero, post após post, bem abaixo dos pares medidos do mesmo jeito
- Salto de seguidores num dia só, sem post viral ou matéria que explique
- Público de outra cidade ou outro país quando o negócio é de bairro
- Engajamento igual em todo post, do bom ao ruim: gente de verdade oscila

Nenhum sinal sozinho condena; dois juntos pedem o print dos insights antes de
qualquer conversa de valor. Pra negócio de bairro, o perfil pequeno com o
público no mesmo município costuma valer mais que o grande espalhado pelo
país: quem vê o post precisa conseguir ir até a loja.

---

## Quanto pagar, e quando permutar

Nunca partir de "quanto você cobra". Partir do que a ação precisa render.

```bash
# custo por mil contas alcançadas de verdade (usar o alcance dos insights, não seguidores)
node -e '
const valor=600;                          // R$ pedidos pelo criador
const alcance=[5200,4800,6100,4400];      // alcance real dos últimos posts
const m=alcance.reduce((a,b)=>a+b,0)/alcance.length;
console.log("alcance médio:", Math.round(m));
console.log("R$ por mil contas alcançadas:", (valor/(m/1000)).toFixed(2));
'
```

Comparar esse número com o custo por mil do anúncio pago que o negócio já
conhece (`campanhas/relatorios/`, se existir). Criador que custa três vezes o
anúncio precisa entregar algo que o anúncio não entrega: confiança, prova
social, conteúdo pra reaproveitar.

**Permuta** cabe quando o produto tem valor real pro criador e o custo pra
você é o custo de produção, não o preço de tabela. Regras da permuta:

- Escrever o valor da permuta em reais no acordo, mesmo sem dinheiro trocando de mão
- Permuta também é publicidade e precisa ser identificada (ver abaixo)
- Combinar entrega e prazo do mesmo jeito que se fosse pago

Faixa de mercado por tamanho de perfil: [a confirmar na hora do uso, por
WebSearch em fonte datada ou perguntando a dois criadores da região]. Não usar
tabela de valor sem data.

---

## Briefing de uma página

Criador bom recusa briefing de 6 páginas e improvisa com briefing de 3 linhas.
Uma página resolve os dois problemas.

```markdown
# Briefing — <negócio> × <criador> — <data>

## Objetivo em uma frase
[o que precisa acontecer: 40 pessoas usando o cupom em 30 dias / agenda de outubro cheia]

## Quem vai ver
[o cliente na palavra dele, de _memoria/publico.md: dor, objeção, o que ele procura]

## A mensagem que não pode faltar
[uma só. Ex: "entrega em 40 minutos em todo o bairro X"]

## O que não dizer
[promessa que não cumprimos, comparação com concorrente, preço errado, gíria que a marca não usa]

## Entregas
| Peça | Formato | Data de publicação | Aprovação prévia? |
|---|---|---|---|
| 1 reel | até 60 s, vertical | <data> | sim, 48 h antes |
| 3 stories | com link e cupom | <data> | não |

## Cupom, link e como medir
[código do cupom com o nome do criador, link com UTM, o que a gente vai contar]

## Identificação de publicidade
[obrigatória em toda peça: "publi", "publicidade" ou "parceria paga", visível sem clicar em "mais"]

## Contato e prazo de resposta
[quem aprova, em quanto tempo, por onde]
```

Liberdade criativa fica **dentro** do briefing: o criador escolhe a forma, o
negócio fixa a mensagem e o que não dizer. Roteiro pronto mata o motivo de
contratar o criador.

---

## O que pedir de entrega (e o que costuma faltar)

- Quantidade, formato e data de cada peça, não "uns stories"
- Print dos insights de cada peça 7 dias depois (alcance, cliques no link, respostas)
- Arquivo bruto do vídeo ou foto, se o negócio quiser reaproveitar
- Tempo mínimo de permanência da peça no perfil (post que some em 24 h não é post)
- Menção ao perfil do negócio, com arroba certa, no texto e no vídeo

---

## Cláusulas mínimas do contrato com criador

Não é assessoria jurídica. É a lista do que precisa estar escrito pra ninguém
brigar depois. Valor alto, exclusividade longa ou uso de imagem em campanha
nacional pedem advogado.

1. **Partes** — nome, CPF ou CNPJ, endereço, contato dos dois lados
2. **Objeto** — o briefing anexado, com as entregas na tabela
3. **Prazo** — data de cada publicação e tempo mínimo no ar
4. **Aprovação** — se há aprovação prévia, em quantas horas o negócio responde e o que acontece no silêncio
5. **Remuneração ou permuta** — valor em reais, forma e data de pagamento; na permuta, o que é entregue e quando; nota fiscal quando houver pagamento
6. **Uso de imagem e conteúdo** — se o negócio pode repostar, por quanto tempo, em quais canais (perfil, site, anúncio pago) e se pode editar. Uso de imagem de pessoa exige autorização expressa (Código Civil, art. 20) [confirmar o alcance da cláusula com advogado quando envolver anúncio pago]
7. **Exclusividade** — se o criador se compromete a não anunciar concorrente direto, por quanto tempo e em qual categoria. Exclusividade custa mais; sem ela, dizer que não há
8. **Identificação de publicidade** — obrigação do criador de marcar toda peça como publicidade
9. **Cancelamento** — o que cada lado deve se desistir antes da publicação, e depois
10. **Dados pessoais** — o que cada um faz com os dados que receber (leads do cupom, contatos do sorteio), conforme a LGPD (Lei 13.709/2018)
11. **Menor de idade** — se o criador ou quem aparece for menor, autorização escrita do responsável, sem exceção

Contrato entre dois negócios (sem criador) usa os itens 1, 2, 3, 5, 6, 9 e 10, mais quem paga o quê na ação.

---

## Publicidade precisa ser identificada como tal

Quem é pago, ou recebe produto, pra falar de um negócio está fazendo
publicidade, e o público tem o direito de saber. Isso não é opinião do sistema:

- **CDC, art. 36** — a publicidade deve ser veiculada de forma que o consumidor a identifique fácil e imediatamente como tal. O art. 37 proíbe publicidade enganosa ou abusiva
- **Código Brasileiro de Autorregulamentação Publicitária (CONAR), art. 28** — o anúncio deve ser claramente distinguido como tal, qualquer que seja o meio
- **Guia de Publicidade por Influenciadores Digitais (CONAR, 2021)** — vale pra dinheiro, produto, permuta ou qualquer vantagem; recomenda marcação clara como "publicidade", "publi" ou "parceria paga", visível sem esforço, na peça e não só na bio

Na prática:

- A marcação vai no começo da legenda, antes do "mais", e falada ou escrita no vídeo. O recurso nativo ("parceria paga com") ajuda, mas não substitui
- Criador que se recusa a marcar não serve: a multa e a reputação recaem também sobre o negócio anunciante
- Depoimento pago que se apresenta como espontâneo é propaganda enganosa, pros dois lados

---

## Como medir a parceria

Toda ação sai com um jeito de contar combinado **antes** de começar:

| Objetivo | Como contar |
|---|---|
| Cliente novo | cupom com o nome do parceiro, ou "quem te indicou?" registrado no atendimento |
| Venda de combo | número de combos por ponto de venda, somado por comando |
| Seguidor que fica | seguidores no dia 0, no dia 7 e no dia 15 (o pico do sorteio não conta) |
| Agenda cheia | horários vendidos na semana da ação contra a média das 4 semanas anteriores |
