---
name: abrir
description: >
  Abre uma sessão de trabalho carregando a memória do negócio (empresa, preferências, estratégia, identidade)
  e devolve um resumo curto pro usuário, com o que ficou pendente da última sessão. Use quando o usuário disser
  "abrir", "começar o dia", "bom dia", "/abrir" ou no primeiro turno de uma sessão depois do /instalar.
---

# /abrir — Abertura de sessão

Curto e direto. O objetivo é carregar contexto e devolver uma síntese enxuta pra o usuário começar a trabalhar.

## Workflow

1. Ler, em ordem:
   - `_memoria/empresa.md`
   - `_memoria/preferencias.md`
   - `_memoria/estrategia.md`
   - `identidade/design-guide.md` (só pra saber se está preenchido ou em branco)

2. Se algum dos três primeiros estiver em branco (placeholder), responder:
   > "Vi que `_memoria/<arquivo>.md` ainda não foi preenchido. Quer rodar `/instalar` agora?"

   E parar.

   **Exceção: uso livre.** Se `empresa.md` diz **Perfil:** "Uso livre" (ou o
   `CLAUDE.md` tem a seção "Como eu me construo"), memória em branco é o
   esperado, não erro. Não oferecer `/instalar`. O resumo do passo 4 vira:

   ```
   O que eu já sei: [duas linhas com o que a lista "O que eu já sei" do
   CLAUDE.md tem preenchido; se nada, "ainda nada — vou aprendendo pelo que você pede"]
   Faria diferença saber: [até 2 itens que faltam E mudariam o trabalho
   que ele vem pedindo; omitir a linha se não houver]
   Pendente: [até 2 itens concretos, ou omitir]

   Pronto. O que vamos fazer?
   ```

   "Faria diferença saber" não é pergunta: ele responde se quiser. Se a
   pasta tiver coisa que a memória não cita, rodar o `/atualizar` antes de
   responder e propor o ajuste em uma linha.

3. Checagem rápida de pendências (sem narrar a busca, no máximo 2 itens):
   - `tarefas.md` — itens abertos (se o arquivo existir)
   - Calendário do mês em `conteudo/` — tem peça prevista pra hoje ou pra amanhã?
   - Blog posts com `draft: true` esperando aprovação
   - Última pasta criada em `conteudo/` — tem PNG renderizado ou parou no HTML?
   - Última revisão em `revisoes/` — se passou de 10 dias, cabe sugerir `/revisao-semanal`

4. Devolver UMA mensagem curta no formato:

```
[Nome do negócio] — [o que faz em 5-8 palavras]
Foco atual: [prioridade da estratégia, em uma frase]
Tom: [resumo de 3-4 palavras do tom de voz]
Pendente: [até 2 itens concretos, ou omitir a linha se não houver]

Pronto. O que vamos fazer?
```

5. Não listar quais arquivos foram lidos. Não confirmar leitura. Só usar o contexto.

## Regras

- Resposta tem que caber em 6 linhas no terminal
- Não fazer perguntas além de "o que vamos fazer?"
- Linha "Pendente" só aparece se houver pendência real e concreta. Sem inventar tarefa e sem "revisar estratégia"
- Se o `design-guide.md` estiver em branco, não mencionar — só vira problema quando alguma skill visual for chamada
- Se o usuário responder que não sabe o que fazer, chamar `/ajuda` em vez de listar skills
- Se `_memoria/estrategia.md` tiver contexto com prazo já vencido, sinalizar em uma linha: "Prazo vencido: <item>"
