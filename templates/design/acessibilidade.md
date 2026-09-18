# Acessibilidade — o que reprova e como consertar

Referência compartilhada. Lida por `/acessivel`, e consultada por `/landing`,
`/interface`, `/produto` e `/revisar-design` antes de entregar.

O sistema já cobria contraste. O resto da acessibilidade: foco, alvo, teclado,
formulário, não estava escrito em lugar nenhum, e é onde o site de pequeno negócio
realmente reprova.

---

## A régua

- **WCAG 2.2**, Recomendação do W3C de **05/10/2023**. Nível **AA** é o alvo prático
- **Brasil:** a LBI (Lei 13.146/2015, art. 63) obriga acessibilidade em site de empresa
  com sede ou representação comercial no país. A **ABNT NBR 17225**, publicada em
  **11/03/2025**, é a norma brasileira de acessibilidade em conteúdo digital — é o
  parâmetro em português para o que o artigo exige
- Órgão público segue o **eMAG**; empresa privada usa WCAG 2.2 AA como base

Nível AAA não é meta: alguns critérios AAA são incompatíveis com peça de marketing.
Perseguir AA inteiro vale mais que AAA em três itens.

---

## Os 9 critérios novos da 2.2

Nenhum deles aparecia no sistema até aqui. Os três primeiros são os que mais reprovam.

| Critério | Nível | O que exige | Conserto |
|---|---|---|---|
| **2.4.11 Foco não obscurecido** | AA | o elemento focado não pode ficar escondido atrás de cabeçalho fixo, barra de cookie ou chat | `scroll-padding-top: <altura do cabeçalho>` no `html` |
| **2.5.8 Alvo mínimo** | AA | alvo de **24×24px** (5 exceções abaixo) | `min-height`/`min-width` declarados — ver `interface.md` |
| **2.5.7 Movimento de arrastar** | AA | tudo que se arrasta precisa de alternativa em clique | botão ↑/↓ ao lado da lista arrastável |
| **3.2.6 Ajuda consistente** | A | contato/ajuda sempre no mesmo lugar em todas as páginas | WhatsApp no mesmo canto do rodapé |
| **3.3.7 Entrada redundante** | A | não pedir de novo o que a pessoa já informou no mesmo fluxo | "endereço de entrega = cobrança" marcado |
| **3.3.8 Autenticação acessível** | AA | não exigir teste cognitivo (decorar, transcrever, quebra-cabeça) | permitir colar a senha; código por link ou e-mail |
| 2.4.12 Foco não obscurecido (mais) | AAA | nada pode cobrir o foco | — |
| 2.4.13 Aparência do foco | AAA | contorno de 2px, contraste 3:1 com o entorno | `outline: 2px solid; outline-offset: 2px` |
| 3.3.9 Autenticação acessível (mais) | AAA | nem reconhecer objeto em imagem | — |

E **4.1.1 (Parsing) foi removido** na 2.2: HTML com atributo duplicado deixou de ser
critério. Continua sendo bug, só não reprova mais.

### As 5 exceções do alvo de 24×24

Alvo menor é aceito quando:

1. **Espaçamento** — cabe um círculo de 24px em volta dele sem tocar o círculo do vizinho
2. **Equivalente** — outro controle na mesma página faz a mesma coisa e atende
3. **Inline** — é um link dentro de uma frase, no meio do texto corrido
4. **Controle do navegador** — o tamanho é o padrão do agente e não foi alterado
5. **Essencial** — a posição exata é essencial (pino em mapa) ou exigida por lei

Fora dessas cinco, alvo pequeno reprova. E o piso do Contex OS é mais alto que o da
norma: **34px no desktop, 44px no celular** (ver `interface.md`).

---

## Foco de teclado

O defeito mais denunciado por quem depende de teclado, e o mais barato de evitar:

```css
/* NUNCA */
*:focus { outline: none; }

/* o padrão */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: inherit;
}
html { scroll-padding-top: 88px; }   /* a altura do cabeçalho fixo — critério 2.4.11 */
```

- `:focus-visible` mostra o contorno para teclado e o esconde no clique de mouse. É o
  meio-termo que faz a equipe parar de querer remover o foco
- Ordem do DOM = ordem visual. `order` do flex e `position` mudam o visual sem mudar a
  tabulação, e a pessoa passa a "pular" pela tela em ordem aleatória
- Modal captura o foco e o devolve ao elemento que o abriu ao fechar
- Nada de `tabindex` positivo — ele quebra a ordem da página inteira

---

## Formulário

Onde o pequeno negócio perde venda sem saber:

- `<label for>` real em todo campo. `aria-label` é remendo, não padrão
- Erro em **texto**, junto do campo, ligado por `aria-describedby`. Vermelho sozinho
  não existe para quem não distingue cor
- Não bloquear colar no campo de senha (critério 3.3.8)
- `autocomplete="name | email | tel | postal-code | cc-number"` no que é dado pessoal
- Não zerar o formulário quando um campo dá erro — recomeçar é o que faz desistir
- Botão de envio com o verbo da ação ("Enviar pedido"), nunca "Enviar" solto

---

## Imagem, texto e estrutura

- `alt` descreve a **função**, não a aparência: `alt="Falar no WhatsApp"`, não
  `alt="ícone de telefone verde"`
- Imagem decorativa leva `alt=""` — vazio, presente. Sem o atributo, o leitor de tela
  anuncia o nome do arquivo
- Um `<h1>` por página, sem pular nível (h2 → h4 é erro)
- Texto redimensionável até 200% sem quebrar o layout: medida em `rem`, nunca altura
  fixa em elemento com texto dentro
- Link com o destino no próprio texto: "ver a tabela de preços", nunca "clique aqui"
- Idioma declarado (`<html lang="pt-BR">`) — sem isso o leitor de tela lê português
  com fonética de inglês, e vira ruído

---

## Contraste (o que já valia, com o que faltava)

| O que | Mínimo |
|---|---|
| texto normal | 4.5:1 |
| texto grande (≥24px, ou ≥18.7px em negrito) | 3:1 |
| **borda de campo, ícone informativo, limite de componente** | 3:1 |
| **estado de foco contra o entorno** | 3:1 |

```bash
node scripts/verificar.js contraste "#616161" "#ffffff"
```

Texto sobre imagem é o caso que sempre escapa: medir contra a **região mais clara** da
foto, não contra a média. Se não passar, camada sólida por baixo, nunca só uma sombra
no texto.

---

## No celular: zoom, hover e gesto

- **Nunca desligue o zoom da página.** Nada de `user-scalable=no` nem `maximum-scale=1` na
  meta viewport. Pinçar para aproximar é acessibilidade que existe em todo aparelho, e quem
  mais depende dela é o cliente de 60 anos. Quando o iPhone dá zoom sozinho ao tocar num
  campo, o conserto é texto de 16px no campo, nunca travar a escala
- **Nada essencial atrás de hover.** Menu e dica que só aparecem ao passar o mouse não
  existem em tela de toque. O sintoma é "o menu não abre no celular", ou abre no segundo
  toque. Hover fica como conforto de quem tem mouse, nunca como único caminho
- **Nada essencial atrás de gesto.** O critério 2.5.7 já exige alternativa em clique para o
  que se arrasta. A regra prática vai além: gesto é o atalho de teclado do toque, e quem não
  sabe que ele existe não descobre sozinho. No carrossel, setas à vista e o arrastar de bônus

---

## Como testar em 10 minutos

Sem ferramenta paga, na ordem de quem acha mais problema:

1. **Teclado.** `Tab` do começo ao fim: dá para chegar em tudo? o foco aparece? algo
   fica escondido atrás do cabeçalho? dá para sair do modal?
2. **Zoom 200%** no navegador. Sobrou rolagem horizontal? Texto cortado?
3. **Celular real, 360px de largura.** Alvo pequeno demais aparece aqui
4. **Contraste** dos pares principais, por comando
5. **Alvo**, por comando: `node scripts/verificar.js alvo <arquivo.html>`
6. **Leitor de tela**, 2 minutos: VoiceOver (`Cmd+F5` no Mac) ou NVDA. Ouvir só o
   cabeçalho e o formulário já revela metade dos problemas

Ferramenta automática (axe, Lighthouse) pega cerca de um terço dos critérios. O resto é
teclado e leitura, e é justamente onde estão os que fazem a pessoa desistir.
