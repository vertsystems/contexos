---
name: salvar
description: >
  Salva o trabalho do Contex OS no GitHub (commit + push). Na primeira vez configura o repositório
  remoto. Use quando o usuário disser "salvar", "salva no github", "commit", "push", "/salvar"
  ou pedir backup do trabalho.
---

# /salvar — Salvar no GitHub

Skill de uma função só: garantir que o trabalho do usuário está no GitHub. Fácil pra quem nunca usou git.

## O que entra no repositório

Tudo que é trabalho dele (memória, marca, conteúdo, propostas, materiais), mais as skills e os templates do sistema. Fica tudo junto, e é isso que permite recuperar o workspace inteiro se a máquina morrer.

**Não entra:** `.env` (chaves), `node_modules/` e a drop zone `dados/`. O `.gitignore` do repositório já cobre.

**Detalhe do primeiro commit:** o clone veio com o endereço do Contex OS. O `/instalar` renomeia esse endereço pra `contexos`, então o `origin` fica livre pro repositório dele. Se ainda existir um `origin` apontando pro repositório do produto, renomear antes de qualquer push:

```bash
git remote rename origin contexos 2>/dev/null
```

**Nunca dar push no repositório do Contex OS.** Se o remote de destino contiver `vertsystems/contexos`, parar e avisar: o trabalho dele iria parar no repositório do produto.

## Checagem de segurança (sempre, antes de qualquer commit)

O workspace guarda chaves de API em `.env`. Antes de comitar:

1. Conferir que `.gitignore` existe e contém `.env`. Se não contiver, adicionar antes de seguir
2. Rodar `git status --porcelain` e conferir se algum arquivo sensível entrou: `.env`, `*.pem`, `*.key`, `credentials.json`, `service-account*.json`
3. Se algum apareceu, **parar** e avisar:
   > "Achei `<arquivo>` pra ser comitado — isso tem chave de API dentro. Vou tirar do commit e adicionar no .gitignore. Confirma?"
4. Se um segredo já foi comitado em algum momento anterior, avisar claramente que remover do próximo commit **não apaga do histórico**, e que a chave precisa ser revogada/rotacionada no provedor.

Nunca comitar segredo "só essa vez".

## Workflow

### Primeira vez

**Atenção:** o workspace já é um repositório git, ele veio do clone do Contex OS. Então `git rev-parse` **sempre** responde que sim, e a pergunta certa é outra: *já existe um `origin` que seja do usuário?*

```bash
git remote -v
```

Três situações:

| O que aparece | O que fazer |
|---|---|
| Nenhum `origin`, só `contexos` | É a primeira vez — seguir o fluxo abaixo pra criar o repositório dele |
| `origin` apontando pra `vertsystems/contexos` | O `/instalar` não renomeou. Rodar `git remote rename origin contexos` **antes** de qualquer coisa, e então seguir o fluxo abaixo |
| `origin` dele (outro endereço) | Já está configurado — pular pro "Commits seguintes" |

Se for a primeira vez:

1. Perguntar:
   > "Esse é o primeiro salvamento. Você já tem um repositório criado no GitHub pra esse workspace?
   > 1. Sim, me passa a URL (ex: https://github.com/usuario/nome.git)
   > 2. Não, vou criar agora — me dá um nome pro repositório (ex: acme-contexos)"

2. Rodar a checagem de segurança acima **antes** do primeiro `git add`. O primeiro commit é o mais perigoso: ele varre a pasta inteira.

3. **Se opção 1:** `git init` → `git add .` → `git commit -m "Setup inicial do Contex OS"` → `git branch -M main` → `git remote add origin <URL>` → `git push -u origin main`.

4. **Se opção 2:** verificar se o `gh` CLI está instalado (`gh --version`).
   - Se sim: `git init`, commit inicial, e `gh repo create <nome> --private --source=. --push`.
   - Se não: instruir o usuário a instalar `gh` (https://cli.github.com/) ou criar o repo manualmente em github.com/new e voltar com a URL.

5. Repositório **privado** por padrão. Só criar público se o usuário pedir explicitamente — o workspace tem dados de cliente dentro.

### Commits seguintes (já configurado)

1. Rodar `git status`. Se não tiver mudanças, responder "Tá tudo sincronizado, sem mudança nova" e parar.

2. Rodar a checagem de segurança.

3. Mostrar o `git status` curto pro usuário e perguntar:
   > "Vou comitar tudo isso. Quer descrever a mudança em uma frase ou usa o resumo automático?"

4. Se o usuário fornecer mensagem, usar. Se não, gerar uma mensagem baseada nos arquivos alterados (1 linha, formato: "Atualiza X" ou "Adiciona Y" ou "Cria proposta pra cliente Z").

5. `git add .` → `git commit -m "<mensagem>"` → `git push`.

6. Confirmar com link do repositório (extrair de `git remote get-url origin`):
   > "Sincronizado. Ver no GitHub: <URL>"

## Regras

- Nunca usar `--force` sem o usuário pedir explicitamente
- Outras ferramentas (chave de IA, Notion, Vercel, Supabase, Meta) são assunto do `/conectar`, não daqui
- Nunca rodar `git reset --hard` ou outras destrutivas sem confirmação clara
- Se o push falhar por divergência (alguém comitou no remoto), avisar o usuário e oferecer `git pull --rebase` antes de tentar de novo
- Se o usuário ainda não tiver `git` configurado (`user.name` / `user.email`), perguntar e configurar com `git config --global` na primeira vez
- Não comitar `node_modules/` nem PNG duplicado gerado por render — o `.gitignore` já cobre, mas conferir se o repo não ficou pesado (>100 MB avisar)
- **Nunca dar push no repositório do produto** (`vertsystems/contexos`). O `origin` é o repositório dele
- Se o usuário perguntar como atualizar o Contex OS, mandar pro `/atualizar-sistema` — não é assunto de `/salvar`
