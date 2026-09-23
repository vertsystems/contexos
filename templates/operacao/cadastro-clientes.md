# Cadastro de clientes — a base que as outras skills leem

Referência do `/cadastro-clientes`. O arquivo que sai dali, `dados/clientes.csv`, é o que
o `/pos-venda` lê pra achar cliente parado, o `/sequencia` pra montar a lista de
reativação, o `/prospeccao` pra não abordar quem já é cliente, o `/whatsapp` pra
transmissão, a `/cobranca` pra saber quem é PF e quem é PJ, e o `/medir` pra contar
origem. Este molde guarda as colunas, as regras de validação com fonte, o método de
deduplicação e o que a LGPD pede de uma base dessas.

Por que existe: a base de cliente de negócio pequeno vive em três lugares (a agenda do
celular, uma planilha e o histórico do WhatsApp), com a mesma pessoa em cada um com um
número diferente, o CPF com um dígito trocado e o nome em caixa alta. Nenhuma skill
consegue trabalhar em cima disso. Uma base só, com telefone que disca e documento que a
nota fiscal aceita, é o que faz o resto funcionar.

---

## As colunas do `clientes.csv`

Separador `;`, UTF-8 com BOM (o Excel em português abre com acento certo), uma linha por
cliente, datas em `AAAA-MM-DD`, valor com vírgula decimal e sem ponto de milhar.

| Coluna | O que é | Formato | Quem preenche |
|---|---|---|---|
| `id` | identificador estável, pra outra skill apontar pra linha | `c-` + 8 hexadecimais, derivado do telefone, e-mail ou documento | script |
| `nome` | como a pessoa ou empresa se chama | texto, nome próprio (não caixa alta) | entrada |
| `tipo` | pessoa física ou jurídica | `PF`, `PJ` ou `?` quando não há documento | script, a partir do documento |
| `documento` | CPF ou CNPJ | `000.000.000-00` ou `00.000.000/0000-00`; aceita CNPJ alfanumérico | entrada, validado |
| `telefone` | o número principal, que disca | E.164: `+5511998765432` | entrada, normalizado |
| `telefone2` | segundo número, se houver | E.164 | entrada |
| `email` | e-mail | minúsculas, formato conferido | entrada |
| `cep`, `cidade`, `uf` | endereço resumido | `00000-000`, texto, sigla de 2 letras | entrada |
| `origem` | por onde o cliente chegou | lista fechada do `/medir`: `instagram`, `google`, `indicacao`, `passou-na-frente`, `placa`, `whatsapp`, `evento`, `site`, `outro`, `nao-sei` | entrada ou entrevista |
| `indicado_por` | quem indicou, quando origem é `indicacao` | nome | entrada |
| `primeira_compra` | data da primeira compra ou do cadastro | `AAAA-MM-DD` | entrada |
| `ultima_compra` | data da compra mais recente | `AAAA-MM-DD` | entrada |
| `valor_total` | quanto o cliente já gastou | `1250,00` | entrada; soma quando linhas de compras diferentes são mescladas |
| `meses_sem_comprar` | meses completos desde a última compra | inteiro | script |
| `situacao` | `ativo`, `parado` (X meses ou mais sem comprar) ou `sem-data` | lista | script |
| `base_legal` | por que o negócio pode usar esse dado | `contrato`, `consentimento`, `legitimo-interesse`, `obrigacao-legal` | entrevista, nunca inferida |
| `consentimento_em` | quando a pessoa autorizou, se a base é consentimento | `AAAA-MM-DD` | entrada |
| `nao_contatar` | pediu pra não receber mensagem | `sim` ou vazio | entrada ou lista do `--nao-contatar` |
| `tags` | grupos livres | separados por `\|` | entrada |
| `obs` | o que não coube em coluna, e o valor original de campo que ficou em dúvida | texto | entrada e script |
| `atualizado_em` | última vez que a linha passou pelo script | `AAAA-MM-DD` | script |

Coluna que a entrada não tem fica vazia. Coluna que a entrada tem e o canônico não
(aniversário, endereço completo, empresa de um contato) vai pra `obs` em vez de se perder.

---

## Validação: o que o script confere e com que regra

| Campo | Regra | Fonte | Conferido em |
|---|---|---|---|
| Telefone | DDD de 11 a 99 sem zero no meio; celular com 9 dígitos começando em 9; fixo com 8 dígitos começando em 2 a 5. Celular de 8 dígitos começando em 6, 7, 8 ou 9 ganha o 9 na frente (número anotado antes de 2016) | Anatel, perguntas frequentes de numeração: a última etapa do nono dígito foi em 06/11/2016, nos DDDs 41 a 46 (PR), 47 a 49 (SC) e 51, 53, 54 e 55 (RS). https://www.gov.br/anatel/pt-br/regulado/numeracao/perguntas-frequentes | 23/09/2026 |
| CPF | 11 dígitos, dois verificadores por módulo 11, sequência repetida rejeitada. Com 10 dígitos, o script testa um zero à esquerda (a planilha come) | algoritmo público, implementado em `scripts/br.js` | 23/09/2026 |
| CNPJ numérico | 14 dígitos, dois verificadores por módulo 11 com pesos 5..2,9..2 e 6..2,9..2 | idem | 23/09/2026 |
| CNPJ alfanumérico | 12 posições com letras e números (8 de raiz + 4 de ordem) e 2 verificadores que continuam numéricos; cada caractere vale o código ASCII menos 48 (`A` = 17, `0` = 0), e o resto do cálculo é o mesmo módulo 11. A Receita gera nesse formato a partir de julho de 2026; os CNPJs antigos continuam válidos e não mudam | IN RFB nº 2.229, de 15/10/2024, e a notícia da Receita Federal: https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2024/outubro/cnpj-tera-letras-e-numeros-a-partir-de-julho-de-2026 | 23/09/2026 |
| E-mail | formato `algo@dominio.tld`, minúsculas. Domínio com cara de erro (`gmail.con`, `hotmal.com`) vira dúvida com a sugestão, nunca troca sozinho | formato apenas; o script não consulta o servidor | 23/09/2026 |
| CEP | 8 dígitos, `00000-000`. Com 7 dígitos, testa zero à esquerda | formato apenas; não consulta os Correios | 23/09/2026 |
| Data | precisa existir (31/02 não passa) e não estar no futuro | `scripts/br.js` | 23/09/2026 |

O que **não** se valida offline: se o CPF pertence àquela pessoa, se o CNPJ está ativo,
se o e-mail recebe, se o CEP existe. Formato certo não é dado certo. A consulta pública
de CNPJ da Receita e a busca de CEP dos Correios ficam pro usuário, quando importar.

O sinal de valor do CNPJ alfanumérico: planilha ou sistema que só aceita número deixa de
cadastrar cliente novo a partir de julho de 2026, e a nota fiscal emitida com o documento
copiado errado volta rejeitada. Os documentos fiscais eletrônicos já têm orientação
publicada pra isso, na Nota Técnica Conjunta 2025.001, de 08/05/2025, que trata da
implementação do CNPJ alfanumérico na NF-e, NFC-e, CT-e, MDF-e e nas outras. A lista de
notas técnicas fica no Portal Nacional da NF-e,
https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D,
conferida em 23/09/2026. Se o sistema do usuário rejeitar letra no CNPJ, o problema é do
sistema dele, não do documento do cliente.

---

## Deduplicação: quando duas linhas são a mesma pessoa

Duas linhas se juntam quando compartilham **telefone, e-mail ou documento**, direto ou em
cadeia (A tem o telefone de B, B tem o e-mail de C: as três viram uma). Nome sozinho não
junta: "Ana Lima" com dois telefones diferentes pode ser duas pessoas, e o relatório lista
como "mesmo nome, contato diferente" pra quem conhece decidir.

Na mescla:

- Fica a linha mais completa; os campos vazios dela são preenchidos com o que as outras tinham
- `primeira_compra` é a mais antiga e `ultima_compra` a mais recente
- `valor_total` na primeira rodada soma quando as datas de compra são diferentes (eram compras distintas). Datas iguais é a mesma linha repetida, e não soma
- `valor_total` na remesclagem segue outra regra, e essa é a que evita o erro caro: o total que já está no `clientes.csv` é um valor fechado, que inclui tudo até a `ultima_compra` dele. Só compra com data **posterior** a essa soma. Sem isso, reimportar a exportação do mês seguinte, que vem com o histórico inteiro de novo, dobraria o valor de todo mundo. O relatório diz quantas linhas ficaram de fora da soma por esse motivo
- Nomes diferentes no mesmo contato: fica o mais longo, e a linha vai pra dúvidas
- `nao_contatar` em qualquer uma vale pra todas: quem pediu pra sair, saiu
- Linha sem telefone, e-mail nem documento usa o nome como chave, só pra não reaparecer a cada mescla

O `id` nasce do telefone (ou e-mail, ou documento), então a mesma pessoa recebe o mesmo
`id` em qualquer rodada. É o que permite outra skill guardar "mandei mensagem pro
c-9df58dea" e reencontrar a linha depois.

---

## Cliente parado

`meses_sem_comprar` é o número de meses **completos** entre `ultima_compra` e a data de
referência: comprou em 15/03 e hoje é 14/09, são 5 meses; em 15/09, são 6. O corte
padrão é 6 meses, e muda por negócio: barbearia é 2, contador é 13 (passou uma declaração
sem voltar), loja de móveis é 24. A skill pergunta; o script recebe `--meses`.

Quem não tem `ultima_compra` fica `sem-data`, não `parado`. Marcar como parado quem nunca
teve data registrada é mandar mensagem de "sentimos sua falta" pra quem comprou ontem.

---

## LGPD: o que uma base de clientes exige

Não substitui advogado. É o mínimo pra não montar a base errado. Lei 13.709/2018, texto
compilado em https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm,
conferido em 22/09/2026.

**Base legal (art. 7º).** Todo dado pessoal na base precisa de uma hipótese que autorize
o uso. As quatro que cabem em negócio pequeno, e o que cada uma cobre:

| Base | Inciso | Quando se aplica | O que ela permite |
|---|---|---|---|
| `contrato` | art. 7º, V | a pessoa comprou ou pediu orçamento | guardar o dado e falar sobre aquela compra ou serviço |
| `consentimento` | art. 7º, I | a pessoa autorizou receber novidade e promoção | mandar o que ela autorizou, até ela revogar |
| `legitimo-interesse` | art. 7º, IX | cliente já existente, contato razoável sobre o que ele comprou; não vale pra quem nunca comprou | comunicação que a pessoa esperaria; precisa dar saída fácil |
| `obrigacao-legal` | art. 7º, II | nota fiscal, garantia, registro que a lei exige guardar | manter o dado pelo prazo legal, não usar pra marketing |

O consentimento tem que ser pra finalidade determinada: "autorização genérica" é nula
(art. 8º, § 4º) e pode ser revogada a qualquer momento por procedimento gratuito e
facilitado (art. 8º, § 5º). Um "pode me mandar promoção?" no WhatsApp, com a resposta
guardada e a data em `consentimento_em`, vale; uma caixa marcada por padrão, não. O ônus
de provar que houve consentimento é do negócio (art. 8º, § 2º).

**Por que a skill pergunta em vez de inferir.** A base legal depende de como o dado foi
obtido, e isso só o dono sabe: a lista veio de quem comprou (contrato), de quem preencheu
um formulário pedindo novidade (consentimento), ou de uma agenda comprada (nenhuma base:
não entra). O script aplica o que a entrevista disser, por `--base-legal`, e registra que
veio de lá.

**Direitos do titular (art. 18).** A pessoa pode pedir confirmação de que está na base,
acesso, correção, eliminação e revogação do consentimento. Uma linha com `nao_contatar =
sim` é o mínimo pra honrar "não me manda mais nada"; um pedido de eliminação é apagar a
linha (e anotar em `obs` de uma linha à parte só o telefone, pra não recadastrar sem querer
na próxima mescla, com data do pedido).

**Fim do tratamento (arts. 15 e 16).** Dado que deixou de ser necessário se elimina,
salvo obrigação legal de guardar (nota fiscal, por exemplo). Cliente parado há anos, sem
contrato vigente e sem consentimento, não é ativo pra reativar: é dado a eliminar ou a
pedir consentimento de novo.

**O que nunca entra na base (art. 5º, II).** Dado sensível: saúde, religião, orientação
sexual, origem racial, opinião política, biometria. Clínica e salão têm esse dado no
prontuário e na ficha do procedimento, não na base de contato. `obs` não é lugar de
"tem diabetes" nem "evangélica". O script recusa a coluna pelo cabeçalho (`Doença`,
`Religião`, `Alergia`, `Prontuário` e afins): ela não é lida, e o relatório diz qual foi.
Cabeçalho que a lista não pega passa, então quem confere o `--colunas` é a skill.

**Pessoa física e empresa não têm o mesmo tratamento.** A LGPD cuida de dado de pessoa
natural (art. 1º). CNPJ e razão social de uma empresa não são dado pessoal; o nome, o
telefone e o e-mail da pessoa que atende por ela são. Na prática: a base de clientes PJ
segue precisando de base legal pelas colunas de contato, e o CPF do sócio numa coluna de
documento é dado pessoal como qualquer outro.

**Onde o arquivo mora.** Em `dados/`, que o `.gitignore` do sistema não versiona. Base de
cliente não vai pro GitHub, não vai pra ferramenta de IA externa sem autorização, e não
sai do computador em anexo de e-mail pra "dar uma olhada". Compartilhar é exportar só as
colunas necessárias pra quem precisa (`nome` e `telefone` pra quem vai ligar, sem CPF).

---

## Entradas que aparecem e como exportar

| De onde | Como exportar | O que o script faz |
|---|---|---|
| Excel ou Google Planilhas | salvar como `.xlsx` (ou baixar `.csv`) | lê a primeira aba (ou `--aba`), reconhece coluna pelo cabeçalho e, se não houver cabeçalho, pelo conteúdo |
| Agenda do iPhone | Contatos no iCloud.com → selecionar todos → exportar vCard | `.vcf`: nome, telefones (o celular primeiro), e-mail, empresa vai pra `obs` |
| Google Contatos | contacts.google.com → Exportar → Google CSV ou vCard | CSV com `First Name`, `Last Name`, `Phone 1 - Value`; junta nome e sobrenome |
| Android | Contatos → Gerenciar → Exportar | `.vcf`, às vezes em quoted-printable (acento como `=C3=A7`); o script decodifica |
| WhatsApp (grupo ou lista) | conversa → mais opções → Exportar conversa, sem mídia | `.txt`; cada remetente vira um contato, com a data da última mensagem em `obs` (não é compra) |
| Sistema de vendas, maquininha, iFood | relatório de clientes em CSV | qualquer separador; valor com `R$` e vírgula é lido |

O que nenhuma entrada resolve: a origem e a base legal. Elas vêm das perguntas da skill.

---

## A entrevista curta (o que só o dono sabe)

Quatro perguntas, uma mensagem só, antes de rodar com as opções:

1. "De onde veio essa lista?" (comprou de você, preencheu formulário, agenda pessoal, grupo de WhatsApp). É o que define a base legal, e a agenda pessoal misturada com cliente é o caso mais comum: aí só quem comprou entra
2. "Quem chega pra você chega principalmente por onde?" Quando a base não tem coluna de origem, a resposta vira `--origem`, e a origem real passa a ser perguntada a cada cliente novo (`/medir`)
3. "Depois de quantos meses sem comprar você considera que o cliente sumiu?" Vira `--meses`
4. "Tem alguém que pediu pra não receber mensagem?" Vira a lista do `--nao-contatar`, ou o arquivo `vendas/prospeccao/nao-contatar.md` do `/prospeccao`, se existir

Respostas que a skill não aceita como base legal: "todo mundo pode", "é público", "peguei
no Google". Dado achado na internet tem finalidade original (art. 7º, § 3º) e não vira
lista de transmissão.
