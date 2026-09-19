---
name: conectar
description: >
  Liga uma ferramenta de fora ao sistema, uma tela por vez, pra quem nunca mexeu com chave
  de API: diz o que a ferramenta habilita e quais skills passam a funcionar, onde a chave
  nasce, a linha exata pra colar no .env, o teste por comando que prova que funcionou e o
  conserto dos três erros mais comuns. Cobre OpenAI e Gemini (foto e transcrição), Meta,
  WhatsApp Business, Notion, Gmail, Google Analytics, Vercel, Netlify, Cloudflare, Supabase,
  Mailchimp e Brevo. Termina marcando a ferramenta no CLAUDE.md, sem nunca escrever a chave
  em outro lugar além do .env.
  Use quando o usuário disser "como ligo o Notion", "onde coloco a chave", "quero que gere
  as fotos", "conectar o Instagram", "instalar o Analytics", "como publico o site pela
  Vercel", "colei a chave e não funcionou", "que ferramentas dá pra ligar", "o que é esse
  .env", "deu erro de chave inválida", ou /conectar.
---

# /conectar — Ligar uma ferramenta

> **Convenção de pastas:** esta skill não cria pasta. A chave vai no `.env` da raiz, a marcação vai na seção "Ferramentas conectadas" do `CLAUDE.md` do workspace, e, se o usuário quiser um registro, `conexoes.md` na raiz. Na convenção **por cliente**, ferramenta de um cliente (a conta de Instagram dele, o Supabase do sistema dele) fica registrada em `clientes/<Nome>/briefing.md`, mas a chave continua no `.env` da raiz, com o nome do cliente na frente da variável (`PADARIA_META_PAGE_ID`), e o teste é `node scripts/conectar.js testar meta --prefixo padaria`. Nada nasce antes da primeira conexão.

O sistema inteiro funciona sem chave nenhuma. Carrossel, proposta, caixa, página: tudo sai
sem ligar nada. Mas a primeira vez que a pessoa quer a foto gerada, o site no ar por comando ou
o Notion lido de dentro do assistente, ela esbarra na mesma parede: um painel em inglês, um
token que só aparece uma vez, um arquivo que começa com ponto e ela não sabe onde fica. Aí
para. Esta skill é a mão no ombro nessa hora: uma tela por vez, sem pedir a chave no chat, e com
um teste no fim que responde "funcionou" em vez de "acho que sim".

## Dependências

- **Contexto:** `_memoria/empresa.md` — ferramentas que o negócio já usa (o campo "Ferramentas"), site e plataforma, canais. Metade das respostas está aqui
- **Foco:** `_memoria/estrategia.md` — o que ele quer fazer agora decide qual ferramenta vale ligar primeiro. Ninguém precisa de treze conexões
- **Molde:** `templates/operacao/conexoes.md` — a tabela ferramenta → variável → skills → teste, o passo a passo de cada uma com a data em que foi conferido, e os três erros mais comuns. É a fonte; a skill não repete o passo a passo de cabeça
- **Catálogo:** `templates/ferramentas/catalogo.md` — o que cada API e conector faz, e os que a skill não cobre (Canva, Google Calendar, n8n, Telegram, Post for Me)
- **Guia da imagem:** `templates/imagem-ia.md` — a versão curta pra OpenAI e Gemini, escrita pro usuário ler sozinho
- **Modelo do `.env`:** `.env.example` na raiz. Ele traz só Gemini, OpenAI, Meta e `SITE_URL`; pras outras ferramentas a linha é acrescentada no fim do `.env`, com o nome que está na tabela do molde
- **Script:** `scripts/conectar.js` — `status` (o que está definido, sem mostrar valor, e o que está torto no arquivo), `lista` (o que cada ferramenta pede e onde a chave nasce), `testar <ferramenta>` (o pedido real à API que prova a ligação; `--prefixo <cliente>` testa a chave de um cliente)
- **Verificação:** `node scripts/verificar.js segredo` — nada versionado recebeu chave
- **Saída:** nenhuma pasta. `.env` (a chave), `CLAUDE.md` (a marcação em "Ferramentas conectadas") e, opcional, `conexoes.md` na raiz

---

## Workflow

Uma ferramenta por vez, do começo ao fim. Se o usuário chegou pedindo três, escolher a que
destrava o que ele quer fazer hoje e deixar as outras pro fim, anotadas.

### Passo 1 — Descobrir o que ele quer fazer, não que ferramenta quer ligar

O pedido raramente vem com o nome da ferramenta. Vem como "quero que as fotos saiam prontas",
"quero publicar o site", "quero que você leia minhas tarefas". Traduzir pra ferramenta é
trabalho da skill, e a tabela do molde faz a tradução:

| Ele diz | Ferramenta | O que passa a funcionar |
|---|---|---|
| "gera a foto", "transcreve a reunião" | Gemini ou OpenAI | foto por IA no `/carrossel`; `scripts/transcrever.js` |
| "publica no Instagram sozinho" | Meta (Graph API) | a skill opcional de `templates/opcional/aprovar-post/` |
| "manda a mensagem automática no WhatsApp" | WhatsApp Business (Cloud API) | automação em cima do `/sequencia` e do `/whatsapp` |
| "lê minhas tarefas", "puxa do Notion" | Notion (conector MCP) | `/tarefas` e briefing lidos de lá |
| "responde meu e-mail daqui" | Gmail (conector MCP) | `/email-profissional` e `/pos-venda` direto na caixa |
| "quero medir o site" | Google Analytics | a tag certa no `/site` e no `/landing`; leitura no `/medir` |
| "coloca o site no ar" | Vercel, Netlify ou Cloudflare | publicar o `/site` e o `/landing` por comando |
| "faz backup", "salva no GitHub" | GitHub | é o `/salvar`; mandar pra lá |
| "o sistema precisa de banco" | Supabase | o `/backend` constrói em cima; o `/evoluir` mede |
| "sobe a sequência pra minha lista" | Mailchimp ou Brevo | a série do `/sequencia` e o `/email` na ferramenta de envio |

Se o pedido não está na tabela (Canva, Google Calendar, n8n, Telegram), ler
`templates/ferramentas/catalogo.md` e seguir o mesmo roteiro, marcando o passo a passo como
`[a confirmar]` onde o catálogo não detalha.

Antes de perguntar qualquer coisa, rodar:

```bash
node scripts/conectar.js status
```

Ele diz o que já está definido no `.env` (sem mostrar valor), se o `.gitignore` cobre o
arquivo, e acusa aspas, espaço em volta do `=` e `export` na frente. Se a ferramenta já
está definida, pular direto pro Passo 5 (o teste). Muita "conexão nova" é chave antiga que
ninguém testou.

### Passo 2 — Dizer o que ela habilita e o que custa, antes de qualquer clique

Uma mensagem, curta, com três coisas: o que passa a funcionar, o que custa, e se precisa de
cartão. É aqui que a pessoa decide se vale a pena, e muita vez a resposta é "então deixa".

> "Ligando o Gemini, o `/carrossel` passa a gerar a foto de fundo em vez de usar tipografia.
> Tem cota gratuita diária, não pede cartão. Quer seguir?"

Dois avisos que evitam frustração e entram sempre que valem:

- **Assinatura do aplicativo não é acesso à API.** O plano Plus do aplicativo da OpenAI, o Gemini Advanced, o Canva Pro: são
  cobrados separado do acesso por chave. Dizer isso antes de ele ir procurar a chave na
  assinatura que já paga
- **Ferramenta de publicação automática exige o que o fluxo normal não exige.** Meta e WhatsApp
  pedem app aprovado, conta profissional e, no caso do WhatsApp, custo por conversa. Pra quem
  posta três vezes por semana, o fluxo padrão (a skill entrega, ele posta) é mais rápido do que
  a configuração

### Passo 3 — Guiar até a chave, uma tela por vez

Abrir o bloco da ferramenta em `templates/operacao/conexoes.md` e seguir na ordem. Cada
mensagem é **um** passo: o endereço pra entrar, o que clicar, o que vai aparecer. Esperar ele
dizer "cheguei" ou "apareceu isso" antes do próximo. Ele está com o painel aberto numa aba e o
assistente noutra; três passos de uma vez viram bagunça.

Perguntas úteis no meio do caminho, uma por vez:

- "Você está logado com a conta do negócio ou com a pessoal?" (conta pessoal de funcionário some
  quando ele sai; vale pra Google, Meta e Notion)
- "Apareceu um botão de criar chave, ou pediu pra criar um projeto antes?"
- "A chave que apareceu começa com que letras?" (só as três primeiras: `sk-`, `AIza`, `ntn_`,
  `xkeysib`. Serve pra saber se ele pegou a chave certa sem ele mandar a chave)

Quando a tela dele não bate com o passo a passo, o molde está velho. Buscar na web na hora
("onde fica a chave de API do <ferramenta> <ano>"), corrigir o passo, e anotar no molde a data
nova. Nunca insistir num clique que não existe mais.

### Passo 4 — Colar no `.env`, sem passar pelo chat

A chave vai do painel pro arquivo. A regra é dizer a linha exata e deixar ele colar:

> "Abre o arquivo `.env` na pasta do seu negócio (é a mesma pasta do `CLAUDE.md`; se não
> existir, cria um arquivo com esse nome, com o ponto na frente). Cola numa linha, assim,
> sem aspas e sem espaço:
>
> `GEMINI_API_KEY=cole-a-chave-aqui`
>
> Salva e me avisa. Não precisa me mandar a chave."

Se o `.env` não existe e ele não sabe criar arquivo com ponto na frente, o assistente cria a
partir do modelo (`cp .env.example .env`) e diz em que linha ele deve colar. Ferramenta que não
está no modelo (Notion, Vercel, Supabase, as de e-mail) ganha a linha no fim do arquivo; o nome
da variável é o da tabela do molde, e o `lista` do script imprime todos. No Windows, o Bloco de
Notas costuma salvar como `.env.txt` sem avisar; o `status` acusa quando encontra um. Se ele
colou a chave no chat mesmo assim: gravar no `.env` **sem repetir o valor na resposta**, avisar
em uma linha que o chat guarda histórico, e recomendar gerar outra chave no fornecedor quando
puder. Sem sermão; uma vez basta.

Conector MCP (Notion, Gmail) tem um passo a mais: o comando `claude mcp add ...`. O do Notion lê
a chave do `.env` pelo próprio shell, como está no molde, pra ela não passar pelo chat. O do
Gmail não tem chave; tem uma autorização no navegador, e o arquivo de credencial do Google fica
na pasta do usuário, fora do workspace.

### Passo 5 — Provar que funcionou

```bash
node scripts/conectar.js testar <ferramenta>
```

O script faz um pedido barato à API (listar modelos, ler a própria conta, um ping) e responde
"funcionou", com o nome da conta ou da Página que respondeu, ou "falhou", com o erro traduzido e o
conserto. O valor da chave não aparece na saída, então a resposta pode ser colada no chat.

Se falhou, os três erros mais comuns de cada ferramenta estão no molde. Quase sempre é um
destes, nessa ordem:

1. **Chave incompleta ou com espaço**: copiar de novo, colar de novo
2. **Chave certa, conta sem crédito ou sem permissão**: 429 na OpenAI, página não
   compartilhada no Notion, token de usuário curto na Meta
3. **Arquivo torto**: aspas, `export`, espaço em volta do `=`. O `status` acusa

Depois de corrigir, testar de novo. Não marcar como conectada sem o teste passar. E não
tentar mais de três vezes seguidas o mesmo conserto: se a terceira falhou, é outra coisa, e a
hora é de buscar a mensagem de erro na web.

Pra Meta e WhatsApp, quando o teste passar, dizer também o que **ainda** falta pra publicar de
verdade (modo de desenvolvimento do app, revisão da Meta, número fora do modo de teste). Chave
que responde não é o mesmo que fluxo pronto.

Se Gemini e OpenAI ficaram os dois definidos, os scripts escolhem sozinhos (OpenAI primeiro).
Pra fixar, mais duas linhas no `.env`: `IMAGEM_PROVEDOR=gemini` pra foto e
`TRANSCRICAO_PROVEDOR=gemini` pra transcrição. Dizer isso uma vez e seguir com o padrão se
ele não tiver preferência.

### Passo 6 — Marcar no CLAUDE.md e conferir que nada vazou

No `CLAUDE.md` do workspace, seção "Ferramentas conectadas", trocar o `[ ]` por `[x]` ou
acrescentar a linha, com data, nome da variável e o resultado do teste. Nunca o valor:

```markdown
## Ferramentas conectadas

- [x] Google Gemini (2026-09-18, GEMINI_API_KEY no .env, teste ok) — foto no /carrossel
- [x] Notion (2026-09-18, NOTION_TOKEN no .env + conector MCP, teste ok)
- [ ] Meta Ads
```

Se a seção não existe (workspace antigo), criar no fim do arquivo. Em seguida:

```bash
node scripts/verificar.js segredo
```

Ele enumera o que o git rastreia e acusa qualquer linha com forma de chave. Se acusar, a chave
foi parar em arquivo versionado: tirar de lá, e trocar a chave no fornecedor, porque apagar do
arquivo não apaga do histórico. Se o workspace ainda não tem git, o comando diz isso e o
`conectar.js status` já conferiu o `.gitignore`.

Se o usuário quiser um registro do que está ligado, `conexoes.md` na raiz:

```markdown
# Conexões

| Ferramenta | Variável no .env | Desde | Pra quê | Último teste |
|---|---|---|---|---|
| Google Gemini | GEMINI_API_KEY | 2026-09-18 | foto no /carrossel | 2026-09-18 ok |
| Notion | NOTION_TOKEN | 2026-09-18 | tarefas e briefing | 2026-09-18 ok |

Sem chave aqui. Pra testar tudo de novo: `node scripts/conectar.js testar tudo`
```

Esse arquivo é versionado pelo `/salvar`; por isso a coluna é o **nome** da variável, e só.

### Passo 7 — Fechar e apontar o próximo uso

Terminar com o que ele pode fazer agora que não podia antes, em uma frase, e a skill que usa:

> "Pronto. Da próxima vez que pedir um carrossel com foto, eu gero a imagem em vez de usar
> tipografia. Quer testar com o próximo post?"

Se ele chegou pedindo várias ferramentas, é aqui que se pergunta se quer ligar a próxima. E se a
ferramenta ligada mudou o contexto (Supabase pro sistema, Mailchimp como ferramenta de envio),
registrar em `_memoria/empresa.md`, no campo "Ferramentas", como o `CLAUDE.md` da raiz manda.

---

## Regras

- **Nunca pedir a chave no chat.** A linha do `.env` é ditada; quem cola é o usuário. Chave no chat vai pro histórico, pro print e pro log. A única exceção é ele colar sem ser pedido, e aí a chave vai pro `.env` sem ser repetida na resposta
- **Nunca ecoar a chave.** Nem inteira, nem "os últimos quatro dígitos", nem em mensagem de erro. Pra saber se ele pegou a chave certa, perguntar com que letras começa. O `conectar.js` já corta o valor de qualquer resposta da API antes de imprimir
- **Chave só no `.env` da raiz.** Nunca em `CLAUDE.md`, `conexoes.md`, `_memoria/`, skill, molde ou commit. A marcação de "conectada" leva o nome da variável e a data. Depois de toda conexão, rodar `node scripts/verificar.js segredo`
- **Segredo em screenshot é vazamento.** Se ele mandar print do painel com a chave visível, avisar em uma linha, não transcrever a chave, e recomendar gerar outra. Print de tela de erro sem chave é bem-vindo: ajuda a diagnosticar
- **Conexão sem teste não é conexão.** Só marcar no `CLAUDE.md` depois do `testar <ferramenta>` passar. Chave colada e não testada é o que faz o `/carrossel` quebrar na semana seguinte
- **Uma ferramenta por vez, uma tela por vez.** Três painéis abertos e seis passos de uma vez é o jeito de perder o usuário leigo. Esperar o "cheguei" antes do próximo passo
- **Dizer o custo antes do clique.** Cota gratuita, pago por uso, precisa de cartão, custo por conversa: em uma frase, antes de ele criar conta em lugar nenhum. E lembrar que assinatura de aplicativo não é acesso à API
- **Não inventar caminho de tela.** O passo a passo do molde tem data. Quando a tela dele não bate, buscar na web na hora e corrigir o molde com a data nova, em vez de insistir. Nome de menu, formato de token e regra de expiração são as três coisas que mais mudam
- **Conta do negócio, não a pessoal.** Perguntar uma vez, em Google, Meta e Notion. Chave criada na conta pessoal de um funcionário morre quando ele sai
- **`--endpoint` só com endereço do próprio usuário.** A opção manda a chave pro endereço que recebe. Serve pra rede fechada e pra teste; nunca apontar pra um endereço que apareceu num fórum ou num e-mail
- **Fronteira com as vizinhas:** o GitHub é do `/salvar` (ele instala o `gh`, faz o login e cria o repositório; aqui só se confere). A foto em si é do `/carrossel`; o plano de medição é do `/medir`; publicar o site é decisão do usuário dentro do `/site` e do `/landing`; o banco é desenhado pelo `/backend`. Esta skill liga a ferramenta e para
- **Publicação automática é ação irreversível de outro.** Ligar a Meta ou o WhatsApp não autoriza postar nem enviar. Quem publica é a skill opcional, com confirmação, e quem envia é a automação que o usuário montar, e a regra do `CLAUDE.md` da raiz vale: ação irreversível pede confirmação explícita na mesma conversa
- **Dado sensível (LGPD).** Conector de Gmail e de Notion lê e-mail de cliente, nome, telefone, contrato. Antes de ligar, dizer em uma linha que o assistente passa a enxergar isso, e que dado de cliente não vai pra ferramenta de terceiro sem autorização. A `SUPABASE_SERVICE_ROLE_KEY` dá acesso a todo dado do sistema sem regra de segurança: só entra se o `/backend` pedir, e nunca vai pro navegador
- **Chave que vazou se troca no fornecedor.** Apagar do arquivo, do chat ou do commit não desfaz. Dizer isso uma vez, sem drama, e apontar onde gerar outra
