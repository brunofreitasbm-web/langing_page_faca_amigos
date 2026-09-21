# Como publicar (ordem obrigatória)

Projeto Supabase: `ivjvpdzsfjdpyabbzzuj`. Site: Vercel, publica a cada push na branch `main`.
Este arquivo vale mais que trechos antigos do `LEIA-ME.txt` quando houver conflito.

## Lote 1: segurança (pendente, feito só no código em 21/09/2026)

1. Escolher uma chave longa (ex.: `openssl rand -hex 32`) e gravar como secret:
   `supabase secrets set SEQ_RUN_KEY=<chave> --project-ref ivjvpdzsfjdpyabbzzuj`
2. Aplicar as migrations `20260921120000_fase0_seguranca.sql` e `20260921130000_fa_teste_origem_extra.sql`.
3. Rodar `supabase/ops/reagendar-crons.sql` no SQL Editor (troca `<chave>`). Isso põe a chave no Vault e refaz o cron.
   **Só depois**, implantar `guia-sequence`. Se a função nova subir antes do cron novo, a sequência de e-mails para de
   rodar (recusa o `?run=1` sem chave) até o cron ser refeito.
4. Implantar `behavior-test-admin`, `behavior-test-webhook`, `wifi-coupon-admin`, `wifi-lead-webhook`
   (todas com `verify_jwt` desligado, como hoje).
5. Push do site. Conferir: `/hotspot/login.html` deve dar 404 e `POST guia-sequence?run=1` sem chave deve dar 401.
6. Trocar a senha `visitante` no MikroTik antes de instalar o portal (ver `hotspot/LEIA-ME-HOTSPOT.md`).

## Lote 2: site com rastreamento e consentimento

Depende só do site (mais a migration de origem, já no lote 1 e a função `behavior-test-webhook` nova, que grava
`utm_term`, `gclid` e `fbclid`). Regra de sempre: migration, depois função, depois site.

Depois de publicar, no GTM (`GTM-PN5D2BTS`):
- Os eventos novos chegam no `dataLayer`: `whatsapp_click`, `begin_checkout`, `file_download`, `scroll_depth`,
  `consent_update`. Criar as tags/acionadores no GTM para levá-los ao GA4.
- Conferir se o container já tem uma tag GA4 além do `gtag` direto do `fa-track.js`. Se tiver, uma das duas precisa sair
  (senão o `page_view` conta em dobro).
- Tags de anúncio (Meta etc.) dentro do GTM devem exigir consentimento (`ad_storage`).

## Lote 3: webhook da Hotmart

1. Aplicar `20260921140000_hotmart_webhook.sql`.
2. Secrets: `HOTMART_HOTTOK` (o "hottok" do painel), `HOTMART_CODIGO_PRODUCT_ID` (id numérico do Código; o
   `?list_products=1` do `hotmart-sync` mostra) e `HOTMART_PRODUCT_ID` passa a aceitar lista: `8560642,<id do Código>`.
3. Implantar `hotmart-webhook` (`verify_jwt` desligado; a proteção é o hottok) e `hotmart-sync`.
4. Na Hotmart: Ferramentas > Webhook, URL `https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/hotmart-webhook`,
   versão 2.0.0, eventos de compra aprovada/completa, reembolso, chargeback, cancelada e carrinho abandonado.
5. Usar o teste de envio do painel da Hotmart para cada evento e conferir `select * from fa_hotmart_eventos order by
   received_at desc;` (coluna `error` vazia). Se algum campo vier com outro nome, ajustar em `hotmart-webhook/index.ts`.
6. Uma compra real de teste confirma a cadeia toda (compra gravada, sequência parada, e-mail de boas-vindas).

## Links com origem (Instagram, QR, Google)

Use sempre `utm_source`, `utm_medium` e `utm_campaign`. O site guarda a origem e a leva até o lead e o checkout.

| Onde | Link |
|---|---|
| Bio do Instagram (teste) | `https://institutofacaamigos.com.br/teste?utm_source=instagram&utm_medium=bio&utm_campaign=teste` |
| Bio do Instagram (hub) | `https://institutofacaamigos.com.br/?utm_source=instagram&utm_medium=bio&utm_campaign=hub` |
| Stories / posts | `...?utm_source=instagram&utm_medium=story&utm_campaign=<tema>` |
| QR no Playground | `https://institutofacaamigos.com.br/teste?utm_source=qr&utm_medium=presencial&utm_campaign=playground` |
| QR no Circuito | `https://institutofacaamigos.com.br/teste?utm_source=qr&utm_medium=presencial&utm_campaign=circuito` |
| QR na Clínica | `https://institutofacaamigos.com.br/teste?utm_source=qr&utm_medium=presencial&utm_campaign=clinica` |
| Perfil do Google | `https://institutofacaamigos.com.br/?utm_source=google&utm_medium=organico&utm_campaign=perfil` |
