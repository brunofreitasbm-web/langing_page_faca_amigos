-- Hub de Gestão: "Esqueci a senha" (30/09/2026).
-- O código de 6 dígitos passa a ter finalidade (entrar no hub ou redefinir a senha da Clínica),
-- e o desafio de redefinição guarda o id do usuário da Clínica que terá a senha trocada.
alter table public.fa_gestao_desafios
  add column if not exists finalidade text not null default 'login' check (finalidade in ('login', 'reset'));
alter table public.fa_gestao_desafios
  add column if not exists alvo_id text;
