# Humanização — tirar a cara de máquina

Referência do `/humanizar`, consultada por toda skill que escreve.

A `edicao.md` lista as **palavras** que denunciam texto gerado. Este arquivo trata do
que sobra depois que elas saem: o texto sem nenhum clichê, gramaticalmente perfeito, e
que mesmo assim soa como máquina. O problema aí não é vocabulário. É ritmo, estrutura e
ausência de quem escreveu.

---

## O que isso não é

**Não é sobre enganar detector de IA.** Esses detectores erram nas duas direções: acusam
texto humano bem escrito e liberam texto gerado com pequenos ajustes. Nenhum deles
publica taxa de erro que sobreviva a teste independente. Prometer aprovação em detector
é vender o que ninguém controla.

O objetivo é outro, e esse dá para entregar: **texto que uma pessoa reconheça como
escrito por alguém.** Se o resultado passar em algum detector, ótimo. É consequência,
não meta.

---

## A régua (medida, não opinada)

Números levantados com `node scripts/verificar.js texto` em quatro tipos de texto:

| | variação do ritmo | frases curtas (até 8 palavras) |
|---|---|---|
| Texto de blog gerado | **0,13** | **0%** |
| Texto promocional gerado | **0,26** | **10%** |
| Texto com voz de dono | 0,64 | 40% |
| Prosa do Contex OS (75 arquivos) | 0,45 a 1,29 | 17% a 61% |

Daí saem as duas réguas do comando: **variação acima de 0,45** e **pelo menos 15% de
frases curtas**. A separação é limpa: o que sai de máquina fica entre 0,13 e 0,26, o
que tem voz fica acima de 0,45. Ainda assim a contagem de clichê roda em paralelo,
porque um sinal sozinho não decide nada.

### O que o medidor não conta

Cada uma dessas isenções entrou depois de o comando acusar texto correto:

- **Título** não é frase. Enquanto entrava, `## O que é isso` contava como frase curta
  e um arquivo cheio de subtítulo passava sem ter uma única no corpo
- **Item de lista** não entra no ritmo (não tem cadência de frase), nem no paralelismo
  (abrir itens com a mesma palavra é bom estilo). As continuações indentadas do item
  saem junto, senão viram frases cortadas pela metade
- **Travessão de definição** é estrutura, nas três formas: item de lista, item dentro de
  citação e rótulo em negrito abrindo a linha. Só o retórico, no meio do parágrafo, conta
- **Clichê citado** entre aspas, ou enumerado depois de um rótulo, está sendo ensinado
  e não usado. É o formato das listas da `edicao.md`, que sem essa isenção reprovaria
  por ensinar a lista negra
- **Comentário HTML, CSS e JavaScript** não são texto publicado
- **Bullet em negrito** sozinho é sinal fraco: material de referência usa
  `- **termo** — definição` com razão. Vira problema quando aparece junto de ritmo
  uniforme ou clichê

---

## Os quatro sinais estruturais

### 1. Ritmo uniforme

Máquina escreve frases do mesmo tamanho, entre 15 e 22 palavras, uma atrás da outra. O
efeito é hipnótico no sentido ruim: o olho desliza e nada fica.

Gente escreve desigual. Uma frase de 30 palavras que explica, e logo depois quatro
palavras que cravam. Assim.

### 2. Estrutura previsível

Três vícios que aparecem juntos:

- **Abre anunciando** o que vai dizer ("Neste artigo, vamos explorar")
- **Enfileira com conectivo**: "Além disso", "Por outro lado", "Por fim" abrindo
  parágrafos em sequência. É a espinha da redação escolar
- **Fecha resumindo** o que já foi dito ("Em suma", "Como vimos")

Os três somem sem prejuízo. Um texto que começa no assunto e termina na última coisa que
tinha a dizer é mais forte do que um com moldura.

### 3. Especificidade zero

O sinal mais fundo, e o que quase ninguém corrige. Texto gerado fala de "estratégias
eficientes", "resultados consistentes" e "atendimento de qualidade": palavras que
servem para padaria, clínica e software ao mesmo tempo. Nenhuma delas pode ser
conferida por ninguém.

Texto de gente carrega coisa que só quem estava lá sabe: o valor quebrado, o dia da
semana, o nome do fornecedor, o que deu errado na terça.

### 4. Neutralidade

Máquina não tem opinião, então hesita: "pode ser interessante considerar", "em muitos
casos", "geralmente é recomendável". Quem trabalha na área tem posição, e posição custa
alguma coisa: exclui um tipo de cliente, contraria uma prática comum.

Texto que não arrisca nada não convence ninguém.

---

## As sete manobras

O que fazer, na ordem em que muda mais.

**1. Corte o aquecimento.** O primeiro parágrafo é quase sempre a máquina pigarreando.
Comece no segundo e leia de novo: em nove de dez casos, não faltou nada.

**2. Uma frase curta de verdade.** Não de 12 palavras. De três, quatro. Ela quebra o
embalo e obriga o leitor a parar. É o conserto mais barato que existe.

**3. Troque um genérico por um verificável.** "Muitos clientes" vira "onze dos catorze
clientes do mês passado". Número quebrado vale mais que número redondo, e só entra se
for verdade (ver o aviso no fim).

**4. Assuma a posição.** Tire o "pode ser interessante". Se a recomendação é essa,
escreva a recomendação. Se tem exceção, nomeie a exceção em vez de diluir a regra.

**5. Use a palavra do cliente.** De `_memoria/publico.md`. Se ele diz "estraga", não
escreva "perde a validade". A palavra dele é a única que ele procura no Google e a única
que ele reconhece na legenda.

**6. Quebre o paralelismo.** Três frases seguidas com a mesma forma denunciam mais que
qualquer palavra. Reescreva uma delas em outra estrutura: vire pergunta, junte com a
anterior, corte.

**7. Deixe a digital do autor.** Uma frase que só aquela pessoa escreveria: uma
implicância, um caso de dois anos atrás, a comparação que ela sempre faz. É o que
nenhum modelo tem, e é o que faz o leitor lembrar de quem leu.

---

## O que nunca fazer ao humanizar

- **Inventar detalhe para parecer específico.** É a tentação central desta skill, e é
  onde ela vira mentira: nome de cliente, valor, data e história precisam vir do usuário
  ou de `_memoria/`. Sem material, o certo é marcar `[preencher: qual foi o caso?]` e
  devolver a pergunta
- **Errar de propósito** — vírgula fora do lugar, concordância torta, "né" plantado. Não
  vira humano, vira desleixado, e o cliente lê como falta de cuidado
- **Trocar a voz do usuário pela voz de um redator.** A régua é `preferencias.md`, com o
  exemplo de escrita real dele. Se ele escreve seco, o texto sai seco
- **Enfeitar.** Metáfora nova, aliteração e frase de efeito são a versão literária do
  mesmo problema: enfeite no lugar de conteúdo
- **Perder informação no caminho.** Humanizar não é resumir. Se o texto encolheu 40%, ou
  havia gordura (aí é trabalho do `/revisar`) ou sumiu conteúdo

---

## O que não se humaniza

Nem todo texto quer voz. Manter seco e padronizado:

- Contrato, termo, política de privacidade, texto legal
- Instrução de segurança, dosagem, prazo de validade
- Especificação técnica, ficha de produto, tabela de dados
- Resposta automática de sistema ("Pedido 4820 confirmado")

Nesses, previsibilidade é qualidade. Humanizar aqui é piorar.

---

## Antes de entregar

```bash
node scripts/verificar.js texto <arquivo>
```

O comando conta clichê, mede o ritmo e a proporção de frases curtas, e aponta travessão
em excesso e bullet em negrito. Ele não lê sentido: texto pode passar em tudo e ainda
estar sem graça. O que ele garante é que os sinais mecânicos saíram.

E a pergunta final, que nenhum comando responde: **tem alguma coisa aqui que só essa
pessoa poderia ter escrito?** Se não tem, o texto ainda é de máquina.
