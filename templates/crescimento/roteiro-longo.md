# Roteiro de vídeo longo — ritmo, loop e quebra de padrão

Referência do `/roteiro-longo`. Não é o workflow: é o que a skill consulta pra montar roteiro
de 6 a 20 minutos com timecode calculado em vez de chutado. Vale pra aula gravada, entrevista,
tutorial, análise e vídeo de opinião — o que vive na página de assistir, com barra de
progresso.

Conferido em 23/09/2026, e cada número aparece na página que o link abre, não numa vizinha. O
que é prática de criador, sem estudo público por trás, está marcado como **prática**, e
prática aqui é régua de partida, nunca lei.

---

## 1. O ritmo de fala, que é a base de toda a conta

Duração de roteiro é uma divisão: palavras de fala ÷ palavras por minuto. O numerador o
script conta; o denominador varia por pessoa, e é aí que o chute entra.

| Situação | Palavras/min | Natureza | Fonte |
|---|---|---|---|
| Fala espontânea, adultos de MG, descrevendo uma figura | **90,25** | medido, 24 adultos fluentes | Costa, Martins-Reis e Celeste (2016), CoDAS 28(1):41-5 — scielo.br/j/codas/a/sTGZRHGzpSkLwLS6fZCyVLc |
| Apresentação, ritmo confortável | 100 a 150 | compilação | virtualspeech.com/blog/average-speaking-rate-words-per-minute |
| Conversa | 120 a 150 | compilação | mesma página |
| Podcast, rádio, audiolivro | 150 a 160 | compilação | mesma página |
| **Padrão do script** | **130** | escolha do sistema | dentro da faixa de apresentação confortável, bem acima dos 90 da fala espontânea; trocar pelo medido assim que houver transcrição |

O estudo em português mediu 24 adultos fluentes da região de Belo Horizonte descrevendo uma
figura, sem roteiro: 90,25 palavras/min (170,04 sílabas/min). É o piso de quem improvisa na
câmera, porque a pausa ali é procura de palavra; com roteiro a pausa vira pontuação e o número
sobe pra faixa de apresentação. Isso explica por que o mesmo texto dá nove minutos na boca de
uma pessoa e treze na de outra, e por que 130 é só um lugar de onde partir.

**A régua de verdade é a sua.** Com uma transcrição de vídeo já publicado e a duração real:

```bash
node scripts/tempo.js ritmo conteudo/transcricao-aula-3.txt --duracao 11:42
```

O comando devolve as palavras por minuto medidas e a linha pronta pro cabeçalho do roteiro, e
avisa quando o resultado cai fora de 90 a 200 palavras/min — quase sempre porque a duração
passada era de um trecho e a transcrição era do vídeo inteiro. Transcrição sai do
`scripts/transcrever.js`.

---

## 2. Vídeo longo tem outra gramática

O erro mais comum é escrever um vídeo de doze minutos como se fosse um Reels esticado.

| | Curto (`/video`) | Longo (esta skill) |
|---|---|---|
| Duração | 15 a 90s | 6 a 20 min |
| Corte | a cada 3 ou 4s | plano vive mais; a quebra é de assunto |
| Estrutura | gancho, um ponto, CTA | gancho, loops encadeados, fecho |
| O que segura | velocidade | a próxima coisa prometida |
| Onde morre | no primeiro segundo | no minuto dois, quando a promessa não andou |
| CTA | um, no fim | um, no meio, quando a pessoa já recebeu algo |

No curto, a pessoa decide continuar uma vez. No longo, ela decide dez vezes, e cada decisão
pede um motivo novo. Esse motivo tem nome: loop aberto.

---

## 3. Os 30 segundos de gancho

O YouTube publica, no relatório de momentos-chave de retenção, uma métrica chamada
**introdução**. A página de ajuda define assim: "Intro tells you what percentage of your
audience still watched your video after the first 30 seconds"
(support.google.com/youtube/answer/9314415, "Measure key moments for audience retention",
lida em 23/09/2026). Os 30 segundos não são meta inventada por criador: são o recorte que a
própria plataforma isola e devolve medido.

Anatomia que a skill usa: o "3-Step Hook Framework" de George Blackman, roteirista do canal do
Ali Abdaal (georgeblackman.com/write-on-time/my-3-step-framework-for-writing-killer-hooks,
lido em 23/09/2026). Pra conteúdo que ensina, que é quase todo vídeo de negócio:

- **Alvo** (*target*) — duas ou três frases que deixam claro pra quem é o vídeo e por que importa agora
- **Transformação** (*transformation*) — uma frase com o resultado concreto, em substantivo verificável ("você sai com o valor da sua hora calculado"), nunca "você vai entender melhor sobre"
- **Risco** (*stakes*) — uma frase com o que está em jogo: a conta que sai errada, o dinheiro que fica na mesa, a opinião impopular que você vai defender

Quando o vídeo não ensina nada — vlog, entrevista, reação, desafio — a mesma página troca as
duas primeiras: **personagem** (quem está na história) e **conceito** (qual é a brincadeira),
com o risco no mesmo lugar. Vídeo de opinião fica no meio: alvo e risco funcionam, e a
transformação vira a tese que você vai defender.

E mais uma coisa, que é o que separa gancho de promessa vazia: **entrega antecipada**. Um
pedaço de valor real dentro do gancho, antes de qualquer apresentação. O número, o antes e
depois, o print da planilha. Quem recebeu algo nos primeiros 30 segundos aceita esperar os
próximos 30.

O que não entra no gancho: "oi gente, tudo bem", nome do canal, pedido de inscrição,
agradecimento, resumo do que o vídeo vai falar. Tudo isso gasta tempo antes de dar motivo pra
ficar, e o script avisa acima de 30s e reprova acima de 45s.

**Escreva o gancho por último.** Escolha do sistema, e a razão é aritmética: o gancho promete
o melhor pedaço do vídeo, e antes de o corpo existir ninguém sabe qual pedaço é esse. Gancho
escrito primeiro promete o que o roteiro ainda não sabe entregar, e aí ou o gancho mente ou o
corpo vira reescrita. Escrever por último custa dez minutos; descobrir depois de gravar custa
a gravação.

---

## 4. Loop aberto: o motivo de continuar

Loop é uma promessa dita no meio da fala e paga mais tarde: "e tem uma linha que quase todo
mundo esquece de somar, eu mostro no fim". Fechar pergunta aberta é mais forte que
curiosidade genérica.

O ciclo é **preparação, tensão, pagamento** (*setup, tension, payoff*), que Blackman descreve
em georgeblackman.com/write-on-time/the-3-levels-of-youtube-scriptwriting: "Setup (explain why
the segment is important), Tension (gradually add information and build towards the reveal),
Payoff (reveal the exciting or important information)". Quantos ciclos o vídeo precisa não é
número decorado: sai da janela de 60 a 90 segundos da seção 5. Doze minutos ÷ 75 segundos dá
dez, e é essa divisão que o `node scripts/tempo.js orcamento` imprime antes da primeira linha.

Três regras que a skill segue:

- **Um loop por bloco**, aberto antes de o bloco terminar, e fechado no bloco seguinte ou no fecho
- **Loop que não fecha é armadilha.** A pessoa lembra, e o que fica é a sensação de ter sido enrolada
- **O último loop fecha no fecho**, não no CTA. Fechar loop e pedir inscrição na mesma frase transforma o pagamento em cobrança

---

## 5. Quebra de padrão a cada 60 a 90 segundos

A régua é do próprio Blackman, citado em "Write A Killer YouTube Script Like George
Blackman" (Nicolas Cole e Dickie Bush, Write With AI, 24/03/2024, lido em 23/09/2026):
"After the hook, it's important that your audience always has something to look forward to
in the next 60-90 seconds. I call these 'mini-payoffs.'" As coleções de skills de criador no
GitHub (AgriciDaniel/claude-youtube e ravsau/youtuber-skills) trabalham com a mesma janela.

É **prática**, não estudo revisado por pares. A skill não afirma que 90 segundos derrubam
retenção: afirma o que dá pra medir sem depender de crença, que é quanto tempo o vídeo passa
sem trocar nada, e onde. Quem discorda da janela muda `LACUNA_ERRO` no `tempo.js`, não o
roteiro.

Conta como quebra de padrão qualquer uma destas, marcada no roteiro:

| Marca | O que é | Conta como quebra |
|---|---|---|
| `[cena: …]` | muda o plano, a distância, o lugar | sim |
| `[dado: …]` | número na tela, com fonte | sim |
| `[historia: …]` | caso com começo, complicação e desfecho | sim |
| `[pergunta: …]` | pergunta jogada pra quem assiste | sim (o `?` na fala já conta) |
| `[demo: …]` | mostrar a tela, a mão, o produto funcionando | sim |
| `[grafico: …]` | gráfico, tabela, comparação visual | sim |
| `[tela: …]` | texto, print, imagem entrando | sim |
| `[loop: …]` | promessa aberta | não, é outra função |
| `[cta]` | a chamada | não |

```bash
node scripts/tempo.js medir conteudo/roteiro-<tema>-<data>/roteiro.md
```

Vão acima de 60s vira aviso, acima de 90s vira erro que derruba o código de saída, e a saída
nomeia o bloco em que o vão está: `03:12 → 04:48: 01:36 sem troca de cena, dado, história ou
pergunta (bloco "O problema")`. Consertar é mais fácil do que parece, porque o material já
está lá: o dado que você ia mencionar de passagem entra na tela, e a história resumida em meia
frase ganha trinta segundos.

---

## 6. O CTA no ponto certo

Retenção cai ao longo do vídeo, sempre. Colocar a única chamada no último minuto é falar
com a fração que sobrou, e é a fração que menos precisa ser convencida: ela já ficou.

- **Um CTA**, dois no máximo, e o primeiro antes de 70% da duração
- O ponto natural é **logo depois do primeiro pagamento grande**: a pessoa acabou de receber algo que valeu
- CTA específico e de um passo ("o link da planilha está na descrição, é de graça e não pede e-mail"), nunca a lista de quatro pedidos
- O fecho não é CTA: é fechar o último loop e dizer o que assistir depois

O script acusa CTA que aparece só nos últimos 10% do vídeo como erro, e avisa quando o
primeiro passa dos 70%.

---

## 7. O que aparece na tela

Cada bloco declara o que o espectador vê enquanto ouve, na linha `**Na tela:**`. Isso vira
lista de gravação e evita o vídeo de dez minutos com o mesmo plano parado.

- **Texto na tela em três a cinco palavras.** Ele reforça, não duplica a fala
- **Todo número dito aparece escrito**, com a fonte no canto. Número falado sem aparecer é número que ninguém confere
- Sem material de apoio, dois planos alternados já quebram a monotonia
- Legenda queimada no vídeo, porque boa parte assiste sem som

**Caso de cliente na tela tem lei.** Nome, rosto, print de conversa ou resultado de terceiro
num vídeo com fim comercial cai no art. 20 do Código Civil (Lei 10.406/2002) e, como dado
pessoal, no art. 7º, I, e no art. 8º da LGPD (Lei 13.709/2018): consentimento por escrito, pra
finalidade determinada, revogável a qualquer momento (art. 8º, § 5º). Vídeo fica anos no ar,
então a revogação precisa ser executável: dá pra tirar o vídeo. O termo sai do `/autorizacao`,
as fontes estão no fim desta página, e isto não é parecer de advogado.

---

## 8. Checklist de retenção, com a origem de cada régua

O `node scripts/tempo.js medir --checklist` devolve esta tabela preenchida com os números do
roteiro, pronta pra colar no fim do arquivo:

O script devolve quatro colunas: item, régua, como saiu (medido do arquivo) e situação, ok ou
rever. O que não cabe na saída do comando é a origem de cada régua, e ela está aqui:

| Item | Régua | Origem |
|---|---|---|
| Gancho paga a promessa | até 30s | métrica "introdução" do YouTube (seção 3) |
| Duração no alvo | ± 8%, e erro acima de 15% | escolha do sistema: 8% de 12 min é 58 segundos, o que ainda cabe na edição; 15% é um minuto e 48, e já é outro vídeo |
| Entrega antecipada | algo concreto até 90s | prática: é a primeira janela de mini-pagamento |
| Quebra de padrão | nenhum vão acima de 90s | prática (Blackman, seção 5) |
| Loop aberto | um por bloco de conteúdo | prática; a contagem sai da janela de 60 a 90s |
| CTA | o primeiro antes de 70% | consequência da queda de retenção, não fonte externa |

---

## 9. O que derruba retenção, na ordem em que aparece

1. **Gancho que promete o que o vídeo não entrega.** Derruba a retenção e o próximo vídeo do canal
2. **Aquecimento.** Apresentação, agradecimento, "antes de começar"
3. **Bloco longo sem quebra.** É o padrão do vídeo caseiro, e o script mede
4. **Loop aberto e não pago.** Fica a sensação de ter sido enrolado
5. **Assunto que muda sem aviso.** Quem assiste precisa saber que o bloco terminou
6. **Quatro pedidos no fim.** Curtir, comentar, se inscrever e compartilhar viram nenhum
7. **Fala lida.** Ler em voz alta antes de gravar é o teste mais barato que existe

---

## 10. Fronteira

Vertical de 15 a 90 segundos, com corte a cada 3 ou 4 segundos, é o `/video`: outra gramática,
outro molde. Título, descrição, capítulo e tag do upload são o `/publicar-video`. A curva de
retenção depois de publicado é o `/retencao-de-video`, e a regra que ele escreve em
`conteudo/retencao/regras.md` entra no roteiro seguinte antes de qualquer coisa. Aula de curso
com módulos é o `/curso`, que decide a sequência antes de existir roteiro.

---

## Fontes

- Costa, Martins-Reis e Celeste, "Metodologias de análise da velocidade de fala: um estudo piloto", CoDAS 2016;28(1):41-5 — https://www.scielo.br/j/codas/a/sTGZRHGzpSkLwLS6fZCyVLc/ (lido em 23/09/2026: 24 adultos fluentes, 90,25 palavras/min em fala espontânea)
- VirtualSpeech, "Average Speaking Rate and Words per Minute" — https://virtualspeech.com/blog/average-speaking-rate-words-per-minute (lido em 23/09/2026: apresentação 100-150, conversa 120-150, podcast e audiolivro 150-160)
- YouTube, "Measure key moments for audience retention" — https://support.google.com/youtube/answer/9314415 (lido em 23/09/2026: a métrica "intro" mede quem continua depois dos primeiros 30 segundos)
- George Blackman, "My 3-Step framework for writing killer hooks" (alvo, transformação, risco) — https://www.georgeblackman.com/write-on-time/my-3-step-framework-for-writing-killer-hooks (lido em 23/09/2026)
- George Blackman, "The 3 Levels of YouTube Scriptwriting" (preparação, tensão, pagamento) — https://www.georgeblackman.com/write-on-time/the-3-levels-of-youtube-scriptwriting (lido em 23/09/2026)
- Nicolas Cole e Dickie Bush, "Write A Killer YouTube Script Like George Blackman", 24/03/2024 (mini-pagamento a cada 60 a 90 segundos) — https://writewithai.substack.com/p/write-a-killer-youtube-script-like (lido em 23/09/2026)
- AgriciDaniel/claude-youtube — https://github.com/AgriciDaniel/claude-youtube (lido em 23/09/2026)
- ravsau/youtuber-skills — https://github.com/ravsau/youtuber-skills (lido em 23/09/2026)
- Código Civil, art. 20 (Lei 10.406/2002) — https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm (lido em 23/09/2026)
- LGPD, art. 7º, I, e art. 8º (Lei 13.709/2018) — https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm (lido em 23/09/2026)
