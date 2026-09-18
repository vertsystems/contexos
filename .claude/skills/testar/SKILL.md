---
name: testar
description: >
  Monta a rede de segurança de um sistema que já está no ar sem nenhum teste, pelo que quebra
  caro: dinheiro, cadastro e permissão primeiro, migração de banco depois, o resto só se sobrar.
  Escreve os testes na convenção que o projeto já usa, roda a bateria e deixa por escrito o que
  ficou sem teste e por quê, porque quem paga a bateria é o dono e decidir o que NÃO testar vale
  tanto quanto decidir o que testar.
  Use quando o usuário disser "toda vez que mexem quebra outra coisa", "tenho medo de mexer
  nesse sistema", "como eu sei que não quebrei nada", "quebrou tudo depois da atualização",
  "esse bug já voltou três vezes", "isso aqui tem teste?", "precisa de teste mesmo ou é
  frescura", "o sistema errou o valor da cobrança", ou /testar.
  Durante a construção de algo novo, teste é o Passo 6 do /backend. Auditar um sistema inteiro em
  ordem de custo é /revisar-codigo.
---

# /testar — A rede embaixo do que já está no ar

> **Convenção de pastas:** os testes ficam **dentro do projeto**, na pasta e no padrão de nome que ele já usa (`tests/`, `spec/`, `__tests__/`, ou o arquivo de teste ao lado do código). O `COBERTURA.md` nasce na raiz dessa pasta, junto com o primeiro teste. Esta skill não cria pasta de teste com nome do ContexOS dentro de código que já existe.

O caso normal do cliente pequeno não é um sistema mal testado. É um sistema sem nenhum teste,
já em produção, com o dono conferindo tudo na mão porque não confia. Ele não precisa de uma
bateria completa. Precisa de cinco a dez testes onde o erro custa dinheiro, e de um documento
dizendo o que ficou de fora de propósito. A hora gasta escrevendo teste sai do mesmo bolso que
pagaria a próxima funcionalidade, então a lista do que não vai ser testado é entregue junto,
escrita.

## Dependências

- **Contexto do negócio:** `_memoria/empresa.md` — o que o sistema cobra, guarda e decide, e quem mexe nele depois
- **Prioridades:** `_memoria/estrategia.md` — prazo e orçamento decidem onde a bateria para, mais que qualquer critério técnico
- **Referências** (ler a que o passo pedir, não todas):
  - `templates/backend/entrega.md` — "Testar o que quebra caro": a ordem de prioridade, os três tipos e os exemplos de unidade, integração e migração
  - `templates/backend/testes.md` — o critério para não testar, o desenho de cada teste, a configuração da bateria e a suíte de fumaça
  - `templates/backend/consultas.md` — os defeitos de consulta que rodam, respondem e entregam o número errado
  - `templates/backend/cadastro.md` — o ciclo do cadastro e a validação que também precisa ser restrição no banco
- **Saída:** os testes na pasta do próprio projeto, o `COBERTURA.md` ao lado deles, e a saída da bateria colada na conversa

---

## Workflow

### Passo 1 — Ver o que o projeto já tem, sem supor

A convenção de teste de um projeto se lê. Impor a pasta e a ferramenta de fora é a forma mais
rápida de produzir bateria que ninguém roda:

```bash
ls -d tests test spec __tests__ 2>/dev/null                 # a pasta, se existir
grep -rlE "\b(it|test|describe)\(" --include="*.ts" --include="*.js" \
  --exclude-dir=node_modules . | head                       # arquivo de teste solto
sed -n '/"scripts"/,/}/p' package.json                      # o comando que já existe
ls .github/workflows/ 2>/dev/null                           # roda em algum gatilho?
```

| O que apareceu | Por onde começar |
|---|---|
| Nada | Passo 2. É o caso mais comum, e o mais simples: não há convenção a respeitar, só a linguagem do projeto |
| Bateria que ninguém roda há meses | Rodar antes de escrever qualquer coisa. Vermelho antigo é informação; teste que ninguém sabe explicar se apaga |
| Bateria verde | Passo 2 mesmo assim. O buraco costuma estar no dinheiro, não na função que já tem três testes |

### Passo 2 — Perguntar o que dói, na língua do dono

Três perguntas, e elas produzem a lista inteira:

> 1. "O que, se sair errado, você só descobre quando o cliente liga?"
> 2. "Que erro já aconteceu e voltou depois de consertado?"
> 3. "Por onde entra e sai dinheiro aqui dentro?"

A segunda pergunta vale mais que qualquer teoria de cobertura. Defeito que já voltou tem
endereço conhecido, e entra na lista com o valor concreto que o causou, nunca com um exemplo
inventado. Ele já provou que volta.

Anotar cada resposta com o custo do lado: cobra a mais, perde o pedido, mostra o dado de um
cliente para outro. É esse custo que ordena a lista, e é ele que o dono entende.

### Passo 3 — Cortar a lista até caber no orçamento

A ordem de prioridade quando o tempo é curto está em `templates/backend/entrega.md`, na seção
"Testar o que quebra caro". O corte por natureza do código está em `templates/backend/testes.md`,
na tabela da seção "Quem paga a bateria é o dono": regra com dinheiro, prazo, desconto ou
permissão entra sempre; leitor de campo, cola de framework e rota sem regra dentro ficam de fora.

**A primeira entrega é de cinco a dez testes, não de uma bateria.** Em sistema que já está no ar,
alvo alto de cobertura é regra que alguém desliga na primeira urgência. Trave o piso no percentual
de hoje e suba a cada bloco de teste que entrar.

Cada item cortado vai para o `COBERTURA.md` do Passo 7, com o motivo em uma linha. Escrito, ele
é decisão. Guardado na cabeça de quem escreveu o código, vira esquecimento em três meses.

### Passo 4 — Escrever na ferramenta e na pasta que o projeto já usa

Nenhuma dependência nova quando o projeto já tem por onde rodar teste. Os exemplos de unidade,
de integração e de migração estão em `templates/backend/entrega.md`; o desenho de cada teste
(nome, asserção, dublê, classe de equivalência) está em `templates/backend/testes.md`.

O que muda o resultado, em qualquer linguagem:

- Nome do teste é comportamento mais cenário: "recusa o pedido quando o estoque é zero"
- A verificação olha o efeito, não o aviso. O registro na listagem, o saldo alterado, o e-mail na fila
- Consulta e gravação se testam contra banco de teste de verdade. Dublar a conexão remove justamente a parte que pode falhar
- Um teste por classe de equivalência, mais os extremos: vazio, um, o limite exato, um além do limite
- Valor concreto que já causou defeito em produção vira teste próprio e fica para sempre

Teste que confere número (relatório, total, comissão) tem uma armadilha própria: a consulta roda,
a tela abre e o número sai errado. Os quinze defeitos dessa família estão em
`templates/backend/consultas.md`, e o teste que fecha o assunto é perguntar a mesma coisa por
dois caminhos e comparar os dois números.

Teste de cadastro segue o ciclo das sete ações de `templates/backend/cadastro.md`. A parte que
mais se esquece está lá na seção "Validar duas vezes, por dois motivos diferentes": unicidade e
obrigatoriedade que importam também são restrição no banco. O framework garante o mecanismo, não
que você declarou a coisa certa.

### Passo 5 — Provar que cada teste sabe falhar

Teste que nasce verde e continuaria verde com a regra apagada não protege nada, e ainda ocupa uma
linha no relatório de cobertura. Antes de dar qualquer teste por pronto, quebre a regra e rode:

```bash
npm test -- -t "recusa o pedido quando o estoque é zero"
```

Não ficou vermelho? Ele não testa nada. A seção "Prove que o teste sabe falhar", em
`templates/backend/testes.md`, tem o resto do método, incluindo o caso em que a bateria inteira
fica verde com o sistema quebrado na mão.

### Passo 6 — Um comando só, e a fumaça depois de publicar

A bateria roda com **um** comando, e ele fica escrito no `COBERTURA.md`. A configuração que
impede a bateria de mentir (ordem aleatória com semente, relógio congelado numa data do passado
e restaurado, rede bloqueada, dado único por execução) está em `templates/backend/testes.md`,
seção "Configuração da bateria". Feita uma vez, vale pelo resto da vida do projeto.

Depois dela vem a suíte de fumaça: cinco a dez casos sobre os caminhos de dinheiro, rodando
contra o ambiente publicado a cada subida. Ela pega o que nenhum teste da sua máquina pega.
Variável de ambiente faltando, migração que não rodou, rota que mudou de endereço. O modelo, e o
motivo de ela render tanto em negócio pequeno, estão na seção "A suíte de fumaça".

### Passo 7 — Escrever o COBERTURA.md

É o único artefato desta skill que o dono lê, e o que responde "isso aqui tem teste?" sem
ninguém abrir código:

```markdown
# Cobertura — <sistema>

Rodar tudo: `npm test`   (leva <N>s, medido em <data>)

## O que está coberto
| O que | Onde | Por que este |
|---|---|---|
| Cálculo da comissão, todos os ramos | tests/comissao.test.ts | erro aqui paga a pessoa errada |
| Cadastro com e-mail repetido | tests/clientes.test.ts | já aconteceu duas vezes |
| Migração 007, com dado dentro e com a volta | tests/migracoes.test.ts | roda em cima de dado real |

## Sem teste, de propósito
| O que | Por que não |
|---|---|
| Tela e formatação | nunca quebrou; no dia em que quebrar, aquele caso vira teste |
| Rota que só chama o serviço | o defeito ali é de integração, e sai na fumaça |

## Sem teste, por falta de tempo
| O que | O que acontece se quebrar |
|---|---|
| Importação da planilha do fornecedor | entra produto com preço errado, e alguém confere na mão |

Teste que ninguém roda há meses se apaga, não se conserta.
```

### Passo 8 — Rodar e entregar

Rodar a bateria inteira duas vezes seguidas e colar a saída na conversa, com o tempo que ela
levou. "Passou tudo" sem a saída não vale como entrega:

```
✓ [N] testes em <pasta do projeto>
✓ <pasta>/COBERTURA.md — o que está coberto, o que não está, e por quê
✓ Bateria: [N] passando, [N] falhando, em [T]s (saída colada acima)

O que ficou sem teste está escrito, com o motivo. Se um desses itens quebrar
um dia, o conserto começa transformando ele em teste.
```

---

## Medir, não achar (obrigatório)

Quantidade de teste, tempo de bateria e cobertura não se estimam. Saem do comando:

```bash
npm test                       # a bateria passa? (o comando do projeto, não um meu)
npm test && npm test           # passa duas vezes seguidas, sem limpeza na mão?
time npm test                  # quanto tempo alguém espera por isso
npx jest --coverage            # onde nenhum teste passou
grep -rnE "\b(it|test|describe)\.(skip|todo)|\bxit\(" tests/   # o que está desligado

node scripts/verificar.js segredo .     # chave e token em arquivo versionado
node scripts/verificar.js migracao .    # ordem, desfazer, NOT NULL sem DEFAULT
```

O `segredo` importa aqui mais do que em qualquer outro momento do projeto. Resposta de
fornecedor gravada para servir de dublê guarda a URL, o corpo e os cabeçalhos inteiros,
inclusive o de autenticação. Uma vez no histórico do git, vazou.

**Regra:** o número que entra no `COBERTURA.md` é o que o comando imprimiu, com a data em que
ele rodou. Cobertura de memória e tempo "mais ou menos" não entram.

---

## Regras

- **Cinco a dez testes primeiro.** Bateria grande de uma vez é a que ninguém mantém depois que você sai
- **Nunca impor pasta, ferramenta ou nome de arquivo** a código que já existe. A bateria nasce na convenção do projeto, mesmo que ela não seja a que você prefere
- **A decisão de não testar é entregável.** Sem o `COBERTURA.md`, a skill não terminou
- **Teste que às vezes passa e às vezes falha sai da bateria no mesmo dia**, com uma frase dizendo por que saiu. Deixar piscando ensina todo mundo a ignorar o vermelho
- **Cobertura é diagnóstico, não meta.** Ela acha o trecho por onde nenhum teste passou, e nada além disso
- **Contra produção, só o que não escreve nada.** Caso que cria registro roda no ambiente de teste, senão a massa do teste vira dado do cliente
- **Defeito consertado nasce com teste**, escrito com os mesmos dados que o causaram. Sem isso ele volta na próxima refatoração, com a bateria verde
- **Se está difícil testar, o problema é do código.** Conserte a peça em vez de inventar ferramenta para alcançar o que está escondido
- **Nada é publicado por esta skill.** Ela escreve teste, roda a bateria e entrega arquivo. Ligar a fumaça ao gatilho de publicação é decisão do dono, tomada por ele
- Explicar em português o que cada teste protege. O dono decide o que vale a hora, porque a conta é dele
