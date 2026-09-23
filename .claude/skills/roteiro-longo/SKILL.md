---
name: roteiro-longo
description: >
  Escreve o roteiro de um vídeo de 6 a 20 minutos em blocos com timecode calculado: gancho de
  30 segundos que paga a promessa do título, entrega antecipada, loop aberto antes de cada
  bloco, o que aparece na tela em cada trecho e a chamada no ponto em que ainda tem gente
  ouvindo. A duração sai do comando, pelo seu ritmo de fala, e o checklist de retenção é
  medido em vez de decorado.
  Use quando o usuário disser "preciso de um roteiro pro YouTube", "vou gravar um vídeo de
  quinze minutos", "como eu estruturo um vídeo longo", "meu vídeo perde as pessoas no meio",
  "escreve o roteiro dessa aula", "não sei quanto tempo dá o que eu escrevi", "roteiro de
  vídeo longo", "vou gravar uma aula e não sei a ordem", "onde eu coloco a chamada no vídeo",
  ou /roteiro-longo.
---

# /roteiro-longo — O vídeo de 6 a 20 minutos

> **Convenção de pastas:** a saída vai em `conteudo/roteiro-<tema>-<AAAA-MM-DD>/roteiro.md`. Na convenção **por cliente**, `clientes/<Nome>/conteudo/roteiro-<tema>-<AAAA-MM-DD>/roteiro.md`. A pasta nasce na hora de salvar o primeiro roteiro.

Vídeo longo não morre na gravação, morre no minuto dois. A pessoa clicou por causa de uma
promessa, ouviu você se apresentar, percebeu que a promessa ainda não andou e voltou pro
feed. O conserto não é editar melhor: é escrever de um jeito que cada minuto dê motivo pro
minuto seguinte. E dá pra conferir isso por comando, antes de ligar a câmera, porque duração
e distância entre quebras de padrão são números, não opinião.

## Dependências

- **Contexto:** `_memoria/empresa.md` (o que o negócio vende), `_memoria/preferencias.md` (é fala: tom errado soa decorado na gravação)
- **Cliente real:** `_memoria/publico.md`, quando existir — o gancho precisa ser a dor na palavra dele
- **Oferta:** `_memoria/oferta.md`, pro CTA apontar pra coisa certa
- **Tema e promessa:** `conteudo/pautas.md` (do `/ideias`) ou o tratamento escolhido no `/angulos`
- **Dado:** `pesquisa/` e `biblioteca.md`. Número dito em vídeo circula longe e volta sem fonte
- **Correção do vídeo anterior:** `conteudo/retencao/regras.md`, quando existir. É o arquivo que o `/retencao-de-video` escreve depois de ler a curva real, e ele manda mais que qualquer régua deste arquivo
- **Método:** `templates/crescimento/roteiro-longo.md` — ritmo de fala com fonte, anatomia do gancho, loop, quebra de padrão, posição do CTA
- **Copy:** `templates/copy/ganchos.md` (gancho, conteúdo, fechamento), `templates/copy/edicao.md` (o que cortar), `templates/copy/humanizacao.md` (o que denuncia texto de máquina)
- **Scripts:** `scripts/tempo.js` (orçamento, medição, ritmo, molde), `scripts/transcrever.js` (transcrição de vídeo já publicado, pra medir o ritmo real), `scripts/verificar.js texto`
- **Saída:** `conteudo/roteiro-<tema>-<AAAA-MM-DD>/roteiro.md`

---

## Workflow

### Passo 1 — Pegar o tema, a promessa e a duração

Antes de perguntar qualquer coisa, ler `conteudo/retencao/regras.md` se ele existir. É onde o
`/retencao-de-video` deixou a regra que saiu da curva do último vídeo, do tipo "começar falando
do primeiro erro, sem cumprimento". Essa regra vale mais que qualquer régua geral, porque foi
medida no canal dele, com o público dele. Dizer qual regra está sendo aplicada.

Depois, uma pergunta por vez, esperando a resposta. Começar pela que mais muda o resto:

> "Sobre o que é o vídeo, e qual é a promessa do título? A frase que a pessoa lê antes de clicar."

Tema e promessa vêm juntos porque separados viram conversa: o tema é o assunto, a promessa é o
que a pessoa sai sabendo ou fazendo. Se ele não tem título ainda, pegar do `/angulos` ou do
banco de pautas. Se a promessa vier vaga ("falar sobre precificação"), insistir uma vez:
promessa é substantivo verificável. "Você sai com o valor da sua hora calculado" é promessa.
"Entender melhor sobre preços" não é.

Depois:

> "Quanto tempo você quer que o vídeo tenha?"

E, por último:

> "Você vai aparecer falando, gravar a tela, ou narrar por cima de imagem?"

**Duração fora da faixa muda de skill.** Abaixo de 6 minutos, a gramática é outra e o roteiro
é o `/video` (vertical, corte a cada 3 ou 4 segundos). Acima de 20, quase sempre são dois
vídeos: perguntar qual metade é a que paga a promessa do título e deixar a outra como o
próximo. Aula que faz parte de um curso com módulos começa no `/curso`, que decide a ordem
antes de qualquer roteiro existir.

Ler o contexto antes de escrever qualquer linha. Roteiro genérico é o que sai quando a skill
pula essa parte.

### Passo 2 — Medir o ritmo de fala

Toda a conta de duração depende de quantas palavras por minuto essa pessoa fala. Chutar aqui
contamina o roteiro inteiro.

Se ele já publicou vídeo, o ritmo se mede:

```bash
node scripts/transcrever.js <video-ou-audio>   # só se faltar transcrição; usa a chave do .env
node scripts/tempo.js ritmo conteudo/transcricao-aula-3.txt --duracao 11:42
```

O comando devolve as palavras por minuto e a linha pronta pro cabeçalho do roteiro. Ele
também avisa quando o resultado cai fora de 90 a 200 palavras/min, o que quase sempre quer
dizer que a duração passada era de um trecho e a transcrição era do vídeo inteiro: conferir
antes de escrever o número no cabeçalho.

Sem nada gravado, usar 130 palavras/min. É um número dentro da faixa de apresentação
confortável (100 a 150), bem acima dos 90 medidos em fala espontânea em português — as duas
fontes estão em `templates/crescimento/roteiro-longo.md`. Avisar que é padrão e que vira o
número dele depois do primeiro vídeo. Quem fala devagar e escreve pra 150 entrega um roteiro
que estoura dois minutos na gravação.

### Passo 3 — Orçar as palavras e desenhar os blocos

```bash
node scripts/tempo.js orcamento --alvo 12 --ritmo 132
node scripts/tempo.js orcamento --alvo 12 --ritmo 132 --blocos 4   # se o mapa já tem os blocos
```

A saída diz quantas palavras de fala cabem no alvo, como elas se dividem entre gancho, blocos
de conteúdo e fecho, quantas quebras de padrão o vídeo vai precisar e até quando o CTA tem que
aparecer. Um vídeo de 12 minutos a 132 palavras/min pede 1.584 palavras, em cinco blocos de
286 palavras cada, com pelo menos dez quebras de padrão e o CTA até 08:24. O `--blocos` aceita
de 2 a 12; fora disso o comando recusa, porque bloco de meio minuto é corte de vertical.

Com o orçamento na mão, desenhar o mapa e **mostrar pro usuário antes de escrever a fala**.
Um bloco por ideia, cada um com quatro coisas decididas:

| O bloco precisa de | O que é |
|---|---|
| **Promessa própria** | o que essa parte entrega. Bloco que não entrega nada é bloco que sai |
| **Loop de saída** | a frase que promete a coisa do bloco seguinte |
| **O que aparece na tela** | plano, print, gráfico, produto na mão |
| **Quebra de padrão** | onde entra cena, dado, história ou pergunta, pra não passar de 90s sem nenhuma |

A ordem que funciona em quase todo tema: o problema na palavra do cliente, por que a solução
óbvia falha, a virada, a demonstração, o que fazer na segunda-feira. Confirmar o mapa em uma
mensagem só, e seguir.

### Passo 4 — Escrever a fala, bloco a bloco

Escrever como se fala, não como se escreve. Ler em voz alta antes de entregar: se travar a
língua, reescrever a frase.

As marcas entram no meio da fala, entre colchetes, e é por elas que o script encontra as
quebras de padrão:

| Marca | Pra que serve |
|---|---|
| `[cena: close no rosto]` | muda o plano, a distância ou o lugar |
| `[dado: 4.180 de custo fixo, fonte X]` | número que aparece escrito na tela |
| `[historia: o Rafael, dentista]` | caso com começo, complicação e desfecho |
| `[pergunta: quanto sairia num mês sem cliente?]` | pergunta jogada pra quem assiste |
| `[demo: mostrar a planilha]` | mostrar a tela, a mão, o produto funcionando |
| `[grafico: margem por serviço]` | gráfico ou comparação visual |
| `[tela: print do extrato]` | imagem, print ou texto entrando |
| `[loop: e falta a linha que muda tudo]` | promessa aberta, paga depois |
| `[cta]` | a chamada, uma só |

Três cuidados enquanto escreve:

- **Número entra com fonte.** Se o dado não está em `pesquisa/` nem em `biblioteca.md`, ou ele vem do usuário na hora, ou sai do roteiro. Marcar `[a confirmar]` resolve por enquanto, e o script conta quantos ficaram
- **História de cliente real precisa de autorização.** Nome, foto, caso e resultado de terceiro em vídeo público passam pelo `/autorizacao` antes de gravar. Sem autorização, a história vai sem nome e sem detalhe que identifique
- **Um assunto por bloco.** Dois assuntos no mesmo bloco viram dois blocos, ou dois vídeos

### Passo 5 — Escrever o gancho, por último

Só depois do corpo pronto você sabe qual é a melhor coisa que o vídeo tem pra prometer. Os
30 segundos de abertura são a métrica que o YouTube isola no relatório de retenção, e eles
levam quatro coisas, nessa ordem:

1. **Alvo:** duas ou três frases que deixam claro pra quem é isso e por que agora
2. **Transformação:** uma frase com o resultado concreto, em substantivo verificável, na palavra do cliente
3. **Risco:** uma frase com o que está em jogo se nada mudar
4. **Entrega antecipada:** um pedaço de valor de verdade, ainda dentro do gancho

Quando o vídeo não ensina nada — vlog, entrevista, reação, desafio — as duas primeiras trocam:
**personagem** (quem está na história) e **conceito** (qual é a brincadeira), com o risco no
mesmo lugar. Vídeo de opinião fica no meio, e a transformação vira a tese que vai ser
defendida. A anatomia inteira, com a fonte, está em `templates/crescimento/roteiro-longo.md`.

Entrega antecipada é o que separa gancho de promessa vazia. Um número, um antes e depois, o
print da planilha. Quem recebeu algo nos primeiros 30 segundos aceita esperar os próximos.

O que não entra: "oi gente, tudo bem", nome do canal, pedido de inscrição, agradecimento,
resumo do que o vídeo vai falar.

Escrever **três ganchos** e deixar os dois que não foram usados no fim do arquivo, em
`## Ganchos alternativos`. Trocar o gancho é a edição mais barata que existe depois de
publicado.

### Passo 6 — Colocar o CTA no ponto certo

Retenção cai ao longo do vídeo, sempre. Chamada no último minuto fala com a fração que já
ficou, ou seja, com quem menos precisa ser convencido.

- **Um CTA**, dois no máximo
- O primeiro **antes de 70%** da duração, logo depois do primeiro pagamento grande: a pessoa acabou de receber algo que valeu
- Específico e de um passo ("o link da planilha está na descrição, é de graça e não pede e-mail"), nunca a lista de quatro pedidos
- O fecho não é CTA. Fecho é fechar o último loop e dizer o que assistir depois

### Passo 7 — Escrever o arquivo

O arquivo nasce do comando, não copiado à mão. Ele já sai com o cabeçalho que o `medir` lê e
com as marcas nos lugares certos:

```bash
node scripts/tempo.js molde conteudo/roteiro-<tema>-<AAAA-MM-DD>/roteiro.md
```

O comando cria a pasta, escreve o esqueleto e imprime a sugestão de nome de pasta já com o
tema em minúsculas e sem acento. Se o arquivo existir, ele recusa em vez de sobrescrever.
Primeira coisa a trocar no esqueleto: a linha `**Ritmo:**`, que nasce com o padrão de 130 e
tem que virar o número medido no passo 2, com o arquivo e a data entre parênteses. É essa
linha que o `medir` lê pra calcular tudo.

Em cima desse esqueleto entram a fala escrita nos passos 4 a 6, a linha `**Formato:**` e mais
quatro seções que o `medir` reconhece pelo título e tira da contagem de duração, porque não são
fala: `## Mapa do vídeo`, `## Checklist de retenção`, `## Ganchos alternativos` e
`## Como gravar`. Título de bloco fora dessa lista entra na duração, então seção de apoio se
chama por um desses nomes. O resultado:

```markdown
# Roteiro — <tema>

- **Promessa do título:** <a frase que a pessoa lê antes de clicar>
- **Duração alvo:** 12 min
- **Ritmo:** 132 palavras/min (medido em <transcrição>, <data>)
- **Formato:** <falando pra câmera / tela gravada / narração>

## Mapa do vídeo
| Timecode | Bloco | Dura | O que aparece na tela |
|---|---|---|---|
| 00:00 | Gancho | 00:28 | título em três palavras |
| 00:28 | O problema | 02:05 | print do orçamento |
| ... | ... | ... | ... |

## Gancho — paga a promessa em 30s
**Na tela:** três palavras, não a frase inteira

[cena: close no rosto, já falando] <alvo: pra quem é e por que agora>.
<transformação: o resultado concreto>. <risco: o que está em jogo>.
[dado: número na tela, com fonte] <entrega antecipada>. [loop: e no fim eu mostro <a coisa>]

## Bloco 1 — <o problema, na palavra do cliente>
**Na tela:** <o que aparece enquanto você fala>

<fala corrida>. [cena: muda o plano] <continua>. [pergunta: <a dúvida dele>]
[loop: <a promessa do bloco seguinte>]

## Bloco 2 — <a virada>
[historia: <caso real, com autorização>] <fala>. [cta] <a chamada, uma só>
[loop: <o que falta>]

## Bloco 3 — <a demonstração>
[demo: <mostrar funcionando>] <fala>.

## Fecho — o que fazer agora
<fecha o último loop>. <o próximo vídeo, não o pedido de inscrição>.

## Checklist de retenção (medido, não opinado)
<colado da saída de: node scripts/tempo.js medir <arquivo> --checklist, no passo 8>

## Ganchos alternativos
1. <o segundo gancho, inteiro>
2. <o terceiro gancho, inteiro>

## Como gravar
- Horizontal, 16:9. Câmera na altura dos olhos, luz na frente
- Áudio é o que mais importa: lugar sem eco, microfone perto
- Três tomadas do gancho, uma do resto
- Legenda queimada no vídeo, e todo número dito aparece escrito
```

O mapa e o checklist ficam por preencher aqui. Eles saem do passo 8, colados da saída do
comando, porque timecode escrito antes de medir é chute com aparência de número.

### Passo 8 — Medir e corrigir até passar

```bash
node scripts/tempo.js medir conteudo/roteiro-<tema>-<data>/roteiro.md
```

A saída traz o timecode previsto de cada bloco, a duração total, as quebras de padrão, os
loops e a posição do CTA. Ela separa erro de aviso, e só o erro derruba o código de saída
para 1. Erro é o que não sai assim do jeito que está:

| O erro | O conserto |
|---|---|
| Gancho acima de 45s | Cortar o aquecimento. O comando diz quantas palavras tirar pra cair em 30s |
| Vão acima de 90s sem quebra | Nesse trecho falta cena, dado, história ou pergunta, e ele nomeia o bloco. O material quase sempre já está no texto, resumido em meia frase |
| Total fora de 15% do alvo | Ele diz quantas palavras escrever ou cortar. Cortar é sempre melhor que acelerar a fala |
| CTA só nos últimos 10% | Subir a chamada pro fim do primeiro bloco que entrega algo |
| Nenhum `[cta]` no arquivo | A chamada tem que estar escrita, não combinada de cabeça |
| Bloco sem fala | Bloco que só tem título ainda não foi escrito |

Aviso não trava a entrega, mas nenhum deles se ignora calado: cada um vira uma frase pro
usuário, com a decisão dele. São o gancho entre 30 e 45s, o desvio de alvo entre 8% e 15%, o
vão entre 60 e 90s, o bloco acima de 3 minutos (quebrar em dois, com loop entre eles), nada de
concreto nos primeiros 90s, menos loops que blocos de conteúdo, mais de dois CTAs, menos de
três blocos, alvo fora da faixa de 6 a 20 minutos e `[a confirmar]` que sobrou.

Rodar de novo até o comando dizer "Tudo certo". **Nunca ajustar o timecode escrito no arquivo
pra bater com o que se espera:** o timecode vem do comando, e se ele mudou é porque a fala
mudou.

Com o roteiro passando, colar as duas tabelas que faltavam:

```bash
node scripts/tempo.js medir conteudo/roteiro-<tema>-<data>/roteiro.md --checklist
```

O `--checklist` devolve o checklist de retenção em markdown, com as seis réguas, o valor
medido de cada uma e a data da medição. Ele vai inteiro pra seção `## Checklist de retenção`.
O mapa do vídeo sai da tabela de blocos da saída normal: início, duração e o que aparece na
tela de cada bloco.

Por último, os sinais de texto de máquina:

```bash
node scripts/verificar.js texto conteudo/roteiro-<tema>-<data>/roteiro.md
```

Roteiro é fala, então a régua de frases curtas vale ainda mais aqui: ninguém fala em períodos
de 22 palavras. Clichê acusado sai antes de gravar.

Salvar e dizer em duas linhas o que foi entregue: duração prevista, número de blocos, onde
está o CTA.

### Passo 9 — Encaminhar

Com o vídeo gravado e editado, o pacote de upload (título, descrição, capítulos, tags) é o
`/publicar-video`. Depois de publicado, a curva real de retenção e os pontos de queda são o
`/retencao-de-video`, que deixa a regra do próximo roteiro em `conteudo/retencao/regras.md`:
é o arquivo que o passo 1 vai ler na próxima vez. Vídeo que foi bem
entra no `biblioteca.md` e vira post, carrossel e e-mail no `/reaproveitar`. O tema entra no
`conteudo/indice.md`.

Se o usuário vai gravar falando e trava na câmera, o `/ensaiar` mede o ensaio dele contra o
roteiro.

---

## Regras

- **O timecode vem do comando.** Nenhuma duração é escrita de cabeça, nem "arredondada" pra ficar bonita. Se o número mudou, a fala mudou
- **O ritmo é o dele, não o padrão.** Com transcrição de vídeo publicado, medir. Sem ela, usar 130 palavras/min e dizer, na cara, que é padrão
- **Regra que saiu de curva real ganha de régua geral.** Se `conteudo/retencao/regras.md` existe, ele é lido antes de escrever e a regra aplicada aparece no arquivo
- **O gancho se escreve por último**, e vale três versões. É o pedaço com mais retorno por palavra reescrita
- **Nada de aquecimento.** Apresentação, agradecimento e "antes de começar" saem do gancho
- **Um loop por bloco, e todo loop fecha.** Promessa aberta que não é paga é o que faz a pessoa não voltar no próximo vídeo
- **Nenhum trecho passa de 90 segundos sem quebra de padrão**, e isso não é regra decorada: é o que o `node scripts/tempo.js medir` calcula, acusa com o timecode e nomeia por bloco
- **CTA antes de 70% do vídeo**, um só, de um passo
- **Todo número dito tem fonte** em `pesquisa/` ou `biblioteca.md`, ou vem do usuário na conversa, ou sai do roteiro. Nada de estatística plausível escrita de cabeça: vídeo é o formato onde dado inventado viaja mais longe, e volta sem a fonte. O que ainda não tem fonte vai marcado `[a confirmar]`, e o `medir` conta quantos sobraram
- **História de cliente com nome, rosto, print ou resultado passa pelo `/autorizacao` antes de gravar.** Vídeo com fim comercial cai no art. 20 do Código Civil (Lei 10.406/2002) e, porque nome e imagem são dado pessoal, no art. 7º, I, e no art. 8º da LGPD (Lei 13.709/2018): consentimento por escrito, com finalidade determinada e revogável a qualquer momento (art. 8º, § 5º). Sem termo assinado, a história vai sem nome e sem nenhum detalhe que identifique. Fontes e data de conferência em `templates/crescimento/roteiro-longo.md`
- **Nada de dado de terceiro na tela sem checar o enquadramento.** Print de conversa, extrato ou prontuário mostra nome, telefone e valor de quem não escolheu aparecer: tarjar ou refazer o print com dado fictício, e dizer na tela que é exemplo
- **Não prometer no gancho o que o vídeo não entrega.** Derruba a retenção e o alcance do vídeo seguinte
- Vertical curto não é isso: 15 a 90 segundos com corte a cada 3 ou 4 segundos é o `/video`, upload é o `/publicar-video` e curso com módulos é o `/curso`
- Tema de saúde, financeiro, jurídico ou estético passa pelo `/publicidade-regulada` antes de gravar. **Esta skill não substitui parecer de advogado, de contador nem a revisão do conselho profissional da área** — ela escreve o roteiro, quem responde pelo que foi dito em vídeo público é quem falou
- Tom conforme `_memoria/preferencias.md`. Roteiro é o texto onde soar diferente de si mesmo aparece mais rápido, porque alguém vai ler isso em voz alta
