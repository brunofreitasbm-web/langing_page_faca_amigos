# Design Map

Fonte: http://localhost:8765/circuito.html (institutofacaamigos.com.br/circuito). Medições da versão original (antes das edições de contraste), 1440x900.

## Spacing Scale
- Valores (px): 4, 6, 8, 10, 12, 14, 20, 22, 30, 36, 76
- Sem grade: valores medidos 10px (50 usos), 6px (35), 8px (30), 14px (24), 9px (22), 20px (16), 15px (14), 76px (9, padding vertical de seção). Espaçamento por gap e margin.

## Font Hierarchy
- h1 hero: 57.6px / peso 400 / Fredoka One
- h2 seção: 38.4px / peso 400 / Fredoka One
- valor do preço: 41.6px / peso 400 / Fredoka One
- h3 card: 20.8px / peso 400 / Fredoka One
- corpo hero: 19.2px / peso 600 / Nunito
- sub de seção: 17.6px / peso 600 / Nunito
- botão/FAQ: 16.8px / peso 800 / Nunito
- texto de apoio: 14.72px / peso 600 / Nunito
- chips/legenda: 13.12px / peso 800 / Nunito

## Color Palette
- page-bg: #FFF9F1
- surface (blocos e cards, 52,5% da área): #FFFFFF
- text-primary: #1A3F35
- text-secondary: #4C6B62
- footer-bg (28,8% da área): #065264
- whatsapp-cta-bg: #25D366
- whatsapp-cta-text (era #FFFFFF, 1,98:1; agora 6,42:1): #053B1C
- pink (btn-pink, era #F0196B 4,15:1; agora 4,72:1 com branco): #E01560
- pink-dark (texto de eyebrow/ícones, 5,71:1 sobre branco): #C81158
- teal-dark (preço, era #1FA893 2,97:1; agora 5,22:1): #137A6A
- teal (anel de foco, círculo decorativo): #2ECFB5
- yellow (destaque do hero, selo): #FDC51D

## Image Ratios
- hero: 1.33:1 (1000x750)
- galeria: 0.75:1 e 0.8:1 (1440x1920, 800x1000), tiles 539x674
- vídeo vertical: 0.56:1 (320x569)
- logo: 6.97:1 (1024x147)

## Component Tokens
- Raios: 14px; 20px; 24px (cards, 19 usos); 44px 110px (moldura do hero); 999px / 9999px (botões e chips, 38 usos); 50% (ícones)
- Sombra: 0 4px 10px rgba(26,63,53,0.08) (31 usos, tinta verde-escura)
- Sombra: 0 18px 40px rgba(26,63,53,0.14) (molduras de foto e vídeo)
- Sombra: 0 10px 26px rgba(37,211,102,0.35) (botões WhatsApp, tinta verde)
- Sombra: 0 10px 26px rgba(240,25,107,0.32) (btn-pink)
- Grid: container 1096px, 2 coluna(s), gutter 18px. Galeria .gal-2: 2 colunas de 539px, gap 18px, 12 tiles. Cards de passos: 3 colunas. Container de seção 1096px.

---

# Taste DNA

### Verde-WhatsApp como único preenchimento saturado
- **Trigger**: Quando a página precisa de uma ação dominante (falar no WhatsApp) sobre fundo creme e branco
- **Decision**: Reservaram o preenchimento saturado #25D366 ao botão de WhatsApp (10 elementos, 2,6% da área) e deixaram o resto em tinta #1A3F35 e superfícies brancas, em vez de colorir cada card com a paleta rosa/teal/amarelo
- **Reason**: Quem chega do shopping com a criança no colo procura um único gesto; uma cor que só aparece em botões ensina onde tocar
- **Evidence**: #25D366 em 10 elementos = 2,6% da área; brancas #FFFFFF = 52,5% da área; sombra do botão tingida rgba(37,211,102,0.35), 0 10px 26px; texto do botão passou de #FFFFFF (1,98:1) para #053B1C (6,42:1)

### Dois registros tipográficos, sem meio-termo
- **Trigger**: Quando títulos precisam de personalidade infantil e o texto corrido precisa de leitura em tela de celular
- **Decision**: Fredoka One 400 para h1/h2/h3/valores (57,6px, 38,4px, 20,8px) e Nunito 600/800 para todo o resto, em vez de uma terceira família ou pesos variados nos títulos
- **Reason**: O título arredondado carrega o tom lúdico; o corpo em Nunito 19,2px/30,7px mantém linhas legíveis para pais cansados
- **Evidence**: 272 elementos Nunito, 19 Fredoka One; h1 57,6px/64,5px, h2 38,4px/43px; corpo 19,2px, linha 30,72px, max-width 544px; mas 13 tamanhos entre 12,8px e 20,8px, sem escala

### Preço repetido em vez de localizado
- **Trigger**: Quando o único dado de decisão é o valor (R$ 48 o passeio)
- **Decision**: Repetiram R$ 48 em chip do hero, selo, texto, card de passos e dois cards de preço, em vez de um bloco de preço único perto do topo
- **Reason**: Responde a objeção de custo em qualquer ponto de leitura, ao preço de empurrar a seção de preço para 7.215px (67% da página)
- **Evidence**: #preco começa em y=7215 de 10691; R$ 48 aparece em pelo menos 8 pontos visíveis; price-card 299x190px, borda rosa 2px

### Restrição: sem barra de navegação extensa nem animação de layout
- **Trigger**: Quando uma landing page de unidade poderia ganhar menu completo e carrossel
- **Decision**: Nav com 2 ações (Conhecer o Playground, WhatsApp), entrada com opacity/transform 0.7s e respeito a prefers-reduced-motion, em vez de menu, parallax e carrossel de fotos
- **Reason**: Visitante vem de QR/Instagram para um passeio de R$ 48: menos destinos, mais ação
- **Evidence**: nav 77px de altura, 2 botões; .fx anima só opacity e translateY(26px) em 0.7s; reducedMotion: true, focusVisible: true

## Mudanças sugeridas (não aplicadas)

1. **Galeria ocupa 41% da página antes do preço**
   - Evidência: #fotos mede 4.353px de 10.691px (41%) com 12 tiles de 539x674px em 2 colunas; #preco só começa em y=7.215. Quem quer o valor rola 6 telas de fotos.
   - Correção proposta: Passar #preco para antes de #fotos e reduzir a galeria a 6 tiles em 3 colunas com proporção 4:5 (~350x437px), cerca de 1.900px.
2. **Hero no celular empilha chips em linhas separadas**
   - Evidência: Em 390px o chip "a partir de R$ 48" e os chips seguintes ocupam uma linha cada (~y 700-860) e a foto do hero só começa perto de y=1000, abaixo da primeira tela (844px).
   - Correção proposta: Deixar os chips em flex-wrap com gap de 8px (2 por linha) ou mostrar só o chip de preço no hero.
3. **R$ 48 repetido em 8 pontos, dois chips lado a lado dizem o mesmo**
   - Evidência: Hero tem chip "a partir de R$ 48" e, logo abaixo, chip "R$ 48 o passeio"; mais texto do hero, selo de #sobre, card de passos e dois price-cards idênticos (R$ 48 e R$ 48).
   - Correção proposta: Manter o chip de preço do hero e os price-cards; remover o chip "R$ 48 o passeio" e o selo "Preço único" de #sobre.
4. **Respiro quebrado antes de "Dúvidas frequentes"**
   - Evidência: #teste tem padding-bottom 10px e #faq padding-top 10px, contra 76px nas outras seções: o h2 do FAQ fica a ~14px da borda do cartão acima.
   - Correção proposta: Dar padding-top 76px a #faq (ou 56px) para repetir o ritmo das seções.
5. **Rótulo do CTA do hero não bate com a oferta**
   - Evidência: O botão diz "Quero saber os valores" mas o preço já está no mesmo hero (R$ 48). A pessoa clica esperando uma tabela e cai numa conversa.
   - Correção proposta: Trocar o rótulo para "Chamar no WhatsApp" ou "Tirar dúvidas no WhatsApp", mantendo o preço como informação da página.
6. **Escala tipográfica sem degraus definidos**
   - Evidência: 13 tamanhos entre 12,8px e 20,8px, seis deles entre 14,4px e 16,8px (14,72px 25x, 14,4px 13x, 15,84px 8x, 16,8px 13x).
   - Correção proposta: Reduzir a 4 degraus de texto (13, 15, 17, 19px) e aplicar nas classes existentes.
