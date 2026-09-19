# Medição — de onde vem o cliente, sem jargão

Referência do `/medir`. Não é o workflow: é o que a skill consulta pra explicar um termo,
escolher os eventos, montar a convenção de UTM e responder o que precisa de aviso de
cookie. O `scripts/utm.js` lê a convenção daqui.

---

## Glossário na língua do dono

| Termo da ferramenta | O que é, de verdade | Cuidado |
|---|---|---|
| **Sessão** | Uma visita. A mesma pessoa que abre o site de manhã e de noite conta duas | Não é gente, é visita |
| **Usuário** | Um navegador. Celular e computador da mesma pessoa contam dois | Sempre menor que sessão; nunca é o número de clientes |
| **Evento** | Qualquer coisa que a pessoa fez na página: rolou, clicou, enviou | Sozinho não diz nada. O que importa é o evento que vale dinheiro |
| **Evento principal** (antes chamado "conversão") | O evento que você marcou como "isso é resultado": clicou no WhatsApp, enviou o formulário, comprou | Marcar cinco coisas como principal é o mesmo que não marcar nenhuma |
| **Origem** (`source`) | De onde a pessoa veio: instagram, google, newsletter, indicacao | É o "de onde", não o "como" |
| **Meio** (`medium`) | O tipo do caminho: social, cpc (anúncio pago por clique), email, referral (link de outro site) | É o "como". Um "instagram-bio" no lugar de "social" some do grupo certo |
| **Campanha** (`campaign`) | A ação que gerou o link: bio, black-friday-2026, lancamento-turma-3 | Nome com espaço e maiúscula vira duas linhas no relatório |
| **Canal** (grupo de canais) | A caixa em que o GA4 joga cada combinação de origem e meio: Organic Social, Paid Search, Email, Direct, Referral | Regra fixa da ferramenta, você não escolhe |
| **Direct** | Visita sem origem conhecida: digitou o endereço, abriu do WhatsApp sem UTM, abriu de um app que apaga a origem | Direct alto quase sempre é link sem UTM, não gente decorando o site |
| **Unassigned** | Combinação que o GA4 não soube encaixar em canal nenhum | Aparece quando o `medium` foge da convenção. Não é erro, é aviso |
| **Referral** | Veio clicando num link de outro site (blog, parceiro, diretório) | Um "referral" que é o seu próprio domínio indica página de pagamento externa |
| **Pixel** | Pedaço de código da Meta na página que avisa o anúncio: "essa pessoa fez tal coisa" | Só serve se há anúncio na Meta |
| **API de conversões** | O mesmo aviso, mandado do servidor em vez do navegador, pra chegar mesmo com bloqueador | Complementa o pixel; não substitui |
| **Atribuição** | A regra que decide quem leva o crédito quando a pessoa veio três vezes por três caminhos | Cada ferramenta usa uma regra; os números nunca batem entre si, e isso é normal |
| **CAC** (custo por cliente) | Quanto foi gasto num canal, dividido pelos clientes que ele trouxe | Só existe pra canal com gasto. Indicação tem custo em tempo, não em reais |

---

## Os cinco eventos que valem pra negócio pequeno

Negócio pequeno não precisa de vinte eventos. Precisa dos que ficam entre "visitou" e
"pagou". Escolher os que existem no funil do negócio, nomear igual em todo lugar e marcar
como evento principal no GA4.

| Evento | Nome no GA4 | Quando dispara | Como marca |
|---|---|---|---|
| **Clique no WhatsApp** | `clique_whatsapp` | Clicou em qualquer botão ou link `wa.me` | `onclick` no link, ver trecho abaixo |
| **Clique no telefone** | `clique_telefone` | Clicou num link `tel:` | Igual ao de cima, com outro nome |
| **Envio de formulário** | `generate_lead` | O formulário foi enviado com sucesso (não só clicou em enviar) | Na página de obrigado, ou no retorno do envio |
| **Compra ou pedido** | `purchase` | Pagamento confirmado, ou pedido fechado | Loja virtual costuma ter integração pronta; senão, na página de confirmação, com `value` e `currency: "BRL"` |
| **Agendamento** | `agendamento` | Marcou horário (clínica, salão, consultoria) | Na confirmação da ferramenta de agenda, ou no clique do botão se a agenda é externa |

`generate_lead` e `purchase` são nomes que o GA4 já reconhece e trata com relatório
próprio; os outros três são nomes do Contex OS, em português, sem acento. Nome de evento
é minúsculo, com sublinhado, e o mesmo nome em todas as páginas.

Trecho pra marcar clique, no HTML, depois da tag do Google:

```html
<a href="https://wa.me/55DDDNUMERO?text=Oi%2C%20vim%20pelo%20site"
   onclick="gtag('event', 'clique_whatsapp', { pagina: location.pathname })">
  Chamar no WhatsApp
</a>
```

Pra marcar como evento principal: no GA4, em Administrador → Exibição de dados → Eventos
principais → Novo evento principal, digitar o nome exato. Funciona antes mesmo de o evento
disparar pela primeira vez. O nome do menu muda de tempos em tempos; se não estiver lá,
procurar "evento principal" na busca do próprio painel.

**O que não marcar como principal:** rolagem, tempo na página, clique no menu, visualização
de vídeo. São sinais de interesse, não de resultado. Ficam como evento comum.

---

## Convenção de UTM

Três campos obrigatórios (`source`, `medium`, `campaign`), um opcional (`content`) e um
que quase nunca se usa (`term`, reservado pra palavra-chave de anúncio de busca). Tudo em
minúscula, sem acento, hífen no lugar de espaço. O `scripts/utm.js` aplica isso sozinho.

### `source`: de onde

| Valor | Usar quando |
|---|---|
| `instagram`, `facebook`, `tiktok`, `linkedin`, `youtube`, `pinterest` | O link foi publicado nessa rede, pago ou não |
| `google` | Anúncio do Google. O orgânico não leva UTM: o GA4 reconhece sozinho |
| `whatsapp` | Link mandado por WhatsApp (lista de transmissão, status, grupo) |
| `newsletter` | E-mail pra lista |
| `indicacao` | Link que o cliente compartilha no programa de indicação |
| `parceiro-<nome>` | Link publicado por um parceiro: `parceiro-contadora-ana` |
| `gmn` | Link no perfil do Google Meu Negócio (o campo "site" do perfil) |
| `cartao`, `placa`, `panfleto`, `embalagem`, `vitrine` | Material físico com QR code |
| `evento-<nome>` | QR ou link distribuído num evento: `evento-feira-agro-2026` |

### `medium`: o tipo do caminho

| Valor | Usar quando | Onde o GA4 encaixa |
|---|---|---|
| `social` | Post, bio, stories, grupo, sem pagar | Organic Social |
| `paid_social` | Anúncio em rede social | Paid Social |
| `cpc` | Anúncio de busca ou display pago por clique | Paid Search ou Paid Other |
| `email` | Newsletter, e-mail de sequência, assinatura de e-mail | Email |
| `referral` | Link em site de terceiro, parceiro, diretório | Referral |
| `sms`, `whatsapp` | Mensagem direta | SMS, ou Unassigned no caso do WhatsApp |
| `offline` | QR code em material físico | Unassigned. O relatório de origem/meio mostra do mesmo jeito |
| `cliente` | Link de indicação compartilhado por cliente (programa do `/indicacao`) | Unassigned, e é assim mesmo |
| `parceiro` | Link de indicação de um parceiro dentro do programa, com código de indicador | Unassigned. Parceiro que só publica o link no site dele é `referral` |
| `afiliado` | Link de afiliado com comissão | Affiliates, se a origem for reconhecida; senão Unassigned |

"Unassigned" não é problema quando é esperado: o relatório de **Origem/meio da sessão**
mostra cada combinação, e é dele que sai a leitura do mês. O grupo de canais é atalho, não
fonte. Se um valor da tabela cair num grupo diferente do listado, a regra da ferramenta
mudou; confirmar na documentação do GA4 e corrigir a coluna.

### `campaign`: a ação

| Valor | Usar quando |
|---|---|
| `bio` | Link fixo na bio, sem prazo |
| `sempre` | Link permanente: assinatura de e-mail, rodapé, perfil |
| `<nome>-<ano>` | Ação com prazo: `black-friday-2026`, `lancamento-turma-3`, `dia-das-maes-2026` |
| `programa` | Link do programa de indicação (o indicador vai em `content`) |

### `content`: a variação (opcional)

Onde exatamente estava o link, quando a mesma campanha tem mais de um: `stories-1`,
`botao-topo`, `botao-rodape`, `qr-vitrine`, `qr-cartao`. No programa de indicação, é o
código do indicador. Serve pra saber qual botão da página é clicado e qual não é.

### Onde cada link vive

| Lugar | source | medium | campaign | content |
|---|---|---|---|---|
| Bio do Instagram | instagram | social | bio | |
| Stories com link | instagram | social | `<ação>` | stories-`<n>` |
| Anúncio na Meta | instagram ou facebook | paid_social | `<ação>` | `<criativo>` |
| Anúncio do Google | google | cpc | `<ação>` | |
| Newsletter | newsletter | email | `<edição ou ação>` | `<posição do link>` |
| Assinatura de e-mail | newsletter | email | sempre | assinatura |
| Perfil do Google Meu Negócio | gmn | referral | sempre | |
| QR no cartão de visita | cartao | offline | sempre | |
| QR na vitrine ou placa | vitrine | offline | sempre | |
| Link de indicação | indicacao | cliente, parceiro ou afiliado | programa | `<código do indicador>` |
| Link no site de um parceiro | parceiro-`<nome>` | referral | sempre | |
| Lista de transmissão | whatsapp | whatsapp | `<ação>` | |

**WhatsApp ignora UTM.** Link `wa.me` com `utm_source` chega ao WhatsApp sem nada. A origem
de quem chega por ali se registra de outro jeito: o texto pré-preenchido (`?text=Oi, vim
pelo Instagram`) e a pergunta do atendimento, na seção seguinte.

---

## O que não é digital também tem origem

Metade do cliente de negócio local chega por caminho que nenhuma ferramenta vê: passou na
frente, ouviu de alguém, viu a placa. Se isso não é registrado, a leitura do mês diz que
o Instagram traz tudo, e a decisão sai errada.

**A pergunta do atendimento.** "Como você chegou até a gente?", feita a todo cliente novo,
com lista fechada de resposta, escrita igual à coluna `source` da convenção:

```
instagram · google · indicacao · passou-na-frente · placa · whatsapp · evento · outro · nao-sei
```

Lista fechada é o que faz a contagem funcionar: "uma amiga falou" e "indicação" viram a
mesma linha. "Não sei" é resposta válida e vira linha na tabela.

**Onde anotar:** uma coluna `origem` na planilha ou sistema de clientes, preenchida no
primeiro contato, com o valor da lista. Quando a resposta é "indicação", uma segunda coluna
`indicado-por` com o nome. Se o negócio usa CRM ou sistema próprio, é um campo obrigatório
no cadastro.

**Código por canal**, pra quando não dá pra perguntar:

| Canal | Como rastrear |
|---|---|
| Panfleto, rádio, outdoor | Cupom ou palavra diferente por canal: "diga RADIO no balcão", cupom `PANFLETO10` no site |
| Cartão, vitrine, embalagem | QR code com link UTM (`source=cartao`, `medium=offline`) |
| Parceiro que indica | Cupom com o nome do parceiro, ou o link do programa (`source=indicacao`, `medium=parceiro`, `content=<código>`) |
| Telefone | Número diferente por canal só compensa em campanha grande; pra pequeno, a pergunta resolve |

---

## LGPD e cookies: o que precisa de aviso e o que não

O que se sabe com segurança, e o que precisa ser confirmado na versão vigente das
orientações da ANPD (Autoridade Nacional de Proteção de Dados) antes de afirmar ao usuário:

| Situação | Precisa de aviso? | Base |
|---|---|---|
| Cookie necessário pro site funcionar (carrinho, login, idioma) | Não precisa de consentimento, mas a política de privacidade precisa listar | Guia orientativo da ANPD sobre cookies [a confirmar a versão vigente] |
| GA4 com anonimização e sem anúncio | Política de privacidade nomeando a ferramenta e o que coleta. Consentimento prévio: [a confirmar com a orientação da ANPD; a prática comum é pedir] | LGPD, art. 7º (bases legais) |
| Pixel da Meta, remarketing, qualquer coisa que serve anúncio | Sim: banner com escolha real (aceitar e recusar com o mesmo peso), e o pixel só carrega depois do aceite | LGPD, art. 7º, I (consentimento) e guia da ANPD |
| Formulário que pede nome, telefone, e-mail | Não é cookie; é coleta direta. Dizer pra que serve ao lado do campo, e não usar pra outra coisa | LGPD, art. 6º (finalidade) e art. 9º (transparência) |
| Planilha de clientes com a coluna `origem` | Dado pessoal comum. Fica no negócio; não vai pra ferramenta externa sem autorização | LGPD, art. 6º e 46 |
| Telefone, e-mail ou nome dentro de UTM ou URL | Nunca. Vira dado pessoal gravado em log de terceiro | LGPD, art. 6º, VII (segurança) |

O que sempre vale, independente de confirmação:

- Banner só de "aceitar" não é consentimento. Se tem banner, tem recusar do mesmo tamanho, na mesma tela
- A política de privacidade lista as ferramentas (GA4, pixel da Meta, ferramenta de agenda), o que cada uma coleta e por quanto tempo
- O modo de consentimento (Consent Mode) do Google e a configuração equivalente da Meta são o que faz a ferramenta respeitar a escolha do banner. Sem isso, o banner é decorativo: a pessoa recusa e o pixel carrega do mesmo jeito
- Menos ferramenta é menos coisa pra explicar. Negócio que só usa GA4 e a pergunta do atendimento tem uma política de meia página; quem instala pixel, remarketing e mapa de calor precisa explicar tudo isso

Fonte primária pra confirmar: a Lei 13.709/2018 (LGPD) e as orientações publicadas pela
ANPD em gov.br/anpd. Detalhe de prazo, multa ou exceção não entra em peça nenhuma sem
essa confirmação.

---

## Leitura do mês: a régua

Duas tabelas respondem "de onde vem":

**Visita** (do export do GA4, relatório Origem/meio da sessão): quantas visitas cada
combinação trouxe, e quantos eventos principais. Diz qual canal traz gente que age.

**Cliente** (da planilha com a coluna `origem`): quantos clientes novos cada canal trouxe,
e quanto entrou por canal. Diz qual canal traz gente que paga. É a tabela que decide.

Custo por cliente só existe pra canal com gasto em reais: anúncio, panfleto, feira. Pra
canal sem gasto (indicação, Instagram orgânico), o custo é tempo, e entra em horas, não
em reais. Comparar reais com horas é comparar o que não se compara; a tabela mostra os
dois lado a lado e a decisão é do dono.

A linha **"não sei"** fica na tabela com a porcentagem dela. Se passa de 20% dos
clientes, a primeira ação do mês seguinte é a pergunta do atendimento, não a mídia.
