# Design Map

Fonte: http://localhost:8765/evento.html (versão original, antes das edições de contraste; estado renderizado: "Este encontro não está mais disponível"; hero, caixa de inscrição e sucesso lidos do CSS/HTML). Medido em 1440x900 (DOM e imagem) e 390x844. Os itens de rodapé, banner de cookies e logo vêm de arquivos compartilhados e são marcados como tal.

## Spacing Scale

Valores observados (px): 4, 6, 8, 10, 12, 14, 16, 18, 24, 28, 40, 48. Unidade base: 2px (sem grade rígida, valores de 7 e 9px aparecem em padding de botões).

- section padding 48px 0; hero padding 40px 0 44px; wrap 1120px, wrap-narrow 860px
- grid 2 colunas 1.15fr / .85fr (>=900px), gap 28px; .card padding 24px
- .tipo padding 14px 16px, gap 10px; .form-control padding 13px 16px
- botão de compra: min-height 56px, padding 14px 30px

## Font Hierarchy

- h1 do hero: Fredoka, 41.6px (clamp 1.7-2.6rem), peso 600 (Fredoka)
- h2 title: Fredoka, 30.4px (clamp 1.4-1.9rem), no estado erro 25.6px, peso 600 (Fredoka)
- promessa: Fredoka, 23.2px (clamp 1.15-1.45rem), peso 600 (Fredoka)
- corpo: Nunito, 17px / 27.2px, peso 400-700 (Nunito)
- .tipo .p / .note: Nunito, 13.4px / 13.1px, peso 400 (Nunito, opacity .85 / .8)
- código do voucher: Courier New, 25.6px, peso 900 (monospace)
- botão .btn-buy: Nunito, 17.3px (1.08rem), peso 800 (Nunito)

## Color Palette

- background: #FFFFFF / #F4FAFB / #065264 (petróleo 70.9% da área (areaPct 70.9))
- text: #065264 (8.75:1 sobre branco)
- accent-cta: #FB3D6A (3.51:1 texto branco (reprovado))
- .btn-wa: #25D366 (1.98:1 com texto branco (reprovado, estado oculto))
- ícone ✓ (teal): #07C5C8 (2.14:1 com branco (reprovado, estado oculto))
- erro: #B0143F (6.13:1 sobre #FFECF0)
- rodapé compartilhado: #065264 ("Clínica" rosa #FB3D6A sobre branco 3.51:1 (reprovado))

## Image Ratios

- capa: 16:9
- palestrante: 1:1 (72 x 72px, círculo)

## Component Tokens

- Raios: 999px (botões e tags, 12); 24px (cards, capa, promessa); 18px (.tipo, .quem .box); 14px (inputs, rodapé e cookies)
- Sombras: 0 1px 2px + 0 4px 14px rgba(6,82,100,.10) (cards); 0 2px 4px + 0 14px 38px rgba(6,82,100,.18) (capa); 0 2px 4px + 0 8px 20px rgba(251,61,106,.25/.30) (.btn-buy); 0 8px 20px rgba(37,211,102,.3) (.btn-wa)
- Grid: 2 colunas 1.15fr/.85fr >=900px (gap 28px), coluna da inscrição sticky top 84px; 1 coluna abaixo; container 1120px

---

# Taste DNA

### Caixa de inscrição presa ao scroll
- **Trigger**: Ao vender o ingresso numa página com promessa, benefícios e bio longos
- **Decision**: Escolheu coluna direita sticky (top 84px) com tipos, formulário e botão de 56px sempre à vista em vez de botão fixo no fim da página ou formulário só no rodapé
- **Reason**: o visitante decide lendo e não precisa voltar ao topo para comprar
- **Evidence**: .sticky position sticky top 84px; grid 1.15fr/.85fr; botão 56px

### Promessa em bloco petróleo antes dos benefícios
- **Trigger**: Ao abrir o corpo da página com a razão de participar
- **Decision**: Escolheu card petróleo de 24px com texto Fredoka 23.2px branco acima da lista em vez de parágrafo comum de descrição
- **Reason**: a promessa é o texto que mais pesa, então ganha o único bloco escuro da coluna
- **Evidence**: .promessa bg #065264 radius 24px padding 24px; texto clamp 1.15-1.45rem

### Escassez em texto e ponto, sem contador agressivo (restrição)
- **Trigger**: Ao informar vagas restantes e esgotado
- **Decision**: Escolheu ponto de 10px (turquesa, rosa, amarelo) mais frase curta em vez de relógio regressivo vermelho e selos de urgência
- **Reason**: a honestidade da agenda ("o número de vagas é o número real") sustenta a confiança
- **Evidence**: .escassez .dot 10px; .countdown 13.8px opacity .85

### Estados por cor em quatro blocos pequenos
- **Trigger**: Ao diferenciar quem vem e quem não vem ao encontro
- **Decision**: Escolheu dois boxes lado a lado, um turquesa claro (#E2F8F8) e um amarelo claro (#FFF3D2) em vez de lista única de público
- **Reason**: a comparação por cor deixa claro o que cabe a cada um
- **Evidence**: .quem .sim #E2F8F8; .quem .nao #FFF3D2; radius 18px

## Mudanças aplicadas

1. **Estado de erro com rodapé maior que o conteúdo.** Evidência: estado de erro de 1423px de altura: card com título e botão ocupa 190px, rodapé 830px. Correção proposta: manter, mas levar o visitante direto às próximas datas.
   - Status: **Adaptada.** Estado de erro ganhou botão primário "Ver próximas datas" para /eventos; o rodapé grande é compartilhado e não foi tocado.

2. **Fontes pequenas no formulário.** Evidência: .tipo .p 13.4px opacity .85; .note 13.1px opacity .8; form-label 13.8px. Correção proposta: mínimo de 14px e sem opacity.
   - Status: **Aplicada.** Mínimo 14,4px em .tipo .p, .note, label, countdown e consentimentos, sem opacity.

3. **Botão WhatsApp e sucesso dependem de estado oculto.** Evidência: .btn-wa tinha texto branco sobre #25D366 e o ícone ✓ branco sobre #07C5C8, só aparecem após inscrição. Correção proposta: validar os estados de sucesso com dados de teste.
   - Status: **Adaptada.** Cores dos estados já conformes (#053B1C no WhatsApp, #04414A no ✓); estados validados com API simulada no Playwright.

4. **Alvos de toque.** Evidência: 7 elementos de 44px ou menos a 1440px e 4 a 390px (botões ghost e links do menu). Correção proposta: min-height 44px nos controles.
   - Status: **Aplicada.** min-height 44px em nav, tipos e consentimentos (checkbox 22px); foco passou a petróleo em fundo claro (amarelo só em petróleo).

5. **Promessa sem separação clara do restante em 390px.** Evidência: card petróleo de 24px seguido de lista branca a 16px de distância. Correção proposta: aumentar o espaçamento para 28px.
   - Status: **Aplicada.** Promessa com margem de 28px.

6. **Hero sem call-to-action visível acima da dobra em celular.** Evidência: botão de compra só na caixa de inscrição, depois do hero e da capa 16:9. Correção proposta: repetir o botão no hero ou fixar uma barra com o preço.
   - Status: **Aplicada.** Botão primário "Garantir minha vaga" (#ev-hero-cta) no hero, só abaixo de 900px, vinculado à caixa de inscrição e ao tipo selecionado.
