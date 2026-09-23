# Relatório mensal de cliente — método, contrato do JSON e o que o cliente lê

Referência do `/relatorio-cliente`. Não é o workflow: é o que a skill consulta pra decidir
o que entra no relatório, como se escreve cada frase, o que o `numeros-AAAA-MM.json`
precisa ter e o que o `scripts/relatorio-cliente.js` faz com ele. O molde visual é o
`relatorio-cliente.html` nesta mesma pasta.

---

## Por que cinco frases, e não um dashboard

O dono de padaria, clínica ou loja não abre o Gerenciador de Anúncios. Ele abre o e-mail
da agência no celular, lê dez segundos, e decide se o contrato continua. O que ele quer
saber cabe em cinco perguntas, sempre as mesmas, sempre na mesma ordem:

| Frase | A pergunta do cliente | O que precisa ter | O que não pode ter |
|---|---|---|---|
| **O que foi feito** | "Vocês trabalharam?" | Verbo no passado, quantidade, nome da peça | Adjetivo ("ótimos posts"), processo interno |
| **O que mudou** | "Deu resultado?" | Número deste mês contra o mês anterior, do JSON | Número que não está na tabela |
| **Por quê** | "Foi vocês ou foi sorte?" | A causa mais provável, dita como hipótese quando é hipótese | Certeza inventada; jargão (CTR, CPM) |
| **O que vem** | "E agora?" | Ação com mês e dependência ("depende da sua aprovação") | Promessa de resultado |
| **Precisa de você** | "O que eu tenho que fazer?" | Item, prazo, onde está o arquivo | Mais de três pedidos |

A formulação vem de um guia de skills de marketing da Ryze, que descreve o relatório
mensal como "o mês em cinco frases em linguagem simples que o dono de fato lê", com cada
afirmação amarrada a um número (https://www.get-ryze.ai/blog/claude-marketing-skills-complete-guide,
conferido em 23/09/2026). É a prática de uma empresa, não norma de mercado nem pesquisa.
O que a skill acrescenta é a regra de origem: aqui o número sai de arquivo, não da conversa.

### Como cada frase soa em português de dono

Errado, com cara de agência:

> Otimizamos a estratégia de mídia paga, alcançando um CPL 15% mais eficiente e ampliando
> o engajamento orgânico.

Certo, com cara de gente que trabalhou:

> Rodamos duas semanas de anúncio da promoção de pães e publicamos oito posts. Chegaram
> 40 contatos no WhatsApp, contra 31 em julho, e cada contato custou R$ 30 em vez de
> R$ 35,48.

A diferença: verbo concreto, número com vírgula, mês nomeado, nada que o cliente
precise traduzir. Se o cliente já usa "CPL" na conversa (o `_memoria/publico.md` ou o
`briefing.md` dele diz), a sigla pode entrar entre parênteses. Nunca como a palavra principal.

Vale pro rótulo da tabela também. O script escreve "Contatos recebidos", não "leads";
quando a palavra do cliente é outra ("orçamentos", "encomendas", "agendamentos"), trocar
o `rotulo` da métrica no JSON resolve, e o relatório inteiro passa a falar a língua dele.

---

## Contrato do `numeros-AAAA-MM.json`

Um arquivo por cliente por mês, em `relatorios/` dentro da pasta do cliente. O script
cria o esqueleto (`coletar`), o assistente e o usuário preenchem, o script confere
(`validar`), compara (`comparar`) e monta o HTML (`html`).

```json
{
  "cliente": "Padaria São João",
  "mes": "2026-08",
  "metricas": {
    "leads": { "valor": 40, "fonte": "campanhas/relatorios/2026-08-28-relatorio.md" },
    "vendas": { "valor": null, "fonte": null },
    "visitas_landing": { "valor": 812, "fonte": "medicao/leitura-2026-08.md",
                         "rotulo": "Visitas na página da promoção", "unidade": "un", "melhor": "maior" }
  },
  "entregas": [ { "peca": "carrossel-paes-2026-08-12", "caminho": "conteudo/carrossel-paes-2026-08-12",
                  "data": "2026-08-12", "arquivos": 4, "imagem": "conteudo/carrossel-paes-2026-08-12/1.png",
                  "estado": "publicado" } ],
  "texto": { "feito": "", "mudou": "", "porque": "", "vem": "", "precisa_de_voce": "" },
  "aprovacoes": [ { "item": "Página da promoção", "prazo": "05/09/2026", "caminho": "site/landing-promocao-2026-08-20.html" } ],
  "proximo_mes": [ "Publicar a página da promoção" ]
}
```

Três regras que o `validar` cobra:

1. **Valor é número ou `null`.** `"40"` entre aspas é erro; `null` vira "não medido"
2. **Valor preenchido exige `fonte`**: o caminho do arquivo de onde saiu (relatório do
   `/relatorio-ads`, leitura do `/medir`, fechamento do `/caixa`, print salvo em `dados/`).
   "O cliente me falou no WhatsApp" não é fonte; salvar a mensagem em `dados/` e apontar pra ela
3. **Métrica fora da lista** precisa de `rotulo` e `unidade` (e `melhor`, se não for neutra)

### As métricas que o script conhece

| Chave | Rótulo no relatório | Unidade | Melhora quando | De onde costuma vir |
|---|---|---|---|---|
| `investimento_ads` | Investimento em anúncio | R$ | neutro | frontmatter do `/relatorio-ads` (o `coletar` soma) |
| `alcance` | Pessoas alcançadas | un | sobe | export da Meta |
| `impressoes` | Vezes que o anúncio apareceu | un | sobe | export do Google Ads ou da Meta |
| `cliques` | Cliques | un | sobe | export das plataformas |
| `visitas_site` | Visitas no site | un | sobe | leitura do `/medir` (GA4) |
| `leads` | Contatos recebidos | un | sobe | frontmatter do `/relatorio-ads` (o `coletar` soma) ou `/medir` |
| `conversas` | Conversas iniciadas no WhatsApp | un | sobe | `/medir` (evento `clique_whatsapp`) ou planilha do cliente |
| `cpl` | Custo por contato | R$ | cai | investimento ÷ leads (o `coletar` calcula quando tem os dois) |
| `cpa` | Custo por conversão | R$ | cai | `/relatorio-ads` |
| `vendas` | Vendas | un | sobe | planilha do cliente, `/caixa` do cliente |
| `receita` | Receita atribuída | R$ | sobe | planilha do cliente com coluna `origem` |
| `ticket_medio` | Ticket médio | R$ | sobe | receita ÷ vendas |
| `seguidores` | Seguidores | un | sobe | print do perfil salvo em `dados/` |
| `posts_publicados` | Posts publicados | un | neutro | `conteudo/indice.md` |
| `avaliacoes_google` | Avaliações no Google | un | sobe | perfil da empresa no Google |
| `nota_google` | Nota no Google | nota | sobe | perfil da empresa no Google |

`leads`, `vendas` e `receita` aparecem sempre no relatório, mesmo como "não medido":
são as três que o cliente pergunta, e esconder a linha vazia é o mesmo que fingir que
a pergunta não existe. As outras só entram quando têm valor neste mês ou no anterior.

### Como a comparação é calculada

| Situação | O que o script escreve | Quando |
|---|---|---|
| `não medido` | "não medido" | valor deste mês é `null` |
| `sem base` | "sem base" | não existe `numeros` do mês anterior, ou a métrica não estava lá |
| `de zero` | "de zero" (sem porcentagem) | mês anterior era 0 e este é maior. Dividir por zero não dá porcentagem, e "+∞%" não é frase |
| `igual` | "igual" | mesma coisa nos dois meses |
| `variou` | "+9 (+29,0%)" | variação = (atual − anterior) ÷ \|anterior\| |

O sentido (verde ou vermelho) segue o campo `melhor`: custo que cai é verde, seguidor
que cai é vermelho, investimento que muda é preto. O script decide isso; a frase
"o que mudou" só repete o que a tabela mostra.

Quem entra na tabela: a métrica com valor neste mês, a que teve valor no mês anterior
(sai como "não medido", inclusive as que o próprio cliente criou) e `leads`, `vendas` e
`receita`, sempre. A métrica que nunca teve valor em nenhum dos dois meses fica só no
JSON, esperando dado. A regra existe por um motivo específico: linha que desaparece da
tabela é a forma mais silenciosa de esconder um número que piorou.

---

## O que entra em "Precisa de você"

Lista curta, com prazo e caminho. É a seção que mais segura contrato, porque transfere
a espera pro lado certo: se a peça está parada, o relatório diz desde quando e por quem.

| Entra | Não entra |
|---|---|
| Peça pronta esperando ok (com o caminho do arquivo) | "Pensar na estratégia do próximo trimestre" |
| Dado que só o cliente tem (quantas vendas fecharam, quantos ligaram) | Pedido sem prazo |
| Acesso que falta (Gerenciador, GA4, Google Meu Negócio) | Mais de três itens; o quarto vai pra reunião |
| Decisão com data (renovar orçamento, trocar a promoção) | Cobrança de boleto (isso é `/cobranca`) |

O prazo é dia útil e vem com dia da semana, calculado pelo script a partir do `br.js`.
Item sem prazo o `validar` recusa como erro; prazo em sábado, domingo ou feriado vira
aviso, com o próximo dia útil já sugerido. Acima de três itens, o script avisa também:
a lista longa não é aprovada, é adiada inteira.

---

## O e-mail de envio

O script escreve `relatorios/email-AAAA-MM.md` com assunto, as cinco frases, os quatro
números que mais pesam e a lista de aprovação em caixa de marcar. O assistente revisa
a voz (`_memoria/preferencias.md`) e o usuário envia; a skill não envia nada.

"Que mais pesam" tem ordem fixa, e ela é a do dono: contato, conversa, venda, receita,
custo por contato, custo por conversão, visita, ticket, investimento. Resultado primeiro,
esforço depois. Cada linha sai como `Contatos recebidos: 40 (+9, +29,0%)`: valor deste
mês, diferença e porcentagem, os mesmos da tabela do relatório.

Assunto que funciona: `<Cliente>: relatório de <mês> e <N> itens pra você aprovar`. O
"pra você aprovar" no assunto faz o e-mail ser aberto no mesmo dia; "relatório mensal"
sozinho fica pra sexta.

---

## Checklist antes de mandar

- [ ] `node scripts/relatorio-cliente.js validar` sem erro
- [ ] Nenhuma frase cita número que não está na tabela
- [ ] "Não medido" aparece onde não houve dado; nenhum "aproximadamente"
- [ ] Toda peça listada tem estado (publicado, aguardando aprovação, em produção)
- [ ] Aprovação tem prazo em dia útil e caminho do arquivo
- [ ] Marca do cliente na capa e a da agência no rodapé (o script avisa qual entrou como texto)
- [ ] `node scripts/verificar.js html` e `node scripts/gerar-pdf.js` rodaram e o PDF abriu com as imagens
- [ ] Nada de dado pessoal de cliente final (nome, telefone, CPF) no relatório: o cliente da agência recebe contagem, não lista

---

## Erros que aparecem todo mês

**Comparar semana com mês.** O `/relatorio-ads` é semanal; somar quatro relatórios dá
28 dias, não o mês. O `coletar` soma os relatórios cujo `periodo_fim` cai no mês. Se a
última semana atravessa o mês, o número fica um pouco deslocado, e o texto diz isso em
uma linha em vez de ajustar na mão.

**Copiar o número da tela.** Print salvo em `dados/` é fonte; número lido de uma tela e
digitado de memória não é. A diferença aparece quando o cliente abre o Gerenciador e
acha outro valor.

**Arquivo velho virando peça do mês.** O `coletar` acha as peças pela data no nome; quem
não tem data entra pela data de modificação, que muda quando alguém só abriu e salvou.
Conferir a lista antes de gerar o HTML, e nomear peça com data (`post-2026-08-14.png`)
pra acabar com o problema na origem.

**Chamar conversão de contato.** O `/relatorio-ads` grava `conversoes_total`, e o que é
uma conversão depende do que foi configurado na plataforma: pode ser mensagem no
WhatsApp, cadastro ou compra. Entra como contato por padrão; se for compra, o valor vai
pra `vendas` e o custo pra `cpa`, senão o relatório conta a mesma venda duas vezes.

**Escrever "por quê" como certeza.** "O custo caiu porque trocamos a foto" é hipótese
com um dado. Escrever "a queda coincide com a troca da foto na segunda quinzena; em
setembro vamos manter a foto pra confirmar". O cliente confia mais em quem sabe o que
não sabe.

**Esconder o mês ruim.** Contato caiu, custo subiu: a frase "o que mudou" diz isso com
o número, e "por quê" diz a causa provável e o que muda. Relatório que só mostra o que
subiu é o primeiro que o cliente para de ler.
