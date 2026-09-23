---
name: socios
description: >
  Entrevista os sócios começando pelos cenários ruins (um sai, um morre, um para de trabalhar e
  continua sócio, os dois empatam, um vende pra estranho) e devolve a folha de decisões pra levar
  ao advogado: cada cláusula nomeada, o que a lei faz no silêncio do contrato, o que os sócios
  querem no lugar, e se aquilo vai no contrato social ou fica no acordo. Confere que as
  participações somam 100% e calcula vesting e haveres por comando.
  Use quando o usuário disser "vou abrir empresa com um sócio", "meu sócio quer sair", "e se um
  de nós morrer", "meu sócio parou de trabalhar e continua com metade", "a gente é 50/50 e não
  consegue decidir", "como divido a empresa com ele", "preciso de acordo de sócios", "meu sócio
  quer vender a parte dele", "quanto vale a parte de quem sai", "quero dar sociedade pra quem
  trabalha comigo", ou /socios.
---

# /socios — O que fazer quando a sociedade der errado

> **Convenção de pastas:** a saída vai em `juridico/acordo-de-socios.md`, com o spec de cálculo em `juridico/acordo-de-socios.json`. Na convenção **por cliente**, a sociedade da própria casa fica na raiz (`juridico/`); sociedade de cliente, em `clientes/<Nome>/juridico/`. A pasta nasce na primeira folha de decisões.

Sociedade não quebra na divisão. Quebra na saída. Dois amigos combinam meio a meio numa
tarde e nunca mais falam do assunto, porque falar de saída soa como desconfiança. Depois um
adoece, ou recebe proposta de emprego, ou simplesmente para de aparecer, e aí descobrem que
a lei já tinha uma resposta pronta: liquidar a quota e pagar em dinheiro, em 90 dias. A
empresa saudável tira metade do próprio valor do caixa no pior momento. Esta skill faz as
perguntas difíceis antes, enquanto os dois ainda se gostam, e entrega a folha que o
advogado precisa pra redigir em uma reunião em vez de cinco.

> **Isto é rascunho pra advogado, não é o acordo.** A skill nomeia a cláusula, mostra o
> padrão da lei, registra o que os sócios decidiram e calcula os números. Quem redige,
> assina e registra é advogado. O arquivo de saída leva esse rótulo na primeira linha, e a
> skill diz isso ao usuário na entrega, uma vez.

## Dependências

- **Contexto:** `_memoria/empresa.md` — razão social, CNPJ, tipo societário, quem trabalha no negócio e em que função
- **Tom:** `_memoria/preferencias.md` — o arquivo é lido pelos próprios sócios meses depois; precisa soar como eles
- **A conta do negócio:** `financeiro/fechamento-<AAAA-MM>.md` e `financeiro/custos-fixos.md`, do `/caixa`. É de lá que sai o valor de referência da empresa e quanto ela aguenta pagar de haveres por mês
- **Decisões anteriores:** `decisoes/`, do `/decidir`, quando a entrada de um sócio já foi discutida lá
- **Molde:** `templates/juridico/acordo-de-socios.md` — catálogo de cláusulas com a coluna "contrato social ou acordo", os cinco cenários com o padrão da lei, critérios de apuração de haveres, regime do vesting na limitada, saídas de impasse e léxico
- **Script:** `scripts/socios.js` — confere que as participações somam 100%, monta a tabela de vesting por data e simula a apuração de haveres em parcelas, em dia útil
- **Conferência:** `node scripts/verificar.js tabela`, `datas` e `texto`
- **Saída:** `juridico/acordo-de-socios.md` (a folha de decisões), `juridico/acordo-de-socios.json` (o spec que o script lê) e `juridico/acordo-de-socios-contas.md` (as tabelas geradas, que entram na folha sem retoque)

---

## Workflow

### Passo 1 — Entender a sociedade que existe hoje

Antes de qualquer cenário, o retrato. Se `_memoria/empresa.md` já responde, não perguntar
de novo. O que falta, uma pergunta por vez:

1. "A empresa já existe ou vocês estão abrindo agora?" Empresa que existe tem contrato
   social pra ler; empresa que nasce ainda dá pra desenhar do zero
2. "Quantos sócios, e quanto cada um tem?" Anotar a porcentagem de cada um, sem arredondar
3. "Quem trabalha na empresa no dia a dia, e em quê?" Sócio que trabalha e sócio que só
   investiu têm conversas diferentes
4. "Alguém entrou com dinheiro? Quanto, e quem?" Capital integralizado muda a apuração de
   haveres, porque a lei manda considerar a quota "pelo montante efetivamente realizado"
5. "Vocês têm contrato social e alguma coisa escrita além dele?"

Se ele mandar o contrato social em PDF, ler pela ferramenta Read e anotar o que já está
resolvido: quórum, sucessão, apuração de haveres, exclusão por justa causa. Cláusula que já
existe não entra na folha como pergunta; entra como "já está no contrato, confira se é isso
que vocês querem".

Se a empresa não é limitada (S.A., MEI, sociedade simples, SLU de um sócio só), dizer em
uma linha o que muda e seguir. Boa parte do molde é escrita pra limitada, que é o formato
de quase todo negócio pequeno com sócio.

### Passo 2 — Conferir as participações por comando

Porcentagem que não fecha 100% é o erro mais bobo e mais comum, e aparece sempre em
sociedade de três com "um terço cada". Gerar o spec e rodar:

```bash
node scripts/socios.js --exemplo > juridico/acordo-de-socios.json
# trocar pelos sócios de verdade e APAGAR as chaves "vesting" e "haveres" do exemplo,
# senão a folha sai com o Bruno fictício e uma retirada de R$ 600 mil que ninguém falou:
node scripts/socios.js juridico/acordo-de-socios.json
```

Nesta passada o spec fica só com `empresa`, `capital` e `socios`. Vesting e haveres entram
depois, nos passos 4 e 6, quando os sócios decidirem.

Se a soma não fechar 100% (tolerância de um centésimo), o script mostra a tabela com o
diagnóstico, **não calcula vesting nem haveres, não grava arquivo** e sai com código 2. Três
sócios com 33,33% somam 99,99%, e o 0,01% que falta é uma quota sem dono no registro da
Junta. Corrigir no JSON e rodar de novo; não seguir pro passo seguinte com a conta aberta.

### Passo 3 — A entrevista pelos cenários ruins

Cinco cenários, um por vez, e a ordem importa: começar pela morte, que é o único em que
ninguém tem culpa, desarma a desconfiança. Pra cada um, o roteiro é o mesmo em três tempos:
contar o que a lei faz no silêncio, perguntar se é isso que eles querem, e anotar a
resposta com o nome da cláusula.

O padrão legal de cada cenário está no molde, com artigo e fonte. Em resumo:

| Cenário | O que a lei faz se o contrato não disser nada | Cláusula que muda isso |
|---|---|---|
| **Um morre** | liquida-se a quota: a empresa paga os haveres ao espólio (CC art. 1.028) | sucessão, seguro de vida entre sócios |
| **Um sai por vontade** | avisa com 60 dias, resolução no 60º dia, pagamento em 90 dias da liquidação (CC art. 1.029 e 1.031, § 2º; CPC art. 605, II) | apuração de haveres, prazo de pagamento, não concorrência |
| **Um para de trabalhar** | nada: continua sócio com tudo. Exclusão exige ato de inegável gravidade (CC art. 1.085) | vesting por permanência, recompra, pró-labore separado da distribuição |
| **Os dois empatam** | paralisia; sobra a dissolução judicial | deadlock buy-or-sell, desempatador, quórum reforçado |
| **Um vende pra estranho** | pode vender se não houver oposição de mais de um quarto do capital (CC art. 1.057) | preferência, tag along, drag along, lock-up |

As perguntas que abrem cada cenário, na forma como o usuário entende:

- **Morte:** "se o [sócio] morrer amanhã, a viúva dele entra na sociedade, ou vocês compram
  a parte dela? Se comprarem, de onde sai o dinheiro?" A segunda pergunta é a que ninguém
  respondeu ainda
- **Saída:** "se ele quiser sair em três anos, quanto vocês pagam? E em quantas vezes,
  sabendo quanto sobra por mês no caixa hoje?"
- **Parou de trabalhar:** "se ele parar de aparecer em seis meses, continua com [X]%?"
- **Empate:** "na semana passada, teve alguma decisão que vocês não conseguiram fechar?"
  Caso concreto funciona melhor que hipótese
- **Venda:** "se aparecer alguém querendo comprar a parte dele, vocês querem poder comprar
  primeiro? E se aparecer alguém querendo a empresa inteira, e um dos dois não quiser vender?"

Uma pergunta por vez, e nada de responder pelos sócios. Se eles discordarem na hora, essa
é a informação mais valiosa da sessão: registrar a divergência com as duas posições, não
escolher um lado. Advogado resolve divergência escrita; divergência escondida vira processo.

Se algum cenário virar uma decisão grande por si (aceitar um sócio novo, comprar a parte do
outro agora), o `/decidir` faz as perguntas de reversibilidade e custo que esta skill não faz.

### Passo 4 — Vesting, se houver sócio que entra por trabalho

Só entra quem tem esse desenho. Perguntar quanto da participação está sujeita a
permanência, em quantos meses, com que carência e com que frequência de aquisição. Depois
acrescentar ao spec e rodar:

```bash
node scripts/socios.js juridico/acordo-de-socios.json --hoje 22/09/2026
```

O script devolve a tabela por data: quanto está adquirido, quanto está em risco, e o dia da
semana de cada marco. Duas coisas do molde precisam aparecer na conversa, porque quebram
vesting mal desenhado:

- **Quota não se paga com trabalho** na limitada (CC art. 1.055, § 2º). O desenho que
  funciona é a quota no papel desde o começo, com opção de recompra da parte não adquirida
- **Condição que depende só da vontade de um dos sócios não vale** (CC art. 122). "O
  majoritário decide se venceu" é cláusula morta

Anotar o preço da recompra junto com a tabela. Vesting sem preço de recompra é metade da
cláusula, e é a metade que gera briga.

### Passo 5 — Pró-labore e distribuição: o dinheiro que sai todo mês

A cláusula que mais gera ressentimento no dia a dia não é nenhuma das cinco: é a diferença
entre o que cada sócio recebe por **trabalhar** e o que recebe por **ser dono**. Um trabalha
seis horas por dia, o outro aparece na quinta, e os dois tiram o mesmo valor porque "somos
meio a meio". Quatro perguntas:

1. "Quem trabalha na empresa recebe pró-labore? Quanto, cada um?" Sócio que trabalha sem
   pró-labore está financiando a empresa com o próprio salário, e isso aparece um dia
2. "O lucro se divide na proporção das quotas, ou de outro jeito?" Divisão desproporcional é
   possível, e por isso precisa estar escrita (CC art. 997, VII, e art. 1.007)
3. "Quanto fica na empresa antes de qualquer distribuição?" Distribuir tudo é o jeito mais
   comum de quebrar empresa lucrativa
4. "Quem pode autorizar uma retirada fora do combinado, e até quanto?"

Duas coisas de fato pra dizer aqui, e nenhuma delas é opinião:

- **Distribuição de lucro deixou de ser sempre isenta.** Desde janeiro de 2026, lucro pago
  pela mesma empresa à mesma pessoa física acima de R$ 50.000,00 num mês tem 10% de imposto
  retido na fonte, inclusive no Simples ([Lei 15.270/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/Lei/L15270.htm),
  conferida em 23/09/2026). Quem confirma o caso concreto é o contador
- **O valor da retirada é conta do `/pro-labore`**, que trata Fator R, INSS e IRRF. Esta
  skill registra a **regra** de divisão; o número do mês vem de lá

A linha que entra na folha é a regra, não o valor de um mês: "pró-labore de R$ X pra quem
trabalha em tempo integral, revisto em janeiro; lucro dividido na proporção das quotas depois
de reservar R$ Y de capital de giro; retirada extra acima de R$ Z exige as duas assinaturas".

### Passo 6 — Apuração de haveres: o número que ninguém fez

Aqui a folha deixa de ser jurídica e vira conta. Três perguntas, e todas viram spec:

1. **Por qual critério?** As quatro opções estão no molde com o que cada uma tende a dar.
   Vale dizer o padrão do silêncio: balanço de determinação a preço de saída (CPC art. 606),
   que costuma ser o número mais alto
2. **Quanto vale a empresa hoje, pelo critério escolhido?** A skill não avalia empresa. Se o
   `/caixa` tem fechamento, montar o múltiplo a partir do lucro somado por comando dos
   últimos 12 meses, com o fator que os sócios escolherem, e deixar o fator visível. Sem
   base, entra `[a confirmar: pedir avaliação]` e a conta roda com um número de exemplo
   marcado como exemplo
3. **Em quantas parcelas, e com quanta carência?**

```bash
node scripts/socios.js juridico/acordo-de-socios.json --feriado 20/01
```

O script calcula os haveres, quebra em parcelas com vencimento empurrado pra dia útil, e
mostra lado a lado o que a lei manda no silêncio (à vista em 90 dias) e o que o acordo
propõe. A comparação é o argumento: doze parcelas de R$ 1.500 são a diferença entre a
empresa sobreviver à saída e não sobreviver.

Depois, a pergunta que fecha o cenário da morte: **a empresa aguenta essa parcela?** Pegar
o que sobra por mês no último fechamento do `/caixa` e comparar por comando, trocando os
dois números do exemplo pelos de verdade:

```bash
node -e 'const sobra=4200, parcela=1500; console.log("sobra:",sobra,"| parcela:",parcela,"| sobra depois:",sobra-parcela,"| comprometido:",(parcela/sobra*100).toFixed(1)+"%")'
```

Passando de um terço da sobra, dizer isso com o número e oferecer as duas saídas que o
molde traz: mais parcelas, ou seguro de vida entre sócios pra que o caixa não pague sozinho.

### Passo 7 — Escrever a folha de decisões

O script gera as tabelas de número. O assistente escreve o resto ao redor, e não altera
nenhuma linha que o script produziu:

```bash
node scripts/socios.js juridico/acordo-de-socios.json --saida juridico/acordo-de-socios-contas.md
```

Depois monta `juridico/acordo-de-socios.md` neste formato:

```markdown
# Acordo de sócios — <empresa> — RASCUNHO PRA ADVOGADO

> Escrito em <DD/MM/AAAA> a partir da entrevista com <sócios>. **Não é o acordo.**
> Não redige cláusula, não substitui advogado e não vale assinado.
> Base legal conferida em <AAAA-MM-DD>: Código Civil (URL), CPC (URL), Lei 14.451/2022 (URL)
> e, se a folha tocar em distribuição de lucro, Lei 15.270/2025 (URL).

## A sociedade hoje
[a tabela de participações gerada pelo script, intacta, com o total 100%]
[quem trabalha, em quê, e quem só investiu]

## As decisões
| Cláusula | O que a lei faz no silêncio | O que vocês decidiram | Vai no contrato social? | Base |
|---|---|---|---|---|
| Sucessão (morte) | liquida a quota e paga ao espólio | herdeiro não entra; a empresa recompra em 24 parcelas | **sim** | CC art. 1.028 |
| Apuração de haveres | balanço de determinação a preço de saída | múltiplo de 2× o lucro dos 12 meses | **sim** | CPC art. 606 |
| Prazo de pagamento dos haveres | em dinheiro, 90 dias da liquidação | 24 parcelas corrigidas pelo IPCA | **sim** | CC art. 1.031, § 2º |
| Pró-labore x distribuição | nada; presume proporção das quotas | <a regra do Passo 5> | acordo, e no contrato se o lucro for desproporcional | CC art. 997, VII e art. 1.007 |
| Vesting por permanência | nada: quem sumiu continua com tudo | <meses, cliff, preço de recompra> | acordo | CC art. 1.055, § 2º e art. 122 |
| Preferência na venda de quota | vende a estranho se não houver oposição de 1/4 do capital | <prazo e preço da preferência> | **sim** | CC art. 1.057 |
| Tag along e drag along | nada | <o que vale pra cada um> | acordo | prática de mercado |
| Deadlock buy-or-sell | paralisia, e sobra a dissolução judicial | <quem nomeia o preço, quem escolhe o lado> | acordo | prática de mercado |
| Não concorrência e não aliciamento | nada depois da saída | <prazo, raio e o que é aliciar> | acordo | CC art. 122 |
| Quórum reforçado | maioria do capital decide tudo | <matérias que exigem mais> | **sim** | CC art. 1.076; Lei 14.451/2022 |

Essas dez linhas são o mínimo: nenhuma sai da tabela em branco. Cláusula que os sócios não
quiseram entra com "decidiram não ter", que é diferente de esquecer. O catálogo completo,
com as opcionais (aceleração, lock-up, seguro de vida entre sócios, arbitragem, execução
específica), está no molde.

## O que ficou em divergência
| Cláusula | O que <sócio A> quer | O que <sócio B> quer | Por que não fechou |
|---|---|---|---|

## Vesting
[a tabela por data gerada pelo script, intacta, colunas e títulos como saíram]
Preço de recompra da parte não adquirida: <...>
Good leaver e bad leaver: <o que muda no preço>

## Haveres: o exemplo numérico
[as tabelas do script, intactas: haveres, padrão da lei, parcelas em dia útil]

A empresa aguenta? Sobra hoje R$ ..., parcela de R$ ..., resta R$ ... (<X>% comprometido).

## Perguntas pro advogado
1. [uma por cláusula que ficou aberta, já formulada]

## O que não deu pra confirmar
[cada [a confirmar], com quem responde e onde]
```

A coluna "vai no contrato social?" é a mais útil da página, e a regra que a preenche é uma
só: pacto separado contrário ao contrato social é ineficaz contra terceiro (CC art. 997,
parágrafo único). Sucessão, apuração de haveres, prazo de pagamento, preferência, quórum
reforçado e exclusão por justa causa precisam valer contra herdeiro, comprador e Junta, e
por isso vão no contrato. Vesting, buy-or-sell, tag e drag along, lock-up e não concorrência
podem ficar no acordo, que é confidencial.

### Passo 8 — Conferir e entregar

Três comandos antes de mostrar, com o resultado colado na conversa:

```bash
node scripts/verificar.js tabela juridico/acordo-de-socios.md
node scripts/verificar.js datas juridico/acordo-de-socios.md
node scripts/verificar.js texto juridico/acordo-de-socios.md
```

O `tabela` confere três somas de verdade: a coluna de participações contra o total 100%, as
quotas em reais contra o capital, e as parcelas dos haveres contra o total. As outras colunas
que o script gera trazem `%` no próprio título de propósito, porque cronograma e percentual
acumulado não se somam. Não reescrever esses títulos pra "ficar mais bonito": some o título,
volta um erro inventado no lugar dos três que importam.

A entrega é curta: quantas decisões fecharam, quantas ficaram em divergência, o número dos
haveres no cenário simulado, se a empresa aguenta a parcela, e a frase de que isso é
rascunho pra advogado. Oferecer uma vez colocar em `tarefas.md` a linha de marcar a reunião
com o advogado, com a folha anexada.

Se o usuário pedir o texto do acordo pronto pra assinar, a resposta é não, com o motivo em
uma linha: cláusula de sociedade mal redigida é pior que cláusula nenhuma, porque cria a
impressão de que está resolvido. O que a skill pode fazer é detalhar mais uma cláusula na
folha, pra que o advogado gaste a hora dele redigindo em vez de entrevistando.

---

## Regras

- **Rascunho pra advogado, sempre.** O arquivo leva o rótulo na primeira linha e a skill repete na entrega, uma vez. Não redigir cláusula, não escrever "as partes acordam", não gerar documento com linha de assinatura. Acordo de sócios errado quebra sociedade com a mesma eficiência que acordo nenhum
- **Começar pelos cenários ruins, na ordem.** Morte primeiro, porque é o único sem culpado; depois saída, parada de trabalho, empate e venda. Quem começa perguntando "quanto cada um vai ter" recebe a resposta fácil e nunca chega nas outras
- **Nunca decidir pelos sócios.** A skill pergunta, mostra o padrão da lei e registra. Se eles discordam, a divergência vai pra tabela própria com as duas posições. Escolher um lado é trocar a folha de decisões por uma opinião
- **Nenhum número de cabeça.** Participação, vesting por data, haveres, parcela em dia útil: tudo sai do `scripts/socios.js`, e as tabelas dele entram no arquivo intactas. Se o `verificar.js` divergir, gerar de novo em vez de corrigir na mão
- **A skill não avalia empresa.** Valor de referência vem do usuário, de laudo ou de múltiplo montado com o lucro do `/caixa`, com o fator visível no arquivo. Sem base, entra `[a confirmar: pedir avaliação]` e a conta roda como exemplo marcado
- **Artigo de lei entra com fonte e data.** O molde tem URL do Planalto e data de conferência em cada bloco. Se a conversa puxar dispositivo que não está lá, conferir por WebSearch no texto oficial antes de escrever, ou deixar `[a confirmar]`. Lei societária muda pouco, e o quórum mudou em 2022
- **Quota não se paga com trabalho na limitada** (CC art. 1.055, § 2º). Vesting entra como quota no papel com opção de recompra, nunca como capital a integralizar com serviço. E condição que depende só da vontade de um sócio é potestativa e não vale (CC art. 122)
- **O quórum de hoje é maioria do capital.** A Lei 14.451/2022 derrubou os três quartos. Em 51/49, o majoritário altera o contrato social sozinho: quem quer proteção de minoritário escreve quórum maior no contrato, e a skill avisa isso quando a divisão for desequilibrada
- **Não substitui advogado nem contador.** Redação, registro na Junta, escolha entre limitada e S.A., holding, doação de quota e ganho de capital são deles. Pró-labore x distribuição tem lado contábil: a folha registra a decisão, e o contador confirma o valor e o recolhimento
- **LGPD e dado sensível.** CPF, RG, estado civil, endereço, valor de patrimônio e nome de herdeiro ficam em `juridico/` e `_memoria/`, nunca em WebSearch, em prompt de ferramenta externa nem em exemplo de comando. A busca pergunta "quórum de alteração de contrato social", jamais com o nome da empresa. Saúde de sócio, motivo de saída e conflito familiar entram no arquivo só se o usuário quiser, e a conta funciona sem eles
- **Conflito aberto não é trabalho desta skill.** Se um sócio já foi excluído, já entrou na justiça ou está tirando dinheiro do caixa, a skill para de fazer folha de decisões e diz que a hora é de advogado agora, não de entrevista
- **Fronteira com as vizinhas:** o `/contrato` é o combinado com o **cliente**, não entre sócios; o `/decidir` faz as perguntas de reversibilidade quando entrar ou sair de sociedade é a decisão em si, e não conhece as cláusulas; o `/caixa` dá o quanto sobra por mês e o lucro que vira múltiplo; o `/pro-labore` calcula o valor da retirada de cada mês, com Fator R e imposto, e esta skill só registra a regra de divisão que os sócios combinaram; o `/custo-de-funcionario` separa o custo de quem tem carteira do pró-labore de sócio; o `/emprestimo` entra quando a empresa vai financiar a compra da parte de quem sai; o `/obrigacoes` cuida do calendário fiscal. Esta skill é a sociedade entre as pessoas, nada além
- **Quando a conta for ruim, dizer a conta.** A empresa não aguenta pagar os haveres do cenário de morte, a divisão 50/50 não tem desempate, o sócio ausente tem metade do voto: escrever isso com o número e o próximo passo, sem suavizar
