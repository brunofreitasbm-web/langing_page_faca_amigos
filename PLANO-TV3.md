# Plano de Implantação: TV3 — Clínica FaçaAmigos

Mídia indoor para a sala de espera do Centro de Terapia Comportamental.

---

## 1. Perfil do Público & Contexto
- **Público:** Pais e mães aguardando sessões terapêuticas (tempo médio de permanência: 2 a 3 horas).
- **Estado emocional:** Ansiedade, cansaço, busca por orientação e acolhimento.
- **Objetivo central:** Acolher, orientar, divulgar o ecossistema e converter o tempo ocioso em engajamento ativo.

---

## 2. Estrutura do Ciclo (Prevenção de Fadiga)
Para um período de 3 horas, um loop curto de 1 minuto gera irritação. 
- **Ciclo completo:** Bloco de 15 a 20 minutos rotativo.
- **Duração por slide:** 10 a 15 segundos (leitura calma e confortável).
- **Relógio e utilidades:** Horário ao vivo e previsão do tempo discretos na barra lateral/topo.

```
[Bloco Terapêutico / Acolhimento] (40%)
   ↓
[Mapeamento Grátis via QR Code] (25%)
   ↓
[Playground Parque Shopping & Grão-Pará] (20%)
   ↓
[Circuito de Carrinhos Elétricos] (15%)
```

---

## 3. Grade de Conteúdo dos Slides

### Bloco A — Clínica & Psicoeducação (40%)
1. **Boas-vindas & Acolhimento:** Mensagens de reforço positivo ("Cada pequeno passo é uma grande vitória").
2. **Nosso Método (ABA, Fono, TO, Psicopedagogia):** Explicação visual e simplificada do trabalho em sala.
3. **Equipe Clínica:** Destaque para a coordenação de Isabella Freitas (CRP 10/4727) e terapeutas.
4. **Dicas Práticas para Casa:** Ideias de rotina visual, regulação sensorial e comunicação alternativa.
5. **Avisos da Recepção:** Conexão Wi-Fi, café, água e suporte à família.

### Bloco B — Marketing do Mapeamento Grátis (25%)
1. **Chamada Direta:** "Aproveite seu tempo de espera: faça o Mapeamento Comportamental grátis".
2. **QR Code Gigante:** Direcionamento direto para `/teste` com UTM `tv3_sala_espera`.
3. **Proposta de Valor:** "Leva apenas 5 minutos no celular. Retrato preliminar do desenvolvimento no seu e-mail".
4. **Compartilhamento:** "Conhece outra mãe ou pai com dúvidas? Escaneie e compartilhe o link".

### Bloco C — Playground (Parque Shopping & Grão-Pará) (20%)
1. **Espaço Inclusivo:** Ambiente adaptado com monitores treinados para regulação e brincadeiras livres.
2. **Unidade Parque Shopping:** Térreo, próximo às Lojas Americanas (todos os dias das 10h às 22h).
3. **Unidade Bosque Grão-Pará:** 1º piso, em frente à Renner (segunda a sábado 10h-22h, domingos 10h-21h).
4. **Benefício Terapêutico:** Brincar como extensão da socialização infantil.

### Bloco D — Circuito de Carrinhos (Parque Shopping) (15%)
1. **Autonomia e Diversão:** Crianças no volante de minicarros, jeeps e pelúcias elétricas motorizadas.
2. **Localização:** Piso térreo do Parque Shopping Belém.
3. **Vídeo / Fotos:** Slides dinâmicos com crianças sorrindo e dirigindo.

---

## 4. Arquitetura Técnica (`tv3.html`)
- **Base Técnica:** Baseada em `tv.html` e `tv2.html` (HTML5, Vanilla CSS, JS sem dependências externas pesadas).
- **Identidade Visual:** Paleta oficial da Clínica (Petróleo `#065264`, Rosa `#F0196B`, Turquesa `#2ECFB5`, Amarelo `#FFE234` e Creme `#FFF9F1`).
- **Layout:** Adaptável para 16:9 Horizontal (Full HD 1920x1080) e Vertical (com rotação 90°/270° via URL param, igual `tv2.html`).
- **Tracking:** Disparo de eventos `tv3_slide` e `tv3_qr_scan` para mensuração do painel indoor.
- **Resiliência:** Cache offline automático e auto-recarregamento preventivo de madrugada.

---

## 5. Próximos Passos de Execução
1. Criar o arquivo `tv3.html` com o player e transições.
2. Gerar QR Codes otimizados de alto contraste para o `/teste`.
3. Montar a esteira de slides intercalando fotos da clínica, playgrounds e circuito.
4. Adicionar barra de utilidades (relógio em tempo real e aviso de Wi-Fi).
5. Testar em navegador e validar em tela cheia.
