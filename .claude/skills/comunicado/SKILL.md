---
name: comunicado
description: >
  Escreve o aviso difícil que exige ação de quem recebe: reajuste, mudança de regra, fechamento
  por reforma, sistema novo, pedido de desculpa por falha. Entrega as três versões do mesmo fato
  (equipe, cliente, redes), a FAQ das perguntas que vão chegar e o calendário de disparo, com o
  prazo de aviso calculado por comando e as peças conferidas uma contra a outra.
  Use quando o usuário disser "preciso avisar os clientes que vou aumentar o preço", "como eu
  falo do reajuste sem perder cliente", "vou fechar pra reforma, como aviso", "mudei a regra de
  cancelamento e preciso comunicar", "preciso mandar um aviso difícil", "como peço desculpa pro
  cliente pela falha", "vou mudar o sistema de agendamento, como explico", "tenho que avisar a
  equipe e o cliente da mesma mudança", "escreve um comunicado", ou /comunicado.
---

# /comunicado — O aviso difícil

> **Convenção de pastas:** a saída vai em `comunicacao/<AAAA-MM-DD>-<tema>/`, com a data do **disparo** no nome, não a da vigência. Na convenção **por cliente**, `clientes/<Nome>/comunicacao/<AAAA-MM-DD>-<tema>/`. A pasta nasce no primeiro comunicado.

Todo negócio pequeno passa por isso três ou quatro vezes por ano. O preço tem que subir, a loja
fecha pra reforma, o agendamento muda de lugar, alguma coisa deu errado com vinte clientes de
uma vez. O dono sabe o que precisa dizer e trava na hora de escrever, porque escrever torna
público. Então sai um texto que informa sem dizer nada, e o cliente descobre o número na fatura.
O prejuízo não vem da mudança. Vem da surpresa.

> **Isto não é parecer jurídico.** A skill escreve o texto, calcula o prazo e confere as peças.
> Reajuste em contrato assinado, encerramento de contrato, multa, cláusula de rescisão e qualquer
> mudança que mexa com empregado passam por advogado ou contador antes do disparo. A skill diz
> isso na entrega, uma vez, e segue.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que se vende, quem atende, canal de contato, horário
- **Tom:** `_memoria/preferencias.md` — aviso difícil escrito em voz de circular queima a relação que o resto do sistema construiu
- **Cliente real:** `_memoria/publico.md`, se existir — a objeção na palavra dele é a FAQ pronta
- **Oferta:** `_memoria/oferta.md` — o que estava prometido, garantia, forma de pagamento. É contra isso que a mudança é medida
- **Preço:** o estudo do `/preco` em `oferta/preco-<AAAA-MM-DD>.md` — quando é reajuste, o motivo, o percentual e o prazo saem de lá, não desta skill
- **Referência:** `templates/operacao/comunicado.md` — checklist fixa, prazos com fonte e data, léxico do que esconde o fato, método da FAQ
- **Edição:** `templates/copy/edicao.md` e `templates/copy/humanizacao.md` — o texto vai pro cliente, então passa pela mesma régua de qualquer peça
- **Script:** `scripts/comunicado.js` — matemática do prazo de aviso e conferência de fato entre as peças
- **Conferência:** `node scripts/verificar.js texto` e `datas`
- **Saída:** `comunicacao/<AAAA-MM-DD>-<tema>/` com `fato.json`, `equipe.md`, `clientes.md`, `redes.md`, `faq.md` e `disparo.md`

---

## Workflow

### Passo 1 — Separar o que é comunicado do que não é

Antes de perguntar qualquer coisa, decidir se a skill é esta. A pergunta que separa:
**alguém precisa fazer alguma coisa por causa disso?**

| O pedido | Onde resolve |
|---|---|
| Reajuste, mudança de regra, fechamento, sistema novo, desculpa coletiva | aqui |
| "Mudei o horário de sábado", sem ação e sem consequência | `/whatsapp`, uma mensagem resolve |
| Sistema fora do ar, causa raiz, vazamento de dado | `templates/backend/incidente.md`, pelo `/backend` |
| Cobrar um devedor específico | `/cobranca` |
| Newsletter, promoção, oferta pra lista | `/email` |
| Resposta a uma pessoa só | `/whatsapp` ou `/email-profissional` |
| Nota pública com imprensa envolvida | `/imprensa`, junto com esta |

Se ninguém precisa fazer nada, dizer isso em uma linha e oferecer a saída mais leve. Comunicado
com três versões, FAQ e calendário pra um recado é trabalho jogado fora, e o usuário percebe.

Ler `templates/operacao/comunicado.md` antes de seguir. É de lá que saem o léxico, os prazos
com fonte e a tabela dos cinco tipos.

### Passo 2 — Fechar a checklist fixa

Uma pergunta por vez, na ordem. Parar quando as quatro estiverem fechadas com número e data:

1. "O que muda, exatamente? Se tem valor, me diz o de antes e o de depois."
2. "A partir de que dia isso vale?" Se ele responder "mês que vem", insistir pelo dia
3. "O que a pessoa precisa fazer por causa disso, e até quando?"
4. "E se ela não fizer, o que acontece?"

Mais duas, de contexto, que mudam o texto inteiro:

5. "Por que isso está mudando agora?" O motivo verdadeiro, não o aceitável
6. "Quem decidiu, e quem assina o comunicado?" Nome de pessoa, não "a empresa"

E quatro de alcance, que definem as peças e a ordem de disparo:

7. "Quantas pessoas isso atinge, e quem é a mais afetada?"
8. "Tem alguém que merece uma ligação antes do disparo em massa?" Cliente grande, antigo ou de contrato
9. "Quem vai atender quem ficar bravo, e essa pessoa já sabe?"
10. "Isso muda algo pra quem trabalha com você?" Se muda horário, jornada, função ou salário, **para**: alteração de contrato de trabalho não é comunicado, é acordo individual (CLT, art. 468), e o texto da equipe passa a ser aviso de reunião, não decisão fechada

A 3 e a 4 são as que o usuário tenta desviar, e são as que fazem o comunicado funcionar. Se ele
disser "não precisa fazer nada", conferir de novo: quase sempre precisa aceitar, confirmar,
trocar a forma de pagamento ou retirar algo antes de uma data.

**Se for reajuste**, o motivo e o percentual não se inventam aqui. Ler `oferta/preco-<data>.md` e
`_memoria/oferta.md`: de lá saem o valor atual, o valor novo, o percentual, a data do último
aumento e o plano de aviso que o `/preco` já desenhou. Se o estudo não existe, oferecer o
`/preco` **uma vez** e seguir com o que o usuário informar, marcando o percentual como dado dele.
Antes de escrever, conferir quando foi o último aumento. Cláusula de reajuste por índice em
contrato de um ano ou mais só pode ter periodicidade anual, e estipulação com periodicidade
menor é nula de pleno direito (Lei 10.192/2001, art. 2º, §1º —
[planalto](https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10192.htm), conferido em
2026-09-23). Preço novo na renovação ou em contrato novo é outra coisa: é negociação, e o cliente
pode não aceitar. Se o último aumento foi há menos de doze meses e existe contrato com cláusula de
reajuste, dizer isso ao usuário e mandar conferir o contrato com advogado antes do disparo.

### Passo 3 — Calcular o prazo de aviso por comando

Prazo de aviso não se estima. "Uns trinta dias" costuma ser dezenove, e o disparo cai num
domingo em que não tem ninguém pra responder.

```bash
# reajuste com vigência em 01/03/2027 e ação do cliente até 20/02/2027
node scripts/comunicado.js prazo --vigencia 01/03/2027 --tipo reajuste --acao 20/02/2027

# anuidade de escola (educação infantil ao superior): 45 dias, e isso é lei
node scripts/comunicado.js prazo --vigencia 15/12/2026 --tipo escolar

# fechamento pra reforma, com feriado da cidade dentro da janela de aviso
node scripts/comunicado.js prazo --vigencia 05/10/2026 --tipo fechamento --feriado 30/09
```

Os tipos são `reajuste`, `escolar`, `contrato`, `regra`, `sistema`, `fechamento` e `desculpa`. O
script imprime de onde vem o mínimo de cada um, e só o `escolar` é prazo de lei. Ele vale pra
escola de educação infantil, fundamental, média ou superior, não pra curso livre de idioma ou de
capacitação. O resto é prática de mercado, e o script diz isso na saída. Pra um mínimo próprio,
`--minimo <dias>`, que o script recusa quando o número fica abaixo do mínimo legal do tipo, em vez
de calcular quieto um prazo que a lei não permite. Feriado de cidade entra em `--feriado DD/MM`, e
a opção se repete quando houver mais de um.

O que o comando devolve, e que entra no `disparo.md`:

- dias corridos e dias úteis entre hoje e a vigência
- a data de disparo: o primeiro dia útil a partir de hoje, porque aviso mandado com a loja fechada
  fica parado até alguém abrir
- o último dia em que o aviso ainda cumpre o mínimo, e quantos dias de folga existem até ele
- se o aviso **cabe**, e quanto adiar a vigência se não couber
- o prazo de ação de quem recebe, conferido contra o disparo e contra a vigência
- os três toques: aviso, lembrete do meio e véspera, todos em dia útil

Disparo e limite são duas datas diferentes, e trocar uma pela outra é o erro que o script existe
pra evitar. Quem manda no limite entrega o aviso junto com a fatura. Quando o prazo não cabe, a
conversa precisa acontecer antes de escrever qualquer peça: ou a vigência adia, ou o comunicado
assume por escrito que o aviso saiu curto. Escolher em silêncio é a pior das três.

### Passo 4 — Escrever o fato uma vez

Escrever `comunicacao/<AAAA-MM-DD>-<tema>/fato.json` antes de qualquer peça. É a fonte única:
toda peça é conferida contra ele, e valor que aparece numa peça e não está aqui é acusado como
fato solto. As datas dos campos `datas` são as que o comando devolveu.

```json
{
  "tema": "reajuste-mensalidade-2027",
  "desde": "01/03/2027",
  "muda": "A mensalidade do acompanhamento passa de R$ 790,00 para R$ 890,00, aumento de 12,66%.",
  "fazer": "Confirmar a renovação pelo link do contrato até 19/02/2027.",
  "se_nao": "Sem confirmação até 19/02/2027 o acompanhamento é encerrado em 01/03/2027 e a vaga vai pra fila.",
  "porque": "O aluguel da sala subiu 18% na renovação e o preço estava parado há quinze meses.",
  "quem_decidiu": "Ana, dona da clínica",
  "marcas": { "muda": "R$ 890,00", "fazer": "confirmar a renovação", "se_nao": "encerrado" },
  "numeros": { "valor novo": "R$ 890,00", "valor antigo": "R$ 790,00", "aumento": "12,66%" },
  "datas": { "vigência": "01/03/2027", "prazo de ação": "19/02/2027", "disparo": "29/01/2027" },
  "pecas": { "equipe.md": "todos", "clientes.md": "todos", "redes.md": "muda,desde", "faq.md": "todos" }
}
```

`marcas` é a frase curta que precisa aparecer **literalmente** em cada peça que carrega aquele
item. É o que impede a versão do cliente de sair sem a consequência, que é o erro mais comum.

### Passo 5 — Escrever as três versões

O mesmo fato, três leituras. Nunca o mesmo texto copiado nos três lugares: é assim que a equipe
descobre o reajuste pelo Instagram da própria empresa.

**`equipe.md`** — quem atende precisa responder sem gaguejar:

```markdown
# <Tema> — o que a equipe responde

Quem decidiu: <nome>. Quem assina o comunicado: <nome>. Vale a partir de <DD/MM/AAAA>.

## O fato, em quatro linhas
- O que muda: ...
- Desde quando: <DD/MM/AAAA>
- O que o cliente precisa fazer: ... até <DD/MM/AAAA>
- Se ele não fizer: ...

## Por que (pode contar)
[o motivo verdadeiro, na frase que pode ser dita em voz alta]

## As três reclamações prováveis, e a resposta
| O cliente diz | Você responde |
|---|---|

## O que você resolve sozinho, e o que sobe
| Situação | Quem resolve |
|---|---|
```

**`clientes.md`** — a mensagem que vai um-a-um, no canal dele, com as quatro respostas e nada
de lacuna. Duas variantes de temperatura, pro usuário escolher, como no `/pos-venda`. Formato de
WhatsApp se calibra pelo `/whatsapp`; e-mail em HTML pra lista sai pelo `/email`; cartaz pra
vitrine ou balcão sai pelo `/documento`. Esta skill escreve o texto e o fato, não reimplementa
formato.

```markdown
# Mensagem pro cliente

## Variante A — direta
[abertura sem rodeio, o que muda com número, a data, o que fazer, o prazo, a consequência,
o motivo em uma linha, e a porta aberta pra quem quiser falar]

## Variante B — mais pessoal
[o mesmo fato, começando pelo tempo de relação e pelo que continua igual]

## Quem recebe ligação ou mensagem pessoal antes
| Cliente | Por que | Quem liga | Quando |
|---|---|---|---|
```

**`redes.md`** — a versão pública, até 150 palavras, sem detalhe de contrato:

```markdown
# Post e story

[o fato em duas frases, a data em número, e o que fazer quem quiser entrar antes dela]

## Story (uma tela)
[uma frase e a data]
```

Se o negócio tem perfil no Google, o mesmo fato vira post de novidade por lá pelo
`/posts-perfil-google`, e horário especial de fechamento se atualiza no próprio perfil.

### Passo 6 — Montar a FAQ

Seis perguntas bastam, e o molde tem a lista das que sempre chegam. As duas que o comunicado
covarde omite são "e se eu não quiser?" e "consigo manter o combinado anterior, até quando?".
Responder "não" com clareza vale mais que desviar.

```markdown
# Perguntas que vão chegar

**<pergunta na palavra do cliente>**
[resposta curta, com número e data quando houver]
```

Pergunta sem resposta fechada entra como `[a confirmar]` **só** no `equipe.md` e no `faq.md`, com
quem confirma e até quando. Na versão do cliente e na de redes, nenhuma lacuna sai.

### Passo 7 — Montar o calendário de disparo

Equipe primeiro, depois quem é afetado, depois o público geral. Nunca ao mesmo tempo. Escrever
em `disparo.md`, na mesma pasta:

```markdown
# Disparo

Vigência: <DD/MM/AAAA> · aviso mínimo: <N> dias (<lei ou prática>) · calculado em <AAAA-MM-DD>

| Quando | Dia | Quem | Canal | Peça | Quem manda |
|---|---|---|---|---|---|
| <DD/MM/AAAA> | <dia> | equipe | reunião de 10 min | equipe.md | <nome> |
| <DD/MM/AAAA> | <dia> | clientes de contrato | ligação | clientes.md (variante B) | <nome> |
| <DD/MM/AAAA> | <dia> | base | WhatsApp ou e-mail | clientes.md (variante A) | <nome> |
| <DD/MM/AAAA> | <dia> | público | post e story | redes.md | <nome> |
| <DD/MM/AAAA> | <dia> | quem não fez a ação | lembrete curto | clientes.md | <nome> |
| <DD/MM/AAAA> | <dia> | quem não fez a ação | véspera, prazo no assunto | clientes.md | <nome> |

## Se der ruim
[as duas reações que forçam mudança de plano, e o que fazer em cada: cancelamento em série,
reclamação pública]
```

As datas da tabela são as que o `scripts/comunicado.js prazo` devolveu, copiadas sem edição. Dia
da semana vem do comando, não da cabeça.

### Passo 8 — Conferir por comando e entregar

Três comandos, sempre os três, com o resultado colado na conversa:

```bash
node scripts/comunicado.js conferir comunicacao/<AAAA-MM-DD>-<tema>
node scripts/verificar.js datas comunicacao/<AAAA-MM-DD>-<tema>/disparo.md
node scripts/verificar.js texto comunicacao/<AAAA-MM-DD>-<tema>/clientes.md
```

O `conferir` precisa terminar em "Tudo certo.". Ele acusa sete coisas, e cada uma é um erro que
chega ao cliente: checklist incompleta no `fato.json`, marca ausente numa peça, peça sem a data
em número, valor, porcentagem ou data que não está na fonte única, `[a confirmar]` em peça
pública, "em breve" onde o fato exige dia, e data de disparo que já passou. Linguagem que esconde
o fato ("informamos que", "haverá um ajuste") sai como aviso, não como erro: cabe ao usuário
decidir. Divergência se corrige no `fato.json` primeiro, depois nas peças, nunca só na peça.

A entrega na conversa é curta: o que muda em uma frase, a data de disparo com dia da semana, se
o aviso cabe no prazo, e as três perguntas mais difíceis da FAQ com a resposta. O resto fica na
pasta.

Por último, as datas viram lembrete. Seguir o formato do `/tarefas`, com a origem no item:

- `- [ ] Avisar a equipe do reajuste (reunião de 10 min) — 29/01/2027 (sex) (/comunicado)`
- `- [ ] Disparar o comunicado pra base — 29/01/2027 (sex) (/comunicado)`
- `- [ ] Lembrete pra quem não confirmou a renovação — 12/02/2027 (sex) (/comunicado)`
- `- [ ] Véspera: última chamada — 26/02/2027 (sex) (/comunicado)`

Se a mudança alterou o que se vende, o preço ou uma regra de atendimento, oferecer a atualização
de `_memoria/oferta.md` e `_memoria/empresa.md`, como pede o `CLAUDE.md`. Comunicado disparado que
não volta pra memória faz o sistema seguir escrevendo com o preço velho.

---

## Regras

- **Nunca escrever comunicado sem as quatro respostas.** O que muda, desde quando, o que a pessoa faz, o que acontece se não fizer. Faltando a 3 ou a 4, voltar e perguntar. Comunicado que só informa é o que produz a surpresa que ele deveria evitar
- **Data em número, sempre.** "A partir de 01/03/2027", nunca "a partir de março" nem "em breve". O script trata mês sem dia como erro na peça obrigada a dizer o dia
- **Número que o usuário não disse não existe.** Percentual, valor novo, data de volta da reforma e prazo de transição saem da boca dele ou do estudo do `/preco`. Nada de "aproximadamente 10%" pra preencher o rascunho: vai como `[a confirmar]` no `equipe.md`, com quem confirma, e o comunicado não dispara antes disso
- **Nenhum número entra na peça antes de entrar no `fato.json`.** Divergência entre cartaz, mensagem e post é silenciosa: ninguém relê as três, e o cliente fotografa as duas que discordam
- **O prazo saiu do comando.** `scripts/comunicado.js prazo` devolve o disparo no primeiro dia útil, o último dia em que o aviso ainda cumpre o mínimo e o prazo de ação. Data escrita na mão não entra no `disparo.md`, e o disparo nunca é marcado no limite: folga existe pra ser usada
- **Motivo verdadeiro ou nenhum.** "Reajuste anual" quando o último aumento foi há quinze meses desmonta na primeira pergunta. Se o motivo não pode ser dito, dizer menos, não dizer falso
- **Sujeito visível.** "Eu decidi", não "foi decidido". Comunicado sem dono soa como se a mudança tivesse acontecido sozinha, e é o que mais irrita quem paga
- **Equipe antes do cliente, cliente antes da rede.** Atendente que descobre a mudança pelo cliente responde insegura, e a insegurança do atendimento custa mais que o próprio aumento
- **Peça pública não sai com lacuna.** `[a confirmar]` vive no `equipe.md` e no `faq.md`, com responsável e prazo. Nunca no `clientes.md` nem no `redes.md`
- **O que o comunicado promete, obriga.** Informação precisa integra o contrato (CDC, art. 30 e 31). "O valor antigo vale até o fim do ano" escrito no post cria direito, então só escrever o que vai ser honrado
- **Mudança que afeta quem trabalha com você não é comunicado.** Horário, jornada, função e salário dependem de acordo individual e sem prejuízo ao empregado (CLT, art. 468). A skill escreve o aviso da reunião, não a decisão fechada
- **Não substitui advogado nem contador.** Reajuste em contrato assinado, encerramento de contrato com investimento da outra parte (Código Civil, art. 473), multa, cláusula de rescisão e demissão passam por profissional antes do disparo. A skill entrega o texto e a conta do prazo, não o respaldo jurídico
- **LGPD:** aviso sobre o serviço contratado é execução de contrato (Lei 13.709/2018, art. 7º, V); oferta nova depende de legítimo interesse ou consentimento (art. 7º, IX). Lista de contato, valor por cliente e nome de quem reclamou ficam no workspace, e quem pediu pra não receber não recebe. Lista de clientes não vai pra ferramenta externa sem autorização na mesma conversa
- **Desculpa individual não vira comunicado.** Falha que atingiu um cliente se resolve no um-a-um, pelo `/whatsapp` ou pelo `/email-profissional`. Nota pública sobre caso individual expõe a pessoa sem necessidade
- **Fronteira com as vizinhas:** o `/preco` decide o valor e o motivo do reajuste, e esta skill comunica; o `/whatsapp` e o `/email-profissional` são um-a-um; o `/email` é a newsletter e o HTML do disparo; o `/documento` faz o cartaz; o `/cobranca` fala com devedor; o incidente técnico é `templates/backend/incidente.md`, pelo `/backend`; o `/procedimento` guarda a regra nova depois que ela passa a valer; o `/responder-avaliacoes` cuida do que vier em público. Esta skill é o aviso e o disparo, nada além
- **Quando a reação for ruim, dizer o resultado.** Se cancelaram, quantos cancelaram e quanto isso pesa em reais. O `/caixa` do mês seguinte mostra o efeito real do reajuste, e é lá que a decisão se confirma ou se refaz
