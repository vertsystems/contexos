---
name: oferta
description: >
  Desenha ou conserta a oferta do negócio: o que exatamente está sendo vendido, com bônus, garantia,
  motivo pra ser agora, nome e forma de pagamento. Usa a equação de valor e mapeamento de obstáculos.
  Use quando o usuário disser "minha oferta", "o que eu vendo", "ninguém compra", "pedem orçamento e
  não fecham", "tá caro", "como empacotar meu serviço", "montar um combo", "quero vender mais caro",
  ou /oferta. Pra chegar no valor em reais, veja /preco.
---

# /oferta — O que você vende, e por que compram

Antes de qualquer carrossel, anúncio ou proposta, existe uma pergunta mais importante: **a coisa que você vende é atraente?** Copy boa não salva oferta ruim, só faz mais gente descobrir que não vale a pena.

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** e a oferta é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

## Dependências

- **Contexto:** `_memoria/empresa.md` (o que entrega, para quem)
- **Dor real:** `_memoria/publico.md` se existir (do `/publico`) — a oferta se constrói sobre a dor, não sobre o produto
- **Prova:** `biblioteca.md` — depoimento, case e número já autorizados
- **Tom:** `_memoria/preferencias.md`
- **Saídas:** `oferta/<nome>-<AAAA-MM-DD>.md` e um resumo da oferta ativa em `_memoria/oferta.md` (as outras skills leem esse resumo)
- **Referências de copy:**
  - `templates/copy/psicologia.md` — atalhos de decisão e o limite ético de cada um

---

## A equação de valor

Toda oferta se move em quatro alavancas:

```
                 Resultado desejado  ×  Chance de dar certo
   Valor  =  ────────────────────────────────────────────────
                    Tempo pra ver  ×  Esforço e sacrifício
```

| Alavanca | Direção | Como se puxa na prática |
|---|---|---|
| **Resultado desejado** | ↑ maior | Deixar concreto e específico. "Sua carne durando 3x mais" vence "melhor conservação" |
| **Chance de dar certo** | ↑ maior | Prova real: depoimento com nome, número, garantia, tempo de mercado, certificação |
| **Tempo pra ver** | ↓ menor | Antecipar o primeiro resultado. O que a pessoa vê na primeira semana? |
| **Esforço e sacrifício** | ↓ menor | Tirar passo, fazer por ela, resolver o que ela teria que aprender |

**Regra prática:** se não consegue aumentar o de cima, diminua o de baixo. Na maioria dos negócios pequenos, é embaixo que está o ganho fácil, porque ninguém pensa nisso.

---

## Workflow

### Passo 1 — Descobrir o que ele vende hoje

Perguntar, uma por vez:

1. "Me descreve o que você vende, como você explica pro cliente."
2. "Quanto custa hoje e como o cliente paga?"
3. "Do momento em que o cliente diz sim até ele ver resultado, quanto tempo passa?"
4. "O que o cliente precisa fazer da parte dele pra dar certo?"
5. "Qual a última objeção que você ouviu antes de alguém não fechar?"

Se existir `_memoria/publico.md`, ler antes: as respostas 1 e 5 já podem estar lá.

### Passo 2 — Mapear os obstáculos

Toda pessoa que **quer** o resultado e **não** compra está travada em uma de quatro categorias. Listar 2-3 obstáculos reais por categoria, na linguagem do cliente:

| Categoria | O que trava | Exemplo em serviço local |
|---|---|---|
| **Não sabe** | Falta informação | "Não sei se serve pro meu caso" |
| **Não consegue** | Falta habilidade ou mão de obra | "Não tenho quem faça isso aqui" |
| **Ambiente** | Fatores externos | "Meu sócio não aprova", "não tenho espaço" |
| **Cabeça** | Crença, medo, histórico | "Já tentei uma vez e me arrependi" |

Cada obstáculo mapeado é um candidato a **componente da oferta**, porque a oferta é a soma das soluções dos obstáculos.

### Passo 3 — Montar os componentes e cortar

Para cada obstáculo, uma solução concreta. Depois, pontuar cada componente:

- **Valor pro cliente** (1-10) — quanto isso resolve a dor dele
- **Custo pra você** (1-10) — tempo, dinheiro, trabalho recorrente

E decidir:

| Valor | Custo | Destino |
|---|---|---|
| alto | baixo | **Núcleo da oferta** — é o que vende |
| alto | alto | Núcleo, mas com preço que sustente |
| médio | baixo | **Bônus** — faz o núcleo parecer barato |
| baixo | qualquer | **Corta.** Componente fraco dilui a oferta |

Mirar 4 a 8 componentes fortes. Oferta com 15 itens não parece generosa, parece confusa.

### Passo 4 — Completar as seis partes

Oferta incompleta é a causa mais comum de "pedem orçamento e não fecham". Conferir as seis:

| # | Parte | Pergunta que responde | Erro comum |
|---|---|---|---|
| 1 | **Entrega principal** | O que a pessoa recebe? | Vago ("consultoria") |
| 2 | **Bônus** | O que mais vem, que faz o principal parecer barato? | Nenhum |
| 3 | **Garantia** | E se não funcionar? | Nenhuma, ou promessa que não se cumpre |
| 4 | **Motivo pra ser agora** | Por que não deixar pra depois? | Nenhum, ou urgência falsa |
| 5 | **Nome** | Como isso se chama? | Nome genérico do serviço |
| 6 | **Preço e pagamento** | Quanto e como paga? | Só o valor cheio, sem opção |

**Tipos de garantia, do mais forte ao mais leve**: usar o mais forte que o negócio aguenta cumprir:
- Devolução do dinheiro sem pergunta, em prazo definido
- Refazer o trabalho até ficar certo
- Garantia condicional ("se você fizer X e não der resultado, devolvo")
- Garantia de prazo ("entrego até dia X ou desconto Y")

**Motivo pra ser agora que é honesto:** agenda que realmente lota, turma que realmente fecha, preço que realmente vai subir, insumo que realmente varia, sazonalidade real. Nunca contador falso, nunca "últimas vagas" quando não é.

### Passo 5 — Apresentar na ordem certa

A mesma oferta convence ou não pela ordem. Sempre: **problema → resultado → como funciona → o que está incluído → garantia → preço → próximo passo.**

Preço depois do valor, nunca antes. E o preço aparece **uma vez**, com destaque: esconder o número afasta quem já ia comprar.

### Passo 6 — Salvar

Escrever `oferta/<nome-da-oferta>-<AAAA-MM-DD>.md` com o desenho completo (obstáculos, componentes, as seis partes, ordem de apresentação).

E atualizar `_memoria/oferta.md` com o resumo da **oferta ativa**: é o que `/carrossel`, `/landing`, `/proposta`, `/anuncio-google` e `/vender` vão consultar pra não contradizer a oferta:

```markdown
# Oferta ativa
*Atualizada em <AAAA-MM-DD>*

**Nome:**
**Pra quem:**
**Resultado prometido:**
**Entrega principal:**
**Bônus:**
**Garantia:**
**Motivo pra ser agora:**
**Preço e pagamento:** *(se houver parcelamento, escrever também o total)*
**Prazo de entrega:** *(quanto tempo até o cliente ter o resultado na mão)*
**Objeção nº 1 e resposta:**
**O que NÃO está incluído:**
```

### Passo 7 — Encaminhar

> "Oferta desenhada. Pra colocar no mundo:
> `/preco` se ainda tem dúvida no valor · `/landing` pra página que apresenta ·
> `/combos` quando o combo tem que sair do arquivo de pedidos, com par medido e margem conferida · `/proposta` pra proposta escrita · `/carrossel` pra falar dela nas redes ·
> `/vender` pra conversa de fechamento."

---

## Diagnóstico rápido (quando ele já tem oferta e ela não converte)

Perguntar o sintoma e ir direto na alavanca:

| Sintoma | Causa provável | Onde mexer |
|---|---|---|
| "Acham caro" | Valor percebido baixo, não preço alto | Resultado desejado e prova (topo da equação) |
| "Vou pensar" e desaparece | Falta motivo pra ser agora, ou medo de errar | Garantia + urgência honesta |
| "Muito complicado" | Esforço alto | Tirar passos, fazer por ele |
| "Não sei se funciona pra mim" | Prova genérica | Depoimento de alguém parecido com ele |
| Compara com concorrente item por item | Oferta comparável | Adicionar componente que o concorrente não tem |
| Fecha e se arrepende | Oferta prometeu além | Ajustar promessa, não a copy |

---

## Vocabulário banido

Nunca usar ao escrever a oferta:

- "revolucionário", "inovador", "transformador", "10x", "next level" — soa a texto de IA e a guru
- "segredo", "o que ninguém te conta" — clickbait, queima confiança
- "por tempo limitado" sem prazo real — é mentira, e o cliente percebe
- "valor de R$ X" sem comparável verdadeiro — inflação de valor
- "100% garantido" sem dizer a condição — risco legal e de marca

Especificidade vence superlativo. Número real, nome de cliente real, prazo real.

## Regras

- **Oferta se constrói sobre a dor, não sobre o produto.** Se não houver dor mapeada, rodar `/publico` primeiro ou perguntar as objeções que ele ouve
- **Nunca inventar bônus, garantia ou prova** que o negócio não pode cumprir. Oferta boa que não se entrega gera reembolso e review ruim
- Garantia é decisão do dono: apresentar as opções e o risco de cada, deixar ele escolher
- Urgência sempre real. Escassez falsa é o atalho que destrói a marca em 6 meses
- Nunca sugerir baixar preço como primeira solução. Preço é a última alavanca, e quase sempre a errada
- Se o negócio é regulado (saúde, jurídico, financeiro, alimentício), conferir se a promessa é permitida pelo conselho ou pela ANVISA antes de publicar
