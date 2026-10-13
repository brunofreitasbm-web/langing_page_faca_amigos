-- Hub de Gestão: e-mail de login próprio (13/10/2026).
-- Conta antiga (Bruno/Isabella) tem como chave um e-mail interno (equipe_…@staff.facaamigos.local),
-- que também é o login dela na Clínica e a identidade usada pelo /admin. Para entrar no Hub com o
-- e-mail real e senha própria sem mexer na chave, a conta ganha `login_email`: é o que a pessoa
-- digita no Hub quando auth_modo = 'hub'. Nada nos outros sistemas muda.
alter table public.fa_gestao_contas
  add column if not exists login_email text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fa_gestao_contas_login_email_check') then
    alter table public.fa_gestao_contas
      add constraint fa_gestao_contas_login_email_check check (login_email is null or login_email = lower(login_email));
  end if;
end $$;

create unique index if not exists fa_gestao_contas_login_email_uidx
  on public.fa_gestao_contas (login_email) where login_email is not null;
