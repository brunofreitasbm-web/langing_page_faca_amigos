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

## Mudanças sugeridas (não aplicadas)

1. **Estado de erro sem saída.** Evidência: "Este link não é válido" só tem o e-mail como caminho, sem botão (screenshot: card sem CTA). Correção proposta: adicionar um botão "Voltar para o site" no estado inválido.
2. **Sem ação para desistir.** Evidência: o estado ask não oferece "Manter inscrição" ao lado de "Sim, descadastrar". Correção proposta: incluir ação secundária de cancelar/voltar.
3. **Texto de consequência denso.** Evidência: parágrafo de 3 linhas a 17px em 476px úteis, centralizado. Correção proposta: alinhar à esquerda e quebrar em duas frases curtas.
4. **Rodapé completo em página de uma ação.** Evidência: rodapé de ~830px abaixo de um card de 230px (footerTop 420px, página de 1251px). Correção proposta: rodapé compacto (arquivo compartilhado).
5. **Botão desabilitado com opacity .6.** Evidência: button[disabled] opacity .6 dá um rosa lavado sem texto de progresso além de "Enviando...". Correção proposta: manter cor cheia e mostrar um indicador de progresso.
