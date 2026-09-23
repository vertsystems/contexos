# Ensaio de conversa — referência de método

Referência do `/ensaiar`. Vale também pra qualquer skill que precise simular o outro lado
antes da conversa acontecer: o `/vender` prepara o roteiro, o `/cobranca` prepara a régua,
e é aqui que está o método de fazer esse roteiro apanhar antes do cliente real apanhar dele.

Ensaio não é revisão de roteiro em voz alta. Roteiro lido de cabeça sempre funciona, porque
quem lê é quem escreveu, e nenhuma pergunta vem de volta torta. O que revela o furo é o
outro lado resistindo do jeito que ele resiste de verdade: desviando, pedindo desconto na
terceira linha, dizendo "manda por WhatsApp que eu vejo".

---

## 1. Por que só venda e cobrança

O sistema ensaia dois cenários, e a razão é material: só esses dois têm memória pra ancorar.

| Cenário | De onde vem o outro lado |
|---|---|
| **Venda** | `_memoria/publico.md` (a dor na palavra dele, as objeções) + `vendas/roteiro-*.md` |
| **Cobrança** | o contrato em `contratos/`, a régua do `/cobranca` e o histórico do devedor |

Conversa de demissão, negociação com fornecedor e briga de sócio ficaram fora de propósito.
Sem arquivo que diga como aquela pessoa fala, o ensaio vira improviso genérico, e o relatório
vira elogio. Se o usuário pedir um desses, o honesto é dizer que falta a base e oferecer o
que existe: `/pessoa` pra conversa de equipe, `/socios` pra acordo entre sócios.

---

## 2. O papel do agente: o cliente que não facilita

O erro do ensaio ruim é o agente querer que a conversa dê certo. Ele responde na hora,
concorda com o argumento, e no fim diz "fechado". Isso treina uma conversa que nunca acontece.

Regras de atuação, todas obrigatórias:

- **Uma resposta por vez, curta.** Cliente real responde em uma ou duas frases, não em
  parágrafo estruturado
- **Não entrega a informação que o usuário não pediu.** Se ele não perguntou quanto o
  problema custa, o cliente não conta
- **Objeção antes de qualquer sim.** Sempre pelo menos duas, e uma delas tirada de
  `_memoria/publico.md`
- **Não muda de posição por argumento bonito.** Muda quando o usuário faz a pergunta que
  obriga a pensar, ou quando recebe algo concreto
- **Nunca fecha antes da quinta troca.** Fechar rápido é o jeito mais eficiente de não
  ensinar nada
- **Sai do personagem só em "pausa".** Fora disso, continua cliente mesmo se o usuário
  reclamar da dificuldade

---

## 3. Escala de resistência

Quatro níveis. O padrão é o 2 na primeira vez e o 3 depois que o usuário passou uma vez.

| Nível | Como o cliente se comporta | Quando usar |
|---|---|---|
| **1. Receptivo** | Responde, tem a dor clara, objeta uma vez | Primeiro ensaio de quem nunca vendeu |
| **2. Normal** | Responde curto, desvia uma vez, duas objeções | Padrão |
| **3. Difícil** | Compara preço desde o começo, cita concorrente, quer desligar | Depois de passar no 2 |
| **4. Hostil** | Já teve experiência ruim, desconfia, interrompe | Só se o usuário pedir, e avisando |

Subir de nível sem o usuário pedir é sabotagem, não treino. Descer também: se ele está
travando no 3, o útil é a pausa, não baixar a régua em silêncio.

---

## 4. Arquétipos de resistência

São os moldes de comportamento, não personagens fixos. O agente escolhe um, avisa qual
depois do ensaio, e mantém o mesmo do começo ao fim.

### Venda

| Arquétipo | Como age | O que ele treina no usuário |
|---|---|---|
| **O comparador** | Pede preço na primeira mensagem, cita dois concorrentes | Segurar o preço até a implicação sair |
| **O que não decide** | Gosta de tudo, e no fim precisa "falar com o sócio" | Descobrir quem decide na primeira troca |
| **O satisfeito** | Já tem fornecedor e não reclama dele | Investigar o que falta sem atacar ninguém |
| **O educado que some** | Concorda com tudo e nunca se compromete | Sair com data, não com "qualquer coisa me avisa" |
| **O que quer de graça** | Pede teste, amostra, "um jeitinho" | Trocar, em vez de ceder |

### Cobrança

| Arquétipo | Como age | O que ele treina no usuário |
|---|---|---|
| **O que promete** | "Pago sexta", e na sexta não paga | Combinar valor, data e forma na mesma frase |
| **O que contesta** | Diz que o serviço não ficou bom | Separar cobrança de reclamação antes de cobrar |
| **O sumido** | Lê e não responde | Escalar sem ameaçar, no prazo da régua |
| **O que chora o desconto** | Pede pra tirar juros e multa inteiros | Respeitar o piso e pedir algo em troca |

---

## 5. A regra da troca

O ponto do ensaio que o dono não vê sozinho: onde ele cedeu sem ganhar nada. Desconto dado
por silêncio incômodo é o vazamento de margem mais comum em negócio pequeno, e ele nunca
aparece no faturamento como desconto. Aparece como mês fraco.

Toda concessão sai com uma contrapartida nomeada. Lista do que pedir, por ordem de quanto
ela vale pro negócio:

| O usuário cede | Pede em troca |
|---|---|
| Desconto no preço | Pagamento à vista, contrato mais longo, ou volume maior |
| Prazo de pagamento maior | Entrada, ou garantia (nota promissória, cartão cadastrado) |
| Entrega mais rápida | Preço de urgência, ou material entregue na hora |
| Escopo a mais | Prazo maior, ou troca por outro item do escopo |
| Perdão de multa e juros | Pagamento hoje, no Pix, com comprovante |
| Parcelar o atrasado | Primeira parcela hoje e a promessa por escrito |

E o piso: o limite abaixo do qual a venda deixa de valer a pena. Ele mora em
`_memoria/oferta.md` (desconto máximo, prazo mínimo, o que nunca entra) e é contra ele que o
script confere cada concessão. Piso que só existe na cabeça do dono é piso que cede na
terceira objeção.

O piso escrito tem três campos por limite, e dois deles impedem o relatório de acusar errado:

| Campo | Pra que serve |
|---|---|
| `unidade` | `%`, `dias`, `meses`, `reais` ou `parcelas`. Concessão em unidade diferente do limite vira aviso, não regra rompida: R$ 200 de abatimento não é 200% de desconto |
| `direcao` | `maximo` pra desconto e prazo de pagamento, que rompem passando do número; `minimo` pra prazo de entrega, que rompe ficando abaixo dele |
| `limite` | O número. Enquanto ele estiver `null`, o script diz que não há piso pra conferir em vez de aprovar |

A lista `nunca` é texto, uma frase por item. Item sem número ("escopo extra sem custo") rompe
assim que a concessão casa com ele. Item com número ("entrega em menos de 15 dias") só rompe
se o número da concessão cair dentro dele: entrega em 20 dias respeita esse limite.

---

## 6. As quatro medidas

O relatório do ensaio não é opinião sobre a performance. São quatro contagens que
`node scripts/ensaiar.js medir` faz na transcrição, e cada uma aponta a linha que acusou.

### Perguntas de implicação: feitas vs previstas

O `/vender` manda preparar de 3 a 5 perguntas de implicação por escrito, justamente porque
elas não saem improvisadas. O ensaio mostra quantas sobreviveram ao nervosismo. É comum
sair uma de cinco na primeira vez.

O comando casa a pergunta prevista com a fala do usuário por palavras com peso, aceitando
paráfrase (metade das palavras basta). O que ele não sabe é se a pergunta veio no momento
certo. Isso continua sendo leitura humana.

### Proporção de fala

Quem fala mais está apresentando. A régua do sistema é de **30% a 50%** das palavras pra
quem vende ou cobra, e ela é régua de calibração, não lei de mercado: número de proporção
ideal varia conforme quem publica, e nenhum deles mede negócio pequeno brasileiro. O uso
correto é comparar o ensaio de hoje com o de duas semanas atrás.

Abaixo de 30% também acusa: investigação curta demais deixa a venda sem apoio, e às vezes é
sinal de que o cliente do ensaio está fazendo o trabalho sozinho.

### Preço antes do problema

O comando acha a primeira fala em que o cliente admite a dificuldade e conta quantas vezes
o usuário mencionou preço, desconto, parcela ou mensalidade **antes** disso. Cada menção
anterior é uma regra dura rompida, porque preço dito antes do problema transforma a conversa
em comparação de orçamento.

A contagem é de menção, não de intenção. Palavra solta como "valor" e "custa" ficou fora do
léxico de propósito: "o valor que isso te custa por mês" é implicação, e acusá-la inverteria
o relatório.

Na cobrança essa medida desce a aviso, e é a única das quatro que muda de peso entre os dois
cenários. Cobrança boa diz valor, data e forma na primeira frase: se a régua da venda valesse
aqui, o relatório reprovaria justamente o que deveria ensinar.

### Concessões contra o piso

Cada linha `**Concessão:**` da transcrição é conferida em três frentes: se veio com algo em
troca, se furou o limite declarado no piso, e se está na lista do que nunca se promete.
Sem plano ao lado, o comando avisa que não há piso pra conferir em vez de aprovar por omissão.

Quando a concessão casa com mais de um limite do piso — "prazo de 45 dias" serve pra pagamento
e pra entrega — o comando nomeia os dois e pede que a linha diga qual é, em vez de chutar.

---

## 7. A pausa

Durante o ensaio o usuário pode escrever **pausa**. O agente sai do personagem, dá a dica
mais curta possível e volta. Três formas de dar dica, da melhor pra pior:

1. **Devolver a pergunta:** "o que você ainda não sabe sobre o problema dele?"
2. **Apontar a fase:** "você está na demonstração e ele não declarou necessidade"
3. **Entregar a frase pronta:** só quando ele pediu explicitamente, e uma só

Dica que entrega a frase pronta ensina a frase, não a leitura da conversa. Vale no primeiro
ensaio da vida e cansa rápido depois.

Toda pausa fica registrada na transcrição. Muitas pausas no mesmo ponto da conversa é
diagnóstico: é ali que o roteiro está furado, não a pessoa.

---

## 8. As três frases pra levar

O ensaio termina com três frases, no máximo. Não é resumo do relatório: é o que cabe na
cabeça de alguém que vai entrar numa reunião amanhã de manhã.

- Uma **pergunta** pra fazer no lugar do que ele fez de errado
- Uma **resposta** pronta pra objeção que mais o travou
- Uma **frase de fechamento** com data dentro

Três é o teto porque lista de dez virou nenhuma. Quem sai do ensaio com dez melhorias
entra na conversa do mesmo jeito de antes.

---

## 9. O que sai do ensaio e fica no sistema

| O que apareceu | Onde mora |
|---|---|
| Objeção que não estava prevista | `_memoria/publico.md`, na seção de objeções, com a resposta |
| Palavra que o cliente usou e a marca não | `_memoria/publico.md`, no vocabulário |
| Limite que o usuário descobriu que tem | `_memoria/oferta.md`, no piso de negociação |
| Pergunta de implicação que funcionou | `vendas/roteiro-*.md`, no roteiro do `/vender` |
| Resposta de objeção que segurou | `biblioteca.md`, se for reaproveitável |

Ensaio que não muda arquivo nenhum foi conversa, não treino.

---

## 10. Fontes

- **Pre-Call Prep**, do catálogo gratuito do claudetraining: pesquisa o prospect, levanta a
  hipótese do problema dele e gera cinco perguntas feitas pra aquele caso, pra rodar dez
  minutos antes da reunião. Daqui veio a ideia de preparar a pergunta por escrito antes da
  conversa, que é o insumo que o ensaio põe à prova.
  https://www.claudetraining.com/skills — conferido em 23/09/2026
- **Interview skills for Claude Code**, de neonwatty, sobre rodar de 5 a 10 rodadas de
  pergunta com portão de aprovação antes de produzir o arquivo final, e sobre priorizar a
  pergunta que expõe a hipótese escondida em vez da pergunta óbvia. Daí saiu a régua de 5 a
  8 trocas e o formato da pausa. https://neonwatty.com/posts/interview-skills-claude-code/ —
  conferido em 23/09/2026
- **Limite legal da cobrança.** O art. 42 do Código de Defesa do Consumidor: "na cobrança de
  débitos, o consumidor inadimplente não será exposto a ridículo, nem será submetido a
  qualquer tipo de constrangimento ou ameaça". O art. 71 põe pena de detenção de três meses a
  um ano e multa em quem usa ameaça, coação ou afirmação falsa pra cobrar. Por isso o
  arquétipo da cobrança resiste, mas o usuário não treina pressão: Lei 8.078/1990,
  https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm — conferido em 23/09/2026.
  Protesto, negativação e serviço contestado são conversa de advogado, não de ensaio
- A régua de 30% a 50% de fala é calibração do Contex OS, não estatística publicada: serve pra
  comparar o ensaio de hoje com o da semana passada, e nada mais
- As quatro fases da conversa, a pergunta de implicação e a diferença entre avanço e
  continuação estão em `.claude/skills/vender/SKILL.md`. Este arquivo não repete aquilo:
  ensaia contra aquilo
