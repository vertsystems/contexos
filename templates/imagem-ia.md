# Ligar a geração de imagem por IA

Guia curto pra quem quer que o ContexOS **crie as fotos** das peças, em vez de você mandar imagem pronta.

É opcional. Sem isso o sistema continua fazendo carrossel, post, página e material, só que com tipografia e as fotos que você já tem, que é como a maioria das marcas boas trabalha mesmo.

---

## O que você precisa saber antes

Gerar imagem por IA é um serviço pago **por imagem**, cobrado direto pela empresa que gera (não pelo ContexOS). Você usa a sua própria conta e a sua própria chave, nada passa por terceiros.

Duas opções, e as duas funcionam igual aqui:

| | **Google Gemini** | **OpenAI** |
|---|---|---|
| Custo | tem **cota gratuita** diária | pago desde a primeira imagem (centavos cada) |
| Cartão de crédito | não precisa pra começar | precisa |
| Onde pega a chave | aistudio.google.com/apikey | platform.openai.com/api-keys |
| Bom pra | testar sem gastar, volume baixo | quem já tem conta de API na OpenAI |

**Se você não sabe qual escolher: comece pelo Gemini.** Dá pra testar sem cadastrar cartão.

> **Atenção que economiza dor de cabeça:** assinar o ChatGPT Plus ou o Gemini Advanced **não** libera isso. O acesso por aplicativo e o acesso por chave (API) são coisas separadas, com cobrança separada.

---

## Passo a passo — Gemini (o mais fácil)

1. Entre em **aistudio.google.com/apikey** com sua conta Google
2. Clique em criar chave de API e copie o que aparecer
3. Abra o arquivo `.env` na raiz do seu negócio — a mesma pasta do `CLAUDE.md`
4. Cole numa linha, assim:

```
GEMINI_API_KEY=cole-a-chave-aqui
```

5. Salve. Pronto — é só me pedir a imagem que eu uso.

## Passo a passo — OpenAI

1. Entre em **platform.openai.com/api-keys**
2. Crie uma chave (começa com `sk-`) e copie **na hora** — ela não aparece de novo
3. Adicione crédito em platform.openai.com/settings/organization/billing
4. Cole no `.env` da raiz:

```
OPENAI_API_KEY=sk-cole-a-chave-aqui
```

---

## Detalhes que evitam confusão

**Sem aspas, sem espaço.** `GEMINI_API_KEY=abc123` — não `GEMINI_API_KEY = "abc123"`.

**Onde fica o `.env`.** Na raiz do seu negócio, ao lado do `CLAUDE.md`. Se não existir, é só criar com esse nome (com o ponto na frente).

**A chave não vaza.** O `.env` é ignorado pelo git — ele nunca vai pro GitHub junto com o resto do trabalho.

**Os dois configurados?** Sem problema. Por padrão uso a OpenAI; pra fixar o outro, adicione no `.env`:
```
IMAGEM_PROVEDOR=gemini
```

**Quer usar outro gerador** (Midjourney, Leonardo, Firefly, o que você já paga)? Não tem integração e não vale montar uma. Gere a imagem lá e me passe o arquivo — o resultado nas peças é idêntico.

---

## Como testar se funcionou

Da raiz do seu negócio:

```bash
node scripts/gerar-imagem.js "Professional photo of a wooden table with morning light, editorial quality, no text, no watermark" "teste.png"
```

Deu certo: aparece `✓ Salvo: teste.png`. Deu errado: a mensagem diz o que fazer.

---

## Quando dá erro

| Mensagem | O que é | Conserto |
|---|---|---|
| `Nenhuma chave configurada` | o `.env` não tem chave nenhuma | seguir o passo a passo acima |
| `API key not valid` / `401` | chave errada, incompleta ou com espaço | copiar de novo, colar sem aspas |
| `429` | cota diária do gratuito acabou, ou falta crédito | esperar o dia seguinte (Gemini) ou adicionar crédito (OpenAI) |
| `400` com texto sobre política | o prompt pediu algo não permitido | tirar pedido de pessoa real, marca, logo ou personagem |
| `404` modelo não encontrado | o nome do modelo mudou | usar `--modelo` com um nome atual da documentação do provedor |

---

## O que o ContexOS não faz com imagem gerada

- **Rosto identificável, pessoa real, marca ou personagem** — recusa da API, e risco de direito de imagem
- **Passar foto de IA como foto real do negócio** (produto, equipe, fachada). Se é pra parecer real, é foto real. Foto de IA serve pra fundo, clima, conceito e ilustração de apoio
- **Desenhar mascote ou ilustração na hora** pra tapar buraco de imagem — isso sai com cara de clip-art. Sem foto, a peça vai de tipografia, que fica melhor
