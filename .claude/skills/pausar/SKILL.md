---
name: pausar
description: >
  Fecha a sessão no meio de um trabalho sem perder o fio: registra em `_memoria/sessao.md` o que
  estava sendo feito, em que arquivo, o que foi decidido, o que falta, a próxima ação concreta e o
  que o usuário ainda precisa responder. Formato fixo de até 20 linhas, substituído a cada pausa.
  O `/abrir` lê esse arquivo na sessão seguinte e retoma de onde parou.
  Use quando o usuário disser "vou parar por aqui", "continuo amanhã", "pausa", "preciso sair",
  "salva onde parei", "guarda o que a gente fez", "depois eu volto nisso", "fecha por hoje",
  "anota onde ficou", "tô saindo", ou /pausar.
---

# /pausar — Fechar no meio e voltar de onde parou

> **Convenção de pastas:** a saída é sempre `_memoria/sessao.md`, na raiz, nas duas convenções. É estado do trabalho, não peça de cliente: quando o trabalho é de um cliente (convenção por cliente), o arquivo diz qual, e o caminho da peça já carrega `clientes/<Nome>/`. O histórico, se o usuário quiser, vai em `revisoes/sessao-<AAAA-MM-DD>.md`, e a pasta `revisoes/` nasce na primeira vez que ele pedir.

Cada sessão do assistente começa do zero. O que foi conversado ontem, a proposta que parou no
meio da tabela de preço, a decisão de tirar o plano anual da página: nada disso existe amanhã,
a não ser que esteja escrito em algum arquivo. O usuário volta, diz "continua aquilo", e o
assistente adivinha. Ou ele gasta os primeiros quinze minutos recontando. A memória do negócio
(`_memoria/empresa.md`) guarda quem ele é. O pipeline (`tarefas.md`) guarda com o que ele se
comprometeu. Nenhum dos dois guarda o meio do caminho: o arquivo aberto, a decisão tomada há
dez minutos, a pergunta que ficou no ar. É isso que o `/pausar` guarda.

No perfil **uso livre** esse arquivo pesa ainda mais: a memória começa quase vazia e o sistema
aprende pelo uso. Sem o `sessao.md`, cada sessão recomeça sem saber nem o que estava sendo
construído.

## Dependências

- **A própria conversa:** é a fonte principal. O estado do trabalho está nela, não em arquivo
- **Contexto:** `_memoria/empresa.md` (só pra saber o perfil e a convenção de pastas) e, no uso livre, a lista "O que eu já sei" do `CLAUDE.md`
- **Pipeline:** `tarefas.md`, se existir. Compromisso com data que apareceu na sessão vai pra lá, não pro `sessao.md`
- **Sessão anterior:** `_memoria/sessao.md`, se existir. É substituído, e o conteúdo antigo só sobrevive se o usuário quiser histórico
- **Preferência de histórico:** a linha "Histórico de sessão" em `_memoria/preferencias.md`, quando já existir
- **Git:** `.git/` na raiz, pra contar o que está sem salvar e oferecer o `/salvar`
- **Saída:** `_memoria/sessao.md` (um só, substituído a cada pausa); histórico opcional em `revisoes/sessao-<AAAA-MM-DD>.md`

Sem molde e sem script: o formato é curto o bastante pra caber na própria skill.

---

## Workflow

### Passo 1 — Reconhecer que ele está saindo

Quem diz "preciso sair" está com a mão na porta. A skill inteira precisa caber em um turno:
levantar, escrever, confirmar em três linhas. Nada de "antes de você ir, me conta".

Três situações, e cada uma tem saída própria:

| A sessão... | O que fazer |
|---|---|
| Deixou trabalho no meio (arquivo aberto, skill parada num passo, decisão tomada e não aplicada) | Seguir pro Passo 2 |
| Só teve conversa, pergunta respondida ou peça concluída, e não existe `sessao.md` anterior | Dizer "não ficou nada no meio" em uma linha e encerrar, sem criar arquivo |
| Terminou o trabalho que um `sessao.md` anterior guardava, e não abriu outro | O arquivo antigo sai (Passo 5). Avisar em uma linha: "A proposta da Padaria X ficou pronta; tirei a pausa antiga" |

`sessao.md` vazio, ou apontando pra trabalho que já acabou, é pior que nenhum: o `/abrir` vai
mostrar uma pendência que não existe, e em dois dias ele para de confiar na linha "Pendente".

Se havia mais de uma frente aberta na sessão, o arquivo guarda **só o que ficou no meio**.
O que foi concluído já está no arquivo da peça e não precisa de estado. No máximo duas
frentes; se houver uma terceira, ela vira item em `tarefas.md` com a origem marcada
("origem: sessão de <DD/MM>"), do jeito que o `/tarefas` pede.

### Passo 2 — Levantar o estado pela conversa, sem perguntar

Antes de escrever, montar as seis respostas a partir do que aconteceu na sessão:

| Campo | De onde vem | O que não vale |
|---|---|---|
| **Fazendo** | A skill ou tarefa em andamento e a peça (proposta pra quem, página de quê) | "Trabalhando no site" |
| **Arquivo** | O caminho do arquivo que estava sendo editado, e o estado dele | Nome de pasta sem arquivo |
| **Decidido** | O que o usuário fechou na sessão, com o motivo em meia linha | O que foi discutido e não fechou |
| **Falta** | Os passos da skill que não foram feitos, na ordem | "Terminar" |
| **Próxima ação** | O primeiro passo da retomada: arquivo e o que fazer nele | "Continuar" |
| **Precisa responder** | Pergunta feita e não respondida, `[a confirmar]` que ficou aberto | Pergunta que a skill nem chegou a fazer |

Os arquivos tocados não se listam de memória. Conferir por comando o que mudou nas últimas
oito horas, fora das pastas do sistema:

```bash
find . -type f -mmin -480 \
  -not -path "./.claude/*" -not -path "./templates/*" -not -path "./scripts/*" \
  -not -path "./node_modules/*" -not -path "./.git/*" | head -20
```

Arquivo que apareceu na lista mas não passou pela conversa é de outro trabalho (sincronia de
nuvem, edição manual dele) e não entra no `Fazendo`. A lista serve só pra não esquecer um
arquivo que a conversa tocou de passagem: o rascunho de e-mail aberto no meio da proposta,
a linha mudada no `tarefas.md`.

Se o git existe, contar o que está sem salvar:

```bash
git status --porcelain 2>/dev/null | wc -l
```

O número entra na última linha do arquivo. Sem `.git/` (ele baixou o zip em vez de clonar),
a linha diz "sem git" e a skill não sugere criar um: isso é conversa do `/salvar`, quando ele
quiser.

### Passo 3 — Uma pergunta, e só se ela muda a retomada

Perguntar **uma** coisa, no máximo, e só quando a próxima ação fica ambígua entre dois
caminhos que levam a trabalho diferente. Exemplo: a proposta parou com dois valores em
discussão, e sem saber qual ele escolheu a retomada começa do lugar errado.

> "Antes de eu anotar: a proposta segue com o valor fechado ou com o pacote em duas parcelas? Só isso."

Se ele já se despediu ("tchau", "até amanhã") ou não responder, não esperar: a dúvida entra
em **Precisa responder**, literal, e a próxima ação passa a ser "responder isso e seguir".
Uma pergunta aberta é um estado válido. Uma pergunta que atrasa a saída não é.

Essa é a única pergunta da skill. A oferta do `/salvar` (Passo 6) não conta como pergunta:
ele responde se quiser, e o silêncio vale como não.

### Passo 4 — Escrever o arquivo

Data e hora por comando, nunca de cabeça: `date "+%d/%m/%Y %H:%M"`. Se o arquivo citar dia da
semana ("retomar na segunda"), conferir com `node scripts/verificar.js datas _memoria/sessao.md`.

Esqueleto:

```markdown
# Sessão pausada — <DD/MM/AAAA HH:MM>

**Fazendo:** <skill ou tarefa>: <peça>, pra <cliente ou frente>
**Arquivo:** `<caminho/do/arquivo>` (<rascunho | faltam N seções | pronto, sem revisar>)
**Decidido:**
- <decisão>, porque <motivo em meia linha>
- <decisão>
**Falta:**
- <passo não feito, na ordem da skill>
- <passo não feito>
**Próxima ação:** abrir `<arquivo>` e <verbo + o quê>, começando por <ponto exato>
**Precisa responder:**
- <pergunta aberta, do jeito que foi feita>
**Git:** <N arquivos sem salvar (rode /salvar) | tudo salvo | sem git>
```

Preenchido, fica assim (freelancer, convenção por cliente, proposta parada no meio):

```markdown
# Sessão pausada — 14/06/2026 18:40

**Fazendo:** /proposta: proposta de site institucional, pra Padaria Dois Irmãos
**Arquivo:** `clientes/Padaria Dois Irmãos/proposta-2026-06-14.html` (faltam 2 seções: investimento e prazo)
**Decidido:**
- Sai o plano de manutenção mensal, porque ele não quer compromisso recorrente agora
- Entrega em duas etapas (página inicial primeiro), porque a inauguração é antes do site inteiro
**Falta:**
- Passo 3 do /proposta: seções de investimento e prazo no HTML (conferir a tabela com `verificar.js tabela`)
- Passo 4: revisão antes de entregar
**Próxima ação:** abrir o arquivo acima e escrever a seção "Investimento", começando pela linha da página inicial
**Precisa responder:**
- O valor da proposta é o da conversa de hoje ou o da tabela do /preco? Ele citou os dois
**Git:** 3 arquivos sem salvar (rode /salvar)
```

Quinze linhas. Quem nunca viu a conversa abre o arquivo da proposta e sabe onde escrever.

Cada campo tem uma regra de conteúdo:

- **Fazendo** nomeia a skill quando houver (`/proposta`, `/landing`, `/backend`) e a peça. No
  uso livre, onde o pedido raramente vem com nome de skill, vale a tarefa como ele pediu:
  "a página do cardápio", "o texto pro Instagram da promoção"
- **Arquivo** aponta o caminho real, conferido no `find` do Passo 2. Se o trabalho ainda não
  gerou arquivo (parou na entrevista da skill, por exemplo), dizer isso: "ainda sem arquivo,
  parou no Passo 2 do `/oferta`"
- **Decidido** só recebe o que o usuário fechou. "Discutimos tirar o plano anual" não é
  decisão. "Tirou o plano anual, porque ninguém comprou em seis meses" é
- **Próxima ação** é a linha mais importante do arquivo. Ela precisa ser executável por
  quem nunca viu a conversa: arquivo, verbo, ponto de partida. Se não dá pra escrever
  assim, o que falta é uma decisão dele, e ela vai em **Precisa responder**
- **Git** vem do comando do Passo 2, não de suposição

Antes de fechar, duas conferências por comando:

```bash
wc -l _memoria/sessao.md      # até 20 linhas
grep -nEi 'sk-[a-z0-9]|ghp_|AKIA|token|senha|password|secret|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}' _memoria/sessao.md
```

O `grep` tem que voltar vazio. Ele existe porque o `sessao.md` é versionado pelo `/salvar`:
se a sessão envolveu chave de API ou token, a linha certa é "chave configurada no `.env`",
nunca o valor. O `node scripts/verificar.js segredo` não serve aqui: ele enumera pelo
`git ls-files`, e um `sessao.md` que ainda não foi comitado passa em branco por ele. O
`/salvar` roda o `segredo` na hora do commit; a leitura do arquivo agora é o que impede a
chave de chegar lá.

Passou de 20 linhas: cortar primeiro a decisão mais antiga, depois o "Falta" além do terceiro
item. Detalhe longo mora no arquivo da peça, não aqui.

### Passo 5 — Substituir, e guardar histórico só se ele pedir

Se já existe `_memoria/sessao.md`, o novo substitui o antigo. Sem acumular sessões no mesmo
arquivo: o `/abrir` lê um estado, não um diário.

O que acontece com o antigo depende da linha "Histórico de sessão" em
`_memoria/preferencias.md`:

| A linha diz | O que fazer com o antigo |
|---|---|
| "guardar em `revisoes/`" | Copiar pra `revisoes/sessao-<AAAA-MM-DD>.md` (a data do arquivo antigo, não a de hoje) antes de sobrescrever. Criar `revisoes/` se ainda não existir; é a mesma pasta do `/revisao-semanal` |
| "substituir sempre" | Sobrescrever |
| Não existe | Sobrescrever, e gravar a linha `Histórico de sessão: substituir sempre (padrão; oferecido em <DD/MM>)` em `preferencias.md` |

Na primeira substituição a oferta vai na mensagem final, não como pergunta: "Substituí a pausa
de 12/06. Se quiser histórico das sessões em `revisoes/`, é só dizer." Ele responde quando
quiser, a linha em `preferencias.md` muda, e a oferta não se repete. Quem está saindo não
decide política de arquivo.

Quando o trabalho pausado terminou e não abriu outro (terceira linha da tabela do Passo 1),
vale a mesma regra pro arquivo antigo: copia pra `revisoes/` se a preferência é guardar, e
depois `rm _memoria/sessao.md`. O arquivo é estado da própria skill, e estado de trabalho
concluído só produz pendência falsa no `/abrir`.

**No uso livre**, aproveitar o fechamento pra consolidar o que a sessão ensinou: se apareceu
fato sobre o negócio que ainda não está na lista "O que eu já sei" do `CLAUDE.md` (o cliente
se chama Padaria X, ele atende pelo WhatsApp, usa Supabase), registrar agora, do jeito que o
perfil manda: sem perguntar, com a data, e uma linha no fim avisando o que foi anotado.
Fato que ficou no `sessao.md` e não foi pra memória some na próxima pausa.

### Passo 6 — Oferecer o /salvar e fechar em três linhas

Se o git existe e o contador do Passo 2 deu mais que zero, uma linha, e o que ela diz
depende de já existir repositório dele (`git remote -v`, como na tabela do `/salvar`):

| `git remote -v` mostra | A linha |
|---|---|
| `origin` dele (endereço que não é `vertsystems/contexos`) | "Tem 4 arquivos mudados sem salvar no GitHub. Quer que eu rode o `/salvar` antes de você sair?" |
| Só `contexos`, ou `origin` ainda apontando pro produto | "Tem 4 arquivos mudados e ainda não existe repositório seu. O `/salvar` cria um na primeira vez, leva uns dois minutos. Quer fazer agora ou na volta?" |

Sim: rodar o `/salvar` (que faz a checagem de segredo e o commit) e só então encerrar. Não,
"na volta" ou silêncio: seguir sem insistir; o número já está no arquivo e o `/abrir` vai
lembrar.

A mensagem final cabe em três linhas e repete a próxima ação, porque é o que ele vai ler
primeiro quando voltar:

```
Pausado. Próxima ação: abrir `clientes/Padaria Dois Irmãos/proposta-2026-06-14.html` e escrever a seção "Investimento", começando pela linha da página inicial.
Você ainda precisa responder: o valor é o da conversa de hoje ou o da tabela do /preco?
Quando voltar, é só dizer "abrir" que eu retomo daí.
```

Sem resumo da sessão, sem "bom descanso", sem lista do que foi lido. A oferta de histórico do
Passo 5 e a linha "Anotei: ..." do uso livre, quando existirem, entram antes dessas três.

---

## Como o /abrir retoma

O `/abrir` já monta a linha "Pendente" a partir de `tarefas.md`, do calendário e dos rascunhos
(Passo 3 dele, "Checagem rápida de pendências"). A alteração é **um item a mais nessa lista,
o primeiro**, e nada além disso. O texto a inserir no `/abrir`, antes do item do `tarefas.md`:

```markdown
   - `_memoria/sessao.md` — se existir, é o primeiro item de "Pendente", no formato
     `<Fazendo>, pausado em <DD/MM>. Próxima ação: <Próxima ação>`; se o arquivo tem
     "Precisa responder", a pergunta vem logo depois, literal. Pausa com mais de 14 dias
     ganha "(ainda vale?)" no fim
```

A linha "Pendente" já existe nos dois formatos do resumo (o normal e o do uso livre), então o
restante do `/abrir` não muda: o limite de 6 linhas continua, e a pausa ocupa uma delas. Com
o arquivo do exemplo do Passo 4, o usuário lê:

```
Pendente: /proposta pra Padaria Dois Irmãos, pausado em 14/06. Próxima ação: abrir o arquivo da proposta e escrever a seção "Investimento". Precisa responder: o valor é o da conversa ou o da tabela do /preco?
```

Ele responde a pergunta e o trabalho segue do ponto exato. Quem tira o arquivo do caminho
depois é o `/pausar` seguinte (Passo 5), quando o trabalho terminar.

---

## Regras

- **Nunca próxima ação vaga.** "Continuar o site" não vale. "Abrir `site/index.html` e escrever a seção de depoimentos, que está com placeholder" vale. Se a ação não cabe em arquivo + verbo + ponto de partida, o que falta é decisão, e decisão pendente vai em **Precisa responder**
- **Cabe em 20 linhas, contadas por comando.** Passou, corta. O detalhe mora na peça; aqui é o mapa pra voltar
- **Um arquivo, substituído a cada pausa.** Histórico só em `revisoes/`, só se ele pediu, e a preferência fica anotada pra não oferecer de novo
- **Nunca inventar decisão.** O que foi conversado e não fechou entra como pergunta aberta, não como decidido. Decisão inventada aqui vira peça errada amanhã
- **Uma pergunta no máximo, e só se muda a retomada.** Quem está saindo não responde questionário. Se ele já se despediu, nenhuma. Oferta (do `/salvar`, do histórico) é uma linha que ele pode ignorar
- **Oferecer o `/salvar` em uma linha** quando há git e mudança sem commit. Nunca rodar sem confirmação, nunca insistir. Se ainda não existe repositório dele, a linha avisa que o primeiro `/salvar` cria um, e ele escolhe se é agora ou na volta
- **Sessão sem trabalho no meio não gera arquivo.** Só conversa, só pergunta respondida, só peça concluída: dizer "não ficou nada no meio" e encerrar. E se a pausa anterior era de um trabalho que terminou, o arquivo sai
- **Não é revisão.** Medir o que saiu na semana, cruzar produção com resultado e mexer em `_memoria/estrategia.md` é `/revisao-semanal`. Aqui não se avalia nada
- **Não é pipeline.** Compromisso com terceiro e data ("follow-up da Acme dia 12") vai pra `tarefas.md` pelo `/tarefas`, com a origem marcada. O `sessao.md` guarda o estado de um trabalho, não a lista do que fazer na semana
- **Não é commit.** Guardar o estado não é salvar o trabalho. O `/salvar` é quem põe no GitHub; esta skill só avisa que falta
- **Fato sobre o negócio não fica preso aqui.** Cliente novo, ferramenta, canal, preferência de tom que apareceu na sessão vai pra `_memoria/` pelo fluxo normal do `CLAUDE.md` (ou pro "O que eu já sei", no uso livre). O `sessao.md` some na próxima pausa; a memória fica
- **Dado sensível não entra.** Chave, senha, token, CPF ou CNPJ de cliente, conteúdo de planilha colada na conversa: nada disso vai pro `sessao.md`, que é versionado. Apontar o arquivo em `dados/` (que o git ignora) e rodar o `grep` do Passo 4 antes de fechar. Base de cliente é dado pessoal (LGPD) e não sai do workspace por esta skill
- **Fronteira com as vizinhas:** fechar a semana com medição é `/revisao-semanal`; commit e push é `/salvar`; a lista do que está em jogo é `/tarefas`; atualizar a memória do negócio é `/atualizar`; a abertura que lê tudo isso é `/abrir`. O `/pausar` é só o meio do caminho: onde parou, por quê, e o primeiro passo pra voltar
