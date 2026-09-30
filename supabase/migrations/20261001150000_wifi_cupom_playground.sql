-- Cupom ESPERA no caixa do Playground, 01/10/2026.
-- wifi-lead-webhook já cria, no MESMO código ESPERA-XXXX, um cupom nativo de +5 min no
-- Circuito (fa_kiosk_coupons, uso único). Agora cria também o equivalente no Playground
-- (meia inclusiva = DESCONTO_PCT 50, uso único), para o atendente digitar o código no caixa
-- e o próprio caixa travar o reuso, sem depender de conferência manual.
-- Estas colunas só registram se a sincronização funcionou.

alter table public.fa_wifi_leads
  add column if not exists playground_coupon_synced_at timestamptz,
  add column if not exists playground_coupon_error text;

-- O cupom do caixa não tem validade própria. O e-mail promete 15 dias, então, por dia, desativa
-- no caixa os cupons ESPERA cujo prazo já passou (mesma regra que a aba Cupons Wi-Fi aplica).
-- Só toca linhas com código ESPERA-% ligadas a um cadastro vencido; não mexe em nenhum outro cupom.
select cron.schedule(
  'fa-wifi-cupons-vencidos',
  '20 7 * * *',
  $$
    update public.fa_kiosk_coupons c
       set active = false
      from public.fa_wifi_leads l
     where c.code = l.coupon_code
       and c.code like 'ESPERA-%'
       and c.active
       and l.coupon_expires_at < now();
  $$
);
