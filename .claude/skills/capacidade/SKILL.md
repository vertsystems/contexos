---
name: capacidade
description: >
  Mede o teto físico da agenda: quantas horas o negócio tem pra vender por semana, quanto
  disso está ocupado em cada dia e cada hora, quanto a hora vazia custa e qual é a receita
  máxima da estrutura de hoje. Devolve os três maiores buracos da agenda com uma ação cada
  (promoção de horário, encaixe, bloqueio) e a conta de quando mais uma cadeira, sala ou
  profissional se paga.
  Use quando o usuário disser "quanto eu consigo atender por mês", "minha agenda tem buraco",
  "terça de manhã é sempre vazia", "vale a pena contratar mais um", "cabe mais uma cadeira",
  "quanto eu perco com horário vazio", "tô lotado mas não sobra dinheiro", "quanto dá pra
  faturar no máximo", "preciso abrir mais horário?", "meu salão tá cheio só no sábado",
  ou /capacidade.
---

# /capacidade — O teto da agenda

> **Convenção de pastas:** a saída vai em `operacao/capacidade.md`, com a spec ao lado em `operacao/capacidade.capacidade.json`. Na convenção **por cliente**, a capacidade da própria casa fica na raiz (`operacao/`) e a medição feita pra um cliente vai em `clientes/<Nome>/operacao/`. A pasta nasce na primeira medição.

Quem vende hora tem um teto de receita que anúncio nenhum levanta. Duas cadeiras abertas 42
horas por semana cabem o que cabem. O dono sabe o faturamento do mês e quase nunca sabe esse
teto, então não consegue responder a pergunta que decide o ano: falta cliente ou falta
horário? São problemas opostos. Um pede oferta, o outro pede gente. Esta skill mede a agenda
como quem mede um galpão: quanto tem, quanto está usado, quanto está vazio, quanto custa o
vazio e a partir de quando compensa alugar mais espaço.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio atende, quantas pessoas atendem ao mesmo tempo, horário de funcionamento, se há equipe contratada
- **Preço e serviço:** `_memoria/oferta.md` e o estudo do `/preco`, quando existirem. De lá saem o preço e a duração de cada serviço
- **Dinheiro do mês:** `financeiro/fechamento-<AAAA-MM>.md` e `financeiro/custos-fixos.md` (do `/caixa`). É de lá que sai o custo fixo e a retirada que viram o custo da hora
- **Falta e no-show:** `agenda/no-show-<AAAA-MM>.md` (do `/confirmacao-de-agenda`), quando existir. Buraco e falta são coisas diferentes, e a leitura junta é melhor que as duas separadas
- **Molde:** `templates/operacao/capacidade.md` — vocabulário, a conta em cinco linhas, o que conta como hora vendida, o teto praticável e de onde vêm os 85%, as três ações de buraco, a jornada legal e a LGPD da exportação, com fonte e data
- **Script:** `scripts/capacidade.js` — lê a spec (e a exportação da agenda em `.ics`, `.csv` ou `.xlsx`) e escreve o relatório inteiro. É ele que faz toda a conta
- **Entrada de dado:** exportação da agenda em `dados/`. Sem exportação, a contagem de uma semana normal resolve
- **Conferência:** `scripts/verificar.js` (`tabela`, `texto`)
- **Saída:** `operacao/capacidade.md` e a spec `operacao/capacidade.capacidade.json`. Medição nova do mesmo negócio sobrescreve o `.md` e guarda a anterior como `operacao/capacidade-<AAAA-MM>.md`

---

## Workflow

### Passo 1 — Entender o que trava a operação

Levantamento vai numa mensagem só. O que `_memoria/empresa.md` já responde não se pergunta
de novo:

> 1. "Quantas pessoas conseguem ser atendidas ao mesmo tempo aí? E o que limita: a cadeira, a sala, ou quem atende?"
> 2. "Que horas abre e que horas fecha, em cada dia da semana? Tem parada pro almoço?"
> 3. "Quais serviços você faz, quanto tempo leva cada um e quanto custa?"
> 4. "De cada 10 atendimentos, quantos são de cada serviço?"
> 5. "Seu sistema de agenda exporta a lista de horários em planilha, CSV ou .ics? (o Google Agenda exporta)"
> 6. "Tem gente contratada com carteira, ou é você e mais alguém por conta?"

A pergunta 1 é a que mais muda o resultado. Três cadeiras e dois barbeiros dão dois postos, não
três. Duas salas e uma dentista dão um posto. Contar o móvel vazio como capacidade infla o teto
e estraga a decisão de contratar.

A 6 abre o Passo 8: se há CLT no meio, o horário de funcionamento não pode passar da jornada
legal, e o molde traz o artigo.

### Passo 2 — Fechar as janelas de funcionamento

Escrever o horário como janelas, uma por bloco aberto. O almoço não é hora aberta: é o espaço
entre duas janelas.

> Terça a quinta das 9h às 12h e das 13h às 19h, sexta até 20h, sábado das 9h às 14h.

Vira:

```json
"ter": [["09:00", "12:00"], ["13:00", "19:00"]],
"sex": [["09:00", "12:00"], ["13:00", "20:00"]],
"sab": [["09:00", "14:00"]],
"dom": []
```

Confirmar com ele antes de seguir, em uma linha, somando as horas. "São 42 horas por semana de
porta aberta, 84 horas-cadeira com as duas cadeiras. Confere?" Erro aqui contamina tudo o que
vem depois, e é o erro mais fácil de achar.

### Passo 3 — Levantar duração, preço e mix

Uma linha por serviço, com duração real (a de agenda, incluindo o que trava o posto) e o preço
praticado hoje. Quando o `/preco` ou o `/oferta` já responderam, usar de lá e dizer que usou.

| Serviço | Duração | Preço | Custo variável | Mix |
|---|---|---|---|---|
| Corte | 45 min | R$ 70 | R$ 6 | 55% |
| Coloração | 120 min | R$ 260 | R$ 60 | 25% |
| Escova | 40 min | R$ 60 | R$ 5 | 20% |

O custo variável é o que só existe quando o atendimento acontece: insumo, taxa de cartão,
comissão. Se ele não souber, entra `[a confirmar]` e o relatório sai com a margem marcada como
provisória. Sem o mix, o script dá peso igual a todos os serviços, e isso distorce a duração
média quando um serviço longo é raro.

### Passo 4 — Pegar a ocupação de verdade

Duas entradas, e as duas passam pelo script. "Acho que fico uns 70% cheio" não entra.

**Com exportação** (o caminho bom): o usuário joga o arquivo em `dados/`. O script lê `.ics` do
Google Agenda, ou CSV e `.xlsx` de sistema de agendamento, reconhece as colunas de data, hora,
fim, duração, serviço e status em qualquer ordem, e ignora o que foi cancelado.

**Sem exportação:** a contagem de uma semana normal, por dia. Sai o mapa por dia, o mapa por
hora não sai, e os três buracos vêm com o dia todo no lugar da hora exata. O arquivo diz isso
em uma linha. Vale como primeira leitura e não vale como decisão de contratação.

> "Numa semana normal, quantos atendimentos você faz em cada dia?"

Período de pelo menos 4 semanas. Com menos, o script avisa e o aviso entra no arquivo.

**Quem atende por ordem de chegada** (barbearia, lava-jato, lanchonete) não tem agenda pra
exportar, e a pergunta muda: não é quanto da agenda está vazio, é quanta gente foi embora
porque a fila estava grande. O caminho está no molde, na seção da fila: contar por uma semana
quem entrou e quem desistiu, por faixa de hora, e lançar a desistência como demanda recusada.
O script não calcula fila, e não finge que calcula.

### Passo 5 — Escrever a spec e rodar

Gerar o exemplo, editar com os números levantados e salvar ao lado da saída:

```bash
node scripts/capacidade.js --exemplo /tmp/capacidade-exemplo
```

A spec no essencial (o exemplo traz todos os campos):

```json
{
  "negocio": "Studio Lumi",
  "unidade": { "nome": "cadeira", "quantidade": 2 },
  "funcionamento": {
    "ter": [["09:00", "12:00"], ["13:00", "19:00"]],
    "sab": [["09:00", "14:00"]],
    "dom": []
  },
  "servicos": [
    { "nome": "Corte", "duracaoMin": 45, "preco": "70,00", "custoVariavel": "6,00", "mixPct": 55 },
    { "nome": "Coloração", "duracaoMin": 120, "preco": "260,00", "custoVariavel": "60,00", "mixPct": 25 }
  ],
  "custoFixoMes": "9.400,00",
  "retiradaMes": "5.000,00",
  "tetoPraticavelPct": 85,
  "ocupacao": { "arquivo": "../dados/agenda.csv" },
  "contratar": { "descricao": "terceira cadeira em meio período", "custoMes": "3.400,00", "horasSemana": 24, "demandaRecusadaMes": 30 }
}
```

`custoFixoMes` e `retiradaMes` vêm do último fechamento do `/caixa`. Sem eles a skill entrega o
teto e o mapa, e a seção do custo da hora sai com o aviso de que falta dado. Vale abrir o
`/caixa` antes quando o usuário nunca fechou um mês: sem o custo fixo, metade do valor daqui
não aparece.

`ocupacao.arquivo` é relativo à pasta da spec. Quem preferir a contagem da semana troca por
`"ocupacao": { "porDia": { "ter": 10, "qua": 12, "qui": 14, "sex": 17, "sab": 8 } }`.

```bash
node scripts/capacidade.js operacao/capacidade.capacidade.json --md operacao/capacidade.md
```

O script escreve o arquivo inteiro: premissas, o que cabe na semana, receita de teto, ocupação
por dia, mapa por hora, custo da hora vazia, os três buracos e a conta da contratação. Nenhum
número desse arquivo é digitado à mão, e nenhum número dito no chat sai de outro lugar.

### Passo 6 — Conferir a conta

```bash
node scripts/verificar.js tabela operacao/capacidade.md
```

As tabelas de capacidade e de ocupação fecham com linha Total, e o verificador soma as colunas
e compara. Se divergir, o erro está na spec, nunca no total. O que costuma ser:

- janela de almoço esquecida (num dia de 8 horas de atendimento, contar a hora do almoço infla o teto em 12,5%)
- unidade contada pelo móvel e não por quem atende
- duração de agenda menor que a real (a de 45 min que na prática trava 60)

Conferir um número por fora antes de confiar no resto:

```bash
# horas-unidade por semana, do zero: minutos abertos × unidades ÷ 60
node -e 'const min=(3+6)*60*3 + (3+7)*60 + 5*60; console.log(min*2/60)'
```

Se esse número não bate com o Total da primeira tabela, parar e descobrir por quê.

### Passo 7 — Ler o mapa e escolher a ação de cada buraco

O script sugere a ação por uma regra grosseira: borda do dia quase vazia pede bloqueio, hora
fraca num dia que enche em outra faixa pede encaixe, o resto pede promoção. Ele devolve um
buraco de cada ação quando os três tipos existem, em vez dos três maiores. Os três maiores
quase sempre são a mesma última hora repetida em três dias, e aí a recomendação sai "fecha,
fecha, fecha". Quem decide é o dono, e a conversa é curta:

| Ação | Quando | O que escrever no arquivo |
|---|---|---|
| **Promoção de horário** | buraco no meio do dia | a janela, o desconto ou brinde, o nome da promoção e a data em que ela sai |
| **Encaixe** | o mesmo dia lota em outra hora | o que oferecer a quem pede o horário de pico, e quem faz a oferta |
| **Bloqueio** | borda do dia quase sempre vazia | o que fecha, a partir de quando, e o que deixa de ser pago |

Três checagens antes de fechar a recomendação, todas no molde: desconto de horário não pode
virar o preço novo, a hora que parece vazia pode ser a vitrine de cliente novo, e encher buraco
com serviço de margem baixa piora o resultado.

Se existe `agenda/no-show-<AAAA-MM>.md`, comparar os dois mapas. Buraco que também tem falta
alta não é problema de oferta: é problema de confirmação, e o conserto está no
`/confirmacao-de-agenda`.

### Passo 8 — Responder "vale mais um?"

A conta sai do script: quantos atendimentos por mês a unidade nova precisa pra pagar o próprio
custo, que ocupação isso representa, e quanto ainda cabe no que já está aberto. O veredito vem
em uma frase, e ela é honesta quando a resposta é não.

Três coisas a fazer antes de tratar isso como decisão:

1. **O custo do contratado é do `/custo-de-funcionario`**, não o salário. Encargos e provisões mudam o número, e o contador confirma
2. **A demanda recusada precisa ser contada**, não lembrada. Se ele não tem o número, a tarefa do mês é anotar toda vez que alguém não conseguiu horário
3. **O caixa da rampa é do `/projecao`.** Levar o custo mensal pro cenário "contratar" e olhar o caixa mais baixo do pessimista, porque o profissional custa antes de produzir

### Passo 9 — Entregar e marcar a revisão

O arquivo que o script escreve tem esta forma, e as duas últimas seções são escritas à mão:

```markdown
# Capacidade — <negócio>

## Premissas
- Unidades, duração média, preço médio, margem por hora, teto praticável, estrutura do mês

## O que cabe na semana
| Dia | Janelas | Horas abertas | Horas-<unidade> | Atendimentos que cabem |
| Total | — | ... | ... | ... |
Receita de teto: R$ ... por mês cheia, R$ ... no teto praticável

## Ocupação medida
| Dia | Horas-<unidade> | Horas ocupadas | Horas ociosas | Ocupação % |
| Total | ... | ... | ... | ... |

## Mapa por hora
(grade de dia × hora, em blocos, direto do script)

## Quanto a hora vazia custa
- Custo da hora aberta, custo da hora entregue, custo da ociosidade, receita que cabia até o teto

## Os três buracos maiores
| Buraco | Ocupação % | Horas vazias/semana | Ação |

## Vale mais 1 <unidade>?
- Custo, capacidade nova, atendimentos pra empatar, o que ainda cabe no que já está aberto

## Atenção
- Período curto, compromisso fora do horário declarado, linha ignorada, status que o script não reconheceu

## O que a conta permite decidir
1. [decisão concreta, com o número que a sustenta e a data em que começa]
2. [o que fazer com cada um dos três buracos, e quem faz]

## O que não dá pra afirmar ainda
[o que ficou como estimativa do dono, e o que contar no mês que vem pra resolver]
```

As duas últimas seções passam pelo medidor de prosa, porque é o que o usuário relê em três
meses:

```bash
awk '/^## O que a conta permite decidir/,0' operacao/capacidade.md > /tmp/capacidade-decisao.md
node scripts/verificar.js texto /tmp/capacidade-decisao.md
```

Entregar em cinco linhas, todas com número do arquivo: onde ficou, a ocupação medida, as horas
vazias por mês e o que elas valem, o maior buraco com a ação, e a resposta da contratação.

Registrar em `tarefas.md`: "remedir a capacidade em <mês>", junto com a contagem que ficou
pendente. Capacidade medida uma vez vira número de memória, e número de memória é sempre o do
dia mais cheio.

---

## Regras

- **A unidade é quem atende, não o móvel.** Cadeira sem barbeiro não é capacidade. Perguntar sempre o que limita, e escrever a resposta nas premissas
- **Ocupação de 100% não existe.** O teto físico serve de régua; a meta é o teto praticável, e o valor dele é premissa do dono, escrita no arquivo como escolha dele
- **Toda conta roda por comando.** A tabela sai do `scripts/capacidade.js`, passa pelo `verificar.js tabela`, e um número é conferido por fora. Número de cabeça não entra no arquivo nem no chat
- **Se a soma divergir, corrigir a spec, nunca o total.** O erro está no horário, na unidade ou na duração, e ajustar o resultado pra bater é esconder o erro onde ele mais custa
- **Hora vazia não é dinheiro saindo do caixa.** Ela empurra o custo das horas vendidas pra cima. Dizer as duas coisas juntas, senão o número parece prejuízo novo e assusta sem informar
- **Nunca inventar ocupação.** Exportação ou contagem. "Uns 70%" volta como pergunta, e sem nenhum dos dois o arquivo sai só com o teto, dizendo isso
- **Período de 4 semanas ou o aviso fica no arquivo.** Semana com feriado desenha um mapa que não existe
- **Demanda recusada se conta, não se lembra.** A decisão de contratar depende desse número; se ele não existe, a entrega é a contagem do mês, não a contratação
- **Desconto de horário tem prazo.** Promoção sem data de saída vira o preço novo, e o cliente que pagava cheio migra pra ela
- **Fronteira com as vizinhas:** o `/caixa` olha o dinheiro que já passou e dá o custo da hora; o `/projecao` olha o caixa dos próximos meses e recebe daqui o custo da unidade nova no cenário "contratar"; o `/custo-de-funcionario` calcula quanto o contratado custa de verdade; o `/confirmacao-de-agenda` cuida de quem marcou e não veio, que é outro prejuízo; o `/preco` decide quanto cobrar, e o `/oferta` decide o que é o pacote; o `/delivery` cuida da capacidade de entrega, que tem gargalo de rota e não de agenda; o `/decidir` conduz a decisão grande quando a conta não basta. O `/capacidade` é o único que olha o teto físico da agenda
- **Dado de agenda é dado pessoal.** Exportação vem com nome e telefone, e procedimento de saúde é dado sensível pela LGPD (Lei 13.709/2018). O arquivo fica em `dados/`, o relatório não cita cliente por nome, e nada vai pra ferramenta externa sem autorização explícita do dono
- **Não é consultoria contábil nem trabalhista.** Jornada, intervalo, banco de horas e convenção coletiva limitam o horário que dá pra abrir, e o molde traz os artigos com fonte. Quem confirma o caso dele é o contador ou o sindicato da categoria
- **Resultado ruim se diz.** Se a unidade nova não se paga nem lotada, a primeira linha da entrega é essa, com o número. Se a ocupação está em 40% e o dono se sente lotado, isso também se diz, porque é a informação que muda o mês dele
