# Design Map

Fonte: extract.js em 1440x900 (palco girado, versão original) e leitura do CSS. Os valores em px são do palco 1080x1920; na tela de teste ele aparece a 47%.

## Spacing Scale
- Sem grade: 10px (42 usos) e 22px (23 usos) dominam; 8, 12, 14, 18, 30, 32, 40, 50, 130px aparecem pontualmente
- Palco 1080x1920 com margens de 44px (marca) e 64px (texto sobre foto); gap dos planos 32px

## Font Hierarchy
- Fredoka One: 270px preço inteiro, 100px manchete (39 usos), 96px tempo do plano, 64px chamada, 40px kicker e marca
- Fredoka: 34px nome do plano, 22px subtítulo da marca, 20px botões do HUD
- Nunito: 34px 'Sem agendamento' (peso 800)
- Pesos 700 (41 usos), 400 (32), 600 (5), 800 (1)
- 11 tamanhos distintos, de 20px a 270px

## Color Palette
- Painel creme #FFF9F1 (54.4% da área) com brilhos radiais amarelo e verde-água; fundo externo #0E221C
- Texto #1A3F35 (11.11:1), secundário #4C6B62 (5.60:1)
- Rosa #F0196B agora #E01560; amarelo #FFE234 em 14.6% da área
- Verde #1FA893 (2.83:1 sobre creme) agora #137A6A (4.99:1)
- Branco sobre foto com degradê #0E221C até 0.9

## Image Ratios
- Fotos 800x1000 (0.80:1) e 1440x1920 (0.75:1), renderizadas a 920px de largura com zoom de 8s até scale(1.14)
- Logo 460x416 (1.11:1) a 48px

## Component Tokens
- Raios: 999px (25 usos), 34px (cartões de plano)
- Sombras: 0 10px 30px rgba(0,0,0,0.25); cartão ativo 0 20px 44px rgba(240,25,107,0.25)
- Faixa quadriculada de 34px (flag) a 1120x34 com rotação -5 graus
- Transições: opacity 1s (slide), transform 8s ease-out (zoom da foto); reduced-motion não tratado; focus-visible ausente

---

# Taste DNA

### Preço maior que a manchete
- **Trigger**: Quem passa pelo corredor do shopping decide em 2 segundos se vale parar
- **Decision**: Preço 'R$ 48,00' em 270px, mais que o dobro da manchete de 100px, em vez de dar o palco à foto e à frase
- **Reason**: O pai que anda com criança no colo procura primeiro quanto custa e quanto tempo dura
- **Evidence**: c-price-int 270px com letter-spacing -8px; razão preço:manchete 2.7:1; manchete:kicker 2.5:1; rosa #F0196B (3.97:1) agora #E01560 (4.52:1) sobre #FFF9F1; texto grande exige 3:1

### Palco retrato fixo girado por JavaScript
- **Trigger**: A TV de 50 polegadas fica em pé, mas recebe sinal em paisagem
- **Decision**: Um palco fixo de 1080x1920 que o JS gira 90 graus e escala, em vez de CSS responsivo
- **Reason**: O layout é desenhado uma vez só e cada px equivale a um pixel físico na TV 1080p, então os tamanhos viram régua de leitura
- **Evidence**: #tvCanvas 1080x1920 com rotação 90/270; tamanhos físicos: 270, 100, 96, 64, 40, 34, 22, 20px; no teste a 1440x900 o palco encolhe para 47% (900/1920)

### Amarelo só no kicker, foto sem moldura
- **Trigger**: Cada slide tem foto de criança, manchete e rótulo; muitos elementos disputando atenção
- **Decision**: Reservar o amarelo #FFE234 ao kicker inclinado (-2 graus) e a uma palavra da manchete, e deixar a foto cobrir o painel sem borda nem cartão em volta
- **Reason**: O rótulo amarelo funciona como etiqueta colada na foto e a manchete branca mantém o contraste sobre o degradê escuro
- **Evidence**: amarelo em 19 elementos (14.6% da área), todos kicker ou em; overlay linear rgba(14,34,28,0) a 0.9 de 45% a 100% da altura; apenas 2 raios (999px e 34px) e 3 sombras

### Movimento periférico
- **Trigger**: O corredor é largo e as pessoas olham a TV de lado, andando
- **Decision**: Animações lentas e periódicas (brilho no preço a cada 6s, palavras da chamada em sequência a cada 3s) em vez de tela estática
- **Reason**: Um brilho que cruza o preço atrai o olhar de quem não está olhando para a TV
- **Evidence**: price-shine 6s e price-beat 6s (escala 1.05 aos 88%); beat-word 3s com defasagem de 1s por palavra; palavras em repouso estavam a 0.35 de opacidade (1.43:1), agora 0.8 (3.5:1)

## Correções de contraste aplicadas (referência)

- --pink #F0196B para #E01560; --teal-dark #1FA893 para #137A6A; sombra do cartão ativo ajustada ao novo rosa
- 'Escolhe. Senta. Acelera!': opacidade em repouso de 0.35 para 0.8, no valor base e no keyframe de 0%/100%, porque as palavras apagadas mediam 1.43:1 e 1.73:1
- Ficam como estão: kicker amarelo, manchete e botões do HUD aparecem como razão 1.0 no auditor porque estão fora do slide ativo ou com opacidade zero; conferido no CSS (amarelo/#1A3F35 8.96:1, branco sobre degradê escuro)

## Mudanças sugeridas (não aplicadas)

1. **Três animações na mesma coluna ao mesmo tempo**
   - Evidência: price-beat 6s, price-shine 6s e beat-word 3s na coluna de 960px; o olhar não sabe onde parar
   - Correção proposta: Escalonar: manter o brilho do preço e pausar a pulsação da chamada enquanto ele passa (animation-delay de 3s na chamada)
2. **Marca e HUD pequenos para a distância**
   - Evidência: subtítulo da marca 22px, botões do HUD 20px, aviso de som 22px, contra manchete de 100px (razão 4.5:1)
   - Correção proposta: Subir subtítulo da marca para 28px e deixar o HUD como está, já que só aparece com o mouse
3. **Plano ativo marcado só por borda e escala**
   - Evidência: cartão .on = borda #E01560 de 5px e scale(1.04); o inativo tem borda rgba(26,63,53,0.1); na captura os dois cartões parecem iguais
   - Correção proposta: Preencher o cartão ativo com #FFE234 ou adicionar um selo 'agora' acima do tempo
4. **Sem foco visível para teclado ou controle da TV**
   - Evidência: focusVisible falso; botões c-hud-btn sem outline
   - Correção proposta: Adicionar :focus-visible com outline de 4px #FFE234 nos botões do HUD
