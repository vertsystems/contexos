---
name: manual-do-sistema
description: >
  Escreve o dossiê de quem fica quando o desenvolvedor sai de cena: o manual do sistema em
  português simples, dentro do repositório, com o "se X faça Y" de cada pane, a lista de
  acessos pelo nome do cofre, o custo mensal somado e as datas de vencimento de domínio,
  certificado, chave e plano. Mais um resumo de uma página pra imprimir e guardar na gaveta.
  Use quando o usuário disser "e se o programador sumir", "meu dev saiu e eu não sei nada do
  sistema", "quem mexe nisso quando você não está", "o site caiu e eu não sei o que fazer",
  "quanto eu pago por mês nesse sistema", "quais contas estão no meu nome", "quando vence meu
  domínio", "preciso documentar o sistema", "vou trocar de agência, o que eu peço", "manual do
  sistema", ou /manual-do-sistema.
---

# /manual-do-sistema — O dossiê de quem fica

> **Convenção de pastas:** a saída vai em `sistemas/<nome>/docs/`. Na convenção **por cliente**, `clientes/<Nome>/sistemas/<nome>/docs/`. Quando o código mora fora do workspace, o `MANUAL.md` vai no `docs/` do próprio repositório, porque é lá que ele sobrevive. A pasta nasce na primeira peça.

O sistema funciona, então ninguém pensa nele. Até o sábado em que o site não abre, o cliente
manda print pelo WhatsApp e quem construiu aquilo não responde: encerrou o contrato, trocou
de cidade, sumiu. Nesse dia o dono descobre três coisas de uma vez: não sabe onde o site está
hospedado, não sabe qual conta venceu, e não sabe em que ordem tentar. O código não conta
nada disso. Este é o documento que conta.

## Dependências

- **Contexto:** `_memoria/empresa.md` — quem mantém o sistema hoje, quantas pessoas usam, canais de contato, o que para de funcionar no negócio se o sistema cair
- **Tom:** `_memoria/preferencias.md` — o manual é lido com pressa por quem não é técnico, e o registro precisa ser o dele
- **O que já foi decidido:** `sistemas/<nome>/ESCOPO.md` (`/escopo`), `sistemas/<nome>/DECISOES.md` (`/backend`), `sistemas/<nome>/ENTREGAS.md` (`/quebrar`) e `sistemas/<nome>/EVOLUCAO.md` (`/evoluir`), quando existirem. A seção "Por que é assim" sai de lá, não de entrevista nova
- **Molde principal:** `templates/software/manual.md` — as seções, os três leitores, os oito casos, a regra do cofre, as armadilhas e a revisão mensal
- **Moldes reaproveitados** (o manual aponta pra eles em vez de reescrever): `templates/software/manutencao.md` (passagem de bastão, o inventário do que só uma pessoa entende), `templates/backend/incidente.md` (os primeiros trinta minutos de queda), `templates/backend/debug.md` (investigar defeito, log) e `templates/backend/versoes.md` (desfazer, etiqueta do que está no ar)
- **Custo humano do mês:** `templates/software/evolucao.md`, seção "Custo de operação é trabalho humano"
- **Scripts:** `scripts/manual-sistema.js` (varrer o repositório, somar custo, ordenar vencimento, ler domínio e certificado), `scripts/verificar.js` (`segredo`, `tabela`, `datas`, `texto`, `html`) e `scripts/gerar-pdf.js` (o resumo de uma página em PDF)
- **Saída:** `sistemas/<nome>/docs/MANUAL.md`, `sistemas/<nome>/docs/RESUMO.md`, `sistemas/<nome>/docs/resumo.html` (a página A4 que vira o PDF), `sistemas/<nome>/docs/resumo.pdf` e `sistemas/<nome>/docs/contas.json` (o spec do custo, que fica sempre no workspace e nunca dentro do repositório). No caminho ficam `inventario.md`, `dominio.md`, `custo.md` e `vencimentos.md`, escritos pelos comandos: são a prova de onde cada número do manual veio, e é deles que as tabelas são copiadas

---

## Workflow

### Passo 1 — Descobrir qual sistema, e onde ele mora

Uma pergunta por vez, parando quando já der pra varrer:

1. "Qual sistema a gente vai documentar?" Se existe só um em `sistemas/`, não perguntar
2. "Onde está o código?" Aceitar caminho de pasta na máquina, ou o endereço do repositório no GitHub. Sem código na mão, a skill segue pelo painel e pelas faturas, e cada comando entra como `[a confirmar]`
3. "Qual é o endereço do site ou do painel?" É o domínio que o Passo 3 consulta
4. "Quem mexe nisso hoje, e como você fala com essa pessoa?" Nome, canal, horário
5. "Essa conversa é porque alguém está saindo?" Se sim, o Passo 9 vira urgente e a ordem do trabalho muda: acesso e backup primeiro, texto depois

Se ele responde "não sei" em alguma, escrever `[a confirmar]` e seguir. Manual com lacuna
visível serve; manual com chute não serve.

### Passo 2 — Varrer o repositório por comando

O comando de publicar não se pergunta, se lê. Quem construiu mudou o `package.json` três
vezes e não avisou ninguém.

```bash
node scripts/manual-sistema.js varrer <pasta-do-repo> --saida sistemas/<nome>/docs/inventario.md
```

O `--saida` existe por um motivo prático: número e comando copiados da tela pro documento
chegam trocados. O que o script escreveu é o que entra no manual.

O que sai de lá, e por que cada coisa importa no manual:

| O script lê | Vira no manual |
|---|---|
| `package.json`: `scripts`, `engines.node`, dependências | a seção "Como subir na máquina" e os comandos dos oito casos |
| lockfile (`pnpm`, `yarn`, `bun`, `npm`) | o comando de instalar, que muda com o gerenciador |
| `vercel.json`, `netlify.toml`, `railway.*`, `fly.toml`, `Dockerfile`, `.github/workflows/` | onde o sistema está publicado e o que acontece no `push` |
| `crons` do `vercel.json` e `schedule: cron:` dos fluxos do GitHub Actions | a seção "O que roda sozinho", com o horário traduzido |
| `.env.example` (só os **nomes**) | a lista de chaves, com o cofre de cada uma |
| pasta de migração (`prisma/`, `supabase/`, `migrations/`) | o aviso de que o banco tem versão, e voltar atrás exige cuidado |
| `.gitignore` e `.env` | o alerta de chave versionada |

Nenhum valor de variável sai do script: ele lê o valor só pra acusar chave vazada, e o que
chega no inventário é o nome. E traduz o horário das rotinas: `0 3 * * *` sai como "todo dia
às 03:00 em UTC, que é 00:00 em Brasília", e `0 2 * * 1-5` como "de segunda a sexta às 02:00
em UTC, que é 23:00 do dia anterior em Brasília". Cron da Vercel roda sempre em UTC, sem
opção de fuso (vercel.com/docs/cron-jobs, conferido em 23/09/2026), e o Brasil não tem mais
horário de verão desde o Decreto 9.772, de 25/04/2019, então Brasília é UTC−3 o ano inteiro.
Sem essa tradução, a linha "roda às 3h" faz o dono procurar problema no turno errado.

Se o `.env.example` tiver chave de verdade dentro, o script escreve o achado num bloco próprio
do inventário e **sai com código 1**, em vez de deixar como aviso no meio dos outros. Isso não
é formatação: chave que entrou no repositório está queimada mesmo depois de apagada, porque o
histórico guarda. A ordem é trocar no provedor, apagar o valor, rodar
`node scripts/verificar.js segredo` e só então escrever o manual.

Projeto em Python, PHP ou outra linguagem: o script avisa que só lê `package.json`. Aí os
comandos saem do `README`, do `Makefile` ou da conversa, e cada um é marcado com a origem.

### Passo 3 — Ler o que nenhum arquivo do repositório diz

Domínio, certificado e DNS moram fora do código. É a parte que um chat sem terminal não
consegue escrever, e é onde mais site cai por motivo bobo.

```bash
node scripts/manual-sistema.js dominio padariadobairro.com.br --saida sistemas/<nome>/docs/dominio.md
```

Um comando, quatro respostas que ninguém tem de cabeça:

- Vencimento do registro, lido no `whois`, com quantos dias faltam
- Vencimento do certificado, lido do servidor real pelo `openssl`, com quem o emitiu
- Quem controla o DNS (`NS`) e pra onde o endereço aponta hoje (`A` e `CNAME` do www)
- Quem entrega o e-mail da empresa (`MX`)

O `MX` costuma ser a descoberta desconfortável da conversa. Mexer no DNS pra trocar de
hospedagem derruba o e-mail da empresa junto quando ninguém anotou essa linha. Ela vai pro
manual exatamente como saiu do comando, sem reescrever.

Se o `whois` não responder ou a porta 443 estiver fechada, o script avisa e a data entra como
`[a confirmar]`, com o painel do registrador anotado como lugar de conferir.

### Passo 4 — Levantar contas, acessos e cofre

Aqui é levantamento, então vale uma mensagem só, com tudo junto:

> 1. "Quais serviços esse sistema paga? (hospedagem, banco, domínio, envio de e-mail, WhatsApp, IA)"
> 2. "Cada um está no nome de quem? Qual e-mail entra na conta?"
> 3. "Onde as senhas ficam guardadas hoje?"
> 4. "Quem mais tem acesso a cada um, e qual acesso?"
> 5. "Tem backup? Alguém já restaurou um de verdade?"
> 6. "Se o sistema ficar um dia fora, o que para no negócio?"

Se ele tem a fatura em PDF ou um print do painel, pedir pra jogar em `dados/`: o assistente
lê o arquivo direto e o valor sai do documento, não da lembrança.

O resultado vira `sistemas/<nome>/docs/contas.json`:

```json
{
  "sistema": "Pedidos da Padaria",
  "dominio": "padariadobairro.com.br",
  "contas": [
    { "item": "Vercel", "para_que": "hospeda o site e o painel", "plano": "Pro",
      "valor": "20", "moeda": "USD", "cotacao": "5,40", "cotacao_em": "23/09/2026", "periodo": "mes",
      "conta": "dono@padariadobairro.com.br", "cofre": "1Password › Padaria › Vercel",
      "vence": "14/10/2026" },
    { "item": "Token do WhatsApp Business", "para_que": "confirmação de pedido",
      "valor": "0", "periodo": "mes", "conta": "dono@padariadobairro.com.br",
      "cofre": "1Password › Padaria › Meta", "vence": "02/12/2026" },
    { "item": "Tablet do balcão", "para_que": "abrir o painel no balcão",
      "valor": "1.299,00", "periodo": "unico" }
  ]
}
```

Três coisas nesse exemplo valem explicação. Chave de acesso que expira entra como conta com
`valor: "0"`, porque ela não custa e vence: token de WhatsApp, chave de nota fiscal e
certificado A1 param o sistema no dia em que caducam, e ninguém anota a data em lugar nenhum.
Compra de uma vez leva `periodo: "unico"` e sai da soma mensal. E `cotacao` nunca vai sozinha:
o `cotacao_em` é a data em que ela foi consultada, e o script imprime as duas embaixo da tabela.
Sem a data, a conversão fica marcada como `[a confirmar]`, porque cotação sem dia é número que
ninguém confere depois.

O campo `cofre` guarda o **caminho** até o segredo, nunca o segredo. Se o usuário colar uma
chave no chat, o script para a execução e a resposta é uma só: apagar do arquivo, trocar a
chave no provedor, e escrever o nome do cofre no lugar. Chave que circulou está queimada.

Sem gerenciador de senha, a conversa muda de assunto por dez minutos: instalar um é parte
do trabalho, porque sem ele a lista de acessos não tem onde apontar.

### Passo 5 — Somar o custo e ordenar os vencimentos

Nenhuma das duas contas é feita de cabeça. Fatura em dólar, anuidade de domínio e
assinatura mensal na mesma tabela é exatamente o tipo de soma que sai errada em silêncio.

```bash
node scripts/manual-sistema.js custo sistemas/<nome>/docs/contas.json --saida sistemas/<nome>/docs/custo.md
node scripts/manual-sistema.js vencimentos sistemas/<nome>/docs/contas.json --consultar --saida sistemas/<nome>/docs/vencimentos.md
```

O `--consultar` é o que fecha a lista: ele consulta o `whois` e o certificado do domínio do
spec na hora e coloca as duas datas na **mesma** tabela das contas, já na ordem. Sem ele
ficam duas listas, e a data mais próxima passa batida justamente porque estava na outra.
Sem rede, rodar sem a opção e marcar as duas linhas como `[a confirmar]`.

O que o script faz sozinho, e vale explicar pro usuário quando ele perguntar:

- Anuidade dividida por doze pra entrar no mensal; mensalidade multiplicada por doze pra fechar o ano. O anual conta a anuidade inteira, então ele não é o mensal vezes doze exato, e o `custo.md` já diz isso na linha embaixo da tabela
- Moeda estrangeira só entra na soma com `cotacao` informada. Sem ela, o item vira `[a confirmar]` e fica fora do total
- Compra de uma vez só sai da tabela mensal e vai pra tabela própria, senão o total mente
- O `custo.md` sai com três tabelas separadas: o que entrou na soma (com a linha Total), o gasto de uma vez, e o que ficou fora por falta de dado. A divisão não é enfeite: uma célula `[a confirmar]` no meio da coluna faz a conferência de soma do Passo 10 ser pulada em silêncio
- Vencimento a menos de 7 dias vira problema; a menos de 45 dias, aviso, e `--aviso <dias>` muda essa janela. Certificado tem régua própria de 15 dias, porque ele renova sozinho com um terço da validade pela frente: faltar pouco já é sinal de que a renovação automática quebrou. O script sai com código 1 quando há problema

O total mensal não fica só aqui. Ele é uma linha de custo fixo do negócio, então vale
oferecer uma vez que ele entre no fechamento do `/caixa`.

### Passo 6 — Escrever os oito "se X faça Y"

O coração do manual, e a parte que só funciona com comando real. Cada caso tem quatro
partes: o sinal que o dono percebe, o que ele faz sozinho, o comando exato (saído do Passo
2, nunca inventado), e o ponto em que ele para e chama gente.

| # | Situação | O que precisa estar escrito |
|---|---|---|
| 1 | O site não abre pra ninguém | confirmar em outro aparelho e outra rede, ver o painel de status da plataforma, avisar quem espera. Método em `templates/backend/incidente.md` |
| 2 | Uma tela dá erro, o resto funciona | que informação copiar da tela, onde ficam os registros de erro, que trecho mandar pra quem socorre. `templates/backend/debug.md` |
| 3 | O navegador diz que o site não é seguro | quem renova o certificado, como se força a renovação, quanto tempo leva pra voltar |
| 4 | A mensagem ou o e-mail do sistema parou de sair | onde se vê a fila de envio, se o plano estourou o limite, quem cobra |
| 5 | A conta da plataforma foi suspensa | qual cartão está cadastrado, quem paga, como se reativa sem perder dado |
| 6 | A publicação falhou e no ar continua a versão velha | onde se vê o registro da publicação e como se dispara de novo. `templates/backend/versoes.md` |
| 7 | Precisa voltar pra versão de ontem | o comando de desfazer, cronometrado uma vez. `templates/backend/versoes.md`, seção "Desfazer" |
| 8 | Apagou dado e precisa do backup | onde mora o backup, de quanto em quanto tempo ele roda, e quem já restaurou um |

Escrever em segunda pessoa, com o comando num bloco de código e uma frase de parada. Assim:

> **Se o site não abrir pra ninguém.** Abra padariadobairro.com.br no celular, na rede de
> dados. Se também não abrir, entre em vercel.com/status. Se a Vercel estiver normal, rode:
>
> ```bash
> npx vercel ls --scope padaria
> ```
>
> Se a última publicação estiver em vermelho, volte pra anterior pelo painel (Deployments ›
> três pontinhos › Promote to Production). **Se depois disso ainda não voltou, pare. Chame a
> Marina no (11) 9xxxx-xxxx e não rode nenhum comando de banco.**

Comando que ninguém rodou não entra. Na dúvida entre escrever um comando plausível e
escrever `[a confirmar] — perguntar pra quem construiu`, escolher o segundo sempre.

### Passo 7 — Escrever o `MANUAL.md`

```markdown
# Manual do <sistema>

> Última revisão: <DD/MM/AAAA>. Quem revisou: <nome>.
> Este manual é lido com pressa. Nenhuma senha mora aqui: só o nome do cofre.

## O sistema em três linhas
[o que faz, quem usa, o que para no negócio se ficar um dia fora]

## Se X, faça Y
[os oito casos, cada um com sinal, ação, comando e ponto de parada]

## Quem socorre
| Pessoa | O que ela resolve | Canal | Horário | Fora do horário |
|---|---|---|---|---|

## Onde tudo mora
| Coisa | Onde | Como se entra |
|---|---|---|
| Código | ... | ... |
| Publicado em | ... | ... |
| Banco de dados | ... | ... |
| Domínio e DNS | ... | ... |
| E-mail da empresa (MX) | ... | ... |

## Acesso
| Serviço | No nome de quem | Onde a senha mora | Quem mais entra | Como se tira o acesso |
|---|---|---|---|---|

## Custo por mês
[a tabela do `custo`, com a linha Total, e a data da cotação usada]

## Vencimentos
| O que vence | Quando | Folga | Quem renova | O que acontece se passar |
|---|---|---|---|---|
[as três primeiras colunas vêm do `vencimentos --consultar`, sem redigitar; as duas últimas são conversa]

## O que roda sozinho
| Rotina | Quando (Brasília) | O que toca | Como se percebe que parou |
|---|---|---|---|
[o horário traduzido pelo `varrer`, nunca a expressão de cron crua]

## Como subir na máquina
[instalar, variáveis, rodar, publicar: os comandos do Passo 2]

## Por que é assim
[meia página de decisões: o que doeria refazer, e o que foi tentado e não deu certo]

## O que não deu pra confirmar
[cada [a confirmar], com quem responde e até quando]
```

A seção "Por que é assim" não é entrevista nova: sai do `DECISOES.md` e do `EVOLUCAO.md`
quando eles existirem. Meia página com os porquês vale mais que trinta com lista de telas.

As tabelas de custo, vencimento e rotina entram por cópia do que os arquivos do Passo 2, 3 e
5 trouxeram. Redigitar número é onde o manual começa a mentir, e a conferência do Passo 10
acusa a divergência, não conserta.

Na seção de custo entra a tabela somada com a linha Total, e só ela. O que ficou sem valor vai
pra "O que não deu pra confirmar", nunca como linha `[a confirmar]` no meio da coluna de valor:
com essa linha lá, a conferência de soma não roda e o total errado passa.

### Passo 8 — O resumo de uma página, e o PDF

O manual inteiro é bom no computador. Na manhã ruim, o que salva é papel na gaveta do caixa:
uma página, quatro blocos, nada mais. Esta forma é o teto do que cabe lá:

```markdown
# <Sistema> — o que fazer quando der problema
Última revisão: <DD/MM/AAAA>. Nenhuma senha aqui: só onde ela mora.

## Se o site cair
1. <primeiro passo, sem computador>  2. <segundo>  3. <terceiro>
Se não voltou: <nome>, <telefone>, e não rode comando de banco.

## Contas e vencimentos (a mais próxima em cima)
| O que | Vence | Quem renova |

## Onde tudo mora
Código · Publicado em · Banco · Domínio e DNS · E-mail da empresa

## Nunca sozinho
Apagar dado no banco · trocar DNS · cancelar conta · trocar cartão sem avisar
```

Escrever `sistemas/<nome>/docs/RESUMO.md`, e dele montar `sistemas/<nome>/docs/resumo.html`:
uma página A4 com `@page { size: A4; margin: 12mm }`, estilo embutido na própria página, sem
CSS externo e sem fonte remota (as cores saem de `identidade/tokens.css` quando existir, mas
copiadas pra dentro do arquivo, porque o PDF é gerado offline). Depois converter:

```bash
node scripts/verificar.js html sistemas/<nome>/docs/resumo.html
node scripts/gerar-pdf.js sistemas/<nome>/docs/resumo.html sistemas/<nome>/docs/resumo.pdf
```

Conferir que coube em uma página. Duas páginas viram uma só quando se corta texto, nunca
quando se diminui a fonte abaixo de 11pt: quem vai ler está com pressa e sem óculos.

### Passo 9 — Provar que o manual funciona

Documento que nunca foi executado é intenção. A prova é outra pessoa fazer o que está
escrito, sozinha, com quem sabe olhando calado. Duas provas pagam o dia que custam:

1. **Publicar uma mudança invisível e desfazer.** Trocar uma palavra do rodapé, publicar,
   voltar atrás, cronometrar. Todo passo que faltava no manual vira linha no mesmo dia
2. **Restaurar o backup.** Uma cópia restaurada na frente do dono, com o dado aparecendo na
   tela. Promessa de backup não é backup

Quando a conversa nasceu de alguém saindo, esse passo vem antes do texto bonito. A tabela
de exigências está em `templates/software/manutencao.md`, seção "O desenvolvedor está saindo".

### Passo 10 — Conferir, agendar a revisão e entregar

```bash
node scripts/verificar.js segredo <pasta-do-repo>
node scripts/verificar.js tabela sistemas/<nome>/docs/MANUAL.md
node scripts/verificar.js datas sistemas/<nome>/docs/MANUAL.md
node scripts/verificar.js texto sistemas/<nome>/docs/MANUAL.md
```

Os quatro precisam terminar em "Tudo certo." O `segredo` é o que não se negocia: manual com
chave dentro volta pro Passo 4. Ele roda na pasta onde o `MANUAL.md` foi versionado, porque
enumera os arquivos por `git ls-files`: se a resposta for "não é repositório git", o check não
aconteceu, e aí a leitura é na mão (`grep -rin "senha\|token\|api_key" docs/`) antes de
entregar. O `tabela` é o que pega o erro mais comum desta skill, que é o total de custo copiado
errado pro manual: se ele divergir, a correção é copiar de novo do `custo.md`, nunca ajustar o
número pra fechar.

Manual envelhece em silêncio, então a revisão vira rotina no `/rotina`: uma vez por mês,
rodar `vencimentos` e `custo`, conferir se algum comando mudou no repositório, e conferir
quem entrou ou saiu do time. As datas a menos de 45 dias vão pro `tarefas.md` com a origem,
no formato do `/tarefas`: `- [ ] Renovar domínio padariadobairro.com.br — vence 24/04/2027 (sáb) (/manual-do-sistema)`.

A entrega no chat é curta: o custo mensal com o total, as três datas mais próximas, quantos
dos oito casos ficaram com comando confirmado, e o que ficou `[a confirmar]` com quem
responde. O resumo em PDF vai junto, com o pedido de imprimir e guardar onde o negócio
acontece.

---

## Regras

- **Nenhum segredo no arquivo.** Senha, token, chave de API e string de conexão nunca entram no manual, no resumo nem no `contas.json`. Entra o caminho até eles ("1Password › Padaria › Vercel"). O script recusa spec com segredo dentro, e `node scripts/verificar.js segredo` roda antes da entrega
- **Comando que ninguém rodou não entra.** Todo comando sai do `varrer` do Passo 2 ou foi executado na conversa. Comando plausível é armadilha: o dono tenta na urgência, falha, e nunca mais abre o documento
- **Todo número foi calculado.** Custo mensal, custo anual e dias até o vencimento saem do `scripts/manual-sistema.js`. Fatura em moeda estrangeira só vira real com cotação informada e data; sem isso, `[a confirmar]`
- **Data com dia da semana, e conferida.** O `verificar.js datas` confere; vencimento que cai em fim de semana vale dizer, porque suporte de fornecedor não atende sábado
- **`[a confirmar]` é resposta legítima.** Melhor uma lacuna visível com o nome de quem responde que um chute que parece informação. Toda lacuna vira item no `tarefas.md`
- **O manual mora com o código.** Dentro do repositório, versionado, não num documento na nuvem de quem pode ir embora. O `contas.json` é a exceção e fica no workspace, porque tem custo e conta de fornecedor
- **Escrever pra quem não é técnico.** "Entre no painel da Vercel e clique em Deployments" em vez de "verifique o status do deployment". Sigla só depois de explicada uma vez
- **Todo caso tem ponto de parada.** Sem a frase que manda parar e chamar alguém, o dono de boa vontade transforma dez minutos de queda em perda de dado
- **Dado pessoal com parcimônia (LGPD).** O manual lista função, canal de trabalho e horário de quem atende. Telefone pessoal só com autorização de quem é. Dado de cliente do sistema (CPF, endereço, histórico) não entra em exemplo nem em print colado no documento
- **Nada de contrato aqui.** Quem é dono do código, multa por indisponibilidade e aviso prévio de saída são cláusula, não manual: isso é `/contrato`, e vale dizer que a skill não substitui advogado
- **Fronteira com as vizinhas:** o `/backend` trata o incidente na hora em que ele acontece e escreve o código; o `/evoluir` mede o uso e decide o que construir depois; o `/conectar` liga a chave de uma ferramenta nova e registra no `.env`; o `/escopo` faz a conta de custo **antes** de construir; o `/rotina` agenda a revisão mensal deste manual; o `/procedimento` documenta tarefa de gente no balcão, não sistema; e sessão de trabalho interrompida é `/pausar`. Esta skill é o documento permanente do sistema que já existe, nada além
- **Revisão mensal ou o manual mente.** Plataforma muda de nome, banco migra, desenvolvedora troca. Manual de um ano atrás faz o dono agir pelo comando errado, e isso é pior que não ter manual
