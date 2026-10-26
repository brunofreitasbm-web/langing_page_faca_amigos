-- Projeto B (BD_CLINICA_RH: Clínica + Gestão de Pessoas). Rodar uma vez no SQL Editor desse projeto.
-- Usada pelo Hub de Gestão (função gestao-hub) ao desativar uma pessoa: o banimento do login impede
-- novas entradas, mas a sessão que já estava aberta continuava valendo, e o app renovava o token.
-- Esta função encerra as sessões e os refresh tokens, o mesmo que a tela de usuários da Gestão de
-- Pessoas já faz em set_system_user_active.
--
-- Salvaguardas: só encerra sessão de quem JÁ está banido (não serve para derrubar quem está ativo) e
-- nunca de conta de unidade (*_unit, login compartilhado do tablet). Não apaga usuário, PIN nem dado
-- nenhum: só auth.sessions e auth.refresh_tokens. Só a service role executa.
create or replace function public.hub_encerrar_sessoes(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_encerradas integer;
begin
  if not exists (
    select 1 from auth.users
     where id = p_user_id and banned_until is not null and banned_until > now()
  ) then
    raise exception 'usuário não está bloqueado';
  end if;

  if exists (
    select 1 from auth.users
     where id = p_user_id and coalesce(raw_app_meta_data ->> 'role', '') like '%\_unit'
  ) then
    raise exception 'conta de unidade não é alterada pelo Hub';
  end if;

  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_encerradas = row_count;
  delete from auth.refresh_tokens where user_id = p_user_id::text;
  return v_encerradas;
end;
$$;

revoke all on function public.hub_encerrar_sessoes(uuid) from public, anon, authenticated;
grant execute on function public.hub_encerrar_sessoes(uuid) to service_role;
