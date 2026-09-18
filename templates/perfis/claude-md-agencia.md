# [Nome da Agência] — ContexOS

> Molde do CLAUDE.md aplicado a **agência** — equipe pequena entregando
> pra múltiplos clientes ao mesmo tempo. O sistema gira em torno de
> proposta, atendimento e produção em paralelo. O `/instalar` adapta
> esse molde com a sua realidade.

## O que é esse workspace

[Uma frase do que essa pasta representa. Ex: "Operação da agência.
Aqui ficam todos os clientes, propostas, conteúdo e entregas."]

## Onde salvar o que

**Convenção: por cliente.** Trabalho de cliente vai em `clientes/<Nome>/`;
trabalho da casa vai na raiz. Cada pasta nasce quando a primeira peça é
criada: workspace não tem pasta vazia.

**Trabalho de cliente** — dentro de `clientes/<Nome>/`:

| O que | Onde |
|---|---|
| Briefing e estratégia | `clientes/<Nome>/briefing.md` |
| Marca **do cliente** (tem precedência nas peças dele) | `clientes/<Nome>/identidade/` |
| Conteúdo, pesquisa, site, SEO, campanhas, materiais, decks | `clientes/<Nome>/<tipo>/` |
| Proposta de cliente ativo (upsell, renovação) | `clientes/<Nome>/propostas/` |
| Case de sucesso (reuso em pitch) | `clientes/<Nome>/caso.md` |

**Da agência** — na raiz:

| O que | Onde | Skill |
|---|---|---|
| Memória da agência | `_memoria/` | `/instalar`, `/atualizar` |
| Marca da agência: visual e verbal | `identidade/` | `/design-system`, `/marca` |
| Proposta de prospect | `propostas/` | `/proposta` |
| Conteúdo institucional | `conteudo/` | `/carrossel`, `/publicar-tema` |
| Deck de pitch da agência | `apresentacoes/` | `/apresentacao` |
| Análises e relatórios avulsos | `analises/` | `/analisar-dados` |
| Desenho da oferta e estudo de preço | `oferta/` | `/oferta`, `/preco` |
| Roteiros de conversa de venda | `vendas/` | `/vender` |
| Pautas e contatos de imprensa | `imprensa/` | `/imprensa` |
| Fechamentos de semana | `revisoes/` | `/revisao-semanal` |
| Export de cliente pra analisar | `dados/` | — |
| Índice de ativos e cases | `biblioteca.md` | `/biblioteca` |
| Pipeline da agência | `tarefas.md` | `/tarefas` |

**Regra de marca:** peça de cliente usa a identidade dele
(`clientes/<Nome>/identidade/`); peça institucional usa a da agência. Nunca
misturar as duas na mesma peça.

Em dúvida de quem é a peça, perguntar antes de criar. Quando um prospect
virar cliente, mover a proposta pra `clientes/<Nome>/`.

As pastas do sistema (`.claude/skills/`, `templates/`, `scripts/`) convivem na
raiz e são substituídas quando sai versão nova do ContexOS. Não guarde trabalho
dentro delas: o resto da raiz é seu.

## Sobre a agência

Somos uma [tipo: marketing digital / design / conteúdo / consultoria de IA].
Atendemos [perfil de cliente real]. Nossos serviços principais:

- [serviço 1]
- [serviço 2]
- [serviço 3]

Time: [N pessoas]. Capacidade: [N clientes ativos simultâneos].

## Clientes ativos

[Lista breve. O `/atualizar` mantém isso sincronizado com as pastas em
`clientes/`.]

## O que mais produzimos aqui

- Propostas comerciais pra novos clientes
- [outros entregáveis frequentes: ads, conteúdo, relatórios]

## Tom de voz

[Como a agência se comunica, com cliente, em conteúdo público,
internamente. Frase real ajuda mais que adjetivos.]

Evitar: [o que destoa]

## Regras do sistema

- Cliente novo → `/novo-projeto` cria a pasta `clientes/<Nome>/` com briefing,
  estratégia e subpastas conforme as entregas contratadas
- Proposta nova → `/proposta` gera `propostas/<cliente>-<data>.html` antes de fechar
- Pipeline e follow-up de proposta → `tarefas.md` (via `/tarefas`)
- Casos de sucesso ficam em `clientes/<Nome>/caso.md` (reuso em pitches)
- Peça de cliente segue a marca **do cliente**; peça institucional segue a marca
  da agência (`identidade/`)
- [outras regras que aparecerem com o uso]

## Ferramentas conectadas

- [ ] Notion
- [ ] Gmail
- [ ] Google Calendar
- [ ] Canva
- [ ] Meta Ads
- [ ] Google Ads

*(Marcar conforme for instalando os MCPs)*
