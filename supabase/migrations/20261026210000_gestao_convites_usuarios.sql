-- Gestão Hub: Convites e Links para Criação de Usuários (Supervisores, Gerentes e Equipe)
-- Permite que o Owner/Gestor gere links configurados (Unidade, Sistema, Função e Permissão)
-- para envio a supervisores, gerentes ou colaboradores se cadastrarem.

-- Campos adicionais na tabela de contas para perfil completo
alter table public.fa_gestao_contas
  add column if not exists data_nascimento date,
  add column if not exists unidade text,
  add column if not exists funcao text;

-- Tabela de convites gerados para criação de usuários
create table if not exists public.fa_gestao_convites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  unidade text not null,
  sistema text not null,
  funcao text not null,
  permissao text not null default 'operar',
  destinatario_nome text,
  destinatario_email text,
  criado_por text references public.fa_gestao_contas (email) on delete set null,
  usado_em timestamptz,
  usado_por text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists fa_gestao_convites_token_idx
  on public.fa_gestao_convites (token);

create index if not exists fa_gestao_convites_created_idx
  on public.fa_gestao_convites (created_at desc);

alter table public.fa_gestao_convites enable row level security;

comment on table public.fa_gestao_convites is
  'Links e convites para auto-cadastro de novos supervisores e colaboradores com unidade, sistema e permissões pré-definidas.';
