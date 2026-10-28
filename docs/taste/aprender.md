# Design Map

Fonte: `/aprender.html` em 1440x900 (extract.js) e 390x844, estado original, antes das correções de contraste. Página: 3869px de altura no desktop, 7746px no mobile.

## Spacing Scale
- Valores mais frequentes (padding/margin/gap): 8px (49x), 10px (28x), 18px (20x), 14px (14x), 22px (11x), 6px (10x), 16px (9x), 4px (8x); blocos grandes: 84px (6x), 40px (2x).
- Sem base múltipla de 4 ou 8: 18px, 22px, 14px, 10px, 9px, 7px convivem. Uso de `gap` em grades (18px entre cards) e `margin` em texto.
- Gutter lateral: 16px (`--gutter`); container `.wrap` max-width 1120px (1088px úteis).
- Hero: 265px de altura (y 65 a 330). Bloco "para pais": 335px. Grade de guias: 1065px, 36px de margem acima.
- Só um espaçamento entre seções foi medido pelo extrator: 40px (section[3] para section[4]).

## Font Hierarchy
- h1 46.4px / 600 / Fredoka / line-height 53.4px / letter-spacing -0.23px
- h2 21.6px / 600 / Fredoka (títulos de bloco); título de card h3 16.8px / 600 / Fredoka
- Lede (hero) 17.92px / 400 / Nunito / line-height 28.7px / max-width 640px
- Texto de card 14.72px (30 usos), texto de e-book 14.08-14.4px, tag 12.16px / 800 / maiúsculas, letter-spacing .08em
- Famílias: Nunito (200 elementos), Fredoka (17). Pesos: 800 (38), 600 (38), 400 (26), 700 (8). 12 tamanhos distintos entre 12.16px e 46.4px.

## Color Palette
- #065264 petróleo: texto principal (40 elementos) e fundo do hero/faixa final (47.6% da área); 8.75:1 sobre branco
- #FFFFFF: fundo do corpo (25.5%) e dos cards; texto sobre petróleo
- #FFF3D2: fundo do card "Por onde começar" (0.6% da área); petróleo sobre ele 7.92:1
- #FB3D6A rosa (original): tags, preço, botão. 3.51:1 sobre branco (falha). Corrigido para #D61F4A, 5.06:1
- #25D366 / texto #053B1C: botão de WhatsApp (6.42:1)
- #FDC51D amarelo: botão "Aceitar" do cookie e foco; #07C5C8 turquesa: só círculo decorativo (opacity .18)
- Neutros tintados para o petróleo (sombras rgba(6,82,100,...)); nenhum cinza puro no CSS da página além de `--gray #7A8A90`, sem uso visível

## Image Ratios
- Foto do guia-card: 259x145 (1.79:1), `object-fit` cobrindo a largura do card
- Capa de e-book (miniatura): 72x102 (0.71:1)
- Card de guia: 259x359 (0.72:1); card de e-book: 342x249 (1.37:1)

## Component Tokens
- Raios: 999px (14x: botões, tags, nav), 22px (10x: guide-card, mapeamento), 20px (2x: e-book-card), 14px (6x), 28px, 16px; aninhado: card 22px contém imagem com cantos superiores herdados
- Sombras: card `0 1px 2px rgba(6,82,100,.10), 0 4px 14px rgba(6,82,100,.10)` (11x, 2 camadas, tintada de petróleo); botão rosa `0 2px 4px rgba(251,61,106,.25), 0 8px 20px rgba(251,61,106,.30)`; cookie `0 8px 28px rgba(0,0,0,.28)`
- Grade: `.guides-grid` 4 colunas (258.5px) com gap 18px no desktop, 2 colunas a partir de 720px, 1 coluna no mobile; 9 cards deixam a 3a linha com 1 card só
- Botão: 14px/700, padding 8px 18px (nav/cookie), `.btn-buy` min-height 52-56px
- Foco: `:focus-visible` com contorno amarelo 3px; `prefers-reduced-motion` respeitado; transições: nenhuma

---

# Taste DNA

### Mesmo cartão para guia e produto, diferenciado só pelo conteúdo
- **Trigger**: a página lista 9 guias gratuitos e 2 e-books pagos e o pago não pode parecer anúncio.
- **Decision**: um único molde de card (branco, raio 20-22px, sombra petróleo de 2 camadas) para guias e e-books, em vez de moldura de venda com selo ou cor própria.
- **Reason**: quem chega com uma dúvida não deve sentir que o conteúdo útil virou propaganda; o preço aparece como uma linha de texto, não como banner.
- **Evidence**: `a.guide-card` 259x359 raio 22px e `a.ebook-card` 342x249 raio 20px com a mesma sombra (11 usos); preço 14.4px/800 em #FB3D6A sem fundo.

### Fundo petróleo só nas pontas, branco no meio
- **Trigger**: a página tem uma tese (hero) e um pedido (mapeamento grátis) separados por 1065px de lista.
- **Decision**: #065264 apenas no hero (265px) e na faixa final, com o miolo sobre branco, em vez de alternar faixas coloridas a cada bloco.
- **Reason**: a leitura vira começo, lista e pedido; o contraste forte marca onde o pedido acontece.
- **Evidence**: #065264 cobre 47.6% da área em 2 faixas; grade de guias de y=869 a y=1934 sobre #FFFFFF; uma única faixa suave (#F4FAFB) antes do final.

### Fotos reais nos guias, sem ilustração decorativa
- **Trigger**: cada guia sobre comportamento infantil precisa de uma imagem de capa.
- **Decision**: fotos do espaço, de profissionais e capas de e-book (145px de altura) em vez de ícones ou ilustrações genéricas.
- **Reason**: pais de Belém reconhecem o lugar e a profissional; a foto sugere que o guia vem de gente real.
- **Evidence**: 8 das 9 capas são fotos; imagem 259x145 ocupa 40% dos 359px do card; nenhum SVG decorativo nos cards.

### Restrição: um acento só, o rosa, em tag, preço e botão
- **Trigger**: a marca tem 4 cores vivas (rosa, turquesa, amarelo, petróleo) e 9 categorias de guia.
- **Decision**: rosa como único acento de texto e botão; turquesa e amarelo só em círculos decorativos e foco, em vez de uma cor por categoria.
- **Reason**: nove categorias em nove cores exigiriam que a mãe aprendesse um código; um rosa só significa "clique aqui" ou "comece por aqui".
- **Evidence**: #FB3D6A em 12 textos contra #065264 em 40; as 9 tags de categoria (12.16px/800) no mesmo rosa; círculos do hero em turquesa opacity .18 e amarelo opacity .16.

## Mudanças aplicadas

1. **Card órfão na grade.** Aplicada: 3 colunas (3x3) a partir de 980px; 2 colunas de 640 a 979px.
2. **Mobile com 9 fotos empilhadas.** Aplicada: abaixo de 640px o card vira horizontal (foto de 104px à esquerda, texto à direita, descrição em 2 linhas); página de 7746px para 5930px.
3. **Dois CTAs de mapeamento iguais.** Adaptada: mantido o do topo; o final ganhou título-pergunta ("Leu e continua sem saber se é fase ou algo para observar?") e texto que retoma a dúvida. Mesmo `data-cta`, mesmo rótulo do botão.
4. **Hierarquia invertida.** Aplicada: h2 "Por onde começar" 24px (28px no desktop), h3 de card 19.2px, h3 de e-book 18.4px.
5. **Tag rosa 12.16px.** Adaptada: 13px com ponto rosa; tempo de leitura mantido na tag (não movido para o fim do card).
6. **Glossário duplicado.** Aplicada: removido o link de uma linha do topo; fica o card "Palavras explicadas". Preço dos e-books em 15px.
