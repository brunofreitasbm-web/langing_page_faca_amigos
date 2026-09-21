-- Fase 3 (21/09/2026): rotinas de monitoramento e follow-up.
-- 1) lista_espera_clinica: a Clínica ainda não abriu; lead com área em atenção especial entra na lista de espera
--    (gravado por behavior-test-webhook no "complete").
-- 2) hot_reminder_sent_at: marca que o lembrete de "lead quente sem contato" já foi enviado (fa-health).
-- 3) fa_health_snapshot(): lê o pg_cron (cron.job_run_details) e as respostas HTTP do pg_net para a função
--    fa-health. security definer, só a service role executa.
-- Idempotente: pode ser aplicada mais de uma vez. Aplicar ANTES de implantar as funções que usam as colunas
-- (behavior-test-webhook, behavior-test-admin, fa-health).

alter table public.fa_leads_teste_comportamento
  add column if not exists lista_espera_clinica boolean not null default false,
  add column if not exists hot_reminder_sent_at timestamptz;

comment on column public.fa_leads_teste_comportamento.lista_espera_clinica is
  'true quando o resultado teve ao menos uma área em atenção especial: registrar na lista de espera da Clínica e avisar na abertura.';
comment on column public.fa_leads_teste_comportamento.hot_reminder_sent_at is
  'Quando a fa-health mandou o lembrete de follow-up deste lead quente (tier3, sem contato após 24h). Só uma vez por lead.';

-- Lead quente pendente de lembrete (consulta da fa-health).
create index if not exists fa_leads_teste_hot_pending_idx
  on public.fa_leads_teste_comportamento (completed_at)
  where status = 'completed' and result_band = 'tier3' and contacted_at is null and hot_reminder_sent_at is null;

-- Instantâneo de saúde dos jobs do pg_cron e das chamadas HTTP que eles fazem.
-- Devolve jsonb:
--   generated_at      agora
--   failed_runs_24h   execuções do cron com status 'failed' nas últimas 24h (job, início, mensagem)
--   jobs              para cada job monitorado (guia-sequence-hourly, hotmart-sync-15min): se existe, se está ativo,
--                     última execução e quantas execuções nos últimos 60 minutos
--   http_errors_24h   respostas HTTP >= 400, timeouts ou erros do pg_net guardadas (o pg_net só retém algumas horas)
create or replace function public.fa_health_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_failed jsonb := '[]'::jsonb;
  v_jobs jsonb := '[]'::jsonb;
  v_http jsonb := '[]'::jsonb;
begin
  begin
    select coalesce(jsonb_agg(x order by x.start_time desc), '[]'::jsonb)
      into v_failed
      from (
        select j.jobname, d.status, d.start_time, left(coalesce(d.return_message, ''), 300) as return_message
          from cron.job_run_details d
          left join cron.job j on j.jobid = d.jobid
         where d.status = 'failed'
           and d.start_time > now() - interval '24 hours'
         order by d.start_time desc
         limit 50
      ) x;
  exception when others then
    v_failed := jsonb_build_array(jsonb_build_object('jobname', null, 'return_message', 'falha ao ler cron.job_run_details: ' || sqlerrm));
  end;

  begin
    select coalesce(jsonb_agg(jsonb_build_object(
             'jobname', w.jobname,
             'exists', j.jobid is not null,
             'active', coalesce(j.active, false),
             'schedule', j.schedule,
             'last_run_at', (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid),
             'runs_last_hour', (select count(*) from cron.job_run_details d
                                 where d.jobid = j.jobid and d.start_time > now() - interval '60 minutes')
           ) order by w.jobname), '[]'::jsonb)
      into v_jobs
      from (values ('guia-sequence-hourly'), ('hotmart-sync-15min')) as w(jobname)
      left join cron.job j on j.jobname = w.jobname;
  exception when others then
    v_jobs := jsonb_build_array(jsonb_build_object('jobname', null, 'error', 'falha ao ler cron.job: ' || sqlerrm));
  end;

  begin
    select coalesce(jsonb_agg(x order by x.created desc), '[]'::jsonb)
      into v_http
      from (
        select r.created, r.status_code, r.timed_out, left(coalesce(r.error_msg, ''), 200) as error_msg,
               left(coalesce(r.content, ''), 200) as content
          from net._http_response r
         where r.created > now() - interval '24 hours'
           and (r.status_code >= 400 or r.timed_out is true or r.error_msg is not null)
         order by r.created desc
         limit 30
      ) x;
  exception when others then
    v_http := '[]'::jsonb; -- pg_net ausente ou sem a tabela: não derruba o snapshot
  end;

  return jsonb_build_object(
    'generated_at', now(),
    'failed_runs_24h', v_failed,
    'jobs', v_jobs,
    'http_errors_24h', v_http
  );
end;
$$;

revoke all on function public.fa_health_snapshot() from public;
revoke all on function public.fa_health_snapshot() from anon;
revoke all on function public.fa_health_snapshot() from authenticated;
grant execute on function public.fa_health_snapshot() to service_role;
