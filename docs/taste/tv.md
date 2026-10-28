# Design Map

Fonte: extract.js em 1440x900 (modo stand-by noturno, versão original) e capturas das cenas da equipe e infantil via teclas 1 e 2. Valores da versão original; a coluna 'agora' indica a correção aplicada.

## Spacing Scale
- Sem grade fixa: 6px é o valor mais frequente (34 usos, gaps do HUD), depois 4px, 8px, 10px, 14px, 16px
- Layout em vh/vw: cabeçalho 10vh, padding 11vh 3vw 3vh, grid 1.15fr 0.85fr com gap 3vw, slide 94vw x 86vh
- Padding de cápsulas: 10px 24px (status), 8px 18px (música), 6px 14px (HUD)

## Font Hierarchy
- Fredoka One (títulos, relógio, marca): 80.64px noite, 51.84px relógio, 37.44px marca
- Fredoka (rótulos de interface): 54.72px citação, 23.04px selo, 20.16px status, 16.56px subtítulo da marca, 14.4px HUD
- Nunito (texto corrido): 34.56px noite, 28.08px subtexto, 17.28px data, 12px Suno
- Pesos: 400 (17 usos), 700 (6), 600 (3), 800 e 900 (2 cada)
- Famílias: 3, mais Arial (2 botões sem fonte definida)

## Color Palette
- Fundo dia #FFF9F1; fundo noite radial #15322A para #0A1B16 (CSS)
- Texto #1A3F35 (11.11:1 sobre creme) e #4C6B62 (5.60:1)
- Rosa #F0196B (3.97:1 sobre creme) agora #E01560 (4.52:1); rosa escuro #C81158
- Verde-água #2ECFB5 (5.93:1 sobre #1A3F35, usado só em fundo escuro); verde escuro #1FA893 (2.83:1 sobre creme) agora #137A6A (4.99:1)
- Amarelo #FFE234 em rótulos sobre foto e título do painel de pareamento (8.96:1 sobre #1A3F35)

## Image Ratios
- Logo 460x416 (1.11:1) renderizado a 75px (cabeçalho) e 103px (noite)
- Foto da equipe: card vertical ~545x750 (~0.73:1, medido na captura), raio 36px

## Component Tokens
- Raios: 999px, 36px, 24px, 8px, 6px, 2px, 50%
- Sombras: 0 4px 16px rgba(26,63,53,0.08); 0 30px 80px rgba(0,0,0,0.4) no painel de pareamento; brilho 0 0 60px rgba(46,207,181,0.2) no logo noturno
- Grid da equipe: 2 colunas 1.15fr/0.85fr, gap 3vw; modo infantil: cenas centralizadas sem grid
- Painel de pareamento: 38vw mínimo, raio 36px, fundo #1A3F35, código 6vw (86px a 1440); HUD rgba(26,63,53,0.78) com botões de 14.4px
- Movimento: opacity 1s a 1.2s nas telas, transform 0.9s nos slides; reduced-motion respeitado; focus-visible ausente

---

# Taste DNA

### Escala em vw para qualquer TV
- **Trigger**: A TV do salão pode ser 720p, 1080p ou 4K e ninguém vai ajustar zoom no navegador
- **Decision**: Todo texto grande usa clamp(mín, vw, máx) em vez de px fixo
- **Reason**: A equipe só abre a URL e a tela se ajusta sozinha; texto em px fixo ficaria pequeno na 4K e estouraria na 720p
- **Evidence**: citação 3.8vw = 54.72px a 1440 (clamp 1.9rem a 8.6rem); subtexto 1.95vw = 28.08px, razão 1.95:1 com a citação; título noturno 80.64px; exceção: HUD 14.4px e botões Suno 12px em rem/px fixos

### Rosa só na palavra que importa
- **Trigger**: Cada slide da equipe tem uma frase longa e precisa de um ponto de apoio para o olhar a metros
- **Decision**: Pintar de rosa apenas 1 ou 2 palavras da frase (span.highlight, em) em vez de colorir o bloco ou usar fundo rosa
- **Reason**: Quem passa de relance lê a palavra rosa e entende o assunto; se tudo fosse rosa, nada se destacaria
- **Evidence**: área rosa medida: 1.2% da tela noturna (#F0196B); texto principal #1A3F35 sobre #FFF9F1 = 11.11:1 contra rosa 3.97:1 (4.52:1 depois da correção); cenas infantis sem foto de fundo: figurinhas sobre degradê claro

### Três climas por horário
- **Trigger**: O salão funciona das 10h às 22h e depois fica em stand-by, com públicos diferentes (equipe, crianças, ninguém)
- **Decision**: Três modos com aparência própria (creme das 10h às 16h, verde claro com figurinhas das 16h às 22h, escuro à noite) em vez de um tema só
- **Reason**: À noite uma tela clara acordaria o ambiente; de dia o creme combina com a parede e com a luz do salão
- **Evidence**: fundo noturno radial #15322A para #0A1B16 contra #FFF9F1 do dia; transição de tela 1.2s cubic-bezier(0.4,0,0.2,1) só em opacity; exceção: o cabeçalho continua creme rgba(255,249,241,0.95) à noite

### Cápsula como forma única
- **Trigger**: Selos, status, música, HUD e botões precisam parecer amigáveis para crianças e pais ansiosos
- **Decision**: Tudo que é rótulo ou botão usa border-radius 999px em vez de retângulos com cantos de 6 a 8px
- **Reason**: Cantos totalmente arredondados não têm quina e combinam com as figurinhas e o logo curvo
- **Evidence**: 999px em 15 de 22 declarações de raio; painéis grandes usam 36px (--r-xl) e 24px (--r-lg); sombras raras: 4 valores no total, a maioria rgba(26,63,53,0.08)

## Correções de contraste aplicadas (referência)

- Cabeçalho: gradiente creme 0.95 até 0.9 em 80% (antes 0.7 em 75%): o texto da marca e da data ficava sobre transparência no modo noturno
- --pink #F0196B para #E01560; --teal-dark #1FA893 para #137A6A; --pink-soft ajustado ao novo rosa
- Selo da equipe (.team-tag) usa --pink-dark #C81158: rosa sobre rosa claro dava 3.74:1
- HUD: fundo dos botões de 15% para 7% de branco (4.32:1 para 5.15:1); botão de fechar do jogo #ff4757 para #D42A3C (3.34:1 para 5.0:1)
- Passos infantis inativos (Meias, Brincar, Descansar, Tchau): opacidade 0.55 para 0.68 (2.99:1 para cerca de 3.9:1)
- Ficam como estão, com justificativa: estados ocultos (modo noturno e Suno) com razão 1.0 no auditor; nome da cor na cena 'Ache a cor' (texto de 41px ou mais, rosa/branco 4.15:1 e azul/branco 3.68:1, acima do mínimo de 3:1 para texto grande, definidos em JS)

## Mudanças sugeridas (não aplicadas)

1. **Texto permanente do cabeçalho abaixo de 18px**
   - Evidência: subtítulo da marca 16.56px (#137A6A), data 17.28px (#4C6B62), selo 'Dia 5/5' 17.1px; a 4 m de uma TV 1080p isso mal se lê
   - Correção proposta: Subir subtítulo e data para clamp(1.1rem,1.7vw,3.4rem), cerca de 24px a 1440; manter o HUD pequeno, pois só aparece com o mouse
2. **Faixa creme fixa sobre a tela de stand-by noturno**
   - Evidência: na captura noturna, os 90px superiores (10vh) são #FFF9F1 com 0.95 de opacidade sobre fundo #15322A, o único bloco claro de uma sala apagada
   - Correção proposta: Aplicar versão escura do cabeçalho quando #mode-night estiver ativo (texto #FFF9F1, data #B7CCC4)
3. **Painel de pareamento cobre o centro por 30s**
   - Evidência: caixa de 652x363px no centro (38vw), z-index 300; na captura da equipe esconde 'Com a orientação...' e na infantil esconde 'Oi! Chegou...'
   - Correção proposta: Abrir no canto inferior direito com 24vw, ou só depois da tecla C como o manual descreve
4. **Data em capitalize**
   - Evidência: 'Quarta-Feira, 28 De Outubro' (captura): preposição e 'feira' com maiúscula, erro de português visível a metros
   - Correção proposta: Trocar text-transform: capitalize por none e formatar a data em minúsculas, com só a inicial do dia em maiúscula
5. **Nenhum estilo de foco para controle remoto ou teclado**
   - Evidência: focusVisible falso na extração; hud-btn e botões Suno sem outline de foco
   - Correção proposta: Adicionar :focus-visible { outline: 3px solid #1A3F35; outline-offset: 3px } em .hud-btn e .suno-btn
