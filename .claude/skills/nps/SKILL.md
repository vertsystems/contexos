---
name: nps
description: >
  Mede satisfação de cliente com uma pergunta só (nota de 0 a 10 mais o "por quê"), mandada no
  WhatsApp sete dias depois da entrega. Calcula o NPS por comando, promotores menos detratores,
  com a margem de erro da amostra ao lado, cruza por serviço e por mês, agrupa os comentários em
  temas com citação literal e entrega a triagem: quem vai pro pedido de depoimento e quem precisa
  de recuperação antes de virar uma estrela pública.
  Use quando o usuário disser "quero saber se os clientes estão satisfeitos", "como eu meço
  satisfação", "o que meus clientes acham de mim", "calcula meu NPS", "tenho as notas dos
  clientes aqui", "fiz uma pesquisa e não sei ler o resultado", "como eu pergunto se o cliente
  gostou", "qual a nota média dos meus clientes", "quem tá insatisfeito", ou /nps.
---

# /nps — A pergunta única de satisfação

> **Convenção de pastas:** a saída vai em `vendas/nps/nps-<AAAA-MM>.md`. Na convenção **por cliente**, `clientes/<Nome>/vendas/nps/` quando a base pesquisada é do cliente do usuário (agência que cuida da clínica de alguém); a pesquisa do próprio negócio fica na raiz. A pasta nasce na primeira rodada.

O dono sabe quem elogiou na frente dele e quem reclamou alto. Não sabe do cliente que pagou,
achou razoável, não disse nada e não voltou. Esse cliente calado é a maioria da base, e uma
pergunta de um caractere o traz pra dentro do arquivo: nota de 0 a 10, sete dias depois da
entrega. O produto disso é uma lista de nomes com o que fazer com cada um nesta semana. O número
serve pra saber se a lista melhorou.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio entrega, quais serviços separar no cruzamento, qual canal de contato
- **Tom:** `_memoria/preferencias.md` — a pergunta e a mensagem de recuperação saem na voz do dono, ou o cliente sente o roteiro
- **Cliente real:** `_memoria/publico.md`, se existir — a palavra que ele usa, pra nomear os temas com ela
- **Oferta:** `_memoria/oferta.md` — o que estava prometido. Nota baixa quase sempre é expectativa quebrada, não serviço ruim
- **Molde:** `templates/crescimento/nps.md` — as três faixas, a conta, a tabela de amostra, os temas e o que o Google proíbe, com fonte e data
- **Tom no canal:** `templates/copy/humanizacao.md` — a pergunta não pode soar como disparo de empresa grande
- **Script:** `scripts/nps.js` — lê CSV, `.xlsx` ou JSON, calcula NPS e margem, cruza por serviço e mês, confere os temas e gera a planilha
- **Onde o depoimento vai parar:** `biblioteca.md` (`/biblioteca`)
- **Saída:** `vendas/nps/nps-<AAAA-MM>.md` é o arquivo da rodada. Junto nascem `vendas/nps/envios-<AAAA-MM>.md` (a lista de quem recebe a pergunta e quando), `dados/nps-<AAAA-MM>.csv` (as respostas normalizadas) e `dados/nps-<AAAA-MM>.temas.json` (o agrupamento dos "por quê") e, quando o usuário quiser mexer nos números, `vendas/nps/nps-<AAAA-MM>.xlsx` com o `nps-<AAAA-MM>.planilha.json` do lado, que é a receita da planilha e pode ser apagado

---

## Workflow

### Passo 1 — Descobrir se é coleta ou leitura

Uma pergunta, antes de qualquer outra coisa:

> "Você já tem as respostas em algum lugar (planilha, Google Forms, conversa de WhatsApp), ou
> a gente está começando a pesquisa agora?"

- **Já tem** — seguir do Passo 3
- **Começando agora** — Passo 2, e o arquivo de leitura fica pra quando as respostas voltarem

Se ele diz "tenho umas respostas soltas no WhatsApp", é coleta e leitura ao mesmo tempo: monta
a pergunta pras próximas entregas e transcreve o que já existe.

### Passo 2 — Montar a coleta

A coleta é **uma pergunta no WhatsApp, em D+7 da entrega**. Não é formulário: formulário de uma
tela precisa de servidor pra receber resposta, e este sistema vive em arquivo. Link de
formulário externo também derruba a taxa de resposta e parece cobrança.

O texto base, calibrado no tom de `preferencias.md` e no formato do `/whatsapp`:

> Oi, [Nome]. De 0 a 10, quanto você indicaria o [serviço] pra um amigo?
>
> Só o número já ajuda. Se quiser dizer o motivo em uma linha, melhor ainda.

Entregar **duas variantes** de temperatura diferente, pra ele escolher qual soa como ele.

O que perguntar depois, em uma mensagem só, porque aqui é levantamento:

> 1. "Quem você entregou nos últimos 30 dias? (nome, o que foi, data)"
> 2. "Quantas entregas por mês, em média?"
> 3. "Quer separar por serviço? Quais?"
> 4. "Você já pede avaliação no Google hoje? Pra quem?"

A pergunta 4 existe por um motivo: se ele manda o link do Google só pra quem elogiou, isso é
convite seletivo e é infração de política. Avisar na hora, com a citação do molde, e corrigir
antes de seguir.

Montar a lista de envio em `vendas/nps/envios-<AAAA-MM>.md`: nome, serviço, data da entrega,
data do D+7 (calcular, não estimar) e telefone. Marcar as datas de envio em `tarefas.md`. Se o
envio vai repetir todo mês, o `/rotina` agenda, e o `/sequencia` desenha a série quando a
pesquisa entra numa régua maior de pós-venda.

**Amostra mínima antes de prometer número:** com menos de 10 respostas não existe NPS. Dizer
isso agora, não depois. Se o negócio entrega cinco clientes por mês, a rodada é trimestral.

### Passo 3 — Receber as respostas num arquivo

Aceitar do jeito que vier e normalizar. O script lê CSV, `.xlsx` e JSON, e reconhece nome de
coluna aproximado: cliente, nota, motivo (o "por quê"), servico, data, telefone, canal.

| De onde vem | O que fazer |
|---|---|
| Google Forms | Baixar o CSV e salvar em `dados/`. O carimbo de data/hora já é a coluna de data |
| Planilha do dono | Salvar em `dados/` e ler com `node scripts/gerar-planilha.js --ler <arquivo>` pra ver o que tem antes |
| Colado no chat | Escrever o CSV em `dados/nps-<AAAA-MM>.csv` com as colunas acima. Nunca calcular de cabeça a partir do texto colado |
| Conversa de WhatsApp | Transcrever nota, nome e a frase literal. Se a resposta foi "9 mas o orçamento demorou", a nota é 9 e o motivo é a frase inteira |
| Print ou PDF | Ler o arquivo direto e transcrever pro CSV, resposta por resposta |

Só a coluna de nota é obrigatória. Sem nome de cliente o número sai e a triagem não, e a
triagem é o produto: avisar e pedir os nomes.

Conferir antes de calcular:

```bash
node scripts/verificar.js csv dados/nps-<AAAA-MM>.csv
```

### Passo 4 — Calcular por comando

Nunca de cabeça, e nunca pela média das notas.

```bash
node scripts/nps.js dados/nps-<AAAA-MM>.csv \
  --mes <AAAA-MM> \
  --hoje <DD/MM/AAAA> \
  --enviados <quantas perguntas foram mandadas no período> \
  --anterior <NPS anterior>/<n de respostas dele> \
  --minimo <respostas mínimas por serviço, padrão 5> \
  --saida "vendas/nps/nps-<AAAA-MM>.md" \
  --xlsx "vendas/nps/nps-<AAAA-MM>.xlsx"
```

Um arquivo por rodada, e só um. NPS de duas populações somadas (quem respondeu no WhatsApp e
quem respondeu na loja com o dono olhando) não quer dizer nada — o script recusa dois arquivos
de propósito. `--enviados` é o número de perguntas que saíram, não o tamanho da base: sem isso a
taxa de resposta não aparece, e é ela que diz se o silêncio é a maioria. `--json` no lugar do
`--saida` devolve tudo em JSON, quando outra skill precisa ler o resultado.

O que o comando devolve, tudo com a conta ao lado:

- **NPS** — percentual de promotores (9-10) menos percentual de detratores (0-6), em pontos
- **Margem de erro de 95%** — quanto o número pode estar longe da verdade por causa do tamanho da amostra
- **Faixa provável** — NPS mais e menos a margem, presa entre −100 e +100
- **Taxa de resposta** — respostas sobre envios, quando `--enviados` é informado
- **Média das notas** — impressa ao lado de propósito, pra mostrar o que ela esconde
- **Cruzamento** — por serviço e por mês, marcando o grupo com amostra pequena demais pra citar
- **Comparação** — se a diferença contra o período anterior passa da margem ou é ruído

Regra que não se negocia: **variação menor que a margem não é notícia.** De +30 pra +45 com 20
respostas é a mesma medição. O script diz isso com o número; repetir no chat com a frase dele.

Se o usuário pedir o NPS de um serviço com três respostas, mostrar e marcar como amostra
pequena. Número de vitrine sobre três pessoas é como o dono toma a decisão errada.

### Passo 5 — Ler os "por quê" e montar os temas

O número não decide nada. Os comentários decidem, quando param de ser comentário solto e viram
tema. Essa parte é leitura, não contagem de palavra.

Ler todos os "por quê", agrupar em 3 a 6 temas usando a palavra do cliente, escolher uma citação
literal por tema, e escrever o manifesto em `dados/nps-<AAAA-MM>.temas.json`:

```json
{ "temas": [
  { "tema": "Prazo e agenda", "clientes": ["Diego Rocha", "Fábio Neto"],
    "citacao": "marcaram três vezes e não apareceram" }
] }
```

O script confere o que a leitura pode errar:

```bash
node scripts/nps.js dados/nps-<AAAA-MM>.csv --temas dados/nps-<AAAA-MM>.temas.json \
  --saida "vendas/nps/nps-<AAAA-MM>.md"
```

Ele acusa comentário que ficou sem tema, comentário em dois temas ao mesmo tempo e nome que não
existe nas respostas. Corrigir e rodar de novo até fechar. A lista de temas comuns e onde cada
um se conserta está em `templates/crescimento/nps.md`.

**Um tema exige três ocorrências**, ou uma grave o bastante pra ter custado o cliente. Dois
comentários parecidos são coincidência, e vale escrever isso no arquivo.

### Passo 6 — Escrever o arquivo

O comando do Passo 4 com `--saida` já **grava o arquivo**. Ele escreve, nesta ordem: o título,
a linha de quantas respostas entraram, `## O número`, `## Contra o período anterior`,
`## Por serviço`, `## Por mês`, `## Os "por quê" por tema`, `## Triagem` e `## Avisos do
script`. Essas seções são do script: **nenhum número delas se digita de novo**.

O que o assistente faz é editar o arquivo gerado, acrescentando as cinco seções que o script
não tem como escrever: `## O mês em uma frase` (logo depois da linha de abertura),
`## Mensagens prontas`, `## O que a pesquisa permite decidir`, `## O que não dá pra afirmar
ainda` e `## Próxima rodada` (no fim, antes dos avisos). Se um número seu discorda do número do
script, o errado é o seu.

O arquivo fechado fica assim — as seções marcadas com `(script)` chegam prontas:

```markdown
# NPS — <mês> de <ano>                                                (script)

<N> respostas válidas. Gerado por `scripts/nps.js` em <data>.        (script)

## O mês em uma frase
[NPS +X com N respostas, faixa de A a B. O que explica: o tema que apareceu mais e o
serviço que puxa pra baixo.]

## O número                                                           (script)
| Linha | Valor | Conta |
|---|---|---|
| Promotores (9-10) | ... | ... ÷ ... |
| Neutros (7-8) | ... | ... ÷ ... |
| Detratores (0-6) | ... | ... ÷ ... |
| **NPS** | **+X** | ...% − ...% |
| Margem de erro (95%) | ±Y pontos | amostra de N |
| Faixa provável | +A a +B | NPS ± margem |
| Taxa de resposta | ...% | N ÷ enviadas |
| Respostas com "por quê" | ... | ... de N |

[a frase de confiança que o script devolveu, na íntegra]
[e a média das notas, ao lado, com o aviso de que não é NPS]

## Contra o período anterior                                          (script)
[diferença em pontos, e se passa da margem ou não]

## Por serviço                                                        (script)
| Serviço | Respostas | Promotores | Detratores | NPS | Margem |
|---|---|---|---|---|---|

## Por mês                                                            (script)
| Mês | Respostas | NPS | Margem |
|---|---|---|---|

## Os "por quê" por tema                                              (script)
| Tema | Respostas | Promotores | Detratores | Citação |
|---|---|---|---|---|

## Triagem                                                            (script)
### Promotores (N) — pedir depoimento
| Cliente | Nota | Serviço | O que ele disse | O que fazer | Contato |
|---|---|---|---|---|---|
### Detratores (N) — recuperar antes de virar avaliação pública
| Cliente | Nota | Serviço | O que ele disse | O que fazer | Contato |
|---|---|---|---|---|---|
### Neutros (N) — o grupo que ninguém olha
| Cliente | Nota | O que ele disse |
|---|---|---|

## Mensagens prontas
### <Cliente> — promotor, pedido de depoimento
[texto pronto pra copiar]
### <Cliente> — detrator, recuperação
[texto pronto pra copiar]
### Neutros — a pergunta única
[texto pronto pra copiar]

## O que a pesquisa permite decidir
1. [decisão concreta, com o número ou o tema que a sustenta]

## O que não dá pra afirmar ainda
[o que a amostra não permite, e quantas respostas faltariam]

## Próxima rodada
[data, quem entra, o que medir de novo pra fechar o tema aberto]

## Avisos do script                                                   (script)
- [linha descartada, resposta repetida, coluna que faltou]
```

As marcas `(script)` são só pra leitura aqui: no arquivo de verdade não existem.

### Passo 7 — Escrever as mensagens da triagem

Aqui está o dinheiro da skill. Três conversas, três textos.

**Promotor (9 e 10), em 48 horas.** Pedir o depoimento usando a frase que ele já escreveu, pra
ele só confirmar em vez de redigir:

> Que bom ler isso, [Nome]. Você escreveu que [frase dele]. Posso usar essa frase com seu
> primeiro nome no meu site? Se preferir escrever de outro jeito, melhor ainda.

O depoimento que chegar vai pro `biblioteca.md` com nome, contexto e data. Depoimento parado em
conversa de WhatsApp não existe pro sistema, e é o que a `/landing`, a `/proposta` e o
`/carrossel` vão procurar depois. Publicar frase com nome exige autorização explícita, pelo
`/autorizacao`.

**Detrator (0 a 6), hoje.** Nomear o problema, sem se defender e sem pedir nada em troca:

> [Nome], obrigado pela sinceridade. Você marcou [nota] e falou de [problema, na palavra dele].
> Isso não é o que eu combinei com você. Me dá até [dia] pra resolver [o que dá pra resolver]?

Nota 3 ou menos: ligação, não mensagem. Se o problema não tem conserto, o texto diz o que muda
pra não acontecer de novo, e nada além.

**Neutro (7 e 8), na semana.** Uma pergunta, e só:

> [Nome], obrigado pela nota. Me ajuda com uma coisa: o que teria faltado pra ser 10?

Duas variantes de cada mensagem, temperatura diferente. Uma pergunta por mensagem. Sem "espero
que esteja tudo bem".

### Passo 8 — Fechar a rodada

O risco aqui é um: o número mudou durante a edição do Passo 6. Conferir rodando o script de novo
e comparando com o que ficou no arquivo:

```bash
node scripts/nps.js dados/nps-<AAAA-MM>.csv --mes <AAAA-MM> --hoje <DD/MM/AAAA> \
  --enviados <n> --anterior <NPS anterior>/<n> \
  --temas dados/nps-<AAAA-MM>.temas.json --saida /tmp/nps-conferencia.md
diff /tmp/nps-conferencia.md "vendas/nps/nps-<AAAA-MM>.md"
```

O `diff` só pode mostrar as seções que o assistente acrescentou. Qualquer linha diferente dentro
de `## O número`, `## Por serviço`, `## Por mês`, `## Os "por quê" por tema` ou `## Triagem`
significa que um número foi editado na mão: apagar a edição e ficar com o do script, nunca o
contrário. Depois, a leitura do texto:

```bash
node scripts/verificar.js texto "vendas/nps/nps-<AAAA-MM>.md"
```

Fechado o arquivo, quatro coisas antes de encerrar a rodada:

- Marcar em `tarefas.md` cada contato da triagem, com data. Triagem que depende de memória não acontece
- Anotar o NPS e o n do período em `_memoria/estrategia.md` numa linha, pra comparação futura
- Passar a fila de depoimento pro `/pos-venda` e os temas de processo pra quem conserta
- Agendar a próxima rodada. Uma medição sozinha não é medição

---

## Regras

- **NPS é promotores menos detratores, nunca média.** Oito notas 8 dão média 8,0 e NPS zero. Quando o usuário falar em "nota média", mostrar as duas contas uma vez, sem lição de moral
- **Toda conta sai do `scripts/nps.js`.** O que a skill mostra no chat tem que ser o que o comando devolveu, inclusive a margem. Número somado de cabeça não entra no arquivo
- **Margem antes de comemorar.** Diferença menor que a margem de erro não é melhora nem piora, e a skill diz isso mesmo quando o número subiu
- **Menos de 10 respostas: não publicar NPS.** Ler os comentários e tratar caso por caso. Grupo por serviço com menos de cinco respostas sai marcado como amostra pequena
- **Nunca convite seletivo pra avaliação no Google.** Mandar o link só pra quem deu nota alta é review gating, proibido pela política de conteúdo do Google (citação, link e data em `templates/crescimento/nps.md`). Se convida pra avaliar em público, convida todo mundo, com o mesmo texto e na mesma hora. Detrator recebe conserto em conversa privada, não um caminho diferente pra não avaliar
- **Nunca incentivo por avaliação.** Desconto, brinde ou frete grátis em troca de nota é engajamento falso pela mesma política, e vale pra pesquisa também
- **Detrator antes de promotor.** Quando o tempo do dia dá pra uma coisa só, é a ligação pro cliente que deu 2. Depoimento espera; avaliação de uma estrela não
- **Nunca inventar resposta, nem "melhorar" o comentário do cliente** além de corrigir digitação. Citação vai literal, entre aspas, com o primeiro nome
- **Nunca publicar comentário com nome sem autorização.** Nota de pesquisa não é permissão de uso: isso é `/autorizacao`
- **Dado de cliente é dado pessoal (LGPD).** Lista de respostas não vai pra ferramenta externa sem autorização explícita do dono. Quem pede pra não receber mais pesquisa sai da lista, e a saída fica registrada. Paciente é dado sensível: mensagem de clínica não menciona procedimento nem diagnóstico
- **Não substitui advogado.** Enquadramento da pesquisa na LGPD, política de uso de depoimento e resposta a cliente que ameaça processar passam por advogado antes de virar mensagem
- **Quando o número for ruim, dizer o número.** NPS negativo significa que há mais gente disposta a falar mal que a indicar. Suavizar isso é o oposto de ajudar
- **Fronteira com as vizinhas:** o pedido de depoimento e a reativação de cliente parado são do `/pos-venda`, que recebe daqui a fila de quem deu 9 e 10; a resposta ao que já foi publicado em público é do `/responder-avaliacoes`; quem paga mensalidade e está sumindo é do `/retencao`, que olha comportamento em vez de opinião; o balanço de vendas e produção da semana é do `/revisao-semanal`; o formato da mensagem no canal é do `/whatsapp`; a série que dispara a pergunta sozinha é do `/sequencia`; o conserto do processo que o tema apontou é do `/procedimento`
