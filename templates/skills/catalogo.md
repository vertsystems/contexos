# Catálogo de Skills

<!-- ia:inicio -->
Skills de terceiros e nativas que valem conhecer. Use como referência ao criar skills novas com `/mapear-rotinas`, ou instale as que fizerem sentido pro seu negócio.

> **Nada nesta página vem instalado com o Contex OS.** As 117 skills do Contex OS
> ficam na pasta de skills do projeto — a lista completa está no fim deste arquivo.
> O que está aqui embaixo é catálogo externo: umas já vêm no Claude Code,
> outras você instala por fora.
>
> **Skills globais** funcionam em qualquer projeto: `~/.claude/skills/` no
> Claude Code, `~/.agents/skills/` no Codex. Skills locais ficam na pasta de
> skills do projeto e só funcionam nele.
>
> Onde está escrito "já vem no Claude Code": no Codex ela não vem. A tarefa é
> feita direto pelo assistente, ou você instala uma equivalente como global.

---

## Escrever copy e textos de venda

### Schwartz Copy (resposta direta)
**O que faz:** Escreve copy de vendas usando a metodologia de Eugene Schwartz (Breakthrough Advertising). Diagnostica o nível de consciência e sofisticação do mercado antes de gerar qualquer texto.
**Bom pra:** Landing pages, e-mails de venda, VSLs, cartas de venda, páginas de captura
**Como instalar:** não vem no Contex OS — instalar como skill global (caminho no topo). Depois: `/schwartz-copy`
**Fonte:** skill de terceiros, testada em produção

### Ogilvy Copy (marca e posicionamento)
**O que faz:** Gera copy institucional usando a metodologia de David Ogilvy. Pesquisa profunda, big idea, headlines informativas.
**Bom pra:** Manifestos de marca, campanhas institucionais, taglines, brand voice, posicionamento
**Como instalar:** não vem no Contex OS — instalar como skill global (caminho no topo). Depois: `/ogilvy-copy`
**Fonte:** skill de terceiros, testada em produção

---

## Criar interfaces e páginas web

### Frontend Design
**O que faz:** Cria interfaces web completas com design de alta qualidade. Gera código HTML/CSS/React pronto pra usar, com visual profissional que foge da estética genérica de IA.
**Bom pra:** Landing pages, dashboards, componentes web, páginas de produto
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

---

## Criar visuais e arte

### Canvas Design
**O que faz:** Cria arte visual em PNG e PDF usando princípios de design. Pôsteres, capas, peças gráficas.
**Bom pra:** Capas de e-book, banners, peças visuais, thumbnails
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

---

## Trabalhar com documentos

### PDF
**O que faz:** Manipula PDFs — extrai texto e tabelas, cria novos, junta/separa documentos, preenche formulários.
**Bom pra:** Extrair dados de contratos, criar relatórios em PDF, preencher formulários
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

### DOCX
**O que faz:** Cria e edita documentos Word com formatação, controle de alterações e comentários.
**Bom pra:** Propostas formais, contratos, documentos pra clientes que pedem Word
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

### PPTX
**O que faz:** Cria e edita apresentações PowerPoint com layouts, notas do apresentador e formatação.
**Bom pra:** Apresentações pra clientes, decks de vendas, materiais de treinamento
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

### XLSX
**O que faz:** Cria e edita planilhas com fórmulas, formatação e gráficos.
**Bom pra:** Relatórios financeiros, dashboards em planilha, análise de dados
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

---

## Escrever documentos e especificações

### Doc Co-Authoring
**O que faz:** Fluxo guiado pra coescrever documentos. Entrevista você, itera rascunhos e valida que o documento funciona pro leitor.
**Bom pra:** Propostas técnicas, especificações, documentos de decisão, POPs
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

---

## Extrair transcrição de vídeo

### YT Transcript
**O que faz:** Extrai transcrições de vídeos do YouTube usando yt-dlp. Suporta vários idiomas.
**Bom pra:** Criar conteúdo a partir de vídeos (carrosséis, newsletters, posts)
**Precisa de:** yt-dlp instalado (`brew install yt-dlp`)
**Como instalar:** não vem no Contex OS — instalar como skill global (caminho no topo). Depois: `/yt-transcript`
**Fonte:** skill de terceiros, testada em produção

---

## Testar sites e apps

### Webapp Testing
**O que faz:** Testa aplicações web locais usando Playwright. Captura screenshots, verifica funcionalidade, lê logs do navegador.
**Bom pra:** Testar landing pages antes de publicar, verificar se tudo funciona em diferentes tamanhos de tela
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

---

## Criar skills novas

### Skill Creator
**O que faz:** Guia pra criar skills novas do zero. Ajuda a estruturar, definir gatilhos e testar.
**Bom pra:** Quando o `/mapear-rotinas` não cobre o que você precisa e quer criar algo mais complexo
**Como instalar:** Já vem no Claude Code
**Fonte:** Skill nativa do Claude Code

---

<!-- ia:fim -->

## O que o Contex OS já resolve (não precisa de skill nova)

Antes de criar skill, conferir se um desses já cobre:

| Tarefa | Skill |
|---|---|
| Não sei qual skill usar | `/ajuda` |
| Post, carrossel, imagem pra rede social | `/carrossel` |
| Artigo de blog + carrossel + legendas | `/publicar-tema` |
| Landing page / página de vendas | `/landing` |
| E-book, apostila, guia em PDF | `/documento` |
| Slides pra reunião ou pitch | `/apresentacao` |
| Proposta comercial | `/proposta` |
| Desenhar o que eu vendo (bônus, garantia, urgência) | `/oferta` |
| Quanto cobrar, faixas, subir preço, "tá caro" | `/preco` |
| Descobrir quem compra e a dor na palavra dele | `/publico` |
| Preparar conversa de venda e tratar objeção | `/vender` |
| Por que a página não converte | `/conversao` |
| Posicionamento, história e voz da marca | `/marca` |
| Aparecer na imprensa sem assessoria | `/imprensa` |
| Tokens, paleta, identidade visual | `/design-system` |
| Auditar o visual de uma peça | `/revisar-design` |
| Revisar texto (clichê, gordura, tom) | `/revisar` |
| Texto com cara de IA: dar voz, medir o ritmo, tirar o genérico | `/humanizar` |
| Não sei o que postar | `/ideias` |
| Levantar dados e fontes sobre um tema | `/pesquisa` |
| Achar um ângulo / hook diferente | `/angulos` |
| Planejar o mês de conteúdo | `/calendario` |
| Transformar conteúdo antigo em peça nova | `/reaproveitar` |
| Catalogar depoimento, foto, dado, case | `/biblioteca` |
| Palavra-chave, concorrência, GMB, aparecer em IA | `/seo` |
| Campanha de Google Ads em CSV | `/anuncio-google` |
| Relatório semanal de mídia paga | `/relatorio-ads` |
| Resposta pra avaliação do Google | `/responder-avaliacoes` |
| Análise de CSV/XLSX/PDF | `/analisar-dados` |
| Rascunho de e-mail | `/email-profissional` |
| Pipeline do que está em jogo | `/tarefas` |
| Fechar a semana e medir | `/revisao-semanal` |
| API, banco de dados, login, sistema no ar | `/backend` |
| Padrão das telas de uso: botão, campo, tabela, estados | `/interface` |
| Animação: duração, curva, aparecer ao rolar | `/movimento` |
| Página de planos, cardápio, catálogo, tabela de preços | `/produto` |
| Site acessível e rápido (WCAG 2.2 + Core Web Vitals) | `/acessivel` |
| E-mail em HTML para lista, newsletter, campanha | `/email` |
| Consulta lenta, erro em produção, publicação | `/backend` |
| Fechar o mês: quanto entrou, sobrou, e o que dá lucro | `/caixa` |
| Depois do fechou: expectativa, depoimento, cliente parado, orçamento sem resposta | `/pos-venda` |
| Atendimento e mensagem de WhatsApp | `/whatsapp` |
| Roteiro de Reels, TikTok e Shorts | `/video` |
| Contrato de prestação de serviço | `/contrato` |
| Quem são os concorrentes e onde está a brecha | `/concorrente` |
| Pasta e contexto pra cliente/projeto novo | `/novo-projeto` |
| O que vai ser construído, quanto custa, site ou app, e quem mantém depois | `/escopo` |
| Auditar código que já existe: sintoma, custo, conserto, consertar ou refazer | `/revisar-codigo` |
| Toda vez que mexem quebra outra coisa: por onde começar a testar | `/testar` |
| O sistema já está no ar: o que virou uso, o que entra agora, o que desligar | `/evoluir` |
| Vou lançar curso, turma, produto, promoção de época ou inaugurar: plano em três fases com datas conferidas e meta em número | `/lancamento` |
| Série de e-mails ou WhatsApp com gatilho e intervalo: boas-vindas, nutrição, orçamento parado, reativação, pós-compra, lista de espera | `/sequencia` |
| Cliente novo do zero: perfil ideal, lista pontuada, mensagem fria por canal, follow-up e rotina da semana | `/prospeccao` |
| Quero que meu cliente traga cliente: programa de indicação, recompensa, afiliado e a conta | `/indicacao` |
| Parceria com outro negócio ou criador local: quem, o formato, a conta, a proposta e o contrato mínimo | `/parcerias` |
| Live, workshop, aula aberta ou evento na loja: meta com número, roteiro minuto a minuto, lembretes em data certa e a colheita depois | `/evento` |
| De onde vem meu cliente: instalar GA4 e pixel, link com UTM, pergunta no atendimento e a leitura do mês por canal | `/medir` |
| Testar duas versões (página, anúncio, preço) e saber se a diferença é real ou sorte | `/teste-ab` |
| Planilha Excel de verdade, com fórmula que recalcula: orçamento, estoque, pedidos, fluxo de caixa, prospecção; ou abrir e consertar a que já existe | `/planilha` |
| Cliente pediu em Word: proposta, contrato ou documento em .docx editável, e comparar o que ele devolveu | `/word` |
| Quero um site de verdade, com várias páginas, pra aparecer no Google e no WhatsApp | `/site` |
| Quero transformar o que eu sei em curso, treinamento ou mentoria (e saber se é curso ou é e-book) | `/curso` |
| Gravei a reunião: ata, decisões, quem faz o quê e até quando | `/reuniao` |
| Vou parar por aqui: guardar onde parei pra retomar amanhã | `/pausar` |
| Decisão grande (contratar, subir preço, aceitar cliente, abrir frente, mudar de nicho): entrevista até fechar as pontas e decisão escrita em uma página | `/decidir` |
| O escopo tá aprovado: por onde começo a construir, o que vem primeiro, quanto leva cada parte | `/quebrar` |
| Ligar uma ferramenta de fora (chave de IA, Instagram, Notion, Gmail, Analytics, Vercel, Supabase, Mailchimp): onde pegar, onde colar, teste que prova | `/conectar` |
| Toda sexta a revisão, toda segunda os ads, dia 1 o caixa: o que repete, agendado | `/rotina` |
| Quando vence o DAS, quanto é o MEI esse ano, estourei o teto, preciso de contador? | `/obrigacoes` |
| Como fica o caixa nos próximos meses: dá pra contratar, aguento janeiro, e se subir o preço | `/projecao` |
| Tem cliente me devendo: quem cobrar hoje, quanto com o juro certo, e a mensagem pronta | `/cobranca` |
| Quanto custa cada fatia do meu bolo, e qual item do cardápio está dando prejuízo? | `/ficha-tecnica` |
| Contratei alguém e preciso ensinar como se faz, ou vou tirar férias e nada funciona sem mim | `/procedimento` |
| O cliente marca, não vem, e eu não sei quanto isso me custa por mês | `/confirmacao-de-agenda` |
| Transformar o resultado que você conseguiu pro cliente em case com número provado e autorização | `/case` |
| Cliente quer trocar ou devolver: sou obrigado, até quando, e o que eu respondo | `/troca-devolucao` |
| Meu banco tá aberto? Quem tem o link lê os dados dos clientes, e a chave secreta foi parar no site: laudo com prova, migration de correção e o diff | `/blindar` |
| Posso postar isso? Regra do conselho (CRM, CRO, OAB, CRP, CRECI) e da Meta na peça, com artigo e reescrita | `/publicidade-regulada` |
| Minha planilha de clientes tá uma bagunça: tem gente repetida, telefone que não disca e CPF errado | `/cadastro-clientes` |
| O banco me ofereceu um empréstimo, vale a pena?" · "antecipar as vendas da maquininha compensa?" · "12 vezes sem juros ou à vista com desconto?" · "quanto vou pagar no total?" · "a parcela cabe no meu caixa? | `/emprestimo` |
| Meus alunos estão cancelando, quantos clientes eu perdi esse mês e quem está em risco de sair | `/retencao` |
| Preciso que o cliente autorize usar a foto ou o depoimento dele, ou assine que recebeu o trabalho | `/autorizacao` |
| Quanto custa de verdade contratar alguém, e se compensa mais CLT, PJ ou MEI | `/custo-de-funcionario` |
| Meu perfil do Google tá parado e eu não sei o que postar esse mês | `/posts-perfil-google` |
| Bater o extrato do banco com o que eu vendi e cobrei, e saber quem não me pagou | `/conciliar` |
| Fechar o mês do cliente e mandar o relatório com o que foi feito, o que mudou e o que ele precisa aprovar | `/relatorio-cliente` |
| Tenho reunião com um cliente e não lembro onde a gente parou | `/briefing-reuniao` |
| O dev saiu e ninguém sabe onde o sistema mora: manual em português, acessos pelo cofre, custo do mês somado, vencimentos e o que fazer quando cai | `/manual-do-sistema` |
| Ficha de quem importa: quem eu deixei sem resposta, o que combinei com cada um, aniversário e renovação chegando | `/pessoa` |
| O cliente não mandou o briefing e eu preciso das respostas dele pra fechar a proposta | `/briefing` |
| Quanto sobra de cada prato no iFood, Rappi e 99Food, e o que tirar do app | `/delivery` |
| Minha agenda tem buraco e eu não sei quanto consigo atender por mês nem se vale contratar mais um | `/capacidade` |
| Acordo de sócios: o que acontece se um sai, morre ou para de trabalhar | `/socios` |
| Preciso mandar imprimir cartão de visita, flyer ou adesivo e não sei preparar o arquivo pra gráfica | `/impressao` |
| Não sei o que comprar essa semana e tenho dinheiro parado em produto encalhado | `/estoque` |
| Avisar do reajuste, da mudança de regra ou do fechamento, com FAQ e calendário de disparo | `/comunicado` |
| Tenho reunião de venda amanhã (ou preciso cobrar um cliente) e quero treinar antes com alguém fazendo o cliente difícil, e depois ver onde eu errei | `/ensaiar` |
| Pasta de notas, comprovantes de Pix, boletos e recibos bagunçada: organizar por mês e sair com o CSV do contador | `/comprovantes` |
| Vou subir esse vídeo no YouTube e não sei o que escrever no título, na descrição e nos capítulos | `/publicar-video` |
| Avisar os clientes do que mudou no sistema essa semana, sem eles precisarem entender de código | `/novidades` |
| Será que o cliente entende minha proposta? Quero que alguém que nunca viu leia e diga onde travou | `/leitor-frio` |
| Quero ver se o cliente entende esse fluxo antes de mandar construir | `/prototipo` |
| O cliente trouxe o aparelho pra consertar: OS numerada, orçamento discriminado com validade e aprovação por escrito | `/ordem-servico` |
| Contrato que o cliente mandou pra assinar: risco, cláusula por cláusula e redação alternativa | `/revisar-contrato` |
| Não sei quanto tirar de pró-labore por mês e meu contador falou em Fator R | `/pro-labore` |
| Assinatura de e-mail: a sua ou a da equipe, sem quebrar no Outlook | `/assinatura-email` |
| Roteiro de vídeo de 6 a 20 minutos: gancho de 30s, loops, timecode calculado e CTA no ponto certo | `/roteiro-longo` |
| Cada parte do sistema chama a mesma coisa de um nome diferente: um nome por conceito, a grafia do banco, da tela e do WhatsApp, e a lista fechada de estados com os casos de borda respondidos | `/glossario` |
| Por que as pessoas param de ver meu vídeo: a curva, o segundo da queda e o que consertar | `/retencao-de-video` |
| Quero saber se os clientes estão satisfeitos: a nota de 0 a 10, a conta certa e quem contatar essa semana | `/nps` |
| Anunciar um produto no Mercado Livre ou na Shopee: título na régua da casa, ficha técnica, descrição e o checklist de chat, envio e devolução | `/marketplace` |
| Descobrir quais produtos meus clientes levam juntos e montar combo com preço e margem que fecham | `/combos` |

---

## As skills do próprio sistema

Não resolvem trabalho do negócio: cuidam do Contex OS em si:

| Tarefa | Skill |
|---|---|
| Primeira configuração: entrevista, memória, perfil de pastas | `/instalar` |
| Abrir a sessão de trabalho carregando a memória do negócio | `/abrir` |
| Reconciliar a memória com o que mudou no projeto | `/atualizar` |
| Puxar versão nova do Contex OS sem tocar no seu trabalho | `/atualizar-sistema` |
| Salvar o trabalho no GitHub (commit + push) | `/salvar` |

---

## Como adicionar skills novas a este catálogo

Se você testou uma skill e quer registrar aqui pra referência futura:

```markdown
### Nome da Skill
**O que faz:** [descrição em uma frase]
**Bom pra:** [casos de uso práticos]
**Como instalar:** [comando ou instrução]
**Fonte:** [de onde veio — nativa, criada por você, ou de terceiros]
```
