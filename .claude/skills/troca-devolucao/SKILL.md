---
name: troca-devolucao
description: >
  Separa o que a loja é obrigada a aceitar do que ela escolhe oferecer: arrependimento de 7 dias
  (só fora da loja), defeito (30 ou 90 dias, em qualquer canal, com 30 dias pra consertar) e troca
  por gosto (só se foi prometida). Entrega o roteiro de resposta por caso, com a data-limite
  calculada por comando, e a política de troca escrita na identidade da marca, pronta pra
  publicar no site, na bio e na loja.
  Use quando o usuário disser "sou obrigado a trocar?", "cliente quer devolver e o dinheiro de
  volta", "comprou no site e se arrependeu", "veio com defeito, o que eu faço", "não serviu e quer
  trocar", "quanto tempo tenho pra consertar", "preciso de uma política de troca", "o que eu
  respondo no WhatsApp", "o cliente ameaçou Procon", "ganhou de presente e quer trocar",
  ou /troca-devolucao.
---

# /troca-devolucao — O que a lei obriga, o que a loja escolhe

> **Convenção de pastas:** a saída vai em `juridico/respostas-de-troca.md` e `juridico/politica-de-troca.html`. Na convenção **por cliente**, `clientes/<Nome>/juridico/`. A pasta nasce na primeira política.

A loja pequena erra troca nas duas direções. Recusa o que a lei obriga, como devolver o
dinheiro de quem comprou pelo WhatsApp e desistiu em 3 dias, e vira reclamação no Procon ou
no Reclame Aqui. Ou aceita o que não devia, como troca por gosto sem prazo nem condição, por
medo de "processo". Os dois erros nascem da mesma confusão: tratar arrependimento, defeito e
troca por gosto como uma coisa só. São três regras, com prazos diferentes, e a resposta certa
no WhatsApp depende de saber qual das três está na mesa.

> **Isto não é assessoria jurídica.** A skill lê o Código de Defesa do Consumidor pra quem
> vende produto e entrega a resposta com artigo e data. Multa de Procon, ação no juizado,
> produto que machucou alguém, cláusula fora do comum e valor alto passam por advogado. A
> skill diz isso na entrega, uma vez.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que a loja vende, canais (balcão, site, WhatsApp, marketplace), horário, número de contato, se tem CNPJ
- **Tom:** `_memoria/preferencias.md` — resposta de troca é a mensagem mais tensa que a loja manda; tom errado vira print
- **Cliente real:** `_memoria/publico.md`, se existir — como ele pede ("quero meu dinheiro", "dá pra trocar?")
- **O que já foi prometido:** `_memoria/oferta.md` (garantia, "troca garantida"), e a bio, a placa, a etiqueta e o site, que o usuário mostra
- **Referência:** `templates/juridico/troca-devolucao.md` — os três casos com artigo, fonte e data; tabela "cliente pediu X: sou obrigado?"; o que a política precisa ter e o que não pode entrar; zona cinzenta
- **Molde:** `templates/juridico/politica-de-troca.html` — a política pronta pra receber os dados da loja e os tokens da marca
- **Script:** `scripts/prazos.js` — datas-limite de arrependimento, garantia legal, conserto e política da loja, com feriado e dia útil
- **Identidade:** `identidade/tokens.css` se existir, senão `identidade/design-guide.md`
- **Conferência:** `node scripts/verificar.js datas`, `html`, `alvo` e `texto`
- **Saída:** `juridico/respostas-de-troca.md` (o roteiro por caso) e `juridico/politica-de-troca.html` (a política publicável); PDF ao lado quando a loja quiser imprimir

---

## Workflow

### Passo 1 — Levantar a loja

Se `_memoria/empresa.md` já responde, não perguntar de novo. O que faltar vai numa mensagem
só, porque é levantamento:

> 1. "O que você vende? Me dá as 5 categorias que mais saem" (é daqui que sai durável ou não durável)
> 2. "Onde a venda fecha: só no balcão, só pela internet ou WhatsApp, ou os dois?"
> 3. "O que você já promete hoje? Tem placa na loja, texto na etiqueta, frase na bio, página no site? Me manda foto ou cola o texto"
> 4. "Como o dinheiro volta quando precisa voltar: Pix, estorno no cartão, crédito na loja? Quantos dias úteis leva o Pix aí?"
> 5. "Vende algo personalizado, perecível, íntimo ou digital?"
> 6. "Pra quem quer trocar: qual canal e horário de atendimento, e pra onde o produto volta (endereço da loja ou de postagem)?"

A pergunta 3 é a que decide o caso mais comum. Se a bio diz "troca garantida em 30 dias", a
loja está obrigada a isso, em qualquer canal, pelo art. 30 do CDC. O usuário costuma não
lembrar do que prometeu.

Se ele chegou com um caso concreto ("a cliente quer devolver um vestido"), pegar as datas
antes de qualquer coisa: dia da compra, dia em que recebeu (se foi entrega), dia em que
reclamou. Sem data não existe resposta, só opinião.

### Passo 2 — Separar os três casos

Toda pergunta de troca cai numa das três linhas. Dizer ao usuário qual é, na primeira frase:

| Caso | Obrigado? | Prazo | Base |
|---|---|---|---|
| **Arrependimento**: desistiu sem motivo | só se vendeu fora da loja | 7 dias corridos do recebimento | art. 49 |
| **Defeito**: veio com problema, quebrou, faltou peça, não é o que o anúncio dizia | sim, em qualquer canal | 30 dias (não durável) ou 90 (durável) pra reclamar; 30 pra consertar | art. 18 e 26 |
| **Troca por gosto**: não serviu, não gostou, ganhou de presente | só se a loja prometeu | o que foi prometido | art. 30 e 35 |

A tabela completa, com a letra de cada artigo, está em `templates/juridico/troca-devolucao.md`.
Dois pontos que o usuário quase sempre tem invertido, e que vale dizer com todas as letras:

- Compra no balcão **não** tem os 7 dias. Quem comprou na loja e "se arrependeu" está pedindo troca por gosto, e aí vale a política da loja
- Compra pelo WhatsApp, Instagram ou site **tem** os 7 dias, e o que volta é o dinheiro, não crédito. Frete de devolução é da loja (STJ, REsp 1.340.604/RJ, citado no molde)

Se o caso está na zona cinzenta do molde (personalizado, perecível, íntimo, digital, "usou e
quer devolver"), a resposta leva `[a confirmar com advogado]` e a skill diz por quê.

### Passo 3 — Definir a política de troca por gosto

É a única parte em que a loja decide. Uma pergunta por vez, porque cada resposta muda a
seguinte:

1. "Quer oferecer troca por gosto? Não é obrigatório no balcão, mas quem vende roupa, calçado ou presente sem isso perde venda"
2. "Quantos dias? Conta da compra ou de quando o cliente recebeu?" (30 é o comum em roupa; 7 em presente de data comemorativa costuma ser curto demais)
3. "Condições: etiqueta, sem uso, sem lavar, na embalagem? Aqui você pode exigir, porque é cortesia sua"
4. "Como devolve: outro produto, crédito na loja com validade, ou dinheiro?" (dinheiro em troca por gosto é escolha, não obrigação)
5. "Quem paga o frete quando é troca por gosto?"
6. "O que fica de fora?" (o que ele listou na pergunta 5 do Passo 1, escrito antes da compra e com a ressalva do defeito)

O que ele decidir vai pra `_memoria/oferta.md`, com a pergunta do CLAUDE.md sobre atualizar
a memória: a garantia é parte da oferta e o `/vender` e o `/whatsapp` precisam dela.

Se a política nova é **menos** generosa que o que já está anunciado, avisar: o anunciado
vale pra quem já comprou, e a placa, a bio e a etiqueta precisam mudar no mesmo dia da
publicação. Política diferente em cada lugar é a origem da maioria das brigas.

### Passo 4 — Calcular as datas por comando

Data de prazo não se conta de cabeça: o sétimo dia cai no domingo, o trigésimo cai no
feriado, e "uns 30 dias" vira discussão. O script devolve a data exata e a data segura:

```bash
# venda pelo WhatsApp, produto durável, com política de 30 dias de troca por gosto
node scripts/prazos.js --compra 10/09/2026 --recebimento 15/09/2026 --canal online --tipo duravel --politica 30

# venda no balcão, produto não durável, cliente reclamou de defeito dia 20/11
node scripts/prazos.js --compra 13/10/2026 --canal loja --tipo nao-duravel --reclamacao 20/11/2026

# a placa diz "30 dias da compra", e não do recebimento: a promessa é que manda
node scripts/prazos.js --compra 01/09/2026 --recebimento 15/09/2026 --canal loja --tipo duravel --politica 30 --politica-de compra

# "quebrou depois de 4 meses", com a garantia de 1 ano que a loja deu por escrito
node scripts/prazos.js --compra 01/03/2026 --recebimento 05/03/2026 --canal online --tipo duravel --reclamacao 10/08/2026 --garantia 365

# gravar pra colar no roteiro, com feriado da cidade
node scripts/prazos.js --compra 13/10/2026 --recebimento 13/11/2026 --canal online --tipo duravel --feriado 08/12 --saida juridico/prazos-<pedido>.md
```

Sai uma tabela com uma linha por direito: arrependimento, garantia legal, conserto, política da
loja, e a garantia contratual quando existe. Cada linha traz "obrigatório?", "vence em" e
"aceitar até". A coluna "aceitar até" empurra pro dia útil seguinte quando o vencimento cai em
fim de semana ou feriado (Código Civil, art. 132, § 1º), e é a data que vai na mensagem ao
cliente: honrar um dia a mais custa nada; negar por um dia a menos custa a avaliação. O script
também avisa quando a reclamação chegou depois do fim da garantia, que é quando a resposta muda
de "sim" pra "depende".

Três detalhes mudam a data e quase nunca vêm de primeira. O `--recebimento` vale em qualquer
canal, não só online: móvel comprado no balcão e entregue duas semanas depois tem a garantia
contada da entrega (art. 26, § 1º). O `--politica-de` existe porque "30 dias da compra" e "30
dias de quando você receber" são promessas diferentes, e vale a que está escrita na placa. Já
quando durável ou não durável fica em aberto (uma bolsa é durável; um cosmético não; uma planta
é discutível), o jeito é rodar os dois e mostrar as duas datas.

Antes de colar no roteiro:

```bash
node scripts/verificar.js datas juridico/respostas-de-troca.md
```

### Passo 5 — Escrever o roteiro de respostas

Na voz do usuário, curto, no canal dele (`/whatsapp` calibra formato). Cada caso tem a
mensagem pronta e a data já calculada. Uma pergunta por mensagem, sem "a lei não me obriga"
seco: a recusa educada diz o que a loja **pode** fazer antes de dizer o que não pode.

```markdown
# Respostas de troca — <nome da loja>

> Canais: <balcão | site | WhatsApp>. Política de troca por gosto: <N dias, condições>.
> Versão de <AAAA-MM-DD>. Não substitui advogado: Procon, juizado e valor alto passam por um.

## Os três casos em uma linha cada
- **Arrependimento** — <tem ou não tem, conforme o canal>
- **Defeito** — 30 ou 90 dias pra reclamar; 30 pra consertar
- **Troca por gosto** — <a política da loja>

## Cliente pediu X: sou obrigado? o que respondo
### "Comprei pelo WhatsApp, chegou e não gostei" (até 7 dias)
Obrigado: sim (art. 49). Dinheiro de volta com frete; devolução por conta da loja.
Resposta:
> [texto pronto, com a data-limite: "você recebeu dia 15, então pode desistir até dia 22"]

### "Comprei na loja, não serviu"
Obrigado: não, salvo o que a loja prometeu.
Resposta:
> [texto pronto com a política: prazo, condição, como fica o valor]

### "Veio com defeito"
Obrigado: sim, em qualquer canal (art. 18 e 26). 30 dias pra consertar, contados da reclamação.
Resposta:
> [texto pronto: o que mandar (foto, número do pedido), o prazo de conserto com a data, e o que
> ele escolhe se passar dela]

### "Quebrou depois de X meses"
Obrigado: depende. Fora dos 30/90, sobram três caminhos antes de negar: vício oculto (art. 26,
§ 3º), garantia contratual ainda aberta (art. 50, rodar com `--garantia`) e assistência do
fabricante.
Resposta:
> [texto pronto com o caminho que couber, e o telefone da assistência quando for esse]

### "Quero o dinheiro, não crédito"
Obrigado: sim em arrependimento e em defeito não sanado em 30 dias; não em troca por gosto.
Resposta:
> [texto pronto: o que a loja devolve, em qual forma, em quantos dias úteis]

### "Perdi a nota"
Obrigado: sim, a nota não é a única prova (extrato, Pix, conversa da compra servem).
Resposta:
> [texto pronto pedindo a prova que a loja consegue conferir, sem transformar isso em recusa]

## Se ele insistir
[os 3 desfechos mais prováveis: aceita a política, pede exceção, cita Procon. Em cada um, a próxima mensagem]

## Datas deste caso (quando houver caso aberto)
[a tabela do scripts/prazos.js, intacta]

## O que não deu pra confirmar
[cada [a confirmar com advogado], com o motivo]
```

Os casos da tabela do molde que não se aplicam à loja saem do roteiro: loja só de balcão não
precisa da seção de arrependimento; quem não vende pela internet não precisa de estorno.
Roteiro com 12 casos ninguém lê no meio do atendimento; 6 bem escolhidos, sim.

**Quando o cliente citou Procon**: a resposta é a mesma, só que mais rápida e por escrito.
Reclamação formal trava o prazo do art. 26 até a resposta negativa da loja (§ 2º), então o
"vou ver e te respondo" precisa virar data.

### Passo 6 — Montar a política publicável

Copiar `templates/juridico/politica-de-troca.html` pra `juridico/politica-de-troca.html`,
**apagar o bloco de comentário do topo** (é instrução de montagem, e o texto dele atrapalha a
conferência) e preencher cada chave entre chaves duplas. De onde vem cada uma:

| Chave | Vem de |
|---|---|
| `NOME_DA_LOJA`, `HORARIO`, `CANAL_PEDIDO`, `LINK_PEDIDO`, `ENDERECO_DEVOLUCAO` | `_memoria/empresa.md` e a pergunta 6 do Passo 1 |
| `PRAZO_GOSTO`, `CONTA_DE`, `CONDICOES_GOSTO`, `FORMA_GOSTO`, `FRETE_GOSTO`, `EXCECOES`, `PRAZO_CREDITO` | o que o usuário decidiu no Passo 3 |
| `PRAZO_PIX` | a pergunta 4 do Passo 1 |
| `DATA_VERSAO` | a data de hoje |

Chave que o usuário não soube responder na hora entra como `[a confirmar]` no arquivo e volta
na entrega como pendência. Prazo de estorno chutado numa política publicada é promessa que a
loja vai descumprir, e promessa publicada obriga (art. 30).

O que sai junto com a seção, quando a loja não tem aquele caso: só de balcão apaga
`#arrependimento`, o `<li id="resumo-arrependimento">` e o `<span id="ressalva-arrependimento">`;
quem não oferece troca por gosto apaga `#gosto` e o `<li id="resumo-gosto">`; quem não dá
crédito apaga o `<tr id="linha-credito">`. Apagar a seção e esquecer o item do resumo é o erro
que sobra: o resumo continua prometendo os 7 dias, e o cliente vai cobrar.

Aplicar a marca: se `identidade/tokens.css` existe, colar o bloco `:root` dele no `<style>`
da própria página (cópia inline, porque a política vai ser enviada sozinha por link ou
WhatsApp e não pode depender de arquivo ao lado). Sem tokens, seguir `design-guide.md`; sem
os dois, o padrão sóbrio do molde já serve, e vale citar que o `/design-system` resolve.

Antes de entregar:

```bash
grep -n "{{" juridico/politica-de-troca.html          # vazio: nenhuma chave sobrou
grep -n "a confirmar" juridico/politica-de-troca.html # o que ainda falta perguntar
node scripts/verificar.js html juridico/politica-de-troca.html
node scripts/verificar.js alvo juridico/politica-de-troca.html
node scripts/verificar.js texto juridico/respostas-de-troca.md
node scripts/gerar-pdf.js juridico/politica-de-troca.html   # só se a loja quer imprimir
```

O `html` acusa link vazio (o `wa.me` sem número é o erro mais comum aqui) e `var()` órfão. Os
três `verificar.js` precisam terminar em "Tudo certo."; o primeiro `grep` precisa voltar vazio, e
o segundo devolve a lista de pendências, que vai na entrega.

### Passo 7 — Entregar e colocar onde o cliente vê

Política que fica na pasta não protege ninguém. A entrega diz onde publicar, e é curta:

- **Site**: página própria, com link no rodapé e na página de produto (`/produto` sabe onde). Na venda pela internet isso é exigência do Decreto 7.962/2013 — art. 2º, VI, manda informar "de forma clara e ostensiva" qualquer restrição à oferta, e o art. 5º manda dizer como o cliente se arrepende
- **Bio e destaque do Instagram**: a frase de uma linha da política ("troca em 30 dias com etiqueta; defeito a gente resolve")
- **Loja física**: placa no caixa, e a mesma frase na nota ou na etiqueta. Condição de troca que o cliente só descobre na hora de trocar não vale: ela precisa estar visível antes da compra, e é isso que o Idec e o Procon-SP repetem (fontes no molde)
- **WhatsApp**: o roteiro vira resposta rápida do `/whatsapp`, e a política vira link salvo

Se a loja está com reclamação aberta (Reclame Aqui, avaliação do Google), o roteiro alimenta
o `/responder-avaliacoes`: a resposta pública é curta, e a solução vai por dentro, com a data.

Fechar com a frase de que isto não substitui advogado, uma vez, e oferecer uma vez guardar a
política em `_memoria/oferta.md` e a data de revisão em `tarefas.md` (a política pede releitura
a cada mudança de canal ou de produto, e em janeiro).

---

## Regras

- **Nunca dizer "não sou obrigado" sem antes conferir o canal e a data.** A frase é verdadeira pra troca por gosto no balcão e falsa pra compra pelo WhatsApp dentro de 7 dias. A skill só responde depois de saber onde a venda fechou e quando o cliente recebeu
- **Toda data passou pelo `scripts/prazos.js`** e pelo `verificar.js datas`. Prazo de cabeça ("uns 30 dias") não entra em mensagem ao cliente. A data que vai na resposta é a da coluna "aceitar até", nunca a anterior
- **Arrependimento devolve dinheiro, não crédito.** Art. 49, parágrafo único: "monetariamente atualizados", "de imediato". Frete de devolução é da loja. Vale-troca só se o cliente aceitar, e a política não pode condicionar a isso
- **Promessa anunciada vira obrigação.** "Troca garantida" na bio, na placa ou na boca do vendedor obriga nos termos anunciados (art. 30 e 35). Antes de dizer que a loja pode recusar, ler o que ela prometeu. A promessa mais generosa é a que vale
- **Defeito não depende de política nem de placa.** "Não trocamos" não afasta o art. 24. Exigir embalagem original ou nota fiscal como condição única é abusivo; extrato e conversa servem como prova
- **Troca por gosto é a única parte em que a loja manda.** Ali pode exigir etiqueta, prazo curto, crédito em vez de dinheiro e exceção por categoria, desde que escrito antes da compra e com a ressalva do defeito
- **Artigo nenhum sai de memória.** Todo número de artigo, prazo e parágrafo que entra no arquivo do usuário vem de `templates/juridico/troca-devolucao.md`, que tem a letra da lei, a URL do Planalto e a data de conferência, ou de uma busca feita na hora no texto oficial. Não achou lá, escreve `[a confirmar]` e diz o que precisa ser confirmado. Citar "art. 18" onde é o 26 é o defeito mais caro desta skill: destrói a confiança do dono da loja na hora em que o cliente conferir
- **Zona cinzenta leva `[a confirmar com advogado]`.** Personalizado, perecível, íntimo, digital, produto usado dentro dos 7 dias e defeito depois do prazo. A skill mostra os dois lados e não decide
- **Não é assessoria jurídica.** Dizer na entrega, uma vez. Procon, juizado, produto que causou dano, marketplace com disputa aberta e qualquer valor que doa passam por advogado antes da próxima mensagem
- **Só serve a quem vende produto.** Serviço (corte de cabelo, consultoria, curso ao vivo) tem regra própria de cancelamento e vive no `/contrato`; o art. 49 até se aplica a serviço contratado à distância, mas o roteiro de troca não. Curso gravado e e-book são zona cinzenta, e a resposta vem com advogado
- **Fronteira com as vizinhas:** o `/whatsapp` escreve a resposta rápida e não sabe a regra, é daqui que ele pega; o `/responder-avaliacoes` cuida da resposta pública quando a troca virou avaliação; o `/produto` coloca o link da política na página de compra; o `/marketplace` cuida da regra da plataforma, que costuma ser mais generosa que a lei e vale por cima quando a venda foi lá; o `/contrato` é o combinado de serviço; o `/pos-venda` retoma o cliente depois de resolvido. Esta skill é a regra e o roteiro, nada além
- **Recusa educada diz primeiro o que dá.** "A troca por gosto vai até dia 12, com etiqueta" antes de "não devolvemos em dinheiro". Mensagem que começa pelo não vira print
- **Dado do cliente fica no workspace.** Nome, telefone, endereço e número do pedido entram no roteiro só quando o usuário quiser; a resposta funciona com "[nome]". Nada disso vai pra WebSearch nem pra ferramenta externa sem autorização (LGPD). A busca pergunta "prazo de arrependimento CDC", nunca "cliente fulana pedido tal"
- **O molde envelhece.** Lei muda pouco, mas muda; a data de conferência está no rodapé de `templates/juridico/troca-devolucao.md`. Se a busca mostrar artigo alterado, usar o novo no arquivo do usuário com a data de hoje, e avisar que o molde precisa de atualização (o `/atualizar-sistema` traz a versão nova)
