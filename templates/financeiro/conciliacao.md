# Conciliação bancária — o extrato contra o que deveria ter acontecido

Referência do `/conciliar`. O `/caixa` lê a conciliação do mês antes de fechar, e o
`/cobranca` recebe daqui a lista do que foi combinado e não caiu.

Por que existe: o fechamento do mês costuma nascer de uma soma do extrato, e o extrato só
conta o que aconteceu. Não conta a fatura que o cliente ainda não pagou, a venda no cartão
que caiu com a taxa descontada, nem a tarifa de R$ 12,90 que ninguém lançou. Conciliar é
colocar os dois lados na mesma mesa, o banco e o que o negócio registrou, e explicar cada
diferença. A regra que sustenta tudo: **nenhuma diferença some em silêncio.** Sobra de
R$ 0,37 aparece na lista com o mesmo destaque de sobra de R$ 3.998,00.

> Formatos de arquivo dos bancos e o comportamento do parser foram conferidos em
> 22/09/2026 nas fontes do fim. Banco muda layout de exportação sem avisar: quando o
> `scripts/conciliar.js` acusar coluna que não achou, o molde é o primeiro lugar a atualizar.

---

## O que entra de cada lado

| Lado | O que é | De onde vem | Sinal |
|---|---|---|---|
| **Banco** | o que de fato entrou e saiu da conta | OFX ou CSV exportado do internet banking, ou .xlsx que o usuário montou | entrada positiva, saída negativa |
| **Registros** | o que deveria ter entrado e saído | faturas de `/proposta` e `/contrato`, relatório da maquininha, cobranças Pix, lançamentos do `/caixa` | entrada positiva, saída negativa |

Um lançamento só existe uma vez em cada lado. O registro "Fatura de setembro, R$ 2.380,50"
casa com **um** crédito do banco; se dois créditos parecidos aparecem, o segundo sobra em
"só no banco" e alguém precisa explicar.

Conta de pessoa física misturada com a do negócio entra do mesmo jeito: a linha do mercado
vai aparecer em "só no banco, a identificar", e é isso mesmo. O `/caixa` classifica como
retirada depois.

---

## Os formatos que os bancos exportam

| Banco | Formato | O que tem de particular | Como o parser trata |
|---|---|---|---|
| Itaú | OFX 1.0.2 (SGML) e CSV | OFX com `ENCODING:USASCII` e `CHARSET:1252`, acento em CP1252, sem tag de fechamento; CSV sem cabeçalho, `data;lançamento;valor` | tenta UTF-8 estrito, cai pra Windows-1252; CSV sem cabeçalho é lido como data, descrição, valor |
| Banco do Brasil | OFX (SGML) e CSV com aspas | CSV com "Data", "Dependencia Origem", "Histórico", "Data do Balancete", "Número do documento", "Valor"; linhas "Saldo Anterior" e "S A L D O" no meio | acha o cabeçalho pelo nome das colunas; linha sem data ou com descrição de saldo é pulada |
| Nubank PJ | OFX 2.x (XML, UTF-8) e CSV com vírgula | CSV `Data,Valor,Identificador,Descrição`, valor com ponto decimal; OFX com tag de fechamento | separador detectado pela primeira linha; XML e SGML passam pela mesma leitura de `<STMTTRN>` |
| Inter | OFX e CSV com preâmbulo | três ou quatro linhas de título antes do cabeçalho `Data Lançamento;Histórico;Descrição;Valor;Saldo` | procura o cabeçalho nas 30 primeiras linhas; Histórico e Descrição viram uma descrição só |
| Outros (Sicoob, Bradesco, Santander, C6) | OFX | mesmo SGML do Itaú; alguns gravam `TRNAMT` com vírgula e repetem `FITID` | vírgula no `TRNAMT` é aceita; `FITID` repetido é ignorado com aviso |

Valor com sufixo `D` ou `C` (`1.234,56 D`), entre parênteses ou com sinal no fim é lido
como negativo quando for débito. Coluna dupla de Crédito e Débito vira um valor só. Data
sai em `DD/MM/AAAA`, `AAAA-MM-DD`, `AAAAMMDD` (o do OFX, com fuso no fim) e `DD/MM/AA`.

Onde exportar, nos quatro bancos, costuma ser "Extrato → Exportar → OFX" no computador;
no aplicativo alguns só mandam PDF. PDF o assistente lê pela ferramenta Read e transcreve
num CSV, mostrando a transcrição antes de conciliar, porque um dígito trocado ali vira
diferença sem explicação.

---

## Que linha entra no mês

| Lado | Entra | Por quê |
|---|---|---|
| **Banco** | só o que caiu entre o dia 1 e o último dia do mês | o crédito de 02/10 é movimento de outubro; consumi-lo aqui deixaria um buraco na conciliação de outubro |
| **Registros** | o mês inteiro mais a janela da camada 3 pra trás e pra frente (5 dias úteis, padrão) | a fatura de 28/09 paga no dia 30 casa; a de 30/08 paga no dia 02/09 também |

Consequência a dizer ao usuário, porque ela aparece todo mês: recebível previsto no
fim do mês e pago nos primeiros dias do seguinte fica em "só nos registros" aqui, e
aparece conciliado na conciliação do mês seguinte. É o item em trânsito da
contabilidade, não um erro do casamento. Cobrar quem pagou em 02/10 uma fatura de
30/09 é o efeito colateral de ignorar essa linha: por isso a lista de sobras passa
pelo usuário antes de virar régua de cobrança.

Quando o arquivo exportado pega dois meses (o normal em extrato baixado no meio do
mês), o script escolhe o mês com mais lançamentos, escreve a escolha nos avisos e
deixa o resto em "fora do mês". No empate vale o mês mais recente. Pra conciliar o
outro, é `--mes AAAA-MM`.

---

## As quatro camadas do casamento

Cada linha casa **uma vez**. As camadas rodam na ordem, da mais estrita à mais folgada, e
a saída diz em qual camada cada par fechou. Par de camada 3 ou 4 merece um olhar humano.

| Camada | Regra | Tolerância padrão | O que costuma pegar |
|---|---|---|---|
| **1** | mesmo valor em centavos, mesma data | nenhuma | Pix na hora, débito automático no dia |
| **2** | mesmo valor, data próxima | até 2 dias úteis | TED que compensa no dia seguinte, boleto pago na véspera, fatura vencida no domingo |
| **3** | nome parecido e valor igual em até 30 dias corridos; ou nome parecido e valor até 2% diferente em até 5 dias úteis | 2% e 5 dias úteis | fatura de agosto paga em setembro; Pix com R$ 15 a menos por desconto combinado |
| **4** | um lançamento de um lado igual à soma de 2 ou 3 do outro | soma exata (± R$ 0,02), 5 dias úteis, 12 candidatos mais próximos | cliente que pagou duas parcelas num Pix só; repasse da maquininha em dois créditos |

"Nome parecido" é: mesmo CPF ou CNPJ nos dois textos; ou uma palavra de 5 letras ou mais em
comum depois de tirar "pix", "recebido", "transf", "ltda" e afins; ou metade das palavras em
comum (coeficiente de Dice de 0,5). "PIX RECEBIDO JOÃO DA SILVA" casa com "João da Silva ·
Parcela 1/2"; "PIX RECEBIDO" sozinho não casa com ninguém pela camada 3, e precisa das
camadas 1 e 2 (valor e data).

Nome de mês é palavra ignorada, junto com "pix", "fatura" e "parcela". Sem isso,
"Fatura setembro" de um cliente casaria com "FATURA SETEMBRO" de outro só porque os
dois textos têm a palavra "setembro", e o par sairia com a etiqueta de nome parecido
sem nome nenhum em comum. Quando os dois lados só trazem o mês, o par tem de vir de
valor e data.

Por que o um-pra-muitos para em 3 lançamentos e 12 candidatos: sem limite, achar "quais
linhas somam R$ 3.910,20" é o problema da soma de subconjuntos, e com 40 lançamentos numa
janela ele encontra combinação pra qualquer valor, inclusive as erradas. Três parcelas em
cinco dias úteis é o que acontece na vida real; mais do que isso é relatório de maquininha,
e aí o certo é conciliar contra o relatório dela, linha a linha.

Toda tolerância aparece no cabeçalho do arquivo de saída, e o valor que a camada 3
aceitou de folga aparece somado no quadro "Bate a zero", nunca escondido dentro do par.

---

## Como classificar o que sobrou

**Só no banco** (aconteceu na conta e ninguém registrou):

| Classe | Como reconhecer no extrato | O que fazer |
|---|---|---|
| tarifa | "tarifa", "pacote", "cesta", "manutenção" | lançar no caixa como custo fixo |
| juros e encargos | "juros", "IOF", "encargo", "mora" | lançar e descobrir o que atrasou |
| imposto | "DAS", "DARF", "GPS", "INSS", "FGTS", "ISS" | lançar; bater com o `/obrigacoes` |
| rendimento ou aplicação | "rendimento", "resgate", "CDB", "aplicação" | lançar como rendimento; não é venda |
| estorno | "estorno", "devolução", "chargeback" | achar a venda ou compra de origem |
| Pix não identificado | "pix" sem nome, ou com nome que não bate com registro nenhum | abrir o comprovante no aplicativo do banco: ele traz o nome do pagador e o identificador ponta a ponta do Pix. Achado o pagador, criar o registro e rodar de novo |
| cartão ou maquininha | "Stone", "PagSeguro", "Cielo", "Rede", "Getnet", "SumUp", "Mercado Pago", "InfinitePay" | comparar com o relatório da adquirente, **pelo líquido** |
| a identificar | o resto | perguntar ao usuário; se for venda, criar o registro; se for gasto, lançar |

**Só nos registros** (era pra ter acontecido e não apareceu no banco):

| Classe | O que significa | O que fazer |
|---|---|---|
| recebível que não caiu | fatura, parcela ou Pix combinado que o cliente não pagou até o fim da janela | vai pro `/cobranca` com a data prevista como vencimento |
| pagamento registrado que não saiu | conta que o usuário anotou como paga e o banco não mostra | foi pago por outra conta? em dinheiro? ou não foi pago |
| repasse de maquininha que não caiu | o relatório diz que vendeu, a conta não recebeu | conferir prazo de repasse (D+1, D+14, D+30) e antecipação |

Antes de classificar, o script cruza as duas listas de sobra com o que ficou fora do mês,
e a linha que bate troca de classe em vez de sair da lista:

| Sobra | Cruza com | Como bate | Vira |
|---|---|---|---|
| só nos registros | lançamento do extrato fora do mês | mesmo valor, até 2 dias úteis | "casou com lançamento fora do mês": conferir na conciliação daquele mês, e o `--cobranca` deixa de fora |
| só no banco | registro previsto fora do mês | mesmo valor e data vizinha, ou mesmo valor e nome parecido | "bate com registro previsto fora do mês": recebimento de outra competência, não venda sem registro |

Esse cruzamento existe por um erro concreto: a fatura prevista em 28/08 entra na
conciliação de setembro pela janela, o crédito dela caiu em 28/08 e está fora do mês, e
sem o cruzamento a cliente que pagou em agosto sai na lista de cobrança de setembro. A
linha permanece visível e somada nos dois casos; o que muda é o destino escrito.

Repasse de maquininha nunca vai pra régua de cobrança: não é cliente, e a adquirente paga
no prazo do contrato. O `--cobranca` do script já deixa essas linhas de fora.

---

## O quadro que fecha a zero

```
Movimento do mês no banco            − só no banco            = conciliado (lado banco)
Movimento do mês nos registros       − só nos registros       = conciliado (lado registros)
conciliado (banco) − conciliado (registros) = diferença entre os lados
diferença entre os lados − folga da camada 3 − centavos da camada 4 = 0,00
```

Se a última linha não é zero, o script recusa gravar: é erro de lógica, não de dado. Não
existe conciliação "quase fechada".

O quadro não é o saldo da conta. Saldo é estoque; o quadro é fluxo. Quando o extrato traz
o saldo final (o OFX quase sempre traz, no `LEDGERBAL`), o script mostra ao lado, e com
`--saldo-inicial` confere se `inicial + movimento = final`. Diferença aí é lançamento que
faltou no arquivo exportado (período errado, página que não veio), e o conserto é exportar
de novo, não ajustar o número.

---

## Maquininha: bruto, líquido e prazo

O registro da venda no cartão vem no bruto (R$ 3.998,00). O banco recebe o líquido, com
a taxa da adquirente descontada (R$ 3.910,20 numa taxa de 2,2%). Diferença de 2,2% não
passa na camada 3, que aceita 2%, e isso é de propósito: a taxa não é tolerância, é custo
variável que o `/caixa` precisa ver. O jeito certo é registrar o **líquido** que o
relatório da adquirente informa, ou registrar o bruto e a taxa em duas linhas.

Prazo de repasse muda por adquirente e por modalidade: débito até 1 dia útil, crédito
à vista até 30 dias, parcelado uma parcela por mês conforme o cliente paga, e antecipação
antes disso com taxa extra (Cielo, "Prazo de recebimento da maquininha":
https://blog.cielo.com.br/cielo-e-voce/prazo-recebimento-maquininha/, conferido em
23/09/2026; a própria página diz que o prazo varia conforme o contrato). O prazo do
contrato do usuário com a adquirente é o que vale, e o molde não carrega tabela por
adquirente porque cada uma muda a sua sem aviso: o número certo está no relatório que a
maquininha exporta.

---

## Sinais de que a conciliação está errada, não o banco

- **Muitos pares na camada 4.** Se mais de um em cada cinco pares fechou por soma, a janela
  está larga ou o registro está agregado (uma linha "vendas da semana" contra Pix a Pix).
  Registrar por venda, ou conciliar a semana contra o relatório, não contra o extrato
- **Mesmo cliente em "só no banco" e em "só nos registros"** com valores parecidos: o nome
  está escrito diferente nos dois lados (apelido no registro, razão social no banco). O
  conserto é padronizar o registro com o nome que o banco mostra
- **Sobra idêntica em dois meses seguidos.** Tarifa ou mensalidade que ninguém lança vira
  padrão: entra como custo fixo no `/caixa` e some da lista
- **Linha repetida nos dois lados.** O script avisa quando data, valor e descrição se repetem.
  Pode ser duas sessões no mesmo dia (verdade) ou lançamento duplicado (erro); só o usuário
  sabe
- **Registro atrasado que casou na camada 3 com um Pix de outro cliente.** Nome parecido e
  valor igual em 30 dias não é prova. Conferir o comprovante quando dois clientes pagam o
  mesmo valor no mesmo mês

---

## Léxico

- **Conciliação** — comparar dois registros da mesma coisa (o banco e o seu) e explicar cada diferença
- **Só no banco** — aconteceu na conta e não está nos seus registros; também chamado de "bank-only"
- **Só nos registros** — está nos seus registros e não aconteceu na conta; também "book-only" ou "em trânsito"
- **Camada** — a regra que decidiu um par; quanto maior o número, mais folgada a regra
- **Tolerância** — a diferença de valor ou de data que uma camada aceita; toda tolerância é declarada no arquivo
- **Um-pra-muitos** — um lançamento de um lado que corresponde à soma de dois ou três do outro
- **OFX** — Open Financial Exchange, o formato de extrato que todo banco brasileiro exporta; a versão 1.x é SGML sem fechamento de tag, a 2.x é XML
- **FITID** — identificador único do lançamento no OFX; quando o banco repete, o script ignora a cópia
- **CP1252** — a codificação de texto do Windows que os bancos usam mesmo declarando USASCII; é o que faz "João" virar "Jo�o" em quem lê como UTF-8
- **Adquirente** — a empresa da maquininha (Stone, Cielo, Rede, PagSeguro, Getnet, SumUp); recebe do cartão e repassa ao lojista com a taxa descontada
- **Repasse** — o valor líquido que a adquirente deposita na conta
- **Ledger balance** — o saldo final que o OFX traz no bloco `LEDGERBAL`
- **Identificador ponta a ponta (EndToEndId)** — o campo que o Banco Central define pra identificar cada Pix de forma única; é o que o comprovante mostra e o que permite o banco achar a transação quando o extrato não traz o nome do pagador (BCB, Manual de Padrões para Iniciação do Pix: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf, conferido em 23/09/2026)
- **Item em trânsito** — recebível previsto num mês e pago no seguinte; fica em "só nos registros" aqui e conciliado no mês em que caiu

---

## Fontes

- Anthropic, skill oficial de reconciliação (método dos dois lados ajustados, categorias de diferença, "track open items to resolution"): https://github.com/anthropics/knowledge-work-plugins/blob/main/finance/skills/reconciliation/SKILL.md, conferido em 22/09/2026
- Receiptor AI, bank-reconciliation (camadas de casamento com tolerância decrescente, "never silently discard unmatched items, even if it's $0.50"): https://github.com/Receiptor-AI/bookkeeping-skills/blob/main/skills/bank-reconciliation/SKILL.md, conferido em 22/09/2026
- ofx-br, leitor de OFX brasileiro (SGML sem fechamento, CP1252 declarado como USASCII, deduplicação por FITID): https://github.com/chiarelli-dev/ofx-br, conferido em 22/09/2026
- Nubank, exportar extrato da conta PJ em OFX, CSV e PDF: https://blog.nubank.com.br/extrato-ofx-pdf-conta-pj-nubank/, conferido em 22/09/2026
- InfinitePay, Pix cobrança (como a cobrança Pix aparece pro pagador e pro recebedor): https://www.infinitepay.io/blog/pix-cobranca, conferido em 22/09/2026
- Cielo, prazo de recebimento por modalidade (débito até 1 dia útil, crédito à vista até 30 dias): https://blog.cielo.com.br/cielo-e-voce/prazo-recebimento-maquininha/, conferido em 23/09/2026
- Banco Central, Manual de Padrões para Iniciação do Pix (define o identificador ponta a ponta de cada Pix): https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf, conferido em 23/09/2026
- Layout das colunas de CSV (Itaú, BB, Inter, Nubank): observado em arquivos exportados; o parser acha as colunas pelo nome, então layout novo sai como aviso, não como leitura errada. Sem fonte oficial pública: [a confirmar] no arquivo do usuário a cada mês
