# Publicidade regulada — o que cada conselho deixa dizer

Referência do `/publicidade-regulada`. O `/carrossel`, o `/video`, o `/landing` e o
`/marca` consultam a tabela por profissão antes de escrever pra médico, dentista,
advogado, psicólogo ou corretor. O léxico que o script lê fica ao lado, em
`templates/juridico/lexico-publicidade.json`, com cada termo, artigo, vigência e fonte.

Por que existe: o profissional regulado posta toda semana sob regra de conselho, e o
que escorrega não é a intenção, é a palavra. "Sem dor" na legenda do dentista, "ganhamos
a causa" na bio do advogado, "elimina de vez" no anúncio da dermatologista. Cada uma
dessas é infração com artigo, e o custo vai de anúncio reprovado a processo ético. Chat
chuta o número do artigo e esquece o termo; aqui o termo está listado e o artigo foi
conferido na fonte.

> **Não é parecer jurídico nem consulta ao conselho.** É a triagem que faz a peça
> passar pelo mesmo filtro que a fiscalização usa. Caso limítrofe, denúncia recebida
> e qualquer coisa com processo ético aberto passam por advogado e pela comissão de
> ética do conselho antes de virar resposta.

O Provimento 205, a Res. CFM 2.336, o Código de Ética Odontológica e o Código de Ética do
Psicólogo foram relidos artigo por artigo no texto oficial em **23/09/2026**; a Res. CFO-196,
a Res. COFECI 1.065 e a política da Meta carregam **22/09/2026** no léxico. Cada regra
guarda a sua própria data em `conferido_em`, e `node scripts/publicidade.js conselhos`
mostra todas. Conselho muda regra sem aviso (o CFO mudou em 24/06/2025, a Meta em julho
de 2026): reconferir a cada atualização do sistema e antes de campanha grande.

> **A OAB está reescrevendo o Provimento 205.** O Conselho Federal consolidou a revisão
> com os Tribunais de Ética e os Corregedores em dezembro de 2025, e até a publicação do
> texto novo o 205/2021 vale inteiro. Antes de campanha paga de advogado, conferir se já
> saiu provimento novo.

---

## As cinco profissões, lado a lado

| | Advogado (OAB) | Médico (CFM) | Dentista (CFO) | Psicólogo (CFP) | Corretor (CRECI) |
|---|---|---|---|---|---|
| **Norma** | Provimento 205/2021 | Res. CFM 2.336/2023 | CEO (Res. CFO-118/2012, alterado pela 271/2025) + Res. CFO-196/2019 | Código de Ética, art. 20 | Lei 6.530/78, art. 20 + Res. COFECI 1.065/2007 |
| **Vigência** | 22/08/2021 (30 dias após o DEOAB de 21/07/2021) | 11/03/2024 (180 dias após o DOU de 13/09/2023) | CEO desde 01/01/2013 (publicado em 14/06/2012, art. 3º adia); 196 desde 29/01/2019; 271 desde 24/06/2025 | 27/08/2005 (art. 25 do Código) | Lei desde 12/05/1978; Res. desde 24/10/2007 |
| **Preço na peça** | proibido (art. 3º, I) | **permitido** (art. 9º, VI) | proibido (art. 44, I) | proibido como propaganda (art. 20, d) | permitido |
| **Desconto, promoção** | proibido (art. 3º, I) | permitido sem venda casada (art. 9º, VIII) | proibido (art. 44, I) | proibido (art. 20, d) | permitido, sem enganar (CDC) |
| **Garantia de resultado** | proibido (art. 6º) | proibido (art. 11, XII) | proibido (196, art. 2º, § 1º) | proibido (art. 20, e) | proibido como enganosa (CDC, art. 37) |
| **"O melhor", "referência"** | proibido (art. 3º, IV) | proibido (art. 11, XIII e XVI) | proibido (196, art. 2º, § 1º) | proibido (art. 20, f) | CDC |
| **Antes e depois** | não se aplica; caso concreto é proibido (art. 6º) | só educativo, com insatisfatórios e complicações (art. 14, II) | imagem do diagnóstico e do resultado final, caso próprio, com TCLE (196, art. 2º); a expressão como chamariz é infração (art. 44, XII) | não se aplica | não se aplica |
| **Selfie com paciente ou cliente** | foto do advogado e do escritório permitida (art. 5º, § 2º) | permitida sem sensacionalismo (art. 8º, III) | permitida com TCLE (196, art. 1º) | expõe vínculo; sai | permitida |
| **Durante o procedimento** | audiência só sem resultado (art. 4º, § 2º) | proibido ao vivo (art. 11, VIII) | proibido (196, art. 3º) | não se aplica | não se aplica |
| **Equipamento** | não se aplica | só com indicação da Anvisa, sem "privilegiado" (art. 9º, II; art. 11, II e III) | não pode aparecer na imagem (196, art. 1º, § 1º, e art. 3º) | não se aplica | não se aplica |
| **Sorteio, brinde** | brinde e material distribuído de forma indiscriminada, proibidos (art. 3º, V); sorteio como isca é captação (art. 2º, VIII) | desconto sim, premiação não (art. 9º, VIII) | proibido (art. 44, X; art. 20, VIII) | sensacionalista (art. 20, h) | permitido |
| **Depoimento de cliente** | caso concreto proibido (art. 6º) | repost vira publicação do médico; sóbrio, sem promessa (art. 8º, § 3º; art. 14, II, g) | proibido divulgar resultado clínico (art. 44, V) | sai (sigilo, art. 9º) | permitido |
| **O que é obrigatório na peça** | nome e OAB | nome, CRM, a palavra MÉDICO, RQE se anuncia especialidade (art. 4º) | nome e CRO, inclusive dentro da imagem (art. 43; 196, art. 4º) | nome completo e CRP (art. 20, a) | nome, "Corretor de Imóveis", CRECI com 25% do tamanho do nome (Res. 1.065, art. 2º) |
| **Chamada de urgência** | incitar litígio é captação (art. 2º, VIII) | sensacionalismo se gera medo (art. 11, § 2º, e) | aliciamento (art. 44, VII) | sensacionalismo (art. 20, h) | "última unidade" só se for verdade (CDC) |

Fontes: [Provimento 205/2021](https://www.oab.org.br/leisnormas/legislacao/provimentos/205-2021);
[Res. CFM 2.336/2023](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2023/2336_2023.pdf);
[Código de Ética Odontológica](https://website.cfo.org.br/wp-content/uploads/2018/03/codigo_etica.pdf),
[Res. CFO-196/2019](https://sistemas.cfo.org.br/visualizar/atos/RESOLU%C3%87%C3%83O/SEC/2019/196) e
[Res. CFO-271/2025](https://sistemas.cfo.org.br/visualizar/atos/RESOLU%C3%87%C3%83O/SEC/2025/271);
[Código de Ética do Psicólogo](https://site.cfp.org.br/wp-content/uploads/2012/07/codigo_etica.pdf);
[Lei 6.530/1978](https://www.planalto.gov.br/ccivil_03/leis/l6530.htm) e
[Res. COFECI 1.065/2007](https://intranet.cofeci.gov.br/arquivos/legislacao/resolucao_1065_07_nova.pdf);
[CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm).

### As três surpresas da tabela

1. **Médico pode anunciar preço; dentista não.** A Res. CFM 2.336 liberou valor de consulta, forma de pagamento e desconto (art. 9º, VI a VIII). O CEO do dentista mantém preço como infração: o art. 44, I, põe na mesma lista "expressões ou imagens de antes e depois, com preços, serviços gratuitos, modalidades de pagamento". A Res. CFO-271/2025 tirou o cartão de desconto e as compras coletivas da redação do art. 44, XIV, e não mexeu no preço
2. **Antes e depois tem três regimes.** Pra médico é peça educativa: texto com indicações, fatores que mudam o resultado e complicações, num conjunto que inclua caso insatisfatório, sem edição, com autorização e anonimato (art. 14, II). Pra dentista é imagem de diagnóstico e resultado final do próprio caso, com TCLE e nome e CRO na imagem; a expressão "antes e depois" como chamariz continua infração (art. 44, XII). Pra advogado não existe: caso concreto é vedado (art. 6º)
3. **A Meta não é o conselho.** A política de saúde e bem-estar (atualizada em 22/07/2026) aceita antes e depois de procedimento cosmético pra público 18+. O conselho vale antes: anúncio que a Meta aprova pode ser infração ética. A ordem de leitura é conselho primeiro, plataforma depois

---

## O que texto não pega

O script varre o texto. O que está na imagem, no vídeo e na configuração da campanha
entra por declaração do usuário, chave a chave, no manifesto que
`node scripts/publicidade.js manifesto --profissao <p> --plataforma <p>` gera. Cada chave é
uma pergunta de sim ou não:

| Chave | O que se declara | Quem cobra |
|---|---|---|
| `nome_e_registro_na_peca` | nome e número do conselho estão na peça (na imagem, se for imagem) | todos os cinco |
| `antes_depois` | a peça compara antes e depois | CFM, CFO, Meta |
| `tcle_ou_autorizacao` | existe autorização assinada do paciente ou cliente, guardada | CFM, CFO |
| `texto_educativo_junto`, `conjunto_com_insatisfatorios`, `imagem_sem_edicao`, `paciente_anonimo` | as quatro condições do art. 14, II, do CFM | CFM |
| `caso_proprio` | quem publica executou o caso | CFO (196, art. 4º) |
| `selfie_com_paciente` | tem paciente na selfie | CFM, CFO |
| `durante_procedimento` | mostra o procedimento acontecendo | CFM, CFO |
| `equipamento_visivel` | aparece instrumental, material ou tecido na foto | CFO |
| `ostentacao_bens`, `estrutura_escritorio` | carro, viagem, luxo; tamanho do escritório em anúncio | OAB |
| `depoimento_de_paciente` | usa relato ou print de paciente | CFP |
| `autorizacao_escrita_do_proprietario` | há autorização escrita pra anunciar o imóvel | CRECI (Lei 6.530, art. 20, III) |
| `segmentacao_18_mais`, `foco_em_parte_do_corpo`, `pagina_de_destino_coerente` | idade mínima no conjunto de anúncios; close apertando gordura; landing coerente | Meta |

`null` no manifesto significa "não sei", e o laudo devolve a pergunta em vez de chutar.

---

## Como reescrever mantendo a mensagem

A regra de todas as profissões cabe numa troca: **sai o desfecho, entra a indicação.**
Quem anuncia resultado promete o que não controla; quem anuncia indicação diz pra quem o
serviço serve, e isso o conselho aceita e o cliente entende.

| O que a peça queria dizer | Como saiu | Como fica |
|---|---|---|
| "funciona" | "resultado garantido" | "indicado pra [caso]; o resultado depende de [fator]" |
| "sou bom nisso" | "o melhor da região" | especialidade registrada + número + tempo de prática |
| "é acessível" (dentista, psicólogo, advogado) | "a partir de R$ 99" | "valor e formas de pagamento na avaliação" |
| "vem logo" | "últimas vagas, ligue agora" | "agenda aberta pra [mês]; o WhatsApp está na bio" |
| "olha o que eu fiz" | antes e depois com legenda de elogio | diagnóstico, tratamento, tempo, o que não deu certo, TCLE |
| "você precisa disso" | "cansada de se olhar no espelho?" | "tratamento pra [condição], indicado depois dos [idade]" |
| "eu ganho causas" | "97% de êxito" | a tese em abstrato: "demissão sem justa causa dá direito a..." |

Três cuidados na reescrita:

- **Não trocar infração por clichê.** "Cuidamos do seu sorriso com carinho" passa no conselho e reprova no `/revisar`. A reescrita traz dado concreto: prazo, indicação, número de registro
- **Não esvaziar.** Se a peça vendia um clareamento, a reescrita ainda vende clareamento. O que muda é a promessa virar indicação
- **Manter a voz.** A peça é do usuário; a régua é `_memoria/preferencias.md`. Reescrita em juridiquês é outra infração, a de ninguém ler

---

## Quando o conselho não está no léxico

Nutricionista (CFN), fisioterapeuta (COFFITO), biomédico, esteticista sem conselho,
veterinário (CFMV), arquiteto (CAU), contador (CFC): cada um tem norma própria e o
léxico ainda não cobre. O laudo diz isso na primeira linha, aplica só o CDC e a
plataforma, e deixa o conselho como `[a confirmar]`. O caminho é o usuário buscar a
resolução de publicidade do conselho dele (WebSearch com "resolução publicidade" +
sigla), e o assistente ler o texto antes de opinar. Acrescentar o conselho ao léxico é
trabalho de atualização do sistema, com fonte e data, nunca improviso na conversa.

## Quando o léxico envelhece

Cada regra carrega `conferido_em`. Antes de campanha paga ou de peça que vai ficar
meses no ar (bio, landing), rodar WebSearch com o nome da norma e "revogada" ou
"alterada"; se aparecer resolução mais nova, ler o texto oficial e avisar o usuário que o
molde precisa de atualização. Data de conferência com mais de um ano é motivo pra
reconferir mesmo sem sinal de mudança.
