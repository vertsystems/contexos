#!/usr/bin/env node
/**
 * Contex OS — briefing.js
 * Confere quais campos do briefing de um cliente estão vazios, monta o
 * questionário só com as perguntas que destravam esses campos, e depois lê a
 * resposta que voltou e devolve o briefing preenchido.
 *
 * Existe porque "escreva uma lista de perguntas pro cliente" qualquer chat
 * faz, e o resultado é um formulário de quarenta perguntas que ninguém
 * responde, metade delas sobre coisa que já estava escrita no briefing. Aqui
 * cada pergunta nasce de um campo vazio, o arquivo sai ordenado do campo que
 * pesa mais pro que pesa menos, e na volta o script diz quais skills passaram
 * a ter contexto pra rodar.
 *
 * Uso:
 *   node scripts/briefing.js campos <briefing.md>                 o que está preenchido, parcial e vazio
 *   node scripts/briefing.js perguntar <briefing.md> [opções]     gera o questionário em markdown
 *   node scripts/briefing.js voltar <briefing.md> <resposta>      lê a resposta e devolve o briefing preenchido
 *   node scripts/briefing.js referencia                           imprime a tabela de campos canônicos
 *
 * Opções de "campos":
 *   --minimo N            caracteres mínimos pra um campo contar como preenchido (padrão: 12)
 *   --json                imprime o diagnóstico em JSON
 *
 * Opções de "perguntar":
 *   --para <papel>        cliente | contador | socio | parceiro | fornecedor (padrão: cliente).
 *                         Papel que não é cliente só recebe os campos que ele tem como responder
 *   --decisao "..."       a decisão que a resposta destrava; entra no topo do arquivo
 *   --max N               teto de perguntas (padrão: 12). O que sobra sai listado como deixado de fora
 *   --campos a,b,c        força esses campos, ignorando o diagnóstico e a lista do papel
 *   --incompletos         inclui também o que está pela metade e o que já voltou "não sei"
 *   --tudo                pergunta também o que já está preenchido (revisão de briefing antigo)
 *   --prazo DD/MM/AAAA    data em que a resposta é esperada
 *   --saida <arq.md>      grava em vez de imprimir
 *   --json                imprime a estrutura do questionário em JSON
 *
 * Opções de "voltar":
 *   --aplicar             grava o briefing.md (sem isso, só imprime o que gravaria)
 *   --questionario <arq>  o questionário que foi enviado, pra valer a ordem quando a resposta voltou só com números
 *   --json                imprime o casamento resposta → campo em JSON
 *
 * O briefing é reescrito na ordem canônica, e nada do arquivo antigo se perde:
 * seção escrita à mão que não é campo canônico volta no fim, e resposta nova
 * que discorda do que estava escrito aparece ao lado da antiga, marcada, em vez
 * de sobrescrever. Por isso o padrão é imprimir: grava só com --aplicar.
 *
 * A resposta pode ser .md, .txt ou .docx. No .docx o script chama
 * scripts/gerar-docx.js --texto pra extrair o texto antes de casar as
 * respostas, então não precisa converter na mão.
 *
 * O questionário sai sem nenhum [colchete]: o gerar-docx.js recusa gravar
 * .docx com placeholder, e é assim que o arquivo vira Word num comando só.
 *
 * Node 18+, sem dependência de npm. Datas e slug vêm de scripts/br.js.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const br = require("./br.js");

// ─────────────────────────── utilidades ───────────────────────────

function morrer(msg, dica) {
  console.error(`\n✖ ${msg}`);
  if (dica) console.error(`\n  ${dica}\n`);
  process.exit(1);
}

function pegarOpcao(args, nome, varios) {
  const achados = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === nome && i + 1 < args.length) achados.push(args[i + 1]);
  }
  if (varios) return achados;
  return achados.length ? achados[achados.length - 1] : null;
}

// ─────────────────────────── campos canônicos ───────────────────────────

/**
 * Os temas, na ordem de desempate. O tema que carrega o campo de maior peso
 * vai primeiro; entre temas empatados, vale esta ordem.
 */
const TEMAS = [
  { chave: "resultado", titulo: "O que precisa mudar" },
  { chave: "trabalho", titulo: "O trabalho" },
  { chave: "compra", titulo: "Quem compra de você" },
  { chave: "dinheiro", titulo: "Dinheiro e decisão" },
  { chave: "material", titulo: "Material e acesso" },
  { chave: "conversa", titulo: "Como a gente se fala" },
  { chave: "contexto", titulo: "Contexto" },
];

/**
 * Cada campo do briefing, com a pergunta que o destrava e as skills que
 * passam a ter contexto quando ele está preenchido. Peso 5 é campo sem o qual
 * nada anda; peso 2 é o que melhora a peça mas não bloqueia ninguém.
 */
const CAMPOS = [
  {
    chave: "objetivo", rotulo: "Objetivo", tema: "resultado", peso: 5,
    pergunta: "O que precisa estar diferente daqui a três meses pra você dizer que valeu?",
    porque: "",
    sinonimos: ["objetivo", "objetivos", "meta", "metas", "resultado esperado", "o que se espera", "por que esse projeto", "problema", "o que precisa mudar", "desafio"],
    destrava: ["/proposta", "/escopo", "/medir"],
  },
  {
    chave: "medida", rotulo: "Como medir", tema: "resultado", peso: 4,
    pergunta: "Qual número mostra que isso aconteceu, e de onde você tira esse número hoje?",
    porque: "Sem saber onde o número mora, o relatório mede uma coisa que você não acompanha.",
    sinonimos: ["como medir", "metrica", "metricas", "kpi", "kpis", "indicador", "indicadores", "medicao", "como saber que deu certo"],
    destrava: ["/medir", "/relatorio-cliente"],
  },
  {
    chave: "prazo", rotulo: "Prazo", tema: "resultado", peso: 4,
    pergunta: "Tem uma data que não pode passar? Se tem, o que acontece nela?",
    porque: "Data com motivo (feira, campanha, contrato) a gente respeita. Data sem motivo a gente negocia.",
    sinonimos: ["prazo", "prazos", "data limite", "deadline", "cronograma", "quando", "entrega prevista"],
    destrava: ["/escopo", "/calendario", "/contrato"],
  },
  {
    chave: "entregas", rotulo: "Entregas", tema: "trabalho", peso: 5,
    pergunta: "O que você espera receber, em quantidade e formato?",
    porque: "",
    sinonimos: ["entregas", "entregas previstas", "escopo", "o que sera entregue", "deliverables", "pecas", "produtos"],
    destrava: ["/proposta", "/escopo", "/contrato"],
  },
  {
    chave: "fora", rotulo: "Fora do escopo", tema: "trabalho", peso: 3,
    pergunta: "Tem alguma coisa que você já sabe que não quer que a gente faça?",
    porque: "Essa lista é a que evita a discussão do terceiro mês.",
    sinonimos: ["fora do escopo", "nao incluso", "o que nao entra", "exclusoes", "nao faz parte", "fora"],
    destrava: ["/escopo", "/contrato"],
  },
  {
    chave: "restricoes", rotulo: "Restrições", tema: "trabalho", peso: 4,
    pergunta: "Existe regra que limita o que a gente pode falar ou publicar?",
    porque: "Conselho de classe, jurídico da empresa e regra de plataforma mudam o texto inteiro. Melhor saber antes de escrever.",
    sinonimos: ["restricoes", "restricao", "limites", "regras", "compliance", "juridico", "o que nao pode", "conselho"],
    destrava: ["/publicidade-regulada", "/blindar"],
  },
  {
    chave: "historico", rotulo: "O que já tentaram", tema: "trabalho", peso: 3,
    pergunta: "O que você já tentou antes e não funcionou?",
    porque: "",
    sinonimos: ["historico", "o que ja tentaram", "tentativas", "o que ja foi feito", "antecedentes", "background"],
    destrava: ["/escopo", "/oferta"],
  },
  {
    chave: "publico", rotulo: "Quem compra", tema: "compra", peso: 5,
    pergunta: "Quem compra de você? Descreva a última pessoa que comprou.",
    porque: "",
    sinonimos: ["quem compra", "publico", "publico alvo", "cliente ideal", "persona", "target", "audiencia", "quem e o publico"],
    destrava: ["/publico", "/landing", "/carrossel"],
  },
  {
    chave: "dor", rotulo: "A dor na palavra do cliente", tema: "compra", peso: 5,
    pergunta: "Com que frase o seu cliente descreve o problema que você resolve? Se puder, copie uma mensagem real dele.",
    porque: "A peça sai com a palavra dele, não com a da agência. É a diferença entre ser achado no Google e não ser.",
    sinonimos: ["dor", "dores", "a dor", "problema do cliente", "palavra do cliente", "como o cliente fala", "reclamacao"],
    destrava: ["/publico", "/landing", "/angulos"],
  },
  {
    chave: "oferta", rotulo: "O que se vende", tema: "compra", peso: 4,
    pergunta: "O que exatamente está sendo vendido, por quanto, e o que o cliente recebe?",
    porque: "",
    sinonimos: ["oferta", "o que se vende", "produto", "servico", "servicos", "preco", "precos", "pacote", "pacotes"],
    destrava: ["/oferta", "/preco", "/produto"],
  },
  {
    chave: "objecao", rotulo: "Objeções", tema: "compra", peso: 4,
    pergunta: "O que as pessoas dizem quando decidem não comprar?",
    porque: "",
    sinonimos: ["objecao", "objecoes", "por que nao compram", "barreiras", "duvidas do cliente", "resistencia"],
    destrava: ["/vender", "/landing", "/oferta"],
  },
  {
    chave: "concorrentes", rotulo: "Concorrentes", tema: "compra", peso: 2,
    pergunta: "Cite dois ou três concorrentes e diga em uma linha o que você acha de cada um.",
    porque: "",
    sinonimos: ["concorrentes", "concorrencia", "competidores", "referencias de mercado", "quem mais faz isso"],
    destrava: ["/concorrente"],
  },
  {
    chave: "prova", rotulo: "Prova autorizada", tema: "compra", peso: 2,
    pergunta: "Você tem depoimento, número ou caso de cliente que a gente pode usar publicamente?",
    porque: "Só entra o que você autoriza. Nome de cliente precisa da permissão dele.",
    sinonimos: ["prova", "provas", "depoimento", "depoimentos", "cases", "case", "resultados", "portfolio"],
    destrava: ["/case", "/landing", "/biblioteca"],
  },
  {
    chave: "orcamento", rotulo: "Orçamento", tema: "dinheiro", peso: 4,
    pergunta: "Qual faixa de investimento já está aprovada pra isso?",
    porque: "Faixa, não valor exato. Serve pra a gente propor o que cabe em vez de propor o que você vai recusar.",
    sinonimos: ["orcamento", "investimento", "verba", "budget", "quanto pode gastar", "faixa de investimento"],
    destrava: ["/proposta", "/preco"],
  },
  {
    chave: "decisor", rotulo: "Quem decide", tema: "dinheiro", peso: 4,
    pergunta: "Além de você, quem precisa concordar pra isso começar?",
    porque: "Descobrir o segundo decisor depois da proposta pronta custa duas semanas.",
    sinonimos: ["decisor", "quem decide", "aprovacao", "quem aprova", "stakeholders", "responsavel pela decisao"],
    destrava: ["/proposta", "/contrato", "/briefing-reuniao"],
  },
  {
    chave: "acessos", rotulo: "Acessos", tema: "material", peso: 3,
    pergunta: "Quem tem hoje o acesso das contas que a gente vai usar?",
    porque: "Aqui a gente quer só o nome da pessoa. Senha nunca por escrito neste arquivo.",
    sinonimos: ["acessos", "acesso", "contas", "logins", "senhas", "credenciais", "dominio", "hospedagem"],
    destrava: ["/conectar", "/site", "/seo"],
  },
  {
    chave: "marca", rotulo: "Marca", tema: "material", peso: 3,
    pergunta: "Você tem logo, cores e fontes definidas? Onde estão os arquivos?",
    porque: "",
    sinonimos: ["marca", "identidade", "identidade visual", "logo", "logotipo", "cores", "fontes", "manual da marca", "brand"],
    destrava: ["/design-system", "/marca"],
  },
  {
    chave: "dados", rotulo: "Dado pessoal", tema: "material", peso: 3,
    pergunta: "O trabalho vai mexer com lista de cliente, cadastro ou dado pessoal de alguém?",
    porque: "Se sim, precisamos combinar quem guarda o quê antes de começar.",
    sinonimos: ["dado pessoal", "dados pessoais", "lgpd", "base de clientes", "cadastro", "lista de contatos", "privacidade"],
    destrava: ["/cadastro-clientes", "/blindar"],
  },
  {
    chave: "canal", rotulo: "Canal e retorno", tema: "conversa", peso: 3,
    pergunta: "Onde a gente fala com você no dia a dia, e em quanto tempo você costuma responder?",
    porque: "",
    sinonimos: ["canal", "canais", "contato", "como falar", "comunicacao", "reunioes", "whatsapp", "retorno"],
    destrava: ["/confirmacao-de-agenda", "/pos-venda", "/relatorio-cliente"],
  },
  {
    chave: "quem", rotulo: "Quem é o cliente", tema: "contexto", peso: 3,
    pergunta: "Em duas ou três linhas, o que a sua empresa vende e desde quando?",
    porque: "",
    // "sobre" e "o cliente" ficaram de fora de propósito: casavam com seção de
    // nome parecido ("Como o cliente chegou até mim") e engoliam o texto dela.
    sinonimos: ["quem e o cliente", "sobre a empresa", "sobre o cliente", "empresa", "negocio", "quem somos", "contexto"],
    destrava: ["/proposta", "/relatorio-cliente"],
  },
];

/** Skill → campos que ela precisa pra rodar com contexto de verdade. */
const PRONTAS = {
  "/proposta": ["quem", "objetivo", "entregas", "prazo", "orcamento", "decisor"],
  "/escopo": ["objetivo", "entregas", "fora", "prazo", "orcamento"],
  "/contrato": ["entregas", "fora", "prazo", "orcamento", "decisor"],
  "/publico": ["publico", "dor", "objecao"],
  "/oferta": ["oferta", "publico", "objecao"],
  "/landing": ["publico", "dor", "oferta", "objecao", "marca"],
  "/medir": ["objetivo", "medida"],
  "/relatorio-cliente": ["quem", "objetivo", "medida", "canal"],
  "/concorrente": ["publico", "concorrentes"],
  "/design-system": ["marca"],
};

/**
 * Quem responde, o que essa pessoa tem como responder, e em que palavras.
 *
 * Duas coisas acontecem aqui. A lista `campos` corta o que a pessoa não tem
 * como responder: perguntar "quem compra de você" pro contador é o jeito mais
 * rápido de o arquivo voltar em branco. E `pergunta` troca o texto da pergunta
 * pela versão que faz sentido pra ela — o mesmo campo `quem`, que pro cliente é
 * "o que a sua empresa vende", pro contador é o regime e o anexo. Sem essa
 * segunda parte o questionário do contador saía perguntando faixa de
 * investimento aprovada, que não é assunto dele.
 *
 * `--campos` passa por cima do corte; o texto continua sendo o do papel.
 *
 * Invariante: todo campo que está na lista `campos` de um papel tem entrada em
 * `pergunta`. Quem acrescentar campo na lista sem escrever a pergunta faz o
 * questionário sair com a versão do cliente no meio do do contador. O
 * `node scripts/briefing.js referencia` acusa quando isso acontece.
 */
const PAPEIS = {
  cliente: { titulo: "cliente", tratamento: null, campos: null, pergunta: {} },

  contador: {
    titulo: "contador", tratamento: "pro contador de",
    campos: ["quem", "oferta", "orcamento", "prazo", "restricoes", "dados"],
    pergunta: {
      quem: {
        texto: "Em que regime a empresa está hoje e, se for Simples Nacional, em qual anexo?",
        porque: "O anexo muda a alíquota, e a alíquota muda o preço que dá pra fechar (Lei Complementar 123/2006, anexos I a V).",
      },
      oferta: {
        texto: "Essa atividade cabe no objeto social e no CNAE da empresa? Dá pra emitir nota por ela hoje?",
        porque: "Serviço fora do CNAE só aparece na hora de emitir a nota, com o trabalho já entregue.",
      },
      orcamento: {
        texto: "Esse gasto entra como despesa da empresa ou sai da pessoa física? E cabe no caixa deste mês?",
        porque: "Muda quem emite a nota e pra quem ela vai.",
      },
      prazo: {
        texto: "Tem data de obrigação nos próximos três meses que atrapalhe começar agora (fechamento, declaração, troca de regime)?",
        porque: "",
      },
      restricoes: {
        texto: "Tem limite do regime atual ou obrigação da atividade que restrinja o que a gente pode anunciar ou prometer?",
        porque: "Teto de faturamento e atividade não autorizada aparecem no material antes de aparecer na fiscalização.",
      },
      dados: {
        texto: "Que dado de cliente a empresa já guarda hoje, e onde fica?",
        porque: "",
      },
    },
  },

  socio: {
    titulo: "sócio", tratamento: "pro sócio de",
    campos: ["objetivo", "orcamento", "decisor", "entregas", "fora", "prazo", "medida", "historico", "restricoes", "dados", "canal"],
    pergunta: {
      objetivo: {
        texto: "Daqui a três meses, o que tem que ter mudado no negócio pra você dizer que esse dinheiro valeu?",
        porque: "",
      },
      orcamento: {
        texto: "Quanto a gente tira do caixa por mês pra isso, e de onde sai esse dinheiro?",
        porque: "Valor combinado antes evita a conversa de que um investiu mais que o outro.",
      },
      decisor: {
        texto: "Nesse assunto, quem bate o martelo: você, eu, ou os dois juntos?",
        porque: "Decisão sem dono combinado é a que trava por semanas esperando o outro falar.",
      },
      fora: {
        texto: "Tem alguma coisa que você já quer de fora, mesmo que caiba no orçamento?",
        porque: "",
      },
      historico: {
        texto: "A gente já tentou algo parecido antes? O que aconteceu?",
        porque: "",
      },
      canal: {
        texto: "Como a gente acompanha isso: reunião marcada, mensagem no dia, ou só quando aparecer problema?",
        porque: "",
      },
      entregas: {
        texto: "Do que precisa ser feito, o que fica com você e o que fica comigo?",
        porque: "Divisão escrita agora é o que evita duas pessoas fazendo a mesma coisa e uma terceira sem dono.",
      },
      prazo: {
        texto: "Até quando você aguenta isso sem dar retorno? E tem data do negócio que trave (fechamento, temporada, contrato)?",
        porque: "",
      },
      medida: {
        texto: "Que número a gente vai olhar junto pra saber se está funcionando, e quem levanta esse número?",
        porque: "",
      },
      restricoes: {
        texto: "Tem algo que você não quer que apareça associado ao negócio, nem que dê resultado?",
        porque: "",
      },
      dados: {
        texto: "A nossa lista de cliente entra nisso? Se entra, quem fica responsável por ela?",
        porque: "Lista de cliente é dado pessoal, e o responsável precisa ter nome antes de a lista sair do lugar.",
      },
    },
  },

  parceiro: {
    titulo: "parceiro", tratamento: "pro parceiro de",
    campos: ["entregas", "prazo", "orcamento", "fora", "restricoes", "acessos", "historico", "canal"],
    pergunta: {
      entregas: {
        texto: "O que exatamente você entrega nessa parceria, em quantidade e formato?",
        porque: "",
      },
      prazo: {
        texto: "Em quanto tempo você entrega, contado de quando? E o que acontece se atrasar?",
        porque: "Prazo sem ponto de partida definido é o que gera a discussão depois.",
      },
      orcamento: {
        texto: "Quanto custa e como se paga: por entrega, por mês, ou por porcentagem?",
        porque: "",
      },
      fora: {
        texto: "O que não está incluído no que você faz, e que a gente costuma achar que está?",
        porque: "Essa é a lista que evita a cobrança extra do terceiro mês.",
      },
      restricoes: {
        texto: "Tem cláusula de exclusividade, concorrente que você não atende, ou regra do seu lado que limite isso?",
        porque: "",
      },
      acessos: {
        texto: "De que acesso você precisa do nosso lado, e quem do seu time vai usar?",
        porque: "Aqui a gente quer o nome da pessoa. Senha nunca por escrito neste arquivo.",
      },
      canal: {
        texto: "Com quem eu falo quando dá problema, e em quanto tempo você costuma responder?",
        porque: "",
      },
      historico: {
        texto: "Você já fez algo parecido com isso? Pra quem, e como terminou?",
        porque: "",
      },
    },
  },
};
// Fornecedor responde as mesmas perguntas do parceiro; só o título muda.
PAPEIS.fornecedor = Object.assign({}, PAPEIS.parceiro, { titulo: "fornecedor", tratamento: "pro fornecedor de" });

/** A pergunta do campo na voz do papel, com o texto do molde como padrão. */
function perguntaDoPapel(campo, papel) {
  const troca = papel && papel.pergunta ? papel.pergunta[campo.chave] : null;
  return {
    texto: troca && troca.texto ? troca.texto : campo.pergunta,
    porque: troca ? troca.porque : campo.porque,
  };
}

// Marca de pendência dentro do campo. "todo" em caixa baixa ficou de fora de
// propósito: em português é palavra comum ("passa aqui todo dia"), e enquanto
// estava na lista um briefing bem escrito aparecia como parcial. TODO em caixa
// alta, que é a marca de verdade, é conferido à parte, sem ignorar a caixa.
const VAGOS = /\b(a confirmar|a definir|a levantar|a preencher|preencher|pendente|em aberto|n[aã]o sei|sem informa[cç][aã]o|indefinido|tbd|xxx+|\?\?+)\b/gi;
const VAGOS_CAIXA_ALTA = /\bTODO\b/g;

// ─────────────────────────── leitura do briefing ───────────────────────────

/** Tira acento, baixa a caixa e limpa pontuação de borda. */
function normal(s) {
  return br.semAcento(String(s || ""))
    .replace(/[*_`#>]/g, " ")
    .replace(/[:\-–—.,;!?()\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A linha abre um rótulo ("**Prazo:** 30 dias", "- Prazo: 30 dias")? */
function rotuloDaLinha(linha) {
  const l = String(linha);
  let m = l.match(/^\s*(?:[-*+]\s*)?\*\*([^*]{2,60}?)\*\*\s*[:=—–-]?\s*(.*)$/);
  if (!m) m = l.match(/^\s*(?:[-*+]\s*)?([A-Za-zÀ-ÿ][^:\n|]{2,50}):\s*(.*)$/);
  return m ? { rotulo: m[1], resto: m[2] } : null;
}

function casaSinonimo(rot, alvo) {
  return rot === alvo || rot.startsWith(alvo + " ") || rot.endsWith(" " + alvo) || rot.includes(" " + alvo + " ");
}

/** Qual campo canônico é esse rótulo, se for algum. Desempata pelo sinônimo mais longo. */
function chaveDoRotulo(rotulo) {
  const rot = normal(rotulo);
  if (!rot) return null;
  let melhor = null;
  for (const campo of CAMPOS) {
    for (const s of campo.sinonimos) {
      const alvo = normal(s);
      if (!casaSinonimo(rot, alvo)) continue;
      const nota = alvo.length * 10 + (rot === alvo ? 50 : 0);
      if (!melhor || nota > melhor.nota) melhor = { chave: campo.chave, nota };
      break;
    }
  }
  return melhor ? melhor.chave : null;
}

/** A linha abre outro campo canônico? É onde o corpo do título anterior termina. */
function abreOutroCampo(linha) {
  const r = rotuloDaLinha(linha);
  return !!(r && chaveDoRotulo(r.rotulo));
}

/**
 * Quebra o markdown em candidatos a campo: cada título e cada linha de rótulo
 * em negrito ou seguida de dois-pontos. O corpo de um título vai até o próximo
 * título de nível igual ou maior — ou até a linha que abre outro campo
 * canônico, senão o "## Objetivo" engole o "**Prazo:** a definir" de baixo e
 * sai marcado como parcial por causa de uma pendência que não é dele.
 */
function candidatos(md) {
  const linhas = String(md).replace(/\r\n/g, "\n").split("\n");
  const fora = [];
  let emBloco = false;
  for (const l of linhas) {
    if (/^\s*```/.test(l)) emBloco = !emBloco;
    fora.push(emBloco);
  }

  const lista = [];
  // títulos
  for (let i = 0; i < linhas.length; i++) {
    if (fora[i]) continue;
    const t = linhas[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!t) continue;
    const nivel = t[1].length;
    const corpo = [];
    for (let j = i + 1; j < linhas.length; j++) {
      const outro = fora[j] ? null : linhas[j].match(/^(#{1,6})\s+/);
      if (outro && outro[1].length <= nivel) break;
      if (!fora[j] && abreOutroCampo(linhas[j])) break;
      corpo.push(linhas[j]);
    }
    lista.push({ rotulo: t[2], corpo: corpo.join("\n") });
  }
  // rótulos de linha
  for (let i = 0; i < linhas.length; i++) {
    if (fora[i]) continue;
    const l = linhas[i];
    const r = rotuloDaLinha(l);
    if (!r) continue;
    const corpo = [r.resto];
    for (let j = i + 1; j < linhas.length; j++) {
      if (fora[j]) break;
      const seg = linhas[j];
      if (/^\s*$/.test(seg)) break;
      if (/^#{1,6}\s/.test(seg)) break;
      if (rotuloDaLinha(seg)) break;
      corpo.push(seg);
    }
    lista.push({ rotulo: r.rotulo, corpo: corpo.join("\n") });
  }
  return lista;
}

/**
 * Corta o markdown em blocos de primeiro nível: o que vem antes do primeiro
 * título, e depois cada `#` ou `##` com o corpo inteiro dele (subtítulos
 * incluídos). É por aqui que o passo de volta reescreve o briefing sem apagar
 * seção que o usuário escreveu à mão.
 */
function blocos(md) {
  const linhas = String(md || "").replace(/\r\n/g, "\n").split("\n");
  const lista = [];
  let atual = { rotulo: null, nivel: 0, linhas: [] };
  for (const l of linhas) {
    const t = l.match(/^(#{1,2})\s+(.+?)\s*$/);
    if (t) {
      lista.push(atual);
      atual = { rotulo: t[2], nivel: t[1].length, linhas: [] };
      continue;
    }
    atual.linhas.push(l);
  }
  lista.push(atual);
  return lista;
}

/** Marca de campo que foi perguntado e voltou "não sei". Não é resposta, e não destrava skill. */
const RE_DUVIDA = /^\s*_d[uú]vida registrada em /im;

/**
 * Quanto sobra de conteúdo real depois de tirar marcação, frase vaga e linha
 * de metadado (fonte, dúvida registrada), que é procedência e não resposta.
 */
function sobra(corpo) {
  return String(corpo || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^[ \t]*_[^\n_][^\n]*_[ \t]*$/gm, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " x ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(VAGOS, " ")
    .replace(VAGOS_CAIXA_ALTA, " ")
    .replace(/[*_`#>|~]/g, " ")
    .replace(/^[\s\-–—_.:]+$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function temVago(corpo) {
  const t = String(corpo || "");
  VAGOS.lastIndex = 0;
  VAGOS_CAIXA_ALTA.lastIndex = 0;
  if (VAGOS.test(t) || VAGOS_CAIXA_ALTA.test(t)) return true;
  // colchete solto é placeholder; link markdown não é
  return /\[[^\]]*\]/.test(t.replace(/\[[^\]]*\]\([^)]*\)/g, ""));
}

/**
 * Diagnóstico do briefing: para cada campo canônico, se está preenchido,
 * parcial ou vazio, e de qual rótulo do arquivo a resposta veio.
 */
function diagnosticar(md, opcoes = {}) {
  const minimo = Number(opcoes.minimo) > 0 ? Number(opcoes.minimo) : 12;
  const cands = candidatos(md || "");
  const resultado = [];

  for (const campo of CAMPOS) {
    let melhor = null;
    for (const c of cands) {
      const rot = normal(c.rotulo);
      if (!rot) continue;
      for (const s of campo.sinonimos) {
        const alvo = normal(s);
        const casa = rot === alvo || rot.startsWith(alvo + " ") || rot.endsWith(" " + alvo) || rot.includes(" " + alvo + " ");
        if (!casa) continue;
        const nota = alvo.length * 10 + sobra(c.corpo).length / 100 + (rot === alvo ? 50 : 0);
        if (!melhor || nota > melhor.nota) melhor = { nota, rotulo: c.rotulo, corpo: c.corpo };
        break;
      }
    }
    const texto = melhor ? sobra(melhor.corpo) : "";
    let estado;
    if (melhor && texto.length < minimo && RE_DUVIDA.test(melhor.corpo)) estado = "duvida";
    else if (!melhor || texto.length < minimo) estado = "vazio";
    else if (temVago(melhor.corpo)) estado = "parcial";
    else estado = "preenchido";
    resultado.push({
      chave: campo.chave, rotulo: campo.rotulo, tema: campo.tema, peso: campo.peso,
      estado, achadoEm: melhor ? melhor.rotulo : null, tamanho: texto.length,
      destrava: campo.destrava,
    });
  }

  const porChave = {};
  for (const r of resultado) porChave[r.chave] = r;
  const prontas = [];
  const travadas = [];
  for (const [skill, exigidos] of Object.entries(PRONTAS)) {
    // "não sei" datado é histórico, não resposta: continua faltando pra skill
    const faltando = exigidos.filter((k) => porChave[k] && (porChave[k].estado === "vazio" || porChave[k].estado === "duvida"));
    if (faltando.length) travadas.push({ skill, faltando });
    else prontas.push(skill);
  }
  return { minimo, campos: resultado, prontas, travadas };
}

// ─────────────────────────── ordem das perguntas ───────────────────────────

/**
 * Quem entra no corte: peso primeiro, sempre. O agrupamento por tema é da
 * apresentação, e deixá-lo decidir o corte fazia um campo de peso 3 entrar na
 * frente de um de peso 5 só porque o tema dele começava mais em cima.
 */
function porPeso(chaves) {
  const ordemTema = {};
  TEMAS.forEach((t, i) => { ordemTema[t.chave] = i; });
  return CAMPOS.filter((c) => chaves.includes(c.chave)).sort((a, b) => {
    if (b.peso !== a.peso) return b.peso - a.peso;
    if (a.tema !== b.tema) return ordemTema[a.tema] - ordemTema[b.tema];
    return CAMPOS.indexOf(a) - CAMPOS.indexOf(b);
  });
}

/** Ordena os campos escolhidos: tema do campo mais pesado primeiro, peso dentro do tema. */
function ordenar(chaves) {
  const escolhidos = CAMPOS.filter((c) => chaves.includes(c.chave));
  const pesoTema = {};
  for (const c of escolhidos) pesoTema[c.tema] = Math.max(pesoTema[c.tema] || 0, c.peso);
  const ordemTema = {};
  TEMAS.forEach((t, i) => { ordemTema[t.chave] = i; });
  return escolhidos.sort((a, b) => {
    if (pesoTema[b.tema] !== pesoTema[a.tema]) return pesoTema[b.tema] - pesoTema[a.tema];
    if (a.tema !== b.tema) return ordemTema[a.tema] - ordemTema[b.tema];
    if (b.peso !== a.peso) return b.peso - a.peso;
    return CAMPOS.indexOf(a) - CAMPOS.indexOf(b);
  });
}

// ─────────────────────────── o questionário ───────────────────────────

function questionario(opcoes) {
  const {
    nome, diag, para = "cliente", decisao = "", max = 12, forcados = null, tudo = false,
    incompletos = false, prazo = null, hoje = new Date(),
  } = opcoes;

  let candidatas;
  const naMao = !!(forcados && forcados.length);
  if (naMao) candidatas = forcados.filter((k) => CAMPOS.some((c) => c.chave === k));
  else if (tudo) candidatas = CAMPOS.map((c) => c.chave);
  else if (incompletos) candidatas = diag.campos.filter((c) => c.estado !== "preenchido").map((c) => c.chave);
  else candidatas = diag.campos.filter((c) => c.estado === "vazio").map((c) => c.chave);

  const papel = PAPEIS[para] || PAPEIS.cliente;
  let foraPorPapel = [];
  if (papel.campos && !naMao) {
    foraPorPapel = porPeso(candidatas.filter((k) => !papel.campos.includes(k)));
    candidatas = candidatas.filter((k) => papel.campos.includes(k));
  }

  const escolhidas = porPeso(candidatas).slice(0, Math.max(1, max)).map((c) => c.chave);
  const dentro = ordenar(escolhidas);
  const foraDoCorte = porPeso(candidatas.filter((k) => !escolhidas.includes(k)));

  const grupos = [];
  for (const campo of dentro) {
    let g = grupos.find((x) => x.tema === campo.tema);
    if (!g) {
      g = { tema: campo.tema, titulo: (TEMAS.find((t) => t.chave === campo.tema) || {}).titulo || campo.tema, perguntas: [] };
      grupos.push(g);
    }
    g.perguntas.push(campo);
  }

  const linhas = [];
  let n = 0;
  if (!dentro.length) {
    return {
      md: "", dentro: [], fora: foraDoCorte.map((c) => ({ chave: c.chave, rotulo: c.rotulo, peso: c.peso })),
      foraPorPapel: foraPorPapel.map((c) => ({ chave: c.chave, rotulo: c.rotulo })), papel: papel.titulo, total: 0,
    };
  }

  // O mapa pergunta → campo vive no frontmatter, e não é decoração: o Passo 4 da
  // skill reescreve o texto de cada pergunta na voz de quem responde, e depois
  // disso o casamento por semelhança de texto não acha mais nada. O
  // gerar-docx.js corta frontmatter, então isto não aparece no Word do cliente.
  const mapa = dentro.map((c, i) => `${i + 1}=${c.chave}`).concat([`${dentro.length + 1}=extra`]);
  linhas.push("---");
  linhas.push("questionario: briefing");
  linhas.push(`campos: ${mapa.join(" ")}`);
  linhas.push("nota: este bloco não vai pro Word e não se apaga; é por ele que o `voltar` sabe de qual campo é cada resposta");
  linhas.push("---");
  linhas.push("");
  linhas.push(`# Perguntas ${papel.tratamento ? `${papel.tratamento} ${nome}` : `pra ${nome}`}`);
  linhas.push("");
  linhas.push(`Enviado em ${br.fmt(hoje)}${prazo ? ` · resposta esperada até ${br.fmt(prazo)}` : ""}`);
  linhas.push("");
  if (decisao) {
    linhas.push(`**Pra que serve:** ${decisao}`);
  } else {
    linhas.push(`**Pra que serve:** sem essas respostas o trabalho segue por palpite, e palpite aparece na peça pronta.`);
  }
  linhas.push("");
  linhas.push(`São ${dentro.length} pergunta${dentro.length === 1 ? "" : "s"}, mais um campo aberto no fim. Escreva a resposta embaixo de cada uma, do jeito que você falaria.`);
  linhas.push("");
  linhas.push(`Duas coisas que valem a pena saber antes de começar:`);
  linhas.push("");
  linhas.push(`- **"não sei" é resposta.** Dúvida marcada serve; palpite escrito com cara de fato atrapalha, porque a gente trabalha em cima dele sem saber`);
  linhas.push(`- **Resposta curta serve.** Uma linha por pergunta já destrava. Se der só pra responder metade, responda metade e devolva`);
  linhas.push("");
  linhas.push("---");
  linhas.push("");

  for (const g of grupos) {
    linhas.push(`## ${g.titulo}`);
    linhas.push("");
    for (const campo of g.perguntas) {
      n++;
      const q = perguntaDoPapel(campo, papel);
      linhas.push(`### ${n}. ${q.texto}`);
      linhas.push("");
      if (q.porque) {
        linhas.push(`_Por que a gente pergunta:_ ${q.porque}`);
        linhas.push("");
      }
      linhas.push("**Resposta:**");
      linhas.push("");
      linhas.push("");
    }
  }

  linhas.push("---");
  linhas.push("");
  linhas.push("## Por último");
  linhas.push("");
  linhas.push(`### ${n + 1}. ${FECHAMENTO}`);
  linhas.push("");
  linhas.push("**Resposta:**");
  linhas.push("");
  linhas.push("");

  const md = linhas.join("\n");
  return {
    md,
    dentro: dentro.map((c) => ({ chave: c.chave, rotulo: c.rotulo, peso: c.peso, pergunta: perguntaDoPapel(c, papel).texto })),
    fora: foraDoCorte.map((c) => ({ chave: c.chave, rotulo: c.rotulo, peso: c.peso })),
    foraPorPapel: foraPorPapel.map((c) => ({ chave: c.chave, rotulo: c.rotulo })),
    papel: papel.titulo,
    total: n + 1,
  };
}

// ─────────────────────────── a volta ───────────────────────────

const EXT_TEXTO = new Set(["", ".md", ".markdown", ".txt", ".text", ".rtf"]);

function textoDaResposta(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();
  if (ext !== ".docx" && !EXT_TEXTO.has(ext)) {
    morrer(`Não sei ler "${ext}".`, "A resposta entra como .md, .txt ou .docx. Se veio em PDF ou imagem, me peça pra ler o arquivo e colar o texto num .md.");
  }
  if (ext !== ".docx") return fs.readFileSync(arquivo, "utf8");
  const docx = path.join(__dirname, "gerar-docx.js");
  if (!fs.existsSync(docx)) morrer("scripts/gerar-docx.js não está aqui, e é ele que abre .docx.", "Converta a resposta pra .md ou .txt e rode de novo.");
  try {
    return execFileSync(process.execPath, [docx, "--texto", arquivo], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    morrer(`Não consegui ler "${path.basename(arquivo)}".`, "Abra o arquivo no Word, salve como .docx de novo, ou cole o texto num .md.");
  }
}

const FECHAMENTO = "Tem alguma coisa que a gente não perguntou e que você acha que precisamos saber?";

/** Palavra que aparece em qualquer frase e por isso não identifica pergunta nenhuma. */
const RUIDO = new Set(["que", "nao", "com", "para", "pra", "uma", "dos", "das", "seu", "sua", "seus", "suas",
  "mais", "tem", "ter", "foi", "ser", "ele", "ela", "eles", "elas", "isso", "isto", "esse", "essa", "este",
  "esta", "voce", "algum", "alguma", "sobre", "entre", "num", "nas", "nos", "por", "ate", "mas", "ja", "de"]);

/**
 * Fração das palavras de "a" que aparecem em "b", sem contar ruído. Serve pra
 * reconhecer a pergunta que voltou no arquivo mesmo depois de o cliente mexer
 * na pontuação ou apagar o número.
 */
function parecido(a, b) {
  const pa = normal(a).split(" ").filter((w) => w.length > 2 && !RUIDO.has(w));
  const pb = new Set(normal(b).split(" ").filter((w) => w.length > 2 && !RUIDO.has(w)));
  if (!pa.length) return 0;
  let bate = 0;
  for (const w of pa) if (pb.has(w)) bate++;
  return bate / pa.length;
}

/** Qual campo essa linha de pergunta é, pelo texto. Devolve null quando nada chega perto. */
function campoDaLinha(texto) {
  if (parecido(FECHAMENTO, texto) >= 0.6) return "__extra";
  let melhor = null;
  const testar = (frase, chave) => {
    const nota = parecido(frase, texto);
    if (nota >= 0.6 && (!melhor || nota > melhor.nota)) melhor = { chave, nota };
  };
  for (const c of CAMPOS) testar(c.pergunta, c.chave);
  // o questionário do contador, do sócio e do parceiro pergunta a mesma coisa
  // com outras palavras; sem isto a volta dependia sempre de --questionario
  for (const papel of Object.values(PAPEIS)) {
    for (const [chave, troca] of Object.entries(papel.pergunta || {})) {
      if (troca && troca.texto) testar(troca.texto, chave);
    }
  }
  return melhor ? melhor.chave : null;
}

/**
 * Lê a ordem de um questionário já enviado: número da pergunta → campo.
 * Primeiro pelo frontmatter, que é o mapa que o próprio script gravou e vale
 * mesmo depois de as perguntas serem reescritas. Sem frontmatter (questionário
 * escrito à mão), cai no texto das perguntas, que acerta menos.
 */
function ordemDoQuestionario(md) {
  const texto = String(md || "").replace(/\r\n/g, "\n");
  const fm = texto.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    const linha = fm[1].match(/^campos:\s*(.+)$/m);
    if (linha) {
      const ordem = [];
      for (const par of linha[1].trim().split(/\s+/)) {
        const m = par.match(/^(\d{1,2})=([a-z_]+)$/);
        if (!m) continue;
        const chave = m[2] === "extra" ? "__extra" : m[2];
        if (chave === "__extra" || CAMPOS.some((c) => c.chave === chave)) ordem[Number(m[1]) - 1] = chave;
      }
      if (ordem.filter(Boolean).length) return { ordem, fonte: "frontmatter" };
    }
  }
  const ordem = [];
  for (const l of texto.split("\n")) {
    const m = l.match(/^#{1,6}\s*(\d{1,2})[.)]\s*(.+?)\s*$/);
    if (!m) continue;
    ordem[Number(m[1]) - 1] = campoDaLinha(m[2]);
  }
  return { ordem, fonte: "texto" };
}

/**
 * Casa o que voltou com os campos. A âncora principal é o texto da pergunta,
 * que volta no arquivo porque a pessoa escreve embaixo dele. Quando ela apagou
 * a pergunta e deixou só "3.", vale a ordem do questionário enviado.
 */
function casar(textoResposta, ordem, ordemVale) {
  const linhas = String(textoResposta).replace(/\r\n/g, "\n").split("\n");
  const marcas = [];
  for (let i = 0; i < linhas.length; i++) {
    if (/^\s*[_>]/.test(linhas[i])) continue;               // dica em itálico e citação não são pergunta
    const cru = linhas[i].replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").trim();
    if (!cru) continue;
    // O (?=\s|$) é o que separa "2." de "2.500": sem ele, a resposta que começa
    // com valor em reais virava marca de pergunta e o texto dela se perdia.
    const m = cru.match(/^(\d{1,2})[.)°º](?=\s|$)\s*(.*)$/);
    const texto = m ? m[2] : cru;
    const numerada = m && ordem ? ordem[Number(m[1]) - 1] : null;
    // Com o mapa do frontmatter em mão, o número manda: a pergunta foi
    // reescrita na voz do cliente e o texto dela já não parece com a original.
    let chave = ordemVale && numerada ? numerada : texto ? campoDaLinha(texto) : null;
    if (!chave && numerada) chave = numerada;
    if (chave) marcas.push({ linha: i, chave });
  }

  const achados = {};
  for (let k = 0; k < marcas.length; k++) {
    const ini = marcas[k].linha + 1;
    const fim = k + 1 < marcas.length ? marcas[k + 1].linha : linhas.length;
    let bruto = linhas.slice(ini, fim)
      .filter((x) => !/^#{1,6}\s/.test(x))                   // subtítulo de tema não é resposta
      .filter((x) => !/^\s*[_*]*\s*por que a gente pergunta/i.test(x))
      .filter((x) => !/^\s*\**\s*respostas?\s*:?\s*\**\s*:?\s*$/i.test(x))
      .join("\n");
    bruto = bruto.replace(/^[\s\-–—_*]+$/gm, "");
    const limpo = bruto.split("\n").map((x) => x.trim()).filter(Boolean).join("\n").trim();
    if (limpo && !achados[marcas[k].chave]) achados[marcas[k].chave] = limpo;
  }
  return achados;
}

/**
 * Dúvida de verdade, e só ela. "Não temos concorrente direto aqui no bairro" e
 * "não tenho logo, só o nome escrito" são respostas — e boas: elas fecham a
 * pergunta. Enquanto "nao tenho" e "nao temos" estavam nesta lista, resposta
 * útil virava dúvida datada e voltava pra fila da segunda rodada.
 */
const RE_NAO_SEI = /^(nao sei|nao sei dizer|sei nao|nao tenho ideia|nao faco ideia|nao lembro|nao sabemos|sem resposta|nao se aplica|n a)$/;
const RE_NAO_SEI_ABRE = /^(nao sei|ainda nao sei|nao sabemos|nao lembro|nao tenho essa informacao|nao tenho como saber|nao tenho ideia|nao faco ideia|nao decidi|ainda nao decidi|nao definimos|ainda nao definimos|preciso confirmar|preciso ver|vou confirmar|vou ver)\b/;

function classificar(resposta) {
  const t = String(resposta || "").trim();
  if (!t) return "em branco";
  const n = normal(t);
  if (RE_NAO_SEI.test(n)) return "nao sei";
  if (RE_NAO_SEI_ABRE.test(n) && t.length < 80) return "nao sei";
  if (sobra(t).length < 3) return "em branco";
  return "respondido";
}

/**
 * Onde cada campo já tinha texto, e o que no arquivo antigo não é campo
 * nenhum. O segundo é o que não pode se perder: briefing de gente real tem
 * seção escrita à mão ("como o cliente chegou", "combinado de pagamento"), e
 * reescrever o arquivo só com os campos canônicos apagaria tudo isso.
 */
function separarAntigo(mdAntigo) {
  const antes = {};
  const preservadas = [];
  const preambulo = [];

  for (const b of blocos(mdAntigo || "")) {
    const corpo = b.linhas.join("\n").trim();
    if (b.rotulo === null || b.nivel === 1) {
      for (const l of b.linhas) preambulo.push(l);
      continue;
    }
    const chave = chaveDoRotulo(b.rotulo);
    if (chave && !antes[chave]) { antes[chave] = corpo; continue; }
    if (sobra(corpo).length >= 3) preservadas.push({ rotulo: b.rotulo, corpo });
  }

  // O preâmbulo costuma vir em linha de rótulo ("**Público alvo:** ..."). Cada
  // uma vai pro campo dela; o que não é campo fica como prosa do arquivo.
  const prosa = [];
  for (let i = 0; i < preambulo.length; i++) {
    const l = preambulo[i];
    if (/^\s*#/.test(l)) continue;
    if (/^\s*Atualizado em\b/i.test(l)) continue;
    const r = rotuloDaLinha(l);
    const chave = r ? chaveDoRotulo(r.rotulo) : null;
    if (!chave) { prosa.push(l); continue; }
    const corpo = [r.resto];
    let j = i + 1;
    for (; j < preambulo.length; j++) {
      const seg = preambulo[j];
      if (/^\s*$/.test(seg) || /^\s*#/.test(seg) || rotuloDaLinha(seg)) break;
      corpo.push(seg);
    }
    const texto = corpo.join("\n").trim();
    if (texto && !antes[chave]) antes[chave] = texto;
    i = j - 1;
  }

  return { antes, preservadas, prosa: prosa.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}

/** Uma linha só, pra caber numa nota dentro do briefing. */
function umaLinha(t) {
  return String(t || "").split("\n").map((x) => x.trim()).filter(Boolean).join(" ");
}

/**
 * Monta o briefing novo: mantém o que já estava escrito, acrescenta o que
 * voltou campo por campo na ordem canônica, e avisa onde a resposta nova
 * discorda do que estava no arquivo em vez de sobrescrever calado.
 */
function preencher(mdAntigo, achados, opcoes = {}) {
  const hoje = opcoes.hoje || new Date();
  const nome = opcoes.nome || "cliente";
  const minimo = Number(opcoes.minimo) > 0 ? Number(opcoes.minimo) : 12;
  const diag = diagnosticar(mdAntigo || "", opcoes);
  const { antes: antesPorChave, preservadas, prosa } = separarAntigo(mdAntigo);

  const linhas = [`# Briefing — ${nome}`, "", `Atualizado em ${br.fmt(hoje)}.`, ""];
  if (prosa) { linhas.push(prosa); linhas.push(""); }
  const mudados = [];
  const semResposta = [];
  const conflitos = [];

  for (const campo of CAMPOS) {
    const veio = achados[campo.chave];
    const tipo = classificar(veio);
    const antigo = String(antesPorChave[campo.chave] || "").trim();
    const conteudo = sobra(antigo);
    const vago = conteudo.length > 0 && temVago(antigo);
    const cheio = conteudo.length >= minimo && !vago;

    linhas.push(`## ${campo.rotulo}`);
    linhas.push("");

    if (tipo === "respondido" && !conteudo.length) {
      // campo vazio, ou só com dúvida registrada: a resposta nova é o conteúdo
      linhas.push(veio);
      linhas.push("");
      linhas.push(`_Fonte: resposta de ${nome}, ${br.fmt(hoje)}._`);
      const antes = !antigo ? "vazio" : RE_DUVIDA.test(antigo) ? "dúvida registrada" : "só placeholder";
      mudados.push({ chave: campo.chave, rotulo: campo.rotulo, de: antes, para: "preenchido" });
    } else if (tipo === "respondido" && !cheio) {
      // estava pela metade: a resposta nova assume, e o texto antigo fica à vista
      linhas.push(veio);
      linhas.push("");
      linhas.push(`_Fonte: resposta de ${nome}, ${br.fmt(hoje)}. Antes estava escrito aqui: "${umaLinha(antigo)}" — confira se bate._`);
      mudados.push({ chave: campo.chave, rotulo: campo.rotulo, de: "parcial", para: "preenchido" });
      conflitos.push({ chave: campo.chave, rotulo: campo.rotulo, antigo: umaLinha(antigo), novo: umaLinha(veio) });
    } else if (tipo === "respondido" && umaLinha(veio) !== umaLinha(antigo) && sobra(veio) !== conteudo) {
      // já estava respondido e voltou outra coisa: não sobrescreve, mostra as duas
      linhas.push(antigo);
      linhas.push("");
      linhas.push(`**Resposta de ${br.fmt(hoje)}, diferente do que estava aqui:** ${umaLinha(veio)}`);
      conflitos.push({ chave: campo.chave, rotulo: campo.rotulo, antigo: umaLinha(antigo), novo: umaLinha(veio) });
    } else if (tipo === "respondido") {
      linhas.push(antigo);
    } else if (tipo === "nao sei" && !conteudo.length) {
      linhas.push(`_Dúvida registrada em ${br.fmt(hoje)}: foi perguntado, e a resposta foi "${umaLinha(veio)}"._`);
      semResposta.push({ chave: campo.chave, rotulo: campo.rotulo, motivo: "não sei" });
    } else if (antigo) {
      linhas.push(antigo);
      if (!conteudo.length) {
        semResposta.push({
          chave: campo.chave, rotulo: campo.rotulo,
          motivo: RE_DUVIDA.test(antigo) ? "dúvida de antes, ainda sem resposta" : "sem resposta",
        });
      }
    } else {
      linhas.push("Em aberto.");
      semResposta.push({ chave: campo.chave, rotulo: campo.rotulo, motivo: "sem resposta" });
    }
    linhas.push("");
  }

  if (achados.__extra) {
    linhas.push("## O que ele acrescentou");
    linhas.push("");
    linhas.push(achados.__extra);
    linhas.push("");
    linhas.push(`_Fonte: resposta de ${nome}, ${br.fmt(hoje)}._`);
    linhas.push("");
  }

  for (const sec of preservadas) {
    linhas.push(`## ${sec.rotulo}`);
    linhas.push("");
    linhas.push(sec.corpo);
    linhas.push("");
  }

  const novo = linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  const depois = diagnosticar(novo, opcoes);
  const destravadas = depois.prontas.filter((s) => !diag.prontas.includes(s));
  return {
    md: novo, mudados, semResposta, conflitos,
    preservadas: preservadas.map((x) => x.rotulo), antes: diag, depois, destravadas,
  };
}

// ─────────────────────────── saídas de terminal ───────────────────────────

const SINAL = { preenchido: "✓", parcial: "~", duvida: "?", vazio: "·" };
const NOME_ESTADO = { preenchido: "preenchido", parcial: "parcial", duvida: 'perguntado, voltou "não sei"', vazio: "vazio" };

function imprimirCampos(diag) {
  const largura = Math.max(...diag.campos.map((c) => c.rotulo.length));
  console.log("");
  for (const t of TEMAS) {
    const doTema = diag.campos.filter((c) => c.tema === t.chave);
    if (!doTema.length) continue;
    console.log(`  ${t.titulo}`);
    for (const c of doTema) {
      const onde = c.achadoEm ? ` (${c.achadoEm})` : "";
      console.log(`    ${SINAL[c.estado]} ${c.rotulo.padEnd(largura)}  peso ${c.peso}  ${NOME_ESTADO[c.estado]}${onde}`);
    }
    console.log("");
  }
  const conta = (e) => diag.campos.filter((c) => c.estado === e).length;
  const partes = [`${conta("preenchido")} preenchido(s)`, `${conta("parcial")} parcial(is)`];
  if (conta("duvida")) partes.push(`${conta("duvida")} com "não sei" registrado`);
  partes.push(`${conta("vazio")} vazio(s)`);
  console.log(`  ${partes.join(", ")}.`);
  if (diag.prontas.length) console.log(`  Já dá pra rodar: ${diag.prontas.join(" ")}`);
  for (const t of diag.travadas) console.log(`  ${t.skill} espera: ${t.faltando.join(", ")}`);
  console.log("");
}

function imprimirReferencia() {
  console.log("");
  console.log("| Campo | Tema | Peso | Destrava |");
  console.log("|---|---|---|---|");
  for (const c of ordenar(CAMPOS.map((x) => x.chave))) {
    const tema = (TEMAS.find((t) => t.chave === c.tema) || {}).titulo || c.tema;
    console.log(`| **${c.rotulo}** (\`${c.chave}\`) | ${tema} | ${c.peso} | ${c.destrava.join(" ")} |`);
  }
  console.log("");
  console.log("Skill e os campos que ela espera:");
  console.log("");
  for (const [skill, exigidos] of Object.entries(PRONTAS)) console.log(`  ${skill.padEnd(20)} ${exigidos.join(", ")}`);
  console.log("");
  console.log("Papel (--para) e os campos que ele tem como responder:");
  console.log("");
  const furos = [];
  for (const [nome, papel] of Object.entries(PAPEIS)) {
    console.log(`  ${nome.padEnd(12)} ${papel.campos ? papel.campos.join(", ") : "todos"}`);
    for (const k of papel.campos || []) {
      if (!papel.pergunta[k]) furos.push(`${nome}/${k}`);
    }
  }
  console.log("");
  if (furos.length) {
    console.log(`  ! Sem pergunta própria pro papel (vai sair com o texto do cliente): ${furos.join(", ")}`);
    console.log("");
  }
}

// ─────────────────────────── linha de comando ───────────────────────────

function ajuda() {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#![^\n]*\n\/\*\*\n|^ \* ?|^ \*$/gm, ""));
}

function lerBriefing(caminho) {
  if (!caminho) morrer("Falta o caminho do briefing.", 'Uso: node scripts/briefing.js campos "clientes/Padaria/briefing.md"');
  if (!fs.existsSync(caminho)) {
    console.error(`\n! ${caminho} ainda não existe: todo campo conta como vazio.\n`);
    return "";
  }
  return fs.readFileSync(caminho, "utf8");
}

function nomeDoCaminho(caminho, args) {
  const forcado = pegarOpcao(args, "--nome");
  if (forcado) return forcado;
  const partes = path.resolve(caminho).split(path.sep);
  const i = partes.lastIndexOf("clientes");
  if (i >= 0 && partes[i + 1]) return partes[i + 1];
  const pai = partes[partes.length - 2];
  if (pai && !["", ".", "briefings", "projetos"].includes(pai)) return pai;
  return path.basename(caminho, path.extname(caminho));
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--ajuda") || args.includes("-h")) { ajuda(); process.exit(0); }

  const comValor = new Set(["--minimo", "--para", "--decisao", "--max", "--campos", "--prazo", "--saida", "--nome", "--questionario"]);
  const conhecidas = new Set([...comValor, "--json", "--tudo", "--incompletos", "--aplicar", "--ajuda", "-h"]);
  for (const a of args) {
    if (a.startsWith("--") && !conhecidas.has(a)) morrer(`Não conheço a opção "${a}".`, "Rode `node scripts/briefing.js --ajuda` pra ver a lista.");
  }
  const soltos = [];
  for (let i = 0; i < args.length; i++) {
    if (comValor.has(args[i])) { i++; continue; }
    if (!args[i].startsWith("--")) soltos.push(args[i]);
  }
  const acao = (soltos[0] || "").toLowerCase();
  const minimo = pegarOpcao(args, "--minimo");
  if (minimo !== null && !(Number(minimo) > 0)) morrer(`--minimo "${minimo}" precisa ser um número maior que zero.`);
  const json = args.includes("--json");

  if (acao === "referencia") { imprimirReferencia(); return; }

  if (acao === "campos") {
    const caminho = soltos[1];
    const diag = diagnosticar(lerBriefing(caminho), { minimo });
    if (json) { console.log(JSON.stringify(diag, null, 2)); return; }
    imprimirCampos(diag);
    return;
  }

  if (acao === "perguntar") {
    const caminho = soltos[1];
    const md = lerBriefing(caminho);
    const diag = diagnosticar(md, { minimo });
    const prazoStr = pegarOpcao(args, "--prazo");
    const prazo = prazoStr ? br.lerData(prazoStr) : null;
    if (prazoStr && !prazo) morrer(`--prazo "${prazoStr}" não é uma data válida (DD/MM/AAAA).`);
    const maxStr = pegarOpcao(args, "--max");
    const max = maxStr ? Number(maxStr) : 12;
    if (maxStr && (!Number.isFinite(max) || max < 1)) morrer(`--max "${maxStr}" precisa ser um número maior que zero.`);
    const paraStr = (pegarOpcao(args, "--para") || "cliente").toLowerCase();
    if (!PAPEIS[paraStr]) morrer(`--para "${paraStr}" não existe.`, `Escolha um: ${Object.keys(PAPEIS).join(", ")}.`);
    const forcados = (pegarOpcao(args, "--campos") || "").split(",").map((x) => x.trim()).filter(Boolean);
    for (const f of forcados) {
      if (!CAMPOS.some((c) => c.chave === f)) morrer(`--campos: "${f}" não é um campo canônico.`, "Rode `node scripts/briefing.js referencia` pra ver a lista.");
    }

    const q = questionario({
      nome: nomeDoCaminho(caminho || "cliente", args), diag, para: paraStr,
      decisao: pegarOpcao(args, "--decisao") || "", max, forcados, tudo: args.includes("--tudo"),
      incompletos: args.includes("--incompletos"), prazo,
    });
    if (json) { console.log(JSON.stringify({ dentro: q.dentro, fora: q.fora, foraPorPapel: q.foraPorPapel, total: q.total }, null, 2)); return; }

    if (!q.dentro.length) {
      const estado = (e) => diag.campos.filter((c) => c.estado === e).map((c) => c.rotulo);
      const pistas = [];
      if (estado("parcial").length) pistas.push(`pela metade: ${estado("parcial").join(", ")}`);
      if (estado("duvida").length) pistas.push(`já voltou "não sei": ${estado("duvida").join(", ")}`);
      if (q.foraPorPapel.length) pistas.push(`fora porque o ${q.papel} não responde: ${q.foraPorPapel.map((f) => f.rotulo).join(", ")}`);
      morrer(
        `Nenhum campo vazio que o ${q.papel} tenha como responder: não há questionário a mandar.`,
        `${pistas.join(" · ") || "o briefing está completo"}\n  Pra revisar o que está pela metade: --incompletos. Pra escolher na mão: --campos objetivo,prazo.`
      );
    }

    const saida = pegarOpcao(args, "--saida");
    if (saida) {
      fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
      fs.writeFileSync(saida, q.md);
      console.log(`\n✓ Questionário: ${saida}`);
      const quantas = q.total - 1;
      console.log(`  ${quantas} pergunta${quantas === 1 ? "" : "s"} pro ${q.papel} mais o campo aberto do fim, do que pesa mais pro que pesa menos.`);
      if (q.fora.length) console.log(`  Ficou pra segunda rodada (peso menor): ${q.fora.map((f) => f.rotulo).join(", ")}`);
      if (q.foraPorPapel.length) console.log(`  Fora porque o ${q.papel} não tem como responder: ${q.foraPorPapel.map((f) => f.rotulo).join(", ")}`);
      const pendentes = diag.campos.filter((c) => c.estado === "parcial" || c.estado === "duvida");
      if (pendentes.length) console.log(`  Não entrou por já ter texto ou já ter sido perguntado: ${pendentes.map((c) => c.rotulo).join(", ")} (--incompletos inclui)`);
      console.log(`  Word: node scripts/gerar-docx.js "${saida}"\n`);
    } else process.stdout.write(q.md);
    return;
  }

  if (acao === "voltar") {
    const caminho = soltos[1];
    const resposta = soltos[2];
    if (!resposta) morrer("Falta o arquivo de resposta.", 'Uso: node scripts/briefing.js voltar "clientes/Padaria/briefing.md" "clientes/Padaria/resposta.docx" --aplicar');
    if (!fs.existsSync(resposta)) morrer(`"${resposta}" não existe.`);
    const md = lerBriefing(caminho);
    const enviado = pegarOpcao(args, "--questionario");
    if (enviado && !fs.existsSync(enviado)) morrer(`--questionario "${enviado}" não existe.`);
    // Sem o questionário enviado não se adivinha por posição: "3." vira o campo
    // errado sem ninguém perceber, e resposta trocada de campo é pior que resposta faltando.
    const mapa = enviado ? ordemDoQuestionario(fs.readFileSync(enviado, "utf8")) : null;
    const achados = casar(textoDaResposta(resposta), mapa && mapa.ordem, !!(mapa && mapa.fonte === "frontmatter"));
    if (!Object.keys(achados).length) {
      morrer(
        "Não reconheci nenhuma pergunta no arquivo de resposta.",
        enviado
          ? "A resposta precisa manter a numeração das perguntas ou o texto delas. Confira se o arquivo é mesmo a resposta deste questionário."
          : "Passe --questionario <o arquivo que você enviou>: é o frontmatter dele que diz qual resposta é de qual campo, e sem isso só o texto original das perguntas casa."
      );
    }
    const r = preencher(md, achados, { minimo, nome: nomeDoCaminho(caminho, args) });

    if (json) { console.log(JSON.stringify({ achados, mudados: r.mudados, semResposta: r.semResposta, conflitos: r.conflitos, preservadas: r.preservadas, destravadas: r.destravadas }, null, 2)); return; }

    console.log("");
    console.log(`  Respostas casadas: ${r.mudados.length}`);
    for (const m of r.mudados) console.log(`    ✓ ${m.rotulo}`);
    for (const s of r.semResposta) console.log(`    · ${s.rotulo} — ${s.motivo}`);
    if (achados.__extra) console.log(`    + acrescentou algo no campo aberto do fim`);
    console.log("");
    for (const c of r.conflitos) {
      console.log(`  ! ${c.rotulo}: o arquivo dizia "${c.antigo.slice(0, 60)}" e a resposta diz "${c.novo.slice(0, 60)}".`);
      console.log(`    Confirme com o usuário qual vale antes de gravar.`);
    }
    if (r.conflitos.length) console.log("");
    if (r.preservadas.length) console.log(`  Mantive as seções que não são campo do briefing: ${r.preservadas.join(", ")}\n`);
    if (r.destravadas.length) console.log(`  Passou a dar pra rodar: ${r.destravadas.join(" ")}`);
    else console.log(`  Nenhuma skill nova destravou. Já dava pra rodar: ${r.depois.prontas.join(" ") || "nenhuma"}`);
    for (const t of r.depois.travadas) console.log(`  ${t.skill} ainda espera: ${t.faltando.join(", ")}`);
    console.log("");

    if (args.includes("--aplicar")) {
      fs.mkdirSync(path.dirname(path.resolve(caminho)), { recursive: true });
      fs.writeFileSync(caminho, r.md);
      console.log(`✓ Briefing gravado: ${caminho}\n`);
    } else {
      console.log("--- o briefing que eu gravaria (rode de novo com --aplicar) ---\n");
      process.stdout.write(r.md);
    }
    return;
  }

  morrer(`Não conheço a ação "${soltos[0] || ""}".`, "As ações são: campos, perguntar, voltar, referencia. Rode --ajuda pra ver as opções.");
}

module.exports = {
  CAMPOS, TEMAS, PRONTAS, PAPEIS, perguntaDoPapel, diagnosticar, candidatos, blocos, sobra, temVago,
  ordenar, porPeso, questionario, casar, classificar, preencher, separarAntigo,
  normal, rotuloDaLinha, chaveDoRotulo, parecido, campoDaLinha, ordemDoQuestionario, FECHAMENTO,
};

if (require.main === module) main();
