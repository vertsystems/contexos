# Revisão de contrato — o que é risco e qual é a redação alternativa

Referência do `/revisar-contrato`. O `/contrato` consulta as redações alternativas quando escreve a
cláusula do próprio usuário, e o `/cobranca` olha a seção de multa e juros antes de calcular o
atrasado. Não é workflow: aqui mora a lei, o sinal de problema e o texto de troca.

Por que existe: o freelancer e a agência pequena assinam o contrato que chegou. Leem rápido e
assinam, porque o trabalho começa segunda. Meses depois descobrem que cederam o portfólio inteiro,
que o pagamento sai 90 dias depois da nota, e que a multa vale só pra um lado. Nada disso estava
escondido.

> **Não é assessoria jurídica.** É a legislação lida pra quem vende serviço, com artigo, fonte e
> data. Valor alto, empresa grande que não aceita emenda, multa que ameaça o caixa do ano, não
> concorrência longa e briga já instalada passam por advogado antes de virar resposta.

Todo artigo citado abaixo foi conferido em **23/09/2026** no texto oficial (Planalto), e a lista de
fontes com URL está no fim do arquivo. Lei muda pouco, mas muda: reconferir a cada atualização, e
nunca citar artigo de memória.

---

## O painel de risco: como classificar cada achado

| Nível | O que é | O que fazer |
|---|---|---|
| **Alto** | Pode custar mais que o contrato inteiro, ou tirar um direito que não volta: cessão perpétua de obra, multa sem teto, responsabilidade ilimitada, não concorrência longa, escopo aberto | Não assinar como está. Contraproposta escrita, e advogado quando a outra parte recusar |
| **Médio** | Custa caro em caixa ou em tempo, e é onde a negociação normalmente ganha: prazo de pagamento, revisões ilimitadas, multa só de um lado, reajuste ausente, foro distante | Pedir a mudança. Costuma passar na primeira rodada |
| **Atenção** | Está dentro do usual, mas o usuário precisa saber que aceitou: confidencialidade larga, portfólio proibido, aviso prévio de 30 dias | Explicar em uma linha e seguir |

A régua não é o susto: é a conta. Multa de 20% num contrato de R$ 3.000 é R$ 600, e isso é médio. A
mesma multa num contrato de R$ 80.000 é R$ 16.000, e aí é alto. Percentual sozinho não separa os
dois casos. O `scripts/revisar-contrato.js` compara a multa em reais com um mês de faturamento
(`--mensal`): quando a penalidade come um mês de trabalho, o nível sobe.

---

## As cláusulas que custam dinheiro

### 1. Multa e cláusula penal

Dois limites legais, e os dois são desconhecidos de quem escreve contrato copiado.

- **Art. 412 do Código Civil** — "O valor da cominação imposta na cláusula penal não pode exceder o da obrigação principal." Multa que passa do valor do contrato é inválida no excesso
- **Art. 413** — "A penalidade deve ser reduzida equitativamente pelo juiz se a obrigação principal tiver sido cumprida em parte, ou se o montante da penalidade for manifestamente excessivo, tendo-se em vista a natureza e a finalidade do negócio"

Multa reduzida por juiz é consolo caro: exige processo. O que resolve antes é a simetria e o teto
escritos. **Sinais de problema:** multa só contra o prestador; percentual sobre o valor total quando
quase tudo já foi entregue; multa somada a perdas e danos "sem prejuízo de"; multa diária sem teto.

> **Redação alternativa.** O atraso injustificado de qualquer das partes sujeita a parte em atraso a
> multa de 2% sobre o valor da parcela em atraso, mais juros de mora pela taxa legal (art. 406 do
> Código Civil), limitada a 10% do valor do contrato. A multa por atraso na entrega incide sobre a
> etapa atrasada, não sobre o valor total, e é reduzida proporcionalmente à parte já executada.

### 2. Cessão de direito autoral

A que mais machuca criador, designer, fotógrafo, redator e desenvolvedor. A Lei 9.610/1998 protege
o autor por padrão, e o contrato bem escrito do outro lado desfaz isso em duas linhas.

- **Art. 49, II** — "somente se admitirá transmissão total e definitiva dos direitos mediante estipulação contratual escrita"
- **Art. 49, III** — sem estipulação escrita, "o prazo máximo será de cinco anos"
- **Art. 49, IV** — a cessão vale só no país em que o contrato foi firmado, salvo estipulação contrária
- **Art. 49, V** — a cessão "só se operará para modalidades de utilização já existentes à data do contrato"
- **Art. 49, VI** — sem especificar a modalidade de uso, o contrato é interpretado restritivamente
- **Art. 50** — a cessão total ou parcial faz-se sempre por escrito, e presume-se onerosa
- **Art. 4º** — "Interpretam-se restritivamente os negócios jurídicos sobre os direitos autorais"
- **Art. 27** — "Os direitos morais do autor são inalienáveis e irrenunciáveis": crédito e integridade da obra não se cedem, nem com assinatura

O silêncio favorece o autor. O combo "cessão total, definitiva, irrevogável, irretratável, em
caráter universal e perpétuo, para quaisquer modalidades existentes ou que venham a existir" existe
pra virar esse padrão do avesso, e sem aumento de preço é obra vendida a preço de hora.

> **Redação alternativa, licença.** É o que quase todo caso pede. O CONTRATANTE recebe licença
> de uso do material entregue, para as finalidades descritas no escopo, em território nacional,
> pelo prazo de 5 anos renovável. O CONTRATADO permanece titular dos direitos autorais, dos
> arquivos editáveis e dos estudos não aprovados, e mantém o direito de exibir o trabalho em
> portfólio e em processo seletivo, preservado o sigilo de dado comercial. Uso em modalidade não
> prevista, ou cessão definitiva, dependem de aditivo escrito com valor próprio.

Se o cliente insiste na cessão definitiva, a resposta não é "não": é preço. Cessão total é outro
produto, e o aditivo diz quais direitos, por quanto tempo, em que território — e por quanto.

### 3. Foro de eleição

Desde a Lei 14.879/2024, o **art. 63, § 1º, do CPC** só dá efeito à eleição de foro que cumpra três
coisas ao mesmo tempo: constar de instrumento escrito, aludir expressamente a determinado negócio
jurídico, e guardar pertinência com o domicílio ou a residência de uma das partes ou com o local da
obrigação (ressalvada a pactuação consumerista favorável ao consumidor). O **§ 5º** completa: o
ajuizamento em juízo aleatório, sem vínculo com o domicílio das partes nem com o negócio discutido,
"constitui prática abusiva que justifica a declinação de competência de ofício". A regra vale pra
ação proposta a partir de 04/06/2024, data em que a lei entrou em vigor (STJ, CC na 2ª Seção).

Atenção ao que isso não é: a comarca da outra parte **é** pertinente, porque é domicílio de uma das partes. O que a lei derrubou foi a comarca sem ligação com ninguém.

**Por que importa:** foro na capital do outro lado não muda quem tem razão. Muda quem consegue
litigar. Advogado em outro estado, passagem e dia parado custam mais que a causa.

> **Redação alternativa.** Fica eleito o foro da comarca de <cidade do CONTRATADO>, domicílio de
> uma das partes, para dirimir as questões oriundas deste contrato.

Empresa grande costuma recusar. A saída é o foro do domicílio do réu, ou conciliação por
videoconferência antes de qualquer ação. Arbitragem pede atenção própria: câmara arbitral cobra
taxa que começa em milhares de reais, e num contrato de R$ 20.000 isso é direito que não se exerce.

### 4. Contrato de adesão e termo de uso de plataforma

**Art. 424 do Código Civil** — "Nos contratos de adesão, são nulas as cláusulas que
estipulem a renúncia antecipada do aderente a direito resultante da natureza do negócio."

Termo de uso de marketplace, banco, ferramenta e rede social é contrato de adesão. **Não se
negocia.** A revisão entrega outra coisa: quais riscos o usuário aceita, quais têm plano B, e o que
fazer antes de depender da plataforma pra faturar. Suspensão de conta sem aviso, mudança unilateral
de taxa e propriedade dos dados são os três de sempre.

### 5. Rescisão, vigência e renovação

**Art. 473 do Código Civil**: a resilição unilateral opera por denúncia notificada à outra
parte. O parágrafo único é o que protege quem investiu: se a parte "houver feito investimentos
consideráveis para a sua execução, a denúncia unilateral só produzirá efeito depois de
transcorrido prazo compatível com a natureza e o vulto dos investimentos".

**Sinais de problema:** o cliente rescinde a qualquer tempo sem motivo e sem aviso, e o prestador
só com 90 dias; renovação automática por prazo igual; rescisão que não paga o já executado.

> **Redação alternativa.** Qualquer das partes pode rescindir este contrato mediante aviso escrito
> com 30 dias de antecedência. O CONTRATANTE paga as etapas concluídas e a parte proporcional da
> etapa em curso na data da rescisão. A renovação depende de manifestação escrita das partes.

### 6. Pagamento, juros e reajuste

O prazo de pagamento é onde o contrato de empresa grande sangra o caixa do pequeno: 30 dias
"contados do recebimento da nota fiscal aprovada", e a aprovação depende de um portal que abre dia
25 — na prática, 60 a 75 dias.

A **Lei 14.905/2024** reescreveu o art. 406 do Código Civil, com efeito desde 30/08/2024: a taxa
legal de mora é a Selic menos o índice de atualização monetária do art. 389 (o IPCA), e resultado
negativo conta como zero. O Banco Central publica o número mês a mês, operacionalizado pela
Resolução CMN 5.171/2024 — não é "a Selic cheia", e essa confusão aparece em cobrança de cliente
todo mês. Contrato que diz "juros de 1% ao mês" continua valendo: a taxa legal só entra quando as
partes não convencionam.

**Sinais de problema:** prazo contado de evento que o prestador não controla; nenhuma multa nem
juros por atraso do cliente; 12 meses ou mais sem índice de reajuste; retenção de pagamento por
"insatisfação" sem critério.

> **Redação alternativa.** O pagamento é devido em até 15 dias corridos contados da emissão da nota
> fiscal, que ocorre na conclusão de cada etapa. O atraso sujeita o CONTRATANTE a multa de 2% e
> juros de 1% ao mês pro rata die. Contratos com vigência igual ou superior a 12 meses são
> reajustados pelo IPCA na data de aniversário.

### 7. Escopo aberto e revisão ilimitada

Não tem artigo de lei. Tem margem. As expressões que abrem o escopo são conhecidas: "e demais
atividades correlatas", "conforme a necessidade do CONTRATANTE", "a critério exclusivo do
CONTRATANTE", "quantas revisões forem necessárias", "melhores esforços", "sempre que solicitado".

> **Redação alternativa.** Estão incluídas 2 rodadas de revisão por entrega, solicitadas em até 5
> dias úteis do envio. Rodada adicional é orçada à parte, a R$ <valor>. Atividade não descrita no
> escopo depende de aditivo escrito com prazo e valor próprios, aprovado antes da execução.

### 8. Exclusividade, não concorrência e não aliciamento

Exclusividade sem contrapartida é o pior negócio. O prestador perde o mercado e não ganha garantia
de volume. **O que negociar, na ordem:** prazo (6 meses é discutível, 5 anos não), delimitação
(concorrente direto nomeado, não "o setor"), território e contrapartida em dinheiro. Não
aliciamento de equipe é mais defensável e costuma resolver o que o cliente realmente quer.

### 9. Responsabilidade, indenização e garantia

**Sinais de problema:** responsabilidade ilimitada; indenização por lucro cessante do cliente ou
por "qualquer reclamação de terceiro"; garantia de resultado de negócio (faturamento, posição no
Google, seguidores).

> **Redação alternativa.** A responsabilidade do CONTRATADO por este contrato, somadas todas as
> hipóteses, limita-se ao valor efetivamente pago nos 12 meses anteriores ao evento. Nenhuma das
> partes responde por lucro cessante ou dano indireto. O CONTRATADO garante a execução técnica do
> serviço descrito no escopo; resultado comercial depende de fatores fora do seu controle e não é
> objeto de garantia.

### 10. Dados pessoais (LGPD)

Quando o serviço mexe com base de cliente do cliente, a LGPD reparte os papéis, e o contrato
precisa dizer quem é quem.

- **Art. 5º, VI** — controlador é quem decide sobre o tratamento
- **Art. 5º, VII** — operador é quem trata os dados em nome do controlador
- **Art. 39** — o operador trata "segundo as instruções fornecidas pelo controlador"
- **Art. 42** — quem causa dano repara; o operador responde solidariamente quando descumpre a lei ou desatende instrução lícita do controlador, e nesse caso se equipara ao controlador

O risco tem dois lados. O prestador vira controlador sem saber, ou aceita responsabilidade integral
por vazamento que começou no sistema do cliente.

> **Redação alternativa.** O CONTRATANTE é controlador dos dados pessoais a que o CONTRATADO tem
> acesso, e o CONTRATADO atua como operador, tratando-os apenas conforme instrução escrita e pelo
> prazo do contrato. Cada parte responde pelos incidentes originados nos sistemas sob sua guarda.
> Encerrado o contrato, o CONTRATADO devolve ou elimina os dados em até 30 dias, mediante
> confirmação.

### 11. Vínculo empregatício disfarçado

Contrato de serviço que fixa jornada, horário, subordinação a gestor e dedicação integral tem os
elementos do **art. 3º da CLT**: "Considera-se empregado toda pessoa física que prestar serviços de
natureza não eventual a empregador, sob a dependência deste e mediante salário." Sinal prático: o
contrato descreve **como** o trabalho é feito, em vez de **o que** é entregue.

---

## NDA: o que conferir em dez minutos

| Item | O aceitável | O sinal de problema |
|---|---|---|
| Direção | Mútuo (as duas partes protegem) | Só o prestador se obriga |
| Definição de informação confidencial | Lista fechada, marcada como confidencial | "Toda informação trocada, verbal ou escrita, por qualquer meio" |
| Exceções | Informação pública, já conhecida, obtida de terceiro, exigida por lei | Sem exceção nenhuma |
| Prazo | 2 a 5 anos após o fim da relação | Perpétuo |
| Multa | Valor certo, proporcional ao contrato | Valor fixo alto, sem relação com o dano |
| Portfólio | Ressalva escrita pra mostrar o trabalho | Proibição total, sem prazo |
| Devolução | Devolver ou eliminar em prazo definido | Silêncio |

NDA de conversa inicial que já traz não concorrência, cessão de ideia e multa de R$ 50.000 não é
NDA: é contrato disfarçado de formalidade. Vale ler devagar.

---

## O que levar pro advogado

Lista curta. O honorário custa menos que o risco de assinar.

1. Contrato acima de três vezes o faturamento mensal do usuário
2. Cessão definitiva de direito autoral, licenciamento de software ou patente
3. Não concorrência com prazo acima de 12 meses, ou sem contrapartida
4. Responsabilidade ilimitada, ou indenização por lucro cessante
5. Arbitragem como via obrigatória
6. Contrato regido por lei estrangeira, ou com foro fora do Brasil
7. Empresa grande que recusa toda emenda e o valor é relevante pro ano
8. Briga já instalada: notificação recebida, serviço suspenso, pagamento retido

---

## Fontes

- [Código Civil (Lei 10.406/2002)](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) — arts. 389, 406, 412, 413, 424, 473
- [Lei 9.610/1998, direito autoral](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm) — arts. 4º, 27, 49, 50
- [CPC (Lei 13.105/2015)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm) — art. 63, §§ 1º e 5º
- [Lei 14.879/2024](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14879.htm) — nova regra do foro de eleição
- [Lei 14.905/2024](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14905.htm) — taxa legal de juros e correção monetária
- [LGPD (Lei 13.709/2018)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) — arts. 5º, 39, 42
- [CLT (Decreto-Lei 5.452/1943)](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm) — art. 3º
- [Taxa legal mensal, Banco Central](https://www.bcb.gov.br/estabilidadefinanceira/taxalegal) — o número que o art. 406 manda usar
- Conferido em 23/09/2026. Confira de novo antes de citar em contrato de valor alto
