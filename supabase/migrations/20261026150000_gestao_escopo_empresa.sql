-- Hub de Gestão: empresa (workspace) por pessoa na Gestão de Pessoas (26/10/2026).
-- A Gestão de Pessoas é um só sistema com duas empresas (Grupo IB e Porto Terapia), separadas por
-- app_metadata.workspace_scope no login. O Hub gravava sempre ["all"] (as duas empresas) para toda
-- gerência. Agora cada gerência pertence a UMA empresa, escolhida pelo owner, e o Hub abre o site dela.
-- Só a service role (a função gestao-hub) toca esta tabela: RLS ligado, sem policy.
alter table public.fa_gestao_permissoes
  add column if not exists escopo text;

comment on column public.fa_gestao_permissoes.escopo is
  'Empresa (workspace) da pessoa no módulo: grupoib | porto-terapia (hoje só a Gestão de Pessoas). Nulo = não escolhida.';
