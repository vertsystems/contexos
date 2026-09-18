# Catálogo de Skills

<!-- ia:inicio -->
Skills de terceiros e nativas que valem conhecer. Use como referência ao criar skills novas com `/mapear-rotinas`, ou instale as que fizerem sentido pro seu negócio.

> **Nada nesta página vem instalado com o Contex OS.** As 55 skills do Contex OS
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
