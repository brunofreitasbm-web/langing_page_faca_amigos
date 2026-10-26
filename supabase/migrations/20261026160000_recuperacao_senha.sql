-- "Esqueci minha senha" da Clínica e da Gestão de Pessoas (26/10/2026).
-- A função recuperar-senha (projeto A) manda um código de 6 dígitos por e-mail e, com o código certo,
-- troca a senha do login no projeto B. Esta tabela guarda só o desafio: no banco fica o SHA-256 do
-- código (nunca o código nem a senha), com validade, limite de tentativas e uso único. Linhas com
-- user_id nulo são pedidos ignorados (e-mail/CPF que não pode recuperar): existem só para o limite
-- por IP valer também contra quem chuta identificadores.
-- Só a service role (a função) toca esta tabela: RLS ligado, sem policy.
create table if not exists public.fa_recuperacao_senha (
  id uuid primary key default gen_random_uuid(),
  sistema text not null check (sistema in ('clinica', 'rh')),
  user_id uuid,
  email text,
  code_hash text not null,
  ip text,
  tentativas integer not null default 0,
  expires_at timestamptz not null,
  usado_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists fa_recuperacao_senha_ip_idx on public.fa_recuperacao_senha (ip, created_at);
create index if not exists fa_recuperacao_senha_user_idx on public.fa_recuperacao_senha (user_id, created_at);

alter table public.fa_recuperacao_senha enable row level security;

comment on table public.fa_recuperacao_senha is
  'Desafios do "esqueci minha senha" (Clínica e Gestão de Pessoas): hash do código, validade, tentativas e uso único. Só a service role acessa.';
