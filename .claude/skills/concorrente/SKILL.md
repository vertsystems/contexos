---
name: concorrente
description: >
  Mapeia os concorrentes reais do negócio: o que oferecem, como cobram, como se apresentam, o que
  os clientes reclamam deles nas avaliações, e onde está a brecha que o usuário pode ocupar.
  Entrega o comparativo lado a lado e as três diferenças defensáveis: as que o concorrente não
  copia amanhã.
  Use quando o usuário disser "quem são meus concorrentes", "o que o fulano cobra",
  "como eu me diferencio", "todo mundo faz igual", "por que escolher eu",
  "analisa a concorrência", "tem muita gente fazendo isso", ou /concorrente.
---

# /concorrente — Onde está a brecha

> **Convenção de pastas:** a saída vai em `pesquisa/concorrentes-<AAAA-MM-DD>.md`. Na convenção **por cliente**, `clientes/<Nome>/pesquisa/`. A pasta nasce na primeira análise.

Analisar concorrente não serve pra copiar. Serve pra achar o que ele **não**
faz. A reclamação repetida nas avaliações dele é a descrição do serviço que falta na
cidade.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o negócio vende, pra quem, em que região
- **Cliente real:** `_memoria/publico.md`, se existir — o critério de escolha dele é a régua da comparação
- **Oferta atual:** `_memoria/oferta.md`
- **Se existir:** o dossiê de `pesquisa/` e a análise de busca do `/seo` (passo 2)
- **Saída:** `pesquisa/concorrentes-<AAAA-MM-DD>.md`
- **Alimenta:** `/marca` (posicionamento), `/oferta` (o que incluir), `/preco` (faixa praticada), `/landing` (a objeção "por que você")

---

## Workflow

### Passo 1 — Definir quem é concorrente de verdade

Nem todo mundo do mesmo ramo disputa o mesmo cliente. Padaria de bairro e padaria de shopping vendem pão pra gente diferente. Perguntar:

> "Quando o cliente não fecha com você, pra onde ele vai?"

A resposta costuma revelar três grupos diferentes:

| Grupo | Exemplo | Como disputar |
|---|---|---|
| **Direto** | Mesmo serviço, mesma região, mesmo perfil | Comparação lado a lado |
| **Substituto** | Solução diferente pro mesmo problema (fazer em casa, cunhado, ferramenta) | Mostrar o custo escondido da alternativa |
| **Não fazer nada** | O cliente adia | Custo de continuar como está |

O terceiro é o concorrente mais forte da maioria dos pequenos negócios, e é o único que
ninguém analisa.

Escolher de **3 a 5 diretos**. Mais que isso vira planilha que ninguém usa.

### Passo 2 — Levantar o que dá pra observar

Só fonte pública, e cada dado com data e link:

- **Site e redes:** o que prometem, pra quem falam, com que tom
- **Preço:** publicado, faixa mencionada, ou "sob consulta" (isso também é informação)
- **Oferta:** o que está incluso, prazo, garantia, bônus
- **Prova:** depoimento, número de clientes, tempo de mercado, certificação
- **Avaliações do Google:** nota, volume, e **a reclamação que se repete**
- **Presença na busca:** aparece pra quais termos (o `/seo` cobre isso a fundo)
- **Frequência de conteúdo:** postou quando pela última vez
- **Anúncios ativos:** a Biblioteca de Anúncios da Meta (facebook.com/ads/library) mostra, sem login, os anúncios que cada página está rodando e desde quando. Anúncio que roda há meses tende a estar dando resultado, e o conjunto mostra o ângulo que o mercado inteiro já usa (é o que o `/anuncio-meta` evita repetir)
- **Reclame Aqui:** reclamações da categoria e de cada concorrente, com a linguagem de quem se sentiu enganado

**As avaliações de 2 e 3 estrelas são o material mais valioso da análise.** É onde o
cliente diz, com as palavras dele, o que faltou, e o que falta em todos costuma ser o
mesmo. As de 1 estrela costumam ser caso extremo; as de 2 e 3 são o padrão.

### Passo 3 — Montar o comparativo

| Critério | Você | Conc. A | Conc. B | Conc. C |
|---|---|---|---|---|
| Preço praticado | | | | |
| O que está incluso | | | | |
| Prazo | | | | |
| Garantia | | | | |
| Nota / avaliações | | | | |
| Reclamação recorrente | — | | | |
| Como se apresenta | | | | |

Os critérios saem do que **o cliente** usa pra decidir (`publico.md`), não do que o usuário
acha importante. É um erro comum comparar em critério que o comprador nem considera.

### Passo 4 — Achar a brecha

Três perguntas em cima do quadro:

1. **O que todos prometem?** Isso virou obrigação, não diferencial. Se o usuário se vende por aí, está se vendendo pelo que é básico
2. **Do que todos reclamam?** Demora, sumiço, falta de explicação, preço surpresa. Cada reclamação repetida é uma promessa possível — desde que o usuário consiga cumprir
3. **O que ninguém oferece e alguém quer?** Público específico mal atendido, formato diferente, horário, garantia que ninguém dá

### Passo 5 — Escrever as três diferenças defensáveis

Diferença defensável é a que o concorrente **não copia até a semana que vem**. Preço baixo
não é (copia em um dia). "Atendimento de qualidade" não é (todo mundo diz).

Costumam ser defensáveis: especialização real num nicho, processo próprio com nome,
garantia que exige competência pra sustentar, prova acumulada (casos, número, tempo),
relação pessoal do dono com o cliente.

Cada diferença sai escrita como o cliente entenderia, com a prova ao lado:

```markdown
### 1. [A diferença, em uma frase que o cliente repetiria]
**Por que é defensável:** [o que impede o concorrente de copiar amanhã]
**Prova:** [caso, número, depoimento — de biblioteca.md]
**Onde usar:** hero da landing, primeira resposta no WhatsApp, proposta
```

### Passo 6 — Entregar e conectar

```markdown
# Concorrentes — <data>

## Quem disputa o mesmo cliente
## O comparativo
## O que todo mundo promete (deixou de ser diferencial)
## O que todo mundo faz mal (a brecha)
## As três diferenças defensáveis
## O que fazer com isso
[1 a 3 ações, cada uma apontando a skill: /marca, /oferta, /preco, /landing]
```

Registrar a data com destaque: análise de concorrência vence. Seis meses depois, preço e
oferta já mudaram: o arquivo diz quando foi feito, e quando refazer.

---

## Regras

- **Só fonte pública.** Site, rede social, avaliação, anúncio visível. Nada de se passar por cliente pra extrair proposta, nem de pedir informação a funcionário do concorrente
- **Todo dado com data e link.** Preço de concorrente sem data é boato — e decisão de preço tomada em cima de boato sai caro
- **Nunca afirmar o que não foi visto.** "Não encontrei preço publicado" é uma informação; inventar a faixa não é
- **A análise não vira peça pública.** Comparativo com nome de concorrente em anúncio ou post é briga que o pequeno negócio não ganha, e pode dar problema legal. O material é interno: alimenta posicionamento, não ataque
- **Não copiar.** Copiar oferta, texto ou peça de concorrente entrega ao cliente a mesma coisa com menos história — e a semelhança sempre aparece
- **Preço baixo não é diferencial**: é o único que qualquer um copia em 24 horas, e quem tem mais caixa aguenta mais tempo
- Se a conclusão honesta for "você é igual a todos eles", dizer isso. É a informação mais útil que a análise pode dar — e o começo do `/marca`
