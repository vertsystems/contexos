# [Seu Nome] — Contex OS

> Molde do CLAUDE.md aplicado a **freelancer** — você vende tempo e
> talento pra clientes terceiros. O sistema gira em torno de captar,
> entregar e cobrar. O `/instalar` adapta esse molde com a sua realidade.

## O que é esse workspace

[Uma frase do que essa pasta representa. Ex: "Operação freelancer.
Aqui ficam todos os clientes, briefings, entregas e cobrança."]

## Onde salvar o que

**Convenção: por cliente.** Trabalho de cliente vai em `clientes/<Nome>/`;
trabalho meu vai na raiz. Cada pasta nasce quando a primeira peça é criada —
workspace não tem pasta vazia.

**Trabalho de cliente** — dentro de `clientes/<Nome>/`:

| O que | Onde |
|---|---|
| Briefing | `clientes/<Nome>/briefing.md` |
| Marca **do cliente** (tem precedência nas peças dele) | `clientes/<Nome>/identidade/` |
| Conteúdo, pesquisa, site, SEO, campanhas, materiais | `clientes/<Nome>/<tipo>/` |
| Proposta de cliente já ativo | `clientes/<Nome>/propostas/` |

**Meu** — na raiz:

| O que | Onde | Skill |
|---|---|---|
| Memória do negócio | `_memoria/` | `/instalar`, `/atualizar` |
| Minha marca: visual e verbal | `identidade/` | `/design-system`, `/marca` |
| Proposta de prospect (ainda não é cliente) | `propostas/` | `/proposta` |
| Meu conteúdo (portfólio, LinkedIn) | `conteudo/` | `/carrossel` |
| Análises | `analises/` | `/analisar-dados` |
| Desenho da oferta e estudo de preço | `oferta/` | `/oferta`, `/preco` |
| Roteiros de conversa de venda | `vendas/` | `/vender` |
| Pautas e contatos de imprensa | `imprensa/` | `/imprensa` |
| Fechamentos de semana | `revisoes/` | `/revisao-semanal` |
| Arquivo pra ler uma vez | `dados/` | — |
| Índice de ativos | `biblioteca.md` | `/biblioteca` |
| Pipeline e prazos | `tarefas.md` | `/tarefas` |

Em dúvida de quem é a peça, perguntar antes de criar. Quando um prospect
virar cliente, mover a proposta de `propostas/` pra `clientes/<Nome>/`.

As pastas do sistema (`.claude/skills/`, `templates/`, `scripts/`) convivem na
raiz e são substituídas quando sai versão nova do Contex OS. Não guarde trabalho
dentro delas: o resto da raiz é seu.

## Quem sou

Sou [nome], freelancer de [área: design / dev / copy / marketing / etc].
Trabalho com [tipo de cliente] entregando [especialidade real].

## Meu serviço

- [serviço principal 1]
- [serviço principal 2]
- [serviço principal 3]

Ticket médio: [se quiser registrar]. Capacidade simultânea: [N projetos
ao mesmo tempo no máximo].

## Clientes ativos

[Lista breve ou descrição. O `/atualizar` mantém isso sincronizado com
as pastas em `clientes/`.]

## Como trabalho

[Seu processo: como recebe briefing, como entrega, ferramentas que usa,
tempo médio de cada projeto.]

## Tom de voz

[Como você fala com cliente. Frase real ajuda mais que adjetivos.]

Evitar: [o que destoa do seu jeito]

## Regras do sistema

- Cliente novo → `/novo-projeto` cria a pasta `clientes/<Nome>/` com `briefing.md`
- Proposta → `/proposta` gera em `propostas/<cliente>-<data>.html` (move pra
  `clientes/<Nome>/` quando fechar)
- Pipeline, prazos e follow-up → `tarefas.md` (via `/tarefas`)
- [outras regras que aparecerem com o uso]

## Ferramentas conectadas

- [ ] Notion
- [ ] Gmail
- [ ] Google Calendar
- [ ] Stripe / cobrança

*(o `/conectar` marca aqui, com data e nome da variável, depois do teste passar)*
