# Custo de funcionário — o que uma pessoa custa de verdade, por regime

Referência do `/custo-de-funcionario`. O `/caixa` e o `/projecao` leem daqui o custo
de contratação em vez de escrever "[a confirmar com o contador]" no lugar do encargo; o
`/preco` usa o custo da hora pra fechar o piso de um orçamento com equipe.

Por que existe: o dono pergunta "quanto custa contratar alguém a 3 mil?" e recebe três
respostas diferentes. O contador diz "uns 70% em cima". A calculadora do site diz 1,4
vezes. O assistente de IA soma 20% de INSS patronal numa empresa do Simples, que não
paga. Nenhum dos três mostra a conta. Este arquivo é a tabela de cada rubrica, com a lei
que a cria, o que muda por regime de quem contrata, e os erros que aparecem toda vez que
essa conta é feita de cabeça.

> **Não é aconselhamento contábil nem jurídico.** Convenção coletiva, piso, benefício
> obrigatório, RAT do CNAE e enquadramento sindical mudam a conta. O que sai daqui é o
> número pra levar ao contador e à decisão; a folha em si é dele.

---

## A conta, em uma linha

```
custo mensal = salário
             + provisões (13º, férias, 1/3 de férias)
             + encargos sobre salário e provisões (FGTS; INSS patronal, RAT e terceiros só onde cabe)
             + provisão de rescisão (aviso prévio indenizado e multa de 40% do FGTS)
             + benefícios (vale-transporte líquido dos 6%, refeição, saúde)
```

O ano é doze vezes o mês, porque 13º, férias e rescisão já estão diluídos. Quem soma
"12 salários + 13º + férias" por fora está contando duas vezes.

A base dos encargos **não é o salário**: FGTS e INSS incidem também sobre 13º e sobre
férias com o terço. Numa pessoa de R$ 3.000 a base é R$ 3.583,33, quase 20% acima do
salário. Aplicar os encargos só sobre o salário perde R$ 46,67 por mês no Simples e
R$ 203,00 no Lucro Presumido, e é o erro mais comum das calculadoras de site.

---

## Rubrica por rubrica

| Rubrica | Quanto | Sobre o quê | Quem paga | Fonte | Conferido em |
|---|---|---|---|---|---|
| FGTS | 8% | salário, 13º, férias + 1/3, aviso indenizado | todo empregador, inclusive MEI e Simples | [Lei 8.036/1990, art. 15](https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm) | 22/09/2026 |
| 13º salário | 1/12 por mês (8,33%) | salário de dezembro | todo empregador | [Lei 4.090/1962, art. 1º](https://www.planalto.gov.br/ccivil_03/leis/l4090.htm) | 22/09/2026 |
| Férias | 1/12 por mês (8,33%) | salário | todo empregador | CLT, art. 129 e 130 | 22/09/2026 |
| 1/3 de férias | 1/36 por mês (2,78%) | salário | todo empregador | CF/88, art. 7º, XVII | 22/09/2026 |
| INSS patronal | 20% | salário, 13º, férias + 1/3 | Lucro Presumido, Lucro Real e Simples no Anexo IV | [Lei 8.212/1991, art. 22, I](https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm) | 22/09/2026 |
| INSS patronal do MEI | 3% | salário de contribuição do único empregado | MEI | [LC 123/2006, art. 18-C, §1º, III](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm) | 22/09/2026 |
| RAT (risco de acidente) | 1%, 2% ou 3% × FAP (0,5 a 2) | mesma base do INSS patronal | quem paga INSS patronal por fora | Lei 8.212/1991, art. 22, II; [Lei 10.666/2003, art. 10](https://www.planalto.gov.br/ccivil_03/leis/2003/l10.666.htm) | 22/09/2026 |
| Terceiros (Sistema S, salário-educação, INCRA) | 5,8% no comércio e serviços (FPAS 515); varia por atividade | mesma base | só Presumido e Real; o Simples é dispensado, inclusive no Anexo IV | [PGFN, contribuições a terceiros](https://www.gov.br/pgfn/pt-br/cidadania-tributaria/por-assunto/tributacao-sobre-a-folhas-de-salarios-e-outras/contribuicoes-devidas-a-terceiros); LC 123, art. 13, §3º | 22/09/2026 |
| Multa do FGTS | 40% do saldo depositado | todo o FGTS do contrato | quem demite sem justa causa | [Lei 8.036/1990, art. 18, §1º](https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm) | 22/09/2026 |
| Aviso prévio | 30 dias + 3 por ano de casa, até 90 | salário | quem demite sem justa causa e dispensa o cumprimento | Lei 12.506/2011 | 22/09/2026 |
| Vale-transporte | custo das passagens menos 6% do salário básico | deslocamento casa-trabalho | todo empregador, quando o empregado usa transporte público | [Lei 7.418/1985, art. 4º, parágrafo único](https://www.planalto.gov.br/ccivil_03/leis/l7418.htm) | 22/09/2026 |
| Vale-refeição ou alimentação | o que a convenção mandar ou o dono decidir | sem encargo quando não é pago em dinheiro (CLT, art. 457, §2º) | opcional, salvo convenção | CLT, art. 457 | 22/09/2026 |

Desconto do empregado (não é custo da empresa, mas define quanto cai na conta dele):
INSS progressivo de 7,5% a 14% pela [Portaria Interministerial MPS/MF 13/2026](https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf)
(faixas até R$ 1.621,00; R$ 2.902,84; R$ 4.354,27; R$ 8.475,55) e IRRF pela
[tabela 2026 da Receita](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026),
com o desconto simplificado de R$ 607,20 e o redutor da Lei 15.270/2025 (zera o imposto
até R$ 5.000 de renda mensal). Conferido em 22/09/2026. Salário mínimo de 2026:
R$ 1.621,00 ([Decreto 12.797/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm)).

---

## O que muda pelo regime de quem contrata

É esta tabela que o chat erra. O encargo depende de **quem contrata**, não do contratado.

| Regime do contratante | FGTS | INSS patronal | RAT | Terceiros | Encargo sobre a base | Fonte |
|---|---|---|---|---|---|---|
| MEI | 8% | 3% | não | não | 11% | LC 123, art. 18-C |
| Simples, Anexos I, II, III e V | 8% | dentro do DAS | não | não | 8% | LC 123, art. 13, VI e §3º |
| Simples, Anexo IV (construção, limpeza, vigilância, advocacia) | 8% | 20% | 1% a 3% × FAP | não | 29% a 31% | LC 123, art. 18, §5º-C |
| Lucro Presumido ou Real | 8% | 20% | 1% a 3% × FAP | 5,8% | 34,8% a 36,8% | Lei 8.212, art. 22 |

Sobre a mesma pessoa de R$ 3.000, sem benefício e com RAT 1 e FAP 1, o custo mensal é de
R$ 4.151,47 no Simples (Anexo III) e de R$ 5.111,80 no Lucro Presumido. Os R$ 960,33 de
diferença são o INSS patronal, o RAT e os terceiros, que o Simples não recolhe por fora.
No Simples, contratar sai mais barato do que o dono imagina.

Três regras que as calculadoras comerciais tratam como detalhe:

- **MEI só pode ter um empregado**, com salário mínimo ou piso da categoria (LC 123, art. 18-C). O segundo empregado desenquadra; a conta dele é a de ME no Simples, e o `/obrigacoes` cuida do resto. Na falta legal do único empregado (licença, afastamento), pode contratar um substituto por prazo determinado (art. 18-C, §2º). Os 3% e os 8% não vão no DAS: saem no DAE que o eSocial gera depois do evento de folha, e o prazo está no `/obrigacoes`
- **Simples não paga INSS patronal por fora**, exceto no Anexo IV (art. 13, VI). Quem soma 20% numa empresa do Anexo III infla o custo em R$ 716,67 por mês numa pessoa de R$ 3.000, e passa de mil reais a partir de R$ 4.200 de salário
- **Simples não paga terceiros em nenhum anexo** (art. 13, §3º). Nem no IV

### Fator R: a folha que reduz o imposto

Serviço no Anexo V paga 15,5% na primeira faixa; no Anexo III, 6%. O que separa os dois
é a razão folha ÷ receita dos últimos 12 meses: 28% ou mais, cai no III (LC 123, art. 18,
§5º-J e §5º-K). Folha inclui salário, pró-labore, 13º, férias e encargos. Contratar em CLT
pode cruzar a linha, e aí o DAS cai mais do que a folha custa. O script calcula o Fator R
novo com `--folha12` e `--receita12`; a decisão é com o contador, com esse número na mão.

---

## Provisão de rescisão: o cenário que custa

Quem pede demissão não gera multa nem aviso indenizado. Quem é demitido sem justa causa
gera os dois. A provisão é o cenário caro, e é ela que entra na conta, porque ninguém
contrata planejando o pedido de demissão.

O script assume saída depois de 24 meses (`--permanencia`): aviso de 36 dias diluído em
24 meses, com FGTS em cima, mais 40% de todo o FGTS depositado. Em R$ 3.000, dá R$ 281,47
por mês. Quem quer a conta sem isso usa `--sem-rescisao` e sabe que está olhando o custo
de quem fica.

---

## CLT, PJ e MEI: comparar o que a pessoa leva, não o que a empresa paga

"PJ sai mais barato" costuma comparar R$ 3.000 de salário com R$ 3.000 de nota. Não é a
mesma coisa: na CLT a pessoa leva ainda 13º, férias com terço e FGTS; na nota, ela mesma
tem que guardar isso e ainda paga o imposto do CNPJ dela.

O jeito honesto de comparar é fixar o que a pessoa fica no ano e perguntar quanto cada
formato custa pra entregar aquilo:

1. **Quanto a pessoa leva na CLT no ano**: 12 líquidos, mais 13º líquido, mais o terço de férias, mais o FGTS depositado (é dela, só que trancado)
2. **Nota PJ equivalente**: o valor que, tirando o imposto do prestador (6% no Anexo III, 1ª faixa), o INSS do pró-labore (11% do mínimo) e o contador dele, deixa o mesmo dinheiro por mês
3. **Nota MEI equivalente**: o mesmo, tirando só o DAS fixo (R$ 86,05 em serviços). Só vale até R$ 6.750 por mês (R$ 81.000 no ano) e se a atividade está na lista do MEI

Numa pessoa de R$ 3.000 no Simples, a CLT custa R$ 4.151,47; a nota PJ que deixa a pessoa
com o mesmo dinheiro sai por R$ 3.743,62; a MEI, por R$ 3.426,74. A diferença existe, e é
bem menor do que "PJ custa o salário e pronto". Fora do Simples ela cresce, porque o INSS
patronal, o RAT e os terceiros desaparecem na nota. Os três valores saem de
`node scripts/custo-funcionario.js --salario 3000 --regime simples --anexo III`.

### O teste dos quatro sinais (pejotização)

A economia acima só vale se a relação for de prestador de verdade. A CLT define empregado
no art. 3º: pessoa física, serviço não eventual, sob dependência, mediante salário. O
art. 442-B (reforma de 2017) diz que autônomo contratado com as formalidades cumpridas,
com ou sem exclusividade, não é empregado. Entre os dois, a Justiça do Trabalho olha os
fatos, não o contrato. Os quatro sinais:

| Sinal | Pergunta | Se a resposta for sim |
|---|---|---|
| **Pessoalidade** | Tem que ser essa pessoa? Ela pode mandar outra no lugar dela? | se não pode, é sinal de emprego |
| **Subordinação** | Ela cumpre horário, recebe ordem de como fazer, pede autorização pra faltar? | sinal forte; é o que mais pesa |
| **Habitualidade** | Trabalha toda semana, no mesmo lugar, na rotina do negócio? | sinal de emprego |
| **Onerosidade** | Recebe valor fixo por mês, independente de entrega? | sinal de emprego (todo trabalho pago tem, mas o fixo mensal pesa) |

Três ou quatro "sim" e o PJ é empregado com outro nome. O risco não é multa abstrata: é
reclamação trabalhista com todos os encargos dos últimos cinco anos, mais multa, mais o
custo do processo. A conta do script mostra a economia; este teste diz se ela existe.

Prestador de verdade tem outros clientes, escolhe como e quando faz, entrega por
resultado, emite nota, e pode ser substituído por outro da equipe dele. Se o dono quer
alguém das 8h às 18h, na loja, todo dia, seguindo o procedimento dele, a resposta é CLT,
e o script diz quanto custa.

---

## Erros que aparecem toda vez

| Erro | O que acontece | O certo |
|---|---|---|
| Somar 20% de INSS patronal no Simples | custo inflado em ~R$ 1.000 por pessoa de R$ 3.000 | só Anexo IV e fora do Simples |
| FGTS e INSS só sobre o salário | base 16% menor que a real | incidem sobre 13º e férias + 1/3 |
| Ano = 12 salários + 13º + férias | conta a provisão duas vezes | ano = 12 × custo mensal com provisão |
| Vale-transporte inteiro como custo | esquece os 6% que o empregado paga | passagens − 6% do salário |
| "Multiplica por 1,8" pra qualquer empresa | é o Presumido com benefício; no Simples sem benefício dá 1,38 e no Presumido 1,70 | rodar o script com o regime certo |
| MEI com dois empregados na conta | o segundo desenquadra | um só; o segundo é conta de ME |
| Comparar salário CLT com valor de nota | ignora 13º, férias, FGTS e o imposto do prestador | nota equivalente pelo que a pessoa leva |
| Jornada parcial com salário cheio | custo da hora errado | salário proporcional; divisor = horas semanais × 5 |
| Salário abaixo do piso da jornada | o custo sai bonito e o contrato é ilegal | o mínimo é por hora (R$ 7,37 em 2026); em jornada parcial o piso é proporcional (CLT, art. 58-A) |

---

## Apêndice: descrição de vaga e roteiro de entrevista (curtos)

O `/custo-de-funcionario` entrega os dois como apêndice quando o usuário pede, e só
depois da conta. A descrição de vaga tem cinco linhas: o que a pessoa vai fazer nos
primeiros três meses (tarefas, não adjetivos), horário e local, o salário e o que vem
junto, o que precisa saber fazer no primeiro dia, e como se candidatar. Vaga sem salário
publicado recebe metade dos candidatos e o dobro de pergunta.

O roteiro de entrevista tem seis perguntas, todas sobre o passado, nunca sobre o
hipotético:

1. "Me conta um dia normal no último trabalho, do começo ao fim"
2. "Qual foi a última vez que um cliente reclamou com você? O que você fez?"
3. "O que você fazia quando não tinha ninguém pra perguntar?"
4. "Qual tarefa você faria de graça, e qual você evita?"
5. "Por que saiu do último lugar?" (e ouvir como fala de quem ficou)
6. "O que você precisa saber sobre a gente antes de aceitar?"

Anotar o que a pessoa fez, não o que ela disse que faria. Duas entrevistas por vaga já
mostram a diferença; cinco costuma ser o teto útil pra negócio pequeno.

---

## Glossário sem jargão

- **Provisão** — dinheiro separado todo mês pra uma despesa que cai de uma vez (13º, férias, rescisão)
- **Encargo** — o que a empresa paga por cima do salário: FGTS, INSS patronal, RAT, terceiros
- **RAT** — alíquota de risco de acidente (1%, 2% ou 3%) definida pelo CNAE; o FAP ajusta pelo histórico da empresa
- **FAP** — fator acidentário de prevenção, de 0,5 a 2, que multiplica o RAT; sai todo ano no portal da Previdência
- **Terceiros** — Sistema S, salário-educação e INCRA; só quem está fora do Simples paga
- **CPP** — contribuição patronal previdenciária, o INSS de 20% da empresa; no Simples está dentro do DAS
- **Fator R** — folha ÷ receita de 12 meses; 28% separa o Anexo V do III
- **Salário de contribuição** — a base sobre a qual o INSS incide: salário, 13º, férias com terço, aviso trabalhado
- **Divisor** — horas do mês pra achar o salário-hora: 220 pra 44h semanais, 200 pra 40h, 180 pra 36h
- **Pejotização** — contratar como PJ quem trabalha como empregado; o art. 3º da CLT decide, não o contrato

---

## Como este arquivo é mantido

- Toda alíquota tem **fonte com link e "conferido em"**. Sem os dois, é rumor
- Salário mínimo, tabela do INSS e do IRRF mudam em janeiro; a Portaria da Previdência sai na segunda semana do ano e a Receita publica a tabela do IRRF em seguida. O `scripts/custo-funcionario.js` guarda esses valores em `TABELAS` com a data; ano novo, atualizar os dois juntos
- Percentual de FGTS, INSS patronal, RAT e terceiros muda só por lei; o FAP muda por empresa, todo ano
- Teto e regras do MEI estão em discussão (PLP 186/2026 propõe dois empregados); enquanto não vira lei, vale um
- O que não coube confirmar (piso, convenção, RAT do CNAE) entra como **[a confirmar com o contador]** e o `/custo-de-funcionario` mostra a conta com e sem
