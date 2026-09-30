-- Eventos: só a service role (Edge Functions) executa as funções fa_eventos_*. Mesmo padrão de fa_health_snapshot.
-- Por padrão o Supabase deixa toda função de public executável por anon/authenticated via PostgREST; aqui fecha.
-- Idempotente. Aplicar depois de 20261001120000_fa_eventos.sql.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'fa_eventos\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.assinatura);
    execute format('grant execute on function %s to service_role', f.assinatura);
  end loop;
end $$;
