---
name: publicidade-regulada
description: >
  Confere post, anúncio, bio ou landing de profissão regulada (advogado, médico, dentista,
  psicólogo, corretor de imóveis) contra a regra do conselho e a política de anúncios da Meta,
  e devolve o laudo por regra violada, com artigo, data de vigência e fonte, mais a peça
  reescrita mantendo a mensagem. O que texto não pega (antes e depois, selfie com paciente,
  equipamento na foto, segmentação de idade) entra por checklist declarado.
  Use quando o usuário disser "posso postar isso?", "esse anúncio vai ser reprovado?",
  "pode falar de preço na odontologia?", "advogado pode dizer que ganhou a causa?",
  "meu anúncio foi reprovado pela Meta", "dentista pode postar antes e depois?",
  "isso dá processo no conselho?", "confere se a bio tá dentro da regra do CRM",
  "recebi notificação do conselho por um post", ou /publicidade-regulada.
---

# /publicidade-regulada — O que o conselho deixa dizer

> **Convenção de pastas:** o laudo vai junto da peça quando ela mora no workspace (`conteudo/<pasta-da-peça>/laudo-publicidade.md`, `site/<nome>/laudo-publicidade-<AAAA-MM-DD>.md`); peça avulsa, texto colado ou anúncio reprovado vai em `analises/publicidade-<slug>-<AAAA-MM-DD>.md`. Na convenção **por cliente**, prefixar com `clientes/<Nome>/`. A pasta nasce no primeiro laudo.

Uma dentista escreve "clareamento sem dor, a partir de R$ 299" e comete duas infrações do
mesmo artigo antes de apertar publicar. Ninguém faz por mal. A palavra escorrega, e a lista
de palavras que escorregam é curta: "ganhamos a causa" na bio do advogado, "elimina de vez"
no anúncio da dermatologista, "primeira sessão gratuita" no perfil da psicóloga. O que varia
é o preço de errar, de anúncio reprovado a processo na comissão de ética.

Chutar o número do artigo é pior que não citar nenhum, porque o usuário acredita e publica.
Então nada aqui sai de memória: o termo está num léxico datado, o artigo foi lido no texto
oficial, e a data de vigência viaja junto com ele até o laudo.

> **Não substitui advogado nem o conselho.** É a triagem antes de publicar. Denúncia
> recebida, notificação de comissão de ética ou caso limítrofe passam por advogado e
> pela comissão do conselho (Codame, TED, COE) antes de qualquer resposta. A skill diz
> isso na entrega, uma vez.

## Dependências

- **Contexto:** `_memoria/empresa.md` — profissão, número de registro, especialidade registrada (RQE, título), se é pessoa física ou clínica
- **Voz:** `_memoria/preferencias.md` — a reescrita é na voz do usuário, não em juridiquês
- **Público:** `_memoria/publico.md`, se existir — a palavra do cliente entra na reescrita no lugar da promessa
- **Referência:** `templates/juridico/publicidade-regulada.md` — as cinco profissões lado a lado, o que texto não pega, como reescrever sem esvaziar
- **Léxico:** `templates/juridico/lexico-publicidade.json` — termo, artigo, vigência, fonte, data de conferência e reescrita sugerida, por conselho e por plataforma
- **Script:** `scripts/publicidade.js` — varre a peça, lê o manifesto e escreve o laudo
- **Conferência:** `node scripts/verificar.js texto` no laudo final
- **Saída:** `analises/publicidade-<slug>-<AAAA-MM-DD>.md`, ou `laudo-publicidade.md` na pasta da peça

---

## Workflow

### Passo 1 — Receber a peça e a profissão

Três coisas precisam estar na mesa antes de rodar qualquer coisa. Perguntar só o que
`_memoria/empresa.md` não responde, uma pergunta por vez:

1. **A peça.** Texto colado, arquivo `.md` ou `.html` do workspace, ou print. Print e PDF o
   assistente lê direto pela ferramenta Read e transcreve o texto num arquivo `.md` antes de
   rodar o script; o que é imagem (foto, vídeo) vira resposta no manifesto do Passo 3
2. **A profissão e o registro.** "Você é dentista, médico, advogado, psicólogo ou corretor?"
   Se a memória já diz, não perguntar. Anotar também se anuncia especialidade: RQE pra
   médico, especialidade inscrita no CRO, título certificado pra advogado
3. **Onde vai.** Feed ou stories (orgânico), anúncio pago, bio, landing, impresso. Anúncio
   pago na Meta muda o laudo: entra a política de saúde e bem-estar e a análise da página
   de destino

Se a profissão não está no léxico (nutricionista, fisioterapeuta, veterinário, contador),
dizer isso na primeira linha e seguir só com o CDC e a plataforma. O conselho dela fica
`[a confirmar]`, e o molde diz como buscar a norma. Não fingir cobertura.

**Quando a notificação já chegou**, a ordem inverte. Ofício da Codame, do TED ou da comissão
de ética do CRO muda três coisas: a peça sai do ar ou vira arquivada antes de qualquer
análise; o laudo roda na peça **como foi publicada**, não na versão corrigida, e o print com
data fica guardado junto; e o prazo do ofício vai pro `tarefas.md` no mesmo dia, com data
absoluta. O laudo é insumo pra resposta, nunca a resposta: quem escreve a defesa é advogado.

### Passo 2 — Rodar o léxico

Nada de ler a peça e opinar. A varredura é por comando:

```bash
# peça em arquivo, orgânico
node scripts/publicidade.js conteudo/post-clareamento-2026-09-22/legenda.md --profissao dentista --plataforma instagram

# texto colado, anúncio pago
node scripts/publicidade.js --texto "Clareamento sem dor, a partir de R$ 299" --profissao dentista --pago

# landing em HTML (o script tira as tags)
node scripts/publicidade.js site/harmonizacao/index.html --profissao "médica dermatologista" --plataforma landing
```

O script devolve, por termo casado: o trecho com a linha, o artigo, a data de vigência,
a fonte com a data em que foi conferida, a gravidade (alta, média, aviso) e a reescrita
sugerida. Devolve também o que **pode ficar**, o que importa quando a regra surpreende:
médico pode anunciar preço (Res. CFM 2.336, art. 9º, VI), dentista não (CEO, art. 44, I).
Sai com código 1 se houver infração alta ou média.

Duas coisas que o script avisa e o laudo repete, e que valem no que o assistente escreve:
em peça `.html` o número de linha é do texto extraído das tags, não do arquivo, então citar
o trecho e não a linha; e plataforma que o léxico não conhece ("tiktok", "kwai") sai marcada
em vez de virar "não informada" silenciosa. `--json` devolve o mesmo resultado estruturado,
pra quando outra skill precisa só do resumo.

`node scripts/publicidade.js conselhos` lista o que o léxico cobre hoje, com a norma, a
vigência, a data de conferência, o que é obrigatório na peça e o órgão onde se consulta.
Mostrar essa saída ao usuário quando ele perguntar "de onde vem isso".

### Passo 3 — Declarar o que o texto não pega

Antes e depois, selfie com paciente, equipamento na bandeja, carro na foto do advogado,
segmentação de idade no Gerenciador: nada disso está no texto. Entra por manifesto:

```bash
node scripts/publicidade.js manifesto --profissao medico --plataforma meta-ads --saida analises/manifesto-harmonizacao.json
```

O arquivo vem com as perguntas que se aplicam àquela profissão e plataforma, todas em
`null`. O assistente faz as perguntas ao usuário, **uma por vez**, na ordem do arquivo, e
preenche `true` ou `false`. Se a peça é imagem ou print, o assistente lê pela ferramenta
Read e responde o que enxerga (tem instrumental na foto, tem rosto identificável), e
confirma com o usuário só o que não dá pra ver: TCLE assinado, caso próprio, idade mínima
configurada. O que ninguém sabe fica `null`, e o laudo devolve a pergunta em vez de chutar.

Aí a rodada completa:

```bash
node scripts/publicidade.js conteudo/harmonizacao/legenda.md --profissao medico --pago \
  --checklist analises/manifesto-harmonizacao.json \
  --saida conteudo/harmonizacao/laudo-publicidade.md
```

Checklist com condição funciona em cadeia. Antes e depois de médico só passa se as quatro
condições do art. 14, II, estiverem `true` (texto educativo, conjunto com insatisfatórios,
sem edição, anônimo, mais a autorização). Uma `false` vira achado; uma `null` vira
pendência com a pergunta pronta.

Em anúncio reprovado, a chave que mais explica a reprovação é `pagina_de_destino_coerente`:
a Meta analisa o destino junto com o anúncio, e landing que promete mais do que o anúncio
derruba os dois. Se a página está no workspace, rodar o script nela também, como peça
separada, em vez de responder a pergunta de memória.

### Passo 4 — Reconferir a vigência quando pesa

O léxico carrega `conferido_em` em cada regra. Antes de anúncio pago, de bio ou de landing
(peça que fica meses no ar), rodar WebSearch com o nome da norma e "alterada" ou
"revogada": "Resolução CFM 2.336 alterada", "Provimento 205 OAB revogado", "política Meta
saúde e bem-estar atualização". A busca é com o termo genérico, nunca com o nome do
usuário ou da clínica.

Se aparecer norma mais nova, ler o texto oficial (o script `conselhos` mostra a URL de
cada uma), usar a regra nova no laudo com a data de hoje, e avisar: "o léxico está com
data de X; a norma mudou em Y, o molde precisa de atualização". Se a busca não confirma
nada, o laudo sai com a data de conferência do léxico, visível no cabeçalho.

Conferência com mais de um ano é motivo pra rodar a busca mesmo sem sinal. O CFO mudou o
código em 24/06/2025 e a Meta mudou a política em julho de 2026; nenhuma das duas avisou
quem já tinha peça no ar.

Um caso está aberto agora e o léxico carrega o aviso: o Conselho Federal da OAB consolidou
em dezembro de 2025 a revisão do Provimento 205 com os Tribunais de Ética e os Corregedores,
e até a publicação do texto novo o 205/2021 vale inteiro. `conselhos` mostra esse aviso com
a data. Antes de campanha paga de advogado, a busca por provimento novo é obrigatória, e o
laudo diz qual texto usou.

### Passo 5 — Reescrever mantendo a mensagem

O script aponta e sugere; quem escreve a peça nova é o assistente, na voz do usuário. A
troca central está no molde: **sai o desfecho, entra a indicação.** "Resultado garantido"
vira "indicado pra quem tem manchas de sol; o resultado depende do tipo de pele";
"a partir de R$ 299" no dentista vira "valor e parcelamento na avaliação"; "97% de êxito"
no advogado vira a tese em abstrato.

Três cuidados, porque a reescrita costuma errar pro outro lado:

- **Não trocar infração por clichê.** "Cuidamos do seu sorriso com carinho" passa no
  conselho e reprova no `/revisar`. A reescrita traz dado: prazo, indicação, número de
  registro, dia da semana que atende
- **Não esvaziar.** A peça vendia clareamento; a peça nova ainda vende clareamento. O que
  muda é a promessa virar indicação, e a urgência virar agenda ("agenda de outubro aberta")
- **Manter a voz.** Régua é `_memoria/preferencias.md`. Reescrita em juridiquês é outra
  infração: a de ninguém ler

Depois de reescrever, rodar o script de novo na peça nova. Precisa voltar `0 alta,
0 média`. Se voltou achado, a reescrita ainda carrega o termo; corrigir a peça, não o léxico.

### Passo 6 — Escrever o laudo

O script escreve o arquivo com esta estrutura, e o assistente preenche a seção final:

```markdown
# Laudo de publicidade regulada — <peça>

> Profissão: <p> | Conselho: <nome> | Plataforma: <p>
> Léxico de <data>, laudo gerado em <data>. Não substitui o conselho nem advogado: é a triagem antes de publicar.

## Resumo
| Gravidade | Quantas |
|---|---|
| Alta (infração clara ou reprovação certa) | 3 |
| Média (depende do contexto, conferir) | 1 |
| Aviso | 0 |
| Pendências do checklist | 2 |

## O que viola, e onde
### 1. <termo> (alta)
- **Regra:** <norma, artigo, inciso>, em vigor desde <DD/MM/AAAA>
- **O que a norma diz:** <a letra, resumida>
- **Fonte:** <URL> (conferida em <DD/MM/AAAA>)
- **Trecho:** linha N: …contexto **trecho** contexto…
- **Reescrita sugerida:** <a troca>

## O que pode ficar
- **<termo>** — <artigo>: <por que pode>

## O que o texto não pega (responder no manifesto)
| Chave | Pergunta | Regra |

## Peça reescrita
[a peça inteira, na voz do usuário, com cada trecho trocado]
```

A tabela do resumo é o que o usuário lê primeiro; os números dela saem do script, não
de contagem manual. Se a rodada final da peça reescrita zerou, dizer isso na seção final:
"peça reescrita conferida em <data>: 0 alta, 0 média".

### Passo 7 — Entregar

Rodar e colar o resultado na conversa:

```bash
node scripts/publicidade.js <peça reescrita> --profissao <p> [--pago] --checklist <manifesto>
node scripts/verificar.js texto <laudo>
```

A entrega é curta: quantas infrações e quais as duas piores, o que pode ficar (quando
surpreende), a peça reescrita inteira pra copiar, o que ficou pendente no checklist, e a
frase de que isto não substitui o conselho. O arquivo inteiro fica no caminho da
convenção, e a data de conferência do léxico aparece no cabeçalho.

Se a peça veio de outra skill (`/carrossel`, `/video`, `/landing`), avisar de volta o que
mudou, porque o roteiro do `/video` sugere "antes e depois" como gancho e isso é infração
pra médico fora das condições do art. 14 e pra dentista como expressão.

---

## Regras

- **Nunca citar artigo de memória.** Todo artigo, inciso e data de vigência vem do léxico, e o léxico vem do texto oficial com URL e data de conferência. Se a regra que o usuário pergunta não está lá, a resposta é "não está no léxico; vou buscar o texto", nunca um número plausível
- **Termo é casado por comando, não lido.** A peça passa pelo `scripts/publicidade.js` antes de qualquer opinião, e a reescrita passa de novo. Laudo que não rodou não é laudo
- **O conselho vale antes da plataforma.** A Meta aceita antes e depois cosmético pra 18+; o CFM só aceita com as condições do art. 14, II; o CFO só aceita imagem de diagnóstico e resultado do próprio caso com TCLE. Anúncio aprovado pela plataforma pode ser infração ética, e o laudo diz os dois
- **Cobertura honesta.** O léxico cobre OAB, CFM, CFO, CFP e CRECI, mais o CDC e a Meta. Profissão fora disso recebe o laudo do CDC e da plataforma, com o conselho marcado `[a confirmar]`. Não estender regra de um conselho pra outro por analogia
- **Não é parecer jurídico nem consulta ao conselho.** Dizer isso na entrega, uma vez. Notificação recebida, denúncia, processo ético aberto e caso limítrofe (telemedicina, clínica com sócio não médico, advogado com outra atividade) passam por advogado e pela comissão do conselho antes de virar resposta
- **Não esvaziar a peça.** Reescrita que tira a promessa e não põe indicação, dado e agenda no lugar não cumpre o Passo 5. A mensagem original é mantida; o que muda é a forma de dizer
- **Manifesto é declaração do usuário.** O assistente lê a imagem e sugere a resposta, mas TCLE assinado, caso próprio e segmentação configurada só o usuário confirma. `null` é resposta válida e vira pendência, nunca `true` por conveniência
- **Sempre confirmar o registro na peça.** Nome e número do conselho é a regra mais barata de cumprir e a mais autuada: obrigatória nos cinco conselhos, e dentro da imagem pra dentista (Res. CFO-196, art. 4º) e corretor (25% do tamanho do nome)
- **Fronteira com as vizinhas:** o `/revisar` pega clichê e gordura, o `/revisar-design` pega contraste e hierarquia, o `/conversao` pega atrito e prova; esta skill pega o que é infração. As três podem rodar na mesma peça, nessa ordem: regra primeiro, porque não adianta melhorar a conversão de um anúncio que vai ser reprovado. O `/carrossel`, o `/video` e o `/landing` produzem a peça; o `/marca` escreve a bio; todos consultam `templates/juridico/publicidade-regulada.md` antes de escrever pra profissão regulada. O `/troca-devolucao` e o `/contrato` cuidam da relação com o cliente depois da venda, não da publicidade
- **LGPD e sigilo.** Foto, nome, print de conversa e depoimento de paciente ou cliente são dado pessoal sensível (saúde) ou protegido por sigilo (psicologia, advocacia). Não entram em WebSearch, em prompt de ferramenta externa nem em exemplo de comando; a busca pergunta "Resolução CFM 2.336 alterada", nunca "post da Dra. Fulana". O TCLE fica guardado com a peça, não na legenda
- **Quando o resultado for ruim, dizer o resultado.** Bio inteira fora da regra, campanha no ar há três meses com "garantido", antes e depois sem TCLE: escrever isso com o artigo e o próximo passo (tirar do ar, corrigir, guardar autorização), sem suavizar
- **O léxico envelhece.** Regra com `conferido_em` de mais de um ano, ou WebSearch que acusa norma nova, vira aviso ao usuário e nota pra atualização do molde. Nunca editar o léxico no meio de uma conversa pra fazer a peça passar
