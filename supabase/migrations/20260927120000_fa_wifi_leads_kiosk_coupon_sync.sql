-- Rastreio da sincronização do cupom "ESPERA-XXXX" com o cupom nativo do
-- kiosk (fa_kiosk_coupons, tipo MINUTOS_EXTRA, unidade Circuito, max_uses=1).
-- Ver wifi-lead-webhook: ao emitir o cupom do Wi-Fi, a função também grava
-- um cupom de uso único no kiosk com o MESMO código, para que o benefício
-- dos +5 minutos no Circuito seja aplicado e travado pelo próprio check-in
-- do kiosk (fa_checkin aceita p_coupon_code) — sem depender de o atendente
-- lembrar de checar nada, e sem risco de a família reusar/distribuir o
-- código, porque o kiosk já bloqueia um segundo uso via max_uses=1.

alter table public.fa_wifi_leads
  add column if not exists kiosk_coupon_synced_at timestamptz,
  add column if not exists kiosk_coupon_error text;
