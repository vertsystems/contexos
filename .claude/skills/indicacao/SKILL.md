---
name: indicacao
description: >
  Desenha o programa de indicação do negócio: quem indica (cliente, parceiro ou afiliado),
  o que cada lado ganha, como rastrear quem trouxe quem, o pedido na hora certa, as mensagens
  prontas, os termos em uma página e a medição do mês. Faz a conta por comando: quanto custa
  um cliente indicado, quanto custa um por anúncio, e a partir de que recompensa o programa
  deixa de compensar.
  Use quando o usuário disser "quero que meu cliente traga cliente", "programa de indicação",
  "indique e ganhe", "quanto eu dou pra quem indica", "quero ter afiliado", "comissão pra quem
  indicar", "como peço indicação", "meus clientes vêm de boca a boca", "vale a pena dar desconto
  pra quem indica", ou /indicacao.
---

# /indicacao — Cliente que traz cliente

> **Convenção de pastas:** o programa vai em `vendas/indicacao.md` e a medição de cada mês em `vendas/indicacao-<AAAA-MM>.md`. Na convenção **por cliente**, `clientes/<Nome>/vendas/`. A pasta nasce na primeira peça.

Quase todo negócio pequeno já vive de indicação e não tem programa nenhum: o cliente indica
quando lembra, o dono agradece quando fica sabendo, e ninguém conta quantos vieram assim.
O programa não inventa a indicação. Ele dá motivo, hora e texto pra ela acontecer, e coloca
um número no fim do mês.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que vende, ticket médio, se tem recompra, canal onde o cliente chega
- **Tom:** `_memoria/preferencias.md` — mensagem de indicação em voz de campanha não é encaminhada
- **Cliente real:** `_memoria/publico.md`, se existir — a palavra que ele usa pra recomendar
- **Oferta:** `_memoria/oferta.md` — o que o indicado vai comprar, e a garantia que reduz o risco dele
- **Margem:** o último `financeiro/fechamento-<AAAA-MM>.md` do `/caixa` — sem margem, a recompensa é chute
- **Custo por cliente no anúncio:** `campanhas/relatorios/` do `/relatorio-ads`, quando o negócio anuncia
- **Convenção de link:** `medicao/utm.md` do `/medir`, se existir — o link de indicação segue o padrão de lá
- **Referência:** `templates/crescimento/indicacao.md` — tipos de programa, recompensa, rastreio, termos, LGPD
- **Depoimentos:** `biblioteca.md` — quem já deu depoimento é o primeiro a ser convidado
- **Scripts:** `scripts/verificar.js` (`tabela`, `datas`, `texto`)
- **Saída:** `vendas/indicacao.md` (programa) e `vendas/indicacao-<AAAA-MM>.md` (medição mensal)

---

## Workflow

### Passo 1 — Levantar de onde vem o cliente hoje

Ler a memória primeiro. Depois perguntar só o que falta, em uma mensagem só, porque é
levantamento:

> 1. "Quantos clientes novos entraram nos últimos 3 meses, e quantos desses vieram por indicação?" (se não souber, o número aproximado serve, marcado como estimativa)
> 2. "Quanto sobra de margem numa primeira compra, depois de tirar o custo direto?" (se o `/caixa` já fechou o mês, pular)
> 3. "Você paga anúncio? Quanto custou cada cliente que veio de lá?" (se o `/relatorio-ads` já tem o CPA, pular)
> 4. "O cliente compra de novo? Quantas vezes por ano, em média?"
> 5. "Onde o cliente novo chega: WhatsApp, balcão, site, formulário?"

A resposta 1 diz se o programa nasce pra **organizar** o que já acontece ou pra **começar**
do zero. Um salão que recebe 40 clientes novas por mês e sabe que umas 25 vieram "porque a
amiga falou" tem programa pronto esperando um código; uma clínica que abriu há dois meses
tem que pedir a primeira. A 5 decide o rastreio. Se ele já tem um "indique e ganhe" rodando,
pedir a regra atual e o que deu errado: quase sempre é recompensa de um lado só, ou ninguém
sabe que existe.

### Passo 2 — Escolher quem indica

Uma pergunta, com a tabela na frente:

| Tipo | Quando é o certo | O que exige |
|---|---|---|
| **Cliente indica** | Tem cliente satisfeito e o serviço tem conversa (alguém pergunta "quem fez isso?") | Recompensa dos dois lados, texto pronto, pedido na hora certa |
| **Parceiro indica** | Outro negócio atende o mesmo público antes ou depois de você (contador que indica o designer, pet shop que indica o adestrador) | Um código próprio no seu programa, recompensa em serviço ou crédito, combinado por escrito em uma página |
| **Afiliado vende** | Oferta que já fecha sozinha e margem pra dividir | Comissão em %, contrato pelo `/contrato`, link rastreado, nota fiscal |

Começar por um tipo, não pelos três. Cliente indica é o certo pra quase todo mundo; afiliado
só quando o Passo 3 mostrar margem pra pagar comissão e sobrar.

Fronteira com o `/parcerias`: aqui o parceiro é **mais um indicador** do seu programa, com
código e recompensa iguais aos dos outros. Quando vira acordo de mão dupla com ação em cima
(cupom cruzado, combo, evento, sorteio com outra loja, indicação mútua combinada), é
`/parcerias`.

### Passo 3 — Definir a recompensa e fazer a conta

Escolher o tipo de recompensa pela tabela em `templates/crescimento/indicacao.md`. Duas
regras que não mudam: **dos dois lados** (quem indica ganha, quem chega ganha) e **paga na
compra**, nunca no cadastro.

Aí a conta, por comando, com os números do Passo 1. Trocar os valores e rodar:

```bash
node -e '
const ticket   = 1500;  // ticket médio da 1ª compra, em R$ (só entra se tem comissão em %)
const margem   = 420;   // margem de contribuição da 1ª compra, em R$ (do /caixa)
const recompra = 1;     // compras médias por cliente no ano (1 se não souber)
const cpa      = 180;   // custo por cliente no anúncio, em R$ (do /relatorio-ads); 0 se não anuncia
const premio   = 60;    // recompensa de quem indica, em R$ (brinde: o custo do brinde; afiliado: 0 e usar comissaoPct)
const comissaoPct = 0;  // comissão do afiliado em % do ticket (0 se não é afiliado)
const desconto = 40;    // desconto ou crédito do indicado na 1ª compra, em R$
const naCompra = true;  // true = paga só quando o indicado compra; false = paga no cadastro
const conv     = 0.35;  // indicações que viram cliente (só entra se paga no cadastro)
const brl = (v) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const recompensa = premio + ticket * comissaoPct / 100;
const custo = (naCompra ? recompensa : recompensa / conv) + desconto;
const tetoMargem = margem * recompra;
const teto = cpa ? Math.min(tetoMargem, cpa) : tetoMargem;
console.log("recompensa de quem indica:       " + brl(recompensa));
console.log("custo por cliente indicado:      " + brl(custo));
console.log("teto pela margem (margem×recompra): " + brl(tetoMargem));
console.log("custo por cliente no anúncio:    " + (cpa ? brl(cpa) : "não anuncia"));
console.log("teto da recompensa somada:       " + brl(teto) + (cpa && cpa < tetoMargem ? " (manda o CPA)" : " (manda a margem)"));
if (cpa) console.log(custo < cpa ? "indicação sai " + (100 - custo / cpa * 100).toFixed(0) + "% mais barata que o anúncio" : "indicação sai MAIS CARA que o anúncio");
console.log(custo >= teto ? "NÃO COMPENSA: " + brl(custo) + " acima do teto de " + brl(teto) : "compensa: folga de " + brl(teto - custo) + " por cliente, recompensa somada em " + (custo / teto * 100).toFixed(0) + "% do teto");
if (comissaoPct && ticket * comissaoPct / 100 >= margem) console.log("ALERTA: a comissão come toda a margem da 1ª compra");
'
```

O que sai daí vai pro arquivo como está: custo por cliente indicado, custo por cliente no
anúncio, teto e folga. O **teto** é o número que responde "a partir de quanto deixa de
compensar": acima dele, ou a primeira venda sai no prejuízo, ou o anúncio traz o mesmo
cliente mais barato. A linha "manda o CPA" ou "manda a margem" diz qual dos dois está
segurando o teto, e é isso que o usuário precisa entender pra saber o que mudaria a conta.

Largar com recompensa somada perto da **metade do teto**. Subir depois é notícia boa pra
contar; baixar é quebra de confiança. Se o usuário quer brinde em vez de valor, o custo do
brinde (o que ele paga, não o preço de venda) entra no lugar de `premio`.

Se faltou margem ou CPA, rodar com o que tem, escrever `[a confirmar]` no lugar do que
faltou e dizer que o teto ainda não sustenta decisão. Não preencher com número plausível.
Comissão de afiliado usa `comissaoPct` sobre o `ticket`; o contrato entra antes da primeira
venda, não depois.

### Passo 4 — Desenhar o rastreio

Escolher pelo canal da resposta 5. O mínimo é a **pergunta no cadastro** ("quem te
indicou?"), que serve pra qualquer negócio e vira campo obrigatório na primeira conversa. As
outras somam a ela:

- **Código pessoal** — nome + 2 dígitos (`ANA27`), falado no balcão ou no WhatsApp. Maiúsculo, sem acento, sem espaço, único por pessoa. Curto o bastante pra lembrar
- **Link com UTM** — um por indicador, quando existe página, formulário ou loja virtual
- **Cupom na loja virtual** — desconto automático com o código, quando a plataforma permite

Se `medicao/utm.md` existe, o link segue a convenção de lá e entra na tabela de links do
`/medir`. Se não existe, o padrão é `utm_source=indicacao`, `utm_medium=` o tipo de quem
indica (`cliente`, `parceiro` ou `afiliado`), `utm_campaign=programa` e `utm_content=` o
código. Gerar os links por comando, um por indicador, pra não sair link quebrado:

```bash
node -e '
const base = "https://seusite.com.br/";          // página onde o indicado chega
const tipo = "cliente";                           // cliente | parceiro | afiliado
const codigos = ["ANA27", "JOA12"];               // um por indicador
for (const c of codigos) {
  const u = new URL(base);
  u.searchParams.set("utm_source", "indicacao");
  u.searchParams.set("utm_medium", tipo);
  u.searchParams.set("utm_campaign", "programa");
  u.searchParams.set("utm_content", c.toLowerCase());
  console.log(c + "  " + u.href);
}
'
```

Quem tem site rastreia a origem pelo link; quem atende no WhatsApp rastreia pela pergunta.
O registro de quem indicou quem vai na tabela do arquivo mensal (Passo 9), uma linha por
indicação, com status. O que o `/medir` faz é ler de onde vem **todo** cliente, mês a mês;
aqui só entra o que passou pelo código, pelo link ou pela pergunta no cadastro.

### Passo 5 — Escolher a hora de pedir

A hora certa é a mesma janela do depoimento no `/pos-venda`: **logo depois da entrega, com o
cliente confirmando que ficou bom**. A ordem na conversa é fixa:

1. Confirmar que ficou como ele esperava, e ouvir
2. Se ficou: pedir o depoimento (isso é o `/pos-venda`)
3. Na mesma conversa ou no dia seguinte: apresentar o programa, com o texto pronto pra encaminhar

Se não ficou bom, não existe passo 3. Programa de indicação em cima de problema aberto
rende reclamação, não cliente.

Outros momentos que funcionam, em ordem: depois de um elogio espontâneo; na segunda compra;
no aniversário de um ano de cliente. Momento que não funciona: na cobrança, no atraso, no
primeiro contato.

O programa também precisa **aparecer sem pedir**: assinatura do e-mail, rodapé da nota ou
do orçamento, mensagem de pós-venda, destaque do perfil, uma linha nas respostas rápidas do
`/whatsapp`. Programa que só existe quando o dono lembra não existe.

### Passo 6 — Escrever as mensagens

Curtas, na voz de `preferencias.md`, no canal dele. Duas variantes de cada, com temperatura
diferente. As seis peças:

1. **Pedido de indicação** (do negócio pro cliente): diz o que ele ganha, o que o amigo ganha, e entrega o texto pronto
2. **Texto pra encaminhar** (do cliente pro amigo): em primeira pessoa **de quem indica**, com o código. É a peça que mais importa; se ela não parece escrita por uma pessoa comum, não é encaminhada
3. **Boas-vindas ao indicado** (quando ele chama): reconhece quem indicou pelo nome e confirma o que ele ganha
4. **Recompensa liberada** (pro indicador): avisa, agradece, e lembra que o código continua valendo. É a mensagem que gera a segunda indicação
5. **Lembrete** (30 dias depois pra quem aceitou entrar e não indicou): uma vez só, com motivo
6. **Convite pra parceiro ou afiliado**: o que ele ganha, como rastreia, e o próximo passo (uma página de acordo ou o contrato)

Exemplo da peça 2, pra calibrar o tamanho:

> "Oi! Fiz meu site com a [nome], e ficou do jeito que eu queria. Ela tem um programa
> de indicação: se você fechar com ela e falar meu código (ANA27), você ganha 10% na
> primeira etapa. Se quiser, o contato dela é esse: [link]."

E da peça 4, que ninguém escreve e é a que mais rende:

> "Ana, a Bruna fechou hoje e falou seu código. Seu crédito de R$ 60 já está na sua
> conta, vale na próxima vez que vier. Obrigado de verdade. O ANA27 continua valendo."

Sem "espero que esteja tudo bem", sem "oportunidade imperdível", sem prazo inventado pra
apressar ("só até sexta"), sem emoji fazendo papel de argumento. Uma pergunta por mensagem.

### Passo 7 — Escrever os termos

Uma página, em linguagem de gente, seguindo as oito cláusulas de
`templates/crescimento/indicacao.md`: o que conta como indicação, quando libera, como recebe,
validade, limite, o que não vale, como o programa muda ou encerra, e o que se guarda de dado.

Três alertas que a skill dá quando o caso pede:

- **Sorteio como recompensa** é promoção comercial regulada (Lei 5.768/1971) e pede autorização federal antes de começar `[a confirmar com contador ou advogado]`. Recompensa certa não passa por isso
- **Comissão pra afiliado** é relação comercial: sem contrato, não promete. `/contrato` monta, adaptando o modelo de prestação de serviço pra contrato de comissão
- **Pagar pessoa física** em dinheiro pode exigir recibo, nota ou retenção `[a confirmar com o contador antes do primeiro pagamento]`

Os termos não se humanizam: é texto seco, previsível, igual pra todo mundo.

### Passo 8 — Escrever o programa

```markdown
# Programa de indicação — <negócio>

> Versão de <AAAA-MM-DD>. Termos completos no fim desta página. Rever a recompensa em <AAAA-MM-DD>.

## Em uma frase
[Quem indica ganha X; quem chega ganha Y; vale na primeira compra.]

## Quem indica
[cliente | parceiro | afiliado, e por que esse tipo primeiro]

## Recompensa
| Lado | O que ganha | Quando libera | Como recebe |
|---|---|---|---|
| Quem indica | ... | ... | ... |
| Quem é indicado | ... | ... | ... |

## A conta
| Indicador | Valor |
|---|---|
| Margem da 1ª compra | R$ ... |
| Custo por cliente no anúncio | R$ ... (ou "não anuncia") |
| Custo por cliente indicado | R$ ... |
| Teto da recompensa somada | R$ ... (manda o CPA | manda a margem) |
| Folga | R$ ... |

Acima de R$ <teto>, o programa deixa de compensar. Fonte: /caixa <mês>, /relatorio-ads <semana>.

## Rastreio
[pergunta no cadastro + código | link UTM | cupom, e onde cada um aparece]
| Indicador | Código | Link |
|---|---|---|

## Quando pedir
[a janela, e onde o programa aparece sem pedir: assinatura, rodapé, perfil, resposta rápida]

## Mensagens
### Pedido de indicação — A / B
### Texto pra encaminhar — A / B
### Boas-vindas ao indicado — A / B
### Recompensa liberada — A / B
### Lembrete de 30 dias — A / B
### Convite pra parceiro ou afiliado — A / B

## Termos do programa
[as oito cláusulas, em uma página]

## O que medir todo mês
[indicações, conversões, receita, recompensas pagas, custo por cliente indicado, quem mais indica]
```

Marcar em `tarefas.md`: a data de rever a recompensa (90 dias) e o dia da medição mensal.

### Passo 9 — Medir o mês

No fechamento de cada mês (encaixa no `/revisao-semanal` da última semana), escrever
`vendas/indicacao-<AAAA-MM>.md`:

```markdown
# Indicação — <mês>/<ano>

## O mês em uma frase
[Entraram N indicações, M viraram cliente, custou R$ X por cliente. O que explica.]

## Registro
| Data | Quem indicou | Código | Indicado | Status | Receita | Desconto do indicado | Recompensa paga |
|---|---|---|---|---|---|---|---|
| DD/MM (dia) | ... | ... | ... | chamou / comprou / parou | R$ ... | R$ ... | R$ ... |
| **Total** | | | | | **R$ ...** | **R$ ...** | **R$ ...** |

## Os números
| Indicador | Valor |
|---|---|
| Indicações recebidas | ... |
| Viraram cliente | ... |
| Taxa de conversão | ...% |
| Receita de indicados | R$ ... |
| Descontos dados | R$ ... |
| Recompensas pagas | R$ ... |
| Custo por cliente indicado | R$ ... |
| Custo por cliente no anúncio | R$ ... (ou "não anuncia") |

## Quem mais indica
[as 3 pessoas, e o que elas têm em comum: é o perfil pra convidar mais]

## O que a conta permite decidir
1. [manter, subir recompensa, mudar o pedido, encerrar, com o número]

## O que não dá pra afirmar ainda
[dado que faltou, e o que registrar no mês que vem]
```

O indicado só entra no registro com o primeiro nome, e só depois que ele mesmo chamou.
"Receita" é o que caiu na conta, já descontado o que o indicado ganhou.

Se existe mês anterior, comparar direção, não só variação. Três meses com zero indicação
não é "dar tempo": é o pedido que não está sendo feito, ou a recompensa que não move.
Perguntar qual dos dois antes de mexer.

---

## Fechar a conta (obrigatório)

```bash
node scripts/verificar.js tabela vendas/indicacao-<AAAA-MM>.md   # receita, desconto e recompensa somam com a linha Total
node scripts/verificar.js datas vendas/indicacao-<AAAA-MM>.md    # dia da semana de cada linha do registro
node scripts/verificar.js texto vendas/indicacao.md              # as mensagens sem cara de campanha
node -e 'const desc=120, rec=180, clientes=3; console.log("custo por cliente indicado: R$ " + ((desc+rec)/clientes).toFixed(2).replace(".", ","))'
```

A linha **Total** do registro é o que o comando compara com as linhas de cima e com o
resumo. Se divergir, refazer a partir das linhas, nunca ajustar o total. O custo por cliente
indicado é `(descontos dados + recompensas pagas) ÷ viraram cliente`, dividido por comando
com os totais do registro, e é ele que se compara com o CPA do mês e com o teto do programa.

---

## Regras

- **Recompensa dos dois lados.** Programa que só premia quem indica não é encaminhado; programa que só dá desconto ao indicado não é lembrado
- **Paga na compra, não no cadastro.** A exceção é afiliado com contrato que diz outra coisa
- **Nunca prometer comissão sem contrato.** Afiliado é relação comercial; a promessa por mensagem vira briga na primeira venda grande. `/contrato` antes da primeira venda
- **Não pedir antes de entregar.** A janela é a entrega confirmada como boa, a mesma do depoimento no `/pos-venda`
- **Texto pronto sempre.** Pedido de indicação sem o texto pra encaminhar é pedido pra ele inventar. Ninguém inventa
- **A conta sustenta a recompensa.** Sem margem do `/caixa` ou CPA do `/relatorio-ads`, o teto sai como `[a confirmar]` e a recompensa não fecha. Nenhum valor de recompensa entra no programa sem ter passado pelo comando do Passo 3
- **Sem escassez falsa.** "Só até sexta", "últimas vagas do programa" com quem já é cliente é onde a confiança quebra mais rápido. Se a validade existe, está nos termos; se não existe, não se inventa
- **Não mudar regra pra baixo no meio.** Baixar recompensa, encurtar validade ou negar pagamento por letra miúda custa mais que o que economiza. Se precisar mudar, nova versão com aviso e data
- **Não é sorteio.** Recompensa certa. Se o usuário insistir em sorteio, o alerta de autorização vai junto, marcado `[a confirmar]`
- **LGPD no contato indicado.** Quem indicou não entrega nome e telefone do amigo; a abordagem vai em nome de quem indicou, com o texto pronto, e o negócio só fala com o indicado quando ele chama. Nunca pedir "o número de três amigos"
- **Guardar o mínimo.** Nome, código, data e status. O registro não vai pra ferramenta externa sem autorização, e quem pedir pra sair do programa sai
- **Fronteira:** depoimento, reativação e follow-up de orçamento são `/pos-venda`; ação conjunta com outro negócio (evento, conteúdo, combo, cupom cruzado, indicação mútua combinada) é `/parcerias`; de onde vem cada cliente ao longo do tempo, e a convenção de UTM do negócio, é `/medir`, e aqui só entra o que passou pelo código, pelo link ou pela pergunta no cadastro; o valor do serviço em si é `/preco`; o roteiro da conversa com o indicado é `/vender`; o contrato do afiliado é `/contrato`
- **Não é consultoria contábil nem jurídica.** Imposto sobre comissão e regra de promoção comercial são conversa com o contador ou advogado dele. A skill aponta e marca; não responde
