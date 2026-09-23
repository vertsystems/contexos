# NPS — a pergunta única e o que fazer com a resposta

Referência do `/nps`. Não é o workflow: é o que a skill consulta pra explicar a conta, escrever a
pergunta, decidir se a amostra dá pra confiar, agrupar os "por quê" em temas e saber o que é
proibido fazer com o resultado. O `scripts/nps.js` faz as contas descritas aqui. Conferido em
23/09/2026; o que não tem fonte está marcado como `[a confirmar]`.

---

## De onde vem, e o que a crítica diz

A pergunta "você indicaria isso para um amigo?" virou métrica num artigo de Frederick Reichheld
na Harvard Business Review de dezembro de 2003, "The One Number You Need to Grow", que sustentava
ter visto o percentual de clientes dispostos a indicar acompanhar o crescimento das empresas
estudadas.

A tese forte, de que esse é **o** número que prevê crescimento, não se sustentou. Keiningham,
Cooil, Andreassen e Aksoy refizeram a análise com 21 empresas e mais de 15 mil entrevistas do
barômetro norueguês de satisfação, compararam com o índice americano (ACSI) e não reproduziram a
"clara superioridade" do NPS nos setores que Reichheld cita como exemplo (Journal of Marketing,
julho de 2007). Uma replicação da MeasuringU achou meio-termo: o NPS explicou 38% da variação do
crescimento em dois anos, contra os 76% do artigo original.

Serve aqui por um motivo prático, não por causa da tese: nota de 0 a 10 mais um "por quê" é a
pesquisa mais curta que existe, cabe numa mensagem de WhatsApp, e a nota separa a base em três
grupos que pedem ações diferentes. O valor está na triagem, não no número.

---

## As três faixas

| Nota | Grupo | O que significa |
|---|---|---|
| **9 e 10** | Promotor — indica sem ser pedido | Depoimento, indicação, avaliação pública |
| **7 e 8** | Neutro — fica até aparecer algo melhor | Uma pergunta: o que faltou pra ser 10 |
| **0 a 6** | Detrator — vai falar mal se tiver onde | Recuperação agora, antes de virar uma estrela pública |

Nota 7 não é boa nota: é o resultado mais perigoso da lista, porque parece elogio e é
indiferença. Quem responde 8 está satisfeito e não está preso.

**NPS = % de promotores − % de detratores**, em pontos, de −100 a +100. Neutro não entra na conta, só no denominador.

---

## Por que a média engana

Oito clientes, todos com nota 8. Média 8,0: parece ótimo. NPS 0: não há um único cliente que indica o negócio sem ser pedido.

O `scripts/nps.js` imprime a média ao lado do NPS pra mostrar a diferença. A média mistura os
grupos e suaviza o extremo; o NPS joga o meio fora de propósito, porque é no extremo que está o
comportamento de indicar e de reclamar. Duas notas 10 e duas notas 2 dão média 6,0 e NPS 0.

---

## A pergunta única, no WhatsApp

Uma mensagem, uma pergunta, resposta em um toque. Sem formulário, sem link, sem "leva só dois minutinhos".

> Oi, [Nome]. De 0 a 10, quanto você indicaria o [serviço] pra um amigo?
>
> Só o número já ajuda. Se quiser dizer o motivo em uma linha, melhor ainda.

O que faz essa mensagem funcionar:

- **O número primeiro** — responder é digitar um caractere; pedido de texto livre morre na lista
- **O "por quê" opcional** — quem está irritado escreve sozinho, e quem está satisfeito manda só
  o 10, o que já basta pra triagem
- **Nome do serviço, não "nossa empresa"** — a pessoa precisa saber de qual entrega você fala
- **Sem link e sem elogio embutido** — link de formulário no WhatsApp parece cobrança ou golpe, e
  "que tal nosso atendimento incrível?" contamina a resposta

Quando a resposta vier, responda. Toda resposta, inclusive o 10 seco: "obrigado, [Nome]".
Pesquisa que não gera resposta ensina o cliente a não responder a próxima.

---

## Quando perguntar

**D+7 da entrega.** Sete dias depois de entregar, não no dia.

No dia da entrega a pessoa responde no calor: eufórica, ou irritada com um detalhe que ia se
resolver sozinho. Uma semana depois já usou, já viu se funciona, e a nota mede a entrega em vez
do último minuto do atendimento. Exceções que valem:

- **Serviço de resultado lento** (ortodontia, consultoria, reforma) — no marco, não no fim: fim
  da fase 1, primeiro mês de uso
- **Mensalidade** — a cada três ou quatro meses. Quem some antes é assunto do `/retencao`
- **Comércio local com compra repetida** — na segunda compra, não na primeira

E o que não fazer: perguntar duas vezes pra mesma pessoa no mesmo trimestre, perguntar dentro
da loja com o dono olhando, perguntar junto com a cobrança.

---

## Quantas respostas você precisa

A margem de erro de 95% do NPS sai de uma variável que vale +1 no promotor, 0 no neutro e −1 no detrator:

```
margem = 1,96 × raiz( ((p + d) − (p − d)²) ÷ n ) × 100
```

Com metade promotores e um quinto detratores (NPS +30), calculada por `node scripts/nps.js`:

| Respostas | NPS | Margem | Faixa provável | Diferença mínima que dá pra enxergar |
|---|---|---|---|---|
| 10 | +30 | ±48 | −18 a +78 | 68 pontos |
| 20 | +30 | ±34 | −4 a +64 | 48 pontos |
| 30 | +30 | ±28 | +2 a +58 | 40 pontos |
| 50 | +30 | ±22 | +8 a +52 | 31 pontos |
| 100 | +30 | ±15 | +15 a +45 | 22 pontos |
| 200 | +30 | ±11 | +19 a +41 | 15 pontos |
| 400 | +30 | ±8 | +22 a +38 | 11 pontos |

Leitura dura da tabela: pra afirmar que o NPS subiu 10 pontos seriam necessárias cerca de 470
respostas por período. Negócio pequeno não tem isso e não precisa ter; o que ele precisa é parar
de tratar variação de amostra como resultado. As três réguas que o script aplica:

- **Menos de 10 respostas** — não existe NPS. Leia os comentários um por um
- **Margem acima de 20 pontos** — serve pra abrir conversa, não pra sustentar meta
- **Margem até 10 pontos** — dá pra comparar períodos

Quando todas as respostas caem no mesmo grupo a fórmula dá margem zero, o que é falso. Aí vale a
regra dos três: o teto de 95% de um evento que não apareceu em n tentativas é cerca de 3 ÷ n.
Oito notas 8 viram NPS 0 com margem de ±38 pontos, não ±0.

---

## A triagem, que é o produto

O número é o subproduto. O que muda o mês é a lista de quem contatar.

| Grupo | Ação | Prazo | Quem cuida |
|---|---|---|---|
| **10** | Pedido de depoimento usando a frase que ele escreveu | 48 horas | `/pos-venda` |
| **9** | Mesmo pedido, e perguntar o que falta pro 10 | Uma semana | `/pos-venda` |
| **7 e 8** | Uma pergunta: "o que faltaria pra ser 10?" | Uma semana | o dono, no WhatsApp |
| **4 a 6** | Mensagem que nomeia o problema e oferece conserto | 24 horas | o dono |
| **0 a 3** | Ligação, não mensagem | No mesmo dia | o dono |

A pressa no detrator tem motivo: cliente insatisfeito que não é ouvido em particular vira
avaliação pública, e depois de publicada a conversa acontece na vitrine do negócio, com o
`/responder-avaliacoes`. O promotor também tem prazo, por outro motivo: a memória do bom
serviço desbota em duas semanas. Depoimento pedido em D+7 vem com detalhe; em D+60 vem com
"excelente profissional".

---

## Os temas do "por quê"

Comentário solto não decide nada; cinco comentários no mesmo tema decidem. O agrupamento é
trabalho de leitura, não de contagem de palavra: o assistente lê os "por quê", propõe os temas
e preenche um manifesto JSON que o script confere (todo comentário em exatamente um tema,
nenhum nome inventado):

```bash
node scripts/nps.js respostas.csv --temas temas.json
```

Os temas que aparecem na maioria dos negócios pequenos, com a palavra que o cliente usa:

| Tema | Como o cliente fala | Onde o conserto fica |
|---|---|---|
| **Prazo** | "demorou", "marcaram e não vieram", "ficou pra depois" | `/procedimento`, `/capacidade` |
| **Comunicação** | "ninguém me avisou", "sumiram", "tive que ficar cobrando" | `/pos-venda` |
| **Preço e surpresa** | "cobraram mais no fim", "não estava no orçamento" | `/preco`, `/proposta` |
| **Qualidade da entrega** | "veio torto", "não ficou como no combinado" | `/procedimento` |
| **Atendimento** | "atenderam mal", "pareceu má vontade" | `/whatsapp` |
| **Expectativa errada** | "achei que incluía", "não era isso que eu entendi" | `/oferta`, `/contrato` |
| **Acesso** | "difícil de marcar", "não achei o endereço", "não atendem o telefone" | `/confirmacao-de-agenda` |

Regra de leitura: um tema só existe com **três** ocorrências no mesmo período, ou com uma grave
o bastante pra ter custado o cliente. Dois comentários parecidos são coincidência. A citação
fica no arquivo literal, entre aspas, com o primeiro nome: comentário parafraseado perde a
força e o dono deixa de reconhecer o próprio cliente.

---

## O que o Google proíbe

Convite seletivo pra avaliação, o chamado review gating, é proibido. A política de conteúdo do
Google não permite que empresas:

> "Desencorajem ou proíbam avaliações negativas ou peçam avaliações positivas aos clientes de
> forma seletiva."

A mesma página proíbe exigir um número de avaliações da equipe e pedir avaliação com conteúdo
específico. Sobre benefício em troca de nota, a política do Perfil da Empresa é direta:

> "Oferecer aos clientes incentivos, como produtos ou serviços sem custos financeiros ou com
> desconto, em troca de avaliações, mudanças em avaliações ou remoção de avaliações negativas
> é considerado engajamento falso e é estritamente proibido."

**A diferença que importa:** a pesquisa interna de NPS é sua, o convite pra avaliar no Google é
público. Perguntar a nota por WhatsApp é pesquisa; mandar o link do Google só pra quem deu 9 ou
10 é filtro por sentimento, e é isso que a política proíbe. Quem convida pra avaliar em público
convida todo mundo, mesmo texto e mesma hora, independente da nota. O detrator recebe conserto
do problema em conversa privada, o que é legítimo, nunca um caminho diferente pra deixar de
avaliar. Links das duas políticas em Fontes.

---

## Dado pessoal

Nota, comentário e nome juntos formam dado pessoal, e a pesquisa é tratamento de dado sob a
LGPD (Lei 13.709/2018, https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm,
conferido em 22/09/2026):

- A pesquisa com cliente da casa costuma se apoiar no legítimo interesse do controlador
  (art. 7º, IX), que exige finalidade concreta e expectativa legítima do titular. Enquadrar o
  caso é conversa com advogado, não com a skill
- O art. 18 lista os direitos do titular (confirmação, acesso, correção, eliminação,
  informação); a oposição ao tratamento sem consentimento está no § 2º e vem condicionada a
  descumprimento da lei. Na prática nada disso muda o que o negócio faz: quem pede pra não
  receber mais pesquisa sai da lista, a saída fica registrada, e ninguém discute enquadramento
  com o cliente
- Depoimento público precisa de autorização explícita, pelo `/autorizacao`: nota de pesquisa não é permissão pra publicar frase com nome
- Paciente é dado sensível: pesquisa de clínica não nomeia procedimento nem diagnóstico na
  mensagem, e a planilha de respostas não circula por ferramenta externa
- Lista de respostas não sai do workspace sem o dono autorizar

---

## Erros comuns

- **Calcular a média** em vez de promotores menos detratores
- **Comemorar variação dentro da margem.** De +30 pra +45 com 20 respostas é ruído
- **Perguntar e não fazer nada.** Pesquisa sem triagem é só incômodo pro cliente
- **Perguntar só pra quem você acha que está satisfeito.** O número fica bonito e falso, e no
  Google isso é infração
- **Misturar canal.** Quem respondeu por WhatsApp e quem respondeu na loja com o dono olhando não são a mesma população
- **Publicar NPS de serviço com três respostas.** Marque como amostra pequena ou não mostre
- **Perseguir benchmark de setor.** Número comparável de NPS por setor no Brasil é
  `[a confirmar]`: as tabelas que circulam vêm de painéis pagos, com metodologia e amostra que
  não se conferem. Compare o negócio com ele mesmo

---

## Fontes

| O que | Onde | Conferido |
|---|---|---|
| Origem do NPS | https://hbr.org/2003/12/the-one-number-you-need-to-grow | 23/09/2026 |
| Falha em replicar a superioridade do NPS | https://journals.sagepub.com/doi/10.1509/jmkg.71.3.039 | 23/09/2026 |
| Replicação com 38% da variação explicada | https://measuringu.com/nps-replication/ | 23/09/2026 |
| Convite seletivo proibido | https://support.google.com/contributionpolicy/answer/7400114?hl=pt-BR | 23/09/2026 |
| Incentivo por avaliação proibido | https://support.google.com/business/answer/3474122?hl=pt-BR | 23/09/2026 |
| LGPD (art. 5º II, 7º IX, 18 § 2º) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm | 23/09/2026 |

Margem de erro, faixa e tabela de amostra: calculadas por `scripts/nps.js`, fórmula no cabeçalho do arquivo.
