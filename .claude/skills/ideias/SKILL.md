---
name: ideias
description: >
  Monta e mantém o banco de pautas do negócio em `conteudo/pautas.md`: cada ideia com a
  origem rastreável (dor real, pergunta do público, objeção de venda, gap do concorrente, sazonalidade).
  Use quando o usuário disser "não sei o que postar", "me dá ideias de conteúdo", "banco de pautas",
  "sobre o que falar", "acabaram os assuntos", "ideia de post", ou /ideias.


---

# /ideias — Banco de pautas

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

O `/carrossel` e o `/publicar-tema` presumem que você chega com um tema. Essa skill resolve o problema anterior: **de onde vem o tema.**

A regra que sustenta a qualidade: nenhuma pauta entra sem dizer de onde veio. Pauta sem origem é chute, e chute vira "5 dicas de produtividade".

## Dependências

- **Contexto:** `_memoria/empresa.md` (produto, público, dores), `_memoria/estrategia.md` (foco atual)
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Insumos, se existirem:** `seo/01-pesquisa-demanda.md` e `02-analise-concorrencia.md`, dossiês em `pesquisa/`, histórico em `conteudo/indice.md`
- **Ferramentas:** WebSearch (perguntas reais do público)
- **Saída:** `conteudo/pautas.md`
- **Referências de copy:**
  - `templates/copy/metodo.md` — diagnóstico antes de escrever: função, consciência, pilar, motor, barreira
  - `templates/copy/ganchos.md` — os quatro tempos (gancho, exposição, virada, solução), onde o gancho começa e a régua de qualidade

---

## Workflow

### Passo 1 — Garimpar nas seis fontes

Rodar as que tiverem material. Cada pauta nasce carimbada com a fonte:

**1. Dor declarada** — `_memoria/empresa.md` e a estratégia. O que o cliente sofre antes de comprar.

**2. Pergunta real**: buscar as perguntas que o público faz de verdade: "People Also Ask" do Google nos termos do nicho, fórum, Reddit, grupo, comentário de vídeo do setor. Copiar a pergunta como ela foi escrita.

**3. Objeção de venda**: perguntar direto ao usuário:
> "Quais 3 perguntas o cliente sempre faz antes de fechar? E qual a desculpa mais comum pra não comprar?"

Cada objeção é uma pauta que vende sozinha, porque responde algo que trava dinheiro.

**4. Gap do concorrente**: do `/seo` passo 2, ou olhando o conteúdo de 3 concorrentes: o que todos falam (saturado, evitar), o que ninguém fala (oportunidade).

**5. Sazonalidade**: datas que mexem com esse negócio: temporada do setor, data comercial que faz sentido, ciclo do cliente (início de ano, safra, festa, período letivo). Só as reais, não forçar Dia do Rock em loja de autopeça.

**6. O que já performou**: se o usuário tem histórico, perguntar qual post foi melhor e por quê. O melhor previsor da próxima pauta boa é a última que funcionou.

### Passo 1b — Classificar cada pauta em buscável ou compartilhável

Toda pauta serve a um dos dois (às vezes aos dois), e a diferença muda como ela é escrita:

| | **Buscável** | **Compartilhável** |
|---|---|---|
| Capta | demanda que já existe | demanda nova |
| Vem de | alguém digitando no Google | alguém mostrando pra outro |
| Escreve-se | respondendo a pergunta exata, título igual à busca, cobertura completa | insight novo, dado próprio, opinião contra o senso comum, história |
| Rende | tráfego que acumula por anos | pico curto e autoridade |

**Prioridade pra negócio pequeno: buscável primeiro.** É o que trabalha sozinho depois de publicado. Compartilhável é o que constrói marca: precisa dos dois, nessa proporção.

Um banco só de compartilhável gera audiência que não compra; um banco só de buscável nunca cria preferência.

### Passo 1c — Agrupar em pilares

Pauta solta vira produção sem direção. Agrupar em **3 a 5 pilares**: os assuntos em que o negócio quer ser lembrado:

Como achar os pilares: o que o produto resolve · o que o cliente precisa aprender antes de comprar · o que tem busca real (`/seo`) · onde o concorrente é fraco (`/seo` passo 2).

```
Pilar: Conservação (o assunto)
├── artigo-guia central, que responde a dúvida maior
├── pauta satélite: erro comum de temperatura
├── pauta satélite: quanto custa a perda
└── pauta satélite: como escolher equipamento
```

O satélite aponta pro central, e o central aponta pro serviço. É isso que transforma conteúdo em caminho de compra em vez de post solto.

### Passo 1d — Filtrar pelo que dá pra sustentar

Antes de propor, considerar o que o negócio aguenta:

| Se ele tem | Priorizar |
|---|---|
| pouco tempo | pauta que sai de conhecimento que ele já tem na cabeça |
| pouco dinheiro | orgânico e reaproveitamento, não produção nova |
| pressa por resultado | fundo de funil e prova, não topo |
| paciência e constância | buscável, que acumula |

**Ideias que quase sempre valem, e quase todo negócio pequeno esquece:**
- Responder em conteúdo a pergunta que ele já responde no WhatsApp dez vezes por semana
- Isca digital (checklist, planilha, guia) — vira `/documento` e alimenta lista
- Pedir indicação de forma estruturada, não no improviso
- Case do cliente com número, publicado com autorização
- Bastidor do processo — o que ninguém vê e cria confiança
- Conteúdo de lançamento quando entra serviço, produto ou sócio novo

### Passo 2 — Filtrar antes de mostrar

Toda pauta candidata passa por três perguntas. Reprovou em uma, não entra:

- **É de interesse do público, não do dono?** ("nossa história de 30 anos" quase sempre reprova)
- **O negócio tem autoridade pra falar disso?** Se não tem, é conteúdo de vitrine alheia
- **Dá pra dizer algo específico?** Se o texto só poderia sair genérico, a pauta é fraca

### Passo 3 — Escrever o banco

`conteudo/pautas.md`:

```markdown
# Banco de pautas
*Atualizado em <YYYY-MM-DD>*

## Prontas pra produzir

| Pauta | Ângulo | Formato | Funil | Origem | Status |
|---|---|---|---|---|---|
| Por que carne salgada estraga em 3 dias | erro comum | carrossel | topo | pergunta no Reddit r/churrasco | livre |
| Quanto custa errar a conservação | número | post único | meio | objeção de venda ("tá caro") | livre |

## Em produção
[o que já foi pra /publicar-tema ou /carrossel]

## Publicadas
[fecha o ciclo — o indice.md tem o detalhe]

## Descartadas
| Pauta | Por que não |
|---|---|
| Nossa história de 30 anos | interesse do dono, não do público |
```

**Funil:** topo (atrai quem nem sabe que tem problema) · meio (compara soluções) · fundo (decide comprar). Banco com 20 pautas de topo e nenhuma de fundo gera audiência que não compra.

### Passo 4 — Entregar

Mostrar as 8-12 melhores no chat, agrupadas por funil, e:

> "Tem [N] pautas no banco. Pra transformar uma em conteúdo: `/carrossel` ou
> `/publicar-tema`. Pra explorar tratamentos diferentes de uma delas: `/angulos`.
> Pra distribuir no mês: `/calendario`."

---

## Regras

- **Origem obrigatória.** Pauta sem fonte rastreável não entra no banco
- **Ao virar gancho, o dado não muda de sujeito.** Se a fonte diz "45% dos **executivos** têm projetos desconectados", o gancho não pode virar "45% dos **projetos** rodam desconectados" — é outra afirmação, e nenhuma fonte a sustenta. Foi o que aconteceu em teste real, com o único número que a marca tinha: o erro se espalhou por 3 arquivos. Ao encurtar, cortar palavra; nunca trocar o sujeito
- **Fato sobre o usuário só entra se ele disse.** Gancho do tipo "refiz 11 vezes" ou "recusei trabalho duas vezes esse ano" precisa estar em `_memoria/` ou ter sido dito na conversa. Se não estiver, marcar `*(precisa de dado real)*` e listar em "Falta apurar" — nunca inventar número autobiográfico
- Mínimo 10 pautas por rodada, máximo 25. Banco gigante não é usado
- Manter equilíbrio de funil e avisar quando desandar ("18 de topo, 1 de fundo — quer que eu puxe mais de fundo?")
- Não repetir o que já foi publicado: cruzar com `indice.md` antes
- Pauta descartada fica registrada com o motivo — evita ela voltar em três meses
- Linguagem da pauta na fala do público (do jeito que a pergunta foi feita), não em jargão de marketing
- Se o negócio é regulado, marcar as pautas que exigem revisão técnica antes de publicar
