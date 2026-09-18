# [Seu Nome] — Contex OS

> Molde do CLAUDE.md aplicado a **profissional liberal** — médico, dentista,
> advogado, contador, psicólogo, nutricionista, arquiteto, personal, fisio.
> Você vende a sua hora e o seu nome: vive de agenda cheia, indicação e
> reputação, e quase sempre tem conselho de classe dizendo o que pode e o que
> não pode falar. O sistema gira em torno de ser lembrado e indicado, encher a
> agenda sem parecer que está vendendo, e não perder o paciente/cliente entre
> uma consulta e outra. O `/instalar` adapta esse molde com a sua realidade.

## O que é esse workspace

[Uma frase do que essa pasta representa. Ex: "Minha atuação como <profissão>:
o que publico, como atendo quem me procura, e como mantenho a agenda cheia."]

## Onde salvar o que

**Convenção: por tipo de entrega.** Cada pasta nasce quando a primeira peça
daquele tipo é criada: workspace não tem pasta vazia.

| O que | Onde | Skill |
|---|---|---|
| Memória do negócio | `_memoria/` | `/instalar`, `/atualizar` |
| Pautas, calendário, peças de conteúdo (educativo, autoridade) | `conteudo/` | `/ideias`, `/calendario`, `/carrossel` |
| Atendimento no WhatsApp (primeira resposta, valor, agendamento, ausência) | `vendas/whatsapp/` | `/whatsapp` |
| Depois do atendimento (retorno, depoimento, reativação) | `vendas/pos-venda/` | `/pos-venda` |
| Respostas às avaliações do Google (histórico, se quiser guardar) | `avaliacoes-google/` | `/responder-avaliacoes` |
| Marca: visual e verbal | `identidade/` | `/design-system`, `/marca` |
| Página (apresentação, agendamento, serviço específico) | `site/` | `/landing` |
| SEO (8 arquivos) | `seo/` | `/seo` |
| Materiais pra paciente/cliente (guia, orientação, e-book) | `materiais/` | `/documento` |
| Decks (palestra, aula, apresentação pra parceiro) | `apresentacoes/` | `/apresentacao` |
| Propostas (empresa, convênio, consultoria) | `propostas/` | `/proposta` |
| Contratos de prestação de serviço | `contratos/` | `/contrato` |
| Estudo de honorários e desenho do serviço | `oferta/` | `/oferta`, `/preco` |
| Fechamento do mês e custo da hora | `financeiro/` | `/caixa` |
| Campanhas e relatórios de ads | `campanhas/` | `/anuncio-google`, `/relatorio-ads` |
| E-mails longos (parecer, orientação, resposta formal) | `emails/` | `/email-profissional` |
| Pautas e contatos de imprensa | `imprensa/` | `/imprensa` |
| Dossiês de pesquisa | `pesquisa/` | `/pesquisa` |
| Fechamentos de semana | `revisoes/` | `/revisao-semanal` |
| Arquivo pra eu ler uma vez | `dados/` | — |
| Índice de ativos | `biblioteca.md` | `/biblioteca` |
| Pipeline | `tarefas.md` | `/tarefas` |

As pastas do sistema (`.claude/skills/`, `templates/`, `scripts/`) convivem na
raiz e são substituídas quando sai versão nova do Contex OS. Não guarde trabalho
dentro delas: o resto da raiz é seu.

## Quem sou

Sou [nome], [profissão] com [especialidade / área]. [Registro profissional: CRM
/ OAB / CRC / CRP / CRN / CAU / CREF nº, UF]. Atendo [presencial em <bairro,
cidade> | online | os dois].

## O que faço

- [serviço principal 1: ex. consulta, acompanhamento, parecer]
- [serviço principal 2]
- [serviço principal 3]

Como o cliente/paciente chega: [indicação | Google | Instagram | convênio |
plataforma]. Agenda: [dias e horários de atendimento]. Honorário de referência:
[R$ x por consulta/hora, ou "conforme tabela"].

## Quem atendo

[Perfil real de quem procura você hoje, sem persona. Ex: "mulheres de 35 a 50
que chegam por indicação de outra paciente, com dor há meses, já tentaram de
tudo".]

## O que eu posso e não posso dizer

[Regra do conselho que vale pra você, em linguagem direta. Se não souber a
regra exata, deixar `[a confirmar]` e o sistema pergunta antes de publicar.]

- Sem promessa de resultado ("cura", "garante", "resolve em 30 dias")
- Sem preço em anúncio (se o conselho proíbe: [CFM proíbe | OAB proíbe | não se aplica])
- Sem antes-e-depois de paciente identificável
- Sem depoimento de paciente em material promocional (se o conselho proíbe)
- Sigilo: nada de caso real, nem anonimizado, sem autorização por escrito
- Sempre com [registro] visível em material público

## Tom de voz

[Como você fala com quem atende. Frase real vale mais que adjetivos. Ex: "Isso
que você está sentindo tem nome, e tem tratamento".]

Evitar: [o que destoa. Quase sempre: jargão técnico sem tradução, tom de venda,
"agende já", diminutivos]

## Regras do sistema

- Toda peça pública (post, página, anúncio, material) passa pela seção "O que
  eu posso e não posso dizer" antes de sair. Se ferir uma regra, o sistema avisa
  e propõe a versão que passa
- Conteúdo educa: ensina o que a pessoa precisa saber pra decidir procurar
  ajuda, sem diagnosticar pela internet
- Dado de paciente/cliente não entra em prompt, arquivo versionado nem
  ferramenta externa. `dados/` é ignorado pelo git, e mesmo assim: anonimizar
- Honorário se conversa no WhatsApp com o roteiro do `/whatsapp`, nunca em
  tabela pública se o conselho proíbe
- Fechamento do mês é no `/caixa`, com o custo da hora calculado: é ele que
  decide se cabe convênio, desconto ou vaga nova
- O que está em jogo agora fica em `tarefas.md` (via `/tarefas`)
- [outras regras que aparecerem com o uso]

## Ferramentas conectadas

- [ ] Google Meu Negócio
- [ ] WhatsApp Business
- [ ] Instagram
- [ ] Agenda (Google Calendar / Doctoralia / sistema próprio)
- [ ] Google Ads
- [ ] Meta Ads

*(Marcar conforme for instalando os MCPs)*
