---
name: obrigacoes
description: >
  Monta o calendário fiscal do negócio conforme o enquadramento (MEI, ME no Simples, autônomo
  com carnê-leão ou quem ainda não formalizou): o que pagar, em que dia, quanto, as declarações
  do ano, o teto de faturamento e o que acontece ao estourar, quando compensa virar ME, o que
  precisa de contador e os sinais de que o enquadramento está errado. Toda data é calculada por
  comando e todo valor sai com fonte oficial e data de conferência.
  Use quando o usuário disser "quando vence o DAS", "quanto é o MEI esse ano", "estourei o
  limite do MEI", "preciso virar ME?", "que impostos eu pago", "tem declaração pra entregar",
  "quando é a declaração do MEI", "preciso de contador?", "sou autônomo, como pago imposto",
  "calendário de impostos", ou /obrigacoes.
---

# /obrigacoes — O calendário fiscal do negócio

> **Convenção de pastas:** a saída vai em `financeiro/obrigacoes.md`, e as datas entram em `tarefas.md`. Na convenção **por cliente**, o calendário do próprio negócio fica na raiz (`financeiro/`); obrigação de cliente não entra aqui. A pasta nasce no primeiro calendário.

O dono de negócio pequeno paga o DAS quando lembra, descobre a declaração anual pela multa
e fica sabendo que estourou o teto do MEI quando a Receita já desenquadrou. Nenhuma dessas
três coisas é difícil. São só datas e um limite. O problema é que ninguém entrega isso
numa página só, com o valor certo do ano e o dia da semana em que cai.

> **Isto não é aconselhamento contábil nem jurídico.** A skill monta o calendário e aponta
> os sinais. Reenquadramento, parcelamento de dívida, CNAE, pró-labore e qualquer coisa
> com multa retroativa passam por contador antes de virar ação. A skill diz isso ao usuário
> na entrega, uma vez, sem sermão.

## Dependências

- **Contexto:** `_memoria/empresa.md` — CNPJ ou não, atividade, se tem empregado, se tem contador, cidade
- **Faturamento:** os fechamentos do `/caixa` em `financeiro/fechamento-<AAAA-MM>.md`, se existirem. É de lá que sai a projeção do teto
- **Referência:** `templates/financeiro/obrigacoes.md` — tabela por enquadramento com prazo, valor, fonte e data de conferência; glossário; sinais de reenquadramento
- **Script:** `scripts/obrigacoes.js` — gera a tabela do ano com feriado nacional e data empurrada pra dia útil
- **Conferência:** `node scripts/verificar.js datas` e `tabela`
- **Saída:** `financeiro/obrigacoes.md` (o calendário do ano vigente) e as datas em `tarefas.md`

---

## Workflow

### Passo 1 — Descobrir o enquadramento

Se `_memoria/empresa.md` já diz, não perguntar de novo. Se não diz, uma pergunta por vez,
na ordem, parando quando o enquadramento fechar:

1. "Você tem CNPJ?" Não: é **não formalizado**, pular pra pergunta 5
2. "É MEI ou ME?" Se ele não sabe: "o boleto mensal é sempre o mesmo valor, perto de R$ 80?" Sim é MEI
3. Se MEI: "você presta serviço, vende produto, ou os dois?" Isso muda o valor do DAS
4. Se ME: "está no Simples?" e "qual anexo o contador te disse?" Se não sabe o anexo, anotar `[a confirmar com o contador]` e seguir pelo tipo de atividade
5. "Tem alguém trabalhando pra você com carteira assinada?"
6. "Quanto entrou nos últimos 12 meses, mais ou menos?" Se existe `/caixa` fechado, somar de lá por comando em vez de perguntar

O que ele responder vai pra `_memoria/empresa.md`, com a pergunta do CLAUDE.md sobre
atualizar a memória. Enquadramento é dado que muda pouco e pesa em toda conversa de dinheiro.

### Passo 2 — Reconferir os valores do ano

Nada aqui é copiado do molde sem conferir. O molde carrega a última data de conferência, mas
data velha vale só como pista: **antes de entregar, rodar WebSearch nos valores que vão entrar
no arquivo do usuário**, só nos do enquadramento dele. São três ou quatro buscas curtas, com
o termo genérico ("valor do DAS-MEI 2026", "prazo DASN-SIMEI 2026"), nunca com dado do negócio:

| O que conferir | Onde (fonte oficial) | Quando muda |
|---|---|---|
| Salário mínimo e DAS-MEI | portal do Simples Nacional (www8.receita.fazenda.gov.br/simplesnacional), notícia da primeira semana de janeiro | janeiro; a guia de 20/01 ainda é do ano velho |
| Teto do MEI | gov.br/memp/pt-br/teto-do-mei | quando o Congresso aprova (PLP 186/2026 e PLP 108/2021 em tramitação) |
| Prazo da DASN-SIMEI | gov.br/receitafederal, notícias de abril e maio | pode mudar por instrução normativa |
| Prazo da DEFIS e multa do PGDAS-D | portal do Simples Nacional | pode mudar |
| Prazo do IRPF e quem é obrigado | gov.br/receitafederal, notícias de fevereiro e março | todo ano; em 2026 foi 23/03 a 29/05, obrigado acima de R$ 35.584 |
| Tabela progressiva mensal | gov.br/receitafederal, "Meu Imposto de Renda", tabelas | por lei, quase todo ano desde 2023 |
| Teto do INSS | Portaria Interministerial MPS/MF de janeiro (gov.br/previdencia) | janeiro |
| Teto do Simples e tabela dos anexos | LC 123/2006 no planalto.gov.br | só por lei complementar |

Blog de contabilidade serve pra achar a notícia, não como fonte: a URL que vai pro arquivo é
a do gov.br, da Receita, do Planalto ou do portal do Simples. O que a busca confirmar entra
com a URL e a data de hoje. O que não confirmar entra como `[a confirmar]`, e o texto diz
onde o usuário confere. Se a busca mostrar que o molde ficou velho, avisar: "o valor de X
mudou pra Y, vou usar o novo; o molde está com a data antiga".

Se o ano do calendário não está no `scripts/obrigacoes.js` (constantes `SALARIO_MINIMO` e
`PRAZOS_ANUAIS`), o script já avisa e deixa esses valores como `[a confirmar]`. Aí a conferência
por WebSearch é obrigatória, não opcional.

### Passo 3 — Gerar o calendário por comando

Data de imposto não se escreve na mão. O dia 20 cai no domingo, o 20 de novembro é feriado
desde 2024, e o Carnaval muda de mês. O script calcula tudo isso:

```bash
# MEI que presta serviço e vende produto, com um empregado
node scripts/obrigacoes.js 2026 mei --atividade ambos --empregado --saida financeiro/obrigacoes.md

# ME no Simples
node scripts/obrigacoes.js 2026 simples --saida financeiro/obrigacoes.md

# autônomo pessoa física (carnê-leão + GPS), ou quem não formalizou
node scripts/obrigacoes.js 2026 autonomo --saida financeiro/obrigacoes.md
node scripts/obrigacoes.js 2026 informal --saida financeiro/obrigacoes.md
```

Se a cidade tem feriado que fecha banco e o usuário paga ISS na prefeitura, acrescentar
`--feriado DD/MM` pra cada um. Feriado municipal não move o DAS, que é federal, mas move
guia da prefeitura.

O script aplica três regras de data, e vale saber quais, porque o usuário pergunta: imposto
(DAS, DARF, GPS, DAE) que cai em dia não útil vai pro dia útil **seguinte**; declaração
(DASN, DEFIS, IRPF) fica no dia do calendário, mesmo domingo; obrigação trabalhista (13º)
**antecipa** pro dia útil anterior. E a guia de 20/01 é a competência de dezembro, então sai
com o salário mínimo do ano anterior; o primeiro DAS com o valor novo é o de 20/02.

O script escreve o arquivo inteiro: título, a tabela e a lista de feriados considerados. O
assistente então edita esse mesmo arquivo: troca o título pelo nome do negócio, escreve as
seções do Passo 6 antes e depois da tabela, e **não altera nenhuma linha da tabela**. Depois:

```bash
node scripts/verificar.js datas financeiro/obrigacoes.md
```

Precisa terminar em "Tudo certo." Se acusar dia errado, o problema é edição manual na
tabela; gerar de novo em vez de corrigir na mão.

### Passo 4 — Calcular quanto

Cada enquadramento tem uma conta, e todas rodam por comando.

**MEI**: o valor já sai do script, quebrado (INSS + ISS e/ou ICMS). Duas contas extras. O
total do ano, que não é 12 vezes o valor novo, porque a guia de janeiro é do ano velho:

```bash
# MEI de serviços em 2026: 11 guias de R$ 86,05 + a de janeiro (competência dez/2025) de R$ 80,90
node -e 'const jan=80.90, resto=86.05; console.log("11×",resto,"=",(11*resto).toFixed(2),"| + janeiro",jan,"| total do ano:",(11*resto+jan).toFixed(2))'
```

E a projeção do teto, com os fechamentos do `/caixa` ou com o que ele disser mês a mês:

```bash
# faturamento dos meses já fechados do ano → total e projeção pra 12 meses
node -e 'const f=[6100,5800,7200,6900]; const s=f.reduce((a,b)=>a+b,0); console.log("acumulado:",s.toFixed(2),"| projeção 12 meses:",(s/f.length*12).toFixed(2),"| teto: 81000 | 20% acima: 97200")'
```

Se o `/caixa` tem fechamentos em `financeiro/fechamento-<AAAA-MM>.md`, a lista `f` sai da
linha "Entrou" de cada um, por grep, não de memória.

**ME no Simples**: a alíquota que ele paga é a efetiva, não a da tabela. Com a RBT12 (receita
dos últimos 12 meses) e o anexo, calcular:

```bash
# RBT12, alíquota nominal e parcela a deduzir da faixa (templates/financeiro/obrigacoes.md)
node -e 'const r=240000,a=0.112,d=9360; const e=(r*a-d)/r; console.log("alíquota efetiva:",(e*100).toFixed(2)+"%","| DAS sobre R$ 20.000 do mês:",(20000*e).toFixed(2))'
```

Se a atividade é de serviço e pode cair no Anexo III ou V, calcular o Fator R junto: folha
dos 12 meses ÷ receita dos 12 meses. Abaixo de 28% é Anexo V; mostrar as duas alíquotas
lado a lado, porque a diferença costuma ser o maior número da página.

**Autônomo e não formalizado**: carnê-leão pela tabela progressiva mensal, com o redutor
da Lei 15.270/2025 pra renda até R$ 7.350. Rodar com a tabela do molde (a base desconta
dependente, a GPS paga no mês e o livro-caixa; o exemplo usa só o dependente):

```bash
node -e '
const renda=6000, dep=0;
const base=renda-dep*189.59;
const fx=[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]];
const [,al,ded]=fx.find(([lim])=>base<=lim);
let imp=Math.max(0,base*al-ded);
const red=renda<=5000?imp:renda<=7350?Math.min(imp,Math.max(0,978.62-0.133145*renda)):0;
console.log("imposto pela tabela:",imp.toFixed(2),"| redutor:",red.toFixed(2),"| carnê-leão do mês:",(imp-red).toFixed(2))'
```

Mais a GPS: 11% do mínimo no plano simplificado ou 20% do valor declarado no completo. E o
livro-caixa: despesa do trabalho (sala, material, contador) abate a base antes do imposto,
e é a dedução que autônomo mais deixa na mesa.

Toda conta vai pro arquivo com o dado de entrada visível ("RBT12 de R$ 240.000, Anexo III,
2ª faixa"), pra que o contador confira em dez segundos.

### Passo 5 — Limites, reenquadramento e contador

Três perguntas que o arquivo responde com número, nunca com "depende":

**Está perto do teto?** Comparar a projeção com R$ 81.000 e com R$ 97.200. Abaixo do teto:
nada. Entre os dois: DAS complementar e vira ME em janeiro; o custo é o DAS a mais sobre
o excedente. Acima de 20%: desenquadramento retroativo a janeiro, com imposto de ME sobre
o ano inteiro, mais multa e juros. Se a projeção passa de R$ 97.200, a recomendação é pedir
o desenquadramento **agora** com o contador, porque a Receita vai fazer isso de qualquer
jeito e a conta dela vem com multa.

**Compensa virar ME?** Colocar lado a lado o que ele paga hoje e o que pagaria como ME no
anexo provável, sobre a mesma receita, somando o custo do contador (que a ME exige por lei):

| | Hoje | Como ME (Anexo [X]) |
|---|---|---|
| Imposto no ano | R$ ... | R$ ... |
| Contador no ano | R$ 0 | R$ ... [a confirmar: pedir orçamento] |
| Total | R$ ... | R$ ... |

Somar por comando e conferir com `node scripts/verificar.js tabela`. A decisão é do usuário
com o contador; a skill entrega a conta. Se for uma decisão grande (contratar pra cruzar o
Fator R, mudar de PF pra PJ), o `/decidir` faz as perguntas que faltam.

**Precisa de contador?** MEI não precisa; o portal resolve tudo, e a skill mostra onde.
ME no Simples precisa por lei. Autônomo com carnê-leão não precisa, mas quem tem livro-caixa
com muita despesa ou mais de uma fonte de renda costuma recuperar o honorário na dedução.
Dizer qual é o caso dele, e o que ele ganha ou perde com cada escolha.

Os **sinais de enquadramento errado** estão na tabela do molde. Ler a tabela contra o que se
sabe do negócio e trazer só os sinais que se aplicam, cada um com a pergunta pronta pro contador.

### Passo 6 — Escrever o calendário

```markdown
# Obrigações <ano> — <nome do negócio>

> Enquadramento: <MEI serviços | ME Simples Anexo III | autônomo PF | não formalizado>
> Valores conferidos em <AAAA-MM-DD>. Muda todo ano: reconferir em janeiro e antes de pagar.
> Não é aconselhamento contábil. O que tem consequência passa pelo contador.

## O ano em uma frase
[quanto vai pagar no ano, o que precisa entregar, e o risco que existe (teto, anexo, atraso)]

## Calendário
[a tabela gerada pelo scripts/obrigacoes.js, intacta: Data | Dia | Obrigação | O que é | Valor ou base | Fonte]

## Quanto
| Item | Valor |
|---|---|
| DAS-MEI de janeiro (competência dez/2025: 5% do mínimo de 2025 + ISS) | R$ 80,90 |
| DAS-MEI de fevereiro a dezembro (11 guias: 5% do mínimo de 2026 + ISS) | R$ 946,55 |
| Total pago no ano | R$ 1.027,45 |

Conta: 11× R$ 86,05 = R$ 946,55; mais R$ 80,90 de janeiro dá R$ 1.027,45.
Fonte: portal do Simples Nacional, notícia de 02/01/2026 (URL), conferido em <AAAA-MM-DD>.
[pra ME: RBT12, anexo, faixa, alíquota efetiva e o DAS sobre a receita média do mês; pra autônomo: carnê-leão e GPS do mês, com o redutor mostrado]

## Limites
- Teto: R$ 81.000 | acumulado até <mês>: R$ ... | projeção 12 meses: R$ ... | folga ou excesso: R$ ...
- [o que acontece no cenário dele, com número]

## Precisa de contador?
[sim/não, por quê, e o que muda]

## Sinais que se aplicam
| Sinal | O que fazer | Pergunta pro contador |
|---|---|---|

## Feriados considerados
[a lista do script]

## O que não deu pra confirmar
[cada [a confirmar], com onde conferir]
```

A tabela "Quanto" soma, e o formato acima é o que o `verificar.js tabela` sabe conferir: uma
coluna "Valor" com um número por linha e a linha "Total", mais a multiplicação em prosa no
padrão `11× R$ 86,05 = R$ 946,55`. Célula com dois valores ("11 × R$ 86,05 | R$ 946,55")
passa em branco ou acusa soma errada. Rodar `node scripts/verificar.js tabela financeiro/obrigacoes.md`
e refazer a conta a partir do dado bruto se divergir; nunca ajustar o total pra bater.

### Passo 7 — Levar as datas pra `tarefas.md`

Calendário que fica só na pasta `financeiro/` não avisa ninguém. O `/abrir` lê `tarefas.md`
todo começo de sessão, então é lá que as datas viram lembrete. Seguir o formato do `/tarefas`,
que tem duas regras que pesam aqui: no máximo 5 itens em "Agora", e item que vem de outra
skill leva a origem:

- **Agora (essa semana)**: só o que vence nos próximos 7 dias, um item por obrigação, com data absoluta e dia da semana: `- [ ] Pagar DAS-MEI de setembro — vence 20/10/2026 (ter) (/obrigacoes)`
- **Depois**: o resto do ano, na ordem, um item por vencimento mensal e um por declaração: `- [ ] Entregar DASN-SIMEI (faturamento de 2026) — até 31/05/2027 (/obrigacoes)`
- Um item de controle por trimestre pra MEI que projeta mais de R$ 70.000: `- [ ] Conferir faturamento acumulado contra o teto do MEI — 30/09/2026 (/obrigacoes)`

Doze DAS em "Depois" é lista longa, e é o certo: o `/revisao-semanal` puxa pra "Agora" o que
vence na semana. Não duplicar: se o item já está lá, atualizar a data. Mostrar as linhas
adicionadas, e oferecer uma vez o `/revisao-semanal` como o lugar onde o "vence em 3 dias"
aparece sozinho.

### Passo 8 — Entregar

Antes de mostrar o arquivo, rodar os três comandos e colar o resultado na conversa:

```bash
node scripts/verificar.js datas financeiro/obrigacoes.md
node scripts/verificar.js tabela financeiro/obrigacoes.md
node scripts/verificar.js texto financeiro/obrigacoes.md
```

A entrega é curta: o ano em uma frase, os três próximos vencimentos com dia da semana, o
risco (se houver) com o número, e a frase de que isto não substitui o contador. O arquivo
inteiro fica em `financeiro/obrigacoes.md` pra ele abrir quando quiser.

---

## Regras

- **Nunca chutar valor, prazo ou alíquota.** O que não foi conferido por WebSearch nesta entrega entra como `[a confirmar]`, com o lugar onde conferir. Fonte é gov.br, Receita, Planalto ou portal do Simples, com URL e data; blog de contabilidade é atalho pra achar a notícia oficial, não fonte. Valor "de memória" de ano anterior é o erro mais caro desta skill: o DAS-MEI muda todo janeiro e o prazo do IRPF mudou em 2026
- **Toda data passou pelo comando.** O calendário nasce do `scripts/obrigacoes.js` e é conferido pelo `verificar.js datas`. Data editada na mão que quebrar a conferência é regenerada, não corrigida
- **Pagamento empurra pra dia útil; declaração não; trabalhista antecipa.** DAS, DARF, GPS e DAE que caem em sábado, domingo ou feriado vencem no dia útil seguinte. DASN, DEFIS e IRPF valem no dia do calendário, mesmo domingo, porque o portal recebe. 13º e salário que caem em dia não útil se pagam no dia útil anterior. O script sabe as três regras; quem edita na mão costuma saber só a primeira
- **Janeiro paga com o valor do ano velho.** A guia de 20/01 é a competência de dezembro: DAS-MEI e GPS de janeiro saem pelo salário mínimo anterior. Total do ano é 11 guias novas mais uma velha, nunca 12 vezes o valor novo
- **Não é consultoria contábil nem jurídica.** Dizer isso na entrega, uma vez. Reenquadramento, CNAE, pró-labore, parcelamento, dívida ativa e desenquadramento retroativo são decisão com contador; a skill entrega a conta e a pergunta pronta, não a decisão
- **Não confundir os enquadramentos.** MEI paga fixo; ME paga porcentagem; autônomo PF paga carnê-leão sobre o que vem de pessoa física. Cada um tem calendário próprio e a skill só monta o do enquadramento confirmado no Passo 1
- **Fronteira com as vizinhas:** o `/caixa` fecha o mês (o que entrou, o que sobrou) e é de lá que vem o faturamento pra projetar o teto; o `/contrato` é o combinado com o cliente; o `/preco` usa a alíquota daqui pra fechar o piso do orçamento; o `/decidir` entra quando virar ME ou contratar é decisão grande; o `/tarefas` guarda as datas. Esta skill é o calendário e o enquadramento, nada além
- **Perto do teto é aviso, não pânico.** Mostrar os dois números (R$ 81.000 e R$ 97.200), onde ele está, e o que cada faixa custa. Faturar por fora não é opção que a skill discute: a Receita cruza nota, maquininha e e-Financeira
- **Dado fiscal não sai do workspace.** CNPJ, CPF, faturamento, folha e nome de empregado ficam em `_memoria/` e `financeiro/`. Não vão pra WebSearch, pra prompt de ferramenta externa nem pra exemplo de comando. A busca pergunta "valor do DAS-MEI 2026", nunca "DAS-MEI do CNPJ tal"
- **LGPD:** dado de empregado (salário, CPF) só entra no arquivo se o usuário quiser; a conta de encargo funciona com o salário sem o nome
- **Quando o resultado for ruim, dizer o resultado.** Estourou o teto, tem DAS atrasado, o anexo está errado há dois anos: escrever isso com o número e o próximo passo, sem suavizar
- **O molde envelhece.** Se a conferência mostrar valor diferente do que está em `templates/financeiro/obrigacoes.md`, usar o novo no arquivo de saída com a data de hoje, e avisar o usuário que o molde precisa de atualização (o `/atualizar-sistema` traz a versão nova quando ela sai)
