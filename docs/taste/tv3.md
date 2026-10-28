# Design Map

Fonte: extract.js em 1440x900 (slide 1, versão original) e percurso dos 37 slides com a tecla seta direita. O palco de 1920x1080 aparece a 75% na captura; os px abaixo são os do palco.

## Spacing Scale
- Sem grade: 10px (17 usos) e 8px (10) dominam; 44px de margem lateral; 36px e 28px entre blocos
- Linhas do palco: cabeçalho 96px, conteúdo 1fr, rodapé 64px

## Font Hierarchy
- Fredoka One: 64px headline, 34px relógio, 26px marca
- Nunito: 30px subtexto, 28px título do cartão, 19px descrição, 17px contador, 15px rodapé e kicker, 14px subtítulo e HUD, 13.5px lista do comparativo, 13px selo
- Pesos 800 (11 usos), 400 (3), 700 (3), 900 (2), 600 (1)
- 9 tamanhos entre 13px e 64px; 8 deles abaixo de 24px

## Color Palette
- Cabeçalho #065264, palco #FFF9F1 (51.7%), fundo externo #0F2520
- Texto branco (10 usos), petróleo profundo #032D37 (3 usos), amarelo #FFE234 na headline
- Rosa #F0196B agora #E01560; verde-água #2ECFB5 (4.46:1 sobre #065264) agora #4FE0C8 no subtítulo (5.35:1)
- Verde WhatsApp #25D366 só no ponto 'ao vivo'

## Image Ratios
- Foto 1440x1920 (0.75:1) cortada em card de ~1374x636 (~2.16:1)
- Logo 460x416 (1.11:1) a 41px

## Component Tokens
- Raios: 999px (10 usos), 36px (card principal), 8px, 6px, 50%
- Sombras: 0 24px 60px rgba(3,45,55,0.22) no card; 0 4px 20px rgba(0,0,0,0.15) no cabeçalho
- Botão HUD: 14px, peso 800, padding 10px 18px
- Focus-visible ausente; reduced-motion não tratado

---

# Taste DNA

### Petróleo para a clínica, rosa só no selo
- **Trigger**: A sala de espera da clínica precisa soar mais calma e institucional que o playground vizinho
- **Decision**: Cabeçalho em petróleo #065264 e fundo #032D37, com rosa limitado ao selo 'Clínica' e ao kicker, em vez de repetir o creme e o rosa do playground
- **Reason**: Pais em consulta querem sobriedade; o rosa pequeno mantém o parentesco com a marca
- **Evidence**: cabeçalho #065264 (4.6% da área) com branco 8.75:1; rosa #F0196B sobre 13px: 4.15:1, agora #E01560 4.72:1; área de rosa na captura inicial: 0%

### Texto direto sobre foto de tela cheia
- **Trigger**: Cada um dos 36 slides precisa de foto real de sala/terapia e uma mensagem curta
- **Decision**: Foto ocupando o card inteiro com texto sobreposto sobre degradê, em vez de foto de um lado e texto em coluna
- **Reason**: A foto é a prova de que o espaço é acolhedor; a mensagem entra sem tirar área da imagem
- **Evidence**: headline 64px branco com text-shadow 0 4px 18px rgba(0,0,0,0.5); subtexto 30px/42px, largura máxima 76%; foto 1440x1920 (0.75:1) mostrada num card de ~1374x636 (~2.16:1): cerca de 35% da altura aparece

### Sem texto em movimento contínuo
- **Trigger**: Uma sala de espera com pais e crianças com sensibilidade sensorial
- **Decision**: Só troca de slide com fade (0.8s) e uma barra de progresso de 6px, em vez de ticker rolando ou vídeos
- **Reason**: Movimento constante no canto do olho cansa quem já está ansioso
- **Evidence**: transições: opacity/transform 0.8s cubic-bezier(0.2,0.8,0.2,1) e transform 12s ease-out na foto; barra de progresso 6px com width 0.1s linear; pulseLive 2s só no ponto verde de 10px

### Palco 1920x1080 escalado
- **Trigger**: A TV da clínica mostra a página em qualquer resolução
- **Decision**: Canvas fixo de 1920x1080 reduzido por transform em vez de layout fluido
- **Reason**: A composição (96px de cabeçalho, 64px de rodapé) não se desmonta em telas diferentes
- **Evidence**: grid-template-rows 96px 1fr 64px; faixa #0F2520 nas laterais em telas que não são 16:9; 14px e 13px reais na TV 1080p, sem ampliação

## Correções de contraste aplicadas (referência)

- --pink #F0196B para #E01560 (selo 'Clínica', kicker rosa e gradiente do mock: branco 4.15:1 para 4.72:1); --teal-dark #1FA893 para #137A6A
- Subtítulo do cabeçalho: #2ECFB5 para #4FE0C8 sobre #065264 (4.46:1 para 5.35:1)
- Percorri os 37 slides com a tecla seta direita e os resultados restantes são o cabeçalho do mock (branco e amarelo sobre gradiente rosa para petróleo, texto grande de 30px, acima de 3:1) e o HUD em transição de opacidade; conferidos na captura

## Mudanças sugeridas (não aplicadas)

1. **Telefone da recepção em 15px no rodapé**
   - Evidência: 'Recepção e dúvidas: (91) 99178-2027' com 15px peso 800 na faixa de 64px, a única informação de contato da tela; os 15px valem 1.4% da altura de 1080px
   - Correção proposta: Subir para 28px e colocar o número também no cabeçalho ou como rodapé de cada slide
2. **Slide comparativo com texto de 13px**
   - Evidência: tv-vs-list 13.5px e tv-vs-header 13px (#FFA8B6 e #A7F3D0) sobre caixas translúcidas na foto
   - Correção proposta: Limitar a 3 itens de 26px ou separar em dois slides
3. **Oito tamanhos de texto abaixo de 24px**
   - Evidência: 14px (8 usos), 13px, 15px, 17px, 18px: subtítulo, kicker, HUD, contador, selos; na TV 1080p são menos de 1.5cm de altura em 50 polegadas
   - Correção proposta: Piso de 22px para tudo que é permanente (subtítulo, kicker, contador); 14px só no HUD
4. **Foto retrato recortada em faixa horizontal**
   - Evidência: origem 1440x1920 em card de ~1374x636; só ~35% da altura aparece e o zoom de 12s reduz mais
   - Correção proposta: Gerar versões paisagem (16:9 ou 2:1) das fotos ou usar object-position por slide
5. **HUD sobre a borda da foto**
   - Evidência: bottom 74px e right 44px: cobre 28px do canto inferior do card quando aparece (captura)
   - Correção proposta: Subir o HUD para dentro do rodapé de 64px
