# Design Map

Fonte: extract.js em 390x844 (tela de pareamento, original), captura do painel com o estado oculto exibido e leitura do CSS.

## Spacing Scale
- Base 4px: 8px (5 usos), 12px (4), 16px (3), 22px (2), 10px (2)
- Página: padding 16px (24px embaixo), coluna 520px, gap 16px entre blocos, gap 12px entre botões

## Font Hierarchy
- Fredoka One: 30px h1, 28px marca, 27px botão principal, 23px botões, 22px Conectar, 20px 'Voltar ao automático'
- Nunito: 26px peso 900 no campo de código, 17px status e texto, 15px descrições, 14px rodapé e subtexto
- Fredoka: 13px peso 700 caixa alta com 1.5px de espaçamento (subtítulo da marca)
- Pesos 400 (5 usos), 700 (4), 900 (1)
- Menor tamanho: 13px

## Color Palette
- Fundo sage #E4F1E8 com brilhos radiais amarelo e verde-água
- Cartões brancos (63.6% da área medida), texto #1A3F35 (11.63:1 sobre branco)
- Rosa #F0196B (4.15:1 com branco) agora #E01560 (4.72:1)
- Verde-água #2ECFB5 (botão com texto #1A3F35, 5.93:1); #137A6A no subtítulo (agora #0F6E5F, 5.28:1 sobre o sage)
- Banner de cookies compartilhado: #065264 (25% da área em 390x844) e #FDC51D

## Image Ratios
- Logo 52x52px (1:1)
- Cartão de pareamento ~358x343 (1.04:1)

## Component Tokens
- Raios: 999px (3 usos), 28px (cartão e botões), 20px (campo), 14px (banner)
- Sombras: 0 8px 22px rgba(26,63,53,0.12) cartão; 0 8px 20px rgba(26,63,53,0.16) botões
- Grid: coluna única, max-width 520px
- Foco: outline 4px; reduced-motion desliga transform e opacity

---

# Taste DNA

### Cinco botões grandes, cada um de uma cor
- **Trigger**: A pessoa da equipe usa o celular em pé, com uma mão, olhando as crianças
- **Decision**: Cinco botões de largura total e 84 a 104px de altura, cada um com cor própria (rosa, verde-água, escuro, amarelo, branco com contorno), em vez de menu com ícones pequenos
- **Reason**: Dá para acertar o botão sem olhar direito e a cor ajuda a lembrar qual é qual
- **Evidence**: min-height 84px (104px no principal), raio 28px, gap 12px; título 23px (27px no principal), descrição 15px; mesmas cores do manual impresso (.ico do manual do controle)

### Duas telas, nenhum menu
- **Trigger**: O controle só precisa de duas coisas: parear uma vez e comandar a TV
- **Decision**: Uma página com dois estados alternados por [hidden] (cartão de código ou painel), sem navegação, configurações ou rodapé extenso
- **Reason**: Menos telas significa menos lugar para se perder no meio da dinâmica
- **Evidence**: cabeçalho só com logo 52px e rótulo 13px; coluna única de 520px; apenas 6 tamanhos de fonte de 13px a 30px

### Feedback de toque e foco no mesmo botão
- **Trigger**: O mesmo botão é usado com dedo no celular e, às vezes, com teclado
- **Decision**: Escala 0.97 ao tocar, contorno de 4px escuro ao focar e transição desligada em reduced-motion, em vez de só mudar a cor
- **Reason**: O dedo precisa sentir que o toque foi registrado antes de a TV responder
- **Evidence**: .act:active scale(0.97); .act:focus-visible outline 4px #1A3F35 offset 3px; focusVisible verdadeiro na extração; reduced-motion respeitado; botão Conectar com 60px de altura mínima

### Estado dito em texto, não só em cor
- **Trigger**: A TV pode estar procurada, conectada ou fora do ar e a equipe olha de relance
- **Decision**: Ponto colorido de 14px mais frase ('Procurando a TV...') em 17px, em vez de só trocar a cor do ponto
- **Reason**: Cor sozinha falha com luz forte e para quem não distingue verde de âmbar
- **Evidence**: data-s ok/warn/bad com #1B8F5A, #B7791F, #C53030; texto status 17px peso 800 e subtexto 14px #4C6B62 (5.85:1 sobre branco)

## Correções de contraste aplicadas (referência)

- --pink #F0196B para #E01560 (botão Conectar e botão principal)
- Subtítulo 'Controle da TV' (13px, #1FA893 sobre o sage, 2.55:1) para #0F6E5F (5.28:1); link 'Ouvir só as músicas' de #2ECFB5 (1.69:1) para #0F6E5F
- Descrição do botão principal: opacidade 0.88 para 1, porque o branco a 88% sobre rosa caía para cerca de 3.5:1
- Sem falhas restantes (verificado também com os estados ocultos exibidos); o banner de cookies é do arquivo compartilhado

## Mudanças sugeridas (não aplicadas)

1. **Banner de cookies cobre os botões de baixo**
   - Evidência: na captura 390x844 o banner (#065264, ~150px) tapa 'Voltar ao automático' e o rodapé do painel até a pessoa tocar em aceitar
   - Correção proposta: Arquivo compartilhado (assets de consentimento): não exibir o banner em páginas operacionais noindex como esta
2. **O painel não cabe em 844px de altura**
   - Evidência: cabeçalho 52px, h1 33px, status ~72px, botões 104+84+84+84+68px mais gaps: cerca de 700px antes do rodapé de 'Trocar de TV'
   - Correção proposta: Reduzir o botão principal para 88px e o h1 para 26px, ou fixar o botão 'Voltar ao automático' na base da tela
3. **Texto secundário de 13 a 15px**
   - Evidência: subtítulo da marca 13px, descrição dos botões 15px, rodapé 14px, usados em pé, ao ar livre ou com brilho de tela baixo
   - Correção proposta: Subir para 16px as descrições e o rodapé, e o subtítulo da marca para 14px
4. **Campo de código sem máscara visível**
   - Evidência: placeholder 'ABCD-EFGH' em cinza do navegador sobre branco (4.61:1 no limite) e maxlength 9
   - Correção proposta: Definir color do ::placeholder em #5A6B64 e mostrar o hífen automaticamente
