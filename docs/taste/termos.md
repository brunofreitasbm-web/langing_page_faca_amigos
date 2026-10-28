# Design Map

Fonte: http://localhost:8765/termos.html (versão original, antes das edições de contraste). Medido em 1440x900 (DOM e imagem) e 390x844. Os itens de rodapé, banner de cookies e logo vêm de arquivos compartilhados e são marcados como tal.

## Spacing Scale

Valores observados (px): 6, 8, 10, 12, 16, 18, 22, 24, 30, 34, 40, 72. Unidade base: 2px (sem grade rígida, valores de 7 e 9px aparecem em padding de botões).

- main: max-width 780px, padding 40px 16px 72px (coluna de 748px a 1440px, 358px a 390px)
- h2: margin 34px 0 10px; p/li: margin-bottom 12px; ul recuo 22px
- .card: padding 20px 24px, margin 18px 0; .back: padding 12px 28px, min-height 52px, margin-top 30px
- header: padding 18px 16px, logo 170px

## Font Hierarchy

- h1: Fredoka, 38.4px (clamp 1.8-2.4rem), peso 600 (Fredoka)
- h2 (9 seções): Fredoka, 20.8px, peso 600 (Fredoka)
- corpo: Nunito, 17px / 28.9px, peso 400 (Nunito)
- "Última atualização": Nunito, 14.72px, opacity .8, peso 700 (Nunito)
- links e strong: Nunito, 17px, peso 800 (Nunito)
- botões .back: Nunito, 18.4px, peso 800 (Nunito)

## Color Palette

- background: #F4FAFB (gelo)
- text (petróleo): #065264 (8.30:1 sobre o gelo)
- card.warn: #FFF3D2 (7.92:1 com texto petróleo)
- accent-cta (.back): #FB3D6A (3.51:1 com texto branco (reprovado))
- focus ring: #FDC51D (outline 3px)
- rodapé compartilhado: #065264 (74.9% da área (areaPct 74.9))

## Image Ratios

- logo no header (PNG): 6.97:1

## Component Tokens

- Raios: 24px (.card); 999px (.back); 14px (rodapé e cookies, compartilhados)
- Sombras: 0 1px 2px rgba(6,82,100,.10), 0 4px 14px rgba(6,82,100,.10) (.card, duas camadas tingidas de petróleo); 0 2px 4px rgba(251,61,106,.25), 0 8px 20px rgba(251,61,106,.30) (.back, duas camadas tingidas de rosa)
- Grid: coluna única de 780px, sem grid

---

# Taste DNA

### Links na mesma cor do texto
- **Trigger**: Ao marcar e-mails, páginas e a política dentro de parágrafos
- **Decision**: Escolheu distinguir links só por peso 800 e sublinhado, na mesma cor #065264 do texto em vez de colorir links de rosa ou turquesa
- **Reason**: em texto de compra, uma cor extra de link competiria com o rosa dos botões finais
- **Evidence**: a { color: #065264; font-weight: 800 }; 43 nós em #065264 no texto

### Aviso em campo amarelo claro, sem sombra (restrição)
- **Trigger**: Ao separar o aviso "Material educativo" das cláusulas
- **Decision**: Escolheu usar fundo #FFF3D2 sem sombra (box-shadow none) e mesma tipografia em vez de ícone de alerta, borda colorida ou sombra como nos cards brancos
- **Reason**: sem sombra o aviso fica no plano do texto e não parece um botão ou módulo clicável
- **Evidence**: .card.warn: bg #FFF3D2, shadow none, radius 24px; 6.3% da área (areaPct 6.3)

### Sombras de duas camadas tingidas
- **Trigger**: Ao dar elevação ao card e aos botões sobre fundo gelo
- **Decision**: Escolheu empilhar 2 sombras com o matiz do elemento (petróleo no card, rosa no botão) em vez de uma sombra cinza de uma camada
- **Reason**: sombras com o matiz do fundo somem menos em telas claras e evitam borda suja
- **Evidence**: 0 1px 2px + 0 4px 14px rgba(6,82,100,.10); 0 2px 4px + 0 8px 20px rgba(251,61,106,.3)

### Saída em três botões iguais
- **Trigger**: Ao fechar o documento com três destinos
- **Decision**: Escolheu alinhar três pílulas rosa idênticas (52px de altura, 18.4px 800) em vez de um botão primário e dois links secundários
- **Reason**: todos os destinos têm o mesmo peso, o que dispensa decidir qual é o principal
- **Evidence**: 3 .back com mesmo padding 12px 28px, raio 999px

## Mudanças sugeridas (não aplicadas)

1. **Três CTAs idênticos no fim.** Evidência: 3 botões rosa de mesmo peso ("Voltar para o guia", "Voltar para o Código", "Eventos →"); a 390px empilham 3 x 52px + 30px de margem. Correção proposta: um botão primário (voltar ao produto) e os outros como links.
2. **Linha longa.** Evidência: 89 caracteres por linha a 1440px (748px, 17px), referência 60 a 75. Correção proposta: max-width ~68ch no texto, mantendo o container de 780px para o card.
3. **Sem índice.** Evidência: 9 seções numeradas em 3250px (5584px a 390px), 0 âncoras. Correção proposta: lista de âncoras no topo e id em cada h2.
4. **Subtítulo longo com versão e data.** Evidência: a linha .updated tem 14.72px com dois títulos de e-book e quebra em 2 linhas a 1440px. Correção proposta: separar a data em linha própria e tirar os títulos do subtítulo.
5. **Hierarquia h2/corpo estreita.** Evidência: h2 20.8px contra corpo 17px = razão 1.22 (margin 34px 0 10px). Correção proposta: h2 de 22-24px.
6. **Rodapé maior que o conteúdo útil a 390px.** Evidência: footer começa em 3845px de 5584px: 1739px de rodapé em tela estreita. Correção proposta: versão compacta do rodapé nas páginas legais (arquivo compartilhado).
