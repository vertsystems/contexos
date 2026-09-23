---
name: revisar-contrato
description: >
  Lê o contrato que o cliente ou a empresa grande mandou pra assinar, ou o NDA que chegou antes
  da reunião, e devolve o painel de risco: cláusula, qual é o problema, e a redação alternativa
  pronta pra colar. Compara o que o contrato exige com o que o usuário realmente vende (prazo,
  revisões, pagamento), mede multa e prazo por comando, e separa o que dá pra resolver na
  conversa do que precisa de advogado.
  Use quando o usuário disser "mandaram um contrato pra eu assinar", "esse contrato tá abusivo?",
  "o que eu mudo antes de assinar", "recebi um NDA", "posso assinar isso?", "tem pegadinha nesse
  contrato", "o cliente mandou o contrato dele", "eles querem todos os direitos do meu trabalho",
  "a multa desse contrato é normal?", "60 dias pra pagar é normal?", ou /revisar-contrato.
---

# /revisar-contrato — O contrato que chegou pra assinar

> **Convenção de pastas:** a saída vai em `contratos/revisao-<cliente>.md`, com o manifesto e o Word ao lado. Na convenção **por cliente**, `clientes/<Nome>/contratos/`. A pasta nasce na primeira revisão.

Quem manda o contrato escreve o contrato. E quem escreve resolve todas as dúvidas a favor de
si mesmo: a multa vale contra um lado, o prazo de pagamento conta de um evento que só ele
controla, e a cláusula de propriedade leva o trabalho inteiro junto. Nada disso é má-fé
necessariamente. É o modelo que o jurídico dele usa desde 2014, e ninguém do outro lado nunca
pediu pra mudar. Esta skill lê o documento com o olho de quem vai assinar, aponta onde está o
dinheiro, e entrega a frase pronta pra substituir cada cláusula. Pedir mudança é normal, e a
maior parte passa na primeira rodada.

> **Isto não substitui advogado.** A skill faz triagem, calcula o que dá pra calcular e escreve
> a contraproposta. Valor alto, cessão definitiva de obra, não concorrência longa,
> responsabilidade ilimitada, arbitragem, lei estrangeira e briga já instalada passam por
> advogado antes de virar assinatura. A entrega diz isso uma vez, sem drama.

## Dependências

- **Contexto:** `_memoria/empresa.md` — razão social, CNPJ, cidade (o foro se discute com isso), o que o negócio vende, se é PF ou PJ
- **Tom:** `_memoria/preferencias.md` — a mensagem de devolução é negociação, e sai na voz do usuário
- **O que você vende:** `_memoria/oferta.md` — prazo, revisões incluídas, forma de pagamento, o que está e o que não está no escopo. É contra isso que o contrato é comparado
- **Preço:** o estudo do `/preco`, quando existir — o valor da rodada extra e o piso da hora entram na contraproposta
- **O seu contrato:** a saída do `/contrato`, quando existir. Cláusula que você já usa é o melhor texto alternativo, porque você sabe cumprir
- **Referência:** `templates/juridico/revisao-de-contrato.md` — artigo, fonte, data, redação alternativa de cada tema, checklist de NDA e a lista do que vai pro advogado
- **Scripts:** `scripts/revisar-contrato.js` (varredura, contas, conferência do manifesto e o `.docx` marcado com controle de alterações) e `scripts/gerar-docx.js` (extrai o texto do `.docx` recebido, e gera o documento de sugestões quando não há Word original)
- **Lei:** todo artigo sai do molde, conferido em 23/09/2026 com a URL oficial ao lado. Fora dele, `[a confirmar com advogado]`
- **Conferência:** `node scripts/verificar.js texto` na revisão
- **Saída:** `contratos/revisao-<cliente>.md`, o manifesto `contratos/revisao-<cliente>.json` e, quando o contrato vier em `.docx`, `contratos/revisao-<cliente>-marcado.docx` (o contrato do cliente com as alterações marcadas)

---

## Workflow

### Passo 1 — Dizer o que vai fazer, e onde o arquivo fica

Antes de abrir o documento, uma frase:

> "Vou ler o contrato inteiro, apontar o que é risco alto, médio e o que é só saber que você
> aceitou, e escrever a redação alternativa de cada ponto. Não mando nada pra ninguém: a
> revisão fica com você."

O arquivo recebido vai pra `dados/` com o nome de quem mandou (`dados/contrato-alfa-varejo.docx`).
Nunca substituir nada em `contratos/`: ali moram os contratos que o usuário emite, pelo
`/contrato`. Contrato de terceiro é insumo, não peça do negócio.

### Passo 2 — Ler o documento inteiro

Três formatos, três caminhos:

- **`.docx`**: `node scripts/gerar-docx.js --texto dados/contrato-alfa.docx | head -80` mostra o texto; a varredura do Passo 4 lê o `.docx` direto
- **PDF ou foto**: ler pela ferramenta Read, página por página. O comando não abre PDF, e é aqui que o manifesto do Passo 6 existe
- **Texto colado na conversa**: salvar como `dados/contrato-<cliente>.md` antes de revisar. Revisão de trecho solto é a forma mais fácil de perder a cláusula que contradiz a outra

**Ler o documento inteiro, sempre.** Contrato tem remissão: a cláusula 12 diz "salvo o disposto
no item 4.3", e o 4.3 é onde está o problema. Se o usuário mandou só a cláusula que o incomodou,
dizer que a revisão vale pra ela, e pedir o resto.

### Passo 3 — Levantar o que falta pra medir

Uma pergunta por vez, e só o que não está na memória:

1. "Qual é o valor total desse contrato? (ou o mensal e por quantos meses)"
2. "Quanto você fatura num mês normal?" É a régua do que é risco alto: multa de 20% é aborrecimento num contrato pequeno e é um mês de trabalho perdido num grande. O fechamento do `/caixa` responde sozinho quando existir
3. "Em quantos dias você costuma receber, e quantas rodadas de revisão você inclui?"
4. "Em que cidade você está?" (só se `_memoria/empresa.md` não disser — é com ela que o foro é conferido)
5. "O que já foi combinado por WhatsApp ou e-mail e precisa estar aqui?"
6. "Esse cliente você quer, precisa, ou tanto faz?" A resposta muda o tamanho da lista de pedidos, não o conteúdo do risco

A pergunta 5 é a que salva o trabalho: quase sempre existe uma promessa verbal (prazo de
resposta, quem fornece material, quem paga a licença de imagem) que o contrato não repete, e o
contrato assinado vale mais que o combinado no áudio.

### Passo 4 — Varrer por comando

A leitura humana passa batido pelo que só é grave em combinação, e não percebe ausência. O
script faz as duas coisas:

```bash
node scripts/revisar-contrato.js dados/contrato-alfa.docx \
  --valor "96.000" --mensal "18.000" --prazo 15 --revisoes 2 --cidade "Sinop/MT"
```

O que ele devolve, e por que cada coisa importa:

| Saída | O que é |
|---|---|
| Achado por linha e cláusula | tema, nível, o trecho citado, os agravantes encontrados, a base legal e a pergunta pra fazer |
| Conta da multa | 30% de R$ 96.000 são R$ 28.800, e isso é 1,6 mês do seu faturamento; multa fixa acima do valor do contrato acende o art. 412, e multa manifestamente excessiva é o art. 413 |
| Conta do prazo | 60 dias contra os 15 que o usuário pratica são 45 dias de caixa parado |
| Conta do foro | a comarca eleita comparada com a sua cidade, contra o art. 63, § 1º e § 5º, do CPC |
| Valores citados | todo `R$` do documento, do maior pro menor: é como se confere o valor do contrato antes de medir a multa |
| Simetria da multa | quantas frases de multa valem pras duas partes e quantas só contra quem presta |
| O que está faltando | prazo de pagamento, juros por atraso do cliente, limite de responsabilidade, lista do que não está incluso, LGPD |

Sem `--mensal`, o nível alto sai só do art. 412 e da leitura: o script avisa, porque percentual
sem o tamanho do negócio não separa R$ 600 de R$ 16.000.

Em NDA, a lista de ausência muda sozinha: exceções ao sigilo, prazo, ressalva de portfólio,
mutualidade e devolução da informação.

O script é triagem, não parecer. Cada achado precisa ser lido no contrato antes de entrar na
revisão, e o nível final é decidido no Passo 6, não pelo regex.

### Passo 5 — Comparar com o que você vende

É o passo que separa esta skill de um analisador genérico. Ler `_memoria/oferta.md` e o
contrato do `/contrato`, e montar a comparação linha a linha:

| Item | Na sua oferta | No contrato deles | Custo da diferença |
|---|---|---|---|
| Prazo de pagamento | 15 dias da nota | 60 dias da aprovação | 45 dias de caixa parado a cada mês |
| Revisões | 2 por entrega | ilimitadas até aprovar | 1 a 3 dias de trabalho por peça |
| Propriedade | licença de 5 anos | cessão perpétua e mundial | o portfólio e o reuso |
| Escopo | 12 peças/mês | 12 peças + atividades correlatas | o resto do seu mês |

A coluna da direita é o que faz o usuário entender. "Cessão perpétua" não move ninguém; "você
não vai poder mostrar esse trabalho no portfólio nem reaproveitar a ilustração" move.

Se a diferença de prazo muda o caixa do mês, o `/caixa` tem o número do custo fixo, e a conta
entra na revisão: contrato que paga em 60 dias com folha no dia 5 significa dois meses de
capital de giro que o usuário precisa ter.

### Passo 6 — Classificar o risco e preencher o manifesto

O nível sai da régua do molde: **alto** é o que pode custar mais que o contrato inteiro ou tirar
um direito que não volta; **médio** é o que custa caixa e tempo, e é onde a negociação ganha;
**atenção** é o usual que o usuário precisa saber que aceitou.

O manifesto é o arquivo que o assistente preenche (inclusive quando o contrato veio em PDF e a
leitura foi pelo Read) e o script confere:

```json
{
  "contrato": "Alfa Varejo — serviços de comunicação",
  "arquivo": "dados/contrato-alfa.pdf",
  "lido_em": "2026-09-23",
  "revisor": "<nome do usuário>",
  "valor": "96.000,00",
  "parcelas": ["48.000,00", "48.000,00"],
  "prazo_praticado": 15,
  "achados": [
    {
      "clausula": "5.1",
      "tema": "cessao",
      "nivel": "alto",
      "trecho": "cede de forma total, definitiva, irrevogável e irretratável, em caráter universal e perpétuo, todos os direitos autorais",
      "problema": "cessão definitiva e mundial sem contrapartida, incluindo modalidade que ainda não existe (art. 49, V da Lei 9.610/1998)",
      "redacao": "O CONTRATANTE recebe licença de uso das peças para as finalidades do escopo, em território nacional, por 5 anos renovável.",
      "percentual": null,
      "dias": null
    }
  ]
}
```

`percentual` e `dias` são o que o script recalcula: percentual vira reais sobre o valor, e `dias`
vira dias de caixa parado contra o `prazo_praticado`. O `trecho` é copiado literal do contrato,
porque é por ele que o Passo 8 acha o parágrafo no Word.

```bash
node scripts/revisar-contrato.js --manifesto contratos/revisao-alfa-varejo.json
```

Ele para se faltar cláusula, trecho citado, problema ou redação alternativa em ponto de nível
alto e médio, refaz as contas de percentual sobre o valor, confere se as parcelas somam o total
e imprime o **painel pronto pra colar** na revisão. Manifesto que não passa não vira entrega, e
também não vira `.docx` marcado: o Passo 8 depende deste passo ter fechado.

Um atalho útil: `--json` na varredura do Passo 4 devolve os achados já no formato do manifesto,
com `problema` e `redacao` vazios pra preencher.

### Passo 7 — Escrever a revisão

```markdown
# Revisão de contrato — <cliente> — <data>

> Documento revisado: <arquivo>, <n> páginas, recebido em <data>
> Valor: R$ <valor> · Vigência: <prazo>
> Contraproposta marcada: <arquivo -marcado.docx, ou "não se aplica: contrato recebido em PDF">
> **Esta revisão não substitui advogado.** Os pontos marcados com ⚖ vão pro advogado antes de assinar.

## Em uma frase
[dá pra assinar com as mudanças abaixo, ou não dá pra assinar como está, e por quê]

## Painel de risco
[a tabela que o --manifesto imprimiu: nível, contagem, o que fazer, e cláusula por cláusula]

## O que muda em relação ao que você vende
| Item | Na sua oferta | No contrato deles | Custo da diferença |
|---|---|---|---|

## Ponto por ponto
### <cláusula> — <tema> · <nível>
**O que está escrito:** "[trecho citado do contrato]"
**O problema:** [em português, com o número quando houver: 30% de R$ 96.000 são R$ 28.800]
**Base:** [artigo e lei, do molde]
**Redação alternativa:** [o parágrafo pronto pra colar]
**Se ele recusar:** [o meio do caminho aceitável, ou "aí é ponto de advogado"]

## O que levar pro advogado ⚖
| Ponto | Por que | Pergunta pronta |
|---|---|---|

## O que está faltando no contrato
[cada ausência, com a cláusula sugerida em uma linha]

## Mensagem de devolução
[o texto pronto pra enviar, com os 3 a 5 pedidos]

## O que não deu pra avaliar
[cláusula que remete a anexo não recebido, política externa, documento em outra língua]
```

Duas regras de escrita aqui. Citar o trecho **literal** entre aspas, sempre: revisão que resume
a cláusula com as próprias palavras é onde nasce o erro de interpretação. E escrever o problema
com o número, não com o adjetivo.

### Passo 8 — Devolver o contrato marcado em Word

O jurídico do outro lado não lê markdown. Ele abre o `.docx`, vê o que foi riscado, o que foi
inserido, e aceita ou recusa cláusula por cláusula. Quando o contrato chegou em `.docx`, é isso que
sai daqui, com controle de alterações de verdade:

```bash
node scripts/revisar-contrato.js --marcar dados/contrato-alfa.docx \
  --manifesto contratos/revisao-alfa-varejo.json \
  --saida contratos/revisao-alfa-varejo-marcado.docx
```

O script confere o manifesto primeiro e, se ele passar, reescreve cada parágrafo citado: o trecho
antigo vira exclusão marcada (`w:del`) e a sua redação vira inserção marcada (`w:ins`), no lugar
exato. O resto do contrato não é tocado — marcar a cláusula 3.2 não pode levar a 3.1 embora. No fim
ele lista o que casou, o que não casou, e reabre o arquivo gravado pra provar que abre.

Três coisas pra dizer ao usuário, quando valerem:

- O casamento é pelo campo `trecho`. Copiado literal, acha o parágrafo; parafraseado, não acha, e o
  script diz qual cláusula ficou de fora. Essas entram na revisão em texto, e nada mais
- **PDF não tem onde guardar marca de revisão.** Nesse caso a entrega é o documento de sugestões,
  uma seção por cláusula com o texto atual e o proposto lado a lado, gerado pelo `/word`
  (`node scripts/gerar-docx.js contratos/revisao-alfa-varejo-redacao.md --cabecalho "<negócio>"`).
  O `gerar-docx.js` recusa placeholder (`[a confirmar]`, `XXX`), então o `[a confirmar com
  advogado]` sai do arquivo antes, ou fica só na revisão em markdown
- A formatação interna do parágrafo marcado é simplificada: o texto continua inteiro, mas negrito
  no meio da frase pode virar texto comum ali. Contrato é conteúdo, e vale o aviso de uma linha

Quando o cliente devolver o contrato alterado, a comparação é do `/word`
(`node scripts/gerar-docx.js --comparar`), e o resultado volta pra cá se a mudança criar ponto novo.

### Passo 9 — Escrever a mensagem de devolução

Três coisas, nessa ordem: o sim, os pedidos, o prazo. No canal em que a conversa acontece
(`/whatsapp` calibra o formato quando for WhatsApp, `/email-profissional` quando for e-mail).

> "Li o contrato, tá tudo certo com o escopo e com o valor. Três pontos que eu preciso ajustar
> antes de assinar: [1] prazo de pagamento em 15 dias da nota, [2] a cláusula 5.1 como licença
> de uso em vez de cessão definitiva, com o portfólio liberado, [3] a multa da 6.1 valendo pros
> dois lados, com teto de 10%. Mandei a redação dos três em anexo. Se fechar essa semana,
> começo na segunda."

Máximo de 5 pedidos, e com a redação pronta. Lista de quinze pontos volta como "vamos conversar
depois" e o trabalho não começa. Ponto de nível atenção fica de fora do documento: entra na
conversa, se entrar.

### Passo 10 — Termo de uso de plataforma

Quando o documento é termo de uso de marketplace, banco, aplicativo ou rede social, a resposta
muda: **isso não se negocia.** É contrato de adesão, e revisar cláusula por cláusula é tempo
perdido. A entrega vira uma página com três coisas: o que o usuário está aceitando (suspensão
de conta, mudança unilateral de taxa, propriedade dos dados), o que tem plano B, e o que fazer
antes de depender daquela plataforma pra faturar. O art. 424 do Código Civil anula a renúncia
antecipada de direito próprio da natureza do negócio, e o `/blindar` cuida do lado técnico
quando o assunto é dado de cliente dentro de sistema.

### Passo 11 — Fechar

```bash
node scripts/verificar.js texto contratos/revisao-alfa-varejo.md
```

A entrega na conversa é curta: a frase do "dá pra assinar ou não", os três pontos de risco alto
com o número de cada um, o que vai pro advogado, e a mensagem de devolução pronta. O arquivo
inteiro fica em `contratos/` pra ele abrir na hora de negociar.

E uma linha em `tarefas.md`, porque revisão sem retorno morre: `- [ ] Aguardando retorno da
contraproposta do contrato da Alfa — enviada 22/09 (/revisar-contrato)`.

---

## Regras

- **Não substitui advogado, e a entrega diz isso uma vez.** A skill separa o que se resolve na conversa do que precisa de parecer. Os pontos de advogado saem numa lista própria, com a pergunta pronta pra economizar honorário
- Todo ponto cita o trecho **literal**, entre aspas. Resumo de cláusula com as próprias palavras é a origem do erro de revisão, e é também o que faz o `--marcar` não achar o parágrafo. Trecho longo se corta com reticências, sem mudar nenhuma palavra
- **Nunca inventar artigo de lei.** A base legal de cada tema está em `templates/juridico/revisao-de-contrato.md`, com URL e data de conferência. Se o caso não está no molde, escrever `[a confirmar com advogado]` em vez de citar artigo de memória
- Multa em reais, proporção sobre o valor, dias de caixa parado e soma das parcelas saem do `scripts/revisar-contrato.js`, nunca da cabeça. Número escrito na revisão que o comando não reproduz é número errado
- **O nível é da leitura, não do regex.** O script sugere; o assistente decide depois de ler a cláusula no contexto do contrato inteiro. Marcar tudo como risco alto é o mesmo que não marcar nada
- **Contrato de terceiro nunca vira arquivo do usuário.** O recebido fica em `dados/`; a revisão fica em `contratos/revisao-<cliente>.md`. O `/contrato` é que escreve contrato em nome do usuário, e essa fronteira não se cruza: revisar não é reescrever o contrato do outro por conta própria
- Cinco pedidos no máximo, com redação pronta, na ordem do que custa dinheiro. Negociação que pede tudo perde o que importa, e cliente pequeno costuma ceder mais do que empresa grande
- **Termo de uso de plataforma não se negocia.** Nesse caso a entrega é mapa de risco e plano B, nunca contraproposta (Passo 10)
- **Marca de revisão só em cima do `.docx` original.** O `--marcar` escreve `w:ins` e `w:del` dentro do arquivo que o cliente mandou, nunca num documento novo, e nunca grava nada quando nenhuma cláusula casou: contrato do cliente copiado sem marca não é contraproposta, e é o que o usuário mandaria de volta sem perceber. Contrato em PDF ou em foto sai como documento de sugestões, lado a lado
- **Fronteira com as vizinhas:** o `/contrato` escreve o contrato que o usuário emite (e reaproveita as redações deste molde); o `/word` exporta `.docx` e compara o que o cliente devolveu do contrato do próprio usuário; o `/cobranca` cuida do que já venceu; o `/preco` e a `/oferta` dizem o que o usuário vende, que é a régua do Passo 5; `/socios` é acordo entre sócios; `/emprestimo` é contrato de dinheiro emprestado; `/autorizacao` é uso de imagem e depoimento; o `/decidir` entra quando aceitar o contrato é decisão grande de negócio
- Contrato de terceiro é dado sensível. O contrato recebido tem CNPJ, endereço, nome de gente e às vezes preço de outro fornecedor. Não subir em revisor de contrato online, tradutor ou "analisador de PDF" na web: o script roda local, sem rede e sem chave. WebSearch, quando usada pra conferir lei, busca o termo genérico ("art. 49 Lei 9.610 cessão"), nunca o nome do cliente (LGPD)
- **Quando a resposta for "não assine", dizer "não assine".** Cessão perpétua sem contrapartida, responsabilidade ilimitada e não concorrência de 36 meses sem pagamento não são detalhe de negociação. Suavizar isso pra não estragar o clima é o oposto de ajudar
- **Silêncio também é cláusula.** Contrato sem juros por atraso do cliente, sem limite de responsabilidade e sem lista do que não está incluso é contrato pior que o que tem cláusula ruim escrita, porque a ausência não se discute na reunião
