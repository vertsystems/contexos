# [Nome do Projeto] — ContexOS

> Molde do CLAUDE.md aplicado a **projeto** — uma coisa só sendo construída:
> um sistema, um app, um site, um produto, uma ideia pra validar. Ainda não é
> empresa (ou é uma frente isolada dentro de uma). O sistema gira em torno de
> tirar o projeto do papel: escopo, código, marca e a primeira venda. O
> `/instalar` adapta esse molde com a sua realidade.

## O que é esse workspace

[Uma frase do que essa pasta representa. Ex: "Do zero ao produto no ar:
escopo, código, marca, site e as primeiras vendas do <nome>."]

## Onde salvar o que

**Convenção: por tipo de entrega.** Cada pasta nasce quando a primeira peça
daquele tipo é criada: workspace não tem pasta vazia.

| O que | Onde | Skill |
|---|---|---|
| Memória do projeto | `_memoria/` | `/instalar`, `/atualizar` |
| Escopo, decisões e código | `sistemas/` | `/escopo`, `/backend`, `/testar`, `/evoluir` |
| Marca: visual e verbal | `identidade/` | `/design-system`, `/marca` |
| Página do projeto | `site/` | `/landing` |
| Dossiês de pesquisa (mercado, concorrente) | `pesquisa/` | `/pesquisa`, `/concorrente` |
| Desenho da oferta e estudo de preço | `oferta/` | `/oferta`, `/preco` |
| Roteiros de conversa de venda | `vendas/` | `/vender` |
| Pautas, calendário, peças de conteúdo | `conteudo/` | `/ideias`, `/calendario`, `/carrossel` |
| Decks (pitch, demo) | `apresentacoes/` | `/apresentacao` |
| Propostas | `propostas/` | `/proposta` |
| SEO (8 arquivos) | `seo/` | `/seo` |
| Campanhas e relatórios de ads | `campanhas/` | `/anuncio-google`, `/relatorio-ads` |
| Análises de arquivo | `analises/` | `/analisar-dados` |
| Fechamentos de semana | `revisoes/` | `/revisao-semanal` |
| Arquivo pra eu ler uma vez | `dados/` | — |
| Índice de ativos | `biblioteca.md` | `/biblioteca` |
| Pipeline | `tarefas.md` | `/tarefas` |

As pastas do sistema (`.claude/skills/`, `templates/`, `scripts/`) convivem na
raiz e são substituídas quando sai versão nova do ContexOS. Não guarde trabalho
dentro delas: o resto da raiz é seu.

## O projeto

**[Nome]** é [o que é, em uma frase do jeito que você falaria pro vizinho].

**Promessa:** [o que muda pra quem usa, em uma linha].

**Pra quem:** [quem usa e quem paga, se forem pessoas diferentes. Perfil real,
não persona genérica.]

**Fase:** [ideia | validando | construindo | no ar]. Iniciado em [mês/ano].

**Referência:** [concorrente ou produto parecido, se houver, com o que ele
cobra e o que faz mal.]

## Quem toca

[Só eu | eu + <quem>]. [O que cada um faz.]

## Tom de voz

[Como o projeto fala com quem usa. Frase de exemplo vale mais que adjetivos.
Se ainda não sabe, deixar "a calibrar" e o sistema segue direto e simples.]

Evitar: [o que destoa]

## Regras do sistema

- Decisão de escopo passa pelo `/escopo` antes de virar código: o que
  entra, o que fica de fora e por quê ficam em `sistemas/<nome>/escopo.md`
- Código nasce em `sistemas/<nome>/` (ou no repositório próprio, se o
  projeto já tem um — registrar o caminho aqui)
- O que está em jogo agora fica em `tarefas.md` (via `/tarefas`)
- [outras regras que aparecerem com o uso]

## Ferramentas conectadas

- [ ] GitHub
- [ ] Vercel / hospedagem
- [ ] Supabase / banco
- [ ] Notion
- [ ] Google Analytics

*(Marcar conforme for instalando os MCPs)*
