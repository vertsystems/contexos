---
name: relatorio-cliente
description: >
  Fecha o mês de um cliente de agência ou freelancer num relatório que o dono lê em dois
  minutos: os números do mês contra o anterior (calculados por script, cada um com o
  arquivo de origem), as cinco frases em português de dono (o que foi feito, o que mudou,
  por quê, o que vem, o que precisa de você), as peças produzidas anexadas, a lista do que
  ele precisa aprovar e o e-mail de envio. Sai em HTML e PDF com a marca do cliente e a
  da agência. O que não foi medido sai escrito "não medido", nunca estimado.
  Use quando o usuário disser "relatório do cliente", "fechar o mês do cliente X", "preciso
  mandar o relatório mensal", "o cliente quer saber o que a gente fez", "como foi o mês da
  padaria", "relatório de resultados pro cliente", "prestação de contas do mês", "o que eu
  mostro pro cliente", "relatório pra segurar o contrato", ou /relatorio-cliente.
---

# /relatorio-cliente — O mês do cliente em uma página

> **Convenção de pastas:** a saída vai em `clientes/<Nome>/relatorios/` na convenção **por cliente** (agência e freelancer, que é onde esta skill mora). Na convenção **por tipo**, quem atende um cliente avulso usa `relatorios/<slug-do-cliente>/`. A pasta nasce no primeiro relatório, junto com o `numeros-<AAAA-MM>.json` do mês.

O relatório mensal é a entrega que mais consome hora de agência pequena e a que mais
segura contrato. Quase sempre é feito na madrugada do dia 2, copiando número de tela,
com variação calculada de cabeça e uma peça esquecida porque ninguém lembrou. O cliente
percebe os três defeitos antes de perceber o resultado. Aqui o número vem de arquivo, a
variação vem de comando e a lista de peças vem da pasta do cliente. O que sobra pra
escrever são cinco frases, e é nelas que vale gastar o tempo.

## Dependências

- **Contexto:** `_memoria/empresa.md` — nome da agência, o que ela entrega, como fala com cliente
- **Tom:** `_memoria/preferencias.md` — o relatório e o e-mail saem na voz do usuário, não na de um redator de agência
- **O cliente:** `clientes/<Nome>/briefing.md` — o que foi contratado, o que o cliente chama de resultado, se ele entende sigla ou não
- **Marca dupla:** `identidade/tokens.css` e `identidade/logo.*` (da agência); `clientes/<Nome>/identidade/tokens.css` e `logo.*` (do cliente). Sem tokens, o script usa cor padrão e o nome em texto
- **Fontes dos números:** `clientes/<Nome>/campanhas/relatorios/*.md` (`/relatorio-ads`), `clientes/<Nome>/medicao/leitura-<AAAA-MM>.md` (`/medir`), `clientes/<Nome>/financeiro/fechamento-<AAAA-MM>.md` (`/caixa` rodado pro cliente) e prints salvos em `clientes/<Nome>/dados/`
- **Molde de método:** `templates/crescimento/relatorio-cliente.md` — as cinco frases, o contrato do JSON, as métricas conhecidas, o checklist
- **Molde visual:** `templates/crescimento/relatorio-cliente.html` — HTML print-first com marca dupla; o script preenche
- **Script:** `scripts/relatorio-cliente.js` — `coletar`, `validar`, `comparar`, `html`
- **PDF:** `scripts/gerar-pdf.js`
- **Conferência:** `node scripts/verificar.js html` e `texto`
- **Saída:** `clientes/<Nome>/relatorios/numeros-<AAAA-MM>.json`, `relatorio-<AAAA-MM>.html`, `relatorio-<AAAA-MM>.pdf` e `email-<AAAA-MM>.md`

---

## Workflow

### Passo 1 — Descobrir de quem e de quando

Duas coisas, e só as duas. Se o usuário disse "fecha agosto da padaria", não perguntar nada.

1. "De qual cliente?" Conferir que `clientes/<Nome>/` existe; se não existe, o `/novo-projeto` cria a pasta antes, porque relatório sem pasta não tem de onde tirar peça
2. "De qual mês?" Padrão: o mês que acabou de fechar. Relatório do mês corrente só se ele pedir, e aí o arquivo diz "parcial até <data>"

Ler `clientes/<Nome>/briefing.md` antes de seguir. É lá que está o que o cliente chama de
resultado (contato, venda, agendamento) e se ele fala em CPL ou em "quanto custou cada
pessoa". O relatório usa a palavra dele.

### Passo 2 — Coletar o que já existe em arquivo

```bash
node scripts/relatorio-cliente.js coletar "clientes/<Nome>" --mes 2026-08
```

O script cria `relatorios/numeros-2026-08.json` com o que dá pra puxar sem ninguém digitar:

- **Investimento e contatos** somados do frontmatter dos relatórios semanais do `/relatorio-ads` cujo `periodo_fim` cai no mês, com o custo por contato calculado quando tem os dois
- **As peças produzidas**: todo arquivo ou pasta da pasta do cliente com data do mês no nome (`carrossel-paes-2026-08-12/`, `landing-promocao-2026-08-20.html`), ou modificado no mês quando não tem data no nome. Cada uma entra com caminho, data, quantidade de arquivos e a primeira imagem como miniatura
- O resto das métricas fica `null`, que o relatório escreve como "não medido"

Duas leituras que o script faz e que só o assistente sabe conferir:

- A conversão do `/relatorio-ads` entra como **contato recebido**. Se pra esse cliente a
  conversão configurada é compra, mover o valor pra `vendas` e o custo de `cpl` pra `cpa`
  antes de gerar o relatório. O script avisa isso na saída do `coletar`
- Arquivo **sem data no nome** entra pela data de modificação, e data de modificação
  mente: um arquivo reaberto no dia 12 vira "produzido em agosto". O script já descarta
  os de trabalho interno (`briefing.md`, `notas.md`, `indice.md`, `tarefas.md`,
  `contrato.md`, `proposta.md`), mas o resto passa e precisa de olho

Se o arquivo do mês já existe, o script para e avisa; `--forcar` recomeça do zero e o
que foi preenchido à mão se perde. Ler o que saiu e conferir que a lista de peças bate
com o que foi feito: peça produzida fora da pasta do cliente (num Canva, num e-mail) não
aparece, e precisa ser acrescentada à mão no JSON, com o arquivo salvo na pasta.

### Passo 3 — Preencher o que falta, sempre com fonte

Abrir o JSON e completar métrica por métrica, lendo o arquivo de origem. O assistente
lê PDF, print e planilha direto; o que ele extrair entra com o caminho do arquivo em
`fonte`. As fontes mais comuns:

| Métrica | Onde ler | Como tirar o número |
|---|---|---|
| Visitas e conversas | `medicao/leitura-2026-08.md` do cliente | a tabela "Visitas que agiram", já somada pelo `/medir` |
| Vendas e receita | `financeiro/fechamento-2026-08.md` do cliente, ou a planilha dele em `dados/` | `awk` na coluna, nunca de cabeça: `awk -F';' 'NR>1 {s+=$5} END {print s}' clientes/<Nome>/dados/vendas-2026-08.csv` |
| Seguidores, nota, avaliações | print salvo em `clientes/<Nome>/dados/instagram-2026-08-31.png` | o assistente lê a imagem e anota o valor com o caminho do print |
| Posts publicados | `clientes/<Nome>/conteudo/indice.md` | `grep -c "2026-08" clientes/<Nome>/conteudo/indice.md` |

O que o usuário sabe de cabeça ("acho que fechou umas 15 encomendas") não entra. Duas
saídas: ele salva a fonte em `dados/` (print, export, mensagem do cliente) e o número
entra com ela; ou fica `null` e o relatório diz "não medido", com o pedido do dado na
seção "precisa de você". A segunda saída é a mais comum no primeiro mês, e é a que faz o
cliente mandar o número no mês seguinte.

Métrica que não está na lista do script (visitas numa página específica, agendamentos,
orçamentos enviados) entra com `rotulo`, `unidade` e `melhor`, como o molde mostra. E
métrica conhecida aceita apelido: se a padaria chama contato de "encomenda", basta pôr
`"rotulo": "Encomendas pelo WhatsApp"` em `leads` e a tabela inteira passa a dizer isso.

Cada peça em `entregas` recebe um `estado`: `publicado`, `aguardando aprovação` ou
`em produção`. É esse campo que alimenta a lista de aprovação.

Depois de preencher:

```bash
node scripts/relatorio-cliente.js validar "clientes/<Nome>" --mes 2026-08
```

Número sem fonte, valor entre aspas, mês trocado, aprovação sem prazo e prazo inexistente
(31/02) são erro, e o script não segue enquanto houver um. Sai como aviso, e o assistente
decide: prazo que cai em sábado ou feriado (com o próximo dia útil já calculado), peça sem
estado, texto em branco e mais de três itens de aprovação.

### Passo 4 — Comparar por comando

```bash
node scripts/relatorio-cliente.js comparar "clientes/<Nome>" --mes 2026-08 --md
```

Sai a tabela do mês contra o anterior, lendo `numeros-2026-07.json` se existir. A regra
de cada célula está no molde: "não medido" quando este mês é `null`, "sem base" quando
não há mês anterior, "de zero" quando o anterior era zero (não existe porcentagem sobre
zero), e a variação com sinal e porcentagem no resto. Custo que cai sai como melhora;
investimento que muda sai como mudança, sem juízo.

Métrica que foi medida no mês passado e ficou sem dado agora continua na tabela, como
"não medido". É proposital: número que some da tabela é a forma mais silenciosa de
esconder mês ruim. Quem está no JSON mas nunca teve valor em nenhum dos dois meses fica
fora do relatório, e `--tudo` mostra essas no terminal.

Nenhum número desse relatório é digitado pelo assistente. Se a tabela mostra +29,0%, a
frase diz +29,0%. Se a conta parecer errada, o problema está no JSON ou no arquivo de
origem: refazer de lá, nunca ajustar a frase.

Primeiro mês do cliente: tudo sai "sem base", e isso é o certo. O texto diz que a
comparação começa no mês que vem. Não inventar "mês anterior" a partir de conversa.

### Passo 5 — Escrever as cinco frases

Agora o trabalho que só gente faz. Ler a tabela, as peças e o briefing, e escrever no
campo `texto` do JSON, em português de dono, uma a três linhas por campo:

| Campo | O que responde | Exemplo |
|---|---|---|
| `feito` | "Vocês trabalharam?" | "Rodamos duas semanas de anúncio da promoção de pães, publicamos oito posts e deixamos a página da promoção pronta." |
| `mudou` | "Deu resultado?" | "Chegaram 40 contatos no WhatsApp, contra 31 em julho, e cada contato custou R$ 30,00 em vez de R$ 35,48." |
| `porque` | "Foi vocês ou foi sorte?" | "A queda no custo coincide com a troca da arte pela foto do balcão na segunda quinzena. Setembro mantém a foto pra confirmar." |
| `vem` | "E agora?" | "Página da promoção no ar (depende da sua aprovação) e mais duas semanas de anúncio com a foto que funcionou." |
| `precisa_de_voce` | "O que eu tenho que fazer?" | "Aprovar a página até 04/09 e me mandar quantas encomendas fecharam em agosto, pra eu parar de escrever 'não medido' em vendas." |

Três regras de escrita, tiradas do molde:

- **Só número que está na tabela.** A frase "o que mudou" repete a tabela; não traz número novo
- **"Por quê" é hipótese quando é hipótese.** "Coincide com", "a causa mais provável é". Certeza só com teste (`/teste-ab`)
- **Mês ruim se escreve com o número.** Contato caiu de 40 pra 22: a frase diz isso, e "por quê" diz a causa provável e o que muda. Relatório que só mostra o que subiu é o primeiro que o cliente para de ler

Sigla (CPL, CTR) só se o briefing diz que o cliente usa. Senão, "custo por contato".

Preencher também `aprovacoes` (item, prazo em dia útil, caminho do arquivo quando é
peça) e `proximo_mes` (três a cinco ações, com o que depende do cliente marcado). No
máximo três itens de aprovação; o quarto vai pra reunião (`/reuniao`). O `validar`
confere o prazo contra o calendário de feriados do `br.js` e sugere o próximo dia útil
quando alguém marcou sábado.

### Passo 6 — Montar o HTML e o PDF

```bash
node scripts/relatorio-cliente.js html "clientes/<Nome>" --mes 2026-08
node scripts/verificar.js html "clientes/<Nome>/relatorios/relatorio-2026-08.html"
node scripts/gerar-pdf.js "clientes/<Nome>/relatorios/relatorio-2026-08.html"
```

O script preenche `templates/crescimento/relatorio-cliente.html`: a cor do cliente vem
do `--accent` do `tokens.css` dele e manda na capa e nos títulos; a da agência vem do
`tokens.css` da raiz e entra no filete e no rodapé. Logo vira imagem embutida (o HTML
anda sozinho, sem pasta de imagens); sem logo, entra o nome em texto. As miniaturas das
peças também vão embutidas, pra que o PDF carregue o carrossel do mês sem anexo à parte.

O script também grava `email-2026-08.md`: assunto com o número de itens pra aprovar, as
cinco frases, os quatro números que mais pesam e a lista de aprovação em caixa de marcar.

Abrir o PDF antes de entregar. Conferir: as duas marcas na capa, a tabela inteira numa
página, miniatura da peça aparecendo, e nenhum "[preencher]" em vermelho (é o que o
script escreve quando um campo de texto ficou vazio).

Rodar `node scripts/verificar.js texto` no `email-2026-08.md`. Cara de máquina no
e-mail mensal é o que faz o cliente sentir que virou número; o `/humanizar` conserta.

### Passo 7 — Entregar e fechar o ciclo

A entrega na conversa é curta: as cinco frases, os caminhos do PDF e do e-mail, e a
lista de aprovação com prazo e dia da semana. O usuário revisa o nome de quem recebe e a
assinatura, e envia. A skill não envia nada.

O que vai pra `tarefas.md` (`/tarefas`), com origem:

- Um item por aprovação pendente, em "Esperando resposta": `- [ ] Padaria: aprovar página da promoção — até 04/09/2026 (sex) (/relatorio-cliente)`
- Um item em "Depois" pro próximo relatório: `- [ ] Relatório de setembro da Padaria — coletar a partir de 01/10/2026 (/relatorio-cliente)`
- Um item por dado que ficou "não medido" e que o cliente pode fornecer, pra cobrar na próxima conversa

Se o mês teve um resultado com antes e depois e fonte, é matéria-prima do `/case`; dizer
isso uma vez. Se o cliente pediu reunião de fechamento, o `/briefing-reuniao` monta a
pauta a partir deste relatório.

O arquivo de saída, por dentro:

```markdown
# (o relatório é HTML/PDF; o que fica em markdown é o e-mail)

# E-mail de envio — <Cliente> — <mês>

**Assunto:** <Cliente>: relatório de <mês> e <N> itens pra você aprovar
**Anexo:** relatorio-<AAAA-MM>.pdf

Oi, [nome de quem recebe],

Segue o relatório de <mês>. O resumo, em cinco linhas:

**O que foi feito:** ...
**O que mudou:** ...
**Por quê:** ...
**O que vem em <mês seguinte>:** ...
**O que precisa de você:** ...

Os números que mais pesam:
- Contatos recebidos: 40 (+9, +29,0%)
- Custo por contato: R$ 30,00 (−R$ 5,48, −15,4%)

Pra eu seguir sem travar, preciso do seu ok em:
- [ ] Página da promoção — até 04/09/2026 (sex)

[assinatura]
```

---

## Regras

- **Todo número vem de arquivo, nunca da conversa.** O JSON exige `fonte` em cada valor, e o `validar` recusa número sem ela. "O cliente me disse" vira arquivo em `dados/` ou vira "não medido". É a regra que torna o relatório defensável quando o cliente abre o Gerenciador e compara
- **"Não medido" não é zero, e não se esconde.** Contato, venda e receita aparecem sempre, mesmo vazios. A linha vazia é o que faz o cliente mandar o dado no mês seguinte
- **Variação sai do script.** Nenhuma porcentagem é calculada de cabeça nem digitada na frase. Se a tabela e a frase divergem, a frase está errada
- **Comparar mês com mês.** Semana do `/relatorio-ads` que atravessa a virada entra pelo `periodo_fim`; o texto avisa em uma linha quando isso desloca o número, em vez de ajustar na mão
- **Cinco frases, na ordem, em português de dono.** Feito, mudou, por quê, vem, precisa de você. Sem adjetivo no lugar de número, sem sigla que o briefing não autorizou, sem promessa de resultado em "o que vem"
- **Mês ruim se escreve.** Suavizar queda é o que faz o cliente descobrir sozinho e cancelar sem avisar. O número, a causa provável e o que muda
- **Marca do cliente manda, marca da agência assina.** Cor e logo do cliente na capa; a agência no filete e no rodapé. Sem `tokens.css` do cliente, rodar o `/design-system` na pasta dele ou aceitar a cor padrão, mas nunca desenhar cor na mão
- **Aprovação tem prazo em dia útil e caminho.** No máximo três. Item sem prazo não é pedido, é desejo
- **Enviar é ação do usuário.** A skill escreve o e-mail e para. Confirmação explícita antes de qualquer disparo, e o disparo é dele
- **Fronteira com as vizinhas:** o `/relatorio-ads` é semanal, só mídia paga, e é uma das fontes daqui; o `/medir` lê canal e alimenta visitas e conversas; o `/caixa` rodado na pasta do cliente alimenta venda e receita; o `/revisao-semanal` é o ritual interno da agência, e não vai pro cliente; o `/case` pega o resultado daqui quando ele tem antes, depois e fonte; o `/cobranca` cuida de boleto atrasado, que não entra neste relatório; o `/email-profissional` serve pra e-mail avulso, mas o de envio do relatório já sai pronto daqui
- **LGPD:** o cliente da agência recebe contagem, não lista. Nome, telefone e CPF de cliente final não entram no relatório nem no JSON. Planilha de vendas e export de plataforma ficam em `clientes/<Nome>/dados/`, fora do git, e não vão pra ferramenta externa sem autorização do dono do dado. Quando a agência trata a base de contatos do cliente, quem decide o uso é o cliente e quem executa é a agência: a lei chama isso de controlador e operador (Lei 13.709/2018, art. 5º, VI e VII, https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm, conferido em 23/09/2026). Na prática, o relatório mostra quantos, nunca quem
- **Isso aqui não é parecer jurídico nem contábil.** A skill organiza número e prova de origem; enquadramento de contrato, de dado pessoal e de imposto é com o advogado e o contador do cliente
- **Dado de um cliente não vaza pra outro.** Cada relatório lê só a pasta do cliente dele. Comparação entre clientes é conversa interna da agência, nunca peça enviada
- **Não é auditoria nem parecer.** O relatório mostra o que foi medido e de onde. Atribuição de venda a canal é a regra da ferramenta que mediu, e o texto diz qual foi; quando o cliente precisa de número pra decisão contábil ou jurídica, isso passa pelo contador ou advogado dele
