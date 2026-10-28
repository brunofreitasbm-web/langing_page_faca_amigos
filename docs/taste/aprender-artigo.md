# Design Map

Fonte: `/aprender/birra-ou-crise.html` em 1440x900 (extract.js) e 390x844, estado original. O mesmo template (mesmo CSS inline) é usado nos 9 artigos de `/aprender/`. Altura: 3299px (desktop), 5266px (mobile); `<article>` com 2064px.

## Spacing Scale
- Valores mais frequentes: 10px (27x), 8px (25x), 16px (17x), 14px (13x), 6px (10x), 9px, 18px, 20px (6x), 4px, 12px, 30px, 26px, 22px.
- Sem base fixa; mistura 2px, 6px, 9px, 14px, 18px, 22px, 26px. Entre seções do artigo: h2 com `margin: 38px 0 14px`, parágrafo `margin-bottom: 16px`, caixas `margin: 30px 0`, CTA `margin: 44px 0 20px`.
- Coluna: `.art-wrap` max-width 740px, gutter 16px (708px úteis); topbar 64px.
- Medidas verticais: breadcrumb y=~60, h1 y=166 (94px de altura), 1o parágrafo y=376, "Próximo passo" y=1574 (176px), "Você não está sozinha" y=1771 (175px).

## Font Hierarchy
- h1 40px / 600 / Fredoka / line-height 47.2px (clamp 1.7rem a 2.5rem)
- h2 24.8px / 600 / Fredoka; h3 do "Próximo passo" 20px / 600 / Fredoka
- Corpo 17px / 400 / Nunito / line-height 28.05px (1.65) / ~83 caracteres por linha em 708px
- Breadcrumb 13.76px/700, byline 14.7px/700, eyebrow 12.8px/800 maiúsculas (.1em), rótulos de caixa 12.8px/800
- Famílias: Nunito (148 elementos), Fredoka (8). Pesos: 800 (29), 600 (29), 400 (19), 700 (17).

## Color Palette
- #FFFFFF: fundo da página (15% da área do documento); #065264: texto e rodapé (56.3%); petróleo sobre branco 8.75:1
- #FFF3D2: caixa "Na prática" (6.8% da área); petróleo 7.92:1
- #E2F8F8: caixa "Você não está sozinha" e bordas finas; #F4FAFB: cartões "Leia também" (8.30:1)
- #FB3D6A rosa (original): eyebrow, marcador, links, botão; 3.51:1 sobre branco (falha); corrigido para #D61F4A (5.06:1; sobre #FFF3D2 4.57:1)
- #25D366: botão WhatsApp; texto branco 1.98:1 (falha), corrigido para #053B1C (6.42:1)
- Textos em petróleo com `opacity .7` (rótulo "Próximo passo", aviso legal) davam #518693, 4.06:1; com `opacity .85` ficam 5.9:1

## Image Ratios
- Avatar da autora: 44x44px (1:1), raio 50%
- Nenhuma imagem de capa, nenhuma imagem no corpo. Cartões "Leia também" sem imagem.

## Component Tokens
- Raios: 999px (botões, nav, 13x), 22px (próximo passo e "sozinha"), 20px (caixa prática), 16px (leia também, 3x), 14px
- Sombras: botão `0 2px 4px rgba(251,61,106,.25), 0 8px 20px rgba(251,61,106,.30)` (tintada de rosa); cookie `0 8px 28px rgba(0,0,0,.28)`; nenhum card com sombra
- Bordas: "Próximo passo" 2px sólida #065264; byline e aviso legal 1px #E2F8F8
- Grade: 1 coluna; "Leia também" em 2 colunas a partir de 720px, gap 12px
- Botões: `.btn-buy` min-height 52px, padding 13px 28px; `.btn-wa` min-height 48px
- Foco `:focus-visible` amarelo 3px; `prefers-reduced-motion` respeitado; transições: nenhuma

---

# Taste DNA

### Coluna única, sem lateral e sem imagem no corpo
- **Trigger**: o artigo é lido no celular, de pé, por quem tem a criança por perto, em 2 a 3 minutos.
- **Decision**: uma coluna de 708px com corpo 17px/28px, sem sumário nem lateral, em vez de layout de blog com índice e fotos.
- **Reason**: quem lê assim não pode ter de decidir nada antes do texto.
- **Evidence**: `article` 708px, parágrafos 17px/28.05px; 0 imagens no corpo além do avatar de 44px; 322 a 576 palavras nos 9 artigos.

### Duas caixas suaves para separar a ação do resto
- **Trigger**: no meio da explicação o artigo precisa entregar algo que o pai possa fazer hoje.
- **Decision**: caixa amarela (#FFF3D2, "Na prática") e caixa turquesa (#E2F8F8, "Você não está sozinha") em vez de callouts com borda e ícone.
- **Reason**: quem lê pulando acha a ação pela cor do fundo, sem decodificar um ícone.
- **Evidence**: `.box-practice` raio 20px, padding 20px 22px, 7.92:1; `.sozinha` raio 22px, 7.93:1.

### Rosa só onde há clique
- **Trigger**: texto longo com links, lista e um único pedido final.
- **Decision**: rosa em eyebrow, `li::marker`, link e botão; petróleo no resto, em vez de turquesa para links e rosa só no botão.
- **Reason**: o leitor de texto longo procura o próximo clique; o rosa só aparece onde ele existe.
- **Evidence**: `a {color: var(--pink); font-weight: 800}`; botão com o mesmo rosa; rosa em 4 textos contra 38 em petróleo (extract.js); #FB3D6A 3.51:1 contra #D61F4A 5.06:1 sobre branco.

### Restrição: abrir sem imagem de capa
- **Trigger**: os cards de `/aprender` têm foto e o artigo poderia herdá-la como capa.
- **Decision**: abrir direto em h1 + byline + texto, em vez de imagem de capa.
- **Reason**: em 390px uma capa 16:9 empurra o primeiro parágrafo para fora da tela; a resposta vem primeiro.
- **Evidence**: h1 em y=166, 1o parágrafo em y=376 no desktop; 0 `img`/`table`/`details` em `<article>` além do avatar.

## O que mais varia entre os 9 artigos

Mesmo CSS, mesmo esqueleto. O que muda é o conteúdo: de 322 palavras (brincar-com-proposito-10-minutos) a 576 (e-para-todas-as-criancas); h2 de 2 (sinais-para-observar) a 5 (brincar..., e-para-todas...); lista em 6 dos 9 (3 a 5 itens; brincar-com-proposito-10-minutos, como-e-a-terapia-comportamental e conversar-com-a-escola não têm); todos têm 1 caixa "Na prática", 1 CTA de mapeamento, 1 bloco de WhatsApp e 1 aviso legal; nenhum tem imagem no corpo.

## Mudanças sugeridas (não aplicadas)

1. **Dois CTAs empilhados com pesos quase iguais no fim do artigo.** Evidência: "Próximo passo" (borda 2px, botão rosa, y=1574, 176px) e "Você não está sozinha" (fundo #E2F8F8, botão verde, y=1771, 175px) seguidos, e depois o rodapé com mais um bloco "Contato desta unidade" e botões de WhatsApp. Correção: um CTA primário (mapeamento) e o WhatsApp como link de texto, ou fundir as duas caixas.
2. **Linhas de ~83 caracteres no desktop.** Evidência: 708px de largura com corpo de 17px; a faixa confortável é 60-75. Correção: `max-width: 65ch` no texto (cerca de 600px) ou corpo de 18px.
3. **Texto de apoio pequeno e pálido onde há informação útil.** Evidência: breadcrumb 13.76px com opacity .75, byline com data e CRP em 14.7px/700 opacity .75, aviso legal 13.6px com opacity .7 (agora .85). Correção: piso de 14px e remover opacity em favor de cor sólida #3F6D79.
4. **Sem imagem de capa nem elemento de abertura, apesar de os cards de /aprender terem foto.** Evidência: card em /aprender com foto 259x145 e artigo com 0 imagens. Perde-se o reconhecimento visual entre lista e artigo. Correção: foto de 16:9 com `max-height: 220px` no mobile, abaixo do byline, para não empurrar o 1o parágrafo.
5. **Sem navegação dentro de artigos de 5 h2.** Evidência: e-para-todas-as-criancas tem 576 palavras e 5 h2 sem âncora; a página mobile de birra-ou-crise tem 5266px. Correção: lista de 'Neste guia' com 3 a 5 links no topo, só nos artigos com 4+ h2.
6. **"Leia também" sem imagem, cartões #F4FAFB de 16px de raio e título em 15.7px.** Evidência: `.lt-card b` 15.68px/800 sobre #F4FAFB, sem tag de categoria nem tempo de leitura. Correção: reaproveitar o card de /aprender (tag + tempo) para o leitor decidir o próximo guia.
