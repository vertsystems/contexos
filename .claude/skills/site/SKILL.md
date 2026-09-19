---
name: site
description: >
  Monta o site institucional inteiro, de quatro a seis páginas: home, sobre, serviços ou
  produtos, casos, contato e privacidade, com menu e rodapé iguais em toda página, um CSS só
  com os tokens da marca, title, description e schema próprios por página, sitemap e robots,
  formulário que funciona sem servidor e a instrução de publicar com domínio próprio.
  Use quando o usuário disser "quero um site", "preciso de um site pra minha empresa", "site
  com várias páginas", "site institucional", "meu site é de 2015", "quero aparecer no Google
  com um site de verdade", "site com página de serviços e contato", "colocar o site no ar",
  "site pra clínica", "site pro escritório", ou /site.
---

# /site — O site inteiro, não uma página

> **Convenção de pastas:** a saída vai na raiz de `site/` (`index.html`, `sobre.html`, `servicos.html`, `contato.html`, `privacidade.html`, `css/site.css`, `sitemap.xml`, `robots.txt`). Na convenção **por cliente**, `clientes/<Nome>/site/`. Landing e página de produto continuam em subpasta (`site/<nome>/`), e o site aponta pra elas. A pasta nasce na primeira página.

Quem procura "dentista em Moema" no Google não quer uma página de vendas: quer saber se a
clínica existe, onde fica, quanto custa e se tem gente de verdade lá dentro. O site responde
isso em quatro ou cinco páginas que se sustentam sozinhas, com o mesmo menu, o mesmo rodapé
e o mesmo WhatsApp em todas. É a peça que mais dura no negócio: a landing muda a cada
campanha, o site fica anos no ar. Por isso ele nasce com CSS único, título próprio por
página e sitemap, e não com cinco cópias da mesma coisa.

## Dependências

- **Contexto:** `_memoria/empresa.md` (o que vende, endereço, horário, telefone, WhatsApp, CNPJ, registro profissional)
- **Tom:** `_memoria/preferencias.md`
- **Cliente real:** `_memoria/publico.md`, se existir. A palavra que ele usa pra buscar é o h1 da home
- **Oferta:** `_memoria/oferta.md`, se existir. É de lá que sai o preço ou o "a partir de" de cada serviço
- **Marca:** `identidade/tokens.css` se existir; senão `identidade/design-guide.md`; senão o padrão desta skill (sóbrio, fundo claro, uma cor de destaque)
- **Palavras-chave:** `seo/`, se o `/seo` já rodou. Decide se "serviços" é uma página ou uma por serviço
- **Prova:** `biblioteca.md` (fotos reais, depoimentos com nome, números com fonte)
- **Molde:** `templates/design/site-institucional.md`, a arquitetura por perfil, o que cada página precisa ter, o schema de cada tipo e o checklist de publicação
- **Referências de design:** `templates/design/briefing-visual.md`, `templates/design/qualidade-visual.md`, `templates/design/anti-generico.md`, `templates/design/acessibilidade.md`, `templates/design/desempenho.md`
- **Referências de copy:** `templates/copy/psicologia.md`, `templates/copy/edicao.md`, `templates/copy/humanizacao.md`
- **Scripts:** `scripts/site.js` (conferir o conjunto, gerar sitemap e robots) e `scripts/verificar.js` (contraste, texto, peso)
- **Saída:** `site/index.html`, `site/sobre.html`, `site/servicos.html` (ou `site/<servico>.html`, uma por serviço), `site/casos.html` quando houver, `site/contato.html`, `site/privacidade.html`, `site/404.html`, `site/css/site.css`, `site/sitemap.xml`, `site/robots.txt`, e `site/como-publicar.md`

---

## Workflow

**Antes de tudo: declarar a leitura.** Uma linha visível: *"Estou lendo isso como: site de
[perfil] para [público], com linguagem [vibe]."* Depois os três ajustes (variação, movimento,
densidade) de `templates/design/briefing-visual.md`. Site institucional pede densidade média e
movimento baixo: quem chega quer achar o telefone, não assistir a uma animação.

### Passo 1 — Ver o que já existe

Antes de perguntar qualquer coisa:

```bash
ls site/ identidade/ seo/ 2>/dev/null
cat biblioteca.md 2>/dev/null | head -60
```

- `site/index.html` na raiz já existe: é um site em andamento. Perguntar se é pra refazer ou
  acrescentar página, e ler o `css/site.css` que está lá antes de tocar em qualquer coisa
- `site/<nome>/index.html` em subpasta: é landing ou página de produto. Não mexer; o site
  novo linka pra ela quando fizer sentido (promoção no menu, planos no botão)
- `identidade/tokens.css` existe: o `:root` dele vai inteiro pro `site.css`. Se não existe e
  a marca tem cor definida no `design-guide.md`, usar a descrição. Se não tem nada, oferecer o
  `/design-system` **uma vez** e seguir com o padrão da skill caso ele prefira

Se o usuário já tem site no ar, pedir a URL e ler as páginas: o que está lá é a base do
`sobre` e dos serviços, e o que falta nele é a lista de erros do molde.

### Passo 2 — Fechar o perfil e o que falta (uma mensagem só)

O perfil quase sempre está em `empresa.md` (comércio local, profissional liberal, agência
ou estúdio, projeto ou sistema). Confirmar em uma linha e, na mesma mensagem, levantar o que
o site não pode inventar:

> 1. "Endereço completo e horário, com o dia que fecha?" (só se atende presencial)
> 2. "Número do WhatsApp que vai no site, com DDD?"
> 3. "Quais serviços entram, e o preço ou o 'a partir de' de cada um?"
> 4. "Tem foto sua ou da equipe, de verdade? E do lugar?"
> 5. "Tem depoimento com nome que posso usar, ou nota no Google?"
> 6. "CNPJ, e registro profissional se houver (CRO, OAB, CREA, CRECI)?"
> 7. "Já tem domínio? Qual?" (se não, o site nasce com endereço provisório e o `site/como-publicar.md` explica como registrar)
> 8. "Vai usar Google Analytics, Pixel da Meta ou formulário por serviço externo?" (muda a página de privacidade)

O que ele não responder entra como `[a confirmar]` na copy e **não vai pro HTML**: o
`site.js conferir` reprova placeholder, de propósito.

### Passo 3 — Definir a arquitetura e esperar o sim

Consultar a tabela de perfis em `templates/design/site-institucional.md` e propor a lista
de páginas, com o que cada uma responde e o nome do arquivo:

| Perfil | Páginas propostas |
|---|---|
| Comércio local | `index`, `produtos` (ou `cardapio`), `sobre`, `contato`, `privacidade` |
| Profissional liberal | `index`, `servicos` (ou uma por serviço), `sobre`, `contato`, `privacidade` |
| Agência ou estúdio | `index`, `servicos`, `casos`, `sobre`, `contato`, `privacidade` |
| Projeto ou sistema | `index`, `como-funciona`, `precos` (ou link pra `/produto`), `sobre`, `contato`, `privacidade` |

Página por serviço só entra com prova de busca: um arquivo em `seo/` que mostre volume pra
"<serviço> em <cidade>", ou o usuário dizendo que é o serviço que mais vende. Sem isso,
"serviços" é uma página com uma seção por serviço e âncora (`servicos.html#clareamento`).

Mostrar a lista e esperar aprovação. Mudar arquitetura depois de cinco páginas prontas é
refazer menu, rodapé, sitemap e schema de todas.

### Passo 4 — Escrever a copy, página por página

Salvar o rascunho em `site/copy.md` (uma seção `## <pagina>.html` por página, com `title`,
`description` e o texto de cada bloco) e mostrar **antes** de montar HTML. Copy errada
descoberta com o site montado custa cinco arquivos de retrabalho.

O que cada página precisa ter está no molde. O que mais erra, na ordem:

- **Home**: o h1 diz o que vende, pra quem e onde, com a palavra do `publico.md`.
  "Contadora pra MEI e pequeno comércio em Curitiba" vale mais que "Soluções contábeis".
  Prova logo abaixo (anos, clientes, nota do Google com a quantidade). Três ou quatro blocos
  de serviço, cada um linkando pra página ou âncora própria. Um depoimento com nome. Chamada
  final com o mesmo destino do botão do topo
- **Serviços**: nome como o cliente chama, pra quem é, o que inclui, **preço ou "a partir
  de"** com o que faz variar, prazo, e chamada específica ("Agendar avaliação", não "Saiba
  mais"). Serviço sem preço nenhum manda o visitante perguntar no WhatsApp, e a maioria não
  pergunta. Se o usuário não quer mostrar preço, perguntar o motivo uma vez; se for
  variação grande, o "a partir de" resolve
- **Sobre**: nome, foto real, desde quando, o que fez começar, registro profissional. Texto
  em primeira pessoa quando é uma pessoa; "a gente" quando é equipe. Missão e visão não
  entram, a não ser que o usuário insista, e aí vão no fim
- **Casos**: cliente (ou "escritório de advocacia em Campinas" se não pode citar), problema,
  o que foi feito, resultado com número e prazo. Três casos bons; caso sem resultado vai pra
  galeria, não pra cá
- **Contato**: WhatsApp primeiro, com mensagem pré-preenchida. Telefone, e-mail, endereço,
  horário com o dia que fecha, mapa, tempo de resposta prometido. Formulário de três campos
- **Privacidade**: escrita a partir do que o site coleta de verdade (Passo 2, item 8).
  Texto seco, sem voz: é o único lugar do site que não se humaniza. Seções, nesta ordem:
  quem é o responsável (nome, CNPJ, e-mail), o que coleta e por qual canal (formulário,
  WhatsApp, Analytics, Pixel), pra quê, com quem compartilha (o serviço de formulário, o
  Google, a Meta), por quanto tempo guarda, como pedir acesso, correção ou exclusão, quais
  cookies existem e como desligar, e a data da última atualização

Cada página tem `title` de 50 a 60 caracteres com a palavra-chave no começo e `description`
de 120 a 155, os dois diferentes de todas as outras páginas. Contar por comando, nunca no
olho:

```bash
node scripts/verificar.js texto site/copy.md
node -e 'const t="<title da página>"; console.log(t.length)'
```

### Passo 5 — Montar o CSS compartilhado

Um arquivo só, `site/css/site.css`, mobile primeiro. Na ordem:

1. `:root` com os tokens: cópia do bloco do `identidade/tokens.css`, ou o padrão da skill.
   Nenhuma cor escrita fora do `:root`. O padrão, quando não há marca:

   ```css
   :root {
     --cor-texto: #1B1A17;       /* 16:1 sobre o fundo */
     --cor-texto-2: #5A5750;     /* 6,6:1, legenda e rodapé */
     --cor-fundo: #F7F5F1;
     --cor-cartao: #FFFFFF;
     --cor-primaria: #0B5D4B;    /* 7,2:1 sobre o fundo; texto branco em cima dá 7,8:1 */
     --cor-primaria-texto: #FFFFFF;
     --fonte: "Inter", system-ui, sans-serif;
     --raio: 8px; --espaco: 1rem; --largura: 68rem;
   }
   ```

   Trocar a `--cor-primaria` pela cor da marca e refazer a conta de contraste
2. Base: `box-sizing`, `body` com fonte, cor e fundo em token, `img { max-width: 100% }`,
   `:focus-visible` com contorno de 3px, link de pular pro conteúdo
3. Cabeçalho, menu, botão de contato, `.menu a[aria-current="page"]` marcado
4. Botões: `.btn` com `min-height: 44px` declarado (o `verificar.js alvo` exige a
   declaração, não confia em padding), primário e secundário
5. Seções: herói, grade de serviços, cartão, prova, faixa de chamada final
6. Formulário: campo com `label` visível, `min-height: 44px`, erro ao lado do campo
7. Rodapé e botão flutuante de WhatsApp (56px, canto inferior direito, `aria-label`)
8. `@media (min-width: 720px)` pra grade em colunas; `@media (pointer: coarse)` subindo alvo
   pra 44px; `@media (prefers-reduced-motion: reduce)` desligando transição

Contraste de cada par cor/fundo, por comando, antes de escrever a segunda página:

```bash
node scripts/verificar.js contraste "#1B1A17" "#F7F5F1"   # texto sobre fundo
node scripts/verificar.js contraste "#FFFFFF" "#0B5D4B"   # texto do botão sobre o botão
```

Mínimo 4,5:1 em texto corrido e botão; 3:1 em título grande. O `site.js conferir` refaz
essa conta lendo o `site.css`, mas só pra seletores que ele reconhece: `body`, `.btn`,
`button`, `.card`, `.hero`, `.rodape`, `footer`, `header`, `nav`, `.faixa`, `.destaque` e o
que começa com esses nomes (`.btn-primario`, `.faixa-cta`). Par com outro nome se confere na
mão, com o comando acima.

### Passo 6 — Montar as páginas

Toda página segue o mesmo esqueleto. O que muda é o `<head>`, o `aria-current` e o `<main>`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dentista em Moema, São Paulo | Clínica Vale Odontologia</title>
  <meta name="description" content="[120 a 155 caracteres, própria desta página]">
  <link rel="canonical" href="https://www.dominio.com.br/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="[igual ao title]">
  <meta property="og:description" content="[igual à description]">
  <meta property="og:image" content="https://www.dominio.com.br/img/og.jpg">
  <meta property="og:url" content="https://www.dominio.com.br/">
  <link rel="icon" href="favicon.svg">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=...&display=swap">
  <link rel="stylesheet" href="css/site.css">
  <script type="application/ld+json">{ "@context": "https://schema.org", "@type": "Dentist", ... }</script>
</head>
<body>
  <a class="pular" href="#conteudo">Pular para o conteúdo</a>
  <header class="topo"> logo → index.html · <nav aria-label="Principal"> · botão de WhatsApp </header>
  <main id="conteudo"> um h1, e as seções da página </main>
  <footer class="rodape"> endereço, horário, WhatsApp, telefone, e-mail, links, privacidade, CNPJ </footer>
  <a class="wa-flutuante" href="https://wa.me/55DDDNUMERO?text=..." aria-label="Conversar no WhatsApp">WhatsApp</a>
</body>
</html>
```

**Schema por página**, um bloco JSON-LD no `<head>`: `LocalBusiness` ou o subtipo
(`Dentist`, `Restaurant`, `HairSalon`, `AutoRepair`) na home e no contato quando há ponto
físico, com `address`, `telephone`, `openingHoursSpecification` e `priceRange`;
`ProfessionalService` pra quem atende sem loja; `Organization` pra agência e projeto;
`Service` na página de serviço; `BreadcrumbList` nas internas; `FAQPage` só se as perguntas
estão visíveis no HTML. Endereço e horário do schema iguais aos do rodapé e do Google Meu
Negócio, letra por letra.

**Formulário sem servidor**, escolher com o usuário no Passo 2:

| Opção | Como | Quando |
|---|---|---|
| WhatsApp | JS de dez linhas monta a mensagem com os campos e abre o `wa.me` | padrão: zero dependência, e a conversa segue onde ele atende |
| `mailto:` | `action="mailto:contato@..."` com `subject` | quando ele só olha e-mail; no desktop nem sempre abre |
| Serviço de formulário | `action` apontando pro Formspree, Web3Forms ou Netlify Forms | quando precisa de histórico; plano gratuito tem limite mensal [a confirmar no serviço] |

Em qualquer uma: campo obrigatório marcado, aviso de privacidade com link pra
`privacidade.html` **antes** do botão, e `action` nunca vazio. Na opção WhatsApp, o `action`
recebe o próprio `wa.me` (é o que funciona se o JS falhar) e o script só melhora a mensagem:

```html
<form action="https://wa.me/5511987654321" method="get" data-whatsapp>
  <label for="nome">Nome</label> <input id="nome" name="nome" required>
  <label for="msg">O que você precisa</label> <textarea id="msg" name="msg" required></textarea>
  <p class="aviso">Seus dados só servem pra responder essa mensagem. <a href="privacidade.html">Política de privacidade</a></p>
  <button class="btn btn-primario" type="submit">Chamar no WhatsApp</button>
</form>
<script>
document.querySelector("[data-whatsapp]").addEventListener("submit", function (e) {
  e.preventDefault();
  var texto = "Olá, sou " + this.nome.value + ". " + this.msg.value;
  window.open(this.action + "?text=" + encodeURIComponent(texto), "_blank");
});
</script>
```

O `site.js conferir` reconhece o destino pelo `action`, pelo `data-whatsapp` ou pelo
`addEventListener("submit")`; formulário sem nenhum dos três reprova.

**Imagens:** toda `<img>` com `alt`, `width` e `height`. A do topo sem `loading="lazy"`;
as outras com. Foto de banco de imagem no `sobre` derruba a confiança: sem foto real, a
seção sai sem foto. Peso:

```bash
node scripts/verificar.js peso site/
```

**Imagem OG:** uma só pro site inteiro, `img/og.jpg` de 1200×630, com foto real do lugar ou
o logo sobre a cor de fundo da marca. Página com foto própria pode ter a sua; as outras
apontam pra padrão.

**Analytics e Pixel**, se ele pediu no Passo 2: o mesmo trecho antes do `</head>` de toda
página, uma vez, e o nome da ferramenta na `privacidade.html`. O `site.js conferir` acusa
rastreador em site sem privacidade.

**404.html** com o menu, uma frase e o botão pra home, e `<meta name="robots"
content="noindex">` pra não entrar no sitemap. Netlify, Cloudflare Pages e Vercel usam esse
nome sozinhos.

### Passo 7 — Gerar sitemap e robots

Com o domínio em mãos:

```bash
node scripts/site.js sitemap site/ --dominio https://www.dominio.com.br --corrigir
```

Gera `sitemap.xml` com toda página indexável (fora `404.html` e `noindex`), cria ou
atualiza o `robots.txt` com a linha `Sitemap:`, e com `--corrigir` alinha o `canonical` e o
`og:url` de cada página à URL final. `--limpo` tira o `.html` da URL; só usar se a
hospedagem serve a URL `sobre` sem o `.html` (Netlify e Cloudflare Pages servem; na Vercel precisa
de `cleanUrls` no `vercel.json`). Mesmo com `--limpo`, os links internos do HTML continuam
com `.html`: funcionam abertos do disco e na hospedagem, e o `conferir` avisa se algum perdeu.

Sem domínio ainda: gerar com o endereço que a hospedagem vai dar (`https://<nome>.netlify.app`,
`https://<nome>.pages.dev`, `https://<usuario>.github.io/<projeto>`; o script aceita
subpasta), anotar em `tarefas.md` "rodar o sitemap de novo com o domínio real", e dizer
isso na entrega. Canonical apontando pra endereço que não existe é pior que nenhum.

### Passo 8 — Conferir o conjunto (obrigatório)

```bash
node scripts/site.js conferir site/ --dominio https://www.dominio.com.br
```

Ele confere o que só faz sentido em conjunto: `title` e `description` repetidos ou fora da
régua, menu diferente entre páginas, página sem `aria-current`, link interno pra arquivo que
não existe, imagem sem `alt` ou sem tamanho, formulário sem destino ou sem link de
privacidade, site com formulário e sem `privacidade.html`, contato sem `wa.me`, JSON-LD
inválido ou `LocalBusiness` sem endereço e horário, sitemap que esqueceu página, `robots.txt`
sem `Sitemap:`. E roda o `verificar.js html` e o `verificar.js alvo` em cima de uma cópia de
cada página com o `site.css` embutido, porque os dois sozinhos reprovam CSS externo por
desenho: foram feitos pra peça que viaja sozinha.

Só seguir quando terminar em "Tudo certo. Pode publicar." Depois, abrir no celular de
verdade, não só no simulador do navegador. Se o usuário quiser laudo separado de
acessibilidade e velocidade, é o `/acessivel`; de qualidade visual, o `/revisar-design`.

### Passo 9 — Entregar e explicar a publicação

Escrever `site/como-publicar.md` com o passo a passo do jeito que ele vai fazer:

```markdown
# Como colocar o site no ar

## O que você tem
site/ com [N] páginas, CSS único, sitemap e robots. Tudo estático: não precisa de servidor.

## Publicar (escolha uma)
| Onde | Como | Domínio próprio |
|---|---|---|
| Netlify Drop | arrastar a pasta `site/` em app.netlify.com/drop | Domain settings → adicionar domínio → apontar o DNS conforme a tela |
| Cloudflare Pages | Workers & Pages → Create → Upload assets → arrastar `site/` | domínio já na Cloudflare liga em um clique |
| Vercel | `npx vercel` dentro de `site/` (pede login na primeira vez) | Settings → Domains |

HTTPS vem de graça nos três.

## Domínio
1. Registrar `.com.br` no Registro.br (ou o que você já tem)
2. Apontar o DNS pro endereço que a hospedagem mostrar
3. Esperar propagar: de minutos a 48 horas [a confirmar: depende do TTL]
4. Decidir uma forma só (com `www` ou sem) e rodar `node scripts/site.js sitemap site/ --dominio <a escolhida> --corrigir`

## Depois de subir
- [ ] Abrir cada página no celular
- [ ] Cadastrar no Google Search Console e enviar o sitemap
- [ ] Conferir que endereço e horário são os mesmos do Google Meu Negócio
- [ ] Trocar o link da bio do Instagram e o site do WhatsApp Business

## O que ficou pendente
[o que estava [a confirmar] e não entrou, com quem resolve]
```

Na conversa, fechar com a lista de arquivos, o que ficou de fora e por quê, e as tarefas
que foram pro `tarefas.md` (domínio, foto que falta, depoimento a pedir via `/pos-venda`).

---

## Regras

- **Site é o conjunto; página de uma ação só é `/landing`; página de comparar e escolher é `/produto`.** Se o pedido é "página pro anúncio", é landing. Se é "quero um site com sobre, serviços e contato", é aqui. Os dois convivem: a landing fica em `site/<nome>/` e o site linka pra ela
- **Site que já está no ar e não vira cliente é `/conversao`**; laudo de acessibilidade e velocidade é `/acessivel`; copy que saiu com cara de máquina passa pelo `/humanizar` antes de virar HTML. Esta skill monta e confere o conjunto; não audita o que outra skill audita melhor
- **Palavra-chave é `/seo`.** Esta skill usa o que está em `seo/`; não faz pesquisa de volume. Sem `seo/`, o h1 usa a palavra do `publico.md` e a cidade, e a decisão de página por serviço fica pra depois
- **Um CSS só.** Nenhuma página com bloco `<style>` de mais de 40 linhas. Cor nova entra no `:root` do `site.css`, nunca inline
- **Título e description diferentes em toda página**, contados por comando. É o erro de SEO mais comum em site pequeno e o mais barato de evitar
- **Home diz o que vende.** Se o h1 serve pra padaria, clínica e software ao mesmo tempo, está errado
- **Serviço com preço ou "a partir de".** Sem nenhum dos dois, perguntar o motivo uma vez. Parcelamento sempre com o total ("12× R$ 208,33 = R$ 2.500"); o `verificar.js html` confere a conta
- **Contato tem WhatsApp** com `wa.me/55DDDNUMERO?text=` e mensagem pré-preenchida. Formulário é o segundo canal, não o primeiro
- **Endereço, horário e telefone iguais** no rodapé, no schema e no Google Meu Negócio. Divergência entre os três é o que faz o Google não confiar em nenhum
- **Nunca inventar** depoimento, número de clientes, nota do Google, prêmio, certificação, foto de pessoa. Sem prova real, a seção sai. Foto de banco de imagem no `sobre` é pior que nenhuma
- **Placeholder não vai pro HTML.** `[a confirmar]` fica no `copy.md` e no `como-publicar.md`; a página só é montada quando o dado chegou. O `site.js conferir` reprova de propósito
- **Formulário exige `privacidade.html`** (LGPD, Lei 13.709/2018, art. 9º): o que coleta, pra quê, com quem compartilha, por quanto tempo, como pedir exclusão, e quem responde. Escrita a partir do que o site faz de verdade, não copiada de outro site. Analytics e Pixel também entram nela
- **Dado pessoal fica com o usuário.** Número de WhatsApp, e-mail e endereço vão pro site porque ele mandou; lista de clientes, depoimento sem autorização e foto de terceiro não vão. Perguntar antes de publicar nome de cliente em caso
- **Publicar é ação irreversível de outro.** A skill entrega a pasta e o `como-publicar.md`; quem arrasta pro Netlify ou roda `npx vercel` é o usuário, na hora dele. Nunca subir por conta própria
- **Movimento baixo.** Nada de carrossel automático, animação de entrada em cada seção ou vídeo de fundo. `prefers-reduced-motion` respeitado no `site.css`. Se ele quiser mais vida, é conversa com o `/movimento`
- **Refazer site que existe começa lendo o que está lá.** Copiar o `sobre` e os serviços do site antigo antes de reescrever, e guardar o `css/site.css` velho até o novo passar no `conferir`
- **Não é hospedagem nem DNS.** Se o domínio não propaga ou o e-mail parou depois de mudar o DNS, o caminho é o suporte do registrador; a skill diz onde clicar, não resolve o servidor
