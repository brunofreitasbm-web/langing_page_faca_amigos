# Design Map

Fonte: http://localhost:8765/musica.html (institutofacaamigos.com.br/musica). Medições da versão original (antes das edições de contraste), 1440x900.

## Spacing Scale
- Valores (px): 2, 4, 6, 8, 10, 12, 16, 20, 24, 32
- Valores medidos: 8px (51 usos), 2px (40), 6px (7), 12px (4), 16px (3), 22px (3), 20px (3), 24px (3), 32px (2). Dominam 2 e 8px; card com padding 32px 28px.

## Font Hierarchy
- título da faixa (h1): 32px / peso 700 / Fredoka One
- botão play: 35.2px / peso 400 / sistema (emoji)
- botão Próxima: 18.4px / peso 400 / Fredoka One
- h2 fila: 19.2px / peso 700 / Fredoka One
- corpo: 15.2px / peso 700 / Nunito
- itens da fila: 14.08px / peso 700 / Nunito
- rodapé/legendas: 13px / peso 700 / Nunito
- tags (SALÃO): 11.52px / peso 700 / Fredoka

## Color Palette
- page-bg: #0D201A
- card-bg (36,5% da área): rgba(26,63,53,0.92) = #1A3F35
- linhas da fila (33,6%): rgba(255,255,255,0.03)
- text-primary: #FFFFFF
- text-secondary: #C0D6CF
- yellow (títulos, tags, 23 textos): #FFE234
- teal (anel, chips, progresso): #2ECFB5
- teal em texto sobre card (era #2ECFB5 4,09:1; agora #5FE3CC 5,09:1): #5FE3CC
- pink (play; era #F0196B, agora 4,72:1 com branco): #E01560
- texto de tag Suno sobre fundo escuro (era pink, agora 6,31:1): #FF6B9A
- footer-text (4,71:1 sobre #0D201A): #6C8E84

## Image Ratios
- artwork do mascote: 1:1 (180x180, círculo)
- logo símbolo: 1.11:1 (44px)
- tucano: 0.79:1 (228x288)

## Component Tokens
- Raios: 4px (20 tags); 10px (20 linhas da fila); 14px; 24px (fila); 32px (card do player); 50% (artwork, play); 999px (pills, Próxima)
- Sombra: 0 24px 60px rgba(0,0,0,0.5) (card do player)
- Sombra: 0 0 35px rgba(46,207,181,0.35) (artwork ativa, brilho teal)
- Sombra: 0 8px 24px rgba(240,25,107,0.45) (play, brilho rosa)
- Sombra: 0 0 10px #2ECFB5 (ponto de status)
- Grid: container 660px, 1 coluna(s), gutter 16px. Coluna única de 660px centrada, padding do body 0 16px 40px; sem grid. Card do player 660x661px (1:1), seção de fila 660x298px.

---

# Taste DNA

### Tema escuro com dois acentos de brilho
- **Trigger**: Quando a página roda numa tela de salão e no celular de quem controla a música
- **Decision**: Fundo #0D201A com brilho teal (0 0 35px rgba(46,207,181,0.35)) na artwork e brilho rosa (0 8px 24px rgba(240,25,107,0.45)) no play, em vez de fundo claro como o resto do site
- **Reason**: Em ambiente com luz baixa o tema escuro não ofusca, e o brilho cola o olhar no que toca agora
- **Evidence**: page-bg #0D201A, card rgba(26,63,53,0.92); sombra do card 0 24px 60px rgba(0,0,0,0.5); play 76x76px #E01560, artwork 180x180px

### Um player central no lugar de uma biblioteca
- **Trigger**: Quando há 23 faixas e a pessoa só precisa ouvir e pular
- **Decision**: Um card único de 660px com 3 controles (anterior, play 76px, Próxima) e a fila abaixo em rolagem interna, em vez de grade de capas com busca
- **Reason**: Operador do salão não escolhe disco: toca e segue; menos controles, menos erro com as mãos ocupadas
- **Evidence**: card 660x661px; 3 botões: 46px, 76px e Próxima 24px de padding; fila 298px com overflow interno; 1 coluna, sem grid

### Amarelo como cor de rótulo, rosa só no play
- **Trigger**: Quando status, categoria e título competem por destaque sobre fundo escuro
- **Decision**: #FFE234 em 23 textos de rótulo (títulos, pills, tags) e rosa reservado ao botão de play, em vez de rosa em tudo que é ação
- **Reason**: O amarelo lê bem em 13,06:1 sobre #0D201A e deixa o rosa como o único sinal de tocar
- **Evidence**: #FFE234: 23 textos; rosa: 1 botão + gradiente do botão de início; amarelo sobre #0D201A = 13,06:1

### Restrição: sem imagem de fundo, sem capas por faixa
- **Trigger**: Quando uma rádio poderia mostrar capa de álbum e ondas animadas
- **Decision**: Mascote circular único (180px) e fundo de 3 gradientes radiais a 8-22% de opacidade, em vez de arte por faixa
- **Reason**: Salão não tem conteúdo visual por música: o mascote dá rosto sem exigir arte nova
- **Evidence**: 2 imagens na página (logo 44px, mascote 125px); gradientes radiais rgba(240,25,107,0.18), rgba(46,207,181,0.22), rgba(255,226,52,0.08); focusVisible: false, reducedMotion: false

## Mudanças sugeridas (não aplicadas)

1. **Sem foco visível nos controles**
   - Evidência: Extract: focusVisible=false; os botões (play 76px, anterior, Próxima, volume) só têm :hover. Navegação por teclado ou controle de TV não mostra onde está o foco.
   - Correção proposta: Adicionar :focus-visible { outline: 3px solid #FFE234; outline-offset: 3px } a .ctrl-btn e .btn-start-hero.
2. **Botão Próxima quebra em duas linhas no celular**
   - Evidência: Em 390px o ícone ⏭ fica sobre o rótulo "Próxima" e o botão tem ~140px de largura, contra a pílula de uma linha em 1440px.
   - Correção proposta: Usar white-space: nowrap e padding 0 18px em .ctrl-btn-next ou deixar só o ícone com aria-label abaixo de 400px.
3. **Texto de 11,52px nas tags**
   - Evidência: 20 elementos (tags SALÃO/INST.) com 11,52px, 700 e uppercase, sobre fundo amarelo a 15%; é o menor texto da página, visto de longe numa TV.
   - Correção proposta: Subir para 12,8px e aumentar o padding horizontal para 8px.
4. **Banner de cookies cobre a fila e os controles**
   - Evidência: Em 1440x900 o banner (shared) cobre o topo da fila; em 390x844 cobre os botões e o título da fila ("da Rádio").
   - Correção proposta: Item de arquivo compartilhado (fa-track/consent): limitar a altura do banner em páginas de player ou ancorá-lo abaixo.
5. **Quatro famílias tipográficas declaradas**
   - Evidência: Nunito (75), Fredoka (23), Fredoka One (4) e Arial (3, nos botões nativos sem font-family).
   - Correção proposta: Aplicar font-family: inherit nos <button> e unificar tags em Nunito 800.
6. **Sem preferência de movimento reduzido**
   - Evidência: Extract: reducedMotion=false; artwork tem brilho pulsante e o botão de início tem sombra animada.
   - Correção proposta: Envolver as animações em @media (prefers-reduced-motion: no-preference).
