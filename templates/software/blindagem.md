# Blindagem — banco aberto e chave exposta

Referência da skill `/blindar`. O que o dono precisa entender pra ler o laudo, o catálogo dos
achados que os scripts produzem (com o nome oficial de cada um, o rótulo OWASP e o conserto), e
como interpretar o teste ao vivo. O workflow fica na skill; aqui é só o conhecimento.

> **O que não está aqui.** Cabeçalho HTTP, CORS, senha, sessão, limite de requisição e a lista
> das dez falhas do OWASP moram em `templates/backend/seguranca.md`. Chave dentro do repositório
> é o `verificar.js segredo`, chamado pelo `/revisar-codigo`. Esta página cobre só duas
> perguntas: alguém sem login lê ou escreve no banco? E alguma chave de servidor foi parar no
> navegador?

---

## Por que essas duas perguntas

Entre 12 e 14 de agosto de 2026 a Reeve varreu 30.998 apps feitos com IA que estavam no ar, e
publicou o resultado em 19 de agosto. Dos que usavam Supabase e responderam, 57% (2.096 de
3.680) deixavam ler tabela sem login; 1.332 (1 em 23 do total) levavam algum segredo no pacote
público ou na configuração; 394 expunham tabela com nome de gente (`users`, `customers`,
`members`, `patients`); 13% publicavam source map, o código original inteiro. Fonte:
https://vibe-eval.com/updates/vibe-coding-security-monthly-aug-2026/ (conferido em 2026-09-23).

Nenhum desses apps deu erro. O teste passava, o cliente usava, e o banco estava aberto.

## Como o banco fica aberto (o mecanismo, em uma página)

No Supabase, e em qualquer Postgres exposto por PostgREST, o navegador fala direto com o banco.
A URL `https://<projeto>.supabase.co/rest/v1/<tabela>` é pública, e a chave `anon` (ou
`sb_publishable_`) que vai no front é pública de propósito. O que impede um estranho de ler tudo
não é a chave: é o **RLS** (Row Level Security), a regra por linha que diz quem vê o quê.

Três fatos que explicam quase todo laudo:

1. **Tabela nova no `public` já nasce com permissão pra `anon`.** O papel anônimo recebe GRANT em
   tudo que entra no schema exposto. Sem RLS, esse GRANT vale inteiro: leitura, escrita, exclusão.
   Fonte: https://supabase.com/docs/guides/database/postgres/row-level-security (2026-09-23)
2. **RLS ligado sem política fecha a tabela.** O app quebra em silêncio (lista vazia, sem erro).
   Por isso muita gente "resolve" com `using (true)`, que abre de novo, agora com cara de protegido
3. **A chave `service_role` / `sb_secret_` ignora todo RLS.** "A secret key bypasses every Row
   Level Security policy you have. Never put one in a browser, a shipped application, or source
   control." Fonte: https://supabase.com/docs/guides/api/api-keys (2026-09-23)

O bundler (Vite, Next, Expo) embute no JavaScript qualquer variável com prefixo público
(`VITE_`, `NEXT_PUBLIC_`, `EXPO_PUBLIC_`, `REACT_APP_`). Chave secreta com esse prefixo vai pro
navegador junto com o resto. É assim que o item 3 acontece sem ninguém "colar a chave no código".

## Glossário pro dono

| Termo | O que é, sem jargão |
|---|---|
| RLS | a regra que filtra linha por linha: "só o dono vê o pedido dele" |
| política (policy) | uma regra do RLS: pra quem vale (`to`), pra qual ação (`for`), com que condição (`using` / `with check`) |
| `using` | condição pra **ler** (e pra escolher qual linha pode ser alterada ou apagada) |
| `with check` | condição pra **gravar**: impede inserir linha com o `user_id` de outra pessoa |
| `anon` | quem chega sem login; `authenticated` é quem entrou |
| chave anon / publishable | a chave do front; pode ser pública, porque o RLS segura |
| chave service_role / secret | a chave do servidor; pula o RLS; nunca no front |
| `security definer` | função que roda com poder de dona do banco, ignorando o RLS |
| source map | arquivo `.map` que reconstrói o código original a partir do bundle |

## Catálogo dos achados

Cada linha é o que o `scripts/auditar-rls.js` ou o `scripts/vazamento.js` produz. "Lint" é o nome
que o próprio painel do Supabase usa no Security Advisor (https://supabase.com/docs/guides/database/database-advisors,
2026-09-23), pra quem quiser conferir lá. O rótulo OWASP é o da lista 2025
(https://top10.owasp.org/2025, 2026-09-23): serve pra nomear a categoria, não pra medir gravidade.

### Banco (auditar-rls.js)

| Código | Achado | Nível | Lint do Supabase | OWASP | Conserto |
|---|---|---|---|---|---|
| RLS-01 | tabela no `public` sem RLS | CRÍTICO | 0013_rls_disabled_in_public | A01 | `enable row level security` + política de dono |
| RLS-02 | política escrita, RLS desligado | CRÍTICO | 0007_policy_exists_rls_disabled | A01 | ligar o RLS; as políticas passam a valer |
| RLS-03 | RLS ligado, nenhuma política | AVISO | 0008_rls_enabled_no_policy | A02 | não vaza; o app é que não funciona. Escrever a política |
| RLS-04 | `using (true)` ou `with check (true)` em escrita (`insert`, `update`, `delete`, `all`) | CRÍTICO | 0024_permissive_rls_policy | A01 | trocar por condição de dono, com `to authenticated` |
| RLS-04 | `for select using (true)` | CRÍTICO em tabela de dado pessoal; ALTO se a tabela foi declarada pública mas tem coluna de dentro de casa; AVISO em tabela pública mesmo | — (o painel não acusa: o lint exclui leitura de propósito) | A01 | decidir: view só com as colunas públicas, ou condição de quem pode ver |
| RLS-05 | escrita sem `with check` que olhe o usuário | ALTO (insert) / MÉDIO (update) | — (o painel não acusa: 0024 só pega condição literalmente verdadeira) | A01 | `with check ((select auth.uid()) = user_id)` |
| RLS-06 | política sem `to`: roda pra `anon` também | AVISO | — | A02 | `to authenticated` |
| RLS-07 | política decide por `user_metadata` | ALTO | 0015_rls_references_user_metadata | A01 | papel em `app_metadata` ou tabela própria |
| RLS-08 | sem `force row level security` | AVISO | — | A02 | só pesa pra função que roda como dona |
| FN-01 | `security definer` que `anon` chama pela rota `rest/v1/rpc` | ALTO | 0028_anon_security_definer_function_executable | A01 | `revoke execute ... from anon, public` |
| FN-02 | `security definer` sem `set search_path` | ALTO | 0011_function_search_path_mutable | A02 | `alter function ... set search_path = ''` |
| FN-03 | `security definer` revogada do `anon`, mas que qualquer usuário logado chama | MÉDIO | 0029_authenticated_security_definer_function_executable | A01 | `revoke execute ... from authenticated`, e chamar do servidor |
| VW-01 | view que lê `auth.users` | CRÍTICO | 0002_auth_users_exposed | A01 | `revoke` da API e repensar a view |
| VW-02 | view no `public` sem `security_invoker` | ALTO | 0010_security_definer_view | A01 | `alter view ... set (security_invoker = true)` |

### Chave (vazamento.js)

| Achado | Nível | OWASP | Conserto |
|---|---|---|---|
| `service_role` ou `sb_secret_` no bundle ou no ar | CRÍTICO | A07 (CWE-798, credencial embutida) | **trocar a chave** no painel, tirar do front, mover a operação pra Edge Function ou servidor |
| `sk-` (OpenAI/Anthropic), `sk_live_` (Stripe), `AKIA` (AWS), token do GitHub, string de conexão com senha | CRÍTICO | A07 | trocar a chave no fornecedor; chamar o serviço a partir do servidor |
| variável secreta com prefixo público (`VITE_..._SERVICE_ROLE`) | ALTO | A07 | renomear sem o prefixo e usar só no servidor |
| chave `AIza` do Google | AVISO | A02 | restringir por domínio no console do Google |
| source map público | AVISO (ALTO se o código tem lógica de preço ou segredo) | A02 | `sourcemap: false` no build de produção, ou não publicar os `.map` |
| chave `anon` / `sb_publishable_` / `pk_live_` | OK | — | é o esperado no front |

A categoria A07:2025 (Authentication Failures) inclui CWE-798, "Use of Hard-coded Credentials":
https://top10.owasp.org/2025/A07_2025-Authentication_Failures/ (2026-09-23).

## A política que fecha quase tudo

O molde que o script escreve na migration, e que resolve a maior parte dos casos: a linha tem uma
coluna que aponta pro dono, e só o dono lê e escreve.

```sql
alter table public.pedidos enable row level security;

create policy "pedidos: dono le"     on public.pedidos for select to authenticated using ((select auth.uid()) = user_id);
create policy "pedidos: dono insere" on public.pedidos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "pedidos: dono altera" on public.pedidos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "pedidos: dono apaga"  on public.pedidos for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists pedidos_user_id_idx on public.pedidos (user_id);
```

Três detalhes que não são estilo:

- `(select auth.uid())` em vez de `auth.uid()`: o Postgres calcula uma vez por consulta, não uma
  vez por linha. Em tabela grande é a diferença entre 50 ms e 5 s. Fonte:
  https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations
- `to authenticated`: sem isso a política roda pra `anon` também. Não vaza (a `auth.uid()` do
  anônimo é nula), mas a intenção fica implícita e o Supabase recomenda nomear o papel
- o índice na coluna do dono: o RLS filtra por ela em toda consulta

Quando a tabela é de time ou empresa (várias pessoas veem as mesmas linhas), a condição vira
`tenant_id in (select empresa_id from public.membros where user_id = (select auth.uid()))`, e o
`with check` repete a mesma coisa. Se o app tem papel de administrador, ele mora em `app_metadata`
(que só o servidor escreve) ou numa tabela `admins`, nunca em `user_metadata` (que o próprio
usuário edita pela API de auth).

Tabela pública de verdade (cardápio, catálogo, FAQ) pode ter `for select to anon, authenticated
using (true)`. O que não pode é ter coluna de custo, margem, estoque interno ou telefone junto.
O `auditar-rls.js` confere isso pelo nome das colunas do `CREATE TABLE` e diz qual delas
atrapalha, porque o caminho de saída depende do caso: às vezes a coluna sai pra outra tabela,
às vezes o front passa a ler uma view com as colunas públicas só.

## O teste ao vivo: como ler o resultado

O `auditar-rls.js --url --chave` faz o que um estranho faria: pega a chave pública do front e
chama a API sem login. Leitura é `GET /rest/v1/<tabela>?select=*&limit=1`. Escrita (só com
`--escrever`) é `POST` com corpo `{}` e o cabeçalho `Prefer: tx=rollback`, que pede pro servidor
desfazer. O `db-tx-end` do PostgREST aceita quatro valores: `commit` (o padrão),
`commit-allow-override`, `rollback` e `rollback-allow-override`. Só os dois com
`allow-override` deixam o cabeçalho do cliente mandar. Ou seja: na configuração padrão o pedido
de rollback é ignorado e a linha grava. Fonte:
https://docs.postgrest.org/en/latest/references/configuration.html#db-tx-end (2026-09-23).

| Resposta | O que significa | No laudo |
|---|---|---|
| leitura `200` com linha | qualquer pessoa lê a tabela | CRÍTICO (AVISO se a tabela é pública de propósito) |
| leitura `200` com `[]` | nada visível: tabela vazia ou política filtrou tudo | cruzar com o estático: sem RLS + vazia = aberta, só sem dado ainda |
| leitura `401`/`403` com código `42501` | bloqueada: sem GRANT ou sem política pra anon | protegida |
| leitura `404` (`PGRST205`) | não existe ou não está no schema exposto | fora da API |
| escrita `201` | inseriu uma linha vazia | CRÍTICO; o script tenta apagar pelo `id` |
| escrita `400` com `23502` / `23503` / `23514` | passou pela política e parou numa regra da tabela (campo obrigatório, chave estrangeira) | ALTO: com um payload completo, grava |
| escrita `401`/`403` com `42501` | a política barrou | protegida |

O código `42501` é o do Postgres pra "permission denied" e pra "new row violates row-level
security policy"; é ele que separa "protegida" de "vazia".

## Se vazou dado pessoal: o prazo

Tabela com dado pessoal que responde pra chave pública é incidente em potencial, e incidente tem
prazo. Os números, pra consultar sem procurar de novo:

| Quem | Prazo pra comunicar à ANPD e ao titular | Onde está |
|---|---|---|
| Controlador em geral | 3 dias úteis do conhecimento de que o incidente atingiu dado pessoal | Resolução CD/ANPD nº 15/2024 |
| Agente de tratamento de pequeno porte | prazo em dobro: 6 dias úteis | Resolução CD/ANPD nº 2/2022, art. 14, II |
| Pequeno porte que faz tratamento de alto risco | volta pros 3 dias: não entra no regime diferenciado | Resolução CD/ANPD nº 2/2022, art. 3º, I (alto risco no art. 4º) |
| Qualquer um | complementar a informação em até 20 dias úteis da comunicação | Resolução CD/ANPD nº 15/2024 |

A obrigação de comunicar vem do art. 48 da Lei 13.709/2018 (LGPD) e vale pro incidente que
"possa acarretar risco ou dano relevante aos titulares". Se esse risco existe no caso concreto é
avaliação com advogado; o laudo entrega os fatos, as colunas e a data da descoberta. Contar o dia
útil é com o `scripts/br.js`, que sabe os feriados nacionais. Fontes:
https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
e https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
(as duas conferidas em 2026-09-23).

## O que exigir de quem vai consertar

Se quem aplica a migration é um freelancer ou a própria pessoa que construiu, a entrega só fecha
com prova, igual ao `/revisar-codigo`:

- [ ] o `auditar-rls.js` roda de novo e não acusa CRÍTICO
- [ ] o teste ao vivo com a chave pública devolve `42501` nas tabelas de dado pessoal
- [ ] a chave que vazou foi **trocada** no painel do fornecedor, não só apagada do código: chave
      publicada continua válida até ser revogada, e já pode ter sido copiada
- [ ] o `vazamento.js --url` roda contra o app publicado e não acha chave secreta nem `.map`
- [ ] o Security Advisor do painel do Supabase não mostra erro nas categorias do laudo

Quem paga o conserto decide a ordem. O laudo entrega a lista; a decisão de fechar tabela pública
de propósito, ou de aceitar um source map no ar, é do dono, registrada em `DECISOES.md`.

## Fontes

- Reeve / Vibe-Eval, "Vibe coding security monthly", agosto de 2026: https://vibe-eval.com/updates/vibe-coding-security-monthly-aug-2026/
- Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, API keys: https://supabase.com/docs/guides/api/api-keys
- Supabase, Database advisors (lints): https://supabase.com/docs/guides/database/database-advisors
- ekhorkov/rls-audit, consultas de auditoria em `pg_policies` e `pg_class`, base dos códigos RLS-01 a RLS-07: https://github.com/ekhorkov/rls-audit
- supabase/agent-skills, `security-rls-basics.md` e `security-rls-performance.md`: https://github.com/supabase/agent-skills
- OWASP Top 10:2025: https://top10.owasp.org/2025
- PostgREST, `db-tx-end` e `Prefer: tx=rollback`: https://docs.postgrest.org/en/latest/references/configuration.html
- supabase/splinter, o SQL dos lints numerados que o Security Advisor roda: https://github.com/supabase/splinter
- LGPD, Lei 13.709/2018, art. 48: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD, comunicação de incidente e regime de pequeno porte: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis

Tudo conferido em 2026-09-23. Número de app varrido e porcentagem mudam todo mês; o
mecanismo, não.
