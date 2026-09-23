# Novidades — do histórico do código pro texto que o cliente entende

Referência do `/novidades`. Serve a quem tem sistema no ar e precisa contar o que mudou
sem virar tradutor de linguagem de programador.

O trabalho tem duas metades. A primeira é mecânica e o `scripts/novidades.js` resolve:
separar o que muda a vida de quem usa do que é conversa interna. A segunda é humana e
nenhum comando resolve: dizer, em uma frase, o que aquilo muda no dia da pessoa.

---

## A regra de ouro

Todo item de novidade responde **"e daí?"** antes de ser publicado.

| O que veio do histórico | O "e daí?" respondido |
|---|---|
| corrigido bug no endpoint de checkout | o pagamento por Pix não trava mais na confirmação |
| otimizada a query do relatório | a tela de fechamento do mês abre na hora, não em nove segundos |
| adicionado cache na listagem | a lista de pedidos rola sem engasgar no celular |
| refatorado o módulo de agenda | (não responde: não vira novidade) |

Item sem "e daí?" não é novidade: é registro de trabalho. Registro de trabalho, quando o
cliente paga por hora e quer ver o que foi feito, é outro produto, e é o `/relatorio-cliente`.

---

## O filtro, por prefixo

A convenção de mensagem de commit mais usada obriga só dois tipos, `feat` e `fix`. Os outros
que aparecem na tabela abaixo não estão na especificação: ela os menciona como recomendação
do commitlint, que segue a convenção do Angular. Na prática dão a mesma régua mecânica.

| Prefixo | Vira | Por quê |
|---|---|---|
| `feat` | **Novo** | "a commit of the type `feat` introduces a new feature to the codebase" |
| `fix` | **Corrigido** | "a commit of the type `fix` patches a bug in your codebase" |
| `perf` | **Melhorado** | ficou mais rápido, e rapidez o cliente sente |
| `ui`, `ux` | **Melhorado** | mudou o que a pessoa vê ou o caminho que ela faz |
| `chore`, `deps`, `build`, `ci` | descartado | ninguém percebe de fora |
| `test`, `style`, `lint`, `format` | descartado | qualidade interna, não entrega |
| `refactor` | descartado | o mesmo comportamento, escrito diferente |
| `docs` | descartado | documentação de código não é novidade de produto |
| `revert` | decide o dono | pode estar desfazendo algo já anunciado |
| `!` ou `BREAKING CHANGE` | bloco próprio | "breaking changes MUST be indicated by a `!` immediately before the `:`" |

> Fonte: Conventional Commits 1.0.0, https://www.conventionalcommits.org/en/v1.0.0/
> — conferido em 23/09/2026. As frases de `feat` e `fix` saíram do resumo da própria
> especificação; `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf` e `test` aparecem
> lá como recomendação do commitlint, baseada na convenção do Angular.

**Sem prefixo nenhum?** O script tenta pela palavra ("corrige", "adiciona", "agora",
"melhora") e marca o resultado com confiança média. O que não reconhece vai pra lista do
dono decidir, com o texto original do jeito que estava. Chutar gaveta é pior que perguntar.

Antes disso vem um filtro que salva a rodada: assunto que não diz nada ("ajustes gerais",
"várias correções", "wip", "salvando") vai direto pro dono, sem chute. A palavra "ajustes"
está ali, mas ninguém descobre por ela o que mudou na tela de quem usa.

---

## O filtro, por caminho

Prefixo mente. Caminho não. Um commit escrito como `feat: melhora a suíte` que só mexeu em
`tests/` não mudou nada pra ninguém de fora.

Caminhos que, sozinhos, descartam o commit:

- `tests/`, `spec/`, `__tests__/`, `e2e/`, `cypress/`, arquivo `*.test.*` e `*.spec.*`
- `.github/`, `.vscode/`, `.husky/`, configuração de lint, de formatação e de compilação
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` e os equivalentes de outras linguagens
- `docs/`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE`
- `Dockerfile`, `docker-compose.yml`, `Makefile`, `Procfile`

A exceção é a mudança que quebra o jeito de usar. Essa sai de qualquer filtro e vai pro
bloco de aviso, mesmo que tenha tocado num arquivo só. Se o `commits.json` tem uma mudança
marcada assim e o arquivo não tem a seção **Muda o seu jeito de usar**, o
`node scripts/novidades.js conferir` reprova.

---

## As três gavetas

A convenção de changelog mais conhecida sugere seis seções (Added, Changed, Deprecated,
Removed, Fixed, Security) e abre com o princípio que importa aqui: "Changelogs are _for
humans_, not machines."

> Fonte: Keep a Changelog 1.1.0, https://keepachangelog.com/en/1.1.0/
> — conferido em 22/09/2026.

Seis é muito pra quem lê no celular entre dois atendimentos. O Contex OS colapsa em três,
mais um bloco de aviso:

- **Novo** — dá pra fazer uma coisa que antes não dava (Added)
- **Melhorado** — o que já existia ficou melhor, mais rápido ou mais simples (Changed)
- **Corrigido** — o que estava errado voltou ao normal (Fixed)
- **Muda o seu jeito de usar** — o cliente precisa fazer algo até uma data (Deprecated, Removed, e a mudança marcada com `!`)

Security fica de fora de propósito, e a próxima seção explica.

---

## O que nunca vai pro texto

- **Detalhe de falha de segurança.** Corrigiu brecha? Publique "melhoramos a proteção da sua conta", sem dizer qual era a brecha, nem onde, nem desde quando. Quem tem sistema parecido está lendo
- **Conserto do que nasceu e morreu na mesma janela.** Se o defeito entrou na terça e saiu na quarta, o cliente nunca viu. Anunciar é confessar bagunça de graça, e o script marca esse caso sozinho
- **Promessa de futuro.** "Em breve teremos" não é novidade, é dívida. Novidade é o que já está no ar hoje
- **Número que ninguém mediu.** "Ficou 3x mais rápido" precisa do antes, do depois e da data em que foram medidos. Sem isso, escreva "abre mais rápido" e pronto. Não é só capricho: informação publicitária parcialmente falsa, capaz de induzir o consumidor a erro sobre a qualidade do serviço, é publicidade enganosa pelo art. 37, § 1º, da Lei 8.078/1990 (CDC). Fonte: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm — conferido em 23/09/2026, com o texto do artigo confirmado também em https://www.tjdft.jus.br/institucional/imprensa/campanhas-e-produtos/direito-facil/edicao-semanal/propaganda-enganosa-ou-abusiva. Esta referência não substitui advogado: caso concreto, com risco de autuação ou de ação, se conversa com quem responde por isso
- **Nome de arquivo, de tabela, de tela interna.** Se o cliente não vê aquele nome na interface, aquele nome não existe pra ele
- **Pedido de um cliente com o nome dele**, sem autorização. O que ele pediu vira funcionalidade de todos, e a origem fica guardada

---

## Léxico: o que o cliente diz

Cada linha saiu de texto real de novidade que o dono não conseguiu explicar em voz alta.

| Linguagem de quem programa | Linguagem de quem usa |
|---|---|
| endpoint, rota, API | a tela, o botão, o lugar onde você faz X |
| deploy, publicação, release | a mudança já está no ar |
| bug, erro, exceção | não funcionava, travava, dava mensagem estranha |
| timeout, lentidão de query | demorava e agora abre na hora |
| cache | carrega sem recarregar tudo de novo |
| validação de campo | o sistema avisa antes de você salvar errado |
| autenticação, token, sessão | entrar na sua conta, continuar logado |
| webhook, integração | conversa sozinho com o [nome da ferramenta] |
| migração, schema | o cadastro mudou de formato, e nada seu foi perdido |
| paginação | a lista abre em páginas, e você escolhe quantos por página |
| upload | anexar arquivo, mandar foto |
| dashboard | a tela de resumo |
| log, auditoria | fica registrado quem fez o que, e quando |
| responsivo | funciona no celular do mesmo jeito |
| rollback | voltamos como estava antes |

Se o sistema tem `GLOSSARIO.md` (feito pelo `/glossario`), ele manda. É lá que está a palavra
que **aquele** negócio usa: "comanda" numa lanchonete, "ficha" numa clínica, "OS" numa oficina.
Chamar de "pedido" o que a equipe chama de "comanda" custa uma conversa por cliente.

---

## A frase de impacto

Formato do item, e o script cobra:

```
- **<o que mudou, curto>** — <o que isso muda no dia do cliente>
```

O título nomeia. A frase depois do travessão é a que vende. Três testes rápidos:

1. **Cabe na boca?** Leia em voz alta. Se travar, reescreva
2. **Tem sujeito?** Quem ganha com isso: você, seu cliente, sua equipe
3. **É verificável?** A pessoa pode abrir o sistema agora e ver aquilo

Exemplo que passa nos três: "o cliente paga na hora e o pedido já entra confirmado, sem
você conferir comprovante".

---

## A mensagem de cinco linhas

WhatsApp não é changelog. Cinco linhas, uma ideia por linha, nesta ordem:

1. Quem fala e o que aconteceu ("três coisas mudaram no sistema essa semana")
2. A novidade que mais muda o dia da pessoa, com o ganho colado
3. A segunda novidade
4. A terceira, ou o aviso do que ela precisa fazer, se houver
5. O convite ("abre lá e me diz se ficou do jeito que você imaginava")

Regras que o `node scripts/novidades.js mensagem` confere: no máximo cinco linhas, nenhuma
palavra do léxico técnico, e um convite no fim. Abaixo de 600 caracteres a mensagem é lida
inteira; acima disso, o "ver mais" come o final.

Emoji: no máximo um, e só se a marca já usa. Lista com marcador dentro do WhatsApp fica
pesada, então as linhas ficam soltas, separadas por quebra.

---

## O bloco pro e-mail

O `/email` desenha e envia. Daqui sai só o conteúdo, em três partes:

- **Assunto** — a novidade principal em até 40 caracteres, que é o teto do `/email` pra não cortar no celular, sem "Newsletter" nem "Atualização"
- **Preheader** — a segunda novidade, em até 90 caracteres
- **Corpo** — a abertura de duas linhas, os itens das três gavetas (no máximo cinco itens), o aviso se houver, e um botão só

Cinco itens é o teto. Lista de doze novidades faz o leitor não lembrar de nenhuma.

---

## Ritmo

| Tipo de sistema | Quando publicar |
|---|---|
| Sistema interno, usado pela equipe do dono | quando a mudança muda a rotina, sem calendário |
| Sistema com cliente pagante | a cada duas ou quatro semanas, com data marcada |
| Aplicativo com base grande | a cada versão publicada nas lojas |

Duas semanas sem nada que responda "e daí?" é resposta legítima: não publique. Novidade sem
novidade treina o cliente a ignorar a próxima.

O arquivo de cada rodada fica guardado por data. No fim do trimestre, a pilha de novidades é
o insumo mais barato que existe pro `/relatorio-cliente` e pro `/case`.
