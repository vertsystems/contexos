# Versões — voltar atrás sem perder o resto

Referência da skill `/backend`. O histórico do código: commit que dá pra desfazer, etiqueta
que diz o que está no ar, e o que fazer quando o segredo já foi comitado.

---

## O que o `/salvar` resolve, e o que ele não resolve

O `/salvar` comita tudo e empurra pro GitHub a cada mudança. Isso é backup, e backup é a
parte urgente: repositório que só existe na sua máquina morre junto com o notebook. Voltar
atrás é outro problema. Desfazer exige saber qual commit trocou o quê, e isso se decide na
hora de montar o commit, não na hora do push.

São três voltas diferentes, e só uma delas está neste arquivo:

- **Código:** aqui
- **Publicação** (substituição, azul-verde, canário, chave de funcionalidade): `templates/backend/entrega.md`, seção "Publicar"
- **Banco** (migração em duas etapas, backup confirmado antes): `templates/backend/dados.md`, seção "Migração de banco"

A do banco é a única que git nenhum resolve. Linha apagada por um `DELETE` não está no
histórico do repositório.

---

## Um commit por intenção

Commit que junta cinco assuntos não dá pra desfazer. Pra tirar o que quebrou você leva junto
o resto do dia de trabalho, inclusive o que estava certo. Commit pequeno é o que transforma
"voltar atrás" num comando em vez de uma cirurgia.

**Se a mensagem precisa de um "e", são dois commits.**

```bash
git status                    # o que está dentro e o que está fora do commit
git diff                      # revisar linha por linha antes de gravar
git add src/frete.ts          # arquivo novo exige add explícito
git commit -m "Corrige frete grátis que não aplicava acima de R$ 200"
```

A mensagem descreve a alteração, não o arquivo mexido. "Atualiza pedidos.ts" não responde
nada daqui a seis meses. A outra responde, e é ela que você vai ler no dia do susto.

Código substituído se apaga, não se comenta. O histórico já guarda a versão anterior, e essa
é a razão de ele existir. Trecho comentado "por segurança" vira ruído em uma semana e mentira
em um mês.

---

## A etiqueta que diz o que está no ar

Toda subida pra produção ganha uma etiqueta anotada (tag) com o número da versão. É a foto do
código no momento da entrega.

```bash
git tag -a v1.4.0 -m "Cadastro de cliente com CNPJ"
git push origin --tags        # tag só local não existe pra mais ninguém
git describe --tags           # de qual versão saiu este código
git diff v1.3.0..v1.4.0       # o que mudou entre a que funcionava e a que quebrou
```

Sem etiqueta, a pergunta "o que está no ar agora?" vira arqueologia: olhar a data do deploy,
cruzar com o log, torcer pra ninguém ter publicado fora do fluxo. Com etiqueta, é um comando.
E "o que mudou desde a versão que funcionava" passa a ter resposta em segundos, que é
exatamente o que se precisa saber com o cliente esperando na linha.

**Quando pular:** hospedagem que guarda cada publicação junto do commit e deixa voltar pelo
painel (Vercel, Railway, Render e semelhantes) já cumpre esse papel. Aí a etiqueta é
redundância, não disciplina.

---

## Desfazer

| A situação | O comando | Por quê |
|---|---|---|
| Alteração ainda só na sua máquina | `git restore <arquivo>` | ninguém viu, não há histórico a preservar |
| Commit local que ninguém baixou | `git reset --soft HEAD~1` | desfaz o commit e devolve a alteração pra você refazer |
| Commit já enviado | `git revert <hash>` | grava um commit novo desfazendo, sem reescrever o passado |
| A publicação inteira | volta de deploy | `templates/backend/entrega.md`, seção "Publicar" |

**Nunca rode `reset --hard` no que já foi enviado.** Ele descarta commits do histórico, e o
histórico é o motivo de existir controle de versão. Quem já baixou aqueles commits fica com
uma cópia divergente da sua, e a próxima integração entre vocês vira um problema novo, em
cima do que você estava tentando consertar.

A mesma regra vale pra qualquer reescrita: `rebase`, `commit --amend`, `push --force`. Antes
do push, à vontade. Depois do push, a única forma de desfazer é um commit novo.

---

## `.gitignore` antes do primeiro `add`

O que entra no histórico não sai mais. Criar o `.gitignore` custa um minuto no primeiro dia e
resolve pra sempre. O `/salvar` já cobre `.env`, `node_modules/` e a pasta `dados/` dentro do
workspace do Contex OS, mas todo projeto de código precisa do seu.

```gitignore
.env
.env.*
node_modules/
dist/
*.log
```

**Segredo já comitado.** Sintoma: a chave da API aparece no diff de um commit antigo, ou em
texto puro quando alguém abre o arquivo de configuração. Custo: quem clonou o repositório tem
a chave, inclusive o freelancer que saiu no ano passado, e apagar o arquivo hoje não tira nada
de nenhuma dessas cópias. Conserto: gere uma chave nova no provedor, revogue a antiga, guarde
a nova no `.env`. Só depois limpe o arquivo. Trocar a chave é o conserto; apagar o commit é
maquiagem.

---

## Uma branch principal só

Até existir uma versão em produção que precise de correção urgente, o fluxo certo pra 1 a 10
pessoas é o mais simples: uma branch principal, um repositório remoto na internet, commits
direto nela. Branch por funcionalidade organiza o trabalho e cobra caro pela organização: a
integração fica pra depois, e o conflito entre duas frentes só aparece no merge final, perto
do prazo.

O gatilho pra criar a segunda branch é concreto. Existe cliente usando a versão publicada, e
existe algo longo em andamento que não pode subir junto com a correção. Sem os dois ao mesmo
tempo, branch é cerimônia.

A alternativa que dispensa a branch é a chave de funcionalidade: o código sobe desligado e
liga quando você quiser. Está em `templates/backend/entrega.md`, seção "Estratégias".

---

## Armadilhas

### `commit -a` não pega arquivo novo

**Sintoma:** depois do commit, o `git status` continua listando o arquivo em "Untracked
files". **Custo:** o deploy sobe sem ele, e o sistema quebra em produção por causa de um
arquivo que existe na sua máquina e em lugar nenhum. **Conserto:** o `-a` só pega alteração em
arquivo que o git já rastreava. Arquivo novo exige `git add` explícito.

### Arquivo grande comitado, apagado depois

**Sintoma:** o clone continua pesado e lento mesmo com o arquivo fora do projeto. **Custo:**
cada pessoa nova espera minutos por um clone que deveria levar segundos, e isso não melhora
mais. **Conserto:** o conteúdo ficou gravado no histórico, e apagar o arquivo não o remove de
lá. Prevenir com `.gitignore` antes do primeiro `add`. Se já entrou, é reescrita de histórico
com ferramenta específica, e todo mundo precisa clonar de novo.

### Branch apagada só na sua máquina

**Sintoma:** você apagou a branch, considerou o assunto encerrado, e ela continua na lista do
servidor. **Custo:** alguém retoma meses depois um trabalho abandonado, achando que ele foi
aprovado. **Conserto:** apagar local e apagar no servidor são duas operações separadas. E use
`git branch -d`, não `-D`: quando o `-d` recusa, ele está avisando que existe ali commit que
não foi mesclado em lugar nenhum.

### Conflito resolvido pela metade

**Sintoma:** você editou o arquivo, tirou as marcações `<<<<<<<` e `>>>>>>>`, e o `git status`
continua mostrando "both modified". **Custo:** o merge fica pendurado e o trabalho seguinte
entra em cima de uma árvore inconsistente. **Conserto:** o `git add` do arquivo é o que marca
o conflito como resolvido. Depois dele, `git commit` no merge ou `git rebase --continue` no
rebase. Na dúvida, aborte e refaça com calma; conflito resolvido no chute insere defeito novo.

### `origin/main` tratado como o estado do servidor

**Sintoma:** você acha que está atualizado, e o push é recusado ou o merge traz surpresa.
**Custo:** meia hora resolvendo um conflito que não existiria se você tivesse buscado antes de
começar. **Conserto:** `origin/main` é a foto da última vez que houve conversa com o servidor.
Só `fetch`, `pull` ou `push` atualiza essa foto. Rode `git fetch` antes de decidir qualquer
mesclagem.

---

## Notas de versão, incluindo o que não é código

Um `CHANGELOG.md` versionado junto do código, uma linha por entrega, com data e número da
versão. É ele que responde "quando isso mudou?" sem obrigar ninguém a ler commit.

Anote também o que não é código: preço, texto de e-mail automático, prazo de entrega,
variável de ambiente, limite do plano contratado, chave de integração trocada. Boa parte do
"parou de funcionar do nada" é mudança de configuração ou de conteúdo que ninguém tratou como
alteração do sistema. Se muda com o tempo e é texto, mora no repositório.

---

## A prova de que a volta existe

Sistema que "dá pra recuperar" só está provado depois de recuperado uma vez. A prova é
destrutiva: apague o ambiente de teste inteiro e reconstrua do zero pelo repositório, sem
tocar em nada à mão. Enquanto o servidor está de pé, cada ajuste feito na unha que ficou de
fora do código continua funcionando e esconde a própria falta.

Se não der, existe um passo manual que ninguém documentou. Ele vai faltar no pior dia.

- [ ] Etiqueta anotada na última publicação, empurrada pro remoto
- [ ] `git describe --tags` responde qual versão está no ar
- [ ] Volta atrás com comando escrito, e cronometrada uma vez
- [ ] `.gitignore` cobrindo `.env` e tudo que é gerado
- [ ] Nenhum segredo em texto puro no histórico; o que já esteve lá, foi rotacionado
- [ ] Estrutura do banco versionada junto do código, não só na cabeça de quem rodou o script
- [ ] Ambiente de teste destruído e recriado pelo repositório, com o sistema voltando a funcionar
