---
name: custo-de-funcionario
description: >
  Calcula quanto custa contratar uma pessoa, por mês e por ano, rubrica por rubrica (FGTS,
  13º, férias com terço, INSS patronal só onde cabe, RAT, provisão de rescisão, benefícios),
  conforme o regime de quem contrata (MEI, Simples por anexo, Presumido), e compara CLT, PJ e
  MEI pelo que a pessoa leva. Entrega o custo já no formato que o /projecao usa pra responder
  "posso contratar", mais o teste de pejotização e um apêndice curto de vaga e entrevista.
  Use quando o usuário disser "quanto custa contratar alguém", "quanto sai um funcionário de
  3 mil", "CLT ou PJ", "vale mais contratar como MEI", "quanto custa a hora de um
  funcionário", "quanto pago de encargo", "posso ter funcionário sendo MEI", "quero contratar
  meu primeiro funcionário", "quanto custa meio período", ou /custo-de-funcionario.
---

# /custo-de-funcionario — O que uma pessoa custa de verdade

> **Convenção de pastas:** a saída vai em `pessoas/`. Na convenção **por cliente**, a contratação do próprio negócio fica na raiz (`pessoas/`); conta feita pra um cliente vai em `clientes/<Nome>/pessoas/`. A pasta nasce na primeira contratação calculada.

"Quanto custa alguém a 3 mil?" tem resposta exata, e quase ninguém a recebe. O contador
diz "uns 70% em cima" sem olhar o regime; a calculadora do site multiplica por 1,8 pra
qualquer empresa; o chat soma 20% de INSS patronal numa empresa do Simples, que não paga
isso. Esse erro sozinho infla R$ 716,67 por mês numa pessoa de R$ 3.000, e com o número
errado o dono decide errado. Aqui a conta sai rubrica por rubrica, com a lei de cada uma,
e já no formato que o `/projecao` consome pra dizer se o caixa aguenta.

> **Isto não substitui contador nem advogado.** Convenção coletiva, piso, benefício
> obrigatório e RAT do CNAE mudam a conta. A skill entrega o número pra levar ao contador
> e a pergunta pronta; a folha e o contrato são dele. Dizer isso na entrega, uma vez.

## Dependências

- **Contexto:** `_memoria/empresa.md` — regime tributário (MEI, Simples e anexo, Presumido), se já tem empregado, atividade, cidade. Se não está lá, o Passo 1 pergunta e a resposta vai pra memória
- **O caixa:** `financeiro/fechamento-<AAAA-MM>.md` e `financeiro/custos-fixos.md` (do `/caixa`), quando existirem: é contra a sobra do mês que o custo se compara
- **Enquadramento e Fator R:** `financeiro/obrigacoes.md` (do `/obrigacoes`), quando existir, pra receita dos 12 meses e o anexo
- **Molde:** `templates/operacao/custo-de-funcionario.md` — tabela de rubrica com fonte e data, o que muda por regime, provisão de rescisão, comparação CLT × PJ × MEI, teste de pejotização, erros comuns, apêndice de vaga e entrevista
- **Alíquotas do ano:** `templates/financeiro/obrigacoes.md` — salário mínimo, DAS-MEI, tabela do IRRF, teto do INSS, todos com data de conferência
- **Script:** `scripts/custo-funcionario.js` — faz a conta, gera o markdown e o trecho de spec do `/projecao`. Carrega as alíquotas datadas em `TABELAS`
- **Conferência:** `node scripts/verificar.js tabela` e `texto`
- **Saída:** `pessoas/contratacao-<cargo>.md`, com o cargo em slug (`contratacao-atendente.md`, `contratacao-designer-meio-periodo.md`). Se já existe, a versão nova leva a data: `contratacao-atendente-<AAAA-MM-DD>.md`

---

## Workflow

### Passo 1 — Levantar o que entra na conta

Se `_memoria/empresa.md` já diz o regime, não perguntar de novo. O resto vem em uma
mensagem só, porque é levantamento:

> 1. "O que a pessoa vai fazer?" (uma frase; é o cargo e o título do arquivo)
> 2. "Quantas horas por semana?" (44 é jornada cheia; 20 ou 30 é meio período)
> 3. "Que salário você pretende pagar?" (bruto, por mês, pra essa jornada)
> 4. "Sua empresa é MEI, Simples ou Lucro Presumido? Se Simples, qual anexo o contador te disse?"
> 5. "Ela vai de transporte público? Quanto dá a passagem por mês?"
> 6. "Vai ter vale-refeição, plano de saúde ou outro benefício? Quanto?"

As outras aparecem só quando o caso pede:

- **MEI** — "você já tem alguém com carteira assinada?" Se sim, a conta muda de dono: MEI só pode ter um empregado, e o segundo é conta de ME no Simples (mandar pro `/obrigacoes` depois)
- **Simples, Anexo III ou V**, com `financeiro/obrigacoes.md` ou fechamento do `/caixa` na pasta: puxar a receita dos 12 meses de lá por grep, e perguntar só a folha atual ("quanto você paga hoje de salário e pró-labore por mês, somando tudo?"). É o Fator R, e ele pode virar a decisão
- **Presumido, Real ou Anexo IV** — "o contador te passou o RAT e o FAP da empresa?" O RAT é 1%, 2% ou 3% pelo CNAE, o FAP vai de 0,5 a 2 e multiplica o RAT. Sem o par, rodar com `--rat 1 --fap 1` e deixar `[a confirmar com o contador]` na linha: RAT 3 com FAP 2 dá 6% da base, seis vezes o RAT mínimo
- **Quando ele quer saber quanto a pessoa leva** — "ela tem filho menor de 21 anos ou outro dependente no imposto de renda?" Vai em `--dependentes`, muda o líquido do empregado e a nota equivalente, e não muda o custo da empresa

Se ele não sabe o anexo, o script recusa rodar sem ele, e está certo: entre o Anexo III e
o IV há 20% de INSS patronal mais o RAT, o que dá R$ 752,50 por mês numa pessoa de
R$ 3.000 e passa de mil a partir de R$ 4.000 de salário. Perguntar ao contador leva uma
mensagem. Chutar contamina o arquivo inteiro.

### Passo 2 — Reconferir as alíquotas do ano

O molde e o script carregam a data de conferência. Data velha vale como pista, não como
número. Antes de entregar, uma busca por valor que entra no arquivo, com termo genérico e
nunca com dado do negócio:

| O que conferir | Onde (fonte oficial) | Quando muda |
|---|---|---|
| Salário mínimo | decreto de dezembro no planalto.gov.br | janeiro |
| Tabela do INSS do empregado e teto | Portaria Interministerial MPS/MF de janeiro (gov.br/previdencia) | janeiro |
| Tabela do IRRF, desconto simplificado e redutor | gov.br/receitafederal, "Meu Imposto de Renda", tabelas | por lei, quase todo ano |
| Custo do empregado do MEI (3% + 8%) e limite de um empregado | LC 123, art. 18-C, no planalto; Portal do Empreendedor | só por lei complementar (PLP 186/2026 propõe dois) |
| FGTS 8%, INSS patronal 20%, RAT, multa de 40% | Lei 8.036, Lei 8.212, Lei 10.666 no planalto | só por lei |
| FAP da empresa (0,5 a 2) | portal do FAP, gov.br/previdencia, com o certificado da empresa | todo ano, por empresa |

Se a busca mostrar valor diferente do que está em `TABELAS` no `scripts/custo-funcionario.js`,
usar o novo, avisar o usuário ("o mínimo de 2027 é X; o script está com o de 2026") e
anotar no arquivo com a data de hoje. O `/atualizar-sistema` traz o script corrigido quando
sai versão nova; enquanto isso, a linha "Premissas e fontes" carrega a correção.

### Passo 3 — Rodar a conta por comando

Nada aqui é feito de cabeça. O script recebe o levantamento e devolve o arquivo inteiro:

```bash
# Simples, Anexo III, atendente de 44h a R$ 3.000, com passagem e vale-refeição
node scripts/custo-funcionario.js --salario 3000 --regime simples --anexo III --cargo "atendente" \
  --transporte 260 --refeicao 500 --md pessoas/contratacao-atendente.md

# MEI contratando o único empregado, no salário mínimo
node scripts/custo-funcionario.js --salario 1621 --regime mei --cargo "auxiliar" --transporte 200 \
  --md pessoas/contratacao-auxiliar.md

# Lucro Presumido, RAT 2, designer de 40h, com um valor de nota PJ já combinado pra comparar
node scripts/custo-funcionario.js --salario "4.500,00" --regime presumido --rat 2 --horas 40 \
  --pj-nota 5000 --pj-contador 250 --cargo "designer" --md pessoas/contratacao-designer.md

# Simples, Anexo V, com Fator R (folha atual e receita dos 12 meses)
node scripts/custo-funcionario.js --salario 6000 --regime simples --anexo V --cargo "dev" \
  --folha12 120000 --receita12 600000 --md pessoas/contratacao-dev.md
```

A lista inteira sai em `node scripts/custo-funcionario.js --ajuda`, e vale abrir quando
entrar plano de saúde (`--saude`), outro benefício fixo (`--outros`) ou permanência
diferente de 24 meses (`--permanencia`).

O que o script faz, e vale saber porque o usuário pergunta:

- **Base dos encargos** é salário + 13º + férias + 1/3, não o salário. FGTS e INSS incidem sobre tudo isso
- **INSS patronal** de 20% só no Presumido, no Real e no Anexo IV do Simples; RAT e FAP idem. Terceiros (5,8%) só fora do Simples. MEI paga 3% de patronal e 8% de FGTS, e nada mais
- **Provisão de rescisão** assume saída sem justa causa depois de 24 meses (`--permanencia`): aviso prévio indenizado diluído, com FGTS, mais 40% do FGTS depositado. É o cenário que custa; `--sem-rescisao` mostra o custo de quem fica
- **Vale-transporte** entra líquido dos 6% que o empregado paga
- **Custo da hora** divide pelo divisor da jornada (220 pra 44h, 200 pra 40h, 180 pra 36h)
- **Nota PJ e MEI equivalentes**: o valor que deixa a pessoa com o mesmo dinheiro que teria na CLT (líquidos do ano, 13º, terço, FGTS), descontado o imposto do prestador. Não é o salário com outro nome
- **Piso**: o mínimo é por hora, então jornada parcial tem piso proporcional (CLT, art. 58-A). Salário abaixo disso vira aviso com o piso da jornada calculado

Terminou, ele imprime o resumo e a linha `custoMensal` pronta pro `/projecao`. Erro para a
execução e a mensagem diz o que fazer: MEI com dois empregados, Simples sem anexo, jornada
acima de 44h, `--md` sem caminho. Nenhum deles se contorna com tabela feita na mão.

Aviso é outra coisa: não para nada, sai no terminal e na seção `## Avisos` do arquivo, e a
skill lê cada um em voz alta na entrega. Salário abaixo do piso da jornada, nota de MEI
acima do teto mensal, empregado de MEI com salário diferente do mínimo, Fator R que cruza
os 28%, Fator R pedido com dado pela metade: cada um muda a leitura do número. Aviso
escondido é pior que erro, porque o arquivo continua bonito.

### Passo 4 — Conferir a conta

```bash
node scripts/verificar.js tabela pessoas/contratacao-<cargo>.md
```

A tabela de rubricas fecha com a linha "Total por mês", e o verificador soma a coluna
"Valor" e compara. A multiplicação do ano (`12× R$ X = R$ Y`) também é conferida. Se
divergir, o problema está na entrada ou no script, nunca no total; refazer a partir do
dado bruto.

E um número por fora, escolhido a dedo, pra não confiar cego:

```bash
# FGTS de uma pessoa de R$ 3.000: 8% sobre salário + 13º + férias + 1/3
node -e 'const s=3000; const base=s+s/12+s/12+s/36; console.log("base:",base.toFixed(2),"| FGTS:",(base*0.08).toFixed(2))'
```

Se esse número não bate com a linha do FGTS no arquivo, parar e descobrir por quê.

### Passo 5 — Ler a comparação CLT × PJ × MEI e aplicar o teste dos quatro sinais

O arquivo já traz a tabela lado a lado. A leitura que a skill faz em voz alta é uma só:
**a diferença existe, e é menor do que o usuário imagina**, porque a pessoa como PJ tem
que guardar 13º, férias e FGTS por conta própria e ainda pagar o imposto do CNPJ dela.
Numa pessoa de R$ 3.000 no Simples, a economia do PJ é de 9,8% (R$ 4.151,47 contra
R$ 3.743,62). No Lucro Presumido ela vai a 26,8%, porque lá o INSS patronal, o RAT e os
terceiros somem na nota.

Antes de qualquer frase sobre "então contrata como PJ", perguntar os quatro sinais do
molde, um por vez, e anotar a resposta:

1. "Tem que ser essa pessoa, ou ela pode mandar outra no lugar?"
2. "Ela vai cumprir horário e receber ordem de como fazer?"
3. "Vai trabalhar toda semana, na rotina do negócio?"
4. "Vai receber valor fixo por mês, independente de entrega?"

Três ou quatro "sim": é empregado (CLT, art. 3º), e a coluna PJ do arquivo vira "não se
aplica", com o motivo escrito. A economia que o script mostrou não existe nesse caso: o
que existe é reclamação trabalhista com cinco anos de encargo. Dizer isso com o número,
sem sermão. Dois "sim" ou menos: prestador de verdade é possível, com contrato pelo
`/contrato`, entrega por resultado e outros clientes.

MEI como prestador tem duas travas a mais: a atividade precisa estar na lista do MEI, e a
nota não pode passar de R$ 6.750 por mês (R$ 81.000 no ano). Quando a nota equivalente
estoura esse teto, o aviso sai no terminal e no arquivo.

### Passo 6 — Escrever o arquivo

Quem escreve o arquivo é o script, com a seção de decisão já no lugar e os três campos
dela entre colchetes. O assistente edita esse mesmo arquivo: troca o título pelo cargo do
jeito que o usuário falou, preenche os colchetes da decisão, acrescenta o apêndice se foi
pedido, e **não altera nenhuma linha da tabela de rubricas**. A forma final:

```markdown
# Contratação — <cargo>

> Contratante: <regime>. Salário bruto de R$ X por Nh semanais. Alíquotas conferidas em <AAAA-MM-DD>.
> Não substitui contador nem advogado: convenção coletiva, piso e benefício obrigatório mudam a conta.

## Resumo
- Custo mensal em CLT, custo anual, custo da hora, o que cai na conta da pessoa

## Rubrica por rubrica (CLT)
[a tabela gerada pelo scripts/custo-funcionario.js, intacta: Item | Cálculo (% × base) | Valor, com Total por mês]

## CLT, PJ e MEI lado a lado
[a tabela gerada; abaixo dela, o resultado do teste dos quatro sinais e a coluna que não se aplica, se for o caso]

## Fator R depois da contratação (quando houver)

## Pra levar pro /projecao
[o JSON gerado, com custoMensal e descricao]

## Avisos
[só quando houver: piso, teto do MEI, Fator R. Vem do script, não se apaga]

## O que a conta permite decidir
1. [a decisão, com o número do /caixa que a sustenta: "sobra R$ 4.200/mês no último fechamento, o custo é R$ 4.731,47; não fecha sem subir a receita em R$ 600"]
2. [se não cabe: quanta receita nova o custo pede, ou que jornada e benefício mudam a conta]
3. [o que perguntar ao contador, em uma frase pronta]

## Apêndice: vaga e entrevista (quando pedido)

## Premissas e fontes
[gerado pelo script: permanência, base dos encargos, cada alíquota com lei, URL e data]

## O que não dá pra afirmar ainda
[cada [a confirmar], com onde conferir]
```

A seção "O que a conta permite decidir" é a única que exige o `/caixa`: sem fechamento,
ela diz isso e mostra quanto de receita nova o custo pede (custo mensal ÷ margem de
contribuição, se a margem é conhecida). Com fechamento, a frase compara a sobra do mês
com o custo, e o `/projecao` faz o resto nos três cenários.

### Passo 7 — Levar o custo pro `/projecao` e pro `/caixa`

O motivo de esta skill existir é fechar um buraco: o `/projecao` e o `/caixa` escrevem
"[a confirmar com o contador]" no lugar do encargo. Agora o número existe.

- Se já há `financeiro/projecao-<AAAA-MM>.projecao.json`, o assistente copia o bloco
  `perguntas.contratar` do arquivo pra dentro da spec e roda de novo:
  `node scripts/projecao.js financeiro/projecao-<AAAA-MM>.projecao.json --md financeiro/projecao-<AAAA-MM>.md`
- Se não há projeção, oferecer uma vez: "quer ver se o caixa aguenta nos próximos seis meses?" e seguir o `/projecao` com o custo já preenchido
- Se o usuário decidir contratar, o custo mensal vira linha em `financeiro/custos-fixos.md` (`Salário com encargos: <cargo>`), e o `/caixa` passa a somar

Mostrar as linhas que mudaram nos outros arquivos, e nada além.

### Passo 8 — Apêndice: vaga e entrevista (só quando pedido)

Se o usuário pedir ("como eu anuncio a vaga?", "o que eu pergunto na entrevista?"), o
apêndice sai curto e depois da conta, no formato do molde: descrição de vaga em cinco
linhas com salário publicado, e as seis perguntas sobre o passado. Não é skill de RH: sem
teste de perfil, sem dinâmica, sem "cultura". Quem quer o processo de integração depois
que a pessoa entrou usa o `/procedimento`, que é onde as tarefas viram folha.

### Passo 9 — Entregar

Antes de mostrar, rodar os dois comandos e colar o resultado:

```bash
node scripts/verificar.js tabela pessoas/contratacao-<cargo>.md
awk '/^## O que a conta permite decidir/,/^## Premissas/' pessoas/contratacao-<cargo>.md > /tmp/contratacao-decisao.md
node scripts/verificar.js texto /tmp/contratacao-decisao.md
```

Só a seção escrita à mão passa pelo medidor de prosa; o resto é tabela gerada. A entrega
tem cinco linhas: o custo mensal e o anual em CLT, o custo da hora, a nota PJ ou MEI
equivalente com o resultado do teste dos quatro sinais, o que a conta permite decidir
com o número do `/caixa`, e a frase de que isto não substitui o contador. O arquivo
inteiro fica em `pessoas/` pra ele abrir quando quiser.

Depois, a pergunta do CLAUDE.md sobre atualizar a memória: regime, anexo e "já tem um
empregado" são dados que pesam em toda conversa de dinheiro e vão pra `_memoria/empresa.md`.

---

## Regras

- **Toda conta roda por comando.** A tabela nasce do `scripts/custo-funcionario.js` e passa pelo `verificar.js tabela`. Número de cabeça não entra no arquivo nem no chat, e linha da tabela editada na mão que quebrar a conferência é regenerada, não corrigida
- **O regime é o de quem contrata.** MEI paga 11% (3% de INSS + 8% de FGTS) e só pode ter um empregado; Simples fora do Anexo IV não paga INSS patronal por fora nem terceiros; Presumido e Real pagam 20% + RAT + 5,8%. Sem o regime, o script não roda, e a skill não chuta
- **A base dos encargos inclui 13º e férias.** FGTS e INSS incidem sobre salário, 13º e férias com o terço. Calculadora que aplica só sobre o salário erra pra baixo, e o arquivo diz a base usada em cada linha
- **O ano é doze vezes o mês.** As provisões já estão diluídas; somar 13º e férias de novo é contar duas vezes
- **Nunca chutar alíquota, piso ou prazo.** O que não foi conferido nesta entrega entra como `[a confirmar]`, com o lugar onde conferir. Fonte é Planalto, Receita, Previdência ou Portal do Empreendedor, com URL e data; calculadora comercial e blog de contabilidade servem pra achar a notícia, não como fonte
- **Comparar pelo que a pessoa leva, nunca salário com nota.** A coluna PJ do arquivo é a nota que deixa a pessoa com o mesmo dinheiro da CLT, com o imposto do prestador descontado. "PJ custa o salário e pronto" é o erro que a skill existe pra desfazer
- **Economia de PJ só existe se o teste dos quatro sinais permitir.** Pessoalidade, subordinação, habitualidade e onerosidade (CLT, art. 3º). Três ou mais: é empregado, a coluna PJ vira "não se aplica", e a skill diz o risco com o número. A skill nunca sugere PJ pra quem vai cumprir horário e receber ordem
- **MEI como prestador tem teto e lista.** Nota acima de R$ 6.750 por mês não cabe; atividade fora da lista do MEI não cabe. O script avisa; a skill não esconde o aviso
- **Salário abaixo do piso não vira número limpo.** O mínimo legal é por hora (R$ 7,37 em 2026, ou R$ 1.621,00 por 44h semanais pelo Decreto 12.797/2025), e jornada parcial tem piso proporcional (CLT, art. 58-A). O script avisa quando o salário informado fica abaixo; a entrega repete o aviso com o piso da jornada e deixa o piso da categoria como `[a confirmar na convenção coletiva]`. Custo calculado sobre salário ilegal não serve pra decidir nada
- **Provisão de rescisão é premissa escrita.** Saída sem justa causa depois de N meses, com N no arquivo. Quem quer o custo sem ela usa `--sem-rescisao` e sabe o que está olhando
- **Não é consultoria contábil nem jurídica.** Convenção coletiva, piso, benefício obrigatório, RAT do CNAE, contrato de PJ e qualquer coisa com processo trabalhista passam por contador ou advogado antes de virar ação. A skill entrega a conta e a pergunta pronta, e diz isso na entrega, uma vez
- **Fronteira com as vizinhas:** o `/caixa` diz quanto sobra no mês, e é contra isso que o custo se compara; o `/projecao` responde "posso contratar" em três cenários, com o `custoMensal` daqui; o `/obrigacoes` cuida do enquadramento, do DAS e do que muda quando o MEI vira ME; o `/pro-labore` é o salário do sócio, não do empregado; o `/pessoa` guarda a ficha de quem já está na equipe; o `/contrato` formaliza o prestador quando o teste permite; o `/procedimento` cuida do que a pessoa vai seguir depois de contratada; o `/decidir` conduz a decisão quando a conta não basta. Esta skill é o custo e a comparação, nada além
- **Dado de gente não sai daqui.** Salário, CPF, nome de candidato e folha atual ficam em `pessoas/` e `_memoria/`. Não vão pra WebSearch nem pra prompt de ferramenta externa; a busca pergunta "tabela INSS 2026", nunca "salário do fulano"
- **LGPD:** o arquivo nomeia o cargo, não a pessoa. Nome e CPF de candidato ou empregado só entram se o usuário escrever, e aí ficam só nesse arquivo; a conta funciona com o salário sem o nome
- **Quando a conta não fecha, dizer que não fecha.** "Sobra R$ 2.100 e a pessoa custa R$ 4.731" é a primeira linha da entrega, com o que precisaria mudar (receita, jornada, benefício) e por quanto. Suavizar aqui é empurrar o dono pra uma folha que ele não paga em março
- **O molde e o script envelhecem.** Salário mínimo, INSS e IRRF mudam em janeiro. Se a conferência do Passo 2 mostrar valor novo, usar o novo no arquivo com a data de hoje e avisar que o script precisa de atualização; o `/atualizar-sistema` traz a versão corrigida
