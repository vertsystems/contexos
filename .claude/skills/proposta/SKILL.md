---
name: proposta
description: >
  Monta proposta comercial em HTML com a identidade visual da marca, a partir de um briefing curto
  (cliente, problema, escopo, investimento, prazo). Gera arquivo pronto pra enviar como link ou PDF.
  Use quando o usuário pedir "proposta", "orçamento", "monta uma proposta pro cliente X",
  "quanto cobrar por", "proposta comercial", ou /proposta.
---

# /proposta — Proposta comercial em HTML

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

Transforma briefing em proposta que fecha venda. Escopo claro, investimento sem rodeio, próximo passo óbvio.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` (o que a empresa entrega, contato, credenciais)
- **Cliente real:** `_memoria/publico.md` se existir (`/publico`) — a dor na palavra dele, e as objeções
- **Oferta ativa:** `_memoria/oferta.md` se existir (`/oferta`) — o que está sendo vendido, garantia, preço
- **Tom de voz:** `_memoria/preferencias.md`
- **Sistema visual:** `identidade/tokens.css` se existir; senão `identidade/design-guide.md`
- **Prova:** `biblioteca.md` — depoimento, case e número já catalogados e autorizados (consultar antes de pedir ao usuário)
- **Histórico:** propostas anteriores em `propostas/` (reaproveitar escopo e preço de trabalho parecido)
- **Outputs vão em:** `propostas/<cliente>-<YYYY-MM-DD>.html` (ou `clientes/<Nome>/proposta-<YYYY-MM-DD>.html` se o cliente já tiver pasta)
- **Referências de design** (ler antes de produzir):
  - `templates/design/briefing-visual.md` — declarar a leitura do briefing e definir os três ajustes
  - `templates/design/qualidade-visual.md` — tipografia, cor, layout, acabamento
  - `templates/design/anti-generico.md` — conferir antes de entregar
- **Referências de copy:**
  - `templates/copy/psicologia.md` — atalhos de decisão e o limite ético de cada um
  - `templates/copy/edicao.md` — lista negra de clichê, gordura e regras de estilo

---

## Workflow

**Antes de tudo: declarar a leitura.** Uma linha, visível pro usuário: *"Estou lendo isso como: [peça] para [público], com linguagem [vibe]."* Depois definir os três ajustes (variação / movimento / densidade) conforme `templates/design/briefing-visual.md`. É o passo que impede a peça de cair no visual padrão de IA, e custa cinco segundos.

### Passo 1 — Briefing (5 perguntas)

Se o usuário não deu o contexto, perguntar uma por vez:

1. "Pra quem é a proposta? (empresa e pessoa que vai ler)"
2. "Qual o problema dele, nas palavras dele? (o que ele te falou na conversa)"
3. "O que você vai entregar? (lista do escopo, do jeito que você faria)"
4. "Investimento e forma de pagamento?"
5. "Prazo de entrega e validade da proposta?"

Se já existe pasta do cliente com `briefing.md`, ler antes e só perguntar o que falta.

**Se o usuário não souber quanto cobrar:** não inventar preço. Perguntar quanto tempo ele estima e qual valor-hora/valor-projeto ele pratica, ou puxar de proposta anterior parecida em `propostas/`.

### Passo 2 — Estrutura da proposta

Ordem que funciona (problema antes de solução, preço depois de valor):

1. **Capa** — logo, nome do cliente, título do projeto, data
2. **O que entendemos** — o problema dele, devolvido nas palavras dele. É a seção que faz ele sentir que foi ouvido
3. **O que propomos** — a solução em 2-3 parágrafos, sem tecnicismo
4. **Escopo** — lista do que está incluído, item por item, concreto
5. **O que não está incluído** — evita briga depois. Seção curta e sem tom defensivo
6. **Como funciona** — etapas do trabalho com prazo de cada uma
7. **Investimento** — valor, forma de pagamento, o que acontece em caso de escopo extra
8. **Por que nós** — credenciais reais, cases, números verdadeiros de `_memoria/empresa.md`
9. **Próximo passo** — uma ação só, explícita ("responda esse email confirmando e eu começo segunda")
10. **Rodapé** — contato, validade da proposta

### Passo 3 — Montar o HTML

Arquivo único, CSS inline, Google Fonts como única dependência externa. Precisa funcionar em três cenários:
- Aberto no navegador (desktop e celular)
- Impresso/salvo em PDF (`@media print`: sem fundo escuro pesado, quebras de página nas seções, sem elemento cortado no meio)
- Enviado como link

Aplicar o sistema visual: se `identidade/tokens.css` existir, importar e usar as variáveis; senão seguir o `design-guide.md`; se os dois estiverem vazios, usar padrão sóbrio (fundo claro, uma cor de destaque, tipografia grande nos títulos) e mencionar que `/design-system` resolve isso de vez.

### Passo 4 — Revisão antes de entregar

Conferir, nessa ordem:
- Nome do cliente escrito certo (erro aqui mata a proposta)
- Nenhum placeholder sobrando (`[valor]`, `[prazo]`, `lorem`)
- Valor total, parcelas e soma batendo — **fazer a conta**: se o parcelado custa mais que o à vista, escrever o total ("ou 3× R$ 2.250, R$ 6.750 no total"). Em teste real o parcelado saiu R$ 350 mais caro sem nenhuma linha explicando, contrariando a decisão do próprio estudo de preço
- Data e validade coerentes
- Escopo sem promessa que o usuário não confirmou
- Texto passado pelos passes do `/revisar` (proposta com clichê de IA perde credibilidade na primeira linha)
- Layout auditado pelos checks do `/revisar-design` — contraste e legibilidade no PDF impresso

Mostrar a proposta renderizada (ou o resumo das seções) e esperar aprovação.

### Passo 5 — Entrega

```
✓ Proposta: propostas/<cliente>-<data>.html

Pra enviar:
1. Abrir no navegador e conferir
2. Pra PDF: `node scripts/gerar-pdf.js propostas/<arquivo>.html` (ou Imprimir → Salvar como PDF no navegador)
3. Pra link: publicar (Cloudflare Pages, Netlify Drop) ou anexar o PDF
4. Cliente pediu em Word? `node scripts/gerar-docx.js propostas/<arquivo>.html --cabecalho "<negócio>"` (`/word`)

Quer que eu escreva o email de envio? (/email-profissional)
```

Registrar a proposta em `tarefas.md` como item aberto de follow-up, com a data de validade.

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

- **Nunca inventar preço, prazo, credencial ou case.** Sem informação, perguntar ou deixar `[a confirmar]` visível
- Preço aparece uma vez, com destaque, sem esconder no meio de parágrafo. Cliente vai procurar esse número primeiro — facilitar
- Escopo em linguagem de resultado ("você recebe X"), não de tarefa interna ("configuração de pipeline")
- Seção "não incluído" é obrigatória em proposta de serviço
- Tom conforme `_memoria/preferencias.md`. Proposta não é lugar de "vamos juntos nessa jornada"
- Uma proposta, um próximo passo. Duas opções de pacote são OK; três ou mais paralisam a decisão
- Se o cliente for de outra marca, o visual segue a marca **do usuário** (quem propõe), não a do cliente
