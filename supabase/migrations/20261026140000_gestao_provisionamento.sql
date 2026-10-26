-- Hub de Gestão: papel por sistema e provisionamento ao salvar (26/10/2026).
-- Antes, a pessoa só era completada nos sistemas no primeiro clique no quadrado, com papel fixo
-- (Clínica supervisor, Gestão de Pessoas supervisor, Playground GERENTE). Agora o owner escolhe o papel
-- NATIVO em cada sistema e o Hub cria o login e aplica esse papel no ato de salvar.
-- Só a service role (a função gestao-hub) toca estas estruturas: RLS ligado, sem policy.

-- Papel nativo escolhido pelo owner (nulo = padrão do sistema). Fica junto da matriz porque as linhas
-- de permissões são regravadas a cada "Salvar".
alter table public.fa_gestao_permissoes
  add column if not exists papel_nativo text;

-- Estado do último provisionamento por pessoa e sistema, para a lista mostrar "ok" ou o motivo do erro.
-- `papel_aplicado` = o papel que o PRÓPRIO Hub deu por último; o Hub só troca um papel que ele mesmo
-- tinha dado, nunca o que a pessoa já tinha no sistema. Não é regravada junto com a matriz.
create table if not exists public.fa_gestao_provisionamento (
  email text not null references public.fa_gestao_contas (email) on delete cascade on update cascade,
  modulo text not null check (modulo in ('playground', 'clinica', 'financeiro', 'rh', 'cacau')),
  estado text not null check (estado in ('ok', 'erro', 'pulado')),
  mensagem text,
  papel_aplicado text,
  atualizado_em timestamptz not null default now(),
  primary key (email, modulo)
);

alter table public.fa_gestao_provisionamento enable row level security;

comment on table public.fa_gestao_provisionamento is
  'Resultado do último provisionamento da pessoa em cada sistema e o papel que o Hub aplicou. Só a service role acessa.';
