# CONTEXTO DO PROJETO — FAÇAAMIGOS TV (VITRINE DIGITAL)

> **Documento de Contexto Estratégico, Doutrinário e Técnico**  
> **Ecossistema:** Instituto FaçaAmigos (Playground Inclusivo, Circuito de Carrinhos e Clínica de Terapia Comportamental)  
> **Local de Execução:** Belém/PA — Parque Shopping Belém e Unidades de Atendimento  
> **Canal:** Telas e Smart TVs das Operações  
> **URL da Aplicação:** `https://institutofacaamigos.com.br/tv` (atalho `/tv` ou `/vitrine-digital`)

---

## 1. Visão Geral do Projeto

Cada operação do ecossistema FaçaAmigos (Playground Inclusivo, Circuito de Carrinhos e Clínica) conta com uma Smart TV dedicada instalada no quiosque ou loja.

O objetivo do projeto **FaçaAmigos TV** é transformar essas telas em uma **Vitrine Digital Inteligente Autônoma**, que funciona continuamente desde a abertura do shopping até o fechamento (10h às 22h), **sem necessidade de intervenção do colaborador**, adaptando dinamicamente seu conteúdo com base no horário do dia e no público presente no corredor.

### Premissas de Operação e Usabilidade
1. **Zero Curva de Aprendizado para a Equipe:** O colaborador apenas abre o navegador da TV, digita a URL curta `/tv`, aciona a tela cheia (F11 ou botão de Fullscreen discreto) e a página gerencia todo o ciclo de vida sozinha.
2. **Zero Scrollbar e 100% Responsivo a 16:9:** O layout é travado rigidamente em `100vw` e `100vh` (`overflow: hidden`), sem barras de rolagem ou elementos flutuantes indesejados. O design é otimizado para resoluções Full HD (1920x1080) e 4K.
3. **Leveza para Hardware de TV:** Navegadores de Smart TVs (Tizen/Samsung, webOS/LG, Android TV) possuem poder de processamento e GPU limitados. O projeto utiliza HTML, CSS puro com aceleração por hardware (`transform`, `opacity`) e Vanilla JavaScript leve, sem frameworks pesados, garantindo 60fps constantes sem vazamento de memória.
4. **Resiliência a Quedas de Conexão:** Após o primeiro carregamento, o ciclo de rotação é 100% autônomo localmente, funcionando mesmo se houver oscilação de Wi-Fi.

---

## 2. Doutrina, Linguagem e DNA do FaçaAmigos

Toda a comunicação do FaçaAmigos TV reflete os pilares fundados pela psicóloga infantil **Dra. Isabella Gonçalves Freitas (CRP 10/4727)** e pela direção do Instituto:

### Os 4 Pilares da Doutrina FaçaAmigos
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

## 3. Os Dois Modos de Exibição por Horário (Comutação Automática)

A TV detecta o relógio local (horário de Belém/Brasília) e alterna suavemente entre duas programações distintas:

```
┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│  10:00 às 15:59              │  16:00 às 22:00              │  22:00 às 09:59              │
│  MODO EQUIPE & ACOLHIMENTO   │  MODO CRIANÇAS & FAMÍLIAS    │  MODO REPOUSO / STAND-BY     │
│  (Foco: Colaboradores / PNL) │  (Foco: Encantamento / Pais) │  (Foco: Desligamento suave)  │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

### 3.1. Modo Manhã / Tarde (10h00 às 15h59) — Foco no Colaborador e Cultura Interna
* **Contexto do Shopping:** Período de baixo fluxo de clientes nos corredores. A equipe está iniciando a operação, organizando o salão e se preparando para o pico de atendimento.
* **Objetivo:** Não é um treinamento técnico cansativo de slides com muito texto, mas sim uma **comunicação sutil, inspiradora e com técnicas de PNL (Programação Neurolinguística)**.
* **Técnicas de PNL e Psicologia Positiva Aplicadas:**
  - **Ancoragem Positiva de Identidade:** Frases que reforçam o papel do colaborador como facilitador de sorrisos e transformador do dia de uma família ("Aqui, seu olhar atento cria memórias que duram para sempre").
  - **Pressuposições e Comandos Indiretos:** Estimulam a atenção plena ("Ao acolher com calma, você percebe detalhes que ninguém mais vê").
  - **Pacing & Leading (Espelhamento e Condução):** Reconhecimento do esforço diário e condução para o estado de presença e empatia.
  - **Micro-lembretes de Doutrina:** Pílulas visuais rápidas sobre empatia sensorial, escuta ativa aos pais e acolhimento gentil.
* **Estética Visual:** Clean, acolhedora, tipografia elegante, paleta em tons suaves da marca (creme, verde-água e toques de rosa), frases em destaque com ritmo respiratório (fade lento a cada 12–15 segundos).

### 3.2. Modo Tarde / Noite (16h00 às 22h00) — Foco nas Crianças e Famílias
* **Contexto do Shopping:** Pico de fluxo nos corredores. Mães, pais, avós e crianças passeando pela praça e em frente às lojas.
* **Objetivo:** Atração visual instantânea (Hero / Vitrine de Alto Impacto), encantamento infantil e transmissão imediata de segurança para os pais.
* **Conteúdo Transmitido:**
  - **Personagens e Mascotes:** Destaque para as pelúcias e personagens icônicos (a simpática **Capivara**, o **Macaco**, a turma do Circuito).
  - **As 3 Forças do Ecossistema:**
    1. *Playground Inclusivo:* Piscina de bolinhas gigante, casinha, mediadores de inclusão, cantinho da leitura.
    2. *Circuito de Carrinhos:* Frota estilizada (Range Rover, Lamborghini, caminhão de bombeiro), autonomia e diversão segura.
    3. *Clínica e Desenvolvimento:* Apoio psicológico, ABA, Terapia Ocupacional e Fonoaudiologia.
  - **Doutrina Invisível para os Pais:** "É pra todas as crianças. Sem agendamento. É só chegar!"
  - **Horário Inclusivo e Acessibilidade:** Informação acolhedora sobre o espaço adaptado e suporte para crianças com sensibilidade sensorial.
* **Estética Visual:** Vibrante, dinâmica, fotografias reais do espaço em alta definição, microanimações suaves que chamam atenção no corredor sem causar sobrecarga sensorial.

### 3.3. Modo Repouso / Fechamento (22h00 às 09h59)
* **Objetivo:** Quando a loja fecha, a TV entra em tela escura de descanso de tela (Screen Saver com logotipo pulsando lentamente e relógio digital), avisando: *"Até amanhã! Abrimos às 10h"*, evitando burn-in ou consumo excessivo de brilho.

---

## 4. Recursos e Controles Especiais da Aplicação

1. **Relógio em Tempo Real e Indicador de Modo:**
   - No topo ou rodapé discreto, a tela exibe o horário atual de Belém e o modo em execução.
2. **Override Manual para Demonstração / Testes (Key Shortcuts & Clicks):**
   - Para permitir apresentações a investidores, gerentes ou treinamentos a qualquer hora do dia:
     - Tecla `1` ou clique no ícone discreto: Força **Modo Equipe (10h–16h)**.
     - Tecla `2` ou clique no ícone discreto: Força **Modo Crianças & Vitrine (16h–22h)**.
     - Tecla `0` ou `A`: Retorna ao modo **Automático** (baseado na hora atual).
     - Tecla `F` ou toque duplo na tela: Alterna **Fullscreen (Tela Cheia)**.
3. **Indicador de Conexão e Auto-Recuperação:**
   - Se a tela for reiniciada ou perder sinal, o script se recupera suavemente.

---

## 5. Inventário de Ativos Gráficos do Repositório

O repositório já conta com um acervo rico em fotografias de altíssima qualidade e formatos modernos (WebP e JPEG):

| Imagem | Aplicação Sugerida |
|---|---|
| `img/hero-piscina-bolinhas.webp` | Hero principal do Playground / Crianças |
| `img/circuito-equipe-capivara.webp` | Mascote Capivara abraçando a equipe e crianças |
| `img/circuito-macaco.webp` | Mascote Macaco no Circuito de Carrinhos |
| `img/circuito-frota-alinhada.webp` | Frota completa de carrinhos elétricos do Circuito |
| `img/circuito-bombeiro.webp` | Carrinho elétrico de bombeiro (forte apelo infantil) |
| `img/circuito-lamborghini-urus.webp` | Carrinho esportivo de alta performance para crianças |
| `img/playground-piscina-casinha.webp` | Visão ampla do salão e da casinha |
| `img/playground-mediadora-tapete.webp` | Atendimento acolhedor da mediadora com a criança |
| `img/inclusao-cantinho-leitura.webp` | Canto de descompressão e calma (doutrina inclusiva) |
| `img/clinica-painel-sensorial.webp` | Painel sensorial da clínica (apoio ao desenvolvimento) |
| `img/clinica-atividade-pedagogica.webp`| Atividades pedagógicas e terapêuticas da Clínica |
| `img/isabella-3.webp` | Dra. Isabella Gonçalves Freitas (idealizadora) |
| `img/logo-simbolo.png` | Símbolo e ícone da marca FaçaAmigos |

---

## 6. Roadmap Futuro: Jogos Interativos e Gamificação na TV

Conforme solicitado pela direção, a arquitetura da página `/tv` foi projetada desde a fundação para comportar uma futura **camada de interação para crianças**:

### Conceito dos Jogos FaçaAmigos (Em Espera / Arquitetura Modular)
1. **Modo Touch / Apontador Inteligente:**
   - Em operações que utilizarem totens interativos ou telas touch-screen, o carrossel exibirá um selo pulsante: *"Toque na tela para brincar!"*.
2. **Mini-Games Planejados:**
   - **Jogo da Memória dos Amigos:** Encontrar pares dos animais e veículos (Capivara, Macaco, Carrinho de Bombeiro, Bolinha Colorida).
   - **Caça às Bolinhas Sensoriais:** Toque nas bolinhas que sobem na tela para estourá-las com sons lúdicos e relaxantes.
   - **Circuito Piloto Express:** Minijogo simples de conduzir o carrinho elétrico desviando de cones na pista.
3. **Timeout de Inatividade:**
   - Caso uma criança comece a jogar e se afaste, após 30 segundos de inatividade o sistema volta suavemente à rotação normal da Vitrine Digital.
4. **Isolamento de Código:**
   - O código será estruturado em módulos independentes (`tv-engine.js`, `tv-games.js`), facilitando a ativação sem comprometer a estabilidade do modo vitrine.

---

## 7. Critérios de Sucesso e Homologação

- [x] O arquivo de contexto centralizado (`contexto.md`) reflete 100% das diretrizes do negócio e do áudio do fundador.
- [ ] A página `/tv` funciona de forma autônoma sem barras de rolagem em Smart TVs de qualquer resolução.
- [ ] Transição suave entre o Modo 10h–16h (PNL/Equipe) e o Modo 16h–22h (Crianças/Vitrine).
- [ ] Atalhos ocultos de teclado e toque permitem forçar qualquer modo para validação e treinamento.
- [ ] Imagens oficiais da marca, mascotes (Capivara, Macaco) e paleta cromática aplicados com acabamento premium.
