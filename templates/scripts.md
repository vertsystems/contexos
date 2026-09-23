# scripts/ — utilitários (pasta do workspace)

Scripts Node.js e Python que as skills chamam quando precisam fazer coisas fora do alcance da IA pura (gerar imagem, postar em rede social, renderizar HTML em PNG).

A pasta vem **vazia**: cada skill que precisa de script tem instrução de como criar (e geralmente é um único setup por integração que você vai ativar).

## Scripts comuns

Conforme você for ativando skills, isso aqui vai sendo populado. Lista do que cada skill espera encontrar:

| Skill | Script esperado | O que faz |
|---|---|---|
| `/carrossel` (com foto IA) | **já vem pronto** em `scripts/gerar-imagem.js` | Gera foto por IA. Só precisa de `GEMINI_API_KEY` ou `OPENAI_API_KEY` no `.env` |
| `/carrossel` (render PNG) | `render.js` (gerado pela skill, fica na pasta do conteúdo) | Playwright tira screenshot 1080x1350 de cada slide |
| `/anuncio-google` | (nenhum — gera CSV direto) | — |
| `/relatorio-ads` | (lê CSV exportado das plataformas) | — |
| `/proposta` | (nenhum — gera HTML direto) | — |
| `/documento`, `/apresentacao` | **já vem pronto** em `scripts/gerar-pdf.js` | HTML → PDF, achando o navegador e esperando as fontes |
| todas que geram número | **já vem pronto** em `scripts/verificar.js` | Confere contagem, soma, data, contraste, peso e HTML |
| `/publicar-tema` | (nenhum — entrega os arquivos pra você postar) | — |
| `/lancamento` | **já vem pronto** em `scripts/lancamento.js` | Calendário de marcos com dia da semana e feriado, e a conta da meta em três cenários |
| `/medir` | **já vem pronto** em `scripts/utm.js` | Link com UTM na convenção, lista em lote, leitura de origem por CSV |
| `/teste-ab` | **já vem pronto** em `scripts/teste-ab.js` | Amostra mínima, duração e leitura do resultado (ganhou, perdeu, inconclusivo) |
| `/planilha` | **já vem pronto** em `scripts/gerar-planilha.js` | Escreve .xlsx com fórmula viva a partir de uma spec JSON; `--ler` abre .xlsx e .csv |
| `/word` | **já vem pronto** em `scripts/gerar-docx.js` | Markdown ou HTML → .docx editável; `--texto` e `--comparar` leem o que o cliente devolveu |
| `/site` | **já vem pronto** em `scripts/site.js` | Confere menu, title/description, canonical e CSS de todas as páginas; gera o sitemap |
| `/reuniao` | **já vem pronto** em `scripts/transcrever.js` | Gravação → texto pela OpenAI ou Gemini (chave no `.env`); YouTube via yt-dlp |
| `/quebrar` | **já vem pronto** em `scripts/entregas.js` | Confere o ENTREGAS.md: bloqueios, ordem, faixa de prazo e a próxima entrega livre |
| `/conectar` | **já vem pronto** em `scripts/conectar.js` | `status`, `lista` e `testar <ferramenta>`: prova que a chave do `.env` funciona sem mostrar o valor |
| `/rotina` | **já vem pronto** em `scripts/rotinas.js` | Rotinas vencidas, próxima ocorrência de "toda sexta 17h", registrar e desligar |
| `/obrigacoes` | **já vem pronto** em `scripts/obrigacoes.js` | Calendário fiscal do ano por enquadramento, ajustado pra dia útil e feriado |
| `/projecao` | **já vem pronto** em `scripts/projecao.js` | Projeção de 3 a 6 meses em três cenários, com a spec pro gerar-planilha.js |
| `/cobranca` | **já vem pronto** em `scripts/regua.js` | Valor corrigido com o juro certo e a régua de cinco toques em dia útil |
| `/ficha-tecnica` | **já vem pronto** em `scripts/ficha-tecnica.js` | Custo por porção, CMV e ranking do cardápio em .xlsx com fórmula |
| `/conciliar` | **já vem pronto** em `scripts/conciliar.js` | Extrato OFX/CSV contra os seus registros, com o que sobrou dos dois lados |
| `/emprestimo` | **já vem pronto** em `scripts/credito.js` | CET real por TIR, tabela de amortização e comparação entre propostas |
| `/custo-de-funcionario` | **já vem pronto** em `scripts/custo-funcionario.js` | Custo CLT, PJ e MEI rubrica por rubrica, com as exceções do Simples |
| `/pro-labore` | **já vem pronto** em `scripts/pro-labore.js` | Fator R: o pró-labore que segura a alíquota, com INSS e IRRF |
| `/projecao` | **já vem pronto** em `scripts/payback.js` | Compra de capital: ponto de equilíbrio, payback em meses e retorno |
| `/comprovantes` | **já vem pronto** em `scripts/comprovantes.js` | Organiza a pasta de notas e soma o CSV pro contador |
| `/confirmacao-de-agenda` | **já vem pronto** em `scripts/no-show.js` | Taxa de falta medida e o custo mensal dela em reais |
| `/capacidade` | **já vem pronto** em `scripts/capacidade.js` | Ocupação da agenda, hora ociosa e quando a próxima cadeira se paga |
| `/estoque` | **já vem pronto** em `scripts/estoque.js` | Ponto de pedido, cobertura, encalhado e curva ABC |
| `/procedimento` | **já vem pronto** em `scripts/procedimento.js` | Confere se todo passo da folha tem responsável e critério de pronto |
| `/cadastro-clientes` | **já vem pronto** em `scripts/cadastro-clientes.js` | Telefone em E.164, CPF/CNPJ validado, dedupe e PF/PJ separados |
| `/pessoa` | **já vem pronto** em `scripts/pessoas.js` | Índice de quem está no vácuo, com os dias sem contato somados |
| `/troca-devolucao` | **já vem pronto** em `scripts/prazos.js` | Data limite de arrependimento, garantia e conserto pelo CDC |
| `/publicidade-regulada` | **já vem pronto** em `scripts/publicidade.js` | Varre a peça contra o léxico do conselho e da plataforma |
| `/socios` | **já vem pronto** em `scripts/socios.js` | Participações que somam 100%, vesting por data e apuração de haveres |
| `/ordem-servico` | **já vem pronto** em `scripts/ordem-servico.js` | OS numerada, validade do orçamento e o índice por status |
| `/revisar-contrato` | **já vem pronto** em `scripts/revisar-contrato.js` | Varre multa, prazo, foro, cessão e exclusividade antes da leitura |
| `/autorizacao` | **já vem pronto** em `scripts/autorizacao.js` | Termo de imagem, depoimento ou aceite, pronto pra assinar |
| `/case` | **já vem pronto** em `scripts/case.js` | Recalcula a variação antes → depois e confere número contra fonte |
| `/retencao` | **já vem pronto** em `scripts/retencao.js` | Churn, retenção e receita em risco por script |
| `/nps` | **já vem pronto** em `scripts/nps.js` | NPS de verdade (promotores − detratores) com aviso de amostra pequena |
| `/combos` | **já vem pronto** em `scripts/combos.js` | Pares que saem juntos (coocorrência e lift) e margem do combo |
| `/delivery` | **já vem pronto** em `scripts/delivery.js` | Margem por prato e por canal, já sem taxa, cupom e embalagem |
| `/marketplace` | **já vem pronto** em `scripts/marketplace.js` | Confere título, atributo obrigatório e palavra vetada por plataforma |
| `/posts-perfil-google` | **já vem pronto** em `scripts/perfil-google.js` | Valida cada post contra o que o Google reprova |
| `/relatorio-cliente` | **já vem pronto** em `scripts/relatorio-cliente.js` | Consolida o mês do cliente a partir dos arquivos, sem estimar |
| `/briefing` | **já vem pronto** em `scripts/briefing.js` | Diz quais campos do briefing estão vazios e gera só essas perguntas |
| `/briefing-reuniao` | **já vem pronto** em `scripts/briefing-reuniao.js` | Cruza ata, tarefas, proposta e contrato e conta os dias sem contato |
| `/comunicado` | **já vem pronto** em `scripts/comunicado.js` | Prazo de aviso em dia útil e consistência de fato entre as peças |
| `/ensaiar` | **já vem pronto** em `scripts/ensaiar.js` | Mede o ensaio: proporção de fala, implicações feitas e concessões |
| `/leitor-frio` | **já vem pronto** em `scripts/leitor-frio.js` | Palavras até o primeiro CTA, posição do preço e tempo de leitura |
| `/impressao` | **já vem pronto** em `scripts/impressao.js` | Confere o PDF da gráfica em milímetros: tamanho, sangria e corte |
| `/assinatura-email` | **já vem pronto** em `scripts/assinatura-email.js` | Assinatura que não quebra: peso, largura e links respondendo 200 |
| `/blindar` | **já vem pronto** em `scripts/auditar-rls.js` e `scripts/vazamento.js` | Tabela sem RLS, política aberta e segredo no bundle publicado |
| `/prototipo` | **já vem pronto** em `scripts/prototipo.js` | Fluxo clicável: alcançabilidade, beco sem saída e ação sem destino |
| `/glossario` | **já vem pronto** em `scripts/glossario.js` | Onde o mesmo conceito aparece com nome diferente no código |
| `/manual-do-sistema` | **já vem pronto** em `scripts/manual-sistema.js` | Inventário do repositório: custo mensal, vencimentos e acessos |
| `/novidades` | **já vem pronto** em `scripts/novidades.js` | Filtra commit interno e agrupa em Novo, Melhorado e Corrigido |
| `/roteiro-longo` | **já vem pronto** em `scripts/tempo.js` | Duração pelo ritmo de fala e bloco sem troca de cena |
| `/publicar-video` | **já vem pronto** em `scripts/publicar-video.js` | Valida capítulo em 00:00, mínimo de três e limite de título |
| `/retencao-de-video` | **já vem pronto** em `scripts/retencao-video.js` | Classifica a curva de retenção e acha o segundo de cada queda |
| todas as que lidam com data, CPF/CNPJ ou dinheiro | **já vem pronto** em `scripts/br.js` | Módulo compartilhado: feriado, dia útil, CNPJ alfanumérico, E.164 |

## Pré-requisitos comuns

**Node.js 20+** instalado na máquina.

**Chaves de API** no `.env` da raiz (copie de `.env.example`):

```bash
# Foto por IA no /carrossel — basta UMA das duas (guia: templates/imagem-ia.md)
GEMINI_API_KEY=...                  # cota gratuita, sem cartão
OPENAI_API_KEY=sk-...               # pago por imagem
```

O fluxo padrão de conteúdo não precisa de chave nenhuma: as skills geram os PNGs e a legenda, e você publica onde quiser.

## O que já vem pronto

`scripts/gerar-imagem.js`: gera foto por IA com **OpenAI ou Gemini** (detecta pela chave que existir). Roda da **raiz do workspace**, acha o `.env` sozinho, sem instalar nada:

```bash
node scripts/gerar-imagem.js "PROMPT EM INGLÊS" "conteudo/pasta/foto.png"
```

Opções: `--provedor openai|gemini` · `--formato retrato|quadrado|paisagem` · `--modelo <nome>` · `--qualidade high|medium|low`

E `scripts/gerar-pdf.js`: transforma HTML em PDF com o navegador que existir na máquina, esperando as fontes carregarem, e confere o resultado:

```bash
node scripts/gerar-pdf.js materiais/guia/guia.html
```

E `scripts/verificar.js`: confere o que não pode ser estimado (contagem, soma, data, contraste, peso, HTML). Rode antes de entregar qualquer peça com número:

```bash
node scripts/verificar.js tudo conteudo/      # roda o que couber em cada arquivo
```

O mesmo script tem um comando que não olha o seu trabalho, e sim o sistema:

```bash
node scripts/verificar.js sistema             # skill que não carrega, referência quebrada
```

Ele confere se toda skill tem frontmatter legível (BOM invisível no início do
arquivo já derrubou três), se o `name:` bate com a pasta, se a `description` tem
o gatilho que faz a skill ser encontrada, se alguma skill manda rodar script que
não existe, se a contagem de skills nos textos ainda confere, e se o workspace
está inteiro no formato de uma IA só. Rode depois de criar skill com o
`/mapear-rotinas` e depois do `/atualizar-sistema`.

<!-- ia:inicio -->
E `scripts/ia.js`: deixa o workspace no formato da IA que o usuário usa, Claude
Code (`CLAUDE.md` + `.claude/skills/`) ou Codex (`AGENTS.md` + `.agents/skills/`),
e gera pra outra um arquivo de entrada de visita. A instalação roda uma vez;
depois só se o usuário pedir pra trocar a base, ou logo após o
`/atualizar-sistema`, que traz a versão nova sempre no formato do Claude Code:

```bash
node scripts/ia.js status                     # formato ativo, e se sobrou pedaço da outra
node scripts/ia.js codex                      # ou claude
```
<!-- ia:fim -->

São os **quatro** scripts que o sistema entrega prontos. Os outros da tabela acima são criados sob demanda pela skill que precisar deles.

**Outro gerador** (Midjourney, Leonardo, Firefly, o que você já paga): não há integração, e não vale montar. Gere a imagem lá e passe o arquivo — o `/carrossel` aceita foto pronta do mesmo jeito.

O `.env` é ignorado pelo git. Nenhuma chave sai daqui.

**Playwright** (pra renderizar HTML em PNG) — instalado **uma vez só, aqui nessa pasta**:

```bash
cd scripts
npm install playwright
npx playwright install chromium
```

Cada pasta de conteúdo reaproveita essa instalação apontando o `NODE_PATH` pra cá:

```bash
NODE_PATH="../../../scripts/node_modules" node render.js
```

Isso evita um `node_modules` de centenas de MB por carrossel criado. O `node_modules/` é ignorado pelo git.

## Como o Contex OS lida com isso

Quando você roda uma skill que precisa de script ausente, o assistente vai:

1. Detectar que falta o script
2. Te perguntar se quer configurar agora
3. Te guiar no setup das chaves de API (Meta, OpenAI, etc.)
4. Criar o script já configurado
5. Rodar a skill

Você não precisa decorar nada. Roda a skill, segue o fluxo.
