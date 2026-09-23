---
name: revisar
description: >
  Editor crítico de texto: corta gordura, elimina clichê de IA, confere o tom contra as preferências
  da marca, marca afirmação sem fonte e mede legibilidade. Devolve a versão revisada e o que mudou.
  Use quando o usuário pedir "revisa esse texto", "melhora isso", "ficou com cara de IA", "tá muito
  longo", "corta o excesso", "isso soa como eu?", ou /revisar. Também rodar antes de entregar
  qualquer texto longo produzido por outra skill.
---

# /revisar — Editor crítico

Não reescreve o texto: **corta o que não é do usuário e conserta o que atrapalha o leitor.** A voz é dele; o trabalho aqui é tirar o que se meteu no meio.

## Dependências

- **Tom de voz:** `_memoria/preferencias.md` — inclusive o exemplo de escrita real, que é a régua
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Leitura fria, se existir:** `revisoes/leitura-fria-<slug>-<AAAA-MM-DD>.md` (`/leitor-frio`) — os pontos em que dois ou mais leitores pararam, com a frase citada. Consertar esses antes de mexer em estilo
- **Contexto:** `_memoria/empresa.md` (pra saber se um termo técnico é jargão ou vocabulário do público)
- **Referências de copy:**
  - `templates/copy/edicao.md` — lista negra de clichê, gordura e regras de estilo

---

## Workflow

Cinco passes, nessa ordem. Cada um tem critério objetivo.

### Passe 1 — Gordura

Cortar sem piedade:
- Advérbio que não muda nada: "realmente", "basicamente", "extremamente", "muito importante"
- Muleta de abertura: "é importante notar que", "vale ressaltar que", "cabe destacar", "no mundo de hoje"
- Redundância: "planejar antecipadamente", "juntos em conjunto", "opção alternativa"
- Frase que só anuncia a próxima: "vamos ver agora quais são os principais pontos"
- Parágrafo de encerramento que repete o que já foi dito

Meta: 15-30% mais curto sem perder informação. Se cortar mais que isso, o texto era enchimento.

### Passe 2 — Clichê de IA

**A lista negra completa está em `templates/copy/edicao.md`**: ler de lá, porque ela é mantida num lugar só e vale pra todas as skills que escrevem. O resumo do que mais aparece:

**Verbos e aberturas:** mergulhe, desvende, descubra o segredo, embarque, navegue por, desbloqueie, transforme sua vida
**Estruturas:** "não é apenas X, é Y" · "em um mundo cada vez mais Z" · "seja você um A ou um B" · "a verdade é que" · "isso não é sobre X, é sobre Y"
**Adjetivos vazios:** revolucionário, inovador, único, incrível, poderoso, essencial, fundamental (quando não é)
**Fechamentos:** "então, o que você está esperando?" · "o futuro é agora" · "a escolha é sua"
**Formato:** travessão decorativo em excesso, emoji como bullet, três itens sempre que uma lista aparece, negrito em frase inteira

Também derrubar o **paralelismo mecânico**: três frases seguidas com a mesma estrutura rítmica. Denuncia geração automática mais que qualquer palavra isolada.

### Passe 3 — Tom vs. preferências

Comparar com `preferencias.md`, especialmente o exemplo de escrita real. Reportar divergência citando o trecho:

> "Seu exemplo usa 'a gente' e frase curta. O texto tem 4 ocorrências de 'nós
> proporcionamos' e frases de 40+ palavras. Ajustei."

Conferir também a lista de "o que evitar" do arquivo: se ele detesta "alavancar", nenhuma variação passa.

### Passe 4 — Afirmação sem fonte

Marcar toda afirmação que se apresenta como fato e não tem base:
- Número, percentual, ranking ("líder do mercado", "mais de 500 clientes")
- Comparativo ("o melhor", "mais eficiente que")
- Alegação técnica ou de resultado ("aumenta 30% a durabilidade")

Formato: `[sem fonte: 30% de durabilidade, de onde vem?]`. Não apagar sozinho: pode ser dado real que o usuário tem na cabeça. Se houver dossiê em `pesquisa/`, tentar casar a afirmação com a fonte de lá.

**Em nicho regulado** (saúde, jurídico, financeiro, alimentar), sinalizar promessa que pode virar problema legal.

**Se o `CLAUDE.md` tem a seção "O que eu posso e não posso dizer"** (perfil profissional liberal), ela é critério de reprovação, não de aviso: conferir cada regra de lá contra o texto (preço em anúncio, promessa de resultado, antes-e-depois, depoimento, registro visível) e marcar como `[conselho: <regra ferida>]`. Regra marcada `[a confirmar]` no `CLAUDE.md` vira pergunta ao usuário antes de entregar, não suposição.

### Passe 5 — Legibilidade

- Frase com mais de 30 palavras: quebrar
- Parágrafo com mais de 5 linhas: dividir
- Voz passiva onde a ativa é natural: trocar
- Termo técnico sem explicação, num texto pra público que não domina: explicar na primeira aparição ou trocar
- Escaneabilidade: texto longo sem subtítulo a cada ~300 palavras cansa

---

## Entrega

```markdown
## Texto revisado
[versão final, pronta pra usar]

## O que mudou
- **Cortei 22%** (740 → 578 palavras) — gordura e repetição no fechamento
- **4 clichês:** "mergulhe no universo", "não é apenas um produto, é", "revolucionário", "o futuro é agora"
- **Tom:** 3 trechos em corporativês ("proporcionamos soluções") → forma como você escreve
- **2 afirmações sem fonte** marcadas no texto — confirma ou eu tiro
- **Legibilidade:** 5 frases longas quebradas
```

Se o texto já estiver bom, dizer isso e apontar no máximo 2 ajustes finos. **Revisão que sempre acha 10 problemas perde credibilidade.**

---

## Regras

- **Não trocar a voz do usuário por uma "melhor".** Erro pequeno de estilo que é dele fica
- Não deixar o texto mais formal do que era. A tendência de revisão automática é engomar — resistir
- Não cortar exemplo concreto, número real ou história pra "enxugar". Gordura é palavra vazia, não conteúdo específico
- Não inventar fonte pra afirmação sem fonte. Marcar e devolver a decisão
- Sempre mostrar o quanto cortou, em número. É o que dá confiança de que o corte foi real
- Se o texto tem restrição de tamanho (legenda de 2.200, headline de 30 caracteres), respeitar e informar a contagem final
