---
name: assinatura-email
description: >
  Monta a assinatura de e-mail de uma pessoa ou da equipe inteira: HTML em tabela com CSS
  inline, logo hospedado, telefone e WhatsApp clicáveis com mensagem pronta, link do site
  rastreável. Entrega também a versão em texto puro e o passo a passo de instalação no
  Gmail, no Outlook e no Apple Mail, com peso, largura e links conferidos por comando.
  Use quando o usuário disser "minha assinatura quebra no Outlook", "quero uma assinatura
  de e-mail", "o logo da assinatura não aparece", "assinatura profissional", "a mesma
  assinatura pra equipe toda", "como ponho meu WhatsApp no rodapé do e-mail", "entrou
  gente nova e precisa de assinatura", "minha assinatura aparece gigante pro cliente",
  "assinatura com o logo da empresa", ou /assinatura-email.
---

# /assinatura-email — Assinatura que não quebra

> **Convenção de pastas:** a saída vai em `identidade/assinatura-email/`, uma subpasta por pessoa. Na convenção **por cliente**, `clientes/<Nome>/identidade/assinatura-email/`. A pasta nasce na primeira assinatura, nunca antes.

A assinatura é a peça da marca que mais gente vê, e a única que sai centenas de vezes por
mês sem você olhar. Quando ela quebra, quebra na frente do cliente: o logo vira um quadrado
vazio, o bloco aparece metade maior na tela de quem usa Outlook no Windows, e ninguém avisa.
O interlocutor não vai escrever "sua assinatura está torta"; ele só passa a te achar menos
caprichoso, e pronto.

O conserto é mecânico. Tabela, CSS inline, logo num endereço que você controla, largura
com teto, e a conta do peso feita por comando em vez de no olho.

## Dependências

- **Contexto:** `_memoria/empresa.md` — nome do negócio, site, telefone, endereço e quem é a equipe
- **Tom:** `_memoria/preferencias.md` — o que o usuário não quer na assinatura (frase de efeito, aviso longo)
- **Sistema da marca:** `identidade/tokens.css` se existir, e `identidade/design-guide.md` se não houver tokens. Os valores entram **escritos em hexadecimal** no HTML: `var()` não existe dentro do e-mail
- **Referências** (ler antes de montar):
  - `templates/design/assinatura-email.md` — compatibilidade por programa, logo hospedado, modo escuro, o que não entra
  - `templates/design/email-html.md` — a base de tabela, CSS inline e imagem bloqueada
  - `templates/design/acessibilidade.md` — contraste e texto alternativo
- **Scripts:**
  - `scripts/assinatura-email.js` — gera o HTML e a versão em texto, e confere peso, caracteres, largura, contraste, CSS proibido e resposta de cada link
  - `scripts/verificar.js` — `contraste` pra conferir uma cor solta que não está no spec
  - `scripts/utm.js` — a convenção de UTM que o link do site segue
- **Saída:** `identidade/assinatura-email/<pessoa>/assinatura.html` e `assinatura.txt`, mais `instalar.md` (passo a passo dos três programas e a tabela de compatibilidade) e o `assinatura.json` (o spec) na raiz da pasta

---

## Workflow

### Passo 1 — Descobrir se é uma pessoa ou a equipe

Pergunta única, porque muda tudo o que vem depois:

> "É a sua assinatura, ou a da equipe inteira?"

**Uma pessoa:** seguir pro passo 2 e levantar os dados numa mensagem só.

**Equipe:** pedir a lista num CSV, com uma linha por pessoa. O script lê as colunas
`nome`, `cargo`, `email`, `telefone`, `whatsapp`, `site`, `instagram`, `linkedin` e
`registro`, em qualquer ordem, com ponto e vírgula ou vírgula, e aceita variação de nome
no cabeçalho (`funcao` por `cargo`, `celular` por `whatsapp`, `crm` por `registro`). Só
`nome` é obrigatório; pessoa sem nome é pulada. Se o usuário tem essa lista numa planilha,
ele exporta em CSV e acabou. Se não tem, três pessoas se digitam mais rápido do que se
abre o Excel.

O arquivo vai em `dados/`, que é a drop zone ignorada pelo git. Isso não é detalhe de
organização: a lista tem o celular de cada funcionário, e celular de funcionário é dado
pessoal (veja as regras no fim).

### Passo 2 — Levantar o que vai na assinatura

Aqui vale **uma mensagem só**, não uma pergunta por vez: é levantamento, e quebrar em
nove perguntas cansa. Pedir assim, marcando o que é opcional:

> "Me manda o que tiver, nessa ordem:
> nome completo · cargo · e-mail · telefone fixo · WhatsApp · site
> e, se fizer sentido: registro do conselho (CRM, OAB, CRO), Instagram, LinkedIn.
> Tem o logo em PNG hospedado em algum endereço? Se não, a gente resolve no passo do logo."

O que estiver no `_memoria/empresa.md` já vem preenchido, e o usuário só confirma. Nunca
preencher cargo, registro de conselho ou telefone por dedução: campo faltando entra como
`[a confirmar]` e fica visível.

E fica visível de propósito, dos dois lados: o `conferir` do passo 7 **reprova** assinatura
com `[a confirmar]` dentro. O aviso vive no arquivo até alguém responder, e nada sai pra
equipe enquanto ele estiver lá.

### Passo 3 — Cortar

Assinatura boa tem 5 a 7 linhas. A régua do corte:

| Entra | Fica de fora |
|---|---|
| Nome e cargo | Frase motivacional, "pense antes de imprimir" |
| Empresa e logo | Foto da pessoa (pesa, chega bloqueada, envelhece) |
| Um telefone e um WhatsApp | Três telefones e dois e-mails |
| E-mail e site | Ícone de rede social como imagem |
| Registro do conselho, quando a profissão exige | Aviso jurídico de doze linhas |
| Endereço, quando o cliente vai até lá | Pixel de rastreio |

Cada linha a mais tira peso das outras. Se o usuário insiste em algo da coluna da direita,
mostrar o custo em uma frase e seguir a decisão dele: a assinatura é dele.

### Passo 4 — Resolver o logo

É onde quase toda assinatura morre. Três cenários:

1. **Logo já hospedado** (`https://site.com.br/img/logo.png`): usar essa URL. O passo 6
   avisa se o arquivo não é PNG ou não está em https; o passo 7 é que testa se ele
   responde 200
2. **Logo só no computador dele:** o arquivo precisa subir pra algum lugar estável. Se o
   negócio tem site, a pasta de imagens do site resolve. Sem site, vale um repositório de
   arquivos que ele controle. Explicar por que o caminho do computador não serve: o
   destinatário não tem acesso a ele
3. **Sem logo:** assinatura de texto, com uma borda de 3 px na cor da marca no lugar da
   imagem. Fica melhor do que logo quebrado, e é o padrão do script quando o campo `logo`
   vem vazio

Nada de base64. O Gmail não mostra imagem embutida, e o código do logo sozinho já passa
do limite de 10.000 caracteres do campo de assinatura. Se o usuário chegar com uma
assinatura pronta em base64 (é o que gerador grátis costuma entregar), essa é a primeira
coisa a trocar.

### Passo 5 — Escrever o spec

Um JSON por negócio, em `identidade/assinatura-email/assinatura.json`. O esqueleto não se
digita na mão: o script escreve um preenchido, pra editar em cima:

```bash
mkdir -p identidade/assinatura-email
node scripts/assinatura-email.js --exemplo identidade/assinatura-email/assinatura.json
```

As cores saem do `tokens.css` (o valor em hexadecimal, não o `var()`); a lista de pessoas
sai do passo 2, ou fica vazia quando vem CSV. O arquivo fica assim:

```json
{
  "marca": {
    "empresa": "Clínica Vale Verde",
    "site": "https://clinicavaleverde.com.br",
    "endereco": "Rua Amador Bueno, 142 — Santos/SP",
    "aviso": "",
    "fonte": "Arial, Helvetica, sans-serif",
    "cor_texto": "#14181f",
    "cor_apoio": "#5b6472",
    "cor_link": "#0b5cd5",
    "cor_linha": "#dfe3e9",
    "largura": 480,
    "layout": "lado-a-lado",
    "logo": { "url": "https://clinicavaleverde.com.br/img/assinatura-logo.png",
              "largura": 120, "altura": 40, "alt": "Clínica Vale Verde" }
  },
  "utm": { "source": "assinatura-email", "medium": "email", "campaign": "assinatura" },
  "whatsapp_mensagem": "Olá, {primeiro}! Cheguei pela assinatura de e-mail da {empresa}.",
  "pessoas": [
    { "nome": "Marina Okuda", "cargo": "Fisioterapeuta", "registro": "CREFITO-3 98765-F",
      "email": "marina@clinicavaleverde.com.br", "telefone": "(13) 3222-1140",
      "whatsapp": "(13) 99728-7738", "site": "",
      "redes": { "Instagram": "https://instagram.com/clinicavaleverde" } }
  ]
}
```

Detalhes que valem explicar ao usuário quando ele perguntar:

- `layout` aceita `lado-a-lado` (logo à esquerda, texto à direita) e `empilhado` (logo em
  cima). Logo largo ou deitado pede `empilhado`. Nome errado no campo vira aviso, e o
  script cai no `empilhado`
- `whatsapp_mensagem` aceita `{primeiro}`, `{nome}` e `{empresa}`. É a mensagem que já vem
  digitada no celular do cliente quando ele toca no número — por isso ela é escrita da
  boca dele pra dentro ("Cheguei pela assinatura..."), não da empresa pra fora
- `utm` só entra nos links do domínio do próprio negócio. Link de rede social fica
  intacto, e negócio sem site não recebe UTM em lugar nenhum. **No `wa.me` não existe
  UTM:** não há página pra registrar a visita, então a origem vai dentro do texto da
  mensagem, que é o que o atendimento lê
- `largura` tem teto de 600 px, e a faixa que sobrevive à escala do Windows é 400 a 480 px.
  Acima de 520 px o script avisa; acima de 600 px ele corta e diz que cortou
- `logo.largura` e `logo.altura` são a medida de **exibição**; o PNG sai do editor com o
  dobro (120 × 40 px exibidos, 240 × 80 px no arquivo)

### Passo 6 — Gerar por comando

```bash
node scripts/assinatura-email.js gerar identidade/assinatura-email/assinatura.json
# equipe inteira, a partir da planilha exportada:
node scripts/assinatura-email.js gerar identidade/assinatura-email/assinatura.json --csv dados/equipe.csv
```

A saída já traz a conta de cada assinatura:

```
✓ 2 assinatura(s) em identidade/assinatura-email

  pessoa                  peso   caract.  largura
  Marina Okuda          2.7 KB      2781  480 px
  Rafael Bittencourt    2.3 KB      2345  480 px

  instalar.md com o passo a passo de Gmail, Outlook e Apple Mail está na mesma pasta.

  Olhar antes de distribuir:
   · Rafael Bittencourt: telefone "1332221" não é telefone brasileiro válido; ficou de fora

  Falta testar os links: node scripts/assinatura-email.js conferir identidade/assinatura-email
```

Três números, três motivos: **peso** com teto de 20 KB, **caracteres** com teto de 10.000
(é o que o campo de assinatura do Gmail aceita) e **largura** com teto de 600 px.

A lista "Olhar antes de distribuir" é onde aparece o que o spec trouxe torto: telefone que
não é telefone brasileiro (e por isso ficou de fora, em vez de virar link quebrado), logo
fora do `https`, logo que não é PNG, cor com contraste abaixo de 4.5:1 sobre branco, nome
de layout que não existe e largura cortada. Ler essa lista **é** o passo; ela não é enfeite
do comando. Quando alguma assinatura tem problema de verdade, a linha dela ganha um `✖` e o
comando sai com erro.

Uma coisa que o comando faz e ninguém nota: a medida do logo sai só nos atributos
`width` e `height` da imagem, nunca em `width:120px` no `style`. No motor do Word a medida
em atributo continua em pixel, e a medida em CSS é convertida em ponto, que cresce junto
com a escala do Windows. É essa conversão — e não um bug do logo — que faz a assinatura
aparecer gigante pro colega que usa Outlook a 150%. O porquê está no
`templates/design/assinatura-email.md`, com a fonte.

### Passo 7 — Conferir antes de distribuir

```bash
node scripts/assinatura-email.js conferir identidade/assinatura-email
node scripts/verificar.js contraste "#5b6472" "#ffffff"   # cor que não está no spec
```

O `conferir` faz duas frentes. A estática reprova `flex`, `grid`, `background-image`,
imagem em base64, `<style>`, `<script>`, SVG, `var()` do CSS, imagem sem `alt`, imagem sem
medida em atributo, placeholder que sobrou (e diz qual) e assinatura que é imagem só. A de
rede abre cada link e exige resposta 200: link do site, do logo, do WhatsApp e das redes.
Link que virou 404 na assinatura da equipe inteira é o tipo de erro que passa dois anos
despercebido.

Três coisas sobre a parte de rede, pra ninguém ler o resultado errado:

- **Sem rede na máquina**, o comando diz isso em vez de aprovar no escuro
- **Com rede lenta**, `--espera 15000` dá mais tempo por link
- **LinkedIn, Instagram e companhia** devolvem 403 ou 404 pra quem não é navegador, mesmo
  com o link funcionando. Nesses domínios o status vira aviso, não reprovação, e o recado
  pede pra abrir no navegador. Fora deles, 404 é 404

Só o `conferir` fecha o serviço. O `gerar` sozinho diz se a assinatura cabe; ele não sabe
se o logo continua no ar.

Depois do comando, dois olhares que nenhum script faz:

1. Abrir o `assinatura.html` no navegador **com a imagem bloqueada** e ver o que sobra
2. Mandar um e-mail de teste e **responder** esse e-mail: a assinatura aparece duas vezes
   na mesma conversa, e é aí que o exagero fica óbvio

### Passo 8 — Entregar

O script escreve o `instalar.md` junto, neste esqueleto (a versão no arquivo é um pouco
mais longa, com o motivo de cada passo):

```markdown
# Instalar a assinatura — <Empresa>

Gerado em <data> por `scripts/assinatura-email.js`. Cada pessoa tem a pasta dela,
com `assinatura.html` e `assinatura.txt`.

Pastas: `<pessoa-1>`, `<pessoa-2>`

## O que esperar em cada programa
Tabela de sete linhas: Gmail no computador e no celular, Outlook clássico, Outlook
novo, Apple Mail no Mac e no iPhone, Thunderbird — com o jeito de instalar e o que
cada um faz com o HTML ao salvar.

## Gmail (no computador)
1. Abrir o `assinatura.html` no navegador
2. Selecionar tudo e copiar
3. Gmail → engrenagem → Ver todas as configurações → Geral → Assinatura
4. Colar, escolher em "novos e-mails" e em "resposta"
5. Salvar alterações

## Outlook
Outlook clássico (Windows): Arquivo → Opções → E-mail → Assinaturas.
Outlook novo e na web: Configurações → Conta → Assinaturas.

## Apple Mail
1. Mail → Configurações → Assinaturas → + (só pra criar o arquivo). Fechar o Mail
2. Finder → Ir para a pasta → `~/Library/Mail/V<n>/MailData/Signatures`
   (o `<n>` muda conforme a versão do macOS; entrar no maior)
3. Trocar o que está entre `<body>` e `</body>` no `.mailsignature` mais recente
4. Marcar o arquivo como Bloqueado em Obter informações
5. Abrir o Mail

## Depois de instalar
Mandar um e-mail de teste e abrir no celular.
```

E o fechamento no chat, curto:

```
✓ identidade/assinatura-email/marina-okuda/assinatura.html  — 2,7 KB, 480 px
✓ identidade/assinatura-email/marina-okuda/assinatura.txt   — versão em texto puro
✓ identidade/assinatura-email/instalar.md                   — Gmail, Outlook, Apple Mail

A do celular é outra: o app do Gmail no Android e no iPhone só aceita assinatura
em texto, e é pra isso que serve o assinatura.txt.
```

### Passo 9 — Manter

Assinatura é arquivo vivo, e envelhece em silêncio:

- **Gente nova:** acrescentar a pessoa no `assinatura.json` e rodar o `gerar` de novo. As
  outras saem idênticas, porque o spec é o mesmo
- **Gente que sai:** tirar do spec **e** conferir que o e-mail dela não segue respondendo
  com a assinatura antiga. Faz parte do desligamento, junto com `/pessoa`
- **Telefone, cargo ou site que mudou:** um campo no JSON, um comando, todo mundo
  atualizado
- **Uma vez por ano:** rodar o `conferir` na pasta inteira. É o que pega link morto e logo
  que sumiu da hospedagem. Cabe bem como item do `/rotina`

Quando o negócio troca de marca, a assinatura muda junto: as cores vêm do `tokens.css`, e
o `/design-system` é quem mexe lá.

---

## Regras

- **Logo hospedado em https, nunca base64 nem anexo.** O Gmail não mostra imagem embutida, e o base64 estoura sozinho o limite de 10.000 caracteres do campo de assinatura
- **Tabela com CSS inline.** `flex`, `grid` e `background-image` não existem no Outlook clássico, que renderiza com o motor do Word. Isso não é preferência estética
- **Nada de assinatura que é uma imagem só.** Com a imagem bloqueada não sobra contato nenhum, e o texto não pode ser copiado
- **Peso, largura e contagem de caractere saem do comando**, nunca do olho. Se o número divergir do que a skill disse no chat, refazer a partir do arquivo
- **Todo link responde 200 antes de distribuir.** Assinatura da equipe com link morto erra em silêncio por anos
- **Nunca inventar cargo, registro de conselho, telefone ou endereço.** O que faltar entra como `[a confirmar]` visível, e o usuário preenche
- **Telefone pessoal exige o "sim" da pessoa.** Celular de funcionário é dado pessoal na definição da LGPD (Lei 13.709/2018, art. 5º, I — "informação relacionada a pessoa natural identificada ou identificável"), e o tratamento precisa de uma das bases do art. 7º. Publicar o número dele em toda mensagem que ele envia não é decisão que a empresa toma sozinha: perguntar antes, e aceitar um "não" sem insistir. Texto da lei em https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (conferido em 23/09/2026)
- **Nada de pixel de rastreio na assinatura.** Coleta sem aviso, em e-mail pessoal, num lugar onde ninguém espera ser medido. Medir visita do link do site com UTM é outra coisa: mede a página, não a pessoa
- **Profissão com conselho** (medicina, odontologia, psicologia, advocacia, engenharia, fisioterapia) segue regra própria de publicidade, e o número de registro na assinatura costuma ser exigido — mas o que exatamente pode aparecer muda de conselho para conselho, e muda com o tempo. Aqui isso entra como `[a confirmar no conselho]` até alguém checar na resolução vigente. Quem cuida do que pode ser dito é a `/publicidade-regulada`. Esta skill aplica o que já foi decidido, e **não substitui advogado** nem o parecer do conselho
- **Fronteira com as vizinhas:** `/email` é a campanha que vai pra uma lista, com preheader e descadastro. `/email-profissional` escreve o **texto** de um e-mail para uma pessoa, e puxa nome e cargo da memória. `/design-system` define cor e tipografia; aqui elas são só aplicadas. `/impressao` cuida do cartão de visita, que é o mesmo dado noutro suporte
- **O Contex OS entrega o arquivo; quem instala é o usuário.** A skill não entra na conta de e-mail de ninguém, não configura servidor e não altera o programa de e-mail
