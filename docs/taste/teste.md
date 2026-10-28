# Design Map

Fonte: /teste.html (teste.html) (1440x900 e 390x844, versão original antes das correções de contraste; valores com seta mostram o ajuste aplicado).

## Spacing Scale
- Valores observados (px): 2, 4, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 22, 40, 56
- Mais frequentes: 10px (28x), 9px (14x), 8px (12x), 6px (10x): base de 2px, sem grade de 8
- Seção da landing: padding 40px 34px; gap entre seções 96px; cartão ~592px de largura
- Método: margin + gap (botão: gap 10px)

## Font Hierarchy
- h1 41.6px / 400 / Fredoka One / lh 46.6px / tracking 0.416px
- Corpo 17.28px / 600 / Nunito / lh 27.6px / max-width 512px
- h4 17.6px / 800 / Nunito; botão 16.8px / 800
- Microtexto: 14.72px (20x), 14.4px (9x), 13.6px (8x), 12.8px (5x), 13.12px (4x); 12 tamanhos no total
- Famílias: Nunito (119 elementos), Fredoka One (2)

## Color Palette
- Fundo creme #FFF9F1; cartão branco #FFFFFF (32.5% da área); rodapé petróleo #065264 (48.1%, compartilhado)
- Texto: #1A3F35 (títulos), #4C6B62 (corpo, ink-soft)
- Rosa de ação #F0196B -> #E01560 (botão 'Começar agora', 4.15 -> 4.72:1 com branco)
- Turquesa #2ECFB5 (borda do cartão 3px, chips); teal-dark #1FA893 -> #137A6A (eyebrow, 2.97 -> 5.22:1)
- WhatsApp #25D366 com texto #FFFFFF (1.98:1) -> #053B1C (6.42:1); rodapé .legal 2.77:1 -> alfa .78 sobre #065264

## Image Ratios
- Foto da fundadora: 148x148, 1:1, círculo (50%), sombra 0 18px 40px
- Logo: 6.97:1 (362px no topo)
- Capa do e-book no resultado: 118px de largura, rotate(-3deg)

## Component Tokens
- Raios: 9999px (6x), 999px (5x), 14px (4x), 24px (cartão), 50%
- Sombras de camada única, tintadas em verde-escuro: rgba(26,63,53,.08) 0 4px 10px (4x), rgba(26,63,53,.14) 0 18px 40px (2x); sombra do botão tintada na cor dele
- Botão: padding 15px 30px, raio 9999px, 16.8px/800
- Transições: transform .2s cubic-bezier(.34,1.4,.64,1); entrada opacity/transform .7s
- focus-visible presente (outline 3px teal); prefers-reduced-motion respeitado
- Grade: coluna única de ~592px no funil; rodapé em 3 colunas, gap 28px 40px

---

# Taste DNA

### Uma pergunta, uma ação por tela
- **Trigger**: Quando o objetivo é fazer pais ansiosos começarem um quiz de 25 perguntas
- **Decision**: Escolheram um único cartão de ~592px com um h1 e um botão rosa full-width, em vez de uma landing longa com seções de prova e navegação
- **Reason**: Quem chega com a dúvida 'será que é normal?' está fragilizado e desiste diante de muitas escolhas; um só passo claro reduz a hesitação
- **Evidence**: cartão 592px com borda 3px #2ECFB5 sobre fundo #FFF9F1; 1 h1 (41.6px) + 1 botão (padding 15px 30px, 9999px); topo só com logo e pílula WhatsApp

### Voz acolhedora na tipografia
- **Trigger**: Quando o tema é comportamento infantil e a marca precisa soar como alguém que acolhe, não como laudo
- **Decision**: Chegaram ao h1 arredondado Fredoka One 41.6px sobre corpo Nunito 600 de 17.28px, em vez de uma sans neutra única
- **Reason**: Letras redondas e pesadas suavizam a pergunta difícil; o corpo a 600 mantém leitura confortável em tela de celular
- **Evidence**: h1 Fredoka One 400, tracking 0.416px, lh 46.6px; corpo Nunito 17.28px/600 com max-width 512px; apenas 2 famílias (119 vs 2 elementos)

### Sombra e neutros tintados no verde-escuro
- **Trigger**: Quando o cartão branco precisa se destacar do creme sem parecer flutuar em cinza
- **Decision**: Tingiram sombras e texto com #1A3F35 (rgba(26,63,53,.08/.14)) em vez de preto/cinza puro
- **Reason**: O verde-escuro herda a cor da marca e mantém o conjunto quente, em vez de uma sombra cinza fria sobre fundo creme
- **Evidence**: sombras de camada única rgba(26,63,53,.08) 0 4px 10px e .14 0 18px 40px; texto #1A3F35 e #4C6B62; fundo #FFF9F1; sombra do botão rosa rgba(224,21,96,.32), tintada na cor do botão

### Restrição: sem seções de persuasão antes do quiz
- **Trigger**: Quando poderiam acrescentar depoimentos, FAQ e lista de benefícios acima do botão
- **Decision**: Mantiveram só três chips (5 minutos, 25 perguntas, 100% gratuito) e a assinatura da psicóloga, em vez de blocos de prova social
- **Reason**: O funil mede cliques em 'Começar agora'; cada bloco extra é um ponto de saída antes do primeiro passo
- **Evidence**: 3 chips de 14.4px/800 como única prova; rosa #E01560 ocupa 1.1% da área: usado só no botão; sem imagens além da foto 148x148 e do logo

## Mudanças sugeridas (não aplicadas)

1. **Rodapé institucional ocupa quase metade da página do funil** — Evidência: o rodapé compartilhado cobre 48.1% da área (≈ 900 de 2130px) com 3 cartões de unidade e 3 colunas de links (~20 saídas) abaixo do único cartão do quiz. Correção proposta: usar variante enxuta do rodapé nesta página (só links legais e contato); depende de assets/fa-footer.js, por isso só reportado.
2. **Três botões de WhatsApp competem com o botão rosa** — Evidência: pílula verde no topo, botão flutuante 62px e botão 'WhatsApp Clínica' no cartão de contato, todos #25D366 (2.2% da área, mais saturados que o rosa a 1.1%). Correção proposta: manter o flutuante e a pílula do topo em estilo secundário (contorno) e deixar o verde cheio só no cartão de contato.
3. **Duas frases de autoria seguidas** — Evidência: 'Criado por Isabella Gonçalves Freitas, psicóloga infantil (CRP 10/4727), fundadora do FaçaAmigos.' e logo abaixo 'Desenvolvido pela idealizadora do FaçaAmigos · não substitui avaliação profissional', ambas ~13.6px. Correção proposta: fundir em uma linha de assinatura e deixar só o aviso 'não substitui avaliação profissional' como segunda.
4. **Escala tipográfica fragmentada e texto pequeno** — Evidência: 12 tamanhos entre 12.8 e 17.28px; 14.72px (20x), 14.4px (9x), 13.6px (8x), 13.12px (4x), 12.8px (5x). Correção proposta: reduzir a 3 tamanhos (14px, 16px, 18px) e não descer de 14px em texto corrido.
5. **Chips quebram em duas linhas no desktop** — Evidência: a 1440px a linha tem '~5 minutos' e '25 perguntas rápidas' e '100% gratuito' fica sozinho na segunda linha (screenshot, y≈715). Correção proposta: reduzir gap/padding dos chips ou usar flex-wrap com largura que caiba os três em 520px.
6. **Botão 'Começar agora' fora da primeira tela no celular** — Evidência: a 390x844 o texto de apoio termina em y≈690 e os chips vêm depois; o botão fica abaixo da dobra e o banner de cookies cobre o fim da tela. Correção proposta: encolher a foto (148px para ~96px) e o espaçamento no mobile para o botão aparecer sem rolar.
