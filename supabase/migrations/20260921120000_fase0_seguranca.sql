-- Fase 0 (segurança), 21/09/2026.
-- 1) Tentativas de login do painel (limite de força bruta em behavior-test-admin).
-- 2) Índice em ip do teste (usado no rate limit de start/complete a cada requisição).
-- 3) Limpeza diária de sessões expiradas e de tentativas antigas (pg_cron).
-- Os jobs guia-sequence-hourly e hotmart-sync-15min continuam fora de migration de propósito:
-- levam chave secreta. Ver supabase/ops/reagendar-crons.sql.

create table if not exists public.fa_teste_admin_login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  login text not null,
  created_at timestamptz not null default now()
);

create index if not exists fa_teste_admin_login_attempts_ip_idx
  on public.fa_teste_admin_login_attempts (ip, created_at desc);
create index if not exists fa_teste_admin_login_attempts_login_idx
  on public.fa_teste_admin_login_attempts (login, created_at desc);

alter table public.fa_teste_admin_login_attempts enable row level security;

create index if not exists fa_leads_teste_comportamento_ip_idx
  on public.fa_leads_teste_comportamento (ip, created_at desc);

select cron.schedule(
  'fa-limpeza-diaria',
  '30 6 * * *',
  $$
    delete from public.fa_teste_admin_sessions where expires_at < now();
    delete from public.fa_teste_admin_login_attempts where created_at < now() - interval '2 days';
  $$
);
