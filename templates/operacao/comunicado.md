# Comunicado — o aviso difícil que exige ação de quem recebe

Referência do `/comunicado`. Guarda a checklist fixa, os prazos de aviso com fonte, o léxico
do que esconde o fato e o método da FAQ. O workflow fica na skill; aqui está o porquê de cada
exigência.

Por que existe: reajuste, mudança de regra, fechamento por reforma, sistema novo e pedido de
desculpa por falha têm a mesma anatomia. A pessoa que recebe precisa fazer algo, num prazo, e
sofre uma consequência se não fizer. O dono escreve isso com medo, e o medo produz sempre o
mesmo texto: "informamos que, por motivos alheios à nossa vontade, haverá um pequeno ajuste a
partir do próximo mês". Aí o cliente descobre o valor novo na fatura. E a conversa que ia ser
chata vira uma briga.

---

## O que é comunicado, e o que não é

| Situação | Onde resolve |
|---|---|
| Reajuste de preço da base atual | aqui (o motivo e o prazo saem do `/preco`) |
| Mudança de regra: horário, forma de pagamento, política de cancelamento, taxa de entrega | aqui |
| Fechamento temporário: reforma, férias coletivas, mudança de endereço | aqui |
| Sistema novo que muda o jeito de comprar, agendar ou pagar | aqui |
| Pedido de desculpa por falha que atingiu vários clientes | aqui |
| Sistema fora do ar, vazamento, causa raiz e o que foi corrigido no código | `templates/backend/incidente.md`, pelo `/backend` |
| "Mudamos o horário de sábado": aviso sem ação e sem consequência | `/whatsapp`, uma mensagem resolve |
| Carta de cobrança pra um devedor específico | `/cobranca` |
| Newsletter e promoção pra lista | `/email` |
| Resposta a uma pessoa só, caso a caso | `/whatsapp` e `/email-profissional` |

A pergunta que separa: **alguém precisa fazer alguma coisa por causa disso?** Se ninguém precisa
fazer nada, é recado. Recado não pede três versões, FAQ e calendário.

---

## A checklist fixa

Quatro perguntas, sempre as quatro, em toda peça que vai pra quem é afetado:

1. **O que muda** — na coisa concreta, com número. "A mensalidade passa de R$ 790,00 para R$ 890,00", não "haverá um ajuste"
2. **Desde quando** — dia, mês e ano em número. Mês sem dia não é data
3. **O que a pessoa precisa fazer** — um verbo, um lugar, um prazo. "Confirmar a renovação no link até 19/02/2027"
4. **O que acontece se não fizer** — a consequência real, sem ameaça e sem eufemismo. "O acompanhamento é encerrado em 01/03/2027 e a vaga vai pra fila"

Chat pula a 3 e a 4. É previsível: são as duas que dão medo de escrever, porque a 3 admite que
você está pedindo trabalho ao cliente e a 4 admite que existe perda. Sem elas o comunicado só
informa, e informar não é o objetivo. O objetivo é que a pessoa faça o que precisa ser feito
antes da data.

Duas perguntas de contexto entram junto, uma linha cada: **por que** (o motivo verdadeiro) e
**quem decidiu** (uma pessoa com nome, não "a empresa"). Comunicado sem dono soa como se
tivesse acontecido sozinho.

---

## Os cinco tipos e o que muda em cada

| Tipo | O medo de quem recebe | O que o comunicado precisa carregar |
|---|---|---|
| **Reajuste** | "estão me cobrando mais pelo mesmo" | o motivo real, quando foi o último aumento, o que continua igual, e a saída de quem não quiser |
| **Mudança de regra** | "vão me pegar de surpresa na próxima compra" | o antes e o depois lado a lado, e o que acontece com quem já está no meio do caminho |
| **Fechamento** | "e a minha encomenda?" | a data de volta, o que fazer com o que está em andamento, e onde falar com você no intervalo |
| **Sistema novo** | "não vou conseguir usar" | o passo a passo do primeiro uso, quem ajuda, e por quanto tempo o jeito antigo ainda funciona |
| **Desculpa** | "vai acontecer de novo" | o que aconteceu, o que já foi feito, o que muda pra não repetir, e o que quem foi afetado recebe |

O reajuste tem uma exigência extra: **o motivo e o prazo saem do `/preco`**, não do comunicado.
Se o estudo de preço diz que o aumento é de 12,66% porque o custo da sala subiu, é isso que vai
escrito. Motivo inventado na hora de comunicar ("reajuste anual") desmonta na primeira pergunta,
porque o cliente lembra que o último aumento foi há quinze meses.

---

## Prazo de aviso: o que é lei e o que é prática

Quase nada aqui é prazo legal fixo. Misturar as duas coisas é o erro que produz comunicado
tanto covarde quanto ilegal, então a tabela separa. As três primeiras linhas foram reconferidas
no Planalto em **2026-09-23**; o resto, em 2026-09-22.

| Situação | Prazo | Natureza | Fonte |
|---|---|---|---|
| Cláusula de reajuste por índice em contrato de 1 ano ou mais | periodicidade **anual**: estipulação de periodicidade menor é nula de pleno direito | lei | Lei 10.192/2001, art. 2º, §1º ([planalto](https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10192.htm)) |
| Anuidade de escola de educação infantil, fundamental, média ou superior | proposta de contrato divulgada **45 dias** antes do fim do prazo de matrícula | lei | Lei 9.870/1999, art. 2º ([planalto](https://www.planalto.gov.br/ccivil_03/leis/l9870.htm)) |
| Encerrar contrato sem prazo definido em que a outra parte investiu | prazo **compatível com o vulto do investimento** | lei, sem número | Código Civil, art. 473, parágrafo único ([planalto](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm)) |
| Reajuste avisado pra base atual | 30 dias | prática | — |
| Mudança de regra de atendimento ou pagamento | 30 dias | prática | — |
| Fechamento temporário programado | 15 dias | prática | — |
| Mudança de horário, jornada ou regra de trabalho da equipe | depende de acordo com cada pessoa | lei | CLT, art. 468 ([planalto](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm)) |

Duas ressalvas que evitam usar a tabela errado. A Lei 10.192 anula a **cláusula** de reajuste com
periodicidade menor que um ano; preço novo em renovação ou em contrato novo é negociação, e aí o
limite é o que a outra parte aceita. E a Lei 9.870 é de anuidade escolar: curso livre de idioma,
informática ou capacitação não é regido por ela, então ali o prazo de 45 dias é prática, não lei.

Três consequências práticas dessa tabela:

- **O que o comunicado promete, obriga.** Informação e publicidade suficientemente precisas
  integram o contrato (CDC, art. 30) e precisam ser corretas, claras, precisas e ostensivas
  (art. 31) ([planalto](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)). Prometer
  "o valor antigo vale até o fim do ano" no post cria direito, mesmo que o contrato diga outra coisa
- **Mudança que afeta empregado não é comunicado, é negociação.** Alteração de condição do
  contrato de trabalho só vale por mútuo consentimento e sem prejuízo ao empregado (CLT, art. 468).
  A versão da equipe informa; o que muda salário, jornada ou função passa por conversa individual
  e, quando houver, pelo contador e pelo advogado
- **Comunicado pra base de clientes tem base legal própria.** Aviso sobre o serviço que a pessoa
  contratou é execução de contrato (LGPD, art. 7º, V); o que é oferta nova vira legítimo interesse
  ou consentimento (art. 7º, IX) e precisa aceitar o "não quero receber"
  ([planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm))

Nada disto substitui advogado ou contador. A tabela serve pra o comunicado não nascer com um
prazo que a lei já resolveu de outro jeito.

---

## Os três públicos

O mesmo fato, três leituras. A tentação é escrever um texto e copiar nos três lugares, e é o que
faz a equipe descobrir a mudança pelo Instagram da própria empresa.

| Público | O que ele pergunta primeiro | O que a peça precisa ter |
|---|---|---|
| **Equipe** | "o que eu respondo quando perguntarem?" | o fato, o motivo, quem decidiu, a resposta pronta pras três reclamações prováveis, e o limite do que cada um pode resolver sozinho |
| **Cliente** | "quanto isso me custa e o que eu tenho que fazer?" | a checklist fixa inteira, na voz de sempre, com o prazo e o link da ação |
| **Rede** | "isso muda pra mim, que ainda não sou cliente?" | o fato em duas frases, a data, e nada de detalhe de contrato. Até 150 palavras |

A versão da equipe sai **primeiro**, e com folga. Atendente que descobre o reajuste pelo cliente
responde com insegurança, e insegurança do atendimento vale mais contra você que o próprio
aumento.

---

## Ordem de disparo

Equipe, depois quem é afetado, depois o público geral. Nunca ao mesmo tempo.

| Momento | Quem | Canal típico |
|---|---|---|
| Aviso, na data calculada | equipe | reunião curta ou grupo interno, com a folha na mão |
| No mesmo dia, algumas horas depois | cliente afetado | WhatsApp um-a-um pros principais, e-mail ou cartaz pro resto |
| Depois que a equipe já respondeu as primeiras dúvidas | público geral | post, story, perfil do Google |
| Meio do caminho | quem ainda não fez a ação | lembrete curto, só pra quem falta |
| Véspera | quem ainda não fez a ação | última chamada, prazo no assunto |

Cliente grande, antigo ou que paga mais recebe ligação ou mensagem pessoal antes do disparo em
massa. Custa vinte minutos e é o que evita a conversa difícil virar cancelamento.

---

## Linguagem que esconde

A voz passiva e o sujeito oculto aparecem exatamente onde dói. Trocar é mecânico.

| Em vez de | Escreva |
|---|---|
| Informamos que haverá um reajuste | A mensalidade passa de R$ 790,00 para R$ 890,00 |
| A partir do próximo mês | A partir de 01/03/2027 |
| Por motivos alheios à nossa vontade | O aluguel da sala subiu 18% na renovação |
| Serão implementadas melhorias no sistema | Você vai agendar pelo aplicativo, e não mais pelo WhatsApp |
| Pedimos a compreensão de todos | Se isso te atrapalhar, me chama que a gente resolve caso a caso |
| Eventuais transtornos | Na primeira semana o atendimento vai demorar mais |
| A empresa decidiu | Eu decidi |
| Em breve | 05/10/2026 |

Duas regras que cobrem o resto: **sujeito visível** e **data em número**. O `scripts/comunicado.js`
acusa cada expressão da coluna esquerda como aviso, e trata "em breve" e parentes como erro na peça
obrigada a dizer o dia. Aviso não trava a entrega: o dono decide se a frase fica.

---

## A FAQ: prever a pergunta

A FAQ não é enfeite. É o que a equipe lê antes de atender e o que evita cinco respostas diferentes
pra mesma dúvida. Seis perguntas bastam, e quase sempre são estas:

1. Por que isso está mudando agora?
2. Isso vale pra mim, que já sou cliente / que já paguei / que já agendei?
3. Quanto vou pagar a mais, exatamente?
4. E se eu não quiser?
5. Consigo manter o combinado anterior? Até quando?
6. Com quem eu falo se isso me atrapalhar de verdade?

A 4 e a 5 são as que o comunicado covarde omite. Responder "não" com clareza vale mais que
desviar: o cliente que ouve um não honesto continua cliente; o que descobre a resposta na cobrança
vira reclamação pública.

Pergunta cuja resposta você não tem entra na FAQ como `[a confirmar]` **na versão da equipe**, com
quem vai confirmar e até quando. Na versão do cliente, não sai nenhuma lacuna.

---

## Pedido de desculpa

Quatro partes, nessa ordem, e a terceira é a que as pessoas leem:

1. **O que aconteceu**, em uma frase, sem contexto defensivo antes
2. **O que já foi feito** pra consertar o caso de quem foi afetado
3. **O que muda no processo** pra não repetir, com a data em que passa a valer
4. **O que quem foi afetado recebe** (ou a frase honesta de que não há compensação)

Sem "assumimos total responsabilidade" solto. Responsabilidade se mostra nos itens 2 e 4. Falha
que atingiu um cliente só se resolve no um-a-um, e não vira comunicado: pedido de desculpa
público por caso individual expõe a pessoa sem necessidade.

---

## O `fato.json`

A fonte única do fato, e o que o script confere as peças contra. Existe porque a divergência
entre peças é silenciosa: o cartaz sai com R$ 895, ninguém relê, e o cliente fotografa os dois.

Campos: `tema`, `desde`, `muda`, `fazer`, `se_nao`, `porque`, `quem_decidiu`, `marcas` (a frase
curta que precisa aparecer literalmente em cada peça), `numeros`, `datas` e `pecas` (arquivo → o
que ele carrega, `"todos"` ou uma lista de `muda`, `desde`, `fazer`, `se_nao`). Qualquer
valor, porcentagem ou data que apareça numa peça e **não** esteja no `fato.json` é acusado como
fato solto. Por isso o número novo entra no `fato.json` primeiro, e só depois nas peças.

---

## O que fica de fora

- **Modelo de comunicação interna corporativo** (ADKAR, matriz de stakeholders, plano de gestão
  da mudança em cinco fases). Negócio de duas a vinte pessoas precisa de uma folha e de uma
  reunião de dez minutos
- **Relato de incidente técnico**, que tem método próprio em `templates/backend/incidente.md`
- **Comunicado de demissão ou desligamento**, que é conversa individual com apoio jurídico
- **Nota pública de crise** com imprensa envolvida: aí entra o `/imprensa` junto

---

## Fontes

- Lei 10.192/2001, art. 2º, §1º ("É nula de pleno direito qualquer estipulação de reajuste ou correção monetária de periodicidade inferior a um ano") — https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10192.htm · conferido em 2026-09-23
- Lei 9.870/1999, art. 2º (a escola divulga a proposta de contrato, o valor e o número de vagas por sala 45 dias antes do fim do prazo de matrícula; a lei trata de anuidade escolar da educação infantil ao superior) — https://www.planalto.gov.br/ccivil_03/leis/l9870.htm · conferido em 2026-09-23
- Código Civil (Lei 10.406/2002), art. 473 e parágrafo único (denúncia notificada, prazo compatível com o investimento) — https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm · conferido em 2026-09-22
- CDC (Lei 8.078/1990), art. 30 e 31 (a oferta vincula e precisa ser clara) — https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm · conferido em 2026-09-22
- CLT (Decreto-Lei 5.452/1943), art. 468 (alteração de condição do contrato individual de trabalho só por mútuo consentimento e sem prejuízo ao empregado, sob pena de nulidade) — https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm · conferido em 2026-09-23
- LGPD (Lei 13.709/2018), art. 7º, V e IX (bases legais do envio) — https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm · conferido em 2026-09-22
- Skill oficial `internal-comms` da Anthropic, de onde vem a separação por tipo de comunicação e o par tipo → guia — https://github.com/anthropics/skills/blob/main/skills/internal-comms/SKILL.md · lido em 2026-09-22
