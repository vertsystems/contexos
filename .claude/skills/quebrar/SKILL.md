---
name: quebrar
description: >
  Pega o escopo aprovado de um sistema e quebra em entregas pequenas e testáveis: cada uma
  atravessa tela, regra e banco de ponta a ponta e termina com algo que o dono vê funcionando.
  Sai a lista na ordem certa, com o que bloqueia o quê, estimativa em faixa com o motivo do
  estouro, e a primeira entrega já detalhada pro /backend começar. Mantém a lista viva:
  entrega feita ganha data, escopo que mudou vira entrega nova.
  Use quando o usuário disser "por onde eu começo a construir", "quebra isso em partes",
  "o escopo tá aprovado, e agora", "quanto tempo leva cada parte", "o que vem primeiro",
  "o projeto tá grande demais", "o desenvolvedor pediu a lista do que fazer", "terminei
  essa parte, qual é a próxima", "o cliente pediu uma coisa nova no meio", ou /quebrar.
  Fronteira com as vizinhas: decidir o que entra e quanto custa é /escopo; escrever o código
  é /backend; a rede de testes é /testar; o pipeline do negócio é /tarefas; o sistema já no
  ar e com uso medido é /evoluir.
---

# /quebrar — Do escopo à lista de entregas

> **Convenção de pastas:** a saída vai em `sistemas/<nome>/ENTREGAS.md`, ao lado do `ESCOPO.md` que o `/escopo` gravou. Na convenção **por cliente**, `clientes/<Nome>/sistemas/<nome>/ENTREGAS.md`. A pasta já existe quando esta skill roda; se não existe, o escopo ainda não foi fechado e o caminho é o `/escopo` primeiro.

Escopo aprovado é uma lista do que vai existir. Não diz por onde começar, nem o que dá para
mostrar na sexta-feira. Quem pula direto do escopo para o código constrói o banco inteiro,
depois a API inteira, e o dono passa um mês sem ver uma tela. Quando vê, é tudo de uma vez,
com um mês de erro dentro. Esta skill faz o pedaço do meio: transforma cada item do escopo
em entregas de poucos dias, cada uma com uma cena que o dono assiste e diz "é isso", na
ordem que reduz risco antes de gerar valor. O `/backend` pega a primeira e constrói.

## Dependências

- **Escopo aprovado:** `sistemas/<nome>/ESCOPO.md` — a lista ordenada, os critérios de aceite, o teto de prazo, quem constrói e quem mantém. Sem ele a skill não começa
- **Contexto do negócio:** `_memoria/empresa.md` — quem é o time e quanto tempo por semana ele tem para isso
- **Prioridades:** `_memoria/estrategia.md` — o motivo real do teto de prazo, que decide o que fica de fora quando a soma não cabe
- **Referências** (ler a que o passo pedir, não todas):
  - `templates/software/entregas.md` — a entrega vertical fina, a prova de pronto, a faixa com o motivo do estouro, os sinais de entrega grande demais, a ordem risco antes de valor, dependência externa e como manter a lista viva
  - `templates/software/escopo.md` — seções "A fatia vertical" e "Preparado e pronto, as duas listas curtas": o portão de entrada e o de saída de cada entrega
  - `templates/software/custo.md` — seção "O que o cliente pede depois da entrega": as quatro caixas por onde passa todo pedido novo antes de virar entrega
- **Script:** `scripts/entregas.js` — confere a lista (ordem, dependência, faixa, total) e faz a conta do que falta e do que pode começar
- **Saída:** `sistemas/<nome>/ENTREGAS.md`, um por sistema, reescrito a cada mudança

---

## Workflow

### Passo 1 — Ler o escopo e descobrir o tamanho do time

Abrir `sistemas/<nome>/ESCOPO.md` e tirar de lá quatro coisas: a lista ordenada de
funcionalidades, o critério de aceite de cada uma, o teto de prazo com o motivo, e quem
constrói. Se o arquivo não existe ou não tem lista ordenada, parar e mandar para o `/escopo`.
Quebrar pedido solto em entregas é organizar o que ainda não foi decidido.

A única pergunta obrigatória desta skill, se o escopo não responder:

> "Quantos dias por semana o time dedica a esse sistema? Conta só dia de trabalho de verdade,
> não dia de calendário."

A resposta vai no topo do arquivo como dedicação, e é o que converte faixa em semana por
comando no Passo 8. Um desenvolvedor que dedica dois dias por semana leva três semanas para
cumprir "4 a 6 dias". Sem esse número, toda promessa de data sai errada.

Se já existe `ENTREGAS.md`, esta rodada é manutenção da lista, e o caminho é o Passo 10.

### Passo 2 — Escolher a bala traçante

A primeira entrega não é a mais valiosa nem a mais arriscada. É a mais fina que atravessa o
sistema inteiro: uma tela, uma regra, uma gravação no banco, publicada num endereço que o dono
abre no celular. Ela prova que a arquitetura funciona de ponta a ponta e que dá para repetir o
gesto.

Para achar, perguntar ao escopo: qual é o caminho feliz mais curto do item que está no topo da
lista? "Lançar um pedido com produto e quantidade e ver ele aparecer na lista" serve. "Cadastro
completo de pedido" não serve, porque tem desconto, observação e foto dentro.

Três condições, todas obrigatórias:

- Passa por tela, regra, banco e publicação, mesmo que cada parte seja mínima
- Não depende de ninguém de fora do time: nem chave de API, nem aprovação de loja, nem planilha que o cliente ainda vai mandar
- Cabe em poucos dias. Se a primeira estimativa passa de uma semana do time, o corte ainda não foi fino o bastante

Mostrar a cena ao dono em uma frase e pedir confirmação. É a única entrega que precisa de
"sim" antes de a lista existir, porque tudo que vem depois se apoia nela.

### Passo 3 — Quebrar cada item do escopo em entregas

Item por item, de cima para baixo na lista do escopo. Cada item vira uma ou mais entregas, e
cada entrega tem:

- **Nome** — verbo mais o que acontece: "Recusar baixa maior que o estoque", não "Validação de estoque"
- **Prova de pronto** — quem faz a ação, o que vê acontecer, onde: "Carla dá baixa de 3 unidades num produto com 2 e vê a mensagem 'estoque insuficiente: 2 disponíveis', no sistema publicado"

Os cortes que funcionam estão em `templates/software/entregas.md`, seção "Como quebrar": caminho
feliz antes do erro, um tipo de usuário por vez, um canal por vez, um dado por vez, manual antes
de automático. O último é o mais útil: marcar "pago" na mão sai na primeira semana e mostra, no
uso, se o Pix automático vale o que custa.

Sinal de que a entrega ainda está grande: o nome tem "e", a prova precisa de duas cenas, ou quem
vai construir não sabe dizer por onde começa. Quebra de novo.

Régua de tamanho da lista: passou de quinze entregas, o escopo não foi cortado, foi copiado.
Voltar ao `/escopo` com a metade de baixo e perguntar o que sai. A skill não decide isso; o
dono decide, e precisa ver a lista para decidir.

### Passo 4 — Ligar o que bloqueia o quê

Para cada entrega, listar de quais outras ela depende de verdade: precisa do dado que outra
grava, ou da tela que outra criou. "Seria bom fazer antes" não é dependência; é preferência, e
entra na ordem do Passo 6, não aqui.

O grafo é uma lista simples, na coluna "Depende de": `E1`, `E2, E3`, ou um traço. Não precisa
de desenho. Precisa de três coisas que o script confere no Passo 8:

- Toda dependência aponta para uma entrega que vem **antes** na lista
- Nenhuma entrega depende de si mesma nem forma ciclo com outra
- A primeira não depende de nada

Dependência de fora do time (chave do banco, aprovação da loja, exportação do sistema antigo)
não entra nessa coluna. Entra no estado, como `esperando chave do Mercado Pago desde 2026-09-12`:
o quê e desde quando, na mesma célula. E o pedido ao terceiro se faz hoje, mesmo que a entrega
seja daqui a três semanas. Quando a espera passa de duas semanas, a entrega desce na lista e
outra sobe; plano parado esperando terceiro é plano que ninguém está tocando.

### Passo 5 — Estimar em faixa, com o que faz estourar

Quem estima é quem constrói, não o dono e não esta skill. Se o usuário contrata um
desenvolvedor, a faixa de cada entrega fica `[a confirmar]` até ele responder, e o script aceita
isso como pendência: avisa, deixa a entrega fora da soma e diz que a conta é parcial. O que não
se faz é preencher a faixa com um número plausível para a lista parecer completa. Se o usuário
é quem constrói, a pergunta é por entrega, uma de cada vez:

> "E3, recusar baixa maior que o estoque: se tudo der certo, quantos dias? E o que pode fazer
> passar disso?"

O que sai são três coisas por entrega: o piso, o teto e o motivo do teto. Número único não
passa. "Três dias" é chute com cara de precisão, e vira cobrança na segunda semana. "2 a 3
dias, estoura se a impressora da cozinha exigir formato próprio" é estimativa.

Duas réguas, as duas conferidas por comando:

- **Teto acima de uma semana do time** (o número de dedicação do Passo 1): a entrega não é uma, e volta para o Passo 3
- **Teto acima do triplo do piso**: ninguém entendeu a entrega. Antes de estimar de novo, gastar meio dia descobrindo o que não se sabe. A faixa encolhe sozinha

Se já existe histórico de entregas feitas com data neste ou noutro sistema, comparar a faixa
prometida com o que levou. É a única fonte de estimativa que melhora com o tempo.

### Passo 6 — Ordenar: risco antes de valor

A lista do escopo está ordenada por valor, porque foi assim que o dono escolheu. A lista de
entregas reordena por risco primeiro, e o motivo é aritmético: descobrir na primeira semana que
a integração não funciona custa a primeira semana. Descobrir na quinta custa as cinco.

Risco é o que ninguém sabe se funciona: integração nunca feita, aparelho nunca testado, regra
que só o dono conhece, dado real que ninguém abriu. Cruzar com valor:

| | Reduz muito risco | Reduz pouco risco |
|---|---|---|
| **Gera muito valor** | Primeiro | Segundo |
| **Gera pouco valor** | Terceiro, cedo o bastante para não derrubar o plano | Por último, ou nunca |

Empate dentro da mesma célula se resolve pela dependência (o que destrava mais vem antes) e
depois pelo tamanho (menor vem antes). A bala traçante fica em E1 independentemente da matriz.

Depois de ordenar, somar as faixas e comparar com o teto de prazo do escopo, na dedicação do
time. Se a soma não cabe, a lista encolhe por baixo, e quem corta é o dono: mostrar a linha
onde o teto acaba e perguntar o que sai. O teto não se negocia; a lista, sim. O que ficou
abaixo da linha vai para a seção "Fora desta rodada", com o motivo em meia linha.

### Passo 7 — Escrever o arquivo

```markdown
# Entregas — <nome do sistema>

> **Escopo de origem:** `ESCOPO.md`, versão de AAAA-MM-DD
> **Time:** <quem constrói>, <quem testa no uso real>
> **Dedicação:** N dias por semana
> **Atualizado em:** AAAA-MM-DD

## O sistema em uma frase
[a frase do escopo, sem tela, campo nem botão]

## Lista, na ordem

| # | Entrega | Prova de pronto | Depende de | Faixa (dias) | Estoura se | Estado |
|---|---|---|---|---|---|---|
| E1 | <verbo + o que> | <quem faz, o que vê, onde> | — | 2 a 3 | <o motivo do teto> | a fazer |
| E2 | ... | ... | E1 | 1 a 2 | ... | a fazer |
| Soma | | | | <soma dos pisos> a <soma dos tetos> | | |

Falta: <dias> de trabalho, <semanas> na dedicação atual. Teto do escopo: <data e motivo>.

## E1 — <nome> (detalhada)

### Por que primeiro
### O caminho de ponta a ponta
tela → regra → banco → publicado em <onde>
### Critério de pronto
| Entrada | Resultado esperado |
|---|---|
### O que fica de fora desta entrega
### Estoura se

## Fora desta rodada
- <item do escopo que não coube no teto> — <motivo em meia linha>

## Mudanças
- AAAA-MM-DD — <o que aconteceu, e qual entrega nasceu, mudou ou caiu>
```

Estados aceitos na coluna: `a fazer`, `em andamento`, `feita AAAA-MM-DD`,
`esperando <o quê> desde AAAA-MM-DD`, `cancelada`. Nada além desses, senão o script não lê
("pronto", "ok" e "concluída" são recusados com o número da linha). Faixa é `N a M` ou
`[a confirmar]`; número único não entra. A última linha da tabela se chama `Soma`, e os dois
scripts a leem como o total declarado: o `entregas.js` confere piso e teto contra as faixas, e
o `verificar.js tabela` confere a coluna inteira como faz com qualquer orçamento. "Mudanças" é
lista, não tabela, para nenhum script tentar somá-la. Coluna "Estoura se" vazia é erro em
entrega aberta; em entrega feita, o script deixa passar e a lição vai para "Mudanças".

Prova de pronto usa gente do time pelo nome e dado de exemplo. Nunca CPF, telefone ou nome de
cliente real do negócio: o arquivo circula, vai para o desenvolvedor, às vezes para a proposta.

### Passo 8 — Conferir por comando

Nada aqui se confere lendo. A ordem parece certa até o script achar a entrega que depende de
outra que vem depois dela.

```bash
# ordem, dependência, ciclo, faixa, motivo do estouro, teto por entrega, linha Soma, e a conta do que falta
node scripts/entregas.js sistemas/<nome>/ENTREGAS.md

# a soma dos pisos bate com a linha Soma (cruzamento independente)
node scripts/verificar.js tabela sistemas/<nome>/ENTREGAS.md

# se o arquivo cita dia da semana junto com data
node scripts/verificar.js datas sistemas/<nome>/ENTREGAS.md

# o texto que vai pro desenvolvedor e pro dono não pode soar de máquina
node scripts/verificar.js texto sistemas/<nome>/ENTREGAS.md
```

O `entregas.js` termina em "Tudo certo." ou lista o que está errado, com o número da entrega.
Se acusar, corrigir a lista, nunca o número: faixa que estourou o teto se quebra em duas, não
se reduz para caber. E a linha "Falta:" do arquivo é copiada da saída do script, não escrita
de cabeça.

O `tabela` lê a primeira coluna numérica como soma de orçamento e ignora o resto: na tabela de
entregas ele confere só os pisos contra a linha Soma, e é isso que se espera dele. Se ele
acusar uma soma que não existe, a causa quase sempre é a palavra "total" solta num parágrafo
perto de uma tabela; trocar por "soma" resolve.

### Passo 9 — Detalhar a primeira e passar a bola

Só a E1 recebe a seção detalhada antes de começar. Detalhar a E7 hoje é análise que envelhece
antes de virar código. As outras ganham o detalhe na semana em que entram.

O detalhe da E1 tem cinco partes, todas curtas: por que ela vem primeiro; o caminho de ponta a
ponta com cada camada nomeada (a tela, a regra, a tabela, o endereço publicado); o critério de
pronto copiado do `ESCOPO.md` como tabela de entrada e resultado, com um cenário de sucesso e
um de erro; o que fica de fora desta entrega e vai para qual outra; e o que faz a faixa estourar.

Com o arquivo conferido, o que o dono recebe na conversa é isto, e não mais que isto:

```
✓ sistemas/<nome>/ENTREGAS.md
   · [N] entregas a partir de [N] itens do escopo, [N] fora desta rodada
   · Soma: [piso] a [teto] dias, ou [N] a [N] semanas a [N] dias por semana (copiado do script)
   · Teto do escopo: [data], [motivo]. Cabe / não cabe: [o que ficou abaixo da linha]
   · E1: [nome], [faixa], estoura se [motivo]. Detalhada e pronta para o /backend
   · Esperando fora do time: [entrega, o quê, desde quando], ou "nada"
   · Faixas [a confirmar]: [quais, e quem vai responder], ou "nenhuma"
```

A passagem é uma linha: o `/backend` abre `ENTREGAS.md`, constrói a E1 e volta aqui quando ela
estiver publicada. O `/testar` entra quando houver dinheiro, cadastro ou permissão em jogo, e a
rede dele cobre a entrega que está no ar, não a que está planejada.

### Passo 10 — Manter a lista viva

A lista morre no dia em que deixa de refletir o que aconteceu. Três situações voltam aqui:

**"Terminei a E2."** Confirmar a prova de pronto, no sistema publicado, não na máquina de quem
construiu. Marcar `feita AAAA-MM-DD`, com a data real. Rodar
`node scripts/entregas.js sistemas/<nome>/ENTREGAS.md --proxima` e entregar a próxima livre,
já com a seção detalhada escrita. Se a faixa estourou, anotar em "Mudanças" quanto levou e por
quê: é o único histórico que melhora a próxima estimativa.

**"O cliente pediu uma coisa nova no meio."** Passar pelas quatro caixas de
`templates/software/custo.md`: problema, melhoria, alteração ou funcionalidade nova. Problema
entra sem conversa, como entrega nova. As outras três viram entrega nova **depois** de acordadas,
com prova de pronto, faixa e posição na ordem. Nunca esticar a entrega em andamento "porque é só
um campo": é assim que "2 a 3 dias" vira oito sem ninguém decidir nada. Toda mudança ganha uma
linha na lista "Mudanças".

**"Esse item não faz mais sentido."** Marcar `cancelada`, com a faixa e o "Estoura se" trocados
por um traço, e o motivo em "Mudanças". A linha fica na lista. Apagar a linha apaga a decisão, e daqui a três meses
alguém pergunta de novo.

Depois de qualquer uma das três, rodar o script de novo e reescrever a linha "Falta:". A lista
que o dono lê precisa bater com a que o script conferiu.

---

## Regras

- **Nenhuma entrega maior que uma semana de trabalho do time real.** O teto de cada faixa é o número de dedicação do topo do arquivo, e o script recusa o que passa. Entrega grande se quebra, não se comprime
- **A primeira entrega é sempre a bala traçante:** o caminho feliz mais fino que atravessa tela, regra, banco e publicação, sem depender de ninguém de fora. Nem a mais valiosa, nem a mais arriscada
- **Estimativa é faixa, e vem com o que a faz estourar.** Número único não entra na tabela. Faixa sem motivo do teto é número único com margem escondida
- **Quem estima é quem constrói.** Se o usuário contrata um desenvolvedor, a skill monta a lista e as provas de pronto, e as faixas ficam `[a confirmar]` até ele responder. O script aceita a pendência e marca a soma como parcial; o que ele não aceita é entrega em andamento sem faixa
- **Risco antes de valor.** A ordem do escopo é a ordem do desejo; a ordem das entregas é a que descobre o problema mais cedo. Dizer isso ao dono uma vez, e mostrar a matriz
- **Toda dependência aponta para trás.** Entrega que depende de outra que vem depois é erro de ordem, e o script acusa. Dependência de terceiro vira estado `esperando <o quê> desde AAAA-MM-DD`, nunca a primeira entrega, e o script acusa as duas coisas
- **Escopo que mudou vira entrega nova.** Nunca se estica a entrega existente, e todo pedido novo passa pelas quatro caixas do `templates/software/custo.md` antes de entrar
- **Entrega feita ganha data.** "feita" sem data não ensina nada; com data, a próxima estimativa sai melhor
- **Rodar `node scripts/entregas.js` antes de mostrar a lista.** Sempre. A linha "Falta:" do arquivo é copiada da saída do script, e a coluna "Estoura se" nunca fica vazia em entrega aberta
- **A lista cabe no teto do escopo, ou é cortada por baixo pelo dono.** Esta skill não muda o teto e não decide o que sai; mostra onde a linha cai e pergunta
- **Fronteira:** decidir o que entra e quanto custa é `/escopo`; construir cada entrega é `/backend`; a rede de testes do que está no ar é `/testar`; `tarefas.md` é o pipeline do negócio, e a lista de entregas não é duplicada lá (no máximo uma linha apontando para a entrega em andamento, via `/tarefas`); o que fazer com o sistema no ar e o uso medido é `/evoluir`
- **Dado sensível:** prova de pronto e critério de aceite usam dado de exemplo e gente do time. CPF, telefone e nome de cliente real do negócio não entram no arquivo, que circula fora da empresa (LGPD)
- Quando a lista sair maior que o teto de prazo comporta, dizer isso com o número. Suavizar a conta pra caber é o mesmo erro de prometer prazo
