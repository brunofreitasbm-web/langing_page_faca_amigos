# Auditoria de copy e conversão — FaçaAmigos

Data: 15/10/2026 · Base: leitura do código-fonte das páginas do repositório (texto, CTAs, preços, fluxos). Não vi analytics, taxa de conversão nem o site da Clínica (`clinica.institutofacaamigos.com.br`, outro projeto). Tudo que aparece como "ganho esperado" é **hipótese a testar**, não resultado.

---

## 1. Veredito

A copy já é acima da média: tem empatia, linguagem simples e o e-book segue uma estrutura Problema → Agitação → Solução bem executada. O problema não é o texto. **A receita está vazando em quatro lugares estruturais**, e nenhum deles se resolve com frase mais bonita:

1. O mapeamento (`/teste`) pede 8 campos antes da primeira pergunta e exclui crianças menores de 4 anos.
2. O Playground, que é um serviço sem agendamento, empurra o visitante para o WhatsApp em vez de para a visita.
3. A Clínica vende uma promessa sem data, sem captura estruturada e com convênios ainda não confirmados.
4. A tabela de preços tem uma anomalia (Passaporte x Day Use) e o cupom do Wi-Fi esvazia o benefício inclusivo.

Prioridade: corrija esses quatro antes de reescrever qualquer título.

---

## 2. Problemas ordenados por impacto

### P1 — `/teste`: gate de dados antes do valor (maior vazamento do funil)

> **Status (15/10/2026): implementado no PR #45.** O contato agora é pedido depois da 25ª pergunta. A faixa 0–3 anos continua bloqueada (decisão pendente) e o título não foi trocado (aguarda A/B).

**O que está lá:** a tela inicial pede nome da criança, faixa etária, quem responde, seu nome, WhatsApp, e-mail, unidade de interesse e dois consentimentos. Só depois vêm as 25 perguntas.

**Por que prejudica:** o visitante ainda não recebeu nada e já pagou o custo máximo (dados pessoais + 2 consentimentos). Cada campo derruba a conversão. Você também perde o efeito de compromisso e coerência: quem respondeu 25 perguntas sobre o próprio filho está muito mais disposto a dar o e-mail para "receber o resultado" do que quem ainda não começou.

**Proposta:**
- Tela 1: só o primeiro nome da criança e a faixa etária. Começa direto nas perguntas.
- Entre a pergunta 20 e o resultado: pede WhatsApp + e-mail com a justificativa real ("para onde enviamos o retrato do Pedro").
- Unidade de interesse e "quem está respondendo" saem do formulário (derive da origem do clique ou pergunte depois).
- Mantém os dois consentimentos, mas separados do campo obrigatório de contato.

**Segundo problema, no mesmo fluxo:** o texto diz "pensado para crianças de 4 a 17 anos" e manda quem tem filho menor para o WhatsApp. O Playground atende 0–12 e os dois e-books dizem ser para "crianças pequenas / primeira infância". Ou seja, a faixa de maior apelo comercial é exatamente a que o teste rejeita. Decida: ou cria uma versão 2–3 anos, ou deixa o teste aberto e avisa que a leitura é menos precisa.

**Copy do título:** "Pare de se perguntar se é normal." (repetida em `/teste`, no Hub, em `/aprender` e nos artigos) abre um binário normal/anormal e contradiz o "sem rótulo" que vem logo abaixo. Também é um gancho de medo; para um público que já sofre com culpa, aumenta a ansiedade e é terreno sensível pela ética profissional da psicologia. Teste:

| Variante | Mecanismo |
|---|---|
| A (atual) "Pare de se perguntar se é normal." | dúvida/medo |
| B "Em 5 minutos, descubra o que seu filho está tentando dizer." | curiosidade + ganho |
| C "O que o comportamento do seu filho está comunicando? Responda 25 perguntas e receba o retrato." | clareza + processo |

Troque também "Nada de spam" por "Só enviamos o seu resultado e, se você quiser, dicas curtas": negar a palavra a ativa.

### P2 — Playground: CTA principal é o WhatsApp para um serviço sem agendamento

**O que está lá:** hero com "Quero levar meu filho" → `wa.me`. São 17 links de WhatsApp só em `playground.html`.

**Por que prejudica:** quem decide ir ao playground já está no shopping ou a caminho. A pergunta real é "fica onde, abre agora, quanto custa". Mandar para uma conversa cria etapa, espera e abandono. O WhatsApp serve para dúvida, não para a ação principal.

**Proposta:**
- CTA primário: **"Como chegar"** (Maps) + **"Abre hoje até 22h"** calculado pela hora do dia.
- CTA secundário: WhatsApp só para dúvida.
- A faixa do topo diz "Já aberto!" fixo. Às 22h30 isso é falso e queima confiança. Troque por estado dinâmico: "Aberto agora, fecha às 22h" / "Fechado, abre amanhã às 10h".
- Na barra fixa do celular (`fa-cta.js`), use "Como chegar" como ação principal.

### P3 — Clínica: promessa sem data, captura frágil e risco com convênios

**O que está lá:** "Em breve · IASEP & PROASA" em destaque; lista de espera por mensagem de WhatsApp.

**Problemas:**
- **Sem data nem faixa** ("previsão: 1º trimestre/2027"). Sem prazo, não há urgência e a lista vira um vácuo.
- **Sem contrapartida pela espera.** Por que entrar agora? Ofereça algo concreto: avaliação prioritária, devolutiva do mapeamento com a psicóloga, ou acesso a um encontro do Instituto.
- **Lista no WhatsApp pessoal** não é CRM: sem posição, sem nutrição automática, sem segmentação por queixa. Capture em formulário curto (ou no próprio `/teste`) e grave em Supabase.
- **Risco de promessa:** "Convênios IASEP e PROASA" aparece como selo no Hub, no `/servicos` e no rodapé, mas o texto admite "detalhes confirmados na abertura". Se o credenciamento não estiver concluído, é propaganda de algo que você ainda não pode entregar (CDC art. 37). Suavize para "em processo de credenciamento" até ter o aceite por escrito.
- A estrutura de "Pra quem é / O que acontece / O que muda pra você" em `/servicos` é boa. Falta o passo de **Implicação** do SPIN (ver seção 4): o que acontece se a família esperar mais um ano.

### P4 — Preços e ofertas: uma anomalia e uma contradição

1. **Passaporte mensal "10 horas/mês" = R$ 840** (R$ 700 inclusiva) enquanto **Day Use "10 horas no mesmo dia" = R$ 270** (R$ 225). A mesma quantidade de horas custa 3,1× mais só por ser distribuída no mês, o que é o contrário da lógica de recorrência. Ou é erro de digitação/descrição, ou o passaporte é outra coisa (visitas, não horas). Qualquer visitante que faça essa conta perde a confiança em toda a tabela. Esclarecer antes de qualquer outra otimização.
2. **Cupom do Wi-Fi vs. meia inclusiva.** O portal (`/hotspot/login`, `/wifi`) promete "Meia inclusiva fixa em R$ 50 no Playground, todo dia" a qualquer um que se cadastre. Resultado: o desconto que o site apresenta como acolhimento a famílias atípicas vira promoção geral. Para a família com laudo, o benefício perde valor percebido; para o público geral, cria a expectativa de que R$ 60 é preço "de otário". Use outro mecanismo (ex.: "+10 min grátis") e preserve a meia-entrada inclusiva para quem tem laudo/CIPTEA. *Isso pode ser decisão consciente; é a primeira pergunta do quiz abaixo.*
3. **"A conta que a maioria das famílias faz"**: R$ 114 (30+30) vs R$ 108 (1h). Economia de R$ 6 não move ninguém. O argumento forte é "pelo preço de 1h você leva o Olhar FaçaAmigos". Reescreva o bloco em torno disso, e só diga "maioria" se o dado existir (o sistema registra 7.500 visitas; use o número real: "X% das famílias que começam com 30 min pedem mais 30").
4. **Fidelidade** ("10ª entrada grátis") repetida em bloco idêntico em Hub, Playground e Circuito. É a mesma frase colada; reduz a leitura e o progresso fica invisível. Mostre o progresso ("7 de 10 — faltam 3") por WhatsApp ou cartão. O Circuito vende 20 min nas pelúcias/jeep, mas a recompensa é uma "entrada de 30 minutos", que não bate.
5. **Nenhuma página oferece aniversário/festa.** Não encontrei "aniversário" ou "festa" em nenhum HTML. Para um playground, é o maior ticket único e é o gancho natural de indicação entre mães. Crie uma página/seção "Aniversário no FaçaAmigos" com 2–3 pacotes e só orçamento via WhatsApp.

### P5 — Prova social: boa em volume, fraca em especificidade e com número sem lastro

- Depoimentos como "Atendimento ótimo.", "nota 1000", "A atendente foi muito educada" provam que a equipe é simpática, mas **não tocam a objeção real**: "e se meu filho atípico tiver uma crise?". Priorize e destaque depoimentos de famílias atípicas (com autorização) falando de um momento específico: crise, primeira vez, o que a equipe fez.
- O Hub afirma **"+8 anos de atuação"**; as avaliações citadas são de 2026, o Circuito é "Novidade" e o Grão-Pará é recente. Se são 8 anos da marca Instituto/clínica, a página precisa dizer **de quê** (senão é lida como 8 anos de playground e, se não for, vira contradição). Não vi essa afirmação no Playground.
- "1.100 famílias" aparece corretamente com a fonte ("sistema de entrada e saída") no Playground, mas sem a fonte no Hub, no Wi-Fi e no hotspot. Padronize com a mesma fonte.
- Sem nota agregada: mostre "4,X no Google (N avaliações)" real, com link. Hoje há estrelas decorativas sem número. Isso também permite marcação `aggregateRating` (não encontrei no HTML).

### P6 — E-books: copy forte, oferta sem apoio

- Estrutura PAS bem feita. Pontos a corrigir: o uso de "mãe", "toda mãe", "se sentir menos sozinha", "agente de transformação… paciência consigo mesma" no feminino reduz o alcance (o FAQ do *Código* já diz "mães, pais, avós, tias"; o hero não).
- **Garantia de 7 dias é o mínimo legal (CDC art. 49)**, não diferencial. Estenda para 15 ou 30 dias, ou transforme em promessa específica ("se na primeira semana você não conseguir preencher o Diário de Bordo, devolvemos").
- **Preço R$ 149** para um PDF de 97 págs. sem prova social do livro (nenhum depoimento de leitora, sem número de downloads, sem trecho da leitora aplicando). O capítulo 1 grátis é ótimo; falta o degrau **entre o grátis e R$ 149**: o *Código* (40 págs.) deveria ter preço visível e funcionar como isca paga (R$ 29–39 como hipótese). Hoje a página do *Código* **esconde o valor** ("no checkout"); esconder preço em página de venda baixa a conversão e gera desconfiança.
- Não há bloco de upgrade *Código* → *Guia* nem bundle.

### P7 — Estrutura de CTAs e navegação

- O Hub apresenta 3 caminhos no hero (brincar / preocupação / clínica) e depois repete 5 CTAs com 4 destinos. Para quem chega do Google por "playground infantil Belém", o hero deveria vender **uma** coisa (a visita) e deixar as outras para depois.
- Em `/circuito`, o vídeo "real, sem edição" fica depois do hero. Em celular, o vídeo é a prova mais forte; suba. (Correção: uma versão anterior deste relatório dizia que a página não tinha meta description; tem, a leitura automática é que falhou.)
- `/eventos` sem eventos exibe "Nenhum encontro com inscrições abertas": ótimo ter lista de espera, mas o texto "os próximos são anunciados primeiro para quem já participou ou fez o mapeamento" não oferece ação para quem não fez nenhum. Coloque um campo de e-mail "avise-me do próximo".
- `/trabalhe-conosco`: 20 áreas em um único select e nenhuma proposta de valor (por que trabalhar aqui, salário/benefício/horário/trilha). O mesmo copy de acolhimento do site deveria estar aqui, pois a qualidade do atendimento é o produto.

---

## 3. Técnicas de persuasão: o que já funciona e o que falta

| Técnica | Onde aparece bem | Onde falta |
|---|---|---|
| **Promessa** (resultado + prazo) | "Ele brinca seguro, você descansa" (emocional, concreto no uso) | "Seguro" é commodity; diga *como* (pulseira + saída só com o responsável cadastrado) já no hero |
| **Confiança** | CRP 10/4727, Isabella como autora, preço transparente, política de "vagas reais" em eventos | Depoimentos específicos de famílias atípicas; fotos da equipe com nome; protocolo de crise descrito em 3 linhas |
| **Oferta** | Olhar FaçaAmigos (diferencial raro e tangível) | Aniversário, bundle de e-books, garantia estendida, urgência honesta |
| **Prova social** | Avaliações reais com "n-ª visita" (ótimo detalhe: mostra recorrência) | Nota agregada, casos atípicos, números com fonte padronizada |
| **Reciprocidade** | Capítulo 1 grátis, mapeamento grátis, artigos | Devolutiva do mapeamento com ação clara (hoje o resultado manda para vários CTAs ao mesmo tempo) |
| **Compromisso e coerência** | Quase ausente | Mapeamento sem gate inicial (P1) |
| **Aversão à perda** | Lista de espera com 24h para confirmar (evento) | Clínica sem data; fidelidade sem progresso |
| **Ancoragem** | Day Use e 2h mostram custo por minuto menor | A âncora do Passaporte contradiz o Day Use (P4.1) |

---

## 4. SPIN aplicado (exemplo para `/servicos` e para o resultado do mapeamento)

SPIN funciona em conversa, não em página estática; mas dá para espelhar a sequência nos blocos.

- **Situação:** "Seu filho tem entre 3 e 8 anos e a rotina da casa gira em torno das birras?" (reconhecimento, não pergunta de vendedor)
- **Problema:** "A escola já chamou mais de uma vez pela mesma queixa?" (já existe em "Sinais que valem uma conversa", bom)
- **Implicação:** *(falta em todo o site)* "Cada mês sem uma estratégia é um mês em que a criança aprende que gritar funciona e a família chega à próxima reunião da escola sem resposta."
- **Necessidade de solução:** "Imagine chegar à reunião com um registro ABC de duas semanas e um plano de três passos."

Cuidado ético: Implicação em saúde infantil cruza a linha para o medo fácil. Use um tom de **custo de adiar** (tempo, desgaste da família), nunca de risco de diagnóstico ou prognóstico.

---

## 5. PNL e mensagens sub-liminares: o que eu recomendo e o que não

**Recomendo (e já aparece em parte):**
- **Linguagem sensorial e de ritmo:** "senta, toma um café e olha de longe" funciona porque coloca o leitor na cena (pacing). Faça o mesmo no Circuito ("ele dirige, você acompanha a dois passos").
- **Pressuposição positiva:** "Quando for a primeira visita…" em vez de "se você for"; "ao chegar, você escolhe o tempo".
- **Negações a evitar:** "Nada de spam", "sem medo", "sem culpa", "sem crise" — o cérebro processa a palavra negada. Reescreva em afirmativo: "só o seu resultado", "com calma", "com apoio".
- **Futuro imaginado:** "No fim do dia, você recebe o Olhar da brincadeira dele" já faz isso muito bem.

**Não recomendo:** mensagens subliminares no sentido de estímulo oculto. Não há evidência de que funcione e, em saúde infantil, vira risco reputacional e regulatório (CDC, código de ética da Psicologia, LGPD). Persuasão aqui precisa ser transparente. A "persuasão invisível" que vale é clareza, ritmo, especificidade e prova.

---

## 6. Plano de execução

### Semana 1 (sem código novo, só decisão e texto)
1. Esclarecer o Passaporte mensal vs Day Use e corrigir a tabela (P4.1).
2. Decidir o cupom do Wi-Fi: manter R$ 50 para todos ou trocar (P4.2).
3. Suavizar "Convênios IASEP & PROASA" até haver credenciamento por escrito (P3).
4. Trocar "Já aberto!" por estado dinâmico (P2).
5. Padronizar prova social ("+1.100 famílias · 7.500 visitas · fonte") e corrigir/explicar "+8 anos".

### Semanas 2–3 (conversão)
6. Reestruturar `/teste`: gate mínimo + contato no final + faixa 2–3 anos (P1).
7. CTA do Playground: "Como chegar" primário; WhatsApp secundário (P2).
8. Clínica: data prevista, contrapartida pela espera, formulário em Supabase (P3).
9. Mostrar preço do *Código*, estender garantia, reescrever hero em linguagem neutra de gênero (P6).

### Semanas 4–6 (receita nova)
10. Página/seção "Aniversário no FaçaAmigos" (P4.5).
11. Depoimentos atípicos com autorização + nota agregada do Google (P5).
12. Progresso visível da fidelidade; bundle dos e-books.

### Testes A/B sugeridos (meça antes de generalizar)
| Teste | Variante A | Variante B | Métrica |
|---|---|---|---|
| Título do `/teste` | "Pare de se perguntar se é normal." | "Descubra o que seu filho está tentando dizer." | início do teste / visita |
| Gate do `/teste` | formulário completo antes | contato só no final | conclusão do teste, lead capturado |
| CTA do Playground | "Quero levar meu filho" (WhatsApp) | "Como chegar" (Maps) | cliques em rota + visitas |
| Preço do *Código* | oculto | visível | cliques no checkout |

---

## 7. O que eu não consegui avaliar

- **Dados reais** (GA4 via GTM-NPDJ58XR, funil do teste, vendas Hotmart, abandono do hotspot): sem eles, toda priorização acima é por julgamento.
- **Site da Clínica** (`clinica.institutofacaamigos.com.br`) e o sistema `sistema.` — são outros projetos.
- **Instagram, Google Business Profile e campanhas pagas** — fora do repositório.
- Não renderizei as páginas no navegador; li o HTML. Pode haver problemas visuais (hierarquia, contraste, tamanho de CTA no celular) que só aparecem na tela.
