-- Liga o cron dos eventos (fa-eventos-dispatch, a cada 30 min) lendo a chave do Vault, nunca em texto no comando
-- do job (que fica visível em cron.job). Mesmo padrão de agendar-rotinas.sql.
--
-- ORDEM:
--   1. Aplicar a migration 20261001120000_fa_eventos.sql.
--   2. Escolher uma chave longa e aleatória (ex.: openssl rand -hex 32) e gravar como secret da função:
--        supabase secrets set OPS_KEY=<chave> --project-ref ivjvpdzsfjdpyabbzzuj
--      (se OPS_KEY já existir por causa das rotinas fa-health/fa-weekly-report, use a MESMA chave aqui).
--   3. Implantar eventos-dispatch (verify_jwt DESLIGADO: a proteção é o cabeçalho x-ops-key).
--   4. Rodar este arquivo no SQL Editor trocando <chave> pela MESMA chave do OPS_KEY.
--   5. Testar sem enviar nada: POST eventos-dispatch?dry=1 com {"action":"run"} e o cabeçalho x-ops-key.

do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'ops_key';
  if v_id is null then
    perform vault.create_secret('<chave>', 'ops_key', 'chave x-ops-key das rotinas (eventos-dispatch, fa-health, fa-weekly-report)');
  else
    perform vault.update_secret(v_id, '<chave>');
  end if;
end $$;

select cron.unschedule(jobid) from cron.job where jobname = 'fa-eventos-dispatch';

select cron.schedule(
  'fa-eventos-dispatch',
  '*/30 * * * *',
  $$
    select net.http_post(
      url := 'https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/eventos-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ops-key', (select decrypted_secret from vault.decrypted_secrets where name = 'ops_key')
      ),
      body := '{"action":"run"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

-- Conferir depois:
--   select jobname, schedule, active from cron.job where jobname = 'fa-eventos-dispatch';
--   select j.jobname, d.status, d.start_time from cron.job_run_details d join cron.job j using (jobid)
--    where j.jobname = 'fa-eventos-dispatch' order by d.start_time desc limit 5;
