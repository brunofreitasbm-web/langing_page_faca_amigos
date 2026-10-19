# CONTEXTO DO PROJETO — FAÇAAMIGOS TV (VITRINE DIGITAL)

> **Documento de Contexto Estratégico, Cultura e Diretrizes Técnicas**  
> **Ecossistema:** Instituto FaçaAmigos (Playground Inclusivo, Circuito de Carrinhos e Clínica de Terapia Comportamental)  
> **Local de Operação:** Belém/PA — Parque Shopping Belém e Unidades de Atendimento  
> **Canal:** Telas e Smart TVs das Operações  
> **URL da Aplicação:** `https://institutofacaamigos.com.br/tv` (atalho `/tv` ou `/vitrine-digital`)

---

## 1. Visão Geral do Projeto

Cada operação do ecossistema FaçaAmigos (Playground Inclusivo, Circuito de Carrinhos e Clínica) conta com uma Smart TV dedicada instalada no quiosque ou salão.

O objetivo da **FaçaAmigos TV** é transformar essas telas em uma **Vitrine Digital Inteligente e Canal de Cultura Interna**, operando de forma 100% autônoma desde a abertura do shopping até o fechamento (10h às 22h), **sem exigir qualquer ação diária dos colaboradores**.

### Premissas Operacionais
1. **Zero Curva de Aprendizado para a Equipe:** O colaborador apenas abre o navegador da TV, digita a URL curta `/tv`, aciona a tela cheia (F11 ou toque duplo) e a página gerencia todo o ciclo de vida sozinha.
2. **Zero Scrollbar e 100% Responsivo a 16:9:** O layout é travado rigidamente em `100vw` e `100vh` (`overflow: hidden`), sem barras de rolagem ou elementos flutuantes indesejados. O design é otimizado para resoluções Full HD (1920x1080) e 4K.
3. **Leveza para Hardware de TV:** Navegadores de Smart TVs (Tizen/Samsung, webOS/LG, Android TV) possuem poder de processamento e GPU limitados. O projeto utiliza HTML, CSS puro com aceleração por hardware (`transform`, `opacity`) e Vanilla JavaScript leve, sem frameworks pesados, garantindo 60fps constantes sem vazamento de memória.
4. **Resiliência a Quedas de Conexão:** Após o primeiro carregamento, o ciclo de rotação é 100% autônomo localmente, funcionando mesmo se houver oscilação de Wi-Fi.

---

## 2. Cultura, Princípios de Atendimento e DNA FaçaAmigos

Toda a comunicação do FaçaAmigos TV reflete os pilares fundados pela psicóloga infantil **Dra. Isabella Gonçalves Freitas (CRP 10/4727)** e pela direção do Instituto:

### Os 4 Pilares da Cultura FaçaAmigos
1. **É para Todas as Crianças:**
   - Crianças típicas e atípicas (com autismo/TEA, TDAH, deficiências motoras, sensoriais ou sem nenhum diagnóstico) brincam e aprendem juntas no mesmo espaço.
   - *Inclusão não é separar nem criar um gueto; é desenhar um ambiente onde ninguém fique de fora.*
2. **Linguagem Humanizada e Não-Estigmatizante:**
   - **Usar:** "criança típica", "criança atípica", "necessidade de suporte", "brincar com propósito".
   - **Jamais usar:** "criança normal", "criança especial", "criança problemática" ou promessas milagrosas de "cura".
   - **Postura da Recepção:** Em vez de "ele tem algum problema?", a abordagem de excelência é: *"Tem algo que ajude a gente a cuidar melhor dele hoje?"*.
3. **O Brincar com Propósito:**
   - O brincar é o canal primário de desenvolvimento infantil, regulação emocional, socialização e formação de laços afetivos.
4. **Espaço Seguro e Regulação Sensorial:**
   - Iluminação agradável, opções de cantinho da calma / descompressão, mediadores treinados e acolhimento familiar sem julgamentos.

---

## 3. Arquitetura de Conteúdo: Ciclo Rotativo de 5 Dias & Exibição Randômica

Para que a experiência seja sempre fresca, interessante e nunca cansativa tanto para os colaboradores que passam o dia na loja quanto para as famílias que visitam o shopping com frequência, o sistema implementa um **Ciclo de 5 Dias com Randomização Inteligente**:

```
┌────────────────────────────────────────────────────────────────────────┐
│             CICLO DE 5 DIAS (NÃO REPETE EM MENOS DE 5 DIAS)            │
├─────────┬───────────────────────────────┬──────────────────────────────┤
│ DIA     │ 10h00 às 15h59 (EQUIPE)       │ 16h00 às 22h00 (FAMÍLIAS)    │
├─────────┼───────────────────────────────┼──────────────────────────────┤
│ Dia 1   │ Acolhimento & Presença Plena  │ O Reino das Mascotes         │
│ Dia 2   │ Empatia Sensorial & Calma     │ Aventura na Piscina Gigante  │
│ Dia 3   │ O Brincar como Conexão        │ Circuito & Frota Esportiva   │
│ Dia 4   │ Apoio às Famílias & Escuta    │ Inclusão Real & Diversão     │
│ Dia 5   │ Cooperação & Propósito Coletivo│ Clínica & Desenvolvimento    │
└─────────┴───────────────────────────────┴──────────────────────────────┘
```

### 3.1. Cálculo Automático do Dia do Ciclo
- O sistema obtém a data atual do fuso de Belém (UTC-3) e calcula o índice do dia: `(dias_desde_epoca % 5) + 1`.
- A cada novo dia civil, um novo conjunto completo de pílulas entra em cartaz.
- **Dessa forma, uma mensagem só se repete de 5 em 5 dias.**

### 3.2. Randomização (Shuffle)
- Dentro do pool do dia, a ordem de exibição é embaralhada randomicamente (algoritmo Fisher-Yates), evitando que a sequência seja monótona ou previsível durante as 6 horas de cada turno.

---

## 4. Os Dois Turnos de Exibição

### 4.1. Turno Manhã / Tarde (10h00 às 15h59) — Foco na Equipe & Acolhimento
* **Contexto do Shopping:** Baixo fluxo de clientes nos corredores. A equipe está na operação, arrumando o espaço e se preparando para o atendimento.
* **Abordagem:** Não é um manual de treinamento pesado nem texto didático longo. São **micro-pílulas de psicologia positiva, reflexão e comunicação empática**, transmitidas de forma sutil e acolhedora.
* **Os 5 Temas Diários da Equipe:**
  - **Dia 1 — Acolhimento & Presença Plena:** Olhar nos olhos, postura corporal aberta, a pergunta de ouro da recepção ("Tem algo que ajude a gente a cuidar melhor dele hoje?").
  - **Dia 2 — Empatia Sensorial & Calma:** Entender que a agitação é um pedido de pausa; usar o cantinho da calma; o tom de voz sereno que acalma o ambiente.
  - **Dia 3 — O Brincar como Conexão:** Estar na altura da criança; incentivo amoroso no chão; respeito ao tempo de cada uma; celebrar pequenas vitórias.
  - **Dia 4 — Apoio às Famílias & Escuta Ativa:** Compreensão com os pais que chegam cansados; escuta sem julgamento; acolher a família inteira como parceira.
  - **Dia 5 — Cooperação & Propósito:** Crianças típicas e atípicas aprendem juntas; o orgulho de construir memórias felizes na infância de alguém.

### 4.2. Turno Tarde / Noite (16h00 às 22h00) — Foco nas Crianças & Famílias
* **Contexto do Shopping:** Horário de pico de movimento. Mães, pais, avós e crianças passeando pelo corredor e pela praça.
* **Abordagem:** Atração visual de alto impacto (Hero dinâmico), fotos reais das atrações em alta resolução, selos divertidos e mensagens de segurança para os pais.
* **Os 5 Temas Diários da Vitrine:**
  - **Dia 1 — O Reino das Mascotes:** A Capivara e o Macaco em pelúcias gigantes para abraçar e passear pelo shopping.
  - **Dia 2 — Aventura na Piscina Gigante:** A maior piscina de bolinhas, casinha na árvore, escorregadores e monitores treinados.
  - **Dia 3 — Circuito & Frota Esportiva:** Range Rover, Lamborghini e Caminhão de Bombeiro elétricos para os pequenos pilotos.
  - **Dia 4 — Inclusão Real:** É para todas as crianças! Com ou sem laudo, todo mundo brinca junto. Meia-entrada inclusiva garantida por lei.
  - **Dia 5 — Clínica & Desenvolvimento:** O centro especializado em Terapia ABA, Terapia Ocupacional e Fonoaudiologia no Umarizal pela Dra. Isabella Freitas.

### 4.3. Turno Noturno (22h00 às 09h59) — Stand-by Suave
* Tela escura relaxante para Smart TV (proteção de tela contra burn-in), relógio digital grande e aviso: *"Até amanhã! Abrimos às 10h00."*

---

## 5. Teclas de Atalho e Controles para Demonstração

Para facilitar testes, reuniões de equipe e demonstrações a investidores sem precisar esperar o horário real:

| Tecla / Ação | Função |
|---|---|
| **`1`** | Força o **Turno da Equipe (10h–16h)** |
| **`2`** | Força o **Turno das Crianças & Vitrine (16h–22h)** |
| **`0`** ou **`A`** | Retorna ao **Modo Automático** por relógio |
| **`[` e `]`** | Alterna manualmente entre os **Dias 1 a 5 do Ciclo** |
| **`F`** ou Duplo Clique | Alterna modo **Tela Cheia (Fullscreen)** |
| **`G`** | Abre o **Mini-Game Interativo** (Roadmap) |

---

## 6. Inventário de Imagens Oficiais

| Imagem | Descrição |
|---|---|
| `img/circuito-equipe-capivara.webp` | A querida Capivara gigante do Circuito com a equipe |
| `img/circuito-macaco.webp` | A mascote Macaco gigante no Circuito |
| `img/hero-piscina-bolinhas.webp` | A enorme piscina de bolinhas do Playground |
| `img/playground-piscina-casinha.webp` | Vista panorâmica da casinha e do salão |
| `img/circuito-bombeiro.webp` | O caminhão de bombeiro elétrico |
| `img/circuito-frota-alinhada.webp` | Frota esportiva alinhada de carrinhos |
| `img/playground-mediadora-tapete.webp` | Mediadora de inclusão acolhendo no tapete |
| `img/equipe-recepcao.webp` | Equipe de recepção unida |
| `img/inclusao-cantinho-leitura.webp` | Canto de descompressão, calma e leitura |
| `img/galeria-oficinas.webp` | Oficinas criativas e integração infantil |
| `img/clinica-painel-sensorial.webp` | Painel sensorial do Centro de Terapia |
| `img/logo-simbolo.png` | Símbolo e ícone oficial da marca |

---

## 7. TV2 — Vitrine Digital Vertical do Quiosque do Circuito (`/tv2`)

O quiosque do Circuito de Carrinhos Elétricos conta com uma TV própria montada na vertical (totem / TV deitada a 90º no sentido horário).

### 7.1. Características da TV2 (`tv2.html`):
- **Canal Exclusivo:** Conteúdo 100% voltado para os carrinhos elétricos, caminhão de bombeiro, lamborghini, pelúcias gigantes (Capivara e Macaco) e pequenos pilotos.
- **Orientação 90º com Seletor Inteligente:** Suporta TVs que transmitem sinal em paisagem física através da classe `.rotate-90` (tecla `R` no teclado ou botão no HUD para alternar rotação 90º, 0º e 270º).
- **Barra Grande no Pé com Tabela de Valores de Planos:**
  - **Pelúcias & Jeep:** R$ 48 por 20 minutos (minuto adicional: R$ 3,00).
  - **Carros Esportivos & Moto:** R$ 48 por 30 minutos (minuto adicional: R$ 3,00).
  - **Programa Fidelidade:** A cada 10 passeios registrados no CPF, a 10ª visita de 30 minutos é 100% gratuita!
  - **Facilidade:** Sem agendamento prévio, pagamento via Pix e cartões no quiosque.
- **Fontes de Mídia:** Fotos selecionadas das pastas compartilhadas do Google Drive (`Faça Amigos 🧩` e `Faça Amigos - Mídia 🧩`) armazenadas em `img/circuito-tv2/` e fotos oficiais do repositório.

---

## 8. Roadmap Futuro: Jogos Interativos na TV

Preparação para totens interativos e telas touch:
- Camada `#game-layer` já implementada e isolada.
- Mini-game experimental de estourar bolinhas sensoriais colorido já funcional (acionável via tecla `G` ou botão no HUD).
- Timeout de 30 segundos de inatividade para retorno automático à Vitrine Digital.
- Estrutura pronta para plugar futuros jogos: Memória dos Amigos, Labirinto dos Bichos, Circuito Piloto.

