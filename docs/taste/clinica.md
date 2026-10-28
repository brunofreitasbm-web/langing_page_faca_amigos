# Design Map

## Spacing Scale
- Valores mais usados: 8px (67), 10px (56), 12px (39), 14px (31), 4px (29), 18px (28), 16px (25), 24px (25)
- Padding de seção: 84px desktop, 64px mobile; mural 64px
- Gap de grid: 16px (services, 3 colunas de 354,66px)
- Base declarada 8px, mas 10, 14, 18, 26 e 9px aparecem em volume (escala não estrita)

## Font Hierarchy
- h1 51,2px / 58,9px, Fredoka One 400 (32px no mobile)
- h2 41,6px, Fredoka One 400 (28,8px no mobile)
- h3 20,8px; h4 18,4px 700
- Lead/body 18,4px Nunito 600; card 15,36px; passos 12px; rótulos dt 11,84px 900 caixa-alta

## Color Palette
- Fundo: #FFFFFF 66,2%, #FFF9F1 11,1%, #065264 13,2%, #E3F8F4 3,3%
- Texto: #1A3F35 (11,11:1 no creme), #4C6B62 (5,85:1 no branco), #065264 (8,75:1 no branco)
- CTA: #E01560 (4,72:1 com branco; era #F0196B 4,15:1)
- WhatsApp: fundo #25D366, texto #053B1C (6,42:1; era branco 1,98:1)
- Destaque: #FFE234 sobre #065264 (6,75:1); teal de texto #137A6A (5,22:1)

## Image Ratios
- Fotos do ambiente: 3:4 natural (1440x1920), exibidas em ~349x260 (cortadas para ~4:3)
- Logo: 5,81:1

## Component Tokens
- Raios: 9999px botões, 999px chips, 24px cards, 18px/20px/14px/16px internos, 50% ícones, 40px mural
- Sombras: 0 4px 10px rgba(26,63,53,.08); CTA 0 10px 26px rgba(240,25,107,.32); WhatsApp 0 10px 26px rgba(37,211,102,.35)
- Botões: mín. 48px de altura (54px no hero), padding 15px 30px
- Grid: 3 colunas, gap 16px, 10 grids na página
- Foco: :focus-visible com outline 3px teal; prefers-reduced-motion respeitado

---

# Taste DNA

### Acento quase invisível em área, forte em função
- **Trigger**: Quando a página precisava de uma única ação (entrar na lista de espera) em 6 seções de conteúdo.
- **Decision**: Reservar o rosa só para o CTA principal e os números do mural, em vez de usar a cor de marca em faixas ou títulos.
- **Reason**: Quem chega com dúvida sobre o filho precisa achar o botão sem procurar; se tudo fosse colorido, o botão não se destacaria.
- **Evidence**: rosa #F0196B (hoje #E01560) em 0,3% da área; WhatsApp #25D366 em 0,3%; amarelo #FFE234 em 0,4%; branco 66,2% e creme 11,1% da superfície

### Sombra única, tingida de verde
- **Trigger**: Quando 38 elementos (cards, chips, passos) precisavam sair do fundo creme/branco.
- **Decision**: Uma só sombra rgba(26,63,53,.08) 0 4px 10px, na cor do texto, em vez de preto neutro ou bordas.
- **Reason**: A elevação mínima separa blocos sem criar a sensação de painel de software numa página sobre acolhimento.
- **Evidence**: 0 4px 10px rgba(26,63,53,.08) x38; apenas CTA e WhatsApp têm sombra colorida (0 10px 26px); cards 24px de raio sem borda

### Fonte display arredondada contra corpo em peso alto
- **Trigger**: Quando o texto precisava soar acolhedor para pais e ainda ser legível em blocos longos.
- **Decision**: Fredoka One só em h1-h3 (51,2 / 41,6 / 20,8px, peso 400) e Nunito 600 a 900 no resto, em vez de uma família única.
- **Reason**: O traço redondo dá o tom infantil nos títulos; o Nunito em 600 mantém parágrafos de 15 a 18px legíveis.
- **Evidence**: 2 famílias apenas; body 18,4px/29,44px peso 600; pesos 600 (78), 400 (65), 800 (39), 900 (36), 700 (30)

### Ritmo alternado com um único bloco escuro
- **Trigger**: Quando 10 seções empilhadas (4576px só no bloco de serviços/ambiente) arriscavam virar uma parede branca.
- **Decision**: Padding vertical de 84px (64px no mobile), alternando branco e creme, e uma só faixa petróleo #065264 de raio 40px (mural).
- **Reason**: A alternância marca onde um assunto termina; o bloco escuro único sinaliza que o portal é outra coisa, não mais um serviço.
- **Evidence**: padding 84px desktop / 64px mobile; petróleo 13,2% da área; mural 1375px desktop e 2736px mobile; gap entre seções 30px nas bordas do mural

## Mudanças sugeridas (não aplicadas)

1. **Mural da Família interrompe o funil de lista de espera**
   - Evidência: 1375px no desktop e 2736px no mobile (16% dos 17141px da página), colocado antes da bio e do FAQ; fala com famílias que já são clientes, enquanto a página diz 'Em breve'.
   - Correção proposta: Mover o bloco para depois do FAQ ou reduzi-lo a um card de 3 linhas com o botão do portal.
2. **Serviços com três parágrafos rotulados por card**
   - Evidência: 7 cards, cada um com 'Pra quem é / O que acontece / O que muda pra você'; no mobile a seção que reúne serviços, sinais e ambiente soma 7923px (desktop 4576px).
   - Correção proposta: Mostrar só 'Pra quem é' e uma linha; abrir o resto num <details>.
3. **Rótulos abaixo de 12,8px em caixa-alta e peso 900**
   - Evidência: 21 dt a 11,84px, 3 'Passo N' a 12px e 11 eyebrows a 11,52px no mobile.
   - Correção proposta: Subir para 12,8px no mínimo, ou tirar a caixa-alta.
4. **Contato duplicado antes do rodapé**
   - Evidência: Card 'Contato desta unidade' (233px) repete o WhatsApp (91) 99178-2027 e o endereço que o rodapé compartilhado mostra logo abaixo.
   - Correção proposta: Remover o card local ou o cartão da Clínica no rodapé.
5. **Fotos do ambiente cortadas e sem pintar na captura**
   - Evidência: 3 imagens 1440x1920 (3:4) em caixas de 349x260; na captura full-page as três caixas ficaram em branco (carregamento lazy não completou).
   - Correção proposta: Usar aspect-ratio 3/4 ou 4/5 com object-fit: cover e checar o loading=lazy abaixo da dobra.
6. **CTA principal quebra em duas linhas no mobile**
   - Evidência: 'Entrar na lista de espera no WhatsApp' mede 346x70px (duas linhas) no mobile, contra 54px de altura no desktop; o ghost ao lado fica com 342x54px, e o CTA aparece 3 vezes (hero, FAQ, fim).
   - Correção proposta: Encurtar para 'Entrar na lista de espera' e manter o ícone do WhatsApp.
