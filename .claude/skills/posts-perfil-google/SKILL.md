---
name: posts-perfil-google
description: >
  Escreve o mês de posts do Perfil da Empresa no Google (o que aparece no Maps e na busca
  "perto de mim"): de 4 a 8 posts nos três tipos (novidade, oferta com data, evento), as
  perguntas e respostas pra semear a seção do perfil, a foto de cada semana e os três
  números do mês no rodapé. Cada post passa por um script que confere o que o Google reprova:
  gancho de até 80 caracteres, corpo de até 1.500, oferta com início e fim no futuro, botão
  da lista fechada, sem telefone nem link no corpo.
  Use quando o usuário disser "post pro Google Meu Negócio", "postar no perfil do Google",
  "atualizar meu Google", "promoção no Google Maps", "meu perfil do Google tá parado",
  "o que eu coloco no Google esse mês", "aviso de feriado no Google", "post no GMB",
  "perguntas e respostas do Google", ou /posts-perfil-google.
---

# /posts-perfil-google — O mês do Perfil no Google

> **Convenção de pastas:** a saída vai em `conteudo/google-perfil/<AAAA-MM>.md`. Na convenção **por cliente**, `clientes/<Nome>/conteudo/google-perfil/<AAAA-MM>.md`. A pasta nasce no primeiro mês.

A padaria da esquina e a clínica do bairro têm o mesmo problema: quem procura "perto de
mim" acha o perfil, vê a última foto de 2024 e liga pro concorrente que postou ontem. O
Perfil da Empresa traz cliente sem pagar anúncio, e quase ninguém alimenta por falta do
texto pronto. Pior: quando alimenta, o post volta reprovado sem explicação, porque tinha o
telefone no corpo ou a oferta saiu sem data. Ninguém avisa. Esta skill entrega o mês
inteiro escrito e passado no script antes de o dono colar no Google.

## Dependências

- **Contexto:** `_memoria/empresa.md` (o que vende, endereço, horário, se tem site ou só WhatsApp) e `_memoria/preferencias.md` (a voz; post de perfil soa falso quando não é o dono falando)
- **Cliente real:** `_memoria/publico.md`, se existir: as perguntas que chegam no WhatsApp viram a seção de Perguntas e respostas
- **Oferta:** `_memoria/oferta.md`, se existir: preço, condição e o que está prometido. É de lá que sai a oferta do mês, nunca de um "de R$ X por R$ Y" inventado
- **Fotos:** `biblioteca.md` (`/biblioteca`), tabela "Fotos e imagens": a lista de fotos por semana nasce daqui antes de nascer do celular
- **Auditoria anterior:** `seo/03-google-meu-negocio.md`, se o `/seo` já rodou: categoria, descrição e os 4 posts iniciais de lá. Esta skill continua o trabalho, não refaz
- **Molde:** `templates/crescimento/perfil-google.md`, com o que o Google reprova (fonte e data), os três tipos, a lista fechada de botões, as formas de gancho, o que a lei pede da oferta e onde ler os três números
- **Script:** `scripts/perfil-google.js`: esqueleto do mês com as semanas calculadas, contagem de caracteres, conferência de cada post, os números contra o mês anterior
- **Conferência:** `node scripts/verificar.js datas` e `texto`
- **Saída:** `conteudo/google-perfil/<AAAA-MM>.md` (um arquivo por mês)

---

## Workflow

### Passo 1 — Levantar o mês

Primeiro o ramo, porque hotel e pousada mudam o mix do mês antes de qualquer pergunta
(a regra está no Passo 3). Se `_memoria/empresa.md` já diz o que o negócio vende e o
horário, não perguntar de novo. O que falta vai numa mensagem só, porque é levantamento:

> 1. "Qual mês a gente vai montar?"
> 2. "Tem promoção com prazo nesse mês? Qual, quanto, de que dia a que dia?"
> 3. "Muda alguma coisa: horário, produto novo, alguém novo na equipe, feriado em que abre ou fecha?"
> 4. "Tem algum evento, mesmo pequeno: degustação, oficina, plantão, dia D?"
> 5. "Quais fotos você tem desse mês ou consegue tirar essa semana?"
> 6. "Quais são as três perguntas que mais chegam no WhatsApp?"

Feriado nacional do mês sai por comando, não de cabeça, e é o primeiro post de novidade
quando o negócio abre ou fecha:

```bash
node -e 'const br=require("./scripts/br.js"); const f=br.feriados(2026); for (const [d,n] of Object.entries(f)) if (d.endsWith("/10")||d.endsWith("/11")) console.log(d,n)'
```

Se o usuário não tem promoção, o mês sai com novidade e evento e a oferta fica marcada
`[sem oferta este mês]`. Nunca inventar desconto pra cumprir o mix.

### Passo 2 — Gerar o esqueleto

Antes de escolher quantos posts, ver quantas semanas o mês tem de verdade:

```bash
node scripts/perfil-google.js semanas 2026-10
node scripts/perfil-google.js esqueleto 2026-10 --posts 6 --saida conteudo/google-perfil/2026-10.md
```

O script calcula as semanas de segunda a domingo e numera de 1 até a última, sempre
começando pela semana do dia 1. A ponta que entra no mês com menos de quatro dias não vira
semana separada: os dias dela contam na vizinha, então nenhum dia do mês fica fora e a
tabela nunca começa em "Semana 2". Em fevereiro de 2026, que começa num domingo, a Semana 1
vai de 01/02 a 08/02.

A distribuição é um post por semana na terça. Se a conta pedir mais posts que semanas, o
excedente cai na quinta e depois no sábado, nunca dois no mesmo dia; terça que cai fora do
mês vira o primeiro dia da semana. A data sai com o dia da semana já conferido contra o
calendário, e o resto fica `[preencher]`.

Quatro posts pra quem está começando ou tem pouca foto; seis é o normal; oito só quando há
promoção e evento no mesmo mês. Acima disso a cadência não sobrevive a fevereiro.

Se o arquivo do mês já existe, o script para e não sobrescreve: aí o trabalho é editar o que está lá.

### Passo 3 — Escrever os posts

Cada post tem um gancho de até 80 caracteres na primeira linha, o corpo entre 150 e 400
caracteres, uma foto, um botão da lista fechada e, se é oferta ou evento, título, início
e fim. As seis formas de gancho estão no molde; a regra é uma só: o quê, quando, e um
motivo, na palavra do cliente (`_memoria/publico.md`).

O que entra no corpo é o que a pessoa perguntaria no balcão: pra quem é, quanto custa, até
quando, o que precisa fazer. O que não entra: telefone (vai no botão "Ligar agora"), link
(vai no botão), hashtag, caixa alta, adjetivo que serve pra qualquer negócio. Hashtag o
perfil ignora.

Contar antes de colar, por comando:

```bash
node scripts/perfil-google.js contar --texto "Pão de fermentação natural todo sábado às 7h
A fornada sai às 7h e costuma acabar antes das 10h. São 40 pães por sábado."
```

Oferta segue o CDC: data de início e de fim **no texto**, não só no campo, condição
escrita, e "de R$ 42 por R$ 35" só se os R$ 42 foram cobrados de verdade antes. O script
recusa oferta sem prazo no corpo, avisa quando falta a linha `Termos`, calcula o desconto e
acusa "por" maior que "de". Quem garante que o "de" existiu é o dono. Serviço de saúde,
jurídico ou financeiro passa antes pelo `/publicidade-regulada`.

Hotel e pousada são a exceção do ramo: o Google não aceita post de oferta nem post que
mencione desconto nesse tipo de perfil. Nesse caso o mês sai com novidade e evento, e o
preço fica fora do texto.

O esqueleto de um post, como o script lê:

````markdown
## Post 2 — Semana 2 (05/10 a 11/10) — Oferta
- **Publicar em:** 06/10/2026 (ter)
- **Foto:** biblioteca: bolo de cenoura da vitrine
- **Botão:** Fazer o pedido → https://padariasaojoao.com.br/pedido
- **Título:** Bolo de cenoura de R$ 42 por R$ 35 até 20/10
- **Início:** 06/10/2026
- **Fim:** 20/10/2026
- **Termos:** válido pra retirada na loja, 1 bolo por pedido

```texto
Bolo de cenoura inteiro de R$ 42 por R$ 35 até o dia 20
Cobertura de brigadeiro feita na casa, 1,2 kg, serve 12 pessoas. Vale pra retirada
na loja de terça a sábado, das 8h às 18h. Um por pedido.
```
````

Botão com link leva UTM quando o negócio mede (`/medir`):
`node scripts/utm.js https://site.com.br/pedido --source google --medium perfil --campaign bolo-outubro`.

### Passo 4 — Semear as Perguntas e respostas

A seção de Perguntas e respostas do perfil é pública e qualquer pessoa responde. Quando
o dono não ocupa, o cliente responde errado e a resposta errada fica. As perguntas vêm do
WhatsApp da semana (Passo 1, pergunta 6) e de `_memoria/publico.md`; o molde traz as cinco
que todo negócio local recebe. Mínimo de três, resposta curta, sem telefone: "pelo botão
Ligar do perfil" resolve.

```markdown
## Perguntas e respostas

1. **P:** Vocês fazem entrega?
   **R:** Sim, no bairro e nos vizinhos, pedido mínimo de R$ 30, pelo botão Fazer o pedido.
```

Uma por dia na primeira semana, depois uma por semana. Pergunta nova que apareceu no mês
entra no arquivo do mês seguinte.

### Passo 5 — Fechar a lista de fotos e os três números

A tabela "Fotos da semana" tem uma linha por semana do mês, com o arquivo (caminho no
workspace ou "biblioteca: o que é") e onde entra (post, galeria do perfil). Foto que
ainda não existe fica como tarefa em `tarefas.md` com a data de tirar, não como
`[preencher]` eterno. Arte com texto em cima é do `/carrossel`, no formato quadrado.

O rodapé "Números do mês" fica com três linhas: Visualizações, Chamadas e Rotas (ou
Cliques no site, pra negócio sem porta aberta). O dono copia da aba Desempenho do perfil
no primeiro dia útil do mês seguinte, e a variação contra o mês anterior sai por comando:

```bash
node scripts/perfil-google.js numeros conteudo/google-perfil/2026-10.md
```

O comando lê o arquivo do mês anterior na mesma pasta e devolve a tabela pronta pra colar.
Variação de cabeça não vale. Esse é o único lugar em que a skill toca em número de resultado; a leitura do que os
canais fizeram no mês é do `/medir`, que lê estes três daqui.

### Passo 6 — Conferir e entregar

```bash
node scripts/perfil-google.js conferir conteudo/google-perfil/2026-10.md
node scripts/verificar.js datas conteudo/google-perfil/2026-10.md
node scripts/verificar.js texto conteudo/google-perfil/2026-10.md
```

O primeiro comando precisa terminar em "Tudo certo." ou só com avisos. Ele confere, post a
post: nenhum `[preencher]` sobrando no texto, gancho de até 80 caracteres, corpo de até
1.500, tipo entre os três, dia da semana batendo com a data, semana do título batendo com
a data, foto presente (e formato e peso, quando o arquivo está no workspace), botão da
lista fechada com link `https://`, oferta e evento com título, início e fim válidos e no
futuro, prazo da oferta escrito no corpo, telefone, link e e-mail fora do corpo, texto não
repetido no mês, pelo menos um post por semana, três perguntas com resposta já escrita,
tabela de fotos e as três linhas de números.

Erro derruba o comando (sai com código 1); aviso não. Se acusar erro, corrigir o texto e
rodar de novo; nunca apagar a linha que o script reclamou só pra ele passar. Aviso a gente
lê um por um e decide: título de 67 caracteres pode ficar, semana sem post não devia.
`--json` no fim devolve o mesmo laudo estruturado, quando outro passo precisa ler.

Entregar dizendo, em uma linha, quantos posts, de que tipos, e que o dono publica um por
vez na data marcada: a skill escreve, não aperta o botão. O lembrete de cada data vai
pro `tarefas.md`, e a cadência do mês seguinte pode virar rotina pelo `/rotina`
("todo dia 25, montar o mês do Perfil do Google").

O arquivo inteiro, como sai:

````markdown
# Perfil do Google — outubro de 2026

## Semanas do mês
| Semana | De | Até | Dias no mês |
|---|---|---|---|
| 1 | qui 01/10/2026 | dom 04/10/2026 | 4 |

## Post 1 — Semana 1 (01/10 a 04/10) — Novidade
- **Publicar em:** 01/10/2026 (qui)
- **Foto:** ...
- **Botão:** Saiba mais → https://...

```texto
[gancho de até 80 caracteres]
[corpo]
```

## Post 2 — ... — Oferta
## Post 3 — ... — Evento
...

## Perguntas e respostas
1. **P:** ...
   **R:** ...

## Fotos da semana
| Semana | Foto | Onde usar |
|---|---|---|

## Números do mês
| Número | Este mês | Mês anterior | Variação |
|---|---|---|---|
| Visualizações | [preencher] | | |
| Chamadas | [preencher] | | |
| Rotas | [preencher] | | |
````

### Passo 7 — Fechar o ciclo no mês seguinte

Ao montar o mês seguinte, ler o anterior: qual post teve mais chamada ou rota (o dono vê
por post na aba Desempenho), qual pergunta nova apareceu, qual foto ficou boa. O tipo que
funcionou repete com assunto novo. O que não funcionou, não. Mix não é obrigação.
Depoimento que chegou por avaliação no perfil é do `/responder-avaliacoes` e vai pra
`biblioteca.md`.

---

## Regras

- Telefone nunca vai no corpo. É a regra que mais reprova post no Google, e o script acusa. O número vai no botão "Ligar agora", que puxa o telefone verificado do perfil, e esse botão não leva link nenhum
- Oferta sem data não sai: início e fim no campo e no texto, fim no futuro, condição escrita. Sem promoção real no mês, o mês sai sem oferta; nunca inventar desconto pra cumprir o mix
- **"De X por Y" só com X praticado de verdade.** Publicidade com preço falso é enganosa (CDC, art. 37, § 1º). O script calcula o desconto; o dono garante que o preço antigo existiu
- **Botão só da lista fechada.** Reservar, Fazer o pedido, Comprar, Saiba mais, Inscrever-se, Ligar agora ou nenhum. Outro nome não existe no formulário
- Foto própria em todo post. Banco de imagem e imagem gerada por IA ficam fora; sem foto, o post espera a foto e o pedido de tirar vai pro `tarefas.md`
- Gancho, corpo, dia da semana, desconto e variação de número saem contados por `scripts/perfil-google.js`, nunca de leitura
- A skill não publica pelo usuário: entrega o texto com a data, e colar no perfil é ação dele, uma por vez. Ferramenta que agenda post no Google entra pelo `/conectar`, se existir chave no `.env`
- Confirmar sempre horário de feriado, preço da oferta e link do botão antes de fechar o mês: são os três dados que mudam entre a conversa e a publicação
- **Hotel e pousada não publicam oferta** nem post que mencione desconto ou promoção: é regra do Google pro ramo, e vale pro mês inteiro. Nesse caso, novidade e evento sem preço no texto
- **Número de desempenho se copia, não se estima.** Visualizações, Chamadas e Rotas saem da aba Desempenho do perfil, colados pelo dono. Enquanto ele não abrir a aba, a linha fica `[preencher]`; mês sem dado não ganha número plausível
- Post do mês passado não volta com outra data. O Google marca duplicado e o cliente percebe
- **Fronteira com as vizinhas:** o `/seo` audita o perfil uma vez (categoria, descrição, fotos, os 4 posts iniciais) e esta skill alimenta todo mês; o `/calendario` planeja o Instagram e o blog, não o perfil; a arte com texto sai do `/carrossel`; a cadência e o lembrete são do `/rotina`; resposta a avaliação é do `/responder-avaliacoes`; o link rastreável é do `/medir` com `scripts/utm.js`; saúde, direito e finanças passam pelo `/publicidade-regulada` antes
- **Dado sensível (LGPD):** foto de cliente, paciente ou aluno só com autorização escrita (`/autorizacao`); nome de cliente não entra em post nem em resposta de pergunta; o WhatsApp de onde saem as perguntas não vai pra ferramenta externa
- **Não substitui advogado.** A skill aponta o que o CDC pede da oferta e o que o Google reprova. Promoção com sorteio, brinde condicionado ou produto regulado passa por advogado antes de sair
