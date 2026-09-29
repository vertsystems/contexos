---
name: publico
description: >
  Descobre quem é o cliente real e o que ele de fato sente, minerando avaliação, comentário, grupo,
  fórum e conversa, e conduzindo entrevista que não enviesa a resposta. Gera `_memoria/publico.md`,
  que alimenta conteúdo, oferta, página e anúncio. Use quando o usuário disser "quem é meu cliente",
  "não sei pra quem falo", "público-alvo", "persona", "o que o cliente quer", "por que não compram",
  "entrevistar cliente", "analisar avaliações", ou /publico.
---

# /publico — Quem compra e o que ele sente

A diferença entre conteúdo genérico e conteúdo que faz a pessoa parar é uma só: saber a frase exata que ela usa pra descrever o problema. Essa skill vai buscar essa frase.

> **Convenção de pastas:** caminhos na convenção **por tipo**. Se o workspace usa **por cliente** e a pesquisa é de um cliente, prefixar com `clientes/<Nome>/`.

## Dependências

- **Contexto:** `_memoria/empresa.md`
- **Ferramentas:** WebSearch e WebFetch (avaliação pública, fórum, grupo, comentário)
- **Material do usuário:** avaliação do Google, print de WhatsApp, comentário, e-mail de cliente, gravação de reunião
- **Saídas:** `_memoria/publico.md` (perfil ativo, lido por todas as skills) e dossiê em `pesquisa/publico-<segmento>.md`

---

## Dois modos

**Modo 1: o que já existe.** O usuário já tem material: avaliações no Google, conversas de WhatsApp, comentários, e-mails, gravações. É o modo mais rico e mais ignorado. Sempre começar por aqui quando houver material.

**Modo 2: ir buscar.** Não há material suficiente: buscar onde o público desse nicho fala publicamente.

---

## Modo 1 — Minerar o que já existe

Pedir o que ele tiver:

> "Me manda o que você tiver de conversa real com cliente: avaliações do Google,
> prints de WhatsApp, comentários, e-mails. Nem precisa organizar — eu leio e
> separo o que importa."

De cada material, extrair **cinco coisas** e sempre **na palavra da pessoa**:

| O que extrair | Por que vale | Onde vai ser usado |
|---|---|---|
| **Frase literal da dor** | é o hook pronto | `/carrossel`, `/landing`, `/angulos` |
| **Objeção** | é o que trava o dinheiro | `/oferta`, `/vender`, `/proposta` |
| **Gatilho** (o que fez procurar naquele dia) | revela quando a pessoa compra | `/anuncio-google`, `/calendario` |
| **O que ela tentou antes** | mostra concorrente real e nível de urgência | `/oferta`, `/preco` |
| **O que ela elogia sem pedirem** | é o diferencial de verdade, não o que você acha | tudo |

**Nunca parafrasear a dor.** "Não quero perder mercadoria" é diferente de "toda semana eu jogo comida no lixo e isso me dá aperto". A segunda vende; a primeira é resumo corporativo.

---

## Modo 2 — Ir buscar onde o público fala

Escolher as fontes conforme o tipo de negócio:

| Tipo de negócio | Onde procurar |
|---|---|
| Comércio e serviço local | Avaliações do Google do **concorrente** (1 a 3 estrelas é onde está a dor), grupos de Facebook da cidade, comentários em posts de perfis locais |
| Serviço profissional (advogado, contador, arquiteto) | Grupos e fóruns do setor, comentários no LinkedIn, perguntas no Reddit e Quora em português |
| Produto físico / e-commerce | Avaliações de 1-3 estrelas em marketplace (Mercado Livre, Amazon), comentários no Instagram e TikTok |
| B2B / indústria | LinkedIn, associação do setor, vagas de emprego (revelam a dor operacional), feiras |
| Curso, mentoria, infoproduto | Comentários no YouTube do nicho, grupos de Telegram e Facebook, Reddit |

**Onde está o ouro, em ordem:**
1. **Avaliação negativa de concorrente** — é a dor descrita por quem já pagou e se frustrou
2. **Avaliação de 4 estrelas** (não 5) — elogia, mas diz o que faltou. É o mapa da oportunidade
3. **Pergunta repetida em grupo** — quando três pessoas perguntam o mesmo, é pauta e é objeção
4. **Comentário longo em post do nicho** — quem escreve muito está muito incomodado
5. **Reclame Aqui da categoria** — a dor de quem se sentiu enganado, com as palavras de quem está bravo. Mostra a objeção que o concorrente deixou nascer

Usar as buscas do Google no idioma e na região do público. Copiar as frases **literalmente**, com a fonte.

---

## Entrevistar cliente sem enviesar

Se o usuário tem acesso a clientes, essa é a fonte mais valiosa, e a mais fácil de estragar. Três regras:

1. **Fale da vida dele, não da sua ideia**
2. **Pergunte sobre o passado concreto, não sobre opinião ou futuro**
3. **Fale menos, ouça mais**

**Perguntas que não servem** (todas geram resposta gentil e inútil):

| Pergunta ruim | Por que falha |
|---|---|
| "Você acha que é uma boa ideia?" | Opinião não paga conta. Só o mercado responde |
| "Você compraria um serviço que faz X?" | Todo mundo diz que sim |
| "Quanto você pagaria por isso?" | Número imaginado é mentira educada |
| "Você teria interesse em...?" | Convite pra elogio |

**Perguntas que funcionam:**

| Pergunta | O que revela |
|---|---|
| "Me conta a última vez que isso aconteceu." | comportamento real, não hipótese |
| "Por que isso te incomoda?" | a motivação de verdade |
| "O que você faz hoje pra resolver?" | o concorrente real e o preço-âncora |
| "O que você já tentou antes?" | se ela se importa o suficiente pra buscar |
| "O que aconteceu depois?" | a consequência — é o que justifica pagar |
| "Quem decide isso aí?" | quem realmente assina |
| "Tem algo que eu devia ter perguntado?" | o que você não viu |

**Ler o sinal, não a educação:** elogio é ruído; compromisso é sinal. Se a pessoa marca a próxima conversa, apresenta alguém, manda dado ou paga adiantado, aquilo era verdade. Se ela só elogiou, não era.

---

## Sintetizar

Escrever `_memoria/publico.md`: arquivo curto e ativo, que todas as skills leem:

```markdown
# Público
*Atualizado em <AAAA-MM-DD> · base: <N avaliações, N conversas, N entrevistas>*

## Quem é
[Perfil real em 3-4 linhas. Não persona inventada: quem paga de verdade hoje.]

## A dor, na palavra dele
> "citação literal" — <fonte>
> "citação literal" — <fonte>

## O que faz procurar (gatilhos)
- [evento concreto que antecede a compra]

## Objeções que travam a venda
1. [objeção] → [resposta que funciona]
2. ...

## O que ele já tenta hoje
[soluções atuais, incluindo "não fazer nada" e resolver na gambiarra]

## O que ele elogia sem a gente pedir
[o diferencial real, na palavra dele]

## Palavras que ele usa / não usa
**Usa:** [vocabulário real]
**Não usa:** [jargão que a empresa usa e o cliente não]

## Onde ele está
[canais, grupos, horários — o que orienta /calendario e /anuncio-google]
```

O dossiê completo (todas as citações, fontes, links) vai em `pesquisa/publico-<segmento>.md`.

---

## Encaminhar

> "Perfil pronto. Isso muda o que sai de:
> `/ideias` e `/angulos` (pauta que nasce da dor real) · `/oferta` (construída sobre
> as objeções) · `/landing` e `/carrossel` (escrito na palavra dele) ·
> `/anuncio-google` (termos que ele digita, não os que a empresa usa).
>
> Quer seguir pra algum?"

---

## Regras

- **Citação sempre literal, com fonte.** Reescrever a dor em linguagem "profissional" destrói o valor de tudo
- **Não inventar persona.** Nada de "Maria, 34 anos, gosta de yoga" — isso é ficção que atrapalha. O perfil descreve quem paga hoje
- Mínimo de base pra afirmar padrão: 3 fontes independentes dizendo o mesmo. Menos que isso é indício, e fica escrito como indício
- Nunca publicar nome, foto ou dado de contato de quem foi pesquisado. Citação pública de avaliação pode ser usada; conversa privada de WhatsApp é insumo interno, não vai pra peça sem autorização
- Avaliação negativa de concorrente é insumo de pesquisa — **nunca** virar conteúdo que cita ou ataca o concorrente
- Se o material tiver dado sensível (saúde, financeiro, jurídico de terceiro), trabalhar só com o padrão agregado
- Atualizar `_memoria/publico.md` a cada 3-6 meses, ou quando o negócio mudar de público
