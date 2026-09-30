-- Cupom ESPERA: um benefício só, em qualquer unidade do caixa, 01/10/2026.
-- wifi-lead-webhook cria o mesmo código ESPERA-XXXX no Circuito (+5 min) e no Playground (meia inclusiva),
-- cada um com uso único. Sozinhos, eles deixam a família usar os dois no mesmo dia. Este gatilho fecha isso
-- no próprio caixa: quando um dos dois é usado (used_count sobe), o outro é desativado na hora.
--
-- O caixa (fa_checkin / fa_kiosk_sell_prepaid_credit) só procura cupom com `active`; então, na vez seguinte,
-- a outra unidade responde CUPOM_INVALIDO. Se dois caixas usarem o mesmo código ao mesmo tempo, o segundo
-- a confirmar recebe CUPOM_ESGOTADO, exatamente a mesma mensagem que o caixa já trata para cupom esgotado.
--
-- Só age em códigos ESPERA-% e só quando used_count aumenta: os demais cupons não são afetados e o
-- gatilho não entra no caminho de nenhuma outra venda. Para desligar: drop trigger fa_kiosk_coupons_espera_um_uso.

create or replace function public.fa_kiosk_coupons_espera_um_uso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Serializa por código: dois caixas usando o mesmo ESPERA ao mesmo tempo passam um de cada vez.
  perform pg_advisory_xact_lock(hashtextextended(new.code, 0));

  if exists (
    select 1 from public.fa_kiosk_coupons o
     where o.code = new.code and o.id <> new.id and o.used_count > 0
  ) then
    raise exception 'CUPOM_ESGOTADO' using detail = 'Este cupom do Wi-Fi já foi usado na outra unidade (um benefício por cupom)';
  end if;

  update public.fa_kiosk_coupons
     set active = false
   where code = new.code and id <> new.id and active;

  return new;
end;
$$;

revoke all on function public.fa_kiosk_coupons_espera_um_uso() from public;

drop trigger if exists fa_kiosk_coupons_espera_um_uso on public.fa_kiosk_coupons;
create trigger fa_kiosk_coupons_espera_um_uso
  before update on public.fa_kiosk_coupons
  for each row
  when (new.used_count > old.used_count and new.code like 'ESPERA-%')
  execute function public.fa_kiosk_coupons_espera_um_uso();

comment on trigger fa_kiosk_coupons_espera_um_uso on public.fa_kiosk_coupons is
  'Cupom ESPERA-XXXX (portal Wi-Fi): usar em uma unidade desativa o mesmo código nas outras.';
