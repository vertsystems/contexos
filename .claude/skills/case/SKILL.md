---
name: case
description: >
  Transforma um resultado real de cliente em case com prova: colhe os fatos (antes, depois,
  fonte, data), calcula a variação por comando, escreve as três versões (três linhas pra bio e
  proposta, um parágrafo pra post, uma página pra anexo), preenche o termo de autorização e
  cataloga na biblioteca. Sem número com fonte, o case sai marcado como relato sem prova.
  Use quando o usuário disser "quero contar o resultado que eu consegui pro cliente", "tenho um
  caso de sucesso", "como mostro que o meu trabalho funciona", "o cliente teve resultado e
  quero usar isso", "faz um case", "estudo de caso", "preciso de prova pra colocar na proposta",
  "quero botar o resultado do cliente no site", "posso usar o nome do cliente?", ou /case.
---

# /case — Resultado de cliente que vira prova

> **Convenção de pastas:** a saída vai em `biblioteca/cases/<slug>.md`, com os fatos em `<slug>.fatos.json` e o termo em `<slug>-autorizacao.md` ao lado; a linha de catálogo entra em `biblioteca.md`. Na convenção **por cliente**, case sobre o trabalho da própria casa fica na raiz (`biblioteca/cases/`); case que você escreve **pro** cliente, sobre os clientes dele, vai em `clientes/<Nome>/biblioteca/cases/`. A pasta nasce no primeiro case.

Depoimento é frase. Case é prova: o número de antes, o número de depois, de onde saíram, e
o cliente autorizando por escrito. Quando a `/proposta` e o `/carrossel` precisam de prova,
eles consultam o `biblioteca.md` — e hoje acham um "excelente profissional" solto num print.
Um case bem feito vende mais que dez adjetivos, e o dono de negócio pequeno quase sempre tem
o resultado na mão. Só não tem o número anotado, nem a autorização. Por isso o Passo 7 não é
enfeite: case sem linha no catálogo é case que ninguém acha na hora de vender.

## Dependências

- **Contexto:** `_memoria/empresa.md` (o que você vende, quem são os clientes), `_memoria/preferencias.md` (voz), `_memoria/publico.md` (a dor na palavra do cliente) e `_memoria/oferta.md` (a promessa contra a qual o resultado é lido), quando existirem
- **Onde o resultado já pode estar:** `biblioteca.md` (tabelas "Depoimentos" e "Cases"), `vendas/pos-venda/` (depoimento colhido pelo `/pos-venda`), `financeiro/fechamento-<AAAA-MM>.md` quando o cliente é a própria casa
- **Marca:** `identidade/marca.md`, se existir. A história em que o cliente é o herói já está lá; o case reaproveita, não reescreve
- **Referência:** `templates/crescimento/case.md` (o que conta como prova, a ordem de contar, os três tamanhos, o que nunca dizer) e `templates/crescimento/autorizacao-de-uso.md` (o termo, a base legal, como pedir; compartilhado com o `/autorizacao`)
- **Script:** `scripts/case.js` (calcula a variação, confere número e data do texto contra os fatos, gera a linha da biblioteca)
- **Conferência:** `node scripts/verificar.js texto`
- **Word, se o cliente pedir o termo editável:** `scripts/gerar-docx.js`
- **Saída:** `biblioteca/cases/<slug>.md`, `biblioteca/cases/<slug>.fatos.json`, `biblioteca/cases/<slug>-autorizacao.md` e uma linha na tabela "Cases" de `biblioteca.md`. O slug sai de `node scripts/case.js slug "<cliente>" "<tema>"`

---

## Workflow

### Passo 1 — Achar o resultado

Antes de perguntar, olhar o que já existe. Ler `biblioteca.md` (depoimento com antes e depois
dentro, case cadastrado sem arquivo) e `vendas/pos-venda/` (depoimento que o `/pos-venda`
colheu). Se o usuário chegou com o cliente na boca, ir direto. Se não:

> "Qual cliente e qual resultado? Pode ser em uma frase, do jeito que você contaria pra
> um amigo: 'a padaria parou de jogar pão fora'."

Uma pergunta só. O resto vem no levantamento.

Se o resultado é da própria casa (o usuário quer contar o crescimento dele), vale o mesmo
fluxo, com os números vindo do `/caixa` e sem termo de autorização.

### Passo 2 — Colher os fatos

Levantamento é uma mensagem só, com as sete perguntas de `templates/crescimento/case.md`:

> 1. "Quem é o cliente? Nome, ramo e tamanho (ex.: padaria de bairro, 3 funcionários)"
> 2. "Como estava antes, em número? E de onde vem esse número (planilha, extrato, contagem)?"
> 3. "O que travava, nas palavras dele?"
> 4. "O que você fez, em duas ou três ações concretas?"
> 5. "Como ficou, em número, de onde vem e em que data foi medido?"
> 6. "Quando começou e quando você mediu o depois?"
> 7. "O que deu errado ou demorou no caminho?"

Se ele já tem depoimento (WhatsApp, e-mail, avaliação), pedir o texto literal, quem disse e
a data. Se mandou print, ler o print e transcrever sem melhorar.

Com as respostas, escrever `biblioteca/cases/<slug>.fatos.json`. O molde tem o exemplo
completo; o esqueleto mínimo é este:

```json
{
  "cliente": "Padaria São João",
  "segmento": "padaria de bairro",
  "trava": "jogava pão fora toda semana",
  "pode_citar_nome": true,
  "atualizado_em": "<AAAA-MM-DD>",
  "periodo": { "inicio": "<AAAA-MM-DD>", "fim": "<AAAA-MM-DD>" },
  "metricas": [
    { "nome": "", "antes": "", "depois": "", "unidade": "", "fonte": "", "data": "<AAAA-MM-DD>" }
  ],
  "outros_numeros": [ { "valor": 0, "o_que": "", "fonte": "" } ],
  "depoimento": { "texto": "", "quem": "", "data": "<AAAA-MM-DD>", "canal": "" },
  "autorizacao": { "data": "", "arquivo": "" }
}
```

`outros_numeros` é pra todo número que vá aparecer no texto e não seja métrica (quantos
funcionários, quantas fornadas, o preço da consulta): o conferidor acusa qualquer algarismo
que não esteja em algum desses campos. `trava` alimenta a coluna "Problema → resultado" do
catálogo. Se o cliente pediu anonimato, o slug sai do segmento, não do nome: o conferidor
acusa o nome do cliente até no caminho do arquivo citado dentro do texto.

Número que ele não sabe fica de fora do JSON, não vira chute. "Acho que uns 30%" é
`[a confirmar]` até ele abrir a planilha. Se der pra abrir agora, melhor: planilha se lê
com `node scripts/gerar-planilha.js --ler <arquivo>`, e extrato com o mesmo comando ou
com o `awk` do `/caixa`.

### Passo 3 — Calcular por comando

```bash
node scripts/case.js calcular biblioteca/cases/<slug>.fatos.json
```

O script devolve, pra cada métrica, a diferença absoluta, a variação em porcentagem sobre o
antes, o multiplicador quando passa de 1,5× e o prazo em dias, semanas, meses completos e
meses de calendário. E o **status**:

| Status | Quando | O que muda |
|---|---|---|
| **comprovado** | Ao menos uma métrica com antes, depois, fonte e data | Pode ir pra proposta, página e post como prova |
| **relato sem prova** | Nenhuma métrica com fonte e data | Conta a história, sem afirmar variação; as consumidoras usam como relato |

O sufixo **", aguardando autorização"** cola em qualquer um dos dois enquanto
`autorizacao.data` estiver vazio: o case fica no arquivo e no catálogo, e não sai em peça
pública. O conferidor cobra o sufixo no texto, e cobra a retirada dele quando a data chega.

Mostrar a conta ao usuário antes de escrever ("12% → 3%: caiu 75% sobre o antes, em 26
semanas"). É aqui que o "quase 80%" que ele tinha na cabeça vira 75%, e é o número do
script que vai pro texto. Se ele discordar da conta, refazer a partir do dado bruto; nunca
ajustar o JSON pra bater com a memória dele.

### Passo 4 — Pedir a autorização

Sem autorização o case não sai de casa. Preencher o termo de
`templates/crescimento/autorizacao-de-uso.md` em `biblioteca/cases/<slug>-autorizacao.md`
com o que vai aparecer de verdade: nome, os números exatos do JSON, o depoimento literal, os
canais. Se o cliente quiser editar, `node scripts/gerar-docx.js biblioteca/cases/<slug>-autorizacao.md`.

Mandar junto a versão curta do case (o Passo 5 pode rodar antes deste, na mesma conversa),
pra ele ver o que sairia. A mensagem de pedido está no molde; adaptar à voz de
`preferencias.md` e ao canal (`/whatsapp` calibra o formato). Enquanto a resposta não vem:

- `autorizacao.data` fica vazio e o status carrega "aguardando autorização"
- Entra em `tarefas.md`: `- [ ] Cobrar autorização do case <cliente> — <data +5 dias úteis> (/case)`

Quando ele responder por escrito (mensagem no WhatsApp com "autorizo" vale), preencher
`autorizacao.data`, guardar o print ao lado e rodar o Passo 6 de novo. Se autorizou só uma
parte (número sim, nome não), `pode_citar_nome` vira `false` e o texto ganha a versão
anônima do molde.

### Passo 5 — Escrever as três versões

Ler `identidade/marca.md` e `_memoria/publico.md` antes. O cliente é o herói; a palavra que
descreve a trava é a dele, não a sua. A ordem é a do molde: situação, trava, ação (com o que
deu errado), resultado com a conta, prova. Número em algarismo e inteiro, pra que o script
consiga conferir: "R$ 18.000", não "18 mil" nem "dezoito mil" (o conferidor lê o 18 e acusa
um número que não está nos fatos).

```markdown
# Case — <cliente ou "segmento (anônimo)"> — <tema>

**Status:** <comprovado | relato sem prova>[, aguardando autorização]
*Fatos em `<slug>.fatos.json`, atualizados em <AAAA-MM-DD>. Autorização: <data ou pendente>.*

## Versão curta (bio, rodapé de proposta, slide)
[quem, número de antes, número de depois, prazo: até três linhas]

## Versão média (post, e-mail, abertura de reunião)
[um parágrafo: situação e trava, ação, resultado com a conta, depoimento no fim]

## Versão longa (anexo de proposta, página)
### Situação
### O que travava
### O que foi feito
[inclusive o que não funcionou de primeira]
### Resultado
| Métrica | Antes | Depois | Variação | Prazo | Fonte |
|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... |
### Prova
> "[depoimento literal]" — <quem>, <data>
Fontes: [de onde saiu cada número, com data]

## Onde usar
- `/proposta`: curta na seção "Por que nós", longa como anexo
- `/landing`: média na seção de prova
- `/carrossel`: curta como slide de resultado
```

O que **não** entra: adjetivo no lugar de número, "você também pode ter esse resultado",
causalidade que não dá pra provar, média de vários clientes como se fosse um. A lista
completa está no molde. Em status "relato sem prova", o texto conta o que foi feito e diz
que o número não foi levantado; não escreve "dobrou" nem "%".

### Passo 6 — Conferir

Dois comandos, os dois precisam terminar em "Tudo certo.":

```bash
node scripts/case.js biblioteca/cases/<slug>.fatos.json
node scripts/verificar.js texto biblioteca/cases/<slug>.md
```

O primeiro recalcula e cruza cada número e data do `.md` com os fatos: número que não é
antes, depois, diferença, porcentagem, prazo ou `outros_numeros` é acusado com a linha; data
fora do período idem; status escrito diferente do calculado idem; nome do cliente em case
anônimo idem; campo em branco no termo vira aviso. A saída de correção é sempre o texto ou
o JSON (com a fonte), nunca o número.

O segundo mede ritmo e clichê. Case costuma reprovar em "ritmo uniforme" quando as três
versões saem com frases do mesmo tamanho; o conserto é uma frase curta de verdade no meio.

### Passo 7 — Catalogar e avisar

```bash
node scripts/case.js linha biblioteca/cases/<slug>.fatos.json
```

Colar a linha na tabela "Cases" de `biblioteca.md` (criar o arquivo com o formato do
`/biblioteca` se não existir). Se o depoimento ainda não estava na tabela "Depoimentos",
entra também, com a coluna "Autorizado" preenchida com a mesma data.

Entrega curta: o status, a conta em uma linha, a versão curta colada na conversa, e o que
falta (autorização, número a confirmar). Depois, uma vez:

> "Case catalogado. A `/proposta` e o `/carrossel` acham esse resultado no `biblioteca.md`
> quando precisarem de prova; pra `/landing` eu aponto o arquivo na hora. Quer que eu já
> monte alguma peça com ele?"

Se `autorizacao.data` estiver vazio, a frase muda: o case existe, mas nenhuma peça pública
sai com ele até a autorização chegar.

---

## Regras

- **Nunca inventar número, data ou fala.** Tudo que aparece no texto está no `.fatos.json` com fonte. Sem número: status "relato sem prova", escrito no arquivo e na biblioteca. Um "dobrou" sem fonte é o que o CDC, art. 37, § 1º, chama de publicidade enganosa (fonte e data no molde)
- **O arquivo de fatos é obrigação, não capricho.** O CDC manda o fornecedor guardar, pra mostrar a quem pedir, os dados que sustentam a mensagem publicitária (Lei 8.078/1990, art. 36, parágrafo único — planalto.gov.br/ccivil_03/leis/l8078compilado.htm, conferido em 2026-09-23). O `.fatos.json` mais a fonte de cada número é exatamente esse acervo; case publicado sem ele é peça que o negócio não consegue defender
- **Toda conta passa pelo comando.** Variação, porcentagem, multiplicador e prazo saem do `scripts/case.js`. Se o número do usuário e o do script divergem, o do script vai pro texto e a divergência vai pra conversa
- **Depoimento é literal.** Corrigir digitação é permitido; melhorar frase, cortar ressalva ou juntar duas falas em uma não é. Depoimento genérico entra genérico, ou volta pro `/pos-venda` pedir a pergunta específica
- **Sem autorização escrita, case não sai de casa.** Fica no arquivo, catalogado como "aguardando autorização", e nenhuma peça pública o usa. Resposta no WhatsApp com "autorizo" vale como escrito; guardar o print. A base legal (Código Civil, art. 20; LGPD, art. 7, I, art. 8 e art. 18, IX) está no molde com URL e data de conferência
- **Conferir é dos dois lados.** O conferidor acusa número e data do texto que não estão nos fatos, e também o contrário: status escrito diferente do calculado, nome em case anônimo, campo em branco no termo, afirmação de variação em case sem prova. Nunca "ajustar" o JSON pra calar o aviso
- **Autorização parcial vale.** Nome não, número sim: versão anônima com segmento e tamanho, sem descrição que identifique, sem foto, sem logo. Número não, nome sim: só a história e a variação em porcentagem, se ele aceitar
- **Revogação se cumpre.** "O cliente pediu pra tirar" retira o case das peças públicas no prazo do termo, marca a linha da biblioteca como revogada com a data, e mantém o arquivo como registro. Não apagar
- **Case não é promessa.** Nada de "você também pode", "resultado garantido" ou "em média nossos clientes". Um cliente, um resultado, uma data
- **Profissão regulada** (saúde, direito, psicologia, nutrição) tem regra de conselho sobre divulgar resultado. O `/publicidade-regulada` confere antes de qualquer peça pública; na dúvida, o case fica só pra reunião
- **Não substitui advogado.** O termo cobre uso comum de negócio pequeno. Cláusula de confidencialidade no contrato, imagem de menor, cessão de direito autoral e uso em campanha de terceiro passam por advogado antes
- **Dado pessoal fica no workspace (LGPD).** CPF, telefone e nome de pessoa física entram no termo e no JSON, não em peça pública sem autorização, e nunca em WebSearch ou prompt de ferramenta externa
- **Fronteira com as vizinhas:** o `/biblioteca` cataloga (esta skill entrega a linha pronta); o `/pos-venda` colhe o depoimento na hora certa; o `/marca` conta a história do negócio, com o cliente como herói, e o case só reaproveita; o `/autorizacao` cuida de imagem, voz e obra fora do case, com o mesmo termo; a `/proposta`, a `/landing` e o `/carrossel` consomem a saída. Esta skill escreve o case e prova o número, nada além
- **Quando o resultado for fraco, dizer.** "Subiu 4% em um ano" é um case fraco, e o usuário precisa ouvir isso antes de colocar na proposta. Melhor um relato honesto do que um número que o prospect vai achar pequeno
