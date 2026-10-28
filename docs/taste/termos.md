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

## Mudanças aplicadas

1. **Três CTAs idênticos.** Status: aplicada. "Voltar para o guia" é o único botão rosa; Código e Eventos viram links com alvo de 44px.
2. **Linha longa.** Status: adaptada. Conteúdo (inclusive o card) limitado a 68ch; main segue em 780px.
3. **Sem índice.** Status: aplicada. Lista "Nesta página" com 9 âncoras (alvo 44px) e ids nos h2.
4. **Subtítulo longo.** Status: aplicada. Subtítulo ficou só com a data; os títulos já constam no parágrafo de abertura. Opacity removida.
5. **Hierarquia h2/corpo.** Status: aplicada. h2 de 24px (razão 1.41), margem superior 40px.
6. **Rodapé grande.** Status: descartada. Depende de assets/fa-footer.js (compartilhado).
7. **Extras.** Foco visível em petróleo (amarelo só em header/footer escuros).
