-- Cupom ESPERA no caixa do Playground do Bosque Grão-Pará, 23/10/2026.
-- wifi-lead-webhook passa a criar, no MESMO código ESPERA-XXXX, um terceiro cupom de uso único: a meia inclusiva
-- (DESCONTO_PCT 50) na unidade "Playground (Bosque Grão-Pará)", igual ao que já existe no Parque Shopping.
-- Estas colunas só registram se a sincronização funcionou (mesmo padrão de kiosk_coupon_* e playground_coupon_*).
--
-- Nada mais muda no banco: o gatilho fa_kiosk_coupons_espera_um_uso (um benefício por cupom) e o job diário
-- fa-wifi-cupons-vencidos trabalham por código ESPERA-%, sem listar unidades, então já cobrem a terceira linha.
-- Não há backfill: no momento desta migração não existe cadastro nem cupom ESPERA em nenhuma unidade.

alter table public.fa_wifi_leads
  add column if not exists graopara_coupon_synced_at timestamptz,
  add column if not exists graopara_coupon_error text;
