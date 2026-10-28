# Design Map

Fonte: http://localhost:8765/playground.html, 1440x900, versão original (antes das correções de contraste). Medido com extract.js e conferido no screenshot.

## Spacing Scale
- Valores mais usados (padding/margin/gap): 10px (81x), 15px (58x), 8px (56x), 14px (52x), 9px (34x), 6px (32x), 12px (31x), 20px (28x), 28px (23x), 76px (16x)
- Sem base única: mistura de múltiplos de 2, 3 e 5 (9, 14, 15, 22, 34); só 8, 12 e 20 caem em grade de 4px
- Seção: padding 56px topo / 64px base; gap do grid do hero 56px; gap de listas 12px
- Espaçamento por margin (h1 0 0 20px, h2 0 0 14px, p 0 0 30px) e gap em flex/grid
- Footer: padding 48px 20px 100px

## Font Hierarchy
- h1 57.6px / 400 / Fredoka One / lh 64.5px / ls 0.576px
- h2 43.2px / 400 / Fredoka One / lh 48.4px
- h3 21.6px / 400 / Fredoka One
- h4 17.6px / 800 / Nunito
- Corpo 19.2px / 600 / Nunito / lh 30.7px / max-width 544px
- Texto de apoio frequente: 15.68px (45x), 16px (35x), 14.72px (35x), 16.8px (20x); miúdos 12.48px (18x), 12.8px (12x)
- Pesos: 600 (78x), 800 (75x), 400 (63x, só Fredoka), 700 (61x), 900 (27x)
- Famílias: Nunito (503 nós), Fredoka One (44), Arial (6, fallback)

## Color Palette
- Fundo da página #FFF9F1 (18.4% da área); cartões #FFFFFF (57.9%); seções escuras #1A3F35 (8.6%)
- Texto principal #1A3F35 sobre #FFF9F1 = 11.11:1; texto secundário #4C6B62 sobre #FFFFFF = 5.85:1
- Rosa de ação (antes #F0196B, 4.15:1 com branco; depois #E01560, 4.72:1) em botões, preços e faixa final
- Verde WhatsApp #25D366 com texto #053B1C = 6.42:1 (antes branco, 1.98:1)
- Teal #2ECFB5 (3 usos como fundo) com texto #1A3F35 = 5.93:1; teal escuro de texto antes #1FA893 (2.97:1), depois #137A6A (5.22:1 sobre branco, 4.99 sobre creme)
- Amarelo #FFE234 (grifo de palavra, 4 elementos, 0.2% da área); estrelas antes #F5A800 (2.0:1), depois #B87800 (3.67:1, ícone)
- Neutros tintados para o verde-escuro (#1A3F35, #4C6B62), sem cinza puro
- Rodapé compartilhado: petróleo #065264, #FB3D6A e #FDC51D (fora do escopo desta página)

## Image Ratios
- Hero: 0.75:1 (1440x1920) exibido em moldura 514x585 (0.88:1), radius 44px 110px
- Galeria do espaço: fachada 1.66:1, oficina 0.75:1, salão 1.78:1, mais 2 vídeos
- Retrato (Isabella): 0.75:1, 136px de largura, círculo
- Logo: 6.97:1, 362px (topo) e 279px (rodapé)

## Component Tokens
- Radius: 9999px (46x, botões e pílulas), 50% (34x), 24px (31x, cartões, var --r-card), 20px (8x), 14px (5x), 48px e 26px (2x cada)
- Sombras: 0 4px 10px rgba(26,63,53,.08) (46x), 0 18px 40px rgba(26,63,53,.14) (10x), 0 10px 26px rgba(240,25,107,.32) (6x), 0 10px 26px rgba(37,211,102,.35) (5x); sempre uma camada, tintadas no verde-escuro, no rosa ou no verde
- Botões: 14px / 700, padding 8px 18px, radius 999px; variantes rosa, WhatsApp, contorno escuro
- Grid: hero 2 colunas 546px + 494px, gap 56px; 12 grids no total; container sem max-width fixo no extract (wrap interno ~1100px no screenshot)
- Transições: var(--t-fast) 0.2s cubic-bezier(0.34,1.4,0.64,1) com "all"; focus-visible presente; prefers-reduced-motion respeitado
- Alinhamento: hero e blocos de texto à esquerda; títulos de seção, cartões de passos e FAQ centralizados

---

# Taste DNA

### Fredoka só nos títulos, Nunito em todo o resto
- **Trigger**: Uma página que fala com pais cansados e cuidadosos sobre crianças, com ao menos 25 blocos de texto informativo (preços, regras, endereços).
- **Decision**: Fredoka One 400 em h1 57.6px, h2 43.2px e h3 21.6px (44 nós) e Nunito 600-900 no resto (503 nós), em vez de uma única família neutra ou de display em tudo.
- **Reason**: O título arredondado dá o tom de brincadeira que o pai reconhece antes de ler; o corpo em Nunito continua legível em 15-19px quando ele procura preço e horário com a criança no colo.
- **Evidence**: h1 57.6px/lh 64.5px; corpo 19.2px/600 com max-width 544px; 2 famílias reais (Arial só como fallback, 6 nós); a escala não é modular (57.6, 43.2, 21.6, 19.2, 17.6, 16.8, 16, 15.68, 14.72, 12.48).

### Rosa reservado a ação e preço
- **Trigger**: Muitas decisões por tela (WhatsApp, mapeamento, "Como chegar", reservar hora), todas disputando o clique.
- **Decision**: Rosa #F0196B só em botões primários, preços (R$ 60, R$ 108) e na faixa final, com o verde WhatsApp reservado a contato direto, em vez de espalhar rosa em ícones, bordas e títulos.
- **Reason**: O pai aprende em um scroll que rosa quer dizer "agir ou pagar", e o teal e o creme ficam como pano de fundo calmo.
- **Evidence**: rosa em 0.7% da área de fundo (6 elementos) e verde WhatsApp em 0.9% (11); 90% da superfície é creme #FFF9F1, branco ou #1A3F35; sombra tingida rgba(240,25,107,.32) só nos botões rosa. Custo: o rosa original falhava (4.15:1), corrigido para 4.72:1.

### Sem fotos de fundo nem ilustração: a foto vive em moldura
- **Trigger**: O hero precisa mostrar o espaço físico (piscina de bolinhas, casinha de madeira) sem virar banner genérico.
- **Decision**: Uma foto vertical 0.75:1 numa moldura de 514x585px com radius assimétrico 44px/110px e sombra 0 18px 40px, em vez de imagem de fundo em largura total com texto por cima.
- **Reason**: O pai vê o lugar real, não um estoque, e o texto do título fica sempre sobre creme #FFF9F1 a 11.11:1, sem depender de escurecer a foto.
- **Evidence**: 0 imagens de fundo em seções claras; fotos reais em todas as 7 imagens de conteúdo; só dois círculos decorativos chapados (amarelo e verde-menta) no hero, sem gradiente.

### Cartões brancos como unidade de tudo, com sombra tintada
- **Trigger**: Conteúdo muito heterogêneo (perguntas, preços, unidades, avaliações, parceiros) que precisa parecer do mesmo lugar.
- **Decision**: Cartão branco com radius 24px e sombra de uma camada tintada no verde-escuro como contêiner padrão, em vez de variar o tratamento por seção.
- **Reason**: Quem lê no celular reconhece "isto é uma unidade de informação" sem aprender regras novas a cada bloco.
- **Evidence**: radius 24px em 31 elementos; sombra rgba(26,63,53,.08) em 46; 2 níveis de sombra no total (sm e lg). Custo: cartões em quase toda seção achatam a hierarquia, e o espaçamento interno não tem escala (9, 10, 14, 15, 22, 28px).

## Mudanças sugeridas (não aplicadas)

1. **Preço repetido em 5 lugares com valores diferentes de contexto.** Evidência: "A partir de R$ 60" no hero, "R$ 108" no bloco Olhar FaçaAmigos, cartões R$ 60/R$ 50, tabela de 6 linhas e FAQ de preço. Correção: manter hero + tabela e transformar o bloco Olhar em uma linha de destaque dentro da tabela, reduzindo a página em cerca de 600px de rolagem.
2. **Bloco "Contato das unidades" duplica o rodapé compartilhado.** Evidência: logo antes do footer há dois cartões (Parque, Grão-Pará) com os mesmos endereços e botões WhatsApp que os cartões do rodapé, com o mesmo texto. Correção: remover o bloco do conteúdo e deixar só o do rodapé, ou parametrizar o rodapé para não repetir.
3. **CTAs em excesso na dobra do hero e no resto da página.** Evidência: hero tem "Como chegar" (rosa) e "Tirar dúvida no WhatsApp" (contorno), topo tem mais "Instituto FaçaAmigos", "Venha fazer parte" e WhatsApp: 5 ações em 900px de altura, e a ação principal (ir ao parque) fica rosa enquanto o WhatsApp verde é o canal de conversão. Correção: um primário por tela (WhatsApp ou Como chegar) e tirar "Instituto" do menu principal.
4. **Texto miúdo em 12.48-13px para informação que decide a visita.** Evidência: 18 nós em 12.48px e 12 em 12.8px (notas de preço, "Público geral. Meia-entrada...", legendas); no mobile 390px a tabela e as notas ficam abaixo de 13px. Correção: piso de 14px para qualquer texto que contenha preço, horário ou regra.
5. **Banner de cookies cobre o hero e o selo "Sem agendamento".** Evidência: no screenshot 1440x900 a faixa fixa (aprox. 580px de largura, 40px de altura) cobre a lista de selos e a base da foto; no mobile 390x844 ocupa 160px e esconde o botão "Como chegar". Correção: reduzir o texto a uma linha e o banner a 56px, ou ancorar em canto sem cobrir o CTA.
6. **Avaliações com cartões de altura fixa e texto curto.** Evidência: três cartões de cerca de 330x330px (em 1440) com 1 a 2 linhas de depoimento e cerca de 60% de vazio, enquanto o carrossel esconde o quarto cartão. Correção: altura automática e depoimento em 17-18px, ou mostrar 4 por linha.
