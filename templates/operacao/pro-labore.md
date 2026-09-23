# Pró-labore e retirada — a conta que decide quanto o dono tira

Referência do `/pro-labore`. No `/caixa` a retirada é número de entrada, e é aqui que esse
número nasce. A mesma folha aparece no `/custo-de-funcionario`, pelo lado do empregado. Já
o `/obrigacoes` monta o calendário fiscal e manda o pró-labore pra cá de propósito.

Por que existe: "quanto eu tiro pra mim" é a pergunta que todo dono de CNPJ faz e quase
ninguém responde com número. O contador diz "tire o mínimo"; o colega de grupo diz "tire o
máximo, é o Fator R". Num escritório de serviço com R$ 40 mil de faturamento por mês a
diferença entre as duas respostas passa de R$ 30 mil por ano.

> **Não é aconselhamento contábil nem jurídico.** CNAE, atividade, convenção coletiva,
> contrato social e histórico de escrituração mudam o resultado. O que sai daqui é a
> simulação que se leva ao contador, com a conta aberta pra ele conferir em dois minutos.

---

## As duas portas por onde o dinheiro sai da empresa

| Porta | O que é | O que ela cobra | Conta como folha? |
|---|---|---|---|
| **Pró-labore** | remuneração do sócio pelo trabalho dele | INSS de 11% retido, mais IRRF pela tabela progressiva mensal | sim, integralmente |
| **Distribuição de lucro** | devolução do resultado ao dono do capital | nada, dentro do limite da presunção | não |

O dinheiro é o mesmo e o bolso de chegada é o mesmo. Muda o preço do caminho, e muda uma
consequência que quase ninguém liga à retirada: numa empresa de serviço, é a folha que
decide a alíquota do Simples.

Pró-labore não tem FGTS, não tem 13º e não tem férias. Cada real dele entra inteiro na
conta da folha, o que faz dele a alavanca mais eficiente do Fator R. Um real de salário de
empregado entra com os encargos por cima; um de pró-labore entra sozinho, e custa 11% mais
o IRRF.

Base legal: é contribuinte individual "o sócio gerente e o sócio cotista que recebam
remuneração decorrente de seu trabalho" (Lei 8.212/1991, art. 12, V, "f"), e o salário de
contribuição dele é a remuneração auferida no mês (art. 28, III). A parte patronal de 20%
está dentro do DAS em todos os anexos do Simples, menos o IV (LC 123/2006, art. 13, VI e
art. 18, §5º-C). Conferido em 23/09/2026.

---

## Fator R, a mecânica

```
Fator R = folha dos últimos 12 meses ÷ receita bruta dos últimos 12 meses
```

Deu 28% ou mais, a atividade de serviço que seria tributada pelo Anexo V passa pro Anexo III,
e na primeira faixa isso é 6% em vez de 15,5% (LC 123/2006, art. 18, §5º-J; abaixo dos 28% é
o §5º-M). O §24 define folha: remuneração paga a pessoa física pelo trabalho nos 12 meses
anteriores, com as retiradas de pró-labore dentro, mais a patronal previdenciária
efetivamente recolhida e o FGTS. Conferido em 23/09/2026.

Três coisas que essa definição implica, e que a conta de cabeça erra:

- **A janela é móvel.** O §5º-K manda olhar os montantes pagos e auferidos nos doze meses
  anteriores ao período de apuração, então o enquadramento é recalculado a cada mês. Subir o
  pró-labore em março não muda a alíquota de abril: a folha nova entra um doze avos por mês
- **A patronal dentro do DAS não soma.** Fora do Anexo IV a empresa não recolhe os 20% por
  fora, então não há 20% pra acrescentar. Quem soma isso infla o Fator R e se surpreende
- **Aluguel pago ao sócio não é folha.** Nem lucro distribuído, nem pagamento a prestador
  PJ. Só remuneração de pessoa física pelo trabalho

---

## Anexo III e Anexo V, as seis faixas

| RBT12 | Anexo III nominal | Deduzir | Anexo V nominal | Deduzir |
|---|---|---|---|---|
| até R$ 180.000 | 6,00% | R$ 0 | 15,50% | R$ 0 |
| R$ 180.000,01 a R$ 360.000 | 11,20% | R$ 9.360 | 18,00% | R$ 4.500 |
| R$ 360.000,01 a R$ 720.000 | 13,50% | R$ 17.640 | 19,50% | R$ 9.900 |
| R$ 720.000,01 a R$ 1.800.000 | 16,00% | R$ 35.640 | 20,50% | R$ 17.100 |
| R$ 1.800.000,01 a R$ 3.600.000 | 21,00% | R$ 125.640 | 23,00% | R$ 62.100 |
| R$ 3.600.000,01 a R$ 4.800.000 | 33,00% | R$ 648.000 | 30,50% | R$ 540.000 |

```
alíquota efetiva = (RBT12 × nominal − parcela a deduzir) ÷ RBT12
```

Fonte: [LC 123/2006, Anexos III e V](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm),
na redação da LC 155/2016, e a
[partilha publicada pela Receita](https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=48432).
Conferido em 22/09/2026.

Repare na sexta faixa. A nominal do Anexo III é maior (33% contra 30,5%), mas a parcela a
deduzir também (R$ 648.000 contra R$ 540.000), e as duas curvas só empatam onde uma
diferença anula a outra: (648.000 − 540.000) ÷ (0,33 − 0,305) = **R$ 4.320.000** de RBT12.
Nesse ponto as duas efetivas dão 18,00%. Acima dele o Anexo V fica mais barato, e quem se
esforçou pra cruzar os 28% passa a pagar mais. Abaixo, mesmo dentro da sexta faixa, o Anexo
III continua valendo a pena. É raro em negócio pequeno, e só aparece quando a conta roda.

---

## O que o pró-labore cobra

**INSS: 11% sobre o pró-labore**, com piso e teto. O 11% não está escrito em lugar nenhum
como alíquota: ele é os 20% do contribuinte individual (Lei 8.212/1991, art. 21) menos a
dedução de 45% da contribuição patronal, limitada a 9% do salário de contribuição (art. 30,
§4º). Quem retém e recolhe é a empresa (Lei 10.666/2003, art. 4º). O piso do salário de
contribuição é o salário mínimo (art. 28, §3º): R$ 1.621,00, pelo
[Decreto 12.797/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm).
O teto é R$ 8.475,55, pela
[Portaria Interministerial MPS/MF 13, de 09/01/2026](https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf).
Acima do teto a contribuição para de crescer, e trava em R$ 932,31. Conferido em 23/09/2026.

**IRRF: tabela progressiva mensal**, a mesma do salário. Base é o pró-labore menos o INSS
retido e os dependentes, ou menos o desconto simplificado de R$ 607,20 quando ele for maior.
Por cima disso vale o redutor da Lei 15.270/2025: até R$ 5.000 de rendimento tributável
mensal o imposto zera; de R$ 5.000,01 a R$ 7.350 o redutor diminui até desaparecer
(978,62 − 0,133145 × rendimento bruto, limitado ao imposto apurado). A tabela completa está
no `scripts/custo-funcionario.js`, de onde o `scripts/pro-labore.js` a lê. Fonte:
[Receita Federal, tabelas 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026).
Conferido em 22/09/2026.

O efeito do redutor é grande aqui: pró-labore de até R$ 5.000 custa só os 11% de INSS. A
partir daí o IRRF entra, e é ele que come a economia de DAS.

---

## Distribuição de lucro: o limite sem escrituração

A ME e a EPP do Simples distribuem lucro isento de imposto de renda, e a isenção tem teto
quando não há escrituração contábil: o percentual de presunção do Lucro Presumido sobre a
receita bruta do período, **menos** o valor devido no Simples no mesmo período (LC 123/2006,
art. 14, §1º). Com escrituração que evidencie lucro maior, esse teto não se aplica e a
isenção acompanha o lucro contábil (art. 14, §2º).

| Presunção | Para quem | Base legal |
|---|---|---|
| 8% | comércio, indústria, atividade imobiliária, transporte de carga | Lei 9.249/1995, art. 15, caput |
| 16% | transporte, exceto o de carga | Lei 9.249/1995, art. 15, §1º, II, "a" |
| 16% | serviço em geral de PJ com receita bruta anual até R$ 120 mil, fora de serviço hospitalar, transporte e profissão legalmente regulamentada | Lei 9.250/1995, art. 40 e parágrafo único |
| 32% | serviço em geral, intermediação de negócios, administração, locação ou cessão de bens e direitos | Lei 9.249/1995, art. 15, §1º, III |

Fonte: [Lei 9.249/1995, art. 15](https://www.planalto.gov.br/ccivil_03/leis/l9249.htm) e
[Lei 9.250/1995, art. 40](https://www.planalto.gov.br/ccivil_03/leis/l9250.htm). Conferido
em 23/09/2026 no texto consolidado do Planalto. O 32% é o caso da maioria: profissão
regulamentada fica fora dos 16% mesmo faturando pouco.

```
limite isento no ano = presunção × receita bruta anual − DAS devido no ano
```

Numa agência com R$ 480 mil de receita e DAS de R$ 47.160 no Anexo III, o limite é
32% × 480.000 − 47.160 = R$ 106.440 no ano, ou R$ 8.870 por mês. O que passar disso é
rendimento tributável na pessoa física, e a saída é a escrituração contábil.

**Desde janeiro de 2026 existe um segundo limite.** Lucro e dividendo pagos pela mesma
empresa à mesma pessoa física residente no Brasil acima de R$ 50.000 num único mês têm 10%
de IRPF retidos na fonte, sem dedução nenhuma da base, e com recálculo quando há mais de um
pagamento no mesmo mês. Vale para qualquer regime, Simples incluído. A regra de transição do
§3º não é alternativa: as três condições valem juntas (resultado apurado até o
ano-calendário de 2025, distribuição aprovada até 31/12/2025 e pagamento nos termos
originalmente previstos no ato de aprovação). Faltando uma, a retenção incide. Base legal:
Lei 15.270/2025, que inseriu o art. 6º-A na Lei 9.250/1995; a mesma lei criou o imposto
mínimo da pessoa física, que alcança rendimento anual acima de R$ 600 mil. Fonte:
[Lei 15.270/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm) e
[perguntas e respostas da Receita, dez/2025](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2025/dezembro/receita-federal-lanca-perguntas-e-respostas-sobre-tributacao-de-altas-rendas-consideracoes-sobre-lucros-e-dividendos/manual_padrao_rfb_per_tributacao_sutri_v2.pdf).
Conferido no Planalto em 23/09/2026.

Quem distribui R$ 600 mil de uma vez em dezembro paga retenção; quem distribui R$ 50 mil por
mês ao longo do ano, não. É diferença de calendário, e é legítima.

---

## Aposentadoria: piso e teto, sem prometer valor

O que se pode afirmar com segurança é curto, e é isso que vai pro arquivo do usuário:

- Contribuir sobre o salário mínimo dá benefício de um salário mínimo, e nada acima disso
- Contribuir acima do mínimo aumenta a média que entra no cálculo, até o teto do salário de
  contribuição, e pró-labore maior que o teto não compra aposentadoria maior: a contribuição
  trava, o benefício trava, e só o IRRF continua subindo
- O valor depende da média de todas as contribuições da vida e do tempo (EC 103/2019).
  Número exato sai do extrato do CNIS, no meu.inss.gov.br

O que **não** se afirma: quanto ele vai receber. Regra de transição, tempo que falta e
contribuição antiga mudam tudo, e prometer valor a partir de um mês de pró-labore é número
que volta como reclamação.

## MEI e fora do Simples: não se aplica, e por quê

**MEI.** Paga DAS de valor fixo, não percentual sobre a receita. Sem anexo, sem alíquota
efetiva e sem Fator R: subir a retirada não muda um centavo do imposto. A contribuição
previdenciária dele já está dentro do DAS, em 5% do salário mínimo (LC 123/2006, art. 18-A,
§3º, V), então ele já é segurado sem pró-labore formal. O limite da distribuição isenta,
esse sim, continua valendo pelo art. 14.

**Lucro Presumido e Lucro Real.** Fator R existe só dentro do Simples. Fora dele a empresa
recolhe 20% de INSS patronal sobre o pró-labore, mais RAT e terceiros (Lei 8.212/1991, art.
22), e no Lucro Real ele é despesa dedutível de IRPJ e CSLL. A conta muda de sinal, e a
decisão vira planejamento tributário com contador.

**Anexo IV** (construção, limpeza, vigilância, advocacia) recolhe a patronal por fora,
inclusive sobre o pró-labore. Sem Fator R: cada real custa 11% do sócio mais 20% e pouco da
empresa.

## Sinais de que a retirada está errada

| Sinal | O que provavelmente está acontecendo | Primeira pergunta ao contador |
|---|---|---|
| Sócio que trabalha e não tem pró-labore nenhum | a base do contribuinte individual é o total pago ou creditado a qualquer título no mês (Lei 8.212/1991, art. 28, III; IN RFB 2.110/2022, art. 33, II), então sem discriminação entre trabalho e lucro a retirada inteira tende a ser tratada como remuneração | "o que eu tirei nos últimos 12 meses foi lançado como quê?" |
| Empresa de serviço no Anexo V com folha abaixo de 28% | está pagando 15,5% onde poderia pagar 6%, e ninguém rodou a conta | "quanto de pró-labore cruza o Fator R, e em que mês a alíquota muda?" |
| Pró-labore de um salário mínimo com distribuição de R$ 30 mil por mês | a proporção chama atenção, e o limite do art. 14 provavelmente já foi estourado | "a gente tem escrituração contábil que sustente essa distribuição?" |
| Retirada saindo da conta da empresa sem lançamento | mistura de pessoa física com jurídica; o lucro do `/caixa` fica falso e a fiscalização vê tudo pela e-Financeira | "como eu regularizo e qual é o jeito certo daqui pra frente?" |
| Distribuição grande concentrada num mês só | acima de R$ 50 mil no mês, 10% retidos na fonte desde 2026 | "compensa parcelar a distribuição ao longo do ano?" |
| Pró-labore acima do teto do INSS "pra aposentadoria" | o benefício já travou no teto; o excedente só paga IRRF | "o que eu ganho contribuindo acima de R$ 8.475,55?" |
| Dois sócios com pró-labore idêntico e trabalho muito diferente | pró-labore remunera trabalho; a desproporção aparece na fiscalização e na briga entre sócios | "posso ter pró-labore diferente pra cada sócio?" |
| RBT12 acima de R$ 4,32 milhões e esforço pra cruzar o Fator R | passado esse ponto o Anexo V fica mais barato que o III | "nessa faixa o Fator R ainda me ajuda?" |

## Quando o alvo não cabe

O pró-labore que cruza os 28% às vezes é maior do que a empresa consegue pagar, ou custa
mais imposto do que economiza. Aí existem três caminhos, e nenhum é "tirar mais e ver":

1. **Folha de empregado em vez de pró-labore.** Se a contratação já estava no plano, o
   salário conta no Fator R com os encargos por cima, e o `/custo-de-funcionario` fecha a
   conta. Contratar só pra cruzar os 28% é decisão grande: aí o `/decidir` conduz
2. **Dividir o pró-labore entre os sócios.** Duas faixas baixas de IRRF custam menos que
   uma alta, e a folha somada é a mesma. Vale quando os dois trabalham de verdade
3. **Ficar no Anexo V.** Saldo negativo pede ficar onde está, com pró-labore no mínimo, e
   revisar quando a receita mudar de faixa

## Glossário sem jargão

- **RBT12** — receita bruta dos últimos 12 meses; decide a faixa do Simples
- **Fator R** — folha dividida por receita, as duas de 12 meses. Em 28% a atividade de
  serviço troca o Anexo V pelo III
- **Alíquota efetiva** — a que se paga, depois da parcela a deduzir. Menor que a nominal
- **Presunção** — percentual que a lei presume de lucro sobre a receita; aqui é teto de
  distribuição isenta
- **Escrituração contábil** — balanço e demonstração de resultado. Afasta o teto da
  presunção e custa honorário a mais
- **Salário de contribuição** — a base do INSS, com piso (o mínimo) e teto
- **CNIS** — o cadastro onde o INSS guarda as contribuições da pessoa

## O que muda por perfil

- **Agência e estúdio** — Anexo V por CNAE de publicidade ou de tecnologia, sócios que
  trabalham, poucos empregados. É onde o Fator R rende mais e onde o alvo cabe no caixa
- **Profissional liberal com CNPJ** (médico, dentista, arquiteto, psicólogo) — Anexo V por
  regra geral, III quando o Fator R cruza. Presunção de 32%: profissão regulamentada fica
  fora dos 16%
- **Freelancer sozinho no CNPJ** — folha é só o pró-labore dele, e a conta do IRRF decide
- **Empresa com equipe** — a folha de empregados já puxa o Fator R, muita vez ele já está
  cruzado, e a decisão do ano é não deixar a folha cair
- **Comércio e indústria** — Anexo I ou II, sem Fator R. Aqui só a distribuição isenta
  interessa, com presunção de 8%
