---
name: teste-ab
description: >
  Desenha um teste A/B que termina em conclusão, não em opinião: hipótese em uma frase,
  uma variável por vez, métrica primária e de guarda, amostra mínima e duração calculadas
  por comando a partir da taxa atual e do tráfego, como dividir o público, a folha de
  registro e a leitura no fim (ganhou, perdeu ou inconclusivo, e o que fazer em cada caso).
  Quando o tráfego não fecha a conta, diz isso antes de começar e propõe o caminho que fecha.
  Use quando o usuário disser "quero testar duas versões", "qual headline funciona melhor",
  "testar o preço", "faz um teste A/B", "qual anúncio é melhor", "mudo a página ou testo",
  "a versão B ganhou?", "quantas visitas preciso pro teste", "deu diferença mas não sei se
  é real", "vale a pena testar isso", ou /teste-ab.
---

# /teste-ab — Experimento honesto

> **Convenção de pastas:** a saída vai em `experimentos/`. Na convenção **por cliente**, `clientes/<Nome>/experimentos/`. A pasta nasce na primeira folha de registro.

Quase todo teste A/B de negócio pequeno termina do mesmo jeito: no terceiro dia a versão B
está 40% na frente, o dono troca a página, e três semanas depois a conversão está igual ao
que era. Ele não testou nada. Sorteou. O que separa teste de sorteio é uma conta feita antes
de começar, uma data de fim marcada, e a disciplina de não olhar até lá. Essa skill faz a
conta, marca a data e escreve a folha que transforma o resultado em conhecimento, mesmo
quando o resultado é "não deu pra saber".

## Dependências

- **Contexto:** `_memoria/empresa.md` (o que vende, por onde chega o cliente), `_memoria/publico.md` (a palavra do cliente é de onde sai o "porque" da hipótese), `_memoria/oferta.md` quando o teste é de preço ou de garantia
- **A peça em teste:** página em `site/` (do `/landing`), anúncio em `campanhas/`, sequência de `/email` ou `/whatsapp`, ou a oferta em `oferta/`
- **Diagnóstico anterior:** a auditoria do `/conversao`, se existir. É a lista mais curta de coisas que valem teste
- **Molde:** `templates/crescimento/experimentos.md` — o que dá pra testar em negócio pequeno, a tabela de amostra por taxa e efeito, os erros que matam teste
- **Scripts:** `scripts/teste-ab.js` (`amostra`, `ler`, `tabela`) faz a conta; `scripts/verificar.js` (`tabela`, `datas`) confere a folha antes de salvar
- **Registro:** `tarefas.md` recebe a data de leitura; o `/revisao-semanal` só anota "teste rodando" até lá
- **Saída:** `experimentos/<slug>-<AAAA-MM-DD>.md`, uma folha por experimento, com a data de início no nome

---

## Workflow

### Passo 1 — Entender o que ele quer testar

Uma pergunta por vez. A primeira:

> "O que você quer comparar, e o que te fez desconfiar que a outra versão seria melhor?"

A segunda metade da pergunta importa mais que a primeira. "Achei que ficaria mais bonito"
não vira hipótese. "Três clientes perguntaram o preço antes de qualquer coisa e a página
não mostra" vira. Se a suspeita veio do `/conversao`, do `/publico` ou de uma reclamação
real, anotar a origem: ela entra na folha.

Depois, uma de cada vez:

1. "Onde isso está: página, anúncio, e-mail, WhatsApp, preço, atendimento?"
2. "Que ação conta como resultado? (clique no WhatsApp, formulário, compra, resposta)"
3. "Quantas pessoas passam por ali por mês, e quantas fazem essa ação hoje?"

Se ele não sabe a terceira, o rastreio não existe ainda, e teste sem contagem não é teste.
Instalar pixel, evento de conversão e UTM é trabalho do `/medir`; o `scripts/utm.js` gera os
links com parâmetro pra separar as duas versões no relatório. Voltar aqui quando a página
tiver pelo menos um mês contado. "Mais ou menos umas 2 mil visitas" não serve de base: a
conta do Passo 5 precisa do número do painel, com a data de onde foi lido.

Na convenção por cliente, perguntar de quem é a peça: a folha vai em
`clientes/<Nome>/experimentos/` e o contexto sai do `briefing.md` dele, não da memória da casa.

### Passo 2 — Decidir se é teste ou conserto

Consultar a tabela "o que vale testar" em `templates/crescimento/experimentos.md`. Três
situações não viram teste:

- **Erro objetivo.** Contraste ilegível, botão fora da tela no celular, link quebrado, formulário de sete campos. Corrige e pronto; quem cuida é o `/conversao` e o `/acessivel`
- **Mudança pequena com tráfego pequeno.** Cor de botão, emoji, fonte. Efeito minúsculo pede amostra gigante. Com menos de dezenas de milhares de visitas por mês, nunca fecha
- **Duas versões em que uma é indefensável.** Se ninguém no negócio apostaria na B, não precisa medir

Se for conserto, dizer em uma linha e encaminhar. Se for teste de verdade (as duas versões
são defensáveis e ninguém sabe qual vence), seguir.

### Passo 3 — Escrever a hipótese

Uma frase, três partes, e o **porque** é a parte obrigatória:

> Se **[mudar X]**, então **[Y sobe ou desce]**, porque **[Z]**.

Exemplo com origem rastreável: "Se a headline sair de 'Consultoria financeira pra pequenas
empresas' e virar 'Saiba quanto sobra no fim do mês', o clique no WhatsApp sobe, porque o
público fala em 'sobrar', não em 'consultoria' (`_memoria/publico.md`, entrevista de
12/08)."

O porquê é o que ensina algo quando o teste perde. "B perdeu" é um fato. "B perdeu, então a
palavra do cliente não era o problema; o problema é outro" é um aprendizado que muda o
próximo teste.

**Uma variável.** Se a versão B tem headline nova e foto nova e botão novo, e ganha, ninguém
sabe o que fez ganhar. A exceção honesta é redesenho inteiro contra a página antiga, desde
que a pergunta seja "a página nova é melhor?" e não "qual elemento ajudou?". Quando o
usuário chega com três mudanças, perguntar qual ele aposta mais e testar só ela.

### Passo 4 — Escolher a métrica primária e a de guarda

- **Primária** — a única que decide. Um evento contado, não uma impressão. "Clique no botão do WhatsApp" serve; "ficou mais profissional" não
- **Guarda** — o que não pode piorar enquanto a primária sobe

Perguntar: "Se a versão B ganhar, o que poderia ter piorado sem você perceber?"

| Teste | Primária | Guarda comum |
|---|---|---|
| Headline mais agressiva | Clique no WhatsApp | Lead que responde depois do primeiro contato |
| Preço menor ou parcelado | Compra | Margem por venda (`/caixa`) |
| Assunto de e-mail | Abertura | Descadastro |
| Formulário com menos campos | Envio | Lead que atende o telefone |
| Anúncio com promessa maior | CTR | Conversão na página, custo por lead |

Sem guarda, o teste ganha e o negócio perde. O veredito final tem duas condições: primária
subiu **e** guarda não caiu.

### Passo 5 — Fazer a conta, por comando

Aqui a conversa fica honesta. Três números entram: a taxa atual, o efeito mínimo que vale
detectar e o tráfego mensal.

O efeito é uma decisão de negócio, não de estatística: "quanto precisa melhorar pra valer o
trabalho de trocar?". Perguntar isso antes de sugerir número. Régua pra quando ele não sabe:
mudança grande (oferta, headline inteira, o que o formulário pede) só vale o trabalho se
render pelo menos 20% ou 30%; ajuste de texto raramente vale mais que 10%, e é por isso que
ajuste de texto não fecha com pouco tráfego. Sempre relativo (de 2% pra 2,4% é +20%), nunca
em pontos.

```bash
node scripts/teste-ab.js amostra --taxa 2,5 --efeito 20 --visitas 3000
```

O comando devolve a amostra por versão, o total, os dias que leva com o tráfego atual e um
de três vereditos:

| Veredito | Significa | O que fazer |
|---|---|---|
| **cabe** (até 4 semanas) | O teste fecha em prazo útil | Marcar a data de fim e seguir pro Passo 7 |
| **aperta** (4 a 8 semanas) | Fecha, mas qualquer mudança no tráfego contamina | Rodar só se nada de fora estiver previsto (promoção, feriado, campanha nova); senão, testar mudança maior |
| **não fecha** (mais de 8 semanas) | Vai morrer antes da conclusão | Passo 6 |

Com 2,5% de conversão, efeito de 20% e 3.000 visitas por mês, o comando devolve 16.792
visitas por versão e 336 dias. Não fecha. A mesma página, testando uma mudança de oferta
que pode render 50%, precisa de bem menos. A régua está em `node scripts/teste-ab.js
tabela`, e é a que fica no molde.

Quem quiser ver a conta aberta, sem o script, roda a fórmula clássica do teste de duas
proporções (confiança 95%, poder 80%):

```bash
node -e 'const p1=0.02,p2=0.024,za=1.96,zb=0.8416,pm=(p1+p2)/2;
console.log(Math.ceil((za*Math.sqrt(2*pm*(1-pm))+zb*Math.sqrt(p1*(1-p1)+p2*(1-p2)))**2/(p2-p1)**2))'
```

Devolve 21.109, o mesmo da tabela. Trocar `p1` pela taxa atual e `p2` pela taxa que se quer
enxergar. As calculadoras de mercado usam variantes dessa fórmula e chegam a números
parecidos (diferença de poucos por cento); se o usuário trouxer um número de outra
calculadora que bate na ordem de grandeza, está tudo bem. Nunca aceitar amostra "de cabeça"
ou "uns 500 por versão": o número sai do comando e entra na folha.

Três versões (A, B e C) é `--variantes 3`. O script aperta a confiança de cada comparação e o
total cresce; com tráfego pequeno, duas versões, sempre.

**Duração mínima: duas semanas inteiras**, mesmo que a amostra feche em quatro dias.
Segunda converte diferente de sábado, e começo do mês converte diferente do fim. O script já
ajusta pra 14 dias quando a conta dá menos.

### Passo 6 — Quando não fecha: a alternativa

Com menos de ~1.000 visitas por mês a maioria dos testes não fecha em prazo útil, e dizer
isso é o trabalho mais útil da skill. Não é falta de rigor: é a conta. Oferecer as saídas na
ordem, e o usuário escolhe uma:

1. **Mudança maior.** Trocar o teste de "texto do botão" por "oferta inteira". Efeito grande pede amostra pequena; é o único jeito de tráfego pequeno concluir alguma coisa
2. **Teste sequencial por período.** Duas semanas inteiras com A, duas com B, mesma origem de tráfego, mesma época, sem feriado ou promoção no meio. Mais fraco que o simultâneo, porque o tempo vira variável, e muito mais forte que "achei que melhorou". A leitura usa o mesmo `ler` do Passo 10, com cada período como uma versão
3. **Entrevista.** Cinco conversas com quem comprou e cinco com quem pediu orçamento e sumiu (`/publico`) dizem **por que** a página não converte. O A/B só diz **que** não converte
4. **Antes e depois.** Aplicar a correção que o `/conversao` apontou, anotar a data, comparar 30 dias antes com 30 dias depois. Serve pra mudança grande e óbvia
5. **Testar no anúncio, não na página.** Anúncio tem impressão de sobra; a taxa de clique fecha teste com muito menos volume. Testar o ângulo no criativo (o `/relatorio-ads` lê o resultado) e levar o vencedor pra headline

A escolha vai pra folha, com a razão. "Não deu pra testar" registrado vale mais que teste
que nunca fechou e ninguém anotou.

### Passo 7 — Definir a divisão

Perguntar qual ferramenta a peça usa. A regra é simples: **quando a plataforma divide sozinha,
usar a plataforma.** Página (Wix, Framer, WordPress com plugin), anúncio (Meta e Google têm
teste nativo) e e-mail (quase toda ferramenta de disparo) já sorteiam por visitante e contam.

Quando não há ferramenta:

| Jeito | Quando | Cuidado |
|---|---|---|
| **Duas páginas, dois links** | Página feita à mão em `site/` | Dois anúncios iguais com orçamento igual, não "um link no post, outro no story". Links com `scripts/utm.js` pra separar no relatório |
| **Dia alternado** | Loja, WhatsApp, atendimento, quando a mesma pessoa não pode ver as duas | Semanas inteiras, senão A pega só segunda e quarta |
| **Por lista** | E-mail e WhatsApp em massa | Sortear a divisão por comando, nunca cortar por ordem alfabética ou por data de cadastro |

O que invalida o teste antes de começar: origem diferente pra cada versão (Instagram pra A,
Google pra B), mudar o anúncio no meio, promoção só numa das semanas.

Pra sortear uma lista sem ferramenta, por comando: embaralha, marca a primeira metade como A
e o resto como B, numa coluna nova `versao`, respeitando o separador do arquivo (`;` ou `,`).
A contagem de cada lado sai na tela pra conferir o 50/50 antes de disparar:

```bash
node -e 'const fs=require("fs");const l=fs.readFileSync("dados/lista.csv","utf8").trim().split(/\r?\n/);
const cab=l.shift();const sep=cab.includes(";")?";":",";
const s=l.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const meio=Math.ceil(s.length/2);console.log(cab+sep+"versao");
s.forEach((x,i)=>console.log(x+sep+(i<meio?"A":"B")));
console.error("A: "+meio+" · B: "+(s.length-meio))' > dados/lista-dividida.csv
```

A lista dividida fica em `dados/`, que o git ignora, e só a contagem vai pra folha.

### Passo 8 — Escrever a folha

Tudo que foi decidido entra **antes** de o teste começar. Folha preenchida depois é
justificativa, não registro.

```markdown
# Experimento — <nome curto> — <AAAA-MM-DD>

**Onde:** <página | anúncio | e-mail | WhatsApp | preço> · **Status:** planejado

## Hipótese
Se <mudar X>, então <Y sobe>, porque <Z>.
Origem do porquê: <frase do publico.md, item da auditoria, reclamação real, com data>

## Versões
| Versão | O que muda | Onde ver |
|---|---|---|
| A (controle) | nada, é o que está no ar | <link ou arquivo> |
| B | <a única mudança> | <link ou arquivo> |

## Métricas
- **Primária:** <evento contado>. Hoje: <taxa>% de <visitas> por mês
- **Guarda:** <o que não pode piorar>. Hoje: <taxa>%

## A conta, antes de começar
`node scripts/teste-ab.js amostra --taxa <t> --efeito <e> --visitas <v>`
- Efeito mínimo que vale detectar: +<e>% relativo (de <t>% pra <t2>%)
- Amostra: <n> por versão, <2n> no total
- Início: <dia da semana>, <DD/MM/AAAA> · Fim: <dia da semana>, <DD/MM/AAAA> (<n> dias)
- Se não fecha: <alternativa escolhida e por quê>

## Divisão
<ferramenta | duas páginas | dia alternado | por lista>. Conferido 50/50 em: <data>

## Diário (só o que veio de fora)
| Data | O que aconteceu |
|---|---|
| | feriado, promoção, matéria, anúncio pausado, bug, mudança no tráfego |

## Resultado (preencher só na data de fim)
`node scripts/teste-ab.js ler --a <visitas>/<conversões> --b <visitas>/<conversões> --planejado <n>`
| Versão | Visitas | Conversões | Taxa |
|---|---|---|---|
| A | | | |
| B | | | |
| Total | | | |

p = <valor> · intervalo da diferença: <de> a <até> · guarda: <manteve | caiu>

## Veredito
**<Ganhou | Perdeu | Inconclusivo>.** <uma frase com o número>

## Decisão e aprendizado
- O que vai pro ar:
- O que a hipótese acertou ou errou:
- O que vai pra `_memoria/publico.md` ou `biblioteca.md`:
- Próximo teste:
```

Antes de salvar, conferir por comando:

```bash
node scripts/verificar.js datas experimentos/<slug>-<AAAA-MM-DD>.md   # dia da semana da data de fim
node scripts/verificar.js tabela experimentos/<slug>-<AAAA-MM-DD>.md  # a linha Total soma
```

### Passo 9 — Marcar a data e sumir

Anotar em `tarefas.md`: "Ler o experimento <slug> em <data>". Até lá, o painel fica fechado.
Cada olhada é uma tentação de parar cedo, e parar cedo é o erro que mais produz vencedor
falso. Se o usuário perguntar "como tá indo?" no meio, a resposta é a data, não o número.

O `/revisao-semanal` anota "teste rodando, leitura em <data>" e mais nada. A única
exceção é evento de fora: promoção, matéria na imprensa, anúncio pausado. Isso vai pro
diário da folha no dia em que acontece.

### Passo 10 — Ler o resultado

Na data marcada, pedir os quatro números (visitas e conversões de cada versão) e a guarda,
e rodar:

```bash
node scripts/teste-ab.js ler --a 5600/280 --b 5580/349 --planejado 5333
node scripts/teste-ab.js ler --a 1480/37 --b 1502/51 --planejado 5000 --guarda-a 1480/210 --guarda-b 1502/168
```

O primeiro é um teste planejado pra 5.333 visitas por versão (5% de base, efeito de 25%)
que bateu a amostra: devolve "B ganhou" com p = 0,0040 e intervalo da diferença inteiro
acima de zero. O segundo devolve "inconclusivo" com p = 0,1485, avisa que a leitura veio
antes da amostra planejada, e ainda acusa que a guarda caiu. Os dois casos são comuns, e o
segundo é o que o dono mais tem vontade de chamar de vitória: B está "+36% na frente".

No teste sequencial por período, `--a` é o período com A e `--b` o período com B, e o diário
da folha precisa estar limpo: se um dos períodos teve feriado ou promoção, a leitura vale
menos, e a folha diz isso ao lado do veredito.

| Veredito | O que fazer |
|---|---|
| **Ganhou** (p abaixo de 0,05, B na frente, guarda intacta) | Publicar B. Registrar o aprendizado na folha e, se ensinou algo sobre o cliente, em `_memoria/publico.md`. Escolher o próximo teste, porque vitória compõe com a seguinte |
| **Ganhou a primária, caiu a guarda** | B não vai pro ar como está. Registrar o que subiu e o que caiu; o próximo teste é uma B que corrige a guarda |
| **Perdeu** (p abaixo de 0,05, B atrás) | Manter A. Registrar **o que a hipótese errou**. É o aprendizado mais valioso, porque contradiz uma crença do dono |
| **Inconclusivo, amostra batida** | Manter A (é grátis). Encerrar. A mudança era pequena demais pra esse tráfego; o próximo teste é de mudança maior |
| **Inconclusivo, amostra não batida** | Continuar até a data, sem olhar. Se a data já passou, ver o "precisaria de" que o comando devolve e decidir se vale estender |

Um lift de "+35%" com p = 0,15 não é vitória tímida. É ausência de resultado. O intervalo
diz o tamanho da dúvida: se cruza zero, B pode ser melhor ou pior que A. E o contrário
também vale: um lift de 8% com p = 0,01 numa página que vende é dinheiro todo mês. Não
desprezar vitória pequena com amostra grande; desprezar vitória grande com amostra pequena.

Os avisos que o comando dá (leitura antes da hora, menos de 25 conversões numa versão,
divisão longe de 50/50) entram na folha como estão. Divisão desigual costuma ser bug de
ferramenta ou período diferente, e invalida a leitura até ser explicada.

### Passo 11 — Fechar o ciclo

- Status da folha vira **lido**, com veredito e decisão preenchidos
- Se a versão vencedora é uma página em `site/`, aplicar a mudança no arquivo e anotar na folha o que mudou e quando
- Aprendizado sobre o cliente (palavra que funcionou, objeção que pesou) vai pra `_memoria/publico.md`; copy vencedora vai pro `biblioteca.md` com o número que a sustenta, pra `/landing`, `/carrossel` e `/anuncio-google` reaproveitarem
- Perguntar: "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"
- Propor o próximo experimento a partir do que ficou na lista do `/conversao`, com a mesma conta do Passo 5

---

## Regras

- **Nunca começar sem a conta.** Amostra e data de fim saem do `scripts/teste-ab.js` e entram na folha antes de a primeira visita chegar. Teste que começa "pra ver no que dá" não tem fim e não tem conclusão
- **Uma variável por teste.** Chegou com três mudanças? Perguntar em qual ele aposta mais e testar só ela. A única exceção é redesenho inteiro, e aí a pergunta é outra
- **O porquê é obrigatório.** Hipótese sem "porque" é chute. Se a origem não está no `_memoria/publico.md`, numa auditoria ou numa reclamação real, perguntar de onde veio a suspeita antes de seguir
- **Dizer quando não fecha.** Com menos de ~1.000 visitas por mês, dizer que a maioria dos testes não conclui, mostrar a conta, e oferecer as alternativas do Passo 6. Deixar o usuário rodar um teste que a conta já disse que morre é o mesmo que mentir pra ele
- **Não olhar antes da data.** Se ele pedir o parcial, entregar a data. Se insistir, rodar o `ler` com `--planejado` e deixar o aviso de leitura antes da hora aparecer na conversa
- **Não ajustar o número pra bater.** Se a leitura deu inconclusivo, a folha diz inconclusivo. Estender o teste "só mais uma semana" até dar significativo é o jeito mais conhecido de fabricar vitória
- **Guarda decide junto.** Primária que sobe com guarda caindo não é vitória. O veredito da folha tem as duas condições
- **Mudança no meio recomeça o teste.** "Ajustei só o texto do botão da B na quarta" cria uma terceira versão sem amostra. Registrar como novo experimento, com nova data
- **Fronteira:** o `/conversao` diagnostica a página e diz o que mudar; instalar pixel, evento e UTM é rastreio (`/medir`); o `/relatorio-ads` lê o desempenho dos anúncios que já rodam; o `/publico` responde "por quê" quando o tráfego não responde "qual"; o `/oferta` e o `/preco` desenham o que vai ser testado quando a variável é a oferta ou o valor. O `/teste-ab` é só o experimento: desenho, conta, folha e leitura
- **A versão B não pode ser mentira.** "Só 3 vagas" que não existem, contador que reinicia, depoimento inventado, "de R$ 500 por R$ 300" sem nunca ter custado 500. Além de ser infração ao Código de Defesa do Consumidor, o ganho some quando a mentira aparece, e o teste mede uma fraude, não uma hipótese. Escassez e urgência só entram como versão quando são reais (turma com data, estoque contado)
- **Dado de cliente é dado pessoal (LGPD).** Lista dividida por sorteio pra e-mail ou WhatsApp fica em `dados/` (ignorada pelo git) e não vai pra ferramenta externa sem autorização explícita. A folha registra contagem, nunca nome, telefone ou e-mail
- **Preço em teste precisa de cuidado extra.** Mostrar preços diferentes pra pessoas diferentes ao mesmo tempo pode gerar reclamação legítima de quem viu o maior. Preferir teste sequencial por período, ou testar a apresentação do preço (parcelamento, âncora, faixa) em vez do valor. Se o valor for testado, confirmar com o usuário que ele aceita honrar o menor pra quem reclamar [a confirmar com o contador ou advogado dele o limite disso]
- **Não inventar taxa de referência.** "Página desse setor converte 3%" só entra com fonte datada ou como `[a confirmar]`. A taxa que importa é a dele, contada
