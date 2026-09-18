---
name: email
description: >
  Desenha e-mail em HTML que chega inteiro na caixa de entrada: estrutura em tabela, 600px,
  CSS inline, botão que funciona no Outlook, modo escuro, preheader e o descadastro em um
  clique exigido por Gmail e Yahoo.
  Use quando o usuário disser "e-mail para a lista", "newsletter", "e-mail de promoção",
  "disparo para os clientes", "e-mail bonito", "e-mail com o layout da marca", "campanha de
  e-mail", "o e-mail chegou quebrado", "caiu no spam", ou /email.
---

# /email — E-mail em HTML

> **Convenção de pastas:** a saída vai em `emails/<nome>-<AAAA-MM-DD>/index.html`. Na convenção **por cliente**, `clientes/<Nome>/emails/`. A pasta nasce agora, nunca antes.

O `/email-profissional` escreve o **texto** de um e-mail que vai para uma pessoa —
cobrança, proposta, resposta difícil. Esta skill **desenha** o e-mail que vai para uma
lista, e o problema aqui é outro: o HTML roda dentro de dezenas de programas, um deles
com o motor de renderização do Word, e chega com a imagem desligada.

É o canal que o pequeno negócio realmente controla: a lista é dele, não da plataforma
— e o único onde "parecer das grandes" tem receita mecânica.

## Dependências

- **Contexto de venda:** `_memoria/publico.md` e `_memoria/oferta.md` quando o e-mail vende. Se não existirem, oferecer `/oferta` **uma vez** e seguir
- **Sistema da marca:** `identidade/tokens.css` se existir — os valores entram **inline** no HTML, nunca por `var()`: o Gmail descarta boa parte do `<style>`
- **Referências** (ler antes de gerar):
  - `templates/design/email-html.md` — estrutura, botão, modo escuro, preheader, exigências de entrega
  - `templates/copy/ganchos.md` — assunto e primeira linha
  - `templates/design/anti-generico.md` — conferir antes de entregar
- **Saída:** `emails/<nome>-<AAAA-MM-DD>/index.html` e, no mesmo lugar, `texto.txt` com a versão em texto puro

---

## Workflow

### Passo 1 — Descobrir o e-mail que é

Uma pergunta, com o que faltar:

> "Esse e-mail é para quem, e o que você quer que a pessoa faça depois de ler?"

Três tipos, com pesos diferentes:

| Tipo | O que manda | Cuidado principal |
|---|---|---|
| **Transacional** (pedido, recibo, confirmação) | clareza e dado correto | não parecer marketing, ou vai para promoções |
| **Relacionamento** (novidade, conteúdo) | uma ideia só | não virar mural de seis blocos |
| **Promocional** (oferta, campanha) | oferta e prazo visíveis sem rolar | preço e condição em texto, nunca dentro da imagem |

Perguntar também **quantas pessoas** recebem. Acima de 5.000 por dia para o mesmo
domínio, as exigências de Gmail e Yahoo passam a valer como bloqueio, não como higiene
(passo 5).

### Passo 2 — Escrever o assunto, o preheader e a primeira linha

Os três se leem juntos na lista, antes de qualquer design:

- **Assunto:** até ~40 caracteres para não cortar no celular. Concreto, sem "novidades imperdíveis"
- **Preheader:** a linha seguinte, que completa o assunto em vez de repetir. Sem ela, o cliente mostra "Ver no navegador"
- **Primeira linha do corpo:** entrega o que o assunto prometeu. E-mail que abre com "Espero que esteja tudo bem" gasta a única frase que a pessoa lê de fato

Abrir pela dor ou pelo fato, nunca por "somos especializados em".

### Passo 3 — Montar o HTML

Seguir a estrutura do `templates/design/email-html.md`:

- Tabela com `role="presentation"`, 600px, uma coluna
- CSS **inline em cada elemento** — `flex`, `grid` e arquivo externo não existem aqui
- Botão em tabela com `bgcolor` **e** cor no CSS, alvo de 44px
- `alt` estilizado em toda imagem; preço, prazo e botão **em texto**
- `<meta name="color-scheme" content="light dark">` e cores que sobrevivem à inversão
- Rodapé com: link de descadastro visível, endereço físico do remetente e o motivo do recebimento

### Passo 4 — Gerar a versão em texto puro

`texto.txt`, com o mesmo conteúdo em texto corrido e os links por extenso. A ferramenta
de envio costuma gerar essa versão vazia, e caixa que só recebe texto passa a ver um
e-mail em branco.

### Passo 5 — As exigências de quem entrega

Se o envio passa de ~5.000 por dia para o mesmo domínio, avisar o que precisa estar
configurado **na ferramenta de envio** (não no HTML), porque sem isso a campanha é
recusada:

1. SPF e DKIM no domínio, com DMARC publicado
2. `List-Unsubscribe` **e** `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058), processado em até 2 dias
3. Taxa de spam abaixo de 0,3%, acompanhada no Postmaster Tools

Abaixo desse volume nada disso é exigido, mas 300 e-mails sem SPF caem em spam do
mesmo jeito.

### Passo 6 — Verificar antes de disparar

E-mail enviado não se corrige. É a peça do sistema com o erro mais caro:

```bash
node scripts/verificar.js html emails/<nome>-<data>/index.html
node scripts/verificar.js peso emails/<nome>-<data>/
```

E conferir à mão: HTML abaixo de 102 KB (acima disso o Gmail corta a mensagem e esconde
o rodapé), nenhum link `href="#"`, nenhum placeholder, todo link absoluto e testado.

### Passo 7 — Entregar

```
✓ emails/<nome>-<data>/index.html  — 600px, tabela, CSS inline, [N] KB
✓ emails/<nome>-<data>/texto.txt   — versão em texto puro

Antes de disparar: envia um teste pra você mesmo e abre no celular.
É o único jeito de ver o modo escuro de verdade.
```

---

## Regras

- **Tabela, 600px, CSS inline.** Não é escolha estética: `flex` e `grid` não existem no Outlook
- **O e-mail precisa fazer sentido com a imagem desligada.** E-mail que é uma imagem só é ilegível e cai em spam
- **Preço, prazo e botão em texto**, nunca dentro da imagem
- **Uma ideia por e-mail.** Seis blocos disputando é o que faz ninguém clicar em nada
- **Descadastro visível no corpo**, além do cabeçalho. Esconder aumenta a marcação de spam, que é o que realmente derruba a entrega
- **Nada de `<script>`, `<form>` ou CSS externo** — removidos ou marcados como spam
- Abaixo de 102 KB de HTML
- Versão em texto puro sempre, e conferida
- **O ContexOS entrega o arquivo; quem dispara é o usuário**, na ferramenta dele. A skill não envia nada
- Se o pedido é um e-mail para **uma** pessoa, a skill é `/email-profissional`
