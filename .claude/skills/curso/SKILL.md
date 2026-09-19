---
name: curso
description: >
  Estrutura um curso, treinamento, mentoria ou workshop a partir do que o usuário sabe fazer:
  promessa (uma transformação, não um tema), pra quem e com que pré-requisito, módulos com o
  resultado de cada um, roteiro de cada aula em cinco blocos, material de apoio, formato de
  entrega e duração somada por comando. Inclui o teste "isso é curso ou é e-book" antes de
  gravar qualquer coisa. Preço vai pro /preco e a venda pro /lancamento.
  Use quando o usuário disser "quero fazer um curso", "vou dar um treinamento", "quero
  ensinar o que eu faço", "as pessoas vivem me perguntando como eu faço", "quero montar uma
  mentoria", "como organizo as aulas", "vou vender um curso online", "montar um treinamento
  pra minha equipe", "quero gravar aulas", "o que eu sei dá um curso?", ou /curso.
---

# /curso — Transformar o que você sabe em curso

> **Convenção de pastas:** a saída vai em `cursos/<slug>/` (`estrutura.md` e uma `aula-<NN>.md` por aula). Na convenção **por cliente**, `clientes/<Nome>/cursos/<slug>/`. A pasta nasce quando a estrutura é salva, nunca antes.

Quem sabe fazer alguma coisa bem recebe a mesma pergunta toda semana: "me ensina?". A
resposta comum é gravar vinte horas de tudo o que a pessoa sabe, na ordem em que aprendeu.
Ninguém termina. O que vende, e o que o aluno termina, é um caminho curto entre onde ele
está e uma coisa que ele consegue fazer no fim, com prova. Esta skill desenha esse caminho
antes de qualquer câmera ser ligada: promessa, pré-requisito, módulos, aulas, exercício e
duração, tudo escrito, e a decisão honesta de não fazer curso quando o que vende é um PDF.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o usuário faz, há quanto tempo, o que a clientela pergunta
- **Cliente real:** `_memoria/publico.md`, se existir — quem seria o aluno, na palavra dele. Sem isso, a promessa sai genérica, e vale oferecer `/publico` uma vez
- **Oferta:** `_memoria/oferta.md`, se existir — se o curso é a oferta, o que está prometido lá é o que as aulas precisam entregar
- **Tom:** `_memoria/preferencias.md` — roteiro de aula é fala; fala emprestada trava na gravação
- **Prova:** `biblioteca.md` — caso, número e depoimento que viram exemplo de aula
- **Molde:** `templates/crescimento/curso.md` — promessa, o teste curso ou e-book, verbos por módulo, taxonomia de exercício, duração por formato, abandono, direitos autorais
- **Ganchos:** `templates/copy/ganchos.md` — a abertura de cada aula segue a mesma régua de um post
- **Cálculo:** `node scripts/verificar.js tabela` (soma dos minutos por aula, por módulo e do curso) e `node scripts/verificar.js texto` (a estrutura e os roteiros saem sem cara de máquina)
- **Saída:** `cursos/<slug>/estrutura.md` e `cursos/<slug>/aula-<NN>.md`. O slug é o nome do curso em minúsculas com hífen (`fotografia-de-cardapio`, `caixa-em-uma-hora`)

---

## Workflow

### Passo 1 — Achar a transformação

Uma pergunta por vez. A primeira é a que quase ninguém responde de primeira:

> "Depois do curso, o que a pessoa consegue fazer que hoje ela não consegue?"

Se a resposta for um tema ("confeitaria", "marketing", "Excel"), devolver a pergunta com
o exemplo do molde: tema é o assunto, promessa é o verbo. Insistir até sair uma frase com
ação e resultado visível: "sair com três bolos de vitrine que ela vende no fim de semana".

Depois, na ordem, só o que ainda não ficou claro:

1. "Quem é essa pessoa hoje? O que ela já tentou e onde travou?"
2. "O que ela precisa ter ou saber antes de começar?" (programa, equipamento, base, dinheiro)
3. "Você já ensinou isso pra alguém, mesmo informalmente? O que a pessoa perguntou mais?"
4. "É pra vender, ou é pra sua equipe?"

A resposta 3 é ouro: as perguntas repetidas são os módulos, e a ordem em que apareceram
é a ordem das aulas. Anotar tudo. A resposta 4 muda o resto do workflow: treinamento
interno não passa pelo `/preco` nem pelo `/lancamento`, e o formato quase sempre é
presencial ou híbrido.

Ler `_memoria/publico.md` antes de fechar a promessa. Se o aluno é o mesmo cliente que
compra o serviço, a dor já está escrita lá, na palavra dele. Se é outra pessoa (o
concorrente, o iniciante, a equipe), dizer isso e anotar na estrutura.

### Passo 2 — O teste: é curso ou é e-book?

Antes de desenhar módulo, rodar as quatro perguntas do molde, em voz alta com o usuário:

1. A pessoa precisa **fazer** alguma coisa entre uma parte e outra?
2. Errar no meio muda o resultado?
3. Ela consegue conferir sozinha se acertou?
4. O que ela paga: o conteúdo ou o acompanhamento?

| Respostas | O que é | O que fazer |
|---|---|---|
| Não, não, sim, conteúdo | E-book, guia ou apostila | Parar aqui e chamar o `/documento`. Cobrar menos, vender mais vezes |
| Sim, sim, sim, conteúdo | Curso gravado com gabarito | Seguir, formato gravado |
| Sim, sim, não, os dois | Curso com correção (ao vivo ou híbrido) | Seguir, a correção entra na conta de horas |
| Sim, sim, não, acompanhamento | Mentoria | Seguir; módulos viram encontros e o número de alunos é pequeno |
| Uma sessão só, pra gerar contato | Aula aberta, live | `/evento` cuida do dia; se a sessão vende um curso, voltar aqui pra desenhar o curso |

Combinação que não está na tabela se decide pelas perguntas 1 e 3: se a pessoa precisa
fazer e não confere sozinha, é curso com correção; se não precisa fazer, é material, seja
qual for o resto.

Dizer o resultado em uma frase e o motivo. Quando o teste dá e-book, dizer isso com
clareza, mesmo que o usuário tenha chegado querendo curso: gravar aula de leitura de PDF
custa muito mais horas que o PDF e o aluno larga no meio. A decisão continua sendo dele.

### Passo 3 — Escolher o formato de entrega

Ler a tabela de formatos do molde e propor **um**, com o motivo em uma linha. O que decide
não é o gosto do professor; é onde o exercício acontece e quanta agenda ele tem:

| Se... | Formato |
|---|---|
| Exercício se corrige com gabarito e o usuário quer vender sem horário fixo | Gravado |
| Exercício precisa de correção e o usuário tem uma noite por semana | Ao vivo online |
| Conteúdo cabe gravado, mas a turma precisa de um encontro pra dúvida e correção | Híbrido |
| Precisa de mão, material físico ou espaço (cozinha, oficina, atendimento) | Presencial |
| Poucas pessoas, caso a caso, ao longo de semanas | Mentoria |
| Treinamento de equipe | Presencial ou híbrido, no horário de trabalho |

Perguntar, se ainda não souber: "Quantas horas por semana você tem pra isso, entre
preparar, dar aula e corrigir?". A resposta é o teto. Formato que não cabe no teto vira
curso pela metade.

### Passo 4 — Desenhar os módulos de trás pra frente

Começar pelo fim: o último módulo entrega a promessa inteira. Perguntar "o que a pessoa
precisa conseguir fazer **antes** disso?", e repetir até chegar no pré-requisito. O que
sai é a lista de módulos, na ordem certa, sem o módulo "introdução" que nunca entrega nada.

Regras do desenho, do molde:

- **Três a seis módulos.** Menos que três é aula, não curso; mais que seis é dois cursos
- **Cada módulo tem um resultado**, escrito com verbo que se observa (identificar, montar, calcular, publicar), nunca "entender" ou "conhecer"
- **Cada módulo tem um exercício-prova**: o que o aluno entrega pra mostrar que o resultado saiu
- **Os níveis sobem**: o primeiro módulo faz reconhecer e reproduzir, o do meio aplica no caso do aluno, o último cria
- **O módulo 1 entrega um resultado pequeno e completo** na primeira aula. É o que segura o aluno até o módulo 2

Mostrar a lista pro usuário e perguntar uma coisa só: "Tem algum módulo aqui que você
ensinaria diferente, ou que está faltando?". Ajustar e seguir. Estrutura aprovada em texto
antes de qualquer roteiro; mudar módulo depois de roteirizar dez aulas é retrabalho caro.

### Passo 5 — Roteirizar cada aula em cinco blocos

Primeiro a lista de aulas, depois o roteiro. Pra cada módulo, perguntar "o que a pessoa
precisa saber fazer pra entregar o exercício-prova?", e cada resposta vira uma aula com
um conceito só, na ordem em que o aluno precisa dele. Três a cinco aulas por módulo no
gravado; no ao vivo, um encontro costuma ser um módulo inteiro, com os conceitos em
sequência dentro dele. Mostrar a lista com nome e conceito de cada aula, aprovar, e só
então escrever.

Roteirizar a aula 1 primeiro e mostrar. O tom da aula 1 aprovada é o molde das outras:
escrever quinze aulas de uma vez e descobrir que o usuário não fala daquele jeito é
retrabalho que dá pra evitar com uma.

Cada aula tem um conceito e cinco blocos, do molde: **abertura** (o que o aluno vai
conseguir fazer no fim desta aula), **conceito** (a ideia, uma só), **exemplo** (o caso
real, com o erro comum ao lado), **exercício** (no nível do módulo) e **fechamento** (o que
ficou, o que fazer antes da próxima, a ponte).

O que escrever em cada aula:

- A abertura segue `templates/copy/ganchos.md`: primeira frase é a dor ou o resultado, na palavra do aluno, nunca "nessa aula vamos ver"
- O exemplo vem de `biblioteca.md` ou da experiência do usuário, com nome, número e o que deu errado. Se não houver, marcar `[preencher: qual caso você usaria aqui?]`. Nunca inventar caso
- O exercício tem enunciado, o que o aluno entrega, e o **critério de correção escrito**. No gravado, o gabarito entra na própria aula
- Minutos por bloco, numa tabela que soma a duração da aula

Aula gravada acima de 15 minutos tem dois conceitos: dividir. Encontro ao vivo acima de 90
minutos sem pausa: pôr a pausa. Pedir o material do aluno (foto, planilha, texto dele) já na
aula 1, porque o exercício de aplicação do módulo 2 depende disso.

Roteiro é fala. Escrever na voz de `_memoria/preferencias.md`, em frases que o usuário
diria olhando pra câmera, e conferir por comando antes de entregar:

```bash
node scripts/verificar.js texto "cursos/<slug>/aula-01.md"
```

### Passo 6 — Somar a duração

Duração não se estima. Três tabelas, cada uma somada por comando:

1. **Por aula:** os cinco blocos em minutos, com a linha `**Total**` no fim (vai no `aula-NN.md`)
2. **Por módulo:** as aulas do módulo, com `**Total do módulo**` (vai na `estrutura.md`)
3. **Do curso:** um módulo por linha, com aulas e minutos, e `**Total**` (vai na `estrutura.md`)

Nas tabelas que somam, nenhuma célula fora de "Minutos" e "Aulas" leva dígito: o
verificador soma qualquer coluna em que quase toda linha tem número, e "Aula 01" ou
"Módulo 2" viraria 1 ou 2 na soma. Nome de aula e de módulo vai sem número ("A janela é o
estúdio", não "Aula 01"), e quantidade dentro de nome ou conceito vai por extenso ("três
bolos", não "3 bolos"). O número da aula fica no nome do arquivo. A linha de total leva o
número em todas as colunas somáveis, inclusive a contagem de aulas.

```bash
node scripts/verificar.js tabela "cursos/<slug>/estrutura.md"
node scripts/verificar.js tabela "cursos/<slug>/aula-01.md"
```

Só seguir com "Tudo certo". Se divergir, refazer a partir dos minutos por bloco, nunca
ajustar o total. Depois, as horas, trocando os números do exemplo pelos da estrutura:

```bash
# horas de aula a partir do total de minutos
node -e 'const m=108; console.log((m/60).toFixed(1), "h de aula")'
# horas de turma por edição: encontros + correção por aluno × alunos
node -e 'const enc=8, corr=0.5, alunos=20; console.log(enc + corr*alunos, "h de turma")'
```

**Horas de produção** (gravado, híbrido): o multiplicador não se chuta. Instruir o usuário
a gravar a aula 1, cronometrar do roteiro ao corte final e dividir pelos minutos da aula.
Até isso existir, a estrutura mostra `[a confirmar com a aula 1 gravada]` no lugar do número.

**Horas de turma** (ao vivo, híbrido, mentoria, presencial): horas dos encontros mais
correção por aluno vezes número de alunos, pelo comando acima. A correção por aluno vem
do usuário ("quanto tempo você leva pra olhar o exercício de uma pessoa?"), não de
estimativa. É a conta que revela quando "turma de 40" não cabe na agenda que ele disse no
Passo 3: se o resultado passa do teto de horas por semana vezes as semanas da turma,
reduzir o número de alunos até caber, e é esse número que entra na estrutura como vaga.

### Passo 7 — Definir o material de apoio

Material serve à aula, não o contrário. Se o aluno consegue ler o material em vez de
assistir, o Passo 2 estava errado e o curso é e-book. Listar só o que o exercício exige:

| Material | Quando entra | Skill que produz |
|---|---|---|
| Apostila ou guia com o passo a passo e os checklists de correção | Curso com mais de três módulos, ou presencial | `/documento` |
| Slides de cada aula, uma ideia por slide | Ao vivo, híbrido e presencial; no gravado, só se a tela for o que aparece | `/apresentacao` |
| Vídeo curto de convite ou de resposta à objeção principal | Pré-venda e meio da janela do lançamento | `/video` |
| Modelo pra preencher (planilha, checklist, roteiro em branco) | Toda aula com exercício de aplicação | `/documento` ou arquivo simples na pasta do curso |
| Mensagens da semana pro grupo da turma | Ao vivo, híbrido, mentoria | `/whatsapp` |

Cada material vai na tabela da estrutura com a aula que o usa. Material sem aula que o use
não entra. A lista vira pendência antes da primeira turma, produzida pela skill dona de
cada peça quando o usuário pedir.

### Passo 8 — Escrever a estrutura e as aulas

`cursos/<slug>/estrutura.md`:

```markdown
# Curso — <nome>

## A promessa
[Uma frase: quem, de onde, pra onde. A mesma que vai na página de vendas.]

## Pra quem, e pra quem não
- É pra: [quem é a pessoa hoje, o que já tentou]
- Não é pra: [quem já faz isso / quem não tem o pré-requisito]
- Pré-requisito: [o que precisa ter ou saber antes, conferido na aula 1]

## Teste curso ou e-book
[As quatro respostas e a conclusão em uma linha]

## Formato e agenda
- Formato: gravado / ao vivo / híbrido / presencial / mentoria, e o motivo em uma linha
- Aulas ou encontros por semana:
- Duração da turma: N semanas, de <data> a <data>
- Horas por semana que o usuário tem (teto do Passo 3):
- Alunos que cabem na agenda: [conta do Passo 6]
- Plataforma ou espaço: [a confirmar]

## Módulos
### Módulo 1 — <nome>
Resultado: [verbo observável]
Exercício-prova: [o que o aluno entrega]
| Aula | Conceito | Exercício | Minutos |
|---|---|---|---|
| <nome da aula, sem número> | | | |
| **Total do módulo** | | | <soma> |

### Módulo 2 — ...

## Duração
| Módulo | Aulas | Minutos |
|---|---|---|
| <nome do módulo, sem número> | | |
| **Total** | <soma das aulas> | <soma dos minutos> |

Horas de aula: N h (minutos ÷ 60, por comando)
Horas de produção: [a confirmar com a aula 1 gravada]
Horas de turma por edição: N h (encontros + correção por aluno × alunos, por comando)

## Material de apoio
| Material | Aula que usa | Skill | Status |
|---|---|---|---|

## O que se promete e o que não pode
- Certificado: de participação, com carga horária [regra atual: a confirmar]
- Arrependimento: 7 dias (CDC art. 49) [texto em vigor: a confirmar]
- Garantia comercial, se houver: [da /oferta]
- Material de terceiro no curso: [lista, com licença ou crédito]

## Encaminhamentos
- Preço: /preco
- Venda da turma: /lancamento
- Página: /landing
- Depois da compra: /pos-venda

## Pendências antes da primeira turma
- [ ] Estrutura aprovada pelo usuário
- [ ] Aula 1 gravada e cronometrada (multiplicador de produção)
- [ ] Material de apoio da aula 1 pronto
- [ ] Termo de uso e aviso de gravação, se ao vivo
- [ ] Material de terceiro conferido

## O que aconteceu (preencher depois da turma)
| Indicador | Planejado | Real |
|---|---|---|
| Alunos na primeira aula | | |
| Última aula assistida pela maioria | | |
| Exercícios entregues | | |
| Concluíram | | |
| Horas reais de produção e correção | | |
```

A primeira coluna dessa tabela se chama "Indicador" de propósito: é a palavra que faz o
`verificar.js tabela` pular a soma, porque somar alunos com horas não significa nada.

Treinamento de equipe usa o mesmo esqueleto com duas trocas: "O que se promete" vira
"O que fica registrado" (lista de presença e o exercício-prova de cada um, pra saber quem
já faz sozinho), e "Encaminhamentos" aponta só pro material da aula 1 e pra mensagem
semanal da equipe, que sai pelo `/whatsapp`.

`cursos/<slug>/aula-<NN>.md`, uma por aula:

```markdown
# Aula <NN> — <nome>
Módulo: <N> · Conceito: <um só> · Nível: reconhecer / reproduzir / aplicar / criar

## Abertura (<min> min)
[Primeira frase na palavra do aluno. O que ele vai conseguir fazer no fim desta aula.]

## Conceito (<min> min)
[A ideia, explicada como se fosse pra um cliente. Fala, não texto de slide.]

## Exemplo (<min> min)
[Caso real: nome ou contexto, número, o erro comum ao lado. Fonte: biblioteca.md ou o usuário.]

## Exercício (<min> min)
Enunciado: [o que fazer]
Entrega: [o que o aluno mostra]
Critério de correção: [como saber que está bom, em 3 linhas]
Gabarito (gravado): [ ]

## Fechamento (<min> min)
[O que ficou. O que fazer antes da próxima. A ponte pra ela.]

## Na tela / material
- [slide, arquivo, modelo, o que aparece]

## Minutos
| Bloco | Minutos |
|---|---|
| Abertura | |
| Conceito | |
| Exemplo | |
| Exercício | |
| Fechamento | |
| **Total** | |
```

Depois de escrever, conferir tudo por comando: `tabela` na estrutura e em cada aula,
`texto` na estrutura e em cada aula. A promessa da estrutura é copiada, não redigitada,
pra `_memoria/oferta.md` quando o curso vira a oferta.

### Passo 9 — Encaminhar preço, venda e material

Esta skill não precifica e não vende. O que ela entrega pras vizinhas:

- **`/preco`** recebe a promessa, as horas de produção e de turma, e o número de alunos que cabe. Preço de curso se ancora na transformação, não na hora de vídeo, mas a hora precisa estar na conta pra saber o piso
- **`/oferta`** recebe a promessa e o que inclui, e decide bônus, garantia e motivo pra agora
- **`/lancamento`** recebe a data de início da turma, as vagas reais e a estrutura. O tipo quase sempre é semente na primeira turma (vender antes de gravar tudo) e interno na segunda
- **`/landing`** recebe a promessa palavra por palavra, o "pra quem não" e o pré-requisito. Promessa da página diferente da promessa da aula é a reclamação que vira reembolso
- **`/documento`**, **`/apresentacao`** e **`/video`** recebem a tabela de material, uma peça por vez
- **`/pos-venda`** recebe a lista de alunos na primeira aula e o D+30 de quem terminou

Perguntar se ele quer seguir agora pra alguma dessas, e qual. Se for vender, a ordem que
funciona é preço, oferta, lançamento. Se for treinar equipe, é material da aula 1.

### Passo 10 — Fechar o ciclo depois da primeira turma

Ao salvar a estrutura com a data de fim da turma, anotar em `tarefas.md` (`/tarefas`) uma
linha com a data de fim mais trinta dias: "fechar o ciclo do curso <slug>". Sem isso, a
segunda turma sai igual à primeira. Nesse dia, voltar pra preencher "O que aconteceu"
com o que a plataforma, o grupo e o cronômetro registraram. A última aula assistida pela maioria diz onde está o
defeito de desenho; os exercícios entregues dizem qual ficou grande demais. Isso muda a
estrutura da segunda turma, com o que mudou anotado em três linhas no fim do arquivo.

Depoimento com antes e depois vai pra `biblioteca.md` com nome, contexto e data. Horas
reais de produção e correção substituem o `[a confirmar]` e vão pro `/preco` na
próxima edição.

---

## Regras

- **Promessa antes de módulo, módulo antes de aula, aula antes de câmera.** Se o usuário chega com vinte aulas gravadas, o trabalho é reorganizar o que existe em cima de uma promessa, e dizer quais aulas não entram
- **Quando o teste dá e-book, dizer e-book.** Mesmo que ele tenha chegado querendo curso. A decisão é dele, mas o sistema não grava aula de leitura de PDF sem avisar
- **Um conceito por aula, um resultado por módulo, uma promessa por curso.** Quando não cabe, é mais uma aula, mais um módulo, ou outro curso
- **Verbo observável.** "Entender", "conhecer", "ter noção" não entram em resultado de módulo. Se o usuário insistir, perguntar "como você saberia que a pessoa entendeu?": a resposta é o verbo certo
- **Duração se soma por comando.** Nenhuma estrutura sai sem "Tudo certo" no `verificar.js tabela`. Multiplicador de produção é medido na aula 1, nunca chutado
- **Nunca inventar exemplo de aula.** Caso, número e nome vêm do usuário ou de `biblioteca.md`. Sem material, fica `[preencher]` e a pergunta volta pra ele
- **Não prometer resultado que depende do aluno.** "Vai faturar", "vai emagrecer", "vai passar" não entram na promessa nem na página. O que se promete é o que a aula entrega e o aluno prova no exercício
- **Vaga é número real.** O que vai pro `/lancamento` como vaga é o número de alunos que coube na conta de horas do Passo 6. Curso gravado quase nunca tem limite de vaga; se não tem, não se diz que tem
- **Não inventar regra legal.** Prazo de arrependimento, o que o certificado de curso livre pode dizer, exceções da Lei de Direitos Autorais: tudo entra como `[a confirmar]`, e vira pendência conferida com o usuário ou por WebSearch antes da primeira turma
- **Material de terceiro só com licença ou citação com crédito.** Slide, planilha, imagem, método com nome de outra pessoa não viram módulo. Reescrever a partir da experiência é diferente de copiar o arquivo
- **Fronteira com as vizinhas:** o material é `/documento`, os slides são `/apresentacao`, o vídeo curto é `/video`; o preço é `/preco`, a embalagem é `/oferta`, a venda da turma é `/lancamento`, a página é `/landing`; uma sessão aberta que gera contato é `/evento`, e quando o curso tem um workshop de captação, o `/evento` cuida do dia e esta skill do que se ensina; conteúdo de antecipação a partir das aulas é `/reaproveitar`; a série de mensagens pra quem entrou na lista é `/sequencia`; o depois de quem comprou é `/pos-venda`. Esta skill é a arquitetura pedagógica: o que se ensina, em que ordem, com que exercício, por quanto tempo
- **Aluno é dado pessoal (LGPD).** Lista de alunos, e-mail, CPF e o material que ele entrega no exercício não vão pra ferramenta externa sem autorização. Gravação de encontro ao vivo mostra rosto e voz: aviso antes de gravar, consentimento na inscrição, e a gravação circula só na turma
- **Uma pergunta por vez no Passo 1.** A da transformação sozinha já leva duas ou três voltas; junto com as outras, volta um tema e nenhuma promessa
- **Quando o resultado for ruim, dizer o resultado.** Turma de doze em que três terminaram é dado, não vergonha: é ele que aponta a aula que precisa mudar, e o "O que aconteceu" existe pra isso
