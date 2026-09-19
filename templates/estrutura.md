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
├── identidade/            marca — design-guide, tokens.css, marca.md, logo
├── conteudo/              pautas.md, calendario-<AAAA-MM>.md, indice.md
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
├── vendas/                roteiros de venda (/vender), pos-venda/, whatsapp/, sequencias/ (/sequencia), prospeccao/ (/prospeccao) e indicacao.md (/indicacao)
├── avaliacoes-google/     histórico de respostas do /responder-avaliacoes (só se pedir registro)
├── financeiro/            fechamento do mês e custos fixos (/caixa), projecao-<AAAA-MM>.md (/projecao) e obrigacoes.md (/obrigacoes)
├── medicao/               plano de medição, convenção de UTM e leitura do mês por canal (/medir)
├── experimentos/          uma folha por teste A/B (/teste-ab)
├── planilhas/             .xlsx avulsos do /planilha (os que têm dono vão na pasta dele)
├── reunioes/              ata, decisões e transcrição de cada reunião (/reuniao)
├── decisoes/              decisão grande escrita em uma página, com data de revisão (/decidir)
├── contratos/             contratos de prestação de serviço (/contrato)
├── imprensa/              pautas, contatos e clipping (/imprensa)
├── seo/                   os 8 arquivos do /seo
├── campanhas/             CSVs do /anuncio-google + relatorios/ do /relatorio-ads
├── analises/              saídas do /analisar-dados
├── emails/                rascunhos longos do /email-profissional
├── revisoes/              fechamentos do /revisao-semanal
├── sistemas/              o que o /escopo decide, o /quebrar ordena (ENTREGAS.md) e o /backend constrói
├── dados/                 drop zone: arquivo que você joga aqui pra ser lido
├── scripts/               utilitários e o Playwright (ver templates/scripts.md)
├── biblioteca.md          índice de ativos reutilizáveis
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
