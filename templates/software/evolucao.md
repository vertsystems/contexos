# Evolução — o sistema está no ar, e agora?

Referência da skill `/evoluir`. O que se decide depois que o software existe e tem gente
usando dentro: qual funcionalidade mereceu o que custou, o que entra na próxima leva, o que
se desliga, e quando parar de investir.

> **A fronteira desta pasta.** `templates/backend/` é o código: como se modela o banco, como
> se publica, como se investiga um defeito. `templates/software/` é o que o dono decide e
> paga. Como escrever código não entra aqui.

> **O que não está aqui.** Descobrir se valia a pena construir está em
> `templates/software/validacao.md`. Fechar o escopo da primeira versão está em
> `templates/software/escopo.md`, com a lista única ordenada, o "como dizer não" e as
> armadilhas de quem ainda não lançou. A conta mensal e as quatro caixas do que o cliente
> pede depois estão em `custo.md`. Mexer sem derrubar o que já roda é `manutencao.md`. A hora
> da queda é `templates/backend/incidente.md`.

---

## A pergunta muda no dia seguinte ao lançamento

Antes de lançar, a pergunta é o que construir, e a única resposta disponível vem de
conversa. Depois de lançar existe uma fonte que não existia: o uso. Quem clicou, quem
voltou, quem parou no meio, quantos registros por tipo, qual tela recebe um terço dos
acessos e qual recebe quatro por cento.

Quase nenhum negócio pequeno faz essa troca. O sistema entra no ar, enche de dado sobre o
comportamento de quem usa, e as decisões continuam saindo da mesma reunião de antes. A lista
do que fazer segue sendo a lista de quem gritou mais alto.

A troca é barata. O dado já está gravado, e responder às perguntas abaixo custa uma consulta
e uma tarde.

---

## Fechar o ciclo da métrica que foi prometida

Todo item entrou na lista com motivação e métrica coladas nele. É a regra da seção "Uma lista
só, ordenada, sem empate" do `escopo.md`, e ela sozinha resolve metade do problema: obriga a
dizer, antes de construir, o que se espera daquilo.

A outra metade quase nunca acontece. **Ninguém volta para olhar.** A funcionalidade é
entregue, o item sai da lista, e a métrica prometida fica sem ninguém para consultá-la. O
ciclo só fecha quando alguém abre o número três a seis semanas depois da entrega.

A pergunta é curta: aquilo virou uso?

```sql
-- que fatia do uso é da funcionalidade nova, depois de um mês no ar?
SELECT tipo,
       COUNT(*)                                              AS registros,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)    AS pct
  FROM lancamentos
 WHERE criado_em >= DATE '2026-01-01'
 GROUP BY tipo
 ORDER BY registros DESC;
```

Três resultados possíveis, e o que cada um manda fazer:

| O que o número diz | O que fazer |
|---|---|
| Virou uso relevante e a motivação se cumpriu | Investir na segunda camada dessa funcionalidade, agora com base em como ela é usada de verdade |
| Tem uso, mas a motivação não se cumpriu (usam e o problema continua) | Voltar ao problema, não à tela. Provavelmente foi resolvido o pedido e não a dificuldade |
| Quase ninguém usa | Parar de investir. Avaliar desligar, e contar essa funcionalidade como custo de manutenção permanente |

**Pedido não é uso, e a diferença costuma ser grande.** Num produto de contagem de calorias,
o registro de atividade física era a funcionalidade mais pedida pelos usuários. Depois de
pronta e no ar, virou 1,8% dos registros contra 98,2% de alimentos, não mexeu na curva de
cadastro nem na de assinatura, e passou a gerar reclamação sobre o relatório que não a
mostrava. O autor mediu isso na própria base, em 2014, e o número não vale como régua para
outro produto. O que vale é o método: ele consultou em vez de lembrar.

Se a métrica prometida não pode ser consultada porque o dado nunca foi gravado, esse é o
achado do dia. Gravar entra na próxima leva, antes de qualquer funcionalidade nova.

---

## As primeiras semanas: responda tudo, implemente nada

Nas semanas seguintes ao lançamento chega a maior enxurrada de sugestão que o produto vai
ver. Ela é enganosa. Vem de quem acabou de chegar, ainda não usou o suficiente para saber do
que precisa, e descreve a solução que imaginou.

O que fazer com ela:

- responder rápido, sempre. A resposta cria a percepção de que existe alguém do outro lado, e isso segura o usuário mais do que a funcionalidade pedida
- agradecer sem prometer. Não anuncie funcionalidade que você não vai fazer
- ser educado com quem não for. A informação que ele traz continua valendo
- não montar sistema para catalogar sugestão. Formulário, quadro e planilha de ideias viram cemitério na terceira semana
- não implementar nada, por enquanto

A justificativa do último item é simples: **a sugestão que importa se repete sozinha.** Se
três pessoas diferentes trouxerem a mesma dificuldade em duas semanas, você vai lembrar sem
anotar. E o que aparece uma vez só teria custado código permanente por um pedido único.

Isso vale para as primeiras semanas. Passado esse período, a lista volta a ser ordenada
pelas regras do `escopo.md`.

---

## O ritmo é parte do mínimo

Lançar a versão menor é meio caminho. A outra metade é entregar melhoria com frequência
visível depois, uma por semana quando der, avisando quem usa a cada entrega.

Sem isso, o mínimo vira só um produto pequeno parado. Os primeiros usuários somem em
silêncio, sem reclamar, porque entenderam que ali não vai mudar nada. Ninguém escreve para
avisar que desistiu.

Duas condições antes de lançar qualquer mínimo:

1. A lista do que ficou de fora existe, escrita, e você consegue apontá-la para quem
   perguntar por que falta algo
2. Existe capacidade real de entregar melhoria por semana nas próximas semanas. Se o
   desenvolvedor entregou e foi embora, o mínimo não é mínimo: é tudo que vai existir, e o
   escopo precisa ser fechado com essa verdade em cima da mesa

---

## O diário de mudanças, e ele não é só de código

Um arquivo, três colunas, uma linha por mudança. Data, o que mudou, o que se esperava que
acontecesse.

| Data | O que mudou | O que eu esperava |
|---|---|---|
| 12/03 | Cadastro passou a pedir só nome e e-mail | Menos gente parando no meio do cadastro |
| 19/03 | Texto da página inicial trocado, agora fala do problema | Mais visitante chegando ao cadastro |
| 02/04 | Anúncio novo, com o preço visível | Menos clique, e clique mais qualificado |

A terceira linha do exemplo não é código, e é justamente por isso que o diário existe. Texto
de site, anúncio, preço, post e horário de atendimento mexem nos mesmos números que a
funcionalidade nova mexe. Quando o número se move e o diário não tem essas linhas, a
conversa vira "acho que foi aquela mudança, mas quando foi mesmo?".

Custa segundos por linha. Sem ele, todo número do mês seguinte é inexplicável, e o que é
inexplicável não ensina nada.

---

## Os dez minutos antes e os dez minutos depois

A observação mais barata que existe não é sobre o sistema. É sobre o que a pessoa faz em
volta dele.

Sente ao lado de quem usa, sem ajudar, e anote duas coisas: o que ela faz nos dez minutos
**antes** de abrir o sistema, e o que ela faz nos dez minutos **depois** de sair.

| O que você vê | O que aquilo é |
|---|---|
| Ela busca um número em outro sistema para digitar no seu | Uma integração, ou um campo que o sistema deveria preencher sozinho |
| Ela copia o resultado para uma planilha e monta um gráfico | Um relatório que deveria estar dentro do produto |
| Ela confere na mão o que o sistema já calculou | Falta de confiança no número, e isso é defeito |
| Ela imprime e guarda | Um comprovante, um histórico ou uma exigência que ninguém mapeou |

Prepare uma hipótese antes de cada rodada e reveja no fim dela. Depois de seis a oito
observações o padrão aparece, e ele costuma valer mais que a lista de sugestões inteira.

Uma pessoa observada já é infinitamente melhor que nenhuma. Se o orçamento não paga oito,
faça três.

---

## Uma frente por vez, duas se necessário

Sempre há mais oportunidade do que gente para persegui-la. Nunca o contrário.

Em negócio de uma a três pessoas, a régua é dura: duas frentes abertas ao mesmo tempo, três
no limite. Cada frente a mais é uma frente parada enquanto você olha as outras, e frente
parada com código no ar tem custo mensal.

Antes de abrir a terceira, feche uma. Fechar significa entregar, medir o uso, e decidir se
continua ou se para.

---

## Enquanto é aposta, o processo manual é aceitável

O produto que acabou de nascer é uma aposta, e aposta pede investimento em descobrir se
funciona, não em suportar volume que ainda não existe.

| Fase | Onde vai o dinheiro | O que fica manual |
|---|---|---|
| Aposta (poucos clientes, ninguém sabe se cola) | Construir e comunicar | Liberar acesso, emitir cobrança, importar planilha, avisar cliente |
| Confirmada (uso crescendo, receita repetindo) | Eliminar o manual, nessa ordem: o que mais consome hora humana primeiro | Quase nada |

Duas exceções que não são negociáveis, em nenhuma fase: **processo manual que toca dinheiro
do cliente ou dado sensível.** Ali o manual erra de forma aleatória e ninguém consegue
reconstruir o que aconteceu.

O erro inverso é igualmente caro. Manter o manual depois que o produto cresceu transforma
cada cliente novo em mais uma hora de trabalho, e é assim que um produto que vende bem morre
de custo de operação.

---

## Custo de operação é trabalho humano

A conta que aparece na fatura está em `custo.md`. A que não aparece é esta: quanto tempo de
gente o sistema consome por mês para continuar funcionando.

Some, num mês qualquer: mensagens de dúvida respondidas, correção de dado na mão, relatório
montado fora do sistema, cliente ligando para perguntar se o pedido entrou. Multiplique pelo
valor da hora de quem faz. Esse é o custo real de operação, e ele costuma ser maior que a
hospedagem.

A regra que reduz esse número está em `templates/backend/incidente.md`, seção "Chamado que se
repete é defeito de produto". Aqui interessa a decisão de dono que vem antes dela: **quando o
tempo de atendimento cresce junto com a base, o conserto é no software, não em mais gente
atendendo.** Contratar para atender um defeito é pagar todo mês por algo que se conserta uma
vez.

---

## Quando o crescimento para

A leitura confortável é "o produto amadureceu". Ela costuma estar errada, e custa caro
porque justifica parar de investir bem antes da hora.

Antes de aceitar a maturidade, responda:

- [ ] Continuamos focados no problema do cliente, ou trocamos isso por perseguir um número?
- [ ] O mercado inteiro desacelerou, ou só nós?
- [ ] É circunstancial (crise, sazonalidade, um mês ruim) ou vem de vários meses seguidos?
- [ ] Existe alguma coisa nova substituindo o que fazemos, inclusive por outro modelo de cobrança?
- [ ] Já tentamos voltar o foco ao problema do cliente, e mesmo assim não voltou a crescer?

Quando o time começa a discutir como subir um número em vez de discutir a dificuldade de
quem usa, ele perde justamente a ferramenta que fazia o número subir. A métrica é meio.

Se a resposta for sim para tudo, aí a decisão é outra: reduzir o investimento em
desenvolvimento, reduzir o custo de operação, e realocar o esforço para o próximo problema.

---

## Desligar o que morreu

Funcionalidade sem uso não é neutra. Ela cobra manutenção, cobra teste, aparece na tela de
quem está tentando fazer outra coisa, e vira exceção em toda mudança futura.

Desligar tem ordem:

1. Confirmar pela consulta que o uso é residual, e ver **quem** são os poucos que usam
2. Avisar essas pessoas antes, com prazo e com o que fazer no lugar
3. Esconder da interface primeiro, mantendo o código e o dado por um tempo combinado
4. Só então remover código e, por último, o dado, respeitando o que a lei obriga a guardar

Para descontinuar um produto inteiro o roteiro é o mesmo, com dois cuidados a mais: existe
substituto (seu ou de terceiro) e como o cliente migra para ele; e a comunicação é testada
num grupo pequeno antes de ir para a base toda. Depois do aviso geral, os casos difíceis se
resolvem um a um, no telefone.

Fim de venda e fim de uso são datas diferentes. Escreva as duas.

---

## Ensinar o dono a ser dono do software

Quem contrata sabe tocar o negócio e sabe comprar software pronto. Ser dono de um software
que se adapta todo mês é outra coisa, e ninguém nasce sabendo.

Entregar o sistema sem isso produz o mesmo final sempre: o dono pede funcionalidade, aceita
qualquer prazo, não sabe recusar nada, e seis meses depois tem um produto que ele não
consegue explicar. Faz parte da entrega deixar com ele três hábitos:

- **Priorizar** — uma lista só, ordenada, sem dois itens na mesma posição
- **Medir** — a métrica combinada antes, consultada depois, no prazo marcado
- **Recusar** — dizer não mostrando a lista, e devolvendo a responsabilidade de lembrar

Isso não é um extra de consultoria. É o que faz o resto do trabalho continuar valendo depois
que quem construiu sair de cena.

---

## Armadilhas

### Implementar o que "todo mundo pede" sem nunca medir

**Sintoma:** a funcionalidade mais pedida entra na frente das outras, é entregue com festa, e
a curva de cadastro e de uso não muda nada.
**O que custa:** o mês de desenvolvimento, mais a manutenção permanente daquilo, mais o
espaço que ela ocupa na tela de quem só quer fazer o principal.
**Conserto:** entregue e volte à consulta em três a seis semanas. Se o uso for residual, pare
de investir e diga isso em voz alta, para que ninguém peça a segunda versão dela.

### Construir porque o concorrente tem

**Sintoma:** itens na lista cuja justificativa é o nome de outra empresa, e não uma
dificuldade de quem usa.
**O que custa:** você paga para chegar em segundo lugar num lugar onde talvez ninguém tenha
lucro. E o concorrente pode estar errado.
**Conserto:** o item entra se, e somente se, tiver motivação escrita em termos do seu cliente.
Olhar concorrente serve para descobrir problema que você não viu, nunca para copiar solução.

### Empurrar a versão nova para toda a base no mesmo dia

**Sintoma:** enxurrada de reclamação na virada, gente que não acha mais o que usava, e o
telefone tocando sem que ninguém consiga atender.
**O que custa:** o desgaste com a base inteira de uma vez, por um problema que apareceria com
os dez primeiros.
**Conserto:** libere para um grupo pequeno, ouça, ajuste, e só então abra para todos. O
mecanismo técnico (chave de funcionalidade, canário) está em `templates/backend/entrega.md`,
seção "Estratégias". A decisão de usá-lo é do dono.

### O relatório que ninguém abre virando reunião

**Sintoma:** a ferramenta de estatística está instalada há meses e a discussão sobre o que o
cliente quer continua sendo por opinião.
**O que custa:** decisões caras tomadas por memória, com o dado a dois cliques.
**Conserto:** antes de qualquer reunião sobre o que fazer, abra o número de uso das telas e
os termos que as pessoas digitaram na busca do sistema. A busca vazia é a lista do que falta.

---

## O que não trazer para negócio de uma a três pessoas

O material de gestão de produto foi escrito para empresa com time de produto, e boa parte
dele não sobrevive à escala do comprador do ContexOS:

- **Teste A/B** — exige volume que o site do negócio pequeno não tem, e sem ele o resultado é ruído. Antes de confiar em qualquer teste, seria preciso rodar duas versões idênticas para medir a variação natural
- **Painel de métricas de assinatura** (funil completo, retenção por coorte, valor do cliente contra custo de aquisição) — o dinheiro do negócio se acompanha no `/caixa`, com o dado que ele já tem
- **Matriz de responsáveis** — com duas pessoas, é papelada
- **Percentual fixo do tempo para dívida técnica** — o equilíbrio se combina a cada fase, e o jeito que funciona está em `manutencao.md`, seção "Melhor que ontem"
- **Roadmap publicado com datas** — para fora, no máximo, os próximos um a três meses, sem data. Prazo publicado vira cobrança

E os números de mercado que vieram desse material ficaram de fora de propósito. São de 2011 a
2016, medidos em produtos que não são o seu. Casos citados aqui servem de exemplo de método,
nunca de régua: o número que decide é o que sai da **sua** consulta.

---

## Antes de fechar a próxima leva

- [ ] A métrica de cada item entregue na leva anterior foi consultada, com data
- [ ] O que teve uso residual está marcado, e a decisão sobre ele foi tomada (investir, parar ou desligar)
- [ ] O diário de mudanças está em dia, incluindo o que não é código
- [ ] Nenhum item novo entrou sem motivação escrita em termos de quem usa
- [ ] Existem no máximo duas ou três frentes abertas
- [ ] O custo humano do mês foi somado, e o que mais consome hora virou item da lista
- [ ] Quem pediu algo que não entrou ouviu não, e não "vou colocar no backlog"
