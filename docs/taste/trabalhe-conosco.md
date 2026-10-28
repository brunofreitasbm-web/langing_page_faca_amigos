# Design Map

## Spacing Scale
- Valores mais usados: 10px (26), 8px (23), 6px (19), 14px (19), 13px (14), 9px (12), 16px (6)
- Hero: padding 48px 0 56px (mobile) e 64px 0 88px (desktop); form-sec 40px 0 72px
- Cartão: padding 28px 20px (mobile) e 36px (desktop); gap entre campos 14px
- Sem escala em 8px: 6, 9, 10, 13 e 14px dominam

## Font Hierarchy
- h1 44,8px Fredoka One 400 (30,4px no mobile)
- h2 28,8px (22,4px no mobile)
- Botão 16,8px Nunito 800; campos 16px 700
- Texto de apoio 14,72px (24 elementos, o tamanho mais frequente); consentimento 12,8px

## Color Palette
- Hero #1A3F35 para #265548; página #FFF9F1; cartão #FFFFFF
- Texto #1A3F35 (11,63:1 no branco), #4C6B62 (5,85:1)
- CTA #E01560 (4,72:1; era #F0196B 4,15:1); link #137A6A (5,22:1; era #1FA893 2,97:1)
- Placeholder #757575 (4,61:1); eyebrow #FFE234 sobre escuro (8,96:1)

## Image Ratios
- Só o logo (6,97:1, 237px de largura no topo, 279px no rodapé)

## Component Tokens
- Raios: 24px cartão, 14px campos, 16px passos, 999px chips, 9999px botão
- Sombras: 0 18px 40px rgba(26,63,53,.14); 0 4px 10px rgba(26,63,53,.08); botão 0 10px 26px rgba(240,25,107,.32)
- Campos: min-height 50px, borda 2,5px rgba(26,63,53,.12), foco teal com anel 4px
- Layout: wrap 1120px, cartão 560px, 1 coluna
- Foco: :focus-visible com outline 3px teal; prefers-reduced-motion respeitado

---

# Taste DNA

### Uma coluna, uma ação
- **Trigger**: Quando a página precisava captar candidatos de seis áreas (Saúde, Educação, Operação) em um só fluxo.
- **Decision**: Cartão único de 560px com um só botão de envio, em vez de lista de vagas, filtros ou páginas por cargo.
- **Reason**: Quem se candidata quer entrar no processo; um formulário só evita decidir entre vagas antes de enviar o currículo.
- **Evidence**: cartão max-width 560px; 1 botão (488x53px, #E01560); 8 campos em 1364px de altura de seção; página inteira com 2 títulos (h1 44,8px e h2 28,8px)

### Cartão sobreposto ao hero como único ponto de elevação
- **Trigger**: Quando o hero escuro e o fundo creme precisavam se ligar num fluxo de rolagem curto.
- **Decision**: Cartão branco subindo 56px sobre o hero com a única sombra grande da página, em vez de hero e formulário em faixas separadas.
- **Reason**: A sobreposição indica que o formulário é o destino do hero; o resto da página fica plano.
- **Evidence**: margin-top -56px (-36px no mobile); sombra 0 18px 40px rgba(26,63,53,.14); raio 24px; demais blocos só 0 4px 10px .08

### Pastilhas coloridas só como numeração
- **Trigger**: Quando os 3 passos pós-envio precisavam de ordem visual sem virar uma segunda seção.
- **Decision**: Círculos de 30px em amarelo, teal e rosa com texto escuro (rosa com branco), em vez de numerais iguais ou ícones.
- **Reason**: Três cores seguem a ordem 1-2-3 e retomam a paleta do hub sem espalhar cor pela página.
- **Evidence**: b.n 30x30px, raio 50%; #FFE234, #2ECFB5, #E01560; cor de marca em ~1% da área (rosa 1%, teal 1,5%, amarelo 1,2%)

### Cabeçalho verde-escuro herdado das páginas internas
- **Trigger**: Quando a página precisava seguir o padrão 'topbar' das páginas internas e ainda usar o rodapé compartilhado.
- **Decision**: Topbar e hero em #1A3F35 com o rodapé compartilhado em petróleo #065264, em vez de uma só cor escura.
- **Reason**: Reaproveitar o padrão pronto custa menos manutenção, ao preço de dois tons escuros na mesma página.
- **Evidence**: topbar #1A3F35, hero gradiente #1A3F35 para #265548; rodapé #065264 (captura); tnav 14,72px com 40px de altura mínima

## Mudanças sugeridas (não aplicadas)

1. **A página fala de vagas e não mostra nenhuma**
   - Evidência: Hero promete vagas em Psicologia ABA, TO, Fono, Fisioterapia, Recepção, Mediadores e Operacional, mas a página tem só h1, h2 e o formulário (2706px); a escolha da área vem no 6º campo.
   - Correção proposta: Listar as áreas abertas (nome, regime CLT/PJ/Estágio, unidade) acima do formulário, em 3 a 6 linhas.
2. **O que acontece depois do envio aparece abaixo do botão**
   - Evidência: Os 3 passos (teste de perfil em até 7 dias, resposta do RH) ficam em 1455px de rolagem, depois do botão 'Enviar candidatura'.
   - Correção proposta: Levar o passo do teste de perfil para o hero ou para o topo do cartão.
3. **Seletor de arquivo em inglês e sem estilo**
   - Evidência: Na captura, o campo de currículo mostra 'Choose File / No file chosen' do navegador, no meio de um formulário em português com campos de 50px e raio 14px.
   - Correção proposta: Estilizar ::file-selector-button e usar um texto de apoio em português.
4. **Texto de apoio pequeno**
   - Evidência: 14,72px em 24 elementos; consentimento em 12,8px; chips do hero em 14,72px.
   - Correção proposta: Subir o texto de apoio para 16px e o consentimento para 14px.
5. **Formulário longo para uma primeira etapa**
   - Evidência: 8 campos (nome, e-mail, WhatsApp, curso, área, unidade, tipo, currículo) em 1364px no desktop e 1497px no mobile, quando o teste de perfil já coleta dados depois.
   - Correção proposta: Reduzir para nome, e-mail, WhatsApp, área e currículo; mover curso, unidade e tipo para o teste de perfil.
6. **Bolinhas coloridas nos chips do hero sem significado**
   - Evidência: 3 chips com marcadores amarelo, teal e rosa (calçados na ordem dos passos) que não correspondem a nenhuma informação; hero deixa ~144px escuros vazios sob os chips antes do cartão.
   - Correção proposta: Usar um só ícone/cor nos chips e reduzir o padding inferior do hero.
