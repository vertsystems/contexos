---
name: atualizar-sistema
description: >
  Atualiza o Contex OS pra versão nova sem tocar no trabalho do usuário: traz skills, templates e
  scripts novos, preservando memória, marca, conteúdo e as skills que ele criou. Use quando o usuário
  disser "atualiza o Contex OS", "atualiza o sistema", "saiu versão nova", "tem atualização",
  "sincronizar skills", ou /atualizar-sistema. Não confundir com /atualizar, que cuida da memória do negócio.
---

# /atualizar-sistema — Trazer a versão nova

Diferença que importa:

- **`/atualizar`** → atualiza a memória do **seu negócio** (clientes, foco, estrutura)
- **`/atualizar-sistema`** → atualiza o **Contex OS** (skills, templates, correções)

O que é do sistema e pode ser substituído: `.claude/skills/` (só as que vieram do produto), `templates/`, `scripts/`, `.env.example`, `LICENSE`, `README.md`.

O que é do usuário e **nunca** se toca: `_memoria/`, `identidade/`, `CLAUDE.md`, `.env`, e toda pasta de trabalho (`conteudo/`, `site/`, `propostas/`, `clientes/`, `materiais/`…).

<!-- ia:inicio -->
**A versão nova chega sempre no formato do Claude Code** (`.claude/skills/`,
`templates/perfis/claude-md-*`, texto falando em `CLAUDE.md`). É assim que o
Contex OS é publicado, independente da IA da base. Numa base Codex, o passo 2 traz
essas pastas como estão e o passo 2b converte o que chegou com
`node scripts/ia.js codex`. Numa base Claude Code, rodar `node scripts/ia.js claude`
no mesmo ponto só regenera o `AGENTS.md` de visita, e não custa nada.
`node scripts/ia.js status` diz qual é a base.
<!-- ia:fim -->

---

## Workflow

### Passo 1 — Ver o que mudou, antes de mexer

**Se o repositório do Contex OS está configurado** (o `/instalar` deixa como `contexos`):

Quem instalou quando o sistema ainda se chamava ViperOS tem o remote com o nome
antigo. Antes de buscar, renomear e reapontar, sem perguntar (é só o endereço
de origem, nada do trabalho dele muda):

```bash
git remote get-url viperos >/dev/null 2>&1 && git remote rename viperos contexos
git remote set-url contexos https://github.com/vertsystems/contexos.git
```

O GitHub redireciona o endereço antigo por um tempo, mas não pra sempre.

```bash
git fetch contexos main
git log --oneline HEAD..contexos/main
```

Se não houver nada novo: "Você já está na versão mais recente" e parar.

Se houver, mostrar o resumo do que mudou (mensagens de commit, em linguagem normal) e perguntar se aplica.

**Se não houver git** (ele baixou o zip), seguir pelo Passo 4.

### Passo 2 — Trazer só as pastas do sistema

Essa é a parte que protege o trabalho dele. Em vez de `git pull` (que mistura tudo e gera conflito no `CLAUDE.md` e na memória), trazer **só** o que é do produto:

<!-- ia:inicio -->
```bash
git checkout contexos/main -- .claude/skills templates scripts .env.example LICENSE README.md
```

O caminho é `.claude/skills` mesmo numa base Codex: é o nome da pasta **no
repositório de origem**, não na base. Nada fora dessa lista é tocado. Memória,
marca e trabalho ficam exatamente como estavam.

### Passo 2b — Converter o que chegou pro formato da base

```bash
node scripts/ia.js codex     # base Codex: move o que chegou em .claude/skills/ pra .agents/skills/ e reescreve
node scripts/ia.js claude    # base Claude Code: só regenera o AGENTS.md de visita
```

Na base Codex, o script trata `.claude/skills/` recém-chegada como a remessa do
produto: cada skill de lá substitui a de mesmo nome em `.agents/skills/`, skill
que só existe em `.agents/skills/` (a que o usuário criou) fica intocada, e
`.claude/` some de novo. Templates e README que chegaram também são reescritos.
Rodar **antes** do Passo 3 conferir a lista final.
<!-- ia:fim -->

### Passo 3 — Cuidar das skills personalizadas

Skill que o usuário criou (pelo `/mapear-rotinas` ou na mão) **não vem do produto e não pode ser perdida**. O comando acima não apaga arquivo que só existe local, mas conferir mesmo assim:

Antes de aplicar, listar o que existe em `.claude/skills/` e comparar com o que vem do repositório. Skill que só existe local é personalizada: avisar que foi preservada, e nunca sobrescrever.

Se uma skill do produto foi **editada pelo usuário**, o `checkout` vai substituir a versão dele.

`git status` não serve pra detectar isso: depois que ele roda `/salvar`, tudo está commitado e o status vem limpo mesmo com a skill alterada. A comparação certa é contra a versão do produto:

```bash
git diff --name-only HEAD contexos/main -- .claude/skills
```

Isso lista o que diverge, misturando edição dele com novidade da versão nova. Pra separar, olhar o que mudou de cada lado desde o ponto em comum:

```bash
base=$(git merge-base HEAD contexos/main)
git diff --name-only $base HEAD -- .claude/skills        # o que ELE mexeu
git diff --name-only $base contexos/main -- .claude/skills # o que o PRODUTO mudou
```

Skill que aparece nas duas listas é conflito real: mostrar o que a versão nova traz e perguntar se mantém a dele ou aceita a nova. **Nunca sobrescrever em silêncio.**

Se o workspace não for repositório git (ele baixou o zip), essa detecção não existe: nesse caso, avisar antes de aplicar que edição local em skill do produto será substituída.

### Passo 4 — Sem git: baixar e sincronizar

Se ele não clonou (baixou o zip), fazer o mesmo por download, numa pasta temporária:

```bash
curl -L https://github.com/vertsystems/contexos/archive/refs/heads/main.tar.gz -o /tmp/contexos.tgz
mkdir -p /tmp/contexos-novo && tar -xzf /tmp/contexos.tgz -C /tmp/contexos-novo --strip-components=1
```

Depois copiar **só** `.claude/skills/`, `templates/`, `scripts/`, `.env.example`, `LICENSE` e `README.md` de `/tmp/contexos-novo/` pra cá (o nome da pasta de skills é o do repositório de origem, mesmo que a base seja outra IA), rodar o Passo 2b, e limpar a pasta temporária no fim.

Aproveitar pra sugerir: "Da próxima vez fica mais fácil se você clonar em vez de baixar o zip, aí a atualização é automática."

### Passo 5 — Conferir que nada quebrou

```bash
node scripts/verificar.js sistema
```

Atualização traz arquivo novo e apaga arquivo velho: é onde aparece skill que
deixou de carregar, referência apontando pra template que não veio, contagem
desatualizada e pedaço da outra IA que a conversão do Passo 2b não pegou. Se acusar algo, resolver **antes** de relatar: o usuário não tem
como saber que a skill parou de ser encontrada.

### Passo 6 — Relatar

```
✓ Sistema atualizado

Skills novas (2):        oferta, imprensa
Skills atualizadas (4):  carrossel, seo, proposta, landing
Preservadas (1):         relatorio-cliente (sua, não mexi)

Seu trabalho não foi tocado: memória, marca, conteúdo e propostas
estão exatamente como estavam.
```

Se entrou skill nova, **demonstrar** em vez de mandar reiniciar: explicar em uma linha o que ela faz e oferecer usar na hora.

Se a skill nova não aparecer na lista do `/` nessa sessão, ela funciona igual: é um arquivo markdown, basta o usuário pedir em português. Não transformar isso em instrução técnica.

---

## Regras

- **Nunca `git pull` nem `git merge`.** Traz o trabalho do usuário pro meio do conflito. Sempre `checkout` das pastas do sistema
- **Nunca trocar a base de IA nessa skill.** O Passo 2b converte pro formato que a base já tem. Trocar é `node scripts/ia.js <outra>` a pedido do usuário, fora daqui
- **Nunca tocar em `_memoria/`, `identidade/`, `CLAUDE.md`, `.env` ou pasta de trabalho.** Nenhuma dessas vem do produto
- **Skill personalizada é intocável.** Se não veio do repositório, nem olhar
- Skill do produto que o usuário editou: perguntar antes de substituir, mostrando o que muda
- Mostrar o que vem **antes** de aplicar. Atualização silenciosa em sistema que o cliente usa pra trabalhar é péssima ideia
- Nunca `git reset --hard`, `clean -fd` ou `checkout --force` no diretório de trabalho
- Se o usuário nunca rodou `/instalar` aqui, mandar rodar o `/instalar` em vez dessa skill
