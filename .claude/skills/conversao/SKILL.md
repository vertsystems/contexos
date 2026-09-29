---
name: conversao
description: >
  Audita uma página, formulário ou perfil e diz o que está impedindo o visitante de virar cliente —
  proposta de valor, headline, CTA, hierarquia, prova, objeção e atrito. Devolve correções priorizadas.
  Use quando o usuário disser "minha página não converte", "entra gente e ninguém compra",
  "melhorar conversão", "audita meu site", "o formulário ninguém preenche", "olha meu perfil do
  Instagram", ou /conversao. Pra criar a página, veja /landing.
---

# /conversao — Por que não estão comprando

Diagnóstico, não redesenho. Aponta o que trava, na ordem do que mais custa dinheiro.

> **Convenção de pastas:** auditoria de página própria vai junto da página (`site/<nome>/auditoria-<AAAA-MM-DD>.md`); auditoria de URL externa ou de perfil vai em `analises/`. Se o workspace usa a convenção **por cliente**, prefixar com `clientes/<Nome>/`.

## Dependências

- **A peça:** URL, arquivo HTML, print, ou o perfil da rede
- **Público e objeções:** `_memoria/publico.md` (`/publico`) — sem saber a objeção real, a auditoria fica genérica
- **Oferta:** `_memoria/oferta.md` (`/oferta`)
- **Marca:** `identidade/tokens.css` ou `design-guide.md`
- **Referências de copy:**
  - `templates/copy/metodo.md` — diagnóstico antes de escrever: função, consciência, pilar, motor, barreira
  - `templates/copy/psicologia.md` — atalhos de decisão e o limite ético de cada um

---

## Antes de auditar

Duas perguntas que mudam tudo:

1. "De onde vem quem chega nessa página? (anúncio, Google, bio do Instagram, indicação)"
2. "Que ação você quer que a pessoa faça? E quantas fazem hoje, se você souber?"

Página que recebe anúncio de busca precisa continuar a promessa do anúncio. Página que recebe tráfego de Instagram recebe quem não sabe nada ainda. **Auditar sem saber a origem é chutar.**

Se ele tem número (visitas × conversões), pedir. Sem número, a auditoria é qualitativa, e isso fica dito.

---

## Os sete pontos, na ordem de impacto

### 1. Clareza da proposta de valor *(o que mais derruba conversão)*

- Em 5 segundos dá pra entender **o que é, pra quem, e o que fazer**?
- O benefício principal está específico ou é frase de efeito?
- Está na palavra do cliente ou no jargão da empresa?

Teste prático: ler só o topo da página em voz alta pra alguém de fora e perguntar "o que essa empresa faz?". Se hesitar, o problema é aqui, e nenhum outro ajuste compensa.

### 2. Headline

- Comunica o valor ou só o nome da empresa?
- É específica? ("Conservação que faz sua carne durar 3x mais" vence "Soluções em conservação")
- **Bate com o que trouxe a pessoa?** Anúncio que fala de preço e página que fala de qualidade = pessoa sai

### 3. CTA — o botão

- Existe **uma** ação principal, clara e visível sem rolar a página?
- O texto do botão diz o valor, não a mecânica?
  - Fraco: "Enviar", "Saiba mais", "Cadastre-se"
  - Forte: "Pedir orçamento no WhatsApp", "Ver preços", "Agendar visita"
- O CTA se repete ao longo da página (topo, meio, fim) com o mesmo texto e destino?
- Tem CTA concorrente disputando atenção? (dois botões de peso igual = nenhum)

### 4. Hierarquia e leitura em diagonal

- Quem passa o olho em 10 segundos entende a mensagem?
- O mais importante é o mais visível, ou tudo tem o mesmo peso?
- Tem respiro, ou está tudo grudado?
- Imagem apoia a mensagem ou é enfeite que empurra o conteúdo pra baixo?

### 5. Prova

- Tem depoimento **com nome e contexto**, ou é "ótimo atendimento — J.S."?
- Tem número real, foto de trabalho feito, tempo de mercado, certificação?
- A prova está perto da decisão (junto do preço e do CTA) ou escondida no rodapé?
- **Prova genérica não conta.** "Milhares de clientes satisfeitos" tem efeito zero — em alguns casos, negativo

### 6. Objeção

As objeções de `_memoria/publico.md` estão respondidas **na página**? A objeção nº 1 precisa ser tratada de frente, não escondida no FAQ do fim.

Objeções que quase toda página esquece: preço (mesmo que a faixa), prazo, o que acontece se não der certo, se atende a região dele, se serve pro caso dele.

### 7. Atrito

- Formulário com campo que não precisa? (cada campo extra derruba conversão)
- Pede telefone **e** e-mail **e** empresa quando só o WhatsApp resolveria?
- O próximo passo é óbvio depois de clicar?
- No celular: botão pequeno, texto miúdo, formulário que dá zoom, WhatsApp que não abre?
- Página lenta? (pergunta se ele já abriu no 4G)

---

## Auditar perfil de rede social

Quando o "site" é o Instagram: muito comum em negócio local:

- **Bio:** diz o que faz, pra quem, e onde atende? Tem CTA?
- **Link:** vai pro WhatsApp com mensagem pronta, ou pra uma página morta?
- **Destaques:** têm as respostas das objeções (preço, como funciona, resultados, onde estamos)?
- **Últimos 9 posts:** dá pra entender o negócio só olhando a grade?
- **Prova:** tem trabalho feito e depoimento visíveis, ou só frase motivacional?

---

## Entrega

```markdown
## Diagnóstico — <página/perfil>
Origem do tráfego: <...> · Ação desejada: <...> · Conversão atual: <número ou "sem dado">

## Trava dinheiro (arrumar essa semana)
1. **Headline não bate com o anúncio.** O anúncio promete "orçamento em 24h",
   a página fala de "excelência há 20 anos". Quem clica não encontra o que veio buscar.
   → Trocar por: "Orçamento em até 24h para [serviço] em [cidade]"
2. **Nenhum CTA visível sem rolar.** O primeiro botão está a 1.400px do topo.
   → Botão de WhatsApp no primeiro bloco.

## Custa conversão (próximas duas semanas)
3. **Formulário com 7 campos** — 4 são dispensáveis (empresa, cargo, como conheceu, mensagem).
   → Nome + WhatsApp. O resto se pergunta na conversa.
4. **Objeção de preço não tratada.** Seu público pergunta preço antes de tudo
   (está em _memoria/publico.md) e a página não dá nem faixa.

## Polimento
5. Depoimento sem nome no rodapé — subir pra perto do CTA e pedir autorização pro nome completo.
```

Máximo 8 itens. Se houver mais, cortar os de polimento e dizer que cortou.

Ao final:
> "Quer que eu aplique os itens de 'trava dinheiro'? Se a página for nossa (`site/`), eu edito.
> Se estiver em outro lugar, eu te entrego o texto e o trecho pronto pra quem cuida do site."

---

## Testar ou simplesmente mudar

Teste A/B só conclui algo com volume. Sem volume, ele dá falsa confiança:

| Volume mensal na página | O que fazer |
|---|---|
| menos de 1.000 visitas | **Não testar.** Aplicar a correção, anotar a data e comparar antes/depois em 30 dias |
| 1.000 a 5.000 | Testar só mudança grande (headline inteira, oferta, estrutura) — nada de cor de botão |
| acima de 5.000 | Teste vale, um elemento por vez, mínimo 2 semanas |

E em qualquer volume:
- Testar **uma** coisa por vez, senão não se sabe o que causou o quê
- Não interromper no meio porque "já dá pra ver" — resultado inicial engana
- Anotar o que mudou e quando. Sem registro, o aprendizado se perde e o teste é refeito em seis meses
- Mudança que melhora clareza não precisa de teste. Corrigir contraste ilegível ou CTA escondido é conserto, não experimento


## Regras

- **Priorizar por impacto no dinheiro**, não pela ordem em que aparece na página
- **Sempre com o conserto ao lado.** Diagnóstico sem solução é crítica
- Nunca inventar número de conversão. Sem dado, dizer que a leitura é qualitativa
- Não sugerir teste A/B pra quem tem 200 visitas por mês — não há volume pra concluir nada. Nesse caso, mudar direto e comparar antes/depois
- Não recomendar pop-up de saída, contador falso nem "restam 3 vagas" mentiroso
- Não confundir gosto com problema: página feia que converte é melhor que página bonita que não converte. Se o visual não atrapalha a conversão, isso é assunto do `/revisar-design`
- Se a página coleta dado pessoal, conferir aviso de privacidade (LGPD) e sinalizar
