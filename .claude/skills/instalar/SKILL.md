---
name: instalar
description: >
  Instalação inicial do Contex OS: entrevista o dono do negócio sobre empresa, canais de contato, tom de
  voz, foco atual e identidade, preenche a memória e adapta o CLAUDE.md ao perfil. Use quando o usuário
  acabou de clonar o repositório, ou disser "instalar", "rodar o instalar", "primeiro setup",
  "configurar o sistema", "acabei de baixar", ou /instalar.
---

# /instalar — Instalação inicial do Contex OS

Primeira coisa depois de clonar, e ela começa sozinha: se `_memoria/` não existe, o arquivo de regras da raiz manda executar esta skill na primeira mensagem do usuário, seja ela qual for. Não pode falhar e não pode soar burocrático. Trata como conversa de descoberta: uma pergunta por vez, escuta de verdade, sem enfileirar tudo.

**A pasta que ele clonou já é o workspace dele.** Nada a mover, nada a copiar: as skills já estão em `.claude/skills/`, os moldes em `templates/`. A instalação preenche a memória e adapta o `CLAUDE.md` ao negócio.

---

## Abertura — antes de qualquer coisa

Primeira coisa na tela, antes de rodar comando, conferir pasta ou perguntar
qualquer coisa. Imprimir **exatamente** este bloco, dentro de um bloco de código
pra fonte monoespaçada:

```
  BEM-VINDO AO

  ██╗   ██╗██╗██████╗ ███████╗██████╗      ██████╗ ███████╗
  ██║   ██║██║██╔══██╗██╔════╝██╔══██╗    ██╔═══██╗██╔════╝
  ██║   ██║██║██████╔╝█████╗  ██████╔╝    ██║   ██║███████╗
  ╚██╗ ██╔╝██║██╔═══╝ ██╔══╝  ██╔══██╗    ██║   ██║╚════██║
   ╚████╔╝ ██║██║     ███████╗██║  ██║    ╚██████╔╝███████║
    ╚═══╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝

  O sistema operacional do seu negócio — Desenv. por: Vert Systems

  Vou te fazer algumas perguntas sobre seu projeto ou negócio.
  Leva poucos minutos, e você terá um cérebro digital funcionando.
```

**Não mexer no desenho.** Cada linha tem largura calculada (66 colunas no total,
cabe em terminal de 80). Reindentar, "arrumar" espaço ou trocar caractere
desalinha o traçado das letras, e desalinho de um caractere só já estraga.

Depois de imprimir, seguir direto pra pergunta da IA, sem comentar o banner.

---

<!-- ia:inicio -->
## Qual IA — antes da Fase 0

O Contex OS roda no Claude Code e no Codex, e o workspace fica **inteiro** no
formato de um dos dois: arquivo de regras, pasta de skills, moldes e cada
referência no texto. Quem decide é o usuário, agora. Perguntar em texto, sem
seletor:

> "Qual IA você está usando aqui?
>
> 1. Claude Code
> 2. Codex"

Com a resposta, rodar:

```bash
node scripts/ia.js claude    # ou
node scripts/ia.js codex
```

O script deixa tudo no formato daquela IA e gera, pra outra, um arquivo de
entrada mínimo (visita), pra ela poder abrir a pasta depois sem mudar a base.

- **Claude Code:** `CLAUDE.md` + `.claude/skills/`. Nada muda de lugar; o script
  só confere e regenera o `AGENTS.md` de visita. Seguir pra Fase 0
- **Codex:** as skills vão pra `.agents/skills/`, o `CLAUDE.md` vira `AGENTS.md`,
  `.claude/` some e as referências são reescritas. **Este arquivo mudou de
  lugar:** reler `AGENTS.md` e continuar por `.agents/skills/instalar/SKILL.md`,
  da Fase 0 em diante. Não fazer nada de memória: o texto reescrito é o que vale

Se ele responder outra coisa ("Cursor", "Gemini", "não sei"): dizer em uma linha
que o Contex OS hoje roda no Claude Code e no Codex, e que outro cliente que leia
`AGENTS.md` funciona no formato do Codex. Na dúvida, Claude Code, que é o formato
em que o sistema é publicado.

Se a resposta for a IA em que o workspace já está (`node scripts/ia.js status`
mostra), o script não muda nada além de conferir. Não é erro.

**Reinstalação numa base já escolhida** (`_memoria/` existe e a IA da resposta é
outra): perguntar antes de converter. Trocar a base é decisão dele, não efeito
colateral de reinstalar.
<!-- ia:fim -->

---

## Fase 0 — Preparar o terreno (rápido, sem perguntar nada)

### 1. Conferir onde está

Rodar `pwd` e `ls`. A pasta deve ter `.claude/skills/`, `templates/` e `CLAUDE.md` **na raiz**. Se não tiver, o usuário está na pasta errada: perguntar onde ele clonou. Se existir uma subpasta `contexos/` com esses arquivos dentro, o clone criou pasta a mais: mover o conteúdo dela pra raiz (`git mv` não serve aqui, é `mv contexos/.[!.]* contexos/* .` e depois `rmdir contexos`) e seguir, avisando em uma linha.

Se `_memoria/` já existir preenchido, é reinstalação: perguntar se refaz do zero, complementa o que falta, ou se ele queria atualizar o sistema (`/atualizar-sistema`).

### 2. Criar o mínimo

- `_memoria/empresa.md`, `preferencias.md`, `estrategia.md` — copiar os moldes de `templates/memoria/`
- `.env` — copiar de `.env.example` (não pedir chave nenhuma agora)

**Não criar** `conteudo/`, `site/`, `propostas/`, `identidade/`, `dados/` nem qualquer outra. Elas nascem quando a primeira peça daquele tipo for feita.

### 3. Separar o repositório dele do repositório do Contex OS

O clone veio apontando pro repositório do produto. Renomear esse endereço, pra ele poder ter o repositório dele depois **e** continuar recebendo atualização:

```bash
git remote rename origin contexos 2>/dev/null
```

Se der erro (ele baixou o zip em vez de clonar), tudo bem: seguir. O `/atualizar-sistema` funciona nos dois casos.

---

## Fase 1 — Escolha do perfil

Perguntar qual perfil combina com o que ele vai fazer aqui. São sete, então a
pergunta vai **em texto, como lista numerada** (o seletor de opções que alguns
clientes têm só cabe quatro, e cortar perfil pra caber é pior que ele digitar um número):

1. **Empreendedor solo / criador de conteúdo** — uma pessoa, marca pessoal e negócio misturados
2. **Freelancer** — atende clientes, organiza por projeto/cliente
3. **Agência / consultoria** — equipe pequena entregando pra vários clientes
4. **Empresa** — empresa estabelecida com setores
5. **Comércio / negócio local** — loja, restaurante, clínica, salão, oficina: tem endereço, horário e cliente que passa na porta ou chama no WhatsApp
6. **Profissional liberal** — médico, advogado, contador, psicólogo, arquiteto, personal: vende a própria hora, vive de agenda e indicação, tem conselho de classe
7. **Projeto** — uma coisa só sendo construída: um sistema, um app, um site, uma ideia pra validar. Ainda não é empresa, ou é uma frente isolada dentro de uma

A resposta define três coisas:
- Qual template de `CLAUDE.md` aplicar (`templates/perfis/claude-md-<perfil>.md`):
  `empreendedor-solo`, `freelancer`, `agencia`, `empresa`, `comercio-local`,
  `profissional-liberal`, `projeto`
- **Qual convenção de pastas** vale (ver `templates/estrutura.md`):
  - Freelancer e Agência → **por cliente** (`clientes/<Nome>/conteudo/`)
  - Todos os outros → **por tipo de entrega** (`conteudo/`, `site/`, `vendas/`, `sistemas/`)
- **Qual entrevista** roda na Fase 2: a padrão (1 a 4) ou a própria do perfil (5, 6 e 7)

Explicar a escolha em uma linha, sem jargão:

> "Como você atende clientes, vou organizar por cliente: cada um ganha uma pasta com o trabalho dele dentro. Se preferir organizar por tipo de entrega, me fala."

Se ele descreve o que vai fazer em vez de escolher um número ("tenho uma
padaria", "sou dentista", "é um sisteminha pra controlar estoque"), mapear pro
perfil mais provável, dizer qual foi em uma linha e seguir. Casos de fronteira:

- Clínica com vários profissionais e recepção → Comércio local. Um profissional
  atendendo sozinho, mesmo com secretária → Profissional liberal
- Consultor que atende empresas por projeto → Freelancer. Contador com carteira
  fixa de clientes mensais → Profissional liberal
- Loja que também vende online pelo Instagram → Comércio local. Loja só online,
  sem endereço físico → Empreendedor solo

---

## Fase 2 — Entrevista

Perguntas em ordem, esperando a resposta de cada uma. Resposta vaga: repetir uma vez pedindo concretude e seguir com o que vier.

**Comércio local, Profissional liberal e Projeto têm entrevista própria** (abaixo). Os outros quatro seguem esta:

**Sobre o negócio:**
1. "Como você chama o que você faz? (nome da empresa, ou seu nome se for marca pessoal)"
2. "O que sua empresa entrega, em uma frase do jeito que você falaria pro vizinho?"
3. "Quem te paga? (perfil de cliente real — uma ou duas frases, sem persona genérica)"
4. "Você toca sozinho ou tem equipe? Se tem, quantos e cada um fazendo o quê?"

**Sobre contato:**
5. "Me passa os canais do negócio, o que tiver: site, WhatsApp, telefone, e-mail comercial, @ do Instagram, endereço e a região que você atende. O que não existir, só fala 'não tenho'."

> Esses dados alimentam CTA de carrossel, extensão de chamada do Google Ads, assinatura de e-mail e rodapé de proposta. Sem eles, o sistema para no meio pra perguntar.

**Sobre voz:**
6. "Me cola um exemplo da tua escrita — uma legenda do Insta, um e-mail pra cliente, qualquer coisa real e recente. Assim eu calibro o jeito de escrever sem precisar adivinhar."
7. "O que te dá ranço quando alguém escreve assim? (ex: 'vamos juntos!', emoji em e-mail formal, 'caro cliente', 'alavancar', 'sinergia')"

**Sobre foco:**
8. "Qual o gargalo do teu negócio hoje? O que tá segurando ele de crescer?"
9. "Se eu pudesse tirar UMA coisa que você repete toda semana das tuas costas, qual seria?"

**Sobre identidade visual:**
10. "Tem identidade visual definida ou tá no zero? Se tem, me passa as cores principais e a fonte."
11. "Tem logo? Se sim, me manda o arquivo que eu guardo no lugar certo."

---

### Entrevista — Comércio / negócio local

O que esse perfil precisa está no balcão: endereço, horário, o que mais sai e como o cliente chega. Sem isso, CTA, anúncio e SEO local saem errados. Sem pergunta de "posicionamento" nem de "audiência".

**Sobre o negócio:**
1. "Como se chama e o que é? (padaria, restaurante, clínica, salão, loja de quê)"
2. "Endereço completo e horário de funcionamento, dia a dia. Se fecha em feriado ou tem horário de almoço, fala."
3. "O que mais sai? Os 3 a 5 produtos ou serviços que seguram o faturamento, com o preço de cada um."
4. "Quanto o cliente gasta em média por vez? Um número aproximado serve."
5. "Como o cliente chega hoje: passa na porta, chama no WhatsApp, pede pelo iFood, acha no Google, vem por indicação? O que mais pesa?"

**Sobre quem toca:**
6. "Quem atende, quem responde o WhatsApp e quem cuida do caixa? Pode ser tudo você."

**Sobre canais:**
7. "Me passa os canais: WhatsApp comercial, telefone fixo, Instagram, link do Google Meu Negócio (ou se ainda não reivindicou), iFood ou app de delivery. O que não existir, só fala 'não tenho'."

> O Google Meu Negócio é o canal que mais traz cliente local e o que mais fica abandonado. Se ele não reivindicou, abrir item no `tarefas.md` na Fase 3: é a primeira coisa a fazer.

**Sobre cliente e voz:**
8. "Quem compra de verdade? Perfil real: moradora do bairro, funcionário do prédio ao lado, mãe que busca filho na escola em frente."
9. "Me cola uma resposta sua de WhatsApp pra cliente, real e recente. Assim eu escrevo do teu jeito."
10. "O que te dá ranço quando negócio escreve? ('prezado cliente', 'experiência diferenciada', emoji demais)"

**Sobre foco:**
11. "O que te trava hoje: movimento fraco em dia específico, cliente que some, avaliação ruim no Google, não saber quanto sobra no mês, tempo pra postar?"
12. "Se eu pudesse tirar UMA coisa que você repete toda semana das tuas costas, qual seria?"

Mapeamento pra memória: 1-7 → `empresa.md` (o campo **Perfil** recebe "Comércio local"; endereço, horário, ticket e "o que mais sai" vão em **Contexto adicional** com preço, e também na seção "O negócio" do `CLAUDE.md`); 8 → `empresa.md` e semente do `publico.md`; 9-10 → `preferencias.md` (a 9 vira **Exemplo de escrita real**); 11-12 → `estrategia.md`. Não perguntar de identidade visual: se ele tem logo e cores, ele conta na 7 ou depois. Se não tem, o negócio local funciona sem, e o sistema propõe quando ele pedir.

### Entrevista — Profissional liberal

Esse perfil tem uma pergunta que os outros não têm: **o que o conselho de classe deixa falar**. Pular isso gera anúncio que dá processo ético. O resto é agenda, indicação e voz.

**Sobre a atuação:**
1. "Qual a tua profissão e especialidade? E o registro (CRM, OAB, CRC, CRP, CRN, CAU, CREF) com número e UF."
2. "Atende presencial, online ou os dois? Se presencial, onde (bairro e cidade)."
3. "O que você faz, na prática: consulta, acompanhamento, parecer, processo, projeto? Os 2 ou 3 serviços que mais atende."
4. "Como cobra e quanto, mais ou menos: por consulta, por hora, mensal, por projeto? Se preferir não registrar valor, tudo bem, registro 'conforme tabela'."

**Sobre o que pode dizer:**
5. "O teu conselho restringe publicidade? Por exemplo: preço em anúncio, antes-e-depois, depoimento de paciente, promessa de resultado. Me diz o que você sabe que não pode. Se não tiver certeza, eu deixo marcado pra confirmar e pergunto antes de publicar qualquer coisa."

> Nunca preencher essa regra por conta própria com "o que costuma valer pra médico". A regra vai pro `CLAUDE.md` como ele disse, ou como `[a confirmar]`. Chute aqui vira infração no nome dele.

**Sobre quem atende:**
6. "Quem te procura hoje? Perfil real, sem persona: idade, o que sente ou precisa, por onde chegou."
7. "Como a maioria chega: indicação, Google, Instagram, convênio, plataforma (Doctoralia, iFood da profissão)? E quantos atendimentos você faz por semana, mais ou menos?"

**Sobre canais:**
8. "Me passa os canais: WhatsApp de atendimento, Instagram, site, link do Google Meu Negócio, e-mail profissional. O que não existir, só fala 'não tenho'."

**Sobre voz:**
9. "Me cola algo que você escreveu pra paciente ou cliente, real e recente: uma mensagem, uma orientação, uma legenda. É a régua de tom."
10. "O que te dá ranço quando profissional da tua área escreve? ('agende já', jargão sem tradução, diminutivo, tom de vendedor)"

**Sobre foco:**
11. "O que te trava hoje: agenda com buraco, paciente que não volta, depender de indicação, não saber cobrar, tempo pra postar?"
12. "Se eu pudesse tirar UMA coisa que você repete toda semana das tuas costas, qual seria?"

Mapeamento pra memória: 1-4 e 7-8 → `empresa.md` (o campo **Perfil** recebe "Profissional liberal"; registro, modalidade e honorário em **Contexto adicional** e na seção "Quem sou" do `CLAUDE.md`); 5 → seção "O que eu posso e não posso dizer" do `CLAUDE.md`, literal ou `[a confirmar]`; 6 → semente do `publico.md`; 9-10 → `preferencias.md`; 11-12 → `estrategia.md`. Identidade visual: não perguntar; se ele tem, conta na 8. A regra de sigilo entra no `CLAUDE.md` mesmo que ele não fale dela.

### Entrevista — Projeto

O projeto ainda não tem canal, equipe nem voz de marca na maioria dos casos. Perguntar o que ele tem, sem forçar resposta pra pergunta de empresa:

**Sobre o projeto:**
1. "Como o projeto se chama? (pode ser provisório)"
2. "O que ele faz, em uma frase do jeito que você falaria pro vizinho?"
3. "Pra quem é? Quem usa e, se for diferente, quem paga."
4. "Em que pé está: ideia, validando, construindo ou já no ar?"
5. "Tem algo parecido no mercado que você usa de referência? Se tem, o que ele cobra e o que ele faz mal."

**Sobre quem toca:**
6. "Você toca sozinho ou tem alguém junto? Se tem, cada um faz o quê?"
7. "Já tem repositório, hospedagem ou banco escolhidos? Se sim, quais. Se não, tudo bem, o `/escopo` decide na hora."

**Sobre foco:**
8. "O que precisa acontecer pra esse projeto ser considerado um sucesso nos próximos 90 dias? Um resultado, com número se der."
9. "O que te trava hoje? (tempo, decisão técnica, não saber por onde começar, dinheiro)"

**Sobre voz e identidade:**
10. "Tem nome de domínio, cores, fonte ou logo? Se tem, me passa. Se tá no zero, o sistema propõe quando você pedir."
11. "Como o projeto deve falar com quem usa? Se ainda não sabe, deixo 'a calibrar' e sigo direto e simples."

Mapeamento pra memória: 1-5 e 6-7 → `empresa.md` (o campo **Perfil** recebe "Projeto"; canais que não existem ficam vazios); 8-9 → `estrategia.md` (a 8 vira **Prioridade principal** com prazo em data absoluta, a 9 vira **Gargalo atual**); 10 → `identidade/` só se houver material; 11 → `preferencias.md`.

## Fase 3 — Preencher a memória

### `_memoria/empresa.md`
Respostas 1-4 e 5 (bloco "Contato e canais"). Campo que ele não tem: deixar vazio, não inventar.

### `_memoria/preferencias.md`
Respostas 6-7:
- **Tom de voz:** derivado do exemplo real da 6
- **O que evitar:** lista direta da 7
- **Exemplo de escrita real:** colar o texto da 6 literalmente — é a régua mais confiável do sistema

### `_memoria/estrategia.md`
Respostas 8-9: fase, gargalo, "pra tirar das costas" (candidata a virar skill via `/mapear-rotinas`), prioridade principal derivada do gargalo, contexto com prazo em data absoluta.

### Identidade visual (só se houver material)
Se ele passou cores/fontes/logo, **agora** criar `identidade/` e preencher o `design-guide.md` (molde em `templates/identidade/`). Logo vira `identidade/logo.<ext>`.

Se não tem nada, **não criar a pasta**. Avisar:

> "Você não tem identidade definida ainda, então nem criei a pasta. Quando quiser,
> é só falar 'monta minha identidade visual' — eu monto a paleta, a tipografia e os
> tokens com contraste validado. E se não souber por onde começar, eu proponho 3
> direções pra você escolher."

### `CLAUDE.md`
Pegar `templates/perfis/claude-md-<perfil>.md`, adaptar com as respostas, e **substituir o `CLAUDE.md` da raiz**. Precisa conter:

- Contexto do negócio (nome, o que faz, cliente, equipe)
- Tom de voz (resumo — o detalhe fica em `_memoria/preferencias.md`)
- **Seção "Onde salvar o que"** com a convenção escolhida na Fase 1
- **Regra de criação sob demanda:** "criar pasta só quando a primeira peça daquele tipo for feita"
- As seções próprias do perfil, preenchidas com a entrevista: "O negócio" (endereço, horário, ticket, o que mais sai) no comércio local; "Quem sou" com registro e "O que eu posso e não posso dizer" no profissional liberal; "O projeto" com fase e referência no projeto
- As regras de operação do sistema — copiar do `CLAUDE.md` original (contexto, aprender com correções, manter atualizado, criação de skills, segredos, qualidade da saída, execução). **Nunca jogar essas regras fora**

---

## Fase 4 — Resumo

```
Pronto. Instalado em: <caminho>

✓ Formato: <IA escolhida>, com arquivo de visita pra outra IA
✓ Memória do negócio em _memoria/
✓ CLAUDE.md no perfil <perfil>, com a convenção de pastas ([por tipo | por cliente])
✓ Marca: [identidade/ criada | ainda no zero]

As outras pastas nascem conforme você for usando: fizer um carrossel, nasce
conteudo/; fizer uma página, nasce site/.
```

---

## Fase 5 — Conferir a raiz

A pasta em que ele clonou é a raiz do negócio: o nome dela já é o nome do projeto
(o README manda clonar com `git clone <url> <nome>` ou `git clone <url> .`).
Não pedir pra renomear nada nem fechar o editor.

Se `pwd` mostrar que a pasta se chama `contexos` e o negócio não se chama assim, ele
clonou do jeito antigo. Avisar em uma linha e seguir, sem transformar isso em
tarefa:

> "A pasta ficou com o nome do sistema (`contexos`). Funciona igual, mas se quiser
> que ela se chame `<slug>`, é só renomear no Finder (ou Explorer) quando fechar o
> VS Code."

`<slug>` é o nome da empresa em minúsculas, sem acento, espaço vira hífen.
Ex: "Padaria São João" → `padaria-sao-joao`.

---

## Fase 6 — Mostrar que está funcionando

Não terminar com instrução. **Demonstrar**, na mesma conversa: rodar o `/abrir` e mostrar o resumo do negócio já carregado da memória, ou, se ele mencionou dor de conteúdo, dar 3 pautas concretas do nicho dele.

Depois:

> "Tá tudo de pé. E você não precisa decorar comando nenhum: fala o que quer em
> português — 'faz um carrossel sobre X', 'quanto eu cobro por isso', 'minha página
> não converte' — que eu sei o que fazer.
>
> Se quiser ver as opções, pergunta 'o que eu faço agora?'.
>
> Você mencionou que repete '<resposta da 9>' toda semana. Quando quiser tirar isso
> das costas, é só falar que eu transformo numa skill sua."

Mencionar também, em uma linha: guardar o trabalho no GitHub é só pedir; e quando sair versão nova do Contex OS, falar "atualiza o sistema".

---

## Regras

- **Não inventar dados.** Resposta vaga fica registrada como veio, ou como `[a confirmar]` visível
- **Dado de contato tem que ser confirmado antes de virar fato.** DDD, número de WhatsApp e e-mail vão pra dentro de CTA, anúncio e PDF — errar um dígito mata todo clique. Se houver qualquer dúvida (o DDD não bate com a cidade que ele disse, o número tem contagem estranha), gravar como `[a confirmar]` e abrir item no `tarefas.md`. Em teste real o DDD entrou como fato e se espalhou por 9 arquivos e um PDF
- **Não pedir chave de API nenhuma.** Setup de integração é assunto da skill que precisa dela
- **Não criar pasta vazia.** Só `_memoria/`, `.env` e (se houver marca) `identidade/`
- Ao substituir o `CLAUDE.md`, **preservar as regras de operação do sistema**
- Não escrever "este arquivo será preenchido pelo /instalar" nos arquivos finais
- 5-7 minutos no máximo. Se o usuário enrolar numa pergunta, registrar o que tem e seguir
- **A pergunta da IA vem antes de tudo**, logo depois do banner. Fase 0 em diante já roda no formato escolhido
- **Nunca pedir pro usuário fechar o editor**
- Ao terminar, deixar claro que ele fala em português — sem barra, sem comando decorado
