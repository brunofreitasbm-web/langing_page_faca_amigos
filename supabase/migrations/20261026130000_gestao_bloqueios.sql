-- Hub de Gestão: o que o Hub bloqueou em cada sistema ao desativar uma pessoa (26/10/2026).
-- Desativar no Hub passa a bloquear o acesso da pessoa nos sistemas (Clínica, Gestão de Pessoas,
-- Playground, Simulador e Cacau Show). Esta tabela guarda, por pessoa e sistema, SÓ o que o Hub mudou
-- (ex.: "banimento do login", "perfil estava ativo"). Reativar desfaz exatamente isso e nada mais:
-- quem já estava desativado no sistema por outro motivo continua desativado.
-- O bloqueio nunca apaga PIN, biometria nem histórico em nenhum sistema.
-- Só a service role (a função gestao-hub) toca esta tabela: RLS ligado, sem policy.
create table if not exists public.fa_gestao_bloqueios (
  id bigint generated always as identity primary key,
  email text not null references public.fa_gestao_contas (email) on delete cascade on update cascade,
  modulo text not null check (modulo in ('playground', 'clinica', 'financeiro', 'rh', 'cacau')),
  detalhe jsonb not null default '{}'::jsonb,   -- o que foi mudado, para desfazer na reativação
  aplicado_em timestamptz not null default now(),
  desfeito_em timestamptz
);

-- No máximo um bloqueio aberto por pessoa e sistema.
create unique index if not exists fa_gestao_bloqueios_aberto_idx
  on public.fa_gestao_bloqueios (email, modulo)
  where desfeito_em is null;

alter table public.fa_gestao_bloqueios enable row level security;

comment on table public.fa_gestao_bloqueios is
  'O que o Hub de Gestão bloqueou em cada sistema ao desativar uma pessoa; reativar desfaz só isso. Só a service role acessa.';
