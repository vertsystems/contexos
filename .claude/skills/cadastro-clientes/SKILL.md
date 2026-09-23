---
name: cadastro-clientes
description: >
  Pega a base de clientes do jeito que ela está (planilha, CSV, agenda do celular em .vcf,
  contatos do Google, conversa exportada do WhatsApp) e devolve um arquivo só, limpo:
  telefone que disca, CPF e CNPJ conferidos (inclusive o CNPJ com letras de julho/2026),
  e-mail e CEP no formato certo, a mesma pessoa uma vez só, empresa separada de pessoa, quem
  não compra há X meses marcado, e a base legal da LGPD registrada. É o arquivo que o
  pós-venda, a sequência, a prospecção e o WhatsApp passam a ler.
  Use quando o usuário disser "organiza minha lista de clientes", "minha planilha de
  clientes tá uma bagunça", "tem cliente repetido", "quero saber quem não compra há meses",
  "importa os contatos do meu celular", "tirar os clientes do WhatsApp pra uma planilha",
  "o CNPJ do cliente não entra no sistema", "quantos clientes eu tenho de verdade",
  "posso mandar mensagem pra essa lista?", "cadastro de clientes", ou /cadastro-clientes.
---

# /cadastro-clientes — Uma base, limpa, que as outras skills leem

> **Convenção de pastas:** a saída vai em `dados/clientes.csv` e `dados/relatorio-limpeza-<AAAA-MM-DD>.md`. Na convenção **por cliente**, a base dos próprios clientes fica na raiz (`dados/`); a base de um cliente da agência vai em `clientes/<Nome>/dados/`. A pasta nasce na primeira base. `dados/` fica fora do git de propósito: é dado pessoal.

Todo negócio pequeno tem a lista de clientes em três lugares: a agenda do celular, uma
planilha que alguém começou e o histórico do WhatsApp. A mesma pessoa aparece nos três
com um número diferente, o CPF tem um dígito trocado desde 2023 e ninguém sabe quantos
clientes existem de verdade. Resultado: a nota fiscal volta rejeitada por documento
errado, a mensagem de reativação vai pra quem comprou ontem, e a lista de transmissão
inclui quem pediu pra sair. Nenhuma skill de venda funciona em cima disso. Esta arruma a
base uma vez, por comando, e deixa o arquivo que as outras leem.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que se vende, se atende pessoa ou empresa, o ciclo de compra (define o corte de "parado")
- **Origem:** o plano do `/medir` em `medicao/`, se existir — a lista fechada de origem que a coluna `origem` usa
- **Quem pediu pra sair:** `vendas/prospeccao/nao-contatar.md`, se existir (`/prospeccao`)
- **Entrada:** o arquivo que o usuário jogar em `dados/` (`.csv`, `.xlsx`, `.vcf`, `.txt` de conversa do WhatsApp)
- **Molde:** `templates/operacao/cadastro-clientes.md` — as colunas do canônico, as regras de validação com fonte e data, deduplicação, LGPD por base legal, como exportar de cada lugar
- **Script:** `scripts/cadastro-clientes.js` — lê as entradas, normaliza, valida, deduplica, marca parado e grava os dois arquivos. Usa `scripts/br.js` (telefone, CPF, CNPJ, CEP, data) e `scripts/gerar-planilha.js` (leitura de `.xlsx` e CSV)
- **Conferência:** `node scripts/verificar.js tabela` e `texto` no relatório; `node scripts/gerar-planilha.js --ler` pra abrir o CSV gerado
- **Saída:** `dados/clientes.csv` (a base canônica, uma linha por cliente) e `dados/relatorio-limpeza-<AAAA-MM-DD>.md` (o que foi corrigido, o que ficou em dúvida, quem está parado)

---

## Workflow

### Passo 1 — Receber a base como ela está

Pedir o arquivo, ou os arquivos. Não pedir pra "organizar antes de mandar": o trabalho é
justamente esse. Se o usuário não sabe exportar, o molde tem o caminho de cada lugar
(iPhone, Google Contatos, Android, WhatsApp, Excel). Copiar tudo pra `dados/`.

Antes de rodar de verdade, mostrar como o script entendeu as colunas:

```bash
node scripts/cadastro-clientes.js dados/base.xlsx dados/contatos.vcf --colunas
```

Ele imprime cada coluna da entrada e o campo canônico que ela virou (ou "ignorada"), marca
o que veio do mapa e o que não é lido por ser dado sensível. Se errou (chamou de `telefone`
a coluna que era o código do cliente), corrigir com um mapa:

```json
{ "nome": "Cliente", "telefone": "Cel", "ultima_compra": "Data do pedido" }
```

salvo em `dados/mapa.json`, e rodar o `--colunas` de novo com `--mapa dados/mapa.json` pra
ver o mapa valendo antes de gerar arquivo. Arquivo sem cabeçalho o script lê pelo conteúdo
(coluna com `@` é e-mail, coluna que valida como CPF é documento); conferir do mesmo jeito.

A coluna de data de compra é a que mais escapa, e é a que decide quem está parado. Se o
`--colunas` mostrar `Data do pedido → (ignorada)`, o mapa é obrigatório: sem ela, a base
inteira sai como `sem-data` e a lista de reativação não existe.

### Passo 2 — Fazer a entrevista curta

É levantamento, então vai numa mensagem só. Quatro perguntas, e nenhuma delas o script
adivinha:

> 1. "De onde veio essa lista? Quem comprou de você, quem preencheu um formulário pedindo novidade, a agenda do seu celular, um grupo de WhatsApp?"
> 2. "Quem chega pra você chega principalmente por onde? (Instagram, Google, indicação, passou na frente, evento)"
> 3. "Depois de quantos meses sem comprar você considera que o cliente sumiu?"
> 4. "Tem alguém que pediu pra não receber mais mensagem? Me passa o número ou o e-mail."

A resposta 1 define a **base legal** (o molde tem a tabela: quem comprou é `contrato`;
quem pediu novidade é `consentimento`; cliente existente com contato razoável é
`legitimo-interesse`; nota fiscal e garantia é `obrigacao-legal`). Se a lista mistura
agenda pessoal com cliente, só quem comprou entra, e o usuário marca quem é quem no
próprio arquivo de entrada ou a skill pergunta nome a nome quando a lista é curta. Lista
comprada ou "peguei na internet" não tem base: dizer isso uma vez e não gerar o arquivo com
ela.

Da resposta 2 sai o `--origem`, aplicado só a quem está sem origem na entrada. O corte de
meses (resposta 3) vira `--meses`: barbearia é 2, contador é 13, loja de móveis é 24; sem
resposta, 6. Os números e e-mails da resposta 4 vão num arquivo de texto passado em
`--nao-contatar`, ou já estão no `vendas/prospeccao/nao-contatar.md` que o `/prospeccao`
mantém.

### Passo 3 — Rodar

```bash
node scripts/cadastro-clientes.js dados/base.xlsx dados/contatos.vcf \
  --base-legal contrato --origem indicacao --meses 6 \
  --nao-contatar dados/nao-contatar.txt
```

O que o script faz, nessa ordem, e o relatório registra um a um:

1. **Nome**: caixa alta ou baixa vira nome próprio ("MARIA DA SILVA" → "Maria da Silva"); espaço duplo sai
2. **Documento**: CPF de 11 dígitos e CNPJ de 14 (numérico ou alfanumérico) passam pelo módulo 11. Zero à esquerda que o Excel comeu é restaurado quando o resultado valida. Dígito errado vira dúvida, não correção: o script não inventa documento
3. **Tipo**: `PF` ou `PJ` pelo documento. Sem documento, `?`, e se o nome parece empresa ("Ltda", "Padaria"), vira dúvida pra pegar o CNPJ
4. **Telefone**: qualquer formato vira E.164 (`+5511998765432`). Celular de 8 dígitos anotado antes do nono dígito ganha o 9. DDD que não existe ou quantidade errada de dígitos vira dúvida, e o número original fica em `obs`
5. **E-mail e CEP**: formato conferido; domínio com cara de erro (`hotmail.con`) vira dúvida com a sugestão, sem trocar sozinho
6. **Datas e valor**: data que não existe (31/02) ou no futuro vira dúvida; `R$ 1.250,00` vira `1250,00`
7. **Deduplicação**: mesma pessoa por telefone, e-mail ou documento vira uma linha, preenchida com o melhor de cada. Mesmo nome com contato diferente **não** junta; vai pra uma lista à parte
8. **Valor somado**: duas linhas da mesma pessoa em datas diferentes são duas compras e somam; na mesma data é a linha repetida e não soma. Quando a rodada é `--mesclar`, o total que já estava no `clientes.csv` conta como fechado, e só compra com data posterior soma em cima. É o que impede o valor dobrar quando o usuário reimporta a exportação que vem com o histórico inteiro de novo
9. **Parado**: meses completos desde `ultima_compra` contra o corte; sem data é `sem-data`, nunca `parado`
10. **LGPD**: `base_legal` da entrevista pra quem não tinha; `nao_contatar = sim` pra quem está na lista. Coluna de cabeçalho sensível (`Doença`, `Religião`, `Alergia`) não é lida, e o relatório diz qual foi

No fim, ele relê o arquivo gravado e confere que toda linha tem as 23 colunas. Se o
`dados/clientes.csv` já existe, o script recusa sobrescrever: `--mesclar` junta a base
nova com a antiga sem criar duplicata (o `id` de cada cliente é estável entre rodadas), e
`--sobrescrever` começa do zero, guardando a versão anterior em
`dados/clientes-anterior.csv` pra dúvida resolvida na mão não virar prejuízo.

### Passo 4 — Ler o relatório com o usuário

Abrir `dados/relatorio-limpeza-<data>.md` e conferir por comando:

```bash
node scripts/verificar.js tabela dados/relatorio-limpeza-<data>.md
node scripts/verificar.js texto dados/relatorio-limpeza-<data>.md
node scripts/gerar-planilha.js --ler dados/clientes.csv --linhas 5
```

O relatório tem esta forma:

```markdown
# Relatório de limpeza — <data>

## Resumo
| O que | Quantos |
|---|---|
| Linhas lidas (2 arquivos) | 812 |
| Duplicatas mescladas | 37 |
| Clientes no arquivo final | 775 |
| Pessoa física (PF) / Empresa (PJ) / sem documento | ... |
| Com telefone válido / com e-mail / sem canal nenhum | ... |
| Parados (6+ meses sem comprar) | ... |
| Correções automáticas / Dúvidas que precisam de você | ... |

## Como cada arquivo foi lido
- **base.xlsx** (xlsx): 640 linhas · colunas: Cliente → `nome`, Cel → `telefone` ...

## O que foi corrigido sem precisar de você
| Motivo | Quantas |          (e a lista das que mudaram conteúdo, com antes e depois)

## O que ficou em dúvida (precisa de você)
| Cliente | Campo | Valor | Problema | O que fazer |

## Duplicatas mescladas
| Cliente | Linhas | Chave que uniu | Valor somado |

## Mesmo nome, contato diferente (não mesclado)

## Quem não compra há N meses ou mais
| Cliente | Última compra | Meses | Valor total | Canal |

## Origem e base legal
| Origem | Clientes |  ·  | Base legal (LGPD) | Clientes |
```

Na conversa, entregar só o que decide alguma coisa: quantos clientes de verdade, quantas
duplicatas saíram, quantas dúvidas e as três mais caras (documento de quem compra muito,
telefone inválido de cliente ativo), e quantos parados com o valor somado. O resto está
no arquivo.

As dúvidas são a lista de trabalho do usuário. Elas se resolvem de dois jeitos: corrigir
na origem (a planilha, o sistema) e rodar de novo com `--mesclar`, ou editar direto no
`clientes.csv`. Nenhuma dúvida foi alterada pelo script: o campo ficou vazio com o
original em `obs`, ou ficou como estava.

### Passo 5 — Ligar a base nas outras skills

O arquivo só vale se for lido. Dizer ao usuário, uma vez, o que passa a funcionar a partir
dele:

- A lista de cliente parado (`situacao = parado`, ordenada por `valor_total`) é o que o `/pos-venda` usa na situação "cliente parado", e o que o `/retencao` lê
- Reativação em série sai da mesma lista no `/sequencia`. Já o `/whatsapp` monta a transmissão só com quem tem `telefone` e `nao_contatar` vazio
- O `/prospeccao` confere o `dados/clientes.csv` antes de abordar ninguém: quem já é cliente não recebe mensagem fria
- **Cobrança:** a `/cobranca` lê `tipo` e `documento` pra saber se está cobrando pessoa ou empresa
- Origem se conta por comando, com `node scripts/utm.js contar dados/clientes.csv --coluna origem --valor valor_total --md` (`/medir`)

Anotar em `tarefas.md` as dúvidas que dependem de falar com o cliente ("pegar CNPJ da
Padaria Pão Quente"), e, se o negócio ainda não pergunta "como você chegou até a gente?" a
todo cliente novo, oferecer o `/medir` uma vez: coluna `origem` vazia em 40% da base é o
sinal.

### Passo 6 — Manter

Base limpa suja de novo em um mês. Duas rotinas curtas resolvem:

- **Entrou base nova** (export do mês, contatos novos do celular): `node scripts/cadastro-clientes.js dados/export-outubro.csv --mesclar`. O script junta pelo telefone, e-mail ou documento, mantém o `id`, não soma duas vezes a compra que já estava contada, e o relatório novo mostra só o que mudou
- **Uma vez por mês** (o `/rotina` agenda): `node scripts/cadastro-clientes.js --mesclar`, sem arquivo de entrada, só pra recalcular `meses_sem_comprar` e `situacao` com a data de hoje. Quem cruzou o corte aparece na lista de parados

Quem pediu pra sair entra no `--nao-contatar` no mesmo dia. Quem pediu eliminação sai do
arquivo, e o telefone dele fica anotado à parte com a data, pra não voltar na próxima
mescla.

---

## Regras

- **Nunca inventar dado.** Documento com dígito errado não é "corrigido" pro dígito certo mais próximo; e-mail com domínio suspeito não é trocado; telefone sem DDD não ganha o DDD da cidade do negócio. Tudo isso é dúvida, com o original guardado
- **Origem e base legal vêm da entrevista, nunca do palpite.** O script só aplica o que a opção de linha de comando disser, e o relatório registra que veio de lá. Base legal desconhecida fica vazia, e a skill diz que a lista não pode receber mensagem até isso ser resolvido
- **Lista sem base legal não vira transmissão.** Agenda comprada, lista "pega na internet" e contato de grupo de WhatsApp de que a pessoa nem lembra não têm base pra marketing (Lei 13.709/2018, art. 7º). A skill não gera o arquivo com essa lista, e diz por quê, uma vez, sem sermão
- **Dado sensível não entra na base.** Saúde, religião, orientação sexual, biometria (art. 5º, II) ficam no prontuário ou na ficha do procedimento, nunca em `obs`. Se a entrada trouxer, o campo é descartado e o relatório avisa
- **A base não sai do computador.** `dados/` está fora do git. Base de cliente não vai pra ferramenta de IA externa, pra WebSearch nem pra exemplo de comando; a busca é "como exportar contatos do iPhone", nunca com o nome de ninguém. Compartilhar é exportar só as colunas de quem precisa
- **Toda conta é do script.** Contagem de clientes, duplicatas, meses sem comprar e valor somado saem do comando e são conferidos pelo `verificar.js tabela`. Número no chat que não está no relatório não existe
- **Valor não dobra na remesclagem.** O total do `clientes.csv` é fechado até a última compra registrada; reimportar a mesma exportação não soma nada de novo. Se o `valor_total` de alguém pular sem compra nova, é bug, não crescimento: conferir antes de mostrar o número ao usuário
- **Formato certo não é dado certo.** O script valida offline: dígito verificador, formato de e-mail, 8 dígitos de CEP. Se o CNPJ está ativo, se o e-mail recebe e se o CEP existe, só a consulta pública da Receita, um envio e os Correios dizem. Escrever isso no relatório quando importar
- **Mesmo nome não é a mesma pessoa.** Deduplicação é por telefone, e-mail ou documento. Homônimo vai pra lista de conferência, e só o usuário decide
- **Sem data não é parado.** Quem não tem `ultima_compra` fica `sem-data`. Mandar "sentimos sua falta" pra quem comprou semana passada é o erro que esta regra evita
- **Recusar sobrescrever por padrão.** `clientes.csv` existente é trabalho do usuário (dúvidas resolvidas na mão). `--mesclar` preserva; `--sobrescrever` só quando ele pedir com essa palavra
- **Fronteira com as vizinhas:** o `/pessoa` é a ficha profunda de uma pessoa com quem há relação (histórico, preferências, o que ela disse), não a base em massa; a `/biblioteca` guarda ativos (foto, depoimento), não contato; o `/analisar-dados` resume qualquer arquivo e não valida dígito; o `/medir` define a lista de origem e conta por ela; o `/pos-venda`, o `/sequencia`, o `/prospeccao`, o `/whatsapp` e a `/cobranca` **leem** o `clientes.csv`, não o constroem. Esta skill é a base: nada de mensagem, régua ou análise sai daqui
- **Não substitui advogado.** A tabela de base legal do molde é o mínimo pra montar a base sem erro grosseiro. Política de privacidade, resposta a pedido de titular, incidente de vazamento e tratamento de dado de menor passam por advogado antes de virar ação. Dizer isso na entrega, uma vez
- **Quando o resultado for ruim, dizer o resultado.** "Dos 812 contatos, 340 não têm telefone que disca e 200 não têm base legal" é a frase, com o número, sem suavizar: é o que define o que o negócio consegue fazer com a lista hoje
