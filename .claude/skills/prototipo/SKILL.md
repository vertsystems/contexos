---
name: prototipo
description: >
  Responde uma dúvida de produto antes de escrever código: monta um HTML único pra mandar
  pro cliente, pro sócio ou pra quem vai usar, com três perguntas pra fazer enquanto a pessoa
  clica, e registra a decisão num arquivo antes de jogar o protótipo fora. Dois ramos: fluxo
  clicável, quando a dúvida é se a pessoa entende o caminho; versões da mesma tela, de 3 a 5,
  quando a dúvida é qual layout ela entende. O desenho é conferido por comando antes de virar HTML.
  Use quando o usuário disser "o cliente entende esse fluxo?", "qual dessas telas é melhor",
  "quero ver funcionando antes de mandar fazer", "faz uma maquete pra eu mostrar pro meu sócio",
  "como eu sei se essa tela faz sentido", "não sei se o fluxo de pedido tá claro", "quero testar
  a ideia antes de gastar", "desenha três versões dessa tela", "meu cliente não entende o que eu
  expliquei", "dá pra clicar pra ver se funciona", ou /prototipo.
---

# /prototipo — Clicar antes de construir

> **Convenção de pastas:** a saída vai em `prototipo/<slug>/`, com o spec, o HTML e o `conclusao.md`. Na convenção **por cliente**, `clientes/<Nome>/prototipo/<slug>/`. Quando o sistema já tem pasta do `/escopo`, o protótipo pode morar em `sistemas/<nome>/prototipo/<slug>/`, ao lado do `ESCOPO.md`. A pasta nasce no primeiro protótipo.

Tem um tipo de dúvida que reunião não resolve. "O cliente vai entender que o pedido só
fica confirmado depois de pagar?" é uma dessas: quem construiu o fluxo já sabe a resposta,
quem paga acha que está claro, e a única pessoa que pode responder é a que vai clicar sem
ninguém explicando nada. Esta skill monta a coisa mais barata que faz essa pessoa clicar:
um arquivo HTML que abre no navegador dela, sem instalar nada, com três perguntas pra
você fazer enquanto ela mexe. Depois o código vai pro lixo, de propósito, e o que fica é
uma página com a decisão e a frase dela entre aspas.

## Dependências

- **Contexto:** `_memoria/empresa.md` — quem vai clicar, em que aparelho, com quanto de pressa
- **Prioridades:** `_memoria/estrategia.md` — se a dúvida não está no caminho do que importa agora, ela pode esperar
- **Cliente real:** `_memoria/publico.md`, quando existir — a palavra que a pessoa usa vira o texto do botão
- **Sistema da marca:** `identidade/tokens.css` — se existir, as cores do protótipo saem de lá, lidas por comando: `grep -E "^\s*--(cor|fundo|texto|destaque|acento)[a-z-]*:" identidade/tokens.css`. Protótipo não é hora de inventar paleta
- **Escopo, quando já existe:** `sistemas/<nome>/ESCOPO.md` (`/escopo`) — a dúvida costuma estar escrita lá, na lista do que ficou em aberto
- **Referências** (ler a que o passo pedir):
  - `templates/software/prototipo.md` — a pergunta que escolhe o ramo, as quatro falhas de desenho, o que faz uma versão ser diferente de verdade, como conduzir a sessão, o léxico pro dono
  - `templates/software/validacao.md` — o degrau anterior: quando a dúvida é "alguém paga por isso", não "alguém entende isso"
  - `templates/software/escopo.md` — pra onde a resposta vai depois
  - `templates/design/interface.md` — altura de controle, densidade e os quatro estados de conteúdo
  - `templates/design/usabilidade.md` — ação primária, retorno de clique, tela sem saída
  - `templates/design/acessibilidade.md` — alvo, foco, contraste
- **Script:** `scripts/prototipo.js` — `conferir`, `fluxo`, `visual`, `conclusao`
- **Conferência:** `node scripts/verificar.js html` e `alvo` no arquivo gerado
- **Saída:** `prototipo/<slug>/` com `fluxo.json` ou `visual.json`, `prototipo.html` e `conclusao.md`

---

## Workflow

### Passo 1 — Escrever a pergunta em uma frase

Uma pergunta por vez, e a primeira é sempre esta:

> "O que exatamente você quer descobrir? Escreve como pergunta, terminando com
> interrogação."

Se ele responder "quero ver como fica", ainda não é pergunta. Devolver: "o que você vai
saber depois de ver, que não sabe agora?". Protótipo sem pergunta não tem como terminar em
decisão, e vira maquete de aprovação.

Depois, duas perguntas curtas, uma por vez:

1. "Quem vai clicar? Nome e papel." Cliente, sócio, o funcionário que vai usar todo dia
2. "Se a resposta for o contrário do que você espera, o que muda no que vai ser construído?"

A segunda é o filtro. Resposta sem consequência é curiosidade, e aí vale dizer isso e
encerrar em duas linhas, sem criar pasta nenhuma.

### Passo 2 — Escolher o ramo

A pergunta decide a forma. A tabela completa está em `templates/software/prototipo.md`,
seção "A pergunta escolhe o ramo". O corte rápido:

| A dúvida é sobre | Ramo | Como se chama na conversa |
|---|---|---|
| o caminho, o que acontece depois de cada clique, o que o sistema já sabe | fluxo | **fluxo clicável** |
| o que aparece primeiro, o que fica escondido, quantas escolhas a pessoa faz | visual | **versões da tela** |

Dizer em uma linha qual ramo você escolheu e por quê, e seguir. Se a dúvida for de preço,
de prazo ou de "alguém paga por isso", o caminho é outro: `/escopo` pra decidir e o que
está em `templates/software/validacao.md` pra testar demanda. Nesses casos, não montar
protótipo.

**Nunca dizer "máquina de estados" ao usuário.** O léxico está no fim do molde: fluxo
clicável, versões da tela, tela sem saída, o que o sistema sabe agora.

### Passo 3 — Escrever o spec

O desenho vive num JSON, não no HTML. É o que permite conferir o fluxo por comando antes
de qualquer linha de tela.

**Ramo fluxo** — `prototipo/<slug>/fluxo.json`:

```json
{
  "titulo": "Pedido no delivery da Pizzaria do Ítalo",
  "pergunta": "O cliente entende que o pedido só é confirmado depois do pagamento?",
  "perguntas": ["...", "...", "..."],
  "dados": { "itens no carrinho": 2, "total": "R$ 48,00", "pedido confirmado": "não" },
  "inicial": "carrinho",
  "estados": [
    {
      "id": "carrinho",
      "nome": "Carrinho",
      "aposta": "mostrar o total antes de pedir endereço",
      "tela": "<p>2 itens · <strong>R$ 48,00</strong></p>",
      "acoes": [
        { "rotulo": "Fechar pedido", "para": "endereco" },
        { "rotulo": "Continuar escolhendo", "para": "menu", "tom": "secundario" }
      ]
    },
    {
      "id": "pagamento",
      "nome": "Pagamento",
      "tela": "<p>Pix, cartão na entrega ou dinheiro.</p>",
      "acoes": [
        { "rotulo": "Pagar no Pix", "para": "confirmado",
          "define": { "pedido confirmado": "sim", "forma de pagamento": "Pix" } }
      ]
    },
    { "id": "confirmado", "nome": "Pedido confirmado", "final": true,
      "tela": "<p>Pedido #418 na fila da cozinha.</p>" }
  ]
}
```

O `define` é o que faz a sessão render conversa: ele muda o painel "o que o sistema sabe
agora", e é ali que a pessoa descobre sozinha que o pedido não estava feito.

**Ramo visual** — `prototipo/<slug>/visual.json`, com o markup de cada versão num arquivo
`v1.html`, `v2.html` ao lado:

```json
{
  "titulo": "Agendamento da Barbearia do Ítalo",
  "pergunta": "Qual dessas a cliente entende sem ninguém explicar?",
  "perguntas": ["...", "...", "..."],
  "variacoes": [
    { "nome": "Lista de horários", "aposta": "mostra tudo de uma vez e deixa varrer com o olho",
      "arquivo": "v1.html",
      "cores": { "fundo": "#ffffff", "texto": "#1a1d22", "destaque": "#1f5fd0", "textoDestaque": "#ffffff" } },
    { "nome": "Um horário só", "aposta": "decide pela cliente e oferece a saída embaixo",
      "arquivo": "v3.html",
      "cores": { "fundo": "#12161b", "texto": "#f2f1ee", "destaque": "#e8b923", "textoDestaque": "#1a1d22" } }
  ]
}
```

Cada `v<N>.html` é **pedaço de página, não página**: o script cola o conteúdo dentro de
uma seção do arquivo final, então não leva `<!DOCTYPE>`, `<html>` nem `<body>`. Estilo vai
em `style="..."` no próprio elemento. Todas as versões dividem um arquivo só, e um `<style>`
solto numa delas pinta as outras junto: se precisar de bloco, toda regra começa em `#v1`,
`#v2`, conforme a posição da versão no spec. O script recusa `<style>` sem esse prefixo.

Três regras ao escrever as versões, e as três estão no molde:

- **De 3 a 5.** Duas viram preferência pessoal; mais de cinco ninguém compara
- **Cada uma com aposta própria.** Se as apostas de duas podem trocar de lugar sem mudar nada, é a mesma versão com cor diferente
- **As cores saem do `identidade/tokens.css`** quando ele existe, e vão declaradas no spec pra dar pra medir contraste

Texto de tela usa dado plausível do negócio do usuário: nome de produto que ele vende,
valor que ele cobra, horário que ele atende. "Item 1, Item 2" esconde exatamente os
problemas que a sessão deveria achar. Dado de cliente real, não: nome inventado.

### Passo 4 — Conferir o desenho por comando, depois gerar

O desenho se confere antes de existir tela. As quatro falhas do molde passam por leitura
atenta e nenhuma passa pelo comando:

```bash
node scripts/prototipo.js conferir prototipo/<slug>/fluxo.json
```

No ramo fluxo ele acusa ação sem destino, tela que ninguém alcança, tela sem saída, fluxo
sem fim, botão sem texto e dois botões com o mesmo texto. Acusa também valor de `dados` ou
de `define` que não é texto nem número, porque o painel imprimiria `[object Object]` na
frente da pessoa.

No ramo visual, a régua é outra: quantidade fora de 3 a 5, versão sem nome, versão sem
aposta, duas versões apostando na mesma coisa, `<style>` que vaza pras vizinhas, e par de
cor que reprova no WCAG AA, com a razão medida e impressa.

Nos dois ramos ele exige as três perguntas, mede as cores do casco e recusa referência de
fora do arquivo: `<img src="https://...">`, `@import`, folha de estilo de outro lugar. É o
que sustenta a promessa de um HTML só.

Só depois, o HTML:

```bash
node scripts/prototipo.js fluxo  prototipo/<slug>/fluxo.json   # ou
node scripts/prototipo.js visual prototipo/<slug>/visual.json
node scripts/verificar.js html prototipo/<slug>/prototipo.html
node scripts/verificar.js alvo prototipo/<slug>/prototipo.html
```

O script recusa gerar com problema em aberto, e faz bem: protótipo com botão morto mede a
paciência da pessoa, não o entendimento dela. Se o resultado divergir do que você
esperava, conserte o spec e rode de novo; não edite o HTML gerado, porque a próxima
geração apaga a edição.

O arquivo sai único, sem CSS de fora, sem imagem de fora, sem npm. No ramo visual, as
versões trocam pelos botões da barra ou por `?v=1` até `?v=5`.

### Passo 5 — Escrever as três perguntas

Elas ficam na barra de baixo, visíveis enquanto a pessoa clica, porque quem conduz
esquece. Três, nem duas nem cinco, e o script exige três.

O que faz a pergunta funcionar: ela pede **ação ou expectativa**, nunca avaliação.

| Ruim | Boa |
|---|---|
| "Ficou fácil, né?" | "O que você faria agora nessa tela?" |
| "Você gostou?" | "O que aqui você não faria de jeito nenhum?" |
| "Tá claro que precisa pagar?" | "Nesse ponto, o pedido já está feito?" |

A tabela completa, com o motivo de cada uma, está no molde.

### Passo 6 — Mandar e conduzir

O arquivo abre **no navegador**. Vale dizer isso pro usuário na entrega, porque o caminho
errado queima a sessão:

- **Melhor caminho:** abrir junto, na máquina dele ou em chamada com a tela compartilhada. Quem conduz vê onde a pessoa para
- **Por e-mail:** anexo, com a instrução "salva e abre no Chrome"
- **Por WhatsApp:** chega como documento e, em vários aparelhos, abre como texto em vez de abrir a página. Se for o único canal, avisar pra salvar o arquivo e abrir pelo navegador
- **Por link:** o arquivo precisa estar num lugar que sirva HTML. Pasta de nuvem costuma oferecer o download, não a página

A condução está no molde, seção "A sessão". O resumo: cinco a dez minutos, um clicador por
vez, silêncio depois de mandar, anotar onde a pessoa hesita, e nunca consertar ao vivo.

No ramo fluxo, o botão "Copiar o caminho" devolve a trilha pelos nomes das telas
("Carrinho → Endereço → Pagamento"), pronta pra colar em "O que a pessoa fez". Use isso no
lugar da memória: onde ela voltou um passo é metade da resposta.

### Passo 7 — Registrar a decisão antes de jogar fora

O esqueleto nasce por comando, pra não perder nada do spec:

```bash
node scripts/prototipo.js conclusao prototipo/<slug>/fluxo.json
```

E fica assim, pra preencher durante a conversa:

```markdown
# Protótipo — <título>

- **Pergunta que ele responde:** <a pergunta do Passo 1>
- **Ramo:** fluxo clicável | versões da tela
- **Rodou em:** <AAAA-MM-DD>
- **Quem clicou:** <nome e papel>

## O que foi posto na frente da pessoa
| Tela (ou Versão) | No que ela aposta |
|---|---|

## O que a pessoa fez
<o caminho, onde parou, o que perguntou em voz alta, onde clicou no que não era botão>

## As três perguntas
1. <pergunta>
   **Resposta:** "<a frase dela, literal>"

## Decisão
- **Escolhido:** <qual, em uma linha>
- **Motivo, na palavra dela:** "<citação>"
- **O que muda no que vai ser construído:** <concreto>
- **O que NÃO vai ser construído por causa disso:** <obrigatório>

## Para onde isso vai
- [ ] entra em `sistemas/<nome>/ESCOPO.md` (`/escopo`)
- [ ] entra na lista de entregas (`/quebrar`)
- [ ] nada: a resposta foi "não construir", e está registrada aqui

## O código descartável
- [ ] jogado fora em <data>
```

A linha do que **deixou** de ser construído é a que dá valor ao arquivo. Protótipo que não
tirou nada do escopo em geral só confirmou o que o dono já queria, e isso também é bom
saber: fica escrito, com data.

Fechado o registro, apagar o HTML e o spec, ou mover a pasta pra onde o usuário guarda
material morto. A decisão vira item em `sistemas/<nome>/ESCOPO.md` pelo `/escopo`, ou
entrega nova pelo `/quebrar`. E a próxima conversa começa do arquivo, não da memória de
quem estava na sala.

---

## Regras

- **Sem pergunta escrita, não começa.** "Quero ver como fica" não é pergunta. Devolver o Passo 1 e insistir uma vez; se não houver pergunta, dizer que não vale protótipo e encerrar sem criar pasta
- **O ramo sai da pergunta, não do gosto.** Dúvida de caminho respondida com telas bonitas deixa a dúvida de pé; dúvida de layout respondida com fluxo não descobre qual tela a pessoa entende
- **Rodar `node scripts/prototipo.js conferir` antes de gerar o HTML.** Sempre. Botão que não leva a lugar nenhum faz a pessoa achar que travou, e a sessão morre ali
- **Nunca entregar par de cor que reprova no WCAG AA** (4,5:1 em texto normal, https://www.w3.org/TR/WCAG22/#contrast-minimum, conferido em 23/09/2026). Versão escolhida porque a outra estava ilegível não decidiu nada. A regra é a mesma do `/design-system`
- **Estado só na memória.** Nada de `localStorage`, banco ou servidor no protótipo. Recarregar volta ao começo, e é bom que volte: a segunda pessoa a clicar começa limpa
- **Três perguntas, e elas pedem ação.** Pergunta que já traz a resposta ("ficou claro, né?") gasta a sessão e devolve simpatia
- **Não explicar a tela antes.** A primeira coisa que a pessoa faz sem instrução é o dado mais valioso do dia. Explicação é a resposta entregue de graça
- **Não consertar ao vivo.** Anotar, terminar a sessão, consertar depois. Consertar no meio apaga o problema e a memória dele
- **O código é descartável, e isso é regra, não estilo.** Protótipo que vira base do produto entra em produção sem erro tratado, sem teste e sem banco pensado. Quem constrói de verdade é o `/backend`, a partir do `/quebrar`
- **Nada de dado de cliente real na tela** (nome, telefone, CPF, endereço, valor devido). O arquivo circula por e-mail e pelo celular de terceiro, e essa é a definição de dado pessoal da LGPD: "informação relacionada a pessoa natural identificada ou identificável" (Lei 13.709/2018, art. 5º, I, https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm, conferido em 23/09/2026). Usar nome inventado com cara de real. Se o protótipo mexe com dado de saúde, de criança ou de origem racial, o enquadramento é de dado sensível e a orientação aqui não substitui advogado
- **Não inventar o número que aparece na tela.** Preço, prazo e taxa saem do que o usuário cobra hoje, ou entram como `[a confirmar]`. Tela de protótipo com valor chutado faz o cliente decidir com base em conta que ninguém fez
- **A conclusão se preenche durante a conversa**, não depois de memória. Frase da pessoa entra entre aspas, literal, inclusive quando contraria o usuário
- **Não inventar o que a pessoa disse.** Se a sessão não aconteceu ainda, o arquivo fica com os campos em aberto e diz isso
- **Fronteira:** decidir o que entra, quanto custa e se vale é `/escopo`; ordenar em entregas é `/quebrar`; o padrão visual das telas de uso é `/interface` e as cores são `/design-system`; página no ar pra captar, site de várias páginas, página de compra e o servidor são `/landing`, `/site`, `/produto` e `/backend`; testar duas versões com tráfego real e amostra calculada é `/teste-ab`; o que fazer com o sistema no ar e uso medido é `/evoluir`; a decisão de negócio grande, fora de software, é `/decidir`
- **Protótipo não é demonstração de venda.** Se o usuário quer mostrar pro cliente pra fechar contrato, a peça é `/proposta`. Maquete apresentada como produto cria expectativa de algo que não existe
