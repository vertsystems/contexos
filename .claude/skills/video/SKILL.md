---
name: video
description: >
  Escreve roteiro de vídeo curto vertical pra Reels, TikTok e Shorts: gancho nos primeiros
  segundos, fala cronometrada, indicação de corte e do que aparece na tela, legenda e CTA.
  Entrega o roteiro em cena a cena, pronto pra gravar no celular, com a legenda do post junto.
  Use quando o usuário disser "roteiro de vídeo", "reels", "tiktok", "shorts", "vídeo pro
  instagram", "o que eu falo no vídeo", "não sei o que gravar", "vídeo curto", ou /video.
---

# /video — Roteiro de vídeo curto

> **Convenção de pastas:** a saída vai em `conteudo/video-<tema>-<AAAA-MM-DD>/`. Na convenção **por cliente**, `clientes/<Nome>/conteudo/`. A pasta nasce na hora de salvar.

Vídeo curto é onde está o alcance orgânico que o post estático não alcança mais. E o que
decide o resultado não é a edição: são os primeiros segundos e o motivo de continuar.

## Dependências

- **Tema:** o banco de pautas (`conteudo/pautas.md`, do `/ideias`) ou o que o usuário trouxer
- **Ângulo:** `/angulos`, quando o tema estiver solto demais
- **Voz:** `_memoria/preferencias.md` — roteiro é fala, e fala errada soa decorada na hora de gravar
- **Cliente real:** `_memoria/publico.md`, se existir — a primeira frase precisa ser a dor na palavra dele
- **Dado:** `pesquisa/` e `biblioteca.md`, quando o vídeo afirma número
- **Referências de copy:** `templates/copy/ganchos.md` (estrutura gancho → conteúdo → fechamento) e `templates/copy/edicao.md` (o que cortar)
- **O que a retenção já ensinou:** `conteudo/retencao/regras.md`, se existir (`/retencao-de-video`) — as regras que saíram da curva dos vídeos longos valem pro gancho do curto
- **Saída:** `conteudo/video-<tema>-<data>/roteiro.md` e `legenda.md`

---

## Workflow

### Passo 1 — Definir formato e duração

Perguntar, se não estiver claro:

> "Você vai aparecer falando, ou prefere gravar a mão fazendo / a tela / o produto?"

| Formato | Quando funciona | Duração |
|---|---|---|
| **Falando pra câmera** | Opinião, explicação, história | 30-60s |
| **Mão na massa** | Processo, antes e depois, bastidor | 15-45s |
| **Tela gravada** | Demonstração, passo a passo | 30-90s |
| **Foto/vídeo com narração** | Quem não quer aparecer | 20-40s |

Vídeo de 30 a 45 segundos é o ponto em que a maioria dos temas cabe sem encher linguiça.
Passar disso exige que cada segundo esteja pagando o próprio tempo.

### Passo 2 — Escrever o gancho

Os **primeiros 3 segundos** decidem o vídeo. Nesse tempo cabe uma frase, e ela precisa
fazer a pessoa querer o resto.

Ganchos que funcionam:

| Tipo | Exemplo de forma |
|---|---|
| **Erro que a pessoa comete** | "Se você faz [X], está perdendo [Y]" |
| **Contradição** | "Todo mundo diz [X]. É o contrário" |
| **Resultado na cara** | "Isso aqui custou R$ 40 e resolveu [problema]" |
| **Pergunta que incomoda** | "Você sabe quanto custa a sua hora?" |
| **Antes e depois** | mostrar o depois primeiro, e voltar |

O que **não** funciona como abertura: "oi gente, tudo bem?", apresentar-se, explicar o que
o vídeo vai falar, agradecer. Tudo isso é tempo gasto antes de dar motivo pra ficar.

Entregar **3 ganchos alternativos** pro usuário escolher ou testar.

### Passo 3 — Montar o roteiro cena a cena

```markdown
## Roteiro — [tema] — [duração alvo]

| Tempo | Fala | Imagem | Texto na tela |
|---|---|---|---|
| 0-3s | [gancho, literal] | close no rosto / no produto | [3-5 palavras] |
| 3-10s | [o problema, na palavra do cliente] | ... | ... |
| 10-30s | [o conteúdo: 2 ou 3 pontos, não 5] | corte a cada 3-4s | ... |
| 30-40s | [o fechamento e o CTA] | ... | ... |
```

Regras do roteiro:

- **Escrever como se fala**, não como se escreve. Ler em voz alta antes de entregar: se travar a língua, reescrever
- **Um assunto por vídeo.** Dois assuntos viram dois vídeos — e resolvem duas semanas de conteúdo
- **Corte a cada 3 a 4 segundos** (mudar de plano, aproximar, mostrar outra coisa). Plano parado longo é onde a pessoa desliza pro próximo
- **Texto na tela em 3 a 5 palavras**, nunca a frase inteira. Ele reforça, não duplica
- **O CTA é um só**, e específico: "manda um oi no WhatsApp que eu te mando a lista" funciona; "curte, comenta, compartilha e salva" não funciona

### Passo 4 — Escrever a legenda do post

A legenda não repete a fala: ela dá o que o vídeo não coube:

- Primeira linha que sobrevive ao corte do "ver mais"
- O contexto ou o passo extra
- O mesmo CTA do vídeo
- 3 a 5 hashtags específicas do nicho e da cidade. Hashtag genérica de milhões de posts não entrega nada

### Passo 5 — Entregar com as instruções de gravação

```
✓ conteudo/video-<tema>-<data>/roteiro.md
✓ conteudo/video-<tema>-<data>/legenda.md

Pra gravar (celular basta):
- Vertical, 9:16. Câmera na altura dos olhos
- Luz na sua frente, nunca atrás (janela na frente resolve)
- Áudio é o que mais importa: grave em lugar sem eco, perto do celular
- Legenda queimada no vídeo — a maioria assiste sem som
- 3 tomadas do gancho, uma do resto. O gancho é o que vale reescrever

Ganchos alternativos no fim do roteiro — se testar, troque um por semana.
```

### Passo 6 — Registrar

Adicionar o tema ao `conteudo/indice.md` e, se o vídeo tiver ido bem, ao `biblioteca.md` —
vídeo que performou é a melhor matéria-prima do `/reaproveitar`.

---

## Regras

- **O gancho é o vídeo.** Se ele não parar o dedo, o resto não existe. Gastar o esforço ali
- **Nada de "oi gente, tudo bem".** Nem apresentação, nem agradecimento antes do conteúdo
- **Profissão regulada muda a lista de formatos.** Médico, dentista, advogado, psicólogo e corretor têm regra de conselho, e "antes e depois", "processo" e "bastidor" são os três que mais caem em infração. Antes de gravar, passar o roteiro pelo `/publicidade-regulada`, que diz o artigo e devolve a versão que pode ir ao ar
- **Acima de 6 minutos é outra skill.** Vídeo longo horizontal, com blocos e loops, é o `/roteiro-longo`
- **Uma ideia por vídeo**, um CTA por vídeo
- **Escrever falando.** Roteiro que só funciona lido vira leitura de teleprompter — e todo mundo percebe
- **Não prometer no gancho o que o vídeo não entrega.** Isso derruba retenção e a conta perde alcance no próximo
- **Toda afirmação com número precisa de fonte** (`pesquisa/`) ou sai do roteiro. O vídeo é o formato onde o número inventado circula mais longe
- **Sem áudio de trend que não tem a ver** com o assunto só pra pegar alcance — traz gente errada e não converte
- **Sem depoimento encenado por ator** apresentado como cliente real
- Tom conforme `_memoria/preferencias.md`. Vídeo é o formato onde soar diferente de si mesmo aparece mais
