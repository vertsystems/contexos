# Case — referência pra transformar resultado de cliente em prova

Referência do `/case`. Não é o workflow: é o que a skill consulta pra decidir o que
conta como prova, como colher os fatos, em que ordem contar e o que cada um dos três
tamanhos precisa ter. O termo de autorização mora em `autorizacao-de-uso.md`, ao lado.

---

## Depoimento, relato e case são coisas diferentes

| | O que é | Quem fala | Tem número? | Serve pra |
|---|---|---|---|---|
| **Depoimento** | Frase do cliente sobre a experiência | O cliente | Raramente | Prova social solta: rodapé de página, slide de carrossel |
| **Relato** | História do trabalho, contada pelo prestador | Você | Não, ou sem fonte | Mostrar como você trabalha; não prova resultado |
| **Case** | Situação, o que travava, o que foi feito, resultado medido | Você, com a voz do cliente dentro | Sim, com fonte e data | Proposta, página de vendas, reunião de fechamento |

Case sem número com fonte é relato. Não é pior; é outra coisa, e o `/case` marca como
"relato sem prova" pra que a `/proposta` e a `/landing` não o usem como se fosse prova.
O jeito de subir de relato pra case é ir buscar o número: planilha do cliente, extrato,
relatório do sistema, contagem que alguém fez. Sem isso, o texto conta a história e diz
que o número não foi levantado, e isso é mais forte do que um "dobrou" que ninguém confere.

---

## O que conta como prova

| Tipo de número | Fonte aceita | Força |
|---|---|---|
| Faturamento, ticket, custo | Extrato, relatório da maquininha, fechamento do `/caixa` | Alta: alguém pode auditar |
| Quantidade (pedidos, leads, faltas, perdas) | Planilha do cliente, sistema, contagem registrada com data | Alta |
| Percentual de conversão, taxa | Os dois números que geram a taxa, não a taxa pronta | Alta se os dois vierem; média se só a taxa |
| Prazo ("em 4 meses") | Data de início e data de medição | Alta: o script calcula |
| Métrica de plataforma (alcance, seguidores) | Print com data ou export | Média: muda de definição e some |
| "O cliente disse que dobrou" | Só a fala | Baixa: é depoimento, entra entre aspas e sem virar número |

Regra prática: **todo número no texto tem antes, depois, fonte e data no `.fatos.json`**.
O que não tem, ou entra em `outros_numeros` com a fonte ("dito pelo cliente"), ou sai do
texto. O `scripts/case.js conferir` acusa o que sobrar.

O conferidor lê algarismo, não palavra: escrever "18 mil" faz ele ler 18 e reclamar, e
"dezoito mil" passa sem ser conferido. Número de resultado vai inteiro e em algarismo
("R$ 18.000", "12%", "26 semanas"). Hora de relógio ("às 14h", "13h30") ele ignora; hora
como métrica ("caiu de 8h pra 3h por dia") ele confere como qualquer outro número.

Guardar isso não é zelo, é obrigação. O CDC manda o fornecedor manter em seu poder, pra
informação de quem pedir, os dados fáticos, técnicos e científicos que sustentam a mensagem
publicitária (Lei 8.078/1990, art. 36, parágrafo único —
planalto.gov.br/ccivil_03/leis/l8078compilado.htm, conferido em 2026-09-23). O `.fatos.json`
com a fonte de cada número é esse acervo, na versão que cabe num negócio pequeno.

Número redondo é suspeito. "Caiu 75%" com a conta ao lado (12% → 3%) convence mais que
"caiu quase 80%". Deixar a conta visível é parte da prova.

---

## Como colher os fatos

Uma mensagem só, porque é levantamento. As sete perguntas, na ordem que o texto vai usar:

1. **Quem é o cliente** (nome, segmento, tamanho: "padaria de bairro, 3 funcionários")
2. **Como estava antes**, com número e de onde veio o número
3. **O que travava**, na palavra do cliente (é a camada que gera identificação)
4. **O que foi feito**, em duas ou três ações concretas, não "consultoria completa"
5. **Como ficou**, com número, fonte e data da medição
6. **Quando começou e quando mediu** (o script transforma em dias, semanas e meses)
7. **O que deu errado ou demorou** no caminho

A sétima pergunta é a que ninguém faz e a que mais dá credibilidade. Case onde tudo deu
certo na primeira tentativa parece anúncio. "A primeira semana a contagem não pegou porque
ninguém anotava; mudou quando a Maria colou a folha na porta do forno" é o detalhe que só
quem estava lá sabe.

Depoimento existente (do `/pos-venda`, do `biblioteca.md`) entra literal, entre aspas, com
quem disse e quando. Corrigir digitação é permitido; melhorar a frase não é.

### O arquivo de fatos

```json
{
  "cliente": "Padaria São João",
  "segmento": "padaria de bairro",
  "trava": "jogava pão fora toda semana",
  "pode_citar_nome": true,
  "atualizado_em": "2026-09-22",
  "periodo": { "inicio": "2026-03-02", "fim": "2026-08-31" },
  "metricas": [
    { "nome": "Perda de pão por semana", "antes": "12%", "depois": "3%", "unidade": "%",
      "fonte": "planilha de controle de produção da padaria", "data": "2026-08-31" },
    { "nome": "Faturamento mensal", "antes": "R$ 18.000", "depois": "R$ 24.500", "unidade": "R$",
      "fonte": "extrato bancário, agosto/2026", "data": "2026-08-31" }
  ],
  "outros_numeros": [
    { "valor": 3, "o_que": "funcionários na produção", "fonte": "dito pela dona em 2026-09-05" }
  ],
  "depoimento": { "texto": "Nunca mais perdi um lote.", "quem": "Maria, dona", "data": "2026-09-05", "canal": "WhatsApp" },
  "autorizacao": { "data": "2026-09-10", "arquivo": "biblioteca/cases/padaria-sao-joao-perda-de-lote-autorizacao.md" }
}
```

`trava` alimenta a coluna "Problema → resultado" da tabela "Cases" do `biblioteca.md`.
`pode_citar_nome: false` faz o script acusar o nome do cliente, e o nome de quem deu o
depoimento, se aparecerem no texto — por isso o slug do case anônimo sai do segmento.
`autorizacao.data` vazio deixa o status em "aguardando autorização". Uma métrica pode ter
`periodo` próprio quando foi medida em janela diferente da geral.

---

## A ordem de contar

Cinco blocos, sempre nessa ordem, porque é a ordem em que o leitor decide se acredita:

| Bloco | O que entra | Erro comum |
|---|---|---|
| **Situação** | Quem é o cliente e o número de antes | Começar por você ("nossa metodologia") |
| **Trava** | O que impedia, na palavra dele, e por que doía | Descrever o problema em jargão seu |
| **Ação** | Duas ou três coisas concretas que foram feitas, e o que não funcionou de primeira | Lista de entregáveis; "implementamos uma solução completa" |
| **Resultado** | O número de depois, a variação calculada, o prazo | Adjetivo no lugar de número ("resultados expressivos") |
| **Prova** | Fonte, data, depoimento literal, autorização | Esquecer a fonte, ou colocar depoimento genérico |

É o mesmo arco que o `portfolio-case-study-generator` (github.com/SonwaneyY) chama de
Challenge → Process → Impact, e que o `storytelling-expert` (github.com/ericgandrade/claude-superskills)
resume em "fato, portanto, mas, portanto": cada bloco existe **por causa** do anterior.
O cliente é o herói e você é o guia; essa parte já está escrita em `identidade/marca.md`
pelo `/marca`, e o case só reaproveita, sem reescrever a história da marca.

---

## Os três tamanhos

Cada tamanho responde a um uso. Nenhum é resumo do outro: o curto tem só o número, o
longo tem o caminho.

### Curto: até três linhas (bio, rodapé de proposta, slide)

Quem, o número de antes, o número de depois, o prazo. Sem adjetivo, sem verbo de marketing.

> Padaria São João, 3 funcionários. Perda de pão caiu de 12% pra 3% em 6 meses.
> Faturamento subiu R$ 6.500 por mês, sem contratar ninguém.

### Médio: um parágrafo (post, e-mail, abertura de reunião)

Situação e trava em uma frase, ação em uma ou duas, resultado com a conta, depoimento no fim.

> Em março de 2026 a Padaria São João jogava fora 12% do pão que produzia toda semana.
> Duas fornadas por dia, e a segunda quase sempre sobrava. Trocamos a fornada da tarde por
> uma contagem simples na hora do almoço, colada na porta do forno. Em agosto a perda
> estava em 3%, e o faturamento foi de R$ 18.000 pra R$ 24.500 por mês: 36% a mais.
> "Nunca mais perdi um lote", diz a Maria.

### Longo: uma página (anexo de proposta, página do site, material de venda)

Os cinco blocos com subtítulo, uma tabela antes → depois com a variação do script, o que
deu errado, o depoimento e a linha de fonte. Cabe em uma página A4; se passou, tem gordura.

Os três moram no mesmo arquivo `biblioteca/cases/<slug>.md`, e cada skill consumidora pega
o tamanho dela: `/proposta` usa o curto na seção "Por que nós" e o longo como anexo;
`/landing` usa o médio na seção de prova; `/carrossel` usa o curto como slide de resultado.

---

## Anonimato

Quando o cliente não autoriza o nome, o case continua existindo com **segmento e tamanho**
no lugar do nome: "uma clínica odontológica de bairro com dois dentistas". O que não pode:
descrição que identifica ("a única padaria da rua tal"), foto da fachada, logo, nome de
funcionário. Número e prazo continuam, porque são o que prova.

Case anônimo vale menos que case com nome, e mais que case nenhum. Dizer isso ao usuário
quando ele hesitar em pedir autorização.

---

## O que nunca dizer num case

- **Adjetivo no lugar de número**: "resultados expressivos", "crescimento significativo", "muito satisfeito"
- **Promessa disfarçada de resultado**: "você também pode ter esse resultado". Case é o que aconteceu com um cliente, não garantia pro próximo. Em publicidade, alegação de resultado que não se sustenta é o que o CDC, art. 37, § 1º, chama de enganosa (planalto.gov.br/ccivil_03/leis/l8078compilado.htm, conferido em 2026-09-22)
- **Causalidade que não dá pra provar**: "por causa do nosso trabalho, o faturamento subiu". Escrever o que foi feito e o que mudou; o leitor liga os dois
- **Número sem antes**: "gerou R$ 50 mil" não diz nada sem o ponto de partida
- **Média de vários clientes** apresentada como case de um
- **Profissão regulada**: médico, dentista, advogado, psicólogo e nutricionista têm regra do conselho sobre divulgar resultado de paciente ou cliente. Antes de publicar, conferir a resolução do conselho (o `/publicidade-regulada` faz isso) e, na dúvida, o case fica interno, só pra reunião

---

## Checklist antes de catalogar

- [ ] `.fatos.json` com toda métrica tendo antes, depois, fonte e data
- [ ] `node scripts/case.js <slug>.fatos.json` terminou em "Tudo certo."
- [ ] Status no texto igual ao calculado (comprovado ou relato sem prova; aguardando autorização quando for o caso)
- [ ] Depoimento literal, com quem disse e quando
- [ ] Termo de autorização preenchido, enviado ou assinado (registrado em `autorizacao.data`)
- [ ] Sem nome, foto ou logo se `pode_citar_nome` for falso
- [ ] `node scripts/verificar.js texto` sem clichê
- [ ] Linha na tabela "Cases" do `biblioteca.md`

---

## Fontes

- Estrutura em seis partes e disciplina de "não inventa número": github.com/SonwaneyY/portfolio-case-study-generator (lido em 2026-09-22)
- "Fato, portanto, mas, portanto" como arco de case: github.com/ericgandrade/claude-superskills, skills/storytelling-expert (lido em 2026-09-22)
- Publicidade enganosa: Lei 8.078/1990 (CDC), art. 37, § 1º, planalto.gov.br/ccivil_03/leis/l8078compilado.htm (conferido em 2026-09-22)
- Dever de guardar os dados que sustentam a peça: Lei 8.078/1990 (CDC), art. 36, parágrafo único, mesma URL (conferido em 2026-09-23)
- Uso de nome, imagem e depoimento: ver `autorizacao-de-uso.md`
