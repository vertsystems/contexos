# Sequências de mensagem — o que faz uma série funcionar

Referência do `/sequencia`. Vale consultar também quando o `/pos-venda` ou o `/email`
estão numa peça que faz parte de uma série, pra ela não brigar com o resto.

Um e-mail avulso se escreve e se manda. Uma sequência é outra coisa: um conjunto de
mensagens que dispara sozinho a partir de um evento (entrou na lista, abandonou o
orçamento, comprou, sumiu) e segue um ritmo até a pessoa fazer o que a série pede, ou
até pedir pra sair. O trabalho aqui é de arquitetura, não de redação: a mesma mensagem
boa, mandada no dia errado ou com dois pedidos, para de funcionar.

---

## Os seis tipos

| Tipo | O que dispara | Quantas | Intervalo de partida | O que a série quer | Sai quando |
|---|---|---|---|---|---|
| **Boas-vindas** | entrou na lista (isca, cadastro, primeiro contato) | 3 a 5 | D+0, D+1, D+3, D+5, D+7 | a pessoa entender o que você faz e dar o primeiro passo pequeno | clicou na chamada principal ou respondeu |
| **Nutrição** | terminou as boas-vindas sem comprar | 5 a 7 | a cada 3 a 4 dias | virar a objeção principal, uma por mensagem | comprou, pediu orçamento ou respondeu |
| **Carrinho ou orçamento parado** | orçamento enviado, ou carrinho aberto, sem resposta | 3 | D+2, D+7, D+14 (loja virtual: 1h, D+1, D+3) | tirar a dúvida que travou, sem desconto na primeira | comprou, respondeu ou disse que não |
| **Reativação** | sem compra ou resposta há X dias (o X é do negócio) | 3 | D+0, D+7, D+14 | dar um motivo concreto pra voltar, e fechar a porta com elegância | comprou, respondeu ou pediu pra sair |
| **Pós-compra** | pagou ou fechou | 3 a 4 | D+0, D+2, D+7, D+30 | alinhar expectativa, garantir uso, pedir depoimento na hora certa | reclamou (vira atendimento) |
| **Lista de espera** | se cadastrou antes de abrir vaga ou lançar | 3 a 5 | D+0, semanal, D-1, D0, último dia | manter o interesse com bastidor e avisar a abertura | comprou ou a janela fechou |

Os intervalos da tabela são ponto de partida. A régua real vem do que a base responde: se
a terceira mensagem de nutrição não gera clique em dois ciclos, ela sai ou muda, e o
intervalo se recalibra a partir disso.

---

## O arco de cada tipo

O que cada posição da série faz. É ponto de partida, não roteiro fixo: o negócio corta
o que não se aplica, e a ordem só muda com motivo.

**Boas-vindas (3 a 5).** 1: entrega o que foi prometido (o material, o link, a resposta)
e diz em uma linha o que vem pela frente e com que frequência. 2: quem está mandando e
por que faz isso, contado como história, não como currículo. 3: o caso mais parecido
com quem entrou, de `biblioteca.md`. 4: a objeção mais comum antes de comprar, respondida
de frente. 5: o primeiro passo pequeno (agendar, responder uma pergunta, ver a página),
um só.

**Nutrição (5 a 7).** Uma objeção por mensagem, na ordem de frequência de
`_memoria/publico.md`: "é caro", "não tenho tempo", "já tentei e não funcionou", "não
sei se é pra mim", "preciso falar com alguém antes". Duas mensagens da série vendem (a do
meio e a última); as outras ensinam, mostram bastidor ou contam um caso. A última diz o
que acontece se a pessoa não fizer nada, sem ameaça.

**Carrinho ou orçamento parado (3).** 1: "ficou alguma dúvida?", curta, sem desconto.
2: uma informação nova (caso parecido, prazo que abriu, resposta à dúvida mais comum).
3: encerra de verdade: "vou parar de te incomodar; se mudar de ideia, é só chamar". A
pergunta que mais reabre venda vai na 3: "só pra eu entender, o que pesou na decisão?"

**Reativação (3).** 1: um motivo concreto pra voltar (novidade, época, algo que mudou),
nunca "sentimos sua falta" solto. 2: o que mudou desde a última vez, ou um caso recente.
3: fecha a porta com elegância e oferece a saída; quem não respondeu a três sai da base
ativa.

**Pós-compra (3 a 4).** 1 (D+0): confirma o que foi contratado, o que acontece e
quando, o que você precisa da pessoa, e em quanto tempo você responde. 2: como usar ou
o que esperar da primeira semana. 3: dispara na entrega, não em data fixa: "ficou como
você esperava?", e só depois da resposta boa vem o pedido de depoimento. 4 (D+30):
próximo passo natural (recompra, manutenção, indicação). Reclamação em qualquer ponto
tira a pessoa da série e vira atendimento.

**Lista de espera (3 a 5).** 1: confirma a inscrição e diz a data ou a janela, se
existir. Semanais: bastidor do que está sendo preparado, uma peça por vez. D-1: o que
abre amanhã, pra quem, com que condição. D0: abriu, com o link. Último dia: fecha, se
fecha mesmo; série contínua não tem "último dia".

---

## Intervalos: o que se sabe

- **A primeira mensagem sai na hora.** Boas-vindas em D+0 é a mais aberta de qualquer série, porque a pessoa acabou de pedir. Esperar um dia é jogar fora a única mensagem que ela está esperando
- **Os primeiros dias são mais densos, depois abre.** D+0, D+1, D+3 e depois semanal. A atenção cai rápido; a série acompanha
- **WhatsApp é mais curto e mais espaçado que e-mail.** Três mensagens em uma semana no WhatsApp já é muito. No e-mail, cinco em dez dias é normal
- **Nos dois canais, cada um faz uma coisa.** O WhatsApp leva a primeira (a janela de 24 horas está aberta) e a última, a que pede resposta; o e-mail leva o meio. A mesma mensagem nos dois é o que faz a pessoa bloquear um deles
- **Dia da semana conta pra quem vende serviço.** Orçamento mandado na sexta à noite não vai ser lido antes de segunda. Toda data se confere por comando (`node scripts/verificar.js datas`), nunca de cabeça
- **Horário:** manhã de dia útil pra e-mail de trabalho, começo da noite pra consumo. Sem dado próprio, testar duas faixas por dois ciclos e escolher pelo clique

---

## Anatomia de uma mensagem da série

Toda mensagem carrega sete coisas. Faltando uma, a ferramenta não tem o que configurar
ou a pessoa não sabe o que fazer:

1. **Gatilho** — o evento que a dispara (entrou na lista; a anterior foi enviada; não clicou na anterior)
2. **Atraso** — quanto tempo depois do gatilho (D+2, 1 hora, 3 dias úteis)
3. **Objetivo único** — a única coisa que essa mensagem precisa conseguir
4. **Assunto e primeira linha** — no e-mail, assunto e preheader; no WhatsApp, a primeira linha, que é o que aparece na notificação
5. **Corpo** — na voz de quem manda, curto, com uma coisa específica
6. **Uma chamada** — um link, um botão ou uma pergunta. Nunca dois
7. **Condição de saída** — o que tira a pessoa da série antes do fim

---

## Uma chamada por mensagem

Mensagem com dois pedidos ("responde aqui e olha o catálogo") recebe metade de cada um,
ou nenhum. A pessoa lê no celular, entre duas outras coisas, e decide em segundos. Um
link só, uma pergunta só.

Isso não significa uma mensagem pobre. Significa que o conteúdo inteiro empurra pra um
lugar. Se a série precisa de duas ações (ver o vídeo e depois agendar), são duas
mensagens, e a segunda dispara pra quem fez a primeira.

O mesmo vale pro assunto: assunto que promete duas coisas não entrega nenhuma. Os tipos
de gancho que funcionam estão em `templates/copy/ganchos.md`.

---

## O caminho de saída

Toda mensagem tem uma porta pra fora, visível, e o pedido é cumprido rápido. Não é
cortesia: é regra de entrega e é lei.

**E-mail.** Desde fevereiro de 2024, Gmail e Yahoo exigem de quem envia em volume (a régua
do Gmail é 5.000 mensagens por dia para o mesmo domínio) o descadastro em um clique:
cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
(RFC 8058), com o pedido processado em até dois dias, além do link visível no corpo. Os
cabeçalhos são configurados na ferramenta de envio, não no texto. Abaixo desse volume a
regra não é bloqueio, mas a mensagem sem link de saída é a que mais recebe marcação de
spam, e é a marcação de spam que derruba a entrega de todo o resto. Detalhes em
`templates/design/email-html.md`.

**WhatsApp.** Não existe cabeçalho. A saída é uma frase no fim da mensagem ("se não
quiser receber, responde SAIR") e a palavra dita precisa ser tratada: tirar da lista no
mesmo dia, e nunca mandar mais nada. Quem ignora o SAIR é denunciado, e número denunciado
é banido junto com o histórico e o catálogo.

**Depois que saiu**, a pessoa some de todas as séries, não só daquela. Pedir pra sair
da nutrição e continuar recebendo reativação é o erro que gera a denúncia.

---

## LGPD: a base legal e o opt-in

Isso não é parecer jurídico; é o mínimo que uma série de mensagens precisa pra não
virar problema. O contador ou o advogado do negócio valida o resto.

- **Toda lista tem origem.** A pergunta que decide tudo: *de onde veio esse contato, e o que ele esperava receber quando deu o e-mail ou o número?* Quem baixou um material esperava o material; mandar oferta pra ele exige que o formulário tenha dito isso
- **As bases legais que costumam valer aqui:** consentimento (a pessoa marcou que quer receber), execução de contrato (mensagem sobre o pedido que ela fez) e legítimo interesse (cliente que já comprou recebendo novidade relacionada, com saída fácil). Qual vale em cada caso é conversa com quem cuida do jurídico; o que a sequência faz é deixar a origem registrada
- **Opt-in de verdade:** caixa desmarcada, texto que diz o que vai chegar e com que frequência. Caixa pré-marcada e "ao cadastrar você concorda" escondido no rodapé não seguram uma reclamação
- **Registrar:** data, origem (qual formulário, qual isca, qual conversa) e o que a pessoa aceitou. A ferramenta de envio guarda isso quando o campo existe; planilha manual precisa da coluna
- **Dado mínimo.** Nome e um canal. CPF, endereço e data de nascimento não entram numa lista de nutrição
- **Base antiga sem registro de aceite** (clientes e contatos de anos, guardados no celular ou numa planilha) recebe uma mensagem só, de repermissão: o que vai chegar, com que frequência, e um jeito de dizer sim. Entra na série quem respondeu ou clicou. Silêncio é não
- **Lista comprada ou raspada não entra em série nenhuma.** Nem no WhatsApp, nem no e-mail. Além de ilegal, a taxa de denúncia dessa base derruba a entrega da base boa
- **Direito de sair vale pra qualquer base legal.** Mesmo quem está numa série de pós-compra por execução de contrato pode pedir pra não receber o que não é sobre o pedido

---

## WhatsApp: as regras da plataforma

Duas coisas mudam a arquitetura de uma série no WhatsApp:

**O aplicativo comum não automatiza sequência.** WhatsApp Business (o app gratuito) tem
mensagem de saudação, de ausência e resposta rápida. Série com D+2 e D+7 ali é envio
manual, com lembrete em `tarefas.md`. Funciona bem até umas dezenas de contatos por
semana.

**A API oficial (WhatsApp Business Platform) automatiza, com regras.** A empresa só pode
mandar mensagem livre dentro de 24 horas depois da última mensagem do cliente. Fora dessa
janela, cada envio precisa ser um modelo aprovado pela Meta, e o modelo de marketing é
cobrado por conversa (valor por país e categoria, `[a confirmar]` na tabela da Meta na
hora do uso). Numa série de D+0, D+2, D+7, as mensagens D+2 e D+7 são modelos aprovados,
com texto fixo e variáveis. Ferramentas como ManyChat, Z-API e a própria Meta expõem isso.

Consequência prática: no WhatsApp a série é mais curta, o texto de cada mensagem passa
por aprovação e o custo por contato existe. A régua de opt-in ali é obrigatória pela
plataforma, não só pela lei.

---

## Medir e cortar

A série que ninguém mede vira ruído fixo. O que se acompanha, por mensagem, não pelo
total:

| Métrica | O que diz | Aviso |
|---|---|---|
| Entregues | quantos chegaram | queda entre uma mensagem e outra é endereço errado (bounce) ou autenticação faltando; a ferramenta mostra qual dos dois |
| Abertura | quantos abriram | métrica fraca: o Apple Mail pré-carrega imagem desde o iOS 15 (2021) e infla o número. Serve pra comparar mensagens entre si, não como valor absoluto |
| Clique ou resposta | quantos fizeram a chamada | a régua principal da série |
| Conversão | quantos fizeram o que a série pedia (comprou, agendou, respondeu o orçamento) | a única que vira dinheiro |
| Saída | quantos pediram pra sair nessa mensagem | pico numa mensagem específica aponta o texto que incomoda |
| Spam | quantos marcaram | acima de 0,3% derruba a entrega de toda a conta (régua publicada pelo Google nas diretrizes de remetente, 2024) |

**Quando decidir:** depois de dois ciclos completos ou de 50 pessoas que passaram pela
mensagem, o que vier primeiro. Antes disso é ruído.

**A regra de corte:** mensagem que não gera clique nem resposta em dois ciclos sai ou
muda de objetivo. Nunca se acrescenta mensagem pra compensar uma que não funciona. Série
boa encolhe com o tempo.

**O que comparar:** uma mensagem contra as outras da mesma série. A primeira sempre tem
o número mais alto; o que interessa é a queda de uma pra outra. Queda brusca entre a 2 e
a 3 diz que a 3 tem problema, ou que a 2 prometeu algo que a 3 não entregou.

---

## O que denuncia série de máquina

- **Todas as mensagens com a mesma estrutura:** saudação, parágrafo, botão, despedida. Gente varia: uma mensagem é uma pergunta de duas linhas, outra é uma história
- **"Olá, {nome}!"** com o campo mal preenchido ou sobrando. Melhor sem nome do que com "Olá, !"
- **Toda mensagem vende.** Numa série de sete, duas vendem. As outras ensinam, mostram bastidor, contam um caso
- **Escassez fabricada:** "últimas vagas", "só hoje" numa série que roda todo dia pra todo mundo. A pessoa que entrou em março recebe "só hoje" em março; a que entrou em maio recebe o mesmo. Quem percebe, e alguém sempre percebe, não confia em mais nada da marca
- **Assunto de suspense** ("você não vai acreditar"). Assunto que descreve o conteúdo abre menos e converte mais
- **Frases todas do mesmo tamanho, sem nada específico.** A régua está em `templates/copy/humanizacao.md`, e o comando `node scripts/verificar.js texto` mede

---

## Onde cada ferramenta guarda a série

O nome muda de ferramenta pra ferramenta e de versão pra versão; o que a série precisa
carregar é igual em todas: gatilho, atraso, condição, mensagem. Nomes `[a confirmar]` na
tela da ferramenta na hora de configurar:

| Ferramenta | Onde a série mora | Como chama o passo |
|---|---|---|
| Mailchimp | Automations, Customer Journeys | ponto de partida, atraso, e-mail |
| RD Station Marketing | Fluxos de automação | gatilho de entrada, aguardar, enviar e-mail |
| ActiveCampaign | Automations | trigger, wait, send email, condição if/else |
| Brevo | Automações (workflows) | ponto de entrada, atraso, e-mail |
| ManyChat | Flows e Sequences | mensagem, delay, condição |
| Envio manual | `tarefas.md` na seção "Esperando resposta" | um item por envio, com a data |

Em todas, o mapeamento é o mesmo: cada bloco de mensagem do arquivo do `/sequencia` vira
um passo, e a condição de saída vira a regra de "sair da automação quando".
