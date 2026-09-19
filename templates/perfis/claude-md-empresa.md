# [Nome da Empresa] — Contex OS

> Molde do CLAUDE.md aplicado a **empresa estruturada** — setores,
> processos, várias frentes rodando juntas. O sistema gira em torno
> de organização interna e fluxo entre áreas. O `/instalar` adapta
> esse molde com a sua realidade.

## O que é esse workspace

[Uma frase do que essa pasta representa. Ex: "Operação da empresa.
Cada setor tem sua área, com processos, entregas e documentos."]

## Onde salvar o que

**Convenção: por tipo de entrega.** Cada pasta nasce quando a primeira peça
daquele tipo é criada: workspace não tem pasta vazia.

| O que | Onde | Skill |
|---|---|---|
| Memória do negócio | `_memoria/` | `/instalar`, `/atualizar` |
| Marca: visual e verbal | `identidade/` | `/design-system`, `/marca` |
| Pautas, calendário, peças de conteúdo | `conteudo/` | `/ideias`, `/calendario`, `/carrossel` |
| Dossiês de pesquisa | `pesquisa/` | `/pesquisa` |
| Páginas | `site/` | `/landing` |
| E-books, apostilas, manuais | `materiais/` | `/documento` |
| Decks e treinamentos | `apresentacoes/` | `/apresentacao` |
| Propostas comerciais | `propostas/` | `/proposta` |
| SEO (8 arquivos) | `seo/` | `/seo` |
| Campanhas e relatórios de ads | `campanhas/` | `/anuncio-google`, `/relatorio-ads` |
| Análises de arquivo | `analises/` | `/analisar-dados` |
| Desenho da oferta e estudo de preço | `oferta/` | `/oferta`, `/preco` |
| Roteiros de conversa de venda | `vendas/` | `/vender` |
| Pautas e contatos de imprensa | `imprensa/` | `/imprensa` |
| Fechamentos de semana | `revisoes/` | `/revisao-semanal` |
| Arquivo pra ler uma vez | `dados/` | — |
| Índice de ativos | `biblioteca.md` | `/biblioteca` |
| Pipeline | `tarefas.md` | `/tarefas` |

**Setores com pasta própria:** se a empresa organiza por área (financeiro,
RH, operações), criar a pasta do setor quando ele tiver a primeira entrega
e registrar aqui a regra. Projeto que cruza setores vai em `projetos/<nome>/`
(via `/novo-projeto`).

As pastas do sistema (`.claude/skills/`, `templates/`, `scripts/`) convivem na
raiz e são substituídas quando sai versão nova do Contex OS. Não guarde trabalho
dentro delas: o resto da raiz é seu.

## Sobre a empresa

[Nome] é uma [tipo: consultoria / comércio / serviços / indústria / tech].
Atuamos em [mercado/segmento] atendendo [perfil de cliente].
Somos [N] pessoas organizadas em [setores existentes].

## Setores e responsáveis

- **Marketing:** [quem cuida, o que produz]
- **Comercial:** [quem cuida, o que faz]
- **Financeiro:** [quem cuida, o que acompanha]
- **RH:** [quem cuida, o que gerencia]
- **Operações:** [quem cuida, processos principais]

*(Adicione ou remova setores conforme a realidade)*

## O que mais fazemos aqui

- [entregável frequente 1: ex. campanhas de marketing]
- [entregável frequente 2: ex. propostas comerciais]
- [entregável frequente 3: ex. relatórios financeiros mensais]

## Tom de voz

[Como a empresa se comunica: interno vs externo pode ser diferente.
Frase real ajuda mais que adjetivos.]

Evitar: [o que destoa da marca]

## Regras do sistema

- Cada setor tem sua pasta na raiz
- Projetos que cruzam setores ficam em `projetos/`
- Propostas comerciais: `/proposta` salva em `comercial/propostas/`
- Relatórios salvar em `financeiro/relatorios/`
- Pipeline geral em `tarefas.md` (via `/tarefas`)
- [outras regras de organização]

## Ferramentas conectadas

- [ ] Notion
- [ ] Gmail
- [ ] Google Calendar
- [ ] Google Ads
- [ ] Meta Ads
- [ ] Slack

*(o `/conectar` marca aqui, com data e nome da variável, depois do teste passar)*
