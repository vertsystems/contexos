---
name: reaproveitar
description: >
  Transforma um conteúdo que já existe (artigo, transcrição de vídeo ou live, post que performou,
  material em PDF, reunião gravada) em várias peças novas em formatos diferentes. Use quando o
  usuário disser "reaproveitar", "transformar esse vídeo em post", "já tenho esse conteúdo",
  "repostar de outra forma", "esse artigo pode virar carrossel", ou /reaproveitar.
---

# /reaproveitar — Uma peça, cinco saídas

Todo negócio já produziu mais conteúdo do que usou: live que ninguém reassistiu, artigo de dois anos, PDF que só um cliente leu, áudio de reunião com explicação melhor do que qualquer post. Essa skill extrai isso em vez de começar de zero.

## Dependências

- **Fonte:** o conteúdo original (arquivo, link, transcrição, texto colado)
- **Tom e marca:** `_memoria/preferencias.md`, `identidade/`
- **Histórico:** `conteudo/indice.md` (pra não republicar igual)
- **Se for vídeo do YouTube:** `yt-dlp` pra transcrição (ver `templates/ferramentas/catalogo.md`)
- **Se o vídeo longo já tem pacote de publicação:** `conteudo/youtube-<tema>-<AAAA-MM-DD>/upload.md` (`/publicar-video`) já traz a transcrição em capítulos e os minutos marcados — começar por ali em vez de reler o vídeo inteiro
- **Referências de copy:**
  - `templates/copy/ganchos.md` — estrutura gancho → conteúdo → fechamento e a régua de qualidade

---

## Workflow

### Passo 1 — Receber e ler a fonte

Aceita: artigo do blog, transcrição, vídeo/live (extrair legenda), áudio, PDF, post antigo, thread, e-mail longo, ata de reunião.

Se for material longo (mais de 20 min de fala ou 3.000 palavras), avisar que vai extrair os melhores trechos e não tudo: reaproveitamento é curadoria, não moagem.

### Passo 2 — Garimpar os pontos de valor

Ler procurando **cinco tipos de ouro**:

| Tipo | O que é | Vira |
|---|---|---|
| **Frase forte** | Afirmação que se sustenta sozinha | post único, hook, citação |
| **Número** | Dado concreto que foi dito de passagem | post de número, slide, argumento de venda |
| **Explicação clara** | O momento em que ele explicou bem algo difícil | carrossel educativo |
| **História** | Caso real, com desfecho | post de caso, prova social, slide de pitch |
| **Objeção respondida** | Pergunta difícil que apareceu e foi respondida | conteúdo de fundo de funil, FAQ da landing |

Mostrar o que achou antes de produzir:

> "Achei 4 coisas boas nessa live:
> 1. (min 6) A explicação de por que o método comum falha — dá um carrossel
> 2. (min 14) 'A gente perdeu R$ 20 mil aprendendo isso' — post único forte
> 3. (min 22) O caso do cliente que voltou — post de prova
> 4. (min 31) A resposta pra 'por que é mais caro' — conteúdo de fundo
>
> Quais você quer que eu produza?"

### Passo 3 — Produzir as peças aprovadas

Cada peça é adaptada ao formato, não copiada:

- **Carrossel** → chama `/carrossel` com o trecho como base
- **Post único** → frase forte + contexto curto
- **Artigo de blog** → se a fonte era vídeo/live, estrutura o falado em texto (`/publicar-tema`)
- **Roteiro de vídeo curto** → gancho nos primeiros 3 segundos, uma ideia, corte seco. 30-45 segundos
- **Newsletter / e-mail** → versão pessoal, com o que não caberia em post
- **Slide** → entra num deck existente ou vira material de treinamento

**Adaptar de verdade:** o que funciona falado não funciona escrito. Fala tem repetição, gancho verbal e digressão: o texto precisa da estrutura que a fala dispensa.

### Passo 4 — Preservar a origem

Toda peça derivada registra de onde veio, no `indice.md`:

```
| 12/06 | Por que o método comum falha | carrossel | reaproveitado da live de 03/04 (min 6) |
```

Serve pra dois motivos: não reaproveitar o mesmo trecho duas vezes, e saber qual conteúdo original rende mais (o que rende, você faz mais).

### Passo 5 — Entregar

```
✓ [N] peças a partir de <fonte>
  - carrossel: conteudo/<pasta>/
  - post único: conteudo/<pasta>/
  - roteiro de reels: conteudo/<pasta>/roteiro.md

Registrado no indice.md com a origem.
Sobrou material: [o que não foi usado e pode virar peça depois]
```

---

## Regras

- **Curadoria, não moagem.** Extrair o que é bom e descartar o resto. Live de 1h raramente tem mais de 4 peças boas dentro
- Adaptar ao formato — nunca colar transcrição em slide
- Não reaproveitar conteúdo que envelheceu mal: dado desatualizado, preço antigo, regra que mudou. Conferir data e sinalizar
- Frase do usuário citada literalmente continua literal. É a voz dele que dá valor
- Se a fonte tem participação de terceiro (cliente, convidado, entrevistado), pedir confirmação de que pode reaproveitar antes de publicar
- Não republicar peça igual à original em outro canal e chamar de reaproveitamento — isso é repost, e o usuário pode fazer sozinho
- Se a fonte é gravação de reunião com cliente, tratar como confidencial por padrão: só reaproveitar com autorização explícita
