# Publicar vídeo longo no YouTube — limites, dobra e capítulo

Referência do `/publicar-video`. Não é o workflow: é o que a skill consulta pra montar o
pacote de upload de um vídeo longo sem chutar número. Vale pra aula gravada, entrevista,
tutorial, análise, live reaproveitada: qualquer coisa acima de uns três minutos que vive
na página de assistir, com barra de progresso e caixa de descrição.

Conferido em 22/09/2026. Cada limite abaixo está com a página oficial que o publica. O que
o YouTube aplica na tela mas não escreve em página de ajuda está marcado como **limite de
interface**, e foi medido, não estimado.

---

## Os limites que o script confere

| Campo | Limite | Natureza | Fonte |
|---|---|---|---|
| **Título** | 100 caracteres | limite duro (o campo não aceita mais) | support.google.com/youtube/answer/57407 |
| **Descrição** | 5.000 caracteres | limite duro | mesma página |
| **Descrição (API)** | 5.000 **bytes** UTF-8 | limite duro | developers.google.com/youtube/v3/docs/videos |
| **Campo de tags** | 500 caracteres somando tudo | limite duro | mesma página da API |
| **Capítulo** | primeiro em 00:00, mínimo 3, ordem crescente, 10s ou mais cada | requisito: sem isso não existe capítulo | support.google.com/youtube/answer/9884579 |
| **Hashtag** | acima de 60 no mesmo vídeo, o YouTube ignora todas | regra | support.google.com/youtube/answer/6390658 |
| **Caractere** | título e descrição não aceitam `<` nem `>` | limite duro | mesmas páginas acima |
| **Comentário fixado** | um por vídeo, e exige recursos avançados na conta | requisito da conta | support.google.com/youtube/answer/6000964 |

Todas as páginas lidas em 22/09/2026.

**Sobre as hashtags:** a página diz duas coisas que mudam a decisão. Passando de 60 no
vídeo, nenhuma conta. E das que estão na descrição, até três aparecem acima do título,
escolhidas pelo YouTube por engajamento, não pela ordem em que você escreveu. Duas ou três
hashtags do assunto bastam, e nenhuma delas ocupa a primeira linha.

**Sobre `<` e `>`:** a referência da API recusa os dois na descrição, e a página de upload
diz que o título não aceita "caracteres inválidos". Quem escreve `<nome do produto>` como
espaço reservado descobre isso com o campo já salvo pela metade.

**Sobre os 5.000 da descrição:** a página de ajuda fala em caracteres e a referência da API
fala em bytes. Texto em português tem acento, e acento ocupa dois bytes. Numa descrição
longa a diferença chega a algumas centenas, então a conta que o script faz é a de bytes,
que é a mais apertada das duas.

**Sobre os 500 do campo de tags:** a conta inclui a vírgula entre as tags e mais duas
aspas por tag que tenha espaço. A referência da API traz o exemplo: a tag `Foo Baz` conta
nove caracteres, não sete. É o tipo de detalhe que faz o campo estourar com uma lista que
parecia caber.

---

## A truncagem do título

Cabem 100 caracteres. Ninguém lê 100.

O que o leitor vê depende de onde o vídeo aparece, e nenhuma dessas medidas está numa
página de ajuda: são limites de interface, medidos em 22/09/2026 na busca do YouTube, na
página inicial e no app.

| Onde | Corta perto de |
|---|---|
| Busca no computador | 70 caracteres |
| Busca e página inicial no celular | 60 caracteres |
| Sugestão na coluna lateral | 50 caracteres, em duas linhas |

Daí a régua da skill: **escrever o título em 70 caracteres e pôr o que decide o clique nos
primeiros 60.** Passar de 70 não é erro, é só desperdício, e o script avisa em vez de
reprovar.

O teste prático é ler só os primeiros 60 caracteres em voz alta. Se ainda dá pra saber do
que é o vídeo, o título está de pé. "Como fazer pão de fermentação natural em casa do zero
sem sova com farinha comum" vira "Como fazer pão de fermentação natural em casa do zero
se…", que é onde todo mundo já estava antes de clicar.

### Três formas que funcionam, e por que

| Forma | Quando usar | Exemplo |
|---|---|---|
| **Busca** (a pergunta literal) | tutorial, dúvida técnica, tema que a pessoa digita | "Pão de fermentação natural sem sova: passo a passo de 3 dias" |
| **Erro** (o que ela faz errado) | tema em que existe crença comum equivocada | "Por que seu levain não sobe (e não é a farinha)" |
| **Resultado** (o número ou o desfecho) | caso real, bastidor, comparação | "Testei 4 fornos domésticos: o de R$ 400 ganhou" |

O que derruba o vídeo depois do clique: prometer no título o que o vídeo não entrega. A
pessoa sai nos primeiros segundos, a retenção cai, e o YouTube para de sugerir. Título
honesto com gancho forte é a única combinação que se sustenta em canal pequeno.

Maiúscula em tudo, três pontos de exclamação e emoji de choque não são penalizados por
regra nenhuma. Só envelhecem rápido e afastam quem busca informação séria.

---

## A anatomia da descrição

A caixa de descrição tem duas vidas. A primeira é o pedaço visível antes do "mostrar
mais", que quase todo mundo lê. Depois dele vem o resto, que só quem se interessou abre.

Quanto aparece antes da dobra varia com a largura da tela e o tamanho da fonte do
aparelho, e o YouTube não documenta isso. Medido em 22/09/2026, ficam visíveis de duas a
três linhas na página de assistir no celular. A régua segura, que o script aplica como
aviso: **primeira linha até 100 caracteres, as duas primeiras somando até 200.**

As cinco camadas, nessa ordem:

1. **Duas linhas que vendem.** O problema na palavra de quem assiste, e o que o vídeo
   resolve. Aqui não entra saudação, não entra "neste vídeo eu vou te mostrar", não entra
   o nome do canal
2. **Três a cinco linhas de contexto**, depois da dobra. O que o vídeo cobre, pra quem é,
   e o que a pessoa vai conseguir fazer depois
3. **O link que importa**, um só, com o que ele entrega escrito antes dele. Link solto no
   meio do texto não é clicado
4. **Os capítulos**, colados da lista de capítulos, sem alterar nada. O YouTube lê os
   capítulos **daqui**, não de um campo separado. É por isso que o script compara os dois
   e reprova quando divergem
5. **O rodapé fixo**, igual em todo vídeo do canal: quem é você em uma linha, os outros
   canais, e o aviso de publicidade quando houver

Sobre o item 5 e publicidade: conteúdo pago, permuta ou recebido de graça tem regra
própria no Brasil, e a marcação certa é assunto do `/publicidade-regulada`.

### Palavra-chave, sem encher

A descrição ajuda o YouTube a entender o assunto, e o jeito de fazer isso é escrever sobre
o assunto. Repetir a mesma expressão dez vezes não melhora nada, e lista de palavra-chave
empilhada no fim da descrição é explicitamente contra a política de spam do YouTube
(support.google.com/youtube/answer/146402, lido em 22/09/2026).

---

## Capítulo é índice, não manchete

A regra objetiva já está na tabela. O que a regra não diz é o que faz um capítulo ser útil.

Capítulo existe pra duas coisas: deixar a pessoa pular pro pedaço que ela quer e deixar
ela voltar depois pra rever. Quem chega pela busca costuma clicar direto no capítulo, não
no começo do vídeo.

- **Nome descritivo, não criativo.** "Proporção do levain" serve; "O segredo revelado" não
  serve pra nada
- **Até uns 40 caracteres.** A barra do player corta, e capítulo cortado perde a função.
  O script avisa acima disso
- **Entre 5 e 12 capítulos** num vídeo de 10 a 30 minutos. Menos que isso não ajuda a
  navegar, mais que isso vira uma lista que ninguém lê
- **O primeiro capítulo é o gancho, não "Introdução".** "Introdução" é o nome do trecho
  que a pessoa mais quer pular
- **Sem capítulo de 10 segundos só pra fechar a conta.** Se o trecho não tem 10 segundos
  de conteúdo próprio, ele pertence ao capítulo vizinho

O capítulo mais curto permitido é de 10 segundos, e isso vale pro último também: se o
vídeo termina 5 segundos depois do último timestamp, o YouTube não cria os capítulos. Por
isso o script aceita `--duracao` e confere a sobra.

---

## Tags: o campo que pesa pouco

A própria página de ajuda do YouTube diz que tag tem papel mínimo na descoberta, e que ela
serve principalmente pra assunto que as pessoas escrevem errado
(support.google.com/youtube/answer/57407, lido em 22/09/2026).

O que fazer com isso, na prática:

- Preencher com **8 a 15 tags**, sem esforço de otimização. Essa faixa é régua de trabalho
  da skill, não regra do YouTube: o que o YouTube impõe são os 500 caracteres
- Incluir as grafias erradas que fazem sentido no assunto (nome de marca, termo técnico,
  palavra estrangeira)
- Incluir o nome do canal e o nome do assunto principal
- Não copiar a tag de vídeo de outro canal, que é onde a lista estoura os 500

Tempo de trabalho gasto em tag é tempo tirado do título, da miniatura e dos primeiros
trinta segundos, que é onde o resultado mora.

---

## Comentário fixado

Um por vídeo, e ele substitui o anterior. No computador aparece no topo da página de
assistir com a marca "Fixado por"; no celular a pessoa precisa abrir a caixa de
comentários pra ver (support.google.com/youtube/answer/6000964, lido em 22/09/2026).

Serve pra três coisas, e é melhor escolher uma:

| Uso | Quando |
|---|---|
| **A chamada** | vídeo com oferta clara: o link que a descrição também tem, dito de outro jeito |
| **A correção** | você errou algo no vídeo e não vai regravar. Corrigir ali é mais honesto que deixar a dúvida |
| **A pergunta** | vídeo de opinião: uma pergunta específica que dá resposta de duas linhas |

O que não funciona: "valeu por assistir", "se inscreva no canal", ou as três coisas juntas
numa mensagem só.

O tamanho do campo de comentário não está em página oficial: fica `[a confirmar]`. A régua
de trabalho é outra e não depende disso — **até umas 500 caracteres**, porque no celular o
comentário longo fica escondido atrás do "Ler mais", que é o mesmo problema da dobra da
descrição em outro lugar da tela.

---

## O que fica fora deste molde

- **Shorts derivado do longo**, com corte vertical e legenda queimada, é roteiro curto:
  `/video` escreve, `/reaproveitar` decide quais trechos rendem
- **Tela final e cards** são edição dentro do Studio, feitos depois do upload
- **Miniatura** é peça visual. O `/carrossel` produz, e o texto dela não repete o título:
  título e miniatura dividem o trabalho de convencer
- **Roteiro do vídeo**, escrito antes de gravar, é `/roteiro-longo`
- **Página do site, artigo e perfil no Maps** são `/seo`
- **A declaração "feito para crianças"** é do dono do canal. O YouTube exige a resposta em
  todo upload por acordo com a FTC americana e avisa que a resposta errada pode ter
  consequência legal sob a COPPA e outras leis
  (support.google.com/youtube/answer/9528076, lido em 23/09/2026). Nenhuma skill responde
  isso no lugar dele, e a decisão não é de marketing

---

## Fontes

Todas lidas em 22/09/2026.

- Título, descrição e tags: https://support.google.com/youtube/answer/57407
- Hashtag, e o que acontece acima de 60: https://support.google.com/youtube/answer/6390658
- O papel das tags e o spam de palavra-chave: https://support.google.com/youtube/answer/146402
- Capítulos: https://support.google.com/youtube/answer/9884579
- Limites de campo na API (bytes da descrição, 500 do campo de tags): https://developers.google.com/youtube/v3/docs/videos
- Comentário fixado: https://support.google.com/youtube/answer/6000964
- Declaração "feito para crianças" (lida em 23/09/2026): https://support.google.com/youtube/answer/9528076

Limites de interface (truncagem de título e dobra da descrição) não têm página oficial.
Foram medidos em 22/09/2026 e valem como régua de trabalho, não como regra do YouTube. Se
a interface mudar, a régua muda, e a data acima é o que permite perceber isso.
