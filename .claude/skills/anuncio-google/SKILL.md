---
name: anuncio-google
description: >
  Cria estrutura completa de campanha do Google Ads a partir de um briefing ou da pesquisa SEO.
  Gera CSV pronto pra importar no Google Ads Editor com campanhas Search organizadas por cluster
  de palavras-chave, grupos de anúncios, RSAs (Responsive Search Ads), extensões e palavras-chave
  negativas. Lê o briefing de _memoria/empresa.md e da pesquisa SEO se existir.
  Use quando o usuário pedir "criar campanha google ads", "anúncio google", "google ads",
  "csv pro google ads", ou /anuncio-google.


---

# /anuncio-google — Estrutura de campanha Google Ads

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

Skill que monta a campanha inteira em CSV pronto pra importar no Google Ads Editor. Sai do briefing direto pro CSV, sem montar grupo por grupo na mão na interface do Google.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` (produto/serviço, público, região, diferenciais)
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Oferta ativa:** `_memoria/oferta.md` se existir (`/oferta`) — o que está sendo vendido, garantia, preço
- **Tom de voz:** `_memoria/preferencias.md`
- **Pesquisa SEO (se existir):** `seo/01-pesquisa-demanda.md`, `06-google-ads.md` — usar como insumo
- **Outputs vão em:** `campanhas/google-ads-<YYYY-MM-DD>/`
- **Referências de copy:**
  - `templates/copy/metodo.md` — diagnóstico antes de escrever: função, consciência, pilar, motor, barreira
  - `templates/copy/formatos.md` — seção 3, anúncio de busca
  - `templates/copy/psicologia.md` — atalhos de decisão e o limite ético de cada um
  - `templates/copy/edicao.md` — lista negra de clichê, gordura e regras de estilo

---

## Workflow

### Passo 1 — Briefing

Se o usuário não passou briefing, perguntar:

1. **Produto/serviço a anunciar?** (1-3 linhas)
2. **Quem é o público?** (perfil, dor que resolve)
3. **Região:** raio em km a partir de qual cidade?
4. **Orçamento diário?** (R$/dia)
5. **Objetivo:** ligações / WhatsApp / formulário / visita?
6. **Site/landing page** existe? URL?

Se já existe `seo/06-google-ads.md` (criado pelo `/seo`), usar como base: pular as perguntas que já foram respondidas lá.

### Passo 2 — Pesquisa de palavras-chave

Se já existe `seo/01-pesquisa-demanda.md`, usar o top 10-20 de termos prioritários (intenção transacional + comercial).

Se não existe, gerar:
- 30-50 termos-semente baseados no briefing
- WebSearch pra cada grupo: ver concorrência, sazonalidade
- Filtrar pelos de **intenção comercial/transacional** (descartar informacionais)
- Agrupar em **clusters** (ex: "feijoada-buffet", "feijoada-restaurante", "feijoada-evento")

### Passo 3 — Estrutura de campanha

**Padrão recomendado pra B2B local:**

```
Campanha 1: <Negócio> — Search Geral
├── Grupo: <Cluster 1>
│   ├── 10-15 keywords (mix de exata, frase, ampla modificada)
│   ├── 3 RSAs (15 headlines + 4 descriptions cada)
│   └── 10-15 keywords negativas no grupo
├── Grupo: <Cluster 2>
│   └── ...
└── ... (1 grupo por cluster do Passo 2)

Campanha 2: <Negócio> — Local (opcional)
├── Anúncios pra Google Maps
└── Segmentação por proximidade

Lista de negativas globais: termos genéricos descartados, marcas concorrentes
```

### Passo 4 — Copies (RSAs)

Pra cada grupo, gerar 3 RSAs (Responsive Search Ads):

**15 headlines** por anúncio:
- 5 com keyword principal
- 3 com diferenciais concretos (certificações, prazo, garantia)
- 3 com CTA ("Solicite cotação", "Peça pelo WhatsApp", "Fale agora")
- 2 com prova social (anos no mercado, número de clientes)
- 2 com proposta de valor genérica

**4 descriptions** (90 caracteres cada):
- 1 institucional + CTA
- 1 com diferencial técnico + CTA
- 1 com urgência/escassez (se aplicável)
- 1 com prova social + CTA

**Restrições do Google:**
- Headline: **máximo 30 caracteres** (contar antes de escrever no CSV — headline estourada é rejeitada na importação)
- Description: **máximo 90 caracteres**
- Caminho de exibição (path 1 e 2): 15 caracteres cada
- Sem emojis, sem caps lock, sem repetição de palavras
- Sem afirmações superlativas não-comprovadas ("o melhor", "número 1") sem fonte
- Sem pontuação dupla (`!!`) e sem `!` na headline

**Validação obrigatória: rodar, não estimar.** Contar caractere no olho falha, e falhou em teste real (4 headlines estouradas entregues). Depois de gravar o CSV:

```bash
node scripts/verificar.js csv campanhas/google-ads-<data>/anuncios.csv --ads
```

Ele confere o limite de cada campo **e** detecta a armadilha silenciosa: vírgula dentro de campo sem aspas, que desalinha a linha inteira e faz o Editor importar lixo (o Final URL cai na coluna Path). Só entregar quando sair "Tudo certo".

**Toda célula que contém vírgula vai entre aspas.** `"Atendo Sorocaba, Campinas e região."`, sem isso o CSV quebra.

Seguir `_memoria/preferencias.md` pra tom.

### Passo 5 — Extensões

Gerar CSVs separados pra cada tipo de extensão:

- **Sitelinks** (4-6): "Sobre nós", "Catálogo", "Cases", "WhatsApp", "Localização"
- **Chamadas** (telefone): puxar de `_memoria/empresa.md`
- **Snippets estruturados:** lista de serviços, categorias de produto
- **Preço** (se aplicável): faixas de preço dos serviços principais
- **Promoção** (se aplicável): desconto, condição especial

### Passo 6 — Configurações da campanha

Gerar arquivo `configuracoes.md` com:

- **Estratégia de lance:** "Maximizar conversões" pra começar (depois migrar pra "Maximizar conversões com tCPA" quando tiver 30+ conversões)
- **Orçamento diário:** conforme briefing
- **Segmentação geográfica:** raio em km a partir do endereço
- **Idioma:** Português
- **Dispositivos:** ajustes de lance recomendados (mobile +0%, desktop +0%, tablet -20%)
- **Programação:** dias e horários conforme negócio
- **Conversões a configurar:** clique no WhatsApp, envio de formulário, ligação telefônica, tempo no site

### Passo 7 — Gerar os CSVs

Estrutura de pastas final:

```
campanhas/google-ads-<YYYY-MM-DD>/
  campanhas.csv          ← linha por campanha
  grupos.csv             ← linha por grupo de anúncio
  keywords.csv           ← keywords + match type
  keywords-negativas.csv ← negativas por grupo + lista global
  anuncios.csv           ← RSAs (headlines + descriptions)
  extensoes-sitelinks.csv
  extensoes-chamadas.csv
  extensoes-snippets.csv
  extensoes-preco.csv (se aplicável)
  configuracoes.md       ← config + checklist de import
  README.md              ← passo a passo pra importar no Google Ads Editor
```

**Formato dos CSVs:** seguir o padrão de importação do Google Ads Editor (colunas: Campaign, Ad group, Keyword, Match type, Status, Max CPC, etc.).

### Passo 8 — Resumo + próximos passos

Mostrar pro usuário:

```
✓ Campanha pronta: campanhas/google-ads-<YYYY-MM-DD>/

Estrutura:
- <N> campanhas
- <N> grupos de anúncio
- <N> palavras-chave (positivas)
- <N> palavras-chave negativas
- <N> RSAs

Pra subir:
1. Abrir Google Ads Editor (desktop)
2. Conta → Importar → CSV
3. Subir campanhas.csv primeiro, depois grupos, keywords, anúncios, extensões
4. Revisar status (tudo "pausado" inicialmente — ativar manualmente)
5. Conferir conversões configuradas no Google Tag Manager
6. Ativar campanha quando estiver tudo OK

Sugestão de orçamento inicial: R$<X>/dia por <Y> dias antes de avaliar.
```

---

## Criar do zero vs. iterar com dado

**Do zero:** a copy sai de `_memoria/publico.md` (palavra que a pessoa digita), `_memoria/oferta.md` (o que se promete) e da pesquisa de demanda. Gerar variação de ângulo, não variação de palavra: uma headline por benefício, uma por objeção, uma por prova, uma por preço.

**Iterando com dado** (quando já rodou e há relatório): não reescrever tudo. Ler `campanhas/relatorios/` e:

1. Identificar o **padrão** do que performou — é ângulo, é oferta, é termo?
2. Manter o que funciona e variar **um** elemento por vez
3. Pausar o que gastou sem converter, e transformar em negativa o termo que trouxe clique errado
4. Testar o próximo ângulo, não a próxima palavra

Anúncio raramente falha por copy fraca: falha por ângulo errado, público errado ou oferta fraca. Se três ângulos diferentes não converteram, o problema está na oferta (`/oferta`), não no texto.


## Regras

- **Nunca inventar dados de CPC.** Se o cliente perguntar quanto vai custar, falar que depende da concorrência real e dar uma faixa baseada em WebSearch.
- **Sempre começar pausado.** Cliente revisa, ativa quando aprovar.
- **Não anunciar pra termos informacionais.** "Como fazer X" raramente converte — deixar pra SEO orgânico.
- **Match type:** começar com Phrase Match na maioria. Exact pra termos premium. Broad só com dados consistentes.
- **Lista de negativas global** é obrigatória — sem ela, queima dinheiro em buscas irrelevantes.
- **Conversões antes de tudo.** Sem conversão configurada, o Google não otimiza — relatar isso e pedir setup antes de ativar.
- **URL final com UTM** em toda campanha (`utm_source=google&utm_medium=cpc&utm_campaign=<campanha>`). Sem isso, o relatório depois não sabe de onde veio o lead.
- **Rodar `node scripts/verificar.js csv <arquivo> --ads`** antes de entregar. Contar no olho não funciona — já entregou CSV quebrado em teste real.
- **Aspas em toda célula com vírgula.** É o erro que mais quebra importação.
- Telefone da extensão de chamada vem de `_memoria/empresa.md`. Se estiver vazio, perguntar e salvar lá — não deixar `[telefone]` no CSV.
- Copies seguem `_memoria/preferencias.md` estritamente. Sem jargão de marketing se o público não usa.
