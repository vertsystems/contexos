---
name: landing
description: >
  Cria landing page de conversão em HTML único e responsivo, com a identidade da marca, copy
  estruturada em seções de função clara, SEO/OG/schema, checklist de performance e variantes de
  headline. Use quando o usuário pedir "landing page", "página de vendas", "página de captura",
  "site de uma página", "página pro anúncio", "criar site simples", ou /landing. Pra site com
  várias páginas (home, sobre, serviços, contato), é /site.
---

# /landing — Página de conversão

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

Uma página com um objetivo. Se ela tenta fazer duas coisas, não faz nenhuma.

## Dependências

- **Sistema visual:** `identidade/tokens.css` se existir; senão `identidade/design-guide.md`; senão padrão sóbrio
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Oferta ativa:** `_memoria/oferta.md` se existir (`/oferta`) — o que está sendo vendido, garantia, preço
- **Contexto e contato:** `_memoria/empresa.md` (o CTA precisa apontar pra WhatsApp/formulário/telefone real)
- **Tom:** `_memoria/preferencias.md`
- **Se existirem:** dossiê em `pesquisa/` (dado e citação do público), `seo/` (keyword da página)
- **Saída:** `site/<nome>/index.html`
- **Referências de design** (ler antes de produzir):
  - `templates/design/briefing-visual.md` — declarar a leitura do briefing e definir os três ajustes
  - `templates/design/qualidade-visual.md` — tipografia, cor, layout, acabamento
  - `templates/design/anti-generico.md` — conferir antes de entregar
- **Referências de copy:**
  - `templates/copy/psicologia.md` — atalhos de decisão e o limite ético de cada um
  - `templates/copy/ganchos.md` — estrutura gancho → conteúdo → fechamento e a régua de qualidade
  - `templates/copy/edicao.md` — lista negra de clichê, gordura e regras de estilo

---

## Workflow

**Antes de tudo: declarar a leitura.** Uma linha, visível pro usuário: *"Estou lendo isso como: [peça] para [público], com linguagem [vibe]."* Depois definir os três ajustes (variação / movimento / densidade) conforme `templates/design/briefing-visual.md`. É o passo que impede a peça de cair no visual padrão de IA, e custa cinco segundos.

### Passo 1 — Definir o objetivo (uma pergunta que decide tudo)

> "Qual a **única** ação que essa página precisa fazer a pessoa executar?
> (chamar no WhatsApp, preencher formulário, ligar, comprar, baixar material)"

E em seguida:
1. "De onde vem o tráfego? (anúncio, orgânico, bio do Insta, e-mail)" — muda o nível de contexto do visitante
2. "O que a pessoa já sabe quando chega?" — quem vem de anúncio de busca já sabe que tem o problema; quem vem do Insta não
3. "Qual a objeção número 1 que trava a decisão?"

### Passo 2 — Estruturar as seções

Cada seção tem função. Sem seção decorativa.

| Seção | Função | Cuidado |
|---|---|---|
| **Hero** | Diz o que é, pra quem, e o próximo passo — em 5 segundos | Headline sobre o benefício do cliente, não sobre a empresa. CTA visível sem rolar |
| **Prova imediata** | Reduz desconfiança logo depois da promessa | Número real, cliente conhecido, certificação. Sem "+1000 clientes satisfeitos" inventado |
| **Problema** | A pessoa se reconhece | Na linguagem dela (citação do `/pesquisa` funciona bem aqui) |
| **Solução** | Como funciona, concreto | 3-4 blocos com verbo. Nada de "tecnologia de ponta" |
| **Oferta** | O que exatamente ela recebe | Lista específica. Se tem preço, mostra o preço |
| **Objeções** | Derruba o que trava | Responder a objeção nº 1 de frente, não escondida no FAQ |
| **Prova social** | Confirma com terceiros | Depoimento com nome e contexto. Sem depoimento fictício, nunca |
| **CTA final** | Fecha | Mesma ação do hero. Uma ação só |
| **FAQ** | Últimas dúvidas + ganho de SEO | 5-8 perguntas reais, com FAQPage schema |

CTA repetido 3x na página (hero, meio, fim) com o mesmo texto e mesmo destino.

### Passo 3 — Escrever a copy

Seguir `preferencias.md`. Antes de montar o HTML, mostrar a copy em texto e esperar aprovação: errar o texto e descobrir depois de montar a página é retrabalho caro.

Entregar **3 variantes de headline** com ângulos diferentes (benefício direto / problema evitado / prova) pra ele escolher ou testar.

### Passo 4 — Montar o HTML

Arquivo único, CSS inline (ou `<style>` no head), Google Fonts como única dependência externa.

**Obrigatório:**
- Responsivo de 360px a 1920px, testado nos dois extremos
- `<title>` e meta description com a keyword, Open Graph completo (título, descrição, imagem 1200x630), favicon
- Schema JSON-LD: `LocalBusiness` (ou `Organization`) + `FAQPage`
- Formulário funcional (se houver): validação básica, e destino definido com o usuário — não deixar `action=""`
- Link de WhatsApp com mensagem pré-preenchida (`wa.me/55DDDNUMERO?text=...`)
- Acessibilidade: `alt` em imagem, contraste WCAG AA, foco visível, hierarquia de heading correta (um `h1` só)

**Performance:**
- Imagem otimizada e com `width`/`height` declarados (evita layout pulando)
- `font-display: swap`
- Sem biblioteca JS pra coisa que CSS resolve
- Sem carrossel automático no hero (mata conversão e performance)

**UTM e medição:** se a página vai receber anúncio, avisar que os links precisam preservar UTM e sugerir onde colar o Analytics/Pixel.

### Passo 5 — Auditar antes de entregar

Rodar os checks do `/revisar-design` na própria página (contraste, hierarquia, mobile, cara de template). Corrigir antes de mostrar.

### Passo 6 — Entregar

```
✓ site/<nome>/index.html

Pra ver: abre o arquivo no navegador
Pra publicar (mais simples primeiro):
  1. Netlify Drop — arrasta a pasta em app.netlify.com/drop, sai no ar em segundos
  2. Cloudflare Pages / Vercel — se quiser domínio próprio
  3. Ou manda o arquivo pra quem cuida do seu site

Headlines alternativas no fim do arquivo, em comentário — se testar, troca uma por semana.
```

---


## Autonomia do arquivo (obrigatório)

A peça vai ser enviada por WhatsApp, e-mail ou Drive: sozinha, longe da pasta. Se depender do `identidade/tokens.css` por caminho relativo, chega sem estilo: em teste real, um deck ficou **preto sobre preto**, ilegível.

**Copiar o bloco `:root` do `tokens.css` pra dentro do `<style>` da própria peça.** O `tokens.css` continua sendo a fonte da verdade; o que muda é a peça carregar uma cópia inline. Google Fonts é a única dependência externa aceita.

Antes de entregar:

```bash
node scripts/verificar.js html <caminho-da-peça>.html
```

Ele acusa CSS local externo, `var()` sem fallback, `@page` inválido, placeholder esquecido e link vazio (`href="#"`, `mailto:` sem endereço, `wa.me` sem número). Só entregar quando sair "Tudo certo".

## Regras

- Se o pedido é **comparar e escolher** (planos, cardápio, catálogo, tabela de preços), a skill é `/produto` — e ela grava em outra pasta de propósito, para não escrever por cima de uma landing que já existe

- **Uma página, uma ação.** Se o usuário quiser duas, perguntar qual vale mais e mandar a outra pro rodapé
- Nunca inventar depoimento, número de clientes, prêmio ou certificação. Sem prova real, a seção sai
- Preço: mostrar quando existe. Página que esconde preço perde quem já ia comprar
- **Parcelamento sempre com o total.** "2× R$ 470 (R$ 940 no total)". Omitir o total quando o parcelado custa mais é o tipo de omissão que o cliente descobre depois — e cobra
- **Prazo de entrega igual em todo lugar.** Se o herói promete "40 minutos" e o FAQ diz "5 dias úteis", a página se contradiz sozinha. O prazo mora em `_memoria/oferta.md`; conferir contra ele
- CTA sempre com verbo de ação específico ("Pedir orçamento no WhatsApp"), nunca "Saiba mais"
- Nada de pop-up de saída, contador falso de escassez ou "restam 3 vagas" mentiroso — queima a marca e é problema legal
- Se `tokens.css` existir, usar os tokens; não redefinir cor na mão
- Formulário que coleta dado pessoal precisa de aviso de privacidade — lembrar o usuário (LGPD)
