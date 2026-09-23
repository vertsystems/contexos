---
name: blindar
description: >
  Confere se o banco de um sistema está aberto e se alguma chave secreta foi parar no navegador:
  lê as migrations (tabela sem RLS, política que libera tudo, escrita sem WITH CHECK, função
  SECURITY DEFINER), varre o bundle e os source maps atrás de service_role e token, e, se o app
  está no ar, prova com a chave pública o que um estranho consegue ler e gravar. Sai um laudo com
  comando e resposta, a migration de correção pronta e o diff do que muda.
  Use quando o usuário disser "meu banco tá aberto?", "qualquer um consegue ver os dados dos meus
  clientes?", "o Supabase avisou que falta RLS", "a chave do banco tá no site?", "fiz o app com IA e
  quero saber se é seguro", "tem como alguém apagar minha tabela?", "vazou uma chave, e agora",
  "o Security Advisor tá vermelho", "blinda meu sistema antes de eu divulgar", ou /blindar.
---

# /blindar — Banco aberto e chave exposta

> **Convenção de pastas:** o laudo vai em `sistemas/<nome>/blindagem-AAAA-MM-DD.md`, com a migration ao lado em `sistemas/<nome>/AAAAMMDD-blindagem.sql`. O `.sql` começa pela data de propósito: é o formato que o `verificar.js migracao` lê e o que a pasta de migrations do projeto espera. Na convenção **por cliente**, `clientes/<Nome>/sistemas/<nome>/`. A pasta nasce com o primeiro laudo, nunca antes. A migration só entra na pasta de migrations do projeto quando o dono mandar aplicar.

O app funciona, o cliente usa, o teste passa. E a tabela `clientes` está aberta pra qualquer
pessoa que abrir o "ver código-fonte", copiar a chave pública e mandar um `GET`. Em agosto de
2026, 57% dos apps com Supabase varridos no ar deixavam ler tabela sem login, e 1 em 23 levava
algum segredo no pacote publicado (`templates/software/blindagem.md`, com a fonte). Nada disso dá
erro. A skill faz o que o estranho faria, escreve o que achou com a prova, e entrega o conserto
pronto pra aplicar.

## Dependências

- **Contexto:** `_memoria/empresa.md` — o que o sistema guarda (CPF? prontuário? pedido?), quantas pessoas usam, quem mantém
- **Prioridades:** `_memoria/estrategia.md` — lançamento marcado muda a ordem, não o conteúdo
- **Referência:** `templates/software/blindagem.md` — o mecanismo em uma página, o glossário pro dono, o catálogo dos achados com nível, nome oficial no painel do Supabase, rótulo OWASP e conserto, e a tabela de leitura do teste ao vivo
- **Cabeçalho, senha, sessão, CORS:** `templates/backend/seguranca.md`. Não é assunto desta skill; entra no laudo só como "não olhado"
- **Scripts:** `scripts/auditar-rls.js` (migrations → achados, migration de correção, teste ao vivo por fetch) e `scripts/vazamento.js` (bundle, source map e app no ar → chave exposta)
- **Conferência:** `node scripts/verificar.js migracao` na migration gerada e `node scripts/verificar.js texto` no laudo
- **Data e dia útil:** `scripts/br.js` — o prazo legal do Passo 8 se conta em dias úteis, com feriado nacional; nunca contar no dedo
- **Saída:** `sistemas/<nome>/blindagem-AAAA-MM-DD.md` (o laudo) e `sistemas/<nome>/AAAAMMDD-blindagem.sql` (a migration)

---

## Workflow

### Passo 1 — Dizer o que vai fazer, e não mexer em nada

Antes de abrir o primeiro arquivo, uma frase:

> "Vou ler as migrations e o front, rodar duas varreduras e, se o app estiver no ar, testar com a chave pública o que um estranho consegue ver. Não altero nenhum arquivo do sistema; entrego o laudo e a migration pra você decidir."

Não é cerimônia. Se a auditoria já sai consertando, some a foto do estado em que o sistema
chegou, e o dono perde a chance de escolher o que aceita. Alteração só quando ele mandar, item
por item.

### Passo 2 — Levantar o que precisa, numa mensagem só

> 1. "Onde está a pasta do sistema? (a que tem `supabase/migrations`, `prisma/migrations` ou um `schema.sql`)"
> 2. "O app está no ar? Se sim, qual a URL, e qual a chave pública (a `anon` ou `sb_publishable_`, em Settings → API no painel do Supabase). Só a pública: a `service_role` não entra nesta conversa"
> 3. "Alguma tabela é pública de propósito? Cardápio, catálogo, FAQ, tabela de preço"
> 4. "O que tem de dado pessoal aí dentro? Nome e telefone, CPF, saúde, pagamento"

A resposta 4 muda o laudo inteiro: tabela `agendamentos` aberta numa clínica é dado de saúde,
e dado de saúde aberto é incidente com prazo legal (Passo 8). Se ele não sabe a chave, o Passo 4
acha no bundle. Se não tem o código, só a URL, dá pra fazer o teste ao vivo e a varredura do ar:
o laudo diz que o estático não foi olhado.

Se a chave que ele colar começar com `sb_secret_` ou decodificar como `service_role`, parar e
avisar: essa chave acabou de passar por um chat, e o conserto é trocar no painel agora. O
script se recusa a usar ela de qualquer jeito.

### Passo 3 — Auditar o banco por comando

```bash
# lê as migrations na ordem em que o banco aplica, e escreve a migration de correção
node scripts/auditar-rls.js <pasta-do-sistema> \
  --publico produtos,categorias \
  --migration sistemas/<nome>/AAAAMMDD-blindagem.sql \
  --saida sistemas/<nome>/blindagem-AAAA-MM-DD.json
```

Em Postgres que não é Supabase (Neon, RDS, Railway com API própria), acrescentar
`--plataforma postgres`: lá tabela sem `GRANT` pro papel anônimo não está aberta pra
qualquer um, e o achado desce de CRÍTICO pra MÉDIO em vez de assustar à toa.

O script aplica cada instrução como o Postgres aplicaria (um `disable row level security` na
migration 14 desfaz o `enable` da migration 3) e acusa, com arquivo e linha: tabela sem RLS,
política escrita com RLS desligado, `using (true)` e `with check (true)`, escrita sem `with
check` que olhe o usuário, política decidida por `user_metadata`, função `security definer`
que o `anon` chama pela rota `rest/v1/rpc` ou sem `search_path`, view que pula o RLS ou lê `auth.users`.
Cada achado sai com o nível, o nome do lint no painel do Supabase e o rótulo OWASP; o catálogo
está em `templates/software/blindagem.md`. Parte dos achados sai **sem** nome de lint, e isso é
informação: o `0024_permissive_rls_policy` não acusa `for select using (true)` (o próprio lint
exclui leitura liberada, que às vezes é intencional) nem `update` sem `with check`. Quando o
campo vem vazio, o laudo escreve "o painel não acusa este": é o que justifica a auditoria
existir além do Security Advisor.

O script sai com código 2 quando achou CRÍTICO ou tabela aberta no teste ao vivo, e 0 quando
não achou nada grave. Vale pra conferir o conserto depois: se a segunda rodada sai 0, a prova é
o código de saída, não a impressão de quem olhou.

Colar a saída inteira no laudo, inclusive o que passou. "6 tabelas, todas com RLS e política de
dono" é resultado, e o dono precisa ver. Se o script diz que não achou `CREATE TABLE` (schema
só no ORM), gerar o SQL primeiro com o comando que ele sugere e rodar de novo.

Quando o dono declarou uma tabela como pública (`--publico produtos`), o script confere as
colunas dela e diz o nome da que não é pra cliente ver: `custo`, `margem`, `estoque`, `telefone`,
`cpf`. Aí o achado sobe pra ALTO com a coluna no título, porque "catálogo público" com preço de
custo dentro é a margem do negócio na mão do concorrente.

Abrir a migration gerada e ler. O que tem coluna de dono reconhecível (`user_id`, `owner_id`,
`tenant_id`, `criado_por`) sai com as quatro políticas prontas; o que não tem sai comentado com
`[a confirmar]`, junto com o `drop policy`, que também sai comentado de propósito: derrubar a
política antiga sem ter a nova pronta fecha a tabela e o app para. É aí que a conversa com o dono decide:
quem pode ler essa tabela?

### Passo 4 — Procurar chave no que vai pro navegador

```bash
# pasta do build (dist/, .next/, out/) + front + .env.example
node scripts/vazamento.js <pasta-do-sistema> --saida sistemas/<nome>/vazamento-AAAA-MM-DD.json

# o app publicado: baixa a página, cada script e o .map de cada script
node scripts/vazamento.js --url https://app.do.cliente.com.br
```

O primeiro comando responde "a chave está no que eu construí?"; o segundo, "está no que está
no ar?". As duas perguntas têm resposta diferente com frequência: build velho publicado, ou
variável de ambiente que só existe no painel da Vercel. Rodar os dois quando houver URL.

O script separa o que é esperado (chave `anon`, `sb_publishable_`, `pk_live_` do Stripe) do que
é vazamento (`service_role`, `sb_secret_`, `sk-`, `sk_live_`, `AKIA`, token do GitHub, string de
conexão com senha), e acusa variável com prefixo público e nome de segredo
(`VITE_SUPABASE_SERVICE_ROLE_KEY`), que é como a chave chega ao navegador sem ninguém ter colado
ela no código. Se achar a URL do Supabase no bundle, ela sai no fim: é a que o Passo 5 usa.

Chave secreta no bundle é o achado mais urgente do laudo, acima de qualquer tabela aberta, e o
conserto tem uma ordem: **trocar a chave no painel do fornecedor primeiro**, tirar do front
depois. Apagar do código não revoga nada; quem copiou continua com ela.

O laudo copia o que apareceu no terminal, onde a chave vem cortada (`sk_live_…tUv`). O JSON do
`--saida` guarda o valor inteiro de propósito, pra ele saber qual das três chaves trocar; esse
arquivo fica na pasta e não entra no texto que vai por e-mail nem no chat. Depois que a chave
for trocada, ela não vale mais nada e o JSON pode ficar onde está.

### Passo 5 — Provar ao vivo (opcional, e só com a chave pública)

Se tem URL e chave pública:

```bash
# leitura anônima em cada tabela que o SQL conhece (ou --tabelas a,b,c)
node scripts/auditar-rls.js <pasta-do-sistema> \
  --url https://xxxxxxxx.supabase.co --chave "<chave anon>" \
  --saida sistemas/<nome>/blindagem-AAAA-MM-DD.json
```

O script pergunta à API o que ela lista pra essa chave, e faz `GET ...?select=*&limit=1` em cada
tabela. `200` com linha é tabela aberta; `200` com `[]` é "nada visível" (vazia, ou a política
filtrou tudo); `401`/`403` com código `42501` é protegida; `404` está fora da API. A tabela de
leitura completa está no molde.

A sondagem de escrita é opt-in:

```bash
node scripts/auditar-rls.js <pasta-do-sistema> \
  --url https://xxxxxxxx.supabase.co --chave "<chave anon>" --escrever \
  --tabelas pedidos,mensagens \
  --saida sistemas/<nome>/blindagem-AAAA-MM-DD.json
```

Ela manda um `POST` com corpo `{}` e o cabeçalho `Prefer: tx=rollback`, que pede pro servidor
desfazer. O padrão do PostgREST é `db-tx-end = commit`, que **ignora** esse pedido; a não ser que
alguém tenha mudado isso no projeto, contar que a linha grava. Então a pergunta pro dono é essa,
com essas palavras: "posso tentar gravar uma linha de teste? Se a tabela estiver aberta, ela
grava, e eu tento apagar em seguida pelo `id`". Rodar só com o sim, de preferência em tabela que
ele indicar (`--tabelas`), e nunca em tabela de pagamento ou de prontuário. Se gravar, o script
tenta apagar e diz o que conseguiu; se não conseguiu, o laudo traz o `id` pro dono apagar à mão.

A linha devolvida pode ter CPF, telefone, e-mail. O script guarda só os nomes das colunas e o
`id` (que a limpeza precisa), e é isso que vai pro JSON e pro laudo; valor, se for citado no
texto, vira `[dado]`.

### Passo 6 — Cruzar as três fontes

Achado só vale com a prova, e as três fontes se corrigem:

| Estático diz | Ao vivo diz | Conclusão |
|---|---|---|
| sem RLS | `200` com linha | aberta, confirmado |
| sem RLS | `200` com `[]` | aberta, ainda sem dado |
| sem RLS | `42501` | alguém revogou o GRANT fora das migrations; anotar como "protegida por fora, não versionada" |
| RLS com política de dono | `200` com linha | a migration do repositório não é o que está no ar; achado próprio |
| `using (true)` em tabela pública | `200` com linha | o script lista as colunas expostas; se aparecer `custo`, `margem`, `estoque` ou telefone, não é pública |

Divergência entre o SQL e o ar é achado, não ruído: significa que o banco foi mexido pelo
painel e o repositório mente.

### Passo 7 — Escrever o laudo

```markdown
# Blindagem — <nome do sistema> — <AAAA-MM-DD>

> O que foi olhado: <N> migrations em <pasta>, o build em <pasta>, o app em <URL>.
> O que não foi: cabeçalho HTTP, senha, sessão, storage, edge functions (ver `templates/backend/seguranca.md`).
> Isto é um laudo técnico, não parecer jurídico. Incidente com dado pessoal passa por advogado.

## Em uma frase
[quantas tabelas abertas, se tem chave de servidor no ar, e o que fazer hoje]

## O que fazer hoje, na ordem
1. [trocar a chave X no painel Y] — <por quê, em uma linha>
2. [aplicar a migration] — <o que ela fecha>
3. ...

## Achados
| # | Nível | O que | Onde | Prova | Conserto |
|---|---|---|---|---|---|
| 1 | CRÍTICO | `clientes` sem RLS: qualquer um lê e escreve | `supabase/migrations/001.sql:2` | `GET /rest/v1/clientes` → 200, 1 linha, colunas id, nome, cpf, telefone | migration, bloco 1 |

## O que foi medido
### auditar-rls.js
[saída colada, inteira]
### vazamento.js
[saída colada, inteira]
### ao vivo
[comando e resposta, com dado pessoal trocado por [dado]]

## A migration
[caminho do AAAAMMDD-blindagem.sql, o conteúdo inteiro, e a lista do que ficou [a confirmar]]

## O diff
[antes e depois de cada política trocada, e o diff do front onde a chave sai]

## Dado pessoal e prazo
[só quando alguma tabela com dado pessoal respondeu 200: quais tabelas, quais colunas, desde
quando, o que não se sabe, e as duas datas do Passo 8. Se não houve, escrever "nenhuma tabela
com dado pessoal respondeu pra chave pública" e seguir]

## Decisões que são suas
- [tabela X é pública de propósito? se sim, ficam as colunas a, b, c]
- [o source map fica no ar? o que ele mostra]

## Depois de aplicar
[os cinco itens de prova de `templates/software/blindagem.md`, seção "O que exigir"]
```

O diff é o que o dono manda pro desenvolvedor. Pra cada política trocada, o `create policy`
antigo e o novo lado a lado; pra chave no front, o trecho com a linha que sai e a que entra
(`createClient(url, import.meta.env.VITE_SUPABASE_ANON_KEY)` no lugar da `SERVICE_ROLE`, e a
operação que precisava dela vira Edge Function ou rota de servidor). Se o front está no
workspace e o dono mandar, aplicar o diff com `Edit`; se não, fica no laudo.

Registrar em `sistemas/<nome>/DECISOES.md` uma linha por decisão do dono ("produtos é pública de
propósito, sem coluna de custo — 2026-09-23"). Se o arquivo não existe, criar com essa linha.

### Passo 8 — Se vazou dado pessoal, dizer isso com o prazo

Tabela com CPF, saúde, pagamento ou endereço que respondeu `200` pra chave pública não é só
achado técnico. A LGPD (Lei 13.709/2018, art. 48) manda o controlador comunicar à ANPD e ao
titular o incidente que possa causar risco ou dano relevante. A Resolução CD/ANPD nº 15/2024
fixa o prazo em **3 dias úteis** contados do conhecimento de que o incidente atingiu dado
pessoal, com comunicação preliminar quando faltar informação e complementação em até 20 dias
úteis. Fonte: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
(conferido em 2026-09-23).

**Pra negócio pequeno o prazo é em dobro: 6 dias úteis.** O agente de tratamento de pequeno
porte (microempresa, empresa de pequeno porte, startup, pessoa natural, entidade sem fins
lucrativos) tem "prazo em dobro" na comunicação de incidente à ANPD e ao titular, pela
Resolução CD/ANPD nº 2/2022, art. 14, II. E a exceção pesa justamente aqui: pelo art. 3º, I,
quem faz **tratamento de alto risco** fica fora desse regime e volta pros 3 dias. Alto risco,
no art. 4º, pede um critério geral (larga escala, ou impacto significativo em direito
fundamental) somado a um específico (dado sensível, dado de criança, decisão automatizada,
vigilância). A agenda de uma clínica com muito paciente cai nos dois. Fonte: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
(conferido em 2026-09-23). Qual dos dois vale é conversa com advogado; o laudo põe as duas datas
na mesa, e contar dia útil é por comando:

```bash
node -e 'const br=require("./scripts/br.js"); const h=new Date();
  console.log("3 dias úteis:", br.fmt(br.maisUteis(h,3)), "· 6 dias úteis:", br.fmt(br.maisUteis(h,6)));'
```

O laudo diz isso numa seção própria, com o que se sabe (quais tabelas, quais colunas, desde
quando a migration está assim) e o que não se sabe (se alguém leu de fato: só o log do
Supabase responde, e o dono pede lá). Se "risco relevante" se aplica é decisão com advogado;
a skill entrega os fatos, as duas datas e o dia em que tudo isso foi descoberto, que é hoje.
Não suavizar, e não decidir por ele: a skill não comunica nada a ninguém.

### Passo 9 — Entregar

Antes de mostrar:

```bash
node scripts/verificar.js migracao sistemas/<nome>/          # a migration tem seção de desfazer
node scripts/verificar.js texto sistemas/<nome>/blindagem-AAAA-MM-DD.md
```

O `migracao` só enxerga arquivo `.sql` que começa por número, e é por isso que a migration se
chama `AAAAMMDD-blindagem.sql`. Se ele reclamar que não achou migração nenhuma, o nome está
errado, não o conteúdo.

A entrega no chat é curta: a frase de resumo, os três primeiros itens do "o que fazer hoje", e
a pergunta "quer que eu aplique a migration na pasta de migrations do projeto?". Aplicar é
copiar o arquivo pra `supabase/migrations/` (ou a pasta que o projeto usa) com o nome na
convenção dele; rodar `supabase db push` ou colar no SQL Editor é o dono quem faz, porque é
produção. Chave que vazou vai pro `tarefas.md` em "Agora": `- [ ] Trocar a service_role do
projeto X no painel do Supabase e publicar o build novo (/blindar)`.

Se o dono pedir pra rodar de novo depois do conserto, o mesmo comando do Passo 3 e do Passo 5,
e o laudo novo nasce com a data nova. O anterior fica: é a prova de antes e depois.

---

## Regras

- **Chave secreta nunca entra no teste.** O script recusa `sb_secret_` e JWT com `role: service_role`. Se o dono colar uma, o achado é esse, e o conserto é trocar no painel agora, antes de qualquer outra coisa
- **Sem prova não há achado.** Cada linha do laudo tem o comando e a resposta, ou o arquivo e a linha. "Parece inseguro" não entra
- **Escrita em produção só com sim explícito.** O pedido de rollback do `--escrever` é ignorado na configuração padrão do PostgREST, então tratar como escrita de verdade: perguntar com a frase do Passo 5, limitar por `--tabelas`, e nunca rodar em tabela de pagamento ou de saúde. Nunca por padrão
- **Chave que vazou se troca, não se apaga.** Apagar do código não revoga. A ordem é: revogar no fornecedor, tirar do front, publicar o build novo, rodar o `vazamento.js --url` de novo
- **O Contex OS entrega arquivo, não publica.** A migration vai pra pasta do projeto quando o dono manda; aplicar no banco (`supabase db push`, SQL Editor) é ele quem faz. Nunca rodar comando que altere o banco de produção
- **A migration nunca derruba política sem ter a próxima pronta.** Quando o script não acha a coluna de dono, o `drop policy` sai comentado junto com o `[a confirmar]`, e os dois se descomentam juntos. Migration que só derruba deixa a tabela fechada, o app quebra na cara do cliente, e a culpa vira do laudo
- **Ligar o RLS sem política fecha a tabela.** A migration sempre traz as políticas junto; o que ficou `[a confirmar]` está comentado e listado no laudo, e a tabela fica fechada até o dono decidir. Avisar isso em voz alta, porque o app para de funcionar pra aquela tabela
- **Tabela pública de propósito é decisão do dono, escrita.** Cardápio e catálogo podem ter `using (true)` de leitura. O laudo lista as colunas dela; se tem custo, margem, estoque interno ou telefone, não é pública
- **Dado pessoal que apareceu no teste não vai pro laudo.** Colunas sim, valores não: trocar por `[dado]`. O JSON de saída fica em `sistemas/<nome>/` e não sai do workspace
- **Chave nenhuma é copiada inteira pro texto.** No laudo, no chat e no diff ela aparece cortada, do jeito que o terminal mostra. A chave inteira só existe no JSON do `--saida`, que serve pro dono identificar qual trocar. Chave colada num laudo que circula por e-mail é o vazamento seguinte
- **LGPD:** tabela aberta com dado pessoal é incidente em potencial, com prazo (Passo 8): 3 dias úteis, 6 se o negócio se enquadra como agente de pequeno porte e não faz tratamento de alto risco. As duas datas saem calculadas pelo `br.js`, nunca contadas no dedo, e com o artigo citado. A skill entrega os fatos e as datas; se comunica ou não, e como, é decisão de advogado. Isto não substitui advogado, e nada é comunicado a ninguém pela skill
- **Artigo e número conferidos nesta entrega, ou `[a confirmar]`.** Prazo da ANPD, nome de lint do Supabase e categoria do OWASP se conferem na fonte oficial com a data, do jeito que estão em `templates/software/blindagem.md`. Lint que o painel não tem, ou artigo trocado, destrói a confiança do laudo inteiro, e o laudo é a peça que o dono manda pro desenvolvedor dele
- **Fronteira com as vizinhas:** o `/revisar-codigo` audita o sistema inteiro em ordem de custo e acha segredo **versionado** e migração fora de ordem; esta skill acha o segredo **publicado** e a tabela **aberta**, que são outras perguntas. O `/backend` desenha a permissão (`templates/backend/seguranca.md`) mas não testa a que está no ar. O `/testar` escreve o teste que impede a política de voltar a abrir. Cabeçalho HTTP, CORS e senha ficam no `/backend`; se o dono perguntar, apontar pra lá e seguir
- **Não repetir o Security Advisor do Supabase.** Se o painel já acusa, o laudo cita o nome do lint e acrescenta o que o painel não faz: a prova ao vivo, a migration pronta e a ordem de conserto
- **Divergência entre repositório e ar é achado.** Se o SQL diz uma coisa e a API responde outra, o banco foi mexido pelo painel; anotar como achado próprio, com a recomendação de trazer o estado real pro repositório (`supabase db pull`)
- **O laudo fala a língua do dono.** "Qualquer pessoa com o link lê a lista de clientes" antes de "tabela sem RLS". O termo entra depois da explicação, e o glossário do molde cobre o resto
