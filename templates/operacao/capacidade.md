# Capacidade — o teto da agenda, a hora vazia e a hora de crescer

Referência do `/capacidade`. O `scripts/capacidade.js` faz a conta; este arquivo diz o que
conta como hora aberta, por que ocupação de 100% não existe, como se lê o mapa por hora, o
que fazer com cada tipo de buraco e onde a decisão de contratar para de ser aritmética.

Por que existe: quem vende hora tem um teto de receita que não depende de marketing. Duas
cadeiras abertas 42 horas por semana cabem o que cabem, e nenhum anúncio muda isso. O dono
quase sempre sabe o faturamento e quase nunca sabe o teto, então não sabe se o problema da
semana é falta de cliente ou falta de horário. São problemas opostos e a conta separa os dois
em dez minutos.

Números de lei conferidos em 2026-09-23. O que depende de convenção coletiva muda por
categoria e por cidade, e o arquivo diz onde reconferir.

---

## O vocabulário

| Termo | O que é |
|---|---|
| Unidade | o que atende uma pessoa por vez: cadeira, poltrona, sala, mesa, box, profissional |
| Hora aberta | hora em que a porta está aberta, independente de ter cliente |
| Hora-unidade | hora aberta × unidades. Duas cadeiras abertas das 9h às 18h dão 18 horas-unidade |
| Slot | um atendimento. Hora-unidade ÷ duração média do serviço |
| Ocupação | horas vendidas ÷ horas-unidade abertas, no mesmo período |
| Teto físico | a receita da agenda 100% cheia. Um número que nunca acontece, e serve de régua |
| Teto praticável | o teto vezes a ocupação que o negócio sustenta sem quebrar (premissa do dono) |

A unidade é o que trava. Numa barbearia com três cadeiras e dois barbeiros, a unidade é o
barbeiro, não a cadeira. Num consultório de uma pessoa com duas salas, a unidade é a pessoa.
Contar a cadeira vazia como capacidade infla o teto e a decisão sai errada.

## A conta, em cinco linhas

```
1. Horas-unidade abertas   = Σ (minutos de cada janela) × unidades ÷ 60
2. Slots                   = horas-unidade × 60 ÷ duração média do serviço
3. Receita de teto         = slots × preço médio
4. Ocupação                = horas vendidas ÷ horas-unidade abertas
5. Horas ociosas           = horas-unidade abertas − horas vendidas
```

A duração média e o preço médio saem do mix, não da média simples. Um salão que faz 55% de
corte de 45 min, 25% de coloração de 120 min e 20% de escova de 40 min tem duração média de
62,8 min (0,55 × 45 + 0,25 × 120 + 0,20 × 40), não os 68,3 min da média simples dos três. O
script pondera pelo `mixPct` de cada serviço, e a diferença de 5 minutos por atendimento vira
umas 28 horas de teto por mês numa agenda de duas cadeiras.

Mês no sistema é 4,348 semanas (365,25 ÷ 12 ÷ 7). Quatro semanas por mês subestima o teto em
8%, e é o erro mais comum de planilha feita à mão.

## O que conta como hora vendida

| Situação | Conta como ocupado? |
|---|---|
| Atendimento realizado | sim |
| Marcado, cliente não veio | sim: o horário estava vendido e ninguém pôde usar |
| Cancelado com antecedência | não: o horário voltou pra prateleira |
| Cancelado em cima da hora | não, e é aqui que mora o prejuízo do `/confirmacao-de-agenda` |
| Bloqueio de almoço, limpeza, reunião | não entra nem como aberto nem como vendido |
| Horário futuro, ainda em aberto | não: mede o passado, não a expectativa |

Falta é assunto do `/confirmacao-de-agenda`, que mede a taxa e o custo dela. Aqui o que se
mede é o buraco: horário que a agenda nunca vendeu. Os dois problemas se somam e têm consertos
diferentes, então não se misturam na mesma conta.

**Período mínimo: 4 semanas.** Menos que isso e uma semana de feriado desenha um mapa que não
existe. O script avisa quando o período lido tem menos de 28 dias.

## Por que 100% não existe

Entre um atendimento e outro há limpeza, atraso, banheiro, telefone e o cliente que remarca.
Além disso, quanto mais cheia a agenda, mais caro fica cada encaixe: a espera de quem chega
cresce mais rápido que a ocupação, e passa a explodir com qualquer imprevisto. Isso é teoria de
filas, vale pra caixa de supermercado, pra central de atendimento e pra cadeira de barbeiro.

A conta que mostra isso é de uma linha, e vale conferir por comando em vez de acreditar. Na
fila de um atendente (o modelo M/M/1), a espera média em múltiplos do tempo de atendimento é
ρ ÷ (1 − ρ), com ρ = utilização:

```bash
node -e 'for (const r of [0.5, 0.75, 0.85, 0.95]) console.log(r, (r / (1 - r)).toFixed(1))'
# 0.5 → 1,0×   0.75 → 3,0×   0.85 → 5,7×   0.95 → 19,0×
```

Ir de 50% pra 75% de ocupação triplica a espera. Os dez pontos seguintes, até 85%, quase a
dobram outra vez, e os dez últimos a multiplicam por mais de três. Não existe um ponto exato de
virada: existe uma curva que sobe sozinha, e é por isso que agenda apertada dá a sensação de
"hoje deu tudo errado" num dia em que nada deu errado.

O 85% do script é **premissa**, não referência de mercado de salão ou clínica: não existe
número público confiável de ocupação média por setor no Brasil, e o que circula em blog de
fornecedor não descreve amostra nenhuma. Quem manda é o número que o dono reconhece como
sustentável. Barbearia por ordem de chegada aguenta mais; clínica com hora marcada e exame
demorado aguenta menos. O arquivo escreve o valor usado e de quem foi a escolha.

## Fila por ordem de chegada (o caso da barbearia)

Negócio que atende por ordem de chegada não tem agenda pra exportar, e aí a pergunta muda: não
é "quanto da agenda está vazio", é "quanta gente desiste porque a fila estava grande". O
`scripts/capacidade.js` não calcula fila: ele é aritmética de capacidade, e fila pede Erlang C
com chegada por hora. O caminho que funciona sem modelo nenhum:

1. Contar, por uma semana, quantas pessoas entraram e quantas saíram sem esperar, por faixa de hora
2. Tratar quem desistiu como demanda recusada: entra em `contratar.demandaRecusadaMes`
3. O resto da conta é igual: cada desistência vale a margem de um atendimento

Isso responde a pergunta do dono (vale mais uma cadeira?) sem pedir a ele um dado que não tem.

## As duas contas de custo da hora

O `/caixa` calcula o custo da hora do dono dividindo custo fixo mais retirada pelas horas
**trabalhadas**. O `/capacidade` divide pelas horas **abertas**. A diferença entre os dois
números é o preço da ociosidade:

```
custo da hora aberta   = (fixos + retirada) ÷ horas-unidade abertas no mês
custo da hora entregue = (fixos + retirada) ÷ horas vendidas no mês
custo da ociosidade    = horas ociosas × custo da hora aberta
```

Exemplo do `--exemplo` do script: R$ 14.400 de estrutura (R$ 9.400 de fixo mais R$ 5.000 de
retirada), 365,3 horas-cadeira abertas por mês e 164,7 vendidas. A hora aberta custa R$ 39,43 e
a hora entregue custa R$ 87,46. É o mesmo dinheiro repartido por menos horas, e é por isso que o
preço "que dá conta" parece sempre alto demais: ele está pagando as horas que ninguém comprou.

Duas leituras que a hora ociosa **não** permite:

- **Não é dinheiro saindo do caixa.** A estrutura foi paga de qualquer forma; a hora vazia não gera despesa nova
- **Não é receita perdida inteira.** Encher a agenda até 100% é impossível, então o que se pode recuperar é a folga até o teto praticável, não a ociosidade toda

## Os três buracos e as três ações

O script ordena as células do mapa (dia × hora) pelas horas vazias por semana e devolve **um
buraco de cada ação**, o maior de cada tipo, em vez das três maiores. O motivo é prático: as
três maiores costumam ser a última hora do dia repetida em três dias, e aí a recomendação sai
"fecha, fecha, fecha". Quando só existem duas ações no mapa, a terceira vaga vai pro próximo
buraco por tamanho. A ação vem de uma regra grosseira, e a decisão é do dono:

| Ação | Quando cabe | O que é na prática |
|---|---|---|
| **Promoção de horário** | buraco no meio do dia, com o dia todo morno | preço ou brinde só naquela janela, com nome próprio ("terça da manutenção") |
| **Encaixe** | o mesmo dia chega a 65% ou mais em outra hora, com o dobro da ocupação desta | oferecer o horário vazio a quem pede o horário de pico, com vantagem pequena |
| **Bloqueio** | borda do dia quase sempre vazia | fechar aquele pedaço e cortar o custo variável de estar aberto |

Três erros que aparecem toda vez:

- **Desconto permanente no horário vazio.** Vira o preço novo, e o cliente que pagava cheio migra. Promoção de horário precisa de prazo e de nome, e sai da tabela quando o buraco fechar
- **Bloquear a hora que é vitrine.** Sábado à tarde vazio em loja de rua pode ser o horário em que o cliente novo descobre o negócio. Antes de fechar, olhar de onde vem quem entra pela primeira vez
- **Encher buraco com serviço de margem baixa.** Hora ocupada com margem menor que a hora vazia custa: piora o resultado e cansa a equipe. Conferir a margem por hora de cada serviço antes

O mapa por hora costuma revelar uma coisa que o dono não esperava: o buraco não está no dia
inteiro, está na primeira hora depois do almoço. Isso muda o conserto de "preciso de mais
cliente" pra "preciso mover três clientes de lugar".

Sem exportação não há mapa por hora, e aí o buraco sai com o dia inteiro no lugar da hora. As
ações possíveis caem pra duas: dia quase vazio abaixo de 20% pede bloqueio, o resto pede
promoção. Encaixe fica de fora porque ele depende de ver o pico dentro do dia.

## A decisão de contratar

A conta do equilíbrio é uma divisão:

```
atendimentos pra empatar = custo mensal da unidade nova ÷ margem por atendimento
ocupação de equilíbrio   = atendimentos pra empatar ÷ atendimentos que a unidade nova cabe
```

Antes dela, existe um portão que a maioria pula: **quanto ainda cabe no que já está aberto**.
Se a folga até o teto praticável é maior que a demanda recusada, contratar é pagar folha pra
resolver um problema de distribuição. O script mostra os dois números lado a lado e escreve o
veredito em uma frase.

O que a conta **não** decide:

- **Custo real do funcionário.** Salário não é custo. Encargos, provisões de férias e décimo terceiro, e o regime da empresa mudam o número, e isso é do `/custo-de-funcionario` e do contador
- **Caixa pra atravessar a rampa.** Profissional novo custa antes de produzir. Quantos meses o caixa aguenta é cenário do `/projecao`
- **Se a demanda é real.** "Recusei 30 pessoas" dito de memória vale zero. Vale a contagem de um mês, anotada na hora

## Jornada: o teto legal por cima do teto físico

Horário de funcionamento não é jornada de funcionário. Se a operação depende de gente
contratada, a jornada de cada um limita o que dá pra abrir, e isso é lei:

| Regra | O que diz | Fonte | Conferido em |
|---|---|---|---|
| Jornada normal | não superior a 8 horas diárias e 44 semanais, com compensação por acordo ou convenção coletiva | CF art. 7º, XIII (planalto.gov.br/ccivil_03/constituicao/constituicao.htm) | 2026-09-23 |
| Intervalo dentro da jornada | jornada acima de 6 horas exige intervalo de no mínimo 1 hora, no máximo 2 salvo acordo escrito | CLT art. 71 (planalto.gov.br/ccivil_03/decreto-lei/del5452.htm) | 2026-09-23 |
| Jornada entre 4 e 6 horas | intervalo obrigatório de 15 minutos | CLT art. 71, § 1º | 2026-09-23 |
| Redução do intervalo por negociação coletiva | convenção ou acordo coletivo pode reduzir o intervalo, respeitado o mínimo de 30 minutos para jornada acima de 6 horas | CLT art. 611-A, III, incluído pela Lei 13.467/2017 (planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13467.htm) | 2026-09-23 |

O intervalo do art. 71 entra como janela fechada no `funcionamento`, e não como hora aberta.
Num dia de 8 horas de atendimento mais 1 hora de almoço, contar o almoço como capacidade infla
o teto em 12,5% (9 ÷ 8), e o teto é a régua de todo o resto do arquivo. Convenção coletiva da
categoria pode mudar horário de abertura, adicional, banco de horas e o próprio intervalo. Quem
confirma o caso dele é o contador ou o sindicato da categoria, não esta skill.

## De onde sai a exportação

| Origem | Como sai | O que conferir |
|---|---|---|
| Google Agenda | Configurações → Importar e exportar → Exportar (zip com um `.ics` por agenda) | evento de dia inteiro e bloqueio pessoal ficam no meio, e não são atendimento |
| Sistema de agendamento (salão, clínica, estúdio) | relatório de agendamentos em CSV ou Excel | coluna de status: o léxico do `scripts/no-show.js` reconhece a maioria |
| Planilha na mão | uma linha por atendimento, com data, hora e duração | duração vazia herda a duração do serviço da spec, e o relatório avisa |
| Caderno | a contagem de uma semana normal, por dia | `ocupacao.porDia` na spec: sai o mapa por dia, sem o mapa por hora |

O que o script reconhece de coluna, em qualquer ordem e sem acento: `data`, `hora`, `fim`,
`duracao`, `servico`, `status`, `unidade` (ou `profissional`). Nome fora da lista se resolve com
um "localizar e substituir" no cabeçalho.

## Dado pessoal na exportação

Exportação de agenda vem com nome, telefone e às vezes o procedimento de cada pessoa. Isso é
dado pessoal, e procedimento de saúde é dado sensível pela LGPD (Lei 13.709/2018).

- O arquivo fica em `dados/`, que o `.gitignore` do sistema já ignora
- O relatório não cita nome de cliente: só dia, hora, serviço e contagem
- Nada disso vai pra ferramenta externa sem o dono autorizar, e a autorização é por arquivo, não por hábito
- Apagar a exportação depois de medir é um hábito melhor que guardar por hábito

## Erros comuns

- **Contar cadeira sem gente como capacidade.** A unidade é o gargalo, e quase sempre é a pessoa
- **Somar 4 semanas no mês.** O mês tem 4,348 semanas: 4 semanas perdem 8% do teto (4 ÷ 4,348), e o teto é a régua de tudo
- **Medir uma semana.** Feriado, chuva e emenda desenham um mapa falso
- **Tratar profissionais como intercambiáveis quando não são.** Se só uma pessoa faz coloração, o teto de coloração é o dela
- **Confundir buraco com falta.** Horário que ninguém marcou pede oferta; horário marcado e furado pede régua de confirmação
- **Decidir contratação pela sensação de estar cheio.** Cheio às sextas às 18h convive com terça vazia, e a folha é mensal
