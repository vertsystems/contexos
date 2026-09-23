---
name: analisar-dados
description: >
  Analisa um arquivo de dados (CSV, Excel, TXT, JSON) e gera um resumo executivo
  com os principais insights, tendências e recomendações.
  Use quando o usuário disser "analisa esse arquivo", "o que mostram esses dados",
  "resume esses resultados", "analisa esse relatório", ou arrastar um arquivo de dados.


---

# /analisar-dados — Análise de Arquivo

> **Convenção de pastas:** os caminhos desta skill seguem a convenção **por tipo** (todo perfil que não é freelancer nem agência). Se o `CLAUDE.md` do workspace usa a convenção **por cliente** (freelancer e agência) e a peça é de um cliente, prefixar com `clientes/<Nome>/`. A pasta nasce só na hora de salvar.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` (pra entender o que os dados representam)
- **Tom de voz:** `_memoria/preferencias.md`

---

## Workflow

### Passo 1 — Entender o contexto

Antes de analisar, perguntar se não estiver claro:
- "O que é esse arquivo? (vendas, anúncios, métricas, respostas de pesquisa...)"
- "Qual é a pergunta principal que você quer responder com esses dados?"

Se o contexto estiver óbvio pelo nome do arquivo ou pelo conteúdo, prossegue sem perguntar.

### Passo 2 — Ler o arquivo

Ler o arquivo fornecido. Se for Excel (.xlsx), ler com `node scripts/gerar-planilha.js --ler <arquivo> --json` (abre cada aba sem depender de programa instalado).

### Passo 3 — Análise

Identificar e reportar:

**O que está bom:**
- Métricas acima da média ou em crescimento
- Padrões positivos nos dados
- Top performers (produtos, campanhas, períodos, etc)

**O que preocupa:**
- Quedas, anomalias ou tendências negativas
- O que está abaixo do esperado
- Gargalos ou desperdícios visíveis

**Comparações:**
- Período atual vs período anterior (se houver)
- Top vs bottom performers
- Distribuição entre categorias

**Insights não óbvios:**
- Correlações interessantes
- Padrões que não aparecem na leitura superficial

### Passo 4 — Output

Gerar um resumo executivo em prosa (não só bullet points):

```markdown
# Análise — [Nome do Arquivo/Relatório]
*[Data da análise]*

## O que esses dados mostram
[2-3 parágrafos com o panorama geral]

## O que está funcionando
[lista com contexto]

## O que merece atenção
[lista com contexto]

## 3 recomendações
1. [ação concreta]
2. [ação concreta]
3. [ação concreta]

## Números-chave
| Métrica | Valor | Contexto |
|---------|-------|---------|
| ... | ... | ... |
```

Salvar em `analises/analise-<nome>-<YYYY-MM-DD>.md` (criar a pasta se não existir). Se o arquivo analisado for de um cliente específico, salvar em `clientes/<Nome>/analises/` em vez disso.

Perguntar se quer exportar o resumo em HTML pra compartilhar ou apresentar.

---

## Fechar a conta (obrigatório)

Tabela cuja soma não bate com o resumo é o erro mais comum e o mais custoso: quem lê confia no número e decide errado. Em teste real, a tabela somava 6 fechamentos e R$ 24.700 enquanto o resumo dizia 7 e R$ 26.500.

Depois de escrever a análise:

```bash
node scripts/verificar.js tabela analises/<arquivo>.md
```

Ele soma cada coluna e compara com o total declarado: seja na linha "Total" da própria tabela, seja no texto ao redor.

**Duas tabelas, dois papéis:** a de **números-chave** (`| Métrica | Valor | Contexto |`) tem uma métrica por linha e não soma, o verificador reconhece pelo cabeçalho "Métrica" e pula. A de **quebra por categoria** (`| Origem | Conversas | Fechou | Receita |`) soma, e é nela que o erro aparece. Se sua tabela soma, o cabeçalho da primeira coluna deve nomear a categoria (Origem, Canal, Produto), não "Métrica". Se acusar divergência, **refazer a conta a partir do dado bruto**, não ajustar o número pra bater.

E antes disso, ao extrair os números do arquivo original: conferir linha a linha em vez de estimar. Se a fonte é CSV, contar com comando (`grep -c`, `awk`), não de cabeça.

## Escolher o gráfico certo

Quando a análise pede visual, a forma segue a pergunta, não o gosto:

| A pergunta é | Forma |
|---|---|
| Como evoluiu no tempo? | linha |
| Quem é maior? (poucas categorias) | barra horizontal, ordenada por valor |
| Qual a composição? | barra empilhada ou 100% empilhada |
| Como se distribui? | histograma |
| Duas coisas andam juntas? | dispersão |
| Qual o valor único que importa? | o número grande, sem gráfico |

Regras que evitam gráfico ruim:
- **Nada de pizza com mais de 3 fatias** — o olho não compara ângulo. Barra ordenada sempre lê melhor
- **Eixo Y começa no zero** em gráfico de barra. Cortar o eixo exagera diferença e é enganoso
- **Ordenar por valor**, não por ordem alfabética
- **Rótulo direto no dado**, quando cabe — melhor que legenda que obriga a ida e volta
- **Uma cor** e um destaque. Cor por categoria só quando a categoria é a informação
- Se o dado é uma comparação de duas coisas, uma frase resolve melhor que um gráfico


## Regras

- Análise em prosa, não só listas — o usuário deve poder ler e entender sem abrir o arquivo original
- Nunca inventar dados que não estão no arquivo
- Se os dados estiverem incompletos ou com problemas, mencionar antes de analisar
- **Formato numérico brasileiro:** vírgula é decimal e ponto é milhar (`1.234,56`). Normalizar antes de somar ou comparar, e conferir se o total faz sentido na ordem de grandeza
- Correlação não é causa. Ao apontar padrão, dizer que é padrão observado — não afirmar que uma coisa causou a outra
- Se o arquivo tiver dado pessoal de terceiro (nome + CPF, telefone de cliente, e-mail de lista), avisar e não reproduzir esses dados no resumo. Trabalhar com agregado
- Se o arquivo for relatório de vendas de PDV e a pergunta for o que comprar, em quantos dias o estoque acaba ou o que está encalhado, chamar o `/estoque`: aqui sai resumo do arquivo, lá sai ponto de pedido, cobertura e dinheiro parado calculados por comando
- Tom conforme `_memoria/preferencias.md`
