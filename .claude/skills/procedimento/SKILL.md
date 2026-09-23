---
name: procedimento
description: >
  Tira da cabeça do dono um processo que só ele sabe fazer (abrir a loja, atender reclamação,
  fechar pedido, fechar o caixa) e escreve a folha que outra pessoa segue sem ligar a cada
  cinco minutos: quem faz cada passo, como ela sabe que ficou pronto, o que precisa ter em
  mãos (acesso, senha, ferramenta) e a tabela de quando parar e chamar o dono. Uma folha por
  tarefa, em markdown e em Word, conferida por comando.
  Use quando o usuário disser "contratei alguém e preciso ensinar", "vou tirar férias e a
  loja não funciona sem mim", "como eu passo isso pra atendente", "escreve o passo a passo
  de abrir a loja", "toda hora me ligam perguntando", "quero delegar isso", "faz um POP",
  "documenta como eu faço", "o que a pessoa nova precisa saber", "manual pra funcionário",
  ou /procedimento.
---

# /procedimento — Passar adiante o que só você sabe fazer

> **Convenção de pastas:** a saída vai em `operacao/procedimentos/<tarefa>.md`, com o `.docx` ao lado. Na convenção **por cliente**, o procedimento da própria casa fica na raiz (`operacao/procedimentos/`) e o escrito pra equipe de um cliente vai em `clientes/<Nome>/operacao/procedimentos/`. A pasta nasce na primeira folha.

O negócio de uma pessoa funciona porque essa pessoa está lá. Aí ela contrata a primeira
atendente, ou marca dez dias de férias, e descobre que "abrir a loja" são vinte decisões
pequenas que nunca foram ditas em voz alta: o alarme tem 30 segundos, o troco é R$ 150,
o Ednaldo chega às 5h e quando não chega alguém precisa ligar. A pessoa nova não sabe
nada disso. Então liga. Esta skill faz a entrevista que tira isso da cabeça do dono,
confronta o passo fraco, separa o que é regra do que era só o jeito dele, e entrega uma
folha por tarefa que a pessoa segue sozinha. O quiz fica de fora: ninguém aplica prova na
atendente. Se ela não consegue seguir a folha, o problema é da folha.

## Dependências

- **Contexto:** `_memoria/empresa.md` — equipe (nome de quem executa e de quem é chamado), ferramentas, horário. É contra a linha **Equipe** que o lint confere a escalação
- **Tom:** `_memoria/preferencias.md` — a folha é lida por alguém da casa; voz emprestada de manual corporativo faz a pessoa parar de ler
- **Pipeline:** `tarefas.md` — acesso que ainda não existe, treinamento marcado e revisão da folha entram lá
- **Molde:** `templates/operacao/procedimento.md` — o método da entrevista, os sinais de passo fraco, as três pontas que travam delegação, o formato exato da folha e o que o lint confere
- **Script:** `scripts/procedimento.js` — `modelo` gera o esqueleto, o lint confere responsável e critério por passo e a escalação contra a equipe (`--pessoa "Nome"` pra quem é de fora dela, `--empresa` pra apontar outra memória, `--json` pra encadear), `indice` monta a lista de folhas
- **Word:** `scripts/gerar-docx.js`, pelo `/word` — a versão que vai impressa pro balcão ou pro grupo da equipe
- **Conferência:** `node scripts/verificar.js segredo` (senha não vai em arquivo) e `texto` (o "Pra que serve" sem cara de máquina)
- **Saída:** `operacao/procedimentos/<slug-da-tarefa>.md` e `.docx` ao lado; `operacao/procedimentos/indice.md` quando há mais de uma folha

---

## Workflow

### Passo 1 — Descobrir por onde o pedido entra

Antes de perguntar qualquer coisa, olhar o que já existe:

```bash
ls operacao/procedimentos/ 2>/dev/null
```

Se a folha da tarefa já está lá, é revisão, não folha nova: ler o arquivo, confrontar só o
que mudou (o sistema trocou, o horário mudou, a pessoa é outra), acrescentar uma linha no
"Histórico" com a data de hoje e o que mudou, pôr a data de hoje em "Última revisão" e
rodar o lint do Passo 7. O `modelo` se recusa a sobrescrever folha que existe, e isso é
proteção: folha reescrita do zero perde o que a primeira execução ensinou.

Sendo folha nova, a primeira pergunta separa os dois caminhos:

> "É uma tarefa específica que você quer passar adiante, ou é uma pessoa (ou uma viagem) e a gente precisa descobrir tudo que ela vai precisar fazer?"

**Por tarefa** ("como abrir a loja", "o que fazer quando o cliente reclama"): pular pro
Passo 3. **Por pessoa** ("contratei a Carla", "vou viajar dia 10"): Passo 2 primeiro.
Se `_memoria/empresa.md` já tem a equipe, não perguntar quem é a pessoa; confirmar em
uma linha ("é pra Carla, a atendente da manhã?") e seguir.

### Passo 2 — Listar e ordenar (só na entrada por pessoa)

Uma mensagem só, porque é levantamento:

> "Me lista tudo que essa pessoa vai fazer (ou tudo que para se você sumir dez dias). Não precisa ordem nem detalhe: 'abrir a loja, atender WhatsApp, fechar o caixa, receber o fornecedor'."

Com a lista na mão, ordenar pela régua do molde, e mostrar a régua junto com a ordem: o
que acontece todo dia vem antes do que acontece toda semana; o que toca dinheiro ou
cliente vem antes do que toca organização. A decisão é do dono; a ordem proposta é assim:

> "São 7 tarefas. As três primeiras cobrem o dia inteiro dela: abrir a loja, atender no balcão, fechar o caixa. Vou escrever essas três agora e as outras depois que ela executar as primeiras uma vez. Começo por 'abrir a loja'?"

Três folhas prontas antes da viagem valem mais que sete esboçadas. Cada tarefa da lista
vira uma passagem pelos Passos 3 a 8; o índice no Passo 8 junta tudo.

### Passo 3 — Ouvir o processo do jeito que o dono faz

> "Me conta como você faz, do começo ao fim, como se eu estivesse do seu lado. Pode ser bagunçado."

Deixar ele falar. Anotar cada ação como um passo candidato, com o verbo que ele usou. Não
corrigir, não reordenar ainda. Se ele mandar áudio, `scripts/transcrever.js` resolve. Se
ele já tem alguma anotação, foto do caderno ou vídeo, pedir: o assistente lê a imagem
direto e os passos saem de lá.

No fim, ler a lista de volta, numerada, em uma mensagem: "Entendi 6 passos: 1) ..., 2)
.... Faltou algum?". Quase sempre falta o primeiro (pegar a chave) e o último (avisar que
abriu).

### Passo 4 — Confrontar cada passo

Aqui a folha deixa de ser transcrição. Pra cada passo, na ordem, **uma pergunta por vez**,
só as que o passo ainda não responde:

1. "Como você sabe que esse ficou pronto?" Se a resposta é "eu olho e vejo", insistir: "se tirasse uma foto do pronto, o que apareceria?" É o critério de pronto, e precisa ser algo que outra pessoa enxerga: painel verde, mensagem respondida, gaveta bate com o relatório
2. "O que acontece se esse passo falhar?" Se é "nada", o passo sai. Se é "perco o dia", vai pra coluna "Se falhar" com a ação, não com o susto
3. "Quem confere?" Se é "eu" e ele vai viajar, ou muda quem confere ou o critério vira autoconferível
4. "Isso é regra, ou é o seu jeito?" Regra tem consequência quando não é feita (prejuízo, cliente perdido, risco). Hábito é preferência. Hábito vai pra tabela "Regra ou hábito" marcado como hábito, e nunca vira passo numerado

Os sinais de passo fraco estão no molde e o assistente aplica sem perguntar: verbo vago
("cuidar", "ver") vira verbo que dá pra filmar; "periodicamente" vira "a cada 2 horas";
"aí confere o caixa" ganha sujeito; "fecha no sistema" ganha o nome do sistema e do botão
na primeira vez que aparece. Passo com mais de 20 palavras é dois passos.

Uma tarefa de 6 passos rende uns 12 a 15 minutos de conversa. Se passar disso, o dono está
descrevendo duas tarefas; separar em duas folhas.

### Passo 5 — Fechar as três pontas

O que a pessoa nova precisa ter e quase nunca recebe. A folha não sai sem as três.

**Acesso, senha e ferramenta.** Perguntar de uma vez: "Pra fazer isso ela precisa de que
em mãos? Chave, senha, login, material, telefone de alguém?" Cada item vira uma linha em
"Antes de começar" com onde pega ou quem dá. **A senha nunca vai escrita**: vai o lugar
("envelope azul na gaveta do caixa") ou a pessoa ("o Bruno cria o usuário dela"). Acesso
que ainda não existe entra como `[a confirmar] criar usuário dela no PDV` — colchete
fechado antes do texto, porque é essa forma que trava a exportação no Passo 8 — e vira
item em `tarefas.md` com data anterior à primeira execução.

**Critério de pronto por passo.** Já saiu do Passo 4. Reler a coluna inteira: dois passos
com o mesmo critério significam que um dos dois descreve o pronto do outro, e o lint
avisa quando isso acontece.

**Quando parar e me chamar.** A tabela que dá segurança pra pessoa decidir o resto sozinha:

> "Em que situação você quer que ela pare e te chame, em vez de resolver? Pensa nas três que mais te dariam prejuízo ou cliente perdido se ela decidisse errado."

Cada linha tem a situação, **quem chamar com nome** (nunca "a gerência"), como (ligação,
mensagem, presencial) e o que fazer enquanto espera. Os nomes vêm da linha **Equipe:** de
`_memoria/empresa.md`, e é contra ela que o lint confere. O dono também precisa estar lá:
`**Equipe:** Bruno (dono) e Carla (atendente da manhã)`. Se falta alguém, perguntar e
oferecer salvar; quem é de fora da equipe (contador, técnico do PDV) não vai pra memória,
entra no comando com `--pessoa`. Viagem marcada muda a tabela: cada linha passa a dizer
quem substitui o dono naquela situação, com nome. "Se não me achar, chama a Ana" resolve
mais crise do que qualquer passo da folha.

### Passo 6 — Escrever a folha

Gerar o esqueleto por comando, com o slug da tarefa, e preencher a partir do que saiu:

```bash
node -e 'console.log(require("./scripts/br.js").slug("Abrir a loja"))'    # abrir-a-loja
node scripts/procedimento.js modelo "Abrir a loja" --saida operacao/procedimentos/abrir-a-loja.md
```

O formato é o do molde, e o lint depende dos nomes exatos das seções:

```markdown
# Procedimento — Abrir a loja

> **Quem executa:** Atendente da manhã (hoje: Carla)
> **Quem chamar:** Bruno · ligação, (11) 9xxxx-xxxx
> **Quando:** todos os dias, 6h30, antes de abrir a porta
> **Leva:** 25 minutos
> **Última revisão:** 22/09/2026

## Pra que serve
Loja que abre às 7h05 perde o cliente do ônibus das 7h. Alarme desligado errado chama a central.

## Antes de começar
| Precisa de | Onde pega / quem dá |
|---|---|
| Chave da porta e do cadeado | cópia 2, com a Carla |
| Senha do alarme | envelope azul na gaveta do caixa; o Bruno cria o código dela |

## Passos
| # | O que fazer | Quem | Pronto quando | Se falhar |
|---|---|---|---|---|
| 1 | Abrir o cadeado e a porta de vidro | Atendente | porta aberta, cadeado no gancho | cadeado travado: não forçar, ligar pro Bruno |
| 2 | Digitar o código no painel do alarme em até 30 segundos | Atendente | luz verde e sem bip | bip contínuo: ligar pro Bruno antes de tentar de novo |
| 3 | Ligar o PDV e abrir o caixa com R$ 150 de troco | Atendente | tela de vendas aberta e troco bate com R$ 150 | diferença: anotar o valor, seguir, avisar o Bruno por mensagem |

## Quando parar e me chamar
| Situação | Quem chamar | Como | Enquanto espera |
|---|---|---|---|
| Alarme disparou | Bruno | ligação | ficar fora da loja |
| PDV não liga | Bruno | mensagem | vender anotando no caderno |
| Cliente quer cancelar compra acima de R$ 100 | Bruno | mensagem | dizer que o retorno vem em 10 minutos |

## Regra ou hábito
| Coisa | Regra ou hábito | Por quê |
|---|---|---|
| Contar o troco antes de abrir | regra | diferença some no caixa e ninguém acha depois |
| Ligar o rádio | hábito | é o jeito do Bruno; ela escolhe |

## Histórico
| Data | O que mudou | Quem |
|---|---|---|
| 22/09/2026 | Folha criada | Bruno |
```

Verbo no imperativo, na frente. Frase com menos de 20 palavras. Número no lugar de
palavra vaga. A palavra é a do dono, não a do manual: se ele diz "dar baixa", a folha diz
"dar baixa (botão Finalizar, no canto direito do PDV)". Onde o texto não resolve (onde
fica o disjuntor, como o painel fica quando está certo), pedir a foto e salvar em
`operacao/procedimentos/fotos/`. No passo, o caminho vai como texto — "foto:
fotos/painel-alarme.jpg" — porque o `.docx` não leva figura: escrito
`![painel](fotos/painel.jpg)`, ele chega no Word como `!painel`. A foto que precisa ficar
na parede é impressa à parte.

### Passo 7 — Conferir por comando

Folha lida no olho passa com o erro que mais custa. Rodar antes de mostrar:

```bash
node scripts/procedimento.js operacao/procedimentos/abrir-a-loja.md
node scripts/procedimento.js operacao/procedimentos/abrir-a-loja.md --pessoa "Seu Antônio"   # quem é de fora da equipe
node scripts/verificar.js segredo operacao/procedimentos/
node scripts/verificar.js texto operacao/procedimentos/abrir-a-loja.md
```

O lint acusa como **erro** o que trava a pessoa: passo sem "Quem" ou com "alguém",
passo sem "Pronto quando" ou com "quando estiver ok", escalação vazia ou apontando pra
"a equipe", nome de escalação que não existe na linha **Equipe** de `_memoria/empresa.md`,
"Antes de começar" vazio, senha escrita, numeração com pulo, data de revisão inválida ou
no futuro. Como **aviso**, o que vale corrigir e não trava: palavra vaga no passo, passo
longo, "Se falhar" em branco, dois passos com o mesmo critério de pronto, revisão com mais
de 180 dias, e cada `[a confirmar]` pendente.

Precisa terminar em "Tudo certo.". Erro se corrige no arquivo, com o dono quando for
dado dele (quem chamar, qual o critério), e se roda de novo. Dois erros têm conserto fora
da folha: nome que não está na equipe se resolve salvando a pessoa em `_memoria/empresa.md`
(ou com `--pessoa`, quando ela não é da casa), e senha escrita sai do arquivo antes de
qualquer outra coisa. O `segredo` é a rede seguinte, e ele enumera pelo git, então só vê o
que já foi versionado; a senha que acabou de ser digitada quem pega é o lint. O `texto`
olha o "Pra que serve" e o que houver de prosa; a folha é quase toda tabela, e é assim
que deve ser.

### Passo 8 — Exportar em Word e entregar

A pessoa que executa não abre markdown. A folha vai impressa pro balcão ou em `.docx` no
grupo da equipe, e é o `/word` que faz isso, uma folha por arquivo:

```bash
node scripts/gerar-docx.js operacao/procedimentos/abrir-a-loja.md \
  --cabecalho "Padaria Pão da Serra" \
  --rodape "Procedimento · Abrir a loja · revisado em 22/09/2026"
node scripts/gerar-docx.js --texto operacao/procedimentos/abrir-a-loja.docx | head -20
```

Dois cuidados que só aparecem na hora. O script recusa gravar quando acha `[a confirmar]`
no markdown, e isso é certo: folha com pendência aberta não vai pra mão de ninguém. Só que
ele procura o colchete fechado, e `[a confirmar: criar acesso]` passa batido — por isso a
pendência é escrita `[a confirmar] criar acesso`, e o lint avisa quando alguém escreveu da
outra forma. O segundo cuidado: a palavra solta "todo" conta como marcador de rascunho
(TODO), então "todo dia" no cabeçalho da folha trava a exportação. Escrever "todos os
dias" ou "diariamente". Tabela de passos com 5 colunas cabe em retrato; se o "Se falhar"
ficou longo, `--paisagem`.

Com mais de uma folha, gerar o índice e entregar o índice, não a pasta:

```bash
node scripts/procedimento.js indice operacao/procedimentos/
```

A entrega na conversa é curta:

```
✓ operacao/procedimentos/abrir-a-loja.md e .docx (6 passos, 3 acessos, 3 situações de chamar)

Lint: todo passo tem quem faz e como sabe que ficou pronto. Escalação
aponta pra Bruno; sem substituto ainda pros dias de viagem.

Pendente antes de a Carla executar:
- criar o usuário dela no PDV (tarefas.md, até 25/09)
- foto do painel do alarme com a luz verde

Próximo: ela executa junto com você uma vez, com a folha na mão. O que ela
perguntar vira correção da folha no mesmo dia.
```

A folha não é o treinamento; é o que sobra depois dele. Registrar em `tarefas.md` as três
execuções (junto, com o dono por perto, sozinha) com data, o acesso que falta criar, e
uma revisão da folha em 90 dias. Correção depois de cada execução entra no "Histórico"
com data. Se o dono quer a revisão lembrada sozinha, o `/rotina` agenda.

---

## Regras

- **Uma folha por tarefa.** "Manual da loja" não existe aqui: ninguém lê, e é o arquivo que envelhece primeiro. Se a entrevista passou de 15 minutos, são duas tarefas
- **Senha nunca vai no arquivo.** Vai o lugar onde está guardada ou quem dá o acesso. O lint e o `verificar.js segredo` acusam; se acusarem, a senha sai antes de qualquer outra coisa. A folha é versionada e vai pro grupo da equipe
- **Todo passo tem quem faz e como sabe que ficou pronto.** "Alguém" não é quem; "quando estiver ok" não é critério. O lint não deixa passar, e o assistente não contorna reescrevendo a célula sem perguntar ao dono
- **Escalação aponta pra pessoa com nome.** "Chamar a gerência" não toca o telefone de ninguém. O nome precisa estar na linha **Equipe** de `_memoria/empresa.md`; se não está, perguntar e salvar lá, nunca inventar
- **Regra e hábito não se misturam.** Regra tem consequência quando não é feita; hábito é o jeito do dono. Hábito fica na tabela própria, marcado, e a pessoa nova pode fazer do jeito dela
- **Não inventar passo, critério nem situação.** O que o dono não disse entra como `[a confirmar]` e trava a exportação até ele responder. Folha com passo inventado é pior que folha sem o passo: a pessoa segue
- **Sem quiz, sem prova.** A conferência é a pessoa executar com a folha na mão, e o que ela perguntar corrige a folha. Se ela errou seguindo a folha, o erro é da folha
- **Quem executa escreve junto.** Folha entregue pronta tem adesão baixa. Depois da primeira execução, perguntar à pessoa o que ela faria diferente, e discutir cada diferença: ou vira regra escrita, ou vira hábito liberado
- **Folha tem data e envelhece.** "Última revisão" com mais de 180 dias vira aviso do lint; a revisão de 90 dias entra em `tarefas.md` na entrega
- **Fronteira com as vizinhas:** o `/mapear-rotinas` transforma rotina do dono em skill pro assistente executar; aqui quem executa é gente. Ensinar pra fora, com promessa e módulo, é o `/curso`; a folha ensina pra dentro, uma tarefa por vez. Entrega de software se ordena no `/quebrar`. Quem agenda o que repete é o `/rotina`, e a folha diz como se faz cada vez. O `/whatsapp` e o `/responder-avaliacoes` leem `operacao/procedimentos/` como regra de atendimento quando a pasta existe: o que a atendente pode responder sozinha e quando chama o dono vem daqui. Quem exporta o `.docx` é o `/word`. Salário, encargo e contrato de quem foi contratado são do `/custo-de-funcionario`; ficha de produto ou receita é `/ficha-tecnica`; manual de um sistema construído é `/manual-do-sistema`; a ordem de serviço de um atendimento é `/ordem-servico`
- **Não é descrição de cargo nem documento trabalhista.** A folha diz como a tarefa é feita, não o que a pessoa recebe, quantas horas trabalha ou o que acontece se ela sair. Isso é conversa com contador e, quando houver litígio, com advogado
- **Dado pessoal fica de fora.** Exemplo de passo não leva nome de cliente, CPF nem telefone de terceiro; leva "o cliente" e a situação. Telefone de quem é chamado (o dono, o substituto) entra porque a pessoa precisa ligar, e é o único dado pessoal da folha (LGPD)
- **Conferência por comando.** Idade da revisão, contagem de passos, de acessos e de pendências, e o estado de cada folha no índice saem do `scripts/procedimento.js`, nunca de leitura
