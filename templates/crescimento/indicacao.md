# Indicação — referência de programa pra negócio pequeno

Referência do `/indicacao`. Não é o workflow: é o que a skill consulta pra escolher o
tipo de programa, a recompensa, o rastreio e os termos sem improvisar.

---

## Os três tipos de programa

| Tipo | Quem indica | O que ele quer | O que muda no programa |
|---|---|---|---|
| **Cliente indica** | Quem já comprou e ficou satisfeito | Ajudar um conhecido e ganhar algo pequeno | Recompensa modesta, dos dois lados, sem contrato. É o que serve pra quase todo negócio pequeno |
| **Parceiro indica** | Outro negócio que atende o mesmo público (contador indica designer, arquiteto indica marceneiro) | Reciprocidade, não dinheiro | Acordo de mão dupla, recompensa em serviço ou crédito, combinado por escrito numa página |
| **Afiliado vende** | Alguém que divulga em troca de comissão | Dinheiro, com regra clara | Comissão em %, contrato, nota fiscal, link rastreado. É o único que vira relação comercial |

Começar pelo primeiro. Cliente satisfeito já quer indicar; o programa só dá o empurrão e
o motivo. Afiliado é pra quem já tem oferta que se vende sozinha e margem pra dividir.

---

## Recompensa: tipos e quando cada uma funciona

| Recompensa | Serve pra | Custo real pro negócio | Cuidado |
|---|---|---|---|
| **Desconto na próxima compra** | Negócio de recompra (salão, pet, clínica, curso) | Só o custo do serviço, não o preço cheio | Quem não pretende voltar não valoriza |
| **Crédito em conta** | Mensalidade, assinatura, pacote de horas | Igual ao desconto, mas acumula e prende | Precisa de controle de saldo |
| **Brinde ou upgrade** | Serviço de compra única (reforma, site, evento) | Custo do brinde, quase sempre menor que o valor percebido | Brinde genérico não move ninguém |
| **Pix ou dinheiro** | Quando o indicador não vai comprar de novo | O valor cheio | Vira renda pra quem recebe: acima de certo volume, entra a conversa de imposto |
| **Comissão em %** | Afiliado e parceiro comercial | Um pedaço de cada venda | Só com contrato e regra de pagamento escrita |

**Dos dois lados converte mais.** Quem indica precisa de um motivo pra falar, e quem
recebe a indicação precisa de um motivo pra agir agora. A recompensa do indicado é a que
faz a mensagem ser encaminhada: "ela me deu um código que te dá 10% de desconto" é uma
conversa; "indica aí que eu ganho um brinde" é um favor.

Recompensa paga **na compra**, nunca no cadastro. Programa que paga no cadastro enche a
lista de curioso e esvazia o caixa.

---

## Rastreio: como saber quem indicou quem

| Mecânica | Como funciona | Serve pra | Falha quando |
|---|---|---|---|
| **Pergunta no cadastro** | "Quem te indicou?" na primeira conversa ou no formulário | Todo negócio, mesmo sem site | Ninguém pergunta. Precisa virar hábito ou campo obrigatório |
| **Código pessoal** | Cada cliente tem um código curto (nome + 2 dígitos) que o indicado fala na hora de comprar | Balcão, WhatsApp, maquininha com cupom | Código difícil ninguém lembra |
| **Link com UTM** | Um link por indicador, com `utm_source=indicacao`, `utm_medium=<cliente|parceiro|afiliado>` e `utm_content=<codigo>` | Site, landing, loja virtual, formulário | Quem indica manda print em vez de link |
| **Cupom na loja virtual** | Cupom com o código do indicador, desconto automático | Loja virtual, plataforma de curso | Cupom vaza em site de cupons |

Padrão de link pra quem tem página:

```
https://seusite.com.br/?utm_source=indicacao&utm_medium=cliente&utm_campaign=programa&utm_content=<codigo>
```

Se `medicao/utm.md` (do `/medir`) já existe, a convenção de lá vence essa. Gerar o link por
comando (`new URL` + `searchParams`), nunca colar na mão: código com acento ou espaço
quebra o parâmetro.

Código bom: maiúsculo, sem acento, sem espaço, único por pessoa, curto o bastante pra falar
no balcão. `ANA27` funciona; `ana.souza-2026` não.

A pergunta no cadastro é o mínimo e o mais barato. As outras somam a ela, não substituem.

---

## A conta

O programa se paga quando o custo de trazer um cliente por indicação fica abaixo do que
o negócio já paga (ou pagaria) pra trazer um cliente por anúncio, e abaixo do que aquele
cliente deixa de margem.

```
custo por cliente indicado = recompensa de quem indica + desconto do indicado
                             (se a recompensa é paga no cadastro: recompensa ÷ taxa de conversão)
                             (afiliado: recompensa = ticket médio × comissão em %)
                             (brinde: o que o brinde custa pro negócio, não o preço de venda)

teto da recompensa somada  = o menor entre:
                             · margem de contribuição da 1ª compra × compras médias por cliente
                             · custo por cliente no anúncio (CPA), quando o negócio anuncia

folga                      = teto − custo por cliente indicado
```

Acima do teto, o programa deixa de compensar: ou vende a primeira compra no prejuízo, ou
paga mais caro que o anúncio pelo mesmo cliente. A margem vem do `/caixa`; o CPA vem do
`/relatorio-ads`. Sem os dois, a conta sai com `[a confirmar]` e não vira decisão.

Regra prática pra largar: recompensa somada em torno de metade do teto. Sobra folga pra
subir depois, e subir é uma notícia boa; baixar recompensa de programa que já existe é
quebra de confiança.

---

## Termos: as cláusulas mínimas

Uma página, linguagem de gente, publicada onde o indicador consegue mostrar pro indicado.

1. **O que conta como indicação:** pessoa nova, que nunca comprou, que informou o código ou o nome de quem indicou até o fechamento da compra
2. **Quando a recompensa libera:** depois do pagamento da primeira compra do indicado (e depois do prazo de arrependimento, se houver)
3. **Como recebe:** onde e em quanto tempo (crédito na conta em até X dias, Pix até o dia Y)
4. **Validade:** do código e da recompensa não usada
5. **Limite:** se há teto de recompensas por pessoa por mês, dizer o número
6. **O que não vale:** indicar a si mesmo, conta duplicada, indicação de quem já é cliente, código publicado em site de cupom
7. **Alteração e encerramento:** o negócio pode mudar ou encerrar o programa com aviso de X dias, respeitando o que já foi conquistado
8. **Dados:** o que é guardado de quem indica e de quem é indicado, e pra quê

Sorteio como recompensa muda de categoria: distribuição gratuita de prêmio por sorteio ou
concurso é promoção comercial regulada (Lei 5.768/1971) e pede autorização federal antes
de começar `[a confirmar com contador ou advogado na hora]`. Recompensa certa (desconto, crédito, brinde) não passa por
isso.

Afiliado com comissão é relação comercial: `/contrato` monta o acordo. Comissão prometida
por mensagem de WhatsApp vira briga na primeira venda grande.

Comissão paga a pessoa física pode exigir recibo, nota ou retenção `[a confirmar com o
contador antes de pagar a primeira]`.

---

## LGPD: o contato indicado

O ponto onde programa de indicação erra sem perceber. O nome e o telefone do indicado são
dados pessoais dele, e quem indicou não pode entregá-los ao negócio sem o indicado saber.

- **A abordagem vai em nome de quem indicou.** O indicador manda a mensagem (com o texto pronto que o negócio entrega); o negócio só fala com o indicado quando ele chama
- **Não pedir lista de contatos.** "Me passa o número de três amigos" é coleta sem consentimento
- **Se o indicado chegar por formulário**, o campo "quem te indicou" é dado do indicador, e ele já sabe que está no programa
- **Guardar o mínimo:** nome, código, data, status da recompensa. Nada de histórico de conversa do indicado. No registro mensal, o indicado entra só com o primeiro nome, e só depois que ele mesmo chamou
- **Saída fácil:** quem pedir pra sair do programa sai, e o registro fica só pelo prazo de pagar o que já foi conquistado

---

## Erros que matam o programa

- **Pedir cedo demais.** Antes de entregar, o cliente não tem o que contar. A janela é logo depois da entrega boa, confirmada
- **Pedir sem dar o texto pronto.** "Me indica pros seus amigos" exige que ele invente o que dizer. Ninguém inventa
- **Esquecer de avisar quem indicou.** A recompensa liberada em silêncio não gera segunda indicação. O aviso é a parte que mais importa
- **Programa que ninguém lembra.** Se não aparece na assinatura do e-mail, no rodapé da nota, na mensagem de pós-venda e no perfil, não existe
- **Recompensa só de um lado.** Sem ganho pro indicado, a mensagem não é encaminhada; sem ganho pro indicador, ninguém lembra do programa
- **Prazo inventado pra apressar.** "Só até sexta" com quem já é cliente é escassez falsa, e é onde a confiança quebra mais rápido. Validade existe nos termos ou não existe
- **Não medir.** Sem o número do mês, o programa vira "acho que funciona", e some no mês seguinte
- **Mudar a regra no meio.** Baixar recompensa, encurtar validade ou negar um pagamento por letra miúda custa mais que o que economiza
