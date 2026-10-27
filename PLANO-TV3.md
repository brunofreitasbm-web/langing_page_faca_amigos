# TV3: mídia indoor da sala de espera da Clínica FaçaAmigos

Endereço: `/tv3` (atalhos `/clinica/tv` e `/tv-clinica`). Página interna, noindex.

## Para quem é e o que a TV faz

O pai ou a mãe fica 2 a 3 horas por visita, 2 a 3 vezes por semana, enquanto o filho está em sessão. Já contratou a
clínica (abertura prevista para dezembro/2026). A TV tem **uma ação principal**: fazer o responsável entrar no
**Portal da Família**. O resto do tempo ela orienta, acolhe, conta como funciona a clínica, convida para o
Playground e o Circuito no fim de semana e pede a indicação do Mapeamento.

O nome certo é **Portal da Família**. "Mural" é só uma seção dentro dele. O login é por celular cadastrado e código de
6 números por SMS (CPF só no primeiro acesso), e a tela de entrada abre na aba **Equipe**: por isso o QR vai para
`/familia`, que explica a aba Família e leva ao login.

## Como a TV funciona

- **Volta de ~9 min.** Cada slide aparece uma vez por volta (`a_lembrete` aparece duas). Hoje são 36 a 39 slides por
  volta, conforme o dia do ciclo e o que está ligado. Em 2,5 h o pai vê a volta umas 16 vezes.
- **Abre em `b_boasvindas` e fecha em `a_fecho`.** No meio, as famílias de conteúdo se alternam (nunca duas iguais coladas).
- **QR do Portal a cada 6 min no máximo**, e uma dica (família C) vem antes de cada pedido do Portal.
- **Ciclo de 5 dias** (dia de Belém): troca as dicas (C), os respiros (R) e as fotos de alguns slides.
- **Famílias:** A Portal da Família (12) · B Clínica (9) · C Dicas para casa (8) · D Playground e Circuito (7) ·
  E Indicação do Mapeamento (2) · R Respiro (4). Total 42.
- **Em pé (retrato 1080×1920)**, como a TV2 do quiosque, medido para TV de **43" ou menos** com assentos a **3 a 5 m**.
  Corpo de texto 40 px, título 80 px, nada abaixo de 26 px; QR do tutorial 680 px e dos slides do Portal 540 px.
  O formato horizontal só existe para teste (`?paisagem`).
- **QR local.** As matrizes ficam dentro do HTML (`scripts/tv3-qr.py`). A TV não depende de internet para mostrar o QR.
- **Trilha instrumental baixa**, sem voz: 20 faixas do salão, volume 0,12, só no expediente (seg a sex 8h às 18h,
  sáb 8h às 12h), 20 min de música e 10 de silêncio a cada meia hora. Tecla `S` liga e desliga.

## Configuração (`CONFIG`, no topo do script de `tv3.html`)

| Campo | O que faz |
|---|---|
| `portalAtivo` | `false` esconde a família A inteira. Use enquanto o Portal ou o cadastro do celular não estiverem prontos |
| `beneficioFamilia` | Texto do slide `d_beneficio`. Trocar quando o mecanismo do benefício for definido |
| `wifiSsid` | Nome da rede. Vazio esconde Wi-Fi do cabeçalho, do rodapé e o slide `b_wifi` |
| `fotoGraoPara` | Caminho da foto do Grão-Pará. Vazio desliga o slide `d_graopara` |
| `somVolume`, `somTocaMin`, `somPausaMin` | Volume e ciclo da trilha |
| `experiment` | Rótulo do experimento (ver `EXPERIMENTOS-TV3.md`) |

## Parâmetros de URL

`?dia=1..5` força o dia do ciclo · `?exp=rotulo` rótulo do experimento · `?slide=<id>` fixa um slide ·
`?portal=0` esconde a família A · `?som=0|1` força o som · `?giro=auto|90|270|0` gira o palco ·
`?fotos=0` desliga as fotos novas da fotógrafa (a TV usa só as fixas) · `?paisagem` abre o formato horizontal (só teste) ·
`?debug=1&seed=x&vel=50` só para teste.
`?rot=90|270` continua valendo como apelido de `?giro=`.

Teclas: `←` `→` troca, espaço pausa, `R` muda o giro (e **salva na TV**), `F` tela cheia, `S` som. Os botões aparecem com o mouse.

### Giro da TV em pé

O padrão é `auto`: se a página recebe sinal em paisagem (o aparelho que roda o Chrome envia 1920×1080 e a TV está
fisicamente em pé), ela gira 90°. Se a própria TV já gira a imagem e o Chrome vê 1080×1920, não gira.
Se a imagem ficar de cabeça para baixo, aperte `R` até acertar (auto, 90°, 270°, 0°). A escolha fica salva na TV e vale
nas próximas aberturas; `?giro=` na URL tem prioridade.

## Instalação na TV (checklist da recepção)

Sem estes itens a TV promete uma ação que falha. Enquanto algum faltar, abra com `?portal=0` ou mude `portalAtivo`.

1. A recepção **cadastra o celular do responsável** na avaliação. Telefone não cadastrado recebe "entre em contato com a recepção".
2. O **SMS com o código** (Twilio) está funcionando em produção para a família.
3. **Cartão de mesa obrigatório** com o mesmo QR de `/familia` em cada assento (cerca de 6 × 6 cm). Numa TV de 43" o
   QR da tela só é lido até uns 3 m (o do tutorial) ou 2 m (os demais); a 5 m o que garante a conversão é o cartão na
   mesa, a 40 cm do celular. O tutorial também mostra a URL digitável em letra grande.
4. A recepção sabe responder **"qual é a condição especial no Playground"** (texto de `beneficioFamilia`).
5. Chrome em modo quiosque com `--autoplay-policy=no-user-gesture-required`. Sem isso, o som espera o primeiro toque.
6. Abrir `/tv3` em tela cheia. A TV está em pé: ver "Giro da TV em pé" acima (tecla `R` se a imagem vier de lado ou de cabeça para baixo).
7. Foto do Grão-Pará em `img/` e `fotoGraoPara` preenchido liga o slide `d_graopara`.
8. Revisão da Isabella dos slides marcados **[ISABELLA]** em `conteudo/tv3-roteiro-slides.md`.

## Como mudar um texto

1. Edite `conteudo/tv3-slides.json` (o que a TV mostra) e o mesmo trecho em `conteudo/tv3-roteiro-slides.md` (versão
   legível, com a fonte de cada fato).
2. `python3 scripts/tv3-pool.py` valida (tamanho, palavras proibidas, QR existente) e grava no `tv3.html`.
3. Mudou uma URL de QR? Edite `QR_URLS` em `scripts/tv3-qr.py` e rode `python3 scripts/tv3-qr.py`. Precisa de `pip install segno`.
4. `node scripts/tv3-test.mjs` (precisa de Playwright e de `npm i --no-save jsqr pngjs`; ver o cabeçalho do arquivo).

**Regras de texto:** nunca "promessa", "confiança", "oferta", "garantido", "cura"; nunca "criança normal/especial";
sem exclamação; sem convênio; sem prognóstico; número só com fonte. O validador barra o que dá para barrar.

## Fotos novas da fotógrafa

A TV lê o catálogo da fotógrafa (Drive → Supabase Storage, `assets/fa-fotos.js`). A lógica toda está em `slideImage()` no `tv3.html`:

1. A **foto fixa** de cada slide é escolhida pela TV3: uma por família a cada dia, nunca igual à do slide anterior.
2. O **tema** dessa foto fixa decide se pode entrar foto nova (`FAFotos.temaDaImagem`). Foto sem tema (retrato da Isabella) e
   slide `imageFit: "retrato"` ficam sempre com a fixa. Foto do Playground não pode ser trocada por foto da sala sensorial da clínica:
   por isso nenhum slide do Playground usa `ambiente-sensorial`.
3. Foto nova **vertical** só entra em slide sem QR; em pé ela cobre o cartão inteiro (foco em 22%). Em slide com QR só entra horizontal,
   com o foco (`pos`) escolhido pela IA.
4. A mesma foto nova não repete dentro de uma volta. Sem rede, sem catálogo ou com `?fotos=0`, tudo volta às fotos fixas.

## O que os testes verificam (`scripts/tv3-test.mjs`)

- Todo QR da tela decodifica na URL esperada nos quatro cenários de instalação (paisagem, retrato nativo, giro 90 e giro 270); o do tutorial mede 660 px ou mais em pé.
- Em 1.500 voltas simuladas: abertura, fechamento, famílias alternadas, ausência de repetição, QR do Portal a cada 6 min e dica antes do pedido.
- Nenhum texto estoura o cartão nos 42 slides, nos quatro cenários.
- O palco girado ocupa a janela inteira (1920×1080, 1280×720, 1080×1920, 720×1280); a tecla `R` alterna e salva.
- Em retrato: letra do corpo ≥ 38 px, título ≥ 60 px, nada abaixo de 26 px no palco, QR dos slides ≥ 440 px (540 nos do Portal), cabeçalho e rodapé sem estourar.
- Nenhum slide repete a foto do anterior e os slides do Playground e do Circuito usam fotos diferentes em cada dia (os testes abrem a TV com `?fotos=0`, sem depender da rede).
- Com um catálogo de mentira (horizontais e verticais): foto vertical só em slide sem QR, retrato da Isabella fixo, sem foto nova repetida na volta, nada estoura nos quatro cenários.
- A trilha toca nos horários certos, pausa no ciclo, respeita `?som=0` e a tecla `S`, e as 20 faixas existem.

## Limites conhecidos

- A volta tem ~9 min, não 11: os filtros por dia e os slides desligados reduzem o miolo. Para alongar, escrever mais
  slides (com revisão da Isabella), não repetir os mesmos.
- A nota "4,9 em 118 avaliações" e o "+1.100 famílias" são números do **Playground** (sistema do quiosque, jul a out/2026).
  Atualizar `d_prova` se a TV for ao ar bem depois. A clínica não tem número próprio ainda e nenhum slide inventa um.
- A licença das 20 faixas instrumentais não está documentada no repositório.
- As **fixas** da clínica são só 4 (mais 2 da Isabella): os slides da clínica as repetem ao longo da volta, sem
  nunca repetir em seguida. As fotos novas do Drive substituem essas fixas quando o tema bate. Fotos novas da clínica em funcionamento (sem close de criança, com autorização) melhoram a TV mais do que qualquer ajuste.
- Em retrato o texto por slide é limitado pelo tamanho da letra: frases novas devem caber nos limites do validador (título 58, texto 165 caracteres).
- O comportamento com o catálogo de verdade só se confirma abrindo `/tv3` em produção depois do deploy (os testes usam catálogo de mentira).
- O celular do pai só chega ao login do sistema se a recepção cadastrou o número (item 1 do checklist).

## Pendências em outros lugares (não resolvidas aqui)

- `clinica_facaamigos`: aceitar `?perfil=familia` em `/login` (hoje abre na aba Equipe). Depois disso `/familia` pode virar redirecionamento.
- `clinica_facaamigos`: o robô de WhatsApp diz para remarcar "por aqui mesmo", enquanto a falta é avisada pelo portal. Alinhar as duas respostas.
- `clinica_facaamigos`: avisar o pai quando a coordenação responder (hoje ele só vê ao abrir o portal).
- `clinica_facaamigos`: a barra de progresso das metas é fixa em 65%.
- `clinica_facaamigos`: a pasta "Modelos de PDF PLanos" tem dados reais de pacientes de terceiros. Tirar do Git.
- `clinica.html` (este repositório): a seção do Mural foi colada sem fechar `</div>` e `</section>` e promete funções que o portal não tem
  (evolução em tempo real, "resposta garantida", justificativa por recibo).
