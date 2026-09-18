---
name: backend
description: >
  Constrói e conserta o lado servidor de um sistema: API, banco de dados, login e permissão,
  desempenho, teste, publicação e monitoramento. Escolhe a stack, desenha as tabelas e as rotas,
  fecha as brechas conhecidas e mede antes de otimizar.
  Use quando o usuário disser "faz uma API", "monta o backend", "cria o servidor",
  "conecta com o banco", "cria as tabelas", "fazer o login do sistema", "quem pode ver o quê",
  "a consulta está lenta", "o sistema caiu", "deu erro em produção", "como eu publico isso",
  ou /backend.
---

# /backend — Servidor, API e banco

> **Convenção de pastas:** o código vive em `sistemas/<nome>/`. Na convenção **por cliente**, `clientes/<Nome>/sistemas/<nome>/`. A pasta nasce na hora de criar o projeto, nunca antes.

O que decide se um sistema vai dar trabalho não é a linguagem escolhida. É se os dados foram
desenhados antes do código, se a entrada é validada no servidor, e se dá pra descobrir o que
aconteceu quando ele quebra num domingo à noite.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` — quantas pessoas usam, o que o sistema precisa fazer, quem mantém depois
- **Prioridades:** `_memoria/estrategia.md` — prazo e orçamento mudam a escolha da stack mais que qualquer benchmark
- **Referências** (ler a que o passo pedir, não todas):
  - **Antes da primeira linha:** `templates/backend/stack.md` (escolher linguagem, framework, banco e hospedagem) e `templates/backend/dados.md` (modelar tabela, índice, consulta, cache, escala)
  - **Construindo:** `templates/backend/api.md` (rota, status, erro, paginação, versão, documentação), `templates/backend/cadastro.md` (gravar, editar, apagar, listar), `templates/backend/consultas.md` (o total que sai errado sem dar erro), `templates/backend/importacao.md` (planilha, XML, exportação do sistema antigo), `templates/backend/seguranca.md` (as dez falhas do OWASP, login, senha, permissão) e `templates/backend/arquitetura.md` (como dividir o código, resiliência, legibilidade). Do lado de quem usa, `templates/design/usabilidade.md` diz o que a tela do cadastro precisa impedir, responder e não perguntar
  - **Subindo:** `templates/backend/testes.md` (o que não testar, e o que a bateria diz do código), `templates/backend/entrega.md` (teste, container, CI/CD, publicação, monitoramento) e `templates/backend/versoes.md` (commit por intenção, etiqueta, volta atrás)
  - **Com o sistema no ar:** `templates/backend/debug.md` (investigar defeito, log, os cinco problemas mais comuns) e `templates/backend/incidente.md` (caiu no domingo à noite, e quem soube primeiro foi o dono)
- **Saída:** o projeto em `sistemas/<nome>/` e as decisões em `sistemas/<nome>/DECISOES.md`

---

## Workflow

### Passo 1 — Descobrir o tamanho real do problema

Antes de escolher qualquer tecnologia, três perguntas. Elas decidem quase tudo:

> 1. "Quantas pessoas vão usar isso ao mesmo tempo — dez, mil ou cem mil?"
> 2. "O que não pode dar errado de jeito nenhum?" (cobrar duas vezes, perder pedido, vazar dado de cliente)
> 3. "Quem vai mexer nisso daqui a um ano?"

A terceira é a que mais se esquece e a que mais custa. Sistema que só o autor entende
vira refém. Se a resposta for "ninguém, sou só eu", isso é um argumento a favor do
simples, não a favor do esperto.

**Escala pequena é o caso normal, não a exceção.** A maioria dos sistemas de pequeno
negócio roda folgada num servidor só, com um banco só. Microserviço, fila e cache
distribuído entram quando o número aparece, não por precaução.

**Pedido sem tamanho não começa aqui.** "Quero um sistema pra controlar meus pedidos" vai antes
pro `/escopo`, que corta até a fatia que já resolve e grava as três respostas em `ESCOPO.md`.

### Passo 2 — Escolher a stack e registrar por quê

Consultar `templates/backend/stack.md`. O padrão seguro, quando não há motivo forte
pra outra coisa:

| Peça | Padrão | Troca quando |
|---|---|---|
| Linguagem | Node.js + TypeScript | precisa de dado/IA (Python), de concorrência alta (Go) |
| Banco | PostgreSQL | o dado não tem forma fixa (documento) — e mesmo aí, o Postgres tem JSONB |
| Cache | nenhum, no começo | uma consulta medida está lenta e o dado muda pouco |
| Fila | nenhuma, no começo | tem tarefa que demora e trava a resposta (e-mail, PDF, importação) |
| Hospedagem | a mais boba que atenda | o custo ou o limite dela apertar |

Escrever a escolha e o motivo em `DECISOES.md`, com data. Uma linha por decisão. É o
arquivo que responde "por que isso está assim?" seis meses depois: inclusive pra você.

### Passo 3 — Desenhar os dados antes do código

Erro de modelagem é o mais caro que existe, quando aparece, já tem dado dentro.

Consultar `templates/backend/dados.md`. O mínimo:

- Uma tabela por entidade real do negócio (cliente, pedido, item do pedido)
- Chave estrangeira de verdade, não "o campo id que combina"
- Tipo certo: dinheiro em inteiro de centavos ou `numeric`, **nunca** em ponto flutuante
- Data com fuso (`timestamptz`), porque cedo ou tarde alguém acessa de outro estado
- `criado_em` e `atualizado_em` em tudo — custa dois campos e resolve metade das investigações futuras
- Índice nas colunas que aparecem em `WHERE` e `ORDER BY`

Mostrar o desenho das tabelas ao usuário em português antes de criar. "Cada pedido tem
vários itens; cada item aponta pra um produto": se ele disser "não é bem assim", você
descobriu de graça.

Tabela bem desenhada ainda soma errado. Os defeitos de consulta que não geram erro nenhum, só
total torto no fechamento do mês, estão em `templates/backend/consultas.md`.

### Passo 4 — Desenhar a API

Consultar `templates/backend/api.md`. Resumo do que não muda:

- Endereço é substantivo no plural: `GET /api/v1/pedidos/123`. Verbo é o método HTTP, não a URL
- Status HTTP com significado: 201 criou, 400 entrada inválida, 401 não identificado, 403 identificado mas sem direito, 404 não existe, 409 conflito, 429 excedeu o limite
- Formato de erro **igual em todos os endpoints**, com código, mensagem e o campo que falhou
- Listagem sempre paginada e com teto. Endpoint sem `LIMIT` é um incidente esperando o dia em que a tabela cresce
- Versão na URL desde o primeiro dia (`/v1/`). Custa nada agora e evita quebrar o app de alguém depois

REST resolve praticamente todo caso de pequeno negócio. GraphQL e gRPC entram por
necessidade demonstrada: cada um traz um problema novo junto (consulta cara, cache,
suporte no navegador).

### Passo 5 — Escrever com segurança desde a primeira linha

Segurança não é uma fase no fim. Consultar `templates/backend/seguranca.md`.

O que precisa estar certo **antes** de qualquer coisa ir pro ar:

- **Consulta parametrizada sempre.** Nunca montar SQL concatenando texto do usuário
- **Validação no servidor.** A do navegador é conveniência; qualquer um manda requisição direto
- **Senha com Argon2id.** Nunca em texto puro, nunca com MD5 ou SHA sozinho
- **Segredo só no `.env`**, que é ignorado pelo git. Chave dentro do código é vazamento com data marcada
- **HTTPS.** Sem exceção, nem "por enquanto"
- **Permissão negada por padrão**: libera o que é explicitamente permitido
- **Limite de tentativa no login** — senão a força bruta é só questão de tempo
- **Erro pro usuário não conta detalhe do sistema.** "Falha ao processar" pra ele, stack trace no log
- **Só grava o campo que está na lista branca.** Repassar o formulário inteiro pro banco deixa qualquer um mandar um campo a mais e virar administrador. O ciclo do cadastro inteiro está em `templates/backend/cadastro.md`

Antes de subir, rodar a checagem de dependência (`npm audit`, `pip-audit`), vulnerabilidade
conhecida em biblioteca desatualizada é a porta mais usada e a mais fácil de fechar.

### Passo 6 — Testar o que quebra caro

Consultar `templates/backend/entrega.md`. Não é sobre cobertura bonita: é sobre dormir tranquilo.

Ordem de prioridade quando o tempo é curto:

1. **Fluxo de dinheiro e de dado crítico** — cobrança, cadastro, permissão. Esses merecem teste mesmo que nada mais tenha
2. **Migração de banco** — testar com dado dentro, e testar a volta atrás
3. **Endpoints principais**, com resposta certa e com entrada errada
4. **O defeito que você acabou de consertar** — todo conserto ganha um teste, senão ele volta

Teste que depende de ordem de execução, de relógio ou de internet vai falhar sozinho e
treinar todo mundo a ignorar o resultado. Melhor não existir.

Isso vale pro sistema que nasce agora. Se ele já está no ar sem nenhum teste, o caminho é o
`/testar`, e o critério de quando **não** escrever teste está em `templates/backend/testes.md`.

### Passo 7 — Publicar de um jeito que dá pra voltar atrás

- Variável de ambiente separada por ambiente. Nunca apontar desenvolvimento pro banco de produção
- **Backup automático testado.** Backup que nunca foi restaurado não é backup — é esperança. Restaurar uma vez, de verdade, e anotar quanto tempo levou
- Endpoint `/health` que responde se o banco está de pé
- Publicação que dá pra reverter em minutos: guardar a versão anterior e saber o comando da volta
- Migração de banco roda **antes** do código novo, e precisa funcionar com o código velho ainda no ar
- **A volta atrás tem duas metades:** a do código, com um commit por intenção e etiqueta a cada publicação (`templates/backend/versoes.md`), e a da madrugada em que já caiu, quando estancar vem antes de investigar (`templates/backend/incidente.md`)

### Passo 8 — Saber o que está acontecendo

Sistema no ar sem log é caixa preta. O mínimo que resolve a maior parte dos casos:

- Log estruturado (JSON) com contexto: quem, o quê, quando, quanto demorou
- Nunca logar senha, token, cartão ou CPF de terceiro
- Erro com stack trace num lugar que você consegue procurar
- Um alerta que chega em você quando a taxa de erro sobe — e-mail já serve

---

## Medir, nunca supor (obrigatório)

O ContexOS não estima número, calcula. Em backend a regra é a mesma, com outros comandos:
desempenho não se avalia lendo o código.

```bash
# A consulta está lenta mesmo? Onde?
EXPLAIN ANALYZE <a consulta>;        -- "Seq Scan" numa tabela grande = falta índice

# Quanto tempo o endpoint leva de verdade
curl -s -o /dev/null -w "%{time_total}s\n" http://localhost:3000/api/v1/pedidos

# Quantas consultas uma requisição dispara (N+1 aparece aqui)
# ligar o log de SQL do ORM e contar as linhas de uma única requisição

# Dependência com falha conhecida
npm audit          # ou: pip-audit

# Os testes passam?
npm test
```

**Regra:** antes de otimizar, medir. Depois de otimizar, medir de novo e comparar. Otimização
sem número antes e depois é chute com trabalho junto, e costuma piorar a legibilidade em
troca de nada.

O `scripts/verificar.js` do ContexOS cobre peça e número (CSV, tabela, data, contraste, HTML,
peso). Backend se verifica rodando: teste, `EXPLAIN`, `curl`, `audit`.

---

## Quando o pedido é "está dando erro"

Aí o fluxo é outro: consultar `templates/backend/debug.md` e seguir a ordem:

1. **Ler a mensagem de erro inteira.** Ela quase sempre diz onde é
2. **Reproduzir.** Depurar sem reproduzir é adivinhar
3. **Isolar** — cortar o problema no meio até sobrar a parte que falha
4. **Conferir a suposição.** "Isso deveria funcionar" não é diagnóstico
5. **Consertar, e escrever o teste** que pega esse defeito
6. **Anotar em `DECISOES.md`** se a causa foi estrutural

Se o número errado entrou por planilha ou por arquivo de terceiro, o defeito é da carga: `templates/backend/importacao.md`.

Nunca mudar várias coisas de uma vez pra ver se melhora: se melhorar, ninguém sabe o motivo,
e o defeito volta na próxima.

---

## Regras

- **Simples primeiro.** Um servidor, um banco, um deploy. Dividir em serviço separado quando houver um problema real que isso resolva — e o custo é operação em dobro
- **Nunca inventar número de desempenho.** Se não mediu, dizer que não mediu. Ordem de grandeza de blog não vale como dado do sistema do usuário
- **Migração de banco é irreversível na prática.** Antes de rodar em produção: backup feito, teste com dado real, e volta atrás escrita. Confirmar com o usuário na mesma conversa
- **Dado de cliente é do cliente.** Não copiar base de produção pra máquina de desenvolvimento sem anonimizar; não mandar dado real pra ferramenta externa sem autorização explícita (LGPD)
- **Apagar dado nunca é `DELETE` direto** em tabela que o negócio depende. Marcar como removido e esconder — recuperação vira um `UPDATE`, não um chamado de suporte com backup
- **Código que o usuário vai manter sozinho é escrito pra ser lido**, não pra impressionar. Nome que explica, função curta, sem esperteza
- **Toda dependência nova é um compromisso.** Antes de instalar biblioteca: ela é mantida? resolve algo que dá trabalho de verdade? Trinta linhas próprias costumam custar menos que uma dependência abandonada
- **Quem contrata quase nunca é quem usa.** O dono descreve o sistema pela rotina dele; quem digita o dia inteiro é o balconista ou a recepcionista. Falar uma vez com essa pessoa antes de modelar faz parte da entrega, não é extra: sistema entregue certo e usado errado nasce aí
- Explicar a decisão técnica em português pro usuário. Ele decide o que aceita — o custo de manter é dele
