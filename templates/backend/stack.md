# Escolher a stack

Referência da skill `/backend`. Qual linguagem, qual banco, qual hospedagem: e, mais
importante, quando **não** trocar o que já está funcionando.

---

## O critério que vem antes de todos

**Quem mantém isso depois?** Uma stack que o usuário (ou o próximo desenvolvedor) não
consegue tocar é uma dependência permanente de quem escreveu. Linguagem popular com
documentação farta vence a linguagem elegante que ninguém por perto usa.

Depois disso, na ordem: o time já conhece? tem hospedagem barata? tem biblioteca pro que
o projeto precisa (pagamento, nota fiscal, WhatsApp)?

Benchmark de requisições por segundo é o último critério, não o primeiro. Quase nenhum
sistema de pequeno negócio esbarra no limite da linguagem: esbarra em consulta mal feita.

---

## O degrau antes de escolher a linguagem

Antes de escolher a linguagem, responda duas coisas: **esse sistema tem login? Ele guarda dado
por pessoa?** Se as duas forem não, gere HTML e publique num armazenamento estático. Nem
framework, nem banco. Cardápio, tabela de preço e página de serviço são conteúdo, não sistema,
e com o servidor some quase toda a conta: mensalidade, backup, dependência pra atualizar, porta
aberta. O framework entra na primeira escrita: cadastro, pedido, área com senha.

---

## Linguagens

### Node.js + TypeScript — o padrão seguro

**Bom pra:** quase tudo. Time que já mexe com JavaScript, tempo real (WebSocket), API,
integração, prototipagem rápida. O TypeScript pega erro de tipo antes de rodar e é o que
torna o Node sustentável em projeto que cresce.

**Frameworks:**

| Framework | Perfil |
|---|---|
| **Express** | O mais simples e o mais conhecido. Bom pra API pequena e pra aprender |
| **Fastify** | Parecido com Express, mais rápido, validação de schema embutida |
| **NestJS** | Estruturado, opinativo, com injeção de dependência. Compensa em projeto grande e com time; é peso morto em projeto de um arquivo |
| **tRPC** | Tipagem ponta a ponta quando front e back são TypeScript no mesmo repositório |

### Python

**Bom pra:** qualquer coisa que encoste em dado, planilha, IA ou automação. Também é a
escolha natural quando quem mantém é alguém de dados, não de front.

- **FastAPI** — moderno, assíncrono, gera a documentação da API sozinho a partir dos tipos
- **Django** — vem com tudo (ORM, admin, autenticação). O painel administrativo pronto economiza semanas em sistema interno
- **Flask** — mínimo, monta do jeito que quiser

### Go

**Bom pra:** muita requisição simultânea, ferramenta de linha de comando, serviço que
precisa subir num binário só sem runtime instalado. Deploy é copiar um arquivo.

Frameworks: **Gin**, **Echo**, **Fiber**, ou a biblioteca padrão, que já é boa.

### Rust

**Bom pra:** quando o desempenho é o requisito e o erro de memória é inaceitável.
Frameworks: **Axum**, **Actix-web**.

**Custo real:** curva de aprendizado alta e menos gente disponível pra manter. Escolher
por gosto, num projeto de cliente, é transferir um problema pra ele.

---

## Bancos de dados

### PostgreSQL — o padrão

Transação confiável, integridade garantida pelo próprio banco, consulta complexa, busca
textual, JSONB pra guardar o que não tem forma fixa. Faz o papel de banco relacional e
resolve boa parte do que se procura em NoSQL.

**Escolher quando:** o dado tem relação entre si (cliente tem pedido, pedido tem item),
dinheiro está envolvido, ou você não tem certeza. É o default.

### SQLite

Um arquivo, zero servidor, zero configuração. Aguenta muito mais leitura do que a fama
sugere e é ótimo pra sistema interno, ferramenta local e protótipo. O limite aparece em
escrita simultânea de muita gente.

**Escolher quando:** um usuário por vez, ou leitura predominante, e simplicidade vale mais
que escala.

### MongoDB

Documento sem forma fixa, escala horizontal embutida.

**Escolher quando:** o formato do dado varia de item pra item de verdade (catálogo com
atributos diferentes por categoria, coleta de sensor).

**Cuidado:** dado com relação clara em banco de documento cria junção na mão dentro do
código: o trabalho que o banco relacional faria melhor. A pergunta honesta é "meu dado é
mesmo sem forma, ou eu só não quis desenhar o schema?".

### Redis

Chave-valor na memória. Cache, sessão, contador, limite de requisição, fila simples.

**Não é banco principal:** é memória. Trate o que está lá como descartável — se sumir, o
sistema precisa continuar funcionando (mais devagar).

---

## Camada de acesso ao banco (ORM)

| Ferramenta | Quando |
|---|---|
| **Prisma** (TS) | Tipagem automática e migração inclusa. Ótima experiência de desenvolvimento |
| **Drizzle** (TS) | Sintaxe perto do SQL, leve, tipada. Boa quando você quer enxergar a consulta |
| **TypeORM** (TS) | Maduro, cheio de recurso; mais cerimônia |
| **SQLAlchemy** (Python) | O padrão do ecossistema |

**Regra:** ORM é conveniência, não desculpa pra não saber SQL. Quando a consulta fica
lenta, a solução está no SQL que o ORM gerou, e é preciso saber lê-lo. Todo ORM decente
deixa ligar o log da consulta; ligue no desenvolvimento.

---

## Fila e processamento assíncrono

Entra quando existe tarefa que demora e não pode travar a resposta: e-mail, PDF,
importação de planilha, vídeo, integração lenta com terceiro.

| Ferramenta | Quando |
|---|---|
| **BullMQ** (Redis) | Já tem Redis e precisa de fila de tarefa. Simples e suficiente pra maioria |
| **RabbitMQ** | Roteamento mais elaborado, confirmação de entrega, fila de mensagem morta |
| **Kafka** | Fluxo contínuo de evento em volume alto, com releitura do histórico. Traz operação pesada junto — precisa de motivo forte |

Sem nenhuma tarefa demorada, não instale nenhum dos três.

---

## Onde isso vai rodar

| Decisão | O padrão | Sair do padrão quando | O que isso custa de atenção |
|---|---|---|---|
| **Serviço gerenciado × máquina crua** | Gerenciado: banco como serviço, hospedagem que recebe o repositório e publica sozinha | A aplicação precisa instalar algo no sistema operacional: driver, fonte, componente de terceiro, porta fora de HTTP | No gerenciado, correção de segurança e troca de hardware são do fornecedor. Na máquina crua, cada uma volta pro seu colo |
| **Máquina virtual × container** | Container: a aplicação empacotada com o que ela precisa, igual na sua máquina e no servidor (`Dockerfile` e Compose em `entrega.md`) | O sistema é um bloco só que ninguém vai quebrar em pedaços | Container não é máquina virtual. Um processo, uma responsabilidade, e ninguém entra por SSH: precisou entrar, o conserto é reconstruir a imagem |

Antes de adotar um gerenciado, escreva numa página como sair dele. Se não couber, ele prende.

---

## Caminho de decisão

```
Precisa de tempo real (chat, notificação ao vivo)?
  → Node.js + WebSocket

Precisa de dado, IA ou automação de planilha?
  → Python + FastAPI (ou Django, se quiser o admin pronto)

Precisa de concorrência muito alta ou binário único?
  → Go

Nada disso se aplica?
  → Node.js + TypeScript

Banco:
  Dado tem relação entre si, ou envolve dinheiro?  → PostgreSQL
  Um usuário, sistema interno, ferramenta local?    → SQLite
  Formato varia de item pra item de verdade?        → MongoDB
  Em dúvida?                                        → PostgreSQL

Cache?  Só depois de medir uma consulta lenta cujo dado muda pouco.
Fila?   Só quando existir tarefa que demora e trava a resposta.
```

---

## Site ou aplicativo

Três perguntas, nessa ordem. A primeira resolve a maioria dos casos sozinha.

**1. Quais recursos do aparelho o sistema precisa chamar?** Escreva a lista com nome: câmera,
leitor de código de barras, notificação empurrada, localização. Lista vazia significa site, ou
site instalável na tela inicial. Aplicativo que não chama nada disso é um site dentro de um pacote.

**2. Quem tem a máquina e a conta paga de cada plataforma prometida?** Aceitar iOS no escopo
sem Mac e sem conta é a armadilha que aparece na semana da entrega: roda no Android, e não há
como gerar chave, ajustar o nativo nem publicar. Decida isso no primeiro dia.

**3. Como o instalável chega nas pessoas?** Pela loja, ou instalado direto nos aparelhos que
o próprio negócio entrega. Muda burocracia, prazo e quem barra a sua atualização.

**Armadilha: trocar o identificador do pacote.** Sintoma: meses depois pedem outro nome, e o
id já é a identidade do aplicativo na loja. Custa republicar como app novo e perder quem já
instalou. Conserto: escolha o id definitivo antes da primeira publicação, protótipo junto.

**Armadilha: perder a chave que assina o aplicativo.** Sintoma: a loja recusa a versão nova
como atualização, e o aparelho trata o pacote como outro. Não tem conserto depois. Prevenção:
arquivo e senha no cofre do dono no dia em que a chave nasce, com o lugar anotado.

O Contex OS constrói e assina o arquivo. Quem publica na loja é o dono, com a conta dele.

---

## Armadilhas comuns

1. **Escolher NoSQL pra dado relacional** — depois recriar junção no código, pior e mais lento
2. **Microserviço em sistema pequeno** — multiplica a operação sem resolver problema nenhum
3. **Não usar pool de conexão** — abrir conexão nova a cada requisição desperdiça o gargalo mais caro
4. **Escolher pela novidade** — a stack da moda de hoje é a dívida técnica de amanhã se ninguém por perto souber mantê-la
5. **Copiar a arquitetura de empresa grande** — a solução deles resolve um problema de escala que o projeto não tem, e cobra o preço de complexidade que ele não aguenta
