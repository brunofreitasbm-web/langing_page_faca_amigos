# Design Map

Fonte: http://localhost:8765/descadastrar.html (versão original, antes das edições de contraste; estado renderizado: "Este link não é válido"). Medido em 1440x900 (DOM e imagem) e 390x844. Os itens de rodapé, banner de cookies e logo vêm de arquivos compartilhados e são marcados como tal.

## Spacing Scale

Valores observados (px): 6, 8, 10, 16, 18, 22, 28, 40, 64. Unidade base: 2px (sem grade rígida, valores de 7 e 9px aparecem em padding de botões).

- main: max-width 520px, padding 40px 16px 64px, text-align center
- .card: padding 28px 22px; h1 margin 0 0 12px; p margin 0 0 16px
- header: padding 18px 16px, logo 170px centralizado
- .dots: gap 8px, bolinhas 12px, margin-bottom 16px

## Font Hierarchy

- h1: Fredoka, 25.6px (1.6rem), peso 600 (Fredoka)
- corpo: Nunito, 17px / 27.2px, peso 400 (Nunito)
- botão "Sim, descadastrar": Nunito, 18.4px (1.15rem), min-height 56px, peso 800 (Nunito)
- links: Nunito, 17px, peso 800 (Nunito)

## Color Palette

- background: #F4FAFB (gelo)
- text: #065264 (8.75:1 sobre o card branco)
- accent-cta: #FB3D6A (3.51:1 texto branco (reprovado))
- pontos decorativos: #FDC51D / #07C5C8 / #FB3D6A (12px, sem texto)
- rodapé compartilhado: #065264 (76.2% da área (areaPct 76.2))

## Image Ratios

- logo no header: 6.97:1

## Component Tokens

- Raios: 24px (.card); 999px (botão); 50% (pontos); 14px (rodapé e cookies)
- Sombras: 0 1px 2px + 0 4px 14px rgba(6,82,100,.10) (.card, 2 camadas); 0 2px 4px + 0 8px 20px rgba(251,61,106,.25/.30) (botão, 2 camadas)
- Grid: coluna única de 520px, centralizada

---

# Taste DNA

### Uma ação por tela
- **Trigger**: Ao confirmar uma saída de lista de e-mails
- **Decision**: Escolheu mostrar um card com título, uma frase e um único botão de 56px em vez de pesquisa de motivo, opções de frequência ou rodapé de marketing
- **Reason**: quem pede para sair quer terminar em um toque; perguntas extras irritam
- **Evidence**: card 520px com 1 botão (min-height 56px, 18.4px 800); 3 estados (ask, done, bad) de um bloco só cada

### Sem ênfase de alerta (restrição)
- **Trigger**: Num fluxo de cancelamento com ação irreversível
- **Decision**: Escolheu usar o mesmo rosa do restante do site no botão e nenhum vermelho de perigo em vez de botão vermelho, ícone de alerta, confirmação dupla
- **Reason**: a ação é de baixo risco (voltar a assinar é fácil) e o texto já avisa o que muda
- **Evidence**: botão #FB3D6A igual ao dos termos; 0 ícones de alerta

### Três pontos de marca como único ornamento
- **Trigger**: Ao dar identidade ao card sem imagem
- **Decision**: Escolheu 12px amarelo, turquesa e rosa acima do título em vez de ilustração ou logo repetido dentro do card
- **Reason**: a marca aparece sem competir com a ação
- **Evidence**: .dots 3 x 12px, gap 8px; areaPct decorativo ~0

## Mudanças aplicadas

1. **Estado de erro sem saída.** Status: aplicada. Botão "Voltar para o site" (/) no estado inválido.
2. **Sem ação para desistir.** Status: aplicada. Link "Manter minha inscrição" (/guia; /eventos no fluxo de eventos) ao lado do botão primário.
3. **Texto denso.** Status: aplicada. Card alinhado à esquerda, consequência dividida em dois parágrafos (também no fluxo de eventos).
4. **Rodapé completo.** Status: descartada. Depende de assets/fa-footer.js (compartilhado).
5. **Botão desabilitado com opacity .6.** Status: aplicada. Cor cheia, spinner CSS (estático em reduced-motion) e cursor progress; card com aria-live.
6. **Extras.** Foco em petróleo (amarelo tinha 1.6:1 sobre branco).
