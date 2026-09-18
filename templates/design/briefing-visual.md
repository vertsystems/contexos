# Leitura do briefing visual

Referência compartilhada. Lida por `/design-system`, `/landing`, `/carrossel`, `/documento`, `/apresentacao` e `/revisar-design` **antes** de produzir qualquer peça.

## Por que isso existe

A maior causa de peça com "cara de IA" não é falta de habilidade: é pular a leitura do contexto e cair no padrão default. O modelo, sem instrução, sempre vai para o mesmo lugar: gradiente roxo-azul, herói centralizado em fundo escuro, três cards iguais, Inter em tudo. O antídoto é declarar a leitura antes de começar.

---

## 1. Ler os sinais

Antes de escolher cor, fonte ou layout, identificar:

1. **Que peça é** — carrossel de Instagram, página de conversão, proposta comercial, e-book, deck de reunião, post único
2. **Palavras que o usuário usou** — "clean", "sofisticado", "moderno", "sério", "divertido", "premium", "simples", "chamativo", ou o nome de uma marca de referência
3. **Referências que ele deu** — link, print, concorrente, "quero parecido com aquele"
4. **Quem vai ver** — cliente de alto ticket que decide devagar? consumidor no feed em 2 segundos? comprador técnico? familiar de paciente? O público escolhe a estética, não o gosto de quem faz
5. **Marca que já existe** — logo, cor, fonte, foto. Em redesign, isso é matéria-prima, não sugestão
6. **Restrição silenciosa** — público idoso, negócio de saúde, público de baixa visão, tema sensível (luto, dívida, doença). **Restrição vence estética**: se o público tem 70 anos, corpo de 14px está errado por mais bonito que pareça

---

## 2. Declarar a leitura em uma linha

Antes de gerar, dizer:

> "Estou lendo isso como: **[peça]** para **[público]**, com linguagem **[vibe]**, puxando para **[direção visual]**."

Exemplos:

- *"Carrossel educativo para dono de restaurante que vê no feed, linguagem direta e concreta, puxando para fundo escuro com número grande e foto de produto real."*
- *"Proposta comercial para indústria que decide em reunião, linguagem sóbria e técnica, puxando para fundo claro, tipografia grande e tabela limpa — precisa funcionar impressa."*
- *"Apostila para aluno de curso presencial, linguagem didática, puxando para editorial com serifada no corpo e boxes de destaque."*

Se a leitura for genuinamente ambígua, fazer **uma** pergunta, nunca um questionário. Se der para inferir do contexto, não perguntar: declarar e seguir.

---

## 3. Três ajustes

Depois da leitura, definir três valores. Eles governam layout, movimento e quantidade de informação:

| Ajuste | 1 | 10 |
|---|---|---|
| **Variação** | tudo simétrico e alinhado | composição livre, assimétrica |
| **Movimento** | estático | animação e transição em tudo |
| **Densidade** | muito respiro, pouco por tela | informação empilhada |

**Padrão do ContexOS: variação 6 · movimento 3 · densidade 4.** Mais contido que o padrão de agência criativa, porque o público do sistema é negócio real: clareza vence ousadia.

### Inferir pelos sinais

| Sinal na conversa | Variação | Movimento | Densidade |
|---|---|---|---|
| "clean", "minimalista", "sóbrio", "elegante" | 4-5 | 2-3 | 2-3 |
| "premium", "sofisticado", "alto padrão" | 6-7 | 3-5 | 3 |
| "chamativo", "criativo", "quero que pare o dedo" | 8-9 | 5-7 | 3-4 |
| "sério", "técnico", "confiável", saúde, jurídico | 3-4 | 1-2 | 4-5 |
| público idoso, baixa visão, acessibilidade | 2-3 | 1 | 3-4 |
| redesign preservando o que existe | igual ao atual | +1 | igual |

### Por tipo de peça

| Peça | Variação | Movimento | Densidade | Observação |
|---|---|---|---|---|
| Carrossel de Instagram | 6-7 | 0 | 2-3 | peça estática; densidade baixa porque se lê no celular em 2 segundos |
| Post único | 5-6 | 0 | 1-2 | uma ideia, nada mais |
| Landing page | 6-7 | 3-4 | 4 | movimento só onde ajuda a entender |
| Proposta comercial | 4-5 | 0 | 4 | precisa funcionar impressa |
| E-book / apostila | 4-5 | 0 | 3-4 | leitura longa pede respiro |
| Deck de reunião | 5-6 | 2 | 1-2 | uma ideia por slide |

---

## 4. Disciplina anti-default

Não cair nisso por inércia. Só usar se a leitura do briefing pedir de verdade:

- Gradiente roxo-azul (ou qualquer gradiente de duas cores saturadas)
- Herói centralizado sobre fundo escuro com brilho atrás
- Três cards iguais lado a lado como seção de benefícios
- Vidro fosco (glassmorphism) em tudo
- Inter + cinza-900 como escolha automática
- Ícone genérico de biblioteca em cada item de lista
- Emoji fazendo papel de ícone
- Sombra em todo elemento

Cada um desses é a resposta preguiçosa. Alcançar além deles é escolha deliberada, guiada pela leitura, e é isso que separa peça de marca de peça de template.

---

## Como as skills usam

1. Ler os sinais e **declarar a leitura** (uma linha, visível pro usuário)
2. Definir os três ajustes — declarar só se fugir do padrão
3. Produzir seguindo `qualidade-visual.md`
4. Antes de entregar, conferir contra `anti-generico.md`
