# Método de copy

Referência compartilhada. Toda skill que escreve peça que vende (post, anúncio, página, e-mail, mensagem, proposta, roteiro) passa por aqui antes da primeira frase. Os outros arquivos da pasta aprofundam cada parte:

| Arquivo | O que resolve |
|---|---|
| `templates/copy/ganchos.md` | a estrutura em quatro tempos e onde o gancho começa |
| `templates/copy/psicologia.md` | o que faz querer (pilares e motores) e o que facilita decidir |
| `templates/copy/formatos.md` | como cada canal muda a peça, com dado de plataforma datado |
| `templates/copy/edicao.md` e `templates/copy/humanizacao.md` | a revisão: clichê, gordura, estrutura de efeito, voz |
| `templates/copy/termos.md` | o jargão do mercado e o que dele se sustenta |

---

## O princípio

Copy ajuda uma pessoa a tomar uma decisão da qual ela já estava perto. Eugene Schwartz escreveu em 1966 que o texto canaliza um desejo que já existe em muita gente e aponta esse desejo para um produto. Por isso quem escreve começa procurando o desejo, a crença e a dor que o público já tem, e esse material mora em `_memoria/publico.md`.

Quatro consequências práticas:

- **Emoção abre, razão justifica.** A pessoa decide com sentimento e confiança na frente, e usa o argumento racional para explicar a escolha para si e para os outros (Damasio, 1994). O argumento entra, só que depois
- **Mudar crença custa caro.** Alinhar a oferta a uma crença que o público já tem sai mais barato do que tentar convencê-lo do contrário
- **Contexto pesa mais do que técnica.** A mesma frase acerta numa situação e machuca em outra
- **Persuasão é probabilidade.** Ninguém converte todo mundo. O trabalho é aumentar a chance de sim de quem está perto, e testar para descobrir o que aumenta mais (`/teste-ab`)

---

## 1. Diagnóstico: seis perguntas antes da primeira frase

| Pergunta | Por que muda a peça |
|---|---|
| **Onde vai aparecer e como é lida?** Feed no celular, página aberta com calma, conversa no WhatsApp | Define tamanho, ritmo, se tem som, quanto tempo a pessoa dá |
| **Qual a função?** Uma só: alcance, salvamento, autoridade, prova, quebra de objeção, comunidade ou conversão | Peça com duas funções entrega metade de cada |
| **Em que nível de consciência o público está?** Não sabe do problema, sabe do problema, conhece soluções, conhece o produto, está pronto | Decide onde o gancho começa (`templates/copy/ganchos.md`) |
| **Quantas promessas iguais ele já ouviu?** Os cinco estágios de sofisticação de Schwartz | Mercado cansado pede mecanismo novo ou identificação, e a promessa direta perde força |
| **Com que emoção a pessoa chega?** Medo, raiva, cansaço, empolgação, desconfiança, luto, vergonha | Decide o tom e o que nunca dizer |
| **Quanto a decisão arrisca?** Preço, tempo, identidade, o que os outros vão achar | Quanto mais cara ou pessoal a decisão, mais prova e mais texto ela pede |

Declarar a leitura em uma linha, visível pro usuário, antes de escrever: *"Estou lendo isso como: [peça] para [quem], que [nível de consciência], com função de [função]."* Custa cinco segundos e evita a peça certa para o público errado.

### Como as respostas mudam o caminho

- **Alcance:** gancho de identificação, curiosidade ou tribo, e conteúdo que a pessoa quer mandar para alguém. Envio por mensagem pesa mais para chegar em quem ainda não segue a conta. Chamada leve: seguir, enviar, comentar
- **Salvamento ou autoridade:** mecanismo, dado novo ou reenquadramento, em formato de consulta. Carrossel costuma liderar em salvamento
- **Prova ou quebra de objeção:** começa pela objeção com as palavras do público e responde com prova específica
- **Comunidade:** pertencimento, bastidor, linguagem interna, "a gente"
- **Conversão:** mecanismo, prova proporcional, barreira principal removida, oferta clara e uma chamada só. Funciona com público morno ou quente
- **Público frio** começa por identidade, cena ou curiosidade. **Público quente** começa pela prova ou pela oferta
- **Mercado saturado** (estágio 4 ou 5): entra com mecanismo novo ou identificação com o público
- **Estado emocional frágil:** tom de quem estende a mão, saída clara, e vergonha ou culpa nunca viram argumento
- **Risco alto:** mais prova, mais texto, garantia e uma falha admitida. **Risco baixo:** menos atrito e decisão rápida

---

## 2. As decisões, escritas antes do texto

Sete escolhas curtas. Cabem numa linha cada, e aparecem na entrega para o usuário discordar se quiser.

| Decisão | Opções | Onde aprofundar |
|---|---|---|
| **Função** | uma das sete acima | seção 1 |
| **Consciência** | os cinco níveis | `templates/copy/ganchos.md` |
| **Pilar que lidera** | necessidade, status, identidade | `templates/copy/psicologia.md` |
| **Motor ligado** | medo com saída, pertencimento, novidade real, inimigo em comum | `templates/copy/psicologia.md` |
| **Inimigo** | uma prática, um sistema ou um comportamento, com porta de saída | `templates/copy/psicologia.md` |
| **Emoção principal** | uma por peça, provocada por cena | seção 4 |
| **Barreira principal** | a que mais trava, com as palavras do público | seção 5 |

**Ângulo** é uma combinação diferente dessas escolhas: outro pilar, outro motor, outra dor, outro nível de consciência. Dois ângulos que só trocam palavras são o mesmo ângulo. Em anúncio isso pesa em dinheiro, porque a Meta agrupa criativos parecidos (`templates/copy/formatos.md`).

---

## 3. Pesquisa: o mínimo antes de escrever

A pesquisa descobre o que o público quer e como ele fala, e é a única defesa contra inventar. Gary Halbert dizia que a maior vantagem de quem vende é ter uma multidão faminta, e a escolha do público pesa mais do que a escolha da palavra.

**Ordem:**

1. O que já existe: `_memoria/publico.md`, `_memoria/oferta.md`, dossiês em `pesquisa/`, `biblioteca.md`
2. O produto: o que entrega de verdade, mecanismo, provas reais, limites e preço
3. A voz do cliente: frase literal da dor, com fonte (`/publico`)
4. A concorrência: o que prometem agora, os anúncios ativos na Biblioteca de Anúncios da Meta, o ângulo que todo mundo já usa e o que ninguém diz (`/concorrente`)
5. O momento: assunto da semana no nicho, data, sazonalidade. Referência cultural só depois de confirmar que ainda está viva
6. As regras da categoria: CDC, CONAR, ANVISA, conselho de classe (`/publicidade-regulada`)

**Profundidade, pelo tamanho da peça:**

| Peça | Mínimo |
|---|---|
| Post ou mensagem, com `publico.md` preenchido | ler a memória; buscar só o que mudou (assunto da semana, concorrente novo) |
| Post ou mensagem, sem `publico.md` | 5 a 8 buscas de voz do cliente, ou oferecer `/publico` uma vez |
| Anúncio, página, lançamento, oferta nova | 15 a 25 buscas separando voz do cliente, concorrência e momento, ou rodar `/pesquisa` antes |

**Cada achado recebe uma etiqueta:** fato verificado (fonte primária, dado do próprio cliente), fato secundário (fonte confiável que cita outra), hipótese (inferência a partir de padrão) ou não confirmado. Não confirmado fica fora da peça ou entra marcado `[a confirmar]`.

**Sem como pesquisar**, perguntar só o que o dono sabe e ninguém mais: o que vende, pra quem, por quanto, onde a venda fecha e qual objeção mais trava. O resto entra como hipótese, dito na entrega.

---

## 4. A leitura do contexto

A mesma mensagem muda de sentido conforme quem fala, quem ouve e onde. A ficha abaixo junta o esquema de comunicação de Jakobson (1960) e o modelo SPEAKING de Hymes (1972), reduzidos ao que muda a escrita.

| Ponto | Pergunta |
|---|---|
| **Quem fala** | Com que autoridade? Dono, especialista, cliente, a marca? |
| **Quem lê** | Idade, lugar, rotina, momento de vida, estado emocional provável |
| **A relação** | Primeira vez ou história antiga? De igual pra igual, de especialista pra leigo, de amigo pra amigo? |
| **Onde e como lê** | Com quanto tempo e quanta atenção |
| **O código** | Gíria, jargão, nível técnico, referências que ele reconhece |
| **As normas** | O que é educado, cafona, tabu ou motivo de orgulho pra esse público |
| **O tom** | Quatro réguas do Nielsen Norman Group: engraçado ou sério, formal ou casual, respeitoso ou irreverente, entusiasmado ou pé no chão. A voz da marca fica fixa (`preferencias.md`); o tom muda com o momento |
| **O ruído** | O que pode se meter entre o que a marca quis dizer e o que o leitor vai entender |

**Lentes que valem para toda peça:**

- **Uma briga só.** A peça compra a briga do inimigo escolhido e fica neutra em política, religião, futebol e tudo que divide o público sem servir à oferta
- **Palavra concreta.** Verbo de ação, número exato, objeto que dá pra ver. Lista pronta de "palavras poderosas" virou marca de texto genérico
- **Gatilho costurado como fato.** Os princípios de Cialdini funcionam quando são verdadeiros e aparecem dentro da história. Anunciados como tática, o leitor reconhece e desconta (Friestad e Wright, 1994)
- **Mesma promessa do anúncio ao pagamento.** Voz, vocabulário e oferta iguais em cada passo
- **Ironia só com quem divide o código.** Nunca em anúncio frio pra público amplo, nunca sobre a dor do leitor
- **Subtexto.** A conclusão que o leitor tira sozinho pesa mais pra ele (Aronson, 1999). Descrever a cena e deixar ele chegar lá
- **Micropercepção.** Erro de português, preço quebrado demais, depoimento genérico e emoji fora do tom derrubam a credibilidade na primeira impressão, que se forma em frações de segundo (Lindgaard e colegas, 2006)
- **Uma emoção principal por peça**, provocada por cena. Emoção provocada pesa mais do que emoção nomeada. Uma campanha cobre vários estados emocionais; uma peça escolhe um
- **Outro país:** escrever direto na língua de lá (transcriação), com moeda, medida, data e expressão locais, e entregar a versão em português ao lado. Cultura de baixo contexto, como a americana, pede promessa explícita e prova clara; o público brasileiro aceita mais calor e subtexto (Hall, 1976)

---

## 5. Revisão: barreiras e incentivos

Duas perguntas antes de entregar: **estamos tirando barreiras suficientes? Estamos colocando incentivos suficientes?** Na dúvida, tirar uma barreira rende mais do que somar um incentivo (modelo EAST do Behavioural Insights Team, 2014; Fogg, 2009).

| Barreiras comuns | Incentivos comuns |
|---|---|
| não entendi | resultado claro e perto no tempo |
| não confio | prova específica |
| tenho medo de errar | redução de risco: garantia, teste, primeira aula só olhando |
| parece caro | preço ancorado no valor, parcelamento com o total |
| dá trabalho | o próximo passo pequeno e óbvio |
| o que os outros vão pensar | gente parecida com ele que já fez |
| já gastei com outra coisa | permissão pra parar de insistir no que não funcionou |
| depois eu vejo | motivo real pra agir agora (turma com data, lote que acaba) |

**Texto e visual somam, ou brigam.** A imagem ou os primeiros segundos fazem o gancho, o texto na arte confirma a promessa, a legenda faz a exposição, e a chamada aparece igual na arte e no texto. Vídeo conta a história também em texto na tela, pra quem assiste sem som. A promessa do anúncio é a mesma da página seguinte.

---

## 6. Entrega

- As decisões numa linha: função, consciência, pilar, motor, inimigo, emoção, barreira
- O resumo da pesquisa em poucas frases, com fonte, quando houve pesquisa
- **De 3 a 5 ganchos e pelo menos 2 ângulos**, cada um com uma frase sobre a lógica dele, e **uma variação arriscada** que a marca nunca testou (marcada como tal)
- A peça em texto corrido, fora de bloco de código. Bloco de código deixa a copy com cara de instrução e atrapalha quem vai colar
- O que não tem fonte, marcado `[a confirmar]`

### Checklist antes de entregar

- [ ] Sei quem lê, onde, em que momento e em que estado emocional
- [ ] As palavras do público estão na peça
- [ ] Está claro qual pilar lidera e qual motor está ligado
- [ ] O inimigo é uma prática ou um sistema, com porta de saída pra quem está do outro lado
- [ ] A objeção mais forte de quem discorda aparece, com resposta
- [ ] O gancho para a rolagem e deixa vontade de continuar
- [ ] A exposição descreve a vida do leitor melhor do que ele descreveria
- [ ] A virada muda a leitura do problema, e a saída vem logo depois
- [ ] A solução tem mecanismo, prova proporcional à promessa e uma chamada só
- [ ] A barreira principal saiu do caminho
- [ ] Texto e visual contam a mesma história
- [ ] `node scripts/verificar.js texto` rodou limpo
- [ ] Um leitor cansado, no celular, entende de primeira
- [ ] Nada foi inventado

---

## 7. O limite

- **Nada inventado.** Número, depoimento, caso, resultado, prêmio e especificação têm fonte, ou ficam `[a confirmar]`
- **Nada de urgência falsa**, contador que reinicia, "últimas vagas" que nunca acabam. É prática enganosa documentada em mais de mil lojas online (Mathur e colegas, 2019) e publicidade enganosa pelo CDC (art. 37)
- **Luto, doença, trauma e desespero financeiro** nunca entram como argumento de venda
- **Vergonha é emoção arriscada.** Em quem já está envergonhado, o apelo de vergonha ativa defesa e produz o efeito contrário (Agrawal e Duhachek, 2010). Só com a saída na mesma frase
- **Nada de convencer o leitor de que ele não viveu o que viveu.** A virada oferece uma leitura nova pra algo que ele já percebe, e respeita a experiência dele
- **A promessa cabe no que o produto entrega.** Se só a técnica sustenta a venda, a oferta está fraca: voltar pro `/oferta`

**O teste final:** se o leitor soubesse exatamente como a peça foi montada, ele se sentiria respeitado? Se a resposta é não, a peça volta.

---

## Fontes

Schwartz, *Breakthrough Advertising* (1966) · Halbert, *The Boron Letters* (1984) · Damasio, *O Erro de Descartes* (1994) · Jakobson, "Linguistics and poetics" (1960) · Hymes, "Models of the interaction of language and social life" (1972) · Moran, "The four dimensions of tone of voice", Nielsen Norman Group (2016) · Friestad e Wright, "The persuasion knowledge model", *Journal of Consumer Research* (1994) · Aronson, "The power of self-persuasion", *American Psychologist* (1999) · Lindgaard e colegas, "Attention web designers: you have 50 milliseconds…", *Behaviour & Information Technology* (2006) · Hall, *Beyond Culture* (1976) · Behavioural Insights Team, *EAST* (2014) · Fogg, "A behavior model for persuasive design" (2009) · Mathur e colegas, "Dark patterns at scale", *Proc. ACM HCI* (2019) · Agrawal e Duhachek, "Emotional compatibility and the effectiveness of antidrinking messages", *Journal of Marketing Research* (2010) · Código de Defesa do Consumidor, art. 37.
