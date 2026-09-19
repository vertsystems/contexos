---
name: contrato
description: >
  Monta o contrato de prestação de serviço a partir da proposta aceita: escopo do que está e do
  que NÃO está incluso, prazo e o que acontece quando ele escorrega, pagamento e atraso, número
  de revisões, cancelamento, propriedade do que foi entregue e dados pessoais. Entrega em HTML
  com a identidade da marca, pronto pra assinar.
  Use quando o usuário disser "preciso de um contrato", "o cliente aceitou a proposta",
  "como formalizo", "contrato de prestação de serviço", "o que colocar no contrato",
  "cliente pediu mais coisa e não estava combinado", ou /contrato.
---

# /contrato — O combinado escrito

> **Convenção de pastas:** a saída vai em `contratos/<cliente>-<AAAA-MM-DD>/`. Na convenção **por cliente**, `clientes/<Nome>/contratos/`. A pasta nasce no primeiro contrato.

O contrato de pequeno negócio não existe pra ganhar processo: existe pra que a discussão
não aconteça. Quase todo desentendimento entre prestador e cliente cabe em três perguntas
que ninguém escreveu: **o que exatamente está incluso, até quando, e o que acontece se
mudar.**

> **Isto não é assessoria jurídica.** A skill monta um documento de alinhamento com a
> estrutura usual de contrato de prestação de serviço. Valor alto, cláusula de
> exclusividade, multa pesada, propriedade intelectual disputada ou qualquer coisa fora do
> comum pede advogado — e vale dizer isso ao usuário quando o caso for esse.

## Dependências

- **A proposta aceita:** o arquivo do `/proposta`, quando existir — o contrato **não** pode divergir dela
- **O que se vende:** `_memoria/oferta.md` — escopo, prazo, garantia, o que está incluso
- **Preço e forma de pagamento:** o estudo do `/preco`
- **Dados do negócio:** `_memoria/empresa.md` — razão social, CNPJ, endereço, responsável
- **Identidade:** `identidade/tokens.css` se existir, senão `identidade/design-guide.md`
- **Saída:** `contratos/<cliente>-<data>/contrato.html` e `.md`

---

## Workflow

### Passo 1 — Escolher o tipo

| Tipo | Quando | O que muda |
|---|---|---|
| **Projeto fechado** | Escopo definido, entrega com fim (site, identidade, reforma) | Marcos de entrega e pagamento por etapa |
| **Mensalidade** | Serviço contínuo (social media, manutenção, consultoria) | Prazo mínimo, aviso prévio, o que cabe no mês |
| **Por demanda** | Trabalho avulso recorrente | Tabela de valores e prazo por tipo de pedido |

### Passo 2 — Levantar o que falta

Perguntar só o que não está na proposta nem na memória:

> 1. "Quem contrata: pessoa física ou empresa? (nome completo/razão social, CPF/CNPJ, endereço)"
> 2. "Quantas rodadas de revisão estão incluídas?"
> 3. "O que acontece se o cliente atrasar o que **ele** precisa mandar?"
> 4. "Se o cliente quiser cancelar no meio, como fica?"
> 5. "Depois de entregue, quem pode usar o material e como?"

A pergunta 3 é a mais esquecida e a que mais causa briga: o prazo escorrega por culpa do
cliente e a cobrança cai no prestador.

### Passo 3 — Escrever as cláusulas que importam

**Escopo: o coração do documento.** Escrever o que está incluso **e uma lista do que não
está**. A segunda lista é a que evita a conversa de "mas eu achei que...".

```
Está incluso:
- 3 peças por semana (12 no mês), publicadas de segunda a sexta
- 1 rodada de ajuste por peça
- Relatório mensal

Não está incluso (orçado à parte):
- Produção de foto e vídeo
- Impulsionamento e verba de anúncio
- Atendimento a comentário e mensagem direta
- Peça extra fora das 12 do mês
```

**Prazo com as duas pontas.** Data de entrega, e o que a acontece quando o cliente atrasa o
insumo: "o prazo é suspenso e recontado a partir do recebimento".

**Pagamento.** Valor, forma, datas, e o que acontece no atraso (juros, multa, suspensão do
serviço). Parcelado sempre com o total escrito.

**Revisões.** Número incluído, prazo do cliente pra pedir, e o valor da rodada extra. Sem
isso, "revisão" não tem fim.

**Mudança de escopo.** Toda mudança vira aditivo escrito com prazo e valor próprios,
aprovado antes de executar. É a cláusula que mais protege o prestador pequeno.

**Cancelamento.** Aviso prévio (30 dias é o usual em mensalidade), o que já foi feito é
devido, e o que acontece com o material.

**Propriedade.** O que o cliente recebe e o que continua do prestador (arquivo editável,
código-fonte, banco de imagem licenciado). E o direito de mostrar o trabalho no portfólio —
com cláusula de confidencialidade quando o cliente pedir.

**Dados pessoais.** Se o serviço envolve dado de cliente do cliente (lista, cadastro,
CRM), dizer quem trata o quê, para quê, e por quanto tempo: exigência da LGPD.

**Foro e assinatura.** Cidade, e assinatura das duas partes com data. Assinatura eletrônica
com registro de e-mail e IP tem validade; anotar qual ferramenta será usada.

### Passo 4 — Conferir contra a proposta

Ler a proposta aceita lado a lado. Preço, prazo e escopo **precisam bater**. Divergência
entre o que foi vendido e o que está no contrato é o pior começo possível, e costuma ser
descuido de copiar de um contrato antigo.

### Passo 5 — Montar o documento

HTML único com a identidade da marca, pronto pra imprimir ou virar PDF:

```bash
node scripts/verificar.js html contratos/<cliente>-<data>/contrato.html
node scripts/gerar-pdf.js contratos/<cliente>-<data>/contrato.html
```

Cliente pediu em Word pra marcar alterações? `node scripts/gerar-docx.js contratos/<cliente>-<data>/contrato.html`
gera o `.docx` ao lado, e `--comparar` mostra o que ele mudou quando devolver (`/word`).

O verificador acusa placeholder esquecido: em contrato, um `[NOME DO CLIENTE]` que
sobrou é constrangimento na frente de quem vai assinar.

**No papel, sem fundo chapado:** contrato é feito pra imprimir. Fundo branco, texto escuro,
numeração de cláusula, espaço de assinatura que não fica órfão no pé da página.

### Passo 6 — Entregar com o resumo

Junto do contrato, um resumo de 5 linhas em português simples do que foi combinado: é o
que o cliente realmente lê, e evita que ele assine sem entender.

---

## Regras

- **Não é assessoria jurídica.** Caso fora do comum, valor alto ou cláusula delicada: recomendar advogado, sem drama e sem insistir
- **A lista do que NÃO está incluso é obrigatória.** Contrato sem ela não cumpre a função
- **Nunca divergir da proposta aceita.** Se algo mudou, o usuário precisa avisar o cliente antes de mandar o contrato
- **Parcelamento com o total escrito.** "4× R$ 750 (R$ 3.000 no total)"
- **Nenhum campo em branco na versão enviada.** Sem `[a preencher]`, sem `XXX`
- **Sem cláusula abusiva** — multa desproporcional, renovação automática escondida, exclusividade sem contrapartida. Além de injusto, cai por terra quando questionado, e o contrato inteiro perde força
- **Prazo suspenso quando o cliente atrasa o insumo.** Sem essa cláusula, o atraso dele vira problema do usuário
- **Dado pessoal exige cláusula própria** quando o serviço mexe com base de terceiros (LGPD)
- Linguagem clara. Contrato que precisa de tradução gera desconfiança e não protege mais por ser difícil
