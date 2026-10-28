# Design Map

Fonte: /codigo.html (codigo.html) (1440x900 e 390x844, versão original antes das correções de contraste; valores com seta mostram o ajuste aplicado).

## Spacing Scale
- Valores (px): 4, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 88
- Mais frequentes: 14px (51x), 18px (44x), 10px (43x), 8px (32x), 16px (31x)
- Seção: padding 64px 0 96px; espaçamento vertical grande 88px (16x)
- Card: padding 18px, gap 16px; método margin + gap

## Font Hierarchy
- h1 56px / 600 / Fredoka / lh 64.4px / tracking -0.28px
- h2 40px / 600 / Fredoka / lh 46px / tracking -0.2px
- h3 20.8px / 600 / Fredoka; h4 17.6px / 800 / Nunito
- Corpo 18.24px / 400 / Nunito / lh 29.2px / max-width 560px
- Também: 27.2px (10x), 18.72px (10x), 17px (34x), 14.72px (21x), 12.8px (13x), 15.36px, 14.4px, 15.2px, 13.6px, 14.08px

## Color Palette
- Amarelo #FDC51D (hero, 14.8%) e amarelo-20 #FFF3D2 (31% da área, cartões e seções)
- Petróleo #065264: texto (134 elementos), topbar e rodapé (9.9%)
- Rosa #FB3D6A -> #D61F4A: botões e destaques (3.8% da área; branco sobre rosa 3.51 -> 5.06:1)
- Turquesa #07C5C8 (1.8%): ícones, círculos, botão de amostra com texto petróleo 4.1:1 -> #04414A
- Texto sobre amarelo com opacity .85/.8 (cite, cta-note, small): 4.33/3.97:1 -> opacidade removida (petróleo pleno)

## Image Ratios
- Capa do e-book: 760x1077, 0.71:1; renderizada 283x445 (0.64:1 com raio 3px 10px 10px 3px)
- Miniatura da capa: 84px de largura
- Logo: 6.97:1, 237px (topo) e 279px (rodapé)

## Component Tokens
- Raios: 50% (35x), 24px (32x), 999px (24x), 18px (13x), 14px (12x), 16px (6x)
- Sombra padrão em 2 camadas, tintada em petróleo: rgba(6,82,100,.1) 0 1px 2px + 0 4px 14px (35x)
- Sombra do botão rosa: rgba(251,61,106,.25) 0 2px 4px + .3 0 8px 20px (7x)
- Capa: 0 30px 50px rgba(0,0,0,.35) + 0 8px 16px rgba(0,0,0,.25)
- Transições: transform .18s/.2s/.5s; sem grade fixa mapeada além de cartões em 3-4 colunas

---

# Taste DNA

### Amarelo como superfície, rosa só como ação
- **Trigger**: Quando quatro cores de marca (amarelo, turquesa, rosa, petróleo) disputam a página de venda
- **Decision**: Deram ao amarelo e ao amarelo-20 quase metade da superfície (14.8% + 31%) e reservaram o rosa para botões (3.8%), em vez de espalhar rosa em fundos e títulos
- **Reason**: O olho aprende que rosa = clicar; o amarelo cria calor sem competir com o botão
- **Evidence**: #FFF3D2 31% e #FDC51D 14.8% da área; #FB3D6A em 19 elementos, quase todos botões .btn-buy; petróleo #065264 em 134 textos

### Títulos arredondados com tracking negativo
- **Trigger**: Quando precisam de títulos grandes que soem amigáveis para mães, sem perder densidade em 3 linhas
- **Decision**: Usaram Fredoka 600 de 56/40px com tracking -0.28/-0.2px e corpo Nunito 18.24px, em vez de uma única sans de texto
- **Reason**: O tracking apertado mantém o h1 de 4 linhas compacto; o corpo grande (18.24px, max 560px) lê bem em celular
- **Evidence**: h1 56px lh 64.4px; h2 40px lh 46px; corpo 18.24px/400 lh 29.2px, 560px; duas famílias, Fredoka em 41 elementos

### Persistência: o mesmo botão no fim de cada seção
- **Trigger**: Quando a página tem ~10.000px de rolagem e o leitor decide em pontos diferentes
- **Decision**: Repetiram o mesmo botão rosa 'Quero o e-book' (10 vezes mais o da barra superior) em vez de um CTA no topo e outro no preço
- **Reason**: Quem se reconhece numa cena da casa quer agir naquele momento, sem rolar de volta
- **Evidence**: 10 elementos .btn-buy; botão 52px de altura, raio 999px, sombra rgba(251,61,106,.25/.3); barra superior sticky petróleo com o mesmo CTA

### Restrição: uma sombra, um raio de cartão
- **Trigger**: Quando há dezenas de cartões (dores, capítulos, ferramentas, FAQ) que poderiam ter elevações diferentes
- **Decision**: Aplicaram a mesma sombra petróleo de duas camadas e raio 24px em todos, em vez de variar profundidade por importância
- **Reason**: Cartões iguais deixam a hierarquia para o texto e a cor do ícone, e a página lê como uma só família
- **Evidence**: rgba(6,82,100,.1) 1px 2px + 4px 14px em 35 elementos; raio 24px em 32 elementos; ícones alternam amarelo/turquesa/rosa em ciclo 3n

## Mudanças aplicadas

1. **Dez botões idênticos em uma página** — Evidência: 10 elementos .btn-buy com o mesmo rótulo 'Quero o e-book', mais o botão da barra sticky, em ~10.071px de altura. Correção proposta: manter botão em: hero, depois dos capítulos, preço e FAQ; nas demais seções usar link de texto ou nada.
   - **Status: adaptada: botões rosa mantidos em topbar, hero, capítulos, oferta, FAQ e fechamento; dor, virada, ferramentas e prévia viraram link de texto sublinhado (.cta-link, 44px, mesmo data-cta/tracking).**

2. **Botão da barra superior quebra em duas linhas no celular** — Evidência: a 390px o rótulo 'Quero o e-book' quebra em 'Quero o e- / book' dentro da pílula rosa ao lado do logo (screenshot). Correção proposta: white-space: nowrap com padding menor, ou ocultar o logo escrito ao lado; avaliar rótulo curto.
   - **Status: aplicada: nowrap, fonte 1rem, logo 124px e padding 16px a <=420px.**

3. **Preço escondido no hero** — Evidência: o hero diz 'Valor e formas de pagamento no checkout seguro da Hotmart' e só mais abaixo aparece o preço (.price .to, 57.6px); a página irmã guia.html mostra 'Valor: R$ 149' no hero. Correção proposta: mostrar o valor perto do botão do hero, no mesmo padrão de guia.html.
   - **Status: descartada: a página não exibe preço de propósito (valor só no checkout Hotmart); não há valor para mostrar.**

4. **Escala tipográfica sprawling com texto de 12.8px** — Evidência: 12 tamanhos entre 12.8 e 56px; 17px (34x), 14.72px (21x), 12.8px (13x), 15.36px (10x), 14.4px (10x), 15.2px (9x), 14.08px (7x). Correção proposta: consolidar em 14px, 16px, 18px, 28px, 40px, 56px; piso de 14px para microtexto.
   - **Status: adaptada: piso de 14px (.875rem) e consolidação 14/16/18px em textos corridos; títulos display não mudaram.**

5. **Círculo branco solto no hero** — Evidência: na dobra a 1440px há um círculo branco de ~64px (x≈1150, y≈750) sem função, ao lado do círculo rosa de 520px; parece imagem que não carregou. Correção proposta: trocar por amarelo-20 ou remover.
   - **Status: aplicada: círculo branco do hero (e o do fechamento) trocado por amarelo-20.**

6. **Carrossel 'Veja como são as páginas' aparece em branco na captura** — Evidência: na captura de página inteira os cinco cartões do carrossel estão brancos (legendas visíveis, imagens não); pode ser lazy-load, a confirmar. Correção proposta: reservar aspect-ratio com cor de fundo e carregar as 3 primeiras imagens sem lazy.
   - **Status: aplicada: 3 primeiras prévias com loading="eager" e aspect-ratio 520/737 reservado.**
