# Design Map

Fonte: `/glossario.html` em 1440x900 (extract.js) e 390x844, estado original, antes das correções de contraste. Altura da página: 9662px no desktop, 14819px no mobile. 41 verbetes (`div.term`), 16 letras.

## Spacing Scale
- Valores mais frequentes: 22px (82x, padding interno do card), 6px (68x), 12px (44x, espaço entre cards), 10px (42x), 8px (20x), 30px (16x, entre grupos de letra), 16px, 9px, 14px, 4px.
- Sem base fixa: 22px, 30px, 9px, 7px convivem com 8px e 12px. Espaço entre cards por `margin-bottom: 12px`; padding do card 18px 22px.
- Hero: padding 44px 0 32px (133px de espaço medido entre section[0] e section[1]). Grupo de letra: `margin-bottom: 30px`.
- Container: `.wrap` 1120px; coluna de termos de 868px de largura (cards) e `dd` de 812px.

## Font Hierarchy
- h1 43.2px / 600 / Fredoka / line-height 49.7px
- Letra de grupo (h2) 25.6px / 600 / Fredoka, cor rosa, borda inferior 3px #FFF3D2
- Termo (dt) 17.92px / 600 / Fredoka
- Definição (dd) 15.68px / 400 / Nunito / line-height ~25px (63 elementos de 15.68px)
- Âncora "#" 12.8px / 800 e rótulos 12.8px (46 usos); lede 17.28px / 400 / max-width 620px
- Famílias: Nunito (272), Fredoka (101). Pesos: 800 (99), 600 (81), 400 (54), 700 (8).

## Color Palette
- #F4FAFB: fundo do corpo e dos cards (70.6% da área); petróleo sobre ele 8.30:1
- #065264: texto (108 elementos), hero e rodapé (20.6%)
- #FB3D6A rosa (original): letras de grupo e links de definição (39 elementos), 3.33:1 sobre #F4FAFB (falha); corrigido para #D61F4A, 4.79:1
- #07C5C8 turquesa (original) como texto da âncora "#" (41 elementos), 2.03:1 (falha); corrigido para #067476, 5.29:1
- #FFFFFF: faixa do campo de busca e cartão do rodapé (5%); #FFF3D2 e #E2F8F8 só em bordas e detalhes
- Placeholder e "nenhum resultado" em #7A8A90 (3.40:1 sobre #F4FAFB); corrigido para #5B6B71 (5.26:1)

## Image Ratios
- Nenhuma imagem de conteúdo entre o hero e o rodapé. Só a logo (topbar) e a do rodapé.

## Component Tokens
- Card de verbete: raio 20px, sombra `0 1px 2px rgba(6,82,100,.10), 0 4px 14px rgba(6,82,100,.10)` (42 usos), 868x154-179px, razão ~5:1
- Botões de letra: 34x34px, raio 50% (16x), fundo #F4FAFB; letras sem termo com opacity .32
- Campo de busca: min-height 52px, raio 999px, borda 2px #E2F8F8, foco com contorno amarelo 3px
- `.finder`: sticky, `top: 64px`, z-index 40, padding 16px 0, borda inferior rgba(6,82,100,.12)
- Foco `:focus-visible` amarelo 3px, `prefers-reduced-motion` respeitado, transições: nenhuma

---

# Taste DNA

### Uma coluna de cards abertos, sem accordion
- **Trigger**: 41 termos técnicos precisam ser consultados por pais com pressa e sem repertório.
- **Decision**: definição completa aberta em cada card (3 a 5 linhas) em vez de accordion ou tooltip.
- **Reason**: quem busca "o que é CIPTEA" quer a resposta sem um toque extra, e o toque esconderia o link para o guia.
- **Evidence**: 41 `div.term` de 868px de largura e 154-179px de altura, 0 elementos `<details>`; `dd` 15.68px com 3 frases.

### Fórmula fixa em cada definição
- **Trigger**: um termo clínico precisa virar algo que muda a decisão do pai ou da mãe.
- **Decision**: cada verbete segue o roteiro "o que é / aparece quando / muda pra você" e termina com link para o guia, em vez de definição de dicionário.
- **Reason**: o leitor quer saber se aquilo vale para o filho dele; o roteiro repetido faz o verbete ser lido em segundos.
- **Evidence**: 22 links `.term dd a` em #FB3D6A/800 sublinhado; 41 verbetes sob 16 letras.

### Barra fixa de busca e letras
- **Trigger**: a lista tem 9662px (desktop) e 14819px (mobile).
- **Decision**: busca e 16 letras sticky no topo em vez de índice lateral ou paginação.
- **Reason**: a lista é curta para paginar e longa para o pai se perder; a barra fica ao alcance do polegar.
- **Evidence**: `.finder` sticky `top:64px`, 133px (desktop) e 173px (mobile) de altura; botões 34x34px; `a.off` opacity .32.

### Restrição: sem imagem, sem ícone, uma cor de acento
- **Trigger**: a página é ferramenta de consulta, não de persuasão.
- **Decision**: zero imagens, hierarquia só com Fredoka (termo) e rosa (letra e link), cards diferenciados do fundo só por sombra baixa, em vez de ilustrar cada verbete.
- **Reason**: a ilustração pede ao leitor mais uma interpretação num momento em que ele só quer a definição.
- **Evidence**: 0 imagens de conteúdo; 1 sombra em 42 cards; card #F4FAFB sobre fundo #F4FAFB (70.6% da área), separado apenas pela sombra `rgba(6,82,100,.10)`.

## Mudanças aplicadas

1. **Busca fixa atrás do topo no mobile.** Aplicada: abaixo de 640px a busca fica fixa em `top: 98px`, logo abaixo da topbar (verificado: topbar termina em 98px, busca começa em 98px).
2. **Barra fixa de 173px no mobile.** Aplicada: só a busca (65px) fica fixa; as letras rolam com a página.
3. **Alvos de 34px.** Aplicada: letras 44x44px com gap 4px (grade que quebra linha no mobile); âncora "#" com área de toque ampliada e 14px.
4. **Sem ponto de retorno.** Adaptada: link "↑ Voltar às letras" ao fim de cada grupo, só no mobile.
5. **Links rosa pesados.** Aplicada: peso 700 e sublinhado de 1px.
6. **Card e fundo iguais.** Descartada: a página usa fundo branco (#fff) e o card #F4FAFB já se distingue dele; trocar para branco apagaria o contraste que existe.
