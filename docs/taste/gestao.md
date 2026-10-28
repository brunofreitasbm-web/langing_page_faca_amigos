# Design Map

Fonte: extract.js em 1440x900 (só o login renderiza sem sessão) e leitura do CSS e do HTML dos estados ocultos (hub, tiles, pessoas, matriz). Valores da versão original.

## Spacing Scale
- Só a tela de login renderiza sem sessão; o mapa combina a medição do login (1440x900) com o CSS do hub, dos tiles, das pessoas e da matriz de acessos
- Valores frequentes: 13px (4 usos), 24px (3), 4px (3), 6px, 16px, 14px; tiles com padding 22px 20px e gap 12px; grid gap 18px; seções separadas por 32px

## Font Hierarchy
- Fredoka One: 27.2px login, 2.35rem hello (máx.), 1.35rem título de seção, 1.25rem nome do tile
- Nunito: 16px botão (800), 0.9rem descrição, 0.86rem descrição de sub-ação, 0.77rem host, 0.72rem selos, 0.82rem status
- Pesos 800 (3 usos na medição), 700, 600, 400
- 10 declarações de font-size abaixo de 0.78rem (12.5px) no CSS

## Color Palette
- Fundo #FFF9F1 (83.4% do login), cartão #FFFFFF, cabeçalho do hub #1A3F35
- Texto #1A3F35 e #4C6B62; rosa #F0196B agora #E01560 (4.72:1)
- Verde escuro #1FA893 agora #137A6A (5.22:1); cinza #8B9A94 agora #5A6B64 (5.64:1); marca do cabeçalho escuro #FF7FAC (4.92:1 sobre #1A3F35)
- Módulos: amarelo #FFE234, verde-água #2ECFB5, azul #BFD8FF, rosa #FFC2D8, marrom #E9CBB5, verde #C9E7DD, laranja #FFD9A8; roxo #8B5CF6 e chocolate #7B3F1E nas variáveis

## Image Ratios
- Logo 34px no cabeçalho e 54px no login
- Card de login 400x507 (0.79:1)

## Component Tokens
- Raios: 24px (card e tile), 17px (ícone), 14px (campos), 9999px (botões, selos, busca)
- Sombras: 0 18px 40px rgba(26,63,53,0.14) no login; 0 4px 10px rgba(26,63,53,0.08) nos tiles; hover 0 18px 40px
- Tile: borda 2.5px transparente que vira cor do sistema no hover; foco 3px solid var(--accent) offset 3px
- Reduced-motion respeitado; transições com overshoot cubic-bezier(0.34,1.4,0.64,1)

---

# Taste DNA

### Um quadrado por sistema, cada um com sua cor
- **Trigger**: O dono precisa abrir seis a sete sistemas diferentes (playground, clínica, financeiro, RH, cacau, painel, eventos) a partir de um lugar
- **Decision**: Grade de tiles de 190px de altura mínima com ícone de 54px e cor própria por sistema, em vez de lista ou menu lateral
- **Reason**: Quem entra todo dia reconhece o sistema pela cor antes de ler o nome
- **Evidence**: .tile min-height 190px, padding 22px 20px, raio 24px, gap 18px; acentos #FFE234, #2ECFB5, #BFD8FF, #FFC2D8, #E9CBB5, #C9E7DD, #FFD9A8; grid repeat(auto-fill, minmax(280px, 1fr))

### Acesso negado aparece apagado, não escondido
- **Trigger**: Gerentes enxergam o hub mas nem todo módulo é permitido
- **Decision**: Tile desabilitado a 55% de opacidade em vez de remover o tile
- **Reason**: A pessoa sabe que o sistema existe e a quem pedir acesso
- **Evidence**: .tile:disabled opacity 0.55, cursor not-allowed; texto #1A3F35 a 55% cai para 3.16:1 sobre branco e a descrição #4C6B62 para 2.32:1 (valores calculados, estado visível só com sessão)

### Cabeçalho escuro, corpo creme
- **Trigger**: A tela de login é clara, mas o hub precisa mostrar claramente que se está dentro da área restrita
- **Decision**: Faixa #1A3F35 no topo do hub com marca em Fredoka One, em vez de reaproveitar o cabeçalho claro
- **Reason**: O contraste de faixa avisa 'área interna' sem texto
- **Evidence**: .hub-header background #1A3F35, padding 16px 0; 'Amigos' em rosa no cabeçalho escuro media 2.46:1; agora #FF7FAC a 4.92:1; fundo do corpo #FFF9F1 com tiles brancos

### Sem ilustração, só emoji nos ícones
- **Trigger**: Cada módulo precisa de um ícone distinguível e o time não tem uma biblioteca de ícones
- **Decision**: Emoji de 1.85rem num quadrado de 54px colorido, em vez de SVG próprio por módulo
- **Reason**: Zero dependência de arquivo e reconhecimento imediato
- **Evidence**: .tile .icon font-size 1.85rem, raio 17px, fundo var(--accent); nenhuma imagem além do logo de 34px

## Correções de contraste aplicadas (referência)

- --pink #F0196B para #E01560 (botão 'Continuar', 'Abrir painel', 'Acesso direto': 4.15:1 para 4.72:1); --teal-dark #1FA893 para #137A6A; --gray #8B9A94 para #5A6B64 (hosts, notas, placeholder)
- Botão WhatsApp (#25D366): texto de branco (1.98:1) para #053B1C (6.42:1)
- Marca 'FaçaAmigos' no cabeçalho escuro: 'Amigos' de rosa para #FF7FAC (2.46:1 para 4.92:1)
- Ficam como estão: botões e ícones translúcidos sobre o cabeçalho escuro (branco sobre #1A3F35), emoji da lupa; o hover com brightness(1.08) clareia o botão rosa por um instante (4.72:1 para cerca de 4.1:1, estado transitório)

## Mudanças sugeridas (não aplicadas)

1. **Tile bloqueado fica ilegível**
   - Evidência: opacity 0.55 no tile: descrição #4C6B62 cai para 2.32:1 e o nome para 3.16:1 (calculado)
   - Correção proposta: Usar opacity 0.8 e adicionar cadeado ou texto 'sem acesso', que já é o sinal real
2. **Textos de 11 a 12px nos tiles**
   - Evidência: selo de nível 0.72rem (11.5px), host 0.77rem (12.3px), tag de seção 0.72rem; host em 'word-break: break-all' em monoespaçada
   - Correção proposta: Piso de 12.8px e host em linha única com reticências
3. **Campo de busca e login com borda de 12%**
   - Evidência: borda rgba(26,63,53,0.12) sobre branco: 1.24:1 (precisa de 3:1)
   - Correção proposta: Borda rgba(26,63,53,0.6) nos campos e na busca
4. **Foco do tile na cor do sistema**
   - Evidência: outline 3px solid var(--accent): em tiles amarelo (#FFE234) ou azul-claro (#BFD8FF) o contorno mede cerca de 1.3:1 sobre branco
   - Correção proposta: Usar sempre outline #1A3F35 e deixar o acento só na borda do hover
5. **Matriz de acessos de quatro colunas até 640px**
   - Evidência: a linha da matriz usa minmax(120px,1fr) 140px 150px minmax(150px,1.3fr), ou seja, 560px mínimos de conteúdo mais gaps de 10px, e só empilha abaixo de 640px: entre 640px e ~700px os campos de 140px e 150px ficam espremidos
   - Correção proposta: Empilhar a matriz já em 760px ou trocar as colunas fixas por minmax(110px,1fr)
