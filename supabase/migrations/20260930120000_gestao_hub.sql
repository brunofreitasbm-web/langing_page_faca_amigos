-- Hub de Gestão (gestao.institutofacaamigos.com.br), 30/09/2026.
-- Login único de Bruno e Isabella: senha do Sistema da Clínica + código por
-- e-mail, e daí um clique abre cada sistema já logado (ver
-- supabase/functions/gestao-hub/index.ts). Só a service role (a função)
-- toca estas tabelas: RLS ligado e nenhuma policy.

-- Quem pode entrar no hub e qual é a identidade de cada um em cada sistema.
-- Uma linha por pessoa; coluna nula = aquele quadrado fica desabilitado.
create table if not exists public.fa_gestao_contas (
  email text primary key check (email = lower(email)),  -- e-mail do login na Clínica (pode ser interno: equipe_…@staff.facaamigos.local)
  email_codigo text not null check (email_codigo = lower(email_codigo)),  -- e-mail REAL que recebe o código de 6 dígitos
  nome text not null,
  playground_email text,   -- Supabase Auth do projeto A (app.)
  clinica_email text,      -- Supabase Auth do projeto B (sistema.)
  financeiro_email text,   -- Supabase Auth do projeto A (Simulador Financeiro)
  rh_email text,           -- Supabase Auth do projeto B (rh. / Grupo IB)
  cacau_usuario text,      -- usuário do Hub de Operações Cacau Show (ex.: "bruno")
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Código de 6 dígitos enviado por e-mail depois da senha certa.
create table if not exists public.fa_gestao_desafios (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.fa_gestao_contas (email) on delete cascade,
  code_hash text not null,
  tentativas int not null default 0,
  ip text,
  expires_at timestamptz not null,
  usado_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists fa_gestao_desafios_email_idx
  on public.fa_gestao_desafios (email, created_at desc);

-- Sessão do hub: só o SHA-256 do token fica no banco.
create table if not exists public.fa_gestao_sessoes (
  token_hash text primary key,
  email text not null references public.fa_gestao_contas (email) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Tentativas de senha erradas (mesmo esquema de fa_teste_admin_login_attempts).
create table if not exists public.fa_gestao_login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  login text not null,
  created_at timestamptz not null default now()
);

create index if not exists fa_gestao_login_attempts_ip_idx
  on public.fa_gestao_login_attempts (ip, created_at desc);
create index if not exists fa_gestao_login_attempts_login_idx
  on public.fa_gestao_login_attempts (login, created_at desc);

-- Quem entrou, pediu código e abriu qual sistema.
create table if not exists public.fa_gestao_auditoria (
  id bigint generated always as identity primary key,
  email text,
  evento text not null,   -- login_senha_ok | login_falhou | codigo_ok | codigo_falhou | launch | logout
  app text,
  detalhe text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists fa_gestao_auditoria_created_idx
  on public.fa_gestao_auditoria (created_at desc);

alter table public.fa_gestao_contas enable row level security;
alter table public.fa_gestao_desafios enable row level security;
alter table public.fa_gestao_sessoes enable row level security;
alter table public.fa_gestao_login_attempts enable row level security;
alter table public.fa_gestao_auditoria enable row level security;

select cron.schedule(
  'fa-gestao-limpeza-diaria',
  '40 6 * * *',
  $$
    delete from public.fa_gestao_sessoes where expires_at < now();
    delete from public.fa_gestao_desafios where expires_at < now() - interval '1 day';
    delete from public.fa_gestao_login_attempts where created_at < now() - interval '2 days';
  $$
);
