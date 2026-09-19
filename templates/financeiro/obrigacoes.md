# Obrigações do pequeno negócio — referência por enquadramento

Referência do `/obrigacoes`. O `/caixa` consulta a seção de valores quando precisa do
imposto do mês, e o `/preco` olha a alíquota antes de fechar o piso de um orçamento.

Por que existe: o dono de negócio pequeno paga imposto sem saber qual, atrasa
declaração porque ninguém avisou, e descobre que estourou o teto do MEI em fevereiro do
ano seguinte, quando a Receita já desenquadrou. Este arquivo é a tabela do que cada
enquadramento deve, com data e fonte de cada valor. **Tudo aqui muda todo ano.** Valor
sem a linha "conferido em" não vale; valor com data velha vale só como pista.

> **Não é aconselhamento contábil nem jurídico.** É referência pra perguntar certo ao
> contador. Reenquadramento, parcelamento de dívida, atividade fora da lista do MEI e
> qualquer coisa com multa retroativa: contador antes de agir.

---

## Os quatro enquadramentos, em uma linha cada

| Enquadramento | Quem é | Como paga imposto | Precisa de contador? |
|---|---|---|---|
| **Não formalizado** | trabalha por conta própria sem CNPJ | carnê-leão mensal sobre o que recebe de pessoa física; nada sobre o que recebe de empresa, que já retém | não, mas paga o imposto mais alto dos quatro |
| **MEI** | faturamento até R$ 81.000/ano, no máximo 1 empregado, atividade na lista permitida | guia fixa mensal (DAS-MEI), independente do faturamento | não; o portal faz tudo |
| **ME no Simples** | faturamento até R$ 360.000/ano (ME) ou R$ 4,8 milhões (EPP) | porcentagem da receita do mês, pela tabela do anexo | sim, por lei: o Simples exige escrituração |
| **Autônomo com CNPJ fora do Simples** | profissão regulamentada que não cabe no MEI e escolheu Lucro Presumido | IRPJ, CSLL, PIS, COFINS e ISS separados | sim, sempre |

A quarta linha existe pra o usuário saber que existe. O `/obrigacoes` cobre as três
primeiras; a quarta é conversa com contador desde o primeiro dia.

---

## MEI

| Obrigação | Periodicidade | Prazo | Valor ou base | Fonte | Conferido em |
|---|---|---|---|---|---|
| DAS-MEI | mensal | dia 20 do mês seguinte; cai em fim de semana ou feriado, vai pro dia útil seguinte | R$ 81,05 de INSS (5% de R$ 1.621, mínimo de 2026 pelo [Decreto 12.797/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm)) + R$ 1 de ICMS (comércio/indústria) e/ou R$ 5 de ISS (serviço): R$ 82,05, R$ 86,05 ou R$ 87,05. O DAS pago em 20/01 é a competência de dezembro e ainda sai pelo mínimo de 2025 (R$ 1.518): R$ 76,90, R$ 80,90 ou R$ 81,90; o primeiro com o valor novo venceu em 20/02/2026 | [Portal do Simples Nacional, 02/01/2026](https://www8.receita.fazenda.gov.br/simplesnacional/Noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3) | 19/09/2026 |
| DAS-MEI caminhoneiro | mensal | dia 20 | R$ 194,52 de INSS (12% do mínimo) + R$ 1 de ICMS e/ou R$ 5 de ISS conforme a carga: R$ 195,52 (carga intermunicipal), R$ 199,52 (carga municipal) ou R$ 200,52 (mudança, produto perigoso) | mesma notícia acima | 19/09/2026 |
| Relatório mensal de receitas brutas | mensal | até dia 20 do mês seguinte | sem valor; preencher, anexar as notas e guardar; não se envia a ninguém, mas a Receita pode pedir | [Portal do Empreendedor](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor) | 18/09/2026 |
| DASN-SIMEI (declaração anual) | anual | 31 de maio, pelo faturamento do ano anterior; obrigatória mesmo com faturamento zero; não é empurrada se cair no domingo (em 2026 caiu) | sem valor; atraso: 2% ao mês sobre o imposto declarado, limitado a 20%, mínimo R$ 50 | [Receita Federal, maio/2026](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/maio/microempreendedor-individual-mei-tem-ate-31-de-maio-para-entregar-declaracao-anual) | 19/09/2026 |
| NFS-e padrão nacional | por serviço | obrigatória desde 01/09/2023 pra serviço prestado a empresa; pra pessoa física, só se o cliente pedir | sem valor | [Portal da NFS-e](https://www.gov.br/nfse/pt-br/mei-prestadores-de-servico-de-todo-o-pais-estao-obrigados-a-emitir-nfs-e) | 18/09/2026 |
| Empregado (se tiver) | mensal | DAE gerada no eSocial, até o dia 20 do mês seguinte (empurra pra dia útil). O FGTS mensal do MEI continua na DAE; só a rescisão vai pelo FGTS Digital | 8% de FGTS + 3% de INSS patronal sobre o salário, mais o INSS descontado do próprio empregado (7,5% a 14%) | [Manual do FGTS Digital v1.50, MTE, 20/03/2026](https://www.gov.br/trabalho-e-emprego/pt-br/servicos/empregador/fgtsdigital/manual-e-documentacao-tecnica/manual-do-orientacao-do-fgts-digital-versao-1-50-20-03-2026.pdf) e [Portal do Empreendedor](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/empregado-do-mei/qual-o-custo-para-contratacao) | 19/09/2026 |
| 13º do empregado | anual, em duas parcelas | 1ª até 30/11, 2ª até 20/12; se cai em dia não útil, **antecipa** (é o contrário do imposto) | metade do salário em cada parcela; INSS e FGTS na segunda | [Portal do Empreendedor](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/empregado-do-mei/qual-o-custo-para-contratacao) | 19/09/2026 |
| IRPF da pessoa física | anual | 23/03 a 29/05 em 2026 | o lucro distribuído pelo MEI é isento até o limite legal; o pró-labore e outras rendas contam. Obrigado a declarar quem passou de R$ 35.584 de renda tributável em 2025 | [Receita Federal, 16/03/2026](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/marco/receita-comeca-a-receber-declaracoes-do-irpf-no-dia-23-de-marco-prazo-de-entrega-se-encerra-em-29-de-maio) e [Ministério da Fazenda, regras 2026](https://www.gov.br/fazenda/pt-br/assuntos/noticias/2026/marco/receita-federal-anuncia-regras-para-declaracao-do-imposto-de-renda-da-pessoa-fisica-2026) | 19/09/2026 |

### O teto e o que acontece ao estourar

| Situação | Consequência | Fonte |
|---|---|---|
| Faturou até R$ 81.000 no ano (ou R$ 6.750 por mês de atividade no ano de abertura) | nada muda | [gov.br/memp](https://www.gov.br/memp/pt-br/teto-do-mei), conferido em 19/09/2026 |
| Passou do teto em até 20% (até R$ 97.200) | paga um DAS complementar sobre o excedente e vira ME em janeiro do ano seguinte | mesma página |
| Passou de 20% (acima de R$ 97.200) | desenquadramento retroativo a janeiro (ou à abertura): imposto de ME sobre o ano inteiro, com multa e juros | mesma página |
| PLP 186/2026 em tramitação | proposta do governo (junho/2026): R$ 110 mil em 2027, R$ 140 mil em 2028 e dois empregados. Corre junto com o PLP 108/2021, já aprovado no Senado com R$ 130 mil. Enquanto nenhum virar lei, o teto é R$ 81.000 | [Planalto, junho/2026](https://www.gov.br/planalto/pt-br/acompanhe-o-planalto/noticias/2026/06/governo-amplia-limite-de-faturamento-do-mei-para-ate-r-140-mil-em-2028-e-autoriza-dois-empregados), conferido em 19/09/2026 |

Quem cruza os dados é a Receita: nota fiscal, maquininha, e-Financeira dos bancos e
marketplace. Faturar por fora não esconde nada; só transforma DAS complementar em
desenquadramento retroativo.

---

## ME no Simples Nacional

| Obrigação | Periodicidade | Prazo | Valor ou base | Fonte | Conferido em |
|---|---|---|---|---|---|
| PGDAS-D (declaração da receita do mês) | mensal | dia 20 do mês seguinte | sem valor; atraso desde 01/01/2026: multa no dia seguinte ao prazo, 2% ao mês, mínimo R$ 50 por mês, mesmo com receita zero (antes, a multa só nascia em abril do ano seguinte) | [Receita Federal, dez/2025](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2025/dezembro/receita-federal-orienta-contribuintes-sobre-a-entrega-do-pgdas-d-e-da-defis-antes-da-entrada-em-vigor-das-novas-regras-de-multa-por-atraso) e [Portal do Simples Nacional, 09/12/2025](https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=1e17613a-4a08-4ba0-9a7d-550e833f3e13) | 19/09/2026 |
| DAS (o pagamento) | mensal | dia 20, empurrado pro dia útil seguinte | alíquota efetiva × receita do mês (tabela abaixo) | mesma notícia | 19/09/2026 |
| DEFIS (declaração anual) | anual | 31 de março, pelos dados do ano anterior | sem valor; atraso: 2% ao mês, mínimo R$ 200; sem DEFIS o PGDAS-D de março não transmite | mesma notícia | 19/09/2026 |
| Opção pelo Simples | anual | último dia útil de janeiro; quem abre a empresa tem 30 dias do deferimento da inscrição | sem valor | [LC 123/2006, art. 16](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm) | 19/09/2026 |
| NFS-e padrão nacional | por serviço | obrigatória a partir de 01/11/2026 pra ME e EPP do Simples que prestam serviço (Resolução CGSN 191/2026, que adiou o 01/09 da Resolução 189) | sem valor | [Receita Federal, ago/2026](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/simples-nacional-nfs-e-nacional-sera-obrigatoria-para-me-e-epp-a-partir-de-1o-de-novembro-de-2026) | 19/09/2026 |
| Empregado: FGTS Digital e DCTFWeb | mensal, se tiver empregado | FGTS pela guia do FGTS Digital até o dia 20; INSS pelo DARF da DCTFWeb até o dia 20 (a DCTFWeb se entrega até o dia 15); eSocial fecha a folha antes disso | 8% de FGTS sobre o salário; INSS patronal de 20% só no Anexo IV (nos outros anexos a parte patronal já está dentro do DAS) | [Manual do FGTS Digital v1.50, MTE](https://www.gov.br/trabalho-e-emprego/pt-br/servicos/empregador/fgtsdigital/manual-e-documentacao-tecnica/manual-do-orientacao-do-fgts-digital-versao-1-50-20-03-2026.pdf); prazo da DCTFWeb [a confirmar com o contador: muda por instrução normativa] | 19/09/2026 |
| Pró-labore do sócio | mensal | junto com a folha | INSS de 11% sobre o pró-labore, retido; a empresa recolhe 20% patronal só no Anexo IV | [a confirmar com o contador] | [a confirmar] |

### Alíquota por anexo, primeiras duas faixas

A alíquota que se paga não é a da tabela. É a **efetiva**:

```
alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12
RBT12 = receita bruta dos últimos 12 meses
```

| Anexo | Quem | Até R$ 180 mil (12 meses) | R$ 180.000,01 a R$ 360 mil | Deduzir na 2ª faixa |
|---|---|---|---|---|
| I | comércio | 4,00% | 7,30% | R$ 5.940 |
| II | indústria | 4,50% | 7,80% | R$ 5.940 |
| III | serviço em geral (manutenção, academia, agência, escritório, medicina se o Fator R permitir) | 6,00% | 11,20% | R$ 9.360 |
| IV | construção, limpeza, vigilância, advocacia | 4,50% | 9,00% | R$ 8.100 |
| V | serviço intelectual: TI, engenharia, publicidade, consultoria, medicina e outros quando o Fator R é menor que 28% | 15,50% | 18,00% | R$ 4.500 |

Fonte: [Lei Complementar 123/2006, Anexos I a V](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm),
na redação da LC 155/2016, que também fixou os tetos de R$ 360 mil (ME) e R$ 4,8 milhões
(EPP). Conferida em 19/09/2026. As faixas de 3 a 6 vão até R$ 4,8 milhões e estão na lei;
acima de R$ 3,6 milhões o ICMS e o ISS saem do DAS e vão pra guia própria (sublimite).

**Fator R**: folha de salário dos últimos 12 meses (com pró-labore e encargos) dividida
pela receita bruta dos últimos 12 meses. Deu 28% ou mais, a atividade de serviço que
seria Anexo V vai pro Anexo III. É a diferença entre 15,5% e 6% na primeira faixa, e o
motivo de muito profissional liberal se pagar um pró-labore maior. Conta de contador,
mas a pergunta é do dono.

---

## Pessoa física: autônomo com carnê-leão e quem ainda não formalizou

| Obrigação | Periodicidade | Prazo | Valor ou base | Fonte | Conferido em |
|---|---|---|---|---|---|
| Carnê-leão (DARF código 0190) | mensal | último dia útil do mês seguinte ao recebimento | tabela progressiva mensal abaixo, sobre o que recebeu de pessoa física ou do exterior; o que veio de empresa já foi retido na fonte | [Carnê-leão, Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao) e [Tabelas IRPF 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026) | 19/09/2026 |
| GPS (INSS contribuinte individual, código 1007 ou 1163) | mensal | dia 15 do mês seguinte, empurrado pra dia útil; a de janeiro (competência dezembro) ainda usa o mínimo do ano anterior | 20% do que declarar entre R$ 1.621 e R$ 8.475,55 (plano completo), ou 11% do mínimo = R$ 178,31 (plano simplificado, sem aposentadoria por tempo de contribuição) | [Portaria Interministerial MPS/MF 13, 09/01/2026](https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf) | 19/09/2026 |
| IRPF (ajuste anual) | anual | 23/03 a 29/05 em 2026 | obrigado quem teve renda tributável acima de R$ 35.584 em 2025, ou bens acima de R$ 800 mil, ou ganho de capital; atraso: mínimo R$ 165,74 | [Receita Federal, 16/03/2026](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/marco/receita-comeca-a-receber-declaracoes-do-irpf-no-dia-23-de-marco-prazo-de-entrega-se-encerra-em-29-de-maio) | 19/09/2026 |
| ISS de autônomo | anual ou mensal, conforme o município | [a confirmar na prefeitura] | valor fixo anual em muitas cidades pra profissional inscrito no cadastro municipal | prefeitura | [a confirmar] |
| Livro-caixa | contínuo | escriturar no próprio programa do carnê-leão | permite deduzir despesa do trabalho (aluguel de sala, material, contador) antes do imposto | [Deduções do carnê-leão, Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao/deducoes) | 19/09/2026 |

### Tabela progressiva mensal (vigente em 2026)

| Base de cálculo mensal | Alíquota | Parcela a deduzir |
|---|---|---|
| até R$ 2.428,80 | isento | R$ 0 |
| R$ 2.428,81 a R$ 2.826,65 | 7,5% | R$ 182,16 |
| R$ 2.826,66 a R$ 3.751,05 | 15% | R$ 394,16 |
| R$ 3.751,06 a R$ 4.664,68 | 22,5% | R$ 675,49 |
| acima de R$ 4.664,68 | 27,5% | R$ 908,73 |

Dedução por dependente: R$ 189,59 por mês. Base legal: Lei 15.191/2025. Fonte e data:
[Receita Federal, tabelas 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026), conferido em 19/09/2026.

Por cima disso, a Lei 15.270/2025 criou um **redutor** a partir de janeiro de 2026: quem
tem renda tributável de até R$ 5.000 por mês não paga; entre R$ 5.000,01 e R$ 7.350 a
redução diminui até zerar (redutor = 978,62 − 0,133145 × renda bruta mensal, limitado ao
imposto apurado); acima de R$ 7.350 vale só a tabela. Fonte: Receita Federal, orientação
de 11/12/2025, via [LegisWeb](https://www.legisweb.com.br/noticia/?id=31995), conferido
em 19/09/2026. Rendimento de aluguel e ganho de capital não entram no redutor
[a confirmar no ato de uso].

---

## Sinais de que o enquadramento está errado

| Sinal | O que provavelmente está acontecendo | Primeira pergunta ao contador |
|---|---|---|
| MEI faturando mais de R$ 6.750 por mês há três meses seguidos | vai estourar o teto; o excesso acima de 20% desenquadra desde janeiro | "se eu virar ME agora, quanto pago a mais por mês, e quanto pago se esperar a Receita me tirar?" |
| MEI que precisa de segunda pessoa | MEI só pode ter um empregado; o segundo já é desenquadramento | "ME no Anexo III com dois funcionários fecha a conta?" |
| Atividade que não está na lista do MEI (médico, advogado, engenheiro, psicólogo, dentista, contador, arquiteto) | formalização errada; o CNAE errado é fraude quando descoberto | "qual anexo do Simples é o meu, e o Fator R me ajuda?" |
| Autônomo pessoa física pagando 27,5% de carnê-leão | acima de uns R$ 6.000 por mês, uma ME no Anexo III costuma pagar menos, mesmo com contador | "quanto eu pago como PF e quanto pagaria como PJ, com o custo do contador na conta?" |
| Cliente grande pede nota e você não emite | serviço prestado a empresa sem nota é receita que a Receita vai ver na e-Financeira do outro lado | "como eu regularizo os últimos meses?" |
| ME no Anexo V com folha baixa | perto de 28% de Fator R, subir o pró-labore pode cortar a alíquota pela metade | "a que pró-labore eu cruzo os 28%, e o que isso custa de INSS?" |
| Dois DAS atrasados ou mais | dívida ativa vem rápido e trava a certidão negativa; sem certidão não entra em licitação nem financia | "parcela em quantas vezes e quanto de multa já acumulou?" |
| Sócio fazendo retirada sem pró-labore | distribuição de lucro acima do que a contabilidade sustenta vira renda tributável na pessoa física | "qual pró-labore mínimo cobre a fiscalização?" |

---

## Glossário sem jargão

- **DAS** — a guia única do Simples e do MEI. Um boleto que junta os impostos federais, o ICMS e o ISS
- **DAS-MEI** — o DAS de valor fixo do microempreendedor; não depende do faturamento
- **DASN-SIMEI** — declaração anual do MEI: informa o faturamento do ano anterior
- **PGDAS-D** — o programa onde a ME informa a receita do mês; é ele que gera o DAS
- **DEFIS** — declaração anual da ME no Simples, com dados sociais e fiscais
- **Carnê-leão** — imposto de renda que a pessoa física paga mês a mês sobre o que recebe de outra pessoa física ou do exterior
- **DARF** — guia de pagamento de tributo federal; a do carnê-leão tem o código 0190
- **GPS** — guia da previdência; é como o autônomo sem CNPJ paga o INSS dele
- **DAE** — documento de arrecadação do eSocial; a guia do empregado do MEI e do empregado doméstico
- **RBT12** — receita bruta dos últimos 12 meses; é ela que decide a faixa do Simples
- **Fator R** — folha ÷ receita, ambos de 12 meses; 28% é a linha que separa o Anexo III do V
- **Anexo** — cada uma das cinco tabelas do Simples; a atividade (CNAE) decide qual vale
- **CNAE** — código da atividade econômica; errado, muda o imposto e pode anular o enquadramento
- **Desenquadramento** — sair do MEI (por escolha ou por estourar o teto) e virar ME
- **Pró-labore** — o salário do sócio, com INSS; não é retirada de lucro
- **Certidão negativa** — comprovante de que não deve nada ao fisco; exigida em licitação, crédito e alguns contratos grandes
- **e-Financeira** — informação que bancos e maquininhas mandam à Receita sobre o que passou na conta do CNPJ e do CPF

---

## Como este arquivo é mantido

- Toda linha tem **fonte com link e "conferido em"**. Sem os dois, é rumor
- Valor que depende do salário mínimo (DAS-MEI, GPS, empregado do MEI) muda em janeiro; a Receita publica no portal do Simples na primeira semana do ano. A guia paga em janeiro ainda é do ano velho: a competência é dezembro
- Prazo de declaração (DASN, DEFIS, IRPF) é fixado por instrução normativa e pode mudar; conferir em fevereiro, quando a Receita publica as regras do IRPF
- Tabela do Simples só muda por lei complementar; o teto do MEI está em discussão no PLP 186/2026 e no PLP 108/2021
- Empurrão de data tem três regras: imposto vai pro dia útil seguinte; declaração fica no dia do calendário; obrigação trabalhista (13º, salário) antecipa pro dia útil anterior
- O que não coube confirmar entra como **[a confirmar]** e o `/obrigacoes` manda o usuário conferir na hora, por WebSearch ou com o contador
