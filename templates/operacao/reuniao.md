# Reunião — o que vira ata e o que não vira

Referência do `/reuniao`. Consultada também pelo `/tarefas` quando o item nasce de uma
conversa, e pelo `/proposta` e pelo `/contrato` quando o pedido do cliente foi feito em voz.

Numa reunião de uma hora, o que de fato foi decidido cabe em poucas linhas. O resto é
conversa que pareceu decisão na hora e não era: "acho que dá", "vamos ver", "depois eu
confirmo". A ata existe pra separar as duas coisas. Quem lê uma semana depois precisa
saber, sem reabrir a gravação: o que ficou combinado, quem faz, até quando, e o que ficou
no ar.

---

## Os quatro baldes

Tudo que foi dito cai em um destes, e só em um:

| Balde | O que é | Teste rápido | Vai pra onde |
|---|---|---|---|
| **Decisão** | Algo que passou a valer a partir da reunião | Alguém fechou de fato, e ninguém contestou depois | Ata, seção "Decisões" |
| **Tarefa** | Ação com dono e prazo | Dá pra escrever "Fulano faz X até dia Y" sem inventar nada | `tarefas.md` |
| **Pendência** | Coisa que ficou sem resposta ou sem dono | Alguém perguntou e ninguém respondeu, ou a resposta foi "vamos ver" | Ata, seção "Pendências", com quem destrava |
| **Contexto** | Informação que ajuda a entender, mas não pede ação | Número dito de passagem, histórico, opinião | Ata, uma linha, ou nada |

O erro mais comum é promover pendência a decisão. "Acho que dá pra fazer até o fim do
mês" é pendência: não tem dono firme nem data firme. Virou decisão quando alguém disse
"então fica pro dia 30, o Bruno entrega" e o outro lado aceitou.

---

## O que conta como decisão

Sinais de que fechou:

- Verbo no fechado: "fechado", "combinado", "pode fazer", "vamos por esse", "aprovado", "tá certo então"
- Alguém repetiu o combinado em voz alta e o outro confirmou
- Preço, prazo ou escopo foi dito com número e o outro lado não questionou
- O cliente disse "manda a proposta com isso" ou "pode mandar o contrato"

Sinais de que **não** fechou, por mais que tenha parecido:

- "Acho que", "talvez", "a gente vê", "depois eu confirmo", "deixa eu falar com o sócio"
- Silêncio depois de uma proposta. Silêncio não é sim
- Duas pessoas concordando com coisas diferentes ("sim, até sexta" / "sim, semana que vem")
- Decisão tomada e revertida dez minutos depois. Vale a última
- "Vamos pensar nisso" e o assunto não voltou

Na dúvida, é pendência. A ata que registra decisão a mais causa briga; a que registra
pendência a mais causa uma pergunta. Prefira a pergunta.

---

## Como escrever cada linha

**Decisão**: o quê, quem decidiu (quando importa), e a condição, se tiver.

> Site vai ter três páginas (início, serviços, contato), sem blog nesta fase. Decidido
> pela Carla. Blog entra se o orçamento de tráfego for aprovado em outubro.

**Tarefa**: dono, verbo, objeto, data absoluta com dia da semana.

> Bruno envia a proposta revisada até qua 30/09/2026.

**Pendência**: a pergunta, quem tem a resposta, e o que ela destrava.

> Falta saber se o domínio atual fica ou muda. Quem sabe: Carla, com o contador. Trava a
> configuração do e-mail.

**Contexto**: uma linha, sem adjetivo.

> A loja fatura em média R$ 40 mil/mês; 70% vem do WhatsApp (dito pela Carla, min 12).

O que não entra em linha nenhuma: quem falou mais, quem se irritou, o que foi dito de
brincadeira, e qualquer avaliação sobre as pessoas. Ata não é diário.

---

## Prazo relativo vira data

"Semana que vem", "daqui a dez dias", "até o fim do mês", "na próxima sexta": tudo isso
se converte na hora, a partir da data da reunião, não da data em que a ata é escrita. Se a
reunião foi na sexta 18/09/2026 e o combinado foi "daqui a dez dias", o prazo é seg
28/09/2026. Escrever a data com o dia da semana e passar `node scripts/verificar.js datas`
no arquivo, porque dia de semana contado de cabeça sai errado com frequência.

Prazo que ninguém disse não se inventa. Fica `[prazo a confirmar com Fulano]`, e a tarefa
entra em `tarefas.md` sem data até isso se resolver.

---

## Tipos de reunião e o que cada uma pede

| Tipo | O que a ata precisa ter | Armadilha |
|---|---|---|
| **Primeira conversa com cliente** | Problema na palavra dele, o que ele já tentou, orçamento e prazo se foram ditos, e o que ele pediu pra receber | Tratar interesse como fechamento. Quase sempre o que sai daqui é `/proposta`, não `/contrato` |
| **Alinhamento de projeto em andamento** | O que mudou desde a última, o que atrasou e por quê, e o que muda no combinado | Mudança de escopo dita em voz e não escrita. Se o cliente pediu algo fora do contrato, a ata registra e aponta pro aditivo |
| **Entrega ou aprovação** | O que foi aprovado como está, o que volta com ajuste, quantas rodadas restam | "Ficou lindo, só muda tudo". Listar cada ajuste como item |
| **Interna (equipe ou sócio)** | Decisão e dono. Menos contexto, mais ação | Reunião que termina sem uma decisão sequer. Registrar isso também: "nada decidido; volta dia X" |
| **Fornecedor ou parceiro** | O que cada lado entrega, valor, prazo, o que acontece se atrasar | Combinado só verbal. Tudo que envolve dinheiro pede confirmação escrita |

---

## Transcrição automática: onde ela erra

A transcrição vinda de API (ou do próprio Meet, Zoom, Teams) é boa no texto corrido e
ruim em quatro coisas. Conferir antes de citar:

- **Nome próprio**: "Dunamis" vira "do namis", "Vert" vira "verde". Passar os nomes na
  opção `--dica` do script ajuda; ainda assim, conferir
- **Número**: "quinze" e "cinquenta" se confundem, "dois mil e quinhentos" pode sair
  "2.500" ou "dois 500". Valor e prazo se confirmam na gravação ou com quem falou
- **Quem falou**: sem separação de voz, duas falas viram uma. Se a decisão depende de
  saber quem disse, e a transcrição não deixa claro, é pendência
- **Fala sobreposta e trecho inaudível**: aparece como `[inaudível]` ou some. Se sumiu
  justamente o trecho da decisão, a ata diz isso em vez de preencher

Anotação de reunião (feita à mão durante a conversa) tem o problema inverso: é
seletiva. Quem anota escreve o que achou importante na hora. A ata feita de anotação
precisa dizer que veio de anotação, porque o que não foi anotado não existe pra ela.

---

## Confidencialidade

Gravação e transcrição são dado pessoal de quem participou, e reunião com cliente carrega
número, estratégia e às vezes problema interno dele.

- Gravação e transcrição ficam em `dados/`, que o git ignora, e não vão pra outra skill
  sem propósito: o `/reaproveitar` só entra com autorização explícita, e nunca em reunião
  com cliente. A ata, em `reunioes/`, é o que se versiona
- Enviar o áudio pra API de transcrição é decisão do usuário, tomada com ele sabendo que o
  arquivo sai da máquina. A skill avisa antes; o script não pergunta de novo
- A ata que vai pro cliente é outra versão: só o combinado com ele. Comentário interno,
  margem, e o que se decidiu sobre a conta ficam na versão interna
- Se alguém na reunião pediu pra não registrar algo, não se registra. Vale mais que a
  completude da ata
- Gravar reunião sem avisar os participantes é problema legal antes de ser problema de
  ata. Se o usuário não avisou, dizer isso uma vez

---

## Antes de enviar a ata pro cliente

Checklist curto, na ordem:

1. Cada decisão tem alguém que a tomou ou aceitou, e ela apareceu na transcrição (minuto
   anotado)
2. Cada tarefa do cliente tem data absoluta e ele sabe que é dele
3. Nenhuma pendência está escrita como decisão
4. Valor e prazo dito em voz foram conferidos com a gravação, não só com a transcrição
5. A versão que vai pra ele não tem comentário interno
6. `node scripts/verificar.js datas` passou no arquivo

Ata que chega no mesmo dia da reunião é lida. A que chega na semana seguinte vira
discussão sobre o que foi dito. O prazo interno é: ata no mesmo dia, sempre.
