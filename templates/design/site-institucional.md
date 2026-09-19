# Site institucional — arquitetura, conteúdo de cada página e publicação

Referência do `/site`. Consultada também por `/seo` (quais páginas existem e o que cada
uma responde) e por `/conversao` (o que falta numa página que já está no ar).

Site institucional não é landing esticada. A landing tem um visitante, uma ação. O site
recebe gente em momentos diferentes: quem já conhece e quer o endereço, quem chegou pelo
Google procurando um serviço, quem quer saber se a empresa existe de verdade antes de
mandar mensagem. Cada página responde a um desses momentos, e a navegação faz a ponte.

---

## Arquitetura por perfil

Quatro a seis páginas. Menos que quatro é landing; mais que seis, sem conteúdo real
pra cada uma, vira página vazia que o Google ignora e o visitante abandona.

| Perfil | Páginas | O que decide o número |
|---|---|---|
| **Comércio local** (loja, restaurante, salão, oficina) | home, produtos ou cardápio, sobre, contato, privacidade | Uma página por linha de produto só se houver busca com nome próprio ("conserto de celular em <bairro>") |
| **Profissional liberal** (advogado, dentista, arquiteto, contador) | home, serviços (ou uma página por serviço), sobre, contato, privacidade | O `/seo` diz se "serviços" vira uma página ou cinco. Sem pesquisa de palavra, é uma |
| **Agência ou estúdio** | home, serviços, casos ou portfólio, sobre, contato, privacidade | Portfólio sem resultado é galeria. Cada caso: cliente, problema, o que foi feito, número |
| **Projeto ou sistema** | home, como funciona, preços (ou `/produto`), sobre, contato, privacidade | Preço fora do site manda quem já ia assinar pro concorrente que mostra |

O `sobre` existe em todos porque é onde o visitante confere se tem gente de verdade por
trás antes de mandar mensagem. Em site pequeno costuma ficar logo atrás da home em
visitas; o Analytics do próprio site é quem confirma.

---

## O que cada página precisa ter

### Home

Responde em cinco segundos: **o que vende, pra quem, onde, e o próximo passo.**

- Título (h1) sobre o que o cliente ganha, com a palavra que ele usa pra buscar. "Dentista
  em Moema" vale mais que "Sorrisos que transformam"
- Prova logo abaixo da promessa: anos, número de clientes real, avaliação do Google com
  a nota e a quantidade
- Três a quatro blocos de serviço, cada um linkando pra página própria
- Um caso, ou um depoimento com nome e contexto
- Chamada final com o mesmo destino do botão do topo
- Endereço e horário no rodapé quando há ponto físico

Erro clássico: home que fala da "missão" e da "visão" e não diz o que vende. Missão vai
pro `sobre`, se for.

### Sobre

- Quem está por trás, com nome e foto real. Foto de banco de imagem aqui derruba a
  confiança em vez de subir
- Por que faz isso, em duas ou três frases com fato: desde quando, quantos atendidos,
  o que aconteceu que fez começar
- Certificação, registro profissional (CRO, OAB, CRECI, CREA) e formação quando existir
- Endereço com mapa incorporado quando há atendimento presencial
- Chamada pra contato no fim. Quem leu o `sobre` inteiro está pronto pra falar

### Serviços (ou produtos)

Uma seção por serviço, ou uma página por serviço quando o `/seo` apontar busca própria.
Cada serviço precisa de:

- Nome como o cliente chama (não como a área chama). "Clareamento" antes de "estética
  dental"
- Pra quem é e quando faz sentido (uma ou duas frases)
- O que está incluído, em lista
- **Preço ou "a partir de"**, com o que faz variar. Serviço sem preço nenhum manda o
  visitante perguntar no WhatsApp, e a maioria não pergunta: vai pro concorrente que mostra
- Prazo ou duração
- Chamada específica ("Agendar avaliação", não "Saiba mais")

Página por serviço tem `title`, `description` e h1 próprios, e o serviço é a primeira
palavra do título.

### Casos ou portfólio

- Cada caso: cliente (ou "escritório de advocacia em Campinas" se não pode citar),
  problema que trouxe, o que foi feito, resultado com número e prazo
- Foto do trabalho em tamanho real de exibição, com `alt` descritivo
- Três casos bons valem mais que doze fracos. Caso sem resultado vai pra galeria, não
  pra página de casos

### Contato

A página mais importante depois da home, e a mais malfeita.

- **WhatsApp com link `wa.me/55DDDNÚMERO?text=`** e mensagem pré-preenchida. É o canal
  que o cliente brasileiro usa; site sem ele perde quem não quer preencher formulário
- Telefone com `tel:`, e-mail com `mailto:`
- Endereço completo, mapa incorporado, e **horário de funcionamento** (com o dia que
  fecha)
- Formulário curto: nome, contato, mensagem. Cada campo a mais tira gente
- Aviso de privacidade ao lado do botão de enviar, com link pra página de privacidade
- Tempo de resposta prometido ("respondemos em até um dia útil")

### Privacidade

Página exigida quando o site coleta qualquer dado pessoal (formulário, WhatsApp com
nome, Analytics, Pixel). O conteúdo mínimo da LGPD (Lei 13.709/2018, art. 9º):

- Quais dados são coletados e pra quê
- Com quem são compartilhados (ferramenta de e-mail, plataforma de anúncio)
- Por quanto tempo ficam guardados
- Como pedir acesso, correção ou exclusão, e o contato de quem responde por isso
- Se há cookies ou rastreador, quais e como desativar

Texto genérico copiado de outro site cita ferramenta que o negócio não usa e omite a
que usa. Escrever a partir do que o site realmente coleta.

---

## O que é igual em toda página

- **Cabeçalho**: logo linkando pra home, os mesmos links na mesma ordem, o botão de
  contato no mesmo lugar. Página atual marcada com `aria-current="page"`
- **Rodapé**: endereço, horário, WhatsApp, telefone, e-mail, links das páginas, link
  da privacidade, CNPJ quando for empresa. O WCAG 2.2 (3.2.6) pede ajuda no mesmo lugar
  em todas as páginas: o rodapé resolve
- **Um CSS só** (`css/site.css`), com os tokens da marca. Mudar uma cor muda o site
  inteiro. Estilo repetido em cada página vira cinco versões da mesma coisa em um mês
- **Botão flutuante de WhatsApp** no canto inferior direito, quando o negócio atende por
  lá. Com `aria-label` e alvo de 44px no celular
- **`title` e `description` diferentes em cada página**. Título igual em todas é o erro
  de SEO mais comum em site pequeno, e o mais barato de consertar

---

## Dados estruturados

Um bloco JSON-LD por página, no `<head>`:

| Tipo | Quando | O que precisa ter |
|---|---|---|
| `LocalBusiness` (ou subtipo: `Dentist`, `Restaurant`, `HairSalon`, `AutoRepair`) | ponto físico com atendimento presencial | `name`, `address` completo, `telephone`, `openingHoursSpecification`, `geo` quando souber, `priceRange` |
| `ProfessionalService` | serviço sem loja (consultor, advogado que atende online) | `name`, `areaServed`, `telephone`, `url` |
| `Organization` | empresa, agência, projeto | `name`, `url`, `logo`, `contactPoint`, `sameAs` (redes) |
| `Service` | página de serviço | `name`, `provider`, `areaServed`, `offers` com preço quando houver |
| `BreadcrumbList` | página interna | o caminho até ela |
| `FAQPage` | página com perguntas e respostas visíveis | só se as perguntas estão no HTML; FAQ escondido reprova |

Endereço e horário no schema precisam ser os mesmos do rodapé e do Google Meu Negócio.
Divergência entre os três é o que faz o Google não confiar em nenhum.

---

## SEO técnico da página

Por página: `<title>` de 50 a 60 caracteres com a palavra-chave no começo,
`<meta name="description">` de 120 a 155, `<link rel="canonical">` com a URL final,
Open Graph (título, descrição, imagem 1200×630, URL), `<html lang="pt-BR">`,
`<meta name="viewport">`, um `h1` só, e todo link interno relativo apontando pra
arquivo que existe.

Por site: `sitemap.xml` na raiz listando toda página indexável, `robots.txt` apontando
pro sitemap, favicon, e imagem OG padrão pras páginas que não têm a própria.

---

## Formulário sem servidor

Site estático não recebe formulário sozinho. Três saídas, da mais simples pra mais
completa:

1. **WhatsApp**: o botão "enviar" monta a mensagem com os campos e abre o `wa.me`.
   Zero dependência, e o cliente cai no canal onde a conversa vai continuar
2. **`mailto:`** com assunto e corpo preenchidos. Abre o programa de e-mail do visitante,
   o que no celular funciona e no desktop às vezes não
3. **Serviço de formulário** (Formspree, Netlify Forms, Web3Forms e similares): o
   `action` aponta pro serviço, que manda por e-mail. Tem plano gratuito com limite
   mensal de envios [a confirmar na hora, muda por serviço]. A página de privacidade
   precisa citar o serviço, porque o dado passa por ele

Em qualquer uma: campo obrigatório marcado, erro ao lado do campo, e o aviso de
privacidade visível antes do botão.

---

## Checklist de publicação

Antes de subir:

- [ ] `node scripts/site.js conferir site/` sem erro
- [ ] Contraste de texto sobre fundo e de botão conferido com `verificar.js contraste`
- [ ] Todas as imagens com `width`, `height`, `alt`, e a do topo sem `loading="lazy"`
- [ ] `sitemap.xml` e `robots.txt` gerados com o domínio final (`node scripts/site.js sitemap site/ --dominio https://... --corrigir`, que também alinha o canonical e o og:url)
- [ ] Nenhum `[a confirmar]` no HTML
- [ ] Aberto no celular de verdade, não só no simulador do navegador

Publicação, da mais simples pra mais completa:

| Onde | Como | Domínio próprio |
|---|---|---|
| **Netlify Drop** | arrastar a pasta `site/` em app.netlify.com/drop | em Domain settings, adicionar o domínio e apontar o DNS conforme a tela |
| **Cloudflare Pages** | Workers & Pages → Create → Upload assets → arrastar a pasta | domínio já na Cloudflare liga em um clique |
| **Vercel** | `npx vercel` na pasta (pede login na primeira vez) | Settings → Domains |
| **GitHub Pages** | repositório com a pasta, Settings → Pages | arquivo `CNAME` na raiz. Sem domínio próprio o site fica em `usuario.github.io/projeto`, e o sitemap precisa ser gerado com esse endereço inteiro |

Domínio: registrar no Registro.br (`.com.br`) ou em qualquer registrador. Depois de
publicar, o DNS demora de minutos a 48 horas pra propagar [a confirmar: depende do TTL].
HTTPS vem de graça em todos os quatro.

Depois de subir: cadastrar no Google Search Console, enviar o sitemap, e conferir que a
URL do canonical é a que está no ar (com ou sem `www`, uma só).

---

## Os erros que mais aparecem

1. **Home que não diz o que vende.** Slogan bonito, foto de céu, e o visitante rola
   três telas sem saber se é clínica ou consultoria
2. **Contato sem WhatsApp.** Formulário que ninguém preenche e telefone que ninguém
   liga
3. **Serviço sem preço nem "a partir de".** A pergunta que o site não responde é a
   que o visitante não faz
4. **`title` igual em toda página.** O Google mostra a mesma coisa cinco vezes
5. **Sobre sem gente.** Texto em terceira pessoa, sem nome, sem foto
6. **Endereço diferente** entre rodapé, schema e Google Meu Negócio
7. **Horário sem o dia que fecha**, e visitante batendo em porta fechada
8. **Formulário sem privacidade**, e site sem a página que a LGPD exige
9. **CSS copiado dentro de cada página**, e a cor da marca mudando de uma pra outra
10. **Menu com oito links**, incluindo "Início" e "Home" ao mesmo tempo
