# Pessoa — a ficha de quem tem relação com o negócio

Referência do `/pessoa`. Consultada também pelo `/pos-venda` (cliente parado), pelo
`/revisao-semanal` (quem ficou no vácuo), pelo `/reuniao`, pelo `/whatsapp` e pelo
`/email-profissional` quando a mensagem vai pra alguém que já tem ficha.

Um negócio pequeno tem umas vinte pessoas que importam de verdade: os clientes que pagam
as contas, dois fornecedores, um contador, um parceiro, uma jornalista que já publicou.
O dono sabe tudo delas de cabeça, e é por isso que reexplica tudo a cada sessão: o
sistema não sabia que a Carla odeia reunião longa, que o João prometeu as fotos e não
mandou, que o Pedro ficou de responder o orçamento há três semanas. A ficha existe pra
essa memória sair da cabeça uma vez e passar a ser lida.

Não é CRM. CRM é pra pipeline com centenas de nomes e etapa de funil; isso é o
`/cadastro-clientes` (a base em massa, num CSV) e o `/prospeccao` (a lista pontuada). A
ficha é pra poucas pessoas, com profundidade: o que ela disse, o que ficou combinado,
quando foi a última conversa.

---

## O frontmatter

Os campos são fixos porque o `scripts/pessoas.js` lê todos eles pra calcular o índice.
Campo vazio fica vazio; campo inventado é pior que campo vazio.

| Campo | O que é | Formato | Quem lê |
|---|---|---|---|
| `nome` | como a pessoa se apresenta | texto; o arquivo é o slug dele (`Carla Mendes` → `carla-mendes.md`) | todo mundo |
| `papel` | a relação com o negócio | `cliente`, `prospect`, `parceiro`, `fornecedor`, `jornalista`, `indicador`, `equipe`, `outro` | o script, pra saber o ritmo |
| `empresa` | onde ela trabalha ou o que ela é dona | texto; na convenção por cliente, o mesmo nome da pasta `clientes/<Nome>/` | `/proposta`, `/contrato` |
| `como_chegou` | de onde a relação veio | "indicação da Ana", "reunião de 18/09", "respondeu a pauta" | você, daqui a um ano, quando quiser saber o que traz cliente |
| `canal` | onde ela responde | `whatsapp +5513997287738` ou `email nome@dominio.com`; um só, o que funciona | `/whatsapp`, `/email-profissional` |
| `o_que_importa` | o que pesa pra ela decidir | uma linha concreta: "prazo cumprido; odeia reunião longa" | toda mensagem que sai pra ela |
| `ultimo_contato` | a última conversa real, nos dois sentidos | `AAAA-MM-DD`; o script atualiza no `contato` | o índice, pra contar os dias |
| `ritmo_dias` | de quanto em quanto tempo essa relação precisa de contato | número; vazio usa o padrão do papel | o índice |
| `proximo_passo` | a próxima ação, de quem for | texto curto com verbo: "mandar orçamento", "ligar pra fechar" | o índice, o `/tarefas` |
| `proximo_passo_ate` | quando o próximo passo vence | `AAAA-MM-DD` | o índice: vencido é vácuo |
| `eu_prometi` | o que você deve a ela | lista; com "até DD/MM/AAAA" no texto quando tem prazo | o índice: vencido é vácuo, gravidade máxima |
| `me_prometeu` | o que ela deve a você | lista, mesmo formato | o índice: vencido é "cobrar" |
| `aniversario` | data que vale um contato sem venda | `DD/MM`, sem ano (o ano é dado a mais) | o índice, na janela de 30 dias |
| `renovacao` | contrato, plano ou serviço que vence | `AAAA-MM-DD` | o índice, na janela de 30 dias pra frente e pra trás |
| `base_legal` | por que o dado dela está aqui | `contrato`, `consentimento`, `legitimo-interesse`, `obrigacao-legal` | o rodapé, a LGPD |
| `nao_contatar` | ela pediu pra não receber mensagem | `sim` ou vazio | toda lista, sequência e transmissão |

**Ritmo padrão por papel**, em dias sem contato a partir dos quais a pessoa está no
vácuo. É o que o script usa quando `ritmo_dias` está vazio:

| Papel | Dias | Por quê |
|---|---|---|
| `prospect` | 7 | orçamento esfria em uma semana; depois disso a `/prospeccao` e o `/pos-venda` já sabem que é follow-up |
| `equipe` | 14 | quem trabalha com você e fica duas semanas sem conversa de verdade está sendo gerido por acaso |
| `cliente` | 30 | um mês sem nenhuma palavra é o começo do "sumiu" |
| `parceiro` | 45 | parceria sem contato vira parceria que existiu |
| `jornalista` | 60 | mais que isso e a pauta seguinte chega como primeira |
| `indicador` | 60 | quem indica precisa saber o que aconteceu com quem indicou |
| `fornecedor` | 90 | relação de pedido; três meses sem falar merece um "como estão as coisas" |
| `outro` | 90 | |

Esses números são ponto de partida, não regra. Cliente de contrato mensal pede 7 no
`ritmo_dias`; cliente de projeto entregue pede 60. Quem decide é o dono, uma vez, na ficha.

---

## O corpo da ficha

Quatro seções, nessa ordem. Curtas.

**Quem é.** Uma ou duas linhas: o que faz, como fala, o que já comprou. "Dentista, dona
da clínica no centro. Fala rápido, decide na hora, paga adiantado." É o que a
`/proposta` e o `/whatsapp` leem antes de escrever pra ela.

**O que não reexplicar.** A seção que justifica a ficha. Lista do que ela já disse e você
não quer ouvir de novo: o horário em que responde, o formato que odeia, a decisão que já
tomou ("não quer blog, decidiu em 18/09"), o nome do sócio, o apelido do filho se ela
mesma contou. Item novo entra a cada conversa; item que virou regra sobe pro
`o_que_importa`.

**Histórico.** Tabela com data, canal, o que aconteceu e a fonte (a ata em `reunioes/`,
a conversa, a proposta). Uma linha por contato real, mais a linha de promessa cumprida
(`--cumpri`, `--cumpriu`), que é registro de entrega e por isso **não** mexe no
`ultimo_contato`. O comando `contato` do `scripts/pessoas.js` acrescenta a linha e
atualiza a data no mesmo comando, pra não ficar um sem o outro. "Curti o story dela" não
é contato; "respondeu meu áudio dizendo que fecha em outubro" é.

**Rodapé.** A base legal e a frase fixa de que a ficha guarda o mínimo. É o que se
mostra se a pessoa perguntar "o que você tem sobre mim".

---

## Promessa: o formato que o script entende

Promessa é uma linha na lista `eu_prometi` ou `me_prometeu`. O prazo vai dentro do
texto, com a palavra "até" e a data completa:

```yaml
eu_prometi:
  - enviar o orçamento do site até 25/09/2026
  - mandar o contato do fotógrafo
me_prometeu:
  - aprovar o post até 2026-09-30
```

A primeira tem data: no dia 26 ela aparece no vácuo com gravidade máxima. A segunda não
tem: fica na ficha como lembrete e não entra na conta. Prazo que a pessoa não disse não
se inventa; se importa, combina-se um na próxima conversa e a linha ganha o "até".

O ano é obrigatório. "até 28/12" sem ano faz o script assumir o ano corrente, e em janeiro
isso vira uma promessa vencida onze meses no futuro: o `conferir` acusa a linha antes de o
índice errar.

Promessa cumprida sai da lista (`--cumpri "orçamento"` ou `--cumpriu "post"`) e fica
registrada na linha do histórico. A lista aberta é curta por definição: se tem cinco
promessas suas abertas com a mesma pessoa, o problema não é a ficha.

---

## Como o índice decide "no vácuo"

Três testes, nessa ordem de gravidade, feitos pelo comando `indice` do `scripts/pessoas.js`:

1. **Você prometeu com data e a data passou.** É a pior: a pessoa está esperando algo
   que você disse que faria. Aparece primeiro, com o atraso em dias
2. **O próximo passo venceu.** `proximo_passo_ate` antes de hoje, com `proximo_passo`
   preenchido
3. **Silêncio acima do ritmo.** Dias desde `ultimo_contato` maiores que `ritmo_dias`
   (ou o padrão do papel)

Cada pessoa aparece uma vez, pelo motivo mais grave. Quem tem `nao_contatar: sim` nunca
entra no vácuo nem na lista de aniversário: está na seção própria, e a regra é não
procurar. A única data dela que continua no índice é a `renovacao`, marcada, porque
contrato que vence é assunto de contrato e não de divulgação. Quem não tem
`ultimo_contato` aparece em "Fichas com problema", porque sem data não existe conta.

Renovação passada entra na janela pra trás também: um contrato que venceu há 12 dias e
ninguém viu é dinheiro parado. Mais velho que a janela sai da lista, pra o índice não virar
arquivo morto.

O índice inteiro é regenerado a cada rodada e não se edita à mão. O que muda é a ficha.

---

## Uma ficha, três arquivos absorvidos

Antes do `/pessoa`, contato vivia em três lugares e nenhuma skill era dona dele. A
migração é feita uma vez, pela conversa, com o usuário confirmando nome a nome:

| Estava em | Vira | O que muda na skill de origem |
|---|---|---|
| `imprensa/contatos.md` (`/imprensa`) | uma ficha por jornalista, `papel: jornalista`, com as últimas pautas em "O que não reexplicar" e cada envio no histórico | o arquivo antigo fica com uma linha apontando pra `pessoas/`; a `/imprensa` registra envio pelo `contato` |
| `vendas/prospeccao/nao-contatar.md` (`/prospeccao`) | `nao_contatar: sim` em quem tem ficha; a lista continua existindo como o arquivo que o `/prospeccao`, o `/cadastro-clientes` e o `/whatsapp` leem, e o script escreve nela quando alguém pede pra sair | nada: quem lê a lista continua lendo |
| "cliente parado" do `/pos-venda` | a seção "No vácuo" do índice, filtrada por `papel: cliente` | o `/pos-venda` lê o índice primeiro e o `dados/clientes.csv` depois |

Quem pediu pra não receber e **não** tem ficha não ganha uma: criar ficha pra guardar
"não me chame" é guardar mais dado do que o pedido justifica. Entra só na lista.

---

## LGPD: o que a ficha pode guardar

Não substitui advogado. Lei 13.709/2018, texto compilado em
https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm, conferido em
23/09/2026.

**Base legal (art. 7º).** Toda ficha diz por que o dado está ali:

| Base | Inciso | Quando cabe na ficha |
|---|---|---|
| `contrato` | art. 7º, V | cliente, fornecedor, parceiro com acordo e o prospect que pediu orçamento: o inciso cobre "procedimentos preliminares relacionados a contrato do qual seja parte o titular, a pedido do titular dos dados" |
| `consentimento` | art. 7º, I | a pessoa autorizou receber novidade; a data e o canal em que autorizou vão no histórico |
| `legitimo-interesse` | art. 7º, IX | jornalista com contato público, indicador, cliente antigo com contato que ele esperaria; precisa dar saída fácil |
| `obrigacao-legal` | art. 7º, II | dado que a lei manda guardar (nota fiscal, garantia); não serve pra mensagem |

**Mínimo necessário (art. 6º, III).** A ficha guarda o que a relação precisa e nada
além. Canal que funciona, sim; os três telefones antigos, não. Aniversário, sim; ano de
nascimento, não. Nome do sócio, se ele participa das decisões; nome dos filhos, só se ela
mesma contou e você vai usar pra perguntar deles.

**O que nunca entra (art. 5º, II).** A lei define dado pessoal sensível como o dado sobre
origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou a
organização de caráter religioso, filosófico ou político, saúde ou vida sexual, e dado
genético ou biométrico. Nenhum deles entra na ficha, nem disfarçado de observação: "está
fazendo quimioterapia, não cobrar esse mês" vira "pediu pra pausar a cobrança até
novembro". O motivo fica com você.

**Direitos da pessoa (art. 18).** Ela pode pedir, a qualquer momento, confirmação de que
existe tratamento e acesso ao que você tem (incisos I e II), correção do que está errado
ou velho (III), anonimização, bloqueio ou eliminação de dado desnecessário, excessivo ou
tratado fora da lei (IV), e revogação do consentimento (IX, que remete ao art. 8º, § 5º:
a qualquer momento, por procedimento gratuito e facilitado). Quando a base é consentimento,
pode pedir a eliminação do dado tratado com ele (VI).

O "não me manda mais nada" entra por caminhos diferentes conforme a `base_legal`. Em
`consentimento`, é revogação (art. 18, IX, e art. 8º, § 5º), e revogar é direito puro:
nada a ponderar. Em `legitimo-interesse`, é oposição (art. 18, § 2º), que o texto da lei
condiciona a descumprimento: continuar mandando depois do pedido é justamente o
descumprimento do princípio da necessidade, e o pedido de eliminação de dado que virou
excessivo (IV) chega ao mesmo lugar. A discussão é de advogado, não de operação, porque a
operação é a mesma nas duas: para de mandar hoje.

Na prática da ficha, os dois pedidos que aparecem se resolvem no mesmo dia:
`--nao-contatar` pra quem quer silêncio, e o arquivo fora da pasta pra quem quer o dado
apagado, com só o canal e a data ficando na lista de não contatar, pra não recadastrar sem
querer. A ficha inteira cabe numa tela e é escrita pra poder ser mostrada à própria pessoa.

**Onde mora.** `pessoas/` versiona junto com o trabalho, de propósito: é a memória do
negócio, poucas fichas, escritas pra serem lidas. Por isso o conteúdo é o mínimo e nunca
tem documento, endereço nem dado sensível. Se o `/salvar` sobe pra um repositório que
outra pessoa acessa, o usuário decide se `pessoas/` entra no `.gitignore`.

---

## De onde veio a ideia

A nota por pessoa como entidade do sistema, ligada às decisões e aos projetos em que ela
aparece, vem do jeito como o `obsidian-second-brain` trata contato
(https://github.com/eugeniughelbur/obsidian-second-brain, conferido em 23/09/2026): uma
página por pessoa, criada ou atualizada pelo próprio comando de salvar a conversa, com
relações tipadas no frontmatter. O que o Contex OS troca é o centro de gravidade: em vez
de grafo de relações, a conta de dias sem contato e de promessa vencida, porque é isso
que o dono de negócio pequeno precisa ver na segunda de manhã.
