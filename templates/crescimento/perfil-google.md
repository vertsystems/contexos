# Perfil do Google — posts, perguntas e os números do mês

Referência do `/posts-perfil-google`. Não é o workflow: é o que a skill consulta pra
escrever post que o Google publica em vez de reprovar, semear a seção de Perguntas e
respostas e ler os três números que dizem se o perfil está trazendo gente. Vale pra
padaria, clínica, salão, oficina, escritório de contabilidade, pet shop: qualquer negócio
que aparece no Maps.

Conferido em 22/09/2026. O que tem fonte oficial está com o link. O que o Google aplica
no formulário mas não escreve em página de ajuda está marcado como limite da interface.

---

## Por que o Perfil e não só o Instagram

Quem digita "padaria perto de mim" ou "dentista no Tatuapé" está a um toque de ligar. O
Perfil da Empresa é o que aparece nessa hora, com o botão de ligar e o de traçar rota. Não
custa nada, e a maioria dos perfis de bairro está com a última foto de dois anos atrás.
Post ali não é pra ganhar curtida: é pra quem já está procurando ver que a loja está viva,
que tem promoção essa semana e que abre no feriado.

Os posts aparecem na aba "Atualizações" do perfil no celular e na seção "Do proprietário"
no computador (support.google.com/business/answer/7342169, lido em 22/09/2026). Post sem
período definido é arquivado depois de seis meses (mesma página).

---

## Os três tipos

| Tipo | O que o Google exige | Quando usar | Quanto tempo fica |
|---|---|---|---|
| **Novidade** (Atualização) | Descrição, foto ou vídeo, e botão de ação com link. É o formulário mais solto dos três | Horário novo, produto novo, equipe, bastidor, aviso de feriado | Seis meses, e aí é arquivado |
| **Oferta** | "É necessário ter um título, datas e horário". O botão "Ver oferta" entra sozinho; descrição, foto, cupom, link de resgate e termos são opcionais | Promoção com prazo. Sem data o formulário não aceita | Até o fim do período que você marcou |
| **Evento** | "Adicione um título, datas e horários de início e término". Sem os horários, "o evento vai aparecer com a duração de 24 horas". Descrição, foto e botão são opcionais | Oficina, degustação, dia de vacinação, plantão, mutirão | Até o fim do período que você marcou |

Fonte dos campos e do arquivamento: support.google.com/business/answer/7342169, lido em
22/09/2026 — "os posts com mais de 6 meses são arquivados, a menos que um período seja
definido". Os tipos correspondem aos `STANDARD`, `OFFER` e `EVENT` da API
(developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts, lido
na mesma data).

**Hotel é a exceção que derruba o mês inteiro:** hotel e pousada não podem criar post de
oferta, nem publicar post que mencione ou leve a oferta, promoção, condição especial ou
desconto (support.google.com/business/answer/7213077, lido em 22/09/2026). Nesse ramo o
mês sai só com novidade e evento, e sem preço no texto.

O mês precisa dos três. Só novidade vira diário sem motivo pra clicar; só oferta vira
panfleto. Um evento por mês, mesmo pequeno ("sábado a gente prova o pão novo das 9h às
11h"), é o tipo que mais gera rota.

---

## O que o Google reprova, e o que a interface corta

| Regra | Como o script trata | Fonte | Conferido em |
|---|---|---|---|
| Telefone no corpo do post | Erro. "Para evitar o risco de abuso, não permitimos que o conteúdo da postagem inclua um número de telefone"; o caminho é o botão "Ligar agora", que usa o número verificado do perfil | support.google.com/business/answer/7213077 | 22/09/2026 |
| Link ou e-mail no corpo | Erro, por régua da skill: o Google só proíbe link malicioso, mas o link no texto não é clicável no celular e o clique que o Desempenho mede é o do botão | support.google.com/business/answer/7342169 (botão de ação com link) e answer/7213077 (links) | 22/09/2026 |
| Produto regulado com preço, link ou telefone | Erro de conteúdo, não de formato: álcool, tabaco, jogo de azar, arma, dispositivo médico, remédio controlado, serviço financeiro. Post sobre isso precisa passar pelo `/publicidade-regulada` | support.google.com/business/answer/7400114 | 22/09/2026 |
| Conteúdo fora do negócio, comentário político, reclamação pessoal | O script não pega; é regra de leitura | mesma página | 22/09/2026 |
| Texto sem sentido, repetido, caixa alta, "gimmicky characters" | Aviso pra caixa alta e exclamação dupla; erro pra post duplicado no mês | support.google.com/business/answer/7400114 e answer/3038177 | 22/09/2026 |
| Corpo de até 1.500 caracteres | Erro acima disso. É o limite do formulário; não há página de ajuda que o escreva | support.google.com/business/thread/39749391 (comunidade, limite do formulário) | 22/09/2026 |
| Gancho de até 80 caracteres | Erro acima disso. É o que aparece antes do "..." no celular; o Google não publica o número e ele varia de 80 a 100 por aparelho | github.com/garrettjsmith/localseoskills/blob/main/skills/gbp-posts/SKILL.md (regra de prática, não oficial) | 22/09/2026 |
| Título de oferta e evento perto de 58 caracteres | Aviso. Limite da interface, sem página oficial | prática; [a confirmar na tela ao publicar] | 22/09/2026 |
| Foto em JPG ou PNG, entre 10 KB e 5 MB, mínimo 250 × 250, recomendado 720 × 720 | Erro fora do formato ou do peso, quando o arquivo está no workspace. Resolução o script não lê; confira na hora de subir | support.google.com/business/answer/6103862 | 22/09/2026 |
| Vídeo de até 30 segundos, 75 MB, mínimo 720 px | Não conferido pelo script (o mês trabalha com foto) | mesma página | 22/09/2026 |

O que reprova de verdade é a primeira linha da tabela. Dono de negócio cola o telefone
no texto por reflexo, e o post volta reprovado sem dizer por quê.

---

## Os botões (lista fechada)

O formulário só aceita estes. Qualquer outro texto ("Clique aqui", "Chama no Zap") não
existe como botão; o script recusa.

| Botão na tela (pt-BR) | Na API | Quando |
|---|---|---|
| Reservar | `BOOK` | Consulta, mesa, horário no salão |
| Fazer o pedido | `ORDER` | Delivery, encomenda, cardápio on-line |
| Comprar | `SHOP` | Catálogo, loja virtual |
| Saiba mais | `LEARN_MORE` | Página do serviço, post do blog, horário do feriado |
| Inscrever-se | `SIGN_UP` | Oficina, lista de espera, curso |
| Ligar agora | `CALL` | Usa o telefone verificado do perfil; não leva link |
| Nenhum | — | Só em novidade; oferta ganha "Ver oferta" sozinha |

Fonte da lista: enum `ActionType` da API (developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts,
lido em 22/09/2026). Os rótulos em português são os da interface em setembro de 2026;
se a tela mostrar outro nome, vale o da tela.

Todo botão que não é "Ligar agora" leva um link, e o link começa com `https://`. Se o
negócio não tem site, o link pode ser o próprio WhatsApp (`https://wa.me/55DDDNUMERO`),
gerado com `br.linkWhatsapp` ou pelo `/whatsapp`, ou a página de agendamento. Link com UTM
sai do `scripts/utm.js` com `--source google --medium perfil`, e é assim que o `/medir`
separa o que veio do perfil do que veio da busca.

---

## Foto em todo post

Post sem foto é um bloco de texto cinza no meio de fotos de concorrente. A regra é uma
foto por post, e a lista do mês nasce da `/biblioteca` (tabela "Fotos e imagens") antes
de nascer do celular.

O que funciona no Perfil, por ordem:

1. **O produto ou o resultado**, de perto, com luz de janela: o pão cortado, o dente
   clareado (com autorização do `/autorizacao`), o carro pronto
2. **A fachada**, pra quem vai chegar reconhecer. Uma por trimestre basta
3. **Gente do time trabalhando**, não posando
4. **O ambiente por dentro**, na hora cheia

Foto de banco de imagem e foto gerada por IA ficam fora. A política de conteúdo pede
que o que vai no perfil reflita a experiência real no local
(support.google.com/business/answer/7400114, seção de conteúdo fora do assunto, lida em
22/09/2026), e a prática do SEO local é foto própria, só (localseoskills, gbp-posts).
Além disso, o cliente reconhece foto de banco. Sem foto própria, o post espera a foto;
não sai com ilustração.

Peça visual com texto em cima (arte de promoção) é trabalho do `/carrossel`, no formato
quadrado. O post do perfil recebe o PNG pronto.

---

## O gancho: os primeiros 80 caracteres

O celular mostra uma linha e meia e corta com "...". O que está depois só aparece pra
quem toca. Então a primeira linha carrega o post inteiro: o quê, quando, e um motivo.

Seis formas que cabem em 80 caracteres:

| Forma | Exemplo (padaria) | Exemplo (clínica) |
|---|---|---|
| Serviço + quando | "Pão de fermentação natural todo sábado às 7h" | "Limpeza com hora marcada agora também aos sábados" |
| Mudança concreta | "Agora abrimos às 6h30 de segunda a sexta" | "Passamos a aceitar o convênio Unimed" |
| Preço com prazo (oferta) | "Bolo de cenoura de R$ 42 por R$ 35 até dia 20" | "Avaliação sem custo até 31/10, 20 vagas" |
| Evento com dia e hora | "Oficina de pão caseiro sábado 17/10, das 9h ao meio-dia" | "Dia D da vacina da gripe: sábado 10/10, 8h às 12h" |
| Feriado | "No feriado de Finados abrimos das 7h às 13h" | "Plantão no feriado: das 8h às 12h, pelo botão Ligar" |
| Bastidor com número | "40 pães por fornada, e a fornada sai às 7h" | "Três dentistas, uma cadeira nova, o mesmo horário" |

O que não cabe em 80 caracteres e não precisa caber: adjetivo ("delicioso", "de
qualidade"), slogan, hashtag. Hashtag o Perfil ignora.

O corpo, depois do gancho, responde o que o cliente perguntaria no balcão: pra quem é,
quanto custa, até quando, o que precisa fazer. Entre 150 e 400 caracteres já cobre isso;
1.500 é teto, não meta. Contagem sempre por comando:
`node scripts/perfil-google.js contar --texto "..."`.

---

## Oferta com data: o que a lei pede

Oferta publicada obriga. O CDC diz que "toda informação ou publicidade, suficientemente
precisa, veiculada por qualquer forma ou meio de comunicação com relação a produtos e
serviços oferecidos ou apresentados, obriga o fornecedor" (art. 30), e que a oferta deve
trazer informação correta e clara sobre "preço, garantia, prazos de validade" (art. 31).
Publicidade "inteira ou parcialmente falsa" sobre preço é enganosa (art. 37, § 1º).
Lei 8.078/1990, planalto.gov.br/ccivil_03/leis/l8078compilado.htm, conferido em
22/09/2026.

Na prática, pro post de oferta:

- **Data de início e de fim** no post, não só no campo do formulário. O texto é o que a
  pessoa lê no Maps, e o script recusa oferta sem prazo escrito no corpo
- **"De X por Y"** só se o X foi praticado de verdade nos dias anteriores. O script
  calcula o desconto e acusa "por" maior que "de"; não tem como saber se o "de" existiu,
  e isso é responsabilidade do dono
- **Condição no corpo ou nos termos**: "um por pedido", "retirada na loja", "enquanto
  durar o estoque de 30 unidades". Condição escondida é o que vira reclamação no Procon
- **Preço com o número certo**: se a oferta é parcelada, o total à vista aparece

Isto não substitui advogado. Oferta de serviço de saúde, jurídico ou financeiro passa
antes pelo `/publicidade-regulada`, que confere o léxico do conselho.

---

## Perguntas e respostas: semear a seção

A seção de Perguntas e respostas do perfil é pública e qualquer pessoa responde. Quando
o dono não ocupa, cliente responde errado ("acho que fecha às 18h") e a resposta errada
fica. O dono pode fazer a própria pergunta com a conta da empresa e responder na hora;
a resposta sai marcada como do proprietário (brightlocal.com/learn/google-q-and-a e
support.google.com/business/thread/207822356, lidos em 22/09/2026; não há página de ajuda
oficial que descreva o recurso em detalhe).

De onde saem as perguntas: das mensagens do WhatsApp da semana e de `_memoria/publico.md`.
As cinco que quase todo negócio local recebe:

1. Faz entrega? Até onde, e com pedido mínimo de quanto?
2. Aceita cartão, Pix, convênio, vale?
3. Tem estacionamento? Como chega de ônibus?
4. Precisa marcar hora? Com quanta antecedência?
5. Tem opção sem glúten, sem lactose, pra criança, pra pet grande?

A resposta é curta, concreta e sem telefone (a política de telefone vale pra todo
conteúdo do perfil). "Pelo botão Ligar do perfil" resolve. Uma pergunta por dia na
primeira semana, depois uma por semana, e a resposta da semana entra no mês seguinte.

---

## Os três números do mês

Na aba **Desempenho** do perfil, com o período do mês inteiro
(support.google.com/business/answer/9918094, lido em 22/09/2026):

| Número | O que é | O que ele diz |
|---|---|---|
| **Visualizações** | Visitantes únicos que abriram o perfil na Pesquisa e no Maps | Se o post e a foto estão fazendo o perfil aparecer |
| **Chamadas** | Cliques no botão de ligar | Quem quis falar agora |
| **Rotas** | Quantas pessoas pediram informação de como chegar | Quem foi até a loja. Pra negócio sem porta aberta, trocar por **Cliques para acessar o site** |

Três, não dez. Pesquisas, mensagens, agendamentos, cardápio, ofertas e visualização de
produto existem na mesma aba e entram só se o negócio usa o recurso. O que vale é a comparação mês contra mês, calculada
com `node scripts/perfil-google.js numeros`, nunca de cabeça. O `/medir` lê esses três a
partir do arquivo do mês quando monta a leitura por canal.

Um mês não diz nada: feriado, chuva e a Copa mudam tudo. Três meses seguidos na mesma
direção é sinal.

---

## Cadência que sobrevive

Mínimo de um post por semana; dois a três é o que a prática recomenda; todo dia não
penaliza mas rende pouco (localseoskills, gbp-posts, lido em 22/09/2026). O mês do
Contex OS sai com quatro a oito, um por semana e mais um na semana da promoção, porque é
o que o dono de padaria publica de verdade em outubro, e não em janeiro.

A régua de sucesso não é "publiquei oito". É "publiquei os quatro, com foto, na data".
O lembrete de publicar sai pelo `/rotina`; a skill entrega o texto, não aperta o botão.

---

## Fontes

- Criar e gerenciar postagens: support.google.com/business/answer/7342169 (22/09/2026)
- Política de fotos, vídeos e posts: support.google.com/business/answer/7213077 (22/09/2026)
- Conteúdo proibido e restrito: support.google.com/business/answer/7400114 (22/09/2026)
- Diretrizes de representação da empresa: support.google.com/business/answer/3038177 (22/09/2026)
- Requisitos de foto e vídeo: support.google.com/business/answer/6103862 (22/09/2026)
- Desempenho do perfil: support.google.com/business/answer/9918094 (22/09/2026)
- API, tipos de post e botões: developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts (22/09/2026)
- Limite de 1.500 caracteres (comunidade): support.google.com/business/thread/39749391 (22/09/2026)
- Regras de prática (gancho, cadência): github.com/garrettjsmith/localseoskills/blob/main/skills/gbp-posts/SKILL.md (22/09/2026)
- CDC, arts. 30, 31 e 37: planalto.gov.br/ccivil_03/leis/l8078compilado.htm (22/09/2026)
