---
name: autorizacao
description: >
  Monta o termo que falta antes de publicar o cliente ou fechar o projeto: autorização de
  imagem, voz e depoimento (foto de paciente, antes e depois, vídeo, áudio, foto de evento,
  foto de equipe, imagem de menor) com a base da LGPD e do direito de imagem, e o aceite de
  entrega que encerra as revisões e dispara a parcela final. Sai o termo pra assinar em HTML
  e .docx, a versão curta pra mandar no WhatsApp, e o "sim" gravado na biblioteca.
  Use quando o usuário disser "preciso que ela autorize a foto", "posso postar o depoimento
  dele?", "quero usar o antes e depois", "o paciente deixa usar a imagem?", "tirei foto no
  evento, posso publicar?", "termo de uso de imagem", "o cliente precisa assinar que recebeu",
  "termo de aceite", "como fecho a entrega pra ele parar de pedir ajuste", "ele pediu pra
  tirar a foto do ar", ou /autorizacao.
---

# /autorizacao — O sim por escrito

> **Convenção de pastas:** a saída vai em `contratos/termos/<tipo>-<pessoa>.html` (com o `.md`, o `.json`, a versão curta e a prova ao lado). Na convenção **por cliente**, `clientes/<Nome>/contratos/termos/`. A pasta nasce no primeiro termo.

O dentista posta o sorriso da paciente, o fotógrafo repassa o vídeo da noiva elogiando, o
criador usa o áudio do aluno no reels. Todos perguntaram "posso?" de boca, e ninguém guardou
a resposta. Enquanto a relação vai bem, não acontece nada. Quando azeda, a peça publicada vira
pedido de indenização, e indenização por uso comercial de imagem não exige prova de prejuízo.
Do outro lado da mesma moeda: o projeto que nunca acaba porque ninguém assinou que recebeu.
Esta skill resolve os dois com uma página cada, e com o sim registrado onde as outras skills
vão procurar.

> **Isto não é assessoria jurídica.** A skill monta o termo com a estrutura usual e a base
> legal conferida. Imagem de menor em peça pública, cessão de direito autoral, campanha paga
> de terceiro, disputa já aberta sobre qualidade e valor alto retido passam por advogado. A
> skill diz isso na entrega, uma vez.

## Dependências

- **Contexto:** `_memoria/empresa.md` — razão social, CNPJ, cidade, responsável, se a profissão tem conselho (CRO, CRM, CRP), canal de contato
- **Tom:** `_memoria/preferencias.md` — a versão curta vai no WhatsApp com a voz do usuário, não com voz de cartório
- **De onde vem o pedido:** `biblioteca.md` (depoimento ou foto com "Autorizado" vazio), `vendas/pos-venda/` (depoimento recém-colhido), `contratos/<cliente>-<data>/` (o contrato que o aceite fecha)
- **Referência:** `templates/juridico/autorizacao-de-imagem.md` — as quatro leis com fonte e data, a tabela por situação, cláusula por cláusula, o que o conselho profissional exige, como pedir, revogação
- **Referência:** `templates/juridico/aceite-de-entrega.md` — o que a lei diz sobre receber um trabalho, o que o aceite precisa ter, os três desfechos, as situações que voltam
- **Molde compartilhado:** `templates/crescimento/autorizacao-de-uso.md` — o termo de nome e número de resultado que o `/case` usa; mesma base, outro objeto
- **Script:** `scripts/autorizacao.js` — exemplo do JSON, conferência, geração dos três arquivos, registro do sim na biblioteca
- **Word e PDF:** `scripts/gerar-docx.js` e `scripts/gerar-pdf.js`
- **Conferência:** `node scripts/verificar.js html` e `texto`
- **Saída:** `contratos/termos/<tipo>-<pessoa>.json`, `.md`, `.html`, `-whatsapp.md` e `-prova.<png|docx>`, com `<tipo>` em `imagem`, `depoimento` ou `aceite`

---

## Workflow

### Passo 1 — Descobrir qual termo é

Três instrumentos, e o pedido do usuário quase sempre diz qual:

| Termo | Quando | O que fecha |
|---|---|---|
| **imagem** | foto, vídeo ou áudio de uma pessoa vai aparecer em peça do negócio | o direito de imagem (Código Civil, art. 20) e o dado pessoal (LGPD) |
| **depoimento** | a fala de um cliente, em texto, áudio ou vídeo, vai virar prova | o mesmo, com a fala literal dentro do termo |
| **aceite** | o trabalho foi entregue e precisa de alguém dizendo "recebi" | as revisões, a parcela final, o começo da garantia |

"Quero contar o resultado do cliente com número" é o `/case`, que tem termo próprio. NDA,
distrato e termo de responsabilidade são anexos do `/contrato`. Quando o usuário não sabe qual
é: "o que vai ser usado é a imagem ou a fala de alguém, ou é o cliente confirmando que recebeu
o trabalho?" Uma pergunta, e segue.

Antes de perguntar mais, olhar o que já existe. Em `biblioteca.md`, depoimento ou foto com
"Autorizado" em branco ou "não" é candidato. O caso mais comum é o depoimento que o
`/pos-venda` colheu ontem, em `vendas/pos-venda/`. E o contrato do cliente, em `contratos/`,
diz o que foi combinado, inclusive se tem cláusula de confidencialidade que veta o uso.

### Passo 2 — Levantar o que entra no termo

Levantamento é uma mensagem só. Pra **imagem ou depoimento**, o que `_memoria/empresa.md`
não responde:

> 1. "Quem é a pessoa: nome completo, CPF, e a relação com você (cliente, paciente, aluna, funcionária, responsável por um menor)?"
> 2. "O que exatamente vai ser usado? Cada foto, vídeo ou áudio, com a data em que foi feito e quem fez" (se foi outro fotógrafo, ele também precisa autorizar)
> 3. "Se é depoimento: me manda a fala literal, ou o print, que eu transcrevo sem melhorar"
> 4. "Onde vai aparecer: Instagram, site, proposta, impresso, anúncio pago?"
> 5. "Com o nome dela ou sem? Com rosto ou sem?"
> 6. "Por quanto tempo? Se não tiver preferência, uso 2 anos, e 10 dias pra tirar do ar se ela pedir"
> 7. "É foto de tratamento, de saúde, de corpo? E a pessoa é menor de idade?"

A pergunta 7 muda o termo (cláusula de dado sensível, cláusula do responsável) e muda se a
peça pode sair: profissão com conselho tem regra própria, e o `/publicidade-regulada` confere
a peça antes de publicar. Médico publica anônimo e educativo; dentista publica com nome e CRO
só o que ele mesmo executou; psicólogo não publica depoimento de paciente, mesmo autorizado.
A tabela está no molde.

Pra **aceite**, o que o contrato não responde:

> 1. "Quem recebe: nome, documento, e quem assina pela empresa?"
> 2. "O que foi entregue, item a item, e onde está cada um (link, pasta, e-mail com data)?"
> 3. "Em que dia ficou disponível?" (a entrega, não a assinatura)
> 4. "Ficou alguma pendência sua? Qual, e até quando você resolve?"
> 5. "Tem parcela final? Quanto, e vence em quantos dias úteis depois do aceite?"
> 6. "Quantos dias de garantia você dá pra erro do que foi entregue?"
> 7. "O cliente é pessoa física contratando pra uso próprio?" (aí é consumidor, e o CDC entra)

Nome de pessoa, CPF e telefone entram no JSON e no termo. Não vão pra WebSearch nem pra
ferramenta externa.

### Passo 3 — Escrever o JSON e conferir

```bash
node scripts/autorizacao.js exemplo depoimento --saida contratos/termos/depoimento-carla-mendes.json
```

Trocar cada valor pelo dado real (os documentos do exemplo são de teste). `o_que` começa com
artigo ("o depoimento em vídeo…", "as duas fotos…"), porque a versão curta lê "posso usar
<o_que>?". Depois:

```bash
node scripts/autorizacao.js conferir contratos/termos/depoimento-carla-mendes.json
```

O script valida CPF e CNPJ, data, finalidade (LGPD, art. 8, § 4: autorização genérica é
nula), canais, prazo, a fala literal no depoimento, e acusa placeholder. Termina em "Tudo
certo." ou lista o que falta. Ele também avisa, sem barrar: foto feita por terceiro, dado de
saúde sem anonimato, menor de idade, pessoa da equipe. Cada aviso vira uma linha na conversa
com o usuário, na palavra dele, não no texto do script.

### Passo 4 — Calcular as datas por comando

Nada de data na mão. O `conferir` já mostra:

- a validade do termo: anos somados no dia de igual número (Código Civil, art. 132, § 3)
- o exemplo de retirada: pedido hoje, sai do ar até quando (dias corridos, empurrado pro dia útil seguinte se cair em feriado, art. 132, § 1)
- no aceite: a garantia contratual contada da entrega, o prazo do CDC, art. 26 (30 ou 90 dias) quando o cliente é consumidor, e o vencimento da parcela final em dias úteis

Feriado da cidade que fecha banco entra com `--feriado DD/MM`. Se o usuário discordar de uma
data, refazer a partir do dado bruto (data de entrega, prazo), nunca ajustar a saída pra bater.

### Passo 5 — Gerar o termo, a versão curta e o Word

```bash
node scripts/autorizacao.js gerar contratos/termos/depoimento-carla-mendes.json --tokens identidade/tokens.css
node scripts/verificar.js html contratos/termos/depoimento-carla-mendes.html
node scripts/gerar-docx.js contratos/termos/depoimento-carla-mendes.md --cabecalho "<nome do negócio>"
```

Saem três arquivos, e o `.docx` é o quarto. O `--tokens` puxa a cor e a fonte da marca; sem
ele, o termo sai sóbrio, azul-escuro em fundo branco, o que pra documento de assinatura
é o certo. O HTML é o que se imprime ou vira PDF (`node scripts/gerar-pdf.js`); o `.docx` é
pra quem quer assinar no Word, e é por ele que o jurídico do outro lado devolve alteração
marcada (`/word`); a versão curta é o que vai no WhatsApp.

O termo de imagem ou depoimento sai com esta estrutura (o script escreve; o esqueleto é pra
saber o que conferir):

```markdown
# Autorização de uso de depoimento

Eu, <pessoa>, CPF <n>, cliente de <negócio>, autorizo <negócio>, CNPJ <n>,
representada por <responsável>, a usar o que está descrito abaixo, nas condições deste termo.

## 1. O que autorizo
- <o item, de <data> (por <quem fez>)>
  - Texto literal: "<a fala, sem melhorar>"
- Com meu nome, do jeito que está neste termo  |  Sem meu nome, sem rosto identificável

## 2. Pra quê
Finalidade: <uma frase concreta>. Nada além disso.

## 3. Onde pode aparecer
- <canal por canal>

## 4. Condições
1. Gratuito, sem vínculo novo.
2. Vale por 2 anos a partir de <data>, até <data calculada>.
3. Revogação por <canal>, sem custo e sem explicar; sai do ar em 10 dias corridos.
4. Sem edição além de corte e correção; sem promessa de resultado a terceiros.
[5. Dado de saúde: consentimento específico e destacado (LGPD, art. 11, I)]
[6. Menor: assino como responsável legal (LGPD, art. 14, § 1)]

Base: Código Civil, art. 20; LGPD, art. 7, I, art. 8 e art. 18, IX.
<Cidade>, <data por extenso>. Duas assinaturas, com documento.
```

O aceite segue a mesma lógica: projeto e contrato, quem recebe, tabela do entregue com
**onde está**, ressalvas com data, o que o aceite fecha (revisões encerradas, parcela final
com dia da semana, garantia até tal dia, prazo do CDC quando consumidor, quem guarda cópia),
base legal e assinaturas.

Ler o termo gerado antes de entregar. O que conferir a olho: o `o_que` faz sentido na frase
"posso usar <o_que>?"; a fala literal é a fala, não uma versão melhorada; a finalidade é
concreta ("mostrar o resultado de um clareamento a quem procura a clínica"), não "fins de
divulgação"; nenhum canal a mais do que o usuário pediu.

### Passo 6 — Mandar e esperar o sim

A versão curta é a mensagem. Ela carrega o conteúdo inteiro (o quê, onde, pra quê, com ou
sem nome, prazo, como tirar), termina em "me responde 'autorizo' que já vale", e por isso a
resposta escrita conta como assinatura: a pessoa leu o que autorizou. Adaptar à voz de
`preferencias.md` e ao canal (`/whatsapp` calibra); não cortar nenhum dos seis pontos.

O momento certo é depois do elogio, nunca junto do serviço. Se o depoimento ainda não foi
pedido, o `/pos-venda` pede primeiro; a autorização vem na mensagem seguinte. Pedir os dois
juntos derruba a taxa de resposta.

Enquanto o sim não chega:

- `assinatura.data` fica vazia no JSON, e a linha da biblioteca sai como "pendente, termo em <caminho>"
- Nenhuma peça pública usa o material. O `/carrossel`, a `/landing` e a `/proposta` leem a coluna "Autorizado" e param no "pendente"
- `tarefas.md` ganha: `- [ ] Cobrar autorização de <pessoa> — <data +3 dias úteis> (/autorizacao)`. No aceite, o prazo de aceite tácito do contrato, se houver

Se a pessoa hesita no nome, oferecer sem nome. No rosto, sem rosto. No anúncio pago, só o
orgânico. Em tudo, agradecer e parar. O usuário decide se insiste; a skill não escreve
segunda mensagem de pressão.

### Passo 7 — Registrar o sim

Chegou o "autorizo" ou o "aceito" (mensagem, `.docx` assinado, assinatura eletrônica ou
papel). Salvar a prova ao lado do termo e registrar:

```bash
node scripts/autorizacao.js registrar contratos/termos/depoimento-carla-mendes.json --data 23/09/2026 --meio whatsapp --prova contratos/termos/depoimento-carla-mendes-prova.png
```

O script grava data, meio e prova no JSON, e em imagem e depoimento atualiza `biblioteca.md`
sozinho: acha a linha pelo nome da pessoa e troca a coluna "Autorizado" (ou "Direitos", na
tabela de fotos) por `sim, <data> (<caminho do termo>)`; se não acha, acrescenta a linha na
tabela certa; se a biblioteca não existe, cria com o formato do `/biblioteca`. Mostrar a linha
ao usuário. Na convenção por cliente, apontar a biblioteca certa com `--biblioteca`.

O `registrar` imprime as linhas de `tarefas.md` prontas pra colar. Em imagem e depoimento,
uma em **Depois**: renovar ou encerrar a autorização na data em que ela vence. No aceite,
uma em **Agora** (a parcela final, com dia da semana, recontada a partir do dia da
assinatura, que o `/cobranca` acompanha) e duas em **Depois** (fim da garantia e, se o
cliente é consumidor, fim do prazo do art. 26). Feriado local muda essas datas: passar o
mesmo `--feriado DD/MM` do `conferir`.

E o marco no `/pos-venda`: aceite assinado é "acabou de entregar", a janela do depoimento.

**Se o termo voltar alterado** em vez de um "autorizo" seco, não registrar como assinado
antes de ver o que mudou:

```bash
node scripts/gerar-docx.js --comparar contratos/termos/<tipo>-<pessoa>.docx dados/<tipo>-devolvido.docx
```

O `/word` mostra o que saiu e o que entrou. Canal riscado, prazo encurtado, uma condição
escrita à mão no meio, a cláusula de revogação apagada: qualquer uma muda o que está
autorizado. O caminho é refazer o JSON com o que a pessoa aceitou e gerar de novo, não
assinar por cima. Pra rever só a linha da biblioteca, sem tocar em arquivo nenhum:
`node scripts/autorizacao.js linha <termo.json>`.

### Passo 8 — Entregar

Rodar antes de mostrar:

```bash
node scripts/verificar.js html contratos/termos/<tipo>-<pessoa>.html
node scripts/verificar.js texto contratos/termos/<tipo>-<pessoa>-whatsapp.md
```

A entrega é curta: o que o termo autoriza (ou o que o aceite fecha) em duas linhas, as datas
calculadas com dia da semana, os avisos do script na palavra do usuário, a versão curta colada
na conversa pra ele copiar, e a frase de que isto não substitui advogado quando o caso pedir
(menor, saúde, terceiro, disputa). Os arquivos ficam em `contratos/termos/`.

### Revogação: "ele pediu pra tirar"

Sem perguntar por quê. Listar onde a peça está (grep pelo nome da pessoa em `conteudo/`,
`site/`, `propostas/`, `biblioteca.md`), tirar do ar dentro do prazo do termo, responder à
pessoa confirmando a data em que saiu, marcar a linha da biblioteca como `revogado em <data>`
e manter o termo, a prova e o JSON. Não apagar: são o registro de que o uso foi autorizado
enquanto durou. Peça repostada por terceiro: avisar o terceiro por escrito no mesmo dia.

---

## Regras

- **Sem termo, a peça não sai.** Depoimento, foto ou vídeo de pessoa sem `assinatura.data` no JSON fica "pendente" na biblioteca e nenhuma skill consumidora usa. "Ele falou que podia" não é registro; a resposta escrita é
- **Finalidade determinada, sempre.** O termo diz pra quê e onde. "Autorizo o uso da minha imagem em qualquer mídia" é a autorização genérica que a LGPD, art. 8, § 4, chama de nula, e o script barra finalidade vazia
- **Revogável, e o negócio consegue revogar.** Cláusula de revogação com canal e prazo de retirada é obrigatória (LGPD, art. 8, § 5, e art. 18, IX). "Irrevogável e irretratável" não entra
- **Fala literal.** Corrigir digitação, sim. Melhorar a frase, cortar ressalva ou juntar duas falas, não. Frase cortada que muda o sentido é uso fora do autorizado
- **Documento e data não se inventam.** CPF, CNPJ, data de captação, valor e nome entram como o usuário deu, ou ficam em branco até ele responder. O script recusa documento cujo dígito não fecha e recusa placeholder esquecido, e é pra recusar mesmo: termo com CPF errado não prova nada, e quem descobre isso é o advogado do outro lado
- **Toda data passou pelo comando.** Validade, retirada, garantia, prazo do CDC e parcela final saem do `scripts/autorizacao.js`. Data editada na mão que diverge é regenerada, não corrigida
- **Dado sensível e menor mudam o termo e o destino.** Foto de tratamento leva a cláusula do art. 11, I; imagem de criança é assinada pelo responsável com a cláusula do art. 14, § 1, e passa por advogado antes de peça pública. Profissão com conselho: o `/publicidade-regulada` confere a peça; a autorização não afasta a regra do conselho
- **Quem fez a foto também autoriza.** Imagem feita por outro fotógrafo tem dono (Lei 9.610/1998, art. 29). O script avisa quando `por` não é o negócio
- **Aceite lista onde está cada item.** "Entreguei tudo" não se prova; link com data se prova. Entrega sem `onde` é erro do script, não aviso
- **Aceite com ressalva é aceite.** A pendência entra com data, o pagamento e a garantia seguem. Recusa por gosto do que foi feito conforme o contrato não impede o aceite (Código Civil, art. 615), mas a discussão vai pro contrato, não pro WhatsApp
- **Garantia não encurta o CDC.** Cliente consumidor tem 30 ou 90 dias do art. 26 pra vício aparente, e o aceite escreve os dois prazos
- **Não substitui advogado.** Dizer isso na entrega, uma vez, quando o caso pedir: menor, cessão de direito autoral, campanha de terceiro, disputa aberta, valor alto retido
- **Dado pessoal fica no workspace (LGPD).** Nome, CPF, telefone e a foto ficam em `contratos/termos/` e no JSON. Não vão pra WebSearch, pra prompt de ferramenta externa nem pra exemplo de comando na conversa
- **Fronteira com as vizinhas:** o `/contrato` é a prestação de serviço (NDA, distrato e termo de responsabilidade são anexos dele); o `/case` conta o resultado com número e tem termo próprio no molde compartilhado; o `/pos-venda` pede o depoimento na hora certa e recebe o marco do aceite; o `/biblioteca` cataloga e lê a coluna que esta skill preenche; o `/cobranca` acompanha a parcela que o aceite dispara; o `/publicidade-regulada` confere a peça de profissão com conselho; o `/evento` cuida do aviso de imagem na entrada. Esta skill escreve o termo, calcula as datas e registra o sim, nada além
- **Revogação se cumpre no prazo, sem perguntar por quê.** E o registro fica
