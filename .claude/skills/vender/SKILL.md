---
name: vender
description: >
  Prepara e conduz a conversa de venda: roteiro de perguntas que fazem o cliente perceber o tamanho
  do problema, tratamento de objeção e fechamento com próximo passo. Serve pra reunião, ligação,
  WhatsApp e balcão. Use quando o usuário disser "conversa de venda", "reunião com cliente",
  "como abordar", "o cliente enrola", "me pedem orçamento e desaparecem", "tratar objeção",
  "não sei fechar", "follow-up", ou /vender.
---

# /vender — A conversa que fecha

O erro que quase todo negócio pequeno comete: apresentar a solução antes do cliente admitir o tamanho do problema. Quem fala primeiro do próprio serviço vira orçamento comparado por preço.

> **Convenção de pastas:** caminhos na convenção **por tipo**. Se o workspace usa **por cliente**, prefixar com `clientes/<Nome>/`.

## Dependências

- **Oferta:** `_memoria/oferta.md` (`/oferta`) — não se vende o que não está desenhado
- **Público e objeções:** `_memoria/publico.md` (`/publico`)
- **Preço e faixas:** `_memoria/oferta.md` ou `oferta/preco-*.md` (`/preco`)
- **Tom:** `_memoria/preferencias.md`
- **Prova:** `biblioteca.md` — case e depoimento autorizados
- **Saída:** `vendas/roteiro-<contexto>-<AAAA-MM-DD>.md`; objeções novas voltam pra `_memoria/publico.md`
- **Referências de copy:**
  - `templates/copy/psicologia.md` — atalhos de decisão e o limite ético de cada um

---

## As quatro fases de toda conversa de venda

1. **Abertura** — por que estamos conversando (curto; ninguém fecha na abertura)
2. **Investigação** — onde a venda é ganha ou perdida. É aqui que mora 80% do resultado
3. **Demonstração** — mostrar que resolve, ligado ao que ele **disse**
4. **Compromisso** — combinar o próximo passo concreto

Erro comum: pular direto pra 3. Quando isso acontece, a conversa termina em "vou pensar": que não é objeção, é falta de investigação.

---

## Investigação: as quatro perguntas, na ordem

### 1. Situação — entender o contexto (poucas, e só o necessário)

"Como funciona hoje?", "Quantas pessoas mexem nisso?", "Desde quando é assim?"

Servem pra você entender o terreno. **Fazer poucas**: cliente cansa de responder o que você poderia ter pesquisado antes.

### 2. Problema — trazer a dificuldade à tona

"O que mais te incomoda nisso hoje?", "Onde costuma dar errado?", "O que te fez procurar agora?"

Aqui aparece a dificuldade. Mas atenção: dificuldade admitida **não é** intenção de compra. Ninguém troca de fornecedor por um incômodo pequeno.

### 3. Implicação — mostrar o tamanho do problema *(a mais poderosa e a menos usada)*

"E quando isso acontece, o que mais é afetado?", "Isso já te custou quanto?", "Se continuar assim os próximos seis meses, o que acontece?", "Além de você, quem sente esse problema aí dentro?"

**Essa é a pergunta que transforma "é chato" em "preciso resolver".** É a mais difícil de fazer na hora: precisa ser preparada antes. Numa conversa comum, aparece uma vez a cada vinte perguntas; nas conversas que fecham, muito mais.

Preparar de 3 a 5 perguntas de implicação **antes** da reunião, ligadas às consequências reais do problema desse cliente.

### 4. Ganho — fazer ele dizer o valor de resolver

"Se isso estivesse resolvido, o que mudaria pra você?", "Por que isso importa agora?", "Resolver isso ajudaria em mais alguma coisa?"

O efeito: em vez de **você** listar benefícios, **ele** fala. E o que ele diz convence mais do que qualquer argumento seu.

**Regra crítica:** nunca fazer essa pergunta sobre algo que você **não** entrega. Você amplia um desejo que o concorrente atende.

---

## O sinal que separa "gostei" de "quero"

| O cliente diz | Significa |
|---|---|
| "Isso é chato mesmo", "dá trabalho" | dificuldade reconhecida — **ainda não é venda** |
| "Eu preciso resolver isso", "quero uma forma de..." | necessidade declarada — **agora é venda** |

Enquanto ele não declarar a necessidade, continuar na investigação. Apresentar proposta antes disso é o que gera comparação por preço.

---

## Objeção

Objeção quase sempre é sintoma de investigação incompleta, não de argumento faltando. Antes de responder, entender de qual tipo é:

| Objeção | O que geralmente é | Como tratar |
|---|---|---|
| "Tá caro" | valor não foi construído | voltar pra implicação: quanto o problema custa hoje? |
| "Vou pensar" | falta clareza do próximo passo, ou não é quem decide | perguntar o que exatamente ele vai avaliar, e com quem |
| "Preciso falar com meu sócio" | quem decide não está na conversa | oferecer participar da conversa com os dois |
| "Já tenho fornecedor" | não há dor suficiente pra trocar | investigar o que falta no atual, sem falar mal dele |
| "Agora não é o momento" | prioridade, não dinheiro | perguntar o que precisaria acontecer pra ser prioridade |
| "Manda por WhatsApp que eu vejo" | saída educada | combinar data pra retomar, no mesmo momento |

**Nunca:** discutir, insistir três vezes, dar desconto pra encerrar a objeção, falar mal do concorrente.

---

## Fechamento

Fechamento não é técnica de pressão. É combinar o **próximo passo concreto**:

- Bom: "Te mando a proposta hoje até as 18h e a gente conversa quinta às 10?" — ação com data
- Ruim: "Qualquer coisa me avisa" — não é fechamento, é desistência educada

Fim de conversa se classifica em quatro:

| Desfecho | O que é |
|---|---|
| **Venda** | fechou |
| **Avanço** | ele se compromete com algo concreto (data, reunião com o decisor, dado, visita) |
| **Continuação** | conversa "boa" que terminou sem compromisso — a armadilha mais comum |
| **Não** | recusa clara, que é melhor que continuação |

Contar continuação como sucesso é o que enche pipeline de fantasma. Um "não" limpo libera tempo.

---

## Workflow

### Passo 1 — Contexto da conversa

1. "Com quem você vai falar, e o que essa pessoa faz?"
2. "É primeira conversa, retorno, ou fechamento?"
3. "Onde vai ser? (reunião, ligação, WhatsApp, balcão)"
4. "O que você já sabe do problema dele?"

### Passo 2 — Montar o roteiro

Gerar, com base em `_memoria/publico.md` e na oferta:

- 2-3 perguntas de situação (só as que você não consegue pesquisar antes)
- 3-4 de problema
- **3-5 de implicação, escritas na íntegra** — são as que precisam estar prontas
- 2-3 de ganho
- Prova a usar (case ou depoimento real da `biblioteca.md`, do segmento mais parecido)
- As 3 objeções mais prováveis, com resposta preparada
- Próximo passo a propor, com data

### Passo 3 — Adaptar ao canal

**WhatsApp:** uma pergunta por mensagem, nunca bloco de texto. Investigação vira conversa de vários dias, e isso é normal.
**Ligação:** abertura de 30 segundos, pedir permissão pra fazer perguntas.
**Balcão / presencial:** investigação curta, 2-3 perguntas no máximo, decisão na hora.
**Reunião marcada:** roteiro completo, e mandar antes o que ele precisa trazer.

### Passo 4 — Depois da conversa

Perguntar como foi e registrar:
- Objeção nova → `_memoria/publico.md`
- Desfecho e próximo passo → `tarefas.md` (com data de follow-up)
- O que funcionou → `biblioteca.md`, se for frase ou argumento reaproveitável

Follow-up sem novidade é cobrança. Todo retorno leva algo: um dado, um case parecido, uma resposta à dúvida dele.

---

## Regras

- **Investigação antes de apresentação.** Se ele não declarou a necessidade, não apresentar proposta
- **Preparar as perguntas de implicação por escrito.** Elas não saem improvisadas
- Nunca perguntar sobre ganho que a oferta não entrega
- Nunca prometer prazo, preço ou escopo que não está na oferta desenhada
- Nunca falar mal de concorrente. Investigar o que falta, sem atacar
- Objeção repetida três vezes é "não" — respeitar e liberar o tempo
- Continuação não é avanço. Registrar como o que é
- Nada de técnica de pressão, escassez falsa ou "última chance". O Contex OS não vende assim
- Se o negócio for regulado (saúde, jurídico, financeiro), conferir o que o conselho de classe permite prometer numa conversa comercial
