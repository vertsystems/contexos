# Manutenção — o sistema depois que ele existe

Referência da skill `/backend`. O que se faz com um sistema que já roda: o seu, o que você
herdou de outra pessoa, e o que alguém construiu antes de sumir. Quanto isso custa por mês
está em `templates/software/custo.md`.

> **O que não está aqui.** A hora da queda tem arquivo próprio, `templates/backend/incidente.md`.
> A conta mensal e as quatro caixas em que cai todo pedido do cliente depois da entrega
> (problema, melhoria, alteração, funcionalidade nova) estão em `templates/software/custo.md`,
> seção "O que o cliente pede depois da entrega".

---

## Projeto novo já é manutenção desde o segundo dia

Existe uma separação confortável entre construir e manter. Ela não sobrevive à primeira
semana. A primeira funcionalidade nasce em terreno limpo; a segunda já é enxertada em
código vivo, com dado gravado dentro e alguém usando do outro lado. O gesto é o mesmo da
manutenção: ler o que existe, entender por que ficou assim, mexer sem derrubar o resto. Só
o código está mais novo.

Isso muda o que se decide no primeiro mês. A pergunta deixa de ser qual é a forma mais
elegante de resolver, e passa a ser quem vai abrir este arquivo em março, com pressa, com
o telefone tocando. Em negócio de 1 a 10 pessoas a resposta costuma ser você mesmo, num
domingo à noite. Escreva para essa pessoa.

O nível de técnica se calibra por quem mantém, nunca pelo seu gosto:

| Quem mantém daqui a um ano | O que isso autoriza |
|---|---|
| Você, e você acompanha a linguagem | técnica nova sem freio, com a decisão escrita em `DECISOES.md` |
| O dono, ou um programador que ele contrata por hora | o comum e o previsível; novidade entra uma por entrega, explicada antes |
| Ninguém | menos peças, menos serviço pago, nada que exija visita mensal para continuar de pé |

Um padrão bem aplicado que trava uma correção urgente porque ninguém no cliente entende o
paradigma não é um padrão bem aplicado. O episódio termina em proibição permanente de
qualquer prática nova, e a proibição dura anos.

**Nunca estreie tecnologia no sistema que o cliente paga.** Experimente fora, no seu tempo,
e leve para o trabalho pago só o que já rodou em outro lugar. A exceção é não haver
alternativa madura, e aí o risco entra no combinado por escrito, com prazo e custo à vista.

E "é só uma pessoa que usa" não autoriza entrega pela metade. A regra do negócio muda toda
semana, e a sala de uma pessoa vira o processo de seis sem avisar ninguém.

---

## O inventário do que só uma pessoa entende

Ser insubstituível parece proteção. É defeito. Do lado de quem constrói, cria uma relação
hostil com quem paga. Do lado do dono, produz refém: cada mudança de um número vira espera,
e a espera vira desistência de mudar o que o negócio pedia.

O conserto é uma lista, e a lista se ataca item por item.

| O que só uma pessoa faz | Por que só ela | Vira o quê |
|---|---|---|
| Publicar uma versão | a sequência está na cabeça dela | um script único, com os passos na ordem |
| Fechar o relatório do mês | roda uma planilha na máquina dela | rotina dentro do sistema, ou script no repositório |
| Mexer no cálculo da comissão | é o trecho que ninguém mais leu | parâmetro que o dono edita, e uma página explicando a regra |
| Entrar no provedor | a conta está no e-mail pessoal dela | conta no nome do dono, com acesso dado a quem trabalha |
| Restaurar o backup | nunca foi feito por outra pessoa | roteiro escrito, executado uma vez por quem não escreveu |

Cada item vira uma de três coisas: um arquivo que explica, um script que executa, ou um
parâmetro que dispensa o programador. Nada de quarta categoria.

Para achar os candidatos no código, conte autores por arquivo em vez de confiar na memória:

```bash
# arquivos que só uma pessoa tocou no último ano
for f in $(git ls-files); do
  n=$(git log --since="1 year ago" --format="%an" -- "$f" | sort -u | wc -l)
  [ "$n" -eq 1 ] && echo "$f"
done
```

O resultado não é a lista pronta: arquivo pequeno e estável aparece ali sem ser problema.
É a peneira. Cruze com o que o negócio não pode perder e você tem a lista de verdade.

**A regra de fechamento:** o item só sai da lista quando outra pessoa executou o que está
escrito, sozinha, sem perguntar nada, com quem sabe olhando calado. Enquanto a passagem
depender de uma frase dita na hora, o item continua aberto. Refaça a lista quando alguém
entra ou sai, e uma vez por ano quando não entrar nem sair ninguém.

---

## Os primeiros dias num sistema herdado

Recebeu um sistema que você não escreveu. Antes de mudar qualquer coisa, na ordem:

1. **Subir na sua máquina.** Enquanto ele só roda no servidor, toda tentativa sua acontece
   em produção.
2. **Ter o dado na mão.** Um backup restaurado por você, não a promessa de que existe backup.
3. **Publicar uma mudança invisível e desfazê-la.** Troque uma palavra do rodapé, publique,
   volte atrás, cronometre. O roteiro está em `templates/backend/versoes.md`, seção "Desfazer".
4. **Perguntar as convenções antes da primeira linha.** Como se nomeia, onde mora cada
   coisa, como se testa. Sem ninguém para perguntar, leia três arquivos do mesmo tipo e
   escreva a convenção que você encontrou.
5. **Segurar o comportamento com o teste que der.** No nível mais alto que funcionar: pela
   tela, pela rota, feio mesmo. Andaime existe para a obra e vai embora com ela.

Você não herdou o sistema no dia em que recebeu a senha. Herdou no dia em que publicou uma
mudança e conseguiu desfazer.

Vai encontrar trecho que ninguém entende e ninguém quer tocar. Decida de propósito o que
fazer com ele: ou escreve o teste que descreve o que aquilo faz, ou aceita que a próxima
mudança ali custa reescrever o bloco inteiro. As duas saídas são legítimas e as duas viram
fatura. O que não vale é descobrir isso no meio de uma urgência.

---

## Melhor que ontem

Em base herdada e ruim, com o dinheiro curto que negócio pequeno tem, a reescrita não está
no cardápio. O que existe é outra coisa: **toda visita deixa um pouco melhor o arquivo que
você já tinha que abrir.** Uma coisa por visita, dentro do trabalho já contratado.

Conta como melhoria:

- um nome que mentia, corrigido
- a duplicação que você acabou de criar, extraída antes de virar a terceira
- a mensagem de erro genérica que passou a dizer qual campo está errado
- o valor cravado no código que virou parâmetro
- o teste que estava vermelho há meses e ninguém consertou

Não conta: abrir cinco arquivos sem relação com o chamado. Reforma de fim de semana começa
sempre assim, com a melhor das intenções e um sábado inteiro livre.

Também não vale pedir ao dono que priorize melhoria técnica. "Refatorar o cadastro de
usuário" nunca ganha de "editar dados do cliente" numa fila que ele ordena, e a conversa se
repete toda semana pelo resto do projeto. Duas saídas honestas: embutir o trabalho na
tarefa de negócio que depende dele, ou traduzi-lo em risco com data e consequência.

**Meça, melhore, meça.** Escolha uma medida que você consegue coletar de novo do mesmo
jeito: tempo da tela mais usada, chamados por mês, minutos até o sistema voltar. Tire a
linha de base antes de mexer. Mostre o antes e o depois ao dono. Sem a segunda medição,
"melhorou" é impressão, e impressão não sustenta a próxima fatura.

---

## Consertar ou refazer

Reescrever é exceção, não etapa do ciclo. Chegar ao ponto de "ou reescreve, ou não evolui
mais" já é o sintoma de que ninguém melhorou nada por um bom tempo. E a decisão é do
negócio, não de quem escreve: o tempo da reescrita é tempo em que o produto não anda para
quem usa.

Some os dois lados em horas de gente. A conta do servidor é a menor linha dessa decisão.

| O que somar | Consertar | Refazer |
|---|---|---|
| Horas até o próximo pedido do dono estar no ar | poucas | nenhuma, até a virada |
| Horas por mês contornando o problema | continuam | zeram depois |
| Horas para o sistema voltar a fazer o que já faz | zero | tudo, inclusive o que ninguém lembra que existe |
| Horas de quem usa, durante a virada | zero | treino, erro e desconfiança |

O número que decide sai de uma divisão:

```bash
# em quantos meses a reconstrução daquele pedaço se paga
node -e 'const recon=120, contorno=8; console.log((recon/contorno).toFixed(1)+" meses")'
```

Troque os dois pelos seus. `recon` são as horas para reconstruir aquele pedaço; `contorno`
são as horas que o mês passado consumiu contornando ele. Se você não tem o segundo número,
você não tem a decisão: anote as horas por um mês e volte a conversar depois.

Três regras fecham o assunto:

- **Reconstrua o pedaço, nunca o sistema.** O pedaço tem prazo próprio e prova própria.
- **Refazer com comportamento diferente não é refazer.** É um sistema novo usando o nome do
  antigo, e o dono descobre isso na virada. Quando a reescrita é bem feita, quem usa não
  percebe nada além de melhora.
- **Não vire a base inteira de uma vez.** Um grupo pequeno primeiro, e o resto depois que
  ele passar uma semana sem reclamar.

---

## O valor que o dono muda sozinho

A regra está em `templates/backend/cadastro.md`, seção "O que o dono muda sem pedir a
ninguém": o que o negócio pode querer mudar sai do código e vai para um lugar que o dono
edita. Aqui interessam os dois lados que sobram dela.

**O que não vira parâmetro.** Valor técnico cuja mudança obriga a revisar a lógica em volta
fica no código: tamanho de lote, tempo máximo de espera, chave de integração. Vai como
constante com nome que diz o papel dela no processo, nunca o conteúdo. Constante batizada
com o próprio valor passa a mentir no dia em que o valor muda, e a partir daí ninguém
confia em nenhuma outra.

**O freio.** "A gente coloca como opção na configuração" não é resposta para todo pedido.
Cada opção é uma funcionalidade completa: precisa de motivo escrito, de gente que use e de
teste nas combinações que ela cria. Tela de configuração comprida é onde o suporte passa o
dia. A pergunta que decide é curta: se ninguém marcar isso, o que quebra?

Todo parâmetro que existe entra na lista da passagem de bastão. Parâmetro que só o
programador sabe que existe é código com outro nome.

---

## O desenvolvedor está saindo

Isso vale para o freelancer que encerra o contrato, para a agência que perdeu a conta e
para o próprio ContexOS. O dono precisa terminar dono do que foi feito.

| O que exigir | Como se prova que foi entregue |
|---|---|
| Repositório | a conta é do dono; você clona do zero em outra máquina e o sistema sobe |
| Segredos | lista do que existe e onde mora, com os valores fora do repositório |
| Contas pagas | domínio, hospedagem, banco, envio de e-mail, loja de aplicativo, todas no e-mail do dono |
| Backup | uma cópia restaurada na frente dele, com o dado aparecendo na tela |
| Publicar | roteiro escrito, executado por quem não escreveu o roteiro |
| Voltar atrás | o mesmo, cronometrado uma vez |
| Alertas | quem recebe, por qual canal, o que faz quando chega |
| Parâmetros | onde ficam e o que cada um muda |
| Decisões | por que a solução é essa, e o que foi tentado e não deu certo |

```bash
node scripts/verificar.js segredo .   # nenhuma chave ou senha no que está versionado
```

O documento da última linha registra decisão, não listagem. Descrição campo a campo nasce
errada na primeira mudança e não explica nada sobre o funcionamento. Meia página com os
porquês vale mais que trinta com a lista de telas, e é a única parte que quem chega vai
ler até o fim.

A passagem de bastão não termina numa reunião de duas horas. Termina quando outra pessoa
publica uma versão seguindo o que está escrito, com quem está saindo do lado, calado.

---

## Armadilhas

### O sistema que só sobe na máquina de uma pessoa

**Sintoma:** alguém clonou o projeto, seguiu o passo a passo e não conseguiu rodar. Quem
sabe resolve em dez minutos, no ombro, e ninguém anota o que foi feito.
**O que custa:** o sistema está de pé por causa de passos que moram na memória de uma
pessoa. Enquanto ela estiver por perto, ninguém sabe quantos são.
**Conserto:** a prova destrutiva de `templates/backend/versoes.md`, seção "A prova de que a
volta existe". Todo passo que faltar vira linha do script de instalação no mesmo dia.

### A reescrita que começou num sábado

**Sintoma:** a fila encheu de melhoria técnica, e o dono passa meses sem ver nada novo.
**O que custa:** ele paga um período inteiro sem enxergar entrega, enquanto o sistema
antigo continua no ar recebendo remendo. Na virada, o usuário encontra telas diferentes e
culpa a reescrita por tudo, inclusive pelo que já era ruim antes.
**Conserto:** recorte um pedaço com prazo próprio e comportamento idêntico. Se o trabalho
não couber num pedaço, ele não cabe agora.

### O documento que descreve campo a campo

**Sintoma:** trinta páginas listando telas e campos, e nenhuma linha dizendo por que o
cálculo é daquele jeito.
**O que custa:** desatualiza na primeira mudança e passa a mentir; quem chega desiste na
segunda página e vai ler o código de qualquer forma. O dono pagou por um documento que
ninguém usa duas vezes.
**Conserto:** meia página de decisões dentro do repositório, atualizada depois de construir.
O detalhe que muda junto com o código mora no código.

### A rotina de precaução que ninguém sabe explicar

**Sintoma:** existe um passo no processo que todo mundo repete porque uma vez alguém teve
um problema. Perguntado o motivo, ninguém sabe.
**O que custa:** tempo em toda entrega, para proteger contra algo que talvez já não exista.
**Conserto:** ache a causa do problema original. Prática cuja razão ninguém consegue
explicar é candidata a sair, numa entrega em que dê para observar o efeito.

---

## Falar com quem está esperando

Quando o erro foi seu, quatro passos, nessa ordem:

1. **Levante assim que souber.** Erro descoberto cedo custa menos que erro descoberto
   tarde, e o dono descobrindo sozinho é o pior dos casos.
2. **Assuma**, mesmo que a culpa não seja só sua. Discutir de quem é atrasa o conserto e não
   devolve nada.
3. **Ofereça a solução.** Se ainda não tiver, ofereça o plano de achá-la, com passo e hora.
4. **Peça ajuda.** Orgulho segurando o problema é o item mais caro dessa lista.

Na hora da queda, com cliente esperando, o roteiro é outro e está em
`templates/backend/incidente.md`, seção "O protocolo pra falar com quem está esperando".

**"Não dá pra gente simplesmente...?"** A palavra que importa nessa frase não é
"simplesmente". É o "a gente": quem pergunta está te colocando dentro do time dele. O não
automático constrói a fama de que você só sabe dizer não, e a partir dali os pedidos chegam
já decididos, sem você. A resposta é "dá, mas não seria boa ideia porque...", seguida da
pergunta que abre o problema de verdade: o que fez isso aparecer agora? Prazo que parece
arbitrário quase nunca é.

Diga não ao compromisso que você sabe que não cumpre. Dizer sim para não decepcionar é
mentir, e a mentira volta em forma de "mais um dia e fica pronto" pela quarta vez. Diga
"não sei" quando não souber. Quando o não é possível, o sim passa a valer alguma coisa.

Relate na língua do negócio. Ninguém aprova "a complexidade daquele método caiu". Aprova-se
"a tela que a Ana abre vinte vezes por dia parou de travar, e foram dois dias". Se você não
consegue escrever o benefício de um item, pergunte ao dono qual é. Se ele também não
souber, o item não deveria estar na lista.

E preste conta de tudo que prometeu. Cada item do plano anterior volta como alcançado,
atrasado, removido ou substituído. Nenhum some. Item que aparece uma vez e nunca mais é
mencionado derruba a confiança no plano inteiro, inclusive na parte que está em dia.

---

## A cada visita ao sistema

- [ ] O que foi pedido por voz virou mensagem escrita, com o que isso empurrou para depois
- [ ] Uma coisa ficou melhor no arquivo que você já ia abrir, e só nele
- [ ] Nenhuma tecnologia foi estreada aqui
- [ ] Nenhum item novo entrou na lista do que só uma pessoa entende, ou entrou com data para sair
- [ ] O valor que o dono pode querer mudar não ficou cravado no código
- [ ] A medida que você prometeu melhorar foi medida de novo, do mesmo jeito
- [ ] `node scripts/verificar.js segredo .` sem achado
- [ ] Cada item do plano anterior foi fechado, e o relato saiu na língua do negócio
