---
name: medir
description: >
  Instala e lê o rastreamento do negócio: GA4 com os eventos que valem dinheiro (clique no
  WhatsApp, formulário, compra), pixel da Meta quando há anúncio, UTM em todo link publicado
  (gerado por comando), rastreio do que não é digital ("como você chegou até a gente") e a
  leitura mensal a partir de CSV do GA4, da Meta ou da planilha: de onde veio cada cliente,
  quanto custou por canal, o que cortar.
  Use quando o usuário disser "de onde vem meu cliente", "não sei o que está funcionando",
  "instalar o Google Analytics", "como coloco o pixel", "link com UTM", "quanto custa cada
  cliente", "vale a pena continuar no Instagram", "o que está trazendo gente", "quero medir
  o site", "ninguém sabe dizer de onde veio", ou /medir.
---

# /medir — De onde vem meu cliente

> **Convenção de pastas:** a saída vai em `medicao/`. Na convenção **por cliente**, `clientes/<Nome>/medicao/` quando a medição é do site de um cliente; a do próprio negócio fica na raiz. A pasta nasce no primeiro plano.

Todo dono de negócio pequeno responde "de onde vem seu cliente?" com uma opinião:
"acho que é indicação", "o Instagram traz bastante". Opinião decide onde vai o dinheiro do
mês: mais anúncio, mais post, mais panfleto. Medir é trocar o "acho" por uma tabela que
diz quantos clientes cada canal trouxe e quanto cada um custou. A tabela custa duas
horas de instalação e vinte minutos por mês. A opinião custa o orçamento inteiro.

## Dependências

- **Contexto:** `_memoria/empresa.md` — site, plataforma (Wix, WordPress, Shopify, página do `/landing`), canais em que publica, se anuncia, onde o cliente chega (WhatsApp, formulário, loja, telefone)
- **Foco:** `_memoria/estrategia.md` — qual resultado importa agora (lead, venda, agendamento) define o evento principal
- **Oferta:** `_memoria/oferta.md` — o valor médio da venda, pra calcular o que um canal devolve
- **Molde:** `templates/crescimento/medicao.md` — glossário, os cinco eventos, convenção de UTM, rastreio do não digital, LGPD e cookies
- **Script:** `scripts/utm.js` — gera link com UTM (um ou uma lista), lê link, e conta origem em qualquer CSV (planilha de clientes, export do GA4, da Meta, do Google Ads), com filtro por mês
- **Entrada de dado:** export do GA4, da Meta, do Google Ads ou a planilha de clientes com coluna `origem`, jogados em `dados/`
- **Vizinhas:** `/relatorio-ads` lê só mídia paga; `/seo` cuida do orgânico do Google e do Search Console; `/landing` e `/anuncio-google` geram os links que passam por aqui; `/indicacao` usa a mesma convenção pra código de indicador
- **Saída:** `medicao/plano-de-medicao.md`, `medicao/utm.md` (convenção e tabela de links, gerada a partir de `medicao/links.csv`) e `medicao/leitura-<AAAA-MM>.md`

---

## Workflow

A skill tem duas portas. **Instalar** (Passos 1 a 7) é feito uma vez, e revisitado quando
surge canal novo. **Ler** (Passo 8) é todo mês. Se `medicao/plano-de-medicao.md` já existe,
pular pro Passo 8, a não ser que o usuário peça pra mexer na instalação.

### Passo 1 — Levantar o que existe

Ler `_memoria/empresa.md` antes: metade disso pode estar lá. Perguntar só o que falta, em
uma mensagem só, não uma pergunta por vez:

> 1. "Tem site? Em que plataforma, e quem mexe nele (você, um freela, uma agência)?"
> 2. "O Google Analytics já está instalado? Se sim, você sabe entrar nele?"
> 3. "Está anunciando? Onde (Meta, Google), quanto por mês?"
> 4. "Quando um cliente novo chega, ele chega por onde: WhatsApp, formulário, ligação, loja física, compra no site?"
> 5. "Você anota os clientes em algum lugar (planilha, sistema, agenda)? Tem coluna de 'como chegou'?"
> 6. "Onde você publica link do seu negócio hoje? (bio, stories, e-mail, cartão, Google Meu Negócio, parceiro)"

O que ele **não** souber responder vira `[a confirmar]` no plano. Não adivinhar plataforma
nem gasto de anúncio.

### Passo 2 — Escolher o evento que vale dinheiro

Ler a tabela "Os cinco eventos" em `templates/crescimento/medicao.md` e escolher, com o
usuário, **um** evento principal e até dois de apoio. A pergunta é: "o que a pessoa faz
no site que te faz ganhar dinheiro?"

| Negócio | Evento principal | Apoio |
|---|---|---|
| Serviço vendido por conversa | `clique_whatsapp` | `clique_telefone` |
| Serviço com orçamento por formulário | `generate_lead` | `clique_whatsapp` |
| Loja virtual | `purchase` | `generate_lead` (cadastro) |
| Clínica, salão, consultoria com agenda | `agendamento` | `clique_whatsapp` |

Rolagem, tempo na página e clique no menu não entram: são interesse, não resultado. Um
evento principal claro é o que faz o relatório de daqui a três meses dizer "o Instagram
trouxe 14 conversas, o Google trouxe 3" em vez de "o Instagram trouxe 800 visitas".

### Passo 3 — Instalar o GA4

Se já está instalado, pedir o ID de medição (começa com `G-`) e pular pra marcação de
evento (item 5). Se não, o roteiro, na ordem em que a ferramenta apresenta:

1. Entrar em analytics.google.com com a conta Google **do negócio**, não a pessoal de um funcionário: quando ele sai, o acesso vai junto
2. Criar a conta, depois a propriedade (nome do negócio, fuso de Brasília, moeda BRL)
3. Criar o fluxo de dados **Web** com o endereço do site. A ferramenta mostra o ID de medição `G-XXXXXXXXXX`
4. Colar a tag do Google no `<head>` de **todas** as páginas. Onde colar depende da plataforma:

| Plataforma | Onde |
|---|---|
| Página do `/landing` ou HTML próprio | Editar o arquivo direto, dentro do `<head>` |
| WordPress | Plugin de cabeçalho, ou o campo de código do tema |
| Wix, Shopify, Nuvemshop, Hotmart | Integração nativa: colar só o ID `G-...` no painel, sem o código |
| Feito por terceiro | Mandar o trecho pronto por e-mail (`/email-profissional`) com a instrução "no head de todas as páginas" |

A tag, com o ID no lugar:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

5. Marcar os eventos do Passo 2. Clique em WhatsApp e telefone é `onclick` no link (trecho no molde). Formulário e compra disparam na página de confirmação, nunca no clique do botão "enviar": clique não é envio. Quando a página é do `/landing`, fazer a edição direto no HTML e rodar `node scripts/verificar.js html <arquivo>` depois
6. Conferir em **Relatórios → Tempo real**: abrir o site numa aba anônima, clicar no WhatsApp, ver `clique_whatsapp` aparecer no painel em até um minuto. Sem essa confirmação, a instalação não está pronta
7. Em **Administrador → Exibição de dados → Eventos principais → Novo evento principal**, digitar o nome exato do evento escolhido. Dá pra marcar antes mesmo de ele disparar pela primeira vez

O nome dos menus muda de tempos em tempos. Se um passo não bate com o que o usuário vê,
usar WebSearch com o nome do menu e o ano, em vez de insistir no roteiro.

Se o site é feito por terceiro e o usuário não tem acesso, a skill entrega o trecho, a
instrução e a lista de eventos num e-mail pronto. Não fica bloqueada esperando o
terceiro: segue pros Passos 5 e 6, que não dependem do site.

### Passo 4 — Pixel e API de conversões da Meta (só quem anuncia)

Se o usuário não anuncia na Meta, pular. Pixel sem anúncio é dado coletado sem uso, e é
mais coisa pra explicar na política de privacidade.

Se anuncia:

1. No Gerenciador de Eventos da Meta, criar o pixel (a ferramenta chama de "conjunto de dados" em algumas telas) e copiar o código base
2. Colar no `<head>`, do mesmo jeito que a tag do Google. Plataforma com integração nativa usa só o ID. Se o site tem banner de cookie, o pixel só carrega depois do aceite (o molde explica o modo de consentimento)
3. Marcar os eventos padrão que correspondem aos do Passo 2: `Contact` pro clique no WhatsApp, `Lead` pro formulário, `Purchase` pra compra, `Schedule` pro agendamento. Mesmo evento, nome da Meta
4. Ativar a **API de conversões**: com plataforma integrada (Shopify, WordPress com plugin oficial) é uma chave no painel; sem plataforma, a opção "Gateway" da própria Meta ou a integração via Google Tag Manager. A API existe porque bloqueador de anúncio e o iOS apagam parte do que o pixel vê; sem ela o anúncio otimiza com dado pela metade
5. Testar em "Testar eventos" no Gerenciador: abrir o site, clicar, ver o evento chegar

Se o usuário anuncia no Google, o `/anuncio-google` já pede a tag de conversão; o
`/medir` só confirma que o evento principal do GA4 está importado no Google Ads.

Como o anúncio vai render depois de instalado é assunto do `/relatorio-ads`. Aqui a
pergunta é se o pixel vê o que precisa ver.

### Passo 5 — Convenção de UTM e a tabela de links

Ler a convenção em `templates/crescimento/medicao.md` e montar a lista de **todo** lugar
onde o negócio publica link (resposta 6 do Passo 1). Cada lugar vira uma linha de
`medicao/links.csv`, com as colunas `onde;url;source;medium;campaign;content`. Esse
arquivo é a fonte: fica em `medicao/`, versionado, e cresce a cada canal novo. O script
gera os links:

```bash
node scripts/utm.js --lista medicao/links.csv --md          # a tabela pra colar no utm.md
node scripts/utm.js --lista medicao/links.csv --saida medicao/links-prontos.csv
```

Pra um link avulso, no meio de uma conversa:

```bash
node scripts/utm.js https://seusite.com.br/promo --source instagram --medium social --campaign black-friday-2026 --content stories-1
```

O script normaliza (minúscula, sem acento, hífen), avisa quando o `medium` foge da
convenção e quando o link é `wa.me` (o WhatsApp ignora UTM). Nunca montar link na mão:
"Instagram" e "instagram" viram duas linhas no relatório e ninguém percebe até o mês
fechar. Pra conferir um link que já existe: `node scripts/utm.js ler "<url>"`.

Escrever `medicao/utm.md`:

```markdown
# Convenção de UTM — <negócio>

## As regras (resumo da convenção)
- source: de onde (instagram, google, newsletter, indicacao, cartao...)
- medium: o tipo (social, paid_social, cpc, email, referral, offline, cliente)
- campaign: a ação (bio, sempre, black-friday-2026)
- content: a variação, quando a mesma campanha tem mais de um link
- Tudo minúsculo, sem acento, hífen no lugar de espaço. Gerar com `node scripts/utm.js`

## Os links do negócio
| onde | source | medium | campaign | content | Link |
|---|---|---|---|---|---|
[saída do --md]

## Link novo
1. Acrescentar a linha em `medicao/links.csv`
2. Rodar `node scripts/utm.js --lista medicao/links.csv --md` e atualizar a tabela acima
3. Trocar o link no lugar (bio, stories, assinatura) no mesmo dia
```

Depois de gerar, a tarefa do usuário é **trocar** os links nos lugares. Anotar em
`tarefas.md` (`/tarefas`): "trocar link da bio", "trocar link da assinatura", um por
linha. Link gerado e não trocado mede nada.

### Passo 6 — Rastrear o que não é digital

Metade do cliente de negócio local chega por caminho que ferramenta nenhuma vê. O que
resolve é a pergunta e a coluna:

1. **A pergunta** "como você chegou até a gente?", feita a todo cliente novo, no primeiro contato. Escrever a versão na voz do usuário, pro WhatsApp e pro balcão (o `/whatsapp` tem o formato)
2. **A lista fechada de resposta**, igual à coluna `source`: `instagram · google · indicacao · passou-na-frente · placa · whatsapp · evento · outro · nao-sei`. Adaptar ao negócio (tirar "placa" de quem não tem loja, acrescentar "feira" de quem faz feira)
3. **A coluna `origem`** na planilha ou sistema de clientes, com esses valores. Quando é indicação, uma segunda coluna `indicado-por`. Se a planilha não existe, criar `dados/clientes.csv` com o cabeçalho `nome;data;origem;indicado-por;valor` e entregar vazia. Fica em `dados/` de propósito: a pasta não vai pro git, e a planilha tem dado pessoal
4. **Código por canal** quando não dá pra perguntar: cupom por canal, QR com UTM no material físico, texto pré-preenchido no link do WhatsApp (`?text=Oi, vim pelo Instagram`). A tabela do molde lista as opções

Isso é mais importante que o GA4 pra quem vende por conversa. GA4 vê o clique no
WhatsApp; a coluna `origem` vê quem pagou.

### Passo 7 — Escrever o plano de medição

```markdown
# Plano de medição — <negócio> — <data>

## O que conta como resultado
Evento principal: `<nome>` (o que a pessoa faz que vale dinheiro)
De apoio: `<nome>`, `<nome>`

## O que está instalado
| Ferramenta | Estado | ID / onde | Conferido em |
|---|---|---|---|
| GA4 | instalado / pendente com <quem> / [a confirmar] | G-... | <data do teste em Tempo real> |
| Pixel da Meta | instalado / não se aplica | ... | ... |
| API de conversões | ... | ... | ... |
| Tag de conversão do Google Ads | ... | ... | ... |

## Onde os eventos disparam
| Evento | Página ou botão | Como foi marcado |
|---|---|---|

## Rastreio fora do site
- Pergunta do atendimento: "<texto na voz do usuário>"
- Lista de resposta: ...
- Onde anota: <planilha ou sistema>, coluna `origem`
- Códigos por canal: <cupom, QR>

## LGPD
- Política de privacidade: <existe / precisa criar> lista <ferramentas>
- Banner de cookie: <precisa / não precisa>, motivo
- O que nunca entra em link ou evento: nome, telefone, e-mail, CPF

## Leitura mensal
Todo dia <N> do mês: exportar <relatórios>, rodar `/medir` com os arquivos em `dados/`

## Pendências
- [ ] ...
```

Rodar `node scripts/verificar.js datas medicao/plano-de-medicao.md` se o plano cita dia
da semana. A política de privacidade, quando não existe, é peça do `/landing` ou do
`/documento`; o plano só aponta o que ela precisa listar.

### Passo 8 — Ler o mês

Pedir os arquivos, ou ler o que estiver em `dados/`. De onde cada um sai:

- **GA4:** Relatórios → Aquisição → Aquisição de tráfego; trocar a dimensão da tabela pra **Origem/meio da sessão**; período = o mês; Compartilhar → Baixar arquivo → CSV. O export vem com linhas `#` no começo e um bloco de totais no fim; o script ignora os dois
- **Meta:** Gerenciador de Anúncios → Campanhas → período = o mês → Exportar → CSV. As colunas que importam são "Nome da campanha" e "Valor usado (BRL)"; conferir o nome exato com `head -1 dados/meta-2026-08.csv`, porque a Meta muda o rótulo de vez em quando
- **Google Ads:** o mesmo export que o `/relatorio-ads` usa (Campanha, Custo)
- **Planilha de clientes** com a coluna `origem` e a coluna `data`, o ano inteiro; o script filtra o mês

Contar por comando, nunca lendo:

```bash
# visitas e eventos principais por origem/meio (o export já vem agrupado: --peso conta pela coluna de sessões)
node scripts/utm.js contar dados/ga4-2026-08.csv --coluna 1 --peso "Sessões" --soma "Principais eventos" --md

# clientes novos e receita por origem, só as linhas do mês (a planilha tem uma linha por cliente)
node scripts/utm.js contar dados/clientes.csv --coluna origem --valor valor --mes 2026-08 --md

# gasto por campanha na Meta (o nome da coluna de gasto vem do head -1)
node scripts/utm.js contar dados/meta-2026-08.csv --coluna "Nome da campanha" --valor "Valor usado (BRL)" --md

# custo por cliente = gasto do canal ÷ clientes que ele trouxe, por comando
node -e 'console.log((1500 / 12).toFixed(2))'
```

Formato brasileiro (`1.234,56`) é normalizado pelo script. Custo por cliente só existe pra
canal com gasto em reais. Canal sem gasto tem custo em horas: perguntar ao usuário quanto
tempo por semana vai em cada um, e marcar como declarado.

Escrever `medicao/leitura-<AAAA-MM>.md`:

```markdown
# Leitura — <mês>/<ano>

## Em uma frase
[De onde veio a maior parte dos clientes, quanto custou, e a decisão que isso permite.]

## Visitas que agiram (GA4)
| Origem/meio da sessão | Sessões | % | Principais eventos |
|---|---|---|---|
[saída do contar --peso]

## Clientes que pagaram (planilha)
| origem | Quantidade | % | valor |
|---|---|---|---|
[saída do contar --valor --mes, com a linha "(não informado)" mantida]

## Custo por canal
| Canal | Gasto (R$) | Horas declaradas | Clientes | Custo por cliente (CPA) |
|---|---|---|---|---|
| meta paid_social | ... | | ... | R$ ... |
| instagram social | 0 | ... h | ... | ... h por cliente |
| indicacao | 0 | ... h | ... | ... h por cliente |

## O que cortar, manter e aumentar
1. [decisão com o número que a sustenta: "o Google trouxe 3 clientes a R$ 210 cada; a indicação trouxe 7 a custo zero em reais e duas horas por semana"]
2. ...

## O que a medição não vê ainda
- "Não sei de onde veio": N clientes (X%). [se acima de 20%, a ação é a pergunta do atendimento]
- [link sem UTM que apareceu como direct, evento que não disparou, export que faltou]

## Comparado com o mês anterior
[só se existe leitura anterior: o que mudou e o que explica]
```

Rodar `node scripts/verificar.js tabela medicao/leitura-<AAAA-MM>.md` antes de entregar:
ele soma as colunas e compara com a linha de total. Se divergir, refazer a partir do
export, nunca ajustar o número.

Direct alto (acima de um terço das sessões) quase sempre é link sem UTM, não gente
decorando o endereço. Voltar ao Passo 5 e procurar qual link ficou sem.

---

## Regras

- **Todo número vem de export ou de contagem por comando.** Nunca de estimativa, nunca de memória do usuário ("acho que uns 30 vieram do Instagram"). Se não há export nem planilha, a leitura do mês não existe; existe a instalação
- **"Não sei de onde veio" é uma linha da tabela.** Nunca some, nunca é distribuída entre os outros canais, nunca é excluída do total. A porcentagem dela é o principal indicador de quanto a medição ainda falha
- **Um evento principal.** Marcar cinco é o mesmo que nenhum. Se o usuário quer medir tudo, explicar uma vez e escolher com ele
- **Link com UTM sai do script**, nunca da mão. Valor com maiúscula, acento ou espaço vira linha duplicada no relatório, e a leitura do mês sai errada sem ninguém perceber
- **Pixel só com anúncio.** Instalar pixel da Meta em site que não anuncia é coletar dado sem finalidade, e é mais coisa pra justificar na política de privacidade
- **Nada de dado pessoal em link, evento ou UTM.** Nome, telefone, e-mail e CPF nunca entram em parâmetro de URL nem em evento do GA4. Código de indicador é código, não nome
- **Aviso de cookie com recusar do mesmo tamanho do aceitar.** Banner só de "aceitar" não é consentimento. Detalhe legal (prazo, exceção, multa) entra como `[a confirmar]` com a orientação da ANPD; a skill não é parecer jurídico
- **Planilha de clientes fica no negócio.** Coluna `origem` é dado pessoal comum: não vai pra ferramenta externa sem autorização explícita, e o CSV só é lido localmente (LGPD)
- **Custo por cliente só com gasto em reais.** Indicação e orgânico têm custo em horas, declarado pelo usuário e marcado como declarado. Não converter hora em reais sem o custo da hora do `/caixa`
- **Números de ferramentas diferentes não batem, e isso é normal.** GA4, Meta e planilha usam regras de atribuição diferentes. A tabela que decide é a de clientes que pagaram; as outras explicam o caminho
- **Fronteira:** desempenho de campanha paga (CPA, criativo, frequência) é `/relatorio-ads`; orgânico do Google e Search Console é `/seo`; a página em si é `/landing` e `/conversao`; o programa de indicação e o código do indicador são `/indicacao`. O `/medir` instala o que todos eles leem, e é o único que junta tudo pra responder "de onde vem"
- **Instalação sem teste em Tempo real não está pronta.** O plano registra a data do teste; sem ela, o estado é "pendente"
