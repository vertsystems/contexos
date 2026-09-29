---
name: anuncio-meta
description: >
  Escreve anúncio pago pra Instagram e Facebook (feed, Reels e Stories): de 3 a 5 ideias de fato
  diferentes entre si, cada uma com gancho do primeiro quadro, texto principal, título, descrição,
  texto na tela e botão, no limite que a Meta mostra sem cortar, com link UTM por criativo. Serve
  pra público frio e pra remarketing. Entrega os arquivos pra subir no Gerenciador de Anúncios, não
  publica nada. Use quando o usuário disser "anúncio pro Instagram", "anúncio no Facebook",
  "impulsionar", "criativo pra Meta", "copy de anúncio", "meu anúncio não vende", "anúncio de
  remarketing", "tráfego pago no Insta", ou /anuncio-meta. Pra anúncio de busca no Google, é
  /anuncio-google.
---

# /anuncio-meta — Anúncio pago no Instagram e no Facebook

> **Convenção de pastas:** caminhos na convenção **por tipo**. Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e o anúncio é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

Desde 2025 a Meta lê o próprio criativo pra decidir quem vê o anúncio, e agrupa criativos parecidos como se fossem um só. Vinte versões da mesma frase com cor trocada viram uma aposta. Cinco ideias diferentes viram cinco. Por isso esta skill começa pela matriz de ângulos e só depois escreve.

## Dependências

- **O que se vende:** `_memoria/oferta.md` (`/oferta`) — promessa, preço, garantia, prazo
- **Pra quem:** `_memoria/publico.md` (`/publico`) — a dor na palavra dele e as objeções. É o material do gancho
- **Tom:** `_memoria/preferencias.md`
- **Contexto e contato:** `_memoria/empresa.md` (WhatsApp, site, cidade)
- **Se existirem:** dossiê em `pesquisa/`, `biblioteca.md` (depoimento e número autorizados), a página de destino em `site/`, relatórios anteriores em `campanhas/relatorios/` (`/relatorio-ads`)
- **Referências de copy:**
  - `templates/copy/metodo.md` — diagnóstico, decisões, barreiras e incentivos, o limite
  - `templates/copy/formatos.md` — seções 1 e 2, anúncio frio e remarketing, com os limites de texto
  - `templates/copy/ganchos.md` — os quatro tempos e onde o gancho começa
  - `templates/copy/psicologia.md` — pilares, motores e o inimigo sem espantar a outra metade
  - `templates/copy/edicao.md` — lista negra de clichê e estrutura de efeito
- **Link rastreável:** `scripts/utm.js`, convenção em `templates/crescimento/medicao.md`
- **Saída:** `campanhas/meta-<campanha>-<AAAA-MM-DD>/`

---

## Workflow

### Passo 1 — Briefing em cinco perguntas

Pular as que `oferta.md`, `publico.md` e `empresa.md` já respondem. Perguntar o resto de uma vez:

1. **O que o anúncio vende?** Um produto, uma oferta de entrada, uma aula experimental, um orçamento
2. **Pra quem vai aparecer?** Frio (nunca ouviu falar da marca), morno (segue, visitou o site, assistiu vídeo) ou quente (pôs no carrinho, pediu orçamento e sumiu, está na lista)
3. **O que a pessoa faz depois do clique?** Manda mensagem no WhatsApp, compra no site, preenche cadastro, agenda
4. **Pra onde o clique leva?** O link real. Se for página, abrir e ler: a promessa do anúncio vai precisar bater com a primeira dobra
5. **Que material existe?** Foto real, vídeo, depoimento autorizado, ou nada ainda (aí a arte sai pelo `/carrossel`, em post único ou 9:16)

Orçamento e segmentação ficam no Gerenciador, com o dono. Esta skill decide o que o anúncio diz.

### Passo 2 — Diagnóstico e leitura declarada

Seguir a seção 1 de `templates/copy/metodo.md`: função, nível de consciência, sofisticação do mercado, estado emocional e risco. Declarar em uma linha:

> *"Estou lendo isso como: anúncio [frio/morno/quente] pra [quem], que [nível de consciência], com a função de [conversão/alcance], barreira principal: [x]."*

Público frio pede gancho de identidade, cena ou curiosidade, e oferta de entrada leve. Público quente pede prova, objeção respondida ou a oferta com condição e prazo.

### Passo 3 — Matriz de ângulos: de 3 a 5 ideias diferentes

Cada ideia é uma combinação diferente de **pilar** (necessidade, status, identidade), **motor** (medo com saída, pertencimento, novidade real, inimigo em comum), **dor ou desejo** e **nível de consciência**. Montar a tabela antes de escrever qualquer texto:

| # | Ideia em uma frase | Pilar | Motor | Dor ou desejo, na palavra do público | Formato |
|---|---|---|---|---|---|
| 1 | Quem tem medo trava antes da braçada | necessidade | medo com saída | "tenho vergonha de aprender com essa idade" | vídeo 9:16 |
| 2 | O pai que fica na borda da piscina | identidade | pertencimento | "queria entrar na água com meus filhos" | foto + texto |
| 3 | ... | | | | |

**Teste da diferença:** se duas linhas só mudam de palavra, elas são a mesma ideia; trocar uma. Pelo menos uma ideia é **arriscada**, um ângulo que a marca nunca testou, marcada como tal.

**Remarketing:** uma objeção por anúncio. Três anúncios quentes cobrem três objeções diferentes ("é caro", "não tenho tempo", "já tentei e não deu"), cada um respondido com prova ou mecanismo.

Mostrar a matriz ao usuário e seguir com as que ele aprovar. **CHECKPOINT.**

### Passo 4 — Escrever cada anúncio em quatro tempos

Os quatro tempos de `templates/copy/ganchos.md`, comprimidos:

| Campo | O que leva | Limite |
|---|---|---|
| **Gancho do criativo** | O que para a rolagem: primeiro quadro do vídeo ou texto grande da arte. Até 8 palavras. Funciona sem som | — |
| **Texto principal** | Gancho na primeira linha, exposição em uma ou duas, a virada em uma, a oferta e a chamada. **O gancho fecha dentro dos primeiros 125 caracteres**, que é o que aparece antes do "ver mais" | 125 visíveis |
| **Título** | A promessa ou a oferta, em palavra simples | 40 |
| **Descrição** | Redução de risco ou a condição ("aula experimental grátis") | 25 |
| **Texto na tela** | Pra quem assiste sem som: a história inteira em 3 a 5 legendas curtas | — |
| **Botão** | O que acontece depois do clique: mensagem, compra, cadastro, agendamento | — |

Em vídeo, o roteiro dos 3 primeiros segundos sai aqui (promessa dita, escrita na tela e mostrada em movimento); o roteiro inteiro, se o usuário quiser, vai pro `/video`.

Pra cada anúncio, entregar também **de 3 a 5 ganchos alternativos** da mesma ideia. Eles servem pra girar o criativo quando o primeiro cansar, sem trocar a promessa.

### Passo 5 — Conferir, com comando

1. **Limites:** gravar a planilha de trabalho e rodar

   ```bash
   node scripts/verificar.js csv campanhas/meta-<campanha>-<data>/anuncios.csv --meta
   ```

   Título acima de 40 e descrição acima de 25 são corrigidos. Texto principal acima de 125 passa, desde que o trecho que o comando mostra feche o gancho sozinho. Contar no olho falha: é por isso que o comando existe.

2. **Texto:** `node scripts/verificar.js texto campanhas/meta-<campanha>-<data>/anuncios.md` — clichê, construção contrastiva, pergunta retórica, trinca de impacto. Anúncio é a peça em que a cara de máquina custa mais caro, porque o público pula em fração de segundo.

3. **Política da Meta sobre atributos pessoais:** o anúncio não pode afirmar nem sugerir que o leitor tem uma característica pessoal (saúde, situação financeira, idade, religião, orientação sexual, antecedente criminal). "Você está endividado?" e "Cansado de ser gordo?" são reprovados. O conserto é falar da situação, na terceira pessoa ou pelo produto: "pra quem quer organizar as dívidas do cartão"

4. **Profissão regulada ou saúde, estética, finanças:** rodar `/publicidade-regulada` antes de entregar. Antes e depois, promessa de resultado e preço em anúncio têm regra de conselho e da Meta

5. **Mensagem casada:** a promessa do título aparece igual na primeira dobra da página. Se não aparece, avisar: a Meta analisa o destino junto com o anúncio, e o visitante que não reconhece a promessa volta

### Passo 6 — Link com UTM, um por ideia

Cada ideia recebe o próprio `content`, pra que o `/relatorio-ads` e o `/teste-ab` leiam o resultado por ideia:

```bash
node scripts/utm.js <url> --source instagram --medium paid_social --campaign <acao> --content ideia-1
```

Anúncio que leva pro WhatsApp não carrega UTM: pedir que o link do WhatsApp venha com uma mensagem pronta diferente por ideia ("Oi, vi o anúncio da aula experimental"), assim o atendimento sabe de onde veio.

### Passo 7 — Salvar e entregar

```
campanhas/meta-<campanha>-<AAAA-MM-DD>/
  anuncios.md     ← leitura, matriz, cada anúncio em texto corrido, ganchos alternativos
  anuncios.csv    ← planilha de trabalho: Ideia, Formato, Gancho do criativo, Texto principal,
                    Título, Descrição, Botão, Link
  como-subir.md   ← o passo a passo no Gerenciador e o que acompanhar depois
```

A copy vai em texto corrido no `anuncios.md` e no chat, fora de bloco de código, pronta pra colar.

`como-subir.md`:

```markdown
# Como subir — <campanha>

1. Gerenciador de Anúncios → Criar → objetivo que casa com o clique (mensagens, vendas, cadastros)
2. No conjunto: orçamento, região e público (frio: amplo; quente: público personalizado de quem
   visitou, engajou ou está na lista)
3. Um anúncio por ideia, no mesmo conjunto, cada um com o texto e o link dele desta pasta
4. Conferir a prévia em feed, Stories e Reels: o gancho aparece antes do "ver mais"?
5. Publicar pausado, revisar, e só então ativar

## O que acompanhar
- Depois de uns 7 dias: qual ideia trouxe resultado mais barato (`/relatorio-ads`)
- Quando a frequência sobe e o custo por resultado piora, o criativo cansou: trocar pelo
  próximo gancho alternativo da mesma ideia, sem mudar a promessa
- Duas ideias empatadas: `/teste-ab` diz se a diferença é real ou sorte
```

Fechar com uma frase sobre qual ideia é a aposta principal e por quê, e qual é a arriscada.

---

## Criar do zero vs. iterar com dado

**Do zero:** a matriz sai de `publico.md` (a palavra da dor), `oferta.md` (o que se promete) e da Biblioteca de Anúncios da Meta, onde dá pra ver os anúncios ativos dos concorrentes. Anúncio que roda há meses tende a estar funcionando, e o conjunto mostra o ângulo que todo mundo já usa: é justamente o que a matriz evita repetir.

**Com dado** (já rodou, há relatório): manter a ideia que trouxe resultado e girar só o gancho; trocar a ideia que gastou sem trazer nada por um ângulo novo da matriz. Se três ideias bem diferentes não converteram, o problema costuma estar na oferta ou na página, e o conserto é `/oferta` ou `/conversao`.

---

## Regras

- **Ideias diferentes de verdade.** Duas linhas da matriz que só trocam palavra contam como uma
- **Nada inventado.** Número, depoimento, "mais de 500 clientes", prêmio e antes e depois só com fonte em `biblioteca.md` ou dito pelo usuário. Sem isso, `[a confirmar]` ou fora
- **Urgência só real.** Turma com data, lote que acaba, reajuste marcado. "Últimas vagas" permanente é publicidade enganosa (CDC, art. 37) e a Meta reprova
- **Nunca afirmar atributo pessoal do leitor** (saúde, dinheiro, idade, corpo, religião). Falar da situação ou do produto
- **Medo sempre com a saída na mesma peça.** Luto, doença e desespero financeiro nunca entram como argumento
- **Um anúncio, uma chamada.** O botão e a última linha pedem a mesma coisa
- **A promessa do anúncio é a promessa da página.** Se a página diz outra coisa, avisar antes de entregar
- **A skill entrega arquivo e não publica.** Não subir anúncio, não mexer em orçamento, não conectar conta. O usuário sobe pelo Gerenciador, pausado, e ativa quando quiser
- **Limites se rodam.** `verificar.js csv --meta` antes de entregar, sempre
- Tom de `_memoria/preferencias.md`, estritamente. Anúncio não é lugar pra marca parecer mais jovem, mais descolada ou mais séria do que é
