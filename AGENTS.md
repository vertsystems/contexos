<!-- contexos:visita -->
# ContexOS — você está de visita

Este workspace é o ContexOS no formato do **Claude Code**: as regras estão em
`CLAUDE.md` e as skills em `.claude/skills/`. A base é dele e continua assim.
Você (Codex) trabalha aqui como apoio, com tudo que a base oferece, sem
mudar a base.

## Como trabalhar

- Ler `CLAUDE.md` inteiro e seguir como se fosse seu: contexto em
  `_memoria/`, marca em `identidade/`, onde salvar cada coisa
- Skill é `.claude/skills/<nome>/SKILL.md`. Quando o pedido do usuário bate com a
  `description` de uma, ler o arquivo e executar. `/nome` escrito pelo usuário
  é a skill `nome`
- O usuário fala em português, sem comando. Nunca pedir pra ele escolher `/comando`

## O que não fazer, com a base já instalada

- Não rodar `node scripts/ia.js codex`, não criar `.agents/` nem
  `AGENTS.md` próprio, não mover skill. Se o usuário quiser trocar a base,
  ele pede, e aí é `node scripts/ia.js codex`
- Não editar este arquivo: o `scripts/ia.js` regenera

## Primeiro uso

Se `_memoria/` não existe, ninguém instalou ainda. Na primeira mensagem do
usuário, seja qual for, ler `.claude/skills/instalar/SKILL.md` e executar do início:
banner, pergunta de qual IA, entrevista. A resposta de qual IA é o que decide o
formato da base, e pode ser Codex.
