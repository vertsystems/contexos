# Manual do sistema — o dossiê de quem fica

Sábado, dez da manhã. O site não abre, o telefone toca, e quem construiu aquilo não
responde mais: mudou de cliente, encerrou o contrato, sumiu do WhatsApp. Sobra a pasta do
projeto, cheia de código. Código não diz onde está a conta que venceu, nem qual comando
devolve o site pro ar.

Este molde é a referência do documento que resolve esse sábado. Ele não descreve o sistema
tela por tela. Descreve o que fazer, onde entrar, quanto custa e quando vence. Quem lê não
é programador: é quem paga a conta.

## O que o manual não é

Duas confusões comuns, e as duas produzem documento que ninguém abre duas vezes.

- Não é anotação de trabalho interrompido. Sessão parada no meio, com o próximo passo e o
  que ficou aberto, é `/pausar`: vale por alguns dias e depois não serve mais. Este documento
  é o contrário, permanente e de gente pra gente, versionado junto com o código
- Não é descrição campo a campo. Trinta páginas listando telas desatualizam na primeira
  mudança e passam a mentir. O argumento completo está em
  `templates/software/manutencao.md`, seção "O documento que descreve campo a campo"

O que sobra depois de cortar essas duas coisas é pouco e é o que importa: acesso, custo,
vencimento, e o que fazer quando cada coisa quebra.

## Os três leitores

O mesmo arquivo é lido por três pessoas diferentes, e é por isso que ele tem duas partes.

| Quem lê | Quando | O que precisa achar em menos de um minuto |
|---|---|---|
| O dono, com pressa | o site caiu, o cliente reclamou | o "se X faça Y" e o telefone de quem socorre |
| O dono, calmo | chegou a fatura, ou ele vai trocar de fornecedor | a tabela de custo e a lista de contas no nome dele |
| O próximo desenvolvedor | primeiro dia no sistema | como sobe na máquina, onde mora o dado, por que foi feito assim |

A pressa é a razão do resumo de uma página impresso. Papel funciona sem Wi-Fi, sem bateria
e sem computador, que é exatamente a situação do balcão numa manhã ruim. Ele fica na gaveta
do caixa. Não na nuvem.

## As seções do `MANUAL.md`

Ordem importa: o que se usa em urgência vem antes do que se lê com calma.

1. **O sistema em três linhas.** O que faz, quem usa, o que acontece se ficar um dia fora
2. **Se X, faça Y.** Os oito casos abaixo, com comando exato
3. **Quem socorre.** Nome, canal, horário e o que essa pessoa cobra pra atender fora dele
4. **Onde tudo mora.** Repositório, plataforma, banco, domínio, e-mail, cofre
5. **Acesso.** Uma linha por conta: serviço, no nome de quem, onde a senha mora, quem mais entra
6. **Custo por mês.** A tabela somada, com o total e o que muda se o uso dobrar
7. **Vencimentos.** Data, dia da semana, quantos dias faltam, e o que acontece se passar
8. **O que roda sozinho.** Rotina, horário em Brasília, o que ela toca, como se percebe que parou
9. **Como subir na máquina.** Instalação, variáveis, comando de rodar, comando de publicar
10. **Por que é assim.** As decisões que doeriam de refazer, e o que foi tentado e não deu

A seção 10 é a única que o desenvolvedor escreve e o dono não lê. Meia página basta. São os
porquês, nunca a listagem, porque detalhe que muda junto com o código mora no código.

## Os oito "se X faça Y"

Cada um tem quatro partes: o **sinal** que o dono percebe, a **primeira ação** que ele faz
sozinho, o **comando exato** conferido no repositório dele, e o **ponto de parada** em que
ele chama alguém em vez de continuar tentando.

| Situação | Sinal que o dono percebe | Onde está o método |
|---|---|---|
| 1. O site não abre pra ninguém | página branca, erro do navegador, cliente avisando | `templates/backend/incidente.md`, "Os primeiros trinta minutos" |
| 2. Uma tela dá erro, o resto funciona | só o cadastro falha, o resto navega | `templates/backend/debug.md`, "O método" |
| 3. O navegador diz que o site não é seguro | cadeado riscado, aviso vermelho | certificado vencido: ver abaixo |
| 4. A mensagem do sistema parou de sair | ninguém recebe confirmação de pedido | `templates/backend/debug.md`, "Log que serve pra investigar" |
| 5. A conta da plataforma foi suspensa | e-mail de cobrança, sistema fora do ar sem erro de código | cartão vencido: a seção de vencimentos |
| 6. A publicação falhou e o ar continua velho | a mudança não aparece | `templates/backend/versoes.md`, "A etiqueta que diz o que está no ar" |
| 7. Precisa voltar pra versão de ontem | a mudança de hoje quebrou algo | `templates/backend/versoes.md`, "Desfazer" |
| 8. Apagou dado e precisa do backup | registro que existia não está mais lá | restauração provada: ver abaixo |

Nada disso se reescreve aqui. O manual do sistema traz, pra cada caso, a versão curta com
o comando do repositório real, e um link pra seção do molde quando quem atende é técnico.

**Regra de ouro dos oito:** comando que ninguém rodou não entra. Se o manual diz
`npm run deploy` e o `package.json` não tem `deploy`, o documento virou armadilha. É pra
isso que o `scripts/manual-sistema.js varrer` lê os comandos que existem de verdade.

**O ponto de parada é obrigatório.** Sem ele, o dono de boa vontade tenta o terceiro
comando que leu na internet e transforma uma queda de dez minutos em perda de dado. Uma
frase basta: "se depois disso ainda não voltou, pare e chame a Marina; não rode comando de
banco".

## Certificado e domínio: as duas datas que derrubam site funcionando

Código intacto, servidor de pé, e o navegador dizendo que o site é perigoso. Nada quebrou.
Venceu uma data.

- Certificado: o prazo máximo de validade dos certificados públicos está encurtando por
  decisão do CA/Browser Forum, na escada aprovada pelo SC-081v3 — 200 dias pra quem foi
  emitido a partir de 15/03/2026, 100 dias a partir de 15/03/2027 e 47 dias a partir de
  15/03/2029 (cabforum.org/2025/04/11/ballot-sc081v3-introduce-schedule-of-reducing-validity-and-data-reuse-periods/,
  conferido em 23/09/2026). O que isso muda no manual: certificado agora vence duas ou três
  vezes por ano, renovação na mão deixou de ser viável, e o documento precisa dizer **quem**
  renova — a plataforma, o servidor, ou uma pessoa com nome
- Domínio: `.br` vencido não sai do ar no mesmo dia. Ele fica expirado por alguns dias, depois
  é congelado (aí o site e o e-mail param), e o titular ainda tem meses pra renovar antes do
  processo de liberação, quando o nome vai a leilão. Os dias de cada fase mudam e se conferem
  no painel: registro.br/ajuda/dominio-congelado/ e registro.br/dominio/processo-de-liberacao/
  (conferidos em 23/09/2026). Não escreva número de fase no manual sem abrir essas duas páginas
- Cartão do titular: renovação automática falha quando o cartão cadastrado venceu. É a causa
  mais boba de sistema fora do ar. E a mais comum

As duas datas se leem por comando, nunca de memória, e entram na mesma tabela das outras:

```bash
node scripts/manual-sistema.js dominio padariadobairro.com.br
node scripts/manual-sistema.js vencimentos contas.json --consultar   # tudo numa lista só, na ordem
```

Duas listas de vencimento é o mesmo que nenhuma: a data mais próxima sempre está na outra.

## O horário da rotina, no fuso de quem lê

`0 3 * * *` no manual é uma linha que o dono pula. "Todo dia às 00:00, horário de Brasília" é
uma linha que ele usa pra saber se o relatório de ontem saiu.

A conversão tem duas pegadinhas, e as duas já custaram noite de investigação no turno errado:

- Cron da Vercel roda **sempre em UTC**, sem opção de fuso por rotina (vercel.com/docs/cron-jobs,
  conferido em 23/09/2026). O mesmo vale pro `schedule` do GitHub Actions
- O Brasil não tem horário de verão desde 2019: o Decreto 9.772, de 25/04/2019, revogou os
  decretos que o instituíam (gov.br/mme/pt-br/assuntos/secretarias/secretaria-nacional-energia-eletrica/horario-de-verao,
  conferido em 23/09/2026). Então Brasília é UTC−3 o ano inteiro, e a conta é uma subtração de
  três horas, sem exceção de calendário

O `manual-sistema.js varrer` já entrega a linha traduzida, com as duas leituras. Quando a
expressão é fora do comum, ele devolve a expressão crua com `[a confirmar]` do lado, em vez de
adivinhar.

## Acesso: o nome do cofre, nunca o segredo

O manual é lido, impresso, copiado pro WhatsApp e mandado por e-mail. Segredo dentro dele
vaza por uso normal, sem ninguém errar.

| Coluna da tabela de acesso | Exemplo que vale | O que nunca entra |
|---|---|---|
| Serviço | Vercel | - |
| No nome de quem | dono@padariadobairro.com.br | - |
| Onde a senha mora | 1Password › Padaria › Vercel | a senha |
| Quem mais entra | Marina (desenvolvedora), acesso de leitura | o token dela |
| Como se tira o acesso | painel › Members › remover | - |

Três regras que vêm de `templates/software/manutencao.md`, seção "O desenvolvedor está
saindo", e valem aqui inteiras:

- Conta no nome do dono: domínio, hospedagem, banco, envio de e-mail e loja de aplicativo
  no e-mail dele, com acesso concedido a quem trabalha. O contrário é refém
- Cofre antes de manual: sem gerenciador de senha, a lista de acessos não tem onde apontar,
  e o manual acaba com senha dentro. Instalar o cofre é parte do trabalho
- Saída tem checklist: quando alguém sai, a coluna "como se tira o acesso" é a lista do que
  fazer no mesmo dia

```bash
node scripts/verificar.js segredo .    # nenhuma chave no que está versionado
```

Esse check enumera os arquivos por `git ls-files`, então ele precisa rodar na pasta do
repositório. Se a resposta for "não é repositório git", nada foi conferido, e a leitura passa
a ser na mão antes de entregar o manual.

## Custo: a soma que ninguém faz

Fatura de sistema chega picada: uma em dólar no dia 3, uma em real no dia 14, uma anual em
abril. O dono sente que "paga muito" e não sabe o número. A tabela somada resolve isso em
uma linha, e muda conversa de fornecedor.

- Mensal e anual na mesma tabela: anuidade de domínio dividida por doze, assinatura mensal
  multiplicada por doze. O script faz as duas contas
- Moeda estrangeira só entra com cotação e data (`cotacao` e `cotacao_em` no spec). Sem isso
  o item fica fora da soma, como `[a confirmar]`. Chutar o dólar é inventar número, e cotação
  sem o dia em que foi lida é número que ninguém confere no mês seguinte
- Compra de uma vez vai em tabela separada: tablet do balcão somado no custo mensal estraga
  o total, e a conferência de soma acusa
- O custo humano não está na fatura. Quem responde dúvida, quem confere pedido, quem roda o
  relatório: isso é dinheiro, e mora em `templates/software/evolucao.md`, seção "Custo de
  operação é trabalho humano"

## A prova de que o manual funciona

Documento que nunca foi executado é intenção, não manual. A prova é sempre a mesma, e vem
de `templates/software/manutencao.md`: **outra pessoa faz o que está escrito, sozinha, com
quem sabe olhando calado.** Nada de ajuda no ombro. Enquanto a passagem depender de uma
frase dita na hora, a seção continua aberta.

Duas provas pagam o dia inteiro que elas custam:

1. Publicar e voltar atrás: trocar uma palavra do rodapé, publicar, desfazer, cronometrar.
   Todo passo que faltava no manual vira linha no mesmo dia
2. Restaurar o backup: uma cópia restaurada na frente do dono, com o dado aparecendo na
   tela. Promessa de backup não é backup

## Armadilhas

### O manual escrito de memória

**Sintoma:** o documento diz `npm start` e o projeto sobe com `pnpm dev`; a variável de
ambiente listada tem nome antigo.
**O que custa:** o dono tenta na urgência, falha, e conclui que o documento não serve. A
partir daí ninguém abre mais.
**Conserto:** a seção de comandos e a de variáveis nascem do `manual-sistema.js varrer`, que
lê `package.json` e `.env.example` em vez de lembrar.

### O manual dentro do Google Drive de quem foi embora

**Sintoma:** o link do documento pede acesso, e quem aprovava não trabalha mais ali.
**O que custa:** o dossiê existe e é inalcançável exatamente no dia em que era necessário.
**Conserto:** `docs/MANUAL.md` dentro do repositório, versionado junto com o código, mais o
resumo impresso na gaveta.

### O manual perfeito e velho de um ano

**Sintoma:** a plataforma mudou de nome, o banco migrou, a desenvolvedora trocou, e o
arquivo continua igual ao da entrega.
**O que custa:** o dono age pelo documento e piora a situação, porque o comando de ontem
faz outra coisa hoje.
**Conserto:** revisão mensal agendada pelo `/rotina`, que roda os comandos de vencimento e
custo e só pede atenção humana quando algo divergiu.

### A senha que entrou "só pra facilitar"

**Sintoma:** uma linha do manual tem a senha do banco, porque na hora era mais rápido.
**O que custa:** o documento passa a ser segredo, perde a impressão, o compartilhamento e a
versão no repositório. Ou, pior, não perde nada disso e a chave vaza.
**Conserto:** apagar do arquivo, trocar a chave no provedor, e escrever o nome do cofre.
Chave que circulou está queimada, mesmo que o arquivo tenha sido corrigido.

## A cada mês

Quatro linhas, e as duas primeiras são comando:

1. `node scripts/manual-sistema.js vencimentos <spec>` e tratar o que está a menos de 45 dias
2. `node scripts/manual-sistema.js custo <spec>` e comparar o total com o mês anterior
3. Conferir se algum comando do "se X faça Y" mudou no repositório
4. Conferir se alguém entrou ou saiu do time, e mexer na tabela de acesso

## Fontes

- cabforum.org/2025/04/11/ballot-sc081v3-introduce-schedule-of-reducing-validity-and-data-reuse-periods/
  — SC-081v3, a escada de 200, 100 e 47 dias de validade dos certificados TLS (conferido em 23/09/2026)
- registro.br/ajuda/dominio-congelado/ e registro.br/dominio/processo-de-liberacao/ — as fases
  do domínio `.br` depois do vencimento (conferidos em 23/09/2026)
- vercel.com/docs/cron-jobs — cron da Vercel roda em UTC, sem opção de fuso (conferido em 23/09/2026)
- gov.br/mme/pt-br/assuntos/secretarias/secretaria-nacional-energia-eletrica/horario-de-verao —
  o Decreto 9.772, de 25/04/2019, revogou o horário de verão: Brasília é UTC−3 o ano inteiro
  (conferido em 23/09/2026)
