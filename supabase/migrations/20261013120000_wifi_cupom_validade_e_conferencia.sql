-- Cupom ESPERA: validade própria no caixa + conferência pela operadora, 13/10/2026.
--
-- 1) Validade no caixa. O cupom do caixa (fa_kiosk_coupons) não tinha prazo; só a rotina diária das 04:20
--    desativava os vencidos, então um cupom podia valer até ~14 h depois de vencer. Agora o cupom carrega
--    expires_at_ms e o gatilho abaixo recusa o uso vencido no minuto exato, sem mexer em fa_checkin nem em
--    fa_kiosk_sell_prepaid_credit (ambos incrementam used_count, que é o que o gatilho observa). A rotina
--    diária continua como limpeza. Cupom sem expires_at_ms (todos os demais) não é afetado.
--
-- 2) Conferência. O caixa listava TODOS os cupons ativos da unidade num <select>; com um cupom por família
--    isso viraria centenas de linhas, com nome de cliente à vista para qualquer operadora. A política de
--    leitura passa a esconder os ESPERA-%, e a operadora confere um código por vez pela função
--    fa_kiosk_wifi_coupon_lookup, que responde de quem é, o que vale e se ainda pode ser usado.

alter table public.fa_kiosk_coupons
  add column if not exists expires_at_ms bigint;

create or replace function public.fa_kiosk_coupons_validade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.expires_at_ms is not null
     and new.expires_at_ms < (extract(epoch from now()) * 1000)::bigint then
    -- Prefixo CUPOM_INVALIDO: o caixa já trata esse código; o texto depois dos dois pontos é o motivo.
    raise exception 'CUPOM_INVALIDO: Cupom vencido em %',
      to_char(to_timestamp(new.expires_at_ms / 1000.0) at time zone 'America/Belem', 'DD/MM/YYYY');
  end if;
  return new;
end;
$$;

revoke all on function public.fa_kiosk_coupons_validade() from public;

drop trigger if exists fa_kiosk_coupons_validade on public.fa_kiosk_coupons;
create trigger fa_kiosk_coupons_validade
  before update on public.fa_kiosk_coupons
  for each row
  when (new.used_count > old.used_count and new.expires_at_ms is not null)
  execute function public.fa_kiosk_coupons_validade();

comment on trigger fa_kiosk_coupons_validade on public.fa_kiosk_coupons is
  'Recusa o uso de cupom com expires_at_ms vencido (hoje só os ESPERA-XXXX do portal Wi-Fi têm prazo).';

-- Esconde os ESPERA-% da leitura direta da tabela. Funções SECURITY DEFINER do caixa (fa_checkin etc.) e as
-- Edge Functions (service_role) continuam enxergando tudo; a operadora usa fa_kiosk_wifi_coupon_lookup.
drop policy if exists fa_kiosk_read_authenticated on public.fa_kiosk_coupons;
create policy fa_kiosk_read_authenticated on public.fa_kiosk_coupons
  for select to authenticated
  using (code not like 'ESPERA-%');

create or replace function public.fa_kiosk_wifi_coupon_lookup(p_unit_id uuid, p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  v_coupon record;
  v_lead record;
  v_expires_ms bigint;
  v_status text;
  v_first text;
  v_last text;
  v_name text;
begin
  if not exists (
    select 1 from fa_kiosk_employees e where e.auth_user_id = auth.uid() and e.active
  ) then
    raise exception 'SEM_PERMISSAO';
  end if;

  if v_code not like 'ESPERA-%' then
    return jsonb_build_object('found', false, 'status', 'NAO_ENCONTRADO');
  end if;

  select * into v_coupon from fa_kiosk_coupons where unit_id = p_unit_id and code = v_code;
  if not found then
    return jsonb_build_object('found', false, 'status', 'NAO_ENCONTRADO');
  end if;

  select guardian_name, coupon_expires_at, redeemed_count into v_lead
    from fa_wifi_leads where coupon_code = v_code;

  v_expires_ms := coalesce(
    v_coupon.expires_at_ms,
    case when v_lead.coupon_expires_at is not null
         then (extract(epoch from v_lead.coupon_expires_at) * 1000)::bigint end
  );

  v_status := case
    when v_coupon.used_count > 0 then 'USADO'
    when exists (select 1 from fa_kiosk_coupons o where o.code = v_code and o.id <> v_coupon.id and o.used_count > 0)
      then 'USADO_OUTRA_UNIDADE'
    when coalesce(v_lead.redeemed_count, 0) > 0 then 'USADO'
    when v_expires_ms is not null and v_expires_ms < v_now_ms then 'VENCIDO'
    when not v_coupon.active then 'DESATIVADO'
    else 'OK'
  end;

  -- Primeiro nome + inicial do último: o bastante para a operadora conferir com quem está no balcão.
  v_name := trim(coalesce(v_lead.guardian_name, ''));
  if v_name <> '' then
    v_first := split_part(v_name, ' ', 1);
    v_last := (regexp_split_to_array(v_name, '\s+'))[array_length(regexp_split_to_array(v_name, '\s+'), 1)];
    v_name := case when v_last <> v_first then v_first || ' ' || upper(left(v_last, 1)) || '.' else v_first end;
  end if;

  return jsonb_build_object(
    'found', true,
    'status', v_status,
    'id', v_coupon.id,
    'code', v_coupon.code,
    'kind', v_coupon.kind,
    'value', v_coupon.value,
    'description', v_coupon.description,
    'maxUses', v_coupon.max_uses,
    'usedCount', v_coupon.used_count,
    'active', v_coupon.active,
    'expiresAtMs', v_expires_ms,
    'guardianName', nullif(v_name, '')
  );
end;
$$;

revoke all on function public.fa_kiosk_wifi_coupon_lookup(uuid, text) from public, anon;
grant execute on function public.fa_kiosk_wifi_coupon_lookup(uuid, text) to authenticated, service_role;
