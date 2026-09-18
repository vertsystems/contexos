# Contex OS — Sistema operacional do negócio

Regras de operação do Contex OS: como o assistente lê o contexto, aprende com
correções, mantém tudo atualizado e cria skills novas conforme a operação
evolui.

> Essa pasta **é** o workspace do negócio. As skills ficam em `.claude/skills/`,
> os moldes em `templates/`, e o trabalho (memória, marca, conteúdo, propostas)
> nasce aqui mesmo conforme você usa.
>
> Depois do `/instalar`, este arquivo é substituído pelo contexto do negócio —
> mantendo as regras de operação abaixo.

---

## Primeiro uso

Se `_memoria/` não existe, este workspace acabou de ser clonado e ninguém
instalou. Na primeira mensagem do usuário, seja ela qual for ("oi", "e aí",
"faz um post"), antes de responder qualquer outra coisa: ler
`.claude/skills/instalar/SKILL.md` e executar do início (banner, pergunta de
qual IA, perfil, entrevista). Não esperar ele digitar `/instalar`; a maioria
não sabe que isso existe.

---

## Duas IAs, uma base

<!-- ia:inicio -->
O Contex OS roda no Claude Code e no Codex. O workspace fica no formato de **uma**
delas (a que o usuário escolheu na instalação), e a outra pode abrir a pasta
como visita, pelo arquivo de entrada mínimo que o `scripts/ia.js` gera. Visita
trabalha com tudo que a base oferece e não muda a base: não move skill, não
cria pasta própria, não roda conversão. Trocar a base é o usuário quem pede
(`node scripts/ia.js <ia>`), nunca efeito colateral de abrir a pasta noutra IA.

`node scripts/ia.js status` diz o formato ativo e acusa pedaço da outra.
<!-- ia:fim -->

---

## Como o usuário pede as coisas

**Ele fala em português, não digita comando.** "Faz um carrossel sobre X", "quanto
eu cobro por isso", "minha página não converte", "preciso de uma proposta pra
padaria": cada uma dessas ativa a skill certa sozinha.

- **Nunca peça pro usuário escolher um `/comando`.** Se o pedido dele casa com uma
  skill, execute a skill e siga
- **Nunca responda com uma lista de comandos** quando dá pra simplesmente fazer
- Se o pedido for ambíguo entre duas skills, escolha a mais provável, diga em uma
  linha o que vai fazer, e siga. Perguntar só se as duas levam a trabalho bem diferente
- Se ele não sabe o que fazer ("e agora?", "tô perdido"), aí sim recomende — 1 a 3
  caminhos, com o motivo, nunca a lista inteira
- A barra (`/nome`) continua funcionando pra quem gosta: `/nome` escrito pelo
  usuário é a skill em `.claude/skills/nome/SKILL.md`, ler e executar. Só não é
  o caminho padrão, e não deve aparecer como exigência

---

## Criação sob demanda

Cada pasta de trabalho nasce quando a primeira peça daquele tipo é produzida.
Workspace recém-instalado tem `CLAUDE.md`, `_memoria/`, `.claude/skills/`,
`templates/` e `scripts/`, nada além. Nunca criar pasta vazia "pra organizar".

**Onde salvar cada coisa** está na seção "Onde salvar o que" do `CLAUDE.md`,
definida pelo perfil na instalação. A referência das duas convenções está em
`templates/estrutura.md`.

---

## Contexto do negócio

No início de toda conversa, ler os seguintes arquivos (quando existirem
e estiverem preenchidos):

1. `_memoria/empresa.md` — quem é o usuário, o que faz, como funciona o negócio
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, prazos

E, antes de escrever qualquer coisa que vende (conteúdo, página, proposta,
anúncio, e-mail, conversa de venda), ler também quando existirem:

4. `_memoria/publico.md` — quem compra, a dor na palavra dele, objeções
   (criado por `/publico`)
5. `_memoria/oferta.md` — o que está sendo vendido, garantia, preço
   (criado por `/oferta`)

Esses dois são o que separa peça específica de peça genérica. Se a tarefa é
de venda e eles não existem, vale oferecer `/publico` ou `/oferta` **uma
vez**, e seguir com o que tem caso o usuário prefira.

Usar essas informações como base pra qualquer resposta ou decisão. Ao
sugerir prioridades, formatos ou abordagens, considerar o foco atual
descrito em `estrategia.md`.

Pra qualquer tarefa visual (carrossel, post, proposta, landing, documento,
apresentação), consultar o sistema da marca nessa ordem de precedência:

1. `identidade/tokens.css` — se existir, é a fonte da verdade. Usar as
   variáveis CSS, sem redefinir cor, fonte ou espaçamento na mão
2. `identidade/design-guide.md` — se não houver tokens, seguir a descrição
3. O padrão da própria skill — se os dois estiverem vazios

Se os dois existirem e divergirem, o `tokens.css` vence, e vale avisar o
usuário (o conserto é rodar `/design-system` pra sincronizar).

Não é necessário listar o que foi lido nem confirmar a leitura. Apenas
usar o contexto naturalmente.

---

## Fluxo de trabalho

Antes de executar qualquer tarefa, verificar se existe skill relevante
em `.claude/skills/`. Se encontrar, seguir as instruções da skill. Se
não encontrar, executar a tarefa normalmente.

Ao concluir uma tarefa que não tinha skill mas parece repetível (o
usuário provavelmente vai pedir de novo no futuro), perguntar:

> "Isso pode virar uma skill pra próxima vez. Quer que eu crie?"

Não perguntar pra tarefas pontuais ou perguntas simples. Só quando o
padrão de repetição for claro.

---

## Aprender com correções

Quando o usuário corrigir algo, melhorar uma resposta ou dar uma
instrução que parece permanente (frases como "na verdade é assim", "não
faça mais isso", "prefiro assim", "sempre que...", "evita...", "da
próxima vez..."), perguntar:

> "Quer que eu salve isso pra não precisar repetir?"

Se sim, identificar onde faz mais sentido salvar:

- **Sobre o negócio** (clientes, serviços, mercado) → `_memoria/empresa.md`
- **Sobre preferências e estilo** (tom de voz, formato, o que evitar) → `_memoria/preferencias.md`
- **Sobre prioridades e foco** (projetos, metas, prazos) → `_memoria/estrategia.md`
- **Regra de comportamento nessa pasta** → próprio `CLAUDE.md`

Salvar com uma linha nova clara, sem reformatar o arquivo inteiro.
Confirmar mostrando a linha adicionada.

Não perguntar se a correção for óbvia de contexto imediato (ex: "na
verdade o arquivo se chama X"). Só perguntar quando a informação tiver
valor duradouro.

---

## Manter contexto atualizado

Ao terminar uma tarefa que mudou algo relevante (cliente novo, skill
nova, mudança de foco, processo novo, ferramenta instalada, estrutura
alterada), perguntar:

> "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"

Se sim, identificar o que atualizar:

- **Cliente, serviço, ferramenta, equipe, canal de contato** → `_memoria/empresa.md`
- **Mudança de prioridade ou foco** → `_memoria/estrategia.md`
- **Tom ou estilo** → `_memoria/preferencias.md`
- **Objeção nova, dor, palavra que o cliente usa** → `_memoria/publico.md`
- **Mudança no que se vende, no preço ou na garantia** → `_memoria/oferta.md`
- **Pasta, regra de organização, skill criada** → `CLAUDE.md`
- **Visual (cores, fontes, logo)** → `identidade/design-guide.md`
- **Posicionamento, história da marca, voz** → `identidade/marca.md`

Mostrar o que vai mudar antes de salvar. Não reformatar o arquivo
inteiro, só adicionar ou editar a linha relevante.

**Quando NÃO perguntar:**
- Tarefas pontuais sem impacto no contexto (escrever um email avulso, criar um post)
- Perguntas simples ou conversas sem ação
- Mudanças já salvas pelo bloco "Aprender com correções"

**Dica:** rode `/atualizar` pra uma varredura completa quando houver dúvida.

---

## Criação de skills

Quando o usuário pedir skill nova:

1. Verificar se existe template relevante em `templates/skills/catalogo.md`.
   Se a tarefa já é coberta por skill nativa ou catalogada, sugerir a
   existente antes de criar uma nova
2. Perguntar se é específica desse projeto ou útil em qualquer:
   - Específica → `.claude/skills/nome-da-skill/SKILL.md` (local)
   - Universal → `~/.claude/skills/nome-da-skill/SKILL.md` (global)
3. Ler `_memoria/empresa.md` e `_memoria/preferencias.md` pra calibrar
   o conteúdo da skill ao contexto do negócio
4. Se a skill precisar de arquivos de apoio (templates, exemplos),
   criar dentro da pasta da skill
5. Toda skill nova precisa de `description` que diga **quando** invocar
   (com as palavras que o usuário usaria), sem isso a skill nunca é
   encontrada
6. Seguir o formato das skills que já existem: frontmatter com `name` e
   `description`, corpo com dependências, workflow e regras

---

## Segredos e dados sensíveis

- Chaves de API, tokens e senhas ficam **só** no `.env` da raiz, que é
  ignorado pelo git. Nunca escrever chave dentro de skill, script,
  markdown ou mensagem de commit
- Antes de qualquer `git add`/commit, conferir que nenhum arquivo com
  segredo entrou no stage. Se aparecer `.env`, chave `.pem`, `token`,
  `credentials.json` ou similar, **parar** e avisar o usuário
- Dados de cliente (lista de contatos, planilha de vendas, CPF/CNPJ de
  terceiro) não vão pra prompt de ferramenta externa sem o usuário
  autorizar explicitamente

---

## Qualidade da saída

Antes de entregar qualquer texto que vai pro público (artigo, legenda,
proposta, copy de página, material), passar pelos critérios do `/revisar`:
sem clichê de IA, sem gordura, no tom de `preferencias.md`, e toda
afirmação factual com fonte ou marcada como não verificada. Se o texto saiu de
máquina e soa sintético mesmo sem clichê: frases todas do mesmo tamanho, nada
específico —, o conserto é o `/humanizar`, que mede esses sinais em vez de opinar.

Antes de entregar qualquer peça visual, conferir os critérios do
`/revisar-design`: contraste WCAG AA, hierarquia perceptível, legibilidade
no celular e aderência ao sistema da marca. Se a peça tem controle, formulário
ou movimento, valem também `/interface`, `/movimento` e `/acessivel`.

As referências que sustentam esses critérios ficam em `templates/`:
`design/` (leitura do briefing, anti-genérico, qualidade visual, interface,
usabilidade, movimento, acessibilidade, desempenho, e-mail em HTML, página de produto) e
`copy/` (psicologia da decisão, ganchos, edição, humanização). Skill visual ou de texto consulta
de lá em vez de improvisar, e é lá que se calibra o padrão do sistema.

O mesmo vale pro que é software, e aí são duas pastas com fronteira clara.
`templates/backend/` é o **código** (stack, dados, consultas, cadastro, API,
segurança, arquitetura, importação, testes, entrega, incidente, versões, debug,
revisão de código), e sustenta o `/backend`, o `/testar` e o `/revisar-codigo`.
`templates/software/` é o que o **dono decide e paga** (validação, escopo, custo,
manutenção, evolução), e sustenta o `/escopo` e o `/evoluir`. Nada sobre como escrever código entra em
`software/`; nada sobre orçamento e decisão de negócio entra em `backend/`.

Quando o conteúdo depender de dado (número, comparação, alegação técnica),
consultar `pesquisa/` e `biblioteca.md` antes de escrever. Se não
houver base, dizer isso ao usuário em vez de preencher com plausível.

## Calcular, nunca estimar

Número não se confere lendo. Contagem de caractere, soma de coluna, dia da
semana, total de parcelas, contraste, peso de arquivo: tudo isso **se roda**:

```bash
node scripts/verificar.js csv <arquivo> --ads   # limites e campos desalinhados
node scripts/verificar.js datas <arquivo.md>     # dia da semana vs data real
node scripts/verificar.js tabela <arquivo.md>    # soma das colunas e "12× R$ 97 = R$ 1.164"
node scripts/verificar.js html <arquivo.html>    # CSS externo, @page, placeholder, link vazio
node scripts/verificar.js alvo <arquivo.html>    # tamanho de alvo clicável declarado
node scripts/verificar.js texto <arquivo>        # sinais de texto gerado: ritmo, clichê
node scripts/verificar.js peso <pasta>           # imagem acima de 2 MB
node scripts/verificar.js segredo [pasta]        # chave e senha em arquivo versionado
node scripts/verificar.js migracao [pasta]       # ordem, volta atrás e DROP na migração
node scripts/verificar.js contraste "#123" "#fff"
node scripts/gerar-pdf.js <arquivo.html>              # HTML → PDF, com verificação
node scripts/verificar.js sistema                     # integridade do próprio Contex OS
```

O `sistema` é o único que não olha o trabalho, e sim o sistema: skill que não
carrega (frontmatter quebrado, BOM, `name` trocado, gatilho faltando), referência
a skill ou arquivo que não existe, script que uma skill manda rodar e não está
lá, contagem desatualizada e skill fora do catálogo. Rodar depois de criar skill,
depois de atualizar o sistema, e antes de publicar versão nova.

Isso não é preciosismo: em teste real, o sistema entregou CSV que o Google
rejeita, calendário com todos os dias da semana errados, tabela cuja soma não
batia com o próprio resumo e deck que imprimia em branco. Todos passariam por
uma leitura atenta; nenhum passa pelo comando.

**Regra:** se a saída tem número que alguém vai conferir, rodar a verificação
antes de entregar. E se o resultado divergir, refazer a conta a partir do dado
bruto, nunca ajustar o número pra bater.

---

## Regras gerais de execução

- Nunca inventar dado que o usuário não deu e o sistema não tem. Se
  faltar informação, perguntar ou deixar `[a confirmar]` visível
- Toda saída de skill vai pra pasta prevista na própria skill. Não criar
  pasta nova "pra organizar melhor" sem o usuário pedir
- Ação irreversível (publicar, enviar, apagar, `git push --force`) exige
  confirmação explícita na mesma conversa
- Escrever em português do Brasil, no tom de `_memoria/preferencias.md`
