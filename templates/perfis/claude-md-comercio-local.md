# [Nome do Negócio] — Contex OS

> Molde do CLAUDE.md aplicado a **comércio / negócio local** — loja, restaurante,
> clínica, salão, oficina, pet shop, academia. Tem endereço, horário e cliente
> que passa na porta ou chama no WhatsApp. O sistema gira em torno de três
> coisas: ser encontrado (Google, Instagram), atender sem perder venda
> (WhatsApp, avaliações) e saber quanto sobra no fim do mês. O `/instalar`
> adapta esse molde com a sua realidade.

## O que é esse workspace

[Uma frase do que essa pasta representa. Ex: "Operação da <nome>: o que
publico, como respondo cliente, o que anuncio e quanto sobra no mês."]

## Onde salvar o que

**Convenção: por tipo de entrega.** Cada pasta nasce quando a primeira peça
daquele tipo é criada: workspace não tem pasta vazia.

| O que | Onde | Skill |
|---|---|---|
| Memória do negócio | `_memoria/` | `/instalar`, `/atualizar` |
| Atendimento no WhatsApp (respostas prontas, catálogo, ausência) | `vendas/whatsapp/` | `/whatsapp` |
| Depois da venda (depoimento, reativação, orçamento parado) | `vendas/pos-venda/` | `/pos-venda` |
| Respostas às avaliações do Google (histórico, se quiser guardar) | `avaliacoes-google/` | `/responder-avaliacoes` |
| Fechamento do mês, custo fixo, o que dá lucro | `financeiro/` | `/caixa` |
| Pautas, calendário, peças de conteúdo | `conteudo/` | `/ideias`, `/calendario`, `/carrossel` |
| Campanhas e relatórios de ads | `campanhas/` | `/anuncio-google`, `/relatorio-ads` |
| Marca: visual e verbal | `identidade/` | `/design-system`, `/marca` |
| Página (cardápio, catálogo, promoção, agendamento) | `site/` | `/landing` |
| SEO local (8 arquivos) | `seo/` | `/seo` |
| Desenho da oferta e estudo de preço | `oferta/` | `/oferta`, `/preco` |
| Roteiros de conversa de venda | `vendas/` | `/vender` |
| Dossiês de pesquisa (concorrente da região) | `pesquisa/` | `/pesquisa`, `/concorrente` |
| Análises de arquivo (relatório do PDV, planilha de vendas) | `analises/` | `/analisar-dados` |
| Fechamentos de semana | `revisoes/` | `/revisao-semanal` |
| Arquivo pra eu ler uma vez | `dados/` | — |
| Índice de ativos | `biblioteca.md` | `/biblioteca` |
| Pipeline | `tarefas.md` | `/tarefas` |

As pastas do sistema (`.claude/skills/`, `templates/`, `scripts/`) convivem na
raiz e são substituídas quando sai versão nova do Contex OS. Não guarde trabalho
dentro delas: o resto da raiz é seu.

## O negócio

**[Nome]** é [tipo: padaria / restaurante / clínica / salão / loja de <x>] em
[bairro, cidade]. [O que vende, em uma frase do jeito que o cliente pediria.]

**Endereço:** [rua, número, bairro, cidade]
**Horário:** [seg a sex 8h–18h, sáb 8h–13h, dom fechado]
**Como o cliente chega:** [passa na porta | WhatsApp | iFood/app | Google | indicação]
**Ticket médio:** [R$ x por compra/visita]
**O que mais sai:** [os 3 a 5 itens ou serviços que carregam o faturamento]
**Google Meu Negócio:** [link do perfil ou "não reivindicado"]

## Quem toca

[Só eu | eu + <N> pessoas]. [Quem atende, quem responde o WhatsApp, quem cuida
do caixa. Quem responde o WhatsApp é quem o `/whatsapp` escreve pra.]

## Cliente

[Quem compra de verdade: perfil real, sem persona. Ex: "moradora do bairro, 30
a 55 anos, compra 3 vezes por semana, pede no WhatsApp e passa pra buscar".]

## Tom de voz

[Como o negócio fala com o cliente: no balcão, no WhatsApp, na legenda.
Frase real vale mais que adjetivos. Ex: "Bom dia! Tem sim, a fornada sai 15h".]

Evitar: [o que destoa. Quase sempre: linguagem de empresa grande, "prezado
cliente", "experiência diferenciada", "qualidade ímpar"]

## Regras do sistema

- Preço, horário e endereço vêm **daqui** e de `_memoria/empresa.md`. Skill
  nenhuma inventa esses dados: se mudou, atualizar aqui antes de gerar peça
- Avaliação do Google se responde em até 48h e sempre com o nome do cliente
  (`/responder-avaliacoes`). Review de 1 a 3 estrelas não se discute em público
- Promoção com data tem a data conferida (`node scripts/verificar.js datas`)
  antes de sair, e o preço batido com a tabela atual
- Fechamento do mês é no `/caixa`, com o extrato ou a planilha do PDV em
  `dados/`. Faturamento e sobra são números diferentes, e o segundo decide
- O que está em jogo agora fica em `tarefas.md` (via `/tarefas`)
- [outras regras que aparecerem com o uso]

## Ferramentas conectadas

- [ ] Google Meu Negócio
- [ ] WhatsApp Business
- [ ] Instagram
- [ ] Meta Ads
- [ ] Google Ads
- [ ] iFood / app de delivery
- [ ] Sistema de PDV / agenda

*(Marcar conforme for instalando os MCPs)*
