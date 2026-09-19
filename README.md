# Contex OS

> O sistema operacional do seu negócio dentro da sua IA de código.

Sua empresa ganha uma memória própria, uma identidade visual aplicada em tudo
que ela gerar, e 75 skills prontas pra fazer marketing, conteúdo, SEO, ads,
oferta, preço, venda, material e operação rodarem com você dirigindo.

E quando o assunto é software, ele não para em escrever código: diz se vale a
pena construir, quanto custa manter, e o que fazer com o sistema que já existe.

**Você não precisa decorar comando nenhum.** Fala o que quer em português — "faz
um carrossel sobre X", "quanto eu devo cobrar por isso", "minha página não
converte", e o sistema sabe o que fazer.

Bora.

---

## Ligando o sistema

<!-- ia:inicio -->
Funciona no **Claude Code** e no **Codex**. Você escolhe qual na instalação, e o
sistema fica inteiro no formato daquela IA. Dois caminhos pra ligar.

### Pela IA (mais rápido)

Abre o Claude Code ou o Codex na pasta do teu negócio (vazia, com o nome dele,
ex: `varefy`) e cola:

```
Clona o conteúdo de https://github.com/vertsystems/contexos.git direto nesta
pasta (sem criar subpasta) e começa a instalação do Contex OS.
```

Ele clona, mostra o banner, pergunta qual IA você está usando, e dispara a
entrevista de setup. Você só responde.

### Pelo terminal (mais previsível)

```
git clone https://github.com/vertsystems/contexos.git varefy
cd varefy
code .
```

Troca `varefy` pelo nome do teu negócio. Se a pasta já existe (e está vazia),
entra nela e roda `git clone https://github.com/vertsystems/contexos.git .` (o
ponto no final clona pra dentro dela).

Na janela do VS Code que abrir: terminal integrado → `claude` ou `codex` → diz
"oi". A instalação começa sozinha na primeira mensagem.

---

Nos dois caminhos o sistema chega direto na raiz do projeto, sem pasta
`contexos/` no meio: o arquivo de regras (`CLAUDE.md` no Claude Code, `AGENTS.md`
no Codex), a pasta de skills (`.claude/skills/` ou `.agents/skills/`),
`templates/` e `scripts/` ao lado do teu trabalho. A pasta é o teu negócio, e
tudo que você produzir mora aqui.

### As duas IAs na mesma pasta

A base é de uma IA só, a que você escolheu. A outra pode abrir a pasta como
visita: ela encontra um arquivo de entrada mínimo, lê as regras da base e
trabalha com tudo, sem mover nada. Se um dia quiser trocar a base:

```
node scripts/ia.js codex     # ou claude
node scripts/ia.js status    # mostra o formato ativo
```

O script converte pastas, arquivo de regras e cada referência no texto, e o
caminho de volta é igual.
<!-- ia:fim -->

A instalação roda uma vez só. Te entrevista sobre o negócio, monta a memória e
configura o sistema. Depois disso, é só falar o que você quer.

---

## O sistema

**Perdido?** Pergunta "o que eu faço agora?" — ele olha o estado do teu
workspace e te diz o próximo passo.

**Núcleo** — o jeito de operar o dia a dia
Carrega o contexto antes de cada sessão · faz commit + push no GitHub · varre o
projeto e atualiza a memória · cria pasta isolada pra cada cliente · mantém o
pipeline do que tá em jogo · fecha a semana e alimenta a próxima · transforma o
que você repete em skill própria · traz a versão nova do Contex OS sem tocar no
teu trabalho · guarda onde você parou e retoma de lá · transforma gravação de
reunião em ata, decisões e tarefas · entrevista até fechar as pontas de uma
decisão grande · liga ferramenta de fora (chave de IA, Instagram, Notion,
Vercel) uma tela por vez, com teste no fim · e agenda o que repete: revisão
toda sexta, ads toda segunda, caixa no dia 1.

**Vender** — o que decide o faturamento
Desenha o que você vende, com bônus, garantia e motivo pra ser agora · te ajuda
a chegar no preço, montar faixas e responder "tá caro" · descobre quem compra e
a dor na palavra dele · prepara a conversa que fecha · diz por que a página não
converte · monta a proposta comercial em HTML.

**Crescer** — o que traz cliente novo
Planeja o lançamento em três fases, com datas conferidas e meta em número ·
desenha a série de e-mails ou WhatsApp com gatilho e intervalo · monta a lista
de prospects e a abordagem fria com follow-up e fim elegante · programa de
indicação com a conta de quanto vale · parceria com outro negócio ou criador
local, do formato ao contrato mínimo · workshop, live ou evento na loja, do
roteiro à colheita · e transforma o que você sabe em curso ou treinamento.

**Medir** — de onde vem o cliente
Instala GA4, pixel e a convenção de UTM, lê o mês por canal e responde "de
onde veio" · desenha teste A/B honesto, com amostra mínima e duração
calculadas antes de começar (e diz quando o teste não vai fechar).

**Marca** — o rosto do negócio, aplicado em tudo
Transforma sua identidade em tokens (paleta, tipografia, espaçamento) com
contraste validado, e se você ainda não tem marca, propõe 3 direções · define
posicionamento, história e voz · audita qualquer peça: contraste com número,
hierarquia, mobile e cara de template genérico.

**Antes de criar** — o que faz conteúdo sair sólido em vez de genérico
Monta o banco de pautas com origem rastreável · levanta dossiê com números
datados, fonte e citações literais de como o público fala · pega um tema e
devolve 10 tratamentos diferentes, cada um com gancho escrito · distribui tudo
no mês com mix de funil e formato.

**Criar** — as peças
Carrosséis 1080×1350 com a marca aplicada · artigo de blog + carrossel + 3
legendas amarradas · página de conversão em HTML · e-book, apostila ou guia em
PDF com qualidade editorial · deck pra reunião e pitch · site institucional de
várias páginas com sitemap e schema · planilha Excel de verdade, com fórmula
que recalcula · proposta e contrato em Word editável · e transforma o que você
já tem (live, artigo, PDF) em 5 peças novas.

**Qualidade** — o filtro antes de sair
Corta gordura, mata clichê de IA, confere o tom contra o seu jeito de escrever e
marca toda afirmação sem fonte. E quando o texto saiu de máquina e continua com
cara de máquina mesmo sem clichê, ele mede o que está errado: ritmo das frases,
quanto do texto é genérico, e reescreve com a sua voz, sem inventar fato.

**Distribuição e retorno**
Fluxo de SEO em 8 passos (demanda, concorrência, GMB, on-page, conteúdo, ads,
monitoramento, GEO) · campanha de Google Ads em CSV pronto pro Editor ·
relatório semanal de mídia paga com alertas · respostas humanas pras reviews do
Google · pauta pra imprensa local e do setor.

**Dinheiro** — o que quase nenhum sistema mostra
Fecha o mês: quanto entrou, quanto sobrou de verdade, quanto vale sua hora, qual
serviço dá lucro e qual só dá trabalho · o ponto de equilíbrio, calculado com
os teus custos fixos, não com média de mercado · os próximos meses em três
cenários (dá pra contratar? aguento janeiro?) · e o calendário fiscal do MEI,
do Simples e do autônomo, com valor, prazo e fonte oficial.

**Depois do fechou**
Alinha a expectativa do cliente novo · pede depoimento na hora em que ele está
satisfeito · reativa quem sumiu · recupera orçamento sem resposta · formaliza em
contrato de prestação de serviço, com o que **não** está incluso escrito · e
mapeia os concorrentes pra achar a brecha.

**Canais**
Atendimento e respostas de WhatsApp, inclusive como falar de preço sem perder a
conversa · roteiro cena a cena pra Reels, TikTok e Shorts, com o gancho dos três
primeiros segundos · e e-mail em HTML que chega inteiro na caixa de entrada,
com descadastro em um clique.

**Software** — quando o negócio precisa de sistema, não de peça
Diz o que vale construir e quanto custa, quebra o escopo aprovado em entregas
pequenas na ordem certa, e aí constrói: servidor, API, banco, login e
publicação, com os dados desenhados antes do código · o padrão das telas de uso (botão, campo, tabela, painel e os quatro
estados: cheio, vazio, carregando, erro) · duração e curva das animações · a
página onde o cliente compara e escolhe, com o botão antes da ficha técnica · e
o laudo que junta acessibilidade (WCAG 2.2) e velocidade (LCP, INP, CLS) numa
auditoria só.

**Apoio**
Cataloga seus ativos reutilizáveis (depoimento, foto, dado, case) · lê
CSV/XLSX/PDF e devolve resumo executivo · rascunha e-mail a partir de contexto
livre.

O sistema **produz e entrega os arquivos**: imagens numeradas, legenda pronta
pra copiar e um `como-postar.md` com o passo a passo. Quando e onde publicar é
decisão sua.

<details>
<summary><strong>Avançado (opcional)</strong></summary>

**Foto por IA:** você conecta a sua conta — Gemini (tem cota gratuita, não pede
cartão) ou OpenAI. Passo a passo em `templates/imagem-ia.md`. Sem isso, as peças
saem com tipografia, que funciona bem.

**Publicação automática:** dá pra publicar direto no site + Instagram + Facebook
via API da Meta. Exige token e site com deploy automático. Só vale em volume
alto: pra uso normal, entregar os arquivos e programar na mão é mais rápido.

</details>

---

## A tese

IA não é uma ferramenta que sua empresa usa. É o sistema operacional em que ela
roda.

A diferença não é velocidade. É capacidade nova: uma pessoa com IA constrói o
que antes exigia time inteiro. Cada processo crítico que hoje roda em open loop
(decide → executa → não mede → repete cego) vira closed loop dentro do Contex OS
(decide → executa → captura → realimenta → ajusta sozinho).

O sistema não substitui você. Vira parte da sua empresa.

---

## Como o Contex OS pensa

`_memoria/` é o cérebro. Tudo que importa do seu negócio mora aqui: quem é a
empresa, como ela fala, o que tá em foco, quem compra e o que você vende. O
O assistente lê isso antes de cada resposta. Quanto melhor a memória, melhor o sistema.

`identidade/` é o rosto. Design-guide, logo e os tokens que travam a marca em
valores fixos. Todo carrossel, slide, proposta e página respeita isso.

`pesquisa/` e `biblioteca.md` são a matéria-prima: dados com fonte, citações do
público, depoimentos, cases. É de onde sai conteúdo específico em vez de
conteúdo plausível.

`conteudo/`, `site/`, `materiais/`, `propostas/` e as demais são o resultado. O
sistema produz, versiona no GitHub, fica tudo seu.

**Nenhuma pasta é criada antes de ser usada.** Fez o primeiro carrossel, nasce
`conteudo/`. Fez a primeira página, nasce `site/`.

**O ciclo de conteúdo:** acha o que dizer → traz com o que embasar → escolhe
como dizer → decide quando → produz → filtra → você publica → mede e realimenta
a próxima rodada.

**O ciclo de venda:** descobre a dor real → define o que te diferencia →
desenha o que você vende → chega no valor → apresenta → conduz a conversa →
diz o que travou → volta pra oferta com informação nova.

---

## Atualizar

Saiu versão nova? Fala "atualiza o Contex OS". Ele baixa o que mudou e sincroniza
as skills **sem tocar no seu trabalho**: memória, marca, conteúdo e propostas
ficam intactos, e as skills que você criou por conta própria também.

---

## Licença

MIT: livre. Use no seu negócio, modifique, use com seus clientes. Detalhes no
arquivo `LICENSE`.

---

## Quando precisar

Contex OS é um produto **Vert Systems**.

**Bruno Santana**
WhatsApp: [13 99728-7738](https://wa.me/5513997287738)
E-mail: bruno.bsarts@gmail.com
