# Aceite de entrega — o documento que encerra o projeto

Referência do `/autorizacao`. O `/contrato` aponta pra cá quando escreve a cláusula de
entrega e revisão; o `/cobranca` lê a data do aceite pra saber quando a parcela final
venceu de verdade; o `/pos-venda` usa o aceite como o marco de "acabou de entregar".

Por que existe: sem aceite, o projeto não acaba. O cliente pede "só mais um ajuste" na
sexta semana, a parcela final não vence porque "ainda não está pronto", e quando ele
reclama de um erro seis meses depois ninguém sabe se o erro veio na entrega ou depois.
O aceite é uma página que diz: isto foi entregue, neste dia, e está aqui. A partir
daqui, revisão é escopo novo e garantia tem data pra acabar.

> **Não substitui advogado.** O aceite documenta a entrega e o que ela fecha. Disputa
> aberta sobre qualidade, obra de construção civil, valor alto retido e cliente que se
> recusa a receber passam por advogado antes de qualquer mensagem de cobrança.

Toda entrada abaixo foi conferida em **22/09/2026** nos textos oficiais indicados.

---

## O que a lei diz sobre receber um trabalho

| Norma | O que diz, na letra | O que muda no aceite |
|---|---|---|
| [Código Civil, art. 615](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) | "Concluída a obra de acordo com o ajuste, ou o costume do lugar, o dono é obrigado a recebê-la. Poderá, porém, rejeitá-la, se o empreiteiro se afastou das instruções recebidas e dos planos dados, ou das regras técnicas" | O cliente não pode recusar por gosto o que foi feito conforme o combinado. Por isso o aceite lista item a item o que o contrato pedia |
| [Código Civil, art. 616](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) | "pode quem encomendou a obra, em vez de enjeitá-la, recebê-la com abatimento no preço" | É a base do aceite com ressalva: recebe, aponta a pendência, e o preço ou o prazo se ajusta em vez de travar tudo |
| [Código Civil, art. 132](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) | prazos "excluído o dia do começo, e incluído o do vencimento"; se vence em feriado, "prorrogado o prazo até o seguinte dia útil" (§ 1) | Garantia de 30 dias a partir da entrega de dia 19 termina dia 19 do mês seguinte, e passa pra segunda se cair no domingo. O `scripts/autorizacao.js` calcula |
| [CDC, art. 26](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | reclamar de vício aparente caduca em "trinta dias, tratando-se de fornecimento de serviço e de produtos não duráveis" e "noventa dias, tratando-se de fornecimento de serviço e de produtos duráveis", contados "do término da execução dos serviços" (§ 1) | Quando o cliente é consumidor (pessoa física contratando pra uso próprio), a garantia contratual não encurta esse prazo. O aceite escreve os dois, e a contagem corre do término da execução — a data da entrega, não a da assinatura |
| [CDC, art. 20](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | vício do serviço dá ao consumidor a escolha entre "reexecução dos serviços, sem custo adicional", "restituição imediata da quantia paga" ou "abatimento proporcional do preço" | Erro apontado no prazo se corrige sem cobrar. É o que a cláusula de garantia do aceite promete, e não é favor |

Cliente empresa contratando pra atividade dela (agência pra loja, fotógrafo pra
restaurante) costuma ficar fora do CDC, e vale o Código Civil e o contrato. Cliente
pessoa física contratando pra si (site do consultório, ensaio de família, reforma da
casa) é consumidor. Na dúvida, o aceite trata como consumidor: o custo é uma linha a
mais, e o erro contrário custa a discussão inteira.

**Aceite tácito** (silêncio vale como aceite) não está na lei: vem do contrato. Se o
`/contrato` tem a cláusula "sem manifestação em X dias úteis após a entrega, o trabalho
considera-se aceito", o aceite pode ser registrado por essa via, com a mensagem de
entrega e a data como prova. Sem a cláusula, silêncio é só silêncio.

---

## O que o aceite precisa ter

| Parte | O que entra | Por que |
|---|---|---|
| **Projeto e contrato** | nome do trabalho igual ao da proposta, e o caminho do contrato | é contra o contrato que se confere se "concluída de acordo com o ajuste" |
| **Quem recebe** | nome, documento, quem assina pela empresa | aceite assinado por quem não decide vale pouco |
| **Data de entrega** | o dia em que o material ficou disponível, não o dia da assinatura | é dela que contam a garantia e o art. 26 |
| **Lista do entregue** | cada item com **onde está** (link, pasta, e-mail com data) | "entreguei" sem lugar não se prova; link com data se prova |
| **Ressalvas** | cada pendência com data pra resolver, ou "nenhuma" | a ressalva é o art. 616 em ação: recebe agora, conserta o pequeno, sem travar o pagamento |
| **O que fecha** | fim das revisões, vencimento da parcela final, prazo de garantia, quem guarda cópia | são as quatro perguntas que voltam depois se não estiverem escritas |
| **Assinatura** | duas partes, cidade, data | resposta escrita no WhatsApp vale, com print guardado |

**O que não entra:** "o cliente renuncia a qualquer reclamação" (o
[CDC, art. 51, I](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm), declara
nula de pleno direito a cláusula que "impossibilite, exonere ou atenue a responsabilidade
do fornecedor por vícios de qualquer natureza" ou "implique renúncia ou disposição de
direitos"), lista genérica ("todos os
arquivos do projeto"), data de entrega igual à data do aceite quando não foi (o cliente
levou uma semana pra olhar; a entrega foi antes), garantia sem prazo.

---

## Os três desfechos

| Desfecho | O que o cliente diz | O que o aceite registra | O que abre |
|---|---|---|---|
| **Aceite pleno** | "está tudo certo" | ressalvas: nenhuma | parcela final, garantia contando, portfólio se o contrato permite |
| **Aceite com ressalva** | "ficou bom, só a foto 41" | a pendência, com data | parcela final (o contrato pode segurar uma parte proporcional), garantia contando da entrega |
| **Recusa** | "não é isso que eu pedi" | não há aceite; registrar por escrito o que falta, item a item, contra o contrato | se o que falta está no contrato, é entrega pendente; se não está, é escopo novo, e vai pro `/contrato` como aditivo |

A recusa por gosto, com o trabalho conforme o contrato, não impede o aceite (art. 615).
Mas discutir isso por mensagem raramente resolve. O caminho é: listar o que o contrato
pedia, ao lado do que foi entregue, e pedir que ele aponte a diferença. Se não há
diferença, o aceite tácito do contrato (se existe) ou o advogado.

---

## A versão curta

Cabe numa mensagem, e é a que o cliente responde. O `scripts/autorizacao.js gerar`
escreve a partir do JSON:

```
Carlos, fechando o ensaio: entreguei em 19/09
• 62 fotos tratadas (pasta no Drive, link no e-mail de 19/09)
• 62 versões pra Instagram (subpasta "instagram")
Fica pendente, por minha conta:
• trocar a foto 41 (reflexo na vitrine), até 29/09

Se está tudo certo, me responde "aceito" que eu considero entregue e a última
parcela (R$ 1.500) fica pra 29/09. Se faltou alguma coisa, me diz o quê que eu
resolvo antes.
```

A última frase importa: convida a ressalva agora, em vez de daqui a um mês. E a
resposta "aceito" é a assinatura; o print vai pra pasta do termo.

---

## Situações que voltam

| O que acontece | O caminho |
|---|---|
| O cliente some e não responde o aceite | três contatos, como no `/pos-venda`: dois dias depois, uma semana depois com a data do aceite tácito se o contrato tem, e o último dizendo que a partir de tal dia o trabalho está considerado entregue. Sem cláusula de aceite tácito, a parcela final depende do contrato, e o `/cobranca` assume |
| Ele aceita e pede mais uma coisa no mesmo dia | o aceite fecha. O pedido novo é aditivo do `/contrato`, com prazo e valor, registrado por escrito antes de começar |
| Ele reclama de um erro depois do aceite | dentro da garantia (ou do art. 26, se consumidor), corrigir sem cobrar e sem discutir. Fora do prazo e sem ser vício oculto, orçamento novo. Vício oculto, o que não dava pra ver na entrega, conta do dia em que apareceu (art. 26, § 3) |
| Ele quer assinar o aceite mas está devendo a parcela anterior | no documento, aceite e pagamento são independentes. A cobrança do que já venceu é do `/cobranca`, e o aceite não perdoa nada |
| A entrega é por etapa | um aceite por etapa. O art. 614 do Código Civil prevê pagamento por medida ou por partes; cada aceite lista só a etapa dele, e o último fecha o projeto |

---

## Onde registrar

| O que | Onde |
|---|---|
| O JSON que gera o aceite | `contratos/termos/aceite-<cliente>.json` |
| O aceite (`.md`, `.html`, `.docx` se gerou) e a versão curta | `contratos/termos/aceite-<cliente>.*` |
| O print ou o `.docx` assinado | `contratos/termos/aceite-<cliente>-prova.png` (ou `.eml`, `.docx`) |
| A data do aceite | `assinatura` no JSON, gravado por `scripts/autorizacao.js registrar` |
| A parcela final e o fim da garantia | `tarefas.md`, com data e dia da semana |
| O marco "entregue" | `vendas/pos-venda/`, pro pedido de depoimento do `/pos-venda` |

Na convenção por cliente, o prefixo `clientes/<Nome>/` entra antes de `contratos/`.
