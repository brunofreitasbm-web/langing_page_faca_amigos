# Design Map

Fonte: http://localhost:8765/familia.html (institutofacaamigos.com.br/familia). Medições da versão original (antes das edições de contraste), 1440x900.

## Spacing Scale
- Valores (px): 6, 8, 10, 12, 14, 16, 18, 22, 26, 30, 36
- Valores medidos: 10px (11 usos), 16px (9), 8px (6), 22px (4), 12px (4), 18px (3), 14px (3), 30px (2). Gutter 20px, coluna 560px.

## Font Hierarchy
- h1: 40px / peso 400 / Fredoka One
- h2: 22px / peso 400 / Fredoka One
- botão/marca: 20px / peso 400 / Fredoka One
- título do passo: 17px / peso 700 / Nunito
- lista: 16px / peso 700 / Nunito
- ajuda: 15.5px / peso 700 / Nunito
- descrição do passo/hint: 15px / peso 600-700 / Nunito
- rodapé: 13.5px / peso 600 / Nunito

## Color Palette
- page-bg: #FFF9F1
- surface (cards, 50,7% da área): #FFFFFF
- header (21,4%): gradiente #E01560 > #032D37 > #1A3F35
- petrol-soft (caixa de ajuda, 13,6%): #E5F3F6
- text-primary: #032D37
- text-secondary: #425B53
- pink (botão; era #F0196B 4,15:1, agora 4,72:1): #E01560
- pink-dark (link de ajuda 5,03:1 sobre #E5F3F6): #C81158
- teal-dark (check; era #1FA893 2,97:1, agora 5,22:1): #137A6A
- yellow (número do passo, "· Família"): #FFE234

## Image Ratios
- logo símbolo: 1.11:1 (40x40)

## Component Tokens
- Raios: 14px; 18px (4 cards); 50% (número do passo); 999px (botão)
- Sombra: 0 6px 18px rgba(3,45,55,0.08) (3 cards, tinta petróleo)
- Sombra: 0 10px 26px rgba(240,25,107,0.36) (botão)
- Grid: container 560px, 1 coluna(s), gutter 20px. Coluna única de 560px, padding 0 20px; cards de passo 520x103px (5,05:1), gap 12px. Sem grid.

---

# Taste DNA

### Uma ação no topo, instrução depois
- **Trigger**: Quando a pessoa chega pelo QR da TV com o celular na mão e precisa entrar no portal
- **Decision**: Botão "Entrar no portal" (largura 520px, 64px de altura, 20px Fredoka One) imediatamente após o header, antes dos três passos, em vez de passos primeiro e botão no fim
- **Reason**: Quem já conhece o portal entra direto; quem não conhece rola e lê o passo a passo
- **Evidence**: botão em y≈240 de 1150; passos começam em y≈400; hint "toque na aba Família" a 10px do botão

### Passo a passo em cards numerados
- **Trigger**: Quando o acesso tem 3 etapas (aba, celular, SMS) e leitores são pais de crianças atendidas
- **Decision**: Três cards brancos de 520x103px com número amarelo de 38px, em vez de parágrafo corrido
- **Reason**: Cada etapa é um alvo de leitura de 2 linhas; o número amarelo marca onde está
- **Evidence**: cards 18px de raio, sombra 0 6px 18px rgba(3,45,55,0.08); num 38px, #FFE234 com #032D37 (13,6:1); gap 12px

### Restrição: sem navegação, sem imagem de conteúdo
- **Trigger**: Quando a página poderia reaproveitar o menu do site e fotos da clínica
- **Decision**: Só marca + h1 + botão + lista, com 1 imagem (logo 40px) e um único link externo extra (WhatsApp), em vez de menu e galeria
- **Reason**: É página de apoio de QR; qualquer saída a mais é um caminho para não entrar
- **Evidence**: 1 imagem: logo 40x40px; 0 itens de navegação; coluna de 560px

### Gradiente só no header
- **Trigger**: Quando o topo precisa carregar a marca sem repetir cor no resto
- **Decision**: Gradiente 120deg de rosa a petróleo a verde-escuro só no header (21,4% da área) e cartões brancos em creme abaixo, em vez de rosa em toda a página
- **Reason**: O rosa aparece uma vez como moldura e uma vez como botão; o corpo fica em tinta petróleo legível
- **Evidence**: header gradient 21,4% da área; fundo creme #FFF9F1 + cards #FFFFFF = 50,7%; texto sobre o rosa medido por pixel: 5,1:1 (amarelo) e 6,7:1 (branco) no pior ponto

## Mudanças sugeridas (não aplicadas)

1. **Sem foco visível no botão e no link**
   - Evidência: focusVisible=false: .btn só define :active; o link de WhatsApp não tem estilo de foco. Quem usa teclado ou controle de TV não vê onde está.
   - Correção proposta: Adicionar .btn:focus-visible, .help a:focus-visible { outline: 3px solid #032D37; outline-offset: 3px }.
2. **Instrução de "Família" aparece três vezes**
   - Evidência: Hint abaixo do botão ("toque na aba Família"), passo 1 ("Toque em Família") e o título "Família (SMS)" no texto do passo; a mesma orientação em y≈325, 426 e 451.
   - Correção proposta: Remover o hint do botão e deixar o passo 1; ou manter o hint e encurtar o passo.
3. **Coluna de 560px em desktop deixa 880px vazios**
   - Evidência: Em 1440px o conteúdo ocupa 560px (39%) e o header ocupa a largura toda; texto de 15px parece pequeno no meio da tela.
   - Correção proposta: Em min-width 900px subir o corpo para 17px e o botão para largura auto (máx. 360px) centralizado.
4. **Rodapé em 13,5px com endereço longo**
   - Evidência: footer 13,5px/600, 2 linhas, mais o link de cookies injetado; endereço é a única informação de localização e é o texto menor da página.
   - Correção proposta: Subir para 15px (igual à descrição dos passos).
5. **Lista "O que você encontra" depois da ajuda**
   - Evidência: As 6 vantagens (16px/700) ficam depois do bloco de ajuda e abaixo da dobra (y>830), enquanto o botão promete o portal sem dizer o que há dentro.
   - Correção proposta: Mover a lista para antes de "Como entrar" ou resumir em 3 itens abaixo do botão.
