# Design Map

Fonte: http://localhost:8765/wifi.html, referência principal 390x844 (mobile-first), conferida em 1440x900. Medido com extract.js e conferido no screenshot, na versão original (antes das correções de contraste). A página é a tela pós-login do Wi-Fi do roteador: hero em tela cheia, cupom, três unidades, dois e-books.

## Spacing Scale
- Valores mais usados (padding/margin/gap): 12px (16x), 10px (15x), 6px (14x), 14px (10x), 8px (10x), 3px (9x), 4px (8x), 9px (6x), 16px (5x), 18px (4x)
- Sem base única: 3, 7, 9, 11, 14, 17 e 18px convivem com 8, 12 e 16px; só uma minoria cai em grade de 4px
- Seção: padding 34px 0 6px; gutter 20px; coluna máxima 640px; gap da lista de unidades 14px
- Espaçamento por margin (h1 0 0 12px, h3 0 0 4px, p 0 0 20px) e gap em flex/grid
- Rodapé: padding 40px 20px 110px (os 110px abrem espaço para a barra fixa)

## Font Hierarchy
- h1 35.1px (clamp 32 a 46px) / 400 / Fredoka One / lh 38.6px, max-width 11ch
- h2 e h3 22px / 400 / Fredoka One / lh 24.2px; números do cupom 40px / Fredoka One
- Corpo do hero 16px / 700 / Nunito; texto de apoio 13 a 14.5px / 700 a 800
- Miúdos: 10.5px (tag, 3x), 11px (badge e avatares, 5x), 12px (meta, 5x), 12.5px (rodapé, 5x)
- 12 tamanhos distintos entre 10.5px e 40px; pesos 400 (só Fredoka), 600, 700, 800, 900
- Famílias: Nunito (133 nós), Fredoka One (32 nós)

## Color Palette
- Fundo #FFF9F1; cartões #FFFFFF (20% da área); bloco escuro #1A3F35 (hero, 33.8%)
- Texto principal #1A3F35 sobre #FFF9F1 = 11.11:1; texto secundário #4C6B62 sobre #FFFFFF = 5.85:1
- Rosa de ação: antes #F0196B (4.15:1 com branco), depois #E01560 (4.72:1 sobre branco, 4.52:1 sobre creme); #C81158 em destaques de texto = 5.71:1
- Teal #2ECFB5 em pill, avatar e fundo dos cartões de unidade (28.9% da área medida com as fotos ainda não carregadas); texto sobre ele antes branco (1.96:1), agora #1A3F35 = 5.93:1 na pill; cartões de unidade passaram a usar fundo #1A3F35 sob a foto (branco = 11.63:1)
- Teal de texto: antes #1FA893 (2.97:1), depois #137A6A (5.22:1 sobre branco, 4.65:1 sobre #DEF7F3)
- Amarelo #FFE234 (tags, canto do hero, pontos, estrelas sobre fundo escuro), cerca de 2% da área
- Preço riscado: antes #B3A99C (2.31:1), depois #766B5E (5.20:1)
- Neutros tintados para o verde-escuro, sem cinza puro; sombras tintadas rgba(26,63,53,x)

## Image Ratios
- Hero: playground-piscina-casinha.webp, 3:4 natural (1440x1920), cobre 390x844 e 1440x600 com object-fit cover e object-position center 35%
- Cartões de unidade: aspect-ratio 4:3 (350x263 no mobile), fotos naturais 1.66:1, 0.98:1 e 0.75:1 recortadas por cover
- Logo 6.97:1 (1024x147), exibido em 223x42 no hero

## Component Tokens
- Raios: 999px (20 elementos: botões, pills, chips), 50% (9: ícones, avatares), 24px (cartões de unidade e tiles), 14px, 18px, 12px, 22px
- Sombras: 0 4px 10px rgba(26,63,53,.08) (11x); 0 18px 40px rgba(26,63,53,.14) (3x, tiles e unidades); 0 10px 26px rgba(240,25,107,.36) (botão rosa, tinta do rosa); 0 6px 16px rgba(46,207,181,.35) (pill); 0 -8px 24px rgba(26,63,53,.10) (barra fixa)
- Botão principal: 355x55 no hero, 350x47 na barra fixa; botões "Rota": 192x40 e 150x40; links do rodapé 18px de altura
- Grade: coluna única de até 640px; sem colunas no mobile; tiles em 2 colunas e unidades em 2+1 no desktop
- Movimento: transform e opacity (stampIn 0.5s com cubic-bezier(0.34,1.6,0.64,1), nudge 0.9s, barra fixa 0.28s); prefers-reduced-motion respeitado; sem :focus-visible

---

# Taste DNA

### Hero de foto com véu verde em vez de bloco de cor
- **Trigger**: A tela aparece logo depois do login, quando o responsável está sentado na sala de espera da clínica com o celular na mão e a página tem de provar em um olhar que o Wi-Fi funcionou e que existe um lugar para a criança.
- **Decision**: Usaram uma foto real do playground em 100vh, com véu linear de rgba(26,63,53,.10) a .97 e texto branco no terço inferior, em vez de um cabeçalho liso com ilustração.
- **Reason**: O pai reconhece o lugar antes de ler; a foto vende o playground e o véu de #1A3F35 garante que o título de 35px e a linha de 16px fiquem legíveis em cima dela.
- **Evidence**: h1 35.1px sobre véu .88 a .97 no fundo; .hero min-height 100svh; object-position center 35%; texto branco sobre #1A3F35 = 11.63:1.

### Um único rosa para ação, o verde para contexto
- **Trigger**: A página tem três ações (mapeamento, três unidades, e-books) e precisa que o pai escolha a primeira sem pensar.
- **Decision**: Restringiram o rosa (#E01560 após a correção) ao botão de mapeamento, ao "=" e ao "ou" do lembrete e ao selo; unidades e e-books ficam em branco com teal e verde-escuro, em vez de colorir cada cartão com uma cor de ação.
- **Reason**: Quem lê com a criança no colo só tem uma mão livre; um só ponto saturado na tela diz onde tocar.
- **Evidence**: fundo rosa em 3.6% da área (2 elementos: botão do hero e botão da barra fixa); botões "Ver" e "Rota" em branco com texto #1A3F35; sombra rosa 0 10px 26px só nos dois botões.

### Dois níveis de cartão por função (restrição)
- **Trigger**: O conteúdo mistura oferta (cupom, preço, minutos extras), três endereços e dois links de leitura, que poderiam virar uma grade de cartões iguais com borda e sombra.
- **Decision**: Escolheram não usar uma moldura única: oferta em tiles brancos de 24px com sombra 0 18px 40px, endereços em cartões de foto de 4:3 e e-books em linhas brancas de 64 a 81px, em vez de um cartão padrão com cabeçalho, corpo e rodapé repetido.
- **Reason**: Cada bloco responde a uma pergunta diferente (quanto custa, onde fica, o que levo para casa) e o formato diz isso antes do texto.
- **Evidence**: três formatos de cartão (tiles 24px, unidade 4:3 e 24px, chip 64x81px), sem cartão dentro de cartão; sem bordas nos tiles, só sombra rgba(26,63,53,.08 a .14).

### Display arredondado só em números e títulos curtos
- **Trigger**: O texto precisa ser lido em segundos num celular e ao mesmo tempo carregar a personalidade de uma marca infantil.
- **Decision**: Fredoka One (peso único 400) fica em h1, h2, h3, preços e botões; Nunito 600 a 900 cobre todo o resto, em vez de usar a fonte arredondada também no corpo.
- **Reason**: O arredondado dá a voz de brinquedo onde há poucas palavras; no parágrafo de 13 a 14px ele cansaria e perderia nitidez.
- **Evidence**: Fredoka em 32 nós e Nunito em 133; h1 35.1px/lh 38.6px, h2 e h3 22px, números 40px; corpo 13 a 16px com peso 700 a 800; custo: 12 tamanhos distintos e três deles abaixo de 12px (10.5, 11).

## Mudanças sugeridas (não aplicadas)

1. **Dois textos para o mesmo CTA.** Evidência: botão do hero "Quero entender meu filho" (355x55, y 701) e barra fixa "Fazer o mapeamento · 5 min" (350x47) levam à mesma ação. Correção: usar um só texto nos dois, de preferência o da barra, que diz o esforço (5 min).
2. **Oferta repetida três vezes.** Evidência: cupom ESPERA (ticket), tiles R$ 50 e +5 min, e a linha "1 cupom = 1 visita · Playground ou Circuito" repetem a mesma regra em 3 blocos antes das unidades (entre y~940 e y~1260 no mobile). Correção: remover a linha de chips e deixar a regra só no ticket.
3. **Banner de cookies disputa o CTA.** Evidência: no 390x844 o banner fixo (botões "Aceitar" e "Só o essencial", 169x44 em y 780) ocupa a base da tela logo abaixo do CTA do hero (y 701 a 756) e cobre o subtítulo no screenshot. Correção: banner compacto de uma linha com os dois botões em 44px, ou adiado até a primeira rolagem (arquivo compartilhado fa-track.js, não alterado aqui).
4. **Três unidades ocupam um scroll inteiro.** Evidência: três cartões de 350x263 mais gaps de 14px somam 817px (97% da altura de 844px) para três endereços de duas linhas; os botões "Rota" repetem o endereço logo abaixo. Correção: cartões de 120px com foto 96px à esquerda e "Rota" dentro do cartão.
5. **Texto miúdo sobre foto.** Evidência: tag 10.5px, meta 12px (.p.meta, opacity .85) e badge 11px; o hero tem 12 tamanhos de fonte. Correção: piso de 12px para tag e badge, 13px para meta, e reduzir a escala para 6 tamanhos.
6. **Desktop deixa o terceiro cartão sozinho.** Evidência: a 1440px as unidades ficam em 2+1 (o cartão do Circuito ocupa a largura toda, ~600x263) dentro de uma coluna de 640px; links do rodapé têm 18px de altura (alvo mínimo recomendado 24px). Correção: grade de 3 colunas ou cartão do Circuito em largura de 1 coluna, e padding vertical de 6px nos links.
