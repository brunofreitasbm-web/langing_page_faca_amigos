# Design Map

Fonte: extract.js em 390x844 dos dois manuais (as medidas de contagem e de área valem para o canvas cortado) e capturas em 1080x1920. Valores da versão original; os dois arquivos compartilham quase todo o CSS, por isso um único registro.

## Spacing Scale
- Base ~2px: 20px (15 usos), 9px (10), 8px (9), 10px, 6px, 4px
- Canvas: padding 36px 56px 0, gap 16px, cartão 20px 28px, conteúdo de 968px
- Linhas: .row 190px + 1fr (gap 20px); .btnrow 76px + 1fr; .keys 5 colunas (gap 14px)

## Font Hierarchy
- Fredoka One: 76px h1, 52px marca, 36px h2, 33px título de botão, 31px título de linha
- Fredoka: 32px lead, 26px faixa de horário, 20px subtítulo da marca
- Nunito: 30px passo (800), 28px linha, 27px botão, 26px ajuda, 24px notas, 22px rótulo de tecla
- 12 tamanhos entre 20px e 76px (5 deles entre 26px e 28px)
- Pesos 400 e 700/800/900

## Color Palette
- Fundo #E4F1E8 com brilhos radiais amarelo e verde-água; cartões brancos
- Texto #1A3F35 (11.63:1 sobre branco), secundário #4C6B62 (5.85:1)
- Rosa #F0196B agora #E01560; amarelo #FFE234; verde-água #2ECFB5
- Verde escuro #1FA893 (2.55:1) agora #137A6A (4.49:1 sobre o sage; texto de 20px peso 700 é grande)
- Divisor #D9E8DF; ponto de ok #1B8F5A

## Image Ratios
- Canvas 1080x1920 (9:16)
- Mascote com 215px de altura (tucano no controle, cachorro na TV); rodapé com 170px

## Component Tokens
- Raios: 28px (cartões), 26px (ícones), 22px (teclas), 20px, 12px, 999px (faixa e pílulas)
- Sombras: 0 14px 34px rgba(26,63,53,0.12); ícones 0 6px 14px rgba(26,63,53,0.18); teclas 0 6px 0 #0E2620
- Sem JavaScript, sem interação, sem animação

---

# Taste DNA

### Imagem de 1080x1920 em vez de página
- **Trigger**: O manual tem de chegar à equipe como figura no WhatsApp, sem depender de link nem de internet
- **Decision**: Layout em px absolutos num canvas de 1080x1920 com overflow hidden, em vez de página responsiva
- **Reason**: A figura exportada fica idêntica em qualquer celular e cabe numa tela sem rolar
- **Evidence**: html, body { width: 1080px; height: 1920px; overflow: hidden }; comentário no CSS: gerar PNG em Chrome headless 1080x1920; aberta a 390x844, a página mostra só a faixa esquerda de ~36% (captura)

### Um passo por linha, número em círculo colorido
- **Trigger**: A equipe lê em pé, em poucos segundos, antes de abrir o salão
- **Decision**: Passos numerados em círculos de 52px com cor própria e uma frase de 30px por linha, em vez de parágrafos explicativos
- **Reason**: Quem lê de relance acha o passo 3 pelo número e pela cor, sem ler os anteriores
- **Evidence**: .num 52px, passos em 30px peso 800; divisores tracejados 2px #D9E8DF entre passos; apenas 4 passos em 'Para conectar' e 4 em 'Para ligar'

### Mesma cor, mesmo botão
- **Trigger**: O manual do controle precisa ensinar botões que a pessoa verá no celular
- **Decision**: Reproduzir os ícones com as mesmas cores do controle (rosa, verde-água, escuro, amarelo, contorno) em vez de ilustrações genéricas
- **Reason**: Quem aprendeu pela figura reconhece o botão ao abrir a página real
- **Evidence**: .ico 76px com --c pink/teal/dark/yellow e contorno inset 4px #1A3F35; cores iguais às de .act.main, .ir, .calma, .festa e .auto em tv-controle.html

### Sombra dura só na tecla
- **Trigger**: O manual da TV mostra teclas de teclado (F, S, 1, 2, 0)
- **Decision**: Sombra sem desfoque 0 6px 0 #0E2620 nas teclas e sombras suaves nos cartões, em vez de uma sombra única para tudo
- **Reason**: A borda dura faz a tecla parecer um objeto que se aperta, diferente dos cartões de leitura
- **Evidence**: .key i 76x76px, raio 22px, sombra 0 6px 0 #0E2620; cartões com 0 14px 34px rgba(26,63,53,0.12)

## Correções de contraste aplicadas (referência)

- --pink #F0196B para #E01560; --teal-dark #1FA893 para #137A6A nos dois manuais (o subtítulo 'PLAYGROUND INCLUSIVO' passou de 2.55:1 para 4.49:1)
- Os círculos numerados e as faixas de horário usam texto branco sobre rosa e escuro com 26px a 28px de peso 700, que contam como texto grande (3:1), e agora têm 4.72:1
- Sem falhas restantes no auditor em 390 e 1440

## Mudanças sugeridas (não aplicadas)

1. **Aberta no celular, a página não rola**
   - Evidência: html/body com 1080x1920 e overflow hidden, sem meta viewport; a 390x844 só se vê a faixa esquerda de ~36% da arte
   - Correção proposta: Se o link for compartilhado, usar transform: scale(calc(100vw / 1080)) com transform-origin top left em telas de até 1080px, e liberar overflow vertical
2. **Texto de 20 a 24px na arte**
   - Evidência: rótulos de tecla 22px, subtítulo da marca 20px, notas dos passos 24px; no WhatsApp a arte tem cerca de 390pt de largura, ou seja, 36% da escala: 22px vira ~8pt
   - Correção proposta: Subir os mínimos para 28px e cortar uma linha de conteúdo, se necessário
3. **Rodapé do manual da TV encosta na borda**
   - Evidência: a frase final quebra em duas linhas e a última termina perto de y=1893 de 1920 (captura), com padding-bottom de 22px
   - Correção proposta: Dividir em duas frases curtas ou subir o padding-bottom para 48px
4. **Escala tipográfica sem passo definido**
   - Evidência: 12 tamanhos: 26, 27, 28, 30, 31, 33px estão a 1 a 3px um do outro (5 usos de 27px e 5 de 28px)
   - Correção proposta: Reduzir para 4 tamanhos de texto: 24, 28, 32 e 36px
