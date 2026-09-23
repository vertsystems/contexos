---
name: preco
description: >
  Ajuda a definir ou revisar preço: o que cobrar, como empacotar em faixas, qual métrica de cobrança,
  como subir preço sem perder cliente e como responder "tá caro". Use quando o usuário disser
  "quanto cobrar", "meu preço tá errado", "tá caro", "quero aumentar o preço", "como cobrar por isso",
  "orçamento", "tabela de preços", "pacotes", "cobrar por hora ou por projeto", ou /preco.
---

# /preco — Quanto cobrar

A pergunta que mais paralisa dono de negócio pequeno. E a resposta quase nunca é "olhe o concorrente e cobre um pouco menos": esse caminho é o que mantém o negócio apertado.

> **Convenção de pastas:** caminhos na convenção **por tipo**. Se o workspace usa **por cliente** e o estudo é de um cliente, prefixar com `clientes/<Nome>/`.

## Dependências

- **Contexto:** `_memoria/empresa.md` (o que entrega, região, porte)
- **Oferta:** `_memoria/oferta.md` se existir (`/oferta`) — preço é a última parte da oferta, não a primeira
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`)
- **Saída:** `oferta/preco-<AAAA-MM-DD>.md` + atualização do campo de preço em `_memoria/oferta.md`
- **Referências de copy:**
  - `templates/copy/psicologia.md` — atalhos de decisão e o limite ético de cada um

---

## Antes de qualquer número

Cinco perguntas. Sem elas, qualquer preço é chute:

1. "O que você cobra hoje, e como chegou nesse valor?"
2. "Quanto custa pra você entregar? (material, hora sua ou da equipe, deslocamento, imposto)"
3. "Quanto o cliente **ganha ou deixa de perder** com o seu trabalho? Em reais, se der pra estimar."
4. "Quantos clientes você consegue atender por mês no máximo?"
5. "Você perde venda por preço, ou perde por não conseguir dar conta da demanda?"

A resposta 5 é a que mais orienta: **quem tem fila não tem problema de preço, tem preço baixo.**

---

## Os três caminhos pra chegar no preço

| Caminho | Como funciona | Quando serve | Problema |
|---|---|---|---|
| **Custo + margem** | soma o custo, adiciona a margem | piso mínimo, nunca o preço final | ignora o valor que o cliente recebe |
| **Comparação** | olha o que o mercado cobra | referência de faixa | te ancora no preço do pior concorrente |
| **Valor** | parte do que o cliente ganha | é onde está o dinheiro | exige entender o cliente |

Use os três, nessa ordem: o custo dá o **piso**, a comparação dá a **faixa**, o valor dá o **preço**.

**Conta do piso** (fazer sempre, é o que evita trabalhar de graça):
```
custo direto + (horas × quanto sua hora precisa valer) + rateio de estrutura + imposto
= piso absoluto. Abaixo disso, cada venda te empobrece.
```

Muito negócio pequeno descobre aqui que está cobrando abaixo do piso em alguns serviços. Quando isso aparece, dizer com clareza: é a informação mais valiosa da conversa.

---

## Métrica de cobrança

**Por que você cobra** importa mais que quanto. A métrica certa cresce junto com o valor entregue e é fácil de explicar:

| Métrica | Serve pra | Exemplo |
|---|---|---|
| Por projeto (fechado) | escopo definido | site, identidade visual, laudo |
| Por hora | escopo indefinido | consultoria pontual, manutenção |
| Por mês (recorrente) | trabalho contínuo | social media, contabilidade, manutenção |
| Por volume | consumo variável | quilo, litro, peça, metro |
| Por resultado | quando é medível e você controla | comissão sobre venda |
| Por pessoa atendida | serviço por cabeça | treinamento, buffet, evento |

**Regra:** cobrar por hora pune sua eficiência, quanto melhor você fica, menos você ganha. Se você é bom e rápido, migre pra projeto ou mensalidade.

**Sinal de métrica errada:** você trabalha mais e ganha igual; ou cliente pequeno dá o mesmo trabalho que o grande e paga o mesmo.

---

## Empacotar em faixas

Três faixas funcionam melhor que uma. Não porque as pessoas escolhem a do meio por acaso, mas porque **duas ou mais opções mudam a pergunta** de "compro ou não" para "qual eu levo".

```
Simples        →  resolve o essencial, pra quem tem pouco orçamento
Recomendado    →  o que a maioria deve levar (destacar visualmente)
Completo       →  pra quem quer tudo resolvido, sem se envolver
```

Regras que fazem a diferença:
- **Diferenciar por escopo, não por qualidade.** Nunca "atendimento melhor" na faixa caro — soa a punição na barata
- A faixa recomendada é a que você **quer** vender: montar as outras duas em volta dela
- Faixa mais caro serve também de **âncora** — ela faz a recomendada parecer razoável mesmo que ninguém a compre
- Máximo 3 faixas para negócio pequeno. Quatro ou mais paralisa

---

## Pesquisa de preço com o cliente (quando dá)

Quatro perguntas simples revelam a faixa aceitável. Aplicar com 5-10 clientes ou prospects:

1. Em que valor isso ficaria **caro demais** e você nem consideraria?
2. Em que valor ficaria **barato demais** e você desconfiaria da qualidade?
3. Em que valor ficaria **caro, mas você ainda consideraria**?
4. Em que valor pareceria **uma boa oportunidade**?

A zona entre as respostas 3 e 4 é onde o preço vive. Onde as respostas 1 e 2 se cruzam está o limite.

Só usar com cliente real ou prospect qualificado: perguntar preço pra quem nunca compraria devolve número inútil.

---

## Subir preço

Quase todo negócio pequeno está com preço defasado. Como subir sem quebrar a base:

1. **Novo cliente primeiro.** Preço novo entra na tabela hoje, para quem chega agora
2. **Base atual com aviso e prazo.** 30 a 60 dias, avisado por mensagem pessoal, não comunicado frio
3. **Motivo honesto:** custo subiu, escopo cresceu, ou "estava abaixo do mercado". Nunca "reajuste anual" quando não é
4. **Algo a mais junto do aumento**, quando possível — mesmo pequeno, muda a conversa de "vou pagar mais" pra "vou receber mais"
5. **Aceitar perder alguns.** Perder 10% da base com aumento de 25% ainda é mais faturamento com menos trabalho — fazer essa conta na frente dele

O aviso em si sai do `/comunicado`: ele lê o motivo, o percentual, o valor antigo, o novo e a
data do último aumento deste estudo, calcula o prazo por comando e entrega as três versões, a
FAQ e o calendário de disparo. Aqui se decide o número; lá se comunica.

**Nunca** subir preço sem avisar, e nunca subir escondido em nota fiscal.

---

## "Tá caro"

Traduzir antes de reagir. "Tá caro" quase nunca é sobre preço:

| O que ele disse | O que costuma significar | O que fazer |
|---|---|---|
| "Tá caro" logo no primeiro contato | Não entendeu o valor ainda | Voltar pro problema e pro resultado, não dar desconto |
| "Tá caro" depois de entender tudo | Não é o cliente certo, ou falta opção | Oferecer a faixa simples, não descontar a recomendada |
| "Fulano faz por metade" | Está comparando coisas diferentes | Mostrar o que está incluído no seu e não no dele |
| "Não tenho esse valor agora" | Fluxo de caixa, não preço | Parcelamento ou escopo reduzido |
| Silêncio depois do orçamento | Falta próximo passo claro | Follow-up com data, não com desconto |

**Desconto é a última carta e nunca sem contrapartida**: reduzir escopo, pagamento à vista, prazo maior, indicação. Desconto solto ensina o cliente a pedir sempre.

---

## Entrega

Escrever `oferta/preco-<AAAA-MM-DD>.md` com: piso calculado, faixa de mercado pesquisada, preço recomendado com a lógica, as 3 faixas, métrica de cobrança escolhida e o plano de aumento se houver. Atualizar `_memoria/oferta.md`.

```
Piso (abaixo disso você perde dinheiro): R$ X
Faixa praticada na região: R$ Y a R$ Z
Recomendado: R$ W — porque [lógica ligada ao valor entregue]

Quer que eu monte a tabela de preços pra mostrar ao cliente? (/landing ou /proposta)
```

---

## Regras

- **Nunca inventar preço de mercado.** Se não pesquisou, dizer que é estimativa e explicar a base. Pesquisar de verdade com WebSearch quando possível
- Calcular o piso **sempre**. É o número que protege o negócio, e quase ninguém tem
- Não recomendar preço sem entender o valor entregue — sem isso, só sobra custo e comparação
- Cobrar por hora só quando o escopo é realmente indefinido
- Aumento de preço: sempre com aviso, prazo e motivo honesto
- Desconto nunca sem contrapartida
- Não opinar sobre viabilidade financeira do negócio dele além do preço (não é contabilidade nem consultoria fiscal). Se aparecer questão tributária, indicar que fale com o contador
