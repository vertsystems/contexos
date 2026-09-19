# Rotinas — o que vale repetir, e o que nunca roda sozinho

Referência do `/rotina`. O `/abrir` consulta a seção de vencidas, o `/revisao-semanal` e o
`/caixa` são duas das rotinas listadas aqui, e o `/mapear-rotinas` usa a lista do que não
se automatiza antes de propor skill nova.

Por que existe: negócio pequeno não perde por falta de ideia, perde por falta de repetição.
A revisão da semana que acontece três vezes e some, o relatório de anúncio que só é lido
quando o cartão estoura, o depoimento que ninguém pede porque a entrega já foi há um mês.
Rotina é o que faz o sistema trabalhar sem depender de o dono lembrar. Ninguém lembra. Este arquivo lista
as oito que mais devolvem pelo tempo que custam, a cadência que faz sentido pra cada uma, o
que cada uma produz, e a fronteira do que nunca roda sem uma pessoa olhar.

---

## As oito rotinas que mais valem pra negócio pequeno

| # | Rotina | Cadência sugerida | Executa | Produz |
|---|---|---|---|---|
| 1 | Revisão da semana | toda sexta 17h | `/revisao-semanal` | `revisoes/<data>.md` e o `tarefas.md` da semana que entra |
| 2 | Leitura de ads | toda segunda 9h | `/relatorio-ads` com os CSVs de `dados/` | `campanhas/relatorios/<data>.md` com alerta e ação |
| 3 | Lembrete do calendário | toda segunda 8h | leitura de `conteudo/calendario-<AAAA-MM>.md` | lista do que sai nos próximos 7 dias e o que ainda não tem peça pronta |
| 4 | Tarefas vencidas | todo dia útil 8h | leitura de `tarefas.md` | os itens com prazo vencido ou vencendo em 3 dias |
| 5 | Fechamento do caixa | dia 1 de cada mês 9h | `/caixa` com extrato ou planilha de `dados/` | `financeiro/fechamento-<AAAA-MM>.md` em rascunho, pro dono confirmar |
| 6 | Pedido de depoimento | por evento: 7 dias depois da entrega | `/pos-venda`, situação "acabou de entregar" | mensagem pronta em `vendas/pos-venda/`, esperando o dono enviar |
| 7 | Follow-up de proposta | por evento: 3 dias depois de enviada | `/pos-venda`, situação "orçamento sem resposta" | mensagem pronta e o item em `tarefas.md` |
| 8 | Avaliações novas | toda segunda 9h | `/responder-avaliacoes` com as avaliações que o dono colou | respostas em rascunho, uma por avaliação, pra aprovar |

Três a cinco rotinas ativas é o tamanho que um negócio de uma pessoa sustenta. Oito ao
mesmo tempo viram ruído no `/abrir` em duas semanas, e ruído é o que faz o dono parar de ler.

As rotinas 2, 5 e 8 leem `dados/`, e essa pasta fica fora do repositório de propósito
(`.gitignore`). Elas rodam no modo manual, com o dono presente. Agendada só se o arquivo
morar numa pasta versionada e não tiver dado pessoal.

### Onde cada uma se apoia, e o que conta como resultado

**1. Revisão da semana.** Sexta no fim do dia, não segunda de manhã: na segunda a semana
já começou e a revisão vira atraso. Resultado útil é uma revisão com pelo menos um item
em "Semana que entra". Vazio é semana em que nada saiu e nada travou, o que acontece em
férias e feriado prolongado.

**2. Leitura de ads.** Depende de o dono exportar o CSV do Google Ads ou da Meta e
deixar em `dados/` antes da segunda. Sem CSV novo, a rotina não inventa. Registra "vazio:
sem CSV em `dados/`" e para. Três segundas assim e ela é desligada, porque o problema é
o hábito de exportar, não a leitura. Útil é relatório com pelo menos um alerta ou uma
ação pra semana.

**3. Lembrete do calendário.** Não cria peça, só avisa. Lê o calendário do mês, lista o
que está previsto pros próximos 7 dias e confere se cada peça já existe em `conteudo/`
(pasta com PNG renderizado, não só HTML). Útil quando encontra peça prevista sem arquivo
pronto; vazio quando está tudo feito ou o mês não tem calendário (aí a sugestão é o
`/calendario`, uma vez).

**4. Tarefas vencidas.** A mais barata das oito: lê o `tarefas.md` e devolve o que venceu
e o que vence em 3 dias, com o mesmo 🔴 e ⚠️ do `/tarefas`. Útil quando há item vencido
ou vencendo; vazio quando não há. Como o `/abrir` já faz essa leitura, esta rotina só se
justifica agendada, pra quem quer o aviso sem abrir sessão.

**5. Fechamento do caixa.** Dia 1 costuma cair em fim de semana ou feriado; "primeiro dia
útil do mês" funciona melhor pra quem exporta o extrato do banco. A rotina monta o
fechamento com o que houver em `dados/` e marca `[a confirmar]` no que faltou. Número não
se inventa: sem extrato, o fechamento sai só com a estrutura e a lista do que o dono
precisa trazer. Útil é fechamento com as quatro contas somadas por comando.

**6. Pedido de depoimento.** Por evento, não por calendário: quem dispara é a entrega
registrada em `tarefas.md` (item fechado com "entregue" e data). O `/pos-venda` pede o
depoimento na hora da entrega, depois de confirmar que ficou bom; a rotina é a rede pra
quando isso não aconteceu. Sete dias depois, a mensagem fica pronta. A rotina **nunca
envia**: prepara duas variantes e deixa no arquivo.
Útil é mensagem preparada; vazio é semana sem entrega, o que é normal e não conta pra
desligar (rotina por evento não entra na regra dos três vazios).

**7. Follow-up de proposta.** Mesmo mecanismo: a `/proposta` marca "enviada em <data>" no
`tarefas.md`, e três dias depois a mensagem de follow-up está pronta. A cadência do
`/pos-venda` vale aqui: 3 dias, 7 dias, e a última que encerra. Depois da terceira, a
rotina não gera mais nada pra aquela proposta.

**8. Avaliações novas.** Só faz sentido pra quem tem perfil no Google com avaliação
chegando. O dono cola as avaliações da semana (ou a rotina lê o arquivo que ele deixou em
`dados/`), e as respostas saem em rascunho. Publicar é com ele. Uma por uma.

### Uma nona, de segurança

**Salvar no GitHub**, toda sexta 18h ou último dia do mês, pelo `/salvar`. Não produz
nada pro negócio, e é a única que protege tudo o que as outras produziram. Vale pra quem
já configurou o repositório; sem ele, a rotina não tem o que fazer e não deve ser criada.

---

## O que nunca se automatiza

A linha é simples: **rotina prepara, pessoa envia.** Tudo o que sai do workspace e chega
em alguém de fora passa por uma pessoa antes.

| Nunca sozinho | Por quê | O que a rotina faz no lugar |
|---|---|---|
| Mensagem pra cliente (WhatsApp, e-mail, direct) | Cliente recebe mensagem errada uma vez e o dono fica sabendo pela resposta | Deixa a mensagem pronta em `vendas/` e o item em `tarefas.md` |
| Publicar post, artigo, página | Publicação é irreversível na prática: print circula antes de apagar | Deixa a peça renderizada e o `como-postar.md` |
| Responder avaliação pública | Resposta pública em nome da marca, sem revisão, é onde a reputação quebra | Rascunho por avaliação, esperando aprovação |
| Enviar proposta, contrato, cobrança | Valor errado numa proposta enviada não se corrige com "ignora a anterior" | Proposta pronta em `propostas/`, follow-up preparado |
| Mexer em `_memoria/estrategia.md` | Estratégia muda com padrão confirmado (3 semanas), não com uma execução | Aponta o padrão na revisão e pergunta |
| Apagar, mover ou renomear arquivo de trabalho | Rotina não sabe o que o dono estava fazendo com aquele arquivo | Lista o que parece obsoleto e deixa a decisão |
| Gastar dinheiro (subir orçamento de anúncio, comprar crédito, contratar API) | Decisão financeira é do dono, sempre | Relatório diz "o CPA caiu 30%, cabe subir o orçamento"; quem sobe é ele |
| Rodar `git push --force` ou qualquer comando destrutivo | Irreversível | Nunca. Nem com confirmação prévia genérica |

O `/carrossel`, o `/email` e o `/whatsapp` já seguem essa regra por conta própria:
entregam a peça, não publicam. A rotina herda o comportamento da skill que chama.

---

## Os dois modos de rodar

### Manual: o registro e o `/abrir`

Funciona em qualquer cliente de IA, sem depender de agendamento. A rotina fica registrada
em `rotinas.md` na raiz, com dia e hora, e o `/abrir` roda
`node scripts/rotinas.js vencidas` no começo da sessão. O que está vencido aparece na
linha "Pendente", e o dono diz "roda a revisão" quando quiser. A rotina não roda sozinha.
Ela lembra de existir. Pra negócio de uma pessoa, que abre o assistente quase todo dia,
isso resolve a maior parte.

### Agendada: o cliente de IA dispara

Quando o cliente de IA tem agendamento de rotinas, o assistente cria o agendamento a
partir do registro. No Claude Code, na versão conferida em 19/09/2026, isso é o comando
**/schedule** do próprio cliente (não é skill do sistema): a rotina roda na nuvem, em cima do repositório do GitHub. Em outro cliente, ou
em outra versão, o assistente diz se tem o recurso; o que ele não viu na sessão não existe.
O que o agendamento precisa conter, em qualquer cliente:

1. **Nome**, o mesmo do `rotinas.md`
2. **Horário em UTC.** "Toda sexta 17h" em São Paulo é `0 20 * * 5`. Nunca converter de
   cabeça: `node scripts/rotinas.js proxima "toda sexta 17h"` devolve a expressão e as
   próximas datas com dia da semana
3. **Onde está o workspace.** A rotina na nuvem começa do zero: não vê a máquina do dono,
   nem o `.env` local, nem arquivo que não foi salvo com o `/salvar`. Sem repositório no
   GitHub, o modo agendado não existe pra esse workspace
4. **O prompt, autocontido.** Qual skill rodar, com qual entrada, onde entregar, o que
   fazer se a entrada não existir (registrar "vazio" e parar), e o que **não** fazer
   (enviar, publicar, apagar). O prompt precisa funcionar pra quem nunca viu a conversa
5. **O que fazer com o resultado.** Salvar o arquivo na pasta prevista e anotar no
   histórico do `rotinas.md`, pra que o `/abrir` da manhã seguinte mostre o que saiu

Limites que costumam existir e mudam entre versões: intervalo mínimo entre execuções
(uma hora é comum) e horário em UTC, os dois `[a confirmar]` na hora de criar. Desligar é
pelo painel do cliente ou pedindo ao assistente, e o registro em `rotinas.md` precisa
refletir o desligamento, senão o `/abrir` segue cobrando. O assistente confere antes de
prometer; o que não conferiu, não promete.

Modelo de prompt pra uma rotina agendada:

```
Você está no workspace do Contex OS de <negócio>. Leia o CLAUDE.md da raiz antes de tudo.
Rode a skill /revisao-semanal do jeito que ela está em .claude/skills/revisao-semanal/SKILL.md,
com os arquivos que existem no repositório. Não pergunte nada: onde faltar resposta do dono,
deixe [a confirmar]. Salve em revisoes/<AAAA-MM-DD>.md. Depois rode
node scripts/rotinas.js registrar "Revisão da semana" --resultado "útil: <o que saiu>" (ou
"vazio: <por quê>"). Não envie mensagem, não publique nada, não apague arquivo, não mexa em
_memoria/estrategia.md. Faça commit do que criou com a mensagem "rotina: revisão da semana <data>".
```

---

## A regra dos três vazios

Rotina que rodou três vezes seguidas sem produzir nada útil é desligada, e o dono é avisado
com o motivo. Não é punição. É sinal de que a entrada não chega (CSV que ninguém exporta),
a cadência está errada (revisão semanal num negócio que fatura duas vezes por mês) ou a
rotina nunca foi necessária. O `scripts/rotinas.js` conta os vazios pelo histórico e avisa
no terceiro. A rotina vai pra seção "Desligadas" com a data e o motivo, e pode voltar quando
o que faltava passar a existir.

"Útil" e "vazio" são declarados por quem registra, em uma linha cada:
`útil: 3 itens pra semana que entra` ou `vazio: sem CSV novo em dados/`. Rotina por evento
(depoimento, follow-up) não entra na regra: semana sem entrega é normal.

---

## Cadência: o que costuma dar certo

- **Semanal** é o padrão. Diária só pra leitura barata (tarefas vencidas), e nunca mais de
  uma rotina diária por vez
- **Mensal** pro que depende de fechamento (caixa, medição do `/medir`). "Quinzenal" vira
  "dia 1 e 15 de cada mês": o script não conta quinzena, conta dia
- **Por evento** pro que depende de data de terceiro (entrega, proposta enviada). Cadência
  fixa aqui gera mensagem fora de hora
- Duas rotinas no mesmo horário competem pela atenção do dono no `/abrir`: espalhar pela
  semana (ads na segunda, revisão na sexta, caixa no dia 1)
- Rotina que exige o dono presente (colar avaliação, responder pergunta) roda no horário em
  que ele costuma abrir o assistente, não de madrugada
