---
name: ordem-servico
description: >
  Monta a ordem de serviço do atendimento técnico (assistência, oficina, refrigeração,
  elétrica, informática): equipamento com marca, modelo e série, estado na entrada com foto,
  defeito relatado separado do diagnóstico, orçamento discriminado com validade e aprovação
  por escrito, prazo, garantia e assinatura na entrada e na saída. Numera em sequência,
  soma por comando e controla o status de cada OS num índice.
  Use quando o usuário disser "preciso de uma ordem de serviço", "modelo de OS", "o cliente
  trouxe o aparelho", "como faço orçamento de conserto", "ele disse que eu risquei o
  aparelho", "não autorizei esse serviço", "quanto tempo vale meu orçamento", "quais OS
  estão abertas", "o cliente sumiu e o aparelho tá aqui", "quero um bloco pra preencher no
  balcão", ou /ordem-servico.
---

# /ordem-servico — A OS do atendimento técnico

> **Convenção de pastas:** a saída vai em `os/`. Na convenção **por cliente**, as OS daquele cliente vão em `clientes/<Nome>/os/`, e o índice continua um só, na raiz (`os/indice.csv`), porque a numeração é do negócio inteiro. A pasta nasce na primeira OS.

Quem conserta coisa dos outros vive três discussões, e elas se repetem com as mesmas
palavras: "esse arranhão não era meu", "eu não autorizei isso", "o orçamento era outro".
Nenhuma se ganha na memória. Todas se evitam numa folha preenchida na frente do cliente, com
duas fotos e uma assinatura, antes de o aparelho ir pra bancada.

> **Isto não é assessoria jurídica.** A skill monta o documento do atendimento na estrutura
> que o Código de Defesa do Consumidor exige de quem presta serviço. Equipamento danificado
> no conserto, cobrança judicial, retenção de aparelho por dívida e acidente pedem advogado.

## Dependências

- **Contexto:** `_memoria/empresa.md` — razão social, CNPJ, endereço, telefone, quem atende, que tipo de serviço a casa faz
- **Tom:** `_memoria/preferencias.md` — a mensagem de aprovação vai no WhatsApp e precisa soar como o usuário
- **Preço praticado:** `_memoria/oferta.md` e o estudo do `/preco`, quando existirem — valor da hora, taxa de visita, margem sobre peça
- **Identidade:** `identidade/tokens.css` se existir, senão `identidade/design-guide.md`
- **Referência:** `templates/juridico/ordem-de-servico.md` — os 14 campos, o que cada artigo do CDC exige, os cinco erros que tiram dinheiro do caixa, o vocabulário de status e o que responder quando o cliente contesta
- **Script:** `scripts/ordem-servico.js` — numeração, validade, prazo em dia útil, somas, margem, índice e folha em branco
- **Conferência:** `node scripts/verificar.js html`, `tabela` e `datas`
- **Saída:** `os/OS-<AAAA-NNNN>.html` (pra imprimir e assinar), `os/OS-<AAAA-NNNN>.md` (origem do `.docx`), `os/OS-<AAAA-NNNN>-aprovacao.md` (a mensagem do orçamento) e `os/indice.csv` (numeração e status)

---

## Workflow

### Passo 1 — Entender qual dos cinco pedidos é

Cinco entradas, caminhos diferentes. Se não estiver claro pelo que o usuário disse, perguntar
uma coisa só: "é uma OS nova, ou mexer numa que já existe?".

| O usuário quer | Vai pro |
|---|---|
| Abrir uma OS de um atendimento que está acontecendo | Passo 2 |
| Fechar uma OS: serviço feito, aparelho entregue | Passo 7 |
| Mudar o status (peça chegou, cliente aprovou, desistiu) | Passo 8 |
| Ver a fila: o que está parado, vencido ou atrasado | Passo 8 |
| Imprimir bloco em branco pro balcão | Passo 9 |

Na primeira vez, antes de qualquer coisa, oferecer o bloco impresso do Passo 9. Ninguém abre
o computador com o cliente esperando no balcão, e a OS que nasce num papel de pão não tem
número, não tem foto e não tem assinatura.

### Passo 2 — Levantar o atendimento

Levantamento é uma mensagem só, não uma pergunta por vez. O que já estiver em
`_memoria/empresa.md` não se pergunta. Pedir assim:

> Me conta o atendimento, na ordem em que aconteceu:
> 1. Quem é o cliente? (nome, CPF ou CNPJ, telefone com DDD, endereço)
> 2. Que equipamento é? (o que é, marca, modelo, número de série)
> 3. O que veio junto? (cabo, controle, bandeja, bateria, carregador)
> 4. Como ele chegou? (arranhão, amassado, tela trincada, pintura) e manda as fotos da entrada
> 5. O que o cliente falou, nas palavras dele?
> 6. O que você encontrou quando olhou?
> 7. O que vai ser feito, quanto de mão de obra, que peças e quanto custou cada uma pra você
> 8. Cobra deslocamento? Quanto?
> 9. Até quando você consegue entregar?
> 10. Garantia de quantos dias, e sobre o quê exatamente?

O item 7 tem duas partes, e a segunda é a que ninguém anota: **o custo da peça**. Sem ele a
skill não inventa margem, e o campo sai em branco. Com ele, o usuário descobre no fim do mês
se o serviço de R$ 525 deixou R$ 442 ou R$ 80.

O item 10 costuma vir vago ("uns três meses"). Insistir por escopo: garantia sobre a peça
trocada e a mão de obra desta OS, com as exclusões escritas, é diferente de garantia sobre o
aparelho inteiro. A tabela de erros em `templates/juridico/ordem-de-servico.md` mostra o que
essa diferença custa.

### Passo 3 — Ler as fotos e escrever o estado na entrada

Se o usuário mandou as fotos, abrir cada uma com a ferramenta Read e escrever a descrição do
que aparece: onde está o amassado, de que lado, quanto mede mais ou menos, o que já estava
solto ou trincado. Devolver a lista pro usuário confirmar antes de entrar na OS, porque quem
viu o aparelho é ele.

Se não mandou, pedir duas: uma da frente e uma do lado que tem marca. Foto de entrada é o
único campo da OS que o cliente não consegue contestar depois, e é o erro mais caro da lista
quando falta. As fotos ficam em `dados/fotos/`, e o caminho de cada uma entra na OS.

Sem número de série visível, escrever isso na letra: "sem número de série visível". Campo
vazio parece esquecimento; frase escrita é registro.

### Passo 4 — Montar o JSON do atendimento

O modelo sai por comando, já preenchido de exemplo, e serve de mapa dos campos:

```bash
node scripts/ordem-servico.js exemplo --saida os/os-<cliente>-<AAAA-MM-DD>.json
```

Trocar os dados pelos do atendimento. O campo `numero` fica vazio: quem numera é o script,
lendo o índice, e é assim que duas OS nunca saem com o mesmo número. O `status` de OS nova é
`aguardando aprovação` quando o orçamento já foi feito, ou `aberta` quando o aparelho entrou
e ainda não houve diagnóstico.

Conferir antes de gerar:

```bash
node scripts/ordem-servico.js conferir os/os-<cliente>-<AAAA-MM-DD>.json
```

A conferência separa duas coisas. O que impede a OS de sair (campo obrigatório vazio, CPF ou
CNPJ que não passa no dígito verificador, data que não existe, status `em execução` sem
aprovação registrada) e o que apenas enfraquece (foto faltando, peça sem custo, garantia sem
exclusão). Resolver os primeiros; decidir sobre os segundos com o usuário.

### Passo 5 — Gerar a OS

```bash
node scripts/ordem-servico.js gerar os/os-<cliente>-<AAAA-MM-DD>.json --tokens identidade/tokens.css
```

O comando numera em `AAAA-NNNN` reiniciando a cada ano, soma mão de obra, peças e
deslocamento, calcula a validade do orçamento, o prazo em dia útil e a garantia, grava os
três arquivos e escreve a linha no `os/indice.csv`. O número volta pro JSON, pra que uma
segunda rodada não emita OS duplicada.

Três contas que o script faz e que o assistente **não** refaz de cabeça:

- **Validade** — dez dias corridos do recebimento pelo cliente, excluído o dia do começo; caindo em dia sem expediente, prorroga. Recebido em 10/11/2026, o décimo dia é 20/11, que é feriado nacional, e a validade vira 23/11
- **Prazo** — dias úteis a partir da abertura, com feriado nacional na conta. Quatro dias úteis de 22/09/2026 dão 28/09, não 26/09
- **Margem** — só quando **toda** peça tem custo informado. Uma peça sem custo deixa o campo em branco e o script diz qual foi

Feriado da cidade entra na conta com `--feriado DD/MM`, repetindo a opção pra cada um. O
script já sabe os nacionais; o aniversário da cidade e o padroeiro só ele sabe, e é exatamente
o dia em que a oficina está fechada e o prazo escorrega.

Conferir o que saiu, e colar o resultado na conversa:

```bash
node scripts/verificar.js html os/OS-<numero>.html
node scripts/verificar.js tabela os/OS-<numero>.md
node scripts/verificar.js datas os/OS-<numero>.md
```

Os três precisam terminar em "Tudo certo.". Se a soma divergir, refazer a partir do valor
bruto de cada item, nunca ajustar o total pra bater.

### Passo 6 — Mandar o orçamento e esperar o "aprovo"

O arquivo `OS-<numero>-aprovacao.md` traz a mensagem pronta pro WhatsApp, com os blocos
separados, o prazo, a garantia e a data de validade. Ajustar o tom pelo `/whatsapp` e mandar.

Nada é executado antes da resposta por escrito. Executar serviço sem autorização expressa é
prática abusiva pelo art. 39, VI do CDC, e na prática significa um cliente que pode se
recusar a pagar com razão. O print da resposta vai pra `dados/`, ao lado da OS.

Chegando o "aprovo", preencher `aprovacao` no JSON (data, meio, quem aprovou), mudar o
`status` pra `em execução` e gerar de novo com `--sobrescrever`. A OS agora prova as duas
pontas: o que foi oferecido e o que foi aceito.

O JSON é a fonte da verdade, e o índice segue ele. Se o status no índice estiver diferente do
status no JSON, o script avisa qual era qual antes de regravar: é o aviso que aparece quando
alguém mudou a fila pelo comando `status` e esqueceu de voltar no JSON. A nota escrita pelo
`status --nota` sobrevive à regravação; o status, não.

Se apareceu serviço novo no meio do conserto, para e refaz o orçamento. Valor aprovado só
muda por nova negociação (art. 40, § 2º), e serviço de terceiro que não estava na lista não
é cobrado do cliente (§ 3º).

### Passo 7 — Fechar a OS

No fechamento, quatro campos e nenhum a menos:

1. `servico_executado`: o que foi feito de fato, que é o que a garantia vai cobrir
2. `saida.data`: a data da entrega, de onde contam a garantia e o prazo do art. 26
3. `saida.retirado_por` e `saida.documento`: quem assinou a retirada
4. `status`: `concluída`

Gerar de novo com `--sobrescrever`, imprimir e colher a segunda assinatura. OS assinada só na
entrada não prova que o aparelho saiu funcionando, e é aí que nasce o retorno de garantia que
não era garantia.

O arquivo de saída fica assim:

```markdown
# Ordem de serviço <AAAA-NNNN> — <nome do negócio>

**Abertura:** <data> (<dia>) · **Tipo:** <corretiva|preventiva|instalacao|garantia|retrabalho> · **Status:** <status>
**Prazo combinado:** <data> — <N> dias úteis da abertura
**Atendeu:** <nome> · **Contato:** <telefone> · **CNPJ/CPF:** <documento>

## Cliente
| Campo | Conteúdo |
|---|---|
| Nome | ... |
| CPF ou CNPJ | ... |

## Equipamento
[descrição, marca, modelo, número de série, acessórios recebidos]

## Estado na entrada
[o que o cliente conferiu, as avarias em lista e o caminho das fotos]

## Defeito relatado pelo cliente
[entre aspas, na palavra dele]

## Diagnóstico técnico
[o que o técnico encontrou]

## Orçamento
| Item | O que é | Qtd | Preço unit. | Total |
|---|---|---|---|---|
| **Subtotal** | | | | R$ ... |

| Bloco | Valor |
|---|---|
| Mão de obra | R$ ... |
| Peças | R$ ... |
| Deslocamento | R$ ... |
| Desconto | -R$ ... |
| Total | R$ ... |

**Validade do orçamento:** <data> — 10 dias corridos do recebimento em <data>.
**Pagamento:** ...
Aprovado em: ____ · Por: ____ · Meio: ____

## Serviço executado
## Garantia
## Assinatura na entrada
## Assinatura na saída
```

O `.html` é a via que se imprime e se assina; o `.md` é o que vira `.docx` por
`node scripts/gerar-docx.js os/OS-<numero>.md` quando alguém quiser editar no Word.

### Passo 8 — Cuidar da fila

Status desatualizado é o quinto erro da lista, e o mais silencioso: a OS fica em "aguardando
peça" dois meses, o cliente esquece, a peça chega e ninguém avisa.

```bash
node scripts/ordem-servico.js status 2026-0007 "aguardando peça" --nota "capacitor pedido, chega dia 25"
node scripts/ordem-servico.js resumo
```

O `resumo` devolve a contagem por status e três listas que pedem ação: orçamento vencido
esperando aprovação, prazo estourado e OS sem atualização há uma semana ou mais. Levar cada
uma pra `tarefas.md` no formato do `/tarefas`, com a origem: `- [ ] OS 2026-0007 (Padaria
Pão da Serra): peça chegou dia 25, remarcar — 25/09/2026 (/ordem-servico)`.

Orçamento vencido não se executa pelo valor velho. Refazer com o preço de hoje e mandar de
novo, explicando em uma linha que o prazo de dez dias passou.

### Passo 9 — O bloco impresso do balcão

```bash
node scripts/ordem-servico.js branco --negocio "<nome do negócio>" --tokens identidade/tokens.css
```

Sai `os/em-branco.html` com os mesmos campos, linhas pra preencher à mão e as duas
assinaturas. Imprimir duas vias por atendimento, uma pra cada parte. A folha preenchida no
balcão vira JSON no fim do dia, com o número que o script atribui na hora de lançar.

Vale dizer isso ao usuário uma vez: o índice serve pro controle; o papel serve pro momento em
que o cliente está na frente, e é ele que resolve a discussão de amanhã.

---

## Regras

- **Nada é executado sem aprovação por escrito.** O script recusa OS em `em execução` ou `concluída` sem `aprovacao.data` e `aprovacao.meio`, porque executar serviço sem autorização expressa é prática abusiva (CDC, art. 39, VI). Contrato de manutenção que já roda é a exceção da própria lei, e mesmo aí cada visita abre uma OS
- **O orçamento é discriminado, sempre.** Mão de obra, peças e deslocamento em linhas separadas, com condição de pagamento e datas de começo e fim (art. 40). "R$ 500 total" não é orçamento e não se defende em lugar nenhum
- **Validade de dez dias é padrão, não teto.** Dá pra combinar outro prazo, desde que escrito na OS (art. 40, § 1º). O que não dá é honrar preço vencido sem refazer a conta
- **Foto na entrada não é opcional.** Duas fotos tiradas na frente do cliente, com o caminho do arquivo na OS. Sem elas, "já chegou riscado" não tem resposta, e o ônus é de quem recebeu o aparelho
- **O relato do cliente fica separado do diagnóstico.** Um é o que ele disse, entre aspas; o outro é o que o técnico encontrou. Misturar os dois é como se cobra por um serviço que ninguém explicou
- **Garantia entra com escopo e exclusões escritos.** "90 dias" sozinho é entendido como o aparelho todo. A garantia da casa soma-se à legal, que existe por lei e não depende do termo (art. 24 e 50)
- **Toda conta sai do comando.** Soma, validade, prazo em dia útil e garantia vêm do `scripts/ordem-servico.js` e passam pelo `verificar.js`. Número editado na mão que quebrar a conferência é regerado, não corrigido
- **Nada na OS é inventado.** Marca, modelo, número de série, acessório, relato do cliente e diagnóstico vêm do usuário ou da foto que ele mandou. O que ele não souber entra escrito como não sabido ("sem número de série visível", "diagnóstico a confirmar depois da avaliação"), nunca preenchido por dedução. Campo chutado em documento assinado é o pior tipo de erro: o cliente assina embaixo dele
- **Margem só com custo informado.** Sem o custo da peça o campo fica vazio, e a skill diz isso em vez de estimar. Margem chutada é pior que margem nenhuma, porque vira decisão de preço
- **Numeração é sagrada.** Sequencial por ano, sem buraco e sem repetição. O script recusa regravar número que já está no índice, e só passa com `--sobrescrever`
- **Dado de cliente é dado pessoal.** CPF, endereço, telefone e foto de equipamento ficam em `os/` e `dados/`, não vão pra ferramenta externa sem o usuário autorizar, e a OS de um cliente não vira exemplo pra outro (LGPD). Guardar por cinco anos, que é o prazo do art. 27 do CDC
- **Não substitui advogado.** Reter aparelho por dívida, responder acusação de dano no conserto, cobrar judicialmente ou escrever cláusula fora do comum são conversas com advogado. A skill entrega o documento e o artigo; a decisão é do usuário
- **Fronteira com as vizinhas:** `/proposta` é pré-venda por projeto, feita pra convencer alguém a fechar; `/contrato` formaliza serviço continuado (manutenção mensal, PMOC), e cada visita abre uma OS que o referencia; `/estoque` cuida do saldo da peça e a OS registra a que foi aplicada; `/capacidade` diz se a data prometida cabe na semana; `/cobranca` persegue o que ficou em aberto; `/caixa` soma o mês com o total das OS concluídas. Esta skill é o documento do atendimento, e nada além: não vira controle de estoque, agenda nem cobrança
- **Não é mini-ERP.** Se o usuário pedir agenda de técnico, controle de peça ou emissão de nota, dizer o que a skill faz e apontar a vizinha certa. Crescer além disso é o caminho mais curto pra um sistema que ninguém preenche
