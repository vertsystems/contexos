# Autorização de imagem, voz e depoimento — o que a lei pede e como pedir

Referência do `/autorizacao`. O `/case` usa o esqueleto de
`templates/crescimento/autorizacao-de-uso.md` pra nome e número de resultado; este
arquivo cobre o resto: foto de paciente e de cliente, antes e depois, depoimento em
vídeo, áudio que vira depoimento, foto de evento, foto de equipe e imagem de menor. O
`/pos-venda` consulta a seção "Como pedir" na hora de pedir o depoimento, e o
`/biblioteca` só marca "Autorizado: sim" com o termo daqui.

Por que existe: o dono de negócio pequeno publica a foto do cliente feliz, o vídeo da
paciente no fim do tratamento, o print do WhatsApp elogiando. Quase sempre com um "posso
postar?" falado, que ninguém guardou. Quando o cliente muda de ideia, ou quando a
relação azeda, a peça publicada vira pedido de indenização. E indenização por uso
comercial de imagem sem autorização não precisa de prova de prejuízo.

> **Não substitui advogado.** O termo cobre o uso comum de negócio pequeno: foto,
> vídeo, áudio e frase de cliente em rede social, site, proposta, impresso e anúncio.
> Campanha paga de terceiro, cessão de direito autoral, exclusividade, imagem de menor
> em peça pública e qualquer disputa já aberta passam por advogado antes.

Toda entrada abaixo foi conferida em **22/09/2026** nos textos oficiais indicados.
Lei muda pouco, mas muda: reconferir a cada atualização do sistema.

---

## As quatro leis que sustentam o termo

| Norma | O que diz, na letra | O que muda no termo |
|---|---|---|
| [Código Civil, art. 20](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) | "Salvo se autorizadas [...], a divulgação de escritos, a transmissão da palavra, ou a publicação, a exposição ou a utilização da imagem de uma pessoa poderão ser proibidas, a seu requerimento e sem prejuízo da indenização que couber [...] se se destinarem a fins comerciais" | Foto, voz e texto do cliente em peça do negócio é fim comercial. Sem autorização, ele manda tirar e cobra |
| [STJ, Súmula 403](https://www.stj.jus.br/docs_internet/revista/eletronica/stj-revista-sumulas-2014_38_capSumula403.pdf) | "Independe de prova do prejuízo a indenização pela publicação não autorizada de imagem de pessoa com fins econômicos ou comerciais" | O cliente não precisa provar que perdeu algo. Basta a foto publicada sem o sim |
| [LGPD, art. 7, I, e art. 8](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) | Consentimento "por escrito ou por outro meio que demonstre a manifestação de vontade" (art. 8); por escrito, "deverá constar de cláusula destacada" (§ 1); "deverá referir-se a finalidades determinadas, e as autorizações genéricas [...] serão nulas" (§ 4); "pode ser revogado a qualquer momento [...] por procedimento gratuito e facilitado" (§ 5) | O termo diz pra quê, onde, por quanto tempo e como retirar. "Autorizo o uso da minha imagem" sem finalidade não vale |
| [LGPD, art. 11, I, e art. 14, § 1](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) | Dado sensível (saúde, entre outros, art. 5, II) só com consentimento "de forma específica e destacada, para finalidades específicas"; dado de criança só "com o consentimento específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal" | Foto de tratamento ganha a cláusula de saúde. Foto de criança é assinada pelo responsável, com cláusula própria |

Dois complementos que aparecem em caso concreto:

- [Lei 9.610/1998, art. 29](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm) — a **foto** tem dono, e é quem clicou. Se o fotógrafo não é o negócio (cliente mandou foto tirada por outro profissional, evento fotografado por terceiro), a autorização da pessoa não basta: precisa da autorização de quem fez a imagem. O `scripts/autorizacao.js` avisa quando `por` é diferente do negócio
- [ECA, art. 17](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm) — a integridade da criança e do adolescente abrange "a preservação da imagem, da identidade, da autonomia". Responsável assina, e a peça pública passa por advogado

Nome de **empresa** (CNPJ) não é dado pessoal, mas o art. 20 do Código Civil vale pra
pessoa que aparece na foto ou fala no vídeo, e a cláusula de confidencialidade do
contrato com a empresa vale sobre tudo. Ler o contrato antes de pedir.

---

## Por situação: o que muda em cada pedido

| Situação | Quem assina | O que entra a mais no termo | Cuidado |
|---|---|---|---|
| **Depoimento em vídeo ou texto** | quem fala | a fala literal (texto ou transcrição), o canal, o prazo | não editar além de corte; frase cortada que muda o sentido é uso fora da autorização |
| **Áudio de WhatsApp virando depoimento** | quem gravou | a transcrição literal, e se a voz vai ao ar ou só o texto | o art. 20 fala em "transmissão da palavra": voz é imagem pra esse fim |
| **Foto de cliente com o resultado** (corte de cabelo, reforma, bolo, tatuagem) | quem aparece | o que aparece (rosto, corpo, casa), se com nome ou sem | foto de casa mostra endereço, placa, vizinho: anonimizar o que não é o trabalho |
| **Foto ou vídeo de paciente** (dentista, estética, fisio, nutrição) | o paciente | cláusula de dado sensível (art. 11, I) e o anonimato que o conselho exigir | ver a seção de profissão regulada abaixo; o `/publicidade-regulada` confere a peça antes de publicar |
| **Antes e depois** | o paciente ou cliente | as duas imagens descritas com data de cada uma; sem edição; aviso de que o resultado varia | CFM: só com finalidade educativa e em conjunto com evolução insatisfatória e complicação; CFO: só o profissional que executou, com nome e CRO |
| **Foto de evento** | cada pessoa em destaque | aviso na entrada e no ingresso cobre a plateia como fundo; quem aparece em close, falando ou identificável assina termo | aviso de entrada não é consentimento (art. 8, § 4); é o que reduz o risco no fundo da foto |
| **Foto de equipe ou funcionário** | a pessoa | prazo curto, revogação sem consequência, nada condicionado ao emprego | consentimento de empregado é frágil pela relação de poder; termo específico e revogável, e a peça sai quando a pessoa sair |
| **Menor de idade** | pai, mãe ou responsável legal | a cláusula do art. 14, § 1, o nome do responsável e do menor | advogado antes de peça pública; sem rosto quando der |

---

## O termo, cláusula por cláusula

O `scripts/autorizacao.js gerar` escreve o termo a partir do JSON. O esqueleto, pra
saber o que cada parte faz:

```markdown
# Autorização de uso de imagem (ou de depoimento)

Eu, [quem assina, documento, relação com o negócio], autorizo [negócio, documento,
responsável] a usar o que está descrito abaixo, nas condições deste termo.

## 1. O que autorizo
- [cada foto, vídeo, áudio ou frase, com a data em que foi captado e por quem]
  - Texto literal: "[a fala, sem melhorar]"
- [Com meu nome | Sem meu nome, sem rosto identificável]

## 2. Pra quê
Finalidade: [uma frase concreta]. Nada além disso.

## 3. Onde pode aparecer
- [canal por canal: redes, site, proposta, impresso, anúncio pago]

## 4. Condições
1. Gratuito (ou o valor), sem vínculo novo.
2. Prazo (2 anos é o usual) e a data em que termina.
3. Revogação: por onde, e em quantos dias a peça sai do ar.
4. Sem edição além de corte e correção; sem promessa de resultado a terceiros.
5. [se saúde] Consentimento específico e destacado pra dado sensível.
6. [se menor] Assino como responsável, no melhor interesse dele.

[Cidade], [data por extenso]. Assinatura das duas partes, com documento.
```

Cada cláusula responde a um artigo: 1 e 2 ao § 4 do art. 8 (finalidade determinada);
3 à Súmula 403 (o canal define o fim comercial); 4.3 ao § 5 do art. 8 e ao art. 18, IX
(revogação); 4.5 ao art. 11, I; 4.6 ao art. 14, § 1. Cláusula que não responde a nada
sai. Termo de uma página assina; termo de quatro volta pra "depois eu vejo".

**O que não entra:** "em caráter irrevogável e irretratável" (contraria o § 5 do art. 8
e desconfia o cliente), "em qualquer mídia existente ou que venha a existir" (é a
autorização genérica que o § 4 chama de nula), "cedo todos os direitos" (cessão de
direito autoral é outro instrumento e passa por advogado), prazo indeterminado sem
revogação (não vale, e assusta).

---

## Profissão regulada: o conselho manda antes da LGPD

| Conselho | Norma | O que diz sobre imagem de paciente | Fonte (conferida em 22/09/2026) |
|---|---|---|---|
| Medicina (CFM) | Resolução CFM 2.336/2023, art. 14, II, alíneas b, e, f e i | uso da imagem só com finalidade educativa; antes e depois "em um conjunto de imagens contendo indicações, evoluções satisfatórias, insatisfatórias e complicações"; "vedada qualquer edição, manipulação ou melhoramento"; e, com imagem do próprio serviço, "obter autorização do paciente", "respeitar o pudor" e "garantir o anonimato do paciente que cedeu as imagens, mesmo que tenha recebido autorização" | [sistemas.cfm.org.br](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2023/2336_2023.pdf) |
| Odontologia (CFO) | Resolução CFO-196/2019, arts. 1º a 4º | selfie com paciente e imagem "relativas ao diagnóstico e à conclusão dos tratamentos" só pelo cirurgião-dentista que executou, "com autorização prévia do paciente ou de seu representante legal, através de Termo de Consentimento Livre e Esclarecido"; proibido vídeo ou imagem do procedimento em andamento; nome e número de inscrição em toda publicação, e "vedada a divulgação de casos clínicos de autoria de terceiros" (art. 4º) | [sistemas.cfo.org.br](https://sistemas.cfo.org.br/visualizar/atos/RESOLU%C3%87%C3%83O/SEC/2019/196) |
| Outros (psicologia, nutrição, fisioterapia, estética, advocacia) | a norma de cada conselho | varia; alguns proíbem depoimento de cliente por completo | `templates/juridico/lexico-publicidade.json` e o `/publicidade-regulada` |

Na prática: pra médico, o termo desta pasta vale, mas a peça só sai anônima e educativa,
e o `/publicidade-regulada` confere o texto. Pra dentista, o termo funciona como o TCLE
que a resolução pede, com o nome e o CRO na publicação. Pra psicólogo, o depoimento de
paciente não sai, mesmo autorizado; a autorização não afasta a regra do conselho.

---

## Como pedir

O pedido vem **depois** do elogio, nunca junto do serviço. A ordem do `/pos-venda` é:
confirmar que ficou bom, ouvir, e aí pedir. Quem acabou de elogiar autoriza; quem
recebe um termo de duas páginas antes de falar qualquer coisa recua.

A versão curta que o script gera cabe numa mensagem de WhatsApp: o que vai ser usado,
onde, pra quê, com ou sem nome, por quanto tempo, e como tirar. Termina com "me
responde 'autorizo' que já vale". A resposta por escrito **é** a assinatura
(art. 8: "outro meio que demonstre a manifestação de vontade"), desde que a pessoa
tenha lido o que autorizou. Por isso a mensagem carrega o conteúdo, e não só o link.

Guardar o print com data e número visíveis, ao lado do termo. O `.docx` e a assinatura
eletrônica servem pra quem pede formalidade; a
[MP 2.200-2/2001, art. 10, § 2](https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm)
aceita qualquer meio de prova de autoria "desde que admitido pelas partes como válido".

**Quando hesita:** no nome, oferecer sem nome. No rosto, oferecer sem rosto (mão, nuca,
produto). No canal, tirar o anúncio pago e deixar o orgânico. Em tudo, agradecer e
parar. Depoimento forçado vira cliente perdido, e ainda vira revogação na semana
seguinte.

---

## Revogação e o que fazer

O cliente pediu pra tirar. Não perguntar por quê. Tirar do ar no prazo do termo (10 dias
é o usual), responder confirmando a data em que saiu, marcar a linha de `biblioteca.md`
como `revogado em <data>`, e manter o termo e o print: são o registro de que o uso foi
autorizado enquanto durou. O que já foi impresso ou enviado antes do pedido não precisa
ser recolhido, e o termo diz isso.

Peça publicada em canal de terceiro (parceiro repostou, jornal usou) não sai com a
revogação sozinha: avisar o terceiro por escrito no mesmo dia e guardar o aviso.

---

## Onde registrar

| O que | Onde |
|---|---|
| O JSON que gera o termo | `contratos/termos/<tipo>-<pessoa>.json` |
| O termo (`.md`, `.html`, `.docx` se gerou) e a versão curta | `contratos/termos/<tipo>-<pessoa>.*` |
| O print, o e-mail ou o `.docx` assinado | `contratos/termos/<tipo>-<pessoa>-prova.png` (ou `.eml`, `.docx`) |
| A data e o meio do sim | `assinatura` no JSON, gravado por `scripts/autorizacao.js registrar` |
| A coluna "Autorizado" do depoimento, ou "Direitos" da foto | `biblioteca.md`, com a data e o caminho do termo |
| O vencimento do prazo e a revogação | `tarefas.md`, com data |

Na convenção por cliente, o prefixo `clientes/<Nome>/` entra antes de `contratos/`.
