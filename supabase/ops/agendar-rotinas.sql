-- Agenda as rotinas fa-health (diária) e fa-weekly-report (semanal) no pg_cron, lendo a chave do Vault
-- (nunca em texto no comando do job, que fica visível em cron.job). Mesmo padrão de reagendar-crons.sql.
--
-- ORDEM (senão os jobs chamam funções que ainda não existem ou respondem 401):
--   1. Aplicar a migration 20260921150000_fase3_rotinas.sql (cria fa_health_snapshot e as colunas novas).
--   2. Escolher uma chave longa e aleatória (ex.: openssl rand -hex 32).
--   3. supabase secrets set OPS_KEY=<chave> --project-ref ivjvpdzsfjdpyabbzzuj
--      supabase secrets set ALERT_EMAIL=<e-mail(s) que recebem alertas e o resumo, separados por vírgula>
--        (sem ALERT_EMAIL, as duas rotinas usam LEAD_NOTIFY_EMAIL)
--   4. Implantar fa-health e fa-weekly-report (verify_jwt DESLIGADO: a proteção é o cabeçalho x-ops-key).
--   5. Rodar este arquivo no SQL Editor trocando <chave> (nas duas ocorrências; use a MESMA chave do OPS_KEY).
--   6. Testar sem enviar nada: chamar cada função com ?dry=1 e o cabeçalho x-ops-key (ver PUBLICAR.md).
--
-- Horários (pg_cron usa UTC; Belém é UTC-3, sem horário de verão):
--   fa-health          10:00 UTC = 07h em Belém, todos os dias
--   fa-weekly-report   11:00 UTC = 08h em Belém, toda segunda-feira

-- Cria o segredo (ou atualiza, se já existir: pode rodar o arquivo de novo para trocar a chave).
do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'ops_key';
  if v_id is null then
    perform vault.create_secret('<chave>', 'ops_key', 'chave x-ops-key das rotinas fa-health e fa-weekly-report');
  else
    perform vault.update_secret(v_id, '<chave>');
  end if;
end $$;

-- Remove o agendamento anterior (se houver) para o arquivo poder ser rodado mais de uma vez.
select cron.unschedule(jobid) from cron.job where jobname in ('fa-health-daily', 'fa-weekly-report-monday');

select cron.schedule(
  'fa-health-daily',
  '0 10 * * *',
  $$
    select net.http_post(
      url := 'https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/fa-health',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ops-key', (select decrypted_secret from vault.decrypted_secrets where name = 'ops_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

select cron.schedule(
  'fa-weekly-report-monday',
  '0 11 * * 1',
  $$
    select net.http_post(
      url := 'https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/fa-weekly-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ops-key', (select decrypted_secret from vault.decrypted_secrets where name = 'ops_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

-- Conferir depois:
--   select jobname, schedule, active from cron.job where jobname in ('fa-health-daily', 'fa-weekly-report-monday');
--   select j.jobname, d.status, d.start_time from cron.job_run_details d join cron.job j using (jobid)
--    where j.jobname like 'fa-%' order by d.start_time desc limit 10;
