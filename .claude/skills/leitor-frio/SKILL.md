---
name: leitor-frio
description: >
  Testa a peça que vai pro cliente com leitores que nunca a viram. Monta 3 a 5 leitores frios
  a partir dos perfis do público, mais o apressado no celular, que é obrigatório, e roda cada
  um num subagente sem o contexto da sessão. Cada leitor responde em primeira pessoa o que
  entendeu em 5 segundos, onde parou, quanto achou que custava, qual dúvida sobrou e o que faria
  agora. Devolve os tropeços em que dois ou mais caíram, com a frase exata citada e a correção
  sugerida, sem reescrever a peça.
  Use quando o usuário disser "será que tá claro", "manda alguém ler isso", "pra mim faz
  sentido mas não sei se pro cliente", "isso tá confuso?", "testa essa proposta antes de eu
  mandar", "minha landing tá entendível", "ninguém responde minha proposta", "quero saber o
  que o cliente entende disso", "essa bio explica o que eu faço", "lê como se fosse meu
  cliente", ou /leitor-frio.
---

# /leitor-frio — Quem lê pela primeira vez

> **Convenção de pastas:** a saída vai em `revisoes/leitura-fria-<slug>-<AAAA-MM-DD>.md`, com as respostas ao lado em `revisoes/leitura-fria-<slug>-<AAAA-MM-DD>.json`. Na convenção **por cliente**, `clientes/<Nome>/revisoes/`. A pasta nasce na primeira leitura.

Você escreveu a proposta, releu três vezes e está clara. Óbvio que está: você sabe o que
cada frase quer dizer antes de ler. O cliente não sabe. Ele abre no celular, entre duas
coisas, e decide em cinco segundos se vale rolar. Essa skill traz gente que nunca viu a
peça, uma por vez, sem nada explicado antes, e pergunta o que ficou. O que sai não é
elogio nem crítica: é a lista de pontos em que a leitura parou, com a frase copiada do seu
texto.

## Dependências

- **A peça:** proposta, landing, bio, e-mail, cardápio, página de produto. Arquivo `.md`, `.html` ou `.txt`. Se for PDF ou imagem, o assistente lê pela ferramenta de leitura e salva o texto num `.txt` ao lado, porque o script mede texto
- **Público:** `_memoria/publico.md` (`/publico`) — **é daqui que os leitores saem**. Vocabulário, objeção, gatilho e o que a pessoa tentou antes. Sem esse arquivo, a skill roda com dois leitores genéricos e diz na saída que vale menos
- **Oferta:** `_memoria/oferta.md` (`/oferta`) — o preço real, pra comparar com o que o leitor achou que custava
- **Contexto:** `_memoria/empresa.md` — serve pra julgar se um termo é jargão ou palavra de casa, nunca pra alimentar o leitor
- **Tom:** `_memoria/preferencias.md` — o relatório é escrito na voz do usuário, e a peça continua na voz dele
- **Método:** `templates/operacao/leitura-fria.md` — como se monta um leitor, o que contamina a leitura, as cinco perguntas, a régua de tempo com fonte, o léxico de tropeço e os limites
- **Script:** `scripts/leitor-frio.js` — `medir` (distância até o convite, posição do preço, tempo, as vinte palavras dos cinco segundos), `cruzar` (agrupa o tropeço pela frase e confere que a citação existe), `molde` (formato do arquivo de respostas)
- **Conferência:** `node scripts/verificar.js texto` no arquivo final
- **Saída:** `revisoes/leitura-fria-<slug>-<AAAA-MM-DD>.md`, e o `.json` das respostas ao lado

---

## Workflow

### Passo 1 — Receber a peça e confirmar o que ela tenta fazer

Uma pergunta só pro dono, e ela não vai pro leitor:

> "Me manda o arquivo. E em uma linha: qual é a ação que você quer que a pessoa faça
> depois de ler?"

A resposta serve pra comparar com a pergunta 5 dos leitores. Se o dono quer pedido de
orçamento e os cinco leitores dizem que fechariam a aba, isso é o achado principal da
leitura, e ele aparece no topo do arquivo.

Nesse passo também se resolvem três coisas de arquivo, todas antes de qualquer leitor
entrar:

- **O preço real.** Ler `_memoria/oferta.md`. Se não tiver valor fechado lá, perguntar:
  "quanto custa isso hoje?". Sem o número, o chute do leitor não tem contra o que ser
  comparado, e a medida de preço sai do relatório em vez de sair errada
- **O texto, se a peça for PDF ou imagem.** Ler pela ferramenta de leitura e salvar num
  `.txt` ao lado, porque o comando mede texto e não abre PDF
- **O dado de terceiro.** Nome de cliente, valor de contrato, CPF, CNPJ, endereço e
  telefone saem pra marcador (`<nome do cliente>`, `<valor>`) numa **cópia** da peça, e é
  essa cópia que vai pros leitores. A peça original não se altera

O `<slug>` do nome do arquivo sai do nome da peça, em minúscula e com hífen: a proposta
`propostas/Padaria Bom Pão.md` vira `revisoes/leitura-fria-padaria-bom-pao-2026-09-23.md`.

### Passo 2 — Medir a distância, por comando

Antes de qualquer leitura, rodar:

```bash
node scripts/leitor-frio.js medir <peça> [--cta "a frase do botão"]
```

Sai o que não se discute: total de palavras, tempo de leitura a 238 palavras por minuto,
quantas palavras o leitor atravessa antes do primeiro convite a agir, em que ponto do
texto o preço aparece, e as vinte palavras que caberiam nos cinco segundos de atenção.
Frase acima de trinta palavras e parágrafo grande entram como aviso.

O comando sai com erro em dois casos, e cada um pede uma ação diferente. Quando não acha
convite nenhum: se o convite existe e usa outra palavra, rodar de novo com
`--cta "a frase do botão"`; se não existe mesmo, esse já é o primeiro achado da leitura.
Quando a peça tem menos de 40 palavras de prosa: ou é um PDF que não virou `.txt`, ou é
peça curta demais pra medir distância, e aí se roda só a leitura, sem a parte medida.

Em peça HTML, o comando conta como convite o `<button>`, o link com classe de botão e o
link que aponta pra conversa, compra ou agenda (WhatsApp, telefone, e-mail, checkout,
formulário). Link de menu e de rodapé não conta, senão o primeiro item do cabeçalho
apareceria como convite na palavra 2 e a medida mentiria a favor da peça.

Anotar os números: eles vão no arquivo final, e é o que impede a leitura fria de virar
troca de impressão.

**Nunca calcular isso de cabeça.** "O preço está bem no meio da página" é a frase que o
comando desmente na maioria das vezes.

### Passo 3 — Montar os leitores

Ler `_memoria/publico.md` e escolher de três a cinco perfis. Cada leitor recebe quatro
campos, todos tirados do arquivo, nenhum inventado:

| Campo | O que é |
|---|---|
| **Vocabulário** | a frase literal com que essa pessoa descreve o problema |
| **Objeção** | o que ela desconfia antes de comprar |
| **Situação de leitura** | onde, quando e com quanta pressa ela abre a peça |
| **Próximo passo natural** | o que ela costuma fazer antes de decidir (pedir opinião, pesquisar preço, sumir) |

O **apressado no celular** entra sempre, com a ficha pronta que está em
`templates/operacao/leitura-fria.md`. Ele não é um perfil do público: é a condição em que
quase toda peça é lida de verdade.

Sem `_memoria/publico.md`, são dois leitores genéricos (o apressado e o desconfiado que já
foi mal atendido), e o arquivo de saída diz isso na segunda linha, com essas palavras:
**leitura genérica, vale menos que uma leitura com os perfis do negócio.** Depois de
entregar, oferecer `/publico` uma vez.

Mostrar a lista pro usuário antes de rodar:

> "Vou usar estes quatro leitores: <nomes>. Algum cliente típico seu que ficou de fora?"

### Passo 4 — Rodar cada leitor sem o contexto da sessão

Um subagente por leitor, um por vez, com este briefing e nada mais. É texto pra copiar,
trocando o que está entre `<>`:

```
Você é <ficha: quem é, com a frase literal do público sobre o problema>.
<Objeção: o que você desconfia antes de comprar.>
<Situação: onde, quando e com quanta pressa você está lendo.>
<Próximo passo natural: o que você costuma fazer antes de decidir.>

Você abriu este texto agora, pela primeira vez, sem ninguém explicar nada antes.
Leia como você leria de verdade, na pressa que a sua situação tem.

--- começa o texto ---
<a peça inteira, colada>
--- termina o texto ---

Responda em primeira pessoa, curto, uma resposta por pergunta:
1. O que eu entendi em 5 segundos?
2. Onde eu parei? Copie a frase EXATA do texto acima, do jeito que ela está escrita,
   sem resumir e sem corrigir. Se não parou em nada, escreva "não parei".
3. O que eu achei que isso custava?
4. Qual dúvida sobrou?
5. O que eu faria agora? Responda o que você faria mesmo, inclusive "nada" ou
   "fechava a aba".

Não opine sobre o texto, não sugira melhoria e não invente frase que não está acima.
```

O que **nunca** entra nesse briefing: o objetivo da peça, o nome do serviço além do que a
peça diz, quem escreveu, o que já foi corrigido, a conversa do chat, as respostas dos
outros leitores. A lista completa do que contamina está no molde. Contaminação não deixa
rastro no resultado, e é por isso que ela é perigosa: a leitura sai plausível e serve pra
nada.

A ordem das cinco perguntas não muda. Perguntar preço antes de perguntar onde parou faz o
leitor voltar ao texto caçando número, e a leitura sai mais atenta do que a real.

**No cliente de IA que não tem subagente**, rodar em turno separado: pedir pro usuário
abrir uma conversa nova, colar o briefing acima inteiro, e trazer a resposta de volta. Um
turno por leitor, sem misturar dois no mesmo. Dá mais trabalho e o resultado é o mesmo,
porque o que importa é o contexto limpo, não a máquina.

### Passo 5 — Registrar as respostas e cruzar, por comando

Tirar o formato do próprio comando e preencher com o que os leitores responderam, uma
entrada por leitor:

```bash
node scripts/leitor-frio.js molde > revisoes/leitura-fria-<slug>-<AAAA-MM-DD>.json
```

Depois cruzar, com o preço real do Passo 1:

```bash
node scripts/leitor-frio.js cruzar revisoes/leitura-fria-<slug>-<AAAA-MM-DD>.json   --peca <peça> --preco 1480
```

O comando agrupa o tropeço pela frase citada, mostra quantos leitores caíram em cada
ponto, compara os chutes de preço com o preço real e **confere que cada citação existe na
peça**, ignorando acento, maiúscula e pontuação. Leitor simulado inventa frase que soa
plausível, e correção escrita em cima de frase inventada estraga a peça.

Citação que não está na peça sai do relatório, aparece na lista "fora do relatório" e
derruba o comando. Nesse caso, uma de duas: rodar aquele leitor de novo, com o briefing
insistindo na cópia literal, ou apagar aquela parada do JSON e registrar no relatório que
ela caiu. O resto das respostas daquele leitor continua valendo. O que não se faz é
consertar a frase na mão pra ela passar: aí a conferência deixa de conferir.

Os avisos do comando também são leitura. Ele avisa quando falta o apressado, quando um
leitor ficou sem a resposta 1 ou a 5 (rastro de ficha preenchida sem ninguém ler) e quando
o chute de preço não é número.

Tropeço com dois leitores ou mais vira correção. Com um só, vira nota. O molde tem as
exceções dessa régua, e a principal é o preço: chute distante do real conta mesmo vindo de
um leitor só.

### Passo 6 — Escrever o arquivo

```markdown
# Leitura fria — <peça> — <AAAA-MM-DD>

Peça: `<caminho>` · <N> leitores · Ação pretendida: <o que o dono respondeu no Passo 1>
<quando não houver publico.md: **Leitura genérica, vale menos que uma leitura com os perfis do negócio.**>

## Medido por comando
- <N> palavras · <tempo> de leitura a 238 palavras por minuto
- Primeiro convite a agir: palavra <N> de <total> (<N>% do texto)
- Primeira menção a preço: palavra <N> (<N>% do texto), ou "não aparece"
- O que cabe nos 5 segundos: "<as 20 primeiras palavras>"
- Obstáculo contado: <N frases acima de 30 palavras, maior parágrafo com N palavras>

## O que os leitores fariam agora
| Leitor | O que faria | A ação pretendida era <...> |
|---|---|---|

## Tropeço confirmado — 2 leitores ou mais
### 1. "<frase exata, copiada da peça>"
- **Quem parou aqui:** <leitor>, <leitor>
- **Por que:** <o motivo de cada um, nas palavras deles>
- **Tipo:** jargão | promessa vaga | preço escondido | convite ausente | ordem errada | prova ausente
- **Correção sugerida:** <a troca concreta, em uma linha>

## Citado por um leitor só — nota, não correção
- "<frase>" — <leitor>: <motivo>

## Citação que não estava na peça
- "<frase>" — <leitor>: caiu na conferência, não virou correção

## O que acharam que custava
| Leitor | Chute | Distância do preço real |
|---|---|---|

Abertura entre o chute mais alto e o mais baixo: <N>×.

## Dúvida que sobrou
- <leitor>: <dúvida>

## As cinco respostas, leitor por leitor
### <nome do leitor>
Ficha: <vocabulário> · <objeção> · <situação de leitura>
1. Em 5 segundos eu entendi: <...>
2. Eu parei em: "<frase>" — <por que>
3. Achei que custava: <...>
4. Ficou a dúvida: <...>
5. Eu faria: <...>

## O que essa leitura não mediu
- Leitor frio sai do arquivo do público, não é cliente de verdade
- A leitura mede compreensão, não intenção de compra
- <o que mais ficou de fora nesse caso>
```

Rodar `node scripts/verificar.js texto` no arquivo antes de entregar. Uma ressalva: o
relatório cita a peça, então clichê ou frase de 40 palavras acusados **dentro de citação**
são o achado, não defeito do relatório. Não se conserta a citação pra agradar o
conferidor.

### Passo 7 — Entregar e parar

No chat, três linhas, nessa ordem: onde a maioria parou, o buraco de preço, e o que os
leitores fariam contra o que o dono queria que fizessem. Depois:

> "Os tropeços confirmados estão no arquivo com a correção sugerida ao lado. Quer que eu
> aplique? A peça é sua, então eu só mexo se você pedir."

**A skill não reescreve a peça.** Se o usuário pedir a correção, aí sim: aplicar os
tropeços confirmados, e nada além. Mudança de estilo é assunto do `/revisar`.

Se o usuário aplicar as correções, vale rodar a leitura fria de novo com os mesmos
leitores, e comparar os dois arquivos. Tropeço que voltou é tropeço que a correção não
pegou.

---

## Regras

- **Nenhum leitor recebe contexto da sessão.** Nem o objetivo da peça, nem o briefing, nem o que o dono explicou no chat. É a única regra que, quebrada, invalida a leitura inteira
- **Um leitor por vez, sem ver os outros.** Leitor que lê a resposta do anterior concorda com ela, e cinco leituras viram uma
- **As respostas não se escrevem à mão.** Cada uma das cinco sai do subagente que rodou, ou do turno separado que o usuário trouxe. Inventar a resposta de um leitor é inventar o resultado inteiro da skill, e o relatório fica indistinguível de um que valia. Quando um leitor não rodou, ele não entra no arquivo
- **O apressado no celular entra sempre**, em qualquer peça, qualquer negócio. O comando avisa quando ele falta
- **Frase citada é copiada, nunca parafraseada.** O `cruzar` confere cada citação contra o texto e derruba a que não existe. Correção escrita sobre frase inventada piora a peça
- **Tropeço de um leitor é nota, de dois é correção.** A exceção é preço: chute longe do real conta sozinho
- **Não reescrever a peça.** A skill aponta e propõe; aplicar é pedido do usuário, e só nos pontos confirmados
- **Todo número do relatório sai de comando.** Palavras até o convite, posição do preço, tempo de leitura e abertura dos chutes se rodam, não se estimam
- **Sem `_memoria/publico.md`, dizer que vale menos**, com essas palavras, na segunda linha do arquivo. Leitura genérica entregue como se fosse específica engana o dono
- **Leitor frio não é cliente.** Ele é construído a partir do arquivo do público, que veio de gente real, com uma camada de distância. Serve pra achar tropeço; não serve pra concluir que o público aprova a oferta. Quando o dono tem alguém de fora à mão, essa pessoa continua valendo mais
- **Fronteira com as vizinhas:** o `/revisar` corta gordura e clichê com todo o contexto na mão, e o `/conversao` audita a página sabendo origem do tráfego, oferta e objeção. Os dois auditam **de dentro**, e é justamente o contexto deles que esconde a lacuna. Aqui a leitura é de fora, sem nada explicado. Criar a página é `/landing`, montar a proposta é `/proposta`, tirar cara de máquina é `/humanizar`, treinar a conversa de venda é `/ensaiar`, e descobrir quem é o cliente de verdade é `/publico`
- **Peça de nicho regulado** (saúde, jurídico, financeiro, alimentar) tem outra camada de conferência, e ela é `/publicidade-regulada`. Leitura fria não confere regra de conselho nem lei de publicidade, e nada aqui substitui advogado, contador ou o conselho da categoria. Leitor achar uma promessa clara não significa que ela é permitida
- **Correção sugerida é troca de palavra, não invenção de fato.** Quando o tropeço é falta de prova ("e se não der certo"), a correção aponta que falta prova; ela não escreve um depoimento, um número de resultado ou um prazo que o dono não deu. Dado que não veio do usuário ou de `_memoria/` não entra na peça
- Peça com dado de terceiro (nome de cliente, valor de contrato, CPF, endereço) vai pro subagente com esses campos trocados por marcador. O leitor frio não precisa do dado real pra dizer se entendeu, e dado pessoal não circula sem motivo (LGPD)
