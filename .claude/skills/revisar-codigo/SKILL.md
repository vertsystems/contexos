---
name: revisar-codigo
description: >
  Audita um sistema que já existe, escrito por você, por um freelancer ou por IA, e diz o que está
  errado em ordem de custo, com sintoma observável e conserto. Mede primeiro por comando (segredo no
  repositório, dependência com falha conhecida, teste que passa, consulta que varre a tabela), faz o
  inventário do que tem dentro quando ninguém explica, e responde consertar ou refazer com a conta
  dos dois lados em vez de opinião.
  Use quando o usuário disser "revisa esse código pra mim", "o desenvolvedor entregou, confere se tá
  certo", "revisa o que a IA escreveu", "o programador sumiu e ficou isso aqui", "recebi esse sistema
  e não sei o que tem dentro", "vale a pena refazer do zero ou consertar", "tá cheio de gambiarra",
  "por que quando eu mexo aqui quebra lá", "estão me cobrando manutenção todo mês, precisa mesmo",
  ou /revisar-codigo.
  Para erro acontecendo agora ("deu erro em produção", "o sistema caiu", "a consulta está lenta"),
  continua sendo /backend.
---

# /revisar-codigo — Auditoria de sistema que já existe

> **Convenção de pastas:** o laudo vai em `sistemas/<nome>/revisao-AAAA-MM-DD.md`. Na convenção **por cliente**, `clientes/<Nome>/sistemas/<nome>/`. A pasta nasce com o primeiro laudo, nunca antes.

Auditar código não é dar nota de estilo. É rodar o que dá para rodar, colar a saída, e listar o que
custa dinheiro na ordem em que o dinheiro sai. "Está mal escrito" não é laudo, é impressão, e
impressão não sustenta fatura nenhuma. Quem decide o que fazer com a lista é quem paga o conserto.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` — quantas pessoas dependem do sistema, o que não pode parar, quem mantém depois
- **Prioridades:** `_memoria/estrategia.md` — orçamento curto muda a ordem do laudo, não o conteúdo dele
- **Referências** (ler a que o passo pedir, não todas):
  - `templates/backend/revisao-de-codigo.md` — os sinais de projeto em degradação, com a frase que denuncia cada um, e o freio contra camada demais
  - `templates/backend/consultas.md` — a consulta que erra sem dar erro, para quando o número não bate no fechamento
  - `templates/backend/cadastro.md` — as oito armadilhas de gravar, editar, apagar e listar
  - `templates/backend/versoes.md` — o que o histórico do repositório entrega de graça, e a prova de que a volta atrás existe
  - `templates/software/manutencao.md` — sistema herdado, o inventário do que só uma pessoa entende, consertar ou refazer, e a saída do desenvolvedor
  - `templates/software/custo.md` — o que se paga uma vez, o que se paga todo mês, e a fatura que ninguém abriu
- **Saída:** o laudo em `sistemas/<nome>/revisao-AAAA-MM-DD.md`, e o `DECISOES.md` do sistema iniciado quando ainda não existe

---

## Workflow

### Passo 1 — Dizer em uma linha o que vai fazer, e não mexer em nada

Antes de abrir o primeiro arquivo, uma frase:

> "Vou ler o sistema, rodar as verificações e escrever um laudo. Não altero nenhum arquivo."

Não é cerimônia. Auditoria que já sai consertando apaga a única foto do estado em que o sistema
chegou, e o dono perde a chance de escolher o que aceita. Alterar só quando ele mandar, item por
item, um de cada vez.

**Arquivo pequeno não vira laudo.** Uma função, um arquivo, um trecho colado na conversa: responder
ali mesmo, com o sintoma e o conserto, e parar. Pasta e documento nascem quando o alvo é um sistema.

### Passo 2 — Perguntar as três coisas que mudam o laudo inteiro

> 1. "O que esse sistema faz que, se parar hoje, para o negócio?"
> 2. "Quem escreveu, e essa pessoa ainda atende você?"
> 3. "Quanto você paga por mês por causa dele, e para quem?"

A resposta da primeira ordena os achados: o que ameaça o dinheiro do negócio sobe, o resto desce.
Já a segunda decide se o Passo 8 entra. E a última costuma ser a descoberta da conversa, porque
muito dono paga hospedagem, banco, envio de e-mail e um contrato de manutenção sem nunca ter aberto
a fatura. Para essa conta, `templates/software/custo.md`, seção "A fatura que ninguém abriu".

### Passo 3 — Fazer o inventário por comando, não por leitura

Sem isso você audita o que o dono lembra, não o que existe.

```bash
# tamanho real do que se está auditando
git ls-files | wc -l                                 # arquivos versionados
git ls-files | xargs wc -l | tail -1                 # linhas no total
git log -1 --format='%ad %an'                        # última alteração, e por quem
git log --format='%an' | sort | uniq -c | sort -rn   # quem escreveu, e em que volume

# do que ele depende para subir
head -40 package.json          # ou requirements.txt, go.mod, composer.json, Gemfile
ls -a | grep -E '^\.env|^Dockerfile|^docker-compose'

# arquivos que só uma pessoa tocou no último ano: os candidatos a refém
for f in $(git ls-files); do
  n=$(git log --since="1 year ago" --format="%an" -- "$f" | sort -u | wc -l)
  [ "$n" -eq 1 ] && echo "$f"
done
```

Colar a saída no laudo, não o resumo dela. "180 arquivos, 24 mil linhas, última alteração em março,
um autor" vale mais que qualquer adjetivo, e outra pessoa consegue conferir. A peneira do último
comando não é a lista final: cruzar com o que o negócio não pode perder, como manda
`templates/software/manutencao.md`, seção "O inventário do que só uma pessoa entende".

Se não houver repositório git, o inventário sai de `find` e `wc`, e o laudo já ganhou o primeiro
achado. O conserto está em `templates/backend/versoes.md`.

### Passo 4 — Rodar as verificações e colar a saída

O bloco de comandos está na seção "Medir antes de acusar", mais abaixo. Rodar todos, inclusive os
que passam limpo: "nenhuma chave no que está versionado" é resultado, e o dono precisa ver.

Achado que tem comando entra no laudo com a saída do comando junto. Onde não existe comando, o
achado entra com o sintoma que o dono consegue ver na tela dele, nunca com adjetivo.

### Passo 5 — Ler o código com a lista na mão

Consultar `templates/backend/revisao-de-codigo.md`. Ele dá o vocabulário que falta ao dono para
dizer o que está errado, e é o vocabulário que faz o laudo ser lido até o fim. Depois, pelo sintoma
que ele relatou:

| O que o dono diz | Onde procurar |
|---|---|
| "quando mexo aqui, quebra lá" | rigidez e fragilidade, em `revisao-de-codigo.md` |
| "o número não bate no fechamento" | `consultas.md`, seção "O número não bate: a ordem de conferência" |
| "o cliente clica e cria dois pedidos" | `cadastro.md`, armadilha 1 |
| "sumiu registro e ninguém clicou em nada" | `cadastro.md`, armadilha 5 |
| "alguém virou administrador sem ninguém dar esse acesso" | `cadastro.md`, armadilha 8 |
| "ninguém entende essa parte" | opacidade, cruzada com o inventário do Passo 3 |
| "toda vez que publicam, alguma coisa some" | `versoes.md`, seção "Desfazer" |

Duas coisas nunca passam sem virar achado, mesmo que o dono não tenha reclamado: dinheiro guardado
em ponto flutuante e texto no lugar de data. As duas erram calado, e a diferença aparece no
fechamento do mês, meses depois de alguém ter aprovado o sistema.

### Passo 6 — Marcar o que é grande demais para o tamanho do negócio

Excesso de arquitetura é achado, igual à falta. Custa hora de manutenção todo mês e não devolve
nada. O teste é de remoção: se ninguém sabe dizer qual problema aquela camada resolve, ela sai.

- Serviço separado, fila e cache num sistema de 1 a 10 pessoas, sem número que justifique
- Camada de indireção que só repassa a chamada, e agora são duas peças para manter em dia
- Interface com uma implementação só, criada para uma variação que nunca apareceu
- Vinte constantes que nunca mudaram, batizadas com o próprio valor
- Tela de configuração comprida, onde o suporte passa o dia

O freio inteiro está em `templates/backend/revisao-de-codigo.md`. Duplicação é mais barata que a
abstração errada, e desfazer abstração errada é sempre mais caro do que criá-la.

### Passo 7 — Responder consertar ou refazer com a conta dos dois lados

Nunca com opinião. Some horas de gente dos dois lados e mostre a tabela ao dono: a conta do servidor
é a menor linha dessa decisão. O modelo e as três regras que fecham o assunto estão em
`templates/software/manutencao.md`, seção "Consertar ou refazer".

```bash
# em quantos meses a reconstrução daquele pedaço se paga
node -e 'const recon=120, contorno=8; console.log((recon/contorno).toFixed(1)+" meses")'
```

`recon` são as horas para reconstruir o pedaço. `contorno` são as horas que o mês passado consumiu
contornando ele. Sem o segundo número, não existe decisão: peça ao dono que anote as horas por um
mês e volte a conversar depois. E reconstrua o pedaço, nunca o sistema.

### Passo 8 — A lista do que exigir de quem está saindo

Vale para o freelancer que encerra, para a agência que perdeu a conta e para o próprio Contex OS. O
dono precisa terminar dono do que foi feito.

- **Repositório** — a conta é dele, e o sistema sobe a partir de um clone novo em outra máquina
- **Segredos** — a lista do que existe e onde mora, com os valores fora do repositório
- **Contas pagas** — domínio, hospedagem, banco, envio de e-mail, todas no e-mail do dono
- **Backup** — uma cópia restaurada na frente dele, com o dado aparecendo na tela
- **Como se publica** — roteiro escrito, executado por quem não escreveu o roteiro
- **Como se volta atrás** — o mesmo roteiro, cronometrado uma vez

Cada item só fecha quando outra pessoa executou o que está escrito, sozinha, com quem está saindo do
lado e calado. A tabela com a prova de cada linha está em `templates/software/manutencao.md`, seção
"O desenvolvedor está saindo".

### Passo 9 — Escrever o laudo

Um arquivo em `sistemas/<nome>/revisao-AAAA-MM-DD.md`, nesta ordem:

1. **O que foi medido**, com a saída dos comandos colada
2. **Os achados**, em sintoma observável, o que custa, conserto. Ordenados por custo
3. **O que é grande demais** para o tamanho do negócio
4. **Consertar ou refazer**, com os dois lados somados e o número da divisão
5. **O que exigir**, quando alguém está saindo
6. **O que não foi olhado**, com o motivo

O item 6 não é modéstia. Laudo que não diz onde parou vira certidão de sistema saudável na primeira
vez que alguém o mostra para um terceiro.

Se o sistema não tem `DECISOES.md`, criar um com o que você descobriu lendo, cada linha marcada como
reconstruída e não confirmada. Meia página com os porquês vale mais que trinta páginas descrevendo
campo a campo, e é a única parte que quem chega depois lê inteira.

---

## Medir antes de acusar (obrigatório)

```bash
# chave, token ou senha dentro do que está versionado
node scripts/verificar.js segredo <pasta-do-sistema>

# migração de banco fora de ordem, sem volta atrás, ou com DROP junto de adição
node scripts/verificar.js migracao <pasta-do-sistema>

# dependência com falha conhecida: a porta mais usada e a mais fácil de fechar
npm audit                    # ou: pip-audit, composer audit, bundle audit

# existe bateria de teste? ela passa?
npm test

# a consulta que o dono diz que está lenta varre a tabela inteira?
EXPLAIN ANALYZE <a consulta>;    -- "Seq Scan" em tabela grande = falta índice
```

**Regra:** todo número do laudo sai de um desses comandos. O que não foi medido entra escrito como
"não medido", e nunca como estimativa. Chave achada no repositório continua no histórico depois de
apagada, então o conserto é trocar a chave no fornecedor, e quem troca é o dono.

Antes de entregar, rodar `node scripts/verificar.js texto <o laudo>`. Laudo é texto que alguém vai
ler inteiro, e a régua é a mesma de qualquer peça do sistema.

---

## Regras

- **Abra dizendo o que vai fazer, em uma linha, e não altere nada sem ordem.** A auditoria produz uma lista, não um commit
- **Sem medição não há achado.** Rodou, colou a saída, aí sim escreve. Adjetivo sozinho não entra
- **A ordem é de custo, não de gravidade teórica.** O que ameaça dinheiro, dado de cliente e hora de trabalho todo mês vem primeiro. Elegância vem por último, se vier
- **Consertar ou refazer só sai com os dois lados somados.** Reescrita sem a conta é preferência de quem programa, paga por quem não programa
- **Nunca inventar número de desempenho, de custo ou de prazo.** Se não mediu, diga que não mediu
- **Excesso de arquitetura é achado.** Camada que ninguém sabe explicar custa manutenção todo mês
- **A responsabilidade do código copiado é de quem colou.** Vale igual para trecho de fórum e para trecho gerado por IA, e é por isso que o sistema escrito por máquina passa pela mesma auditoria
- **O laudo fala a língua do dono.** Sintoma que ele já viu na tela, custo em hora ou em real, conserto em uma frase. Termo técnico entra depois da explicação, nunca antes
- **O Contex OS entrega arquivo, não publica.** Trocar chave, apagar branch, cancelar fatura, avisar o desenvolvedor: quem faz é o dono
