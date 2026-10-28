# Design Map

Fonte: http://localhost:8765/ingresso.html (versão original, antes das edições de contraste; estado renderizado: "Este link não é válido"; demais estados lidos do CSS/HTML). Medido em 1440x900 (DOM e imagem) e 390x844. Os itens de rodapé, banner de cookies e logo vêm de arquivos compartilhados e são marcados como tal.

## Spacing Scale

Valores observados (px): 6, 8, 10, 12, 14, 16, 18, 28, 64. Unidade base: 2px (sem grade rígida, valores de 7 e 9px aparecem em padding de botões).

- main: max-width 560px, padding 28px 16px 64px
- .card: padding 28px 22px, centralizado; .meta padding 14px 16px, gap 6px
- .acoes: gap 10px, margin-top 18px; .comunidade padding 16px 18px
- .qr: 232 x 232px, padding 10px, borda 2px tracejada turquesa

## Font Hierarchy

- h1: Fredoka, 24px (1.5rem), peso 600 (Fredoka)
- h2 comunidade: Fredoka, 19.2px (1.2rem), peso 600 (Fredoka)
- posição na fila: Fredoka, 41.6px (2.6rem), peso 900 (Fredoka)
- corpo: Nunito, 17px / 27.2px, peso 400 (Nunito)
- código do voucher: Courier New, 25.6px (1.6rem), letter-spacing .06em, peso 900 (monospace)
- botão .btn: Nunito, 16.3px (1.02rem), min-height 52px, peso 800 (Nunito)
- status e hint: Nunito, 13.1px / 13.4px, peso 800 / 400 (Nunito)

## Color Palette

- background: #F4FAFB (gelo)
- text: #065264 (8.75:1 sobre branco)
- erro (.err, .status.bad): #B0143F (6.13:1 sobre #FFECF0)
- check-in: #0A7D5B (5.13:1 sobre branco)
- accent-cta (.btn): #FB3D6A (3.51:1 texto branco (reprovado))
- .btn.wa (WhatsApp): #25D366 (1.98:1 texto branco (reprovado, estado oculto))
- status aviso / sucesso: #FFF3D2 / #E2F8F8 (texto petróleo, 10:1 ou mais)

## Image Ratios

- QR code: 1:1 (232 x 232px)
- logo no header: 6.97:1

## Component Tokens

- Raios: 24px (.card, .modal .box); 999px (.btn, .status); 18px (.comunidade); 16px (.meta, .qr)
- Sombras: 0 1px 2px + 0 4px 14px rgba(6,82,100,.10) (.card); 0 2px 4px + 0 8px 20px rgba(251,61,106,.25/.30) (.btn); 0 8px 28px rgba(0,0,0,.28) (banner de cookies, compartilhado)
- Grid: coluna única de 560px; botões empilhados em grid com gap 10px

---

# Taste DNA

### Ingresso como um cartão único com estados trocados
- **Trigger**: Ao servir 6 situações (carregando, inválido, confirmar vaga, ingresso, fila, cancelado) numa só URL
- **Decision**: Escolheu reutilizar um card branco de 24px e trocar apenas o conteúdo interno em vez de uma página por situação ou um fluxo com passos
- **Reason**: o participante abre o link do e-mail e vê só o que vale para ele
- **Evidence**: 6 blocos .card com hidden; padding 28px 22px em todos

### QR e código como protagonistas, sem decoração (restrição)
- **Trigger**: Ao exibir o voucher que será lido na porta
- **Decision**: Escolheu QR de 232px em caixa branca com borda tracejada e código em Courier 25.6px 900 em vez de fundo colorido, ilustração ou texto de marketing ao redor
- **Reason**: na porta o QR precisa de fundo branco e margem, e o código deve ser lido em voz alta sem ambiguidade
- **Evidence**: .qr 232x232, padding 10px; .codigo 1.6rem monospace

### Hierarquia de botões por risco
- **Trigger**: Ao oferecer confirmar, agendar, ver agenda e cancelar
- **Decision**: Escolheu rosa sólido para a ação principal, contorno petróleo para secundárias, contorno vinho (#B0143F) para cancelar em vez de todos em rosa sólido
- **Reason**: a ação destrutiva fica visível mas sem peso de ação principal
- **Evidence**: .btn #FB3D6A; .btn.ghost borda 2px petróleo; .btn.danger borda 2px #B0143F; min-height 52px

## Mudanças aplicadas

1. **Página fixa em 900px sem rodapé.** Evidência: docH 900px (= viewport), footerTop null; o estado de erro termina em card de 243px e deixa 500px vazios. Correção proposta: manter, mas oferecer contato por WhatsApp além do e-mail no estado inválido.
   - Status: **Adaptada.** Estado inválido ganhou WhatsApp (91) 99178-2027 além do e-mail (número do Instituto/Clínica; confirmar).

2. **Hint pequeno.** Evidência: .hint 13.4px com opacity .8, instrução de entrada no evento ("Mostre o QR..."). Correção proposta: 14-15px e opacity 1; é a instrução mais importante do dia do evento.
   - Status: **Aplicada.** .hint 15,2px, peso 700, sem opacity.

3. **Estados de loading sem animação.** Evidência: "Abrindo seu ingresso…" é só texto, 24px, sem indicador. Correção proposta: adicionar indicador de carregamento discreto.
   - Status: **Aplicada.** Spinner discreto no carregamento (sem animação em reduced-motion; role=status).

4. **Botão de cancelar sem confirmação visual no fluxo.** Evidência: .btn.danger está no mesmo grid dos demais, com altura 52px idêntica. Correção proposta: separar com 18px a mais ou usar link de texto; o modal existe, mas o botão está colado nos outros.
   - Status: **Aplicada.** Botão de cancelar separado com 18px a mais de margem.

5. **Status em pílula de 13px.** Evidência: .status 13.1px, padding 6px 14px, é o único aviso da situação do ingresso. Correção proposta: subir para 14px e colocar acima do h1 com mais respiro.
   - Status: **Aplicada.** Status em 14,4px com padding maior e 18px de respiro abaixo; foco visível em petróleo.
