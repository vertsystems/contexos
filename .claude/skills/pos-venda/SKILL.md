---
name: pos-venda
description: >
  Cuida do que vem depois do "fechou": mensagem de boas-vindas e alinhamento de expectativa,
  acompanhamento durante a entrega, pedido de depoimento na hora certa, reativação de cliente
  parado e recuperação de orçamento que ficou sem resposta. Gera as mensagens prontas e a lista
  de quem contatar, na ordem.
  Use quando o usuário disser "o cliente fechou, e agora", "como peço depoimento",
  "cliente sumiu", "orçamento sem resposta", "quero trazer cliente antigo de volta",
  "pós-venda", "como fidelizo", "mandar follow-up", ou /pos-venda.
---

# /pos-venda — Depois do fechou

> **Convenção de pastas:** a saída vai em `vendas/pos-venda/`. Na convenção **por cliente**, `clientes/<Nome>/vendas/`. A pasta nasce na primeira sequência.

Vender pra quem já comprou é o dinheiro mais barato que existe: não tem custo de anúncio,
não tem objeção de confiança, e a conversa começa no meio. Mesmo assim, é a parte que quase
todo pequeno negócio deixa acontecer por acaso.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que foi vendido, prazo de entrega, canal de contato
- **Tom:** `_memoria/preferencias.md` — mensagem de pós-venda soa falsa quando não é a voz do usuário
- **Cliente real:** `_memoria/publico.md`, se existir — a palavra que ele usa
- **Oferta:** `_memoria/oferta.md` — o que estava prometido, e o prazo. É contra isso que a expectativa é alinhada
- **Onde o depoimento vai parar:** `biblioteca.md` (`/biblioteca`)
- **Quem está parado, contado:** `pessoas/indice.md` (`/pessoa`), seção "No vácuo" filtrada por `papel: cliente` — os dias sem contato vêm somados por script, não de memória
- **Base de clientes:** `dados/clientes.csv` (`/cadastro-clientes`), se existir — a lista sai filtrada por `situacao = parado`, ordenada por `valor_total`, pulando quem tem `nao_contatar = sim`
- **Saída:** `vendas/pos-venda/<situacao>-<AAAA-MM-DD>.md`

---

## Workflow

### Passo 1 — Descobrir a situação

As cinco situações pedem mensagens diferentes. Perguntar qual é, se não estiver claro:

| Situação | O que ela resolve |
|---|---|
| **Acabou de fechar** | Alinhar expectativa antes que ela vire frustração |
| **Entrega em andamento** | Sumiço do fornecedor é a reclamação nº 1 de serviço |
| **Acabou de entregar** | A única janela boa pra pedir depoimento e indicação |
| **Cliente parado** | Ele não foi embora; só não teve motivo pra voltar |
| **Orçamento sem resposta** | Quase sempre não é preço, e ninguém pergunta |

### Passo 2 — Montar a sequência da situação

**Acabou de fechar**: mandar no mesmo dia:
1. Confirmação do que foi contratado, em uma linha, na palavra dele
2. O que vai acontecer e **quando** (data, não "em breve")
3. O que você precisa dele pra começar — específico, com prazo
4. Como falar com você e em quanto tempo você responde

O item 4 é o que mais reduz mensagem ansiosa depois. Prometer o que se cumpre: "respondo
em até um dia útil" vale mais que "estou sempre à disposição".

**Durante a entrega**: um contato por marco, e um antes de qualquer atraso:
- Avisar o atraso **antes** de ele acontecer, com a nova data. Atraso avisado é contratempo; atraso descoberto é quebra de confiança
- Mostrar progresso mesmo quando não há novidade ("essa semana ficou X, semana que vem começa Y")

**Acabou de entregar**: a janela de ouro, e ela fecha rápido:
1. Confirmar que ficou como ele esperava — e ouvir de verdade antes de pedir qualquer coisa
2. Se ficou: pedir o depoimento **agora**, com pergunta específica
3. Se não ficou: resolver primeiro. Depoimento pedido em cima de um problema aberto queima a relação

Pedido de depoimento que funciona é o que dá o trabalho pronto:

> "Ficaria muito grato por duas linhas sobre como estava antes e como ficou.
> Se ajudar, pode responder só isso: **qual era o problema, o que mudou, e
> se você indicaria pra alguém.**"

Se o negócio tem programa de indicação (`/indicacao`), o convite pra indicar entra na mesma
conversa ou no dia seguinte, com o texto pronto pra encaminhar.

Depoimento genérico ("excelente profissional") não vende. O que vende tem antes/depois e
número. Se vier genérico, perguntar uma coisa específica de volta.

Quando o depoimento vier com número ("caiu de 12% pra 3%"), não para aqui: o `/case` colhe a
fonte de cada número, calcula a variação por comando, preenche o termo e cataloga. Depoimento
com número e sem autorização é prova que não pode ser usada.

**Cliente parado**: ordenar por quem comprou mais e há mais tempo não volta:
- Se `pessoas/indice.md` existir, a lista já vem pronta e contada: `node scripts/pessoas.js indice` regenera, e a seção "No vácuo" traz os dias sem contato calculados
- Se o negócio cobra mensalidade, plano ou assinatura, quem cuida é o `/retencao`: lá o churn e a receita em risco saem por script. Aqui fica o serviço avulso
- Motivo concreto pra voltar (novidade, época do ano, algo que mudou no negócio dele)
- Nunca "sentimos sua falta" solto — isso pede algo sem oferecer nada
- Reconhecer o tempo sem constranger: "faz um tempo que a gente não se fala"

**Orçamento sem resposta**: o follow-up que ninguém faz, e onde está a maior parte do dinheiro perdido:
- 1º contato: 2 a 3 dias depois, perguntando se ficou alguma dúvida
- 2º contato: uma semana depois, com informação nova (caso parecido, prazo que abriu)
- 3º e último: "vou parar de te incomodar — se mudar de ideia, é só chamar". Encerrar de verdade

**A pergunta que destrava:** "Só pra eu entender e melhorar, o que pesou na decisão?" A
resposta muda a oferta, e às vezes reabre a venda. Preço quase nunca é o motivo real.

### Passo 3 — Escrever as mensagens

Curtas, na voz do usuário, no canal dele (quase sempre WhatsApp, usar `/whatsapp` pra
calibrar formato). Uma pergunta por mensagem. Sem "espero que esteja tudo bem".

Entregar **2 variantes** de cada mensagem, com temperatura diferente, pra ele escolher.

### Passo 4 — Entregar a lista e a agenda

```markdown
# Pós-venda — <situação> — <data>

## Quem contatar, na ordem
| Cliente | Última compra | Valor | Por que agora | Quando |
|---|---|---|---|---|

## Mensagens
### <Cliente> — variante A
[texto pronto pra copiar]
### <Cliente> — variante B
[texto pronto pra copiar]

## Se ele responder X
[o que dizer nos 3 desfechos mais prováveis: interessado, "depois", silêncio]
```

Marcar os retornos em `tarefas.md`: follow-up que depende de memória não acontece.

### Passo 5 — Fechar o ciclo

Depoimento que chegou vai pro `biblioteca.md` com nome, contexto e data: é o que a
`/landing`, a `/proposta` e o `/carrossel` vão usar depois. Depoimento guardado em conversa
de WhatsApp não existe pro sistema. E depoimento sem autorização não sai de casa: a mensagem
seguinte é o pedido do `/autorizacao`, que gera o termo, manda a versão curta e grava o sim na
coluna Autorizado da biblioteca.

---

## Regras

- **Uma pergunta por mensagem.** Mensagem com três perguntas recebe uma resposta, ou nenhuma
- **Nunca inventar depoimento**, nem "melhorar" o que o cliente escreveu além de corrigir digitação. Depoimento inventado é propaganda enganosa
- **Pedir depoimento só depois de confirmar que ficou bom.** Na dúvida, perguntar antes
- **Follow-up tem fim.** Três tentativas e encerra, com elegância. Insistir além disso queima a marca e a chance futura
- **Não usar escassez falsa** ("última vaga", "só hoje") com quem já é cliente. É onde a confiança quebra mais rápido
- **Atraso se avisa antes.** Se o usuário está atrasado, a primeira mensagem é sobre isso — não sobre venda nova
- Base de cliente é dado pessoal: não mandar lista pra ferramenta externa sem autorização, e respeitar quem pediu pra não receber mensagem (LGPD)
- **Parcela vencida não é follow-up.** Cliente com mensalidade ou parcela em aberto vai pro `/cobranca`, que calcula o valor corrigido por comando e data a régua em dia útil; aqui fica quem sumiu sem dívida e o orçamento que ficou sem resposta
- Se o cliente reclamou, a skill vira resolução de problema. Vender pra cliente insatisfeito é o caminho mais curto pra avaliação de uma estrela — nesse caso, `/responder-avaliacoes` cuida da parte pública
