-- Reagenda os crons que chamam Edge Functions protegidas por chave, lendo a chave do Vault
-- (nunca em texto no comando do job, que fica visível em cron.job).
--
-- ORDEM (senão a sequência para de rodar):
--   1. Escolha uma chave longa e aleatória (ex.: openssl rand -hex 32).
--   2. supabase secrets set SEQ_RUN_KEY=<chave> --project-ref ivjvpdzsfjdpyabbzzuj
--   3. Rode este arquivo no SQL Editor trocando <chave> abaixo (só na primeira linha).
--   4. Só então implante a guia-sequence nova (ela recusa ?run=1 sem a chave).
--
-- Para a Hotmart, a chave HOTMART_SYNC_KEY já existe: crie o segredo 'hotmart_sync_key' no Vault com o mesmo valor
-- e descomente o segundo bloco.

select vault.create_secret('<chave>', 'seq_run_key', 'chave do ?run=1 da guia-sequence');

select cron.unschedule('guia-sequence-hourly');
select cron.schedule(
  'guia-sequence-hourly',
  '0 * * * *',
  $$
    select net.http_post(
      url := 'https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/guia-sequence?run=1',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-run-key', (select decrypted_secret from vault.decrypted_secrets where name = 'seq_run_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

-- select vault.create_secret('<HOTMART_SYNC_KEY>', 'hotmart_sync_key', 'chave do hotmart-sync');
-- select cron.unschedule('hotmart-sync-15min');
-- select cron.schedule(
--   'hotmart-sync-15min',
--   '*/15 * * * *',
--   $$
--     select net.http_post(
--       url := 'https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/hotmart-sync?run=1',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'x-sync-key', (select decrypted_secret from vault.decrypted_secrets where name = 'hotmart_sync_key')
--       ),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 30000
--     );
--   $$
-- );
