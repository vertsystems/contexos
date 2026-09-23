---
name: email-profissional
description: >
  Rascunha um email profissional a partir de um contexto livre.
  Calibra o tom ao destinatário e ao objetivo do email.
  Use quando o usuário disser "escreve um email pra", "preciso mandar um email sobre",
  "como eu respondo isso", "faz um email pra [cliente/pessoa]".
---

# /email-profissional — Rascunho de Email

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md`
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Oferta ativa:** `_memoria/oferta.md` se existir (`/oferta`) — o que está sendo vendido, garantia, preço
- **Tom de voz:** `_memoria/preferencias.md`
- **Referências de copy:**
  - `templates/copy/edicao.md` — lista negra de clichê, gordura e regras de estilo

---

## Workflow

### Passo 1 — Coletar o contexto

Se o usuário não forneceu as informações necessárias, perguntar:
1. "Pra quem é o email? (nome, cargo, relação com você)"
2. "Qual é o objetivo? (cobrar, propor, responder, agradecer, seguir up...)"
3. "Tem algo específico que precisa constar ou que precisa evitar dizer?"

Se o usuário deu o contexto de forma livre (mesmo que bagunçado), extrai o que der e prossegue.

### Passo 2 — Escrever o email

**Considerar:**
- Tom proporcional à relação (cliente novo = mais cuidado, parceiro antigo = mais direto)
- Objetivo claro na abertura (não enterrar o pedido no final)
- Uma ação pedida por vez
- Encerramento sem redundância ("Qualquer dúvida, fico à disposição" é padrão — só usar se fizer sentido)

**Estrutura:**
```
Assunto: [linha de assunto direta, sem clicbait]

[Nome],

[Parágrafo 1 — contexto ou referência ao último contato]

[Parágrafo 2 — o ponto principal ou o pedido]

[Parágrafo 3 — próximo passo, se houver]

[Assinatura]
[Nome do usuário, de _memoria/empresa.md]
```

### Passo 3 — Apresentar opções de tom (quando fizer sentido)

Se o assunto for delicado (cobrança, feedback negativo, recusa), oferecer 2 versões:
- Versão A: mais direta
- Versão B: mais suave

Deixar o usuário escolher.

### Passo 4 — Entregar

Mostrar o email pronto no chat, em bloco fácil de copiar. Salvar em arquivo só se o usuário pedir ou se o email for longo/importante (proposta, cobrança formal): `emails/<assunto-curto>-<YYYY-MM-DD>.md`.

Não salvar arquivo pra cada rascunho de duas linhas: vira lixo na pasta.

---

## Casos específicos

### Abordagem fria (primeiro contato)

Regra que muda tudo: **o e-mail frio não vende, ele consegue uma resposta.** Objetivo é conversa, não fechamento.

- Assunto de 3-5 palavras, específico, sem promessa
- Primeira linha sobre **ele**, não sobre você — e precisa provar que você pesquisou (algo real do negócio dele)
- Uma frase sobre o problema que você resolve, ligada ao que você observou
- Prova curtíssima: um cliente parecido, um número
- Pedido pequeno: 15 minutos, ou uma pergunta que se responde em uma linha
- Máximo 120 palavras. E-mail frio longo não é lido
- Sem anexo no primeiro contato, sem link de agenda antes de haver interesse

### Sequência de follow-up

Nunca "só passando pra saber". Cada retorno leva algo novo:

| Contato | Quando | O que leva |
|---|---|---|
| 1 | dia 0 | a abordagem |
| 2 | +3 dias | um dado ou case relevante pro caso dele |
| 3 | +7 dias | um ângulo diferente do problema |
| 4 | +14 dias | encerramento educado ("vou parar de te escrever; se mudar, me chama") |

O quarto e-mail é o que mais gera resposta, e encerrar com dignidade preserva a porta aberta.

### E-mail para a base (quem já é cliente ou lead)

- Um assunto por e-mail, uma ação por e-mail
- Assunto que descreve o conteúdo, não que cria suspense
- Escrever como pessoa, não como empresa. Nome de pessoa no remetente
- Se pediu descadastro, retirar na hora — e conferir a base periodicamente


## Regras

- Tom segue `_memoria/preferencias.md`
- Nunca usar linguagem corporativa genérica sem necessidade
- Assunto do email deve ser específico e descritivo, não vago ("Seguimento", "Proposta")
- Se for um email de cobrança, ser direto mas sem agressividade
- Se for resposta a algo, citar o contexto na primeira linha
- Se existir `identidade/assinatura-email/<pessoa>/assinatura.txt` (`/assinatura-email`), usar esse texto como assinatura do rascunho, sem reescrever
- Assinatura vem de `_memoria/empresa.md` (nome, cargo, telefone, site). Não inventar cargo nem inventar dado de contato
- Em e-mail longo ou delicado (proposta, cobrança, recusa), passar pelos passes do `/revisar` antes de entregar
- Nunca prometer prazo, valor ou condição que o usuário não disse. Se faltar, deixar `[confirmar prazo]` visível no rascunho em vez de escolher um número
