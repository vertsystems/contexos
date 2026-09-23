---
name: retencao
description: >
  Cuida de quem paga mensalidade, plano ou contrato mensal e está prestes a sair: lê o
  export do sistema de cobrança ou a lista do mês, separa quem está ativo, quem sumiu (não
  veio, não abriu, reclamou, pediu pausa) e quem cancelou, calcula churn, retenção e receita
  em risco por script, entrega a planilha de saúde, a pesquisa de saída de três perguntas,
  a oferta certa pra cada motivo e a mensagem de cada caso.
  Use quando o usuário disser "meus alunos estão cancelando", "muita gente sumiu esse mês",
  "quantos clientes eu perdi", "como seguro quem quer cancelar", "o cliente pediu pra
  cancelar, o que eu respondo", "quero saber quem tá em risco", "qual meu churn",
  "quanto eu perco por mês de mensalidade", "o aluno parou de vir mas ainda paga",
  "pesquisa de cancelamento", ou /retencao.
---

# /retencao — Quem some e quem cancela

> **Convenção de pastas:** a saída vai em `vendas/retencao/`. Na convenção **por cliente**, `clientes/<Nome>/vendas/retencao/` quando a base é do cliente do usuário (agência que cuida da academia de alguém); a base do próprio negócio fica na raiz. A pasta nasce na primeira leitura do mês.

Negócio de mensalidade não perde cliente no dia do cancelamento. Perde três semanas antes,
quando o aluno para de passar na catraca, a clínica que assina o plano deixa de responder
o relatório, o assinante para de abrir a aula nova. Nesse período ele ainda paga, ainda
atende o telefone e ainda não decidiu. Depois do "quero cancelar", a conversa já é outra,
e quase sempre é curta. Esta skill olha a lista do mês pra achar quem está nessa janela,
diz quanto de receita está nela, e escreve o que mandar pra cada um. Reter um cliente
custa uma mensagem. Trazer um novo custa anúncio, proposta e semanas.

> **Isto não é aconselhamento jurídico.** A skill mostra o que o CDC diz sobre cancelar,
> multar e reembolsar, pra não montar oferta que o Procon derruba. Multa de fidelidade,
> devolução de plano anual e cliente que ameaça processo passam por advogado antes de
> virar resposta. Dizer isso na entrega, uma vez.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que é a mensalidade (academia, plano, contrato, assinatura), sistema de cobrança em uso, quantos clientes, quem atende
- **Tom:** `_memoria/preferencias.md` — mensagem pra quem sumiu soa como sistema quando não é a voz do dono
- **A palavra do cliente:** `_memoria/publico.md`, se existir. O que sair da pesquisa de saída volta pra lá
- **Oferta e preço:** `_memoria/oferta.md` e o estudo do `/preco`, se existirem. A oferta de retenção não pode furar o piso de lá
- **Margem:** o fechamento do `/caixa` em `financeiro/`, quando existir. Desconto abaixo do custo variável não é retenção
- **Referência:** `templates/crescimento/retencao.md` — os três grupos, o sinal de sumido por tipo de negócio, as fórmulas, a pesquisa de três perguntas, a oferta por motivo, o que a lei diz, com fonte e data
- **Script:** `scripts/retencao.js` — lê CSV, `.xlsx` ou JSON, classifica, calcula os três números e gera a planilha de saúde com fórmula viva
- **Planilha:** `scripts/gerar-planilha.js` — o script de retenção chama ele; `--ler` abre o export do sistema pra conferir as colunas
- **Conferência:** `node scripts/verificar.js tabela` e `texto`
- **Saída:** `vendas/retencao/saude-<AAAA-MM>.md` (números, listas, fila de contato e mensagens), `vendas/retencao/saude-<AAAA-MM>.xlsx` (a planilha) e, uma vez por negócio, `vendas/retencao/pesquisa-de-saida.md` e `vendas/retencao/ofertas.md`

---

## Workflow

### Passo 1 — Confirmar que é mensalidade

A skill só faz sentido pra quem cobra de novo todo mês do mesmo cliente. Se
`_memoria/empresa.md` já diz, não perguntar. Se não diz, uma pergunta:

> "O cliente paga todo mês (plano, mensalidade, contrato, assinatura), ou paga por
> serviço quando precisa?"

Paga por serviço, sem recorrência: cliente parado e reativação são do `/pos-venda`, e
a skill diz isso em uma linha e passa o pedido pra lá. Sem lista nenhuma de quem paga
(nem export, nem planilha, nem uma lista de nomes na cabeça), o mesmo caminho: o
`/pos-venda` trabalha com a conversa; esta skill trabalha com a lista.

### Passo 2 — Pegar a lista do mês

Três formas, da melhor pra pior:

1. **Export do sistema** (Tecnofit, EVO, Asaas, Vindi, Hotmart, Kiwify, Conta Azul,
   planilha do Google). O usuário joga o arquivo em `dados/`. Antes de calcular, abrir e
   conferir o cabeçalho:

   ```bash
   node scripts/gerar-planilha.js --ler dados/clientes-setembro.xlsx --linhas 5
   ```

   O script entende coluna com nome aproximado (aluno, paciente, assinante; mensalidade,
   valor do plano; matrícula, cliente desde; última presença, último acesso; trancado,
   pausado; cancelado em). Na coluna de status ele também entende o vocabulário dos
   sistemas brasileiros: "trancado" e "trancou" são pausa de academia, não cancelamento,
   e "boleto vencido", "bloqueado" ou "inadimplente" saem numa lista à parte, porque
   atraso é `/cobranca`. Coluna com nome fora disso, renomear num CSV novo em `dados/`
   em vez de editar o arquivo dele

2. **PDF ou print do sistema:** o assistente lê pela ferramenta Read e transcreve num
   JSON em `dados/clientes-<AAAA-MM>.json` (`{"clientes":[{"cliente","plano","valor",
   "inicio","status","ultima_visita","cancelado_em","motivo","telefone"}]}`). Mostrar a
   transcrição antes de calcular: nome trocado aqui vira mensagem pra pessoa errada

3. **Lista manual:** o dono sabe quem sumiu, só não tem sistema. Uma mensagem só:

   > "Me manda a lista de quem paga mensalidade: nome, valor do plano e desde quando.
   > Marca quem cancelou esse mês (e por quê, se souber), quem está em pausa, e quem
   > você sente que sumiu ou reclamou."

   Vira um CSV com as colunas `cliente;valor;inicio;status;motivo`, e o status aceita
   `sumido` direto quando o dono já sabe

Antes de rodar, uma pergunta que define o limiar:

> "Com quantos dias sem aparecer você já considera que a pessoa sumiu?"

Se ele não sabe, usar a sugestão por tipo de negócio do molde (14 dias pra academia, uma
sessão perdida pra clínica, 10 dias úteis sem resposta pra agência) e dizer qual foi usada.
Quando o limiar é em dias úteis, o `--uteis` conta assim, com feriado nacional de fora.

### Passo 3 — Calcular os três números por comando

Churn não se calcula de cabeça: o erro clássico é dividir pelo total do fim do mês e
achar que está tudo bem.

```bash
# export do sistema, mês corrente, sumido a partir de 14 dias
node scripts/retencao.js dados/clientes-setembro.xlsx --sumido 14 \
  --saida vendas/retencao/saude-2026-09.md --xlsx vendas/retencao/saude-2026-09.xlsx

# fechar o mês anterior, com o export tirado hoje
node scripts/retencao.js dados/clientes.csv --mes 2026-08 --saida vendas/retencao/saude-2026-08.md

# agência: 10 dias úteis sem resposta, com feriado nacional na conta
node scripts/retencao.js dados/contratos.json --sumido 10 --uteis --xlsx vendas/retencao/saude-2026-09.xlsx

# refazer um mês fechado como ele era naquela data, pra comparação honesta
node scripts/retencao.js dados/clientes.csv --mes 2026-07 --hoje 31/07/2026
```

O script escreve o arquivo inteiro: os três números com a conta ao lado, os cancelados
com meses de casa e motivo, os sumidos ordenados por urgência e valor, quem está em atraso
(que sai da conta de risco), a fila de quem contatar hoje e os avisos. Com `--xlsx`, grava
a planilha de duas abas mais a spec `.planilha.json` ao lado, pra regenerar: a aba Clientes
é a lista com a classificação e as colunas de acompanhamento, e a aba Saúde recalcula os
números sozinha quando o dono muda uma situação. O assistente **não altera nenhum
número**: edita o arquivo pra acrescentar as seções do Passo 6 abaixo das tabelas.
Depois:

```bash
node scripts/verificar.js tabela vendas/retencao/saude-2026-09.md
```

Precisa terminar em "Tudo certo." Se acusar soma errada, o problema é edição manual na
tabela; rodar o script de novo em vez de corrigir na mão.

Ler os avisos antes de seguir, e repassar ao dono os que mudam a leitura:

| Aviso | O que fazer com ele |
|---|---|
| Sem coluna de última visita | O número de sumidos só conta reclamação, pausa e status. Dizer isso antes de mostrar o número |
| Churn e retenção como `[sem dado]` | O arquivo não tem como dizer quem cancelou. Pedir a coluna de status ou de cancelamento e rodar de novo, em vez de entregar 100% de retenção |
| Cancelou antes do mês | O export veio com histórico e o script filtrou. Nada a fazer |
| Cancelamento agendado pra depois do mês | Ele ainda paga e virou o primeiro da fila: é a única conversa com prazo |
| Pagamento em atraso | Vai pro `/cobranca`, e ficou fora da receita em risco. Não mandar mensagem de retenção pra quem está devendo |

### Passo 4 — Ler o resultado com o dono

Os três números sozinhos não dizem nada. O que diz é a comparação e a lista:

- **Churn de clientes** contra o mês anterior, se `vendas/retencao/` já tem. Um mês
  isolado é ruído; três meses subindo é o negócio encolhendo por baixo enquanto a
  captação disfarça
- **Receita em risco** contra o lucro do `/caixa`. Se os sumidos somam R$ 2.400/mês e o
  lucro do mês foi R$ 3.100, a semana de ligações vale mais que qualquer campanha
- **A lista de cancelados por motivo.** Dois cancelamentos por "preço" em meses seguidos
  é conversa do `/preco` ou do `/oferta`; três por "não ficou como esperava" é conversa
  de entrega, não de retenção
- **Meses de casa de quem saiu.** Se todo mundo cancela no terceiro mês, o problema
  está no que acontece no segundo

Dizer o que a conta permite, com o número junto: "quatro sumidos somam R$ 509,60 por
mês; ligar pra eles essa semana é a maior alavanca que existe na lista".

### Passo 5 — Montar a pesquisa de saída e a oferta por motivo

Uma vez por negócio. Se `vendas/retencao/pesquisa-de-saida.md` já existe, pular.

**A pesquisa** tem três perguntas, e a terceira é a que ninguém faz: "se as coisas
mudarem, posso te chamar de volta?". É a autorização pra reativação (LGPD) e o tamanho
da porta que ficou aberta. O texto das três está no molde; a skill escreve na voz do
usuário, no canal dele, sem formulário quando der.

**A oferta por motivo** sai da tabela do molde e do piso do `/preco`:

| Motivo que o cliente deu | Primeira oferta | Se recusar |
|---|---|---|
| Preço | Desconto por tempo, com data de fim e preço cheio escrito | Plano menor |
| Não estava usando | Pausa de 1 a 3 meses com data de volta | Sessão de retomada |
| Mudou a rotina, a cidade, a vida | Pausa com data | Encerrar bem, porta aberta |
| Não ficou como esperava | Resolver primeiro, com prazo e responsável | Crédito depois de resolvido |
| Achou outro lugar | Perguntar o que o outro tem | Deixar ir, pedir a pergunta 3 |
| Fechou o negócio, perdeu a renda | Nenhuma. Agradecer e encerrar sem multa | Contato humano, sem venda |

O tamanho do desconto se calcula, não se chuta. Com a margem de contribuição por cliente
do `/caixa`:

```bash
# mensalidade 149,90, custo variável por aluno 22,00, desconto proposto 25% por 3 meses
node -e 'const m=149.90,cv=22,d=0.25,n=3; const novo=m*(1-d); console.log("mensalidade com desconto:",novo.toFixed(2),"| margem por mês:",(novo-cv).toFixed(2),"| deixa de entrar nos",n,"meses:",(m*d*n).toFixed(2))'
```

Se a margem com desconto fica negativa, a oferta é pausa ou plano menor, não desconto.

Os dois arquivos que nascem aqui, e só mudam quando o preço ou a oferta mudam:

```markdown
# Pesquisa de saída — <negócio>
Canal: <WhatsApp, e-mail, ligação>   ·   Quando: no mesmo dia do pedido de cancelamento
1. <pergunta 1, com as cinco opções e "outro">
2. <pergunta 2, resposta livre de uma linha>
3. <pergunta 3, sim ou não — é a autorização de contato futuro>
## O que fazer com cada resposta
[para cada opção da pergunta 1: a oferta, e quem avisar dentro do negócio]
```

```markdown
# Ofertas de retenção — <negócio>
Piso de preço: <do /preco>   ·   Margem de contribuição por cliente: <do /caixa>
| Motivo | Oferta | Teto | Validade | Quem aprova |
|---|---|---|---|---|
## Regras
- Uma oferta por cliente por ano, dita uma vez
- Desconto com data de fim e preço cheio na mesma mensagem
- Pausa com data de volta e lembrete três dias antes
- Reclamação aberta não recebe oferta: resolve primeiro
```

Registrar aí qual oferta vale pra qual motivo, o teto de desconto e a regra de uma oferta
por cliente por ano.

### Passo 6 — Escrever as mensagens

Uma por caso, curta, na voz do usuário, no canal dele (o `/whatsapp` calibra formato).
Nome, um fato, uma pergunta. Nunca "sentimos sua falta". Duas variantes de temperatura
pra cada, pra ele escolher. Os casos:

- **Sumido, não veio:** "Bruno, faz 20 dias que você não aparece por aqui. Mudou alguma
  coisa na rotina?" Acima de 30 dias, o roteiro é de ligação, não de texto
- **Sumido, reclamou:** resposta sobre a reclamação, com o que foi feito e quem cuida.
  Nenhum convite pra voltar na mesma mensagem
- **Pausa vencendo ou vencida:** "Sua pausa termina dia 20. Volta essa semana ou prefere
  esticar mais um mês?" Duas saídas, as duas boas pro negócio
- **Pediu pra cancelar:** a pesquisa de três perguntas, a oferta do motivo (uma vez), e
  a confirmação do cancelamento no mesmo dia se ele mantiver. Sem fila, sem "só com o
  gerente"
- **Cancelou e autorizou contato:** entra na lista de reativação, e a série de três
  mensagens é desenhada aqui e disparada pelo `/sequencia`

O arquivo do mês fica assim depois da edição:

```markdown
# Saúde dos clientes — <mês>/<ano>

[tabela dos três números, lista de cancelados, lista de sumidos e fila: geradas pelo script, sem editar]

## O que a conta permite decidir
1. [decisão concreta, com o número que a sustenta]
2. ...

## Mensagens
### <Cliente> — sumido, não veio — variante A
[texto pronto pra copiar]
### <Cliente> — variante B
[texto pronto pra copiar]
### <Cliente> — reclamou
[resposta à reclamação, com prazo e responsável]

## Se ele responder
[o que dizer nos três desfechos: volta, "depois", quer cancelar]

## Comparado com o mês passado
[churn, receita em risco e cancelados por motivo, lado a lado, se houver mês anterior]
```

Antes de entregar:

```bash
node scripts/verificar.js texto vendas/retencao/saude-2026-09.md
```

### Passo 7 — Fechar o ciclo

- Cada contato da fila vira linha em `tarefas.md` com data. Retenção que depende de
  memória não acontece
- Quem respondeu a pesquisa de saída: a resposta da pergunta 2 vai pra
  `_memoria/publico.md` na palavra dele, com a pergunta do CLAUDE.md sobre atualizar a
  memória
- Depois de cada contato, preencher **Contatado em** e **Resultado** na aba Clientes da
  planilha (voltou, prometeu voltar, sem resposta, aceitou oferta, cancelou). A aba Saúde
  soma sozinha quantos sumidos foram contatados, quantos voltaram e quantas ofertas foram
  aceitas: é a única medida de que o processo rodou, e não só o relatório saiu
- Quem aceitou oferta: anotar também na coluna Motivo ("desconto 25% até 12/2026"), pra
  não receber outra em três meses
- No mês que vem, rodar de novo com o export novo. A comparação mês a mês é o que
  transforma o número em decisão

---

## Regras

- **Churn se calcula por comando, nunca de cabeça.** Dividir pelo total do fim do mês e
  contar quem entrou e saiu no mesmo mês como churn da base são os dois erros que o
  script existe pra impedir. Se o dono trouxer um número calculado à mão que diverge,
  mostrar a conta, não ajustar
- Nome, valor, data e motivo saem do arquivo. O que não estiver lá fica `[a confirmar]` na
  tabela, nunca preenchido com estimativa: quem lê essa planilha vai ligar pra essas
  pessoas. Se o script devolveu `[sem dado]`, esse é o número que vai pra entrega
- **Sumido vem antes de cancelado.** A fila de contato é a entrega mais importante da
  skill, mais que o relatório. Sem contato, o relatório só documenta a perda
- **Sem lista, sem skill.** Negócio de serviço avulso, ou sem nenhuma lista de quem paga,
  vai pro `/pos-venda` (reativar cliente parado, orçamento sem resposta). Esta skill
  precisa de uma base pra classificar
- **Boleto vencido e cartão recusado são `/cobranca`.** Inadimplente não é sumido; é
  alguém que precisa de régua de cobrança. Só entra aqui se pagou e continua sem aparecer
- **Quem reclamou não recebe oferta.** Primeiro resolve, depois conversa. Se a reclamação
  virou avaliação pública, `/responder-avaliacoes` cuida do lado de fora
- **Uma oferta por cliente por ano, dita uma vez.** Oferta repetida ensina a cancelar pra
  ganhar desconto. Se ele recusou, a próxima mensagem é a pergunta 3, não outra oferta
- **Desconto tem data de fim e preço cheio na mesma mensagem.** Sem isso, o reajuste
  chega no boleto e o cliente cancela de novo, com raiva
- **Quem pediu pra sair, sai no mesmo dia, pelo mesmo canal.** O CDC proíbe exigir do
  consumidor vantagem manifestamente excessiva (art. 39, V) e anula cláusula que o deixe
  em desvantagem exagerada (art. 51, IV); enquadrar fila e "só com o gerente" nisso é
  leitura de Procon e tribunal, não letra do artigo, e o molde diz isso com a fonte. O
  cancelamento imediato por todos os canais de venda é obrigação de serviço regulado
  (Decreto 11.034/2022, art. 14), e academia e clínica estão fora desse escopo: aqui vale
  como boa prática. A oferta vem antes da confirmação, uma vez, e não segura ninguém
- **Multa de fidelidade só se estava no contrato, e proporcional.** Percentual e devolução
  de plano anual são conversa com advogado; a skill aponta o artigo e para aí
- **Não substitui advogado nem contador.** Cláusula de contrato, multa, reembolso e
  contestação passam por advogado antes de virar resposta ao cliente
- **Dado de cliente é dado pessoal (LGPD).** Lista de alunos, pacientes ou assinantes não
  vai pra ferramenta externa sem autorização explícita. Quem cancelou só recebe mensagem
  de reativação se disse sim na pergunta 3, e toda mensagem tem como sair. Paciente é
  dado sensível: mensagem de clínica não menciona diagnóstico nem tratamento
- **Fronteira com as vizinhas:** a série de reativação de quem cancelou é desenhada aqui
  e disparada pelo `/sequencia`; o preço da oferta respeita o piso do `/preco`; a margem
  que permite desconto vem do `/caixa`; a pergunta de satisfação recorrente, antes de
  qualquer sinal de risco, é o `/nps`; o formato da mensagem no canal é o `/whatsapp`
- **Quando o número for ruim, dizer o número.** Churn de 12% ao mês significa que a base
  troca inteira em oito meses. Suavizar isso é o oposto de ajudar
