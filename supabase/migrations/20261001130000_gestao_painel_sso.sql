-- /admin (painel do site) como subsistema do Hub de Gestão, 01/10/2026.
-- Owner (Bruno e Isabella) entra no /admin pelo Hub, com ticket de uso único, e
-- ganha o painel completo. A equipe mantém o login direto, mas só com o escopo
-- 'equipe' (cupons Wi-Fi e check-in). Tudo aditivo: sem esta migração e sem a
-- chave `admin_login_direto` em fa_teste_config, o /admin se comporta como antes.

-- Identidade de cada conta no painel do site (mesmo padrão dos outros quadrados:
-- nulo = quadrado desabilitado). Hoje é o próprio e-mail de login na Clínica.
alter table public.fa_gestao_contas add column if not exists painel_usuario text;

update public.fa_gestao_contas
   set painel_usuario = email
 where painel_usuario is null and ativo = true;

-- Ticket de entrada no /admin: só o SHA-256 fica no banco, vale 60 s, uso único.
create table if not exists public.fa_gestao_painel_tickets (
  token_hash text primary key,
  email text not null references public.fa_gestao_contas (email) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.fa_gestao_painel_tickets enable row level security;

comment on table public.fa_gestao_painel_tickets is
  'Tickets de uso único (60 s) que o Hub de Gestão entrega ao /admin. Só a service role acessa.';

-- Escopo da sessão do /admin: 'owner' = tudo; 'equipe' = só cupons Wi-Fi e check-in.
-- Sessões que já existem continuam 'owner' (o default cobre a linha antiga).
alter table public.fa_teste_admin_sessions
  add column if not exists escopo text not null default 'owner';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fa_teste_admin_sessions_escopo_check'
  ) then
    alter table public.fa_teste_admin_sessions
      add constraint fa_teste_admin_sessions_escopo_check check (escopo in ('owner', 'equipe'));
  end if;
end $$;

select cron.schedule(
  'fa-gestao-painel-limpeza',
  '50 6 * * *',
  $$ delete from public.fa_gestao_painel_tickets where expires_at < now() - interval '1 day'; $$
);
