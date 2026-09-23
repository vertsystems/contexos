---
name: biblioteca
description: >
  Mantém o índice dos ativos reutilizáveis do negócio em `biblioteca.md`: fotos, depoimentos, dados
  com fonte, cases, copy que funcionou, arquivos de marca. Serve pra reaproveitar em vez de recriar.
  Use quando o usuário disser "onde está aquela foto", "tenho um depoimento de", "cadastrar
  material", "biblioteca", "que dados eu já tenho", "aquele texto que funcionou", ou /biblioteca.
---

# /biblioteca — Índice de ativos reutilizáveis

O que mais custa tempo não é criar. É recriar o que já existia e ninguém achou. Um depoimento ótimo perdido num print de WhatsApp de oito meses atrás vale zero.

## Dependências

- **Índice:** `biblioteca.md` na raiz (criar na primeira execução)
- **Onde os arquivos moram:** `identidade/`, `conteudo/`, `dados/`, `clientes/` (conforme a convenção do workspace)
- **Saída:** o próprio `biblioteca.md`

---

## Formato do índice

```markdown
# Biblioteca
*Atualizado em <YYYY-MM-DD>*

## Depoimentos
| Quem | Contexto | Trecho | Onde está | Autorizado |
|---|---|---|---|---|
| Maria (Padaria X) | pós-compra, 03/2026 | "Nunca mais perdi um lote" | dados/depoimentos/maria.png | sim |

## Dados e números
| Dado | Valor | Data | Fonte | Onde usei |
|---|---|---|---|---|
| Perda média por conservação errada | 12% do lote | 2025 | Abras | carrossel 03/06, proposta Acme |

## Fotos e imagens
| O que é | Arquivo | Direitos | Boa pra |
|---|---|---|---|
| Fachada da loja | dados/fotos/fachada.jpg | própria | capa de carrossel, GMB, landing |

## Cases
| Cliente | Problema → resultado | Pode citar o nome | Onde está |
|---|---|---|---|

## Copy que funcionou
| Peça | Trecho | Por que funcionou | Onde está |
|---|---|---|---|
| Carrossel 03/06 | "Congelar não conserva. Só pausa." | 4 mensagens no direct | conteudo/... |

## Arquivos de marca
| O que | Arquivo |
|---|---|
| Logo principal | identidade/logo.svg |
| Tokens | identidade/tokens.css |
```

---

## Workflow

### Cadastrar (`/biblioteca` com um item)

O usuário chega com um print, uma frase, um arquivo, um dado. Registrar na tabela certa. Preencher o que der e perguntar **só o essencial**:

- Depoimento → "Posso citar o nome dele?" Sem termo, a coluna fica `pendente`, e o `/autorizacao` preenche depois com a data e o caminho do termo (essa coluna evita problema depois)
- Foto → "É foto sua ou de banco/terceiro?" (direitos)
- Dado → fonte e data, sempre
- Case → "Pode citar o nome do cliente ou fica anônimo?"

Se o arquivo estiver solto em `dados/`, mover pra pasta permanente (`identidade/` pra material de marca, `conteudo/` pra peça, ou `clientes/<Nome>/` se for de cliente) — `dados/` é entrada temporária e nem vai pro repositório.

### Consultar (`/biblioteca` com uma pergunta)

"Tenho depoimento de padaria?", "que número eu tenho sobre perda?", "tem foto de fachada?" → responder direto do índice, com o caminho do arquivo, e sinalizar se tem autorização de uso.

### Varredura (`/biblioteca` sem argumento, primeira vez)

Varrer o workspace procurando ativo não catalogado: imagem em `dados/`, depoimento dentro de `avaliacoes-google/`, número com fonte nos dossiês de `pesquisa/`, case dentro de `clientes/*/caso.md`, copy das peças que o `/revisao-semanal` marcou como boas.

Mostrar o que achou. Perguntar o que entra:

> "Achei 14 ativos não catalogados: 6 fotos, 3 depoimentos (2 sem autorização registrada),
> 4 dados com fonte e 1 case. Cadastro todos?"

### Alimentar outras skills

Quando `/carrossel`, `/proposta`, `/landing` ou `/documento` precisarem de prova (depoimento, número, foto, case), a biblioteca é o primeiro lugar a consultar. Antes de pedir ao usuário, e muito antes de inventar.

---

## Regras

- **Autorização é coluna obrigatória** em depoimento, case e foto de pessoa. Sem "sim" registrado, a peça não usa
- Dado sem fonte e data não entra
- Índice aponta pra arquivo, não guarda cópia — nada de duplicar imagem em três lugares
- Não catalogar tudo: ativo que nunca vai ser reusado só polui. Se está em dúvida, não entra
- Ativo que envelheceu (preço antigo, foto de fachada reformada, dado de 5 anos) fica marcado como `desatualizado` em vez de apagado
- Foto de banco de imagens: registrar a licença. Foto de cliente: registrar autorização
- Dado de pessoa (nome + contato de quem deu depoimento) fica no índice, mas não vai pra peça pública sem autorização
