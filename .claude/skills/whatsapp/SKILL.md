---
name: whatsapp
description: >
  Monta o atendimento por WhatsApp do negócio: mensagem de primeira resposta, respostas rápidas
  pras perguntas que mais chegam, apresentação de preço sem perder a conversa, follow-up,
  mensagem de ausência, e o texto de lista de transmissão. Também organiza o perfil comercial —
  catálogo, saudação, etiqueta e link direto.
  Use quando o usuário disser "responder no WhatsApp", "o que eu respondo quando perguntam o preço",
  "mensagem pro cliente", "lista de transmissão", "status do WhatsApp", "atendimento",
  "cliente pergunta e some", "modelo de mensagem", ou /whatsapp.
---

# /whatsapp — O canal onde a venda acontece

> **Convenção de pastas:** a saída vai em `vendas/whatsapp/`. Na convenção **por cliente**, `clientes/<Nome>/vendas/whatsapp/`. A pasta nasce na primeira entrega.

Pra maioria dos pequenos negócios brasileiros, o WhatsApp **é** a loja: é lá que chega o
"quanto custa?", é lá que a venda esfria e é lá que ela morre sem ninguém perceber.

## Dependências

- **Regra de atendimento:** `operacao/procedimentos/`, quando a pasta existe (`/procedimento`) — a folha da tarefa diz o que quem atende responde sozinha e quando para e chama o dono
- **Troca e devolução:** `juridico/respostas-de-troca.md`, se existir (`/troca-devolucao`) — a resposta pra "posso trocar?" e "quero o dinheiro de volta" vem de lá, com a data calculada; esta skill não decide o que a lei obriga
- **Vocabulário do sistema:** `sistemas/<nome>/GLOSSARIO.md` (`/glossario`), quando existir — a mensagem usa a grafia "No WhatsApp" do glossário, não uma palavra nova
- **Contexto e contato:** `_memoria/empresa.md` — número, horário de atendimento, o que se vende
- **Tom:** `_memoria/preferencias.md` — mensagem de WhatsApp é a mais pessoal de todas; tom errado aqui é imediato
- **Cliente real:** `_memoria/publico.md`, se existir — a dor e as objeções na palavra dele
- **Oferta e preço:** `_memoria/oferta.md` e o estudo do `/preco` — o que responder quando perguntam o valor
- **Conversa de venda:** o roteiro do `/vender`, quando existir — aqui é a versão escrita e curta dele
- **Saída:** `vendas/whatsapp/respostas.md` (o kit) e `vendas/whatsapp/<campanha>-<AAAA-MM-DD>.md` (transmissões)

---

## Workflow

### Passo 1 — Levantar o que realmente chega

> "Quais são as 5 perguntas que mais te mandam no WhatsApp?"
> "Qual delas você odeia responder?" — essa é a que mais precisa de resposta pronta
> "Em quanto tempo você costuma responder?"
> "Onde a conversa costuma morrer?"

Se ele tiver conversas antigas, ler alguns exemplos vale mais que qualquer suposição: a
linguagem real do cliente está ali.

### Passo 2 — Escrever a primeira resposta

A mensagem mais importante do negócio. Ela tem quatro segundos pra fazer a pessoa
continuar. Estrutura que funciona:

1. **Responder o que foi perguntado** — antes de qualquer outra coisa. Ignorar a pergunta e devolver outra é o erro mais comum
2. **Uma informação que ele não pediu e ajuda** (prazo, como funciona, o que está incluso)
3. **Uma pergunta só**, que faça a conversa avançar

```
Oi, [nome]! O [serviço] fica em R$ [valor], com [o que está incluso].
O prazo hoje está em [X dias].

Me conta rapidinho: é pra [situação A] ou [situação B]? Aí te digo
o que faz mais sentido.
```

**Sobre responder preço:** responder. A tática de "me chama no direct" pra fugir do valor
custa mais venda do que protege. O que funciona é dar o preço **com contexto**: o que está
incluso, o prazo, e uma pergunta que devolve a conversa.

### Passo 3 — Montar o kit de respostas rápidas

De 6 a 10 mensagens prontas, cada uma com o atalho do WhatsApp Business (`/preco`,
`/prazo`, `/endereco`). O que quase todo negócio precisa:

| Situação | O que a resposta precisa ter |
|---|---|
| Quanto custa | Valor, o que inclui, e uma pergunta de volta |
| Qual o prazo | Data real, não "depende" |
| Como funciona | 3 passos, numerados |
| Tá caro | Reconhecer sem defender, e mostrar o que sustenta o valor (nunca dar desconto na primeira objeção) |
| Formas de pagamento | Todas, com o parcelado mostrando o total |
| Onde fica / atende onde | Endereço ou área, com link do mapa |
| Fora do horário | Quando você responde, e o que ele pode adiantar enquanto isso |
| Fechou | O que acontece agora, com data — e aí entra o `/pos-venda` |

Escrever cada uma em **duas variantes** (mais formal e mais próxima), pro usuário escolher
a que soa como ele.

### Passo 4 — Arrumar o perfil comercial

Checklist do WhatsApp Business, que quase ninguém preenche por inteiro:

- **Nome** do jeito que o cliente procura, não a razão social
- **Descrição** dizendo o que faz e pra quem, em uma linha
- **Horário de atendimento** de verdade — e a mensagem de ausência coerente com ele
- **Catálogo** com foto, nome claro e preço. Catálogo é a vitrine que responde sozinha às três da manhã
- **Mensagem de saudação** curta (a longa é ignorada)
- **Etiquetas** pra separar quem está orçando, quem fechou e quem sumiu — é o CRM que ele já tem
- **Link direto** `wa.me/55DDDNUMERO?text=` com mensagem pré-preenchida, pra usar na bio, na landing e no anúncio

Gerar o link pronto e conferir que o número está completo com DDI e DDD.

### Passo 5 — Lista de transmissão (quando houver)

- Só pra quem **já é contato salvo e já falou com o negócio**. O WhatsApp só entrega a transmissão pra quem tem o número salvo
- Um motivo real na mensagem (novidade, época, algo que mudou), nunca "estamos com saudades"
- Saída fácil e respeitada: "se preferir não receber, é só me avisar" — e cumprir
- Frequência baixa. Duas por mês já é bastante

**Aviso que precisa ser dito:** disparo em massa pra quem não pediu contato faz o número
ser denunciado e banido, e o número banido leva junto o histórico de conversa, os grupos e
o catálogo. Não existe recuperação garantida. Se o usuário quiser volume, o caminho é a API
oficial (WhatsApp Business Platform), com custo por conversa e regras próprias.

### Passo 6 — Entregar

```markdown
# WhatsApp — kit de atendimento

## Primeira resposta
[texto]

## Respostas rápidas
### /preco
[texto]  ← atalho: /preco
...

## Perfil comercial — o que ajustar
- [ ] item, com o texto pronto ao lado

## Link direto
https://wa.me/55DDDNUMERO?text=Oi!%20Vim%20pelo%20[origem]%20e%20quero%20saber%20sobre%20[serviço]
```

Antes de entregar, conferir o link com `node scripts/verificar.js html` se ele for pra
dentro de alguma peça: link de `wa.me` sem número é um dos erros que o verificador pega.

---

## Regras

- **Responder o que foi perguntado, primeiro.** Toda mensagem que começa desviando perde a pessoa
- **Uma pergunta por mensagem.** Três perguntas juntas recebem uma resposta só
- **Preço se responde.** Fugir do valor custa mais venda do que preserva
- **Parcelamento sempre com o total.** "3× R$ 200 (R$ 600 no total)"
- **Áudio só se o cliente mandou áudio primeiro.** Áudio longo não solicitado é a reclamação silenciosa mais comum
- **Sem escassez falsa e sem gatilho batido.** "Última vaga" que não é última destrói a confiança de um jeito que não volta
- **Nada de disparo pra quem não pediu.** Além do banimento, é problema de LGPD — contato só com base legal e com saída respeitada
- **Nunca prometer prazo que o usuário não confirmou.** A mensagem sai com `[a confirmar]` até ele confirmar
- Escrever como gente: sem "prezado cliente", sem parágrafo de três linhas, sem emoji em excesso. O tom sai de `_memoria/preferencias.md`
