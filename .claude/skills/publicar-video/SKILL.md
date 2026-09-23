---
name: publicar-video
description: >
  Monta o pacote de publicação de um vídeo longo do YouTube a partir do vídeo pronto e da
  transcrição com marcação de tempo: três títulos que sobrevivem à truncagem, descrição com
  as duas primeiras linhas vendendo antes do "mostrar mais", capítulos que o YouTube aceita,
  tags dentro do limite do campo e comentário fixado com uma chamada só. Entrega copiar e
  colar, e confere cada limite por comando antes de você abrir o Studio.
  Use quando o usuário disser "vou subir esse vídeo no YouTube", "já gravei, falta postar",
  "o que eu escrevo na descrição do vídeo", "me ajuda com o título do vídeo", "como faço os
  capítulos", "preciso dos timestamps", "monta a descrição pro YouTube", "vou postar a aula
  gravada", "que tags eu coloco", ou /publicar-video.
---

# /publicar-video — O pacote de upload do vídeo longo

> **Convenção de pastas:** a saída vai em `conteudo/youtube-<tema>-<AAAA-MM-DD>/`. Na convenção **por cliente**, `clientes/<Nome>/conteudo/youtube-<tema>-<AAAA-MM-DD>/`. A pasta nasce na hora de salvar o primeiro pacote.

Você gravou quarenta minutos de conteúdo bom e agora está na tela do Studio com quatro
campos em branco, um cursor piscando no título e vontade de escrever "aula 3" e clicar em
publicar. É aí que o vídeo morre: não na gravação, mas nos cinco campos que decidem quem
vai abrir. Essa skill preenche os cinco, e confere por comando o que o YouTube aceita ou
recusa, porque a regra de capítulo é objetiva e falha inteira por um segundo de diferença.

## Dependências

- **Contexto:** `_memoria/empresa.md` (quem é o canal, o que ele vende), `_memoria/preferencias.md` (a voz: descrição soa de agência quando não é a dele)
- **Cliente real:** `_memoria/publico.md`, se existir — a primeira linha da descrição é a dor na palavra dele, não a sua
- **Oferta ativa:** `_memoria/oferta.md`, se existir — define qual link vai na descrição e no comentário fixado
- **Insumo obrigatório:** o vídeo já pronto (ou a duração dele) e a **transcrição com marcação de tempo**
- **Transcrição:** `scripts/transcrever.js` gera a partir do arquivo de áudio ou vídeo, com o minuto de cada trecho (precisa de chave da OpenAI ou do Gemini no `.env`). Se o vídeo já está no YouTube como não listado, a transcrição automática do Studio serve
- **Molde de referência (ler antes de escrever):** `templates/crescimento/publicar-video.md` — os limites com fonte e data, a truncagem do título, as cinco camadas da descrição e o que faz um capítulo ser útil
- **Referências de copy:** `templates/copy/ganchos.md` (a primeira linha), `templates/copy/edicao.md` (o que cortar), `templates/copy/humanizacao.md` (descrição com cara de máquina afasta)
- **Script de conferência:** `scripts/publicar-video.js` — capítulo, título, descrição, tags e comentário fixado
- **Saída:** `conteudo/youtube-<tema>-<AAAA-MM-DD>/upload.md` e `como-postar.md`

---

## Workflow

### Passo 1 — Receber o vídeo, a transcrição e a duração

Uma mensagem só, porque isso é levantamento e não conversa:

> 1. "Onde está a transcrição com os minutos? (pode ser arquivo, texto colado ou o `.txt` que o `transcrever.js` gerou)"
> 2. "Qual a duração do vídeo? (mm:ss)"
> 3. "Esse vídeo tem uma oferta ligada a ele, ou é conteúdo puro?"

Com o arquivo de vídeo na mão e nenhuma transcrição, gerar:

```bash
node scripts/transcrever.js <arquivo> --idioma pt --dica "<nomes e termos do negócio>"
```

Sem transcrição e sem vontade de gerar uma, **parar aqui e dizer por quê**: capítulo sem
transcrição é chute, e capítulo chutado erra o segundo, e errando o segundo o YouTube não
cria nenhum. Nesse caso a skill entrega título, descrição e tags, e deixa os capítulos de
fora, avisando na entrega.

A duração não é detalhe de formulário. Ela é o que permite conferir o último capítulo, que
é o erro mais comum e o mais invisível: se sobrarem menos de dez segundos depois do último
timestamp, o YouTube joga a lista inteira fora. Quando ela não vier, usar o último tempo da
transcrição como piso e confirmar com ele antes de rodar o laudo.

**O rodapé do canal se escreve uma vez.** Antes de montar a descrição, procurar o bloco
fixo (quem ele é em uma linha, os outros canais, o aviso de publicidade) em
`_memoria/empresa.md` ou no `upload.md` do vídeo anterior em `conteudo/`. Se não existir,
escrever com ele agora e gravar em `_memoria/empresa.md`, na seção de canais: a partir do
próximo vídeo isso deixa de ser pergunta.

### Passo 2 — Ler a transcrição e escrever a promessa em uma frase

Ler a transcrição inteira antes de escrever qualquer campo. O que se procura é uma coisa
só: **o que essa pessoa sabe fazer depois de assistir que não sabia antes.**

Escrever isso em uma frase e mostrar pra ele:

> "A promessa que eu li no vídeo: quem assiste sai sabendo alimentar o levain na
> proporção certa pra temperatura da cozinha dele. É isso, ou você diria outra coisa?"

Essa frase é a matriz de tudo que vem depois. Título que promete outra coisa derruba a
retenção, e retenção derrubada é o vídeo saindo das sugestões. Confirmar antes de seguir.

Enquanto lê, anotar também:
- **Os momentos de virada** — onde o assunto muda de verdade (vira capítulo)
- **A frase mais forte** dita literalmente (vira título ou primeira linha)
- **O número concreto** que apareceu, com o minuto (entra na descrição, com fonte se for dado externo)
- **A pergunta que ele respondeu** no meio (vira o comentário fixado)

### Passo 3 — Escrever três títulos e medir cada um

Três títulos, um de cada forma do molde: busca, erro e resultado. Não são três variações da
mesma frase. São três apostas diferentes.

Medir cada um por comando, nunca contando de cabeça:

```bash
node scripts/publicar-video.js titulo "Pão de fermentação natural sem sova: passo a passo de 3 dias"
```

O comando devolve o tamanho e mostra o que o leitor vê no celular antes do corte. A régua
está no molde: 100 é o limite do campo, 70 é onde a busca em desktop corta, 60 é onde o
celular corta. Escrever pra caber em 70 com o que decide o clique nos primeiros 60.

Dois detalhes que o comando pega e o olho não: `<` e `>` são recusados pelo campo, então
espaço reservado do tipo `<nome do produto>` tem que sair antes de colar; e três títulos que
começam com as mesmas palavras não são três apostas, são a mesma aposta escrita três vezes.

Mostrar os três no chat com o trecho visível de cada, e deixar ele escolher. Se ele não
escolher, o primeiro da lista é o que vai no `como-postar.md`, e os outros dois ficam
registrados como troca pra testar depois.

### Passo 4 — Montar os capítulos a partir dos minutos reais

Um capítulo por virada de assunto, nomeado pelo que a pessoa vai encontrar ali. Entre 5 e
12 num vídeo de 10 a 30 minutos. O primeiro sempre em `00:00`. E nunca "Introdução".

Salvar a lista num arquivo e rodar:

```bash
node scripts/publicar-video.js capitulos conteudo/youtube-<tema>-<data>/capitulos.txt --duracao 28:10
```

O comando mostra a duração de cada capítulo e reprova o que o YouTube reprovaria: primeiro
fora do `00:00`, menos de três capítulos, ordem quebrada, trecho abaixo de dez segundos e
último capítulo sem dez segundos até o fim do vídeo. Rodar sem `--duracao` deixa essa última
conferência de fora, e o próprio comando avisa que deixou.

**Quando o comando reprovar, mexer no capítulo, nunca no número.** Capítulo curto demais
significa que aquele trecho não é um assunto próprio: ele pertence ao vizinho. Juntar é a
correção certa; empurrar o timestamp dois segundos pra frente é maquiar.

### Passo 5 — Escrever a descrição nas cinco camadas

A ordem está no molde, e ela não é negociável, porque a dobra do "mostrar mais" acontece
na linha 2 ou 3:

1. Duas linhas que vendem: o problema na palavra dele, e o que o vídeo resolve
2. Três a cinco linhas de contexto, pra quem abriu
3. Um link, com o que ele entrega escrito antes
4. Os capítulos, colados sem alterar nada
5. O rodapé fixo do canal

A primeira linha é onde está todo o trabalho. Quatro aberturas queimam esse espaço:
"Neste vídeo eu vou te mostrar", "Olá pessoal", o nome do canal e a hashtag. Nenhuma delas
diz nada a quem está decidindo se fica.

Escrever a primeira linha três vezes e escolher a melhor. Uma delas pode ser a frase
literal mais forte que ele falou no vídeo, e costuma ganhar.

Hashtag entra no fim do bloco de contexto, duas ou três do assunto, nunca na primeira linha.
Passando de sessenta no mesmo vídeo o YouTube ignora todas. Das que estão na descrição, ele
mesmo escolhe até três pra mostrar acima do título, e a ordem que você escreveu não decide
nada. Lista de
palavra-chave empilhada no fim da descrição é outra coisa: essa é contra a política de spam,
e a fonte está no molde.

### Passo 6 — Tags e comentário fixado

Tags: de 8 a 15, incluindo as grafias erradas que fazem sentido no assunto e o nome do
canal. O campo estoura mais fácil do que parece, porque a conta inclui vírgula e aspas.
Medir sempre:

```bash
node scripts/publicar-video.js tags "fermentação natural, pão caseiro, levain, sourdough"
```

Comentário fixado: **uma** função só, escolhida entre chamada, correção e pergunta (a
tabela está no molde). Com oferta ligada ao vídeo, é a chamada, com o mesmo link da descrição
dito de outro jeito. Sem oferta, é a pergunta específica, a que dá resposta de duas linhas.
Curto: passando de umas quinhentas letras, o celular esconde o resto atrás do "Ler mais", e
o script avisa.

### Passo 7 — Montar o `upload.md` e rodar o pacote inteiro

O arquivo é copiar e colar. Cada seção corresponde a um campo do Studio, e o script lê
exatamente essas seções.

````markdown
# Upload — <título escolhido> — <AAAA-MM-DD>

**Duração:** <mm:ss> · **Promessa:** <a frase do Passo 2>

## Títulos (escolher 1)
1. <título forma busca>
2. <título forma erro>
3. <título forma resultado>

## Descrição
```
<linha 1: o problema na palavra dele>
<linha 2: o que o vídeo resolve>

<contexto em 3 a 5 linhas: o que o vídeo cobre, pra quem é, o que a pessoa
consegue fazer depois>

<o que o link entrega>: <URL>

Capítulos
00:00 <gancho, não "Introdução">
<mm:ss> <o que a pessoa encontra aqui>
...

<rodapé fixo do canal: quem é você em uma linha, outros canais, aviso de
publicidade quando houver>
```

## Capítulos
```
00:00 <gancho>
<mm:ss> <assunto>
...
```

## Tags
```
<tag, tag, tag>
```

## Comentário fixado
```
<uma função só: chamada, correção ou pergunta>
```

## Miniatura
- Texto sugerido (3 a 5 palavras, sem repetir o título): <...>
- Imagem: <o que mostrar>. Produzir no `/carrossel`

## Encaminhamentos
- Shorts derivados: minutos <...> (levar pro `/video`)
- Tela final e cards: montar no Studio depois do upload
````

Rodar o laudo completo, com a duração:

```bash
node scripts/publicar-video.js conteudo/youtube-<tema>-<data>/upload.md --duracao 28:10
```

Marca com `✖` impede a publicação. Aviso com `!` é qualidade, e vale corrigir quase sempre.
O script também confere se os capítulos da seção `## Capítulos` aparecem iguais dentro da
descrição, que é onde o YouTube os lê de verdade.

E porque a descrição é texto que vai pro público:

```bash
node scripts/verificar.js texto conteudo/youtube-<tema>-<data>/upload.md
```

Se ele acusar clichê ou ritmo de máquina, o conserto é o `/humanizar`, não uma reescrita no
escuro.

### Passo 8 — Escrever o `como-postar.md`

Mesmo padrão do `/carrossel`: o que fazer, na ordem, sem depender de lembrar.

```markdown
# Como postar — <título escolhido>

**Onde:** YouTube Studio → Criar → Enviar vídeo

## Na ordem
1. Subir o arquivo do vídeo
2. **Título:** colar o escolhido do `upload.md`
3. **Descrição:** colar o bloco inteiro, **com os capítulos dentro**
4. **Miniatura:** subir a imagem (1280×720). Sem ela o YouTube pega um quadro qualquer
5. **Playlist:** <qual, se houver>
6. **Público:** marcar se é conteúdo para crianças (pergunta obrigatória)
7. **Tags:** em "Mostrar mais" → Tags, colar o bloco
8. **Publicar** (ou programar)
9. **Depois de publicar:** comentar o texto do comentário fixado e fixá-lo
   (nos três pontos do comentário → Fixar). Exige recursos avançados na conta
10. Conferir na página do vídeo se a barra de progresso ficou dividida.
    Se não dividiu, o problema está na descrição: capítulo fora de 00:00 ou
    com menos de 10 segundos

## O que checar 48 horas depois
- Os capítulos apareceram na barra?
- O título ficou cortado onde você esperava? (olhar na busca, no celular)
- O comentário fixado está no topo?
```

Mostrar no chat o resumo do laudo e os três títulos com o trecho visível. O arquivo inteiro
não se repete na conversa.

### Passo 9 — Registrar e encaminhar

- Linha nova em `conteudo/indice.md` com a data, o título publicado e o caminho da pasta
- Se o vídeo tiver ido bem, entrada no `biblioteca.md`: vídeo que performou é a melhor
  matéria-prima pro `/reaproveitar`
- Oferecer **uma vez**, e seguir com o que ele responder:

> "Marquei três trechos que rendem Shorts (min 7, 14 e 22). Quer que eu escreva os
> roteiros verticais agora, ou deixa pra depois de ver como esse vídeo anda?"

O que **não** entra nesta skill e vai pra vizinha: o roteiro vertical é `/video`, a escolha
dos trechos que rendem é `/reaproveitar`, a miniatura é `/carrossel`, e a leitura dos
números do canal depois de uma semana é `/medir`.

---

## Regras

- Sem transcrição com minuto, não existe capítulo. Nesse caso a entrega é título, descrição e tags, e a falta aparece escrita na entrega. Capítulo chutado erra o segundo, e um segundo errado faz o YouTube descartar a lista inteira
- **Nenhum número de campo vai de cabeça.** Título, descrição, tags e capítulo se medem com `node scripts/publicar-video.js`. Contagem de caractere lida a olho erra sempre, e o campo de tags erra em dobro porque conta vírgula e aspas
- **Quando o script reprovar, mudar o conteúdo, não o número.** Capítulo curto se junta ao vizinho; título longo se reescreve. Empurrar timestamp pra passar na régua é maquiar a conta
- **Os capítulos vão dentro da descrição.** Não existe campo separado de capítulo no Studio. Se a descrição e a lista divergirem, quem vale é a descrição, e o script acusa a diferença
- A primeira linha nunca é saudação. Nem "neste vídeo", nem o nome do canal, nem hashtag. É o espaço mais lido da descrição, e a segunda linha aparece junto com ela: o script cobra as duas
- Uma chamada por vídeo: um link principal na descrição, uma função no comentário fixado. Quatro links viram zero clique, e o script avisa quando a descrição passa de três endereços diferentes
- **Nunca prometer no título o que o vídeo não entrega.** Isso não é questão de ética abstrata: a pessoa sai nos primeiros segundos, a retenção cai e o YouTube para de sugerir. O prejuízo cai no próximo vídeo
- **Número dito no vídeo só entra na descrição com fonte.** Se o dado veio de fora e não está em `pesquisa/`, ou entra com a URL e a data, ou sai. Descrição é o lugar onde o número inventado fica escrito e citável
- A skill entrega arquivo, não publica. Upload, agendamento e fixação de comentário ficam com ele, na conta dele, na hora que ele escolher
- A declaração "feito para crianças" é dele, e a skill não responde por ele. O Studio pergunta em todo upload, e a própria página do YouTube diz que a resposta errada pode ter consequência legal sob a COPPA e outras leis (support.google.com/youtube/answer/9528076, lido em 23/09/2026). **Esta skill não substitui advogado nem contador:** com tema de saúde, dinheiro, direito ou estética, o `/publicidade-regulada` vem antes de publicar, e quem responde pelo que foi dito em vídeo público é quem falou
- O rodapé fica igual em todo vídeo do canal. Ele nasce uma vez, mora em `_memoria/empresa.md` e é copiado; reescrever o rodapé a cada upload é como o aviso de publicidade some sem ninguém notar
- **Conteúdo pago, permuta ou recebido de graça se marca.** A regra brasileira de publicidade e a marcação certa são assunto do `/publicidade-regulada`; esta skill só reserva a linha no rodapé
- **Transcrição é dado sensível quando tem terceiro.** Gravação com cliente, paciente ou aluno identificável não vai pra API de transcrição sem autorização dele, e nome de terceiro não entra em descrição pública sem o `/autorizacao` (LGPD)
- **Fronteira com as vizinhas:** `/roteiro-longo` escreve o roteiro antes de gravar; `/video` faz roteiro vertical de 15 a 90 segundos; `/reaproveitar` decide quais trechos do longo rendem outras peças; `/retencao-de-video` olha a curva de retenção depois de publicado; `/seo` cuida de site, artigo e perfil no Maps, não do YouTube; `/carrossel` produz a miniatura
- **Limite de interface muda.** As réguas de truncagem e de dobra do molde estão datadas em 22/09/2026. Se o YouTube mudar a tela, a régua muda: os limites duros (100, 5.000, 500, 00:00, três capítulos, dez segundos) são os que têm página oficial
