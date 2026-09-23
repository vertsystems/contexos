# Estrutura do workspace

Referência única de onde cada coisa é salva. O `/instalar` escolhe uma das duas convenções conforme o perfil (empreendedor solo, freelancer, agência, empresa, comércio local, profissional liberal, projeto ou uso livre) e registra a escolha no `CLAUDE.md` do workspace. Toda skill consulta esse arquivo (ou o `CLAUDE.md`) antes de criar pasta.

## Princípio

**Nada é criado antes de ser necessário.** O workspace começa com o `CLAUDE.md`, a `_memoria/` e as pastas do sistema. Nada além disso. Cada pasta de trabalho nasce na primeira vez que uma skill precisa dela.

As pastas do sistema (`.claude/skills/`, `templates/`, `scripts/`) convivem na mesma raiz. O `/atualizar-sistema` substitui só elas quando sai versão nova. O trabalho nunca é tocado.

---

## Convenção A — por tipo de entrega

Aplicada aos perfis **empreendedor solo**, **empresa**, **comércio local**, **profissional liberal** e **projeto**, e de forma **provisória** ao **uso livre**: ali o sistema começa por tipo de entrega e propõe a convenção B uma vez, se um segundo cliente aparecer com trabalho próprio. Um negócio (ou um projeto) só, várias frentes. O que muda entre eles é o centro de gravidade, não a árvore: no comércio local e no profissional liberal é `vendas/` (WhatsApp, pós-venda) mais `avaliacoes-google/` e `financeiro/`; no projeto é `sistemas/` (escopo, decisões, código). O resto nasce conforme o negócio precisa de marca, página ou anúncio.

```
MeuNegocio/
├── CLAUDE.md              contexto e regras (criado pelo /instalar)
├── _memoria/              empresa, preferencias, estrategia, publico, oferta
├── .claude/skills/        as skills instaladas
│
├── identidade/            marca — design-guide, tokens.css, marca.md, logo, assinatura-email/ (/assinatura-email)
├── conteudo/              pautas.md, calendario-<AAAA-MM>.md, indice.md, google-perfil/ (/posts-perfil-google),
│                       novidades/ (/novidades), retencao/ (/retencao-de-video), youtube-*/ (/publicar-video)
│   └── <tipo>-<tema>-<AAAA-MM-DD>/    peças do /carrossel e /publicar-tema
├── pesquisa/              dossiês do /pesquisa
├── site/                  páginas do /landing
├── materiais/             e-books e apostilas do /documento
├── apresentacoes/         decks do /apresentacao
├── propostas/             propostas do /proposta
├── lancamentos/           plano e calendário de cada lançamento (/lancamento)
├── eventos/               plano, roteiro e checklist de cada evento (/evento)
├── parcerias/             ações com outro negócio ou criador local (/parcerias)
├── cursos/                estrutura e roteiro de aula do /curso
├── oferta/                desenho da oferta e estudo de preço (/oferta, /preco)
├── vendas/                roteiros (/vender), pos-venda/, whatsapp/, sequencias/ (/sequencia),
│                       prospeccao/ (/prospeccao), indicacao.md (/indicacao), retencao/ (/retencao),
│                       ensaios/ (/ensaiar) e combos-<mês>.md (/combos)
├── avaliacoes-google/     histórico de respostas do /responder-avaliacoes (só se pedir registro)
├── financeiro/            fechamento e custos fixos (/caixa), projecao-<AAAA-MM>.md (/projecao),
│                       obrigacoes.md (/obrigacoes), cobranca-<AAAA-MM>.md (/cobranca),
│                       conciliacao-<AAAA-MM>.md (/conciliar), retirada.md (/pro-labore),
│                       credito-<data>.xlsx (/emprestimo) e comprovantes/ (/comprovantes)
├── precos/                ficha técnica, planilha e ranking de margem (/ficha-tecnica)
├── cardapio/              margem por canal de delivery (/delivery)
├── estoque/               reposição, encalhado e curva ABC (/estoque)
├── produtos/              anúncio por marketplace (/marketplace)
├── agenda/                taxa de falta, política e régua de confirmação (/confirmacao-de-agenda)
├── operacao/              procedimentos/ com uma folha por tarefa (/procedimento) e capacidade.md (/capacidade)
├── pessoas/               ficha de quem tem relação e indice.md (/pessoa)
├── os/                    ordens de serviço e indice.csv (/ordem-servico)
├── juridico/              acordo de sócios, política de troca e respostas (/socios, /troca-devolucao)
├── impressos/             PDF pra gráfica, com sangria e marca de corte (/impressao)
├── briefings/             questionário pro cliente responder (/briefing)
├── comunicacao/           aviso difícil em três versões, com FAQ (/comunicado)
├── relatorios/            fechamento mensal por cliente (/relatorio-cliente)
├── medicao/               plano de medição, convenção de UTM e leitura do mês por canal (/medir)
├── experimentos/          uma folha por teste A/B (/teste-ab)
├── planilhas/             .xlsx avulsos do /planilha (os que têm dono vão na pasta dele)
├── reunioes/              ata, decisões e transcrição de cada reunião (/reuniao)
├── decisoes/              decisão grande escrita em uma página, com data de revisão (/decidir)
├── contratos/             contratos (/contrato), termos/ (/autorizacao) e revisao-<cliente>.md (/revisar-contrato)
├── imprensa/              pautas, contatos e clipping (/imprensa)
├── seo/                   os 8 arquivos do /seo
├── campanhas/             CSVs do /anuncio-google + relatorios/ do /relatorio-ads
├── analises/              saídas do /analisar-dados
├── emails/                rascunhos longos do /email-profissional
├── revisoes/              fechamentos do /revisao-semanal
├── sistemas/              o que o /escopo decide, o /quebrar ordena (ENTREGAS.md) e o /backend constrói;
│                       GLOSSARIO.md (/glossario), docs/MANUAL.md (/manual-do-sistema),
│                       blindagem-*.md (/blindar) e prototipo/ (/prototipo)
├── dados/                 drop zone: arquivo que você joga aqui pra ser lido
├── scripts/               utilitários e o Playwright (ver templates/scripts.md)
├── biblioteca.md          índice de ativos reutilizáveis
├── biblioteca/cases/      case de cliente com número provado e termo (/case)
├── tarefas.md             pipeline
├── rotinas.md             o que repete, agendado (/rotina)
│
```

E dois arquivos que não são pasta de trabalho: `_memoria/sessao.md` guarda onde
o trabalho parou (/pausar) e o `/abrir` retoma de lá; `site/` recebe tanto a
página única do /landing quanto as várias páginas do /site.

> As pastas `design/`, `copy/`, `backend/`, `software/`, `crescimento/`,
> `financeiro/` e `operacao/` de `templates/` são as **bibliotecas de referência**: conhecimento
> que várias skills consultam, mantido num lugar só. Editar lá muda o
> comportamento de todas as skills que dependem daquilo — é o jeito de calibrar
> o sistema inteiro sem tocar em 51 arquivos.

## Convenção B — por cliente

Aplicada aos perfis **freelancer** e **agência**. O trabalho é organizado por quem paga.

```MinhaAgencia/
├── CLAUDE.md
├── _memoria/
├── .claude/skills/
│
├── identidade/            marca PRÓPRIA (da agência)
├── clientes/
│   └── <Nome>/
│       ├── briefing.md
│       ├── identidade/    marca DO CLIENTE — tem precedência nas peças dele
│       ├── conteudo/
│       ├── pesquisa/
│       ├── site/
│       ├── seo/
│       ├── campanhas/
│       ├── materiais/
│       ├── apresentacoes/
│       ├── propostas/
│       ├── sistemas/
│       ├── lancamentos/   eventos/  parcerias/  cursos/
│       ├── reunioes/      decisoes/  experimentos/
│       └── vendas/        sequencias/ e prospeccao/ feitas pro cliente
│
├── propostas/             prospects que ainda não são clientes
├── conteudo/              conteúdo próprio da agência
├── analises/
├── emails/
├── revisoes/
├── dados/
├── biblioteca.md
├── tarefas.md
│
```

**Regra de decisão no perfil B:** trabalho de cliente vai em `clientes/<Nome>/`; trabalho da própria casa vai na raiz. Em dúvida, perguntar de quem é a peça.

---

## Como as skills usam isso

Toda skill que gera arquivo segue este padrão:

1. Ler a convenção ativa no `CLAUDE.md` do workspace (seção "Onde salvar o que")
2. Montar o caminho conforme a convenção
3. Criar a pasta **só nesse momento**, se ainda não existir
4. Nunca criar pasta "de antemão pra organizar melhor"

Quando a peça é de cliente e a convenção é B, o caminho recebe o prefixo `clientes/<Nome>/`. O resto do caminho é idêntico nas duas convenções. É isso que mantém as skills simples.

## Versionamento

O `.gitignore` que vem no repositório ignora `.env`, `node_modules/` e a drop zone `dados/`. O resto, inclusive as skills e os templates, versiona junto com o trabalho.

O `/salvar` cria o repositório **dele** (o endereço do Contex OS fica guardado como `contexos`, e é de lá que o `/atualizar-sistema` busca versão nova).
