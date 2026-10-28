# Design Map

Fonte: /guia.html (guia.html) (1440x900 e 390x844, versão original antes das correções de contraste; valores com seta mostram o ajuste aplicado).

## Spacing Scale
- Valores (px): 2, 4, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 88
- Mais frequentes: 14px (63x), 10px (48x), 18px (48x), 8px (35x), 16px (34x)
- Seção: padding 64px 0 96px; 88px (18x)
- Card: padding 18px, gap 16px; método margin + gap

## Font Hierarchy
- h1 56px / 600 / Fredoka / lh 64.4px / tracking -0.28px
- h2 40px / 600 / Fredoka / lh 46px / tracking -0.2px
- h3 20.8px / 600 / Fredoka; h4 17.6px / 800 / Nunito
- Corpo 18.24px / 400 / Nunito / lh 29.2px / max-width 560px
- Também: 17px (37x), 14.72px (28x), 12.8px (14x), 27.2px (12x), 18.72px (11x), 15.36px, 14.4px, 16.8px, 15.2px, 13.6px

## Color Palette
- Petróleo #065264: hero, topbar e rodapé (31% da área) e texto (149 elementos)
- Gelo #F4FAFB (31.2%) e turquesa-10 #E2F8F8 (10.8%): fundos de seção; branco 17.2%
- Rosa #FB3D6A -> #D61F4A (1.6% da área): botões; 3.51 -> 5.06:1 com branco
- Turquesa #07C5C8 (3.3%): círculos, ícones; botão 'Baixar o capítulo 1 grátis' com texto petróleo 4.1:1 -> #04414A
- Amarelo #FDC51D (1.5%): destaque 'o que fazer no dia a dia' e círculo decorativo

## Image Ratios
- Capa do e-book: 760x1077, 0.71:1; renderizada 283x445 (0.64:1, raio 3px 10px 10px 3px)
- Miniatura da capa: 84px
- Logo: 6.97:1, 237px (topo) e 279px (rodapé)

## Component Tokens
- Raios: 50% (37x), 24px (35x), 999px (33x), 18px (15x), 14px (11x), 8px (7x), 16px (6x)
- Sombra padrão em 2 camadas petróleo: rgba(6,82,100,.1) 0 1px 2px + 0 4px 14px (41x)
- Sombra do botão rosa: rgba(251,61,106,.25) 0 2px 4px + .3 0 8px 20px (10x)
- Sombra de destaque: rgba(6,82,100,.1) 0 2px 4px + .18 0 14px 38px (8x)
- Transições transform .18s/.2s/.5s; grade de cartões em 3-4 colunas, gap 16px

---

# Taste DNA

### Hero escuro para a capa clara
- **Trigger**: Quando a capa do e-book é petróleo com formas coloridas e precisa se destacar na primeira tela
- **Decision**: Pintaram o hero inteiro de #065264 com círculo turquesa de 520px atrás da capa, em vez do fundo claro das seções seguintes
- **Reason**: O livro vira o objeto mais luminoso da dobra e o rosa do botão aparece sem rival
- **Evidence**: hero #065264 (31% da área com topbar e rodapé); círculo turquesa #07C5C8 atrás da capa 283x445; botão rosa 176x56 à esquerda, a ~100px do h1

### Marca-texto amarelo em uma única frase
- **Trigger**: Quando o título de 56px precisa apontar a promessa ('o que fazer no dia a dia') sem imagem
- **Decision**: Aplicaram uma faixa #FDC51D com texto petróleo só na frase-chave, em vez de colorir o título inteiro
- **Reason**: A faixa funciona como grifo de caneta: o leitor que só passa o olho lê a promessa primeiro
- **Evidence**: h1 Fredoka 600, 56px, lh 64.4px, 4 linhas; faixa amarela cobre ~7 palavras de ~16; amarelo é só 1.5% da área

### Cada seção fecha com o mesmo botão
- **Trigger**: Quando a página passa de 11.000px e o leitor se convence em momentos diferentes
- **Decision**: Repetiram o botão rosa 'Quero o guia' no fim de cada bloco (11 elementos .btn-buy) em vez de concentrar a oferta no preço
- **Reason**: Quem se reconhece numa cena da rotina quer agir ali, sem rolar até o preço
- **Evidence**: 11 .btn-buy; sombra rgba(251,61,106,.25/.3) em 10 elementos; topbar sticky com o mesmo CTA

### Restrição: uma sombra e um raio para todos os cartões
- **Trigger**: Quando capítulos, materiais A4 e FAQ poderiam ter tratamentos diferentes
- **Decision**: Usaram a mesma sombra petróleo de duas camadas (41x) e raio 24px (35x), em vez de variar a elevação por tipo
- **Reason**: A hierarquia fica no texto e na cor do ícone, e a página lê como uma só família
- **Evidence**: rgba(6,82,100,.1) 1px 2px + 4px 14px em 41 elementos; raio 24px em 35 elementos; ícones alternam amarelo/turquesa/rosa em ciclo 3n

## Mudanças sugeridas (não aplicadas)

1. **Onze botões idênticos em uma página** — Evidência: 11 elementos .btn-buy com 'Quero o guia' em ~11.301px, além do botão da barra sticky. Correção proposta: manter em hero, depois dos capítulos, preço e FAQ; nas outras seções usar link de texto.
2. **Marca-texto amarelo do h1 quebra em dois blocos** — Evidência: a 1440px 'o que fazer no / dia a dia' vira duas faixas empilhadas, a segunda com apenas 'dia a dia' (screenshot, y≈290-425). Correção proposta: aplicar text-wrap: balance no h1 ou reduzir a largura do bloco para a frase caber em uma linha.
3. **Preço com pouca hierarquia** — Evidência: 'Valor: R$ 149' está a 17px/800 abaixo do botão, sem parcelamento nem comparação, e o botão tem 18.7px. Correção proposta: destacar o valor em Fredoka 28px e mostrar parcelas, como o banner do resultado do quiz.
4. **Duas páginas de e-book quase idênticas** — Evidência: codigo.html e guia.html repetem CSS e seções (dores, capítulos, ferramentas, carrossel, autora, preço, FAQ): ~900 linhas cada, mesmos raios, sombras e tokens. Correção proposta: extrair um CSS comum em assets/ (arquivo compartilhado, só reportado) para evitar divergência de tokens.
5. **Escala tipográfica sprawling** — Evidência: 13+ tamanhos entre 12.8 e 56px; 17px (37x), 14.72px (28x), 12.8px (14x), 15.36px (12x), 14.4px (10x). Correção proposta: consolidar em 14, 16, 18, 28, 40, 56px; piso 14px.
6. **Faixa de benefícios do hero em fundo translúcido** — Evidência: chips 'Acesso imediato', 'PDF', 'Garantia de 7 dias' em branco 14.7px sobre rgba de branco ~8% no petróleo, discretos perto do botão (screenshot y≈690). Correção proposta: aumentar a opacidade do fundo do chip e subir a garantia para junto do botão.
