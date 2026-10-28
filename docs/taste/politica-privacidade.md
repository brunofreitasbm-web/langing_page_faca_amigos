# Design Map

Fonte: http://localhost:8765/politica-privacidade.html (versão original, antes das edições de contraste). Medido em 1440x900 (DOM e imagem) e 390x844. Os itens de rodapé, banner de cookies e logo vêm de arquivos compartilhados e são marcados como tal.

## Spacing Scale

Valores observados (px): 6, 8, 10, 12, 16, 20, 22, 36, 48, 80. Unidade base: 2px (sem grade rígida, valores de 7 e 9px aparecem em padding de botões).

- .wrap: max-width 760px, padding 48px 22px 80px (coluna de texto de 716px a 1440px, 346px a 390px)
- h2: margin 36px 0 12px; p: margin-bottom 12px; li: margin-bottom 6px (37 ocorrências), ul recuo 22px
- .card: padding 20px 26px; .back: padding 13px 28px, margin-top 40px
- topbar fixa (sticky) de 64px, conteúdo 1120px

## Font Hierarchy

- h1: Fredoka One, 36.8px (clamp 1.7-2.3rem), peso 400 (Fredoka One)
- h2 (9 seções): Fredoka One, 20px, peso 400 (Fredoka One)
- corpo p/li (63 nós a 16px): Nunito, 16px / 27.2px, peso 600 (Nunito)
- "Última atualização": Nunito, 14.4px, peso 700 (Nunito)
- links: Nunito, 16px, peso 800 (Nunito)

## Color Palette

- background: #FFF9F1 (creme)
- text-primary (títulos, strong): #1A3F35 (11.11:1 sobre o creme)
- text-body (--ink-soft): #4C6B62 (5.60:1 sobre o creme)
- accent-cta (.back): #F0196B (4.15:1 com texto branco (reprovado, 4.15))
- link (--teal-dark): #1FA893 (2.83:1 sobre o creme (reprovado))
- destaque do card (borda esquerda 6px): #FFE234 (decorativo, 1.2:1 sobre branco)
- rodapé compartilhado: #065264 (69% da área medida (areaPct 69.3), texto herdado #4C6B62 = 1.50:1 sobre ele)

## Image Ratios

- logo da topbar (PNG): 6.97:1

## Component Tokens

- Raios: 24px (.card); 9999px (.back); 999px / 14px (rodapé e banner de cookies, compartilhados)
- Sombras: 0 4px 10px rgba(26,63,53,.08) (.card, uma camada, verde-escuro tingido); 0 10px 26px rgba(240,25,107,.3) (.back, uma camada, rosa tingido)
- Grid: coluna única, max-width 760px, 1 coluna, sem gutter (padding lateral 22px)

---

# Taste DNA

### Documento longo em coluna única sem índice
- **Trigger**: Ao publicar uma política de 9 seções e 44 itens de lista (5527px de altura a 1440px, 9830px a 390px)
- **Decision**: Escolheu manter uma coluna de 716px sem sumário nem navegação lateral em vez de um índice fixo ou barra lateral, que ajudaria a pular de seção
- **Reason**: quem lê política de privacidade lê do início ao fim, e o texto pede continuidade
- **Evidence**: coluna max-width 760px, 9 h2 de 20px com margin 36px 0 12px, nenhum <nav> interno, 0 âncoras

### Ênfase por mudança de cor, não de tamanho
- **Trigger**: Ao destacar termos dentro de parágrafos jurídicos
- **Decision**: Escolheu sublinhar o essencial com <strong> em #1A3F35 sobre texto #4C6B62, sempre a 16px em vez de aumentar a fonte ou usar caixa alta
- **Reason**: o texto jurídico mantém um só tamanho e o olho encontra os termos pela escuridão da cor
- **Evidence**: p/li 16px weight 600 cor #4C6B62; strong #1A3F35; 63 nós a 16px de 160 nós de texto

### Rosa guardado para um único botão (restrição)
- **Trigger**: Com uma paleta de rosa, turquesa e amarelo disponível
- **Decision**: Escolheu usar o rosa #F0196B só no botão "Voltar para o site" e deixar o resto em verde-escuro e creme em vez de pintar títulos ou links de rosa, como na home
- **Reason**: em página legal a cor de marca não deve disputar atenção com o texto
- **Evidence**: rosa cobre 0.6% da área (areaPct 0.6), amarelo 0.2%; h1/h2 em #1A3F35

### Um único bloco de resumo destacado
- **Trigger**: Ao abrir a política com um resumo de uma frase
- **Decision**: Escolheu isolar o resumo num card branco de 24px com borda esquerda de 6px amarela em vez de repetir cards por seção ou caixas de aviso em todo o texto
- **Reason**: um destaque único mostra onde está a mensagem principal; vários virariam ruído
- **Evidence**: 1 .card (radius 24px, padding 20px 26px, sombra 0 4px 10px) em 9 seções

## Mudanças aplicadas

1. **Rodapé ilegível.** Status: mantida a correção local (footer[data-fa-footer] p, li em branco 92%); correção na origem pendente em assets/fa-footer.js (compartilhado).
2. **Linha longa.** Status: aplicada. Corpo a 17px e blocos limitados a 68ch.
3. **Sem índice.** Status: aplicada. 9 âncoras no topo e ids nos h2.
4. **Corpo em peso 600.** Status: aplicada. Corpo em 400; strong e links em 800. Rodapé inalterado.
5. **Títulos fracos.** Status: aplicada. h1/h2 em Fredoka 600; h2 de 24px (razão 1.41); Fredoka One removida da página e do link de fontes.
6. **Saída única.** Status: adaptada. O botão usa o referrer de mesma origem quando existe; senão mantém o Playground.
7. **Extras.** Foco visível em verde-escuro (amarelo nas áreas escuras).
