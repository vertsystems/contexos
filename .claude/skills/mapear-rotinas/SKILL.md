---
name: mapear-rotinas
description: >
  Mapeia tarefas repetitivas que o usuário faz no dia a dia e gera skills personalizadas pra
  automatizá-las. Faz uma entrevista curta sobre o que o usuário repete toda semana, propõe
  skills concretas e cria as aprovadas em `.claude/skills/`. Use quando o usuário pedir
  "/mapear-rotinas", "criar skills personalizadas", "automatizar minhas tarefas" ou "o que dá pra automatizar".
---

# /mapear-rotinas — Mapeamento de tarefas repetitivas em skills

Skill de descoberta + criação. O objetivo é transformar o que o usuário repete em automações ativas.

## Workflow

### Passo 1 — Entrevista de descoberta

Fazer 3 perguntas, uma por vez:

1. "Quais 3 tarefas você repete toda semana e gostaria de não ter que pensar mais? (ex: 'criar carrossel', 'mandar relatório pro cliente', 'fazer briefing')"
2. "Pra cada uma delas, qual o input típico? (ex: 'um link de notícia', 'um arquivo de planilha', 'um nome de cliente')"
3. "E o que você espera de output? (ex: '5 slides em PNG', 'um email pronto pra enviar', 'um PDF resumindo')"

### Passo 2 — Conferir catálogo

Ler `templates/skills/catalogo.md` pra ver se alguma das tarefas mencionadas já é coberta por uma skill nativa do Claude Code ou validada pelo Contex OS. Conferir também as 117 skills que já existem em `.claude/skills/`, com esse volume, a chance de a tarefa já estar coberta é alta: pode ser caso de uso do `/carrossel`, `/proposta`, `/documento`, `/reaproveitar`, `/analisar-dados`, `/escopo`, `/testar`, `/revisar-codigo` ou `/evoluir`. Se sim, sugerir a existente em vez de criar uma nova:

> "A tarefa X já é resolvida pela skill `/<nome>` que vem nativa. Quer ativar ela em vez de criar uma nova?"

Ler `templates/ferramentas/catalogo.md` antes de propor qualquer skill que dependa de integração externa: evita propor automação que precisa de API que o usuário não tem.

### Passo 3 — Proposta de skills

Pra cada tarefa que NÃO tem cobertura existente, propor uma skill no formato:

```
### /<nome-da-skill>
**O que faz:** [uma frase]
**Input:** [o que recebe]
**Output:** [o que entrega]
**Dependências:** [arquivos do _memoria/, identidade/, ou ferramentas externas]
```

Mostrar todas as propostas juntas e perguntar:
> "Quais skills dessa lista você quer que eu crie agora? (pode escolher todas, algumas, ou nenhuma — também pode pedir ajustes)"

### Passo 4 — Criação das skills aprovadas

Pra cada skill aprovada:

1. Criar pasta `.claude/skills/<nome>/`
2. Criar `SKILL.md` com:
   - Frontmatter: `name`, `description` (descreve quando deve ser invocada)
   - Workflow estruturado em fases ou passos
   - Lista de dependências (arquivos de contexto, ferramentas externas)
   - Regras claras (o que sempre fazer, o que nunca fazer)
3. Se a skill precisar de templates ou exemplos, criar dentro da pasta da skill
4. Calibrar o tom e regras conforme `_memoria/preferencias.md` e `_memoria/empresa.md`

### Passo 4b — Escrever a skill de forma que ela funcione

Skill que nunca é chamada é trabalho perdido. O que decide isso:

**A `description` é o gatilho, não o resumo.** Ela precisa conter as palavras que o usuário realmente digita: inclusive as erradas e as coloquiais. Comparar:

- Fraco: `"Gera relatório de performance de mídia."`
- Forte: `"Gera o relatório semanal pro cliente. Use quando o usuário disser 'relatório do cliente', 'fechar o mês do X', 'como foi a campanha', 'preciso mandar os números', ou /relatorio-cliente."`

Regras da description:
- Começar com o que a skill **faz**, em uma frase
- Depois "Use quando o usuário disser..." com 4-8 gatilhos reais, entre aspas
- Incluir o jeito que ele fala, não o nome técnico
- Se existe skill parecida, dizer a diferença dentro da própria description ("pra X, veja /outra") — é o que evita duas skills disputando o mesmo pedido

**Corpo da skill:**
- Dependências no topo: que arquivo ela lê, onde salva
- Workflow em passos numerados, com o que perguntar em cada um
- Regras no fim: o que sempre fazer, o que nunca fazer
- Escrever no imperativo, direto. A skill é instrução, não documentação

**Um teste, na mesma sessão.** Rodar a skill com um caso real do usuário antes de considerar pronta. Skill que nunca rodou tem passo faltando: sempre.

**Depois do teste, ajustar a description** com as palavras que ele usou de verdade ao pedir. Esse é o ajuste que mais aumenta a chance de a skill ser encontrada depois.

### Passo 5 — Resumo

```
Criei [N] skills:
✓ /<nome1> — em .claude/skills/<nome1>/SKILL.md
✓ /<nome2> — em .claude/skills/<nome2>/SKILL.md
...

Pra usar: digita / e o nome da skill em qualquer sessão.
Pra ajustar uma skill depois: edita o SKILL.md correspondente.
```

## Conferir que a skill carrega (obrigatório)

Skill com frontmatter quebrado não dá erro: ela simplesmente nunca é encontrada,
e o usuário conclui que "não funcionou". Depois de criar:

```bash
node scripts/verificar.js sistema
```

Ele confere frontmatter legível, `name:` batendo com o nome da pasta, gatilho na
`description` e referência a arquivo que não existe. Só entregar quando sair
"Tudo certo".

## Regras

- Não criar skill pra tarefa que aconteceu uma vez só. Tem que ser repetível
- Não criar mais de 5 skills por sessão de mapeamento (se o usuário pedir mais, dividir em rodadas)
- Cada skill criada precisa ter um trigger claro (`description` precisa indicar quando invocar, com as palavras que o usuário usaria) — sem isso a skill nunca é encontrada
- Se a skill depender de uma ferramenta que o usuário não tem (ex: API do Notion sem MCP configurado), avisar antes de criar e oferecer a versão simplificada
- Toda skill criada aqui deve dizer onde salva a saída (pasta prevista), senão cada execução vira bagunça em lugar diferente
- Depois de criar, testar com um caso real do usuário na mesma sessão. Skill que nunca rodou geralmente tem passo faltando
