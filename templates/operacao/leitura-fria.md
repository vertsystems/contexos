# Leitura fria — quem abre a peça pela primeira vez

Referência do `/leitor-frio`. Também serve ao `/revisar` e ao `/conversao` quando a
auditoria deles bate no muro do "pra mim está claro".

Por que existe: quem escreveu a peça é a última pessoa capaz de dizer se ela se explica.
O autor já sabe o que a frase quer dizer, então ele lê a intenção, não o texto. Esse é o
ponto cego que nenhuma releitura resolve. Este arquivo guarda o método de trazer alguém
que nunca viu a peça, o que perguntar pra essa pessoa, e como separar tropeço de verdade
de opinião solta.

---

## O que a releitura do autor não alcança

A skill `doc-coauthoring` da Anthropic resolve isso com uma instância limpa: o passo manda
testar o documento com um assistente novo, sem o contexto da conversa vazando, pra verificar
se ele funciona pra quem lê, e o teste roda só com o conteúdo do documento e a pergunta. O
resultado que ela reivindica não é um documento mais bonito: é um documento sem lacuna
que o autor sozinho não veria. Fonte:
https://raw.githubusercontent.com/anthropics/skills/main/skills/doc-coauthoring/SKILL.md
(conferido em 23/09/2026).

Editora faz o mesmo há décadas, com outro nome: manda o original pra quem não participou
da escrita. Revisor de pitch deck trabalha igual, prevendo a objeção de quem vai ler
frio, como no `pitch-deck-reviewer` da OneWave
(https://github.com/OneWave-AI/claude-skills/blob/main/pitch-deck-reviewer/SKILL.md,
conferido em 23/09/2026). A ideia é velha. O que mudou é o custo: montar cinco leitores e
ouvir cinco leituras agora leva minutos.

**A regra que sustenta tudo:** o leitor frio não recebe contexto. Nada de "essa proposta é
pra padaria, o serviço é implantação de controle de caixa, o dono já conversou com ela
ontem". Ele recebe a peça e as perguntas. Se a peça precisa de introdução pra funcionar,
ela não funciona, e é exatamente isso que se quer descobrir.

---

## O que isso não é

**Não é revisão de texto.** O `/revisar` corta gordura e clichê com todo o contexto na
mão. Aqui ninguém corrige nada: cinco pessoas contam onde travaram.

**Não é pesquisa com cliente de verdade.** Leitor frio é construído a partir de
`_memoria/publico.md`, que por sua vez veio de gente real. É uma camada de distância do
original. Serve pra achar tropeço óbvio que o autor não vê; não serve pra provar que o
público aprova a oferta.

**Não é votação.** Três leitores acharem a cor feia não muda a cor. O que conta é
tropeço: ponto em que a leitura parou, com a frase citada.

---

## Como se monta um leitor frio

Cada leitor tem quatro campos, e todos os quatro saem de `_memoria/publico.md`. Inventar
qualquer um deles transforma a leitura fria em teatro.

| Campo | De onde sai | Pra que serve |
|---|---|---|
| **Vocabulário** | a frase literal da dor, no arquivo do público | é o que decide se um termo da peça é jargão ou palavra de casa |
| **Objeção** | a lista de objeções do público | é o que faz o leitor parar num lugar específico |
| **Situação de leitura** | o gatilho, o canal de origem | ler no ônibus às 22h é diferente de ler no computador da empresa |
| **Próximo passo natural** | o que a pessoa fez antes de comprar | dá sentido à resposta "o que eu faria agora" |

Três a cinco leitores. Abaixo de três, não há cruzamento, e tudo que aparece fica no
terreno do gosto. Acima de cinco, a leitura começa a se repetir e o arquivo de saída
incha sem ganhar nada.

### O apressado no celular é obrigatório

Esse entra sempre, em qualquer negócio, qualquer peça. A ficha dele:

> Abre a peça no celular, em pé, com o aplicativo de mensagem abrindo por cima. Dá cinco
> segundos pra entender pra que serve. Não rola a tela por curiosidade: rola quando algo
> na primeira dobra deu motivo. Se não deu, fecha. Não pede esclarecimento, não pergunta
> nada, e não volta depois.

Ele é obrigatório porque é o leitor mais comum e o menos considerado na escrita. Quem
escreve imagina alguém sentado, atento, disposto. Não é quem chega.

### Sem `_memoria/publico.md`

Dá pra rodar com dois leitores genéricos, e a leitura vale menos. Isso fica escrito no
arquivo de saída, com essas palavras. Os dois genéricos:

- **O apressado no celular** — a ficha acima, sem adaptação
- **O desconfiado que já foi mal atendido** — leu promessa parecida antes, não cumpriram,
  e agora procura na peça o sinal de que vai acontecer de novo. Repara no que está vago,
  no prazo sem data e na garantia sem condição

Depois de rodar assim uma vez, o caminho é `/publico`. A diferença entre a leitura com
dois genéricos e a leitura com cinco perfis reais é grande, e ela aparece na primeira
comparação.

---

## As cinco perguntas

Sempre as mesmas cinco, na mesma ordem, e em primeira pessoa.

1. **O que eu entendi em 5 segundos?** Pega a promessa. Se o leitor descreve outra coisa,
   a primeira dobra está falando do assunto errado
2. **Onde eu parei?** Pede a frase exata, copiada. É a pergunta que produz a correção
3. **O que eu achei que custava?** O chute revela como a peça ancora valor. Chute muito
   abaixo significa que ela se vendeu como coisa simples; muito acima, que assustou
4. **Qual dúvida sobrou?** Objeção não respondida, em estado puro
5. **O que eu faria agora?** A resposta honesta costuma ser "nada" ou "fechava a aba", e é
   a única métrica de conversão que existe antes de publicar

A ordem importa. Perguntar o preço antes de perguntar onde parou fabrica uma leitura mais
atenta do que a real, porque o leitor volta ao texto pra procurar número.

---

## O que nunca entra no briefing do leitor

Contaminação estraga a leitura inteira, e ela vaza por caminhos previsíveis:

- **O objetivo da peça.** "Essa página quer gerar pedido de orçamento" ensina a resposta 5
- **O nome do cliente ou do serviço** fora do que a própria peça diz
- **A conversa da sessão**: histórico, briefing, o que o dono explicou no chat
- **Correção já feita.** "Na versão anterior o preço estava escondido" faz o leitor ir
  caçar preço
- **Outro leitor.** Cada um responde sem ver as respostas dos demais, senão o segundo
  concorda com o primeiro

O que entra: a peça inteira, a ficha do leitor, as cinco perguntas. Nada mais.

---

## Régua de tempo e de atenção

| Medida | Número | Fonte |
|---|---|---|
| Leitura silenciosa de prosa informativa, adulto | 238 palavras por minuto | Brysbaert (2019), meta-análise de 190 estudos e 18.573 participantes, Journal of Memory and Language v109 — https://biblio.ugent.be/publication/8647789 (conferido em 23/09/2026). Ficção, na mesma fonte, dá 260 |
| Quanto cabe em 5 segundos | ~20 palavras (238 ÷ 60 × 5) | cálculo direto da linha acima |
| Palavras de uma página que o visitante chega a ler | no máximo 28%, e 20% é mais provável | Nielsen Norman Group, a partir de Weinreich, Obendorf, Herder e Mayer, ACM Transactions on the Web v2 n1 (2008) — https://www.nngroup.com/articles/how-little-do-users-read/ (conferido em 23/09/2026) |

Os dois números vêm de estudo em inglês. Servem de ordem de grandeza pro português, não
de medida fina. O que eles sustentam é modesto e útil: a peça tem umas vinte palavras pra
se explicar, e o leitor não vai ler quatro quintos do que está ali.

---

## Léxico de tropeço

Seis tipos cobrem quase tudo que aparece. Nomear ajuda a escrever a correção.

| Tropeço | Como aparece na resposta do leitor | Correção típica |
|---|---|---|
| **Jargão** | "não sei o que é isso" | trocar pela palavra do público, que está em `_memoria/publico.md` |
| **Promessa vaga** | "entendi que vão ajudar, mas ajudar em quê" | trocar adjetivo por número, prazo ou objeto |
| **Preço escondido** | chute distante do real, ou "não achei quanto custa" | faixa de preço antes da metade da peça |
| **Convite ausente ou tardio** | "não sei o que fazer com isso" | um convite claro na primeira dobra, repetido no fim |
| **Ordem errada** | "só entendi na terceira vez que li" | o que a peça faz vai na frente do porquê e do como |
| **Prova ausente** | "e se não der certo" | depoimento com nome, número real, garantia com condição escrita |

---

## Quando dois leitores no mesmo ponto é defeito

Dois é o limiar, e ele tem exceções que precisam de olho:

- **Dois leitores com a mesma ficha** não são dois. Se o apressado no celular e o
  apressado no ônibus travaram no mesmo termo, é um leitor contado duas vezes
- **Dois leitores travando por motivos opostos** na mesma frase é sinal mais forte, não
  mais fraco. A frase está ambígua
- **Um único leitor travando no preço** já conta, quando o chute dele ficou longe. Preço é
  o campo em que um erro sozinho custa dinheiro
- **Tropeço que o dono defende** fica no arquivo. Ele decide não consertar; a anotação
  continua lá, com a data. Na próxima leitura fria a gente confere se voltou

---

## O que o script mede, e o que ele não mede

`node scripts/leitor-frio.js medir <peça>` conta distância: palavras até o primeiro
convite a agir, posição da primeira menção a preço, tempo total de leitura e as vinte
palavras que caberiam nos cinco segundos. `cruzar` agrupa as respostas pela frase citada,
mostra quem travou onde e confere que cada citação existe na peça de verdade.

Duas decisões dentro do comando valem ser conhecidas, porque explicam resultado que à
primeira vista parece errado:

- **O que conta como convite em HTML.** Botão, link com classe de botão e link que aponta
  pra conversa, compra ou agenda. Link de menu e de rodapé não conta. Contar todo link
  fazia o logotipo do cabeçalho virar "convite na palavra 2", e a peça passava medindo bem
  justamente por estar mal resolvida
- **Como a citação é conferida.** Frase e peça são reduzidas ao mesmo esqueleto: sem
  acento, sem maiúscula, sem pontuação, sem espaço dobrado. Sem isso, um travessão no meio
  da frase citada bastava pra uma citação legítima ser acusada de inventada, e o comando
  derrubava a leitura por engano

Nada disso julga o texto. Uma peça pode ter o convite na palavra dez e continuar
incompreensível. O que a medida faz é tirar da conversa a parte que era chute: quando o
dono diz "o preço está bem visível" e o comando mostra que ele aparece a 93% do texto, a
discussão termina ali.

A citação conferida existe por um motivo específico. Leitor simulado inventa frase que
soa plausível, e correção escrita em cima de frase inventada estraga a peça. O comando sai
com erro nesse caso, tira aquele ponto do relatório e mostra quem o citou. O resto das
respostas do leitor continua valendo: o que caiu foi a parada, não a leitura inteira.

---

## Limites que precisam estar escritos na saída

- Leitor frio é construção a partir do arquivo do público. Não é cliente
- Cinco leituras não substituem uma pessoa de fora lendo de verdade. Quando o dono tem
  alguém à mão, o caminho continua sendo essa pessoa
- A leitura mede compreensão, não intenção de compra
- Peça com restrição legal (saúde, jurídico, financeiro, alimentar) tem outra camada de
  conferência, e ela é `/publicidade-regulada`, não esta. Leitor entender a promessa não
  quer dizer que ela seja permitida, e isso quem responde é o conselho da categoria ou um
  advogado
- A correção sugerida troca palavra. Quando o tropeço é falta de prova, ela diz que falta
  prova; não escreve depoimento, número de resultado nem prazo que o dono não deu
