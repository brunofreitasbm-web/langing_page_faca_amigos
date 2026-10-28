# Design Map

Fonte: http://localhost:8765/eventos.html (versão original, antes das edições de contraste; estado renderizado: erro ao carregar a agenda; cards lidos do CSS/JS). Medido em 1440x900 (DOM e imagem) e 390x844. Os itens de rodapé, banner de cookies e logo vêm de arquivos compartilhados e são marcados como tal.

## Spacing Scale

Valores observados (px): 4, 6, 7, 8, 10, 14, 16, 18, 22, 28, 44, 52, 56. Unidade base: 2px (sem grade rígida, valores de 7 e 9px aparecem em padding de botões).

- section: padding 56px 0; hero padding 44px 0 52px; wrap 1120px, gutter 16px
- cards: gap 18px, .body padding 18px 20px 20px, gap 10px; tag padding 4px 11px
- steps: gap 16px, padding 22px; botões padding 12px 26px (52px) e 10px 22px (48px)
- trilhas (filtros) gap 8px, padding 10px 20px

## Font Hierarchy

- h1: Fredoka, 44.8px (clamp 1.9-2.8rem), peso 600 (Fredoka, letter-spacing -.224px)
- h2 title: Fredoka, 36.8px (clamp 1.6-2.3rem), peso 600 (Fredoka)
- h3 dos cards: Fredoka, 19.2px (1.2rem), peso 600 (Fredoka)
- corpo / .lead: Nunito, 17.6px / 28.16px (lead 17.6px), peso 400 (Nunito, max-width 640px)
- .card .desc: Nunito, 15.2px, peso 400 (Nunito)
- tag: Nunito, 12.2px (.76rem), peso 800 (Nunito)
- eyebrow: Nunito, 12.8px, letter-spacing .12em, caixa alta, peso 800 (Nunito)

## Color Palette

- background: #FFFFFF / #F4FAFB (branco e gelo alternados)
- hero e rodapé: #065264 (56% da área (areaPct 56), texto branco 92%: 8.75:1)
- text: #065264 (8.75:1 sobre branco)
- accent-cta (.btn-buy, .go): #FB3D6A (3.51:1 / 3.51:1 (reprovado em "Clínica" do rodapé))
- tag.gray: #7A8A90 (3.18:1 sobre #EEF2F3 (reprovado, estado oculto))
- passo 2 (texto petróleo sobre #07C5C8): #065264 (4.10:1 (texto grande, abaixo da meta de 4.5))
- tag.pink / tag.yellow: #B0143F / #7A5A00 (6.13:1 e 5.78:1)

## Image Ratios

- capa do card: 16:9
- logo no header: 6.97:1

## Component Tokens

- Raios: 999px (botões, tags, filtros, 17); 24px (cards, steps); 16px (ícones dos passos); 14px (rodapé e cookies)
- Sombras: 0 1px 2px + 0 4px 14px rgba(6,82,100,.10) (cards); 0 2px 4px + 0 14px 38px rgba(6,82,100,.18) (hover); 0 2px 4px + 0 8px 20px rgba(251,61,106,.25/.30) (.btn-buy)
- Grid: 3 colunas >=1000px, 2 colunas >=720px, 1 coluna abaixo (gap 18px); passos em 3 colunas; container 1120px

---

# Taste DNA

### Agenda dirigida por filtro de duas trilhas
- **Trigger**: Ao listar encontros para dois públicos distintos (famílias e profissionais)
- **Decision**: Escolheu filtros em pílulas de 2px de borda (Todos, Para famílias, Para profissionais) acima dos cards em vez de abas separadas ou duas páginas
- **Reason**: o visitante se identifica com um toque e a lista segue na mesma URL
- **Evidence**: .trilhas button padding 10px 20px, 15.2px 800, aria-pressed; 3 botões

### Hero petróleo, agenda em gelo, passos em branco (alternância de fundo)
- **Trigger**: Ao separar blocos numa página sem linhas divisórias
- **Decision**: Escolheu trocar cor de fundo entre seções (petróleo, gelo, branco) com padding 56px em vez de filetes ou espaços iguais no mesmo fundo
- **Reason**: a mudança de cor marca o fim de cada ideia sem linha
- **Evidence**: sections: .bg-petrol 56% da área, .bg-ice, branco; padding 56px 0

### Estados das tags por cor semântica restrita (restrição)
- **Trigger**: Ao indicar vagas, esgotado e encerrado
- **Decision**: Escolheu só 4 tags (padrão, rosa, amarela, cinza), todas com pílula de 12px e texto escuro em vez de selo colorido de alto contraste, barra de progresso de vagas
- **Reason**: a tag informa sem virar um segundo botão
- **Evidence**: .tag 12.2px 800, radius 999px; 4 variantes

### Rosa só em ação e destino
- **Trigger**: Entre muitas cores de marca (rosa, turquesa, amarelo)
- **Decision**: Escolheu rosa em .btn-buy, no link "Ver" (.go) e no passo 3 em vez de rosa em tags e títulos
- **Reason**: mantém o olho no clique de inscrição
- **Evidence**: .btn-buy bg rosa 52px; .go rosa; areaPct do rosa ~0

## Mudanças sugeridas (não aplicadas)

1. **Falha de carregamento sem saída.** Evidência: estado de erro: "Não foi possível carregar a agenda agora" em texto de 17px, sem botão de tentar de novo (screenshot, y~617). Correção proposta: botão "Tentar de novo" e contato por e-mail.
2. **Texto pequeno nas tags e eyebrow.** Evidência: tags de 12.2px e eyebrow de 12.8px; 4 nós abaixo de 13px. Correção proposta: tags a 13px, eyebrow a 13px.
3. **Alvos de toque abaixo de 44px.** Evidência: 7 elementos de 44px ou menos (botões ghost e filtros) a 1440px, 4 a 390px. Correção proposta: garantir min-height 44px nos filtros.
4. **Hero com 3 selos sem hierarquia.** Evidência: 3 pílulas (.seal) de 14px lado a lado, sem ordem de importância. Correção proposta: destacar "Vagas limitadas de verdade" como diferencial e reduzir os outros.
5. **Rodapé com contato local duplicado.** Evidência: bloco "Contato desta unidade" repete a Clínica 2 vezes (bloco branco e rodapé, 2467px de página). Correção proposta: escolher um dos dois.
6. **Passos numerados com ícones coloridos sem vínculo com a cor de ação.** Evidência: quadrados de 52px em amarelo, turquesa e rosa; só o 3 é a cor de ação. Correção proposta: usar uma única cor para os 3 números.
