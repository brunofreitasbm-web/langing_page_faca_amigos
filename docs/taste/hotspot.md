# Design Map

Fonte: alogin.html e login.html do conjunto hotspot (templates do hotspot MikroTik), referência principal 390x844 (mobile-first), conferidas em 1440x900. Medido com extract.js e conferido no screenshot, na versão original (antes das correções de contraste). O conjunto são seis telas com o mesmo kit: login (formulário), alogin (pós-login, versão longa), status, logout, error e rlogin (redireciona). Nas capturas locais aparecem os textos literais $(...); as fotos de alogin vêm de institutofacaamigos.com.br e ficam vazias sem rede.

## Spacing Scale
- login.html (mais usados): 10px (11x), 13px (8x), 16px (6x), 6px (4x), 14px (3x), 26px (2x), 20px (2x); card com padding 26px 22px e margens 20px entre blocos
- alogin.html: 10px (14x), 3px (12x), 6px (11x), 11px (11x), 9px (9x), 4px (8x), 14px (6x), 12px (6x); section padding 30px 0 4px; rodapé 34px 20px 40px
- error, logout, status: .wrap max-width 420px, padding 40px 18px; card padding 26px 20px; gap logo para card 20px; rlogin: coluna centralizada em 100vh, 14px entre logo e texto
- Sem base única (10, 11, 13, 9, 3 e 14px convivem); gutter 18 a 22px conforme a página
- Espaçamento por margin; gap só nos flex de listas

## Font Hierarchy
- login: h1 22px / 400 / Fredoka One / lh 25.3px; sub 14.5px / 400 / Nunito; label 13.5px / 800; input 16px / 400; botão 17px / 400 / Fredoka One; kicker 12px / 800; oferta 13px / 700; nota 12px
- alogin: h1 31.2px / Fredoka One / lh 34.3px; h2 19px; h3 20px; corpo 14.5px / 700; miúdos 10.5px (8x), 12px (6x), 12.5px (13x)
- error 15px / 800 (mensagem) e 14px; logout h1 20px e corpo 14.5px; status h1 19px, corpo 14px, link 13.5px / 800; rlogin 14px
- Pesos: 400 (só Fredoka), 600, 700, 800, 900; 8 tamanhos em login (12 a 22px), 12 em alogin (10.5 a 36px)
- Famílias: Nunito, Fredoka One; Arial só nos checkboxes e inputs ocultos (2 nós em login)

## Color Palette
- Fundo #FFF9F1; cartão do login #FFFFFF (73% da área); texto #1A3F35 sobre #FFF9F1 = 11.11:1; texto secundário #4C6B62 sobre #FFFFFF = 5.85:1
- Rosa de ação: antes #F0196B (4.15:1 com branco, 3.97:1 sobre creme), depois #E01560 (4.72:1 sobre branco, 4.52:1 sobre creme); #C81158 nos destaques de oferta = 5.71:1
- Teal #2ECFB5 (fundo do ícone de oferta, pills e avatar): texto antes branco (1.96:1), agora #1A3F35 = 5.93:1
- Teal de texto (kicker de login): antes #1FA893 sobre #E2F8F5 = 2.68:1, depois #137A6A (4.65:1 sobre #DEF7F3)
- Erro: antes #E83030 (4.29:1 sobre branco), depois #D32F2F (4.98:1)
- Estrelas de login: antes #FFE234 sobre branco (1.3:1), depois #9A6400 (5.0:1); preço riscado de alogin antes #B3A99C (2.31:1), depois #766B5E (5.20:1)
- Fundo dos cartões de unidade em alogin: de #2ECFB5 (texto branco 1.96:1) para #1A3F35 sob a foto (11.63:1); em alogin o fundo teal escuro #1FA893 ocupava 28.2% da área medida com as fotos ausentes
- Neutros tintados para o verde-escuro; sombras rgba(26,63,53,x) e rgba(240,25,107,.32 a .36)

## Image Ratios
- Logo circular 1.11:1 (460x416), 44px no login, 34px em alogin, 40px em status, error, logout e rlogin; oculta com onerror se faltar
- alogin: hero 3:4 (1440x1920) cobrindo 390x844; cartões de unidade 4:3 (350x263); fotos naturais 1.66:1, 0.98:1, 0.75:1
- login, status, error, logout, rlogin: sem fotos

## Component Tokens
- Raios: login 14px (6: campos e blocos), 999px (botão, kicker), 50% (ícones), 24px (card); alogin 999px (17), 50% (10), 22px (5), 17px, 11px, 20px; error, logout, status: card 24px, botão 999px
- Sombras: 0 18px 40px rgba(26,63,53,.14) no card; 0 4px 10px rgba(26,63,53,.08); 0 10px 26px rgba(240,25,107,.32) no botão rosa (login, logout, status); alogin adiciona 0 6px 16px rgba(46,207,181,.35) na pill
- Botões: login 306x52 (17px Fredoka); error 164x49; logout 180x51; status 354x53 (rosa), 354x57 (borda #E7E1D5 2px), 354x50 (link de texto 13.5px); alogin 350x54
- Campos de login: 306x50, borda do campo 14px, fonte 16px; checkboxes 20x20 com accent-color rosa; consent com rótulo 276x55
- Grade: coluna única, max-width 420px (status, error, logout), card de 350 a 380px no login; sem :focus-visible; movimento só em transitions de transform/background/border-color com cubic-bezier(0.34,1.4,0.64,1)
- Diferenças: error não tem h1 (só a mensagem $(error) em vermelho); logout tem h1 de 20px e botão com sombra rosa; status acrescenta barra de estado com ponto verde #28C880 e o tempo restante; rlogin é um aviso de uma linha com redirecionamento por meta refresh

---

# Taste DNA

### Cartão branco único sobre fundo creme, sem fotos no formulário (restrição)
- **Trigger**: O login é a única tela que o visitante precisa completar para ter Wi-Fi, num celular com sinal fraco e rede limitada.
- **Decision**: Colocaram o formulário em um card branco de 24px sobre #FFF9F1, sem foto, sem vídeo e sem segunda coluna, em vez de repetir o hero fotográfico da página de boas-vindas.
- **Reason**: Antes do login a rede ainda está fechada; foto pesada atrasa e o visitante quer o Wi-Fi, não uma galeria.
- **Evidence**: login.html tem 1 imagem (logo 44px) e 0 fotos; card #FFFFFF ocupa 73.4% da área; sombra única 0 18px 40px rgba(26,63,53,.14); alogin, depois do login, é a que carrega 4 fotos (hero 390x844 e três de 350x263).

### Um rosa para a ação e um para o texto de oferta
- **Trigger**: Na mesma tela convivem o botão de envio, o link da política, o destaque da oferta e o erro.
- **Decision**: Rosa saturado #E01560 só em botão, link de consentimento e wordmark; #C81158 mais escuro nas frases de oferta; vermelho #D32F2F reservado para erro, em vez de usar um só tom para tudo.
- **Reason**: O visitante distingue o que é clicável do que é aviso, e o erro não se confunde com a oferta.
- **Evidence**: botão rosa em 3.4% da área de login; "Meia inclusa fixa" em #C81158 (5.71:1 sobre branco); .field-error e .msg em #D32F2F; links e wordmark em #E01560 (4.72:1).

### Formulário curto de coluna única com campos de 50px
- **Trigger**: O cadastro vai ser preenchido em pé ou sentado, com um polegar, antes de a criança entrar.
- **Decision**: Três campos empilhados (nome, WhatsApp, e-mail) de 306x50px com fonte de 16px e botão de 306x52px, em vez de duas colunas ou de um formulário em etapas.
- **Reason**: 16px evita o zoom automático do iOS, 50px dá área de toque folgada e a coluna única mantém o caminho de leitura reto.
- **Evidence**: input 306x50, 16px, raio 14px; label 13.5px / 800 a 6px do campo; botão 306x52 com Fredoka 17px; checkboxes 20x20 com rótulo de 276x55.

### Mesmo kit em seis telas, com densidade proporcional ao peso da tela
- **Trigger**: O roteador serve seis páginas diferentes (login, alogin, status, logout, error, rlogin) e cada uma tem um peso de decisão distinto.
- **Decision**: Reutilizaram o mesmo kit (logo + wordmark Fredoka 18px com "Amigos" em rosa, card 24px, botão pílula 999px) e variaram só o conteúdo: telas de serviço (error, logout, status) em um card de 354px; telas de venda (alogin) em página longa, em vez de um layout próprio por tela.
- **Reason**: O visitante vê a mesma marca em cada estado do Wi-Fi e não precisa reaprender onde tocar.
- **Evidence**: .wrap de 420px, card padding 26px 20px, botão 15px Fredoka em error, logout e status; alogin com 2615px de altura (3.1 telas) contra 844px das demais; wordmark 18px/Fredoka repetido em todas.

## Mudanças sugeridas (não aplicadas)

1. **Marketing pré-marcado no cadastro.** Evidência: em login.html o segundo checkbox ("Quero receber novidades e cupons por WhatsApp e e-mail") vem marcado (checked = true) e o de privacidade desmarcado, medido no screenshot e no DOM. Correção: iniciar desmarcado (consentimento ativo), com decisão jurídica sobre LGPD antes de publicar.
2. **O botão de envio fica abaixo da primeira tela.** Evidência: em 390x844 o card tem 970px de altura e o botão ocupa y 912 a 964; quatro blocos de texto (kicker, h1, sub de 87px, dois itens de oferta) empurram o primeiro campo para y 519. Correção: encurtar o parágrafo e juntar as duas ofertas em uma linha, para o botão aparecer até y~800.
3. **Oferta repetida em 4 lugares.** Evidência: kicker "Cupom exclusivo + Wi-Fi grátis", parágrafo "cupom real para o Playground...", dois itens (R$ 50 e +5 min) e a nota final "Cupom válido por 15 dias..." dizem a mesma coisa em login.html. Correção: manter o kicker, os dois itens e a nota; cortar o parágrafo de 87px.
4. **alogin tem 2615px para uma tela de passagem.** Evidência: hero de 844px, cupom, tiles, três cartões de 263px, rota, e-books e rodapé; em alogin as fotos vêm de institutofacaamigos.com.br e, se o walled garden não liberar o domínio, sobram três blocos vazios de 350x263 (screenshot sem rede). Correção: cortar para hero + cupom + unidades em lista de 72px; confirmar o domínio no walled garden (arquivo de roteador, fora do escopo).
5. **Alvos de toque pequenos no rodapé e nos links.** Evidência: links de rodapé "Instagram" e "Privacidade" com 55x17 e 63x17 em alogin e 57x15 e 67x15 em status; "Abrir no navegador" 115x17; botão de saída em status com 13.5px. Correção: padding vertical de 8px para chegar a 32px de altura.
6. **Estados de erro e de saída sem hierarquia.** Evidência: error.html não tem título (só $(error) em 15px/800 vermelho sobre card de 220px de altura, sem ícone) enquanto logout usa h1 de 20px; status usa 13.5px para "restantes" e deixa 35% da tela vazia (conteúdo termina em y 545 de 844); na página de erro o texto de apoio é 14px/#4C6B62. Correção: h1 de 20px "Não foi possível conectar" acima da mensagem do roteador e tempo restante em 22px em status.
