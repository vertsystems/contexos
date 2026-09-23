# Troca e devolução — o que a lei obriga e o que a loja escolhe

Referência do `/troca-devolucao`. O `/whatsapp` consulta a tabela de casos quando chega
"posso trocar?", e o `/produto` olha a seção da política antes de escrever a página.

Por que existe: a loja pequena responde "troca" e "devolução" de cabeça, e erra nas duas
direções. Recusa o que a lei obriga (defeito, compra pela internet) e vira reclamação no
Procon ou no Reclame Aqui. Ou aceita o que não devia por medo de "processo" (troca por
gosto, sem política nenhuma) e perde margem. A distinção cabe em três linhas, e é ela
que este arquivo pina.

> **Não é assessoria jurídica.** É o Código de Defesa do Consumidor lido pra quem vende
> produto, com artigo, fonte e data. Multa de Procon, ação no juizado, produto que
> machucou alguém e qualquer cláusula fora do comum passam por advogado antes de virar
> resposta ao cliente.

Referência, não roteiro: quem conduz a conversa com o dono da loja é o `/troca-devolucao`.
Aqui ficam o artigo, a letra e a fonte, pra citar sem chutar.

Toda entrada abaixo foi conferida em **22/09/2026** no texto compilado da
[Lei 8.078/1990 (CDC)](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)
e do [Decreto 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm).
Lei muda pouco, mas muda: reconferir a cada atualização do sistema.

---

## Os três casos que a lei separa

| Caso | O que é | A loja é obrigada? | Prazo | Conta a partir de | Base |
|---|---|---|---|---|---|
| **Arrependimento** | cliente desiste sem motivo, produto sem defeito | **só se a venda fechou fora da loja** (site, marketplace, WhatsApp, Instagram, telefone, porta a porta) | 7 dias corridos | do recebimento do produto (ou da assinatura, em serviço) | art. 49 |
| **Defeito (vício)** | produto veio com problema, quebrou, não faz o que a embalagem diz, veio faltando | **sim, em qualquer canal**, inclusive balcão | 30 dias (não durável) ou 90 dias (durável) pra reclamar; a loja tem 30 dias pra consertar | da entrega efetiva; defeito escondido conta de quando aparece | art. 18 e 26 |
| **Troca por gosto** | não serviu, não gostou da cor, ganhou de presente e já tinha | **só se a loja prometeu**: placa, etiqueta, site, bio, nota, vendedor | o que a loja anunciou | o que a loja anunciou | art. 30 e 35 |

A mistura é o que custa caro. Os dois erros mais comuns ficam entre as linhas 1 e 3: "compra na internet tem
troca garantida" (não; tem devolução com dinheiro de volta) e "loja não é obrigada a
trocar" dito a quem comprou pelo WhatsApp (é, se ainda está nos 7 dias).

### O que cada artigo diz, na letra

- **Art. 49** — "O consumidor pode desistir do contrato, no prazo de 7 dias a contar de sua assinatura ou do ato de recebimento do produto ou serviço, sempre que a contratação de fornecimento de produtos e serviços ocorrer fora do estabelecimento comercial, especialmente por telefone ou a domicílio." Parágrafo único: o que foi pago volta "de imediato, monetariamente atualizado"
- **Art. 18, § 1º** — não sanado o vício "no prazo máximo de trinta dias", o consumidor escolhe: produto novo da mesma espécie, dinheiro de volta corrigido, ou abatimento proporcional do preço. § 2º: esse prazo pode ser combinado entre 7 e 180 dias, mas em contrato de adesão a cláusula tem que ser separada e assinada à parte. § 3º: se o defeito compromete o produto ou ele é essencial, o cliente pode pular o conserto e escolher direto
- **Art. 26** — o direito de reclamar de vício aparente caduca em 30 dias (produto não durável) ou 90 dias (durável). § 1º: a contagem começa "a partir da entrega efetiva do produto ou do término da execução dos serviços", e isso vale em qualquer canal, inclusive móvel comprado no balcão e entregue semanas depois. § 2º, I: a reclamação comprovadamente formulada à loja trava o prazo "até a resposta negativa correspondente, que deve ser transmitida de forma inequívoca". § 3º: vício oculto conta "no momento em que ficar evidenciado o defeito"
- **Art. 24** — a garantia legal "independe de termo expresso, vedada a exoneração contratual do fornecedor". Placa "não aceitamos trocas" não afasta defeito
- **Art. 30 e 35** — toda informação ou publicidade suficientemente precisa "obriga o fornecedor" e "integra o contrato". Recusada a oferta, o cliente pode exigir o cumprimento, aceitar equivalente ou desfazer a compra com o dinheiro de volta
- **Art. 50** — garantia contratual (a da loja, além da legal) é complementar e vale "mediante termo escrito", com forma, prazo e lugar de exercer
- **Art. 39, V** — é prática abusiva "exigir do consumidor vantagem manifestamente excessiva"
- **Decreto 7.962/2013, art. 5º** — na venda pela internet a loja tem que informar "de forma clara e ostensiva" como o cliente exerce o arrependimento; ele pode desistir "pela mesma ferramenta utilizada para a contratação" (§ 1º); a loja comunica o arrependimento "imediatamente" à operadora do cartão pra não lançar na fatura ou estornar (§ 3º); e manda ao cliente "confirmação imediata do recebimento da manifestação de arrependimento" (§ 4º). Cuidado com a confusão comum: confirmar o **pedido de compra** na hora é outra obrigação, do art. 4º, III ("confirmar imediatamente o recebimento da aceitação da oferta")
- **Decreto 7.962/2013, art. 2º** — o site tem que mostrar em destaque, entre outras coisas, CNPJ, endereço físico e eletrônico, "condições integrais da oferta" (inciso V) e "informações claras e ostensivas a respeito de quaisquer restrições à fruição da oferta" (inciso VI). É o inciso VI que torna o link da política de troca obrigatório, não opcional

### Como contar os dias

Dias corridos, sem o dia do começo e com o do vencimento ([Código Civil, art. 132](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm)).
Se o último dia cai em feriado, prorroga pro dia útil seguinte (§ 1º). O `scripts/prazos.js`
aplica as duas regras e mostra a data segura na coluna "aceitar até". Recebido dia 15,
o sétimo dia é o 22. Caiu no domingo? Vale segunda.

### Quem paga o quê

| Situação | Frete de ida | Frete de volta | Dinheiro | Fonte |
|---|---|---|---|---|
| Arrependimento (7 dias) | devolve | loja paga | tudo que ele pagou, corrigido, de imediato | art. 49, parágrafo único ("de imediato, monetariamente atualizados"); [STJ, REsp 1.340.604/RJ, 2013](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias-antigas/2015/2015-05-03_08-00_Consumidor-que-compra-pela-internet-tem-assegurado-o-direito-de-se-arrepender.aspx), que é a decisão sobre o frete de volta. O § 2º do art. 5º do Decreto 7.962 costuma ser citado aqui, mas ele fala de contrato acessório ("rescisão dos contratos acessórios, sem qualquer ônus"), não de frete |
| Defeito | loja arca | loja arca | se não consertar em 30 dias: produto novo, dinheiro corrigido ou abatimento, à escolha dele | art. 18, § 1º |
| Troca por gosto | como a política disser | como a política disser | como a política disser (crédito na loja é permitido) | art. 30 |

---

## Cliente pediu X: sou obrigado? O que respondo

| O cliente diz | Obrigado? | O que fazer |
|---|---|---|
| "Comprei no site, chegou e não gostei" (até 7 dias do recebimento) | sim | aceitar por escrito no mesmo dia, mandar a etiqueta ou combinar a coleta, devolver o valor cheio (com frete) assim que despachar; avisar a operadora do cartão no ato |
| "Comprei no site, passou dos 7 dias e não gostei" | não, salvo política própria | responder com a política de troca da loja; se não há, oferecer o que for razoável e dizer que é cortesia |
| "Comprei na loja, não serviu" | não, salvo política própria | o que a etiqueta, a placa ou a bio prometem. Se prometeu "troca em 30 dias", é obrigação nos termos anunciados |
| "Ganhei de presente, quero trocar" | não, salvo política própria | mesma regra da linha acima; prazo conta da compra, não do presente, a não ser que a loja diga diferente |
| "Veio com defeito" (dentro de 30/90 dias) | sim | pedir foto ou trazer; escolher entre trocar na hora ou consertar em até 30 dias; passou dos 30, o cliente escolhe |
| "Quebrou depois de 4 meses" (durável) | depende | fora dos 90 dias de vício aparente. Três saídas antes de negar: se for vício oculto, o prazo conta de quando apareceu (art. 26, § 3º); se a loja ou o fabricante deram garantia por escrito, ela vale nos termos dela (art. 50) — rodar `node scripts/prazos.js --garantia <dias>` pra ter a data; e a assistência autorizada resolve sem passar pela loja. Nenhuma das três, aí sim advogado |
| "Veio faltando peça / quantidade errada" | sim | vício de quantidade (art. 19): completar, abater ou devolver, à escolha dele |
| "Não é o que estava no anúncio" | sim | a oferta obriga (art. 30 e 35): cumprir como anunciado, dar equivalente ou desfazer com dinheiro de volta |
| "Quero o dinheiro de volta, não crédito" (arrependimento ou defeito não sanado) | sim | em arrependimento o dinheiro volta; em defeito não consertado em 30 dias, também. Crédito só se ele aceitar |
| "Quero o dinheiro de volta" (troca por gosto) | não | a política decide; crédito ou troca por outro item é legítimo, desde que anunciado antes |
| "Perdi a nota / joguei a caixa fora" | continua obrigado nos casos de lei | nota não é a única prova (extrato, mensagem, pedido no site servem). Exigir embalagem original pra defeito ou arrependimento é abusivo (Idec, ver fontes) |
| "Usei uma vez e quero devolver" (arrependimento) | sim, se dentro dos 7 dias | o direito não pede motivo; a loja pode recusar só se o produto voltou danificado além do teste razoável. Zona cinzenta: advogado se o valor for alto |
| "Comprei no marketplace" | sim, solidário | loja e plataforma respondem juntas (art. 18, caput: "solidariamente"); a loja não empurra o cliente pra plataforma |

---

## O que a política escrita precisa ter

Sem isso, a política não protege ninguém. O mínimo:

1. **Três seções separadas**, com título: defeito, arrependimento (só se vende fora da loja) e troca por gosto. Misturar é o que gera a briga
2. **Prazo em dias corridos** e a partir de quê (compra ou recebimento)
3. **Condições da troca por gosto**: etiqueta, sem uso, sem lavar, na embalagem. Aqui a loja pode exigir, porque é cortesia dela
4. **Como pedir**: canal (WhatsApp, e-mail, formulário), o que mandar (número do pedido, foto), horário
5. **Como o dinheiro volta**: Pix em X dias úteis, estorno no cartão (a operadora leva até duas faturas), crédito na loja com validade
6. **Quem paga o frete** em cada caso, sem esconder
7. **Exceções**, escritas antes da compra, não depois
8. **Data da versão** no rodapé; a política que valia na compra é a que vale pro pedido

### O que não pode entrar

- "Não aceitamos trocas nem devoluções" sem ressalva do defeito e do arrependimento: viola o art. 24 e o art. 49
- Vale-troca obrigatório em arrependimento ou em defeito não sanado: o art. 49 fala em devolver o valor
- Frete de devolução por conta do cliente no arrependimento: STJ já decidiu contra
- Exigir embalagem original ou nota fiscal como condição única pra defeito
- Prazo de conserto acima de 30 dias em contrato de adesão sem cláusula separada e assinada (art. 18, § 2º)
- Restringir o arrependimento a "produto lacrado": o direito é de desistir, e o cliente precisou abrir pra ver

### Zona cinzenta: escrever antes, e com ressalva

O CDC não abre exceção ao art. 49. Nenhuma. A prática e parte da jurisprudência aceitam
restrição em alguns casos, desde que informada **antes** da compra. Cada item abaixo entra
na política como regra da loja, com a frase "sem prejuízo do direito de arrependimento
previsto em lei" e marcado `[a confirmar com advogado]` no arquivo do usuário:

- **Personalizado ou sob medida** (nome gravado, tamanho fora de linha): revenda inviável; costuma ser aceito restringir a troca por gosto. Arrependimento em 7 dias segue discutível
- **Perecível** (alimento, flor, bolo): o prazo de 7 dias esbarra na validade. Informar e registrar a entrega com foto
- **Íntimo e higiene** (roupa íntima, cosmético aberto, brinco): a loja pode condicionar a troca por gosto a lacre intacto. Defeito continua coberto
- **Conteúdo digital** (curso, e-book, licença): entregue e consumido, o arrependimento é contestado. Advogado
- **Peça de brechó ou mostruário**: vender como "com marca de uso" descrita não afasta defeito não descrito

---

## Sinais de que a política está errada

| Sinal | O que fazer |
|---|---|
| A placa diz "não trocamos" e o Instagram diz "troca garantida" | a promessa mais generosa obriga (art. 30); unificar hoje |
| O vendedor promete no balcão o que a etiqueta não diz | a promessa verbal também obriga e é a mais difícil de provar; treinar e escrever |
| Reclame Aqui com "não devolvem o dinheiro" | quase sempre é arrependimento tratado como troca; responder com a data e o Pix |
| Cliente cita "7 dias" pra compra no balcão | não existe; responder com a política da loja, sem "a lei não obriga" seco |
| Estorno no cartão "em até 90 dias" | a loja comunica a operadora no ato (Decreto 7.962, art. 5º, § 3º); o resto é prazo da operadora, e a política precisa dizer isso |

---

## Fontes

- [Lei 8.078/1990, CDC, texto compilado](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) — art. 18, 19, 24, 26, 30, 35, 39, 49, 50. Conferido em 22/09/2026
- [Decreto 7.962/2013, comércio eletrônico](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm) — art. 2º a 5º. Conferido em 22/09/2026
- [Código Civil, art. 132](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) — contagem de prazo. Conferido em 22/09/2026
- [STJ, REsp 1.340.604/RJ](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias-antigas/2015/2015-05-03_08-00_Consumidor-que-compra-pela-internet-tem-assegurado-o-direito-de-se-arrepender.aspx) — frete de devolução no arrependimento é da loja. Notícia do STJ, conferida em 22/09/2026
- [Idec, troca de produto em loja física](https://idec.org.br/dicas-e-direitos/troca-de-produto-em-loja-fisica) — troca por gosto é critério da loja; política anunciada obriga; exigir embalagem original é abusivo. Conferido em 22/09/2026
- [Procon-SP, Guia de Comércio Eletrônico (PDF, 2024)](https://www.procon.sp.gov.br/wp-content/uploads/2024/08/Guia_de_Comercio_Eletronico.pdf) — 7 dias contados do recebimento; pedido pela mesma ferramenta da compra; confirmação imediata. Conferido em 22/09/2026
- [Idec, art. 18 do CDC comentado](https://idec.org.br/pagina-de-livro/artigo-18deg) e [art. 49 comentado](https://idec.org.br/pagina-de-livro/artigo-49deg) — as três escolhas do cliente quando o conserto passa de 30 dias, e o alcance do arrependimento. Conferidos em 22/09/2026
- [consumidor.gov.br](https://www.consumidor.gov.br/) — plataforma oficial de reclamação. Quando o cliente fala em Procon, é por aqui que a reclamação costuma chegar primeiro, e a loja cadastrada responde em até 10 dias. Conferido em 22/09/2026
