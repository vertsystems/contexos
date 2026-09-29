---
name: angulos
description: >
  Pega um tema e devolve 10 tratamentos diferentes pra ele (contrarian, erro comum, mito, número,
  caso real, comparação, bastidor, previsão...), cada um com hook escrito e o motivo de funcionar
  pra esse público. Use quando o usuário disser "que ângulo usar", "como abordar esse tema",
  "meus posts estão todos iguais", "preciso de um hook", "outra forma de falar disso", ou /angulos.
---

# /angulos — Dez tratamentos pro mesmo tema

Tema e conteúdo são coisas diferentes. "Conservação de alimentos" é assunto; "o erro de geladeira que estraga sua carne em 3 dias" é conteúdo. A diferença é o ângulo, e é por falta dele que todo carrossel sai com a mesma cara.

## Dependências

- **Tom de voz:** `_memoria/preferencias.md` (o hook tem que soar como ele, não como guru)
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Público:** `_memoria/empresa.md`
- **Se existir:** dossiê em `pesquisa/<tema>.md` — ângulo com dado real vence ângulo inventado
- **Referências de copy:**
  - `templates/copy/metodo.md` — diagnóstico antes de escrever: função, consciência, pilar, motor, barreira
  - `templates/copy/psicologia.md` — atalhos de decisão e o limite ético de cada um
  - `templates/copy/ganchos.md` — os quatro tempos (gancho, exposição, virada, solução), onde o gancho começa e a régua de qualidade

---

## Workflow

### Passo 1 — Entender o tema e quem lê

Se o usuário só deu o tema, confirmar em uma pergunta: quem precisa ver isso e o que essa pessoa já sabe? Público que não sabe que tem o problema precisa de ângulo diferente de quem já está comparando fornecedor.

Se houver dossiê de `/pesquisa`, ler antes: os números e as citações literais viram os melhores ângulos.

### Passo 2 — Gerar os 10 tratamentos

Percorrer a lista inteira. Se um tipo não couber nesse tema, dizer por que em vez de forçar.

| # | Tratamento | Como funciona |
|---|---|---|
| 1 | **Contrarian** | Contraria o senso comum do nicho. Exige o usuário ter opinião de verdade |
| 2 | **Erro comum** | "O que quase todo mundo faz errado." Gera reconhecimento imediato |
| 3 | **Mito desmontado** | Pega a crença mais repetida e mostra a origem dela |
| 4 | **Número surpreendente** | Um dado que reposiciona o problema. Só com fonte |
| 5 | **Caso real** | História com começo, complicação e desfecho. O formato mais lembrado |
| 6 | **Comparação** | A vs B lado a lado, com critério explícito |
| 7 | **Como eu faço** | Processo real, com as decisões e não só os passos |
| 8 | **Bastidor** | O que ninguém vê. Constrói confiança sem vender |
| 9 | **Previsão fundamentada** | O que muda nos próximos 12 meses e por quê |
| 10 | **Pergunta que ninguém responde** | A dúvida que o cliente tem vergonha de fazer |

Pra cada um, entregar:

```
### 3. Mito desmontado
**Hook:** "Congelar não conserva. Só pausa o problema."
**Promessa:** por que o congelamento engana e o que ele não resolve
**Formato:** carrossel 6 slides (o mito, a explicação, o teste, o certo)
**Pilar e motor:** necessidade · inimigo em comum (a crença errada, com saída)
**Funciona porque:** é a frase que todo cliente repete no orçamento
**Precisa de:** confirmar a parte técnica antes de publicar
```

Cada tratamento declara também o **pilar** que lidera (necessidade, status ou identidade) e o **motor** que liga (medo com saída, pertencimento, novidade real, inimigo em comum), de `templates/copy/psicologia.md`. Os dez juntos cobrem os três pilares: se todos caírem em necessidade, a lista é de um ângulo só com dez roupas.

O hook tem no máximo 10 palavras e precisa passar em dois testes: **funciona sem a imagem** e **não daria pra usar em qualquer outro nicho** (se dá, é genérico).

### Passo 3 — Recomendar

Não deixar 10 opções soltas na mesa. Fechar com:

> "Se for pra escolher um: o **[N]**, porque [motivo ligado ao foco atual da estratégia
> ou ao que o público pergunta mais].
>
> Os ângulos 2, 5 e 7 desse mesmo tema dão uma sequência de três posts que se
> sustentam — se quiser transformar em série, eu monto."

### Passo 4 — Encaminhar

> "Quer que eu produza algum? `/carrossel` pra visual, `/publicar-tema` pro pacote
> completo com blog. Se quiser guardar os ângulos que não usar agora, eu jogo no
> banco de pautas (`conteudo/pautas.md`)."

Se o usuário mandar guardar, gravar como pautas com origem `/angulos: tema X`.

---

## Regras

- **Dez tratamentos distintos, não dez variações do mesmo.** Se dois ficarem parecidos, trocar um
- Hook na voz do usuário conforme `preferencias.md`. Sem "você não vai acreditar", "a verdade que ninguém conta", "chocante"
- Ângulo que exige dado precisa do dado. Sem fonte, marcar "precisa de `/pesquisa` antes"
- **O dado não muda de sujeito ao virar hook.** "45% dos executivos" não vira "45% dos projetos" — é outra afirmação. Ao encurtar, cortar palavra, nunca trocar o sujeito
- **Fato pessoal do usuário só com ele tendo dito.** Número autobiográfico inventado ("refiz 11 vezes") é a mentira mais fácil de cometer e a mais cara quando alguém pergunta
- Ângulo contrarian só se o usuário realmente pensa assim — polêmica emprestada queima marca
- Não sugerir ângulo que promete o que o negócio não entrega
- Se o tema for regulado, marcar quais ângulos exigem revisão técnica
- Sempre terminar com uma recomendação. Dez opções sem recomendação transfere o trabalho de volta pro usuário
