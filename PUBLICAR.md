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

## Lote 4: GEO — fonte única de fatos ligada ao quiosque (pendente, feito só no código em 27/09/2026)

Objetivo: o site, o JSON-LD e os `llms*.txt` deixam de ser escritos à mão e passam a refletir o que o
app dos quiosques (Supabase `ivjvpdzsfjdpyabbzzuj`, tabelas `fa_kiosk_plans`/`packages`/`coupons`) cobra
de verdade. Regra decidida com o usuário em 27/09/2026: o preço de tabela do quiosque tem desconto
automático de 40% para o público geral e 50% para crianças neurodivergentes (laudo/CIPTEA) — é exatamente
o que reproduz os R$ 60/108/192/270/840 já publicados no site.

1. Implantar a função nova: `supabase functions deploy geo-facts --no-verify-jwt --project-ref ivjvpdzsfjdpyabbzzuj`
   (GET público, sem secret novo). Conferir com `curl` que só saem preços/pacotes/endereço — nunca dado de família.
2. `npm run geo` (baixa `geo-facts.json` da função e regenera `llms.txt`/`llms-full.txt`) → revisar o diff → `npm run
   check` → commit → push.
3. Implantar a versão nova de `fa-health` (seção "GEO": compara os % de desconto e os preços do quiosque com o que o
   site pressupõe; alerta por e-mail se divergir). Testar com `?dry=1` + `x-ops-key`.
4. Merge do workflow `.github/workflows/geo-sync.yml` (roda `npm run geo` todo dia às 06h de Belém e abre PR se algo
   mudou; o merge continua manual).
5. Push de `assets/fa-track.js` (classifica visitas vindas de ChatGPT/Perplexity/Gemini/Copilot/Claude como
   `utm_medium=ai`). Criar a dimensão personalizada `ai_engine` (escopo usuário) no GA4 — passo manual, painel do GA4.
6. Implantar a versão nova de `fa-weekly-report` (seção "Visitas vindas de IA").

Pendente (não faz parte deste lote): CTA de pré-check-in nas páginas (falta a URL pública do formulário do app do
quiosque) e `AggregateRating` a partir de `fa_kiosk_google_reviews` (a tabela está vazia; não confirmado se guardaria
notas reais do Google).

## Lote 5: módulo "É para todas as crianças" (pendente, feito só no código em 29/09/2026)

Só arquivos estáticos, sem função nem migration. Não depende dos lotes anteriores.

1. Isabella lê e aprova `aprender/e-para-todas-as-criancas.html` (sai assinado por ela) e `conteudo/e-para-todas-kit.md`.
2. Confirmar com a operação o "Horário Inclusivo 10h–16h", citado no guia e na resposta nova da FAQ.
3. `npm run check` → `npm run geo:check` → commit → `npm run sitemap` → push.
4. Depois do deploy: abrir `/playground#para-todas` e o guia no celular; testar o playground no Rich Results Test
   (a FAQ agora tem 8 perguntas).
5. Cadastrar as respostas rápidas no WhatsApp Business e agendar o carrossel (textos em `conteudo/e-para-todas-kit.md`).

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

## Verificação antes de cada push

- `npm run check` (ou `node scripts/check.mjs`): links internos quebrados, canonical/description/JSON-LD, imagens sem
  tamanho, `fa-track.js` faltando, `hotspot/` referenciado, `ebook/` fora do deploy. O GitHub Actions
  (`.github/workflows/check.yml`) roda o mesmo em push e pull_request. Só ERRO reprova; AVISO é informativo.
- `npm run sitemap`: refaz os `lastmod` do `sitemap.xml` pela data do último commit de cada página. Rode depois do commit.
- `npm run geo:check`: confere se `llms.txt`/`llms-full.txt` batem com `geo-facts.json` commitado (offline, roda no
  CI). `npm run geo` baixa fatos novos da função `geo-facts` e regenera os dois arquivos.
- `.vercelignore` agora também exclui `supabase/`, `scripts/`, `.github/`, `PUBLICAR.md` e `LEIA-ME.txt`
  (funções e migrations são implantadas pela CLI do Supabase, não pela Vercel).

## Arquivos compartilhados do site (`assets/`)

| Arquivo | Para quê |
|---|---|
| `fa-track.js` | GTM/GA4/Clarity/Contentsquare com consentimento, origem do visitante, eventos |
| `fa-footer.js` | Rodapé único (status das unidades e CNPJs numa constante só: virar "Clínica aberta" = 1 edição) |
| `fa-cta.js` | Barra de ação fixa no celular (hub, /playground, /circuito) |
| `fa-modal.js` | Acessibilidade do modal de vagas (rótulos, foco, Esc) |

Cache de `/assets/*` é de 1 dia: depois de mudar um deles, o visitante recebe a versão nova em até 24 h.

## Rotinas (alerta diário e resumo semanal)

Ver `supabase/ops/agendar-rotinas.sql` (ordem de execução comentada no arquivo). Secrets: `OPS_KEY`, `ALERT_EMAIL`
(opcional; senão usa `LEAD_NOTIFY_EMAIL`). Teste primeiro com `?dry=1`.

## Oferta do Código no resultado do teste

Secret `EBOOK2_URL=https://institutofacaamigos.com.br/codigo`. Sem ele, o resultado continua oferecendo só o guia.
