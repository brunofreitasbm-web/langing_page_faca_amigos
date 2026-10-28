# Design Map

Fonte: extract.js em 1440x900 (só o login renderiza sem sessão) e leitura do CSS e do HTML dos estados ocultos (dashboard, abas, tabela, check-in). Valores da versão original.

## Spacing Scale
- Só a tela de login renderiza sem sessão; o mapa abaixo combina a medição do login (1440x900) com o CSS dos estados ocultos (painel, tabela, abas, check-in)
- Valores frequentes: 13px (padding dos campos, 6 usos), 14px, 6px, 24px, 40px; painel com padding 26px 22px 60px e largura máxima 1240px

## Font Hierarchy
- Fredoka One: 24px h1
- Nunito: 16px botão (800), 14.72px descrição, 13.6px rótulo, 13.12px rodapé; no painel 14px (tabela), 11.52px (cabeçalho de tabela), 11.2px (KPI)
- Pesos 700 (4 usos), 800 (3), 400 (1)
- 9 declarações de font-size de 0.7rem a 0.78rem (11.2 a 12.5px) no CSS do painel

## Color Palette
- Fundo #FFF9F1; cartão #FFFFFF; texto #1A3F35 (11.63:1) e #4C6B62 (5.85:1)
- Rosa #F0196B agora #E01560 (botão, 4.72:1)
- Link e selo #1FA893 (2.97:1 sobre branco) agora #137A6A (5.22:1); selo/resultado de check-in #0F6E5F
- Cinza de rótulo #8B9A94 (2.94:1) agora #5A6B64 (5.64:1)
- Azul #2D7FF9 / #1E63C9; cinza-fundo #EDF1EF

## Image Ratios
- Logo 460x416 (1.11:1)
- Cartão de login 400x582 (0.69:1)

## Component Tokens
- Raios: 24px (cartão), 14px (campos), 9999px (botões e selos)
- Campo: borda 2.5px rgba(26,63,53,0.12), padding 13px 16px, raio 14px
- Sombra do cartão 0 18px 40px rgba(26,63,53,0.14)
- Transições: transform, box-shadow e filter 0.2s com overshoot; focus-visible presente; reduced-motion não tratado

---

# Taste DNA

### A linguagem do site público num painel interno
- **Trigger**: Um painel de leads e eventos poderia ter a aparência neutra de qualquer admin
- **Decision**: Manter título em Fredoka One, botões em pílula e fundo creme em vez de uma interface cinza de tabela
- **Reason**: A equipe vê o mesmo mundo da marca ao entrar, e o painel não parece sistema de terceiros
- **Evidence**: botão 9999px, cartão de login com raio 24px; h1 24px Fredoka One sobre #FFF9F1; tabela e abas ficam em Nunito 12 a 14px

### Um único acento por tela de login
- **Trigger**: A tela de login tem logo, dois campos, um botão e dois links
- **Decision**: Só o botão 'Entrar' leva cor forte (rosa, 5.6% da área), sem faixa colorida, ilustração ou fundo em degradê, ao contrário do hub de gestão
- **Reason**: Em tela de acesso, o olhar tem de ir do campo ao botão sem desvio
- **Evidence**: botão #F0196B em 5.6% da área (agora #E01560, 4.72:1 com branco); card branco #FFFFFF em 94.4% da área medida sobre #FFF9F1; única sombra colorida: 0 10px 26px rgba(240,25,107,0.28)

### Etiqueta translúcida com texto da mesma família
- **Trigger**: Leads, resultados e estados precisam de selos de status em tabelas brancas e cinzas
- **Decision**: Fundo translúcido da cor (alfa 0.13 a 0.35) com texto na versão escura da mesma cor, em vez de selos sólidos
- **Reason**: A tabela continua legível mesmo com 20 selos na tela
- **Evidence**: .badge-teal rgba(46,207,181,0.18) com #137A6A; .badge-pink rgba(240,25,107,0.13) com #C81158; .badge-blue rgba(45,127,249,0.15) com #1E63C9; .badge-yellow rgba(255,226,52,0.35) com #7A6A00

### Mola no toque, contorno no teclado
- **Trigger**: Botões e abas são clicados dezenas de vezes por dia
- **Decision**: Transição com overshoot cubic-bezier(0.34,1.4,0.64,1) de 0.2s e contorno de 3px com offset de 3px no foco, em vez de troca seca de cor
- **Reason**: O retorno rápido confirma o clique sem pedir atenção
- **Evidence**: --t-fast: 0.2s cubic-bezier(0.34,1.4,0.64,1); .btn:focus-visible outline 3px solid var(--teal) offset 3px; focusVisible verdadeiro na extração

## Correções de contraste aplicadas (referência)

- --pink #F0196B para #E01560 (botão 'Entrar': 4.15:1 para 4.72:1); --teal-dark #1FA893 para #137A6A (link 'entre pelo Hub de Gestão': 2.97:1 para 5.22:1)
- --gray #8B9A94 para #5A6B64: rótulos de card, de detalhe e de KPI, e texto vazio de insights (2.94:1 para 5.64:1)
- Selo teal e resultado 'ok' do check-in: texto #0F6E5F, porque #137A6A sobre o fundo teal translúcido chegava a 4.40:1 sobre creme
- Ficam como estão: estrelas de avaliação #F5A800 (2.0:1) no JS, que são glifos decorativos ao lado da nota em texto; emoji de lixeira em #9ca3af

## Mudanças sugeridas (não aplicadas)

1. **Bordas dos campos quase invisíveis**
   - Evidência: borda de rgba(26,63,53,0.12) sobre branco = #E4E8E7, 1.24:1; o limite de 3:1 para bordas de campo pede alfa em torno de 0.6
   - Correção proposta: Trocar para rgba(26,63,53,0.6) ou #6F8780 nos .form-control
2. **Foco do campo em verde-água claro**
   - Evidência: borda de foco #2ECFB5 sobre branco = 1.96:1; só o halo de 4px rgba(46,207,181,0.18) ajuda
   - Correção proposta: Usar #137A6A (5.22:1) na borda de foco e manter o halo
3. **Texto de tabela e rótulos abaixo de 12px**
   - Evidência: th 11.52px, rótulo do KPI 11.2px, caixa alta com espaçamento; vários entre 0.7 e 0.78rem
   - Correção proposta: Piso de 12.8px (0.8rem) para cabeçalho de tabela e rótulos
4. **Abas fora da tela sem indicação**
   - Evidência: '.tab-bar { max-width: 100%; overflow-x: auto }' com botões nowrap; em 390px as abas finais ficam escondidas sem sombra nem seta
   - Correção proposta: Adicionar gradiente de borda ou scroll-snap com a aba ativa centralizada
5. **Estrelas em #F5A800**
   - Evidência: 2.0:1 sobre branco (gráfico precisa de 3:1); a nota em texto está ao lado
   - Correção proposta: Usar #B97D00 (3.5:1) ou contorno escuro nas estrelas
