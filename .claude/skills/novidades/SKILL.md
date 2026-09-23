---
name: novidades
description: >
  Transforma o histórico do código num aviso que o cliente entende: lê o intervalo que você
  pedir (última semana, entre duas versões), joga fora o que é conversa interna, agrupa o
  resto em Novo, Melhorado e Corrigido, e escreve o texto na voz da marca. Sai a lista
  completa, a mensagem de cinco linhas pro WhatsApp e o bloco pronto pro e-mail.
  Use quando o usuário disser "o que mudou no sistema esse mês", "preciso avisar os clientes
  da atualização", "meus clientes não sabem que eu melhorei o sistema", "ninguém percebeu que
  eu arrumei aquilo", "saiu versão nova, e agora", "escrever o changelog", "mandar as
  novidades no WhatsApp", "transformar os commits em texto que o cliente entende", "toda
  semana eu mexo no sistema e não conto pra ninguém", ou /novidades.
---

# /novidades — O que mudou no sistema, na língua do cliente

> **Convenção de pastas:** a saída vai em `conteudo/novidades/<AAAA-MM-DD>/`. Na convenção **por cliente**, `clientes/<Nome>/conteudo/novidades/<AAAA-MM-DD>/`. A pasta nasce na primeira rodada, com a data do dia em que o aviso vai sair.

Quem tem sistema no ar mexe nele toda semana e conta isso quase nunca. O cliente, do outro
lado, usa a mesma tela de sempre e conclui o que qualquer pessoa concluiria: que nada
aconteceu. Aí o contrato de manutenção vira a conta mais fácil de cortar, e o dono descobre
que o problema nunca foi entregar pouco. Foi não ter jeito de mostrar.

Esta skill pega o histórico do repositório, que é o registro mais honesto do que foi feito, e
vira dele três peças prontas. Nenhuma linha de código sai daqui.

## Dependências

- **Contexto:** `_memoria/empresa.md` — quem usa o sistema, quantas pessoas, por qual canal você fala com elas
- **Tom:** `_memoria/preferencias.md` e `identidade/marca.md` — aviso de novidade soa a circular de banco quando não tem a voz de quem fez
- **Quem lê:** `_memoria/publico.md`, se existir — a palavra que a pessoa usa pra chamar o que o sistema faz
- **Vocabulário do sistema:** `sistemas/<nome>/GLOSSARIO.md`, quando o `/glossario` já rodou. É ele que decide se aquilo se chama pedido, comanda, ficha ou ordem de serviço
- **Referências:**
  - `templates/software/novidades.md` — o filtro por prefixo e por caminho, as três gavetas, o léxico técnico → cliente, a regra do "e daí?", o que nunca se anuncia e o formato das cinco linhas
  - `templates/copy/humanizacao.md` — só na hora de revisar o texto final
  - `templates/software/evolucao.md` — o diário `MUDANCAS.md`, que é onde moram as mudanças que não são código (preço, horário, texto do site)
- **Scripts:** `scripts/novidades.js` (ler o histórico, classificar, conferir o texto), `scripts/verificar.js` (datas e ritmo do texto)
- **Saída:** `conteudo/novidades/<AAAA-MM-DD>/CHANGELOG.md`, `whatsapp.md`, `email.md` e `commits.json`

---

## Workflow

### Passo 1 — Confirmar que existe sistema no ar

Esta skill só serve a quem tem sistema rodando com gente usando. Antes de qualquer coisa,
uma pergunta:

> "Onde fica o código desse sistema no seu computador? Me passa o caminho da pasta."

| A resposta | Por onde seguir |
|---|---|
| Um caminho de pasta versionada | Passo 2 |
| "Não sei", ou o código está com outra pessoa | Peça o histórico a quem tem acesso, no formato que o `node scripts/novidades.js formato` mostra. Um arquivo de texto resolve, e ele não precisa dar acesso ao repositório |
| Sistema de terceiro, sem repositório | Trabalhe pelo `MUDANCAS.md` do `/evoluir`, se existir, ou por uma lista escrita à mão. O resto do workflow é igual |
| Sistema que ainda não foi construído | Pare aqui. O que decide o que construir é o `/escopo`, e o que decide a próxima leva é o `/evoluir` |

### Passo 2 — Escolher o intervalo e rodar o script

Uma pergunta, e ela tem três respostas possíveis:

> "Desde quando? Última semana, desde a versão anterior, ou desde uma data que você me diz."

```bash
# última semana
node scripts/novidades.js ler --repo <caminho> --dias 7 --salvar conteudo/novidades/<data>/commits.json

# entre duas versões
node scripts/novidades.js ler --repo <caminho> --desde v1.3.0 --ate v1.4.0 --salvar <...>/commits.json

# desde uma data
node scripts/novidades.js ler --repo <caminho> --desde 01/09/2026 --salvar <...>/commits.json

# quando o histórico veio em arquivo, de quem tem acesso
node scripts/novidades.js ler --log <git-log.txt> --salvar <...>/commits.json
```

Saem quatro blocos: os três grupos, e a lista do que não deu pra classificar. Se a pasta da
rodada ainda não existe, o `--salvar` cria. E o `commits.json` fica ao lado do texto porque é
ele que a conferência do Passo 7 usa pra saber se alguma mudança desapareceu no caminho, e é
dele que sai a marca da mudança que quebra o jeito de usar.

**Não abra o histórico na mão pra escolher o que conta.** A leitura atenta erra sempre pro
mesmo lado: guarda o commit que deu trabalho e esquece o que mudou a vida do cliente.

### Passo 3 — Devolver ao dono o que o script não resolve

O script descarta por prefixo (`chore`, `test`, `refactor`, `deps`) e por caminho (só mexeu
em `tests/`, em arquivo de configuração, em travamento de dependência). Isso é mecânico e não
se discute. Ele também não chuta gaveta pra assunto que não diz nada: "ajustes gerais",
"várias correções" e "wip" caem na lista do dono, com o texto original. O que sobra pra gente
são três listas, e elas viram **uma mensagem só**:

> 1. Estas duas eu não consegui classificar. A primeira diz "wip aaa" e a segunda
>    "ajustes gerais". O que cada uma mudou pra quem usa o sistema?
> 2. Esta aqui desfaz uma mudança. O cliente já tinha visto a versão anterior?
> 3. Esta correção conserta algo que entrou nesta mesma semana. Se ninguém chegou a
>    ver o defeito, eu deixo de fora.

Quem responde é o dono, não o assistente. Inventar o que um commit fez é a forma mais rápida
de publicar novidade que não existe.

### Passo 4 — Traduzir item por item, e recusar o que não muda nada

Cada item aprovado precisa de uma frase de impacto: o que aquilo muda no dia de quem usa. O
formato é fixo:

```
- **<o que mudou, curto>** — <o que isso muda no dia do cliente>
```

Antes de escolher a palavra, veja se o sistema já tem vocabulário decidido:

```bash
G=$(find . -name GLOSSARIO.md 2>/dev/null | head -1)
[ -n "$G" ] && echo "vocabulário decidido em $G" || echo "sem glossário: use a palavra que o cliente fala"
```

O caminho da tradução está em `templates/software/novidades.md`, com o léxico completo. O
resumo cabe em três linhas:

| Veio assim | Vai assim |
|---|---|
| corrigido bug no endpoint de checkout | **o pagamento por Pix não trava mais na confirmação** — quem paga vê a confirmação na hora, e você não confere comprovante à mão |
| otimizada a query do relatório | **a tela de fechamento do mês abre na hora** — o que demorava nove segundos aparece em pouco mais de um |
| adicionado cache na listagem de pedidos | **a lista de pedidos rola sem engasgar no celular** — dá pra conferir o dia em pé, no balcão |

**Recuse o que não responde "e daí?".** Mudança que não altera nada pra quem usa fica fora,
mesmo que tenha custado três dias. Diga isso ao dono com a frase que ele vai entender: "isso
não entra porque ninguém de fora percebe, e item que ninguém percebe ensina o cliente a não
ler o próximo aviso".

Duas travas que valem repetir aqui:

- **Falha de segurança não se detalha.** Corrigiu brecha, publique "melhoramos a proteção da sua conta" e pare. Dizer qual era a brecha entrega o mapa a quem tem sistema parecido
- **Número exige medição.** "Ficou 3x mais rápido" só entra com o antes, o depois e a data da medição. Sem isso, escreva "abre mais rápido". A base legal e a fonte estão na referência

### Passo 5 — Escrever o arquivo da rodada

```markdown
# Novidades — <DD/MM/AAAA>

<uma linha dizendo o período e quantas mudanças chegaram até o cliente>

## Novo
- **<o que mudou>** — <o que muda no dia do cliente>

## Melhorado
- **<o que mudou>** — <o que muda no dia do cliente>

## Corrigido
- **<o que estava errado, sem dramatizar>** — <como está agora>

## Muda o seu jeito de usar
- **<a mudança>** — a partir de <data> <o que o cliente precisa fazer>, e <o que acontece se não fizer>

## Não entrou
- <mudança que ficou de fora, e o motivo em meia linha>

---
Período: <de> a <até>  ·  Mudanças no histórico: <n>  ·  Chegaram ao cliente: <n>
Histórico classificado em `commits.json`, lido em <data>
```

A seção **Não entrou** não é burocracia. Ela é o que permite, três meses depois, responder
"por que isso não foi anunciado?" sem abrir o repositório de novo. Toda mudança classificada
aparece em algum lugar do arquivo, e o script cobra essa conta.

### Passo 6 — As duas peças de envio

**WhatsApp**, em `whatsapp.md`, cinco linhas, uma ideia por linha:

```
<quem fala e o que aconteceu, em uma linha>
<a novidade que mais muda o dia, com o ganho colado nela>
<a segunda novidade>
<a terceira, ou o aviso do que a pessoa precisa fazer, com a data>
<o convite: o que fazer agora com isso>
```

Sem link encurtado, sem "clique aqui", no máximo um emoji e só se a marca já usa. A estrutura
de cada linha está na referência.

**E-mail**, em `email.md`, três partes que o `/email` vai montar no HTML:

```markdown
## Assunto
<a novidade principal, até 40 caracteres, sem a palavra "atualização">

## Preheader
<a segunda novidade, até 90 caracteres>

## Corpo
<abertura de duas linhas>
<até cinco itens, das três gavetas, no formato do CHANGELOG>
<o aviso, se houver, com data>
<um botão só: o que fazer>
```

Cinco itens é teto, não meta. Lista de doze novidades faz o leitor não guardar nenhuma.

### Passo 7 — Conferir por comando

```bash
node scripts/novidades.js conferir conteudo/novidades/<data>/CHANGELOG.md
node scripts/novidades.js mensagem conteudo/novidades/<data>/whatsapp.md
node scripts/verificar.js datas conteudo/novidades/<data>/CHANGELOG.md
node scripts/verificar.js texto conteudo/novidades/<data>/CHANGELOG.md
```

O que cada um pega:

| Comando | Reprova quando |
|---|---|
| `conferir` | item sem frase de impacto, frase de impacto de duas palavras, jargão de programador no texto do cliente, item ainda escrito na língua do commit, mudança classificada que não apareceu no arquivo, mudança que quebra o jeito de usar sem a seção própria |
| `mensagem` | mais de cinco linhas, jargão, ou nenhum convite no fim |
| `verificar datas` | "a partir de sexta, 30/09" quando 30/09/2026 é quarta |
| `verificar texto` | ritmo de máquina e clichê, porque isso vai pro cliente |

Erro se corrige reescrevendo o item, nunca apagando o item pra a conta fechar. Se o comando
acusa jargão, a palavra sai; se acusa cobertura, a mudança volta pro arquivo ou pra seção
"Não entrou" com o motivo.

### Passo 8 — Entregar e marcar a próxima

```
✓ conteudo/novidades/<data>/
   · CHANGELOG.md — [n] itens: [n] novo, [n] melhorado, [n] corrigido
   · whatsapp.md — [n] linhas, [n] caracteres
   · email.md — assunto, preheader e corpo pro /email
   · commits.json — [n] registros lidos, [n] descartados, intervalo [de] a [até]
   · Aviso de mudança no jeito de usar: [sim, com prazo até <data> | não]
   · Próxima rodada: [data]
```

Envio é ação irreversível e não sai daqui: o texto vai pronto, e quem manda é o dono. Se ele
quiser o e-mail desenhado, o `/email` monta o HTML; se quiser programar a rodada, o `/rotina`
agenda; se quiser que isso alimente o mês do cliente, o `/relatorio-cliente` puxa daqui.

---

## Regras

- **Sem sistema no ar, não tem novidade.** Projeto em construção não publica aviso de mudança. O que decide o que construir é o `/escopo`; o que decide a próxima leva, com uso medido, é o `/evoluir`
- **O filtro é do script, a tradução é do assistente, a decisão é do dono.** Nenhum dos três faz o trabalho do outro. Commit que o script não classificou volta como pergunta, nunca como invenção
- **Todo item responde "e daí?".** Sem frase de impacto, o item não entra. Mudança que ninguém de fora percebe fica de fora, e isso se diz na cara
- **Nunca detalhar falha de segurança.** O que foi corrigido se anuncia como proteção melhorada, sem dizer qual era a brecha, onde estava, nem por quanto tempo ficou aberta
- **Número entra com medição.** Antes, depois e data. Número inventado num aviso que vai pra cliente pagante é informação publicitária capaz de induzir a erro sobre a qualidade do serviço, e o art. 37, § 1º, da Lei 8.078/1990 (CDC) chama isso de publicidade enganosa. A fonte oficial e a data de conferência estão em `templates/software/novidades.md`
- **Isso aqui não substitui advogado.** A referência traz o artigo do CDC pra você saber onde pisa, não pra virar parecer. Cliente que ameaçou processo, notificação recebida ou contrato em discussão é conversa com advogado, e a conta do que foi cobrado é conversa com contador
- **Não anunciar o conserto do que nasceu e morreu na mesma janela.** O cliente não viu o defeito. Contar agora é entregar bagunça de graça, e o script marca esse caso sozinho
- **Mudança que quebra o jeito de usar vai em bloco próprio**, com data e com o que a pessoa precisa fazer. Nunca no meio da lista de melhorias
- **A voz é a da marca, não a do repositório.** Se o `GLOSSARIO.md` do sistema existe, ele decide o nome de cada coisa. Chamar de "pedido" o que a equipe chama de "comanda" custa uma conversa de suporte por cliente
- **Nome de cliente só com autorização.** Funcionalidade que nasceu do pedido de alguém se anuncia sem citar quem pediu, a não ser que ele autorize por escrito. Base de contato e o que cada cliente usa são dado pessoal, e não vão pra ferramenta de fora sem o dono autorizar (LGPD)
- **Nada de "em breve".** Novidade é o que está no ar hoje. Promessa de futuro cobra juros na rodada seguinte
- **Duas semanas sem nada que responda "e daí?" é resposta válida:** não publique. Aviso vazio treina o cliente a ignorar o próximo
- **Fronteira com as vizinhas:** `/evoluir` decide o que construir e mede o uso; `/whatsapp` e `/email` escrevem e desenham peça do zero, e aqui eles recebem o conteúdo pronto; `/relatorio-cliente` é o relatório de atividades do mês, que é outro produto; `/case` conta o resultado de um cliente com número e prova; `/manual-do-sistema` documenta como o sistema funciona, não o que mudou nele
