# Comprovantes — o documento por trás de cada lançamento

Referência do `/comprovantes`. O `/caixa` fecha o mês com esses números somados, o
`/conciliar` usa o CSV daqui pra explicar linha de extrato sem nome, e o `/obrigacoes`
diz qual documento o enquadramento exige guardar.

Por que existe: o dono de negócio pequeno não perde a nota, perde o **nome** dela. Chega
`documento (3).pdf`, `IMG_4472.jpg`, `nfse.pdf` e `comprovante.png`, tudo na mesma pasta,
e em maio o contador pede "as notas de setembro". A partir daí é uma hora abrindo arquivo
um por um, e o que não abre vira despesa que ninguém lançou. O conserto não é disciplina:
é um nome de arquivo que se lê sem abrir, uma pasta por mês e uma soma por categoria.

> Prazos de guarda e fontes conferidos em 23/09/2026. O CTN mudou em setembro de 2026 (Lei
> Complementar 236/2026) e o prazo de documento trabalhista muda com decisão judicial, então
> a data da conferência importa: refazer a leitura das fontes antes de afirmar prazo a um
> usuário. Nada aqui substitui contador, e a skill não diz o que é dedutível.

---

## Os documentos que chegam, e o que cada um prova

| Documento | O que é | O que prova | Campos que ele traz |
|---|---|---|---|
| **NFS-e** | nota fiscal de serviço, emitida pela prefeitura ou pelo emissor nacional | que o serviço foi prestado e o imposto foi apurado | número, data de emissão, prestador, tomador, CNPJ, valor do serviço, ISS, descrição |
| **NF-e / DANFE** | nota fiscal de produto; o DANFE é o espelho impresso dela | que a mercadoria circulou | número, série, chave de 44 dígitos, emitente, data, valor total, ICMS |
| **NFC-e / cupom fiscal** | venda no balcão pra consumidor final | a venda no varejo | número, data, valor, CNPJ do emitente |
| **Comprovante Pix** | recibo de transferência do banco | que o **pagamento** aconteceu | data e hora, valor, pagador, recebedor, identificador da transação (E2E) |
| **Boleto** | instrumento de cobrança | que alguém **cobrou**, não que foi pago | vencimento, valor, beneficiário, linha digitável |
| **Comprovante de pagamento de boleto** | o recibo do banco | que aquele boleto foi quitado | data do pagamento, valor pago, autenticação |
| **Recibo** | declaração de quem recebeu | pagamento a quem não emite nota | data, valor, quem recebeu, CPF ou CNPJ, o que foi pago |
| **RPA** | recibo de pagamento a autônomo, com retenções | pagamento a pessoa física com INSS e IRRF retidos | competência, bruto, retenções, líquido |
| **Fatura de cartão** | resumo do que o cartão pagou | o conjunto, não cada compra | vencimento, total, lançamentos |
| **Extrato** | o que entrou e saiu da conta | o movimento, não a causa | data, descrição, valor |

Três confusões que aparecem em quase toda primeira pasta:

- **Comprovante de Pix não é nota fiscal.** Prova que o dinheiro saiu, não o que foi comprado. Despesa importante fica com os dois: a nota e o comprovante
- **Boleto sem comprovante não é despesa paga.** Boleto é cobrança. Sozinho, ele só diz que alguém queria receber
- **Fatura de cartão não é comprovante de cada compra.** Pro contador, vale a fatura como despesa financeira; o que foi comprado se prova com a nota de cada loja

---

## As cinco categorias (as mesmas do `/caixa`)

O `/caixa` separa o mês em fixo, variável, retirada e investimento. A pasta de comprovantes
usa exatamente essas quatro, mais `receita` pro que entrou, e é isso que permite somar aqui
e conferir lá sem tradução.

| Categoria | O que entra | Exemplo de subcategoria |
|---|---|---|
| **receita** | nota que você emitiu, comprovante de Pix recebido, repasse da maquininha | venda, serviço, repasse |
| **fixo** | existe mesmo com zero venda | aluguel, contador, internet, sistema, salário, seguro |
| **variavel** | cresce com a venda | fornecedor, insumo, comissão, frete, taxa de maquininha, imposto sobre venda, tráfego pago |
| **retirada** | o que saiu pro dono | pró-labore, retirada, despesa pessoal paga pela conta do negócio |
| **investimento** | sai do caixa e não é despesa do mês | equipamento, obra, móvel, curso |

A **subcategoria** é livre e é onde mora a informação útil (`aluguel`, `contador`, `taxa da
maquininha`). Ela vai pro CSV e pro nome do arquivo, não pro nome da pasta: pasta demais é
o jeito mais rápido de a árvore virar bagunça de novo.

Duas decisões de fronteira que vale escrever no arquivo do mês, porque o contador pergunta:
imposto sobre a venda é `variavel` (DAS de MEI que fatura pouco costuma ser tratado como
fixo, e aí vale registrar a escolha e manter); mercado pago pela conta do negócio é
`retirada`, não `fixo`, e é assim que o `/caixa` chega no lucro de verdade.

---

## O padrão de nome

```
AAAA-MM-DD Fornecedor - Descrição.ext
2026-09-03 Contabilidade Ramos ME - Honorários de setembro.pdf
2026-09-11 Distribuidora São João - Insumo de produção.pdf
```

Três motivos pra essa ordem, todos práticos:

- **Data primeiro, no formato ISO.** Ordem alfabética passa a ser ordem cronológica em qualquer sistema, sem depender do gerenciador de arquivos
- **Fornecedor antes da descrição.** É por fornecedor que se procura ("o que eu pago pra Vivo?"), e a busca do sistema acha digitando o nome
- **Descrição em português, com acento.** O arquivo é pra ler, não pra programar. Acento funciona no macOS, no Windows e no Drive; barra, dois-pontos e asterisco não

Colisão de nome (dois documentos do mesmo fornecedor, dia e descrição) recebe ` (2)`. Se o
arquivo idêntico já está no lugar certo, ele não é copiado de novo: rodar o mesmo lote duas
vezes tem que dar a mesma pasta.

A árvore:

```
financeiro/comprovantes/
├── 2026/
│   ├── 08/fixo/2026-08-28 Vivo Empresas - Internet da loja.pdf
│   └── 09/
│       ├── fixo/        aluguel, contador, internet
│       ├── variavel/    fornecedor, insumo, taxa
│       ├── receita/     nota emitida, Pix recebido
│       ├── retirada/
│       └── investimento/
├── revisar/             o que faltou dado
├── log/                 um JSON por lote, pra desfazer
├── comprovantes-2026-09.csv
└── comprovantes-2026-09.md
```

O ano e o mês vêm da **data do documento**, não da data em que o arquivo foi organizado.
Nota de agosto que chegou em setembro mora em `2026/08/`, e o resumo avisa que ela está
fora do mês do lote.

---

## O manifesto: quem lê é o assistente, quem confere é o script

Chat não varre pasta nem renomeia arquivo. Script Node não lê PDF digitalizado nem foto de
recibo. Então o trabalho é dividido, e o manifesto é o contrato entre as duas metades:

1. `scripts/comprovantes.js listar` varre a pasta e escreve um item por arquivo, com os campos vazios e um `palpite` tirado do nome do arquivo
2. O assistente **abre cada arquivo** pela ferramenta Read (PDF e imagem entram direto) e preenche data, fornecedor, número, valor, categoria, descrição e `lido_por`
3. `conferir` valida: data que existe, valor que é número, categoria da lista, dígito de CNPJ, duplicata, arquivo que ainda está lá
4. `organizar` copia, soma e escreve o CSV, o resumo e o log

O campo `palpite` existe pra ser conferido, nunca pra ser aceito: `IMG_4472.jpg` não tem
data no nome, e `boleto-1234.pdf` pode ser o número do boleto ou o valor. Item sem
`lido_por` sai com aviso, porque manifesto preenchido sem abrir o arquivo é chute com
aparência de dado.

**Erro** (data que não existe, valor que não é número, categoria fora da lista, arquivo que
sumiu) para o lote inteiro: nada é copiado. **Falta** (sem data, sem fornecedor, sem valor
ou sem categoria) manda só aquele arquivo pra `revisar/` e o resto segue.

---

## O que vai pra `revisar/`

A pasta de revisão é curta de propósito, e quase sempre por um destes motivos:

- **Foto ilegível** — tremida, cortada, com reflexo. O conserto é tirar outra, não adivinhar o valor
- **Recibo sem fornecedor** — papel de caderno com um valor escrito. Vale perguntar ao usuário de quem é
- **Documento que não é comprovante** — orçamento, proposta, print de conversa, catálogo
- **Boleto sem o comprovante de pagamento** — fica em revisão até o usuário dizer se foi pago
- **Nota de outro exercício** — entra na pasta do ano dela, e o resumo avisa

---

## Quanto tempo guardar

| Documento | Prazo prático | Base |
|---|---|---|
| Nota fiscal, cupom, livros e comprovantes de lançamento | **5 anos**, contados do primeiro dia do exercício seguinte àquele em que o lançamento poderia ter sido feito | CTN art. 173, I (decadência) e art. 174 (prescrição, 5 anos da constituição definitiva); a obrigação de conservar está no art. 195, parágrafo único: vale **até prescrever o crédito tributário** daquela operação |
| Comprovante de pagamento de tributo (DAS, DARF, GPS) | **5 anos** | o mesmo prazo do crédito que ele quita |
| Documento trabalhista e de FGTS de empregado | **5 anos** após o desligamento, na prática | CF art. 7º, XXIX e CLT art. 11: o empregado cobra os 5 anos anteriores e pode entrar com a ação até 2 anos depois do fim do contrato. FGTS entrou nessa regra com o STF, ARE 709212, julgado em 13/11/2014, que trocou 30 por 5 anos; a TST, Súmula 362 foi reescrita com esse marco |
| Contrato com cliente e fornecedor | pelo prazo do contrato mais 5 anos | prescrição comum do Código Civil, art. 206, § 5º, I |

Quatro ressalvas que mudam a conversa. O prazo do CTN corre do exercício seguinte, então nota
de setembro de 2026 costuma ser descartável só em 2032, não em 2031. O prazo trabalhista de
2 anos é o prazo pra **entrar com a ação**, não pra guardar papel: quem guarda só 2 anos
depois do desligamento fica sem prova dos 3 primeiros anos que ainda podem ser cobrados. E
cópia digitalizada só produz os mesmos efeitos do papel quando o processo assegura
integridade e confiabilidade, rastreabilidade, qualidade de imagem e legibilidade e, quando
for o caso, sigilo (Decreto 10.278/2020, art. 4º). Foto cortada, tremida ou com reflexo não
cumpre isso, então o papel do que é caro continua guardado. Isso vale pro que nasceu em
papel: a NFS-e em PDF e o XML da NF-e já são nato-digitais, e o decreto nem trata deles
(art. 2º, parágrafo único, I). Por último, e é o mais novo: a Lei Complementar 236, de
04/09/2026, reformou o CTN e deu ao art. 174 novas causas de interrupção da prescrição
(protesto da certidão de dívida ativa, mediação, arbitragem tributária, entre outras), com o
prazo recomeçando da data do ato que interrompeu. Como o art. 195 amarra a guarda à
prescrição do crédito, documento de operação que está em discussão com o fisco pode ter que
ficar guardado por mais que os 5 anos da tabela. Na dúvida, guardar: arquivo digital ocupa
pouco espaço.

Fontes: CTN (Lei 5.172/1966) em
https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm; Lei Complementar 236/2026 em
https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp236.htm; Decreto 10.278/2020 em
https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/d10278.htm; decisão do FGTS em
https://noticias.stf.jus.br/postsnoticias/prazo-prescricional-para-cobranca-de-valores-referentes-ao-fgts-e-de-cinco-anos/
Conferido em 23/09/2026.

---

## O que o contador realmente pede

Perguntado, quase sempre é a mesma lista curta: as notas emitidas no mês, as notas de
serviço tomadas com retenção, os comprovantes de imposto pago, a folha e os comprovantes de
FGTS e INSS quando há empregado, e o extrato. O CSV daqui cobre o que é despesa e receita
com documento; folha e extrato continuam sendo assunto do `/caixa` e do `/conciliar`.

O CSV sai com uma linha por documento e as colunas
`data;fornecedor;cnpj;documento;numero;descricao;categoria;subcategoria;valor;forma;arquivo`.
Valor em formato brasileiro (`1.234,56`), data em `DD/MM/AAAA`, separador ponto e vírgula:
é o que o Excel em português abre sem assistente de importação. Quem quiser o total por
categoria dentro do próprio CSV usa `--totais-no-csv`; o padrão deixa o arquivo limpo, com
uma linha por documento, porque é assim que o `/conciliar` o lê.

---

## Armadilhas

- **A mesma nota duas vezes.** Chega o PDF da nota e a foto do papel. O script acusa mesmo fornecedor, valor e data, e quem decide é o usuário: um fica, o outro vira anexo
- **Valor com ponto onde era vírgula.** `1.234,56` lido como `1.23456` ou `1234.56` muda o mês. Todo valor passa pelo `br.numero`, e o resumo mostra a soma pra conferência
- **Data de emissão contra data de pagamento.** A nota de 28/08 paga em 03/09 pertence a agosto no documento e a setembro no caixa. A pasta segue o documento; o `/caixa` segue o dinheiro. Divergência fica escrita, não resolvida em silêncio
- **MEI que não recebe nota.** Muito fornecedor pequeno só dá recibo. Recibo com CPF, valor e descrição é comprovante; sem nada disso, é papel
- **Arquivo movido na mão.** Nada é movido aqui: tudo é cópia, e o original fica onde estava. Quem move na mão perde o caminho que o CSV aponta
- **Foto de documento térmico.** Cupom de maquininha apaga em semanas. Fotografar no dia é a única cópia que vai existir

---

## Léxico

- **DANFE** — o espelho impresso da NF-e; o documento válido é o XML
- **Chave de acesso** — os 44 dígitos que identificam a NF-e e permitem consultar a autenticidade
- **E2E** — o identificador de ponta a ponta do Pix, que aparece no comprovante
- **Tomador** — quem contrata o serviço; **prestador** é quem executa
- **Retenção** — imposto descontado na nota (ISS, INSS, IRRF) e pago por quem contratou
- **Competência** — o mês a que a despesa se refere, que pode não ser o mês do pagamento

---

## Origem

O formato de nome `AAAA-MM-DD Fornecedor - Descrição.ext`, a extração por campo e o CSV com
caminho do arquivo vêm do `invoice-organizer` de
https://github.com/ComposioHQ/awesome-claude-skills/blob/master/invoice-organizer/SKILL.md
(lido em 22/09/2026). O que muda aqui: os documentos são os brasileiros, as categorias são
as do `/caixa`, a leitura vira manifesto conferido por comando, nada é movido e todo lote
tem log pra desfazer.
