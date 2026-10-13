-- Hub de Gestão: cadastro central de pessoas, módulos e níveis (13/10/2026).
-- Até aqui só Bruno e Isabella entravam (senha da Clínica + código por e-mail) e
-- não havia papel nem nível. Agora o owner cadastra gerências no próprio Hub,
-- escolhe os módulos e o nível de cada um (ver | operar | admin) e a pessoa entra
-- com senha própria do Hub. Tudo aditivo e retrocompatível: as contas que já
-- existem viram `owner`, continuam com `auth_modo = 'clinica'` e entram como hoje.
-- Só a service role (função gestao-hub) toca estas tabelas: RLS ligado, sem policy.

-- Papel e forma de login da conta.
--   papel:     owner = tudo, gerencia pessoas; gerente = só o que a matriz permitir.
--   auth_modo: clinica = senha do Sistema da Clínica (legado); hub = senha própria.
alter table public.fa_gestao_contas
  add column if not exists papel text not null default 'gerente',
  add column if not exists auth_modo text not null default 'clinica',
  add column if not exists senha_hash text,          -- pbkdf2$iterações$salt$hash (nunca a senha)
  add column if not exists senha_definida_em timestamptz,
  add column if not exists convidado_em timestamptz,
  add column if not exists criado_por text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fa_gestao_contas_papel_check') then
    alter table public.fa_gestao_contas
      add constraint fa_gestao_contas_papel_check check (papel in ('owner', 'gerente'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fa_gestao_contas_auth_modo_check') then
    alter table public.fa_gestao_contas
      add constraint fa_gestao_contas_auth_modo_check check (auth_modo in ('clinica', 'hub'));
  end if;
end $$;

-- Quem já estava na tabela antes desta migração é owner (só Bruno e Isabella).
-- Contas criadas depois pelo Hub nascem com auth_modo = 'hub', então reaplicar
-- esta migração não promove ninguém.
update public.fa_gestao_contas
   set papel = 'owner'
 where papel = 'gerente' and auth_modo = 'clinica';

-- Matriz pessoa × módulo × nível. Sem linha = sem acesso ("nenhum"). Owner ignora a
-- tabela (admin em tudo). O módulo é o mesmo id dos quadrados do Hub.
create table if not exists public.fa_gestao_permissoes (
  email text not null references public.fa_gestao_contas (email) on delete cascade on update cascade,
  modulo text not null check (modulo in ('playground', 'clinica', 'financeiro', 'rh', 'cacau', 'painel', 'eventos')),
  nivel text not null check (nivel in ('ver', 'operar', 'admin')),
  atualizado_por text,
  atualizado_em timestamptz not null default now(),
  primary key (email, modulo)
);

alter table public.fa_gestao_permissoes enable row level security;

comment on table public.fa_gestao_permissoes is
  'Nível (ver|operar|admin) de cada pessoa em cada módulo do Hub de Gestão. Sem linha = nenhum. Só a service role acessa.';

-- O ticket do /admin passa a carregar o nível da pessoa nos dois módulos que o /admin
-- hospeda (painel e eventos). Ticket antigo (nível nulo) vale como owner, porque até
-- aqui só owner gerava ticket.
alter table public.fa_gestao_painel_tickets
  add column if not exists nivel_painel text,
  add column if not exists nivel_eventos text;

-- Escopo da sessão do /admin, agora um por módulo:
--   escopo         -> ações do painel (behavior-test-admin)
--   escopo_eventos -> ações de Eventos (eventos-admin); nulo = usa `escopo` (sessões antigas)
-- Valores: owner (tudo) | equipe (operar) | ver (só leitura) | nenhum (sem acesso).
alter table public.fa_teste_admin_sessions
  add column if not exists escopo_eventos text;

alter table public.fa_teste_admin_sessions drop constraint if exists fa_teste_admin_sessions_escopo_check;
alter table public.fa_teste_admin_sessions
  add constraint fa_teste_admin_sessions_escopo_check check (escopo in ('owner', 'equipe', 'ver', 'nenhum'));

alter table public.fa_teste_admin_sessions drop constraint if exists fa_teste_admin_sessions_escopo_eventos_check;
alter table public.fa_teste_admin_sessions
  add constraint fa_teste_admin_sessions_escopo_eventos_check
  check (escopo_eventos is null or escopo_eventos in ('owner', 'equipe', 'ver', 'nenhum'));
