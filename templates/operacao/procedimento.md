# Procedimento — passar adiante o que só o dono sabe fazer

Referência do `/procedimento`. O `/whatsapp` e o `/responder-avaliacoes` leem a pasta
`operacao/procedimentos/` como regra de atendimento quando ela existe; o `/rotina` aponta
pra cá quando uma rotina passa a ser executada por outra pessoa.

Por que existe: o negócio de uma pessoa funciona porque essa pessoa está lá. Aí ela
contrata a primeira atendente, ou marca dez dias de férias, e descobre que "abrir a loja"
são vinte decisões pequenas que nunca foram ditas em voz alta. O procedimento é o jeito
de tirar isso da cabeça e pôr numa folha que outra pessoa consegue seguir sem ligar a cada
cinco minutos. Este arquivo guarda o método da entrevista, o formato da folha, o que o
lint confere e o que fica de fora.

---

## O que é uma folha, e o que não é

Uma folha por tarefa. "Abrir a loja", "atender reclamação", "fechar pedido no balcão",
"fechar o caixa do dia". Nunca "manual da loja": ninguém lê manual, e a folha que junta
tudo é a que envelhece primeiro.

A folha é um documento pra quem executa, não pra quem audita. Sem código de revisão
(POP-ATD-001), sem matriz RACI, sem referência normativa. O modelo corporativo de POP
lista dezenove elementos obrigatórios, em cinco grupos, da identificação ao controle
(sults.com.br/blog/procedimento-operacional-padrao-2, conferido em 23/09/2026); a padaria
usa cinco, e é o que funciona quando a pessoa está com a folha na mão e o cliente na frente.

Cinco coisas que toda folha tem:

1. **O cabeçalho** com quem executa, quem chamar, quando e quanto tempo leva
2. **Antes de começar**: acesso, senha, ferramenta, material. O que a pessoa precisa ter em mãos
3. **Os passos**, cada um com quem faz, critério de pronto e o que fazer se falhar
4. **Quando parar e me chamar**: a tabela que separa o que ela decide sozinha do que sobe
5. **Regra ou hábito**: o que é obrigatório e o que era só o jeito do dono

Duas coisas que a folha nunca tem: **senha escrita** (só onde ela está guardada e quem
dá) e **teste de conhecimento**. Ninguém aplica prova na atendente. Se ela não consegue
seguir a folha, o problema é da folha.

---

## A entrevista: confrontar, não transcrever

O dono descreve o processo do jeito que ele faz. Se o assistente só transcreve, sai uma
folha que funciona pra ele e pra mais ninguém. A entrevista tem quatro perguntas de
confronto, feitas passo a passo, uma por vez:

| Pergunta | O que ela revela |
|---|---|
| "Como você sabe que esse passo ficou pronto?" | O critério de pronto. Quase sempre está na cabeça ("eu olho e vejo"), e precisa virar algo que outra pessoa enxerga: "painel verde", "cliente confirmou por mensagem", "gaveta bate com o relatório" |
| "O que acontece se esse passo falhar?" | O passo fraco. Se a resposta é "nada", o passo pode sair. Se é "perco o dia", o passo precisa de "se falhar" escrito |
| "Quem confere?" | Se a resposta é "eu", e o dono vai tirar férias, o passo não tem conferência nenhuma. Ou muda quem confere, ou muda o critério pra ser autoconferível |
| "Isso é regra, ou é o seu jeito?" | A pergunta que mais encurta a folha. "Sempre abro a persiana antes de ligar a luz" é hábito. "Sempre confere o troco antes de abrir" é regra, porque a diferença some no caixa |

Regra é o que tem consequência quando não é feito: prejuízo, cliente perdido, multa,
risco pra alguém. Hábito é preferência do dono. Hábito pode ficar na folha, marcado como
hábito, mas nunca vira passo numerado, porque a pessoa nova precisa saber o que é
inegociável e o que ela pode fazer do jeito dela.

### Os sinais de passo fraco

Levantados nas entrevistas em que a folha voltou com dúvida da pessoa que executava:

- **Verbo vago**: "cuidar", "ver", "organizar", "dar atenção". O passo precisa de verbo
  que dá pra filmar: ligar, contar, anotar, conferir, mandar mensagem
- **Palavra de frequência sem número**: "periodicamente", "de vez em quando", "quando
  necessário", "regularmente". Vira "a cada 2 horas", "sempre que o estoque bater em 5"
- **Sujeito oculto**: "aí conferir o caixa". Quem confere? Se a folha tem duas pessoas,
  cada passo diz qual
- **Condicional pendurado**: "se o cliente reclamar, resolver". Resolver como? Até que
  ponto? Esse é o passo que vira linha na tabela de quando parar e chamar
- **Critério que só o dono enxerga**: "quando está do jeito certo", "quando fica bom".
  Perguntar: "se você tirasse uma foto do pronto, o que apareceria?"
- **Jargão da casa**: "fecha no sistema", "dá baixa". A pessoa nova não sabe qual
  sistema nem qual botão. O termo entra com a explicação na primeira vez que aparece

---

## As três pontas que travam delegação

O método do repositório procedure-ops e o do manual de POP da Sults convergem em três
coisas que a pessoa nova precisa ter e quase nunca recebe. A folha não sai sem elas.

**1. Acesso, senha e ferramenta.** A folha diz "lançar no sistema" e a pessoa não tem
login. A tabela "Antes de começar" lista cada coisa que ela precisa ter em mãos e onde
pega. Senha não vai escrita; vai o lugar ("envelope azul na gaveta do caixa") ou a
pessoa ("pedir pro Bruno, que cria o usuário dela"). Se o acesso ainda não existe, a
folha marca `[a confirmar] criar acesso do PDV` e isso vira item em `tarefas.md` antes da
primeira execução. A pendência vai nessa forma, com o texto fora do colchete, porque é
`[a confirmar]` puro que faz o `gerar-docx.js` recusar a exportação: escrito
`[a confirmar: criar acesso]`, ele escapa pro Word e chega assim na mão da pessoa.

**2. Critério de pronto por passo.** Cada passo termina com algo que a pessoa enxerga
sem perguntar. "Cliente atendido" não é critério. "Cliente respondeu 'ok' na conversa"
é. "Caixa fechado" não é. "Relatório impresso e valor bate com a gaveta, diferença zero
ou anotada" é. Passo sem critério de pronto é passo que a pessoa vai perguntar "tá bom
assim?" toda vez.

**3. A tabela de quando parar e me chamar.** É o que dá segurança pra pessoa nova
decidir sozinha o resto. Cada linha tem a situação, quem chamar (uma pessoa, com nome,
não "a gerência"), como chamar (ligação, mensagem, presencial) e o que fazer enquanto
espera. Sem ela, acontece uma de duas coisas: a pessoa liga pra tudo, e o dono não
descansa; ou ela decide o que não devia, e o prejuízo aparece uma semana depois.

Regra do procedure-ops que vale copiar: **um responsável nomeado por escalação**, nunca
"pergunte pro time". Se o dono está de férias, a folha diz quem é o substituto dele
naquela situação, com nome. O nome tem que existir na linha **Equipe:** de
`_memoria/empresa.md`, e isso vale pro dono também: é lá que o lint procura. Quem é de
fora da equipe (contador, técnico do PDV, socorro do fornecedor) entra no comando com
`--pessoa "Nome"`.

---

## Regra pra escrever cada passo

Do manual da Sults (sults.com.br/blog/procedimento-operacional-padrao-2, conferido em
23/09/2026), o que se aproveita pra negócio pequeno:

- Verbo no imperativo, na frente: "Ligar o alarme", não "o alarme deve ser ligado"
- Frase com menos de 20 palavras. Passo que precisa de duas frases é dois passos
- Número no lugar de palavra vaga: "em até 30 segundos", "a cada 2 horas", "5 unidades"
- Quem executa escreve junto. O manual aponta adesão três vezes maior quando o POP é
  escrito em par com quem opera, em vez de por quem olha de fora (Sults, conferido em
  23/09/2026). Folha em que a atendente disse "isso aqui eu faço diferente" e a diferença
  foi discutida é seguida; folha entregue pronta fica na gaveta
- Foto ou vídeo curto onde o texto não resolve: onde fica o disjuntor, como o painel
  fica quando está certo. O caminho do arquivo entra no passo

O que não se aproveita: código de documento, controle de versão por unidade, matriz de
responsabilidade, referência regulatória. Isso é pra rede de loja com auditoria. A folha
de negócio pequeno tem uma tabela de histórico no fim, com data e o que mudou, e basta.

---

## O formato da folha

O `scripts/procedimento.js` lê este formato. Título, cabeçalho em citação, e as seções
com esses nomes exatos:

```markdown
# Procedimento — <tarefa, com verbo>

> **Quem executa:** <papel (hoje: nome)>
> **Quem chamar:** <nome do dono ou substituto> · <como>
> **Quando:** <gatilho: dia e hora, ou o evento que dispara>
> **Leva:** <minutos>
> **Última revisão:** DD/MM/AAAA

## Pra que serve
<uma ou duas frases: o que dá errado quando isso não é feito, ou é feito de outro jeito>

## Antes de começar
| Precisa de | Onde pega / quem dá |
|---|---|

## Passos
| # | O que fazer | Quem | Pronto quando | Se falhar |
|---|---|---|---|---|

## Quando parar e me chamar
| Situação | Quem chamar | Como | Enquanto espera |
|---|---|---|---|

## Regra ou hábito
| Coisa | Regra ou hábito | Por quê |
|---|---|---|

## Histórico
| Data | O que mudou | Quem |
|---|---|---|
```

O que o lint confere, e por quê:

| Conferência | O que acusa | Por que importa |
|---|---|---|
| Passo sem "Quem" | célula vazia ou "alguém", "todos", "a equipe" | passo de todo mundo é passo de ninguém |
| Passo sem "Pronto quando" | célula vazia ou vaga ("quando estiver ok") | é o passo que gera a pergunta "tá bom assim?" |
| Palavra vaga no passo | "periodicamente", "quando necessário", "se precisar", "conforme o caso" | frequência sem número não é instrução |
| Escalação sem pessoa | "Quem chamar" que não bate com nome em `_memoria/empresa.md` | "chamar a gerência" não toca telefone de ninguém |
| Tabela de escalação vazia | nenhuma linha | folha sem ela é folha que ou trava a pessoa ou solta demais |
| "Antes de começar" vazio | nenhuma linha | quase toda tarefa precisa de pelo menos um acesso ou material |
| Senha escrita | linha que parece senha ("senha: 1234", "pin 0000") | senha não vai em arquivo versionado |
| Revisão velha | "Última revisão" há mais de 180 dias | folha de seis meses descreve uma loja que já mudou |
| Data que não existe | "Última revisão: 30/02/2026", ou data no futuro | data inventada é sinal de folha que ninguém revisou |
| Numeração com pulo | passos 1, 3, 4 | quem executa lê "faltou o 2" e para |
| Critério repetido | dois passos com o mesmo "Pronto quando" | um dos dois está descrevendo o pronto do outro |
| Passo longo | mais de 20 palavras em "O que fazer" | costuma ser dois passos grudados |
| Placeholder | `[a confirmar...]` | aceito como pendência; a folha não é entregue com ele |

---

## Entrada por pessoa em vez de por tarefa

"Contratei a Carla" e "vou viajar dia 10" são a mesma pergunta pelo outro lado: não "como
se faz X", mas "o que a Carla precisa saber pra loja funcionar". O caminho:

1. Listar tudo que essa pessoa vai fazer, ou tudo que para se o dono sumir dez dias
2. Ordenar pelo que trava primeiro: o que acontece todo dia vem antes do que acontece
   toda semana; o que envolve dinheiro ou cliente vem antes do que envolve organização
3. Escrever uma folha por item, começando pelo topo. Três folhas prontas antes da
   viagem valem mais que dez esboçadas
4. Gerar o índice (`node scripts/procedimento.js indice operacao/procedimentos/`) e
   entregar o índice pra pessoa, não a pasta

A folha não é o treinamento. É o que sobra depois dele. A pessoa executa junto com o
dono uma vez, com a folha na mão, e o que ela perguntou nessa execução vira correção da
folha no mesmo dia. Depois executa sozinha com o dono por perto. Na terceira, sozinha.
Do método de ensino do repositório de Matt Pocock, o que vale aqui: uma coisa por vez, a
pessoa demonstra que consegue antes de ganhar a próxima, e verificar sai mais barato do
que confiar.

---

## O que fica de fora desta referência

- **Criar skill pro assistente** a partir de uma rotina do dono é o `/mapear-rotinas`.
  Aqui a pessoa que executa é gente, não o cliente de IA
- **Ensinar pra fora**, com aula, módulo e promessa, é o `/curso`
- **Ordenar entregas de software** é o `/quebrar`
- **Salário, encargo e contrato de quem foi contratado** não moram aqui; a folha é o
  que a pessoa faz, não o que ela recebe

Fontes consultadas em 23/09/2026: github.com/charlesdove977/procedure-ops (escalação
com um responsável, critério de confirmação por passo, o que denuncia instrução vaga);
sults.com.br/blog/procedimento-operacional-padrao-2 (estrutura de POP, imperativo,
número no lugar de vago, quem executa escreve junto); github.com/mattpocock/skills,
docs/productivity/teach.md (uma conquista por sessão, verificar em vez de confiar).
