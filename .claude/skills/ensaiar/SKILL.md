---
name: ensaiar
description: >
  Treina a conversa de venda ou de cobrança que vai acontecer amanhã: o assistente faz o
  cliente sem facilitar, em 5 a 8 trocas, com o roteiro do /vender e as objeções do público
  como base. O usuário pode pedir "pausa" pra receber uma dica. No fim, um script mede a
  transcrição (implicação feita vs prevista, proporção de fala, preço antes do problema, cada
  concessão contra o piso da oferta) e entrega três frases pra levar pra conversa real.
  Use quando o usuário disser "finge que é meu cliente", "ensaia comigo", "tenho reunião de
  venda amanhã", "quero treinar antes de ligar", "me testa nas objeções", "sempre travo
  quando falam que tá caro", "simula a conversa", "preciso cobrar um cliente e não sei como
  começar", "toda vez que eu falo o preço a pessoa desaparece", "quero ver onde eu erro na
  venda", ou /ensaiar.
---

# /ensaiar — Treino antes da conversa real

> **Convenção de pastas:** a saída vai em `vendas/ensaios/<AAAA-MM-DD>-<slug>.md`, com o plano ao lado em `vendas/ensaios/<AAAA-MM-DD>-<slug>.plano.json`. Na convenção **por cliente**, `clientes/<Nome>/vendas/ensaios/`. A pasta nasce no primeiro ensaio.

Quem vende sozinho nunca vê a própria conversa de fora. Sai da reunião com a sensação de que
foi bem, o cliente responde "vou pensar", e o motivo real fica invisível: o preço saiu na
terceira frase, o dono falou setenta por cento do tempo, e os dez por cento de desconto foram
dados num silêncio incômodo, sem pedir nada de volta. Nenhuma dessas três coisas dói na hora.
Todas as três aparecem quando alguém conta.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que se vende, como o cliente costuma chegar, qual o canal
- **Tom:** `_memoria/preferencias.md` — o cliente do ensaio responde no registro do público dele, não no do sistema
- **Público e objeções:** `_memoria/publico.md` (`/publico`) — **insumo obrigatório**. É de lá que sai o jeito de o cliente resistir. Sem esse arquivo, o ensaio vira improviso
- **Oferta e piso:** `_memoria/oferta.md` (`/oferta`) — preço, garantia, o que não está incluído, e o piso de negociação contra o qual cada concessão é conferida
- **Roteiro de venda:** `vendas/roteiro-<contexto>-<AAAA-MM-DD>.md` (`/vender`) — **insumo obrigatório no cenário de venda**. As perguntas de implicação previstas saem de lá
- **Régua de cobrança:** `financeiro/cobranca-<AAAA-MM>.md` (`/cobranca`) e o contrato em `contratos/` (`/contrato`) — no cenário de cobrança, é o que define valor, prazo e o que a lei permite
- **Prova:** `biblioteca.md` (`/biblioteca`) — case e depoimento que o usuário pode usar na hora
- **Método:** `templates/crescimento/ensaio.md` — papel do agente, escala de resistência, arquétipos, a regra da troca, o que cada medida significa e o que ela não mede
- **Script:** `scripts/ensaiar.js` — `medir` (as quatro medidas na transcrição), `plano` (puxa as implicações previstas do roteiro do `/vender`), `molde` (formato do plano e da transcrição)
- **Conferência:** `node scripts/verificar.js texto` no arquivo final
- **Saída:** `vendas/ensaios/<AAAA-MM-DD>-<slug>.md` com a transcrição, o relatório medido e as três frases; objeção nova volta pra `_memoria/publico.md`

---

## Workflow

### Passo 1 — Descobrir qual conversa é, e carregar a base

Uma pergunta por vez. A primeira:

> "Qual conversa é, e quando ela acontece?"

Depois da resposta, classificar em um dos dois cenários e ler o que existe:

| Cenário | O que ler antes de qualquer coisa |
|---|---|
| **Venda** | `vendas/roteiro-*.md` do cliente ou do segmento, `_memoria/publico.md`, `_memoria/oferta.md` |
| **Cobrança** | o contrato em `contratos/`, `financeiro/cobranca-<AAAA-MM>.md`, `_memoria/publico.md` |

Se o pedido for outra conversa (demitir alguém, negociar com fornecedor, acertar com sócio),
dizer em uma linha que o sistema não tem memória pra ancorar aquele outro lado, e oferecer o
que tem: `/pessoa` pra conversa com a equipe, `/socios` pra acordo entre sócios. Não ensaiar
no escuro.

**Se não existe roteiro e o cenário é venda:** oferecer o `/vender` uma vez. Se o usuário
preferir seguir sem, avisar que a medida de implicação vai ficar vazia (não há pergunta
prevista pra comparar) e seguir.

Depois, a segunda pergunta:

> "Quem é essa pessoa, e o que você já sabe do problema dela?"

### Passo 2 — Fechar o plano do ensaio

O plano é o que torna o relatório mensurável. Ele é um JSON ao lado do ensaio, e nasce em
duas partes.

**Parte 1, as implicações previstas.** Sair do roteiro por comando, não de leitura:

```bash
node scripts/ensaiar.js plano vendas/roteiro-<contexto>-<AAAA-MM-DD>.md \
  vendas/ensaios/<AAAA-MM-DD>-<slug>.plano.json
```

O comando acha a pergunta de duas formas: debaixo de um título que fala de implicação, e em
linha com rótulo, do tipo `- **Implicação:** "quanto isso te custa por mês?"`. Mostrar ao
usuário o que ele achou e confirmar. Se ele não tem roteiro, perguntar direto: "Quais são as
3 a 5 perguntas que você preparou pra ele perceber o tamanho do problema?" e escrever no JSON
na íntegra, como ele falou.

O JSON sai com o piso **em branco**, de propósito: `"limite": null` nos três limites e
`"nunca": []`. Piso de exemplo salvo por engano faria o relatório medir contra número
inventado, e número inventado apresentado como medida é o pior defeito que este comando pode
ter. Quem preenche é a Parte 2.

**Parte 2, o piso.** Uma mensagem só, porque são quatro números que ele já sabe:

> 1. "Qual o desconto máximo que você pode dar sem ficar no prejuízo?"
> 2. "Qual o prazo de pagamento mais longo que você aceita?"
> 3. "Qual o prazo de entrega mais curto que você consegue cumprir de verdade?"
> 4. "O que você nunca vai aceitar nessa conversa, nem pra fechar?"

No cenário de cobrança, as quatro viram: desconto máximo na multa e nos juros, em quantas
parcelas dá pra dividir o atrasado, o que precisa acontecer pra parcelar, e o que nunca
(perdoar tudo, liberar serviço novo com parcela aberta).

Cada resposta cai num lugar do JSON, e a `direcao` importa: desconto e prazo de pagamento
rompem **passando** do número, prazo de entrega rompe **ficando abaixo** dele.

| Resposta | Onde vai | `direcao` |
|---|---|---|
| Desconto máximo | `limites`, `o_que: "desconto"`, unidade `%` (ou `reais`, se ele responder em reais) | `maximo` |
| Prazo de pagamento mais longo | `limites`, `o_que: "prazo de pagamento"`, unidade `dias` | `maximo` |
| Prazo de entrega mais curto | `limites`, `o_que: "prazo de entrega"`, unidade `dias` | `minimo` |
| O que nunca | `nunca`, em texto, uma frase por item | — |

Na cobrança os `o_que` mudam de nome: `perdão de juros` em `%` com direção `maximo`,
`parcelar o atrasado` em `parcelas` com direção `maximo`, e a lista `nunca` recebe "perdoar
tudo" e "liberar serviço novo com parcela aberta".

A unidade não é enfeite: o comando só compara número com número da mesma unidade. Piso em `%`
contra concessão em reais vira aviso pra conferir à mão, nunca regra rompida.

Se `_memoria/oferta.md` já tem o piso escrito, ler de lá e pedir só confirmação. Se ainda não
tem, oferecer no fim do ensaio pra registrar lá, e aí ele vale pra todas as próximas conversas.

O JSON final tem esta forma (o molde completo sai de `node scripts/ensaiar.js molde`):

```json
{
  "cenario": "venda",
  "cliente": "Padaria São João",
  "conferido_em": "2026-09-22",
  "implicacao_previstas": ["Isso já te custou quanto em cliente que não voltou?"],
  "piso": {
    "limites": [
      { "o_que": "desconto", "limite": 10, "unidade": "%", "direcao": "maximo" },
      { "o_que": "prazo de pagamento", "limite": 30, "unidade": "dias", "direcao": "maximo" },
      { "o_que": "prazo de entrega", "limite": 15, "unidade": "dias", "direcao": "minimo" }
    ],
    "nunca": ["escopo extra sem custo", "serviço novo com parcela aberta"]
  }
}
```

Nome do cliente no JSON: perguntar antes se pode usar o nome real ou se ele prefere um
apelido. O arquivo fica no computador dele, mas o hábito de pedir é o que evita dado de
terceiro registrado sem necessidade.

### Passo 3 — Combinar as regras do jogo

Antes de começar, uma mensagem só, pra ele saber onde está pisando:

> "Vou ser o seu cliente, e não vou facilitar. Mando uma fala por vez, curta. São de 5 a 8
> trocas. Você pode escrever **pausa** a qualquer momento pra eu sair do personagem e te dar
> uma dica. Quando você ceder alguma coisa (desconto, prazo, um extra), eu anoto. Nível de
> resistência: **normal**. Quer mais difícil?"

Escala de resistência em `templates/crescimento/ensaio.md`: receptivo, normal, difícil,
hostil. Padrão é **normal** na primeira vez e **difícil** quando já houve ensaio anterior na
pasta. Subir o nível sem o usuário pedir é sabotagem, não treino.

Escolher um arquétipo de resistência da tabela do molde (o comparador, o que não decide, o
satisfeito, o educado que some, o que quer de graça; na cobrança: o que promete, o que
contesta, o sumido, o que chora o desconto). Não revelar qual antes do fim.

### Passo 4 — Rodar o ensaio

Entrar no personagem e ficar nele. As regras de atuação valem todas, sem exceção:

- **Uma fala por vez, curta.** Uma ou duas frases, como gente escreve no WhatsApp
- **Não entregar o que ele não perguntou.** O custo do problema só sai se ele perguntar
- **Pelo menos duas objeções**, e uma delas tirada de `_memoria/publico.md`, na palavra que
  está lá
- **Não mudar de posição por argumento bonito.** Mudar quando a pergunta obriga a pensar, ou
  quando recebe algo concreto em troca
- **Não fechar antes da quinta troca.** Fechar rápido é o jeito mais eficiente de não ensinar nada
- **Sair do personagem só em "pausa"**, e voltar na fala seguinte

Formato da transcrição, uma linha por fala, porque é o que o script lê depois:

```markdown
**Você:** Como funciona hoje o controle da produção?
**Cliente:** A gente anota num caderno e no fim do dia soma.
**Pausa:** pediu dica — sugerido puxar a implicação antes de falar de plano
**Concessão:** desconto de 8% na mensalidade — em troca: pagamento anual adiantado
**Objeção nova:** "meu contador disse que não vale a pena"
```

Na cobrança vale escrever `**Devedor:**` no lugar de `**Cliente:**`: o comando conta os dois
como a fala do outro lado. Três linhas de marcação, e cada uma existe por um motivo:

- **Pausa:** registra onde ele travou. Muitas pausas no mesmo ponto da conversa acusa roteiro
  furado, não pessoa despreparada
- **Concessão:** vale uma por cada vez que ele cedeu preço, prazo, entrega ou escopo. A parte
  depois de "em troca:" é o que ele conseguiu. Se não conseguiu nada, escrever `nada`, sem
  suavizar
- **Objeção nova:** objeção que não estava em `_memoria/publico.md`, na palavra do cliente

Na pausa, dar a dica mais curta que resolve, nessa ordem de preferência: devolver a pergunta
("o que você ainda não sabe do problema dele?"), apontar a fase ("você está demonstrando e
ele não declarou necessidade"), e só então entregar uma frase pronta, uma só.

### Passo 5 — Salvar a transcrição antes de opinar

Escrever o arquivo com a transcrição fiel, sem editar as falas do usuário pra ficarem
melhores. Depois disso, e só depois, medir.

Duas exigências de formato, porque é delas que o comando depende:

- A transcrição fica debaixo de um título `## Transcrição`, e o relatório vem **depois** dele.
  O comando lê só essa seção; sem o título ele lê o arquivo inteiro, e a prosa do relatório
  entra na conta de palavras
- Uma fala por linha, com o rótulo em negrito no começo. Fala que continua na linha seguinte
  sem rótulo é colada na anterior, o que é o comportamento certo pra texto colado do WhatsApp

### Passo 6 — Medir por comando

O relatório não se escreve de memória. As quatro contagens saem daqui:

```bash
node scripts/ensaiar.js medir vendas/ensaios/<AAAA-MM-DD>-<slug>.md
```

O comando lê o plano ao lado sozinho (ou o que vier em `--plano`) e devolve as quatro
medidas. Com `--json` sai a mesma coisa em JSON, e o código de saída é o mesmo.

| Medida | O que ela responde | Régua |
|---|---|---|
| **Implicação** | Quantas das perguntas previstas sobreviveram ao nervosismo | Todas. Sair uma de cinco é o normal da primeira vez |
| **Proporção de fala** | Quem falou mais, em palavras | 30% a 50% pra quem vende ou cobra |
| **Preço antes do problema** | Quantas vezes preço, desconto ou parcela apareceu antes do cliente admitir a dificuldade | Zero na venda; aviso na cobrança |
| **Concessões** | Cada concessão contra o piso: teve troca, passou do limite, está na lista "nunca" | Nenhuma rompida |

Ele sai com código 1 quando há regra dura rompida (concessão fora do piso, concessão sem
troca, promessa da lista "nunca", preço antes do problema na venda). Nesse caso o relatório
abre pela regra rompida, não pelo elogio.

Na cobrança, preço antes do problema desce a aviso e não derruba o código: quem cobra precisa
dizer valor, data e forma na primeira frase, e cobrar isso como erro ensinaria o contrário.
Se o piso estiver em branco, o comando avisa que só consegue apontar concessão sem troca —
aprovar por omissão seria pior que não medir.

Se o comando divergir do que a leitura sugeria, vale o comando. A única exceção é falso
positivo de léxico, e aí a linha apontada está impressa na saída: conferir ali, e explicar a
divergência no arquivo em vez de apagar o número.

### Passo 7 — Escrever o ensaio

```markdown
# Ensaio — <venda|cobrança> — <cliente> — <AAAA-MM-DD>

**Cenário:** <o que ia acontecer amanhã, em uma linha>
**Nível de resistência:** <receptivo|normal|difícil|hostil>
**Arquétipo do cliente:** <qual foi, e o que ele testava>

## Transcrição

**Você:** ...
**Cliente:** ...
**Pausa:** ...
**Concessão:** ... — em troca: ...
**Objeção nova:** "..."

## Relatório

### O que a conta mostrou
| Medida | Resultado | Régua |
|---|---|---|
| Perguntas de implicação | X de Y previstas | todas |
| Proporção de fala | XX% você / XX% cliente | 30% a 50% |
| Preço antes do problema | X menções | zero |
| Concessões fora do piso | X de Y | nenhuma |

### Onde você cedeu sem ganhar nada
[cada concessão sem troca, com a linha da transcrição e o que dava pra pedir]

### Onde a conversa virou
[a troca exata em que o cliente mudou de posição, ou a troca em que ela travou]

### O que segurou bem
[o que funcionou, nomeado. Sem isso o ensaio só desanima]

## As três frases pra levar
1. **Pergunta:** "..."
2. **Resposta pra objeção que te travou:** "..."
3. **Fechamento com data:** "..."

## O que vai pro sistema
- Objeção nova → `_memoria/publico.md`
- Piso confirmado ou corrigido → `_memoria/oferta.md`
- Pergunta de implicação que funcionou → `vendas/roteiro-*.md`
- A conversa real, com data → `tarefas.md`
```

Conferir o texto antes de entregar:

```bash
node scripts/verificar.js texto vendas/ensaios/<AAAA-MM-DD>-<slug>.md
```

### Passo 8 — Fechar o ciclo

Três coisas, nessa ordem:

1. **Objeção nova vai pra `_memoria/publico.md`**, na seção de objeções, com a resposta que
   funcionou (ou `[a confirmar]` se nenhuma funcionou). Mostrar a linha antes de salvar
2. **Piso vai pra `_memoria/oferta.md`**, se ainda não estava lá. É o que faz o próximo
   ensaio e a próxima conversa real terem limite escrito
3. **A conversa real entra em `tarefas.md`** com data. Ensaio sem conversa marcada é treino
   pra nada

E oferecer o segundo ensaio um nível acima, se ele passou. Duas rodadas no mesmo dia valem
mais que uma rodada perfeita, porque o que muda comportamento é a segunda tentativa.

---

## Regras

- **Não facilitar.** Cliente que concorda, elogia e fecha na terceira troca não treina nada. Se o usuário reclamar da dificuldade, oferecer baixar o nível de forma explícita, nunca em silêncio
- **Nunca escrever o relatório antes de rodar `node scripts/ensaiar.js medir`.** Número de ensaio lembrado de cabeça sempre favorece quem ensaiou
- **Transcrição fiel.** Não melhorar a fala do usuário, não cortar a parte em que ele gaguejou, não reordenar. O valor do arquivo está em ele ser desconfortável
- **Toda concessão sai anotada, inclusive a que parece pequena.** "Deixo o frete por minha conta" é concessão. Desconto dado no silêncio é o vazamento de margem mais comum de negócio pequeno
- **Piso confirmado antes de começar.** Ensaio sem piso não tem como dizer onde ele cedeu demais, e aí sobra o elogio
- **Cenário só venda ou cobrança.** Fora disso falta memória pra ancorar o outro lado. Conversa com a equipe é `/pessoa`; acordo entre sócios é `/socios`
- **Não inventar o cliente.** Objeção, palavra e jeito de resistir saem de `_memoria/publico.md` ou do histórico real. Onde faltar, dizer que está improvisando aquela parte
- **Não inventar número no ensaio.** Preço, prazo e garantia que o cliente do ensaio ouvir são os de `_memoria/oferta.md`. Se o usuário disser um valor que não está lá, parar o personagem e conferir
- **Nada de técnica de pressão.** Escassez falsa, "última chance" e culpa não entram nem no papel do cliente nem na dica da pausa. O Contex OS não treina isso
- **Fronteira com as vizinhas:** o `/vender` prepara o roteiro e a resposta de objeção, e é insumo daqui, não substituto. O `/cobranca` calcula o valor corrigido e a régua de toques. O `/preco` decide quanto cobrar; aqui só se confere se o usuário respeitou o que já foi decidido. O `/pos-venda` cuida da conversa depois do fechou
- **No cenário de cobrança, o que a lei permite é assunto do `/cobranca`.** Nada de multa, juros ou ameaça inventada no ensaio: o que o cliente do ensaio ouvir precisa estar no contrato
- **Cobrança não constrange, nem no ensaio.** O art. 42 do Código de Defesa do Consumidor diz que "na cobrança de débitos, o consumidor inadimplente não será exposto a ridículo, nem será submetido a qualquer tipo de constrangimento ou ameaça", e o art. 71 transforma ameaça, coação e afirmação falsa na cobrança em crime, com pena de detenção de três meses a um ano e multa. Então nem o cliente do ensaio nem a dica da pausa treinam ligar pro trabalho do devedor, avisar a família, ou dizer que vai processar sem ter decidido processar. Fonte: Lei 8.078/1990, https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm — conferido em 23/09/2026
- **Isto não substitui advogado nem contador.** Protesto, negativação, cliente que contesta o serviço e desconto que muda a nota fiscal passam por um profissional antes de virar ação
- **Dado de cliente real é dado pessoal.** Nome, telefone, valor devido e histórico ficam no arquivo do usuário e não vão pra ferramenta externa sem ele autorizar. Antes de escrever o nome no arquivo, perguntar se pode usar o nome real ou se ele prefere um apelido, e usar só o que serve pro ensaio (Lei 13.709/2018, a LGPD, no princípio da necessidade)
- **Ensaio que não mudou arquivo nenhum foi conversa, não treino.** Fechar sempre pelo Passo 8
