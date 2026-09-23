# Autorização de uso — nome, depoimento, imagem e resultado de cliente

Referência do `/case` e do `/autorizacao`. Não é o workflow: é o termo pronto pra
preencher, o que cada campo significa, como pedir sem constranger e onde registrar. O
`/case` usa a seção "Resultado e número"; o `/autorizacao` cobre os outros usos (foto de
pessoa, imagem de menor, voz, obra) com o mesmo esqueleto.

> **Não substitui advogado.** O termo cobre o uso comum de um negócio pequeno: citar
> nome, mostrar número, publicar depoimento e foto. Contrato de exclusividade, cessão de
> direito autoral, imagem de menor de idade e qualquer uso em campanha paga de terceiros
> passam por advogado antes.

---

## Por que existe um termo

Três leis sustentam o pedido, e as três apontam pra mesma coisa: autorização por escrito,
específica, que o cliente pode retirar.

| Lei | O que diz | O que muda no termo |
|---|---|---|
| Código Civil, art. 20 (Lei 10.406/2002) | "Salvo se autorizadas", a divulgação de escritos, a transmissão da palavra e a publicação da imagem de uma pessoa podem ser proibidas a pedido dela, sem prejuízo da indenização que couber, quando se destinarem a fins comerciais | Case é fim comercial. Sem autorização, o cliente pode mandar tirar e cobrar |
| LGPD, art. 7, I, e art. 8, caput (Lei 13.709/2018) | Tratar dado pessoal com base em consentimento exige manifestação por escrito ou por outro meio que demonstre a vontade do titular, pra finalidade determinada | Nome de pessoa, foto e depoimento assinado são dado pessoal. O termo diz **pra quê** e **onde** |
| LGPD, art. 8, § 5, e art. 18, IX | O consentimento pode ser revogado a qualquer momento, por manifestação expressa do titular, em procedimento gratuito e facilitado | O termo tem cláusula de revogação e o negócio tem que conseguir tirar a peça do ar |

Fontes: planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm e
planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm, conferidos em 2026-09-23.

Nome de **empresa** (CNPJ) não é dado pessoal, mas o art. 20 do Código Civil e o contrato
de prestação de serviço (que às vezes tem cláusula de confidencialidade) continuam valendo.
O `/contrato` do Contex OS não inclui autorização de case por padrão; por isso o termo é
separado.

---

## O termo

Preencher tudo entre colchetes. O `scripts/case.js conferir` avisa se sobrou campo em branco.

```markdown
# Autorização de uso de nome, resultado e depoimento

Eu, [nome completo de quem assina], [cargo ou relação: sócia, dono, gerente], representando
[nome do cliente ou da empresa cliente], CNPJ/CPF [número], autorizo [nome do negócio do
usuário], CNPJ/CPF [número], a usar os itens marcados abaixo em material de divulgação do
trabalho realizado entre [data de início] e [data de fim].

## O que autorizo

- [ ] Citar o nome [da empresa | meu nome]
- [ ] Mostrar o logotipo
- [ ] Publicar os números do resultado: [listar: "perda de 12% pra 3%", "faturamento de R$ 18.000 pra R$ 24.500"]
- [ ] Publicar o depoimento: "[texto literal do depoimento]"
- [ ] Usar a foto [descrever: fachada, produto, minha foto] enviada em [data]
- [ ] Citar nome de [funcionário ou pessoa da equipe], com autorização dela em separado

## Onde pode aparecer

- [ ] Site e página de vendas de [nome do negócio]
- [ ] Redes sociais de [nome do negócio]
- [ ] Proposta comercial enviada a outros clientes
- [ ] Apresentação em reunião e evento
- [ ] Material impresso
- [ ] Anúncio pago

## Condições

1. O uso é gratuito e não cria vínculo além do trabalho já contratado.
2. Vale por [prazo: 2 anos | tempo indeterminado] a partir da assinatura.
3. Posso revogar a qualquer momento, sem custo, por mensagem a [canal: e-mail ou WhatsApp].
   Depois do aviso, [nome do negócio] tem [prazo: 10 dias] pra tirar o material do ar e
   deixar de usar em peça nova. Peça já impressa ou já enviada não precisa ser recolhida.
4. Os números publicados são os que constam no arquivo de fatos conferido em [data], e não
   serão alterados sem nova autorização.
5. [Nome do negócio] não vai usar meu nome ou resultado pra prometer o mesmo resultado a
   outras pessoas.

[Cidade], [data por extenso]

_______________________________
[nome completo]
[CPF]
```

Assinatura vale de três formas, da mais simples pra mais formal: resposta por escrito no
WhatsApp ou e-mail ("autorizo os itens 1, 3 e 4 conforme o termo") guardada com print e
data; `.docx` assinado e devolvido; assinatura eletrônica. Pra case, a primeira costuma
bastar. Guardar o print junto do termo.

---

## Como pedir

O pedido vem **depois** do depoimento, nunca junto. Quem acabou de elogiar o trabalho
autoriza com gosto; quem recebe um termo de duas páginas antes de falar qualquer coisa
recua. A ordem do `/pos-venda` é: confirmar que ficou bom, pedir o depoimento, e aí:

> "Que bom que ficou como você queria. Posso contar esse resultado como exemplo
> do meu trabalho? Seria o nome da [padaria], os dois números que a gente mediu e
> a sua frase. Te mando um resumo do que apareceria pra você marcar o que autoriza."

Duas mensagens depois disso, o termo, preenchido, com o texto do case curto junto pra ele
ver exatamente o que vai sair. Quem vê o texto pronto decide na hora; quem recebe um termo
genérico deixa pra depois.

Se ele hesitar no nome: oferecer a versão anônima ("uma padaria de bairro com 3
funcionários"). Hesitou no número? A versão sem o valor absoluto, só a variação
("caiu 75%"), costuma resolver. E quando ele hesita em tudo, agradecer e não insistir. Case
forçado vira cliente perdido.

---

## Onde registrar

| O que | Onde |
|---|---|
| O termo preenchido | `biblioteca/cases/<slug>-autorizacao.md` (e o `.docx`, se gerou) |
| O print ou e-mail da resposta | `biblioteca/cases/<slug>-autorizacao-resposta.png` ou `.eml` |
| A data e os itens autorizados | `autorizacao.data` e `autorizacao.itens` no `<slug>.fatos.json` |
| A coluna "Pode citar o nome" | tabela "Cases" do `biblioteca.md` |
| Prazo de validade e pedido de revogação | `tarefas.md`, com data |

Revogação recebida: tirar o case das peças públicas no prazo do termo, marcar a linha da
biblioteca como `revogado em <data>`, manter o arquivo (não apagar: é o registro de que
existiu autorização no período em que foi usado) e avisar as skills consumidoras na próxima
vez que rodarem. O `/case` faz isso quando o usuário disser "o cliente pediu pra tirar".

---

## O que o termo não cobre

- **Foto de pessoa identificável** que não assinou: cada pessoa autoriza a própria imagem. Funcionário do cliente na foto precisa de termo próprio (é o caso do `/autorizacao`)
- **Menor de idade**: só com responsável legal, e com advogado olhando
- **Dado sensível** (saúde, religião, orientação, biometria): resultado de tratamento de paciente, por exemplo, tem regra do conselho profissional além da LGPD. O `/publicidade-regulada` confere a resolução antes
- **Cláusula de confidencialidade** no contrato com o cliente: vence o termo. Ler o contrato antes de pedir
- **Uso por terceiros**: o cliente autorizou o seu negócio, não a agência que faz o seu anúncio nem um parceiro. Repassar exige item específico no termo
